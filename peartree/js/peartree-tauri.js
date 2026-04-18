/**
 * peartree-tauri.js — Tree-specific Tauri platform adapter.
 *
 * Extends the generic pearcore Tauri adapter with:
 *   • Native tree file picker     (pick_tree_file command)
 *   • Open-tree command override  (bypasses modal, uses native picker)
 *   • Import annotations override (pick_annot_file + config step)
 *   • Pending file load           (new window opened for a specific file)
 *   • File-open event handler     (drag/dbl-click/file association → loadTree)
 *
 * Loaded unconditionally from peartree-tauri.html; self-guards on
 * window.__TAURI__ so it is silently inert in a plain browser.
 */

import { setupTauriAdapter } from '../../pearcore/js/pearcore-tauri.js';

(async () => {
  if (!window.__TAURI__) return;

  // Wait for peartree to finish initialising (fires 'peartree-ready' event).
  await new Promise(resolve => {
    if (window.peartree) { resolve(); return; }
    window.addEventListener('peartree-ready', resolve, { once: true });
  });

  const app      = window.peartree;
  const registry = app.commands;

  // ── Generic Tauri adapter: save dialogs, print, menu sync, updates ─────
  const { invoke, currentWindow } = await setupTauriAdapter({
    app,
    registry,
    appTitle: 'PearTree — Phylogenetic Tree Viewer',
    appName:  'PearTree',
  });

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
  // Rust emits this only to the focused window. Use getCurrentWindow().listen
  // so each window only handles events targeted at it (not all windows).
  await currentWindow.listen('open-file', async (event) => {
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
})();
