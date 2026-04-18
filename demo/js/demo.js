/**
 * demo.js — Pearcore Demo application (ES6 module).
 *
 * A minimal bar-chart app that validates the pearcore framework:
 * - loads CSV data (drag-drop or file picker)
 * - renders a bar chart on a <canvas>
 * - palette panel controls visual settings
 * - image export via pearcore graphics-export
 * - help/about panels, dark/light mode, settings persistence
 */

import { downloadBlob, wireDropZone } from '../../pearcore/js/utils.js';
import { createCommands } from '../../pearcore/js/commands.js';
import { createGraphicsExporter } from '../../pearcore/js/graphics-export.js';
import { loadSettings, saveSettings as _saveSettings } from '../../pearcore/js/pearcore-app.js';

// ── Command definitions ──────────────────────────────────────────────────

const COMMAND_DEFS = [
  { id: 'open',   label: 'Open…',        shortcut: 'CmdOrCtrl+O', buttonId: 'btn-open' },
  { id: 'export', label: 'Export Image…', shortcut: 'CmdOrCtrl+Shift+E', buttonId: 'btn-export' },
];

// ── CSV parser ───────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim());
    rows.push({ label: cols[0] || `Row ${i}`, values: cols.slice(1).map(Number) });
  }
  return { headers, rows, valueColumns: headers.slice(1) };
}

// ── Main app ─────────────────────────────────────────────────────────────

export async function app(opts = {}) {
  const root = document;
  const $ = id => root.querySelector('#' + id);

  // ── State ────────────────────────────────────────────────────────────
  let data = null;       // { headers, rows, valueColumns }
  let fileName = '';
  let settings = {};

  // ── Commands ─────────────────────────────────────────────────────────
  const commands = createCommands(root, COMMAND_DEFS);

  // ── Settings persistence ─────────────────────────────────────────────
  const storageKey = opts.storageKey ?? null;

  function _readSettings() {
    return {
      bgColor:      $('canvas-bg-color')?.value   ?? '#02292e',
      barColor:     $('bar-color')?.value          ?? '#4fc3f7',
      barOutline:   $('bar-outline-color')?.value  ?? '#0288d1',
      barGap:       +($('bar-gap-slider')?.value   ?? 20),
      barRadius:    +($('bar-radius-slider')?.value ?? 3),
      showLabels:   $('show-labels')?.value         ?? 'on',
      showValues:   $('show-values')?.value         ?? 'on',
      labelSize:    +($('label-size-slider')?.value ?? 11),
      labelColor:   $('label-color')?.value         ?? '#f7eeca',
      showAxis:     $('show-axis')?.value           ?? 'on',
      axisColor:    $('axis-color')?.value          ?? '#546e7a',
      gridLines:    +($('grid-lines-slider')?.value ?? 5),
    };
  }

  function _applySettings(s) {
    if (!s) return;
    if (s.bgColor)     $('canvas-bg-color').value       = s.bgColor;
    if (s.barColor)    $('bar-color').value              = s.barColor;
    if (s.barOutline)  $('bar-outline-color').value      = s.barOutline;
    if (s.barGap != null)    { $('bar-gap-slider').value    = s.barGap;    $('bar-gap-value').textContent    = s.barGap + '%'; }
    if (s.barRadius != null) { $('bar-radius-slider').value = s.barRadius; $('bar-radius-value').textContent = s.barRadius; }
    if (s.showLabels)  $('show-labels').value            = s.showLabels;
    if (s.showValues)  $('show-values').value            = s.showValues;
    if (s.labelSize != null) { $('label-size-slider').value = s.labelSize; $('label-size-value').textContent = s.labelSize; }
    if (s.labelColor)  $('label-color').value            = s.labelColor;
    if (s.showAxis)    $('show-axis').value              = s.showAxis;
    if (s.axisColor)   $('axis-color').value             = s.axisColor;
    if (s.gridLines != null) { $('grid-lines-slider').value = s.gridLines; $('grid-lines-value').textContent = s.gridLines; }
  }

  function _saveState() {
    if (storageKey) _saveSettings(storageKey, _readSettings());
  }

  // Restore saved settings
  const saved = loadSettings(storageKey);
  if (saved) _applySettings(saved);

  // ── Core UI bindings ─────────────────────────────────────────────────
  const { palette, helpAbout } = initCoreUIBindings(root, {
    fetchContent: async (filename) => {
      try { const r = await fetch(filename); return r.ok ? r.text() : ''; }
      catch { return ''; }
    },
    helpFile: 'help.md',
    aboutFile: 'about.md',
    onPaletteStateChange: () => requestAnimationFrame(render),
  });

  // ── Canvas setup ─────────────────────────────────────────────────────
  const canvas = $('chart-canvas');
  const ctx = canvas.getContext('2d');

  function _resize() {
    const wrapper = $('canvas-wrapper');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrapper.clientWidth * dpr;
    canvas.height = wrapper.clientHeight * dpr;
    canvas.style.width = wrapper.clientWidth + 'px';
    canvas.style.height = wrapper.clientHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Render ───────────────────────────────────────────────────────────
  function render() {
    _resize();
    settings = _readSettings();
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    // Background
    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, w, h);

    if (!data) return;

    const margin = { top: 30, right: 20, bottom: 50, left: 60 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    if (plotW <= 0 || plotH <= 0) return;

    // Use first value column
    const values = data.rows.map(r => r.values[0] || 0);
    const maxVal = Math.max(...values, 1);
    const n = values.length;
    const gapFrac = settings.barGap / 100;
    const barW = plotW / n;
    const innerW = barW * (1 - gapFrac);
    const gapW = barW * gapFrac;

    // Grid lines
    if (settings.showAxis === 'on' && settings.gridLines > 0) {
      ctx.strokeStyle = settings.axisColor;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i <= settings.gridLines; i++) {
        const y = margin.top + plotH - (i / settings.gridLines) * plotH;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotW, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Axis line
    if (settings.showAxis === 'on') {
      ctx.strokeStyle = settings.axisColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, margin.top + plotH);
      ctx.lineTo(margin.left + plotW, margin.top + plotH);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = settings.axisColor;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= settings.gridLines; i++) {
        const val = (i / settings.gridLines) * maxVal;
        const y = margin.top + plotH - (i / settings.gridLines) * plotH;
        ctx.fillText(val.toFixed(maxVal < 10 ? 1 : 0), margin.left - 6, y);
      }
    }

    // Bars
    const radius = settings.barRadius;
    for (let i = 0; i < n; i++) {
      const x = margin.left + i * barW + gapW / 2;
      const barH = (values[i] / maxVal) * plotH;
      const y = margin.top + plotH - barH;

      ctx.fillStyle = settings.barColor;
      _roundRect(ctx, x, y, innerW, barH, radius);
      ctx.fill();

      ctx.strokeStyle = settings.barOutline;
      ctx.lineWidth = 1;
      _roundRect(ctx, x, y, innerW, barH, radius);
      ctx.stroke();

      // Value labels
      if (settings.showValues === 'on') {
        ctx.fillStyle = settings.labelColor;
        ctx.font = `${settings.labelSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(values[i].toFixed(maxVal < 10 ? 1 : 0), x + innerW / 2, y - 4);
      }

      // Category labels
      if (settings.showLabels === 'on') {
        ctx.fillStyle = settings.labelColor;
        ctx.font = `${settings.labelSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          data.rows[i].label,
          x + innerW / 2,
          margin.top + plotH + 6,
        );
      }
    }
  }

  function _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ── File loading ─────────────────────────────────────────────────────
  function loadCSV(text, name) {
    const parsed = parseCSV(text);
    if (!parsed || parsed.rows.length === 0) {
      showAlertDialog('Error', 'Could not parse CSV file — expected a header row and at least one data row.');
      return;
    }
    data = parsed;
    fileName = name || 'data';
    $('empty-state').style.display = 'none';
    $('toolbar-title').textContent = fileName;
    $('status-stats').textContent = `${data.rows.length} items · ${data.valueColumns.length} column${data.valueColumns.length !== 1 ? 's' : ''}`;
    commands.setEnabled('export', true);
    $('btn-export')?.removeAttribute('disabled');
    render();
    _saveState();
  }

  function _loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadCSV(reader.result, file.name);
    reader.readAsText(file);
  }

  // ── Open modal ───────────────────────────────────────────────────────
  const openOverlay = $('open-file-overlay');

  function _openModal() {
    openOverlay?.classList.add('open');
  }
  function _closeModal() {
    openOverlay?.classList.remove('open');
  }

  $('btn-modal-close')?.addEventListener('click', _closeModal);
  $('btn-file-choose')?.addEventListener('click', () => $('csv-file-input')?.click());
  $('csv-file-input')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) { _loadFile(file); _closeModal(); }
  });

  // Wire drop zone in modal
  const dropZone = $('csv-drop-zone');
  if (dropZone) {
    wireDropZone(dropZone, file => { if (file) { _loadFile(file); _closeModal(); } });
  }

  // Wire drop on canvas
  const canvasWrapper = $('canvas-wrapper');
  if (canvasWrapper) {
    wireDropZone(canvasWrapper, file => { if (file) _loadFile(file); }, { checkContains: true });
  }

  $('empty-state-open-btn')?.addEventListener('click', _openModal);

  // ── Commands ─────────────────────────────────────────────────────────
  commands.get('open').exec = _openModal;
  commands.get('export').exec = () => exporter.open();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    for (const [, cmd] of commands.getAll()) {
      if (cmd.shortcut && commands.matchesShortcut(e, cmd.shortcut) && cmd.enabled) {
        e.preventDefault();
        cmd.exec?.();
        return;
      }
    }
  });

  // ── Graphics export ──────────────────────────────────────────────────
  const exporter = createGraphicsExporter({
    overlay:      $('export-graphic-overlay'),
    body:         $('export-graphic-body'),
    footer:       $('export-graphic-footer'),
    closeBtn:     $('export-graphic-close'),
    openBtn:      $('btn-export'),
    prefix:       'demo-gfx',
    defaultFilename: 'demo-chart',
    getViewportDims: () => {
      const wr = $('canvas-wrapper');
      return { width: wr?.clientWidth || 800, height: wr?.clientHeight || 600 };
    },
    buildSvg: () => null, // SVG not implemented in this demo
    buildPngCanvas: ({ width, height }) => {
      if (!data) return null;
      const offscreen = new OffscreenCanvas(width, height);
      const offCtx = offscreen.getContext('2d');
      // Re-render at export dimensions
      const dpr = 1;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const savedCanvas = canvas;
      const savedCtx = ctx;
      // Temporarily override for render
      // Just draw to offscreen directly
      offCtx.fillStyle = settings.bgColor;
      offCtx.fillRect(0, 0, width, height);
      // Simple re-render into offscreen
      const margin = { top: 30, right: 20, bottom: 50, left: 60 };
      const plotW = width - margin.left - margin.right;
      const plotH = height - margin.top - margin.bottom;
      if (plotW > 0 && plotH > 0) {
        const values = data.rows.map(r => r.values[0] || 0);
        const maxVal = Math.max(...values, 1);
        const n = values.length;
        const gapFrac = settings.barGap / 100;
        const barW = plotW / n;
        const innerW = barW * (1 - gapFrac);
        const gapW = barW * gapFrac;
        const radius = settings.barRadius;
        for (let i = 0; i < n; i++) {
          const x = margin.left + i * barW + gapW / 2;
          const barH = (values[i] / maxVal) * plotH;
          const y = margin.top + plotH - barH;
          offCtx.fillStyle = settings.barColor;
          _roundRect(offCtx, x, y, innerW, barH, radius);
          offCtx.fill();
          offCtx.strokeStyle = settings.barOutline;
          offCtx.lineWidth = 1;
          _roundRect(offCtx, x, y, innerW, barH, radius);
          offCtx.stroke();
        }
      }
      return offscreen;
    },
    hasContent: () => !!data,
  });

  // ── Palette wiring ───────────────────────────────────────────────────
  const _paletteInputs = document.querySelectorAll(
    '#palette-panel input, #palette-panel select'
  );
  for (const el of _paletteInputs) {
    el.addEventListener('input', () => { render(); _saveState(); });
    el.addEventListener('change', () => { render(); _saveState(); });
  }

  // Wire slider value displays
  for (const slider of document.querySelectorAll('#palette-panel input[type=range]')) {
    const valSpan = $(`${slider.id.replace('-slider', '-value')}`);
    if (valSpan) {
      slider.addEventListener('input', () => {
        valSpan.textContent = slider.value + (slider.id.includes('gap') ? '%' : '');
      });
    }
  }

  // ── Resize handling ──────────────────────────────────────────────────
  window.addEventListener('resize', () => requestAnimationFrame(render));

  // ── Tooltip ──────────────────────────────────────────────────────────
  const tooltip = $('tooltip');
  canvas.addEventListener('mousemove', e => {
    if (!data) { tooltip.style.display = 'none'; return; }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const margin = { top: 30, right: 20, bottom: 50, left: 60 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    const values = data.rows.map(r => r.values[0] || 0);
    const maxVal = Math.max(...values, 1);
    const n = values.length;
    const barW = plotW / n;
    const gapFrac = settings.barGap / 100;
    const innerW = barW * (1 - gapFrac);
    const gapW = barW * gapFrac;

    let hit = -1;
    for (let i = 0; i < n; i++) {
      const x = margin.left + i * barW + gapW / 2;
      const barH = (values[i] / maxVal) * plotH;
      const y = margin.top + plotH - barH;
      if (mx >= x && mx <= x + innerW && my >= y && my <= margin.top + plotH) {
        hit = i;
        break;
      }
    }

    if (hit >= 0) {
      tooltip.textContent = `${data.rows[hit].label}: ${values[hit]}`;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 8) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  });
  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

  // Initial render
  render();
}
