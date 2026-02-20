import { parseNexus, parseNewick } from './treeio.js';
import { computeLayoutFrom, computeLayoutFromGraph, reorderTree, rerootTree, rotateNodeTree } from './treeutils.js';
import { fromNestedRoot, rerootOnGraph, reorderGraph, rotateNodeGraph, midpointRootGraph } from './phylograph.js';
import { TreeRenderer } from './treerenderer.js';

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
  const btnFit            = document.getElementById('btn-fit');
  const btnResetSettings  = document.getElementById('btn-reset-settings');

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
    legendShow:       'off',
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

  // ── Tree loading ──────────────────────────────────────────────────────────

  let root             = null;
  let graph            = null;  // PhyloGraph (adjacency-list model) – kept in sync with root
  let currentOrder     = null;  // null | 'asc' | 'desc'
  let controlsBound    = false;
  let _cachedMidpoint  = null;  // cached midpointRootGraph() result; cleared on every tree change
  let isExplicitlyRooted = false; // true when root node carries annotations — rerooting disabled

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

      root            = parsedRoot;
      graph           = fromNestedRoot(root);
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
        reorderTree(root, asc);
        currentOrder = _saved.nodeOrder;
      }

      // Pass schema to the renderer so it can build colour scales.
      renderer.setAnnotationSchema(schema);
      renderer.setTipColourBy(tipColourBy.value || null);
      renderer.setNodeColourBy(nodeColourBy.value || null);
      applyLegend();   // rebuild legend with new data (may clear it)
      const layout = computeLayoutFromGraph(graph);
      renderer.setData(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      renderer.setRawTree(root);

      // Reset navigation and selection state for the new tree
      renderer._navStack         = [];
      renderer._fwdStack         = [];
      renderer._viewRawRoot      = null;
      renderer._branchSelectNode = null;
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
        btnModalClose.disabled = false;
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
    reorderTree(root, ascending);
    const viewRoot = renderer._viewRawRoot;
    const layout = viewRoot ? computeLayoutFrom(viewRoot) : computeLayoutFromGraph(graph);
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
      rotateNodeTree(root, nodeId, recursive);

      // Disable global auto-ordering — the manual rotation must be preserved.
      currentOrder = null;
      btnOrderAsc .classList.remove('active');
      btnOrderDesc.classList.remove('active');

      // Recompute layout and animate.
      const viewRoot = renderer._viewRawRoot;
      const layout   = viewRoot
        ? computeLayoutFrom(viewRoot)
        : computeLayoutFromGraph(graph);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      saveSettings();
    }

    btnRotate.addEventListener('click',    () => applyRotate(false));
    btnRotateAll.addEventListener('click', () => applyRotate(true));

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

      // Keep nested root in sync — still needed by applyOrder and subtree
      // navigation (renderer._rawNodeMap) until Phases 4-6 migrate those paths.
      const newRoot = rerootTree(root, childNodeId, distFromParent);
      root            = newRoot;
      _cachedMidpoint = null;

      if (currentOrder === 'asc')  { reorderGraph(graph, true);  reorderTree(root, true);  }
      if (currentOrder === 'desc') { reorderGraph(graph, false); reorderTree(root, false); }

      renderer._navStack         = [];
      renderer._fwdStack         = [];
      renderer._viewRawRoot      = null;
      renderer._branchSelectNode = null;
      renderer._branchSelectX    = null;
      renderer._branchHoverNode  = null;
      renderer._branchHoverX     = null;
      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId       = null;
      if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
      if (renderer._onNodeSelectChange)   renderer._onNodeSelectChange(false);
      btnReroot.disabled = true;
      renderer.setRawTree(root);

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

    window.addEventListener('keydown', e => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); applyOrder(false); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); applyOrder(true);  }
      if (e.key === '[' || e.key === '<') { e.preventDefault(); renderer.navigateBack(); }
      if (e.key === ']' || e.key === '>') { e.preventDefault(); renderer.navigateForward(); }
      if (e.key === 'n' || e.key === 'N') { if (!e.altKey) return; e.preventDefault(); applyMode('nodes'); }
      if (e.key === 'b' || e.key === 'B') { if (!e.altKey) return; e.preventDefault(); applyMode('branches'); }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); applyMidpointRoot(); }
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

