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
export class LegendRenderer {
  /**
   * @param {HTMLCanvasElement} leftCanvas
   * @param {HTMLCanvasElement} rightCanvas
   */
  constructor(leftCanvas, rightCanvas) {
    this._leftCanvas  = leftCanvas;
    this._rightCanvas = rightCanvas;

    this._position   = null;   // 'left' | 'right' | null
    this._annotation = null;   // annotation key string | null
    this._schema     = null;   // Map<string, AnnotationDef>

    this.fontSize  = 11;
    this.textColor = '#f7eeca';
    this.bgColor   = '#002b36';
    this.skipBg    = false;

    this._dpr = window.devicePixelRatio || 1;
  }

  // ── Public API ─────────────────────────────────────────────────────────

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

    const PAD  = 12;
    const FONT = 'monospace';
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

      const min    = def.min ?? 0;
      const max    = def.max ?? 1;
      const range  = max - min;
      const LABEL_X = BAR_X + BAR_W + 6;
      const LABEL_W = W - LABEL_X - PAD;

      // Draw tick labels: as many as fit, spread evenly.
      const tickCount = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
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
        const label  = def.dataType === 'integer'
          ? String(Math.round(val))
          : (Number.isInteger(range) ? String(Math.round(val)) : val.toPrecision(3));
        ctx.fillText(label, LABEL_X, tickY, LABEL_W);
      }
    }
  }
}
