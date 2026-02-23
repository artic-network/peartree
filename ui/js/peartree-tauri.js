/**
 * peartree-tauri.js — Tauri platform adapter for peartree.
 *
 * This module wires the peartree public API (window.peartree) up to Tauri
 * backend features:
 *   • Native file-open dialog       (pick_tree_file command)
 *   • File open via drag / dbl-click (open-file event)
 *   • Native menu → UI dispatch      (menu-event event)
 *   • Native menu enabled-state sync (set_menu_item_enabled command)
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

  const { invoke } = window.__TAURI__.core;
  const { listen }  = window.__TAURI__.event;
  const app         = window.peartree;

  // ── File picker: native Tauri dialog ──────────────────────────────────────
  // WKWebView blocks <input type="file"> clicks from async callbacks such as
  // menu events and keyboard shortcuts, so we use a Rust command instead.
  app.pickFile = async () => {
    try {
      const result = await invoke('pick_tree_file');
      if (result) await app.loadTree(result.content, result.name);
    } catch (err) {
      console.error('pick_tree_file failed:', err);
    }
  };

  // ── Native menu enabled-state sync ────────────────────────────────────────
  app.setMenuEnabledImpl((id, enabled) => {
    invoke('set_menu_item_enabled', { id, enabled }).catch(() => {});
  });

  // ── File opened via drag-to-icon / double-click / file association ─────────
  await listen('open-file', async (event) => {
    const filePath = event.payload;
    if (!filePath) return;
    try {
      const content = await invoke('read_file_content', { path: filePath });
      const name = filePath.split('/').pop() || 'tree';
      app.closeModal();
      await app.loadTree(content, name);
    } catch (err) {
      app.openModal();
      app.setModalError(err.message);
    }
  });

  // ── Native menu → UI bridge ───────────────────────────────────────────────
  function btn(id) { document.getElementById(id)?.click(); }

  await listen('menu-event', ({ payload: id }) => {
    switch (id) {
      // ── File ──────────────────────────────────────────────────────────────
      case 'open-file':    app.pickFile();              break;
      case 'open-tree':    btn('btn-open-tree');        break;
      case 'import-annot': btn('btn-import-annot');     break;
      case 'export-tree':  btn('btn-export-tree');      break;
      case 'export-image': btn('btn-export-graphic');   break;
      case 'show-help':    btn('btn-help');              break;
      // ── View ──────────────────────────────────────────────────────────────
      case 'view-back':       btn('btn-back');          break;
      case 'view-forward':    btn('btn-forward');       break;
      case 'view-drill':      btn('btn-drill');         break;
      case 'view-climb':      btn('btn-climb');         break;
      case 'view-home':       btn('btn-home');          break;
      case 'view-zoom-in':    btn('btn-zoom-in');       break;
      case 'view-zoom-out':   btn('btn-zoom-out');      break;
      case 'view-fit':        btn('btn-fit');           break;
      case 'view-fit-labels': btn('btn-fit-labels');    break;
      case 'view-info':       btn('btn-node-info');     break;
      // ── Tree ──────────────────────────────────────────────────────────────
      case 'tree-rotate':        btn('btn-rotate');              break;
      case 'tree-rotate-all':    btn('btn-rotate-all');          break;
      case 'tree-order-up':      btn('btn-order-asc');           break;
      case 'tree-order-down':    btn('btn-order-desc');          break;
      case 'tree-reroot':        btn('btn-reroot');              break;
      case 'tree-midpoint':      btn('btn-midpoint-root');       break;
      case 'tree-hide':          btn('btn-hide');                break;
      case 'tree-show':          btn('btn-show');                break;
      case 'tree-paint':         btn('btn-apply-user-colour');   break;
      case 'tree-clear-colours': btn('btn-clear-user-colour');   break;
      // ── Edit ──────────────────────────────────────────────────────────────
      case 'select-all': {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
          document.execCommand('selectAll');
        } else {
          app.selectAll();
        }
        break;
      }
    }
  });
})();
