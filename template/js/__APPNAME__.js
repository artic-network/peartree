/**
 * __APPNAME__.js — Application entry module (ES6).
 *
 * TODO: Replace this boilerplate with your application logic.
 * This template provides: canvas rendering, file I/O, image export,
 * settings persistence, help/about panels, and dark/light theme.
 */

import { downloadBlob, wireDropZone } from '@artic-network/pearcore/utils.js';
import { createCommands } from '@artic-network/pearcore/commands.js';
import { createGraphicsExporter } from '@artic-network/pearcore/graphics-export.js';
import { loadSettings, saveSettings as _saveSettings } from '@artic-network/pearcore/pearcore-app.js';

// ── Command definitions ──────────────────────────────────────────────────

const COMMAND_DEFS = [
  { id: 'open',   label: 'Open…',        shortcut: 'CmdOrCtrl+O', buttonId: 'btn-open' },
  { id: 'export', label: 'Export Image…', shortcut: 'CmdOrCtrl+Shift+E', buttonId: 'btn-export' },
];

// ── Main app ─────────────────────────────────────────────────────────────

export async function app(opts = {}) {
  const root = document;
  const $ = id => root.querySelector('#' + id);

  // ── State ────────────────────────────────────────────────────────────
  let data = null;       // TODO: replace with your data model
  let fileName = '';
  let settings = {};

  // ── Commands ─────────────────────────────────────────────────────────
  const commands = createCommands(root, COMMAND_DEFS);

  // ── Settings persistence ─────────────────────────────────────────────
  const storageKey = opts.storageKey ?? null;

  /** Read current settings from palette panel controls. */
  function _readSettings() {
    return {
      bgColor: $('canvas-bg-color')?.value ?? '#02292e',
      // TODO: add your settings here
    };
  }

  /** Apply saved settings to palette panel controls. */
  function _applySettings(s) {
    if (!s) return;
    if (s.bgColor) $('canvas-bg-color').value = s.bgColor;
    // TODO: apply your settings here
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
  const canvas = $('app-canvas');
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

    // TODO: draw your content here
  }

  // ── File loading ─────────────────────────────────────────────────────

  /** Load content from a text string. TODO: replace with your parser. */
  function loadContent(text, name) {
    // TODO: parse text into your data model
    data = { raw: text };
    fileName = name || 'data';
    $('empty-state').style.display = 'none';
    $('toolbar-title').textContent = fileName;
    $('status-stats').textContent = `Loaded: ${fileName}`;
    commands.setEnabled('export', true);
    $('btn-export')?.removeAttribute('disabled');
    render();
    _saveState();
  }

  function _loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadContent(reader.result, file.name);
    reader.readAsText(file);
  }

  // ── Open modal ───────────────────────────────────────────────────────
  const openOverlay = $('open-file-overlay');

  function _openModal() { openOverlay?.classList.add('open'); }
  function _closeModal() { openOverlay?.classList.remove('open'); }

  $('btn-modal-close')?.addEventListener('click', _closeModal);
  $('btn-file-choose')?.addEventListener('click', () => $('file-input')?.click());
  $('file-input')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) { _loadFile(file); _closeModal(); }
  });

  // Wire drop zone in modal
  const dropZone = $('file-drop-zone');
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
    prefix:       '__APPNAME__-gfx',
    defaultFilename: '__APPNAME__-export',
    getViewportDims: () => {
      const wr = $('canvas-wrapper');
      return { width: wr?.clientWidth || 800, height: wr?.clientHeight || 600 };
    },
    buildSvg: () => null,  // TODO: implement SVG export if needed
    buildPngCanvas: ({ width, height }) => {
      if (!data) return null;
      const offscreen = new OffscreenCanvas(width, height);
      const offCtx = offscreen.getContext('2d');
      offCtx.fillStyle = settings.bgColor;
      offCtx.fillRect(0, 0, width, height);
      // TODO: re-render your content into offCtx at (width × height)
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
        valSpan.textContent = slider.value;
      });
    }
  }

  // ── Resize handling ──────────────────────────────────────────────────
  window.addEventListener('resize', () => requestAnimationFrame(render));

  // Initial render
  render();
}
