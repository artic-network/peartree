// ─────────────────────────────────────────────────────────────────────────────
// Canvas renderer
// ─────────────────────────────────────────────────────────────────────────────

import { computeLayoutFrom } from './treeutils.js';

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────

export class Theme {
  constructor({
    fontSize         = 11,
    tipRadius        = 3,
    tipOutlineColor  = '#033940',
    branchColor      = '#F2F1E6',
    tipColor         = '#BF4B43',
    internalColor    = '#19A699',
    selectedRingColor  = '#E06961',
    mrcaRingColor      = '#19A699',
    labelColor         = '#F7EECA',
    dimLabelColor      = '#E6D595',
    selectedLabelColor = '#F2F1E6',
    bgColor          = '#02292E',
    paddingLeft      = 60,
    paddingTop       = 20,
    paddingBottom    = 20,
    elbowRadius      = 2,
    rootStubLength   = 20,
  } = {}) {
    this.fontSize          = fontSize;
    this.tipRadius         = tipRadius;
    this.tipOutlineColor   = tipOutlineColor;
    this.branchColor       = branchColor;
    this.tipColor          = tipColor;
    this.internalColor     = internalColor;
    this.selectedRingColor = selectedRingColor;
    this.mrcaRingColor     = mrcaRingColor;
    this.labelColor        = labelColor;
    this.dimLabelColor     = dimLabelColor;
    this.selectedLabelColor = selectedLabelColor;
    this.bgColor           = bgColor;
    this.paddingLeft       = paddingLeft;
    this.paddingTop        = paddingTop;
    this.paddingBottom     = paddingBottom;
    this.elbowRadius       = elbowRadius;
    this.rootStubLength    = rootStubLength;
  }
}

export const DEFAULT_THEME = new Theme();

// ─────────────────────────────────────────────────────────────────────────────
// Canvas renderer
// ─────────────────────────────────────────────────────────────────────────────

export class TreeRenderer {
  constructor(canvas, theme = DEFAULT_THEME, statusCanvas = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // Optional dedicated status-bar canvas
    this._statusCanvas = statusCanvas || null;
    this._statusCtx    = statusCanvas ? statusCanvas.getContext('2d') : null;

    // layout data
    this.nodes = null;
    this.nodeMap = null;
    this.maxX = 1;
    this.maxY = 1;

    // labelRightPad is measured after font is known
    this.labelRightPad = 200;

    // Apply theme (sets all rendering option properties)
    this.setTheme(theme, /*redraw*/ false);

    // X scale: always fills the viewport width – recomputed on resize / font change.
    this.scaleX = 1;
    this.offsetX = this.paddingLeft;      // animated x origin (normally = paddingLeft)
    this._targetOffsetX = this.paddingLeft;

    // Y scale: user-adjustable vertical zoom.
    //   minScaleY = fit-to-window (never allowed to go below this).
    //   offsetY   = screen-y for world-y = 0  (the scrolling state).
    this.scaleY = 1;
    this.minScaleY = 1;
    this.offsetY = 0;

    // interaction state
    this._dragging        = false;
    this._spaceDown       = false;
    this._lastY           = 0;
    this._dragStartOffsetY = 0;
    this._snapTimer       = null;
    this._hoveredNodeId   = null;
    this._selectedTipIds  = new Set();
    this._mrcaNodeId      = null;
    this._fitLabelsMode   = false;
    this._lastStatusMx    = null;  // cached mouse x for status bar redraws
    this._lastStatusMy    = null;  // cached mouse y for status bar redraws

    // Subtree navigation
    this._rawRoot     = null;   // full-tree raw node (set via setRawTree)
    this._rawNodeMap  = new Map(); // id → raw node
    this._viewRawRoot = null;   // null = showing full tree
    this._navStack    = [];     // [{rawNode, scaleY, offsetY}, …] – back history
    this._fwdStack    = [];     // forward history
    this._onNavChange = null;   // callback(canBack, canFwd) – wired by main code

    // animation targets (lerp toward these each frame)
    this._targetOffsetY = 0;
    this._targetScaleY  = 1;
    this._targetScaleX  = 1;   // animated horizontal scale
    this._animating     = false;

    this._rafId = null;
    this._dirty = true;

    this._setupEvents();
    this._loop();
  }

  /**
   * Apply a Theme instance, overwriting all rendering-option properties.
   * Pass redraw=false during construction to skip the draw call.
   */
  setTheme(theme = DEFAULT_THEME, redraw = true) {
    this.fontSize          = theme.fontSize;
    this.tipRadius         = theme.tipRadius;
    this.tipOutlineColor   = theme.tipOutlineColor;
    this.branchColor       = theme.branchColor;
    this.tipColor          = theme.tipColor;
    this.internalColor     = theme.internalColor;
    this.selectedRingColor = theme.selectedRingColor;
    this.mrcaRingColor     = theme.mrcaRingColor;
    this.labelColor        = theme.labelColor;
    this.dimLabelColor     = theme.dimLabelColor;
    this.selectedLabelColor = theme.selectedLabelColor;
    this.bgColor           = theme.bgColor;
    this.paddingLeft       = theme.paddingLeft;
    this.paddingTop        = theme.paddingTop;
    this.paddingBottom     = theme.paddingBottom;
    this.elbowRadius       = theme.elbowRadius;
    this.rootStubLength    = theme.rootStubLength;
    if (redraw && this.nodes) {
      this._measureLabels();
      this._updateScaleX();
      this._updateMinScaleY();
      this._dirty = true;
    }
  }

  setData(nodes, nodeMap, maxX, maxY) {
    this.nodes = nodes;
    this.nodeMap = nodeMap;
    this.maxX = maxX;
    this.maxY = maxY;
    this._measureLabels();
    this.fitToWindow();
    this._drawStatusBar(null);
  }

  setFontSize(sz) {
    this.fontSize = sz;
    this._measureLabels();
    this._updateScaleX();
    this._updateMinScaleY();
    if (this._fitLabelsMode) {
      // Re-apply fit-labels at the new font size, keeping the vertical centre stable.
      this.fitLabels();
    } else {
      // Preserve the current relative vertical zoom.
      const prevMin = this.minScaleY;
      const newScaleY = Math.max(this.minScaleY, this._targetScaleY * (this.minScaleY / prevMin));
      this._setTarget(this._targetOffsetY, newScaleY, true);
    }
    this._dirty = true;
  }

  setTipRadius(r) {
    this.tipRadius = r;
    this._measureLabels(); // label offset depends on tip radius
    this._updateScaleX();
    this._dirty = true;
  }

  /** Store the parsed raw tree so subtree navigation can re-run computeLayout. */
  setRawTree(rawRoot) {
    this._rawRoot    = rawRoot;
    this._rawNodeMap = new Map();
    const stack = [rawRoot];
    while (stack.length) {
      const n = stack.pop();
      this._rawNodeMap.set(n.id, n);
      if (n.children) for (const c of n.children) stack.push(c);
    }
  }

  /** Compute layout from rawNode, update all data, and animate viewport.
   *  Always uses computeLayoutFrom so the subtree root sits at x = 0. */
  _applyLayout(rawNode, immediate = false) {
    const { nodes, nodeMap, maxX, maxY } = computeLayoutFrom(rawNode);
    this.nodes   = nodes;
    this.nodeMap = nodeMap;
    this.maxX    = maxX;
    this.maxY    = maxY;
    this._measureLabels();
    this._updateScaleX(immediate);   // animated unless immediate
    this._updateMinScaleY();
    // Keep current zoom if subtree is still bigger than viewport; else fit.
    const newScaleY  = Math.max(this.minScaleY, this._targetScaleY);
    const newOffsetY = this.paddingTop + newScaleY * 0.5;
    this._setTarget(newOffsetY, newScaleY, immediate);
    this._dirty = true;
  }

  /** Snapshot the current view state for the nav stacks. */
  _currentViewState() {
    return { rawNode: this._viewRawRoot, scaleY: this._targetScaleY, offsetY: this._targetOffsetY };
  }

  /** Double-click on an internal layout node id → drill into its subtree. */
  navigateInto(layoutNodeId) {
    const rawNode    = this._rawNodeMap.get(layoutNodeId);
    if (!rawNode || !rawNode.children || rawNode.children.length === 0) return;

    // Capture screen position of the clicked node BEFORE layout swap.
    const fromNode = this.nodeMap.get(layoutNodeId);
    const px_old   = fromNode ? this.offsetX + fromNode.x * this.scaleX : this.paddingLeft;
    const py_old   = fromNode ? this.offsetY + fromNode.y * this.scaleY : this.canvas.clientHeight / 2;

    this._navStack.push(this._currentViewState());
    this._fwdStack      = [];
    this._viewRawRoot   = rawNode;
    this._selectedTipIds.clear();
    this._mrcaNodeId = null;

    // Compute new layout (root at x=0).
    const { nodes, nodeMap, maxX, maxY } = computeLayoutFrom(rawNode);
    this.nodes = nodes; this.nodeMap = nodeMap; this.maxX = maxX; this.maxY = maxY;
    this._measureLabels();
    this._updateScaleX(false);   // sets _targetScaleX/_targetOffsetX, keeps scaleX unchanged
    this._updateMinScaleY();
    const newScaleY  = Math.max(this.minScaleY, this._targetScaleY);
    const newOffsetY = this.paddingTop + newScaleY * 0.5;
    this._setTarget(newOffsetY, newScaleY, false);

    // Seed the animation START so the new root appears at the old screen position.
    const newRoot = this.nodes.find(n => !n.parentId);
    if (newRoot) {
      this.offsetX = px_old;                            // starts at old x, lerps to paddingLeft
      this.offsetY = py_old - newRoot.y * this.scaleY; // old scaleY still in effect
    }
    this._animating = true;
    this._dirty = true;
    if (this._onNavChange) this._onNavChange(true, false);
  }

  navigateBack() {
    if (!this._navStack.length) return;

    // Remember where the current root appears on screen.
    const curRootLayout = this.nodes ? this.nodes.find(n => !n.parentId) : null;
    const px_cur = this.offsetX;   // current root is always at offsetX (world x = 0)
    const py_cur = curRootLayout ? this.offsetY + curRootLayout.y * this.scaleY : this.canvas.clientHeight / 2;
    const curRootId = curRootLayout ? curRootLayout.id : null;

    this._fwdStack.push(this._currentViewState());
    const state         = this._navStack.pop();
    this._viewRawRoot   = state.rawNode;
    this._selectedTipIds.clear();
    this._mrcaNodeId = null;

    const rawNode = state.rawNode || this._rawRoot;
    const { nodes, nodeMap, maxX, maxY } = computeLayoutFrom(rawNode);
    this.nodes = nodes; this.nodeMap = nodeMap; this.maxX = maxX; this.maxY = maxY;
    this._measureLabels();
    this._updateScaleX(false);
    this._updateMinScaleY();
    this._setTarget(state.offsetY, state.scaleY, false);

    // Seed animation so the restored node appears where the current root was.
    if (curRootId) {
      const restoredNode = nodeMap.get(curRootId);
      if (restoredNode) {
        this.offsetX = px_cur - restoredNode.x * this.scaleX;
        this.offsetY = py_cur - restoredNode.y * this.scaleY;
      }
    }
    this._animating = true;
    this._dirty = true;
    if (this._onNavChange) this._onNavChange(this._navStack.length > 0, true);
  }

  navigateForward() {
    if (!this._fwdStack.length) return;

    // Peek at the forward state FIRST so we can find its root node in the
    // current layout (it's an internal node here, just like in navigateInto).
    const state      = this._fwdStack[this._fwdStack.length - 1];
    const fwdRawNode = state.rawNode || this._rawRoot;

    const fromNode = fwdRawNode && this.nodeMap ? this.nodeMap.get(fwdRawNode.id) : null;
    const px_old   = fromNode ? this.offsetX + fromNode.x * this.scaleX : this.paddingLeft;
    const py_old   = fromNode ? this.offsetY + fromNode.y * this.scaleY : this.canvas.clientHeight / 2;

    this._navStack.push(this._currentViewState());
    this._fwdStack.pop();
    this._viewRawRoot = state.rawNode;
    this._selectedTipIds.clear();
    this._mrcaNodeId = null;

    const { nodes, nodeMap, maxX, maxY } = computeLayoutFrom(fwdRawNode);
    this.nodes = nodes; this.nodeMap = nodeMap; this.maxX = maxX; this.maxY = maxY;
    this._measureLabels();
    this._updateScaleX(false);
    this._updateMinScaleY();
    this._setTarget(state.offsetY, state.scaleY, false);

    // Mirror navigateInto: seed the animation so the new root starts at the
    // old screen position of the node we're zooming into.
    const newRoot = this.nodes.find(n => !n.parentId);
    if (newRoot) {
      this.offsetX = px_old;
      this.offsetY = py_old - newRoot.y * this.scaleY;
    }
    this._animating = true;
    this._dirty = true;
    if (this._onNavChange) this._onNavChange(true, this._fwdStack.length > 0);
  }

  /** Measure the widest tip label once so _updateScaleX can stay cheap. */
  _measureLabels() {
    if (!this.nodes) return;
    const ctx = this.ctx;
    ctx.font = `${this.fontSize}px monospace`;
    let max = 0;
    for (const n of this.nodes) {
      if (n.isTip && n.name) {
        const w = ctx.measureText(n.name).width;
        if (w > max) max = w;
      }
    }
    const outlineR = this.tipRadius + Math.max(1, Math.round(this.tipRadius * 0.45));
    this.labelRightPad = max + outlineR + 5;
  }

  /** Recompute scaleX so the tree always fills the full viewport width.
   *  immediate=true (default) snaps instantly; false animates via _targetScaleX. */
  _updateScaleX(immediate = true) {
    const W = this.canvas.clientWidth;
    const plotW = W - this.paddingLeft - this.labelRightPad;
    this._targetScaleX  = plotW / this.maxX;
    this._targetOffsetX = this.paddingLeft;   // X origin always returns to paddingLeft
    if (immediate) {
      this.scaleX  = this._targetScaleX;
      this.offsetX = this._targetOffsetX;
    } else {
      this._animating = true;
    }
  }

  /** Recompute the minimum scaleY (tree fits the viewport vertically). */
  _updateMinScaleY() {
    const H = this.canvas.clientHeight;
    const plotH = H - this.paddingTop - this.paddingBottom;
    // tips sit at world y = 1 … maxY; add 1 unit of padding total
    this.minScaleY = plotH / (this.maxY + 1);
  }

  // _clampOffsetY is replaced by _clampedOffsetY (pure) + _setTarget.

  fitToWindow() {
    if (!this.nodes) return;
    this._fitLabelsMode = false;
    this._updateScaleX();
    this._updateMinScaleY();
    const newOffsetY = this.paddingTop + this.minScaleY * 0.5;
    this._setTarget(newOffsetY, this.minScaleY, /*immediate*/ false);
    this._dirty = true;
  }

  /**
   * Zoom to the level where consecutive tip labels no longer overlap.
   * Each tip occupies 1 world unit; we need at least (fontSize + 2) screen px per unit.
   */
  fitLabels() {
    if (!this.nodes) return;
    this._fitLabelsMode = true;
    this._updateMinScaleY();
    const labelScaleY = this.fontSize + 2;   // px per world unit – labels just clear each other
    const newScaleY   = Math.max(this.minScaleY, labelScaleY);
    // Try to keep the current centre stable; fall back to top of tree.
    const H         = this.canvas.clientHeight;
    const centreWorldY = this._worldYfromScreen(H / 2);
    const newOffsetY   = H / 2 - centreWorldY * newScaleY;
    this._setTarget(newOffsetY, newScaleY, /*immediate*/ false);
    this._dirty = true;
  }

  /**
   * Compute the clamped offsetY for a given scaleY and desired raw offsetY.
   * Does NOT mutate state.
   */
  _clampedOffsetY(offsetY, scaleY) {
    const H = this.canvas.clientHeight;
    const maxOY = this.paddingTop - scaleY * 0.5;
    const minOY = (H - this.paddingBottom) - (this.maxY + 0.5) * scaleY;
    if (minOY > maxOY) return (minOY + maxOY) / 2; // tree fits – centre it
    return Math.min(maxOY, Math.max(minOY, offsetY));
  }

  /**
   * Set animation targets (and optionally apply immediately).
   * @param {number} offsetY  desired raw offsetY
   * @param {number} scaleY   desired scaleY
   * @param {boolean} immediate  if true, snap with no animation
   * @param {number|null} pivotScreenY  screen-y to hold fixed during zoom
   */
  _setTarget(offsetY, scaleY, immediate = false, pivotScreenY = null) {
    const newScaleY = Math.max(this.minScaleY, scaleY);

    // If a zoom pivot was supplied, recompute offsetY to keep that world-y fixed.
    let newOffsetY = offsetY;
    if (pivotScreenY !== null) {
      const worldY = (pivotScreenY - this._targetOffsetY) / this._targetScaleY;
      newOffsetY   = pivotScreenY - worldY * newScaleY;
    }

    this._targetScaleY  = newScaleY;
    this._targetOffsetY = this._clampedOffsetY(newOffsetY, newScaleY);

    if (immediate) {
      this.scaleY  = this._targetScaleY;
      this.offsetY = this._targetOffsetY;
      this._animating = false;
    } else {
      this._animating = true;
    }
    this._dirty = true;
  }

  // X is anchored to offsetX (animated during navigation, otherwise == paddingLeft).
  _wx(worldX) { return this.offsetX + worldX * this.scaleX; }
  _wy(worldY) { return this.offsetY + worldY * this.scaleY; }
  _worldYfromScreen(sy) { return (sy - this.offsetY) / this.scaleY; }
  _worldXfromScreen(sx) { return (sx - this.offsetX) / this.scaleX; }

  _resize() {
    const W = this.canvas.parentElement.clientWidth;
    const H = this.canvas.parentElement.clientHeight;
    this.canvas.style.width  = W + 'px';
    this.canvas.style.height = H + 'px';
    this.canvas.width  = W * this.dpr;
    this.canvas.height = H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this._statusCanvas) {
      const SW = this._statusCanvas.parentElement.clientWidth;
      const SH = this._statusCanvas.parentElement.clientHeight;
      this._statusCanvas.style.width  = SW + 'px';
      this._statusCanvas.style.height = SH + 'px';
      this._statusCanvas.width  = SW * this.dpr;
      this._statusCanvas.height = SH * this.dpr;
      this._statusCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    if (this.nodes) {
      // X always re-fits; preserve the current vertical zoom ratio if already zoomed in.
      const zoomRatio = (this.minScaleY > 0) ? this._targetScaleY / this.minScaleY : 1;
      this._updateScaleX();
      this._updateMinScaleY();
      const newScaleY = Math.max(this.minScaleY, this.minScaleY * zoomRatio);
      this._setTarget(this._targetOffsetY, newScaleY, true);
    }
    this._dirty = true;
  }

  _loop() {
    if (this._animating) {
      const EASE = 0.16;
      const dY  = this._targetOffsetY - this.offsetY;
      const dSY = this._targetScaleY  - this.scaleY;
      const dSX = this._targetScaleX  - this.scaleX;
      const dOX = this._targetOffsetX - this.offsetX;
      if (Math.abs(dY) < 0.05 && Math.abs(dSY) < 5e-5 && Math.abs(dSX) < 5e-5 && Math.abs(dOX) < 0.05) {
        this.offsetY = this._targetOffsetY;
        this.scaleY  = this._targetScaleY;
        this.scaleX  = this._targetScaleX;
        this.offsetX = this._targetOffsetX;
        this._animating = false;
      } else {
        this.offsetY += dY  * EASE;
        this.scaleY  += dSY * EASE;
        this.scaleX  += dSX * EASE;
        this.offsetX += dOX * EASE;
      }
      this._dirty = true;
    }
    if (this._dirty) {
      this._draw();
      this._dirty = false;
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, W, H);

    if (!this.nodes) return;

    // Viewport culling: world y range visible on screen (with a little margin)
    const yWorldMin = this._worldYfromScreen(-this.fontSize * 2);
    const yWorldMax = this._worldYfromScreen(H + this.fontSize * 2);

    ctx.font = `${this.fontSize}px monospace`;
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.branchColor;

    const nodeMap = this.nodeMap;
    const er = this.elbowRadius;

    // Draw branches: horizontal segments.  Start each one 'er' px right of the
    // corner so the arc pass can fill the gap with a rounded elbow.
    ctx.beginPath();
    for (const node of this.nodes) {
      if (!node.parentId) continue;
      if (node.y < yWorldMin && node.y > yWorldMax) continue;

      const parent = nodeMap.get(node.parentId);
      if (!parent) continue;

      const px = this._wx(parent.x);
      const nx = this._wx(node.x);
      const ny = this._wy(node.y);

      // Clamp er so it never exceeds half the branch length or half the vertical gap.
      const py = this._wy(parent.y);
      const cer = Math.min(er, Math.abs(ny - py) * 0.4, (nx - px) * 0.4);

      ctx.moveTo(px + cer, ny); // leave gap at corner for arc
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();

    // Draw rounded-elbow arcs at each branch corner.
    if (er > 0) {
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.parentId) continue;
        if (node.y < yWorldMin && node.y > yWorldMax) continue;

        const parent = nodeMap.get(node.parentId);
        if (!parent) continue;

        const px  = this._wx(parent.x);
        const nx  = this._wx(node.x);
        const ny  = this._wy(node.y);
        const py  = this._wy(parent.y);
        if (Math.abs(ny - py) < 0.5) continue; // only child – no corner needed

        const cer = Math.min(er, Math.abs(ny - py) * 0.4, (nx - px) * 0.4);
        // Approach the corner from the vertical; leave toward horizontal.
        const fromY = ny + (ny < py ? cer : -cer);
        ctx.moveTo(px, fromY);
        ctx.arcTo(px, ny, px + cer, ny, cer);
      }
      ctx.stroke();
    }

    // Draw root stub: a short horizontal line to the left of the root node.
    const rootNode = this.nodes.find(n => !n.parentId);
    if (rootNode) {
      const rx        = this._wx(rootNode.x);
      const ry        = this._wy(rootNode.y);
      const stubLen   = this.rootStubLength;
      ctx.beginPath();
      ctx.moveTo(rx - stubLen, ry);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    }

    // Draw vertical elbow lines per internal node.
    // Each end is pulled in by the same cer used at that child's arc so the
    // line abuts the curved segment cleanly.
    ctx.beginPath();
    for (const node of this.nodes) {
      if (node.isTip) continue;
      if (node.children.length === 0) continue;

      const childNodes = node.children.map(cid => nodeMap.get(cid)).filter(Boolean);
      if (childNodes.length < 2) continue;

      const ys     = childNodes.map(c => c.y);
      const minY   = Math.min(...ys);
      const maxY   = Math.max(...ys);

      if (maxY < yWorldMin || minY > yWorldMax) continue;

      const nx     = this._wx(node.x);
      const py     = this._wy(node.y);

      // Find the children at the two extremes of the vertical span.
      const topChild = childNodes.find(c => c.y === minY);
      const botChild = childNodes.find(c => c.y === maxY);

      const ny_top = this._wy(topChild.y);
      const ny_bot = this._wy(botChild.y);

      // Use the same cer formula as the arc pass so the line ends exactly where
      // the arc begins.
      const cer_top = er > 0 ? Math.min(er, Math.abs(ny_top - py) * 0.4, (this._wx(topChild.x) - nx) * 0.4) : 0;
      const cer_bot = er > 0 ? Math.min(er, Math.abs(ny_bot - py) * 0.4, (this._wx(botChild.x) - nx) * 0.4) : 0;

      ctx.moveTo(nx, ny_top + cer_top); // just below topmost child's arc start
      ctx.lineTo(nx, ny_bot - cer_bot); // just above bottommost child's arc start
    }
    ctx.stroke();

    // Draw tip circles: first pass – black outline (slightly larger), second pass – coloured fill.
    const r           = this.tipRadius;
    const outlineR    = r + Math.max(1, Math.round(r * 0.45));
    ctx.textBaseline  = 'middle';
    const showLabels  = this.scaleY > 1;

    // Pass 1 – black backing circles
    ctx.fillStyle = this.tipOutlineColor;
    ctx.beginPath();
    for (const node of this.nodes) {
      if (!node.isTip) continue;
      if (node.y < yWorldMin || node.y > yWorldMax) continue;
      ctx.moveTo(this._wx(node.x) + outlineR, this._wy(node.y));
      ctx.arc(this._wx(node.x), this._wy(node.y), outlineR, 0, Math.PI * 2);
    }
    ctx.fill();

    // Pass 2 – coloured fill circles + labels
    ctx.fillStyle = this.tipColor;
    ctx.beginPath();
    for (const node of this.nodes) {
      if (!node.isTip) continue;
      if (node.y < yWorldMin || node.y > yWorldMax) continue;
      ctx.moveTo(this._wx(node.x) + r, this._wy(node.y));
      ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
    }
    ctx.fill();

    // Pass 2.5 – selected tips: slightly enlarged, bright ring on top of normal circles
    if (this._selectedTipIds.size > 0) {
      const selR  = r * 1.3;
      const selRingW = Math.max(1.5, r * 0.45);
      const selBackR = selR + selRingW + 1;

      // Black backing
      ctx.fillStyle = this.tipOutlineColor;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + selBackR, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), selBackR, 0, Math.PI * 2);
      }
      ctx.fill();

      // Bright ring
      ctx.strokeStyle = this.selectedRingColor;
      ctx.lineWidth   = selRingW;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + selR + selRingW * 0.5, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), selR + selRingW * 0.5, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.lineWidth = 1;

      // Tip-colour fill on top
      ctx.fillStyle = this.tipColor;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + selR, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), selR, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Pass 2.6 – MRCA circle: shown when 2+ tips are selected
    if (this._mrcaNodeId && this._selectedTipIds.size >= 2) {
      const mn   = this.nodeMap.get(this._mrcaNodeId);
      if (mn) {
        const mnx   = this._wx(mn.x);
        const mny   = this._wy(mn.y);
        const mrcaR = r * 1.3;
        const ringW = Math.max(1.5, r * 0.5);
        // Dark backing
        ctx.beginPath();
        ctx.arc(mnx, mny, mrcaR + ringW + 1, 0, Math.PI * 2);
        ctx.fillStyle = this.tipOutlineColor;
        ctx.fill();
        // Coloured ring
        ctx.beginPath();
        ctx.arc(mnx, mny, mrcaR + ringW * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = this.mrcaRingColor;
        ctx.lineWidth   = ringW;
        ctx.stroke();
        ctx.lineWidth   = 1;
        // Internal-colour fill
        ctx.beginPath();
        ctx.arc(mnx, mny, mrcaR, 0, Math.PI * 2);
        ctx.fillStyle = this.internalColor;
        ctx.fill();
      }
    }

    // Pass 3 – labels (two sub-passes when selection active: dim then bright)
    if (showLabels) {
      const hasSelection = this._selectedTipIds.size > 0;
      const dimColor = this.dimLabelColor;

      if (hasSelection) {
        // Sub-pass 3a: unselected labels in dim grey
        ctx.fillStyle = dimColor;
        for (const node of this.nodes) {
          if (!node.isTip || this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (node.name) ctx.fillText(node.name, this._wx(node.x) + outlineR + 3, this._wy(node.y));
        }
        // Sub-pass 3b: selected labels in selected colour
        ctx.fillStyle = this.selectedLabelColor;
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (node.name) ctx.fillText(node.name, this._wx(node.x) + outlineR + 3, this._wy(node.y));
        }
      } else {
        ctx.fillStyle = this.labelColor;
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (node.name) ctx.fillText(node.name, this._wx(node.x) + outlineR + 3, this._wy(node.y));
        }
      }
    }

    // Pass 4 – hovered node drawn on top (enlarged + dark outline ring)
    if (this._hoveredNodeId) {
      const hn = this.nodeMap.get(this._hoveredNodeId);
      if (hn) {
        const hx        = this._wx(hn.x);
        const hy        = this._wy(hn.y);
        const baseColor = hn.isTip ? this.tipColor : this.internalColor;
        const hr        = hn.isTip ? r * 1.4 : r * 1.7;
        const darkColor = this._darkenColor(baseColor, 0.55);
        const ringW     = Math.max(1.5, r * 0.5);
        const ringR     = hr + ringW * 0.5;

        // Black backing for the ring
        ctx.beginPath();
        ctx.arc(hx, hy, ringR + 1, 0, Math.PI * 2);
        ctx.fillStyle = this.tipOutlineColor;
        ctx.fill();

        // Dark-colour ring
        ctx.beginPath();
        ctx.arc(hx, hy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = darkColor;
        ctx.lineWidth   = ringW;
        ctx.stroke();

        // Filled circle
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();

        ctx.lineWidth = 1;
      }
    }
  }

  /**
   * Compute the MRCA (most recent common ancestor) of a set of tip IDs.
   * Returns the node id of the MRCA, or null.
   */
  _computeMRCA(tipIds) {
    if (!this.nodeMap || tipIds.size < 2) return null;
    const ids = [...tipIds];

    // Build the ancestor chain for a node (the node itself first, root last).
    const getChain = (id) => {
      const path = [];
      let cur = this.nodeMap.get(id);
      while (cur) {
        path.push(cur.id);
        cur = cur.parentId ? this.nodeMap.get(cur.parentId) : null;
      }
      return path;
    };

    // Start with the full ancestor chain of the first tip.
    let chain    = getChain(ids[0]);
    let chainSet = new Set(chain);

    for (let i = 1; i < ids.length; i++) {
      // Walk up from ids[i] until we reach a node already in the chain.
      let cur = this.nodeMap.get(ids[i]);
      while (cur && !chainSet.has(cur.id)) {
        cur = cur.parentId ? this.nodeMap.get(cur.parentId) : null;
      }
      if (!cur) return null;
      // Trim the chain so it starts at the hit node (discarding deeper ancestors
      // of tip[0] which are no longer common to all tips seen so far).
      const hitIdx = chain.indexOf(cur.id);
      chain    = chain.slice(hitIdx);
      chainSet = new Set(chain);
    }

    // chain[0] is the deepest common ancestor = MRCA.
    return chain[0];
  }

  /** Recompute and cache the MRCA node id based on the current selection. */
  _updateMRCA() {
    this._mrcaNodeId = this._selectedTipIds.size >= 2
      ? this._computeMRCA(this._selectedTipIds)
      : null;
  }

  /** Collect all descendant tip ids of the node with the given id. */
  _getDescendantTipIds(nodeId) {
    const result = [];
    const stack  = [nodeId];
    while (stack.length) {
      const id   = stack.pop();
      const node = this.nodeMap.get(id);
      if (!node) continue;
      if (node.isTip) { result.push(id); }
      else            { for (const cid of node.children) stack.push(cid); }
    }
    return result;
  }

  /** Darken a CSS hex colour by multiplying each channel by `factor` (0–1). */
  _darkenColor(hex, factor) {
    const h = hex.replace('#', '');
    const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
    return `rgb(${r},${g},${b})`;
  }

  /**
   * Returns the node (tip or internal) closest to screen point (mx, my),
   * or null if none is within the hit threshold.
   * Tips get a slightly larger hit area.
   */
  _findNodeAtScreen(mx, my) {
    if (!this.nodes) return null;
    const H  = this.canvas.clientHeight;
    const yWorldMin = this._worldYfromScreen(-this.tipRadius * 4);
    const yWorldMax = this._worldYfromScreen(H + this.tipRadius * 4);
    const hitR = this.tipRadius * 3 + 6;
    let best = null, bestDist2 = hitR * hitR;
    for (const node of this.nodes) {
      if (node.y < yWorldMin || node.y > yWorldMax) continue;
      const dx = this._wx(node.x) - mx;
      const dy = this._wy(node.y) - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) { bestDist2 = d2; best = node; }
    }
    if (best) return best;

    // Label hit-test for tip nodes when labels are visible
    if (this.scaleY > 1) {
      const r        = this.tipRadius;
      const outlineR = r + Math.max(1, Math.round(r * 0.45));
      const labelX0  = outlineR + 3;
      const halfH    = this.fontSize / 2 + 2;
      this.ctx.font  = `${this.fontSize}px monospace`;
      for (const node of this.nodes) {
        if (!node.isTip || !node.name) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        const sy = this._wy(node.y);
        if (my < sy - halfH || my > sy + halfH) continue;
        const lx0 = this._wx(node.x) + labelX0;
        if (mx < lx0) continue;
        if (mx <= lx0 + this.ctx.measureText(node.name).width) return node;
      }
    }
    return null;
  }

  /** Returns the id of the node whose world-y is closest to the viewport centre. */
  nodeIdAtViewportCenter() {
    if (!this.nodes) return null;
    const centreWorldY = this._worldYfromScreen(this.canvas.clientHeight / 2);
    let bestId = null, bestDist = Infinity;
    for (const n of this.nodes) {
      const d = Math.abs(n.y - centreWorldY);
      if (d < bestDist) { bestDist = d; bestId = n.id; }
    }
    return bestId;
  }

  /**
   * Adjust _targetOffsetY so the appropriate edge aligns on a whole tip.
   * scrolledDown=true  → tree moved up, revealing lower tips → snap top edge.
   * scrolledDown=false → tree moved down, revealing upper tips → snap bottom edge.
   */
  _snapToTip(scrolledDown) {
    const H  = this.canvas.clientHeight;
    const sy = this._targetScaleY;
    if (scrolledDown) {
      // First fully-visible tip from the top
      const topWorldY = (this.paddingTop - this._targetOffsetY) / sy;
      const tipY = Math.max(1, Math.min(this.maxY, Math.ceil(topWorldY)));
      this._targetOffsetY = this._clampedOffsetY(this.paddingTop - tipY * sy, sy);
    } else {
      // Last fully-visible tip from the bottom
      const botWorldY = (H - this.paddingBottom - this._targetOffsetY) / sy;
      const tipY = Math.max(1, Math.min(this.maxY, Math.floor(botWorldY)));
      this._targetOffsetY = this._clampedOffsetY(
        (H - this.paddingBottom) - tipY * sy, sy
      );
    }
    this._animating = true;
    this._dirty     = true;
  }

  // ── Input & interaction ────────────────────────────────────────────────────

  _setupEvents() {
    const canvas = this.canvas;

    // ── Double-click on internal node: drill into subtree.
    canvas.addEventListener('dblclick', e => {
      if (this._spaceDown || !this._rawRoot) return;
      const rect = canvas.getBoundingClientRect();
      const node = this._findNodeAtScreen(e.clientX - rect.left, e.clientY - rect.top);
      if (!node || node.isTip) return;
      // Double-clicking the current root while inside a subtree navigates back.
      if (!node.parentId && this._navStack.length > 0) {
        this.navigateBack();
      } else {
        this.navigateInto(node.id);
      }
    });

    // ── Click: plain click replaces selection; Cmd+click toggles.
    canvas.addEventListener('click', e => {
      if (this._spaceDown) return;
      const rect    = canvas.getBoundingClientRect();
      const node    = this._findNodeAtScreen(e.clientX - rect.left, e.clientY - rect.top);
      const additive = e.metaKey || e.ctrlKey;

      if (!node) {
        this._selectedTipIds.clear();
      } else if (node.isTip) {
        if (additive) {
          // toggle this tip
          if (this._selectedTipIds.has(node.id)) this._selectedTipIds.delete(node.id);
          else                                   this._selectedTipIds.add(node.id);
        } else {
          this._selectedTipIds.clear();
          this._selectedTipIds.add(node.id);
        }
      } else {
        // Internal node – operate on all descendant tips
        const descIds     = this._getDescendantTipIds(node.id);
        const allSelected = descIds.length > 0 && descIds.every(id => this._selectedTipIds.has(id));
        if (additive) {
          if (allSelected) descIds.forEach(id => this._selectedTipIds.delete(id));
          else             descIds.forEach(id => this._selectedTipIds.add(id));
        } else {
          this._selectedTipIds.clear();
          descIds.forEach(id => this._selectedTipIds.add(id));
        }
      }
      this._updateMRCA();
      this._drawStatusBar(this._lastStatusMx);
      this._dirty = true;
    });

    // ── Wheel: pinch (ctrlKey=true on Mac trackpad) → zoom;
    //          scroll (ctrlKey=false) → pan vertically.
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const my   = e.clientY - rect.top;

      if (e.ctrlKey) {
        // Pinch-to-zoom: deltaY in this mode is a small dimensionless zoom delta.
        // Positive deltaY = pinch in (zoom out), negative = spread (zoom in).
        const factor = Math.pow(0.99, e.deltaY); // smooth continuous zoom
        this._fitLabelsMode = false;
        this._setTarget(
          this._targetOffsetY,
          this._targetScaleY * factor,
          false,
          my
        );
      } else {
        // Two-finger scroll or mouse wheel: pan vertically.
        // deltaMode 0 = pixels, 1 = lines, 2 = pages
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= this.scaleY;       // lines → pixels
        if (e.deltaMode === 2) delta *= this.canvas.clientHeight;
        const scrolledDown = delta > 0;
        this._setTarget(
          this._targetOffsetY - delta,
          this._targetScaleY,
          false
        );
        // Debounce snap: fire after the gesture pauses
        clearTimeout(this._snapTimer);
        this._snapTimer = setTimeout(() => this._snapToTip(scrolledDown), 150);
      }
    }, { passive: false });

    // ── Click-drag: immediate vertical pan – only when spacebar is held.
    canvas.addEventListener('mousedown', e => {
      if (!this._spaceDown) return;
      this._dragging        = true;
      this._lastY           = e.clientY;
      this._dragStartOffsetY = this.offsetY;
      // cancel any in-progress animation so the tree follows the pointer
      this._targetOffsetY = this.offsetY;
      this._targetScaleY  = this.scaleY;
      this._animating     = false;
      canvas.classList.remove('space');
      canvas.classList.add('grabbing');
    });

    window.addEventListener('mousemove', e => {
      if (this._dragging) {
        const dy = e.clientY - this._lastY;
        this._lastY  = e.clientY;
        const newOY  = this._clampedOffsetY(this.offsetY + dy, this.scaleY);
        this.offsetY        = newOY;
        this._targetOffsetY = newOY;
        this._dirty  = true;
      }

      // Hover hit-test (always, not just when dragging)
      if (!this._dragging) {
        const rect   = this.canvas.getBoundingClientRect();
        const mx     = e.clientX - rect.left;
        const my     = e.clientY - rect.top;
        const hovered = this._findNodeAtScreen(mx, my);
        const newId   = hovered ? hovered.id : null;
        if (newId !== this._hoveredNodeId) {
          this._hoveredNodeId = newId;
          this.canvas.style.cursor = newId
            ? (this._spaceDown ? 'grab' : 'pointer')
            : (this._spaceDown ? 'grab' : 'default');
          this._dirty = true;
        }
      }

      if (e.target === this.canvas) this._updateStatus(e);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this._hoveredNodeId !== null) {
        this._hoveredNodeId = null;
        this._dirty = true;
      }
    });

    window.addEventListener('mouseup', () => {
      if (this._dragging) {
        // Snap to the edge that was being revealed by the drag
        const scrolledDown = this.offsetY < this._dragStartOffsetY;
        this._targetOffsetY = this.offsetY;
        this._targetScaleY  = this.scaleY;
        this._snapToTip(scrolledDown);
      }
      this._dragging = false;
      this.canvas.classList.remove('grabbing');
      // restore cursor based on current state
      if (this._spaceDown) {
        this.canvas.style.cursor = 'grab';
      } else {
        this.canvas.style.cursor = this._hoveredNodeId ? 'pointer' : 'default';
      }
    });

    // ── Spacebar: enable drag-scroll cursor / mode.
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't fire repeatedly on key-repeat
        if (!this._spaceDown) {
          this._spaceDown = true;
          this.canvas.classList.add('space');
          this.canvas.style.cursor = 'grab';
        }
        // Prevent page scroll
        e.preventDefault();
        return;
      }

      if (!this.nodes) return;

      const H        = canvas.clientHeight;
      const tipPx    = this.scaleY;               // one tip-row in screen pixels
      const pagePx   = H - tipPx;                 // one page minus one tip
      const zoomStep = 1.5;
      const centerY  = H / 2;

      // Cmd/Ctrl + '=' or '+' → zoom in; Cmd/Ctrl + '-' → zoom out.
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        this._fitLabelsMode = false;
        this._setTarget(this._targetOffsetY, this._targetScaleY * zoomStep, false, centerY);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        this._fitLabelsMode = false;
        this._setTarget(this._targetOffsetY, this._targetScaleY / zoomStep, false, centerY);
        return;
      }

      // Cmd/Ctrl + Alt + 0 → fit labels zoom.
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === '0') {
        e.preventDefault();
        this.fitLabels();
        return;
      }

      // Cmd/Ctrl + 0 → fit current subtree vertically.
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        this.fitToWindow();
        return;
      }

      // Arrow keys – no modifier → one tip; Cmd/Ctrl → one page.
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const scrolledDown = e.key === 'ArrowDown';
        const dist   = (e.metaKey || e.ctrlKey) ? pagePx : tipPx;
        const sign   = scrolledDown ? -1 : 1;
        this._setTarget(this._targetOffsetY + sign * dist, this._targetScaleY, false);
        this._snapToTip(scrolledDown);
        return;
      }

      // Escape – clear selection.
      if (e.key === 'Escape') {
        this._selectedTipIds.clear();
        this._mrcaNodeId = null;
        this._drawStatusBar(this._lastStatusMx);
        this._dirty = true;
        return;
      }
    });

    window.addEventListener('keyup', e => {
      if (e.code === 'Space') {
        this._spaceDown = false;
        this._dragging  = false;
        this.canvas.classList.remove('space', 'grabbing');
        this.canvas.style.cursor = this._hoveredNodeId ? 'pointer' : 'default';
      }
    });

    window.addEventListener('resize', () => this._resize());
  }

  /**
   * Derive display statistics from the current selection and view.
   * Returns { tipCount, distance, height, totalLength }
   */
  _computeStats() {
    if (!this.nodes) return null;
    const tipCount = this.maxY;

    // Determine the "reference" node for Distance and Height.
    // Priority: MRCA (2+ tips) > single selected tip > root (no selection).
    let refNode = null;
    if (this._mrcaNodeId) {
      refNode = this.nodeMap.get(this._mrcaNodeId);
    } else if (this._selectedTipIds.size === 1) {
      refNode = this.nodeMap.get([...this._selectedTipIds][0]);
    }

    // Distance: x of refNode, or maxX when nothing is selected.
    const distance = refNode ? refNode.x : this.maxX;

    // Height: for internal refNode, distance down to the furthest selected tip.
    // For a tip refNode, 0. For no selection, root height = maxX.
    let height;
    if (!refNode) {
      height = this.maxX;
    } else if (refNode.isTip) {
      height = 0;
    } else {
      // max x of selected tips (or all descendant tips if no selection)
      if (this._selectedTipIds.size >= 2) {
        const selTipXs = [...this._selectedTipIds]
          .map(id => this.nodeMap.get(id))
          .filter(Boolean)
          .map(n => n.x);
        height = selTipXs.length ? Math.max(...selTipXs) - refNode.x : 0;
      } else {
        height = this.maxX - refNode.x;
      }
    }

    // Total branch length: within subtree rooted at refNode, or whole tree.
    const subRootId = refNode ? refNode.id : (this.nodes.find(n => !n.parentId) || {}).id;
    let totalLength = 0;
    if (subRootId != null) {
      const stack = [subRootId];
      while (stack.length) {
        const id   = stack.pop();
        const node = this.nodeMap.get(id);
        if (!node) continue;
        if (node.parentId) {
          const parent = this.nodeMap.get(node.parentId);
          if (parent) totalLength += node.x - parent.x;
        }
        if (!node.isTip) for (const cid of node.children) stack.push(cid);
      }
    }

    return { tipCount, distance, height, totalLength };
  }

  /**
   * Redraw the status canvas (or fallback div).
   * mx = screen x of the mouse pointer, or null if unknown.
   */
  _drawStatusBar(mx = null) {
    if (!this._statusCanvas) {
      // Fallback: plain text in the DOM element
      if (!this.nodes) return;
      const el = document.getElementById('status');
      if (!el) return;
      const stats = this._computeStats();
      const lines = [];
      if (mx !== null) {
        const wx = this._worldXfromScreen(mx);
        const wy = this._worldYfromScreen(this._lastStatusMy || 0);
        const tip = Math.min(this.maxY, Math.max(1, Math.round(wy)));
        lines.push(`div: ${wx.toFixed(5)}`, `tip: ${tip}`);
      }
      if (stats) {
        lines.push(
          `Tips: ${stats.tipCount}`,
          `Dist: ${stats.distance.toFixed(5)}`,
          `Height: ${stats.height.toFixed(5)}`,
          `Length: ${stats.totalLength.toFixed(5)}`,
        );
      }
      el.textContent = lines.join('  |  ');
      return;
    }

    const sctx = this._statusCtx;
    const W    = this._statusCanvas.clientWidth;
    const H    = this._statusCanvas.clientHeight;
    sctx.clearRect(0, 0, W, H);
    if (!this.nodes) return;

    sctx.font         = '11px monospace';
    sctx.textBaseline = 'middle';
    const cy = H / 2;
    // Fixed pixel positions (packed left)
    const POS = { div: 12, tip: 140, tips: 240, dist: 350, height: 490, length: 640 };

    // Dim teal for mouse-position fields, brighter for stats
    const mouseColor = 'rgba(25,166,153,0.55)';
    const statColor  = 'rgba(242,241,230,0.65)';
    const labelColor = 'rgba(230,213,149,0.75)';

    const draw = (x, label, value, lc, vc) => {
      sctx.fillStyle = lc;
      sctx.fillText(label, x, cy);
      const lw = sctx.measureText(label).width;
      sctx.fillStyle = vc;
      sctx.fillText(value, x + lw, cy);
    };

    // Mouse-position fields (only when mouse is over the canvas)
    if (mx !== null) {
      const wx  = this._worldXfromScreen(mx);
      const wy  = this._worldYfromScreen(this._lastStatusMy || 0);
      const tip = Math.min(this.maxY, Math.max(1, Math.round(wy)));
      draw(POS.div,  'div\u2009',  wx.toFixed(5),  mouseColor, mouseColor);
      draw(POS.tip,  'tip\u2009',  String(tip),    mouseColor, mouseColor);
    }

    // Tree stats (always shown once data is loaded)
    const stats = this._computeStats();
    if (stats) {
      draw(POS.tips,   'Tips\u2009',   String(stats.tipCount),        labelColor, statColor);
      draw(POS.dist,   'Dist\u2009',   stats.distance.toFixed(5),     labelColor, statColor);
      draw(POS.height, 'Height\u2009', stats.height.toFixed(5),       labelColor, statColor);
      draw(POS.length, 'Length\u2009', stats.totalLength.toFixed(5),  labelColor, statColor);
    }
  }

  _updateStatus(e) {
    if (!this.nodes) return;
    const rect = this.canvas.getBoundingClientRect();
    this._lastStatusMx = e.clientX - rect.left;
    this._lastStatusMy = e.clientY - rect.top;
    this._drawStatusBar(this._lastStatusMx);
  }
}
