import { parseNexus, parseNewick } from './treeio.js';
import { computeLayoutFromGraph } from './treeutils.js';
import { fromNestedRoot, rerootOnGraph, reorderGraph, rotateNodeGraph, midpointRootGraph, buildAnnotationSchema } from './phylograph.js';
import { TreeRenderer } from './treerenderer.js';
import { AxisRenderer  } from './axisrenderer.js';

(async () => {
  const canvas            = document.getElementById('tree-canvas');
  const loadingEl         = document.getElementById('loading');
  const canvasBgColorEl   = document.getElementById('canvas-bg-color');
  const branchColorEl     = document.getElementById('branch-color');
  const branchWidthSlider = document.getElementById('branch-width-slider');
  const fontSlider        = document.getElementById('font-size-slider');
  const tipSlider         = document.getElementById('tip-size-slider');
  const nodeSlider        = document.getElementById('node-size-slider');
  const tipShapeColorEl   = document.getElementById('tip-shape-color');
  const tipShapeBgEl      = document.getElementById('tip-shape-bg-color');
  const labelColorEl      = document.getElementById('label-color');
  const nodeShapeColorEl  = document.getElementById('node-shape-color');
  const nodeShapeBgEl     = document.getElementById('node-shape-bg-color');
  const tipColourBy       = document.getElementById('tip-colour-by');
  const nodeColourBy      = document.getElementById('node-colour-by');
  const legendShowEl      = document.getElementById('legend-show');
  const legendAnnotEl     = document.getElementById('legend-annotation');
  const legendLeftCanvas  = document.getElementById('legend-left-canvas');
  const legendRightCanvas = document.getElementById('legend-right-canvas');
  const axisCanvas             = document.getElementById('axis-canvas');
  const axisShowEl             = document.getElementById('axis-show');
  const axisDateAnnotEl        = document.getElementById('axis-date-annotation');
  const axisDateRow            = document.getElementById('axis-date-row');
  const axisMajorIntervalEl    = document.getElementById('axis-major-interval');
  const axisMinorIntervalEl    = document.getElementById('axis-minor-interval');
  const axisMajorLabelEl       = document.getElementById('axis-major-label');
  const axisMinorLabelEl       = document.getElementById('axis-minor-label');
  const axisMajorIntervalRow   = document.getElementById('axis-major-interval-row');
  const axisMinorIntervalRow   = document.getElementById('axis-minor-interval-row');
  const axisMajorLabelRow      = document.getElementById('axis-major-label-row');
  const axisMinorLabelRow      = document.getElementById('axis-minor-label-row');
  const btnFit                 = document.getElementById('btn-fit');
  const btnResetSettings       = document.getElementById('btn-reset-settings');
  const btnImportAnnot         = document.getElementById('btn-import-annot');
  const btnExportTree          = document.getElementById('btn-export-tree');

  // ── Settings persistence ──────────────────────────────────────────────────

  const SETTINGS_KEY = 'peartree-settings';

  const DEFAULTS = {
    canvasBgColor:    '#02292e',
    branchColor:      '#f2f1e6',
    branchWidth:      '1',
    fontSize:         '11',
    labelColor:       '#f7eeca',
    tipSize:          '3',
    tipShapeColor:    '#888888',
    tipShapeBgColor:  '#02292e',
    nodeSize:         '0',
    nodeShapeColor:   '#888888',
    nodeShapeBgColor: '#02292e',
    legendShow:         'off',
    axisShow:           'off',
    axisDateAnnotation: '',
    axisMajorInterval:    'auto',
    axisMinorInterval:    'off',
    axisMajorLabelFormat: 'auto',
    axisMinorLabelFormat: 'off',
  };

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      canvasBgColor:    canvasBgColorEl.value,
      branchColor:      branchColorEl.value,
      branchWidth:      branchWidthSlider.value,
      fontSize:         fontSlider.value,
      labelColor:       labelColorEl.value,
      tipSize:          tipSlider.value,
      tipShapeColor:    tipShapeColorEl.value,
      tipShapeBgColor:  tipShapeBgEl.value,
      nodeSize:         nodeSlider.value,
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      tipColourBy:      tipColourBy.value,
      nodeColourBy:     nodeColourBy.value,
      legendShow:       legendShowEl.value,
      legendAnnotation: legendAnnotEl.value,
      axisShow:           axisShowEl.value,
      axisDateAnnotation: axisDateAnnotEl.value,
      axisMajorInterval:    axisMajorIntervalEl.value,
      axisMinorInterval:    axisMinorIntervalEl.value,
      axisMajorLabelFormat: axisMajorLabelEl.value,
      axisMinorLabelFormat: axisMinorLabelEl.value,
      nodeOrder:        currentOrder,
      mode:             renderer ? renderer._mode : 'nodes',
    }));
  }

  function applyDefaults() {
    if (!confirm('Reset all visual settings to their defaults?')) return;

    // Hydrate DOM controls.
    canvasBgColorEl.value    = DEFAULTS.canvasBgColor;
    branchColorEl.value      = DEFAULTS.branchColor;
    branchWidthSlider.value  = DEFAULTS.branchWidth;
    document.getElementById('branch-width-value').textContent = DEFAULTS.branchWidth;
    fontSlider.value         = DEFAULTS.fontSize;
    document.getElementById('font-size-value').textContent    = DEFAULTS.fontSize;
    labelColorEl.value       = DEFAULTS.labelColor;
    tipSlider.value          = DEFAULTS.tipSize;
    document.getElementById('tip-size-value').textContent     = DEFAULTS.tipSize;
    tipShapeColorEl.value    = DEFAULTS.tipShapeColor;
    tipShapeBgEl.value       = DEFAULTS.tipShapeBgColor;
    nodeSlider.value         = DEFAULTS.nodeSize;
    document.getElementById('node-size-value').textContent    = DEFAULTS.nodeSize;
    nodeShapeColorEl.value   = DEFAULTS.nodeShapeColor;
    nodeShapeBgEl.value      = DEFAULTS.nodeShapeBgColor;
    tipColourBy.value        = '';
    nodeColourBy.value       = '';
    legendShowEl.value       = DEFAULTS.legendShow;
    legendAnnotEl.value      = '';
    axisShowEl.value         = DEFAULTS.axisShow;
    axisDateAnnotEl.value    = '';
    axisMajorIntervalEl.value    = DEFAULTS.axisMajorInterval;
    axisMinorIntervalEl.value    = DEFAULTS.axisMinorInterval;
    axisMajorLabelEl.value       = DEFAULTS.axisMajorLabelFormat;
    axisMinorLabelEl.value       = DEFAULTS.axisMinorLabelFormat;
    _updateMinorOptions(DEFAULTS.axisMajorInterval, DEFAULTS.axisMinorInterval);

    // Apply to renderer.
    if (renderer) {
      renderer.setBgColor(DEFAULTS.canvasBgColor);
      renderer.setBranchColor(DEFAULTS.branchColor);
      renderer.setBranchWidth(parseFloat(DEFAULTS.branchWidth));
      renderer.setFontSize(parseInt(DEFAULTS.fontSize));
      renderer.setLabelColor(DEFAULTS.labelColor);
      renderer.setTipRadius(parseInt(DEFAULTS.tipSize));
      renderer.setTipShapeColor(DEFAULTS.tipShapeColor);
      renderer.setTipShapeBgColor(DEFAULTS.tipShapeBgColor);
      renderer.setNodeRadius(parseInt(DEFAULTS.nodeSize));
      renderer.setNodeShapeColor(DEFAULTS.nodeShapeColor);
      renderer.setNodeShapeBgColor(DEFAULTS.nodeShapeBgColor);
      renderer.setTipColourBy(null);
      renderer.setNodeColourBy(null);
      renderer.setMode('nodes');
      applyLegend();
      applyAxis();
      applyTickOptions();
    }

    // Reset order + mode button states (if controls are already bound).
    currentOrder = null;
    document.getElementById('btn-order-asc') ?.classList.remove('active');
    document.getElementById('btn-order-desc')?.classList.remove('active');
    document.getElementById('btn-mode-nodes')    ?.classList.toggle('active', true);
    document.getElementById('btn-mode-branches') ?.classList.toggle('active', false);

    saveSettings();
  }

  btnResetSettings.addEventListener('click', applyDefaults);

  // Load stored settings and immediately hydrate the visual DOM controls.
  const _saved = loadSettings();
  if (_saved.canvasBgColor)        canvasBgColorEl.value    = _saved.canvasBgColor;
  if (_saved.branchColor)          branchColorEl.value      = _saved.branchColor;
  if (_saved.branchWidth    != null) {
    branchWidthSlider.value = _saved.branchWidth;
    document.getElementById('branch-width-value').textContent = _saved.branchWidth;
  }
  if (_saved.fontSize       != null) {
    fontSlider.value = _saved.fontSize;
    document.getElementById('font-size-value').textContent = _saved.fontSize;
  }
  if (_saved.labelColor)           labelColorEl.value       = _saved.labelColor;
  if (_saved.tipSize        != null) {
    tipSlider.value = _saved.tipSize;
    document.getElementById('tip-size-value').textContent = _saved.tipSize;
  }
  if (_saved.tipShapeColor)        tipShapeColorEl.value    = _saved.tipShapeColor;
  if (_saved.tipShapeBgColor)      tipShapeBgEl.value       = _saved.tipShapeBgColor;
  if (_saved.nodeSize       != null) {
    nodeSlider.value = _saved.nodeSize;
    document.getElementById('node-size-value').textContent = _saved.nodeSize;
  }
  if (_saved.nodeShapeColor)       nodeShapeColorEl.value   = _saved.nodeShapeColor;
  if (_saved.nodeShapeBgColor)     nodeShapeBgEl.value      = _saved.nodeShapeBgColor;
  if (_saved.legendShow)           legendShowEl.value       = _saved.legendShow;

  // Size canvas to container before creating renderer
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = container.clientWidth  + 'px';
  canvas.style.height = container.clientHeight + 'px';
  canvas.width  = container.clientWidth  * dpr;
  canvas.height = container.clientHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Size the status canvas
  const statusCanvas = document.getElementById('status-canvas');
  const statusBar    = statusCanvas.parentElement;
  statusCanvas.style.width  = statusBar.clientWidth  + 'px';
  statusCanvas.style.height = statusBar.clientHeight + 'px';
  statusCanvas.width  = statusBar.clientWidth  * dpr;
  statusCanvas.height = statusBar.clientHeight * dpr;
  statusCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderer = new TreeRenderer(canvas, undefined, statusCanvas);
  renderer.setLegendCanvases(legendLeftCanvas, legendRightCanvas);

  // Apply stored visual settings to the renderer immediately.
  renderer.setBgColor(canvasBgColorEl.value);
  renderer.setBranchColor(branchColorEl.value);
  renderer.setBranchWidth(parseFloat(branchWidthSlider.value));
  renderer.setFontSize(parseInt(fontSlider.value));
  renderer.setLabelColor(labelColorEl.value);
  renderer.setTipRadius(parseInt(tipSlider.value));
  renderer.setTipShapeColor(tipShapeColorEl.value);
  renderer.setTipShapeBgColor(tipShapeBgEl.value);
  renderer.setNodeRadius(parseInt(nodeSlider.value));
  renderer.setNodeShapeColor(nodeShapeColorEl.value);
  renderer.setNodeShapeBgColor(nodeShapeBgEl.value);

  // ── Axis renderer ─────────────────────────────────────────────────────────
  const axisRenderer = new AxisRenderer(axisCanvas);

  renderer._onViewChange = (scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr) => {
    axisRenderer.update(scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr);
  };

  // Update axis time span whenever navigation drills into or out of a subtree.
  // Reads renderer._globalHeightMap directly so the values are always current,
  // even after rerooting (which rebuilds the map via _buildGlobalHeightMap).
  renderer._onLayoutChange = (maxX, viewSubtreeRootId) => {
    if (!_axisIsTimedTree) return;
    const hMap = renderer._globalHeightMap;
    const viewNodes = renderer.nodes || [];
    // The current layout root (x=0) always has height = maxX of the full-tree layout.
    const rootLayoutNode = viewNodes.find(n => !n.parentId);
    const rootH = rootLayoutNode ? (hMap.get(rootLayoutNode.id) ?? 0) : 0;
    // For subtree navigation, get the global height of the subtree root node.
    const viewRootH = viewSubtreeRootId ? (hMap.get(viewSubtreeRootId) ?? rootH) : rootH;
    // Minimum computed height among visible tips — defines the right axis boundary.
    let minTipH = Infinity;
    for (const n of viewNodes) {
      if (!n.isTip) continue;
      const h = hMap.get(n.id);
      if (h != null && h < minTipH) minTipH = h;
    }
    if (!isFinite(minTipH)) minTipH = 0;
    axisRenderer.setSubtreeParams({
      maxX:       viewRootH - minTipH,
      rootHeight: viewRootH,
      minTipH:    minTipH,
    });
  };

  // Restore axis visibility from saved settings
  if (_saved.axisShow === 'on') {
    axisShowEl.value            = 'on';
    axisCanvas.style.display    = 'block';
    axisRenderer.setVisible(true);
  }
  // Restore tick options
  if (_saved.axisMajorInterval)    axisMajorIntervalEl.value    = _saved.axisMajorInterval;
  _updateMinorOptions(axisMajorIntervalEl.value, _saved.axisMinorInterval || 'off');
  if (_saved.axisMajorLabelFormat) axisMajorLabelEl.value       = _saved.axisMajorLabelFormat;
  if (_saved.axisMinorLabelFormat) axisMinorLabelEl.value       = _saved.axisMinorLabelFormat;

  // Hide the initial loading overlay; the Open Tree modal replaces it on startup
  loadingEl.style.display = 'none';

  // ── Modal management ──────────────────────────────────────────────────────

  const modal         = document.getElementById('open-tree-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  let treeLoaded = false;

  function openModal() {
    setModalError(null);
    setModalLoading(false);
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  function setModalError(msg) {
    const el = document.getElementById('modal-error');
    if (msg) { el.textContent = msg; el.style.display = 'block'; }
    else      { el.style.display = 'none'; }
  }

  function setModalLoading(on) {
    document.getElementById('modal-loading').style.display = on ? 'block' : 'none';
    modal.querySelectorAll('.pt-modal-body button, .pt-tab-btn').forEach(b => {
      if (b !== btnModalClose) b.disabled = on;
    });
  }

  // Tab switching
  modal.querySelectorAll('.pt-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.pt-tab-btn').forEach(b => b.classList.remove('active'));
      modal.querySelectorAll('.pt-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Close button (only works after a tree has been loaded)
  btnModalClose.addEventListener('click', () => { if (treeLoaded) closeModal(); });

  // Escape key also closes when a tree is loaded
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && treeLoaded && modal.classList.contains('open')) closeModal();
    if (e.key === 'Escape') {
      const overlay = document.getElementById('node-info-overlay');
      if (overlay && overlay.style.display !== 'none') { overlay.style.display = 'none'; }
    }
  });

  // ── File tab ──────────────────────────────────────────────────────────────

  const dropZone  = document.getElementById('tree-drop-zone');
  const fileInput = document.getElementById('tree-file-input');

  document.getElementById('btn-file-choose').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = '';  // reset so the same file can be re-selected
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  async function handleFile(file) {
    setModalLoading(true);
    setModalError(null);
    try {
      const text = await file.text();
      await loadTree(text, file.name);
    } catch (err) {
      setModalError(err.message);
      setModalLoading(false);
    }
  }

  // ── URL tab ───────────────────────────────────────────────────────────────

  document.getElementById('btn-load-url').addEventListener('click', async () => {
    const url = document.getElementById('tree-url-input').value.trim();
    if (!url) { setModalError('Please enter a URL.'); return; }
    setModalLoading(true);
    setModalError(null);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' – ' + url);
      const text = await resp.text();
      await loadTree(text, url.split('/').pop() || 'tree');
    } catch (err) {
      setModalError(err.message);
      setModalLoading(false);
    }
  });

  // ── Example tab ───────────────────────────────────────────────────────────

  document.getElementById('btn-load-example').addEventListener('click', async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const resp = await fetch('data/ebov.tree');
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' – could not fetch data/ebov.tree');
      const text = await resp.text();
      await loadTree(text, 'ebov.tree');
    } catch (err) {
      setModalError(err.message);
      setModalLoading(false);
    }
  });

  // Show the modal on startup
  openModal();

  // ── Import Annotations ──────────────────────────────────────────────────

  const importOverlay = document.getElementById('import-annot-overlay');
  const importBody    = document.getElementById('import-annot-body');
  const importFooter  = document.getElementById('import-annot-footer');
  const importTitleEl = document.getElementById('import-annot-title');

  function _openAnnotDialog() {
    if (!graph) return;
    _showAnnotPicker();
    importOverlay.classList.add('open');
  }
  function _closeAnnotDialog() {
    importOverlay.classList.remove('open');
  }

  document.getElementById('import-annot-close').addEventListener('click', _closeAnnotDialog);
  btnImportAnnot.addEventListener('click', _openAnnotDialog);

  document.getElementById('export-tree-close').addEventListener('click', _closeExportDialog);
  btnExportTree.addEventListener('click', _openExportDialog);

  /** Phase 1: render the File/URL picker UI into the dialog body. */
  function _showAnnotPicker(errorMsg) {
    importTitleEl.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Import Annotations';
    importFooter.innerHTML  = '';
    importBody.innerHTML = `
      <div class="pt-tabs">
        <button class="pt-tab-btn active" data-imp-tab="file"><i class="bi bi-folder2-open me-1"></i>File</button>
        <button class="pt-tab-btn"        data-imp-tab="url" ><i class="bi bi-link-45deg me-1"></i>URL</button>
      </div>
      <div class="pt-tab-panel active" id="imp-tab-file">
        <div id="annot-drop-zone" class="pt-drop-zone">
          <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
          <p>Drag and drop your annotation file here</p>
          <p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">CSV (.csv) &nbsp;or&nbsp; Tab-separated (.tsv)</p>
          <input type="file" id="annot-file-input" accept=".csv,.tsv,.txt" style="display:none">
          <button class="btn btn-sm btn-outline-primary" id="btn-annot-file-choose"><i class="bi bi-folder2-open me-1"></i>Choose File</button>
        </div>
      </div>
      <div class="pt-tab-panel" id="imp-tab-url">
        <label class="form-label">Annotation file URL</label>
        <input type="url" class="pt-modal-url-input" id="annot-url-input"
          placeholder="https://example.com/annotations.csv" />
        <div style="text-align:center;margin-top:0.5rem">
          <button class="btn btn-sm btn-outline-primary" id="btn-annot-load-url"
            ><i class="bi bi-cloud-download me-1"></i>Load from URL</button>
        </div>
      </div>
      <div id="imp-loading" class="pt-modal-loading" style="display:none">
        <div class="pt-spinner"></div>Loading&hellip;
      </div>
      ${errorMsg ? `<div class="pt-modal-error">${_esc(errorMsg)}</div>` : ''}`;

    // Tab switching
    importBody.querySelectorAll('[data-imp-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        importBody.querySelectorAll('[data-imp-tab]').forEach(b => b.classList.remove('active'));
        importBody.querySelectorAll('.pt-tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`imp-tab-${btn.dataset.impTab}`).classList.add('active');
      });
    });

    // File picker + drag-and-drop
    const annotFileInput = document.getElementById('annot-file-input');
    const annotDropZone  = document.getElementById('annot-drop-zone');
    document.getElementById('btn-annot-file-choose').addEventListener('click', () => annotFileInput.click());
    annotFileInput.addEventListener('change', () => {
      const file = annotFileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => _showImportConfig(file.name, e.target.result);
      reader.readAsText(file);
    });
    annotDropZone.addEventListener('dragover',  e  => { e.preventDefault(); annotDropZone.classList.add('drag-over'); });
    annotDropZone.addEventListener('dragleave', () => annotDropZone.classList.remove('drag-over'));
    annotDropZone.addEventListener('drop', e => {
      e.preventDefault();
      annotDropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => _showImportConfig(file.name, ev.target.result);
      reader.readAsText(file);
    });

    // URL load
    document.getElementById('btn-annot-load-url').addEventListener('click', async () => {
      const url = document.getElementById('annot-url-input').value.trim();
      if (!url) return;
      const loadingEl = document.getElementById('imp-loading');
      loadingEl.style.display = '';
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} \u2013 ${url}`);
        const text = await resp.text();
        _showImportConfig(url.split('/').pop() || 'annotations', text);
      } catch (err) {
        loadingEl.style.display = 'none';
        _showAnnotPicker(err.message);
      }
    });
  }

  /** Parse a CSV or TSV string into { headers, rows[] }. */
  function _parseDelimited(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine  = lines[0];
    const tabCount   = (firstLine.match(/\t/g)  || []).length;
    const commaCount = (firstLine.match(/,/g)   || []).length;
    const delimiter  = tabCount >= commaCount ? '\t' : ',';

    function parseLine(line) {
      if (delimiter === '\t') return line.split('\t').map(v => v.trim());
      const result = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          result.push(cur.trim()); cur = '';
        } else { cur += ch; }
      }
      result.push(cur.trim());
      return result;
    }

    const headers = parseLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      if (vals.every(v => !v)) continue;
      const obj = {};
      headers.forEach((h, j) => { obj[h] = vals[j] ?? ''; });
      rows.push(obj);
    }
    return { headers, rows };
  }

  /** Show the import configuration dialog. */
  function _showImportConfig(filename, text) {
    let parsed;
    try { parsed = _parseDelimited(text); }
    catch (err) { _showImportError(`Parse error: ${err.message}`); return; }
    const { headers, rows } = parsed;
    if (headers.length < 2) {
      _showImportError('File must have at least 2 columns (one to match tips and at least one annotation column).');
      return;
    }
    if (rows.length === 0) {
      _showImportError('No data rows found (file appears to have only a header row).');
      return;
    }

    const headerOpts = headers.map((h, i) =>
      `<option value="${i}">${_esc(h)}</option>`).join('');

    const colChecks = headers.map((h, i) =>
      `<label><input type="checkbox" class="imp-col-chk" data-idx="${i}" checked> ${_esc(h)}</label>`
    ).join('');

    importTitleEl.innerHTML = `<i class="bi bi-file-earmark-text me-2"></i>${_esc(filename)}`;
    importBody.innerHTML = `
      <p style="margin:0 0 0.8rem;color:var(--bs-secondary-color)">
        ${rows.length}&nbsp;row${rows.length !== 1 ? 's' : ''},
        ${headers.length}&nbsp;column${headers.length !== 1 ? 's' : ''}
      </p>

      <div class="imp-section">
        <label class="imp-section-label">Match column</label>
        <div class="imp-row">
          <select class="imp-select" id="imp-match-col">${headerOpts}</select>
        </div>
      </div>

      <div class="imp-section">
        <label class="imp-section-label">Match mode</label>
        <div style="display:flex;flex-direction:column;gap:0.3rem;">
          <label class="imp-row" style="cursor:pointer">
            <input type="radio" name="imp-mode" id="imp-mode-full" value="full" checked>
            Full taxon label
          </label>
          <label class="imp-row" style="cursor:pointer">
            <input type="radio" name="imp-mode" id="imp-mode-field" value="field">
            Pipe-delimited field:&nbsp;
            <input type="number" id="imp-field-num" min="1" value="1"
              style="width:52px;background:#02292e;color:var(--bs-body-color);border:1px solid #235b62;border-radius:0.25rem;padding:0.1rem 0.3rem;font-size:0.82rem;"
              title="Which |-delimited field (1 = first)">
          </label>
        </div>
      </div>

      <div class="imp-section">
        <label class="imp-section-label">Columns to import</label>
        <div class="imp-col-grid" id="imp-col-grid">${colChecks}</div>
        <button id="imp-toggle-all" class="btn btn-sm btn-outline-secondary"
          style="margin-top:0.4rem;font-size:0.75rem;padding:0.1rem 0.5rem">Deselect all</button>
      </div>

      <div class="imp-section">
        <label class="imp-row" style="cursor:pointer;gap:0.4rem;align-items:flex-start">
          <input type="checkbox" id="imp-replace" style="margin-top:0.1rem;flex-shrink:0">
          <span>Replace existing annotations with the same name
            <span style="display:block;color:var(--bs-secondary-color);font-size:0.75rem">
              Clears matching annotation keys from all nodes before applying new values.
            </span>
          </span>
        </label>
      </div>`;

    importFooter.innerHTML = `
      <button id="imp-cancel-btn" class="btn btn-sm btn-outline-secondary">Cancel</button>
      <button id="imp-apply-btn" class="btn btn-sm btn-primary">Import &#x2192;</button>`;

    // When match column changes, disable that column in the import grid.
    function _syncMatchColDisabled() {
      const matchIdx = document.getElementById('imp-match-col').value;
      document.querySelectorAll('.imp-col-chk').forEach(el => {
        const isMatch = el.dataset.idx === matchIdx;
        el.disabled = isMatch;
        if (isMatch) el.checked = false;
        el.closest('label').style.opacity = isMatch ? '0.4' : '';
      });
    }
    document.getElementById('imp-match-col').addEventListener('change', _syncMatchColDisabled);
    _syncMatchColDisabled(); // init

    // Clicking the field-number input switches to field mode.
    document.getElementById('imp-field-num').addEventListener('focus', () => {
      document.getElementById('imp-mode-field').checked = true;
    });

    // Toggle-all button.
    document.getElementById('imp-toggle-all').addEventListener('click', () => {
      const matchIdx = document.getElementById('imp-match-col').value;
      const eligible = [...document.querySelectorAll('.imp-col-chk')]
        .filter(el => el.dataset.idx !== matchIdx);
      const anyUnchecked = eligible.some(el => !el.checked);
      eligible.forEach(el => { el.checked = anyUnchecked; });
      document.getElementById('imp-toggle-all').textContent =
        anyUnchecked ? 'Deselect all' : 'Select all';
    });

    document.getElementById('imp-cancel-btn').addEventListener('click', () => _showAnnotPicker());

    document.getElementById('imp-apply-btn').addEventListener('click', () => {
      const matchIdx   = parseInt(document.getElementById('imp-match-col').value, 10);
      const matchCol   = headers[matchIdx];
      const modeField  = document.getElementById('imp-mode-field').checked;
      const fieldIndex = Math.max(1, parseInt(document.getElementById('imp-field-num').value, 10) || 1) - 1;
      const doReplace  = document.getElementById('imp-replace').checked;
      const importCols = headers.filter((_, i) => {
        if (i === matchIdx) return false;
        const el = document.querySelector(`.imp-col-chk[data-idx="${i}"]`);
        return el && el.checked;
      });
      if (importCols.length === 0) {
        const grid = document.getElementById('imp-col-grid');
        grid.style.outline = '1px solid var(--bs-danger)';
        setTimeout(() => { grid.style.outline = ''; }, 1500);
        return;
      }
      _applyAnnotations({ rows, matchCol, matchMode: modeField ? 'field' : 'full',
                          fieldIndex, importCols, doReplace, filename });
    });
  }

  /** Write parsed annotations onto graph nodes, rebuild schema, refresh UI. */
  function _applyAnnotations({ rows, matchCol, matchMode, fieldIndex, importCols, doReplace, filename }) {
    const tips = graph.nodes.filter(n => n.adjacents.length === 1);

    // Build lookup: matchValue → first matching row
    const rowLookup = new Map();
    for (const row of rows) {
      const key = (row[matchCol] ?? '').trim();
      if (key && !rowLookup.has(key)) rowLookup.set(key, row);
    }

    // Optionally clear existing annotation keys from all nodes
    if (doReplace) {
      for (const colName of importCols)
        for (const node of graph.nodes) delete node.annotations[colName];
    }

    let matched = 0;
    const matchedRowKeys = new Set();
    const unmatchedTipExamples = [];
    for (const node of tips) {
      const label    = node.name ?? node.origId ?? '';
      const matchKey = matchMode === 'field'
        ? (label.split('|')[fieldIndex] ?? '').trim()
        : label.trim();
      const row = rowLookup.get(matchKey);
      if (!row) {
        if (unmatchedTipExamples.length < 5) unmatchedTipExamples.push(matchKey || label);
        continue;
      }
      matched++;
      matchedRowKeys.add(matchKey);
      for (const colName of importCols) {
        const raw = (row[colName] ?? '').trim();
        if (raw === '') continue;
        const num = Number(raw);
        node.annotations[colName] = Number.isNaN(num) ? raw : num;
      }
    }

    const unmatchedTips = tips.length - matched;
    const unmatchedRows = rowLookup.size - matchedRowKeys.size;

    // Rebuild schema and refresh all annotation-dependent UI.
    graph.annotationSchema = buildAnnotationSchema(graph.nodes);
    _refreshAnnotationUIs(graph.annotationSchema);
    renderer.setAnnotationSchema(graph.annotationSchema);
    renderer.setTipColourBy(tipColourBy.value  || null);
    renderer.setNodeColourBy(nodeColourBy.value || null);
    applyLegend();
    renderer._dirty = true;

    _showImportResults({ matched, unmatchedTips, unmatchedRows, unmatchedTipExamples,
                         importCols, filename, totalTips: tips.length });
  }

  /** Switch the import dialog to a results view. */
  function _showImportResults({ matched, unmatchedTips, unmatchedRows, unmatchedTipExamples = [], importCols, filename, totalTips }) {
    const pct       = totalTips > 0 ? Math.round(100 * matched / totalTips) : 0;
    const okCls  = matched       > 0 ? 'imp-ok'   : 'imp-warn';
    const tipCls = unmatchedTips > 0 ? 'imp-warn' : 'imp-ok';
    const rowCls = unmatchedRows > 0 ? 'imp-warn' : 'imp-ok';
    importTitleEl.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Import Results';
    importBody.innerHTML = `
      <div class="imp-result-row">
        <span class="imp-result-icon ${okCls}"><i class="bi bi-check-circle-fill"></i></span>
        <span><strong>${matched}</strong> of <strong>${totalTips}</strong> tips matched (${pct}%)</span>
      </div>
      <div class="imp-result-row">
        <span class="imp-result-icon ${tipCls}">
          <i class="bi bi-${unmatchedTips > 0 ? 'exclamation-triangle-fill' : 'check-circle-fill'}"></i>
        </span>
        <span><strong>${unmatchedTips}</strong> tip${unmatchedTips !== 1 ? 's' : ''} unmatched${unmatchedTips > 0 && unmatchedTipExamples.length > 0 ? ` <span style="color:var(--bs-secondary-color);font-size:0.78rem">(e.g. ${unmatchedTipExamples.map(n => `<code style="background:#02292e;padding:0 3px;border-radius:3px">${_esc(n)}</code>`).join(', ')}${unmatchedTips > unmatchedTipExamples.length ? ', …' : ''})</span>` : ''}</span>
      </div>
      <div class="imp-result-row">
        <span class="imp-result-icon ${rowCls}">
          <i class="bi bi-${unmatchedRows > 0 ? 'exclamation-triangle-fill' : 'check-circle-fill'}"></i>
        </span>
        <span><strong>${unmatchedRows}</strong> annotation row${unmatchedRows !== 1 ? 's' : ''} unmatched</span>
      </div>
      ${importCols.length > 0 ? `
      <div style="margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid #235b62;">
        <span style="color:var(--bs-secondary-color)">Annotations imported:</span>
        ${importCols.map(c => `<code style="background:#02292e;padding:0 3px;border-radius:3px;margin:0 2px">${_esc(c)}</code>`).join('')}
      </div>` : ''}`;
    importFooter.innerHTML = `<button id="imp-close-btn" class="btn btn-sm btn-primary">Close</button>`;
    document.getElementById('imp-close-btn').addEventListener('click', _closeAnnotDialog);
  }

  /** Show an error inside the import dialog (phase 2 parse errors). */
  function _showImportError(msg) {
    importTitleEl.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Import Error';
    importBody.innerHTML = `<div style="color:var(--bs-danger);padding:0.5rem 0">${_esc(msg)}</div>`;
    importFooter.innerHTML = `<button id="imp-back-btn" class="btn btn-sm btn-outline-secondary me-auto">&#x2190; Back</button>
      <button id="imp-close-err-btn" class="btn btn-sm btn-secondary">Close</button>`;
    document.getElementById('imp-back-btn').addEventListener('click',      () => _showAnnotPicker());
    document.getElementById('imp-close-err-btn').addEventListener('click', _closeAnnotDialog);
  }

  /** HTML-escape a string for safe insertion. */
  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Export Tree ────────────────────────────────────────────────────────────────

  /** Escape a Newick/NEXUS taxon name with single quotes when needed. */
  function _newickEsc(name) {
    if (!name) return '';
    if (/[(),;:\[\]\s]/.test(name)) return `'${name.replace(/'/g, "''")}'`;
    return name;
  }

  /** Format a branch length compactly (no scientific notation for typical values). */
  function _fmtLen(n) {
    if (n == null || isNaN(n)) return null;
    if (n === 0) return '0';
    return parseFloat(n.toPrecision(12)).toString();
  }

  /** Build a BEAST/FigTree-style [&key=val,...] annotation block. */
  function _fmtAnnot(annotations, annotKeys) {
    if (!annotations || annotKeys.length === 0) return '';
    const parts = [];
    for (const key of annotKeys) {
      const val = annotations[key];
      if (val === undefined || val === null) continue;
      if (Array.isArray(val)) {
        const elems = val.map(v => typeof v === 'string' ? `"${v.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"` : v);
        parts.push(`${key}={${elems.join(',')}}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}="${val.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`);
      } else {
        parts.push(`${key}=${val}`);
      }
    }
    return parts.length > 0 ? `[&${parts.join(',')}]` : '';
  }

  /**
   * Return the branch length from child index `ci` toward parent direction `pi`.
   * Handles the special case where root-adjacent nodes store total edge length.
   */
  function _branchLen(ci, pi, g) {
    if (pi < 0) return null;
    const { nodeA, nodeB, lenA, lenB } = g.root;
    if (ci === nodeA && pi === nodeB) return lenA;
    if (ci === nodeB && pi === nodeA) return lenB;
    return g.nodes[ci].lengths[0];
  }

  /**
   * Recursively serialize the subtree rooted at `nodeIdx` (coming from direction
   * `parentIdx`, which is excluded from children) into a Newick string fragment.
   */
  function _newickNode(nodeIdx, parentIdx, g, annotKeys) {
    const node      = g.nodes[nodeIdx];
    const annotStr  = _fmtAnnot(node.annotations, annotKeys);
    const safeName  = _newickEsc(node.name || node.label || '');
    const childIdxs = node.adjacents.filter(i => i !== parentIdx);
    if (childIdxs.length === 0) {
      return `${safeName}${annotStr}`;
    }
    const parts = childIdxs.map(ci => {
      const cStr   = _newickNode(ci, nodeIdx, g, annotKeys);
      const len    = _branchLen(ci, nodeIdx, g);
      const lenStr = len != null ? `:${_fmtLen(len)}` : '';
      return `${cStr}${lenStr}`;
    });
    return `(${parts.join(',')})${safeName}${annotStr}`;
  }

  /**
   * Serialize the PhyloGraph `g` (or a subtree rooted at `subtreeRootId`) to
   * a Newick string ended with ';'.
   */
  function _graphToNewick(g, subtreeRootId, annotKeys) {
    const { nodeA, nodeB, lenA } = g.root;
    let body;
    if (subtreeRootId) {
      const idx = g.origIdToIdx.get(subtreeRootId);
      if (idx === undefined) return null;
      const node = g.nodes[idx];
      const parentIdx = node.adjacents.length > 0 ? node.adjacents[0] : -1;
      body = _newickNode(idx, parentIdx, g, annotKeys);
    } else if (lenA === 0) {
      // nodeA is the actual root (trifurcating or annotated)
      body = _newickNode(nodeA, -1, g, annotKeys);
    } else {
      // Virtual root between nodeA and nodeB
      const aStr = _newickNode(nodeA, nodeB, g, annotKeys);
      const bStr = _newickNode(nodeB, nodeA, g, annotKeys);
      const aLen = lenA != null   ? `:${_fmtLen(lenA)}`        : '';
      const bLen = g.root.lenB != null ? `:${_fmtLen(g.root.lenB)}` : '';
      body = `(${aStr}${aLen},${bStr}${bLen})`;
    }
    return body + ';';
  }

  // Export dialog DOM refs
  const exportOverlay  = document.getElementById('export-tree-overlay');
  const exportBody     = document.getElementById('export-tree-body');
  const exportFooter   = document.getElementById('export-tree-footer');
  const exportTitleEl  = document.getElementById('export-tree-title');

  function _openExportDialog() {
    if (!graph) return;
    exportOverlay.classList.add('open');
    _buildExportDialog();
  }

  function _closeExportDialog() {
    exportOverlay.classList.remove('open');
  }

  function _buildExportDialog() {
    const hasSubtree = !!renderer._viewSubtreeRootId;
    const schema     = graph ? graph.annotationSchema : new Map();
    const annotKeys  = schema ? [...schema.keys()] : [];

    exportTitleEl.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>Export Tree';

    exportBody.innerHTML = `
      <div class="exp-section">
        <span class="exp-section-label">Format</span>
        <div class="exp-radio-group">
          <label class="exp-radio-opt"><input type="radio" name="exp-format" value="nexus" checked>&nbsp;NEXUS <span style="color:var(--bs-secondary-color);font-size:0.78rem">(.nexus)</span></label>
          <label class="exp-radio-opt"><input type="radio" name="exp-format" value="newick">&nbsp;Newick <span style="color:var(--bs-secondary-color);font-size:0.78rem">(.nwk)</span></label>
        </div>
      </div>
      <div class="exp-section">
        <span class="exp-section-label">Scope</span>
        <div class="exp-radio-group">
          <label class="exp-radio-opt"><input type="radio" name="exp-scope" value="full" checked>&nbsp;Entire tree</label>
          <label class="exp-radio-opt${!hasSubtree ? ' exp-disabled' : ''}">
            <input type="radio" name="exp-scope" value="subtree"${!hasSubtree ? ' disabled' : ''}>&nbsp;Current subtree view
          </label>
        </div>
      </div>
      ${annotKeys.length > 0 ? `
      <div class="exp-section">
        <span class="exp-section-label" style="display:flex;align-items:center;justify-content:space-between;">
          <span>Annotations to include</span>
          <span style="display:flex;gap:0.3rem">
            <button id="exp-all-btn"  class="btn btn-sm btn-outline-secondary" style="font-size:0.7rem;padding:1px 8px;line-height:1.4">All</button>
            <button id="exp-none-btn" class="btn btn-sm btn-outline-secondary" style="font-size:0.7rem;padding:1px 8px;line-height:1.4">None</button>
          </span>
        </span>
        <div class="imp-col-grid" id="exp-annot-grid" style="margin-top:0.35rem">
          ${annotKeys.map(k => `
            <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.82rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              <input type="checkbox" class="exp-annot-cb" value="${_esc(k)}" checked>
              <code style="font-size:0.78rem;background:#02292e;padding:0 3px;border-radius:3px">${_esc(k)}</code>
            </label>`).join('')}
        </div>
      </div>` : ''}`;

    exportFooter.innerHTML = `
      <button id="exp-cancel-btn"   class="btn btn-sm btn-secondary">Cancel</button>
      <button id="exp-download-btn" class="btn btn-sm btn-primary"><i class="bi bi-download me-1"></i>Download</button>`;

    document.getElementById('exp-cancel-btn').addEventListener('click', _closeExportDialog);
    document.getElementById('exp-download-btn').addEventListener('click', _doExport);
    if (annotKeys.length > 0) {
      document.getElementById('exp-all-btn').addEventListener('click', () =>
        document.querySelectorAll('#exp-annot-grid .exp-annot-cb').forEach(cb => { cb.checked = true; }));
      document.getElementById('exp-none-btn').addEventListener('click', () =>
        document.querySelectorAll('#exp-annot-grid .exp-annot-cb').forEach(cb => { cb.checked = false; }));
    }
  }

  function _doExport() {
    const format      = document.querySelector('input[name="exp-format"]:checked')?.value || 'nexus';
    const scope       = document.querySelector('input[name="exp-scope"]:checked')?.value  || 'full';
    const annotKeys   = [...document.querySelectorAll('#exp-annot-grid .exp-annot-cb:checked')].map(cb => cb.value);
    const subtreeId   = scope === 'subtree' ? renderer._viewSubtreeRootId : null;
    const newick      = _graphToNewick(graph, subtreeId, annotKeys);
    if (!newick) return;

    let content, ext;
    if (format === 'nexus') {
      const rootedTag = annotKeys.length > 0 ? '[&R] ' : '';
      content = `#NEXUS\nBEGIN TREES;\n\ttree TREE1 = ${rootedTag}${newick}\nEND;\n`;
      ext     = 'nexus';
    } else {
      content = newick + '\n';
      ext     = 'nwk';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `tree.${ext}` });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    _closeExportDialog();
  }

  // ── Export Graphic ─────────────────────────────────────────────────────────

  const btnExportGraphic   = document.getElementById('btn-export-graphic');
  const exportGraphicOverlay = document.getElementById('export-graphic-overlay');
  const exportGraphicBody    = document.getElementById('export-graphic-body');
  const exportGraphicFooter  = document.getElementById('export-graphic-footer');

  document.getElementById('export-graphic-close').addEventListener('click', _closeGraphicsDialog);
  btnExportGraphic.addEventListener('click', _openGraphicsDialog);

  function _openGraphicsDialog() {
    if (!graph) return;
    exportGraphicOverlay.classList.add('open');
    _buildGraphicsDialog();
  }

  function _closeGraphicsDialog() {
    exportGraphicOverlay.classList.remove('open');
  }

  /** Return CSS-pixel dimensions of the full composite viewport. */
  function _viewportDims() {
    const llVisible = legendLeftCanvas.style.display !== 'none';
    const lrVisible = legendRightCanvas.style.display !== 'none';
    const axVisible = axisCanvas.style.display        !== 'none';
    const llW = llVisible ? legendLeftCanvas.clientWidth  : 0;
    const lrW = lrVisible ? legendRightCanvas.clientWidth : 0;
    const ttW = canvas.clientWidth;
    const ttH = canvas.clientHeight;
    const axH = axVisible ? axisCanvas.clientHeight : 0;
    return { totalW: llW + ttW + lrW, totalH: ttH + axH,
             llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible };
  }

  function _buildGraphicsDialog() {
    const { totalW, totalH } = _viewportDims();
    const defPx = Math.round(totalW * 2);
    const defH  = Math.round(totalH * 2);

    exportGraphicBody.innerHTML = `
      <div class="expg-row">
        <span class="expg-label">Filename</span>
        <input type="text" id="expg-filename" class="expg-input" value="tree" autocomplete="off" spellcheck="false">
        <span id="expg-ext-hint" style="font-size:0.82rem;color:var(--bs-secondary-color);flex-shrink:0">.svg</span>
      </div>
      <div class="expg-row">
        <span class="expg-label">Format</span>
        <div class="expg-radios">
          <label class="expg-radio"><input type="radio" name="expg-fmt" value="svg" checked>&nbsp;SVG (vector)</label>
          <label class="expg-radio"><input type="radio" name="expg-fmt" value="png">&nbsp;PNG (raster)</label>
        </div>
      </div>
      <div id="expg-png-opts" style="display:none">
        <div class="expg-row">
          <span class="expg-label">By</span>
          <div class="expg-radios">
            <label class="expg-radio"><input type="radio" name="expg-dim" value="w" checked>&nbsp;Width</label>
            <label class="expg-radio"><input type="radio" name="expg-dim" value="h">&nbsp;Height</label>
          </div>
        </div>
        <div class="expg-row">
          <span class="expg-label">Size</span>
          <div class="expg-dim-row">
            <input type="number" id="expg-px" class="expg-dim-px" value="${defPx}" min="100" max="20000" step="1">
            <span style="font-size:0.82rem;color:var(--bs-secondary-color)">px</span>
            <span id="expg-other-dim" style="font-size:0.82rem;color:var(--bs-secondary-color)">→ height: ${defH} px</span>
          </div>
        </div>
        <p class="expg-hint">Current viewport: ${totalW} × ${totalH} px &nbsp;·&nbsp; aspect ratio is fixed</p>
      </div>`;

    exportGraphicFooter.innerHTML = `
      <button id="expg-cancel-btn"   class="btn btn-sm btn-secondary">Cancel</button>
      <button id="expg-download-btn" class="btn btn-sm btn-primary"><i class="bi bi-download me-1"></i>Download</button>`;

    document.querySelectorAll('input[name="expg-fmt"]').forEach(r => r.addEventListener('change', () => {
      const isPng = document.querySelector('input[name="expg-fmt"]:checked')?.value === 'png';
      document.getElementById('expg-png-opts').style.display = isPng ? 'block' : 'none';
      document.getElementById('expg-ext-hint').textContent = isPng ? '.png' : '.svg';
    }));
    document.getElementById('expg-px').addEventListener('input', _updateExpgOtherDim);
    document.querySelectorAll('input[name="expg-dim"]').forEach(r => r.addEventListener('change', _updateExpgOtherDim));
    document.getElementById('expg-cancel-btn').addEventListener('click',   _closeGraphicsDialog);
    document.getElementById('expg-download-btn').addEventListener('click', _doGraphicsExport);
  }

  function _updateExpgOtherDim() {
    const { totalW, totalH } = _viewportDims();
    const by  = document.querySelector('input[name="expg-dim"]:checked')?.value || 'w';
    const px  = parseInt(document.getElementById('expg-px').value, 10) || 1000;
    const el  = document.getElementById('expg-other-dim');
    if (!el) return;
    if (by === 'w') el.textContent = `→ height: ${Math.round(px * totalH / totalW)} px`;
    else            el.textContent = `→ width: ${Math.round(px * totalW / totalH)} px`;
  }

  function _doGraphicsExport() {
    const fmt      = document.querySelector('input[name="expg-fmt"]:checked')?.value || 'svg';
    const filename = (document.getElementById('expg-filename')?.value.trim() || 'tree');

    if (fmt === 'png') {
      const { totalW, totalH } = _viewportDims();
      const by = document.querySelector('input[name="expg-dim"]:checked')?.value || 'w';
      const px = parseInt(document.getElementById('expg-px').value, 10) || Math.round(totalW * 2);
      const targetW = by === 'w' ? px : Math.round(px * totalW / totalH);
      const targetH = by === 'h' ? px : Math.round(px * totalH / totalW);

      _compositeViewPng(targetW, targetH).convertToBlob({ type: 'image/png' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a   = Object.assign(document.createElement('a'), { href: url, download: `${filename}.png` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } else {
      const svgStr = _buildGraphicSVG();
      if (!svgStr) return;
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${filename}.svg` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    _closeGraphicsDialog();
  }

  /** Composite all visible canvases onto an OffscreenCanvas at target pixel size. */
  function _compositeViewPng(targetW, targetH) {
    const { totalW, totalH, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = _viewportDims();
    const sx = targetW / totalW;
    const sy = targetH / totalH;
    const oc  = new OffscreenCanvas(targetW, targetH);
    const ctx = oc.getContext('2d');

    ctx.fillStyle = renderer.bgColor;
    ctx.fillRect(0, 0, targetW, targetH);

    if (llVisible) {
      ctx.drawImage(legendLeftCanvas, 0, 0,
        Math.round(llW * sx), Math.round(ttH * sy));
    }
    ctx.drawImage(canvas,
      Math.round(llW * sx), 0,
      Math.round(ttW * sx), Math.round(ttH * sy));
    if (axVisible) {
      ctx.drawImage(axisCanvas,
        Math.round(llW * sx), Math.round(ttH * sy),
        Math.round(ttW * sx), Math.round(axH * sy));
    }
    if (lrVisible) {
      ctx.drawImage(legendRightCanvas,
        Math.round((llW + ttW) * sx), 0,
        Math.round(lrW * sx), Math.round(ttH * sy));
    }
    return oc;
  }

  /** Escape a string for SVG text content. */
  function _svgTextEsc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Build a fully-vector composite SVG: three panels arranged as on screen —
   *   legend (left) | tree | legend (right)   [with axis below the tree panel]
   *
   * No raster embeds — axis ticks and legend entries are SVG elements.
   */
  function _buildGraphicSVG() {
    const nm = renderer.nodeMap;
    if (!nm || !nm.size) return null;

    const { totalW, totalH, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = _viewportDims();
    const sx  = renderer.scaleX,  ox = renderer.offsetX;
    const sy  = renderer.scaleY,  oy = renderer.offsetY;
    const bg  = renderer.bgColor;
    const bc  = renderer.branchColor;
    const bw  = Math.max(0.5, renderer.branchWidth);
    const lc  = renderer.labelColor;
    const fs  = renderer.fontSize;
    const tr  = renderer.tipRadius;
    const nr  = renderer.nodeRadius;

    const toSX = wx => wx * sx + ox + llW;
    const toSY = wy => wy * sy + oy;
    const f    = n  => n.toFixed(2);
    const MARGIN = 20;   // px outside viewport to still clip-include

    // ── defs: clip paths, gradients ──────────────────────────────────────
    const defs = [];
    // Clip for the main tree area (excludes legend panels)
    defs.push(`<clipPath id="tc"><rect x="${llW}" y="0" width="${ttW}" height="${ttH}"/></clipPath>`);

    // ── Background panels ─────────────────────────────────────────────────
    const bgParts = [];
    bgParts.push(`<rect width="${totalW}" height="${totalH}" fill="${_esc(bg)}"/>`);
    // Panel separators (CSS border-right / border-left equivalents)
    if (llVisible) bgParts.push(`<line x1="${llW}" y1="0" x2="${llW}" y2="${ttH}" stroke="#002b36" stroke-width="1"/>`);
    if (lrVisible) bgParts.push(`<line x1="${llW + ttW}" y1="0" x2="${llW + ttW}" y2="${ttH}" stroke="#002b36" stroke-width="1"/>`);
    if (axVisible) bgParts.push(`<line x1="0" y1="${ttH}" x2="${totalW}" y2="${ttH}" stroke="#002b36" stroke-width="1"/>`);

    // ── Legend panels (vector) ────────────────────────────────────────────
    const legendParts = [];
    const legendPos = renderer._legendPosition;
    const legendKey = renderer._legendAnnotation;
    if (legendPos && legendKey && renderer._annotationSchema) {
      const def = renderer._annotationSchema.get(legendKey);
      if (def) {
        const lx = legendPos === 'left' ? 0 : llW + ttW;
        const lw = legendPos === 'left' ? llW : lrW;
        const PAD = 12;
        let   ly  = PAD;

        // Title
        legendParts.push(`<text x="${lx + PAD}" y="${ly}" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" font-weight="700" fill="#b58900">${_svgTextEsc(legendKey)}</text>`);
        ly += fs + 10;

        if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
          const PALETTE = ['#2aa198','#cb4b16','#268bd2','#d33682','#6c71c4','#b58900','#859900','#dc322f'];
          const SWATCH  = 12;
          const ROW_H   = Math.max(SWATCH + 4, fs + 4);
          (def.values || []).forEach((val, i) => {
            if (ly + SWATCH > ttH - PAD) return;
            const colour = PALETTE[i % PALETTE.length];
            legendParts.push(`<rect x="${lx + PAD}" y="${ly}" width="${SWATCH}" height="${SWATCH}" fill="${_esc(colour)}"/>`);
            legendParts.push(`<text x="${lx + PAD + SWATCH + 6}" y="${ly + SWATCH / 2}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${_svgTextEsc(String(val))}</text>`);
            ly += ROW_H;
          });
        } else if (def.dataType === 'real' || def.dataType === 'integer') {
          const BAR_W = lw - PAD * 2;
          const BAR_H = 14;
          const gid   = 'lgrd';
          defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2aa198"/><stop offset="100%" stop-color="#dc322f"/></linearGradient>`);
          legendParts.push(`<rect x="${lx + PAD}" y="${ly}" width="${BAR_W}" height="${BAR_H}" fill="url(#${gid})"/>`);
          ly += BAR_H + 4;
          const min = def.min ?? 0, max = def.max ?? 1;
          legendParts.push(`<text x="${lx + PAD}" y="${ly}" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${_svgTextEsc(String(min))}</text>`);
          legendParts.push(`<text x="${lx + PAD + BAR_W}" y="${ly}" text-anchor="end" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${_svgTextEsc(String(max))}</text>`);
        }
      }
    }

    // ── Tree branches ─────────────────────────────────────────────────────
    const branchParts = [];
    const circleParts = [];
    const labelParts  = [];

    const rootNode = [...nm.values()].find(n => n.parentId === null);
    if (rootNode) {
      const rx = toSX(rootNode.x), ry = toSY(rootNode.y);
      const stub = renderer.rootStubLength ?? 20;
      branchParts.push(`<line x1="${f(rx - stub)}" y1="${f(ry)}" x2="${f(rx)}" y2="${f(ry)}"/>`);
    }

    for (const [, node] of nm) {
      const nx = toSX(node.x), ny = toSY(node.y);

      if (node.parentId !== null) {
        const parent = nm.get(node.parentId);
        if (parent && ny > -MARGIN && ny < ttH + MARGIN) {
          branchParts.push(`<line x1="${f(toSX(parent.x))}" y1="${f(ny)}" x2="${f(nx)}" y2="${f(ny)}"/>`);
        }
      }

      if (!node.isTip && node.children.length >= 2) {
        const childYs = node.children.map(cid => { const c = nm.get(cid); return c ? toSY(c.y) : null; }).filter(y => y !== null);
        if (childYs.length >= 2) {
          const minY = Math.min(...childYs), maxY = Math.max(...childYs);
          if (maxY > -MARGIN && minY < ttH + MARGIN)
            branchParts.push(`<line x1="${f(nx)}" y1="${f(minY)}" x2="${f(nx)}" y2="${f(maxY)}"/>`);
        }
      }

      if (ny > -MARGIN && ny < ttH + MARGIN) {
        if (node.isTip && tr > 0) {
          const fill   = renderer._tipColourScale?.get(node.annotations?.[renderer._tipColourBy]) || renderer.tipShapeColor;
          const stroke = renderer.tipShapeBgColor || bg;
          circleParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${_esc(fill)}" stroke="${_esc(stroke)}" stroke-width="1"/>`);
        } else if (!node.isTip && nr > 0) {
          const fill = renderer._nodeColourScale?.get(node.annotations?.[renderer._nodeColourBy]) || renderer.nodeShapeColor;
          circleParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${_esc(fill)}"/>`);
        }
        if (node.isTip && node.name) {
          const lx2   = nx + (tr > 0 ? tr + 4 : 4);
          const colour = renderer._tipColourScale?.get(node.annotations?.[renderer._tipColourBy]) || lc;
          labelParts.push(`<text x="${f(lx2)}" y="${f(ny)}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="${_esc(colour)}">${_svgTextEsc(node.name)}</text>`);
        } else if (!node.isTip && node.label) {
          labelParts.push(`<text x="${f(nx + 3)}" y="${f(ny - 3)}" font-family="monospace" font-size="${Math.round(fs * 0.85)}px" fill="${_esc(lc)}" opacity="0.7">${_svgTextEsc(node.label)}</text>`);
        }
      }
    }

    // ── Axis (vector) ────────────────────────────────────────────────────
    const axisParts = [];
    if (axVisible && axisRenderer._visible && axisRenderer._scaleX && axisRenderer._maxX !== 0) {
      const ar        = axisRenderer;
      const plotLeft  = ar._offsetX;
      const plotRight = ar._offsetX + ar._maxX * ar._scaleX;
      const AX        = llW;          // SVG x-offset for the axis canvas origin
      const AY        = ttH;          // SVG y-offset for the axis canvas origin
      const Y_BASE    = 3;
      const MAJOR_H   = 9;
      const MINOR_H   = 5;
      const TICK_C    = 'rgba(255,255,255,0.45)';
      const MINOR_C   = 'rgba(255,255,255,0.25)';
      const TEXT_C    = 'rgba(242,241,230,0.80)';
      const TEXT_DIM  = 'rgba(242,241,230,0.45)';
      const afs       = ar._fontSize;
      const afsMinor  = Math.max(6, afs - 2);
      // Approximate monospace character width for overlap guard
      const approxW   = (label, fsize) => label.length * fsize * 0.57;

      const { leftVal, rightVal } = ar._valueDomain();
      const minVal = Math.min(leftVal, rightVal);
      const maxVal = Math.max(leftVal, rightVal);
      const targetMajor = Math.max(2, Math.round((plotRight - plotLeft) / 90));

      let majorTicks, minorTicks;
      if (ar._dateMode) {
        const majI = ar._majorInterval, minI = ar._minorInterval;
        majorTicks = majI === 'auto'
          ? AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor)
          : AxisRenderer._calendarTicksForInterval(minVal, maxVal, majI);
        if (minI === 'off') {
          minorTicks = [];
        } else {
          const all = minI === 'auto'
            ? AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor * 5)
            : AxisRenderer._calendarTicksForInterval(minVal, maxVal, minI);
          const ms = new Set(majorTicks.map(t => t.toFixed(8)));
          minorTicks = all.filter(t => !ms.has(t.toFixed(8)));
        }
      } else {
        majorTicks = AxisRenderer._niceTicks(leftVal, rightVal, targetMajor);
        const minorAll = majorTicks.length > 1
          ? AxisRenderer._niceTicks(leftVal, rightVal, targetMajor * 5) : [];
        const ms = new Set(majorTicks.map(t => t.toPrecision(10)));
        minorTicks = minorAll.filter(t => !ms.has(t.toPrecision(10)));
      }

      // Baseline
      axisParts.push(`<line x1="${f(plotLeft + AX)}" y1="${f(AY + Y_BASE + 0.5)}" x2="${f(plotRight + AX)}" y2="${f(AY + Y_BASE + 0.5)}" stroke="${TICK_C}" stroke-width="1"/>`);

      const minorLabelFmt  = ar._dateMode ? ar._minorLabelFormat : 'off';
      const showMinorLabel = minorLabelFmt !== 'off';
      let minorLabelRight  = -Infinity;

      for (const val of minorTicks) {
        const sx = ar._valToScreenX(val) + AX;
        if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
        axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MINOR_H)}" stroke="${MINOR_C}" stroke-width="1"/>`);
        if (showMinorLabel) {
          const label = ar._formatDateVal(val, minorLabelFmt, ar._minorInterval);
          const tw    = approxW(label, afsMinor);
          const lx2   = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(plotRight + AX - tw / 2 - 1, sx));
          if (lx2 - tw / 2 > minorLabelRight + 2) {
            axisParts.push(`<text x="${f(lx2)}" y="${f(AY + Y_BASE + 1 + MINOR_H + 2)}" dominant-baseline="hanging" text-anchor="middle" font-family="monospace" font-size="${afsMinor}px" fill="${TEXT_DIM}">${_svgTextEsc(label)}</text>`);
            minorLabelRight = lx2 + tw / 2;
          }
        }
      }

      const majorLabelFmt  = ar._dateMode ? ar._majorLabelFormat : 'auto';
      const showMajorLabel = majorLabelFmt !== 'off';
      let majorLabelRight  = -Infinity;

      for (const val of majorTicks) {
        const sx = ar._valToScreenX(val) + AX;
        if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
        axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MAJOR_H)}" stroke="${TICK_C}" stroke-width="1"/>`);
        if (showMajorLabel) {
          let label;
          if (ar._dateMode) {
            label = majorLabelFmt === 'auto'
              ? AxisRenderer._formatDecYear(val, majorTicks)
              : ar._formatDateVal(val, majorLabelFmt, ar._majorInterval);
          } else {
            label = AxisRenderer._formatValue(val);
          }
          const tw  = approxW(label, afs);
          const lx2 = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(plotRight + AX - tw / 2 - 1, sx));
          if (lx2 - tw / 2 > majorLabelRight + 2) {
            axisParts.push(`<text x="${f(lx2)}" y="${f(AY + Y_BASE + 1 + MAJOR_H + 2)}" dominant-baseline="hanging" text-anchor="middle" font-family="monospace" font-size="${afs}px" fill="${TEXT_C}">${_svgTextEsc(label)}</text>`);
            majorLabelRight = lx2 + tw / 2;
          }
        }
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <defs>
    ${defs.join('\n    ')}
  </defs>
  ${bgParts.join('\n  ')}
  ${legendParts.join('\n  ')}
  <g clip-path="url(#tc)" stroke="${_esc(bc)}" stroke-width="${bw}" fill="none" stroke-linecap="round">
    ${branchParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${circleParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${labelParts.join('\n    ')}
  </g>
  ${axisParts.join('\n  ')}
</svg>`;
  }

  /** Repopulate annotation dropdowns (tipColourBy, nodeColourBy, legendAnnotEl) after schema change. */
  function _refreshAnnotationUIs(schema) {
    function repopulate(sel) {
      const prev = sel.value;
      while (sel.options.length > 1) sel.remove(1);
      for (const [name, def] of schema) {
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
          sel.appendChild(opt);
        }
      }
      sel.disabled = schema.size === 0;
      sel.value = [...sel.options].some(o => o.value === prev) ? prev : '';
    }
    repopulate(tipColourBy);
    repopulate(nodeColourBy);
    repopulate(legendAnnotEl);
  }

  // ── Tree loading ──────────────────────────────────────────────────────────

  let graph            = null;  // PhyloGraph (adjacency-list model)
  let currentOrder     = null;  // null | 'asc' | 'desc'
  let controlsBound    = false;
  let _cachedMidpoint  = null;  // cached midpointRootGraph() result; cleared on every tree change
  let isExplicitlyRooted = false; // true when root node carries annotations — rerooting disabled

  // ── Axis subtree-tracking state ───────────────────────────────────────────
  let _axisIsTimedTree = false;

  async function loadTree(text, filename) {
    setModalLoading(true);
    setModalError(null);
    // Yield to the browser so the spinner renders before heavy parsing
    await new Promise(r => setTimeout(r, 0));

    try {
      let parsedRoot = null;

      // Try NEXUS first; fall back to bare Newick
      const nexusTrees = parseNexus(text);
      if (nexusTrees.length > 0) {
        parsedRoot = nexusTrees[0].root;
      } else {
        const trimmed = text.trim();
        if (trimmed.startsWith('(')) {
          parsedRoot = parseNewick(trimmed);
        } else {
          throw new Error('No trees found. File must be in NEXUS or Newick format.');
        }
      }

      graph           = fromNestedRoot(parsedRoot);
      renderer.hiddenNodeIds = graph.hiddenNodeIds;  // keep renderer in sync (same Set reference)
      renderer.graph  = graph;
      currentOrder    = null;
      _cachedMidpoint = null;
      isExplicitlyRooted = graph.rooted;

      // Disable reroot / midpoint-root for explicitly rooted trees.
      // (bindControls may not have run yet on first load; the selector always works.)
      const btnMPR = document.getElementById('btn-midpoint-root');
      btnMPR.disabled = isExplicitlyRooted;
      btnMPR.title    = isExplicitlyRooted
        ? 'Tree is explicitly rooted (root has annotations) — rerooting disabled'
        : 'Midpoint root (⌘M)';
      const btnRR = document.getElementById('btn-reroot');
      if (isExplicitlyRooted) {
        btnRR.disabled = true;
        btnRR.title    = 'Tree is explicitly rooted (root has annotations) — rerooting disabled';
      } else {
        btnRR.title = 'Reroot tree at selection';
      }

      // Populate the "Colour by" dropdown from the annotation schema
      // (exclude list types since they can't be coloured directly).
      const schema = graph.annotationSchema;
      while (tipColourBy.options.length > 1) tipColourBy.remove(1);
      for (const [name, def] of schema) {
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          tipColourBy.appendChild(opt);
        }
      }
      tipColourBy.value    = '';
      tipColourBy.disabled = schema.size === 0;

      while (nodeColourBy.options.length > 1) nodeColourBy.remove(1);
      for (const [name, def] of schema) {
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          nodeColourBy.appendChild(opt);
        }
      }
      nodeColourBy.value    = '';
      nodeColourBy.disabled = schema.size === 0;

      // Populate the legend annotation dropdown with the same set of annotations.
      while (legendAnnotEl.options.length > 1) legendAnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          legendAnnotEl.appendChild(opt);
        }
      }
      legendAnnotEl.value    = '';
      legendAnnotEl.disabled = schema.size === 0;

      // Restore annotation-dependent settings: only apply if the key still exists in this tree.
      const _hasAnnot = (key) => key && schema.has(key) && schema.get(key).dataType !== 'list';
      tipColourBy.value   = _hasAnnot(_saved.tipColourBy)      ? _saved.tipColourBy      : '';
      nodeColourBy.value  = _hasAnnot(_saved.nodeColourBy)     ? _saved.nodeColourBy     : '';
      legendAnnotEl.value = _hasAnnot(_saved.legendAnnotation) ? _saved.legendAnnotation : '';
      // Restore saved node order.
      if (_saved.nodeOrder === 'asc' || _saved.nodeOrder === 'desc') {
        const asc = _saved.nodeOrder === 'asc';
        reorderGraph(graph, asc);
        currentOrder = _saved.nodeOrder;
      }

      // Pass schema to the renderer so it can build colour scales.
      renderer.setAnnotationSchema(schema);
      renderer.setTipColourBy(tipColourBy.value || null);
      renderer.setNodeColourBy(nodeColourBy.value || null);
      applyLegend();   // rebuild legend with new data (may clear it)
      const layout = computeLayoutFromGraph(graph);
      renderer.setData(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      // ── Axis renderer setup ───────────────────────────────────────────────
      // Detect time-scaled tree: root AND all nodes must carry a 'height' annotation.
      const _isTimedTree = (graph.root.annotations && 'height' in graph.root.annotations) &&
                           graph.nodes.every(n => 'height' in n.annotations);
      // For timed trees, root height = layout.maxX (root sits at x=0, most divergent tip at x=maxX).
      const _rootHeight  = _isTimedTree ? layout.maxX : 0;
      axisRenderer.setTreeParams({ maxX: layout.maxX, isTimedTree: _isTimedTree, rootHeight: _rootHeight });

      // Populate date annotation dropdown with all categorical/integer annotations
      // so the user can pick whichever annotation holds their date values.
      while (axisDateAnnotEl.options.length > 1) axisDateAnnotEl.remove(1);
      if (_isTimedTree) {
        for (const [name, def] of schema) {
          if (def.dataType === 'categorical' || def.dataType === 'integer' || def.dataType === 'real') {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            axisDateAnnotEl.appendChild(opt);
          }
        }
      }
      // Show the date row whenever the tree is timed; disable it if no tree loaded.
      axisDateRow.style.display = _isTimedTree ? 'flex' : 'none';
      axisDateAnnotEl.disabled  = !_isTimedTree;

      // Restore saved date annotation (only if this tree is timed and the key exists)
      const _savedAxisDate = _saved.axisDateAnnotation || '';
      const _canRestoreDate = _isTimedTree && _savedAxisDate &&
                              [...axisDateAnnotEl.options].some(o => o.value === _savedAxisDate);
      axisDateAnnotEl.value = _canRestoreDate ? _savedAxisDate : '';
      if (_canRestoreDate) axisRenderer.setDateAnchor(_savedAxisDate, layout.nodeMap, layout.maxX);
      else                 axisRenderer.setDateAnchor(null, layout.nodeMap, layout.maxX);

      // Capture full-tree axis params for subtree-tracking.
      _axisIsTimedTree = _isTimedTree;

      // Show tick-option rows only when a date annotation is actively selected.
      _showDateTickRows(!!axisDateAnnotEl.value);
      // Apply stored (or default) tick options to the renderer.
      applyTickOptions();

      // Reset navigation and selection state for the new tree
      renderer._navStack            = [];
      renderer._fwdStack            = [];
      renderer._viewSubtreeRootId   = null;
      renderer._branchSelectNode    = null;
      renderer._branchSelectX    = null;
      renderer._branchHoverNode  = null;
      renderer._branchHoverX     = null;
      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId       = null;
      if (renderer._onNavChange)          renderer._onNavChange(false, false);
      if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
      if (renderer._onNodeSelectChange)   renderer._onNodeSelectChange(false);

      if (!treeLoaded) {
        treeLoaded = true;
        btnModalClose.disabled      = false;
        btnImportAnnot.disabled     = false;
        btnExportTree.disabled      = false;
        btnExportGraphic.disabled   = false;
      }

      // Restore saved interaction mode before binding controls.
      renderer.setMode(_saved.mode === 'branches' ? 'branches' : 'nodes');

      if (!controlsBound) {
        bindControls();
        controlsBound = true;
      }

      // Sync button active states with restored settings.
      document.getElementById('btn-order-asc') .classList.toggle('active', currentOrder === 'desc');
      document.getElementById('btn-order-desc').classList.toggle('active', currentOrder === 'asc');
      const _restoredMode = renderer._mode;
      document.getElementById('btn-mode-nodes')   .classList.toggle('active', _restoredMode === 'nodes');
      document.getElementById('btn-mode-branches').classList.toggle('active', _restoredMode === 'branches');

      closeModal();
    } catch (err) {
      setModalError(err.message);
    }

    setModalLoading(false);
  }

  // ── applyOrder: hoisted to outer scope so loadTree can restore saved order ─

  function applyOrder(ascending) {
    const label = ascending ? 'asc' : 'desc';
    if (currentOrder === label) return;

    const isZoomed  = renderer._targetScaleY > renderer.minScaleY * 1.005;
    const zoomRatio = renderer._targetScaleY / renderer.minScaleY;
    const anchorId  = isZoomed ? renderer.nodeIdAtViewportCenter() : null;

    reorderGraph(graph, ascending);
    const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
    renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

    if (isZoomed && anchorId) {
      const H          = renderer.canvas.clientHeight;
      const newScaleY  = renderer.minScaleY * zoomRatio;
      const anchorNode = layout.nodeMap.get(anchorId);
      if (anchorNode) {
        const rawOffsetY = H / 2 - anchorNode.y * newScaleY;
        renderer._setTarget(rawOffsetY, newScaleY, /*immediate*/ false);
      }
    }

    currentOrder = label;
    document.getElementById('btn-order-asc') .classList.toggle('active', !ascending);
    document.getElementById('btn-order-desc').classList.toggle('active', ascending);
    saveSettings();
  }

  // ── Control bindings (set up once after the first tree loads) ─────────────

  function bindControls() {
    const btnBack      = document.getElementById('btn-back');
    const btnForward   = document.getElementById('btn-forward');
    const btnOrderAsc  = document.getElementById('btn-order-asc');
    const btnOrderDesc = document.getElementById('btn-order-desc');
    const btnReroot       = document.getElementById('btn-reroot');
    const btnRotate       = document.getElementById('btn-rotate');
    const btnRotateAll    = document.getElementById('btn-rotate-all');
    const btnHide         = document.getElementById('btn-hide');
    const btnShow         = document.getElementById('btn-show');
    const btnNodeInfo     = document.getElementById('btn-node-info');

    // ── Hide/Show helpers ─────────────────────────────────────────────────────
    function _selectedNodeId() {
      if (renderer._mrcaNodeId) return renderer._mrcaNodeId;
      if (renderer._selectedTipIds.size === 1) return [...renderer._selectedTipIds][0];
      return null;
    }

    // Graph DFS: count visible (non-hidden) tips in the subtree rooted at gStartIdx,
    // treating extraHiddenId as additionally hidden (used to test a hypothetical hide).
    function _graphVisibleTipCount(gStartIdx, gFromIdx, extraHiddenId) {
      let count = 0;
      const stack = [{ ni: gStartIdx, fi: gFromIdx }];
      while (stack.length) {
        const { ni, fi } = stack.pop();
        const gnode = graph.nodes[ni];
        if (graph.hiddenNodeIds.has(gnode.origId) || gnode.origId === extraHiddenId) continue;
        const children = gnode.adjacents.filter(a => a !== fi);
        if (children.length === 0) {
          count++;
        } else {
          for (const c of children) stack.push({ ni: c, fi: ni });
        }
      }
      return count;
    }

    function canHide() {
      if (!graph) return false;
      const nodeId = _selectedNodeId();
      if (!nodeId || !renderer.nodeMap) return false;
      const node = renderer.nodeMap.get(nodeId);
      if (!node || !node.parentId) return false; // root (or subtree root)
      if (graph.hiddenNodeIds.has(nodeId)) return false; // already hidden
      // Parent must keep at least 1 other visible child after hiding.
      const parent = renderer.nodeMap.get(node.parentId);
      if (!parent || parent.children.filter(cid => cid !== nodeId).length < 1) return false;
      // Guard: each branch of the current view root must keep ≥1 visible tip.
      const viewSubtreeRootId = renderer._viewSubtreeRootId;
      if (viewSubtreeRootId) {
        // Subtree view: each child branch of the subtree root must keep ≥1 visible tip.
        const subtreeIdx = graph.origIdToIdx.get(viewSubtreeRootId);
        if (subtreeIdx !== undefined) {
          for (const adjIdx of graph.nodes[subtreeIdx].adjacents.slice(1)) {
            if (_graphVisibleTipCount(adjIdx, subtreeIdx, nodeId) === 0) return false;
          }
        }
        return true;
      }
      // Full tree: both sides of the global root must keep ≥1 visible tip.
      const { nodeA, nodeB, lenA } = graph.root;
      let countA, countB;
      if (lenA === 0) {
        // nodeA is the real root; side A = all subtrees of nodeA except nodeB's branch.
        countA = 0;
        for (const adj of graph.nodes[nodeA].adjacents) {
          if (adj !== nodeB) countA += _graphVisibleTipCount(adj, nodeA, nodeId);
        }
        countB = _graphVisibleTipCount(nodeB, nodeA, nodeId);
      } else {
        // Virtual root between nodeA and nodeB.
        countA = _graphVisibleTipCount(nodeA, nodeB, nodeId);
        countB = _graphVisibleTipCount(nodeB, nodeA, nodeId);
      }
      if (countA === 0 || countB === 0) return false;
      return true;
    }

    // Graph DFS: does the subtree of graphNode (going away from fromIdx) contain
    // any entry in hiddenNodeIds?
    function _graphSubtreeHasHidden(gStartIdx, gFromIdx) {
      const stack = [{ ni: gStartIdx, fi: gFromIdx }];
      while (stack.length) {
        const { ni, fi } = stack.pop();
        for (const adjIdx of graph.nodes[ni].adjacents) {
          if (adjIdx === fi) continue;
          if (graph.hiddenNodeIds.has(graph.nodes[adjIdx].origId)) return true;
          stack.push({ ni: adjIdx, fi: ni });
        }
      }
      return false;
    }

    function _resolveGraphStart(nodeId) {
      // Returns { gIdx, gFromIdx } for a layout node id, accounting for root.
      const gIdx = graph.origIdToIdx.get(nodeId);
      if (gIdx === undefined) return null; // virtual root
      const { nodeA, lenA } = graph.root;
      const isRoot = lenA === 0 && gIdx === nodeA;
      const gFromIdx = isRoot ? -1 : graph.nodes[gIdx].adjacents[0];
      return { gIdx, gFromIdx };
    }

    function canShow() {
      if (!graph || !graph.hiddenNodeIds.size) return false;
      const nodeId = _selectedNodeId();
      const viewSubtreeRootId = renderer._viewSubtreeRootId;
      if (viewSubtreeRootId) {
        // Subtree view: only care about hidden nodes within this subtree.
        const subtreeIdx = graph.origIdToIdx.get(viewSubtreeRootId);
        if (subtreeIdx === undefined) return false;
        const fromIdx = graph.nodes[subtreeIdx].adjacents[0] ?? -1;
        if (!nodeId) return _graphSubtreeHasHidden(subtreeIdx, fromIdx);
        const gs = _resolveGraphStart(nodeId);
        if (!gs) return false;
        return _graphSubtreeHasHidden(gs.gIdx, gs.gFromIdx);
      }
      // Full tree view.
      if (!nodeId) return true; // no selection — any hidden nodes count
      const gs = _resolveGraphStart(nodeId);
      if (!gs) return graph.hiddenNodeIds.size > 0; // virtual root — any hidden counts
      return _graphSubtreeHasHidden(gs.gIdx, gs.gFromIdx);
    }
    const btnMidpointRoot  = document.getElementById('btn-midpoint-root');
    // isExplicitlyRooted is read dynamically (closured from outer scope) so
    // subsequent tree loads automatically pick up the new value.
    btnMidpointRoot.disabled = isExplicitlyRooted;
    document.getElementById('btn-zoom-in') .addEventListener('click', () => renderer.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => renderer.zoomOut());

    renderer._onNavChange = (canBack, canFwd) => {
      btnBack.disabled    = !canBack;
      btnForward.disabled = !canFwd;
    };

    renderer._onBranchSelectChange = (hasSelection) => {
      if (renderer._mode === 'branches') btnReroot.disabled = isExplicitlyRooted || !hasSelection;
    };
    renderer._onNodeSelectChange = (hasSelection) => {
      if (renderer._mode === 'nodes') btnReroot.disabled = isExplicitlyRooted || !hasSelection;
      // Rotate is enabled whenever there is any selection in nodes mode.
      const canRotate = renderer._mode === 'nodes' && hasSelection;
      btnRotate.disabled    = !canRotate;
      btnRotateAll.disabled = !canRotate;
      btnHide.disabled      = !canHide();
      btnShow.disabled      = !canShow();
      btnNodeInfo.disabled  = !hasSelection;
    };

    btnBack.addEventListener('click',    () => renderer.navigateBack());
    btnForward.addEventListener('click', () => renderer.navigateForward());

    btnOrderAsc.addEventListener('click',  () => applyOrder(false));
    btnOrderDesc.addEventListener('click', () => applyOrder(true));

    // ── Rotate node ──────────────────────────────────────────────────────────
    // btn-rotate     → reverse direct children of the selected internal node.
    // btn-rotate-all → reverse children at every level of the subtree.
    // Both clear the global auto-ordering so the manual order is preserved.
    function applyRotate(recursive) {
      // Prefer the MRCA (≥2 tips selected or internal node clicked directly).
      // Fall back to the parent of a single selected tip.
      let nodeId = renderer._mrcaNodeId;
      if (!nodeId && renderer._selectedTipIds.size === 1) {
        const tipId   = [...renderer._selectedTipIds][0];
        const tipNode = renderer.nodeMap.get(tipId);
        nodeId = tipNode?.parentId ?? null;
      }
      if (!nodeId) return;

      rotateNodeGraph(graph, nodeId, recursive);

      // Disable global auto-ordering — the manual rotation must be preserved.
      currentOrder = null;
      btnOrderAsc .classList.remove('active');
      btnOrderDesc.classList.remove('active');

      // Recompute layout and animate.
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      saveSettings();
    }

    btnRotate.addEventListener('click',    () => applyRotate(false));
    btnRotateAll.addEventListener('click', () => applyRotate(true));

    // ── Hide / Show ───────────────────────────────────────────────────────────
    function applyHide() {
      if (!canHide()) return;
      const nodeId = _selectedNodeId();
      if (!nodeId) return;
      graph.hiddenNodeIds.add(nodeId);
      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId = null;
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(false);
      // Forward history may reference nodes that are now hidden — invalidate it.
      renderer._fwdStack = [];
      if (renderer._onNavChange) renderer._onNavChange(renderer._navStack.length > 0, false);
      // Hiding changes tip counts so any auto-ordering is no longer meaningful.
      currentOrder = null;
      btnOrderAsc .classList.remove('active');
      btnOrderDesc.classList.remove('active');
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      renderer.fitToWindow();
    }

    function applyShow() {
      if (!canShow()) return;
      const nodeId  = _selectedNodeId();
      const viewSubtreeRootId = renderer._viewSubtreeRootId;

      if (viewSubtreeRootId) {
        // Subtree view: reveal hidden nodes only within this subtree.
        const startId = nodeId ?? viewSubtreeRootId;
        const startIdx = graph.origIdToIdx.get(startId);
        if (startIdx !== undefined) {
          const fromIdx = graph.nodes[startIdx].adjacents[0] ?? -1;
          function revealSubtree(ni, fi) {
            graph.hiddenNodeIds.delete(graph.nodes[ni].origId);
            for (const adj of graph.nodes[ni].adjacents) {
              if (adj !== fi) revealSubtree(adj, ni);
            }
          }
          revealSubtree(startIdx, fromIdx);
        }
      } else if (!nodeId) {
        // Full tree, no selection: clear all hidden nodes.
        graph.hiddenNodeIds.clear();
      } else {
        // Full tree, selection: reveal all hidden nodes in the selected subtree.
        function revealAll(gnodeIdx, fromIdx) {
          for (const adjIdx of graph.nodes[gnodeIdx].adjacents) {
            if (adjIdx === fromIdx) continue;
            graph.hiddenNodeIds.delete(graph.nodes[adjIdx].origId);
            revealAll(adjIdx, gnodeIdx);
          }
        }
        const gs = _resolveGraphStart(nodeId);
        if (gs) {
          revealAll(gs.gIdx, gs.gFromIdx);
        } else {
          revealAll(graph.root.nodeA, graph.root.nodeB);
          revealAll(graph.root.nodeB, graph.root.nodeA);
        }
      }

      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId = null;
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(false);
      // Showing nodes changes tip counts so any auto-ordering is no longer meaningful.
      currentOrder = null;
      btnOrderAsc .classList.remove('active');
      btnOrderDesc.classList.remove('active');
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      renderer.fitToWindow();
    }

    btnHide.addEventListener('click', () => applyHide());
    btnShow.addEventListener('click', () => applyShow());

    // Mode menu
    const btnModeNodes    = document.getElementById('btn-mode-nodes');
    const btnModeBranches = document.getElementById('btn-mode-branches');
    const applyMode = (mode) => {
      renderer.setMode(mode);
      btnModeNodes.classList.toggle('active',    mode === 'nodes');
      btnModeBranches.classList.toggle('active', mode === 'branches');
      saveSettings();
    };
    btnModeNodes.addEventListener('click',    () => applyMode('nodes'));
    btnModeBranches.addEventListener('click', () => applyMode('branches'));

    // ── Shared rerooting logic (all three methods funnel through here) ────────
    function applyReroot(childNodeId, distFromParent) {
      // Mutate graph in-place (O(depth) parent-pointer flips, no allocation).
      rerootOnGraph(graph, childNodeId, distFromParent);

      _cachedMidpoint = null;

      if (currentOrder === 'asc')  reorderGraph(graph, true);
      if (currentOrder === 'desc') reorderGraph(graph, false);

      renderer._navStack            = [];
      renderer._fwdStack            = [];
      renderer._viewSubtreeRootId   = null;
      renderer._branchSelectNode    = null;
      renderer._branchSelectX       = null;
      renderer._branchHoverNode     = null;
      renderer._branchHoverX        = null;
      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId          = null;
      if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
      if (renderer._onNodeSelectChange)   renderer._onNodeSelectChange(false);
      btnReroot.disabled = true;

      const layout = computeLayoutFromGraph(graph);
      renderer.setDataCrossfade(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
    }

    // Reroot button: branch-click position or node/MRCA midpoint
    btnReroot.addEventListener('click', () => {
      let targetNode, distFromParent;

      if (renderer._mode === 'branches') {
        const selNode = renderer._branchSelectNode;
        const selX    = renderer._branchSelectX;
        if (!selNode || selX === null) return;
        const parentLayoutNode = renderer.nodeMap.get(selNode.parentId);
        if (!parentLayoutNode) return;
        targetNode     = selNode;
        distFromParent = selX - parentLayoutNode.x;
      } else {
        // Nodes mode: single tip → that node; ≥2 tips → their MRCA.
        let nodeId;
        if (renderer._selectedTipIds.size === 1) {
          nodeId = [...renderer._selectedTipIds][0];
        } else if (renderer._mrcaNodeId) {
          nodeId = renderer._mrcaNodeId;
        } else {
          return;
        }
        const layoutNode = renderer.nodeMap.get(nodeId);
        if (!layoutNode || !layoutNode.parentId) return;
        const parentLayoutNode = renderer.nodeMap.get(layoutNode.parentId);
        if (!parentLayoutNode) return;
        targetNode     = layoutNode;
        distFromParent = (layoutNode.x - parentLayoutNode.x) / 2;
      }

      if (!targetNode) return;
      applyReroot(targetNode.id, distFromParent);
    });

    function applyMidpointRoot() {
      if (btnMidpointRoot.disabled) return;
      if (!_cachedMidpoint) _cachedMidpoint = midpointRootGraph(graph);
      const { childNodeId, distFromParent } = _cachedMidpoint;
      _cachedMidpoint = null;  // tree is about to change — old result is no longer valid
      applyReroot(childNodeId, distFromParent);
    }

    btnMidpointRoot.addEventListener('click', () => applyMidpointRoot());

    // ── Node Info (Cmd+I) ──────────────────────────────────────────────────

    function showNodeInfo() {
      // Determine which node is selected
      let nodeId = renderer._mrcaNodeId;
      if (!nodeId && renderer._selectedTipIds && renderer._selectedTipIds.size === 1) {
        nodeId = [...renderer._selectedTipIds][0];
      }
      if (!nodeId || !renderer.nodeMap) return;
      const node = renderer.nodeMap.get(nodeId);
      if (!node) return;

      const parent    = node.parentId ? renderer.nodeMap.get(node.parentId) : null;
      const branchLen = parent != null ? node.x - parent.x : node.x;
      const height    = renderer._globalHeightMap
        ? (renderer._globalHeightMap.get(node.id) ?? (renderer.maxX - node.x))
        : (renderer.maxX - node.x);

      const rows = [];
      if (node.isTip && node.name)  rows.push(['Name',         node.name]);
      if (!node.isTip && node.name) rows.push(['Name',         node.name]);
      if (node.label)               rows.push(['Label',        String(node.label)]);
      rows.push(['Divergence',   node.x.toFixed(6)]);
      rows.push(['Height',       height.toFixed(6)]);
      rows.push(['Branch length', branchLen.toFixed(6)]);
      if (!node.isTip) {
        const tipCount = renderer._getDescendantTipIds
          ? renderer._getDescendantTipIds(node.id).length
          : '—';
        rows.push(['Tips below', tipCount]);
      }
      const annots = node.annotations || {};
      const annotEntries = Object.entries(annots);
      if (annotEntries.length > 0) {
        rows.push([null, null]); // divider
        for (const [k, v] of annotEntries) {
          let display;
          if (Array.isArray(v)) {
            display = `{${v.map(x => (typeof x === 'number' ? x.toFixed(6) : String(x))).join(', ')}}`;
          } else if (typeof v === 'number') {
            display = v.toFixed(6);
          } else {
            display = String(v);
          }
          rows.push([k, display]);
        }
      }

      // Title
      const tipCount2 = (!node.isTip && renderer._getDescendantTipIds)
        ? renderer._getDescendantTipIds(node.id).length
        : null;
      const titleEl = document.getElementById('node-info-title');
      titleEl.textContent = node.isTip
        ? (node.name || 'Tip node')
        : `Internal node (${tipCount2 != null ? tipCount2 + ' tips' : 'internal'})`;

      // Build table
      const body = document.getElementById('node-info-body');
      const tbl  = document.createElement('table');
      tbl.style.cssText = 'width:100%;border-collapse:collapse;';
      for (const [label, value] of rows) {
        const tr = tbl.insertRow();
        if (label === null) {
          // Annotations divider
          const td = tr.insertCell();
          td.colSpan = 2;
          td.style.cssText = 'padding:6px 0 2px;';
          const div = document.createElement('div');
          div.style.cssText = 'display:flex;align-items:center;gap:6px;color:rgba(230,213,149,0.5);font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;';
          div.innerHTML = '<span style="flex:0 0 auto">Annotations</span><span style="flex:1;border-top:1px solid rgba(230,213,149,0.2);display:inline-block"></span>';
          td.appendChild(div);
        } else {
          const td1 = tr.insertCell();
          const td2 = tr.insertCell();
          td1.style.cssText = 'color:rgba(230,213,149,0.7);padding:2px 14px 2px 0;white-space:nowrap;vertical-align:top;';
          td2.style.cssText = 'color:rgba(242,241,230,0.88);padding:2px 0;word-break:break-all;';
          td1.textContent = label;
          td2.textContent = value;
        }
      }
      body.innerHTML = '';
      body.appendChild(tbl);

      const overlay = document.getElementById('node-info-overlay');
      overlay.style.display = 'flex';
    }

    btnNodeInfo.addEventListener('click', () => showNodeInfo());

    document.getElementById('node-info-close').addEventListener('click', () => {
      document.getElementById('node-info-overlay').style.display = 'none';
    });

    document.getElementById('node-info-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('node-info-overlay')) {
        document.getElementById('node-info-overlay').style.display = 'none';
      }
    });

    window.addEventListener('keydown', e => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); applyOrder(false); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); applyOrder(true);  }
      if (e.key === '[' || e.key === '<') { e.preventDefault(); renderer.navigateBack(); }
      if (e.key === ']' || e.key === '>') { e.preventDefault(); renderer.navigateForward(); }
      if (e.key === 'n' || e.key === 'N') { if (!e.altKey) return; e.preventDefault(); applyMode('nodes'); }
      if (e.key === 'b' || e.key === 'B') { if (!e.altKey) return; e.preventDefault(); applyMode('branches'); }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); applyMidpointRoot(); }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); showNodeInfo(); }
    });
  }

  // ── Always-active bindings ────────────────────────────────────────────────

  canvasBgColorEl.addEventListener('input', () => {
    renderer.setBgColor(canvasBgColorEl.value);
    saveSettings();
  });

  branchColorEl.addEventListener('input', () => {
    renderer.setBranchColor(branchColorEl.value);
    saveSettings();
  });

  branchWidthSlider.addEventListener('input', () => {
    document.getElementById('branch-width-value').textContent = branchWidthSlider.value;
    renderer.setBranchWidth(parseFloat(branchWidthSlider.value));
    saveSettings();
  });

  fontSlider.addEventListener('input', () => {
    renderer.setFontSize(parseInt(fontSlider.value));
    saveSettings();
  });

  labelColorEl.addEventListener('input', () => {
    renderer.setLabelColor(labelColorEl.value);
    saveSettings();
  });

  tipSlider.addEventListener('input', () => {
    renderer.setTipRadius(parseInt(tipSlider.value));
    saveSettings();
  });

  nodeSlider.addEventListener('input', () => {
    renderer.setNodeRadius(parseInt(nodeSlider.value));
    saveSettings();
  });

  tipShapeColorEl.addEventListener('input', () => {
    renderer.setTipShapeColor(tipShapeColorEl.value);
    saveSettings();
  });

  tipShapeBgEl.addEventListener('input', () => {
    renderer.setTipShapeBgColor(tipShapeBgEl.value);
    saveSettings();
  });

  nodeShapeColorEl.addEventListener('input', () => {
    renderer.setNodeShapeColor(nodeShapeColorEl.value);
    saveSettings();
  });

  nodeShapeBgEl.addEventListener('input', () => {
    renderer.setNodeShapeBgColor(nodeShapeBgEl.value);
    saveSettings();
  });

  nodeColourBy.addEventListener('change', () => {
    renderer.setNodeColourBy(nodeColourBy.value || null);
    saveSettings();
  });

  tipColourBy.addEventListener('change', () => {
    renderer.setTipColourBy(tipColourBy.value || null);
    saveSettings();
  });

  // ── Legend controls ───────────────────────────────────────────────────────

  function applyLegend() {
    const pos = legendShowEl.value;   // 'off' | 'left' | 'right'
    const key = legendAnnotEl.value || null;
    const W   = 180;   // legend canvas width in CSS pixels

    legendLeftCanvas.style.display  = pos === 'left'  ? 'block' : 'none';
    legendLeftCanvas.style.width    = W + 'px';
    legendRightCanvas.style.display = pos === 'right' ? 'block' : 'none';
    legendRightCanvas.style.width   = W + 'px';

    renderer.setLegend(pos === 'off' ? null : pos, key);
    saveSettings();
  }

  legendShowEl .addEventListener('change', applyLegend);
  legendAnnotEl.addEventListener('change', applyLegend);

  // ── Axis controls ─────────────────────────────────────────────────────────

  function applyAxis() {
    const on = axisShowEl.value === 'on';
    axisCanvas.style.display = on ? 'block' : 'none';
    axisRenderer.setVisible(on);
    // Resize the tree canvas so it fills the remaining space above/below the axis.
    renderer._resize();
    if (on) {
      // Draw immediately with current view state.
      axisRenderer.update(
        renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
        renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
        window.devicePixelRatio || 1,
      );
    }
    saveSettings();
  }

  axisShowEl.addEventListener('change', applyAxis);

  // ── Minor-interval options (depend on major) ──────────────────────────────

  function _updateMinorOptions(majorVal, keepVal) {
    const opts = {
      auto:     [['off','Off'],['auto','Auto']],
      decades:  [['off','Off'],['auto','Auto'],['years','Years'],['quarters','Quarters'],['months','Months']],
      years:    [['off','Off'],['auto','Auto'],['quarters','Quarters'],['months','Months']],
      quarters: [['off','Off'],['auto','Auto'],['months','Months'],['weeks','Weeks']],
      months:   [['off','Off'],['auto','Auto'],['weeks','Weeks'],['days','Days']],
      weeks:    [['off','Off'],['auto','Auto'],['days','Days']],
      days:     [['off','Off']],
    };
    const list = opts[majorVal] || [['off','Off'],['auto','Auto']];
    axisMinorIntervalEl.innerHTML = '';
    for (const [val, label] of list) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      axisMinorIntervalEl.appendChild(opt);
    }
    axisMinorIntervalEl.value = list.some(o => o[0] === keepVal) ? keepVal : 'off';
  }

  function applyTickOptions() {
    axisRenderer.setTickOptions({
      majorInterval:    axisMajorIntervalEl.value,
      minorInterval:    axisMinorIntervalEl.value,
      majorLabelFormat: axisMajorLabelEl.value,
      minorLabelFormat: axisMinorLabelEl.value,
    });
    axisRenderer.update(
      renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
      renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
      window.devicePixelRatio || 1,
    );
    saveSettings();
  }

  function _showDateTickRows(visible) {
    const d = visible ? 'flex' : 'none';
    axisMajorIntervalRow.style.display  = d;
    axisMinorIntervalRow.style.display  = d;
    axisMajorLabelRow.style.display     = d;
    axisMinorLabelRow.style.display     = d;
  }

  axisMajorIntervalEl.addEventListener('change', () => {
    _updateMinorOptions(axisMajorIntervalEl.value, axisMinorIntervalEl.value);
    applyTickOptions();
  });
  axisMinorIntervalEl.addEventListener('change', applyTickOptions);
  axisMajorLabelEl   .addEventListener('change', applyTickOptions);
  axisMinorLabelEl   .addEventListener('change', applyTickOptions);

  axisDateAnnotEl.addEventListener('change', () => {
    const key = axisDateAnnotEl.value || null;
    axisRenderer.setDateAnchor(key, renderer.nodeMap || new Map(), renderer.maxX);
    // If currently viewing a subtree, recompute its params using the new anchor.
    if (renderer._viewSubtreeRootId && renderer._onLayoutChange) {
      renderer._onLayoutChange(renderer.maxX, renderer._viewSubtreeRootId);
    }
    _showDateTickRows(!!key);
    axisRenderer.update(
      renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
      renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
      window.devicePixelRatio || 1,
    );
    saveSettings();
  });

  btnFit.addEventListener('click', () => renderer.fitToWindow());
  document.getElementById('btn-fit-labels').addEventListener('click', () => renderer.fitLabels());

  // Open button and Cmd/Ctrl-O keyboard shortcut reopen the modal
  document.getElementById('btn-open-tree').addEventListener('click', () => openModal());
  window.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      openModal();
    }
  });

})();

