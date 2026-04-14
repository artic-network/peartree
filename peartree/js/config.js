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
  // Core appearance
  'canvasBgColor', 'branchColor', 'branchWidth', 'elbowRadius',
  'fontSize', 'typeface', 'typefaceStyle', 'labelColor', 'selectedLabelStyle',
  // Tip shape / size
  'tipSize', 'tipHaloSize', 'tipShapeColor', 'tipShapeBgColor',
  // Node shape / size
  'nodeSize', 'nodeHaloSize', 'nodeShapeColor', 'nodeShapeBgColor',
  // Node bars
  'nodeBarsColor',
  // Selected tip state (7)
  'selectedTipStrokeColor', 'selectedTipFillColor', 'selectedTipGrowthFactor',
  'selectedTipMinSize', 'selectedTipFillOpacity', 'selectedTipStrokeWidth', 'selectedTipStrokeOpacity',
  // Selected node state (7)
  'selectedNodeStrokeColor', 'selectedNodeFillColor', 'selectedNodeGrowthFactor',
  'selectedNodeMinSize', 'selectedNodeFillOpacity', 'selectedNodeStrokeWidth', 'selectedNodeStrokeOpacity',
  // Tip hover state (7)
  'tipHoverFillColor', 'tipHoverStrokeColor', 'tipHoverGrowthFactor',
  'tipHoverMinSize', 'tipHoverFillOpacity', 'tipHoverStrokeWidth', 'tipHoverStrokeOpacity',
  // Node hover state (7)
  'nodeHoverFillColor', 'nodeHoverStrokeColor', 'nodeHoverGrowthFactor',
  'nodeHoverMinSize', 'nodeHoverFillOpacity', 'nodeHoverStrokeWidth', 'nodeHoverStrokeOpacity',
  // Axis
  'axisColor', 'axisFontSize', 'axisFontFamily', 'axisFontStyle', 'axisLineWidth',
  // Legend
  'legendTextColor', 'legendFontSize', 'legendFontFamily', 'legendFontStyle',
  // RTT chart colours
  'rttAxisColor', 'rttStatsBgColor', 'rttStatsTextColor', 'rttRegressionColor',
  // Node labels appearance
  'nodeLabelFontSize', 'nodeLabelColor', 'nodeLabelSpacing',
  'nodeLabelTypefaceKey', 'nodeLabelTypefaceStyle',
  // Node bars appearance
  'nodeBarsWidth', 'nodeBarsFillOpacity', 'nodeBarsStrokeOpacity',
  // Clade highlights appearance
  'cladeHighlightStrokeWidth', 'cladeHighlightFillOpacity',
  'cladeHighlightStrokeOpacity', 'cladeHighlightColour',
  // Collapsed clades appearance
  'collapsedCladeFontSize', 'collapsedCladeTypefaceKey', 'collapsedCladeTypefaceStyle',
  // RTT chart appearance
  'rttStatsFontSize', 'rttRegressionStyle', 'rttRegressionWidth',
  'rttAxisFontSize', 'rttAxisTypefaceKey', 'rttAxisTypefaceStyle', 'rttAxisLineWidth',
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
  tipLabelAlign:   'names',
  tipLabelSpacing: '3',

  // ── Label Shapes ────────────────────────────────────────────────────────────────────
  tipLabelShape:             'off',     // 'off' | 'square' | 'circle' | 'block'
  tipLabelShapeSize:         '50',      // 1–100: % of scaleY for square/circle; ×0.1 width factor for block
  tipLabelShapeColor:        '#aaaaaa',
  tipLabelShapeMarginLeft:   '2',
  tipLabelShapeSpacing:      '3',
  // Extra tip label shapes 2–10 (shown immediately to the right of shape 1; share shape 1's size/colour)
  tipLabelShapesExtra:         ['off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off'],
  tipLabelShapeExtraColourBys: ['user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour'],

  // ── Node Labels ───────────────────────────────────────────────────────────────────
  nodeLabelAnnotation: '',
  nodeLabelPosition:   'right',

  // ── Node Bars ───────────────────────────────────────────────────────────────────────
  // (only shown when tree has 'height' group from BEAST)
  nodeBarsEnabled:    'off',
  nodeBarsShowMedian: 'mean',
  nodeBarsShowRange:  'off',

  // ── Clade Highlights ────────────────────────────────────────────────────────────────
  cladeHighlightLeftEdge:  'hard',
  cladeHighlightRightEdge: 'hardAlign',
  cladeHighlightPadding:   '6',
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
  legend3Position:   'right',
  legendHeightPct3:  '50',
  // Fourth legend
  legendAnnotation4: '',
  legend4Position:   'right',
  legendHeightPct4:  '50',

  // ── Axis ─────────────────────────────────────────────────────────────────────────────
  axisShow:             'off',
  axisDateAnnotation:   '',
  axisDateFormat:       'yyyy-MM-dd',
  axisMajorInterval:    'auto',
  axisMinorInterval:    'off',
  axisMajorLabelFormat: 'partial',
  axisMinorLabelFormat: 'off',

  // ── Root-to-tip ──────────────────────────────────────────────────────────────────────
  rttDateFormat:        'yyyy-MM-dd',
  rttMajorInterval:     'auto',
  rttMinorInterval:     'off',
  rttMajorLabelFormat:  'partial',
  rttMinorLabelFormat:  'off',

  // ── Theme ───────────────────────────────────────────────────────────────────────────
  // Name of the built-in theme that serves as the fully-specified visual base.
  // All other themes are merged on top of this at applyTheme() time, so only
  // this theme needs to define every key in REQUIRED_THEME_KEYS.
  baseTheme: 'Monochrome',
};
