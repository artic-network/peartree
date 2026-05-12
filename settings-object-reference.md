# PearTree Settings Object Reference

Canonical reference for settings keys accepted in the `settings` object (URL `settings=`, `configUrl.settings`, and `PearTreeEmbed.embed({ settings })`).

| Key | Allowed values | Default |
|---|---|---|
| `axisColor` | CSS color string | `#4b4b49` |
| `axisDateAnnotation` | string | `n/a` |
| `axisDateFormat` | string | `yyyy-MM-dd` |
| `axisFontSize` | number or numeric string | `9` |
| `axisLineWidth` | number or numeric string | `1` |
| `axisMajorInterval` | 'auto' \| 'millennia' \| 'centuries' \| 'decades' \| 'years' \| 'quarters' \| 'months' \| 'weeks' \| 'days' | `auto` |
| `axisMajorLabelFormat` | 'off' \| 'partial' \| 'component' \| 'full' | `partial` |
| `axisMinorInterval` | 'off' \| same options as axisMajorInterval | `off` |
| `axisMinorLabelFormat` | 'off' \| 'partial' \| 'component' \| 'full' | `off` |
| `axisPaddingTop` | number or numeric string | `3` |
| `axisShow` | 'off' \| 'forward' \| 'reverse' \| 'time' | `forward` |
| `axisTypefaceKey` | string | `n/a` |
| `axisTypefaceStyle` | string | `n/a` |
| `baseTheme` | Built-in theme name | `Monochrome` |
| `branchColor` | CSS color string | `#333231` |
| `branchLabelAnnotation` | string | `n/a` |
| `branchLabelColor` | CSS color string | `#aaaaaa` |
| `branchLabelDecimalPlaces` | integer >= 0, or null/omitted for auto | `null (auto)` |
| `branchLabelFontSize` | number (6..48, step 1) | `9` |
| `branchLabelPosition` | 'above' \| 'below' | `above` |
| `branchLabelSpacing` | number or numeric string | `4` |
| `branchLabelTypefaceKey` | string | `n/a` |
| `branchLabelTypefaceStyle` | string | `n/a` |
| `branchShape` | 'off' \| 'rectangle' \| 'ellipse' | `off` |
| `branchShape2Color` | CSS color string | `#aaaaaa` |
| `branchShape3Color` | CSS color string | `#aaaaaa` |
| `branchShape4Color` | CSS color string | `#aaaaaa` |
| `branchShapeAlign` | 'left' \| 'center' \| 'right' | `center` |
| `branchShapeColor` | CSS color string | `#aaaaaa` |
| `branchShapeColorBy` | string or 'off' | `off` |
| `branchShapeCountBy` | string or 'off' | `off` |
| `branchShapeFilter` | string or null | `null` |
| `branchShapeHaloColor` | CSS color string | `#ffffff` |
| `branchShapeHaloSize` | number or numeric string | `0` |
| `branchShapeHeightPct` | number (0..100, step 1) | `50` |
| `branchShapeSpacing` | number or numeric string | `3` |
| `branchShapesExtra` | array | `["off","off","off"]` |
| `branchShapeWidth` | number or numeric string (height factor, 0.05..5.0) | `1.0` |
| `branchWidth` | number or numeric string | `1.5` |
| `canvasBgColor` | CSS color string | `#ebe8e2` |
| `cladeHighlightColour` | CSS color string | `#ffaa00` |
| `cladeHighlightFillOpacity` | number or numeric string (typically 0..1) | `0.15` |
| `cladeHighlightLeftEdge` | 'atRoot' \| 'outlineNodes' | `outlineNodes` |
| `cladeHighlightPadding` | number or numeric string | `4` |
| `cladeHighlightRadius` | number or numeric string | `4` |
| `cladeHighlightRightEdge` | 'atTips' \| 'atLabels' \| 'atLabelsRight' \| 'outlineTips' | `outlineTips` |
| `cladeHighlightStrokeOpacity` | number or numeric string (typically 0..1) | `0.7` |
| `cladeHighlightStrokeWidth` | number or numeric string | `1` |
| `collapsedCladeFontSize` | number or numeric string | `11` |
| `collapsedCladeStrokeOpacity` | number or numeric string (typically 0..1) | `0.7` |
| `collapsedCladeStrokeWidth` | number or numeric string | `1` |
| `collapsedCladeTypefaceKey` | string | `n/a` |
| `collapsedCladeTypefaceStyle` | string | `n/a` |
| `dataTableOpen` | true \| false | `false` |
| `dataTablePinned` | true \| false | `false` |
| `defaultTheme` | Built-in or user theme name | `Artic` |
| `elbowRadius` | number or numeric string | `2` |
| `fontSize` | number (6..48, step 1) | `11` |
| `introAnimation` | 'x-then-y' \| 'y-then-x' \| 'simultaneous' \| 'from-bottom' \| 'from-top' \| 'none' | `x-then-y` |
| `labelColor` | CSS color string | `#4b4b49` |
| `legend2Position` | 'right' \| 'below' | `right` |
| `legend3Position` | 'right' \| 'below' | `right` |
| `legend4Position` | 'right' \| 'below' | `right` |
| `legendAnnotation2` | string | `n/a` |
| `legendAnnotation3` | string | `n/a` |
| `legendAnnotation4` | string | `n/a` |
| `legendFontSize` | number or numeric string | `11` |
| `legendHeightPct` | number or numeric string | `100` |
| `legendHeightPct2` | number or numeric string | `50` |
| `legendHeightPct3` | number or numeric string | `50` |
| `legendHeightPct4` | number or numeric string | `50` |
| `legendPadding` | number or numeric string | `12` |
| `legendTextColor` | CSS color string | `#4b4b49` |
| `legendTypefaceKey` | string | `n/a` |
| `legendTypefaceStyle` | string | `n/a` |
| `nodeBarsColor` | CSS color string | `#333231` |
| `nodeBarsEnabled` | 'off' \| 'on' | `off` |
| `nodeBarsFillOpacity` | number or numeric string (typically 0..1) | `0.22` |
| `nodeBarsLine` | 'off' \| 'mean' \| 'median' | `off` |
| `nodeBarsRange` | 'off' \| 'on' | `off` |
| `nodeBarsStrokeOpacity` | number or numeric string (typically 0..1) | `0.55` |
| `nodeBarsWidth` | number or numeric string | `6` |
| `nodeHaloSize` | number or numeric string | `1` |
| `nodeHoverFillColor` | CSS color string | `#f5a700` |
| `nodeHoverFillOpacity` | number or numeric string (typically 0..1) | `0.5` |
| `nodeHoverGrowthFactor` | number or numeric string | `2.5` |
| `nodeHoverMinSize` | number or numeric string | `6` |
| `nodeHoverStrokeColor` | CSS color string | `#f5a700` |
| `nodeHoverStrokeOpacity` | number or numeric string (typically 0..1) | `0` |
| `nodeHoverStrokeWidth` | number or numeric string | `0.5` |
| `nodeLabelAnnotation` | string | `n/a` |
| `nodeLabelColor` | CSS color string | `#aaaaaa` |
| `nodeLabelDecimalPlaces` | integer >= 0, or null/omitted for auto | `null (auto)` |
| `nodeLabelFontSize` | number (6..48, step 1) | `9` |
| `nodeLabelPosition` | 'right' \| 'above-left' \| 'below-left' | `right` |
| `nodeLabelSpacing` | number or numeric string | `4` |
| `nodeLabelTypefaceKey` | string | `n/a` |
| `nodeLabelTypefaceStyle` | string | `n/a` |
| `nodeShapeBgColor` | CSS color string | `#ebe8e2` |
| `nodeShapeColor` | CSS color string | `#4b4b49` |
| `nodeSize` | number (0..30, step 1) | `3` |
| `paddingBottom` | number (0..100, step 1) | `20` |
| `paddingLeft` | number (0..100, step 1) | `20` |
| `paddingRight` | number (0..100, step 1) | `20` |
| `paddingTop` | number (0..100, step 1) | `20` |
| `paintColour` | CSS color string | `#ff8800` |
| `paletteOpen` | true \| false | `false` |
| `palettePinned` | true \| false | `false` |
| `rootStemPct` | number (0..20, step 1) | `1` |
| `rootStubLength` | number or numeric string | `10` |
| `rttAspectRatio` | 'fit' \| '1:1' \| '4:3' \| '3:2' \| '16:9' | `fit` |
| `rttAxisColor` | CSS color string | `#4b4b49` |
| `rttAxisFontSize` | number or numeric string | `9` |
| `rttAxisLineWidth` | number or numeric string | `1` |
| `rttAxisTypefaceKey` | string | `n/a` |
| `rttAxisTypefaceStyle` | string | `n/a` |
| `rttDateFormat` | string | `yyyy-MM-dd` |
| `rttGridLines` | 'both' \| 'horizontal' \| 'vertical' \| 'off' | `off` |
| `rttMajorInterval` | 'auto' \| 'millennia' \| 'centuries' \| 'decades' \| 'years' \| 'quarters' \| 'months' \| 'weeks' \| 'days' | `auto` |
| `rttMajorLabelFormat` | 'off' \| 'partial' \| 'component' \| 'full' | `partial` |
| `rttMinorInterval` | 'off' \| same options as rttMajorInterval | `off` |
| `rttMinorLabelFormat` | 'off' \| 'partial' \| 'component' \| 'full' | `off` |
| `rttOpen` | true \| false | `false` |
| `rttPinned` | true \| false | `false` |
| `rttRegressionColor` | CSS color string | `#807e7c` |
| `rttRegressionStyle` | 'dash' \| 'bigdash' \| 'solid' | `bigdash` |
| `rttRegressionWidth` | number or numeric string | `1.5` |
| `rttResidBandColor` | CSS color string | `#807e7c` |
| `rttResidBandFillColor` | CSS color string | `#807e7c` |
| `rttResidBandFillOpacity` | number or numeric string (typically 0..1) | `0.1` |
| `rttResidBandShow` | 'off' \| 'residual' \| 'ci' | `residual` |
| `rttResidBandStyle` | 'dash' \| 'dot' \| 'solid' | `dash` |
| `rttResidBandWidth` | number or numeric string | `0.5` |
| `rttStatsBgColor` | CSS color string | `#bfbcb9` |
| `rttStatsFontSize` | number or numeric string | `11` |
| `rttStatsTextColor` | CSS color string | `#4b4b49` |
| `rttXOrigin` | 'data' \| 'root' | `root` |
| `selectedLabelStyle` | 'normal' \| 'bold' \| 'italic' \| 'bold italic' | `bold` |
| `selectedNodeFillColor` | CSS color string | `#831100` |
| `selectedNodeFillOpacity` | number or numeric string (typically 0..1) | `0.5` |
| `selectedNodeGrowthFactor` | number or numeric string | `1` |
| `selectedNodeMinSize` | number or numeric string | `5` |
| `selectedNodeStrokeColor` | CSS color string | `#5c0700` |
| `selectedNodeStrokeOpacity` | number or numeric string (typically 0..1) | `0.5` |
| `selectedNodeStrokeWidth` | number or numeric string | `0.5` |
| `selectedTheme` | Built-in or user theme name | `Artic` |
| `selectedTipFillColor` | CSS color string | `#004d65` |
| `selectedTipFillOpacity` | number or numeric string (typically 0..1) | `0.5` |
| `selectedTipGrowthFactor` | number or numeric string | `1` |
| `selectedTipMinSize` | number or numeric string | `5` |
| `selectedTipStrokeColor` | CSS color string | `#00364a` |
| `selectedTipStrokeOpacity` | number or numeric string (typically 0..1) | `0.5` |
| `selectedTipStrokeWidth` | number or numeric string | `1` |
| `tipHaloSize` | number or numeric string | `1` |
| `tipHoverFillColor` | CSS color string | `#f5a700` |
| `tipHoverFillOpacity` | number or numeric string (typically 0..1) | `0.5` |
| `tipHoverGrowthFactor` | number or numeric string | `2.5` |
| `tipHoverMinSize` | number or numeric string | `6` |
| `tipHoverStrokeColor` | CSS color string | `#f5a700` |
| `tipHoverStrokeOpacity` | number or numeric string (typically 0..1) | `0` |
| `tipHoverStrokeWidth` | number or numeric string | `0.5` |
| `tipLabelAlign` | 'off' \| 'aligned' \| 'dots' \| 'dashed' \| 'solid' | `off` |
| `tipLabelDecimalPlaces` | integer >= 0, or null/omitted for auto | `null (auto)` |
| `tipLabelShape` | 'off' \| 'square' \| 'circle' \| 'block' | `off` |
| `tipLabelShapeColor` | CSS color string | `#aaaaaa` |
| `tipLabelShapeExtraColourBys` | array | `["user_colour","user_colour","user_colour","user_colour","user_colour","user_colour","user_colour","user_colour","user_colour"]` |
| `tipLabelShapeMarginLeft` | string | `2` |
| `tipLabelShapesExtra` | array | `["off","off","off","off","off","off","off","off","off"]` |
| `tipLabelShapeSize` | number or numeric string | `50` |
| `tipLabelShapeSpacing` | number or numeric string | `3` |
| `tipLabelShow` | 'off' \| 'name' \| <annotation-key> | `name` |
| `tipLabelSpacing` | number (0..20, step 1) | `3` |
| `tipLabelsExtra` | array of 3 values ('off' \| 'name' \| <annotation-key>) | `['off','off','off']` |
| `tipLabelsExtraLayouts` | array of 3 values ('append' \| 'align' \| 'join-space' \| 'join-pipe' \| 'join-slash' \| 'join-underscore' \| 'join-dash') | `['append','append','append']` |
| `tipShapeBgColor` | CSS color string | `#4b4b49` |
| `tipShapeColor` | CSS color string | `#ebe8e2` |
| `tipSize` | number (0..30, step 1) | `3` |
| `typeface` | string | `Monospace` |
| `typefaceStyle` | 'Regular' \| 'Bold' \| 'Italic' \| 'Bold Italic' | `Regular` |

## Notes

- Defaults come from `DEFAULT_SETTINGS` and `DEFAULT_THEME` in code.
- Decimal-place keys (`tipLabelDecimalPlaces`, `nodeLabelDecimalPlaces`, `branchLabelDecimalPlaces`) default to auto when null/omitted.
- Some keys accept annotation names from loaded tree metadata (for example `tipLabelShow`, `nodeLabelAnnotation`, `branchLabelAnnotation`).
