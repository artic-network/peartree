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
      ui: { theme: 'dark' },
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
| `settings` | `object` | `{}` | Initial visual settings — see [Settings Reference](#settings-reference) below. |
| `ui` | `object` | — | Feature flags and layout options — see [UI Options](#ui-options) below. |
| `dataTableColumns` | `string[]` | — | Restrict which annotation columns appear in the data table. See [Data Table Columns](#data-table-columns). |
| `nodeLabelName` | `string` | — | Annotation key to use for internal node labels (e.g. `'bootstrap'`). |
| `paletteSections` | `string \| string[]` | `'all'` | Which sections to include in the Visual Options panel — see [Palette Sections](#palette-sections) below. |
| `appSections` | `string \| string[]` | `'all'` | Which major HTML sections to include. Keys: `'toolbar'`, `'canvasContainer'`, `'statusBar'`, `'modals'`, `'helpAbout'`, `'palette'`. |
| `base` | `string` | *(auto-detected)* | Override the asset root URL. Normally not needed; set only when serving assets from a non-standard path. |

> **Multiple instances.** Multiple independent PearTree instances can be embedded on the same page. Each `embed()` call is fully scoped to its own container element.

---

## UI Options

The `ui` object controls which parts of the interface are visible and configures panel layout. All boolean flags default to `true`.

```js
PearTreeEmbed.embed({
  container: 'my-tree',
  treeUrl:   'data/my.tree',
  ui: {
    // ── Colour theme ───────────────────────────────────────────
    theme:       'dark',     // Bootstrap wrapper theme: 'dark' | 'light'

    // ── Major panels ───────────────────────────────────────────
    palette:     true,       // Visual Options panel and its toggle button
    toolbar:     true,       // Toolbar strip across the top
    statusBar:   true,       // Status bar at the bottom

    // ── File operations ────────────────────────────────────────
    openTree:    true,       // "Open tree file" button and import modal
    import:      true,       // Alias for openTree (linked: setting one sets both)
    export:      true,       // Export tree and export graphic buttons

    // ── Root-to-tip panel ──────────────────────────────────────
    rtt:         true,       // true | false | 'fixed'
    rttWidth:    35,         // panel width when rtt:'fixed', as % of container
    rttHeader:   true,       // show the RTT panel header bar (pin, close, title, action buttons)

    // ── Data table panel ───────────────────────────────────────
    dataTable:      true,    // true | false | 'fixed'
    dataTableWidth: 30,      // panel width when dataTable:'fixed', as % of container
    dataTableHeader:true,    // show the data table header bars (column labels + pin/close buttons)

    // ── Toolbar contents ───────────────────────────────────────
    toolbarSections: 'all',  // 'all' | string[] — see Toolbar Sections below

    // ── Status bar contents ────────────────────────────────────
    keyboard:    true,       // enable keyboard shortcuts
    help:        true,       // Help button in status bar
    about:       true,       // About button in status bar
    themeToggle: true,       // dark/light toggle in status bar
    brand:       true,       // PearTree brand link in status bar
  },
});
```

### Panel Modes: `true`, `false`, and `'fixed'`

The `rtt` and `dataTable` flags accept three values:

| Value | Behaviour |
|-------|-----------|
| `true` *(default)* | Panel is available; user can open and close it with toolbar buttons. |
| `false` | Panel is hidden entirely; no toolbar button is shown. |
| `'fixed'` | Panel is permanently open and pinned at the configured width. The pin, close, and toolbar toggle buttons are all hidden. |

When `'fixed'`, use `rttWidth` or `dataTableWidth` to set the panel size as a percentage of the container width (default: `35` and `30` respectively). Both accept a number (treated as `%`) or a CSS string such as `'40%'`.

### Hiding Panel Header Bars

Set `rttHeader: false` to hide the RTT panel's header bar (which contains the pin, close, title, download, image, and statistics buttons). This is useful when the panel is in `'fixed'` mode and you want a cleaner layout.

Set `dataTableHeader: false` to hide both the column-label row and the pin/close button column of the data table.

---

## Toolbar Sections

`ui.toolbarSections` controls which groups of buttons appear in the toolbar. Pass `'all'` (default) or an array of section keys to include only specific groups.

```js
ui: {
  toolbar:         true,
  toolbarSections: ['navigation', 'zoom', 'order'],
}
```

Available section keys, in display order:

| Key | Buttons |
|-----|---------|
| `'fileOps'` | Open tree, import annotations, export tree, export graphic |
| `'annotations'` | Curate annotations |
| `'nodeInfo'` | Get node/tip info |
| `'navigation'` | Fit tree, fit labels, scroll to root, scroll to tips |
| `'zoom'` | Zoom in, zoom out |
| `'order'` | Sort ascending, sort descending |
| `'rotate'` | Rotate branches |
| `'reroot'` | Reroot on selected, midpoint root |
| `'hideShow'` | Show/hide taxa |
| `'colour'` | Colour palette picker |
| `'filter'` | Filter/search bar |
| `'panels'` | RTT panel toggle, data table toggle |

---

## Data Table Columns

By default the data table shows all annotation columns present in the tree file. Use `dataTableColumns` to restrict it to a specific ordered set:

```js
PearTreeEmbed.embed({
  container: 'my-tree',
  treeUrl:   'data/my.tree',
  dataTableColumns: ['__names__', 'location', 'date'],
});
```

The special key `'__names__'` represents the tip name column. All other keys are annotation names from the tree file. Columns are displayed in the order listed.

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
    tipLabelAlign:             'off',     // 'off' | 'aligned' | 'dashed' | 'dots' | 'solid'
                                          //   'off'     — labels positioned at their tip (default)
                                          //   'aligned' — labels right-aligned to the rightmost tip, no connector
                                          //   'dashed'  — right-aligned with a dashed connector line
                                          //   'dots'    — right-aligned with a dotted connector line
                                          //   'solid'   — right-aligned with a solid connector line

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

## Controller API

Both `embed()` and `embedFrame()` return a **controller object** that lets you interact with the embedded tree programmatically.

### Methods

| Method | Description |
|--------|-------------|
| `onTreeLoad(fn)` | Register a callback that fires every time a tree finishes loading. Returns an unsubscribe function — call it to deregister. |
| `loadTree(text, filename?)` | Load a tree from an inline Newick or NEXUS string. Pass an optional `filename` hint (e.g. `'my.nwk'`) so PearTree picks the correct parser. |
| `sort(order)` | Sort clades by size. `order` is `'asc'` or `'desc'`. |
| `midpointRoot()` | Re-root the tree at its midpoint. |
| `temporalRoot(mode?)` | Find and apply the temporal root using least-squares RTT regression. `mode` is `'local'` (optimises position on the current root branch only, default) or `'global'` (searches every branch). No-op when no tip dates are available. |
| `fitToWindow()` | Fit the entire tree to the visible canvas. |
| `fitLabels()` | Fit the view so that all tip labels are visible. |
| `applySettings(settings)` | Apply a partial settings object (same keys as the `settings` option). Only the supplied keys are changed. |
| `applyTheme(name)` | Apply a named built-in theme, e.g. `'Artic'`, `'BEAST'`, or `'Minimal'`. |
| `getSettings()` | Return a snapshot of the current settings as a plain object. |
| `setPanelVisible(panel, visible)` | Show or hide a panel at runtime. `panel` is `'rtt'`, `'dataTable'`, or `'palette'`; `visible` is a boolean. |

### Examples

```js
// Load a new tree after the page loads
const controller = PearTreeEmbed.embed({ container: 'tree', treeUrl: 'initial.tree' });

fetch('updated.tree')
  .then(r => r.text())
  .then(text => controller.loadTree(text, 'updated.tree'));

// React to every tree load
const unsub = controller.onTreeLoad(() => {
  console.log('tree loaded:', controller.getSettings());
});
// Later: unsub() to stop listening

// Sort or reroot programmatically
controller.sort('asc');
controller.midpointRoot();

// Find the temporal root (requires tip dates in the tree metadata)
controller.temporalRoot('global');  // search all branches
controller.temporalRoot('local');   // optimise current root branch only (default)

// Override settings after load
controller.applySettings({ tipLabelShow: 'names', colourBy: 'none' });

// Switch theme
controller.applyTheme('BEAST');

// Toggle a panel
controller.setPanelVisible('dataTable', false);
```

### Frame embeds

Controllers returned by `embedFrame()` expose the same methods (messages are forwarded to the iframe via `postMessage`), with one addition:

| Property | Description |
|----------|-------------|
| `controller.iframe` | The underlying `<iframe>` DOM element. |

> **Note:** `getSettings()` is not available for frame embeds because the settings object cannot be returned synchronously across frame boundaries.

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

      settings: {
        tipLabelShow:         'names',
        axisShow:             'time',
        axisMajorInterval:    'auto',
        axisMinorInterval:    'auto',
        axisMajorLabelFormat: 'component',
        axisMinorLabelFormat: 'component',
      },

      ui: {
        theme:     'dark',
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
- **Multiple instances.** Multiple independent PearTree instances can be embedded on the same page. Each `embed()` call is fully scoped to its own container element.
- **Required stylesheets.** The four CSS files listed in the quick start must all be loaded. `peartree-embed.css` adjusts the layout for embedded use (removes the full-page chrome).
- **Asset path detection.** The embed script auto-detects the location of PearTree's assets from its own `src` path. If you serve assets from a custom location, pass `base: 'https://example.com/peartree/'` as a top-level option.
- **Tree formats.** Both Newick (`.nwk`, `.newick`) and NEXUS (`.nex`, `.nexus`, `.tree`, `.tre`, `.treefile`) formats are supported. Supply `filename` when passing an inline `tree` string so PearTree can choose the correct parser.
