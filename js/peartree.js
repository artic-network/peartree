import { parseNexus } from './treeio.js';
import { computeLayout, computeLayoutFrom, reorderTree, rerootTree } from './treeutils.js';
import { TreeRenderer } from './treerenderer.js';

(async () => {
  const canvas       = document.getElementById('tree-canvas');
  const loadingEl    = document.getElementById('loading');
  const loadingMsg   = document.getElementById('loading-msg');
  const errorEl      = document.getElementById('error');
  const fileInfoEl   = document.getElementById('file-info');
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

  try {
    loadingMsg.textContent = 'Fetching tree file…';
    const resp = await fetch('data/ebov.tree');
    if (!resp.ok) throw new Error(`HTTP ${resp.status} – could not load data/ebov.tree`);

    loadingMsg.textContent = 'Parsing NEXUS…';
    const text = await resp.text();

    const trees = parseNexus(text);
    if (!trees.length) throw new Error('No trees found in the NEXUS file.');

    loadingMsg.textContent = 'Computing layout…';
    // Give the browser a frame to update the UI
    await new Promise(r => setTimeout(r, 0));

    const { root: parsedRoot, tipNameMap } = trees[0];
    let root = parsedRoot;   // mutable – updated on every reroot
    const { nodes, nodeMap, maxX, maxY } = computeLayout(root);

    const tipCount = nodes.filter(n => n.isTip).length;
    fileInfoEl.textContent = `ebov.tree  ·  ${tipCount.toLocaleString()} taxa  ·  1 tree`;

    renderer.setData(nodes, nodeMap, maxX, maxY);
    renderer.setRawTree(root);

    loadingEl.style.display = 'none';

    // ── Control bindings (need root in scope) ──────────────────────────────

    const btnBack      = document.getElementById('btn-back');
    const btnForward   = document.getElementById('btn-forward');
    const btnOrderAsc  = document.getElementById('btn-order-asc');
    const btnOrderDesc = document.getElementById('btn-order-desc');
    const btnReroot    = document.getElementById('btn-reroot');

    renderer._onNavChange = (canBack, canFwd) => {
      btnBack.disabled    = !canBack;
      btnForward.disabled = !canFwd;
    };

    renderer._onBranchSelectChange = (hasSelection) => {
      btnReroot.disabled = !hasSelection;
    };

    btnBack.addEventListener('click',    () => renderer.navigateBack());
    btnForward.addEventListener('click', () => renderer.navigateForward());

    let currentOrder = null; // null | 'asc' | 'desc'

    function applyOrder(ascending) {
      const label = ascending ? 'asc' : 'desc';
      if (currentOrder === label) return; // already in this order

      // Snapshot zoom state before the reorder so we can restore it.
      const isZoomed  = renderer._targetScaleY > renderer.minScaleY * 1.005;
      const zoomRatio = renderer._targetScaleY / renderer.minScaleY;
      const anchorId  = isZoomed ? renderer.nodeIdAtViewportCenter() : null;

      reorderTree(root, ascending);
      const viewRoot = renderer._viewRawRoot || root;
      const layout = computeLayoutFrom(viewRoot);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      // If the tree was zoomed, restore the same vertical zoom level and
      // scroll so the previously-centred node sits at the viewport midpoint.
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

    // Reroot
    btnReroot.addEventListener('click', () => {
      const selNode = renderer._branchSelectNode;
      const selX    = renderer._branchSelectX;
      if (!selNode || selX === null) return;

      // Compute distFromParent in raw branch-length units.
      // Layout x values equal cumulative divergence from (sub)root, so the
      // difference between two layout x values IS the raw branch length.
      const parentLayoutNode = renderer.nodeMap.get(selNode.parentId);
      if (!parentLayoutNode) return;
      const distFromParent = selX - parentLayoutNode.x;

      // Reroot the raw tree.
      const newRoot = rerootTree(root, selNode.id, distFromParent);
      root = newRoot;

      // Re-apply any current ordering to the rerooted tree.
      if (currentOrder === 'asc')  reorderTree(root, true);
      if (currentOrder === 'desc') reorderTree(root, false);

      // Reset navigation, then load new layout. Stay in branches mode.
      renderer._navStack         = [];
      renderer._fwdStack         = [];
      renderer._viewRawRoot      = null;
      renderer._branchSelectNode = null;
      renderer._branchSelectX    = null;
      renderer._branchHoverNode  = null;
      renderer._branchHoverX     = null;
      if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
      renderer.setRawTree(root);

      const layout = computeLayout(root);
      renderer.setData(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      const tipCount2 = layout.nodes.filter(n => n.isTip).length;
      fileInfoEl.textContent = `ebov.tree  ·  ${tipCount2.toLocaleString()} taxa  ·  1 tree (rerooted)`;
    });

    window.addEventListener('keydown', e => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); applyOrder(false); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); applyOrder(true);  }
      if (e.key === '[' || e.key === '<') { e.preventDefault(); renderer.navigateBack(); }
      if (e.key === ']' || e.key === '>') { e.preventDefault(); renderer.navigateForward(); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); applyMode('nodes'); }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyMode('branches'); }
    });

  } catch (err) {
    errorEl.style.display = 'flex';
    errorEl.innerHTML = `<strong>Error loading tree</strong><br/>${err.message}<br/><br/>
      Make sure you are serving this page from the repository root via a local HTTP server,<br/>
      e.g. <code>npx serve .</code> or <code>python3 -m http.server</code>, so that <code>data/ebov.tree</code> can be fetched.`;
    loadingEl.style.display = 'none';
    return;
  }

  // ── Other control bindings ─────────────────────────────────────────────────

  fontSlider.addEventListener('input', () => {
    renderer.setFontSize(parseInt(fontSlider.value));
  });

  tipSlider.addEventListener('input', () => {
    renderer.setTipRadius(parseInt(tipSlider.value));
  });

  btnFit.addEventListener('click', () => renderer.fitToWindow());

  const btnFitLabels = document.getElementById('btn-fit-labels');
  btnFitLabels.addEventListener('click', () => renderer.fitLabels());

})();
