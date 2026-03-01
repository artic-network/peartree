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
   * @param {object}            settings  Must include fontSize, textColor, bgColor (all required).
   */
  constructor(leftCanvas, rightCanvas, settings) {
    this._leftCanvas  = leftCanvas;
    this._rightCanvas = rightCanvas;

    this._position   = null;   // 'left' | 'right' | null
    this._annotation = null;   // annotation key string | null
    this._schema     = null;   // Map<string, AnnotationDef>
    this._paletteOverrides = null; // Map<annotKey, paletteName> from TreeRenderer

    this.skipBg = false;
    this._dpr   = window.devicePixelRatio || 1;
    this._fontFamily = 'monospace';

    // Hit regions for categorical legend entries: [{value, y0, y1}]
    this._hitRegions = [];
    /** Callback invoked when a categorical legend entry is clicked: (value) => void */
    this.onCategoryClick = null;

    // Wire click listeners on both canvases once, here in the constructor.
    for (const lc of [this._leftCanvas, this._rightCanvas]) {
      if (!lc) continue;
      lc.addEventListener('click', (e) => {
        if (!this.onCategoryClick || !this._hitRegions.length) return;
        // e.offsetY is in CSS pixels relative to the canvas element
        const cssY = e.offsetY;
        for (const r of this._hitRegions) {
          if (cssY >= r.y0 && cssY < r.y1) {
            this.onCategoryClick(r.value);
            return;
          }
        }
      });
      lc.style.cursor = 'default'; // updated dynamically per mousemove below
      lc.addEventListener('mousemove', (e) => {
        const cssY = e.offsetY;
        const hit = this._hitRegions.some(r => cssY >= r.y0 && cssY < r.y1);
        lc.style.cursor = (hit && this.onCategoryClick) ? 'pointer' : 'default';
      });
      lc.addEventListener('mouseleave', () => { lc.style.cursor = 'default'; });
    }

    this.setSettings(settings, /*redraw*/ false);
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Apply rendering settings.  Recognised keys: fontSize (number), textColor (string),
   * bgColor (string), skipBg (boolean).
   * @param {object}  s
   * @param {boolean} redraw  When true (default) triggers a repaint.
   */
  setSettings(s, redraw = true) {
    if (s.fontSize  != null) this.fontSize  = s.fontSize;
    if (s.textColor != null) this.textColor = s.textColor;
    if (s.bgColor   != null) {
      this.bgColor = s.bgColor;
      for (const lc of [this._leftCanvas, this._rightCanvas]) {
        if (lc) lc.style.backgroundColor = s.bgColor;
      }
    }
    if (s.skipBg != null) this.skipBg = s.skipBg;
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
    for (const lc of [this._leftCanvas, this._rightCanvas]) {
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
    for (const lc of [this._leftCanvas, this._rightCanvas]) {
      if (!lc || lc.style.display === 'none') continue;
      const LW = lc.clientWidth;
      const LH = lc.clientHeight || (lc.parentElement?.clientHeight ?? 0);
      lc.style.height = LH + 'px';
      lc.width  = LW * this._dpr;
      lc.height = LH * this._dpr;
      lc.getContext('2d').setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    }
    this.draw();
  }

  /**
   * Paint the colour legend onto the active legend canvas.
   * Safe to call at any time; exits early when nothing is configured.
   */
  draw() {
    const pos = this._position;
    const key = this._annotation;
    const lcL = this._leftCanvas;
    const lcR = this._rightCanvas;

    // Clear the inactive canvas (avoids stale content after a position change).
    for (const lc of [lcL, lcR]) {
      if (!lc || lc.style.display === 'none') continue;
      const ic = lc.getContext('2d');
      ic.clearRect(0, 0, lc.width, lc.height);
    }

    const activeCanvas = pos === 'left' ? lcL : pos === 'right' ? lcR : null;
    if (!activeCanvas || activeCanvas.style.display === 'none') return;
    if (!key || !this._schema) return;
    const def = this._schema.get(key);
    if (!def) return;

    const dpr = this._dpr;
    const W   = activeCanvas.width  / dpr;
    const H   = activeCanvas.height / dpr;
    const ctx = activeCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background — match the tree canvas.
    if (!this.skipBg) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, W, H);
    }

    // Reset hit regions for this draw.
    this._hitRegions = [];

    const PAD  = 12;
    const FONT = this._fontFamily ?? 'monospace';
    let   y    = PAD;

    const lfs = this.fontSize;
    const ltc = this.textColor;

    // Title — the annotation key name.
    ctx.font         = `700 ${lfs}px ${FONT}`;
    ctx.fillStyle    = ltc;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(key, PAD, y, W - PAD * 2);
    y += lfs + 10;

    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const paletteName = this._paletteOverrides?.get(key);
      const colourMap  = buildCategoricalColourMap(def.values || [], paletteName);
      const SWATCH = Math.max(8, lfs);
      const ROW_H  = Math.max(SWATCH + 4, lfs + 4);
      ctx.font         = `${lfs}px ${FONT}`;
      ctx.textBaseline = 'middle';
      (def.values || []).forEach((val) => {
        if (y + SWATCH > H - PAD) return;   // no space left
        const colour = colourMap.get(val) ?? MISSING_DATA_COLOUR;
        ctx.fillStyle = colour;
        ctx.fillRect(PAD, y, SWATCH, SWATCH);
        ctx.fillStyle = ltc;
        ctx.textAlign = 'left';
        ctx.fillText(String(val), PAD + SWATCH + 6, y + SWATCH / 2, W - PAD * 2 - SWATCH - 6);
        // Record hit region (CSS pixels — divide by dpr since we set the transform)
        this._hitRegions.push({ value: val, y0: y, y1: y + ROW_H });
        y += ROW_H;
      });
    } else if (def.dataType === 'date') {
      // Render as a sequential gradient bar with date-string tick labels.
      const BAR_W  = 14;
      const BAR_X  = PAD;
      const BAR_Y  = y;
      const BAR_H  = Math.max(40, H - y - PAD);
      const grad   = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      const seqStops = getSequentialPalette(this._paletteOverrides?.get(key));
      const ns = seqStops.length;
      for (let i = 0; i < ns; i++) grad.addColorStop(i / (ns - 1), seqStops[ns - 1 - i]);
      ctx.fillStyle = grad;
      ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

      const LABEL_X   = BAR_X + BAR_W + 6;
      const LABEL_W   = W - LABEL_X - PAD;
      const tickCount = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
      const vals    = def.values || [];
      const minDec  = dateToDecimalYear(def.min);
      const maxDec  = dateToDecimalYear(def.max);
      const range   = maxDec - minDec || 1;
      ctx.font         = `${lfs}px ${FONT}`;
      ctx.fillStyle    = ltc;
      ctx.textAlign    = 'left';
      for (let i = 0; i < tickCount; i++) {
        const t         = i / (tickCount - 1);   // 0 = top (max) → 1 = bottom (min)
        const tickY     = BAR_Y + t * BAR_H;
        const targetDec = maxDec - t * range;
        // Pick the date string from def.values closest to this decimal-year position.
        let label = vals[0] ?? def.min;
        let bestDist = Infinity;
        for (const v of vals) {
          const dist = Math.abs(dateToDecimalYear(v) - targetDec);
          if (dist < bestDist) { bestDist = dist; label = v; }
        }
        ctx.fillStyle    = ltc;
        ctx.fillRect(BAR_X + BAR_W, tickY - 0.5, 4, 1);
        ctx.textBaseline = i === 0 ? 'top' : (i === tickCount - 1 ? 'bottom' : 'middle');
        ctx.fillText(label, LABEL_X, tickY, LABEL_W);
      }
    } else if (isNumericType(def.dataType)) {
      const BAR_W  = 14;
      const BAR_X  = PAD;
      const BAR_Y  = y;
      const BAR_H  = Math.max(40, H - y - PAD);
      // Vertical gradient: top = max (red), bottom = min (teal).
      const grad   = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      const seqStops = getSequentialPalette(this._paletteOverrides?.get(key));
      const ns = seqStops.length;
      // Vertical gradient: top = max (last stop), bottom = min (first stop).
      for (let i = 0; i < ns; i++) {
        grad.addColorStop(i / (ns - 1), seqStops[ns - 1 - i]);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

      const min    = def.min ?? 0;
      const max    = def.max ?? 1;
      const range  = max - min;
      const LABEL_X = BAR_X + BAR_W + 6;
      const LABEL_W = W - LABEL_X - PAD;

      // Draw tick labels: as many as fit, spread evenly.
      const tickCount = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));

      // Use the pre-computed formatter attached to the annotation def by buildAnnotationSchema.
      // Falls back to String() for any type not covered.
      const fmt = def.fmt ?? (v => String(v));

      ctx.font         = `${lfs}px ${FONT}`;
      ctx.fillStyle    = ltc;
      ctx.textAlign    = 'left';
      for (let i = 0; i < tickCount; i++) {
        const t     = i / (tickCount - 1);   // 0 = top (max) → 1 = bottom (min)
        const val   = max - t * range;
        const tickY = BAR_Y + t * BAR_H;
        // Tick mark
        ctx.fillStyle = ltc;
        ctx.fillRect(BAR_X + BAR_W, tickY - 0.5, 4, 1);
        // Label — baseline anchors top/bottom at extremes, middle otherwise
        ctx.textBaseline = i === 0 ? 'top' : (i === tickCount - 1 ? 'bottom' : 'middle');
        ctx.fillText(fmt(val), LABEL_X, tickY, LABEL_W);
      }
    }
  }
}
