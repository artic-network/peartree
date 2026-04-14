// export-controller.js — Tree & graphics export dialogs plus print support.
// Extracted from peartree.js to keep the app controller focused.
// ─────────────────────────────────────────────────────────────────────────────

import { htmlEsc as esc, downloadBlob, blobToBase64 } from './utils.js';
import { isNumericType } from './phylograph.js';
import { graphToNewick } from './treeio.js';
import { viewportDims, compositeViewPng, buildGraphicSVG } from './graphicsio.js';
import { CAL_DATE_KEY, CAL_DATE_HPD_KEY, CAL_DATE_HPD_ONLY_KEY } from './treerenderer.js';

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

  // ── Save-handler slots (injected by platform adapters, e.g. Tauri) ──────────
  // When set, the "Download" button becomes "Save" and calls the handler with
  // { content, filename, mimeType, filterName, extensions } instead of triggering
  // a browser download.
  let _exportSaveHandler   = null;
  let _graphicsSaveHandler = null;
  let _printTrigger        = null; // platform override: fn(layer) → void|Promise

  // ── Wire close buttons once at construction ───────────────────────────────
  $('export-tree-close')?.addEventListener('click', _closeExportDialog);
  $('export-graphic-close')?.addEventListener('click', _closeGraphicsDialog);

  // ── Tree export DOM refs ───────────────────────────────────────────────────
  const exportOverlay  = $('export-tree-overlay');
  const exportBody     = $('export-tree-body');
  const exportFooter   = $('export-tree-footer');
  const exportTitleEl  = $('export-tree-title');

  // ── Graphics export DOM refs ───────────────────────────────────────────────
  const exportGraphicOverlay = $('export-graphic-overlay');
  const exportGraphicBody    = $('export-graphic-body');
  const exportGraphicFooter  = $('export-graphic-footer');
  const btnExportGraphic     = $('btn-export-graphic');
  btnExportGraphic?.addEventListener('click', () => openGraphicsDialog());

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
              <code style="font-size:0.78rem;background:#02292e;padding:0 3px;border-radius:3px">${esc(k)}</code>
            </label>`).join('')}
        </div>
        <div class="imp-col-grid" id="exp-annot-grid-csv" style="margin-top:0.35rem;display:none">
          ${tipAnnotKeys.length > 0
            ? tipAnnotKeys.map(k => {
                const def = schema.get(k);
                return `<label style="display:flex;align-items:center;gap:0.3rem;font-size:0.82rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  <input type="checkbox" class="exp-annot-cb" value="${esc(k)}" checked>
                  <code style="font-size:0.78rem;background:#02292e;padding:0 3px;border-radius:3px">${esc(def?.label ?? k)}</code>
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

    // Always wire up the format radios to toggle the Store-settings row,
    // regardless of whether annotations are present.
    root.querySelectorAll('input[name="exp-format"]').forEach(radio =>
      radio.addEventListener('change', () => {
        const fmt         = root.querySelector('input[name="exp-format"]:checked')?.value;
        const settingsRow = $('exp-settings-row');
        if (settingsRow) settingsRow.style.display = fmt === 'nexus' ? '' : 'none';
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
        const nodeLabelRow   = $('exp-node-label-section');
        $('exp-newick-warn')?.remove();
        if (fmt === 'csv') {
          treeGrid.style.display = 'none';
          csvGrid.style.display  = '';
          csvGrid.querySelectorAll('.exp-annot-cb').forEach(cb => { cb.checked = true; });
          if (settingsRow)  settingsRow.style.display  = 'none';
          if (nodeLabelRow) nodeLabelRow.style.display = 'none';
        } else if (fmt === 'newick') {
          treeGrid.style.display = '';
          csvGrid.style.display  = 'none';
          treeGrid.querySelectorAll('.exp-annot-cb').forEach(cb => { cb.checked = false; });
          if (settingsRow)  settingsRow.style.display  = 'none';
          if (nodeLabelRow) nodeLabelRow.style.display = '';
        } else {
          treeGrid.style.display = '';
          csvGrid.style.display  = 'none';
          treeGrid.querySelectorAll('.exp-annot-cb').forEach(cb => { cb.checked = true; });
          if (settingsRow)  settingsRow.style.display  = '';
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

    const newick = graphToNewick(graph, subtreeId, annotKeys, nodeLabelKey);
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

  // ── Graphics export ────────────────────────────────────────────────────────

  function openGraphicsDialog() {
    if (!getGraph()) return;
    exportGraphicOverlay.classList.add('open');
    _buildGraphicsDialog();
  }

  function _closeGraphicsDialog() {
    exportGraphicOverlay.classList.remove('open');
  }

  function _buildGraphicsDialog() {
    const { totalW, totalH } = viewportDims({ canvas, axisCanvas, legendRightCanvas });
    const defPx = Math.round(totalW * 2);
    const defH  = Math.round(totalH * 2);

    exportGraphicBody.innerHTML = `
      <div class="expg-row">
        <span class="expg-label">Filename</span>
        <input type="text" id="expg-filename" class="expg-input" value="tree" autocomplete="off" spellcheck="false">
        <span id="expg-ext-hint" style="font-size:0.82rem;color:var(--bs-secondary-color);flex-shrink:0">.svg</span>
      </div>
      <div class="expg-row">
        <span class="expg-label">Format</span>
        <div class="expg-radios">
          <label class="expg-radio"><input type="radio" name="expg-fmt" value="svg" checked>&nbsp;SVG (vector)</label>
          <label class="expg-radio"><input type="radio" name="expg-fmt" value="png">&nbsp;PNG (raster)</label>
        </div>
      </div>
      <div class="expg-row">
        <span class="expg-label">View</span>
        <div class="expg-radios">
          <label class="expg-radio"><input type="radio" name="expg-view" value="current" checked>&nbsp;Current view</label>
          <label class="expg-radio"><input type="radio" name="expg-view" value="full">&nbsp;Full tree</label>
        </div>
      </div>
      <div class="expg-row">
        <span class="expg-label">Background</span>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="expg-bg" checked>&nbsp;Include background colour
        </label>
      </div>
      <div id="expg-png-opts" style="display:none">
        <p class="expg-hint">Output size: ${defPx} × ${defH} px (2× current viewport)</p>
      </div>`;

    exportGraphicFooter.innerHTML = `
      <button id="expg-cancel-btn"   class="btn btn-sm btn-secondary">Cancel</button>
      <button id="expg-download-btn" class="btn btn-sm btn-primary"><i class="bi bi-${_graphicsSaveHandler ? 'folder-check' : 'download'} me-1"></i>${_graphicsSaveHandler ? 'Export' : 'Download'}</button>`;

    const _updateExpgHint = () => {
      const renderer = getRenderer();
      const { totalW, totalH, axH, axVisible } = viewportDims({ canvas, axisCanvas, legendRightCanvas });
      const isFull = root.querySelector('input[name="expg-view"]:checked')?.value === 'full';
      const ph = isFull
        ? Math.round((renderer.paddingTop + renderer.paddingBottom +
            (renderer.maxY + 1) * renderer.scaleY + (axVisible ? axH : 0)) * 2)
        : Math.round(totalH * 2);
      const pw = Math.round(totalW * 2);
      const p = root.querySelector('#expg-png-opts p');
      if (p) p.textContent =
        `Output size: ${pw} × ${ph} px (2× ${isFull ? 'full tree height' : 'current viewport'})`;
    };
    root.querySelectorAll('input[name="expg-fmt"]').forEach(r => r.addEventListener('change', () => {
      const isPng = root.querySelector('input[name="expg-fmt"]:checked')?.value === 'png';
      $('expg-png-opts').style.display = isPng ? 'block' : 'none';
      $('expg-ext-hint').textContent = isPng ? '.png' : '.svg';
      if (isPng) _updateExpgHint();
    }));
    root.querySelectorAll('input[name="expg-view"]').forEach(r => r.addEventListener('change', _updateExpgHint));
    $('expg-cancel-btn').addEventListener('click',   _closeGraphicsDialog);
    $('expg-download-btn').addEventListener('click', _doGraphicsExport);
  }

  function _doGraphicsExport() {
    const renderer  = getRenderer();
    const fmt       = root.querySelector('input[name="expg-fmt"]:checked')?.value || 'svg';
    const filename  = ($('expg-filename')?.value.trim() || 'tree');
    const fullTree  = root.querySelector('input[name="expg-view"]:checked')?.value === 'full';
    const transparent = !($('expg-bg')?.checked ?? true);

    if (fmt === 'png') {
      const { totalW, totalH, axH, axVisible } = viewportDims({ canvas, axisCanvas, legendRightCanvas });
      const targetW = Math.round(totalW * 2);
      const targetH = fullTree
        ? Math.round((renderer.paddingTop + renderer.paddingBottom +
            (renderer.maxY + 1) * renderer.scaleY + (axVisible ? axH : 0)) * 2)
        : Math.round(totalH * 2);

      compositeViewPng({ renderer, canvas, axisCanvas, legendRightCanvas, axisRenderer }, targetW, targetH, fullTree, transparent).convertToBlob({ type: 'image/png' }).then(async blob => {
        if (_graphicsSaveHandler) {
          _graphicsSaveHandler({
            contentBase64: await blobToBase64(blob),
            base64:        true,
            filename:      `${filename}.png`,
            mimeType:      'image/png',
            filterName:    'PNG images',
            extensions:    ['png'],
          });
        } else {
          downloadBlob(blob, 'image/png', `${filename}.png`);
        }
      });
    } else {
      const legendRenderer = getLegendRenderer();
      const svgStr = buildGraphicSVG({ renderer, legendRenderer, canvas, axisCanvas, legendRightCanvas, legend2RightCanvas, axisRenderer }, fullTree, transparent);
      if (!svgStr) return;
      if (_graphicsSaveHandler) {
        _graphicsSaveHandler({
          content:    svgStr,
          base64:     false,
          filename:   `${filename}.svg`,
          mimeType:   'image/svg+xml',
          filterName: 'SVG images',
          extensions: ['svg'],
        });
      } else {
        downloadBlob(svgStr, 'image/svg+xml', `${filename}.svg`);
      }
    }
    _closeGraphicsDialog();
  }

  // ── Print ──────────────────────────────────────────────────────────────────

  /**
   * Print the current tree via the OS print dialog.
   * On macOS, the print panel has a PDF dropdown with "Save as PDF".
   * Builds the composite SVG, injects it into a hidden #pt-print-layer, then
   * calls window.print(). The layer is cleared once the dialog closes.
   */
  function doPrint() {
    const renderer       = getRenderer();
    const legendRenderer = getLegendRenderer();
    if (!getGraph()) return;
    const svgStr = buildGraphicSVG(
      { renderer, legendRenderer, canvas, axisCanvas, legendRightCanvas, legend2RightCanvas, axisRenderer },
      false, false,
    );
    if (!svgStr) return;
    let layer = document.getElementById('pt-print-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'pt-print-layer';
      document.body.appendChild(layer);
    }
    layer.innerHTML = svgStr;
    // afterprint cleans up; add a fallback timeout for environments where it doesn't fire.
    const _cleanup = () => { layer.innerHTML = ''; };
    window.addEventListener('afterprint', _cleanup, { once: true });
    setTimeout(() => { if (layer.innerHTML) _cleanup(); }, 60_000); // safety net
    // Wait for two animation frames so the browser paints the SVG before the print
    // snapshot is taken (critical in WKWebView/Tauri where the snapshot is immediate).
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (_printTrigger) {
        _printTrigger(layer);
      } else {
        window.print();
      }
    }));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    openExportDialog,
    closeExportDialog:      _closeExportDialog,
    openGraphicsDialog,
    closeGraphicsDialog:    _closeGraphicsDialog,
    doPrint,
    setExportSaveHandler:   (fn) => { _exportSaveHandler   = fn; },
    setGraphicsSaveHandler: (fn) => { _graphicsSaveHandler = fn; },
    setPrintTrigger:        (fn) => { _printTrigger = fn; },
  };
}
