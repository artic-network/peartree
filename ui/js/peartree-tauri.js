/**
 * peartree-tauri.js — Tauri platform adapter for peartree.
 *
 * Wires window.peartree.commands (the central registry) to Tauri's native
 * backend features:
 *   • Native file-open dialog         (pick_tree_file command)
 *   • New window creation             (new_window command, Cmd+N)
 *   • File open via drag / dbl-click  (open-file event, routes to focused window)
 *   • Native menu → command dispatch  (menu-event event, targeted at this window)
 *   • Native menu enabled-state sync  (set_menu_item_enabled, re-synced on focus)
 *
 * Loaded unconditionally from peartree.html; self-guards on window.__TAURI__
 * so it is silently inert when running in a plain browser.
 */

(async () => {
  if (!window.__TAURI__) return;

  // Wait for peartree to finish initialising (fires 'peartree-ready' event).
  await new Promise(resolve => {
    if (window.peartree) { resolve(); return; }
    window.addEventListener('peartree-ready', resolve, { once: true });
  });

  const { invoke }        = window.__TAURI__.core;
  const { listen }         = window.__TAURI__.event;
  const { getCurrentWindow } = window.__TAURI__.window;
  const app                = window.peartree;
  const registry           = app.commands;

  const setWindowTitle = (name) =>
    getCurrentWindow().setTitle(`PearTree — ${name}`).catch(() => {});

  // ── File picker: native Tauri dialog ───────────────────────────────────
  // WKWebView blocks <input type="file"> clicks from async contexts, so we
  // override the default pickFile with a Rust command.
  // If a tree is already open in this window, open the chosen file in a new
  // window instead of overwriting the current one (same as the open-file event).
  app.pickFile = async () => {
    try {
      const result = await invoke('pick_tree_file');
      if (!result) return;
      if (app.hasTree) {
        // Pass the file path to a fresh window so it loads there.
        invoke('new_window', { filePath: result.path })
          .catch(err => console.error('new_window failed:', err));
      } else {
        await app.loadTree(result.content, result.name);
        setWindowTitle(result.name);
      }
    } catch (err) {
      app.showErrorDialog(err.message ?? String(err));
    }
  };

  // ── New window ─────────────────────────────────────────────────────────
  registry.get('new-window').exec = () => {
    invoke('new_window', { filePath: null }).catch(err => console.error('new_window failed:', err));
  };

  // ── In Tauri, "Open Tree File" button bypasses the modal and goes straight
  //    to the native file picker (same as Cmd+O).
  registry.get('open-tree').exec = () => app.pickFile();

  // ── In Tauri, "Import Annotations" bypasses the modal picker phase and uses
  //    the native file dialog, then feeds the content straight into the config step.
  registry.get('import-annot').exec = async () => {
    try {
      const result = await invoke('pick_annot_file');
      if (!result) return;
      app.annotImporter.loadFile(result.name, result.content);
    } catch (err) {
      app.showErrorDialog(err.message ?? String(err));
    }
  };

  // ── In Tauri, Export Tree / Export Graphic show native save-file dialogs
  //    instead of triggering browser downloads.  The modal dialogs still appear
  //    so the user can choose format, scope, etc. — only the final save step
  //    is replaced.
  const _nativeSave = async ({ content, contentBase64, base64 = false, filename, filterName, extensions }) => {
    try {
      await invoke('save_file', {
        filename,
        content:    base64 ? contentBase64 : content,
        base64,
        filterName,
        extensions,
      });
    } catch (err) {
      app.showErrorDialog(err.message ?? String(err));
    }
  };
  app.setExportSaveHandler(_nativeSave);
  app.setGraphicsSaveHandler(_nativeSave);

  // ── Native menu enabled-state sync ────────────────────────────────────────
  // Subscribe to state changes from the JS command registry. Rust sets the
  // correct initial disabled states at launch; this handles all dynamic
  // changes thereafter (tree loaded, selection changed, etc.).
  registry.onStateChange((id, enabled) => {
    invoke('set_menu_item_enabled', { id, enabled })
      .catch(err => console.error('[tauri] set_menu_item_enabled failed', id, err));
  });

  // ── Re-sync menu when this window gains focus ──────────────────────────
  // macOS has a single global menu bar. When the user switches windows the
  // menu must reflect the newly focused window's command state, so we push
  // the full registry state to Rust whenever this window gets focus.
  window.addEventListener('focus', () => {
    for (const cmd of registry.getAll().values()) {
      invoke('set_menu_item_enabled', { id: cmd.id, enabled: cmd.enabled }).catch(() => {});
    }
  });

  // ── Pending file (new window opened for a specific file) ───────────────
  // When Rust creates a new window to open a file it stores the path
  // server-side keyed by window label. We retrieve and load it on startup.
  try {
    const pending = await invoke('take_pending_file');
    if (pending) {
      const content = await invoke('read_file_content', { path: pending });
      const name = pending.split('/').pop() || 'tree';
      app.closeModal();
      await app.loadTree(content, name);
      setWindowTitle(name);
    }
  } catch (err) {
    console.error('Failed to load pending file:', err);
  }

  // ── File opened via drag-to-icon / double-click / file association ─────
  // Rust emits this only to the focused window. If this window already has a
  // tree open, delegate to a new window instead of overwriting.
  await listen('open-file', async (event) => {
    const filePath = event.payload;
    if (!filePath) return;

    if (app.hasTree) {
      // Open the file in a fresh window.
      invoke('new_window', { filePath }).catch(err => console.error('new_window failed:', err));
      return;
    }

    try {
      const content = await invoke('read_file_content', { path: filePath });
      const name = filePath.split('/').pop() || 'tree';
      app.closeModal();
      await app.loadTree(content, name);
      setWindowTitle(name);
    } catch (err) {
      app.showErrorDialog(err.message);
    }
  });

  // ── Native menu → command dispatch ───────────────────────────────────────
  // Rust emits this only to the focused window so we can safely execute here.
  await listen('menu-event', ({ payload: id }) => {
    registry.execute(id);
  });
})();
