// renderers/HeaderRenderer.js
//
// Renders the ruler/header canvas with position tick marks.
// - scrollAxes: h:'follow' — tracks horizontal scroll.
// - selectionAxes: ['col'] — mousedown on the ruler selects columns.

import { CanvasRenderer } from './CanvasRenderer.js';

export class HeaderRenderer extends CanvasRenderer {
  static scrollAxes    = { h: 'follow', v: false };
  static selectionAxes = ['col'];

  render(vis) {
    if (!this.canvas) return;
    const v   = this.viewer;
    const ctx = this.ensureBacking();
    if (!ctx) return;

    const pr          = v.pr || window.devicePixelRatio || 1;
    const rect        = this.canvas.getBoundingClientRect();
    const cssW        = (rect && rect.width) ? rect.width : Math.max(1, this.canvas.width / pr);
    const headerFont  = v.HEADER_FONT  || '12px sans-serif';
    const headerHeight = v.HEADER_HEIGHT != null ? v.HEADER_HEIGHT : 30;
    const colOffsets  = v.colOffsets || [];
    const maxSeqLen   = colOffsets.length > 0 ? colOffsets.length - 1 : 0;
    const charWidth   = v.charWidth || 8;
    const expandedRightPad = v.EXPANDED_RIGHT_PAD != null ? v.EXPANDED_RIGHT_PAD : 2;
    const selectedCols = v.getSelectedCols ? v.getSelectedCols() : (v.selectedCols || new Set());
    const displayMode = v.displayMode || 'native';
    const dataType    = v.dataType    || 'nucleotide';
    const readingFrame = v.readingFrame || 1;

    // Background
    ctx.clearRect(0, 0, cssW, headerHeight);
    ctx.fillStyle = v.HEADER_BG;
    ctx.fillRect(0, 0, cssW, headerHeight);
    ctx.font          = headerFont;
    ctx.textBaseline  = 'alphabetic';

    // Column selection + bookmarks overlay (under tick marks)
    if (selectedCols && selectedCols.size > 0) {
      try { this._drawColumnOverlay(ctx, vis, headerHeight, colOffsets, charWidth, expandedRightPad, selectedCols); } catch (_) {}
    } else {
      // Still draw bookmarks even if no cols selected
      try { this._drawBookmarks(ctx, vis, headerHeight, colOffsets, charWidth, expandedRightPad); } catch (_) {}
    }

    const start = Math.max(0, (vis && vis.rawFirstCol != null ? vis.rawFirstCol : 0) - 1);
    const end   = Math.min(maxSeqLen - 1, (vis && vis.rawLastCol  != null ? vis.rawLastCol  : maxSeqLen - 1) + 1);

    // Adaptive tick step
    const totalVisualWidth = colOffsets[maxSeqLen] != null ? colOffsets[maxSeqLen] : (maxSeqLen * (charWidth + expandedRightPad));
    const avgBasePx = maxSeqLen > 0 ? totalVisualWidth / maxSeqLen : charWidth;

    let actualAvgPx = avgBasePx;
    if (colOffsets.length > 1) {
      const sampleCount = Math.min(20, end - start);
      if (sampleCount > 1) {
        let total = 0;
        for (let i = 0; i < sampleCount; i++) {
          const c = start + Math.floor(i * (end - start) / sampleCount);
          if (c >= 0 && c < colOffsets.length - 1) total += ((colOffsets[c + 1] || 0) - (colOffsets[c] || 0));
        }
        actualAvgPx = total / sampleCount;
      }
    }

    const minTickPx = actualAvgPx < 5 ? 80 : 48;
    const chooseStep = (avgPx) => {
      if (avgPx <= 0) return 10;
      const raw = minTickPx / avgPx;
      const pow = Math.max(0, Math.floor(Math.log10(raw)) - 1);
      for (let p = pow; p <= pow + 5; p++) {
        for (const c of [1, 2, 5]) {
          const s = c * Math.pow(10, p);
          if (s * avgPx >= minTickPx) return s;
        }
      }
      return Math.max(10, Math.ceil(raw));
    };

    let step;
    if (displayMode === 'translate') {
      step = chooseStep(actualAvgPx * 3);
    } else {
      step = chooseStep(actualAvgPx);
    }

    const smallTickH = Math.max(2, Math.round(headerHeight * 0.28));
    const largeTickH = Math.max(3, Math.round(headerHeight * 0.6));
    const bottom     = headerHeight;
    ctx.strokeStyle  = v.HEADER_STROKE;
    ctx.lineWidth    = 1;
    ctx.fillStyle    = v.HEADER_TEXT;

    const scrollLeft = vis && vis.scrollLeft ? vis.scrollLeft : 0;

    for (let c = start; c <= end; c++) {
      let posIndex, isMajor, isMinor;

      if (displayMode === 'translate') {
        const aaPos = Math.floor((c - (readingFrame - 1)) / 3);
        if (aaPos < 0 || (c - (readingFrame - 1)) % 3 !== 0) continue;
        posIndex = aaPos + 1;
        isMajor  = (posIndex % step) === 0;
        isMinor  = !isMajor && step >= 2 && (posIndex % (step / 2)) === 0;
      } else {
        posIndex = c + 1;
        isMajor  = (posIndex % step) === 0;
        isMinor  = !isMajor && step >= 2 && (posIndex % (step / 2)) === 0;
      }

      const colLeft  = colOffsets[c]     != null ? colOffsets[c]     : (c       * (charWidth + expandedRightPad));
      const colRight = colOffsets[c + 1] != null ? colOffsets[c + 1] : (colLeft + charWidth + expandedRightPad);
      const centerLocal = ((colLeft + colRight) / 2) - scrollLeft;
      const x = Math.round(centerLocal) + 0.5;

      const tickH = isMajor ? largeTickH : (isMinor ? Math.max(2, Math.round(headerHeight * 0.4)) : smallTickH);
      ctx.beginPath();
      ctx.moveTo(x, bottom - tickH);
      ctx.lineTo(x, bottom - 1);
      ctx.stroke();

      if (isMajor) {
        const label  = String(posIndex);
        const labelX = Math.round(centerLocal) + 3;
        let labelY;
        try {
          const m       = ctx.measureText(label);
          const descent = (m && typeof m.actualBoundingBoxDescent === 'number') ? m.actualBoundingBoxDescent : Math.max(2, Math.round(headerHeight * 0.18));
          labelY = Math.round((bottom - tickH) - 2 - descent);
        } catch (_) {
          labelY = Math.round(headerHeight / 2);
        }
        ctx.fillText(label, labelX, labelY);
      }
    }
  }

  attachEvents() {
    if (!this.canvas) return;
    const v      = this.viewer;
    const canvas = this.canvas;

    const colFromClientX = (clientX) => {
      try {
        const rect      = canvas.getBoundingClientRect();
        const scrollLeft = v.scroller ? v.scroller.scrollLeft : 0;
        return v.colIndexFromCssOffset(scrollLeft + (clientX - rect.left));
      } catch (_) { return 0; }
    };

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      try { v.clearRectSelection(); }  catch (_) {}
      try { v.selectedRows.clear(); } catch (_) {}

      let col = colFromClientX(e.clientX);

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
          const isSelected = v.selectedCols.has(codonStart) || v.selectedCols.has(codonStart + 1) || v.selectedCols.has(codonEnd);
          if (isSelected) { for (let c = codonStart; c <= codonEnd; c++) v.selectedCols.delete(c); }
          else            { for (let c = codonStart; c <= codonEnd; c++) v.selectedCols.add(c);    }
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

    window.addEventListener('mousemove', (e) => {
      if (!v.isColSelecting) return;
      const col = colFromClientX(e.clientX);
      if (e.metaKey) {
        try { v.addRangeToColSelection(v.selectionStartCol, col); }  catch (_) {}
      } else {
        try { v.setColSelectionToRange(v.selectionStartCol, col); } catch (_) {}
      }
      v.scheduleRender();
    });

    window.addEventListener('mouseup', (e) => {
      if (!v.isColSelecting) return;
      v.isColSelecting = false;
      v.anchorCol = colFromClientX(e.clientX);
      v.scheduleRender();
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _drawBookmarks(ctx, vis, headerHeight, colOffsets, charWidth, expandedRightPad) {
    const v = this.viewer;
    if (!v.siteBookmarks || v.siteBookmarks.size === 0) return;
    const scrollLeft  = vis && vis.scrollLeft ? vis.scrollLeft : 0;
    const firstCol    = vis && vis.rawFirstCol != null ? vis.rawFirstCol : 0;
    const lastCol     = vis && vis.rawLastCol  != null ? vis.rawLastCol  : Infinity;
    ctx.save();
    for (const [c, bookmarkIdx] of v.siteBookmarks.entries()) {
      if (c < firstCol - 1 || c > lastCol + 1) continue;
      const bookmarkColor = (bookmarkIdx >= 0 && bookmarkIdx < v.BOOKMARK_COLORS.length) ? v.BOOKMARK_COLORS[bookmarkIdx] : null;
      if (!bookmarkColor) continue;
      const left  = colOffsets[c]     != null ? colOffsets[c]     : (c       * (charWidth + expandedRightPad));
      const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
      const x = left  - scrollLeft;
      const w = right - left;
      const r = parseInt(bookmarkColor.slice(1, 3), 16);
      const g = parseInt(bookmarkColor.slice(3, 5), 16);
      const b = parseInt(bookmarkColor.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${v.BOOKMARK_ALPHA})`;
      ctx.fillRect(x, 0, w, headerHeight);
    }
    ctx.restore();
  }

  _drawColumnOverlay(ctx, vis, headerHeight, colOffsets, charWidth, expandedRightPad, selectedCols) {
    const v         = this.viewer;
    const scrollLeft = vis && vis.scrollLeft ? vis.scrollLeft : 0;
    const firstCol  = vis && vis.rawFirstCol != null ? vis.rawFirstCol : 0;
    const lastCol   = vis && vis.rawLastCol  != null ? vis.rawLastCol  : Infinity;

    // Bookmarks first (behind selection)
    this._drawBookmarks(ctx, vis, headerHeight, colOffsets, charWidth, expandedRightPad);

    ctx.save();
    ctx.fillStyle = v.HEADER_SELECTION;

    if (v.displayMode === 'codon' || v.displayMode === 'translate') {
      const drawnCodons = new Set();
      for (const c of selectedCols) {
        if (c < firstCol - 1 || c > lastCol + 1) continue;
        const codonStart = v.snapToCodonStart(c);
        if (drawnCodons.has(codonStart)) continue;
        drawnCodons.add(codonStart);
        const codonEnd  = codonStart + 2;
        const leftOff   = colOffsets[codonStart]    != null ? colOffsets[codonStart]    : (codonStart * (charWidth + expandedRightPad));
        const rightOff  = colOffsets[codonEnd + 1]  != null ? colOffsets[codonEnd + 1]  : ((colOffsets[codonEnd] != null ? colOffsets[codonEnd] : (codonEnd * (charWidth + expandedRightPad))) + charWidth + expandedRightPad);
        ctx.fillRect(leftOff - scrollLeft, 0, rightOff - leftOff, headerHeight);
      }
    } else {
      for (const c of selectedCols) {
        if (c < firstCol - 1 || c > lastCol + 1) continue;
        const left  = colOffsets[c]     != null ? colOffsets[c]     : (c       * (charWidth + expandedRightPad));
        const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
        ctx.fillRect(left - scrollLeft, 0, right - left, headerHeight);
      }
    }

    ctx.restore();
  }
}
