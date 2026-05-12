// export-controller.js — Tree & graphics export dialogs plus print support.
// Extracted from peartree.js to keep the app controller focused.
// ─────────────────────────────────────────────────────────────────────────────

import { htmlEsc as esc, downloadBlob } from '@artic-network/pearcore/utils.js';
import { isNumericType } from './phylograph.js';
import { graphToNewick } from '@artic-network/pearcore/tree-io.js';
import { viewportDims, compositeViewPng, buildGraphicSVG } from './graphicsio.js';
import { createGraphicsExporter } from '@artic-network/pearcore/graphics-export.js';

/**
 * Create the export controller — manages tree export and graphics export
 * dialogs plus print support.
 *
 * @param {Object}      opts
 * @param {HTMLElement} opts.root                – the app root element (used for scoped `$()`)
 * @param {Function}    opts.getGraph            – () => current PhyloGraph
 * @param {Function}    opts.getRenderer         – () => TreeRenderer
 * @param {Function}    opts.getLegendRenderer   – () => LegendRenderer
 * @param {HTMLCanvasElement} opts.canvas
 * @param {HTMLCanvasElement} opts.axisCanvas
 * @param {HTMLCanvasElement} opts.legendRightCanvas
 * @param {HTMLCanvasElement} opts.legend2RightCanvas
 * @param {Object}      opts.axisRenderer        – AxisRenderer instance
 * @param {Function}    opts.getSettingsSnapshot  – () => settings snapshot object
 *
 * @returns {{
 *   openExportDialog:        Function,
 *   openGraphicsDialog:      Function,
 *   doPrint:                 Function,
 *   setExportSaveHandler:    Function,
 *   setGraphicsSaveHandler:  Function,
 *   setPrintTrigger:         Function,
 * }}
 */
export function createExportController({
  root,
  getGraph,
  getRenderer,
  getLegendRenderer,
  canvas,
  axisCanvas,
  legendRightCanvas,
  legend2RightCanvas,
  axisRenderer,
  getSettingsSnapshot,
}) {
  const $ = id => root.querySelector('#' + id);

  // ── Save-handler slot for tree export ──────────────────────────────────────
  let _exportSaveHandler = null;

  // ── Wire close button ─────────────────────────────────────────────────────
  $('export-tree-close')?.addEventListener('click', _closeExportDialog);

  // ── Tree export DOM refs ───────────────────────────────────────────────────
  const exportOverlay  = $('export-tree-overlay');
  const exportBody     = $('export-tree-body');
  const exportFooter   = $('export-tree-footer');
  const exportTitleEl  = $('export-tree-title');

  // ── Graphics exporter (generic dialog + print via pearcore) ────────────────
  const _gfx = createGraphicsExporter({
    overlay:         $('export-graphic-overlay'),
    body:            $('export-graphic-body'),
    footer:          $('export-graphic-footer'),
    closeBtn:        $('export-graphic-close'),
    openBtn:         $('btn-export-graphic'),
    prefix:          'expg',
    defaultFilename: 'tree',
    fullViewLabel:   'Full tree',
    hasContent:      () => !!getGraph(),
    getViewportDims: () => {
      const d = viewportDims({ canvas, axisCanvas, legendRightCanvas });
      return { width: d.totalW, height: d.totalH };
    },
    getFullDims: () => {
      const r = getRenderer();
      const d = viewportDims({ canvas, axisCanvas, legendRightCanvas });
      return {
        width:  d.totalW,
        height: r.paddingTop + r.paddingBottom +
                (r.maxY + 1) * r.scaleY + (d.axVisible ? d.axH : 0),
      };
    },
    buildSvg: ({ fullView, transparent }) => buildGraphicSVG(
      { renderer: getRenderer(), legendRenderer: getLegendRenderer(),
        canvas, axisCanvas, legendRightCanvas, legend2RightCanvas, axisRenderer },
      fullView, transparent,
    ),
    buildPngCanvas: ({ width, height, fullView, transparent }) =>
      compositeViewPng(
        { renderer: getRenderer(), canvas, axisCanvas, legendRightCanvas, axisRenderer },
        width, height, fullView, transparent,
      ),
  });

  // ── Tree export ────────────────────────────────────────────────────────────

  function openExportDialog() {
    if (!getGraph()) return;
    exportOverlay.classList.add('open');
    _buildExportDialog();
  }

  function _closeExportDialog() {
    exportOverlay.classList.remove('open');
  }

  function _buildExportDialog() {
    const renderer    = getRenderer();
    const graph       = getGraph();
    const hasSubtree  = !!renderer._viewSubtreeRootId;
    const schema      = graph ? graph.annotationSchema : new Map();
    const annotKeys   = schema ? [...schema.keys()] : [];
    // Computed builtins (__divergence__ etc.) are not stored in annotations and
    // cannot be embedded in Newick/NEXUS; filter them out of the tree grid.
    const treeAnnotKeys = annotKeys.filter(k => !k.startsWith('__'));
    // Keys that have at least one value on a tip node (suitable for CSV export),
    // including computed builtins that are meaningful for tips.
    // __tips_below__ is excluded — it counts descendants so is only useful on internal nodes.
    const TIP_BUILTINS = new Set(['__divergence__', '__age__', '__branch_length__', '__cal_date__']);
    const tipAnnotKeys = annotKeys.filter(k => schema.get(k)?.onTips || TIP_BUILTINS.has(k));
    // Numerical annotations present on internal nodes — valid node-label candidates.
    const numericalNodeKeys = treeAnnotKeys.filter(k => {
      const def = schema.get(k);
      return def?.onNodes && isNumericType(def.dataType);
    });

    exportTitleEl.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>Export Tree';

    exportBody.innerHTML = `
      <div class="exp-section">
        <span class="exp-section-label">Format</span>
        <div class="exp-radio-group">
          <label class="exp-radio-opt"><input type="radio" name="exp-format" value="nexus" checked>&nbsp;NEXUS <span style="color:var(--bs-secondary-color);font-size:0.78rem">(.nexus)</span></label>
          <label class="exp-radio-opt"><input type="radio" name="exp-format" value="newick">&nbsp;Newick <span style="color:var(--bs-secondary-color);font-size:0.78rem">(.nwk)</span></label>
          <label class="exp-radio-opt"><input type="radio" name="exp-format" value="csv">&nbsp;CSV metadata <span style="color:var(--bs-secondary-color);font-size:0.78rem">(.csv)</span></label>
        </div>
      </div>
      <div class="exp-section" id="exp-settings-row">
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer">
          <input type="checkbox" id="exp-store-settings" checked>
          <span>Embed current visual settings in file</span>
        </label>
      </div>
      <div class="exp-section" id="exp-state-row">
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer">
          <input type="checkbox" id="exp-store-state" checked>
          <span>Embed view state (collapsed clades, highlights)</span>
        </label>
      </div>
      <div class="exp-section">
        <span class="exp-section-label">Scope</span>
        <div class="exp-radio-group">
          <label class="exp-radio-opt"><input type="radio" name="exp-scope" value="full" checked>&nbsp;Entire tree</label>
          <label class="exp-radio-opt${!hasSubtree ? ' exp-disabled' : ''}">
            <input type="radio" name="exp-scope" value="subtree"${!hasSubtree ? ' disabled' : ''}>&nbsp;Current subtree view
          </label>
        </div>
      </div>
      ${annotKeys.length > 0 ? `
      <div class="exp-section" id="exp-annot-section">
        <span class="exp-section-label" style="display:flex;align-items:center;justify-content:space-between;">
          <span>Annotations to include</span>
          <span style="display:flex;gap:0.3rem">
            <button id="exp-all-btn"  class="btn btn-sm btn-outline-secondary" style="font-size:0.7rem;padding:1px 8px;line-height:1.4">All</button>
            <button id="exp-none-btn" class="btn btn-sm btn-outline-secondary" style="font-size:0.7rem;padding:1px 8px;line-height:1.4">None</button>
          </span>
        </span>
        <div class="imp-col-grid" id="exp-annot-grid-tree" style="margin-top:0.35rem">
          ${treeAnnotKeys.map(k => `
            <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.82rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              <input type="checkbox" class="exp-annot-cb" value="${esc(k)}" checked>
              <code class="pt-code-tag">${esc(k)}</code>
            </label>`).join('')}
        </div>
        <div class="imp-col-grid" id="exp-annot-grid-csv" style="margin-top:0.35rem;display:none">
          ${tipAnnotKeys.length > 0
            ? tipAnnotKeys.map(k => {
                const def = schema.get(k);
                return `<label style="display:flex;align-items:center;gap:0.3rem;font-size:0.82rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  <input type="checkbox" class="exp-annot-cb" value="${esc(k)}" checked>
                  <code class="pt-code-tag">${esc(def?.label ?? k)}</code>
                </label>`;}).join('')
            : '<div style="font-size:0.82rem;color:rgba(255,255,255,0.4);font-style:italic">No tip annotations found</div>'}
        </div>
      </div>` : ''}
      ${numericalNodeKeys.length > 0 ? `
      <div class="exp-section" id="exp-node-label-section">
        <span class="exp-section-label">Node label</span>
        <div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem">
          <span class="pt-palette-label" style="white-space:nowrap">Annotation</span>
          <select id="exp-node-label-sel" class="pt-palette-select" style="flex:1;min-width:0">
            <option value="">None</option>
            ${numericalNodeKeys.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}
          </select>
        </div>
      </div>` : ''}`;

    exportFooter.innerHTML = `
      <button id="exp-cancel-btn"   class="btn btn-sm btn-secondary">Cancel</button>
      <button id="exp-download-btn" class="btn btn-sm btn-primary"><i class="bi bi-${_exportSaveHandler ? 'folder-check' : 'download'} me-1"></i>${_exportSaveHandler ? 'Export' : 'Download'}</button>`;

    $('exp-cancel-btn').addEventListener('click', _closeExportDialog);
    $('exp-download-btn').addEventListener('click', _doExport);

    // Always wire up the format radios to toggle the Store-settings / state rows,
    // regardless of whether annotations are present.
    root.querySelectorAll('input[name="exp-format"]').forEach(radio =>
      radio.addEventListener('change', () => {
        const fmt         = root.querySelector('input[name="exp-format"]:checked')?.value;
        const settingsRow = $('exp-settings-row');
        const stateRow    = $('exp-state-row');
        if (settingsRow) settingsRow.style.display = fmt === 'nexus' ? '' : 'none';
        if (stateRow)    stateRow.style.display    = fmt === 'nexus' ? '' : 'none';
      }));

    if (annotKeys.length > 0) {
      const treeGrid = $('exp-annot-grid-tree');
      const csvGrid  = $('exp-annot-grid-csv');
      const activeGrid   = () => root.querySelector('input[name="exp-format"]:checked')?.value === 'csv' ? csvGrid : treeGrid;
      const allCbs       = () => activeGrid()?.querySelectorAll('.exp-annot-cb') ?? [];
      const isNewick     = () => root.querySelector('input[name="exp-format"]:checked')?.value === 'newick';

      const _newickWarning = `
        <div id="exp-newick-warn" style="margin-top:0.5rem;padding:0.4rem 0.6rem;border-radius:4px;background:rgba(203,75,22,0.15);border:1px solid rgba(203,75,22,0.45);font-size:0.8rem;color:#e07040;display:flex;align-items:flex-start;gap:0.4rem">
          <i class="bi bi-exclamation-triangle-fill" style="flex-shrink:0;margin-top:1px"></i>
          <span>Annotations are not part of the Newick format and may be incompatible with some software.</span>
        </div>`;

      const _syncAnnotSection = () => {
        const fmt = root.querySelector('input[name="exp-format"]:checked')?.value;
        const settingsRow    = $('exp-settings-row');
        const stateRow       = $('exp-state-row');
        const nodeLabelRow   = $('exp-node-label-section');
        $('exp-newick-warn')?.remove();
        if (fmt === 'csv') {
          treeGrid.style.display = 'none';
          csvGrid.style.display  = '';
          csvGrid.querySelectorAll('.exp-annot-cb').forEach(cb => { cb.checked = true; });
          if (settingsRow)  settingsRow.style.display  = 'none';
          if (stateRow)     stateRow.style.display     = 'none';
          if (nodeLabelRow) nodeLabelRow.style.display = 'none';
        } else if (fmt === 'newick') {
          treeGrid.style.display = '';
          csvGrid.style.display  = 'none';
          treeGrid.querySelectorAll('.exp-annot-cb').forEach(cb => { cb.checked = false; });
          if (settingsRow)  settingsRow.style.display  = 'none';
          if (stateRow)     stateRow.style.display     = 'none';
          if (nodeLabelRow) nodeLabelRow.style.display = '';
        } else {
          treeGrid.style.display = '';
          csvGrid.style.display  = 'none';
          treeGrid.querySelectorAll('.exp-annot-cb').forEach(cb => { cb.checked = true; });
          if (settingsRow)  settingsRow.style.display  = '';
          if (stateRow)     stateRow.style.display     = '';
          if (nodeLabelRow) nodeLabelRow.style.display = '';
        }
      };

      // Format radio change → sync annotations.
      root.querySelectorAll('input[name="exp-format"]').forEach(radio =>
        radio.addEventListener('change', _syncAnnotSection));

      // Individual checkbox re-checked while Newick is active → show warning.
      treeGrid.addEventListener('change', e => {
        if (!isNewick() || !e.target.matches('.exp-annot-cb')) return;
        if (!$('exp-newick-warn')) {
          treeGrid.insertAdjacentHTML('afterend', _newickWarning);
        }
      });

      $('exp-all-btn').addEventListener('click', () => {
        allCbs().forEach(cb => { cb.checked = true; });
        if (isNewick() && !$('exp-newick-warn')) {
          treeGrid.insertAdjacentHTML('afterend', _newickWarning);
        }
      });
      $('exp-none-btn').addEventListener('click', () => {
        allCbs().forEach(cb => { cb.checked = false; });
        $('exp-newick-warn')?.remove();
      });
    }
  }

  /** CSV-escape a single cell value. */
  function _csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function _doExport() {
    const renderer  = getRenderer();
    const graph     = getGraph();
    const format    = root.querySelector('input[name="exp-format"]:checked')?.value || 'nexus';
    const scope     = root.querySelector('input[name="exp-scope"]:checked')?.value  || 'full';
    const storeSettings = format === 'nexus' && $('exp-store-settings')?.checked;
    const subtreeId = scope === 'subtree' ? renderer._viewSubtreeRootId : null;
    const gridId    = format === 'csv' ? '#exp-annot-grid-csv' : '#exp-annot-grid-tree';
    const annotKeys = [...root.querySelectorAll(`${gridId} .exp-annot-cb:checked`)].map(cb => cb.value);
    const nodeLabelKey = $('exp-node-label-sel')?.value || null;

    // ── CSV metadata export ───────────────────────────────────────────────────
    if (format === 'csv') {
      if (!renderer.nodes) return;
      // Collect all tips using the renderer's layout nodes (have isTip, name, annotations, y).
      let tips = renderer.nodes.filter(n => n.isTip);
      if (subtreeId) {
        // Keep only tips that are descendants of the subtree root.
        const subtreeSet = new Set();
        const stack = [subtreeId];
        while (stack.length) {
          const id   = stack.pop();
          const node = renderer.nodeMap?.get(id);
          if (!node) continue;
          if (node.isTip) subtreeSet.add(id);
          else if (node.children) node.children.forEach(c => stack.push(c));
        }
        tips = tips.filter(n => subtreeSet.has(n.id));
      }
      // Sort tips in tree display order by layout y position.
      tips = [...tips].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));

      const schema = graph.annotationSchema;
      // Resolve display labels and actual data keys from schema.
      const cols = annotKeys.map(k => {
        const def = schema?.get(k);
        return { key: k, label: def?.label ?? k, dataKey: def?.dataKey ?? k, isBuiltin: k.startsWith('__'), fmtValue: def?.fmtValue };
      });

      const header = ['name', ...cols.map(c => c.label)].map(_csvCell).join(',');
      const rows   = tips.map(tip => {
        const cells = [tip.name ?? tip.id ?? ''];
        for (const { key, dataKey, isBuiltin, fmtValue } of cols) {
          let raw;
          if (isBuiltin) {
            raw = renderer._statValue ? renderer._statValue(tip, key) : null;
          } else {
            raw = tip.annotations?.[dataKey] ?? null;
          }
          const val = raw == null ? ''
            : (typeof raw === 'number' && fmtValue) ? fmtValue(raw)
            : String(raw);
          cells.push(val);
        }
        return cells.map(_csvCell).join(',');
      });
      const content = [header, ...rows].join('\n') + '\n';

      if (_exportSaveHandler) {
        _exportSaveHandler({
          content,
          filename:   'metadata.csv',
          mimeType:   'text/csv',
          filterName: 'CSV files',
          extensions: ['csv'],
        });
      } else {
        downloadBlob(content, 'text/csv', 'metadata.csv');
      }
      _closeExportDialog();
      return;
    }

    const newick = (() => {
      // Optionally inject _pt_ state annotations for collapsed clades and highlights.
      const storeState = format === 'nexus' && $('exp-store-state')?.checked;
      let finalAnnotKeys = annotKeys;
      const _ptInjected = []; // { node, keys[] } to clean up after
      if (storeState) {
        for (const [nodeId, info] of graph.collapsedCladeIds) {
          const idx = graph.origIdToIdx.get(nodeId);
          if (idx === undefined) continue;
          const node = graph.nodes[idx];
          node.annotations._pt_collapsed = 'true';
          const keys = ['_pt_collapsed'];
          if (info.colour) { node.annotations._pt_collapsed_colour = info.colour; keys.push('_pt_collapsed_colour'); }
          _ptInjected.push({ node, keys });
        }
        for (const { id, colour } of renderer.getCladeHighlightsData()) {
          const idx = graph.origIdToIdx.get(id);
          if (idx === undefined) continue;
          const node = graph.nodes[idx];
          node.annotations._pt_highlight = colour ?? 'true';
          _ptInjected.push({ node, keys: ['_pt_highlight'] });
        }
        if (_ptInjected.length > 0) {
          finalAnnotKeys = [...annotKeys, '_pt_collapsed', '_pt_collapsed_colour', '_pt_highlight'];
        }
      }
      const result = graphToNewick(graph, subtreeId, finalAnnotKeys, nodeLabelKey);
      // Always clean up, even on error, to leave the graph annotations unchanged.
      for (const { node, keys } of _ptInjected) {
        for (const k of keys) delete node.annotations[k];
      }
      return result;
    })();
    if (!newick) return;

    let content, ext;
    if (format === 'nexus') {
      const rootedTag    = annotKeys.length > 0 ? '[&R] ' : '';
      const settingsLine = storeSettings
        ? `\t[peartree=${JSON.stringify(getSettingsSnapshot())}]\n`
        : '';
      content = `#NEXUS\nBEGIN TREES;\n\ttree TREE1 = ${rootedTag}${newick}\n${settingsLine}END;\n`;
      ext     = 'nexus';
    } else {
      content = newick + '\n';
      ext     = 'nwk';
    }

    if (_exportSaveHandler) {
      _exportSaveHandler({
        content,
        filename:   `tree.${ext}`,
        mimeType:   'text/plain',
        filterName: format === 'nexus' ? 'NEXUS files' : 'Newick files',
        extensions: [ext],
      });
    } else {
      downloadBlob(content, 'text/plain', `tree.${ext}`);
    }
    _closeExportDialog();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    openExportDialog,
    closeExportDialog:      _closeExportDialog,
    openGraphicsDialog:     _gfx.open,
    closeGraphicsDialog:    _gfx.close,
    doPrint:                _gfx.doPrint,
    setExportSaveHandler:   (fn) => { _exportSaveHandler   = fn; },
    setGraphicsSaveHandler: _gfx.setSaveHandler,
    setPrintTrigger:        _gfx.setPrintTrigger,
  };
}
