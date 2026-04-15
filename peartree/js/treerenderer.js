// ─────────────────────────────────────────────────────────────────────────────
// Canvas renderer
// ─────────────────────────────────────────────────────────────────────────────

import { computeLayoutFromGraph } from './treeutils.js';
import { dateToDecimalYear, isNumericType, TreeCalibration } from './phylograph.js';
import { getSequentialPalette, lerpSequential,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         MISSING_DATA_COLOUR, buildCategoricalColourMap } from './palettes.js';
import { buildFont, TYPEFACES } from './typefaces.js';

// Sentinel annotation keys for calendar-date synthetic node/tip labels.
// peartree.js imports these to populate the label dropdowns.
export const CAL_DATE_KEY          = '__cal_date__';
export const CAL_DATE_HPD_KEY      = '__cal_date_hpd__';
export const CAL_DATE_HPD_ONLY_KEY = '__cal_date_hpd_only__';

// ─────────────────────────────────────────────────────────────────────────────
// Canvas renderer
// ─────────────────────────────────────────────────────────────────────────────

export class TreeRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} settings  Complete settings object — see setSettings() for all recognised keys.
   *                           peartree.js is responsible for supplying every key; the renderer
   *                           has no built-in defaults of its own.
   */
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // layout data
    this.nodes = null;
    this.nodeMap = null;
    this.maxX = 1;
    this.maxY = 1;

    // labelRightPad is measured after font is known
    this.labelRightPad   = 200;
    this._labelCacheKey  = null;  // invalidated when data or font/radius settings change
    this._maxLabelWidth  = 0;     // cached result of the measureText scan

    // Apply all rendering settings supplied by the caller (no built-in defaults).
    this.setSettings(settings, /*redraw*/ false);

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
    this._labelsWereVisible = null;  // tracks label visibility for horizontal-scale recalc
    this._shiftHeld       = false;   // true while Shift key is held
    this._hypFocusScreenY = null;    // screen-Y focus for hyperbolic-stretch mode (persistent)
    this._hypStrength     = 0;       // 0..1 blend factor (animated)
    this._hypTarget       = 0;       // animation target: 0 = off, 1 = full
    this._hypMagMult      = 10;      // flat-zone half-width in rows (0 = pure hyperbolic)
    this._onStatsChange   = null;  // callback(stats|null) fired when selection/data changes
    this._onHoverChange   = null;  // callback(id|null) fired when hovered node changes
    this.onHypActivate    = null;  // callback() fired when hyperbolic lens first becomes active
    this.onHypDeactivate  = null;  // callback() fired when hyperbolic lens is dismissed

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
    this._rttResidualsMap      = null;       // id → residual (from regression or mean) — set by peartree.js
    this._rttZScoresMap        = null;       // id → raw z-score
    this._rttOutliersMap       = null;       // id → outlier z-score (0 if |z|<=2)
    this._lastViewHash         = '';

    // animation targets (lerp toward these each frame)
    this._targetOffsetY = 0;
    this._targetScaleY  = 1;
    this._targetScaleX  = 1;   // animated horizontal scale
    this._animating     = false;
    this._reorderFromY          = null;   // Map<id, oldY> during reorder animation
    this._reorderToY            = null;   // Map<id, newY>
    this._reorderFromCollapsedN = null;   // Map<id, oldCollapsedTipCount>
    this._reorderToCollapsedN   = null;   // Map<id, newCollapsedTipCount>
    this._reorderFromScaleY     = null;   // viewport scaleY at animation start (fitViewport mode)
    this._reorderToScaleY       = null;   // viewport scaleY target
    this._reorderFromOffsetY    = null;   // viewport offsetY at animation start
    this._reorderToOffsetY      = null;   // viewport offsetY target
    this._reorderAlpha          = 1;      // 0→1; 1 = not animating

    // Intro animation (played once per tree load)
    this._introPhase          = null;   // null | 1 | 2
    this._introAlpha          = 0;      // 0→1 within current phase
    this._introStyle          = null;   // style name active during current animation
    this._introAnimationStyle = 'y-then-x';  // configured style (from settings)
    this._introFinalX         = null;   // Map<id, finalX>
    this._introFinalY         = null;   // Map<id, finalY>
    this._introRootY          = 0;

    // Root-shift animation (when effective visual root moves deeper/shallower after hide/show)
    this._rootShiftAlpha  = 1;    // 0→1; 1 = not animating
    this._rootShiftFromX  = 0;    // starting offsetX
    this._rootShiftToX    = 0;    // target offsetX (paddingLeft)

    // Cross-fade animation (used on midpoint-root and similar wholesale tree changes)
    this._crossfadeSnapshot = null;   // OffscreenCanvas capturing old frame

    // Annotation colouring
    this._annotationSchema          = null;   // Map<name, AnnotationDef> from buildAnnotationSchema
    this._annotationPaletteOverrides = new Map(); // annotKey → paletteName string
    this._annotationScaleModes        = new Map(); // annotKey → 'symmetric-zero'|'zero-positive'|'zero-one'|''
    this._tipColourBy      = null;   // annotation key or null
    this._tipColourScale   = null;   // Map<value, CSS colour> | null
    this._nodeColourBy     = null;   // annotation key for internal nodes, or null
    this._nodeColourScale  = null;   // Map<value, CSS colour> | null
    this._labelColourBy    = null;   // annotation key for tip labels, or null
    this._labelColourScale = null;   // Map<value, CSS colour> | null
    this._tipLabelShapeColourBy    = null;   // annotation key for tip-label shapes, or null
    this._tipLabelShapeColourScale = null;   // Map<value, CSS colour> | null
    this._tipLabelShape            = 'off';  // 'off' | 'square' | 'circle' | 'block'
    this._tipLabelShapeColor       = '#aaaaaa';
    this._tipLabelShapeSize        = 50;     // 1–100: % of scaleY (square/circle) or absolute px width (block)
    this._tipLabelShapeMarginLeft  = 2;      // px gap before shape
    this._tipLabelShapeSpacing     = 3;      // px gap between consecutive shapes
    // Extra tip-label shapes 2–10 (share shape 1's colour/size; progressive disclosure)
    this._tipLabelShapesExtra         = Array(9).fill('off');  // shape type per extra slot
    this._tipLabelShapeExtraColourBys = Array(9).fill(null);   // annotation key per extra slot
    this._tipLabelShapeExtraColourScales = Array(9).fill(null); // colour scale per extra slot
    this._crossfadeAlpha    = 0;      // 1→0; 0 = not animating

    // Legend (drawing delegated to LegendRenderer; registered via setLegendRenderer)
    this._legendRenderer = null;

    // Clade highlights: Map<nodeId, { colour }>.  Per-highlight colour
    // overrides the shared cladeHighlightColour style property.
    this._cladeHighlights = new Map();

    this._rafId = null;
    this._dirty = true;

    this._setupEvents();
    this._loop();
  }

  /**
   * Apply a Theme instance, overwriting all rendering-option properties.
   * Pass redraw=false during construction to skip the draw call.
   */
  /**
   * Apply a complete set of visual and layout settings to the renderer.
   * All property values must be correctly typed (numbers as numbers, not strings).
   * Called by the constructor (redraw=false) and may be called externally at any time.
   *
   * @param {object}  s        Settings object — see property assignments below for all keys.
   * @param {boolean} redraw   When true (default) and data is loaded, triggers a repaint.
   */
  setSettings(s, redraw = true) {
    // ── Visual appearance ───────────────────────────────────────────────────
    this.bgColor           = s.bgColor;
    this.branchColor       = s.branchColor;
    this.branchWidth       = s.branchWidth;
    this.fontSize          = s.fontSize;
    this._typefaceKey      = s.typefaceKey      ?? 'Monospace';
    this.fontFamily        = TYPEFACES[this._typefaceKey]?.family ?? this._typefaceKey ?? 'monospace';
    this._typefaceStyle    = s.typefaceStyle    ?? (TYPEFACES[this._typefaceKey]?.defaultStyle ?? 'Regular');
    this._tipLabelTypefaceKey   = s.tipLabelTypefaceKey   ?? null;  // null = follow main typeface
    this._tipLabelTypefaceStyle = s.tipLabelTypefaceStyle ?? null;

    // ── Tip shape ───────────────────────────────────────────────────────────
    this.tipRadius         = s.tipRadius;
    this.tipHaloSize       = s.tipHaloSize;
    this.tipShapeColor     = s.tipShapeColor;
    this.tipShapeBgColor   = s.tipShapeBgColor;

    // ── Node shape ──────────────────────────────────────────────────────────
    this.nodeRadius        = s.nodeRadius;
    this.nodeHaloSize      = s.nodeHaloSize;
    this.nodeShapeColor    = s.nodeShapeColor;
    this.nodeShapeBgColor  = s.nodeShapeBgColor;

    // ── Labels ──────────────────────────────────────────────────────────────
    // dimLabelColor and selectedLabelColor are derived from labelColor when not
    // explicitly supplied, matching the logic in setLabelColor().
    const { dim: _dim, selected: _sel } = TreeRenderer._deriveLabelColors(s.labelColor);
    this.labelColor         = s.labelColor;
    this.dimLabelColor      = s.dimLabelColor      ?? _dim;
    this.selectedLabelColor = s.selectedLabelColor ?? _sel;
    this.selectedLabelStyle = s.selectedLabelStyle ?? 'bold';
    this.tipLabelAnnotation         = s.tipLabelAnnotation ?? null;
    this._tipLabelsOff               = s.tipLabelsOff ?? false;
    this._tipLabelDecimalPlaces      = s.tipLabelDecimalPlaces  ?? null;  // null = auto (schema formatter)

    // ── Tip-label shapes ─────────────────────────────────────────────────────
    this._tipLabelShape            = s.tipLabelShape            ?? 'off';
    this._tipLabelShapeColor       = s.tipLabelShapeColor       ?? '#aaaaaa';
    this._tipLabelShapeSize        = +(s.tipLabelShapeSize        ?? 50);
    this._tipLabelShapeMarginLeft  = +(s.tipLabelShapeMarginLeft  ?? 2);
    this._tipLabelShapeSpacing     = +(s.tipLabelShapeSpacing     ?? 3);
    // ── Extra tip-label shapes 2–10 (share shape 1's colour/size) ────
    // Always reinitialise the shapes array (setSettings fully resets visual state).
    // ColourBy/Scale arrays are lazily created here on first call, then preserved
    // across subsequent setSettings calls (they are maintained by setTipLabelShapeExtraColourBy).
    this._tipLabelShapesExtra = Array(9).fill('off');
    if (!this._tipLabelShapeExtraColourBys) {
      this._tipLabelShapeExtraColourBys    = Array(9).fill(null);
      this._tipLabelShapeExtraColourScales = Array(9).fill(null);
    }
    if (Array.isArray(s.tipLabelShapesExtra)) {
      s.tipLabelShapesExtra.forEach((v, i) => { if (i < 9) this._tipLabelShapesExtra[i] = v ?? 'off'; });
    } else if (s.tipLabelShape2) {
      // Backward compat: old single shape-2 setting
      this._tipLabelShapesExtra[0] = s.tipLabelShape2;
    }

    // ── Layout geometry ─────────────────────────────────────────────────────
    this.paddingLeft            = s.paddingLeft;
    this.paddingRight           = s.paddingRight ?? 10;
    this.paddingTop             = s.paddingTop;
    this.paddingBottom          = s.paddingBottom;
    this.elbowRadius            = s.elbowRadius;
    this.rootStubLength         = s.rootStubLength;
    this.rootStemPct            = +(s.rootStemPct ?? 0);  // whole-tree stem as % of tree age
    this.clampNegativeBranches  = !!s.clampNegativeBranches;

    // ── Hover ───────────────────────────────────────────────────────────────
    this.tipHoverFillColor       = s.tipHoverFillColor;
    this.tipHoverStrokeColor     = s.tipHoverStrokeColor;
    this.tipHoverGrowthFactor    = s.tipHoverGrowthFactor;
    this.tipHoverMinSize         = s.tipHoverMinSize;
    this.tipHoverFillOpacity     = s.tipHoverFillOpacity;
    this.tipHoverStrokeWidth     = s.tipHoverStrokeWidth;
    this.tipHoverStrokeOpacity   = s.tipHoverStrokeOpacity;
    this.nodeHoverFillColor      = s.nodeHoverFillColor;
    this.nodeHoverStrokeColor    = s.nodeHoverStrokeColor;
    this.nodeHoverGrowthFactor   = s.nodeHoverGrowthFactor;
    this.nodeHoverMinSize        = s.nodeHoverMinSize;
    this.nodeHoverFillOpacity    = s.nodeHoverFillOpacity;
    this.nodeHoverStrokeWidth    = s.nodeHoverStrokeWidth;
    this.nodeHoverStrokeOpacity  = s.nodeHoverStrokeOpacity;

    // ── Selection ───────────────────────────────────────────────────────────
    this.selectedTipStrokeColor   = s.selectedTipStrokeColor;
    this.selectedTipFillColor     = s.selectedTipFillColor;
    this.selectedTipGrowthFactor  = s.selectedTipGrowthFactor;
    this.selectedTipMinSize       = s.selectedTipMinSize;
    this.selectedTipFillOpacity   = s.selectedTipFillOpacity;
    this.selectedTipStrokeWidth   = s.selectedTipStrokeWidth;
    this.selectedTipStrokeOpacity = s.selectedTipStrokeOpacity;
    this.selectedNodeStrokeColor   = s.selectedNodeStrokeColor;
    this.selectedNodeFillColor     = s.selectedNodeFillColor;
    this.selectedNodeGrowthFactor  = s.selectedNodeGrowthFactor;
    this.selectedNodeMinSize       = s.selectedNodeMinSize;
    this.selectedNodeFillOpacity   = s.selectedNodeFillOpacity;
    this.selectedNodeStrokeWidth   = s.selectedNodeStrokeWidth;
    this.selectedNodeStrokeOpacity = s.selectedNodeStrokeOpacity;

    // ── Node bars (95% HPD intervals drawn behind branches) ─────────────────
    this.nodeBarsEnabled    = s.nodeBarsEnabled    ?? false;
    this.nodeBarsColor      = s.nodeBarsColor      ?? '#2aa198';
    this.nodeBarsWidth      = s.nodeBarsWidth      ?? 6;
    this.nodeBarsLine = s.nodeBarsLine ?? 'off';
    this.nodeBarsRange       = s.nodeBarsRange       ?? false;
    this.nodeBarsFillOpacity   = s.nodeBarsFillOpacity   != null ? +s.nodeBarsFillOpacity   : 0.22;
    this.nodeBarsStrokeOpacity = s.nodeBarsStrokeOpacity != null ? +s.nodeBarsStrokeOpacity : 0.55;

    // ── Calendar-date label support ───────────────────────────────────────
    // calCalibration: active TreeCalibration instance (or null)
    // calDateFormat:  format string used by decYearToString()
    // Use 'in' check so an explicit null from _buildRendererSettings properly clears the calibration.
    this._calCalibration = 'calCalibration' in s ? (s.calCalibration ?? null) : (this._calCalibration ?? null);
    this._calDateFormat  = s.calDateFormat  ?? this._calDateFormat  ?? 'yyyy-MM-dd';

    // ── Node labels (internal-node annotation labels drawn on top) ────────
    this.nodeLabelAnnotation      = s.nodeLabelAnnotation || null;
    this._nodeLabelDecimalPlaces = s.nodeLabelDecimalPlaces ?? null;  // null = auto
    this.nodeLabelPosition   = s.nodeLabelPosition   ?? 'right';
    this.nodeLabelFontSize   = s.nodeLabelFontSize   != null ? +s.nodeLabelFontSize : 9;
    this.nodeLabelColor      = s.nodeLabelColor      ?? '#aaaaaa';
    this.nodeLabelSpacing    = s.nodeLabelSpacing    != null ? +s.nodeLabelSpacing  : 4;
    this._nodeLabelTypefaceKey   = s.nodeLabelTypefaceKey   ?? null;  // null = follow main typeface
    this._nodeLabelTypefaceStyle = s.nodeLabelTypefaceStyle ?? null;
    this.tipLabelSpacing     = s.tipLabelSpacing     != null ? +s.tipLabelSpacing   : 3;

    // ── Aligned tip labels ────────────────────────────────────────────────
    // Value is a string: 'off' | 'aligned' | 'dashed' | 'dots' | 'solid'
    // Accept legacy boolean true for backwards compatibility.
    const _al = s.tipLabelAlign ?? 'off';
    this.tipLabelAlign = (_al === true || _al === 'on') ? 'aligned' : (_al === false ? 'off' : _al);

    // ── Intro animation style — persisted across tree loads. ──────────────
    if (s.introAnimation !== undefined) this._introAnimationStyle = s.introAnimation;

    // ── Collapsed clades ─────────────────────────────────────────────────
    this._collapsedCladeOpacity  = s.collapsedCladeOpacity  != null ? +s.collapsedCladeOpacity  : (this._collapsedCladeOpacity  ?? 0.25);
    this._collapsedCladeHeightN  = s.collapsedCladeHeightN  != null ? +s.collapsedCladeHeightN  : (this._collapsedCladeHeightN  ?? 3);
    this._collapsedCladeFontSize = s.collapsedCladeFontSize != null ? +s.collapsedCladeFontSize : (this._collapsedCladeFontSize ?? 11);
    this._collapsedCladeTypefaceKey   = s.collapsedCladeTypefaceKey   ?? null;  // null = follow main typeface
    this._collapsedCladeTypefaceStyle = s.collapsedCladeTypefaceStyle ?? null;

    // ── Clade highlights ──────────────────────────────────────────────────
    this.cladeHighlightLeftEdge    = s.cladeHighlightLeftEdge    ?? (this.cladeHighlightLeftEdge    ?? 'atRoot');
    this.cladeHighlightRightEdge   = s.cladeHighlightRightEdge   ?? (this.cladeHighlightRightEdge   ?? 'atLabels');
    this.cladeHighlightPadding     = s.cladeHighlightPadding     != null ? +s.cladeHighlightPadding     : (this.cladeHighlightPadding     ?? 6);
    this.cladeHighlightRadius      = s.cladeHighlightRadius      != null ? +s.cladeHighlightRadius      : (this.cladeHighlightRadius      ?? 4);
    this.cladeHighlightStrokeWidth = s.cladeHighlightStrokeWidth != null ? +s.cladeHighlightStrokeWidth : (this.cladeHighlightStrokeWidth ?? 1);
    this.cladeHighlightFillOpacity = s.cladeHighlightFillOpacity != null ? +s.cladeHighlightFillOpacity : (this.cladeHighlightFillOpacity ?? 0.15);
    this.cladeHighlightStrokeOpacity = s.cladeHighlightStrokeOpacity != null ? +s.cladeHighlightStrokeOpacity : (this.cladeHighlightStrokeOpacity ?? 0.70);
    this.cladeHighlightColour      = s.cladeHighlightColour      ?? (this.cladeHighlightColour      ?? '#ffaa00');

    // Propagate bg colour to an attached legend renderer.
    this._legendRenderer?.setBgColor(this.bgColor, this._skipBg);

    if (redraw && this.nodes) {
      this._measureLabels();
      this._updateScaleX();
      this._updateMinScaleY();
      this._dirty = true;
    }
  }

  setData(nodes, nodeMap, maxX, maxY) {
    this._reorderAlpha    = 1;  // cancel any in-progress reorder animation
    this._introPhase      = null;  // cancel any in-progress intro animation
    this._hypFocusScreenY = null;
    this._hypStrength     = 0;
    this._hypTarget       = 0;
    this.nodes = nodes;
    this.nodeMap = nodeMap;
    this.maxX = maxX;
    this.maxY = maxY;
    this._buildGlobalHeightMap(nodes, maxX);
    this._labelCacheKey = null;  // new node set — remeasure label widths
    this._measureLabels();
    // For large trees the zoom-in animation stalls: each successive frame must
    // draw progressively more of the (potentially) 200k nodes as minScaleY is
    // approached.  Instead of animating, snap instantly to a "landing zoom"
    // that shows ~500 rows — still readable, avoids a blank screen (minScaleY
    // for 100k tips ≈ 0.01 px/row, which is invisible).  For smaller trees the
    // normal animated fit-to-window is fine.
    if (nodes.length > 60000) {
      this._fitLabelsMode = false;
      this._updateMinScaleY();       // recomputes this.minScaleY
      const plotH     = this.canvas.clientHeight - this.paddingTop - this.paddingBottom;
      const landingY  = Math.max(this.minScaleY, plotH / 500);  // show ~500 rows
      // Use landingY for the label-visibility check so scaleX is correct immediately.
      const _prevScaleY = this.scaleY;
      this.scaleY = landingY;
      this._updateScaleX();          // immediate snap: scaleX/offsetX fitted
      this.scaleY = _prevScaleY;
      const offsetY   = this.paddingTop + landingY * 0.5;
      this._setTarget(offsetY, landingY, /*immediate*/ true);
      this._dirty = true;
    } else {
      this.fitToWindow();  // animated
    }
    // Colour scales for numeric annotations are based on visible-node values,
    // so rebuild them whenever the node set changes.
    this._rebuildNumericColourScales();
    this._notifyStats();
  }

  /**
   * Replace the layout data (same as setData) but animate each node's y
   * position from its old screen row to the new one.  Does NOT reset the
   * viewport (scaleY / offsetY), so the caller can handle zoom-restoration
   * itself with _setTarget as usual.
   *
   * Pass fitViewport:true to also lerp scaleY/offsetY to fit the new layout
   * in the same animation pass, keeping everything in sync.
   */
  setDataAnimated(nodes, nodeMap, maxX, maxY, { fitViewport = false } = {}) {
    // For very large trees the per-frame node iteration is too expensive.
    // Fall back to an instant update (no reorder animation) above ~30k tips.
    if (nodes.length > 60000) return this.setData(nodes, nodeMap, maxX, maxY);

    // Snapshot old y values and collapsedTipCount values by node id.
    const fromY = new Map();
    const fromCollapsedN = new Map();
    if (this.nodes) {
      for (const n of this.nodes) {
        fromY.set(n.id, n.y);
        if (n.isCollapsed) fromCollapsedN.set(n.id, n.collapsedTipCount);
      }
    }
    // Build target y map and target collapsedTipCount map from new layout.
    const toY = new Map();
    const toCollapsedN = new Map();
    for (const n of nodes) {
      toY.set(n.id, n.y);
      if (n.isCollapsed) toCollapsedN.set(n.id, n.collapsedTipCount);
    }

    // Install new layout.
    this.nodes   = nodes;
    this.nodeMap = nodeMap;
    this.maxX    = maxX;
    this.maxY    = maxY;
    this._buildGlobalHeightMap(nodes, maxX);
    this._labelCacheKey = null;  // new node set — remeasure label widths
    this._measureLabels();
    this._updateScaleX(false);
    this._updateMinScaleY();
    // Rebuild numeric colour scales for the new visible node set.
    this._rebuildNumericColourScales();

    // Notify observers while nodes still carry their final target y values so
    // consumers (e.g. data table) see the correct post-sort order.
    if (this._onLayoutChange) this._onLayoutChange(this.maxX, this._viewSubtreeRootId);

    // Seed animation: set every node's y and collapsedTipCount to their old
    // values so the lerp starts from the current visual state.
    for (const n of this.nodes) {
      const fy = fromY.get(n.id);
      if (fy !== undefined) n.y = fy;
      if (n.isCollapsed) {
        const fc = fromCollapsedN.get(n.id);
        if (fc !== undefined) n.collapsedTipCount = fc;
      }
    }
    this._reorderFromY        = fromY;
    this._reorderToY          = toY;
    this._reorderFromCollapsedN = fromCollapsedN;
    this._reorderToCollapsedN   = toCollapsedN;
    // Optionally lerp the viewport in the same animation so it stays in sync.
    if (fitViewport) {
      this._reorderFromScaleY  = this.scaleY;
      this._reorderFromOffsetY = this.offsetY;
      // Compute where fitToWindow() would land, using the same clamping logic
      // as _setTarget, WITHOUT snapping scaleY/offsetY (an immediate snap would
      // pre-jump to the final scale before the first animation frame, causing a
      // visible one-frame flash and making subsequent drags start from the wrong
      // position because the "from" snapshot would pick up the pre-jumped value).
      const rawOffsetY           = this.paddingTop + this.minScaleY * 0.5;
      this._reorderToScaleY      = Math.max(this.minScaleY, this.minScaleY);  // = minScaleY
      this._reorderToOffsetY     = this._clampedOffsetY(rawOffsetY, this._reorderToScaleY);
      // Keep the spring target in sync so it doesn't re-animate after the
      // reorder finishes.  Don't snap immediately — the reorder owns the lerp.
      this._targetScaleY   = this._reorderToScaleY;
      this._targetOffsetY  = this._reorderToOffsetY;
      this._animating      = false;   // suppress spring while reorder runs
    } else {
      this._reorderFromScaleY = null;
    }
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

  /**
   * Trigger the intro animation for a freshly loaded tree.
   * The style is taken from `this._introAnimationStyle`:
   *   'y-then-x'    – spread vertically from root, then expand horizontally
   *   'x-then-y'    – expand horizontally from root, then spread vertically
   *   'simultaneous'– both axes move together from the root point
   *   'from-bottom' – all nodes slide up from the bottom of the tree space
   *   'from-top'    – all nodes slide down from the top of the tree space
   *   'none'        – no animation
   * Skipped silently for very large trees (>10 000 nodes).
   */
  startIntroAnimation() {
    if (!this.nodes || this.nodes.length === 0) return;
    if (this.nodes.length > 10000) return;  // skip for large trees

    const style = this._introAnimationStyle ?? 'y-then-x';
    if (style === 'none') return;

    // Root node: first entry in the DFS order (always x=0, y ≈ midpoint).
    const rootNode = this.nodes[0];
    this._introRootY = rootNode.y;
    this._introStyle  = style;

    // Capture final positions before we displace any nodes.
    this._introFinalX = new Map();
    this._introFinalY = new Map();
    for (const n of this.nodes) {
      this._introFinalX.set(n.id, n.x);
      this._introFinalY.set(n.id, n.y);
    }

    // Place every node at its starting position for the chosen style.
    for (const n of this.nodes) {
      switch (style) {
        case 'y-then-x':
        case 'x-then-y':
        case 'simultaneous':
          n.x = 0; n.y = this._introRootY;
          break;
        case 'from-bottom':
          n.x = this._introFinalX.get(n.id); n.y = this.maxY;
          break;
        case 'from-top':
          n.x = this._introFinalX.get(n.id); n.y = 0;
          break;
      }
    }

    this._introPhase = 1;
    this._introAlpha = 0;
    this._dirty = true;
  }

  /** Snap all nodes to their final positions and clear intro state. */
  _introEnd() {
    for (const node of this.nodes) {
      node.x = this._introFinalX.get(node.id);
      node.y = this._introFinalY.get(node.id);
    }
    this._introPhase = null;
    this._introFinalX = null;
    this._introFinalY = null;
  }

  setTipLabelAnnotation(key) {
    this.tipLabelAnnotation = key || null;
    this._labelCacheKey = null;
    this._measureLabels();
    this._updateScaleX();
    this._dirty = true;
  }

  setTipLabelsOff(v) {
    this._tipLabelsOff = !!v;
    this._labelCacheKey = null;
    this._measureLabels();
    this._updateScaleX();
    this._dirty = true;
  }

  setTipLabelAlign(val) {
    // Accept legacy boolean gracefully.
    if (val === true  || val === 'on')  val = 'aligned';
    if (val === false || val === null)  val = 'off';
    this.tipLabelAlign = val;
    this._dirty = true;
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
    this._notifyStats();
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

  setNodeLabelAnnotation(key) {
    this.nodeLabelAnnotation = key || null;
    this._dirty = true;
  }

  setNodeLabelPosition(pos) {
    this.nodeLabelPosition = pos;
    this._dirty = true;
  }

  setNodeLabelFontSize(sz) {
    this.nodeLabelFontSize = +sz;
    this._dirty = true;
  }

  setNodeLabelColor(c) {
    this.nodeLabelColor = c;
    this._dirty = true;
  }

  setNodeLabelSpacing(n) {
    this.nodeLabelSpacing = +n;
    this._dirty = true;
  }

  setTipLabelSpacing(n) {
    this.tipLabelSpacing = +n;
    if (this.nodes) {
      this._measureLabels();
      this._updateScaleX();
    }
    this._dirty = true;
  }

  /**
   * Build a CSS font string for canvas rendering from typeface key + style + size.
   * If key is null/undefined, falls back to the main tree typeface (_typefaceKey).
   * @param {number} sizePx
   * @param {string|null} [key]   – TYPEFACES key; null → main tree typeface
   * @param {string|null} [style] – style name; null → typeface defaultStyle
   * @returns {string}
   */
  _font(sizePx, key = null, style = null) {
    const k = key   ?? this._typefaceKey   ?? 'Monospace';
    const s = style ?? (key ? (TYPEFACES[k]?.defaultStyle ?? 'Regular') : (this._typefaceStyle ?? 'Regular'));
    return buildFont(k, s, sizePx);
  }

  /** CSS font string for tip labels (uses _tipLabelTypefaceKey if set, else main typeface). */
  _tipFont(sizePx) {
    return this._font(sizePx, this._tipLabelTypefaceKey || null, this._tipLabelTypefaceStyle || null);
  }

  /**
   * CSS font string for selected labels — applies selectedLabelStyle ('bold', 'italic',
   * 'bold italic', 'normal') on top of the base typeface weight, so that e.g. Thin + bold
   * selects the nearest bolder style rather than emitting an invalid two-weight string.
   *
   * @param {number} sizePx
   * @param {string|null} key    – typeface key (null → use main typeface)
   * @param {string|null} style  – base style name (null → use main typeface style)
   */
  _selectedFont(sizePx, key = null, style = null) {
    const sel = this.selectedLabelStyle || 'bold';
    if (sel === 'normal') return this._font(sizePx, key, style);

    const k   = key   ?? this._typefaceKey   ?? 'Monospace';
    const s   = style ?? (key ? (TYPEFACES[k]?.defaultStyle ?? 'Regular') : (this._typefaceStyle ?? 'Regular'));
    const face = TYPEFACES[k];

    if (!face) {
      // Raw CSS family fallback — just prepend the keyword (original behaviour).
      return `${sel} ${this._font(sizePx, key, style)}`;
    }

    // Determine desired weight and fontStyle from the sel override.
    const wantBold   = sel === 'bold' || sel === 'bold italic';
    const wantItalic = sel === 'italic' || sel === 'bold italic';

    // Base weight from the current style.
    const baseWeight = face.styles[s]?.weight ?? 400;
    const targetWeight = wantBold ? Math.min(baseWeight + 300, 900) : baseWeight;
    const targetFontStyle = wantItalic ? 'italic' : 'normal';

    // Find the closest matching style in this typeface.
    let bestKey = s;
    let bestScore = Infinity;
    for (const [name, desc] of Object.entries(face.styles)) {
      const wDiff = Math.abs(desc.weight - targetWeight);
      const fMatch = desc.fontStyle === targetFontStyle ? 0 : 1;
      const score = wDiff + fMatch * 200;
      if (score < bestScore) { bestScore = score; bestKey = name; }
    }
    return buildFont(k, bestKey, sizePx);
  }

  /**
   * @param {TreeCalibration|null} cal
   * @param {string} [fmt]  date format string, e.g. 'yyyy-MM-dd'
   */
  setCalibration(cal, fmt) {
    this._calCalibration = cal?.isActive ? cal : null;
    if (fmt != null) this._calDateFormat = fmt;
    this._labelCacheKey = null;  // invalidate tip-label width cache
    // Re-measure labels and re-fit the X scale: date strings are often wider
    // than the plain node names measured during setData(), and labelRightPad
    // must be updated before the next draw or the rightmost labels will clip.
    if (this.nodes) {
      this._measureLabels();
      this._updateScaleX();
    }
    this._dirty = true;
  }

  /** Update only the date format used for calendar-date labels. */
  setCalDateFormat(fmt) {
    if (this._calDateFormat === fmt) return;
    this._calDateFormat = fmt;
    this._labelCacheKey = null;  // invalidate tip-label width cache
    // Re-measure and re-fit: the formatted date width may differ.
    if (this.nodes) {
      this._measureLabels();
      this._updateScaleX();
    }
    this._dirty = true;
  }

  setBgColor(c) {
    this.bgColor = c;
    this._legendRenderer?.setBgColor(c, this._skipBg);
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
    const { dim, selected } = TreeRenderer._deriveLabelColors(hex);
    this.labelColor         = hex;
    this.dimLabelColor      = dim;
    this.selectedLabelColor = selected;
    this._dirty = true;
  }

  /** Set the font style applied to selected tip labels: 'normal' | 'bold' | 'italic' | 'bold italic'. */
  setSelectedLabelStyle(style) {
    this.selectedLabelStyle = style || 'bold';
    this._dirty = true;
  }

  /** Colour of the ring drawn around selected tip nodes. */
  setSelectedTipStrokeColor(c) {
    this.selectedTipStrokeColor = c;
    this._dirty = true;
  }

  /** Colour of the ring drawn around the MRCA node. */
  setSelectedNodeStrokeColor(c) {
    this.selectedNodeStrokeColor = c;
    this._dirty = true;
  }

  /** Fill colour used for a hovered tip node. */
  setTipHoverFillColor(c) {
    this.tipHoverFillColor = c;
    this._dirty = true;
  }

  /** Fill colour used for a hovered internal node (and MRCA node fill). */
  setNodeHoverFillColor(c) {
    this.nodeHoverFillColor = c;
    this._dirty = true;
  }

  /** Ring/stroke colour drawn around a hovered tip. */
  setTipHoverStrokeColor(c)        { this.tipHoverStrokeColor = c;        this._dirty = true; }
  /** Growth factor (marker radius = max(tipRadius × factor, minSize)). */
  setTipHoverGrowthFactor(f)       { this.tipHoverGrowthFactor = f;       this._dirty = true; }
  /** Minimum radius (px) of the hover indicator for tips. */
  setTipHoverMinSize(n)            { this.tipHoverMinSize = n;            this._dirty = true; }
  /** Opacity (0–1) of the filled circle for tip hover. */
  setTipHoverFillOpacity(a)        { this.tipHoverFillOpacity = a;        this._dirty = true; }
  /** Stroke width (px) of the hover ring for tips. */
  setTipHoverStrokeWidth(w)        { this.tipHoverStrokeWidth = w;        this._dirty = true; }
  /** Opacity (0–1) of the ring stroke for tip hover. */
  setTipHoverStrokeOpacity(a)      { this.tipHoverStrokeOpacity = a;      this._dirty = true; }

  /** Ring/stroke colour drawn around a hovered internal node. */
  setNodeHoverStrokeColor(c)       { this.nodeHoverStrokeColor = c;       this._dirty = true; }
  /** Growth factor for the node hover indicator. */
  setNodeHoverGrowthFactor(f)      { this.nodeHoverGrowthFactor = f;      this._dirty = true; }
  /** Minimum radius (px) of the hover indicator for internal nodes. */
  setNodeHoverMinSize(n)           { this.nodeHoverMinSize = n;           this._dirty = true; }
  /** Opacity (0–1) of the filled circle for node hover. */
  setNodeHoverFillOpacity(a)       { this.nodeHoverFillOpacity = a;       this._dirty = true; }
  /** Stroke width (px) of the hover ring for internal nodes. */
  setNodeHoverStrokeWidth(w)       { this.nodeHoverStrokeWidth = w;       this._dirty = true; }
  /** Opacity (0–1) of the ring stroke for node hover. */
  setNodeHoverStrokeOpacity(a)     { this.nodeHoverStrokeOpacity = a;     this._dirty = true; }

  /** Fill colour of the selection indicator for selected tips. */
  setSelectedTipFillColor(c)       { this.selectedTipFillColor = c;       this._dirty = true; }
  /** Growth factor for the selected-tip indicator. */
  setSelectedTipGrowthFactor(f)    { this.selectedTipGrowthFactor = f;    this._dirty = true; }
  /** Minimum radius (px) of the selected-tip indicator. */
  setSelectedTipMinSize(n)         { this.selectedTipMinSize = n;         this._dirty = true; }
  /** Opacity (0–1) of the filled circle for selected tips. */
  setSelectedTipFillOpacity(a)     { this.selectedTipFillOpacity = a;     this._dirty = true; }
  /** Stroke width (px) of the selection ring for tips. */
  setSelectedTipStrokeWidth(w)     { this.selectedTipStrokeWidth = w;     this._dirty = true; }
  /** Opacity (0–1) of the ring stroke for selected tips. */
  setSelectedTipStrokeOpacity(a)   { this.selectedTipStrokeOpacity = a;   this._dirty = true; }

  /** Fill colour of the MRCA/selection indicator for internal nodes. */
  setSelectedNodeFillColor(c)      { this.selectedNodeFillColor = c;      this._dirty = true; }
  /** Growth factor for the selected-node / MRCA indicator. */
  setSelectedNodeGrowthFactor(f)   { this.selectedNodeGrowthFactor = f;   this._dirty = true; }
  /** Minimum radius (px) of the MRCA indicator. */
  setSelectedNodeMinSize(n)        { this.selectedNodeMinSize = n;        this._dirty = true; }
  /** Opacity (0–1) of the filled circle for selected/MRCA node. */
  setSelectedNodeFillOpacity(a)    { this.selectedNodeFillOpacity = a;    this._dirty = true; }
  /** Stroke width (px) of the MRCA/selection ring for internal nodes. */
  setSelectedNodeStrokeWidth(w)    { this.selectedNodeStrokeWidth = w;    this._dirty = true; }
  /** Opacity (0–1) of the ring stroke for selected/MRCA node. */
  setSelectedNodeStrokeOpacity(a)  { this.selectedNodeStrokeOpacity = a;  this._dirty = true; }

  static _hexToHsl(hex) {
    // Expand 3-char shorthand (#rgb → #rrggbb)
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
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
   * Derive the dim and selected label colours from a base label colour.
   * dim      → darker + more desaturated (unselected labels when a selection exists)
   * selected → brighter + less saturated (selected labels, approaching white)
   * @param {string} hex  Base label colour as a CSS hex string.
   * @returns {{ dim: string, selected: string }}
   */
  static _deriveLabelColors(hex) {
    const { h, s, l } = TreeRenderer._hexToHsl(hex);
    return {
      dim:      TreeRenderer._hslToHex(h, s * 0.70, l * 0.83),
      selected: TreeRenderer._hslToHex(h, s * 0.50, Math.min(97, l * 1.08)),
    };
  }

  /**
   * Store the annotation schema so the renderer can build colour scales.
   * Called by peartree.js immediately after graph = fromNestedRoot(root).
   * @param {Map<string, AnnotationDef>} schema
   */
  setAnnotationSchema(schema) {
    this._annotationSchema = schema;
    if (this._tipColourBy)            this._tipColourScale            = this._buildColourScale(this._tipColourBy);
    if (this._nodeColourBy)           this._nodeColourScale           = this._buildColourScale(this._nodeColourBy);
    if (this._labelColourBy)          this._labelColourScale          = this._buildColourScale(this._labelColourBy);
    if (this._tipLabelShapeColourBy)  this._tipLabelShapeColourScale  = this._buildColourScale(this._tipLabelShapeColourBy);
    for (let i = 0; i < this._tipLabelShapeExtraColourBys.length; i++) {
      if (this._tipLabelShapeExtraColourBys[i])
        this._tipLabelShapeExtraColourScales[i] = this._buildColourScale(this._tipLabelShapeExtraColourBys[i]);
    }
    this._legendRenderer?.setAnnotationSchema(schema);
    this._legendRenderer?.setPaletteOverrides(this._annotationPaletteOverrides);
    this._legendRenderer?.setScaleModeOverrides(this._annotationScaleModes);
    this._pushLiveRangesToLegend();
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

  /** Set the shape style for tip-label swatches: 'off' | 'square' | 'circle' | 'block'. */
  setTipLabelShape(shape) {
    this._tipLabelShape = shape || 'off';
    this._measureLabels();
    this._updateScaleX(false);
    this._dirty = true;
  }

  /** Set the size of tip-label shape swatches (1–100). For square/circle: % of scaleY. For block: ×0.1 width factor of scaleY. */
  setTipLabelShapeSize(n) {
    this._tipLabelShapeSize = n;
    this._measureLabels();
    this._updateScaleX(false);
    this._dirty = true;
  }

  /** Set the default fill colour for tip-label shape swatches. */
  setTipLabelShapeColor(hex) {
    this._tipLabelShapeColor = hex;
    this._dirty = true;
  }

  /**
   * Set the annotation key used to colour tip-label shape swatches.
   * Pass null (or empty string) to revert to the default swatch colour.
   */
  setTipLabelShapeColourBy(key) {
    this._tipLabelShapeColourBy    = key || null;
    this._tipLabelShapeColourScale = this._tipLabelShapeColourBy
      ? this._buildColourScale(this._tipLabelShapeColourBy) : null;
    this._dirty = true;
  }

  /** Set the left margin (px) between the tip edge and the left side of the swatch. */
  setTipLabelShapeMarginLeft(n) {
    this._tipLabelShapeMarginLeft = n;
    this._measureLabels();
    this._updateScaleX(false);
    this._dirty = true;
  }

  /** Legacy no-op kept for compatibility with older saved settings/UI code. */
  setTipLabelShapeMarginRight(n) {
    void n;
  }

  /** Set the spacing (px) between consecutive tip-label shapes. */
  setTipLabelShapeSpacing(n) {
    this._tipLabelShapeSpacing = n;
    this._measureLabels();
    this._updateScaleX(false);
    this._dirty = true;
  }

  /** Set the shape type for extra tip-label slot i (0-based, slots 0–8 = shapes 2–10): 'off' | 'square' | 'circle' | 'block'. */
  setTipLabelShapeExtra(i, shape) {
    this._tipLabelShapesExtra[i] = shape || 'off';
    this._measureLabels();
    this._updateScaleX(false);
    this._dirty = true;
  }

  /** Set the annotation key used to colour extra tip-label shape slot i (0-based). */
  setTipLabelShapeExtraColourBy(i, key) {
    this._tipLabelShapeExtraColourBys[i]    = key || null;
    this._tipLabelShapeExtraColourScales[i] = this._tipLabelShapeExtraColourBys[i]
      ? this._buildColourScale(this._tipLabelShapeExtraColourBys[i]) : null;
    this._dirty = true;
  }

  /**
   * Set (or clear) the palette to use for a specific annotation key.
   * Rebuilds any active colour scales that use that key.
   * @param {string}      key          Annotation name
   * @param {string|null} paletteName  Name from CATEGORICAL_PALETTES or SEQUENTIAL_PALETTES, or null to revert to default
   */
  setAnnotationPalette(key, paletteName) {
    if (paletteName) {
      this._annotationPaletteOverrides.set(key, paletteName);
    } else {
      this._annotationPaletteOverrides.delete(key);
    }
    // Rebuild any colour scale that references this annotation key.
    if (this._tipColourBy            === key) this._tipColourScale            = this._buildColourScale(key);
    if (this._nodeColourBy           === key) this._nodeColourScale           = this._buildColourScale(key);
    if (this._labelColourBy          === key) this._labelColourScale          = this._buildColourScale(key);
    if (this._tipLabelShapeColourBy  === key) this._tipLabelShapeColourScale  = this._buildColourScale(key);
    for (let i = 0; i < this._tipLabelShapeExtraColourBys.length; i++) {
      if (this._tipLabelShapeExtraColourBys[i] === key)
        this._tipLabelShapeExtraColourScales[i] = this._buildColourScale(key);
    }
    // Propagate to legend so it redraws with the new palette.
    this._legendRenderer?.setPaletteOverrides(this._annotationPaletteOverrides);
    this._pushLiveRangesToLegend();
    this._dirty = true;
  }

  /**
   * Set (or clear) the scale mode for a specific annotation key.
   * Rebuilds any active colour scales that use that key.
   * @param {string}      key   Annotation name
   * @param {string|null} mode  'symmetric-zero', 'zero-positive', 'zero-one', or null/''/falsy to revert
   */
  setAnnotationScaleMode(key, mode) {
    if (mode) {
      this._annotationScaleModes.set(key, mode);
    } else {
      this._annotationScaleModes.delete(key);
    }
    if (this._tipColourBy            === key) this._tipColourScale            = this._buildColourScale(key);
    if (this._nodeColourBy           === key) this._nodeColourScale           = this._buildColourScale(key);
    if (this._labelColourBy          === key) this._labelColourScale          = this._buildColourScale(key);
    if (this._tipLabelShapeColourBy  === key) this._tipLabelShapeColourScale  = this._buildColourScale(key);
    for (let i = 0; i < this._tipLabelShapeExtraColourBys.length; i++) {
      if (this._tipLabelShapeExtraColourBys[i] === key)
        this._tipLabelShapeExtraColourScales[i] = this._buildColourScale(key);
    }
    this._legendRenderer?.setScaleModeOverrides(this._annotationScaleModes);
    this._pushLiveRangesToLegend();
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
      identity.set('__identity__', true);  // marker: missing → use default colour, not grey
      (def.values || []).forEach(v => identity.set(v, v));
      return identity;
    }

    const scale = new Map();
    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const paletteName = this._annotationPaletteOverrides.get(key);
      const colourMap = buildCategoricalColourMap(def.values || [], paletteName);
      for (const [v, c] of colourMap) scale.set(v, c);
    } else if (def.dataType === 'date') {
      // Sequential scale; values are ISO date strings converted to decimal years at draw time.
      scale.set('__min__',    dateToDecimalYear(def.min));
      scale.set('__max__',    dateToDecimalYear(def.max));
      scale.set('__palette__', this._annotationPaletteOverrides.get(key) ?? null);
      scale.set('__isDate__', true);
    } else if (isNumericType(def.dataType)) {
      // Compute live min/max from currently visible, non-collapsed nodes,
      // skipping null/undefined/missing values.  This keeps the colour scale
      // accurate after re-roots, subtree navigation, tip hide/show, annotation
      // edits in the data table, and changes to the RTT regression.
      let liveMin = Infinity, liveMax = -Infinity;
      if (this.nodes) {
        for (const n of this.nodes) {
          if (n.isTip && n.isCollapsed) {
            // Expand the individual tips inside the collapsed clade.
            if (n.collapsedTipNames && def.onTips !== false) {
              for (const tip of n.collapsedTipNames) {
                const v = this._statValue(tip, key);
                if (v == null || v === '?' || !Number.isFinite(v)) continue;
                if (v < liveMin) liveMin = v;
                if (v > liveMax) liveMax = v;
              }
            }
            continue;
          }
          if (def.onTips  === false && n.isTip)  continue;
          if (def.onNodes === false && !n.isTip) continue;
          const v = this._statValue(n, key);
          if (v == null || v === '?' || !Number.isFinite(v)) continue;
          if (v < liveMin) liveMin = v;
          if (v > liveMax) liveMax = v;
        }
      }
      // Fall back to schema bounds when no visible nodes have values (e.g. at
      // startup before setData() is called, or when all values are null).
      if (!isFinite(liveMin)) { liveMin = def.min ?? 0; liveMax = def.max ?? 1; }

      // Apply scale mode on top of the live range.
      const _mode = this._annotationScaleModes.get(key) ?? '';
      let effMin = liveMin, effMax = liveMax;
      if (_mode === 'symmetric-zero') {
        const maxAbs = Math.max(Math.abs(effMin), Math.abs(effMax));
        effMin = -maxAbs;
        effMax = +maxAbs;
      } else if (_mode === 'zero-positive') {
        effMin = 0;
      } else if (_mode === 'zero-one') {
        effMin = Math.min(effMin, 0);
        effMax = Math.max(effMax, 1);
      }
      scale.set('__min__', effMin);
      scale.set('__max__', effMax);
      scale.set('__liveMin__', liveMin);
      scale.set('__liveMax__', liveMax);
      scale.set('__palette__', this._annotationPaletteOverrides.get(key) ?? null);
    }
    return scale;
  }

  /**
   * Rebuild all active numeric colour scales (when node data or annotation
   * values have changed but the schema structure is unchanged).
   * Also pushes fresh live ranges to the legend renderer.
   */
  _rebuildNumericColourScales() {
    const rebuild = (key, current) => {
      if (!key) return current;
      const def = this._annotationSchema?.get(key);
      if (def && isNumericType(def.dataType)) return this._buildColourScale(key);
      return current;
    };
    this._tipColourScale   = rebuild(this._tipColourBy,   this._tipColourScale);
    this._nodeColourScale  = rebuild(this._nodeColourBy,  this._nodeColourScale);
    this._labelColourScale = rebuild(this._labelColourBy, this._labelColourScale);
    this._tipLabelShapeColourScale = rebuild(this._tipLabelShapeColourBy, this._tipLabelShapeColourScale);
    for (let i = 0; i < this._tipLabelShapeExtraColourBys.length; i++) {
      this._tipLabelShapeExtraColourScales[i] =
        rebuild(this._tipLabelShapeExtraColourBys[i], this._tipLabelShapeExtraColourScales[i]);
    }
    this._pushLiveRangesToLegend();
  }

  /**
   * Collect the current live min/max from every active numeric colour scale
   * and push them to the legend renderer so its tick labels stay accurate.
   */
  _pushLiveRangesToLegend() {
    if (!this._legendRenderer) return;
    const ranges = new Map();
    const addRange = (key, scale) => {
      if (!key || !scale) return;
      if (scale.has('__liveMin__')) ranges.set(key, { min: scale.get('__liveMin__'), max: scale.get('__liveMax__') });
    };
    addRange(this._tipColourBy,           this._tipColourScale);
    addRange(this._nodeColourBy,          this._nodeColourScale);
    addRange(this._labelColourBy,         this._labelColourScale);
    addRange(this._tipLabelShapeColourBy, this._tipLabelShapeColourScale);
    for (let i = 0; i < this._tipLabelShapeExtraColourBys.length; i++) {
      addRange(this._tipLabelShapeExtraColourBys[i], this._tipLabelShapeExtraColourScales[i]);
    }
    this._legendRenderer.setLiveRanges(ranges);
  }

  /** Return a CSS colour string for a value looked up in the given scale, or null. */
  _colourFromScale(value, scale) {
    if (!scale) return null;
    // Missing value: absent key, null/undefined, or '?' missing-data marker.
    // The identity scale (user_colour) is exempt — missing means no colour assigned,
    // so we return null and let the caller fall back to the default shape colour.
    if (value === null || value === undefined || value === '?') {
      return scale.get('__identity__') ? null : MISSING_DATA_COLOUR;
    }
    if (scale.has(value)) return scale.get(value);
    // Numeric interpolation for real/integer scales.
    if (scale.has('__min__')) {
      const rawValue = scale.get('__isDate__') ? dateToDecimalYear(value) : value;
      const min  = scale.get('__min__');
      const max  = scale.get('__max__');
      const t    = max > min ? (rawValue - min) / (max - min) : 0.5;
      return lerpSequential(t, getSequentialPalette(scale.get('__palette__')));
    }
    // Value not found in categorical scale — treat as missing.
    return MISSING_DATA_COLOUR;
  }

  _tipColourForValue(value)             { return this._colourFromScale(value, this._tipColourScale);   }
  _nodeColourForValue(value)            { return this._colourFromScale(value, this._nodeColourScale);  }
  _labelColourForValue(value)           { return this._colourFromScale(value, this._labelColourScale); }
  _tipLabelShapeColourForValue(value)   { return this._colourFromScale(value, this._tipLabelShapeColourScale); }
  _tipLabelShapeExtraColourForValue(i, value) { return this._colourFromScale(value, this._tipLabelShapeExtraColourScales[i]); }

  /**
   * Aggregate descendant tip annotation values for an internal node.
   * Returns the mean (numeric) or modal (categorical) value, or null if none.
   */
  _aggregateTipValue(node, key) {
    const def    = this._annotationSchema?.get(key);
    const tipIds = this._getDescendantTipIds(node.id);
    const vals   = [];
    for (const id of tipIds) {
      const t = this.nodeMap.get(id);
      const v = this._statValue(t, key) ?? t?.annotations?.[key];
      if (v != null && v !== '') vals.push(v);
    }
    if (vals.length === 0) return null;
    if (def && isNumericType(def.dataType)) {
      const nums = vals.map(Number).filter(v => !isNaN(v));
      if (nums.length === 0) return null;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    }
    const freq = new Map();
    for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  /** Pixel size of tip-label shape swatches, relative to the current inter-tip spacing (scaleY).
   *  square / circle: sizePercent 1–100 maps to 1–100 % of scaleY.
   *  block: sizePercent 1–100 maps to 0.1×–10× scaleY (width only; height is always scaleY). */
  _shapeSize(sizePercent, shape = 'square') {
    if (shape === 'block') {
      return Math.max(1, sizePercent);  // absolute px width, independent of row spacing
    }
    return Math.max(2, Math.round(this.scaleY * sizePercent / 100));
  }

  /**
   * Register a LegendRenderer instance.  TreeRenderer will automatically proxy
   * background-colour and annotation-schema changes to it, and call resize()
   * during its own _resize() pass.
   * @param {import('./legendrenderer.js').LegendRenderer} lr
   */
  setLegendRenderer(lr) {
    this._legendRenderer = lr;
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

  /**
   * Compute a new layout rooted at subtreeRootId (null = full tree) and
   * install it as the current view state, refreshing labels and scale bounds.
   * Used by all five navigation methods to eliminate the repeated 5-line pattern.
   * @param {string|null} subtreeRootId
   */
  _computeAndInstallLayout(subtreeRootId) {
    const { nodes, nodeMap, maxX, maxY } = computeLayoutFromGraph(
      this.graph, subtreeRootId, {
        clampNegativeBranches: this.clampNegativeBranches,
        collapsedCladeHeightN: this._collapsedCladeHeightN,
      });
    this.nodes = nodes; this.nodeMap = nodeMap; this.maxX = maxX; this.maxY = maxY;
    this._measureLabels();
    this._updateScaleX(false);
    this._updateMinScaleY();
  }

  /** Double-click on an internal layout node id → drill into its subtree.
   *  Also accepts collapsed clade nodes (isTip=true, isCollapsed=true). */
  navigateInto(layoutNodeId) {
    const layoutNode = this.nodeMap?.get(layoutNodeId);
    if (!layoutNode || (layoutNode.isTip && !layoutNode.isCollapsed) || !layoutNode.parentId) return;

    // Capture screen position of the clicked node BEFORE layout swap.
    const px_old = this.offsetX + layoutNode.x * this.scaleX;
    const py_old = this.offsetY + layoutNode.y * this.scaleY;

    this._navStack.push(this._currentViewState());
    this._fwdStack         = [];
    this._viewSubtreeRootId = layoutNodeId;
    this._selectedTipIds.clear();
    this._mrcaNodeId = null;

    // Compute new layout rooted at this node (x = 0).
    this._computeAndInstallLayout(layoutNodeId);
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

    // Save the current layout's info before we replace it (needed for undo-climb seeding).
    const oldNodeMap = this.nodeMap;
    const oldOffsetX = this.offsetX;
    const oldOffsetY = this.offsetY;
    const oldScaleX  = this.scaleX;
    const oldScaleY  = this.scaleY;

    this._fwdStack.push(this._currentViewState());
    const state              = this._navStack.pop();
    this._viewSubtreeRootId  = state.subtreeRootId;
    this._selectedTipIds     = new Set(state.selectedTipIds || []);
    this._mrcaNodeId         = state.mrcaNodeId || null;

    this._computeAndInstallLayout(state.subtreeRootId);
    this._setTarget(state.offsetY, state.scaleY, false);

    // Seed animation so the transition looks smooth.
    // Case A (undo drill-down): the previous layout's root exists in the
    //   restored layout — place it at its old screen position and spring in.
    // Case B (undo climb): the previous layout's root is NOT in the restored
    //   layout, but the restored subtree root IS visible in the old layout —
    //   place the new layout's root at that node's old screen position.
    let seeded = false;
    if (curRootId) {
      const restoredNode = nodeMap.get(curRootId);
      if (restoredNode) {
        this.offsetX = px_cur - restoredNode.x * this.scaleX;
        this.offsetY = py_cur - restoredNode.y * this.scaleY;
        seeded = true;
      }
    }
    if (!seeded && state.subtreeRootId && oldNodeMap) {
      const subtreeInOld = oldNodeMap.get(state.subtreeRootId);
      if (subtreeInOld) {
        // Screen position of the future-root node in the OLD layout.
        const px_sub = oldOffsetX + subtreeInOld.x * oldScaleX;
        const py_sub = oldOffsetY + subtreeInOld.y * oldScaleY;
        // The new layout's root sits at world x = 0, so offsetX = px_sub.
        const newRoot = nodes.find(n => !n.parentId);
        this.offsetX = px_sub;
        this.offsetY = newRoot ? py_sub - newRoot.y * this.scaleY : py_sub;
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

    this._computeAndInstallLayout(fwdSubtreeRootId);
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

    this._computeAndInstallLayout(null);
    // Fit the whole tree into view.
    const newOffsetY = this.paddingTop + this.minScaleY * 0.5;
    this._setTarget(newOffsetY, this.minScaleY, false);

    // Seed animation: the node we were rooted at slides from its current screen
    // position to wherever it lives in the full-tree layout.
    if (curRootId) {
      const restoredNode = this.nodeMap.get(curRootId);
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

  /**
   * Move the view one level up the tree from the current subtree root.
   * The parent of the current subtree root becomes the new subtree root
   * (or the full tree is shown if the parent is the global root).
   * The current state is pushed onto the back stack.
   */
  navigateClimb() {
    if (!this._viewSubtreeRootId) return; // only valid in subtree view

    const nodeIdx = this.graph.origIdToIdx.get(this._viewSubtreeRootId);
    if (nodeIdx === undefined) return;

    // adjacents[0] is the ‘parent direction’ for any subtree root.
    const parentIdx = this.graph.nodes[nodeIdx].adjacents[0];
    if (parentIdx === undefined || parentIdx < 0) return;

    // Determine whether climbing reaches the global root → show full tree.
    const { nodeA, nodeB, lenA } = this.graph.root;
    const parentIsRoot = lenA === 0
      ? parentIdx === nodeA
      : parentIdx === nodeA || parentIdx === nodeB;
    const newSubtreeRootId = parentIsRoot ? null : this.graph.nodes[parentIdx].origId;

    // Capture current root screen position before installing new layout.
    const curRootLayout = this.nodes ? this.nodes.find(n => !n.parentId) : null;
    const py_cur    = curRootLayout ? this.offsetY + curRootLayout.y * this.scaleY : this.canvas.clientHeight / 2;
    const curRootId = curRootLayout ? curRootLayout.id : null;

    this._navStack.push(this._currentViewState());
    this._fwdStack          = [];
    this._viewSubtreeRootId = newSubtreeRootId;
    this._selectedTipIds.clear();
    this._mrcaNodeId = null;

    this._computeAndInstallLayout(newSubtreeRootId);
    const newOffsetY = this.paddingTop + this.minScaleY * 0.5;
    this._setTarget(newOffsetY, this.minScaleY, false);

    // Seed animation: old root slides rightward to its natural x in the new layout.
    if (curRootId) {
      const restoredNode = nodeMap.get(curRootId);
      if (restoredNode) {
        // x: start displaced so old root still appears at paddingLeft, animate to paddingLeft
        this._rootShiftFromX = this.paddingLeft - restoredNode.x * this.scaleX;
        this._rootShiftToX   = this.paddingLeft; // = _targetOffsetX
        this._rootShiftAlpha = 0;
        this.offsetX = this._rootShiftFromX;
        // y: old root appears at same screen y, then eases to fit-window position
        this.offsetY = py_cur - restoredNode.y * this.scaleY;
      }
    }
    this._animating = true;
    this._dirty = true;
    if (this._onLayoutChange) this._onLayoutChange(this.maxX, this._viewSubtreeRootId);
    if (this._onNavChange) this._onNavChange(true, false);
    if (this._onNodeSelectChange) this._onNodeSelectChange(false);
  }
  /**
   * Returns the display text for a tip node label.
   * Uses the tipLabelAnnotation value when set; falls back to node.name.
   * Handles the synthetic CAL_DATE_KEY / CAL_DATE_HPD_KEY / CAL_DATE_HPD_ONLY_KEY sentinels.
   */
  /**
   * Shared implementation for _tipLabelText / _nodeLabelText.
   * @param {object}      node           The tree node.
   * @param {string|null} key            The annotation key.
   * @param {number|null} decimalPlaces  Fixed decimal places for numeric values (null = auto).
   * @param {string|null} nameFallback   Value returned when no label can be derived.
   */
  _labelText(node, key, decimalPlaces, nameFallback) {
    if (!key) return nameFallback;

    // ── Built-in geometry-based stat keys ──────────────────────────────
    if (key === '__divergence__' || key === '__age__' || key === '__branch_length__') {
      const val = this._statValue(node, key);
      if (val == null) return nameFallback;
      const def = this._annotationSchema?.get(key);
      if (decimalPlaces != null) return val.toFixed(decimalPlaces);
      if (def?.fmtValue) return def.fmtValue(val);
      return val.toFixed(6);
    }
    if (key === '__tips_below__') {
      const val = this._statValue(node, key);
      return val != null ? String(val) : nameFallback;
    }

    // ── Synthetic calendar-date labels ──────────────────────────────────
    if (key === CAL_DATE_KEY || key === CAL_DATE_HPD_KEY || key === CAL_DATE_HPD_ONLY_KEY) {
      const cal = this._calCalibration;
      if (!cal?.isActive) return nameFallback;
      const height  = this.maxX - node.x;
      const hpdKey  = this._annotationSchema?.get('height')?.group?.hpd;
      const hpd     = hpdKey ? node.annotations?.[hpdKey] : null;
      const hasHpd  = Array.isArray(hpd) && hpd.length >= 2;
      if (key === CAL_DATE_HPD_ONLY_KEY) {
        if (!hasHpd) return null;
        // hpd[0] = lower height (newer date), hpd[1] = upper height (older date)
        const dOlder = cal.heightToDateString(hpd[1], 'full', this._calDateFormat);
        const dNewer = cal.heightToDateString(hpd[0], 'full', this._calDateFormat);
        return `[${dOlder} – ${dNewer}]`;
      }
      const dateStr = cal.heightToDateString(height, 'full', this._calDateFormat);
      if (key === CAL_DATE_HPD_KEY && hasHpd) {
        const dOlder = cal.heightToDateString(hpd[1], 'full', this._calDateFormat);
        const dNewer = cal.heightToDateString(hpd[0], 'full', this._calDateFormat);
        return `${dateStr} [${dOlder} – ${dNewer}]`;
      }
      return dateStr;
    }

    const def = this._annotationSchema?.get(key);
    let val = node.annotations?.[key];
    // Synthetic base keys (e.g. 'height' promoted from 'height_mean') are not
    // stored directly on node.annotations – fall back to the mean group member.
    if ((val == null || val === '') && def?.group?.mean) {
      val = node.annotations?.[def.group.mean];
    }
    if (val == null || val === '') return nameFallback;
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'number') {
      if (decimalPlaces != null) return val.toFixed(decimalPlaces);
      if (def?.fmtValue) return def.fmtValue(val);
      if (def?.fmt)      return def.fmt(val);
    }
    return String(val);
  }

  _tipLabelText(node) {
    if (this._tipLabelsOff) return null;
    return this._labelText(node, this.tipLabelAnnotation, this._tipLabelDecimalPlaces, node.name || null);
  }

  /**
   * Returns the display text for an internal-node label.
   * Uses nodeLabelAnnotation to look up the annotation value on the node.
   * Handles the synthetic CAL_DATE_KEY / CAL_DATE_HPD_KEY / CAL_DATE_HPD_ONLY_KEY sentinels.
   */
  _nodeLabelText(node) {
    return this._labelText(node, this.nodeLabelAnnotation, this._nodeLabelDecimalPlaces, null);
  }

  _measureLabels() {
    if (!this.nodes) return;
    // Only redo the expensive measureText scan when font/annotation settings or node data changes.
    const cacheKey = `${this.fontSize}|${this._tipLabelTypefaceKey ?? this._typefaceKey}|${this._tipLabelTypefaceStyle ?? this._typefaceStyle}|${this.tipLabelAnnotation ?? ''}|${this._calDateFormat}|${this._tipLabelDecimalPlaces ?? ''}|${this._nodeLabelDecimalPlaces ?? ''}|${this._tipLabelsOff ? '0' : '1'}`;        
    if (this._labelCacheKey !== cacheKey) {
      const ctx = this.ctx;
      ctx.font = this._tipFont(this.fontSize);
      let max = 0;
      for (const n of this.nodes) {
        if (!n.isTip) continue;
        const t = this._tipLabelText(n);
        if (t) {
          const w = ctx.measureText(t).width;
          if (w > max) max = w;
        }
      }
      this._maxLabelWidth = max;
      this._labelCacheKey = cacheKey;
    }
    const r = this.tipRadius;
    const tipOuterR = r > 0 ? r + this.tipHaloSize : 0;
    // Count active extra shapes to determine the total label-shape width.
    const _activeExtras = [];
    if (this._tipLabelShape !== 'off') {
      for (const s of this._tipLabelShapesExtra) { if (s === 'off') break; _activeExtras.push(s); }
    }
    const shapeExtra = this._tipLabelShape !== 'off'
      ? this._tipLabelShapeMarginLeft + this._shapeSize(this._tipLabelShapeSize, this._tipLabelShape)
        + (_activeExtras.length > 0 ? this._tipLabelShapeSpacing : 0)
      : 0;
    let shapesExtraWidth = 0;
    for (let i = 0; i < _activeExtras.length; i++) {
      shapesExtraWidth += this._shapeSize(this._tipLabelShapeSize, _activeExtras[i])
        + (i < _activeExtras.length - 1 ? this._tipLabelShapeSpacing : 0);
    }
    this.labelRightPad = this._maxLabelWidth + Math.max(tipOuterR, 5) + 5 + this.tipLabelSpacing + shapeExtra + shapesExtraWidth + (this.paddingRight ?? 10);
  }

  /** Recompute scaleX so the tree always fills the full viewport width.
   *  immediate=true (default) snaps instantly; false animates via _targetScaleX. */
  _updateScaleX(immediate = true) {
    const W = this.canvas.clientWidth;
    // Only reserve space for tip labels when they're actually visible at this zoom level.
    const labelsVisible = this.scaleY >= this.fontSize * 0.5;
    const plotW = W - this.paddingLeft - (labelsVisible ? this.labelRightPad : (this.paddingRight ?? 10));
    // Extra world-units needed to the left of the root for node bars / whiskers.
    const barPad = this.nodeBarsEnabled ? this._nodeBarsLeftPad() : 0;
    // Root stem: only applied to the whole-tree view (not subtree navigation).
    const stemWorld = (this._viewSubtreeRootId === null)
      ? (this.rootStemPct ?? 0) / 100 * this.maxX
      : 0;
    this._targetScaleX  = plotW / (this.maxX + barPad + stemWorld);
    // Shift the origin right so bars/stem that extend past the root remain visible.
    this._targetOffsetX = this.paddingLeft + (barPad + stemWorld) * this._targetScaleX;
    if (immediate) {
      this.scaleX  = this._targetScaleX;
      this.offsetX = this._targetOffsetX;
    } else {
      this._animating = true;
    }
  }

  /**
   * Return the number of world-units by which node bars or whiskers extend to
   * the LEFT of the root (worldX < 0).  Used to add left padding for the scale.
   */
  _nodeBarsLeftPad() {
    if (!this.nodes || !this._annotationSchema) return 0;
    const heightDef = this._annotationSchema.get('height');
    if (!heightDef?.group?.hpd) return 0;
    const hpdKey   = heightDef.group.hpd;
    const rangeKey = (this.nodeBarsRange && heightDef.group.range) ? heightDef.group.range : null;
    let maxLeftward = 0;
    for (const node of this.nodes) {
      if (node.isTip) continue;
      // HPD upper bound (larger height = further left)
      const hpd = node.annotations?.[hpdKey];
      if (Array.isArray(hpd) && hpd.length >= 2) {
        const excess = hpd[1] - this.maxX;   // positive when bar extends past root
        if (excess > maxLeftward) maxLeftward = excess;
      }
      // Range outer bound (whiskers)
      if (rangeKey) {
        const range = node.annotations?.[rangeKey];
        if (Array.isArray(range) && range.length >= 2) {
          const excess = range[1] - this.maxX;
          if (excess > maxLeftward) maxLeftward = excess;
        }
      }
    }
    return maxLeftward;
  }

  /** Recompute the minimum scaleY (tree fits the viewport vertically). */
  _updateMinScaleY() {
    const H = this.canvas.clientHeight;
    const plotH = H - this.paddingTop - this.paddingBottom;
    // tips sit at world y = 1 … maxY; add 1 unit of padding total
    this.minScaleY = plotH / (this.maxY + 1);
  }

  // _clampOffsetY is replaced by _clampedOffsetY (pure) + _setTarget.

  fitToWindow(immediate = false) {
    if (!this.nodes) return;
    this._fitLabelsMode = false;
    this._updateMinScaleY();
    // Use minScaleY for the label-visibility check so the horizontal scale is
    // correct from the start of the animation rather than correcting mid-flight.
    const _prevScaleY = this.scaleY;
    this.scaleY = this.minScaleY;
    this._updateScaleX(immediate);
    this.scaleY = _prevScaleY;
    const newOffsetY = this.paddingTop + this.minScaleY * 0.5;
    this._setTarget(newOffsetY, this.minScaleY, immediate);
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
    const stemWorld = (this.rootStemPct ?? 0) / 100 * (this.maxX || 1);
    const sx = plotW / ((this.maxX || 1) + stemWorld);
    const sy = plotH / ((this.maxY || 1) + 1);
    const ox = this.paddingLeft + stemWorld * sx;
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
    // Don't touch canvas.width/height here — resetting the bitmap clears the canvas
    // immediately, but _draw() runs asynchronously in the next rAF, leaving a blank
    // frame visible to the browser.  Instead, stash the required pixel dimensions and
    // let _draw() apply them atomically just before it repaints.
    this._pendingBitmapW = W * this.dpr;
    this._pendingBitmapH = H * this.dpr;
    if (this.nodes) {
      // X always re-fits; preserve the current vertical zoom ratio if already zoomed in.
      const zoomRatio = (this.minScaleY > 0) ? this._targetScaleY / this.minScaleY : 1;
      this._updateScaleX();
      this._updateMinScaleY();
      const newScaleY = Math.max(this.minScaleY, this.minScaleY * zoomRatio);
      this._setTarget(this._targetOffsetY, newScaleY, true);
    }
    this._legendRenderer?.resize();
    this._dirty = true;
  }

  _loop() {
    // ── Cross-fade overlay animation ──
    if (this._crossfadeAlpha > 0) {
      const EASE = 0.055;   // ~400 ms at 60 fps (1 / 0.055 ≈ 18 frames)
      this._crossfadeAlpha = Math.max(0, this._crossfadeAlpha - EASE);
      if (this._crossfadeAlpha === 0) this._crossfadeSnapshot = null;
      this._dirty = true;
    }

    // ── Intro animation ──────────────────────────────────────────────────────
    if (this._introPhase !== null) {
      const EASE  = 0.04;   // ~25 frames ≈ 415 ms at 60 fps per phase
      this._introAlpha = Math.min(1, this._introAlpha + EASE);
      const t    = this._introAlpha;
      const a    = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;   // ease-in-out
      const done = this._introAlpha >= 1;
      const fX   = this._introFinalX;
      const fY   = this._introFinalY;
      const rY   = this._introRootY;

      switch (this._introStyle) {

        case 'y-then-x':
          if (this._introPhase === 1) {
            for (const node of this.nodes) {
              node.y = rY + (fY.get(node.id) - rY) * a;
              node.x = 0;
            }
            if (done) {
              for (const node of this.nodes) { node.y = fY.get(node.id); node.x = 0; }
              this._introPhase = 2; this._introAlpha = 0;
            }
          } else {
            for (const node of this.nodes) node.x = fX.get(node.id) * a;
            if (done) this._introEnd();
          }
          break;

        case 'x-then-y':
          if (this._introPhase === 1) {
            for (const node of this.nodes) {
              node.x = fX.get(node.id) * a;
              node.y = rY;
            }
            if (done) {
              for (const node of this.nodes) { node.x = fX.get(node.id); node.y = rY; }
              this._introPhase = 2; this._introAlpha = 0;
            }
          } else {
            for (const node of this.nodes) node.y = rY + (fY.get(node.id) - rY) * a;
            if (done) this._introEnd();
          }
          break;

        case 'simultaneous':
          for (const node of this.nodes) {
            node.x = fX.get(node.id) * a;
            node.y = rY + (fY.get(node.id) - rY) * a;
          }
          if (done) this._introEnd();
          break;

        case 'from-bottom': {
          const edgeY = this.maxY;
          for (const node of this.nodes) {
            node.x = fX.get(node.id);
            node.y = edgeY + (fY.get(node.id) - edgeY) * a;
          }
          if (done) this._introEnd();
          break;
        }

        case 'from-top':
          for (const node of this.nodes) {
            node.x = fX.get(node.id);
            node.y = fY.get(node.id) * a;  // 0 → finalY
          }
          if (done) this._introEnd();
          break;

        default:
          this._introEnd();  // unknown style — snap immediately
      }

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
        if (node.isCollapsed) {
          const fc = this._reorderFromCollapsedN.get(node.id);
          const tc = this._reorderToCollapsedN.get(node.id);
          if (fc !== undefined && tc !== undefined) {
            node.collapsedTipCount = fc + (tc - fc) * a;
          }
        }
      }
      // Lerp viewport in sync when requested.
      if (this._reorderFromScaleY !== null) {
        this.scaleY  = this._reorderFromScaleY  + (this._reorderToScaleY  - this._reorderFromScaleY)  * a;
        this.offsetY = this._reorderFromOffsetY + (this._reorderToOffsetY - this._reorderFromOffsetY) * a;
      }
      if (this._reorderAlpha >= 1) {
        // Snap to final positions
        for (const node of this.nodes) {
          const ty = this._reorderToY.get(node.id);
          if (ty !== undefined) node.y = ty;
          if (node.isCollapsed) {
            const tc = this._reorderToCollapsedN.get(node.id);
            if (tc !== undefined) node.collapsedTipCount = tc;
          }
        }
        if (this._reorderFromScaleY !== null) {
          this.scaleY  = this._reorderToScaleY;
          this.offsetY = this._reorderToOffsetY;
          this._reorderFromScaleY = null;
        }
        this._reorderFromY          = null;
        this._reorderToY            = null;
        this._reorderFromCollapsedN = null;
        this._reorderToCollapsedN   = null;
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

    // Recalculate horizontal scale smoothly when the user's zoom crosses the
    // label-visibility threshold (scaleY == fontSize * 0.5).
    if (this.nodes) {
      const _labelsNowVisible = this.scaleY >= this.fontSize * 0.5;
      if (_labelsNowVisible !== this._labelsWereVisible) {
        this._labelsWereVisible = _labelsNowVisible;
        this._updateScaleX(false);
      }
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
    if (this._onViewChange && (this._animating || this._reorderAlpha < 1 || this._rootShiftAlpha < 1 || this._crossfadeAlpha > 0 || this._introPhase !== null || !this._lastViewHash || this._lastViewHash !== this._viewHash())) {
      this._lastViewHash = this._viewHash();
      this._onViewChange(this.scaleX, this.offsetX, this.paddingLeft, this.labelRightPad, this.bgColor, this.fontSize, window.devicePixelRatio || 1);
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;

    // Apply any pending bitmap resize atomically here, just before drawing, so
    // the canvas is never visibly blank between the clear and the repaint.
    if (this._pendingBitmapW !== undefined) {
      const pw = this._pendingBitmapW;
      const ph = this._pendingBitmapH;
      if (this.canvas.width !== pw || this.canvas.height !== ph) {
        this.canvas.width  = pw;
        this.canvas.height = ph;
      }
      this._pendingBitmapW = undefined;
      this._pendingBitmapH = undefined;
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);  // re-assert DPR transform each frame
    ctx.clearRect(0, 0, W, H);

    if (!this.nodes) return;

    if (!this._skipBg) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, W, H);
    }

    // Viewport culling: world y range visible on screen (with a little margin)
    const yWorldMin = this._worldYfromScreen(-this.fontSize * 2);
    const yWorldMax = this._worldYfromScreen(H + this.fontSize * 2);

    this._drawCladeHighlights(yWorldMin, yWorldMax);
    this._drawNodeBars(yWorldMin, yWorldMax);
    this._drawBranches(yWorldMin, yWorldMax);
    this._drawCollapsedClades(yWorldMin, yWorldMax);
    this._drawNodesAndLabels(yWorldMin, yWorldMax);
    this._drawSelectionAndHover(yWorldMin, yWorldMax);
    this._drawNodeLabels(yWorldMin, yWorldMax);  // drawn on top

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
   * Draw node bars: translucent HPD intervals rendered behind branches for
   * internal nodes.  Uses the 'height' BEAST annotation group:
   *   – filled rectangle spanning the 95% HPD interval
   *   – dark border around the rectangle
   *   – optional vertical median line inside the rectangle
   *   – optional range whiskers extending beyond the rectangle
   * Heights are converted to x positions as: worldX = maxX − height.
   */

  // ─── Clade highlights ──────────────────────────────────────────────────────

  /**
   * Draw translucent filled shapes highlighting specific clades.
   * Called once per frame, before branches, so the overlay is drawn behind the tree.
   *
   * Left-edge modes
   *   'atRoot'       – vertical line at clade-root x, padded left by `cladeHighlightPadding` px
   *   'outlineNodes' – hugs the subtree outline (branches & elbows), padded left by the same amount
   *
   * Right-edge modes
   *   'atTips'        – vertical line at the rightmost tip x + padding
   *   'atLabels'      – global aligned-label column left edge + padding
   *   'atLabelsRight' – right edge of the canvas minus right padding
   *   'outlineTips'   – staircase outline following individual tip x values + padding
   */
  _drawCladeHighlights(yWorldMin, yWorldMax) {
    if (!this._cladeHighlights.size || !this.nodes || !this.nodeMap) return;

    const ctx         = this.ctx;
    const pad         = this.cladeHighlightPadding;
    const radius      = this.cladeHighlightRadius;
    const leftMode    = this.cladeHighlightLeftEdge;
    const rightMode   = this.cladeHighlightRightEdge;
    const fillOpacity = this.cladeHighlightFillOpacity;
    const strokeOpacity = this.cladeHighlightStrokeOpacity;
    const strokeWidth = this.cladeHighlightStrokeWidth;

    // Right-hand boundary based on global options
    // labelRightPad already covers from maxX tip to the right edge of labels
    const tipMaxSX    = this._wx(this.maxX);
    const tipR        = Math.max(this.tipRadius ?? 3.5, 0);
    const shapeW      = this._totalLabelShapeWidth?.() ?? 0;

    // Determine global right-edge X (CSS px from canvas left)
    // 'atTips':        just right of the clade's rightmost tip circle + padding
    // 'atLabels':      global aligned-label column left edge + padding
    // 'atLabelsRight': canvas right edge minus canvas right padding (no extra pad)
    const outlineR  = tipR + (this.tipHaloSize ?? 1);
    const lblSpacing = this.tipLabelSpacing ?? 3;

    const _rightX = (tipXmax) => {
      // tipXmax: largest tip world-x among descendant tips of this highlight
      const sx = this._wx(tipXmax);
      switch (rightMode) {
        case 'atTips':        return sx + outlineR + pad;
        case 'atLabels':      return tipMaxSX + outlineR;
        case 'atLabelsRight': return this.canvas.clientWidth - (this.paddingRight ?? 10);
        default:           return tipMaxSX + outlineR + lblSpacing + shapeW + pad;
      }
    };

    for (const [nodeId, hlData] of this._cladeHighlights) {
      const rootN = this.nodeMap.get(nodeId);
      if (!rootN) continue;

      // Collect all (non-collapsed) descendant tips visible in nodeMap
      const allTipIds = this._getDescendantTipIds(nodeId);
      // Also include the node itself if it is a tip
      if (rootN.isTip && !allTipIds.includes(nodeId)) allTipIds.push(nodeId);
      if (allTipIds.length === 0) continue;

      const colour = hlData.colour ?? this.cladeHighlightColour;

      // Gather y-sorted tip nodes and their world-x values
      const tipNodes = allTipIds.map(id => this.nodeMap.get(id)).filter(Boolean);
      tipNodes.sort((a, b) => a.y - b.y);

      const tipYs  = tipNodes.map(n => n.y);
      const tipXs  = tipNodes.map(n => n.x); // world x for each tip (sorted by y)
      const minTipY = tipYs[0];
      const maxTipY = tipYs[tipYs.length - 1];
      const maxTipX = Math.max(...tipXs);

      // Determine top/bottom screen y with padding.
      // Gap to the next tip outside the clade: find nearest tips above/below.
      // We use scaleY (px per row) / 2 as the default half-gap if no neighbour.
      const halfRowPx  = this.scaleY / 2;
      let topSY, botSY;
      {
        // Find the nearest y-neighbour above and below among all visible tips
        let prevY = -Infinity, nextY = Infinity;
        for (const n of this.nodes) {
          if (!n.isTip) continue;
          if (allTipIds.includes(n.id)) continue;
          if (n.y < minTipY && n.y > prevY) prevY = n.y;
          if (n.y > maxTipY && n.y < nextY) nextY = n.y;
        }
        const gapAbove = prevY === -Infinity ? halfRowPx : (minTipY - prevY) * this.scaleY * 0.5;
        const gapBelow = nextY === Infinity  ? halfRowPx : (nextY - maxTipY) * this.scaleY * 0.5;
        topSY = this._wy(minTipY) - gapAbove;   // actual midpoint to next tip above
        botSY = this._wy(maxTipY) + gapBelow;   // actual midpoint to next tip below
      }

      // Left boundary: min(pad, midpoint between root node and its parent in x)
      const rootSX  = this._wx(rootN.x);
      const parentN = rootN.parent != null ? this.nodeMap.get(rootN.parent) : null;
      const gapLeft = parentN ? (rootSX - this._wx(parentN.x)) * 0.5 : pad;
      const leftPad = Math.min(pad, gapLeft);

      ctx.save();
      ctx.beginPath();

      // Top/bottom screen Y: use the smaller of the padding value and the midpoint
      // to the next tip outside the clade, so the highlight never overlaps neighbours.
      const topPadY = this._wy(minTipY) - Math.min(pad, this._wy(minTipY) - topSY);
      const botPadY = this._wy(maxTipY) + Math.min(pad, botSY - this._wy(maxTipY));

      if (leftMode === 'outlineNodes' && tipNodes.length > 1) {
        // Build an outline path that hugs the left edges of all branches.
        // Top walk ends at (topTip.x − pad, topTip.y − pad).
        this._buildCladeOutlinePath(ctx, rootN, pad, radius, leftPad, topPadY);
        // Right edge: from topPadY down to botPadY, with convex corners rounded.
        const rightX = _rightX(maxTipX);
        if (rightMode === 'outlineTips') {
          this._addRightOutlinePath(ctx, tipNodes, topPadY, botPadY, pad, radius, outlineR);
        } else {
          // Two convex corners: top-right (RIGHT→DOWN) and bottom-right (DOWN→LEFT).
          const cr = radius;
          ctx.lineTo(rightX - cr, topPadY);
          ctx.arcTo(rightX, topPadY, rightX, topPadY + cr, cr);   // round top-right
          ctx.lineTo(rightX, botPadY - cr);
          ctx.arcTo(rightX, botPadY, rightX - cr, botPadY, cr);   // round bottom-right
        }
        // Bottom walk: trace from (rightX or last outlineTips sx, botPadY) back to root.
        this._addBotCladeOutlinePath(ctx, rootN, pad, radius, leftPad, botPadY);
        ctx.closePath();
      } else {
        // Hard left edge
        const leftX = rootSX - leftPad;
        const cr = Math.min(radius, (botPadY - topPadY) / 2);
        if (rightMode === 'outlineTips' && tipNodes.length > 1) {
          // Hard left, right outlines individual tips as staircase.
          // Top-left corner (convex): approach from left edge, leave rightward.
          ctx.moveTo(leftX + cr, topPadY);
          this._addRightOutlinePath(ctx, tipNodes, topPadY, botPadY, pad, radius, outlineR);
          // Bottom-left corner (convex): arrive from right, leave upward.
          ctx.lineTo(leftX + cr, botPadY);
          ctx.arcTo(leftX, botPadY, leftX, botPadY - cr, cr);
          ctx.lineTo(leftX, topPadY + cr);
          ctx.arcTo(leftX, topPadY, leftX + cr, topPadY, cr);
          ctx.closePath();
        } else {
          // Simple rounded rectangle.
          const rightX = _rightX(maxTipX);
          this._roundedRectPath(ctx, leftX, topPadY, rightX - leftX, botPadY - topPadY, radius);
        }
      }

      // Fill
      ctx.globalAlpha = fillOpacity;
      ctx.fillStyle   = colour;
      ctx.fill();

      // Stroke
      if (strokeWidth > 0 && strokeOpacity > 0) {
        ctx.globalAlpha  = strokeOpacity;
        ctx.strokeStyle  = colour;
        ctx.lineWidth    = strokeWidth;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  /**
   * Trace a rounded-rectangle path into ctx.
   * External corners use `r`; path is always closed by the caller.
   */
  _roundedRectPath(ctx, x, y, w, h, r) {
    const br = Math.min(r, w / 2, h / 2);
    if (br <= 0) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.moveTo(x + br, y);
    ctx.lineTo(x + w - br, y);
    ctx.arcTo(x + w, y,     x + w, y + br,     br);
    ctx.lineTo(x + w, y + h - br);
    ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + br, y + h);
    ctx.arcTo(x, y + h,     x, y + h - br,     br);
    ctx.lineTo(x, y + br);
    ctx.arcTo(x, y,         x + br, y,          br);
    ctx.closePath();
  }

  /**
   * Trace the TOP-LEFT boundary of a clade outline.
   * Always follows the topmost child at each level (preorder topmost-child spine).
   *
   * At each shoulder the path steps:
   *   1. Vertically to (cur.x − pad, topChild.y − pad)  — corner above the branch
   *   2. Horizontally to (topChild.x − pad, topChild.y − pad)  — right to child column
   *
   * moveTo: (root.x − pad, root.y)
   * Ends at: (topTip.x − pad, topTip.y − pad)
   * Caller then appends the right edge and calls _addBotCladeOutlinePath().
   */
  _buildCladeOutlinePath(ctx, rootNode, pad, r, leftPad = pad, topPadY = null) {
    // Helper: topmost child node of n (min world y), or null if tip.
    const topChild = n => {
      if (n.isTip || !n.children?.length) return null;
      return n.children.map(id => this.nodeMap.get(id)).filter(Boolean)
        .reduce((best, c) => c.y < best.y ? c : best);
    };

    ctx.moveTo(this._wx(rootNode.x) - leftPad, this._wy(rootNode.y));

    let cur   = rootNode;
    let prevY = this._wy(rootNode.y); // y of the last point placed on the path
    while (true) {
      const child = topChild(cur);
      if (!child) break;
      const cx  = this._wx(cur.x)   - leftPad;  // convex corner x
      // Clamp shoulder y to topPadY so no horizontal line goes above the top boundary.
      const cy_raw = this._wy(child.y) - pad;
      const cy  = topPadY !== null ? Math.max(cy_raw, topPadY) : cy_raw;
      const nx  = this._wx(child.x) - leftPad;  // concave corner x
      // Clamp radius to half the vertical approach and half the horizontal departure.
      // If the corner was clamped to the boundary, suppress the arc entirely so
      // the boundary edge stays flat (no protrusion into the shape).
      const wasClamped = topPadY !== null && cy_raw < topPadY;
      const vd  = prevY - cy;               // > 0: arriving from below
      const hd  = nx - cx;                  // > 0: leaving rightward
      const cr  = (wasClamped || r <= 0) ? 0 : Math.min(r, vd > 0 ? vd * 0.45 : r, hd > 0 ? hd * 0.45 : r);
      if (cr > 0) {
        ctx.lineTo(cx, cy + cr);             // approach convex corner from below
        ctx.arcTo(cx, cy, nx, cy, cr);       // round: UP → RIGHT
      } else {
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(nx, cy);                   // concave corner — sharp
      prevY = cy;
      cur   = child;
    }
    // Cursor is now at (topTip.x − pad, topTip.y − pad).
  }

  /**
   * Trace the BOTTOM-LEFT return path from the bottommost tip back to the
   * clade root, following the bottommost-child spine in reverse.
   *
   * Assumes cursor is at (rightEdge, botTip.y + pad) when called.
   * At each shoulder the path steps:
   *   1. Horizontally to (parent.x − pad, child.y + pad)  — corner below the branch
   *   2. Vertically   to (parent.x − pad, parent.y)       — up to parent row
   *
   * Ends at (root.x − pad, root.y).  Caller calls closePath().
   */
  _addBotCladeOutlinePath(ctx, rootNode, pad, r, leftPad = pad, botPadY = null) {
    // Helper: bottommost child node of n (max world y), or null if tip.
    const botChild = n => {
      if (n.isTip || !n.children?.length) return null;
      return n.children.map(id => this.nodeMap.get(id)).filter(Boolean)
        .reduce((best, c) => c.y > best.y ? c : best);
    };

    // Build the spine root → botTip, then reverse to walk tip → root.
    const spine = [];
    let cur = rootNode;
    while (cur) { spine.push(cur); cur = botChild(cur); }
    spine.reverse(); // [botTip, ..., root]

    for (let i = 0; i < spine.length - 1; i++) {
      const child      = spine[i];
      const parent     = spine[i + 1];
      const isLastStep = (i === spine.length - 2); // parent is the clade root
      const cornerX = this._wx(parent.x) - leftPad;  // convex corner x
      // Clamp shoulder y to botPadY so no horizontal line goes below the bottom boundary.
      const cornerY_raw = this._wy(child.y) + pad;
      const cornerY = botPadY !== null ? Math.min(cornerY_raw, botPadY) : cornerY_raw;
      // Clamp nextY too: for internal steps, parent.y + pad can also fall below botPadY,
      // which would cause a zig-zag back down below the boundary before recovering.
      const nextY_raw  = this._wy(parent.y) + (isLastStep ? 0 : pad);
      const nextY = (!isLastStep && botPadY !== null) ? Math.min(nextY_raw, botPadY) : nextY_raw;
      // Clamp radius to half the horizontal approach and half the vertical departure.
      // If the corner was clamped to the boundary, suppress the arc entirely so
      // the boundary edge stays flat (no protrusion into the shape).
      const wasClamped = botPadY !== null && cornerY_raw > botPadY;
      const hd = this._wx(child.x) - this._wx(parent.x); // > 0: arriving from right
      const vd = cornerY - nextY;                         // > 0: leaving upward
      const cr = (wasClamped || r <= 0) ? 0 : Math.min(r, hd > 0 ? hd * 0.45 : r, vd > 0 ? vd * 0.45 : r);
      if (cr > 0) {
        ctx.lineTo(cornerX + cr, cornerY);             // approach convex corner from right
        ctx.arcTo(cornerX, cornerY, cornerX, nextY, cr); // round: LEFT → UP
      } else {
        ctx.lineTo(cornerX, cornerY);
      }
      ctx.lineTo(cornerX, nextY);                    // concave corner (or root) — sharp
    }
    // Cursor is now at (root.x − pad, root.y).
  }

  /**
   * Trace the right-side staircase (outlineTips mode) top → bottom.
   * Cursor must be at the start of the top boundary (startY) when called.
   * Each tip gets its own right-edge column; the path steps between tips at
   * their midpoints.  Ends at (botTip.x + …, endY).
   *
   * @param {number} startY  Screen y at the top of the first tip (e.g. topTip.y − pad)
   * @param {number} endY    Screen y at the bottom of the last tip (e.g. botTip.y + pad)
   */
  _addRightOutlinePath(ctx, tipNodes, startY, endY, pad, r, outlineR) {
    const tips = [...tipNodes]; // top to bottom (already sorted by y)
    // Pre-compute right-edge x for every tip.
    const sxArr = tips.map(t => this._wx(t.x) + pad);

    for (let i = 0; i < tips.length; i++) {
      const sx       = sxArr[i];
      const prevSX   = i > 0 ? sxArr[i - 1] : null;
      const nextSX   = i < tips.length - 1 ? sxArr[i + 1] : null;
      const prevMidY = i === 0
        ? startY
        : (this._wy(tips[i - 1].y) + this._wy(tips[i].y)) / 2;
      const nextMidY = i < tips.length - 1
        ? (this._wy(tips[i].y) + this._wy(tips[i + 1].y)) / 2
        : endY;
      const vd = nextMidY - prevMidY; // vertical span of this step (> 0)

      // ── TOP corner at (sx, prevMidY): horizontal → vertical ──────────────
      // Convex (RIGHT→DOWN) when arriving from left (sx >= prevSX).
      // Concave (LEFT→DOWN) when arriving from right — keep sharp.
      const topConvex = prevSX === null || sx >= prevSX;
      const cr_top = (r > 0 && topConvex)
        ? Math.min(r,
            vd  > 0 ? vd  * 0.45 : r,
            prevSX !== null ? Math.abs(sx - prevSX) * 0.45 : r)
        : 0;

      if (cr_top > 0) {
        ctx.lineTo(sx - cr_top, prevMidY);
        ctx.arcTo(sx, prevMidY, sx, prevMidY + cr_top, cr_top); // RIGHT → DOWN
      } else {
        ctx.lineTo(sx, prevMidY);
      }

      // ── BOTTOM corner at (sx, nextMidY): vertical → horizontal ───────────
      // Convex (DOWN→LEFT) when leaving leftward (nextSX < sx) OR at the last tip
      // (where the path turns left toward _addBotCladeOutlinePath).
      // Concave (DOWN→RIGHT) when leaving rightward — keep sharp.
      const botConvex = nextSX === null || nextSX < sx;
      const cr_bot = (r > 0 && botConvex)
        ? Math.min(r,
            vd > 0 ? vd * 0.45 : r,
            nextSX !== null ? (sx - nextSX) * 0.45 : r)
        : 0;

      if (cr_bot > 0) {
        ctx.lineTo(sx, nextMidY - cr_bot);
        ctx.arcTo(sx, nextMidY, sx - cr_bot, nextMidY, cr_bot); // DOWN → LEFT
      } else {
        ctx.lineTo(sx, nextMidY);
      }
    }
  }

  /** Add or update a clade highlight.  `colour` is optional (falls back to cladeHighlightColour). */
  addCladeHighlight(nodeId, colour) {
    this._cladeHighlights.set(nodeId, { colour: colour ?? null });
    this._dirty = true;
  }

  /** Remove the highlight for the given clade root node id. */
  removeCladeHighlight(nodeId) {
    this._cladeHighlights.delete(nodeId);
    this._dirty = true;
  }

  /** Remove all clade highlights. */
  clearCladeHighlights() {
    this._cladeHighlights.clear();
    this._dirty = true;
  }

  /**
   * Update one or more clade-highlight style properties without touching any
   * other renderer settings.  Safe to call with a partial object from a slider
   * or select-change handler.
   */
  setCladeHighlightStyle(s) {
    if ('cladeHighlightLeftEdge'      in s) this.cladeHighlightLeftEdge      = s.cladeHighlightLeftEdge;
    if ('cladeHighlightRightEdge'     in s) this.cladeHighlightRightEdge     = s.cladeHighlightRightEdge;
    if ('cladeHighlightPadding'       in s) this.cladeHighlightPadding       = +s.cladeHighlightPadding;
    if ('cladeHighlightRadius'        in s) this.cladeHighlightRadius        = +s.cladeHighlightRadius;
    if ('cladeHighlightStrokeWidth'   in s) this.cladeHighlightStrokeWidth   = +s.cladeHighlightStrokeWidth;
    if ('cladeHighlightFillOpacity'   in s) this.cladeHighlightFillOpacity   = +s.cladeHighlightFillOpacity;
    if ('cladeHighlightStrokeOpacity' in s) this.cladeHighlightStrokeOpacity = +s.cladeHighlightStrokeOpacity;
    if ('cladeHighlightColour'        in s) this.cladeHighlightColour        = s.cladeHighlightColour;
    this._dirty = true;
  }

  /** Update the colour of an existing highlight. Returns false if not found. */
  setCladeHighlightColour(nodeId, colour) {
    const hl = this._cladeHighlights.get(nodeId);
    if (!hl) return false;
    hl.colour = colour;
    this._dirty = true;
    return true;
  }

  /** Serialise all highlights to a plain-object array (for save/restore). */
  getCladeHighlightsData() {
    return [...this._cladeHighlights.entries()].map(([id, hl]) => ({ id, colour: hl.colour }));
  }

  /** Restore highlights from serialised data (e.g. loaded from saved settings). */
  setCladeHighlightsData(arr) {
    this._cladeHighlights.clear();
    for (const { id, colour } of arr) this._cladeHighlights.set(id, { colour: colour ?? null });
    this._dirty = true;
  }

  _drawNodeBars(yWorldMin, yWorldMax) {
    if (!this.nodeBarsEnabled || !this.nodes) return;
    const schema = this._annotationSchema;
    if (!schema) return;
    const heightDef = schema.get('height');
    if (!heightDef || !heightDef.group || !heightDef.group.hpd) return;

    const hpdKey    = heightDef.group.hpd;     // e.g. 'height_95%_HPD'
    const medianKey = heightDef.group.median;  // e.g. 'height_median'
    const rangeKey  = heightDef.group.range;   // e.g. 'height_range'
    const maxX      = this.maxX;
    const halfW     = this.nodeBarsWidth / 2;
    const ctx       = this.ctx;
    const col       = this.nodeBarsColor;

    // ── Pass 1: filled HPD rectangle (translucent) ──────────────────────────
    ctx.fillStyle   = col;
    ctx.globalAlpha = this.nodeBarsFillOpacity;
    for (const node of this.nodes) {
      if (node.isTip) continue;
      if (node.y < yWorldMin || node.y > yWorldMax) continue;
      const hpd = node.annotations?.[hpdKey];
      if (!Array.isArray(hpd) || hpd.length < 2) continue;
      // larger height → closer to root → further left on screen
      const xLeft  = this._wx(maxX - hpd[1]);
      const xRight = this._wx(maxX - hpd[0]);
      if (xRight <= xLeft) continue;
      ctx.fillRect(xLeft, this._wy(node.y) - halfW, xRight - xLeft, halfW * 2);
    }
    ctx.globalAlpha = 1;

    // ── Pass 2: border stroke ────────────────────────────────────────────────
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1;
    ctx.globalAlpha = this.nodeBarsStrokeOpacity;
    ctx.beginPath();
    for (const node of this.nodes) {
      if (node.isTip) continue;
      if (node.y < yWorldMin || node.y > yWorldMax) continue;
      const hpd = node.annotations?.[hpdKey];
      if (!Array.isArray(hpd) || hpd.length < 2) continue;
      const xLeft  = this._wx(maxX - hpd[1]);
      const xRight = this._wx(maxX - hpd[0]);
      if (xRight <= xLeft) continue;
      ctx.rect(xLeft, this._wy(node.y) - halfW, xRight - xLeft, halfW * 2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth   = 1;

    // ── Pass 3: mean/median line ──────────────────────────────────────────────
    if (this.nodeBarsLine !== 'off') {
      const useMedian = this.nodeBarsLine === 'median';
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2;
      ctx.globalAlpha = this.nodeBarsStrokeOpacity;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (node.isTip) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        const hpd = node.annotations?.[hpdKey];
        if (!Array.isArray(hpd) || hpd.length < 2) continue;
        let xLine;
        if (useMedian) {
          if (!medianKey) continue;
          const medVal = node.annotations?.[medianKey];
          if (medVal == null) continue;
          xLine = this._wx(maxX - medVal);
        } else {
          // mean: use the 'height' annotation value directly
          const meanVal = node.annotations?.['height'];
          if (meanVal == null) continue;
          xLine = this._wx(maxX - meanVal);
        }
        const cy = this._wy(node.y);
        ctx.moveTo(xLine, cy - halfW);
        ctx.lineTo(xLine, cy + halfW);
      }
      ctx.stroke();
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 1;
    }

    // ── Pass 4: range whiskers ────────────────────────────────────────────────
    if (this.nodeBarsRange && rangeKey) {
      const capH = halfW * 0.6;  // height of whisker end-cap
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1;
      ctx.globalAlpha = this.nodeBarsStrokeOpacity;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (node.isTip) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        const hpd   = node.annotations?.[hpdKey];
        const range = node.annotations?.[rangeKey];
        if (!Array.isArray(hpd) || hpd.length < 2) continue;
        if (!Array.isArray(range) || range.length < 2) continue;
        const cy      = this._wy(node.y);
        const xHpdL   = this._wx(maxX - hpd[1]);
        const xHpdR   = this._wx(maxX - hpd[0]);
        const xRangeL = this._wx(maxX - range[1]);  // upper range bound → left
        const xRangeR = this._wx(maxX - range[0]);  // lower range bound → right
        // Left whisker: line + end cap
        ctx.moveTo(xHpdL, cy);
        ctx.lineTo(xRangeL, cy);
        ctx.moveTo(xRangeL, cy - capH);
        ctx.lineTo(xRangeL, cy + capH);
        // Right whisker: line + end cap
        ctx.moveTo(xHpdR, cy);
        ctx.lineTo(xRangeR, cy);
        ctx.moveTo(xRangeR, cy - capH);
        ctx.lineTo(xRangeR, cy + capH);
      }
      ctx.stroke();
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 1;
    }
  }

  /** Draw all branches: horizontal segments, rounded-elbow arcs, root stub, vertical connectors. */
  _drawBranches(yWorldMin, yWorldMax) {
    const ctx     = this.ctx;
    const nodeMap = this.nodeMap;
    const er      = this.elbowRadius;

    ctx.lineWidth   = this.branchWidth;
    ctx.strokeStyle = this.branchColor;

    // Draw branches: horizontal segments.  Start each one 'er' px away from the
    // corner (in the branch direction) so the arc pass can fill the gap.
    ctx.beginPath();
    for (const node of this.nodes) {
      if (!node.parentId) continue;
      if (node.y < yWorldMin || node.y > yWorldMax) continue;

      const parent = nodeMap.get(node.parentId);
      if (!parent) continue;

      const px  = this._wx(parent.x);
      const nx  = this._wx(node.x);
      const ny  = this._wy(node.y);
      const py  = this._wy(parent.y);

      // dir: +1 for normal (rightward) branches, -1 for negative (leftward) branches.
      const dx  = nx - px;
      const dir = dx >= 0 ? 1 : -1;
      const cer = Math.min(er, Math.abs(ny - py) * 0.4, Math.abs(dx) * 0.4);

      ctx.moveTo(px + dir * cer, ny); // leave gap at corner for arc
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();

    // Draw rounded-elbow arcs at each branch corner.
    if (er > 0) {
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.parentId) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;

        const parent = nodeMap.get(node.parentId);
        if (!parent) continue;

        const px  = this._wx(parent.x);
        const nx  = this._wx(node.x);
        const ny  = this._wy(node.y);
        const py  = this._wy(parent.y);
        if (Math.abs(ny - py) < 0.5) continue; // only child – no corner needed

        const dx  = nx - px;
        const dir = dx >= 0 ? 1 : -1;
        const cer = Math.max(0, Math.min(er, Math.abs(ny - py) * 0.4, Math.abs(dx) * 0.4));
        if (cer === 0) continue; // zero-length branch — no corner to draw
        // Approach the corner from the vertical; leave toward horizontal (direction-aware).
        const fromY = ny + (ny < py ? cer : -cer);
        ctx.moveTo(px, fromY);
        ctx.arcTo(px, ny, px + dir * cer, ny, cer);
      }
      ctx.stroke();
    }

    // Draw root stub: a short horizontal line to the left of the root node.
    // nodes[0] is always the layout root (DFS in computeLayoutFromGraph pushes root first).
    // • Full tree:    use rootStemPct (user-controlled proportion of tree age), may be 0.
    // • Subtree view: always use the fixed rootStubLength (pixel stub) to signal ancestry.
    const rootNode = this.nodes[0];
    if (rootNode) {
      const rx      = this._wx(rootNode.x);
      const ry      = this._wy(rootNode.y);
      const stubLen = (this._viewSubtreeRootId === null)
        ? (this.rootStemPct ?? 0) / 100 * this.maxX * this.scaleX
        : this.rootStubLength;
      if (stubLen > 0) {
        ctx.beginPath();
        ctx.moveTo(rx - stubLen, ry);
        ctx.lineTo(rx, ry);
        ctx.stroke();
      }
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

      // Single pass to find extreme children — avoids two temporary arrays
      // and the spread Math.min/Math.max calls.
      let minY = Infinity, maxY = -Infinity, topChild = null, botChild = null;
      for (const c of childNodes) {
        if (c.y < minY) { minY = c.y; topChild = c; }
        if (c.y > maxY) { maxY = c.y; botChild = c; }
      }

      if (maxY < yWorldMin || minY > yWorldMax) continue;

      const nx     = this._wx(node.x);
      const py     = this._wy(node.y);

      const ny_top = this._wy(topChild.y);
      const ny_bot = this._wy(botChild.y);

      // Use the same cer formula as the arc pass so the line ends exactly where
      // the arc begins.
      const cer_top = er > 0 ? Math.min(er, Math.abs(ny_top - py) * 0.4, Math.abs(this._wx(topChild.x) - nx) * 0.4) : 0;
      const cer_bot = er > 0 ? Math.min(er, Math.abs(ny_bot - py) * 0.4, Math.abs(this._wx(botChild.x) - nx) * 0.4) : 0;

      ctx.moveTo(nx, ny_top + cer_top); // just below topmost child's arc start
      ctx.lineTo(nx, ny_bot - cer_bot); // just above bottommost child's arc start
    }
    ctx.stroke();
  }

  /** Draw collapsed-clade triangles over the branches. */
  _drawCollapsedClades(yWorldMin, yWorldMax) {
    if (!this.nodes) return;
    const ctx      = this.ctx;
    const opacity  = this._collapsedCladeOpacity;
    const tipHalo  = this.tipHaloSize;

    for (const node of this.nodes) {
      if (!node.isCollapsed) continue;

      // Use the layout height stored on the node (= collapsedCladeHeightN option
      // passed to computeLayoutFromGraph) so the triangle exactly spans the rows.
      const halfN = node.collapsedTipCount / 2;

      // Cull: bottom of triangle above viewport or top below viewport
      const bottomY = node.y + halfN;
      const topY    = node.y - halfN;
      if (bottomY < yWorldMin || topY > yWorldMax) continue;

      const apexSX  = this._wx(node.x);
      const apexSY  = this._wy(node.y);
      const baseSX  = this._wx(node.collapsedMaxX);
      const topSY   = this._wy(node.y - halfN);
      const botSY   = this._wy(node.y + halfN);

      const colour = node.collapsedColour ?? this.tipShapeColor;

      // Build the triangle path once and reuse it for halo + fill + outline.
      ctx.beginPath();
      ctx.moveTo(apexSX, apexSY);
      ctx.lineTo(baseSX, topSY);
      ctx.lineTo(baseSX, botSY);
      ctx.closePath();

      // Halo: bg-coloured stroke clipped to the exterior of the triangle so
      // it only appears outside the edge and never bleeds through a translucent fill.
      if (tipHalo > 0) {
        ctx.save();
        // Clip region = full canvas rect XOR triangle interior (even-odd rule).
        // This restricts all subsequent drawing to the area outside the triangle.
        ctx.beginPath();
        ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.moveTo(apexSX, apexSY);
        ctx.lineTo(baseSX, topSY);
        ctx.lineTo(baseSX, botSY);
        ctx.closePath();
        ctx.clip('evenodd');

        ctx.strokeStyle = this.tipShapeBgColor;
        ctx.lineWidth   = tipHalo * 2;
        ctx.beginPath();
        ctx.moveTo(apexSX, apexSY);
        ctx.lineTo(baseSX, topSY);
        ctx.lineTo(baseSX, botSY);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalAlpha = opacity;
      ctx.fillStyle   = colour;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Thin outline in the clade colour (matches branch width).
      ctx.strokeStyle = colour;
      ctx.lineWidth   = this.branchWidth;
      ctx.stroke();
    }
  }

  /** Draw node/tip shapes (halos + fills) and tip labels. */
  _drawNodesAndLabels(yWorldMin, yWorldMax) {
    const ctx = this.ctx;

    // ── Node shape rendering ───────────────────────────────────────────────────
    const r     = this.tipRadius;       // tip shape radius  (0 = invisible)
    const nodeR = this.nodeRadius;      // internal node shape radius (0 = invisible)

    // Halo stroke extends tipHaloSize px outward from the shape edge.
    const tipHalo  = this.tipHaloSize;
    const nodeHalo = this.nodeHaloSize;

    // Label x-offset: leave at least 5 px even when tip shapes are hidden.
    const outlineR = Math.max(r + tipHalo, 5);
    const tipLabelSpacing = this.tipLabelSpacing;

    ctx.font         = this._tipFont(this.fontSize);
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
        if (node.isTip && !node.isCollapsed) continue;
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
        if (node.isCollapsed) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + r, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (nodeR > 0) {
      if (this._nodeColourBy && this._nodeColourScale) {
        const key    = this._nodeColourBy;
        const def    = this._annotationSchema?.get(key);
        const tipOnly = def && !def.onNodes && def.onTips;
        for (const node of this.nodes) {
          if (node.isTip && !node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          const val = tipOnly
            ? this._aggregateTipValue(node, key)
            : this._statValue(node, key);
          ctx.fillStyle = this._nodeColourForValue(val) ?? this.nodeShapeColor;
          ctx.beginPath();
          ctx.arc(this._wx(node.x), this._wy(node.y), nodeR, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = this.nodeShapeColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (node.isTip && !node.isCollapsed) continue;
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
          if (node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          const val   = this._statValue(node, key);
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
          if (node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          ctx.moveTo(this._wx(node.x) + r, this._wy(node.y));
          ctx.arc(this._wx(node.x), this._wy(node.y), r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }

    // Shape / label variables – hoisted before the labels pass so shapes can
    // be drawn even when tip labels are hidden due to density.
    // In aligned mode every label is drawn at the column corresponding to the
    // rightmost tip; null means normal (per-tip) positioning.
    const _align     = this.tipLabelAlign; // 'off'|'aligned'|'dashed'|'dots'|'solid'
    // Always use the aligned column when the layout option is set, even when
    // tip labels are hidden due to density, so shapes stay in the same column.
    const alignLabelX = (_align && _align !== 'off')
      ? this._wx(this.maxX) + outlineR
      : null;

    // Tip-label shapes: thin coloured swatches drawn to the left of label text.
    const _shape    = this._tipLabelShape;
    const _shSz     = _shape !== 'off' ? this._shapeSize(this._tipLabelShapeSize, _shape) : 0;
    const _shML      = _shape !== 'off' ? this._tipLabelShapeMarginLeft  : 0;
    const _shSpacing = _shape !== 'off' ? this._tipLabelShapeSpacing     : 0;
    // Extra shapes (2..N): each uses shape 1's size/spacing; drawn sequentially after shape 1.
    const _extraShapes = _shape !== 'off' ? this._tipLabelShapesExtra : [];
    // Collect active extra shapes (terminate at first 'off').
    const _activeXShapes = [];
    for (const s of _extraShapes) { if (s === 'off') break; _activeXShapes.push(s); }
    // Offset from baseX past shape 1: extra shapes sit immediately after shape 1,
    // and tipLabelSpacing controls the final gap between the rightmost shape and text.
    const _shOffset = _shML + _shSz + (_activeXShapes.length > 0 ? _shSpacing : 0);
    // Total width of all active extra shapes with appropriate inter-shape gaps.
    let _extraTotalOff = 0;
    for (let i = 0; i < _activeXShapes.length; i++) {
      _extraTotalOff += this._shapeSize(this._tipLabelShapeSize, _activeXShapes[i])
        + (i < _activeXShapes.length - 1 ? _shSpacing : 0);
    }
    // Helper: text x position for a given base x (all shapes accounted for).
    const _tx = (baseX) => baseX + _shOffset + _extraTotalOff + tipLabelSpacing;

    // Pass 3 – labels (two sub-passes when selection active: dim then bright)
    if (showLabels) {
      const hasSelection  = this._selectedTipIds.size > 0;
      const dimColor      = this.dimLabelColor;

      // Sub-pass 3-pre: connector lines (aligned + line styles only).
      if (alignLabelX !== null && _align !== 'aligned') {
        ctx.save();
        if      (_align === 'dashed') ctx.setLineDash([3, 4]);
        else if (_align === 'dots')   ctx.setLineDash([1, 4]);
        // 'solid': leave dash array empty
        ctx.lineWidth   = 0.35;
        ctx.strokeStyle = this.dimLabelColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          // Full-height collapsed clades WITHOUT a Name annotation: draw per-tip connectors
          // (one per virtual tip row, matching the individual tip labels drawn below).
          if (node.isCollapsed && node.collapsedTipNames &&
              Math.round(node.collapsedTipCount) >= node.collapsedRealTips &&
              !(node.annotations?.['Name']?.trim())) {
            const _halfN = node.collapsedTipCount / 2;
            if (node.y + _halfN < yWorldMin || node.y - _halfN > yWorldMax) continue;
            const N    = node.collapsedRealTips;
            const topY = node.y - (N - 1) / 2;
            const tipEdgeX = this._wx(node.collapsedMaxX);
            const lineEndX = alignLabelX + (_shOffset > 0 ? _shML : 0);
            if (lineEndX - tipEdgeX >= 8) {
              for (let i = 0; i < N; i++) {
                const wy = topY + i;
                if (wy < yWorldMin || wy > yWorldMax) continue;
                if (!this._showLabelAt(wy)) continue;
                ctx.moveTo(tipEdgeX, this._wy(wy));
                ctx.lineTo(lineEndX, this._wy(wy));
              }
            }
            continue;
          }
          // Compressed clades and full-height named clades: a single connector line is
          // drawn in Pass 3-collapsed (outside this block). Skip them here.
          if (node.isCollapsed) continue;
          // Regular tips: cull by node.y.
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          const tipEdgeX = this._wx(node.x) + outlineR;
          // End just before shape (or text when no shape), leaving a gap.
          const lineEndX = alignLabelX + (_shOffset > 0 ? _shML : 0);
          if (lineEndX - tipEdgeX < 8) continue;  // tip already at/near label column
          const sy = this._wy(node.y);
          ctx.moveTo(tipEdgeX, sy);
          ctx.lineTo(lineEndX, sy);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (hasSelection) {
        // Sub-pass 3a: unselected labels in dim grey
        ctx.fillStyle = dimColor;
        for (const node of this.nodes) {
          if (!node.isTip || this._selectedTipIds.has(node.id)) continue;
          if (node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          const _t = this._tipLabelText(node);
          const _bX = alignLabelX ?? (this._wx(node.x) + outlineR);
          if (_t) ctx.fillText(_t, _tx(_bX), this._wy(node.y));
        }
        // Sub-pass 3b: selected labels in bold + selected colour
        ctx.fillStyle = this.selectedLabelColor;
        ctx.font = this._selectedFont(this.fontSize);
        for (const node of this.nodes) {
          if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
          if (node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          const _t = this._tipLabelText(node);
          const _bX = alignLabelX ?? (this._wx(node.x) + outlineR);
          if (_t) ctx.fillText(_t, _tx(_bX), this._wy(node.y));
        }
        ctx.font = this._tipFont(this.fontSize);
      } else if (this._labelColourBy && this._labelColourScale) {
        const key = this._labelColourBy;
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          const _t = this._tipLabelText(node);
          if (!_t) continue;
          const val = this._statValue(node, key);
          const _bX = alignLabelX ?? (this._wx(node.x) + outlineR);
          ctx.fillStyle = this._labelColourForValue(val) ?? this.labelColor;
          ctx.fillText(_t, _tx(_bX), this._wy(node.y));
        }
      } else {
        ctx.fillStyle = this.labelColor;
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          if (!this._showLabelAt(node.y)) continue;
          const _t = this._tipLabelText(node);
          const _bX = alignLabelX ?? (this._wx(node.x) + outlineR);
          if (_t) ctx.fillText(_t, _tx(_bX), this._wy(node.y));
        }
      }

    }

    // Pass 3-collapsed: labels (and per-clade connector lines) for collapsed clade nodes.
    // Outside the showLabels gate so clade labels appear whenever the triangle has enough
    // pixel height, regardless of overall tip-label density.
    // Uses the main typeface (_typefaceKey/_typefaceStyle) unless overridden; label size is
    // independently controlled by _collapsedCladeFontSize.
    if (!this._tipLabelsOff && this.tipLabelAnnotation === null) {
      const hasSelection   = this._selectedTipIds.size > 0;
      const isSelected     = (node) => this._mrcaNodeId === node.id;
      const _cladeFontSize = this._collapsedCladeFontSize ?? this.fontSize;

      // Connector lines for clade labels (dashed / dots / solid alignment modes).
      // Draws ONE line per clade to its label Y (the clade centre, clamped to viewport).
      // Full-height no-Name clades already have per-tip connectors from Sub-pass 3-pre.
      if (alignLabelX !== null && _align !== 'aligned') {
        ctx.save();
        if      (_align === 'dashed') ctx.setLineDash([3, 4]);
        else if (_align === 'dots')   ctx.setLineDash([1, 4]);
        ctx.lineWidth   = 0.35;
        ctx.strokeStyle = this.dimLabelColor;
        ctx.beginPath();
        for (const node of this.nodes) {
          if (!node.isCollapsed) continue;
          const _nodeName = node.annotations?.['Name'];
          const _hasName  = _nodeName && _nodeName.trim();
          // Full-height without Name already handled by per-tip connectors.
          if (!_hasName && node.collapsedTipNames && Math.round(node.collapsedTipCount) >= node.collapsedRealTips) continue;
          const _halfN = node.collapsedTipCount / 2;
          if (node.y + _halfN < yWorldMin || node.y - _halfN > yWorldMax) continue;
          const _pixelHeight = node.collapsedTipCount * this.scaleY;
          if (_pixelHeight < _cladeFontSize) continue;  // label won't show; skip connector
          const _labelY  = Math.max(node.y - _halfN, Math.min(node.y + _halfN,
                             Math.max(yWorldMin, Math.min(yWorldMax, node.y))));
          const tipEdgeX = this._wx(node.collapsedMaxX);
          const lineEndX = alignLabelX + (_shOffset > 0 ? _shML : 0);
          if (lineEndX - tipEdgeX < 8) continue;
          ctx.moveTo(tipEdgeX, this._wy(_labelY));
          ctx.lineTo(lineEndX, this._wy(_labelY));
        }
        ctx.stroke();
        ctx.restore();
      }

      for (const node of this.nodes) {
        if (!node.isCollapsed) continue;
        const _halfN = node.collapsedTipCount / 2;
        if (node.y + _halfN < yWorldMin || node.y - _halfN > yWorldMax) continue;
        const sel = isSelected(node);
        const dim = hasSelection && !sel;
        const _nodeName = node.annotations?.['Name'];
        const _hasName  = _nodeName && _nodeName.trim();
        // At full height with no Name: render individual tip labels (same typeface as tip labels).
        if (!_hasName && node.collapsedTipNames && Math.round(node.collapsedTipCount) >= node.collapsedRealTips) {
          const N    = node.collapsedRealTips;
          const topY = node.y - (N - 1) / 2;
          const _bX  = alignLabelX ?? (this._wx(node.collapsedMaxX));
          for (let i = 0; i < node.collapsedTipNames.length; i++) {
            const tip = node.collapsedTipNames[i];
            if (!tip.name) continue;
            const wy = topY + i;
            if (wy < yWorldMin || wy > yWorldMax) continue;
            if (!this._showLabelAt(wy)) continue;
            if (dim) {
              ctx.fillStyle = this.dimLabelColor;
              ctx.font      = this._tipFont(this.fontSize);
            } else if (sel) {
              ctx.fillStyle = this.selectedLabelColor;
              ctx.font      = this._selectedFont(this.fontSize);
            } else if (this._labelColourBy && this._labelColourScale) {
              ctx.font      = this._tipFont(this.fontSize);
              ctx.fillStyle = this._labelColourForValue(this._statValue(tip, this._labelColourBy)) ?? this.labelColor;
            } else {
              ctx.fillStyle = this.labelColor;
              ctx.font      = this._tipFont(this.fontSize);
            }
            ctx.fillText(tip.name, _tx(_bX), this._wy(wy));
          }
        } else {
          // Name or count label — independent clade font size, theme fontFamily.
          const _pixelHeight = node.collapsedTipCount * this.scaleY;
          if (_pixelHeight < _cladeFontSize) continue;
          const _labelY = Math.max(node.y - _halfN,
                            Math.min(node.y + _halfN,
                              Math.max(yWorldMin, Math.min(yWorldMax, node.y))));
          const _bX  = alignLabelX ?? (this._wx(node.collapsedMaxX));
          const label = _hasName ? _nodeName.trim() : `${node.collapsedRealTips} tips`;
          ctx.font = this._font(_cladeFontSize, this._collapsedCladeTypefaceKey, this._collapsedCladeTypefaceStyle);
          if (dim) {
            ctx.fillStyle = this.dimLabelColor;
          } else if (sel) {
            ctx.fillStyle = this.selectedLabelColor;
            ctx.font      = this._selectedFont(_cladeFontSize, this._collapsedCladeTypefaceKey, this._collapsedCladeTypefaceStyle);
          } else {
            ctx.fillStyle = this.labelColor;
          }
          ctx.fillText(label, _tx(_bX), this._wy(_labelY));
        }
      }
      ctx.font = this._tipFont(this.fontSize);
    }

    // Pass 3-shapes – label shapes rendered independently of tip-label density
    // so they remain visible even when labels are too dense to show text.
    // Note: alignLabelX is null when showLabels is false, so shapes always
    // fall back to per-tip positioning when labels are hidden.
    if (_shape !== 'off') {
      const _shKey  = this._tipLabelShapeColourBy;
      const _shScl  = this._tipLabelShapeColourScale;
      const _hasSc  = !!(_shKey && _shScl);
      const halfSz  = _shSz / 2;
      for (const node of this.nodes) {
        if (!node.isTip) continue;
        if (node.isCollapsed) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        const sy     = this._wy(node.y);
        const baseX  = alignLabelX ?? (this._wx(node.x) + outlineR);
        const shapeX = baseX + _shML;
        ctx.fillStyle = _hasSc
          ? (this._tipLabelShapeColourForValue(this._statValue(node, _shKey)) ?? this._tipLabelShapeColor)
          : this._tipLabelShapeColor;
        if (_shape === 'circle') {
          ctx.beginPath();
          ctx.arc(shapeX + halfSz, sy, halfSz, 0, Math.PI * 2);
          ctx.fill();
        } else if (_shape === 'block') {
          const _bTop = Math.floor(sy - this.scaleY / 2);
          ctx.fillRect(shapeX, _bTop, _shSz, Math.ceil(sy + this.scaleY / 2) - _bTop);
        } else {
          // 'square'
          ctx.fillRect(shapeX, sy - halfSz, _shSz, _shSz);
        }
      }
    }

    // Pass 3-shapes-extra – extra label shapes (2..N), sharing size/colour/spacing from shape 1.
    if (_activeXShapes.length > 0) {
      let extraOff = _shOffset;  // x offset from baseX to the current extra shape
      for (let i = 0; i < _activeXShapes.length; i++) {
        const _shapeXType = _activeXShapes[i];
        const _shSzX  = this._shapeSize(this._tipLabelShapeSize, _shapeXType);
        const halfSzX = _shSzX / 2;
        const _shXKey = this._tipLabelShapeExtraColourBys[i];
        const _shXScl = this._tipLabelShapeExtraColourScales[i];
        const _hasXSc = !!(_shXKey && _shXScl);
        for (const node of this.nodes) {
          if (!node.isTip) continue;
          if (node.isCollapsed) continue;
          if (node.y < yWorldMin || node.y > yWorldMax) continue;
          const baseX   = alignLabelX ?? (this._wx(node.x) + outlineR);
          const shapeXX = baseX + extraOff;
          const sy      = this._wy(node.y);
          ctx.fillStyle = _hasXSc
            ? (this._tipLabelShapeExtraColourForValue(i, this._statValue(node, _shXKey)) ?? this._tipLabelShapeColor)
            : this._tipLabelShapeColor;
          if (_shapeXType === 'circle') {
            ctx.beginPath();
            ctx.arc(shapeXX + halfSzX, sy, halfSzX, 0, Math.PI * 2);
            ctx.fill();
          } else if (_shapeXType === 'block') {
            const _bTop = Math.floor(sy - this.scaleY / 2);
            ctx.fillRect(shapeXX, _bTop, _shSzX, Math.ceil(sy + this.scaleY / 2) - _bTop);
          } else {
            ctx.fillRect(shapeXX, sy - halfSzX, _shSzX, _shSzX);
          }
        }
        extraOff += _shSzX + (i < _activeXShapes.length - 1 ? _shSpacing : 0);
      }
    }
  }

  /** Draw selection markers, MRCA indicator, hover state, branch-mode hit markers and drag-select rect. */
  _drawSelectionAndHover(yWorldMin, yWorldMax) {
    const ctx   = this.ctx;
    const r     = this.tipRadius;
    const nodeR = this.nodeRadius;

    // Pass 3.5 – selected tips (drawn above labels)
    if (this._selectedTipIds.size > 0) {
      const gf      = this.selectedTipGrowthFactor;
      const minR    = this.selectedTipMinSize;
      const markerR = Math.max(r * gf, minR);
      const sw      = this.selectedTipStrokeWidth;

      // Ring (drawn first, underneath everything)
      ctx.globalAlpha = this.selectedTipStrokeOpacity;
      ctx.strokeStyle = this.selectedTipStrokeColor;
      ctx.lineWidth   = sw;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + markerR, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), markerR, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 1;

      // Re-draw original tip shape (above ring, below filled disk)
      if (r > 0) {
        if (this._tipColourBy && this._tipColourScale) {
          const key = this._tipColourBy;
          for (const node of this.nodes) {
            if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
            if (node.y < yWorldMin || node.y > yWorldMax) continue;
            const val = this._statValue(node, key);
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
      }

      // Filled disk on top
      ctx.globalAlpha = this.selectedTipFillOpacity;
      ctx.fillStyle   = this.selectedTipFillColor;
      ctx.beginPath();
      for (const node of this.nodes) {
        if (!node.isTip || !this._selectedTipIds.has(node.id)) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        ctx.moveTo(this._wx(node.x) + markerR, this._wy(node.y));
        ctx.arc(this._wx(node.x), this._wy(node.y), markerR, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Pass 3.6 – MRCA circle: shown when 2+ tips are selected, or when an MRCA
    // node is explicitly set by the app (e.g., after collapsing a clade).
    if (this._mrcaNodeId) {
      const mn = this.nodeMap.get(this._mrcaNodeId);
      if (mn) {
        const mnx     = this._wx(mn.x);
        const mny     = this._wy(mn.y);
        const gf      = this.selectedNodeGrowthFactor;
        const minR    = this.selectedNodeMinSize;
        const markerR = Math.max(nodeR * gf, minR);
        const sw      = this.selectedNodeStrokeWidth;

        // Ring (drawn first, underneath everything)
        ctx.globalAlpha = this.selectedNodeStrokeOpacity;
        ctx.beginPath();
        ctx.arc(mnx, mny, markerR, 0, Math.PI * 2);
        ctx.strokeStyle = this.selectedNodeStrokeColor;
        ctx.lineWidth   = sw;
        ctx.stroke();
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 1;

        // Re-draw original node shape (above ring, below filled disk)
        if (nodeR > 0) {
          ctx.beginPath();
          ctx.arc(mnx, mny, nodeR, 0, Math.PI * 2);
          ctx.fillStyle = this.nodeShapeColor;
          ctx.fill();
        }

        // Filled disk on top
        ctx.globalAlpha = this.selectedNodeFillOpacity;
        ctx.beginPath();
        ctx.arc(mnx, mny, markerR, 0, Math.PI * 2);
        ctx.fillStyle = this.selectedNodeFillColor;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Pass 4 – hovered node: always visible in nodes-mode, distinct colour, minimum size
    if (this._mode === 'nodes' && this._hoveredNodeId) {
      const hn = this.nodeMap.get(this._hoveredNodeId);
      if (hn) {
        const hx           = this._wx(hn.x);
        const hy           = this._wy(hn.y);
        const baseR        = hn.isTip ? r : nodeR;
        const gf           = hn.isTip ? this.tipHoverGrowthFactor   : this.nodeHoverGrowthFactor;
        const minR         = hn.isTip ? this.tipHoverMinSize        : this.nodeHoverMinSize;
        const hr           = Math.max(baseR * gf, minR);
        const fillColor    = hn.isTip ? this.tipHoverFillColor      : this.nodeHoverFillColor;
        const fillOpacity  = hn.isTip ? this.tipHoverFillOpacity    : this.nodeHoverFillOpacity;
        const ringColor    = hn.isTip ? this.tipHoverStrokeColor    : this.nodeHoverStrokeColor;
        const ringW        = hn.isTip ? this.tipHoverStrokeWidth    : this.nodeHoverStrokeWidth;
        const ringOpacity  = hn.isTip ? this.tipHoverStrokeOpacity  : this.nodeHoverStrokeOpacity;

        // Ring (drawn first, underneath everything)
        ctx.globalAlpha = ringOpacity;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth   = ringW;
        ctx.stroke();
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 1;

        // Re-draw original node/tip shape (above ring, below filled disk)
        if (baseR > 0) {
          if (hn.isTip) {
            if (this._tipColourBy && this._tipColourScale) {
              const val = this._statValue(hn, this._tipColourBy);
              ctx.fillStyle = this._tipColourForValue(val) ?? this.tipShapeColor;
            } else {
              ctx.fillStyle = this.tipShapeColor;
            }
          } else {
            ctx.fillStyle = this.nodeShapeColor;
          }
          ctx.beginPath();
          ctx.arc(hx, hy, baseR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Filled disk on top
        ctx.globalAlpha = fillOpacity;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Pass 5 – branches mode: draw hover and/or selection marker on branch
    if (this._mode === 'branches') {
      const gf  = this.selectedNodeGrowthFactor;
      const br  = Math.max(nodeR * gf, this.selectedNodeMinSize);
      const sw  = this.selectedNodeStrokeWidth;

      const drawBranchMarker = (node, worldX, fillAlpha, strokeAlpha) => {
        const bx = this._wx(worldX);
        const by = this._wy(node.y);
        // Ring (drawn first, underneath)
        ctx.globalAlpha = strokeAlpha;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.strokeStyle = this.selectedNodeStrokeColor;
        ctx.lineWidth   = sw;
        ctx.stroke();
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 1;
        // Filled disk on top
        ctx.globalAlpha = fillAlpha;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = this.selectedNodeFillColor;
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      // Hover preview (semi-transparent)
      if (this._branchHoverNode) {
        drawBranchMarker(this._branchHoverNode, this._branchHoverX,
          this.selectedNodeFillOpacity * 0.5, this.selectedNodeStrokeOpacity * 0.5);
      }
      // Fixed selection (opaque)
      if (this._branchSelectNode) {
        drawBranchMarker(this._branchSelectNode, this._branchSelectX,
          this.selectedNodeFillOpacity, this.selectedNodeStrokeOpacity);
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
  }

  /**
   * Draw annotation labels for internal nodes.
   * Drawn last (on top of everything), controlled by nodeLabelAnnotation.
   * Positions: 'right' = to the right of the node; 'above-left' / 'below-left'
   * = above or below the branch, to the left of the node.
   */
  _drawNodeLabels(yWorldMin, yWorldMax) {
    if (!this.nodeLabelAnnotation || !this.nodes) return;
    const minScale = this.nodeLabelFontSize * 0.5;
    if (this.scaleY < minScale) return;

    const ctx     = this.ctx;
    const nodeR   = Math.max(this.nodeRadius, 0);
    const spacing = this.nodeLabelSpacing;
    const pos     = this.nodeLabelPosition;

    ctx.save();
    ctx.font      = this._font(this.nodeLabelFontSize, this._nodeLabelTypefaceKey, this._nodeLabelTypefaceStyle);
    ctx.fillStyle = this.nodeLabelColor;
    if (pos === 'right') {
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'left';
    } else if (pos === 'below-left') {
      ctx.textBaseline = 'top';
      ctx.textAlign    = 'right';
    } else { // 'above-left'
      ctx.textBaseline = 'bottom';
      ctx.textAlign    = 'right';
    }

    for (const node of this.nodes) {
      if (node.isTip) continue;
      if (node.y < yWorldMin || node.y > yWorldMax) continue;
      const label = this._nodeLabelText(node);
      if (!label) continue;
      const nx = this._wx(node.x);
      const ny = this._wy(node.y);
      let tx, ty;
      if (pos === 'right') {
        tx = nx + nodeR + spacing;
        ty = ny;
      } else if (pos === 'below-left') {
        tx = nx - nodeR - spacing;
        ty = ny + spacing;
      } else { // 'above-left'
        tx = nx - nodeR - spacing;
        ty = ny - spacing;
      }
      ctx.fillText(label, tx, ty);
    }
    ctx.restore();
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

    // First pass: check collapsed clade triangles (point-in-triangle hit test)
    // Use per-node collapsedTipCount (= layout height) to match _drawCollapsedClades.
    for (const node of this.nodes) {
      if (!node.isCollapsed) continue;
      const halfN  = node.collapsedTipCount / 2;
      const apexSX = this._wx(node.x);
      const apexSY = this._wy(node.y);
      const baseSX = this._wx(node.collapsedMaxX);
      const topSY  = this._wy(node.y - halfN);
      const botSY  = this._wy(node.y + halfN);
      // Bounding-box cull first
      if (mx < apexSX || mx > baseSX) continue;
      if (my < topSY  || my > botSY) continue;
      // Point-in-triangle: interpolate the triangle edges at x=mx
      const t = baseSX > apexSX ? (mx - apexSX) / (baseSX - apexSX) : 0;
      const triTopY = apexSY + t * (topSY - apexSY);
      const triBotY = apexSY + t * (botSY - apexSY);
      if (my >= triTopY && my <= triBotY) return node;
    }

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
      // Match the outlineR formula used in _drawNodesAndLabels
      const outlineR = Math.max(r + this.tipHaloSize, 5);
      const halfH    = this.fontSize / 2 + 2;
      this.ctx.font  = this._tipFont(this.fontSize);
      // When labels are right-aligned they are drawn at the rightmost-tip column,
      // not at each node's own x — mirror that here.
      const _align      = this.tipLabelAlign;
      const isAligned   = _align && _align !== 'off';
      const alignLabelX = isAligned ? this._wx(this.maxX) + outlineR + this.tipLabelSpacing : null;
      for (const node of this.nodes) {
        if (!node.isTip || !node.name) continue;
        if (node.y < yWorldMin || node.y > yWorldMax) continue;
        const sy = this._wy(node.y);
        if (my < sy - halfH || my > sy + halfH) continue;
        const lx0 = alignLabelX ?? (this._wx(node.x) + outlineR + this.tipLabelSpacing);
        if (mx < lx0) continue;
        const labelText = this._tipLabelText(node);
        if (!labelText) continue;
        if (mx <= lx0 + this.ctx.measureText(labelText).width) return node;
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
    this._setupClickEvents(canvas);
    this._setupScrollAndZoomEvents(canvas);
    this._setupPointerEvents(canvas);
    this._setupKeyEvents(canvas);
  }

  /** Register dblclick and click event listeners on the canvas. */
  _setupClickEvents(canvas) {
    // ── Double-click on internal node: drill into subtree.
    canvas.addEventListener('dblclick', e => {
      if (this._spaceDown || !this.graph) return;
      const rect = canvas.getBoundingClientRect();
      const node = this._findNodeAtScreen(e.clientX - rect.left, e.clientY - rect.top);
      if (!node) return;
      // Double-click on a collapsed clade: drill into it (shows it expanded).
      if (node.isCollapsed) {
        this.navigateInto(node.id);
        return;
      }
      if (node.isTip) return;
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
        if (!additive) this._selectedTipIds.clear();
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
      this._notifyStats();
      this._dirty = true;
    });
  }

  /** Register wheel event listener for pinch-zoom, option-scroll zoom and pan. */
  _setupScrollAndZoomEvents(canvas) {
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
  }

  /** Register mousedown, mousemove, mouseleave and mouseup listeners for pan and drag-select. */
  _setupPointerEvents(canvas) {
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
            if (this._onHoverChange) this._onHoverChange(newId);
          }
        }
      }

      // ── Hyperbolic stretch: update focus while ~ (backtick/tilde) is held; persists on release ──
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
            const wasOff = this._hypTarget !== 1;
            this._hypFocusScreenY = clampedHy;
            this._hypTarget       = 1;
            this._dirty           = true;
            if (wasOff && this.onHypActivate) this.onHypActivate();
          }
          this.canvas.style.cursor = 'ns-resize';
        }
      }
      // Focus is NOT cleared here — it persists until Escape or explicit reset.
    });

    this.canvas.addEventListener('mouseleave', () => {
      let dirty = false;
      if (this._hoveredNodeId !== null)  {
        this._hoveredNodeId = null;  dirty = true;
        if (this._onHoverChange) this._onHoverChange(null);
      }
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
          const halfH    = this.fontSize / 2 + 2;  // half-height of a label row
          const showLbls = this.scaleY >= this.fontSize * 0.5;
          this.ctx.font  = this._tipFont(this.fontSize);
          // Respect right-aligned label column (same logic as _findNodeAtScreen and _draw)
          const _align      = this.tipLabelAlign;
          const isAligned   = _align && _align !== 'off';
          const alignLabelX = isAligned ? this._wx(this.maxX) + outlineR + this.tipLabelSpacing : null;
          for (const node of this.nodes) {
            if (!node.isTip) continue;
            const sx = this._wx(node.x);
            const sy = this._wy(node.y);
            // Vertical overlap: rect must intersect [sy - halfH, sy + halfH]
            if (ryMax < sy - halfH || ryMin > sy + halfH) continue;
            // Horizontal: hit either the circle or the label text.
            // Circle bounding box: [sx - r, sx + r]
            const circleHit = rxMax >= sx - r && rxMin <= sx + r;
            // Label bounding box: aligned column or per-node x
            let labelHit = false;
            if (showLbls && node.name) {
              const lx0 = alignLabelX ?? (sx + outlineR + this.tipLabelSpacing);
              const labelText = this._tipLabelText(node) ?? node.name;
              const lx1 = lx0 + this.ctx.measureText(labelText).width;
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
  }

  /** Register keydown, keyup and resize listeners for keyboard navigation and canvas resize. */
  _setupKeyEvents(canvas) {
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

      // Track the backtick/tilde key (~) for hyperbolic stretch — no modifier needed.
      // Using e.code (physical key) to avoid conflicts with Shift-based hotkeys.
      if (e.code === 'Backquote') {
        this._shiftHeld = true;
      }

      if (!this.nodes) return;

      const H        = canvas.clientHeight;
      const tipPx    = this.scaleY;               // one tip-row in screen pixels
      const pagePx   = H - tipPx;                 // one page minus one tip
      const zoomStep = 1.5;
      const centerY  = H / 2;

      // Zoom in/out (⌘=/⌘-), fit (⌘0), fit-labels (⌘⇧0), hyperbolic lens
      // magnification (⌘⇧=/⌘⇧-) are all handled via the command registry in
      // peartree.js so they share a single source of truth with the toolbar buttons.

      // Arrow key vertical scroll (↑/↓, ⌘↑/↓, ⌘⇧↑/↓) is handled by a
      // capture-phase listener in peartree.js so all three levels live together.

      // Escape – animate out the hyperbolic lens if active.
      if (e.key === 'Escape') {
        if (this._hypFocusScreenY !== null && this._hypTarget !== 0) {
          this._hypTarget = 0;   // triggers animated fade-out; focus Y cleared when strength reaches 0
          this._dirty     = true;
          if (this.onHypDeactivate) this.onHypDeactivate();
        }
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
      if (e.code === 'Backquote') {
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
    this._buildTipsBelowMap(nodes);
  }

  /** Post-order pass over the pre-order layout array to count descendant tips. */
  _buildTipsBelowMap(nodes) {
    this._tipsBelowMap = new Map();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.isTip) {
        this._tipsBelowMap.set(n.id, 1);
      } else {
        let count = 0;
        for (const cid of n.children) count += this._tipsBelowMap.get(cid) ?? 1;
        this._tipsBelowMap.set(n.id, count);
      }
    }
  }

  /**
   * Resolve the value for annotation key `key` on `node`.
   * For built-in sentinel keys (prefixed with `__`) reads from layout geometry;
   * for all others reads from node.annotations.
   */
  _statValue(node, key) {
    switch (key) {
      case '__divergence__':    return node.x;
      case '__age__':           return this._globalHeightMap?.get(node.id) ?? (this.maxX - node.x);
      case '__branch_length__': {
        if (node.parentId == null) return null;
        const parent = this.nodeMap?.get(node.parentId);
        return parent != null ? node.x - parent.x : null;
      }
      case '__tips_below__':    return this._tipsBelowMap?.get(node.id) ?? null;
      case '__temporal_residual__': return this._rttResidualsMap?.get(node.id) ?? null;
      case '__temporal_zscore__':   return this._rttZScoresMap?.get(node.id)   ?? null;
      case '__temporal_outlier__':  return this._rttOutliersMap?.get(node.id)  ?? null;
      case '__cal_date__':
        if (!this._calCalibration?.isActive) return null;
        return this._calCalibration.heightToDecYear(
          this._globalHeightMap?.get(node.id) ?? (this.maxX - node.x));
      default: {
        // Synthetic base keys (e.g. 'height' promoted from 'height_mean') are
        // not stored directly on node.annotations — use def.dataKey if set.
        const def = this._annotationSchema?.get(key);
        const lookupKey = def?.dataKey ?? key;
        return node.annotations?.[lookupKey];
      }
    }
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
    // Use a loop instead of Math.min(spread) — spreading 100k values as
    // function arguments overflows V8's argument stack.
    let minTipGH = Infinity;
    for (const n of this.nodes) {
      if (!n.isTip) continue;
      const gh = globalH(n);
      if (gh < minTipGH) minTipGH = gh;
    }
    if (!isFinite(minTipGH)) minTipGH = 0;

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

  /** Fire the stats-change callback with current selection/tree stats. */
  _notifyStats() {
    if (this._onStatsChange) this._onStatsChange(this._computeStats());
  }

  /**
   * Pan the tree view vertically by `deltaY` CSS pixels (positive = scroll
   * down / tree moves up, same convention as WheelEvent.deltaY).
   * Called by external panels (e.g. the data-table) to forward their own
   * wheel events so the tree and table stay synchronised.
   */
  scrollByDelta(deltaY) {
    const scrolledDown = deltaY > 0;
    this._setTarget(
      this._targetOffsetY - deltaY,
      this._targetScaleY,
      false
    );
    clearTimeout(this._snapTimer);
    this._snapTimer = setTimeout(() => this._snapToTip(scrolledDown), 150);
  }
}
