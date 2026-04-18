// sealion/js/sealion-commands.js — Command definitions for Sealion.
//
// Supplies the COMMAND_DEFS array to pearcore's createCommands() factory.
// Each entry describes a user-visible command with optional keyboard shortcut
// and toolbar button binding.

export const COMMAND_DEFS = [
  // ── File ────────────────────────────────────────────────────────────────
  { id: 'new-window',       label: 'New Window',                  shortcut: 'CmdOrCtrl+N',       group: 'file',      enabled: true  },
  { id: 'open-alignment',   label: 'Open Alignment\u2026',        shortcut: 'CmdOrCtrl+O',       group: 'file',      enabled: true,  buttonId: 'open-file-btn'      },
  { id: 'load-reference',   label: 'Load Reference Genome\u2026', shortcut: 'CmdOrCtrl+R',       group: 'file',      enabled: true,  buttonId: 'load-reference-btn' },
  { id: 'export-alignment', label: 'Export Alignment\u2026',      shortcut: 'CmdOrCtrl+E',       group: 'file',      enabled: false, buttonId: 'export-btn'         },

  // ── Alignment ───────────────────────────────────────────────────────────
  { id: 'find',      label: 'Find\u2026',          shortcut: 'CmdOrCtrl+F',       group: 'alignment', enabled: true  },
  { id: 'find-next', label: 'Find Next',            shortcut: 'CmdOrCtrl+G',       group: 'alignment', enabled: true  },
  { id: 'find-prev', label: 'Find Previous',        shortcut: 'Shift+CmdOrCtrl+G', group: 'alignment', enabled: true  },
  { id: 'next-diff', label: 'Next Difference',      shortcut: 'CmdOrCtrl+.',       group: 'alignment', enabled: false, buttonId: 'diff-next-btn' },
  { id: 'prev-diff', label: 'Previous Difference',  shortcut: 'CmdOrCtrl+,',       group: 'alignment', enabled: false, buttonId: 'diff-prev-btn' },

  // ── View ────────────────────────────────────────────────────────────────
  { id: 'zoom-in',    label: 'Zoom In',    shortcut: 'CmdOrCtrl+=', group: 'view', enabled: true, buttonId: 'font-increase-btn' },
  { id: 'zoom-out',   label: 'Zoom Out',   shortcut: 'CmdOrCtrl+-', group: 'view', enabled: true, buttonId: 'font-decrease-btn' },
  { id: 'reset-zoom', label: 'Reset Zoom', shortcut: 'CmdOrCtrl+0', group: 'view', enabled: true },

  // ── Help ────────────────────────────────────────────────────────────────
  { id: 'show-help', label: 'Sealion Help', shortcut: null, group: 'help', enabled: true },
];
