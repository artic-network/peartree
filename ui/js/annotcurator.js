// annotcurator.js — Annotation curation dialog.
// Lets the user inspect, retype and adjust scale bounds for annotations
// to annotations loaded from a tree file or imported from CSV/TSV.
// ─────────────────────────────────────────────────────────────────────────────

import { makeAnnotationFormatter } from './phylograph.js';

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
export function createAnnotCurator({ getGraph, onApply }) {
  const overlay  = document.getElementById('curate-annot-overlay');
  const tbody    = document.getElementById('curate-annot-tbody');
  const detail   = document.getElementById('curate-annot-detail');
  const applyBtn = document.getElementById('curate-annot-apply');

  // Pending edits per annotation name, cleared on each open().
  // Map<name, { dataType?, min?, max?, fixedBounds?, _boundsMode? }>
  let _pending  = new Map();
  let _selected = null;   // name of currently selected row

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  document.getElementById('curate-annot-close') .addEventListener('click', close);
  document.getElementById('curate-annot-cancel').addEventListener('click', close);
  applyBtn.addEventListener('click', _apply);

  // Close on backdrop click (outside the white modal box).
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  function open() {
    const graph = getGraph();
    if (!graph?.annotationSchema) return;
    _pending.clear();
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

    const schema = _buildModifiedSchema(graph);
    onApply(schema);
    graph.annotationSchema = schema;
    close();
  }

  // ── Table rendering ───────────────────────────────────────────────────────

  function _renderTable(schema) {
    const rows = [];
    for (const [name, def] of schema) {
      if (name === 'user_colour') continue;
      if (def.groupMember) continue;

      const p         = _pending.get(name) ?? {};
      const type      = p.dataType  ?? def.dataType;
      const isNum     = type === 'real' || type === 'integer';

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
      const hasPending = _pending.has(name) && Object.keys(_pending.get(name)).length > 0;

      rows.push(`
        <tr data-name="${esc(name)}"${isSelected ? ' class="selected"' : ''}>
          <td>
            ${hasPending ? '<span class="ca-pending-dot" title="Unsaved changes"></span>' : ''}
            <span class="ca-name">${esc(name)}</span>
          </td>
          <td><span class="ca-type-badge ca-type-${esc(type)}">${esc(type)}</span></td>
          <td class="ca-center" style="color:rgba(255,255,255,0.45);font-size:0.72rem">${onStr}</td>
          <td>${obsCell}</td>
          <td>${boundsCell}</td>
        </tr>`);
    }

    tbody.innerHTML = rows.length ? rows.join('') :
      '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3);padding:16px">No annotations</td></tr>';

    // Row click handlers
    for (const tr of tbody.querySelectorAll('tr[data-name]')) {
      tr.addEventListener('click', () => {
        const clickedName = tr.dataset.name;
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
    const isNumeric   = currentType === 'real' || currentType === 'integer';
    const isDate      = currentType === 'date';

    // Bounds state
    const scaleMin    = p.min !== undefined ? p.min : def.min;
    const scaleMax    = p.max !== undefined ? p.max : def.max;
    const boundsMode  = p._boundsMode ??
      (def.fixedBounds
        ? (def.min === 0 && def.max === 1 ? 'prob' : def.min === 0 ? 'nonneg' : 'custom')
        : 'auto');

    // ── Build HTML — pre-compute attribute strings to avoid nested ternaries ──

    const selInt    = currentType === 'integer'     ? ' selected' : '';
    const selReal   = currentType === 'real'        ? ' selected' : '';
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

    if (def.dataType === 'integer') {
      html += `<option value="integer"${selInt}>Integer \u2014 discrete</option>`
            + `<option value="real"${selReal}>Real \u2014 continuous</option>`
            + `<option value="categorical"${selCat}>Categorical</option>`;
    } else if (def.dataType === 'real') {
      html += `<option value="real"${selReal}>Real \u2014 continuous</option>`
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
    }

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
    if (mode === 'auto')   return { min: undefined, max: undefined, fixedBounds: false };
    if (mode === 'nonneg') return { min: 0, max: undefined, fixedBounds: true };
    if (mode === 'prob')   return { min: 0, max: 1, fixedBounds: true };
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
        } else {
          // integer → real or vice-versa: keep numeric stats, just change the label
          def.dataType = p.dataType;
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
      if (finalType === 'real' || finalType === 'integer') {
        def.observedRange = (def.observedMax ?? def.max ?? 0) - (def.observedMin ?? def.min ?? 0);
        def.fmt      = makeAnnotationFormatter(def, 'ticks');
        def.fmtValue = makeAnnotationFormatter(def, 'value');
      }
    }

    return out;
  }

  return { open, close };
}
