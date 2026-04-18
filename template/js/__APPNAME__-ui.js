// __APPNAME__-ui.js — App UI builder (classic script).
//
// Builds HTML strings using pearcore-ui.js global helpers, then
// auto-injects into the DOM.  Must be loaded after pearcore-ui.js.
//
// TODO: Customise the palette panel, toolbar buttons, modals, and
// status bar for your application.

// ── Palette panel ─────────────────────────────────────────────────────────

function buildAppPalettePanel() {
  return `
<div id="palette-panel">
  <div id="palette-panel-header">
    <h2><i class="bi bi-sliders me-1"></i>Settings</h2>
    <div class="palette-pin-btns">
      <button id="btn-palette-pin" title="Pin panel open"><i class="bi bi-pin-angle"></i></button>
      <button id="btn-palette-close" title="Close">&times;</button>
    </div>
  </div>
  <div id="palette-panel-body">

    <div class="pt-palette-section">
      <h3><i class="bi bi-gear"></i> Display</h3>
      <div class="pt-palette-row" title="Canvas background colour">
        <span class="pt-palette-label">Background <i class="bi bi-palette form-label-sm"></i></span>
        <input type="color" class="pt-palette-color" id="canvas-bg-color" value="#02292e" />
      </div>
      <!-- TODO: add your palette controls here -->
    </div>

  </div>
</div>`;
}

// ── Toolbar ───────────────────────────────────────────────────────────────

function _buildAppToolbar() {
  return buildToolbarShellHTML({
    leftHTML: `
      <button id="btn-palette" class="btn btn-sm btn-outline-secondary" title="Settings panel (Tab)">
        <i class="bi bi-sliders"></i><i class="bi bi-caret-right"></i>
      </button>
      <div class="pt-toolbar-sep"></div>
      <button id="btn-open" class="btn btn-sm btn-outline-secondary" title="Open file">
        <i class="bi bi-folder2-open"></i>
      </button>`,
    centerHTML: `
      <span id="toolbar-title" class="text-muted" style="font-size:0.85rem"></span>`,
    rightHTML: `
      <button id="btn-export" class="btn btn-sm btn-outline-warning" title="Export image" disabled>
        <i class="bi bi-image"></i>
      </button>`,
  });
}

// ── Canvas container ──────────────────────────────────────────────────────

function _buildAppCanvas() {
  return `
<div id="canvas-container">
  <div id="canvas-wrapper">
    <div id="empty-state">
      <div style="text-align:center">
        <i class="bi bi-file-earmark" style="font-size:3rem;opacity:0.4"></i>
        <p class="pt-empty-title">No data loaded</p>
        <p class="pt-empty-hint">Drag a file here or click Open</p>
        <button class="btn btn-sm btn-outline-primary" id="empty-state-open-btn">
          <i class="bi bi-folder2-open me-1"></i>Open…
        </button>
      </div>
    </div>
    <canvas id="app-canvas"></canvas>
  </div>
</div>`;
}

// ── Open file modal ───────────────────────────────────────────────────────

function _buildAppModals() {
  return buildModalHTML({
    overlayId: 'open-file-overlay',
    title: 'Open File',
    icon: 'folder2-open',
    closeId: 'btn-modal-close',
    bodyId: 'open-file-body',
    body: `
      <div id="file-drop-zone" class="pt-drop-zone">
        <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
        <p>Drag and drop a file here</p>
        <input type="file" id="file-input"
               style="position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none">
        <button class="btn btn-sm btn-outline-primary" id="btn-file-choose">
          <i class="bi bi-folder2-open me-1"></i>Choose File
        </button>
      </div>
      <div class="pt-modal-loading" id="modal-loading" style="display:none">
        <div class="pt-spinner"></div>Loading…
      </div>
      <div class="pt-modal-error" id="modal-error" style="display:none"></div>`,
  }) + '\n' + buildStandardDialogsHTML() + '\n' +
  buildModalHTML({
    overlayId: 'export-graphic-overlay',
    title: 'Export Graphic',
    icon: 'image',
    closeId: 'export-graphic-close',
    bodyId: 'export-graphic-body',
    footerId: 'export-graphic-footer',
  });
}

// ── Help / About ──────────────────────────────────────────────────────────

function _buildAppHelpAbout() {
  return buildHelpAboutHTML({
    helpTitle: '__APPNAME__ Help',
    aboutTitle: 'About __APPNAME__',
    aboutLogo: '<i class="bi bi-app me-2"></i>',
  });
}

// ── Status bar ────────────────────────────────────────────────────────────

function _buildAppStatusBar() {
  return buildStatusBarHTML({
    brandHTML: `<span id="status-brand" style="opacity:0.6">
      <i class="bi bi-app me-1"></i>__APPNAME__</span>`,
  });
}

// ── Full HTML assembly ────────────────────────────────────────────────────

function buildAppHTML() {
  return [
    _buildAppToolbar(),
    buildAppPalettePanel(),
    _buildAppCanvas(),
    _buildAppStatusBar(),
    _buildAppModals(),
    _buildAppHelpAbout(),
  ].join('\n');
}

// Auto-inject into <div id="app-html-host">
(function () {
  const host = document.getElementById('app-html-host');
  if (host) host.outerHTML = buildAppHTML();
})();
