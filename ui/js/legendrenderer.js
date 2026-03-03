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
 *   setAnnotation(position, key)       — 'left'|'right'|null, annotation key or null
 *   setFontSize(n)                     — label font size in px
 *   setTextColor(color)                — CSS colour string
 *   setBgColor(color, skipBg=false)    — background colour (matches tree canvas)
 *   resize()                           — call after the legend canvas is shown/hidden/resized
 *   draw()                             — explicit repaint
 */
import { getSequentialPalette,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         MISSING_DATA_COLOUR, buildCategoricalColourMap } from './palettes.js';
import { dateToDecimalYear, isNumericType } from './phylograph.js';

export class LegendRenderer {
  /**
   * @param {HTMLCanvasElement} leftCanvas
   * @param {HTMLCanvasElement} rightCanvas
   * @param {HTMLCanvasElement} leftCanvas2  Secondary legend canvas (far-left side).
   * @param {HTMLCanvasElement} rightCanvas2 Secondary legend canvas (far-right side).
   * @param {object}            settings  Must include fontSize, textColor, bgColor.
   */
  constructor(leftCanvas, rightCanvas, leftCanvas2, rightCanvas2, settings) {
    this._leftCanvas   = leftCanvas;
    this._rightCanvas  = rightCanvas;
    this._leftCanvas2  = leftCanvas2  ?? null;
    this._rightCanvas2 = rightCanvas2 ?? null;

    this._position   = null;   // 'left' | 'right' | null
    this._annotation = null;   // annotation key string | null
    this._schema     = null;   // Map<string, AnnotationDef>
    this._paletteOverrides = null; // Map<annotKey, paletteName> from TreeRenderer

    this._annotation2  = null;    // second legend annotation key | null
    this._position2    = 'right'; // 'right' (beside L1) | 'below' (stacked under L1)
    this._heightPct2   = 50;      // legend 2 height as % of canvas-container

    this.skipBg = false;
    this._dpr   = window.devicePixelRatio || 1;
    this._fontFamily = 'monospace';

    // Hit regions for categorical entries: [{value, y0, y1, isLegend2?}]
    this._hitRegions  = [];   // primary canvas (legend1 + legend2-below)
    this._hitRegions2 = [];   // legend2 own canvas ('right' mode)
    /** Callback for legend-1 categorical click: (value) => void */
    this.onCategoryClick  = null;
    /** Callback for legend-2 categorical click: (value) => void */
    this.onCategoryClick2 = null;

    // Wire click + hover listeners on all four canvases.
    for (const [lc, isL2canvas] of [
      [this._leftCanvas,   false], [this._rightCanvas,  false],
      [this._leftCanvas2,  true],  [this._rightCanvas2, true],
    ]) {
      if (!lc) continue;
      lc.addEventListener('click', (e) => {
        const cssY   = e.offsetY;
        const regions = isL2canvas ? this._hitRegions2 : this._hitRegions;
        for (const r of regions) {
          if (cssY >= r.y0 && cssY < r.y1) {
            const cb = r.isLegend2 ? this.onCategoryClick2 : this.onCategoryClick;
            if (cb) cb(r.value);
            return;
          }
        }
      });
      lc.style.cursor = 'default';
      lc.addEventListener('mousemove', (e) => {
        const cssY   = e.offsetY;
        const regions = isL2canvas ? this._hitRegions2 : this._hitRegions;
        const hit    = regions.find(r => cssY >= r.y0 && cssY < r.y1);
        const hasCb  = hit ? (hit.isLegend2 ? !!this.onCategoryClick2 : !!this.onCategoryClick) : false;
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
      for (const lc of [this._leftCanvas, this._rightCanvas,
                        this._leftCanvas2, this._rightCanvas2]) {
        if (lc) lc.style.backgroundColor = s.bgColor;
      }
    }
    if (s.skipBg    != null) this.skipBg     = s.skipBg;
    if (s.padding   != null) this._padding   = s.padding;
    if (s.heightPct  != null) this._heightPct  = s.heightPct;
    if (s.heightPct2 != null) this._heightPct2 = s.heightPct2;
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
   * Set which annotation and which canvas side to use, then draw.
   * Pass position=null to hide the legend entirely.
   * @param {'left'|'right'|null} position
   * @param {string|null}         key
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

  /** @param {string} f — CSS font-family string */
  setFontFamily(f) {
    this._fontFamily = f || 'monospace';
    this.draw();
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
    for (const lc of [this._leftCanvas, this._rightCanvas,
                      this._leftCanvas2, this._rightCanvas2]) {
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
    const pos    = this._position;
    const hasL2  = !!this._annotation2;
    const below  = hasL2 && this._position2 === 'below';
    const active = pos === 'left' ? this._leftCanvas : pos === 'right' ? this._rightCanvas : null;

    for (const lc of [this._leftCanvas, this._rightCanvas]) {
      if (!lc || lc.style.display === 'none') continue;
      const LW = lc.clientWidth;
      const LH = (lc === active && below)
        ? this._computeStackedHeights(lc).total
        : this._computeHeight(lc);
      lc.style.height = LH + 'px';
      lc.width  = LW * this._dpr;
      lc.height = LH * this._dpr;
      lc.getContext('2d').setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    }

    // Legend-2 side canvases — only used in 'right' (beside) mode.
    if (hasL2 && !below) {
      for (const lc of [this._leftCanvas2, this._rightCanvas2]) {
        if (!lc || lc.style.display === 'none') continue;
        const LW = lc.clientWidth;
        const LH = this._computeHeight2(lc);
        lc.style.height = LH + 'px';
        lc.width  = LW * this._dpr;
        lc.height = LH * this._dpr;
        lc.getContext('2d').setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
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

  /**
   * For the 'below' stacked layout: compute h1, h2, and total canvas height.
   * • pct1 + pct2 < 100 → independent percentages; total = h1 + h2.
   * • pct1 + pct2 ≥ 100 → proportional share of full height; total = containerH.
   */
  _computeStackedHeights(lc) {
    const containerH = lc.parentElement?.clientHeight ?? lc.clientHeight ?? 0;
    if (!containerH) return { total: lc.clientHeight || 0, h1: lc.clientHeight || 0, h2: 0 };
    const pct1 = Math.max(1, this._heightPct);
    const pct2 = Math.max(1, this._heightPct2);
    if (pct1 + pct2 < 100) {
      const h1 = Math.round(containerH * pct1 / 100);
      const h2 = Math.round(containerH * pct2 / 100);
      return { total: h1 + h2, h1, h2 };
    }
    const h1 = Math.round(containerH * pct1 / (pct1 + pct2));
    return { total: containerH, h1, h2: containerH - h1 };
  }

  /**
   * Measure the minimum canvas width (CSS px) for any annotation key.
   * @param {string|null} key
   * @returns {number}
   */
  _measureWidthForKey(key) {
    const def = key && this._schema?.get(key);
    if (!def) return 120;

    const PAD   = this._padding ?? 12;
    const lfs   = this.fontSize  ?? 11;
    const FONT  = this._fontFamily ?? 'monospace';
    const mc  = document.createElement('canvas');
    const ctx = mc.getContext('2d');
    const measure = (text, bold = false) => {
      ctx.font = `${bold ? '700 ' : ''}${lfs}px ${FONT}`;
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
    return Math.ceil(PAD + contentW + PAD);
  }

  /** Minimum canvas width for legend 1. */
  measureWidth()  { return this._measureWidthForKey(this._annotation); }

  /** Minimum canvas width for legend 2. */
  measureWidth2() { return this._measureWidthForKey(this._annotation2); }

  /**
   * Paint the colour legend(s) onto the canvas(es).
   * Safe to call at any time; exits early when nothing is configured.
   */
  draw() {
    const pos  = this._position;
    const key  = this._annotation;
    const key2 = this._annotation2;
    const lcL  = this._leftCanvas;
    const lcR  = this._rightCanvas;

    // Clear all visible canvases.
    for (const lc of [lcL, lcR, this._leftCanvas2, this._rightCanvas2]) {
      if (!lc || lc.style.display === 'none') continue;
      lc.getContext('2d').clearRect(0, 0, lc.width, lc.height);
    }

    const activeCanvas = pos === 'left' ? lcL : pos === 'right' ? lcR : null;
    if (!activeCanvas || activeCanvas.style.display === 'none') return;
    if (!key || !this._schema) return;

    const dpr = this._dpr;
    const W   = activeCanvas.width / dpr;
    const ctx = activeCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const below = !!key2 && this._position2 === 'below';
    let h1 = activeCanvas.height / dpr;
    let h2 = 0;
    if (below && key2) {
      const s = this._computeStackedHeights(activeCanvas);
      h1 = s.h1;  h2 = s.h2;
    }

    // Draw legend 1.
    this._hitRegions = this._drawContent(ctx, W, h1, key, 0);

    // Draw legend 2 — stacked below (shared canvas).
    this._hitRegions2 = [];
    if (below && key2 && h2 > 0) {
      // Thin separator line.
      ctx.fillStyle = (this.textColor ?? '#ffffff') + '44';
      ctx.fillRect(0, h1, W, 1);
      const regs2 = this._drawContent(ctx, W, h2, key2, h1);
      this._hitRegions2 = regs2.map(r => ({ ...r, isLegend2: true }));
      // Merge into primary so the single click handler on the main canvas works.
      for (const r of this._hitRegions2) this._hitRegions.push(r);
    }

    // Draw legend 2 — beside (own canvas).
    if (!below && key2) {
      const lc2 = pos === 'left' ? this._leftCanvas2 : this._rightCanvas2;
      if (lc2 && lc2.style.display !== 'none') {
        const ctx2 = lc2.getContext('2d');
        ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._hitRegions2 = this._drawContent(ctx2, lc2.width / dpr, lc2.height / dpr, key2, 0)
                                .map(r => ({ ...r, isLegend2: true }));
      }
    }
  }

  /**
   * Draw one legend's content into `ctx` within the CSS-pixel rect
   * [0, offsetY .. offsetY+H, W].  Returns hit regions with y values
   * relative to the canvas origin (already include offsetY).
   * @private
   */
  _drawContent(ctx, W, H, key, offsetY) {
    const hitRegions = [];
    if (!key || !this._schema) return hitRegions;
    const def = this._schema.get(key);
    if (!def) return hitRegions;

    const PAD  = this._padding ?? 12;
    const FONT = this._fontFamily ?? 'monospace';
    const lfs  = this.fontSize;
    const ltc  = this.textColor;
    const maxY = offsetY + H - PAD;

    if (!this.skipBg) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, offsetY, W, H);
    }

    let y = offsetY + PAD;

    // Title.
    ctx.font = `700 ${lfs}px ${FONT}`; ctx.fillStyle = ltc;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(key, PAD, y, W - PAD * 2);
    y += lfs + 10;

    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const paletteName = this._paletteOverrides?.get(key);
      const colourMap   = buildCategoricalColourMap(def.values || [], paletteName);
      const SWATCH = Math.max(8, lfs);
      const ROW_H  = Math.max(SWATCH + 4, lfs + 4);
      ctx.font = `${lfs}px ${FONT}`; ctx.textBaseline = 'middle';
      (def.values || []).forEach((val) => {
        if (y + SWATCH > maxY) return;
        ctx.fillStyle = colourMap.get(val) ?? MISSING_DATA_COLOUR;
        ctx.fillRect(PAD, y, SWATCH, SWATCH);
        ctx.fillStyle = ltc; ctx.textAlign = 'left';
        ctx.fillText(String(val), PAD + SWATCH + 6, y + SWATCH / 2, W - PAD * 2 - SWATCH - 6);
        hitRegions.push({ value: val, y0: y, y1: y + ROW_H });
        y += ROW_H;
      });
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
      ctx.font = `${lfs}px ${FONT}`; ctx.fillStyle = ltc; ctx.textAlign = 'left';
      for (let i = 0; i < tc; i++) {
        const t = i / (tc - 1);
        const tickY = BAR_Y + t * BAR_H;
        const targetDec = maxDec - t * range;
        let label = vals[0] ?? def.min; let best = Infinity;
        for (const v of vals) { const d = Math.abs(dateToDecimalYear(v) - targetDec); if (d < best) { best = d; label = v; } }
        ctx.fillRect(PAD + BAR_W, tickY - 0.5, 4, 1);
        ctx.textBaseline = i === 0 ? 'top' : (i === tc - 1 ? 'bottom' : 'middle');
        ctx.fillText(label, LABEL_X, tickY, LABEL_W);
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
      const min = def.min ?? 0; const max = def.max ?? 1; const range = max - min;
      const LABEL_X = PAD + BAR_W + 6;
      const LABEL_W = W - LABEL_X - PAD;
      const tc  = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
      const fmt = def.fmt ?? (v => String(v));
      ctx.font = `${lfs}px ${FONT}`; ctx.fillStyle = ltc; ctx.textAlign = 'left';
      for (let i = 0; i < tc; i++) {
        const t = i / (tc - 1);
        const tickY = BAR_Y + t * BAR_H;
        ctx.fillRect(PAD + BAR_W, tickY - 0.5, 4, 1);
        ctx.textBaseline = i === 0 ? 'top' : (i === tc - 1 ? 'bottom' : 'middle');
        ctx.fillText(fmt(max - t * range), LABEL_X, tickY, LABEL_W);
      }
    }
    return hitRegions;
  }
}
