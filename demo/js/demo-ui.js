// demo-ui.js — Demo app UI builder (classic script).
//
// Follows the same pattern as peartree-ui.js: builds HTML strings using
// pearcore-ui.js global helpers, then auto-injects into the DOM.
// Must be loaded after pearcore-ui.js.

// ── Palette panel ─────────────────────────────────────────────────────────

function buildDemoPalettePanel() {
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
      <h3><i class="bi bi-bar-chart"></i> Chart</h3>
      <div class="pt-palette-row" title="Canvas background colour">
        <span class="pt-palette-label">Background <i class="bi bi-palette form-label-sm"></i></span>
        <input type="color" class="pt-palette-color" id="canvas-bg-color" value="#02292e" />
      </div>
      <div class="pt-palette-row" title="Bar fill colour">
        <span class="pt-palette-label">Bar colour <i class="bi bi-palette form-label-sm"></i></span>
        <input type="color" class="pt-palette-color" id="bar-color" value="#4fc3f7" />
      </div>
      <div class="pt-palette-row" title="Bar outline colour">
        <span class="pt-palette-label">Outline <i class="bi bi-palette form-label-sm"></i></span>
        <input type="color" class="pt-palette-color" id="bar-outline-color" value="#0288d1" />
      </div>
      <div class="pt-palette-row" title="Gap between bars as percentage">
        <span class="pt-palette-label">Gap <i class="bi bi-arrows form-label-sm"></i></span>
        <input type="range" class="form-range" id="bar-gap-slider" min="0" max="80" step="5" value="20" />
        <span class="pt-val" id="bar-gap-value">20%</span>
      </div>
      <div class="pt-palette-row" title="Bar corner radius">
        <span class="pt-palette-label">Radius <i class="bi bi-radar form-label-sm"></i></span>
        <input type="range" class="form-range" id="bar-radius-slider" min="0" max="12" step="1" value="3" />
        <span class="pt-val" id="bar-radius-value">3</span>
      </div>
    </div>

    <div class="pt-palette-section">
      <h3><i class="bi bi-tag"></i> Labels</h3>
      <div class="pt-palette-row" title="Show category labels below bars">
        <span class="pt-palette-label">Show labels</span>
        <select class="pt-palette-select" id="show-labels">
          <option value="on" selected>On</option>
          <option value="off">Off</option>
        </select>
      </div>
      <div class="pt-palette-row" title="Show values above bars">
        <span class="pt-palette-label">Show values</span>
        <select class="pt-palette-select" id="show-values">
          <option value="on" selected>On</option>
          <option value="off">Off</option>
        </select>
      </div>
      <div class="pt-palette-row" title="Label font size">
        <span class="pt-palette-label">Size <i class="bi bi-fonts form-label-sm"></i></span>
        <input type="range" class="form-range" id="label-size-slider" min="6" max="24" value="11" />
        <span class="pt-val" id="label-size-value">11</span>
      </div>
      <div class="pt-palette-row" title="Label text colour">
        <span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span>
        <input type="color" class="pt-palette-color" id="label-color" value="#f7eeca" />
      </div>
    </div>

    <div class="pt-palette-section">
      <h3><i class="bi bi-rulers"></i> Axis</h3>
      <div class="pt-palette-row" title="Show value axis">
        <span class="pt-palette-label">Show axis</span>
        <select class="pt-palette-select" id="show-axis">
          <option value="on" selected>On</option>
          <option value="off">Off</option>
        </select>
      </div>
      <div class="pt-palette-row" title="Axis line colour">
        <span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span>
        <input type="color" class="pt-palette-color" id="axis-color" value="#546e7a" />
      </div>
      <div class="pt-palette-row" title="Number of grid lines">
        <span class="pt-palette-label">Grid lines</span>
        <input type="range" class="form-range" id="grid-lines-slider" min="0" max="10" step="1" value="5" />
        <span class="pt-val" id="grid-lines-value">5</span>
      </div>
    </div>

  </div>
</div>`;
}

// ── Toolbar ───────────────────────────────────────────────────────────────

function _buildDemoToolbar() {
  return buildToolbarShellHTML({
    leftHTML: `
      <button id="btn-palette" class="btn btn-sm btn-outline-secondary" title="Settings panel (Tab)">
        <i class="bi bi-sliders"></i><i class="bi bi-caret-right"></i>
      </button>
      <div class="pt-toolbar-sep"></div>
      <button id="btn-open" class="btn btn-sm btn-outline-secondary" title="Open CSV file">
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

function _buildDemoCanvas() {
  return `
<div id="canvas-container">
  <div id="canvas-wrapper">
    <div id="empty-state">
      <div style="text-align:center">
        <i class="bi bi-bar-chart" style="font-size:3rem;opacity:0.4"></i>
        <p class="pt-empty-title">No data loaded</p>
        <p class="pt-empty-hint">Drag a CSV file here or click Open</p>
        <button class="btn btn-sm btn-outline-primary" id="empty-state-open-btn">
          <i class="bi bi-folder2-open me-1"></i>Open…
        </button>
      </div>
    </div>
    <canvas id="chart-canvas"></canvas>
    <div id="tooltip"></div>
  </div>
</div>`;
}

// ── Open file modal ───────────────────────────────────────────────────────

function _buildDemoModals() {
  return buildModalHTML({
    overlayId: 'open-file-overlay',
    title: 'Open CSV File',
    icon: 'folder2-open',
    closeId: 'btn-modal-close',
    bodyId: 'open-file-body',
    body: `
      <div id="csv-drop-zone" class="pt-drop-zone">
        <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
        <p>Drag and drop a CSV file here</p>
        <p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">
          CSV with a header row — first column = labels, subsequent columns = values
        </p>
        <input type="file" id="csv-file-input" accept=".csv,.tsv,.txt"
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

function _buildDemoHelpAbout() {
  return buildHelpAboutHTML({
    helpTitle: 'Demo App Help',
    aboutTitle: 'About Demo App',
    aboutLogo: '<i class="bi bi-bar-chart me-2"></i>',
  });
}

// ── Status bar ────────────────────────────────────────────────────────────

function _buildDemoStatusBar() {
  return buildStatusBarHTML({
    brandHTML: `<span id="status-brand" style="opacity:0.6">
      <i class="bi bi-bar-chart me-1"></i>Pearcore Demo</span>`,
  });
}

// ── Full HTML assembly ────────────────────────────────────────────────────

function buildDemoAppHTML() {
  return [
    _buildDemoToolbar(),
    buildDemoPalettePanel(),
    _buildDemoCanvas(),
    _buildDemoStatusBar(),
    _buildDemoModals(),
    _buildDemoHelpAbout(),
  ].join('\n');
}

// Auto-inject into <div id="app-html-host">
(function () {
  const host = document.getElementById('app-html-host');
  if (host) host.outerHTML = buildDemoAppHTML();
})();
