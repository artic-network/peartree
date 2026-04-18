/**
 * pearcore-tauri.js — Generic Tauri platform adapter for pearcore-based apps.
 *
 * Provides a setup function that wires a pearcore app's command registry to
 * Tauri's native backend features:
 *   • Native save dialogs      (replaces browser downloads)
 *   • Print trigger             (invoke Rust's WebviewWindow::print)
 *   • Menu enabled-state sync   (push JS command state to native menus)
 *   • Menu→command dispatch     (native menu actions → JS command execution)
 *   • Window title management   (keep native title bar in sync)
 *   • Auto-update check/install (manual + background)
 *
 * App-specific Tauri hooks (file pickers, file-open events, file associations)
 * are handled by the app's own Tauri adapter (e.g. peartree-tauri.js) which
 * calls this setup first, then adds its overrides.
 *
 * @module pearcore-tauri
 */

/**
 * Initialise the generic Tauri platform adapter.
 *
 * @param {object} opts
 * @param {object}  opts.app              - The app's public API (e.g. window.peartree)
 * @param {object}  opts.registry         - The command registry (app.commands)
 * @param {string}  opts.appTitle         - Default window title (e.g. 'PearTree — Phylogenetic Tree Viewer')
 * @param {string}  opts.appName          - App display name for update dialogs (e.g. 'PearTree')
 * @param {string[]} [opts.saveHandlers]  - Names of set*SaveHandler methods on app to wire to native save
 *                                          (default: all four standard handlers)
 * @returns {Promise<object>} Tauri helpers: { invoke, listen, currentWindow }
 */
export async function setupTauriAdapter({
  app,
  registry,
  appTitle,
  appName,
  saveHandlers,
}) {
  const { invoke }           = window.__TAURI__.core;
  const { listen }           = window.__TAURI__.event;
  const { getCurrentWindow } = window.__TAURI__.window;
  const currentWindow        = getCurrentWindow();

  // ── Window title management ────────────────────────────────────────────
  const setWindowTitle = (name) =>
    currentWindow.setTitle(`${appName} — ${name}`).catch(() => {});

  app.onTitleChange(name => name
    ? setWindowTitle(name)
    : currentWindow.setTitle(appTitle).catch(() => {})
  );

  // ── Native save handler ────────────────────────────────────────────────
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

  // Wire all specified save handlers to the native save dialog.
  const defaultSaveHandlers = [
    'setExportSaveHandler',
    'setGraphicsSaveHandler',
    'setRTTImageSaveHandler',
    'setThemeSaveHandler',
  ];
  for (const name of (saveHandlers ?? defaultSaveHandlers)) {
    if (typeof app[name] === 'function') {
      app[name](_nativeSave);
    }
  }

  // ── Print trigger ──────────────────────────────────────────────────────
  if (typeof app.setPrintTrigger === 'function') {
    app.setPrintTrigger(async (_layer) => {
      await invoke('trigger_print');
    });
  }

  // ── Native menu enabled-state sync ─────────────────────────────────────
  registry.onStateChange((id, enabled, label) => {
    invoke('set_menu_item_enabled', { id, enabled })
      .catch(err => console.error('[tauri] set_menu_item_enabled failed', id, err));
    if (label !== undefined) {
      invoke('set_menu_item_text', { id, text: label }).catch(() => {});
    }
  });

  // Re-sync menu when this window gains focus (macOS has one global app menu).
  await currentWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused) return;
    for (const cmd of registry.getAll().values()) {
      invoke('set_menu_item_enabled', { id: cmd.id, enabled: cmd.enabled }).catch(() => {});
      if (cmd.label) invoke('set_menu_item_text', { id: cmd.id, text: cmd.label }).catch(() => {});
    }
  });

  // ── Menu→command dispatch ──────────────────────────────────────────────
  await listen(`menu-event-${currentWindow.label}`, ({ payload: id }) => {
    registry.execute(id);
  });

  // ── New window command ─────────────────────────────────────────────────
  const newWindowCmd = registry.get('new-window');
  if (newWindowCmd) {
    newWindowCmd.exec = () => {
      invoke('new_window', { filePath: null }).catch(err => console.error('new_window failed:', err));
    };
  }

  // ── Auto-update ────────────────────────────────────────────────────────
  const updateCmd = registry.get('check-for-updates');
  if (updateCmd) {
    updateCmd.exec = async () => {
      try {
        const update = await invoke('check_for_updates');
        if (!update) {
          app.showErrorDialog(`${appName} is up to date.`);
          return;
        }
        const notes     = update.body ? `\n\nRelease notes:\n${update.body}` : '';
        const msg       = `${appName} v${update.version} is available (you have v${update.current}).${notes}`;
        const confirmed = await app.showConfirmDialog('Update Available', msg, { okLabel: 'Install', cancelLabel: 'Later' });
        if (!confirmed) return;
        await invoke('install_update');
      } catch (err) {
        app.showErrorDialog(`Update check failed: ${err.message ?? String(err)}`);
      }
    };
  }

  // Background update check on startup (fire-and-forget, silent on error).
  (async () => {
    try {
      const update = await invoke('check_for_updates');
      if (!update) return;
      const notes     = update.body ? `\n\nRelease notes:\n${update.body}` : '';
      const msg       = `${appName} v${update.version} is available (you have v${update.current}).${notes}`;
      const confirmed = await app.showConfirmDialog('Update Available', msg, { okLabel: 'Install', cancelLabel: 'Later' });
      if (!confirmed) return;
      await invoke('install_update');
    } catch {
      // Silently ignore — background check should never surface errors.
    }
  })();

  return { invoke, listen, currentWindow, nativeSave: _nativeSave };
}
