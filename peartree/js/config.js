/** Path to the bundled example tree, relative to the peartree/ directory. */
export const EXAMPLE_TREE_PATH = 'data/ebov.tree';

/** Root URL of the deployed site — used as a fallback when a relative path
 *  fails (e.g. when the HTML file is opened directly from disk). */
export const PEARTREE_BASE_URL = 'http://peartree.live/';

export const DEFAULT_SETTINGS = {
  theme:            'Artic',
  fontFamily:       'Monospace',
  canvasBgColor:    '#ffffff',
  branchColor:      '#444444',
  branchWidth:      '1',
  fontSize:         '11',
  labelColor:       '#000000',
  tipSize:          '2',
  tipHaloSize:      '1',
  tipShapeColor:    '#ffffff',
  tipShapeBgColor:  '#000000',
  tipOutlineColor:  '#033940',
  nodeSize:         '0',
  nodeHaloSize:     '1',
  nodeShapeColor:   '#000000',
  nodeShapeBgColor: '#000000',
  axisColor:        '#444444',
  legendTextColor:  '#444444',
  selectedLabelStyle:   'bold',
  selectedTipStrokeColor:       '#ffffff',
  selectedTipFillColor:         '#ffffff',
  selectedTipGrowthFactor:      '1.5',
  selectedTipMinSize:           '5',
  selectedTipFillOpacity:       '0.35',
  selectedTipStrokeWidth:       '0.5',
  selectedTipStrokeOpacity:     '0.5',
  selectedNodeStrokeColor:      '#ffffff',
  selectedNodeFillColor:        '#ffffff',
  selectedNodeGrowthFactor:     '1.5',
  selectedNodeMinSize:          '5',
  selectedNodeFillOpacity:      '0.35',
  selectedNodeStrokeWidth:      '0.5',
  selectedNodeStrokeOpacity:    '0.5',
  tipHoverStrokeColor:          '#f5a700',
  tipHoverFillColor:            '#f5a700',
  tipHoverGrowthFactor:         '1.5',
  tipHoverMinSize:              '5',
  tipHoverFillOpacity:          '0.45',
  tipHoverStrokeWidth:          '0.5',
  tipHoverStrokeOpacity:        '0.5',
  nodeHoverStrokeColor:         '#f5a700',
  nodeHoverFillColor:           '#f5a700',
  nodeHoverGrowthFactor:        '1.5',
  nodeHoverMinSize:             '5',
  nodeHoverFillOpacity:         '0.45',
  nodeHoverStrokeWidth:         '0.5',
  nodeHoverStrokeOpacity:       '0.5',
  axisFontSize:     '9',
  axisFontFamily:   'theme',
  axisLineWidth:    '1',
  legendShow:         'right',
  legendFontSize:     '11',
  legendFontFamily:   'theme',
  axisShow:           'off',
  axisDateAnnotation: '',
  axisDateFormat:     'yyyy-MM-dd',
  axisMajorInterval:    'auto',
  axisMinorInterval:    'off',
  axisMajorLabelFormat: 'partial',
  axisMinorLabelFormat: 'off',
  // Layout geometry (no DOM controls — passed directly to TreeRenderer)
  paddingLeft:    '20',
  paddingRight:   '20',
  paddingTop:     '20',
  paddingBottom:  '20',
  // Legend canvas internal padding (px) — controls spacing inside the legend panel
  legendPadding:   '12',
  // Legend canvas height as % of the canvas area (1–100, pinned to top)
  legendHeightPct: '100',
  // Second legend
  legendAnnotation2: '',
  legend2Position:   'right',   // 'right' (beside L1) | 'below' (stacked under L1)
  legendHeightPct2:  '50',
  // Axis canvas vertical padding (px) — gap above the baseline line
  axisPaddingTop: '3',
  elbowRadius:    '2',
  rootStubLength: '10',
  // Node bars (only shown when tree has 'height' group from BEAST)
  nodeBarsEnabled:    'off',
  nodeBarsColor:      '#444444',
  nodeBarsWidth:      '6',
  nodeBarsShowMedian: 'mean',
  nodeBarsShowRange:  'off',
  // Negative branch lengths
  clampNegBranches:   'off',
  // Tip label layout
  tipLabelAlign:      'off',
  // Tip label shapes (displayed to the left of label text)
  tipLabelShape:             'off',     // 'off' | 'square' | 'circle' | 'block'
  tipLabelShapeSize:         '50',      // 1–100: % of scaleY for square/circle; ×0.1 width factor for block
  tipLabelShapeColor:        '#aaaaaa',
  tipLabelShapeMarginLeft:   '2',
  tipLabelShapeMarginRight:  '3',
  // Extra tip label shapes 2–10 (shown immediately to the right of shape 1; share shape 1's size/colour/margins)
  tipLabelShapesExtra:       ['off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off'],
  tipLabelShapeExtraColourBys: ['user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour', 'user_colour'],
  // Node labels (internal-node annotation labels)
  nodeLabelAnnotation: '',
  nodeLabelPosition:   'right',
  nodeLabelFontSize:   '9',
  nodeLabelColor:      '#aaaaaa',
  nodeLabelSpacing:    '4',
  // Intro animation played when a tree is first loaded.
  // Options: 'y-then-x' | 'x-then-y' | 'simultaneous' | 'from-bottom' | 'from-top' | 'none'
  introAnimation:     'x-then-y',
};
