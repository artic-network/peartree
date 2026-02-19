import { parseNexus, parseNewick } from './treeio.js';
import { computeLayout, computeLayoutFrom, reorderTree, rerootTree, midpointRootTree } from './treeutils.js';
import { TreeRenderer } from './treerenderer.js';

(async () => {
  const canvas       = document.getElementById('tree-canvas');
  const loadingEl    = document.getElementById('loading');
  const fontSlider   = document.getElementById('font-size-slider');
  const tipSlider    = document.getElementById('tip-size-slider');
  const btnFit       = document.getElementById('btn-fit');

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
  let currentOrder     = null;  // null | 'asc' | 'desc'
  let controlsBound    = false;
  let _cachedMidpoint  = null;  // cached result of midpointRootTree(); invalidated on every tree change

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
      currentOrder    = null;
      _cachedMidpoint = null;

      const layout = computeLayout(root);
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

      if (!controlsBound) {
        bindControls();
        controlsBound = true;
      }

      closeModal();
    } catch (err) {
      setModalError(err.message);
    }

    setModalLoading(false);
  }

  // ── Control bindings (set up once after the first tree loads) ─────────────

  function bindControls() {
    const btnBack      = document.getElementById('btn-back');
    const btnForward   = document.getElementById('btn-forward');
    const btnOrderAsc  = document.getElementById('btn-order-asc');
    const btnOrderDesc = document.getElementById('btn-order-desc');
    const btnReroot       = document.getElementById('btn-reroot');
    const btnMidpointRoot  = document.getElementById('btn-midpoint-root');
    btnMidpointRoot.disabled = false;
    document.getElementById('btn-zoom-in') .addEventListener('click', () => renderer.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => renderer.zoomOut());

    renderer._onNavChange = (canBack, canFwd) => {
      btnBack.disabled    = !canBack;
      btnForward.disabled = !canFwd;
    };

    renderer._onBranchSelectChange = (hasSelection) => {
      if (renderer._mode === 'branches') btnReroot.disabled = !hasSelection;
    };
    renderer._onNodeSelectChange = (hasSelection) => {
      if (renderer._mode === 'nodes') btnReroot.disabled = !hasSelection;
    };

    btnBack.addEventListener('click',    () => renderer.navigateBack());
    btnForward.addEventListener('click', () => renderer.navigateForward());

    function applyOrder(ascending) {
      const label = ascending ? 'asc' : 'desc';
      if (currentOrder === label) return;

      const isZoomed  = renderer._targetScaleY > renderer.minScaleY * 1.005;
      const zoomRatio = renderer._targetScaleY / renderer.minScaleY;
      const anchorId  = isZoomed ? renderer.nodeIdAtViewportCenter() : null;

      reorderTree(root, ascending);
      const viewRoot = renderer._viewRawRoot || root;
      const layout = computeLayoutFrom(viewRoot);
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
      btnOrderAsc.classList.toggle('active',  !ascending);
      btnOrderDesc.classList.toggle('active', ascending);
    }

    btnOrderAsc.addEventListener('click',  () => applyOrder(false));
    btnOrderDesc.addEventListener('click', () => applyOrder(true));

    // Mode menu
    const btnModeNodes    = document.getElementById('btn-mode-nodes');
    const btnModeBranches = document.getElementById('btn-mode-branches');
    const applyMode = (mode) => {
      renderer.setMode(mode);
      btnModeNodes.classList.toggle('active',    mode === 'nodes');
      btnModeBranches.classList.toggle('active', mode === 'branches');
    };
    btnModeNodes.addEventListener('click',    () => applyMode('nodes'));
    btnModeBranches.addEventListener('click', () => applyMode('branches'));

    // ── Shared rerooting logic (all three methods funnel through here) ────────
    function applyReroot(childNodeId, distFromParent) {
      const newRoot = rerootTree(root, childNodeId, distFromParent);
      root            = newRoot;
      _cachedMidpoint = null;

      if (currentOrder === 'asc')  reorderTree(root, true);
      if (currentOrder === 'desc') reorderTree(root, false);

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

      const layout = computeLayout(root);
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
      if (!_cachedMidpoint) _cachedMidpoint = midpointRootTree(root);
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
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); applyMode('nodes'); }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyMode('branches'); }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); applyMidpointRoot(); }
    });
  }

  // ── Always-active bindings ────────────────────────────────────────────────

  fontSlider.addEventListener('input', () => {
    renderer.setFontSize(parseInt(fontSlider.value));
  });

  tipSlider.addEventListener('input', () => {
    renderer.setTipRadius(parseInt(tipSlider.value));
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

