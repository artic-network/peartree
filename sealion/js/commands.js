/**
 * commands.js — Central command registry for Sealion.
 *
 * Defines every user-visible command (menu item, toolbar button, keyboard
 * shortcut).  The Tauri adapter (sealion-tauri.js) subscribes to state
 * changes and forwards them to Rust so the native menu always reflects the
 * current JS state.
 *
 * No Tauri-specific code belongs here.
 */

const _commands = new Map();
const _listeners = [];

function _define({ id, label, shortcut = null, group = null, enabled = true, buttonId = null, exec = null }) {
  const btn = buttonId ? document.getElementById(buttonId) : null;
  _commands.set(id, {
    id,
    label,
    shortcut,
    group,
    enabled,
    buttonId,
    exec: exec ?? (btn ? () => btn.click() : null),
  });
}

// ── File ──────────────────────────────────────────────────────────────────────
_define({ id: 'new-window',       label: 'New Window',                  shortcut: 'CmdOrCtrl+N',       group: 'file',      enabled: true  });
_define({ id: 'open-alignment',   label: 'Open Alignment\u2026',        shortcut: 'CmdOrCtrl+O',       group: 'file',      enabled: true,  buttonId: 'open-file-btn',    exec: () => window.sealion?.pickFile?.()  });
_define({ id: 'load-reference',   label: 'Load Reference Genome\u2026', shortcut: 'CmdOrCtrl+R',       group: 'file',      enabled: true,  buttonId: 'load-reference-btn' });
_define({ id: 'export-alignment', label: 'Export Alignment\u2026',      shortcut: 'CmdOrCtrl+E',       group: 'file',      enabled: false, buttonId: 'export-btn'         });

// ── Alignment ─────────────────────────────────────────────────────────────────
_define({ id: 'find',      label: 'Find\u2026',          shortcut: 'CmdOrCtrl+F',       group: 'alignment', enabled: true,  exec: () => window.sealion?.openSearch?.()  });
_define({ id: 'find-next', label: 'Find Next',            shortcut: 'CmdOrCtrl+G',       group: 'alignment', enabled: true,  exec: () => window.sealion?.findNext?.()    });
_define({ id: 'find-prev', label: 'Find Previous',        shortcut: 'Shift+CmdOrCtrl+G', group: 'alignment', enabled: true,  exec: () => window.sealion?.findPrev?.()    });
_define({ id: 'next-diff', label: 'Next Difference',      shortcut: 'CmdOrCtrl+.',       group: 'alignment', enabled: false, buttonId: 'diff-next-btn'                   });
_define({ id: 'prev-diff', label: 'Previous Difference',  shortcut: 'CmdOrCtrl+,',       group: 'alignment', enabled: false, buttonId: 'diff-prev-btn'                   });

// ── View ──────────────────────────────────────────────────────────────────────
_define({ id: 'zoom-in',    label: 'Zoom In',    shortcut: 'CmdOrCtrl+=', group: 'view', enabled: true, buttonId: 'font-increase-btn' });
_define({ id: 'zoom-out',   label: 'Zoom Out',   shortcut: 'CmdOrCtrl+-', group: 'view', enabled: true, buttonId: 'font-decrease-btn' });
_define({ id: 'reset-zoom', label: 'Reset Zoom', shortcut: 'CmdOrCtrl+0', group: 'view', enabled: true, exec: () => window.viewer?.resetFontSize?.() });

// ── Help ──────────────────────────────────────────────────────────────────────
_define({ id: 'show-help', label: 'Sealion Help', shortcut: null, group: 'help', enabled: true });

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enable or disable a command and sync its toolbar button + notify listeners.
 */
function setEnabled(id, enabled) {
  const cmd = _commands.get(id);
  if (!cmd || cmd.enabled === enabled) return;
  cmd.enabled = enabled;
  if (cmd.buttonId) {
    const btn = document.getElementById(cmd.buttonId);
    if (btn) btn.disabled = !enabled;
  }
  for (const fn of _listeners) {
    try { fn(id, enabled); } catch (_) {}
  }
}

/**
 * Subscribe to enabled-state changes.
 * @param {function(id: string, enabled: boolean): void} fn
 * @param {{ callNow?: boolean }} opts  Pass callNow=true to receive the current
 *   state for every command immediately (used by sealion-tauri.js on focus).
 */
function onStateChange(fn, { callNow = false } = {}) {
  _listeners.push(fn);
  if (callNow) {
    for (const [, cmd] of _commands) {
      try { fn(cmd.id, cmd.enabled); } catch (_) {}
    }
  }
}

/** Execute a command by id (no-op if disabled or has no exec). */
function execute(id) {
  const cmd = _commands.get(id);
  if (!cmd || !cmd.enabled || !cmd.exec) return;
  try { cmd.exec(); } catch (err) { console.error(`[commands] execute(${id}) failed:`, err); }
}

/** Return the command descriptor for id, or undefined. */
function get(id) { return _commands.get(id); }

/** Return all command descriptors as a Map. */
function getAll() { return _commands; }

/**
 * Check whether a KeyboardEvent matches a shortcut string such as
 * 'CmdOrCtrl+Shift+G'.
 */
function matchesShortcut(e, shortcut) {
  if (!shortcut) return false;
  const parts      = shortcut.split('+');
  const key        = parts[parts.length - 1];
  const needCmd    = parts.some(p => p === 'CmdOrCtrl');
  const needShift  = parts.includes('Shift');
  const needAlt    = parts.includes('Alt');
  const cmdOrCtrl  = e.metaKey || e.ctrlKey;
  if (needCmd   && !cmdOrCtrl)    return false;
  if (needShift && !e.shiftKey)   return false;
  if (needAlt   && !e.altKey)     return false;
  if (e.key.toLowerCase() !== key.toLowerCase() && e.key !== key) return false;
  return true;
}

// Expose under window.sealion.commands.  commands.js may load before or after
// sealion.js sets up the full app object, so create a stub if needed.
if (!window.sealion) window.sealion = {};
window.sealion.commands = { setEnabled, onStateChange, execute, get, getAll, matchesShortcut };
