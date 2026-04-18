/**
 * sealion-tauri.js — Tauri platform adapter for Sealion.
 *
 * Wires window.sealion.commands (the central registry) to Tauri's native
 * backend features:
 *   • Native file-open dialog         (pick_alignment_file / pick_reference_file)
 *   • New window creation             (new_window, Cmd+N)
 *   • File open via drag / dbl-click  (open-file event, routes to focused window)
 *   • Native menu → command dispatch  (menu-event, targeted at this window)
 *   • Native menu enabled-state sync  (set_menu_item_enabled, re-synced on focus)
 *
 * Loaded unconditionally from sealion.html; self-guards on window.__TAURI__
 * so it is silently inert when running in a plain browser.
 */

(async () => {
  if (!window.__TAURI__) return;

  // Wait for Sealion to finish initialising (fires 'sealion-ready' event).
  await new Promise(resolve => {
    if (window.sealion && window.sealion.loadFastaFromText) { resolve(); return; }
    window.addEventListener('sealion-ready', resolve, { once: true });
  });

  const { invoke }           = window.__TAURI__.core;
  const { listen }           = window.__TAURI__.event;
  const { getCurrentWindow } = window.__TAURI__.window;
  const app                  = window.sealion;
  const registry             = app.commands;

  const setWindowTitle = (name) =>
    getCurrentWindow().setTitle(`Sealion \u2014 ${name}`).catch(() => {});

  // ── Alignment file picker: native Tauri dialog ─────────────────────────
  // WKWebView blocks <input type="file"> clicks from async contexts, so we
  // override the default pickFile with a Rust command.
  // If an alignment is already loaded in this window, open the file in a
  // new window instead of replacing the current one.
  app.pickFile = async () => {
    try {
      const result = await invoke('pick_alignment_file');
      if (!result) return;
      if (app.hasAlignment) {
        invoke('new_window', { filePath: result.path })
          .catch(err => console.error('new_window failed:', err));
      } else {
        await app.loadFastaFromText(result.content, result.name);
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

  // ── Open Alignment bypasses the modal: go straight to native picker ────
  registry.get('open-alignment').exec = () => app.pickFile();

  // ── Load Reference bypasses the modal: native file picker ──────────────
  registry.get('load-reference').exec = async () => {
    try {
      const result = await invoke('pick_reference_file');
      if (!result) return;
      await app.loadReferenceFromText(result.content, result.name);
    } catch (err) {
      app.showErrorDialog(err.message ?? String(err));
    }
  };

  // ── Native save for Export Alignment ──────────────────────────────────
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
  app.setSaveHandler(_nativeSave);

  // ── Native menu enabled-state sync ────────────────────────────────────────
  // Subscribe to state changes from the JS command registry. Rust sets the
  // correct initial disabled states at launch; this handles all dynamic
  // changes thereafter (alignment loaded, reference set, etc.).
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
      try {
        const content = await invoke('read_file_content', { path: pending });
        const name = pending.split(/[\\/]/).pop() || 'alignment';
        app.closeModal();
        await app.loadFastaFromText(content, name);
        setWindowTitle(name);
      } catch (fileErr) {
        console.error('Failed to read pending file:', fileErr);
        app.closeModal();
        app.showErrorDialog(`Failed to open file: ${fileErr.message ?? String(fileErr)}`);
      }
    }
  } catch (err) {
    console.error('Failed to get pending file:', err);
  }

  // ── File opened via drag-to-icon / double-click / file association ─────
  await listen('open-file', async ({ payload }) => {
    try {
      const path    = typeof payload === 'string' ? payload : payload.path;
      const content = await invoke('read_file_content', { path });
      const name    = path.split(/[\\/]/).pop() || 'alignment';
      if (app.hasAlignment) {
        // Pass path to a fresh window rather than replacing the current alignment.
        invoke('new_window', { filePath: path })
          .catch(err => console.error('new_window failed:', err));
      } else {
        app.closeModal();
        await app.loadFastaFromText(content, name);
        setWindowTitle(name);
      }
    } catch (err) {
      console.error('Failed to open file from event:', err);
      app.showErrorDialog(`Failed to open file: ${err.message ?? String(err)}`);
    }
  });

  // ── Native menu events → command dispatch ──────────────────────────────
  await listen('menu-event', ({ payload: id }) => {
    registry.execute(id);
  });

})();
