// renderers/PlotRenderer.js
//
// Generic scrollable plot canvas renderer.
// The active plot strategy is swappable via setPlot(); default is EntropyPlot.
// - scrollAxes: h:'follow' — tracks horizontal scroll from AlignmentRenderer.
// - selectionAxes: ['col'] — clicking selects columns (same as header / consensus).

import { CanvasRenderer }   from './CanvasRenderer.js';
import { EntropyPlot }      from './EntropyPlot.js';
import { DifferencesPlot }  from './DifferencesPlot.js';

export const PLOT_TYPES = {
  entropy:     () => new EntropyPlot(),
  differences: () => new DifferencesPlot(),
};

export class PlotRenderer extends CanvasRenderer {
  static scrollAxes    = { h: 'follow', v: false };
  static selectionAxes = ['col'];

  constructor(canvas, viewer) {
    super(canvas, viewer);
    this._plot = new EntropyPlot();
  }

  // Swap to a different plot strategy (pass null to reset to EntropyPlot).
  setPlot(plot) {
    this._plot = plot || new EntropyPlot();
    this.invalidate();
  }

  // Invalidate the active plot's data cache (call when alignment changes).
  invalidateCache() {
    if (this._plot && typeof this._plot.invalidateCache === 'function') {
      this._plot.invalidateCache();
    }
    this.invalidate();
  }

  render(vis) {
    if (!this.canvas) return;
    const v   = this.viewer;
    const ctx = this.ensureBacking();
    if (!ctx) return;

    const pr   = v.pr || window.devicePixelRatio || 1;
    const cssW = this.canvas.width  / pr;
    const cssH = this.canvas.height / pr;

    // ── Background ────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = v.PLOT_BG || v.CONSENSUS_BG || '#f3f3f3';
    ctx.fillRect(0, 0, cssW, cssH);

    // ── Separator line at bottom ──────────────────────────────────────────
    ctx.strokeStyle = v.PLOT_SEPARATOR || v.CONSENSUS_SEPARATOR || '#aaa';
    ctx.lineWidth   = 1;
    const sepY = Math.max(0.5, cssH - 0.5);
    ctx.beginPath(); ctx.moveTo(0, sepY); ctx.lineTo(cssW, sepY); ctx.stroke();

    // ── Active plot ───────────────────────────────────────────────────────
    try {
      this._plot.render(ctx, vis, v, cssW, cssH);
    } catch (e) { console.warn('PlotRenderer: plot render failed', e); }

    // ── Bookmark column overlays ──────────────────────────────────────────
    if (v.siteBookmarks && v.siteBookmarks.size > 0 && v.BOOKMARK_COL_ALPHA > 0) {
      const colOffsets = v.colOffsets || [];
      const cw = v.charWidth || 8;
      const rp = v.EXPANDED_RIGHT_PAD != null ? v.EXPANDED_RIGHT_PAD : 2;
      const sl = vis && vis.scrollLeft != null ? vis.scrollLeft : 0;
      ctx.save();
      for (const [colIdx, bookmarkIdx] of v.siteBookmarks.entries()) {
        const bookmarkColor = (bookmarkIdx >= 0 && bookmarkIdx < v.BOOKMARK_COLORS.length)
          ? v.BOOKMARK_COLORS[bookmarkIdx] : null;
        if (!bookmarkColor) continue;
        const left  = colOffsets[colIdx]     != null ? colOffsets[colIdx]     : (colIdx * (cw + rp));
        const right = colOffsets[colIdx + 1] != null ? colOffsets[colIdx + 1] : (left + cw + rp);
        const x = left - sl;
        const w = Math.max(1, right - left);
        const r_val = parseInt(bookmarkColor.slice(1, 3), 16);
        const g_val = parseInt(bookmarkColor.slice(3, 5), 16);
        const b_val = parseInt(bookmarkColor.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r_val}, ${g_val}, ${b_val}, ${v.BOOKMARK_COL_ALPHA})`;
        ctx.fillRect(x, 0, w, cssH - 1);
      }
      ctx.restore();
    }

    // ── Column selection overlay ──────────────────────────────────────────
    const selectedCols = v.getSelectedCols ? v.getSelectedCols() : (v.selectedCols || new Set());
    if (selectedCols && selectedCols.size > 0) {
      try {
        v.drawColumnSelectionOverlay(this.canvas, vis, {
          CHAR_WIDTH: v.charWidth || 8,
          EXPANDED_RIGHT_PAD: v.EXPANDED_RIGHT_PAD != null ? v.EXPANDED_RIGHT_PAD : 2,
          selectedCols,
          colOffsets: v.colOffsets || [],
        });
      } catch (_) {}
    }
  }

  // ── Interaction events (column selection — mirrors ConsensusRenderer) ─────
  attachEvents() {
    if (!this.canvas) return;
    const v      = this.viewer;
    const canvas = this.canvas;

    const colFromClientX = (clientX) => {
      try {
        const rect     = canvas.getBoundingClientRect();
        const x        = clientX - rect.left;
        const scrollLeft = v.scroller ? v.scroller.scrollLeft : 0;
        return v.colIndexFromCssOffset(scrollLeft + x);
      } catch (_) { return 0; }
    };

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      try { v.clearRectSelection(); }  catch (_) {}
      try { v.selectedRows.clear(); } catch (_) {}

      let col = colFromClientX(e.clientX);

      // Snap to codon boundary in codon/translate mode
      if (v.displayMode === 'codon' || v.displayMode === 'translate') {
        col = v.snapToCodonStart(col);
      }

      if (e.shiftKey && v.selectedCols.size > 0) {
        v.expandColSelectionToInclude(col);
        const currentMin = Math.min(...Array.from(v.selectedCols));
        const currentMax = Math.max(...Array.from(v.selectedCols));
        v.selectionStartCol = (col < currentMin) ? currentMax : currentMin;
      } else {
        v.selectionStartCol = col;
      }

      v.selectionMode = e.metaKey ? 'add' : 'replace';

      if (e.shiftKey && v.selectedCols.size > 0) {
        // already handled above
      } else if (e.metaKey) {
        if (v.displayMode === 'codon' || v.displayMode === 'translate') {
          const codonStart = v.snapToCodonStart(col);
          const codonEnd   = v.snapToCodonEnd(col);
          const isSelected = v.selectedCols.has(codonStart) ||
                             v.selectedCols.has(codonStart + 1) ||
                             v.selectedCols.has(codonEnd);
          if (isSelected) { for (let c = codonStart; c <= codonEnd; c++) v.selectedCols.delete(c); }
          else            { for (let c = codonStart; c <= codonEnd; c++) v.selectedCols.add(c); }
        } else {
          try { if (v.selectedCols.has(col)) v.selectedCols.delete(col); else v.selectedCols.add(col); } catch (_) {}
        }
        v.anchorCol = col;
      } else {
        try {
          v.selectedCols.clear();
          if (v.displayMode === 'codon' || v.displayMode === 'translate') {
            const codonEnd = v.snapToCodonEnd(col);
            for (let c = col; c <= codonEnd; c++) v.selectedCols.add(c);
          } else {
            v.selectedCols.add(col);
          }
        } catch (_) {}
        v.anchorCol = col;
      }

      v.isColSelecting = true;
      v.scheduleRender();
      e.preventDefault();
    });
  }
}
