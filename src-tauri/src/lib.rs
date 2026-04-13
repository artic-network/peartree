use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::DialogExt;
use base64::engine::{Engine as _, general_purpose::STANDARD as BASE64};
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicU32, Ordering},
    Mutex,
};

/// Managed state that maps each command id → its live MenuItem handle.
/// Stored in Tauri's app state so `set_menu_item_enabled` can reach the
/// actual handles rather than copies returned by `Menu::get`.
struct MenuItems(Mutex<HashMap<String, MenuItem<tauri::Wry>>>);

/// Monotonically increasing counter used to generate unique window labels.
struct WindowCounter(AtomicU32);

/// Pending file paths for newly created windows: window_label → file_path.
/// set by `new_window`, consumed once by `take_pending_file` on startup.
struct PendingFiles(Mutex<HashMap<String, String>>);

/// The pending update returned by check_for_updates, held until install_update consumes it.
struct PendingUpdate(Mutex<Option<tauri_plugin_updater::Update>>);

/// Called from JS to enable/disable a menu item by its string id.
#[tauri::command]
fn set_menu_item_enabled(
    app: tauri::AppHandle,
    id: &str,
    enabled: bool,
) -> Result<(), String> {
    let state = app.state::<MenuItems>();
    let map   = state.0.lock().map_err(|e| e.to_string())?;
    let item  = map.get(id).ok_or_else(|| format!("unknown menu item: {id}"))?;
    item.set_enabled(enabled).map_err(|e| e.to_string())
}

/// Called from JS to update the text label of a menu item by its string id.
#[tauri::command]
fn set_menu_item_text(
    app: tauri::AppHandle,
    id: &str,
    text: &str,
) -> Result<(), String> {
    let state = app.state::<MenuItems>();
    let map   = state.0.lock().map_err(|e| e.to_string())?;
    let item  = map.get(id).ok_or_else(|| format!("unknown menu item: {id}"))?;
    item.set_text(text).map_err(|e| e.to_string())
}

/// Opens a native OS file picker filtered to tree file types, reads the
/// selected file, and returns `{"name": "...", "content": "...", "path": "..."}` to JS.
/// Returns `null` if the user cancels.
///
/// Must be `async` so Tauri runs it on a worker thread instead of the main
/// thread — blocking_pick_file() blocks its caller, and calling it on the
/// main thread freezes the WebKit event loop (spinning wheel).
#[tauri::command]
async fn pick_tree_file(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let result = app
        .dialog()
        .file()
        .blocking_pick_file();

    match result {
        None => Ok(None),
        Some(file_path) => {
            let path = file_path.into_path().map_err(|e| e.to_string())?;
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("tree")
                .to_string();
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let path_str = path.to_string_lossy().to_string();
            Ok(Some(serde_json::json!({ "name": name, "content": content, "path": path_str })))
        }
    }
}

/// Opens a native OS file picker filtered to annotation file types (CSV / TSV),
/// reads the selected file, and returns `{"name": "...", "content": "..."}` to JS.
/// Returns `null` if the user cancels.
#[tauri::command]
async fn pick_annot_file(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let result = app
        .dialog()
        .file()
        .add_filter("Annotation files", &["csv", "tsv", "txt"])
        .add_filter("All files", &["*"])
        .blocking_pick_file();

    match result {
        None => Ok(None),
        Some(file_path) => {
            let path = file_path.into_path().map_err(|e| e.to_string())?;
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("annotations")
                .to_string();
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            Ok(Some(serde_json::json!({ "name": name, "content": content })))
        }
    }
}

/// Shows a native save-file dialog and writes `content` to the chosen path.
///
/// * `filename`   – suggested filename shown in the dialog (e.g. "tree.nexus")
/// * `content`    – file content as a UTF-8 string **or** a Base64-encoded string
///                  when `base64` is true (used for binary formats such as PNG)
/// * `base64`     – when true, `content` is decoded from Base64 before writing
/// * `filter_name`/ `extensions` – file-type filter shown in the dialog
///
/// Returns `true` if the file was saved, `false` if the user cancelled.
#[tauri::command]
async fn save_file(
    app: tauri::AppHandle,
    filename: String,
    content: String,
    base64: bool,
    filter_name: String,
    extensions: Vec<String>,
) -> Result<bool, String> {
    let ext_refs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
    let result = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter(&filter_name, &ext_refs)
        .blocking_save_file();

    match result {
        None => Ok(false),
        Some(path) => {
            let path = path.into_path().map_err(|e| e.to_string())?;
            if base64 {
                use std::io::Write;
                let bytes = BASE64.decode(content.as_bytes()).map_err(|e| e.to_string())?;
                std::fs::File::create(&path).map_err(|e| e.to_string())?
                    .write_all(&bytes).map_err(|e| e.to_string())?;
            } else {
                std::fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())?;
            }
            Ok(true)
        }
    }
}

/// Reads a file from the given absolute path and returns its content as a string.
/// Used by the frontend to load a file that was opened via drag-to-icon or a
/// file association double-click (the path is emitted via the "open-file" event).
#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    eprintln!("[read_file_content] Reading file: {}", path);
    
    std::fs::read_to_string(&path).map_err(|e| {
        let error_msg = format!("Failed to read {}: {}", path, e);
        eprintln!("[read_file_content] {}", error_msg);
        error_msg
    })
}

/// Creates a new PearTree window. If `file_path` is provided the path is stored
/// in PendingFiles keyed by the new window's label; the window's JS retrieves it
/// via `take_pending_file` on startup and loads the tree automatically.
#[tauri::command]
fn new_window(app: tauri::AppHandle, file_path: Option<String>) -> Result<(), String> {
    let n = app.state::<WindowCounter>().0.fetch_add(1, Ordering::SeqCst);
    let label = format!("window-{n}");

    if let Some(path) = file_path {
        app.state::<PendingFiles>().0.lock().unwrap().insert(label.clone(), path);
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App("peartree.html".into()),
    )
    .title("PearTree \u{2014} Phylogenetic Tree Viewer")
    .inner_size(1400.0, 900.0)
    .min_inner_size(900.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Retrieves (and removes) any pending file path for the calling window.
/// Called by the JS adapter on startup to load a file passed to `new_window`.
#[tauri::command]
fn take_pending_file(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Option<String> {
    let label = window.label();
    let result = app.state::<PendingFiles>().0.lock().unwrap().remove(label);
    
    #[cfg(target_os = "windows")]
    if let Some(ref path) = result {
        eprintln!("[take_pending_file] Window '{}' taking pending file: {}", label, path);
    } else {
        eprintln!("[take_pending_file] Window '{}' has no pending file", label);
    }
    
    result
}

/// Triggers the native OS print dialog for the calling window.
/// Called by peartree-tauri.js instead of window.print(), which is
/// unreliable inside WKWebView on macOS.
#[tauri::command]
fn trigger_print(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

/// Checks for an available update against the configured GitHub Releases
/// endpoint.  Returns null if already up to date, or a JSON object with
/// { version, date, body, current } if a newer release exists.
/// Stores the Update object in managed state so install_update can use it.
#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    use tauri_plugin_updater::UpdaterExt;
    // The macOS release is a universal binary; override the auto-detected
    // arch-specific target so the updater looks for "darwin-universal" in
    // latest.json rather than "darwin-aarch64" / "darwin-x86_64".
    let builder = app.updater_builder();
    #[cfg(target_os = "macos")]
    let builder = builder.target("darwin-universal");
    let update = builder
        .build()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    let info = update.as_ref().map(|u| serde_json::json!({
        "version": u.version,
        "date":    u.date.map(|d| d.to_string()),
        "body":    u.body,
        "current": env!("CARGO_PKG_VERSION"),
    }));
    *app.state::<PendingUpdate>().0.lock().unwrap() = update;
    Ok(info)
}

/// Downloads and installs the update stored by check_for_updates.
/// On all platforms, restarts the app after a successful install.
#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let update = app.state::<PendingUpdate>().0.lock().unwrap().take();
    if let Some(update) = update {
        update
            .download_and_install(|_chunk, _total| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_menu_item_enabled, set_menu_item_text, pick_tree_file, pick_annot_file, save_file, read_file_content, new_window, take_pending_file, trigger_print, check_for_updates, install_update])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Forward any file opened via drag-to-icon or double-click (macOS file
            // association) to the frontend as an "open-file" event with the file path.
            // Emit only to the focused window; if no window has focus (app was in the
            // background), broadcast to all so at least one window handles it.
            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    if let Ok(path) = url.to_file_path() {
                        let path_str = path.to_string_lossy().to_string();
                        let focused = app_handle
                            .webview_windows()
                            .into_values()
                            .find(|w| w.is_focused().unwrap_or(false));
                        if let Some(w) = focused {
                            // App running and focused — deliver directly.
                            w.emit("open-file", &path_str).ok();
                        } else {
                            // No focused window.  Two cases:
                            //   (a) Fresh launch — JS not yet loaded, event would be lost.
                            //       Store in PendingFiles so take_pending_file() picks it up.
                            //   (b) App backgrounded — JS is loaded but window not focused.
                            //       Broadcast so the active open-file listener handles it.
                            // Both actions are safe to do together: on a fresh launch the
                            // broadcast fires before any listener is registered (no-op),
                            // while take_pending_file() is called on startup and sees the
                            // stored path.  For a backgrounded app, the broadcast triggers
                            // the listener; the stale PendingFiles["main"] entry is harmless
                            // because take_pending_file() was already called at that window's
                            // startup and won't be called again.
                            app_handle.state::<PendingFiles>().0.lock().unwrap()
                                .insert("main".to_string(), path_str.clone());
                            app_handle.emit("open-file", &path_str).ok();
                        }
                    }
                }
            });
            // ── PearTree (app menu) ───────────────────────────────────────────
            let app_menu = Submenu::with_items(app, "PearTree", true, &[
                &PredefinedMenuItem::about(app, None, Some(AboutMetadata {
                    name:          Some("PearTree".into()),
                    short_version: Some(option_env!("PEARTREE_VERSION_TAG").unwrap_or(env!("CARGO_PKG_VERSION")).into()),
                    version:       Some(env!("CARGO_PKG_VERSION").into()),
                    copyright:     Some("© ARTIC Network".into()),
                    ..Default::default()
                }))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::services(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, None)?,
                &PredefinedMenuItem::hide_others(app, None)?,
                &PredefinedMenuItem::show_all(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, None)?,
            ])?;

            // ── File ──────────────────────────────────────────────────────────
            let new_win      = MenuItem::with_id(app, "new-window",   "New Window",                  true, Some("CmdOrCtrl+N"))?;
            let open_file    = MenuItem::with_id(app, "open-file",    "Open Tree\u{2026}",                true, Some("CmdOrCtrl+O"))?;
            let import_annot = MenuItem::with_id(app, "import-annot", "Import Annotations\u{2026}",  true, Some("CmdOrCtrl+Shift+A"))?;
            let export_tree  = MenuItem::with_id(app, "export-tree",  "Export Tree\u{2026}",          true, Some("CmdOrCtrl+E"))?;
            let export_image = MenuItem::with_id(app, "export-image", "Export Image\u{2026}",         true, Some("CmdOrCtrl+Shift+E"))?;
            let print_graphic = MenuItem::with_id(app, "print-graphic", "Print\u{2026}",             false, Some("CmdOrCtrl+P"))?;
            let curate_annot = MenuItem::with_id(app, "curate-annot", "Curate Annotations\u{2026}",  false, None::<&str>)?;

            let file_menu = Submenu::with_items(app, "File", true, &[
                &new_win,
                &PredefinedMenuItem::separator(app)?,
                &open_file,
                &import_annot,
                &curate_annot,
                &PredefinedMenuItem::separator(app)?,
                &export_tree,
                &export_image,
                &print_graphic,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::close_window(app, None)?,
            ])?;

            // ── Edit ──────────────────────────────────────────────────────────
            let paste_tree    = MenuItem::with_id(app, "paste-tree",    "Paste Tree",       true,  Some("CmdOrCtrl+V"))?;
            let copy_tree     = MenuItem::with_id(app, "copy-tree",     "Copy Tree",        false, Some("CmdOrCtrl+C"))?;
            let copy_tips     = MenuItem::with_id(app, "copy-tips",     "Copy Tips",        false, Some("CmdOrCtrl+Shift+C"))?;
            let select_all    = MenuItem::with_id(app, "select-all",    "Select All",       true, Some("CmdOrCtrl+A"))?;
            let select_invert = MenuItem::with_id(app, "select-invert", "Invert Selection", true, Some("CmdOrCtrl+Shift+I"))?;

            let edit_menu = Submenu::with_items(app, "Edit", true, &[
                // &PredefinedMenuItem::undo(app, None)?,
                // &PredefinedMenuItem::redo(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, None)?,
                &copy_tree,
                &copy_tips,
                &paste_tree,
                &select_all,
                &select_invert,
            ])?;

            // ── View ─────────────────────────────────────────────────────────
            let view_back       = MenuItem::with_id(app, "view-back",       "Back",               true, Some("CmdOrCtrl+["))?;
            let view_forward    = MenuItem::with_id(app, "view-forward",    "Forward",            true, Some("CmdOrCtrl+]"))?;
            let view_drill      = MenuItem::with_id(app, "view-drill",      "Drill into Subtree",  true, Some("CmdOrCtrl+Shift+."))?;
            let view_climb      = MenuItem::with_id(app, "view-climb",      "Climb Out One Level", true, Some("CmdOrCtrl+Shift+,"))?;
            let view_home       = MenuItem::with_id(app, "view-home",       "Return to Root",               true, Some("CmdOrCtrl+\\"))?;
            let view_zoom_in    = MenuItem::with_id(app, "view-zoom-in",    "Zoom In",    true, Some("CmdOrCtrl+="))?;
            let view_zoom_out   = MenuItem::with_id(app, "view-zoom-out",   "Zoom Out",   true, Some("CmdOrCtrl+-"))?;
            let view_fit        = MenuItem::with_id(app, "view-fit",        "Fit All",    true, Some("CmdOrCtrl+0"))?;
            let view_fit_labels = MenuItem::with_id(app, "view-fit-labels", "Fit Labels", true, Some("CmdOrCtrl+Shift+0"))?;
            let view_hyp_up      = MenuItem::with_id(app, "view-hyp-up",      "Widen Lens",       false, Some("CmdOrCtrl+Shift+="))?;
            let view_hyp_down    = MenuItem::with_id(app, "view-hyp-down",    "Narrow Lens",      false, Some("CmdOrCtrl+Shift+-"))?;
            let view_scroll_top  = MenuItem::with_id(app, "view-scroll-top",  "Scroll to Top",    false, Some("CmdOrCtrl+Shift+Up"))?;
            let view_scroll_bottom = MenuItem::with_id(app, "view-scroll-bottom", "Scroll to Bottom", false, Some("CmdOrCtrl+Shift+Down"))?;
            let view_info       = MenuItem::with_id(app, "view-info",       "Get Info...", true, Some("CmdOrCtrl+I"))?;
            let show_devtools   = MenuItem::with_id(app, "show-devtools",   "Developer Tools", true, Some("CmdOrCtrl+Alt+I"))?;
            let view_show_options = MenuItem::with_id(app, "view-options-panel", "Show Options Panel", true, None::<&str>)?;
            let view_show_rtt     = MenuItem::with_id(app, "view-rtt-plot",     "Show RTT Plot",      true, None::<&str>)?;
            let view_show_dt      = MenuItem::with_id(app, "view-data-table",   "Show Data Table",    true, None::<&str>)?;

            let view_menu = Submenu::with_items(app, "View", true, &[
                &view_zoom_in,
                &view_zoom_out,
                &view_hyp_up,
                &view_hyp_down,
                &PredefinedMenuItem::separator(app)?,
                &view_fit,
                &view_fit_labels,
                &PredefinedMenuItem::separator(app)?,
                &view_back,
                &view_forward,
                &PredefinedMenuItem::separator(app)?,
                &view_drill,
                &view_climb,
                &view_home,
                &PredefinedMenuItem::separator(app)?,
                &view_scroll_top,
                &view_scroll_bottom,
                &PredefinedMenuItem::separator(app)?,
                &view_show_options,
                &view_show_rtt,
                &view_show_dt,
                &PredefinedMenuItem::separator(app)?,
                &view_info,
                &PredefinedMenuItem::separator(app)?,
                &show_devtools,
            ])?;

            // ── Tree ─────────────────────────────────────────────────────────
            let tree_rotate        = MenuItem::with_id(app, "tree-rotate",        "Rotate Node",    true, None::<&str>)?;
            let tree_rotate_all    = MenuItem::with_id(app, "tree-rotate-all",    "Rotate Clade",   true, None::<&str>)?;
            let tree_order_up      = MenuItem::with_id(app, "tree-order-up",      "Order Nodes Up",       true, Some("CmdOrCtrl+U"))?;
            let tree_order_down    = MenuItem::with_id(app, "tree-order-down",    "Order Nodes Down",     true, Some("CmdOrCtrl+D"))?;
            let tree_reroot        = MenuItem::with_id(app, "tree-reroot",        "Re-root Tree",   true, None::<&str>)?;
            let tree_midpoint      = MenuItem::with_id(app, "tree-midpoint",      "Midpoint Root",  true, Some("CmdOrCtrl+M"))?;
            let tree_hide          = MenuItem::with_id(app, "tree-hide",          "Hide Nodes",     true, None::<&str>)?;
            let tree_show          = MenuItem::with_id(app, "tree-show",          "Show Nodes",     true, None::<&str>)?;
            let tree_collapse_clade = MenuItem::with_id(app, "tree-collapse-clade", "Collapse Clade", true, None::<&str>)?;
            let tree_expand_clade   = MenuItem::with_id(app, "tree-expand-clade",   "Expand Clade",   true, None::<&str>)?;
            let tree_paint         = MenuItem::with_id(app, "tree-paint",         "Paint Node",     true, None::<&str>)?;
            let tree_clear_colours = MenuItem::with_id(app, "tree-clear-colours", "Clear Colours",  true, None::<&str>)?;
            let tree_highlight_clade   = MenuItem::with_id(app, "tree-highlight-clade",   "Highlight Clade",   false, None::<&str>)?;
            let tree_clear_highlights  = MenuItem::with_id(app, "tree-clear-highlights",  "Remove Highlight",  false, None::<&str>)?;

            let tree_menu = Submenu::with_items(app, "Tree", true, &[
                &tree_order_up,
                &tree_order_down,
                &PredefinedMenuItem::separator(app)?,
                &tree_rotate,
                &tree_rotate_all,
                &PredefinedMenuItem::separator(app)?,
                &tree_reroot,
                &tree_midpoint,
                &PredefinedMenuItem::separator(app)?,
                &tree_hide,
                &tree_show,
                &PredefinedMenuItem::separator(app)?,
                &tree_collapse_clade,
                &tree_expand_clade,
                &PredefinedMenuItem::separator(app)?,
                &tree_highlight_clade,
                &tree_clear_highlights,
                &PredefinedMenuItem::separator(app)?,
                &tree_paint,
                &tree_clear_colours,
            ])?;

            // ── Window ────────────────────────────────────────────────────────
            let window_menu = Submenu::with_items(app, "Window", true, &[
                &PredefinedMenuItem::minimize(app, None)?,
                &PredefinedMenuItem::maximize(app, None)?,
                &PredefinedMenuItem::fullscreen(app, None)?,
            ])?;

            // ── Help ──────────────────────────────────────────────────────────
            let show_help     = MenuItem::with_id(app, "show-help",         "PearTree Help",            true, Some("CmdOrCtrl+?"))?;
            let check_updates = MenuItem::with_id(app, "check-for-updates", "Check for Updates\u{2026}", true, None::<&str>)?;

            let help_menu = Submenu::with_items(app, "Help", true, &[
                &show_help,
                &PredefinedMenuItem::separator(app)?,
                &check_updates,
            ])?;

            let menu = Menu::with_items(app, &[
                &app_menu,
                &file_menu,
                &edit_menu,
                &view_menu,
                &tree_menu,
                &window_menu,
                &help_menu,
            ])?;
            app.set_menu(menu)?;

            // ── Initial disabled states ───────────────────────────────────────
            // Set synchronously in Rust before the WebView loads so the menu
            // reflects the correct state from the very first frame.
            // The JS command registry (peartree-tauri.js) drives all subsequent
            // changes via set_menu_item_enabled invocations.
            for item in &[&import_annot, &curate_annot, &export_tree, &export_image] {
                item.set_enabled(false)?;
            }
            for item in &[
                &view_back, &view_forward, &view_home,
                &view_drill, &view_climb,
                &view_hyp_up, &view_hyp_down,
                &view_scroll_top, &view_scroll_bottom,
                &view_zoom_in, &view_zoom_out, &view_fit, &view_fit_labels,
                &view_info,
            ] {
                item.set_enabled(false)?;
            }
            for item in &[
                &tree_rotate, &tree_rotate_all,
                &tree_order_up, &tree_order_down,
                &tree_reroot, &tree_midpoint,
                &tree_hide, &tree_show,
                &tree_collapse_clade, &tree_expand_clade,
                &tree_highlight_clade, &tree_clear_highlights,
                &tree_paint, &tree_clear_colours,
            ] {
                item.set_enabled(false)?;
            }

            // ── Register live MenuItem handles in managed state ────────────────
            // set_menu_item_enabled uses these directly so it always operates on
            // the real native handles, not copies returned by Menu::get.
            let mut map: HashMap<String, MenuItem<tauri::Wry>> = HashMap::new();
            for (id, item) in [
                ("new-window",       new_win),
                ("open-file",        open_file),
                ("import-annot",     import_annot),
                ("export-tree",      export_tree),
                ("export-image",     export_image),
                ("print-graphic",    print_graphic),
                ("paste-tree",       paste_tree),
                ("copy-tree",        copy_tree),
                ("copy-tips",        copy_tips),
                ("select-all",       select_all),
                ("select-invert",    select_invert),
                ("view-back",        view_back),
                ("view-forward",     view_forward),
                ("view-home",        view_home),
                ("view-drill",       view_drill),
                ("view-climb",       view_climb),
                ("view-zoom-in",     view_zoom_in),
                ("view-zoom-out",    view_zoom_out),
                ("view-fit",         view_fit),
                ("view-fit-labels",  view_fit_labels),
                ("view-info",        view_info),
                ("view-options-panel", view_show_options),
                ("view-rtt-plot",      view_show_rtt),
                ("view-data-table",    view_show_dt),
                ("tree-rotate",      tree_rotate),
                ("tree-rotate-all",  tree_rotate_all),
                ("tree-order-up",    tree_order_up),
                ("tree-order-down",  tree_order_down),
                ("tree-reroot",      tree_reroot),
                ("tree-midpoint",    tree_midpoint),
                ("tree-hide",        tree_hide),
                ("tree-show",        tree_show),
                ("tree-collapse-clade", tree_collapse_clade),
                ("tree-expand-clade",   tree_expand_clade),
                ("curate-annot",      curate_annot),
                ("view-hyp-up",        view_hyp_up),
                ("view-hyp-down",      view_hyp_down),
                ("view-scroll-top",    view_scroll_top),
                ("view-scroll-bottom", view_scroll_bottom),
                ("tree-highlight-clade",  tree_highlight_clade),
                ("tree-clear-highlights", tree_clear_highlights),
                ("tree-paint",       tree_paint),
                ("tree-clear-colours", tree_clear_colours),
                ("show-help",           show_help),
                ("check-for-updates",   check_updates),
            ] {
                map.insert(id.to_string(), item);
            }
            app.manage(MenuItems(Mutex::new(map)));
            app.manage(WindowCounter(AtomicU32::new(0)));
            app.manage(PendingFiles(Mutex::new(HashMap::new())));
            app.manage(PendingUpdate(Mutex::new(None)));

            // Check whether the app was launched by opening a file (drag-to-icon,
            // "Open With", double-click).  get_current() reads the launch URL
            // synchronously in setup — before the window's JS has a chance to call
            // take_pending_file — so this is the only race-free place to capture it.
            // We store it in PendingFiles["main"] so the startup take_pending_file
            // invocation in peartree-tauri.js picks it up.
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                if let Some(url) = urls.into_iter().next() {
                    if let Ok(path) = url.to_file_path() {
                        let path_str = path.to_string_lossy().to_string();
                        app.state::<PendingFiles>().0.lock().unwrap()
                            .insert("main".to_string(), path_str);
                    }
                }
            }

            // Windows file associations launch a fresh process with the file path
            // as the first command-line argument (e.g. `peartree.exe file.tree`).
            // The deep-link plugin does not intercept this, so we read args() here
            // as a fallback.  Only store the path when PendingFiles["main"] was not
            // already populated by the deep-link handler above.
            #[cfg(target_os = "windows")]
            {
                let pending_state = app.state::<PendingFiles>();
                let mut pending = pending_state.0.lock().unwrap();
                if !pending.contains_key("main") {
                    if let Some(arg) = std::env::args().nth(1) {
                        // Validate and normalize the path before storing
                        let path = std::path::Path::new(&arg);
                        if path.is_file() {
                            // Convert to absolute path and normalize (handles ., .., \\?\, etc.)
                            if let Ok(canonical) = path.canonicalize() {
                                if let Some(path_str) = canonical.to_str() {
                                    eprintln!("[Windows] Storing pending file: {}", path_str);
                                    pending.insert("main".to_string(), path_str.to_string());
                                } else {
                                    eprintln!("[Windows] Warning: file path contains invalid UTF-8: {:?}", canonical);
                                }
                            } else {
                                eprintln!("[Windows] Warning: failed to canonicalize path: {}", arg);
                            }
                        } else {
                            eprintln!("[Windows] Ignoring non-file argument: {}", arg);
                        }
                    }
                }
            }

            // Forward every menu event to the focused window as a "menu-event".
            // Targeting only the focused window ensures each window only receives
            // events while it is active (correct behaviour for a global menu bar).
            app.on_menu_event(|app, event| {
                let id = event.id().as_ref().to_string();
                let focused = app
                    .webview_windows()
                    .into_values()
                    .find(|w| w.is_focused().unwrap_or(false));
                if let Some(w) = focused {
                    if id == "show-devtools" {
                        w.open_devtools();
                    } else {
                        w.emit("menu-event", &id).ok();
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running PearTree");
}
