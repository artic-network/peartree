# Peartree JS Code Audit

Audit of `/peartree/js/` for duplicate/near-duplicate functions, redundant logic, and misplaced functions across all 8 files.

---

## 1. Per-File Function Inventory

### `phylograph.js` (1512 lines)
Core data model — `PhyloGraph` adjacency-list structure, graph mutation operations, annotation schema, date utilities, `TreeCalibration` class.

| Function / Export | Line | Description |
|---|---|---|
| `getChildren(node)` | ~55 | Returns `node.adjacents[1..]` (all non-parent neighbours) |
| `getParentNodeIdx(node)` | ~62 | Returns `node.adjacents[0]` |
| `swapToFront(node, neighborIdx)` | ~70 | Private — moves neighbour to slot 0 (used during reroot) |
| `rerootOnGraph(graph, childOrigId, distFromParent)` | ~125 | Re-roots graph in-place; flips parent pointers and adjusts branch annotations |
| `fromNestedRoot(nestedRoot)` | ~220 | Converts nested Newick parse tree to `PhyloGraph` |
| `KNOWN_ANNOTATION_BOUNDS` | ~295 | `Map<string, [min,max]>` for posterior/bootstrap/etc. |
| `KNOWN_BRANCH_ANNOTATIONS` | ~318 | `Set` of branch-level annotation keys (bootstrap, support) |
| `BUILTIN_STAT_KEYS` | ~330 | `Set` of sentinel keys: `__divergence__`, `__age__`, `__tips_below__`, `__branch_length__`, `__cal_date__` |
| `injectBuiltinStats(schema, nodes, maxX, maxY, cal)` | ~415 | Injects computed stats into schema; takes **layout** output, not graph |
| `isNumericType(dt)` | ~525 | Predicate for `real/integer/proportion/percentage` data types |
| `dateToDecimalYear(dateStr)` | ~545 | Converts ISO string to decimal year (simple `(month-1)/12` approx) |
| `makeAnnotationFormatter(def, mode)` | ~565 | Builds `number→string` formatter from annotation definition |
| `inferAnnotationType(values)` | ~615 | Private — infers annotation type from observed values |
| `buildAnnotationSchema(nodes)` | ~660 | Builds `Map<key, AnnotationDef>` from all node annotations |
| `rotateNodeGraph(graph, origId, recursive)` | ~830 | Reverses children order at node |
| `reorderGraph(graph, ascending)` | ~870 | Sorts children by subtree tip count |
| `midpointRootGraph(graph)` | ~960 | Finds diameter midpoint via BFS |
| **`TreeCalibration` class** | ~1030 | Date calibration and formatting (~480 lines) |
| `TreeCalibration#setAnchor(annotKey, nodeMap, maxX)` | ~1101 | Activates calibration from a date annotation key |
| `TreeCalibration#heightToDecYear(height)` | ~1140 | Converts node height to decimal year |
| `TreeCalibration#decYearToString(decYear, labelMode, dateFormat, interval)` | ~1150 | Formats decimal year as date string |
| `TreeCalibration#heightToDateString(height, ...)` | ~1165 | Convenience wrapper for height→string |
| `TreeCalibration._partialFormat(fullFormat, interval)` | ~1200 | Strips sub-interval components from a format string |
| `TreeCalibration._applyFormat(fmt, year, mm, dd, mmm)` | ~1220 | Applies format string tokens |
| `TreeCalibration.parseDateToDecYear(str)` | ~1300 | Parses ISO/decimal date string → decimal year; handles `yyyy`, `yyyy-mm`, `yyyy-mm-dd`, `yyyy.ddd` |
| `TreeCalibration.dateToDecYear(year, month, day)` | ~1400 | Calendar date integers → decimal year (exact day-of-year math) |
| `TreeCalibration.decYearToDate(dy)` | ~1420 | Decimal year → `{year, month, day}` |
| `TreeCalibration.formatDecYear(dy, ticks)` | ~1440 | Auto-precision decimal year formatter |
| `TreeCalibration.niceCalendarTicks(minDY, maxDY, targetCount)` | ~1455 | Auto-interval calendar tick generator |
| `TreeCalibration.calendarTicksForInterval(minDY, maxDY, interval)` | ~1480 | Named-interval tick generator (decades/years/.../days) |

---

### `treeutils.js` (563 lines)
Layout computation from `PhyloGraph`, deprecated wrappers, graph traversal utilities.

| Function | Line | Description |
|---|---|---|
| `computeLayout(root, hiddenNodeIds)` | ~8 | **`@deprecated`** — old nested-tree layout (still in file!) |
| `_countVisibleTips(gnodes, hiddenNodeIds, nodeIdx, fromIdx)` | ~101 | Private DFS tip count, ignores `hiddenNodeIds` |
| `_findEffectiveRoot(gnodes, hiddenNodeIds, startIdx, fromIdx)` | ~115 | Walks single-child chain to real bifurcation |
| `_subtreeTipNamesOrdered(...)` | ~150 | Ordered tip info for collapsed clade labels |
| `_subtreeMaxX(...)` | ~175 | DFS max-x in subtree (for collapsed clades) |
| `_subtreeTipCount(...)` | ~200 | Counts tips respecting collapsed clades |
| `computeLayoutFromGraph(graph, subtreeRootId, options)` | ~230 | **Main layout function** — exported |
| `reorderTree()` | ~500 | **`@deprecated` empty stub** |
| `rotateNodeTree()` | ~501 | **`@deprecated` empty stub** |
| `midpointRootTree()` | ~502 | **`@deprecated` empty stub** |
| `rerootTree()` | ~503 | **`@deprecated` empty stub** |
| `graphVisibleTipCount(graph, gStartIdx, gFromIdx, extraHiddenId)` | ~505 | Exported DFS tip count with `extraHiddenId` support |
| `graphSubtreeHasHidden(graph, gStartIdx, gFromIdx)` | ~525 | Exported DFS check for hidden nodes in subtree |

---

### `treerenderer.js` (3788 lines)
Canvas `TreeRenderer` class — animation loop, colour scales, interaction, label rendering.

Module-level constants: `CAL_DATE_KEY`, `CAL_DATE_HPD_KEY`, `CAL_DATE_HPD_ONLY_KEY`

| Method | Line (approx) | Description |
|---|---|---|
| `constructor(canvas, settings)` | 24 | Initialises all renderer state |
| `setSettings(s, redraw)` | ~200 | Bulk-apply all rendering settings |
| `setData/setDataAnimated/setDataCrossfade` | ~350–450 | Layout installation with optional animation |
| `startIntroAnimation()` / `_introEnd()` | ~460–510 | Intro animation management |
| ~50 setter methods | 510–800 | Individual visual property setters |
| `static _hexToHsl(hex)` | ~758 | Hex colour → HSL |
| `static _hslToHex(h, s, l)` | ~774 | HSL → hex |
| `static _deriveLabelColors(hex)` | ~790 | Derives readable label colours from background |
| `setAnnotationSchema(schema)` | ~805 | Installs schema and rebuilds all colour scales |
| `_buildColourScale(key)` | ~978 | Builds and caches a d3-like colour scale for a key |
| `_colourFromScale(value, scale)` | ~1015 | Maps value through a colour scale |
| `_tipColourForValue(val)` / `_nodeColourForValue(val)` / `_labelColourForValue(val)` | ~1048 | One-liner delegates to `_colourFromScale` |
| `_shapeSize(sizePercent, shape)` | ~1055 | Converts percentage to pixel size for a shape type |
| `setLegendRenderer(lr)` | ~1067 | Registers the `LegendRenderer` instance |
| `_computeAndInstallLayout(subtreeRootId)` | ~1086 | Recomputes layout and installs nodes |
| `navigateInto/Back/Forward/Home/Climb` | ~1098–1310 | Subtree navigation stack management |
| `_labelText(node, key, dp, fallback)` | ~1310 | Resolves label text for any annotation key, including builtins |
| `_tipLabelText(node)` / `_nodeLabelText(node)` | ~1367–1377 | Delegates to `_labelText` with correct config |
| `_measureLabels()` | ~1378 | Measures max label width for layout |
| `_updateScaleX(immediate)` | ~1410 | Recalculates horizontal scale to fit labels |
| `_nodeBarsLeftPad()` | ~1423 | Computes left padding for node-bar overhang |
| `_updateMinScaleY()` | ~1440 | Sets minimum vertical scale (1 tip ≥ 0.5px) |
| `fitToWindow/fitLabels/zoomIn/zoomOut/hypMagUp/Down` | ~1455–1510 | Viewport management |
| `renderFull/renderViewToOffscreen` | ~1510–1560 | Offscreen export rendering |
| `_clampedOffsetY / _setTarget` | ~1562–1600 | Viewport spring target management |
| `_wx/_wy/_worldYfromScreen/_worldXfromScreen` | ~1595 | World↔screen coordinate mapping |
| `_fisheyeScreenY(sy)` | ~1608 | Applies hyperbolic lens distortion |
| `_showLabelAt(worldY)` | ~1730 | Whether a tip label at this Y is dense-enough to render |
| `_viewHash()` | ~1760 | Hash of view state for change detection |
| `_resize()` | ~1770 | Handles canvas resize and viewport recalc |
| `_loop()` | ~1795 | RAF animation loop (animations, spring, dirty draw) |
| `_draw()` | ~1870 | Main draw dispatch |
| `_drawNodeBars(yWorldMin, yWorldMax)` | ~1910 | BEAST HPD interval bars |
| `_drawBranches(yWorldMin, yWorldMax)` | ~2050 | Horizontal branches, arcs, verticals, root stub |
| `_drawCollapsedClades(yWorldMin, yWorldMax)` | ~2230 | Collapsed clade triangles with halos |
| `_drawNodesAndLabels(yWorldMin, yWorldMax)` | ~2310 | Tip/node shapes and tip labels in multiple passes |
| `_drawSelectionAndHover(yWorldMin, yWorldMax)` | ~2730 | Selection rings, MRCA circle, hover marker, drag rect |
| `_drawNodeLabels(yWorldMin, yWorldMax)` | ~2950 | Internal node annotation labels |
| `_computeMRCA(tipIds)` | ~2988 | Most-recent-common-ancestor via ancestor chain intersection |
| `_updateMRCA()` | ~3020 | Recomputes and caches `_mrcaNodeId` |
| `_getDescendantTipIds(nodeId)` | ~3025 | DFS to collect all descendant tip IDs |
| `_darkenColor(hex, factor)` | ~3035 | Darkens hex colour by channel multiplication |
| `_findNodeAtScreen(mx, my)` | ~3045 | Hit-test for nearest node or tip label |
| `_findBranchAtScreen(mx, my)` | ~3100 | Hit-test for horizontal branch segment |
| `nodeIdAtViewportCenter()` | ~3130 | Finds node closest to viewport centre |
| `_snapToTip(scrolledDown)` | ~3140 | Snaps viewport to whole tip boundary |
| `_setupEvents()` | ~3200 | Registers all canvas event listeners |
| `_setupClickEvents/ScrollAndZoomEvents/PointerEvents/KeyEvents` | ~3220–3620 | Grouped event registration |
| `_buildGlobalHeightMap(nodes, maxX)` | ~3635 | Builds `Map<id, maxX - node.x>` for height lookups |
| `_buildTipsBelowMap(nodes)` | ~3645 | Post-order pass to count descendant tips |
| **`_statValue(node, key)`** | ~3660 | Resolves value for any key: builtins (`__divergence__` etc.) or annotations |
| `_computeStats()` | ~3700 | Computes tip count, distance, height, total branch length for status bar |
| `_notifyStats()` | ~3760 | Fires `_onStatsChange` callback |
| `scrollByDelta(deltaY)` | ~3775 | External scroll forwarding (from data-table) |

---

### `peartree.js` (5272 lines)
Main application IIFE — DOM wiring, settings, theme management, tree loading, all control bindings.

| Function | Line (approx) | Description |
|---|---|---|
| `fetchWithFallback(relativePath)` | ~22 | Fetches relative path, falls back to absolute GitHub Pages URL |
| `fetchExampleTree()` | ~32 | Fetches the bundled example tree |
| [DOM declarations] | 35–200 | All `const` element references |
| `_saveRecentColours()` / `_addRecentColour(hex)` | ~236–243 | Recent colour history management |
| `_normaliseHex(h)` | ~244 | Normalises `#` hex colour strings |
| `_renderColourPanel()` / `_makeSwatch(hex)` | ~249–276 | Colour picker panel rendering |
| `_setColourPickerValue(hex)` | ~277 | Sets colour picker without firing events |
| `_openColourPanel()` / `_closeColourPanel()` | ~282 | Colour panel show/hide |
| `_updatePaletteSelect(sel, row, annotKey)` | ~375 | Shows/hides palette <select> based on annotation |
| `_syncPaletteSelects(key, paletteName)` | ~390 | Keeps all palette selects for a key in sync |
| `saveUserThemes()` / `loadUserThemes()` | ~410–427 | localStorage theme persistence |
| `_populateThemeSelect()` | ~428 | Rebuilds theme <select> options |
| `_snapshotTheme()` | ~445 | Captures ~24 visual properties as plain object |
| `storeTheme()` | ~470 | Names and saves current theme |
| `_syncThemeButtons()` | ~485 | Updates Save/Delete/Default button states |
| `setDefaultTheme()` / `removeTheme()` | ~496–517 | Theme management |
| `loadSettings()` | ~520 | Loads `_saved` from localStorage |
| `_resolveTypeface(key)` | ~529 | Maps typeface key to CSS font-family string |
| `saveSettings()` | ~535 | Persists `_buildSettingsSnapshot()` to localStorage |
| `_buildSettingsSnapshot()` | ~538 | Captures **all** settings (~70 properties) as plain object |
| `_applyVisualSettingsFromFile(s)` | ~620 | Applies a settings object to DOM controls (sliders, colours) |
| `applyDefaults()` | ~716 | Resets DOM controls to DEFAULT_SETTINGS values |
| `_layoutOptions()` | ~895 | Returns layout options object from current DOM state |
| `_buildRendererSettings()` | ~900 | Builds full renderer settings object from DOM |
| `_syncControlVisibility()` | ~1055 | Progressive disclosure — shows/hides dependent controls |
| `_syncCanvasWrapperBg(color)` | ~1070 | Sets canvas wrapper background to match tree bg |
| `applyTheme(name)` | ~1085 | Applies named theme to DOM + renderer (~80 lines) |
| `_markCustomTheme()` | ~1165 | Marks theme select as 'custom' |
| `openModal()` / `closeModal()` | ~1540 | Open Tree modal management |
| `setModalError(msg)` | ~1548 | Shows/hides error inside modal |
| `showErrorDialog(msg)` | ~1555 | Standalone error dialog |
| `showConfirmDialog(title, msg, opts)` | ~1562 | Promise-based confirm dialog |
| `setModalLoading(on)` | ~1590 | Spinner + disabled-state management |
| `handleFile(file)` | ~1625 | Reads file.text() and calls loadTree |
| `pickTreeFile()` | ~1633 | Triggers file picker (overridable by platform adapter) |
| `loadExampleTree(onError)` | ~1650 | Loads bundled example tree |
| `hideEmptyState()` / `showEmptyState()` | ~1665 | Empty-state overlay management |
| `_updateLabelDpRow(rowEl, annotKey, schema)` | ~2390 | Shows/hides decimal-places row based on annotation type |
| `_refreshAnnotationUIs(schema)` | ~2400 | Re-injects builtins and repopulates ALL annotation dropdowns |
| `loadTree(text, filename)` | ~2515 | **Main tree loading function** (~400 lines) |
| `applyOrder(ascending)` | ~3060 | Applies ascending/descending tip ordering with animation |
| `bindControls()` | ~3080 | **One-time binding of all interactive controls** (~750 lines) |
| [inside bindControls] `_applyTipFilter()` | ~3085 | Filter tips by label text |
| [inside bindControls] `canHide/canShow/canDrill/canClimb/canCollapse/canExpand` | ~3115–3200 | Predicate functions for button enable/disable |
| [inside bindControls] `applyHide()` / `applyShow()` | ~3280–3440 | Hide/show tips with animation |
| [inside bindControls] `applyCollapse()` / `applyExpand(nodeId)` | ~3480–3590 | Collapse/expand clade triangle |
| [inside bindControls] `_restoreViewAfterLayoutChange(...)` | ~3595 | Restores zoom level after collapse/expand |
| [inside bindControls] `applyReroot(childNodeId, dist)` | ~3630 | Reroots graph and recomputes layout |
| [inside bindControls] `applyMidpointRoot()` | ~3680 | Midpoint root wrapping cached result |
| [inside bindControls] `showNodeInfo()` | ~3700 | Shows tree or node info overlay (~200 lines) |
| [inside bindControls] `_applyUserColour(colour)` | ~3880 | Applies user colour to selected tips |
| applyLegend() | ~5050 | Configures legend canvases + calls renderer._resize() |
| applyAxis() | ~5120 | Configures axis renderer direction/calibration/visibility |
| applyTickOptions() | ~5145 | Applies date tick settings to axis renderer |
| applyAxisStyle() | ~5165 | Applies axis colour/font/linewidth |
| applyNodeBars() | ~5200 | Sync node-bars state to renderer |
| `_esc(s)` | ~1960 | HTML escape (identical to datatablerenderer.js) |
| `_csvCell(v)` | ~2010 | CSV-escapes a cell value |

---

### `datatablerenderer.js` (699 lines)
`createDataTableRenderer` factory — virtualised tip data table synced to canvas.

| Function | Line | Description |
|---|---|---|
| `_esc(s)` | ~22 | Module-level HTML escape (identical to peartree.js copy) |
| `createDataTableRenderer({getRenderer, ...})` | ~42 | Factory function |
| `setColumns(cols)` / `setTips(tips)` | ~95/103 | Update displayed columns/tips |
| `syncView()` | ~110 | Realigns table rows to current canvas scroll |
| `syncSelection(ids)` | ~115 | Highlights selected tips in table |
| `open()` / `close()` | ~123/134 | Panel show/hide |
| `isOpen()` / `isPinned()` | ~140 | State predicates |
| `pin()` / `unpin()` / `_setPin(pinned)` | ~143–156 | Pin/unpin panel to layout |
| `_syncPinButton()` | ~157 | Updates pin button icon |
| `invalidate()` | ~170 | Clears column-width cache |
| `getState()` | ~178 | Returns `{columns, showNames, isPinned}` |
| `_clearRows()` / `_buildExpandedRows()` | ~184/196 | DOM management for virtual rows |
| `_colLabel(key)` | ~232 | Returns display label for a column key |
| `_tipValue(tip, key)` | ~241 | Reads value for a tip (delegates builtin keys to `renderer._statValue`) |
| `_fmtValue(key, rawVal)` | ~253 | Formats value through schema formatter |
| `_vtValue(vt, key)` | ~259 | Reads virtual-tip value (collapsed clades) |
| `_computeColWidths(fontPx, fontFamily)` | ~270 | Off-screen canvas text measurement for column widths |
| `_isEmpty()` | ~320 | True when no tips/columns to show |
| `_renderHeader()` | ~324 | Builds header row HTML |
| `_redraw()` | ~352 | Core virtual-DOM render loop |
| `notifyUserResized()` | ~660 | Signals user has manually set width |

---

### `treeio.js` (343 lines)
Tree parsing and serialisation.

| Function | Line | Description |
|---|---|---|
| `parseNewick(newickString, tipNameMap)` | ~12 | Token-by-token Newick parser → nested root |
| [inner] `newId()` | — | Counter-based ID generator |
| [inner] `annotateDates(root)` | ~150 | Post-pass: parses pipe-delimited tip date annotations |
| `parseNexus(nexus)` | ~170 | Line-by-line NEXUS parser → `[{root, tipNameMap, peartreeSettings}]` |
| `newickEsc(name)` | ~237 | Quotes names containing special characters |
| `fmtLen(n)` | ~244 | Compact branch length → string |
| `fmtAnnot(annotations, annotKeys)` | ~251 | Builds `[&key=val,…]` BEAST annotation string |
| `branchLen(ci, pi, g)` | ~266 | Returns branch length, handling root-adjacent special case |
| `newickNode(nodeIdx, parentIdx, g, annotKeys)` | ~278 | Recursive Newick serialiser |
| `graphToNewick(g, subtreeRootId, annotKeys)` | ~292 | Exported serialiser |
| `parseDelimited(text)` | ~310 | CSV/TSV parser with auto-delimiter detection |

---

### `axisrenderer.js` (491 lines)
Standalone `AxisRenderer` class — x-axis below the tree canvas.

| Method | Line | Description |
|---|---|---|
| `constructor(canvas, settings)` | ~18 | Initialises state (timed mode, calibration, direction, style) |
| `setSettings(s, redraw)` | ~62 | Applies axisColor, fontSize, lineWidth, paddingTop |
| `setHeightFormatter(fmt)` | ~75 | Pre-computed formatter for height/divergence tick labels |
| `setTreeParams({maxX, isTimedTree, rootHeight})` | ~92 | Sets tree geometry for axis domain computation |
| `setCalibration(cal)` | ~108 | Activates date-axis mode via `TreeCalibration` |
| `get _dateMode` | ~118 | True when a valid `TreeCalibration` is active |
| `setSubtreeParams({maxX, rootHeight, minTipH})` | ~126 | Updates params for subtree navigation without full reset |
| `setTickOptions({majorInterval, minorInterval, ...})` | ~142 | Date tick interval and label format settings |
| `setDateFormat(fmt)` | ~155 | Sets the date format string |
| `update(scaleX, offsetX, paddingLeft, ...)` | ~162 | Called every animation frame; redraws on hash change |
| `setVisible(v)` | ~195 | Shows/hides canvas |
| `setFontSize/setFontFamily/setColor/setLineWidth/setDirection` | ~202–235 | Style setters |
| `resize()` | ~238 | Not present — axis recalculates on `update()` |
| `_draw()` | ~250 | Builds tick arrays, draws baseline, major and minor ticks |
| `_valueDomain()` | ~380 | Returns `{leftVal, rightVal}` for current axis mode |
| `_valToWorldX(val)` | ~405 | Converts axis value to world-x, respecting mode |
| `_valToScreenX(val)` | ~415 | Converts axis value to screen-x |
| `static _hexToRgba(hex, alpha)` | ~420 | Hex + alpha → `rgba(r,g,b,a)` CSS string |
| `static _niceTicks(min, max, targetCount)` | ~430 | Nice round-number tick positions |
| `static _formatValue(v, step)` | ~460 | Formats a numeric tick label to appropriate decimal places |

---

### `legendrenderer.js` (482 lines)
Standalone `LegendRenderer` class — categorical/sequential colour key canvases.

| Method | Line | Description |
|---|---|---|
| `constructor(leftCanvas, rightCanvas, leftCanvas2, rightCanvas2, settings)` | ~36 | Initialises canvases, registers click/hover listeners |
| `setSettings(s, redraw)` | ~102 | Applies fontSize, textColor, bgColor, skipBg, heightPct |
| `setAnnotationSchema(schema)` | ~120 | Installs schema and triggers redraw |
| `setPaletteOverrides(overrides)` | ~130 | Receives palette overrides map from `TreeRenderer` |
| `setAnnotation(position, key)` | ~140 | Sets which canvas side and annotation key to display |
| `setAnnotation2(relPos, key)` | ~150 | Sets second legend annotation and layout |
| `setFontSize/setTextColor/setFontFamily/setBgColor` | ~160–195 | Style setters |
| `resize()` | ~205 | Syncs canvas dimensions to CSS size + DPR, redraws |
| `_computeHeight(lc)` | ~240 | Legend-1 canvas height from container + `heightPct` |
| `_computeHeight2(lc)` | ~248 | Legend-2 side-canvas height |
| `_computeStackedHeights(lc)` | ~258 | `{total, h1, h2}` for 'below' stacked layout |
| `_measureWidthForKey(key)` | ~275 | Off-screen canvas measurement of minimum canvas width |
| `measureWidth()` / `measureWidth2()` | ~320/323 | One-liner delegates to `_measureWidthForKey` |
| `draw()` | ~328 | Paints all legend canvases |
| `_drawContent(ctx, W, H, key, offsetY)` | ~370 | Draws one legend (categorical swatches, sequential gradient bar) |

---

## 2. Duplication Findings

### D1 — `dateToDecimalYear` vs `TreeCalibration.parseDateToDecYear` (both in `phylograph.js`)

**Locations:**
- `phylograph.js` ~line 545: `export function dateToDecimalYear(dateStr)` — simple `(month-1)/12` approximation
- `phylograph.js` ~line 1300: `static TreeCalibration.parseDateToDecYear(str)` — same input, more complete: handles `yyyy.ddd`, calls `TreeCalibration.dateToDecYear(y,m,d)` for exact day-of-year math

**Impact:** `dateToDecimalYear` is imported by both `treerenderer.js` and `legendrenderer.js` for colour-scale interpolation. The module-level version uses less accurate calendar math than the `TreeCalibration` static that already exists.

**Recommendation:** Replace the body of `dateToDecimalYear` with `return TreeCalibration.parseDateToDecYear(dateStr) ?? NaN;`.

---

### D2 — `_countVisibleTips` vs `graphVisibleTipCount` (both in `treeutils.js`)

**Locations:**
- `treeutils.js` ~line 101: `function _countVisibleTips(gnodes, hiddenNodeIds, nodeIdx, fromIdx)` — private, takes raw arrays
- `treeutils.js` ~line 505: `export function graphVisibleTipCount(graph, gStartIdx, gFromIdx, extraHiddenId)` — public, takes graph object, adds `extraHiddenId` check

Both perform a DFS counting visible tips. The exported version adds `extraHiddenId` (for previewing a hide before committing). 

**Recommendation:** Have `graphVisibleTipCount` delegate to `_countVisibleTips` by passing `new Set([...graph.hiddenNodeIds, extraHiddenId].filter(Boolean))`.

---

### D3 — Child-y averaging repeated 4+ times in `treeutils.js`

The expression for averaging child y-positions to set an internal node's y occurs in:
- `computeLayout` (deprecated) ~line 45
- `computeLayoutFromGraph` post-order pass ~line 320
- `computeLayoutFromGraph` post-suppression recompute ~line 440
- `computeLayoutFromGraph` root-collapse recompute ~line 460

```js
// All four instances look like:
const childYs = node.children.map(cid => nodeMap.get(cid)?.y).filter(y => y != null);
if (childYs.length > 0) node.y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
```

**Recommendation:** Extract as `_avgChildY(nodeId, nodeMap)` helper inside `treeutils.js`.

---

### D4 — Single-child suppression post-passes duplicated (`computeLayout` vs `computeLayoutFromGraph`)

Both functions contain nearly identical logic to suppress single-child internal nodes (wire grandparent to child, remove intermediate). The `computeLayoutFromGraph` version is the more complete/correct one.

- `computeLayout` ~lines 55–90 (deprecated)
- `computeLayoutFromGraph` post-pass ~lines 380–430

This is moot if D7 is addressed (removing `computeLayout` entirely).

---

### D5 — Settings-to-DOM hydration duplicated: `_applyVisualSettingsFromFile` vs inline `_saved` block (`peartree.js`)

**Locations:**
- `_applyVisualSettingsFromFile(s)` at ~line 620: applies a settings object to every DOM slider, colour input, and display text element (~100 lines)
- The inline block at ~lines 700–900 in the IIFE init that reads `_saved.*` fields and sets the same DOM controls in the same order (~150 lines)

The two blocks are nearly identical: same field names, same `sliderEl.value = s.X; displayEl.textContent = s.X;` pattern, same ordering.

**Recommendation:** The inline `_saved` restore block should simply call `_applyVisualSettingsFromFile(_saved)` — that is the designed purpose of the function.

---

### D6 — `_buildSettingsSnapshot` AND `_snapshotTheme` in `peartree.js`: overlapping field lists

**Locations:**
- `_snapshotTheme()` ~line 445: captures ~24 visual properties (colours, sizes) — the "theme" subset
- `_buildSettingsSnapshot()` ~line 538: captures all ~70+ settings, including every field that `_snapshotTheme()` captures

The theme snapshot is a strict subset of the settings snapshot. The ~24 overlapping fields are written out twice.

**Recommendation:** `_snapshotTheme()` could call `_buildSettingsSnapshot()` and pick only theme-relevant keys, or `_buildSettingsSnapshot()` could call `_snapshotTheme()` internally.

---

### D7 — Deprecated `computeLayout` (90 lines) and 4 empty stubs in `treeutils.js`

The `@deprecated` `computeLayout` function (~lines 8–100) and four empty stub functions (`reorderTree`, `rotateNodeTree`, `midpointRootTree`, `rerootTree`) are dead code. All callers were migrated to the `phylograph.js` equivalents.

**Recommendation:** Delete all five.

---

### D8 — `_populateColourBy` in `loadTree` vs `repopulate` in `_refreshAnnotationUIs` (`peartree.js`)

**Locations:**
- `loadTree()` ~line 2635: defines local `function _populateColourBy(sel, filter)` — populates colour-by `<select>` from schema
- `_refreshAnnotationUIs()` ~line 2405: defines local `function repopulate(sel, {isLegend, filter})` — same schema→`<select>` population with `isLegend` flag

Both functions clear and rebuild the same set of dropdowns from the annotation schema. They differ only that the `_refreshAnnotationUIs` version adds an `isLegend` option and uses `''` as the default for legend selects instead of `'user_colour'` for colour-by selects.

**Recommendation:** Consolidate into one function (the `repopulate` version in `_refreshAnnotationUIs` is more general) and have `loadTree` call `_refreshAnnotationUIs` after setting up the initial schema.

---

### D9 — Annotation dropdown population duplicated in `loadTree` and `_refreshAnnotationUIs` (`peartree.js`)

`loadTree` (~lines 2638–2720) manually populates `tipLabelShow`, `nodeLabelShowEl`, `legendAnnotEl`, `legend2AnnotEl` with `while` + `for` loops nearly identical to the equivalent section in `_refreshAnnotationUIs` (~lines 2415–2480). This is ~80 lines of near-duplication.

**Recommendation:** After `loadTree` sets up the schema and applies file-embedded settings, call `_refreshAnnotationUIs(schema)` instead of repeating the population inline. The conditional call at the end of `loadTree` (currently only for calibration) should become unconditional.

---

### D10 — `_esc(s)` HTML-escape function duplicated across files

**Locations:**
- `datatablerenderer.js` line ~22: `function _esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }`
- `peartree.js` line ~1960: identical function body

These are byte-for-byte copies in different module scopes.

**Recommendation:** Extract to a shared `utils.js` and import in both files (or note as accepted duplication given the trivial size).

---

### D11 — Repeated Blob-download pattern in `_doExport` and `_doGraphicsExport` (`peartree.js`)

The same 6-line create-Blob + `createObjectURL` + append anchor + click + remove + `revokeObjectURL` pattern appears **4 times**:
- `_doExport`: once for CSV, once for NEXUS/Newick
- `_doGraphicsExport`: once for PNG (inside `.then()`), once for SVG

```js
const blob = new Blob([content], { type: mime });
const url  = URL.createObjectURL(blob);
const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

**Recommendation:** Extract as `function _downloadBlob(content, filename, mimeType)`.

---

### D12 — `_computeStats()` re-implements the `__age__` computation (`treerenderer.js`)

Inside `_computeStats()` (~line 3700), the inline helper `const globalH = (n) => this._globalHeightMap.get(n.id) ?? (this.maxX - n.x)` duplicates the exact logic in `_statValue(n, '__age__')` which already handles the same Map lookup with the same fallback.

**Recommendation:** Replace `globalH(n)` calls inside `_computeStats()` with `this._statValue(n, '__age__')`.

---

### D13 — `revealSubtree` and `revealAll` inner functions in `applyShow()` (`peartree.js`)

Within `applyShow()` in `bindControls()`, two recursively-traversing reveal functions are defined 10 lines apart:
- `revealSubtree(ni, fi)` — deletes `graph.nodes[ni].origId` then recurses into adjacents
- `revealAll(gnodeIdx, fromIdx)` — recurses into adjacents then deletes `graph.nodes[adjIdx].origId`

Both do the same thing (DFS reveal of all nodes in a subtree) with trivially different ordering.

**Recommendation:** Unify into one function.

---

## 3. Misplacement Candidates

### M1 — `injectBuiltinStats` belongs in `treeutils.js`, not `phylograph.js`

**Current:** `phylograph.js` ~line 415  
**Why misplaced:** The function signature is `injectBuiltinStats(schema, nodes, maxX, maxY, cal)` where `nodes` is a `LayoutNode[]` array — the **output** of `computeLayoutFromGraph`, not a graph topology concern. It accesses layout-specific fields (`node.x`, `node.y` etc.) and should be called immediately after `computeLayoutFromGraph`. It has no dependency on PhyloGraph topology.  
**Recommendation:** Move to `treeutils.js`, placed right after `computeLayoutFromGraph`.

---

### M2 — `TreeCalibration` class belongs in its own file (or `treeutils.js`)

**Current:** `phylograph.js` ~lines 1030–1512 (~480 lines appended at the end of the file)  
**Why misplaced:** The class has **zero** dependency on the `PhyloGraph` data structure. It uses `nodeMap` (layout output) and `maxX`. It is entirely about calendar arithmetic, tick generation, and date formatting — none of which are graph topology concerns. Its current position at the end of `phylograph.js` is architectural drift.  
**Recommendation:** Move to `calibration.js` (new file) or add to `treeutils.js` which already handles layout outputs.

---

### M3 — Module-level `dateToDecimalYear` is misplaced in `phylograph.js`

**Current:** `phylograph.js` ~line 545 (see also D1 above)  
**Why misplaced:** This is a pure date utility function. It predates `TreeCalibration.parseDateToDecYear` and does the same thing less accurately. Its only external consumers are `treerenderer.js` and `legendrenderer.js` which need a string-to-decimal conversion — neither of which is a graph concern.  
**Recommendation:** Remove by merging with `TreeCalibration.parseDateToDecYear`. Exporters should import the static method or a re-export from wherever `TreeCalibration` lands.

---

### M4 — Annotation schema utilities (`buildAnnotationSchema`, `makeAnnotationFormatter`, `inferAnnotationType`, `isNumericType`) do not belong in `phylograph.js`

**Current:** `phylograph.js` ~lines 525–720 (~200 lines)  
**Why misplaced:** These utilities operate on `node.annotations` dictionaries but have no dependency on graph topology (adjacency lists, parent pointers, reroooting). They are annotation metadata concerns.  
**Recommendation:** Move to `annotationschema.js` (new file) alongside `KNOWN_ANNOTATION_BOUNDS`, `KNOWN_BRANCH_ANNOTATIONS`, and `BUILTIN_STAT_KEYS`. This would reduce `phylograph.js` by ~220 lines and make the responsibilities cleaner.

---

### M5 — `static _hexToHsl / _hslToHex / _deriveLabelColors` on `TreeRenderer`; `static _hexToRgba` on `AxisRenderer`

**Current:** `treerenderer.js` ~lines 758–800; `axisrenderer.js` ~line 420  
**Why misplaced:** Private static colour manipulation utilities on renderer classes. `palettes.js` is the logical home for colour utility functions — it already exports `buildCategoricalColourMap`, `lerpSequential`, `getSequentialPalette`, etc.  
**Note:** This is lower priority — the functions are small and currently only used within their respective classes.  
**Recommendation:** Move to `palettes.js` if any cross-class sharing becomes needed; acceptable as-is otherwise.

---

### M6 — `_esc(s)` is not a renderer concern (`datatablerenderer.js` and `peartree.js`)

See D10 above. Both files define the identical function as a module-level or IIFE-level utility.  
**Recommendation:** Move to a shared `utils.js` module.

---

### M7 — `_statValue(node, key)` geometry computations are renderer state, but the pure calculations could be standalone

**Current:** `treerenderer.js` ~line 3660  
**Note:** `_statValue` requires `_globalHeightMap`, `_tipsBelowMap`, and `nodeMap` — all maintained on the `TreeRenderer` instance — so it reasonably lives on the class. However, `datatablerenderer.js` reaches across class boundaries by calling `renderer._statValue(tip, key)` on a foreign instance, which is a coupling concern.  
**Recommendation:** Either make `_statValue` a module-level exported function taking explicit map parameters, or expose it as a properly-named public method (`getStatValue`).

---

## 4. Inline Duplications Worth Extracting

### E1 — `_downloadBlob(content, filename, mimeType)` in `peartree.js`
(See D11.) Four identical Blob download sequences; trivial to extract:
```js
function _downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### E2 — `_avgChildY(nodeId, nodeMap)` in `treeutils.js`
(See D3.) Repeated post-order y-assignment pattern:
```js
function _avgChildY(children, nodeMap) {
  const ys = children.map(cid => nodeMap.get(cid)?.y).filter(y => y != null);
  return ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : null;
}
```

### E3 — Schema `<select>` population helper in `peartree.js`
(See D8/D9.) A unified `populateAnnotSelect(sel, schema, {isLegend, filter, prevValue})` function would eliminate the ~4 separate while+for loops spread across `loadTree` and `_refreshAnnotationUIs`.

### E4 — Single reveal-subtree DFS in `applyShow()` (`peartree.js`)
(See D13.) Two nearly-identical recursive DFS functions (`revealSubtree` / `revealAll`) should be one:
```js
function revealSubtree(ni, fi) {
  graph.hiddenNodeIds.delete(graph.nodes[ni].origId);
  for (const adj of graph.nodes[ni].adjacents) {
    if (adj !== fi) revealSubtree(adj, ni);
  }
}
```

---

## 5. Dead Code

| Item | File | Line | Notes |
|---|---|---|---|
| `computeLayout(root, hiddenNodeIds)` | `treeutils.js` | ~8 | `@deprecated`, ~90 lines, not called anywhere |
| `reorderTree()` | `treeutils.js` | ~500 | Empty stub |
| `rotateNodeTree()` | `treeutils.js` | ~501 | Empty stub |
| `midpointRootTree()` | `treeutils.js` | ~502 | Empty stub |
| `rerootTree()` | `treeutils.js` | ~503 | Empty stub |
