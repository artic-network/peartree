import { parseNexus } from './treeio.js';
import { computeLayout, computeLayoutFrom, reorderTree } from './treeutils.js';
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

  const renderer = new TreeRenderer(canvas);

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

    const { root, tipNameMap } = trees[0];
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

    renderer._onNavChange = (canBack, canFwd) => {
      btnBack.disabled    = !canBack;
      btnForward.disabled = !canFwd;
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
      renderer.setData(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

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

    window.addEventListener('keydown', e => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); applyOrder(false); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); applyOrder(true);  }
      if (e.key === '[' || e.key === '<') { e.preventDefault(); renderer.navigateBack(); }
      if (e.key === ']' || e.key === '>') { e.preventDefault(); renderer.navigateForward(); }
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

})();
