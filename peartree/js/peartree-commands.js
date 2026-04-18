// peartree-commands.js — PearTree command definitions
// ─────────────────────────────────────────────────────────────────────────────
// Passed to createCommands() from pearcore to populate the command registry.
// Each entry describes one command; exec is set at runtime by peartree.js.

export const COMMAND_DEFS = [
  // File
  { id: 'new-window',   label: 'New Window',             shortcut: 'CmdOrCtrl+N',             group: 'file', enabled: true  },
  { id: 'open-file',    label: 'Open…',                 shortcut: 'CmdOrCtrl+O',             group: 'file', enabled: true  },
  { id: 'open-tree',    label: 'Open Tree…',             shortcut: 'CmdOrCtrl+Shift+O',       group: 'file', enabled: true,  buttonId: 'btn-open-tree'      },
  { id: 'import-annot', label: 'Import Annotations…',    shortcut: 'CmdOrCtrl+Shift+A',       group: 'file', enabled: false, buttonId: 'btn-import-annot'   },
  { id: 'curate-annot', label: 'Curate Annotations…',    shortcut: null,                      group: 'file', enabled: false, buttonId: 'btn-curate-annot'   },
  { id: 'export-tree',  label: 'Export Tree…',            shortcut: 'CmdOrCtrl+E',             group: 'file', enabled: false, buttonId: 'btn-export-tree'    },
  { id: 'export-image',  label: 'Export Image…',           shortcut: 'CmdOrCtrl+Shift+E',       group: 'file', enabled: false, buttonId: 'btn-export-graphic' },
  { id: 'print-graphic', label: 'Print…',                  shortcut: 'CmdOrCtrl+P',             group: 'file', enabled: false },

  // Edit
  { id: 'paste-tree',    label: 'Paste Tree',           shortcut: 'CmdOrCtrl+V',             group: 'edit', enabled: true  },
  { id: 'copy-tree',     label: 'Copy Tree',            shortcut: 'CmdOrCtrl+C',             group: 'edit', enabled: false },
  { id: 'copy-tips',     label: 'Copy Tips',            shortcut: 'CmdOrCtrl+Shift+C',       group: 'edit', enabled: false },
  { id: 'select-all',    label: 'Select All',           shortcut: 'CmdOrCtrl+A',             group: 'edit', enabled: true  },
  { id: 'select-invert', label: 'Invert Selection',     shortcut: 'CmdOrCtrl+Shift+I',       group: 'edit', enabled: true  },

  // View
  { id: 'view-back',          label: 'Back',               shortcut: 'CmdOrCtrl+[',             group: 'view', enabled: false, buttonId: 'btn-back'                  },
  { id: 'view-forward',       label: 'Forward',            shortcut: 'CmdOrCtrl+]',             group: 'view', enabled: false, buttonId: 'btn-forward'               },
  { id: 'view-drill',         label: 'Drill into Subtree', shortcut: 'CmdOrCtrl+Shift+.',       group: 'view', enabled: false, buttonId: 'btn-drill'                 },
  { id: 'view-climb',         label: 'Climb Out One Level',shortcut: 'CmdOrCtrl+Shift+,',       group: 'view', enabled: false, buttonId: 'btn-climb'                 },
  { id: 'view-home',          label: 'Root',               shortcut: 'CmdOrCtrl+\\',            group: 'view', enabled: false, buttonId: 'btn-home'                  },
  { id: 'view-zoom-in',       label: 'Zoom In',            shortcut: 'CmdOrCtrl+=',             group: 'view', enabled: false, buttonId: 'btn-zoom-in'               },
  { id: 'view-zoom-out',      label: 'Zoom Out',           shortcut: 'CmdOrCtrl+-',             group: 'view', enabled: false, buttonId: 'btn-zoom-out'              },
  { id: 'view-fit',           label: 'Fit All',            shortcut: 'CmdOrCtrl+0',             group: 'view', enabled: false, buttonId: 'btn-fit'                   },
  { id: 'view-fit-labels',    label: 'Fit Labels',         shortcut: 'CmdOrCtrl+Shift+0',       group: 'view', enabled: false, buttonId: 'btn-fit-labels'            },
  { id: 'view-hyp-up',        label: 'Widen Lens',         shortcut: 'CmdOrCtrl+Shift+=',       group: 'view', enabled: false, buttonId: 'btn-hyp-up'                },
  { id: 'view-hyp-down',      label: 'Narrow Lens',        shortcut: 'CmdOrCtrl+Shift+-',       group: 'view', enabled: false, buttonId: 'btn-hyp-down'              },
  { id: 'view-scroll-top',    label: 'Scroll to Top',      shortcut: 'CmdOrCtrl+Shift+ArrowUp', group: 'view', enabled: false },
  { id: 'view-scroll-bottom', label: 'Scroll to Bottom',   shortcut: 'CmdOrCtrl+Shift+ArrowDown', group: 'view', enabled: false },
  { id: 'view-info',          label: 'Get Info…',          shortcut: 'CmdOrCtrl+I',             group: 'view', enabled: false, buttonId: 'btn-node-info'             },

  // Tree
  { id: 'tree-rotate',               label: 'Rotate Node',              shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-rotate'               },
  { id: 'tree-rotate-all',           label: 'Rotate Clade',             shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-rotate-all'           },
  { id: 'tree-order-up',             label: 'Order Up',                 shortcut: 'CmdOrCtrl+U',       group: 'tree', enabled: false, buttonId: 'btn-order-asc'            },
  { id: 'tree-order-down',           label: 'Order Down',               shortcut: 'CmdOrCtrl+D',       group: 'tree', enabled: false, buttonId: 'btn-order-desc'           },
  { id: 'tree-reroot',               label: 'Re-root Tree',             shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-reroot'               },
  { id: 'tree-midpoint',             label: 'Midpoint Root',            shortcut: 'CmdOrCtrl+M',       group: 'tree', enabled: false, buttonId: 'btn-midpoint-root'        },
  { id: 'tree-temporal-root',        label: 'Optimise Root on Branch',  shortcut: 'CmdOrCtrl+Shift+R', group: 'tree', enabled: false, buttonId: 'btn-temporal-root'        },
  { id: 'tree-temporal-root-global', label: 'Global Temporal Root',     shortcut: 'CmdOrCtrl+R',       group: 'tree', enabled: false, buttonId: 'btn-temporal-root-global' },
  { id: 'tree-hide',                 label: 'Hide Nodes',               shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-hide'                 },
  { id: 'tree-show',                 label: 'Show Nodes',               shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-show'                 },
  { id: 'tree-collapse-clade',       label: 'Collapse Clade',           shortcut: '⌘L',                group: 'tree', enabled: false, buttonId: 'btn-collapse-clade'       },
  { id: 'tree-expand-clade',         label: 'Expand Clade',             shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-expand-clade'         },
  { id: 'tree-paint',                label: 'Paint Node',               shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-apply-user-colour'    },
  { id: 'tree-clear-colours',        label: 'Clear Colours',            shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-clear-user-colour'    },
  { id: 'tree-highlight-clade',      label: 'Highlight Clade',          shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-highlight-clade'      },
  { id: 'tree-clear-highlights',     label: 'Remove Highlight',         shortcut: null,                group: 'tree', enabled: false, buttonId: 'btn-clear-highlights'     },

  // Help
  { id: 'show-help',         label: 'PearTree Help',      shortcut: 'CmdOrCtrl+?', group: 'help', enabled: true, buttonId: 'btn-help' },
  { id: 'check-for-updates', label: 'Check for Updates…', shortcut: null,          group: 'help', enabled: true },

  // Panel toggles (label flips between Show/Hide at runtime)
  { id: 'view-options-panel', label: 'Show Options Panel', shortcut: null, group: 'view', enabled: true },
  { id: 'view-rtt-plot',      label: 'Show RTT Plot',      shortcut: null, group: 'view', enabled: true },
  { id: 'view-data-table',    label: 'Show Data Table',    shortcut: null, group: 'view', enabled: true },
];
