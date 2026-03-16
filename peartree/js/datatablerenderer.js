// datatablerenderer.js — Data table panel for PearTree.
//
// Shows annotation values for each tip aligned with the tree canvas rows.
// Rows are positioned absolutely in CSS pixels so they stay locked to the
// canvas as the user pans/zooms.  Only rows within the visible viewport
// (plus a small render buffer) are kept in the DOM.
//
// Layout overview:
//   #data-table-panel
//     #data-table-resize-handle  (left edge drag; active only when pinned)
//     #dt-num-col (frozen strip)
//       #dt-num-header            ← pin + close buttons
//       #dt-num-body              ← absolutely-placed number cells
//     #dt-scroll-area (overflow-x: auto)
//       .dt-header                ← column labels
//       .dt-body                  ← absolutely-placed data rows
//
// Overlay vs pinned:
//   Overlay (default) – panel is position:absolute over the canvas, slides in
//   from the right.  Canvas width is unchanged.
//   Pinned            – panel joins the flex flow; canvas-container gains
//   padding-right via body.dt-pinned, shrinking the canvas.
// ─────────────────────────────────────────────────────────────────────────────

/** HTML-escape a value for safe insertion. */
function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Shared offscreen canvas used only for text measurement. */
const _measureCanvas = document.createElement('canvas');

/** Height of the column-name header row (px).  Must match the CSS rule. */
const HEADER_H = 24;

/**
 * Create the data table panel renderer.
 *
 * @param {Object}      opts
 * @param {Function}    opts.getRenderer    – () => TreeRenderer instance
 * @param {Function}    opts.onEditCommit   – (nodeId, key, newValue) on cell blur
 * @param {Function}    opts.onRowSelect    – (Set<id>) on row click
 * @param {Function}    opts.onPinChange    – (pinned:boolean) called when pin toggled
 * @param {Function}    opts.onClose        – () called when close button pressed
 * @param {HTMLElement} opts.panel          – #data-table-panel
 * @param {HTMLElement} opts.headerEl       – .dt-header #dt-header
 * @param {HTMLElement} opts.bodyEl         – .dt-body   #dt-body
 * @param {HTMLElement} opts.numHeaderEl    – #dt-num-header (holds pin/close btns)
 * @param {HTMLElement} opts.numBodyEl      – #dt-num-body   (number cells go here)
 */
export function createDataTableRenderer({
  getRenderer, onEditCommit, onRowSelect, onPinChange, onClose,
  panel, headerEl, bodyEl, numHeaderEl, numBodyEl,
}) {
  let _columns        = [];       // annotation keys to display (never '__names__')
  let _showNames      = false;    // whether the tip-name column is visible
  let _columnSig      = '';       // serialised; change → rebuild rows + measure widths
  let _tips           = [];       // visible tips sorted by node.y ascending
  let _tipsVersion    = 0;        // incremented on setTips(); forces width recompute
  let _colWidths      = [];       // px width per data column slot
  let _numColW        = 36;       // px width of the frozen number column
  let _rowEls         = new Map(); // nodeId → { rowEl, numEl, cells:Map<key,input> }
  let _open           = false;
  let _pinned         = false;
  let _userResized    = false;    // true once user drags the panel handle while pinned
  let _selectedIds    = new Set();
  let _lastClickedIdx = -1;
  let _dragSelectActive   = false;  // true while user is drag-selecting rows
  let _dragSelectStartIdx = -1;
  let _dragMoved          = false;  // true once drag crossed a row boundary

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Replace the displayed column set.  Triggers a full row rebuild. */
  function setColumns(cols) {
    const raw  = (cols || []).filter(Boolean);
    _showNames = raw.includes('__names__');
    _columns   = raw.filter(c => c !== '__names__');
    _columnSig = '';
    _clearRows();
    if (_open) _redraw();
  }

  /** Replace the tip list (called on layout / tree change). */
  function setTips(tips) {
    _tips = [...(tips || [])].sort((a, b) => a.y - b.y);
    _tipsVersion++;
    _clearRows();
    if (_open) _redraw();
  }

  /** Called from _onViewChange — repositions rows to match the canvas view. */
  function syncView() {
    if (!_open) return;
    _redraw();
  }

  /** Update selection highlight without a full redraw. */
  function syncSelection(ids) {
    _selectedIds = ids instanceof Set ? ids : new Set(ids);
    for (const [tipId, { rowEl, numEl }] of _rowEls) {
      const sel = _selectedIds.has(tipId);
      rowEl.classList.toggle('dt-row-selected', sel);
      numEl.classList.toggle('dt-row-selected', sel);
    }
  }

  function open() {
    _open = true;
    panel.classList.add('open');
    const r = getRenderer();
    if (r?.nodes) _tips = r.nodes.filter(n => n.isTip).sort((a, b) => a.y - b.y);
    if (r?._selectedTipIds) _selectedIds = new Set(r._selectedTipIds);
    _clearRows();
    _redraw();
  }

  function close() {
    _open = false;
    if (_pinned) _setPin(false);   // unpin first so the canvas can re-expand
    panel.classList.remove('open');
    _clearRows();
    if (onClose) onClose();
  }

  function isOpen()   { return _open;   }
  function isPinned() { return _pinned; }

  function pin()   { if (!_pinned) _setPin(true);  }
  function unpin() { if (_pinned)  _setPin(false); }

  function _setPin(pinned) {
    _pinned = pinned;
    if (!pinned) {
      // Restore auto-sizing when unpinned so the next open/pin uses content width.
      _userResized = false;
      _columnSig   = '';
    }
    panel.classList.toggle('pinned', pinned);
    _syncPinButton();
    if (onPinChange) onPinChange(pinned);
  }

  function _syncPinButton() {
    const btn = numHeaderEl?.querySelector('#dt-btn-pin');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) icon.className = _pinned ? 'bi bi-pin-angle-fill' : 'bi bi-pin-angle';
    btn.classList.toggle('active', _pinned);
    btn.title = _pinned ? 'Unpin table' : 'Pin table';
  }

  /**
   * Invalidate cached formatters (e.g. after decimal-places change in the
   * annotation curator).  Forces a full row rebuild on next syncView().
   */
  function invalidate() {
    _columnSig = '';
    _clearRows();
    if (_open) _redraw();
  }

  /** Return visible-column keys + tips (used by copy-tips and export). */
  function getState() {
    return { columns: [..._columns], showNames: _showNames, tips: [..._tips] };
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  function _clearRows() {
    for (const { rowEl, numEl } of _rowEls.values()) {
      rowEl.remove();
      numEl.remove();
    }
    _rowEls.clear();
    if (bodyEl)    bodyEl.innerHTML    = '';
    if (numBodyEl) numBodyEl.innerHTML = '';
  }

  function _colLabel(key) {
    const schema = getRenderer()?._annotationSchema;
    return schema?.get(key)?.label ?? key;
  }

  /**
   * Resolve the raw value for `key` on `tip`.
   * For __builtin__ keys delegates to renderer._statValue(); otherwise reads
   * tip.annotations, honouring any schema dataKey redirect.
   */
  function _tipValue(tip, key) {
    if (key.startsWith('__')) {
      const r = getRenderer();
      return r?._statValue ? r._statValue(tip, key) : null;
    }
    const schema    = getRenderer()?._annotationSchema;
    const def       = schema?.get(key);
    const actualKey = def?.dataKey ?? key;
    return tip.annotations?.[actualKey] ?? null;
  }

  /** Format a raw value for display, respecting any schema formatter. */
  function _fmtValue(key, rawVal) {
    if (rawVal == null) return '';
    const schema = getRenderer()?._annotationSchema;
    const def    = schema?.get(key);
    if (typeof rawVal === 'number' && def?.fmtValue) return def.fmtValue(rawVal);
    return String(rawVal);
  }

  /**
   * Measure the widest content for the frozen number column and each data
   * column and store results in _numColW / _colWidths.
   * Uses an offscreen canvas to avoid DOM layout.
   * Samples at most MAX_SAMPLE tips for performance on large trees.
   */
  function _computeColWidths(fontPx, fontFamily) {
    const ctx = _measureCanvas.getContext('2d');
    ctx.font  = `${fontPx}px ${fontFamily}`;
    const PAD = 14;
    const MIN = 48;
    _colWidths = [];

    // Frozen number column: wide enough for the largest row number.
    const numDigits = String(_tips.length || 1).length;
    _numColW = Math.max(36, Math.ceil(ctx.measureText('0'.repeat(numDigits)).width) + 16);

    const MAX_SAMPLE = 500;
    const tips   = _tips;
    const sample = tips.length <= MAX_SAMPLE
      ? tips
      : Array.from({ length: MAX_SAMPLE }, (_, i) => tips[Math.floor(i * tips.length / MAX_SAMPLE)]);

    const renderer = getRenderer();
    const schema   = renderer?._annotationSchema;

    if (_showNames) {
      let w = ctx.measureText('Names').width;
      for (const tip of sample) w = Math.max(w, ctx.measureText(tip.name ?? tip.id ?? '').width);
      _colWidths.push(Math.max(MIN, Math.ceil(w) + PAD));
    }

    for (const col of _columns) {
      const def       = schema?.get(col);
      const label     = def?.label ?? col;
      let w           = ctx.measureText(label).width;
      const isBuiltin = col.startsWith('__');
      const actualKey = def?.dataKey ?? col;
      for (const tip of sample) {
        const raw = isBuiltin
          ? (renderer?._statValue ? renderer._statValue(tip, col) : null)
          : (tip.annotations?.[actualKey] ?? null);
        if (raw == null) continue;
        const str = (typeof raw === 'number' && def?.fmtValue) ? def.fmtValue(raw) : String(raw);
        const tw  = ctx.measureText(str).width;
        if (tw > w) w = tw;
      }
      _colWidths.push(Math.max(MIN, Math.ceil(w) + PAD));
    }
  }

  function _isEmpty() {
    return !_showNames && _columns.length === 0;
  }

  function _renderHeader() {
    if (!headerEl) return;
    if (_isEmpty()) {
      headerEl.style.minWidth = '120px';
      headerEl.innerHTML =
        '<div class="dt-header-cell dt-header-empty"' +
        ' style="flex:1;min-width:120px;color:rgba(255,255,255,0.2);' +
        'font-style:italic;text-transform:none;letter-spacing:0">' +
        'No columns selected</div>';
      return;
    }
    let html = '';
    let wi   = 0;
    if (_showNames) {
      const w = _colWidths[wi++] ?? 100;
      html += `<div class="dt-header-name" style="flex:0 0 ${w}px;width:${w}px" title="Tip names">Names</div>`;
    }
    for (const col of _columns) {
      const w     = _colWidths[wi++] ?? 80;
      const label = _colLabel(col);
      html += `<div class="dt-header-cell" style="flex:0 0 ${w}px;width:${w}px" title="${_esc(label)}">${_esc(label)}</div>`;
    }
    const totalW = _colWidths.reduce((s, w) => s + w, 0);
    headerEl.style.minWidth = totalW + 'px';
    headerEl.innerHTML = html;
  }

  // ── Core render loop ────────────────────────────────────────────────────────

  function _redraw() {
    const renderer = getRenderer();
    if (!renderer || !bodyEl || !numBodyEl) return;

    const scaleY  = renderer.scaleY;
    const offsetY = renderer.offsetY;
    const rowH    = Math.max(12, Math.min(40, scaleY));

    // Use the tree's label font for cell sizing and column-width measurement.
    const labelFontPx = renderer.fontSize || 11;
    panel.style.setProperty('--dt-font-size',        labelFontPx + 'px');
    panel.style.setProperty('--dt-cell-font-family', renderer.fontFamily || 'monospace');

    const bodyH  = bodyEl.clientHeight;
    const BUFFER = rowH * 4;

    // Rebuild column layout only when column set, tip list, or label font changes —
    // never on every zoom step.
    const currentSig = `${Math.round(labelFontPx)}|${_tipsVersion}|${_showNames ? '1' : '0'}|${_columns.join('\0')}`;
    if (currentSig !== _columnSig) {
      _columnSig = currentSig;
      _computeColWidths(labelFontPx, renderer.fontFamily || 'monospace');
      _clearRows();
      _renderHeader();

      const totalW = _colWidths.reduce((s, w) => s + w, 0);
      const dataW  = Math.max(120, totalW);

      // Setting min-width on bodyEl causes #dt-scroll-area to show a scrollbar
      // when the data columns are wider than the visible scroll area.
      bodyEl.style.minWidth = dataW + 'px';

      // Frozen number column width always updates (number of digits may grow).
      panel.style.setProperty('--dt-num-w', _numColW + 'px');

      // Total panel width = frozen number column + data area.
      // When the user has manually dragged the panel to a custom width while
      // pinned, respect that width — only update the scroll-area min-width so
      // content is reachable via horizontal scroll, but don't move the panel.
      const panelW = _numColW + dataW;
      if (!(_pinned && _userResized)) {
        panel.style.width = panelW + 'px';
        document.documentElement.style.setProperty('--dt-panel-w', panelW + 'px');
        // When pinned the canvas width changes — defer _resize() until after
        // the browser has applied the new flex layout.
        if (_pinned) requestAnimationFrame(() => renderer._resize());
      }
    }

    // Mirror the tree renderer's label-visibility threshold: hide rows when tips
    // are too close together to show labels.
    const labelsVisible = scaleY >= labelFontPx * 0.5;

    const visible = new Set();

    for (let i = 0; i < _tips.length; i++) {
      const tip     = _tips[i];
      const screenY = tip.y * scaleY + offsetY;
      // topY is in bodyEl / numBodyEl coordinates (both start at panel.top + HEADER_H)
      const topY    = screenY - rowH * 0.5 - HEADER_H;

      const inView = (topY + rowH + BUFFER) >= 0 && (topY - BUFFER) <= bodyH;
      if (!inView || !labelsVisible) {
        const existing = _rowEls.get(tip.id);
        if (existing) {
          existing.rowEl.style.display = 'none';
          existing.numEl.style.display = 'none';
        }
        continue;
      }

      visible.add(tip.id);
      const tipNum = i + 1;   // 1-based position in displayed order

      if (_rowEls.has(tip.id)) {
        // ── Update existing row ─────────────────────────────────────────────
        const { rowEl, numEl, cells } = _rowEls.get(tip.id);

        rowEl.style.top     = `${topY}px`;
        rowEl.style.height  = `${rowH}px`;
        rowEl.style.display = 'flex';

        numEl.style.top     = `${topY}px`;
        numEl.style.height  = `${rowH}px`;
        numEl.style.display = 'flex';
        numEl.textContent   = tipNum;

        const sel = _selectedIds.has(tip.id);
        rowEl.classList.toggle('dt-row-selected', sel);
        numEl.classList.toggle('dt-row-selected', sel);

        for (const [key, input] of cells) {
          if (document.activeElement !== input) {
            const str = _fmtValue(key, _tipValue(tip, key));
            if (input.value !== str) input.value = str;
          }
        }
      } else {
        // ── Create new row elements ─────────────────────────────────────────

        // Number cell (frozen strip)
        const numEl = document.createElement('div');
        numEl.className     = 'dt-num-cell';
        numEl.dataset.dtIdx = i;
        numEl.style.top     = `${topY}px`;
        numEl.style.height = `${rowH}px`;
        numEl.textContent  = tipNum;
        if (_selectedIds.has(tip.id)) numEl.classList.add('dt-row-selected');

        // Data row (scrollable body)
        const rowEl = document.createElement('div');
        rowEl.className     = 'dt-row';
        rowEl.dataset.dtIdx = i;
        rowEl.style.top     = `${topY}px`;
        rowEl.style.height = `${rowH}px`;

        // Optional tip-name cell
        if (_showNames) {
          const nameCell = document.createElement('div');
          nameCell.className = 'dt-name-cell';
          const w = _colWidths[0] ?? 100;
          nameCell.style.cssText = `flex:0 0 ${w}px;width:${w}px`;
          const label = tip.name ?? tip.id ?? '';
          nameCell.textContent = label;
          nameCell.title       = label;
          rowEl.appendChild(nameCell);
        }

        // Annotation data cells
        const cells = new Map();
        let wi = _showNames ? 1 : 0;
        for (const col of _columns) {
          const cell  = document.createElement('div');
          cell.className = 'dt-cell';
          const w = _colWidths[wi++] ?? 80;
          cell.style.cssText = `flex:0 0 ${w}px;width:${w}px`;

          const input     = document.createElement('input');
          input.type      = 'text';
          const isBuiltin = col.startsWith('__');
          input.value       = _fmtValue(col, _tipValue(tip, col));
          input.placeholder = _colLabel(col);
          input.title       = (tip.name ?? tip.id ?? '') + ' / ' + _colLabel(col);
          if (isBuiltin) {
            input.readOnly      = true;
            input.style.opacity = '0.6';
            input.style.cursor  = 'default';
          }

          // Commit on Enter; cancel on Escape
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { input.blur(); }
            if (e.key === 'Escape') {
              const orig = isBuiltin
                ? _fmtValue(col, _tipValue(tip, col))
                : (tip.annotations?.[col] ?? null);
              input.value       = orig == null ? '' : String(orig);
              input._cancelBlur = true;
              input.blur();
            }
          });

          input.addEventListener('blur', () => {
            if (input._cancelBlur) { input._cancelBlur = false; return; }
            if (isBuiltin) return;
            const orig    = tip.annotations?.[col];
            const origStr = orig == null ? '' : String(orig);
            if (input.value !== origStr) {
              onEditCommit(tip.id, col, input.value);
              if (!tip.annotations) tip.annotations = {};
              tip.annotations[col] = input.value;
            }
          });

          cell.appendChild(input);
          rowEl.appendChild(cell);
          cells.set(col, input);
        }

        if (_selectedIds.has(tip.id)) rowEl.classList.add('dt-row-selected');

        // Shared click handler for both numEl and rowEl
        const handleClick = (e) => {
          if (e.target.tagName === 'INPUT') return;
          if (_dragMoved) return;  // selection already handled by drag-select
          const tipIdx = i;   // closure over loop `let i`
          const meta   = e.metaKey || e.ctrlKey;
          const shift  = e.shiftKey;
          let next = new Set(_selectedIds);
          if (shift && _lastClickedIdx >= 0) {
            const lo = Math.min(_lastClickedIdx, tipIdx);
            const hi = Math.max(_lastClickedIdx, tipIdx);
            for (let j = lo; j <= hi; j++) next.add(_tips[j].id);
          } else if (meta) {
            if (next.has(tip.id)) next.delete(tip.id); else next.add(tip.id);
          } else {
            next = new Set([tip.id]);
          }
          if (!shift) _lastClickedIdx = tipIdx;
          if (onRowSelect) onRowSelect(next);
        };
        const handleMouseDown = (e) => {
          if (e.target.tagName === 'INPUT') return;
          e.preventDefault();       // prevent browser text-selection highlight
          _dragSelectActive   = true;
          _dragSelectStartIdx = i;
          _dragMoved          = false;
        };
        rowEl.addEventListener('click',     handleClick);
        rowEl.addEventListener('mousedown', handleMouseDown);
        numEl.addEventListener('click',     handleClick);
        numEl.addEventListener('mousedown', handleMouseDown);

        bodyEl.appendChild(rowEl);
        numBodyEl.appendChild(numEl);
        _rowEls.set(tip.id, { rowEl, numEl, cells });
      }
    }

    // Remove rows whose tips have left the visible tip list
    const tipIdSet = new Set(_tips.map(t => t.id));
    for (const [id, { rowEl, numEl }] of [..._rowEls]) {
      if (!visible.has(id) && rowEl.style.display !== 'none') {
        if (!tipIdSet.has(id)) {
          rowEl.remove();
          numEl.remove();
          _rowEls.delete(id);
        }
      }
    }
  }

  // ── Drag-select: extend selection by dragging over rows ────────────────────
  // Prevent the browser's native drag ghost.
  panel.addEventListener('dragstart', e => e.preventDefault());

  window.addEventListener('mousemove', e => {
    if (!_dragSelectActive) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    if (!hit) return;
    const el = hit.closest('[data-dt-idx]');
    if (!el) return;
    const idx = +el.dataset.dtIdx;
    if (idx === _dragSelectStartIdx && !_dragMoved) return;
    _dragMoved = true;
    const lo = Math.min(_dragSelectStartIdx, idx);
    const hi = Math.max(_dragSelectStartIdx, idx);
    const next = new Set();
    for (let j = lo; j <= hi; j++) if (_tips[j]) next.add(_tips[j].id);
    if (onRowSelect) onRowSelect(next);
  });

  window.addEventListener('mouseup', () => { _dragSelectActive = false; });

  // ── Forward wheel events on the panel to the tree renderer ─────────────────
  // Vertical wheel scrolls the tree (keeping rows aligned with tips).
  // Horizontal wheel / shift+wheel is left to the browser so #dt-scroll-area
  // can still be panned horizontally.
  panel.addEventListener('wheel', e => {
    // Let the browser handle purely horizontal gestures (trackpad swipe, shift+wheel).
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const renderer = getRenderer();
    if (!renderer?.scrollByDelta) return;
    // Normalise delta to CSS pixels (same as the canvas wheel handler).
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= renderer.scaleY;              // lines
    if (e.deltaMode === 2) delta *= (renderer.canvas?.clientHeight ?? 600); // pages
    renderer.scrollByDelta(delta);
    e.preventDefault();
  }, { passive: false });

  // ── Wire pin / close buttons ────────────────────────────────────────────────

  if (numHeaderEl) {
    const btnPin   = numHeaderEl.querySelector('#dt-btn-pin');
    const btnClose = numHeaderEl.querySelector('#dt-btn-close');
    if (btnPin)   btnPin.addEventListener('click',   () => _setPin(!_pinned));
    if (btnClose) btnClose.addEventListener('click', () => close());
  }

  // Render an empty-state header on construction
  _renderHeader();

  /** Called by the host when the user drags the panel handle while pinned. */
  function notifyUserResized() { _userResized = true; }

  return {
    setColumns, setTips, syncView, syncSelection,
    open, close, isOpen, isPinned, pin, unpin,
    getState, invalidate, notifyUserResized,
  };
}
