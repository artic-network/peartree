/**
 * commands.js — Central command registry for PearTree.
 *
 * A Command is the single source of truth for:
 *   • whether an action is currently enabled / disabled
 *   • its keyboard shortcut (Tauri/Electron format, e.g. 'CmdOrCtrl+Shift+O')
 *   • the DOM toolbar-button id that corresponds to it (if any)
 *   • the exec function that carries out the action
 *
 * Usage:
 *   import * as commands from './commands.js';
 *
 *   commands.get('view-back').exec = () => renderer.navigateBack();
 *   commands.setEnabled('view-back', canBack);   // syncs button + notifies listeners
 *   commands.execute('view-back');               // called by keyboard handler / menu adapter
 *
 * Platform adapters (peartree-tauri.js) subscribe via onStateChange to keep
 * the native menu in sync without peartree.js knowing Tauri exists.
 */

// ── Internal state ─────────────────────────────────────────────────────────
const _commands  = new Map();  // id → Command
const _listeners = [];         // (id, enabled) => void

function _define(def) {
  _commands.set(def.id, {
    id:       def.id,
    label:    def.label,
    shortcut: def.shortcut  ?? null,   // Tauri-format: 'CmdOrCtrl+Shift+O', or null
    group:    def.group     ?? 'misc',
    enabled:  def.enabled   ?? true,   // initial enabled state
    buttonId: def.buttonId  ?? null,   // DOM id of the corresponding toolbar button
    exec:     null,                    // set at runtime by peartree.js
  });
}

// ── Command definitions ────────────────────────────────────────────────────
// enabled: true  → available at launch, no tree required
// enabled: false → requires a tree (or selection) to make sense

// File
_define({ id: 'new-window',   label: 'New Window',             shortcut: 'CmdOrCtrl+N',       group: 'file', enabled: true  });
_define({ id: 'open-file',    label: 'Open…',                 shortcut: 'CmdOrCtrl+O',       group: 'file', enabled: true  });
_define({ id: 'open-tree',    label: 'Open Tree…',             shortcut: 'CmdOrCtrl+Shift+O', group: 'file', enabled: true,  buttonId: 'btn-open-tree'      });
_define({ id: 'import-annot',  label: 'Import Annotations…',    shortcut: 'CmdOrCtrl+Shift+A', group: 'file', enabled: false, buttonId: 'btn-import-annot'   });
_define({ id: 'curate-annot', label: 'Curate Annotations…',    shortcut: null,                group: 'file', enabled: false, buttonId: 'btn-curate-annot'   });
_define({ id: 'export-tree',  label: 'Export Tree…',            shortcut: 'CmdOrCtrl+E',       group: 'file', enabled: false, buttonId: 'btn-export-tree'    });
_define({ id: 'export-image', label: 'Export Image…',           shortcut: 'CmdOrCtrl+Shift+E', group: 'file', enabled: false, buttonId: 'btn-export-graphic' });

// Edit
_define({ id: 'paste-tree',    label: 'Paste Tree',            shortcut: 'CmdOrCtrl+V',         group: 'edit', enabled: true  });
_define({ id: 'copy-tree',     label: 'Copy Tree',             shortcut: 'CmdOrCtrl+C',         group: 'edit', enabled: false });
_define({ id: 'copy-tips',     label: 'Copy Tips',             shortcut: 'CmdOrCtrl+Shift+C',   group: 'edit', enabled: false });
_define({ id: 'select-all',    label: 'Select All',            shortcut: 'CmdOrCtrl+A',         group: 'edit', enabled: true  });
_define({ id: 'select-invert', label: 'Invert Selection',      shortcut: 'CmdOrCtrl+Shift+I',   group: 'edit', enabled: true  });

// View
_define({ id: 'view-back',       label: 'Back',                shortcut: 'CmdOrCtrl+[',       group: 'view', enabled: false, buttonId: 'btn-back'        });
_define({ id: 'view-forward',    label: 'Forward',             shortcut: 'CmdOrCtrl+]',       group: 'view', enabled: false, buttonId: 'btn-forward'     });
_define({ id: 'view-drill',      label: 'Drill into Subtree',  shortcut: 'CmdOrCtrl+Shift+.', group: 'view', enabled: false, buttonId: 'btn-drill'       });
_define({ id: 'view-climb',      label: 'Climb Out One Level', shortcut: 'CmdOrCtrl+Shift+,', group: 'view', enabled: false, buttonId: 'btn-climb'       });
_define({ id: 'view-home',       label: 'Root',                shortcut: 'CmdOrCtrl+\\',      group: 'view', enabled: false, buttonId: 'btn-home'        });
_define({ id: 'view-zoom-in',    label: 'Zoom In',             shortcut: 'CmdOrCtrl+=',       group: 'view', enabled: false, buttonId: 'btn-zoom-in'     });
_define({ id: 'view-zoom-out',   label: 'Zoom Out',            shortcut: 'CmdOrCtrl+-',       group: 'view', enabled: false, buttonId: 'btn-zoom-out'    });
_define({ id: 'view-fit',          label: 'Fit All',             shortcut: 'CmdOrCtrl+0',        group: 'view', enabled: false, buttonId: 'btn-fit'         });
_define({ id: 'view-fit-labels',   label: 'Fit Labels',          shortcut: 'CmdOrCtrl+Shift+0',  group: 'view', enabled: false, buttonId: 'btn-fit-labels'  });
_define({ id: 'view-scroll-top',   label: 'Scroll to Top',       shortcut: 'CmdOrCtrl+Shift+ArrowUp',   group: 'view', enabled: false });
_define({ id: 'view-scroll-bottom',label: 'Scroll to Bottom',    shortcut: 'CmdOrCtrl+Shift+ArrowDown', group: 'view', enabled: false });
_define({ id: 'view-info',         label: 'Get Info…',           shortcut: 'CmdOrCtrl+I',        group: 'view', enabled: false, buttonId: 'btn-node-info'   });

// Tree
_define({ id: 'tree-rotate',        label: 'Rotate Node',    shortcut: null,          group: 'tree', enabled: false, buttonId: 'btn-rotate'              });
_define({ id: 'tree-rotate-all',    label: 'Rotate Clade',   shortcut: null,          group: 'tree', enabled: false, buttonId: 'btn-rotate-all'          });
_define({ id: 'tree-order-up',      label: 'Order Up',       shortcut: 'CmdOrCtrl+U', group: 'tree', enabled: false, buttonId: 'btn-order-asc'           });
_define({ id: 'tree-order-down',    label: 'Order Down',     shortcut: 'CmdOrCtrl+D', group: 'tree', enabled: false, buttonId: 'btn-order-desc'          });
_define({ id: 'tree-reroot',        label: 'Re-root Tree',   shortcut: null,          group: 'tree', enabled: false, buttonId: 'btn-reroot'              });
_define({ id: 'tree-midpoint',      label: 'Midpoint Root',  shortcut: 'CmdOrCtrl+M', group: 'tree', enabled: false, buttonId: 'btn-midpoint-root'       });
_define({ id: 'tree-hide',          label: 'Hide Nodes',     shortcut: null,          group: 'tree', enabled: false, buttonId: 'btn-hide'                });
_define({ id: 'tree-show',          label: 'Show Nodes',     shortcut: null,          group: 'tree', enabled: false, buttonId: 'btn-show'                });
_define({ id: 'tree-collapse-clade', label: 'Collapse Clade', shortcut: null,         group: 'tree', enabled: false, buttonId: 'btn-collapse-clade'      });
_define({ id: 'tree-expand-clade',   label: 'Expand Clade',   shortcut: null,         group: 'tree', enabled: false, buttonId: 'btn-expand-clade'        });
_define({ id: 'tree-paint',         label: 'Paint Node',     shortcut: null,          group: 'tree', enabled: false, buttonId: 'btn-apply-user-colour'   });
_define({ id: 'tree-clear-colours', label: 'Clear Colours',  shortcut: null,          group: 'tree', enabled: false, buttonId: 'btn-clear-user-colour'   });

// Help
_define({ id: 'show-help',          label: 'PearTree Help',        shortcut: 'CmdOrCtrl+?', group: 'help', enabled: true, buttonId: 'btn-help' });
_define({ id: 'check-for-updates',  label: 'Check for Updates…', shortcut: null,           group: 'help', enabled: true });

// ── Public API ─────────────────────────────────────────────────────────────

/** Enable or disable a command. Automatically syncs the linked DOM button
 *  (.disabled) and notifies all registered state-change listeners. */
export function setEnabled(id, enabled) {
  const cmd = _commands.get(id);
  if (!cmd || cmd.enabled === enabled) return;
  cmd.enabled = enabled;
  if (cmd.buttonId) {
    const el = document.getElementById(cmd.buttonId);
    if (el) el.disabled = !enabled;
  }
  for (const fn of _listeners) fn(id, enabled);
}

/** Subscribe to command state changes. Callback signature: (id, enabled) => void.
 *  Called immediately for all currently-defined commands if callNow=true, which
 *  lets adapters sync their initial state on startup. */
export function onStateChange(fn, { callNow = false } = {}) {
  _listeners.push(fn);
  if (callNow) {
    for (const cmd of _commands.values()) fn(cmd.id, cmd.enabled);
  }
}

/** Execute a command by id. Returns true if the exec function was called.
 *  No-ops silently if the command is disabled or has no exec function. */
export function execute(id) {
  const cmd = _commands.get(id);
  if (!cmd || !cmd.exec || !cmd.enabled) return false;
  cmd.exec();
  return true;
}

/** Returns a single Command object by id (or undefined). */
export function get(id) { return _commands.get(id); }

/** Returns the full command Map (treat as read-only). */
export function getAll() { return _commands; }

/** Test whether a KeyboardEvent matches a shortcut string.
 *  Shortcut format: 'CmdOrCtrl+Shift+O', 'CmdOrCtrl+[', 'CmdOrCtrl+?', etc.
 *  The final token is the key; leading tokens are modifier names. */
export function matchesShortcut(e, shortcut) {
  if (!shortcut) return false;
  const parts  = shortcut.split('+');
  const rawKey = parts[parts.length - 1];

  const needsCmdCtrl = parts.some(p => p === 'CmdOrCtrl' || p === 'Cmd' || p === 'Ctrl');
  const needsShift   = parts.includes('Shift');
  const needsAlt     = parts.includes('Alt');

  if (needsCmdCtrl !== (e.metaKey || e.ctrlKey)) return false;
  if (needsShift   !== e.shiftKey)               return false;
  if (needsAlt     !== e.altKey)                 return false;

  // e.key for punctuation/symbols is the character itself; for letters it's
  // the shifted character, so 'A' when Shift is held. Compare case-insensitively.
  return e.key === rawKey || e.key.toLowerCase() === rawKey.toLowerCase();
}
