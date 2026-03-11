import { parseNexus, parseNewick, graphToNewick, parseDelimited } from './treeio.js';
import { computeLayoutFromGraph, graphVisibleTipCount, graphSubtreeHasHidden } from './treeutils.js';
import { fromNestedRoot, rerootOnGraph, reorderGraph, rotateNodeGraph, midpointRootGraph, buildAnnotationSchema, isNumericType, TreeCalibration } from './phylograph.js';
import { TreeRenderer, CAL_DATE_KEY, CAL_DATE_HPD_KEY, CAL_DATE_HPD_ONLY_KEY } from './treerenderer.js';
import { LegendRenderer } from './legendrenderer.js';
import { AxisRenderer  } from './axisrenderer.js';
import { THEMES, DEFAULT_SETTINGS, SETTINGS_KEY, USER_THEMES_KEY, DEFAULT_THEME_KEY, TYPEFACES } from './themes.js';
import { CATEGORICAL_PALETTES, SEQUENTIAL_PALETTES,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE } from './palettes.js';
import { viewportDims, compositeViewPng, buildGraphicSVG } from './graphicsio.js';
import { createAnnotImporter } from './annotationsio.js';
import { createAnnotCurator  } from './annotcurator.js';
import * as commands from './commands.js';

const EXAMPLE_TREE_PATH = 'data/ebov.tree';

/** Root URL of the deployed GitHub Pages site — used as a fallback when a
 *  relative path fails (e.g. when the HTML file is opened directly from disk). */
const PEARTREE_BASE_URL = 'https://artic-network.github.io/peartree/';

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

(async () => {
  const canvas            = document.getElementById('tree-canvas');
  const loadingEl         = document.getElementById('loading');
  const canvasBgColorEl   = document.getElementById('canvas-bg-color');
  const branchColorEl     = document.getElementById('branch-color');
  const branchWidthSlider = document.getElementById('branch-width-slider');
  const fontSlider        = document.getElementById('font-size-slider');
  const tipSlider         = document.getElementById('tip-size-slider');
  const tipHaloSlider      = document.getElementById('tip-halo-slider');
  const nodeSlider        = document.getElementById('node-size-slider');
  const nodeHaloSlider     = document.getElementById('node-halo-slider');
  const tipShapeColorEl   = document.getElementById('tip-shape-color');
  const tipShapeBgEl      = document.getElementById('tip-shape-bg-color');
  const labelColorEl      = document.getElementById('label-color');
  const selectedLabelStyleEl = document.getElementById('selected-label-style');
  const selectedTipStrokeEl   = document.getElementById('selected-tip-stroke');
  const selectedNodeStrokeEl       = document.getElementById('selected-node-stroke');
  const tipHoverFillEl       = document.getElementById('tip-hover-fill');
  const nodeHoverFillEl  = document.getElementById('node-hover-fill');
  const selectedTipFillEl                = document.getElementById('selected-tip-fill');
  const selectedTipGrowthSlider          = document.getElementById('selected-tip-growth');
  const selectedTipMinSizeSlider         = document.getElementById('selected-tip-min-size');
  const selectedTipFillOpacitySlider     = document.getElementById('selected-tip-fill-opacity');
  const selectedTipStrokeWidthSlider     = document.getElementById('selected-tip-stroke-width');
  const selectedTipStrokeOpacitySlider   = document.getElementById('selected-tip-stroke-opacity');
  const selectedNodeFillEl               = document.getElementById('selected-node-fill');
  const selectedNodeGrowthSlider         = document.getElementById('selected-node-growth');
  const selectedNodeMinSizeSlider        = document.getElementById('selected-node-min-size');
  const selectedNodeFillOpacitySlider    = document.getElementById('selected-node-fill-opacity');
  const selectedNodeStrokeWidthSlider    = document.getElementById('selected-node-stroke-width');
  const selectedNodeStrokeOpacitySlider  = document.getElementById('selected-node-stroke-opacity');
  const tipHoverStrokeEl                 = document.getElementById('tip-hover-stroke');
  const tipHoverGrowthSlider             = document.getElementById('tip-hover-growth');
  const tipHoverMinSizeSlider            = document.getElementById('tip-hover-min-size');
  const tipHoverFillOpacitySlider        = document.getElementById('tip-hover-fill-opacity');
  const tipHoverStrokeWidthSlider        = document.getElementById('tip-hover-stroke-width');
  const tipHoverStrokeOpacitySlider      = document.getElementById('tip-hover-stroke-opacity');
  const nodeHoverStrokeEl                = document.getElementById('node-hover-stroke');
  const nodeHoverGrowthSlider            = document.getElementById('node-hover-growth');
  const nodeHoverMinSizeSlider           = document.getElementById('node-hover-min-size');
  const nodeHoverFillOpacitySlider       = document.getElementById('node-hover-fill-opacity');
  const nodeHoverStrokeWidthSlider       = document.getElementById('node-hover-stroke-width');
  const nodeHoverStrokeOpacitySlider     = document.getElementById('node-hover-stroke-opacity');
  const nodeShapeColorEl  = document.getElementById('node-shape-color');
  const nodeShapeBgEl     = document.getElementById('node-shape-bg-color');
  const nodeBarsShowEl      = document.getElementById('node-bars-show');
  const nodeBarsColorEl     = document.getElementById('node-bars-color');
  const nodeBarsWidthSlider = document.getElementById('node-bars-width-slider');
  const nodeBarsMedianEl    = document.getElementById('node-bars-median');
  const nodeBarsRangeEl     = document.getElementById('node-bars-range');
  const nodeBarsControlsEl  = document.getElementById('node-bars-controls');
  const nodeBarsUnavailEl   = document.getElementById('node-bars-unavail');
  const tipShapeDetailEl    = document.getElementById('tip-shape-detail');
  const nodeShapeDetailEl   = document.getElementById('node-shape-detail');
  const nodeLabelDetailEl   = document.getElementById('node-label-detail');
  const nodeBarsDetailEl    = document.getElementById('node-bars-detail');
  const legendDetailEl      = document.getElementById('legend-detail');
  const axisDetailEl        = document.getElementById('axis-detail');
  const clampNegBranchesEl  = document.getElementById('clamp-neg-branches');
  const clampNegBranchesRowEl = document.getElementById('clamp-neg-branches-row');
  const fontFamilyEl        = document.getElementById('font-family-select');
  const tipColourBy       = document.getElementById('tip-colour-by');
  const nodeColourBy      = document.getElementById('node-colour-by');
  const labelColourBy     = document.getElementById('label-colour-by');
  const tipLabelShow      = document.getElementById('tip-label-show');
  const tipLabelControlsEl = document.getElementById('tip-label-controls');
  const tipLabelAlignEl   = document.getElementById('tip-label-align');
  const nodeLabelShowEl         = document.getElementById('node-label-show');
  const nodeLabelPositionEl     = document.getElementById('node-label-position');
  const nodeLabelFontSizeSlider = document.getElementById('node-label-font-size-slider');
  const nodeLabelColorEl        = document.getElementById('node-label-color');
  const nodeLabelSpacingSlider  = document.getElementById('node-label-spacing-slider');
  const tipLabelDpRowEl          = document.getElementById('tip-label-dp-row');
  const tipLabelDpEl             = document.getElementById('tip-label-decimal-places');
  const nodeLabelDpRowEl         = document.getElementById('node-label-dp-row');
  const nodeLabelDpEl            = document.getElementById('node-label-decimal-places');
  const tipPaletteSelect   = document.getElementById('tip-palette-select');
  const tipPaletteRow      = document.getElementById('tip-palette-row');
  const nodePaletteSelect  = document.getElementById('node-palette-select');
  const nodePaletteRow     = document.getElementById('node-palette-row');
  const labelPaletteSelect = document.getElementById('label-palette-select');
  const labelPaletteRow    = document.getElementById('label-palette-row');
  const tipLabelShapeEl              = document.getElementById('tip-label-shape');
  const tipLabelShapeColorEl         = document.getElementById('tip-label-shape-color');
  const tipLabelShapeColourBy        = document.getElementById('tip-label-shape-colour-by');
  const tipLabelShapePaletteRow      = document.getElementById('tip-label-shape-palette-row');
  const tipLabelShapePaletteSelect   = document.getElementById('tip-label-shape-palette-select');
  const tipLabelShapeMarginLeftSlider  = document.getElementById('tip-label-shape-margin-left-slider');
  const tipLabelShapeMarginRightSlider = document.getElementById('tip-label-shape-margin-right-slider');
  const tipLabelShapeDetailEl        = document.getElementById('tip-label-shape-detail');
  const tipLabelShape2El             = document.getElementById('tip-label-shape-2');
  const tipLabelShape2ColorEl        = document.getElementById('tip-label-shape-2-color');
  const tipLabelShape2ColourBy       = document.getElementById('tip-label-shape-2-colour-by');
  const tipLabelShape2PaletteRow     = document.getElementById('tip-label-shape-2-palette-row');
  const tipLabelShape2PaletteSelect  = document.getElementById('tip-label-shape-2-palette-select');
  const tipLabelShape2MarginRightSlider = document.getElementById('tip-label-shape-2-margin-right-slider');
  const tipLabelShape2SectionEl      = document.getElementById('tip-label-shape-2-section');
  const tipLabelShape2DetailEl       = document.getElementById('tip-label-shape-2-detail');
  const tipLabelShapeSizeSlider      = document.getElementById('tip-label-shape-size-slider');
  const tipLabelShape2SizeSlider     = document.getElementById('tip-label-shape-2-size-slider');
  const legendShowEl          = document.getElementById('legend-show');
  const legendAnnotEl         = document.getElementById('legend-annotation');
  const legendTextColorEl     = document.getElementById('legend-text-color');
  const legendFontSizeSlider   = document.getElementById('legend-font-size-slider');
  const legendHeightPctSlider  = document.getElementById('legend-height-pct-slider');
  const legendFontFamilyEl     = document.getElementById('legend-font-family-select');
  const legendLeftCanvas   = document.getElementById('legend-left-canvas');
  const legendRightCanvas  = document.getElementById('legend-right-canvas');
  const legend2LeftCanvas  = document.getElementById('legend2-left-canvas');
  const legend2RightCanvas = document.getElementById('legend2-right-canvas');
  const legend2AnnotEl          = document.getElementById('legend-annotation-2');
  const legend2ShowEl           = document.getElementById('legend2-show');
  const legend2HeightPctSlider  = document.getElementById('legend2-height-pct-slider');
  const legend2DetailEl         = document.getElementById('legend2-detail');
  const axisCanvas             = document.getElementById('axis-canvas');
  const axisShowEl             = document.getElementById('axis-show');
  const axisDateAnnotEl        = document.getElementById('axis-date-annotation');
  const axisDateRow            = document.getElementById('axis-date-row');
  const axisDateFmtEl          = document.getElementById('axis-date-format');
  const axisDateFmtRow         = document.getElementById('axis-date-format-row');
  const axisMajorIntervalEl    = document.getElementById('axis-major-interval');
  const axisMinorIntervalEl    = document.getElementById('axis-minor-interval');
  const axisMajorLabelEl       = document.getElementById('axis-major-label');
  const axisMinorLabelEl       = document.getElementById('axis-minor-label');
  const axisMajorIntervalRow   = document.getElementById('axis-major-interval-row');
  const axisMinorIntervalRow   = document.getElementById('axis-minor-interval-row');
  const axisMajorLabelRow      = document.getElementById('axis-major-label-row');
  const axisMinorLabelRow      = document.getElementById('axis-minor-label-row');
  const axisColorEl           = document.getElementById('axis-color');
  const axisFontSizeSlider    = document.getElementById('axis-font-size-slider');
  const axisFontFamilyEl      = document.getElementById('axis-font-family-select');
  const axisLineWidthSlider   = document.getElementById('axis-line-width-slider');
  const themeSelect            = document.getElementById('theme-select');
  const btnStoreTheme          = document.getElementById('btn-store-theme');
  const btnDefaultTheme        = document.getElementById('btn-default-theme');
  const btnRemoveTheme         = document.getElementById('btn-remove-theme');
  const btnFit                 = document.getElementById('btn-fit');
  const btnResetSettings       = document.getElementById('btn-reset-settings');
  const btnImportAnnot         = document.getElementById('btn-import-annot');
  const btnCurateAnnot         = document.getElementById('btn-curate-annot');
  const btnExportTree          = document.getElementById('btn-export-tree');
  const btnMPR                 = document.getElementById('btn-midpoint-root');
  const tipColourPickerEl            = document.getElementById('btn-node-colour');
  const btnApplyUserColour           = document.getElementById('btn-apply-user-colour');
  const btnClearUserColour           = document.getElementById('btn-clear-user-colour');
  const tipFilterEl            = document.getElementById('tip-filter');
  const tipFilterCnt           = document.getElementById('tip-filter-count');

  // ── Settings persistence ──────────────────────────────────────────────────
  // SETTINGS_KEY, USER_THEMES_KEY, THEMES, DEFAULT_SETTINGS imported from ./themes.js

  let currentOrder = null;  // null | 'asc' | 'desc' — declared early so saveSettings() is safe to call during init

  // ── Tree state — declared early so hoisted async function loadTree() can access them ──
  let graph              = null;  // PhyloGraph (adjacency-list model)
  let controlsBound      = false;
  let _cachedMidpoint    = null;  // cached midpointRootGraph() result; cleared on every tree change
  let isExplicitlyRooted = false; // true when root node carries annotations — rerooting disabled
  let _loadedFilename    = null;  // filename of the most recently loaded tree
  let _axisIsTimedTree   = false;
  let treeLoaded         = false; // declared early — referenced by _syncCanvasWrapperBg before modal init

  // Live theme registry: built-ins first, then any user-saved themes added on top.
  const themeRegistry = new Map(Object.entries(THEMES));

  /** The user-set default theme for new windows (persisted in localStorage). */
  let defaultTheme = localStorage.getItem(DEFAULT_THEME_KEY) || 'Artic';
  // Guard: if the stored default is no longer in the registry fall back gracefully.
  if (!themeRegistry.has(defaultTheme)) defaultTheme = Object.keys(THEMES)[0];

  /** Per-annotation palette override: annotationKey → palette name string. */
  const annotationPalettes = new Map();

  /**
   * Populate a palette <select> for the given annotation key and show/hide its row.
   * Restores stored value from annotationPalettes; falls back to the type default.
   * @param {HTMLSelectElement} sel
   * @param {HTMLElement}       row
   * @param {string|null}       annotKey
   */
  function _updatePaletteSelect(sel, row, annotKey) {
    const schema = renderer?._annotationSchema;
    if (!annotKey || annotKey === 'user_colour' || !schema) {
      row.style.display = 'none';
      return;
    }
    const def = schema.get(annotKey);
    if (!def) { row.style.display = 'none'; return; }
    const isCat    = def.dataType === 'categorical' || def.dataType === 'ordinal';
    const palettes = isCat ? CATEGORICAL_PALETTES : SEQUENTIAL_PALETTES;
    const defPal   = isCat ? DEFAULT_CATEGORICAL_PALETTE : DEFAULT_SEQUENTIAL_PALETTE;
    const stored   = annotationPalettes.get(annotKey) ?? defPal;
    sel.innerHTML = '';
    for (const name of Object.keys(palettes)) {
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    }
    sel.value = [...sel.options].some(o => o.value === stored) ? stored : defPal;
    row.style.display = 'flex';
  }

  /**
   * After storing a palette change for `key`, sync every other palette <select>
   * that is currently bound to the same annotation so they all show the same value.
   */
  function _syncPaletteSelects(key, paletteName) {
    // Pairs of [colourByEl, paletteSelectEl] – declared further down but accessible via closure.
    const pairs = () => [
      [tipColourBy,            tipPaletteSelect],
      [nodeColourBy,           nodePaletteSelect],
      [labelColourBy,          labelPaletteSelect],
      [tipLabelShapeColourBy,  tipLabelShapePaletteSelect],
      [tipLabelShape2ColourBy, tipLabelShape2PaletteSelect],
    ];
    for (const [colourBy, sel] of pairs()) {
      if (colourBy.value === key && sel.value !== paletteName) {
        if ([...sel.options].some(o => o.value === paletteName)) sel.value = paletteName;
      }
    }
  }

  /** Persist only user-defined (non-built-in) themes to localStorage. */
  function saveUserThemes() {
    const userObj = {};
    for (const [name, theme] of themeRegistry) {
      if (!THEMES[name]) userObj[name] = theme;
    }
    localStorage.setItem(USER_THEMES_KEY, JSON.stringify(userObj));
  }

  /** Load user themes from localStorage into themeRegistry. */
  function loadUserThemes() {
    try {
      const stored = JSON.parse(localStorage.getItem(USER_THEMES_KEY) || '{}');
      for (const [name, theme] of Object.entries(stored)) {
        themeRegistry.set(name, theme);
      }
    } catch { /* ignore */ }
  }

  /** Rebuild the theme <select> options from themeRegistry plus the fixed "Custom" entry. */
  function _populateThemeSelect() {
    const current = themeSelect.value;
    themeSelect.innerHTML = '';
    for (const name of themeRegistry.keys()) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + (name === defaultTheme ? ' ★' : '');
      themeSelect.appendChild(opt);
    }
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Custom';
    customOpt.style.fontStyle = 'italic';
    themeSelect.appendChild(customOpt);
    // Restore selection if still valid, otherwise fall back to first option.
    themeSelect.value = (themeSelect.querySelector(`option[value="${CSS.escape(current)}"]`) ? current : themeRegistry.keys().next().value);
  }

  /** Snapshot all 13 visual controls into a plain theme object. */
  function _snapshotTheme() {
    return {
      canvasBgColor:    canvasBgColorEl.value,
      branchColor:      branchColorEl.value,
      branchWidth:      branchWidthSlider.value,
      fontSize:         fontSlider.value,
      labelColor:       labelColorEl.value,
      tipSize:          tipSlider.value,
      tipHaloSize:      tipHaloSlider.value,
      tipShapeColor:    tipShapeColorEl.value,
      tipShapeBgColor:  tipShapeBgEl.value,
      nodeSize:         nodeSlider.value,
      nodeHaloSize:     nodeHaloSlider.value,
      nodeShapeColor:    nodeShapeColorEl.value,
      nodeShapeBgColor:  nodeShapeBgEl.value,
      tipLabelShapeColor:  tipLabelShapeColorEl.value,
      tipLabelShape2Color: tipLabelShape2ColorEl.value,
      axisColor:           axisColorEl.value,
      legendTextColor:  legendTextColorEl.value,
      selectedTipStrokeColor:   selectedTipStrokeEl.value,
      selectedNodeStrokeColor:       selectedNodeStrokeEl.value,
      tipHoverFillColor:       tipHoverFillEl.value,
      nodeHoverFillColor:      nodeHoverFillEl.value,
      selectedTipFillColor:    selectedTipFillEl.value,
      selectedNodeFillColor:   selectedNodeFillEl.value,
      tipHoverStrokeColor:     tipHoverStrokeEl.value,
      nodeHoverStrokeColor:    nodeHoverStrokeEl.value,
    };
  }

  /** Prompt for a name and store the current visual settings as a new (or updated) user theme. */
  function storeTheme() {
    const name = prompt('Enter a name for this theme:')?.trim();
    if (!name) return;
    if (name.toLowerCase() === 'custom') {
      alert('"Custom" is a reserved name — please choose a different name.');
      return;
    }
    if (THEMES[name]) {
      alert(`"${name}" is a built-in theme and cannot be overwritten.`);
      return;
    }
    themeRegistry.set(name, _snapshotTheme());
    saveUserThemes();
    _populateThemeSelect();
    themeSelect.value = name;
    _syncThemeButtons();
    saveSettings();
  }

  /** Sync enabled/disabled state of all three theme action buttons. */
  function _syncThemeButtons() {
    const sel       = themeSelect.value;
    const isCustom  = sel === 'custom';
    const isBuiltIn = !!THEMES[sel];
    const isDefault = sel === defaultTheme;
    btnStoreTheme.disabled   = !isCustom;
    btnDefaultTheme.disabled = isCustom || isDefault;
    btnRemoveTheme.disabled  = isCustom || isBuiltIn;
  }

  /** Persist the currently selected named theme as the default for new windows. */
  function setDefaultTheme() {
    const name = themeSelect.value;
    if (name === 'custom' || !themeRegistry.has(name)) return;
    defaultTheme = name;
    localStorage.setItem(DEFAULT_THEME_KEY, name);
    // Repopulate select to refresh the ★ marker, then restore selection.
    _populateThemeSelect();
    themeSelect.value = name;
    _syncThemeButtons();
  }

  /** Delete a user-saved (non-built-in) theme from the registry and localStorage. */
  function removeTheme() {
    const name = themeSelect.value;
    if (name === 'custom' || THEMES[name]) return;
    if (!confirm(`Remove the theme \u201c${name}\u201d?`)) return;
    // If the removed theme was the default, fall back to the first built-in.
    if (defaultTheme === name) {
      defaultTheme = Object.keys(THEMES)[0];
      localStorage.setItem(DEFAULT_THEME_KEY, defaultTheme);
    }
    themeRegistry.delete(name);
    saveUserThemes();
    _populateThemeSelect();
    // Apply whichever theme the select fell back to.
    const fallback = themeSelect.value;
    if (themeRegistry.has(fallback)) applyTheme(fallback);
    _syncThemeButtons();
  }


  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
    catch { return {}; }
  }

  /**
   * Resolve a legend/axis typeface key to a CSS font-family string.
   * 'theme' means "follow the main tree typeface".
   */
  function _resolveTypeface(key) {
    const effectiveKey = (key === 'theme') ? fontFamilyEl.value : key;
    return TYPEFACES[effectiveKey] ?? effectiveKey;
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(_buildSettingsSnapshot()));
  }

  function _buildSettingsSnapshot() {
    return {
      theme:            themeSelect.value,
      canvasBgColor:    canvasBgColorEl.value,
      branchColor:      branchColorEl.value,
      branchWidth:      branchWidthSlider.value,
      fontSize:         fontSlider.value,
      fontFamily:       fontFamilyEl.value,
      labelColor:       labelColorEl.value,
      selectedLabelStyle: selectedLabelStyleEl.value,
      selectedTipStrokeColor:  selectedTipStrokeEl.value,
      selectedNodeStrokeColor:      selectedNodeStrokeEl.value,
      tipHoverFillColor:      tipHoverFillEl.value,
      nodeHoverFillColor: nodeHoverFillEl.value,
      selectedTipFillColor:      selectedTipFillEl.value,
      selectedTipGrowthFactor:   selectedTipGrowthSlider.value,
      selectedTipMinSize:        selectedTipMinSizeSlider.value,
      selectedTipFillOpacity:    selectedTipFillOpacitySlider.value,
      selectedTipStrokeWidth:    selectedTipStrokeWidthSlider.value,
      selectedTipStrokeOpacity:  selectedTipStrokeOpacitySlider.value,
      selectedNodeFillColor:     selectedNodeFillEl.value,
      selectedNodeGrowthFactor:  selectedNodeGrowthSlider.value,
      selectedNodeMinSize:       selectedNodeMinSizeSlider.value,
      selectedNodeFillOpacity:   selectedNodeFillOpacitySlider.value,
      selectedNodeStrokeWidth:   selectedNodeStrokeWidthSlider.value,
      selectedNodeStrokeOpacity: selectedNodeStrokeOpacitySlider.value,
      tipHoverStrokeColor:       tipHoverStrokeEl.value,
      tipHoverGrowthFactor:      tipHoverGrowthSlider.value,
      tipHoverMinSize:           tipHoverMinSizeSlider.value,
      tipHoverFillOpacity:       tipHoverFillOpacitySlider.value,
      tipHoverStrokeWidth:       tipHoverStrokeWidthSlider.value,
      tipHoverStrokeOpacity:     tipHoverStrokeOpacitySlider.value,
      nodeHoverStrokeColor:      nodeHoverStrokeEl.value,
      nodeHoverGrowthFactor:     nodeHoverGrowthSlider.value,
      nodeHoverMinSize:          nodeHoverMinSizeSlider.value,
      nodeHoverFillOpacity:      nodeHoverFillOpacitySlider.value,
      nodeHoverStrokeWidth:      nodeHoverStrokeWidthSlider.value,
      nodeHoverStrokeOpacity:    nodeHoverStrokeOpacitySlider.value,
      tipSize:          tipSlider.value,
      tipHaloSize:      tipHaloSlider.value,
      tipShapeColor:    tipShapeColorEl.value,
      tipShapeBgColor:  tipShapeBgEl.value,
      nodeSize:         nodeSlider.value,
      nodeHaloSize:     nodeHaloSlider.value,
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      tipColourBy:      tipColourBy.value,
      nodeColourBy:     nodeColourBy.value,
      labelColourBy:    labelColourBy.value,
      annotationPalettes: Object.fromEntries(annotationPalettes),
      legendShow:       legendShowEl.value,
      legendAnnotation:  legendAnnotEl.value,
      legendAnnotation2: legend2AnnotEl.value,
      legend2Position:   legend2ShowEl.value,
      legendHeightPct2:  legend2HeightPctSlider.value,
      legendTextColor:  legendTextColorEl.value,
      legendFontSize:    legendFontSizeSlider.value,
      legendHeightPct:   legendHeightPctSlider.value,
      legendFontFamily:  legendFontFamilyEl.value,
      axisShow:           axisShowEl.value,
      axisDateAnnotation: axisDateAnnotEl.value,
      axisDateFormat:     axisDateFmtEl.value,
      axisMajorInterval:    axisMajorIntervalEl.value,
      axisMinorInterval:    axisMinorIntervalEl.value,
      axisMajorLabelFormat: axisMajorLabelEl.value,
      axisMinorLabelFormat: axisMinorLabelEl.value,
      axisColor:          axisColorEl.value,
      axisFontSize:       axisFontSizeSlider.value,
      axisFontFamily:     axisFontFamilyEl.value,
      axisLineWidth:      axisLineWidthSlider.value,
      nodeBarsEnabled:    nodeBarsShowEl.value,
      nodeBarsColor:      nodeBarsColorEl.value,
      nodeBarsWidth:      nodeBarsWidthSlider.value,
      nodeBarsShowMedian: nodeBarsMedianEl.value,
      nodeBarsShowRange:  nodeBarsRangeEl.value,
      clampNegBranches:   clampNegBranchesEl.value,
      tipLabelShow:       tipLabelShow.value,
      tipLabelAlign:      tipLabelAlignEl.value,
      tipLabelDecimalPlaces:  tipLabelDpEl.value !== '' ? parseInt(tipLabelDpEl.value) : null,
      tipLabelShape:      tipLabelShapeEl.value,
      tipLabelShapeColor: tipLabelShapeColorEl.value,
      tipLabelShapeColourBy: tipLabelShapeColourBy.value,
      tipLabelShapeSize:    tipLabelShapeSizeSlider.value,
      tipLabelShapeMarginLeft:  tipLabelShapeMarginLeftSlider.value,
      tipLabelShapeMarginRight: tipLabelShapeMarginRightSlider.value,
      tipLabelShape2:      tipLabelShape2El.value,
      tipLabelShape2Color: tipLabelShape2ColorEl.value,
      tipLabelShape2ColourBy: tipLabelShape2ColourBy.value,
      tipLabelShape2Size:   tipLabelShape2SizeSlider.value,
      tipLabelShape2MarginRight: tipLabelShape2MarginRightSlider.value,
      nodeLabelAnnotation: nodeLabelShowEl.value,
      nodeLabelPosition:   nodeLabelPositionEl.value,
      nodeLabelFontSize:   nodeLabelFontSizeSlider.value,
      nodeLabelColor:      nodeLabelColorEl.value,
      nodeLabelSpacing:    nodeLabelSpacingSlider.value,
      nodeLabelDecimalPlaces: nodeLabelDpEl.value !== '' ? parseInt(nodeLabelDpEl.value) : null,
      mode:             renderer ? renderer._mode : 'nodes',
    };
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
      document.getElementById('branch-width-value').textContent = s.branchWidth;
    }
    if (s.fontSize       != null) {
      fontSlider.value = s.fontSize;
      document.getElementById('font-size-value').textContent = s.fontSize;
    }
    if (s.fontFamily)            fontFamilyEl.value       = s.fontFamily;
    if (s.labelColor)            labelColorEl.value       = s.labelColor;
    if (s.selectedLabelStyle)    selectedLabelStyleEl.value = s.selectedLabelStyle;
    if (s.selectedTipStrokeColor)     selectedTipStrokeEl.value  = s.selectedTipStrokeColor;
    if (s.selectedNodeStrokeColor)         selectedNodeStrokeEl.value      = s.selectedNodeStrokeColor;
    if (s.tipHoverFillColor)         tipHoverFillEl.value      = s.tipHoverFillColor;
    if (s.nodeHoverFillColor)    nodeHoverFillEl.value = s.nodeHoverFillColor;
    if (s.selectedTipFillColor)  selectedTipFillEl.value = s.selectedTipFillColor;
    if (s.selectedTipGrowthFactor != null) {
      selectedTipGrowthSlider.value = s.selectedTipGrowthFactor;
      document.getElementById('selected-tip-growth-value').textContent = s.selectedTipGrowthFactor;
    }
    if (s.selectedTipMinSize != null) {
      selectedTipMinSizeSlider.value = s.selectedTipMinSize;
      document.getElementById('selected-tip-min-size-value').textContent = s.selectedTipMinSize;
    }
    if (s.selectedTipFillOpacity != null) {
      selectedTipFillOpacitySlider.value = s.selectedTipFillOpacity;
      document.getElementById('selected-tip-fill-opacity-value').textContent = s.selectedTipFillOpacity;
    }
    if (s.selectedTipStrokeWidth != null) {
      selectedTipStrokeWidthSlider.value = s.selectedTipStrokeWidth;
      document.getElementById('selected-tip-stroke-width-value').textContent = s.selectedTipStrokeWidth;
    }
    if (s.selectedTipStrokeOpacity != null) {
      selectedTipStrokeOpacitySlider.value = s.selectedTipStrokeOpacity;
      document.getElementById('selected-tip-stroke-opacity-value').textContent = s.selectedTipStrokeOpacity;
    }
    if (s.selectedNodeFillColor) selectedNodeFillEl.value = s.selectedNodeFillColor;
    if (s.selectedNodeGrowthFactor != null) {
      selectedNodeGrowthSlider.value = s.selectedNodeGrowthFactor;
      document.getElementById('selected-node-growth-value').textContent = s.selectedNodeGrowthFactor;
    }
    if (s.selectedNodeMinSize != null) {
      selectedNodeMinSizeSlider.value = s.selectedNodeMinSize;
      document.getElementById('selected-node-min-size-value').textContent = s.selectedNodeMinSize;
    }
    if (s.selectedNodeFillOpacity != null) {
      selectedNodeFillOpacitySlider.value = s.selectedNodeFillOpacity;
      document.getElementById('selected-node-fill-opacity-value').textContent = s.selectedNodeFillOpacity;
    }
    if (s.selectedNodeStrokeWidth != null) {
      selectedNodeStrokeWidthSlider.value = s.selectedNodeStrokeWidth;
      document.getElementById('selected-node-stroke-width-value').textContent = s.selectedNodeStrokeWidth;
    }
    if (s.selectedNodeStrokeOpacity != null) {
      selectedNodeStrokeOpacitySlider.value = s.selectedNodeStrokeOpacity;
      document.getElementById('selected-node-stroke-opacity-value').textContent = s.selectedNodeStrokeOpacity;
    }
    if (s.tipHoverStrokeColor)   tipHoverStrokeEl.value = s.tipHoverStrokeColor;
    if (s.tipHoverGrowthFactor != null) {
      tipHoverGrowthSlider.value = s.tipHoverGrowthFactor;
      document.getElementById('tip-hover-growth-value').textContent = s.tipHoverGrowthFactor;
    }
    if (s.tipHoverMinSize != null) {
      tipHoverMinSizeSlider.value = s.tipHoverMinSize;
      document.getElementById('tip-hover-min-size-value').textContent = s.tipHoverMinSize;
    }
    if (s.tipHoverFillOpacity != null) {
      tipHoverFillOpacitySlider.value = s.tipHoverFillOpacity;
      document.getElementById('tip-hover-fill-opacity-value').textContent = s.tipHoverFillOpacity;
    }
    if (s.tipHoverStrokeWidth != null) {
      tipHoverStrokeWidthSlider.value = s.tipHoverStrokeWidth;
      document.getElementById('tip-hover-stroke-width-value').textContent = s.tipHoverStrokeWidth;
    }
    if (s.tipHoverStrokeOpacity != null) {
      tipHoverStrokeOpacitySlider.value = s.tipHoverStrokeOpacity;
      document.getElementById('tip-hover-stroke-opacity-value').textContent = s.tipHoverStrokeOpacity;
    }
    if (s.nodeHoverStrokeColor)  nodeHoverStrokeEl.value = s.nodeHoverStrokeColor;
    if (s.nodeHoverGrowthFactor != null) {
      nodeHoverGrowthSlider.value = s.nodeHoverGrowthFactor;
      document.getElementById('node-hover-growth-value').textContent = s.nodeHoverGrowthFactor;
    }
    if (s.nodeHoverMinSize != null) {
      nodeHoverMinSizeSlider.value = s.nodeHoverMinSize;
      document.getElementById('node-hover-min-size-value').textContent = s.nodeHoverMinSize;
    }
    if (s.nodeHoverFillOpacity != null) {
      nodeHoverFillOpacitySlider.value = s.nodeHoverFillOpacity;
      document.getElementById('node-hover-fill-opacity-value').textContent = s.nodeHoverFillOpacity;
    }
    if (s.nodeHoverStrokeWidth != null) {
      nodeHoverStrokeWidthSlider.value = s.nodeHoverStrokeWidth;
      document.getElementById('node-hover-stroke-width-value').textContent = s.nodeHoverStrokeWidth;
    }
    if (s.nodeHoverStrokeOpacity != null) {
      nodeHoverStrokeOpacitySlider.value = s.nodeHoverStrokeOpacity;
      document.getElementById('node-hover-stroke-opacity-value').textContent = s.nodeHoverStrokeOpacity;
    }
    if (s.tipSize        != null) {
      tipSlider.value = s.tipSize;
      document.getElementById('tip-size-value').textContent = s.tipSize;
    }
    if (s.tipHaloSize    != null) {
      tipHaloSlider.value = s.tipHaloSize;
      document.getElementById('tip-halo-value').textContent = s.tipHaloSize;
    }
    if (s.tipShapeColor)         tipShapeColorEl.value    = s.tipShapeColor;
    if (s.tipShapeBgColor)       tipShapeBgEl.value       = s.tipShapeBgColor;
    if (s.tipLabelShape)         tipLabelShapeEl.value      = s.tipLabelShape;
    if (s.tipLabelShapeColor)    tipLabelShapeColorEl.value = s.tipLabelShapeColor;
    if (s.tipLabelShapeMarginLeft != null) {
      tipLabelShapeMarginLeftSlider.value = s.tipLabelShapeMarginLeft;
      document.getElementById('tip-label-shape-margin-left-value').textContent = s.tipLabelShapeMarginLeft;
    }
    if (s.tipLabelShapeMarginRight != null) {
      tipLabelShapeMarginRightSlider.value = s.tipLabelShapeMarginRight;
      document.getElementById('tip-label-shape-margin-right-value').textContent = s.tipLabelShapeMarginRight;
    }
    if (s.tipLabelShapeSize != null) {
      tipLabelShapeSizeSlider.value = s.tipLabelShapeSize;
      document.getElementById('tip-label-shape-size-value').textContent = s.tipLabelShapeSize;
    }
    if (s.tipLabelShape2)         tipLabelShape2El.value      = s.tipLabelShape2;
    if (s.tipLabelShape2Color)    tipLabelShape2ColorEl.value = s.tipLabelShape2Color;
    if (s.tipLabelShape2MarginRight != null) {
      tipLabelShape2MarginRightSlider.value = s.tipLabelShape2MarginRight;
      document.getElementById('tip-label-shape-2-margin-right-value').textContent = s.tipLabelShape2MarginRight;
    }
    if (s.tipLabelShape2Size != null) {
      tipLabelShape2SizeSlider.value = s.tipLabelShape2Size;
      document.getElementById('tip-label-shape-2-size-value').textContent = s.tipLabelShape2Size;
    }
    if (s.nodeSize       != null) {
      nodeSlider.value = s.nodeSize;
      document.getElementById('node-size-value').textContent = s.nodeSize;
    }
    if (s.nodeHaloSize   != null) {
      nodeHaloSlider.value = s.nodeHaloSize;
      document.getElementById('node-halo-value').textContent = s.nodeHaloSize;
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
    if (s.axisFontFamily)        axisFontFamilyEl.value   = s.axisFontFamily;
    if (s.legendShow)            legendShowEl.value       = s.legendShow;
    if (s.legendTextColor) legendTextColorEl.value = s.legendTextColor;
    if (s.legendFontSize != null) {
      legendFontSizeSlider.value = s.legendFontSize;
      document.getElementById('legend-font-size-value').textContent = s.legendFontSize;
    }
    if (s.legendHeightPct != null) {
      legendHeightPctSlider.value = s.legendHeightPct;
      document.getElementById('legend-height-pct-value').textContent = s.legendHeightPct + '%';
    }
    if (s.legendFontFamily)      legendFontFamilyEl.value = s.legendFontFamily;
    if (s.legend2Position)        legend2ShowEl.value      = s.legend2Position;
    if (s.legendHeightPct2 != null) {
      legend2HeightPctSlider.value = s.legendHeightPct2;
      document.getElementById('legend2-height-pct-value').textContent = s.legendHeightPct2 + '%';
    }
    // Note: legendAnnotation2 is annotation-dependent and restored later in loadTree.
    // Node bars settings
    if (s.nodeBarsEnabled)  nodeBarsShowEl.value  = s.nodeBarsEnabled;
    if (s.nodeBarsColor)    nodeBarsColorEl.value = s.nodeBarsColor;
    if (s.nodeBarsWidth != null) {
      nodeBarsWidthSlider.value = s.nodeBarsWidth;
      document.getElementById('node-bars-width-value').textContent = s.nodeBarsWidth;
    }
    if (s.nodeBarsShowMedian) nodeBarsMedianEl.value = s.nodeBarsShowMedian;
    if (s.nodeBarsShowRange)  nodeBarsRangeEl.value  = s.nodeBarsShowRange;
    if (s.clampNegBranches)   clampNegBranchesEl.value = s.clampNegBranches;
    // Node label settings (annotation-dependent: nodeLabelAnnotation is applied later in loadTree)
    if (s.nodeLabelPosition)  nodeLabelPositionEl.value   = s.nodeLabelPosition;
    if (s.nodeLabelFontSize != null) {
      nodeLabelFontSizeSlider.value = s.nodeLabelFontSize;
      document.getElementById('node-label-font-size-value').textContent = s.nodeLabelFontSize;
    }
    if (s.nodeLabelColor)     nodeLabelColorEl.value      = s.nodeLabelColor;
    if (s.nodeLabelSpacing != null) {
      nodeLabelSpacingSlider.value = s.nodeLabelSpacing;
      document.getElementById('node-label-spacing-value').textContent = s.nodeLabelSpacing;
    }
    if (s.tipLabelDecimalPlaces  != null && tipLabelDpEl)  tipLabelDpEl.value  = String(s.tipLabelDecimalPlaces);
    if (s.nodeLabelDecimalPlaces != null && nodeLabelDpEl) nodeLabelDpEl.value = String(s.nodeLabelDecimalPlaces);
    // Set themeSelect to the stored theme name (or 'custom' if not known).
    const themeName = s.theme && themeRegistry.has(s.theme) ? s.theme : (s.theme === 'custom' ? 'custom' : 'custom');
    themeSelect.value = themeName;
    _syncThemeButtons();
    if (renderer) {
      renderer.setSettings(_buildRendererSettings());
      if (s.axisColor) axisRenderer.setColor(s.axisColor);
    }
    _syncControlVisibility();
  }

  function applyDefaults() {
    if (!confirm('Reset all visual settings to their defaults?')) return;

    // Apply the default theme (hydrates all visual DOM controls + renderer).
    applyTheme('Artic');

    // Reset colour-by dropdowns, legend, and axis controls.
    tipColourBy.value        = 'user_colour';
    nodeColourBy.value       = 'user_colour';
    labelColourBy.value      = 'user_colour';
    tipLabelShow.value       = 'names';
    tipLabelControlsEl.style.display = '';
    tipLabelAlignEl.value    = 'off';
    legendShowEl.value       = DEFAULT_SETTINGS.legendShow;
    legendAnnotEl.value      = '';
    legend2AnnotEl.value     = '';
    legend2ShowEl.value      = DEFAULT_SETTINGS.legend2Position;
    legend2HeightPctSlider.value = DEFAULT_SETTINGS.legendHeightPct2;
    document.getElementById('legend2-height-pct-value').textContent = DEFAULT_SETTINGS.legendHeightPct2 + '%';
    legendTextColorEl.value  = DEFAULT_SETTINGS.legendTextColor;
    legendFontSizeSlider.value = DEFAULT_SETTINGS.legendFontSize;
    document.getElementById('legend-font-size-value').textContent = DEFAULT_SETTINGS.legendFontSize;
    legendFontFamilyEl.value = DEFAULT_SETTINGS.legendFontFamily;
    axisShowEl.value         = DEFAULT_SETTINGS.axisShow;  // 'off'
    axisDateAnnotEl.value    = '';
    calibration.setAnchor(null, new Map(), 0);
    axisDateFmtRow.style.display = 'none';
    axisDateFmtEl.value      = DEFAULT_SETTINGS.axisDateFormat;
    axisMajorIntervalEl.value    = DEFAULT_SETTINGS.axisMajorInterval;
    axisMinorIntervalEl.value    = DEFAULT_SETTINGS.axisMinorInterval;
    axisMajorLabelEl.value       = DEFAULT_SETTINGS.axisMajorLabelFormat;
    axisMinorLabelEl.value       = DEFAULT_SETTINGS.axisMinorLabelFormat;
    _updateMinorOptions(DEFAULT_SETTINGS.axisMajorInterval, DEFAULT_SETTINGS.axisMinorInterval);
    axisFontSizeSlider.value = DEFAULT_SETTINGS.axisFontSize;
    document.getElementById('axis-font-size-value').textContent = DEFAULT_SETTINGS.axisFontSize;
    axisLineWidthSlider.value = DEFAULT_SETTINGS.axisLineWidth;
    document.getElementById('axis-line-width-value').textContent = DEFAULT_SETTINGS.axisLineWidth;
    axisFontFamilyEl.value = DEFAULT_SETTINGS.axisFontFamily;
    nodeBarsShowEl.value  = DEFAULT_SETTINGS.nodeBarsEnabled;
    nodeBarsColorEl.value = DEFAULT_SETTINGS.nodeBarsColor;
    nodeBarsWidthSlider.value = DEFAULT_SETTINGS.nodeBarsWidth;
    document.getElementById('node-bars-width-value').textContent = DEFAULT_SETTINGS.nodeBarsWidth;
    nodeBarsMedianEl.value = DEFAULT_SETTINGS.nodeBarsShowMedian;
    nodeBarsRangeEl.value  = DEFAULT_SETTINGS.nodeBarsShowRange;
    clampNegBranchesEl.value = DEFAULT_SETTINGS.clampNegBranches ?? 'off';
    nodeLabelShowEl.value       = DEFAULT_SETTINGS.nodeLabelAnnotation;
    nodeLabelPositionEl.value   = DEFAULT_SETTINGS.nodeLabelPosition;
    nodeLabelFontSizeSlider.value = DEFAULT_SETTINGS.nodeLabelFontSize;
    document.getElementById('node-label-font-size-value').textContent = DEFAULT_SETTINGS.nodeLabelFontSize;
    nodeLabelColorEl.value      = DEFAULT_SETTINGS.nodeLabelColor;
    nodeLabelSpacingSlider.value = DEFAULT_SETTINGS.nodeLabelSpacing;
    document.getElementById('node-label-spacing-value').textContent = DEFAULT_SETTINGS.nodeLabelSpacing;
    if (tipLabelDpEl)    tipLabelDpEl.value    = '';
    if (nodeLabelDpEl)   nodeLabelDpEl.value   = '';
    tipLabelShapeEl.value        = DEFAULT_SETTINGS.tipLabelShape;
    tipLabelShapeColorEl.value   = DEFAULT_SETTINGS.tipLabelShapeColor;
    tipLabelShapeColourBy.value  = 'user_colour';
    tipLabelShapeMarginLeftSlider.value  = DEFAULT_SETTINGS.tipLabelShapeMarginLeft;
    document.getElementById('tip-label-shape-margin-left-value').textContent  = DEFAULT_SETTINGS.tipLabelShapeMarginLeft;
    tipLabelShapeMarginRightSlider.value = DEFAULT_SETTINGS.tipLabelShapeMarginRight;
    document.getElementById('tip-label-shape-margin-right-value').textContent = DEFAULT_SETTINGS.tipLabelShapeMarginRight;
    tipLabelShapeSizeSlider.value = DEFAULT_SETTINGS.tipLabelShapeSize;
    document.getElementById('tip-label-shape-size-value').textContent = DEFAULT_SETTINGS.tipLabelShapeSize;
    tipLabelShape2El.value       = DEFAULT_SETTINGS.tipLabelShape2;
    tipLabelShape2ColorEl.value  = DEFAULT_SETTINGS.tipLabelShape2Color;
    tipLabelShape2ColourBy.value = 'user_colour';
    tipLabelShape2MarginRightSlider.value = DEFAULT_SETTINGS.tipLabelShape2MarginRight;
    document.getElementById('tip-label-shape-2-margin-right-value').textContent = DEFAULT_SETTINGS.tipLabelShape2MarginRight;
    tipLabelShape2SizeSlider.value = DEFAULT_SETTINGS.tipLabelShape2Size;
    document.getElementById('tip-label-shape-2-size-value').textContent = DEFAULT_SETTINGS.tipLabelShape2Size;

    if (renderer) {
      renderer.setTipColourBy('user_colour');
      renderer.setNodeColourBy('user_colour');
      renderer.setLabelColourBy('user_colour');
      renderer.setTipLabelShapeColourBy('user_colour');
      renderer.setTipLabelShape2ColourBy('user_colour');
      legendRenderer.setFontSize(parseInt(DEFAULT_SETTINGS.legendFontSize));
      legendRenderer.setFontFamily(_resolveTypeface(legendFontFamilyEl.value));
      legendRenderer.setTextColor(DEFAULT_SETTINGS.legendTextColor);
      axisRenderer.setFontFamily(_resolveTypeface(axisFontFamilyEl.value));
      renderer.setMode('nodes');
      renderer.setNodeLabelAnnotation(null);
      applyLegend();
      applyAxis();
      applyTickOptions();
      applyAxisStyle();
    }

    // Reset order + mode button states (if controls are already bound).
    currentOrder = null;
    document.getElementById('btn-order-asc') ?.classList.remove('active');
    document.getElementById('btn-order-desc')?.classList.remove('active');
    document.getElementById('btn-mode-nodes')    ?.classList.toggle('active', true);
    document.getElementById('btn-mode-branches') ?.classList.toggle('active', false);

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

  function _buildRendererSettings() {
    return {
      bgColor:          canvasBgColorEl.value,
      branchColor:      branchColorEl.value,
      branchWidth:      parseFloat(branchWidthSlider.value),
      fontSize:         parseInt(fontSlider.value),
      tipRadius:        parseInt(tipSlider.value),
      tipHaloSize:      parseInt(tipHaloSlider.value),
      tipShapeColor:    tipShapeColorEl.value,
      tipShapeBgColor:  tipShapeBgEl.value,
      tipOutlineColor:  DEFAULT_SETTINGS.tipOutlineColor,
      nodeRadius:       parseInt(nodeSlider.value),
      nodeHaloSize:     parseInt(nodeHaloSlider.value),
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      labelColor:       labelColorEl.value,
      selectedLabelStyle: selectedLabelStyleEl.value,
      paddingLeft:      parseInt(DEFAULT_SETTINGS.paddingLeft),
      paddingRight:     parseInt(DEFAULT_SETTINGS.paddingRight),
      paddingTop:       parseInt(DEFAULT_SETTINGS.paddingTop),
      paddingBottom:    parseInt(DEFAULT_SETTINGS.paddingBottom),
      elbowRadius:      parseFloat(DEFAULT_SETTINGS.elbowRadius),
      rootStubLength:   parseFloat(DEFAULT_SETTINGS.rootStubLength),
      tipHoverFillColor:      tipHoverFillEl.value,
      tipHoverStrokeColor:    tipHoverStrokeEl.value,
      tipHoverGrowthFactor:   parseFloat(tipHoverGrowthSlider.value),
      tipHoverMinSize:        parseFloat(tipHoverMinSizeSlider.value),
      tipHoverFillOpacity:    parseFloat(tipHoverFillOpacitySlider.value),
      tipHoverStrokeWidth:    parseFloat(tipHoverStrokeWidthSlider.value),
      tipHoverStrokeOpacity:  parseFloat(tipHoverStrokeOpacitySlider.value),
      nodeHoverFillColor:     nodeHoverFillEl.value,
      nodeHoverStrokeColor:   nodeHoverStrokeEl.value,
      nodeHoverGrowthFactor:  parseFloat(nodeHoverGrowthSlider.value),
      nodeHoverMinSize:       parseFloat(nodeHoverMinSizeSlider.value),
      nodeHoverFillOpacity:   parseFloat(nodeHoverFillOpacitySlider.value),
      nodeHoverStrokeWidth:   parseFloat(nodeHoverStrokeWidthSlider.value),
      nodeHoverStrokeOpacity: parseFloat(nodeHoverStrokeOpacitySlider.value),
      selectedTipStrokeColor:    selectedTipStrokeEl.value,
      selectedTipFillColor:      selectedTipFillEl.value,
      selectedTipGrowthFactor:   parseFloat(selectedTipGrowthSlider.value),
      selectedTipMinSize:        parseFloat(selectedTipMinSizeSlider.value),
      selectedTipFillOpacity:    parseFloat(selectedTipFillOpacitySlider.value),
      selectedTipStrokeWidth:    parseFloat(selectedTipStrokeWidthSlider.value),
      selectedTipStrokeOpacity:  parseFloat(selectedTipStrokeOpacitySlider.value),
      selectedNodeStrokeColor:   selectedNodeStrokeEl.value,
      selectedNodeFillColor:     selectedNodeFillEl.value,
      selectedNodeGrowthFactor:  parseFloat(selectedNodeGrowthSlider.value),
      selectedNodeMinSize:       parseFloat(selectedNodeMinSizeSlider.value),
      selectedNodeFillOpacity:   parseFloat(selectedNodeFillOpacitySlider.value),
      selectedNodeStrokeWidth:   parseFloat(selectedNodeStrokeWidthSlider.value),
      selectedNodeStrokeOpacity: parseFloat(selectedNodeStrokeOpacitySlider.value),
      nodeBarsEnabled:    nodeBarsShowEl.value === 'on',
      nodeBarsColor:      nodeBarsColorEl.value,
      nodeBarsWidth:      parseInt(nodeBarsWidthSlider.value),
      nodeBarsShowMedian: nodeBarsMedianEl.value,
      nodeBarsShowRange:  nodeBarsRangeEl.value  === 'on',
      clampNegativeBranches: clampNegBranchesEl.value === 'on',
      fontFamily:         TYPEFACES[fontFamilyEl.value] ?? fontFamilyEl.value,
      tipLabelsOff:       tipLabelShow.value === 'off',
      tipLabelAnnotation: tipLabelShow.value === 'names' ? null
                        : tipLabelShow.value === 'off'   ? null
                        : tipLabelShow.value,
      tipLabelAlign:      tipLabelAlignEl.value,
      tipLabelDecimalPlaces:  tipLabelDpEl.value !== '' ? parseInt(tipLabelDpEl.value) : null,
      tipLabelShape:           tipLabelShapeEl.value,
      tipLabelShapeColor:      tipLabelShapeColorEl.value,
      tipLabelShapeSize:        parseInt(tipLabelShapeSizeSlider.value),
      tipLabelShapeMarginLeft:  parseInt(tipLabelShapeMarginLeftSlider.value),
      tipLabelShapeMarginRight: parseInt(tipLabelShapeMarginRightSlider.value),
      tipLabelShape2:           tipLabelShape2El.value,
      tipLabelShape2Color:      tipLabelShape2ColorEl.value,
      tipLabelShape2Size:        parseInt(tipLabelShape2SizeSlider.value),
      tipLabelShape2MarginRight: parseInt(tipLabelShape2MarginRightSlider.value),
      nodeLabelAnnotation: nodeLabelShowEl.value || null,
      nodeLabelPosition:   nodeLabelPositionEl.value,
      nodeLabelFontSize:   parseInt(nodeLabelFontSizeSlider.value),
      nodeLabelColor:      nodeLabelColorEl.value,
      nodeLabelSpacing:    parseInt(nodeLabelSpacingSlider.value),
      nodeLabelDecimalPlaces: nodeLabelDpEl.value !== '' ? parseInt(nodeLabelDpEl.value) : null,
      calCalibration:      calibration?.isActive ? calibration : null,
      calDateFormat:       axisDateFmtEl.value,
      introAnimation:      DEFAULT_SETTINGS.introAnimation,
    };
  }

  /**
   * Show/hide secondary controls based on the primary on/off state of each section.
   * Call whenever any controlling element changes, and once on page load.
   */
  function _syncControlVisibility() {
    const _vis = (el, visible) => { if (el) el.classList.toggle('pt-detail-open', visible); };
    _vis(tipShapeDetailEl,      parseInt(tipSlider.value)   > 0);
    _vis(nodeShapeDetailEl,     parseInt(nodeSlider.value)  > 0);
    _vis(tipLabelShapeDetailEl, tipLabelShapeEl.value       !== 'off');
    _vis(tipLabelShape2SectionEl, tipLabelShapeEl.value     !== 'off');
    _vis(tipLabelShape2DetailEl,  tipLabelShape2El.value    !== 'off');
    _vis(nodeLabelDetailEl,     nodeLabelShowEl.value       !== '');
    _vis(nodeBarsDetailEl,      nodeBarsShowEl.value        === 'on');
    _vis(legendDetailEl,        legendAnnotEl.value         !== '');
    _vis(legend2DetailEl,       legendAnnotEl.value !== '' && legend2AnnotEl.value !== '');
    _vis(axisDetailEl,          axisShowEl.value            !== 'off');
  }

  /**
   * Sync the CSS background of the canvas wrapper divs to match the canvas
   * fill colour so no gap / flash is visible between the tree and axis canvases.
   * Before a tree is loaded the wrappers have no inline background set, so the
   * CSS rule on html/body (DEFAULT_BACKGROUND_COLOR) shows through instead.
   */
  function _syncCanvasWrapperBg(color) {
    if (!treeLoaded) return;
    document.getElementById('canvas-container').style.background        = color;
    document.getElementById('canvas-wrapper').style.background          = color;
    document.getElementById('canvas-and-axis-wrapper').style.background = color;
  }

  /** Apply a named theme: hydrate all visual DOM controls and push to renderer. */
  function applyTheme(name) {
    const t = themeRegistry.get(name);
    if (!t) return;
    canvasBgColorEl.value   = t.canvasBgColor;
    _syncCanvasWrapperBg(t.canvasBgColor);
    branchColorEl.value     = t.branchColor;
    branchWidthSlider.value = t.branchWidth;
    document.getElementById('branch-width-value').textContent = t.branchWidth;
    fontSlider.value        = t.fontSize;
    document.getElementById('font-size-value').textContent    = t.fontSize;
    labelColorEl.value         = t.labelColor;
    selectedLabelStyleEl.value = t.selectedLabelStyle       ?? DEFAULT_SETTINGS.selectedLabelStyle;
    selectedTipStrokeEl.value  = t.selectedTipStrokeColor   ?? DEFAULT_SETTINGS.selectedTipStrokeColor;
    selectedNodeStrokeEl.value = t.selectedNodeStrokeColor  ?? DEFAULT_SETTINGS.selectedNodeStrokeColor;
    tipHoverFillEl.value       = t.tipHoverFillColor        ?? DEFAULT_SETTINGS.tipHoverFillColor;
    nodeHoverFillEl.value      = t.nodeHoverFillColor       ?? DEFAULT_SETTINGS.nodeHoverFillColor;
    selectedTipFillEl.value    = t.selectedTipFillColor     ?? DEFAULT_SETTINGS.selectedTipFillColor;
    selectedNodeFillEl.value   = t.selectedNodeFillColor    ?? DEFAULT_SETTINGS.selectedNodeFillColor;
    tipHoverStrokeEl.value     = t.tipHoverStrokeColor      ?? DEFAULT_SETTINGS.tipHoverStrokeColor;
    nodeHoverStrokeEl.value    = t.nodeHoverStrokeColor     ?? DEFAULT_SETTINGS.nodeHoverStrokeColor;
    tipSlider.value         = t.tipSize;
    document.getElementById('tip-size-value').textContent     = t.tipSize;
    tipHaloSlider.value     = t.tipHaloSize;
    document.getElementById('tip-halo-value').textContent     = t.tipHaloSize;
    tipShapeColorEl.value   = t.tipShapeColor;
    tipShapeBgEl.value      = t.tipShapeBgColor;
    nodeSlider.value        = t.nodeSize;
    document.getElementById('node-size-value').textContent    = t.nodeSize;
    nodeHaloSlider.value    = t.nodeHaloSize;
    document.getElementById('node-halo-value').textContent    = t.nodeHaloSize;
    nodeShapeColorEl.value  = t.nodeShapeColor;
    nodeShapeBgEl.value     = t.nodeShapeBgColor;
    // Label shapes fall back to the theme's tip/node shape colours when not
    // explicitly set (built-in themes don't define them).
    tipLabelShapeColorEl.value  = t.tipLabelShapeColor  || t.tipShapeColor;
    tipLabelShape2ColorEl.value = t.tipLabelShape2Color || t.nodeShapeColor;
    if (t.axisColor) {
      axisColorEl.value = t.axisColor;
    }
    nodeBarsColorEl.value = t.nodeBarsColor ?? DEFAULT_SETTINGS.nodeBarsColor;
    // legendTextColor falls back to labelColor for themes that don't define it explicitly.
    const legendColor = t.legendTextColor || t.labelColor;
    legendTextColorEl.value = legendColor;
    fontFamilyEl.value = t.fontFamily ?? DEFAULT_SETTINGS.fontFamily;
    if (renderer) {
      renderer.setSettings(_buildRendererSettings());
      if (t.axisColor) axisRenderer.setColor(t.axisColor);
      legendRenderer.setTextColor(legendColor);
      axisRenderer.setFontFamily(_resolveTypeface(axisFontFamilyEl.value));
      legendRenderer.setFontFamily(_resolveTypeface(legendFontFamilyEl.value));
      // Invalidate axis hash so next update redraws
      axisRenderer._lastHash = '';
    }
    themeSelect.value = name;
    _syncThemeButtons();
    saveSettings();
    _syncControlVisibility();
  }

  /** Mark the theme selector as Custom when the user manually edits any visual control. */
  function _markCustomTheme() {
    if (themeSelect.value !== 'custom') {
      themeSelect.value = 'custom';
      saveSettings();
    }
    _syncThemeButtons();
  }

  btnResetSettings.addEventListener('click', applyDefaults);
  btnStoreTheme.addEventListener('click', storeTheme);
  btnDefaultTheme.addEventListener('click', setDefaultTheme);
  btnRemoveTheme.addEventListener('click', removeTheme);

  // Bootstrap theme registry and select options before restoring saved state.
  loadUserThemes();
  _populateThemeSelect();
  _syncThemeButtons();

  // Load stored settings and immediately hydrate the visual DOM controls.
  const _saved = loadSettings();
  // Restore per-annotation palette choices.
  if (_saved.annotationPalettes) {
    for (const [k, v] of Object.entries(_saved.annotationPalettes)) annotationPalettes.set(k, v);
  }
  if (_saved.canvasBgColor)        canvasBgColorEl.value    = _saved.canvasBgColor;
  if (_saved.branchColor)          branchColorEl.value      = _saved.branchColor;
  if (_saved.branchWidth    != null) {
    branchWidthSlider.value = _saved.branchWidth;
    document.getElementById('branch-width-value').textContent = _saved.branchWidth;
  }
  if (_saved.fontSize       != null) {
    fontSlider.value = _saved.fontSize;
    document.getElementById('font-size-value').textContent = _saved.fontSize;
  }
  if (_saved.fontFamily)           fontFamilyEl.value       = _saved.fontFamily;
  if (_saved.labelColor)           labelColorEl.value       = _saved.labelColor;
  if (_saved.selectedLabelStyle)   selectedLabelStyleEl.value = _saved.selectedLabelStyle;
  if (_saved.selectedTipStrokeColor)    selectedTipStrokeEl.value  = _saved.selectedTipStrokeColor;
  if (_saved.selectedNodeStrokeColor)        selectedNodeStrokeEl.value      = _saved.selectedNodeStrokeColor;
  if (_saved.tipHoverFillColor)        tipHoverFillEl.value      = _saved.tipHoverFillColor;
  if (_saved.nodeHoverFillColor)   nodeHoverFillEl.value = _saved.nodeHoverFillColor;
  if (_saved.selectedTipFillColor)  selectedTipFillEl.value = _saved.selectedTipFillColor;
  if (_saved.selectedTipGrowthFactor != null) {
    selectedTipGrowthSlider.value = _saved.selectedTipGrowthFactor;
    document.getElementById('selected-tip-growth-value').textContent = _saved.selectedTipGrowthFactor;
  }
  if (_saved.selectedTipMinSize != null) {
    selectedTipMinSizeSlider.value = _saved.selectedTipMinSize;
    document.getElementById('selected-tip-min-size-value').textContent = _saved.selectedTipMinSize;
  }
  if (_saved.selectedTipFillOpacity != null) {
    selectedTipFillOpacitySlider.value = _saved.selectedTipFillOpacity;
    document.getElementById('selected-tip-fill-opacity-value').textContent = _saved.selectedTipFillOpacity;
  }
  if (_saved.selectedTipStrokeWidth != null) {
    selectedTipStrokeWidthSlider.value = _saved.selectedTipStrokeWidth;
    document.getElementById('selected-tip-stroke-width-value').textContent = _saved.selectedTipStrokeWidth;
  }
  if (_saved.selectedTipStrokeOpacity != null) {
    selectedTipStrokeOpacitySlider.value = _saved.selectedTipStrokeOpacity;
    document.getElementById('selected-tip-stroke-opacity-value').textContent = _saved.selectedTipStrokeOpacity;
  }
  if (_saved.selectedNodeFillColor) selectedNodeFillEl.value = _saved.selectedNodeFillColor;
  if (_saved.selectedNodeGrowthFactor != null) {
    selectedNodeGrowthSlider.value = _saved.selectedNodeGrowthFactor;
    document.getElementById('selected-node-growth-value').textContent = _saved.selectedNodeGrowthFactor;
  }
  if (_saved.selectedNodeMinSize != null) {
    selectedNodeMinSizeSlider.value = _saved.selectedNodeMinSize;
    document.getElementById('selected-node-min-size-value').textContent = _saved.selectedNodeMinSize;
  }
  if (_saved.selectedNodeFillOpacity != null) {
    selectedNodeFillOpacitySlider.value = _saved.selectedNodeFillOpacity;
    document.getElementById('selected-node-fill-opacity-value').textContent = _saved.selectedNodeFillOpacity;
  }
  if (_saved.selectedNodeStrokeWidth != null) {
    selectedNodeStrokeWidthSlider.value = _saved.selectedNodeStrokeWidth;
    document.getElementById('selected-node-stroke-width-value').textContent = _saved.selectedNodeStrokeWidth;
  }
  if (_saved.selectedNodeStrokeOpacity != null) {
    selectedNodeStrokeOpacitySlider.value = _saved.selectedNodeStrokeOpacity;
    document.getElementById('selected-node-stroke-opacity-value').textContent = _saved.selectedNodeStrokeOpacity;
  }
  if (_saved.tipHoverStrokeColor)   tipHoverStrokeEl.value = _saved.tipHoverStrokeColor;
  if (_saved.tipHoverGrowthFactor != null) {
    tipHoverGrowthSlider.value = _saved.tipHoverGrowthFactor;
    document.getElementById('tip-hover-growth-value').textContent = _saved.tipHoverGrowthFactor;
  }
  if (_saved.tipHoverMinSize != null) {
    tipHoverMinSizeSlider.value = _saved.tipHoverMinSize;
    document.getElementById('tip-hover-min-size-value').textContent = _saved.tipHoverMinSize;
  }
  if (_saved.tipHoverFillOpacity != null) {
    tipHoverFillOpacitySlider.value = _saved.tipHoverFillOpacity;
    document.getElementById('tip-hover-fill-opacity-value').textContent = _saved.tipHoverFillOpacity;
  }
  if (_saved.tipHoverStrokeWidth != null) {
    tipHoverStrokeWidthSlider.value = _saved.tipHoverStrokeWidth;
    document.getElementById('tip-hover-stroke-width-value').textContent = _saved.tipHoverStrokeWidth;
  }
  if (_saved.tipHoverStrokeOpacity != null) {
    tipHoverStrokeOpacitySlider.value = _saved.tipHoverStrokeOpacity;
    document.getElementById('tip-hover-stroke-opacity-value').textContent = _saved.tipHoverStrokeOpacity;
  }
  if (_saved.nodeHoverStrokeColor)  nodeHoverStrokeEl.value = _saved.nodeHoverStrokeColor;
  if (_saved.nodeHoverGrowthFactor != null) {
    nodeHoverGrowthSlider.value = _saved.nodeHoverGrowthFactor;
    document.getElementById('node-hover-growth-value').textContent = _saved.nodeHoverGrowthFactor;
  }
  if (_saved.nodeHoverMinSize != null) {
    nodeHoverMinSizeSlider.value = _saved.nodeHoverMinSize;
    document.getElementById('node-hover-min-size-value').textContent = _saved.nodeHoverMinSize;
  }
  if (_saved.nodeHoverFillOpacity != null) {
    nodeHoverFillOpacitySlider.value = _saved.nodeHoverFillOpacity;
    document.getElementById('node-hover-fill-opacity-value').textContent = _saved.nodeHoverFillOpacity;
  }
  if (_saved.nodeHoverStrokeWidth != null) {
    nodeHoverStrokeWidthSlider.value = _saved.nodeHoverStrokeWidth;
    document.getElementById('node-hover-stroke-width-value').textContent = _saved.nodeHoverStrokeWidth;
  }
  if (_saved.nodeHoverStrokeOpacity != null) {
    nodeHoverStrokeOpacitySlider.value = _saved.nodeHoverStrokeOpacity;
    document.getElementById('node-hover-stroke-opacity-value').textContent = _saved.nodeHoverStrokeOpacity;
  }
  if (_saved.tipSize        != null) {
    tipSlider.value = _saved.tipSize;
    document.getElementById('tip-size-value').textContent = _saved.tipSize;
  }
  if (_saved.tipHaloSize    != null) {
    tipHaloSlider.value = _saved.tipHaloSize;
    document.getElementById('tip-halo-value').textContent = _saved.tipHaloSize;
  }
  if (_saved.tipShapeColor)        tipShapeColorEl.value    = _saved.tipShapeColor;
  if (_saved.tipShapeBgColor)      tipShapeBgEl.value       = _saved.tipShapeBgColor;
  if (_saved.tipLabelShape)        tipLabelShapeEl.value        = _saved.tipLabelShape;
  if (_saved.tipLabelShapeColor)   tipLabelShapeColorEl.value   = _saved.tipLabelShapeColor;
  if (_saved.tipLabelShapeMarginLeft != null) {
    tipLabelShapeMarginLeftSlider.value = _saved.tipLabelShapeMarginLeft;
    document.getElementById('tip-label-shape-margin-left-value').textContent = _saved.tipLabelShapeMarginLeft;
  }
  if (_saved.tipLabelShapeMarginRight != null) {
    tipLabelShapeMarginRightSlider.value = _saved.tipLabelShapeMarginRight;
    document.getElementById('tip-label-shape-margin-right-value').textContent = _saved.tipLabelShapeMarginRight;
  }
  if (_saved.tipLabelShape2)       tipLabelShape2El.value       = _saved.tipLabelShape2;
  if (_saved.tipLabelShape2Color)  tipLabelShape2ColorEl.value  = _saved.tipLabelShape2Color;
  if (_saved.tipLabelShape2MarginRight != null) {
    tipLabelShape2MarginRightSlider.value = _saved.tipLabelShape2MarginRight;
    document.getElementById('tip-label-shape-2-margin-right-value').textContent = _saved.tipLabelShape2MarginRight;
  }
  if (_saved.tipLabelShapeSize != null) {
    tipLabelShapeSizeSlider.value = _saved.tipLabelShapeSize;
    document.getElementById('tip-label-shape-size-value').textContent = _saved.tipLabelShapeSize;
  }
  if (_saved.tipLabelShape2Size != null) {
    tipLabelShape2SizeSlider.value = _saved.tipLabelShape2Size;
    document.getElementById('tip-label-shape-2-size-value').textContent = _saved.tipLabelShape2Size;
  }
  if (_saved.nodeSize       != null) {
    nodeSlider.value = _saved.nodeSize;
    document.getElementById('node-size-value').textContent = _saved.nodeSize;
  }
  if (_saved.nodeHaloSize   != null) {
    nodeHaloSlider.value = _saved.nodeHaloSize;
    document.getElementById('node-halo-value').textContent = _saved.nodeHaloSize;
  }
  if (_saved.nodeShapeColor)       nodeShapeColorEl.value   = _saved.nodeShapeColor;
  if (_saved.nodeShapeBgColor)     nodeShapeBgEl.value      = _saved.nodeShapeBgColor;
  if (_saved.axisColor)            axisColorEl.value        = _saved.axisColor;
  if (_saved.axisFontFamily)       axisFontFamilyEl.value   = _saved.axisFontFamily;
  if (_saved.axisFontSize != null) {
    axisFontSizeSlider.value = _saved.axisFontSize;
    document.getElementById('axis-font-size-value').textContent = _saved.axisFontSize;
  }
  if (_saved.axisLineWidth != null) {
    axisLineWidthSlider.value = _saved.axisLineWidth;
    document.getElementById('axis-line-width-value').textContent = _saved.axisLineWidth;
  }
  if (_saved.legendShow)           legendShowEl.value       = _saved.legendShow;
  if (_saved.legendTextColor)      legendTextColorEl.value  = _saved.legendTextColor;
  if (_saved.legendFontSize != null) {
    legendFontSizeSlider.value = _saved.legendFontSize;
    document.getElementById('legend-font-size-value').textContent = _saved.legendFontSize;
  }
  if (_saved.legendHeightPct != null) {
    legendHeightPctSlider.value = _saved.legendHeightPct;
    document.getElementById('legend-height-pct-value').textContent = _saved.legendHeightPct + '%';
  }
  if (_saved.legendFontFamily)     legendFontFamilyEl.value = _saved.legendFontFamily;
  if (_saved.tipLabelAlign)        tipLabelAlignEl.value    = _saved.tipLabelAlign;
  if (_saved.nodeLabelPosition)    nodeLabelPositionEl.value = _saved.nodeLabelPosition;
  if (_saved.nodeLabelFontSize != null) {
    nodeLabelFontSizeSlider.value = _saved.nodeLabelFontSize;
    document.getElementById('node-label-font-size-value').textContent = _saved.nodeLabelFontSize;
  }
  if (_saved.nodeLabelColor)       nodeLabelColorEl.value   = _saved.nodeLabelColor;
  if (_saved.nodeLabelSpacing != null) {
    nodeLabelSpacingSlider.value = _saved.nodeLabelSpacing;
    document.getElementById('node-label-spacing-value').textContent = _saved.nodeLabelSpacing;
  }
  // Restore saved theme name (or default to Artic if no saved settings)
  themeSelect.value = _saved.theme || 'Artic';

  // Size canvas to container before creating renderer
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = container.clientWidth  + 'px';
  canvas.style.height = container.clientHeight + 'px';
  canvas.width  = container.clientWidth  * dpr;
  canvas.height = container.clientHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderer = new TreeRenderer(canvas, _buildRendererSettings());

  renderer._onStatsChange = (stats) => {
    const el = document.getElementById('status-stats');
    if (!el) return;
    if (!stats) { el.innerHTML = ''; return; }
    el.innerHTML =
      `<span class="st-lbl">Tips\u2009</span><span class="st-val">${stats.tipCount}</span>` +
      `<span class="st-sep"> | </span>` +
      `<span class="st-lbl">Dist\u2009</span><span class="st-val">${stats.distance.toFixed(5)}</span>` +
      `<span class="st-sep"> | </span>` +
      `<span class="st-lbl">Height\u2009</span><span class="st-val">${stats.height.toFixed(5)}</span>` +
      `<span class="st-sep"> | </span>` +
      `<span class="st-lbl">Length\u2009</span><span class="st-val">${stats.totalLength.toFixed(5)}</span>`;
  };

  // ── Legend renderer ────────────────────────────────────────────────────────
  // Must be created before applyTheme() (which calls legendRenderer.setTextColor).
  const legendRenderer = new LegendRenderer(
    legendLeftCanvas, legendRightCanvas,
    legend2LeftCanvas, legend2RightCanvas,
    {
      fontSize:    parseInt(legendFontSizeSlider.value),
      textColor:   legendTextColorEl.value,
      bgColor:     canvasBgColorEl.value,
      padding:     parseInt(DEFAULT_SETTINGS.legendPadding),
      heightPct:   parseInt(DEFAULT_SETTINGS.legendHeightPct),
      heightPct2:  parseInt(DEFAULT_SETTINGS.legendHeightPct2),
    },
  );
  renderer.setLegendRenderer(legendRenderer);

  // Clicking a categorical legend entry selects all tips with that annotation value.
  legendRenderer.onCategoryClick = (value) => {
    if (!renderer.nodeMap) return;
    const key = legendRenderer._annotation;
    if (!key) return;
    const ids = [];
    for (const [id, n] of renderer.nodeMap) {
      if (!n.isTip) continue;
      if (n.annotations?.[key] === value) ids.push(id);
    }
    renderer._selectedTipIds = new Set(ids);
    renderer._mrcaNodeId = null;
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(ids.length > 0);
    renderer._dirty = true;
  };
  // Same for legend 2 categorical entries.
  legendRenderer.onCategoryClick2 = (value) => {
    if (!renderer.nodeMap) return;
    const key2 = legendRenderer._annotation2;
    if (!key2) return;
    const ids = [];
    for (const [id, n] of renderer.nodeMap) {
      if (!n.isTip) continue;
      if (n.annotations?.[key2] === value) ids.push(id);
    }
    renderer._selectedTipIds = new Set(ids);
    renderer._mrcaNodeId = null;
    if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(ids.length > 0);
    renderer._dirty = true;
  };

  // ── Axis renderer ─────────────────────────────────────────────────────────
  // Must be created before applyTheme() is called below (applyTheme references
  // axisRenderer, and const bindings have TDZ — calling the function before this
  // line would throw "Cannot access 'axisRenderer' before initialization").
  const axisRenderer = new AxisRenderer(axisCanvas, {
    axisColor:  axisColorEl.value,
    fontSize:   parseInt(axisFontSizeSlider.value),
    lineWidth:  parseFloat(axisLineWidthSlider.value),
    paddingTop: parseInt(DEFAULT_SETTINGS.axisPaddingTop),
  });

  // Shared time-calibration state for the current tree.
  // setAnchor() is called when the tree is loaded or the annotation selection changes.
  // axisRenderer.setCalibration() is called by applyAxis() to activate it on the axis.
  calibration = new TreeCalibration();

  // Apply stored visual settings to the renderer immediately.
  // If no saved theme exists yet, apply the default 'Artic' theme.
  if (!_saved.theme) {
    applyTheme(defaultTheme);
  } else {
    // DOM controls were already hydrated from _saved above; just sync the renderer.
    renderer.setSettings(_buildRendererSettings(), false);
    _syncControlVisibility();
  }

  // Always sync legend/axis font families after renderer init — applyTheme does
  // this when called, but the else branch above skips applyTheme entirely.
  legendRenderer.setFontFamily(_resolveTypeface(legendFontFamilyEl.value));
  axisRenderer.setFontFamily(_resolveTypeface(axisFontFamilyEl.value));

  renderer._onViewChange = (scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr) => {
    axisRenderer.update(scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr);
    // Fill any subpixel gap between the tree canvas and axis canvas with the
    // canvas background colour rather than the page background.
    _syncCanvasWrapperBg(bgColor);
  };

  // Update axis time span whenever navigation drills into or out of a subtree.
  // Reads renderer._globalHeightMap directly so the values are always current,
  // even after rerooting (which rebuilds the map via _buildGlobalHeightMap).
  renderer._onLayoutChange = (maxX, viewSubtreeRootId) => {
    if (!_axisIsTimedTree && !(axisShowEl.value === 'time' && axisDateAnnotEl.value)) return;
    const hMap = renderer._globalHeightMap;
    const viewNodes = renderer.nodes || [];
    // The current layout root (x=0) always has height = maxX of the full-tree layout.
    const rootLayoutNode = viewNodes.find(n => !n.parentId);
    const rootH = rootLayoutNode ? (hMap.get(rootLayoutNode.id) ?? 0) : 0;
    // For subtree navigation, get the global height of the subtree root node.
    const viewRootH = viewSubtreeRootId ? (hMap.get(viewSubtreeRootId) ?? rootH) : rootH;
    // Minimum computed height among visible tips — defines the right axis boundary.
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

  // Hide the initial loading overlay; the Open Tree modal replaces it on startup
  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }

  // ── Modal management ──────────────────────────────────────────────────────

  const modal         = document.getElementById('open-tree-modal');
  const btnModalClose = document.getElementById('btn-modal-close');

  function openModal() {
    setModalError(null);
    setModalLoading(false);
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    // If no tree has been loaded yet, restore the empty-state overlay
    if (!treeLoaded) {
      const es = document.getElementById('empty-state');
      if (es) es.classList.remove('hidden');
    }
  }

  function setModalError(msg) {
    const el = document.getElementById('modal-error');
    if (msg) { el.textContent = msg; el.style.display = 'block'; }
    else      { el.style.display = 'none'; }
  }

  /** Show a simple standalone error dialog with an OK button. */
  function showErrorDialog(msg) {
    const overlay = document.getElementById('error-dialog-overlay');
    document.getElementById('error-dialog-msg').textContent = msg;
    overlay.classList.add('open');
  }

  document.getElementById('error-dialog-ok').addEventListener('click', () => {
    document.getElementById('error-dialog-overlay').classList.remove('open');
  });

  /**
   * Show a confirm dialog with a custom title, message, and button labels.
   * Returns a Promise that resolves true (OK) or false (Cancel).
   * Pressing Escape is treated as Cancel.
   */
  function showConfirmDialog(title, msg, { okLabel = 'OK', cancelLabel = 'Cancel' } = {}) {
    return new Promise(resolve => {
      const overlay   = document.getElementById('confirm-dialog-overlay');
      document.getElementById('confirm-dialog-title').textContent = title;
      document.getElementById('confirm-dialog-msg').textContent   = msg;
      document.getElementById('confirm-dialog-ok').textContent     = okLabel;
      document.getElementById('confirm-dialog-cancel').textContent = cancelLabel;
      overlay.classList.add('open');
      const okBtn     = document.getElementById('confirm-dialog-ok');
      const cancelBtn = document.getElementById('confirm-dialog-cancel');
      function close(result) {
        overlay.classList.remove('open');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey, true);
        resolve(result);
      }
      function onOk()     { close(true);  }
      function onCancel() { close(false); }
      function onKey(e)   { if (e.key === 'Escape') { e.stopPropagation(); close(false); } }
      okBtn.addEventListener('click',     onOk);
      cancelBtn.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKey, true);
    });
  }

  function setModalLoading(on) {
    document.getElementById('modal-loading').style.display = on ? 'block' : 'none';
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
      document.getElementById('tab-panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Close button — always enabled; returns to empty-state if no tree loaded yet
  btnModalClose.addEventListener('click', () => closeModal());

  // ── Unified keyboard handler for all modal overlays ──────────────────────
  // capture:true ensures we intercept before focused elements inside modals can swallow the event
  document.addEventListener('keydown', e => {
    const inTextField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) &&
      !['checkbox', 'radio'].includes(document.activeElement?.type);

    if (e.key === 'Escape') {
      // Close innermost open overlay first.
      if (exportGraphicOverlay.classList.contains('open')) { _closeGraphicsDialog(); return; }
      if (exportOverlay.classList.contains('open'))        { _closeExportDialog();   return; }
      if (document.getElementById('curate-annot-overlay')?.classList.contains('open')) { annotCurator.close(); return; }
      if (document.getElementById('import-annot-overlay')?.classList.contains('open'))  { annotImporter.close(); return; }
      const nodeInfoOv = document.getElementById('node-info-overlay');
      if (nodeInfoOv && nodeInfoOv.classList.contains('open')) { nodeInfoOv.classList.remove('open'); return; }
      if (modal.classList.contains('open'))  { closeModal();           return; }
    }

    if (e.key === 'Enter' && !e.shiftKey && !inTextField) {
      if (exportGraphicOverlay.classList.contains('open')) {
        document.getElementById('expg-download-btn')?.click(); return;
      }
      if (exportOverlay.classList.contains('open')) {
        document.getElementById('exp-download-btn')?.click(); return;
      }
      if (document.getElementById('import-annot-overlay')?.classList.contains('open')) {
        const apply = document.getElementById('imp-apply-btn');
        if (apply) { apply.click(); return; }
        (document.getElementById('imp-close-btn') ||
         document.getElementById('imp-close-err-btn') ||
         document.getElementById('imp-picker-cancel-btn'))?.click();
        return;
      }
      const nodeInfoOv2 = document.getElementById('node-info-overlay');
      if (nodeInfoOv2 && nodeInfoOv2.classList.contains('open')) { nodeInfoOv2.classList.remove('open'); return; }
      if (modal.classList.contains('open'))  { closeModal(); return; }
    }

  }, { capture: true });

  // ── File tab ──────────────────────────────────────────────────────────────

  const dropZone  = document.getElementById('tree-drop-zone');
  const fileInput = document.getElementById('tree-file-input');

  document.getElementById('btn-file-choose').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = '';  // reset so the same file can be re-selected
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

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

  document.getElementById('btn-load-url').addEventListener('click', async () => {
    const url = document.getElementById('tree-url-input').value.trim();
    if (!url) { setModalError('Please enter a URL.'); return; }
    setModalLoading(true);
    setModalError(null);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' – ' + url);
      const text = await resp.text();
      await loadTree(text, url.split('/').pop() || 'tree');
    } catch (err) {
      setModalError(err.message);
      setModalLoading(false);
    }
  });

  // ── Example tab ───────────────────────────────────────────────────────────

  async function loadExampleTree(onError) {
    try {
      const text = await fetchExampleTree();
      await loadTree(text, EXAMPLE_TREE_PATH);
    } catch (err) {
      onError(err.message);
    }
  }

  document.getElementById('btn-load-example').addEventListener('click', () => {
    setModalLoading(true);
    setModalError(null);
    loadExampleTree(msg => { setModalError(msg); setModalLoading(false); });
  });

  // ── Empty-state overlay (shown until first tree load) ──────────────────
  const emptyStateEl = document.getElementById('empty-state');

  function hideEmptyState() { emptyStateEl.classList.add('hidden'); }
  function showEmptyState() { if (!treeLoaded) emptyStateEl.classList.remove('hidden'); }

  document.getElementById('empty-state-open-btn').addEventListener('click', () => pickTreeFile());
  document.getElementById('empty-state-example-btn').addEventListener('click', () => {
    hideEmptyState();
    loadExampleTree(msg => { showEmptyState(); showErrorDialog(msg); });
  });
  emptyStateEl.addEventListener('dragover', e => {
    e.preventDefault();
    emptyStateEl.classList.add('drag-over');
  });
  emptyStateEl.addEventListener('dragleave', e => {
    if (!emptyStateEl.contains(e.relatedTarget)) emptyStateEl.classList.remove('drag-over');
  });
  emptyStateEl.addEventListener('drop', e => {
    e.preventDefault();
    emptyStateEl.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) { openModal(); handleFile(file); }
  });

  // ── Import Annotations ──────────────────────────────────────────────────
  const annotImporter = createAnnotImporter({
    getGraph: () => graph,
    onApply: (g) => {
      _refreshAnnotationUIs(g.annotationSchema);
      renderer.setAnnotationSchema(g.annotationSchema);
      axisRenderer.setHeightFormatter(g.annotationSchema.get('height')?.fmt ?? null);
      renderer.setTipColourBy(tipColourBy.value      || null);
      renderer.setNodeColourBy(nodeColourBy.value    || null);
      renderer.setLabelColourBy(labelColourBy.value  || null);
      renderer.setTipLabelShapeColourBy(tipLabelShapeColourBy.value || null);
      renderer.setTipLabelShape2ColourBy(tipLabelShape2ColourBy.value || null);
      renderer.setTipLabelsOff(tipLabelShow.value === 'off');
      if (tipLabelShow.value !== 'off') renderer.setTipLabelAnnotation(tipLabelShow.value === 'names' ? null : tipLabelShow.value);
      applyLegend();
      renderer._dirty = true;
    },
  });
  btnImportAnnot.addEventListener('click', () => commands.execute('import-annot'));

  // ── Curate Annotations ───────────────────────────────────────────────────
  const annotCurator = createAnnotCurator({
    getGraph: () => graph,
    onApply: (schema) => {
      _refreshAnnotationUIs(schema);
      renderer.setAnnotationSchema(schema);
      axisRenderer.setHeightFormatter(schema.get('height')?.fmt ?? null);
      applyLegend();
      renderer._dirty = true;
    },
  });
  btnCurateAnnot.addEventListener('click', () => commands.execute('curate-annot'));

  document.getElementById('export-tree-close').addEventListener('click', _closeExportDialog);
  btnExportTree.addEventListener('click', _openExportDialog);

  /** HTML-escape a string for safe insertion. */
  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Export Tree ────────────────────────────────────────────────────────────────
  // Serialisation logic (newickEsc, fmtLen, fmtAnnot, branchLen, newickNode,
  // graphToNewick) lives in treeio.js and is imported at the top of this file.

  // Export dialog DOM refs
  const exportOverlay  = document.getElementById('export-tree-overlay');
  const exportBody     = document.getElementById('export-tree-body');
  const exportFooter   = document.getElementById('export-tree-footer');
  const exportTitleEl  = document.getElementById('export-tree-title');

  // Optional save-handler injected by platform adapters (e.g. Tauri).
  // When set, the "Download" button becomes "Save" and calls this function
  // with { content, filename, mimeType, filterName, extensions } instead of
  // triggering a browser download.
  let _exportSaveHandler   = null;
  let _graphicsSaveHandler = null;

  function _openExportDialog() {
    if (!graph) return;
    exportOverlay.classList.add('open');
    _buildExportDialog();
  }

  function _closeExportDialog() {
    exportOverlay.classList.remove('open');
  }

  function _buildExportDialog() {
    const hasSubtree = !!renderer._viewSubtreeRootId;
    const schema     = graph ? graph.annotationSchema : new Map();
    const annotKeys  = schema ? [...schema.keys()] : [];

    exportTitleEl.innerHTML = '<i class="bi bi-file-earmark-arrow-down me-2"></i>Export Tree';

    exportBody.innerHTML = `
      <div class="exp-section">
        <span class="exp-section-label">Format</span>
        <div class="exp-radio-group">
          <label class="exp-radio-opt"><input type="radio" name="exp-format" value="nexus" checked>&nbsp;NEXUS <span style="color:var(--bs-secondary-color);font-size:0.78rem">(.nexus)</span></label>
          <label class="exp-radio-opt"><input type="radio" name="exp-format" value="newick">&nbsp;Newick <span style="color:var(--bs-secondary-color);font-size:0.78rem">(.nwk)</span></label>
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
      <div class="exp-section">
        <span class="exp-section-label" style="display:flex;align-items:center;justify-content:space-between;">
          <span>Annotations to include</span>
          <span style="display:flex;gap:0.3rem">
            <button id="exp-all-btn"  class="btn btn-sm btn-outline-secondary" style="font-size:0.7rem;padding:1px 8px;line-height:1.4">All</button>
            <button id="exp-none-btn" class="btn btn-sm btn-outline-secondary" style="font-size:0.7rem;padding:1px 8px;line-height:1.4">None</button>
          </span>
        </span>
        <div class="imp-col-grid" id="exp-annot-grid" style="margin-top:0.35rem">
          ${annotKeys.map(k => `
            <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.82rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              <input type="checkbox" class="exp-annot-cb" value="${_esc(k)}" checked>
              <code style="font-size:0.78rem;background:#02292e;padding:0 3px;border-radius:3px">${_esc(k)}</code>
            </label>`).join('')}
        </div>
      </div>` : ''}`;

    exportFooter.innerHTML = `
      <button id="exp-cancel-btn"   class="btn btn-sm btn-secondary">Cancel</button>
      <button id="exp-download-btn" class="btn btn-sm btn-primary"><i class="bi bi-${_exportSaveHandler ? 'folder-check' : 'download'} me-1"></i>${_exportSaveHandler ? 'Export' : 'Download'}</button>`;

    document.getElementById('exp-cancel-btn').addEventListener('click', _closeExportDialog);
    document.getElementById('exp-download-btn').addEventListener('click', _doExport);

    // Always wire up the format radios to toggle the Store-settings row,
    // regardless of whether annotations are present.
    document.querySelectorAll('input[name="exp-format"]').forEach(radio =>
      radio.addEventListener('change', () => {
        const settingsRow = document.getElementById('exp-settings-row');
        if (settingsRow) settingsRow.style.display =
          document.querySelector('input[name="exp-format"]:checked')?.value === 'newick' ? 'none' : '';
      }));

    if (annotKeys.length > 0) {
      const annotGrid    = document.getElementById('exp-annot-grid');
      const allCbs       = () => annotGrid.querySelectorAll('.exp-annot-cb');
      const isNewick     = () => document.querySelector('input[name="exp-format"]:checked')?.value === 'newick';

      const _newickWarning = `
        <div id="exp-newick-warn" style="margin-top:0.5rem;padding:0.4rem 0.6rem;border-radius:4px;background:rgba(203,75,22,0.15);border:1px solid rgba(203,75,22,0.45);font-size:0.8rem;color:#e07040;display:flex;align-items:flex-start;gap:0.4rem">
          <i class="bi bi-exclamation-triangle-fill" style="flex-shrink:0;margin-top:1px"></i>
          <span>Annotations are not part of the Newick format and may be incompatible with some software.</span>
        </div>`;

      const _syncAnnotSection = () => {
        const nwk = isNewick();
        const settingsRow = document.getElementById('exp-settings-row');
        if (nwk) {
          // Uncheck all annotation checkboxes but leave them enabled.
          allCbs().forEach(cb => { cb.checked = false; });
          document.getElementById('exp-newick-warn')?.remove();
          // Hide "store settings" — not applicable to Newick.
          if (settingsRow) settingsRow.style.display = 'none';
        } else {
          // Switching back to NEXUS: re-check all and remove warning.
          allCbs().forEach(cb => { cb.checked = true; });
          document.getElementById('exp-newick-warn')?.remove();
          if (settingsRow) settingsRow.style.display = '';
        }
      };

      // Format radio change → sync annotations.
      document.querySelectorAll('input[name="exp-format"]').forEach(radio =>
        radio.addEventListener('change', _syncAnnotSection));

      // Individual checkbox re-checked while Newick is active → show warning.
      annotGrid.addEventListener('change', e => {
        if (!isNewick() || !e.target.matches('.exp-annot-cb')) return;
        if (!document.getElementById('exp-newick-warn')) {
          annotGrid.insertAdjacentHTML('afterend', _newickWarning);
        }
      });

      document.getElementById('exp-all-btn').addEventListener('click', () => {
        allCbs().forEach(cb => { cb.checked = true; });
        if (isNewick() && !document.getElementById('exp-newick-warn')) {
          annotGrid.insertAdjacentHTML('afterend', _newickWarning);
        }
      });
      document.getElementById('exp-none-btn').addEventListener('click', () => {
        allCbs().forEach(cb => { cb.checked = false; });
        document.getElementById('exp-newick-warn')?.remove();
      });
    }
  }

  function _doExport() {
    const format      = document.querySelector('input[name="exp-format"]:checked')?.value || 'nexus';
    const scope       = document.querySelector('input[name="exp-scope"]:checked')?.value  || 'full';
    const annotKeys   = [...document.querySelectorAll('#exp-annot-grid .exp-annot-cb:checked')].map(cb => cb.value);
    const storeSettings = format === 'nexus' && document.getElementById('exp-store-settings')?.checked;
    const subtreeId   = scope === 'subtree' ? renderer._viewSubtreeRootId : null;
    const newick      = graphToNewick(graph, subtreeId, annotKeys);
    if (!newick) return;

    let content, ext;
    if (format === 'nexus') {
      const rootedTag    = annotKeys.length > 0 ? '[&R] ' : '';
      const settingsLine = storeSettings
        ? `\t[peartree=${JSON.stringify(_buildSettingsSnapshot())}]\n`
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
      const blob = new Blob([content], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `tree.${ext}` });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    _closeExportDialog();
  }

  const btnExportGraphic   = document.getElementById('btn-export-graphic');
  const exportGraphicOverlay = document.getElementById('export-graphic-overlay');
  const exportGraphicBody    = document.getElementById('export-graphic-body');
  const exportGraphicFooter  = document.getElementById('export-graphic-footer');

  document.getElementById('export-graphic-close').addEventListener('click', _closeGraphicsDialog);
  btnExportGraphic.addEventListener('click', _openGraphicsDialog);

  function _openGraphicsDialog() {
    if (!graph) return;
    exportGraphicOverlay.classList.add('open');
    _buildGraphicsDialog();
  }

  function _closeGraphicsDialog() {
    exportGraphicOverlay.classList.remove('open');
  }

  function _buildGraphicsDialog() {
    const { totalW, totalH } = viewportDims({ canvas, axisCanvas, legendLeftCanvas, legendRightCanvas });
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
      const { totalW, totalH, axH, axVisible } = viewportDims({ canvas, axisCanvas, legendLeftCanvas, legendRightCanvas });
      const isFull = document.querySelector('input[name="expg-view"]:checked')?.value === 'full';
      const ph = isFull
        ? Math.round((renderer.paddingTop + renderer.paddingBottom +
            (renderer.maxY + 1) * renderer.scaleY + (axVisible ? axH : 0)) * 2)
        : Math.round(totalH * 2);
      const pw = Math.round(totalW * 2);
      const p = document.querySelector('#expg-png-opts p');
      if (p) p.textContent =
        `Output size: ${pw} × ${ph} px (2× ${isFull ? 'full tree height' : 'current viewport'})`;
    };
    document.querySelectorAll('input[name="expg-fmt"]').forEach(r => r.addEventListener('change', () => {
      const isPng = document.querySelector('input[name="expg-fmt"]:checked')?.value === 'png';
      document.getElementById('expg-png-opts').style.display = isPng ? 'block' : 'none';
      document.getElementById('expg-ext-hint').textContent = isPng ? '.png' : '.svg';
      if (isPng) _updateExpgHint();
    }));
    document.querySelectorAll('input[name="expg-view"]').forEach(r => r.addEventListener('change', _updateExpgHint));
    document.getElementById('expg-cancel-btn').addEventListener('click',   _closeGraphicsDialog);
    document.getElementById('expg-download-btn').addEventListener('click', _doGraphicsExport);
  }

  function _doGraphicsExport() {
    const fmt        = document.querySelector('input[name="expg-fmt"]:checked')?.value || 'svg';
    const filename   = (document.getElementById('expg-filename')?.value.trim() || 'tree');
    const fullTree   = document.querySelector('input[name="expg-view"]:checked')?.value === 'full';
    const transparent = !(document.getElementById('expg-bg')?.checked ?? true);

    if (fmt === 'png') {
      const { totalW, totalH, axH, axVisible } = viewportDims({ canvas, axisCanvas, legendLeftCanvas, legendRightCanvas });
      const targetW = Math.round(totalW * 2);
      const targetH = fullTree
        ? Math.round((renderer.paddingTop + renderer.paddingBottom +
            (renderer.maxY + 1) * renderer.scaleY + (axVisible ? axH : 0)) * 2)
        : Math.round(totalH * 2);

      compositeViewPng({ renderer, canvas, axisCanvas, legendLeftCanvas, legendRightCanvas, axisRenderer }, targetW, targetH, fullTree, transparent).convertToBlob({ type: 'image/png' }).then(async blob => {
        if (_graphicsSaveHandler) {
          const arrayBuf = await blob.arrayBuffer();
          const bytes    = new Uint8Array(arrayBuf);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          _graphicsSaveHandler({
            contentBase64: btoa(binary),
            base64:        true,
            filename:      `${filename}.png`,
            mimeType:      'image/png',
            filterName:    'PNG images',
            extensions:    ['png'],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a   = Object.assign(document.createElement('a'), { href: url, download: `${filename}.png` });
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    } else {
      const svgStr = buildGraphicSVG({ renderer, legendRenderer, canvas, axisCanvas, legendLeftCanvas, legendRightCanvas, axisRenderer }, fullTree, transparent);
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
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: `${filename}.svg` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
    _closeGraphicsDialog();
  }


  /** Show/hide a decimal-places row based on whether the chosen label annotation is numeric. */
  function _updateLabelDpRow(rowEl, annotKey, schema) {
    if (!rowEl) return;
    const SYNTHETIC = [CAL_DATE_KEY, CAL_DATE_HPD_KEY, CAL_DATE_HPD_ONLY_KEY];
    const dt = schema?.get(annotKey)?.dataType;
    const isNumeric = annotKey && annotKey !== 'names' && annotKey !== '' &&
                      !SYNTHETIC.includes(annotKey) &&
                      ['real', 'integer', 'proportion', 'percentage'].includes(dt);
    rowEl.style.display = isNumeric ? '' : 'none';
  }

  /** Repopulate annotation dropdowns (tipColourBy, nodeColourBy, legendAnnotEl) after schema change. */
  function _refreshAnnotationUIs(schema) {
    // filter: 'tips' → onTips, 'nodes' → onNodes, 'all' → no filter
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
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
      }
      sel.disabled = false;
      // Restore previous selection if still available; legend falls back to '' (none), colour-by to user_colour.
      sel.value = [...sel.options].some(o => o.value === prev) ? prev
                  : (isLegend ? '' : 'user_colour');
    }
    repopulate(tipColourBy,          { filter: 'tips'  });
    repopulate(nodeColourBy,         { filter: 'nodes' });
    repopulate(labelColourBy,        { filter: 'tips'  });
    repopulate(tipLabelShapeColourBy, { filter: 'tips' });
    repopulate(tipLabelShape2ColourBy, { filter: 'tips' });
    repopulate(legendAnnotEl,        { isLegend: true  });
    repopulate(legend2AnnotEl,       { isLegend: true  });
    // Tip label show: option[0]='off', option[1]='names', then dynamic annotations.
    {
      const prev = tipLabelShow.value;
      // Remove dynamic options only — keep the two static ones (off, names).
      while (tipLabelShow.options.length > 2) tipLabelShow.remove(2);
      for (const [name, def] of schema) {
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        if (!def.onTips) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        tipLabelShow.appendChild(opt);
      }
      // Synthetic calendar-date options (only when a date calibration is active)
      if (calibration.isActive) {
        const _optCal = document.createElement('option');
        _optCal.value = CAL_DATE_KEY; _optCal.textContent = 'Calendar date';
        tipLabelShow.appendChild(_optCal);
        if (schema.get('height')?.group?.hpd) {
          const _optHpd = document.createElement('option');
          _optHpd.value = CAL_DATE_HPD_KEY; _optHpd.textContent = 'Calendar date + HPDs';
          tipLabelShow.appendChild(_optHpd);
          const _optHpdOnly = document.createElement('option');
          _optHpdOnly.value = CAL_DATE_HPD_ONLY_KEY; _optHpdOnly.textContent = 'Calendar date HPDs';
          tipLabelShow.appendChild(_optHpdOnly);
        }
      }
      tipLabelShow.disabled = false;
      tipLabelShow.value = [...tipLabelShow.options].some(o => o.value === prev) ? prev : 'names';
      tipLabelControlsEl.style.display = tipLabelShow.value === 'off' ? 'none' : '';
      if (renderer) {
        renderer.setTipLabelsOff(tipLabelShow.value === 'off');
        if (tipLabelShow.value !== 'off') renderer.setTipLabelAnnotation(tipLabelShow.value === 'names' ? null : tipLabelShow.value);
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
        opt.value = name; opt.textContent = name;
        nodeLabelShowEl.appendChild(opt);
      }
      // Synthetic calendar-date options (only when a date calibration is active)
      if (calibration.isActive) {
        const _optCal = document.createElement('option');
        _optCal.value = CAL_DATE_KEY; _optCal.textContent = 'Calendar date';
        nodeLabelShowEl.appendChild(_optCal);
        if (schema.get('height')?.group?.hpd) {
          const _optHpd = document.createElement('option');
          _optHpd.value = CAL_DATE_HPD_KEY; _optHpd.textContent = 'Calendar date + HPDs';
          nodeLabelShowEl.appendChild(_optHpd);
          const _optHpdOnly = document.createElement('option');
          _optHpdOnly.value = CAL_DATE_HPD_ONLY_KEY; _optHpdOnly.textContent = 'Calendar date HPDs';
          nodeLabelShowEl.appendChild(_optHpdOnly);
        }
      }
      nodeLabelShowEl.disabled = false;
      nodeLabelShowEl.value = [...nodeLabelShowEl.options].some(o => o.value === prev) ? prev : '';
      if (renderer) renderer.setNodeLabelAnnotation(nodeLabelShowEl.value || null);
    }
    _syncControlVisibility();
    // Refresh palette selects to match current colour-by selections after annotation schema changes.
    _updatePaletteSelect(tipPaletteSelect,            tipPaletteRow,            tipColourBy.value);
    _updatePaletteSelect(nodePaletteSelect,           nodePaletteRow,           nodeColourBy.value);
    _updatePaletteSelect(labelPaletteSelect,          labelPaletteRow,          labelColourBy.value);
    _updatePaletteSelect(tipLabelShapePaletteSelect,  tipLabelShapePaletteRow,  tipLabelShapeColourBy.value);
    _updatePaletteSelect(tipLabelShape2PaletteSelect, tipLabelShape2PaletteRow, tipLabelShape2ColourBy.value);
    // Sync clear-user-colour button: enabled only when at least one node has been coloured.
    if (btnClearUserColour) {
      commands.setEnabled('tree-clear-colours', schema.has('user_colour'));
    }
    // Show node-bars controls only when the 'height' annotation group (with HPD) is present.
    const heightDef = schema ? schema.get('height') : null;
    const hasNodeBars = !!(heightDef && heightDef.group && heightDef.group.hpd);
    if (nodeBarsControlsEl) nodeBarsControlsEl.style.display = hasNodeBars ? '' : 'none';
    if (nodeBarsUnavailEl)  nodeBarsUnavailEl.style.display  = hasNodeBars ? 'none' : 'block';
    if (!hasNodeBars && nodeBarsShowEl.value === 'on') {
      nodeBarsShowEl.value = 'off';
      if (renderer) { renderer.setSettings(_buildRendererSettings()); renderer._dirty = true; }
    }
    // Show decimal-places row only when a numeric annotation is selected.
    _updateLabelDpRow(tipLabelDpRowEl,  tipLabelShow.value,    schema);
    _updateLabelDpRow(nodeLabelDpRowEl, nodeLabelShowEl.value, schema);
  }

  // ── Tree loading ──────────────────────────────────────────────────────────

  async function loadTree(text, filename) {
    setModalLoading(true);
    setModalError(null);
    _loadedFilename = filename || null;
    // Yield to the browser so the spinner renders before heavy parsing
    await new Promise(r => setTimeout(r, 0));

    try {
      let parsedRoot = null;

      // Try NEXUS first; fall back to bare Newick
      const nexusTrees = parseNexus(text);
      const _fileSettings = nexusTrees.length > 0 ? (nexusTrees[0].peartreeSettings || null) : null;
      if (nexusTrees.length > 0) {
        parsedRoot = nexusTrees[0].root;
      } else {
        const trimmed = text.trim();
        if (trimmed.startsWith('(')) {
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
      // "_node_label" by parseNewick), ask the user what annotation name to use.
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
          const chosen = (
            prompt(
              `This tree has labels on ${labelledNodes.length} internal node(s).\nWhat annotation name should these be stored as?`,
              defaultName
            ) ?? defaultName
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

      // Apply any visual settings embedded in the file immediately, before
      // annotation dropdowns are populated (annotation-dependent settings
      // are handled below after the dropdowns exist).
      if (_fileSettings) _applyVisualSettingsFromFile(_fileSettings);
      _cachedMidpoint = null;
      isExplicitlyRooted = graph.rooted;

      // Show/hide the Select + Reroot toolbar sections based on whether the
      // tree is explicitly rooted. Use a CSS class to avoid WKWebView inline-style issues.
      document.getElementById('reroot-controls').classList.toggle('visible', !isExplicitlyRooted);

      commands.setEnabled('tree-midpoint', !isExplicitlyRooted);
      commands.setEnabled('tree-reroot',   false); // re-enabled on selection by bindControls

      // Populate the "Colour by" dropdowns. user_colour is always the first option.
      const schema = graph.annotationSchema;
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
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
          sel.appendChild(opt);
        }
        sel.disabled = false;
        sel.value = 'user_colour';
      }
      _populateColourBy(tipColourBy,          'tips');
      _populateColourBy(nodeColourBy,         'nodes');
      _populateColourBy(labelColourBy,        'tips');
      _populateColourBy(tipLabelShapeColourBy, 'tips');
      _populateColourBy(tipLabelShape2ColourBy, 'tips');

      // Tip-label-show: option[0]='off', option[1]='names', then dynamic annotations.
      while (tipLabelShow.options.length > 2) tipLabelShow.remove(2);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        if (!def.onTips) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        tipLabelShow.appendChild(opt);
      }
      tipLabelShow.disabled = false;
      tipLabelControlsEl.style.display = tipLabelShow.value === 'off' ? 'none' : '';

      // Node-label-show: first option is '' (none); then all node annotations.
      while (nodeLabelShowEl.options.length > 1) nodeLabelShowEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType === 'list') continue;
        if (def.groupMember) continue;
        if (!def.onNodes) continue;
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        nodeLabelShowEl.appendChild(opt);
      }
      nodeLabelShowEl.disabled = false;

      // Legend select: blank "(none)" first, then annotations (no user_colour).
      while (legendAnnotEl.options.length > 1) legendAnnotEl.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue;
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
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
          opt.value = name; opt.textContent = name;
          legend2AnnotEl.appendChild(opt);
        }
      }
      legend2AnnotEl.value    = '';
      legend2AnnotEl.disabled = schema.size === 0;
      if (btnClearUserColour) {
        commands.setEnabled('tree-clear-colours', schema.has('user_colour'));
      }

      // Annotation-dependent settings:  file-embedded settings take priority over saved prefs.
      const _eff = _fileSettings || _saved;
      const _hasOpt = (sel, key) => key && [...sel.options].some(o => o.value === key);
      tipColourBy.value          = _hasOpt(tipColourBy,          _eff.tipColourBy)           ? _eff.tipColourBy           : 'user_colour';
      nodeColourBy.value         = _hasOpt(nodeColourBy,         _eff.nodeColourBy)          ? _eff.nodeColourBy          : 'user_colour';
      labelColourBy.value        = _hasOpt(labelColourBy,        _eff.labelColourBy)         ? _eff.labelColourBy         : 'user_colour';
      tipLabelShapeColourBy.value = _hasOpt(tipLabelShapeColourBy, _eff.tipLabelShapeColourBy) ? _eff.tipLabelShapeColourBy : 'user_colour';
      tipLabelShape2ColourBy.value = _hasOpt(tipLabelShape2ColourBy, _eff.tipLabelShape2ColourBy) ? _eff.tipLabelShape2ColourBy : 'user_colour';
      legendAnnotEl.value        = _hasOpt(legendAnnotEl,        _eff.legendAnnotation)      ? _eff.legendAnnotation      : '';
      legend2AnnotEl.value       = _hasOpt(legend2AnnotEl,       _eff.legendAnnotation2)     ? _eff.legendAnnotation2     : '';
      tipLabelShow.value  = _hasOpt(tipLabelShow,  _eff.tipLabelShow)     ? _eff.tipLabelShow     : 'names';
      tipLabelControlsEl.style.display = tipLabelShow.value === 'off' ? 'none' : '';
      nodeLabelShowEl.value = _hasOpt(nodeLabelShowEl, _eff.nodeLabelAnnotation) ? _eff.nodeLabelAnnotation : '';
      // Restore node order — only from file-embedded settings, not from saved prefs
      // (order is a per-tree choice and should not persist across different trees).
      if (_fileSettings?.nodeOrder === 'asc' || _fileSettings?.nodeOrder === 'desc') {
        const asc = _fileSettings.nodeOrder === 'asc';
        reorderGraph(graph, asc);
        currentOrder = _fileSettings.nodeOrder;
      }

      // Pass schema to the renderer so it can build colour scales.
      renderer.setAnnotationSchema(schema);
      // Show node-bars controls only when a BEAST 'height' annotation with HPD is present.
      {
        const _hDef = schema ? schema.get('height') : null;
        const _hasNB = !!(_hDef && _hDef.group && _hDef.group.hpd);
        if (nodeBarsControlsEl) nodeBarsControlsEl.style.display = _hasNB ? '' : 'none';
        if (nodeBarsUnavailEl)  nodeBarsUnavailEl.style.display  = _hasNB ? 'none' : 'block';
        if (!_hasNB && nodeBarsShowEl && nodeBarsShowEl.value === 'on') nodeBarsShowEl.value = 'off';
      }
      // Apply any per-annotation palette overrides from file settings first,
      // then from the persistent in-memory map (file settings take priority).
      if (_eff.annotationPalettes) {
        for (const [k, v] of Object.entries(_eff.annotationPalettes)) {
          annotationPalettes.set(k, v);
        }
      }
      for (const [k, v] of annotationPalettes) {
        renderer.setAnnotationPalette(k, v);
      }
      renderer.setTipColourBy(tipColourBy.value     || null);
      renderer.setNodeColourBy(nodeColourBy.value   || null);
      renderer.setLabelColourBy(labelColourBy.value || null);
      renderer.setTipLabelShapeColourBy(tipLabelShapeColourBy.value || null);
      renderer.setTipLabelShape2ColourBy(tipLabelShape2ColourBy.value || null);
      renderer.setTipLabelsOff(tipLabelShow.value === 'off');
      if (tipLabelShow.value !== 'off') renderer.setTipLabelAnnotation(tipLabelShow.value === 'names' ? null : tipLabelShow.value);
      renderer.setNodeLabelAnnotation(nodeLabelShowEl.value || null);
      // Show palette selects for active colour-by annotations.
      _updatePaletteSelect(tipPaletteSelect,            tipPaletteRow,            tipColourBy.value);
      _updatePaletteSelect(nodePaletteSelect,           nodePaletteRow,           nodeColourBy.value);
      _updatePaletteSelect(labelPaletteSelect,          labelPaletteRow,          labelColourBy.value);
      _updatePaletteSelect(tipLabelShapePaletteSelect,  tipLabelShapePaletteRow,  tipLabelShapeColourBy.value);
      _updatePaletteSelect(tipLabelShape2PaletteSelect, tipLabelShape2PaletteRow, tipLabelShape2ColourBy.value);
      applyLegend();   // rebuild legend with new data (may clear it)
      const layout = computeLayoutFromGraph(graph, null, { clampNegativeBranches: clampNegBranchesEl.value === 'on' });
      renderer.setData(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

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
      while (axisDateAnnotEl.options.length > 1) axisDateAnnotEl.remove(1);
      for (const [name, def] of schema) {
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
      axisDateRow.style.display = _hasDateAnnotations ? 'flex' : 'none';
      axisDateAnnotEl.disabled  = !_hasDateAnnotations;

      // Restore date annotation (file settings take priority over saved prefs)
      const _savedAxisDate = _eff.axisDateAnnotation || '';
      const _canRestoreDate = _hasDateAnnotations && _savedAxisDate &&
                              [...axisDateAnnotEl.options].some(o => o.value === _savedAxisDate);
      axisDateAnnotEl.value = _canRestoreDate ? _savedAxisDate : '';
      calibration.setAnchor(_canRestoreDate ? _savedAxisDate : null, layout.nodeMap, layout.maxX);
      // axisRenderer.setCalibration() is called by applyAxis() below.
      axisDateFmtRow.style.display = calibration.isActive ? 'flex' : 'none';

      // Append synthetic Calendar date options to the label dropdowns now that
      // calibration is established.  The inline dropdown population above runs
      // before setAnchor(), so we patch the options in here instead.
      if (calibration.isActive) {
        const _hasHpd = !!schema.get('height')?.group?.hpd;
        for (const _sel of [tipLabelShow, nodeLabelShowEl]) {
          if (![..._sel.options].some(o => o.value === CAL_DATE_KEY)) {
            const _o = document.createElement('option');
            _o.value = CAL_DATE_KEY; _o.textContent = 'Calendar date';
            _sel.appendChild(_o);
          }
          if (_hasHpd && ![..._sel.options].some(o => o.value === CAL_DATE_HPD_KEY)) {
            const _o = document.createElement('option');
            _o.value = CAL_DATE_HPD_KEY; _o.textContent = 'Calendar date + HPDs';
            _sel.appendChild(_o);
          }
          if (_hasHpd && ![..._sel.options].some(o => o.value === CAL_DATE_HPD_ONLY_KEY)) {
            const _o = document.createElement('option');
            _o.value = CAL_DATE_HPD_ONLY_KEY; _o.textContent = 'Calendar date HPDs';
            _sel.appendChild(_o);
          }
        }
        // Re-apply saved label annotation if it was a calendar-date key that
        // couldn't be found when the dropdowns were first populated.
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
      // Sync calibration into the tree renderer so calendar-date labels are live.
      renderer.setCalibration(calibration.isActive ? calibration : null, axisDateFmtEl.value);

      // Capture full-tree axis params for subtree-tracking.
      _axisIsTimedTree = _isTimedTree;
      // Negative-branch clamping is meaningless in a time-scaled tree (nodes have
      // fixed calendar positions); hide the control and reset to 'off'.
      const _hideClamp = _isTimedTree || calibration.isActive;
      if (clampNegBranchesRowEl) clampNegBranchesRowEl.style.display = _hideClamp ? 'none' : '';
      if (_hideClamp) clampNegBranchesEl.value = 'off';

      // Show tick-option rows only when axis is in Time mode with an annotation selected.
      _showDateTickRows(axisShowEl.value === 'time' && !!axisDateAnnotEl.value);
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
      tipFilterEl.value   = '';
      tipFilterCnt.hidden = true;

      if (!treeLoaded) {
        treeLoaded = true;
        // Now that a tree is loaded, stamp the theme background onto the canvas wrappers.
        _syncCanvasWrapperBg(canvasBgColorEl.value);
        tipFilterEl.disabled       = false;
        tipColourPickerEl.disabled = false;
        // Buttons with no command equivalent
        const _btnHypUp   = document.getElementById('btn-hyp-up');
        const _btnHypDown = document.getElementById('btn-hyp-down');
        if (_btnHypUp)   _btnHypUp.disabled   = false;
        if (_btnHypDown) _btnHypDown.disabled = false;
        document.getElementById('btn-mode-nodes').disabled    = false;
        document.getElementById('btn-mode-branches').disabled = false;
        // Hide the empty-state overlay
        emptyStateEl.classList.add('hidden');
        // Show the axis canvas now if axis was already configured to be visible.
        if (axisShowEl.value !== 'off') axisCanvas.style.display = 'block';
        // Enable commands — registry syncs both the button .disabled and the native menu.
        commands.setEnabled('import-annot',    true);
        commands.setEnabled('curate-annot',    true);
        commands.setEnabled('export-tree',     true);
        commands.setEnabled('export-image',    true);
        commands.setEnabled('view-zoom-in',    true);
        commands.setEnabled('view-zoom-out',   true);
        commands.setEnabled('view-fit',        true);
        commands.setEnabled('view-fit-labels', true);
        commands.setEnabled('tree-order-up',   true);
        commands.setEnabled('tree-order-down', true);
      }

      // Restore interaction mode (file settings take priority).
      renderer.setMode(_eff.mode === 'branches' ? 'branches' : 'nodes');

      // Persist file-embedded settings to localStorage so they survive a reload.
      if (_fileSettings) saveSettings();

      if (!controlsBound) {
        bindControls();
        controlsBound = true;
      }

      // Sync button states through callbacks now that bindControls() is guaranteed to have run.
      if (renderer._onNavChange)          renderer._onNavChange(false, false);
      if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
      if (renderer._onNodeSelectChange)   renderer._onNodeSelectChange(false);

      // Sync button active states with restored settings.
      document.getElementById('btn-order-asc') .classList.toggle('active', currentOrder === 'desc');
      document.getElementById('btn-order-desc').classList.toggle('active', currentOrder === 'asc');
      const _restoredMode = renderer._mode;
      document.getElementById('btn-mode-nodes')   .classList.toggle('active', _restoredMode === 'nodes');
      document.getElementById('btn-mode-branches').classList.toggle('active', _restoredMode === 'branches');

      _syncControlVisibility();
      closeModal();
    } catch (err) {
      // If the Open Tree modal is already visible, show the error inside it.
      // Otherwise (file opened via native picker, drag-drop, etc.) show a
      // standalone error dialog instead of hijacking the modal.
      if (modal.classList.contains('open')) {
        setModalError(err.message);
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
    const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, { clampNegativeBranches: clampNegBranchesEl.value === 'on' });
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
    document.getElementById('btn-order-asc') .classList.toggle('active', !ascending);
    document.getElementById('btn-order-desc').classList.toggle('active', ascending);
    saveSettings();
  }

  // ── Control bindings (set up once after the first tree loads) ─────────────

  function bindControls() {
    const btnBack      = document.getElementById('btn-back');
    const btnForward   = document.getElementById('btn-forward');
    const btnHome      = document.getElementById('btn-home');
    const btnDrill     = document.getElementById('btn-drill');
    const btnClimb     = document.getElementById('btn-climb');
    const btnOrderAsc  = document.getElementById('btn-order-asc');
    const btnOrderDesc = document.getElementById('btn-order-desc');
    const btnReroot       = document.getElementById('btn-reroot');
    const btnRotate       = document.getElementById('btn-rotate');
    const btnRotateAll    = document.getElementById('btn-rotate-all');
    const btnHide         = document.getElementById('btn-hide');
    const btnShow         = document.getElementById('btn-show');
    const btnNodeInfo     = document.getElementById('btn-node-info');

    // ── Tip filter ────────────────────────────────────────────────────────────
    let _filterTimer = null;

    function _applyTipFilter() {
      clearTimeout(_filterTimer);
      _filterTimer = null;
      const q = tipFilterEl.value.trim().toLowerCase();

      if (!q) {
        renderer._selectedTipIds.clear();
        renderer._mrcaNodeId = null;
        if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(false);
        tipFilterCnt.hidden = true;
        renderer._dirty = true;
        return;
      }

      const matches = [];
      if (renderer.nodeMap) {
        for (const [id, n] of renderer.nodeMap) {
          if (!n.isTip) continue;
          // Match against the currently displayed tip label (annotation value,
          // date string, etc.) and fall back to the raw node name.
          const label = renderer._tipLabelText(n) ?? n.name ?? '';
          if (label.toLowerCase().includes(q)) {
            matches.push(n);
          }
        }
      }

      renderer._selectedTipIds = new Set(matches.map(n => n.id));
      renderer._mrcaNodeId = null;
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(matches.length > 0);
      tipFilterCnt.textContent = `${matches.length}`;
      tipFilterCnt.hidden = false;
      renderer._dirty = true;

      // Scroll topmost matching tip into view when tree is zoomed
      if (matches.length > 0 && renderer._targetScaleY > renderer.minScaleY * 1.01) {
        const top = matches.reduce((a, b) => a.y < b.y ? a : b);
        const newOffsetY = renderer.paddingTop + 10 - top.y * renderer._targetScaleY;
        renderer._setTarget(newOffsetY, renderer._targetScaleY, false);
      }
    }

    tipFilterEl.addEventListener('input', () => {
      clearTimeout(_filterTimer);
      _filterTimer = setTimeout(_applyTipFilter, 300);
    });
    tipFilterEl.addEventListener('blur', () => {
      clearTimeout(_filterTimer);
      _applyTipFilter();
    });
    // Native clear button in <input type="search"> fires 'search' event
    tipFilterEl.addEventListener('search', _applyTipFilter);

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
      return !!(node && !node.isTip && node.parentId);
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
    document.getElementById('btn-zoom-in') .addEventListener('click', () => renderer.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => renderer.zoomOut());
    document.getElementById('btn-hyp-up')  ?.addEventListener('click', () => renderer.hypMagUp());
    document.getElementById('btn-hyp-down')?.addEventListener('click', () => renderer.hypMagDown());

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
      commands.setEnabled('tree-paint',       hasSelection);
    };

    btnBack.addEventListener('click',    () => renderer.navigateBack());
    btnForward.addEventListener('click', () => renderer.navigateForward());
    btnHome.addEventListener('click',    () => renderer.navigateHome());
    btnDrill.addEventListener('click',   () => {
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
    btnClimb.addEventListener('click',   () => renderer.navigateClimb());

    btnOrderAsc.addEventListener('click',  () => applyOrder(false));
    btnOrderDesc.addEventListener('click', () => applyOrder(true));

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
      btnOrderAsc .classList.remove('active');
      btnOrderDesc.classList.remove('active');

      // Recompute layout and animate.
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, { clampNegativeBranches: clampNegBranchesEl.value === 'on' });
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      saveSettings();
    }

    btnRotate.addEventListener('click',    () => applyRotate(false));
    btnRotateAll.addEventListener('click', () => applyRotate(true));

    // ── Hide / Show ───────────────────────────────────────────────────────────

    /**
     * If the visual root changes after a hide/show (because one side of the
     * root was collapsed away), seed renderer.offsetX so the effective root
     * node starts at its OLD screen position, then let the existing _animating
     * lerp slide it to paddingLeft.  Call this AFTER setDataAnimated but
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
      const curOffsetX = renderer.offsetX;  // still paddingLeft from old layout

      if (direction === 'in') {
        // Root moved deeper: new root was at oldX > 0 in the old layout.
        // Slide from that displaced position in to paddingLeft.
        const oldNode = oldNodeMap?.get(newRoot.id);
        if (!oldNode) return;
        renderer._rootShiftFromX = curOffsetX + oldNode.x * curScaleX;
      } else {
        // Root moved toward real root: old effective root is somewhere down the new layout.
        // Slide from that negative-offset position out to paddingLeft.
        const newOldRootNode = renderer.nodeMap?.get(oldRoot.id);
        if (!newOldRootNode) return;
        renderer._rootShiftFromX = curOffsetX - newOldRootNode.x * curScaleX;
      }
      renderer._rootShiftToX   = renderer._targetOffsetX;   // = paddingLeft
      renderer._rootShiftAlpha = 0;
      renderer.offsetX  = renderer._rootShiftFromX;   // snap to start position immediately
      renderer._animating = true;
    }

    function applyHide() {
      if (!canHide()) return;

      // Snapshot the current visual root BEFORE mutating the graph / layout.
      const oldRoot    = renderer.nodes?.find(n => !n.parentId) ?? null;
      const oldNodeMap = renderer.nodeMap;

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
      btnOrderAsc .classList.remove('active');
      btnOrderDesc.classList.remove('active');
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, { clampNegativeBranches: clampNegBranchesEl.value === 'on' });
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      _seedRootShiftAnimation(oldRoot, oldNodeMap, layout.nodes, 'in');
      renderer.fitToWindow();
    }

    function applyShow() {
      if (!canShow()) return;
      const nodeId  = _selectedNodeId();
      const viewSubtreeRootId = renderer._viewSubtreeRootId;

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

      renderer._selectedTipIds.clear();
      renderer._mrcaNodeId = null;
      if (renderer._onNodeSelectChange) renderer._onNodeSelectChange(false);
      // Showing nodes changes tip counts so any auto-ordering is no longer meaningful.
      currentOrder = null;
      btnOrderAsc .classList.remove('active');
      btnOrderDesc.classList.remove('active');

      // Snapshot the current visual root BEFORE installing the new layout.
      const oldRoot    = renderer.nodes?.find(n => !n.parentId) ?? null;
      const oldNodeMap = renderer.nodeMap;

      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId, { clampNegativeBranches: clampNegBranchesEl.value === 'on' });
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
      _seedRootShiftAnimation(oldRoot, oldNodeMap, layout.nodes, 'out');
      renderer.fitToWindow();
    }

    btnHide.addEventListener('click', () => applyHide());
    btnShow.addEventListener('click', () => applyShow());

    // Mode menu
    const btnModeNodes    = document.getElementById('btn-mode-nodes');
    const btnModeBranches = document.getElementById('btn-mode-branches');
    const applyMode = (mode) => {
      renderer.setMode(mode);
      btnModeNodes.classList.toggle('active',    mode === 'nodes');
      btnModeBranches.classList.toggle('active', mode === 'branches');
      saveSettings();
    };
    btnModeNodes.addEventListener('click',    () => applyMode('nodes'));
    btnModeBranches.addEventListener('click', () => applyMode('branches'));

    // ── Shared rerooting logic (all three methods funnel through here) ────────
    function applyReroot(childNodeId, distFromParent) {
      // Mutate graph in-place (O(depth) parent-pointer flips, no allocation).
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
      btnReroot.disabled = true;

      const layout = computeLayoutFromGraph(graph, null, { clampNegativeBranches: clampNegBranchesEl.value === 'on' });
      renderer.setDataCrossfade(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
    }

    // Reroot button: branch-click position or node/MRCA midpoint
    btnReroot.addEventListener('click', () => {
      let targetNode, distFromParent;

      if (renderer._mode === 'branches') {
        const selNode = renderer._branchSelectNode;
        const selX    = renderer._branchSelectX;
        if (!selNode || selX === null) return;
        const parentLayoutNode = renderer.nodeMap.get(selNode.parentId);
        if (!parentLayoutNode) return;
        targetNode     = selNode;
        distFromParent = selX - parentLayoutNode.x;
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

    function applyMidpointRoot() {
      if (btnMPR.disabled) return;
      if (!_cachedMidpoint) _cachedMidpoint = midpointRootGraph(graph);
      const { childNodeId, distFromParent } = _cachedMidpoint;
      _cachedMidpoint = null;  // tree is about to change — old result is no longer valid
      applyReroot(childNodeId, distFromParent);
    }

    btnMPR.addEventListener('click', () => applyMidpointRoot());

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
          rows.push(['', annotKeys.join(', ')]);
        }

        const titleEl = document.getElementById('node-info-title');
        titleEl.textContent = 'Tree';

        const body = document.getElementById('node-info-body');
        const tbl  = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;';
        for (const [label, value] of rows) {
          const tr = tbl.insertRow();
          if (label === '__divider__') {
            const td = tr.insertCell();
            td.colSpan = 2;
            td.style.cssText = 'padding:6px 0 2px;';
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:6px;color:rgba(230,213,149,0.5);font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;';
            div.innerHTML = `<span style="flex:0 0 auto">${value}</span><span style="flex:1;border-top:1px solid rgba(230,213,149,0.2);display:inline-block"></span>`;
            td.appendChild(div);
          } else {
            const td1 = tr.insertCell();
            const td2 = tr.insertCell();
            td1.style.cssText = 'color:rgba(230,213,149,0.7);padding:2px 14px 2px 0;white-space:nowrap;vertical-align:top;';
            td2.style.cssText = 'color:rgba(242,241,230,0.88);padding:2px 0;word-break:break-all;';
            td1.textContent = label;
            td2.textContent = value;
          }
        }
        body.innerHTML = '';
        body.appendChild(tbl);

        const overlay = document.getElementById('node-info-overlay');
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
      if (node.isTip && node.name)  rows.push(['Name',         node.name]);
      if (!node.isTip && node.name) rows.push(['Name',         node.name]);
      if (node.label)               rows.push(['Label',        String(node.label)]);
      rows.push(['Divergence',   node.x.toFixed(6)]);
      rows.push(['Height',       height.toFixed(6)]);
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
      if (!node.isTip) {
        const tipCount = renderer._getDescendantTipIds
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
        function fmtAnnot(v) {
          if (v === null || v === undefined) return '—';
          if (Array.isArray(v)) {
            return '{' + v.map(x => (typeof x === 'number' ? x.toFixed(6) : String(x))).join(', ') + '}';
          } else if (typeof v === 'number') {
            return v.toFixed(6);
          }
          return String(v);
        }
        // Track emitted keys so group members aren't repeated after their base.
        const emitted = new Set();
        for (const [k, v] of annotEntries) {
          if (emitted.has(k)) continue;
          const def = schema ? schema.get(k) : null;
          // Skip group members here — they are shown indented under their base.
          if (def && def.groupMember) continue;
          rows.push([k, fmtAnnot(v)]);
          emitted.add(k);
          // If this is a BEAST base annotation, show grouped sub-metrics indented.
          if (def && def.group) {
            const SUB_LABELS = { median: 'median', hpd: '95% HPD', range: 'range', mean: 'mean', lower: 'lower', upper: 'upper' };
            for (const [groupKey, subAnnotName] of Object.entries(def.group)) {
              if (Object.prototype.hasOwnProperty.call(annots, subAnnotName)) {
                rows.push(['__sub__', [SUB_LABELS[groupKey] || groupKey, fmtAnnot(annots[subAnnotName])]]);
                emitted.add(subAnnotName);
              }
            }
          }
        }
        // Second pass: handle synthetic base keys (e.g. 'height' promoted from
        // 'height_mean') that are in the schema but not directly in node.annotations.
        if (schema) {
          const SUB_LABELS = { median: 'median', hpd: '95% HPD', range: 'range', mean: 'mean', lower: 'lower', upper: 'upper' };
          for (const [k, def] of schema) {
            if (emitted.has(k)) continue;
            if (def.groupMember) continue;   // only base entries
            if (!def.group) continue;         // only grouped entries
            if (Object.prototype.hasOwnProperty.call(annots, k)) continue; // handled by first pass
            // Use the _mean member's value as the primary displayed value.
            const meanKey = def.group.mean;
            if (!meanKey || !Object.prototype.hasOwnProperty.call(annots, meanKey)) continue;
            rows.push([k, fmtAnnot(annots[meanKey])]);
            emitted.add(k);
            for (const [groupKey, subAnnotName] of Object.entries(def.group)) {
              if (Object.prototype.hasOwnProperty.call(annots, subAnnotName)) {
                rows.push(['__sub__', [SUB_LABELS[groupKey] || groupKey, fmtAnnot(annots[subAnnotName])]]);
                emitted.add(subAnnotName);
              }
            }
          }
        }
      }

      // Title
      const tipCount2 = (!node.isTip && renderer._getDescendantTipIds)
        ? renderer._getDescendantTipIds(node.id).length
        : null;
      const titleEl = document.getElementById('node-info-title');
      titleEl.textContent = node.isTip
        ? (node.name || 'Tip node')
        : `Internal node (${tipCount2 != null ? tipCount2 + ' tips' : 'internal'})`;

      // Build table
      const body = document.getElementById('node-info-body');
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
          div.style.cssText = 'display:flex;align-items:center;gap:6px;color:rgba(230,213,149,0.5);font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;';
          div.innerHTML = '<span style="flex:0 0 auto">Annotations</span><span style="flex:1;border-top:1px solid rgba(230,213,149,0.2);display:inline-block"></span>';
          td.appendChild(div);
        } else if (label === '__sub__') {
          // Indented sub-row for grouped BEAST annotations (median / HPD / range)
          const [subLabel, subValue] = value;
          const td1 = tr.insertCell();
          const td2 = tr.insertCell();
          td1.style.cssText = 'color:rgba(230,213,149,0.42);padding:1px 14px 1px 18px;white-space:nowrap;vertical-align:top;font-size:0.85em;';
          td2.style.cssText = 'color:rgba(242,241,230,0.55);padding:1px 0;word-break:break-all;font-size:0.85em;';
          td1.textContent = subLabel;
          td2.textContent = subValue;
        } else {
          const td1 = tr.insertCell();
          const td2 = tr.insertCell();
          td1.style.cssText = 'color:rgba(230,213,149,0.7);padding:2px 14px 2px 0;white-space:nowrap;vertical-align:top;';
          td2.style.cssText = 'color:rgba(242,241,230,0.88);padding:2px 0;word-break:break-all;';
          td1.textContent = label;
          td2.textContent = value;
        }
      }
      body.innerHTML = '';
      body.appendChild(tbl);

      const overlay = document.getElementById('node-info-overlay');
      overlay.classList.add('open');
    }

    btnNodeInfo.addEventListener('click', () => showNodeInfo());

    // ── User colour ───────────────────────────────────────────────────────────
    function _applyUserColour(colour) {
      if (!graph || renderer._selectedTipIds.size === 0) return;
      for (const id of renderer._selectedTipIds) {
        const idx = graph.origIdToIdx.get(id);
        if (idx !== undefined) graph.nodes[idx].annotations['user_colour'] = colour;
      }
      graph.annotationSchema = buildAnnotationSchema(graph.nodes);
      _refreshAnnotationUIs(graph.annotationSchema);
      renderer.setAnnotationSchema(graph.annotationSchema);
      // Auto-switch tip shape colour-by to user_colour.
      tipColourBy.value = 'user_colour';
      renderer.setTipColourBy('user_colour');
      renderer._dirty = true;
      saveSettings();
    }

    btnApplyUserColour.addEventListener('click', () => _applyUserColour(tipColourPickerEl.value));

    btnClearUserColour.addEventListener('click', () => {
      if (!graph) return;
      for (const node of graph.nodes) delete node.annotations['user_colour'];
      graph.annotationSchema = buildAnnotationSchema(graph.nodes);
      _refreshAnnotationUIs(graph.annotationSchema);
      renderer.setAnnotationSchema(graph.annotationSchema);
      renderer._dirty = true;
      saveSettings();
    });

    document.getElementById('node-info-close').addEventListener('click', () => {
      document.getElementById('node-info-overlay').classList.remove('open');
    });

    document.getElementById('node-info-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('node-info-overlay')) {
        document.getElementById('node-info-overlay').classList.remove('open');
      }
    });

    window.addEventListener('keydown', e => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); applyOrder(false); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); applyOrder(true);  }
      if (e.key === '[') { e.preventDefault(); renderer.navigateBack(); }
      if (e.key === ']') { e.preventDefault(); renderer.navigateForward(); }
      if (e.key === '\\')  { e.preventDefault(); renderer.navigateHome(); }
      if (e.shiftKey && e.code === 'Comma')  { e.preventDefault(); renderer.navigateClimb(); }
      if (e.shiftKey && e.code === 'Period') { e.preventDefault(); document.getElementById('btn-drill')?.click(); }
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

  themeSelect.addEventListener('change', () => {
    if (themeSelect.value !== 'custom') applyTheme(themeSelect.value);
    else _syncThemeButtons();
  });

  canvasBgColorEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setBgColor(canvasBgColorEl.value);
    _syncCanvasWrapperBg(canvasBgColorEl.value);
    saveSettings();
  });

  branchColorEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setBranchColor(branchColorEl.value);
    saveSettings();
  });

  branchWidthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('branch-width-value').textContent = branchWidthSlider.value;
    renderer.setBranchWidth(parseFloat(branchWidthSlider.value));
    saveSettings();
  });

  fontSlider.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setFontSize(parseInt(fontSlider.value));
    saveSettings();
  });

  fontFamilyEl.addEventListener('change', () => {
    _markCustomTheme();
    renderer.setSettings(_buildRendererSettings());
    applyAxisStyle();
    legendRenderer.setFontFamily(_resolveTypeface(legendFontFamilyEl.value));
    saveSettings();
  });

  legendFontFamilyEl.addEventListener('change', () => {
    _markCustomTheme();
    legendRenderer.setFontFamily(_resolveTypeface(legendFontFamilyEl.value));
    saveSettings();
  });

  axisFontFamilyEl.addEventListener('change', () => {
    _markCustomTheme();
    applyAxisStyle();
    saveSettings();
  });

  labelColorEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setLabelColor(labelColorEl.value);
    saveSettings();
  });

  selectedLabelStyleEl.addEventListener('change', () => {
    _markCustomTheme();
    renderer.setSelectedLabelStyle(selectedLabelStyleEl.value);
    saveSettings();
  });

  selectedTipStrokeEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setSelectedTipStrokeColor(selectedTipStrokeEl.value);
    saveSettings();
  });

  selectedNodeStrokeEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setSelectedNodeStrokeColor(selectedNodeStrokeEl.value);
    saveSettings();
  });

  tipHoverFillEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setTipHoverFillColor(tipHoverFillEl.value);
    saveSettings();
  });

  nodeHoverFillEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setNodeHoverFillColor(nodeHoverFillEl.value);
    saveSettings();
  });

  selectedTipFillEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setSelectedTipFillColor(selectedTipFillEl.value);
    saveSettings();
  });

  selectedTipGrowthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-tip-growth-value').textContent = selectedTipGrowthSlider.value;
    renderer.setSelectedTipGrowthFactor(parseFloat(selectedTipGrowthSlider.value));
    saveSettings();
  });

  selectedTipMinSizeSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-tip-min-size-value').textContent = selectedTipMinSizeSlider.value;
    renderer.setSelectedTipMinSize(parseFloat(selectedTipMinSizeSlider.value));
    saveSettings();
  });

  selectedTipFillOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-tip-fill-opacity-value').textContent = selectedTipFillOpacitySlider.value;
    renderer.setSelectedTipFillOpacity(parseFloat(selectedTipFillOpacitySlider.value));
    saveSettings();
  });

  selectedTipStrokeWidthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-tip-stroke-width-value').textContent = selectedTipStrokeWidthSlider.value;
    renderer.setSelectedTipStrokeWidth(parseFloat(selectedTipStrokeWidthSlider.value));
    saveSettings();
  });

  selectedTipStrokeOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-tip-stroke-opacity-value').textContent = selectedTipStrokeOpacitySlider.value;
    renderer.setSelectedTipStrokeOpacity(parseFloat(selectedTipStrokeOpacitySlider.value));
    saveSettings();
  });

  selectedNodeFillEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setSelectedNodeFillColor(selectedNodeFillEl.value);
    saveSettings();
  });

  selectedNodeGrowthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-node-growth-value').textContent = selectedNodeGrowthSlider.value;
    renderer.setSelectedNodeGrowthFactor(parseFloat(selectedNodeGrowthSlider.value));
    saveSettings();
  });

  selectedNodeMinSizeSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-node-min-size-value').textContent = selectedNodeMinSizeSlider.value;
    renderer.setSelectedNodeMinSize(parseFloat(selectedNodeMinSizeSlider.value));
    saveSettings();
  });

  selectedNodeFillOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-node-fill-opacity-value').textContent = selectedNodeFillOpacitySlider.value;
    renderer.setSelectedNodeFillOpacity(parseFloat(selectedNodeFillOpacitySlider.value));
    saveSettings();
  });

  selectedNodeStrokeWidthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-node-stroke-width-value').textContent = selectedNodeStrokeWidthSlider.value;
    renderer.setSelectedNodeStrokeWidth(parseFloat(selectedNodeStrokeWidthSlider.value));
    saveSettings();
  });

  selectedNodeStrokeOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('selected-node-stroke-opacity-value').textContent = selectedNodeStrokeOpacitySlider.value;
    renderer.setSelectedNodeStrokeOpacity(parseFloat(selectedNodeStrokeOpacitySlider.value));
    saveSettings();
  });

  tipHoverStrokeEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setTipHoverStrokeColor(tipHoverStrokeEl.value);
    saveSettings();
  });

  tipHoverGrowthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('tip-hover-growth-value').textContent = tipHoverGrowthSlider.value;
    renderer.setTipHoverGrowthFactor(parseFloat(tipHoverGrowthSlider.value));
    saveSettings();
  });

  tipHoverMinSizeSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('tip-hover-min-size-value').textContent = tipHoverMinSizeSlider.value;
    renderer.setTipHoverMinSize(parseFloat(tipHoverMinSizeSlider.value));
    saveSettings();
  });

  tipHoverFillOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('tip-hover-fill-opacity-value').textContent = tipHoverFillOpacitySlider.value;
    renderer.setTipHoverFillOpacity(parseFloat(tipHoverFillOpacitySlider.value));
    saveSettings();
  });

  tipHoverStrokeWidthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('tip-hover-stroke-width-value').textContent = tipHoverStrokeWidthSlider.value;
    renderer.setTipHoverStrokeWidth(parseFloat(tipHoverStrokeWidthSlider.value));
    saveSettings();
  });

  tipHoverStrokeOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('tip-hover-stroke-opacity-value').textContent = tipHoverStrokeOpacitySlider.value;
    renderer.setTipHoverStrokeOpacity(parseFloat(tipHoverStrokeOpacitySlider.value));
    saveSettings();
  });

  nodeHoverStrokeEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setNodeHoverStrokeColor(nodeHoverStrokeEl.value);
    saveSettings();
  });

  nodeHoverGrowthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('node-hover-growth-value').textContent = nodeHoverGrowthSlider.value;
    renderer.setNodeHoverGrowthFactor(parseFloat(nodeHoverGrowthSlider.value));
    saveSettings();
  });

  nodeHoverMinSizeSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('node-hover-min-size-value').textContent = nodeHoverMinSizeSlider.value;
    renderer.setNodeHoverMinSize(parseFloat(nodeHoverMinSizeSlider.value));
    saveSettings();
  });

  nodeHoverFillOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('node-hover-fill-opacity-value').textContent = nodeHoverFillOpacitySlider.value;
    renderer.setNodeHoverFillOpacity(parseFloat(nodeHoverFillOpacitySlider.value));
    saveSettings();
  });

  nodeHoverStrokeWidthSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('node-hover-stroke-width-value').textContent = nodeHoverStrokeWidthSlider.value;
    renderer.setNodeHoverStrokeWidth(parseFloat(nodeHoverStrokeWidthSlider.value));
    saveSettings();
  });

  nodeHoverStrokeOpacitySlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('node-hover-stroke-opacity-value').textContent = nodeHoverStrokeOpacitySlider.value;
    renderer.setNodeHoverStrokeOpacity(parseFloat(nodeHoverStrokeOpacitySlider.value));
    saveSettings();
  });

  tipSlider.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setTipRadius(parseInt(tipSlider.value));
    saveSettings();
    _syncControlVisibility();
  });

  tipHaloSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('tip-halo-value').textContent = tipHaloSlider.value;
    renderer.setTipHaloSize(parseInt(tipHaloSlider.value));
    saveSettings();
  });

  nodeSlider.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setNodeRadius(parseInt(nodeSlider.value));
    saveSettings();
    _syncControlVisibility();
  });

  nodeHaloSlider.addEventListener('input', () => {
    _markCustomTheme();
    document.getElementById('node-halo-value').textContent = nodeHaloSlider.value;
    renderer.setNodeHaloSize(parseInt(nodeHaloSlider.value));
    saveSettings();
  });

  tipShapeColorEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setTipShapeColor(tipShapeColorEl.value);
    saveSettings();
  });

  tipShapeBgEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setTipShapeBgColor(tipShapeBgEl.value);
    saveSettings();
  });

  nodeShapeColorEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setNodeShapeColor(nodeShapeColorEl.value);
    saveSettings();
  });

  nodeShapeBgEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setNodeShapeBgColor(nodeShapeBgEl.value);
    saveSettings();
  });

  nodeColourBy.addEventListener('change', () => {
    renderer.setNodeColourBy(nodeColourBy.value || null);
    _updatePaletteSelect(nodePaletteSelect, nodePaletteRow, nodeColourBy.value);
    saveSettings();
  });

  tipColourBy.addEventListener('change', () => {
    renderer.setTipColourBy(tipColourBy.value || null);
    _updatePaletteSelect(tipPaletteSelect, tipPaletteRow, tipColourBy.value);
    saveSettings();
  });

  labelColourBy.addEventListener('change', () => {
    renderer.setLabelColourBy(labelColourBy.value || null);
    _updatePaletteSelect(labelPaletteSelect, labelPaletteRow, labelColourBy.value);
    saveSettings();
  });

  tipLabelShow.addEventListener('change', () => {
    const isOff = tipLabelShow.value === 'off';
    tipLabelControlsEl.style.display = isOff ? 'none' : '';
    const schema = renderer?._annotationSchema ?? new Map();
    _updateLabelDpRow(tipLabelDpRowEl, tipLabelShow.value, schema);
    renderer.setTipLabelsOff(isOff);
    if (!isOff) renderer.setTipLabelAnnotation(tipLabelShow.value === 'names' ? null : tipLabelShow.value);
    saveSettings();
  });

  tipLabelAlignEl.addEventListener('change', () => {
    renderer.setTipLabelAlign(tipLabelAlignEl.value);
    saveSettings();
  });

  tipLabelDpEl.addEventListener('change', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings();
  });

  nodeLabelDpEl.addEventListener('change', () => {
    renderer?.setSettings(_buildRendererSettings());
    saveSettings(); _markCustomTheme();
  });

  nodeLabelShowEl.addEventListener('change', () => {
    const schema = renderer?._annotationSchema ?? new Map();
    _updateLabelDpRow(nodeLabelDpRowEl, nodeLabelShowEl.value, schema);
    renderer?.setNodeLabelAnnotation(nodeLabelShowEl.value || null);
    saveSettings(); _markCustomTheme();
    _syncControlVisibility();
  });

  nodeLabelPositionEl.addEventListener('change', () => {
    renderer?.setNodeLabelPosition(nodeLabelPositionEl.value);
    saveSettings(); _markCustomTheme();
  });

  nodeLabelFontSizeSlider.addEventListener('input', () => {
    const v = parseInt(nodeLabelFontSizeSlider.value);
    document.getElementById('node-label-font-size-value').textContent = v;
    renderer?.setNodeLabelFontSize(v);
    saveSettings(); _markCustomTheme();
  });

  nodeLabelColorEl.addEventListener('input', () => {
    renderer?.setNodeLabelColor(nodeLabelColorEl.value);
    saveSettings(); _markCustomTheme();
  });

  nodeLabelSpacingSlider.addEventListener('input', () => {
    const v = parseInt(nodeLabelSpacingSlider.value);
    document.getElementById('node-label-spacing-value').textContent = v;
    renderer?.setNodeLabelSpacing(v);
    saveSettings(); _markCustomTheme();
  });

  tipPaletteSelect.addEventListener('change', () => {
    const key = tipColourBy.value;
    if (key && key !== 'user_colour') {
      annotationPalettes.set(key, tipPaletteSelect.value);
      _syncPaletteSelects(key, tipPaletteSelect.value);
      renderer.setAnnotationPalette(key, tipPaletteSelect.value);
      legendRenderer.draw();
      saveSettings();
    }
  });

  nodePaletteSelect.addEventListener('change', () => {
    const key = nodeColourBy.value;
    if (key && key !== 'user_colour') {
      annotationPalettes.set(key, nodePaletteSelect.value);
      _syncPaletteSelects(key, nodePaletteSelect.value);
      renderer.setAnnotationPalette(key, nodePaletteSelect.value);
      legendRenderer.draw();
      saveSettings();
    }
  });

  labelPaletteSelect.addEventListener('change', () => {
    const key = labelColourBy.value;
    if (key && key !== 'user_colour') {
      annotationPalettes.set(key, labelPaletteSelect.value);
      _syncPaletteSelects(key, labelPaletteSelect.value);
      renderer.setAnnotationPalette(key, labelPaletteSelect.value);
      legendRenderer.draw();
      saveSettings();
    }
  });

  // ── Tip-label shape controls ───────────────────────────────────────────────

  tipLabelShapeEl.addEventListener('change', () => {
    renderer.setTipLabelShape(tipLabelShapeEl.value);
    _syncControlVisibility();
    saveSettings(); _markCustomTheme();
  });

  tipLabelShapeColorEl.addEventListener('input', () => {
    renderer.setTipLabelShapeColor(tipLabelShapeColorEl.value);
    saveSettings(); _markCustomTheme();
  });

  tipLabelShapeColourBy.addEventListener('change', () => {
    renderer.setTipLabelShapeColourBy(tipLabelShapeColourBy.value || null);
    _updatePaletteSelect(tipLabelShapePaletteSelect, tipLabelShapePaletteRow, tipLabelShapeColourBy.value);
    saveSettings();
  });

  tipLabelShapeMarginLeftSlider.addEventListener('input', () => {
    const v = parseInt(tipLabelShapeMarginLeftSlider.value);
    document.getElementById('tip-label-shape-margin-left-value').textContent = v;
    renderer.setTipLabelShapeMarginLeft(v);
    saveSettings(); _markCustomTheme();
  });

  tipLabelShapeMarginRightSlider.addEventListener('input', () => {
    const v = parseInt(tipLabelShapeMarginRightSlider.value);
    document.getElementById('tip-label-shape-margin-right-value').textContent = v;
    renderer.setTipLabelShapeMarginRight(v);
    saveSettings(); _markCustomTheme();
  });

  tipLabelShapePaletteSelect.addEventListener('change', () => {
    const key = tipLabelShapeColourBy.value;
    if (key && key !== 'user_colour') {
      annotationPalettes.set(key, tipLabelShapePaletteSelect.value);
      _syncPaletteSelects(key, tipLabelShapePaletteSelect.value);
      renderer.setAnnotationPalette(key, tipLabelShapePaletteSelect.value);
      legendRenderer.draw();
      saveSettings();
    }
  });

  // ── Tip-label shape 2 controls ────────────────────────────────────────────

  tipLabelShape2El.addEventListener('change', () => {
    renderer.setTipLabelShape2(tipLabelShape2El.value);
    _syncControlVisibility();
    saveSettings(); _markCustomTheme();
  });

  tipLabelShape2ColorEl.addEventListener('input', () => {
    renderer.setTipLabelShape2Color(tipLabelShape2ColorEl.value);
    saveSettings(); _markCustomTheme();
  });

  tipLabelShape2ColourBy.addEventListener('change', () => {
    renderer.setTipLabelShape2ColourBy(tipLabelShape2ColourBy.value || null);
    _updatePaletteSelect(tipLabelShape2PaletteSelect, tipLabelShape2PaletteRow, tipLabelShape2ColourBy.value);
    saveSettings();
  });

  tipLabelShape2MarginRightSlider.addEventListener('input', () => {
    const v = parseInt(tipLabelShape2MarginRightSlider.value);
    document.getElementById('tip-label-shape-2-margin-right-value').textContent = v;
    renderer.setTipLabelShape2MarginRight(v);
    saveSettings(); _markCustomTheme();
  });

  tipLabelShapeSizeSlider.addEventListener('input', () => {
    const v = parseInt(tipLabelShapeSizeSlider.value);
    document.getElementById('tip-label-shape-size-value').textContent = v;
    renderer.setTipLabelShapeSize(v);
    saveSettings(); _markCustomTheme();
  });

  tipLabelShape2SizeSlider.addEventListener('input', () => {
    const v = parseInt(tipLabelShape2SizeSlider.value);
    document.getElementById('tip-label-shape-2-size-value').textContent = v;
    renderer.setTipLabelShape2Size(v);
    saveSettings(); _markCustomTheme();
  });

  tipLabelShape2PaletteSelect.addEventListener('change', () => {
    const key = tipLabelShape2ColourBy.value;
    if (key && key !== 'user_colour') {
      annotationPalettes.set(key, tipLabelShape2PaletteSelect.value);
      _syncPaletteSelects(key, tipLabelShape2PaletteSelect.value);
      renderer.setAnnotationPalette(key, tipLabelShape2PaletteSelect.value);
      legendRenderer.draw();
      saveSettings();
    }
  });

  // ── Legend controls ───────────────────────────────────────────────────────

  function applyLegend() {
    const key  = legendAnnotEl.value || null;
    const show = !!key;                        // visible only when an annotation is selected
    const pos  = legendShowEl.value;           // 'left' | 'right'
    const key2    = legend2AnnotEl.value || null;
    const pos2    = legend2ShowEl.value;        // 'right' | 'below'
    const beside2 = show && !!key2 && pos2 === 'right';

    // Set annotation + font first so measureWidth() has the right state.
    legendRenderer.setFontSize(parseInt(legendFontSizeSlider.value));
    legendRenderer.setTextColor(legendTextColorEl.value);
    legendRenderer.setSettings({
      heightPct:  parseInt(legendHeightPctSlider.value),
      heightPct2: parseInt(legend2HeightPctSlider.value),
    }, /*redraw*/ false);
    legendRenderer.setAnnotation(show ? pos : null, key);
    legendRenderer.setAnnotation2(key2 ? pos2 : 'right', key2);

    const W  = show    ? legendRenderer.measureWidth()  : 0;
    const W2 = beside2 ? legendRenderer.measureWidth2() : 0;

    legendLeftCanvas.style.display  = (show && pos === 'left')  ? 'block' : 'none';
    legendLeftCanvas.style.width    = W + 'px';
    legendRightCanvas.style.display = (show && pos === 'right') ? 'block' : 'none';
    legendRightCanvas.style.width   = W + 'px';

    // Legend 2 side canvases — only visible in 'right' (beside) mode.
    legend2RightCanvas.style.display = (beside2 && pos === 'right') ? 'block' : 'none';
    legend2RightCanvas.style.width   = W2 + 'px';
    legend2LeftCanvas.style.display  = (beside2 && pos === 'left')  ? 'block' : 'none';
    legend2LeftCanvas.style.width    = W2 + 'px';

    renderer._resize();   // recalculates tree canvas width after legend canvases shown/hidden
    saveSettings();
    _syncControlVisibility();
  }

  legendShowEl .addEventListener('change', applyLegend);
  legendAnnotEl.addEventListener('change', applyLegend);
  legend2AnnotEl.addEventListener('change', applyLegend);
  legend2ShowEl .addEventListener('change', applyLegend);
  legend2HeightPctSlider.addEventListener('input', () => {
    document.getElementById('legend2-height-pct-value').textContent = legend2HeightPctSlider.value + '%';
    applyLegend();
  });

  legendTextColorEl.addEventListener('input', () => {
    legendRenderer.setTextColor(legendTextColorEl.value);
    saveSettings();
  });
  legendFontSizeSlider.addEventListener('input', () => {
    document.getElementById('legend-font-size-value').textContent = legendFontSizeSlider.value;
    applyLegend();
  });
  legendHeightPctSlider.addEventListener('input', () => {
    document.getElementById('legend-height-pct-value').textContent = legendHeightPctSlider.value + '%';
    applyLegend();
  });

  // ── Axis controls ─────────────────────────────────────────────────────────

  function applyAxis() {
    const val = axisShowEl.value;
    const on  = val !== 'off';
    axisCanvas.style.display = on ? 'block' : 'none';
    if (val === 'time') {
      axisRenderer.setCalibration(calibration.isActive ? calibration : null);
      axisRenderer.setDirection('forward');
    } else {
      axisRenderer.setCalibration(null);
      axisRenderer.setDirection(on ? val : 'forward');
    }
    axisRenderer.setVisible(on);
    _showDateTickRows(val === 'time' && calibration.isActive && !!axisDateAnnotEl.value);
    // Resize the tree canvas so it fills the remaining space above/below the axis.
    renderer._resize();
    if (on) {
      // Draw immediately with current view state.
      axisRenderer.update(
        renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
        renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
        window.devicePixelRatio || 1,
      );
    }
    saveSettings();
    _syncControlVisibility();
  }

  axisShowEl.addEventListener('change', applyAxis);

  // ── Minor-interval options (depend on major) ──────────────────────────────

  function _updateMinorOptions(majorVal, keepVal) {
    const opts = {
      auto:     [['auto','Auto'],['years','Years'],['months','Months'],['off','Off']],
      decades:  [['auto','Auto'],['years','Years'],['months','Months'],['off','Off']],
      years:    [['auto','Auto'],['quarters','Quarters'],['months','Months'],['weeks','Weeks'],['days','Days'],['off','Off']],
      quarters: [['auto','Auto'],['months','Months'],['days','Days'],['off','Off']],
      months:   [['auto','Auto'],['weeks','Weeks'],['days','Days'],['off','Off']],
      weeks:    [['auto','Auto'],['days','Days'],['off','Off']],
      days:     [['off','Off']],
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
    axisRenderer.setTickOptions({
      majorInterval:    axisMajorIntervalEl.value,
      minorInterval:    axisMinorIntervalEl.value,
      majorLabelFormat: axisMajorLabelEl.value,
      minorLabelFormat: axisMinorLabelEl.value,
    });
    axisRenderer.update(
      renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
      renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
      window.devicePixelRatio || 1,
    );
    saveSettings();
  }

  function applyAxisStyle() {
    axisRenderer.setColor(axisColorEl.value);
    axisRenderer.setLineWidth(parseFloat(axisLineWidthSlider.value));
    axisRenderer.setFontSize(parseInt(axisFontSizeSlider.value));
    axisRenderer.setFontFamily(_resolveTypeface(axisFontFamilyEl.value));
    axisRenderer.update(
      renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
      renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
      window.devicePixelRatio || 1,
    );
    saveSettings();
  }

  axisColorEl.addEventListener('input', () => { _markCustomTheme(); applyAxisStyle(); });
  axisFontSizeSlider.addEventListener('input', () => {
    document.getElementById('axis-font-size-value').textContent = axisFontSizeSlider.value;
    applyAxisStyle();
  });
  axisLineWidthSlider.addEventListener('input', () => {
    document.getElementById('axis-line-width-value').textContent = axisLineWidthSlider.value;
    applyAxisStyle();
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

  nodeBarsShowEl.addEventListener('change', applyNodeBars);
  nodeBarsColorEl.addEventListener('input', applyNodeBars);
  nodeBarsWidthSlider.addEventListener('input', () => {
    document.getElementById('node-bars-width-value').textContent = nodeBarsWidthSlider.value;
    applyNodeBars();
  });
  nodeBarsMedianEl.addEventListener('change', applyNodeBars);
  nodeBarsRangeEl.addEventListener('change', applyNodeBars);

  clampNegBranchesEl.addEventListener('change', () => {
    if (!renderer || !graph) { saveSettings(); return; }
    renderer.setSettings(_buildRendererSettings());
    const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId,
      { clampNegativeBranches: clampNegBranchesEl.value === 'on' });
    renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
    saveSettings();
  });

  function _showDateTickRows(visible) {
    const d = visible ? 'flex' : 'none';
    axisMajorIntervalRow.style.display  = d;
    axisMinorIntervalRow.style.display  = d;
    axisMajorLabelRow.style.display     = d;
    axisMinorLabelRow.style.display     = d;
  }

  axisMajorIntervalEl.addEventListener('change', () => {
    _updateMinorOptions(axisMajorIntervalEl.value, axisMinorIntervalEl.value);
    applyTickOptions();
  });
  axisMinorIntervalEl.addEventListener('change', applyTickOptions);
  axisMajorLabelEl   .addEventListener('change', applyTickOptions);
  axisMinorLabelEl   .addEventListener('change', applyTickOptions);
  axisDateFmtEl      .addEventListener('change', applyTickOptions);

  axisDateAnnotEl.addEventListener('change', () => {
    const key = axisDateAnnotEl.value || null;
    calibration.setAnchor(key, renderer.nodeMap || new Map(), renderer.maxX);
    axisDateFmtRow.style.display = calibration.isActive ? 'flex' : 'none';
    // Clamp-to-zero is irrelevant when calibration is active (tree is time-scaled).
    if (clampNegBranchesRowEl) clampNegBranchesRowEl.style.display = (_axisIsTimedTree || calibration.isActive) ? 'none' : '';
    if (calibration.isActive) clampNegBranchesEl.value = 'off';
    // Repopulate label dropdowns to add/remove Calendar date options, then sync renderer.
    _refreshAnnotationUIs(renderer?._annotationSchema ?? new Map());
    if (renderer) renderer.setSettings(_buildRendererSettings());
    if (axisShowEl.value === 'time') {
      axisRenderer.setCalibration(key && calibration.isActive ? calibration : null);
      // If currently viewing a subtree, recompute its params using the new anchor.
      if (renderer._viewSubtreeRootId && renderer._onLayoutChange) {
        renderer._onLayoutChange(renderer.maxX, renderer._viewSubtreeRootId);
      }
      _showDateTickRows(calibration.isActive && !!key);
      axisRenderer.update(
        renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
        renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
        window.devicePixelRatio || 1,
      );
    }
    saveSettings();
  });

  btnFit.addEventListener('click', () => renderer.fitToWindow());
  document.getElementById('btn-fit-labels').addEventListener('click', () => renderer.fitLabels());

  // Open button
  document.getElementById('btn-open-tree').addEventListener('click', () => commands.execute('open-tree'));

  // ── Wire command exec functions ────────────────────────────────────────────
  // Explicitly-wired (no buttonId, or custom behaviour):
  commands.get('open-file').exec  = () => pickTreeFile();
  commands.get('open-tree').exec  = () => openModal();
  commands.get('import-annot').exec = () => annotImporter.open();
  commands.get('curate-annot').exec  = () => annotCurator.open();
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
  // Button-backed commands: exec clicks the toolbar button so all existing
  // click-handler logic runs without duplication.
  for (const cmd of commands.getAll().values()) {
    if (cmd.buttonId && !cmd.exec) {
      const btnId = cmd.buttonId;
      cmd.exec = () => document.getElementById(btnId)?.click();
    }
  }

  // ── Global keyboard shortcut dispatch (registry-driven) ───────────────────
  window.addEventListener('keydown', e => {
    if (!e.metaKey && !e.ctrlKey) return;
    if (e.altKey) return;
    for (const cmd of commands.getAll().values()) {
      if (!commands.matchesShortcut(e, cmd.shortcut)) continue;
      // If no exec is registered (e.g. new-window, wired only by the Tauri adapter),
      // don't intercept — let the browser handle its own default for this shortcut.
      if (!cmd.exec) continue;
      // select-all: let the browser handle it natively when a text field is focused.
      if (cmd.id === 'select-all') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      }
      e.preventDefault();
      commands.execute(cmd.id);
      return;
    }
  });

  // ── Public API for framework adapters ────────────────────────────────────
  // Exposed on window.peartree so that platform-specific glue scripts (e.g.
  // peartree-tauri.js) can hook in without modifying this file.
  window.peartree = {
    /** Load a tree from a text string (async). */
    loadTree,
    openModal,
    closeModal,
    setModalError,
    /** Show a standalone error dialog with an OK button. */
    showErrorDialog,

    /** Show a confirm dialog; returns a Promise<boolean>. */
    showConfirmDialog,

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
    setExportSaveHandler:    (fn) => { _exportSaveHandler   = fn; },

    /** Override the graphic-export action for the current platform.
     *  fn({ content|contentBase64, base64, filename, mimeType, filterName, extensions })
     *  Set to null to restore browser behaviour. */
    setGraphicsSaveHandler:  (fn) => { _graphicsSaveHandler = fn; },

    /** Fetch a file by relative path, falling back to the absolute GitHub Pages
     *  URL if the relative fetch fails (e.g. file:// context). */
    fetchWithFallback,
  };

  // ── URL parameter: auto-load treeUrl on startup ───────────────────────────
  // When the page URL contains a `treeUrl` query parameter, automatically
  // fetch that URL and load its content as a tree file on startup.
  {
    const _startParams = new URLSearchParams(window.location.search);
    const _fastaUrl    = _startParams.get('treeUrl');
    if (_fastaUrl) {
      let _validated = null;
      try {
        const _u = new URL(_fastaUrl);
        if (_u.protocol === 'http:' || _u.protocol === 'https:') _validated = _u.href;
        else throw new Error('Only http/https URLs are supported.');
      } catch (_e) {
        console.warn('peartree: ignoring invalid fastaUrl parameter –', _e.message);
      }
      if (_validated) {
        openModal();
        setModalLoading(true);
        setModalError(null);
        (async () => {
          try {
            const _resp = await fetch(_validated);
            if (!_resp.ok) throw new Error('HTTP ' + _resp.status + ' – ' + _validated);
            const _text = await _resp.text();
            const _name = new URL(_validated).pathname.split('/').pop() || 'data';
            await loadTree(_text, _name);
          } catch (_err) {
            setModalError(_err.message);
            setModalLoading(false);
          }
        })();
      }
    }
  }

  window.dispatchEvent(new CustomEvent('peartree-ready'));

})();

