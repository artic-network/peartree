# Change Log

## v1.3.0

### Features

- Add branch line colouring by annotation (**Branches → Colour by**), including palette configuration support.
- Allow stacking multiple node bars / HPD intervals.
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
