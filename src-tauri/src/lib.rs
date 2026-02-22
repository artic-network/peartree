use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};
use tauri_plugin_dialog::DialogExt;

/// Called from JS to enable/disable a menu item by its string id.
#[tauri::command]
fn set_menu_item_enabled(app: tauri::AppHandle, id: &str, enabled: bool) {
    if let Some(menu) = app.menu() {
        if let Some(item) = menu.get(id) {
            if let Some(mi) = item.as_menuitem() {
                let _ = mi.set_enabled(enabled);
            }
        }
    }
}

/// Opens a native OS file picker filtered to tree file types, reads the
/// selected file, and returns `{"name": "...", "content": "..."}` to JS.
/// Returns `null` if the user cancels.
#[tauri::command]
fn pick_tree_file(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let result = app
        .dialog()
        .file()
        .add_filter(
            "Tree files",
            &["nex", "nexus", "tre", "tree", "nwk", "newick", "txt"],
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_menu_item_enabled, pick_tree_file])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
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
            let open_file    = MenuItem::with_id(app, "open-file",    "Open\u{2026}",                true, Some("CmdOrCtrl+O"))?;
            let open_tree    = MenuItem::with_id(app, "open-tree",    "Open Tree\u{2026}",           true, Some("CmdOrCtrl+Shift+O"))?;
            let import_annot = MenuItem::with_id(app, "import-annot", "Import Annotations\u{2026}",  true, Some("CmdOrCtrl+Shift+A"))?;
            let export_tree  = MenuItem::with_id(app, "export-tree",  "Export Tree\u{2026}",          true, Some("CmdOrCtrl+E"))?;
            let export_image = MenuItem::with_id(app, "export-image", "Export Image\u{2026}",         true, Some("CmdOrCtrl+Shift+E"))?;

            let file_menu = Submenu::with_items(app, "File", true, &[
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
            let view_home       = MenuItem::with_id(app, "view-home",       "Root",               true, Some("CmdOrCtrl+\\"))?;
            let view_zoom_in    = MenuItem::with_id(app, "view-zoom-in",    "Zoom In",    true, Some("CmdOrCtrl+="))?;
            let view_zoom_out   = MenuItem::with_id(app, "view-zoom-out",   "Zoom Out",   true, Some("CmdOrCtrl+-"))?;
            let view_fit        = MenuItem::with_id(app, "view-fit",        "Fit All",    true, Some("CmdOrCtrl+0"))?;
            let view_fit_labels = MenuItem::with_id(app, "view-fit-labels", "Fit Labels", true, Some("CmdOrCtrl+Shift+0"))?;
            let view_info       = MenuItem::with_id(app, "view-info",       "Get Info...", true, Some("CmdOrCtrl+I"))?;

            let view_menu = Submenu::with_items(app, "View", true, &[
                &view_back,
                &view_forward,
                &PredefinedMenuItem::separator(app)?,
                &view_climb,
                &view_drill,
                &view_home,
                &PredefinedMenuItem::separator(app)?,
                &view_zoom_in,
                &view_zoom_out,
                &PredefinedMenuItem::separator(app)?,
                &view_fit,
                &view_fit_labels,
                &PredefinedMenuItem::separator(app)?,
                &view_info,
            ])?;

            // ── Tree ─────────────────────────────────────────────────────────
            let tree_rotate        = MenuItem::with_id(app, "tree-rotate",        "Rotate Node",    true, None::<&str>)?;
            let tree_rotate_all    = MenuItem::with_id(app, "tree-rotate-all",    "Rotate Clade",   true, None::<&str>)?;
            let tree_order_up      = MenuItem::with_id(app, "tree-order-up",      "Order Up",       true, Some("CmdOrCtrl+D"))?;
            let tree_order_down    = MenuItem::with_id(app, "tree-order-down",    "Order Down",     true, Some("CmdOrCtrl+U"))?;
            let tree_reroot        = MenuItem::with_id(app, "tree-reroot",        "Re-root Tree",   true, None::<&str>)?;
            let tree_midpoint      = MenuItem::with_id(app, "tree-midpoint",      "Midpoint Root",  true, Some("CmdOrCtrl+M"))?;
            let tree_hide          = MenuItem::with_id(app, "tree-hide",          "Hide Nodes",     true, None::<&str>)?;
            let tree_show          = MenuItem::with_id(app, "tree-show",          "Show Nodes",     true, None::<&str>)?;
            let tree_paint         = MenuItem::with_id(app, "tree-paint",         "Paint Node",     true, None::<&str>)?;
            let tree_clear_colours = MenuItem::with_id(app, "tree-clear-colours", "Clear Colours",  true, None::<&str>)?;

            let tree_menu = Submenu::with_items(app, "Tree", true, &[
                &tree_rotate,
                &tree_rotate_all,
                &PredefinedMenuItem::separator(app)?,
                &tree_order_up,
                &tree_order_down,
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

            // ── Initial disabled states (no tree loaded yet) ──────────────────
            // File: need a tree before these make sense.
            for item in &[&import_annot, &export_tree, &export_image] {
                item.set_enabled(false)?;
            }
            // View: no navigation history on startup; no tree for Get Info.
            for item in &[&view_back, &view_forward, &view_home, &view_info] {
                item.set_enabled(false)?;
            }
            // Tree: require a loaded tree and/or a selection.
            for item in &[
                &tree_rotate, &tree_rotate_all,
                &tree_reroot, &tree_midpoint,
                &tree_hide, &tree_show,
                &tree_paint, &tree_clear_colours,
            ] {
                item.set_enabled(false)?;
            }
            // Forward every menu event to the frontend as a "menu-event" with the item id as payload
            app.on_menu_event(|app, event| {
                app.emit("menu-event", event.id().as_ref()).ok();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running PearTree");
}
