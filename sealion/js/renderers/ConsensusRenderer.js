// renderers/ConsensusRenderer.js
//
// Renders the consensus row canvas.
// - scrollAxes: h:'follow' — listens to horizontal scroll from AlignmentRenderer.
// - selectionAxes: ['col'] — mousedown on consensus selects columns (same as header).

import { CanvasRenderer } from './CanvasRenderer.js';

export class ConsensusRenderer extends CanvasRenderer {
  static scrollAxes  = { h: 'follow', v: false };
  static selectionAxes = ['col'];

  render(vis) {
    if (!this.canvas) return;
    const v   = this.viewer;
    const ctx = this.ensureBacking();
    if (!ctx) return;

    const pr   = v.pr || window.devicePixelRatio || 1;
    const cssW = this.canvas.width  / pr;
    const cssH = this.canvas.height / pr;

    // Background
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = v.CONSENSUS_BG;
    ctx.fillRect(0, 0, cssW, cssH);

    // Separator at bottom
    ctx.strokeStyle = v.CONSENSUS_SEPARATOR;
    ctx.lineWidth   = 1;
    const sepY = Math.max(0.5, cssH - 0.5);
    ctx.beginPath(); ctx.moveTo(0, sepY); ctx.lineTo(cssW, sepY); ctx.stroke();

    const font             = v.FONT || '12px monospace';
    const consensusTopPad  = v.CONSENSUS_TOP_PAD  != null ? v.CONSENSUS_TOP_PAD  : 4;
    const consensusBottomPad = v.CONSENSUS_BOTTOM_PAD != null ? v.CONSENSUS_BOTTOM_PAD : 8;
    const colOffsets       = v.colOffsets || [];
    const maxSeqLen        = colOffsets.length > 0 ? colOffsets.length - 1 : 0;
    const charWidth        = v.charWidth || 8;
    const expandedRightPad = v.EXPANDED_RIGHT_PAD != null ? v.EXPANDED_RIGHT_PAD : 2;
    const maskStr          = v.maskStr || '';
    const maskEnabled      = !!v.maskEnabled;
    const baseColors       = v.BASE_COLORS || { A: '#2ca02c', C: '#1f77b4', G: '#d62728', T: '#ff7f0e' };
    const defaultBaseColor = v.DEFAULT_BASE_COLOR || '#666';
    const displayMode      = v.displayMode || 'native';
    const dataType         = v.dataType || 'nucleotide';
    const readingFrame     = v.readingFrame || 1;
    const aaColors         = v.AA_COLORS || {};
    const defaultAaColor   = v.DEFAULT_AA_COLOR || '#888';

    ctx.font         = font;
    ctx.textBaseline = 'alphabetic';

    const innerH = Math.max(1, cssH - (consensusTopPad + consensusBottomPad));
    let ascent = 0, descent = 0;
    try {
      const m = ctx.measureText('Mg');
      if (m && typeof m.actualBoundingBoxAscent === 'number') {
        ascent  = m.actualBoundingBoxAscent  || 0;
        descent = m.actualBoundingBoxDescent || 0;
      }
    } catch (_) {}
    const baselineY = Math.round(consensusTopPad + (innerH - (ascent + descent)) / 2 + ascent);

    // Consensus string
    const cons = (window && window.displayedSequence)
      ? window.displayedSequence
      : ((window && window.consensusSequence)
        ? window.consensusSequence
        : (window && window.computeConsensusSequence ? window.computeConsensusSequence() : null));
    if (!cons || cons.length === 0) return;

    // Translate consensus if in codon/translate mode (nucleotide data only)
    let translatedCons = null;
    if ((displayMode === 'codon' || displayMode === 'translate') && dataType === 'nucleotide' && cons) {
      translatedCons = (typeof Alignment !== 'undefined' && Alignment.translateSequence)
        ? Alignment.translateSequence(cons, readingFrame)
        : null;
    }

    const scrollLeft = vis && vis.scrollLeft ? vis.scrollLeft : 0;
    const start = Math.max(0, (vis && vis.rawFirstCol != null ? vis.rawFirstCol : 0) - 1);
    const end   = Math.min(maxSeqLen - 1, (vis && vis.rawLastCol  != null ? vis.rawLastCol  : maxSeqLen - 1) + 1);

    for (let c = start; c <= end; c++) {
      let ch, color;

      if (displayMode === 'codon' && translatedCons) {
        const aaPos     = Math.floor((c - (readingFrame - 1)) / 3);
        const posInCodon = (c - (readingFrame - 1)) % 3;
        if (aaPos < 0 || aaPos >= translatedCons.length || posInCodon < 0 || posInCodon >= 3) continue;
        ch    = cons.charAt(c) || 'N';
        const aa = translatedCons.charAt(aaPos);
        color = aaColors[aa] || defaultAaColor;

        const left  = colOffsets[c]     != null ? colOffsets[c]     : (c       * (charWidth + expandedRightPad));
        const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
        const x = left - scrollLeft;
        const w = Math.max(1, right - left);
        ctx.fillStyle = color;
        const textOffset = Math.round((w - charWidth) / 2);
        ctx.fillText(ch, x + textOffset, baselineY);

      } else if (displayMode === 'native' && dataType === 'aminoacid') {
        ch    = cons.charAt(c) || 'X';
        color = aaColors[ch.toUpperCase()] || defaultAaColor;

        const left  = colOffsets[c]     != null ? colOffsets[c]     : (c       * (charWidth + expandedRightPad));
        const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
        const x = left - scrollLeft;
        const w = Math.max(1, right - left);

        if (maskEnabled && maskStr && maskStr.charAt(c) === '0') {
          ctx.fillStyle = color;
          ctx.fillRect(x, consensusTopPad, w, Math.max(1, cssH - (consensusTopPad + consensusBottomPad)));
        } else {
          ctx.fillStyle = color;
          ctx.fillText(ch, x + Math.round((w - charWidth) / 2), baselineY);
        }

      } else if (displayMode === 'translate' && translatedCons) {
        const aaPos = Math.floor((c - (readingFrame - 1)) / 3);
        if (aaPos < 0 || aaPos >= translatedCons.length) continue;
        if ((c - (readingFrame - 1)) % 3 !== 0) continue;

        ch    = translatedCons.charAt(aaPos);
        color = aaColors[ch.toUpperCase()] || defaultAaColor;

        const codonEnd       = c + 2;
        const codonLeftPos   = colOffsets[c]        != null ? colOffsets[c]        : (c       * (charWidth + expandedRightPad));
        const codonEndLeft   = colOffsets[codonEnd]  != null ? colOffsets[codonEnd]  : (codonEnd * (charWidth + expandedRightPad));
        const codonRightPos  = codonEndLeft + charWidth + expandedRightPad;
        const codonWidth     = codonRightPos - codonLeftPos;
        const xCenter        = codonLeftPos + (codonWidth / 2) - scrollLeft;

        if (maskEnabled && maskStr && maskStr.charAt(c) === '0') {
          ctx.fillStyle = color;
          ctx.fillRect(xCenter - codonWidth / 2, consensusTopPad, Math.max(1, codonWidth),
            Math.max(1, cssH - (consensusTopPad + consensusBottomPad)));
        } else {
          const hGap     = 0.75;
          const vGap     = 0.75;
          const bgWidth  = codonWidth - hGap * 2;
          const bgHeight = innerH - vGap * 2;
          const bgX      = xCenter - bgWidth / 2;
          const bgY      = consensusTopPad + (innerH - bgHeight) / 2;
          const radius   = 3;

          const rgbMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
          let bgColor = color;
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 16);
            const g = parseInt(rgbMatch[2], 16);
            const b = parseInt(rgbMatch[3], 16);
            bgColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
          }
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
          ctx.fill();

          ctx.fillStyle = color;
          ctx.fillText(ch, xCenter - charWidth / 2, baselineY);
        }

      } else {
        // Native nucleotide
        ch    = cons.charAt(c) || 'N';
        color = baseColors[ch.toUpperCase()] || defaultBaseColor;

        const left  = colOffsets[c]     != null ? colOffsets[c]     : (c       * (charWidth + expandedRightPad));
        const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
        const x = left - scrollLeft;
        const w = Math.max(1, right - left);

        if (maskEnabled && maskStr && maskStr.charAt(c) === '0') {
          ctx.fillStyle = color;
          ctx.fillRect(x, consensusTopPad, w, Math.max(1, cssH - (consensusTopPad + consensusBottomPad)));
        } else {
          ctx.fillStyle = color;
          ctx.fillText(ch, x + Math.round((w - charWidth) / 2), baselineY);
        }
      }
    }

    // Bookmark column backgrounds
    if (v.siteBookmarks && v.siteBookmarks.size > 0 && v.BOOKMARK_COL_ALPHA > 0) {
      ctx.save();
      for (const [colIdx, bookmarkIdx] of v.siteBookmarks.entries()) {
        if (colIdx < start || colIdx > end) continue;
        const bookmarkColor = (bookmarkIdx >= 0 && bookmarkIdx < v.BOOKMARK_COLORS.length)
          ? v.BOOKMARK_COLORS[bookmarkIdx] : null;
        if (!bookmarkColor) continue;
        const left  = colOffsets[colIdx]     != null ? colOffsets[colIdx]     : (colIdx * (charWidth + expandedRightPad));
        const right = colOffsets[colIdx + 1] != null ? colOffsets[colIdx + 1] : (left + charWidth + expandedRightPad);
        const x = left - scrollLeft;
        const w = Math.max(1, right - left);
        const r_val = parseInt(bookmarkColor.slice(1, 3), 16);
        const g_val = parseInt(bookmarkColor.slice(3, 5), 16);
        const b_val = parseInt(bookmarkColor.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r_val}, ${g_val}, ${b_val}, ${v.BOOKMARK_COL_ALPHA})`;
        ctx.fillRect(x, consensusTopPad, w, Math.max(1, cssH - (consensusTopPad + consensusBottomPad)));
      }
      ctx.restore();
    }

    // Column selection overlay
    const selectedCols = v.getSelectedCols ? v.getSelectedCols() : (v.selectedCols || new Set());
    if (selectedCols && selectedCols.size > 0) {
      try {
        v.drawColumnSelectionOverlay(this.canvas, vis, {
          CHAR_WIDTH: charWidth,
          EXPANDED_RIGHT_PAD: expandedRightPad,
          selectedCols,
          colOffsets,
        });
      } catch (_) {}
    }
  }

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
        // Already handled above
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
  }
}
