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

  // Keep the native window title in sync with the loaded filename.
  // loadTree() in peartree.js calls this via the onTitleChange hook for every load path.
  app.onTitleChange(name => name
    ? setWindowTitle(name)
    : getCurrentWindow().setTitle('PearTree — Phylogenetic Tree Viewer').catch(() => {})
  );

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
  app.setRTTImageSaveHandler(_nativeSave);

  // ── Print: use a Rust command to trigger the native macOS print panel ────
  // window.print() and getCurrentWindow().print() are unreliable inside
  // WKWebView; invoking via Rust's WebviewWindow::print() is the reliable path.
  app.setPrintTrigger(async (layer) => {
    // Don't clear layer here — the afterprint listener (set up in _doPrint) handles
    // cleanup once the print dialog closes or is cancelled.
    await invoke('trigger_print');
  });

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

  // ─── Pending file (new window opened for a specific file) ───────────────
  // When Rust creates a new window to open a file it stores the path
  // server-side keyed by window label. We retrieve and load it on startup.
  try {
    const pending = await invoke('take_pending_file');
    if (pending) {
      try {
        const content = await invoke('read_file_content', { path: pending });
        const name = pending.split(/[\\/]/).pop() || 'tree';
        // Close modal if it was opened, hide empty state
        app.closeModal();
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.classList.add('hidden');
        await app.loadTree(content, name);
      } catch (fileErr) {
        console.error('Failed to read pending file:', fileErr);
        // Ensure UI is in a recoverable state
        app.closeModal();
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.classList.remove('hidden');
        // Show error to user
        const errorMsg = fileErr.message ?? String(fileErr);
        app.showErrorDialog(`Failed to open file: ${errorMsg}`);
      }
    }
  } catch (err) {
    console.error('Failed to load pending file:', err);
    // Non-file-reading errors (e.g., take_pending_file failed) - recoverable
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.classList.remove('hidden');
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
      // Close modal if open, hide empty state before loading
      app.closeModal();
      const emptyState = document.getElementById('empty-state');
      if (emptyState) emptyState.classList.add('hidden');
      
      const content = await invoke('read_file_content', { path: filePath });
      const name = filePath.split(/[\\/]/).pop() || 'tree';
      await app.loadTree(content, name);
    } catch (err) {
      // Restore empty state on error
      const emptyState = document.getElementById('empty-state');
      if (emptyState) emptyState.classList.remove('hidden');
      app.showErrorDialog(err.message ?? String(err));
    }
  });

  // ── Native menu → command dispatch ───────────────────────────────────────
  // Rust emits this only to the focused window so we can safely execute here.
  await listen('menu-event', ({ payload: id }) => {
    registry.execute(id);
  });

  // ── Check for Updates ─────────────────────────────────────────────────────
  registry.get('check-for-updates').exec = async () => {
    try {
      const update = await invoke('check_for_updates');
      if (!update) {
        app.showErrorDialog('PearTree is up to date.');
        return;
      }
      const notes     = update.body ? `\n\nRelease notes:\n${update.body}` : '';
      const msg       = `PearTree v${update.version} is available (you have v${update.current}).${notes}`;
      const confirmed = await app.showConfirmDialog('Update Available', msg, { okLabel: 'Install', cancelLabel: 'Later' });
      if (!confirmed) return;
      await invoke('install_update');
    } catch (err) {
      app.showErrorDialog(`Update check failed: ${err.message ?? String(err)}`);
    }
  };

  // ── Background update check on startup ───────────────────────────────────
  // Fire-and-forget: don't await, so startup is never delayed.
  // Silently ignores network errors (offline, no release yet, etc.).
  (async () => {
    try {
      const update = await invoke('check_for_updates');
      if (!update) return;
      const notes     = update.body ? `\n\nRelease notes:\n${update.body}` : '';
      const msg       = `PearTree v${update.version} is available (you have v${update.current}).${notes}`;
      const confirmed = await app.showConfirmDialog('Update Available', msg, { okLabel: 'Install', cancelLabel: 'Later' });
      if (!confirmed) return;
      await invoke('install_update');
    } catch {
      // Silently ignore — background check should never surface errors to the user.
    }
  })();
})();
