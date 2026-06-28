/**
 * LegendRenderer — draws a colour-key legend onto one of two side canvases.
 *
 * Follows the same standalone-class pattern as AxisRenderer: peartree.js
 * creates an instance, registers it with the TreeRenderer via
 * renderer.setLegendRenderer(lr), and calls the public API directly for
 * legend-specific settings.  TreeRenderer automatically proxies background-
 * colour and annotation-schema changes through to this class, and calls
 * resize() at the right point during its own _resize() pass.
 *
 * Public API (mirrors AxisRenderer):
 *   setAnnotationSchema(schema)        — Map<key, AnnotationDef> from buildAnnotationSchema
 *   setAnnotation(position, key)       — 'right'|null, annotation key or null
 *   setFontSize(n)                     — label font size in px
 *   setTextColor(color)                — CSS colour string
 *   setBgColor(color, skipBg=false)    — background colour (matches tree canvas)
 *   resize()                           — call after the legend canvas is shown/hidden/resized
 *   draw()                             — explicit repaint
 */
import { getSequentialPalette,
         getCategoricalPalette,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         MISSING_DATA_COLOUR } from '@artic-network/pearcore/palettes.js';
import { dateToDecimalYear, isNumericType } from './phylograph.js';
import { formatNumericAnnotationValue, formatDateLabelISO } from '@artic-network/pearcore/utils.js';
import { buildFont, TYPEFACES } from '@artic-network/pearcore/typefaces.js';

export class LegendRenderer {
  /**
   * @param {HTMLCanvasElement} rightCanvas
   * @param {HTMLCanvasElement} rightCanvas2 Secondary legend canvas (right side).
   * @param {HTMLCanvasElement} rightCanvas3 Third legend canvas (right side).
   * @param {HTMLCanvasElement} rightCanvas4 Fourth legend canvas (right side).
   * @param {object}            settings  Must include fontSize, textColor, bgColor.
   */
  constructor(rightCanvas, rightCanvas2, rightCanvas3, rightCanvas4, settings) {
    this._rightCanvas  = rightCanvas;
    this._rightCanvas2 = rightCanvas2 ?? null;
    this._rightCanvas3 = rightCanvas3 ?? null;
    this._rightCanvas4 = rightCanvas4 ?? null;

    this._position   = null;   // 'right' | null
    this._annotation = null;   // annotation key string | null
    this._schema     = null;   // Map<string, AnnotationDef>
    this._paletteOverrides = null; // Map<annotKey, paletteName> from TreeRenderer
    this._paletteReverseOverrides = null; // Map<annotKey, boolean> from TreeRenderer

    this._annotation2  = null;    // second legend annotation key | null
    this._position2    = 'right'; // 'right' (beside L1) | 'below' (stacked under L1)
    this._heightPct2   = 50;      // legend 2 height as % of canvas-container
    this._annotation3  = null;    // third legend annotation key | null
    this._position3    = 'right'; // 'right' (beside) | 'below' (stacked)
    this._heightPct3   = 50;      // legend 3 height as % of canvas-container
    this._annotation4  = null;    // fourth legend annotation key | null
    this._position4    = 'right'; // 'right' (beside) | 'below' (stacked)
    this._heightPct4   = 50;      // legend 4 height as % of canvas-container
    this._decimalPlaces  = null;  // legend 1 numeric tick decimal places (null=auto)
    this._decimalPlaces2 = null;  // legend 2 numeric tick decimal places (null=auto)
    this._decimalPlaces3 = null;  // legend 3 numeric tick decimal places (null=auto)
    this._decimalPlaces4 = null;  // legend 4 numeric tick decimal places (null=auto)

    this.skipBg = false;
    this._dpr   = window.devicePixelRatio || 1;
    this._fontFamily    = 'monospace';
    this._typefaceKey   = null;
    this._typefaceStyle = null;

    // Hit regions for categorical entries: [{value, y0, y1, isLegend2?, isLegend3?, isLegend4?}]
    this._hitRegions  = [];   // primary canvas (legend1 + any stacked-below legends)
    this._hitRegions2 = [];   // legend2 own canvas
    this._hitRegions3 = [];   // legend3 own canvas
    this._hitRegions4 = [];   // legend4 own canvas

    // Currently-selected category values per legend (Set<any> | null).
    this._selectedValues1 = null;
    this._selectedValues2 = null;
    this._selectedValues3 = null;
    this._selectedValues4 = null;
    // Colours used to highlight selected rows — updated from tree renderer selection colours.
    this._selStrokeColor  = '#E06961';
    this._selFillColor    = '#E06961';

    /** Callback for legend-1 categorical click: (value) => void */
    this.onCategoryClick  = null;
    /** Callback for legend-2 categorical click: (value) => void */
    this.onCategoryClick2 = null;
    /** Callback for legend-3 categorical click: (value) => void */
    this.onCategoryClick3 = null;
    /** Callback for legend-4 categorical click: (value) => void */
    this.onCategoryClick4 = null;

    // Wire click + hover listeners on all four canvases.
    // sideN=0 means main canvas (legend1 + stacked), sideN=2/3/4 means that legend's own canvas.
    for (const [lc, sideN] of [
      [this._rightCanvas,  0],
      [this._rightCanvas2, 2],
      [this._rightCanvas3, 3],
      [this._rightCanvas4, 4],
    ]) {
      if (!lc) continue;
      lc.addEventListener('click', (e) => {
        const cssY    = e.offsetY;
        const regions = sideN === 4 ? this._hitRegions4
                      : sideN === 3 ? this._hitRegions3
                      : sideN === 2 ? this._hitRegions2
                      : this._hitRegions;
        for (const r of regions) {
          if (cssY >= r.y0 && cssY < r.y1) {
            const cb = r.isLegend4 ? this.onCategoryClick4
                     : r.isLegend3 ? this.onCategoryClick3
                     : r.isLegend2 ? this.onCategoryClick2
                     : this.onCategoryClick;
            if (cb) cb(r.value, e.metaKey || e.ctrlKey);
            return;
          }
        }
      });
      lc.style.cursor = 'default';
      lc.addEventListener('mousemove', (e) => {
        const cssY    = e.offsetY;
        const regions = sideN === 4 ? this._hitRegions4
                      : sideN === 3 ? this._hitRegions3
                      : sideN === 2 ? this._hitRegions2
                      : this._hitRegions;
        const hit   = regions.find(r => cssY >= r.y0 && cssY < r.y1);
        const hasCb = hit ? (
          hit.isLegend4 ? !!this.onCategoryClick4
        : hit.isLegend3 ? !!this.onCategoryClick3
        : hit.isLegend2 ? !!this.onCategoryClick2
        : !!this.onCategoryClick
        ) : false;
        lc.style.cursor = (hit && hasCb) ? 'pointer' : 'default';
      });
      lc.addEventListener('mouseleave', () => { lc.style.cursor = 'default'; });
    }

    this._paddingLeft   = 0;
    this._paddingRight  = 0;
    this._paddingTop    = 0;
    this._paddingBottom = 0;
    this._layoutSpacing = 0;
    this._heightPct  = 100;  // legend 1 height as % of the canvas-container (1–100)

    this.setSettings(settings, /*redraw*/ false);
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Apply rendering settings.  Recognised keys: fontSize (number), textColor (string),
   * bgColor (string), skipBg (boolean), paddingLeft/Right/Top/Bottom (number).
   * @param {object}  s
   * @param {boolean} redraw  When true (default) triggers a repaint.
   */
  setSettings(s, redraw = true) {
    if (s.fontSize   != null) this.fontSize   = s.fontSize;
    if (s.textColor  != null) this.textColor  = s.textColor;
    if (s.bgColor    != null) {
      this.bgColor = s.bgColor;
    }
    if (s.skipBg       != null) this.skipBg        = s.skipBg;
    if (s.paddingLeft   != null) this._paddingLeft   = s.paddingLeft;
    if (s.paddingRight  != null) this._paddingRight  = s.paddingRight;
    if (s.paddingTop    != null) this._paddingTop    = s.paddingTop;
    if (s.paddingBottom != null) this._paddingBottom = s.paddingBottom;
    if (s.layoutSpacing != null) {
      const spacing = parseInt(s.layoutSpacing);
      this._layoutSpacing = Number.isFinite(spacing) ? Math.max(0, spacing) : 0;
    }
    if (s.heightPct  != null) this._heightPct  = s.heightPct;
    if (s.heightPct2 != null) this._heightPct2 = s.heightPct2;
    if (s.heightPct3 != null) this._heightPct3 = s.heightPct3;
    if (s.heightPct4 != null) this._heightPct4 = s.heightPct4;
    if (s.decimalPlaces  !== undefined) this._decimalPlaces  = s.decimalPlaces;
    if (s.decimalPlaces2 !== undefined) this._decimalPlaces2 = s.decimalPlaces2;
    if (s.decimalPlaces3 !== undefined) this._decimalPlaces3 = s.decimalPlaces3;
    if (s.decimalPlaces4 !== undefined) this._decimalPlaces4 = s.decimalPlaces4;
    if (redraw) this.draw();
  }

  _legendDecimalPlaces(legendN) {
    if (legendN === 2) return this._decimalPlaces2;
    if (legendN === 3) return this._decimalPlaces3;
    if (legendN === 4) return this._decimalPlaces4;
    return this._decimalPlaces;
  }

  _numericFormatter(def, legendN) {
    const fixedDp = this._legendDecimalPlaces(legendN);
    return (v) => formatNumericAnnotationValue(v, def, fixedDp, {
      autoFormatter: 'fmt',
      fallback: 'string',
    });
  }

  /**
   * Store the annotation schema.  Triggers a redraw so the legend reflects
   * the new data immediately.
   * @param {Map<string, object>} schema
   */
  setAnnotationSchema(schema) {
    this._schema = schema;
    this.draw();
  }

  /**
   * Receive the per-annotation palette overrides Map from TreeRenderer.
   * Triggers a redraw so legend colours update immediately.
   * @param {Map<string,string>|null} overrides
   */
  setPaletteOverrides(overrides) {
    this._paletteOverrides = overrides;
    this.draw();
  }

  /**
   * Receive per-annotation palette reverse flags from TreeRenderer.
   * Triggers a redraw so legend colours update immediately.
   * @param {Map<string,boolean>|null} overrides
   */
  setPaletteReverseOverrides(overrides) {
    this._paletteReverseOverrides = overrides;
    this.draw();
  }

  /**
   * Receive the per-annotation scale mode overrides Map from TreeRenderer.
   * Triggers a redraw so legend axis labels update immediately.
   * @param {Map<string,string>|null} overrides
   */
  setScaleModeOverrides(overrides) {
    this._scaleModeOverrides = overrides;
    this.draw();
  }

  /**
   * Receive per-annotation live min/max ranges computed from currently visible
   * nodes by TreeRenderer._pushLiveRangesToLegend().
   * @param {Map<string, {min:number, max:number}>|null} ranges
   */
  setLiveRanges(ranges) {
    this._liveRanges = ranges;
    this.draw();
  }

  /**
   * Set which annotation and which canvas side to use, then draw.
   * Pass position=null to hide the legend entirely.
   * @param {'right'|null} position
   * @param {string|null}  key
   */
  setAnnotation(position, key) {
    this._position   = position || null;
    this._annotation = key      || null;
    // Caller is responsible for showing/hiding the canvas elements and calling
    // resize() (or renderer._resize()) before the next draw, so that canvas
    // physical dimensions are updated first.
  }

  /**
   * Set the second legend's annotation and position relative to legend 1.
   * @param {'right'|'below'|null} relPos  'right' = own canvas beside L1; 'below' = stacked in same canvas
   * @param {string|null}          key
   */
  setAnnotation2(relPos, key) {
    this._position2   = relPos || 'right';
    this._annotation2 = key    || null;
  }

  /**
   * Set the third legend's annotation and position.
   * @param {'right'|'below'|null} relPos
   * @param {string|null}          key
   */
  setAnnotation3(relPos, key) {
    this._position3   = relPos || 'right';
    this._annotation3 = key    || null;
  }

  /**
   * Set the fourth legend's annotation and position.
   * @param {'right'|'below'|null} relPos
   * @param {string|null}          key
   */
  setAnnotation4(relPos, key) {
    this._position4   = relPos || 'right';
    this._annotation4 = key    || null;
  }

  /**
   * Set which category values are "selected" for legend N (1–4).
   * Pass null to clear the selection highlight.
   * @param {number}      legendN  1 | 2 | 3 | 4
   * @param {Set|null}    values
   */
  setSelectedValues(legendN, values) {
    if      (legendN === 2) this._selectedValues2 = values;
    else if (legendN === 3) this._selectedValues3 = values;
    else if (legendN === 4) this._selectedValues4 = values;
    else                    this._selectedValues1 = values;
    this.draw();
  }

  /**
   * Update the colours used to render highlighted (selected) category rows.
   * @param {string} strokeColor
   * @param {string} fillColor
   */
  setSelectedColors(strokeColor, fillColor) {
    if (strokeColor) this._selStrokeColor = strokeColor;
    if (fillColor)   this._selFillColor   = fillColor;
  }

  /** @param {number} n — font size in CSS pixels */
  setFontSize(n) {
    this.fontSize = n;
    this.draw();
  }

  /** @param {string} color — CSS colour string */
  setTextColor(color) {
    this.textColor = color;
    this.draw();
  }

  /** @param {string} f — CSS font-family string (kept for backward compat) */
  setFontFamily(f) {
    this._fontFamily = f || 'monospace';
    this._typefaceKey   = null;
    this._typefaceStyle = null;
    this.draw();
  }

  /**
   * Set typeface by key + style (uses buildFont for correct weight).
   * @param {string} key    – TYPEFACES key (e.g. 'Helvetica Neue')
   * @param {string} style  – Style name (e.g. 'Thin', 'Regular')
   */
  setTypeface(key, style) {
    this._typefaceKey   = key   || null;
    this._typefaceStyle = style || null;
    this._fontFamily    = TYPEFACES[key]?.family ?? key ?? 'monospace';
    this.draw();
  }

  /** Build a CSS font string for canvas ctx.font. */
  _font(sizePx) {
    if (this._typefaceKey) return buildFont(this._typefaceKey, this._typefaceStyle, sizePx);
    return `${sizePx}px ${this._fontFamily}`;
  }

  /**
   * Update the background colour used when painting the legend content.
   * @param {string}  color
   * @param {boolean} skipBg — when true the background rect is not painted
   *                           (matches TreeRenderer._skipBg for Tauri captures)
   */
  setBgColor(color, skipBg = false) {
    this.bgColor = color;
    this.skipBg  = skipBg;
    this.draw();
  }

  /**
   * Sync the physical canvas dimensions to the current CSS dimensions and DPR,
   * then repaint.  Called automatically by TreeRenderer._resize().
   */
  resize() {
    this._dpr = window.devicePixelRatio || 1;
    const { col2, col3, col4 } = this._resolveColumns();
    const canvasForCol = [this._rightCanvas, this._rightCanvas2, this._rightCanvas3, this._rightCanvas4];
    const legendEntries = [
      { col: 0,    key: this._annotation,  pct: this._heightPct,  isL1: true  },
      { col: col2, key: this._annotation2, pct: this._heightPct2, isL1: false },
      { col: col3, key: this._annotation3, pct: this._heightPct3, isL1: false },
      { col: col4, key: this._annotation4, pct: this._heightPct4, isL1: false },
    ];
    for (let c = 0; c <= 3; c++) {
      const lc = canvasForCol[c];
      if (!lc || lc.style.display === 'none') continue;
      const inCol = legendEntries.filter(e => e.col === c);
      if (inCol.length === 0) continue;
      const entries = inCol.map(e => ({ pct: e.pct, hasKey: !!e.key || e.isL1 }));
      const { total } = this._computeColumnStackedHeights(lc, entries);
      const LW = lc.clientWidth;
      const LH = total || lc.clientHeight || 0;
      lc.style.height = LH + 'px';
      lc.width  = LW * this._dpr;
      lc.height = LH * this._dpr;
      lc.getContext('2d').setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    }
    this.draw();
  }

  /**
   * Content height of lc's parent wrapper, excluding vertical padding.
   * Mirrors parentElement.clientWidth for the axis canvas: both strip padding
   * so the percentage calculation is relative to the drawable area.
   */
  _containerH(lc) {
    const el = lc.parentElement;
    if (!el) return lc.clientHeight || 0;
    const s = getComputedStyle(el);
    return el.clientHeight
      - parseFloat(s.paddingTop  || '0')
      - parseFloat(s.paddingBottom || '0');
  }

  /**
   * Resolve which column (0–3) each legend occupies.
   * Position is relative to the preceding legend:
   *   'below' → same column as predecessor
   *   'right' → predecessor's column + 1 (capped at 3)
   * Column 0 maps to _rightCanvas, column 1 to _rightCanvas2, etc.
   */
  _resolveColumns() {
    const col2 = this._position2 === 'right' ? 1 : 0;
    const col3 = this._position3 === 'right' ? Math.min(col2 + 1, 3) : col2;
    const col4 = this._position4 === 'right' ? Math.min(col3 + 1, 3) : col3;
    return { col2, col3, col4 };
  }

  /**
   * Compute per-legend heights for legends stacked in one column canvas.
   * entries: [{pct, hasKey}] top-to-bottom.
   * • sumPct < 100 → independent pct-of-container heights
   * • sumPct ≥ 100 → proportional share of full containerH
   * @returns {{total: number, heights: number[]}}
   */
  _computeColumnStackedHeights(lc, entries) {
    const containerH = this._containerH(lc);
    if (!containerH) return { total: lc.clientHeight || 0, heights: entries.map(() => 0) };
    const pcts   = entries.map(e => e.hasKey ? Math.max(1, e.pct) : 0);
    const active = pcts.filter(p => p > 0).length;
    const gapPx = Math.max(0, this._layoutSpacing || 0);
    const totalGap = Math.max(0, active - 1) * gapPx;
    const usableH = Math.max(0, containerH - totalGap);
    const sumPct = pcts.reduce((a, b) => a + b, 0);
    if (sumPct === 0) return { total: 0, heights: entries.map(() => 0) };
    let heights;
    if (sumPct < 100) {
      heights = pcts.map(p => Math.round(usableH * p / 100));
    } else {
      heights = pcts.map(p => Math.round(usableH * p / sumPct));
      // Absorb rounding remainder in the last non-zero entry.
      const sum = heights.reduce((a, b) => a + b, 0);
      if (sum !== usableH) {
        for (let i = heights.length - 1; i >= 0; i--) {
          if (heights[i] > 0) { heights[i] += usableH - sum; break; }
        }
      }
    }
    return { total: heights.reduce((a, b) => a + b, 0) + totalGap, heights };
  }

  /** Maximum auto-sized legend width (CSS px). Labels wider than this are truncated with '…'. */
  static MAX_LEGEND_W = 280;

  /**
   * Return `text` truncated with '…' so it fits within `maxW` CSS px,
   * given a 2D canvas context already set to the desired font.
   * @private
   */
  _truncateText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    const ellipsis = '\u2026';
    const ellW = ctx.measureText(ellipsis).width;
    if (ellW >= maxW) return ellipsis;
    let lo = 0, hi = text.length;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (ctx.measureText(text.slice(0, mid)).width + ellW <= maxW) lo = mid;
      else hi = mid;
    }
    return text.slice(0, lo) + ellipsis;
  }

  /**
   * Measure the minimum canvas width (CSS px) for any annotation key,
   * capped at MAX_LEGEND_W.
   * @param {string|null} key
   * @returns {number}
   */
  _measureWidthForKey(key, legendN = 1) {
    const def = key && this._schema?.get(key);
    if (!def) return 120;

    const L     = this._paddingLeft   ?? 0;
    const R     = this._paddingRight  ?? 0;
    const lfs   = this.fontSize  ?? 11;
    const mc  = document.createElement('canvas');
    const ctx = mc.getContext('2d');
    const measure = (text, bold = false) => {
      ctx.font = bold ? `700 ${lfs}px ${this._fontFamily ?? 'monospace'}` : this._font(lfs);
      return ctx.measureText(text).width;
    };

    let contentW = measure(def.label ?? key, true);
    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const SWATCH = Math.max(8, lfs);
      for (const v of (def.values || [])) {
        contentW = Math.max(contentW, SWATCH + 6 + measure(String(v)));
      }
    } else {
      const BAR_W = 14;
      const tickCount = 6;
      if (def.dataType === 'date') {
        const vals = def.values || [];
        for (let i = 0; i < Math.min(tickCount, vals.length); i++) {
          contentW = Math.max(contentW, BAR_W + 6 + measure(formatDateLabelISO(vals[i])));
        }
      } else if (isNumericType(def.dataType)) {
        // Match draw-time numeric scale logic so measured width always fits ticks.
        const _mode = this._scaleModeOverrides?.get(key) ?? '';
        const _live = this._liveRanges?.get(key);
        let effMin = _live?.min ?? def.min ?? 0;
        let effMax = _live?.max ?? def.max ?? 1;
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
        const range = effMax - effMin;
        const fmt = this._numericFormatter(def, legendN);
        for (let i = 0; i < tickCount; i++) {
          const val = effMax - (i / (tickCount - 1)) * range;
          contentW = Math.max(contentW, BAR_W + 6 + measure(fmt(val)));
        }
      } else {
        const fmt = def.fmt ?? (v => String(v));
        const min = def.min ?? 0;
        const max = def.max ?? 1;
        for (let i = 0; i < tickCount; i++) {
          const val = max - (i / (tickCount - 1)) * (max - min);
          contentW  = Math.max(contentW, BAR_W + 6 + measure(fmt(val)));
        }
      }
    }
    const measuredW = Math.ceil(L + contentW + R);
    // Date ticks should always be fully visible.
    if (def.dataType === 'date') return measuredW;
    return Math.min(LegendRenderer.MAX_LEGEND_W, measuredW);
  }

  /** Minimum canvas width for legend 1. */
  measureWidth()  { return this._measureWidthForKey(this._annotation, 1); }

  /** Minimum canvas width for legend 2. */
  measureWidth2() { return this._measureWidthForKey(this._annotation2, 2); }

  /** Minimum canvas width for legend 3. */
  measureWidth3() { return this._measureWidthForKey(this._annotation3, 3); }

  /** Minimum canvas width for legend 4. */
  measureWidth4() { return this._measureWidthForKey(this._annotation4, 4); }

  /**
   * Paint the colour legend(s) onto the canvas(es).
   * Safe to call at any time; exits early when nothing is configured.
   */
  draw() {
    const pos  = this._position;
    const key  = this._annotation;
    const key2 = this._annotation2;
    const key3 = this._annotation3;
    const key4 = this._annotation4;
    const lcR  = this._rightCanvas;

    // Clear all visible canvases.
    for (const lc of [lcR,
                      this._rightCanvas2,
                      this._rightCanvas3,
                      this._rightCanvas4]) {
      if (!lc || lc.style.display === 'none') continue;
      lc.getContext('2d').clearRect(0, 0, lc.width, lc.height);
    }

    const activeCanvas = pos === 'right' ? lcR : null;
    if (!activeCanvas || activeCanvas.style.display === 'none') return;
    if (!key || !this._schema) return;

    const dpr = this._dpr;

    // Assign each legend to a column, then draw all legends stacked within each column.
    const { col2, col3, col4 } = this._resolveColumns();
    const canvasForCol = [this._rightCanvas, this._rightCanvas2, this._rightCanvas3, this._rightCanvas4];
    const legendSpecs = [
      { col: 0,    key,       pct: this._heightPct,  selVals: this._selectedValues1, flag: null,        legendN: 1 },
      { col: col2, key: key2, pct: this._heightPct2, selVals: this._selectedValues2, flag: 'isLegend2', legendN: 2 },
      { col: col3, key: key3, pct: this._heightPct3, selVals: this._selectedValues3, flag: 'isLegend3', legendN: 3 },
      { col: col4, key: key4, pct: this._heightPct4, selVals: this._selectedValues4, flag: 'isLegend4', legendN: 4 },
    ];

    const canvasHitRegions = [[], [], [], []];
    for (let c = 0; c <= 3; c++) {
      const lc = canvasForCol[c];
      if (!lc || lc.style.display === 'none') continue;
      const specs = legendSpecs.filter(s => s.col === c && s.key);
      if (specs.length === 0) continue;
      const W   = lc.width / dpr;
      const ctx = lc.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { heights } = this._computeColumnStackedHeights(lc, specs.map(s => ({ pct: s.pct, hasKey: true })));
      const gapPx = Math.max(0, this._layoutSpacing || 0);
      let offsetY = 0;
      for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        const h    = heights[i];
        if (h <= 0) continue;
        const regions = this._drawContent(ctx, W, h, spec.key, offsetY, spec.selVals, spec.legendN);
        const flagged = spec.flag ? regions.map(r => ({ ...r, [spec.flag]: true })) : regions;
        for (const r of flagged) canvasHitRegions[c].push(r);
        offsetY += h;
        if (i < specs.length - 1) offsetY += gapPx;
      }
    }

    this._hitRegions  = canvasHitRegions[0];
    this._hitRegions2 = canvasHitRegions[1];
    this._hitRegions3 = canvasHitRegions[2];
    this._hitRegions4 = canvasHitRegions[3];
  }

  /**
   * Draw one legend's content into `ctx` within the CSS-pixel rect
   * [0, offsetY .. offsetY+H, W].  Returns hit regions with y values
   * relative to the canvas origin (already include offsetY).
   * @private
   */
  _drawContent(ctx, W, H, key, offsetY, selectedValues = null, legendN = 1) {
    const hitRegions = [];
    if (!key || !this._schema) return hitRegions;
    const def = this._schema.get(key);
    if (!def) return hitRegions;

    const L    = this._paddingLeft   ?? 0;
    const R    = this._paddingRight  ?? 0;
    const T    = this._paddingTop    ?? 0;
    const B    = this._paddingBottom ?? 0;
    const lfs  = this.fontSize;
    const ltc  = this.textColor;
    const maxY = offsetY + H - B;

    if (!this.skipBg) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, offsetY, W, H);
    }

    const TITLE_TOP_GAP = 6;
    const TITLE_CONTENT_GAP = 4;
    let y = offsetY + T + TITLE_TOP_GAP;

    // Title.
    ctx.font = `700 ${lfs}px ${this._fontFamily ?? 'monospace'}`; ctx.fillStyle = ltc;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(this._truncateText(ctx, def.label ?? key, W - L - R), L, y);
    y += lfs + TITLE_CONTENT_GAP;

    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const paletteName = this._paletteOverrides?.get(key);
      const isReversed  = !!this._paletteReverseOverrides?.get(key);
      const values      = def.values || [];
      const basePalette = getCategoricalPalette(paletteName);
      const palette     = isReversed ? [...basePalette].reverse() : basePalette;
      const colourMap   = new Map(values.map((v, i) => [v, palette[i % palette.length]]));
      const SWATCH   = Math.max(8, lfs);
      const ROW_H    = Math.max(SWATCH + 4, lfs + 4);
      const vals     = def.values || [];
      const n        = vals.length;
      const avail    = maxY - y;
      // If all rows fit at natural height use ROW_H; otherwise compress to fit them all,
      // down to a minimum of lfs px per row (so text remains legible).
      const effectiveRowH = n > 0 && n * ROW_H > avail
        ? Math.max(lfs, Math.floor(avail / n))
        : ROW_H;
      const effectiveSwatch = Math.min(SWATCH, effectiveRowH - 2);
      ctx.font = this._font(lfs); ctx.textBaseline = 'middle';
      let clipped = false;
      vals.forEach((val) => {
        if (y + effectiveSwatch > maxY) { clipped = true; return; }
        const isSelected = selectedValues != null && selectedValues.has(val);
        // Highlight row background for selected categories.
        if (isSelected) {
          ctx.fillStyle = this._selStrokeColor + '26'; // ~15 % opacity tint
          ctx.fillRect(0, y - 2, W, effectiveRowH);
        }
        ctx.fillStyle = colourMap.get(val) ?? MISSING_DATA_COLOUR;
        ctx.fillRect(L, y, effectiveSwatch, effectiveSwatch);
        // Border on swatch for selected rows.
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = this._selStrokeColor;
          ctx.lineWidth   = 2;
          ctx.strokeRect(L + 1, y + 1, effectiveSwatch - 2, effectiveSwatch - 2);
          ctx.restore();
        }
        ctx.fillStyle = isSelected ? this._selStrokeColor : ltc;
        ctx.textAlign = 'left';
        const _labelAvail = W - L - R - effectiveSwatch - 6;
        ctx.fillText(this._truncateText(ctx, String(val), _labelAvail), L + effectiveSwatch + 6, y + effectiveSwatch / 2);
        hitRegions.push({ value: val, y0: y, y1: y + effectiveRowH });
        y += effectiveRowH;
      });
      if (clipped) {
        ctx.save();
        ctx.font      = this._font(lfs);
        ctx.fillStyle = ltc;
        ctx.globalAlpha = 0.6;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('…', L, maxY + B);
        ctx.restore();
      }
    } else if (def.dataType === 'date') {
      const BAR_W = 14;
      const BAR_Y = y;
      const BAR_H = Math.max(40, maxY - y);
      const grad  = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      const baseStops = getSequentialPalette(this._paletteOverrides?.get(key));
      const stops = !!this._paletteReverseOverrides?.get(key) ? [...baseStops].reverse() : baseStops;
      const ns = stops.length;
      for (let i = 0; i < ns; i++) grad.addColorStop(i / (ns - 1), stops[ns - 1 - i]);
      ctx.fillStyle = grad;
      ctx.fillRect(L, BAR_Y, BAR_W, BAR_H);
      const LABEL_X = L + BAR_W + 6;
      const LABEL_W = W - LABEL_X - R;
      const tc = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
      const vals = def.values || [];
      const minDec = dateToDecimalYear(def.min);
      const maxDec = dateToDecimalYear(def.max);
      const range  = maxDec - minDec || 1;
      ctx.font = this._font(lfs); ctx.fillStyle = ltc; ctx.textAlign = 'left';
      for (let i = 0; i < tc; i++) {
        const t = i / (tc - 1);
        const tickY = BAR_Y + t * BAR_H;
        const targetDec = maxDec - t * range;
        let label = vals[0] ?? def.min; let best = Infinity;
        for (const v of vals) { const d = Math.abs(dateToDecimalYear(v) - targetDec); if (d < best) { best = d; label = v; } }
        ctx.fillRect(L + BAR_W, tickY - 0.5, 4, 1);
        ctx.textBaseline = i === 0 ? 'top' : (i === tc - 1 ? 'bottom' : 'middle');
        ctx.fillText(formatDateLabelISO(label), LABEL_X, tickY);
      }
    } else if (isNumericType(def.dataType)) {
      const BAR_W = 14;
      const BAR_Y = y;
      const BAR_H = Math.max(40, maxY - y);
      const grad  = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      const baseStops = getSequentialPalette(this._paletteOverrides?.get(key));
      const stops = !!this._paletteReverseOverrides?.get(key) ? [...baseStops].reverse() : baseStops;
      const ns = stops.length;
      for (let i = 0; i < ns; i++) grad.addColorStop(i / (ns - 1), stops[ns - 1 - i]);
      ctx.fillStyle = grad;
      ctx.fillRect(L, BAR_Y, BAR_W, BAR_H);
      // Compute effective range from scale mode.
      const _mode = this._scaleModeOverrides?.get(key) ?? '';
      // Prefer live range (computed from visible nodes) over schema bounds.
      const _live = this._liveRanges?.get(key);
      let effMin = _live?.min ?? def.min ?? 0;
      let effMax = _live?.max ?? def.max ?? 1;
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
      const range = effMax - effMin;
      const LABEL_X = L + BAR_W + 6;
      const LABEL_W = W - LABEL_X - R;
      const tc  = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
      const fmt = this._numericFormatter(def, legendN);
      ctx.font = this._font(lfs); ctx.fillStyle = ltc; ctx.textAlign = 'left';
      for (let i = 0; i < tc; i++) {
        const t = i / (tc - 1);
        const tickY = BAR_Y + t * BAR_H;
        ctx.fillRect(L + BAR_W, tickY - 0.5, 4, 1);
        ctx.textBaseline = i === 0 ? 'top' : (i === tc - 1 ? 'bottom' : 'middle');
        ctx.fillText(this._truncateText(ctx, fmt(effMax - t * range), LABEL_W), LABEL_X, tickY);
      }
    }
    return hitRegions;
  }
}
