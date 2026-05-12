/**
 * filter-control.js
 *
 * Reusable tip-filter toolbar widget. Generates its own HTML into a supplied
 * container element and manages all internal state and event wiring.
 *
 * Usage:
 *   import { createFilterControl } from './filter-control.js';
 *   const fc = createFilterControl(mountEl, opts);
 *   fc.reset();   // call on each tree load
 *   fc.enable();  // call on first tree load
 *   fc.setSchema(schema);       // call from _refreshAnnotationUIs
 *   fc.setNamedFilters(map);    // call from _refreshFilterUIs
 *
 * opts:
 *   getNodeMap()                      → Map<id, node>  (e.g. renderer.nodeMap)
 *   passesNamedFilter(filterId, node) → bool
 *   onMatchChange(nodes|null)         → void  (null = clear; Node[] = apply)
 *   onSaveFilter(filter, allFilters)  → void  (after saving a new named filter)
 *   showPrompt(title, msg)            → Promise<string|null>
 *   getFilterManager()                → filterManager instance
 *   enableKeyboard                    → bool  (wire Escape key, default true)
 */
import { dateToDecimalYear } from './phylograph.js';

export function createFilterControl(container, opts = {}) {
  const {
    getNodeMap              = () => null,
    getNodeAnnotationValue  = (n, col) => n.annotations?.[col] ?? null,
    passesNamedFilter       = () => false,
    onMatchChange           = () => {},
    onSaveFilter            = () => {},
    showPrompt              = (_t, m) => Promise.resolve(window.prompt(m) || null),
    showConfirm             = (_t, m, _opts) => Promise.resolve(window.confirm(m)),
    getFilterManager        = () => null,
    enableKeyboard          = true,
  } = opts;

  // ── HTML ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="pt-filter-wrap">
      <div class="pt-filter-group">
        <div class="pt-filter-col-wrap">
          <button class="fc-searchin pt-filter-col-btn" disabled title="Search in: Name"><i class="bi bi-tag"></i></button>
          <div class="pt-fc-col-popup"></div>
        </div>
        <div class="pt-filter-col-wrap">
          <button class="fc-op pt-filter-col-btn" disabled title="Match condition: contains"><i class="bi bi-chevron-down"></i></button>
          <div class="pt-fc-op-popup"></div>
        </div>
        <input type="search" class="fc-input pt-filter-input" placeholder="Name contains\u2026" disabled autocomplete="off" spellcheck="false">
        <button class="fc-add pt-filter-col-btn" disabled title="Save as named filter"><i class="bi bi-plus-lg"></i></button>
      </div>
      <div class="pt-named-filter-wrap">
        <button class="fc-named pt-filter-col-btn pt-named-filter-btn" disabled title="Apply a saved filter"><i class="bi bi-funnel"></i></button>
        <div class="pt-fc-named-popup"></div>
      </div>
      <span class="fc-count pt-filter-count" hidden></span>
    </div>`;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const q          = sel => container.querySelector(sel);
  const inputEl    = q('.fc-input');
  const btnSrcIn   = q('.fc-searchin');
  const btnOp      = q('.fc-op');
  const btnAdd     = q('.fc-add');
  const btnNamed   = q('.fc-named');
  const colPopup   = q('.pt-fc-col-popup');
  const opPopup    = q('.pt-fc-op-popup');
  const namedPopup = q('.pt-fc-named-popup');

  // ── State ──────────────────────────────────────────────────────────────────
  let _col           = '__name__';
  let _colType       = 'string';  // 'string' | 'numeric' | 'date'
  let _op            = 'contains';
  let _activeNamedId = null;
  let _timer         = null;

  // ── Op tables (per annotation type) ────────────────────────────────────────
  const OPS_STRING = [
    { op: 'contains',     label: 'contains' },
    { op: 'not contains', label: 'not contains' },
    { op: 'starts with',  label: 'starts with' },
    { op: 'ends with',    label: 'ends with' },
    { op: '=',            label: 'is exactly' },
    { op: '!=',           label: 'is not' },
    { op: 'regex',        label: 'matches regex' },
  ];
  const OPS_NUMERIC = [
    { op: '=',  label: '= (equals)' },
    { op: '!=', label: '\u2260 (not equals)' },
    { op: '>',  label: '> (greater than)' },
    { op: '>=', label: '\u2265 (at least)' },
    { op: '<',  label: '< (less than)' },
    { op: '<=', label: '\u2264 (at most)' },
  ];
  const OPS_DATE = [
    { op: 'before',       label: 'before' },
    { op: 'after',        label: 'after' },
    { op: 'on or before', label: 'on or before' },
    { op: 'on or after',  label: 'on or after' },
    { op: 'in year',      label: 'in year' },
    { op: 'not in year',  label: 'not in year' },
    { op: '=',            label: 'is exactly' },
    { op: '!=',           label: 'is not' },
  ];

  function _opsForType() {
    if (_colType === 'numeric') return OPS_NUMERIC;
    if (_colType === 'date')    return OPS_DATE;
    return OPS_STRING;
  }

  function _defaultOp(type) {
    if (type === 'numeric') return '=';
    if (type === 'date')    return 'after';
    return 'contains';
  }

  // ── Internal helpers ───────────────────────────────────────────────────────
  function _updatePlaceholder() {
    const colLabel = colPopup?.querySelector('.pt-fcp-item.active')?.textContent ?? 'Name';
    const opLabel  = _opsForType().find(x => x.op === _op)?.label ?? _op;
    inputEl.placeholder = `${colLabel} ${opLabel}\u2026`;
  }

  function _buildMatcher(raw, op, colType) {
    const grp = inputEl.closest('.pt-filter-group');
    grp?.classList.remove('regex-error');

    if (colType === 'numeric') {
      const t = parseFloat(raw);
      if (!isFinite(t)) return null;
      if (op === '=')  return v => { const n = parseFloat(v); return isFinite(n) && n === t; };
      if (op === '!=') return v => { const n = parseFloat(v); return !isFinite(n) || n !== t; };
      if (op === '>')  return v => { const n = parseFloat(v); return isFinite(n) && n > t; };
      if (op === '>=') return v => { const n = parseFloat(v); return isFinite(n) && n >= t; };
      if (op === '<')  return v => { const n = parseFloat(v); return isFinite(n) && n < t; };
      if (op === '<=') return v => { const n = parseFloat(v); return isFinite(n) && n <= t; };
      return null;
    }

    if (colType === 'date') {
      const EPS = 1 / (365 * 48);
      if (op === 'in year' || op === 'not in year') {
        const y = parseInt(raw);
        if (!isFinite(y)) return null;
        return v => {
          const d = dateToDecimalYear(String(v));
          if (!isFinite(d)) return op === 'not in year';
          return op === 'in year' ? Math.floor(d) === y : Math.floor(d) !== y;
        };
      }
      const tDec = dateToDecimalYear(raw);
      if (!isFinite(tDec)) return null;
      return v => {
        const d = dateToDecimalYear(String(v));
        if (!isFinite(d)) return op === '!=';
        if (op === 'before')       return d < tDec - EPS;
        if (op === 'after')        return d > tDec + EPS;
        if (op === 'on or before') return d <= tDec + EPS;
        if (op === 'on or after')  return d >= tDec - EPS;
        if (op === '=')            return Math.abs(d - tDec) <= EPS;
        if (op === '!=')           return Math.abs(d - tDec) >  EPS;
        return false;
      };
    }

    // string ops
    const ql = raw.toLowerCase();
    if (op === 'regex') {
      try {
        const re = new RegExp(raw, 'i');
        return s => re.test(s);
      } catch {
        grp?.classList.add('regex-error');
        return null;
      }
    }
    if (op === 'contains')     return s => s.toLowerCase().includes(ql);
    if (op === 'not contains') return s => !s.toLowerCase().includes(ql);
    if (op === 'starts with')  return s => s.toLowerCase().startsWith(ql);
    if (op === 'ends with')    return s => s.toLowerCase().endsWith(ql);
    if (op === '=')            return s => s.toLowerCase() === ql;
    if (op === '!=')           return s => s.toLowerCase() !== ql;
    return s => s.toLowerCase().includes(ql);
  }

  function _adHocMatches() {
    const raw     = inputEl?.value.trim() ?? '';
    const nodeMap = getNodeMap();
    if (!raw || !nodeMap) return null;
    const matcher = _buildMatcher(raw, _op, _colType);
    if (!matcher) return null;
    const hits = [];
    for (const [, n] of nodeMap) {
      if (!n.isTip) continue;
      const val = _col === '__name__' ? (n.name ?? '') : getNodeAnnotationValue(n, _col);
      if (val === null || val === undefined) continue;
      if (matcher(String(val))) hits.push(n);
    }
    return hits;
  }

  function _namedMatches() {
    if (!_activeNamedId) return null;
    const nodeMap = getNodeMap();
    if (!nodeMap) return null;
    const hits = [];
    for (const [, n] of nodeMap) {
      if (!n.isTip) continue;
      if (passesNamedFilter(_activeNamedId, n)) hits.push(n);
    }
    return hits;
  }

  function _apply() {
    clearTimeout(_timer);
    _timer = null;
    const grp   = inputEl.closest('.pt-filter-group');
    const adHoc = _adHocMatches();
    const named = _namedMatches();

    if (adHoc === null && named === null) {
      grp?.classList.remove('regex-error');
      onMatchChange(null);
      return;
    }

    let matches;
    if (adHoc !== null && named !== null) {
      const namedSet = new Set(named.map(n => n.id));
      matches = adHoc.filter(n => namedSet.has(n.id));
    } else {
      matches = adHoc ?? named;
    }
    onMatchChange(matches);
  }

  function _buildOpPopup() {
    opPopup.innerHTML = '';
    for (const { op, label } of _opsForType()) {
      const btn = document.createElement('button');
      btn.className = 'pt-fcp-item' + (op === _op ? ' active' : '');
      btn.textContent = label;
      btn.dataset.op = op;
      opPopup.appendChild(btn);
    }
  }

  function _closeAll() {
    colPopup?.classList.remove('open');
    opPopup?.classList.remove('open');
    namedPopup?.classList.remove('open');
  }

  // ── Named-filter popup builder ─────────────────────────────────────────────
  function _rebuildNamedPopup() {
    if (!namedPopup) return;
    namedPopup.innerHTML = '';
    const fm  = getFilterManager();
    const map = fm?.getAll() ?? new Map();
    if (map.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'pt-fcp-item';
      empty.style.cssText = 'color:var(--pt-text-muted);cursor:default;';
      empty.textContent = 'No saved filters';
      namedPopup.appendChild(empty);
      return;
    }
    const noneBtn = document.createElement('button');
    noneBtn.className = 'pt-fcp-item' + (_activeNamedId === null ? ' active' : '');
    noneBtn.textContent = '\u2014 none \u2014';
    noneBtn.dataset.id = '';
    namedPopup.appendChild(noneBtn);
    for (const [id, f] of map) {
      const btn = document.createElement('button');
      btn.className = 'pt-fcp-item' + (id === _activeNamedId ? ' active' : '');
      btn.textContent = f.name || id;
      btn.dataset.id = id;
      namedPopup.appendChild(btn);
    }
  }

  // ── Events: text input ─────────────────────────────────────────────────────
  inputEl?.addEventListener('input', () => {
    clearTimeout(_timer);
    _timer = setTimeout(_apply, 300);
  });
  inputEl?.addEventListener('blur', () => {
    clearTimeout(_timer);
    _apply();
  });
  inputEl?.addEventListener('search', _apply);

  // ── Events: search-in button ───────────────────────────────────────────────
  btnSrcIn?.addEventListener('click', (e) => {
    e.stopPropagation();
    colPopup.classList.toggle('open');
    opPopup?.classList.remove('open');
    namedPopup?.classList.remove('open');
  });
  colPopup?.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest('.pt-fcp-item');
    if (!item) return;
    const newColType = item.dataset.colType ?? 'string';
    if (newColType !== _colType) {
      _colType = newColType;
      _op = _defaultOp(_colType);
    }
    _col = item.dataset.value;
    for (const el of colPopup.querySelectorAll('.pt-fcp-item')) {
      el.classList.toggle('active', el === item);
    }
    const opLabel = _opsForType().find(x => x.op === _op)?.label ?? _op;
    if (btnOp) btnOp.title = `Match condition: ${opLabel}`;
    if (btnSrcIn) btnSrcIn.title = `Search in: ${item.textContent}`;
    _updatePlaceholder();
    colPopup.classList.remove('open');
    if (inputEl.value.trim()) _apply();
  });

  // ── Events: op button ──────────────────────────────────────────────────────
  _buildOpPopup();
  btnOp?.addEventListener('click', (e) => {
    e.stopPropagation();
    _buildOpPopup();
    opPopup.classList.toggle('open');
    colPopup?.classList.remove('open');
    namedPopup?.classList.remove('open');
  });
  opPopup?.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest('.pt-fcp-item');
    if (!item) return;
    _op = item.dataset.op;
    for (const el of opPopup.querySelectorAll('.pt-fcp-item')) {
      el.classList.toggle('active', el === item);
    }
    const lbl = _opsForType().find(x => x.op === _op)?.label ?? _op;
    if (btnOp) btnOp.title = `Match condition: ${lbl}`;
    _updatePlaceholder();
    opPopup.classList.remove('open');
    if (inputEl.value.trim()) _apply();
  });

  // ── Events: save button ────────────────────────────────────────────────────
  btnAdd?.addEventListener('click', async () => {
    const raw = inputEl?.value.trim();
    if (!raw) return;
    const name = await showPrompt('Save Filter', 'Enter a name for this filter:');
    if (!name?.trim()) return;
    const fm = getFilterManager();
    if (!fm) return;
    const all = fm.getAll();
    // Check for a duplicate name
    const trimmed = name.trim();
    const existing = [...all.values()].find(f => f.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      const ok = await showConfirm(
        'Overwrite filter',
        `A filter named \u201c${existing.name}\u201d already exists. Overwrite it?`,
        { okLabel: 'Overwrite', cancelLabel: 'Cancel' }
      );
      if (!ok) return;
      // Update in place: keep same id, replace root
      existing.name = trimmed;
      existing.root = { logic: 'AND', items: [{ field: _col, operator: _op, value: raw }] };
      all.set(existing.id, existing);
      fm.setAll(all);
      onSaveFilter(existing, all);
    } else {
      const newFilter = {
        id:   `filter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        root: { logic: 'AND', items: [{ field: _col, operator: _op, value: raw }] },
      };
      all.set(newFilter.id, newFilter);
      fm.setAll(all);
      onSaveFilter(newFilter, all);
    }
    _rebuildNamedPopup();
  });

  // ── Events: named filter button ────────────────────────────────────────────
  btnNamed?.addEventListener('click', (e) => {
    e.stopPropagation();
    namedPopup.classList.toggle('open');
    colPopup?.classList.remove('open');
    opPopup?.classList.remove('open');
  });
  namedPopup?.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest('.pt-fcp-item');
    if (!item) return;
    const id = item.dataset.id;
    if (_activeNamedId === id) {
      _activeNamedId = null;
      btnNamed?.classList.remove('active');
      if (btnNamed) btnNamed.title = 'Apply a saved filter';
    } else {
      _activeNamedId = id;
      btnNamed?.classList.add('active');
      if (btnNamed) btnNamed.title = `Filter: ${item.textContent}`;
    }
    for (const el of namedPopup.querySelectorAll('.pt-fcp-item')) {
      el.classList.toggle('active', el.dataset.id === _activeNamedId);
    }
    namedPopup.classList.remove('open');
    _apply();
  });

  // ── Outside-click / Escape ─────────────────────────────────────────────────
  const _onDocClick = (e) => {
    if (!container.contains(e.target)) {
      _closeAll();
      return;
    }
    if (colPopup?.classList.contains('open') && !colPopup.contains(e.target) && e.target !== btnSrcIn)
      colPopup.classList.remove('open');
    if (opPopup?.classList.contains('open') && !opPopup.contains(e.target) && e.target !== btnOp)
      opPopup.classList.remove('open');
    if (namedPopup?.classList.contains('open') && !namedPopup.contains(e.target) && e.target !== btnNamed)
      namedPopup.classList.remove('open');
  };
  document.addEventListener('click', _onDocClick);

  let _onEsc = null;
  if (enableKeyboard) {
    _onEsc = (e) => {
      if (e.key === 'Escape' && container.contains(document.activeElement)) _closeAll();
    };
    document.addEventListener('keydown', _onEsc, true);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    /** Reset state and UI for a new tree load. */
    reset() {
      inputEl.value  = '';
      _col           = '__name__';
      _colType       = 'string';
      _op            = 'contains';
      _activeNamedId = null;
      if (btnNamed) btnNamed.title = 'Apply a saved filter';
      btnNamed?.classList.remove('active');
      if (btnOp) btnOp.title = 'Match condition: contains';
      inputEl.closest('.pt-filter-group')?.classList.remove('regex-error');
      // Seed column popup with "Name" if it is empty (before first schema load).
      if (colPopup && !colPopup.hasChildNodes()) {
        const seed = document.createElement('button');
        seed.className = 'pt-fcp-item active';
        seed.textContent = 'Name';
        seed.dataset.value = '__name__';
        colPopup.appendChild(seed);
      }
      inputEl.placeholder = 'Name contains\u2026';
    },

    /** Enable all buttons after the first tree load. */
    enable() {
      if (inputEl)  inputEl.disabled  = false;
      if (btnSrcIn) btnSrcIn.disabled = false;
      if (btnOp)    btnOp.disabled    = false;
      if (btnAdd)   btnAdd.disabled   = false;
      if (btnNamed) btnNamed.disabled = false;
    },

    /** Rebuild the column picker from an annotation schema Map. */
    setSchema(schema) {
      const items = [{ value: '__name__', label: 'Name', colType: 'string' }];
      for (const [name, def] of schema) {
        if (!def.onTips) continue;
        if (def.groupMember) continue;
        const dt = def.dataType;
        let colType;
        if (dt === 'real' || dt === 'integer' || dt === 'proportion' || dt === 'percentage') {
          colType = 'numeric';
        } else if (dt === 'date') {
          colType = 'date';
        } else if (dt === 'categorical' || dt === 'ordinal') {
          colType = 'string';
        } else {
          continue; // skip list, etc.
        }
        items.push({ value: name, label: def.label ?? name, colType });
      }
      if (!items.some(i => i.value === _col)) {
        _col     = '__name__';
        _colType = 'string';
        _op      = 'contains';
      }
      if (colPopup) {
        colPopup.innerHTML = '';
        for (const { value, label, colType } of items) {
          const btn = document.createElement('button');
          btn.className = 'pt-fcp-item' + (value === _col ? ' active' : '');
          btn.textContent = label;
          btn.dataset.value   = value;
          btn.dataset.colType = colType;
          colPopup.appendChild(btn);
        }
      }
      const activeItem = items.find(i => i.value === _col) ?? items[0];
      if (btnSrcIn) btnSrcIn.title = `Search in: ${activeItem.label}`;
      const opLabel = _opsForType().find(x => x.op === _op)?.label ?? _op;
      if (btnOp) btnOp.title = `Match condition: ${opLabel}`;
      _updatePlaceholder();
    },

    /** Rebuild the named-filter popup. Call whenever the filter map changes. */
    setNamedFilters(_map) {
      _rebuildNamedPopup();
    },

    /** Returns the current raw text input value. */
    getInputValue() {
      return inputEl?.value ?? '';
    },

    /** Returns the currently active named filter id (or null). */
    getActiveNamedFilterId() {
      return _activeNamedId;
    },

    /** Remove all document-level event listeners (call when tearing down). */
    destroy() {
      document.removeEventListener('click', _onDocClick);
      if (_onEsc) document.removeEventListener('keydown', _onEsc, true);
    },
  };
}
