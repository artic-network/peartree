// renderers/LabelRenderer.js
//
// Renders the labels column canvas with row names, index numbers, and drop indicator.
// - scrollAxes: v:'follow' — tracks vertical scroll.
// - selectionAxes: ['row'] — mousedown selects rows; drag reorders sequences.

import { CanvasRenderer } from './CanvasRenderer.js';

export class LabelRenderer extends CanvasRenderer {
  static scrollAxes    = { h: false, v: 'follow' };
  static selectionAxes = ['row'];

  constructor(canvas, viewer) {
    super(canvas, viewer);
    this._dragState = {
      isDragging:       false,
      draggedRows:      [],
      dragStartRow:     null,
      dropIndicatorRow: null,
      dragStartTime:    0,
      dragStartY:       0,
    };
    // Expose drag state on viewer so drawLabels (legacy) and render() can share it
    viewer.labelDragState = this._dragState;
  }

  render(vis) {
    if (!this.canvas) return;
    const v   = this.viewer;
    const ctx = this.ensureBacking();
    if (!ctx) return;

    const pr   = v.pr || window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = (rect && rect.width)  ? rect.width  : Math.max(1, this.canvas.width  / pr);
    const cssH = (rect && rect.height) ? rect.height : Math.max(1, this.canvas.height / pr);

    const font             = v.labelFont || v.FONT || '12px monospace';
    const rowHeight        = v.ROW_HEIGHT || 20;
    const labelWidth       = v.LABEL_WIDTH || 200;
    const labelTextVertOffset = typeof v.labelTextVertOffset === 'number' ? v.labelTextVertOffset : Math.round(rowHeight / 2);
    const selectedRows     = v.getSelectedRows ? v.getSelectedRows() : (v.selectedRows || new Set());
    const rows             = v.alignment || [];
    const refIndex         = typeof v.refIndex === 'number' ? v.refIndex : null;
    const refAccent        = v.REF_ACCENT || '#ffcc00';

    ctx.font         = font;
    ctx.textBaseline = 'alphabetic';
    ctx.clearRect(0, 0, cssW, cssH);

    const first     = vis && vis.firstRow != null ? vis.firstRow : 0;
    const last      = vis && vis.lastRow  != null ? vis.lastRow  : Math.max(0, rows.length - 1);
    const scrollTop = vis && vis.scrollTop != null ? vis.scrollTop : 0;

    for (let i = first; i <= last; i++) {
      const rawRowY = (i * rowHeight) - scrollTop;
      const rowY = Math.round(rawRowY * pr) / pr;
      const rowH = Math.round(rowHeight * pr) / pr;
      const label = (rows[i] && rows[i].label) ? rows[i].label : '';

      const tagColor = v.getRowTagColor ? v.getRowTagColor(i) : null;

      // Row background
      if (selectedRows.has(i)) {
        ctx.fillStyle = v.SEQ_ROW_SELECTION;
      } else if (i % 2 === 0) {
        ctx.fillStyle = v.SEQ_EVEN_ROW;
      } else {
        ctx.fillStyle = v.SEQ_ODD_ROW;
      }
      ctx.fillRect(0, rowY, labelWidth, rowH);

      // Tag background overlay
      if (tagColor && v.TAG_BACKGROUND_ALPHA > 0) {
        const r = parseInt(tagColor.slice(1, 3), 16);
        const g = parseInt(tagColor.slice(3, 5), 16);
        const b = parseInt(tagColor.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${v.TAG_BACKGROUND_ALPHA})`;
        ctx.fillRect(0, rowY, labelWidth, rowH);
      }

      // Reference accent bar
      if (typeof refIndex === 'number' && i === refIndex) {
        try { ctx.fillStyle = refAccent; ctx.fillRect(0, rowY, 4, rowH); } catch (_) {}
      }

      const y = Math.round((rawRowY + labelTextVertOffset) * pr) / pr;

      // Original index (italic, right-aligned)
      const originalIndex = (rows[i] && typeof rows[i].originalIndex === 'number') ? rows[i].originalIndex + 1 : i + 1;
      ctx.font      = (v.INDEX_FONT_STYLE || 'italic') + ' ' + font;
      ctx.textAlign = 'right';
      ctx.fillStyle = v.INDEX_COLOR || '#888888';
      ctx.fillText(String(originalIndex), typeof v.INDEX_RIGHT_ALIGN_POS === 'number' ? v.INDEX_RIGHT_ALIGN_POS : 50, y);

      // Label text
      ctx.font      = font;
      ctx.textAlign = 'left';
      ctx.fillStyle = (tagColor && v.TAG_TEXT_COLOR) ? tagColor : v.LABELS_TEXT;
      ctx.fillText(label, typeof v.LABEL_START_POS === 'number' ? v.LABEL_START_POS : 56, y);
    }

    // Drop indicator while drag-reordering
    const ds = this._dragState;
    if (ds.isDragging && ds.dropIndicatorRow !== null) {
      const dropY = (ds.dropIndicatorRow * rowHeight) - scrollTop;
      if (dropY >= -rowHeight && dropY <= cssH + rowHeight) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.moveTo(0,          Math.round(dropY));
        ctx.lineTo(labelWidth, Math.round(dropY));
        ctx.stroke();

        const arrowSize = 6;
        ctx.fillStyle = '#007bff';
        ctx.beginPath(); ctx.moveTo(0, Math.round(dropY)); ctx.lineTo(arrowSize, Math.round(dropY - arrowSize)); ctx.lineTo(arrowSize, Math.round(dropY + arrowSize)); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(labelWidth, Math.round(dropY)); ctx.lineTo(labelWidth - arrowSize, Math.round(dropY - arrowSize)); ctx.lineTo(labelWidth - arrowSize, Math.round(dropY + arrowSize)); ctx.closePath(); ctx.fill();
      }
    }
  }

  attachEvents() {
    if (!this.canvas) return;
    const v      = this.viewer;
    const canvas = this.canvas;
    const ds     = this._dragState;

    const rowFromClientY = (clientY) => {
      try {
        return v.rowFromClientY(clientY, {
          labelCanvas: canvas,
          scroller:    v.scroller,
          ROW_HEIGHT:  v.ROW_HEIGHT || 20,
          rowCount:    (v.alignment && v.alignment.length) || 0,
        });
      } catch (_) { return 0; }
    };

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const row = rowFromClientY(e.clientY);
      try { v.clearRectSelection(); }  catch (_) {}
      try { v.selectedCols.clear(); } catch (_) {}

      if (e.altKey && e.metaKey) {
        ds.dragStartRow  = row;
        ds.dragStartY    = e.clientY;
        ds.dragStartTime = Date.now();
      } else {
        ds.dragStartRow = null;
      }

      if (e.shiftKey && v.selectedRows.size > 0) {
        v.expandSelectionToInclude(row);
        const currentMin = Math.min(...Array.from(v.selectedRows));
        const currentMax = Math.max(...Array.from(v.selectedRows));
        v.selectionOrigin = (row < currentMin) ? currentMax : currentMin;
      } else {
        v.selectionOrigin = row;
      }

      v.selectionMode = e.metaKey ? 'add' : 'replace';

      if (e.shiftKey && v.selectedRows.size > 0) {
        // handled above
      } else if (e.metaKey) {
        try { if (v.selectedRows.has(row)) v.selectedRows.delete(row); else v.selectedRows.add(row); } catch (_) {}
        v.anchorRow = row;
      } else {
        try { v.selectedRows.clear(); v.selectedRows.add(row); } catch (_) {}
        v.anchorRow = row;
      }
      v.isSelecting       = true;
      v.selectionStartRow = row;
      v.scheduleRender();
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      // Drag-and-drop initiation
      if (!ds.isDragging && ds.dragStartRow !== null) {
        const canDrag = v.alignment && v.alignment.isInOriginalOrder && v.alignment.isInOriginalOrder();
        if (!canDrag) {
          ds.dragStartRow = null;
        } else if (Math.abs(e.clientY - ds.dragStartY) > 5) {
          v.isSelecting  = false;
          ds.isDragging  = true;
          ds.draggedRows = v.selectedRows.has(ds.dragStartRow)
            ? Array.from(v.selectedRows).sort((a, b) => a - b)
            : [ds.dragStartRow];
          try { canvas.style.cursor = 'grabbing'; } catch (_) {}
        }
      }

      if (ds.isDragging) {
        const row     = rowFromClientY(e.clientY);
        const maxRow  = v.alignment ? v.alignment.length : 0;
        const dropRow = Math.max(0, Math.min(maxRow, row));
        if (dropRow !== ds.dropIndicatorRow) {
          ds.dropIndicatorRow = dropRow;
          v.scheduleRender();
        }
      } else if (v.isSelecting) {
        const row = rowFromClientY(e.clientY);
        if (v.selectionMode === 'replace') { try { v.setSelectionToRange(v.selectionOrigin, row); }     catch (_) {} }
        else if (v.selectionMode === 'add') { try { v.addRangeToSelection(v.selectionOrigin, row); }   catch (_) {} }
        v.scheduleRender();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (ds.isDragging) {
        const dropRow = ds.dropIndicatorRow;
        if (dropRow !== null && v.alignment && v.alignment.moveSequences) {
          const success = v.alignment.moveSequences(ds.draggedRows, dropRow);
          if (success) {
            const numMoved = ds.draggedRows.length;
            v.selectedRows.clear();
            let newStartPos = dropRow;
            for (const srcIdx of ds.draggedRows) {
              if (srcIdx < dropRow) newStartPos--;
            }
            for (let i = 0; i < numMoved; i++) v.selectedRows.add(newStartPos + i);
            v.scheduleRender();
          }
        }
        ds.isDragging       = false;
        ds.draggedRows      = [];
        ds.dragStartRow     = null;
        ds.dropIndicatorRow = null;
        try { canvas.style.cursor = ''; } catch (_) {}
        v.scheduleRender();
      } else if (v.isSelecting) {
        v.isSelecting = false;
        v.anchorRow   = rowFromClientY(e.clientY);
        v.scheduleRender();
      }
      ds.dragStartRow = null;
    });

    canvas.addEventListener('wheel', (e) => {
      if (!v.scroller) return;
      v.scroller.scrollTop  += e.deltaY;
      v.scroller.scrollLeft += e.deltaX;
      v.scheduleRender();
      e.preventDefault();
    }, { passive: false });
  }
}
