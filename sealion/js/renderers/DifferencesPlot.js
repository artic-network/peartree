// renderers/DifferencesPlot.js
//
// Differences plot strategy for PlotRenderer.
//
// Each bar = number of sequences that differ from the reference/consensus
// at that column (counting only canonical states in both the reference and
// the query sequence).
//
// Bar height is proportional to the fraction of canonical-state sequences
// that differ from the reference at that column.  High bar = many differ,
// low bar = few differ.
//
// Reference: viewer.refStr (if refModeEnabled) otherwise column consensus.

import { getSequentialPalette, lerpSequential } from '../palettes.js';

const DEFAULT_PALETTE = 'Ocean';

export class DifferencesPlot {
  constructor() {
    this._cache    = null; // Float32Array of per-column fraction in [0, 1]
    this._cacheKey = null;
  }

  invalidateCache() {
    this._cache    = null;
    this._cacheKey = null;
  }

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

    const diffs    = this._getDiffs(v, maxSeqLen);
    const palette  = getSequentialPalette(v.PLOT_PALETTE || DEFAULT_PALETTE);

    for (let c = start; c <= end; c++) {
      const h    = diffs[c] != null ? diffs[c] : 0;
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

  _getDiffs(viewer, maxSeqLen) {
    const alignment     = viewer.alignment;
    const seqArray      = alignment && alignment.getSequences ? alignment.getSequences() : alignment;
    const dataType      = viewer.dataType || 'nucleotide';
    const refStr        = viewer.refStr   || null;
    const refModeEnabled = viewer.refModeEnabled || false;
    const rowCount      = seqArray ? seqArray.length : 0;

    // Use refIndex to skip the reference row itself when counting diffs
    const refIndex = typeof viewer.refIndex === 'number' ? viewer.refIndex : null;

    // Cache key: changes when data, ref string, ref mode, or data type changes.
    const refKey   = refModeEnabled && refStr ? refStr.slice(0, 32) : 'consensus';
    const cacheKey = `${rowCount}:${maxSeqLen}:${dataType}:${refKey}`;
    if (this._cache && this._cacheKey === cacheKey) return this._cache;

    const isAA      = dataType === 'aminoacid';
    const canonical = isAA
      ? 'ACDEFGHIKLMNPQRSTVWY'.split('')
      : ['A', 'C', 'G', 'T'];

    // Fast canonical lookup
    const isCanonical = Object.create(null);
    canonical.forEach(s => { isCanonical[s] = true; });

    const result = new Float32Array(maxSeqLen);

    if (refModeEnabled && refStr) {
      // ── Ref-mode: count seqs differing from refStr ──────────────────────
      for (let c = 0; c < maxSeqLen; c++) {
        const refCh = c < refStr.length ? refStr[c].toUpperCase() : null;
        if (!refCh || !isCanonical[refCh]) {
          result[c] = 0;
          continue;
        }

        let diffCount = 0;
        let total     = 0;

        for (let r = 0; r < rowCount; r++) {
          if (r === refIndex) continue; // skip the reference row itself
          const row = seqArray[r];
          const seq = row && row.sequence ? row.sequence : '';
          if (c >= seq.length) continue;
          const ch = seq.charCodeAt(c) >= 97
            ? String.fromCharCode(seq.charCodeAt(c) - 32)
            : seq[c];
          if (!isCanonical[ch]) continue;
          total++;
          if (ch !== refCh) diffCount++;
        }

        result[c] = total > 0 ? diffCount / total : 0;
      }
    } else {
      // ── Consensus mode: count seqs differing from the majority state ────
      for (let c = 0; c < maxSeqLen; c++) {
        // First pass: find consensus (majority canonical state)
        const counts = Object.create(null);
        let total    = 0;

        for (let r = 0; r < rowCount; r++) {
          const row = seqArray[r];
          const seq = row && row.sequence ? row.sequence : '';
          if (c >= seq.length) continue;
          const ch = seq.charCodeAt(c) >= 97
            ? String.fromCharCode(seq.charCodeAt(c) - 32)
            : seq[c];
          if (!isCanonical[ch]) continue;
          counts[ch] = (counts[ch] || 0) + 1;
          total++;
        }

        if (total === 0) { result[c] = 0; continue; }

        // Find consensus character
        let consensusCh = null;
        let maxCount    = 0;
        for (const ch of canonical) {
          if ((counts[ch] || 0) > maxCount) {
            maxCount    = counts[ch];
            consensusCh = ch;
          }
        }

        result[c] = consensusCh != null ? (total - maxCount) / total : 0;
      }
    }

    this._cache    = result;
    this._cacheKey = cacheKey;
    return result;
  }
}
