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
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         MISSING_DATA_COLOUR, buildCategoricalColourMap } from '@artic-network/pearcore/palettes.js';
import { dateToDecimalYear, isNumericType } from './phylograph.js';
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

    this._annotation2  = null;    // second legend annotation key | null
    this._position2    = 'right'; // 'right' (beside L1) | 'below' (stacked under L1)
    this._heightPct2   = 50;      // legend 2 height as % of canvas-container
    this._annotation3  = null;    // third legend annotation key | null
    this._position3    = 'right'; // 'right' (beside) | 'below' (stacked)
    this._heightPct3   = 50;      // legend 3 height as % of canvas-container
    this._annotation4  = null;    // fourth legend annotation key | null
    this._position4    = 'right'; // 'right' (beside) | 'below' (stacked)
    this._heightPct4   = 50;      // legend 4 height as % of canvas-container

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

    this._padding    = 12;   // internal pad around legend content (px)
    this._heightPct  = 100;  // legend 1 height as % of the canvas-container (1–100)

    this.setSettings(settings, /*redraw*/ false);
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Apply rendering settings.  Recognised keys: fontSize (number), textColor (string),
   * bgColor (string), skipBg (boolean), padding (number).
   * @param {object}  s
   * @param {boolean} redraw  When true (default) triggers a repaint.
   */
  setSettings(s, redraw = true) {
    if (s.fontSize   != null) this.fontSize   = s.fontSize;
    if (s.textColor  != null) this.textColor  = s.textColor;
    if (s.bgColor    != null) {
      this.bgColor = s.bgColor;
      for (const lc of [this._rightCanvas,
                        this._rightCanvas2,
                        this._rightCanvas3,
                        this._rightCanvas4]) {
        if (lc) lc.style.backgroundColor = s.bgColor;
      }
    }
    if (s.skipBg    != null) this.skipBg     = s.skipBg;
    if (s.padding   != null) this._padding   = s.padding;
    if (s.heightPct  != null) this._heightPct  = s.heightPct;
    if (s.heightPct2 != null) this._heightPct2 = s.heightPct2;
    if (s.heightPct3 != null) this._heightPct3 = s.heightPct3;
    if (s.heightPct4 != null) this._heightPct4 = s.heightPct4;
    if (redraw) this.draw();
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
   * Update the background colour.  Also sets the CSS backgroundColor of both
   * legend canvases so there is no bleed-through around the drawn content.
   * @param {string}  color
   * @param {boolean} skipBg — when true the background rect is not painted
   *                           (matches TreeRenderer._skipBg for Tauri captures)
   */
  setBgColor(color, skipBg = false) {
    this.bgColor = color;
    this.skipBg  = skipBg;
    for (const lc of [this._rightCanvas,
                      this._rightCanvas2,
                      this._rightCanvas3,
                      this._rightCanvas4]) {
      if (lc) lc.style.backgroundColor = color;
    }
    this.draw();
  }

  /**
   * Sync the physical canvas dimensions to the current CSS dimensions and DPR,
   * then repaint.  Called automatically by TreeRenderer._resize().
   */
  resize() {
    this._dpr = window.devicePixelRatio || 1;
    const below2 = !!this._annotation2 && this._position2 === 'below';
    const below3 = !!this._annotation3 && this._position3 === 'below';
    const below4 = !!this._annotation4 && this._position4 === 'below';
    const hasAnyBelow = below2 || below3 || below4;
    const active = this._position === 'right' ? this._rightCanvas : null;

    if (active && active.style.display !== 'none') {
      const lc = active;
      const LW = lc.clientWidth;
      const LH = (hasAnyBelow)
        ? this._computeStackedHeights(lc).total
        : this._computeHeight(lc);
      lc.style.height = LH + 'px';
      lc.width  = LW * this._dpr;
      lc.height = LH * this._dpr;
      lc.getContext('2d').setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    }

    // Side canvases for legends 2, 3, 4.
    for (const [hasL, notBelow, rc, computeH] of [
      [!!this._annotation2, !below2, this._rightCanvas2, lc => this._computeHeight2(lc)],
      [!!this._annotation3, !below3, this._rightCanvas3, lc => this._computeHeight3(lc)],
      [!!this._annotation4, !below4, this._rightCanvas4, lc => this._computeHeight4(lc)],
    ]) {
      if (hasL && notBelow && rc && rc.style.display !== 'none') {
        const LW = rc.clientWidth;
        const LH = computeH(rc);
        rc.style.height = LH + 'px';
        rc.width  = LW * this._dpr;
        rc.height = LH * this._dpr;
        rc.getContext('2d').setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
      }
    }
    this.draw();
  }

  /** Legend-1 canvas height in CSS px. */
  _computeHeight(lc) {
    const containerH = lc.parentElement?.clientHeight ?? lc.clientHeight ?? 0;
    if (!containerH) return lc.clientHeight || 0;
    return Math.round(containerH * Math.min(this._heightPct, 100) / 100);
  }

  /** Legend-2 side-canvas height in CSS px. */
  _computeHeight2(lc) {
    const containerH = lc.parentElement?.clientHeight ?? lc.clientHeight ?? 0;
    if (!containerH) return lc.clientHeight || 0;
    return Math.round(containerH * Math.min(this._heightPct2, 100) / 100);
  }

  /** Legend-3 side-canvas height in CSS px. */
  _computeHeight3(lc) {
    const containerH = lc.parentElement?.clientHeight ?? lc.clientHeight ?? 0;
    if (!containerH) return lc.clientHeight || 0;
    return Math.round(containerH * Math.min(this._heightPct3, 100) / 100);
  }

  /** Legend-4 side-canvas height in CSS px. */
  _computeHeight4(lc) {
    const containerH = lc.parentElement?.clientHeight ?? lc.clientHeight ?? 0;
    if (!containerH) return lc.clientHeight || 0;
    return Math.round(containerH * Math.min(this._heightPct4, 100) / 100);
  }

  /**
   * For the 'below' stacked layout: compute heights for all stacked legends.
   * Legends whose position is not 'below' contribute 0.
   * • sum of active pcts < 100 → independent percentages.
   * • sum of active pcts ≥ 100 → proportional share of full height.
   * Returns {total, h1, h2, h3, h4}.
   */
  _computeStackedHeights(lc) {
    const containerH = lc.parentElement?.clientHeight ?? lc.clientHeight ?? 0;
    if (!containerH) return { total: lc.clientHeight || 0, h1: lc.clientHeight || 0, h2: 0, h3: 0, h4: 0 };
    const pct1 = Math.max(1, this._heightPct);
    const pct2 = (!!this._annotation2 && this._position2 === 'below') ? Math.max(1, this._heightPct2) : 0;
    const pct3 = (!!this._annotation3 && this._position3 === 'below') ? Math.max(1, this._heightPct3) : 0;
    const pct4 = (!!this._annotation4 && this._position4 === 'below') ? Math.max(1, this._heightPct4) : 0;
    const sumPct = pct1 + pct2 + pct3 + pct4;
    let h1, h2, h3, h4;
    if (sumPct < 100) {
      h1 = Math.round(containerH * pct1 / 100);
      h2 = Math.round(containerH * pct2 / 100);
      h3 = Math.round(containerH * pct3 / 100);
      h4 = Math.round(containerH * pct4 / 100);
      return { total: h1 + h2 + h3 + h4, h1, h2, h3, h4 };
    }
    h1 = Math.round(containerH * pct1 / sumPct);
    h2 = Math.round(containerH * pct2 / sumPct);
    h3 = Math.round(containerH * pct3 / sumPct);
    h4 = containerH - h1 - h2 - h3;  // absorb rounding remainder
    return { total: containerH, h1, h2, h3, h4 };
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
  _measureWidthForKey(key) {
    const def = key && this._schema?.get(key);
    if (!def) return 120;

    const PAD   = this._padding ?? 12;
    const lfs   = this.fontSize  ?? 11;
    const mc  = document.createElement('canvas');
    const ctx = mc.getContext('2d');
    const measure = (text, bold = false) => {
      ctx.font = bold ? `700 ${lfs}px ${this._fontFamily ?? 'monospace'}` : this._font(lfs);
      return ctx.measureText(text).width;
    };

    let contentW = measure(key, true);
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
          contentW = Math.max(contentW, BAR_W + 6 + measure(String(vals[i])));
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
    return Math.min(LegendRenderer.MAX_LEGEND_W, Math.ceil(PAD + contentW + PAD));
  }

  /** Minimum canvas width for legend 1. */
  measureWidth()  { return this._measureWidthForKey(this._annotation); }

  /** Minimum canvas width for legend 2. */
  measureWidth2() { return this._measureWidthForKey(this._annotation2); }

  /** Minimum canvas width for legend 3. */
  measureWidth3() { return this._measureWidthForKey(this._annotation3); }

  /** Minimum canvas width for legend 4. */
  measureWidth4() { return this._measureWidthForKey(this._annotation4); }

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
    const W   = activeCanvas.width / dpr;
    const ctx = activeCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const below2 = !!key2 && this._position2 === 'below';
    const below3 = !!key3 && this._position3 === 'below';
    const below4 = !!key4 && this._position4 === 'below';
    const hasAnyBelow = below2 || below3 || below4;
    let h1 = activeCanvas.height / dpr;
    let h2 = 0, h3 = 0, h4 = 0;
    if (hasAnyBelow) {
      const s = this._computeStackedHeights(activeCanvas);
      h1 = s.h1; h2 = s.h2; h3 = s.h3; h4 = s.h4;
    }

    // Draw legend 1.
    this._hitRegions = this._drawContent(ctx, W, h1, key, 0, this._selectedValues1);

    // Draw legend 2 — stacked below (shared canvas).
    this._hitRegions2 = [];
    if (below2 && key2 && h2 > 0) {
      ctx.fillStyle = (this.textColor ?? '#ffffff') + '44';
      ctx.fillRect(0, h1, W, 1);
      const regs2 = this._drawContent(ctx, W, h2, key2, h1, this._selectedValues2);
      this._hitRegions2 = regs2.map(r => ({ ...r, isLegend2: true }));
      for (const r of this._hitRegions2) this._hitRegions.push(r);
    }

    // Draw legend 3 — stacked below (shared canvas).
    this._hitRegions3 = [];
    if (below3 && key3 && h3 > 0) {
      const offset3 = h1 + h2;
      ctx.fillStyle = (this.textColor ?? '#ffffff') + '44';
      ctx.fillRect(0, offset3, W, 1);
      const regs3 = this._drawContent(ctx, W, h3, key3, offset3, this._selectedValues3);
      this._hitRegions3 = regs3.map(r => ({ ...r, isLegend3: true }));
      for (const r of this._hitRegions3) this._hitRegions.push(r);
    }

    // Draw legend 4 — stacked below (shared canvas).
    this._hitRegions4 = [];
    if (below4 && key4 && h4 > 0) {
      const offset4 = h1 + h2 + h3;
      ctx.fillStyle = (this.textColor ?? '#ffffff') + '44';
      ctx.fillRect(0, offset4, W, 1);
      const regs4 = this._drawContent(ctx, W, h4, key4, offset4, this._selectedValues4);
      this._hitRegions4 = regs4.map(r => ({ ...r, isLegend4: true }));
      for (const r of this._hitRegions4) this._hitRegions.push(r);
    }

    // Draw legends 2, 3, 4 — beside (own canvases).
    for (const [notBelow, k, rc, regsProp, flag, selVals] of [
      [!below2, key2, this._rightCanvas2, '_hitRegions2', 'isLegend2', this._selectedValues2],
      [!below3, key3, this._rightCanvas3, '_hitRegions3', 'isLegend3', this._selectedValues3],
      [!below4, key4, this._rightCanvas4, '_hitRegions4', 'isLegend4', this._selectedValues4],
    ]) {
      if (notBelow && k) {
        if (rc && rc.style.display !== 'none') {
          const ctx2 = rc.getContext('2d');
          ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
          this[regsProp] = this._drawContent(ctx2, rc.width / dpr, rc.height / dpr, k, 0, selVals)
                               .map(r => ({ ...r, [flag]: true }));
        }
      }
    }
  }

  /**
   * Draw one legend's content into `ctx` within the CSS-pixel rect
   * [0, offsetY .. offsetY+H, W].  Returns hit regions with y values
   * relative to the canvas origin (already include offsetY).
   * @private
   */
  _drawContent(ctx, W, H, key, offsetY, selectedValues = null) {
    const hitRegions = [];
    if (!key || !this._schema) return hitRegions;
    const def = this._schema.get(key);
    if (!def) return hitRegions;

    const PAD  = this._padding ?? 12;
    const lfs  = this.fontSize;
    const ltc  = this.textColor;
    const maxY = offsetY + H - PAD;

    if (!this.skipBg) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, offsetY, W, H);
    }

    let y = offsetY + PAD;

    // Title.
    ctx.font = `700 ${lfs}px ${this._fontFamily ?? 'monospace'}`; ctx.fillStyle = ltc;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(this._truncateText(ctx, def.label ?? key, W - PAD * 2), PAD, y);
    y += lfs + 10;

    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const paletteName = this._paletteOverrides?.get(key);
      const colourMap   = buildCategoricalColourMap(def.values || [], paletteName);
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
        ctx.fillRect(PAD, y, effectiveSwatch, effectiveSwatch);
        // Border on swatch for selected rows.
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = this._selStrokeColor;
          ctx.lineWidth   = 2;
          ctx.strokeRect(PAD + 1, y + 1, effectiveSwatch - 2, effectiveSwatch - 2);
          ctx.restore();
        }
        ctx.fillStyle = isSelected ? this._selStrokeColor : ltc;
        ctx.textAlign = 'left';
        const _labelAvail = W - PAD * 2 - effectiveSwatch - 6;
        ctx.fillText(this._truncateText(ctx, String(val), _labelAvail), PAD + effectiveSwatch + 6, y + effectiveSwatch / 2);
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
        ctx.fillText('…', PAD, maxY + PAD);
        ctx.restore();
      }
    } else if (def.dataType === 'date') {
      const BAR_W = 14;
      const BAR_Y = y;
      const BAR_H = Math.max(40, maxY - y);
      const grad  = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      const stops = getSequentialPalette(this._paletteOverrides?.get(key));
      const ns = stops.length;
      for (let i = 0; i < ns; i++) grad.addColorStop(i / (ns - 1), stops[ns - 1 - i]);
      ctx.fillStyle = grad;
      ctx.fillRect(PAD, BAR_Y, BAR_W, BAR_H);
      const LABEL_X = PAD + BAR_W + 6;
      const LABEL_W = W - LABEL_X - PAD;
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
        ctx.fillRect(PAD + BAR_W, tickY - 0.5, 4, 1);
        ctx.textBaseline = i === 0 ? 'top' : (i === tc - 1 ? 'bottom' : 'middle');
        ctx.fillText(this._truncateText(ctx, label, LABEL_W), LABEL_X, tickY);
      }
    } else if (isNumericType(def.dataType)) {
      const BAR_W = 14;
      const BAR_Y = y;
      const BAR_H = Math.max(40, maxY - y);
      const grad  = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      const stops = getSequentialPalette(this._paletteOverrides?.get(key));
      const ns = stops.length;
      for (let i = 0; i < ns; i++) grad.addColorStop(i / (ns - 1), stops[ns - 1 - i]);
      ctx.fillStyle = grad;
      ctx.fillRect(PAD, BAR_Y, BAR_W, BAR_H);
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
      const LABEL_X = PAD + BAR_W + 6;
      const LABEL_W = W - LABEL_X - PAD;
      const tc  = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
      const fmt = def.fmt ?? (v => String(v));
      ctx.font = this._font(lfs); ctx.fillStyle = ltc; ctx.textAlign = 'left';
      for (let i = 0; i < tc; i++) {
        const t = i / (tc - 1);
        const tickY = BAR_Y + t * BAR_H;
        ctx.fillRect(PAD + BAR_W, tickY - 0.5, 4, 1);
        ctx.textBaseline = i === 0 ? 'top' : (i === tc - 1 ? 'bottom' : 'middle');
        ctx.fillText(this._truncateText(ctx, fmt(effMax - t * range), LABEL_W), LABEL_X, tickY);
      }
    }
    return hitRegions;
  }
}
