# Change Log

## Unreleased

### Fixes

- Fix time-tree and rooted-state inference so trees only become time trees when supported by the data, while preserving rooted/unrooted state for rerooting and root warnings.
- Correct the live "Get info" summary to report the actual tree state instead of stale values.
- Fix EBOV time-tree detection precedence so explicit root-height annotations take priority over correlation-based calibration fallback.
- Fix console errors in the tree info panel caused by stale calibration-state references.
- Tighten numeric coercion for imported annotations so values only become numeric when every token is individually coercible, preserving labels such as `123/456` as categorical strings.
- Fix SVG export so node and tip shapes honour the same annotation-derived palette logic as the on-screen renderer, including built-in stats such as `Tips Below`.

## v1.3.2

### Fixes

- Fix clipping of tip labels and decorations at the top and bottom of trees when labels or branch decorations are visible.
- Improve compatibility for older macOS builds of the Tauri app by removing the runtime dependency on import-map-based frontend bootstrapping.

### Internal / maintenance

- Update the Tauri bundling and staging flow to use a bundled app entry for legacy WebKit compatibility.

## v1.3.1

### Fixes

- Fix dynamic padding issues in tree layout and rendering.
- Fix SVG export parity with the canvas renderer, including axis lines, padding, and layering issues.
- Fix node-shape filters incorrectly suppressing labels in exported SVG output.
- Fix padding so it accommodates node bars and other decorations without clipping labels.
- Improve the toolbar layout and minor UI polish.
- Fix browser link handling to open external links in the user’s browser.

### Internal / maintenance

- Add a large-tree transition threshold to disable animated transitions for very large tip counts.
- Improve SVG component layering and export behavior.
- Refresh help/manual links and related documentation entry points.

## v1.3.0

### Features

- Add branch line colouring by annotation (**Branches → Colour by**), including palette configuration support.
- Allow stacking multiple node bars / HPD intervals.
- Add KDE curve support for node bars (in addition to HPD intervals).
- Add special filter conditions via **Node** field: `is root`, `is not root`, `is tip`, `is internal`.
- Add support for Newick trees containing `[&R]` markers.
- Add status-bar messaging when tips are hidden.

### Fixes

- Fix loading of secondary/extra tip label selections.
- Fix RTT panel overlap with legend when pinned.
- Fix PNG export cropping.
- Fix time axis to span to limits of node bars.
- Fix axis overflow drawing issues that could clip labels.

### Internal / maintenance

- Unify canvas and SVG rendering paths so exported SVG output more closely matches on-screen visuals.
- Overhaul tree/decoration layout and padding solving, including improved handling of axis-label overhang.
- Clean up and regroup settings definitions for consistency with the side palette.

## v1.2.2

- Fixed issue with not loading secondary tip label choices
- Fixed issue with RTT panel obscuring legend when pinned
- Add per-annotation palette reverse flags, with a Reverse toggle in the Configure Palette dialog.
- Keep RTT selected points visually in sync with Selected Tips styles from Selection & Hover controls.

## v1.2.1

- Fixed an issue with exporting an SVG graphic of the entire tree

## v1.2.0

- Add per-legend spacing controls for stacked and side-by-side legends.
- Add per-legend decimal-place controls and Palette Configure buttons.
- Add a Help panel section-jump dropdown generated from markdown headings.

## v1.1.0

- Add axis range controls, including explicit range overrides.
- Add the RTT x-axis interval-range option.
- Add embed selection, visibility, and hover listener APIs, plus reverse selection linking helpers.
- Improve settings handling and config import/export consistency.
- Support loading filters from tree files and storing filter settings as objects.
- Preserve hidden-node state and add optional embed borders / rounded-corner cropping.
- Copy trees and taxon labels to the clipboard.
- Paste trees into an empty page or window.
- Choose which tip and node labels are used in exports.
- Add multiple fields to tip labels.
- Show branch shapes for events on a branch.

## v1.0.0

- First full release.
