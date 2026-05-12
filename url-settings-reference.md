# PearTree URL, UI, and Settings Reference

This document is a reference for:
- URL query parameters supported by `peartree.html`
- The `ui` object properties (for `window.peartreeConfig.ui` or `{ ui }` in `configUrl` JSON)
- The `settings` object properties (for `window.peartreeConfig.settings`, `{ settings }` in `configUrl` JSON, and `settings=` URL payload)

## 1) URL Query Parameters

## Core parameters

| Parameter | Value type | Description |
|---|---|---|
| `treeUrl` | URL (http/https) | Auto-load a tree file on startup. |
| `configUrl` | URL (JSON) | Fetch JSON config with optional `{ "ui": {...}, "settings": {...} }`. |
| `settings` | base64(JSON object) | Inline settings object (`btoa(JSON.stringify(settingsObj))`). |
| `theme` | `light` \| `dark` | Bootstrap wrapper theme. |
| `nodeLabelName` | string | Preselect node label annotation key. |
| `nostore` | `1` | Disable localStorage persistence for runtime settings. |
| `storageKey` | string | Override localStorage key used for persistence. |

## UI visibility / mode parameters

For boolean-style flags:
- `0` = hide/disable
- absent or `1` = show/enable

For extended panel flags (`rtt`, `dt`):
- `fixed` is also supported

| URL param | Mapped `ui` key | Meaning |
|---|---|---|
| `palette` | `palette` | Settings panel toggle button visibility |
| `toolbar` | `toolbar` | Top toolbar visibility |
| `rtt` | `rtt` | RTT panel mode (`true`/`false`/`fixed`) |
| `rttheader` | `rttHeader` | RTT panel header visibility |
| `dt` | `dataTable` | Data table panel mode (`true`/`false`/`fixed`) |
| `dtheader` | `dataTableHeader` | Data table header visibility |
| `import` | `import` | Open/import controls visibility |
| `export` | `export` | Export controls visibility |
| `statusbar` | `statusBar` | Status bar visibility |
| `sbstats` | `statusStats` | Status stats section visibility |
| `sbselect` | `statusSelect` | Status selection section visibility |
| `sbmessage` | `statusMessage` | Status transient message visibility |
| `sbshare` | `statusShare` | Status share button visibility |
| `help` | `help` | Help button visibility |
| `about` | `about` | About button visibility |
| `themetoggle` | `themeToggle` | Theme toggle visibility |
| `brand` | `brand` | Brand/logo visibility |
| `tbfileops` | `tbFileOps` | Toolbar file ops group visibility |
| `tbann` | `tbAnnotations` | Toolbar annotation group visibility |
| `tbnode` | `tbNodeInfo` | Toolbar node-info group visibility |
| `tbnav` | `tbNavigation` | Toolbar navigation group visibility |
| `tbzoom` | `tbZoom` | Toolbar zoom group visibility |
| `tborder` | `tbOrder` | Toolbar ordering group visibility |
| `tbrotate` | `tbRotate` | Toolbar rotate group visibility |
| `tbreroot` | `tbReroot` | Toolbar reroot group visibility |
| `tbhide` | `tbHideShow` | Toolbar hide/show group visibility |
| `tbcolour` | `tbColour` | Toolbar colour group visibility |
| `tbfilter` | `tbFilter` | Toolbar filter group visibility |
| `tbpanels` | `tbPanels` | Toolbar panel-toggle group visibility |
| `keyboard` | `keyboard` | Keyboard shortcuts enable/disable |

## 2) `ui` Object Properties

Use these in:
- `window.peartreeConfig.ui`
- `configUrl` JSON as `{ "ui": { ... } }`

Boolean keys accept booleans; string values `'0'/'1'/'false'/'true'` are coerced.
`rtt` and `dataTable` additionally accept `'fixed'`.
`openTree` is treated as an alias of `import`.

| Key | Type | Notes |
|---|---|---|
| `palette` | boolean | Show settings panel toggle |
| `toolbar` | boolean | Show top toolbar |
| `rtt` | boolean \| `'fixed'` | RTT panel availability / fixed mode |
| `rttHeader` | boolean | RTT header visibility |
| `dataTable` | boolean \| `'fixed'` | Data table availability / fixed mode |
| `dataTableHeader` | boolean | Data table header visibility |
| `import` | boolean | Open/import controls |
| `export` | boolean | Export controls |
| `statusBar` | boolean | Bottom status bar |
| `statusStats` | boolean | Status stats block |
| `statusSelect` | boolean | Status selection block |
| `statusMessage` | boolean | Status message block |
| `statusShare` | boolean | Share URL button |
| `help` | boolean | Help button |
| `about` | boolean | About button |
| `themeToggle` | boolean | Dark/light toggle button |
| `brand` | boolean | Brand text/logo |
| `keyboard` | boolean | Keyboard shortcuts enable/disable |
| `tbFileOps` | boolean | Toolbar file operations group |
| `tbAnnotations` | boolean | Toolbar annotation tools group |
| `tbNodeInfo` | boolean | Toolbar node-info group |
| `tbNavigation` | boolean | Toolbar navigation group |
| `tbZoom` | boolean | Toolbar zoom group |
| `tbOrder` | boolean | Toolbar sort/order group |
| `tbRotate` | boolean | Toolbar rotate group |
| `tbReroot` | boolean | Toolbar reroot group |
| `tbHideShow` | boolean | Toolbar hide/show group |
| `tbColour` | boolean | Toolbar colour group |
| `tbFilter` | boolean | Toolbar filter group |
| `tbPanels` | boolean | Toolbar panel buttons group |

## 3) `settings` Object Properties

`settings` is composed of:

- Core runtime keys from `DEFAULT_SETTINGS`
- Theme-driven visual keys from `REQUIRED_THEME_KEYS`

Canonical key table (allowed values + defaults): [settings-object-reference.md](settings-object-reference.md).

The lists below are a quick grouped view.

## Core settings keys (`DEFAULT_SETTINGS`)

- `rootStemPct`
- `paddingLeft`
- `paddingRight`
- `paddingTop`
- `paddingBottom`
- `axisPaddingTop`
- `rootStubLength`
- `introAnimation`
- `tipLabelShow`
- `tipLabelAlign`
- `tipLabelSpacing`
- `tipLabelDecimalPlaces`
- `tipLabelShape`
- `tipLabelShapeSize`
- `tipLabelShapeMarginLeft`
- `tipLabelShapeSpacing`
- `tipLabelShapesExtra`
- `tipLabelShapeExtraColourBys`
- `nodeLabelAnnotation`
- `nodeLabelPosition`
- `nodeLabelDecimalPlaces`
- `branchLabelAnnotation`
- `branchLabelPosition`
- `branchLabelDecimalPlaces`
- `branchShape`
- `branchShapeHeightPct`
- `branchShapeWidth`
- `branchShapeAlign`
- `branchShapeSpacing`
- `branchShapeFilter`
- `branchShapeColorBy`
- `branchShapeCountBy`
- `branchShapesExtra`
- `nodeBarsEnabled`
- `nodeBarsLine`
- `nodeBarsRange`
- `cladeHighlightLeftEdge`
- `cladeHighlightRightEdge`
- `cladeHighlightPadding`
- `cladeHighlightRadius`
- `legendPadding`
- `legendHeightPct`
- `legendAnnotation2`
- `legend2Position`
- `legendHeightPct2`
- `legendAnnotation3`
- `legend3Position`
- `legendHeightPct3`
- `legendAnnotation4`
- `legend4Position`
- `legendHeightPct4`
- `axisShow`
- `axisDateAnnotation`
- `axisDateFormat`
- `axisMajorInterval`
- `axisMinorInterval`
- `axisMajorLabelFormat`
- `axisMinorLabelFormat`
- `rttResidBandShow`
- `rttXOrigin`
- `rttGridLines`
- `rttAspectRatio`
- `rttDateFormat`
- `rttMajorInterval`
- `rttMinorInterval`
- `rttMajorLabelFormat`
- `rttMinorLabelFormat`
- `dataTableOpen`
- `dataTablePinned`
- `rttOpen`
- `rttPinned`
- `paletteOpen`
- `palettePinned`
- `baseTheme`
- `defaultTheme`
- `selectedTheme`

## Theme/visual settings keys (`REQUIRED_THEME_KEYS`)

- `canvasBgColor`
- `branchColor`
- `branchWidth`
- `elbowRadius`
- `fontSize`
- `labelColor`
- `tipLabelShapeColor`
- `tipSize`
- `tipShapeColor`
- `tipHaloSize`
- `tipShapeBgColor`
- `nodeSize`
- `nodeShapeColor`
- `nodeHaloSize`
- `nodeShapeBgColor`
- `nodeLabelFontSize`
- `nodeLabelTypefaceKey`
- `nodeLabelTypefaceStyle`
- `nodeLabelColor`
- `nodeLabelSpacing`
- `branchLabelFontSize`
- `branchLabelTypefaceKey`
- `branchLabelTypefaceStyle`
- `branchLabelColor`
- `branchLabelSpacing`
- `branchShapeColor`
- `branchShapeHaloColor`
- `branchShape2Color`
- `branchShape3Color`
- `branchShape4Color`
- `nodeBarsColor`
- `nodeBarsWidth`
- `nodeBarsFillOpacity`
- `nodeBarsStrokeOpacity`
- `paintColour`
- `cladeHighlightFillOpacity`
- `cladeHighlightStrokeOpacity`
- `cladeHighlightStrokeWidth`
- `cladeHighlightColour`
- `collapsedCladeFontSize`
- `collapsedCladeStrokeWidth`
- `collapsedCladeStrokeOpacity`
- `collapsedCladeTypefaceKey`
- `collapsedCladeTypefaceStyle`
- `legendTextColor`
- `legendFontSize`
- `legendTypefaceKey`
- `legendTypefaceStyle`
- `axisColor`
- `axisFontSize`
- `axisTypefaceKey`
- `axisTypefaceStyle`
- `axisLineWidth`
- `rttRegressionStyle`
- `rttRegressionColor`
- `rttRegressionWidth`
- `rttResidBandColor`
- `rttResidBandStyle`
- `rttResidBandWidth`
- `rttResidBandFillColor`
- `rttResidBandFillOpacity`
- `rttStatsBgColor`
- `rttStatsTextColor`
- `rttStatsFontSize`
- `rttAxisColor`
- `rttAxisFontSize`
- `rttAxisLineWidth`
- `rttAxisTypefaceKey`
- `rttAxisTypefaceStyle`
- `typeface`
- `typefaceStyle`
- `selectedLabelStyle`
- `selectedTipGrowthFactor`
- `selectedTipFillColor`
- `selectedTipMinSize`
- `selectedTipFillOpacity`
- `selectedTipStrokeColor`
- `selectedTipStrokeWidth`
- `selectedTipStrokeOpacity`
- `selectedNodeGrowthFactor`
- `selectedNodeFillColor`
- `selectedNodeMinSize`
- `selectedNodeFillOpacity`
- `selectedNodeStrokeColor`
- `selectedNodeStrokeWidth`
- `selectedNodeStrokeOpacity`
- `tipHoverGrowthFactor`
- `tipHoverFillColor`
- `tipHoverMinSize`
- `tipHoverFillOpacity`
- `tipHoverStrokeColor`
- `tipHoverStrokeWidth`
- `tipHoverStrokeOpacity`
- `nodeHoverGrowthFactor`
- `nodeHoverFillColor`
- `nodeHoverMinSize`
- `nodeHoverFillOpacity`
- `nodeHoverStrokeColor`
- `nodeHoverStrokeWidth`
- `nodeHoverStrokeOpacity`

## 4) Example `configUrl` JSON

```json
{
  "ui": {
    "toolbar": true,
    "tbZoom": true,
    "tbOrder": false,
    "statusBar": true,
    "rtt": "fixed",
    "dataTable": false
  },
  "settings": {
    "axisShow": "time",
    "fontSize": "13",
    "tipLabelShow": "names",
    "selectedTheme": "Artic"
  }
}
```

## 5) Notes on precedence

Configuration precedence (later wins):
1. Defaults / stored settings
2. `configUrl` JSON (`ui`, `settings`)
3. URL switches (`?toolbar=0`, etc.) and `settings=`
4. `window.peartreeConfig` explicit values

This means `configUrl` provides baseline remote config, while direct URL flags and explicit embed config can override it.

## 6) Embedding with an iframe

You can embed PearTree in any page with a plain `<iframe>` and configure it with URL parameters.

### Minimal iframe embed

```html
<iframe
  title="Phylogenetic tree"
  src="https://peartree.live/peartree?treeUrl=https%3A%2F%2Fexample.org%2Ftrees%2Febov.tree"
  width="100%"
  height="700"
  style="border: 1px solid #d0d7de; border-radius: 8px;"
  loading="lazy"
></iframe>
```

### iframe embed with UI flags

```html
<iframe
  title="PearTree (minimal UI)"
  src="https://peartree.live/peartree?treeUrl=https%3A%2F%2Fexample.org%2Ftrees%2Febov.tree&toolbar=0&statusbar=0&tbnav=0&tbzoom=0&tborder=0"
  width="100%"
  height="700"
  style="border: 0;"
></iframe>
```

### iframe embed using remote config JSON (`configUrl`)

```html
<iframe
  title="PearTree (configUrl)"
  src="https://peartree.live/peartree?treeUrl=https%3A%2F%2Fexample.org%2Ftrees%2Febov.tree&configUrl=https%3A%2F%2Fexample.org%2Fconfigs%2Fpeartree-config.json"
  width="100%"
  height="700"
  style="border: 0;"
></iframe>
```

### Notes

- URL-encode all external URLs used in query parameters (`treeUrl`, `configUrl`).
- `treeUrl` must be reachable by the browser running the host page.
- If loading from a different origin, the tree host must allow cross-origin fetches (CORS).
