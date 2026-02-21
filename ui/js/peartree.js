import { parseNexus, parseNewick } from './treeio.js';
import { computeLayoutFromGraph } from './treeutils.js';
import { fromNestedRoot, rerootOnGraph, reorderGraph, rotateNodeGraph, midpointRootGraph, buildAnnotationSchema } from './phylograph.js';
import { TreeRenderer } from './treerenderer.js';
import { AxisRenderer  } from './axisrenderer.js';

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
  const nodeShapeColorEl  = document.getElementById('node-shape-color');
  const nodeShapeBgEl     = document.getElementById('node-shape-bg-color');
  const tipColourBy       = document.getElementById('tip-colour-by');
  const nodeColourBy      = document.getElementById('node-colour-by');
  const labelColourBy     = document.getElementById('label-colour-by');
  const legendShowEl      = document.getElementById('legend-show');
  const legendAnnotEl     = document.getElementById('legend-annotation');
  const legendLeftCanvas  = document.getElementById('legend-left-canvas');
  const legendRightCanvas = document.getElementById('legend-right-canvas');
  const axisCanvas             = document.getElementById('axis-canvas');
  const axisShowEl             = document.getElementById('axis-show');
  const axisDateAnnotEl        = document.getElementById('axis-date-annotation');
  const axisDateRow            = document.getElementById('axis-date-row');
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
  const axisLineWidthSlider   = document.getElementById('axis-line-width-slider');
  const themeSelect            = document.getElementById('theme-select');
  const btnStoreTheme          = document.getElementById('btn-store-theme');
  const btnFit                 = document.getElementById('btn-fit');
  const btnResetSettings       = document.getElementById('btn-reset-settings');
  const btnImportAnnot         = document.getElementById('btn-import-annot');
  const btnExportTree          = document.getElementById('btn-export-tree');
  const tipColourPickerEl            = document.getElementById('btn-node-colour');
  const btnApplyUserColour           = document.getElementById('btn-apply-user-colour');
  const btnClearUserColour           = document.getElementById('btn-clear-user-colour');
  const tipFilterEl            = document.getElementById('tip-filter');
  const tipFilterCnt           = document.getElementById('tip-filter-count');

  // ── Settings persistence ──────────────────────────────────────────────────

  const SETTINGS_KEY    = 'peartree-settings';
  const USER_THEMES_KEY = 'peartree-user-themes';
  let currentOrder = null;  // null | 'asc' | 'desc' — declared early so saveSettings() is safe to call during init

    const THEMES = {
        "Artic": {
            canvasBgColor:    '#02292e',
            branchColor:      '#f2f1e6',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#f7eeca',
            tipSize:          '3',
            tipHaloSize:      '1',
            tipShapeColor:    '#888888',
            tipShapeBgColor:  '#02292e',
            nodeSize:         '0',
            nodeHaloSize:     '1',
            nodeShapeColor:   '#888888',
            nodeShapeBgColor: '#02292e',
            axisColor:        '#f2f1e6',
        },
        "Minimal": {
            canvasBgColor:    '#fff',
            branchColor:      '#000',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#000',
            tipSize:          '3',
            tipHaloSize:      '1',
            tipShapeColor:    '#fff',
            tipShapeBgColor:  '#000',
            nodeSize:         '2',
            nodeHaloSize:     '1',
            nodeShapeColor:   '#000',
            nodeShapeBgColor: '#000',
            axisColor:        '#444444',
        },
        // Warm pastels: Grand Budapest Hotel / Moonrise Kingdom palette
        "Wes": {
            canvasBgColor:    '#f5edd6',
            branchColor:      '#7b3b5e',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#4a2040',
            tipSize:          '4',
            tipHaloSize:      '2',
            tipShapeColor:    '#d4614b',
            tipShapeBgColor:  '#f5edd6',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#b8962e',
            nodeShapeBgColor: '#f5edd6',
            axisColor:        '#4a2040',
        },
        // Deep jewel tones: The Life Aquatic / Isle of Dogs palette
        "Wes Dark": {
            canvasBgColor:    '#1e2d3a',
            branchColor:      '#edd59c',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#f4c9a8',
            tipSize:          '4',
            tipHaloSize:      '2',
            tipShapeColor:    '#e07b65',
            tipShapeBgColor:  '#1e2d3a',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#7dbfcc',
            nodeShapeBgColor: '#1e2d3a',
            axisColor:        '#edd59c',
        },
        // Royal Tenenbaums: aged plaster, forest green, burgundy, tennis-ball gold
        "Tenenbaums": {
            canvasBgColor:    '#f0e8d8',
            branchColor:      '#2b4a2a',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#1c3220',
            tipSize:          '4',
            tipHaloSize:      '2',
            tipShapeColor:    '#a01830',
            tipShapeBgColor:  '#f0e8d8',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#c8a020',
            nodeShapeBgColor: '#f0e8d8',
            axisColor:        '#2b4a2a',
        },
        // Fantastic Mr Fox: night earth, fox orange, rust, harvest green
        "Mr Fox": {
            canvasBgColor:    '#1a0d00',
            branchColor:      '#e87830',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#f0c060',
            tipSize:          '3',
            tipHaloSize:      '1',
            tipShapeColor:    '#c84a18',
            tipShapeBgColor:  '#1a0d00',
            nodeSize:         '3',
            nodeHaloSize:     '1',
            nodeShapeColor:   '#508a28',
            nodeShapeBgColor: '#1a0d00',
            axisColor:        '#f0c060',
        },
        // The Darjeeling Limited: warm cream, saffron, cerulean, rust
        "Darjeeling": {
            canvasBgColor:    '#faf0d8',
            branchColor:      '#c87010',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#3a2010',
            tipSize:          '4',
            tipHaloSize:      '2',
            tipShapeColor:    '#1a5878',
            tipShapeBgColor:  '#faf0d8',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#c04428',
            nodeShapeBgColor: '#faf0d8',
            axisColor:        '#3a2010',
        },
        // Mid Century Modern – Birch: warm white, teak, avocado, harvest gold
        "MCM Birch": {
            canvasBgColor:    '#f2ede0',
            branchColor:      '#5c3a1e',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#2a1c10',
            tipSize:          '4',
            tipHaloSize:      '2',
            tipShapeColor:    '#5a7a2a',
            tipShapeBgColor:  '#f2ede0',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#c88c24',
            nodeShapeBgColor: '#f2ede0',
            axisColor:        '#2a1c10',
        },
        // Mid Century Modern – Walnut: warm sand, burnt sienna, mustard, teal
        "MCM Walnut": {
            canvasBgColor:    '#e8dcc8',
            branchColor:      '#8c4822',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#3a1c0a',
            tipSize:          '4',
            tipHaloSize:      '2',
            tipShapeColor:    '#c89520',
            tipShapeBgColor:  '#e8dcc8',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#2a6870',
            nodeShapeBgColor: '#e8dcc8',
            axisColor:        '#3a1c0a',
        },
        // Mid Century Modern – Eames: dark walnut, warm amber, turquoise, coral
        "MCM Eames": {
            canvasBgColor:    '#1a1208',
            branchColor:      '#d08830',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#f0d890',
            tipSize:          '4',
            tipHaloSize:      '2',
            tipShapeColor:    '#2a8878',
            tipShapeBgColor:  '#1a1208',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#c44030',
            nodeShapeBgColor: '#1a1208',
            axisColor:        '#f0d890',
        },
        // Áine O'Toole's publication style: white bg, near-black branches,
        // bold coral tip circles with white halo, clean dark labels — as seen
        // in her viral genomic epidemiology figures (baltic / matplotlib)
        "O'Toole": {
            canvasBgColor:    '#ffffff',
            branchColor:      '#222222',
            branchWidth:      '1',
            fontSize:         '11',
            labelColor:       '#1a1a1a',
            tipSize:          '5',
            tipHaloSize:      '3',
            tipShapeColor:    '#d95f30',
            tipShapeBgColor:  '#ffffff',
            nodeSize:         '0',
            nodeHaloSize:     '2',
            nodeShapeColor:   '#2a7a8a',
            nodeShapeBgColor: '#ffffff',
            axisColor:        '#222222',
        },
  };

  // Live theme registry: built-ins first, then any user-saved themes added on top.
  const themeRegistry = new Map(Object.entries(THEMES));

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
      opt.textContent = name;
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
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      axisColor:        axisColorEl.value,
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
    btnStoreTheme.disabled = true;
    saveSettings();
  }

  const DEFAULTS = {
    theme:            'Artic',
    canvasBgColor:    '#fff',
    branchColor:      '#000',
    branchWidth:      '1',
    fontSize:         '11',
    labelColor:       '#000',
    tipSize:          '3',
    tipHaloSize:      '2',
    tipShapeColor:    '#464646',
    tipShapeBgColor:  '#000',
    nodeSize:         '0',
    nodeHaloSize:     '2',
    nodeShapeColor:   '#636363',
    nodeShapeBgColor: '#000',
    axisColor:        '#f2f1e6',
    axisFontSize:     '9',
    axisLineWidth:    '1',
    legendShow:         'off',
    axisShow:           'off',
    axisDateAnnotation: '',
    axisMajorInterval:    'auto',
    axisMinorInterval:    'off',
    axisMajorLabelFormat: 'auto',
    axisMinorLabelFormat: 'off',
  };

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      theme:            themeSelect.value,
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
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      tipColourBy:      tipColourBy.value,
      nodeColourBy:     nodeColourBy.value,
      labelColourBy:    labelColourBy.value,
      legendShow:       legendShowEl.value,
      legendAnnotation: legendAnnotEl.value,
      axisShow:           axisShowEl.value,
      axisDateAnnotation: axisDateAnnotEl.value,
      axisMajorInterval:    axisMajorIntervalEl.value,
      axisMinorInterval:    axisMinorIntervalEl.value,
      axisMajorLabelFormat: axisMajorLabelEl.value,
      axisMinorLabelFormat: axisMinorLabelEl.value,
      axisColor:          axisColorEl.value,
      axisFontSize:       axisFontSizeSlider.value,
      axisLineWidth:      axisLineWidthSlider.value,
      nodeOrder:        currentOrder,
      mode:             renderer ? renderer._mode : 'nodes',
    }));
  }

  /**
   * Snapshot the full current UI state as a plain object suitable for
   * embedding in an exported NEXUS file or for comparison.
   */
  function _captureCurrentSettings() {
    return {
      theme:            themeSelect.value,
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
      nodeShapeColor:   nodeShapeColorEl.value,
      nodeShapeBgColor: nodeShapeBgEl.value,
      tipColourBy:      tipColourBy.value,
      nodeColourBy:     nodeColourBy.value,
      labelColourBy:    labelColourBy.value,
      legendShow:       legendShowEl.value,
      legendAnnotation: legendAnnotEl.value,
      axisShow:           axisShowEl.value,
      axisDateAnnotation: axisDateAnnotEl.value,
      axisMajorInterval:    axisMajorIntervalEl.value,
      axisMinorInterval:    axisMinorIntervalEl.value,
      axisMajorLabelFormat: axisMajorLabelEl.value,
      axisMinorLabelFormat: axisMinorLabelEl.value,
      axisColor:          axisColorEl.value,
      axisFontSize:       axisFontSizeSlider.value,
      axisLineWidth:      axisLineWidthSlider.value,
      nodeOrder:        currentOrder,
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
    if (s.canvasBgColor)        canvasBgColorEl.value    = s.canvasBgColor;
    if (s.branchColor)          branchColorEl.value      = s.branchColor;
    if (s.branchWidth    != null) {
      branchWidthSlider.value = s.branchWidth;
      document.getElementById('branch-width-value').textContent = s.branchWidth;
    }
    if (s.fontSize       != null) {
      fontSlider.value = s.fontSize;
      document.getElementById('font-size-value').textContent = s.fontSize;
    }
    if (s.labelColor)            labelColorEl.value       = s.labelColor;
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
    if (s.axisShow)              axisShowEl.value         = s.axisShow;
    if (s.axisMajorInterval)     axisMajorIntervalEl.value = s.axisMajorInterval;
    if (s.axisMinorInterval)     axisMinorIntervalEl.value = s.axisMinorInterval;
    if (s.axisMajorLabelFormat)  axisMajorLabelEl.value   = s.axisMajorLabelFormat;
    if (s.axisMinorLabelFormat)  axisMinorLabelEl.value   = s.axisMinorLabelFormat;
    if (s.axisColor)             axisColorEl.value        = s.axisColor;
    if (s.legendShow)            legendShowEl.value       = s.legendShow;
    // Set themeSelect to the stored theme name (or 'custom' if not known).
    const themeName = s.theme && themeRegistry.has(s.theme) ? s.theme : (s.theme === 'custom' ? 'custom' : 'custom');
    themeSelect.value = themeName;
    btnStoreTheme.disabled = (themeName !== 'custom');
    if (renderer) {
      if (s.canvasBgColor)        renderer.setBgColor(s.canvasBgColor);
      if (s.branchColor)          renderer.setBranchColor(s.branchColor);
      if (s.branchWidth    != null) renderer.setBranchWidth(parseFloat(s.branchWidth));
      if (s.fontSize       != null) renderer.setFontSize(parseInt(s.fontSize));
      if (s.labelColor)            renderer.setLabelColor(s.labelColor);
      if (s.tipSize        != null) renderer.setTipRadius(parseInt(s.tipSize));
      if (s.tipHaloSize    != null) renderer.setTipHaloSize(parseInt(s.tipHaloSize));
      if (s.tipShapeColor)         renderer.setTipShapeColor(s.tipShapeColor);
      if (s.tipShapeBgColor)       renderer.setTipShapeBgColor(s.tipShapeBgColor);
      if (s.nodeSize       != null) renderer.setNodeRadius(parseInt(s.nodeSize));
      if (s.nodeHaloSize   != null) renderer.setNodeHaloSize(parseInt(s.nodeHaloSize));
      if (s.nodeShapeColor)        renderer.setNodeShapeColor(s.nodeShapeColor);
      if (s.nodeShapeBgColor)      renderer.setNodeShapeBgColor(s.nodeShapeBgColor);
      if (s.axisColor)             axisRenderer.setColor(s.axisColor);
    }
  }

  function applyDefaults() {
    if (!confirm('Reset all visual settings to their defaults?')) return;

    // Apply the default theme (hydrates all visual DOM controls + renderer).
    applyTheme('Artic');

    // Reset colour-by dropdowns, legend, and axis controls.
    tipColourBy.value        = 'user_colour';
    nodeColourBy.value       = 'user_colour';
    labelColourBy.value      = 'user_colour';
    legendShowEl.value       = DEFAULTS.legendShow;
    legendAnnotEl.value      = '';
    axisShowEl.value         = DEFAULTS.axisShow;
    axisDateAnnotEl.value    = '';
    axisMajorIntervalEl.value    = DEFAULTS.axisMajorInterval;
    axisMinorIntervalEl.value    = DEFAULTS.axisMinorInterval;
    axisMajorLabelEl.value       = DEFAULTS.axisMajorLabelFormat;
    axisMinorLabelEl.value       = DEFAULTS.axisMinorLabelFormat;
    _updateMinorOptions(DEFAULTS.axisMajorInterval, DEFAULTS.axisMinorInterval);
    axisFontSizeSlider.value = DEFAULTS.axisFontSize;
    document.getElementById('axis-font-size-value').textContent = DEFAULTS.axisFontSize;
    axisLineWidthSlider.value = DEFAULTS.axisLineWidth;
    document.getElementById('axis-line-width-value').textContent = DEFAULTS.axisLineWidth;

    if (renderer) {
      renderer.setTipColourBy('user_colour');
      renderer.setNodeColourBy('user_colour');
      renderer.setLabelColourBy('user_colour');
      renderer.setMode('nodes');
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

  /** Apply a named theme: hydrate all visual DOM controls and push to renderer. */
  function applyTheme(name) {
    const t = themeRegistry.get(name);
    if (!t) return;
    canvasBgColorEl.value   = t.canvasBgColor;
    branchColorEl.value     = t.branchColor;
    branchWidthSlider.value = t.branchWidth;
    document.getElementById('branch-width-value').textContent = t.branchWidth;
    fontSlider.value        = t.fontSize;
    document.getElementById('font-size-value').textContent    = t.fontSize;
    labelColorEl.value      = t.labelColor;
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
    if (t.axisColor) {
      axisColorEl.value = t.axisColor;
    }
    if (renderer) {
      renderer.setBgColor(t.canvasBgColor);
      renderer.setBranchColor(t.branchColor);
      renderer.setBranchWidth(parseFloat(t.branchWidth));
      renderer.setFontSize(parseInt(t.fontSize));
      renderer.setLabelColor(t.labelColor);
      renderer.setTipRadius(parseInt(t.tipSize));
      renderer.setTipHaloSize(parseInt(t.tipHaloSize));
      renderer.setTipShapeColor(t.tipShapeColor);
      renderer.setTipShapeBgColor(t.tipShapeBgColor);
      renderer.setNodeRadius(parseInt(t.nodeSize));
      renderer.setNodeHaloSize(parseInt(t.nodeHaloSize));
      renderer.setNodeShapeColor(t.nodeShapeColor);
      renderer.setNodeShapeBgColor(t.nodeShapeBgColor);
      if (t.axisColor) axisRenderer.setColor(t.axisColor);
      // Invalidate axis hash so next update redraws
      axisRenderer._lastHash = '';
    }
    themeSelect.value = name;
    btnStoreTheme.disabled = true;
    saveSettings();
  }

  /** Mark the theme selector as Custom when the user manually edits any visual control. */
  function _markCustomTheme() {
    if (themeSelect.value !== 'custom') {
      themeSelect.value = 'custom';
      saveSettings();
    }
    btnStoreTheme.disabled = false;
  }

  btnResetSettings.addEventListener('click', applyDefaults);
  btnStoreTheme.addEventListener('click', storeTheme);

  // Bootstrap theme registry and select options before restoring saved state.
  loadUserThemes();
  _populateThemeSelect();
  btnStoreTheme.disabled = true;

  // Load stored settings and immediately hydrate the visual DOM controls.
  const _saved = loadSettings();
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
  if (_saved.labelColor)           labelColorEl.value       = _saved.labelColor;
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
  if (_saved.axisFontSize != null) {
    axisFontSizeSlider.value = _saved.axisFontSize;
    document.getElementById('axis-font-size-value').textContent = _saved.axisFontSize;
  }
  if (_saved.axisLineWidth != null) {
    axisLineWidthSlider.value = _saved.axisLineWidth;
    document.getElementById('axis-line-width-value').textContent = _saved.axisLineWidth;
  }
  if (_saved.legendShow)           legendShowEl.value       = _saved.legendShow;
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

  // Size the status canvas
  const statusCanvas = document.getElementById('status-canvas');
  const statusBar    = statusCanvas.parentElement;
  statusCanvas.style.width  = statusBar.clientWidth  + 'px';
  statusCanvas.style.height = statusBar.clientHeight + 'px';
  statusCanvas.width  = statusBar.clientWidth  * dpr;
  statusCanvas.height = statusBar.clientHeight * dpr;
  statusCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderer = new TreeRenderer(canvas, undefined, statusCanvas);
  renderer.setLegendCanvases(legendLeftCanvas, legendRightCanvas);

  // Apply stored visual settings to the renderer immediately.
  // If no saved theme exists yet, apply the default 'Artic' theme.
  if (!_saved.theme) {
    applyTheme('Artic');
  } else {
    renderer.setBgColor(canvasBgColorEl.value);
    renderer.setBranchColor(branchColorEl.value);
    renderer.setBranchWidth(parseFloat(branchWidthSlider.value));
    renderer.setFontSize(parseInt(fontSlider.value));
    renderer.setLabelColor(labelColorEl.value);
    renderer.setTipRadius(parseInt(tipSlider.value));
    renderer.setTipHaloSize(parseInt(tipHaloSlider.value));
    renderer.setTipShapeColor(tipShapeColorEl.value);
    renderer.setTipShapeBgColor(tipShapeBgEl.value);
    renderer.setNodeRadius(parseInt(nodeSlider.value));
    renderer.setNodeHaloSize(parseInt(nodeHaloSlider.value));
    renderer.setNodeShapeColor(nodeShapeColorEl.value);
    renderer.setNodeShapeBgColor(nodeShapeBgEl.value);
  }

  // ── Axis renderer ─────────────────────────────────────────────────────────
  const axisRenderer          = new AxisRenderer(axisCanvas);
  // Apply saved (or default) axis style immediately
  axisRenderer.setColor(axisColorEl.value);
  axisRenderer.setFontSize(parseInt(axisFontSizeSlider.value));
  axisRenderer.setLineWidth(parseFloat(axisLineWidthSlider.value));
  const canvasAndAxisWrapper  = document.getElementById('canvas-and-axis-wrapper');

  renderer._onViewChange = (scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr) => {
    axisRenderer.update(scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr);
    // Fill any subpixel gap between the tree canvas and axis canvas with the
    // canvas background colour rather than the page background.
    canvasAndAxisWrapper.style.backgroundColor = bgColor;
  };

  // Update axis time span whenever navigation drills into or out of a subtree.
  // Reads renderer._globalHeightMap directly so the values are always current,
  // even after rerooting (which rebuilds the map via _buildGlobalHeightMap).
  renderer._onLayoutChange = (maxX, viewSubtreeRootId) => {
    if (!_axisIsTimedTree) return;
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

  // Restore axis visibility from saved settings
  if (_saved.axisShow === 'on') {
    axisShowEl.value            = 'on';
    axisCanvas.style.display    = 'block';
    axisRenderer.setVisible(true);
  }
  // Restore tick options
  if (_saved.axisMajorInterval)    axisMajorIntervalEl.value    = _saved.axisMajorInterval;
  _updateMinorOptions(axisMajorIntervalEl.value, _saved.axisMinorInterval || 'off');
  if (_saved.axisMajorLabelFormat) axisMajorLabelEl.value       = _saved.axisMajorLabelFormat;
  if (_saved.axisMinorLabelFormat) axisMinorLabelEl.value       = _saved.axisMinorLabelFormat;

  // Hide the initial loading overlay; the Open Tree modal replaces it on startup
  loadingEl.style.display = 'none';

  // ── Modal management ──────────────────────────────────────────────────────

  const modal         = document.getElementById('open-tree-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  let treeLoaded = false;

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
  document.addEventListener('keydown', e => {
    const inTextField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) &&
      !['checkbox', 'radio'].includes(document.activeElement?.type);

    if (e.key === 'Escape') {
      // Close innermost open overlay first.
      if (exportGraphicOverlay.classList.contains('open')) { _closeGraphicsDialog(); return; }
      if (exportOverlay.classList.contains('open'))        { _closeExportDialog();   return; }
      if (importOverlay.classList.contains('open'))        { _closeAnnotDialog();    return; }
      const nodeInfoOv = document.getElementById('node-info-overlay');
      if (nodeInfoOv && nodeInfoOv.style.display !== 'none') { nodeInfoOv.style.display = 'none'; return; }
      if (modal.classList.contains('open'))  { closeModal();           return; }
    }

    if (e.key === 'Enter' && !e.shiftKey && !inTextField) {
      if (exportGraphicOverlay.classList.contains('open')) {
        document.getElementById('expg-download-btn')?.click(); return;
      }
      if (exportOverlay.classList.contains('open')) {
        document.getElementById('exp-download-btn')?.click(); return;
      }
      if (importOverlay.classList.contains('open')) {
        const apply = document.getElementById('imp-apply-btn');
        if (apply) { apply.click(); return; }
        (document.getElementById('imp-close-btn') ||
         document.getElementById('imp-close-err-btn') ||
         document.getElementById('imp-picker-cancel-btn'))?.click();
        return;
      }
      const nodeInfoOv = document.getElementById('node-info-overlay');
      if (nodeInfoOv && nodeInfoOv.style.display !== 'none') { nodeInfoOv.style.display = 'none'; return; }
      if (modal.classList.contains('open'))  { closeModal(); return; }
    }

    // ── File-open shortcuts (web-app context; Tauri handles these via native menu) ──
    const cmdOrCtrl = e.metaKey || e.ctrlKey;
    if (cmdOrCtrl && !e.shiftKey && e.key === 'o') {
      e.preventDefault();
      pickTreeFile();      // Cmd/Ctrl+O → direct native file picker
      return;
    }
    if (cmdOrCtrl && e.shiftKey && e.key === 'O') {
      e.preventDefault();
      openModal();         // Cmd/Ctrl+Shift+O → Open Tree modal
      return;
    }
  });

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

  /** Opens a tree file using the OS-native dialog.
   *  In Tauri, WKWebView blocks file-input clicks from async callbacks
   *  (menu events, keyboard shortcuts), so we use a Rust command instead.
   *  In the web app we fall back to the hidden file input. */
  async function pickTreeFile() {
    if (window.__TAURI__?.core?.invoke) {
      try {
        const result = await window.__TAURI__.core.invoke('pick_tree_file');
        if (result) await loadTree(result.content, result.name);
      } catch (err) {
        console.error('pick_tree_file failed:', err);
      }
    } else {
      fileInput.click();
    }
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

  document.getElementById('btn-load-example').addEventListener('click', async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const resp = await fetch('data/ebov.tree');
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' – could not fetch data/ebov.tree');
      const text = await resp.text();
      await loadTree(text, 'ebov.tree');
    } catch (err) {
      setModalError(err.message);
      setModalLoading(false);
    }
  });

  // ── Empty-state overlay (shown until first tree load) ──────────────────
  const emptyStateEl = document.getElementById('empty-state');
  document.getElementById('empty-state-open-btn').addEventListener('click', () => pickTreeFile());
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

  const importOverlay = document.getElementById('import-annot-overlay');
  const importBody    = document.getElementById('import-annot-body');
  const importFooter  = document.getElementById('import-annot-footer');
  const importTitleEl = document.getElementById('import-annot-title');

  function _openAnnotDialog() {
    if (!graph) return;
    _showAnnotPicker();
    importOverlay.classList.add('open');
  }
  function _closeAnnotDialog() {
    importOverlay.classList.remove('open');
  }

  document.getElementById('import-annot-close').addEventListener('click', _closeAnnotDialog);
  btnImportAnnot.addEventListener('click', _openAnnotDialog);

  document.getElementById('export-tree-close').addEventListener('click', _closeExportDialog);
  btnExportTree.addEventListener('click', _openExportDialog);

  /** Phase 1: render the File/URL picker UI into the dialog body. */
  function _showAnnotPicker(errorMsg) {
    importTitleEl.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Import Annotations';
    importFooter.innerHTML  = `<button id="imp-picker-cancel-btn" class="btn btn-sm btn-secondary">Cancel</button>`;
    document.getElementById('imp-picker-cancel-btn').addEventListener('click', _closeAnnotDialog);
    importBody.innerHTML = `
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
      ${errorMsg ? `<div class="pt-modal-error">${_esc(errorMsg)}</div>` : ''}`;

    // Tab switching
    importBody.querySelectorAll('[data-imp-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        importBody.querySelectorAll('[data-imp-tab]').forEach(b => b.classList.remove('active'));
        importBody.querySelectorAll('.pt-tab-panel').forEach(p => p.classList.remove('active'));
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
    annotDropZone.addEventListener('dragover',  e  => { e.preventDefault(); annotDropZone.classList.add('drag-over'); });
    annotDropZone.addEventListener('dragleave', () => annotDropZone.classList.remove('drag-over'));
    annotDropZone.addEventListener('drop', e => {
      e.preventDefault();
      annotDropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
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

  /** Parse a CSV or TSV string into { headers, rows[] }. */
  function _parseDelimited(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine  = lines[0];
    const tabCount   = (firstLine.match(/\t/g)  || []).length;
    const commaCount = (firstLine.match(/,/g)   || []).length;
    const delimiter  = tabCount >= commaCount ? '\t' : ',';

    function parseLine(line) {
      if (delimiter === '\t') return line.split('\t').map(v => v.trim());
      const result = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          result.push(cur.trim()); cur = '';
        } else { cur += ch; }
      }
      result.push(cur.trim());
      return result;
    }

    const headers = parseLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      if (vals.every(v => !v)) continue;
      const obj = {};
      headers.forEach((h, j) => { obj[h] = vals[j] ?? ''; });
      rows.push(obj);
    }
    return { headers, rows };
  }

  /** Show the import configuration dialog. */
  function _showImportConfig(filename, text) {
    let parsed;
    try { parsed = _parseDelimited(text); }
    catch (err) { _showImportError(`Parse error: ${err.message}`); return; }
    const { headers, rows } = parsed;
    if (headers.length < 2) {
      _showImportError('File must have at least 2 columns (one to match tips and at least one annotation column).');
      return;
    }
    if (rows.length === 0) {
      _showImportError('No data rows found (file appears to have only a header row).');
      return;
    }

    const headerOpts = headers.map((h, i) =>
      `<option value="${i}">${_esc(h)}</option>`).join('');

    const colChecks = headers.map((h, i) =>
      `<label><input type="checkbox" class="imp-col-chk" data-idx="${i}" checked> ${_esc(h)}</label>`
    ).join('');

    importTitleEl.innerHTML = `<i class="bi bi-file-earmark-text me-2"></i>${_esc(filename)}`;
    importBody.innerHTML = `
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
              style="width:52px;background:#02292e;color:var(--bs-body-color);border:1px solid #235b62;border-radius:0.25rem;padding:0.1rem 0.3rem;font-size:0.82rem;"
              title="Which |-delimited field (1 = first)">
          </label>
        </div>
      </div>

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

    importFooter.innerHTML = `
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
    }
    document.getElementById('imp-match-col').addEventListener('change', _syncMatchColDisabled);
    _syncMatchColDisabled(); // init

    // Clicking the field-number input switches to field mode.
    document.getElementById('imp-field-num').addEventListener('focus', () => {
      document.getElementById('imp-mode-field').checked = true;
    });

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

    document.getElementById('imp-cancel-btn').addEventListener('click', () => _showAnnotPicker());

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

  /** Write parsed annotations onto graph nodes, rebuild schema, refresh UI. */
  function _applyAnnotations({ rows, matchCol, matchMode, fieldIndex, importCols, doReplace, filename }) {
    const tips = graph.nodes.filter(n => n.adjacents.length === 1);

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
        const num = Number(raw);
        node.annotations[colName] = Number.isNaN(num) ? raw : num;
      }
    }

    const unmatchedTips = tips.length - matched;
    const unmatchedRows = rowLookup.size - matchedRowKeys.size;

    // Rebuild schema and refresh all annotation-dependent UI.
    graph.annotationSchema = buildAnnotationSchema(graph.nodes);
    _refreshAnnotationUIs(graph.annotationSchema);
    renderer.setAnnotationSchema(graph.annotationSchema);
    renderer.setTipColourBy(tipColourBy.value      || null);
    renderer.setNodeColourBy(nodeColourBy.value    || null);
    renderer.setLabelColourBy(labelColourBy.value  || null);
    applyLegend();
    renderer._dirty = true;

    _showImportResults({ matched, unmatchedTips, unmatchedRows, unmatchedTipExamples,
                         importCols, filename, totalTips: tips.length });
  }

  /** Switch the import dialog to a results view. */
  function _showImportResults({ matched, unmatchedTips, unmatchedRows, unmatchedTipExamples = [], importCols, filename, totalTips }) {
    const pct       = totalTips > 0 ? Math.round(100 * matched / totalTips) : 0;
    const okCls  = matched       > 0 ? 'imp-ok'   : 'imp-warn';
    const tipCls = unmatchedTips > 0 ? 'imp-warn' : 'imp-ok';
    const rowCls = unmatchedRows > 0 ? 'imp-warn' : 'imp-ok';
    importTitleEl.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Import Results';
    importBody.innerHTML = `
      <div class="imp-result-row">
        <span class="imp-result-icon ${okCls}"><i class="bi bi-check-circle-fill"></i></span>
        <span><strong>${matched}</strong> of <strong>${totalTips}</strong> tips matched (${pct}%)</span>
      </div>
      <div class="imp-result-row">
        <span class="imp-result-icon ${tipCls}">
          <i class="bi bi-${unmatchedTips > 0 ? 'exclamation-triangle-fill' : 'check-circle-fill'}"></i>
        </span>
        <span><strong>${unmatchedTips}</strong> tip${unmatchedTips !== 1 ? 's' : ''} unmatched${unmatchedTips > 0 && unmatchedTipExamples.length > 0 ? ` <span style="color:var(--bs-secondary-color);font-size:0.78rem">(e.g. ${unmatchedTipExamples.map(n => `<code style="background:#02292e;padding:0 3px;border-radius:3px">${_esc(n)}</code>`).join(', ')}${unmatchedTips > unmatchedTipExamples.length ? ', …' : ''})</span>` : ''}</span>
      </div>
      <div class="imp-result-row">
        <span class="imp-result-icon ${rowCls}">
          <i class="bi bi-${unmatchedRows > 0 ? 'exclamation-triangle-fill' : 'check-circle-fill'}"></i>
        </span>
        <span><strong>${unmatchedRows}</strong> annotation row${unmatchedRows !== 1 ? 's' : ''} unmatched</span>
      </div>
      ${importCols.length > 0 ? `
      <div style="margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid #235b62;">
        <span style="color:var(--bs-secondary-color)">Annotations imported:</span>
        ${importCols.map(c => `<code style="background:#02292e;padding:0 3px;border-radius:3px;margin:0 2px">${_esc(c)}</code>`).join('')}
      </div>` : ''}`;
    importFooter.innerHTML = `<button id="imp-close-btn" class="btn btn-sm btn-primary">Close</button>`;
    document.getElementById('imp-close-btn').addEventListener('click', _closeAnnotDialog);
  }

  /** Show an error inside the import dialog (phase 2 parse errors). */
  function _showImportError(msg) {
    importTitleEl.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Import Error';
    importBody.innerHTML = `<div style="color:var(--bs-danger);padding:0.5rem 0">${_esc(msg)}</div>`;
    importFooter.innerHTML = `<button id="imp-back-btn" class="btn btn-sm btn-outline-secondary me-auto">&#x2190; Back</button>
      <button id="imp-close-err-btn" class="btn btn-sm btn-secondary">Close</button>`;
    document.getElementById('imp-back-btn').addEventListener('click',      () => _showAnnotPicker());
    document.getElementById('imp-close-err-btn').addEventListener('click', _closeAnnotDialog);
  }

  /** HTML-escape a string for safe insertion. */
  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Export Tree ────────────────────────────────────────────────────────────────

  /** Escape a Newick/NEXUS taxon name with single quotes when needed. */
  function _newickEsc(name) {
    if (!name) return '';
    if (/[(),;:\[\]\s]/.test(name)) return `'${name.replace(/'/g, "''")}'`;
    return name;
  }

  /** Format a branch length compactly (no scientific notation for typical values). */
  function _fmtLen(n) {
    if (n == null || isNaN(n)) return null;
    if (n === 0) return '0';
    return parseFloat(n.toPrecision(12)).toString();
  }

  /** Build a BEAST/FigTree-style [&key=val,...] annotation block. */
  function _fmtAnnot(annotations, annotKeys) {
    if (!annotations || annotKeys.length === 0) return '';
    const parts = [];
    for (const key of annotKeys) {
      const val = annotations[key];
      if (val === undefined || val === null) continue;
      if (Array.isArray(val)) {
        const elems = val.map(v => typeof v === 'string' ? `"${v.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"` : v);
        parts.push(`${key}={${elems.join(',')}}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}="${val.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`);
      } else {
        parts.push(`${key}=${val}`);
      }
    }
    return parts.length > 0 ? `[&${parts.join(',')}]` : '';
  }

  /**
   * Return the branch length from child index `ci` toward parent direction `pi`.
   * Handles the special case where root-adjacent nodes store total edge length.
   */
  function _branchLen(ci, pi, g) {
    if (pi < 0) return null;
    const { nodeA, nodeB, lenA, lenB } = g.root;
    if (ci === nodeA && pi === nodeB) return lenA;
    if (ci === nodeB && pi === nodeA) return lenB;
    return g.nodes[ci].lengths[0];
  }

  /**
   * Recursively serialize the subtree rooted at `nodeIdx` (coming from direction
   * `parentIdx`, which is excluded from children) into a Newick string fragment.
   */
  function _newickNode(nodeIdx, parentIdx, g, annotKeys) {
    const node      = g.nodes[nodeIdx];
    const annotStr  = _fmtAnnot(node.annotations, annotKeys);
    const safeName  = _newickEsc(node.name || node.label || '');
    const childIdxs = node.adjacents.filter(i => i !== parentIdx);
    if (childIdxs.length === 0) {
      return `${safeName}${annotStr}`;
    }
    const parts = childIdxs.map(ci => {
      const cStr   = _newickNode(ci, nodeIdx, g, annotKeys);
      const len    = _branchLen(ci, nodeIdx, g);
      const lenStr = len != null ? `:${_fmtLen(len)}` : '';
      return `${cStr}${lenStr}`;
    });
    return `(${parts.join(',')})${safeName}${annotStr}`;
  }

  /**
   * Serialize the PhyloGraph `g` (or a subtree rooted at `subtreeRootId`) to
   * a Newick string ended with ';'.
   */
  function _graphToNewick(g, subtreeRootId, annotKeys) {
    const { nodeA, nodeB, lenA } = g.root;
    let body;
    if (subtreeRootId) {
      const idx = g.origIdToIdx.get(subtreeRootId);
      if (idx === undefined) return null;
      const node = g.nodes[idx];
      const parentIdx = node.adjacents.length > 0 ? node.adjacents[0] : -1;
      body = _newickNode(idx, parentIdx, g, annotKeys);
    } else if (lenA === 0) {
      // nodeA is the actual root (trifurcating or annotated)
      body = _newickNode(nodeA, -1, g, annotKeys);
    } else {
      // Virtual root between nodeA and nodeB
      const aStr = _newickNode(nodeA, nodeB, g, annotKeys);
      const bStr = _newickNode(nodeB, nodeA, g, annotKeys);
      const aLen = lenA != null   ? `:${_fmtLen(lenA)}`        : '';
      const bLen = g.root.lenB != null ? `:${_fmtLen(g.root.lenB)}` : '';
      body = `(${aStr}${aLen},${bStr}${bLen})`;
    }
    return body + ';';
  }

  // Export dialog DOM refs
  const exportOverlay  = document.getElementById('export-tree-overlay');
  const exportBody     = document.getElementById('export-tree-body');
  const exportFooter   = document.getElementById('export-tree-footer');
  const exportTitleEl  = document.getElementById('export-tree-title');

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
      <button id="exp-download-btn" class="btn btn-sm btn-primary"><i class="bi bi-download me-1"></i>Download</button>`;

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
    const newick      = _graphToNewick(graph, subtreeId, annotKeys);
    if (!newick) return;

    let content, ext;
    if (format === 'nexus') {
      const rootedTag    = annotKeys.length > 0 ? '[&R] ' : '';
      const settingsLine = storeSettings
        ? `\t[peartree=${JSON.stringify(_captureCurrentSettings())}]\n`
        : '';
      content = `#NEXUS\nBEGIN TREES;\n\ttree TREE1 = ${rootedTag}${newick}\n${settingsLine}END;\n`;
      ext     = 'nexus';
    } else {
      content = newick + '\n';
      ext     = 'nwk';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `tree.${ext}` });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    _closeExportDialog();
  }

  // ── Export Graphic ─────────────────────────────────────────────────────────

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

  /** Return CSS-pixel dimensions of the full composite viewport. */
  function _viewportDims() {
    const llVisible = legendLeftCanvas.style.display !== 'none';
    const lrVisible = legendRightCanvas.style.display !== 'none';
    const axVisible = axisCanvas.style.display        !== 'none';
    const llW = llVisible ? legendLeftCanvas.clientWidth  : 0;
    const lrW = lrVisible ? legendRightCanvas.clientWidth : 0;
    const ttW = canvas.clientWidth;
    const ttH = canvas.clientHeight;
    const axH = axVisible ? axisCanvas.clientHeight : 0;
    return { totalW: llW + ttW + lrW, totalH: ttH + axH,
             llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible };
  }

  function _buildGraphicsDialog() {
    const { totalW, totalH } = _viewportDims();
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
      <button id="expg-download-btn" class="btn btn-sm btn-primary"><i class="bi bi-download me-1"></i>Download</button>`;

    const _updateExpgHint = () => {
      const { totalW, totalH, axH, axVisible } = _viewportDims();
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
      const { totalW, totalH, axH, axVisible } = _viewportDims();
      const targetW = Math.round(totalW * 2);
      const targetH = fullTree
        ? Math.round((renderer.paddingTop + renderer.paddingBottom +
            (renderer.maxY + 1) * renderer.scaleY + (axVisible ? axH : 0)) * 2)
        : Math.round(totalH * 2);

      _compositeViewPng(targetW, targetH, fullTree, transparent).convertToBlob({ type: 'image/png' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a   = Object.assign(document.createElement('a'), { href: url, download: `${filename}.png` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } else {
      const svgStr = _buildGraphicSVG(fullTree, transparent);
      if (!svgStr) return;
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${filename}.svg` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    _closeGraphicsDialog();
  }

  /** Composite all visible canvases onto an OffscreenCanvas at target pixel size. */
  function _compositeViewPng(targetW, targetH, fullTree = false, transparent = false) {
    const { totalW, totalH, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = _viewportDims();
    // Full tree: panel height is determined by current scaleY over all tips.
    const ttH_eff    = fullTree
      ? (renderer.paddingTop + renderer.paddingBottom + (renderer.maxY + 1) * renderer.scaleY)
      : ttH;
    const totalH_eff = ttH_eff + (axVisible ? axH : 0);
    const sx = targetW / totalW;
    const sy = targetH / totalH_eff;
    const oc  = new OffscreenCanvas(targetW, targetH);
    const ctx = oc.getContext('2d');

    if (!transparent) {
      ctx.fillStyle = renderer.bgColor;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    if (llVisible) {
      if (transparent) {
        // Re-render legend without background fill.
        renderer._skipBg = true;
        renderer._drawLegend();
        renderer._skipBg = false;
      }
      ctx.drawImage(legendLeftCanvas, 0, 0,
        Math.round(llW * sx), Math.round(ttH_eff * sy));
      if (transparent) {
        // Restore legend with background for the live view.
        renderer._drawLegend();
      }
    }
    if (fullTree) {
      // Re-render tree panel at current scaleY with full unclipped height.
      const treeW = Math.round(ttW * sx);
      const treeH = Math.round(ttH_eff * sy);
      const toc = new OffscreenCanvas(treeW, treeH);
      renderer.renderFull(toc, treeW, treeH, transparent);
      ctx.drawImage(toc, Math.round(llW * sx), 0);
    } else if (transparent) {
      // Re-render current viewport at screen dimensions without background,
      // then let drawImage scale it to the export target (same as the normal
      // path does with the live canvas, but without the pre-painted background).
      const toc = new OffscreenCanvas(Math.round(ttW), Math.round(ttH_eff));
      renderer.renderViewToOffscreen(toc, true);
      ctx.drawImage(toc,
        Math.round(llW * sx), 0,
        Math.round(ttW * sx), Math.round(ttH_eff * sy));
    } else {
      ctx.drawImage(canvas,
        Math.round(llW * sx), 0,
        Math.round(ttW * sx), Math.round(ttH_eff * sy));
    }
    if (axVisible) {
      ctx.drawImage(axisCanvas,
        Math.round(llW * sx), Math.round(ttH_eff * sy),
        Math.round(ttW * sx), Math.round(axH * sy));
    }
    if (lrVisible) {
      if (transparent) {
        renderer._skipBg = true;
        renderer._drawLegend();
        renderer._skipBg = false;
      }
      ctx.drawImage(legendRightCanvas,
        Math.round((llW + ttW) * sx), 0,
        Math.round(lrW * sx), Math.round(ttH_eff * sy));
      if (transparent) {
        renderer._drawLegend();
      }
    }
    return oc;
  }

  /** Escape a string for SVG text content. */
  function _svgTextEsc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Build a fully-vector composite SVG: three panels arranged as on screen —
   *   legend (left) | tree | legend (right)   [with axis below the tree panel]
   *
   * No raster embeds — axis ticks and legend entries are SVG elements.
   */
  function _buildGraphicSVG(fullTree = false, transparent = false) {
    const nm = renderer.nodeMap;
    if (!nm || !nm.size) return null;

    const { totalW, totalH, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = _viewportDims();
    const sx  = renderer.scaleX,  ox = renderer.offsetX;
    // Full tree: keep current scaleY so zoom level is preserved; shift oy so root sits at top.
    const sy  = renderer.scaleY;
    const oy  = fullTree ? renderer.paddingTop + renderer.scaleY * 0.5 : renderer.offsetY;
    // Effective tree-panel height and total SVG height.
    const ttH_eff    = fullTree
      ? Math.round(renderer.paddingTop + renderer.paddingBottom + (renderer.maxY + 1) * renderer.scaleY)
      : ttH;
    const totalH_eff = ttH_eff + (axVisible ? axH : 0);
    const bg  = renderer.bgColor;
    const bc  = renderer.branchColor;
    const bw  = Math.max(0.5, renderer.branchWidth);
    const lc  = renderer.labelColor;
    const fs  = renderer.fontSize;
    const tr  = renderer.tipRadius;
    const nr  = renderer.nodeRadius;

    const toSX = wx => wx * sx + ox + llW;
    const toSY = wy => wy * sy + oy;
    const f    = n  => n.toFixed(2);
    // When drawing full tree all nodes are in range; use Infinity to skip y-culling.
    const MARGIN = fullTree ? Infinity : 20;

    // ── defs: clip paths, gradients ──────────────────────────────────────
    const defs = [];
    // Clip for the main tree area (excludes legend panels)
    defs.push(`<clipPath id="tc"><rect x="${llW}" y="0" width="${ttW}" height="${ttH_eff}"/></clipPath>`);

    // ── Background panels ─────────────────────────────────────────────────
    const bgParts = [];
    if (!transparent) {
      bgParts.push(`<rect width="${totalW}" height="${totalH_eff}" fill="${_esc(bg)}"/>`);
    }

    // ── Legend panels (vector) ────────────────────────────────────────────
    const legendParts = [];
    const legendPos = renderer._legendPosition;
    const legendKey = renderer._legendAnnotation;
    if (legendPos && legendKey && renderer._annotationSchema) {
      const def = renderer._annotationSchema.get(legendKey);
      if (def) {
        const lx = legendPos === 'left' ? 0 : llW + ttW;
        const lw = legendPos === 'left' ? llW : lrW;
        const PAD = 12;
        let   ly  = PAD;

        // Title
        legendParts.push(`<text x="${lx + PAD}" y="${ly}" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" font-weight="700" fill="#b58900">${_svgTextEsc(legendKey)}</text>`);
        ly += fs + 10;

        if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
          const PALETTE = ['#2aa198','#cb4b16','#268bd2','#d33682','#6c71c4','#b58900','#859900','#dc322f'];
          const SWATCH  = 12;
          const ROW_H   = Math.max(SWATCH + 4, fs + 4);
          (def.values || []).forEach((val, i) => {
            if (ly + SWATCH > ttH_eff - PAD) return;
            const colour = PALETTE[i % PALETTE.length];
            legendParts.push(`<rect x="${lx + PAD}" y="${ly}" width="${SWATCH}" height="${SWATCH}" fill="${_esc(colour)}"/>`);
            legendParts.push(`<text x="${lx + PAD + SWATCH + 6}" y="${ly + SWATCH / 2}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${_svgTextEsc(String(val))}</text>`);
            ly += ROW_H;
          });
        } else if (def.dataType === 'real' || def.dataType === 'integer') {
          const BAR_W = lw - PAD * 2;
          const BAR_H = 14;
          const gid   = 'lgrd';
          defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2aa198"/><stop offset="100%" stop-color="#dc322f"/></linearGradient>`);
          legendParts.push(`<rect x="${lx + PAD}" y="${ly}" width="${BAR_W}" height="${BAR_H}" fill="url(#${gid})"/>`);
          ly += BAR_H + 4;
          const min = def.min ?? 0, max = def.max ?? 1;
          legendParts.push(`<text x="${lx + PAD}" y="${ly}" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${_svgTextEsc(String(min))}</text>`);
          legendParts.push(`<text x="${lx + PAD + BAR_W}" y="${ly}" text-anchor="end" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${_svgTextEsc(String(max))}</text>`);
        }
      }
    }

    // ── Tree branches ─────────────────────────────────────────────────────
    const branchParts = [];
    const bgNodeParts = [];  // background halo circles for node shapes
    const bgTipParts  = [];  // background halo circles for tip shapes
    const fgNodeParts = [];  // foreground fill circles for node shapes
    const fgTipParts  = [];  // foreground fill circles for tip shapes
    const labelParts  = [];
    // Stroke width for the bg halo: uses renderer.tipHaloSize directly
    const tipHaloSW  = renderer.tipHaloSize * 2;
    const nodeHaloSW = renderer.nodeHaloSize * 2;
    const tipBgColor  = renderer.tipShapeBgColor || bg;
    const nodeBgColor = renderer.nodeShapeBgColor || bg;

    const rootNode = [...nm.values()].find(n => n.parentId === null);
    if (rootNode) {
      const rx = toSX(rootNode.x), ry = toSY(rootNode.y);
      const stub = renderer.rootStubLength ?? 20;
      branchParts.push(`<line x1="${f(rx - stub)}" y1="${f(ry)}" x2="${f(rx)}" y2="${f(ry)}"/>`);
    }

    for (const [, node] of nm) {
      const nx = toSX(node.x), ny = toSY(node.y);

      if (node.parentId !== null) {
        const parent = nm.get(node.parentId);
        if (parent && ny > -MARGIN && ny < ttH + MARGIN) {
          branchParts.push(`<line x1="${f(toSX(parent.x))}" y1="${f(ny)}" x2="${f(nx)}" y2="${f(ny)}"/>`);
        }
      }

      if (!node.isTip && node.children.length >= 2) {
        const childYs = node.children.map(cid => { const c = nm.get(cid); return c ? toSY(c.y) : null; }).filter(y => y !== null);
        if (childYs.length >= 2) {
          const minY = Math.min(...childYs), maxY = Math.max(...childYs);
          if (maxY > -MARGIN && minY < ttH + MARGIN)
            branchParts.push(`<line x1="${f(nx)}" y1="${f(minY)}" x2="${f(nx)}" y2="${f(maxY)}"/>`);
        }
      }

      if (ny > -MARGIN && ny < ttH + MARGIN) {
        if (node.isTip && tr > 0) {
          const fill = renderer._tipColourScale?.get(node.annotations?.[renderer._tipColourBy]) || renderer.tipShapeColor;
          if (tipHaloSW > 0)
            bgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${_esc(tipBgColor)}" stroke="${_esc(tipBgColor)}" stroke-width="${tipHaloSW}"/>`);
          fgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${_esc(fill)}"/>`);
        } else if (!node.isTip && nr > 0) {
          const fill = renderer._nodeColourScale?.get(node.annotations?.[renderer._nodeColourBy]) || renderer.nodeShapeColor;
          if (nodeHaloSW > 0)
            bgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${_esc(nodeBgColor)}" stroke="${_esc(nodeBgColor)}" stroke-width="${nodeHaloSW}"/>`);
          fgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${_esc(fill)}"/>`);
        }
        if (node.isTip && node.name) {
          const lx2 = nx + (tr > 0 ? tr + 4 : 4);
          const labelFill = (renderer._labelColourBy && renderer._labelColourScale)
            ? (renderer._labelColourForValue(node.annotations?.[renderer._labelColourBy]) ?? lc)
            : lc;
          labelParts.push(`<text x="${f(lx2)}" y="${f(ny)}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="${_esc(labelFill)}">${_svgTextEsc(node.name)}</text>`);
        } else if (!node.isTip && node.label) {
          labelParts.push(`<text x="${f(nx + 3)}" y="${f(ny - 3)}" font-family="monospace" font-size="${Math.round(fs * 0.85)}px" fill="${_esc(lc)}" opacity="0.7">${_svgTextEsc(node.label)}</text>`);
        }
      }
    }

    // ── Axis (vector) ────────────────────────────────────────────────────
    const axisParts = [];
    if (axVisible && axisRenderer._visible && axisRenderer._scaleX && axisRenderer._maxX !== 0) {
      const ar        = axisRenderer;
      const plotLeft  = ar._offsetX;
      const plotRight = ar._offsetX + ar._maxX * ar._scaleX;
      const AX        = llW;          // SVG x-offset for the axis canvas origin
      const AY        = ttH_eff;      // SVG y-offset for the axis canvas origin
      const Y_BASE    = 3;
      const MAJOR_H   = 9;
      const MINOR_H   = 5;
      const TICK_C    = 'rgba(255,255,255,0.45)';
      const MINOR_C   = 'rgba(255,255,255,0.25)';
      const TEXT_C    = 'rgba(242,241,230,0.80)';
      const TEXT_DIM  = 'rgba(242,241,230,0.45)';
      const afs       = ar._fontSize;
      const afsMinor  = Math.max(6, afs - 2);
      // Approximate monospace character width for overlap guard
      const approxW   = (label, fsize) => label.length * fsize * 0.57;

      const { leftVal, rightVal } = ar._valueDomain();
      const minVal = Math.min(leftVal, rightVal);
      const maxVal = Math.max(leftVal, rightVal);
      const targetMajor = Math.max(2, Math.round((plotRight - plotLeft) / 90));

      let majorTicks, minorTicks;
      if (ar._dateMode) {
        const majI = ar._majorInterval, minI = ar._minorInterval;
        majorTicks = majI === 'auto'
          ? AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor)
          : AxisRenderer._calendarTicksForInterval(minVal, maxVal, majI);
        if (minI === 'off') {
          minorTicks = [];
        } else {
          const all = minI === 'auto'
            ? AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor * 5)
            : AxisRenderer._calendarTicksForInterval(minVal, maxVal, minI);
          const ms = new Set(majorTicks.map(t => t.toFixed(8)));
          minorTicks = all.filter(t => !ms.has(t.toFixed(8)));
        }
      } else {
        majorTicks = AxisRenderer._niceTicks(leftVal, rightVal, targetMajor);
        const minorAll = majorTicks.length > 1
          ? AxisRenderer._niceTicks(leftVal, rightVal, targetMajor * 5) : [];
        const ms = new Set(majorTicks.map(t => t.toPrecision(10)));
        minorTicks = minorAll.filter(t => !ms.has(t.toPrecision(10)));
      }

      // Baseline
      axisParts.push(`<line x1="${f(plotLeft + AX)}" y1="${f(AY + Y_BASE + 0.5)}" x2="${f(plotRight + AX)}" y2="${f(AY + Y_BASE + 0.5)}" stroke="${TICK_C}" stroke-width="1"/>`);

      const minorLabelFmt  = ar._dateMode ? ar._minorLabelFormat : 'off';
      const showMinorLabel = minorLabelFmt !== 'off';
      let minorLabelRight  = -Infinity;

      for (const val of minorTicks) {
        const sx = ar._valToScreenX(val) + AX;
        if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
        axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MINOR_H)}" stroke="${MINOR_C}" stroke-width="1"/>`);
        if (showMinorLabel) {
          const label = ar._formatDateVal(val, minorLabelFmt, ar._minorInterval);
          const tw    = approxW(label, afsMinor);
          const lx2   = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(plotRight + AX - tw / 2 - 1, sx));
          if (lx2 - tw / 2 > minorLabelRight + 2) {
            axisParts.push(`<text x="${f(lx2)}" y="${f(AY + Y_BASE + 1 + MINOR_H + 2)}" dominant-baseline="hanging" text-anchor="middle" font-family="monospace" font-size="${afsMinor}px" fill="${TEXT_DIM}">${_svgTextEsc(label)}</text>`);
            minorLabelRight = lx2 + tw / 2;
          }
        }
      }

      const majorLabelFmt  = ar._dateMode ? ar._majorLabelFormat : 'auto';
      const showMajorLabel = majorLabelFmt !== 'off';
      let majorLabelRight  = -Infinity;

      for (const val of majorTicks) {
        const sx = ar._valToScreenX(val) + AX;
        if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
        axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MAJOR_H)}" stroke="${TICK_C}" stroke-width="1"/>`);
        if (showMajorLabel) {
          let label;
          if (ar._dateMode) {
            label = majorLabelFmt === 'auto'
              ? AxisRenderer._formatDecYear(val, majorTicks)
              : ar._formatDateVal(val, majorLabelFmt, ar._majorInterval);
          } else {
            label = AxisRenderer._formatValue(val);
          }
          const tw  = approxW(label, afs);
          const lx2 = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(plotRight + AX - tw / 2 - 1, sx));
          if (lx2 - tw / 2 > majorLabelRight + 2) {
            axisParts.push(`<text x="${f(lx2)}" y="${f(AY + Y_BASE + 1 + MAJOR_H + 2)}" dominant-baseline="hanging" text-anchor="middle" font-family="monospace" font-size="${afs}px" fill="${TEXT_C}">${_svgTextEsc(label)}</text>`);
            majorLabelRight = lx2 + tw / 2;
          }
        }
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${totalW}" height="${totalH_eff}" viewBox="0 0 ${totalW} ${totalH_eff}">
  <defs>
    ${defs.join('\n    ')}
  </defs>
  ${bgParts.join('\n  ')}
  ${legendParts.join('\n  ')}
  <g clip-path="url(#tc)" stroke="${_esc(bc)}" stroke-width="${bw}" fill="none" stroke-linecap="round">
    ${branchParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${bgNodeParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${bgTipParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${fgNodeParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${fgTipParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${labelParts.join('\n    ')}
  </g>
  ${axisParts.join('\n  ')}
</svg>`;
  }

  /** Repopulate annotation dropdowns (tipColourBy, nodeColourBy, legendAnnotEl) after schema change. */
  function _refreshAnnotationUIs(schema) {
    function repopulate(sel, isLegend = false) {
      const prev = sel.value;
      // Remove everything after the first static option (user colour / (none)).
      while (sel.options.length > 1) sel.remove(1);
      for (const [name, def] of schema) {
        if (name === 'user_colour') continue; // static first option already in HTML
        if (def.dataType !== 'list') {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = name;
          sel.appendChild(opt);
        }
      }
      sel.disabled = false;
      // Restore previous selection if still available; legend falls back to '' (none), colour-by to user_colour.
      sel.value = [...sel.options].some(o => o.value === prev) ? prev
                  : (isLegend ? '' : 'user_colour');
    }
    repopulate(tipColourBy);
    repopulate(nodeColourBy);
    repopulate(labelColourBy);
    repopulate(legendAnnotEl, /*isLegend*/ true);
    // Sync clear-user-colour button: enabled only when at least one node has been coloured.
    if (btnClearUserColour) {
      btnClearUserColour.disabled = !schema.has('user_colour');
      _setMenuEnabled('tree-clear-colours', schema.has('user_colour'));
    }
  }

  // ── Tree loading ──────────────────────────────────────────────────────────

  let graph            = null;  // PhyloGraph (adjacency-list model)
  let controlsBound    = false;
  let _cachedMidpoint  = null;  // cached midpointRootGraph() result; cleared on every tree change
  let isExplicitlyRooted = false; // true when root node carries annotations — rerooting disabled
  let _loadedFilename  = null;  // filename of the most recently loaded tree

  // ── Axis subtree-tracking state ───────────────────────────────────────────
  let _axisIsTimedTree = false;

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

      // Disable reroot / midpoint-root for explicitly rooted trees.
      // (bindControls may not have run yet on first load; the selector always works.)
      const btnMPR = document.getElementById('btn-midpoint-root');
      btnMPR.disabled = isExplicitlyRooted;
      btnMPR.title    = isExplicitlyRooted
        ? 'Tree is explicitly rooted (root has annotations) — rerooting disabled'
        : 'Midpoint root (⌘M)';
      const btnRR = document.getElementById('btn-reroot');
      if (isExplicitlyRooted) {
        btnRR.disabled = true;
        btnRR.title    = 'Tree is explicitly rooted (root has annotations) — rerooting disabled';
      } else {
        btnRR.title = 'Reroot tree at selection';
      }

      // Populate the "Colour by" dropdowns. user_colour is always the first option.
      const schema = graph.annotationSchema;
      function _populateColourBy(sel) {
        while (sel.options.length > 0) sel.remove(0);
        const uc = document.createElement('option');
        uc.value = 'user_colour'; uc.textContent = 'user colour';
        sel.appendChild(uc);
        for (const [name, def] of schema) {
          if (name === 'user_colour') continue;
          if (def.dataType !== 'list') {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            sel.appendChild(opt);
          }
        }
        sel.disabled = false;
        sel.value = 'user_colour';
      }
      _populateColourBy(tipColourBy);
      _populateColourBy(nodeColourBy);
      _populateColourBy(labelColourBy);

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
      if (btnClearUserColour) {
        btnClearUserColour.disabled = !schema.has('user_colour');
        _setMenuEnabled('tree-clear-colours', schema.has('user_colour'));
      }

      // Annotation-dependent settings:  file-embedded settings take priority over saved prefs.
      const _eff = _fileSettings || _saved;
      const _hasOpt = (sel, key) => key && [...sel.options].some(o => o.value === key);
      tipColourBy.value   = _hasOpt(tipColourBy,   _eff.tipColourBy)      ? _eff.tipColourBy      : 'user_colour';
      nodeColourBy.value  = _hasOpt(nodeColourBy,  _eff.nodeColourBy)     ? _eff.nodeColourBy     : 'user_colour';
      labelColourBy.value = _hasOpt(labelColourBy, _eff.labelColourBy)    ? _eff.labelColourBy    : 'user_colour';
      legendAnnotEl.value = _hasOpt(legendAnnotEl, _eff.legendAnnotation) ? _eff.legendAnnotation : '';
      // Restore node order.
      if (_eff.nodeOrder === 'asc' || _eff.nodeOrder === 'desc') {
        const asc = _eff.nodeOrder === 'asc';
        reorderGraph(graph, asc);
        currentOrder = _eff.nodeOrder;
      }

      // Pass schema to the renderer so it can build colour scales.
      renderer.setAnnotationSchema(schema);
      renderer.setTipColourBy(tipColourBy.value     || null);
      renderer.setNodeColourBy(nodeColourBy.value   || null);
      renderer.setLabelColourBy(labelColourBy.value || null);
      applyLegend();   // rebuild legend with new data (may clear it)
      const layout = computeLayoutFromGraph(graph);
      renderer.setData(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      // ── Axis renderer setup ───────────────────────────────────────────────
      // Detect time-scaled tree: root AND all nodes must carry a 'height' annotation.
      const _isTimedTree = (graph.root.annotations && 'height' in graph.root.annotations) &&
                           graph.nodes.every(n => 'height' in n.annotations);
      // For timed trees, root height = layout.maxX (root sits at x=0, most divergent tip at x=maxX).
      const _rootHeight  = _isTimedTree ? layout.maxX : 0;
      axisRenderer.setTreeParams({ maxX: layout.maxX, isTimedTree: _isTimedTree, rootHeight: _rootHeight });

      // Populate date annotation dropdown with all categorical/integer annotations
      // so the user can pick whichever annotation holds their date values.
      while (axisDateAnnotEl.options.length > 1) axisDateAnnotEl.remove(1);
      if (_isTimedTree) {
        for (const [name, def] of schema) {
          if (def.dataType === 'categorical' || def.dataType === 'integer' || def.dataType === 'real') {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            axisDateAnnotEl.appendChild(opt);
          }
        }
      }
      // Show the date row whenever the tree is timed; disable it if no tree loaded.
      axisDateRow.style.display = _isTimedTree ? 'flex' : 'none';
      axisDateAnnotEl.disabled  = !_isTimedTree;

      // Restore date annotation (file settings take priority over saved prefs)
      const _savedAxisDate = _eff.axisDateAnnotation || '';
      const _canRestoreDate = _isTimedTree && _savedAxisDate &&
                              [...axisDateAnnotEl.options].some(o => o.value === _savedAxisDate);
      axisDateAnnotEl.value = _canRestoreDate ? _savedAxisDate : '';
      if (_canRestoreDate) axisRenderer.setDateAnchor(_savedAxisDate, layout.nodeMap, layout.maxX);
      else                 axisRenderer.setDateAnchor(null, layout.nodeMap, layout.maxX);

      // Capture full-tree axis params for subtree-tracking.
      _axisIsTimedTree = _isTimedTree;

      // Show tick-option rows only when a date annotation is actively selected.
      _showDateTickRows(!!axisDateAnnotEl.value);
      // Apply stored (or default) tick options to the renderer.
      applyTickOptions();

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
      if (renderer._onNavChange)          renderer._onNavChange(false, false);
      if (renderer._onBranchSelectChange) renderer._onBranchSelectChange(false);
      if (renderer._onNodeSelectChange)   renderer._onNodeSelectChange(false);

      // Reset tip filter for each tree load
      tipFilterEl.value   = '';
      tipFilterCnt.hidden = true;

      if (!treeLoaded) {
        treeLoaded = true;
        btnImportAnnot.disabled         = false;
        btnExportTree.disabled          = false;
        btnExportGraphic.disabled       = false;
        tipFilterEl.disabled            = false;
        tipColourPickerEl.disabled      = false;
        // Enable tree-interaction toolbar buttons
        document.getElementById('btn-zoom-in').disabled       = false;
        document.getElementById('btn-zoom-out').disabled      = false;
        document.getElementById('btn-fit').disabled           = false;
        document.getElementById('btn-fit-labels').disabled    = false;
        document.getElementById('btn-hyp-up').disabled        = false;
        document.getElementById('btn-hyp-down').disabled      = false;
        document.getElementById('btn-order-asc').disabled     = false;
        document.getElementById('btn-order-desc').disabled    = false;
        document.getElementById('btn-mode-nodes').disabled    = false;
        document.getElementById('btn-mode-branches').disabled = false;
        // Hide the empty-state overlay
        emptyStateEl.classList.add('hidden');
        _setMenuEnabled('import-annot', true);
        _setMenuEnabled('export-tree',  true);
        _setMenuEnabled('export-image', true);
      }

      // Restore interaction mode (file settings take priority).
      renderer.setMode(_eff.mode === 'branches' ? 'branches' : 'nodes');

      // Persist file-embedded settings to localStorage so they survive a reload.
      if (_fileSettings) saveSettings();

      if (!controlsBound) {
        bindControls();
        controlsBound = true;
      }

      // Sync button active states with restored settings.
      document.getElementById('btn-order-asc') .classList.toggle('active', currentOrder === 'desc');
      document.getElementById('btn-order-desc').classList.toggle('active', currentOrder === 'asc');
      const _restoredMode = renderer._mode;
      document.getElementById('btn-mode-nodes')   .classList.toggle('active', _restoredMode === 'nodes');
      document.getElementById('btn-mode-branches').classList.toggle('active', _restoredMode === 'branches');

      closeModal();
    } catch (err) {
      setModalError(err.message);
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
    const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
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
          if (n.isTip && n.name && n.name.toLowerCase().includes(q)) {
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

    // Graph DFS: count visible (non-hidden) tips in the subtree rooted at gStartIdx,
    // treating extraHiddenId as additionally hidden (used to test a hypothetical hide).
    function _graphVisibleTipCount(gStartIdx, gFromIdx, extraHiddenId) {
      let count = 0;
      const stack = [{ ni: gStartIdx, fi: gFromIdx }];
      while (stack.length) {
        const { ni, fi } = stack.pop();
        const gnode = graph.nodes[ni];
        if (graph.hiddenNodeIds.has(gnode.origId) || gnode.origId === extraHiddenId) continue;
        const children = gnode.adjacents.filter(a => a !== fi);
        if (children.length === 0) {
          count++;
        } else {
          for (const c of children) stack.push({ ni: c, fi: ni });
        }
      }
      return count;
    }

    function canHide() {
      if (!graph) return false;
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
            if (_graphVisibleTipCount(adjIdx, subtreeIdx, nodeId) === 0) return false;
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
          if (adj !== nodeB) countA += _graphVisibleTipCount(adj, nodeA, nodeId);
        }
        countB = _graphVisibleTipCount(nodeB, nodeA, nodeId);
      } else {
        // Virtual root between nodeA and nodeB.
        countA = _graphVisibleTipCount(nodeA, nodeB, nodeId);
        countB = _graphVisibleTipCount(nodeB, nodeA, nodeId);
      }
      if (countA === 0 || countB === 0) return false;
      return true;
    }

    // Graph DFS: does the subtree of graphNode (going away from fromIdx) contain
    // any entry in hiddenNodeIds?
    function _graphSubtreeHasHidden(gStartIdx, gFromIdx) {
      const stack = [{ ni: gStartIdx, fi: gFromIdx }];
      while (stack.length) {
        const { ni, fi } = stack.pop();
        for (const adjIdx of graph.nodes[ni].adjacents) {
          if (adjIdx === fi) continue;
          if (graph.hiddenNodeIds.has(graph.nodes[adjIdx].origId)) return true;
          stack.push({ ni: adjIdx, fi: ni });
        }
      }
      return false;
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

    function canShow() {
      if (!graph || !graph.hiddenNodeIds.size) return false;
      const nodeId = _selectedNodeId();
      const viewSubtreeRootId = renderer._viewSubtreeRootId;
      if (viewSubtreeRootId) {
        // Subtree view: only care about hidden nodes within this subtree.
        const subtreeIdx = graph.origIdToIdx.get(viewSubtreeRootId);
        if (subtreeIdx === undefined) return false;
        const fromIdx = graph.nodes[subtreeIdx].adjacents[0] ?? -1;
        if (!nodeId) return _graphSubtreeHasHidden(subtreeIdx, fromIdx);
        const gs = _resolveGraphStart(nodeId);
        if (!gs) return false;
        return _graphSubtreeHasHidden(gs.gIdx, gs.gFromIdx);
      }
      // Full tree view.
      if (!nodeId) return true; // no selection — any hidden nodes count
      const gs = _resolveGraphStart(nodeId);
      if (!gs) return graph.hiddenNodeIds.size > 0; // virtual root — any hidden counts
      return _graphSubtreeHasHidden(gs.gIdx, gs.gFromIdx);
    }
    const btnMidpointRoot  = document.getElementById('btn-midpoint-root');
    // isExplicitlyRooted is read dynamically (closured from outer scope) so
    // subsequent tree loads automatically pick up the new value.
    btnMidpointRoot.disabled = isExplicitlyRooted;
    _setMenuEnabled('tree-midpoint', !isExplicitlyRooted);
    document.getElementById('btn-zoom-in') .addEventListener('click', () => renderer.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => renderer.zoomOut());
    document.getElementById('btn-hyp-up')  .addEventListener('click', () => renderer.hypMagUp());
    document.getElementById('btn-hyp-down').addEventListener('click', () => renderer.hypMagDown());

    renderer._onNavChange = (canBack, canFwd) => {
      btnBack.disabled    = !canBack;
      btnForward.disabled = !canFwd;
      btnHome.disabled    = !renderer._viewSubtreeRootId;
      _setMenuEnabled('view-back',    canBack);
      _setMenuEnabled('view-forward', canFwd);
      _setMenuEnabled('view-home',    !!renderer._viewSubtreeRootId);
    };

    renderer._onBranchSelectChange = (hasSelection) => {
      if (renderer._mode === 'branches') {
        btnReroot.disabled = isExplicitlyRooted || !hasSelection;
        _setMenuEnabled('tree-reroot', !btnReroot.disabled);
      }
    };
    renderer._onNodeSelectChange = (hasSelection) => {
      if (renderer._mode === 'nodes') {
        btnReroot.disabled = isExplicitlyRooted || !hasSelection;
        _setMenuEnabled('tree-reroot', !btnReroot.disabled);
      }
      // Rotate is enabled whenever there is any selection in nodes mode.
      const canRotate = renderer._mode === 'nodes' && hasSelection;
      btnRotate.disabled    = !canRotate;
      btnRotateAll.disabled = !canRotate;
      btnHide.disabled      = !canHide();
      btnShow.disabled      = !canShow();
      btnNodeInfo.disabled        = !graph;  // enabled whenever a tree is loaded
      _setMenuEnabled('view-info', !!graph);
      btnApplyUserColour.disabled = !hasSelection;
      _setMenuEnabled('tree-rotate',      canRotate);
      _setMenuEnabled('tree-rotate-all',  canRotate);
      _setMenuEnabled('tree-hide',        !btnHide.disabled);
      _setMenuEnabled('tree-show',        !btnShow.disabled);
      _setMenuEnabled('tree-paint',       hasSelection);
    };

    btnBack.addEventListener('click',    () => renderer.navigateBack());
    btnForward.addEventListener('click', () => renderer.navigateForward());
    btnHome.addEventListener('click',    () => renderer.navigateHome());

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
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);

      saveSettings();
    }

    btnRotate.addEventListener('click',    () => applyRotate(false));
    btnRotateAll.addEventListener('click', () => applyRotate(true));

    // ── Hide / Show ───────────────────────────────────────────────────────────
    function applyHide() {
      if (!canHide()) return;
      const nodeId = _selectedNodeId();
      if (!nodeId) return;
      graph.hiddenNodeIds.add(nodeId);
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
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
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
      const layout = computeLayoutFromGraph(graph, renderer._viewSubtreeRootId);
      renderer.setDataAnimated(layout.nodes, layout.nodeMap, layout.maxX, layout.maxY);
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

      const layout = computeLayoutFromGraph(graph);
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
      if (btnMidpointRoot.disabled) return;
      if (!_cachedMidpoint) _cachedMidpoint = midpointRootGraph(graph);
      const { childNodeId, distFromParent } = _cachedMidpoint;
      _cachedMidpoint = null;  // tree is about to change — old result is no longer valid
      applyReroot(childNodeId, distFromParent);
    }

    btnMidpointRoot.addEventListener('click', () => applyMidpointRoot());

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
          ? [...schema.keys()].filter(k => k !== 'user_colour')
          : [];

        const rows = [];
        if (_loadedFilename)  rows.push(['File',            _loadedFilename]);
        rows.push(['Tips',             totalTips]);
        rows.push(['Internal nodes',   totalInner]);
        if (hiddenCount > 0) rows.push(['Hidden nodes', hiddenCount]);
        if (visibleTips !== totalTips) rows.push(['Visible tips', visibleTips]);
        rows.push(['Root-to-tip span', renderer.maxX.toFixed(6)]);
        rows.push(['Rooted',           isExplicitlyRooted ? 'Yes' : 'No']);
        if (_axisIsTimedTree) rows.push(['Time-scaled', 'Yes']);
        if (annotKeys.length > 0) {
          rows.push(['Annotations', annotKeys.join(', ')]);
        }

        const titleEl = document.getElementById('node-info-title');
        titleEl.textContent = 'Tree';

        const body = document.getElementById('node-info-body');
        const tbl  = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;';
        for (const [label, value] of rows) {
          const tr = tbl.insertRow();
          if (label === null) {
            const td = tr.insertCell();
            td.colSpan = 2;
            td.style.cssText = 'padding:6px 0 2px;';
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:6px;color:rgba(230,213,149,0.5);font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;';
            div.innerHTML = '<span style="flex:0 0 auto">Annotations</span><span style="flex:1;border-top:1px solid rgba(230,213,149,0.2);display:inline-block"></span>';
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
        overlay.style.display = 'flex';
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
      if (!node.isTip) {
        const tipCount = renderer._getDescendantTipIds
          ? renderer._getDescendantTipIds(node.id).length
          : '—';
        rows.push(['Tips below', tipCount]);
      }
      const annots = node.annotations || {};
      const annotEntries = Object.entries(annots);
      if (annotEntries.length > 0) {
        rows.push([null, null]); // divider
        for (const [k, v] of annotEntries) {
          let display;
          if (Array.isArray(v)) {
            display = `{${v.map(x => (typeof x === 'number' ? x.toFixed(6) : String(x))).join(', ')}}`;
          } else if (typeof v === 'number') {
            display = v.toFixed(6);
          } else {
            display = String(v);
          }
          rows.push([k, display]);
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
      overlay.style.display = 'flex';
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
      document.getElementById('node-info-overlay').style.display = 'none';
    });

    document.getElementById('node-info-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('node-info-overlay')) {
        document.getElementById('node-info-overlay').style.display = 'none';
      }
    });

    window.addEventListener('keydown', e => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); applyOrder(false); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); applyOrder(true);  }
      if (e.key === '[' || e.key === '<') { e.preventDefault(); renderer.navigateBack(); }
      if (e.key === ']' || e.key === '>') { e.preventDefault(); renderer.navigateForward(); }
      if (e.key === '\\')                 { e.preventDefault(); renderer.navigateHome(); }
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
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); showNodeInfo(); }
    });
  }

  // ── Always-active bindings ────────────────────────────────────────────────

  themeSelect.addEventListener('change', () => {
    if (themeSelect.value !== 'custom') applyTheme(themeSelect.value);
  });

  canvasBgColorEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setBgColor(canvasBgColorEl.value);
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

  labelColorEl.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setLabelColor(labelColorEl.value);
    saveSettings();
  });

  tipSlider.addEventListener('input', () => {
    _markCustomTheme();
    renderer.setTipRadius(parseInt(tipSlider.value));
    saveSettings();
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
    saveSettings();
  });

  tipColourBy.addEventListener('change', () => {
    renderer.setTipColourBy(tipColourBy.value || null);
    saveSettings();
  });

  labelColourBy.addEventListener('change', () => {
    renderer.setLabelColourBy(labelColourBy.value || null);
    saveSettings();
  });

  // ── Legend controls ───────────────────────────────────────────────────────

  function applyLegend() {
    const pos = legendShowEl.value;   // 'off' | 'left' | 'right'
    const key = legendAnnotEl.value || null;
    const W   = 180;   // legend canvas width in CSS pixels

    legendLeftCanvas.style.display  = pos === 'left'  ? 'block' : 'none';
    legendLeftCanvas.style.width    = W + 'px';
    legendRightCanvas.style.display = pos === 'right' ? 'block' : 'none';
    legendRightCanvas.style.width   = W + 'px';

    renderer.setLegend(pos === 'off' ? null : pos, key);
    saveSettings();
  }

  legendShowEl .addEventListener('change', applyLegend);
  legendAnnotEl.addEventListener('change', applyLegend);

  // ── Axis controls ─────────────────────────────────────────────────────────

  function applyAxis() {
    const on = axisShowEl.value === 'on';
    axisCanvas.style.display = on ? 'block' : 'none';
    axisRenderer.setVisible(on);
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
  }

  axisShowEl.addEventListener('change', applyAxis);

  // ── Minor-interval options (depend on major) ──────────────────────────────

  function _updateMinorOptions(majorVal, keepVal) {
    const opts = {
      auto:     [['off','Off'],['auto','Auto']],
      decades:  [['off','Off'],['auto','Auto'],['years','Years'],['quarters','Quarters'],['months','Months']],
      years:    [['off','Off'],['auto','Auto'],['quarters','Quarters'],['months','Months']],
      quarters: [['off','Off'],['auto','Auto'],['months','Months'],['weeks','Weeks']],
      months:   [['off','Off'],['auto','Auto'],['weeks','Weeks'],['days','Days']],
      weeks:    [['off','Off'],['auto','Auto'],['days','Days']],
      days:     [['off','Off']],
    };
    const list = opts[majorVal] || [['off','Off'],['auto','Auto']];
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

  axisDateAnnotEl.addEventListener('change', () => {
    const key = axisDateAnnotEl.value || null;
    axisRenderer.setDateAnchor(key, renderer.nodeMap || new Map(), renderer.maxX);
    // If currently viewing a subtree, recompute its params using the new anchor.
    if (renderer._viewSubtreeRootId && renderer._onLayoutChange) {
      renderer._onLayoutChange(renderer.maxX, renderer._viewSubtreeRootId);
    }
    _showDateTickRows(!!key);
    axisRenderer.update(
      renderer.scaleX, renderer.offsetX, renderer.paddingLeft,
      renderer.labelRightPad, renderer.bgColor, renderer.fontSize,
      window.devicePixelRatio || 1,
    );
    saveSettings();
  });

  btnFit.addEventListener('click', () => renderer.fitToWindow());
  document.getElementById('btn-fit-labels').addEventListener('click', () => renderer.fitLabels());

  // Open button and file-level keyboard shortcuts
  document.getElementById('btn-open-tree').addEventListener('click', () => openModal());
  window.addEventListener('keydown', e => {
    if (!e.metaKey && !e.ctrlKey) return;
    if (e.altKey) return;   // leave alt-modified combos free for other handlers
    const k = e.key.toLowerCase();
    if (!e.shiftKey) {
      // Plain Cmd/Ctrl shortcuts
      if (k === 'o') {
        e.preventDefault();
        openModal();
      } else if (k === 's') {
        if (!treeLoaded) return;
        e.preventDefault();
        btnExportTree.click();
      } else if (k === 'e') {
        if (!treeLoaded) return;
        e.preventDefault();
        btnExportGraphic.click();
      }
    } else {
      // Cmd/Ctrl + Shift shortcuts
      if (k === 'o') {
        if (!treeLoaded) return;
        e.preventDefault();
        btnImportAnnot.click();
      }
    }
  });

  // ── Native menu bridge (Tauri only) ─────────────────────────────────────
  // window.__TAURI__ is available when withGlobalTauri:true is set in tauri.conf.json.
  // The guard means this code is silently skipped when running in a plain browser.

  // Sync native menu item enabled state with toolbar button state.
  // Initialised to a no-op so bindControls() can call it unconditionally;
  // replaced below with the real invoke-based helper when running under Tauri.
  let _setMenuEnabled = () => {};

  if (window.__TAURI__?.event) {
    // Use a Tauri command to enable/disable native menu items.
    // invoke() is always available under withGlobalTauri and needs no extra capabilities.
    if (window.__TAURI__?.core?.invoke) {
      _setMenuEnabled = (id, enabled) => {
        window.__TAURI__.core.invoke('set_menu_item_enabled', { id, enabled }).catch(() => {});
      };
    }

    window.__TAURI__.event.listen('menu-event', ({ payload: id }) => {
      switch (id) {
        // ── File menu ────────────────────────────────────────────────────────
        case 'open-file':  pickTreeFile();                                        break;
        case 'open-tree':  document.getElementById('btn-open-tree').click();       break;
        case 'import-annot': document.getElementById('btn-import-annot').click();   break;
        case 'export-tree':  document.getElementById('btn-export-tree').click();    break;
        case 'export-image': document.getElementById('btn-export-graphic').click(); break;
        case 'show-help':    document.getElementById('btn-help').click();           break;
        // ── View menu ────────────────────────────────────────────────────────
        case 'view-back':       document.getElementById('btn-back').click();        break;
        case 'view-forward':    document.getElementById('btn-forward').click();     break;
        case 'view-home':       document.getElementById('btn-home').click();        break;
        case 'view-zoom-in':    document.getElementById('btn-zoom-in').click();     break;
        case 'view-zoom-out':   document.getElementById('btn-zoom-out').click();    break;
        case 'view-fit':        document.getElementById('btn-fit').click();         break;
        case 'view-fit-labels': document.getElementById('btn-fit-labels').click();  break;
        case 'view-info':       document.getElementById('btn-node-info').click();   break;
        // ── Tree menu ────────────────────────────────────────────────────────
        case 'tree-rotate':        document.getElementById('btn-rotate').click();            break;
        case 'tree-rotate-all':    document.getElementById('btn-rotate-all').click();        break;
        case 'tree-order-up':      document.getElementById('btn-order-asc').click();         break;
        case 'tree-order-down':    document.getElementById('btn-order-desc').click();        break;
        case 'tree-reroot':        document.getElementById('btn-reroot').click();            break;
        case 'tree-midpoint':      document.getElementById('btn-midpoint-root').click();     break;
        case 'tree-hide':          document.getElementById('btn-hide').click();              break;
        case 'tree-show':          document.getElementById('btn-show').click();              break;
        case 'tree-paint':         document.getElementById('btn-apply-user-colour').click(); break;
        case 'tree-clear-colours': document.getElementById('btn-clear-user-colour').click(); break;
        // ── Edit menu ────────────────────────────────────────────────────────
        case 'select-all': {
          // If focus is inside a text input let the OS handle it natively
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
          break;
        }
      }
    });
  }

})();

