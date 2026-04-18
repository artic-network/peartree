// renderers/overview/SlidingWindowLayer.js
//
// Overview layer: draws the active plot's data as a sliding-window averaged
// line spanning the full overview width.
//
// Data source: reads the active plot's per-column Float32Array cache via
//   viewer._plotRenderer._plot
// If unavailable (plot renderer hidden / no data) the layer draws nothing.
//
// The line is coloured using the same palette as the active plot (Fire for
// entropy, Ocean for differences).  Each point on the line is coloured by
// its smoothed value.

import { getSequentialPalette, lerpSequential } from '../../palettes.js';

// Number of alignment columns averaged in each sliding-window step.
const SLIDING_WINDOW_SIZE = 100;

export class SlidingWindowLayer {
  constructor() {
    this.enabled = true;
    this.label   = 'Plot line';
  }

  /**
   * Render the sliding-window line into an off-screen cache context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} p  — shared params built by OverviewRenderer._buildParams()
   */
  render(ctx, p) {
    if (!this.enabled) return;

    const { cssW, cssH, scale, barY, barH,
            colOffsets, maxSeqLen, charWidth, expandedRightPad } = p;
    const v = p.viewer;

    // ── Obtain per-column data from the active plot strategy ────────────
    const plotRenderer = v._plotRenderer;
    if (!plotRenderer) return;
    const plot = plotRenderer._plot;
    if (!plot) return;

    let values = null;
    try {
      if (typeof plot._getEntropy === 'function') {
        values = plot._getEntropy(v, maxSeqLen);
      } else if (typeof plot._getDiffs === 'function') {
        values = plot._getDiffs(v, maxSeqLen);
      } else if (plot._cache instanceof Float32Array) {
        values = plot._cache;
      }
    } catch (_) { return; }

    if (!values || values.length === 0) return;

    // ── Sliding window average over columns ──────────────────────────────
    // For each column c compute the mean of values in
    // [c - half, c + half] clamped to [0, maxSeqLen).
    const half    = Math.floor(SLIDING_WINDOW_SIZE / 2);
    const smoothed = new Float32Array(maxSeqLen);

    // Build a prefix-sum for O(1) range queries.
    const prefix = new Float64Array(maxSeqLen + 1);
    for (let c = 0; c < maxSeqLen; c++) prefix[c + 1] = prefix[c] + (values[c] || 0);

    for (let c = 0; c < maxSeqLen; c++) {
      const lo  = Math.max(0, c - half);
      const hi  = Math.min(maxSeqLen - 1, c + half);
      const len = hi - lo + 1;
      smoothed[c] = (prefix[hi + 1] - prefix[lo]) / len;
    }

    // ── Resolve the palette (same as the active plot) ───────────────────
    const defaultPalette = typeof plot._getEntropy === 'function' ? 'Fire' : 'Ocean';
    const palette = getSequentialPalette(v.PLOT_PALETTE || defaultPalette);

    // ── Build per-pixel-column point array ──────────────────────────────
    // Map each alignment column's smoothed value to its pixel x position,
    // taking the centroid of each column's pixel span.
    const pixW   = Math.ceil(cssW);
    const points = new Float32Array(pixW).fill(-1); // -1 = no data
    const ptVals = new Float32Array(pixW);

    for (let c = 0; c < maxSeqLen; c++) {
      const left  = colOffsets[c]     != null ? colOffsets[c]     : (c * (charWidth + expandedRightPad));
      const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
      const cx = (left + right) * 0.5 * scale; // centroid pixel
      const xi = Math.round(cx);
      if (xi >= 0 && xi < pixW) {
        // Keep the last assignment — columns are ordered so this is fine
        points[xi] = smoothed[c];
      }
    }

    // Fill any gaps between sampled pixels via linear interpolation so the
    // line is fully continuous even at high compression.
    let lastSet = -1;
    for (let x = 0; x < pixW; x++) {
      if (points[x] >= 0) { lastSet = x; }
    }
    if (lastSet < 0) return; // nothing to draw

    // Forward-fill first defined value to the left edge
    let firstVal = 0;
    for (let x = 0; x < pixW; x++) { if (points[x] >= 0) { firstVal = points[x]; break; } }
    for (let x = 0; x < pixW; x++) { if (points[x] < 0) points[x] = firstVal; else break; }

    // Interpolate gaps between defined points
    let prev = -1;
    for (let x = 0; x < pixW; x++) {
      if (points[x] >= 0) {
        if (prev >= 0 && x - prev > 1) {
          // linear interpolation between prev and x
          const v0 = points[prev], v1 = points[x];
          for (let i = prev + 1; i < x; i++) {
            points[i] = v0 + (v1 - v0) * (i - prev) / (x - prev);
          }
        }
        prev = x;
      }
    }
    // Forward-fill trailing gap
    if (prev >= 0) for (let x = prev + 1; x < pixW; x++) points[x] = points[prev];

    // ── Normalise to [0, 1] so min → baseline, max → top of bar area ────
    let minVal = Infinity, maxVal = -Infinity;
    for (let x = 0; x < pixW; x++) {
      if (points[x] < minVal) minVal = points[x];
      if (points[x] > maxVal) maxVal = points[x];
    }
    const range = maxVal - minVal;
    if (range > 0) {
      for (let x = 0; x < pixW; x++) points[x] = (points[x] - minVal) / range;
    } else {
      // Flat line — place at mid-height
      points.fill(0.5);
    }

    // ── Draw as a coloured polyline ──────────────────────────────────────
    const baseline = barY + barH;
    const areaH    = barH;

    ctx.save();
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.9;

    // Draw short coloured segments — colour changes with value.
    ctx.beginPath();
    let prevColor = null;
    for (let x = 0; x < pixW; x++) {
      const val  = points[x];
      const y    = baseline - val * areaH;
      const col  = lerpSequential(val, palette);

      if (col !== prevColor) {
        if (prevColor !== null) ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = col;
        // Overlap by one pixel so segments join cleanly
        if (x > 0) ctx.moveTo(x - 0.5, baseline - points[x - 1] * areaH);
        else        ctx.moveTo(x + 0.5, y);
        prevColor = col;
      }
      ctx.lineTo(x + 0.5, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  cacheKey(p) {
    const v = p.viewer;
    const plot = v._plotRenderer && v._plotRenderer._plot;
    if (!plot) return 'sw:none';
    // Key on whatever the plot strategy uses — row count, seq len, refStr
    const cacheKey = plot._cacheKey || '';
    return `sw:${p.maxSeqLen}:${cacheKey}`;
  }
}
