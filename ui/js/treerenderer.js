// ─────────────────────────────────────────────────────────────────────────────
// Canvas renderer
// ─────────────────────────────────────────────────────────────────────────────

import { computeLayoutFromGraph } from './treeutils.js';

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────

export class Theme {
  constructor({
    fontSize         = 11,
    tipRadius        = 3,
    nodeRadius       = 0,
    tipShapeColor    = '#888888',
    nodeShapeColor   = '#888888',
    tipOutlineColor  = '#033940',
    branchColor      = '#F2F1E6',
    branchWidth      = 1,
    tipColor         = '#BF4B43',
    internalColor    = '#19A699',
    selectedRingColor  = '#E06961',
    mrcaRingColor      = '#19A699',
    labelColor         = '#F7EECA',
    dimLabelColor      = '#E6D595',
    selectedLabelColor = '#F2F1E6',
    bgColor          = '#02292E',
    tipShapeBgColor  = bgColor,
    nodeShapeBgColor = bgColor,
    tipHaloSize      = 2,
    nodeHaloSize     = 2,
    paddingLeft      = 60,
    paddingTop       = 20,
    paddingBottom    = 20,
    elbowRadius      = 2,
    rootStubLength   = 20,
  } = {}) {
    this.fontSize          = fontSize;
    this.tipRadius         = tipRadius;
    this.nodeRadius        = nodeRadius;
    this.tipShapeColor     = tipShapeColor;
    this.nodeShapeColor    = nodeShapeColor;
    this.tipShapeBgColor   = tipShapeBgColor;
    this.nodeShapeBgColor  = nodeShapeBgColor;
    this.tipHaloSize       = tipHaloSize;
    this.nodeHaloSize      = nodeHaloSize;
    this.tipOutlineColor   = tipOutlineColor;
    this.branchColor       = branchColor;
    this.branchWidth       = branchWidth;
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
    // drag-select state
    this._dragSel         = null;    // {x0,y0,x1,y1,additive} or null while active
    this._dragSelActive   = false;   // true once pointer has moved > threshold
    this._dragSelStartX   = null;
    this._dragSelStartY   = null;
    this._suppressNextClick = false;
    this._hoveredNodeId   = null;
    this._selectedTipIds  = new Set();
    this._mrcaNodeId      = null;
    this._fitLabelsMode   = false;
    this._shiftHeld       = false;   // true while Shift key is held
    this._hypFocusScreenY = null;    // screen-Y focus for hyperbolic-stretch mode (persistent)
    this._hypStrength     = 0;       // 0..1 blend factor (animated)
    this._hypTarget       = 0;       // animation target: 0 = off, 1 = full
    this._hypMagMult      = 10;      // flat-zone half-width in rows (0 = pure hyperbolic)
    this._lastStatusMx    = null;  // cached mouse x for status bar redraws
    this._lastStatusMy    = null;  // cached mouse y for status bar redraws

    this._mode             = 'nodes';  // 'nodes' | 'branches'
    this._branchHoverNode  = null;     // node whose horizontal branch is hovered
    this._branchHoverX     = null;     // world-x of hover point
    this._branchSelectNode = null;     // fixed branch-selection node
    this._branchSelectX    = null;     // fixed branch-selection world-x

    // Subtree navigation
    this.graph            = null;   // PhyloGraph reference (set by peartree.js after load)
    this._viewSubtreeRootId = null; // null = showing full tree; otherwise origId of subtree root
    this._navStack    = [];     // [{subtreeRootId, scaleY, offsetY, selectedTipIds, mrcaNodeId}, …] – back history
    this._fwdStack    = [];     // forward history
    this.hiddenNodeIds         = new Set(); // kept in sync with graph.hiddenNodeIds by peartree.js
    this._onNavChange          = null;   // callback(canBack, canFwd)
    this._onBranchSelectChange = null;   // callback(hasSelection)
    this._onNodeSelectChange   = null;   // callback(hasSelection)
    this._onViewChange         = null;   // callback(scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr)
    this._onLayoutChange       = null;   // callback(maxX, viewSubtreeRootId) – fired on navigate into/out of subtree
    this._globalHeightMap      = new Map(); // id → (fullMaxX - node.x) from most recent full-tree layout
    this._lastViewHash         = '';

    // animation targets (lerp toward these each frame)
    this._targetOffsetY = 0;
    this._targetScaleY  = 1;
    this._targetScaleX  = 1;   // animated horizontal scale
    this._animating     = false;
    this._reorderFromY  = null;   // Map<id, oldY> during reorder animation
    this._reorderToY    = null;   // Map<id, newY>
    this._reorderAlpha  = 1;      // 0→1; 1 = not animating

    // Root-shift animation (when effective visual root moves deeper/shallower after hide/show)
    this._rootShiftAlpha  = 1;    // 0→1; 1 = not animating
    this._rootShiftFromX  = 0;    // starting offsetX
    this._rootShiftToX    = 0;    // target offsetX (paddingLeft)

    // Cross-fade animation (used on midpoint-root and similar wholesale tree changes)
    this._crossfadeSnapshot = null;   // OffscreenCanvas capturing old frame

    // Annotation colouring
    this._annotationSchema = null;   // Map<name, AnnotationDef> from buildAnnotationSchema
    this._tipColourBy      = null;   // annotation key or null
    this._tipColourScale   = null;   // Map<value, CSS colour> | null
    this._nodeColourBy     = null;   // annotation key for internal nodes, or null
    this._nodeColourScale  = null;   // Map<value, CSS colour> | null
    this._labelColourBy    = null;   // annotation key for tip labels, or null
    this._labelColourScale = null;   // Map<value, CSS colour> | null
    this._crossfadeAlpha    = 0;      // 1→0; 0 = not animating

    // Legend
    this._legendLeftCanvas  = null;  // <canvas> for the left legend panel
    this._legendRightCanvas = null;  // <canvas> for the right legend panel
    this._legendPosition    = null;  // 'left' | 'right' | null
    this._legendAnnotation  = null;  // annotation key currently shown in legend
    this.legendFontSize     = 11;         // label font size (px)
    this.legendTextColor    = '#f7eeca';  // label text colour

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
    this.nodeRadius        = theme.nodeRadius;
    this.tipShapeColor     = theme.tipShapeColor;
    this.nodeShapeColor    = theme.nodeShapeColor;
    this.tipShapeBgColor   = theme.tipShapeBgColor;
    this.nodeShapeBgColor  = theme.nodeShapeBgColor;
    this.tipHaloSize       = theme.tipHaloSize  ?? 2;
    this.nodeHaloSize      = theme.nodeHaloSize ?? 2;
    this.tipOutlineColor   = theme.tipOutlineColor;
    this.branchColor       = theme.branchColor;
    this.branchWidth       = theme.branchWidth;
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
    this._reorderAlpha    = 1;  // cancel any in-progress reorder animation
    this._hypFocusScreenY = null;
    this._hypStrength     = 0;
    this._hypTarget       = 0;
    this.nodes = nodes;
    this.nodeMap = nodeMap;
    this.maxX = maxX;
    this.maxY = maxY;
    this._buildGlobalHeightMap(nodes, maxX);
    this._measureLabels();
    this.fitToWindow();
    this._drawStatusBar(null);
  }

  /**
   * Replace the layout data (same as setData) but animate each node's y
   * position from its old screen row to the new one.  Does NOT reset the
   * viewport (scaleY / offsetY), so the caller can handle zoom-restoration
   * itself with _setTarget as usual.
   */
  setDataAnimated(nodes, nodeMap, maxX, maxY) {
    // Snapshot old y values by node id.
    const fromY = new Map();
    if (this.nodes) {
      for (const n of this.nodes) fromY.set(n.id, n.y);
    }
    // Build target y map from new layout.
    const toY = new Map();
    for (const n of nodes) toY.set(n.id, n.y);

    // Install new layout.
    this.nodes   = nodes;
    this.nodeMap = nodeMap;
    this.maxX    = maxX;
    this.maxY    = maxY;
    this._buildGlobalHeightMap(nodes, maxX);
    this._measureLabels();
    this._updateScaleX(false);
    this._updateMinScaleY();

    // Seed animation: set every node's y to its old position so the lerp
    // starts from there.
    for (const n of this.nodes) {
      const fy = fromY.get(n.id);
      if (fy !== undefined) n.y = fy;
    }
    this._reorderFromY  = fromY;
    this._reorderToY    = toY;
    this._reorderAlpha  = 0;
    this._dirty = true;
  }

  /**
   * Replace layout data with a cross-fade from the current frame.
   * The old frame is captured as a snapshot, the new data is installed
   * immediately (including fitToWindow), then the old snapshot is faded
   * out over the new tree over ~350 ms.
   */
  setDataCrossfade(nodes, nodeMap, maxX, maxY) {
    // Snapshot the current rendered frame before installing new data.
    const W = this.canvas.width;   // physical pixels
    const H = this.canvas.height;
    const snap = document.createElement('canvas');
    snap.width  = W;
    snap.height = H;
    snap.getContext('2d').drawImage(this.canvas, 0, 0);
    this._crossfadeSnapshot = snap;
    this._crossfadeAlpha    = 1;

    // Install the new layout (resets viewport via fitToWindow).
    this.setData(nodes, nodeMap, maxX, maxY);
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

  /** Switch interaction mode ('nodes' or 'branches'); clears both modes' selections. */
  setMode(mode) {
    if (mode === this._mode) return;
    this._selectedTipIds.clear();
    this._mrcaNodeId      = null;
    this._hoveredNodeId   = null;
    this._branchHoverNode = null;
    this._branchHoverX    = null;
    this._branchSelectNode = null;
    this._branchSelectX    = null;
    this._mode = mode;
    if (this._onBranchSelectChange) this._onBranchSelectChange(false);
    if (this._onNodeSelectChange)   this._onNodeSelectChange(false);
    this._drawStatusBar(this._lastStatusMx);
    this._dirty = true;
  }

  setTipRadius(r) {
    this.tipRadius = r;
    this._measureLabels(); // label offset depends on tip radius
    this._updateScaleX();
    this._dirty = true;
  }

  setNodeRadius(r) {
    this.nodeRadius = r;
    this._dirty = true;
  }

  setTipShapeColor(c) {
    this.tipShapeColor = c;
    this._dirty = true;
  }

  setNodeShapeColor(c) {
    this.nodeShapeColor = c;
    this._dirty = true;
  }

  setTipShapeBgColor(c) {
    this.tipShapeBgColor = c;
    this._dirty = true;
  }

  setNodeShapeBgColor(c) {
    this.nodeShapeBgColor = c;
    this._dirty = true;
  }

  setTipHaloSize(n) {
    this.tipHaloSize = n;
    this._measureLabels();
    this._updateScaleX();
    this._dirty = true;
  }

  setNodeHaloSize(n) {
    this.nodeHaloSize = n;
    this._dirty = true;
  }

  setBgColor(c) {
    this.bgColor = c;
    // Keep the CSS background of legend canvases in sync so no bleed-through
    // is visible before or around the drawn content.
    for (const lc of [this._legendLeftCanvas, this._legendRightCanvas]) {
      if (lc) lc.style.backgroundColor = c;
    }
    this._drawLegend();
    this._dirty = true;
  }

  setBranchColor(c) {
    this.branchColor = c;
    this._dirty = true;
  }

  setBranchWidth(w) {
    this.branchWidth = w;
    this._dirty = true;
  }

  /**
   * Set the base tip-label colour and automatically derive related dim and
   * selected colours from it using HSL lightness/saturation adjustments.
   * dim    → darker + more desaturated (unselected labels when a selection exists)
   * selected → brighter + less saturated (selected labels, approaching white)
   */
  setLabelColor(hex) {
    const { h, s, l } = TreeRenderer._hexToHsl(hex);
    this.labelColor        = hex;
    this.dimLabelColor     = TreeRenderer._hslToHex(h, s * 0.70, l * 0.83);
    this.selectedLabelColor = TreeRenderer._hslToHex(h, s * 0.50, Math.min(97, l * 1.08));
    this._dirty = true;
  }

  /** Convert a CSS hex colour (#rrggbb) to {h: 0‑360, s: 0‑100, l: 0‑100}. */
  static _hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /** Convert HSL (h: 0‑360, s: 0‑100, l: 0‑100) to a CSS hex colour. */
  static _hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const col = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * col).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * Store the annotation schema so the renderer can build colour scales.
   * Called by peartree.js immediately after graph = fromNestedRoot(root).
   * @param {Map<string, AnnotationDef>} schema
   */
  setAnnotationSchema(schema) {
    this._annotationSchema = schema;
    if (this._tipColourBy)    this._tipColourScale    = this._buildColourScale(this._tipColourBy);
    if (this._nodeColourBy)   this._nodeColourScale   = this._buildColourScale(this._nodeColourBy);
    if (this._labelColourBy)  this._labelColourScale  = this._buildColourScale(this._labelColourBy);
    this._drawLegend();
    this._dirty = true;
  }

  /**
   * Set the annotation key used to colour tip circles.
   * Pass null (or empty string) to revert to the default tip colour.
   * @param {string|null} key
   */
  setTipColourBy(key) {
    this._tipColourBy    = key || null;
    this._tipColourScale = this._tipColourBy ? this._buildColourScale(this._tipColourBy) : null;
    this._dirty = true;
  }

  setNodeColourBy(key) {
    this._nodeColourBy    = key || null;
    this._nodeColourScale = this._nodeColourBy ? this._buildColourScale(this._nodeColourBy) : null;
    this._dirty = true;
  }

  setLabelColourBy(key) {
    this._labelColourBy    = key || null;
    this._labelColourScale = this._labelColourBy ? this._buildColourScale(this._labelColourBy) : null;
    this._dirty = true;
  }

  /** Build a colour scale Map for the given annotation key. Returns the Map or null. */
  _buildColourScale(key) {
    const schema = this._annotationSchema;
    if (!schema) return null;
    const def = schema.get(key);
    if (!def) return null;

    // user_colour: values ARE CSS colours – identity scale (value → value).
    if (key === 'user_colour') {
      const identity = new Map();
      (def.values || []).forEach(v => identity.set(v, v));
      return identity;
    }

    const scale = new Map();
    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const palette = [
        '#2aa198', '#cb4b16', '#268bd2', '#d33682',
        '#6c71c4', '#b58900', '#859900', '#dc322f',
      ];
      (def.values || []).forEach((v, i) => {
        scale.set(v, palette[i % palette.length]);
      });
    } else if (def.dataType === 'real' || def.dataType === 'integer') {
      // Store the numeric range so _colourFromScale can interpolate at draw time.
      scale.set('__min__', def.min ?? 0);
      scale.set('__max__', def.max ?? 1);
    }
    return scale;
  }

  /** Return a CSS colour string for a value looked up in the given scale, or null. */
  _colourFromScale(value, scale) {
    if (!scale || value === null || value === undefined) return null;
    if (scale.has(value)) return scale.get(value);
    // Numeric interpolation
    if (scale.has('__min__')) {
      const min = scale.get('__min__');
      const max = scale.get('__max__');
      const t  = max > min ? (value - min) / (max - min) : 0.5;
      const tc = Math.max(0, Math.min(1, t));
      // Interpolate #2aa198 → #dc322f  (teal → red)
      const r = Math.round(0x2a + tc * (0xdc - 0x2a));
      const g = Math.round(0xa1 + tc * (0x32 - 0xa1));
      const b = Math.round(0x98 + tc * (0x2f - 0x98));
      return `rgb(${r},${g},${b})`;
    }
    return null;
  }

  _tipColourForValue(value)   { return this._colourFromScale(value, this._tipColourScale);   }
  _nodeColourForValue(value)  { return this._colourFromScale(value, this._nodeColourScale);  }
  _labelColourForValue(value) { return this._colourFromScale(value, this._labelColourScale); }

  /**
   * Register the left and right legend canvases with the renderer.
   * Called once by peartree.js during initialisation.
   * @param {HTMLCanvasElement} left
   * @param {HTMLCanvasElement} right
   */
  setLegendCanvases(left, right) {
    this._legendLeftCanvas  = left;
    this._legendRightCanvas = right;
  }

  /**
   * Set the legend position and annotation key, then redraw the legend.
   * @param {'left'|'right'|null} position
   * @param {string|null}         annotationKey
   */
  setLegend(position, annotationKey) {
    this._legendPosition   = position || null;
    this._legendAnnotation = annotationKey || null;
    this._resize();      // recalculates tree canvas width after legend canvases shown/hidden
    this._drawLegend();  // paints the legend onto the visible legend canvas
  }

  setLegendFontSize(size) {
    this.legendFontSize = size;
    this._drawLegend();
  }

  setLegendTextColor(color) {
    this.legendTextColor = color;
    this._drawLegend();
  }

  /** Snapshot the current view state for the nav stacks. */
  _currentViewState() {
    return {
      subtreeRootId:   this._viewSubtreeRootId,
      scaleY:          this._targetScaleY,
      offsetY:         this._targetOffsetY,
      selectedTipIds:  new Set(this._selectedTipIds),
      mrcaNodeId:      this._mrcaNodeId,
    };
  }

  /** Double-click on an internal layout node id → drill into its subtree. */
  navigateInto(layoutNodeId) {
    const layoutNode = this.nodeMap?.get(layoutNodeId);
    if (!layoutNode || layoutNode.isTip || !layoutNode.parentId) return;

    // Capture screen position of the clicked node BEFORE layout swap.
    const px_old = this.offsetX + layoutNode.x * this.scaleX;
    const py_old = this.offsetY + layoutNode.y * this.scaleY;

    this._navStack.push(this._currentViewState());
    this._fwdStack         = [];
    this._viewSubtreeRootId = layoutNodeId;
    this._selectedTipIds.clear();
    this._mrcaNodeId = null;

    // Compute new layout rooted at this node (x = 0).
    const { nodes, nodeMap, maxX, maxY } = computeLayoutFromGraph(this.graph, layoutNodeId);
    this.nodes = nodes; this.nodeMap = nodeMap; this.maxX = maxX; this.maxY = maxY;
    this._measureLabels();
    this._updateScaleX(false);
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
    if (this._onLayoutChange) this._onLayoutChange(this.maxX, this._viewSubtreeRootId);
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
    const state              = this._navStack.pop();
    this._viewSubtreeRootId  = state.subtreeRootId;
    this._selectedTipIds     = new Set(state.selectedTipIds || []);
    this._mrcaNodeId         = state.mrcaNodeId || null;

    const { nodes, nodeMap, maxX, maxY } = computeLayoutFromGraph(this.graph, state.subtreeRootId);
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
    if (this._onLayoutChange) this._onLayoutChange(this.maxX, this._viewSubtreeRootId);
    if (this._onNavChange) this._onNavChange(this._navStack.length > 0, true);
    if (this._onNodeSelectChange) this._onNodeSelectChange(this._selectedTipIds.size > 0 || !!this._mrcaNodeId);
  }

  navigateForward() {
    if (!this._fwdStack.length) return;

    // Peek at the forward state FIRST so we can find its root node in the
    // current layout (it's an internal node here, just like in navigateInto).
    const state           = this._fwdStack[this._fwdStack.length - 1];
    const fwdSubtreeRootId = state.subtreeRootId;

    const fromNode = fwdSubtreeRootId && this.nodeMap ? this.nodeMap.get(fwdSubtreeRootId) : null;
    const px_old   = fromNode ? this.offsetX + fromNode.x * this.scaleX : this.paddingLeft;
    const py_old   = fromNode ? this.offsetY + fromNode.y * this.scaleY : this.canvas.clientHeight / 2;

    this._navStack.push(this._currentViewState());
    this._fwdStack.pop();
    this._viewSubtreeRootId  = state.subtreeRootId;
    this._selectedTipIds     = new Set(state.selectedTipIds || []);
    this._mrcaNodeId         = state.mrcaNodeId || null;

    const { nodes, nodeMap, maxX, maxY } = computeLayoutFromGraph(this.graph, fwdSubtreeRootId);
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
    if (this._onLayoutChange) this._onLayoutChange(this.maxX, this._viewSubtreeRootId);
    if (this._onNavChange) this._onNavChange(true, this._fwdStack.length > 0);
    if (this._onNodeSelectChange) this._onNodeSelectChange(this._selectedTipIds.size > 0 || !!this._mrcaNodeId);
  }

  /** Jump directly to the global root, pushing the current view onto the back stack. */
  navigateHome() {
    if (!this._viewSubtreeRootId) return; // already showing the full tree

    // Capture screen position of the current subtree root (world x = 0).
    const curRootLayout = this.nodes ? this.nodes.find(n => !n.parentId) : null;
    const px_cur  = this.offsetX;
    const py_cur  = curRootLayout ? this.offsetY + curRootLayout.y * this.scaleY : this.canvas.clientHeight / 2;
    const curRootId = curRootLayout ? curRootLayout.id : null;

    this._navStack.push(this._currentViewState());
    this._fwdStack          = [];
    this._viewSubtreeRootId = null;
    this._selectedTipIds.clear();
    this._mrcaNodeId = null;

    const { nodes, nodeMap, maxX, maxY } = computeLayoutFromGraph(this.graph, null);
    this.nodes = nodes; this.nodeMap = nodeMap; this.maxX = maxX; this.maxY = maxY;
    this._measureLabels();
    this._updateScaleX(false);
    this._updateMinScaleY();
    // Fit the whole tree into view.
    const newOffsetY = this.paddingTop + this.minScaleY * 0.5;
    this._setTarget(newOffsetY, this.minScaleY, false);

    // Seed animation: the node we were rooted at slides from its current screen
    // position to wherever it lives in the full-tree layout.
    if (curRootId) {
      const restoredNode = nodeMap.get(curRootId);
      if (restoredNode) {
        this.offsetX = px_cur - restoredNode.x * this.scaleX;
        this.offsetY = py_cur - restoredNode.y * this.scaleY;
      }
    }
    this._animating = true;
    this._dirty = true;
    if (this._onLayoutChange) this._onLayoutChange(this.maxX, this._viewSubtreeRootId);
    if (this._onNavChange) this._onNavChange(this._navStack.length > 0, false);
    if (this._onNodeSelectChange) this._onNodeSelectChange(false);
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
    const r = this.tipRadius;
    const tipOuterR = r > 0 ? r + this.tipHaloSize : 0;
    this.labelRightPad = max + Math.max(tipOuterR, 5) + 5;
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

  zoomIn() {
    if (!this.nodes) return;
    this._fitLabelsMode = false;
    const centerY = this.canvas.clientHeight / 2;
    this._setTarget(this._targetOffsetY, this._targetScaleY * 1.5, false, centerY);
  }

  zoomOut() {
    if (!this.nodes) return;
    this._fitLabelsMode = false;
    const centerY = this.canvas.clientHeight / 2;
    this._setTarget(this._targetOffsetY, this._targetScaleY / 1.5, false, centerY);
  }

  /** Expand the flat centre zone of the hyperbolic lens by one row. */
  hypMagUp() {
    this._hypMagMult = Math.min(20, this._hypMagMult + 1);
    this._dirty = true;
  }

  /** Contract the flat centre zone of the hyperbolic lens by one row. */
  hypMagDown() {
    this._hypMagMult = Math.max(0, this._hypMagMult - 1);
    this._dirty = true;
  }

  /**
   * Render the full tree (fit-to-window) into an OffscreenCanvas at the given
   * CSS pixel dimensions.  The entire tree is drawn unclipped.
   * Does NOT mutate any persistent rendering state.
   *
   * @param {OffscreenCanvas} offscreenCanvas  target canvas (width × height in physical px)
   * @param {number} targetW   CSS-pixel width  of the canvas
   * @param {number} targetH   CSS-pixel height of the canvas
   */
  renderFull(offscreenCanvas, targetW, targetH, skipBg = false) {
    if (!this.nodes) return;
    const plotW = targetW - this.paddingLeft - this.labelRightPad;
    const plotH = targetH - this.paddingTop  - this.paddingBottom;
    const sx = plotW / (this.maxX || 1);
    const sy = plotH / ((this.maxY || 1) + 1);
    const ox = this.paddingLeft;
    const oy = this.paddingTop + sy * 0.5;

    // Stash current rendering state.
    const s_ctx = this.ctx, s_canvas = this.canvas;
    const s_sx = this.scaleX, s_ox = this.offsetX;
    const s_sy = this.scaleY, s_oy = this.offsetY;
    const s_hyp = this._hypFocusScreenY;
    const s_str = this._hypStrength;
    this._hypFocusScreenY = null;  // no fisheye distortion in exports
    this._hypStrength     = 0;

    // Install temporary state pointing at the offscreen canvas.
    this.ctx    = offscreenCanvas.getContext('2d');
    this.canvas = { clientWidth: targetW, clientHeight: targetH };
    this.scaleX = sx;  this.offsetX = ox;
    this.scaleY = sy;  this.offsetY = oy;
    this._skipBg = skipBg;

    this._draw();

    this._skipBg = false;
    // Restore.
    this.ctx    = s_ctx;  this.canvas = s_canvas;
    this.scaleX = s_sx;   this.offsetX = s_ox;
    this.scaleY = s_sy;   this.offsetY = s_oy;
    this._hypFocusScreenY = s_hyp;
    this._hypStrength     = s_str;
  }

  /**
   * Render the current viewport to an OffscreenCanvas without switching
   * scale/offset (used for transparent PNG export).
   */
  renderViewToOffscreen(oc, skipBg = false) {
    if (!this.nodes) return;
    const s_ctx = this.ctx, s_canvas = this.canvas;
    const s_hyp = this._hypFocusScreenY;
    const s_str = this._hypStrength;
    this._hypFocusScreenY = null;  // no fisheye in viewport exports
    this._hypStrength     = 0;
    const W = s_canvas.clientWidth, H = s_canvas.clientHeight;
    this.ctx    = oc.getContext('2d');
    this.canvas = { clientWidth: W, clientHeight: H };
    this._skipBg = skipBg;
    this._draw();
    this._skipBg = false;
    this.ctx    = s_ctx;
    this.canvas = s_canvas;
    this._hypFocusScreenY = s_hyp;
    this._hypStrength     = s_str;
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

  /** World Y → screen Y, with animated hyperbolic fisheye blend. */
  _wy(worldY) {
    const sy = this.offsetY + worldY * this.scaleY;
    if (this._hypFocusScreenY === null || this._hypStrength <= 0) return sy;
    const distorted = this._fisheyeScreenY(sy);
    if (this._hypStrength >= 1) return distorted;
    return sy + (distorted - sy) * this._hypStrength;
  }

  _worldYfromScreen(sy) { return (sy - this.offsetY) / this.scaleY; }
  _worldXfromScreen(sx) { return (sx - this.offsetX) / this.scaleX; }

  /**
   * Apply hyperbolic fisheye distortion to a linear screen-Y value.
   *
   * The lens has three zones:
   *   • Flat centre  (|d| ≤ W): uniform expansion at peak magFactor.
   *   • Outer zones  (|d| > W): Möbius-form falloff that smoothly
   *     continues from the flat zone and clamps the tree to its bounds.
   *
   * magFactor is capped at the "fit labels" level so the peak spacing never
   * exceeds what Fit Labels would produce.  _hypMagMult controls how many
   * rows wide the flat centre zone is (0 = pure hyperbolic, no flat section).
   */
  _fisheyeScreenY(sy) {
    const cy        = this._hypFocusScreenY;
    // Peak magnification = fit-labels level (capped)
    const magFactor = Math.max(1, (this.fontSize + 2) / this.scaleY);
    if (magFactor <= 1) return sy;  // already at or above fit-labels zoom

    const d      = sy - cy;
    const sy_top = this.offsetY + 0.5 * this.scaleY;
    const sy_bot = this.offsetY + (this.maxY + 0.5) * this.scaleY;

    // Asymmetric flat-zone half-widths: clamped so the flat section can never
    // push output beyond the tree bounds (available_space / magFactor).
    const W_req   = this._hypMagMult * this.scaleY;
    const W_above = Math.min(W_req, Math.max(0, cy - sy_top) / magFactor);
    const W_below = Math.min(W_req, Math.max(0, sy_bot - cy) / magFactor);
    const W       = d < 0 ? W_above : W_below;

    // ── Flat centre zone ──
    if (Math.abs(d) <= W) return cy + d * magFactor;

    // ── Outer hyperbolic zone ──
    // Maps x = |d|-W ∈ [0,D] → y ∈ [0,D_out] via y = b·m·x/(b+x)
    const sign  = d > 0 ? 1 : -1;
    const x     = Math.abs(d) - W;
    const D     = (d > 0 ? sy_bot - cy : cy - sy_top) - W;
    const D_out = D - W * (magFactor - 1);  // remaining output span
    if (D_out <= 0) return d > 0 ? sy_bot : sy_top;  // flat zone fills window

    const b = D * D_out / ((magFactor - 1) * (D + W));
    const y = b * magFactor * x / (b + x);
    return cy + sign * (W * magFactor + y);
  }

  /**
   * Whether a tip label at the given world-Y should be rendered.
   * In normal mode this is a global threshold; in hyperbolic-stretch mode
   * it checks the local inter-tip spacing using the derivative of the
   * piecewise fisheye function.
   */
  _showLabelAt(worldY) {
    const minScale  = this.fontSize * 0.5;
    if (this._hypFocusScreenY === null || this._hypStrength <= 0) return this.scaleY >= minScale;
    const magFactor = Math.max(1, (this.fontSize + 2) / this.scaleY);
    if (magFactor <= 1) return this.scaleY >= minScale;

    const sy_lin = this.offsetY + worldY * this.scaleY;
    const cy     = this._hypFocusScreenY;
    const W_req  = this._hypMagMult * this.scaleY;
    const sy_top = this.offsetY + 0.5 * this.scaleY;
    const sy_bot = this.offsetY + (this.maxY + 0.5) * this.scaleY;
    const d      = sy_lin - cy;
    const W      = d < 0
      ? Math.min(W_req, Math.max(0, cy - sy_top) / magFactor)
      : Math.min(W_req, Math.max(0, sy_bot - cy) / magFactor);
    const s      = this._hypStrength;

    // Inside flat zone: blended local scale = scaleY * (1 + (m-1)*s)
    if (Math.abs(d) <= W) {
      return this.scaleY * (1 + (magFactor - 1) * s) >= minScale;
    }

    // Outside flat zone: derivative of Möbius section, blended with identity
    const x      = Math.abs(d) - W;
    const D      = (d > 0 ? sy_bot - cy : cy - sy_top) - W;
    const D_out  = D - W * (magFactor - 1);
    if (D_out <= 0) return false;

    const b    = D * D_out / ((magFactor - 1) * (D + W));
    const dydx = b * b * magFactor / ((b + x) * (b + x));
    return this.scaleY * (1 - s + dydx * s) >= minScale;
  }

  _viewHash() {
    return `${this.scaleX.toFixed(4)}|${this.offsetX.toFixed(2)}|${this.paddingLeft}|${this.labelRightPad}|${this.bgColor}|${this.fontSize}|${this.canvas.clientWidth}|${this.canvas.clientHeight}`;
  }

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
    // Resize whichever legend canvas is visible.
    for (const lc of [this._legendLeftCanvas, this._legendRightCanvas]) {
      if (!lc || lc.style.display === 'none') continue;
      const LW = lc.clientWidth;
      const LH = lc.clientHeight || this.canvas.parentElement.clientHeight;
      lc.style.height = LH + 'px';
      lc.width  = LW * this.dpr;
      lc.height = LH * this.dpr;
      lc.getContext('2d').setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this._drawLegend();
    this._dirty = true;
  }

  /**
   * Paint the colour legend onto the active legend canvas.
   * Called after any change that affects the legend (resize, annotation change, etc.).
   */
  _drawLegend() {
    const pos  = this._legendPosition;
    const key  = this._legendAnnotation;
    const lcL  = this._legendLeftCanvas;
    const lcR  = this._legendRightCanvas;

    // Clear the inactive legend canvas.
    for (const lc of [lcL, lcR]) {
      if (!lc || lc.style.display === 'none') continue;
      const ic = lc.getContext('2d');
      ic.clearRect(0, 0, lc.width, lc.height);
    }

    const activeCanvas = pos === 'left' ? lcL : pos === 'right' ? lcR : null;
    if (!activeCanvas || activeCanvas.style.display === 'none') return;
    if (!key || !this._annotationSchema) return;
    const def = this._annotationSchema.get(key);
    if (!def) return;

    const W   = activeCanvas.width  / this.dpr;
    const H   = activeCanvas.height / this.dpr;
    const ctx = activeCanvas.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Background — match the tree canvas.
    if (!this._skipBg) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, W, H);
    }

    const PAD   = 12;
    const FONT  = 'monospace';
    let   y     = PAD;

    const lfs = this.legendFontSize;
    const ltc = this.legendTextColor;

    // Title — the annotation name.
    ctx.font         = `700 ${lfs}px ${FONT}`;
    ctx.fillStyle    = ltc;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(key, PAD, y, W - PAD * 2);
    y += lfs + 10;

    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const PALETTE = [
        '#2aa198', '#cb4b16', '#268bd2', '#d33682',
        '#6c71c4', '#b58900', '#859900', '#dc322f',
      ];
      const SWATCH = Math.max(8, lfs);
      const ROW_H  = Math.max(SWATCH + 4, lfs + 4);
      ctx.font         = `${lfs}px ${FONT}`;
      ctx.textBaseline = 'middle';
      (def.values || []).forEach((val, i) => {
        if (y + SWATCH > H - PAD) return;   // no space left
        const colour = PALETTE[i % PALETTE.length];
        ctx.fillStyle = colour;
        ctx.fillRect(PAD, y, SWATCH, SWATCH);
        ctx.fillStyle = ltc;
        ctx.textAlign = 'left';
        ctx.fillText(String(val), PAD + SWATCH + 6, y + SWATCH / 2, W - PAD * 2 - SWATCH - 6);
        y += ROW_H;
      });
    } else if (def.dataType === 'real' || def.dataType === 'integer') {
      const BAR_W  = 14;
      const BAR_X  = PAD;
      const BAR_Y  = y;
      const BAR_H  = Math.max(40, H - y - PAD);
      // Vertical gradient: top = max (red), bottom = min (teal).
      const grad   = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      grad.addColorStop(0, '#dc322f');   // red  (max)
      grad.addColorStop(1, '#2aa198');   // teal (min)
      ctx.fillStyle = grad;
      ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

      const min = def.min ?? 0;
      const max = def.max ?? 1;
      const range = max - min;
      const LABEL_X = BAR_X + BAR_W + 6;
      const LABEL_W = W - LABEL_X - PAD;

      // Draw tick labels: as many as fit, spread evenly.
      const tickCount = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
      ctx.font         = `${lfs}px ${FONT}`;
      ctx.fillStyle    = ltc;
      ctx.textAlign    = 'left';
      for (let i = 0; i < tickCount; i++) {
        const t      = i / (tickCount - 1);           // 0 = top (max) → 1 = bottom (min)
        const val    = max - t * range;
        const tickY  = BAR_Y + t * BAR_H;
        // Tick mark
        ctx.fillStyle = ltc;
        ctx.fillRect(BAR_X + BAR_W, tickY - 0.5, 4, 1);
        // Label — baseline anchors top/bottom at extremes, middle otherwise
        ctx.textBaseline = i === 0 ? 'top' : (i === tickCount - 1 ? 'bottom' : 'middle');
        const label  = def.dataType === 'integer'
          ? String(Math.round(val))
          : (Number.isInteger(range) ? String(Math.round(val)) : val.toPrecision(3));
        ctx.fillText(label, LABEL_X, tickY, LABEL_W);
      }
    }
  }

  _loop() {
    // ── Cross-fade overlay animation ──
    if (this._crossfadeAlpha > 0) {
      const EASE = 0.055;   // ~400 ms at 60 fps (1 / 0.055 ≈ 18 frames)
      this._crossfadeAlpha = Math.max(0, this._crossfadeAlpha - EASE);
      if (this._crossfadeAlpha === 0) this._crossfadeSnapshot = null;
      this._dirty = true;
    }

    // ── Per-node reorder animation (y positions) ──
    if (this._reorderAlpha < 1) {
      const EASE = 0.05;   // ~20 frames ≈ 330 ms at 60 fps (matches root-shift animation)
      this._reorderAlpha = Math.min(1, this._reorderAlpha + EASE);
      // Ease-in-out curve
      const t = this._reorderAlpha;
      const a = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      for (const node of this.nodes) {
        const fy = this._reorderFromY.get(node.id);
        const ty = this._reorderToY.get(node.id);
        if (fy !== undefined && ty !== undefined) {
          node.y = fy + (ty - fy) * a;
        }
      }
      if (this._reorderAlpha >= 1) {
        // Snap to final positions
        for (const node of this.nodes) {
          const ty = this._reorderToY.get(node.id);
          if (ty !== undefined) node.y = ty;
        }
        this._reorderFromY = null;
        this._reorderToY   = null;
      }
      this._dirty = true;
    }

    // ── Root-shift animation (slow ease-in-out for visual-root changes) ──
    if (this._rootShiftAlpha < 1) {
      const EASE = 0.05;   // ~20 frames ≈ 330 ms at 60 fps
      this._rootShiftAlpha = Math.min(1, this._rootShiftAlpha + EASE);
      const t = this._rootShiftAlpha;
      const a = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;   // ease-in-out
      this.offsetX = this._rootShiftFromX + (this._rootShiftToX - this._rootShiftFromX) * a;
      this._dirty = true;
    }

    if (this._animating) {
      const EASE = 0.16;
      const dY  = this._targetOffsetY - this.offsetY;
      const dSY = this._targetScaleY  - this.scaleY;
      const dSX = this._targetScaleX  - this.scaleX;
      // Skip the fast offsetX spring while the dedicated root-shift animation owns it.
      const dOX = this._rootShiftAlpha < 1 ? 0 : this._targetOffsetX - this.offsetX;
      if (Math.abs(dY) < 0.05 && Math.abs(dSY) < 5e-5 && Math.abs(dSX) < 5e-5 && Math.abs(dOX) < 0.05) {
        this.offsetY = this._targetOffsetY;
        this.scaleY  = this._targetScaleY;
        this.scaleX  = this._targetScaleX;
        if (this._rootShiftAlpha >= 1) this.offsetX = this._targetOffsetX;
        this._animating = false;
      } else {
        this.offsetY += dY  * EASE;
        this.scaleY  += dSY * EASE;
        this.scaleX  += dSX * EASE;
        if (this._rootShiftAlpha >= 1) this.offsetX += dOX * EASE;
      }
      this._dirty = true;
    }

    // Animate hyperbolic-stretch blend factor.
    if (this._hypStrength !== this._hypTarget) {
      const dH = this._hypTarget - this._hypStrength;
      if (Math.abs(dH) < 0.005) {
        this._hypStrength = this._hypTarget;
        if (this._hypTarget === 0) this._hypFocusScreenY = null;  // fully faded out
      } else {
        this._hypStrength += dH * 0.18;
      }
      this._dirty = true;
    }
    if (this._dirty) {
      this._draw();
      this._dirty = false;
    }
    if (this._onViewChange && (this._animating || this._reorderAlpha < 1 || this._rootShiftAlpha < 1 || this._crossfadeAlpha > 0 || !this._lastViewHash || this._lastViewHash !== this._viewHash())) {
      this._lastViewHash = this._viewHash();
      this._onViewChange(this.scaleX, this.offsetX, this.paddingLeft, this.labelRightPad, this.bgColor, this.fontSize, window.devicePixelRatio || 1);
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;

    ctx.clearRect(0, 0, W, H);
    if (!this._skipBg) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, W, H);
    }

    if (!this.nodes) return;

    // Viewport culling: world y range visible on screen (with a little margin)
    const yWorldMin = this._worldYfromScreen(-this.fontSize * 2);
    const yWorldMax = this._worldYfromScreen(H + this.fontSize * 2);

    ctx.font = `${this.fontSize}px monospace`;
    ctx.lineWidth = this.branchWidth;
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

        const cer = Math.max(0, Math.min(er, Math.abs(ny - py) * 0.4, (nx - px) * 0.4));
        if (cer === 0) continue; // zero-length branch — no corner to draw
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

    // ── Node shape rendering ───────────────────────────────────────────────────
    const r     = this.tipRadius;       // tip shape radius  (0 = invisible)
    const nodeR = this.nodeRadius;      // internal node shape radius (0 = invisible)

    // Halo stroke extends tipHaloSize px outward from the shape edge.
    const tipHalo  = this.tipHaloSize;
    const nodeHalo = this.nodeHaloSize;

    // Label x-offset: leave at least 5 px even when tip shapes are hidden.
    const outlineR = Math.max(r + tipHalo, 5);

    ctx.textBaseline = 'middle';
    // Show labels only when tips are spaced at least half a label-height apart.
    // In hyperbolic-stretch mode labels are assessed per-node (see _showLabelAt).
    const showLabels = this.scaleY >= this.fontSize * 0.5 || this._hypFocusScreenY !== null;

    // Pass 1 – halo strokes for internal node shapes
    if (nodeR > 0 && nodeHalo > 0) {
      ctx.strokeStyle = this.nodeShapeBgColor;
      ctx.lineWidth   = nodeHalo * 2;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (node.isTip) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + nodeR, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), nodeR, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Pass 1b – halo strokes for tip shapes (stroke centered on radius → extends haloSize outward)
    if (r > 0 && tipHalo > 0) {
      ctx.strokeStyle = this.tipShapeBgColor;
      ctx.lineWidth   = tipHalo * 2;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.isTip) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + r, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Pass 2 – fill circles for internal node shapes
    if (nodeR > 0) {
      if (this._nodeColourBy && this._nodeColourScale) {
        const key = this._nodeColourBy;
        for (const node of this.nodes) {
          if (node.isTip) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          const val = node.annotations ? node.annotations[key] : undefined;
          ctx.fillStyle = this._nodeColourForValue(val) ?? this.nodeShapeColor;
          ctx.beginPath();
          ctx.arc(this._wx(node.x), this._wy(node.y), nodeR, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = this.nodeShapeColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (node.isTip) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + nodeR, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), nodeR, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }

    // Pass 2b – fill circles for tip shapes
    if (r > 0) {
      if (this._tipColourBy && this._tipColourScale) {
        // Per-tip colour: draw each circle individually.
        const key = this._tipColourBy;
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          const val   = node.annotations ? node.annotations[key] : undefined;
          const col   = this._tipColourForValue(val) ?? this.tipShapeColor;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = this.tipShapeColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + r, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
        }
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
          if (!this._showLabelAt(node.y)) continue;
          if (node.name) ctx.fillText(node.name, this._wx(node.x) + outlineR + 3, this._wy(node.y));
        }
        // Sub-pass 3b: selected labels in selected colour
        ctx.fillStyle = this.selectedLabelColor;
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          if (node.name) ctx.fillText(node.name, this._wx(node.x) + outlineR + 3, this._wy(node.y));
        }
      } else if (this._labelColourBy && this._labelColourScale) {
        const key = this._labelColourBy;
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          if (!node.name) continue;
          const val = node.annotations ? node.annotations[key] : undefined;
          ctx.fillStyle = this._labelColourForValue(val) ?? this.labelColor;
          ctx.fillText(node.name, this._wx(node.x) + outlineR + 3, this._wy(node.y));
        }
      } else {
        ctx.fillStyle = this.labelColor;
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          if (node.name) ctx.fillText(node.name, this._wx(node.x) + outlineR + 3, this._wy(node.y));
        }
      }
    }

    // Pass 3.5 – selected tips (drawn above labels)
    if (this._selectedTipIds.size > 0) {
      const selRingW = Math.max(1.5, Math.max(r, 5) * 0.45);
      if (r > 0) {
        // Shape visible → ring stroke drawn on top of existing shape.
        const selBackR = r + selRingW + 1;

        // Background backing behind the ring
        ctx.fillStyle = this.tipShapeBgColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + selBackR, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), selBackR, 0, Math.PI * 2);
        }
        ctx.fill();

        // Selection ring stroke
        ctx.strokeStyle = this.selectedRingColor;
        ctx.lineWidth   = selRingW;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + r + selRingW * 0.5, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), r + selRingW * 0.5, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.lineWidth = 1;

        // Tip fill redraw on top (keeps annotation colour)
        if (this._tipColourBy && this._tipColourScale) {
          const key = this._tipColourBy;
          for (const node of this.nodes) {
            if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
            if (node.y < yWorldMin || node.y > yWorldMax) continue;
            const val = node.annotations ? node.annotations[key] : undefined;
            ctx.fillStyle = this._tipColourForValue(val) ?? this.tipShapeColor;
            ctx.beginPath();
            ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = this.tipShapeColor;
          ctx.beginPath();
          for (const node of this.nodes) {
            if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
            if (node.y < yWorldMin || node.y > yWorldMax) continue;
            ctx.moveTo(this._wx(node.x) + r, this._wy(node.y));
            ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      } else {
        // Shape invisible → ghost selection circle (fill + ring)
        const ghostR   = 5;
        const selBackR = ghostR + selRingW + 1;

        // Background backing
        ctx.fillStyle = this.tipShapeBgColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + selBackR, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), selBackR, 0, Math.PI * 2);
        }
        ctx.fill();

        // Ghost fill
        ctx.fillStyle = this.tipShapeColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + ghostR, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), ghostR, 0, Math.PI * 2);
        }
        ctx.fill();

        // Selection ring
        ctx.strokeStyle = this.selectedRingColor;
        ctx.lineWidth   = selRingW;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + ghostR + selRingW * 0.5, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), ghostR + selRingW * 0.5, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    // Pass 3.6 – MRCA circle: shown when 2+ tips are selected (drawn above labels)
    if (this._mrcaNodeId && this._selectedTipIds.size >= 2) {
      const mn = this.nodeMap.get(this._mrcaNodeId);
      if (mn) {
        const mnx   = this._wx(mn.x);
        const mny   = this._wy(mn.y);
        const ringW = Math.max(1.5, Math.max(nodeR, 4) * 0.5);
        if (nodeR > 0) {
          // Ring on top of visible internal node shape
          const backR = nodeR + ringW + 1;
          ctx.beginPath();
          ctx.arc(mnx, mny, backR, 0, Math.PI * 2);
          ctx.fillStyle = this.nodeShapeBgColor;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(mnx, mny, nodeR + ringW * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = this.mrcaRingColor;
          ctx.lineWidth   = ringW;
          ctx.stroke();
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.arc(mnx, mny, nodeR, 0, Math.PI * 2);
          ctx.fillStyle = this.nodeShapeColor;
          ctx.fill();
        } else {
          // Ghost MRCA circle (internal node shape hidden)
          const mrcaR = 5;
          const backR = mrcaR + ringW + 1;
          ctx.beginPath();
          ctx.arc(mnx, mny, backR, 0, Math.PI * 2);
          ctx.fillStyle = this.nodeShapeBgColor;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(mnx, mny, mrcaR + ringW * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = this.mrcaRingColor;
          ctx.lineWidth   = ringW;
          ctx.stroke();
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.arc(mnx, mny, mrcaR, 0, Math.PI * 2);
          ctx.fillStyle = this.internalColor;
          ctx.fill();
        }
      }
    }

    // Pass 4 – hovered node: always visible in nodes-mode, distinct colour, minimum size
    if (this._mode === 'nodes' && this._hoveredNodeId) {
      const hn = this.nodeMap.get(this._hoveredNodeId);
      if (hn) {
        const MIN_HOVER_R = 4;
        const hx          = this._wx(hn.x);
        const hy          = this._wy(hn.y);
        const baseColor   = hn.isTip ? this.tipColor : this.internalColor;
        const shapeR      = hn.isTip ? r : nodeR;
        const hr          = Math.max(MIN_HOVER_R, hn.isTip ? r * 1.4 : nodeR * 1.7);
        const darkColor   = this._darkenColor(baseColor, 0.55);
        const ringW       = Math.max(1.5, Math.max(shapeR, MIN_HOVER_R) * 0.5);
        const ringR       = hr + ringW * 0.5;
        const bgColor     = hn.isTip ? this.tipShapeBgColor : this.nodeShapeBgColor;

        // Backing circle
        ctx.beginPath();
        ctx.arc(hx, hy, ringR + 1, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Dark ring
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

    // Pass 5 – branches mode: draw hover and/or selection marker on branch
    if (this._mode === 'branches') {
      const br    = Math.max(nodeR, 4);             // minimum visible size
      const ringW = Math.max(1.5, br * 0.45);       // matches MRCA ring width

      const drawBranchMarker = (node, worldX, alpha) => {
        const bx = this._wx(worldX);
        const by = this._wy(node.y);
        ctx.globalAlpha = alpha;
        // Background backing
        ctx.beginPath();
        ctx.arc(bx, by, br + ringW + 1, 0, Math.PI * 2);
        ctx.fillStyle = this.nodeShapeBgColor;
        ctx.fill();
        // Coloured ring
        ctx.beginPath();
        ctx.arc(bx, by, br + ringW * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = this.mrcaRingColor;
        ctx.lineWidth   = ringW;
        ctx.stroke();
        ctx.lineWidth = 1;
        // Inner fill
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = this.internalColor;
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      // Hover preview (semi-transparent)
      if (this._branchHoverNode) {
        drawBranchMarker(this._branchHoverNode, this._branchHoverX, 0.5);
      }
      // Fixed selection (opaque)
      if (this._branchSelectNode) {
        drawBranchMarker(this._branchSelectNode, this._branchSelectX, 1);
      }
    }

    // Pass 6 – drag-select rectangle overlay
    if (this._dragSel && this._dragSelActive) {
      const { x0, y0, x1, y1 } = this._dragSel;
      const rx = Math.min(x0, x1), ry = Math.min(y0, y1);
      const rw = Math.abs(x1 - x0), rh = Math.abs(y1 - y0);
      ctx.save();
      ctx.fillStyle   = 'rgba(100,160,255,0.15)';
      ctx.strokeStyle = 'rgba(100,160,255,0.8)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 3]);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Cross-fade overlay: draw old snapshot fading out ──
    if (this._crossfadeSnapshot && this._crossfadeAlpha > 0) {
      const cW = this.canvas.clientWidth;
      const cH = this.canvas.clientHeight;
      // Ease-out: start fast, decelerate at end
      const t = this._crossfadeAlpha;
      const a = t * t;
      ctx.globalAlpha = a;
      ctx.drawImage(this._crossfadeSnapshot, 0, 0, cW, cH);
      ctx.globalAlpha = 1;
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

  /**
   * In branches mode: find the horizontal branch segment under (mx, my).
   * Returns { node, worldX } or null.
   * The horizontal segment of a branch runs from parent.x to node.x at y = node.y.
   */
  _findBranchAtScreen(mx, my) {
    if (!this.nodes) return null;
    const H        = this.canvas.clientHeight;
    const yMin     = this._worldYfromScreen(-20);
    const yMax     = this._worldYfromScreen(H + 20);
    const hitY     = 7;   // pixel tolerance perpendicular to branch
    let   bestNode = null;
    let   bestDY   = Infinity;
    for (const node of this.nodes) {
      if (!node.parentId) continue;
      if (node.y < yMin || node.y > yMax) continue;
      const parent = this.nodeMap.get(node.parentId);
      if (!parent) continue;
      const sy  = this._wy(node.y);
      const dy  = Math.abs(my - sy);
      if (dy > hitY) continue;
      const lx  = this._wx(parent.x);
      const rx  = this._wx(node.x);
      if (mx < lx || mx > rx) continue;
      if (dy < bestDY) { bestDY = dy; bestNode = node; }
    }
    if (!bestNode) return null;
    const parent = this.nodeMap.get(bestNode.parentId);
    const worldX = Math.max(parent.x, Math.min(bestNode.x, this._worldXfromScreen(mx)));
    return { node: bestNode, worldX };
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
      if (this._spaceDown || !this.graph) return;
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
      // Suppress the click that inevitably fires at the end of a drag-select.
      if (this._suppressNextClick) {
        this._suppressNextClick = false;
        return;
      }
      if (this._spaceDown) return;
      const rect = canvas.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;

      // Branches mode: fix a branch selection point or clear it.
      if (this._mode === 'branches') {
        const hit = this._findBranchAtScreen(mx, my);
        if (!hit) {
          this._branchSelectNode = null;
          this._branchSelectX    = null;
        } else {
          this._branchSelectNode = hit.node;
          this._branchSelectX    = hit.worldX;
        }
        if (this._onBranchSelectChange) this._onBranchSelectChange(!!hit);
        this._dirty = true;
        return;
      }

      const node     = this._findNodeAtScreen(mx, my);
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
      if (this._onNodeSelectChange) this._onNodeSelectChange(this._selectedTipIds.size > 0);
      this._drawStatusBar(this._lastStatusMx);
      this._dirty = true;
    });

    // ── Wheel: pinch (ctrlKey=true on Mac trackpad) → zoom;
    //          option+scroll (altKey=true) → vertical zoom centred on mouse Y;
    //          scroll (ctrlKey=false, altKey=false) → pan vertically.
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
      } else if (e.altKey) {
        // Option + scroll: zoom vertically, anchored at the mouse Y position.
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 20;
        if (e.deltaMode === 2) delta *= this.canvas.clientHeight;
        const factor = Math.pow(0.998, delta); // positive delta = scroll down = zoom out
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

    // ── mousedown: space held = pan; otherwise = begin drag-select in nodes-mode.
    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (this._spaceDown) {
        this._dragging        = true;
        this._lastY           = e.clientY;
        this._dragStartOffsetY = this.offsetY;
        // cancel any in-progress animation so the tree follows the pointer
        this._targetOffsetY = this.offsetY;
        this._targetScaleY  = this.scaleY;
        this._animating     = false;
        canvas.classList.remove('space');
        canvas.classList.add('grabbing');
      } else if (this._mode === 'nodes') {
        const rect = canvas.getBoundingClientRect();
        this._dragSelStartX = e.clientX - rect.left;
        this._dragSelStartY = e.clientY - rect.top;
        this._dragSelActive = false;
        this._dragSel       = null;
      }
    });

    window.addEventListener('mousemove', e => {
      if (this._dragging) {
        const dy = e.clientY - this._lastY;
        this._lastY  = e.clientY;
        const newOY  = this._clampedOffsetY(this.offsetY + dy, this.scaleY);
        this.offsetY        = newOY;
        this._targetOffsetY = newOY;
        this._dirty  = true;
      } else if (this._mode === 'nodes' && (e.buttons & 1) && this._dragSelStartX !== null) {
        // Drag-select: grow the rubber-band rect.
        const rect = canvas.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;
        const dx   = mx - this._dragSelStartX;
        const dy   = my - this._dragSelStartY;
        if (!this._dragSelActive && Math.hypot(dx, dy) > 5) {
          this._dragSelActive = true;
          canvas.style.cursor = 'crosshair';
        }
        if (this._dragSelActive) {
          this._dragSel = {
            x0: this._dragSelStartX, y0: this._dragSelStartY,
            x1: mx,                  y1: my,
            additive: e.metaKey || e.ctrlKey,
          };
          this._dirty = true;
        }
      }

      // Hover hit-test (suppressed during any drag)
      if (!this._dragging && !this._dragSelActive) {
        const rect = this.canvas.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;

        if (this._mode === 'branches') {
          const hit     = this._findBranchAtScreen(mx, my);
          const newNode = hit ? hit.node : null;
          const newX    = hit ? hit.worldX : null;
          if (newNode !== this._branchHoverNode || newX !== this._branchHoverX) {
            this._branchHoverNode = newNode;
            this._branchHoverX    = newX;
            this.canvas.style.cursor = newNode
              ? (this._spaceDown ? 'grab' : 'crosshair')
              : (this._spaceDown ? 'grab' : 'default');
            this._dirty = true;
          }
        } else {
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
      }

      if (e.target === this.canvas) this._updateStatus(e);

      // ── Hyperbolic stretch: update focus while Shift is held; persists on release ──
      if (this._shiftHeld && !this._dragging && !this._dragSelActive) {
        const rect_h = this.canvas.getBoundingClientRect();
        const hx = e.clientX - rect_h.left;
        const hy = e.clientY - rect_h.top;
        const inCanvas = hx >= 0 && hx <= this.canvas.clientWidth &&
                         hy >= 0 && hy <= this.canvas.clientHeight;
        if (inCanvas) {
          // Clamp focus to the screen range spanned by the tree's tips.
          const sy_top    = this.offsetY + 0.5 * this.scaleY;
          const sy_bot    = this.offsetY + (this.maxY + 0.5) * this.scaleY;
          const clampedHy = Math.min(sy_bot, Math.max(sy_top, hy));
          if (clampedHy !== this._hypFocusScreenY || this._hypTarget !== 1) {
            this._hypFocusScreenY = clampedHy;
            this._hypTarget       = 1;
            this._dirty           = true;
          }
          this.canvas.style.cursor = 'ns-resize';
        }
      }
      // Focus is NOT cleared here — it persists until Escape or explicit reset.
    });

    this.canvas.addEventListener('mouseleave', () => {
      let dirty = false;
      if (this._hoveredNodeId !== null)  { this._hoveredNodeId = null;  dirty = true; }
      if (this._branchHoverNode !== null) { this._branchHoverNode = null; this._branchHoverX = null; dirty = true; }
      // Note: _hypFocusScreenY is NOT cleared here — the lens persists when the pointer leaves.
      if (dirty) this._dirty = true;
    });

    window.addEventListener('mouseup', e => {
      if (this._dragging) {
        // Snap to the edge that was being revealed by the drag
        const scrolledDown = this.offsetY < this._dragStartOffsetY;
        this._targetOffsetY = this.offsetY;
        this._targetScaleY  = this.scaleY;
        this._snapToTip(scrolledDown);
      }
      this._dragging = false;
      this.canvas.classList.remove('grabbing');

      // Finalise drag-select: collect tips inside the rect then fire selection.
      if (this._dragSelActive && this._dragSel) {
        const { x0, y0, x1, y1, additive } = this._dragSel;
        const rxMin = Math.min(x0, x1), rxMax = Math.max(x0, x1);
        const ryMin = Math.min(y0, y1), ryMax = Math.max(y0, y1);
        const hits = [];
        if (this.nodes) {
          // Pre-compute label geometry (same as _findNodeAtScreen / _draw).
          const r        = this.tipRadius;
          const outlineR = Math.max(r + this.tipHaloSize, 5);
          const labelX0  = outlineR + 3;           // label starts this many px right of circle centre
          const halfH    = this.fontSize / 2 + 2;  // half-height of a label row
          const showLbls = this.scaleY >= this.fontSize * 0.5;
          this.ctx.font  = `${this.fontSize}px monospace`;
          for (const node of this.nodes) {
            if (!node.isTip) continue;
            const sx = this._wx(node.x);
            const sy = this._wy(node.y);
            // Vertical overlap: rect must intersect [sy - halfH, sy + halfH]
            if (ryMax < sy - halfH || ryMin > sy + halfH) continue;
            // Horizontal: hit either the circle or the label text.
            // Circle bounding box: [sx - r, sx + r]
            const circleHit = rxMax >= sx - r && rxMin <= sx + r;
            // Label bounding box: [sx + labelX0, sx + labelX0 + textWidth]
            let labelHit = false;
            if (showLbls && node.name) {
              const lx0 = sx + labelX0;
              const lx1 = lx0 + this.ctx.measureText(node.name).width;
              labelHit   = rxMax >= lx0 && rxMin <= lx1;
            }
            if (circleHit || labelHit) hits.push(node.id);
          }
        }
        if (additive) {
          hits.forEach(id => this._selectedTipIds.add(id));
        } else {
          this._selectedTipIds.clear();
          hits.forEach(id => this._selectedTipIds.add(id));
        }
        this._updateMRCA();
        if (this._onNodeSelectChange) this._onNodeSelectChange(this._selectedTipIds.size > 0);
        this._suppressNextClick = true;
        this._dirty = true;
      }
      this._dragSel       = null;
      this._dragSelActive = false;
      this._dragSelStartX = null;

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

      // Track Shift for hyperbolic stretch (no return — allow Shift combos to fall through)
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this._shiftHeld = true;
      }

      if (!this.nodes) return;

      const H        = canvas.clientHeight;
      const tipPx    = this.scaleY;               // one tip-row in screen pixels
      const pagePx   = H - tipPx;                 // one page minus one tip
      const zoomStep = 1.5;
      const centerY  = H / 2;

      // Cmd/Ctrl + '=' or '+' → zoom in; Cmd/Ctrl + '-' → zoom out.
      // Guard against Shift so Cmd+Shift+= / Cmd+Shift+- reach the lens handlers below.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        this._fitLabelsMode = false;
        this._setTarget(this._targetOffsetY, this._targetScaleY * zoomStep, false, centerY);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '-') {
        e.preventDefault();
        this._fitLabelsMode = false;
        this._setTarget(this._targetOffsetY, this._targetScaleY / zoomStep, false, centerY);
        return;
      }

      // Cmd/Ctrl + Shift + 0 → fit labels zoom.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Digit0') {
        e.preventDefault();
        this.fitLabels();
        return;
      }

      // Cmd/Ctrl + Shift + = → widen lens; Cmd/Ctrl + Shift + - → narrow lens.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Equal') {
        e.preventDefault();
        this.hypMagUp();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Minus') {
        e.preventDefault();
        this.hypMagDown();
        return;
      }

      // Cmd/Ctrl + 0 → fit current subtree vertically.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === 'Digit0') {
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

      // Escape – clear selection; also animate out the hyperbolic lens if active.
      if (e.key === 'Escape') {
        this._selectedTipIds.clear();
        this._mrcaNodeId = null;
        if (this._hypFocusScreenY !== null && this._hypTarget !== 0) {
          this._hypTarget = 0;   // triggers animated fade-out; focus Y cleared when strength reaches 0
          this._dirty     = true;
        }
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
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this._shiftHeld = false;
        // Focus persists — just restore the normal cursor hint.
        if (!this._spaceDown) {
          this.canvas.style.cursor = this._hoveredNodeId ? 'pointer' : 'default';
        }
      }
    });

    window.addEventListener('resize', () => this._resize());
  }

  /**
   * Build (or rebuild) _globalHeightMap from a full-tree layout.
   * height[id] = maxX - node.x  (distance from node down to most divergent tip).
   * Only called from setData / setDataAnimated so subtree navigation never overwrites it.
   */
  _buildGlobalHeightMap(nodes, maxX) {
    this._globalHeightMap = new Map();
    for (const n of nodes) this._globalHeightMap.set(n.id, maxX - n.x);
  }

  _computeStats() {
    // Returns { tipCount, distance, height, totalLength } for the status bar.
    if (!this.nodes) return null;
    const tipCount = this._selectedTipIds.size > 0 ? this._selectedTipIds.size : this.maxY;

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

    // Helper: look up global height (full-tree) for a node, fall back to
    // view-relative height when the map doesn't have the id (shouldn't happen).
    const globalH = (n) => {
      const gh = this._globalHeightMap.get(n.id);
      return gh != null ? gh : (this.maxX - n.x);
    };

    // Height above the most divergent tip *in the current view*.
    // = globalHeight(refNode) − min(globalHeight of tips in current view)
    // This gives the correct value whether viewing the full tree or a subtree.
    const viewTips = this.nodes.filter(n => n.isTip);
    const minTipGH = viewTips.length ? Math.min(...viewTips.map(globalH)) : 0;

    let height;
    if (!refNode) {
      // No selection: show height of the view root.
      const viewRoot = this.nodes.find(n => !n.parentId);
      height = viewRoot ? globalH(viewRoot) - minTipGH : this.maxX;
    } else if (refNode.isTip) {
      height = 0;
    } else {
      height = globalH(refNode) - minTipGH;
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
    // Leave the left 120 px for the brand element in the DOM.
    const BRAND_W = 120;
    const POS = {
      div:    BRAND_W,
      tip:    BRAND_W + 128,
      tips:   BRAND_W + 228,
      dist:   BRAND_W + 338,
      height: BRAND_W + 478,
      length: BRAND_W + 628,
    };

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
