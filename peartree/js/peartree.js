import { parseNexus, parseNewick, graphToNewick, parseDelimited } from '@artic-network/pearcore/tree-io.js';
import { computeLayoutFromGraph, graphVisibleTipCount, graphSubtreeHasHidden } from './tree-utils.js';
import { fromNestedRoot, rerootOnGraph, reorderGraph, rotateNodeGraph, midpointRootGraph, temporalRootGraph, optimiseRootEdge, buildAnnotationSchema } from '@artic-network/pearcore/tree-graph.js';
import { injectBuiltinStats, isNumericType, TreeCalibration, computeTemporalResiduals } from './phylograph.js';
import { htmlEsc as _esc, downloadBlob as _downloadBlob, wireDropZone as _wireDropZone } from '@artic-network/pearcore/utils.js';
import { TreeRenderer, CAL_DATE_KEY, CAL_DATE_HPD_KEY, CAL_DATE_HPD_ONLY_KEY } from './tree-renderer.js';
import { LegendRenderer } from './legend-renderer.js';
import { AxisRenderer  } from './axis-renderer.js';
import { THEMES, DEFAULT_THEME, SETTINGS_KEY, USER_THEMES_KEY } from './themes.js';
import { TYPEFACES, buildFont } from '@artic-network/pearcore/typefaces.js';
import { CATEGORICAL_PALETTES, SEQUENTIAL_PALETTES,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         getCategoricalPalette, getSequentialPalette,
         setUserCategoricalPalettes, setUserSequentialPalettes,
         allCategoricalPalettes, allSequentialPalettes } from '@artic-network/pearcore/palettes.js';
import { createAnnotImporter } from '@artic-network/pearcore/annotation-io.js';
import { createAnnotCurator  } from '@artic-network/pearcore/annotation-manager.js';
import { createFilterControl } from './filter-control.js';
import { createFilterManager } from './filter-manager.js';
import { createPaletteManager } from '@artic-network/pearcore/palette-manager.js';
import { createDataTableRenderer } from './datatable-renderer.js';
import { createRTTChart          } from './rtt-chart.js';
import { createCommands } from '@artic-network/pearcore/commands.js';
import { COMMAND_DEFS } from './peartree-commands.js';
import { createExportController } from './export-controller.js';
import { EXAMPLE_TREE_PATH, EXAMPLE_DATASETS, PEARTREE_BASE_URL, DEFAULT_SETTINGS, REQUIRED_THEME_KEYS, NON_PERSISTENT_SETTINGS, NODE_TOOLTIP_FIELDS, APP_SETTINGS_KEY, HELP_MANUAL_URL, HELP_MANUAL_ANCHORS } from './config.js';
import { DEFAULT_UI_APP, DEFAULT_UI_EMBED, DEFAULT_UI_EMBEDFRAME } from './config-ui.js';
import { createPeartreeOptionsPanelProfile } from './options-panel-profile.js';
import { createToolbarColourPicker, upgradeAllPaletteColourPickers } from '@artic-network/pearcore/colorpicker.js';
import { createThemeManager, resolveEmbedConfig, initSectionAccordion,
         ensureStylesheet, loadScript, resolveAssetBases,
         createSidePanelStackManager, createUIThemeFamilyManager, UI_THEME_FAMILIES,
         createDeclarativeOptionsController } from '@artic-network/pearcore/pearcore-app.js';

/**
 * Fetch a file by relative path, falling back to the absolute GitHub Pages URL
 * if the relative fetch fails or returns a non-OK status.
 * @param {string} relativePath  e.g. 'data/ebov.tree' or 'help.md'
 * @returns {Promise<string>} The text content of the file.
 */
async function fetchWithFallback(relativePath) {
  try {
    const r = await fetch(relativePath);
    if (r.ok) return r.text();
  } catch (_) { /* fall through to absolute URL */ }
  const r2 = await fetch(PEARTREE_BASE_URL + relativePath);
  if (!r2.ok) throw new Error('HTTP ' + r2.status + ' – could not fetch ' + relativePath);
  return r2.text();
}

/** Fetch the example tree via fetchWithFallback. */
async function fetchExampleTree() {
  return fetchWithFallback(EXAMPLE_TREE_PATH);
}

// Single source of truth for URL<->ui flag mapping used by app(), embed(), and
// embedFrame(). Keep this aligned with the UI options documented for embeds.
const PT_UI_FLAG_DEFS = [
  { name: 'showPalette',         uiKey: 'palette',         param: 'palette' },
  { name: 'showToolbar',         uiKey: 'toolbar',         param: 'toolbar' },
  { name: 'showRTT',             uiKey: 'rtt',             param: 'rtt',      extended: true },
  { name: 'showRTTHeader',       uiKey: 'rttHeader',       param: 'rttheader' },
  { name: 'showDataTable',       uiKey: 'dataTable',       param: 'dt',       extended: true },
  { name: 'showDataTableHeader', uiKey: 'dataTableHeader', param: 'dtheader' },
  { name: 'showImport',          uiKey: 'import',          uiKeys: ['import', 'openTree'], param: 'import' },
  { name: 'showExport',          uiKey: 'export',          param: 'export' },
  { name: 'showStatusBar',       uiKey: 'statusBar',       param: 'statusbar' },
  { name: 'showStatusStats',     uiKey: 'statusStats',     param: 'sbstats' },
  { name: 'showStatusSelect',    uiKey: 'statusSelect',    param: 'sbselect' },
  { name: 'showStatusMessage',   uiKey: 'statusMessage',   param: 'sbmessage' },
  { name: 'showStatusShare',     uiKey: 'statusShare',     param: 'sbshare' },
  { name: 'showHelp',            uiKey: 'help',            param: 'help' },
  { name: 'showAbout',           uiKey: 'about',           param: 'about' },
  { name: 'showThemeToggle',     uiKey: 'themeToggle',     param: 'themetoggle' },
  { name: 'showBrand',           uiKey: 'brand',           param: 'brand' },
  { name: 'showToolbarFileOps',  uiKey: 'tbFileOps',       param: 'tbfileops' },
  { name: 'showToolbarAnn',      uiKey: 'tbAnnotations',   param: 'tbann' },
  { name: 'showToolbarNode',     uiKey: 'tbNodeInfo',      param: 'tbnode' },
  { name: 'showToolbarNav',      uiKey: 'tbNavigation',    param: 'tbnav' },
  { name: 'showToolbarZoom',     uiKey: 'tbZoom',          param: 'tbzoom' },
  { name: 'showToolbarOrder',    uiKey: 'tbOrder',         param: 'tborder' },
  { name: 'showToolbarRotate',   uiKey: 'tbRotate',        param: 'tbrotate' },
  { name: 'showToolbarReroot',   uiKey: 'tbReroot',        param: 'tbreroot' },
  { name: 'showToolbarHide',     uiKey: 'tbHideShow',      param: 'tbhide' },
  { name: 'showToolbarColour',   uiKey: 'tbColour',        param: 'tbcolour' },
  { name: 'showToolbarFilter',   uiKey: 'tbFilter',        param: 'tbfilter' },
  { name: 'showToolbarPanels',   uiKey: 'tbPanels',        param: 'tbpanels' },
  { name: 'enableKeyboard',      uiKey: 'keyboard',        param: 'keyboard' },
  { name: 'showScrollBar',       uiKey: 'scrollBar',       param: 'scrollbar' },
];

function _coerceUiFlag(val, extended = false) {
  if (extended && val === 'fixed') return 'fixed';
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (extended && s === 'fixed') return 'fixed';
    if (s === '0' || s === 'false') return false;
    if (s === '1' || s === 'true') return true;
  }
  return Boolean(val);
}

function _readUiValue(uiObj, def) {
  if (!uiObj || typeof uiObj !== 'object') return undefined;
  if (Array.isArray(def.uiKeys) && def.uiKeys.length) {
    for (const key of def.uiKeys) {
      if (uiObj[key] !== undefined) return uiObj[key];
    }
    return undefined;
  }
  return uiObj[def.uiKey];
}

function _setUiFlagsAsUrlParams(params, uiObj) {
  for (const def of PT_UI_FLAG_DEFS) {
    const raw = _readUiValue(uiObj, def);
    if (raw === undefined) continue;
    const v = _coerceUiFlag(raw, !!def.extended);
    if (v === false) params.set(def.param, '0');
    else if (def.extended && v === 'fixed') params.set(def.param, 'fixed');
  }
}

function _isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function _decodeSettingsParam(params) {
  try {
    const v = params.get('settings');
    if (!v) return {};
    const parsed = JSON.parse(atob(v));
    return _isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function _encodeSettingsParam(params, settings) {
  if (!_isPlainObject(settings) || Object.keys(settings).length === 0) return;
  params.set('settings', btoa(JSON.stringify(settings)));
}

function _resolveInitSettings({ fetchedSettings, params, windowConfig }) {
  const fromFetched = _isPlainObject(fetchedSettings) ? fetchedSettings : {};
  const fromUrl = _decodeSettingsParam(params);
  const fromWindow = _isPlainObject(windowConfig?.settings)
    ? windowConfig.settings
    : (_isPlainObject(windowConfig?.initSettings) ? windowConfig.initSettings : {});
  return Object.assign({}, fromFetched, fromUrl, fromWindow);
}

async function _initCore(root = document) {
  const $ = id => root.querySelector('#' + id);
  // Per-instance command registry — each embed gets its own scoped registry so
  // commands.exec and button enabled-state never bleed across instances.
  const commands = createCommands(root, COMMAND_DEFS);
  // ── Embed configuration ───────────────────────────────────────────────────
  // Supports window.peartreeConfig (same-page / iframe embedding) and URL
  // search params as a lower-priority alternative.  window.peartreeConfig
  // properties always win over URL params.
  //
  // window.peartreeConfig shape (all optional):
  //   ui: {
  //     palette:   boolean  — show/hide the Settings sidebar toggle button
  //     rtt:       boolean  — show/hide the RTT panel button + panel
  //     dataTable: boolean  — show/hide the Data Table panel button + panel
  //     import:    boolean  — show/hide Open Tree + Import Annotations buttons
  //     export:    boolean  — show/hide Export Tree + Export Graphic buttons
  //     statusBar: boolean  — show/hide the status bar
  //   }
  //   settings: { …settingsOverrides }  — merged on top of stored/default settings
  //   manualUrl: string                 — base URL for the app manual link
  //   helpManualAnchors: { … }          — optional section-title to anchor map
  //   storageKey: string | null         — null = no localStorage persistence;
  //                                       string = custom key (default: SETTINGS_KEY)
  //
  // Equivalent URL parameters (value of '0' hides; anything else shows):
  //   palette=0, toolbar=0, rtt=0, dt=0, import=0, export=0, statusbar=0
  //   sbstats=0, sbselect=0, sbmessage=0, sbshare=0,
  //   tbfileops=0, tbann=0, tbnode=0, tbnav=0, tbzoom=0, tborder=0,
  //   tbrotate=0, tbreroot=0, tbhide=0, tbcolour=0, tbfilter=0, tbpanels=0
  //   configUrl=https://…json   — fetch config JSON with optional {ui, settings}
  //                               (applied before URL switches and settings=)
  //   nostore=1             — same as storageKey: null
  //   storageKey=my-key     — custom storage key
  const _p = new URLSearchParams(window.location.search);

  function _normalizeConfigJsonUrl(rawUrl) {
    const u = new URL(rawUrl, window.location.href);

    // Support GitHub blob URLs by converting to raw content URLs.
    // Example:
    //   https://github.com/owner/repo/blob/main/path/file.json
    // ->https://raw.githubusercontent.com/owner/repo/main/path/file.json
    if (u.hostname === 'github.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 5 && parts[2] === 'blob') {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const filePath = parts.slice(4).join('/');
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      }
    }

    return u.href;
  }

  async function _fetchJsonFromParam(paramName) {
    const raw = _p.get(paramName);
    if (!raw) return null;
    let resolvedUrl = raw;
    try {
      resolvedUrl = _normalizeConfigJsonUrl(raw);
      const resp = await fetch(resolvedUrl);
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' – ' + resolvedUrl);
      const obj = await resp.json();
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Expected JSON object');
      return obj;
    } catch (err) {
      console.warn('peartree: ignoring invalid ' + paramName + ' (' + resolvedUrl + ') –', err.message);
      return null;
    }
  }

  const _fetchedConfig = await _fetchJsonFromParam('configUrl');
  const _fetchedUI = (_fetchedConfig && typeof _fetchedConfig.ui === 'object' && !Array.isArray(_fetchedConfig.ui))
    ? _fetchedConfig.ui
    : null;
  const _fetchedSettings = (_fetchedConfig && typeof _fetchedConfig.settings === 'object' && !Array.isArray(_fetchedConfig.settings))
    ? _fetchedConfig.settings
    : null;

  const _cfg = resolveEmbedConfig({
    configKey: 'peartreeConfig',
    settingsKeyDefault: SETTINGS_KEY,
    flagDefs: PT_UI_FLAG_DEFS,
    extras: (wc, _p) => {
      const _ui = wc.ui || {};
      return {
        dataTableColumns: Array.isArray(wc.dataTableColumns) ? wc.dataTableColumns : null,
        initSettings: _resolveInitSettings({ fetchedSettings: _fetchedSettings, params: _p, windowConfig: wc }),
        // Non-flag container CSS properties sourced from the ui: config block.
        borderWidth:     _ui.borderWidth     ?? null,
        borderColor:     _ui.borderColor     ?? null,
        borderRadius:    _ui.borderRadius    ?? null,
        backgroundColor: _ui.backgroundColor ?? null,
        paddingTop:     _ui.paddingTop     ?? null,
        paddingRight:   _ui.paddingRight   ?? null,
        paddingBottom:  _ui.paddingBottom  ?? null,
        paddingLeft:    _ui.paddingLeft    ?? null,
        // Canvas area padding — renderer dynamically reserves margin for shapes/labels.
        treePaddingTop:    _ui.treePaddingTop    ?? DEFAULT_UI_APP.treePaddingTop,
        treePaddingRight:  _ui.treePaddingRight  ?? DEFAULT_UI_APP.treePaddingRight,
        treePaddingBottom: _ui.treePaddingBottom ?? DEFAULT_UI_APP.treePaddingBottom,
        treePaddingLeft:   _ui.treePaddingLeft   ?? DEFAULT_UI_APP.treePaddingLeft,
        // Legend area padding — CSS padding on #legend-right-wrapper.
        legendPaddingTop:    _ui.legendPaddingTop    ?? DEFAULT_UI_APP.legendPaddingTop,
        legendPaddingRight:  _ui.legendPaddingRight  ?? DEFAULT_UI_APP.legendPaddingRight,
        legendPaddingBottom: _ui.legendPaddingBottom ?? DEFAULT_UI_APP.legendPaddingBottom,
        legendPaddingLeft:   _ui.legendPaddingLeft   ?? DEFAULT_UI_APP.legendPaddingLeft,
      };
    },
  });

  // Apply fetched UI defaults only when not explicitly set by window config
  // and when the corresponding URL switch is absent.
  if (_fetchedUI && typeof _fetchedUI === 'object') {
    const _wcUi = (window.peartreeConfig || {}).ui || {};
    for (const def of PT_UI_FLAG_DEFS) {
      if (_readUiValue(_wcUi, def) !== undefined) continue;
      if (_p.has(def.param)) continue;
      const _raw = _readUiValue(_fetchedUI, def);
      if (_raw === undefined) continue;
      _cfg[def.name] = _coerceUiFlag(_raw, !!def.extended);
    }
    // Border + spacing CSS properties: fetchedUI provides defaults when not set by window.peartreeConfig.ui
    if (_wcUi.borderWidth    == null && _fetchedUI.borderWidth    != null) _cfg.borderWidth    = _fetchedUI.borderWidth;
    if (_wcUi.borderColor    == null && _fetchedUI.borderColor    != null) _cfg.borderColor    = _fetchedUI.borderColor;
    if (_wcUi.borderRadius   == null && _fetchedUI.borderRadius   != null) _cfg.borderRadius   = _fetchedUI.borderRadius;
    if (_wcUi.backgroundColor == null && _fetchedUI.backgroundColor != null) _cfg.backgroundColor = _fetchedUI.backgroundColor;
    if (_wcUi.paddingTop    == null && _fetchedUI.paddingTop    != null) _cfg.paddingTop    = _fetchedUI.paddingTop;
    if (_wcUi.paddingRight  == null && _fetchedUI.paddingRight  != null) _cfg.paddingRight  = _fetchedUI.paddingRight;
    if (_wcUi.paddingBottom == null && _fetchedUI.paddingBottom != null) _cfg.paddingBottom = _fetchedUI.paddingBottom;
    if (_wcUi.paddingLeft   == null && _fetchedUI.paddingLeft   != null) _cfg.paddingLeft   = _fetchedUI.paddingLeft;
    if (_wcUi.treePaddingTop    == null && _fetchedUI.treePaddingTop    != null) _cfg.treePaddingTop    = _fetchedUI.treePaddingTop;
    if (_wcUi.treePaddingRight  == null && _fetchedUI.treePaddingRight  != null) _cfg.treePaddingRight  = _fetchedUI.treePaddingRight;
    if (_wcUi.treePaddingBottom == null && _fetchedUI.treePaddingBottom != null) _cfg.treePaddingBottom = _fetchedUI.treePaddingBottom;
    if (_wcUi.treePaddingLeft   == null && _fetchedUI.treePaddingLeft   != null) _cfg.treePaddingLeft   = _fetchedUI.treePaddingLeft;
    if (_wcUi.legendPaddingTop    == null && _fetchedUI.legendPaddingTop    != null) _cfg.legendPaddingTop    = _fetchedUI.legendPaddingTop;
    if (_wcUi.legendPaddingRight  == null && _fetchedUI.legendPaddingRight  != null) _cfg.legendPaddingRight  = _fetchedUI.legendPaddingRight;
    if (_wcUi.legendPaddingBottom == null && _fetchedUI.legendPaddingBottom != null) _cfg.legendPaddingBottom = _fetchedUI.legendPaddingBottom;
    if (_wcUi.legendPaddingLeft   == null && _fetchedUI.legendPaddingLeft   != null) _cfg.legendPaddingLeft   = _fetchedUI.legendPaddingLeft;
  }
  // Apply canvas border CSS from the UI config before any tree loads.
  _syncCanvasBorder(_cfg);
  // Apply UI restrictions immediately so hidden elements never flash visible.
  if (!_cfg.showPalette)   $('btn-palette')        ?.classList.add('d-none');
  if (!_cfg.showToolbar)   root.querySelector('.pt-toolbar')          ?.classList.add('d-none');
  if (!_cfg.showRTT)     { $('btn-rtt')            ?.classList.add('d-none');
                           $('rtt-panel')          ?.classList.add('d-none'); }
  if (!_cfg.showRTTHeader)      $('rtt-header')?.classList.add('d-none');
  if (!_cfg.showDataTableHeader) {
    $('dt-num-header')?.classList.add('d-none');
    root.querySelector('#dt-header')?.classList.add('d-none');
  }
  if (_cfg.showRTT === 'fixed') {
    $('btn-rtt')?.classList.add('d-none');
    $('rtt-btn-pin')?.classList.add('d-none');
    $('rtt-btn-close')?.classList.add('d-none');
    $('rtt-resize-handle')?.classList.add('d-none');
    const _rttW = (window.peartreeConfig || {}).rttWidth ?? 35;
    const _rttPx = typeof _rttW === 'string' && _rttW.endsWith('%') ? _rttW
                 : `${_rttW}%`;
    root.querySelector('#canvas-container')?.style.setProperty('--rtt-panel-w', _rttPx);
  }
  if (!_cfg.showDataTable){ $('btn-data-table')    ?.classList.add('d-none');
                            $('data-table-panel')  ?.classList.add('d-none'); }
  if (_cfg.showDataTable === 'fixed') {
    $('btn-data-table')?.classList.add('d-none');
    $('dt-btn-pin')?.classList.add('d-none');
    $('dt-btn-close')?.classList.add('d-none');
    const _dtW = (window.peartreeConfig || {}).dataTableWidth;
    if (_dtW != null) {
      const _dtPx = typeof _dtW === 'string' && _dtW.endsWith('%') ? _dtW
                  : `${_dtW}%`;
      root.querySelector('#canvas-container')?.style.setProperty('--dt-panel-w', _dtPx);
    }
  }
  if (!_cfg.showImport)  { $('btn-open-tree')      ?.classList.add('d-none');
                           $('btn-import-annot')   ?.classList.add('d-none');
                           $('empty-state-hint')        ?.classList.add('d-none');
                           $('empty-state-open-btn')    ?.classList.add('d-none');
                           $('empty-state-example-btn') ?.classList.add('d-none'); }
  if (!_cfg.showExport)  { $('btn-export-tree')    ?.classList.add('d-none');
                           $('btn-export-graphic') ?.classList.add('d-none'); }
  if (!_cfg.showStatusBar) $('status-bar')          ?.classList.add('d-none');
  if (!_cfg.showStatusStats) $('status-stats')      ?.classList.add('d-none');
  if (!_cfg.showStatusSelect) $('status-select')    ?.classList.add('d-none');
  if (!_cfg.showStatusMessage) $('status-message')  ?.classList.add('d-none');
  if (!_cfg.showStatusShare) $('btn-share-url')     ?.classList.add('d-none');
  if (!_cfg.showHelp)      $('btn-help')            ?.classList.add('d-none');
  if (!_cfg.showAbout)     $('btn-about')           ?.classList.add('d-none');
  if (!_cfg.showThemeToggle) $('btn-theme')         ?.classList.add('d-none');
  if (!_cfg.showBrand)     $('status-brand')        ?.classList.add('d-none');

  const _hideTb = (selector) => root.querySelectorAll(selector).forEach(el => el.classList.add('d-none'));
  if (!_cfg.showToolbarFileOps) _hideTb('#btn-open-tree, #btn-import-annot, #btn-export-tree, #btn-export-graphic');
  if (!_cfg.showToolbarAnn)     _hideTb('#btn-curate-annot, #btn-manage-filters, #btn-manage-palettes');
  if (!_cfg.showToolbarNode)    _hideTb('#btn-node-info');
  if (!_cfg.showToolbarNav)     _hideTb('.pt-toolbar .btn-group[aria-label="Navigate history"], .pt-toolbar .btn-group[aria-label="Navigate subtree"]');
  if (!_cfg.showToolbarZoom)    _hideTb('.pt-toolbar .btn-group[aria-label="Zoom"], .pt-toolbar .btn-group[aria-label="Fit view"]');
  if (!_cfg.showToolbarOrder)   _hideTb('.pt-toolbar .btn-group[aria-label="Branch order"]');
  if (!_cfg.showToolbarRotate)  _hideTb('.pt-toolbar .btn-group[aria-label="Rotate node"]');
  if (!_cfg.showToolbarReroot)  _hideTb('#btn-invert-selection, #reroot-controls');
  if (!_cfg.showToolbarHide)    _hideTb('.pt-toolbar .btn-group[aria-label="Hide/show subtree"], .pt-toolbar .btn-group[aria-label="Collapse/expand clade"]');
  if (!_cfg.showToolbarColour)  _hideTb('#colour-pick-wrap');
  if (!_cfg.showToolbarFilter)  _hideTb('#tip-filter-mount');
  if (!_cfg.showToolbarPanels)  _hideTb('#btn-data-table, #btn-rtt');

  // Hide separator bars when adjacent button groups are not displayed
  root.querySelectorAll('.pt-toolbar-sep').forEach(sep => {
    let prevVisible = false;
    let nextVisible = false;

    // Check if previous visible sibling is displayed
    let prev = sep.previousElementSibling;
    while (prev) {
      if (!prev.classList.contains('d-none')) {
        prevVisible = true;
        break;
      }
      prev = prev.previousElementSibling;
    }

    // Check if next visible sibling is displayed
    let next = sep.nextElementSibling;
    while (next) {
      if (!next.classList.contains('d-none')) {
        nextVisible = true;
        break;
      }
      next = next.nextElementSibling;
    }

    // Hide separator if either adjacent visible content is missing
    if (!prevVisible || !nextVisible) {
      sep.classList.add('d-none');
    }
  });

  const canvas            = $('tree-canvas');
  const loadingEl         = $('loading');
  const canvasBgColorEl   = $('canvas-bg-color');
  const branchColorEl     = $('branch-color');
  const branchWidthSlider = $('branch-width-slider');
  const elbowRadiusSlider = $('elbow-radius-slider');
  const fontSlider        = $('font-size-slider');
  const tipSlider         = $('tip-size-slider');
  const tipHaloSlider      = $('tip-halo-slider');
  const nodeSlider        = $('node-size-slider');
  const nodeHaloSlider     = $('node-halo-slider');
  const tipShapeColorEl   = $('tip-shape-color');
  const tipShapeBgEl      = $('tip-shape-bg-color');
  const labelColorEl      = $('label-color');
  const selectedLabelStyleEl = $('selected-label-style');
  const selectedTipStrokeEl   = $('selected-tip-stroke');
  const selectedNodeStrokeEl       = $('selected-node-stroke');
  const tipHoverFillEl       = $('tip-hover-fill');
  const nodeHoverFillEl  = $('node-hover-fill');
  const selectedTipFillEl                = $('selected-tip-fill');
  const selectedTipGrowthSlider          = $('selected-tip-growth');
  const selectedTipMinSizeSlider         = $('selected-tip-min-size');
  const selectedTipFillOpacitySlider     = $('selected-tip-fill-opacity');
  const selectedTipStrokeWidthSlider     = $('selected-tip-stroke-width');
  const selectedTipStrokeOpacitySlider   = $('selected-tip-stroke-opacity');
  const selectedNodeFillEl               = $('selected-node-fill');
  const selectedNodeGrowthSlider         = $('selected-node-growth');
  const selectedNodeMinSizeSlider        = $('selected-node-min-size');
  const selectedNodeFillOpacitySlider    = $('selected-node-fill-opacity');
  const selectedNodeStrokeWidthSlider    = $('selected-node-stroke-width');
  const selectedNodeStrokeOpacitySlider  = $('selected-node-stroke-opacity');
  const tipHoverStrokeEl                 = $('tip-hover-stroke');
  const tipHoverGrowthSlider             = $('tip-hover-growth');
  const tipHoverMinSizeSlider            = $('tip-hover-min-size');
  const tipHoverFillOpacitySlider        = $('tip-hover-fill-opacity');
  const tipHoverStrokeWidthSlider        = $('tip-hover-stroke-width');
  const tipHoverStrokeOpacitySlider      = $('tip-hover-stroke-opacity');
  const nodeHoverStrokeEl                = $('node-hover-stroke');
  const nodeHoverGrowthSlider            = $('node-hover-growth');
  const nodeHoverMinSizeSlider           = $('node-hover-min-size');
  const nodeHoverFillOpacitySlider       = $('node-hover-fill-opacity');
  const nodeHoverStrokeWidthSlider       = $('node-hover-stroke-width');
  const nodeHoverStrokeOpacitySlider     = $('node-hover-stroke-opacity');
  let selectedTipGrowthFactorValue = parseFloat(DEFAULT_THEME.selectedTipGrowthFactor ?? '1');
  let selectedNodeGrowthFactorValue = parseFloat(DEFAULT_THEME.selectedNodeGrowthFactor ?? '1');
  let tipHoverGrowthFactorValue = parseFloat(DEFAULT_THEME.tipHoverGrowthFactor ?? '1');
  let nodeHoverGrowthFactorValue = parseFloat(DEFAULT_THEME.nodeHoverGrowthFactor ?? '1');
  const nodeShapeColorEl  = $('node-shape-color');
  const nodeShapeBgEl     = $('node-shape-bg-color');
  const nodeBarsShowEl      = $('node-bars-show');
  const nodeBarsColorEl     = $('node-bars-color');
  const nodeBarsWidthSlider = $('node-bars-width-slider');
  const nodeBarsFillOpacitySlider   = $('node-bars-fill-opacity');
  const nodeBarsStrokeOpacitySlider = $('node-bars-stroke-opacity');
  const nodeBarsExtraShowEls = [2, 3, 4].map(n => $(`node-bars-show-${n}`));
  const nodeBarsClipToEl = $('node-bars-clip-to');
  const nodeBarsExtraClipToEls = [2, 3, 4].map(n => $(`node-bars-${n}-clip-to`));
  const nodeBarsExtraWidthSliders = [2, 3, 4].map(n => $(`node-bars-${n}-width-slider`));
  const nodeBarsExtraColorEls = [2, 3, 4].map(n => $(`node-bars-${n}-color`));
  const nodeBarsExtraFillOpacitySliders = [2, 3, 4].map(n => $(`node-bars-${n}-fill-opacity`));
  const nodeBarsExtraStrokeOpacitySliders = [2, 3, 4].map(n => $(`node-bars-${n}-stroke-opacity`));
  const nodeBarsLineEl      = $('node-bars-median');
  const nodeBarsRangeEl     = $('node-bars-range');
  const nodeBarsControlsEl  = $('node-bars-controls');
  const nodeBarsUnavailEl   = $('node-bars-unavail');
  const collapsedOpacitySlider = $('collapsed-opacity-slider');
  const collapsedStrokeWidthSlider = $('collapsed-stroke-width-slider');
  const collapsedStrokeOpacitySlider = $('collapsed-stroke-opacity-slider');
  const collapsedHeightNSlider = $('collapsed-height-n-slider');
  const collapsedCladeFontSizeSlider = $('collapsed-clade-font-size-slider');
  const collapsedCladeColourByEl     = $('collapsed-clade-colour-by');
  const collapsedCladeConfigureRow   = $('collapsed-clade-configure-row');
  const tipShapeDetailEl    = $('tip-shape-detail');
  const nodeShapeDetailEl   = $('node-shape-detail');
  const nodeLabelDetailEl   = $('node-label-detail');
  const nodeBarsDetailEl    = $('node-bars-detail');
  const nodeBarsExtraSectionEls = [2, 3, 4].map(n => $(`node-bars-${n}-section`));
  const nodeBarsExtraDetailEls = [2, 3, 4].map(n => $(`node-bars-${n}-detail`));
  const legendDetailEl      = $('legend-detail');
  const axisDetailEl        = $('axis-detail');
  const rootStemPctSlider    = $('root-stem-pct-slider');
  const fontFamilyEl        = $('font-family-select');
  const fontTypefaceStyleEl = $('font-typeface-style-select');
  const tipLabelTypefaceEl  = $('typeface-select');
  const typefaceStyleEl     = $('typeface-style-select');
  const nodeLabelTypefaceEl      = $('node-label-typeface-select');
  const nodeLabelTypefaceStyleEl = $('node-label-typeface-style-select');
  const collapsedCladeTypefaceEl      = $('collapsed-clade-typeface-select');
  const collapsedCladeTypefaceStyleEl = $('collapsed-clade-typeface-style-select');
  const legendTypefaceStyleEl  = $('legend-typeface-style-select');
  const axisTypefaceStyleEl    = $('axis-typeface-style-select');
  const rttAxisTypefaceStyleEl = $('rtt-axis-typeface-style-select');
  const tipColourBy       = $('tip-colour-by');
  const nodeColourBy      = $('node-colour-by');
  const branchColourBy    = $('branch-colour-by');
  const labelColourBy     = $('label-colour-by');
  const tipLabelShow      = $('tip-label-show');
  const tipLabelControlsEl = $('tip-label-controls');
  const tipLabelAlignEl   = $('tip-label-align');
  const tipLabel2ShowEl    = $('tip-label2-show');
  const tipLabel3ShowEl    = $('tip-label3-show');
  const tipLabel4ShowEl    = $('tip-label4-show');
  const tipLabel2LayoutEl  = $('tip-label2-layout');
  const tipLabel3LayoutEl  = $('tip-label3-layout');
  const tipLabel4LayoutEl  = $('tip-label4-layout');
  const tipLabel2SectionEl = $('tip-label2-section');
  const tipLabel3SectionEl = $('tip-label3-section');
  const tipLabel4SectionEl = $('tip-label4-section');
  const tipLabel2DetailEl  = $('tip-label2-detail');
  const tipLabel3DetailEl  = $('tip-label3-detail');
  const tipLabel4DetailEl  = $('tip-label4-detail');
  const nodeLabelShowEl         = $('node-label-show');
  const nodeLabelPositionEl     = $('node-label-position');
  const nodeLabelFontSizeSlider = $('node-label-font-size-slider');
  const nodeLabelColorEl        = $('node-label-color');
  const nodeLabelSpacingSlider  = $('node-label-spacing-slider');
  const tipLabelSpacingSlider   = $('tip-label-spacing-slider');
  const tipLabelDpRowEl          = $('tip-label-dp-row');
  const tipLabelDpEl             = $('tip-label-decimal-places');
  const nodeLabelDpRowEl         = $('node-label-dp-row');
  const nodeLabelDpEl            = $('node-label-decimal-places');
  const nodeLabelColourBy        = $('node-label-colour-by');
  const nodeLabelConfigureRow    = $('node-label-configure-row');
  const branchLabelDetailEl       = $('branch-label-detail');
  const branchLabelTypefaceEl      = $('branch-label-typeface-select');
  const branchLabelTypefaceStyleEl = $('branch-label-typeface-style-select');
  const branchLabelShowEl          = $('branch-label-show');
  const branchLabelPositionEl      = $('branch-label-position');
  const branchLabelFontSizeSlider  = $('branch-label-font-size-slider');
  const branchLabelColorEl         = $('branch-label-color');
  const branchLabelSpacingSlider   = $('branch-label-spacing-slider');
  const branchLabelDpRowEl         = $('branch-label-dp-row');
  const branchLabelDpEl            = $('branch-label-decimal-places');
  const branchLabelColourBy        = $('branch-label-colour-by');
  const branchLabelConfigureRow    = $('branch-label-configure-row');
  const tipConfigureRow    = $('tip-configure-row');
  const nodeConfigureRow   = $('node-configure-row');
  const branchConfigureRow = $('branch-configure-row');
  const labelConfigureRow  = $('label-configure-row');
  const tipLabelShapeEl              = $('tip-label-shape');
  const tipLabelShapeColorEl         = $('tip-label-shape-color');
  const tipLabelShapeColourBy        = $('tip-label-shape-colour-by');
  const tipLabelShapeConfigureRow    = $('tip-label-shape-configure-row');
  const tipLabelShapeMarginLeftSlider  = $('tip-label-shape-margin-left-slider');
  const tipLabelShapeSpacingSlider     = $('tip-label-shape-spacing-slider');
  const tipLabelShapeSizeSlider        = $('tip-label-shape-size-slider');
  const tipLabelShapeDetailEl        = $('tip-label-shape-detail');
  const branchShapeEl                 = $('branch-shape');
  const branchShapeDetailEl           = $('branch-shape-detail');
  const branchShapeHeightSlider       = $('branch-shape-height-slider');
  const branchShapeWidthSlider        = $('branch-shape-width-slider');
  const branchShapeAlignEl            = $('branch-shape-align');
  const branchShapeSpacingSlider      = $('branch-shape-spacing-slider');
  const branchShapeColorEl            = $('branch-shape-color');
  const branchShapeColourByEl         = $('branch-shape-colour-by');
  const branchShapeCountByEl          = $('branch-shape-count-by');
  const branchShapeHaloSlider         = $('branch-shape-halo-slider');
  const branchShapeHaloColorEl        = $('branch-shape-halo-color');
  const branchShapeConfigureRow       = $('branch-shape-configure-row');
  const branchShapeExtraEls           = [2, 3, 4].map(n => $(`branch-shape-${n}`));
  const branchShapeExtraColors        = [2, 3, 4].map(n => $(`branch-shape-${n}-color`));
  const branchShapeExtraColourBys     = [2, 3, 4].map(n => $(`branch-shape-${n}-colour-by`));
  const branchShapeExtraCountBys      = [2, 3, 4].map(n => $(`branch-shape-${n}-count-by`));
  const branchShapeExtraConfigureRows = [2, 3, 4].map(n => $(`branch-shape-${n}-configure-row`));
  const branchShapeExtraConfigureBtns = [2, 3, 4].map(n => $(`branch-shape-${n}-configure-btn`));
  const branchShapeExtraSectionEls    = [2, 3, 4].map(n => $(`branch-shape-${n}-section`));
  const branchShapeExtraDetailEls     = [2, 3, 4].map(n => $(`branch-shape-${n}-detail`));
  const optionsVisibility = createDeclarativeOptionsController({ root, scopeSelector: '#palette-panel' });
  const optionsController = optionsVisibility.options;
  // Extra label shapes 2–10 (indices 0–8 correspond to shape numbers 2–10)
  const EXTRA_SHAPE_COUNT = 9;
  const tipLabelShapeExtraEls           = Array.from({length: EXTRA_SHAPE_COUNT}, (_, i) => $(`tip-label-shape-${i + 2}`));
  const tipLabelShapeExtraColourBys     = Array.from({length: EXTRA_SHAPE_COUNT}, (_, i) => $(`tip-label-shape-${i + 2}-colour-by`));
  const tipLabelShapeExtraConfigureRows  = Array.from({length: EXTRA_SHAPE_COUNT}, (_, i) => $(`tip-label-shape-${i + 2}-configure-row`));
  const tipLabelShapeExtraConfigureBtns  = Array.from({length: EXTRA_SHAPE_COUNT}, (_, i) => $(`tip-label-shape-${i + 2}-configure-btn`));
  // Annotation colour config modal
  const annotConfigOverlay       = $('annot-config-overlay');
  const annotConfigTitle         = $('annot-config-title');
  const annotConfigInfo          = $('annot-config-info');
  const annotConfigPaletteSelect = $('annot-config-palette-select');
  const annotConfigPaletteReverse = $('annot-config-palette-reverse');
  const annotConfigPalettePreview = $('annot-config-palette-preview');
  const annotConfigScaleRow      = $('annot-config-scale-row');
  const annotConfigScaleSelect   = $('annot-config-scale-select');
  const tipLabelShapeExtraSectionEls    = Array.from({length: EXTRA_SHAPE_COUNT}, (_, i) => $(`tip-label-shape-${i + 2}-section`));
  const tipLabelShapeExtraDetailEls     = Array.from({length: EXTRA_SHAPE_COUNT}, (_, i) => $(`tip-label-shape-${i + 2}-detail`));
  const legendAnnotEl         = $('legend-annotation');
  const legendTextColorEl     = $('legend-text-color');
  const legendFontSizeSlider   = $('legend-font-size-slider');
  const legendSpacingSlider    = $('legend-spacing-slider');
  const legendHeightPctSlider  = $('legend-height-pct-slider');
  const legendTypefaceEl     = $('legend-font-family-select');
  const legendRightCanvas  = $('legend-right-canvas');
  const legend2RightCanvas = $('legend2-right-canvas');
  const legend3RightCanvas = $('legend3-right-canvas');
  const legend4RightCanvas = $('legend4-right-canvas');
  const legend2AnnotEl          = $('legend-annotation-2');
  const legend2ShowEl           = $('legend2-show');
  const legend2HeightPctSlider  = $('legend2-height-pct-slider');
  const legend2DetailEl         = $('legend2-detail');
  const legend2SectionEl        = $('legend2-section');
  const legendDpRowEl           = $('legend-dp-row');
  const legendDpEl              = $('legend-decimal-places');
  const legend2DpRowEl          = $('legend2-dp-row');
  const legend2DpEl             = $('legend2-decimal-places');
  const legend3AnnotEl          = $('legend-annotation-3');
  const legend3ShowEl           = $('legend3-show');
  const legend3HeightPctSlider  = $('legend3-height-pct-slider');
  const legend3DetailEl         = $('legend3-detail');
  const legend3SectionEl        = $('legend3-section');
  const legend3DpRowEl          = $('legend3-dp-row');
  const legend3DpEl             = $('legend3-decimal-places');
  const legend4AnnotEl          = $('legend-annotation-4');
  const legend4ShowEl           = $('legend4-show');
  const legend4HeightPctSlider  = $('legend4-height-pct-slider');
  const legend4DetailEl         = $('legend4-detail');
  const legend4SectionEl        = $('legend4-section');
  const legend4DpRowEl          = $('legend4-dp-row');
  const legend4DpEl             = $('legend4-decimal-places');
  const legendConfigureRow       = $('legend-configure-row');
  const legend2ConfigureRow      = $('legend2-configure-row');
  const legend3ConfigureRow      = $('legend3-configure-row');
  const legend4ConfigureRow      = $('legend4-configure-row');
  const axisCanvas             = $('axis-canvas');
  const axisShowEl             = $('axis-show');
  const axisRangeLeftEl        = $('axis-range-left');
  const axisRangeRightEl       = $('axis-range-right');
  const axisDateAnnotEl        = $('axis-date-annotation');
  const axisDateRow            = $('axis-date-row');
  const axisDateFmtEl          = $('axis-date-format');
  const axisDateFmtRow         = $('axis-date-format-row');
  const axisMajorIntervalEl    = $('axis-major-interval');
  const axisMinorIntervalEl    = $('axis-minor-interval');
  const axisMajorLabelEl       = $('axis-major-label');
  const axisMinorLabelEl       = $('axis-minor-label');
  const axisMajorIntervalRow   = $('axis-major-interval-row');
  const axisMinorIntervalRow   = $('axis-minor-interval-row');
  const axisMajorLabelRow      = $('axis-major-label-row');
  const axisMinorLabelRow      = $('axis-minor-label-row');
  const axisColorEl           = $('axis-color');
  const axisFontSizeSlider    = $('axis-font-size-slider');
  const axisTypefaceEl      = $('axis-font-family-select');
  const axisLineWidthSlider   = $('axis-line-width-slider');

  // Per-axis-mode range state (tree-only settings — not saved to localStorage).
  // Defaults: forward left=0; reverse right=0; time both auto (empty).
  let _axisRangeByMode = {
    time:    { left: '',  right: '' },
    forward: { left: '0', right: '' },
    reverse: { left: '',  right: '0' },
  };
  let _prevAxisMode = null;  // tracks previous mode so we can save range on switch
  let _axisRangeApplyTimer = null;
  const _AXIS_RANGE_APPLY_DELAY_MS = 350;
  const rttXOriginEl           = $('rtt-x-origin');
  const rttGridLinesEl          = $('rtt-grid-lines');
  const rttAspectRatioEl        = $('rtt-aspect-ratio');
  const rttAxisColorEl         = $('rtt-axis-color');
  const rttStatsBgColorEl      = $('rtt-stats-bg-color');
  const rttStatsTextColorEl    = $('rtt-stats-text-color');
  const rttStatsFontSizeSlider = $('rtt-stats-font-size-slider');
  const rttRegressionStyleEl   = $('rtt-regression-style');
  const rttRegressionColorEl   = $('rtt-regression-color');
  const rttRegressionWidthSlider = $('rtt-regression-width-slider');
  const rttResidBandShowEl            = $('rtt-resid-band-show');
  const rttResidBandStyleEl           = $('rtt-resid-band-style');
  const rttResidBandColorEl           = $('rtt-resid-band-color');
  const rttResidBandWidthSlider       = $('rtt-resid-band-width-slider');
  const rttResidBandFillColorEl       = $('rtt-resid-band-fill-color');
  const rttResidBandFillOpacitySlider = $('rtt-resid-band-fill-opacity-slider');
  const rttAxisFontSizeSlider  = $('rtt-axis-font-size-slider');
  const rttAxisFontFamilyEl    = $('rtt-axis-font-family-select');
  const rttAxisLineWidthSlider = $('rtt-axis-line-width-slider');
  const rttDateFmtEl           = $('rtt-date-format');
  const rttMajorIntervalEl     = $('rtt-major-interval');
  const rttMinorIntervalEl     = $('rtt-minor-interval');
  const rttMajorLabelEl        = $('rtt-major-label');
  const rttMinorLabelEl        = $('rtt-minor-label');
  const rttDateFmtRow          = $('rtt-date-format-row');
  const rttMajorIntervalRow    = $('rtt-major-interval-row');
  const rttMinorIntervalRow    = $('rtt-minor-interval-row');
  const rttMajorLabelRow       = $('rtt-major-label-row');
  const rttMinorLabelRow       = $('rtt-minor-label-row');
  // Clade highlight controls
  const cladeHighlightColourByEl         = $('clade-highlight-colour-by');
  const cladeHighlightConfigureRow       = $('clade-highlight-configure-row');
  const cladeHighlightDefaultColourEl    = $('clade-highlight-default-colour');
  const btnPaintHighlight                = $('btn-paint-highlight');
  const cladeHighlightLeftEdgeEl         = $('clade-highlight-left-edge');
  const cladeHighlightRightEdgeEl        = $('clade-highlight-right-edge');
  const cladeHighlightPaddingSlider      = $('clade-highlight-padding');
  const cladeHighlightRadiusSlider       = $('clade-highlight-radius');
  const cladeHighlightFillOpacitySlider  = $('clade-highlight-fill-opacity');
  const cladeHighlightStrokeOpacitySlider = $('clade-highlight-stroke-opacity');
  const cladeHighlightStrokeWidthSlider  = $('clade-highlight-stroke-width');
  const cladeHighlightListEl             = $('clade-highlight-list');
  const themeSelect            = $('theme-select');
  const btnStoreTheme          = $('btn-store-theme');
  const btnDefaultTheme        = $('btn-default-theme');
  const btnRemoveTheme         = $('btn-remove-theme');
  const btnExportTheme         = $('btn-export-theme');
  const btnImportTheme         = $('btn-import-theme');
  const btnUiThemeFamily       = $('btn-ui-theme-family');
  const uiThemeFamilyCurrentEl = $('ui-theme-family-current');
  const btnFit                 = $('btn-fit');
  const btnResetSettings       = $('btn-reset-settings');
  const btnImportAnnot         = $('btn-import-annot');
  const btnCurateAnnot         = $('btn-curate-annot');
  const btnManageFilters       = $('btn-manage-filters');
  const btnManagePalettes      = $('btn-manage-palettes');
  let filterManager            = null;  // assigned after renderer is created
  let paletteManager           = null;  // assigned after renderer is created

  function _formatBranchShapeWidth(value) {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(n)) return '1';
    return n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  const _BRANCH_SHAPE_WIDTH_MIN = 0.05;
  const _BRANCH_SHAPE_WIDTH_MID = 1;
  const _BRANCH_SHAPE_WIDTH_MAX = 5;

  function _branchShapeWidthFromSlider(value) {
    const position = Math.max(0, Math.min(100, typeof value === 'number' ? value : parseFloat(value) || 0)) / 100;
    if (position <= 0.5) {
      const t = position / 0.5;
      return _BRANCH_SHAPE_WIDTH_MIN * Math.pow(_BRANCH_SHAPE_WIDTH_MID / _BRANCH_SHAPE_WIDTH_MIN, t);
    }
    const t = (position - 0.5) / 0.5;
    return _BRANCH_SHAPE_WIDTH_MID * Math.pow(_BRANCH_SHAPE_WIDTH_MAX / _BRANCH_SHAPE_WIDTH_MID, t);
  }

  function _branchShapeWidthToSlider(value) {
    const width = Math.max(_BRANCH_SHAPE_WIDTH_MIN, Math.min(_BRANCH_SHAPE_WIDTH_MAX, typeof value === 'number' ? value : parseFloat(value) || _BRANCH_SHAPE_WIDTH_MID));
    if (width <= _BRANCH_SHAPE_WIDTH_MID) {
      const t = Math.log(width / _BRANCH_SHAPE_WIDTH_MIN) / Math.log(_BRANCH_SHAPE_WIDTH_MID / _BRANCH_SHAPE_WIDTH_MIN);
      return Math.round(Math.max(0, Math.min(50, t * 50)));
    }
    const t = Math.log(width / _BRANCH_SHAPE_WIDTH_MID) / Math.log(_BRANCH_SHAPE_WIDTH_MAX / _BRANCH_SHAPE_WIDTH_MID);
    return Math.round(Math.max(50, Math.min(100, 50 + t * 50)));
  }
  const nodeBarsFilterEl      = $('node-bars-filter');
  const nodeLabelsFilterEl    = $('node-labels-filter');
  const branchLabelsFilterEl  = $('branch-labels-filter');
  const branchShapesFilterEl  = $('branch-shapes-filter');
  const tipLabelsFilterEl     = $('tip-labels-filter');
  const nodeShapesFilterEl    = $('node-shapes-filter');
  const tipShapesFilterEl     = $('tip-shapes-filter');
  const btnDataTable           = $('btn-data-table');
  const btnRtt                 = $('btn-rtt');
  const btnExportTree          = $('btn-export-tree');
  const btnMPR                 = $('btn-midpoint-root');
  const btnTemporalRoot        = $('btn-temporal-root');
  const btnTemporalRootGlobal  = $('btn-temporal-root-global');
  const btnApplyUserColour           = $('btn-apply-user-colour');
  const btnClearUserColour           = $('btn-clear-user-colour');

  const optionsPanelProfile = createPeartreeOptionsPanelProfile({
    root,
    extraShapeCount: EXTRA_SHAPE_COUNT,
    tipShapesFilterEl,
    nodeShapesFilterEl,
    tipLabelsFilterEl,
    nodeLabelsFilterEl,
    branchLabelsFilterEl,
    nodeBarsFilterEl,
    branchShapesFilterEl,
    tipShapeDetailEl,
    nodeShapeDetailEl,
    tipLabelShapeDetailEl,
    tipLabelShapeExtraSectionEls,
    tipLabelShapeExtraDetailEls,
    branchShapeDetailEl,
    branchShapeExtraSectionEls,
    branchShapeExtraDetailEls,
    nodeLabelDetailEl,
    branchLabelDetailEl,
    nodeBarsDetailEl,
    nodeBars2SectionEl: nodeBarsExtraSectionEls[0],
    nodeBars2DetailEl: nodeBarsExtraDetailEls[0],
    nodeBars3SectionEl: nodeBarsExtraSectionEls[1],
    nodeBars3DetailEl: nodeBarsExtraDetailEls[1],
    nodeBars4SectionEl: nodeBarsExtraSectionEls[2],
    nodeBars4DetailEl: nodeBarsExtraDetailEls[2],
    legendDetailEl,
    legend2SectionEl,
    legend2DetailEl,
    legend3SectionEl,
    legend3DetailEl,
    legend4SectionEl,
    legend4DetailEl,
    axisDetailEl,
    tipLabel2SectionEl,
    tipLabel3SectionEl,
    tipLabel4SectionEl,
    tipLabel2DetailEl,
    tipLabel3DetailEl,
    tipLabel4DetailEl,
  });
  optionsVisibility.setCascades(optionsPanelProfile.cascades);
  optionsVisibility.setRules(optionsPanelProfile.rules);

  // Toolbar swatch-popup colour picker
  const toolbarColourPicker = createToolbarColourPicker({ root, palettes: CATEGORICAL_PALETTES, $: id => root.querySelector('#' + id) });
  // Shim so the picker's value is readable/writable via a simple .value property.
  const paintColourPickerEl = {
    get value()  { return toolbarColourPicker?.getValue() ?? '#ff8800'; },
    set value(v) { toolbarColourPicker?.setValue(v); },
  };
  const _addRecentColour = (hex) => toolbarColourPicker?.addRecent(hex);

  // Upgrade all side-panel <input type="color" class="pt-palette-color"> to swatch pickers
  upgradeAllPaletteColourPickers(root, { palettes: CATEGORICAL_PALETTES });
  let filterControl = null;  // managed by filter-control.js; set in bindControls()

  // ── Settings persistence ──────────────────────────────────────────────────
  // SETTINGS_KEY, USER_THEMES_KEY, THEMES, DEFAULT_SETTINGS imported from ./themes.js

  let currentOrder = null;  // null | 'asc' | 'desc' — declared early so saveSettings() is safe to call during init

  // ── Tree state — declared early so hoisted async function loadTree() can access them ──
  let graph              = null;  // PhyloGraph (adjacency-list model)
  let controlsBound      = false;
  let _cachedMidpoint      = null;  // cached midpointRootGraph() result; cleared on every tree change
  let isExplicitlyRooted = false; // true when root node carries annotations — rerooting disabled
  let _loadedFilename    = null;  // filename of the most recently loaded tree
  let _treeSourceUrl     = null;  // URL the current tree was fetched from (null if loaded from file)
  let _onTitleChange     = null;  // optional callback(filename|null) for platform title updates
  let _axisIsTimedTree   = false;
  let treeLoaded         = false; // declared early — referenced by _syncCanvasWrapperBg before modal init

  // Theme manager created later (needs saveSettings which needs _buildSnapshot).
  // Forward-declared; assigned after _buildSnapshot and applyTheme are defined.
  let themeManager = null;
  let uiThemeManager = null;

  /** Per-annotation palette override: annotationKey → palette name string. */
  const annotationPalettes = new Map();

  /** Per-annotation palette reverse flag: annotationKey → boolean. */
  const annotationPaletteReverses = new Map();

  /** Per-annotation scale mode: annotationKey → 'symmetric-zero'|'zero-positive'|'' */
  const annotationScaleModes = new Map();

  /** Tracks which annotation key the annot-config modal is currently open for. */
  let _annotConfigKey = null;

  /** Show/hide a configure-button row based on whether a real annotation key is selected. */
  function _updateConfigureBtn(row, annotKey) {
    if (!row) return;
    row.style.display = (annotKey && annotKey !== 'user_colour') ? '' : 'none';
  }

  /** Open the annotation colour-config modal for the given annotation key. */
  function openAnnotConfig(key) {
    if (!key || key === 'user_colour') return;
    _annotConfigKey = key;
    const schema = renderer?._annotationSchema;
    const def = schema?.get(key);
    if (annotConfigTitle) annotConfigTitle.textContent = def?.label ?? key;
    // Populate annotation info
    if (annotConfigInfo) {
      const lines = [];
      if (def) {
        const typeLabels = { real: 'Continuous', integer: 'Integer', proportion: 'Proportion', percentage: 'Percentage', categorical: 'Categorical', ordinal: 'Ordinal', date: 'Date' };
        const typeLabel = typeLabels[def.dataType] ?? def.dataType ?? 'Unknown';
        lines.push(`<strong>Type:</strong> ${typeLabel}`);
        const isCatLike = def.dataType === 'categorical' || def.dataType === 'ordinal';
        if (isCatLike && def.values?.length) {
          lines.push(`<strong>Categories:</strong> ${def.values.length}`);
        } else if (isNumericType(def.dataType)) {
          const lo = def.observedMin ?? def.min;
          const hi = def.observedMax ?? def.max;
          if (lo != null && hi != null) {
            const fmt = (v) => Number.isInteger(v) ? v : +v.toPrecision(4);
            lines.push(`<strong>Range:</strong> ${fmt(lo)} → ${fmt(hi)}`);
          }
        }
      }
      annotConfigInfo.innerHTML = lines.join('<br>');
    }
    // Populate palette select
    if (annotConfigPaletteSelect) {
      const isCat = def?.dataType === 'categorical' || def?.dataType === 'ordinal';
      const palettes = isCat ? allCategoricalPalettes() : allSequentialPalettes();
      const defPal   = isCat ? DEFAULT_CATEGORICAL_PALETTE : DEFAULT_SEQUENTIAL_PALETTE;
      const stored   = annotationPalettes.get(key) ?? defPal;
      const isRev    = !!annotationPaletteReverses.get(key);
      annotConfigPaletteSelect.innerHTML = '';
      for (const name of Object.keys(palettes)) {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        annotConfigPaletteSelect.appendChild(opt);
      }
      annotConfigPaletteSelect.value = [...annotConfigPaletteSelect.options].some(o => o.value === stored) ? stored : defPal;
      if (annotConfigPaletteReverse) annotConfigPaletteReverse.checked = isRev;
    }
    // Show/populate scale mode row only for numeric annotations
    if (annotConfigScaleRow && annotConfigScaleSelect) {
      const isNumeric = def && isNumericType(def.dataType);
      annotConfigScaleRow.style.display = isNumeric ? '' : 'none';
      if (isNumeric) {
        const sm = annotationScaleModes.get(key) ?? '';
        annotConfigScaleSelect.value = [...annotConfigScaleSelect.options].some(o => o.value === sm) ? sm : '';
      }
    }
    // Render palette preview
    {
      const isCat = def?.dataType === 'categorical' || def?.dataType === 'ordinal';
      _renderAnnotConfigPreview(annotConfigPaletteSelect?.value ?? '', isCat, !!annotConfigPaletteReverse?.checked);
    }
    annotConfigOverlay?.classList.add('open');
  }

  /**
   * If the annot-config modal is open for `key`, sync its palette select to `paletteName`.
   * Called when the annotation curator changes a palette.
   */
  function _syncPaletteSelects(key, paletteName) {
    if (_annotConfigKey === key && annotConfigPaletteSelect) {
      if ([...annotConfigPaletteSelect.options].some(o => o.value === paletteName))
        annotConfigPaletteSelect.value = paletteName;
    }
  }

  /**
   * If the annot-config modal is open for `key`, sync its scale select to `mode`.
   * Called when the annotation curator changes a scale mode.
   */
  function _syncScaleModeSelects(key, mode) {
    if (_annotConfigKey === key && annotConfigScaleSelect) {
      if ([...annotConfigScaleSelect.options].some(o => o.value === mode))
        annotConfigScaleSelect.value = mode;
    }
  }

  /**
   * Render a palette preview into the annot-config modal's preview div.
   * For categorical palettes: a row of colour swatches.
   * For sequential/diverging palettes: a full-width gradient bar.
   * @param {string} paletteName
   * @param {boolean} isCat  true → categorical, false → sequential
   */
  function _renderAnnotConfigPreview(paletteName, isCat, isReversed = false) {
    if (!annotConfigPalettePreview) return;
    if (isCat) {
      const colours = getCategoricalPalette(paletteName);
      const show = isReversed ? [...colours].reverse() : colours;
      annotConfigPalettePreview.innerHTML = show.slice(0, 12).map(c =>
        `<span class="pm-mini-swatch" style="background:${c}"></span>`
      ).join('');
    } else {
      const stops = getSequentialPalette(paletteName);
      const show = isReversed ? [...stops].reverse() : stops;
      const grad  = stops.length === 1
        ? show[0]
        : `linear-gradient(to right, ${show.join(', ')})`;
      annotConfigPalettePreview.innerHTML =
        `<span class="pm-mini-gradient" style="background:${grad};width:100%;display:block;height:14px;border-radius:3px;border:1px solid rgba(255,255,255,0.12)"></span>`;
    }
  }

  // Theme helper functions are provided by the themeManager (created later).

  /**
   * Build a settings snapshot from the current DOM control values.
   *
   * @param {object} [opts]
   * @param {boolean} [opts.themeOnly=false]  When true, return only the visual/theme
   *   properties (suitable for theme exports). paintColour is intentionally excluded
   *   from theme snapshots — it is a transient tool colour, not a theme property.
   */
  function _buildSnapshot({ themeOnly = false } = {}) {
    // Visual / theme properties — included in both theme exports and full settings.
    const themePart = {
      // Core appearance
      canvasBgColor:    canvasBgColorEl.value,
      branchColor:      branchColorEl.value,
      branchWidth:      branchWidthSlider.value,
      elbowRadius:      elbowRadiusSlider?.value ?? DEFAULT_THEME.elbowRadius,
      tipLabelFontSize: fontSlider.value,
      typeface:         fontFamilyEl.value,
      typefaceStyle:    fontTypefaceStyleEl?.value || '',
      tipLabelColor:    labelColorEl.value,
      // Tip shape/size
      tipShapeSize:     tipSlider.value,
      tipShapeHaloSize: tipHaloSlider.value,
      tipShapeColor:    tipShapeColorEl.value,
      tipShapeBgColor:  tipShapeBgEl.value,
      // Node shape/size
      nodeShapeSize:    nodeSlider.value,
      nodeShapeHaloSize: nodeHaloSlider.value,
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      // Branch shapes colours
      branchShapeColor:  branchShapeColorEl.value,
      branchShapeHaloColor: branchShapeHaloColorEl.value,
      branchShape2Color: branchShapeExtraColors[0]?.value || '#aaaaaa',
      branchShape3Color: branchShapeExtraColors[1]?.value || '#aaaaaa',
      branchShape4Color: branchShapeExtraColors[2]?.value || '#aaaaaa',
      // Node bars (colour only — width/opacity are in full settings only)
      nodeBarsColor:    nodeBarsColorEl.value,
      // Hover colours
      tipHoverFillColor:         tipHoverFillEl.value,
      tipHoverStrokeColor:       tipHoverStrokeEl.value,
      tipHoverGrowthFactor:      String(tipHoverGrowthFactorValue),
      tipHoverGrowth:            tipHoverGrowthSlider.value,
      tipHoverMinSize:           tipHoverMinSizeSlider.value,
      tipHoverFillOpacity:       tipHoverFillOpacitySlider.value,
      tipHoverStrokeWidth:       tipHoverStrokeWidthSlider.value,
      tipHoverStrokeOpacity:     tipHoverStrokeOpacitySlider.value,
      nodeHoverFillColor:        nodeHoverFillEl.value,
      nodeHoverStrokeColor:      nodeHoverStrokeEl.value,
      nodeHoverGrowthFactor:     String(nodeHoverGrowthFactorValue),
      nodeHoverGrowth:           nodeHoverGrowthSlider.value,
      nodeHoverMinSize:          nodeHoverMinSizeSlider.value,
      nodeHoverFillOpacity:      nodeHoverFillOpacitySlider.value,
      nodeHoverStrokeWidth:      nodeHoverStrokeWidthSlider.value,
      nodeHoverStrokeOpacity:    nodeHoverStrokeOpacitySlider.value,
      // Selected colours
      selectedTipFillColor:      selectedTipFillEl.value,
      selectedTipStrokeColor:    selectedTipStrokeEl.value,
      selectedTipGrowthFactor:   String(selectedTipGrowthFactorValue),
      selectedTipGrowth:         selectedTipGrowthSlider.value,
      selectedTipMinSize:        selectedTipMinSizeSlider.value,
      selectedTipFillOpacity:    selectedTipFillOpacitySlider.value,
      selectedTipStrokeWidth:    selectedTipStrokeWidthSlider.value,
      selectedTipStrokeOpacity:  selectedTipStrokeOpacitySlider.value,
      selectedNodeFillColor:     selectedNodeFillEl.value,
      selectedNodeStrokeColor:   selectedNodeStrokeEl.value,
      selectedNodeGrowthFactor:  String(selectedNodeGrowthFactorValue),
      selectedNodeGrowth:        selectedNodeGrowthSlider.value,
      selectedNodeMinSize:       selectedNodeMinSizeSlider.value,
      selectedNodeFillOpacity:   selectedNodeFillOpacitySlider.value,
      selectedNodeStrokeWidth:   selectedNodeStrokeWidthSlider.value,
      selectedNodeStrokeOpacity: selectedNodeStrokeOpacitySlider.value,
      // Axis appearance
      axisColor:         axisColorEl.value,
      axisFontSize:      axisFontSizeSlider.value,
      axisTypefaceKey:   axisTypefaceEl.value,
      axisTypefaceStyle: axisTypefaceStyleEl?.value || '',
      axisLineWidth:     axisLineWidthSlider.value,
      // Legend appearance
      legendTextColor:   legendTextColorEl.value,
      legendFontSize:    legendFontSizeSlider.value,
      legendTypefaceKey: legendTypefaceEl.value,
      legendTypefaceStyle: legendTypefaceStyleEl?.value || '',
      // RTT chart colours
      rttAxisColor:       rttAxisColorEl.value,
      rttStatsBgColor:    rttStatsBgColorEl.value,
      rttStatsTextColor:  rttStatsTextColorEl.value,
      rttRegressionColor: rttRegressionColorEl.value,
      rttResidBandColor:       rttResidBandColorEl.value,
      rttResidBandFillColor:   rttResidBandFillColorEl.value,
    };

    if (themeOnly) return themePart;

    // Full settings snapshot — everything above plus state, annotations,
    // non-visual config, and paintColour (intentionally excluded from themes).
    return {
      ...themePart,
      selectedTheme:     themeSelect?.value ?? DEFAULT_SETTINGS.selectedTheme,
      defaultTheme:     themeManager?.defaultTheme ?? DEFAULT_SETTINGS.defaultTheme,
      paintColour:      paintColourPickerEl.value,
      selectedLabelStyle: selectedLabelStyleEl.value,
      tipLabelTypefaceKey:         tipLabelTypefaceEl?.value  || '',
      tipLabelTypefaceStyle:       typefaceStyleEl?.value     || '',
      nodeLabelTypefaceKey:        nodeLabelTypefaceEl?.value || '',
      nodeLabelTypefaceStyle:      nodeLabelTypefaceStyleEl?.value || '',
      branchLabelTypefaceKey:      branchLabelTypefaceEl?.value || '',
      branchLabelTypefaceStyle:    branchLabelTypefaceStyleEl?.value || '',
      collapsedCladeTypefaceKey:   collapsedCladeTypefaceEl?.value || '',
      collapsedCladeTypefaceStyle: collapsedCladeTypefaceStyleEl?.value || '',
      tipColourBy:      tipColourBy.value,
      nodeColourBy:     nodeColourBy.value,
      branchColourBy:   branchColourBy?.value || 'user_colour',
      labelColourBy:    labelColourBy.value,
      annotationPalettes: Object.fromEntries(annotationPalettes),
      annotationPaletteReverses: Object.fromEntries(annotationPaletteReverses),
      annotationScaleModes: Object.fromEntries(annotationScaleModes),
      legendAnnotation:  legendAnnotEl.value,
      legendSpacing: legendSpacingSlider.value,
      legendDecimalPlaces: legendDpEl.value !== '' ? parseInt(legendDpEl.value) : null,
      legendAnnotation2: legend2AnnotEl.value,
      legend2Position:   legend2ShowEl.value,
      legendHeightPct2:  legend2HeightPctSlider.value,
      legendDecimalPlaces2: legend2DpEl.value !== '' ? parseInt(legend2DpEl.value) : null,
      legendAnnotation3: legend3AnnotEl.value,
      legend3Position:   legend3ShowEl.value,
      legendHeightPct3:  legend3HeightPctSlider.value,
      legendDecimalPlaces3: legend3DpEl.value !== '' ? parseInt(legend3DpEl.value) : null,
      legendAnnotation4: legend4AnnotEl.value,
      legend4Position:   legend4ShowEl.value,
      legendHeightPct4:  legend4HeightPctSlider.value,
      legendDecimalPlaces4: legend4DpEl.value !== '' ? parseInt(legend4DpEl.value) : null,
      legendHeightPct:   legendHeightPctSlider.value,
      axisShow:           axisShowEl.value,
      axisDateAnnotation: axisDateAnnotEl.value,
      axisDateFormat:     axisDateFmtEl.value,
      axisMajorInterval:    axisMajorIntervalEl.value,
      axisMinorInterval:    axisMinorIntervalEl.value,
      axisMajorLabelFormat: axisMajorLabelEl.value,
      axisMinorLabelFormat: axisMinorLabelEl.value,
      rttXOrigin:         rttXOriginEl.value,
      rttGridLines:       rttGridLinesEl.value,
      rttAspectRatio:     rttAspectRatioEl.value,
      rttStatsFontSize:   rttStatsFontSizeSlider.value,
      rttRegressionStyle: rttRegressionStyleEl.value,
      rttRegressionWidth: rttRegressionWidthSlider.value,
      rttResidBandShow:         rttResidBandShowEl.value,
      rttResidBandStyle:        rttResidBandStyleEl.value,
      rttResidBandWidth:        rttResidBandWidthSlider.value,
      rttResidBandFillOpacity:  rttResidBandFillOpacitySlider.value,
      rttAxisFontSize:    rttAxisFontSizeSlider.value,
      rttAxisTypefaceKey:    rttAxisFontFamilyEl.value,
      rttAxisTypefaceStyle:  rttAxisTypefaceStyleEl?.value || '',
      rttAxisLineWidth:   rttAxisLineWidthSlider.value,
      rttDateFormat:        rttDateFmtEl.value,
      rttMajorInterval:     rttMajorIntervalEl.value,
      rttMinorInterval:     rttMinorIntervalEl.value,
      rttMajorLabelFormat:  rttMajorLabelEl.value,
      rttMinorLabelFormat:  rttMinorLabelEl.value,
      nodeBarsEnabled:         nodeBarsShowEl.value,
      nodeBarsExtraEnabled:    nodeBarsExtraShowEls.map(el => el?.value || 'off'),
      nodeBarsClipTo:          nodeBarsClipToEl?.value || 'off',
      nodeBarsExtraClipTo:     nodeBarsExtraClipToEls.map(el => el?.value || 'off'),
      nodeBarsWidth:           nodeBarsWidthSlider.value,
      nodeBarsExtraWidths:     nodeBarsExtraWidthSliders.map(el => el?.value || '6'),
      nodeBarsFillOpacity:     nodeBarsFillOpacitySlider.value,
      nodeBarsExtraFillOpacities: nodeBarsExtraFillOpacitySliders.map(el => el?.value || '0.22'),
      nodeBarsStrokeOpacity:   nodeBarsStrokeOpacitySlider.value,
      nodeBarsExtraStrokeOpacities: nodeBarsExtraStrokeOpacitySliders.map(el => el?.value || '0.55'),
      nodeBarsExtraColors:     nodeBarsExtraColorEls.map(el => el?.value || '#2aa198'),
      nodeBarsLine:             nodeBarsLineEl.value,
      nodeBarsRange:          nodeBarsRangeEl.value,
      collapsedCladeOpacity:  collapsedOpacitySlider.value,
      collapsedCladeStrokeWidth: collapsedStrokeWidthSlider.value,
      collapsedCladeStrokeOpacity: collapsedStrokeOpacitySlider.value,
      collapsedCladeHeightN:  collapsedHeightNSlider.value,
      collapsedCladeFontSize: collapsedCladeFontSizeSlider.value,
      rootStemPct:        rootStemPctSlider.value,
      tipLabelShow:       tipLabelShow.value,
      tipLabelAlign:      tipLabelAlignEl.value,
      tipLabelSpacing:    tipLabelSpacingSlider.value,
      tipLabelsExtra:     [tipLabel2ShowEl.value, tipLabel3ShowEl.value, tipLabel4ShowEl.value],
      tipLabelsExtraLayouts: [tipLabel2LayoutEl.value, tipLabel3LayoutEl.value, tipLabel4LayoutEl.value],
      tipLabelDecimalPlaces:  tipLabelDpEl.value !== '' ? parseInt(tipLabelDpEl.value) : null,
      tipLabelShape:      tipLabelShapeEl.value,
      tipLabelShapeColor: tipLabelShapeColorEl.value,
      tipLabelShapeColourBy: tipLabelShapeColourBy.value,
      tipLabelShapeSize:    tipLabelShapeSizeSlider.value,
      tipLabelShapeMarginLeft:  tipLabelShapeMarginLeftSlider.value,
      tipLabelShapeSpacing:     tipLabelShapeSpacingSlider.value,
      tipLabelShapesExtra:        tipLabelShapeExtraEls.map(e => e.value),
      tipLabelShapeExtraColourBys: tipLabelShapeExtraColourBys.map(e => e.value),
      branchShape:                 branchShapeEl?.value || 'off',
      branchShapeHeightPct:        branchShapeHeightSlider?.value ?? DEFAULT_SETTINGS.branchShapeHeightPct,
      branchShapeWidth:            branchShapeWidthSlider?.value ?? DEFAULT_SETTINGS.branchShapeWidth,
      branchShapeAlign:            branchShapeAlignEl?.value || DEFAULT_SETTINGS.branchShapeAlign,
      branchShapeSpacing:          branchShapeSpacingSlider?.value ?? DEFAULT_SETTINGS.branchShapeSpacing,
      branchShapeColor:            branchShapeColorEl?.value || '#aaaaaa',
      branchShapeColourBy:         branchShapeColourByEl?.value || 'user_colour',
      branchShapeCountBy:          branchShapeCountByEl?.value || '',
      branchShapeHalo:             branchShapeHaloSlider?.value ?? DEFAULT_SETTINGS.branchShapeHalo,
      branchShapeHaloColor:        branchShapeHaloColorEl?.value || '#02292e',
      branchShapesExtra:           branchShapeExtraEls.map(e => e?.value || 'off'),
      branchShapesExtraColors:     branchShapeExtraColors.map(e => e?.value || '#aaaaaa'),
      branchShapesExtraColourBys:  branchShapeExtraColourBys.map(e => e?.value || 'user_colour'),
      branchShapesExtraCountBys:   branchShapeExtraCountBys.map(e => e?.value || ''),
      nodeLabelAnnotation: nodeLabelShowEl.value,
      nodeLabelPosition:   nodeLabelPositionEl.value,
      nodeLabelFontSize:   nodeLabelFontSizeSlider.value,
      nodeLabelColor:      nodeLabelColorEl.value,
      nodeLabelSpacing:    nodeLabelSpacingSlider.value,
      nodeLabelColourBy:   nodeLabelColourBy.value,
      nodeLabelDecimalPlaces: nodeLabelDpEl.value !== '' ? parseInt(nodeLabelDpEl.value) : null,
      branchLabelAnnotation: branchLabelShowEl.value,
      branchLabelPosition:   branchLabelPositionEl.value,
      branchLabelFontSize:   branchLabelFontSizeSlider.value,
      branchLabelColor:      branchLabelColorEl.value,
      branchLabelSpacing:    branchLabelSpacingSlider.value,
      branchLabelColourBy:   branchLabelColourBy.value,
      branchLabelDecimalPlaces: branchLabelDpEl.value !== '' ? parseInt(branchLabelDpEl.value) : null,
      mode:             renderer ? renderer._mode : 'nodes',
      dataTableOpen:       dataTableRenderer?.isOpen()   ?? false,
      dataTablePinned:     dataTableRenderer?.isPinned() ?? false,
      rttOpen:             rttChart?.isOpen()    ?? false,
      rttPinned:           rttChart?.isPinned()  ?? false,
      rttPanelWidth:       rttChart?.getPanelWidth() ?? null,
      rttStatsBoxCorner:   rttChart?.getStatsBoxCorner() ?? 'tl',
      paletteOpen:         !!root.querySelector('#palette-panel')?.classList.contains('open'),
      palettePinned:       !!root.querySelector('#palette-panel')?.classList.contains('pinned'),
      cladeHighlightLeftEdge:      cladeHighlightLeftEdgeEl?.value         ?? DEFAULT_SETTINGS.cladeHighlightLeftEdge,
      cladeHighlightRightEdge:     cladeHighlightRightEdgeEl?.value        ?? DEFAULT_SETTINGS.cladeHighlightRightEdge,
      cladeHighlightPadding:       cladeHighlightPaddingSlider?.value      ?? DEFAULT_SETTINGS.cladeHighlightPadding,
      cladeHighlightRadius:        cladeHighlightRadiusSlider?.value       ?? DEFAULT_SETTINGS.cladeHighlightRadius,
      cladeHighlightStrokeWidth:   cladeHighlightStrokeWidthSlider?.value  ?? '1',
      cladeHighlightFillOpacity:   cladeHighlightFillOpacitySlider?.value  ?? '0.15',
      cladeHighlightStrokeOpacity: cladeHighlightStrokeOpacitySlider?.value ?? '0.7',
      cladeHighlightColour:        cladeHighlightDefaultColourEl?.value    ?? '#ffaa00',
      cladeHighlights:             renderer?.getCladeHighlightsData() ?? [],
      filters:                     filterManager ? JSON.stringify([...filterManager.getAll().values()]) : '[]',
      nodeBarsFilter:              nodeBarsFilterEl?.value     || null,
      nodeLabelsFilter:            nodeLabelsFilterEl?.value   || null,
      branchLabelsFilter:          branchLabelsFilterEl?.value || null,
      branchShapesFilter:          branchShapesFilterEl?.value || null,
      tipLabelsFilter:             tipLabelsFilterEl?.value    || null,
      nodeShapesFilter:            nodeShapesFilterEl?.value   || null,
      tipShapesFilter:             tipShapesFilterEl?.value    || null,
    };
  }

  // ── Theme CRUD: delegated to themeManager (created after applyTheme is defined) ──
  // These thin wrappers keep existing call-sites unchanged.
  function storeTheme()      { themeManager?.storeTheme(); }
  function setDefaultTheme() { themeManager?.setDefaultTheme(); }
  function removeTheme()     { themeManager?.removeTheme(); }
  function exportTheme()     { themeManager?.exportTheme(); }
  function importTheme()     { themeManager?.importTheme(); }
  function _syncThemeButtons() { themeManager?.syncButtons(); }

  function loadSettings() {
    if (_cfg.storageKey === null) return {};
    try { return JSON.parse(localStorage.getItem(_cfg.storageKey) || '{}'); }
    catch { return {}; }
  }

  /**
   * Populate a style <select> element with the available styles for a given typeface key.
   * @param {string} typefaceKey  - key in TYPEFACES (or 'theme')
   * @param {HTMLSelectElement} styleSelectEl
   * @param {string} [currentStyle] - value to pre-select (if present)
   * @param {boolean} [includeTheme=false] - whether to add a leading "Theme" / "" option
   */
  function _populateStyleSelect(typefaceKey, styleSelectEl, currentStyle, includeTheme = false) {
    if (!styleSelectEl) return;
    const effectiveKey = (typefaceKey === 'theme' || !typefaceKey) ? fontFamilyEl.value : typefaceKey;
    const tf = TYPEFACES[effectiveKey];
    const styles = tf ? Object.keys(tf.styles) : ['Regular'];
    styleSelectEl.innerHTML = '';
    if (includeTheme) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Theme';
      styleSelectEl.appendChild(opt);
    }
    for (const s of styles) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      styleSelectEl.appendChild(opt);
    }
    if (currentStyle && styles.includes(currentStyle)) {
      styleSelectEl.value = currentStyle;
    } else if (!includeTheme && tf?.defaultStyle) {
      styleSelectEl.value = tf.defaultStyle;
    }
  }

  function saveSettings() {
    if (_cfg.storageKey === null) return;
    localStorage.setItem(_cfg.storageKey, JSON.stringify(_buildSnapshot()));
  }

  /**
   * Resolve the effective typeface key and style for any sub-element select pair.
   * An empty value ('') in either select means "follow the main theme".
   * @returns {{ key: string, style: string }}
   */
  function _resolveElementTypeface(typefaceEl, styleEl) {
    const key   = typefaceEl?.value  || fontFamilyEl.value;
    const style = styleEl?.value     || fontTypefaceStyleEl?.value || '';
    return { key, style };
  }

  /** Apply current axis typeface selection to axisRenderer. */
  function _applyAxisTypeface() {
    if (!axisRenderer) return;
    const { key, style } = _resolveElementTypeface(axisTypefaceEl, axisTypefaceStyleEl);
    axisRenderer.setTypeface(key, style || null);
  }

  /** Apply current legend typeface selection to legendRenderer (both legend canvases). */
  function _applyLegendTypeface() {
    if (!legendRenderer) return;
    const { key, style } = _resolveElementTypeface(legendTypefaceEl, legendTypefaceStyleEl);
    legendRenderer.setTypeface(key, style || null);
    if (typeof legend2Renderer !== 'undefined' && legend2Renderer) {
      legend2Renderer.setTypeface(key, style || null);
    }
  }



  /**
   * Apply the 13 visual (non-annotation) settings from a plain object directly
   * to DOM controls and the renderer.  Does NOT call saveSettings().
   * Annotation-dependent fields (colourBy, legend, axis date) are handled
   * separately in loadTree after dropdowns are populated.
   */
  function _applyVisualSettingsFromFile(s) {
    if (!s) return;
    if (s.canvasBgColor) { canvasBgColorEl.value = s.canvasBgColor; _syncCanvasWrapperBg(s.canvasBgColor); }
    if (s.branchColor)          branchColorEl.value      = s.branchColor;
    if (s.branchWidth    != null) {
      branchWidthSlider.value = s.branchWidth;
      $('branch-width-value').textContent = s.branchWidth;
    }
    if (s.tipLabelFontSize != null) {
      fontSlider.value = s.tipLabelFontSize;
      $('font-size-value').textContent = s.tipLabelFontSize;
    }
    if (s.typeface)              fontFamilyEl.value       = s.typeface;
    if (fontTypefaceStyleEl) {
      _populateStyleSelect(fontFamilyEl.value, fontTypefaceStyleEl, s.typefaceStyle);
    }
    if (tipLabelTypefaceEl && s.tipLabelTypefaceKey)   tipLabelTypefaceEl.value = s.tipLabelTypefaceKey;
    if (typefaceStyleEl) {
      _populateStyleSelect(tipLabelTypefaceEl?.value || fontFamilyEl.value, typefaceStyleEl, s.tipLabelTypefaceStyle, true);
    }
    if (nodeLabelTypefaceEl && s.nodeLabelTypefaceKey)   nodeLabelTypefaceEl.value = s.nodeLabelTypefaceKey;
    if (nodeLabelTypefaceStyleEl) {
      _populateStyleSelect(nodeLabelTypefaceEl?.value || fontFamilyEl.value, nodeLabelTypefaceStyleEl, s.nodeLabelTypefaceStyle, true);
    }
    if (branchLabelTypefaceEl && s.branchLabelTypefaceKey) branchLabelTypefaceEl.value = s.branchLabelTypefaceKey;
    if (branchLabelTypefaceStyleEl) {
      _populateStyleSelect(branchLabelTypefaceEl?.value || fontFamilyEl.value, branchLabelTypefaceStyleEl, s.branchLabelTypefaceStyle, true);
    }
    if (collapsedCladeTypefaceEl && s.collapsedCladeTypefaceKey) collapsedCladeTypefaceEl.value = s.collapsedCladeTypefaceKey;
    if (collapsedCladeTypefaceStyleEl) {
      _populateStyleSelect(collapsedCladeTypefaceEl?.value || fontFamilyEl.value, collapsedCladeTypefaceStyleEl, s.collapsedCladeTypefaceStyle, true);
    }
    if (legendTypefaceStyleEl) {
      _populateStyleSelect(legendTypefaceEl?.value || fontFamilyEl.value, legendTypefaceStyleEl, s.legendTypefaceStyle ?? s.legendFontStyle, true);
    }
    if (axisTypefaceStyleEl) {
      _populateStyleSelect(axisTypefaceEl?.value || fontFamilyEl.value, axisTypefaceStyleEl, s.axisTypefaceStyle, true);
    }
    if (rttAxisTypefaceStyleEl) {
      _populateStyleSelect(rttAxisFontFamilyEl?.value || fontFamilyEl.value, rttAxisTypefaceStyleEl, s.rttAxisTypefaceStyle, true);
    }
    if (s.tipLabelColor)         labelColorEl.value       = s.tipLabelColor;
    if (s.selectedLabelStyle)    selectedLabelStyleEl.value = s.selectedLabelStyle;
    if (s.selectedTipStrokeColor)     selectedTipStrokeEl.value  = s.selectedTipStrokeColor;
    if (s.selectedNodeStrokeColor)         selectedNodeStrokeEl.value      = s.selectedNodeStrokeColor;
    if (s.tipHoverFillColor)         tipHoverFillEl.value      = s.tipHoverFillColor;
    if (s.nodeHoverFillColor)    nodeHoverFillEl.value = s.nodeHoverFillColor;
    if (s.selectedTipFillColor)  selectedTipFillEl.value = s.selectedTipFillColor;
    if (s.selectedTipGrowthFactor != null) {
      selectedTipGrowthFactorValue = parseFloat(s.selectedTipGrowthFactor);
    }
    if (s.selectedTipGrowth != null) {
      selectedTipGrowthSlider.value = s.selectedTipGrowth;
      $('selected-tip-growth-value').textContent = s.selectedTipGrowth;
    }
    if (s.selectedTipMinSize != null) {
      selectedTipMinSizeSlider.value = s.selectedTipMinSize;
      $('selected-tip-min-size-value').textContent = s.selectedTipMinSize;
    }
    if (s.selectedTipFillOpacity != null) {
      selectedTipFillOpacitySlider.value = s.selectedTipFillOpacity;
      $('selected-tip-fill-opacity-value').textContent = s.selectedTipFillOpacity;
    }
    if (s.selectedTipStrokeWidth != null) {
      selectedTipStrokeWidthSlider.value = s.selectedTipStrokeWidth;
      $('selected-tip-stroke-width-value').textContent = s.selectedTipStrokeWidth;
    }
    if (s.selectedTipStrokeOpacity != null) {
      selectedTipStrokeOpacitySlider.value = s.selectedTipStrokeOpacity;
      $('selected-tip-stroke-opacity-value').textContent = s.selectedTipStrokeOpacity;
    }
    if (s.selectedNodeFillColor) selectedNodeFillEl.value = s.selectedNodeFillColor;
    if (s.selectedNodeGrowthFactor != null) {
      selectedNodeGrowthFactorValue = parseFloat(s.selectedNodeGrowthFactor);
    }
    if (s.selectedNodeGrowth != null) {
      selectedNodeGrowthSlider.value = s.selectedNodeGrowth;
      $('selected-node-growth-value').textContent = s.selectedNodeGrowth;
    }
    if (s.selectedNodeMinSize != null) {
      selectedNodeMinSizeSlider.value = s.selectedNodeMinSize;
      $('selected-node-min-size-value').textContent = s.selectedNodeMinSize;
    }
    if (s.selectedNodeFillOpacity != null) {
      selectedNodeFillOpacitySlider.value = s.selectedNodeFillOpacity;
      $('selected-node-fill-opacity-value').textContent = s.selectedNodeFillOpacity;
    }
    if (s.selectedNodeStrokeWidth != null) {
      selectedNodeStrokeWidthSlider.value = s.selectedNodeStrokeWidth;
      $('selected-node-stroke-width-value').textContent = s.selectedNodeStrokeWidth;
    }
    if (s.selectedNodeStrokeOpacity != null) {
      selectedNodeStrokeOpacitySlider.value = s.selectedNodeStrokeOpacity;
      $('selected-node-stroke-opacity-value').textContent = s.selectedNodeStrokeOpacity;
    }
    if (s.tipHoverStrokeColor)   tipHoverStrokeEl.value = s.tipHoverStrokeColor;
    if (s.tipHoverGrowthFactor != null) {
      tipHoverGrowthFactorValue = parseFloat(s.tipHoverGrowthFactor);
    }
    if (s.tipHoverGrowth != null) {
      tipHoverGrowthSlider.value = s.tipHoverGrowth;
      $('tip-hover-growth-value').textContent = s.tipHoverGrowth;
    }
    if (s.tipHoverMinSize != null) {
      tipHoverMinSizeSlider.value = s.tipHoverMinSize;
      $('tip-hover-min-size-value').textContent = s.tipHoverMinSize;
    }
    if (s.tipHoverFillOpacity != null) {
      tipHoverFillOpacitySlider.value = s.tipHoverFillOpacity;
      $('tip-hover-fill-opacity-value').textContent = s.tipHoverFillOpacity;
    }
    if (s.tipHoverStrokeWidth != null) {
      tipHoverStrokeWidthSlider.value = s.tipHoverStrokeWidth;
      $('tip-hover-stroke-width-value').textContent = s.tipHoverStrokeWidth;
    }
    if (s.tipHoverStrokeOpacity != null) {
      tipHoverStrokeOpacitySlider.value = s.tipHoverStrokeOpacity;
      $('tip-hover-stroke-opacity-value').textContent = s.tipHoverStrokeOpacity;
    }
    if (s.nodeHoverStrokeColor)  nodeHoverStrokeEl.value = s.nodeHoverStrokeColor;
    if (s.nodeHoverGrowthFactor != null) {
      nodeHoverGrowthFactorValue = parseFloat(s.nodeHoverGrowthFactor);
    }
    if (s.nodeHoverGrowth != null) {
      nodeHoverGrowthSlider.value = s.nodeHoverGrowth;
      $('node-hover-growth-value').textContent = s.nodeHoverGrowth;
    }
    if (s.nodeHoverMinSize != null) {
      nodeHoverMinSizeSlider.value = s.nodeHoverMinSize;
      $('node-hover-min-size-value').textContent = s.nodeHoverMinSize;
    }
    if (s.nodeHoverFillOpacity != null) {
      nodeHoverFillOpacitySlider.value = s.nodeHoverFillOpacity;
      $('node-hover-fill-opacity-value').textContent = s.nodeHoverFillOpacity;
    }
    if (s.nodeHoverStrokeWidth != null) {
      nodeHoverStrokeWidthSlider.value = s.nodeHoverStrokeWidth;
      $('node-hover-stroke-width-value').textContent = s.nodeHoverStrokeWidth;
    }
    if (s.nodeHoverStrokeOpacity != null) {
      nodeHoverStrokeOpacitySlider.value = s.nodeHoverStrokeOpacity;
      $('node-hover-stroke-opacity-value').textContent = s.nodeHoverStrokeOpacity;
    }
    if (s.tipShapeSize   != null) {
      tipSlider.value = s.tipShapeSize;
      $('tip-size-value').textContent = s.tipShapeSize;
    }
    if (s.tipShapeHaloSize != null) {
      tipHaloSlider.value = s.tipShapeHaloSize;
      $('tip-halo-value').textContent = s.tipShapeHaloSize;
    }
    if (s.tipShapeColor)         tipShapeColorEl.value    = s.tipShapeColor;
    if (s.tipShapeBgColor)       tipShapeBgEl.value       = s.tipShapeBgColor;
    if (s.tipLabelShape)         tipLabelShapeEl.value      = s.tipLabelShape;
    if (s.tipLabelShapeColor)    tipLabelShapeColorEl.value = s.tipLabelShapeColor;
    if (s.tipLabelShapeMarginLeft != null) {
      tipLabelShapeMarginLeftSlider.value = s.tipLabelShapeMarginLeft;
      $('tip-label-shape-margin-left-value').textContent = s.tipLabelShapeMarginLeft;
    }
    if (s.tipLabelShapeSpacing != null) {
      tipLabelShapeSpacingSlider.value = s.tipLabelShapeSpacing;
      $('tip-label-shape-spacing-value').textContent = s.tipLabelShapeSpacing;
    }
    if (s.tipLabelShapeSize != null) {
      tipLabelShapeSizeSlider.value = s.tipLabelShapeSize;
      $('tip-label-shape-size-value').textContent = s.tipLabelShapeSize;
    }
    // Extra shapes 2–10 (new array format + backward compat for old tipLabelShape2 key)
    if (Array.isArray(s.tipLabelShapesExtra)) {
      s.tipLabelShapesExtra.forEach((v, i) => { if (tipLabelShapeExtraEls[i]) tipLabelShapeExtraEls[i].value = v; });
    } else if (s.tipLabelShape2) {
      // Backward compat: old single-shape-2 setting
      tipLabelShapeExtraEls[0].value = s.tipLabelShape2;
    }
    if (Array.isArray(s.tipLabelShapeExtraColourBys)) {
      s.tipLabelShapeExtraColourBys.forEach((v, i) => { if (tipLabelShapeExtraColourBys[i]) tipLabelShapeExtraColourBys[i].value = v; });
    }
    if (branchShapeEl && s.branchShape) branchShapeEl.value = s.branchShape;
    if (branchShapeHeightSlider && s.branchShapeHeightPct != null) {
      branchShapeHeightSlider.value = s.branchShapeHeightPct;
      $('branch-shape-height-value').textContent = s.branchShapeHeightPct;
    }
    if (branchShapeWidthSlider && s.branchShapeWidth != null) {
      branchShapeWidthSlider.value = _branchShapeWidthToSlider(s.branchShapeWidth);
      $('branch-shape-width-value').textContent = _formatBranchShapeWidth(s.branchShapeWidth);
    }
    if (branchShapeAlignEl && s.branchShapeAlign) branchShapeAlignEl.value = s.branchShapeAlign;
    if (branchShapeSpacingSlider && s.branchShapeSpacing != null) {
      branchShapeSpacingSlider.value = s.branchShapeSpacing;
      $('branch-shape-spacing-value').textContent = s.branchShapeSpacing;
    }
    if (branchShapeColorEl && s.branchShapeColor) branchShapeColorEl.value = s.branchShapeColor;
    if (branchShapeColourByEl && s.branchShapeColourBy) branchShapeColourByEl.value = s.branchShapeColourBy;
    if (branchShapeCountByEl && s.branchShapeCountBy != null) branchShapeCountByEl.value = s.branchShapeCountBy;
    if (branchShapeHaloSlider && s.branchShapeHalo != null) {
      branchShapeHaloSlider.value = s.branchShapeHalo;
      $('branch-shape-halo-value').textContent = s.branchShapeHalo;
    }
    if (branchShapeHaloColorEl && s.branchShapeHaloColor) branchShapeHaloColorEl.value = s.branchShapeHaloColor;
    if (Array.isArray(s.branchShapesExtra)) {
      s.branchShapesExtra.forEach((v, i) => { if (branchShapeExtraEls[i]) branchShapeExtraEls[i].value = v; });
    }
    if (Array.isArray(s.branchShapesExtraColors)) {
      s.branchShapesExtraColors.forEach((v, i) => { if (branchShapeExtraColors[i] && v) branchShapeExtraColors[i].value = v; });
    }
    if (Array.isArray(s.branchShapesExtraColourBys)) {
      s.branchShapesExtraColourBys.forEach((v, i) => { if (branchShapeExtraColourBys[i]) branchShapeExtraColourBys[i].value = v; });
    }
    if (Array.isArray(s.branchShapesExtraCountBys)) {
      s.branchShapesExtraCountBys.forEach((v, i) => { if (branchShapeExtraCountBys[i]) branchShapeExtraCountBys[i].value = v; });
    }
    if (s.nodeShapeSize  != null) {
      nodeSlider.value = s.nodeShapeSize;
      $('node-size-value').textContent = s.nodeShapeSize;
    }
    if (s.nodeShapeHaloSize != null) {
      nodeHaloSlider.value = s.nodeShapeHaloSize;
      $('node-halo-value').textContent = s.nodeShapeHaloSize;
    }
    if (s.nodeShapeColor)        nodeShapeColorEl.value   = s.nodeShapeColor;
    if (s.nodeShapeBgColor)      nodeShapeBgEl.value      = s.nodeShapeBgColor;
    // Axis non-annotation settings
    if (s.axisShow) axisShowEl.value = (s.axisShow === 'on') ? 'forward' : s.axisShow;
    if (s.axisDateFormat)        axisDateFmtEl.value       = s.axisDateFormat;
    if (s.axisMajorInterval)     axisMajorIntervalEl.value = s.axisMajorInterval;
    if (s.axisMinorInterval)     axisMinorIntervalEl.value = s.axisMinorInterval;
    if (s.axisMajorLabelFormat)  axisMajorLabelEl.value   = s.axisMajorLabelFormat;
    if (s.axisMinorLabelFormat)  axisMinorLabelEl.value   = s.axisMinorLabelFormat;
    if (s.axisColor)             axisColorEl.value        = s.axisColor;
    if (s.axisTypefaceKey)        axisTypefaceEl.value   = s.axisTypefaceKey;
    if (axisTypefaceStyleEl) {
      _populateStyleSelect(axisTypefaceEl?.value || fontFamilyEl.value, axisTypefaceStyleEl, s.axisTypefaceStyle, true);
    }
    // RTT chart appearance — these are theme keys set by applyTheme(); must be
    // re-applied here so that saved/init values win over the theme defaults.
    if (s.rttStatsFontSize != null) { rttStatsFontSizeSlider.value = s.rttStatsFontSize; $('rtt-stats-font-size-value').textContent = s.rttStatsFontSize; }
    if (s.rttAxisFontSize  != null) { rttAxisFontSizeSlider.value  = s.rttAxisFontSize;  $('rtt-axis-font-size-value').textContent  = s.rttAxisFontSize;  }
    if (s.rttAxisLineWidth != null) { rttAxisLineWidthSlider.value = s.rttAxisLineWidth; $('rtt-axis-line-width-value').textContent = s.rttAxisLineWidth; }
    if (s.rttRegressionStyle) rttRegressionStyleEl.value = s.rttRegressionStyle;
    if (s.rttRegressionWidth != null) { rttRegressionWidthSlider.value = s.rttRegressionWidth; $('rtt-regression-width-value').textContent = s.rttRegressionWidth; }
    if (s.rttResidBandColor)       rttResidBandColorEl.value       = s.rttResidBandColor;
    if (s.rttResidBandFillColor)   rttResidBandFillColorEl.value   = s.rttResidBandFillColor;
    if (s.rttResidBandStyle)       rttResidBandStyleEl.value       = s.rttResidBandStyle;
    if (s.rttResidBandWidth      != null) { rttResidBandWidthSlider.value       = s.rttResidBandWidth;       $('rtt-resid-band-width-value').textContent       = s.rttResidBandWidth; }
    if (s.rttResidBandFillOpacity != null) { rttResidBandFillOpacitySlider.value = s.rttResidBandFillOpacity; $('rtt-resid-band-fill-opacity-value').textContent = s.rttResidBandFillOpacity; }
    if (s.legendTextColor) legendTextColorEl.value = s.legendTextColor;
    if (s.legendFontSize != null) {
      legendFontSizeSlider.value = s.legendFontSize;
      $('legend-font-size-value').textContent = s.legendFontSize;
    }
    if (s.legendSpacing != null) {
      legendSpacingSlider.value = s.legendSpacing;
      $('legend-spacing-value').textContent = s.legendSpacing;
    }
    if (s.legendHeightPct != null) {
      legendHeightPctSlider.value = s.legendHeightPct;
      $('legend-height-pct-value').textContent = s.legendHeightPct + '%';
    }
    if (s.legendDecimalPlaces != null && legendDpEl) legendDpEl.value = String(s.legendDecimalPlaces);
    if (s.legendTypefaceKey)     legendTypefaceEl.value = s.legendTypefaceKey;
    else if (s.legendFontFamily) legendTypefaceEl.value = s.legendFontFamily; // bwc
    if (legendTypefaceStyleEl) {
      _populateStyleSelect(legendTypefaceEl?.value || fontFamilyEl.value, legendTypefaceStyleEl, s.legendTypefaceStyle ?? s.legendFontStyle, true);
    }
    if (s.legend2Position)        legend2ShowEl.value      = s.legend2Position;
    if (s.legendHeightPct2 != null) {
      legend2HeightPctSlider.value = s.legendHeightPct2;
      $('legend2-height-pct-value').textContent = s.legendHeightPct2 + '%';
    }
    if (s.legendDecimalPlaces2 != null && legend2DpEl) legend2DpEl.value = String(s.legendDecimalPlaces2);
    if (s.legend3Position)        legend3ShowEl.value      = s.legend3Position;
    if (s.legendHeightPct3 != null) {
      legend3HeightPctSlider.value = s.legendHeightPct3;
      $('legend3-height-pct-value').textContent = s.legendHeightPct3 + '%';
    }
    if (s.legendDecimalPlaces3 != null && legend3DpEl) legend3DpEl.value = String(s.legendDecimalPlaces3);
    if (s.legend4Position)        legend4ShowEl.value      = s.legend4Position;
    if (s.legendHeightPct4 != null) {
      legend4HeightPctSlider.value = s.legendHeightPct4;
      $('legend4-height-pct-value').textContent = s.legendHeightPct4 + '%';
    }
    if (s.legendDecimalPlaces4 != null && legend4DpEl) legend4DpEl.value = String(s.legendDecimalPlaces4);
    // Note: legendAnnotation2/3/4 are annotation-dependent and restored later in loadTree.
    // Node bars settings
    if (s.nodeBarsEnabled)  nodeBarsShowEl.value  = s.nodeBarsEnabled;
    if (Array.isArray(s.nodeBarsExtraEnabled)) {
      nodeBarsExtraShowEls.forEach((el, i) => {
        if (el && s.nodeBarsExtraEnabled[i]) el.value = s.nodeBarsExtraEnabled[i];
      });
    }
    if (s.nodeBarsClipTo) nodeBarsClipToEl.value = s.nodeBarsClipTo;
    if (Array.isArray(s.nodeBarsExtraClipTo)) {
      nodeBarsExtraClipToEls.forEach((el, i) => {
        if (el && s.nodeBarsExtraClipTo[i]) el.value = s.nodeBarsExtraClipTo[i];
      });
    }
    if (s.nodeBarsColor)    nodeBarsColorEl.value = s.nodeBarsColor;
    if (Array.isArray(s.nodeBarsExtraColors)) {
      nodeBarsExtraColorEls.forEach((el, i) => {
        if (el && s.nodeBarsExtraColors[i]) el.value = s.nodeBarsExtraColors[i];
      });
    }
    if (s.nodeBarsWidth != null) {
      nodeBarsWidthSlider.value = s.nodeBarsWidth;
      $('node-bars-width-value').textContent = s.nodeBarsWidth;
    }
    if (Array.isArray(s.nodeBarsExtraWidths)) {
      nodeBarsExtraWidthSliders.forEach((el, i) => {
        const v = s.nodeBarsExtraWidths[i];
        if (el && v != null) {
          el.value = v;
          const out = $(`node-bars-${i + 2}-width-value`);
          if (out) out.textContent = String(v);
        }
      });
    }
    if (s.nodeBarsFillOpacity != null) {
      nodeBarsFillOpacitySlider.value = s.nodeBarsFillOpacity;
      $('node-bars-fill-opacity-value').textContent = s.nodeBarsFillOpacity;
    }
    if (Array.isArray(s.nodeBarsExtraFillOpacities)) {
      nodeBarsExtraFillOpacitySliders.forEach((el, i) => {
        const v = s.nodeBarsExtraFillOpacities[i];
        if (el && v != null) {
          el.value = v;
          const out = $(`node-bars-${i + 2}-fill-opacity-value`);
          if (out) out.textContent = String(v);
        }
      });
    }
    if (s.nodeBarsStrokeOpacity != null) {
      nodeBarsStrokeOpacitySlider.value = s.nodeBarsStrokeOpacity;
      $('node-bars-stroke-opacity-value').textContent = s.nodeBarsStrokeOpacity;
    }
    if (Array.isArray(s.nodeBarsExtraStrokeOpacities)) {
      nodeBarsExtraStrokeOpacitySliders.forEach((el, i) => {
        const v = s.nodeBarsExtraStrokeOpacities[i];
        if (el && v != null) {
          el.value = v;
          const out = $(`node-bars-${i + 2}-stroke-opacity-value`);
          if (out) out.textContent = String(v);
        }
      });
    }
    if (s.nodeBarsLine) nodeBarsLineEl.value = s.nodeBarsLine;
    if (s.nodeBarsRange)  nodeBarsRangeEl.value  = s.nodeBarsRange;
    if (s.collapsedCladeOpacity != null) {
      collapsedOpacitySlider.value = s.collapsedCladeOpacity;
      $('collapsed-opacity-value').textContent = s.collapsedCladeOpacity;
    }
    if (s.collapsedCladeStrokeWidth != null) {
      collapsedStrokeWidthSlider.value = s.collapsedCladeStrokeWidth;
      $('collapsed-stroke-width-value').textContent = s.collapsedCladeStrokeWidth;
    }
    if (s.collapsedCladeStrokeOpacity != null) {
      collapsedStrokeOpacitySlider.value = s.collapsedCladeStrokeOpacity;
      $('collapsed-stroke-opacity-value').textContent = s.collapsedCladeStrokeOpacity;
    }
    if (s.collapsedCladeHeightN != null) {
      collapsedHeightNSlider.value = s.collapsedCladeHeightN;
      $('collapsed-height-n-value').textContent = s.collapsedCladeHeightN;
    }
    if (s.collapsedCladeFontSize != null) {
      collapsedCladeFontSizeSlider.value = s.collapsedCladeFontSize;
      $('collapsed-clade-font-size-value').textContent = s.collapsedCladeFontSize;
    }
    if (s.rootStemPct != null) {
      rootStemPctSlider.value = s.rootStemPct;
      $('root-stem-pct-value').textContent = s.rootStemPct + '%';
    }
    // Node label settings (annotation-dependent: nodeLabelAnnotation is applied later in loadTree)
    if (s.nodeLabelPosition)  nodeLabelPositionEl.value   = s.nodeLabelPosition;
    if (s.nodeLabelFontSize != null) {
      nodeLabelFontSizeSlider.value = s.nodeLabelFontSize;
      $('node-label-font-size-value').textContent = s.nodeLabelFontSize;
    }
    if (s.nodeLabelColor)     nodeLabelColorEl.value      = s.nodeLabelColor;
    if (s.nodeLabelSpacing != null) {
      nodeLabelSpacingSlider.value = s.nodeLabelSpacing;
      $('node-label-spacing-value').textContent = s.nodeLabelSpacing;
    }
    if (s.tipLabelSpacing != null) {
      tipLabelSpacingSlider.value = s.tipLabelSpacing;
      $('tip-label-spacing-value').textContent = s.tipLabelSpacing;
    }
    if (Array.isArray(s.tipLabelsExtra)) {
      [tipLabel2ShowEl, tipLabel3ShowEl, tipLabel4ShowEl].forEach((el, i) => {
        if (el && s.tipLabelsExtra[i]) el.value = s.tipLabelsExtra[i];
      });
    }
    if (Array.isArray(s.tipLabelsExtraLayouts)) {
      [tipLabel2LayoutEl, tipLabel3LayoutEl, tipLabel4LayoutEl].forEach((el, i) => {
        if (el && s.tipLabelsExtraLayouts[i]) el.value = s.tipLabelsExtraLayouts[i];
      });
    }
    if (s.tipLabelDecimalPlaces  != null && tipLabelDpEl)  tipLabelDpEl.value  = String(s.tipLabelDecimalPlaces);
    if (s.nodeLabelDecimalPlaces != null && nodeLabelDpEl) nodeLabelDpEl.value = String(s.nodeLabelDecimalPlaces);
    if (s.branchLabelPosition)    branchLabelPositionEl.value   = s.branchLabelPosition;
    if (s.branchLabelFontSize != null) {
      branchLabelFontSizeSlider.value = s.branchLabelFontSize;
      $('branch-label-font-size-value').textContent = s.branchLabelFontSize;
    }
    if (s.branchLabelColor)     branchLabelColorEl.value      = s.branchLabelColor;
    if (s.branchLabelSpacing != null) {
      branchLabelSpacingSlider.value = s.branchLabelSpacing;
      $('branch-label-spacing-value').textContent = s.branchLabelSpacing;
    }
    if (s.branchLabelDecimalPlaces != null && branchLabelDpEl) branchLabelDpEl.value = String(s.branchLabelDecimalPlaces);
    if (s.paintColour) paintColourPickerEl.value = s.paintColour;
    // Set themeSelect to the stored theme name (or 'custom' if not known).
    const themeName = s.theme && themeManager.registry.has(s.theme) ? s.theme : (s.theme === 'custom' ? 'custom' : 'custom');
    if (themeSelect) themeSelect.value = themeName;
    _syncThemeButtons();
    if (renderer) {
      renderer.setSettings(_buildRendererSettings());
      if (s.axisColor) axisRenderer.setColor(s.axisColor);
    }
    // Restore per-mode axis ranges (tree-only settings — not stored in localStorage).
    // Reset to defaults first, then override with any values from the file.
    _axisRangeByMode = {
      time:    { left: '',  right: '' },
      forward: { left: '0', right: '' },
      reverse: { left: '',  right: '0' },
    };
    if (s.axisRangeTimeLeft     != null) _axisRangeByMode.time.left     = s.axisRangeTimeLeft;
    if (s.axisRangeTimeRight    != null) _axisRangeByMode.time.right    = s.axisRangeTimeRight;
    if (s.axisRangeForwardLeft  != null) _axisRangeByMode.forward.left  = s.axisRangeForwardLeft;
    if (s.axisRangeForwardRight != null) _axisRangeByMode.forward.right = s.axisRangeForwardRight;
    if (s.axisRangeReverseLeft  != null) _axisRangeByMode.reverse.left  = s.axisRangeReverseLeft;
    if (s.axisRangeReverseRight != null) _axisRangeByMode.reverse.right = s.axisRangeReverseRight;
    // Populate range inputs for the current mode (tree params not yet set — don't apply)
    const _rangeMode = axisShowEl.value;
    if (_rangeMode !== 'off') _loadAxisRangeForMode(_rangeMode);
    _prevAxisMode = _rangeMode !== 'off' ? _rangeMode : null;
    _syncControlVisibility();
  }

  async function applyDefaults() {
    if (!await showConfirmDialog('Reset settings', 'Reset all visual settings to their defaults?', { okLabel: 'Reset', cancelLabel: 'Cancel' })) return;

    // Apply the default theme (hydrates all visual DOM controls + renderer).
    applyTheme(themeManager.defaultTheme);

    // Reset colour-by dropdowns, legend, and axis controls.
    tipColourBy.value        = 'user_colour';
    nodeColourBy.value       = 'user_colour';
    if (branchColourBy) branchColourBy.value = 'user_colour';
    labelColourBy.value      = 'user_colour';
    tipLabelShow.value       = DEFAULT_SETTINGS.tipLabelShow;
    tipLabelControlsEl.style.display = '';
    tipLabelAlignEl.value    = DEFAULT_SETTINGS.tipLabelAlign;
    legendAnnotEl.value      = '';
    legend2AnnotEl.value     = '';
    legend2ShowEl.value      = DEFAULT_SETTINGS.legend2Position;
    legend2HeightPctSlider.value = DEFAULT_SETTINGS.legendHeightPct2;
    $('legend2-height-pct-value').textContent = DEFAULT_SETTINGS.legendHeightPct2 + '%';
    if (legend2DpEl) legend2DpEl.value = '';
    legend3AnnotEl.value     = '';
    legend3ShowEl.value      = DEFAULT_SETTINGS.legend3Position;
    legend3HeightPctSlider.value = DEFAULT_SETTINGS.legendHeightPct3;
    $('legend3-height-pct-value').textContent = DEFAULT_SETTINGS.legendHeightPct3 + '%';
    if (legend3DpEl) legend3DpEl.value = '';
    legend4AnnotEl.value     = '';
    legend4ShowEl.value      = DEFAULT_SETTINGS.legend4Position;
    legend4HeightPctSlider.value = DEFAULT_SETTINGS.legendHeightPct4;
    $('legend4-height-pct-value').textContent = DEFAULT_SETTINGS.legendHeightPct4 + '%';
    if (legendDpEl) legendDpEl.value = '';
    if (legend4DpEl) legend4DpEl.value = '';
    // legendTextColor is set by applyTheme(defaultTheme) above — do not override with a hardcoded default.
    axisShowEl.value         = DEFAULT_SETTINGS.axisShow;
    // Calibrate (axisDateAnnotation) is tree-specific / auto-set — not reset here.
    axisDateFmtRow.style.display = 'none';
    axisDateFmtEl.value      = DEFAULT_SETTINGS.axisDateFormat;
    _updateTimeOption();
    axisMajorIntervalEl.value    = DEFAULT_SETTINGS.axisMajorInterval;
    axisMinorIntervalEl.value    = DEFAULT_SETTINGS.axisMinorInterval;
    axisMajorLabelEl.value       = DEFAULT_SETTINGS.axisMajorLabelFormat;
    axisMinorLabelEl.value       = DEFAULT_SETTINGS.axisMinorLabelFormat;
    _updateMinorOptions(DEFAULT_SETTINGS.axisMajorInterval, DEFAULT_SETTINGS.axisMinorInterval);
    // RTT date/interval controls — visual RTT appearance is set by applyTheme(defaultTheme) above.
    rttXOriginEl.value       = DEFAULT_SETTINGS.rttXOrigin;
    rttGridLinesEl.value     = DEFAULT_SETTINGS.rttGridLines;
    rttAspectRatioEl.value   = DEFAULT_SETTINGS.rttAspectRatio;
    rttDateFmtEl.value       = DEFAULT_SETTINGS.rttDateFormat;
    rttResidBandShowEl.value = DEFAULT_SETTINGS.rttResidBandShow;
    rttMajorIntervalEl.value = DEFAULT_SETTINGS.rttMajorInterval;
    _updateRttMinorOptions(DEFAULT_SETTINGS.rttMajorInterval, DEFAULT_SETTINGS.rttMinorInterval);
    rttMajorLabelEl.value    = DEFAULT_SETTINGS.rttMajorLabelFormat;
    rttMinorLabelEl.value    = DEFAULT_SETTINGS.rttMinorLabelFormat;
    nodeBarsShowEl.value  = DEFAULT_SETTINGS.nodeBarsEnabled;
    nodeBarsExtraShowEls.forEach((el, i) => {
      if (el) el.value = DEFAULT_SETTINGS.nodeBarsExtraEnabled?.[i] ?? 'off';
    });
    if (nodeBarsClipToEl) nodeBarsClipToEl.value = DEFAULT_SETTINGS.nodeBarsClipTo ?? 'off';
    nodeBarsExtraClipToEls.forEach((el, i) => {
      if (el) el.value = DEFAULT_SETTINGS.nodeBarsExtraClipTo?.[i] ?? 'off';
    });
    nodeBarsLineEl.value = DEFAULT_SETTINGS.nodeBarsLine;
    nodeBarsRangeEl.value  = DEFAULT_SETTINGS.nodeBarsRange;
    nodeBarsExtraWidthSliders.forEach((el, i) => {
      const v = DEFAULT_SETTINGS.nodeBarsExtraWidths?.[i] ?? '6';
      if (el) el.value = v;
      const out = $(`node-bars-${i + 2}-width-value`);
      if (out) out.textContent = v;
    });
    nodeBarsExtraColorEls.forEach((el, i) => {
      if (el) el.value = DEFAULT_SETTINGS.nodeBarsExtraColors?.[i] ?? '#2aa198';
    });
    nodeBarsExtraFillOpacitySliders.forEach((el, i) => {
      const v = DEFAULT_SETTINGS.nodeBarsExtraFillOpacities?.[i] ?? '0.22';
      if (el) el.value = v;
      const out = $(`node-bars-${i + 2}-fill-opacity-value`);
      if (out) out.textContent = v;
    });
    nodeBarsExtraStrokeOpacitySliders.forEach((el, i) => {
      const v = DEFAULT_SETTINGS.nodeBarsExtraStrokeOpacities?.[i] ?? '0.55';
      if (el) el.value = v;
      const out = $(`node-bars-${i + 2}-stroke-opacity-value`);
      if (out) out.textContent = v;
    });
    cladeHighlightLeftEdgeEl.value  = DEFAULT_SETTINGS.cladeHighlightLeftEdge;
    cladeHighlightRightEdgeEl.value = DEFAULT_SETTINGS.cladeHighlightRightEdge;
    cladeHighlightPaddingSlider.value = DEFAULT_SETTINGS.cladeHighlightPadding;
    $('clade-highlight-padding-value').textContent = DEFAULT_SETTINGS.cladeHighlightPadding;
    cladeHighlightRadiusSlider.value  = DEFAULT_SETTINGS.cladeHighlightRadius;
    $('clade-highlight-radius-value').textContent  = DEFAULT_SETTINGS.cladeHighlightRadius;
    legendHeightPctSlider.value = DEFAULT_SETTINGS.legendHeightPct;
    $('legend-height-pct-value').textContent = DEFAULT_SETTINGS.legendHeightPct + '%';
    legendSpacingSlider.value = DEFAULT_SETTINGS.legendSpacing;
    $('legend-spacing-value').textContent = DEFAULT_SETTINGS.legendSpacing;
    rootStemPctSlider.value = DEFAULT_SETTINGS.rootStemPct ?? '0';
    $('root-stem-pct-value').textContent = (DEFAULT_SETTINGS.rootStemPct ?? '0') + '%';
    nodeLabelShowEl.value     = DEFAULT_SETTINGS.nodeLabelAnnotation;
    branchLabelShowEl.value   = DEFAULT_SETTINGS.branchLabelAnnotation;
    if (nodeLabelColourBy)   nodeLabelColourBy.value   = 'user_colour';
    if (branchLabelColourBy) branchLabelColourBy.value = 'user_colour';
    nodeLabelPositionEl.value = DEFAULT_SETTINGS.nodeLabelPosition;
    if (tipLabelTypefaceEl)            tipLabelTypefaceEl.value = '';
    _populateStyleSelect(fontFamilyEl.value, typefaceStyleEl, '', true);
    tipLabelSpacingSlider.value = DEFAULT_SETTINGS.tipLabelSpacing;
    $('tip-label-spacing-value').textContent = DEFAULT_SETTINGS.tipLabelSpacing;
    if (tipLabelDpEl)    tipLabelDpEl.value    = '';
    if (nodeLabelDpEl)   nodeLabelDpEl.value   = '';
    tipLabelShapeEl.value        = DEFAULT_SETTINGS.tipLabelShape;
    tipLabelShapeColorEl.value   = '#aaaaaa';
    tipLabelShapeColourBy.value  = 'user_colour';
    tipLabelShapeMarginLeftSlider.value  = DEFAULT_SETTINGS.tipLabelShapeMarginLeft;
    $('tip-label-shape-margin-left-value').textContent  = DEFAULT_SETTINGS.tipLabelShapeMarginLeft;
    tipLabelShapeSpacingSlider.value = DEFAULT_SETTINGS.tipLabelShapeSpacing;
    $('tip-label-shape-spacing-value').textContent = DEFAULT_SETTINGS.tipLabelShapeSpacing;
    tipLabelShapeSizeSlider.value = DEFAULT_SETTINGS.tipLabelShapeSize;
    $('tip-label-shape-size-value').textContent = DEFAULT_SETTINGS.tipLabelShapeSize;
    tipLabelShapeExtraEls.forEach(e => { e.value = 'off'; });
    tipLabelShapeExtraColourBys.forEach(e => { e.value = 'user_colour'; });
    if (branchShapeEl) branchShapeEl.value = DEFAULT_SETTINGS.branchShape;
    if (branchShapeHeightSlider) {
      branchShapeHeightSlider.value = DEFAULT_SETTINGS.branchShapeHeightPct;
      $('branch-shape-height-value').textContent = DEFAULT_SETTINGS.branchShapeHeightPct;
    }
    if (branchShapeWidthSlider) {
      branchShapeWidthSlider.value = _branchShapeWidthToSlider(DEFAULT_SETTINGS.branchShapeWidth);
      $('branch-shape-width-value').textContent = _formatBranchShapeWidth(DEFAULT_SETTINGS.branchShapeWidth);
    }
    if (branchShapeAlignEl) branchShapeAlignEl.value = DEFAULT_SETTINGS.branchShapeAlign;
    if (branchShapeSpacingSlider) {
      branchShapeSpacingSlider.value = DEFAULT_SETTINGS.branchShapeSpacing;
      $('branch-shape-spacing-value').textContent = DEFAULT_SETTINGS.branchShapeSpacing;
    }
    if (branchShapeColorEl) branchShapeColorEl.value = DEFAULT_SETTINGS.branchShapeColor;
    if (branchShapeColourByEl) branchShapeColourByEl.value = DEFAULT_SETTINGS.branchShapeColourBy;
    if (branchShapeCountByEl) branchShapeCountByEl.value = DEFAULT_SETTINGS.branchShapeCountBy;
    if (branchShapeHaloSlider) {
      branchShapeHaloSlider.value = DEFAULT_SETTINGS.branchShapeHalo;
      $('branch-shape-halo-value').textContent = DEFAULT_SETTINGS.branchShapeHalo;
    }
    if (branchShapeHaloColorEl) branchShapeHaloColorEl.value = DEFAULT_SETTINGS.branchShapeHaloColor;
    branchShapeExtraEls.forEach(e => { if (e) e.value = 'off'; });
    branchShapeExtraColors.forEach((e, i) => { if (e) e.value = DEFAULT_SETTINGS.branchShapesExtraColors?.[i] || '#aaaaaa'; });
    branchShapeExtraColourBys.forEach(e => { if (e) e.value = 'user_colour'; });
    branchShapeExtraCountBys.forEach(e => { if (e) e.value = ''; });

    if (renderer) {
      renderer.setTipColourBy('user_colour');
      renderer.setNodeColourBy('user_colour');
      renderer.setBranchColourBy('user_colour');
      renderer.setLabelColourBy('user_colour');
      renderer.setTipLabelShapeColourBy('user_colour');
      renderer.setNodeLabelColourBy(null);
      renderer.setBranchLabelColourBy(null);
      for (let i = 0; i < EXTRA_SHAPE_COUNT; i++) renderer.setTipLabelShapeExtraColourBy(i, null);
      _applyLegendTypeface();
      legendRenderer.setTextColor(legendTextColorEl.value);
      _applyAxisTypeface();
      renderer.setMode('nodes');
      renderer.setNodeLabelAnnotation(null);
      // Push all DOM state (including shape = 'off') to the renderer in one pass.
      renderer.setSettings(_buildRendererSettings());
      applyLegend();
      applyAxis();
      applyTickOptions();
      applyAxisStyle();
    }

    // Reset order + mode button states (if controls are already bound).
    currentOrder = null;
    $('btn-order-asc') ?.classList.remove('active');
    $('btn-order-desc')?.classList.remove('active');
    $('btn-mode-nodes')    ?.classList.toggle('active', true);
    $('btn-mode-branches') ?.classList.toggle('active', false);

    saveSettings();
  }

  /**
   * Build a fully-typed settings object for TreeRenderer from the current DOM
   * state.  Called whenever a theme is applied, a file's settings are loaded,
   * or the renderer is first created so there is a single source of truth for
   * what gets passed to the renderer.
   */
  // Hoisted so _buildRendererSettings (called before line 1094) can reference it safely.
  let calibration;
  // Hoisted so applyTheme (called before rttChart/dataTableRenderer are created) can safely
  // reference them in saveSettings() → _buildSnapshot() without hitting TDZ.
  let rttChart;
  let dataTableRenderer;
  const _sidePanelStack = createSidePanelStackManager({
    targetEl: document.documentElement,
    policy: 'accumulate',
  });

  /** Options object for computeLayoutFromGraph — centralised so every call site is consistent. */
  function _layoutOptions() {
    return {
      clampNegativeBranches: false,
      collapsedCladeHeightN: parseInt(collapsedHeightNSlider.value),
    };
  }

  const _isTipNameValue = (value) => value === 'name' || value === 'names';
  const _normalizeTipNameValue = (value) => _isTipNameValue(value) ? 'name' : value;

  // Embed listeners (instance-scoped): selection, visible tips, and hover states.
  const _selectionChangedListeners = new Set(); // { fn, annotationKey }
  const _visibleChangedListeners   = new Set(); // { fn, annotationKey }
  const _nodeHoverListeners        = new Set(); // { fn, annotationKey }
  const _tipHoverListeners         = new Set(); // { fn, annotationKey }

  function _postParentEmbedEvent(type, payload = {}) {
    if (window.parent === window) return;
    try { window.parent.postMessage({ type, ...payload }, '*'); } catch (_) {}
  }

  function _tipValueForListener(node, annotationKey = null) {
    if (!node) return null;
    if (!annotationKey || _isTipNameValue(annotationKey)) {
      return node.name ?? node.id;
    }
    return node.annotations?.[annotationKey] ?? null;
  }

  function _selectedTipNodes() {
    if (!renderer?.nodeMap || !renderer?._selectedTipIds) return [];
    const out = [];
    for (const id of renderer._selectedTipIds) {
      const n = renderer.nodeMap.get(id);
      if (n?.isTip) out.push(n);
    }
    return out;
  }

  function _applySelectionByValues(values, annotationKey = null) {
    if (!renderer?.nodeMap) return;

    const current = renderer._selectedTipIds ?? new Set();
    let next;
    if (values == null) {
      next = new Set();
    } else {
      const wanted = new Set(Array.isArray(values) ? values : [values]);
      next = new Set();
      for (const [id, n] of renderer.nodeMap) {
        if (!n?.isTip) continue;
        const v = _tipValueForListener(n, annotationKey);
        if (wanted.has(v)) next.add(id);
      }
    }

    if (current.size === next.size) {
      let same = true;
      for (const id of current) {
        if (!next.has(id)) { same = false; break; }
      }
      if (same) return false;
    }

    renderer._selectedTipIds = next;

    renderer._mrcaNodeId = null;
    renderer._updateMRCA();
    renderer._notifyStats();
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(renderer._selectedTipIds.size > 0);
    renderer._dirty = true;
    return true;
  }

  function _visibleTipNodes() {
    if (!renderer?.nodes) return [];
    return renderer.nodes.filter(n => n.isTip && !n.isCollapsed);
  }

  function _emitSelectionChanged() {
    const tips = _selectedTipNodes();
    const tipInfos = tips.map(n => _nodeInfoForListener(n));
    _postParentEmbedEvent('pt:selectionChanged', { tips: tipInfos });
    if (_selectionChangedListeners.size === 0) return;
    for (const l of _selectionChangedListeners) {
      try {
        l.fn(tips.map(n => _tipValueForListener(n, l.annotationKey)));
      } catch (_) { /* listener errors must not break app flow */ }
    }
  }

  function _emitVisibleChanged() {
    const tips = _visibleTipNodes();
    const tipInfos = tips.map(n => _nodeInfoForListener(n));
    _postParentEmbedEvent('pt:visibleChanged', { tips: tipInfos });
    if (_visibleChangedListeners.size === 0) return;
    for (const l of _visibleChangedListeners) {
      try {
        l.fn(tips.map(n => _tipValueForListener(n, l.annotationKey)));
      } catch (_) { /* listener errors must not break app flow */ }
    }
  }

  function _nodeInfoForListener(node) {
    if (!node) return null;
    return {
      id: node.id,
      origId: node.origId ?? node.id,
      name: node.name ?? null,
      parentId: node.parentId ?? null,
      isTip: !!node.isTip,
      isCollapsed: !!node.isCollapsed,
      x: node.x,
      y: node.y,
      annotations: node.annotations ? { ...node.annotations } : {},
    };
  }

  function _hoverValueForListener(nodeInfo, annotationKey = null) {
    if (!nodeInfo) return null;
    if (!annotationKey || _isTipNameValue(annotationKey)) return nodeInfo;
    return nodeInfo.annotations?.[annotationKey] ?? null;
  }

  function _emitHoverChanged(nodeId) {
    const node = nodeId ? (renderer?.nodeMap?.get(nodeId) || null) : null;
    const nodeInfo = _nodeInfoForListener(node);
    _postParentEmbedEvent('pt:hoverChanged', { node: nodeInfo });
    if (_nodeHoverListeners.size === 0 && _tipHoverListeners.size === 0) return;
    const nodePayload = nodeInfo && !nodeInfo.isTip ? nodeInfo : null;
    const tipPayload  = nodeInfo &&  nodeInfo.isTip ? nodeInfo : null;
    for (const l of _nodeHoverListeners) {
      try { l.fn(_hoverValueForListener(nodePayload, l.annotationKey)); } catch (_) { /* listener errors must not break app flow */ }
    }
    for (const l of _tipHoverListeners) {
      try { l.fn(_hoverValueForListener(tipPayload, l.annotationKey)); } catch (_) { /* listener errors must not break app flow */ }
    }
  }

  function _buildRendererSettings() {
    return {
      bgColor:          canvasBgColorEl.value,
      branchColor:      branchColorEl.value,
      branchColourBy:   branchColourBy?.value || null,
      branchWidth:      parseFloat(branchWidthSlider.value),
      elbowRadius:      parseFloat(elbowRadiusSlider?.value ?? DEFAULT_THEME.elbowRadius),
      tipLabelFontSize: parseInt(fontSlider.value),
      tipRadius:        parseInt(tipSlider.value),
      tipShapeHaloSize: parseInt(tipHaloSlider.value),
      tipShapeColor:    tipShapeColorEl.value,
      tipShapeBgColor:  tipShapeBgEl.value,
      nodeRadius:       parseInt(nodeSlider.value),
      nodeShapeHaloSize: parseInt(nodeHaloSlider.value),
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      tipLabelColor:    labelColorEl.value,
      selectedLabelStyle: selectedLabelStyleEl.value,
      rootStubLength:   parseFloat(DEFAULT_SETTINGS.rootStubLength),
      rootStemPct:      parseFloat(rootStemPctSlider.value),
      tipHoverFillColor:      tipHoverFillEl.value,
      tipHoverStrokeColor:    tipHoverStrokeEl.value,
      tipHoverGrowthFactor:   tipHoverGrowthFactorValue,
      tipHoverGrowth:         parseFloat(tipHoverGrowthSlider.value),
      tipHoverMinSize:        parseFloat(tipHoverMinSizeSlider.value),
      tipHoverFillOpacity:    parseFloat(tipHoverFillOpacitySlider.value),
      tipHoverStrokeWidth:    parseFloat(tipHoverStrokeWidthSlider.value),
      tipHoverStrokeOpacity:  parseFloat(tipHoverStrokeOpacitySlider.value),
      nodeHoverFillColor:     nodeHoverFillEl.value,
      nodeHoverStrokeColor:   nodeHoverStrokeEl.value,
      nodeHoverGrowthFactor:  nodeHoverGrowthFactorValue,
      nodeHoverGrowth:        parseFloat(nodeHoverGrowthSlider.value),
      nodeHoverMinSize:       parseFloat(nodeHoverMinSizeSlider.value),
      nodeHoverFillOpacity:   parseFloat(nodeHoverFillOpacitySlider.value),
      nodeHoverStrokeWidth:   parseFloat(nodeHoverStrokeWidthSlider.value),
      nodeHoverStrokeOpacity: parseFloat(nodeHoverStrokeOpacitySlider.value),
      selectedTipStrokeColor:    selectedTipStrokeEl.value,
      selectedTipFillColor:      selectedTipFillEl.value,
      selectedTipGrowthFactor:   selectedTipGrowthFactorValue,
      selectedTipGrowth:         parseFloat(selectedTipGrowthSlider.value),
      selectedTipMinSize:        parseFloat(selectedTipMinSizeSlider.value),
      selectedTipFillOpacity:    parseFloat(selectedTipFillOpacitySlider.value),
      selectedTipStrokeWidth:    parseFloat(selectedTipStrokeWidthSlider.value),
      selectedTipStrokeOpacity:  parseFloat(selectedTipStrokeOpacitySlider.value),
      selectedNodeStrokeColor:   selectedNodeStrokeEl.value,
      selectedNodeFillColor:     selectedNodeFillEl.value,
      selectedNodeGrowthFactor:  selectedNodeGrowthFactorValue,
      selectedNodeGrowth:        parseFloat(selectedNodeGrowthSlider.value),
      selectedNodeMinSize:       parseFloat(selectedNodeMinSizeSlider.value),
      selectedNodeFillOpacity:   parseFloat(selectedNodeFillOpacitySlider.value),
      selectedNodeStrokeWidth:   parseFloat(selectedNodeStrokeWidthSlider.value),
      selectedNodeStrokeOpacity: parseFloat(selectedNodeStrokeOpacitySlider.value),
      nodeBarsEnabled:    nodeBarsShowEl.value !== 'off',
      nodeBarsHpdKey:     nodeBarsShowEl.value !== 'off' ? nodeBarsShowEl.value : null,
      nodeBarsExtraHpdKeys: nodeBarsExtraShowEls.map(el => (el?.value && el.value !== 'off') ? el.value : null),
      nodeBarsClipTo: nodeBarsClipToEl?.value && nodeBarsClipToEl.value !== 'off' ? nodeBarsClipToEl.value : null,
      nodeBarsExtraClipTo: nodeBarsExtraClipToEls.map(el => (el?.value && el.value !== 'off') ? el.value : null),
      nodeBarsColor:      nodeBarsColorEl.value,
      nodeBarsExtraColors: nodeBarsExtraColorEls.map(el => el?.value || '#2aa198'),
      nodeBarsWidth:      parseInt(nodeBarsWidthSlider.value),
      nodeBarsExtraWidths: nodeBarsExtraWidthSliders.map(el => parseInt(el?.value ?? '6')),
      nodeBarsFillOpacity:   parseFloat(nodeBarsFillOpacitySlider.value),
      nodeBarsExtraFillOpacities: nodeBarsExtraFillOpacitySliders.map(el => parseFloat(el?.value ?? '0.22')),
      nodeBarsStrokeOpacity: parseFloat(nodeBarsStrokeOpacitySlider.value),
      nodeBarsExtraStrokeOpacities: nodeBarsExtraStrokeOpacitySliders.map(el => parseFloat(el?.value ?? '0.55')),
      nodeBarsLine: nodeBarsLineEl.value,
      nodeBarsRange:  nodeBarsRangeEl.value  === 'on',
      collapsedCladeOpacity:  parseFloat(collapsedOpacitySlider.value),
      collapsedCladeStrokeWidth: parseFloat(collapsedStrokeWidthSlider.value),
      collapsedCladeStrokeOpacity: parseFloat(collapsedStrokeOpacitySlider.value),
      collapsedCladeHeightN:  parseInt(collapsedHeightNSlider.value),
      collapsedCladeFontSize: parseInt(collapsedCladeFontSizeSlider.value),
      collapsedCladeTypefaceKey:   collapsedCladeTypefaceEl?.value   || null,
      collapsedCladeTypefaceStyle: collapsedCladeTypefaceStyleEl?.value || null,
      clampNegativeBranches: false,
      typefaceKey:        fontFamilyEl.value,
      typefaceStyle:      fontTypefaceStyleEl?.value || TYPEFACES[fontFamilyEl.value]?.defaultStyle || 'Regular',
      tipLabelsOff:       tipLabelShow.value === 'off',
      tipLabelAnnotation: _isTipNameValue(tipLabelShow.value) ? null
                        : tipLabelShow.value === 'off'   ? null
                        : tipLabelShow.value,
      tipLabelAlign:      tipLabelAlignEl.value,
      tipLabelDecimalPlaces:  tipLabelDpEl.value !== '' ? parseInt(tipLabelDpEl.value) : null,
      tipLabelShape:           tipLabelShapeEl.value,
      tipLabelShapeColor:      tipLabelShapeColorEl.value,
      tipLabelShapeSize:        parseInt(tipLabelShapeSizeSlider.value),
      tipLabelShapeMarginLeft:  parseInt(tipLabelShapeMarginLeftSlider.value),
      tipLabelShapeSpacing:     parseInt(tipLabelShapeSpacingSlider.value),
      tipLabelShapesExtra:      tipLabelShapeExtraEls.map(e => e.value),
      branchShape:              branchShapeEl?.value || 'off',
      branchShapeHeightPct:     parseInt(branchShapeHeightSlider?.value ?? DEFAULT_SETTINGS.branchShapeHeightPct),
      branchShapeWidth:         _branchShapeWidthFromSlider(branchShapeWidthSlider?.value ?? 50),
      branchShapeAlign:         branchShapeAlignEl?.value || DEFAULT_SETTINGS.branchShapeAlign,
      branchShapeSpacing:       parseInt(branchShapeSpacingSlider?.value ?? DEFAULT_SETTINGS.branchShapeSpacing),
      branchShapeColor:         branchShapeColorEl?.value || '#aaaaaa',
      branchShapeColourBy:      branchShapeColourByEl?.value || null,
      branchShapeCountBy:       branchShapeCountByEl?.value || null,
      branchShapeHalo:          parseInt(branchShapeHaloSlider?.value ?? DEFAULT_SETTINGS.branchShapeHalo),
      branchShapeHaloColor:     branchShapeHaloColorEl?.value || '#02292e',
      branchShapesExtra:        branchShapeExtraEls.map(e => e?.value || 'off'),
      branchShapesExtraColors:  branchShapeExtraColors.map(e => e?.value || '#aaaaaa'),
      branchShapesExtraColourBys: branchShapeExtraColourBys.map(e => e?.value || null),
      branchShapesExtraCountBys: branchShapeExtraCountBys.map(e => e?.value || null),
      tipLabelTypefaceKey:   tipLabelTypefaceEl?.value || null,
      tipLabelTypefaceStyle: typefaceStyleEl?.value   || null,
      nodeLabelAnnotation: nodeLabelShowEl.value || null,
      nodeLabelPosition:   nodeLabelPositionEl.value,
      nodeLabelFontSize:   parseInt(nodeLabelFontSizeSlider.value),
      nodeLabelColor:      nodeLabelColorEl.value,
      nodeLabelSpacing:    parseInt(nodeLabelSpacingSlider.value),
      nodeLabelTypefaceKey:   nodeLabelTypefaceEl?.value   || null,
      nodeLabelTypefaceStyle: nodeLabelTypefaceStyleEl?.value || null,
      tipLabelSpacing:     parseInt(tipLabelSpacingSlider.value),
      nodeLabelDecimalPlaces: nodeLabelDpEl.value !== '' ? parseInt(nodeLabelDpEl.value) : null,
      branchLabelAnnotation: branchLabelShowEl.value || null,
      branchLabelPosition:   branchLabelPositionEl.value,
      branchLabelFontSize:   parseInt(branchLabelFontSizeSlider.value),
      branchLabelColor:      branchLabelColorEl.value,
      branchLabelSpacing:    parseInt(branchLabelSpacingSlider.value),
      branchLabelTypefaceKey:   branchLabelTypefaceEl?.value   || null,
      branchLabelTypefaceStyle: branchLabelTypefaceStyleEl?.value || null,
      branchLabelDecimalPlaces: branchLabelDpEl.value !== '' ? parseInt(branchLabelDpEl.value) : null,
      calCalibration:      calibration?.isActive ? calibration : null,
      calDateFormat:       axisDateFmtEl.value,
      introAnimation:      _saved.introAnimation ?? DEFAULT_SETTINGS.introAnimation,
      cladeHighlightLeftEdge:      cladeHighlightLeftEdgeEl?.value ?? DEFAULT_SETTINGS.cladeHighlightLeftEdge,
      cladeHighlightRightEdge:     cladeHighlightRightEdgeEl?.value ?? DEFAULT_SETTINGS.cladeHighlightRightEdge,
      cladeHighlightPadding:       parseFloat(cladeHighlightPaddingSlider?.value ?? DEFAULT_SETTINGS.cladeHighlightPadding),
      cladeHighlightRadius:        parseFloat(cladeHighlightRadiusSlider?.value ?? DEFAULT_SETTINGS.cladeHighlightRadius),
      cladeHighlightStrokeWidth:   parseFloat(cladeHighlightStrokeWidthSlider?.value ?? '1'),
      cladeHighlightFillOpacity:   parseFloat(cladeHighlightFillOpacitySlider?.value ?? '0.15'),
      cladeHighlightStrokeOpacity: parseFloat(cladeHighlightStrokeOpacitySlider?.value ?? '0.7'),
      cladeHighlightColour:        cladeHighlightDefaultColourEl?.value ?? '#ffaa00',
      _filterDefinitions:          filterManager?.getAll() ?? new Map(),
      nodeBarsFilter:              nodeBarsFilterEl?.value     || null,
      nodeLabelsFilter:            nodeLabelsFilterEl?.value   || null,
      branchLabelsFilter:          branchLabelsFilterEl?.value || null,
      branchShapesFilter:          branchShapesFilterEl?.value || null,
      tipLabelsFilter:             tipLabelsFilterEl?.value    || null,
      nodeShapesFilter:            nodeShapesFilterEl?.value   || null,
      tipShapesFilter:             tipShapesFilterEl?.value    || null,
      tipLabelsExtra:              [tipLabel2ShowEl?.value ?? 'off', tipLabel3ShowEl?.value ?? 'off', tipLabel4ShowEl?.value ?? 'off'],
      tipLabelsExtraLayouts:       [tipLabel2LayoutEl?.value ?? 'append', tipLabel3LayoutEl?.value ?? 'append', tipLabel4LayoutEl?.value ?? 'append'],
    };
  }

  /**
   * Show/hide secondary controls based on the primary on/off state of each section.
   * Call whenever any controlling element changes, and once on page load.
   */
  function _syncControlVisibility() {
    optionsVisibility.evaluate();
    const _schema = graph?.annotationSchema ?? new Map();
    _updateLabelDpRow(legendDpRowEl,  legendAnnotEl.value,  _schema);
    _updateLabelDpRow(legend2DpRowEl, legend2AnnotEl.value, _schema);
    _updateLabelDpRow(legend3DpRowEl, legend3AnnotEl.value, _schema);
    _updateLabelDpRow(legend4DpRowEl, legend4AnnotEl.value, _schema);
    _syncNodeBarsClipVisibility(_schema);
  }

  /**
   * Apply border/padding/background settings to <html> for iframe embed styling.
   * Everything goes on the <html> element — it's the document root whose box
   * maps to the iframe viewport.  overflow:hidden clips rendered content to the
   * border-radius so rounded corners work without any host-page changes.
   */
  function _syncCanvasBorder(s) {
    const doc = root.ownerDocument ?? document;
    const htm = doc.documentElement;
    if (!htm) return;
    const w = s.borderWidth  != null ? parseFloat(s.borderWidth)  : null;
    const c = s.borderColor  != null ? String(s.borderColor)      : null;
    const r = s.borderRadius != null ? parseFloat(s.borderRadius) : null;
    htm.style.border          = (w != null && !isNaN(w) && c) ? `${w}px solid ${c}` : '';
    htm.style.borderRadius    = (r != null && !isNaN(r))       ? `${r}px`           : '';
    htm.style.overflow        = (r != null && !isNaN(r))       ? 'hidden'           : '';
    htm.style.backgroundColor = s.backgroundColor != null ? String(s.backgroundColor) : '';

    const _px = (v) => { const n = parseFloat(v); return (v != null && !isNaN(n)) ? `${n}px` : ''; };
    const _pxOr0 = (v) => {
      const n = parseFloat(v);
      return (v != null && !isNaN(n)) ? `${n}px` : '0px';
    };
    htm.style.paddingTop    = _px(s.paddingTop);
    htm.style.paddingRight  = _px(s.paddingRight);
    htm.style.paddingBottom = _px(s.paddingBottom);
    htm.style.paddingLeft   = _px(s.paddingLeft);

    const caw = $('tree-axis-wrapper');
    if (caw) {
      caw.style.paddingTop    = _px(s.treePaddingTop);
      caw.style.paddingRight  = _px(s.treePaddingRight);
      caw.style.paddingBottom = _px(s.treePaddingBottom);
      caw.style.paddingLeft   = _px(s.treePaddingLeft);
    }
    const lrw = $('legend-right-wrapper');
    if (lrw) {
      lrw.style.paddingTop    = _px(s.legendPaddingTop);
      lrw.style.paddingRight  = _px(s.legendPaddingRight);
      lrw.style.paddingBottom = _px(s.legendPaddingBottom);
      lrw.style.paddingLeft   = _px(s.legendPaddingLeft);
    }
  }

  /**
   * Sync the CSS background of the canvas wrapper divs to match the canvas
   * fill colour so no gap / flash is visible between the tree and axis canvases.
   * Before a tree is loaded the wrappers have no inline background set, so the
   * CSS rule on html/body (DEFAULT_BACKGROUND_COLOR) shows through instead.
   */
  function _syncCanvasWrapperBg(color) {
    if (!treeLoaded) return;
    $('canvas-container').style.background = color;
  }

  /** Apply a named theme: hydrate all visual DOM controls and push to renderer. */
  /**
   * Walk the inherit chain for a theme name and return a fully-resolved theme object.
   * Resolution order: DEFAULT_THEME → ancestor themes → target theme (each layer
   * overrides the previous).  The chain terminates when `inherit` is absent or ''.
   */
  function _resolveTheme(name) {
    return themeManager.resolveTheme(name);
  }

  function applyTheme(name) {
    if (!themeManager.registry.has(name)) return;
    // Resolve full theme by walking the inherit chain from DEFAULT_THEME downward.
    const t = _resolveTheme(name);
    canvasBgColorEl.value   = t.canvasBgColor;
    _syncCanvasWrapperBg(t.canvasBgColor);
    branchColorEl.value     = t.branchColor;
    branchWidthSlider.value = t.branchWidth;
    $('branch-width-value').textContent = t.branchWidth;
    if (t.elbowRadius != null && elbowRadiusSlider) {
      elbowRadiusSlider.value = t.elbowRadius;
      $('elbow-radius-value').textContent = t.elbowRadius;
    }
    fontSlider.value        = t.tipLabelFontSize;
    $('font-size-value').textContent    = t.tipLabelFontSize;
    labelColorEl.value         = t.tipLabelColor;
    selectedLabelStyleEl.value = t.selectedLabelStyle;
    selectedTipStrokeEl.value  = t.selectedTipStrokeColor;
    selectedNodeStrokeEl.value = t.selectedNodeStrokeColor;
    tipHoverFillEl.value       = t.tipHoverFillColor;
    nodeHoverFillEl.value      = t.nodeHoverFillColor;
    selectedTipFillEl.value    = t.selectedTipFillColor;
    selectedNodeFillEl.value   = t.selectedNodeFillColor;
    tipHoverStrokeEl.value     = t.tipHoverStrokeColor;
    nodeHoverStrokeEl.value    = t.nodeHoverStrokeColor;
    tipSlider.value         = t.tipShapeSize;
    $('tip-size-value').textContent     = t.tipShapeSize;
    tipHaloSlider.value     = t.tipShapeHaloSize;
    $('tip-halo-value').textContent     = t.tipShapeHaloSize;
    tipShapeColorEl.value   = t.tipShapeColor;
    tipShapeBgEl.value      = t.tipShapeBgColor;
    nodeSlider.value        = t.nodeShapeSize;
    $('node-size-value').textContent    = t.nodeShapeSize;
    nodeHaloSlider.value    = t.nodeShapeHaloSize;
    $('node-halo-value').textContent    = t.nodeShapeHaloSize;
    nodeShapeColorEl.value  = t.nodeShapeColor;
    nodeShapeBgEl.value     = t.nodeShapeBgColor;
    // Hover state
    tipHoverGrowthFactorValue     = parseFloat(t.tipHoverGrowthFactor ?? '1');
    tipHoverGrowthSlider.value    = t.tipHoverGrowth ?? 0;    $('tip-hover-growth-value').textContent    = t.tipHoverGrowth ?? 0;
    tipHoverMinSizeSlider.value   = t.tipHoverMinSize;         $('tip-hover-min-size-value').textContent  = t.tipHoverMinSize;
    tipHoverFillOpacitySlider.value   = t.tipHoverFillOpacity;    $('tip-hover-fill-opacity-value').textContent    = t.tipHoverFillOpacity;
    tipHoverStrokeWidthSlider.value   = t.tipHoverStrokeWidth;    $('tip-hover-stroke-width-value').textContent    = t.tipHoverStrokeWidth;
    tipHoverStrokeOpacitySlider.value = t.tipHoverStrokeOpacity;  $('tip-hover-stroke-opacity-value').textContent  = t.tipHoverStrokeOpacity;
    nodeHoverGrowthFactorValue    = parseFloat(t.nodeHoverGrowthFactor ?? '1');
    nodeHoverGrowthSlider.value   = t.nodeHoverGrowth ?? 0;   $('node-hover-growth-value').textContent   = t.nodeHoverGrowth ?? 0;
    nodeHoverMinSizeSlider.value  = t.nodeHoverMinSize;        $('node-hover-min-size-value').textContent = t.nodeHoverMinSize;
    nodeHoverFillOpacitySlider.value   = t.nodeHoverFillOpacity;   $('node-hover-fill-opacity-value').textContent   = t.nodeHoverFillOpacity;
    nodeHoverStrokeWidthSlider.value   = t.nodeHoverStrokeWidth;   $('node-hover-stroke-width-value').textContent   = t.nodeHoverStrokeWidth;
    nodeHoverStrokeOpacitySlider.value = t.nodeHoverStrokeOpacity; $('node-hover-stroke-opacity-value').textContent = t.nodeHoverStrokeOpacity;
    // Selected state
    selectedTipGrowthFactorValue  = parseFloat(t.selectedTipGrowthFactor ?? '1');
    selectedTipGrowthSlider.value   = t.selectedTipGrowth ?? 0;  $('selected-tip-growth-value').textContent   = t.selectedTipGrowth ?? 0;
    selectedTipMinSizeSlider.value  = t.selectedTipMinSize;       $('selected-tip-min-size-value').textContent = t.selectedTipMinSize;
    selectedTipFillOpacitySlider.value   = t.selectedTipFillOpacity;   $('selected-tip-fill-opacity-value').textContent   = t.selectedTipFillOpacity;
    selectedTipStrokeWidthSlider.value   = t.selectedTipStrokeWidth;   $('selected-tip-stroke-width-value').textContent   = t.selectedTipStrokeWidth;
    selectedTipStrokeOpacitySlider.value = t.selectedTipStrokeOpacity; $('selected-tip-stroke-opacity-value').textContent = t.selectedTipStrokeOpacity;
    selectedNodeGrowthFactorValue = parseFloat(t.selectedNodeGrowthFactor ?? '1');
    selectedNodeGrowthSlider.value  = t.selectedNodeGrowth ?? 0; $('selected-node-growth-value').textContent  = t.selectedNodeGrowth ?? 0;
    selectedNodeMinSizeSlider.value = t.selectedNodeMinSize;      $('selected-node-min-size-value').textContent = t.selectedNodeMinSize;
    selectedNodeFillOpacitySlider.value   = t.selectedNodeFillOpacity;   $('selected-node-fill-opacity-value').textContent   = t.selectedNodeFillOpacity;
    selectedNodeStrokeWidthSlider.value   = t.selectedNodeStrokeWidth;   $('selected-node-stroke-width-value').textContent   = t.selectedNodeStrokeWidth;
    selectedNodeStrokeOpacitySlider.value = t.selectedNodeStrokeOpacity; $('selected-node-stroke-opacity-value').textContent = t.selectedNodeStrokeOpacity;
    // Axis style
    axisColorEl.value         = t.axisColor;
    axisFontSizeSlider.value  = t.axisFontSize;  $('axis-font-size-value').textContent  = t.axisFontSize;
    axisLineWidthSlider.value = t.axisLineWidth; $('axis-line-width-value').textContent = t.axisLineWidth;
    axisTypefaceEl.value    = t.axisTypefaceKey;
    // Legend style
    legendFontSizeSlider.value = t.legendFontSize; $('legend-font-size-value').textContent = t.legendFontSize;
    legendTypefaceEl.value   = t.legendTypefaceKey ?? t.legendFontFamily ?? ''; // bwc
    nodeBarsColorEl.value = t.nodeBarsColor;
    // legendTextColor falls back to tipLabelColor for themes that don't define it explicitly.
    const legendColor = t.legendTextColor || t.tipLabelColor;
    legendTextColorEl.value = legendColor;
    fontFamilyEl.value = t.typeface;
    // Populate typeface style selects for the new theme
    const _themeStyle = t.typefaceStyle ?? TYPEFACES[fontFamilyEl.value]?.defaultStyle ?? 'Regular';
    _populateStyleSelect(fontFamilyEl.value, fontTypefaceStyleEl, _themeStyle);
    if (tipLabelTypefaceEl) tipLabelTypefaceEl.value = '';
    _populateStyleSelect(fontFamilyEl.value, typefaceStyleEl, '', true);
    _populateStyleSelect(legendTypefaceEl.value || fontFamilyEl.value, legendTypefaceStyleEl, t.legendTypefaceStyle ?? t.legendFontStyle ?? '', true);
    _populateStyleSelect(axisTypefaceEl.value   || fontFamilyEl.value, axisTypefaceStyleEl,   t.axisTypefaceStyle   || '', true);
    // RTT axis typeface (now a theme property)
    if (rttAxisFontFamilyEl) rttAxisFontFamilyEl.value = t.rttAxisTypefaceKey || '';
    _populateStyleSelect(rttAxisFontFamilyEl?.value || fontFamilyEl.value, rttAxisTypefaceStyleEl, t.rttAxisTypefaceStyle || '', true);
    // Node label typeface (now a theme property)
    if (nodeLabelTypefaceEl) nodeLabelTypefaceEl.value = t.nodeLabelTypefaceKey || '';
    _populateStyleSelect(nodeLabelTypefaceEl?.value || fontFamilyEl.value, nodeLabelTypefaceStyleEl, t.nodeLabelTypefaceStyle || '', true);
    // Collapsed clade typeface (now a theme property)
    if (collapsedCladeTypefaceEl) collapsedCladeTypefaceEl.value = t.collapsedCladeTypefaceKey || '';
    _populateStyleSelect(collapsedCladeTypefaceEl?.value || fontFamilyEl.value, collapsedCladeTypefaceStyleEl, t.collapsedCladeTypefaceStyle || '', true);
    tipLabelShapeColorEl.value  = t.tipLabelShapeColor  || t.tipShapeColor;
    if (branchShapeColorEl) branchShapeColorEl.value = t.branchShapeColor || '#aaaaaa';
    if (branchShapeHaloColorEl) branchShapeHaloColorEl.value = t.branchShapeHaloColor || '#02292e';
    if (branchShapeExtraColors[0]) branchShapeExtraColors[0].value = t.branchShape2Color || '#aaaaaa';
    if (branchShapeExtraColors[1]) branchShapeExtraColors[1].value = t.branchShape3Color || '#aaaaaa';
    if (branchShapeExtraColors[2]) branchShapeExtraColors[2].value = t.branchShape4Color || '#aaaaaa';
    // RTT plot colours — rttAxisColor and rttRegressionColor default to '' (inherit)
    if (t.rttAxisColor)       rttAxisColorEl.value       = t.rttAxisColor;
    rttStatsBgColorEl.value    = t.rttStatsBgColor;
    rttStatsTextColorEl.value  = t.rttStatsTextColor;
    if (t.rttRegressionColor) rttRegressionColorEl.value = t.rttRegressionColor;
    // Node labels appearance
    nodeLabelFontSizeSlider.value = t.nodeLabelFontSize; $('node-label-font-size-value').textContent = t.nodeLabelFontSize;
    nodeLabelColorEl.value        = t.nodeLabelColor;
    nodeLabelSpacingSlider.value  = t.nodeLabelSpacing;  $('node-label-spacing-value').textContent   = t.nodeLabelSpacing;
    // Branch labels appearance
    if (branchLabelTypefaceEl) branchLabelTypefaceEl.value = t.branchLabelTypefaceKey || '';
    _populateStyleSelect(branchLabelTypefaceEl?.value || fontFamilyEl.value, branchLabelTypefaceStyleEl, t.branchLabelTypefaceStyle || '', true);
    branchLabelFontSizeSlider.value = t.branchLabelFontSize; $('branch-label-font-size-value').textContent = t.branchLabelFontSize;
    branchLabelColorEl.value        = t.branchLabelColor;
    branchLabelSpacingSlider.value  = t.branchLabelSpacing;  $('branch-label-spacing-value').textContent   = t.branchLabelSpacing;
    // Node bars appearance
    nodeBarsWidthSlider.value         = t.nodeBarsWidth;         $('node-bars-width-value').textContent          = t.nodeBarsWidth;
    nodeBarsFillOpacitySlider.value   = t.nodeBarsFillOpacity;   $('node-bars-fill-opacity-value').textContent   = t.nodeBarsFillOpacity;
    nodeBarsStrokeOpacitySlider.value = t.nodeBarsStrokeOpacity; $('node-bars-stroke-opacity-value').textContent = t.nodeBarsStrokeOpacity;
    // Clade highlights appearance
    // Paint brush / toolbar colour picker
    paintColourPickerEl.value = t.paintColour;
    if (cladeHighlightDefaultColourEl)    cladeHighlightDefaultColourEl.value    = t.cladeHighlightColour;
    if (cladeHighlightStrokeWidthSlider)  { cladeHighlightStrokeWidthSlider.value  = t.cladeHighlightStrokeWidth;  $('clade-highlight-stroke-width-value')  && ($('clade-highlight-stroke-width-value').textContent  = t.cladeHighlightStrokeWidth);  }
    if (cladeHighlightFillOpacitySlider)  { cladeHighlightFillOpacitySlider.value  = t.cladeHighlightFillOpacity;  $('clade-highlight-fill-opacity-value')  && ($('clade-highlight-fill-opacity-value').textContent  = t.cladeHighlightFillOpacity);  }
    if (cladeHighlightStrokeOpacitySlider){ cladeHighlightStrokeOpacitySlider.value = t.cladeHighlightStrokeOpacity; $('clade-highlight-stroke-opacity-value') && ($('clade-highlight-stroke-opacity-value').textContent = t.cladeHighlightStrokeOpacity); }
    // Collapsed clades appearance
    collapsedCladeFontSizeSlider.value  = t.collapsedCladeFontSize;  $('collapsed-clade-font-size-value').textContent = t.collapsedCladeFontSize;
    if (collapsedStrokeWidthSlider && t.collapsedCladeStrokeWidth != null)   { collapsedStrokeWidthSlider.value   = t.collapsedCladeStrokeWidth;   $('collapsed-stroke-width-value')   && ($('collapsed-stroke-width-value').textContent   = t.collapsedCladeStrokeWidth);   }
    if (collapsedStrokeOpacitySlider && t.collapsedCladeStrokeOpacity != null){ collapsedStrokeOpacitySlider.value = t.collapsedCladeStrokeOpacity; $('collapsed-stroke-opacity-value') && ($('collapsed-stroke-opacity-value').textContent = t.collapsedCladeStrokeOpacity); }
    // RTT chart appearance
    rttStatsFontSizeSlider.value       = t.rttStatsFontSize;       $('rtt-stats-font-size-value').textContent     = t.rttStatsFontSize;
    rttRegressionStyleEl.value         = t.rttRegressionStyle;
    rttRegressionWidthSlider.value     = t.rttRegressionWidth;     $('rtt-regression-width-value').textContent    = t.rttRegressionWidth;
    if (t.rttResidBandColor)    rttResidBandColorEl.value    = t.rttResidBandColor;
    if (t.rttResidBandFillColor) rttResidBandFillColorEl.value = t.rttResidBandFillColor;
    if (t.rttResidBandStyle)    rttResidBandStyleEl.value    = t.rttResidBandStyle;
    if (t.rttResidBandWidth    != null) { rttResidBandWidthSlider.value       = t.rttResidBandWidth;       $('rtt-resid-band-width-value').textContent       = t.rttResidBandWidth; }
    if (t.rttResidBandFillOpacity != null) { rttResidBandFillOpacitySlider.value = t.rttResidBandFillOpacity; $('rtt-resid-band-fill-opacity-value').textContent = t.rttResidBandFillOpacity; }
    rttAxisFontSizeSlider.value        = t.rttAxisFontSize;        $('rtt-axis-font-size-value').textContent      = t.rttAxisFontSize;
    rttAxisLineWidthSlider.value       = t.rttAxisLineWidth;       $('rtt-axis-line-width-value').textContent     = t.rttAxisLineWidth;
    if (renderer) {
      renderer.setSettings(_buildRendererSettings());
      axisRenderer.setColor(t.axisColor);
      axisRenderer.setLineWidth(parseFloat(t.axisLineWidth));
      axisRenderer.setFontSize(parseInt(t.axisFontSize));
      legendRenderer.setTextColor(legendColor);
      legendRenderer.setFontSize(parseInt(t.legendFontSize));
      _applyAxisTypeface();
      _applyLegendTypeface();
      // Invalidate axis hash so next update redraws
      axisRenderer._lastHash = '';
    }
    if (themeSelect) themeSelect.value = name;
    _syncThemeButtons();
    saveSettings();
    _syncControlVisibility();
    // Keep RTT plot style in sync when the theme changes.
    rttChart?.notifyStyleChange?.();
  }

  /** Mark the theme selector as Custom when the user manually edits any visual control. */
  function _markCustomTheme() {
    themeManager?.markCustom();
  }

  btnResetSettings?.addEventListener('click', applyDefaults);
  btnStoreTheme?.addEventListener('click', storeTheme);
  btnDefaultTheme?.addEventListener('click', setDefaultTheme);
  btnRemoveTheme?.addEventListener('click', removeTheme);
  btnExportTheme?.addEventListener('click', exportTheme);
  btnImportTheme?.addEventListener('click', importTheme);

  function _renderUiThemeFamilyLabel() {
    if (!uiThemeFamilyCurrentEl || !uiThemeManager) return;
    const active = uiThemeManager.getActiveFamily();
    const meta = uiThemeManager.families.find(f => f.id === active);
    uiThemeFamilyCurrentEl.textContent = meta?.label ?? active;
  }

  async function _openUiThemeFamilyDialog() {
    if (!uiThemeManager || typeof window.showThemeFamilyDialog !== 'function') return;
    const selected = await window.showThemeFamilyDialog({
      title: 'UI Theme',
      message: 'Choose a UI theme family for app panels and controls.',
      families: uiThemeManager.families,
      currentFamily: uiThemeManager.getActiveFamily(),
    });
    if (!selected) return;
    uiThemeManager.setActiveFamily(selected);
    _renderUiThemeFamilyLabel();
  }

  btnUiThemeFamily?.addEventListener('click', _openUiThemeFamilyDialog);

  // Bootstrap theme registry and select options before restoring saved state.
  // Create the theme manager now that applyTheme, _buildSnapshot, saveSettings are defined.
  themeManager = createThemeManager({
    builtInThemes: THEMES,
    defaultThemeData: DEFAULT_THEME,
    requiredThemeKeys: REQUIRED_THEME_KEYS,
    userThemesKey: USER_THEMES_KEY,
    themeSelectEl: themeSelect,
    buttons: { store: btnStoreTheme, setDefault: btnDefaultTheme, remove: btnRemoveTheme, export: btnExportTheme, import: btnImportTheme },
    buildThemeSnapshot: () => _buildSnapshot({ themeOnly: true }),
    applyTheme,
    saveSettings,
    showAlertDialog,
    showConfirmDialog,
    showPromptDialog,
    downloadBlob: _downloadBlob,
    appName: 'PearTree',
  });

  const _uiThemeStorageKey = _cfg.storageKey === null
    ? null
    : `${_cfg.storageKey || SETTINGS_KEY}-ui`;
  const _uiThemeRoot = root === document
    ? document.documentElement
    : (root.closest?.('.pt-embed-wrap') ?? root);
  uiThemeManager = createUIThemeFamilyManager({
    families: UI_THEME_FAMILIES,
    defaultFamily: 'peartree',
    storageKey: _uiThemeStorageKey,
    root: _uiThemeRoot,
  });
  _renderUiThemeFamilyLabel();

  // Restore the per-instance default theme from saved settings.
  const _preSaved = loadSettings();
  if (_preSaved.defaultTheme && themeManager.registry.has(_preSaved.defaultTheme)) {
    themeManager.defaultTheme = _preSaved.defaultTheme;
  }

  // Load stored settings, then merge any embed-time initSettings on top so
  // window.peartreeConfig.settings always wins over persisted values.
  // _preSaved was already loaded above for defaultTheme; reuse it here.
  const _saved = Object.assign(_preSaved, _cfg.initSettings);
  // Restore per-annotation palette choices.
  if (_saved.annotationPalettes) {
    for (const [k, v] of Object.entries(_saved.annotationPalettes)) annotationPalettes.set(k, v);
  }
  if (_saved.annotationPaletteReverses) {
    for (const [k, v] of Object.entries(_saved.annotationPaletteReverses)) annotationPaletteReverses.set(k, !!v);
  }
  // Restore per-annotation scale mode choices.
  if (_saved.annotationScaleModes) {
    for (const [k, v] of Object.entries(_saved.annotationScaleModes)) annotationScaleModes.set(k, v);
  }
  if (_saved.canvasBgColor)        canvasBgColorEl.value    = _saved.canvasBgColor;
  if (_saved.branchColor)          branchColorEl.value      = _saved.branchColor;
  if (_saved.branchWidth    != null) {
    branchWidthSlider.value = _saved.branchWidth;
    $('branch-width-value').textContent = _saved.branchWidth;
  }
  if (_saved.elbowRadius != null && elbowRadiusSlider) {
    elbowRadiusSlider.value = _saved.elbowRadius;
    $('elbow-radius-value').textContent = _saved.elbowRadius;
  }
  if (_saved.tipLabelFontSize       != null) {
    fontSlider.value = _saved.tipLabelFontSize;
    $('font-size-value').textContent = _saved.tipLabelFontSize;
  }
  if (_saved.typeface)             fontFamilyEl.value       = _saved.typeface;
  _populateStyleSelect(fontFamilyEl.value, fontTypefaceStyleEl, _saved.typefaceStyle);
  if (_saved.tipLabelTypefaceKey && tipLabelTypefaceEl) tipLabelTypefaceEl.value = _saved.tipLabelTypefaceKey;
  _populateStyleSelect(tipLabelTypefaceEl?.value || fontFamilyEl.value, typefaceStyleEl, _saved.tipLabelTypefaceStyle, true);
  if (_saved.nodeLabelTypefaceKey && nodeLabelTypefaceEl)   nodeLabelTypefaceEl.value = _saved.nodeLabelTypefaceKey;
  _populateStyleSelect(nodeLabelTypefaceEl?.value || fontFamilyEl.value, nodeLabelTypefaceStyleEl, _saved.nodeLabelTypefaceStyle, true);
  if (_saved.collapsedCladeTypefaceKey && collapsedCladeTypefaceEl) collapsedCladeTypefaceEl.value = _saved.collapsedCladeTypefaceKey;
  _populateStyleSelect(collapsedCladeTypefaceEl?.value || fontFamilyEl.value, collapsedCladeTypefaceStyleEl, _saved.collapsedCladeTypefaceStyle, true);
  if (_saved.tipLabelColor)        labelColorEl.value       = _saved.tipLabelColor;
  if (_saved.selectedLabelStyle)   selectedLabelStyleEl.value = _saved.selectedLabelStyle;
  if (_saved.selectedTipStrokeColor)    selectedTipStrokeEl.value  = _saved.selectedTipStrokeColor;
  if (_saved.selectedNodeStrokeColor)        selectedNodeStrokeEl.value      = _saved.selectedNodeStrokeColor;
  if (_saved.tipHoverFillColor)        tipHoverFillEl.value      = _saved.tipHoverFillColor;
  if (_saved.nodeHoverFillColor)   nodeHoverFillEl.value = _saved.nodeHoverFillColor;
  if (_saved.selectedTipFillColor)  selectedTipFillEl.value = _saved.selectedTipFillColor;
  if (_saved.selectedTipGrowthFactor != null) {
    selectedTipGrowthFactorValue = parseFloat(_saved.selectedTipGrowthFactor);
  }
  if (_saved.selectedTipGrowth != null) {
    selectedTipGrowthSlider.value = _saved.selectedTipGrowth;
    $('selected-tip-growth-value').textContent = _saved.selectedTipGrowth;
  }
  if (_saved.selectedTipMinSize != null) {
    selectedTipMinSizeSlider.value = _saved.selectedTipMinSize;
    $('selected-tip-min-size-value').textContent = _saved.selectedTipMinSize;
  }
  if (_saved.selectedTipFillOpacity != null) {
    selectedTipFillOpacitySlider.value = _saved.selectedTipFillOpacity;
    $('selected-tip-fill-opacity-value').textContent = _saved.selectedTipFillOpacity;
  }
  if (_saved.selectedTipStrokeWidth != null) {
    selectedTipStrokeWidthSlider.value = _saved.selectedTipStrokeWidth;
    $('selected-tip-stroke-width-value').textContent = _saved.selectedTipStrokeWidth;
  }
  if (_saved.selectedTipStrokeOpacity != null) {
    selectedTipStrokeOpacitySlider.value = _saved.selectedTipStrokeOpacity;
    $('selected-tip-stroke-opacity-value').textContent = _saved.selectedTipStrokeOpacity;
  }
  if (_saved.selectedNodeFillColor) selectedNodeFillEl.value = _saved.selectedNodeFillColor;
  if (_saved.selectedNodeGrowthFactor != null) {
    selectedNodeGrowthFactorValue = parseFloat(_saved.selectedNodeGrowthFactor);
  }
  if (_saved.selectedNodeGrowth != null) {
    selectedNodeGrowthSlider.value = _saved.selectedNodeGrowth;
    $('selected-node-growth-value').textContent = _saved.selectedNodeGrowth;
  }
  if (_saved.selectedNodeMinSize != null) {
    selectedNodeMinSizeSlider.value = _saved.selectedNodeMinSize;
    $('selected-node-min-size-value').textContent = _saved.selectedNodeMinSize;
  }
  if (_saved.selectedNodeFillOpacity != null) {
    selectedNodeFillOpacitySlider.value = _saved.selectedNodeFillOpacity;
    $('selected-node-fill-opacity-value').textContent = _saved.selectedNodeFillOpacity;
  }
  if (_saved.selectedNodeStrokeWidth != null) {
    selectedNodeStrokeWidthSlider.value = _saved.selectedNodeStrokeWidth;
    $('selected-node-stroke-width-value').textContent = _saved.selectedNodeStrokeWidth;
  }
  if (_saved.selectedNodeStrokeOpacity != null) {
    selectedNodeStrokeOpacitySlider.value = _saved.selectedNodeStrokeOpacity;
    $('selected-node-stroke-opacity-value').textContent = _saved.selectedNodeStrokeOpacity;
  }
  if (_saved.tipHoverStrokeColor)   tipHoverStrokeEl.value = _saved.tipHoverStrokeColor;
  if (_saved.tipHoverGrowthFactor != null) {
    tipHoverGrowthFactorValue = parseFloat(_saved.tipHoverGrowthFactor);
  }
  if (_saved.tipHoverGrowth != null) {
    tipHoverGrowthSlider.value = _saved.tipHoverGrowth;
    $('tip-hover-growth-value').textContent = _saved.tipHoverGrowth;
  }
  if (_saved.tipHoverMinSize != null) {
    tipHoverMinSizeSlider.value = _saved.tipHoverMinSize;
    $('tip-hover-min-size-value').textContent = _saved.tipHoverMinSize;
  }
  if (_saved.tipHoverFillOpacity != null) {
    tipHoverFillOpacitySlider.value = _saved.tipHoverFillOpacity;
    $('tip-hover-fill-opacity-value').textContent = _saved.tipHoverFillOpacity;
  }
  if (_saved.tipHoverStrokeWidth != null) {
    tipHoverStrokeWidthSlider.value = _saved.tipHoverStrokeWidth;
    $('tip-hover-stroke-width-value').textContent = _saved.tipHoverStrokeWidth;
  }
  if (_saved.tipHoverStrokeOpacity != null) {
    tipHoverStrokeOpacitySlider.value = _saved.tipHoverStrokeOpacity;
    $('tip-hover-stroke-opacity-value').textContent = _saved.tipHoverStrokeOpacity;
  }
  if (_saved.nodeHoverStrokeColor)  nodeHoverStrokeEl.value = _saved.nodeHoverStrokeColor;
  if (_saved.nodeHoverGrowthFactor != null) {
    nodeHoverGrowthFactorValue = parseFloat(_saved.nodeHoverGrowthFactor);
  }
  if (_saved.nodeHoverGrowth != null) {
    nodeHoverGrowthSlider.value = _saved.nodeHoverGrowth;
    $('node-hover-growth-value').textContent = _saved.nodeHoverGrowth;
  }
  if (_saved.nodeHoverMinSize != null) {
    nodeHoverMinSizeSlider.value = _saved.nodeHoverMinSize;
    $('node-hover-min-size-value').textContent = _saved.nodeHoverMinSize;
  }
  if (_saved.nodeHoverFillOpacity != null) {
    nodeHoverFillOpacitySlider.value = _saved.nodeHoverFillOpacity;
    $('node-hover-fill-opacity-value').textContent = _saved.nodeHoverFillOpacity;
  }
  if (_saved.nodeHoverStrokeWidth != null) {
    nodeHoverStrokeWidthSlider.value = _saved.nodeHoverStrokeWidth;
    $('node-hover-stroke-width-value').textContent = _saved.nodeHoverStrokeWidth;
  }
  if (_saved.nodeHoverStrokeOpacity != null) {
    nodeHoverStrokeOpacitySlider.value = _saved.nodeHoverStrokeOpacity;
    $('node-hover-stroke-opacity-value').textContent = _saved.nodeHoverStrokeOpacity;
  }
  if (_saved.tipShapeSize   != null) {
    tipSlider.value = _saved.tipShapeSize;
    $('tip-size-value').textContent = _saved.tipShapeSize;
  }
  if (_saved.tipShapeHaloSize != null) {
    tipHaloSlider.value = _saved.tipShapeHaloSize;
    $('tip-halo-value').textContent = _saved.tipShapeHaloSize;
  }
  if (_saved.tipShapeColor)        tipShapeColorEl.value    = _saved.tipShapeColor;
  if (_saved.tipShapeBgColor)      tipShapeBgEl.value       = _saved.tipShapeBgColor;
  if (_saved.tipLabelShape)        tipLabelShapeEl.value        = _saved.tipLabelShape;
  if (_saved.tipLabelShapeColor)   tipLabelShapeColorEl.value   = _saved.tipLabelShapeColor;
  if (_saved.tipLabelShapeMarginLeft != null) {
    tipLabelShapeMarginLeftSlider.value = _saved.tipLabelShapeMarginLeft;
    $('tip-label-shape-margin-left-value').textContent = _saved.tipLabelShapeMarginLeft;
  }
  if (_saved.tipLabelShapeSpacing != null) {
    tipLabelShapeSpacingSlider.value = _saved.tipLabelShapeSpacing;
    $('tip-label-shape-spacing-value').textContent = _saved.tipLabelShapeSpacing;
  }
  // Extra shapes 2–10 — new array format or backward compat for old single tipLabelShape2 key.
  if (Array.isArray(_saved.tipLabelShapesExtra)) {
    _saved.tipLabelShapesExtra.forEach((v, i) => { if (tipLabelShapeExtraEls[i]) tipLabelShapeExtraEls[i].value = v; });
  } else if (_saved.tipLabelShape2) {
    tipLabelShapeExtraEls[0].value = _saved.tipLabelShape2;
  }
  if (Array.isArray(_saved.tipLabelShapeExtraColourBys)) {
    _saved.tipLabelShapeExtraColourBys.forEach((v, i) => { if (tipLabelShapeExtraColourBys[i]) tipLabelShapeExtraColourBys[i].value = v; });
  }
  if (_saved.tipLabelShapeSize != null) {
    tipLabelShapeSizeSlider.value = _saved.tipLabelShapeSize;
    $('tip-label-shape-size-value').textContent = _saved.tipLabelShapeSize;
  }
  if (branchShapeEl && _saved.branchShape) branchShapeEl.value = _saved.branchShape;
  if (branchShapeHeightSlider && _saved.branchShapeHeightPct != null) {
    branchShapeHeightSlider.value = _saved.branchShapeHeightPct;
    $('branch-shape-height-value').textContent = _saved.branchShapeHeightPct;
  }
  if (branchShapeWidthSlider && _saved.branchShapeWidth != null) {
    branchShapeWidthSlider.value = _branchShapeWidthToSlider(_saved.branchShapeWidth);
    $('branch-shape-width-value').textContent = _formatBranchShapeWidth(_saved.branchShapeWidth);
  }
  if (branchShapeAlignEl && _saved.branchShapeAlign) branchShapeAlignEl.value = _saved.branchShapeAlign;
  if (branchShapeSpacingSlider && _saved.branchShapeSpacing != null) {
    branchShapeSpacingSlider.value = _saved.branchShapeSpacing;
    $('branch-shape-spacing-value').textContent = _saved.branchShapeSpacing;
  }
  if (branchShapeColorEl && _saved.branchShapeColor) branchShapeColorEl.value = _saved.branchShapeColor;
  if (branchShapeHaloSlider && _saved.branchShapeHalo != null) {
    branchShapeHaloSlider.value = _saved.branchShapeHalo;
    $('branch-shape-halo-value').textContent = _saved.branchShapeHalo;
  }
  if (branchShapeHaloColorEl && _saved.branchShapeHaloColor) branchShapeHaloColorEl.value = _saved.branchShapeHaloColor;
  if (Array.isArray(_saved.branchShapesExtra)) {
    _saved.branchShapesExtra.forEach((v, i) => { if (branchShapeExtraEls[i]) branchShapeExtraEls[i].value = v; });
  }
  if (Array.isArray(_saved.branchShapesExtraColors)) {
    _saved.branchShapesExtraColors.forEach((v, i) => { if (branchShapeExtraColors[i] && v) branchShapeExtraColors[i].value = v; });
  }
  if (Array.isArray(_saved.branchShapesExtraColourBys)) {
    _saved.branchShapesExtraColourBys.forEach((v, i) => { if (branchShapeExtraColourBys[i]) branchShapeExtraColourBys[i].value = v; });
  }
  if (Array.isArray(_saved.branchShapesExtraCountBys)) {
    _saved.branchShapesExtraCountBys.forEach((v, i) => { if (branchShapeExtraCountBys[i]) branchShapeExtraCountBys[i].value = v; });
  }
  if (_saved.nodeShapeSize  != null) {
    nodeSlider.value = _saved.nodeShapeSize;
    $('node-size-value').textContent = _saved.nodeShapeSize;
  }
  if (_saved.nodeShapeHaloSize != null) {
    nodeHaloSlider.value = _saved.nodeShapeHaloSize;
    $('node-halo-value').textContent = _saved.nodeShapeHaloSize;
  }
  if (_saved.nodeShapeColor)       nodeShapeColorEl.value   = _saved.nodeShapeColor;
  if (_saved.nodeShapeBgColor)     nodeShapeBgEl.value      = _saved.nodeShapeBgColor;
  if (_saved.axisColor)            axisColorEl.value        = _saved.axisColor;
  if (_saved.axisTypefaceKey)       axisTypefaceEl.value   = _saved.axisTypefaceKey;
  { _populateStyleSelect(axisTypefaceEl?.value || fontFamilyEl.value, axisTypefaceStyleEl, _saved.axisTypefaceStyle, true); }
  if (_saved.axisFontSize != null) {
    axisFontSizeSlider.value = _saved.axisFontSize;
    $('axis-font-size-value').textContent = _saved.axisFontSize;
  }
  if (_saved.axisLineWidth != null) {
    axisLineWidthSlider.value = _saved.axisLineWidth;
    $('axis-line-width-value').textContent = _saved.axisLineWidth;
  }
  if (_saved.legendTextColor)      legendTextColorEl.value  = _saved.legendTextColor;
  if (_saved.legendFontSize != null) {
    legendFontSizeSlider.value = _saved.legendFontSize;
    $('legend-font-size-value').textContent = _saved.legendFontSize;
  }
  if (_saved.legendSpacing != null) {
    legendSpacingSlider.value = _saved.legendSpacing;
    $('legend-spacing-value').textContent = _saved.legendSpacing;
  }
  if (_saved.legendHeightPct != null) {
    legendHeightPctSlider.value = _saved.legendHeightPct;
    $('legend-height-pct-value').textContent = _saved.legendHeightPct + '%';
  }
  if (_saved.legendTypefaceKey)    legendTypefaceEl.value = _saved.legendTypefaceKey;
  else if (_saved.legendFontFamily) legendTypefaceEl.value = _saved.legendFontFamily; // bwc
  { _populateStyleSelect(legendTypefaceEl?.value || fontFamilyEl.value, legendTypefaceStyleEl, _saved.legendTypefaceStyle ?? _saved.legendFontStyle, true); }
  if (_saved.tipLabelAlign)        tipLabelAlignEl.value    = _saved.tipLabelAlign;
  if (_saved.nodeLabelPosition)    nodeLabelPositionEl.value = _saved.nodeLabelPosition;
  if (_saved.nodeLabelFontSize != null) {
    nodeLabelFontSizeSlider.value = _saved.nodeLabelFontSize;
    $('node-label-font-size-value').textContent = _saved.nodeLabelFontSize;
  }
  if (_saved.nodeLabelColor)       nodeLabelColorEl.value   = _saved.nodeLabelColor;
  if (_saved.nodeLabelSpacing != null) {
    nodeLabelSpacingSlider.value = _saved.nodeLabelSpacing;
    $('node-label-spacing-value').textContent = _saved.nodeLabelSpacing;
  }
  if (_saved.tipLabelSpacing != null) {
    tipLabelSpacingSlider.value = _saved.tipLabelSpacing;
    $('tip-label-spacing-value').textContent = _saved.tipLabelSpacing;
  }
  // Restore saved theme name; fall back to defaultTheme if no saved settings.
  // selectedTheme is the theme in use; defaultTheme is the starred/preferred one.
  if (themeSelect) themeSelect.value = _saved.selectedTheme ?? _saved.theme /* bwc */ ?? themeManager.defaultTheme;
  if (_saved.rttXOrigin)    rttXOriginEl.value    = _saved.rttXOrigin;
  if (_saved.rttGridLines)  rttGridLinesEl.value  = _saved.rttGridLines;
  if (_saved.rttAspectRatio) rttAspectRatioEl.value = _saved.rttAspectRatio;
  if (_saved.rttAxisColor != null)     rttAxisColorEl.value          = _saved.rttAxisColor;
  if (_saved.rttStatsBgColor   != null) rttStatsBgColorEl.value       = _saved.rttStatsBgColor;
  if (_saved.rttStatsTextColor != null) rttStatsTextColorEl.value     = _saved.rttStatsTextColor;
  if (_saved.rttRegressionStyle) rttRegressionStyleEl.value = _saved.rttRegressionStyle;
  if (_saved.rttRegressionColor != null) rttRegressionColorEl.value = _saved.rttRegressionColor;
  if (_saved.rttRegressionWidth != null) {
    rttRegressionWidthSlider.value = _saved.rttRegressionWidth;
    $('rtt-regression-width-value').textContent = _saved.rttRegressionWidth;
  }
  if (_saved.rttResidBandShow)   rttResidBandShowEl.value  = _saved.rttResidBandShow;
  if (_saved.rttResidBandStyle)  rttResidBandStyleEl.value = _saved.rttResidBandStyle;
  if (_saved.rttResidBandColor  != null) rttResidBandColorEl.value  = _saved.rttResidBandColor;
  if (_saved.rttResidBandWidth  != null) { rttResidBandWidthSlider.value = _saved.rttResidBandWidth; $('rtt-resid-band-width-value').textContent = _saved.rttResidBandWidth; }
  if (_saved.rttResidBandFillColor != null) rttResidBandFillColorEl.value = _saved.rttResidBandFillColor;
  if (_saved.rttResidBandFillOpacity != null) { rttResidBandFillOpacitySlider.value = _saved.rttResidBandFillOpacity; $('rtt-resid-band-fill-opacity-value').textContent = _saved.rttResidBandFillOpacity; }
  if (_saved.rttAxisFontSize != null) {
    rttAxisFontSizeSlider.value = _saved.rttAxisFontSize;
    $('rtt-axis-font-size-value').textContent = _saved.rttAxisFontSize;
  }
  if (_saved.rttStatsFontSize != null) {
    rttStatsFontSizeSlider.value = _saved.rttStatsFontSize;
    $('rtt-stats-font-size-value').textContent = _saved.rttStatsFontSize;
  }
  if (_saved.rttAxisTypefaceKey)        rttAxisFontFamilyEl.value     = _saved.rttAxisTypefaceKey;
  { _populateStyleSelect(rttAxisFontFamilyEl?.value || fontFamilyEl.value, rttAxisTypefaceStyleEl, _saved.rttAxisTypefaceStyle, true); }
  if (_saved.rttAxisLineWidth != null) {
    rttAxisLineWidthSlider.value = _saved.rttAxisLineWidth;
    $('rtt-axis-line-width-value').textContent = _saved.rttAxisLineWidth;
  }
  if (_saved.rttDateFormat)       rttDateFmtEl.value       = _saved.rttDateFormat;
  if (_saved.rttMajorInterval)    rttMajorIntervalEl.value = _saved.rttMajorInterval;
  _updateRttMinorOptions(rttMajorIntervalEl.value, _saved.rttMinorInterval || rttMinorIntervalEl.value);
  if (_saved.rttMajorLabelFormat) rttMajorLabelEl.value    = _saved.rttMajorLabelFormat;
  if (_saved.rttMinorLabelFormat) rttMinorLabelEl.value    = _saved.rttMinorLabelFormat;

  // Restore clade highlight style controls
  if (_saved.cladeHighlightColour       && cladeHighlightDefaultColourEl)    cladeHighlightDefaultColourEl.value    = _saved.cladeHighlightColour;
  if (_saved.cladeHighlightLeftEdge     && cladeHighlightLeftEdgeEl)         cladeHighlightLeftEdgeEl.value         = _saved.cladeHighlightLeftEdge;
  if (_saved.cladeHighlightRightEdge    && cladeHighlightRightEdgeEl)        cladeHighlightRightEdgeEl.value        = _saved.cladeHighlightRightEdge;
  if (_saved.cladeHighlightPadding != null && cladeHighlightPaddingSlider) {
    cladeHighlightPaddingSlider.value = _saved.cladeHighlightPadding;
    $('clade-highlight-padding-value') && ($('clade-highlight-padding-value').textContent = _saved.cladeHighlightPadding);
  }
  if (_saved.cladeHighlightRadius != null && cladeHighlightRadiusSlider) {
    cladeHighlightRadiusSlider.value = _saved.cladeHighlightRadius;
    $('clade-highlight-radius-value') && ($('clade-highlight-radius-value').textContent = _saved.cladeHighlightRadius);
  }
  if (_saved.cladeHighlightFillOpacity != null && cladeHighlightFillOpacitySlider) {
    cladeHighlightFillOpacitySlider.value = _saved.cladeHighlightFillOpacity;
    $('clade-highlight-fill-opacity-value') && ($('clade-highlight-fill-opacity-value').textContent = _saved.cladeHighlightFillOpacity);
  }
  if (_saved.cladeHighlightStrokeOpacity != null && cladeHighlightStrokeOpacitySlider) {
    cladeHighlightStrokeOpacitySlider.value = _saved.cladeHighlightStrokeOpacity;
    $('clade-highlight-stroke-opacity-value') && ($('clade-highlight-stroke-opacity-value').textContent = _saved.cladeHighlightStrokeOpacity);
  }
  if (_saved.cladeHighlightStrokeWidth != null && cladeHighlightStrokeWidthSlider) {
    cladeHighlightStrokeWidthSlider.value = _saved.cladeHighlightStrokeWidth;
    $('clade-highlight-stroke-width-value') && ($('clade-highlight-stroke-width-value').textContent = _saved.cladeHighlightStrokeWidth);
  }

  // Restore filter manager state
  // (only select values here — filterManager itself is created later;
  //  the definitions are loaded into it after creation below)
  const _filterSelectIds = ['nodeBarsFilter', 'nodeLabelsFilter', 'branchLabelsFilter', 'branchShapesFilter', 'tipLabelsFilter', 'nodeShapesFilter', 'tipShapesFilter'];
  const _filterSelectEls = [nodeBarsFilterEl, nodeLabelsFilterEl, branchLabelsFilterEl, branchShapesFilterEl, tipLabelsFilterEl, nodeShapesFilterEl, tipShapesFilterEl];
  for (let i = 0; i < _filterSelectIds.length; i++) {
    const val = _saved[_filterSelectIds[i]];
    if (val && _filterSelectEls[i]) _filterSelectEls[i].value = val;
  }
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = container.clientWidth  + 'px';
  canvas.style.height = container.clientHeight + 'px';
  canvas.width  = container.clientWidth  * dpr;
  canvas.height = container.clientHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderer = new TreeRenderer(canvas, _buildRendererSettings());
  const layoutDebugEnabled = (() => {
    const dbgCfg = !!(window.peartreeConfig?.debug?.layoutSolver);
    const dbgUrl = (() => {
      try {
        const v = new URLSearchParams(location.search).get('layoutDebug');
        return v === '1' || v === 'true' || v === 'on';
      } catch {
        return false;
      }
    })();
    return dbgCfg || dbgUrl;
  })();
  renderer.setLayoutSolverDebug(layoutDebugEnabled);

  // ── Status-bar transient messages ─────────────────────────────────────────
  const _statusMsgEl = $('status-message');
  let   _statusMsgTimer = null;
  function statusMessage(msg, duration = 0) {
    if (!_statusMsgEl) return;
    clearTimeout(_statusMsgTimer);
    _statusMsgEl.textContent = msg;
    _statusMsgEl.classList.toggle('visible', !!msg);
    if (duration > 0) _statusMsgTimer = setTimeout(() => statusMessage(''), duration);
  }

  renderer.onHypActivate   = () => statusMessage('Lens mode active \u2013 press Esc to cancel');
  renderer.onHypDeactivate = () => statusMessage('');
  renderer.onLabelsHiddenByZoom = (hidden) => {
    statusMessage(hidden ? 'Tip labels hidden \u2013 zoom in to show' : '');
  };

  const _statusSelectEl = $('status-select');
  function _updateStatusSelect(count) {
    if (!_statusSelectEl) return;
    if (count > 0) {
      _statusSelectEl.innerHTML =
        `<span class="st-lbl">Selected\u2009</span><span class="st-val">${count}</span><span class="st-sep"> |</span>`;
      _statusSelectEl.classList.add('visible');
    } else {
      _statusSelectEl.innerHTML = '';
      _statusSelectEl.classList.remove('visible');
    }
  }

  renderer._onStatsChange = (stats) => {
    const el = $('status-stats');
    if (!el) return;
    if (!stats) { el.innerHTML = ''; return; }
    el.innerHTML =
      `<span class="st-lbl">Tips\u2009</span><span class="st-val">${stats.tipCount}</span>` +
      `<span class="st-sep"> | </span>` +
      `<span class="st-lbl">Dist\u2009</span><span class="st-val">${stats.distance.toFixed(5)}</span>` +
      `<span class="st-sep"> | </span>` +
      `<span class="st-lbl">Age\u2009</span><span class="st-val">${stats.height.toFixed(5)}</span>` +
      `<span class="st-sep"> | </span>` +
      `<span class="st-lbl">Length\u2009</span><span class="st-val">${stats.totalLength.toFixed(5)}</span>` +
      (stats.subtreeLength != null
        ? `<span class="st-sep"> | </span>` +
          `<span class="st-lbl">Subtree\u2009</span><span class="st-val">${stats.subtreeLength.toFixed(5)}</span>`
        : '');
  };

  // ── Share-URL button ───────────────────────────────────────────────────────
  // Shown only when the current tree was loaded from a URL (via the URL tab
  // in the Open Tree modal, or via the ?treeUrl= startup parameter).
  // Clicking it copies a peartree.live share link to the clipboard.
  const _shareUrlBtn = $('btn-share-url');
  function _updateShareUrlBtn() {
    if (!_shareUrlBtn) return;
    if (!_cfg.showStatusShare) {
      _shareUrlBtn.classList.add('d-none');
      _shareUrlBtn.onclick = null;
      return;
    }
    if (_treeSourceUrl) {
      _shareUrlBtn.classList.remove('d-none');
      _shareUrlBtn.onclick = async () => {
        const shareUrl = 'https://peartree.live/?treeUrl=' + encodeURIComponent(_treeSourceUrl);
        try {
          await navigator.clipboard.writeText(shareUrl);
          statusMessage('Link copied!', 2000);
        } catch (_err) {
          statusMessage('Could not copy: ' + _err.message, 3000);
        }
      };
    } else {
      _shareUrlBtn.classList.add('d-none');
      _shareUrlBtn.onclick = null;
    }
  }

  // ── Legend renderer ────────────────────────────────────────────────────────
  // Must be created before applyTheme() (which calls legendRenderer.setTextColor).
  const legendRenderer = new LegendRenderer(
    legendRightCanvas,
    legend2RightCanvas,
    legend3RightCanvas,
    legend4RightCanvas,
    {
      fontSize:       parseInt(legendFontSizeSlider.value),
      textColor:      legendTextColorEl.value,
      bgColor:        canvasBgColorEl.value,
      layoutSpacing:  parseInt(DEFAULT_SETTINGS.legendSpacing),
      heightPct:      parseInt(DEFAULT_SETTINGS.legendHeightPct),
      heightPct2:  parseInt(DEFAULT_SETTINGS.legendHeightPct2),
      heightPct3:  parseInt(DEFAULT_SETTINGS.legendHeightPct3),
      heightPct4:  parseInt(DEFAULT_SETTINGS.legendHeightPct4),
      decimalPlaces:  DEFAULT_SETTINGS.legendDecimalPlaces,
      decimalPlaces2: DEFAULT_SETTINGS.legendDecimalPlaces2,
      decimalPlaces3: DEFAULT_SETTINGS.legendDecimalPlaces3,
      decimalPlaces4: DEFAULT_SETTINGS.legendDecimalPlaces4,
    },
  );
  renderer.setLegendRenderer(legendRenderer);

  // Clicking a categorical legend entry selects all tips with that annotation value.
  legendRenderer.onCategoryClick = (value, additive) => {
    if (!renderer.nodeMap) return;
    const key = legendRenderer._annotation;
    if (!key) return;
    const ids = [];
    for (const [id, n] of renderer.nodeMap) {
      if (!n.isTip) continue;
      if (n.annotations?.[key] === value) ids.push(id);
    }
    if (additive && renderer._selectedTipIds?.size > 0) {
      const sel = new Set(renderer._selectedTipIds);
      const allSelected = ids.every(id => sel.has(id));
      if (allSelected) { ids.forEach(id => sel.delete(id)); }
      else             { ids.forEach(id => sel.add(id));    }
      renderer._selectedTipIds = sel;
    } else {
      renderer._selectedTipIds = new Set(ids);
    }
    renderer._mrcaNodeId = null;
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(renderer._selectedTipIds.size > 0);
    renderer._dirty = true;
  };
  // Same for legend 2 categorical entries.
  legendRenderer.onCategoryClick2 = (value, additive) => {
    if (!renderer.nodeMap) return;
    const key2 = legendRenderer._annotation2;
    if (!key2) return;
    const ids = [];
    for (const [id, n] of renderer.nodeMap) {
      if (!n.isTip) continue;
      if (n.annotations?.[key2] === value) ids.push(id);
    }
    if (additive && renderer._selectedTipIds?.size > 0) {
      const sel = new Set(renderer._selectedTipIds);
      const allSelected = ids.every(id => sel.has(id));
      if (allSelected) { ids.forEach(id => sel.delete(id)); }
      else             { ids.forEach(id => sel.add(id));    }
      renderer._selectedTipIds = sel;
    } else {
      renderer._selectedTipIds = new Set(ids);
    }
    renderer._mrcaNodeId = null;
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(renderer._selectedTipIds.size > 0);
    renderer._dirty = true;
  };
  legendRenderer.onCategoryClick3 = (value, additive) => {
    if (!renderer.nodeMap) return;
    const key3 = legendRenderer._annotation3;
    if (!key3) return;
    const ids = [];
    for (const [id, n] of renderer.nodeMap) {
      if (!n.isTip) continue;
      if (n.annotations?.[key3] === value) ids.push(id);
    }
    if (additive && renderer._selectedTipIds?.size > 0) {
      const sel = new Set(renderer._selectedTipIds);
      const allSelected = ids.every(id => sel.has(id));
      if (allSelected) { ids.forEach(id => sel.delete(id)); }
      else             { ids.forEach(id => sel.add(id));    }
      renderer._selectedTipIds = sel;
    } else {
      renderer._selectedTipIds = new Set(ids);
    }
    renderer._mrcaNodeId = null;
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(renderer._selectedTipIds.size > 0);
    renderer._dirty = true;
  };
  legendRenderer.onCategoryClick4 = (value, additive) => {
    if (!renderer.nodeMap) return;
    const key4 = legendRenderer._annotation4;
    if (!key4) return;
    const ids = [];
    for (const [id, n] of renderer.nodeMap) {
      if (!n.isTip) continue;
      if (n.annotations?.[key4] === value) ids.push(id);
    }
    if (additive && renderer._selectedTipIds?.size > 0) {
      const sel = new Set(renderer._selectedTipIds);
      const allSelected = ids.every(id => sel.has(id));
      if (allSelected) { ids.forEach(id => sel.delete(id)); }
      else             { ids.forEach(id => sel.add(id));    }
      renderer._selectedTipIds = sel;
    } else {
      renderer._selectedTipIds = new Set(ids);
    }
    renderer._mrcaNodeId = null;
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(renderer._selectedTipIds.size > 0);
    renderer._dirty = true;
  };

  /**
   * For each visible categorical legend, compute which category values the
   * currently-selected tips have, and update LegendRenderer so those rows
   * are highlighted.
   */
  function _syncLegendSelection() {
    if (!legendRenderer || !renderer.nodeMap) return;
    legendRenderer.setSelectedColors(
      selectedTipStrokeEl.value,
      selectedTipFillEl.value,
    );
    const selIds = renderer._selectedTipIds;
    const hasSelection = selIds?.size > 0;
    const legends = [
      { n: 1, key: legendRenderer._annotation },
      { n: 2, key: legendRenderer._annotation2 },
      { n: 3, key: legendRenderer._annotation3 },
      { n: 4, key: legendRenderer._annotation4 },
    ];
    for (const { n, key } of legends) {
      if (!key || !hasSelection) {
        legendRenderer.setSelectedValues(n, null);
        continue;
      }
      const values = new Set();
      for (const [id, node] of renderer.nodeMap) {
        if (!node.isTip || !selIds.has(id)) continue;
        const v = node.annotations?.[key];
        if (v != null) values.add(v);
      }
      legendRenderer.setSelectedValues(n, values.size > 0 ? values : null);
    }
  }

  // ── Axis renderer ─────────────────────────────────────────────────────────
  // Must be created before applyTheme() is called below (applyTheme references
  // axisRenderer, and const bindings have TDZ — calling the function before this
  // line would throw "Cannot access 'axisRenderer' before initialization").
  const axisRenderer = new AxisRenderer(axisCanvas, {
    axisColor:  axisColorEl.value,
    fontSize:   parseInt(axisFontSizeSlider.value),
    lineWidth:  parseFloat(axisLineWidthSlider.value),
    spacingTop: parseInt(DEFAULT_SETTINGS.axisSpacingTop),
  });
  axisRenderer.setLayoutDebug(layoutDebugEnabled);

  // Shared time-calibration state for the current tree.
  // setAnchor() is called when the tree is loaded or the annotation selection changes.
  // axisRenderer.setCalibration() is called by applyAxis() to activate it on the axis.
  calibration = new TreeCalibration();

  // Apply stored visual settings to the renderer immediately.
  // For embeds (storageKey=null) there are no stored colour customisations, so
  // always apply the theme (or the default) to get correct colours.
  // For the standalone app, if a named (non-custom) theme was saved, always
  // Apply the saved theme on startup.
  // If selectedTheme is 'custom', reset it to defaultTheme and apply that instead —
  // custom is a transient state that cannot be meaningfully restored by name.
  // For embeds with no storage (storageKey === null), apply whatever was passed in
  // initSettings, falling back to defaultTheme.
  {
    const _st = _saved.selectedTheme ?? _saved.theme /* bwc */;
    if (_st && _st !== 'custom') {
      applyTheme(_st);
    } else {
      // No saved theme, or saved theme was 'custom' — fall back to defaultTheme.
      applyTheme(themeManager.defaultTheme);
      // Also update the in-memory snapshot so saveSettings() below records the correct name.
      if (themeSelect) themeSelect.value = themeManager.defaultTheme;
    }
  }

  // applyTheme sets a complete visual baseline (including font sizes).
  // Re-apply explicit saved/init visual keys afterwards so URL-provided
  // overrides like settings.tipLabelFontSize win over the selected theme defaults.
  _applyVisualSettingsFromFile(_saved);

  // Always sync legend/axis font families after renderer init — applyTheme does
  // this when called, but the else branch above skips applyTheme entirely.
  _applyLegendTypeface();
  _applyAxisTypeface();

  // dataTableRenderer is declared early (see hoist above); initialised below
  // after the panel DOM is ready via createDataTableRenderer().

  renderer._onViewChange = (scaleX, offsetX, treePaddingLeft, treePaddingRight, labelRightPad, bgColor, fontSize, dpr) => {
    axisRenderer.update(scaleX, offsetX, treePaddingLeft, treePaddingRight, labelRightPad, bgColor, fontSize, dpr);
    // Fill any subpixel gap between the tree canvas and axis canvas with the
    // canvas background colour rather than the page background.
    _syncCanvasWrapperBg(bgColor);
    // Keep data table rows aligned with the tree canvas.
    dataTableRenderer?.syncView();
    _updateScrollY();
  };

  renderer.setAxisDecorationOverflowProvider((view, overhang) => axisRenderer.getDecorationOverflow(view, overhang));
  renderer.setAxisDecorationDebugProvider?.(() => axisRenderer.getDecorationOverflowStats?.());
  axisRenderer.setDecorationOverhangSink?.((overhang) => renderer._recordDecorationOverhang?.(overhang));

  // ── Vertical scrollbar ────────────────────────────────────────────────────

  function _updateScrollY() {
    const sb = $('tree-scroll-y');
    if (!sb || !renderer.nodes || !_cfg.showScrollBar) { sb?.style && (sb.style.display = 'none'); return; }
    const H      = renderer.canvas.clientHeight;
    const scaleY = renderer.scaleY;
    const maxOY  = renderer.treePaddingTop    - scaleY;
    const minOY  = (H - renderer.treePaddingBottom) - renderer.maxY * scaleY;
    const range  = maxOY - minOY;
    if (range <= 1) { sb.style.display = 'none'; return; }
    const tw = $('tree-wrapper');
    sb.style.display = 'block';
    sb.style.top    = (tw ? tw.offsetTop : 0) + 'px';
    sb.style.height = renderer.canvas.clientHeight + 'px';
    const trackH  = sb.clientHeight;
    const viewH   = H - renderer.treePaddingTop - renderer.treePaddingBottom;
    const totalH  = Math.max(1, renderer.maxY - 1) * scaleY;
    const thumbH  = Math.max(20, Math.round(Math.min(trackH, trackH * viewH / totalH)));
    const scrollableTrack = trackH - thumbH;
    const fraction = scrollableTrack > 0 ? (maxOY - renderer.offsetY) / range : 0;
    const thumbTop = Math.round(Math.max(0, Math.min(scrollableTrack, fraction * scrollableTrack)));
    const thumb = $('tree-scroll-y-thumb');
    if (thumb) { thumb.style.height = thumbH + 'px'; thumb.style.top = thumbTop + 'px'; }
  }

  (function _initScrollY() {
    const sb    = $('tree-scroll-y');
    const thumb = $('tree-scroll-y-thumb');
    if (!sb || !thumb) return;

    let _dragStartClientY = null, _dragStartOffsetY = null;

    thumb.addEventListener('pointerdown', e => {
      _dragStartClientY = e.clientY;
      _dragStartOffsetY = renderer._targetOffsetY;
      thumb.setPointerCapture(e.pointerId);
      thumb.classList.add('dragging');
      e.stopPropagation();
      e.preventDefault();
    });
    thumb.addEventListener('pointermove', e => {
      if (_dragStartClientY === null) return;
      const dy = e.clientY - _dragStartClientY;
      const H      = renderer.canvas.clientHeight;
      const scaleY = renderer._targetScaleY;
      const maxOY  = renderer.treePaddingTop    - scaleY;
      const minOY  = (H - renderer.treePaddingBottom) - renderer.maxY * scaleY;
      const range  = maxOY - minOY;
      if (range <= 0) return;
      const trackH = sb.clientHeight;
      const viewH  = H - renderer.treePaddingTop - renderer.treePaddingBottom;
      const totalH = Math.max(1, renderer.maxY - 1) * scaleY;
      const thumbH = Math.max(20, Math.round(Math.min(trackH, trackH * viewH / totalH)));
      const scrollableTrack = trackH - thumbH;
      if (scrollableTrack <= 0) return;
      renderer._setTarget(_dragStartOffsetY - (dy / scrollableTrack) * range,
                          renderer._targetScaleY, /*immediate*/ true);
      _updateScrollY();
    });
    thumb.addEventListener('pointerup', () => {
      _dragStartClientY = null;
      thumb.classList.remove('dragging');
    });

    // Click on track: jump scroll position
    sb.addEventListener('pointerdown', e => {
      if (e.target === thumb) return;
      const rect   = sb.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackH = rect.height;
      const H      = renderer.canvas.clientHeight;
      const scaleY = renderer._targetScaleY;
      const maxOY  = renderer.treePaddingTop    - scaleY;
      const minOY  = (H - renderer.treePaddingBottom) - renderer.maxY * scaleY;
      const range  = maxOY - minOY;
      if (range <= 0) return;
      const viewH  = H - renderer.treePaddingTop - renderer.treePaddingBottom;
      const totalH = Math.max(1, renderer.maxY - 1) * scaleY;
      const thumbH = Math.max(20, Math.round(Math.min(trackH, trackH * viewH / totalH)));
      const scrollableTrack = trackH - thumbH;
      const fraction = scrollableTrack > 0 ? (clickY - thumbH / 2) / scrollableTrack : 0;
      renderer._setTarget(maxOY - fraction * range, renderer._targetScaleY, /*immediate*/ false);
    });
  })();

  function _syncAxisSubtreeParams(maxX, viewSubtreeRootId, viewNodes) {
    // Only date-axis mode needs calibrated root/min-tip heights.
    const usingDateAxis = axisShowEl.value === 'time' && calibration?.isActive;
    if (!usingDateAxis) {
      axisRenderer.setSubtreeParams({
        maxX,
        rootHeight: 0,
        minTipH: 0,
      });
      return;
    }

    const hMap = renderer._globalHeightMap;
    const rootLayoutNode = viewNodes.find(n => !n.parentId);
    const rootH = rootLayoutNode ? (hMap.get(rootLayoutNode.id) ?? 0) : 0;
    const viewRootH = viewSubtreeRootId ? (hMap.get(viewSubtreeRootId) ?? rootH) : rootH;
    let minTipH = Infinity;
    for (const n of viewNodes) {
      if (!n.isTip) continue;
      const h = hMap.get(n.id);
      if (h != null && h < minTipH) minTipH = h;
    }
    if (!isFinite(minTipH)) minTipH = 0;
    axisRenderer.setSubtreeParams({
      maxX:       viewRootH - minTipH,
      rootHeight: viewRootH,
      minTipH:    minTipH,
    });
  }

  // Update axis time span whenever navigation drills into or out of a subtree.
  // Reads renderer._globalHeightMap directly so the values are always current,
  // even after rerooting (which rebuilds the map via _buildGlobalHeightMap).
  renderer._onLayoutChange = (maxX, viewSubtreeRootId) => {
    // Sync data table with new tip layout
    const viewNodes = renderer.nodes || [];
    dataTableRenderer?.setTips(viewNodes.filter(n => n.isTip));
    // Recompute temporal annotations for the new visible tip set (re-root,
    // subtree navigation, tip hide/show all fire this callback).
    _recomputeTemporalAnnotations();
    // Sync RTT plot with new visible tip set
    rttChart?.notifyLayoutChange?.();

    // Always keep axis bounds in sync with the current tree layout.
    _syncAxisSubtreeParams(maxX, viewSubtreeRootId, viewNodes);
    if (axisShowEl.value !== 'off') _applyAxisRange();
    _emitVisibleChanged();
  };

  // Restore axis visibility from saved settings (map legacy 'on' to 'forward')
  const _savedAxisShow = _saved.axisShow === 'on' ? 'forward' : (_saved.axisShow || 'off');
  if (_savedAxisShow !== 'off') {
    axisShowEl.value = _savedAxisShow;
    // Don't reveal the canvas yet — keep it hidden until a tree is loaded.
    axisRenderer.setDirection(_savedAxisShow);
    axisRenderer.setVisible(true);
  }
  // Restore tick options
  if (_saved.axisMajorInterval)    axisMajorIntervalEl.value    = _saved.axisMajorInterval;
  _updateMinorOptions(axisMajorIntervalEl.value, _saved.axisMinorInterval || 'off');
  if (_saved.axisMajorLabelFormat) axisMajorLabelEl.value       = _saved.axisMajorLabelFormat;
  if (_saved.axisMinorLabelFormat) axisMinorLabelEl.value       = _saved.axisMinorLabelFormat;
  if (_saved.axisDateFormat)       axisDateFmtEl.value          = _saved.axisDateFormat;

  // Hide the initial loading overlay; the Open Tree modal replaces it on startup
  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }

  // ── Modal management ──────────────────────────────────────────────────────

  const modal         = $('open-tree-modal');
  const btnModalClose = $('btn-modal-close');

  function openModal() {
    setModalError(null);
    setModalLoading(false);
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    // If no tree has been loaded yet, restore the empty-state overlay
    if (!treeLoaded) {
      const es = $('empty-state');
      if (es) es.classList.remove('hidden');
    }
  }

  function setModalError(msg) {
    const el = $('modal-error');
    if (msg) { el.textContent = msg; el.style.display = 'block'; }
    else      { el.style.display = 'none'; }
  }

  /** Show a simple standalone error dialog with an OK button. */
  function showErrorDialog(msg) {
    const overlay = $('error-dialog-overlay');
    $('error-dialog-msg').textContent = msg;
    overlay.classList.add('open');
  }

  $('error-dialog-ok').addEventListener('click', () => {
    $('error-dialog-overlay').classList.remove('open');
  });

  function setModalLoading(on) {
    $('modal-loading').style.display = on ? 'block' : 'none';
    modal.querySelectorAll('.pt-modal-body button, .pt-tab-btn').forEach(b => {
      if (b !== btnModalClose) b.disabled = on;
    });
  }

  // Tab switching
  modal.querySelectorAll('.pt-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.pt-tab-btn').forEach(b => b.classList.remove('active'));
      modal.querySelectorAll('.pt-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('tab-panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Close button — always enabled; returns to empty-state if no tree loaded yet
  btnModalClose.addEventListener('click', () => closeModal());

  // ── Unified keyboard handler for all modal overlays ──────────────────────
  // capture:true ensures we intercept before focused elements inside modals can swallow the event
  if (_cfg.enableKeyboard) document.addEventListener('keydown', e => {
    const inTextField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) &&
      !['checkbox', 'radio'].includes(document.activeElement?.type);

    if (e.key === 'Escape') {
      // Close innermost open overlay first.
      if ($('parse-tips-overlay')?.classList.contains('open'))    { /* handled by annotation-manager */ return; }
      if ($('export-graphic-overlay')?.classList.contains('open')) { exportCtrl.closeGraphicsDialog(); return; }
      if ($('export-tree-overlay')?.classList.contains('open'))    { exportCtrl.closeExportDialog();   return; }
      if (annotConfigOverlay?.classList.contains('open')) { annotConfigOverlay.classList.remove('open'); return; }
      if ($('curate-annot-overlay')?.classList.contains('open')) { annotCurator.close(); return; }
      if ($('manage-filters-overlay')?.classList.contains('open')) { filterManager.close(); return; }
      if ($('palette-manager-overlay')?.classList.contains('open')) { paletteManager.close(); return; }
      if ($('import-annot-overlay')?.classList.contains('open'))  { annotImporter.close(); return; }
      const nodeInfoOv = $('node-info-overlay');
      if (nodeInfoOv && nodeInfoOv.classList.contains('open')) { nodeInfoOv.classList.remove('open'); return; }
      if (modal.classList.contains('open'))  { closeModal();           return; }
    }

    if (e.key === 'Enter' && !e.shiftKey && !inTextField) {
      if ($('export-graphic-overlay')?.classList.contains('open')) {
        $('expg-download-btn')?.click(); return;
      }
      if ($('export-tree-overlay')?.classList.contains('open')) {
        $('exp-download-btn')?.click(); return;
      }
      if ($('import-annot-overlay')?.classList.contains('open')) {
        const apply = $('imp-apply-btn');
        if (apply) { apply.click(); return; }
        ($('imp-close-btn') ||
         $('imp-close-err-btn') ||
         $('imp-picker-cancel-btn'))?.click();
        return;
      }
      const nodeInfoOv2 = $('node-info-overlay');
      if (nodeInfoOv2 && nodeInfoOv2.classList.contains('open')) { nodeInfoOv2.classList.remove('open'); return; }
      if (modal.classList.contains('open'))  { closeModal(); return; }
    }

  }, { capture: true });

  // ── File tab ──────────────────────────────────────────────────────────────

  const dropZone  = $('tree-drop-zone');
  const fileInput = $('tree-file-input');

  $('btn-file-choose').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = '';  // reset so the same file can be re-selected
  });

  _wireDropZone(dropZone, file => { if (file) handleFile(file); });

  async function handleFile(file) {
    setModalLoading(true);
    setModalError(null);
    try {
      const text = await file.text();
      await loadTree(text, file.name);
    } catch (err) {
      setModalError(err.message);
      setModalLoading(false);
    }
  }

  /** Opens a tree file. Delegates to window.peartree.pickFile(), which defaults
   *  to clicking the hidden <input type="file"> but can be overridden by a
   *  platform adapter (e.g. peartree-tauri.js) to use a native dialog. */
  async function pickTreeFile() {
    await window.peartree.pickFile();
  }

  // ── URL tab ───────────────────────────────────────────────────────────────

  $('btn-load-url').addEventListener('click', async () => {
    const url = $('tree-url-input').value.trim();
    if (!url) { setModalError('Please enter a URL.'); return; }
    setModalLoading(true);
    setModalError(null);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' – ' + url);
      const text = await resp.text();
      await loadTree(text, url.split('/').pop() || 'tree');
      _treeSourceUrl = url;
      _updateShareUrlBtn();
    } catch (err) {
      setModalError(err.message);
      setModalLoading(false);
    }
  });

  // ── Example tab ───────────────────────────────────────────────────────────

  async function loadExampleByPath(path, onError) {
    try {
      const text = await fetchWithFallback(path);
      await loadTree(text, path);
    } catch (err) {
      onError(err.message);
    }
  }

  // Build the example dataset list.
  {
    const listEl = $('example-dataset-list');
    if (listEl) {
      for (const ds of EXAMPLE_DATASETS) {
        const item = document.createElement('div');
        item.className = 'pt-example-item';
        const desc = document.createElement('div');
        desc.className = 'pt-example-desc';
        desc.innerHTML = `<strong>${_esc(ds.title)}</strong>${_esc(ds.description)}`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-success flex-shrink-0';
        btn.innerHTML = '<i class="bi bi-tree me-1"></i>Load';
        btn.addEventListener('click', () => {
          setModalLoading(true);
          setModalError(null);
          loadExampleByPath(ds.path, msg => { setModalError(msg); setModalLoading(false); });
        });
        item.appendChild(desc);
        item.appendChild(btn);
        listEl.appendChild(item);
      }
    }
  }

  // ── Empty-state overlay (shown until first tree load) ──────────────────
  const emptyStateEl = $('empty-state');

  function hideEmptyState() { emptyStateEl.classList.add('hidden'); }
  function showEmptyState() { if (!treeLoaded) emptyStateEl.classList.remove('hidden'); }
  function showEmptyStateError(msg) {
    const el = $('empty-state-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? '' : 'none';
  }

  $('empty-state-open-btn').addEventListener('click', () => pickTreeFile());
  $('empty-state-example-btn').addEventListener('click', () => {
    hideEmptyState();
    loadExampleByPath(EXAMPLE_DATASETS[0]?.path ?? EXAMPLE_TREE_PATH,
                      msg => { showEmptyState(); showErrorDialog(msg); });
  });
  _wireDropZone(emptyStateEl, file => { if (file) { openModal(); handleFile(file); } }, { checkContains: true });

  // ── Import Annotations ──────────────────────────────────────────────────
  const annotImporter = createAnnotImporter({
    getGraph: () => graph,
    isTip: n => n.adjacents.length === 1,
    onApply: (g, importedCols = []) => {
      _refreshAnnotationUIs(g.annotationSchema);
      renderer.setAnnotationSchema(g.annotationSchema);
      axisRenderer.setHeightFormatter(g.annotationSchema.get('height')?.fmt ?? null);
      // If the imported columns include user_colour, auto-switch tip colour-by
      // to user_colour (same behaviour as the paintbrush apply button).
      if (importedCols.includes('user_colour')) {
        tipColourBy.value = 'user_colour';
      }
      renderer.setTipColourBy(tipColourBy.value      || null);
      renderer.setNodeColourBy(nodeColourBy.value    || null);
      renderer.setLabelColourBy(labelColourBy.value  || null);
      renderer.setTipLabelShapeColourBy(tipLabelShapeColourBy.value || null);
      renderer.setSettings(_buildRendererSettings());
      for (let _i = 0; _i < EXTRA_SHAPE_COUNT; _i++)
        renderer.setTipLabelShapeExtraColourBy(_i, tipLabelShapeExtraColourBys[_i].value || null);
      renderer.setTipLabelsOff(tipLabelShow.value === 'off');
      if (tipLabelShow.value !== 'off') renderer.setTipLabelAnnotation(_isTipNameValue(tipLabelShow.value) ? null : tipLabelShow.value);
      applyLegend();
      renderer._dirty = true;
      rttChart?.notifyStyleChange?.();
    },
  });
  btnImportAnnot?.addEventListener('click', () => commands.execute('import-annot'));

  // ── Curate Annotations ───────────────────────────────────────────────────
  const annotCurator = createAnnotCurator({
    getGraph: () => graph,
    isTip: n => n.adjacents.length === 1,
    subjectLabel: 'tip names',
    onApply: (schema) => {
      _refreshAnnotationUIs(schema);
      renderer.setAnnotationSchema(schema);
      axisRenderer.setHeightFormatter(schema.get('height')?.fmt ?? null);
      applyLegend();
      dataTableRenderer.invalidate();
      // In pinned mode the panel may have resized — keep canvas in sync.
      if (dataTableRenderer.isPinned()) _resizeDuringTransition();
      renderer._dirty = true;
    },
    getTableColumns: () => {
      const { columns, showNames } = dataTableRenderer.getState();
      return showNames ? ['__names__', ...columns] : columns;
    },
    onTableColumnsChange: (cols) => {
      dataTableRenderer.setColumns(cols);
      // Canvas only needs resizing when the panel is pinned.
      if (dataTableRenderer.isPinned()) _resizeDuringTransition();
    },
    getAnnotationPalette: (key) => annotationPalettes.get(key) ?? null,
    onPaletteChange: (key, paletteName) => {
      annotationPalettes.set(key, paletteName);
      renderer.setAnnotationPalette(key, paletteName, !!annotationPaletteReverses.get(key));
      _syncPaletteSelects(key, paletteName);
      renderer._dirty = true;
    },
    getAnnotationScaleMode: (key) => annotationScaleModes.get(key) ?? '',
    onScaleModeChange: (key, mode) => {
      if (mode) annotationScaleModes.set(key, mode);
      else annotationScaleModes.delete(key);
      renderer.setAnnotationScaleMode(key, mode);
      _syncScaleModeSelects(key, mode);
      renderer._dirty = true;
    },
    onConfigureClick: (key) => openAnnotConfig(key),
  });
  btnCurateAnnot?.addEventListener('click', () => commands.execute('curate-annot'));

  // ── Filter Manager ───────────────────────────────────────────────────────
  filterManager = createFilterManager({
    getSchema: () => graph?.annotationSchema ?? null,
    onFiltersChange: (map) => {
      renderer?.setFilterDefinitions(map);
      _refreshFilterUIs(map);
      saveSettings();
    },
    showConfirm: (t, m, opts) => showConfirmDialog(t, m, { okLabel: 'OK', cancelLabel: 'Cancel', ...opts }),
  });
  // Restore saved filter definitions now that filterManager exists
  if (_saved.filters) {
    try {
      const arr = Array.isArray(_saved.filters) ? _saved.filters : JSON.parse(_saved.filters);
      if (Array.isArray(arr)) {
        const map = new Map(arr.map(f => [f.id, f]));
        filterManager.setAll(map);
        _refreshFilterUIs(map);
        // Re-apply saved select values (dropdowns now have the filter options)
        for (let i = 0; i < _filterSelectIds.length; i++) {
          const val = _saved[_filterSelectIds[i]];
          if (val && _filterSelectEls[i]) _filterSelectEls[i].value = val;
        }
        renderer?.setFilterDefinitions(map);
      }
    } catch (_) { /* corrupt saved data — silently skip */ }
  }
  btnManageFilters?.addEventListener('click', () => commands.execute('manage-filters'));

  // ── Palette Manager ──────────────────────────────────────────────────────
  paletteManager = createPaletteManager({
    onPalettesChange: (userCat, userSeq) => {
      setUserCategoricalPalettes(userCat);
      setUserSequentialPalettes(userSeq);
      saveSettings();
    },
    showConfirm: (t, m, opts) => showConfirmDialog(t, m, { okLabel: 'OK', cancelLabel: 'Cancel', ...opts }),
  });
  // Seed the global palette registry with any persisted user palettes
  setUserCategoricalPalettes(paletteManager.getUserCategorical());
  setUserSequentialPalettes(paletteManager.getUserSequential());
  btnManagePalettes?.addEventListener('click', () => commands.execute('manage-palettes'));

  /** Repopulate all 6 filter <select> elements from the current filter map. */
  function _refreshFilterUIs(filterMap) {
    const selects = [
      nodeBarsFilterEl, nodeLabelsFilterEl, branchLabelsFilterEl,
      branchShapesFilterEl, tipLabelsFilterEl, nodeShapesFilterEl, tipShapesFilterEl,
    ];
    for (const sel of selects) {
      if (!sel) continue;
      const current = sel.value;
      // Keep only the '— always —' placeholder, then re-add filters
      sel.innerHTML = '<option value="">— always —</option>';
      for (const [id, f] of filterMap) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = f.name || id;
        sel.appendChild(opt);
      }
      // Restore previous selection if still available
      if (current && [...filterMap.keys()].includes(current)) sel.value = current;
      else sel.value = '';
      sel.disabled = filterMap.size === 0;
    }
    filterControl?.setNamedFilters(filterMap);
  }

  // Wire filter dropdown change events
  function _onFilterSelectChange() { _applyFilterSelects(); saveSettings(); }

  optionsController.on('node-bars-filter', _onFilterSelectChange);
  optionsController.on('node-labels-filter', _onFilterSelectChange);
  optionsController.on('branch-labels-filter', _onFilterSelectChange);
  optionsController.on('branch-shapes-filter', _onFilterSelectChange);
  optionsController.on('tip-labels-filter', _onFilterSelectChange);
  optionsController.on('node-shapes-filter', _onFilterSelectChange);
  optionsController.on('tip-shapes-filter', _onFilterSelectChange);

  function _applyFilterSelects() {
    if (!renderer) return;
    renderer.setSettings(_buildRendererSettings());
    renderer._dirty = true;
  }

  // ── Data Table Panel ─────────────────────────────────────────────────────
  dataTableRenderer = createDataTableRenderer({
    getRenderer:  () => renderer,
    panel:        $('data-table-panel'),
    headerEl:     $('dt-header'),
    bodyEl:       $('dt-body'),
    numHeaderEl:  $('dt-num-header'),
    numBodyEl:    $('dt-num-body'),
    onClose: () => {
      btnDataTable?.classList.remove('active');
      _syncSidePanelStack();
      saveSettings();
      _syncDtLabel?.();
    },
    onPinChange: (pinned) => {
      document.body.classList.toggle('dt-pinned', pinned);
      _syncDtLabel?.();
      _syncSidePanelStack();
      // Drive renderer._resize() through the full transition so the canvas
      // smoothly gains or releases the space the panel occupies.
      _resizeDuringTransition();
      saveSettings();
    },
    onAutoResize: () => _resizeDuringTransition(),
    onWidthChange: () => {
      // Suppress the CSS margin transition on #canvas-inner-wrapper so the
      // canvas snaps instantly to the new size after a drag-handle resize.
      const _ciw = $('canvas-inner-wrapper');
      if (_ciw) _ciw.style.transition = 'none';
      _syncSidePanelStack();
      void _ciw?.offsetWidth; // force layout reflow with updated margin
      renderer?._resize?.();
      requestAnimationFrame(() => { if (_ciw) _ciw.style.transition = ''; });
      saveSettings();
    },
    onRowSelect: (selectedIds) => {
      renderer._selectedTipIds = new Set(selectedIds);
      renderer._updateMRCA();
      renderer._notifyStats();
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(renderer._selectedTipIds.size > 0);
      renderer._dirty = true;
    },
    onEditCommit: (nodeId, key, newValue) => {
      const node = renderer?.nodeMap?.get(nodeId);
      if (!node) return;

      // Special case: editing the tip name directly.
      if (key === '__names__') {
        node.name = newValue === '' ? null : newValue;
        renderer._dirty = true;
        return;
      }

      if (!node.annotations) node.annotations = {};

      // Parse the new value based on the annotation's data type
      const schema = graph?.annotationSchema;
      const def    = schema?.get(key);
      const dt     = def?.dataType;
      let parsed   = newValue === '' ? null : newValue;
      if (dt === 'integer') {
        const n = parseInt(newValue, 10);
        parsed = Number.isFinite(n) ? n : (newValue === '' ? null : newValue);
      } else if (dt === 'real' || dt === 'proportion' || dt === 'percentage') {
        const n = parseFloat(newValue);
        parsed = Number.isFinite(n) ? n : (newValue === '' ? null : newValue);
      }
      node.annotations[key] = parsed;

      // Patch the observed range in the schema entry (without full rebuild)
      if (def && schema && isNumericType(dt)) {
        let min = Infinity, max = -Infinity;
        for (const n of graph.nodes) {
          const v = n.annotations?.[key];
          if (v != null && v !== '?' && Number.isFinite(Number(v))) {
            const nv = Number(v);
            if (nv < min) min = nv;
            if (nv > max) max = nv;
          }
        }
        if (min <= max) {
          def.observedMin = min;
          def.observedMax = max;
        }
      } else if (def && schema && (dt === 'categorical' || dt === 'date')) {
        // Rebuild the distinct values list after an edit may have added a new
        // category or removed the last occurrence of an existing one.
        const seen = new Set();
        for (const n of graph.nodes) {
          const v = n.annotations?.[key];
          if (v != null && v !== '' && v !== '?') seen.add(String(v));
        }
        def.values = [...seen].sort();
      }

      if (schema) {
        renderer.setAnnotationSchema(schema);
        applyLegend();
      }
      renderer._dirty = true;
    },
  });

  /**
   * Call renderer._resize() on every animation frame for `durationMs` milliseconds.
   * Used whenever a CSS transition changes the canvas container size so the canvas
   * tracks the moving boundary smoothly frame-by-frame.
   */
  function _resizeDuringTransition(durationMs = 230) {
    const start = performance.now();
    (function tick() {
      renderer._resize();
      if (performance.now() - start < durationMs) requestAnimationFrame(tick);
    })();
  }

  // Controls both pinned-stack placement and overlap precedence for side panels.
  // Higher order means more inward placement on the same side.
  const SIDE_PANEL_PRIORITY = {
    palette: 5,
    rtt: 10,
    dataTable: 20,
  };

  function _syncSidePanelStack() {
    const _pal = root.querySelector('#palette-panel');
    _sidePanelStack.setPanelState('palette', {
      side: 'left',
      panel: _pal,
      open: !!_pal?.classList.contains('open'),
      pinned: !!_pal?.classList.contains('pinned'),
      order: SIDE_PANEL_PRIORITY.palette,
    });
    _sidePanelStack.setPanelState('dt', {
      side: 'right',
      panel: $('data-table-panel'),
      open: !!dataTableRenderer?.isOpen?.(),
      pinned: !!dataTableRenderer?.isPinned?.(),
      order: SIDE_PANEL_PRIORITY.dataTable,
    });
    _sidePanelStack.setPanelState('rtt', {
      side: 'right',
      panel: $('rtt-panel'),
      open: !!rttChart?.isOpen?.(),
      pinned: !!rttChart?.isPinned?.(),
      widthValue: rttChart?.getPanelWidth?.() || null,
      order: SIDE_PANEL_PRIORITY.rtt,
    });
  }

  // Wire the data-table toggle button
  btnDataTable?.addEventListener('click', () => {
    if (dataTableRenderer.isOpen()) {
      dataTableRenderer.close();          // onClose callback updates button state
    } else {
      dataTableRenderer.open();
      btnDataTable?.classList.add('active');
      saveSettings();
      // In overlay mode the canvas doesn't resize on open; in pinned mode the
      // onPinChange callback already drives _resizeDuringTransition.
    }
    _syncSidePanelStack();
    _syncDtLabel?.();
  });

  // Fixed mode: force open + pinned immediately, disable the toggle button.
  if (_cfg.showDataTable === 'fixed') {
    dataTableRenderer.open();
    dataTableRenderer.pin();
    $('data-table-resize-handle')?.style.setProperty('pointer-events', 'none');
    _syncSidePanelStack();
  }
  // Apply programmatic column list if provided (works for both fixed and normal modes).
  if (_cfg.dataTableColumns) {
    dataTableRenderer.setColumns(_cfg.dataTableColumns);
  }

  // ── Root-to-Tip Divergence Panel ─────────────────────────────────────────
  rttChart = createRTTChart({
    panel:           $('rtt-panel'),
    canvas:          $('rtt-canvas'),
    getRenderer:     () => renderer,
    getCalibration:  () => calibration,
    getDateAnnotKey: () => {
      // When the Calibrate control is active (not disabled), honour the user's
      // selection exactly — including an explicit "(none)" choice.
      if (!axisDateAnnotEl.disabled) return axisDateAnnotEl.value || null;
      // Control is disabled (no date annotations available yet) — fall back to a
      // schema scan so the RTT plot populates as soon as annotations are loaded.
      const schema = renderer?._annotationSchema;
      if (!schema) return null;
      for (const [name, def] of schema) {
        if (name.startsWith('__')) continue;
        const isDate        = def.dataType === 'date';
        const isDecimalYear = (def.dataType === 'real' || def.dataType === 'integer') &&
                               def.min >= 1000 && def.max <= 3000;
        if (isDate || isDecimalYear) return name;
      }
      return null;
    },
    getDateFormat:   () => rttDateFmtEl.value || 'yyyy-MM-dd',
    getAxisColor:      () => rttAxisColorEl.value || axisColorEl.value,
    getStatsBoxBgColor:    () => rttStatsBgColorEl.value,
    getStatsBoxTextColor:  () => rttStatsTextColorEl.value,
    getStatsBoxFontSize:   () => parseInt(rttStatsFontSizeSlider.value),
    getRegressionStyle: () => rttRegressionStyleEl.value,
    getRegressionColor: () => rttRegressionColorEl.value,
    getRegressionWidth: () => parseFloat(rttRegressionWidthSlider.value),
    getResidBandShow:         () => rttResidBandShowEl.value,
    getResidBandStyle:        () => rttResidBandStyleEl.value,
    getResidBandColor:        () => rttResidBandColorEl.value,
    getResidBandWidth:        () => parseFloat(rttResidBandWidthSlider.value),
    getResidBandFillColor:    () => rttResidBandFillColorEl.value,
    getResidBandFillOpacity:  () => parseFloat(rttResidBandFillOpacitySlider.value),
    getAxisFontSize:   () => parseInt(rttAxisFontSizeSlider.value),
    getAxisFontFamily: () => {
      // Returns just the CSS font-family string (used for rtt.fontFamily and SVG export).
      // Weight/style are handled separately via getAxisTypeface → rtt.setTypeface().
      const key = rttAxisFontFamilyEl.value || axisTypefaceEl.value || fontFamilyEl.value;
      return TYPEFACES[key]?.family ?? key;
    },
    getAxisTypeface: () => {
      // RTT axis cascades: rtt-axis → axis → main theme
      const key   = rttAxisFontFamilyEl.value || axisTypefaceEl.value || fontFamilyEl.value;
      const style = rttAxisTypefaceStyleEl?.value || axisTypefaceStyleEl?.value || fontTypefaceStyleEl?.value || '';
      return { key, style };
    },
    getAxisLineWidth:  () => parseFloat(rttAxisLineWidthSlider.value),
    getTickOptions: () => ({
      majorInterval:    rttMajorIntervalEl.value,
      minorInterval:    rttMinorIntervalEl.value,
      majorLabelFormat: rttMajorLabelEl.value,
      minorLabelFormat: rttMinorLabelEl.value,
    }),
    getIsTimedTree: () => _axisIsTimedTree,
    getXAxisOrigin: () => rttXOriginEl.value || 'root',
    getShowRootAge: () => rttXOriginEl.value === 'root',
    getGridLines:   () => rttGridLinesEl.value,
    getAspectRatio: () => rttAspectRatioEl.value,
    onCalibrationChange: () => {
      axisDateFmtRow.style.display = (calibration.isActive && axisShowEl.value === 'time') ? '' : 'none';
      _updateTimeOption();
      _showDateTickRows(calibration.isActive && !!axisDateAnnotEl.value);
      _showRttDateTickRows(calibration.isActive && !!axisDateAnnotEl.value);
      if (renderer) renderer.setCalibration(calibration.isActive ? calibration : null, axisDateFmtEl.value);
      if (axisShowEl.value === 'time') {
        axisRenderer.setCalibration(calibration.isActive ? calibration : null);
        axisRenderer.update(renderer.scaleX, renderer.offsetX, renderer.treePaddingLeft, renderer.treePaddingRight,
                            renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
                            window.devicePixelRatio || 1);
      }
      // Regression has changed (new fit or new excluded set) — refresh temporal annotations.
      _recomputeTemporalAnnotations();
    },
    onClose: () => {
      btnRtt?.classList.remove('active');
      _syncSidePanelStack();
      saveSettings();
      _syncRttLabel?.();
    },
    onPinChange: (pinned) => {
      document.body.classList.toggle('rtt-pinned', pinned);
      _syncRttLabel?.();
      _syncSidePanelStack();
      _resizeDuringTransition();
      saveSettings();
    },
    onWidthChange: () => {
      // Suppress the CSS margin transition on #canvas-inner-wrapper so the
      // canvas snaps instantly to the new size after a drag-handle resize.
      const _ciw = $('canvas-inner-wrapper');
      if (_ciw) _ciw.style.transition = 'none';
      _syncSidePanelStack();
      void _ciw?.offsetWidth; // force layout reflow with updated margin
      renderer?._resize?.();
      requestAnimationFrame(() => { if (_ciw) _ciw.style.transition = ''; });
      saveSettings();
    },
    onStatsBoxCornerChange: () => saveSettings(),
  });

  // Panel state is restored inside loadTree() on first tree load so that the
  // theme colours are already applied to the renderer before the panels open.

  // Restore saved clade highlights (populated after renderer is created)
  if (Array.isArray(_saved.cladeHighlights) && _saved.cladeHighlights.length > 0) {
    renderer.setCladeHighlightsData(_saved.cladeHighlights);
  }

  // Fixed mode: force open + pinned, suppress save/restore interactions.
  if (_cfg.showRTT === 'fixed') {
    rttChart.open();
    rttChart.setPin(true);
    _syncSidePanelStack();
  }

  _syncSidePanelStack();

  // Tree hover → RTT hover
  renderer._onHoverChange = id => rttChart.notifyHoverChange(id);

  // ── Alt/Option hover tooltip ───────────────────────────────────────────────
  {
    const tooltipEl = $('pt-node-tooltip');

    function _fmt(val, def) {
      if (val == null) return null;
      if (typeof val === 'number') {
        if (def?.fmtValue) return def.fmtValue(val);
        if (def?.fmt)      return def.fmt(val);
        // Auto: show 4 significant figures for small numbers, integers as-is
        if (Number.isInteger(val)) return String(val);
        return val.toPrecision(4).replace(/\.?0+$/, '');
      }
      if (Array.isArray(val)) return val.join(', ');
      return String(val);
    }

    function _showTooltip(node, cx, cy) {
      if (!tooltipEl || !node) return;
      const isTip    = node.isTip;
      const schema   = graph?.annotationSchema;
      const shapeIdx = renderer._hoveredShapeIdx;

      let html = '';
      // Node name / label header
      const headerText = node.name || node.annotations?.['Name'] || node.id || '';
      if (headerText) html += `<div class="pt-tt-name">${headerText}</div>`;

      // ── Shape-specific tooltip: just the shape's colour-by trait ──────────
      if (shapeIdx !== null && isTip) {
        const colourByKey = shapeIdx === 0
          ? renderer._tipLabelShapeColourBy
          : renderer._tipLabelShapeExtraColourBys?.[shapeIdx - 1] ?? null;
        if (colourByKey) {
          const def  = schema?.get(colourByKey);
          const raw  = renderer._statValue(node, colourByKey);
          const colour = shapeIdx === 0
            ? renderer._tipLabelShapeColourForValue(raw)
            : renderer._tipLabelShapeExtraColourForValue(shapeIdx - 1, raw);
          const displayed = _fmt(raw, def);
          const label = def?.label ?? colourByKey;
          if (displayed != null) {
            const swatch = colour ? `<span class="pt-tt-colour-swatch" style="background:${colour}"></span>` : '';
            html += `<div class="pt-tt-row"><span class="pt-tt-label">${label}</span><span class="pt-tt-value">${swatch}${displayed}</span></div>`;
          }
        }
        if (!html || html === `<div class="pt-tt-name">${headerText}</div>`) return;
        tooltipEl.innerHTML = html;
      } else {
        // ── Full tooltip: config-defined fields + active colour-by ─────────
        for (const field of NODE_TOOLTIP_FIELDS) {
          if (isTip  && field.onTips  === false) continue;
          if (!isTip && field.onNodes === false) continue;
          const def = schema?.get(field.key);
          const raw = renderer._statValue(node, field.key);
          if (raw == null) continue;
          // Use _labelText for consistent formatting (handles dates, HPD, fmt functions, etc.)
          const displayed = renderer._labelText(node, field.key, null, null) ?? _fmt(raw, def);
          if (displayed == null) continue;
          html += `<div class="pt-tt-row"><span class="pt-tt-label">${field.label}</span><span class="pt-tt-value">${displayed}</span></div>`;
        }

        // Active colour-by value + swatch
        const colourByKey = isTip ? renderer._tipColourBy : renderer._nodeColourBy;
        if (colourByKey && colourByKey !== 'user_colour') {
          const def  = schema?.get(colourByKey);
          const raw  = renderer._statValue(node, colourByKey);
          const colour = isTip
            ? renderer._tipColourForValue(raw)
            : renderer._nodeColourForValue(raw);
          const displayed = _fmt(raw, def);
          const label = def?.label ?? colourByKey;
          if (displayed != null) {
            const swatch = colour ? `<span class="pt-tt-colour-swatch" style="background:${colour}"></span>` : '';
            html += `<div class="pt-tt-row"><span class="pt-tt-label">${label}</span><span class="pt-tt-value">${swatch}${displayed}</span></div>`;
          }
        }

        if (!html) return;
        tooltipEl.innerHTML = html;
      }

      // Position: 14px right/below cursor, flip left/up if near edge
      const OFFSET = 14;
      const tw = tooltipEl.offsetWidth  || 200;
      const th = tooltipEl.offsetHeight || 80;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let tx = cx + OFFSET;
      let ty = cy + OFFSET;
      if (tx + tw > vw - 8) tx = cx - tw - OFFSET;
      if (ty + th > vh - 8) ty = cy - th - OFFSET;
      tooltipEl.style.left = `${Math.max(4, tx)}px`;
      tooltipEl.style.top  = `${Math.max(4, ty)}px`;
      tooltipEl.classList.add('visible');
    }

    function _hideTooltip() {
      tooltipEl?.classList.remove('visible');
    }

    // Track mouse position for repositioning on alt-down
    let _ttMouseX = 0, _ttMouseY = 0;
    window.addEventListener('mousemove', e => {
      _ttMouseX = e.clientX;
      _ttMouseY = e.clientY;
      if (renderer._altHeld && renderer._hoveredNodeId) {
        const node = renderer.nodeMap?.get(renderer._hoveredNodeId);
        if (node) _showTooltip(node, _ttMouseX, _ttMouseY);
      }
    });

    renderer._onAltChange = (down) => {
      if (down && renderer._hoveredNodeId) {
        const node = renderer.nodeMap?.get(renderer._hoveredNodeId);
        if (node) _showTooltip(node, _ttMouseX, _ttMouseY);
      } else {
        _hideTooltip();
      }
    };

    // Hide on hover change too (re-shown by mousemove)
    const _origOnHoverChange = renderer._onHoverChange;
    renderer._onHoverChange = id => {
      _origOnHoverChange?.(id);
      _emitHoverChanged(id);
      if (!id || !renderer._altHeld) { _hideTooltip(); return; }
      const node = renderer.nodeMap?.get(id);
      if (node) _showTooltip(node, _ttMouseX, _ttMouseY);
    };
  }

  btnRtt?.addEventListener('click', () => {
    if (rttChart.isOpen()) {
      rttChart.close();
      btnRtt?.classList.remove('active');
      _syncSidePanelStack();
      saveSettings();
    } else {
      rttChart.open();
      btnRtt?.classList.add('active');
      _syncSidePanelStack();
      saveSettings();
    }
    _syncRttLabel?.();
  });

  btnExportTree?.addEventListener('click', () => exportCtrl.openExportDialog());

  // ── Export controller ──────────────────────────────────────────────────────
  const exportCtrl = createExportController({
    root,
    getGraph:            () => graph,
    getRenderer:         () => renderer,
    getLegendRenderer:   () => legendRenderer,
    canvas, axisCanvas, legendRightCanvas, legend2RightCanvas, legend3RightCanvas, legend4RightCanvas,
    axisRenderer,
    getSettingsSnapshot: () => { const s = _buildSnapshot(); delete s.paintColour; Object.assign(s, _getAxisRangeSettings()); return s; }, // tree-only keys added via TREE_ONLY_SETTING_KEYS
    getConfigSnapshot:   () => ({
      settings: (() => { const s = _buildSnapshot(); delete s.paintColour; Object.assign(s, _getAxisRangeSettings()); return s; })(), // tree-only keys added via TREE_ONLY_SETTING_KEYS
      ui:       Object.fromEntries([
        ...PT_UI_FLAG_DEFS.map(def => [def.uiKey, _cfg[def.name]]),
        ['borderWidth',    _cfg.borderWidth],
        ['borderColor',    _cfg.borderColor],
        ['borderRadius',   _cfg.borderRadius],
        ['backgroundColor', _cfg.backgroundColor],
        ['paddingTop',    _cfg.paddingTop],
        ['paddingRight',  _cfg.paddingRight],
        ['paddingBottom', _cfg.paddingBottom],
        ['paddingLeft',   _cfg.paddingLeft],
      ]),
    }),
    getDefaultConfig:    () => ({
      settings: DEFAULT_SETTINGS,
      ui:       Object.fromEntries([
        ...PT_UI_FLAG_DEFS.map(def => [def.uiKey, true]),
        ['borderWidth',    null],
        ['borderColor',    null],
        ['borderRadius',   null],
        ['backgroundColor', null],
        ['paddingTop',    null],
        ['paddingRight',  null],
        ['paddingBottom', null],
        ['paddingLeft',   null],
      ]),
    }),
  });

  /** Show/hide a decimal-places row based on whether the chosen label annotation is numeric. */
  function _updateLabelDpRow(rowEl, annotKey, schema) {
    if (!rowEl) return;
    const SYNTHETIC = [CAL_DATE_KEY, CAL_DATE_HPD_KEY, CAL_DATE_HPD_ONLY_KEY];
    const dt = schema?.get(annotKey)?.dataType;
    const isNumeric = annotKey && !_isTipNameValue(annotKey) && annotKey !== '' &&
                      !SYNTHETIC.includes(annotKey) &&
                      ['real', 'integer', 'proportion', 'percentage'].includes(dt);
    rowEl.style.display = isNumeric ? '' : 'none';
  }

  /**
   * Recompute temporal residual / z-score / outlier maps for the current visible
   * tip set and update the schema bounds + renderer maps in-place.  Lightweight —
   * does NOT repopulate any dropdowns, so safe to call on every layout change.
   */
  function _recomputeTemporalAnnotations() {
    if (!renderer?.nodes?.length || !graph?.annotationSchema) return;
    const schema  = graph.annotationSchema;
    // Only include layout-visible tips (same set the RTT chart uses).
    const dateKey = (!axisDateAnnotEl.disabled && axisDateAnnotEl.value) ? axisDateAnnotEl.value : null;
    const residualData = computeTemporalResiduals(
      renderer.nodes,
      calibration?.isActive ? calibration : null,
      dateKey,
    );
    renderer._rttResidualsMap = residualData.residualMap;
    renderer._rttZScoresMap   = residualData.zscoreMap;
    renderer._rttOutliersMap  = residualData.outlierMap;
    // Colour scale ranges are now computed live from this.nodes in _buildColourScale,
    // so no need to patch def.min/def.max here.
    renderer.setAnnotationSchema(schema);
  }

  /** Repopulate annotation dropdowns (tipColourBy, nodeColourBy, legendAnnotEl) after schema change. */
  /**
   * Repopulate the node-bars Show dropdown with one option per available HPD
   * interval (from the height annotation group's hpds array), plus a static
   * "Off" entry.  `preferred` is the value to restore: an HPD annotation key,
   * 'off', or the legacy 'on' (mapped to the first/preferred HPD for compat).
   */
  function _populateNodeBarsShowOptions(schema, preferred = {}) {
    const controls = [nodeBarsShowEl, ...nodeBarsExtraShowEls].filter(Boolean);
    if (!controls.length) return;
    const preferredValues = Array.isArray(preferred)
      ? preferred
      : [preferred?.primary ?? preferred, ...(preferred?.extras ?? [])];

    const hpdDef = schema?.get('height');
    const options = [];
    if (hpdDef?.group?.hpds?.length) {
      options.push(...hpdDef.group.hpds.map(({ pct, key }) => ({ value: key, label: `${pct}% HPD` })));
    }
    if (hpdDef?.group?.curves?.length) {
      options.push(...hpdDef.group.curves.map(({ key, label }) => ({ value: key, label: label ?? 'curve' })));
    }
    controls.forEach((sel, i) => {
      const prev = preferredValues[i] ?? sel.value;
      while (sel.options.length > 1) sel.remove(1);
      for (const optSpec of options) {
        const opt = document.createElement('option');
        opt.value = optSpec.value;
        opt.textContent = optSpec.label;
        sel.appendChild(opt);
      }
      // Restore: valid key wins; legacy 'on' maps to first HPD; otherwise 'off'.
      const hasOpt = (v) => [...sel.options].some(o => o.value === v);
      if (hasOpt(prev)) {
        sel.value = prev;
      } else if (prev === 'on' && sel.options.length > 1) {
        sel.value = sel.options[1].value;
      } else {
        sel.value = 'off';
      }
    });
  }

  function _populateNodeBarsClipOptions(schema, preferred = {}) {
    const controls = [nodeBarsClipToEl, ...nodeBarsExtraClipToEls].filter(Boolean);
    if (!controls.length) return;
    const preferredValues = Array.isArray(preferred)
      ? preferred
      : [preferred?.primary ?? preferred, ...(preferred?.extras ?? [])];

    const hpdDef = schema?.get('height');
    const options = [];
    if (hpdDef?.group?.hpds?.length) {
      options.push(...hpdDef.group.hpds.map(({ pct, key }) => ({ value: key, label: `${pct}% HPD` })));
    }
    controls.forEach((sel, i) => {
      const prev = preferredValues[i] ?? sel.value;
      while (sel.options.length > 1) sel.remove(1);
      for (const optSpec of options) {
        const opt = document.createElement('option');
        opt.value = optSpec.value;
        opt.textContent = optSpec.label;
        sel.appendChild(opt);
      }
      const hasOpt = (v) => [...sel.options].some(o => o.value === v);
      sel.value = hasOpt(prev) ? prev : 'off';
    });
  }

  function _isCurveNodeBarSelection(schema, value) {
    if (!schema || !value || value === 'off') return false;
    const heightDef = schema.get('height');
    if (heightDef?.group?.curve === value) return true;
    return (heightDef?.group?.curves ?? []).some(curve => curve?.key === value);
  }

  function _syncNodeBarsClipVisibility(schema) {
    const heightDef = schema?.get('height');
    const hasClipOptions = !!heightDef?.group?.hpds?.length;
    if (nodeBarsClipToEl?.parentElement) {
      nodeBarsClipToEl.parentElement.style.display = (hasClipOptions && _isCurveNodeBarSelection(schema, nodeBarsShowEl.value)) ? '' : 'none';
    }
    nodeBarsExtraClipToEls.forEach((el, i) => {
      if (!el?.parentElement) return;
      el.parentElement.style.display = (hasClipOptions && _isCurveNodeBarSelection(schema, nodeBarsExtraShowEls[i]?.value)) ? '' : 'none';
    });
  }

  function _refreshAnnotationUIs(schema, { autoSelectDate = true } = {}) {
    // Re-inject built-in geometric stats so they reflect the current tree and
    // calibration state.  This is idempotent — removes old entries first.
    if (renderer?.nodes?.length) {
      // Compute temporal residuals (regression mode when cal is active, mean mode
      // for homochronous / undated trees) and store on the renderer so _statValue
      // can serve them without re-computation.
      const dateKey = (!axisDateAnnotEl.disabled && axisDateAnnotEl.value) ? axisDateAnnotEl.value : null;
      const residualData = computeTemporalResiduals(
        renderer.nodes,
        calibration?.isActive ? calibration : null,
        dateKey,
      );
      renderer._rttResidualsMap = residualData.residualMap;
      renderer._rttZScoresMap   = residualData.zscoreMap;
      renderer._rttOutliersMap  = residualData.outlierMap;
      injectBuiltinStats(schema, renderer.nodes, renderer.maxX, renderer.maxY,
                         calibration?.isActive ? calibration : null, residualData);
      renderer.setAnnotationSchema(schema);
    }
    // filter: 'tips' → onTips, 'nodes' → onNodes, 'all' → no filter,
    //         'nodesAndTipAvg' → node annotations first, then tip-only labelled '(tip avg)'
    function repopulate(sel, { isLegend = false, filter = 'all' } = {}) {
      const prev = sel.value;
      // Remove everything after the first static option (user colour / (none)).
      while (sel.options.length > 1) sel.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue; // static first option already in HTML
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue; // BEAST sub-annotation (median/HPD/range)
        if (filter === 'tips'  && !def.onTips)  continue;
        if (filter === 'nodes' && !def.onNodes) continue;
        if (filter === 'nodesAndTipAvg' && !def.onNodes) continue; // tip-avgs appended below
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        sel.appendChild(opt);
      }
      if (filter === 'nodesAndTipAvg') {
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.dataType === 'list') continue;
          if (def.groupMember) continue;
          if (def.onNodes) continue;
          if (!def.onTips) continue;
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = (def.label ?? name) + ' (tip avg)';
          sel.appendChild(opt);
        }
      }
      sel.disabled = false;
      // Restore previous selection if still available; legend falls back to '' (none), colour-by to user_colour.
      sel.value = [...sel.options].some(o => o.value === prev) ? prev
                  : (isLegend ? '' : 'user_colour');
    }

    function repopulateCountBy(sel, { filter = 'all' } = {}) {
      if (!sel) return;
      const prev = sel.value;
      while (sel.options.length > 1) sel.remove(1); // keep static "Off" option
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.groupMember) continue;
        if (def.dataType !== 'integer') continue;
        if (filter === 'tips' && !def.onTips) continue;
        if (filter === 'nodes' && !def.onNodes) continue;
        const lo = Number.isFinite(def.observedMin) ? def.observedMin : (Number.isFinite(def.min) ? def.min : null);
        const hi = Number.isFinite(def.observedMax) ? def.observedMax : (Number.isFinite(def.max) ? def.max : null);
        if (lo != null && hi != null && (hi < 0 || lo > 99)) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        sel.appendChild(opt);
      }
      sel.disabled = false;
      sel.value = [...sel.options].some(o => o.value === prev) ? prev : '';
    }
    repopulate(tipColourBy,          { filter: 'tips'  });
    repopulate(nodeColourBy,         { filter: 'nodesAndTipAvg' });
    if (branchColourBy) repopulate(branchColourBy, { filter: 'nodesAndTipAvg' });
    repopulate(labelColourBy,        { filter: 'tips'  });
    if (cladeHighlightColourByEl)  repopulate(cladeHighlightColourByEl,  { filter: 'nodesAndTipAvg' });
    if (collapsedCladeColourByEl)  repopulate(collapsedCladeColourByEl,  { filter: 'nodesAndTipAvg' });
    if (nodeLabelColourBy)   repopulate(nodeLabelColourBy,   { filter: 'nodesAndTipAvg' });
    if (branchLabelColourBy) repopulate(branchLabelColourBy, { filter: 'nodesAndTipAvg' });
    filterControl?.setSchema(schema);
    repopulate(tipLabelShapeColourBy, { filter: 'tips' });
    for (let i = 0; i < EXTRA_SHAPE_COUNT; i++) {
      repopulate(tipLabelShapeExtraColourBys[i], { filter: 'tips' });
    }
    repopulate(branchShapeColourByEl, { filter: 'nodesAndTipAvg' });
    branchShapeExtraColourBys.forEach(sel => repopulate(sel, { filter: 'nodesAndTipAvg' }));
    repopulateCountBy(branchShapeCountByEl, { filter: 'nodesAndTipAvg' });
    branchShapeExtraCountBys.forEach(sel => repopulateCountBy(sel, { filter: 'nodesAndTipAvg' }));
    repopulate(legendAnnotEl,        { isLegend: true  });
    repopulate(legend2AnnotEl,       { isLegend: true  });
    repopulate(legend3AnnotEl,       { isLegend: true  });
    repopulate(legend4AnnotEl,       { isLegend: true  });
    // Tip label show: option[0]='off', option[1]='name', then dynamic annotations.
    {
      const prev = tipLabelShow.value;
      // Remove dynamic options only — keep the two static ones (off, name).
      while (tipLabelShow.options.length > 2) tipLabelShow.remove(2);
      for (const [name, def] of schema) {
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        if (!def.onTips) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        tipLabelShow.appendChild(opt);
      }
      // CAL_DATE_KEY (__cal_date__) is in the schema when calibration is active and
      // is therefore already added by the loop above.  Only the HPD variants, which
      // are special sentinel strings rather than schema entries, need manual injection.
      if (calibration.isActive && schema.get('height')?.group?.hpd) {
        const _optHpd = document.createElement('option');
        _optHpd.value = CAL_DATE_HPD_KEY; _optHpd.textContent = 'Calendar date + HPDs';
        tipLabelShow.appendChild(_optHpd);
        const _optHpdOnly = document.createElement('option');
        _optHpdOnly.value = CAL_DATE_HPD_ONLY_KEY; _optHpdOnly.textContent = 'Calendar date HPDs';
        tipLabelShow.appendChild(_optHpdOnly);
      }
      tipLabelShow.disabled = false;
      tipLabelShow.value = [...tipLabelShow.options].some(o => o.value === prev) ? prev : 'name';
      tipLabelControlsEl.style.display = tipLabelShow.value === 'off' ? 'none' : '';
      if (renderer) {
        renderer.setTipLabelsOff(tipLabelShow.value === 'off');
        if (tipLabelShow.value !== 'off') renderer.setTipLabelAnnotation(_isTipNameValue(tipLabelShow.value) ? null : tipLabelShow.value);
      }
    }
    // Extra tip label shows (Labels 2-4): option[0]='off', option[1]='name', then dynamic annotations.
    {
      const extraEls = [tipLabel2ShowEl, tipLabel3ShowEl, tipLabel4ShowEl];
      for (const el of extraEls) {
        if (!el) continue;
        const prev = el.value;
        while (el.options.length > 2) el.remove(2);
        for (const [name, def] of schema) {
          if (def.dataType === 'list') continue;
          if (def.groupMember) continue;
          if (!def.onTips) continue;
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          el.appendChild(opt);
        }
        el.value = [...el.options].some(o => o.value === prev) ? prev : 'off';
      }
    }
    // Node label show: first option is '' (none); then all node annotations.
    {
      const prev = nodeLabelShowEl.value;
      while (nodeLabelShowEl.options.length > 1) nodeLabelShowEl.remove(1);
      for (const [name, def] of schema) {
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        if (!def.onNodes) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        nodeLabelShowEl.appendChild(opt);
      }
      // CAL_DATE_KEY is in the schema when calibration is active (added above).
      // Only inject HPD variants, which are special sentinels not in the schema.
      if (calibration.isActive && schema.get('height')?.group?.hpd) {
        const _optHpd = document.createElement('option');
        _optHpd.value = CAL_DATE_HPD_KEY; _optHpd.textContent = 'Calendar date + HPDs';
        nodeLabelShowEl.appendChild(_optHpd);
        const _optHpdOnly = document.createElement('option');
        _optHpdOnly.value = CAL_DATE_HPD_ONLY_KEY; _optHpdOnly.textContent = 'Calendar date HPDs';
        nodeLabelShowEl.appendChild(_optHpdOnly);
      }
      nodeLabelShowEl.disabled = false;
      nodeLabelShowEl.value = [...nodeLabelShowEl.options].some(o => o.value === prev) ? prev : '';
      if (renderer) renderer.setNodeLabelAnnotation(nodeLabelShowEl.value || null);
    }
    // Branch label show: first option is '' (none); then all annotations (tips + nodes).
    {
      const prev = branchLabelShowEl.value;
      while (branchLabelShowEl.options.length > 1) branchLabelShowEl.remove(1);
      for (const [name, def] of schema) {
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        branchLabelShowEl.appendChild(opt);
      }
      branchLabelShowEl.disabled = false;
      branchLabelShowEl.value = [...branchLabelShowEl.options].some(o => o.value === prev) ? prev : '';
      _updateLabelDpRow(branchLabelDpRowEl, branchLabelShowEl.value, schema);
      if (renderer) renderer.setBranchLabelAnnotation(branchLabelShowEl.value || null);
    }
    _syncControlVisibility();
    // Refresh configure-button visibility to match current colour-by selections.
    _updateConfigureBtn(tipConfigureRow,                tipColourBy.value);
    _updateConfigureBtn(nodeConfigureRow,               nodeColourBy.value);
    if (branchColourBy) _updateConfigureBtn(branchConfigureRow, branchColourBy.value);
    _updateConfigureBtn(labelConfigureRow,              labelColourBy.value);
    _updateConfigureBtn(tipLabelShapeConfigureRow,      tipLabelShapeColourBy.value);
    for (let i = 0; i < EXTRA_SHAPE_COUNT; i++) {
      _updateConfigureBtn(tipLabelShapeExtraConfigureRows[i], tipLabelShapeExtraColourBys[i].value);
    }
    _updateConfigureBtn(branchShapeConfigureRow, branchShapeColourByEl?.value || 'user_colour');
    branchShapeExtraConfigureRows.forEach((row, i) => _updateConfigureBtn(row, branchShapeExtraColourBys[i]?.value || 'user_colour'));
    _updateConfigureBtn(cladeHighlightConfigureRow, cladeHighlightColourByEl?.value ?? 'user_colour');
    _updateConfigureBtn(collapsedCladeConfigureRow, collapsedCladeColourByEl?.value ?? 'user_colour');
    if (nodeLabelColourBy)   _updateConfigureBtn(nodeLabelConfigureRow,   nodeLabelColourBy.value);
    if (branchLabelColourBy) _updateConfigureBtn(branchLabelConfigureRow, branchLabelColourBy.value);
    _updateConfigureBtn(legendConfigureRow,  legendAnnotEl?.value);
    _updateConfigureBtn(legend2ConfigureRow, legend2AnnotEl?.value);
    _updateConfigureBtn(legend3ConfigureRow, legend3AnnotEl?.value);
    _updateConfigureBtn(legend4ConfigureRow, legend4AnnotEl?.value);
    // Sync clear-user-colour button: enabled only when at least one node has been coloured.
    if (btnClearUserColour) {
      commands.setEnabled('tree-clear-colours', schema.has('user_colour'));
    }
    // Show node-bars controls only when the 'height' annotation group (with HPD) is present.
    const heightDef = schema ? schema.get('height') : null;
    const hasNodeBars = !!(heightDef && heightDef.group && (heightDef.group.hpd || heightDef.group.curve || heightDef.group.hpds?.length || heightDef.group.curves?.length));
    if (nodeBarsControlsEl) nodeBarsControlsEl.style.display = hasNodeBars ? '' : 'none';
    if (nodeBarsUnavailEl)  nodeBarsUnavailEl.style.display  = hasNodeBars ? 'none' : 'block';
    _populateNodeBarsShowOptions(schema, {
      primary: renderer?.nodeBarsHpdKey ?? nodeBarsShowEl.value,
      extras: Array.isArray(renderer?.nodeBarsExtraHpdKeys)
        ? renderer.nodeBarsExtraHpdKeys
        : nodeBarsExtraShowEls.map(el => el?.value || 'off'),
    });
    _populateNodeBarsClipOptions(schema, {
      primary: renderer?.nodeBarsClipTo ?? nodeBarsClipToEl?.value,
      extras: Array.isArray(renderer?.nodeBarsExtraClipTo)
        ? renderer.nodeBarsExtraClipTo
        : nodeBarsExtraClipToEls.map(el => el?.value || 'off'),
    });
    _syncNodeBarsClipVisibility(schema);
    if (!hasNodeBars && nodeBarsShowEl.value !== 'off') {
      nodeBarsShowEl.value = 'off';
      if (renderer) { renderer.setSettings(_buildRendererSettings()); renderer._dirty = true; }
    }
    // Show decimal-places row only when a numeric annotation is selected.
    _updateLabelDpRow(tipLabelDpRowEl,    tipLabelShow.value,      schema);
    _updateLabelDpRow(nodeLabelDpRowEl,   nodeLabelShowEl.value,   schema);
    _updateLabelDpRow(branchLabelDpRowEl, branchLabelShowEl.value, schema);

    // ── Calibrate (date annotation) dropdown ────────────────────────────────
    // Keep the dropdown in sync whenever the annotation schema changes (e.g.
    // CSV import, curation, parse-tips).  Auto-select the first date annotation
    // if nothing is currently selected so the RTT plot activates automatically.
    {
      const _prevDate = axisDateAnnotEl.value;
      while (axisDateAnnotEl.options.length > 1) axisDateAnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (name.startsWith('__')) continue;
        const isDate        = def.dataType === 'date';
        const isDecimalYear = (def.dataType === 'real' || def.dataType === 'integer') &&
                               def.min >= 1000 && def.max <= 3000;
        if (isDate || isDecimalYear) {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
          axisDateAnnotEl.appendChild(opt);
        }
      }
      const _hasDate = axisDateAnnotEl.options.length > 1;
      axisDateRow.style.display = _hasDate ? '' : 'none';
      axisDateAnnotEl.disabled  = !_hasDate;
      // Restore the previous selection if it still exists; otherwise auto-select the
      // first available date annotation so the Calibrate control is never left blank
      // when date data has just been imported or parsed.
      // autoSelectDate=false when called from the user-initiated change handler, so
      // the user's explicit choice of "(none)" is preserved.
      const _prevStillOk = _prevDate &&
                           [...axisDateAnnotEl.options].some(o => o.value === _prevDate);
      if (_hasDate && !_prevStillOk && autoSelectDate) {
        axisDateAnnotEl.value = axisDateAnnotEl.options[1].value;
      } else {
        axisDateAnnotEl.value = _prevStillOk ? _prevDate : '';
      }
      // If the effective selection changed, update calibration and RTT chart.
      const _newDate = axisDateAnnotEl.value;
      if (_newDate !== _prevDate) {
        rttChart?.recomputeCalibration?.();
        if (_newDate) _ensureDateInTable(_newDate);
      }
    }
    // Re-apply programmatically configured data table columns after each schema
    // refresh so they survive tree reloads and annotation imports.
    if (_cfg.dataTableColumns) {
      dataTableRenderer?.setColumns(_cfg.dataTableColumns);
    }
  }

  // ── Tree loading ──────────────────────────────────────────────────────────

  async function loadTree(text, filename) {
    // Normalise Windows CRLF and old Mac CR line endings to LF so that all
    // downstream parsers (parseNexus, parseNewick) receive clean input.
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Close the RTT panel while the new tree loads (pin preference is preserved
    // so re-opening the panel will restore the pinned state).
    // Skip in fixed mode — the panel must stay visible at all times.
    if (rttChart?.isOpen() && _cfg.showRTT !== 'fixed') {
      rttChart.closeForLoad();
      btnRtt?.classList.remove('active');
    }
    setModalLoading(true);
    setModalError(null);
    _loadedFilename = filename || null;
    // Clear the source URL — will be set again by the caller if loaded from a URL.
    _treeSourceUrl = null;
    _updateShareUrlBtn();
    document.title = _loadedFilename ? `${_loadedFilename} — PearTree` : 'PearTree — Phylogenetic Tree Viewer';
    if (_onTitleChange) _onTitleChange(_loadedFilename);
    // Yield to the browser so the spinner renders before heavy parsing
    await new Promise(r => setTimeout(r, 0));

    try {
      let parsedRoot = null;

      // Try NEXUS first; fall back to bare Newick
      const nexusTrees = parseNexus(text, { appName: APP_SETTINGS_KEY });
      const _fileSettings = nexusTrees.length > 0 ? (nexusTrees[0].appSettings || null) : null;
      if (nexusTrees.length > 0) {
        parsedRoot = nexusTrees[0].root;
        // Warn the user if any tree tips had no matching entry in the taxa block.
        const _taxonWarnings = nexusTrees[0].taxonAnnotWarnings;
        if (_taxonWarnings && _taxonWarnings.length > 0) {
          const MAX = 5;
          const sample = _taxonWarnings.slice(0, MAX).join('\n  ');
          const more   = _taxonWarnings.length > MAX ? `\n  … and ${_taxonWarnings.length - MAX} more` : '';
          setModalLoading(false);
          await showConfirmDialog(
            'Taxa block mismatch',
            `${_taxonWarnings.length} tip(s) in the tree were not found in the NEXUS taxa block and could not receive taxon annotations:\n\n  ${sample}${more}\n\nThe tree will still be loaded.`,
            { okLabel: 'OK', cancelLabel: null }
          );
          setModalLoading(true);
        }
      } else {
        const trimmed = text.trim();
        // Accept a bare Newick string that starts with '(' directly, or one
        // that has a leading [&R] / [&r] rooted flag before the opening '('.
        if (trimmed.startsWith('(') || /^\[&[Rr]\]/.test(trimmed)) {
          parsedRoot = parseNewick(trimmed);
        } else {
          throw new Error('No trees found. File must be in NEXUS or Newick format.');
        }
      }

      // ── Missing branch-length detection ────────────────────────────────
      // Walk the parsed tree and count nodes that have no `:length` in the
      // Newick string (their .length property will be undefined).  If ALL
      // non-root nodes are missing lengths the tree would display as a single
      // collapsed point, so warn the user and offer to assign 1.0.
      {
        let totalBranches = 0;   // non-root nodes
        let missingLengths = 0;
        const _stack = parsedRoot.children ? [...parsedRoot.children] : [];
        while (_stack.length) {
          const n = _stack.pop();
          totalBranches++;
          if (n.length === undefined) missingLengths++;
          if (n.children) for (const c of n.children) _stack.push(c);
        }
        if (totalBranches > 0 && missingLengths > 0) {
          // Pause the spinner so the dialog doesn't appear beneath the loading overlay.
          setModalLoading(false);
          const allMissing = missingLengths === totalBranches;
          const msg = allMissing
            ? `This tree has no branch lengths (${totalBranches} branch${totalBranches !== 1 ? 'es' : ''} checked). Without branch lengths the tree cannot be displayed.\n\nAssign a branch length of 1.0 to every branch so the tree can be shown as a cladogram?`
            : `${missingLengths} of ${totalBranches} branches are missing branch lengths. They will be treated as zero, which may cause nodes to overlap.\n\nAssign 1.0 to the ${missingLengths} missing branch${missingLengths !== 1 ? 'es' : ''}?`;
          const assign = await showConfirmDialog(
            'Missing branch lengths',
            msg,
            { okLabel: 'Assign 1.0', cancelLabel: 'Cancel' }
          );
          if (!assign) {
            setModalLoading(false);
            // Restore the empty-state overlay when the load is cancelled and
            // no tree was previously open (mirrors the closeModal() path).
            if (!treeLoaded) showEmptyState();
            return;   // abort the load entirely
          }
          // Assign 1.0 to every node whose length is undefined.
          const _fixStack = parsedRoot.children ? [...parsedRoot.children] : [];
          while (_fixStack.length) {
            const n = _fixStack.pop();
            if (n.length === undefined) n.length = 1.0;
            if (n.children) for (const c of n.children) _fixStack.push(c);
          }
          setModalLoading(true);
        }
      }

      // If the parsed tree has node labels (stored under the sentinel key
      // "_node_label" by parseNewick), rename them to the configured annotation name.
      // window.peartreeConfig.nodeLabelName (or ?nodeLabelName= URL param) lets callers
      // pre-specify the name; otherwise the user is prompted (interactive mode only).
      {
        const labelledNodes = [];
        function _collectNodeLabels(node) {
          if (node.annotations && "_node_label" in node.annotations) labelledNodes.push(node);
          if (node.children) for (const c of node.children) _collectNodeLabels(c);
        }
        _collectNodeLabels(parsedRoot);
        if (labelledNodes.length > 0) {
          const allNumeric = labelledNodes.every(n => !isNaN(parseFloat(n.annotations["_node_label"])));
          const defaultName = allNumeric ? 'bootstrap' : 'label';
          const _preconfigured = window.peartreeConfig?.nodeLabelName
            || new URLSearchParams(window.location.search).get('nodeLabelName');
          const chosen = _preconfigured
            ? (_preconfigured.trim() || defaultName)
            : (
              (await showPromptDialog(
                'Node labels',
                `This tree has labels on ${labelledNodes.length} internal node(s). What annotation name should these be stored as?`,
                defaultName
              )) ?? defaultName
            ).trim() || defaultName;
          for (const n of labelledNodes) {
            const raw = n.annotations["_node_label"];
            delete n.annotations["_node_label"];
            const num = parseFloat(raw);
            n.annotations[chosen] = !isNaN(num) ? num : raw;
          }
        }
      }

      graph           = fromNestedRoot(parsedRoot);
      renderer.hiddenNodeIds = graph.hiddenNodeIds;  // keep renderer in sync (same Set reference)
      renderer.graph  = graph;
      currentOrder    = null;
      renderer.clearCladeHighlights();

      // ── Restore PearTree-specific node annotations (_pt_*) ──────────────
      // These are written during NEXUS export to preserve collapsed clades and
      // clade highlights. Strip them from the graph here so they never appear
      // as user-visible annotation columns in the schema.
      {
        const _ptHighlights = [];
        for (const node of graph.nodes) {
          if (node.annotations._pt_collapsed === 'true' || node.annotations._pt_collapsed === true) {
            const colour = typeof node.annotations._pt_collapsed_colour === 'string'
              ? node.annotations._pt_collapsed_colour : null;
            // Count descendant tips via graph traversal.
            const _parentIdx = node.adjacents.length > 0 ? node.adjacents[0] : -1;
            let tipCount = 0;
            const _tipStack = node.adjacents.filter(i => i !== _parentIdx);
            while (_tipStack.length) {
              const ci = _tipStack.pop();
              const cn = graph.nodes[ci];
              const cp = cn.adjacents.length > 0 ? cn.adjacents[0] : -1;
              const cc = cn.adjacents.filter(i => i !== cp);
              if (cc.length === 0) tipCount++;
              else _tipStack.push(...cc);
            }
            graph.collapsedCladeIds.set(node.origId, { colour, tipCount: Math.max(1, tipCount) });
          }
          if (typeof node.annotations._pt_highlight === 'string') {
            _ptHighlights.push({ id: node.origId, colour: node.annotations._pt_highlight });
          }
          delete node.annotations._pt_collapsed;
          delete node.annotations._pt_collapsed_colour;
          delete node.annotations._pt_highlight;
        }
        // Remove _pt_* keys from the schema so they don't appear in dropdowns or export grids.
        graph.annotationSchema.delete('_pt_collapsed');
        graph.annotationSchema.delete('_pt_collapsed_colour');
        graph.annotationSchema.delete('_pt_highlight');
        if (_ptHighlights.length > 0) {
          renderer.setCladeHighlightsData(_ptHighlights);
        }
        // Ensure the slider max accommodates the largest restored collapsed clade.
        if (graph.collapsedCladeIds.size > 0 && collapsedHeightNSlider) {
          let _maxTips = 1;
          for (const [, info] of graph.collapsedCladeIds) _maxTips = Math.max(_maxTips, info.tipCount || 1);
          if (parseInt(collapsedHeightNSlider.max) < _maxTips) {
            collapsedHeightNSlider.max = _maxTips;
            collapsedHeightNSlider.value = Math.min(parseInt(collapsedHeightNSlider.value) || 1, _maxTips);
            const _el = $('collapsed-height-n-value');
            if (_el) _el.textContent = collapsedHeightNSlider.value;
          }
        }
      }

      // Apply effective settings for this tree load.
      // Precedence (low -> high): saved/local, file-embedded, init(URL/embed).
      // This guarantees URL settings always win over tree-embedded values.
      // null values in initSettings are treated as "not specified" (not as explicit
      // overrides), so a configUrl that exports null filter assignments does not
      // wipe out filter assignments embedded in the tree file.
      const _initSettingsNonNull = {};
      for (const [_k, _v] of Object.entries(_cfg.initSettings || {})) {
        if (_v !== null && _v !== undefined) _initSettingsNonNull[_k] = _v;
      }
      const _treeEffectiveSettings = Object.assign(
        {},
        _saved || {},
        _fileSettings || {},
        _initSettingsNonNull,
      );
      // If init/URL explicitly requested a theme, apply that theme and then only
      // apply explicit init visual overrides on top. This prevents file-embedded
      // visual settings from clobbering the chosen theme's colours.
      const _initTheme = _cfg.initSettings?.selectedTheme ?? _cfg.initSettings?.theme;
      if (_initTheme && _initTheme !== 'custom' && themeManager?.registry?.has(_initTheme)) {
        applyTheme(_initTheme);
        _applyVisualSettingsFromFile(_cfg.initSettings || {});
      } else {
        _applyVisualSettingsFromFile(_treeEffectiveSettings);
      }
      _cachedMidpoint = null;
      isExplicitlyRooted = graph.rooted;

      // Show/hide the Select + Reroot toolbar sections based on whether the
      // tree is explicitly rooted. Use a CSS class to avoid WKWebView inline-style issues.
      $('reroot-controls')?.classList.toggle('visible', !isExplicitlyRooted);

      commands.setEnabled('tree-midpoint', !isExplicitlyRooted);
      commands.setEnabled('tree-temporal-root', !isExplicitlyRooted);
      commands.setEnabled('tree-temporal-root-global', !isExplicitlyRooted);
      commands.setEnabled('tree-reroot',   false); // re-enabled on selection by bindControls

      // Compute layout early so injectBuiltinStats() has maxX/maxY/node array
      // before the dropdowns are populated.
      const layout = computeLayoutFromGraph(graph, null, _layoutOptions());

      // Populate the "Colour by" dropdowns. user_colour is always the first option.
      const schema = graph.annotationSchema;
      // Inject built-in geometric stats (divergence, age, branch length, tips below)
      // into the schema before populating dropdowns so they appear as options.
      injectBuiltinStats(schema, layout.nodes, layout.maxX, layout.maxY, null);
      // filter: 'tips' → only annotations on tips, 'nodes' → only on internals, 'all' → no filter
      function _populateColourBy(sel, filter = 'all') {
        while (sel.options.length > 0) sel.remove(0);
        const uc = document.createElement('option');
        uc.value = 'user_colour'; uc.textContent = 'user colour';
        sel.appendChild(uc);
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.dataType === 'list') continue;
          if (def.groupMember) continue; // BEAST sub-annotation (median/HPD/range)
          if (filter === 'tips'  && !def.onTips)  continue;
          if (filter === 'nodes' && !def.onNodes) continue;
          if (filter === 'nodesAndTipAvg' && !def.onNodes) continue; // tip-avgs appended below
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          sel.appendChild(opt);
        }
        if (filter === 'nodesAndTipAvg') {
          for (const [name, def] of schema) {
            if (name === 'user_colour') continue;
            if (def.dataType === 'list') continue;
            if (def.groupMember) continue;
            if (def.onNodes) continue;
            if (!def.onTips) continue;
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = (def.label ?? name) + ' (tip avg)';
            sel.appendChild(opt);
          }
        }
        sel.disabled = false;
        sel.value = 'user_colour';
      }
      _populateColourBy(tipColourBy,          'tips');
      _populateColourBy(nodeColourBy,         'nodesAndTipAvg');
      if (branchColourBy) _populateColourBy(branchColourBy, 'nodesAndTipAvg');
      _populateColourBy(labelColourBy,        'tips');
      _populateColourBy(tipLabelShapeColourBy, 'tips');
      for (let _i = 0; _i < EXTRA_SHAPE_COUNT; _i++) _populateColourBy(tipLabelShapeExtraColourBys[_i], 'tips');
      _populateColourBy(branchShapeColourByEl, 'nodesAndTipAvg');
      branchShapeExtraColourBys.forEach(sel => _populateColourBy(sel, 'nodesAndTipAvg'));
      if (nodeLabelColourBy)   _populateColourBy(nodeLabelColourBy,   'nodesAndTipAvg');
      if (branchLabelColourBy) _populateColourBy(branchLabelColourBy, 'nodesAndTipAvg');

      function _populateCountBy(sel, filter = 'all') {
        if (!sel) return;
        while (sel.options.length > 1) sel.remove(1);
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.groupMember) continue;
          if (def.dataType !== 'integer') continue;
          if (filter === 'tips' && !def.onTips) continue;
          if (filter === 'nodes' && !def.onNodes) continue;
          const lo = Number.isFinite(def.observedMin) ? def.observedMin : (Number.isFinite(def.min) ? def.min : null);
          const hi = Number.isFinite(def.observedMax) ? def.observedMax : (Number.isFinite(def.max) ? def.max : null);
          if (lo != null && hi != null && (hi < 0 || lo > 99)) continue;
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          sel.appendChild(opt);
        }
        sel.disabled = false;
      }
      _populateCountBy(branchShapeCountByEl, 'nodesAndTipAvg');
      branchShapeExtraCountBys.forEach(sel => _populateCountBy(sel, 'nodesAndTipAvg'));
      if (cladeHighlightColourByEl) {
        while (cladeHighlightColourByEl.options.length > 0) cladeHighlightColourByEl.remove(0);
        const _chUc = document.createElement('option');
        _chUc.value = 'user_colour'; _chUc.textContent = 'user colour';
        cladeHighlightColourByEl.appendChild(_chUc);
        // Node annotations first
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.dataType === 'list') continue;
          if (def.groupMember) continue;
          if (!def.onNodes) continue;
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          cladeHighlightColourByEl.appendChild(opt);
        }
        // Then tip-only annotations (not on nodes), labelled as '(tip avg)'
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.dataType === 'list') continue;
          if (def.groupMember) continue;
          if (def.onNodes) continue;
          if (!def.onTips) continue;
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = (def.label ?? name) + ' (tip avg)';
          cladeHighlightColourByEl.appendChild(opt);
        }
        cladeHighlightColourByEl.disabled = false;
        cladeHighlightColourByEl.value = 'user_colour';
      }

      if (collapsedCladeColourByEl) {
        while (collapsedCladeColourByEl.options.length > 0) collapsedCladeColourByEl.remove(0);
        const _ccUc = document.createElement('option');
        _ccUc.value = 'user_colour'; _ccUc.textContent = 'user colour';
        collapsedCladeColourByEl.appendChild(_ccUc);
        // Node annotations first
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.dataType === 'list') continue;
          if (def.groupMember) continue;
          if (!def.onNodes) continue;
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          collapsedCladeColourByEl.appendChild(opt);
        }
        // Then tip-only annotations (not on nodes), labelled as '(tip avg)'
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.dataType === 'list') continue;
          if (def.groupMember) continue;
          if (def.onNodes) continue;
          if (!def.onTips) continue;
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = (def.label ?? name) + ' (tip avg)';
          collapsedCladeColourByEl.appendChild(opt);
        }
        collapsedCladeColourByEl.disabled = false;
        collapsedCladeColourByEl.value = 'user_colour';
      }

      // Tip-label-show: option[0]='off', option[1]='names', then dynamic annotations.
      while (tipLabelShow.options.length > 2) tipLabelShow.remove(2);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        if (!def.onTips) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        tipLabelShow.appendChild(opt);
      }
      tipLabelShow.disabled = false;
      tipLabelControlsEl.style.display = tipLabelShow.value === 'off' ? 'none' : '';

      // Extra tip label shows (Labels 2-4): option[0]='off', option[1]='name',
      // then dynamic tip annotations.
      {
        const _extraEls = [tipLabel2ShowEl, tipLabel3ShowEl, tipLabel4ShowEl];
        for (const _el of _extraEls) {
          if (!_el) continue;
          while (_el.options.length > 2) _el.remove(2);
          for (const [name, def] of schema) {
            if (name === 'user_colour') continue;
            if (def.dataType === 'list') continue;
            if (def.groupMember) continue;
            if (!def.onTips) continue;
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = def.label ?? name;
            _el.appendChild(opt);
          }
          _el.disabled = false;
        }
      }

      // Node-label-show: first option is '' (none); then all node annotations.
      while (nodeLabelShowEl.options.length > 1) nodeLabelShowEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        if (!def.onNodes) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        nodeLabelShowEl.appendChild(opt);
      }
      nodeLabelShowEl.disabled = false;

      // Branch-label-show: first option is '' (none); then all annotations.
      while (branchLabelShowEl.options.length > 1) branchLabelShowEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = def.label ?? name;
        branchLabelShowEl.appendChild(opt);
      }
      branchLabelShowEl.disabled = false;

      // Legend select: blank "(none)" first, then annotations (no user_colour).
      while (legendAnnotEl.options.length > 1) legendAnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          legendAnnotEl.appendChild(opt);
        }
      }
      legendAnnotEl.value    = '';
      legendAnnotEl.disabled = schema.size === 0;

      // Legend 2 select: same population.
      while (legend2AnnotEl.options.length > 1) legend2AnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          legend2AnnotEl.appendChild(opt);
        }
      }
      legend2AnnotEl.value    = '';
      legend2AnnotEl.disabled = schema.size === 0;

      // Legend 3 select: same population.
      while (legend3AnnotEl.options.length > 1) legend3AnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          legend3AnnotEl.appendChild(opt);
        }
      }
      legend3AnnotEl.value    = '';
      legend3AnnotEl.disabled = schema.size === 0;

      // Legend 4 select: same population.
      while (legend4AnnotEl.options.length > 1) legend4AnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = def.label ?? name;
          legend4AnnotEl.appendChild(opt);
        }
      }
      legend4AnnotEl.value    = '';
      legend4AnnotEl.disabled = schema.size === 0;
      if (btnClearUserColour) {
        commands.setEnabled('tree-clear-colours', schema.has('user_colour'));
      }

      // Annotation-dependent settings for this tree load.
      // Uses the same precedence as visual settings.
      const _eff = _treeEffectiveSettings;
      const _hasOpt = (sel, key) => key && [...sel.options].some(o => o.value === key);
      tipColourBy.value          = _hasOpt(tipColourBy,          _eff.tipColourBy)           ? _eff.tipColourBy           : 'user_colour';
      nodeColourBy.value         = _hasOpt(nodeColourBy,         _eff.nodeColourBy)          ? _eff.nodeColourBy          : 'user_colour';
      if (branchColourBy) branchColourBy.value = _hasOpt(branchColourBy, _eff.branchColourBy) ? _eff.branchColourBy : 'user_colour';
      labelColourBy.value        = _hasOpt(labelColourBy,        _eff.labelColourBy)         ? _eff.labelColourBy         : 'user_colour';
      tipLabelShapeColourBy.value = _hasOpt(tipLabelShapeColourBy, _eff.tipLabelShapeColourBy) ? _eff.tipLabelShapeColourBy : 'user_colour';
      if (branchShapeColourByEl) {
        branchShapeColourByEl.value = _hasOpt(branchShapeColourByEl, _eff.branchShapeColourBy) ? _eff.branchShapeColourBy : 'user_colour';
      }
      if (Array.isArray(_eff.tipLabelShapeExtraColourBys)) {
        _eff.tipLabelShapeExtraColourBys.forEach((v, i) => {
          if (tipLabelShapeExtraColourBys[i])
            tipLabelShapeExtraColourBys[i].value = _hasOpt(tipLabelShapeExtraColourBys[i], v) ? v : 'user_colour';
        });
      } else if (_eff.tipLabelShape2ColourBy) {
        // Backward compat: old single tipLabelShape2ColourBy key
        tipLabelShapeExtraColourBys[0].value = _hasOpt(tipLabelShapeExtraColourBys[0], _eff.tipLabelShape2ColourBy) ? _eff.tipLabelShape2ColourBy : 'user_colour';
      }
      if (Array.isArray(_eff.branchShapesExtraColourBys)) {
        _eff.branchShapesExtraColourBys.forEach((v, i) => {
          if (branchShapeExtraColourBys[i])
            branchShapeExtraColourBys[i].value = _hasOpt(branchShapeExtraColourBys[i], v) ? v : 'user_colour';
        });
      }
      const _hasCountOpt = (sel, key) => key && [...sel.options].some(o => o.value === key);
      if (branchShapeCountByEl) branchShapeCountByEl.value = _hasCountOpt(branchShapeCountByEl, _eff.branchShapeCountBy) ? _eff.branchShapeCountBy : '';
      if (Array.isArray(_eff.branchShapesExtraCountBys)) {
        _eff.branchShapesExtraCountBys.forEach((v, i) => {
          if (branchShapeExtraCountBys[i]) branchShapeExtraCountBys[i].value = _hasCountOpt(branchShapeExtraCountBys[i], v) ? v : '';
        });
      }
      legendAnnotEl.value        = _hasOpt(legendAnnotEl,        _eff.legendAnnotation)      ? _eff.legendAnnotation      : '';
      legend2AnnotEl.value       = _hasOpt(legend2AnnotEl,       _eff.legendAnnotation2)     ? _eff.legendAnnotation2     : '';
      legend3AnnotEl.value       = _hasOpt(legend3AnnotEl,       _eff.legendAnnotation3)     ? _eff.legendAnnotation3     : '';
      legend4AnnotEl.value       = _hasOpt(legend4AnnotEl,       _eff.legendAnnotation4)     ? _eff.legendAnnotation4     : '';
      tipLabelShow.value  = _normalizeTipNameValue(_hasOpt(tipLabelShow,  _eff.tipLabelShow) ? _eff.tipLabelShow : 'name');
      tipLabelControlsEl.style.display = tipLabelShow.value === 'off' ? 'none' : '';
      {
        const _extraShows = [tipLabel2ShowEl, tipLabel3ShowEl, tipLabel4ShowEl];
        const _extraSettings = Array.isArray(_eff.tipLabelsExtra) ? _eff.tipLabelsExtra : [];
        _extraShows.forEach((el, i) => {
          if (!el) return;
          const raw = _extraSettings[i];
          const key = _normalizeTipNameValue(raw);
          el.value = _hasOpt(el, key) ? key : 'off';
        });
      }
      {
        const _layoutEls = [tipLabel2LayoutEl, tipLabel3LayoutEl, tipLabel4LayoutEl];
        const _layoutSettings = Array.isArray(_eff.tipLabelsExtraLayouts) ? _eff.tipLabelsExtraLayouts : [];
        _layoutEls.forEach((el, i) => {
          if (!el || !_layoutSettings[i]) return;
          el.value = _layoutSettings[i];
        });
      }
      nodeLabelShowEl.value = _hasOpt(nodeLabelShowEl, _eff.nodeLabelAnnotation) ? _eff.nodeLabelAnnotation : '';
      branchLabelShowEl.value = _hasOpt(branchLabelShowEl, _eff.branchLabelAnnotation) ? _eff.branchLabelAnnotation : '';
      if (nodeLabelColourBy)   nodeLabelColourBy.value   = _hasOpt(nodeLabelColourBy,   _eff.nodeLabelColourBy)   ? _eff.nodeLabelColourBy   : 'user_colour';
      if (branchLabelColourBy) branchLabelColourBy.value = _hasOpt(branchLabelColourBy, _eff.branchLabelColourBy) ? _eff.branchLabelColourBy : 'user_colour';
      // Restore node order from per-tree effective settings,
      // not from saved prefs, so it remains a per-tree choice.
      if (_treeEffectiveSettings?.nodeOrder === 'asc' || _treeEffectiveSettings?.nodeOrder === 'desc') {
        const asc = _treeEffectiveSettings.nodeOrder === 'asc';
        reorderGraph(graph, asc);
        currentOrder = _treeEffectiveSettings.nodeOrder;
      }

      // Pass schema to the renderer so it can build colour scales.
      renderer.setAnnotationSchema(schema);
      // Show node-bars controls only when a BEAST 'height' annotation with HPD is present.
      {
        const _hDef = schema ? schema.get('height') : null;
        const _hasNB = !!(_hDef && _hDef.group && (_hDef.group.hpd || _hDef.group.curve || _hDef.group.hpds?.length || _hDef.group.curves?.length));
        if (nodeBarsControlsEl) nodeBarsControlsEl.style.display = _hasNB ? '' : 'none';
        if (nodeBarsUnavailEl)  nodeBarsUnavailEl.style.display  = _hasNB ? 'none' : 'block';

        const _primaryNodeBarKey =
          (typeof _eff.nodeBarsHpdKey === 'string' && _eff.nodeBarsHpdKey) ? _eff.nodeBarsHpdKey
            : ((typeof _eff.nodeBarsEnabled === 'string' && _eff.nodeBarsEnabled)
              ? _eff.nodeBarsEnabled
              : (_eff.nodeBarsEnabled === true ? 'on' : 'off'));
        const _extraNodeBarKeys = Array.isArray(_eff.nodeBarsExtraHpdKeys)
          ? _eff.nodeBarsExtraHpdKeys
          : (Array.isArray(_eff.nodeBarsExtraEnabled) ? _eff.nodeBarsExtraEnabled : []);

        _populateNodeBarsShowOptions(schema, {
          primary: _primaryNodeBarKey,
          extras: _extraNodeBarKeys,
        });
        _populateNodeBarsClipOptions(schema, {
          primary: _eff.nodeBarsClipTo,
          extras: Array.isArray(_eff.nodeBarsExtraClipTo) ? _eff.nodeBarsExtraClipTo : [],
        });
        _syncNodeBarsClipVisibility(schema);
        if (!_hasNB) {
          nodeBarsShowEl.value = 'off';
          nodeBarsExtraShowEls.forEach(el => { if (el) el.value = 'off'; });
          if (nodeBarsClipToEl) nodeBarsClipToEl.value = 'off';
          nodeBarsExtraClipToEls.forEach(el => { if (el) el.value = 'off'; });
        }
      }
      // Apply any per-annotation palette overrides from file settings first,
      // then from the persistent in-memory map (file settings take priority).
      if (_eff.annotationPalettes) {
        for (const [k, v] of Object.entries(_eff.annotationPalettes)) {
          annotationPalettes.set(k, v);
        }
      }
      if (_eff.annotationPaletteReverses) {
        for (const [k, v] of Object.entries(_eff.annotationPaletteReverses)) {
          annotationPaletteReverses.set(k, !!v);
        }
      }
      for (const [k, v] of annotationPalettes) {
        renderer.setAnnotationPalette(k, v, !!annotationPaletteReverses.get(k));
      }
      // Apply any per-annotation scale mode overrides.
      if (_eff.annotationScaleModes) {
        for (const [k, v] of Object.entries(_eff.annotationScaleModes)) {
          annotationScaleModes.set(k, v);
        }
      }
      for (const [k, v] of annotationScaleModes) {
        renderer.setAnnotationScaleMode(k, v);
      }
      renderer.setTipColourBy(tipColourBy.value     || null);
      renderer.setNodeColourBy(nodeColourBy.value   || null);
      renderer.setLabelColourBy(labelColourBy.value || null);
      renderer.setTipLabelShapeColourBy(tipLabelShapeColourBy.value || null);
      renderer.setSettings(_buildRendererSettings());
      for (let _i = 0; _i < EXTRA_SHAPE_COUNT; _i++)
        renderer.setTipLabelShapeExtraColourBy(_i, tipLabelShapeExtraColourBys[_i].value || null);
      renderer.setTipLabelsOff(tipLabelShow.value === 'off');
      if (tipLabelShow.value !== 'off') renderer.setTipLabelAnnotation(_isTipNameValue(tipLabelShow.value) ? null : tipLabelShow.value);
      renderer.setNodeLabelAnnotation(nodeLabelShowEl.value || null);
      renderer.setBranchLabelAnnotation(branchLabelShowEl.value || null);
      if (nodeLabelColourBy)   renderer.setNodeLabelColourBy(nodeLabelColourBy.value || null);
      if (branchLabelColourBy) renderer.setBranchLabelColourBy(branchLabelColourBy.value || null);
      // Show/hide configure buttons for active colour-by annotations.
      _updateConfigureBtn(tipConfigureRow,                tipColourBy.value);
      _updateConfigureBtn(nodeConfigureRow,               nodeColourBy.value);
      if (branchColourBy) _updateConfigureBtn(branchConfigureRow, branchColourBy.value);
      _updateConfigureBtn(labelConfigureRow,              labelColourBy.value);
      _updateConfigureBtn(tipLabelShapeConfigureRow,      tipLabelShapeColourBy.value);
      for (let _i = 0; _i < EXTRA_SHAPE_COUNT; _i++)
        _updateConfigureBtn(tipLabelShapeExtraConfigureRows[_i], tipLabelShapeExtraColourBys[_i].value);
      _updateConfigureBtn(branchShapeConfigureRow,      branchShapeColourByEl?.value || 'user_colour');
      branchShapeExtraConfigureRows.forEach((row, i) => _updateConfigureBtn(row, branchShapeExtraColourBys[i]?.value || 'user_colour'));
      if (nodeLabelColourBy)   _updateConfigureBtn(nodeLabelConfigureRow,   nodeLabelColourBy.value);
      if (branchLabelColourBy) _updateConfigureBtn(branchLabelConfigureRow, branchLabelColourBy.value);
      _updateConfigureBtn(cladeHighlightConfigureRow, cladeHighlightColourByEl?.value ?? 'user_colour');
      _updateConfigureBtn(collapsedCladeConfigureRow, collapsedCladeColourByEl?.value ?? 'user_colour');
      _updateConfigureBtn(legendConfigureRow,  legendAnnotEl?.value);
      _updateConfigureBtn(legend2ConfigureRow, legend2AnnotEl?.value);
      _updateConfigureBtn(legend3ConfigureRow, legend3AnnotEl?.value);
      _updateConfigureBtn(legend4ConfigureRow, legend4AnnotEl?.value);
      applyLegend();   // rebuild legend with new data (may clear it)
      renderer.setData(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      // setData() does not fire _onLayoutChange (unlike setDataAnimated), so
      // push the tip list to the data table now so it has data even if the
      // panel was already open from a restored session.
      dataTableRenderer?.setTips(layout.nodes.filter(n => n.isTip));

      // ── Axis renderer setup ───────────────────────────────────────────────
      // Detect time-scaled tree: presence of 'height' in the annotation schema is the
      // canonical signal — BEAST MCC trees annotate internal nodes with height but not
      // always tips, so a node.every() check would incorrectly return false.
      const _isTimedTree = schema.has('height');
      // For timed trees, root height = layout.maxX (root sits at x=0, most divergent tip at x=maxX).
      const _rootHeight  = _isTimedTree ? layout.maxX : 0;
      axisRenderer.setTreeParams({ maxX: layout.maxX, isTimedTree: _isTimedTree, rootHeight: _rootHeight });
      // Give the axis renderer a pre-computed formatter for height/divergence tick labels,
      // derived from the observed range of the 'height' annotation.
      axisRenderer.setHeightFormatter(schema.get('height')?.fmt ?? null);

      // Populate date annotation dropdown: accept 'date' annotations (ISO strings) and
      // numeric 'real'/'integer' annotations whose range falls within calendar years
      // (1000–3000), since BEAST-style decimal years (e.g. 2014.45) are typed as 'real'.
      // Exclude built-in sentinel keys (__ prefix) — those are not user-visible tree annotations.
      while (axisDateAnnotEl.options.length > 1) axisDateAnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (name.startsWith('__')) continue; // skip built-in geometric stat sentinels
        const isDate       = def.dataType === 'date';
        const isDecimalYear = (def.dataType === 'real' || def.dataType === 'integer') &&
                               def.min >= 1000 && def.max <= 3000;
        if (isDate || isDecimalYear) {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          axisDateAnnotEl.appendChild(opt);
        }
      }
      // Show the date row whenever a tree is loaded; only hide if no usable annotations exist.
      const _hasDateAnnotations = axisDateAnnotEl.options.length > 1;
      axisDateRow.style.display = _hasDateAnnotations ? '' : 'none';
      axisDateAnnotEl.disabled  = !_hasDateAnnotations;

      // Restore date annotation (file settings take priority over saved prefs).
      // When no saved value is available, auto-select the first date annotation so the
      // Calibrate control and root-to-tip plot are active immediately.
      const _savedAxisDate = _eff.axisDateAnnotation || '';
      const _canRestoreDate = _hasDateAnnotations && _savedAxisDate &&
                              [...axisDateAnnotEl.options].some(o => o.value === _savedAxisDate);
      const _dateToUse = _canRestoreDate ? _savedAxisDate
                       : (_hasDateAnnotations ? axisDateAnnotEl.options[1].value : '');
      axisDateAnnotEl.value = _dateToUse;
      // Capture timed-tree flag before calibration recompute so getIsTimedTree() is accurate.
      _axisIsTimedTree = _isTimedTree;
      // Recompute OLS calibration; onCalibrationChange syncs axisDateFmtRow, renderer.setCalibration,
      // _updateTimeOption, clamp-row visibility, and the axis renderer.
      rttChart.recomputeCalibration();
      if (_dateToUse) _ensureDateInTable(_dateToUse);

      // Re-inject built-in stats (adds __cal_date__ to schema) then restore any saved cal-date
      // selections that were unavailable when the dropdowns were first populated above.
      if (calibration.isActive) {
        _refreshAnnotationUIs(schema);
        // _refreshAnnotationUIs restores previous selection values; force the saved
        // cal-date key back in case it fell back to 'names'/'none' at first population.
        const _calKeys = [CAL_DATE_KEY, CAL_DATE_HPD_KEY, CAL_DATE_HPD_ONLY_KEY];
        if (_calKeys.includes(_eff.tipLabelShow)) {
          tipLabelShow.value = _eff.tipLabelShow;
          renderer.setTipLabelAnnotation(_eff.tipLabelShow);
        }
        if (_calKeys.includes(_eff.nodeLabelAnnotation)) {
          nodeLabelShowEl.value = _eff.nodeLabelAnnotation;
          renderer.setNodeLabelAnnotation(_eff.nodeLabelAnnotation);
        }
      }

      // Show tick-option rows whenever a date annotation is selected (applies to the
      // RTT plot's date axis even when the tree axis isn't in Time mode).
      _showDateTickRows(!!axisDateAnnotEl.value);
      _showRttDateTickRows(!!axisDateAnnotEl.value);
      // Apply stored (or default) tick options to the renderer.
      applyTickOptions();
      // Apply axis mode (direction, calibration, visibility) now that calibration is established.
      applyAxis();
      // Start intro animation AFTER all calibration setup — startIntroAnimation() mutates
      // node.x to 0 on the shared node objects, which would corrupt setAnchor() if called earlier.
      renderer.startIntroAnimation();

      // Reset navigation and selection state for the new tree
      renderer._navStack            = [];
      renderer._fwdStack            = [];
      renderer._viewSubtreeRootId   = null;
      renderer._branchSelectNode    = null;
      renderer._branchSelectX    = null;
      renderer._branchHoverNode  = null;
      renderer._branchHoverX     = null;
      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId       = null;

      // Reset tip filter for each tree load
      filterControl?.reset();
      _updateStatusSelect(0);

      if (!treeLoaded) {
        treeLoaded = true;
        // Unlock palette sections and restore pinned state (or open TREE section by default).
        _sectionAccordion.unlock();
        // Now that a tree is loaded, stamp the theme background onto the canvas wrappers.
        _syncCanvasWrapperBg(canvasBgColorEl.value);
        filterControl?.enable();
        $('btn-colour-trigger')?.removeAttribute('disabled');
        // Buttons with no command equivalent
        const _btnHypUp   = $('btn-hyp-up');
        const _btnHypDown = $('btn-hyp-down');
        if (_btnHypUp)   _btnHypUp.disabled   = false;
        if (_btnHypDown) _btnHypDown.disabled = false;
        $('btn-mode-nodes')   ?.removeAttribute('disabled');
        $('btn-mode-branches')?.removeAttribute('disabled');
        $('btn-invert-selection')?.removeAttribute('disabled');
        if (btnDataTable) btnDataTable.disabled = false;
        // On fresh tree load, default the Names column so the table is never blank.
        if (dataTableRenderer && !_cfg.dataTableColumns) {
          const { columns, showNames } = dataTableRenderer.getState();
          if (!showNames && columns.length === 0) {
            dataTableRenderer.setColumns(['__names__']);
          }
        }
        if (btnRtt)       btnRtt.disabled       = false;
        // Hide the empty-state overlay
        emptyStateEl.classList.add('hidden');
        // Show the axis canvas now if axis was already configured to be visible.
        if (axisShowEl.value !== 'off') axisCanvas.style.display = 'block';
        // Enable commands — registry syncs both the button .disabled and the native menu.
        commands.setEnabled('paste-tree',      false);  // disable once a tree is loaded
        commands.setEnabled('import-annot',    true);
        commands.setEnabled('curate-annot',    true);
        commands.setEnabled('export-tree',     true);
        commands.setEnabled('export-image',    true);
        commands.setEnabled('print-graphic',   true);
        commands.setEnabled('copy-tree',       true);
        commands.setEnabled('copy-tips',       true);
        commands.setEnabled('view-zoom-in',    true);
        commands.setEnabled('view-zoom-out',   true);
        commands.setEnabled('view-fit',           true);
        commands.setEnabled('view-fit-labels',  true);
        commands.setEnabled('view-scroll-top',    true);
        commands.setEnabled('view-scroll-bottom', true);
        commands.setEnabled('view-zoom-in',   true);
        commands.setEnabled('view-zoom-out',  true);
        commands.setEnabled('view-hyp-up',    true);
        commands.setEnabled('view-hyp-down',  true);
        commands.setEnabled('tree-order-up',   true);
        commands.setEnabled('tree-order-down', true);
        commands.setEnabled('manage-filters',  true);
        commands.setEnabled('manage-palettes', true);

        // Restore persistent panel state now that the theme is applied and the
        // renderer has the correct bgColor, so panels open with the right colours.
        if (_saved.dataTableOpen)     dataTableRenderer?.open();
        if (_saved.dataTablePinned)   dataTableRenderer?.pin();
        if (_saved.rttOpen)           rttChart?.open();
        if (_saved.rttPinned)         rttChart?.setPin(true);
        if (_saved.rttPanelWidth)     rttChart?.setPanelWidth(_saved.rttPanelWidth);
        if (_saved.rttStatsBoxCorner) rttChart?.setStatsBoxCorner(_saved.rttStatsBoxCorner);
      }

      // Restore interaction mode (file settings take priority).
      renderer.setMode(_eff.mode === 'branches' ? 'branches' : 'nodes');

      // Persist file-embedded settings to localStorage so they survive a reload.
      if (_fileSettings) saveSettings();

      if (!controlsBound) {
        bindControls();
        controlsBound = true;
      }

      // Now that filterControl exists (created in bindControls on first load),
      // populate its column picker from the current tree's schema, then enable it.
      filterControl?.setSchema(schema);
      // (Re-)load filter definitions from the effective tree settings.
      // This ensures filters embedded in the tree file or supplied via configUrl
      // are applied even when localStorage is empty or disabled (nostore=1).
      if (filterManager && _treeEffectiveSettings.filters) {
        try {
          const _fArr = Array.isArray(_treeEffectiveSettings.filters)
            ? _treeEffectiveSettings.filters
            : JSON.parse(_treeEffectiveSettings.filters);
          if (Array.isArray(_fArr) && _fArr.length > 0) {
            const _fMap = new Map(_fArr.map(f => [f.id, f]));
            filterManager.setAll(_fMap);
            _refreshFilterUIs(_fMap);
            // Re-apply filter select values from the effective settings.
            for (let _fi = 0; _fi < _filterSelectIds.length; _fi++) {
              const _fv = _treeEffectiveSettings[_filterSelectIds[_fi]];
              if (_fv && _filterSelectEls[_fi]) _filterSelectEls[_fi].value = _fv;
            }
          }
        } catch (_) { /* corrupt filter data — skip */ }
      }
      // Populate the named-filter popup with any already-restored saved filters.
      if (filterManager) {
        const fm = filterManager.getAll();
        filterControl?.setNamedFilters(fm);
        if (fm.size > 0) {
          renderer.setFilterDefinitions(fm);
          _applyFilterSelects();
        }
      }
      filterControl?.enable();

      // Sync button states through callbacks now that bindControls() is guaranteed to have run.
      if (renderer._onNavChange)          renderer._onNavChange(false, false);
      if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
      if (renderer._onNodeSelectChange)   renderer._onNodeSelectChange(false);

      // Update highlight list (no highlights after fresh load, but keeps the UI consistent).
      _refreshHighlightListFn?.();

      // Sync button active states with restored settings.
      $('btn-order-asc') ?.classList.toggle('active', currentOrder === 'desc');
      $('btn-order-desc')?.classList.toggle('active', currentOrder === 'asc');
      const _restoredMode = renderer._mode;
      $('btn-mode-nodes')   ?.classList.toggle('active', _restoredMode === 'nodes');
      $('btn-mode-branches')?.classList.toggle('active', _restoredMode === 'branches');

      _syncControlVisibility();
      // Notify any programmatic callers that a tree is now loaded and ready.
      root.dispatchEvent(new CustomEvent('peartree-tree-loaded', { bubbles: false }));
      // Re-broadcast to the parent frame (if running inside an iframe) so
      // _buildFrameController.onTreeLoad() can detect it via message event.
      if (window.parent !== window) {
        try { window.parent.postMessage({ type: 'pt:treeLoaded' }, '*'); } catch (_) {}
      }
      closeModal();
    } catch (err) {
      // If the Open Tree modal is already visible, show the error inside it.
      // If no tree has been loaded yet (auto-load from embed), show on the empty-state panel.
      // Otherwise show a standalone error dialog.
      if (modal.classList.contains('open')) {
        setModalError(err.message);
      } else if (!treeLoaded) {
        showEmptyState();
        showEmptyStateError(err.message);
      } else {
        showErrorDialog(err.message);
      }
    }

    setModalLoading(false);
  }

  // ── applyOrder: hoisted to outer scope so loadTree can restore saved order ─

  function applyOrder(ascending) {
    const label = ascending ? 'asc' : 'desc';
    if (currentOrder === label) return;

    const isZoomed  = renderer._targetScaleY > renderer.minScaleY * 1.005;
    const zoomRatio = renderer._targetScaleY / renderer.minScaleY;
    const anchorId  = isZoomed ? renderer.nodeIdAtViewportCenter() : null;

    reorderGraph(graph, ascending);
    const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, _layoutOptions());
    renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

    if (isZoomed && anchorId) {
      const H          = renderer.canvas.clientHeight;
      const newScaleY  = renderer.minScaleY * zoomRatio;
      const anchorNode = layout.nodeMap.get(anchorId);
      if (anchorNode) {
        const rawOffsetY = H / 2 - anchorNode.y * newScaleY;
        renderer._setTarget(rawOffsetY, newScaleY, /*immediate*/ false);
      }
    }

    currentOrder = label;
    $('btn-order-asc') ?.classList.toggle('active', !ascending);
    $('btn-order-desc')?.classList.toggle('active', ascending);
    saveSettings();
  }

  // ── Rerooting — hoisted so they're callable from the programmatic API ──────

  /** Apply a reroot operation and refresh the layout. */
  function applyReroot(childNodeId, distFromParent) {
    if (!graph) return;
    rerootOnGraph(graph, childNodeId, distFromParent);
    _cachedMidpoint = null;
    if (currentOrder === 'asc')  reorderGraph(graph, true);
    if (currentOrder === 'desc') reorderGraph(graph, false);
    renderer._navStack            = [];
    renderer._fwdStack            = [];
    renderer._viewSubtreeRootId   = null;
    renderer._branchSelectNode    = null;
    renderer._branchSelectX       = null;
    renderer._branchHoverNode     = null;
    renderer._branchHoverX        = null;
    renderer._selectedTipIds.clear();
    renderer._mrcaNodeId          = null;
    if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
    if (renderer._onNodeSelectChange)   renderer._onNodeSelectChange(false);
    $('btn-reroot') && ($('btn-reroot').disabled = true);
    const layout = computeLayoutFromGraph(graph, null, _layoutOptions());
    renderer.setDataCrossfade(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
    dataTableRenderer?.setTips(layout.nodes.filter(n => n.isTip));
    rttChart?.notifyLayoutChange?.();

    // setDataCrossfade() uses setData(), which does not fire _onLayoutChange.
    // Recompute axis subtree params/range so tree+axis x-scaling stays in sync.
    _syncAxisSubtreeParams(renderer.maxX, renderer._viewSubtreeRootId, renderer.nodes || []);
    if (axisShowEl.value !== 'off') _applyAxisRange();
  }

  /** Apply a midpoint root and refresh the layout. */
  function applyMidpointRoot() {
    if (!graph) return;
    if (!_cachedMidpoint) _cachedMidpoint = midpointRootGraph(graph);
    const { childNodeId, distFromParent } = _cachedMidpoint;
    _cachedMidpoint = null;
    applyReroot(childNodeId, distFromParent);
  }

  function _buildTipDates() {
    const dateKey = axisDateAnnotEl.disabled ? null : (axisDateAnnotEl.value || null);
    if (!dateKey || !renderer || !renderer.nodes) return null;
    const tipDates = new Map();
    for (const node of renderer.nodes) {
      if (!node.isTip) continue;
      const raw = renderer._statValue(node, dateKey);
      if (raw != null) {
        const dec = TreeCalibration.parseDateToDecYear(String(raw));
        if (dec != null) tipDates.set(node.id, dec);
      }
    }
    return tipDates.size > 0 ? tipDates : null;
  }

  function applyTemporalRoot() {
    if (!graph) return;
    const dates = _buildTipDates();
    if (!dates) return;
    const { childNodeId, distFromParent } = optimiseRootEdge(graph, dates);
    applyReroot(childNodeId, distFromParent);
  }

  function applyTemporalRootGlobal() {
    if (!graph) return;
    const dates = _buildTipDates();
    if (!dates) return;
    const { childNodeId, distFromParent } = temporalRootGraph(graph, dates);
    applyReroot(childNodeId, distFromParent);
  }

  // ── Control bindings (set up once after the first tree loads) ─────────────

  // Hoisted so loadTree can call it after restoring clade highlights.
  let _refreshHighlightListFn = null;

  function bindControls() {
    const btnBack      = $('btn-back');
    const btnForward   = $('btn-forward');
    const btnHome      = $('btn-home');
    const btnDrill     = $('btn-drill');
    const btnClimb     = $('btn-climb');
    const btnOrderAsc  = $('btn-order-asc');
    const btnOrderDesc = $('btn-order-desc');
    const btnReroot       = $('btn-reroot');
    const btnRotate       = $('btn-rotate');
    const btnRotateAll    = $('btn-rotate-all');
    const btnHide         = $('btn-hide');
    const btnShow         = $('btn-show');
    const btnNodeInfo     = $('btn-node-info');

    // ── Tip filter ────────────────────────────────────────────────────────────
    const tipFilterMount = $('tip-filter-mount');
    if (tipFilterMount) {
      filterControl = createFilterControl(tipFilterMount, {
        getNodeMap:            () => renderer?.nodeMap ?? null,
        getNodeAnnotationValue: (n, col) => col === '__name__' ? (n.name ?? '') : (n.annotations?.[col] ?? null),
        passesNamedFilter:     (id, node) => renderer?._passesFilter(id, node) ?? true,
        showPrompt:  (title, msg, def)    => showPromptDialog(title, msg, def ?? ''),
        showConfirm: (title, msg, opts)   => showConfirmDialog(title, msg, { okLabel: 'OK', cancelLabel: 'Cancel', ...opts }),
        onMatchChange:         (matches) => {
          if (!matches) {
            renderer._selectedTipIds.clear();
            renderer._mrcaNodeId = null;
            if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(false);
            _updateStatusSelect(0);
            renderer._dirty = true;
            return;
          }
          renderer._selectedTipIds = new Set(matches.map(n => n.id));
          renderer._mrcaNodeId = null;
          if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(matches.length > 0);
          _updateStatusSelect(matches.length);
          renderer._dirty = true;
          // Scroll topmost matching tip into view when tree is zoomed
          if (matches.length > 0 && renderer._targetScaleY > renderer.minScaleY * 1.01) {
            const top = matches.reduce((a, b) => a.y < b.y ? a : b);
            const newOffsetY = renderer.treePaddingTop + 10 - top.y * renderer._targetScaleY;
            renderer._setTarget(newOffsetY, renderer._targetScaleY, false);
          }
        },
        getFilterManager:      () => filterManager,
      });
    } else {
      filterControl = null;
    }

    // ── Hide/Show helpers ─────────────────────────────────────────────────────
    function _selectedNodeId() {
      if (renderer._mrcaNodeId) return renderer._mrcaNodeId;
      if (renderer._selectedTipIds.size === 1) return [...renderer._selectedTipIds][0];
      return null;
    }

    function canHide() {
      if (!graph) return false;
      // Multi-tip prune: hide each tip individually and contract degree-2 ancestors.
      if (renderer._selectedTipIds.size > 1) {
        if (!renderer.nodes) return false;
        const sel = renderer._selectedTipIds;
        // At least one selected tip must not already be hidden.
        if (![...sel].some(id => !graph.hiddenNodeIds.has(id))) return false;
        // After pruning all selected tips at least 2 non-selected visible tips must remain.
        // Degree-2 contraction only hides internal nodes, never unselected tips, so this
        // count is a tight lower bound on the visible tips left after the operation.
        const remaining = renderer.nodes.filter(
          n => n.isTip && !sel.has(n.id) && !graph.hiddenNodeIds.has(n.id)
        ).length;
        return remaining >= 2;
      }
      const nodeId = _selectedNodeId();
      if (!nodeId || !renderer.nodeMap) return false;
      const node = renderer.nodeMap.get(nodeId);
      if (!node || !node.parentId) return false; // root (or subtree root)
      if (graph.hiddenNodeIds.has(nodeId)) return false; // already hidden
      // Parent must keep at least 1 other visible child after hiding.
      const parent = renderer.nodeMap.get(node.parentId);
      if (!parent || parent.children.filter(cid => cid !== nodeId).length < 1) return false;
      // Guard: each branch of the current view root must keep ≥1 visible tip.
      const viewSubtreeRootId = renderer._viewSubtreeRootId;
      if (viewSubtreeRootId) {
        // Subtree view: each child branch of the subtree root must keep ≥1 visible tip.
        const subtreeIdx = graph.origIdToIdx.get(viewSubtreeRootId);
        if (subtreeIdx !== undefined) {
          for (const adjIdx of graph.nodes[subtreeIdx].adjacents.slice(1)) {
            if (graphVisibleTipCount(graph, adjIdx, subtreeIdx, nodeId) === 0) return false;
          }
        }
        return true;
      }
      // Full tree: both sides of the global root must keep ≥1 visible tip.
      const { nodeA, nodeB, lenA } = graph.root;
      let countA, countB;
      if (lenA === 0) {
        // nodeA is the real root; side A = all subtrees of nodeA except nodeB's branch.
        countA = 0;
        for (const adj of graph.nodes[nodeA].adjacents) {
          if (adj !== nodeB) countA += graphVisibleTipCount(graph, adj, nodeA, nodeId);
        }
        countB = graphVisibleTipCount(graph, nodeB, nodeA, nodeId);
      } else {
        // Virtual root between nodeA and nodeB.
        countA = graphVisibleTipCount(graph, nodeA, nodeB, nodeId);
        countB = graphVisibleTipCount(graph, nodeB, nodeA, nodeId);
      }
      // Allow hiding an entire side of the root: only require ≥ 2 visible tips remain in total.
      if (countA + countB < 2) return false;
      return true;
    }

    function _resolveGraphStart(nodeId) {
      // Returns { gIdx, gFromIdx } for a layout node id, accounting for root.
      const gIdx = graph.origIdToIdx.get(nodeId);
      if (gIdx === undefined) return null; // virtual root
      const { nodeA, lenA } = graph.root;
      const isRoot = lenA === 0 && gIdx === nodeA;
      const gFromIdx = isRoot ? -1 : graph.nodes[gIdx].adjacents[0];
      return { gIdx, gFromIdx };
    }

    function _prevStackIsDownward() {
      // Returns true when the top of _navStack is a node that lives within the
      // current layout — i.e. the last history entry was a drill-down, so the
      // drill button can act as "undo climb".
      if (!renderer._navStack.length || !renderer.nodeMap) return false;
      const prevId = renderer._navStack[renderer._navStack.length - 1].subtreeRootId;
      if (!prevId) return false;
      const prevNode = renderer.nodeMap.get(prevId);
      return !!(prevNode && prevNode.parentId); // must exist in current layout and not be the view root
    }

    function canDrill() {
      if (!renderer.nodeMap) return false;
      const nodeId = _selectedNodeId();
      // No selection: enable drill as "undo climb" only if the previous stack
      // entry is a node inside the current subtree (a downward move).
      if (!nodeId) return _prevStackIsDownward();
      const node = renderer.nodeMap.get(nodeId);
      // Allow drilling into collapsed clades (isTip=true but isCollapsed=true).
      return !!(node && (!node.isTip || node.isCollapsed) && node.parentId);
    }

    function canClimb() {
      return !!renderer._viewSubtreeRootId;
    }

    function canShow() {
      if (!graph || !graph.hiddenNodeIds.size) return false;
      const nodeId = _selectedNodeId();
      const viewSubtreeRootId = renderer._viewSubtreeRootId;
      if (viewSubtreeRootId) {
        // Subtree view: only care about hidden nodes within this subtree.
        const subtreeIdx = graph.origIdToIdx.get(viewSubtreeRootId);
        if (subtreeIdx === undefined) return false;
        const fromIdx = graph.nodes[subtreeIdx].adjacents[0] ?? -1;
        if (!nodeId) return graphSubtreeHasHidden(graph, subtreeIdx, fromIdx);
        const gs = _resolveGraphStart(nodeId);
        if (!gs) return false;
        return graphSubtreeHasHidden(graph, gs.gIdx, gs.gFromIdx);
      }
      // Full tree view.
      if (!nodeId) return true; // no selection — any hidden nodes count
      const gs = _resolveGraphStart(nodeId);
      if (!gs) return graph.hiddenNodeIds.size > 0; // virtual root — any hidden counts
      return graphSubtreeHasHidden(graph, gs.gIdx, gs.gFromIdx);
    }
    // isExplicitlyRooted is read dynamically (closured from outer scope) so
    // subsequent tree loads automatically pick up the new value.
    // (tree-midpoint is also set per-load in loadTree; this run of bindControls
    //  is a no-op on that path but is kept for safety.)
    // Zoom / fit / lens buttons — driven by commands; direct listener no longer needed.
    $('btn-zoom-in') ?.addEventListener('click', () => commands.execute('view-zoom-in'));
    $('btn-zoom-out')?.addEventListener('click', () => commands.execute('view-zoom-out'));
    $('btn-hyp-up')  ?.addEventListener('click', () => commands.execute('view-hyp-up'));
    $('btn-hyp-down')?.addEventListener('click', () => commands.execute('view-hyp-down'));

    renderer._onNavChange = (canBack, canFwd) => {
      commands.setEnabled('view-back',    canBack);
      commands.setEnabled('view-forward', canFwd);
      commands.setEnabled('view-home',    !!renderer._viewSubtreeRootId);
      commands.setEnabled('view-drill',   canDrill());
      commands.setEnabled('view-climb',   canClimb());
    };

    renderer._onBranchSelectChange = (hasSelection) => {
      if (renderer._mode === 'branches') {
        commands.setEnabled('tree-reroot', !isExplicitlyRooted && hasSelection);
      }
    };
    renderer._onNodeSelectChange = (hasSelection) => {
      if (renderer._mode === 'nodes') {
        commands.setEnabled('tree-reroot', !isExplicitlyRooted && hasSelection);
      }
      const canRotate = renderer._mode === 'nodes' && hasSelection;
      commands.setEnabled('view-info',        !!graph);
      commands.setEnabled('view-drill',       canDrill());
      commands.setEnabled('view-climb',       canClimb());
      commands.setEnabled('tree-rotate',      canRotate);
      commands.setEnabled('tree-rotate-all',  canRotate);
      commands.setEnabled('tree-hide',        canHide());
      commands.setEnabled('tree-show',        canShow());
      commands.setEnabled('tree-collapse-clade', canCollapse());
      commands.setEnabled('tree-expand-clade',   canExpand());
      commands.setEnabled('tree-paint',       hasSelection);
      const hasMrca = !!renderer._mrcaNodeId;
      commands.setEnabled('tree-highlight-clade',  hasMrca);
      commands.setEnabled('tree-clear-highlights', renderer._cladeHighlights.size > 0);
      // Update status-bar selection count for canvas-click selections.
      // Filter-driven selections update it directly in filterControl.
      if (!filterControl?.getInputValue()?.trim()) {
        _updateStatusSelect(hasSelection ? renderer._selectedTipIds.size : 0);
      }
      // Keep the data table in sync with the canvas selection
      dataTableRenderer.syncSelection(renderer._selectedTipIds);
      rttChart?.notifySelectionChange?.();
      _syncLegendSelection();
      _emitSelectionChanged();
    };

    btnBack?.addEventListener('click',    () => renderer.navigateBack());
    btnForward?.addEventListener('click', () => renderer.navigateForward());
    btnHome?.addEventListener('click',    () => renderer.navigateHome());
    btnDrill?.addEventListener('click',   () => {
      const nodeId = _selectedNodeId();
      if (nodeId && canDrill()) renderer.navigateInto(nodeId);
      else if (!nodeId && _prevStackIsDownward()) {
        renderer.navigateBack();
        // navigateBack() seeds offsetX via the fast spring; hijack it with the
        // slow root-shift animation so the undo-climb transition mirrors the climb.
        renderer._rootShiftFromX = renderer.offsetX;
        renderer._rootShiftToX   = renderer._targetOffsetX;
        renderer._rootShiftAlpha = 0;
      }
    });
    btnClimb?.addEventListener('click',   () => renderer.navigateClimb());

    btnOrderAsc?.addEventListener('click',  () => applyOrder(false));
    btnOrderDesc?.addEventListener('click', () => applyOrder(true));

    // ── Rotate node ──────────────────────────────────────────────────────────
    // btn-rotate     → reverse direct children of the selected internal node.
    // btn-rotate-all → reverse children at every level of the subtree.
    // Both clear the global auto-ordering so the manual order is preserved.
    function applyRotate(recursive) {
      // Prefer the MRCA (≥2 tips selected or internal node clicked directly).
      // Fall back to the parent of a single selected tip.
      let nodeId = renderer._mrcaNodeId;
      if (!nodeId && renderer._selectedTipIds.size === 1) {
        const tipId   = [...renderer._selectedTipIds][0];
        const tipNode = renderer.nodeMap.get(tipId);
        nodeId = tipNode?.parentId ?? null;
      }
      if (!nodeId) return;

      rotateNodeGraph(graph, nodeId, recursive);

      // Disable global auto-ordering — the manual rotation must be preserved.
      currentOrder = null;
      btnOrderAsc ?.classList.remove('active');
      btnOrderDesc?.classList.remove('active');

      // Recompute layout and animate.
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, _layoutOptions());
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      saveSettings();
    }

    btnRotate?.addEventListener('click',    () => applyRotate(false));
    btnRotateAll?.addEventListener('click', () => applyRotate(true));

    // ── Hide / Show ───────────────────────────────────────────────────────────

    /**
     * If the visual root changes after a hide/show (because one side of the
     * root was collapsed away), seed renderer.offsetX so the effective root
     * node starts at its OLD screen position, then let the existing _animating
    * lerp slide it to treePaddingLeft.  Call this AFTER setDataAnimated but
     * BEFORE fitToWindow.
     *
     * @param {object|null} oldRoot    - the old layout root node (may be null)
     * @param {Map}         oldNodeMap - the layout nodeMap BEFORE the new layout was installed
     * @param {object[]}    newNodes   - new layout nodes array
     * @param {'in'|'out'}  direction  - 'in' = root moved deeper, 'out' = root moved toward real root
     */
    function _seedRootShiftAnimation(oldRoot, oldNodeMap, newNodes, direction) {
      if (renderer._viewSubtreeRootId) return; // only for full-tree view
      const newRoot = newNodes.find(n => !n.parentId);
      if (!newRoot || !oldRoot || newRoot.id === oldRoot.id) return;

      const curScaleX  = renderer.scaleX;   // still old value (lerp hasn't ticked yet)
      const curOffsetX = renderer.offsetX;  // still treePaddingLeft from old layout

      if (direction === 'in') {
        // Root moved deeper: new root was at oldX > 0 in the old layout.
        // Slide from that displaced position in to treePaddingLeft.
        const oldNode = oldNodeMap?.get(newRoot.id);
        if (!oldNode) return;
        renderer._rootShiftFromX = curOffsetX + oldNode.x * curScaleX;
      } else {
        // Root moved toward real root: old effective root is somewhere down the new layout.
        // Slide from that negative-offset position out to treePaddingLeft.
        const newOldRootNode = renderer.nodeMap?.get(oldRoot.id);
        if (!newOldRootNode) return;
        renderer._rootShiftFromX = curOffsetX - newOldRootNode.x * curScaleX;
      }
      renderer._rootShiftToX   = renderer._targetOffsetX;   // = treePaddingLeft
      renderer._rootShiftAlpha = 0;
      renderer.offsetX  = renderer._rootShiftFromX;   // snap to start position immediately
      renderer._animating = true;
    }

    function applyHide() {
      if (!canHide()) return;

      // Snapshot the current visual root and viewport BEFORE mutating the graph / layout.
      const oldRoot           = renderer.nodes?.find(n => !n.parentId) ?? null;
      const oldNodeMap        = renderer.nodeMap;
      const wasInFitLabels    = renderer._fitLabelsMode;
      const prevMinScaleY     = renderer.minScaleY;
      const prevTargetScaleY  = renderer._targetScaleY;
      const prevTargetOffsetY = renderer._targetOffsetY;

      if (renderer._selectedTipIds.size > 1) {
        // Multi-tip prune using ancestor remaining-count map.
        //
        // Phase 1 – walk up from each selected tip building a map of how many
        // unaccounted-for child-subtrees each ancestor retains.
        //
        //   • First visit to a node: count = (ALL non-hidden children in
        //     adjacents[1..], including the direction we came from).
        //     Store count−1 (that −1 accounts for the path we walked up from).
        //     Always stop on first visit.
        //   • Subsequent visits (another selected tip arrived): decrement by 1.
        //     – result > 0 → stop  (node still has unclaimed children)
        //     – result == 0 → continue up  (all children now accounted for)
        //
        // Phase 2 – hiding:
        //   • Ancestors whose count == 0 are fully consumed by selected tips:
        //     hide the ancestor node (hides its whole subtree in one step).
        //   • Selected tips not covered by a hidden ancestor are hidden directly.
        //   • Ancestors with remaining count ≥ 1 are left alone; the layout's
        //     post-pass suppresses any resulting degree-2 nodes automatically.

        const { nodeA, nodeB } = graph.root;
        const rootGuard = new Set([nodeA, nodeB]); // indices

        // --- Phase 1 ---
        const remaining = new Map(); // nodeIdx → remaining unaccounted children

        for (const tipId of renderer._selectedTipIds) {
          if (graph.hiddenNodeIds.has(tipId)) continue;
          const tipIdx = graph.origIdToIdx.get(tipId);
          if (tipIdx === undefined) continue;

          let comingFrom = tipIdx;
          let nodeIdx    = graph.nodes[tipIdx].adjacents[0];

          while (nodeIdx !== undefined && nodeIdx >= 0 && !rootGuard.has(nodeIdx)) {
            if (!remaining.has(nodeIdx)) {
              // First visit: count ALL non-hidden children (adjacents[1..]),
              // including comingFrom — that path is "owned" by this tip and
              // is accounted for by the −1.
              const count = graph.nodes[nodeIdx].adjacents.slice(1)
                .filter(ci => !graph.hiddenNodeIds.has(graph.nodes[ci].origId))
                .length;
              remaining.set(nodeIdx, count - 1);
              break; // always stop on first visit
            } else {
              const newCount = remaining.get(nodeIdx) - 1;
              remaining.set(nodeIdx, newCount);
              if (newCount > 0) break; // still has unclaimed children — stop
              // newCount === 0: fully consumed — continue propagating upward
            }
            comingFrom = nodeIdx;
            nodeIdx    = graph.nodes[nodeIdx].adjacents[0];
          }
        }

        // --- Phase 2 ---
        // Collect fully-consumed ancestor origIds (remaining === 0).
        const hiddenAncestorIds = new Set();
        for (const [ni, count] of remaining) {
          if (count === 0) hiddenAncestorIds.add(graph.nodes[ni].origId);
        }

        // Hide fully-consumed ancestors (covers their entire subtrees).
        for (const origId of hiddenAncestorIds) {
          graph.hiddenNodeIds.add(origId);
        }

        // Hide individual selected tips not already covered by a hidden ancestor.
        for (const tipId of renderer._selectedTipIds) {
          if (graph.hiddenNodeIds.has(tipId)) continue;
          const tipIdx = graph.origIdToIdx.get(tipId);
          if (tipIdx === undefined) continue;

          let covered = false;
          let ni = graph.nodes[tipIdx].adjacents[0];
          while (ni !== undefined && ni >= 0 && !rootGuard.has(ni)) {
            if (hiddenAncestorIds.has(graph.nodes[ni].origId)) { covered = true; break; }
            if (!remaining.has(ni)) break; // outside affected ancestry
            ni = graph.nodes[ni].adjacents[0];
          }
          if (!covered) graph.hiddenNodeIds.add(tipId);
        }
      } else {
        const nodeId = _selectedNodeId();
        if (!nodeId) return;
        graph.hiddenNodeIds.add(nodeId);
      }

      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId = null;
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(false);
      // Forward history may reference nodes that are now hidden — invalidate it.
      renderer._fwdStack = [];
      if (renderer._onNavChange) renderer._onNavChange(renderer._navStack.length > 0, false);
      // Hiding changes tip counts so any auto-ordering is no longer meaningful.
      currentOrder = null;
      btnOrderAsc ?.classList.remove('active');
      btnOrderDesc?.classList.remove('active');
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, _layoutOptions());
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      _seedRootShiftAnimation(oldRoot, oldNodeMap, layout.nodes, 'in');
      _restoreViewAfterLayoutChange(wasInFitLabels, prevMinScaleY, prevTargetScaleY, prevTargetOffsetY);
    }

    function applyShow() {
      if (!canShow()) return;
      const nodeId  = _selectedNodeId();
      const viewSubtreeRootId = renderer._viewSubtreeRootId;

      // Snapshot all currently-hidden entry origIds BEFORE modifying the set,
      // so we can select the newly-revealed tips after the layout is installed.
      const prevHidden = new Set(graph.hiddenNodeIds);

      if (viewSubtreeRootId) {
        // Subtree view: reveal hidden nodes only within this subtree.
        const startId = nodeId ?? viewSubtreeRootId;
        const startIdx = graph.origIdToIdx.get(startId);
        if (startIdx !== undefined) {
          const fromIdx = graph.nodes[startIdx].adjacents[0] ?? -1;
          function revealSubtree(ni, fi) {
            graph.hiddenNodeIds.delete(graph.nodes[ni].origId);
            for (const adj of graph.nodes[ni].adjacents) {
              if (adj !== fi) revealSubtree(adj, ni);
            }
          }
          revealSubtree(startIdx, fromIdx);
        }
      } else if (!nodeId) {
        // Full tree, no selection: clear all hidden nodes.
        graph.hiddenNodeIds.clear();
      } else {
        // Full tree, selection: reveal all hidden nodes in the selected subtree.
        function revealAll(gnodeIdx, fromIdx) {
          for (const adjIdx of graph.nodes[gnodeIdx].adjacents) {
            if (adjIdx === fromIdx) continue;
            graph.hiddenNodeIds.delete(graph.nodes[adjIdx].origId);
            revealAll(adjIdx, gnodeIdx);
          }
        }
        const gs = _resolveGraphStart(nodeId);
        if (gs) {
          revealAll(gs.gIdx, gs.gFromIdx);
        } else {
          revealAll(graph.root.nodeA, graph.root.nodeB);
          revealAll(graph.root.nodeB, graph.root.nodeA);
        }
      }

      // Collect all tip origIds that were transitively hidden under prevHidden entries.
      // A tip is "was-hidden" if it or any ancestor's origId was in prevHidden.
      const wasHiddenTipIds = new Set();
      for (const entryOrigId of prevHidden) {
        const entryIdx = graph.origIdToIdx.get(entryOrigId);
        if (entryIdx === undefined) continue;
        const fromIdx = graph.nodes[entryIdx].adjacents[0] ?? -1;
        // Walk down from the hidden entry collecting all descendant tips.
        const stack = [{ ni: entryIdx, fi: fromIdx }];
        while (stack.length) {
          const { ni, fi } = stack.pop();
          const gn = graph.nodes[ni];
          const children = gn.adjacents.filter(a => a !== fi);
          if (children.length === 0) {
            // Leaf node
            wasHiddenTipIds.add(gn.origId);
          } else {
            for (const ci of children) stack.push({ ni: ci, fi: ni });
          }
        }
      }

      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId = null;
      // Showing nodes changes tip counts so any auto-ordering is no longer meaningful.
      currentOrder = null;
      btnOrderAsc ?.classList.remove('active');
      btnOrderDesc?.classList.remove('active');

      // Snapshot the current visual root and viewport BEFORE installing the new layout.
      const oldRoot           = renderer.nodes?.find(n => !n.parentId) ?? null;
      const oldNodeMap        = renderer.nodeMap;
      const wasInFitLabels    = renderer._fitLabelsMode;
      const prevMinScaleY     = renderer.minScaleY;
      const prevTargetScaleY  = renderer._targetScaleY;
      const prevTargetOffsetY = renderer._targetOffsetY;

      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, _layoutOptions());
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      // Select the newly-revealed tips so the user can see which were unhidden.
      for (const node of layout.nodes) {
        if (node.isTip && wasHiddenTipIds.has(node.id)) {
          renderer._selectedTipIds.add(node.id);
        }
      }
      renderer._updateMRCA();
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(renderer._selectedTipIds.size > 0);

      _seedRootShiftAnimation(oldRoot, oldNodeMap, layout.nodes, 'out');
      _restoreViewAfterLayoutChange(wasInFitLabels, prevMinScaleY, prevTargetScaleY, prevTargetOffsetY);
    }

    $('btn-invert-selection')?.addEventListener('click', () => commands.execute('select-invert'));

    btnHide?.addEventListener('click', () => applyHide());
    btnShow?.addEventListener('click', () => applyShow());

    // ── Collapse / Expand clade triangle ─────────────────────────────────────
    const btnCollapseClade = $('btn-collapse-clade');
    const btnExpandClade   = $('btn-expand-clade');

    function canCollapse() {
      if (!graph) return false;
      // Need a selected internal MRCA that isn't already collapsed.
      const nodeId = renderer._mrcaNodeId ?? _selectedNodeId();
      if (!nodeId) return false;
      const layoutNode = renderer.nodeMap?.get(nodeId);
      if (!layoutNode) return false;
      // Already collapsed → can't collapse again (use expand first).
      if (layoutNode.isCollapsed) return false;
      // Must be an internal node (has children in layout).
      if (layoutNode.isTip) return false;
      // Cannot collapse the root of the current view.
      if (!layoutNode.parentId) return false;
      return true;
    }

    /**
     * Returns the effective root node id for expand/collapse operations:
     * MRCA, single selected node, or the layout root if nothing is selected.
     */
    function _effectiveRootId() {
      const nodeId = renderer._mrcaNodeId ?? _selectedNodeId();
      if (nodeId) return nodeId;
      return renderer.nodes?.find(n => !n.parentId)?.id ?? null;
    }

    /**
     * Returns the origIds of all collapsed clades reachable at the first level
     * from `layoutNodeId` (traversal stops at — and collects — each collapsed node).
     */
    function _firstLevelCollapsedUnder(layoutNodeId) {
      const result = [];
      const stack  = [layoutNodeId];
      while (stack.length) {
        const id   = stack.pop();
        const node = renderer.nodeMap?.get(id);
        if (!node) continue;
        if (node.isCollapsed) {
          result.push(id);
        } else {
          for (const cid of node.children) stack.push(cid);
        }
      }
      return result;
    }

    function canExpand() {
      if (!graph || !graph.collapsedCladeIds.size) return false;
      const rootId = _effectiveRootId();
      if (!rootId) return false;
      return _firstLevelCollapsedUnder(rootId).length > 0;
    }

    /**
     * Count the real (actual) descendant tip count under `layoutNodeId`.
     * For nested collapsed clades, uses their stored `collapsedRealTips` so
     * the count reflects actual tips, not layout row-slots.
     */
    function _countRealDescendantTips(layoutNodeId) {
      let count = 0;
      const stack = [layoutNodeId];
      while (stack.length) {
        const id   = stack.pop();
        const node = renderer.nodeMap?.get(id);
        if (!node) continue;
        if (node.isTip) {
          // isCollapsed nodes store the real descendant tip count in collapsedRealTips.
          count += node.isCollapsed ? (node.collapsedRealTips || 1) : 1;
        } else {
          for (const cid of node.children) stack.push(cid);
        }
      }
      return count;
    }

    /**
     * Update the collapsed-clade height slider's max and value to reflect the
     * current set of collapsed clades.  Max = largest real tip count among all
     * collapsed clades.  If the slider was already at its old max it is moved
     * to the new max; otherwise the value is clamped to the new max.
     * Call this BEFORE computeLayoutFromGraph so _layoutOptions() sees the
     * updated value.
     */
    function _updateCollapsedHeightSlider() {
      if (!graph || !graph.collapsedCladeIds.size) return;
      let maxTips = 0;
      for (const [, info] of graph.collapsedCladeIds) {
        maxTips = Math.max(maxTips, info.tipCount || 1);
      }
      maxTips = Math.max(1, maxTips);

      const oldMax   = parseInt(collapsedHeightNSlider.max)   || 20;
      const oldValue = parseInt(collapsedHeightNSlider.value) || 1;
      const wasAtMax = oldValue >= oldMax;

      collapsedHeightNSlider.max = maxTips;
      const newValue = wasAtMax ? maxTips : Math.min(oldValue, maxTips);
      collapsedHeightNSlider.value = newValue;
      $('collapsed-height-n-value').textContent = newValue;
    }

    function applyCollapse() {
      if (!canCollapse()) return;
      const nodeId   = renderer._mrcaNodeId ?? _selectedNodeId();
      // Initial colour is null so the renderer uses the current theme's tip shape colour.
      // The brush command can override it; the eraser resets it back to null.
      const colour   = null;
      const tipCount = _countRealDescendantTips(nodeId);
      graph.collapsedCladeIds.set(nodeId, { colour, tipCount });

      // Update the slider range/value now that there's a new collapsed clade,
      // before computing the layout so _layoutOptions() reads the updated value.
      _updateCollapsedHeightSlider();
      renderer.setSettings(_buildRendererSettings());

      const oldRoot    = renderer.nodes?.find(n => !n.parentId) ?? null;
      const oldNodeMap = renderer.nodeMap;

      // Capture viewport state before installing the new layout.
      const wasInFitLabels = renderer._fitLabelsMode;
      const prevMinScaleY  = renderer.minScaleY;
      const prevTargetScaleY  = renderer._targetScaleY;
      const prevTargetOffsetY = renderer._targetOffsetY;

      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId = null;

      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, _layoutOptions());
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      // If annotation-based colouring is active, colour the newly added clade.
      if (collapsedCladeColourByEl?.value && collapsedCladeColourByEl.value !== 'user_colour') {
        _recolourAllCollapsed();
      }
      // Keep the collapsed node selected so commands remain meaningful.
      renderer._mrcaNodeId = nodeId;
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(true);
      _seedRootShiftAnimation(oldRoot, oldNodeMap, layout.nodes, 'in');
      // Restore or adapt the viewport rather than always resetting to fit-to-window.
      _restoreViewAfterLayoutChange(wasInFitLabels, prevMinScaleY, prevTargetScaleY, prevTargetOffsetY);
    }

    function applyExpand(nodeId) {
      if (!graph) return;
      // Capture explicit selection (MRCA or single tip) before clearing.
      // _selectedNodeId() returns null when nothing/multi-tip selected,
      // so this is non-null only when the user had something meaningfully selected.
      const savedSelection = renderer._mrcaNodeId ?? _selectedNodeId();

      if (nodeId) {
        // Single-node expand: called from double-click on a collapsed triangle.
        graph.collapsedCladeIds.delete(nodeId);
      } else {
        // Button / command: expand ALL first-level collapsed clades under the
        // effective root (selected node, MRCA, or layout root if nothing selected).
        const rootId    = _effectiveRootId();
        if (!rootId) return;
        const toExpand  = _firstLevelCollapsedUnder(rootId);
        if (!toExpand.length) return;
        for (const id of toExpand) graph.collapsedCladeIds.delete(id);
      }

      // Update the slider range now that a clade has been removed.
      _updateCollapsedHeightSlider();
      renderer.setSettings(_buildRendererSettings());

      const oldRoot    = renderer.nodes?.find(n => !n.parentId) ?? null;
      const oldNodeMap = renderer.nodeMap;

      // Capture viewport state before installing the new layout.
      const wasInFitLabels    = renderer._fitLabelsMode;
      const prevMinScaleY     = renderer.minScaleY;
      const prevTargetScaleY  = renderer._targetScaleY;
      const prevTargetOffsetY = renderer._targetOffsetY;

      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId = null;

      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, _layoutOptions());
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      // Restore the previously selected node if there was an explicit selection
      // and the node still exists in the new layout.
      if (savedSelection && layout.nodeMap.has(savedSelection)) {
        // Re-select all descendant tips so they appear highlighted, then let
        // the renderer recompute the MRCA from those tips.
        const tips = renderer._getDescendantTipIds(savedSelection);
        for (const id of tips) renderer._selectedTipIds.add(id);
        renderer._updateMRCA();
        if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(true);
      } else {
        if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(false);
      }
      _seedRootShiftAnimation(oldRoot, oldNodeMap, layout.nodes, 'out');
      // Restore or adapt the viewport rather than always resetting to fit-to-window.
      _restoreViewAfterLayoutChange(wasInFitLabels, prevMinScaleY, prevTargetScaleY, prevTargetOffsetY);
    }

    /**
     * After a collapse/expand layout change, either re-apply fit-labels (if
     * that was the active mode) or scale the current zoom proportionally to
     * the new layout height so the user's zoom level feels continuous.
     */
    function _restoreViewAfterLayoutChange(wasInFitLabels, prevMinScaleY, prevTargetScaleY, prevTargetOffsetY) {
      if (wasInFitLabels) {
        // Re-run fit-labels for the new tip count.
        renderer.fitLabels();
      } else {
        // Keep the zoom ratio: if the user was 3× above minScaleY before,
        // stay 3× above the new minScaleY.  Clamp to [minScaleY, …] so we
        // never go below fully-zoomed-out.
        const newMinScaleY = renderer.minScaleY;
        const ratio        = prevMinScaleY > 0 ? prevTargetScaleY / prevMinScaleY : 1;
        const newScaleY    = Math.max(newMinScaleY, newMinScaleY * ratio);
        const newOffsetY   = renderer._clampedOffsetY(prevTargetOffsetY, newScaleY);
        renderer._setTarget(newOffsetY, newScaleY, /*immediate*/ false);
      }
    }

    // Double-click on collapsed triangle calls this callback.
    renderer._onCollapseExpand = (nodeId) => applyExpand(nodeId);

    btnCollapseClade?.addEventListener('click', () => applyCollapse());
    btnExpandClade  ?.addEventListener('click', () => applyExpand());

    commands.get('tree-collapse-clade').exec = () => applyCollapse();
    commands.get('tree-expand-clade').exec   = () => applyExpand();

    // ── Clade Highlights ─────────────────────────────────────────────────────

    function _resolveHighlightColour(nodeId = renderer._mrcaNodeId) {
      const colourBy = cladeHighlightColourByEl?.value ?? 'user_colour';
      if (colourBy === 'user_colour') {
        return paintColourPickerEl?.value ?? '#ffaa00';
      }
      const fallback = paintColourPickerEl?.value ?? '#ffaa00';
      const def    = renderer?._annotationSchema?.get(colourBy);
      if (!nodeId || !renderer.nodeMap) return fallback;

      const scale = renderer._buildColourScale?.(colourBy);
      if (!scale || scale.size === 0) return fallback;

      let resolvedValue = null;

      // For node annotations: try the root node's own value first.
      if (def?.onNodes) {
        const node = renderer.nodeMap.get(nodeId);
        const nVal = renderer._statValue?.(node, colourBy);
        if (nVal != null && nVal !== '') resolvedValue = nVal;
      }

      // Fall back to aggregating descendant tip values.
      if (resolvedValue == null) {
        const node = renderer.nodeMap.get(nodeId);
        resolvedValue = renderer._aggregateTipValue?.(node, colourBy) ?? null;
        if (resolvedValue == null) return fallback;
      }

      const colour = renderer._colourFromScale?.(resolvedValue, scale);
      return colour ?? fallback;
    }

    function _recolourAllHighlights() {
      if (!renderer._cladeHighlights?.size) return;
      for (const nodeId of renderer._cladeHighlights.keys()) {
        const colour = _resolveHighlightColour(nodeId);
        renderer.setCladeHighlightColour(nodeId, colour);
      }
      _refreshHighlightList();
      saveSettings();
    }

    function _resolveCollapsedColour(nodeId) {
      const colourBy = collapsedCladeColourByEl?.value ?? 'user_colour';
      if (colourBy === 'user_colour') return null; // null → renderer uses tipShapeColor
      const def  = renderer?._annotationSchema?.get(colourBy);
      const node = renderer.nodeMap?.get(nodeId);
      if (!node) return null;

      const scale = renderer._buildColourScale?.(colourBy);
      if (!scale || scale.size === 0) return null;

      let resolvedValue = null;

      // For node annotations: try the collapsed root node's own value first.
      if (def?.onNodes) {
        const nVal = renderer._statValue?.(node, colourBy);
        if (nVal != null && nVal !== '') resolvedValue = nVal;
      }

      // Fall back to aggregating descendant tip values.
      if (resolvedValue == null) {
        resolvedValue = renderer._aggregateTipValue?.(node, colourBy) ?? null;
        if (resolvedValue == null) return null;
      }

      return renderer._colourFromScale?.(resolvedValue, scale) ?? null;
    }

    function _recolourAllCollapsed() {
      if (!graph?.collapsedCladeIds?.size) return;
      for (const [id, info] of graph.collapsedCladeIds) {
        const colour = _resolveCollapsedColour(id);
        graph.collapsedCladeIds.set(id, { ...info, colour });
        const layoutNode = renderer.nodeMap?.get(id);
        if (layoutNode) layoutNode.collapsedColour = colour;
      }
      renderer._dirty = true;
      saveSettings();
    }

    function _refreshHighlightList() {
      if (!cladeHighlightListEl) return;
      const data = renderer.getCladeHighlightsData();
      if (data.length === 0) {
        cladeHighlightListEl.innerHTML = '<span class="pt-no-highlights">No highlights</span>';
        return;
      }
      cladeHighlightListEl.innerHTML = '';
      for (const { id, colour } of data) {
        const node = renderer.nodeMap?.get(id);
        const label = node?.label || node?.name || id;
        const row = document.createElement('div');
        row.className = 'pt-highlight-item';

        const swatch = document.createElement('div');
        swatch.className = 'pt-highlight-swatch';
        swatch.style.background = colour ?? '#ffaa00';
        swatch.title = colour ?? '#ffaa00';

        const name = document.createElement('span');
        name.className = 'pt-highlight-name';
        name.textContent = label;

        const btnRemove = document.createElement('button');
        btnRemove.className = 'pt-btn-icon';
        btnRemove.title = 'Remove highlight';
        btnRemove.innerHTML = '<i class="bi bi-x"></i>';
        btnRemove.addEventListener('click', () => {
          renderer.removeCladeHighlight(id);
          _refreshHighlightList();
          commands.setEnabled('tree-clear-highlights', renderer._cladeHighlights.size > 0);
          saveSettings();
        });

        row.appendChild(swatch);
        row.appendChild(name);
        row.appendChild(btnRemove);
        cladeHighlightListEl.appendChild(row);
      }
    }
    _refreshHighlightListFn = _refreshHighlightList;

    const btnHighlightClade = $('btn-highlight-clade');
    const btnClearHighlights = $('btn-clear-highlights');

    btnHighlightClade?.addEventListener('click', () => {
      const nodeId = renderer._mrcaNodeId;
      if (!nodeId) return;
      const colour = _resolveHighlightColour();
      renderer.addCladeHighlight(nodeId, colour);
      _refreshHighlightList();
      commands.setEnabled('tree-clear-highlights', true);
      saveSettings();
    });

    btnClearHighlights?.addEventListener('click', async () => {
      const mrcaId = renderer._mrcaNodeId;

      // Case 1: specific highlighted node selected — remove without confirm
      if (mrcaId && renderer._cladeHighlights.has(mrcaId)) {
        renderer.removeCladeHighlight(mrcaId);
        _refreshHighlightList();
        commands.setEnabled('tree-clear-highlights', renderer._cladeHighlights.size > 0);
        saveSettings();
        return;
      }

      // Case 2 & 3: collect highlights under mrcaId, subtree root, or all
      const rootId = mrcaId ?? renderer._viewSubtreeRootId ?? null;
      const toRemove = [...renderer._cladeHighlights.keys()].filter(id => {
        if (!rootId) return true;
        let n = renderer.nodeMap?.get(id);
        while (n) {
          if (n.id === rootId) return true;
          n = n.parentId ? renderer.nodeMap.get(n.parentId) : null;
        }
        return false;
      });
      if (toRemove.length === 0) return;
      const msg = toRemove.length === 1
        ? 'Remove this clade highlight?'
        : `Remove ${toRemove.length} clade highlights?`;
      if (!await showConfirmDialog('Remove highlight', msg, { okLabel: 'Remove', cancelLabel: 'Cancel' })) return;
      toRemove.forEach(id => renderer.removeCladeHighlight(id));
      _refreshHighlightList();
      commands.setEnabled('tree-clear-highlights', renderer._cladeHighlights.size > 0);
      saveSettings();
    });

    btnPaintHighlight?.addEventListener('click', () => {
      const nodeId = renderer._mrcaNodeId;
      if (!nodeId || !renderer._cladeHighlights.has(nodeId)) return;
      renderer.setCladeHighlightColour(nodeId, paintColourPickerEl?.value ?? '#ffaa00');
      _refreshHighlightList();
      saveSettings();
    });

    // Style change listeners
    optionsController.on('clade-highlight-left-edge', () => {
      renderer?.setCladeHighlightStyle({ cladeHighlightLeftEdge: cladeHighlightLeftEdgeEl.value });
      saveSettings();
    });
    optionsController.on('clade-highlight-right-edge', () => {
      renderer?.setCladeHighlightStyle({ cladeHighlightRightEdge: cladeHighlightRightEdgeEl.value });
      saveSettings();
    });
    optionsController.on('clade-highlight-padding', ({ type }) => {
      if (type !== 'input') return;
      const v = cladeHighlightPaddingSlider.value;
      const valEl = $('clade-highlight-padding-value');
      if (valEl) valEl.textContent = v;
      renderer?.setCladeHighlightStyle({ cladeHighlightPadding: parseFloat(v) });
      saveSettings();
    });
    optionsController.on('clade-highlight-radius', ({ type }) => {
      if (type !== 'input') return;
      const v = cladeHighlightRadiusSlider.value;
      const valEl = $('clade-highlight-radius-value');
      if (valEl) valEl.textContent = v;
      renderer?.setCladeHighlightStyle({ cladeHighlightRadius: parseFloat(v) });
      saveSettings();
    });
    optionsController.on('clade-highlight-fill-opacity', ({ type }) => {
      if (type !== 'input') return;
      const v = cladeHighlightFillOpacitySlider.value;
      const valEl = $('clade-highlight-fill-opacity-value');
      if (valEl) valEl.textContent = v;
      renderer?.setCladeHighlightStyle({ cladeHighlightFillOpacity: parseFloat(v) });
      saveSettings();
    });
    optionsController.on('clade-highlight-stroke-opacity', ({ type }) => {
      if (type !== 'input') return;
      const v = cladeHighlightStrokeOpacitySlider.value;
      const valEl = $('clade-highlight-stroke-opacity-value');
      if (valEl) valEl.textContent = v;
      renderer?.setCladeHighlightStyle({ cladeHighlightStrokeOpacity: parseFloat(v) });
      saveSettings();
    });
    optionsController.on('clade-highlight-stroke-width', ({ type }) => {
      if (type !== 'input') return;
      const v = cladeHighlightStrokeWidthSlider.value;
      const valEl = $('clade-highlight-stroke-width-value');
      if (valEl) valEl.textContent = v;
      renderer?.setCladeHighlightStyle({ cladeHighlightStrokeWidth: parseFloat(v) });
      saveSettings();
    });

    optionsController.on('clade-highlight-colour-by', () => {
      _updateConfigureBtn(cladeHighlightConfigureRow, cladeHighlightColourByEl.value);
      _recolourAllHighlights();
    });

    optionsController.on('clade-highlight-configure-btn', ({ type }) => {
      if (type !== 'click') return;
      openAnnotConfig(cladeHighlightColourByEl?.value);
    });

    optionsController.on('collapsed-clade-colour-by', () => {
      _updateConfigureBtn(collapsedCladeConfigureRow, collapsedCladeColourByEl.value);
      _recolourAllCollapsed();
    });

    optionsController.on('collapsed-clade-configure-btn', ({ type }) => {
      if (type !== 'click') return;
      openAnnotConfig(collapsedCladeColourByEl?.value);
    });

    // Mode menu
    const btnModeNodes    = $('btn-mode-nodes');
    const btnModeBranches = $('btn-mode-branches');
    const applyMode = (mode) => {
      renderer.setMode(mode);
      btnModeNodes?.classList.toggle('active',    mode === 'nodes');
      btnModeBranches?.classList.toggle('active', mode === 'branches');
      saveSettings();
    };
    btnModeNodes?.addEventListener('click',    () => applyMode('nodes'));
    btnModeBranches?.addEventListener('click', () => applyMode('branches'));

    // Reroot button: branch-click position or node/MRCA midpoint
    btnReroot?.addEventListener('click', () => {
      let targetNode, distFromParent;

      if (renderer._mode === 'branches') {
        const selNode = renderer._branchSelectNode;
        const selX    = renderer._branchSelectX;
        if (!selNode || selX === null) return;
        const parentLayoutNode = renderer.nodeMap.get(selNode.parentId);
        if (!parentLayoutNode) return;
        targetNode = selNode;
        if (parentLayoutNode.id === '__graph_root__') {
          // The graph "parent" of a root-arm node is the OTHER arm (adjacents[0]
          // crosses the full root edge).  distFromParent must be measured from
          // that other-arm node, not from the virtual layout root at x=0.
          const selNodeIdx = graph.origIdToIdx.get(selNode.id);
          const otherLen   = (selNodeIdx === graph.root.nodeA) ? graph.root.lenB : graph.root.lenA;
          distFromParent   = otherLen + selX;
        } else {
          distFromParent = selX - parentLayoutNode.x;
        }
      } else {
        // Nodes mode: single tip → that node; ≥2 tips → their MRCA.
        let nodeId;
        if (renderer._selectedTipIds.size === 1) {
          nodeId = [...renderer._selectedTipIds][0];
        } else if (renderer._mrcaNodeId) {
          nodeId = renderer._mrcaNodeId;
        } else {
          return;
        }
        const layoutNode = renderer.nodeMap.get(nodeId);
        if (!layoutNode || !layoutNode.parentId) return;
        const parentLayoutNode = renderer.nodeMap.get(layoutNode.parentId);
        if (!parentLayoutNode) return;
        targetNode     = layoutNode;
        distFromParent = (layoutNode.x - parentLayoutNode.x) / 2;
      }

      if (!targetNode) return;
      applyReroot(targetNode.id, distFromParent);
    });

    btnMPR?.addEventListener('click', () => applyMidpointRoot());

    btnTemporalRoot?.addEventListener('click', () => applyTemporalRoot());
    btnTemporalRootGlobal?.addEventListener('click', () => applyTemporalRootGlobal());

    // ── Node Info (Cmd+I) ──────────────────────────────────────────────────

    function showNodeInfo() {
      // Determine which node is selected
      let nodeId = renderer._mrcaNodeId;
      if (!nodeId && renderer._selectedTipIds && renderer._selectedTipIds.size === 1) {
        nodeId = [...renderer._selectedTipIds][0];
      }
      if (!renderer.nodeMap) return;

      // ── No node selected → show tree-level summary ──────────────────────
      if (!nodeId) {
        const totalNodes = graph ? graph.nodes.length : 0;
        const totalTips  = graph ? graph.nodes.filter(n => n.adjacents.length === 1).length : 0;
        const totalInner = totalNodes - totalTips;
        const hiddenCount = (graph && graph.hiddenNodeIds) ? graph.hiddenNodeIds.size : 0;

        const visibleNodes = renderer.nodes || [];
        const visibleTips  = visibleNodes.filter(n => n.isTip).length;

        const schema = graph ? graph.annotationSchema : null;
        const annotKeys = schema
          ? [...schema.keys()].filter(k => k !== 'user_colour' && !schema.get(k)?.groupMember)
          : [];

        const rows = [];
        if (_loadedFilename)  rows.push(['File',            _loadedFilename]);
        rows.push(['Tips',             totalTips]);
        rows.push(['Internal nodes',   totalInner]);
        if (hiddenCount > 0) rows.push(['Hidden nodes', hiddenCount]);
        if (visibleTips !== totalTips) rows.push(['Visible tips', visibleTips]);
        rows.push(['Root-to-tip span', renderer.maxX.toFixed(6)]);
        rows.push(['Rooted',           isExplicitlyRooted ? 'Yes' : 'No']);

        // ── Timing information ────────────────────────────────────────────
        const _isCalibrated = calibration?.isActive;
        const _isTimeTree   = _axisIsTimedTree || _isCalibrated;
        rows.push(['Time-scaled', _isTimeTree ? 'Yes' : 'No']);

        if (_isTimeTree) {
          rows.push(['__divider__', 'Timing']);
          const calFmt = axisDateFmtEl?.value || 'yyyy-MM-dd';

          if (_axisIsTimedTree && !_isCalibrated) {
            // BEAST tree with height annotations — report span in height units
            const heightFmt = schema?.get('height')?.fmt;
            const spanStr = heightFmt ? heightFmt(renderer.maxX) : renderer.maxX.toFixed(6) + ' y';
            rows.push(['Tree span', spanStr]);
          }

          if (_isCalibrated) {
            // Root date (oldest) — root height = maxX
            const rootDate = calibration.heightToDateString(renderer.maxX, 'full', calFmt);
            rows.push(['Root date', rootDate]);

            // Tip date range — find min/max heights across all tips
            const allNodes = renderer.nodes || [];
            const tips = allNodes.filter(n => n.isTip);
            if (tips.length > 0) {
              const tipHeights = tips.map(n =>
                renderer._globalHeightMap?.get(n.id) ?? (renderer.maxX - n.x)
              );
              const minTipH = Math.min(...tipHeights); // most recent tip
              const maxTipH = Math.max(...tipHeights); // oldest tip
              const newestDate = calibration.heightToDateString(minTipH, 'full', calFmt);
              const oldestDate = calibration.heightToDateString(maxTipH, 'full', calFmt);
              if (Math.abs(maxTipH - minTipH) < 1e-9) {
                rows.push(['Tip date',  newestDate]);
              } else {
                rows.push(['Oldest tip',  oldestDate]);
                rows.push(['Newest tip',  newestDate]);
                // Tip sampling span in days (approx)
                const spreadDays = Math.round((maxTipH - minTipH) * 365.25);
                rows.push(['Tip spread', spreadDays >= 365
                  ? (maxTipH - minTipH).toFixed(2) + ' y'
                  : spreadDays + ' days']);
              }
              // HPD range at root if available
              const hpdKey = schema?.get('height')?.group?.hpd;
              const rootNode = allNodes.find(n => !n.parentId);
              const rootHpd = hpdKey && rootNode ? rootNode.annotations?.[hpdKey] : null;
              if (Array.isArray(rootHpd) && rootHpd.length >= 2) {
                const dOlder = calibration.heightToDateString(rootHpd[1], 'full', calFmt);
                const dNewer = calibration.heightToDateString(rootHpd[0], 'full', calFmt);
                rows.push(['Root 95% HPD', `[${dOlder} – ${dNewer}]`]);
              }
            }
          }
        }

        // ── Annotations ───────────────────────────────────────────────────
        if (annotKeys.length > 0) {
          rows.push(['__divider__', 'Annotations']);
          const annotLabels = annotKeys.map(k => schema.get(k)?.label ?? k);
          rows.push(['', annotLabels.join(', ')]);
        }

        const titleEl = $('node-info-title');
        titleEl.textContent = 'Tree';

        const body = $('node-info-body');
        const tbl  = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;';
        for (const [label, value] of rows) {
          const tr = tbl.insertRow();
          if (label === '__divider__') {
            const td = tr.insertCell();
            td.colSpan = 2;
            td.style.cssText = 'padding:6px 0 2px;';
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:6px;color:var(--pt-info-divider);font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;';
            div.innerHTML = `<span style="flex:0 0 auto">${value}</span><span style="flex:1;border-top:1px solid var(--pt-info-divider-line);display:inline-block"></span>`;
            td.appendChild(div);
          } else {
            const td1 = tr.insertCell();
            const td2 = tr.insertCell();
            td1.style.cssText = 'color:var(--pt-info-label);padding:2px 14px 2px 0;white-space:nowrap;vertical-align:top;';
            td2.style.cssText = 'color:var(--pt-info-value);padding:2px 0;word-break:break-all;';
            td1.textContent = label;
            td2.textContent = value;
          }
        }
        body.innerHTML = '';
        body.appendChild(tbl);

        const overlay = $('node-info-overlay');
        overlay.classList.add('open');
        return;
      }

      // ── Node selected → show per-node info ──────────────────────────────
      const node = renderer.nodeMap.get(nodeId);
      if (!node) return;

      const parent    = node.parentId ? renderer.nodeMap.get(node.parentId) : null;
      const branchLen = parent != null ? node.x - parent.x : node.x;
      const height    = renderer._globalHeightMap
        ? (renderer._globalHeightMap.get(node.id) ?? (renderer.maxX - node.x))
        : (renderer.maxX - node.x);

      const rows = [];
      if (!node.isTip || node.isCollapsed) {
        rows.push(['__name_edit__', node.annotations?.['Name'] ?? '']);
      }
      if (node.isTip && !node.isCollapsed && node.name)  rows.push(['Name',         node.name]);
      if (node.label)               rows.push(['Label',        String(node.label)]);
      rows.push(['Divergence',   node.x.toFixed(6)]);
      rows.push(['Age',          height.toFixed(6)]);
      rows.push(['Branch length', branchLen.toFixed(6)]);
      // ── Calendar date (computed from calibration) ──────────────────────
      if (calibration?.isActive) {
        const calFmt = axisDateFmtEl.value || 'yyyy-MM-dd';
        rows.push(['Calendar date', calibration.heightToDateString(height, 'full', calFmt)]);
        // HPD interval, if present
        const schema = graph ? graph.annotationSchema : null;
        const hpdKey = schema?.get('height')?.group?.hpd;
        const hpd    = hpdKey ? node.annotations?.[hpdKey] : null;
        if (Array.isArray(hpd) && hpd.length >= 2) {
          // hpd[0] = lower height (newer date), hpd[1] = upper height (older date)
          const dOlder = calibration.heightToDateString(hpd[1], 'full', calFmt);
          const dNewer = calibration.heightToDateString(hpd[0], 'full', calFmt);
          rows.push(['Date 95% HPD', `[${dOlder} – ${dNewer}]`]);
        }
      }
      if (!node.isTip || node.isCollapsed) {
        const tipCount = node.isCollapsed
          ? (node.collapsedRealTips ?? node.collapsedTipCount ?? '—')
          : renderer._getDescendantTipIds
            ? renderer._getDescendantTipIds(node.id).length
            : '—';
        rows.push(['Tips below', tipCount]);
      }
      const annots = node.annotations || {};
      const schema = graph ? graph.annotationSchema : null;
      const annotEntries = Object.entries(annots);
      if (annotEntries.length > 0) {
        rows.push([null, null]); // divider
        // Helper: format a single annotation value for display.
        function summarizeCurve(v) {
          if (!Array.isArray(v) || v.length === 0 || !Array.isArray(v[0])) return null;
          let xMin = Infinity;
          let xMax = -Infinity;
          let n = 0;
          for (const pt of v) {
            if (!Array.isArray(pt) || pt.length < 2) continue;
            const x = +pt[0];
            const y = +pt[1];
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            n += 1;
            if (x < xMin) xMin = x;
            if (x > xMax) xMax = x;
          }
          if (n === 0) return null;
          return `${xMin.toFixed(4)} ... ${xMax.toFixed(4)} (${n} values)`;
        }

        function fmtAnnot(v, def) {
          if (v === null || v === undefined) return '—';
          if (Array.isArray(v)) {
            // KDE curve points: show compact x-range + number of values.
            const curveSummary = summarizeCurve(v);
            if (curveSummary) return curveSummary;
            // Interval: [lower, upper] pair — show as bracket notation.
            if ((def?.dataType === 'interval') && v.length === 2 &&
                typeof v[0] === 'number' && typeof v[1] === 'number') {
              return `[${v[0].toFixed(4)}, ${v[1].toFixed(4)}]`;
            }
            return '{' + v.map(x => (typeof x === 'number' ? x.toFixed(6) : String(x))).join(', ') + '}';
          } else if (typeof v === 'number') {
            return v.toFixed(6);
          }
          return String(v);
        }
        // Helper: emit sub-rows for a BEAST annotation group.
        function emitGroupRows(def, annots, emitted) {
          const SUB_LABELS = { median: 'median', range: 'range', mean: 'mean', lower: 'lower', upper: 'upper' };
          for (const [groupKey, subAnnotName] of Object.entries(def.group)) {
            // 'hpds' is a metadata array and 'hpd' is the preferred-key shortcut — skip both.
            if (groupKey === 'hpds' || groupKey === 'hpd') continue;
            if (typeof subAnnotName !== 'string') continue;
            if (Object.prototype.hasOwnProperty.call(annots, subAnnotName)) {
              const subDef = schema?.get(subAnnotName);
              const label = SUB_LABELS[groupKey] || subDef?.label || groupKey;
              rows.push(['__sub__', [label, fmtAnnot(annots[subAnnotName], subDef)]]);
              emitted.add(subAnnotName);
            }
          }
          // Show each HPD interval as its own sub-row using the percentage label.
          if (Array.isArray(def.group.hpds)) {
            for (const { key } of def.group.hpds) {
              if (Object.prototype.hasOwnProperty.call(annots, key)) {
                const subDef = schema?.get(key);
                rows.push(['__sub__', [subDef?.label ?? key, fmtAnnot(annots[key], subDef)]]);
                emitted.add(key);
              }
            }
          }
        }
        // Track emitted keys so group members aren't repeated after their base.
        const emitted = new Set();
        for (const [k, v] of annotEntries) {
          if (emitted.has(k)) continue;
          const def = schema ? schema.get(k) : null;
          // Skip group members here — they are shown indented under their base.
          if (def && def.groupMember) continue;
          // 'Name' annotation for internal nodes is shown at the top as an editable field.
          if (k === 'Name' && (!node.isTip || node.isCollapsed)) continue;
          rows.push([def?.label ?? k, fmtAnnot(v, def)]);
          emitted.add(k);
          // If this is a BEAST base annotation, show grouped sub-metrics indented.
          if (def && def.group) {
            emitGroupRows(def, annots, emitted);
          }
        }
        // Second pass: handle synthetic base keys (e.g. 'height' promoted from
        // 'height_mean') that are in the schema but not directly in node.annotations.
        if (schema) {
          for (const [k, def] of schema) {
            if (emitted.has(k)) continue;
            if (def.groupMember) continue;   // only base entries
            if (!def.group) continue;         // only grouped entries
            if (Object.prototype.hasOwnProperty.call(annots, k)) continue; // handled by first pass
            // Use the _mean member's value as the primary displayed value.
            const meanKey = def.group.mean;
            if (!meanKey || !Object.prototype.hasOwnProperty.call(annots, meanKey)) continue;
            const meanDef = schema.get(meanKey);
            rows.push([def?.label ?? k, fmtAnnot(annots[meanKey], meanDef)]);
            emitted.add(k);
            emitGroupRows(def, annots, emitted);
          }
        }
      }

      // Title
      const tipCount2 = ((!node.isTip || node.isCollapsed) && renderer._getDescendantTipIds)
        ? renderer._getDescendantTipIds(node.id).length
        : node.isCollapsed ? (node.collapsedRealTips ?? null) : null;
      const titleEl = $('node-info-title');
      titleEl.textContent = (!node.isTip || node.isCollapsed)
        ? `Internal node (${tipCount2 != null ? tipCount2 + ' tips' : 'internal'})`
        : (node.name || 'Tip node');

      // Build table
      const body = $('node-info-body');
      const tbl  = document.createElement('table');
      tbl.style.cssText = 'width:100%;border-collapse:collapse;';
      for (const [label, value] of rows) {
        const tr = tbl.insertRow();
        if (label === null) {
          // Annotations divider
          const td = tr.insertCell();
          td.colSpan = 2;
          td.style.cssText = 'padding:6px 0 2px;';
          const div = document.createElement('div');
          div.style.cssText = 'display:flex;align-items:center;gap:6px;color:var(--pt-info-divider);font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;';
          div.innerHTML = '<span style="flex:0 0 auto">Annotations</span><span style="flex:1;border-top:1px solid var(--pt-info-divider-line);display:inline-block"></span>';
          td.appendChild(div);
        } else if (label === '__sub__') {
          // Indented sub-row for grouped BEAST annotations (median / HPD / range)
          const [subLabel, subValue] = value;
          const td1 = tr.insertCell();
          const td2 = tr.insertCell();
          td1.style.cssText = 'color:var(--pt-info-sublabel);padding:1px 14px 1px 18px;white-space:nowrap;vertical-align:top;font-size:0.85em;';
          td2.style.cssText = 'color:var(--pt-info-subvalue);padding:1px 0;word-break:break-all;font-size:0.85em;';
          td1.textContent = subLabel;
          td2.textContent = subValue;
        } else if (label === '__name_edit__') {
          // Editable Name annotation field — shown at the top for internal nodes.
          const td1 = tr.insertCell();
          const td2 = tr.insertCell();
          td1.style.cssText = 'color:var(--pt-info-label);padding:2px 14px 2px 0;white-space:nowrap;vertical-align:middle;';
          td2.style.cssText = 'padding:2px 0;';
          td1.textContent = 'Name';
          const input = document.createElement('input');
          input.type = 'text';
          input.value = value;
          input.placeholder = '(unnamed)';
          input.style.cssText = 'background:var(--pt-info-input-bg);border:1px solid var(--pt-info-input-border);border-radius:3px;color:var(--pt-info-input-text);padding:1px 5px;width:100%;font-size:inherit;font-family:inherit;box-sizing:border-box;';
          input.addEventListener('change', () => {
            const newName = input.value.trim();
            if (!node.annotations) node.annotations = {};
            if (newName) {
              node.annotations['Name'] = newName;
            } else {
              delete node.annotations['Name'];
            }
            if (graph) {
              graph.annotationSchema = buildAnnotationSchema(graph.nodes);
              _refreshAnnotationUIs(graph.annotationSchema);
              renderer.setAnnotationSchema(graph.annotationSchema);
            }
            renderer._dirty = true;
          });
          td2.appendChild(input);
        } else {
          const td1 = tr.insertCell();
          const td2 = tr.insertCell();
          td1.style.cssText = 'color:var(--pt-info-label);padding:2px 14px 2px 0;white-space:nowrap;vertical-align:top;';
          td2.style.cssText = 'color:var(--pt-info-value);padding:2px 0;word-break:break-all;';
          td1.textContent = label;
          td2.textContent = value;
        }
      }
      body.innerHTML = '';
      body.appendChild(tbl);

      const overlay = $('node-info-overlay');
      overlay.classList.add('open');
    }

    btnNodeInfo?.addEventListener('click', () => showNodeInfo());

    // ── User colour ───────────────────────────────────────────────────────────
    function _applyUserColour(colour) {
      if (!graph || renderer._selectedTipIds.size === 0) return;
      for (const id of renderer._selectedTipIds) {
        const idx = graph.origIdToIdx.get(id);
        if (idx !== undefined) graph.nodes[idx].annotations['user_colour'] = colour;
        // If this node is a collapsed clade root, update its stored colour too.
        if (graph.collapsedCladeIds?.has(id)) {
          const info = graph.collapsedCladeIds.get(id);
          graph.collapsedCladeIds.set(id, { ...info, colour });
          // Refresh the collapsed clade's colour in the layout so it redraws immediately.
          const layoutNode = renderer.nodeMap?.get(id);
          if (layoutNode) layoutNode.collapsedColour = colour;
        }
      }
      graph.annotationSchema = buildAnnotationSchema(graph.nodes);
      _refreshAnnotationUIs(graph.annotationSchema);
      renderer.setAnnotationSchema(graph.annotationSchema);
      // Auto-switch tip shape colour-by to user_colour.
      tipColourBy.value = 'user_colour';
      renderer.setTipColourBy('user_colour');
      renderer._dirty = true;
      saveSettings();
      rttChart?.notifyStyleChange?.();
    }

    btnApplyUserColour?.addEventListener('click', () => {
      const hex = toolbarColourPicker?.getValue() ?? '#ff8800';
      _addRecentColour(hex);
      _applyUserColour(hex);
    });

    btnClearUserColour?.addEventListener('click', async () => {
      if (!graph) return;
      const hasSelection  = renderer._selectedTipIds.size > 0;
      const subtreeRootId = renderer._viewSubtreeRootId ?? null;

      // Nothing selected: confirm then clear the visible tree (subtree or whole tree).
      if (!hasSelection && !await showConfirmDialog('Clear colours', 'Clear all colours from the visible tree?', { okLabel: 'Clear', cancelLabel: 'Cancel' })) return;

      const clearNodeId = id => {
        const idx = graph.origIdToIdx.get(id);
        if (idx !== undefined) delete graph.nodes[idx].annotations['user_colour'];
        if (graph.collapsedCladeIds?.has(id)) {
          const info = graph.collapsedCladeIds.get(id);
          graph.collapsedCladeIds.set(id, { ...info, colour: null });
          const layoutNode = renderer.nodeMap?.get(id);
          if (layoutNode) layoutNode.collapsedColour = null;
        }
      };

      if (hasSelection) {
        // Clear only selected tips.
        for (const id of renderer._selectedTipIds) clearNodeId(id);
      } else if (subtreeRootId) {
        // Subtree view — walk layout tree from the subtree root.
        const stack = [subtreeRootId];
        while (stack.length) {
          const id = stack.pop();
          clearNodeId(id);
          const layoutNode = renderer.nodeMap?.get(id);
          if (layoutNode?.children) layoutNode.children.forEach(c => stack.push(c));
        }
      } else {
        // Whole tree — clear every graph node and all collapsed clade colours.
        for (const node of graph.nodes) delete node.annotations['user_colour'];
        if (graph.collapsedCladeIds) {
          for (const [id, info] of graph.collapsedCladeIds) {
            graph.collapsedCladeIds.set(id, { ...info, colour: null });
            const layoutNode = renderer.nodeMap?.get(id);
            if (layoutNode) layoutNode.collapsedColour = null;
          }
        }
      }
      graph.annotationSchema = buildAnnotationSchema(graph.nodes);
      _refreshAnnotationUIs(graph.annotationSchema);
      renderer.setAnnotationSchema(graph.annotationSchema);
      renderer._dirty = true;
      saveSettings();
      rttChart?.notifyStyleChange?.();
    });

    $('node-info-close').addEventListener('click', () => {
      $('node-info-overlay').classList.remove('open');
    });

    $('node-info-copy')?.addEventListener('click', () => {
      const body = $('node-info-body');
      if (!body) return;
      const lines = [];
      const title = $('node-info-title')?.textContent;
      if (title) lines.push(title);
      for (const tr of body.querySelectorAll('tr')) {
        const cells = tr.querySelectorAll('td');
        if (cells.length === 1 && cells[0].colSpan > 1) {
          // Divider row — use its text as a section header
          const label = cells[0].textContent.trim();
          if (label) lines.push('', `[${label}]`);
        } else if (cells.length >= 2) {
          const key = cells[0].textContent.trim();
          const input = cells[1].querySelector('input');
          const val = input ? input.value : cells[1].textContent.trim();
          if (key || val) lines.push(`${key}\t${val}`);
        }
      }
      const tsv = lines.join('\n');
      navigator.clipboard?.writeText(tsv).catch(() => {});
      // Brief icon feedback
      const btn = $('node-info-copy');
      if (btn) {
        btn.innerHTML = '<i class="bi bi-clipboard-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1200);
      }
    });

    $('node-info-overlay').addEventListener('click', e => {
      if (e.target === $('node-info-overlay')) {
        $('node-info-overlay').classList.remove('open');
      }
    });

    if (_cfg.enableKeyboard) window.addEventListener('keydown', e => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); applyOrder(false); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); applyOrder(true);  }
      if (e.key === '[') { e.preventDefault(); renderer.navigateBack(); }
      if (e.key === ']') { e.preventDefault(); renderer.navigateForward(); }
      if (e.key === '\\')  { e.preventDefault(); renderer.navigateHome(); }
      if (e.shiftKey && e.code === 'Comma')  { e.preventDefault(); renderer.navigateClimb(); }
      if (e.shiftKey && e.code === 'Period') { e.preventDefault(); $('btn-drill')?.click(); }
      if (e.key === 'a' || e.key === 'A') {
        const inField = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable);
        if (!inField) {
          e.preventDefault();
          if (renderer.nodes) {
            const allTipIds = new Set(renderer.nodes.filter(n => n.isTip).map(n => n.id));
            renderer._selectedTipIds = allTipIds;
            renderer._mrcaNodeId = null;
            if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(allTipIds.size > 0);
            renderer._dirty = true;
          }
        }
      }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyMode(renderer._mode === 'branches' ? 'nodes' : 'branches'); }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); applyMidpointRoot(); }
      if (!e.shiftKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); showNodeInfo(); }
    });
  }

  // ── Always-active bindings ────────────────────────────────────────────────

  optionsController.on('theme-select', () => {
    if (themeSelect.value !== 'custom') applyTheme(themeSelect.value);
    else _syncThemeButtons();
  });

  optionsController.on('canvas-bg-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setBgColor(canvasBgColorEl.value);
    _syncCanvasWrapperBg(canvasBgColorEl.value);
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });

  optionsController.on('branch-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setBranchColor(branchColorEl.value);
    saveSettings();
  });

  optionsController.on('branch-width-slider', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('branch-width-value').textContent = branchWidthSlider.value;
    renderer.setBranchWidth(parseFloat(branchWidthSlider.value));
    saveSettings();
  });

  optionsController.on('elbow-radius-slider', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('elbow-radius-value').textContent = elbowRadiusSlider.value;
    renderer.elbowRadius = parseFloat(elbowRadiusSlider.value);
    renderer._dirty = true;
    saveSettings();
  });

  optionsController.on('font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setFontSize(parseInt(fontSlider.value));
    saveSettings();
  });

  optionsController.on('font-family-select', () => {
    _markCustomTheme();
    _populateStyleSelect(fontFamilyEl.value, fontTypefaceStyleEl, '');
    // Repopulate all sub-element style selects whose typeface is currently 'Theme'
    _populateStyleSelect(tipLabelTypefaceEl?.value         || fontFamilyEl.value, typefaceStyleEl,              '', true);
    _populateStyleSelect(nodeLabelTypefaceEl?.value        || fontFamilyEl.value, nodeLabelTypefaceStyleEl,     '', true);
    _populateStyleSelect(collapsedCladeTypefaceEl?.value   || fontFamilyEl.value, collapsedCladeTypefaceStyleEl,'', true);
    _populateStyleSelect(legendTypefaceEl?.value         || fontFamilyEl.value, legendTypefaceStyleEl,        '', true);
    _populateStyleSelect(axisTypefaceEl?.value           || fontFamilyEl.value, axisTypefaceStyleEl,          '', true);
    _populateStyleSelect(rttAxisFontFamilyEl?.value        || fontFamilyEl.value, rttAxisTypefaceStyleEl,       '', true);
    renderer.setSettings(_buildRendererSettings());
    applyAxisStyle();
    _applyLegendTypeface();
    saveSettings();
  });

  optionsController.on('legend-font-family-select', () => {
    _markCustomTheme();
    _populateStyleSelect(legendTypefaceEl.value || fontFamilyEl.value, legendTypefaceStyleEl, '', true);
    _applyLegendTypeface();
    saveSettings();
  });

  optionsController.on('axis-font-family-select', () => {
    _markCustomTheme();
    _populateStyleSelect(axisTypefaceEl.value || fontFamilyEl.value, axisTypefaceStyleEl, '', true);
    applyAxisStyle();
    saveSettings();
  });

  // Typeface style change listeners
  optionsController.on('font-typeface-style-select', () => {
    _markCustomTheme();
    renderer.setSettings(_buildRendererSettings());
    _applyAxisTypeface();
    _applyLegendTypeface();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('typeface-select', () => {
    _markCustomTheme();
    const tKey = tipLabelTypefaceEl.value || fontFamilyEl.value;
    _populateStyleSelect(tKey, typefaceStyleEl, '', true);
    renderer.setSettings(_buildRendererSettings());
    saveSettings();
  });
  optionsController.on('typeface-style-select', () => {
    _markCustomTheme();
    renderer.setSettings(_buildRendererSettings());
    saveSettings();
  });
  optionsController.on('legend-typeface-style-select', () => {
    _markCustomTheme();
    _applyLegendTypeface();
    saveSettings();
  });
  optionsController.on('axis-typeface-style-select', () => {
    _markCustomTheme();
    applyAxisStyle();
    saveSettings();
  });
  optionsController.on('node-label-typeface-select', () => {
    _markCustomTheme();
    const nKey = nodeLabelTypefaceEl.value || fontFamilyEl.value;
    _populateStyleSelect(nKey, nodeLabelTypefaceStyleEl, '', true);
    renderer?.setNodeLabelTypeface(nodeLabelTypefaceEl.value || null, nodeLabelTypefaceStyleEl.value || null);
    saveSettings();
  });
  optionsController.on('node-label-typeface-style-select', () => {
    _markCustomTheme();
    renderer?.setNodeLabelTypeface(nodeLabelTypefaceEl.value || null, nodeLabelTypefaceStyleEl.value || null);
    saveSettings();
  });
  optionsController.on('collapsed-clade-typeface-select', () => {
    _markCustomTheme();
    const cKey = collapsedCladeTypefaceEl.value || fontFamilyEl.value;
    _populateStyleSelect(cKey, collapsedCladeTypefaceStyleEl, '', true);
    renderer.setSettings(_buildRendererSettings());
    saveSettings();
  });
  optionsController.on('collapsed-clade-typeface-style-select', () => {
    _markCustomTheme();
    renderer.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('label-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setLabelColor(labelColorEl.value);
    saveSettings();
  });

  optionsController.on('selected-label-style', () => {
    _markCustomTheme();
    renderer.setSelectedLabelStyle(selectedLabelStyleEl.value);
    saveSettings();
  });

  optionsController.on('selected-tip-stroke', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setSelectedTipStrokeColor(selectedTipStrokeEl.value);
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('selected-node-stroke', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setSelectedNodeStrokeColor(selectedNodeStrokeEl.value);
    saveSettings();
  });

  optionsController.on('tip-hover-fill', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setTipHoverFillColor(tipHoverFillEl.value);
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('node-hover-fill', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setNodeHoverFillColor(nodeHoverFillEl.value);
    saveSettings();
  });

  optionsController.on('selected-tip-fill', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setSelectedTipFillColor(selectedTipFillEl.value);
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('selected-tip-growth', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-tip-growth-value').textContent = selectedTipGrowthSlider.value;
    renderer.setSelectedTipGrowth(parseFloat(selectedTipGrowthSlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('selected-tip-min-size', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-tip-min-size-value').textContent = selectedTipMinSizeSlider.value;
    renderer.setSelectedTipMinSize(parseFloat(selectedTipMinSizeSlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('selected-tip-fill-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-tip-fill-opacity-value').textContent = selectedTipFillOpacitySlider.value;
    renderer.setSelectedTipFillOpacity(parseFloat(selectedTipFillOpacitySlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('selected-tip-stroke-width', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-tip-stroke-width-value').textContent = selectedTipStrokeWidthSlider.value;
    renderer.setSelectedTipStrokeWidth(parseFloat(selectedTipStrokeWidthSlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('selected-tip-stroke-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-tip-stroke-opacity-value').textContent = selectedTipStrokeOpacitySlider.value;
    renderer.setSelectedTipStrokeOpacity(parseFloat(selectedTipStrokeOpacitySlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('selected-node-fill', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setSelectedNodeFillColor(selectedNodeFillEl.value);
    saveSettings();
  });

  optionsController.on('selected-node-growth', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-node-growth-value').textContent = selectedNodeGrowthSlider.value;
    renderer.setSelectedNodeGrowth(parseFloat(selectedNodeGrowthSlider.value));
    saveSettings();
  });

  optionsController.on('selected-node-min-size', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-node-min-size-value').textContent = selectedNodeMinSizeSlider.value;
    renderer.setSelectedNodeMinSize(parseFloat(selectedNodeMinSizeSlider.value));
    saveSettings();
  });

  optionsController.on('selected-node-fill-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-node-fill-opacity-value').textContent = selectedNodeFillOpacitySlider.value;
    renderer.setSelectedNodeFillOpacity(parseFloat(selectedNodeFillOpacitySlider.value));
    saveSettings();
  });

  optionsController.on('selected-node-stroke-width', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-node-stroke-width-value').textContent = selectedNodeStrokeWidthSlider.value;
    renderer.setSelectedNodeStrokeWidth(parseFloat(selectedNodeStrokeWidthSlider.value));
    saveSettings();
  });

  optionsController.on('selected-node-stroke-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('selected-node-stroke-opacity-value').textContent = selectedNodeStrokeOpacitySlider.value;
    renderer.setSelectedNodeStrokeOpacity(parseFloat(selectedNodeStrokeOpacitySlider.value));
    saveSettings();
  });

  optionsController.on('tip-hover-stroke', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setTipHoverStrokeColor(tipHoverStrokeEl.value);
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-hover-growth', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('tip-hover-growth-value').textContent = tipHoverGrowthSlider.value;
    renderer.setTipHoverGrowth(parseFloat(tipHoverGrowthSlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-hover-min-size', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('tip-hover-min-size-value').textContent = tipHoverMinSizeSlider.value;
    renderer.setTipHoverMinSize(parseFloat(tipHoverMinSizeSlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-hover-fill-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('tip-hover-fill-opacity-value').textContent = tipHoverFillOpacitySlider.value;
    renderer.setTipHoverFillOpacity(parseFloat(tipHoverFillOpacitySlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-hover-stroke-width', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('tip-hover-stroke-width-value').textContent = tipHoverStrokeWidthSlider.value;
    renderer.setTipHoverStrokeWidth(parseFloat(tipHoverStrokeWidthSlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-hover-stroke-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('tip-hover-stroke-opacity-value').textContent = tipHoverStrokeOpacitySlider.value;
    renderer.setTipHoverStrokeOpacity(parseFloat(tipHoverStrokeOpacitySlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('node-hover-stroke', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setNodeHoverStrokeColor(nodeHoverStrokeEl.value);
    saveSettings();
  });

  optionsController.on('node-hover-growth', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('node-hover-growth-value').textContent = nodeHoverGrowthSlider.value;
    renderer.setNodeHoverGrowth(parseFloat(nodeHoverGrowthSlider.value));
    saveSettings();
  });

  optionsController.on('node-hover-min-size', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('node-hover-min-size-value').textContent = nodeHoverMinSizeSlider.value;
    renderer.setNodeHoverMinSize(parseFloat(nodeHoverMinSizeSlider.value));
    saveSettings();
  });

  optionsController.on('node-hover-fill-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('node-hover-fill-opacity-value').textContent = nodeHoverFillOpacitySlider.value;
    renderer.setNodeHoverFillOpacity(parseFloat(nodeHoverFillOpacitySlider.value));
    saveSettings();
  });

  optionsController.on('node-hover-stroke-width', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('node-hover-stroke-width-value').textContent = nodeHoverStrokeWidthSlider.value;
    renderer.setNodeHoverStrokeWidth(parseFloat(nodeHoverStrokeWidthSlider.value));
    saveSettings();
  });

  optionsController.on('node-hover-stroke-opacity', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('node-hover-stroke-opacity-value').textContent = nodeHoverStrokeOpacitySlider.value;
    renderer.setNodeHoverStrokeOpacity(parseFloat(nodeHoverStrokeOpacitySlider.value));
    saveSettings();
  });

  optionsController.on('tip-size-slider', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setTipRadius(parseInt(tipSlider.value));
    saveSettings();
    _syncControlVisibility();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-halo-slider', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('tip-halo-value').textContent = tipHaloSlider.value;
    renderer.setTipHaloSize(parseInt(tipHaloSlider.value));
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('node-size-slider', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setNodeRadius(parseInt(nodeSlider.value));
    saveSettings();
    _syncControlVisibility();
  });

  optionsController.on('node-halo-slider', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    $('node-halo-value').textContent = nodeHaloSlider.value;
    renderer.setNodeHaloSize(parseInt(nodeHaloSlider.value));
    saveSettings();
  });

  optionsController.on('tip-shape-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setTipShapeColor(tipShapeColorEl.value);
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-shape-bg-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setTipShapeBgColor(tipShapeBgEl.value);
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('node-shape-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setNodeShapeColor(nodeShapeColorEl.value);
    saveSettings();
  });

  optionsController.on('node-shape-bg-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    renderer.setNodeShapeBgColor(nodeShapeBgEl.value);
    saveSettings();
  });

  optionsController.on('node-colour-by', () => {
    renderer.setNodeColourBy(nodeColourBy.value || null);
    _updateConfigureBtn(nodeConfigureRow, nodeColourBy.value);
    saveSettings();
  });

  optionsController.on('node-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(nodeColourBy.value);
  });

  optionsController.on('branch-colour-by', () => {
    renderer.setBranchColourBy(branchColourBy.value || null);
    _updateConfigureBtn(branchConfigureRow, branchColourBy.value);
    saveSettings();
  });

  optionsController.on('branch-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(branchColourBy.value);
  });

  optionsController.on('tip-colour-by', () => {
    renderer.setTipColourBy(tipColourBy.value || null);
    _updateConfigureBtn(tipConfigureRow, tipColourBy.value);
    saveSettings();
    rttChart?.notifyStyleChange?.();
  });

  optionsController.on('tip-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(tipColourBy.value);
  });

  optionsController.on('label-colour-by', () => {
    renderer.setLabelColourBy(labelColourBy.value || null);
    _updateConfigureBtn(labelConfigureRow, labelColourBy.value);
    saveSettings();
  });

  optionsController.on('label-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(labelColourBy.value);
  });

  optionsController.on('tip-label-show', () => {
    const isOff = tipLabelShow.value === 'off';
    tipLabelControlsEl.style.display = isOff ? 'none' : '';
    const schema = renderer?._annotationSchema ?? new Map();
    _updateLabelDpRow(tipLabelDpRowEl, tipLabelShow.value, schema);
    renderer.setTipLabelsOff(isOff);
    if (!isOff) renderer.setTipLabelAnnotation(_isTipNameValue(tipLabelShow.value) ? null : tipLabelShow.value);
    saveSettings();
    _syncControlVisibility();
  });

  optionsController.on('tip-label-align', () => {
    renderer.setTipLabelAlign(tipLabelAlignEl.value);
    saveSettings();
  });

  optionsController.on('tip-label2-show', () => {
    _syncControlVisibility();
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('tip-label3-show', () => {
    _syncControlVisibility();
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('tip-label4-show', () => {
    _syncControlVisibility();
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('tip-label2-layout', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('tip-label3-layout', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('tip-label4-layout', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('tip-label-decimal-places', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  optionsController.on('node-label-decimal-places', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('branch-label-decimal-places', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('branch-label-show', () => {
    const schema = renderer?._annotationSchema ?? new Map();
    _updateLabelDpRow(branchLabelDpRowEl, branchLabelShowEl.value, schema);
    renderer?.setBranchLabelAnnotation(branchLabelShowEl.value || null);
    saveSettings(); _markCustomTheme();
    _syncControlVisibility();
  });

  optionsController.on('branch-label-position', () => {
    renderer?.setBranchLabelPosition(branchLabelPositionEl.value);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('branch-label-font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(branchLabelFontSizeSlider.value);
    $('branch-label-font-size-value').textContent = v;
    renderer?.setBranchLabelFontSize(v);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('branch-label-color', ({ type }) => {
    if (type !== 'input') return;
    renderer?.setBranchLabelColor(branchLabelColorEl.value);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('branch-label-spacing-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(branchLabelSpacingSlider.value);
    $('branch-label-spacing-value').textContent = v;
    renderer?.setBranchLabelSpacing(v);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('branch-label-typeface-select', () => {
    _populateStyleSelect(branchLabelTypefaceEl.value || fontFamilyEl.value, branchLabelTypefaceStyleEl, '', true);
    renderer?.setBranchLabelTypeface(branchLabelTypefaceEl.value || null, branchLabelTypefaceStyleEl.value || null);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('branch-label-typeface-style-select', () => {
    renderer?.setBranchLabelTypeface(branchLabelTypefaceEl.value || null, branchLabelTypefaceStyleEl.value || null);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('node-label-show', () => {
    const schema = renderer?._annotationSchema ?? new Map();
    _updateLabelDpRow(nodeLabelDpRowEl, nodeLabelShowEl.value, schema);
    renderer?.setNodeLabelAnnotation(nodeLabelShowEl.value || null);
    saveSettings(); _markCustomTheme();
    _syncControlVisibility();
  });

  optionsController.on('node-label-position', () => {
    renderer?.setNodeLabelPosition(nodeLabelPositionEl.value);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('node-label-font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(nodeLabelFontSizeSlider.value);
    $('node-label-font-size-value').textContent = v;
    renderer?.setNodeLabelFontSize(v);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('node-label-color', ({ type }) => {
    if (type !== 'input') return;
    renderer?.setNodeLabelColor(nodeLabelColorEl.value);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('node-label-spacing-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(nodeLabelSpacingSlider.value);
    $('node-label-spacing-value').textContent = v;
    renderer?.setNodeLabelSpacing(v);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('node-label-colour-by', () => {
    renderer?.setNodeLabelColourBy(nodeLabelColourBy.value || null);
    _updateConfigureBtn(nodeLabelConfigureRow, nodeLabelColourBy.value);
    saveSettings();
  });

  optionsController.on('node-label-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(nodeLabelColourBy?.value);
  });

  optionsController.on('branch-label-colour-by', () => {
    renderer?.setBranchLabelColourBy(branchLabelColourBy.value || null);
    _updateConfigureBtn(branchLabelConfigureRow, branchLabelColourBy.value);
    saveSettings();
  });

  optionsController.on('branch-label-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(branchLabelColourBy?.value);
  });

  optionsController.on('tip-label-spacing-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(tipLabelSpacingSlider.value);
    $('tip-label-spacing-value').textContent = v;
    renderer?.setTipLabelSpacing(v);
    saveSettings(); _markCustomTheme();
  });

  // ── Scale mode change helpers ──────────────────────────────────────────────

  function _handleScaleModeChange(key, mode) {
    if (!key || key === 'user_colour') return;
    if (mode) annotationScaleModes.set(key, mode);
    else annotationScaleModes.delete(key);
    _syncScaleModeSelects(key, mode);
    renderer.setAnnotationScaleMode(key, mode);
    legendRenderer.draw();
    saveSettings();
  }

  // ── Annotation colour-config modal listeners ──────────────────────────────

  annotConfigPaletteSelect?.addEventListener('change', () => {
    if (!_annotConfigKey || _annotConfigKey === 'user_colour') return;
    annotationPalettes.set(_annotConfigKey, annotConfigPaletteSelect.value);
    renderer?.setAnnotationPalette(_annotConfigKey, annotConfigPaletteSelect.value, !!annotationPaletteReverses.get(_annotConfigKey));
    legendRenderer?.draw();
    saveSettings();
    rttChart?.notifyStyleChange?.();
    // Update palette preview
    const schema = renderer?._annotationSchema;
    const def    = schema?.get(_annotConfigKey);
    const isCat  = def?.dataType === 'categorical' || def?.dataType === 'ordinal';
    _renderAnnotConfigPreview(annotConfigPaletteSelect.value, isCat, !!annotationPaletteReverses.get(_annotConfigKey));
  });

  annotConfigPaletteReverse?.addEventListener('change', () => {
    if (!_annotConfigKey || _annotConfigKey === 'user_colour') return;
    annotationPaletteReverses.set(_annotConfigKey, !!annotConfigPaletteReverse.checked);
    renderer?.setAnnotationPalette(_annotConfigKey, annotConfigPaletteSelect?.value || null, !!annotConfigPaletteReverse.checked);
    legendRenderer?.draw();
    saveSettings();
    rttChart?.notifyStyleChange?.();
    const schema = renderer?._annotationSchema;
    const def    = schema?.get(_annotConfigKey);
    const isCat  = def?.dataType === 'categorical' || def?.dataType === 'ordinal';
    _renderAnnotConfigPreview(annotConfigPaletteSelect?.value ?? '', isCat, !!annotConfigPaletteReverse.checked);
  });

  annotConfigScaleSelect?.addEventListener('change', () => {
    if (!_annotConfigKey || _annotConfigKey === 'user_colour') return;
    _handleScaleModeChange(_annotConfigKey, annotConfigScaleSelect.value);
  });

  $('annot-config-close')?.addEventListener('click', () => annotConfigOverlay?.classList.remove('open'));
  $('annot-config-done')?.addEventListener('click',  () => annotConfigOverlay?.classList.remove('open'));
  $('annot-config-manage-palettes')?.addEventListener('click', () => commands.execute('manage-palettes'));

  // ── Tip-label shape controls ───────────────────────────────────────────────

  function _syncTipLabelShapeCascadeToRenderer() {
    renderer.setTipLabelShape(tipLabelShapeEl.value);
    for (let i = 0; i < EXTRA_SHAPE_COUNT; i++) {
      renderer.setTipLabelShapeExtra(i, tipLabelShapeExtraEls[i].value);
    }
  }

  optionsController.on('tip-label-shape', () => {
    optionsVisibility.evaluate();
    _syncTipLabelShapeCascadeToRenderer();
    _syncControlVisibility();
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('tip-label-shape-color', ({ type }) => {
    if (type !== 'input') return;
    renderer.setTipLabelShapeColor(tipLabelShapeColorEl.value);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('tip-label-shape-colour-by', () => {
    renderer.setTipLabelShapeColourBy(tipLabelShapeColourBy.value || null);
    _updateConfigureBtn(tipLabelShapeConfigureRow, tipLabelShapeColourBy.value);
    saveSettings();
  });

  optionsController.on('tip-label-shape-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(tipLabelShapeColourBy.value);
  });

  optionsController.on('tip-label-shape-margin-left-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(tipLabelShapeMarginLeftSlider.value);
    $('tip-label-shape-margin-left-value').textContent = v;
    renderer.setTipLabelShapeMarginLeft(v);
    saveSettings(); _markCustomTheme();
  });

  optionsController.on('tip-label-shape-spacing-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(tipLabelShapeSpacingSlider.value);
    $('tip-label-shape-spacing-value').textContent = v;
    renderer.setTipLabelShapeSpacing(v);
    saveSettings(); _markCustomTheme();
  });

  // ── Tip-label shape extra controls (shapes 2–10) ─────────────────────────

  for (let _i = 0; _i < EXTRA_SHAPE_COUNT; _i++) {
    const _idx = _i;
    const _shapeId = `tip-label-shape-${_idx + 2}`;
    const _colourById = `tip-label-shape-${_idx + 2}-colour-by`;
    const _configureId = `tip-label-shape-${_idx + 2}-configure-btn`;

    optionsController.on(_shapeId, () => {
      optionsVisibility.evaluate();
      _syncTipLabelShapeCascadeToRenderer();
      _syncControlVisibility();
      saveSettings(); _markCustomTheme();
    });

    optionsController.on(_colourById, () => {
      renderer.setTipLabelShapeExtraColourBy(_idx, tipLabelShapeExtraColourBys[_idx].value || null);
      _updateConfigureBtn(tipLabelShapeExtraConfigureRows[_idx], tipLabelShapeExtraColourBys[_idx].value);
      saveSettings();
    });

    optionsController.on(_configureId, ({ type }) => {
      if (type !== 'click') return;
      openAnnotConfig(tipLabelShapeExtraColourBys[_idx].value);
    });
  }

  optionsController.on('tip-label-shape-size-slider', ({ type }) => {
    if (type !== 'input') return;
    const v = parseInt(tipLabelShapeSizeSlider.value);
    $('tip-label-shape-size-value').textContent = v;
    renderer.setTipLabelShapeSize(v);
    saveSettings(); _markCustomTheme();
  });

  // ── Branch-shape controls ────────────────────────────────────────────────

  const _applyBranchShapeSettings = ({ markTheme = false } = {}) => {
    if (!renderer) return;
    renderer.setSettings(_buildRendererSettings());
    _syncControlVisibility();
    saveSettings();
    if (markTheme) _markCustomTheme();
  };

  optionsController.on('branch-shape', () => _applyBranchShapeSettings({ markTheme: true }));
  optionsController.on('branch-shape-height-slider', ({ type }) => {
    if (type !== 'input') return;
    $('branch-shape-height-value').textContent = branchShapeHeightSlider.value;
    _applyBranchShapeSettings({ markTheme: true });
  });
  optionsController.on('branch-shape-width-slider', ({ type }) => {
    if (type !== 'input') return;
    $('branch-shape-width-value').textContent = _formatBranchShapeWidth(_branchShapeWidthFromSlider(branchShapeWidthSlider.value));
    _applyBranchShapeSettings({ markTheme: true });
  });
  optionsController.on('branch-shape-align', () => _applyBranchShapeSettings({ markTheme: true }));
  optionsController.on('branch-shape-spacing-slider', ({ type }) => {
    if (type !== 'input') return;
    $('branch-shape-spacing-value').textContent = branchShapeSpacingSlider.value;
    _applyBranchShapeSettings({ markTheme: true });
  });
  optionsController.on('branch-shape-color', ({ type }) => {
    if (type !== 'input') return;
    _applyBranchShapeSettings({ markTheme: true });
  });
  optionsController.on('branch-shape-halo-slider', ({ type }) => {
    if (type !== 'input') return;
    $('branch-shape-halo-value').textContent = branchShapeHaloSlider.value;
    _applyBranchShapeSettings({ markTheme: true });
  });
  optionsController.on('branch-shape-halo-color', ({ type }) => {
    if (type !== 'input') return;
    _applyBranchShapeSettings({ markTheme: true });
  });
  optionsController.on('branch-shape-colour-by', () => {
    _updateConfigureBtn(branchShapeConfigureRow, branchShapeColourByEl.value);
    _applyBranchShapeSettings();
  });
  optionsController.on('branch-shape-count-by', () => _applyBranchShapeSettings());
  optionsController.on('branch-shape-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(branchShapeColourByEl?.value);
  });

  for (let i = 0; i < branchShapeExtraEls.length; i++) {
    const n = i + 2;
    const shapeId = `branch-shape-${n}`;
    const colorId = `branch-shape-${n}-color`;
    const colourById = `branch-shape-${n}-colour-by`;
    const countById = `branch-shape-${n}-count-by`;
    const configureId = `branch-shape-${n}-configure-btn`;

    optionsController.on(shapeId, () => _applyBranchShapeSettings({ markTheme: true }));
    optionsController.on(colorId, ({ type }) => {
      if (type !== 'input') return;
      _applyBranchShapeSettings({ markTheme: true });
    });
    optionsController.on(colourById, () => {
      _updateConfigureBtn(branchShapeExtraConfigureRows[i], branchShapeExtraColourBys[i].value);
      _applyBranchShapeSettings();
    });
    optionsController.on(countById, () => _applyBranchShapeSettings());
    optionsController.on(configureId, ({ type }) => {
      if (type !== 'click') return;
      openAnnotConfig(branchShapeExtraColourBys[i]?.value);
    });
  }

  // ── Legend controls ───────────────────────────────────────────────────────

  function applyLegend() {
    const key  = legendAnnotEl.value || null;
    const show = !!key;                        // visible only when an annotation is selected
    const pos  = 'right';                      // only right-side legends are supported
    const key2 = legend2AnnotEl.value || null;
    const key3 = legend3AnnotEl.value || null;
    const key4 = legend4AnnotEl.value || null;
    const pos2 = legend2ShowEl.value;           // 'right' | 'below'
    const pos3 = legend3ShowEl.value;           // 'right' | 'below'
    const pos4 = legend4ShowEl.value;           // 'right' | 'below'
    // Resolve columns: 'below' = same column as predecessor, 'right' = predecessor's column + 1.
    const col2 = pos2 === 'right' ? 1 : 0;
    const col3 = pos3 === 'right' ? Math.min(col2 + 1, 3) : col2;
    const col4 = pos4 === 'right' ? Math.min(col3 + 1, 3) : col3;

    // Set annotation + font first so measureWidth() has the right state.
    legendRenderer.setFontSize(parseInt(legendFontSizeSlider.value));
    legendRenderer.setTextColor(legendTextColorEl.value);
    legendRenderer.setSettings({
      layoutSpacing: parseInt(legendSpacingSlider.value),
      heightPct:  parseInt(legendHeightPctSlider.value),
      heightPct2: parseInt(legend2HeightPctSlider.value),
      heightPct3: parseInt(legend3HeightPctSlider.value),
      heightPct4: parseInt(legend4HeightPctSlider.value),
      decimalPlaces:  legendDpEl.value  !== '' ? parseInt(legendDpEl.value)  : null,
      decimalPlaces2: legend2DpEl.value !== '' ? parseInt(legend2DpEl.value) : null,
      decimalPlaces3: legend3DpEl.value !== '' ? parseInt(legend3DpEl.value) : null,
      decimalPlaces4: legend4DpEl.value !== '' ? parseInt(legend4DpEl.value) : null,
    }, /*redraw*/ false);
    legendRenderer.setAnnotation(show ? 'right' : null, key);
    legendRenderer.setAnnotation2(key2 ? pos2 : 'right', key2);
    legendRenderer.setAnnotation3(key3 ? pos3 : 'right', key3);
    legendRenderer.setAnnotation4(key4 ? pos4 : 'right', key4);

    // Canvas N is visible when at least one legend with an annotation is in column N.
    const hasCol1 = show && ((col2 === 1 && !!key2) || (col3 === 1 && !!key3) || (col4 === 1 && !!key4));
    const hasCol2 = show && ((col2 === 2 && !!key2) || (col3 === 2 && !!key3) || (col4 === 2 && !!key4));
    const hasCol3 = show && ((col2 === 3 && !!key2) || (col3 === 3 && !!key3) || (col4 === 3 && !!key4));

    const W  = show ? legendRenderer.measureWidth() : 0;
    // Width of each column canvas = widest legend assigned to it.
    const W2 = hasCol1 ? Math.max(
      col2 === 1 && key2 ? legendRenderer.measureWidth2() : 0,
      col3 === 1 && key3 ? legendRenderer.measureWidth3() : 0,
      col4 === 1 && key4 ? legendRenderer.measureWidth4() : 0,
    ) : 0;
    const W3 = hasCol2 ? Math.max(
      col2 === 2 && key2 ? legendRenderer.measureWidth2() : 0,
      col3 === 2 && key3 ? legendRenderer.measureWidth3() : 0,
      col4 === 2 && key4 ? legendRenderer.measureWidth4() : 0,
    ) : 0;
    const W4 = hasCol3 ? Math.max(
      col2 === 3 && key2 ? legendRenderer.measureWidth2() : 0,
      col3 === 3 && key3 ? legendRenderer.measureWidth3() : 0,
      col4 === 3 && key4 ? legendRenderer.measureWidth4() : 0,
    ) : 0;

    legendRightCanvas.style.display = show    ? 'block' : 'none';
    legendRightCanvas.style.width   = W + 'px';

    legend2RightCanvas.style.display = hasCol1 ? 'block' : 'none';
    legend2RightCanvas.style.width   = W2 + 'px';

    legend3RightCanvas.style.display = hasCol2 ? 'block' : 'none';
    legend3RightCanvas.style.width   = W3 + 'px';

    legend4RightCanvas.style.display = hasCol3 ? 'block' : 'none';
    legend4RightCanvas.style.width   = W4 + 'px';

    const lrw = $('legend-right-wrapper');
    if (lrw) {
      lrw.style.display = (show || hasCol1 || hasCol2 || hasCol3) ? 'flex' : 'none';
      lrw.style.gap = `${parseInt(legendSpacingSlider.value)}px`;
    }

    _updateConfigureBtn(legendConfigureRow, key);
    _updateConfigureBtn(legend2ConfigureRow, key2);
    _updateConfigureBtn(legend3ConfigureRow, key3);
    _updateConfigureBtn(legend4ConfigureRow, key4);

    renderer._resize();   // recalculates tree canvas width after legend canvases shown/hidden
    saveSettings();
    _syncControlVisibility();
  }

  optionsController.on('legend-annotation', () => {
    optionsVisibility.evaluate();
    applyLegend();
  });
  optionsController.on('legend-annotation-2', () => {
    optionsVisibility.evaluate();
    applyLegend();
  });
  optionsController.on('legend2-show', applyLegend);
  optionsController.on('legend2-height-pct-slider', ({ type }) => {
    if (type !== 'input') return;
    $('legend2-height-pct-value').textContent = legend2HeightPctSlider.value + '%';
    applyLegend();
  });
  optionsController.on('legend-annotation-3', () => {
    optionsVisibility.evaluate();
    applyLegend();
  });
  optionsController.on('legend3-show', applyLegend);
  optionsController.on('legend3-height-pct-slider', ({ type }) => {
    if (type !== 'input') return;
    $('legend3-height-pct-value').textContent = legend3HeightPctSlider.value + '%';
    applyLegend();
  });
  optionsController.on('legend-annotation-4', () => {
    optionsVisibility.evaluate();
    applyLegend();
  });
  optionsController.on('legend4-show', applyLegend);
  optionsController.on('legend4-height-pct-slider', ({ type }) => {
    if (type !== 'input') return;
    $('legend4-height-pct-value').textContent = legend4HeightPctSlider.value + '%';
    applyLegend();
  });
  optionsController.on('legend-decimal-places', applyLegend);
  optionsController.on('legend2-decimal-places', applyLegend);
  optionsController.on('legend3-decimal-places', applyLegend);
  optionsController.on('legend4-decimal-places', applyLegend);

  optionsController.on('legend-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(legendAnnotEl?.value);
  });
  optionsController.on('legend2-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(legend2AnnotEl?.value);
  });
  optionsController.on('legend3-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(legend3AnnotEl?.value);
  });
  optionsController.on('legend4-configure-btn', ({ type }) => {
    if (type !== 'click') return;
    openAnnotConfig(legend4AnnotEl?.value);
  });

  optionsController.on('legend-text-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    legendRenderer.setTextColor(legendTextColorEl.value);
    saveSettings();
  });
  optionsController.on('legend-font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    $('legend-font-size-value').textContent = legendFontSizeSlider.value;
    _markCustomTheme();
    applyLegend();
  });
  optionsController.on('legend-spacing-slider', ({ type }) => {
    if (type !== 'input') return;
    $('legend-spacing-value').textContent = legendSpacingSlider.value;
    applyLegend();
  });
  optionsController.on('legend-height-pct-slider', ({ type }) => {
    if (type !== 'input') return;
    $('legend-height-pct-value').textContent = legendHeightPctSlider.value + '%';
    applyLegend();
  });

  // ── Axis controls ─────────────────────────────────────────────────────────

  /**
   * Enable or disable the "Time" option in the axis-show dropdown.
   * Time mode requires either a timed tree (branch lengths in years) or an
   * active calibration (RTT regression / single-anchor from a date annotation).
   * If the user is already on "Time" and it becomes unavailable, switch to Forward.
   */
  function _updateTimeOption() {
    const canUseTime = calibration.isActive || _axisIsTimedTree;
    const timeOpt = [...axisShowEl.options].find(o => o.value === 'time');
    if (timeOpt) timeOpt.disabled = !canUseTime;
    if (!canUseTime && axisShowEl.value === 'time') {
      axisShowEl.value = 'forward';
      applyAxis();
    }
  }

  /** Parse a user-typed axis range value string. Returns null (auto), a number, or NaN (invalid). */
  function _parseAxisRangeValue(str, mode) {
    if (!str || str.trim() === '' || str.trim().toLowerCase() === 'auto') return null;
    if (mode === 'time') {
      const s = str.trim();
      // For range endpoints, interpret partial dates as period starts.
      // e.g. "2014" -> 2014-01-01, "2014-05" -> 2014-05-01.
      const yOnly = /^(-?\d{1,6})$/;
      const ymOnly = /^(-?\d{1,6})-(\d{1,2})$/;
      const ym = s.match(ymOnly);
      if (ym) {
        const year = +ym[1];
        const month = +ym[2];
        if (month >= 1 && month <= 12) return TreeCalibration.dateToDecYear(year, month, 1);
        return NaN;
      }
      const y = s.match(yOnly);
      if (y) {
        const year = +y[1];
        return TreeCalibration.dateToDecYear(year, 1, 1);
      }
      const v = TreeCalibration.parseDateToDecYear(s);
      return v != null ? v : NaN;
    }
    const v = parseFloat(str.trim());
    return isFinite(v) ? v : NaN;
  }

  /** Load the stored range for mode into the range input elements. */
  function _loadAxisRangeForMode(mode) {
    if (!mode || mode === 'off' || !axisRangeLeftEl) return;
    const r = _axisRangeByMode[mode] || { left: '', right: '' };
    axisRangeLeftEl.value  = r.left  ?? '';
    axisRangeRightEl.value = r.right ?? '';
    axisRangeLeftEl.classList.remove('is-invalid');
    axisRangeRightEl.classList.remove('is-invalid');
  }

  /** Save the current range input values into _axisRangeByMode for the given mode. */
  function _saveAxisRangeForMode(mode) {
    if (!mode || mode === 'off' || !axisRangeLeftEl) return;
    _axisRangeByMode[mode] = { left: axisRangeLeftEl.value, right: axisRangeRightEl.value };
  }

  /** Return an object with all six per-mode axis range settings (for tree file serialization). */
  function _getAxisRangeSettings() {
    // Capture current mode's inputs before snapshotting
    const mode = axisShowEl.value;
    if (mode !== 'off') _saveAxisRangeForMode(mode);
    return {
      axisRangeTimeLeft:     _axisRangeByMode.time.left,
      axisRangeTimeRight:    _axisRangeByMode.time.right,
      axisRangeForwardLeft:  _axisRangeByMode.forward.left,
      axisRangeForwardRight: _axisRangeByMode.forward.right,
      axisRangeReverseLeft:  _axisRangeByMode.reverse.left,
      axisRangeReverseRight: _axisRangeByMode.reverse.right,
    };
  }

  /**
   * Validate, apply, and render the current axis range inputs.
   * Marks inputs invalid (red border) if the values are bad but does not apply.
   */
  function _applyAxisRange() {
    if (!axisRenderer || !axisRangeLeftEl) return;
    const mode = axisShowEl.value;
    if (mode === 'off') {
      renderer?.setAxisRangeOverride(null, null, 1);
      return;
    }
    const leftStr  = axisRangeLeftEl.value.trim();
    const rightStr = axisRangeRightEl.value.trim();
    const leftVal  = _parseAxisRangeValue(leftStr,  mode);
    const rightVal = _parseAxisRangeValue(rightStr, mode);

    const leftBad  = leftVal  !== null && isNaN(leftVal);
    const rightBad = rightVal !== null && isNaN(rightVal);
    let orderBad = false;
    if (!leftBad && !rightBad && leftVal !== null && rightVal !== null) {
      if (mode === 'time' || mode === 'forward') orderBad = leftVal >= rightVal;
      else                                       orderBad = leftVal <= rightVal;
    }
    const fwdBoundBad = mode === 'forward' && leftVal  !== null && !leftBad  && leftVal  < 0;
    const revBoundBad = mode === 'reverse' && rightVal !== null && !rightBad && rightVal < 0;

    const invalid = leftBad || rightBad || orderBad || fwdBoundBad || revBoundBad;
    axisRangeLeftEl.classList.toggle('is-invalid',  leftBad  || orderBad || fwdBoundBad);
    axisRangeRightEl.classList.toggle('is-invalid', rightBad || orderBad || revBoundBad);
    if (invalid) return;

    axisRenderer.setRange(leftVal, rightVal);
    if (renderer) {
      // No explicit range override: keep tree scaling tree-driven (factor = 1).
      if (leftVal == null && rightVal == null) {
        renderer.setAxisRangeOverride(null, null, 1);
      } else {
        const ext = axisRenderer.getWorldExtent();
        if (ext) {
          const treeExt = renderer.getAxisTreeWorldExtent();
          const scaleFactor = axisRenderer.getScaleFactor(treeExt.worldLeft, treeExt.worldRight);
          renderer.setAxisRangeOverride(ext.worldLeft, ext.worldRight, scaleFactor);
        }
      }
      axisRenderer.update(
        renderer.scaleX, renderer.offsetX, renderer.treePaddingLeft,
        renderer.treePaddingRight,
        renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
        window.devicePixelRatio || 1,
      );
    }
  }

  function applyAxis() {
    const val = axisShowEl.value;
    const on  = val !== 'off';
    // Save range for the previous mode before switching
    if (_prevAxisMode && _prevAxisMode !== 'off' && _prevAxisMode !== val) {
      _saveAxisRangeForMode(_prevAxisMode);
    }
    axisCanvas.style.display = on ? 'block' : 'none';
    if (val === 'time') {
      axisRenderer.setCalibration(calibration.isActive ? calibration : null);
      axisRenderer.setDirection('forward');
    } else {
      axisRenderer.setCalibration(null);
      axisRenderer.setDirection(on ? val : 'forward');
    }
    axisRenderer.setVisible(on);
    axisDateFmtRow.style.display = (val === 'time' && calibration.isActive) ? '' : 'none';
    _showDateTickRows(calibration.isActive && !!axisDateAnnotEl.value);
    _showRttDateTickRows(calibration.isActive && !!axisDateAnnotEl.value);
    // Load the range for the new mode and apply it to the renderers
    if (on) {
      const viewNodes = renderer.nodes || [];
      _syncAxisSubtreeParams(renderer.maxX, renderer._viewSubtreeRootId, viewNodes);
      _loadAxisRangeForMode(val);
      _applyAxisRange();
    } else {
      axisRenderer.setRange(null, null);
      renderer?.setAxisRangeOverride(null, null, 1);
    }
    // Resize the tree canvas so it fills the remaining space above/below the axis.
    renderer._resize();
    if (on) {
      // Draw immediately with current view state.
      axisRenderer.update(
        renderer.scaleX, renderer.offsetX, renderer.treePaddingLeft,
        renderer.treePaddingRight,
        renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
        window.devicePixelRatio || 1,
      );
    }
    _prevAxisMode = val;
    saveSettings();
    _syncControlVisibility();
  }

  optionsController.on('axis-show', applyAxis);

  function _applyAxisRangeImmediate() {
    if (_axisRangeApplyTimer) {
      clearTimeout(_axisRangeApplyTimer);
      _axisRangeApplyTimer = null;
    }
    _saveAxisRangeForMode(axisShowEl.value);
    _applyAxisRange();
  }

  function _scheduleAxisRangeApply() {
    if (_axisRangeApplyTimer) clearTimeout(_axisRangeApplyTimer);
    _axisRangeApplyTimer = setTimeout(() => {
      _axisRangeApplyTimer = null;
      _saveAxisRangeForMode(axisShowEl.value);
      _applyAxisRange();
    }, _AXIS_RANGE_APPLY_DELAY_MS);
  }

  // Range inputs: save on change and reapply
  if (axisRangeLeftEl) {
    optionsController.on('axis-range-left', () => { _scheduleAxisRangeApply(); });
    axisRangeLeftEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _applyAxisRangeImmediate();
      }
    });
    axisRangeLeftEl.addEventListener('blur', () => _applyAxisRangeImmediate());
  }
  if (axisRangeRightEl) {
    optionsController.on('axis-range-right', () => { _scheduleAxisRangeApply(); });
    axisRangeRightEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _applyAxisRangeImmediate();
      }
    });
    axisRangeRightEl.addEventListener('blur', () => _applyAxisRangeImmediate());
  }

  // ── Minor-interval options (depend on major) ──────────────────────────────

  function _updateMinorOptions(majorVal, keepVal) {
    const opts = {
      auto:       [['auto','Auto'],['off','Off']],
      millennia:  [['auto','Auto'],['centuries','Centuries'],['decades','Decades'],['off','Off']],
      centuries:  [['auto','Auto'],['decades','Decades'],['years','Years'],['off','Off']],
      decades:    [['auto','Auto'],['years','Years'],['months','Months'],['off','Off']],
      years:      [['auto','Auto'],['quarters','Quarters'],['months','Months'],['weeks','Weeks'],['days','Days'],['off','Off']],
      quarters:   [['auto','Auto'],['months','Months'],['days','Days'],['off','Off']],
      months:     [['auto','Auto'],['weeks','Weeks'],['days','Days'],['off','Off']],
      weeks:      [['auto','Auto'],['days','Days'],['off','Off']],
      days:       [['off','Off']],
    };
    const list = opts[majorVal] || [['auto','Auto'],['off','Off']];
    axisMinorIntervalEl.innerHTML = '';
    for (const [val, label] of list) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      axisMinorIntervalEl.appendChild(opt);
    }
    axisMinorIntervalEl.value = list.some(o => o[0] === keepVal) ? keepVal : 'off';
  }

  function applyTickOptions() {
    axisRenderer.setDateFormat(axisDateFmtEl.value);
    // Keep calendar-date node/tip labels in sync when date format changes.
    renderer?.setCalDateFormat(axisDateFmtEl.value);
    rttChart?.notifyCalibrationChange?.();
    axisRenderer.setTickOptions({
      majorInterval:    axisMajorIntervalEl.value,
      minorInterval:    axisMinorIntervalEl.value,
      majorLabelFormat: axisMajorLabelEl.value,
      minorLabelFormat: axisMinorLabelEl.value,
    });
    axisRenderer.update(
      renderer.scaleX, renderer.offsetX, renderer.treePaddingLeft, renderer.treePaddingRight,
      renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
      window.devicePixelRatio || 1,
    );
    // Axis label content can change horizontal overflow; rerun decoration-fit solve.
    renderer?._applyOverheadChange?.();
    saveSettings();
  }

  function applyAxisStyle() {
    axisRenderer.setColor(axisColorEl.value);
    axisRenderer.setLineWidth(parseFloat(axisLineWidthSlider.value));
    axisRenderer.setFontSize(parseInt(axisFontSizeSlider.value));
    _applyAxisTypeface();
    // Axis font/style changes affect measured axis decoration overflow.
    const prevAxisCanvasHeight = axisCanvas.style.height || '';
    axisRenderer.update(
      renderer.scaleX, renderer.offsetX, renderer.treePaddingLeft, renderer.treePaddingRight,
      renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
      window.devicePixelRatio || 1,
    );
    const nextAxisCanvasHeight = axisCanvas.style.height || '';
    if (prevAxisCanvasHeight !== nextAxisCanvasHeight) {
      // Axis font-size/typeface can change axis canvas height; resize tree canvas to match.
      renderer?._resize?.();
      axisRenderer.update(
        renderer.scaleX, renderer.offsetX, renderer.treePaddingLeft, renderer.treePaddingRight,
        renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
        window.devicePixelRatio || 1,
      );
    }
    renderer?._applyOverheadChange?.();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  }

  optionsController.on('axis-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    applyAxisStyle();
  });
  optionsController.on('axis-font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    $('axis-font-size-value').textContent = axisFontSizeSlider.value;
    _markCustomTheme();
    applyAxisStyle();
  });
  optionsController.on('axis-line-width-slider', ({ type }) => {
    if (type !== 'input') return;
    $('axis-line-width-value').textContent = axisLineWidthSlider.value;
    _markCustomTheme();
    applyAxisStyle();
  });

  optionsController.on('rtt-x-origin', () => {
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });

  optionsController.on('rtt-grid-lines', () => {
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });

  optionsController.on('rtt-aspect-ratio', () => {
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });

  optionsController.on('rtt-axis-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-stats-bg-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-stats-text-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-regression-style', () => {
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-regression-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-regression-width-slider', ({ type }) => {
    if (type !== 'input') return;
    $('rtt-regression-width-value').textContent = rttRegressionWidthSlider.value;
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-resid-band-show', () => {
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-resid-band-style', () => {
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-resid-band-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-resid-band-width-slider', ({ type }) => {
    if (type !== 'input') return;
    $('rtt-resid-band-width-value').textContent = rttResidBandWidthSlider.value;
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-resid-band-fill-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-resid-band-fill-opacity-slider', ({ type }) => {
    if (type !== 'input') return;
    $('rtt-resid-band-fill-opacity-value').textContent = rttResidBandFillOpacitySlider.value;
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-axis-font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    $('rtt-axis-font-size-value').textContent = rttAxisFontSizeSlider.value;
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-stats-font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    $('rtt-stats-font-size-value').textContent = rttStatsFontSizeSlider.value;
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-axis-font-family-select', () => {
    _markCustomTheme();
    _populateStyleSelect(rttAxisFontFamilyEl.value || fontFamilyEl.value, rttAxisTypefaceStyleEl, '', true);
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-axis-typeface-style-select', () => {
    _markCustomTheme();
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });
  optionsController.on('rtt-axis-line-width-slider', ({ type }) => {
    if (type !== 'input') return;
    $('rtt-axis-line-width-value').textContent = rttAxisLineWidthSlider.value;
    rttChart?.notifyStyleChange?.();
    saveSettings();
  });

  // ── Node bars controls ────────────────────────────────────────────────────

  function applyNodeBars() {
    if (renderer) {
      renderer.setSettings(_buildRendererSettings());
      renderer._dirty = true;
    }
    saveSettings();
    _syncControlVisibility();
  }

  optionsController.on('node-bars-show', applyNodeBars);
  ['node-bars-show-2', 'node-bars-show-3', 'node-bars-show-4'].forEach(id => {
    optionsController.on(id, applyNodeBars);
  });
  optionsController.on('node-bars-clip-to', applyNodeBars);
  ['node-bars-2-clip-to', 'node-bars-3-clip-to', 'node-bars-4-clip-to'].forEach(id => {
    optionsController.on(id, applyNodeBars);
  });
  optionsController.on('node-bars-color', ({ type }) => {
    if (type !== 'input') return;
    _markCustomTheme();
    applyNodeBars();
  });
  ['node-bars-2-color', 'node-bars-3-color', 'node-bars-4-color'].forEach(id => {
    optionsController.on(id, ({ type }) => {
      if (type !== 'input') return;
      _markCustomTheme();
      applyNodeBars();
    });
  });
  optionsController.on('node-bars-width-slider', ({ type }) => {
    if (type !== 'input') return;
    $('node-bars-width-value').textContent = nodeBarsWidthSlider.value;
    applyNodeBars();
  });
  [2, 3, 4].forEach(n => {
    optionsController.on(`node-bars-${n}-width-slider`, ({ type }) => {
      if (type !== 'input') return;
      const out = $(`node-bars-${n}-width-value`);
      if (out) out.textContent = nodeBarsExtraWidthSliders[n - 2]?.value ?? '6';
      applyNodeBars();
    });
  });
  optionsController.on('node-bars-fill-opacity', ({ type }) => {
    if (type !== 'input') return;
    $('node-bars-fill-opacity-value').textContent = nodeBarsFillOpacitySlider.value;
    applyNodeBars();
  });
  [2, 3, 4].forEach(n => {
    optionsController.on(`node-bars-${n}-fill-opacity`, ({ type }) => {
      if (type !== 'input') return;
      const out = $(`node-bars-${n}-fill-opacity-value`);
      if (out) out.textContent = nodeBarsExtraFillOpacitySliders[n - 2]?.value ?? '0.22';
      applyNodeBars();
    });
  });
  optionsController.on('node-bars-stroke-opacity', ({ type }) => {
    if (type !== 'input') return;
    $('node-bars-stroke-opacity-value').textContent = nodeBarsStrokeOpacitySlider.value;
    applyNodeBars();
  });
  [2, 3, 4].forEach(n => {
    optionsController.on(`node-bars-${n}-stroke-opacity`, ({ type }) => {
      if (type !== 'input') return;
      const out = $(`node-bars-${n}-stroke-opacity-value`);
      if (out) out.textContent = nodeBarsExtraStrokeOpacitySliders[n - 2]?.value ?? '0.55';
      applyNodeBars();
    });
  });
  optionsController.on('node-bars-median', applyNodeBars);
  optionsController.on('node-bars-range', applyNodeBars);

  optionsController.on('collapsed-opacity-slider', ({ type }) => {
    if (type !== 'input') return;
    $('collapsed-opacity-value').textContent = collapsedOpacitySlider.value;
    if (renderer) { renderer.setSettings(_buildRendererSettings()); renderer._dirty = true; }
    saveSettings();
  });
  optionsController.on('collapsed-stroke-width-slider', ({ type }) => {
    if (type !== 'input') return;
    $('collapsed-stroke-width-value').textContent = collapsedStrokeWidthSlider.value;
    if (renderer) { renderer.setSettings(_buildRendererSettings()); renderer._dirty = true; }
    saveSettings();
  });
  optionsController.on('collapsed-stroke-opacity-slider', ({ type }) => {
    if (type !== 'input') return;
    $('collapsed-stroke-opacity-value').textContent = collapsedStrokeOpacitySlider.value;
    if (renderer) { renderer.setSettings(_buildRendererSettings()); renderer._dirty = true; }
    saveSettings();
  });
  optionsController.on('collapsed-height-n-slider', ({ type }) => {
    if (type !== 'input') return;
    $('collapsed-height-n-value').textContent = collapsedHeightNSlider.value;
    if (renderer && graph) {
      renderer.setSettings(_buildRendererSettings());
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, _layoutOptions());
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY, { fitViewport: true });
    }
    saveSettings();
  });
  optionsController.on('collapsed-clade-font-size-slider', ({ type }) => {
    if (type !== 'input') return;
    $('collapsed-clade-font-size-value').textContent = collapsedCladeFontSizeSlider.value;
    if (renderer) { renderer.setSettings(_buildRendererSettings()); renderer._dirty = true; }
    saveSettings();
  });

  optionsController.on('root-stem-pct-slider', ({ type }) => {
    if (type !== 'input') return;
    $('root-stem-pct-value').textContent = rootStemPctSlider.value + '%';
    if (!renderer) { saveSettings(); return; }
    renderer.rootStemPct = parseFloat(rootStemPctSlider.value);
    renderer._updateScaleX();
    renderer._dirty = true;
    saveSettings();
  });

  function _showDateTickRows(visible) {
    const d = (visible && axisShowEl.value === 'time') ? '' : 'none';
    axisMajorIntervalRow.style.display  = d;
    axisMinorIntervalRow.style.display  = d;
    axisMajorLabelRow.style.display     = d;
    axisMinorLabelRow.style.display     = d;
  }

  function _showRttDateTickRows(visible) {
    const d = visible ? '' : 'none';
    rttDateFmtRow.style.display       = d;
    rttMajorIntervalRow.style.display = d;
    rttMinorIntervalRow.style.display = d;
    rttMajorLabelRow.style.display    = d;
    rttMinorLabelRow.style.display    = d;
  }

  function _updateRttMinorOptions(majorVal, keepVal) {
    const opts = {
      millennia:  [['auto','Auto'],['centuries','Centuries'],['decades','Decades'],['off','Off']],
      centuries:  [['auto','Auto'],['decades','Decades'],['years','Years'],['off','Off']],
      decades:    [['auto','Auto'],['years','Years'],['months','Months'],['off','Off']],
      years:      [['auto','Auto'],['quarters','Quarters'],['months','Months'],['weeks','Weeks'],['days','Days'],['off','Off']],
      quarters:   [['auto','Auto'],['months','Months'],['days','Days'],['off','Off']],
      months:     [['auto','Auto'],['weeks','Weeks'],['days','Days'],['off','Off']],
      weeks:      [['auto','Auto'],['days','Days'],['off','Off']],
      days:       [['off','Off']],
    };
    const list = majorVal === 'auto'
      ? [['auto','Auto'],['off','Off']]
      : (opts[majorVal] || [['off','Off']]);
    rttMinorIntervalEl.innerHTML = '';
    for (const [val, label] of list) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      rttMinorIntervalEl.appendChild(opt);
    }
    rttMinorIntervalEl.value = list.some(o => o[0] === keepVal) ? keepVal : 'off';
  }

  optionsController.on('axis-major-interval', () => {
    _updateMinorOptions(axisMajorIntervalEl.value, axisMinorIntervalEl.value);
    applyTickOptions();
  });
  optionsController.on('axis-minor-interval', applyTickOptions);
  optionsController.on('axis-major-label', applyTickOptions);
  optionsController.on('axis-minor-label', applyTickOptions);
  optionsController.on('axis-date-format', applyTickOptions);

  optionsController.on('rtt-date-format', () => { rttChart?.notifyCalibrationChange?.(); saveSettings(); });
  optionsController.on('rtt-major-interval', () => {
    _updateRttMinorOptions(rttMajorIntervalEl.value, rttMinorIntervalEl.value);
    rttChart?.notifyCalibrationChange?.();
    saveSettings();
  });
  optionsController.on('rtt-minor-interval', () => { rttChart?.notifyCalibrationChange?.(); saveSettings(); });
  optionsController.on('rtt-major-label', () => { rttChart?.notifyCalibrationChange?.(); saveSettings(); });
  optionsController.on('rtt-minor-label', () => { rttChart?.notifyCalibrationChange?.(); saveSettings(); });

  optionsController.on('axis-date-annotation', () => {
    // Recompute OLS calibration; onCalibrationChange syncs axisDateFmtRow, _updateTimeOption,
    // clamp-row, _showDateTickRows, renderer.setCalibration, and the axis renderer.
    rttChart?.recomputeCalibration?.();
    // If a date annotation is now active, ensure it appears in the data table.
    if (axisDateAnnotEl.value) _ensureDateInTable(axisDateAnnotEl.value);
    // Repopulate label dropdowns to add/remove Calendar date options, then sync renderer.
    // Pass autoSelectDate:false so the user's explicit choice of "(none)" is not overridden.
    _refreshAnnotationUIs(renderer?._annotationSchema ?? new Map(), { autoSelectDate: false });
    if (renderer) renderer.setSettings(_buildRendererSettings());
    // If currently viewing a subtree, recompute its params using the new anchor.
    if (axisShowEl.value === 'time' && renderer._viewSubtreeRootId && renderer._onLayoutChange) {
      renderer._onLayoutChange(renderer.maxX, renderer._viewSubtreeRootId);
    }
    saveSettings();
  });

  /**
   * Ensure `key` appears as a column in the data table.
   * If the key is already present (or the data table isn't ready), this is a no-op.
   * Only adds — never removes — to avoid disrupting the user's column selection.
   * On the very first add (no columns configured yet), also includes '__names__' so
   * the table is never left showing only a date column with no tip names.
   */
  function _ensureDateInTable(key) {
    if (!dataTableRenderer || !key) return;
    const { columns, showNames } = dataTableRenderer.getState();
    if (!columns.includes(key)) {
      // On first-ever column add, prepend __names__ so names + date appear together.
      const base = (!showNames && columns.length === 0) ? ['__names__'] : [];
      dataTableRenderer.setColumns([...base, ...columns, key]);
    }
  }

  btnFit?.addEventListener('click', () => renderer.fitToWindow());
  $('btn-fit-labels')?.addEventListener('click', () => renderer.fitLabels());

  // Open button
  $('btn-open-tree')?.addEventListener('click', () => commands.execute('open-tree'));

  // ── Wire command exec functions ────────────────────────────────────────────
  // Explicitly-wired (no buttonId, or custom behaviour):
  commands.get('open-file').exec  = () => pickTreeFile();
  commands.get('open-tree').exec  = () => openModal();
  commands.get('import-annot').exec = () => annotImporter.open();
  commands.get('curate-annot').exec  = () => annotCurator.open();
  commands.get('manage-filters').exec = () => filterManager.open();
  commands.get('manage-palettes').exec = () => paletteManager.open();
  commands.get('select-all').exec = () => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
      document.execCommand('selectAll');
    } else if (renderer.nodes) {
      const allTipIds = new Set(renderer.nodes.filter(n => n.isTip).map(n => n.id));
      renderer._selectedTipIds = allTipIds;
      renderer._mrcaNodeId = null;
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(allTipIds.size > 0);
      renderer._dirty = true;
    }
  };
  commands.get('select-invert').exec = () => {
    if (!renderer.nodes) return;
    const allTipIds = renderer.nodes.filter(n => n.isTip).map(n => n.id);
    const inverted  = new Set(allTipIds.filter(id => !renderer._selectedTipIds.has(id)));
    renderer._selectedTipIds = inverted;
    renderer._mrcaNodeId = null;
    renderer._updateMRCA();
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(inverted.size > 0);
    renderer._notifyStats();
    renderer._dirty = true;
  };

  // paste-tree: when no tree is loaded, read clipboard text and attempt to load it as a tree.
  commands.get('paste-tree').exec = async () => {
    if (treeLoaded) return;  // only active before first load
    let text;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;  // clipboard access denied or empty
    }
    if (!text?.trim()) return;
    openModal();
    loadTree(text, 'clipboard');
  };

  // copy-tree: copies current view as NEXUS; if 2+ tips selected, copies subtending subtree;
  // if exactly 1 tip selected, copies the tip name only.
  commands.get('copy-tree').exec = async () => {
    if (!graph) return;
    const selSize = renderer._selectedTipIds?.size ?? 0;
    // Single tip selected → copy just the name
    if (selSize === 1) {
      const tipId = [...renderer._selectedTipIds][0];
      const node  = renderer.nodes?.find(n => n.id === tipId);
      const name  = node ? (renderer._tipLabelCopyName?.(node) ?? node.name ?? tipId) : tipId;
      await navigator.clipboard.writeText(name);
      return;
    }
    const schema    = renderer?._annotationSchema ?? new Map();
    const annotKeys = [...schema.keys()];
    // Determine root: MRCA of selection (2+ tips) > current view subtree > full tree
    let subtreeId = renderer._viewSubtreeRootId ?? null;
    if (selSize > 1) {
      subtreeId = renderer._mrcaNodeId ?? subtreeId;
    }
    const newick = graphToNewick(
      graph,
      subtreeId,
      annotKeys,
      null,
      (gNode) => {
        const origId = gNode?.origId ?? gNode?.id;
        const rNode = origId ? renderer?.nodeMap?.get(origId) : null;
        return rNode ? (renderer._tipLabelCopyName?.(rNode) ?? rNode.name ?? rNode.id) : (gNode?.name || gNode?.label || '');
      },
    );
    if (!newick) return;
    const rootedTag = annotKeys.length > 0 ? '[&R] ' : '';
    const nexus = `#NEXUS\nBEGIN TREES;\n\ttree TREE1 = ${rootedTag}${newick}\nEND;\n`;
    await navigator.clipboard.writeText(nexus);
  };

  // copy-tips: copies tip names one-per-line; if metadata table is open with columns,
  // copies tip labels + metadata values as tab-delimited text.
  commands.get('copy-tips').exec = async () => {
    if (!graph || !renderer?.nodes) return;
    const useSelection = (renderer._selectedTipIds?.size ?? 0) > 0;
    const visibleTips  = renderer.nodes.filter(n => n.isTip);
    const targetTips   = useSelection
      ? visibleTips.filter(n => renderer._selectedTipIds.has(n.id))
      : visibleTips;
    const tipParts = (node) => renderer._tipLabelCopyParts?.(node) ?? [renderer._tipLabelCopyName?.(node) ?? node.name ?? node.id];
    if (dataTableRenderer.isOpen()) {
      const { columns } = dataTableRenderer.getState();
      if (columns.length > 0) {
        const schema = renderer._annotationSchema;
        const colLabels = columns.map(k => schema?.get(k)?.label ?? k);
        const maxPartCount = targetTips.reduce((m, n) => Math.max(m, tipParts(n).length), 1);
        const labelHeaders = Array.from({ length: Math.max(0, maxPartCount - 1) }, (_, i) => `label${i + 2}`);
        const header = ['name', ...labelHeaders, ...colLabels].join('\t');
        const rows   = targetTips.map(n => {
          const labelVals = tipParts(n);
          const vals = columns.map(k => {
            const def = schema?.get(k);
            const actualKey = def?.dataKey ?? k;
            const raw = k.startsWith('__')
              ? (renderer._statValue ? renderer._statValue(n, k) : null)
              : (n.annotations?.[actualKey] ?? null);
            if (raw == null) return '';
            if (typeof raw === 'number' && def?.fmtValue) return def.fmtValue(raw);
            return String(raw);
          });
          while (labelVals.length < maxPartCount) labelVals.push('');
          return [...labelVals, ...vals].join('\t');
        });
        await navigator.clipboard.writeText([header, ...rows].join('\n'));
        return;
      }
    }
    await navigator.clipboard.writeText(targetTips.map(n => tipParts(n).join('\t')).join('\n'));
  };
  commands.get('view-scroll-top').exec    = () => renderer._setTarget(Infinity,  renderer._targetScaleY, false);
  commands.get('view-scroll-bottom').exec = () => renderer._setTarget(-Infinity, renderer._targetScaleY, false);
  commands.get('view-zoom-in').exec       = () => renderer.zoomIn();
  commands.get('view-zoom-out').exec      = () => renderer.zoomOut();
  commands.get('view-fit').exec           = () => renderer.fitToWindow();
  commands.get('view-fit-labels').exec    = () => renderer.fitLabels();
  commands.get('view-hyp-up').exec        = () => renderer.hypMagUp();
  commands.get('view-hyp-down').exec      = () => renderer.hypMagDown();

  // ── Keyboard vertical scroll — all three levels in one capture-phase handler ──
  //
  //   ↑ / ↓                  → line scroll  (one tip row)
  //   ⌘↑ / ⌘↓               → page scroll  (one canvas height minus one tip)
  //   ⌘⇧↑ / ⌘⇧↓             → top / bottom (jump to start or end of tree)
  //
  // Using capture phase so ⌘⇧↑/↓ are intercepted before macOS / WKWebView
  // consumes them as "select to top/bottom" text-selection shortcuts.
  if (_cfg.enableKeyboard) window.addEventListener('keydown', e => {
    if (e.altKey) return;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    // Don't steal arrows while the user is typing in a text field.
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (!renderer.nodes) return;

    e.preventDefault();
    const scrolledDown = e.key === 'ArrowDown';

    if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      // Level 3 — jump to top / bottom
      commands.execute(scrolledDown ? 'view-scroll-bottom' : 'view-scroll-top');
    } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      // Level 2 — page scroll
      const H      = renderer.canvas.clientHeight;
      const pagePx = H - renderer.scaleY;
      const sign   = scrolledDown ? -1 : 1;
      renderer._setTarget(renderer._targetOffsetY + sign * pagePx, renderer._targetScaleY, false);
      renderer._snapToTip(scrolledDown);
    } else if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      // Level 1 — line scroll (one tip row)
      const sign = scrolledDown ? -1 : 1;
      renderer._setTarget(renderer._targetOffsetY + sign * renderer.scaleY, renderer._targetScaleY, false);
      renderer._snapToTip(scrolledDown);
    }
  }, { capture: true });

  // Button-backed commands: exec clicks the toolbar button so all existing
  // click-handler logic runs without duplication.
  for (const cmd of commands.getAll().values()) {
    if (cmd.buttonId && !cmd.exec) {
      const btnId = cmd.buttonId;
      cmd.exec = () => $(btnId)?.click();
    }
  }
  commands.get('print-graphic').exec = () => exportCtrl.doPrint();

  // ── Global keyboard shortcut dispatch (registry-driven) ───────────────────
  if (_cfg.enableKeyboard) window.addEventListener('keydown', e => {
    if (!e.metaKey && !e.ctrlKey) return;
    if (e.altKey) return;
    // Cmd/Ctrl+X (cut): allow natively in text fields; block everywhere else.
    if (e.key === 'x' || e.key === 'X') {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !document.activeElement?.isContentEditable) {
        e.preventDefault();
      }
      return;
    }
    for (const cmd of commands.getAll().values()) {
      if (!commands.matchesShortcut(e, cmd.shortcut)) continue;
      // If no exec is registered (e.g. new-window, wired only by the Tauri adapter),
      // don't intercept — let the browser handle its own default for this shortcut.
      if (!cmd.exec) continue;
      // For copy/paste commands: let the browser handle natively when a text field is focused.
      if (cmd.id === 'paste-tree' || cmd.id === 'copy-tree' || cmd.id === 'copy-tips' || cmd.id === 'select-all') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      }
      // paste-tree: only intercept when no tree is loaded yet.
      if (cmd.id === 'paste-tree' && treeLoaded) return;
      e.preventDefault();
      commands.execute(cmd.id);
      return;
    }
  });

  // ── Public API for framework adapters ────────────────────────────────────
  // Exposed on window.peartree so that platform-specific glue scripts (e.g.
  // peartree-tauri.js) can hook in without modifying this file.

  /**
   * Apply a partial settings object at runtime.
   * Keys correspond to DEFAULT_SETTINGS / _buildSnapshot() keys.
   * Only keys present in `s` are applied — everything else is left unchanged.
   *
    * Supported keys (subset of full settings most useful programmatically):
    *   theme, canvasBgColor, branchColor, branchWidth, tipLabelFontSize, tipLabelColor,
    *   tipShapeSize, tipShapeHaloSize, nodeShapeSize, nodeShapeHaloSize,
   *   tipLabelShow, axisShow, axisDateFormat, axisMajorInterval, axisMinorInterval,
   *   axisMajorLabelFormat, axisMinorLabelFormat, clampNegBranches,
   *   nodeLabelAnnotation, legendShow, legendTextColor
   */
  function _applySettingsRuntime(s) {
    if (!s || typeof s !== 'object') return;

    // theme: delegate to the full applyTheme path (handles all colours at once).
    if (s.theme != null) applyTheme(s.theme);

    // Helper: set slider value + its visible label span.
    const _setSlider = (el, labelId, val) => {
      if (val == null || !el) return;
      el.value = val;
      const lbl = labelId ? $(labelId) : null;
      if (lbl) lbl.textContent = val;
    };

    // Visual settings backed by DOM input elements.
    if (s.canvasBgColor != null) {
      canvasBgColorEl.value = s.canvasBgColor;
      if (treeLoaded) _syncCanvasWrapperBg(s.canvasBgColor);
    }
    if (s.branchColor    != null) branchColorEl.value = s.branchColor;
    if (s.tipLabelColor  != null) labelColorEl.value  = s.tipLabelColor;
    _setSlider(branchWidthSlider, 'branch-width-value', s.branchWidth);
    _setSlider(elbowRadiusSlider,  'elbow-radius-value',  s.elbowRadius);
    _setSlider(fontSlider,        'font-size-value',    s.tipLabelFontSize);
    _setSlider(tipSlider,         'tip-size-value',     s.tipShapeSize);
    _setSlider(tipHaloSlider,     'tip-halo-value',     s.tipShapeHaloSize);
    _setSlider(nodeSlider,        'node-size-value',    s.nodeShapeSize);
    _setSlider(nodeHaloSlider,    'node-halo-value',    s.nodeShapeHaloSize);

    if (s.tipLabelShow != null && tipLabelShow) tipLabelShow.value = s.tipLabelShow;

    // Axis settings.
    if (s.axisShow != null) {
      const dir = s.axisShow === 'on' ? 'forward' : s.axisShow;
      axisShowEl.value = dir;
      axisRenderer.setDirection(dir);
      axisRenderer.setVisible(dir !== 'off');
      axisRenderer._lastHash = '';  // force redraw
    }
    if (s.axisDateFormat       != null) axisDateFmtEl.value       = s.axisDateFormat;
    if (s.axisMajorInterval    != null) axisMajorIntervalEl.value  = s.axisMajorInterval;
    if (s.axisMinorInterval    != null) axisMinorIntervalEl.value  = s.axisMinorInterval;
    if (s.axisMajorLabelFormat != null) axisMajorLabelEl.value     = s.axisMajorLabelFormat;
    if (s.axisMinorLabelFormat != null) axisMinorLabelEl.value     = s.axisMinorLabelFormat;

    if (s.nodeLabelAnnotation != null && nodeLabelShowEl)  nodeLabelShowEl.value   = s.nodeLabelAnnotation;
    if (s.branchLabelAnnotation != null && branchLabelShowEl) branchLabelShowEl.value = s.branchLabelAnnotation;
    if (s.branchColourBy != null && branchColourBy) { branchColourBy.value = s.branchColourBy; renderer?.setBranchColourBy(s.branchColourBy || null); }
    if (s.nodeLabelColourBy   != null && nodeLabelColourBy)   { nodeLabelColourBy.value   = s.nodeLabelColourBy;   renderer?.setNodeLabelColourBy(s.nodeLabelColourBy || null); }
    if (s.branchLabelColourBy != null && branchLabelColourBy) { branchLabelColourBy.value = s.branchLabelColourBy; renderer?.setBranchLabelColourBy(s.branchLabelColourBy || null); }
    if (s.legendTextColor != null && legendTextColorEl) {
      legendTextColorEl.value = s.legendTextColor;
      legendRenderer?.setTextColor?.(s.legendTextColor);
    }

    // Push updated DOM values to the renderer and persist.
    if (renderer) renderer.setSettings(_buildRendererSettings());
    _syncControlVisibility();
    saveSettings();
  }

  window.peartree = {
    /** Load a tree from a text string (async). */
    loadTree,
    openModal,
    closeModal,
    setModalError,
    /** Show a standalone error dialog with an OK button. */
    showErrorDialog,

    /** Show an alert dialog with only an OK button; returns a Promise<true>. */
    showAlertDialog,

    /** Show a confirm dialog; returns a Promise<boolean>. */
    showConfirmDialog,

    /** Show a prompt dialog for text input; returns a Promise<string|null>.
     *  Works in Tauri (window.prompt() is blocked in WKWebView). */
    showPromptDialog,

    /** True when a tree is currently loaded in this window. */
    get hasTree() { return treeLoaded; },

    /** Trigger a file open. Default: click the hidden <input type="file">.
     *  Override with a platform-specific implementation (e.g. Tauri native dialog). */
    pickFile: () => fileInput.click(),

    /** The central command registry. Platform adapters (e.g. peartree-tauri.js)
     *  subscribe to enabled-state changes and execute commands via this. */
    commands,

    /** Annotation importer — platform adapters can call loadFile(name, content)
     *  to bypass the picker phase and go straight to the config dialog. */
    annotImporter,

    /** Override the tree-export action for the current platform.
     *  fn({ content, filename, mimeType, filterName, extensions }) — called
     *  instead of a browser download when the user clicks Export/Download in
     *  the Export Tree dialog.  Set to null to restore browser behaviour. */
    setExportSaveHandler:    exportCtrl.setExportSaveHandler,

    /** Override the theme-export save action for the current platform.
     *  fn({ content, filename, filterName, extensions }) — called instead of
     *  a browser download when the user clicks Export in the Theme section.
     *  Set to null to restore browser behaviour. */
    setThemeSaveHandler: (fn) => { themeManager.setThemeSaveHandler(fn); },

    /** Override the graphic-export action for the current platform.
     *  fn({ content|contentBase64, base64, filename, mimeType, filterName, extensions })
     *  Set to null to restore browser behaviour. */
    setGraphicsSaveHandler:  exportCtrl.setGraphicsSaveHandler,

    /** Override the print trigger for the current platform.
     *  fn(layer: HTMLElement) — called after the SVG is injected; responsible for
     *  triggering the native print and clearing layer.innerHTML when done.
     *  Set to null to use window.print(). */
    setPrintTrigger:         exportCtrl.setPrintTrigger,

    /** Override the RTT plot image-export action for the current platform.
     *  Same signature as setGraphicsSaveHandler. */
    setRTTImageSaveHandler:  (fn) => { rttChart.setImageSaveHandler(fn); },

    /** Fetch a file by relative path, falling back to the absolute GitHub Pages
     *  URL if the relative fetch fails (e.g. file:// context). */
    fetchWithFallback,

    /** Register a callback invoked whenever the loaded filename changes.
     *  fn(filename: string|null) — used by platform adapters to update native window titles. */
    onTitleChange: (fn) => { _onTitleChange = fn; },

    // ── Embedding API ───────────────────────────────────────────────────────

    /**
     * Return the active embed configuration (resolved from window.peartreeConfig
     * and/or URL params at startup).  Read-only snapshot.
     */
    get embedConfig() { return { ..._cfg }; },

    /**
     * Return a snapshot of the current visual settings in the same format
     * accepted by window.peartreeConfig.settings.
     * Useful for capturing state from an embedding page or for debugging.
     * @returns {object}
     */
    getSettings: () => _buildSnapshot(),

    /** Enable/disable layout solver debug overlay and logs. */
    setLayoutDebug: (enabled = true) => {
      renderer?.setLayoutSolverDebug(!!enabled);
      axisRenderer?.setLayoutDebug(!!enabled);
      if (renderer) renderer._dirty = true;
    },

    /**
     * Apply a named built-in or user theme by name.
     * Same effect as the user selecting a theme from the theme drop-down.
     * @param {string} name  e.g. 'Artic', 'Dark', 'Custom'
     */
    applyTheme: (name) => _applyTheme(name),

    /**
     * Programmatically show or hide a panel and its associated toolbar button.
     * Takes effect immediately; if hiding an open panel it is also closed.
     * @param {'rtt'|'dataTable'|'palette'} panel
     * @param {boolean} visible
     */
    setPanelVisible(panel, visible) {
      if (panel === 'rtt') {
        $('btn-rtt')  ?.classList.toggle('d-none', !visible);
        $('rtt-panel')?.classList.toggle('d-none', !visible);
        if (!visible) rttChart?.close?.();
      } else if (panel === 'dataTable') {
        $('btn-data-table')  ?.classList.toggle('d-none', !visible);
        $('data-table-panel')?.classList.toggle('d-none', !visible);
        if (!visible) dataTableRenderer?.close?.();
      } else if (panel === 'palette') {
        $('btn-palette')?.classList.toggle('d-none', !visible);
      }
    },

    // ── Programmatic tree actions ─────────────────────────────────────────

    /**
     * Sort the tree nodes ascending or descending by clade size.
     * Equivalent to clicking the sort-asc / sort-desc toolbar buttons.
     * Safe to call before a tree is loaded (no-op).
     * @param {'asc'|'desc'} order
     */
    sort(order) {
      if (!treeLoaded) return;
      applyOrder(order === 'desc');
    },

    /**
     * Reroot the tree at its midpoint.
     * Equivalent to clicking the midpoint-root toolbar button.
     * Safe to call before a tree is loaded (no-op).
     */
    midpointRoot() {
      if (!treeLoaded) return;
      applyMidpointRoot();
    },

    /**
     * Find and apply the temporal root using a least-squares RTT regression.
     * 'local'  (default) — optimises only the position along the current root branch.
     * 'global'           — searches every branch in the tree for the best root position.
     * No-op when no tip dates are available or before a tree is loaded.
     * @param {'local'|'global'} [mode='local']
     */
    temporalRoot(mode = 'local') {
      if (!treeLoaded) return;
      if (mode === 'global') applyTemporalRootGlobal();
      else                   applyTemporalRoot();
    },

    /**
     * Zoom the viewport so the whole tree fits the canvas.
     * Equivalent to clicking the fit-to-window toolbar button.
     */
    fitToWindow() { renderer?.fitToWindow(); },

    /**
     * Zoom the viewport so all tip labels are visible without clipping.
     * Equivalent to clicking the fit-labels toolbar button.
     */
    fitLabels() { renderer?.fitLabels(); },

    /**
    * Apply a partial settings object at runtime.
    * Supported keys: theme, canvasBgColor, branchColor, branchWidth, tipLabelFontSize,
    * tipLabelColor, tipShapeSize, tipShapeHaloSize, nodeShapeSize, nodeShapeHaloSize, tipLabelShow,
     * axisShow, axisDateFormat, axisMajorInterval, axisMinorInterval,
     * axisMajorLabelFormat, axisMinorLabelFormat, clampNegBranches,
     * nodeLabelAnnotation, legendShow, legendTextColor.
     * @param {object} settings  Partial settings keyed by DEFAULT_SETTINGS key names.
     */
    applySettings(settings) { _applySettingsRuntime(settings); },

    /**
     * Register a callback invoked each time a tree finishes loading.
     * Scoped to this instance — fires only when THIS instance's tree loads.
     * Returns an unsubscribe function.
     * @param {() => void} fn
     */
    onTreeLoad(fn) {
      const handler = () => fn();
      root.addEventListener('peartree-tree-loaded', handler);
      return () => root.removeEventListener('peartree-tree-loaded', handler);
    },

    /**
     * Register a callback invoked when selected tips change.
     * fn(values[]) where values are tip names by default, or annotation values
     * when annotationKey is provided.
     * Returns an unsubscribe function.
     * @param {(values:any[]) => void} fn
     * @param {string|null} [annotationKey=null]
     */
    onSelectionChanged(fn, annotationKey = null) {
      if (typeof fn !== 'function') return () => {};
      const entry = { fn, annotationKey };
      _selectionChangedListeners.add(entry);
      return () => _selectionChangedListeners.delete(entry);
    },

    /**
     * Return a listener function that applies incoming selection values to this tree.
     * Pass `null` to clear selection.
     * Without annotationKey, values are treated as tip names.
     * With annotationKey, values are matched against tip annotations[annotationKey].
     * @param {string|null} [annotationKey=null]
     * @returns {(values:any[]|any|null)=>void}
     */
    getSelectionChangedListener(annotationKey = null) {
      return (values) => _applySelectionByValues(values, annotationKey);
    },

    /**
     * Register a callback invoked when visible tips in the current view change
     * (hide/show, subtree navigation, tree load/layout updates).
     * fn(values[]) where values are tip names by default, or annotation values
     * when annotationKey is provided.
     * Returns an unsubscribe function.
     * @param {(values:any[]) => void} fn
     * @param {string|null} [annotationKey=null]
     */
    onVisibleChanged(fn, annotationKey = null) {
      if (typeof fn !== 'function') return () => {};
      const entry = { fn, annotationKey };
      _visibleChangedListeners.add(entry);
      return () => _visibleChangedListeners.delete(entry);
    },

    /**
     * Register a callback invoked when internal-node hover changes.
     * fn(nodeInfo|null) by default, or fn(annotationValue|null) when
     * annotationKey is provided.
     * Returns an unsubscribe function.
     * @param {(nodeInfoOrValue:object|any|null) => void} fn
     * @param {string|null} [annotationKey=null]
     */
    onNodeHover(fn, annotationKey = null) {
      if (typeof fn !== 'function') return () => {};
      const entry = { fn, annotationKey };
      _nodeHoverListeners.add(entry);
      return () => _nodeHoverListeners.delete(entry);
    },

    /**
     * Register a callback invoked when tip hover changes.
     * fn(nodeInfo|null) by default, or fn(annotationValue|null) when
     * annotationKey is provided.
     * Returns an unsubscribe function.
     * @param {(nodeInfoOrValue:object|any|null) => void} fn
     * @param {string|null} [annotationKey=null]
     */
    onTipHover(fn, annotationKey = null) {
      if (typeof fn !== 'function') return () => {};
      const entry = { fn, annotationKey };
      _tipHoverListeners.add(entry);
      return () => _tipHoverListeners.delete(entry);
    },
  };

  // ── postMessage API (iframe embedding) ────────────────────────────────────
  // Accepts messages from the parent page to load trees or apply themes.
  // Validates that the message originates from the same origin or a trusted
  // same-site parent to mitigate cross-origin injection.
  window.addEventListener('message', (e) => {
    // Only accept structured objects; ignore string blobs.
    if (!e.data || typeof e.data !== 'object') return;
    // Reject messages from unknown cross-origin frames (allows same-origin and null for file://).
    if (e.origin !== window.location.origin && e.origin !== 'null' && e.origin !== '') return;
    try {
      const msg = e.data;
      if (msg.type === 'pt:loadTree') {
        if (typeof msg.text === 'string') {
          window.peartree.loadTree(msg.text, typeof msg.filename === 'string' ? msg.filename : 'tree');
        } else if (typeof msg.url === 'string') {
          (async () => {
            try {
              const resp = await fetch(msg.url);
              if (!resp.ok) throw new Error('HTTP ' + resp.status + '\u00a0\u2014 could not fetch tree');
              const text = await resp.text();
              const name = msg.filename || msg.url.split('/').pop() || 'tree';
              await window.peartree.loadTree(text, name);
            } catch (err) {
              showEmptyState();
              showEmptyStateError(err.message);
            }
          })();
        }
      } else if (msg.type === 'pt:applyTheme' && typeof msg.name === 'string') {
        _applyTheme(msg.name);
      } else if (msg.type === 'pt:command' && typeof msg.action === 'string') {
        // Programmatic tree actions — mirror the toolbar buttons.
        if (msg.action === 'sort'         && typeof msg.order === 'string') window.peartree.sort(msg.order);
        else if (msg.action === 'midpointRoot')  window.peartree.midpointRoot();
        else if (msg.action === 'temporalRoot')  window.peartree.temporalRoot(typeof msg.mode === 'string' ? msg.mode : 'local');
        else if (msg.action === 'fitToWindow') window.peartree.fitToWindow();
        else if (msg.action === 'fitLabels')   window.peartree.fitLabels();
      } else if (msg.type === 'pt:applySettings' && msg.settings && typeof msg.settings === 'object') {
        _applySettingsRuntime(msg.settings);
      } else if (msg.type === 'pt:setSelection') {
        const key = (typeof msg.annotationKey === 'string' && msg.annotationKey !== '')
          ? msg.annotationKey
          : null;
        _applySelectionByValues(msg.values ?? null, key);
      }
    } catch (_) { /* never propagate errors back to caller */ }
  });


  // ── URL parameter: auto-load treeUrl on startup ───────────────────────────
  // When the page URL contains a `treeUrl` query parameter, automatically
  // fetch that URL and load its content as a tree file on startup.
  {
    const _startParams = new URLSearchParams(window.location.search);
    const _treeUrl     = _startParams.get('treeUrl');
    if (_treeUrl) {
      let _validated = null;
      try {
        const _u = new URL(_treeUrl);
        if (_u.protocol === 'http:' || _u.protocol === 'https:') _validated = _u.href;
        else throw new Error('Only http/https URLs are supported.');
      } catch (_e) {
        console.warn('peartree: ignoring invalid treeUrl parameter –', _e.message);
      }
      if (_validated) {
        (async () => {
          try {
            const _resp = await fetch(_validated);
            if (!_resp.ok) throw new Error('HTTP ' + _resp.status + ' – ' + _validated);
            const _text = await _resp.text();
            const _name = new URL(_validated).pathname.split('/').pop() || 'tree';
            await loadTree(_text, _name);
            _treeSourceUrl = _validated;
            _updateShareUrlBtn();
          } catch (_err) {
            showEmptyState();
            showEmptyStateError(_err.message);
          }
        })();
      }
    }
  }

  // ── Section accordion ──────────────────────────────────────────────────────
  // Each .pt-palette-section h3 toggles its section open/closed.
  // A section can be "pinned" open — pinned sections are unaffected by the
  // Section accordion: one-open-at-a-time rule with pin support.
  // Sections are locked until the first tree is loaded, then unlock() restores
  // pinned/open state from localStorage.
  const _sectionAccordion = initSectionAccordion(root, {
    storageKey: 'peartree-section-state',
    defaultSectionId: 'tree',
  });

  window.dispatchEvent(new CustomEvent('peartree-ready'));
  // Wire up UI panel behaviours (palette, help, about, keyboard shortcuts,
  // toolbar height tracking) for this instance.  The function is exposed by
  // peartree-ui.js; it's a no-op when running without the UI script.
  const _uiBindings = window.initPearTreeUIBindings?.(root, {
    palettePinned:        _saved.palettePinned ?? DEFAULT_SETTINGS.palettePinned,
    paletteOpen:          _saved.paletteOpen   ?? DEFAULT_SETTINGS.paletteOpen,
    onPaletteStateChange: () => {
      _syncSidePanelStack();
      saveSettings();
    },
  });

  // ── Panel-toggle menu commands (Options Panel, RTT Plot, Data Table) ─────────────
  // Each command opens+pins the corresponding panel (or closes it when already
  // open).  The native menu label flips between “Show…” and “Hide…” via setLabel.

  function _syncOptPanelLabel() {
    const open = _uiBindings?.palette.isOpen() ?? false;
    commands.setLabel('view-options-panel', open ? 'Hide Options Panel' : 'Show Options Panel');
  }
  function _syncRttLabel() {
    commands.setLabel('view-rtt-plot', rttChart?.isOpen() ? 'Hide RTT Plot' : 'Show RTT Plot');
  }
  function _syncDtLabel() {
    commands.setLabel('view-data-table', dataTableRenderer?.isOpen() ? 'Hide Data Table' : 'Show Data Table');
  }

  if (_uiBindings?.palette) {
    commands.get('view-options-panel').exec = () => {
      if (_uiBindings.palette.isOpen()) {
        _uiBindings.palette.close();
      } else {
        _uiBindings.palette.pin();
      }
    };
    _uiBindings.palette.onChange(() => {
      _syncOptPanelLabel();
      _syncSidePanelStack();
    });
    // Sync label for the initial pinned-on-startup case.
    _syncOptPanelLabel();
  }

  _syncSidePanelStack();

  commands.get('view-rtt-plot').exec = () => {
    if (rttChart?.isOpen()) {
      rttChart.close();
      btnRtt?.classList.remove('active');
    } else if (rttChart) {
      rttChart.open();
      rttChart.setPin(true);
      btnRtt?.classList.add('active');
    }
    _syncSidePanelStack();
    _syncRttLabel();
  };

  commands.get('view-data-table').exec = () => {
    if (dataTableRenderer?.isOpen()) {
      dataTableRenderer.close();
    } else if (dataTableRenderer) {
      dataTableRenderer.open();
      dataTableRenderer.pin();
      btnDataTable?.classList.add('active');
    }
    _syncSidePanelStack();
    _syncDtLabel();
  };

  return window.peartree;

}

// ── Script / stylesheet loaders ───────────────────────────────────────────
// Used by embed() to dynamically inject assets into the host page.
// Delegated to pearcore-app.js; the local _ensureStylesheet adds the bundle guard.

function _ensureStylesheet(href) {
  if (window.__PEARTREE_CSS_BUNDLED__) return;
  ensureStylesheet(href);
}

// Auto-detect our own asset root from import.meta.url.
const { appBase: _selfBase, coreBase: _coreBase } = resolveAssetBases(import.meta.url);

// ── app(options) ──────────────────────────────────────────────────────────
//
// Entry point for the standalone webapp (peartree.html) and any page that
// has already loaded peartree-ui.js and has a fully-populated DOM.
//
// Options (all optional):
//   storageKey:      string | null  — localStorage key for settings persistence.
//                                     Defaults to SETTINGS_KEY from themes.js.
//                                     Pass null to disable persistence.
//   settings:        object          — Initial settings merged over stored/defaults.
//   ui:              object          — Feature flags (all default true in app mode).
//   paletteSections: string | []     — Palette sections to show ('all' or array).
//   appSections:     string | []     — App HTML sections to show.
//   toolbarSections: string | []     — Toolbar sub-sections to show.
//
export async function app(options = {}) {
  // Only forward flags that were explicitly provided in options.ui.
  // DO NOT merge defaults here — _initCore()'s _flag() falls back to URL params
  // when a flag is undefined, which is how ?statusbar=0 etc. work for embedFrame() iframes.
  const ui = options.ui || {};
  // Enforce the openTree ↔ import coupling for explicitly passed values only.
  if (ui.openTree === false) ui.import   = false;
  if (ui.import   === false) ui.openTree = false;

  window.peartreeConfig = Object.assign(
    // Pre-existing window.peartreeConfig (e.g. set by an inline <script> before
    // this module loads) is used as a base so callers can still use that pattern.
    window.peartreeConfig || {},
    {
      ui,
      storageKey:      options.storageKey !== undefined ? options.storageKey : (window.peartreeConfig?.storageKey ?? SETTINGS_KEY),
      settings:        options.settings  || window.peartreeConfig?.settings  || {},
      paletteSections: options.paletteSections  || window.peartreeConfig?.paletteSections  || 'all',
      appSections:     options.appSections      || window.peartreeConfig?.appSections      || 'all',
      toolbarSections: options.toolbarSections  || window.peartreeConfig?.toolbarSections  || 'all',
      manualUrl:       options.manualUrl        || window.peartreeConfig?.manualUrl        || HELP_MANUAL_URL,
      helpManualAnchors: options.helpManualAnchors || window.peartreeConfig?.helpManualAnchors || HELP_MANUAL_ANCHORS,
    }
  );

  await _initCore();
}

// ── embed(options) ────────────────────────────────────────────────────────
//
// Entry point for embedding PearTree into any container element on an
// existing page.  Dynamically injects all required JS and CSS.
//
// Options:
//   container:       string | HTMLElement  (required) — target element or ID
//   tree:            string                — inline Newick / NEXUS string
//   treeUrl:         string                — URL to fetch
//   filename:        string                — hint for format detection
//   height:          string                — CSS height of viewer (default '600px')
//   theme:           'dark' | 'light'      (default 'dark')
//   base:            string                — override asset root URL
//   storageKey:      string | null         — localStorage key for settings persistence.
//                                            null (default) = no persistence.
//                                            Pass a string to persist; multiple embeds
//                                            can share a key or use distinct keys.
//   settings:        object                — initial settings
//   ui:              object                — feature flags (most off by default)
//   paletteSections: string | []           — palette sections
//   appSections:     string | []           — app HTML sections
//   toolbarSections: string | []           — toolbar sub-sections
//
// Each embed() call creates a fully independent instance scoped to the given
// container.  Multiple embeds can coexist in the same page without collision.
// Use embedFrame() when full iframe isolation is explicitly required.

/**
 * Build a controller for a direct (same-page) embed.
 * Proxies all methods through the instance returned by _initCore(), ensuring
 * each embed's controller is bound to its own instance even when multiple
 * embeds exist in the same page.
 * @param {object} instance  The object returned by _initCore().
 */
function _buildDirectController(instance) {
  return {
    /** Sort nodes ascending ('asc') or descending ('desc') by clade size. */
    sort:          (order)    => instance.sort(order),
    /** Re-root the tree at its midpoint. */
    midpointRoot:  ()         => instance.midpointRoot(),
    /** Find and apply the temporal root. mode: 'local' (default) or 'global'. */
    temporalRoot:  (mode)     => instance.temporalRoot(mode),
    /** Zoom to fit the whole tree in the canvas. */
    fitToWindow:   ()         => instance.fitToWindow(),
    /** Zoom so all tip labels are visible without clipping. */
    fitLabels:     ()         => instance.fitLabels(),
    /** Apply a partial settings object (same keys as window.peartreeConfig.settings). */
    applySettings: (settings) => instance.applySettings(settings),
    /** Apply a named built-in or user theme. */
    applyTheme:    (name)     => instance.applyTheme(name),
    /** Return a snapshot of the current settings (same format as initSettings). */
    getSettings:   ()         => instance.getSettings(),
    /** Load a tree from an inline string. */
    loadTree:      (text, fn) => instance.loadTree(text, fn),
    /**
     * Register a callback invoked each time this instance's tree finishes loading.
     * Scoped to this embed — fires only when THIS instance loads a tree.
     * Returns an unsubscribe function.
     * @param {() => void} fn
     */
    onTreeLoad:    (fn)       => instance.onTreeLoad(fn),
    /** Register a callback for tip selection changes. */
    onSelectionChanged: (fn, annotationKey) => instance.onSelectionChanged(fn, annotationKey),
    /** Return a listener function that applies incoming selection values to this tree. */
    getSelectionChangedListener: (annotationKey) => instance.getSelectionChangedListener(annotationKey),
    /** Register a callback for visible-tip changes in the current view. */
    onVisibleChanged: (fn, annotationKey) => instance.onVisibleChanged(fn, annotationKey),
    /** Register a callback for internal-node hover changes. */
    onNodeHover: (fn, annotationKey) => instance.onNodeHover(fn, annotationKey),
    /** Register a callback for tip hover changes. */
    onTipHover: (fn, annotationKey) => instance.onTipHover(fn, annotationKey),
  };
}

/**
 * Build a postMessage controller for an embedFrame() iframe.
 * Each method posts a structured message to the iframe's content window.
 * The `iframe` property gives direct access to the element itself.
 */
function _buildFrameController(iframe) {
  const _send = (msg) => iframe.contentWindow?.postMessage(msg, '*');
  const _isTipNameValue = (value) => value === 'name' || value === 'names';
  const _tipValuesFromMsg = (msgData, annotationKey = null) => {
    const tips = Array.isArray(msgData?.tips) ? msgData.tips : [];
    if (!annotationKey || _isTipNameValue(annotationKey)) {
      return tips.map(t => t?.name ?? t?.id ?? null);
    }
    return tips.map(t => t?.annotations?.[annotationKey] ?? null);
  };
  const _hoverValueFromNodeInfo = (nodeInfo, annotationKey = null) => {
    if (!nodeInfo) return null;
    if (!annotationKey) return nodeInfo;
    if (_isTipNameValue(annotationKey)) return nodeInfo.name ?? nodeInfo.id ?? null;
    return nodeInfo.annotations?.[annotationKey] ?? null;
  };
  return {
    sort:          (order)    => _send({ type: 'pt:command',       action: 'sort', order }),
    midpointRoot:  ()         => _send({ type: 'pt:command',       action: 'midpointRoot' }),
    /** Find and apply the temporal root. mode: 'local' (default) or 'global'. */
    temporalRoot:  (mode)     => _send({ type: 'pt:command',       action: 'temporalRoot', mode: mode ?? 'local' }),
    fitToWindow:   ()         => _send({ type: 'pt:command',       action: 'fitToWindow' }),
    fitLabels:     ()         => _send({ type: 'pt:command',       action: 'fitLabels' }),
    applySettings: (settings) => _send({ type: 'pt:applySettings', settings }),
    applyTheme:    (name)     => _send({ type: 'pt:applyTheme',    name }),
    loadTree:      (text, fn) => _send({ type: 'pt:loadTree',      text, filename: fn }),
    /**
     * Register a callback invoked each time the iframe tree finishes loading.
     * Listens for the `pt:treeLoaded` message re-posted from the iframe.
     * Returns an unsubscribe function.
     * @param {() => void} fn
     */
    onTreeLoad(fn) {
      const handler = (e) => {
        if (e.source === iframe.contentWindow && e.data?.type === 'pt:treeLoaded') fn();
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
    /**
     * Register a callback invoked when selected tips change.
     * fn(values[]) where values are tip names by default, or annotation values
     * when annotationKey is provided.
     * Returns an unsubscribe function.
     */
    onSelectionChanged(fn, annotationKey = null) {
      const handler = (e) => {
        if (e.source !== iframe.contentWindow || e.data?.type !== 'pt:selectionChanged') return;
        try { fn(_tipValuesFromMsg(e.data, annotationKey)); } catch (_) {}
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
    /**
     * Return a listener function that applies incoming selection values to the iframe tree.
     * Pass `null` to clear selection.
     * Without annotationKey, values are treated as tip names.
     * With annotationKey, values are matched against tip annotations[annotationKey].
     */
    getSelectionChangedListener(annotationKey = null) {
      return (values) => _send({
        type: 'pt:setSelection',
        values: values ?? null,
        annotationKey,
      });
    },
    /**
     * Register a callback invoked when visible tips in the current view change.
     * fn(values[]) where values are tip names by default, or annotation values
     * when annotationKey is provided.
     * Returns an unsubscribe function.
     */
    onVisibleChanged(fn, annotationKey = null) {
      const handler = (e) => {
        if (e.source !== iframe.contentWindow || e.data?.type !== 'pt:visibleChanged') return;
        try { fn(_tipValuesFromMsg(e.data, annotationKey)); } catch (_) {}
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
    /**
     * Register a callback invoked when internal-node hover changes.
     * fn(nodeInfo|null) by default, or fn(annotationValue|null) when
     * annotationKey is provided.
     * Returns an unsubscribe function.
     */
    onNodeHover(fn, annotationKey = null) {
      const handler = (e) => {
        if (e.source !== iframe.contentWindow || e.data?.type !== 'pt:hoverChanged') return;
        const node = e.data?.node ?? null;
        const payload = (node && !node.isTip)
          ? _hoverValueFromNodeInfo(node, annotationKey)
          : null;
        try { fn(payload); } catch (_) {}
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
    /**
     * Register a callback invoked when tip hover changes.
     * fn(nodeInfo|null) by default, or fn(annotationValue|null) when
     * annotationKey is provided.
     * Returns an unsubscribe function.
     */
    onTipHover(fn, annotationKey = null) {
      const handler = (e) => {
        if (e.source !== iframe.contentWindow || e.data?.type !== 'pt:hoverChanged') return;
        const node = e.data?.node ?? null;
        const payload = (node && node.isTip)
          ? _hoverValueFromNodeInfo(node, annotationKey)
          : null;
        try { fn(payload); } catch (_) {}
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
    /** The underlying <iframe> element — use for layout, resize observation, etc. */
    get iframe() { return iframe; },
  };
}

export async function embed(options = {}) {
  if (!options.container) throw new Error('PearTree.embed: container is required');

  const container = typeof options.container === 'string'
    ? document.getElementById(options.container)
    : options.container;
  if (!container) throw new Error('PearTree.embed: container element not found: ' + options.container);

  const base = typeof options.base === 'string' ? options.base : _selfBase;

  const ui = Object.assign({}, DEFAULT_UI_EMBED, options.ui || {});
  if (ui.openTree === false) ui.import   = false;
  if (ui.import   === false) ui.openTree = false;

  // Layout/config options can be placed inside ui{} or at the top level.
  // ui.* takes precedence; options.* is the fallback for backward compatibility.
  const _theme           = ui.theme           || options.theme           || 'dark';
  const _toolbarSections = ui.toolbarSections || options.toolbarSections || 'all';
  const _rttWidth        = ui.rttWidth        ?? options.rttWidth        ?? 35;
  const _dataTableWidth  = ui.dataTableWidth  ?? options.dataTableWidth  ?? null;
  const _dataTableCols   = ui.dataTableColumns ?? options.dataTableColumns ?? null;

  // Set window.peartreeConfig BEFORE loading or re-using peartree-ui.js.
  // On the first embed the IIFEs in peartree-ui.js read it to inject HTML.
  // On subsequent embeds we call window.buildAppHTML() / window.buildPalettePanel()
  // directly (since the IIFEs won't re-fire for an already-loaded script).
  window.peartreeConfig = {
    ui: {
      palette:     ui.palette,
      toolbar:     ui.toolbar,
      openTree:    ui.openTree,
      import:      ui.import,
      export:      ui.export,
      rtt:              ui.rtt,
      rttHeader:        ui.rttHeader,
      dataTable:        ui.dataTable,
      dataTableHeader:  ui.dataTableHeader,
      statusBar:        ui.statusBar,
      statusStats:      ui.statusStats,
      statusSelect:     ui.statusSelect,
      statusMessage:    ui.statusMessage,
      statusShare:      ui.statusShare,
      keyboard:    ui.keyboard,
      help:        ui.help,
      about:       ui.about,
      themeToggle: ui.themeToggle,
      brand:       ui.brand,
      tbFileOps:   ui.tbFileOps,
      tbAnnotations: ui.tbAnnotations,
      tbNodeInfo:  ui.tbNodeInfo,
      tbNavigation: ui.tbNavigation,
      tbZoom:      ui.tbZoom,
      tbOrder:     ui.tbOrder,
      tbRotate:    ui.tbRotate,
      tbReroot:    ui.tbReroot,
      tbHideShow:  ui.tbHideShow,
      tbColour:    ui.tbColour,
      tbFilter:    ui.tbFilter,
      tbPanels:    ui.tbPanels,
      borderWidth:     ui.borderWidth,
      borderColor:     ui.borderColor,
      borderRadius:    ui.borderRadius,
      backgroundColor: ui.backgroundColor,
      paddingTop:     ui.paddingTop,
      paddingRight:   ui.paddingRight,
      paddingBottom:  ui.paddingBottom,
      paddingLeft:    ui.paddingLeft,
      theme:       _theme,
    },
    storageKey:       options.storageKey ?? null,  // null by default — embeds don't persist settings
    settings:         options.settings        || {},
    paletteSections:  options.paletteSections || 'all',
    appSections:      options.appSections     || 'all',
    toolbarSections:  _toolbarSections,
    nodeLabelName:    options.nodeLabelName   || null,
    rttWidth:         _rttWidth,
    dataTableWidth:   _dataTableWidth,
    dataTableColumns: _dataTableCols,
    manualUrl:       options.manualUrl ?? window.peartreeConfig?.manualUrl ?? HELP_MANUAL_URL,
    helpManualAnchors: options.helpManualAnchors ?? window.peartreeConfig?.helpManualAnchors ?? HELP_MANUAL_ANCHORS,
  };

  // Resolve core base path (may be overridden via options.coreBase).
  const coreBase = typeof options.coreBase === 'string' ? options.coreBase : _coreBase;

  // Inject styles immediately so the page doesn't flash unstyled.
  _ensureStylesheet(coreBase + 'css/pearcore.css');
  _ensureStylesheet(base + 'css/peartree.css');
  _ensureStylesheet(coreBase + 'css/pearcore-embed.css');

  // Create the wrapper with an app-host placeholder.  On first load,
  // peartree-ui.js's IIFE finds #app-html-host and replaces it with the full
  // app HTML.  On 2nd+ embeds the script is already loaded so we call the
  // exposed builder functions directly on the new wrap's placeholder.
  const height = options.height || '600px';
  const theme  = _theme;
  const wrap = document.createElement('div');
  wrap.className = 'pt-embed-wrap';
  wrap.setAttribute('data-bs-theme', theme);
  wrap.style.height = height;
  wrap.innerHTML = '<div id="app-html-host"></div>';
  container.appendChild(wrap);

  // Load dependencies in order, then initialise.
  // Both are skipped when already present (bundled or loaded externally).
  if (typeof window.marked === 'undefined') await loadScript(coreBase + 'vendor/marked.min.js', false);
  if (typeof window.buildStandardDialogsHTML !== 'function') await loadScript(coreBase + 'js/pearcore-ui.js', false);
  if (typeof window.buildAppHTML !== 'function') await loadScript(base + 'js/peartree-ui.js', false);

  // If peartree-ui.js was already loaded its IIFEs won't re-fire, so the
  // #app-html-host placeholder is still present.  Inject HTML directly.
  const _appHost = wrap.querySelector('#app-html-host');
  if (_appHost && typeof window.buildAppHTML === 'function') {
    const _appSec = window.peartreeConfig.appSections    || 'all';
    const _tbSec  = window.peartreeConfig.toolbarSections || 'all';
    _appHost.outerHTML = window.buildAppHTML(_appSec, _tbSec);
  }
  const _palHost = wrap.querySelector('#palette-panel-host');
  if (_palHost && typeof window.buildPalettePanel === 'function') {
    const _palSec = window.peartreeConfig.paletteSections || 'all';
    _palHost.outerHTML = window.buildPalettePanel(_palSec);
  }
  // When palette is disabled, hide the panel.
  if (ui.palette === false) {
    const _panel = wrap.querySelector('#palette-panel');
    if (_panel) { _panel.style.display = 'none'; _panel.inert = true; }
  }

  // Initialise this instance, scoped to the wrap element.
  const instance = await _initCore(wrap);

  // Load the initial tree directly on the instance (bypasses the postMessage
  // routing used by the old single-instance approach).
  if (typeof options.tree === 'string') {
    instance.loadTree(options.tree, options.filename || 'tree.nwk');
  } else if (typeof options.treeUrl === 'string') {
    (async () => {
      try {
        const _resp = await fetch(options.treeUrl);
        if (!_resp.ok) throw new Error('HTTP ' + _resp.status + ' — could not fetch tree');
        const _text = await _resp.text();
        const _name = options.filename || options.treeUrl.split('/').pop() || 'tree';
        await instance.loadTree(_text, _name);
      } catch (_err) {
        console.error('PearTree.embed: failed to fetch treeUrl –', _err.message);
      }
    })();
  }

  // Return a controller so the caller can drive the embed programmatically
  // without holding a reference to the window or internal functions.
  return _buildDirectController(instance);
}

// ── embedFrame(options) ───────────────────────────────────────────────────
//
// Multi-instance alternative to embed().  Mounts PearTree inside a same-page
// <iframe> rather than injecting HTML and JS directly into the host document.
// Each call is completely isolated — duplicate element IDs, global state, and
// localStorage keys never collide.
//
// The iframe loads peartree.html with configuration encoded as URL params.
// Communication after load uses the existing postMessage API.
//
// Options mirror embed() exactly.  Extra option:
//   title:  string  — iframe accessible title (default 'PearTree — Phylogenetic tree')
//
export function embedFrame(options = {}) {
  if (!options.container) throw new Error('PearTree.embedFrame: container is required');

  const container = typeof options.container === 'string'
    ? document.getElementById(options.container)
    : options.container;
  if (!container) throw new Error('PearTree.embedFrame: container element not found: ' + options.container);

  const base  = typeof options.base === 'string' ? options.base : _selfBase;
  const height = options.height || '600px';
  const theme  = (options.ui && (options.ui.theme === 'light' || options.ui.theme === 'dark'))
    ? options.ui.theme
    : (options.theme || 'dark');

  const ui = Object.assign({}, DEFAULT_UI_EMBEDFRAME, options.ui || {});
  if (ui.openTree === false) ui.import   = false;
  if (ui.import   === false) ui.openTree = false;

  // Build URL params from the same UI schema used by app/embed resolution.
  // Complex objects (settings, sections) are base64-encoded JSON.
  const params = new URLSearchParams({ nostore: '1' });
  _setUiFlagsAsUrlParams(params, ui);
  if (theme === 'dark' || theme === 'light') params.set('theme', theme);

  _encodeSettingsParam(params, options.settings);
  if (options.toolbarSections && options.toolbarSections !== 'all')
    params.set('toolbarSections', btoa(JSON.stringify(options.toolbarSections)));
  if (options.appSections && options.appSections !== 'all')
    params.set('appSections', btoa(JSON.stringify(options.appSections)));
  if (options.paletteSections && options.paletteSections !== 'all')
    params.set('paletteSections', btoa(JSON.stringify(options.paletteSections)));
  if (options.nodeLabelName)
    params.set('nodeLabelName', options.nodeLabelName);

  // treeUrl is passed as a URL param (already supported natively by peartree.html).
  // Resolve relative URLs to absolute so they work from the iframe's origin.
  if (typeof options.treeUrl === 'string') {
    const _a = document.createElement('a');
    _a.href = options.treeUrl;
    params.set('treeUrl', _a.href);
  }

  // Wrap + iframe
  const wrap = document.createElement('div');
  wrap.className = 'pt-embed-frame-wrap';
  wrap.setAttribute('data-bs-theme', theme);
  wrap.style.cssText = `height:${height};overflow:hidden;`;

  const iframe = document.createElement('iframe');
  iframe.src   = base + 'peartree.html?' + params.toString();
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  iframe.title = options.title || 'PearTree — Phylogenetic tree';
  iframe.setAttribute('allowfullscreen', '');
  wrap.appendChild(iframe);
  container.appendChild(wrap);

  // For inline tree strings, dispatch via postMessage after the app is ready.
  // (treeUrl is handled natively by the iframe itself via the URL param above.)
  if (typeof options.tree === 'string') {
    const _treeText = options.tree;
    const _filename = options.filename || 'tree.nwk';
    iframe.addEventListener('load', () => {
      iframe.contentWindow.addEventListener('peartree-ready', () => {
        iframe.contentWindow.postMessage(
          { type: 'pt:loadTree', text: _treeText, filename: _filename },
          window.location.origin,
        );
      }, { once: true });
    }, { once: true });
  }

  return _buildFrameController(iframe);
}

// ── Expose on window for non-module callers ───────────────────────────────
window.PearTree       = { app, embed, embedFrame };
window.PearTreeEmbed  = { embed, embedFrame };  // backward compat

