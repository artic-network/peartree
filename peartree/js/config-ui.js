/**
 * Default UI flag values for each PearTree entry point.
 *
 * Keys match the `uiKey` names in PT_UI_FLAG_DEFS (peartree.js) and the
 * `ui:` block of a configUrl JSON or window.peartreeConfig object.
 *
 * All values are boolean by default.  Flags marked «extended» also accept
 * the string value 'fixed' to render the corresponding panel permanently open
 * with its toggle button hidden.
 *
 * Override priority (highest to lowest):
 *   1. options.ui  passed directly to embed() / embedFrame() / app()
 *   2. window.peartreeConfig.ui  (same-page embed or inline <script>)
 *   3. configUrl JSON  { ui: { … } }  (URL param configUrl=)
 *   4. URL search params  (palette=0, toolbar=0, rtt=0, …)
 *   5. These defaults
 */

// ── App mode ─────────────────────────────────────────────────────────────────
// peartree.html standalone webapp — every feature visible.

export const DEFAULT_UI_APP = {
  // Panels
  palette:         true,
  toolbar:         true,

  // File operations
  import:          true,   // also aliased as openTree
  openTree:        true,   // alias; kept in sync with import
  export:          true,

  // Slide-out panels (extended: also accept 'fixed')
  rtt:             true,   // Root-to-tip panel
  rttHeader:       true,
  dataTable:       true,   // Data table panel
  dataTableHeader: true,

  // Status bar
  statusBar:       true,
  statusStats:     true,
  statusSelect:    true,
  statusMessage:   true,
  statusShare:     true,

  // App chrome
  help:            true,
  about:           true,
  themeToggle:     true,
  brand:           true,

  // Container CSS (applied to <html>; null = not set)
  // Useful for iframe embeds — everything targets the document root element.
  borderWidth:     null,   // px, e.g. '1.5'
  borderColor:     null,   // CSS colour, e.g. '#F1F0E7'
  borderRadius:    null,   // px — also sets overflow:hidden on <html> to clip content
  backgroundColor: null,   // CSS colour, e.g. '#ffffff'
  paddingTop:      null,   // px — inset between border and tree content
  paddingRight:    null,   // px
  paddingBottom:   null,   // px
  paddingLeft:     null,   // px

  // Canvas area padding (px) — CSS padding on #canvas-and-axis-wrapper; spaces the tree
  // and axis canvases away from the container edges without any internal renderer margin.
  treePaddingTop:    '20',
  treePaddingRight:  '20',
  treePaddingBottom: '20',
  treePaddingLeft:   '20',

  // Toolbar sub-sections
  tbFileOps:       true,
  tbAnnotations:   true,
  tbNodeInfo:      true,
  tbNavigation:    true,
  tbZoom:          true,
  tbOrder:         true,
  tbRotate:        true,
  tbReroot:        true,
  tbHideShow:      true,
  tbColour:        true,
  tbFilter:        true,
  tbPanels:        true,

  // Keyboard shortcuts
  keyboard:        true,
};

// ── embed() ───────────────────────────────────────────────────────────────────
// Same-page embed with compact chrome.
//
// Panels that require an explicit user action to open (rtt, dataTable) start
// hidden.  App-specific chrome (import/export tree, keyboard shortcuts, help,
// about, themeToggle, brand) is hidden because the host page normally provides
// its own navigation and branding.

export const DEFAULT_UI_EMBED = {
  ...DEFAULT_UI_APP,
  import:      false,
  openTree:    false,
  rtt:         false,
  dataTable:   false,
  keyboard:    false,
  help:        false,
  about:       false,
  themeToggle: false,
  brand:       false,
};

// ── embedFrame() ──────────────────────────────────────────────────────────────
// iframe embed.
//
// The iframe hosts a full standalone app instance, so full chrome (help,
// about, themeToggle, brand) is shown.  Import and expandable panels start
// hidden for a clean initial view; re-enable via options.ui.

export const DEFAULT_UI_EMBEDFRAME = {
  ...DEFAULT_UI_APP,
  import:    false,
  openTree:  false,
  rtt:       false,
  dataTable: false,
};
