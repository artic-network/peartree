// renderers/EntropyPlot.js
//
// Shannon entropy plot strategy for PlotRenderer.
//
// Convention: HIGH bar = CONSERVED, LOW bar = VARIABLE.
//   displayed_height = 1 - H(c) / H_max
// where H(c) = Shannon entropy at column c, H_max = log2(numCanonicalStates).
//
// Only canonical states are counted:
//   nucleotides  → A C G T   (gaps, N, ? are ignored)
//   amino acids  → 20 standard AAs  (gaps, X, ? are ignored)

import { getSequentialPalette, lerpSequential } from '../palettes.js';

const DEFAULT_PALETTE = 'Fire';

export class EntropyPlot {
  constructor() {
    this._cache    = null; // Float32Array of per-column bar heights in [0, 1]
    this._cacheKey = null;
  }

  // Invalidate the entropy cache (call when alignment data changes).
  invalidateCache() {
    this._cache    = null;
    this._cacheKey = null;
  }

  // Render entropy bars into an already-set-up 2D context (CSS-pixel transform applied).
  // ctx    — 2D context of the plot canvas
  // vis    — visible object from SealionViewer.computeVisible()
  // viewer — SealionViewer instance
  // cssW, cssH — CSS dimensions of the canvas
  render(ctx, vis, viewer, cssW, cssH) {
    const v = viewer;

    const topPad    = v.PLOT_TOP_PAD    != null ? v.PLOT_TOP_PAD    : 4;
    const bottomPad = v.PLOT_BOTTOM_PAD != null ? v.PLOT_BOTTOM_PAD : 6;
    const barAreaH  = Math.max(1, cssH - topPad - bottomPad);

    const colOffsets       = v.colOffsets || [];
    const charWidth        = v.charWidth || 8;
    const expandedRightPad = v.EXPANDED_RIGHT_PAD != null ? v.EXPANDED_RIGHT_PAD : 2;
    const maxSeqLen        = colOffsets.length > 0 ? colOffsets.length - 1 : 0;
    const scrollLeft       = vis && vis.scrollLeft != null ? vis.scrollLeft : 0;

    const start = Math.max(0, (vis && vis.rawFirstCol != null ? vis.rawFirstCol : 0) - 1);
    const end   = Math.min(maxSeqLen - 1, (vis && vis.rawLastCol  != null ? vis.rawLastCol  : maxSeqLen - 1) + 1);

    const entropy  = this._getEntropy(v, maxSeqLen);
    const palette  = getSequentialPalette(v.PLOT_PALETTE || DEFAULT_PALETTE);

    for (let c = start; c <= end; c++) {
      const h    = entropy[c] != null ? entropy[c] : 0;
      const barH = Math.round(h * barAreaH);
      if (barH <= 0) continue;

      const left  = colOffsets[c]     != null ? colOffsets[c]     : (c * (charWidth + expandedRightPad));
      const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
      const x = left  - scrollLeft;
      const w = Math.max(1, right - left);

      // Bars grow upward from the bottom of the plot area.
      const barY = topPad + barAreaH - barH;
      ctx.fillStyle = lerpSequential(h, palette);
      ctx.fillRect(x, barY, w, barH);
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _getEntropy(viewer, maxSeqLen) {
    const alignment = viewer.alignment;
    const dataType  = viewer.dataType || 'nucleotide';
    const rowCount  = alignment ? alignment.length : 0;

    // Cache key: changes when row count, column count, or data type changes.
    const cacheKey = `${rowCount}:${maxSeqLen}:${dataType}`;
    if (this._cache && this._cacheKey === cacheKey) return this._cache;

    const isAA      = dataType === 'aminoacid';
    const canonical = isAA
      ? 'ACDEFGHIKLMNPQRSTVWY'.split('')
      : ['A', 'C', 'G', 'T'];
    const hMax = Math.log2(canonical.length); // 2.0 for nt, ~4.32 for AA

    // Build a lookup table for fast state indexing.
    const stateIdx = Object.create(null);
    canonical.forEach((s, i) => { stateIdx[s] = i; });
    const K = canonical.length;

    const result = new Float32Array(maxSeqLen);

    for (let c = 0; c < maxSeqLen; c++) {
      const counts = new Int32Array(K);
      let total = 0;

      for (let r = 0; r < rowCount; r++) {
        const row = alignment[r];
        const seq = row && row.sequence ? row.sequence : '';
        if (c >= seq.length) continue;
        const idx = stateIdx[seq.charCodeAt(c) >= 97
          ? String.fromCharCode(seq.charCodeAt(c) - 32) // toUpperCase fast path
          : seq[c]];
        if (idx !== undefined) { counts[idx]++; total++; }
      }

      if (total === 0) {
        result[c] = 1; // no canonical data → treat as fully conserved
        continue;
      }

      let H = 0;
      for (let k = 0; k < K; k++) {
        if (counts[k] === 0) continue;
        const p = counts[k] / total;
        H -= p * Math.log2(p);
      }
      // Invert: result of 1 = conserved (H=0), result of 0 = maximally variable (H=H_max).
      result[c] = 1 - H / hMax;
    }

    this._cache    = result;
    this._cacheKey = cacheKey;
    return result;
  }
}
