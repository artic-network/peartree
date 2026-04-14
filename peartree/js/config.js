/** Path to the bundled example tree, relative to the peartree/ directory. */
export const EXAMPLE_TREE_PATH = 'data/ebov.tree';

/** Root URL of the deployed site — used as a fallback when a relative path
 *  fails (e.g. when the HTML file is opened directly from disk). */
export const PEARTREE_BASE_URL = 'http://peartree.live/';

/**
 * All property keys that a fully-specified base theme must define.
 * The theme named by DEFAULT_SETTINGS.defaultTheme must contain every key here.
 * Other themes (user themes, non-base built-ins) may be sparse — missing keys
 * are filled in from the base theme at applyTheme() time.
 */
export const REQUIRED_THEME_KEYS = [
  // Tree
  'canvasBgColor',
  // Branches
  'branchColor', 'branchWidth', 'elbowRadius',
  // Tip Labels
  'fontSize', 'labelColor',
  // Label Shapes
  'tipLabelShapeColor',
  // Tip Shapes
  'tipSize', 'tipShapeColor', 'tipHaloSize', 'tipShapeBgColor',
  // Node Shapes
  'nodeSize', 'nodeShapeColor', 'nodeHaloSize', 'nodeShapeBgColor',
  // Node Labels
  'nodeLabelFontSize', 'nodeLabelTypefaceKey', 'nodeLabelTypefaceStyle',
  'nodeLabelColor', 'nodeLabelSpacing',
  // Node Bars
  'nodeBarsColor', 'nodeBarsWidth', 'nodeBarsFillOpacity', 'nodeBarsStrokeOpacity',
  // Clade Highlights
  'cladeHighlightFillOpacity', 'cladeHighlightStrokeOpacity', 'cladeHighlightStrokeWidth',
  'cladeHighlightColour',
  // Collapsed Clades
  'collapsedCladeFontSize', 'collapsedCladeTypefaceKey', 'collapsedCladeTypefaceStyle',
  // Legend
  'legendTextColor', 'legendFontSize', 'legendFontFamily', 'legendFontStyle',
  // Axis
  'axisColor', 'axisFontSize', 'axisTypefaceKey', 'axisTypefaceStyle', 'axisLineWidth',
  // Root-to-tip: regression line
  'rttRegressionStyle', 'rttRegressionColor', 'rttRegressionWidth',
  // Root-to-tip: statistics box
  'rttStatsBgColor', 'rttStatsTextColor', 'rttStatsFontSize',
  // Root-to-tip: axes
  'rttAxisColor', 'rttAxisFontSize', 'rttAxisLineWidth', 'rttAxisTypefaceKey', 'rttAxisTypefaceStyle',
  // Theme (global typeface)
  'typeface', 'typefaceStyle',
  // Selection & Hover: selected tips
  'selectedLabelStyle',
  'selectedTipGrowthFactor', 'selectedTipFillColor', 'selectedTipMinSize',
  'selectedTipFillOpacity', 'selectedTipStrokeColor', 'selectedTipStrokeWidth', 'selectedTipStrokeOpacity',
  // Selection & Hover: MRCA node
  'selectedNodeGrowthFactor', 'selectedNodeFillColor', 'selectedNodeMinSize',
  'selectedNodeFillOpacity', 'selectedNodeStrokeColor', 'selectedNodeStrokeWidth', 'selectedNodeStrokeOpacity',
  // Selection & Hover: tip hover
  'tipHoverGrowthFactor', 'tipHoverFillColor', 'tipHoverMinSize',
  'tipHoverFillOpacity', 'tipHoverStrokeColor', 'tipHoverStrokeWidth', 'tipHoverStrokeOpacity',
  // Selection & Hover: node hover
  'nodeHoverGrowthFactor', 'nodeHoverFillColor', 'nodeHoverMinSize',
  'nodeHoverFillOpacity', 'nodeHoverStrokeColor', 'nodeHoverStrokeWidth', 'nodeHoverStrokeOpacity',
];

export const DEFAULT_SETTINGS = {
  // ── Tree ────────────────────────────────────────────────────────────────────────────
  rootStemPct:    '1',    // whole-tree root-stem length as % of tree age (0–20)
  // Layout geometry (no DOM controls — passed directly to TreeRenderer)
  paddingLeft:    '20',
  paddingRight:   '20',
  paddingTop:     '20',
  paddingBottom:  '20',
  // Axis canvas vertical padding (px) — gap above the baseline line
  axisPaddingTop: '3',
  rootStubLength: '10',
  // Intro animation played when a tree is first loaded.
  // Options: 'y-then-x' | 'x-then-y' | 'simultaneous' | 'from-bottom' | 'from-top' | 'none'
  introAnimation:  'x-then-y',

  // ── Tip Labels ───────────────────────────────────────────────────────────────────
  tipLabelShow:    'names',   // 'off' | 'names' | annotation key
  tipLabelAlign:   'off',    // 'off' | 'aligned' | 'dots' | 'dashed' | 'solid'
  tipLabelSpacing: '3',

  // ── Label Shapes ────────────────────────────────────────────────────────────────────
  tipLabelShape:             'off',     // 'off' | 'square' | 'circle' | 'block'
  tipLabelShapeSize:         '50',      // 1–100: % of scaleY for square/circle; ×0.1 width factor for block
  tipLabelShapeMarginLeft:   '2',
  tipLabelShapeSpacing:      '3',
  // Extra tip label shapes 2–10 (shown immediately to the right of shape 1; share shape 1's size/colour)
  tipLabelShapesExtra:         ['off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off'],
  tipLabelShapeExtraColourBys: ['user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour'],

  // ── Node Labels ───────────────────────────────────────────────────────────────────
  nodeLabelAnnotation: '',          // '' = off | annotation key
  nodeLabelPosition:   'right',     // 'right' | 'above-left' | 'below-left'

  // ── Node Bars ───────────────────────────────────────────────────────────────────────
  // (only shown when tree has 'height' group from BEAST)
  nodeBarsEnabled:    'off',   // 'off' | 'on'
  nodeBarsLine:       'off',   // 'off' | 'mean' | 'median'
  nodeBarsRange:      'off',   // 'off' | 'on'

  // ── Clade Highlights ────────────────────────────────────────────────────────────────
  cladeHighlightLeftEdge:  'outlineNodes', // 'atRoot' | 'outlineNodes'
  cladeHighlightRightEdge: 'outlineTips',  // 'atTips' | 'atLabels' | 'atLabelsRight' | 'outlineTips'
  cladeHighlightPadding:   '4',
  cladeHighlightRadius:    '4',

  // ── Legend ───────────────────────────────────────────────────────────────────────────
  // Legend canvas internal padding (px) — controls spacing inside the legend panel
  legendPadding:   '12',
  // Legend canvas height as % of the canvas area (1–100, pinned to top)
  legendHeightPct: '100',
  // Second legend
  legendAnnotation2: '',
  legend2Position:   'right',   // 'right' (beside L1) | 'below' (stacked under L1)
  legendHeightPct2:  '50',
  // Third legend
  legendAnnotation3: '',
  legend3Position:   'right',  // 'right' (beside L2) | 'below' (stacked under L2)
  legendHeightPct3:  '50',
  // Fourth legend
  legendAnnotation4: '',
  legend4Position:   'right',  // 'right' (beside L3) | 'below' (stacked under L3)
  legendHeightPct4:  '50',

  // ── Axis ─────────────────────────────────────────────────────────────────────────────
  axisShow:             'forward',  // 'off' | 'forward' | 'reverse' | 'time'
  axisDateAnnotation:   '',         // '' = none | annotation key (used when axisShow = 'time')
  axisDateFormat:       'yyyy-MM-dd',
  axisMajorInterval:    'auto',     // 'auto' | 'millennia' | 'centuries' | 'decades' | 'years' | 'quarters' | 'months' | 'weeks' | 'days'
  axisMinorInterval:    'off',      // 'off' | same values as axisMajorInterval (populated dynamically)
  axisMajorLabelFormat: 'partial',  // 'component' | 'partial' | 'full' | 'off'
  axisMinorLabelFormat: 'off',      // 'component' | 'partial' | 'full' | 'off'

  // ── Root-to-tip ──────────────────────────────────────────────────────────────────────
  rttDateFormat:        'yyyy-MM-dd',
  rttMajorInterval:     'auto',     // 'auto' | 'millennia' | 'centuries' | 'decades' | 'years' | 'quarters' | 'months' | 'weeks' | 'days'
  rttMinorInterval:     'off',      // 'off' | same values as rttMajorInterval (populated dynamically)
  rttMajorLabelFormat:  'partial',  // 'component' | 'partial' | 'full' | 'off'
  rttMinorLabelFormat:  'off',      // 'component' | 'partial' | 'full' | 'off'

  // ── Panels ──────────────────────────────────────────────────────────────────────────
  // Whether each panel is visible (open) and/or pinned (docked) at startup.
  dataTableOpen:   false,   // true = Data Table panel starts open
  dataTablePinned: false,   // true = Data Table panel is pinned (docked; implies open)
  rttOpen:         false,   // true = Root-to-Tip panel starts open
  rttPinned:       false,   // true = Root-to-Tip panel is pinned (docked; implies open)
  paletteOpen:     false,   // true = Settings panel starts open
  palettePinned:   false,   // true = Settings panel is pinned (docked; implies open)

  // ── Theme ───────────────────────────────────────────────────────────────────────────
  // Name of the built-in theme that serves as the fully-specified visual base.
  // All other themes are merged on top of this at applyTheme() time, so only
  // this theme needs to define every key in REQUIRED_THEME_KEYS.
  baseTheme: 'Monochrome',
};
