/**
 * settings-schema.js
 *
 * Single source of truth for the URL-builder tool at /settings.
 * Imports DEFAULT_SETTINGS directly from config.js so defaults are always
 * in sync.  THEMES is not imported here because themes.js re-exports a
 * package symbol that requires a bundler; instead, BUILT_IN_THEMES lists
 * the names of the built-in themes and should be updated when themes.js
 * gains or loses a theme entry.
 *
 * Exports:
 *   URL_PARAMS       – UI-visibility flags that become plain ?key=0 params
 *   SETTINGS_SCHEMA  – per-key metadata for the settings= JSON object
 *   BUILT_IN_THEMES  – ordered list of built-in theme names
 *   DEFAULT_SETTINGS – re-exported from config.js for convenience
 */

export { DEFAULT_SETTINGS } from './config.js';

/**
 * Names of the built-in themes (mirrors the keys of THEMES in themes.js).
 * Update this list when a theme is added or removed from themes.js.
 */
export const BUILT_IN_THEMES = ['Monochrome', 'ARTIC', 'BEAST', "O'Toole", 'MCM'];

// ── URL boolean flags (value '0' hides, absent / '1' shows) ──────────────
export const URL_PARAMS = [
  { param: 'palette',     label: 'Settings panel button',  desc: 'Show/hide the ⚙ Settings sidebar toggle' },
  { param: 'toolbar',     label: 'Toolbar',                desc: 'Show/hide the top toolbar' },
  { param: 'import',      label: 'Open / Import buttons',  desc: 'Show/hide Open Tree and Import Annotations buttons' },
  { param: 'export',      label: 'Export buttons',         desc: 'Show/hide Export Tree and Export Graphic buttons' },
  { param: 'rtt',         label: 'Root-to-tip button',     desc: 'Show/hide the RTT scatter-plot panel button (extended=fixed also supported)' },
  { param: 'rttheader',   label: 'RTT panel header',       desc: 'Show/hide the Root-to-tip panel header bar' },
  { param: 'dt',          label: 'Data table button',      desc: 'Show/hide the Data Table panel button' },
  { param: 'dtheader',    label: 'Data table header',      desc: 'Show/hide the Data Table panel header rows' },
  { param: 'statusbar',   label: 'Status bar',             desc: 'Show/hide the bottom status bar' },
  { param: 'sbstats',     label: 'Status: tree stats',     desc: 'Show/hide the status bar tree statistics section' },
  { param: 'sbselect',    label: 'Status: selection count',desc: 'Show/hide the status bar selection count section' },
  { param: 'sbmessage',   label: 'Status: transient message', desc: 'Show/hide the status bar transient message section' },
  { param: 'sbshare',     label: 'Status: share-link button', desc: 'Show/hide the status bar share-link button' },
  { param: 'help',        label: 'Help button',            desc: 'Show/hide the ? Help button' },
  { param: 'about',       label: 'About button',           desc: 'Show/hide the About button' },
  { param: 'themetoggle', label: 'Theme toggle button',    desc: 'Show/hide the light/dark theme toggle button' },
  { param: 'brand',       label: 'PearTree brand logo',    desc: 'Show/hide the PearTree brand name/logo in the toolbar' },
  { param: 'tbfileops',   label: 'Toolbar: File ops',      desc: 'Show/hide Open, Import, Export Tree and Export Graphic buttons' },
  { param: 'tbann',       label: 'Toolbar: Annotations',   desc: 'Show/hide annotation utility buttons (curate/filters/palettes)' },
  { param: 'tbnode',      label: 'Toolbar: Node info',     desc: 'Show/hide Node Info button' },
  { param: 'tbnav',       label: 'Toolbar: Navigation',    desc: 'Show/hide back/forward/drill/climb/home groups' },
  { param: 'tbzoom',      label: 'Toolbar: Zoom',          desc: 'Show/hide zoom and fit groups' },
  { param: 'tborder',     label: 'Toolbar: Order',         desc: 'Show/hide branch ordering group' },
  { param: 'tbrotate',    label: 'Toolbar: Rotate',        desc: 'Show/hide rotate node/subtree group' },
  { param: 'tbreroot',    label: 'Toolbar: Reroot',        desc: 'Show/hide invert-selection and reroot controls' },
  { param: 'tbhide',      label: 'Toolbar: Hide/Show',     desc: 'Show/hide collapse/expand subtree and clade groups' },
  { param: 'tbcolour',    label: 'Toolbar: Colour',        desc: 'Show/hide colour picker and clade highlight controls' },
  { param: 'tbfilter',    label: 'Toolbar: Filter',        desc: 'Show/hide tip filter box' },
  { param: 'tbpanels',    label: 'Toolbar: Panels',        desc: 'Show/hide Data Table and RTT panel buttons' },
  { param: 'keyboard',    label: 'Keyboard shortcuts',     desc: 'Enable/disable keyboard shortcuts' },
];

// ── Settings schema ───────────────────────────────────────────────────────
// Each entry describes one key that can appear in the settings= JSON blob.
// type: 'select' | 'boolean' | 'number' | 'text'
// options: [{value, label}] for select type
// min/max/step: for number type
export const SETTINGS_SCHEMA = [
  // ── Tree layout ────────────────────────────────────────────────────────
  {
    key: 'introAnimation',
    label: 'Intro animation',
    group: 'Tree',
    type: 'select',
    options: [
      { value: 'x-then-y',    label: 'X then Y (default)' },
      { value: 'y-then-x',    label: 'Y then X' },
      { value: 'simultaneous',label: 'Simultaneous' },
      { value: 'from-bottom', label: 'From bottom' },
      { value: 'from-top',    label: 'From top' },
      { value: 'none',        label: 'None' },
    ],
    desc: 'Opening animation style when a tree loads.',
  },
  {
    key: 'rootStemPct',
    label: 'Root stem length (%)',
    group: 'Tree',
    type: 'number',
    min: 0, max: 20, step: 1,
    desc: 'Root stem length as a percentage of the tree age (0–20).',
  },
  {
    key: 'paddingLeft',
    label: 'Padding left (px)',
    group: 'Tree',
    type: 'number',
    min: 0, max: 100, step: 1,
    desc: 'Left padding in pixels.',
  },
  {
    key: 'paddingRight',
    label: 'Padding right (px)',
    group: 'Tree',
    type: 'number',
    min: 0, max: 100, step: 1,
    desc: 'Right padding in pixels.',
  },
  {
    key: 'paddingTop',
    label: 'Padding top (px)',
    group: 'Tree',
    type: 'number',
    min: 0, max: 100, step: 1,
    desc: 'Top padding in pixels.',
  },
  {
    key: 'paddingBottom',
    label: 'Padding bottom (px)',
    group: 'Tree',
    type: 'number',
    min: 0, max: 100, step: 1,
    desc: 'Bottom padding in pixels.',
  },

  // ── Tip labels ─────────────────────────────────────────────────────────
  {
    key: 'tipLabelShow',
    label: 'Tip labels',
    group: 'Tip labels',
    type: 'select',
    options: [
      { value: 'off',   label: 'Off' },
      { value: 'names', label: 'Names (default)' },
    ],
    desc: 'Which annotation to show as tip labels. Use "names" for tip names, "off" to hide, or an annotation key from the tree.',
  },
  {
    key: 'tipLabelAlign',
    label: 'Tip label alignment',
    group: 'Tip labels',
    type: 'select',
    options: [
      { value: 'off',     label: 'At tip (default)' },
      { value: 'aligned', label: 'Aligned (right-aligned, no connector)' },
      { value: 'dots',    label: 'Dots connector' },
      { value: 'dashed',  label: 'Dashed connector' },
      { value: 'solid',   label: 'Solid connector' },
    ],
    desc: 'Alignment style for tip labels.',
  },
  {
    key: 'tipLabelSpacing',
    label: 'Tip label spacing (px)',
    group: 'Tip labels',
    type: 'number',
    min: 0, max: 20, step: 1,
    desc: 'Gap between tip circle and label text.',
  },
  {
    key: 'tipLabelsExtra',
    label: 'Extra tip labels (2–4)',
    group: 'Tip labels',
    type: 'text',
    placeholder: '["off","off","off"]',
    desc: 'Array of three values for labels 2–4: off, names, or annotation key.',
  },
  {
    key: 'tipLabelsExtraLayouts',
    label: 'Extra label layout modes (2–4)',
    group: 'Tip labels',
    type: 'text',
    placeholder: '["append","append","append"]',
    desc: 'Array of three layout modes: append, align, join-space, join-pipe, join-slash, join-underscore, join-dash.',
  },
  {
    key: 'fontSize',
    label: 'Tip label font size (px)',
    group: 'Tip labels',
    type: 'number',
    min: 6, max: 48, step: 1,
    desc: 'Main label font size for tip labels.',
  },

  // ── Node labels ─────────────────────────────────────────────────────────
  {
    key: 'nodeLabelAnnotation',
    label: 'Node label annotation key',
    group: 'Node labels',
    type: 'text',
    placeholder: 'e.g. bootstrap',
    desc: 'Annotation key to display as internal-node labels (e.g. "bootstrap"). Leave blank to hide.',
  },
  {
    key: 'nodeLabelPosition',
    label: 'Node label position',
    group: 'Node labels',
    type: 'select',
    options: [
      { value: 'right',      label: 'Right of node (default)' },
      { value: 'above-left', label: 'Above branch, left of node' },
      { value: 'below-left', label: 'Below branch, left of node' },
    ],
    desc: 'Where to draw internal-node labels relative to the node.',
  },
  {
    key: 'nodeLabelFontSize',
    label: 'Node label font size (px)',
    group: 'Node labels',
    type: 'number',
    min: 6, max: 48, step: 1,
    desc: 'Font size for internal-node labels.',
  },

  // ── Branch labels ───────────────────────────────────────────────────────
  {
    key: 'branchLabelAnnotation',
    label: 'Branch label annotation key',
    group: 'Branch labels',
    type: 'text',
    placeholder: 'e.g. bootstrap',
    desc: 'Annotation key to display at branch midpoints. Leave blank to hide.',
  },
  {
    key: 'branchLabelPosition',
    label: 'Branch label position',
    group: 'Branch labels',
    type: 'select',
    options: [
      { value: 'above', label: 'Above branch (default)' },
      { value: 'below', label: 'Below branch' },
    ],
    desc: 'Whether branch labels appear above or below the branch.',
  },
  {
    key: 'branchLabelFontSize',
    label: 'Branch label font size (px)',
    group: 'Branch labels',
    type: 'number',
    min: 6, max: 48, step: 1,
    desc: 'Font size for branch labels.',
  },

  // ── Shapes ──────────────────────────────────────────────────────────────
  {
    key: 'tipSize',
    label: 'Tip shape size (px)',
    group: 'Shapes',
    type: 'number',
    min: 0, max: 30, step: 1,
    desc: 'Size of tip markers.',
  },
  {
    key: 'nodeSize',
    label: 'Node shape size (px)',
    group: 'Shapes',
    type: 'number',
    min: 0, max: 30, step: 1,
    desc: 'Size of internal node markers.',
  },

  // ── Branch shapes ───────────────────────────────────────────────────────
  {
    key: 'branchShape',
    label: 'Branch shape',
    group: 'Branch shapes',
    type: 'select',
    options: [
      { value: 'off',       label: 'Off (default)' },
      { value: 'rectangle', label: 'Rectangle' },
      { value: 'ellipse',   label: 'Ellipse' },
    ],
    desc: 'Shape type to draw on branches. Shapes can represent metadata values or counts.',
  },
  {
    key: 'branchShapeHeightPct',
    label: 'Branch shape height (%)',
    group: 'Branch shapes',
    type: 'number',
    min: 0, max: 100, step: 1,
    desc: 'Height of shapes as a percentage of the branch length (0–100).',
  },
  {
    key: 'branchShapeWidth',
    label: 'Branch shape width (factor)',
    group: 'Branch shapes',
    type: 'number',
    min: 0.05, max: 5.0, step: 0.1,
    desc: 'Width of shapes as a multiple of their height (0.05–5.0). Midpoint (1.0) gives square shapes.',
  },
  {
    key: 'branchShapeAlign',
    label: 'Branch shape alignment',
    group: 'Branch shapes',
    type: 'select',
    options: [
      { value: 'left',   label: 'Left' },
      { value: 'center', label: 'Center (default)' },
      { value: 'right',  label: 'Right' },
    ],
    desc: 'Horizontal alignment of shapes along the branch.',
  },
  {
    key: 'branchShapeSpacing',
    label: 'Branch shape spacing (px)',
    group: 'Branch shapes',
    type: 'number',
    min: 0, max: 20, step: 1,
    desc: 'Gap between adjacent shapes (pixels).',
  },
  {
    key: 'branchShapeColor',
    label: 'Branch shape color',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. #aaaaaa',
    desc: 'Default fill colour for branch shapes (CSS color string).',
  },
  {
    key: 'branchShapeColorBy',
    label: 'Branch shape colour-by annotation',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. country',
    desc: 'Annotation key to colour shapes by category. Leave blank for default colour.',
  },
  {
    key: 'branchShapeCountBy',
    label: 'Branch shape count-by annotation',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. count',
    desc: 'Integer annotation key to control the number of shapes drawn per branch. Leave blank for one shape per branch.',
  },
  {
    key: 'branchShapeHaloSize',
    label: 'Branch shape halo (px)',
    group: 'Branch shapes',
    type: 'number',
    min: 0, max: 20, step: 1,
    desc: 'Halo (outline) size around shapes in pixels. Use 0 for no halo.',
  },
  {
    key: 'branchShapeHaloColor',
    label: 'Branch shape halo color',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. #ffffff',
    desc: 'Colour for the shape halo (CSS color string).',
  },
  {
    key: 'branchShapeFilter',
    label: 'Branch shape filter',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. my-filter',
    desc: 'Optional filter ID to restrict which branches display shapes. Leave blank to show on all branches.',
  },
  {
    key: 'branchShapesExtra',
    label: 'Extra branch shapes',
    group: 'Branch shapes',
    type: 'text',
    desc: 'Internal array for extra shape rows 2–4 (typically edited via UI).',
  },
  {
    key: 'branchShape2Color',
    label: 'Branch shape 2 color',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. #aaaaaa',
    desc: 'Fill colour for the second branch shape row.',
  },
  {
    key: 'branchShape3Color',
    label: 'Branch shape 3 color',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. #aaaaaa',
    desc: 'Fill colour for the third branch shape row.',
  },
  {
    key: 'branchShape4Color',
    label: 'Branch shape 4 color',
    group: 'Branch shapes',
    type: 'text',
    placeholder: 'e.g. #aaaaaa',
    desc: 'Fill colour for the fourth branch shape row.',
  },

  // ── Axis ────────────────────────────────────────────────────────────────
  {
    key: 'axisShow',
    label: 'Axis',
    group: 'Axis',
    type: 'select',
    options: [
      { value: 'off',     label: 'Off' },
      { value: 'forward', label: 'Forward / divergence (default)' },
      { value: 'reverse', label: 'Reverse (from tips)' },
      { value: 'time',    label: 'Time (requires date annotation)' },
    ],
    desc: 'Axis display mode.',
  },
  {
    key: 'axisDateAnnotation',
    label: 'Axis date annotation key',
    group: 'Axis',
    type: 'text',
    placeholder: 'e.g. date',
    desc: 'Annotation key for calendar dates used when axisShow = "time".',
  },

  // ── Node bars ───────────────────────────────────────────────────────────
  {
    key: 'nodeBarsEnabled',
    label: 'Node bars (HPD)',
    group: 'Node bars',
    type: 'select',
    options: [
      { value: 'off', label: 'Off (default)' },
      { value: 'on',  label: 'On' },
    ],
    desc: 'Show BEAST HPD node bars (requires a BEAST tree with height annotations).',
  },

  // ── Theme ────────────────────────────────────────────────────────────────
  {
    key: 'selectedTheme',
    label: 'Theme',
    group: 'Theme',
    type: 'select',
    // Derived from BUILT_IN_THEMES (exported above) at schema build time
    get options() {
      // Lazily built so that the BUILT_IN_THEMES export remains the one source
      return BUILT_IN_THEMES.map(name => ({ value: name, label: name }));
    },
    desc: 'Visual colour theme.',
  },

  // ── Panels ──────────────────────────────────────────────────────────────
  {
    key: 'dataTableOpen',
    label: 'Data table open at startup',
    group: 'Panels',
    type: 'boolean',
    desc: 'Open the Data Table panel automatically on load.',
  },
  {
    key: 'dataTablePinned',
    label: 'Data table pinned (docked)',
    group: 'Panels',
    type: 'boolean',
    desc: 'Pin (dock) the Data Table panel so it takes up permanent screen space.',
  },
  {
    key: 'rttOpen',
    label: 'Root-to-tip open at startup',
    group: 'Panels',
    type: 'boolean',
    desc: 'Open the Root-to-Tip panel automatically on load.',
  },
  {
    key: 'rttPinned',
    label: 'Root-to-tip pinned (docked)',
    group: 'Panels',
    type: 'boolean',
    desc: 'Pin (dock) the RTT panel so it takes up permanent screen space.',
  },
  {
    key: 'paletteOpen',
    label: 'Settings panel open at startup',
    group: 'Panels',
    type: 'boolean',
    desc: 'Open the Settings sidebar automatically on load.',
  },
];
