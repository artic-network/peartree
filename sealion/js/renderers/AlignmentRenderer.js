// AlignmentRenderer.js
// Renders the main sequence alignment canvas and owns its interaction events.
// Extracted from the monolithic drawSequences() + seqCanvas event block in sealionviewer.js.

import { CanvasRenderer } from './CanvasRenderer.js';

export class AlignmentRenderer extends CanvasRenderer {
  // This is the primary scrolling canvas — both axes are masters.
  static scrollAxes  = { h: 'master', v: 'master' };
  static selectionAxes = ['row', 'col', 'rect'];

  render(vis) {
    const v   = this.viewer;
    const canvas = this.canvas;
    if (!canvas) return;

    const ctx = this.ensureBacking();
    if (!ctx) return;

    const pr = v.pr || (window.devicePixelRatio || 1);

    const rect = canvas.getBoundingClientRect();
    const cssW = rect && rect.width  ? rect.width  : Math.max(1, canvas.width  / pr);
    const cssH = rect && rect.height ? rect.height : Math.max(1, canvas.height / pr);

    // ── Read all state from the viewer ──────────────────────────────────────
    const font             = v.FONT || '12px monospace';
    const rowHeight        = typeof v.ROW_HEIGHT === 'number'         ? v.ROW_HEIGHT         : 20;
    const charWidth        = v.charWidth || 8;
    const expandedRightPad = typeof v.EXPANDED_RIGHT_PAD === 'number' ? v.EXPANDED_RIGHT_PAD : 2;
    const colOffsets       = v.colOffsets || [];

    const rows         = v.alignment  || (window.alignment) || [];
    const selectedRows = v.selectedRows || new Set();
    const selectedCols = v.selectedCols || new Set();

    const refStr        = v.refStr   || null;
    const refModeEnabled = typeof v.refModeEnabled === 'boolean' ? v.refModeEnabled : false;
    const refIndex       = typeof v.refIndex === 'number'        ? v.refIndex       : null;

    const maskStr     = v.maskStr    || '';
    const maskEnabled = typeof v.maskEnabled === 'boolean' ? v.maskEnabled : false;
    const hideMode    = v.hideMode   || false;
    const hiddenMarkerColor = v.HIDDEN_MARKER_COLOR || '#d0d0d0';

    const baseColors      = v.BASE_COLORS      || { A: '#2ca02c', C: '#1f77b4', G: '#d62728', T: '#ff7f0e' };
    const defaultBaseColor = v.DEFAULT_BASE_COLOR || '#666';
    const paleRefColor     = v.PALE_REF_COLOR    || '#bfc9d6';

    const displayMode   = v.displayMode  || 'native';
    const dataType      = v.dataType     || 'nucleotide';
    const aminoAcidMode = v.aminoAcidMode || false;
    const codonMode     = v.codonMode    || false;
    const readingFrame  = typeof v.readingFrame === 'number' ? v.readingFrame : 1;
    const aaColors      = v.AA_COLORS || (v.constructor && v.constructor.DEFAULTS && v.constructor.DEFAULTS.AA_COLORS) || {};
    const defaultAaColor = v.DEFAULT_AA_COLOR || (v.constructor && v.constructor.DEFAULTS && v.constructor.DEFAULTS.DEFAULT_AA_COLOR) || '#999';

    const compressedCellVpad = typeof v.COMPRESSED_CELL_VPAD === 'number'
      ? v.COMPRESSED_CELL_VPAD : ((window && typeof window.COMPRESSED_CELL_VPAD === 'number') ? window.COMPRESSED_CELL_VPAD : 2);
    const seqTextVertOffset  = typeof v.seqTextVertOffset  === 'number'
      ? v.seqTextVertOffset  : ((window && typeof window.seqTextVertOffset  === 'number') ? window.seqTextVertOffset  : Math.round(rowHeight / 2));

    const rowCount   = typeof v.rowCount  === 'number' ? v.rowCount  : rows.length;
    const maxSeqLen  = typeof v.maxSeqLen === 'number' ? v.maxSeqLen : Math.max(0, colOffsets.length - 1);

    const isRectSelecting = typeof v.isRectSelecting === 'boolean' ? v.isRectSelecting : false;
    const rectStartRow    = typeof v.rectStartRow === 'number' ? v.rectStartRow : null;
    const rectEndRow      = typeof v.rectEndRow   === 'number' ? v.rectEndRow   : null;
    const rectStartCol    = typeof v.rectStartCol === 'number' ? v.rectStartCol : null;
    const rectEndCol      = typeof v.rectEndCol   === 'number' ? v.rectEndCol   : null;

    // ── Clear ─────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.font          = font;
    ctx.textBaseline  = 'alphabetic';
    ctx.fillStyle     = '#000';

    // ── First pass: row backgrounds ───────────────────────────────────────
    for (let r = vis.firstRow; r <= vis.lastRow; r++) {
      if (selectedRows.has(r)) {
        ctx.fillStyle = v.SEQ_ROW_SELECTION;
      } else if ((r % 2) === 0) {
        ctx.fillStyle = v.SEQ_EVEN_ROW;
      } else {
        ctx.fillStyle = v.SEQ_ODD_ROW;
      }
      const rawRowY = (r * rowHeight) - vis.scrollTop;
      const rowY    = Math.round(rawRowY * pr) / pr;
      const rowH    = Math.round(rowHeight  * pr) / pr;
      ctx.fillRect(0, rowY, vis.viewW, rowH);

      // Tag background
      const tagColor = v.getRowTagColor ? v.getRowTagColor(r) : null;
      if (tagColor && v.TAG_SEQ_BACKGROUND_ALPHA > 0) {
        const rv = parseInt(tagColor.slice(1, 3), 16);
        const gv = parseInt(tagColor.slice(3, 5), 16);
        const bv = parseInt(tagColor.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${rv}, ${gv}, ${bv}, ${v.TAG_SEQ_BACKGROUND_ALPHA})`;
        ctx.fillRect(0, rowY, vis.viewW, rowH);
      }

      // Reference row left accent
      if (typeof refIndex === 'number' && r === refIndex) {
        try {
          ctx.save();
          ctx.fillStyle  = v.REF_ACCENT || (window.REF_ACCENT) || '#ffcc00';
          ctx.globalAlpha = 0.9;
          ctx.fillRect(0, rowY, 4, rowH);
          ctx.restore();
        } catch (_) { }
      }
    }

    // ── Bookmark column backgrounds ───────────────────────────────────────
    if (v.siteBookmarks && v.siteBookmarks.size > 0 && v.BOOKMARK_COL_ALPHA > 0) {
      ctx.save();
      for (const [colIdx, bookmarkIdx] of v.siteBookmarks.entries()) {
        if (colIdx < vis.firstCol || colIdx > vis.lastCol) continue;
        const bookmarkColor = (bookmarkIdx >= 0 && bookmarkIdx < v.BOOKMARK_COLORS.length)
          ? v.BOOKMARK_COLORS[bookmarkIdx] : null;
        if (!bookmarkColor) continue;

        const colLeft  = (colOffsets[colIdx]     !== undefined) ? colOffsets[colIdx]     : (colIdx * (charWidth + expandedRightPad));
        const colRight = (colOffsets[colIdx + 1] !== undefined) ? colOffsets[colIdx + 1] : (colLeft + charWidth + expandedRightPad);
        const x = colLeft - vis.scrollLeft;
        const w = Math.max(1, colRight - colLeft);

        const rv = parseInt(bookmarkColor.slice(1, 3), 16);
        const gv = parseInt(bookmarkColor.slice(3, 5), 16);
        const bv = parseInt(bookmarkColor.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${rv}, ${gv}, ${bv}, ${v.BOOKMARK_COL_ALPHA})`;

        const firstRowY = Math.round(((vis.firstRow * rowHeight) - vis.scrollTop) * pr) / pr;
        const lastRowY  = Math.round((((vis.lastRow + 1) * rowHeight) - vis.scrollTop) * pr) / pr;
        ctx.fillRect(x, firstRowY, w, lastRowY - firstRowY);
      }
      ctx.restore();
    }

    // ── Column selection overlay ──────────────────────────────────────────
    if (selectedCols && selectedCols.size > 0) {
      try {
        v.drawColumnSelectionOverlay(canvas, vis, {
          CHAR_WIDTH: charWidth, EXPANDED_RIGHT_PAD: expandedRightPad,
          selectedCols, colOffsets
        });
      } catch (e) { }
    }

    // ── Second pass: glyphs ───────────────────────────────────────────────
    // Translate reference once for translate/codon modes
    let translatedRef = null;
    if ((displayMode === 'translate' || displayMode === 'codon') && refModeEnabled && refStr) {
      translatedRef = Alignment.translateSequence(refStr, readingFrame);
    }

    for (let r = vis.firstRow; r <= vis.lastRow; r++) {
      const rawRowY = (r * rowHeight) - vis.scrollTop;
      const y       = Math.round((rawRowY + seqTextVertOffset) * pr) / pr;
      const seq     = (rows[r] && rows[r].sequence) ? rows[r].sequence : '';
      ctx.fillStyle = '#000';

      // Pre-translate sequence for translate/codon modes
      let translatedSeq = null;
      if ((displayMode === 'translate' || displayMode === 'codon') && seq) {
        translatedSeq = Alignment.translateSequence(seq, readingFrame);
      }

      for (let c = vis.firstCol; c <= vis.lastCol; c++) {
        let ch, base, color;

        if (displayMode === 'codon' && translatedSeq) {
          // ── Codon mode: nucleotide chars coloured by amino acid ──
          const aaPos      = Math.floor((c - (readingFrame - 1)) / 3);
          const posInCodon = (c - (readingFrame - 1)) % 3;

          if (aaPos >= 0 && aaPos < translatedSeq.length && posInCodon >= 0 && posInCodon < 3) {
            const rawCh = seq[c] || ' ';
            ch   = String(rawCh);
            base = ch ? ch.charAt(0).toUpperCase() : '';
            const aa    = translatedSeq.charAt(aaPos);
            const refAA = (translatedRef && aaPos < translatedRef.length) ? translatedRef.charAt(aaPos) : null;
            const isSameRef = refModeEnabled && refStr && refAA === aa;
            const isRefRow  = (typeof refIndex === 'number' && refIndex === r);
            color = isRefRow ? (aaColors[aa] || defaultAaColor) : (isSameRef ? paleRefColor : (aaColors[aa] || defaultAaColor));
          } else {
            continue;
          }

        } else if (displayMode === 'native' && dataType === 'aminoacid') {
          // ── Native amino-acid mode ──
          ch   = seq.charAt(c) || 'X';
          base = ch.toUpperCase();
          const refAA    = (refStr && refStr.charAt(c)) ? refStr.charAt(c).toUpperCase() : null;
          const isSameRef = refModeEnabled && refStr && refAA === base;
          const isRefRow  = (typeof refIndex === 'number' && refIndex === r);
          color = isRefRow ? (aaColors[base] || defaultAaColor) : (isSameRef ? paleRefColor : (aaColors[base] || defaultAaColor));

          const left  = (colOffsets[c]     !== undefined) ? colOffsets[c]     : (c * (charWidth + expandedRightPad));
          const right = (colOffsets[c + 1] !== undefined) ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
          const x = left - vis.scrollLeft;
          const w = Math.max(1, right - left);

          if (maskEnabled && maskStr && maskStr.charAt(c) === '0') {
            if (hideMode && w > 1) {
              ctx.fillStyle = hiddenMarkerColor;
              ctx.fillRect(x, Math.round(rawRowY * pr) / pr, w, Math.round(rowHeight * pr) / pr);
            } else if (!hideMode) {
              ctx.fillStyle = color;
              const topQ = Math.round((rawRowY + compressedCellVpad) * pr) / pr;
              const hQ   = Math.round(Math.max(1, rowHeight - compressedCellVpad * 2) * pr) / pr;
              ctx.fillRect(x, topQ, w, hQ);
            }
          } else {
            ctx.fillStyle = color;
            ctx.fillText(ch, x + Math.round((w - charWidth) / 2), y);
          }
          continue; // Native AA handled — skip common rendering below

        } else if (displayMode === 'translate' && translatedSeq) {
          // ── Translate mode: amino-acid lozenges ──
          const aaPos = Math.floor((c - (readingFrame - 1)) / 3);
          if (aaPos >= 0 && aaPos < translatedSeq.length && (c - (readingFrame - 1)) % 3 === 0) {
            ch   = translatedSeq.charAt(aaPos);
            base = ch.toUpperCase();
            const refAA    = (translatedRef && aaPos < translatedRef.length) ? translatedRef.charAt(aaPos) : null;
            const isSameRef = refModeEnabled && refStr && refAA === base;
            const isRefRow  = (typeof refIndex === 'number' && refIndex === r);
            color = isRefRow ? (aaColors[base] || defaultAaColor) : (isSameRef ? paleRefColor : (aaColors[base] || defaultAaColor));

            const codonEnd        = c + 2;
            const codonLeftPos    = (colOffsets[c]          !== undefined) ? colOffsets[c]          : (c        * (charWidth + expandedRightPad));
            const codonEndLeftPos = (colOffsets[codonEnd]   !== undefined) ? colOffsets[codonEnd]   : (codonEnd * (charWidth + expandedRightPad));
            const codonRightPos   = codonEndLeftPos + charWidth + expandedRightPad;
            const codonWidth      = codonRightPos - codonLeftPos;
            const xCenter         = codonLeftPos + (codonWidth / 2) - vis.scrollLeft;

            if (maskEnabled && maskStr && maskStr.charAt(c) === '0') {
              const w = Math.max(1, codonRightPos - codonLeftPos);
              if (hideMode && w > 1) {
                ctx.fillStyle = hiddenMarkerColor;
                ctx.fillRect(xCenter - w / 2, Math.round(rawRowY * pr) / pr, w, Math.round(rowHeight * pr) / pr);
              } else if (!hideMode) {
                ctx.fillStyle = color;
                const topQ = Math.round((rawRowY + compressedCellVpad) * pr) / pr;
                const hQ   = Math.round(Math.max(1, rowHeight - compressedCellVpad * 2) * pr) / pr;
                ctx.fillRect(xCenter - w / 2, topQ, w, hQ);
              }
            } else {
              // Rounded-rectangle background
              const hGap    = 0.75;
              const vGap    = 0.75;
              const bgWidth  = codonWidth - (hGap * 2);
              const bgHeight = rowHeight  - (vGap * 2);
              const bgX      = xCenter - bgWidth / 2;
              const bgY      = rawRowY + vGap;
              const radius   = 3;

              const rgbMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
              let bgColor = color;
              if (rgbMatch) {
                const rr = parseInt(rgbMatch[1], 16);
                const gg = parseInt(rgbMatch[2], 16);
                const bb = parseInt(rgbMatch[3], 16);
                bgColor = `rgba(${rr}, ${gg}, ${bb}, 0.25)`;
              }
              ctx.fillStyle = bgColor;
              ctx.beginPath();
              ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
              ctx.fill();

              ctx.fillStyle = color;
              ctx.fillText(ch, xCenter - charWidth / 2, y);
            }
            continue;
          } else {
            continue; // Not at codon start — skip
          }

        } else {
          // ── Normal nucleotide mode ──
          const rawCh  = seq[c] || ' ';
          ch   = String(rawCh);
          base = ch ? ch.charAt(0).toUpperCase() : '';
          const refChar   = (refStr && refStr.charAt(c)) ? refStr.charAt(c).toUpperCase() : null;
          const isSameRef  = refModeEnabled && refStr && refChar === base;
          const isRefRow   = (typeof refIndex === 'number' && refIndex === r);
          color = isRefRow ? (baseColors[base] || defaultBaseColor) : (isSameRef ? paleRefColor : (baseColors[base] || defaultBaseColor));
        }

        // Common rendering for codon-mode and nucleotide mode
        const colLeft  = (colOffsets[c]     !== undefined) ? colOffsets[c]     : (c    * (charWidth + expandedRightPad));
        const colRight = (colOffsets[c + 1] !== undefined) ? colOffsets[c + 1] : (colLeft + charWidth + expandedRightPad);
        const x = colLeft  - vis.scrollLeft;
        const w = Math.max(1, colRight - colLeft);

        if (maskEnabled && maskStr && maskStr.charAt(c) === '0') {
          if (hideMode && w > 1) {
            ctx.fillStyle = hiddenMarkerColor;
            ctx.fillRect(x, Math.round(rawRowY * pr) / pr, w, Math.round(rowHeight * pr) / pr);
          } else if (!hideMode) {
            ctx.fillStyle = color;
            const topQ = Math.round((rawRowY + compressedCellVpad) * pr) / pr;
            const hQ   = Math.round(Math.max(1, rowHeight - compressedCellVpad * 2) * pr) / pr;
            ctx.fillRect(x, topQ, w, hQ);
          }
        } else {
          ctx.fillStyle = color;
          ctx.fillText(ch, x + Math.round((w - charWidth) / 2), y);
        }
      }
    }

    // ── Rectangular selection dashed border ──────────────────────────────
    if (isRectSelecting || (rectStartRow !== null && rectEndRow !== null &&
                             rectStartCol !== null && rectEndCol !== null)) {
      try {
        const rlo = Math.max(0, Math.min(rectStartRow, rectEndRow));
        const rhi = Math.min(rowCount - 1, Math.max(rectStartRow, rectEndRow));
        let   clo = Math.max(0, Math.min(rectStartCol, rectEndCol));
        let   chi = Math.min(maxSeqLen - 1, Math.max(rectStartCol, rectEndCol));

        if (displayMode === 'codon' || displayMode === 'translate') {
          clo = v.snapToCodonStart(clo);
          chi = v.snapToCodonEnd(chi);
        }

        if (rhi >= vis.firstRow && rlo <= vis.lastRow &&
            chi >= vis.rawFirstCol && clo <= vis.rawLastCol) {
          const topY    = (rlo - vis.firstRow) * rowHeight - (vis.scrollTop - vis.firstRow * rowHeight);
          const bottomY = (rhi - vis.firstRow + 1) * rowHeight - (vis.scrollTop - vis.firstRow * rowHeight);
          const leftX   = (colOffsets[clo]       || 0)                                      - vis.scrollLeft;
          const rightX  = (colOffsets[chi + 1]   || (colOffsets[chi] + charWidth + expandedRightPad)) - vis.scrollLeft;
          const t = Math.round(topY    * pr) / pr;
          const b = Math.round(bottomY * pr) / pr;
          const l = Math.round(leftX   * pr) / pr;
          const rr = Math.round(rightX  * pr) / pr;
          ctx.save();
          ctx.strokeStyle = v.SEQ_COL_SELECTION;
          ctx.lineWidth   = 2;
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(l + 0.5, t + 0.5, Math.max(1, rr - l - 1), Math.max(1, b - t - 1));
          ctx.restore();
        }
      } catch (e) { }
    }

    // ── Record draw extents ────────────────────────────────────────────────
    try {
      const startX = (colOffsets[vis.firstCol] || 0) - vis.scrollLeft + 3;
      const endX   = (colOffsets[vis.lastCol]  || 0) - vis.scrollLeft + 3;
      window.__lastDrawExtents = { minX: Math.round(startX), maxX: Math.round(endX) };
    } catch (e) { window.__lastDrawExtents = { minX: 0, maxX: 0 }; }
  }

  // ── Interaction events ────────────────────────────────────────────────────
  attachEvents() {
    const v         = this.viewer;
    const seqCanvas = this.canvas;
    if (!seqCanvas) return;

    const scroller    = v.scroller;
    const labelCanvas = v.labelCanvas;

    const _rowFromClientY = (clientY) => {
      try {
        return v.rowFromClientY(clientY, {
          labelCanvas,
          scroller,
          ROW_HEIGHT: (window && window.ROW_HEIGHT) ? window.ROW_HEIGHT : (v.ROW_HEIGHT || 20),
          rowCount:   (v.alignment && v.alignment.length) ? v.alignment.length : 0
        });
      } catch (_) { return 0; }
    };

    const _colFromClientX = (clientX) => {
      try {
        const r    = seqCanvas.getBoundingClientRect();
        const absX = (scroller ? scroller.scrollLeft : 0) + (clientX - r.left);
        return v.colIndexFromCssOffset(absX);
      } catch (_) { return 0; }
    };

    // ── Wheel — scroll both axes ──────────────────────────────────────────
    seqCanvas.addEventListener('wheel', (e) => {
      if (!scroller) return;
      scroller.scrollTop  += e.deltaY;
      scroller.scrollLeft += e.deltaX;
      v.scheduleRender();
      e.preventDefault();
    }, { passive: false });

    // ── Mousedown ─────────────────────────────────────────────────────────
    let lastClickTime = 0;
    let lastClickRow  = -1;
    let lastClickCol  = -1;
    const doubleClickThreshold = 500; // ms

    seqCanvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      // Space-bar panning
      if (v.isSpaceDown) {
        v.isCmdDrag       = true;
        v.dragStartX      = e.clientX;
        v.dragStartY      = e.clientY;
        v.dragStartScrollLeft = scroller ? scroller.scrollLeft : 0;
        v.dragStartScrollTop  = scroller ? scroller.scrollTop  : 0;
        try { seqCanvas.style.cursor = 'grabbing'; document.body.style.userSelect = 'none'; } catch (_) { }
        e.preventDefault();
        return;
      }

      const alt  = !!e.altKey;
      const meta = !!e.metaKey;

      if (!alt && !meta) {
        // Rectangle selection (or double-click expand)
        const row = _rowFromClientY(e.clientY);
        const col = _colFromClientX(e.clientX);

        const now          = Date.now();
        const isDoubleClick = (now - lastClickTime < doubleClickThreshold) &&
                              (row === lastClickRow) &&
                              (col === lastClickCol);
        lastClickTime = now;
        lastClickRow  = row;
        lastClickCol  = col;

        if (isDoubleClick) {
          // Smart character-type selection
          if (!v.alignment || row < 0 || row >= v.alignment.length) return;
          const seq = v.alignment[row];
          if (!seq || !seq.sequence || col < 0 || col >= seq.sequence.length) return;

          const clickedChar = seq.sequence[col].toUpperCase();
          let charType;
          if (clickedChar === '-')              charType = 'gap';
          else if (clickedChar === 'N')         charType = 'ambiguous';
          else if ('ACGT'.includes(clickedChar)) charType = 'nucleotide';
          else                                   charType = 'other';

          const getType = (ch) => {
            if (ch === '-')              return 'gap';
            if (ch === 'N')              return 'ambiguous';
            if ('ACGT'.includes(ch))     return 'nucleotide';
            return 'other';
          };

          let startCol = col;
          let endCol   = col;
          while (startCol > 0 && getType(seq.sequence[startCol - 1].toUpperCase()) === charType) startCol--;
          while (endCol < seq.sequence.length - 1 && getType(seq.sequence[endCol + 1].toUpperCase()) === charType) endCol++;

          try { v.clearRectSelection(); } catch (_) { }
          v.rectStartRow = row;   v.rectEndRow = row;
          v.rectStartCol = startCol; v.rectEndCol = endCol;
          v.dblClickColStart = startCol;
          v.dblClickColEnd   = endCol;
          try { v.finalizeRectSelection(row, row, startCol, endCol, null); } catch (_) { }
          v.anchorRow        = row;
          v.anchorCol        = endCol;
          v.isRectSelecting  = true;
          v.scheduleRender();
          e.preventDefault();
          return;
        }

        // Clear double-click mode on new selection
        v.dblClickColStart = undefined;
        v.dblClickColEnd   = undefined;

        if (e.shiftKey && v.rectStartRow !== null && v.rectStartCol !== null) {
          v.rectEndRow = row;
          v.rectEndCol = col;
        } else {
          try { v.clearRectSelection(); } catch (_) { }
          v.rectStartRow = row; v.rectStartCol = col;
          v.rectEndRow   = row; v.rectEndCol   = col;
        }

        v.isRectSelecting = true;
        v.anchorRow       = v.rectStartRow;
        v.anchorCol       = v.rectStartCol;

        v.selectedRows.clear();
        v.selectedCols.clear();
        const rlo0 = Math.max(0, Math.min(v.rectStartRow, v.rectEndRow));
        const rhi0 = Math.min((v.alignment && v.alignment.length) ? v.alignment.length - 1 : 0,
                               Math.max(v.rectStartRow, v.rectEndRow));
        const clo0 = Math.max(0, Math.min(v.rectStartCol, v.rectEndCol));
        const chi0 = Math.min((v.colOffsets && v.colOffsets.length > 0) ? v.colOffsets.length - 2 : Math.max(v.rectStartCol, v.rectEndCol),
                               Math.max(v.rectStartCol, v.rectEndCol));
        for (let r = rlo0; r <= rhi0; r++) v.selectedRows.add(r);
        for (let c = clo0; c <= chi0; c++) v.selectedCols.add(c);
        v.scheduleRender();
        e.preventDefault();
        return;
      }

      if (alt && !meta) {
        // Alt only: row select
        try { v.clearRectSelection(); } catch (_) { }
        try { v.selectedCols.clear(); } catch (_) { }
        const row = _rowFromClientY(e.clientY);

        if (e.shiftKey && v.selectedRows.size > 0) {
          v.expandSelectionToInclude(row);
          const currentMin = Math.min(...Array.from(v.selectedRows));
          const currentMax = Math.max(...Array.from(v.selectedRows));
          v.selectionOrigin = (row < currentMin) ? currentMax : currentMin;
        } else {
          v.selectionOrigin = row;
        }

        v.selectionMode = e.metaKey ? 'add' : 'replace';

        if (!(e.shiftKey && v.selectedRows.size > 0)) {
          if (e.metaKey) {
            try { if (v.selectedRows.has(row)) v.selectedRows.delete(row); else v.selectedRows.add(row); } catch (_) { }
            v.anchorRow = row;
          } else {
            try { v.selectedRows.clear(); v.selectedRows.add(row); } catch (_) { }
            v.anchorRow = row;
          }
        }
        v.isSelecting      = true;
        v.selectionStartRow = row;
        v.scheduleRender();
        e.preventDefault();
        return;
      }

      // Default: column select (meta held or no modifier handled above)
      try { v.clearRectSelection(); } catch (_) { }
      try { v.selectedRows.clear(); } catch (_) { }
      const col = _colFromClientX(e.clientX);

      if (e.shiftKey && v.selectedCols.size > 0) {
        v.expandColSelectionToInclude(col);
        const currentMin = Math.min(...Array.from(v.selectedCols));
        const currentMax = Math.max(...Array.from(v.selectedCols));
        v.selectionStartCol = (col < currentMin) ? currentMax : currentMin;
      } else {
        v.selectionStartCol = col;
      }

      v.selectionMode = e.metaKey ? 'add' : 'replace';

      if (!(e.shiftKey && v.selectedCols.size > 0)) {
        if (e.metaKey) {
          try { if (v.selectedCols.has(col)) v.selectedCols.delete(col); else v.selectedCols.add(col); } catch (_) { }
          v.anchorCol = col;
        } else {
          try { v.selectedCols.clear(); v.selectedCols.add(col); } catch (_) { }
          v.anchorCol = col;
        }
      }
      v.isColSelecting = true;
      v.scheduleRender();
      e.preventDefault();
    });

    // ── Window mousemove — cmd-drag panning + rect selection extend ───────
    window.addEventListener('mousemove', (e) => {
      if (v.isCmdDrag) {
        if (!e.buttons || !v.isSpaceDown) { v.isCmdDrag = false; return; }
        const dx = e.clientX - v.dragStartX;
        const dy = e.clientY - v.dragStartY;
        if (scroller) {
          scroller.scrollLeft = Math.max(0, Math.round(v.dragStartScrollLeft - dx));
          scroller.scrollTop  = Math.max(0, Math.round(v.dragStartScrollTop  - dy));
        }
        v.scheduleRender();
        return;
      }

      if (!v.isRectSelecting) return;
      v.rectEndRow = _rowFromClientY(e.clientY);

      if (v.dblClickColStart !== undefined && v.dblClickColEnd !== undefined) {
        v.rectStartCol = v.dblClickColStart;
        v.rectEndCol   = v.dblClickColEnd;
      } else {
        v.rectEndCol = _colFromClientX(e.clientX);
      }

      try { v.updateRectSelection(v.rectStartRow, v.rectEndRow, v.rectStartCol, v.rectEndCol, v.rectOriginal); } catch (_) { }
      v.scheduleRender();
    });

    // ── Window mouseup — finalise rect selection ──────────────────────────
    window.addEventListener('mouseup', (e) => {
      if (v.isCmdDrag) { v.isCmdDrag = false; return; }
      if (!v.isRectSelecting) return;

      v.isRectSelecting = false;
      v.rectEndRow      = _rowFromClientY(e.clientY);

      if (v.dblClickColStart !== undefined && v.dblClickColEnd !== undefined) {
        v.rectStartCol     = v.dblClickColStart;
        v.rectEndCol       = v.dblClickColEnd;
        v.dblClickColStart = undefined;
        v.dblClickColEnd   = undefined;
      } else {
        v.rectEndCol = _colFromClientX(e.clientX);
      }

      try { v.finalizeRectSelection(v.rectStartRow, v.rectEndRow, v.rectStartCol, v.rectEndCol, v.rectOriginal); } catch (_) { }
      v.anchorRow    = Math.max(v.rectStartRow, v.rectEndRow);
      v.anchorCol    = Math.max(v.rectStartCol, v.rectEndCol);
      v.rectOriginal = null;
      v.scheduleRender();
    });
  }
}
