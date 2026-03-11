// datatablerenderer.js — Data table panel for PearTree.
//
// Shows annotation values for each tip aligned with the tree canvas rows.
// Rows are positioned absolutely in CSS pixels using renderer.scaleY /
// renderer.offsetY so they stay in sync with the canvas as the user scrolls
// or zooms.  Only rows within the visible viewport (plus a small buffer) are
// kept in the DOM.
// ─────────────────────────────────────────────────────────────────────────────

/** HTML-escape a value for safe insertion. */
function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** Shared offscreen canvas used only for text measurement. */
const _measureCanvas = document.createElement('canvas');
/**
 * Create the data table panel renderer.
 *
 * @param {Object}       opts
 * @param {Function}     opts.getRenderer   – () => TreeRenderer instance
 * @param {Function}     opts.onEditCommit  – (nodeId, key, newValue:string) called when a
 *                                           cell value is committed (Return or blur).
 * @param {HTMLElement}  opts.panel         – the #data-table-panel element
 * @param {HTMLElement}  opts.headerEl      – the .dt-header element inside the panel
 * @param {HTMLElement}  opts.bodyEl        – the .dt-body element inside the panel
 * @returns {{ setColumns, setTips, syncView, open, close, isOpen }}
 */
export function createDataTableRenderer({ getRenderer, onEditCommit, onRowSelect, panel, headerEl, bodyEl }) {
  let _columns        = [];      // array of annotation key strings to show (never contains '__names__')
  let _showNames      = false;   // whether to render the tip-name column
  let _columnSig      = '';      // serialised column list; change → rebuild all rows
  let _tips           = [];      // visible tip nodes, sorted by node.y (ascending)
  let _tipsVersion    = 0;       // incremented on each setTips(); forces column-width recompute
  let _colWidths      = [];      // computed px widths per column slot [namesCol?, ...annotCols]
  let _rowEls         = new Map(); // nodeId → { el:HTMLElement, cells:Map<key,HTMLInputElement> }
  let _open           = false;
  let _selectedIds    = new Set(); // tip IDs currently highlighted as selected
  let _lastClickedIdx = -1;        // index in _tips of last clicked row (for shift-range)

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Replace the set of displayed columns.  Triggers a full row rebuild.
   *  The special key '__names__' controls visibility of the tip-name column. */
  function setColumns(cols) {
    const raw  = (cols || []).filter(Boolean);
    _showNames = raw.includes('__names__');
    _columns   = raw.filter(c => c !== '__names__');
    _columnSig = '';   // invalidate; _redraw() will recompute widths and rebuild
    _clearRows();
    if (_open) _redraw();
  }

  /** Replace the set of tip nodes (called on layout / tree change). */
  function setTips(tips) {
    _tips = [...(tips || [])].sort((a, b) => a.y - b.y);
    _tipsVersion++;  // force column-width recompute on next _redraw
    _clearRows();
    if (_open) _redraw();
  }

  /** Called from _onViewChange — repositions rows to match the canvas view. */
  function syncView() {
    if (!_open) return;
    _redraw();
  }

  /**
   * Update highlighted rows to reflect the given set of selected tip IDs.
   * Called from peartree.js whenever the canvas selection changes.
   */
  function syncSelection(ids) {
    _selectedIds = ids instanceof Set ? ids : new Set(ids);
    for (const [tipId, { el }] of _rowEls) {
      el.classList.toggle('dt-row-selected', _selectedIds.has(tipId));
    }
  }

  function open() {
    _open = true;
    panel.classList.add('open');
    // Restore previously saved width (default 280px) so the flex flow makes space
    panel.style.flexBasis = panel._dtWidth || '280px';
    // Populate from current renderer state immediately
    const r = getRenderer();
    if (r?.nodes) _tips = r.nodes.filter(n => n.isTip).sort((a, b) => a.y - b.y);
    if (r?._selectedTipIds) _selectedIds = new Set(r._selectedTipIds);
    _clearRows();
    _redraw();
  }

  function close() {
    // Save the current width so it's restored on next open()
    if (panel.style.flexBasis && panel.style.flexBasis !== '0px') {
      panel._dtWidth = panel.style.flexBasis;
    }
    _open = false;
    panel.classList.remove('open');
    panel.style.flexBasis = '0';
  }

  function isOpen() { return _open; }

  // ── Internal helpers ────────────────────────────────────────────────────────

  function _clearRows() {
    for (const { el } of _rowEls.values()) el.remove();
    _rowEls.clear();
    if (bodyEl) bodyEl.innerHTML = '';
  }

  /**
   * Measure the widest content in each column (header + all tip values) and
   * store pixel widths in _colWidths.  Uses an offscreen canvas so no DOM
   * layout is triggered.
   */
  function _computeColWidths(fontPx, fontFamily) {
    const ctx = _measureCanvas.getContext('2d');
    ctx.font   = `${fontPx}px ${fontFamily}`;
    const PAD  = 14;   // left + right padding per cell
    const MIN  = 48;   // minimum column width
    _colWidths  = [];

    if (_showNames) {
      let w = ctx.measureText('Names').width;
      for (const tip of _tips) w = Math.max(w, ctx.measureText(tip.name ?? tip.id ?? '').width);
      _colWidths.push(Math.max(MIN, Math.ceil(w) + PAD));
    }

    for (const col of _columns) {
      let w = ctx.measureText(col).width;
      for (const tip of _tips) {
        const val = tip.annotations?.[col];
        if (val != null) w = Math.max(w, ctx.measureText(String(val)).width);
      }
      _colWidths.push(Math.max(MIN, Math.ceil(w) + PAD));
    }
  }

  function _renderHeader() {
    if (!headerEl) return;
    let html = '';
    let wi   = 0;
    if (_showNames) {
      const w = _colWidths[wi++] ?? 100;
      html += `<div class="dt-header-name" style="flex:0 0 ${w}px;width:${w}px" title="Tip names">Names</div>`;
    }
    for (const col of _columns) {
      const w = _colWidths[wi++] ?? 80;
      html += `<div class="dt-header-cell" style="flex:0 0 ${w}px;width:${w}px" title="${_esc(col)}">${_esc(col)}</div>`;
    }
    headerEl.innerHTML = html;
  }

  function _redraw() {
    const renderer = getRenderer();
    if (!renderer || !bodyEl) return;

    const scaleY  = renderer.scaleY;
    const offsetY = renderer.offsetY;
    const rowH    = Math.max(12, Math.min(40, scaleY));   // clamp row height to readable range
    // Match tip-label font size, but never taller than the row itself
    const dtFontPx = Math.max(9, Math.min(rowH * 0.8, renderer.fontSize || 11));
    panel.style.setProperty('--dt-font-size', dtFontPx + 'px');
    const bodyH   = bodyEl.clientHeight;
    const BUFFER  = rowH * 4;   // render rows this many px outside visible range

    // Rebuild when columns, tips, or font size changes — includes width recompute
    const currentSig = `${Math.round(dtFontPx)}|${_tipsVersion}|${_showNames ? '1':'0'}|${_columns.join('\0')}`;
    if (currentSig !== _columnSig) {
      _columnSig = currentSig;
      _computeColWidths(dtFontPx, renderer.fontFamily || 'monospace');
      _clearRows();
      _renderHeader();
    }

    const visible  = new Set();

    for (const tip of _tips) {
      const screenY = tip.y * scaleY + offsetY;   // centre of row in CSS px
      const topY    = screenY - rowH * 0.5;

      const inView = screenY + BUFFER >= 0 && screenY - BUFFER <= bodyH;
      if (!inView) {
        // Hide or remove out-of-view rows
        const existing = _rowEls.get(tip.id);
        if (existing) {
          existing.el.style.display = 'none';
        }
        continue;
      }

      visible.add(tip.id);

      if (_rowEls.has(tip.id)) {
        // Update position and selection highlight
        const { el, cells } = _rowEls.get(tip.id);
        el.style.top    = `${topY}px`;
        el.style.height = `${rowH}px`;
        el.style.display = 'flex';
        el.classList.toggle('dt-row-selected', _selectedIds.has(tip.id));

        // Refresh annotation values (skip focused inputs to avoid clobbering edits)
        for (const [key, input] of cells) {
          if (document.activeElement !== input) {
            const val = tip.annotations?.[key];
            const str = val == null ? '' : String(val);
            if (input.value !== str) input.value = str;
          }
        }
      } else {
        // Create a new row element
        const row = document.createElement('div');
        row.className  = 'dt-row';
        row.style.top  = `${topY}px`;
        row.style.height = `${rowH}px`;

        // ── Tip name (only when __names__ is in the column list) ──────────
        if (_showNames) {
          const nameCell = document.createElement('div');
          nameCell.className   = 'dt-name-cell';
          const w = _colWidths[0] ?? 100;
          nameCell.style.cssText = `flex:0 0 ${w}px;width:${w}px`;
          const label = tip.name ?? tip.id ?? '';
          nameCell.textContent = label;
          nameCell.title       = label;
          row.appendChild(nameCell);
        }

        // ── Data cells ───────────────────────────────────────────────────
        const cells = new Map();
        let wi = _showNames ? 1 : 0;
        for (const col of _columns) {
          const cell  = document.createElement('div');
          cell.className = 'dt-cell';
          const w = _colWidths[wi++] ?? 80;
          cell.style.cssText = `flex:0 0 ${w}px;width:${w}px`;
          const input = document.createElement('input');
          input.type  = 'text';
          const val   = tip.annotations?.[col];
          input.value = val == null ? '' : String(val);
          input.placeholder = col;
          input.title = (tip.name ?? tip.id ?? '') + ' / ' + col;

          // Commit on Enter
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter')  { input.blur(); }
            if (e.key === 'Escape') {
              // Restore original value and blur without committing
              const orig = tip.annotations?.[col];
              input.value = orig == null ? '' : String(orig);
              input._cancelBlur = true;
              input.blur();
            }
          });

          // Commit on blur (unless Escape was pressed)
          input.addEventListener('blur', () => {
            if (input._cancelBlur) { input._cancelBlur = false; return; }
            const orig   = tip.annotations?.[col];
            const origStr = orig == null ? '' : String(orig);
            if (input.value !== origStr) {
              onEditCommit(tip.id, col, input.value);
              // Update the local annotation immediately so re-renders show the new value
              if (!tip.annotations) tip.annotations = {};
              tip.annotations[col] = input.value;
            }
          });

          cell.appendChild(input);
          row.appendChild(cell);
          cells.set(col, input);
        }
        // Selection highlight on create
        if (_selectedIds.has(tip.id)) row.classList.add('dt-row-selected');

        // Row click → selection (skip when target is an input field)
        row.addEventListener('click', e => {
          if (e.target.tagName === 'INPUT') return;
          const tipIdx = _tips.indexOf(tip);
          const meta   = e.metaKey || e.ctrlKey;
          const shift  = e.shiftKey;
          let next = new Set(_selectedIds);
          if (shift && _lastClickedIdx >= 0 && tipIdx >= 0) {
            // Extend range from last click to this row
            const lo = Math.min(_lastClickedIdx, tipIdx);
            const hi = Math.max(_lastClickedIdx, tipIdx);
            for (let i = lo; i <= hi; i++) next.add(_tips[i].id);
          } else if (meta) {
            if (next.has(tip.id)) next.delete(tip.id); else next.add(tip.id);
          } else {
            next = new Set([tip.id]);
          }
          if (tipIdx >= 0 && !shift) _lastClickedIdx = tipIdx;
          if (onRowSelect) onRowSelect(next);
        });

        bodyEl.appendChild(row);
        _rowEls.set(tip.id, { el: row, cells });
      }
    }

    // Clean up rows that no longer belong to visible tips
    for (const [id, { el }] of [..._rowEls]) {
      if (!visible.has(id) && el.style.display !== 'none') {
        const tip = _tips.find(t => t.id === id);
        if (!tip) { el.remove(); _rowEls.delete(id); }
        // else: out-of-view but tip still exists — already hidden above
      }
    }
  }

  // Initialise header on creation (no columns yet but builds the "Tip" stub)
  _renderHeader();

  return { setColumns, setTips, syncView, syncSelection, open, close, isOpen };
}
