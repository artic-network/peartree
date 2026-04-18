/**
 * commands.js — Per-instance command registry factory.
 *
 * Each call to createCommands(root, defs) returns a fresh registry scoped to
 * one app instance.  This allows multiple instances on the same page to have
 * independent enabled states, exec functions, and button DOM references.
 *
 * The command definitions array is supplied by the app — pearcore provides
 * only the registry mechanism.
 *
 * Usage:
 *   import { createCommands } from './commands.js';
 *   import { COMMAND_DEFS } from './my-app-commands.js';
 *
 *   const commands = createCommands(root, COMMAND_DEFS);
 *   commands.get('view-back').exec = () => renderer.navigateBack();
 *   commands.setEnabled('view-back', canBack);
 *   commands.execute('view-back');
 *
 * Platform adapters (e.g. Tauri) subscribe via onStateChange to keep
 * the native menu in sync without the app knowing Tauri exists.
 */

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a per-instance command registry scoped to the given root element.
 * Button enabled/disabled state is synced via root.querySelector, so each
 * instance only touches its own toolbar buttons.
 *
 * @param  {Element} root – the instance's root container element
 * @param  {Array}   defs – command definition objects, each with at least
 *                          { id, label } and optionally shortcut, group,
 *                          enabled, buttonId.
 * @returns {{ setEnabled, setLabel, onStateChange, execute, get, getAll, matchesShortcut }}
 */
export function createCommands(root, defs = []) {
  const _commands  = new Map();
  const _listeners = [];

  // Populate the registry from the supplied definitions.
  for (const def of defs) {
    _commands.set(def.id, {
      id:       def.id,
      label:    def.label,
      shortcut: def.shortcut  ?? null,
      group:    def.group     ?? 'misc',
      enabled:  def.enabled   ?? true,
      buttonId: def.buttonId  ?? null,
      exec:     null,   // set at runtime by peartree.js
    });
  }

  /** Enable or disable a command.  Syncs the linked button in this instance's
   *  root and notifies registered state-change listeners. */
  function setEnabled(id, enabled) {
    const cmd = _commands.get(id);
    if (!cmd || cmd.enabled === enabled) return;
    cmd.enabled = enabled;
    if (cmd.buttonId) {
      const el = root.querySelector('#' + cmd.buttonId);
      if (el) el.disabled = !enabled;
    }
    for (const fn of _listeners) fn(id, enabled);
  }

  /** Update the text label of a command and notify listeners with the new label
   *  as a third argument so platform adapters (e.g. Tauri) can sync native menus. */
  function setLabel(id, label) {
    const cmd = _commands.get(id);
    if (!cmd || cmd.label === label) return;
    cmd.label = label;
    for (const fn of _listeners) fn(id, cmd.enabled, label);
  }

  /** Subscribe to command state changes.  (id, enabled) => void.
   *  Pass callNow:true to receive the current state immediately. */
  function onStateChange(fn, { callNow = false } = {}) {
    _listeners.push(fn);
    if (callNow) {
      for (const cmd of _commands.values()) fn(cmd.id, cmd.enabled);
    }
  }

  /** Execute a command.  No-ops if disabled or exec is null. */
  function execute(id) {
    const cmd = _commands.get(id);
    if (!cmd || !cmd.exec || !cmd.enabled) return false;
    cmd.exec();
    return true;
  }

  function get(id)  { return _commands.get(id); }
  function getAll() { return _commands; }

  return { setEnabled, setLabel, onStateChange, execute, get, getAll, matchesShortcut };
}

// ── Pure utility (no instance state) ──────────────────────────────────────

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

  return e.key === rawKey || e.key.toLowerCase() === rawKey.toLowerCase();
}
