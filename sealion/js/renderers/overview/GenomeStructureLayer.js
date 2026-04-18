// renderers/overview/GenomeStructureLayer.js
//
// Overview layer: CDS feature bars drawn at 1/3-height stacked rows per frame.
// Also tracks hit regions for tooltip + dblclick CDS-range selection.

export class GenomeStructureLayer {
  constructor() {
    this.enabled      = true;
    this.label        = 'Genome structure';
    this._cdsHitRegions = [];
  }

  /** Rebuilt hit regions (populated during render). */
  get cdsHitRegions() { return this._cdsHitRegions; }

  /**
   * Render into an off-screen cache context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} p  — shared params built by OverviewRenderer._buildParams()
   */
  render(ctx, p) {
    this._cdsHitRegions = [];
    if (!this.enabled) return;

    const { refGenomeCDS, cssW, cssH, scale, barY, barH,
            colOffsets, maxSeqLen, charWidth, expandedRightPad } = p;
    const v = p.viewer;

    if (!refGenomeCDS || refGenomeCDS.length === 0) return;

    const frameColors = v.CDS_FRAME_COLORS
      || (v.constructor.DEFAULTS && v.constructor.DEFAULTS.CDS_FRAME_COLORS);
    const rowHeight   = Math.max(2, barH / 3);
    const fillAlpha   = v.CDS_FILL_ALPHA   != null ? v.CDS_FILL_ALPHA
      : (v.constructor.DEFAULTS && v.constructor.DEFAULTS.CDS_FILL_ALPHA)   ?? 0.7;
    const borderAlpha = v.CDS_BORDER_ALPHA != null ? v.CDS_BORDER_ALPHA
      : (v.constructor.DEFAULTS && v.constructor.DEFAULTS.CDS_BORDER_ALPHA) ?? 1.0;

    ctx.save();

    for (const cds of refGenomeCDS) {
      if (!cds.coordinates) continue;
      const segments = v.parseCDSCoordinates(cds.coordinates);
      for (const seg of segments) {
        const startPos = seg.start - 1;
        const endPos   = seg.end   - 1;
        const rowIndex = seg.frame - 1;
        const cdsY     = barY + rowIndex * rowHeight;

        const leftPixel  = colOffsets[startPos] != null
          ? colOffsets[startPos]
          : (startPos * (charWidth + expandedRightPad));
        const rightPixel = colOffsets[endPos] != null
          ? colOffsets[endPos] + charWidth
          : ((endPos + 1) * (charWidth + expandedRightPad));

        const x  = Math.round(leftPixel  * scale);
        const x2 = Math.round(rightPixel * scale);
        const w  = Math.max(1, x2 - x);
        const col = frameColors ? frameColors[rowIndex] : '#888';

        ctx.globalAlpha = fillAlpha;
        ctx.fillStyle   = col;
        ctx.fillRect(x, cdsY, w, rowHeight);

        ctx.globalAlpha = borderAlpha;
        ctx.strokeStyle = col;
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(x, cdsY, w, rowHeight);

        this._cdsHitRegions.push({
          x, y: cdsY, width: w, height: rowHeight,
          gene: cds.gene || '', product: cds.product || '',
          coordinates: cds.coordinates, function: cds.function || '',
        });

        if (w >= 30 && cds.gene) {
          ctx.globalAlpha  = 1.0;
          ctx.fillStyle    = '#ffffff';
          ctx.font         = 'bold 10px sans-serif';
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor  = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur   = 2;
          ctx.fillText(cds.gene, x + w / 2, cdsY + rowHeight / 2);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur  = 0;
        }
      }
    }

    ctx.restore();
  }

  cacheKey(p) {
    return `gs:${p.maxSeqLen}:${p.refGenomeCDS ? p.refGenomeCDS.length : 0}`;
  }
}
