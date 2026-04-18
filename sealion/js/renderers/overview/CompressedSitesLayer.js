// renderers/overview/CompressedSitesLayer.js
//
// Overview layer: draws a thin vertical line for every masked/compressed
// alignment column.  No background — just 1px tick marks.

export class CompressedSitesLayer {
  constructor() {
    this.enabled = true;
    this.label   = 'Compressed sites';
  }

  /**
   * Render into an off-screen cache context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} p  — shared params built by OverviewRenderer._buildParams()
   */
  render(ctx, p) {
    if (!this.enabled) return;
    const v = p.viewer;

    const { scale, barY, barH,
            colOffsets, maxSeqLen, charWidth, expandedRightPad,
            maskStr, maskEnabled } = p;

    if (!maskEnabled || !maskStr) return;

    const lineColor = v.OVERVIEW_COMPRESSED_COL || 'rgba(90,160,200,0.8)';

    ctx.save();
    ctx.fillStyle = lineColor;

    for (let c = 0; c < maxSeqLen; c++) {
      if (maskStr.charAt(c) !== '0') continue;
      const left  = colOffsets[c]     != null ? colOffsets[c]     : (c * (charWidth + expandedRightPad));
      const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
      const cx = Math.round((left + right) * 0.5 * scale);
      ctx.fillRect(cx, barY, 1, barH);
    }

    ctx.restore();
  }

  cacheKey(p) {
    return `cs:${p.maxSeqLen}:${p.maskEnabled}:${p.maskStr}`;
  }
}
