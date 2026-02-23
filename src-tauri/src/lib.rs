use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::DialogExt;
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

/// Opens a native OS file picker filtered to tree file types, reads the
/// selected file, and returns `{"name": "...", "content": "..."}` to JS.
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
        .add_filter(
            "Tree files",
            &["nex", "nexus", "tre", "tree", "treefile", "nwk", "newick", "txt"],
        )
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
            Ok(Some(serde_json::json!({ "name": name, "content": content })))
        }
    }
}

/// Reads a file from the given absolute path and returns its content as a string.
/// Used by the frontend to load a file that was opened via drag-to-icon or a
/// file association double-click (the path is emitted via the "open-file" event).
#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
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
    app.state::<PendingFiles>().0.lock().unwrap().remove(window.label())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_menu_item_enabled, pick_tree_file, read_file_content, new_window, take_pending_file])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
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
                            w.emit("open-file", &path_str).ok();
                        } else {
                            app_handle.emit("open-file", &path_str).ok();
                        }
                    }
                }
            });
            // ── PearTree (app menu) ───────────────────────────────────────────
            let app_menu = Submenu::with_items(app, "PearTree", true, &[
                &PredefinedMenuItem::about(app, None, Some(AboutMetadata {
                    name:      Some("PearTree".into()),
                    version:   Some(env!("CARGO_PKG_VERSION").into()),
                    copyright: Some("© ARTIC Network".into()),
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
            let open_file    = MenuItem::with_id(app, "open-file",    "Open\u{2026}",                true, Some("CmdOrCtrl+O"))?;
            let open_tree    = MenuItem::with_id(app, "open-tree",    "Open Tree\u{2026}",           true, Some("CmdOrCtrl+Shift+O"))?;
            let import_annot = MenuItem::with_id(app, "import-annot", "Import Annotations\u{2026}",  true, Some("CmdOrCtrl+Shift+A"))?;
            let export_tree  = MenuItem::with_id(app, "export-tree",  "Export Tree\u{2026}",          true, Some("CmdOrCtrl+E"))?;
            let export_image = MenuItem::with_id(app, "export-image", "Export Image\u{2026}",         true, Some("CmdOrCtrl+Shift+E"))?;

            let file_menu = Submenu::with_items(app, "File", true, &[
                &new_win,
                &PredefinedMenuItem::separator(app)?,
                &open_file,
                &open_tree,
                &import_annot,
                &PredefinedMenuItem::separator(app)?,
                &export_tree,
                &export_image,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::close_window(app, None)?,
            ])?;

            // ── Edit ──────────────────────────────────────────────────────────
            let select_all = MenuItem::with_id(app, "select-all", "Select All", true, Some("CmdOrCtrl+A"))?;

            let edit_menu = Submenu::with_items(app, "Edit", true, &[
                // &PredefinedMenuItem::undo(app, None)?,
                // &PredefinedMenuItem::redo(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, None)?,
                &PredefinedMenuItem::copy(app, None)?,
                &PredefinedMenuItem::paste(app, None)?,
                &select_all,
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
            let view_info       = MenuItem::with_id(app, "view-info",       "Get Info...", true, Some("CmdOrCtrl+I"))?;

            let view_menu = Submenu::with_items(app, "View", true, &[
                &view_zoom_in,
                &view_zoom_out,
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
                &view_info,
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
            let tree_paint         = MenuItem::with_id(app, "tree-paint",         "Paint Node",     true, None::<&str>)?;
            let tree_clear_colours = MenuItem::with_id(app, "tree-clear-colours", "Clear Colours",  true, None::<&str>)?;

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
            let show_help = MenuItem::with_id(app, "show-help", "PearTree Help", true, Some("CmdOrCtrl+?"))?;

            let help_menu = Submenu::with_items(app, "Help", true, &[
                &show_help,
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
            for item in &[&import_annot, &export_tree, &export_image] {
                item.set_enabled(false)?;
            }
            for item in &[
                &view_back, &view_forward, &view_home,
                &view_drill, &view_climb,
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
                ("open-tree",        open_tree),
                ("import-annot",     import_annot),
                ("export-tree",      export_tree),
                ("export-image",     export_image),
                ("select-all",       select_all),
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
                ("tree-rotate",      tree_rotate),
                ("tree-rotate-all",  tree_rotate_all),
                ("tree-order-up",    tree_order_up),
                ("tree-order-down",  tree_order_down),
                ("tree-reroot",      tree_reroot),
                ("tree-midpoint",    tree_midpoint),
                ("tree-hide",        tree_hide),
                ("tree-show",        tree_show),
                ("tree-paint",       tree_paint),
                ("tree-clear-colours", tree_clear_colours),
                ("show-help",        show_help),
            ] {
                map.insert(id.to_string(), item);
            }
            app.manage(MenuItems(Mutex::new(map)));
            app.manage(WindowCounter(AtomicU32::new(0)));
            app.manage(PendingFiles(Mutex::new(HashMap::new())));

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
                    w.emit("menu-event", &id).ok();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running PearTree");
}
