// colorpicker.js — reusable swatch + native-colour-picker popup widget.
//
// Two public exports:
//
//  createToolbarColourPicker(opts)
//    Wires the existing toolbar colour-pick DOM (already present in the
//    toolbar HTML built by peartree-ui.js) to the swatch popup.  Returns
//    { getValue, setValue, addRecent, normaliseHex, open, close }.
//
//  createPaletteColourPicker(inputEl, opts)
//    Upgrades a bare <input type="color" class="pt-palette-color"> in the
//    side panel into a swatch-button + popup that matches the toolbar widget.
//    The original input is hidden and kept as the authoritative value store
//    so existing peartree.js change-listeners keep working without changes.
//    Returns { getValue, setValue, open, close }.
//
// Both use the same CATEGORICAL_PALETTES (passed in via opts.palettes) and
// share the same localStorage recent-colour list.
// ─────────────────────────────────────────────────────────────────────────────

const RECENT_COLOURS_KEY = 'pt-recent-colours';
const MAX_RECENT = 8;

// ── Shared recent-colour state ───────────────────────────────────────────────

let _recentColours = (() => {
  try { return JSON.parse(localStorage.getItem(RECENT_COLOURS_KEY) || '[]'); }
  catch { return []; }
})();

function _saveRecent() {
  try { localStorage.setItem(RECENT_COLOURS_KEY, JSON.stringify(_recentColours)); } catch {}
}

export function addRecentColour(hex) {
  hex = hex.toLowerCase();
  _recentColours = [hex, ..._recentColours.filter(c => c !== hex)].slice(0, MAX_RECENT);
  _saveRecent();
}

// ── Utility ──────────────────────────────────────────────────────────────────

export function normaliseHex(h) {
  if (!h) return null;
  h = h.trim();
  if (/^#[0-9a-f]{3}$/i.test(h))
    h = '#' + h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
  return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : null;
}

// ── Shared popup builder ─────────────────────────────────────────────────────

/**
 * Build a detached popup element and return it together with helpers to
 * render its contents.  The caller is responsible for appending it to the
 * DOM and positioning it.
 *
 * @param {object} opts
 * @param {object} opts.palettes         – CATEGORICAL_PALETTES object
 * @param {function} opts.onPick         – called with (hex) when a swatch is clicked
 * @param {function} [opts.onNative]     – called with (hex) on native input change
 * @param {function} [opts.getCurrentHex] – () => current hex string (for selected ring)
 */
function _buildPopup(opts) {
  const { palettes, onPick, onNative, getCurrentHex } = opts;

  const popup = document.createElement('div');
  popup.className = 'pt-cp-popup';

  // ── Native colour input row ───────────────────────────────────────────────
  const nativeRow = document.createElement('div');
  nativeRow.className = 'pt-cp-native-row';

  const nativeInput = document.createElement('input');
  nativeInput.type  = 'color';
  nativeInput.title = 'Open colour picker…';
  nativeInput.className = 'pt-cp-native-input';

  const nativeLabel = document.createElement('span');
  nativeLabel.textContent = 'Custom colour…';
  nativeLabel.style.cssText = 'font-size:0.75rem;color:var(--pt-text-status-sep)';

  nativeInput.addEventListener('input', (e) => {
    e.stopPropagation();
    const hex = e.target.value;
    if (onNative) onNative(hex);
    onPick(hex);
  });

  nativeRow.appendChild(nativeInput);
  nativeRow.appendChild(nativeLabel);
  popup.appendChild(nativeRow);

  // ── Recent row ────────────────────────────────────────────────────────────
  const recentRow = document.createElement('div');
  recentRow.className = 'pt-cp-row';
  const recentLabel = document.createElement('span');
  recentLabel.className = 'pt-cp-label';
  recentLabel.textContent = 'Recent';
  const recentSwatches = document.createElement('div');
  recentSwatches.className = 'pt-cp-swatches';
  recentRow.appendChild(recentLabel);
  recentRow.appendChild(recentSwatches);
  popup.appendChild(recentRow);

  // ── Divider ───────────────────────────────────────────────────────────────
  const hr = document.createElement('hr');
  hr.className = 'pt-cp-divider';
  popup.appendChild(hr);

  // ── Palette rows ──────────────────────────────────────────────────────────
  const palettesEl = document.createElement('div');
  popup.appendChild(palettesEl);

  // ── Render / refresh helper ───────────────────────────────────────────────
  function render() {
    const curHex = getCurrentHex?.() ?? '';

    // Recent swatches
    recentSwatches.innerHTML = '';
    if (_recentColours.length === 0) {
      const empty = document.createElement('span');
      empty.style.cssText = 'font-size:0.65rem;color:rgba(242,241,230,0.3);font-style:italic';
      empty.textContent = '—';
      recentSwatches.appendChild(empty);
    } else {
      for (const hex of _recentColours)
        recentSwatches.appendChild(_makeSwatch(hex, curHex, onPick));
    }

    // Palette rows
    palettesEl.innerHTML = '';
    for (const [name, colours] of Object.entries(palettes)) {
      const row = document.createElement('div');
      row.className = 'pt-cp-row';
      const label = document.createElement('span');
      label.className = 'pt-cp-label';
      label.textContent = name;
      const swatches = document.createElement('div');
      swatches.className = 'pt-cp-swatches';
      for (const hex of colours)
        swatches.appendChild(_makeSwatch(hex, curHex, onPick));
      row.appendChild(label);
      row.appendChild(swatches);
      palettesEl.appendChild(row);
    }

    // Sync native input to current value
    if (curHex) nativeInput.value = curHex;
  }

  return { popup, render, nativeInput };
}

function _makeSwatch(hex, curHex, onPick) {
  const s = document.createElement('div');
  s.className = 'pt-cp-swatch';
  s.style.background = hex;
  s.title = hex;
  if (curHex && curHex.toLowerCase() === hex) s.classList.add('selected');
  s.addEventListener('click', (e) => { e.stopPropagation(); onPick(hex); });
  return s;
}

// ── Close-on-outside-click registry ─────────────────────────────────────────
// A single document listener handles all open popups.

const _openPopups = new Set();
document.addEventListener('click', (e) => {
  for (const { popup, triggerEl, close } of _openPopups) {
    if (!popup.contains(e.target) && e.target !== triggerEl) close();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') for (const { close } of [..._openPopups]) close();
});

// ── Toolbar colour picker ────────────────────────────────────────────────────

/**
 * Wire the existing toolbar colour-pick DOM.
 *
 * Expected DOM (already built by peartree-ui.js _tbSectionColour()):
 *   #btn-colour-trigger          — swatch button that opens the popup
 *   #btn-colour-trigger-swatch   — coloured square inside the button
 *   #btn-node-colour             — hidden <input type="color"> (value store)
 *   #colour-picker-popup         — the popup container (pre-built HTML)
 *   #btn-colour-native-open      — native <input type="color"> inside popup
 *   #colour-picker-recent        — container for recent swatches
 *   #colour-picker-palettes      — container for palette rows
 *
 * @param {object} opts
 * @param {HTMLElement} opts.root          – root element for DOM queries
 * @param {object}      opts.palettes      – CATEGORICAL_PALETTES
 * @param {function}    [$]               – element getter (id => el), defaults to document.getElementById
 */
export function createToolbarColourPicker({ root, palettes, $ : _$ }) {
  const get = _$ ?? (id => document.getElementById(id));

  const valueInput         = get('btn-node-colour');
  const triggerBtn         = get('btn-colour-trigger');
  const triggerSwatch      = get('btn-colour-trigger-swatch');
  const popup              = get('colour-picker-popup');
  const nativeOpenEl       = get('btn-colour-native-open');
  const recentEl           = get('colour-picker-recent');
  const palettesEl         = get('colour-picker-palettes');

  if (!triggerBtn || !popup) return null;

  function getCurrentHex() { return valueInput?.value?.toLowerCase() ?? '#ff8800'; }

  function setValue(hex) {
    if (valueInput) valueInput.value = hex;
    if (nativeOpenEl) nativeOpenEl.value = hex;
    if (triggerSwatch) triggerSwatch.style.background = hex;
  }

  function _renderPopup() {
    const curHex = getCurrentHex();
    if (nativeOpenEl) nativeOpenEl.value = curHex;

    // Recent
    if (recentEl) {
      recentEl.innerHTML = '';
      if (_recentColours.length === 0) {
        const empty = document.createElement('span');
        empty.style.cssText = 'font-size:0.65rem;color:rgba(242,241,230,0.3);font-style:italic';
        empty.textContent = '—';
        recentEl.appendChild(empty);
      } else {
        for (const hex of _recentColours)
          recentEl.appendChild(_makeSwatch(hex, curHex, (h) => { setValue(h); close(); }));
      }
    }

    // Palettes
    if (palettesEl) {
      palettesEl.innerHTML = '';
      for (const [name, colours] of Object.entries(palettes)) {
        const row = document.createElement('div');
        row.className = 'pt-cp-row';
        const label = document.createElement('span');
        label.className = 'pt-cp-label';
        label.textContent = name;
        const swatches = document.createElement('div');
        swatches.className = 'pt-cp-swatches';
        for (const hex of colours)
          swatches.appendChild(_makeSwatch(hex, curHex, (h) => { setValue(h); close(); }));
        row.appendChild(label);
        row.appendChild(swatches);
        palettesEl.appendChild(row);
      }
    }
  }

  function open() {
    _renderPopup();
    popup.classList.add('open');
    _openPopups.add(entry);
  }

  function close() {
    popup.classList.remove('open');
    _openPopups.delete(entry);
  }

  const entry = { popup, triggerEl: triggerBtn, close };

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.contains('open') ? close() : open();
  });

  if (nativeOpenEl) {
    nativeOpenEl.addEventListener('input', (e) => {
      e.stopPropagation();
      setValue(e.target.value);
    });
  }

  return {
    getValue:        getCurrentHex,
    setValue,
    addRecent:       addRecentColour,
    normaliseHex,
    open,
    close,
  };
}

// ── Palette-panel colour picker ──────────────────────────────────────────────

/**
 * Upgrade a bare <input type="color" class="pt-palette-color"> in the side
 * panel into a swatch-button + popup.  The original input is hidden but kept
 * as the value store so existing `input` event listeners in peartree.js
 * continue to fire without modification.
 *
 * @param {HTMLInputElement} inputEl   – the existing <input type="color">
 * @param {object}           opts
 * @param {object}           opts.palettes  – CATEGORICAL_PALETTES
 */
export function createPaletteColourPicker(inputEl, { palettes }) {
  if (!inputEl) return null;

  // Hide the raw input but keep it in the DOM
  inputEl.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';

  // ── Build the trigger button ──────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pt-pcp-trigger';
  btn.title = inputEl.closest('[title]')?.title ?? 'Choose colour';

  const swatch = document.createElement('span');
  swatch.className = 'pt-pcp-swatch';
  swatch.style.background = inputEl.value || '#888888';
  btn.appendChild(swatch);

  // Insert button immediately after the hidden input
  inputEl.insertAdjacentElement('afterend', btn);

  // ── Build the popup ───────────────────────────────────────────────────────
  const { popup, render } = _buildPopup({
    palettes,
    getCurrentHex: () => inputEl.value.toLowerCase(),
    onPick: (hex) => {
      setValue(hex);
      // Fire a synthetic `input` event so peartree.js listeners are notified
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      addRecentColour(hex);
      close();
    },
  });

  popup.className += ' pt-pcp-popup';
  // Position popup relative to the trigger button's parent row
  btn.style.position = 'relative';
  btn.appendChild(popup);

  function getValue() { return inputEl.value; }

  function setValue(hex) {
    inputEl.value = hex;
    swatch.style.background = hex;
  }

  function open() {
    render();
    popup.classList.add('open');
    _openPopups.add(entry);
  }

  function close() {
    popup.classList.remove('open');
    _openPopups.delete(entry);
  }

  const entry = { popup, triggerEl: btn, close };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.contains('open') ? close() : open();
  });

  // If the host palette row has a title, forward it to the button
  const row = inputEl.closest('.pt-palette-row');
  if (row?.title) btn.title = row.title;

  return { getValue, setValue, open, close };
}

/**
 * Upgrade every <input type="color" class="pt-palette-color"> found inside
 * `containerEl` in one call.
 *
 * @param {HTMLElement} containerEl
 * @param {object}      opts          – same as createPaletteColourPicker opts
 * @returns {Map<HTMLInputElement, object>}  input → picker instance
 */
export function upgradeAllPaletteColourPickers(containerEl, opts) {
  const map = new Map();
  for (const el of containerEl.querySelectorAll('input.pt-palette-color[type="color"]')) {
    map.set(el, createPaletteColourPicker(el, opts));
  }
  return map;
}
