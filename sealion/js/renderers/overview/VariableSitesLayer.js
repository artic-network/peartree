// renderers/overview/VariableSitesLayer.js
//
// Overview layer: draws a thin vertical line for every alignment column that
// has more than one distinct canonical state (i.e., is polymorphic).
// No background is drawn — only the tick lines.

export class VariableSitesLayer {
  constructor() {
    this.enabled   = true;
    this.label     = 'Variable sites';
    this._cache    = null; // Uint8Array: 1 = variable
    this._cacheKey = null;
  }

  /**
   * Render into an off-screen cache context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} p   — shared params built by OverviewRenderer._buildParams()
   */
  render(ctx, p) {
    if (!this.enabled) return;
    const v = p.viewer;

    const { scale, barY, barH,
            colOffsets, maxSeqLen, charWidth, expandedRightPad, rows } = p;

    const { variable, consensus } = this._getVariableSites(v, maxSeqLen, rows);
    if (!variable) return;

    const baseColors   = v.BASE_COLORS        || {};
    const defaultColor = v.DEFAULT_BASE_COLOR  || '#888';

    ctx.save();

    for (let c = 0; c < maxSeqLen; c++) {
      if (!variable[c]) continue;
      const left  = colOffsets[c]     != null ? colOffsets[c]     : (c * (charWidth + expandedRightPad));
      const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
      // Colour the line by the consensus character at this column
      const ch = consensus[c];
      ctx.fillStyle = (ch && baseColors[ch]) ? baseColors[ch] : defaultColor;
      const cx = Math.round((left + right) * 0.5 * scale);
      ctx.fillRect(cx, barY, 1, barH);
    }

    ctx.restore();
  }

  cacheKey(p) {
    return `vs:${p.maxSeqLen}:${p.rows.length}:${p.viewer.dataType || 'nucleotide'}`;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _getVariableSites(viewer, maxSeqLen, rows) {
    const dataType  = viewer.dataType || 'nucleotide';
    const rowCount  = rows.length;
    const cacheKey  = `${rowCount}:${maxSeqLen}:${dataType}`;
    if (this._cache && this._cacheKey === cacheKey) return this._cache;

    const isAA      = dataType === 'aminoacid';
    const canonicalStr = isAA ? 'ACDEFGHIKLMNPQRSTVWY' : 'ACGT';
    const canonical = new Set(canonicalStr);

    const variable  = new Uint8Array(maxSeqLen);  // 1 = polymorphic
    const consensus = new Array(maxSeqLen).fill(null); // majority canonical state

    for (let c = 0; c < maxSeqLen; c++) {
      const counts = Object.create(null);
      let total = 0;
      for (let r = 0; r < rowCount; r++) {
        const seq = rows[r] && rows[r].sequence ? rows[r].sequence : '';
        if (c >= seq.length) continue;
        const ch = seq.charCodeAt(c) >= 97
          ? String.fromCharCode(seq.charCodeAt(c) - 32)
          : seq[c];
        if (canonical.has(ch)) {
          counts[ch] = (counts[ch] || 0) + 1;
          total++;
        }
      }

      // Find the majority (consensus) character
      let maxCount = 0, majorCh = null;
      for (const ch of canonicalStr) {
        if ((counts[ch] || 0) > maxCount) { maxCount = counts[ch]; majorCh = ch; }
      }
      consensus[c] = majorCh;

      // Polymorphic if any canonical character other than the consensus is present
      if (majorCh !== null) {
        for (const ch of canonicalStr) {
          if (ch !== majorCh && (counts[ch] || 0) > 0) { variable[c] = 1; break; }
        }
      }
    }

    this._cache    = { variable, consensus };
    this._cacheKey = cacheKey;
    return this._cache;
  }
}
