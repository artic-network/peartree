// annotcurator.js — Annotation curation dialog.
// Lets the user inspect, retype and adjust scale bounds for annotations
// to annotations loaded from a tree file or imported from CSV/TSV.
// ─────────────────────────────────────────────────────────────────────────────

import { makeAnnotationFormatter, buildAnnotationSchema, isNumericType } from './phylograph.js';

/** @private HTML-escape a value for safe insertion. */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** @private Format a number compactly for display in table cells. */
function _fmtNum(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e5 || (a < 0.001 && v !== 0)) return v.toExponential(3);
  return parseFloat(v.toPrecision(5)).toString();
}

/**
 * Create the annotation curation dialog controller.
 *
 * @param {Object}   opts
 * @param {Function} opts.getGraph   – () => current PhyloGraph (has .annotationSchema and .nodes)
 * @param {Function} opts.onApply   – (modifiedSchema) called with the patched Map after Apply.
 *                                    Caller should call _refreshAnnotationUIs(schema) and
 *                                    renderer.setAnnotationSchema(schema).
 * @returns {{ open: Function, close: Function }}
 */
export function createAnnotCurator({ getGraph, onApply, onTableColumnsChange, getTableColumns }) {
  const overlay  = document.getElementById('curate-annot-overlay');
  const tbody    = document.getElementById('curate-annot-tbody');
  const detail   = document.getElementById('curate-annot-detail');
  const applyBtn = document.getElementById('curate-annot-apply');

  // Pending edits per annotation name, cleared on each open().
  // Map<name, { dataType?, min?, max?, fixedBounds?, _boundsMode? }>
  let _pending  = new Map();
  let _deleted  = new Set();  // names marked for deletion, applied at Apply time
  let _selected = null;   // name of currently selected row

  // Columns currently shown in the data table panel.
  // Initialised from getTableColumns() if provided, otherwise empty.
  let _tableColumns = new Set(getTableColumns ? getTableColumns() : []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  document.getElementById('curate-annot-close') .addEventListener('click', close);
  document.getElementById('curate-annot-cancel').addEventListener('click', close);
  applyBtn.addEventListener('click', _apply);

  // Parse Tips sub-dialog
  const parseTipsOverlay = document.getElementById('parse-tips-overlay');
  document.getElementById('curate-annot-parse-tips').addEventListener('click', _openParseTips);
  document.getElementById('parse-tips-close') .addEventListener('click', _closeParseTips);
  document.getElementById('parse-tips-cancel').addEventListener('click', _closeParseTips);
  document.getElementById('parse-tips-ok')    .addEventListener('click', _runParseTips);
  parseTipsOverlay.addEventListener('click', e => { if (e.target === parseTipsOverlay) _closeParseTips(); });
  // Allow Enter key to submit the sub-dialog
  parseTipsOverlay.addEventListener('keydown', e => { if (e.key === 'Enter') _runParseTips(); });

  // Close on backdrop click (outside the white modal box).
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  function open() {
    const graph = getGraph();
    if (!graph?.annotationSchema) return;
    _pending.clear();
    _deleted.clear();
    _selected = null;
    _renderTable(graph.annotationSchema);
    _renderDetail(null, null);
    overlay.classList.add('open');
  }

  function close() {
    overlay.classList.remove('open');
  }

  function _apply() {
    const graph = getGraph();
    if (!graph) return;

    if (_deleted.size > 0) {
      const names = [..._deleted].join(', ');
      const plural = _deleted.size === 1 ? 'annotation' : 'annotations';
      if (!confirm(`Permanently delete ${_deleted.size} ${plural}?\n\n${names}\n\nThis cannot be undone.`)) return;
    }

    const schema = _buildModifiedSchema(graph);
    // Remove any deleted annotations from the table-column selection
    if (onTableColumnsChange) {
      let changed = false;
      for (const name of _deleted) {
        if (_tableColumns.delete(name)) changed = true;
      }
      if (changed) onTableColumnsChange([..._tableColumns]);
    }
    onApply(schema);
    graph.annotationSchema = schema;
    close();
  }

  // ── Table rendering ───────────────────────────────────────────────────────

  function _renderTable(schema) {
    const rows = [];

    // ── Synthetic 'Names' row (always first, never deletable) ────────────────
    const namesInTable = _tableColumns.has('__names__');
    rows.push(`
      <tr data-name="__names__" class="ca-row-fixed">
        <td><span class="ca-name">Names</span>
          <span style="margin-left:5px;font-size:0.68rem;color:rgba(255,255,255,0.3);font-style:italic">tip labels</span></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="ca-center">
          <input type="checkbox" class="ca-table-chk" data-name="__names__"
            ${namesInTable ? 'checked' : ''}
            title="Show tip names in data table panel"
            style="cursor:pointer;accent-color:var(--pt-teal,#2aa198)">
        </td>
        <td class="ca-center"><span style="color:rgba(255,255,255,0.15)" title="Cannot be deleted">—</span></td>
      </tr>`);

    for (const [name, def] of schema) {
      if (name === 'user_colour') continue;
      if (def.groupMember) continue;

      const isDeleted = _deleted.has(name);
      const p         = _pending.get(name) ?? {};
      const type      = p.dataType  ?? def.dataType;
      const isNum     = isNumericType(type);

      // Observed range (always from original data)
      const obsMin = def.observedMin ?? def.min;
      const obsMax = def.observedMax ?? def.max;

      // Scale range — may be overridden by bounds preset or custom values
      const scaleMin = p.min !== undefined ? p.min : def.min;
      const scaleMax = p.max !== undefined ? p.max : def.max;
      const boundsOverridden = p.min !== undefined || p.max !== undefined ||
                               p._boundsMode === 'nonneg' || p._boundsMode === 'prob';
      const boundsColor = (def.fixedBounds || boundsOverridden)
        ? 'var(--pt-gold)' : 'rgba(255,255,255,0.4)';

      const onStr = (def.onTips && def.onNodes) ? 'T+N' : (def.onTips ? 'T' : 'N');
      const isSelected = name === _selected;

      // Observed column
      let obsCell;
      if (isNum) {
        obsCell = `<span style="font-family:monospace">${_fmtNum(obsMin)}</span>
                   <span style="color:rgba(255,255,255,0.3);padding:0 3px">…</span>
                   <span style="font-family:monospace">${_fmtNum(obsMax)}</span>`;
      } else if (type === 'date' && def.min != null && def.max != null) {
        obsCell = `<span style="font-family:monospace">${esc(def.min)}</span>
                   <span style="color:rgba(255,255,255,0.3);padding:0 3px">…</span>
                   <span style="font-family:monospace">${esc(def.max)}</span>`;
      } else if (type === 'categorical' && def.values) {
        obsCell = `<span style="color:rgba(255,255,255,0.5)">${def.values.length} values</span>`;
      } else {
        obsCell = '<span style="color:rgba(255,255,255,0.3)">—</span>';
      }

      // Scale bounds column
      let boundsCell;
      if (isNum) {
        boundsCell = `<span style="font-family:monospace;color:${boundsColor}">${_fmtNum(scaleMin)}</span>
                      <span style="color:rgba(255,255,255,0.3);padding:0 3px">…</span>
                      <span style="font-family:monospace;color:${boundsColor}">${_fmtNum(scaleMax)}</span>`;
      } else {
        boundsCell = '<span style="color:rgba(255,255,255,0.2)">—</span>';
      }

      // Has pending changes marker
      const hasPending = !isDeleted && _pending.has(name) && Object.keys(_pending.get(name)).length > 0;

      const rowAttr = isDeleted ? ' class="ca-row-deleted"' : (isSelected ? ' class="selected"' : '');
      const delBtn  = isDeleted
        ? `<button class="ca-del-btn ca-reinstate-btn" data-name="${esc(name)}" title="Reinstate" tabindex="-1"><i class="bi bi-arrow-counterclockwise"></i></button>`
        : `<button class="ca-del-btn" data-name="${esc(name)}" title="Delete annotation" tabindex="-1"><i class="bi bi-trash3"></i></button>`;

      rows.push(`
        <tr data-name="${esc(name)}"${rowAttr}>
          <td>
            ${hasPending ? '<span class="ca-pending-dot" title="Unsaved changes"></span>' : ''}
            <span class="ca-name">${esc(name)}</span>
          </td>
          <td><span class="ca-type-badge ca-type-${esc(type)}">${esc(type)}</span></td>
          <td class="ca-center" style="color:rgba(255,255,255,0.45);font-size:0.72rem">${onStr}</td>
          <td>${obsCell}</td>
          <td>${boundsCell}</td>
          <td class="ca-center">
            <input type="checkbox" class="ca-table-chk" data-name="${esc(name)}"
              ${_tableColumns.has(name) ? 'checked' : ''}
              title="Show in data table panel"
              style="cursor:pointer;accent-color:var(--pt-teal,#2aa198)">
          </td>
          <td class="ca-center">${delBtn}</td>
        </tr>`);
    }

    tbody.innerHTML = rows.length ? rows.join('') :
      '<tr><td colspan="7" style="text-align:center;color:rgba(255,255,255,0.3);padding:16px">No annotations</td></tr>';

    // Table checkbox handlers
    for (const chk of tbody.querySelectorAll('.ca-table-chk')) {
      chk.addEventListener('click', e => {
        e.stopPropagation();
        const chkName = chk.dataset.name;
        if (chk.checked) { _tableColumns.add(chkName); }
        else             { _tableColumns.delete(chkName); }
        if (onTableColumnsChange) onTableColumnsChange([..._tableColumns]);
      });
    }

    // Delete / reinstate button handlers (before row-click so stopPropagation works)
    for (const btn of tbody.querySelectorAll('.ca-del-btn')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const btnName = btn.dataset.name;
        if (_deleted.has(btnName)) {
          _deleted.delete(btnName);
        } else {
          _deleted.add(btnName);
          _pending.delete(btnName);
          if (_selected === btnName) {
            _selected = null;
            _renderDetail(null, null);
          }
        }
        const schema = getGraph()?.annotationSchema;
        if (schema) _renderTable(schema);
      });
    }

    // Row click handlers
    for (const tr of tbody.querySelectorAll('tr[data-name]')) {
      tr.addEventListener('click', () => {
        const clickedName = tr.dataset.name;
        if (clickedName === '__names__') return;  // fixed row — no detail pane
        if (_deleted.has(clickedName)) return;  // greyed-out rows are not selectable
        if (_selected === clickedName) {
          // Clicking selected row again deselects
          _selected = null;
          tr.classList.remove('selected');
          _renderDetail(null, null);
          return;
        }
        _selected = clickedName;
        for (const r of tbody.querySelectorAll('tr')) r.classList.remove('selected');
        tr.classList.add('selected');
        const schema = getGraph()?.annotationSchema;
        if (schema) _renderDetail(clickedName, schema.get(clickedName));
      });
    }
  }

  // ── Detail pane rendering ─────────────────────────────────────────────────

  function _renderDetail(name, def) {
    if (!def) {
      detail.innerHTML = '<p class="ca-detail-empty">← Select an annotation row to edit its settings</p>';
      return;
    }

    const p           = _pending.get(name) ?? {};
    const currentType = p.dataType ?? def.dataType;
    const isNumeric   = isNumericType(currentType);
    const isDate      = currentType === 'date';
    const isBranchAnnot = p.isBranchAnnotation !== undefined
      ? p.isBranchAnnotation
      : (def.isBranchAnnotation ?? false);

    // Bounds state
    const scaleMin    = p.min !== undefined ? p.min : def.min;
    const scaleMax    = p.max !== undefined ? p.max : def.max;
    const boundsMode  = p._boundsMode ??
      (currentType === 'proportion' ? 'proportion' :
       currentType === 'percentage' ? 'percentage' :
       def.fixedBounds
        ? (def.min === 0 && def.max === 1 ? 'prob' : def.min === 0 ? 'nonneg' : 'custom')
        : 'auto');

    // ── Build HTML — pre-compute attribute strings to avoid nested ternaries ──

    const selInt    = currentType === 'integer'     ? ' selected' : '';
    const selReal   = currentType === 'real'        ? ' selected' : '';
    const selProp   = currentType === 'proportion'  ? ' selected' : '';
    const selPerc   = currentType === 'percentage'  ? ' selected' : '';
    const selCat    = currentType === 'categorical' ? ' selected' : '';
    const chkAuto   = boundsMode === 'auto'   ? ' checked' : '';
    const chkNonneg = boundsMode === 'nonneg' ? ' checked' : '';
    const chkProb   = boundsMode === 'prob'   ? ' checked' : '';
    const chkCustom = boundsMode === 'custom' ? ' checked' : '';
    const customVis = boundsMode === 'custom' ? '' : 'visibility:hidden;';
    const minVal    = scaleMin != null ? scaleMin : '';
    const maxVal    = scaleMax != null ? scaleMax : '';
    const obsMinStr = esc(_fmtNum(def.observedMin ?? def.min));
    const obsMaxStr = esc(_fmtNum(def.observedMax ?? def.max));

    let html = `<div class="ca-detail-header"><i class="bi bi-tag me-1"></i>${esc(name)}</div>`;

    // Type
    html += `<div class="ca-section-lbl">Interpret as</div>`
          + `<div class="ca-row"><label class="ca-row-lbl">Type</label>`
          + `<select id="cd-type" class="ca-sel">`;

    if (isNumericType(def.dataType)) {
      html += `<option value="integer"${selInt}>Integer — discrete</option>`
            + `<option value="real"${selReal}>Real — continuous</option>`
            + `<option value="proportion"${selProp}>Proportion [0–1] — fixed bounds</option>`
            + `<option value="percentage"${selPerc}>Percentage [0–100] — fixed bounds</option>`
            + `<option value="categorical"${selCat}>Categorical</option>`;
    } else {
      html += `<option value="${esc(def.dataType)}" selected>${esc(def.dataType)}</option>`;
    }
    html += `</select>`;
    if (def.dataType === 'integer' && currentType === 'categorical') {
      html += `<span class="ca-hint">integer values treated as string labels</span>`;
    }
    html += `</div>`;

    // Categorical values preview
    if (currentType === 'categorical' && def.values?.length) {
      const vals = def.values;
      let preview;
      if (vals.length <= 4) {
        preview = vals.map(v => `<span class="ca-mono" style="margin-right:6px">${esc(v)}</span>`).join('');
      } else {
        preview = [vals[0], vals[1], vals[2]].map(v => `<span class="ca-mono" style="margin-right:6px">${esc(v)}</span>`).join('')
                + `<span style="color:rgba(255,255,255,0.4);margin-right:6px">\u2026</span>`
                + `<span class="ca-mono">${esc(vals[vals.length - 1])}</span>`;
      }
      html += `<div class="ca-section-lbl" style="margin-top:10px">Values <span class="ca-hint">${vals.length} distinct</span></div>`
            + `<div class="ca-row" style="flex-wrap:wrap;gap:4px 0">${preview}</div>`;
    }

    // Date range (date type only)
    if (isDate && def.min != null && def.max != null) {
      html += `<div class="ca-section-lbl" style="margin-top:10px">Date range</div>`
            + `<div class="ca-row">`
            + `<label class="ca-row-lbl">Earliest</label>`
            + `<span class="ca-mono" style="margin-right:16px">${esc(def.min)}</span>`
            + `<label class="ca-row-lbl">Latest</label>`
            + `<span class="ca-mono">${esc(def.max)}</span>`
            + `<span class="ca-hint" style="margin-left:10px">${def.values ? def.values.length + ' distinct values' : ''}</span>`
            + `</div>`;
    }

    // Bounds (numeric only)
    if (isNumeric) {
      if (currentType === 'proportion' || currentType === 'percentage') {
        const [fbMin, fbMax] = currentType === 'proportion' ? [0, 1] : [0, 100];
        html += `<div class="ca-section-lbl" style="margin-top:10px">Scale bounds</div>`
              + `<div class="ca-row" style="color:rgba(255,255,255,0.55);font-size:0.78rem">`
              + `<i class="bi bi-lock-fill me-2" style="opacity:0.5"></i>`
              + `Fixed by type: <span class="ca-mono" style="margin:0 6px">${fbMin} … ${fbMax}</span>`
              + `<span class="ca-hint">(change type to Real to adjust)</span>`
              + `</div>`;
      } else {
        html += `<div class="ca-section-lbl" style="margin-top:10px">Scale bounds</div>`
            + `<div class="ca-row ca-wrap">`
            + `<label class="ca-chk-lbl"><input type="radio" name="cd-bounds" value="auto"${chkAuto}>`
            +   `Auto \u2014 observed <span class="ca-mono">${obsMinStr}\u2009\u2026\u2009${obsMaxStr}</span></label>`
            + `<label class="ca-chk-lbl"><input type="radio" name="cd-bounds" value="nonneg"${chkNonneg}>`
            +   `Non-negative <span class="ca-mono">0\u2009\u2026\u2009+\u221e</span></label>`
            + `<label class="ca-chk-lbl"><input type="radio" name="cd-bounds" value="prob"${chkProb}>`
            +   `Probability <span class="ca-mono">0\u2009\u2026\u20091</span></label>`
            + `<label class="ca-chk-lbl"><input type="radio" name="cd-bounds" value="custom"${chkCustom}>`
            +   `Custom</label>`
            + `</div>`
            + `<div id="cd-custom-row" class="ca-row" style="${customVis}">`
            + `<label class="ca-row-lbl">Min</label>`
            + `<input type="number" id="cd-min" class="ca-num-input" value="${minVal}" placeholder="auto" step="any">`
            + `<label class="ca-row-lbl" style="margin-left:8px">Max</label>`
            + `<input type="number" id="cd-max" class="ca-num-input" value="${maxVal}" placeholder="auto" step="any">`
            + `</div>`;
      } // end else (real / integer bounds)
    }

    // Branch-annotation flag (relevant for all types with numeric / label data)
    html += `<div class="ca-section-lbl" style="margin-top:10px">Behaviour</div>`
          + `<div class="ca-row">`
          + `<label class="ca-chk-lbl"><input type="checkbox" id="cd-branch-annot"${isBranchAnnot ? ' checked' : ''}>`
          + ` Branch annotation`
          + ` <span class="ca-hint">(stored on descendant; describes the branch above it — transferred on reroot)</span>`
          + `</label></div>`;

    detail.innerHTML = html;

    // ── Wire controls ───────────────────────────────────────────────────────

    // Type
    document.getElementById('cd-type')?.addEventListener('change', e => {
      _mutPending(name, { dataType: e.target.value });
      _rerender(name);
    });

    // Bounds radios
    for (const radio of detail.querySelectorAll('[name="cd-bounds"]')) {
      radio.addEventListener('change', () => {
        const mode = detail.querySelector('[name="cd-bounds"]:checked')?.value ?? 'auto';
        const customRow = document.getElementById('cd-custom-row');
        if (customRow) customRow.style.visibility = mode === 'custom' ? '' : 'hidden';
        _mutPending(name, { _boundsMode: mode, ..._boundsFromPreset(mode, def) });
        _updateTableRow(name, getGraph()?.annotationSchema);
      });
    }

    // Custom min/max (blur so typing isn't interrupted)
    document.getElementById('cd-min')?.addEventListener('blur', e => {
      const v = e.target.value.trim();
      _mutPending(name, { min: v === '' ? undefined : parseFloat(v) });
      _updateTableRow(name, getGraph()?.annotationSchema);
    });
    document.getElementById('cd-max')?.addEventListener('blur', e => {
      const v = e.target.value.trim();
      _mutPending(name, { max: v === '' ? undefined : parseFloat(v) });
      _updateTableRow(name, getGraph()?.annotationSchema);
    });

    // Branch-annotation toggle
    document.getElementById('cd-branch-annot')?.addEventListener('change', e => {
      _mutPending(name, { isBranchAnnotation: e.target.checked });
    });

  }

  // ── Parse Tips ────────────────────────────────────────────────────────────

  function _openParseTips() {
    document.getElementById('parse-tips-name').value    = '';
    document.getElementById('parse-tips-delim').value   = '|';
    document.getElementById('parse-tips-field').value   = '1';
    document.getElementById('parse-tips-type').value    = 'auto';
    document.getElementById('parse-tips-missing').value = '?';
    document.getElementById('parse-tips-error').style.display = 'none';

    // Populate example tip labels
    const graph = getGraph();
    const examplesWrap = document.getElementById('parse-tips-examples');
    const examplesList = document.getElementById('parse-tips-examples-list');
    const tips = graph
      ? graph.nodes.filter(n => n.adjacents.length === 1 && n.name != null)
      : [];
    if (tips.length > 0) {
      const MAX = 5;
      const sample = tips.slice(0, MAX);
      examplesList.innerHTML = sample.map(n => {
        const label = n.name.length > 60 ? n.name.slice(0, 57) + '\u2026' : n.name;
        return `<div>${esc(label)}</div>`;
      }).join('') + (tips.length > MAX
        ? `<div style="color:rgba(255,255,255,0.3)">… ${tips.length - MAX} more</div>`
        : '');
      examplesWrap.style.display = '';
    } else {
      examplesWrap.style.display = 'none';
    }

    parseTipsOverlay.classList.add('open');
    setTimeout(() => document.getElementById('parse-tips-name').focus(), 50);
  }

  function _closeParseTips() {
    parseTipsOverlay.classList.remove('open');
  }

  function _showParseError(msg) {
    const el = document.getElementById('parse-tips-error');
    el.textContent = msg;
    el.style.display = '';
  }

  function _runParseTips() {
    const graph = getGraph();
    if (!graph) return;

    const annotName  = document.getElementById('parse-tips-name').value.trim();
    const delimiter  = document.getElementById('parse-tips-delim').value; // default '|'
    const fieldNum   = parseInt(document.getElementById('parse-tips-field').value, 10);
    const typeHint   = document.getElementById('parse-tips-type').value;
    const missingStr = document.getElementById('parse-tips-missing').value;

    document.getElementById('parse-tips-error').style.display = 'none';

    if (!annotName) { _showParseError('Please enter an annotation name.'); return; }
    if (!delimiter) { _showParseError('Please enter a delimiter character.'); return; }
    if (isNaN(fieldNum) || fieldNum === 0) { _showParseError('Field must be a non-zero integer.'); return; }

    // Warn if name already exists
    if (graph.annotationSchema.has(annotName)) {
      if (!confirm(`An annotation named "${annotName}" already exists. Overwrite it?`)) return;
    }

    // Collect tip nodes (exactly one adjacent = parent only)
    const tips = graph.nodes.filter(n => n.adjacents.length === 1 && n.name != null);
    if (tips.length === 0) { _showParseError('No tip nodes with names found.'); return; }

    // Extract the requested field from each tip name
    const extracted = [];
    const missing   = [];
    for (const node of tips) {
      const parts = (node.name ?? '').split(delimiter);
      const idx   = fieldNum > 0 ? fieldNum - 1 : parts.length + fieldNum;
      if (idx < 0 || idx >= parts.length) {
        missing.push(node.name);
      } else {
        extracted.push({ node, raw: parts[idx].trim() });
      }
    }

    if (missing.length > 0) {
      const sample = missing.slice(0, 3).map(n => `"${n}"`).join(', ');
      _showParseError(
        `${missing.length} tip${missing.length > 1 ? 's' : ''} don't have field ${fieldNum}: ` +
        sample + (missing.length > 3 ? `, …` : '')
      );
      return;
    }

    // Parse values according to type hint, respecting the missing sentinel
    const parseErrors = [];
    for (const e of extracted) {
      // Treat as missing if the raw value matches the missing sentinel
      if (missingStr !== '' && e.raw === missingStr) {
        e.value = '?';  // standard missing-data marker used throughout the app
        continue;
      }
      if (typeHint === 'integer') {
        const n = parseInt(e.raw, 10);
        if (isNaN(n)) { parseErrors.push(e.raw); } else { e.value = n; }
      } else if (typeHint === 'real') {
        const n = parseFloat(e.raw);
        if (isNaN(n)) { parseErrors.push(e.raw); } else { e.value = n; }
      } else {
        e.value = e.raw; // string for auto / categorical / date
      }
    }
    if (parseErrors.length > 0) {
      const sample = [...new Set(parseErrors)].slice(0, 3).map(v => `"${v}"`).join(', ');
      _showParseError(`Cannot parse as ${typeHint}: ${sample}${parseErrors.length > 3 ? ', …' : ''}`);
      return;
    }

    // Write values onto nodes
    for (const { node, value } of extracted) {
      node.annotations[annotName] = value;
    }

    // Rebuild schema from all nodes
    const newSchema = buildAnnotationSchema(graph.nodes);

    // If user forced a type that differs from auto-detected, coerce the def
    if (typeHint !== 'auto' && newSchema.has(annotName)) {
      const def = newSchema.get(annotName);
      if (typeHint === 'categorical' && def.dataType !== 'categorical') {
        const distinct = [...new Set(extracted.map(e => String(e.value)))].sort();
        def.dataType = 'categorical';
        def.values   = distinct;
        delete def.min; delete def.max;
        delete def.observedMin; delete def.observedMax;
        delete def.observedRange; delete def.fmt; delete def.fmtValue;
      } else if (typeHint === 'date' && def.dataType !== 'date') {
        const distinct = [...new Set(extracted.map(e => String(e.value)))].sort();
        def.dataType = 'date';
        def.values   = distinct;
        def.min      = distinct[0];
        def.max      = distinct[distinct.length - 1];
        delete def.observedMin; delete def.observedMax;
        delete def.observedRange; delete def.fmt; delete def.fmtValue;
      }
    }

    // Update live schema and refresh UI
    graph.annotationSchema = newSchema;
    _closeParseTips();
    _selected = null;
    _renderTable(newSchema);
    _renderDetail(null, null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Merge changes into the pending map for this annotation. */
  function _mutPending(name, changes) {
    _pending.set(name, { ...(_pending.get(name) ?? {}), ...changes });
  }

  /** Re-render both table row and detail pane (used after a type change which
   *  affects which sections are shown). */
  function _rerender(name) {
    const schema = getGraph()?.annotationSchema;
    if (!schema) return;
    _renderTable(schema);
    _renderDetail(name, schema.get(name));
  }

  /** Re-render just the affected table row without touching the detail pane
   *  (keeps number inputs focused). */
  function _updateTableRow(name, schema) {
    if (!schema) return;
    // Easiest approach: rebuild the whole tbody — it's fast enough at <200 rows.
    _renderTable(schema);
  }

  /** Return min/max overrides for a bounds preset. */
  function _boundsFromPreset(mode, def) {
    if (mode === 'auto')       return { min: undefined, max: undefined, fixedBounds: false };
    if (mode === 'nonneg')     return { min: 0, max: undefined, fixedBounds: true };
    if (mode === 'prob')       return { min: 0, max: 1, fixedBounds: true };
    if (mode === 'proportion') return { min: 0, max: 1, fixedBounds: true };
    if (mode === 'percentage') return { min: 0, max: 100, fixedBounds: true };
    // 'custom' — keep whoever set min/max
    return { fixedBounds: true };
  }

  // ── Schema builder ────────────────────────────────────────────────────────

  /**
   * Clone the current graph schema and apply all pending edits.
   *
   * @returns {Map<string, object>} patched schema
   */
  function _buildModifiedSchema(graph) {
    const { nodes, annotationSchema: schema } = graph;

    // Shallow-clone each def so we don't mutate the live objects.
    const out = new Map(Array.from(schema, ([k, v]) => [k, { ...v }]));

    // Remove deleted annotations from the schema and from all node annotations.
    for (const name of _deleted) {
      out.delete(name);
      for (const node of nodes) {
        delete node.annotations[name];
      }
    }

    for (const [name, p] of _pending) {
      if (!out.has(name)) continue;
      const def = out.get(name);

      // 1. Type change
      const targetType = p.dataType ?? def.dataType;
      if (p.dataType && p.dataType !== def.dataType) {
        if (p.dataType === 'categorical') {
          const distinct = [...new Set(
            nodes
              .filter(n => n.annotations?.[name] != null)
              .map(n => String(n.annotations[name]))
          )].sort();
          def.dataType = 'categorical';
          def.values   = distinct;
          delete def.min; delete def.max;
          delete def.observedMin; delete def.observedMax;
          delete def.observedRange; delete def.fmt; delete def.fmtValue;
        } else if (p.dataType === 'proportion') {
          def.dataType    = 'proportion';
          def.min         = 0;
          def.max         = 1;
          def.fixedBounds = true;
        } else if (p.dataType === 'percentage') {
          def.dataType    = 'percentage';
          def.min         = 0;
          def.max         = 100;
          def.fixedBounds = true;
        } else {
          // integer ↔ real (and proportion/percentage → real/integer): keep numeric stats.
          def.dataType    = p.dataType;
          def.fixedBounds = false;  // remove fixed bounds when reverting to raw type
        }
      }

      // 2. Bounds override
      if (p._boundsMode === 'auto') {
        def.min         = def.observedMin;
        def.max         = def.observedMax;
        def.fixedBounds = false;
      } else {
        if (p.min !== undefined) { def.min = p.min; }
        if (p.max !== undefined) { def.max = p.max; }
        if (p.fixedBounds !== undefined) def.fixedBounds = p.fixedBounds;
      }

      // 3. Rebuild formatters for numeric types
      const finalType = def.dataType;
      if (isNumericType(finalType)) {
        def.observedRange = (def.observedMax ?? def.max ?? 0) - (def.observedMin ?? def.min ?? 0);
        def.fmt      = makeAnnotationFormatter(def, 'ticks');
        def.fmtValue = makeAnnotationFormatter(def, 'value');
      }

      // 4. Branch-annotation flag
      if (p.isBranchAnnotation !== undefined) def.isBranchAnnotation = p.isBranchAnnotation;
    }

    return out;
  }

  return { open, close };
}
