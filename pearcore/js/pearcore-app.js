/**
 * pearcore-app.js — Application lifecycle utilities for pearcore-based apps.
 *
 * Provides reusable factories for theme management, embed config resolution,
 * section accordion behaviour, and dynamic asset loading.
 */

// ── Theme Manager ─────────────────────────────────────────────────────────

/**
 * Create a theme manager that handles the theme registry, CRUD operations
 * (store, remove, export, import), inherit-chain resolution, and select UI.
 *
 * The caller provides app-specific callbacks for building theme snapshots,
 * applying theme values to the DOM, and persisting settings.
 *
 * @param {object} opts
 * @param {object}  opts.builtInThemes       - Built-in theme definitions (name → object)
 * @param {object}  opts.defaultThemeData    - DEFAULT_THEME base object (all keys)
 * @param {string[]} [opts.requiredThemeKeys] - Keys that must be present in defaultThemeData
 * @param {string}  opts.userThemesKey       - localStorage key for user-saved themes
 * @param {HTMLSelectElement} [opts.themeSelectEl]  - <select> for theme dropdown
 * @param {object}  [opts.buttons]           - { store, default, remove, export, import }
 * @param {Function} opts.buildThemeSnapshot - () → theme-only settings snapshot
 * @param {Function} opts.applyTheme         - (name) → void — push theme to DOM
 * @param {Function} opts.saveSettings       - () → void — persist full settings
 * @param {Function} opts.showAlertDialog    - (title, msg) → Promise
 * @param {Function} opts.showConfirmDialog  - (title, msg, opts) → Promise<bool>
 * @param {Function} opts.showPromptDialog   - (title, msg, default) → Promise<string|null>
 * @param {Function} opts.downloadBlob       - (content, mime, filename) → void
 * @param {string}  [opts.appName]           - App name for export filenames (default 'peartree')
 * @returns {object} Theme manager API
 */
export function createThemeManager({
  builtInThemes,
  defaultThemeData,
  requiredThemeKeys,
  userThemesKey,
  themeSelectEl,
  buttons = {},
  buildThemeSnapshot,
  applyTheme,
  saveSettings,
  showAlertDialog,
  showConfirmDialog,
  showPromptDialog,
  downloadBlob,
  appName = 'peartree',
}) {
  const registry = new Map(Object.entries(builtInThemes));
  let _defaultTheme = Object.keys(builtInThemes)[0];
  let _themeSaveHandler = null;

  // ── Internal helpers ──

  function _saveUserThemes() {
    const userObj = {};
    for (const [name, theme] of registry) {
      if (!builtInThemes[name]) userObj[name] = theme;
    }
    try { localStorage.setItem(userThemesKey, JSON.stringify(userObj)); } catch {}
  }

  function _loadUserThemes() {
    try {
      const stored = JSON.parse(localStorage.getItem(userThemesKey) || '{}');
      for (const [name, theme] of Object.entries(stored)) {
        registry.set(name, theme);
      }
    } catch { /* ignore */ }
  }

  function _populateSelect() {
    if (!themeSelectEl) return;
    const current = themeSelectEl.value;
    themeSelectEl.innerHTML = '';
    for (const name of registry.keys()) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + (name === _defaultTheme ? ' \u2605' : '');
      themeSelectEl.appendChild(opt);
    }
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Custom';
    customOpt.style.fontStyle = 'italic';
    themeSelectEl.appendChild(customOpt);
    themeSelectEl.value = (themeSelectEl.querySelector(`option[value="${CSS.escape(current)}"]`) ? current : registry.keys().next().value);
  }

  function _syncButtons() {
    if (!buttons.store) return;
    const sel       = themeSelectEl?.value;
    const isCustom  = sel === 'custom';
    const isBuiltIn = !!builtInThemes[sel];
    const isDefault = sel === _defaultTheme;
    if (buttons.store)   buttons.store.disabled   = !isCustom;
    if (buttons.default) buttons.default.disabled = isCustom || isDefault;
    if (buttons.remove)  buttons.remove.disabled  = isCustom || isBuiltIn;
    if (buttons.export)  buttons.export.disabled  = false;
    if (buttons.import)  buttons.import.disabled  = false;
  }

  /**
   * Resolve a theme by name, walking the inherit chain from DEFAULT_THEME.
   * Returns a fully-specified theme object.
   */
  function resolveTheme(name) {
    const chain = [];
    let current = name;
    const seen = new Set();
    while (current && !seen.has(current)) {
      seen.add(current);
      const t = registry.get(current);
      if (!t) break;
      chain.unshift(t);
      const parent = t.inherit;
      if (!parent) break;
      current = parent;
    }
    return Object.assign({}, defaultThemeData, ...chain);
  }

  // ── Public CRUD ──

  async function storeTheme() {
    const name = await showPromptDialog('Save Theme', 'Enter a name for this theme:');
    if (!name) return;
    if (name.toLowerCase() === 'custom') {
      await showAlertDialog('Reserved name', '\u201cCustom\u201d is a reserved name \u2014 please choose a different name.');
      return;
    }
    if (builtInThemes[name]) {
      await showAlertDialog('Built-in theme', `\u201c${name}\u201d is a built-in theme and cannot be overwritten.`);
      return;
    }
    registry.set(name, buildThemeSnapshot());
    _saveUserThemes();
    _populateSelect();
    if (themeSelectEl) themeSelectEl.value = name;
    _syncButtons();
    saveSettings();
  }

  function setDefaultTheme(name) {
    if (name === undefined) name = themeSelectEl?.value;
    if (name === 'custom' || !registry.has(name)) return;
    _defaultTheme = name;
    saveSettings();
    _populateSelect();
    if (themeSelectEl) themeSelectEl.value = name;
    _syncButtons();
  }

  async function removeTheme() {
    const name = themeSelectEl?.value;
    if (name === 'custom' || builtInThemes[name]) return;
    if (!await showConfirmDialog('Remove theme', `Remove the theme \u201c${name}\u201d?`, { okLabel: 'Remove', cancelLabel: 'Cancel' })) return;
    if (_defaultTheme === name) {
      _defaultTheme = Object.keys(builtInThemes)[0];
    }
    registry.delete(name);
    _saveUserThemes();
    _populateSelect();
    const fallback = themeSelectEl?.value;
    if (registry.has(fallback)) applyTheme(fallback);
    _syncButtons();
  }

  async function exportTheme() {
    const sel = themeSelectEl?.value;
    const isCustom = sel === 'custom';
    const defaultName = isCustom ? '' : sel;
    const name = await showPromptDialog('Export Theme', 'Enter a name for the exported theme:', defaultName);
    if (!name) return;
    if (name.toLowerCase() === 'custom') {
      await showAlertDialog('Reserved name', '\u201cCustom\u201d is a reserved name \u2014 please choose a different name.');
      return;
    }
    const themeData = isCustom ? buildThemeSnapshot() : (registry.get(sel) ?? buildThemeSnapshot());
    const json = JSON.stringify({ name, theme: themeData }, null, 2);
    const filename = `${name}.${appName.toLowerCase()}-theme.json`;
    if (_themeSaveHandler) {
      await _themeSaveHandler({ content: json, filename, filterName: `${appName} Theme`, extensions: ['json'] });
    } else {
      downloadBlob(json, 'application/json', filename);
    }
  }

  function importTheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) return;
      let data, themeObj;
      try {
        const text = await file.text();
        data = JSON.parse(text);
        themeObj = (data.theme && typeof data.theme === 'object') ? data.theme : data;
        if (typeof themeObj !== 'object' || (!themeObj.canvasBgColor && !(themeObj.inherit && builtInThemes[themeObj.inherit]))) {
          await showAlertDialog('Invalid file', `This does not appear to be a valid ${appName} theme file.`);
          return;
        }
      } catch {
        await showAlertDialog('Parse error', 'Failed to parse the theme file \u2014 please check it is valid JSON.');
        return;
      }
      const fileNameSuggestion = (typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : '';
      if (themeObj.inherit && !builtInThemes[themeObj.inherit]) {
        if (!await showConfirmDialog('Unknown inherit theme',
            `The file specifies inherit "${themeObj.inherit}" which is not a known theme. The default theme will be used as the base instead. Continue?`,
            { okLabel: 'Continue', cancelLabel: 'Cancel' })) return;
      }
      let name = await showPromptDialog('Import Theme', 'Name for the imported theme:', fileNameSuggestion);
      if (!name) return;
      if (name.toLowerCase() === 'custom') {
        await showAlertDialog('Reserved name', '\u201cCustom\u201d is a reserved name \u2014 please choose a different name.');
        return;
      }
      while (builtInThemes[name]) {
        const next = await showPromptDialog('Built-in theme', `\u201c${name}\u201d is a built-in theme and cannot be overwritten.\nPlease enter a different name:`, '');
        if (!next) return;
        name = next;
        if (name.toLowerCase() === 'custom') {
          await showAlertDialog('Reserved name', '\u201cCustom\u201d is a reserved name \u2014 please choose a different name.');
          return;
        }
      }
      if (registry.has(name)) {
        if (!await showConfirmDialog('Overwrite theme', `A user theme named \u201c${name}\u201d already exists. Overwrite it?`, { okLabel: 'Overwrite', cancelLabel: 'Cancel' })) return;
      }
      registry.set(name, themeObj);
      _saveUserThemes();
      _populateSelect();
      if (themeSelectEl) themeSelectEl.value = name;
      applyTheme(name);
      _syncButtons();
    });
    input.click();
  }

  function markCustom() {
    if (themeSelectEl && themeSelectEl.value !== 'custom') {
      themeSelectEl.value = 'custom';
      saveSettings();
    }
    _syncButtons();
  }

  // ── Initialise ──
  _loadUserThemes();
  // Guard: if the stored default is no longer in the registry, fall back gracefully.
  if (!registry.has(_defaultTheme)) _defaultTheme = Object.keys(builtInThemes)[0];
  // Validate that defaultThemeData is fully specified.
  if (requiredThemeKeys?.length) {
    const _missing = requiredThemeKeys.filter(k => !(k in defaultThemeData));
    if (_missing.length) console.warn(`${appName}: DEFAULT_THEME is missing required keys:`, _missing);
  }
  _populateSelect();
  _syncButtons();

  const mgr = {
    /** The live theme registry (Map<string, object>). */
    registry,
    /** Resolve a theme to a fully-specified object (walking inherit chain). */
    resolveTheme,
    /** Rebuild the theme <select> options. */
    populateSelect: _populateSelect,
    /** Sync enabled/disabled state of theme action buttons. */
    syncButtons: _syncButtons,
    /** Persist user-defined themes to localStorage. */
    saveUserThemes: _saveUserThemes,
    /** Prompt the user and save the current visual state as a named theme. */
    storeTheme,
    /** Set the default startup theme (from the currently selected theme). */
    setDefaultTheme,
    /** Remove a user-saved theme (with confirmation). */
    removeTheme,
    /** Export a theme as a JSON file. */
    exportTheme,
    /** Import a theme from a JSON file. */
    importTheme,
    /** Mark the theme selector as "Custom" (user manually edited a control). */
    markCustom,
    /** Set a platform-specific save handler for theme export (e.g. Tauri native dialog). */
    setThemeSaveHandler(fn) { _themeSaveHandler = fn; },
  };

  /** The user-set default theme name. Assignable (validates against the registry). */
  Object.defineProperty(mgr, 'defaultTheme', {
    get() { return _defaultTheme; },
    set(name) {
      if (registry.has(name)) _defaultTheme = name;
      else _defaultTheme = Object.keys(builtInThemes)[0];
    },
    enumerable: true,
  });

  return mgr;
}


// ── Embed Configuration Resolver ──────────────────────────────────────────

/**
 * Resolve embed configuration from a global config object and URL parameters.
 *
 * For each flag defined in `flagDefs`, resolves values with the priority:
 *   window[configKey].ui.<uiKey>  >  URL param  >  default (true)
 *
 * @param {object} opts
 * @param {string}  opts.configKey        - Window property name (e.g. 'peartreeConfig')
 * @param {string}  opts.settingsKeyDefault - Default storage key when not overridden
 * @param {Array}   opts.flagDefs         - Array of { name, uiKey, param, [extended] }
 * @param {Function} [opts.extras]        - (config, params) → extra props to merge
 * @returns {object} Resolved configuration object
 */
export function resolveEmbedConfig({ configKey, settingsKeyDefault, flagDefs, extras }) {
  const _p  = new URLSearchParams(window.location.search);
  const _wc = window[configKey] || {};
  const _ui = _wc.ui || {};

  const _flag = (uiVal, param) => uiVal !== undefined ? Boolean(uiVal) : _p.get(param) !== '0';
  const _flagEx = (uiVal, param) => {
    if (uiVal === 'fixed') return 'fixed';
    if (uiVal !== undefined) return Boolean(uiVal);
    return _p.get(param) !== '0';
  };

  const _sk = _wc.storageKey !== undefined
    ? _wc.storageKey
    : _p.get('storageKey') ?? (_p.get('nostore') === '1' ? null : settingsKeyDefault);

  const cfg = {
    enableKeyboard: _ui.keyboard !== undefined ? Boolean(_ui.keyboard) : _p.get('keyboard') !== '0',
    storageKey: _sk,
    initSettings: (() => {
      try { const v = _p.get('settings'); return v ? JSON.parse(atob(v)) : {}; } catch { return {}; }
    })(),
  };

  for (const def of flagDefs) {
    const resolver = def.extended ? _flagEx : _flag;
    cfg[def.name] = resolver(_ui[def.uiKey], def.param);
  }

  if (extras) Object.assign(cfg, extras(_wc, _p));

  return cfg;
}


// ── Section Accordion ─────────────────────────────────────────────────────

/**
 * Initialise section-accordion behaviour on `.pt-palette-section` elements
 * inside the given root.  Sections can be toggled and optionally pinned open.
 *
 * @param {Element} root          - Scope element (document or embed wrapper)
 * @param {string}  storageKey    - localStorage key for persisting section state
 * @param {string}  [defaultSectionId] - section data-sec-id to open by default
 * @returns {{ unlock: Function }} Call unlock() when the first data load completes
 */
export function initSectionAccordion(root, { storageKey, defaultSectionId = 'tree' } = {}) {
  let _sectionsUnlocked = false;

  function _loadSt() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; }
  }
  function _saveSt(st) {
    try { localStorage.setItem(storageKey, JSON.stringify(st)); } catch {}
  }
  function _allSec() {
    return Array.from(root.querySelectorAll('.pt-palette-section[data-sec-id]'));
  }

  function _openSec(sec) {
    sec.classList.add('pt-palette-section--open');
    const st = _loadSt();
    st[sec.dataset.secId] = { ...(st[sec.dataset.secId] || {}), open: true };
    _saveSt(st);
  }
  function _closeSec(sec) {
    sec.classList.remove('pt-palette-section--open');
    const st = _loadSt();
    st[sec.dataset.secId] = { ...(st[sec.dataset.secId] || {}), open: false };
    _saveSt(st);
  }

  function _toggleSec(sec) {
    if (!_sectionsUnlocked) return;
    if (sec.classList.contains('pt-palette-section--pinned')) return;
    if (sec.classList.contains('pt-palette-section--open')) {
      _closeSec(sec);
    } else {
      _allSec().forEach(s => {
        if (s !== sec && s.classList.contains('pt-palette-section--open') && !s.classList.contains('pt-palette-section--pinned'))
          _closeSec(s);
      });
      _openSec(sec);
    }
  }

  function _togglePin(sec) {
    if (!_sectionsUnlocked) return;
    const isPinned = sec.classList.contains('pt-palette-section--pinned');
    const pinIcon  = sec.querySelector(':scope > h3 .pt-sec-pin i');
    const st       = _loadSt();
    if (isPinned) {
      sec.classList.remove('pt-palette-section--pinned');
      if (pinIcon) pinIcon.className = 'bi bi-pin';
      _allSec().forEach(s => {
        if (s !== sec && s.classList.contains('pt-palette-section--open') && !s.classList.contains('pt-palette-section--pinned'))
          _closeSec(s);
      });
      sec.classList.add('pt-palette-section--open');
      st[sec.dataset.secId] = { open: true, pinned: false };
    } else {
      sec.classList.add('pt-palette-section--open', 'pt-palette-section--pinned');
      if (pinIcon) pinIcon.className = 'bi bi-pin-fill';
      st[sec.dataset.secId] = { open: true, pinned: true };
    }
    _saveSt(st);
  }

  const savedState = _loadSt();
  const palBody = root.querySelector('#palette-panel-body');

  root.querySelectorAll('.pt-palette-section').forEach(sec => {
    const h3 = sec.querySelector(':scope > h3');
    if (!h3) return;

    const secId = h3.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '');
    sec.dataset.secId = secId;

    h3.insertAdjacentHTML('beforeend',
      '<span class="pt-sec-actions">' +
        '<button class="pt-sec-pin" title="Pin open"><i class="bi bi-pin"></i></button>' +
        '<i class="bi bi-chevron-right pt-sec-chevron"></i>' +
      '</span>');

    const inner = document.createElement('div');
    inner.className = 'pt-section-body-inner';
    while (h3.nextSibling) inner.appendChild(h3.nextSibling);
    const body = document.createElement('div');
    body.className = 'pt-section-body';
    body.appendChild(inner);
    sec.appendChild(body);

    h3.addEventListener('click', e => { if (!e.target.closest('.pt-sec-pin')) _toggleSec(sec); });
    h3.tabIndex = 0;
    h3.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.pt-sec-pin')) {
        e.preventDefault(); _toggleSec(sec);
      }
    });

    h3.querySelector('.pt-sec-pin').addEventListener('click', e => {
      e.stopPropagation(); _togglePin(sec);
    });
  });

  if (palBody) palBody.classList.add('pt-sections-locked');

  function unlock() {
    if (_sectionsUnlocked) return;
    _sectionsUnlocked = true;
    if (palBody) palBody.classList.remove('pt-sections-locked');

    const noTrans = [];
    let anyPinned = false;
    _allSec().forEach(sec => {
      const saved = savedState[sec.dataset.secId] || {};
      if (saved.pinned) {
        anyPinned = true;
        const body = sec.querySelector(':scope > .pt-section-body');
        if (body) { body.style.transition = 'none'; noTrans.push(body); }
        sec.classList.add('pt-palette-section--open', 'pt-palette-section--pinned');
        const pi = sec.querySelector(':scope > h3 .pt-sec-pin i');
        if (pi) pi.className = 'bi bi-pin-fill';
      }
    });

    if (!anyPinned) {
      const defSec = root.querySelector(`.pt-palette-section[data-sec-id="${defaultSectionId}"]`);
      if (defSec) {
        const body = defSec.querySelector(':scope > .pt-section-body');
        if (body) { body.style.transition = 'none'; noTrans.push(body); }
        defSec.classList.add('pt-palette-section--open');
      }
    }

    if (noTrans.length) {
      requestAnimationFrame(() => requestAnimationFrame(() => noTrans.forEach(b => { b.style.transition = ''; })));
    }
  }

  return { unlock };
}


// ── Dynamic Asset Loaders ─────────────────────────────────────────────────

/**
 * Idempotent stylesheet injection.  Skips if a matching href is already loaded.
 */
export function ensureStylesheet(href) {
  const a = document.createElement('a');
  a.href = href;
  const abs = a.href;
  const existing = document.querySelectorAll('link[rel="stylesheet"]');
  for (let i = 0; i < existing.length; i++) {
    if (existing[i].href === abs) return;
  }
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = abs;
  document.head.appendChild(link);
}

/**
 * Dynamically load a script, returning a Promise that resolves on load.
 * Skips if a <script> with the same src already exists.
 */
export function loadScript(src, isModule) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement('script');
    if (isModule) el.type = 'module';
    el.src = src;
    el.onload  = resolve;
    el.onerror = () => reject(new Error('Failed to load script: ' + src));
    document.head.appendChild(el);
  });
}

/**
 * Auto-detect the asset base directory from import.meta.url.
 * Convention: the calling file lives at <appRoot>/js/<file>.js,
 * so the app root is one directory up from the directory containing the file.
 *
 * @param {string} metaUrl - import.meta.url of the calling module
 * @returns {{ appBase: string, coreBase: string }}
 */
export function resolveAssetBases(metaUrl) {
  let appBase = '';
  try {
    const u = new URL(metaUrl);
    const dir = u.href.substring(0, u.href.lastIndexOf('/') + 1); // …/js/
    appBase = dir + '../';
  } catch (_) {}
  const coreBase = appBase ? appBase + '../pearcore/' : '../pearcore/';
  return { appBase, coreBase };
}


// ── Settings Persistence ──────────────────────────────────────────────────

/**
 * Load settings from localStorage.
 * @param {string|null} storageKey - null disables persistence
 * @returns {object}
 */
export function loadSettings(storageKey) {
  if (storageKey === null) return {};
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
  catch { return {}; }
}

/**
 * Save settings to localStorage.
 * @param {string|null} storageKey - null disables persistence
 * @param {object} snapshot - settings object to save
 */
export function saveSettings(storageKey, snapshot) {
  if (storageKey === null) return;
  try { localStorage.setItem(storageKey, JSON.stringify(snapshot)); } catch {}
}
