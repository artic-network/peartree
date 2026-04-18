// filter-manager.js — Named annotation filter system for PearTree.
//
// Filters are persistent named rules that can be applied to display features
// (node bars, node/tip/branch labels, node/tip shapes) to control visibility
// on a per-node/per-tip basis.
//
// Data model:
//   Filter      { id: string, name: string, root: FilterGroup }
//   FilterGroup { logic: 'AND'|'OR', items: (Condition | FilterGroup)[] }
//   Condition   { field: string, operator: string, value?: any, values?: string[] }
//
// A FilterGroup's `items` are discriminated by whether they have a `logic` key
// (FilterGroup) or a `field` key (Condition).
//
// ─────────────────────────────────────────────────────────────────────────────

import { htmlEsc as esc } from './utils.js';
import { dateToDecimalYear, TreeCalibration } from './phylograph.js';

// ── Evaluator ─────────────────────────────────────────────────────────────────

/** Evaluate a condition against a node's annotations. Returns true = passes. */
function _evalCondition(cond, annotations) {
  const raw = annotations?.[cond.field];
  const op  = cond.operator;

  // Missing value: only negations pass
  if (raw === undefined || raw === null) {
    return op === '!=' || op === 'not in' || op === 'not contains' ||
           op === 'not starts with' || op === 'not ends with' || op === 'not regex' ||
           op === 'not in year' || op === 'month is not';
  }

  // Numeric operators
  if (op === '>=' || op === '<=' || op === '>' || op === '<') {
    const v = parseFloat(raw);
    const t = parseFloat(cond.value);
    if (!isFinite(v) || !isFinite(t)) return false;
    if (op === '>=') return v >= t;
    if (op === '<=') return v <= t;
    if (op === '>') return v > t;
    if (op === '<') return v < t;
  }

  // Equality
  if (op === '=')  return String(raw) === String(cond.value);
  if (op === '!=') return String(raw) !== String(cond.value);

  // Set membership (categorical)
  if (op === 'in' || op === 'not in') {
    const vals = cond.values ?? [];
    const hit  = vals.some(v => String(v) === String(raw));
    return op === 'in' ? hit : !hit;
  }

  // Date operators
  if (_isDateOp(op)) {
    const rawDec = dateToDecimalYear(String(raw));
    if (!isFinite(rawDec)) return op === '!=' || op === 'not in year' || op === 'month is not';
    if (op === 'in year' || op === 'not in year') {
      const y = parseInt(cond.value);
      const hit = isFinite(y) && Math.floor(rawDec) === y;
      return op === 'in year' ? hit : !hit;
    }
    if (op === 'month is' || op === 'month is not') {
      const { month } = TreeCalibration.decYearToDate(rawDec);
      const hit = month === parseInt(cond.value);
      return op === 'month is' ? hit : !hit;
    }
    const valDec = dateToDecimalYear(String(cond.value ?? ''));
    if (!isFinite(valDec)) return false;
    const EPS = 1 / (365 * 48); // ~30-minute tolerance for exact equality
    if (op === 'before')       return rawDec < valDec - EPS;
    if (op === 'after')        return rawDec > valDec + EPS;
    if (op === 'on or before') return rawDec <= valDec + EPS;
    if (op === 'on or after')  return rawDec >= valDec - EPS;
    if (op === '=')            return Math.abs(rawDec - valDec) <= EPS;
    if (op === '!=')           return Math.abs(rawDec - valDec) >  EPS;
  }

  // String operators
  const cs   = cond.caseSensitive === true;
  const sRaw = cs ? String(raw) : String(raw).toLowerCase();
  const sVal = cs ? String(cond.value ?? '') : String(cond.value ?? '').toLowerCase();

  if (op === 'contains')      return sRaw.includes(sVal);
  if (op === 'not contains')  return !sRaw.includes(sVal);
  if (op === 'starts with')   return sRaw.startsWith(sVal);
  if (op === 'not starts with') return !sRaw.startsWith(sVal);
  if (op === 'ends with')     return sRaw.endsWith(sVal);
  if (op === 'not ends with') return !sRaw.endsWith(sVal);
  if (op === 'regex') {
    try {
      const re = new RegExp(String(cond.value ?? ''), cs ? '' : 'i');
      return re.test(String(raw));
    } catch { return false; }
  }
  if (op === 'not regex') {
    try {
      const re = new RegExp(String(cond.value ?? ''), cs ? '' : 'i');
      return !re.test(String(raw));
    } catch { return true; }
  }

  return true;
}

const _DATE_OPS = ['before', 'after', 'on or before', 'on or after', '=', '!=', 'in year', 'not in year', 'month is', 'month is not'];
function _isDateOp(op) { return _DATE_OPS.includes(op); }

/** Recursively evaluate a FilterGroup. Short-circuits on AND false / OR true. */
function _evalGroup(group, annotations) {
  const isAnd = group.logic !== 'OR';
  for (const item of group.items) {
    const result = item.logic !== undefined
      ? _evalGroup(item, annotations)
      : _evalCondition(item, annotations);
    if (isAnd && !result) return false;
    if (!isAnd && result) return true;
  }
  // AND with all passing → true; OR with none passing → false
  return isAnd ? true : false;
}

/**
 * Evaluate a filter definition against a node's annotations.
 * Returns true if the node passes (should be shown), false otherwise.
 * An empty filter (no items) passes everything.
 */
export function evaluateFilter(filter, annotations) {
  if (!filter?.root?.items?.length) return true;
  return _evalGroup(filter.root, annotations);
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create the filter manager dialog controller.
 *
 * @param {Object}   opts
 * @param {Function} opts.getSchema       – () => Map<name, AnnotationDef> | null
 * @param {Function} opts.onFiltersChange – (Map<id, Filter>) called whenever filters are saved
 * @param {Function} opts.onSaveRequest   – optional, called with exportable JSON blob URL (for save dialog)
 * @returns {{ open, close, getAll, setAll, evaluateFilter }}
 */
export function createFilterManager({ getSchema, onFiltersChange, onSaveRequest, showConfirm }) {
  const overlay  = document.getElementById('manage-filters-overlay');
  const listEl   = document.getElementById('filter-list');
  const editorEl = document.getElementById('filter-editor');

  /** Master filter store: Map<id, Filter> */
  let _filters = new Map();

  /** ID of the filter currently open in the editor pane (null = none) */
  let _editingId = null;

  /** Working copy of the filter being edited (deep-cloned on edit open) */
  let _draft = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  document.getElementById('manage-filters-close').addEventListener('click', close);
  document.getElementById('manage-filters-close-footer')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  });

  document.getElementById('filter-new-btn').addEventListener('click', _createNew);
  document.getElementById('filter-import-btn').addEventListener('click', _importFilters);
  document.getElementById('filter-export-btn').addEventListener('click', _exportFilters);

  function open() {
    _editingId = null;
    _draft     = null;
    _renderList();
    _renderEditor(null);
    overlay.classList.add('open');
  }

  function close() {
    overlay.classList.remove('open');
  }

  /** Return a copy of the current filter map. */
  function getAll() { return new Map(_filters); }

  /** Replace the entire filter map (e.g. on settings load). */
  function setAll(map) {
    _filters = new Map(map);
  }

  // ── List pane ──────────────────────────────────────────────────────────────

  function _renderList() {
    if (_filters.size === 0) {
      listEl.innerHTML = '<div class="fm-empty">No filters yet.<br>Click <strong>New Filter</strong> to create one.</div>';
      return;
    }
    listEl.innerHTML = [..._filters.values()].map(f => `
      <div class="fm-list-row${_editingId === f.id ? ' active' : ''}" data-id="${esc(f.id)}">
        <span class="fm-list-name">${esc(f.name)}</span>
        <div class="fm-list-actions">
          <button class="btn btn-xs btn-outline-secondary fm-edit-btn" data-id="${esc(f.id)}" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-xs btn-outline-danger fm-del-btn" data-id="${esc(f.id)}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>`).join('');

    listEl.querySelectorAll('.fm-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => _openEdit(btn.dataset.id)));
    listEl.querySelectorAll('.fm-del-btn').forEach(btn =>
      btn.addEventListener('click', () => _deleteFilter(btn.dataset.id)));
  }

  function _deleteFilter(id) {
    const f    = _filters.get(id);
    const name = f?.name ? `\u201c${f.name}\u201d` : 'this filter';
    const confirmed = showConfirm
      ? showConfirm('Delete filter', `Delete ${name}?`)
      : Promise.resolve(window.confirm(`Delete ${name}?`));
    Promise.resolve(confirmed).then(ok => {
      if (!ok) return;
      _filters.delete(id);
      if (_editingId === id) { _editingId = null; _draft = null; _renderEditor(null); }
      _renderList();
      onFiltersChange(new Map(_filters));
    });
  }

  // ── Editor pane ────────────────────────────────────────────────────────────

  function _createNew() {
    _draft = {
      id:   `filter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      root: { logic: 'AND', items: [] },
    };
    _editingId = _draft.id;
    _renderList();
    _renderEditor(_draft);
  }

  function _openEdit(id) {
    const f = _filters.get(id);
    if (!f) return;
    _draft     = _deepClone(f);
    _editingId = id;
    _renderList();
    _renderEditor(_draft);
  }

  function _renderEditor(draft) {
    if (!draft) {
      editorEl.innerHTML = `<div class="fm-editor-empty">← Select a filter to edit, or click <strong>New Filter</strong></div>`;
      return;
    }

    editorEl.innerHTML = `
      <div class="fm-editor-header">
        <div class="fm-name-row">
          <label class="fm-label" for="filter-name-input">Name</label>
          <input type="text" id="filter-name-input" class="fm-name-input" value="${esc(draft.name)}" placeholder="Filter name…" autocomplete="off" spellcheck="false">
        </div>
      </div>
      <div class="fm-group-root" id="fm-root-group"></div>
      <div class="fm-editor-footer">
        <button id="fm-save-btn" class="btn btn-sm btn-primary">Save</button>
        <button id="fm-cancel-btn" class="btn btn-sm btn-secondary">Cancel</button>
      </div>`;

    editorEl.querySelector('#fm-save-btn').addEventListener('click', _saveDraft);
    editorEl.querySelector('#fm-cancel-btn').addEventListener('click', () => {
      _editingId = null; _draft = null;
      _renderList();
      _renderEditor(null);
    });
    editorEl.querySelector('#filter-name-input').addEventListener('input', e => {
      if (_draft) _draft.name = e.target.value;
    });

    const rootGroupEl = editorEl.querySelector('#fm-root-group');
    _parentMap = new Map();
    _renderGroup(rootGroupEl, draft.root, 0, null);
  }

  /** Render a FilterGroup's items and its add-buttons into `container`. */
  function _renderGroup(container, group, depth, parentGroup) {
    _parentMap.set(group, parentGroup ?? null);
    container.dataset.depth = depth;

    // Logic toggle row
    const toggleRow = document.createElement('div');
    toggleRow.className = 'fm-logic-row';
    toggleRow.innerHTML = `
      <span class="fm-logic-label">Match</span>
      <button class="fm-logic-btn${group.logic === 'AND' ? ' active' : ''}" data-logic="AND">ALL (AND)</button>
      <button class="fm-logic-btn${group.logic === 'OR'  ? ' active' : ''}" data-logic="OR">ANY (OR)</button>
      ${depth > 0 ? `<button class="fm-remove-group-btn btn btn-xs btn-outline-danger ms-auto" title="Remove group"><i class="bi bi-x-lg"></i></button>` : ''}`;
    container.appendChild(toggleRow);

    toggleRow.querySelectorAll('.fm-logic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.logic = btn.dataset.logic;
        toggleRow.querySelectorAll('.fm-logic-btn').forEach(b => b.classList.toggle('active', b.dataset.logic === group.logic));
      });
    });
    toggleRow.querySelector('.fm-remove-group-btn')?.addEventListener('click', () => {
      _removeGroupFromParent(group);
    });

    // Items container
    const itemsEl = document.createElement('div');
    itemsEl.className = 'fm-group-items';
    container.appendChild(itemsEl);

    // Render each existing item
    for (const item of group.items) {
      if (item.logic !== undefined) {
        const subEl = document.createElement('div');
        subEl.className = 'fm-group fm-subgroup';
        itemsEl.appendChild(subEl);
        _renderGroup(subEl, item, depth + 1, group);
      } else {
        itemsEl.appendChild(_buildConditionRow(item, group));
      }
    }

    // Add-buttons footer
    const addRow = document.createElement('div');
    addRow.className = 'fm-add-row';
    addRow.innerHTML = `
      <button class="btn btn-xs btn-outline-secondary fm-add-cond-btn"><i class="bi bi-plus me-1"></i>Condition</button>
      ${depth < 2 ? `<button class="btn btn-xs btn-outline-secondary fm-add-group-btn"><i class="bi bi-plus me-1"></i>Group</button>` : ''}`;
    container.appendChild(addRow);

    addRow.querySelector('.fm-add-cond-btn').addEventListener('click', () => {
      const schema = getSchema?.();
      const newCond = { field: '__name__', operator: 'contains', value: '' };
      group.items.push(newCond);
      const rowEl = _buildConditionRow(newCond, group);
      addRow.before(rowEl);
    });
    addRow.querySelector('.fm-add-group-btn')?.addEventListener('click', () => {
      const newGroup = { logic: 'AND', items: [] };
      group.items.push(newGroup);
      const subEl = document.createElement('div');
      subEl.className = 'fm-group fm-subgroup';
      addRow.before(subEl);
      _renderGroup(subEl, newGroup, depth + 1, group);
    });
  }

  // Map from FilterGroup → its parent group, so we can splice it out on delete.
  // Rebuilt each render; must be a regular Map (not WeakMap) since keys are draft sub-objects.
  let _parentMap = new Map();

  function _removeGroupFromParent(group) {
    const parent = _parentMap.get(group);
    if (!parent) return;
    const idx = parent.items.indexOf(group);
    if (idx !== -1) parent.items.splice(idx, 1);
    // Re-render the whole editor for simplicity (group tree is small)
    _renderEditor(_draft);
  }

  // Synthetic __name__ field descriptor (tip name)
  const NAME_FIELD = { label: 'Tip Name', dataType: 'text', onTips: true, onNodes: false, groupMember: false };

  /** Build field <option> list: __name__ first, then schema fields. */
  function _buildFieldOpts(cond, schema) {
    const nameOpt = `<option value="__name__"${cond.field === '__name__' ? ' selected' : ''}>Tip Name</option>`;
    const rest = schema
      ? [...schema.entries()]
          .filter(([k, d]) => !k.startsWith('__') && !d.groupMember)
          .map(([k, d]) => `<option value="${esc(k)}"${cond.field === k ? ' selected' : ''}>${esc(d.label ?? k)}</option>`)
          .join('')
      : (cond.field && cond.field !== '__name__' ? `<option value="${esc(cond.field)}">${esc(cond.field)}</option>` : '');
    return nameOpt + rest;
  }

  /** Look up field descriptor from schema, falling back to NAME_FIELD for __name__. */
  function _getFieldDef(field, schema) {
    if (field === '__name__') return NAME_FIELD;
    return schema?.get(field) ?? null;
  }

  /** Build a DOM row for a single Condition. Mutations write back into `cond`. */
  function _buildConditionRow(cond, parentGroup) {
    const schema   = getSchema?.();
    const fieldOpts = _buildFieldOpts(cond, schema);

    const row = document.createElement('div');
    row.className = 'fm-cond-row';
    row.innerHTML = `
      <select class="fm-sel fm-field-sel">${fieldOpts}</select>
      <select class="fm-sel fm-op-sel">${_opOptions(cond, schema)}</select>
      <div class="fm-val-wrap">${_valueWidget(cond, schema)}</div>
      <button class="fm-remove-cond-btn btn btn-xs btn-outline-danger" title="Remove condition"><i class="bi bi-x-lg"></i></button>`;

    const fieldSel = row.querySelector('.fm-field-sel');
    const opSel    = row.querySelector('.fm-op-sel');
    const valWrap  = row.querySelector('.fm-val-wrap');

    fieldSel.addEventListener('change', () => {
      cond.field    = fieldSel.value;
      cond.operator = _defaultOp(cond.field, schema);
      cond.value    = '';
      delete cond.values;
      delete cond.caseSensitive;
      opSel.innerHTML = _opOptions(cond, schema);
      valWrap.innerHTML = _valueWidget(cond, schema);
      _rewireValueWrap(valWrap, cond, schema);
    });
    opSel.addEventListener('change', () => {
      const wasString = _isStringOp(cond.operator);
      const isString  = _isStringOp(opSel.value);
      const wasDate   = _isDateOp(cond.operator);
      const isDate    = _isDateOp(opSel.value);
      cond.operator = opSel.value;
      if (!isString) delete cond.caseSensitive;
      // preserve value when staying within date ops (except month/year switches)
      const keptGroups = ['month is,month is not', 'in year,not in year'];
      const sameGroup  = keptGroups.some(g => g.includes(cond.operator) && g.includes(opSel.value));
      if (!sameGroup && (!wasDate || !isDate) && (!wasString || !isString)) {
        cond.value = '';
        delete cond.values;
      }
      valWrap.innerHTML = _valueWidget(cond, schema);
      _rewireValueWrap(valWrap, cond, schema);
    });
    _rewireValueWrap(valWrap, cond, schema);

    row.querySelector('.fm-remove-cond-btn').addEventListener('click', () => {
      const idx = parentGroup.items.indexOf(cond);
      if (idx !== -1) parentGroup.items.splice(idx, 1);
      row.remove();
    });

    return row;
  }

  /** Wire value-input events after (re)building the value widget. */
  function _rewireValueWrap(wrap, cond, schema) {
    const inp = wrap.querySelector('.fm-val-input');
    if (inp) {
      inp.addEventListener('input', () => { cond.value = inp.value; });
    }
    const csChk = wrap.querySelector('.fm-cs-checkbox');
    if (csChk) {
      csChk.addEventListener('change', () => { cond.caseSensitive = csChk.checked; });
    }
    const monthSel = wrap.querySelector('.fm-val-month-sel');
    if (monthSel) {
      // Init value if empty
      if (!cond.value) cond.value = parseInt(monthSel.value);
      monthSel.addEventListener('change', () => { cond.value = parseInt(monthSel.value); });
    }
    const addBtn = wrap.querySelector('.fm-chip-add');
    const chipInput = wrap.querySelector('.fm-chip-input');
    if (addBtn && chipInput) {
      const addChip = () => {
        const v = chipInput.value.trim();
        if (!v) return;
        if (!cond.values) cond.values = [];
        if (!cond.values.includes(v)) {
          cond.values.push(v);
          _appendChip(wrap.querySelector('.fm-chips'), v, cond);
        }
        chipInput.value = '';
      };
      addBtn.addEventListener('click', addChip);
      chipInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addChip(); } });

      // Autocomplete from observed values
      const def = schema?.get(cond.field);
      if (def?.values?.length) {
        const dl = document.createElement('datalist');
        dl.id = `fm-dl-${Math.random().toString(36).slice(2)}`;
        def.values.forEach(v => { const opt = document.createElement('option'); opt.value = String(v); dl.appendChild(opt); });
        wrap.appendChild(dl);
        chipInput.setAttribute('list', dl.id);
      }

      // Render any already-set chips (e.g. on editor re-open)
      if (cond.values?.length) {
        const chipsEl = wrap.querySelector('.fm-chips');
        cond.values.forEach(v => _appendChip(chipsEl, v, cond));
      }
    }
  }

  function _appendChip(chipsEl, v, cond) {
    const chip = document.createElement('span');
    chip.className = 'fm-chip';
    chip.innerHTML = `${esc(v)}<button class="fm-chip-del" title="Remove">&times;</button>`;
    chip.querySelector('.fm-chip-del').addEventListener('click', () => {
      if (cond.values) {
        const i = cond.values.indexOf(v);
        if (i !== -1) cond.values.splice(i, 1);
      }
      chip.remove();
    });
    chipsEl.appendChild(chip);
  }

  function _defaultOp(field, schema) {
    const def = _getFieldDef(field, schema);
    if (!def) return '=';
    if (_isNumericField(def)) return '>=';
    if (_isTextField(def))    return 'contains';
    if (def.dataType === 'date') return 'after';
    return '=';
  }

  function _isNumericField(def) {
    return def && ['real', 'integer', 'proportion', 'percentage'].includes(def.dataType);
  }

  function _isTextField(def) {
    return def && (def.dataType === 'text' || def.dataType === 'string');
  }

  function _isStringOp(op) {
    return ['contains', 'not contains', 'starts with', 'not starts with',
            'ends with', 'not ends with', 'regex', 'not regex'].includes(op);
  }

  const _STRING_OP_LABELS = {
    'contains':       'contains',
    'not contains':   'not contains',
    'starts with':    'starts with',
    'not starts with':'not starts with',
    'ends with':      'ends with',
    'not ends with':  'not ends with',
    'regex':          'matches regex',
    'not regex':      'not matches regex',
  };

  const _DATE_OP_LABELS = {
    'before':       'before',
    'after':        'after',
    'on or before': 'on or before',
    'on or after':  'on or after',
    '=':            'is exactly',
    '!=':           'is not exactly',
    'in year':      'in year',
    'not in year':  'not in year',
    'month is':     'month is',
    'month is not': 'month is not',
  };

  function _opOptions(cond, schema) {
    const def    = _getFieldDef(cond.field, schema);
    const isNum  = _isNumericField(def);
    const isDate = def?.dataType === 'date';
    const isText = _isTextField(def);
    let ops, labels;
    if (isNum) {
      ops = ['>=', '<=', '>', '<', '=', '!='];
      labels = null;
    } else if (isDate) {
      ops    = ['before', 'after', 'on or before', 'on or after', '=', '!=', 'in year', 'not in year', 'month is', 'month is not'];
      labels = _DATE_OP_LABELS;
    } else if (isText) {
      ops = ['contains', 'not contains', 'starts with', 'not starts with',
             'ends with', 'not ends with', 'regex', 'not regex', '=', '!='];
      labels = _STRING_OP_LABELS;
    } else {
      ops = ['=', '!=', 'in', 'not in',
             'contains', 'not contains', 'starts with', 'not starts with',
             'ends with', 'not ends with', 'regex', 'not regex'];
      labels = _STRING_OP_LABELS;
    }
    return ops.map(o => {
      const lbl = labels?.[o] ?? o;
      return `<option value="${o}"${cond.operator === o ? ' selected' : ''}>${lbl}</option>`;
    }).join('');
  }

  const _MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function _valueWidget(cond, schema) {
    const op     = cond.operator;
    const isStr  = _isStringOp(op);
    const csChecked = cond.caseSensitive === true ? ' checked' : '';
    const csChk  = isStr
      ? `<label class="fm-cs-label" title="Case sensitive"><input type="checkbox" class="fm-cs-checkbox"${csChecked}> Aa</label>`
      : '';
    if (op === 'in' || op === 'not in') {
      return `<div class="fm-chips"></div><div class="fm-chip-row"><input type="text" class="fm-chip-input" placeholder="value…" autocomplete="off" spellcheck="false"><button class="btn btn-xs btn-outline-secondary fm-chip-add"><i class="bi bi-plus"></i></button></div>`;
    }
    if (op === 'month is' || op === 'month is not') {
      const cur = parseInt(cond.value) || 1;
      const opts = _MONTHS.map((m, i) => `<option value="${i+1}"${cur === i+1 ? ' selected' : ''}>${m}</option>`).join('');
      return `<select class="fm-sel fm-val-month-sel">${opts}</select>`;
    }
    if (op === 'in year' || op === 'not in year') {
      return `<input type="number" class="fm-val-input" value="${esc(String(cond.value ?? ''))}" placeholder="YYYY" min="1000" max="3000" step="1" autocomplete="off">`;
    }
    const def   = _getFieldDef(cond.field, schema);
    const isNum = _isNumericField(def);
    const isDate = def?.dataType === 'date';
    if (isDate) {
      const ph = def.min ? esc(def.min) : 'YYYY-MM-DD';
      return `<input type="text" class="fm-val-input fm-date-input" value="${esc(String(cond.value ?? ''))}" placeholder="${ph}" autocomplete="off" spellcheck="false">`;
    }
    return `<input type="${isNum ? 'number' : 'text'}" class="fm-val-input" value="${esc(String(cond.value ?? ''))}" placeholder="value…" autocomplete="off" spellcheck="false" step="any">${csChk}`;
  }

  // ── Save / Cancel ──────────────────────────────────────────────────────────

  function _saveDraft() {
    if (!_draft) return;
    const name = editorEl.querySelector('#filter-name-input')?.value.trim();
    if (!name) {
      editorEl.querySelector('#filter-name-input')?.focus();
      return;
    }
    // Check if another filter (different id) already has this name
    const duplicate = [..._filters.values()].find(
      f => f.id !== _draft.id && f.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      const confirmed = showConfirm
        ? showConfirm(
            'Overwrite filter',
            `A filter named "${duplicate.name}" already exists. Overwrite it?`
          )
        : Promise.resolve(window.confirm(`A filter named "${duplicate.name}" already exists. Overwrite it?`));
      Promise.resolve(confirmed).then(ok => {
        if (!ok) return;
        // Remove the old duplicate entry, then save the draft under its own id
        _filters.delete(duplicate.id);
        _draft.name = name;
        _filters.set(_draft.id, _deepClone(_draft));
        _editingId = null;
        _draft     = null;
        _renderList();
        _renderEditor(null);
        onFiltersChange(new Map(_filters));
      });
      return;
    }
    _draft.name = name;
    _filters.set(_draft.id, _deepClone(_draft));
    _editingId = null;
    _draft     = null;
    _renderList();
    _renderEditor(null);
    onFiltersChange(new Map(_filters));
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function _exportFilters() {
    if (_filters.size === 0) return;
    const json = JSON.stringify([..._filters.values()], null, 2);
    if (onSaveRequest) {
      onSaveRequest({ content: json, filename: 'peartree-filters.json' });
      return;
    }
    // Fallback: browser download
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a   = document.createElement('a');
    a.href = url; a.download = 'peartree-filters.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function _importFilters() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const arr  = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('Expected a JSON array of filters');
        for (const f of arr) {
          if (!f.id || !f.name || !f.root) throw new Error(`Invalid filter entry: ${JSON.stringify(f)}`);
          // Avoid id collision with existing filters
          if (_filters.has(f.id)) {
            f.id = `${f.id}-${Date.now()}`;
          }
          _filters.set(f.id, f);
        }
        _renderList();
        onFiltersChange(new Map(_filters));
      } catch (err) {
        alert(`Failed to import filters: ${err.message}`);
      }
    });
    input.click();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    open,
    close,
    getAll,
    setAll,
    /** Evaluate filterId against node annotations. true = passes (show). */
    evaluateFilter(filterId, annotations) {
      if (!filterId) return true;
      const f = _filters.get(filterId);
      if (!f) return true;
      return evaluateFilter(f, annotations);
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
