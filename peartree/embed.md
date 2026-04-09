# Embedding PearTree in an HTML Page

PearTree can be embedded directly inside any HTML page using a single JavaScript call. This is ideal for reports, dashboards, or documentation sites where you want to display an interactive phylogenetic tree alongside other content.

---

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 1. Required stylesheets -->
  <link rel="stylesheet" href="peartree/css/bootstrap.min-artic.css" />
  <link rel="stylesheet" href="peartree/vendor/bootstrap-icons/bootstrap-icons.css" />
  <link rel="stylesheet" href="peartree/css/peartree.css" />
  <link rel="stylesheet" href="peartree/css/peartree-embed.css" />
</head>
<body>

  <!-- 2. A container element -->
  <div id="my-tree"></div>

  <!-- 3. Load the embed script -->
  <script src="peartree/js/peartree-embed.js"></script>

  <!-- 4. Initialise -->
  <script>
    PearTreeEmbed.embed({
      container: 'my-tree',
      treeUrl:   'data/my.tree',
      height:    '600px',
      theme:     'dark',
    });
  </script>

</body>
</html>
```

---

## API Reference

### `PearTreeEmbed.embed(options)`

All configuration is passed as a single options object.

---

### Top-level Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `string \| HTMLElement` | *(required)* | Element ID string or a direct DOM element reference. |
| `treeUrl` | `string` | — | URL of the tree file to fetch at runtime (Newick or NEXUS). |
| `tree` | `string` | — | Inline Newick or NEXUS string. Use instead of `treeUrl` to embed tree data directly. |
| `filename` | `string` | — | Optional filename hint (e.g. `'ebov.nexus'`) used for format detection. |
| `height` | `string` | `'600px'` | CSS height of the viewer (e.g. `'500px'`, `'80vh'`). Ignored if the container already has an explicit height set in CSS. |
| `theme` | `string` | `'dark'` | Overall colour theme: `'dark'` or `'light'`. |
| `settings` | `object` | `{}` | Initial visual settings — see [Settings Reference](#settings-reference) below. |
| `ui` | `object` | all `true` | Feature flags to show or hide UI panels — see [UI Flags](#ui-flags) below. |
| `paletteSections` | `string \| string[]` | `'all'` | Which sections to include in the Visual Options panel — see [Palette Sections](#palette-sections) below. |
| `appSections` | `string \| string[]` | `'all'` | Which major HTML sections to include. Keys: `'toolbar'`, `'canvasContainer'`, `'statusBar'`, `'modals'`, `'helpAbout'`, `'palette'`. |
| `toolbarSections` | `string \| string[]` | `'all'` | Which toolbar sub-sections to include. Keys: `'fileOps'`, `'navigation'`, `'zoom'`, `'order'`, `'rotate'`, `'reroot'`, `'hideShow'`, `'colour'`, `'filter'`, `'panels'`. |
| `base` | `string` | *(auto-detected)* | Override the asset root URL. Normally not needed; set only when serving assets from a non-standard path. |

> **Note:** Only one PearTree instance per page is supported. The embed script assigns unique element IDs that cannot be duplicated.

---

## UI Flags

The `ui` object controls which parts of the interface are visible. All flags default to `true`.

```js
PearTreeEmbed.embed({
  container: 'my-tree',
  treeUrl:   'data/my.tree',
  ui: {
    palette:   true,   // Visual Options panel and its toggle button
    openTree:  false,  // "Open tree file" button and import modal
    import:    false,  // Alias for openTree
    export:    true,   // Export tree and export graphic buttons
    rtt:       false,  // Root-to-tip divergence panel
    dataTable: false,  // Data table panel
    statusBar: true,   // Status bar at the bottom
  },
});
```

---

## Palette Sections

When `ui.palette` is enabled, you can restrict which sections appear in the Visual Options panel. Pass `'all'` (the default) or an array of section keys:

```js
PearTreeEmbed.embed({
  container:       'my-tree',
  treeUrl:         'data/my.tree',
  paletteSections: ['tree', 'tipLabels', 'axis', 'theme'],
});
```

Available section keys:

| Key | Description |
|-----|-------------|
| `'tree'` | Branch colour, width, typeface, and background colour |
| `'tipLabels'` | Tip label display, font, and spacing |
| `'labelShapes'` | Coloured shapes shown next to tip labels |
| `'tipShapes'` | Tip marker style, size, and colour |
| `'nodeShapes'` | Internal node marker style, size, and colour |
| `'nodeLabels'` | Internal node annotation labels |
| `'nodeBars'` | Node-bar intervals (BEAST trees only) |
| `'collapsedClades'` | Collapsed clade triangle display |
| `'legend'` | Legend position, font, and annotation |
| `'axis'` | Time/distance axis display |
| `'selectionHover'` | Selected and hovered node highlight colours |
| `'rtt'` | Root-to-tip plot styling |
| `'theme'` | Theme selector |

---

## Settings Reference

The `settings` object sets the initial state of the visual options. All values are strings. Every key listed here maps to a control in the Visual Options panel.

Settings are merged on top of PearTree's defaults, so you only need to specify the values you want to change.

```js
PearTreeEmbed.embed({
  container: 'my-tree',
  treeUrl:   'data/my.tree',
  settings: {

    // ── Tip labels ─────────────────────────────────────────────────────────
    // 'off' | 'names' | '<annotation-key>'
    tipLabelShow:              'names',
    tipLabelSpacing:           '3',       // px gap between tip marker and label
    tipLabelAlign:             'off',     // 'off' | 'on' (right-align all labels)

    // ── Tree appearance ─────────────────────────────────────────────────────
    canvasBgColor:             '#ffffff',
    branchColor:               '#444444',
    branchWidth:               '1',       // px
    fontSize:                  '11',      // tip label font size (px)
    labelColor:                '#000000',
    typeface:                  'Monospace',    // font family key
    typefaceStyle:             'Regular',      // 'Regular' | 'Bold' | 'Italic' | 'Bold Italic'
    elbowRadius:               '2',       // branch elbow rounding (px)
    rootStubLength:            '10',      // length of the root stub (px)
    rootStemPct:               '1',       // root stem as % of tree age (0–20)
    paddingLeft:               '20',      // canvas padding (px)
    paddingRight:              '20',
    paddingTop:                '20',
    paddingBottom:             '20',
    clampNegBranches:          'off',     // 'off' | 'on'
    introAnimation:            'x-then-y', // 'y-then-x' | 'x-then-y' | 'simultaneous' | 'from-bottom' | 'from-top' | 'none'

    // ── Tip markers ────────────────────────────────────────────────────────
    tipSize:                   '2',       // radius (px)
    tipHaloSize:               '1',       // halo width (px)
    tipShapeColor:             '#ffffff',
    tipShapeBgColor:           '#000000',
    tipOutlineColor:           '#033940',

    // ── Node markers ───────────────────────────────────────────────────────
    nodeSize:                  '0',       // radius (px); 0 = hidden
    nodeHaloSize:              '1',
    nodeShapeColor:            '#000000',
    nodeShapeBgColor:          '#000000',

    // ── Tip label shapes ───────────────────────────────────────────────────
    // Coloured shapes drawn to the left of tip label text
    tipLabelShape:             'off',     // 'off' | 'square' | 'circle' | 'block'
    tipLabelShapeSize:         '50',      // 1–100 (% of row height)
    tipLabelShapeColor:        '#aaaaaa',
    tipLabelShapeMarginLeft:   '2',       // px gap left of shape
    tipLabelShapeMarginRight:  '3',       // px gap right of shape
    tipLabelShapeSpacing:      '3',       // px gap between multiple shapes

    // ── Node labels ────────────────────────────────────────────────────────
    nodeLabelAnnotation:       '',        // annotation key to display on nodes
    nodeLabelPosition:         'right',   // 'right' | 'left' | 'above' | 'below'
    nodeLabelFontSize:         '9',
    nodeLabelColor:            '#aaaaaa',
    nodeLabelSpacing:          '4',

    // ── Collapsed clades ───────────────────────────────────────────────────
    collapsedCladeFontSize:    '11',

    // ── Legend ─────────────────────────────────────────────────────────────
    legendShow:                'right',   // 'right' | 'left'
    legendAnnotation2:         '',        // second legend annotation key
    legend2Position:           'right',   // 'right' (beside L1) | 'below' (stacked under L1)
    legendTextColor:           '#444444',
    legendFontSize:            '11',
    legendHeightPct:           '100',     // legend canvas height as % of tree height
    legendHeightPct2:          '50',
    legendPadding:             '12',      // internal legend padding (px)

    // ── Axis ───────────────────────────────────────────────────────────────
    axisShow:                  'off',     // 'off' | 'forward' | 'reverse' | 'time'
    axisColor:                 '#444444',
    axisFontSize:              '9',
    axisLineWidth:             '1',

    // Tick interval options: 'auto' | 'millennia' | 'centuries' | 'decades' |
    //   'years' | 'quarters' | 'months' | 'weeks' | 'days'
    axisMajorInterval:         'auto',
    // Minor tick interval: 'off' | (same options as major, must be finer than major)
    axisMinorInterval:         'off',
    // Label format: 'off' | 'partial' | 'component' | 'full'
    axisMajorLabelFormat:      'partial',
    axisMinorLabelFormat:      'off',

    axisDateFormat:            'yyyy-MM-dd',
    axisDateAnnotation:        '',        // annotation key used for node date positions
    axisPaddingTop:            '3',

    // ── Node bars (BEAST / HPD intervals) ─────────────────────────────────
    nodeBarsEnabled:           'off',     // 'off' | 'on'
    nodeBarsColor:             '#444444',
    nodeBarsWidth:             '6',       // height of the bar in px
    nodeBarsShowMedian:        'mean',    // 'mean' | 'median' | 'off'
    nodeBarsShowRange:         'off',     // 'off' | 'on'

    // ── Selection highlight ────────────────────────────────────────────────
    selectedLabelStyle:        'bold',    // 'normal' | 'bold' | 'italic' | 'bold italic'
    selectedTipStrokeColor:    '#ffffff',
    selectedTipFillColor:      '#ffffff',
    selectedTipGrowthFactor:   '1.5',
    selectedTipMinSize:        '5',
    selectedTipFillOpacity:    '0.35',
    selectedTipStrokeWidth:    '0.5',
    selectedTipStrokeOpacity:  '0.5',
    selectedNodeStrokeColor:   '#ffffff',
    selectedNodeFillColor:     '#ffffff',
    selectedNodeGrowthFactor:  '1.5',
    selectedNodeMinSize:       '5',
    selectedNodeFillOpacity:   '0.35',
    selectedNodeStrokeWidth:   '0.5',
    selectedNodeStrokeOpacity: '0.5',

    // ── Hover highlight ────────────────────────────────────────────────────
    tipHoverStrokeColor:       '#f5a700',
    tipHoverFillColor:         '#f5a700',
    tipHoverGrowthFactor:      '1.5',
    tipHoverMinSize:           '5',
    tipHoverFillOpacity:       '0.45',
    tipHoverStrokeWidth:       '0.5',
    tipHoverStrokeOpacity:     '0.5',
    nodeHoverStrokeColor:      '#f5a700',
    nodeHoverFillColor:        '#f5a700',
    nodeHoverGrowthFactor:     '1.5',
    nodeHoverMinSize:          '5',
    nodeHoverFillOpacity:      '0.45',
    nodeHoverStrokeWidth:      '0.5',
    nodeHoverStrokeOpacity:    '0.5',

    // ── Root-to-tip (RTT) plot ─────────────────────────────────────────────
    rttAxisColor:              '',        // defaults to axisColor
    rttStatsBgColor:           '#081c22',
    rttStatsTextColor:         '#f2f1e6',
    rttRegressionStyle:        'dash',    // 'dash' | 'solid'
    rttRegressionColor:        '',        // defaults to branchColor
    rttRegressionWidth:        '1.5',
    rttAxisFontSize:           '9',
    rttAxisLineWidth:          '1',
    rttDateFormat:             'yyyy-MM-dd',
    rttMajorInterval:          'auto',
    rttMinorInterval:          'off',
    rttMajorLabelFormat:       'partial',
    rttMinorLabelFormat:       'off',

    // ── Theme ───────────────────────────────────────────────────────────────
    theme:                     'Artic',   // built-in theme name (used as a preset baseline)
  },
});
```

---

## Complete Example — Timed Tree in a Report

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Phylogenetic Report</title>

  <link rel="stylesheet" href="peartree/css/bootstrap.min-artic.css" />
  <link rel="stylesheet" href="peartree/vendor/bootstrap-icons/bootstrap-icons.css" />
  <link rel="stylesheet" href="peartree/css/peartree.css" />
  <link rel="stylesheet" href="peartree/css/peartree-embed.css" />

  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; }
    .tree-wrap { border: 1px solid #ccc; border-radius: 6px; overflow: hidden; }
  </style>
</head>
<body>

  <h1>My Phylogenetic Report</h1>
  <p>The tree below shows the evolutionary relationships among the sequenced genomes.</p>

  <div class="tree-wrap">
    <div id="report-tree"></div>
  </div>

  <script src="peartree/js/peartree-embed.js"></script>
  <script>
    PearTreeEmbed.embed({
      container: 'report-tree',
      treeUrl:   'data/my.tree',
      filename:  'my.tree',
      height:    '600px',
      theme:     'dark',

      settings: {
        tipLabelShow:         'names',
        axisShow:             'time',
        axisMajorInterval:    'auto',
        axisMinorInterval:    'auto',
        axisMajorLabelFormat: 'component',
        axisMinorLabelFormat: 'component',
      },

      ui: {
        palette:   false,
        openTree:  false,
        import:    false,
        export:    true,
        rtt:       false,
        dataTable: false,
        statusBar: false,
      },
    });
  </script>

</body>
</html>
```

---

## Notes

- **No localStorage persistence.** When PearTree is loaded via the embed API, settings are never written to `localStorage`. The viewer always starts with the settings you provide.
- **Required stylesheets.** The four CSS files listed in the quick start must all be loaded. `peartree-embed.css` adjusts the layout for embedded use (removes the full-page chrome).
- **Asset path detection.** The embed script auto-detects the location of PearTree's assets from its own `src` path. If you serve assets from a custom location, pass `base: 'https://example.com/peartree/'` as a top-level option.
- **Tree formats.** Both Newick (`.nwk`, `.newick`) and NEXUS (`.nex`, `.nexus`, `.tree`, `.tre`, `.treefile`) formats are supported. Supply `filename` when passing an inline `tree` string so PearTree can choose the correct parser.
