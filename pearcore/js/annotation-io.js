// annotation-io.js — Annotation import dialog management.
// Generic annotation importer — works with any data model that provides
// items with `.annotations` and `.name` properties.
// ─────────────────────────────────────────────────────────────────────────────

import { parseDelimited } from './annotation-utils.js';
import { buildAnnotationSchema } from './annotation-utils.js';
import { htmlEsc as esc, wireDropZone } from './utils.js';

/**
 * Create the annotation import dialog controller.
 *
 * @param {Object}   options
 * @param {Function} options.getGraph   – () => data container (must have .nodes, .annotationSchema)
 * @param {Function} options.onApply    – (graph, importCols) called after annotations are written
 *                                        and annotationSchema has been rebuilt.
 * @param {Function} options.isTip      – (node) => boolean; classifies items as tips vs internal.
 * @returns {{ open: Function, close: Function, loadFile: Function }}
 */
export function createAnnotImporter({ getGraph, onApply, isTip }) {
  const overlay = document.getElementById('import-annot-overlay');
  const body    = document.getElementById('import-annot-body');
  const footer  = document.getElementById('import-annot-footer');
  const titleEl = document.getElementById('import-annot-title');

  function open() {
    if (!getGraph()) return;
    _showAnnotPicker();
    overlay.classList.add('open');
  }

  function close() {
    overlay.classList.remove('open');
  }

  document.getElementById('import-annot-close').addEventListener('click', close);

  /**
   * Skip the picker phase and go straight to the import config dialog.
   * Used by the Tauri adapter which supplies file content from a native dialog.
   * Cancel from the config step closes the overlay entirely (no picker to return to).
   */
  function loadFile(name, content) {
    if (!getGraph()) return;
    overlay.classList.add('open');
    _showImportConfig(name, content, close);
  }

  /** Phase 1: render the File/URL picker UI into the dialog body. */
  function _showAnnotPicker(errorMsg) {
    titleEl.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Import Annotations';
    footer.innerHTML  = `<button id="imp-picker-cancel-btn" class="btn btn-sm btn-secondary">Cancel</button>`;
    document.getElementById('imp-picker-cancel-btn').addEventListener('click', close);
    body.innerHTML = `
      <div class="pt-tabs">
        <button class="pt-tab-btn active" data-imp-tab="file"><i class="bi bi-folder2-open me-1"></i>File</button>
        <button class="pt-tab-btn"        data-imp-tab="url" ><i class="bi bi-link-45deg me-1"></i>URL</button>
      </div>
      <div class="pt-tab-panel active" id="imp-tab-file">
        <div id="annot-drop-zone" class="pt-drop-zone">
          <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
          <p>Drag and drop your annotation file here</p>
          <p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">CSV (.csv) &nbsp;or&nbsp; Tab-separated (.tsv)</p>
          <input type="file" id="annot-file-input" accept=".csv,.tsv,.txt" style="position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none">
          <button class="btn btn-sm btn-outline-primary" id="btn-annot-file-choose"><i class="bi bi-folder2-open me-1"></i>Choose File</button>
        </div>
      </div>
      <div class="pt-tab-panel" id="imp-tab-url">
        <label class="form-label">Annotation file URL</label>
        <input type="url" class="pt-modal-url-input" id="annot-url-input"
          placeholder="https://example.com/annotations.csv" />
        <div style="text-align:center;margin-top:0.5rem">
          <button class="btn btn-sm btn-outline-primary" id="btn-annot-load-url"
            ><i class="bi bi-cloud-download me-1"></i>Load from URL</button>
        </div>
      </div>
      <div id="imp-loading" class="pt-modal-loading" style="display:none">
        <div class="pt-spinner"></div>Loading&hellip;
      </div>
      ${errorMsg ? `<div class="pt-modal-error">${esc(errorMsg)}</div>` : ''}`;

    // Tab switching
    body.querySelectorAll('[data-imp-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('[data-imp-tab]').forEach(b => b.classList.remove('active'));
        body.querySelectorAll('.pt-tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`imp-tab-${btn.dataset.impTab}`).classList.add('active');
      });
    });

    // File picker + drag-and-drop
    const annotFileInput = document.getElementById('annot-file-input');
    const annotDropZone  = document.getElementById('annot-drop-zone');
    document.getElementById('btn-annot-file-choose').addEventListener('click', () => annotFileInput.click());
    annotFileInput.addEventListener('change', () => {
      const file = annotFileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => _showImportConfig(file.name, e.target.result);
      reader.readAsText(file);
    });
    wireDropZone(annotDropZone, file => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => _showImportConfig(file.name, ev.target.result);
      reader.readAsText(file);
    });

    // URL load
    document.getElementById('btn-annot-load-url').addEventListener('click', async () => {
      const url = document.getElementById('annot-url-input').value.trim();
      if (!url) return;
      const loadingEl = document.getElementById('imp-loading');
      loadingEl.style.display = '';
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} \u2013 ${url}`);
        const text = await resp.text();
        _showImportConfig(url.split('/').pop() || 'annotations', text);
      } catch (err) {
        loadingEl.style.display = 'none';
        _showAnnotPicker(err.message);
      }
    });
  }

  /** Show the import configuration dialog. */
  function _showImportConfig(filename, text, onCancel) {
    // Default: go back to the file picker (web-app flow).
    const handleCancel = onCancel ?? (() => _showAnnotPicker());
    let parsed;
    try { parsed = parseDelimited(text); }
    catch (err) { _showImportError(`Parse error: ${err.message}`, handleCancel); return; }
    const { headers, rows } = parsed;
    if (headers.length < 2) {
      _showImportError('File must have at least 2 columns (one to match tips and at least one annotation column).', handleCancel);
      return;
    }
    if (rows.length === 0) {
      _showImportError('No data rows found (file appears to have only a header row).', handleCancel);
      return;
    }

    const headerOpts = headers.map((h, i) =>
      `<option value="${i}">${esc(h)}</option>`).join('');

    const colChecks = headers.map((h, i) =>
      `<label><input type="checkbox" class="imp-col-chk" data-idx="${i}" checked> ${esc(h)}</label>`
    ).join('');

    // Build example section: CSV match column values (left) + tip labels (right).
    // Each pipe-delimited tip-label field is wrapped in a span so _syncExamples()
    // can highlight the selected field and dim the rest.
    const graph = getGraph();
    const tips  = graph
      ? graph.nodes.filter(n => isTip(n) && n.name != null)
      : [];
    const MAX_EX = 3;
    const exHtml = tips.length > 0
      ? `<div class="imp-section" id="imp-examples-section">
          <label class="imp-section-label">Examples</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;align-items:start">
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--pt-text-muted);margin-bottom:4px">CSV: <span id="imp-csv-col-name"></span></div>
              <div id="imp-csv-examples" style="font-family:monospace;font-size:0.78rem;color:var(--pt-text-bright);line-height:1.7"></div>
            </div>
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--pt-text-muted);margin-bottom:4px">Tip label</div>
              <div id="imp-examples-list" style="font-family:monospace;font-size:0.78rem;color:var(--pt-text-bright);line-height:1.7">
                ${tips.slice(0, MAX_EX).map(n => {
                  const lbl = n.name.length > 60 ? n.name.slice(0, 57) + '\u2026' : n.name;
                  const fieldSpans = lbl.split('|').map(f =>
                    `<span class="imp-ex-field">${esc(f)}</span>`
                  ).join('<span class="imp-ex-sep">|</span>');
                  return `<div>${fieldSpans}</div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>`
      : '';

    titleEl.innerHTML = `<i class="bi bi-file-earmark-text me-2"></i>${esc(filename)}`;
    body.innerHTML = `
      <p style="margin:0 0 0.8rem;color:var(--bs-secondary-color)">
        ${rows.length}&nbsp;row${rows.length !== 1 ? 's' : ''},
        ${headers.length}&nbsp;column${headers.length !== 1 ? 's' : ''}
      </p>

      <div class="imp-section">
        <label class="imp-section-label">Match column</label>
        <div class="imp-row">
          <select class="imp-select" id="imp-match-col">${headerOpts}</select>
        </div>
      </div>

      <div class="imp-section">
        <label class="imp-section-label">Match mode</label>
        <div style="display:flex;flex-direction:column;gap:0.3rem;">
          <label class="imp-row" style="cursor:pointer">
            <input type="radio" name="imp-mode" id="imp-mode-full" value="full" checked>
            Full taxon label
          </label>
          <label class="imp-row" style="cursor:pointer">
            <input type="radio" name="imp-mode" id="imp-mode-field" value="field">
            Pipe-delimited field:&nbsp;
            <input type="number" id="imp-field-num" min="1" value="1"
              class="ca-num-input"
              style="width:52px;padding:0.1rem 0.3rem;font-size:0.82rem;"
              title="Which |-delimited field (1 = first)">
          </label>
        </div>
      </div>

      ${exHtml}

      <div class="imp-section">
        <label class="imp-section-label">Columns to import</label>
        <div class="imp-col-grid" id="imp-col-grid">${colChecks}</div>
        <button id="imp-toggle-all" class="btn btn-sm btn-outline-secondary"
          style="margin-top:0.4rem;font-size:0.75rem;padding:0.1rem 0.5rem">Deselect all</button>
      </div>

      <div class="imp-section">
        <label class="imp-row" style="cursor:pointer;gap:0.4rem;align-items:flex-start">
          <input type="checkbox" id="imp-replace" style="margin-top:0.1rem;flex-shrink:0">
          <span>Replace existing annotations with the same name
            <span style="display:block;color:var(--bs-secondary-color);font-size:0.75rem">
              Clears matching annotation keys from all nodes before applying new values.
            </span>
          </span>
        </label>
      </div>`;

    footer.innerHTML = `
      <button id="imp-cancel-btn" class="btn btn-sm btn-outline-secondary">Cancel</button>
      <button id="imp-apply-btn" class="btn btn-sm btn-primary">Import &#x2192;</button>`;

    // When match column changes, disable that column in the import grid.
    function _syncMatchColDisabled() {
      const matchIdx = document.getElementById('imp-match-col').value;
      document.querySelectorAll('.imp-col-chk').forEach(el => {
        const isMatch = el.dataset.idx === matchIdx;
        el.disabled = isMatch;
        if (isMatch) el.checked = false;
        el.closest('label').style.opacity = isMatch ? '0.4' : '';
      });
      _syncCsvExamples();
    }
    document.getElementById('imp-match-col').addEventListener('change', _syncMatchColDisabled);
    _syncMatchColDisabled(); // init

    // Re-render CSV column examples when match column changes.
    function _syncCsvExamples() {
      const nameEl = document.getElementById('imp-csv-col-name');
      const listEl = document.getElementById('imp-csv-examples');
      if (!nameEl || !listEl) return;
      const matchIdx = parseInt(document.getElementById('imp-match-col').value, 10);
      const colName  = headers[matchIdx] ?? '';
      nameEl.textContent = colName;
      listEl.innerHTML = rows.slice(0, MAX_EX).map(row => {
        const raw = String(row[colName] ?? '');
        const lbl = raw.length > 60 ? raw.slice(0, 57) + '\u2026' : raw;
        return `<div>${esc(lbl)}</div>`;
      }).join('');
    }

    // Highlight selected pipe-delimited field in the example labels.
    function _syncExamples() {
      const listEl = document.getElementById('imp-examples-list');
      if (!listEl) return;
      const isField = document.getElementById('imp-mode-field').checked;
      const allFields = listEl.querySelectorAll('.imp-ex-field');
      const allSeps   = listEl.querySelectorAll('.imp-ex-sep');
      if (!isField) {
        allFields.forEach(el => { el.style.opacity = ''; el.style.fontWeight = ''; });
        allSeps.forEach(el   => { el.style.opacity = ''; });
        return;
      }
      const fieldNum = parseInt(document.getElementById('imp-field-num').value, 10) || 1;
      listEl.querySelectorAll('div').forEach(row => {
        const fields = row.querySelectorAll('.imp-ex-field');
        if (!fields.length) return; // "… N more" row
        const count = fields.length;
        const idx   = fieldNum > 0
          ? Math.min(fieldNum - 1, count - 1)
          : Math.max(0, count + fieldNum);
        fields.forEach((el, i) => {
          const active = i === idx;
          el.style.opacity    = active ? '1'   : '0.2';
          el.style.fontWeight = active ? '600' : '';
        });
        row.querySelectorAll('.imp-ex-sep').forEach(el => { el.style.opacity = '0.2'; });
      });
    }

    // Clicking the field-number input switches to field mode.
    document.getElementById('imp-field-num').addEventListener('focus', () => {
      document.getElementById('imp-mode-field').checked = true;
      _syncExamples();
    });
    document.getElementById('imp-field-num').addEventListener('input', _syncExamples);
    document.getElementById('imp-mode-full') .addEventListener('change', _syncExamples);
    document.getElementById('imp-mode-field').addEventListener('change', _syncExamples);
    _syncExamples(); // init

    // Toggle-all button.
    document.getElementById('imp-toggle-all').addEventListener('click', () => {
      const matchIdx = document.getElementById('imp-match-col').value;
      const eligible = [...document.querySelectorAll('.imp-col-chk')]
        .filter(el => el.dataset.idx !== matchIdx);
      const anyUnchecked = eligible.some(el => !el.checked);
      eligible.forEach(el => { el.checked = anyUnchecked; });
      document.getElementById('imp-toggle-all').textContent =
        anyUnchecked ? 'Deselect all' : 'Select all';
    });

    document.getElementById('imp-cancel-btn').addEventListener('click', () => handleCancel());

    document.getElementById('imp-apply-btn').addEventListener('click', () => {
      const matchIdx   = parseInt(document.getElementById('imp-match-col').value, 10);
      const matchCol   = headers[matchIdx];
      const modeField  = document.getElementById('imp-mode-field').checked;
      const fieldIndex = Math.max(1, parseInt(document.getElementById('imp-field-num').value, 10) || 1) - 1;
      const doReplace  = document.getElementById('imp-replace').checked;
      const importCols = headers.filter((_, i) => {
        if (i === matchIdx) return false;
        const el = document.querySelector(`.imp-col-chk[data-idx="${i}"]`);
        return el && el.checked;
      });
      if (importCols.length === 0) {
        const grid = document.getElementById('imp-col-grid');
        grid.style.outline = '1px solid var(--bs-danger)';
        setTimeout(() => { grid.style.outline = ''; }, 1500);
        return;
      }
      _applyAnnotations({ rows, matchCol, matchMode: modeField ? 'field' : 'full',
                          fieldIndex, importCols, doReplace, filename });
    });
  }

  /** Write parsed annotations onto graph nodes, rebuild schema, call onApply. */
  function _applyAnnotations({ rows, matchCol, matchMode, fieldIndex, importCols, doReplace, filename }) {
    const graph = getGraph();
    const tips  = graph.nodes.filter(n => isTip(n));

    // Build lookup: matchValue → first matching row
    const rowLookup = new Map();
    for (const row of rows) {
      const key = (row[matchCol] ?? '').trim();
      if (key && !rowLookup.has(key)) rowLookup.set(key, row);
    }

    // Optionally clear existing annotation keys from all nodes
    if (doReplace) {
      for (const colName of importCols)
        for (const node of graph.nodes) delete node.annotations[colName];
    }

    let matched = 0;
    const matchedRowKeys = new Set();
    const unmatchedTipExamples = [];
    for (const node of tips) {
      const label    = node.name ?? node.origId ?? '';
      const matchKey = matchMode === 'field'
        ? (label.split('|')[fieldIndex] ?? '').trim()
        : label.trim();
      const row = rowLookup.get(matchKey);
      if (!row) {
        if (unmatchedTipExamples.length < 5) unmatchedTipExamples.push(matchKey || label);
        continue;
      }
      matched++;
      matchedRowKeys.add(matchKey);
      for (const colName of importCols) {
        const raw = (row[colName] ?? '').trim();
        if (raw === '') continue;
        // user_colour: accept #RGB and #RRGGBB, normalise to 6-digit lowercase #rrggbb.
        if (colName === 'user_colour') {
          const hex = raw.replace(/^#/, '');
          const expanded = hex.length === 3
            ? hex.split('').map(c => c + c).join('')
            : hex;
          if (/^[0-9a-f]{6}$/i.test(expanded)) {
            node.annotations[colName] = '#' + expanded.toLowerCase();
          }
          // Silently skip invalid colour values.
          continue;
        }
        const num = Number(raw);
        node.annotations[colName] = Number.isNaN(num) ? raw : num;
      }
    }

    const unmatchedTips = tips.length - matched;
    const unmatchedRows = rowLookup.size - matchedRowKeys.size;

    // Rebuild schema then hand off to the caller for UI/renderer refresh.
    graph.annotationSchema = buildAnnotationSchema(graph.nodes, { isTip });
    onApply(graph, importCols);

    _showImportResults({ matched, unmatchedTips, unmatchedRows, unmatchedTipExamples,
                         importCols, filename, totalTips: tips.length });
  }

  /** Switch the import dialog to a results view. */
  function _showImportResults({ matched, unmatchedTips, unmatchedRows, unmatchedTipExamples = [], importCols, filename, totalTips }) {
    const pct    = totalTips > 0 ? Math.round(100 * matched / totalTips) : 0;
    const okCls  = matched       > 0 ? 'imp-ok'   : 'imp-warn';
    const tipCls = unmatchedTips > 0 ? 'imp-warn' : 'imp-ok';
    const rowCls = unmatchedRows > 0 ? 'imp-warn' : 'imp-ok';
    titleEl.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Import Results';
    body.innerHTML = `
      <div class="imp-result-row">
        <span class="imp-result-icon ${okCls}"><i class="bi bi-check-circle-fill"></i></span>
        <span><strong>${matched}</strong> of <strong>${totalTips}</strong> tips matched (${pct}%)</span>
      </div>
      <div class="imp-result-row">
        <span class="imp-result-icon ${tipCls}">
          <i class="bi bi-${unmatchedTips > 0 ? 'exclamation-triangle-fill' : 'check-circle-fill'}"></i>
        </span>
        <span><strong>${unmatchedTips}</strong> tip${unmatchedTips !== 1 ? 's' : ''} unmatched${unmatchedTips > 0 && unmatchedTipExamples.length > 0 ? ` <span style="color:var(--bs-secondary-color);font-size:0.78rem">(e.g. ${unmatchedTipExamples.map(n => `<code class="pt-code-tag">${esc(n)}</code>`).join(', ')}${unmatchedTips > unmatchedTipExamples.length ? ', …' : ''})</span>` : ''}</span>
      </div>
      <div class="imp-result-row">
        <span class="imp-result-icon ${rowCls}">
          <i class="bi bi-${unmatchedRows > 0 ? 'exclamation-triangle-fill' : 'check-circle-fill'}"></i>
        </span>
        <span><strong>${unmatchedRows}</strong> annotation row${unmatchedRows !== 1 ? 's' : ''} unmatched</span>
      </div>
      ${importCols.length > 0 ? `
      <div style="margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid var(--pt-divider);">
        <span style="color:var(--bs-secondary-color)">Annotations imported:</span>
        ${importCols.map(c => `<code class="pt-code-tag" style="margin:0 2px">${esc(c)}</code>`).join('')}
      </div>` : ''}`;
    footer.innerHTML = `<button id="imp-close-btn" class="btn btn-sm btn-primary">Close</button>`;
    document.getElementById('imp-close-btn').addEventListener('click', close);
  }

  /** Show an error inside the import dialog (phase 2 parse errors). */
  function _showImportError(msg, onCancel) {
    const handleCancel = onCancel ?? (() => _showAnnotPicker());
    titleEl.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Import Error';
    body.innerHTML = `<div style="color:var(--bs-danger);padding:0.5rem 0">${esc(msg)}</div>`;
    footer.innerHTML = `<button id="imp-back-btn" class="btn btn-sm btn-outline-secondary me-auto">&#x2190; Back</button>
      <button id="imp-close-err-btn" class="btn btn-sm btn-secondary">Close</button>`;
    document.getElementById('imp-back-btn').addEventListener('click',      () => handleCancel());
    document.getElementById('imp-close-err-btn').addEventListener('click', close);
  }

  return { open, close, loadFile };
}
