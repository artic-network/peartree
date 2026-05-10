<p align="center">
  <img src="logo/peartree.svg" alt="PearTree logo" width="120" />
</p>

<h1 align="center">PearTree</h1>

<p align="center">
  A modern, browser-based phylogenetic tree viewer — the successor to FigTree
</p>

<p align="center">
  <a href="https://peartree.live"><strong>Browser app</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/artic-network/peartree/releases"><strong>Desktop download</strong></a> &nbsp;·&nbsp;
  <a href="https://artic-network.github.io/peartree/manual/"><strong>Manual</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/artic-network/peartree"><strong>Source code</strong></a>
</p>

---

## Overview

PearTree is a phylogenetic tree viewer that runs entirely in your browser or as a native desktop application (macOS, Windows, Linux). It is the direct successor to [FigTree](https://github.com/rambaut/figtree) and is designed to replace it for the everyday tasks of exploring, annotating, and publishing phylogenetic trees — including the large, richly annotated trees produced by [BEAST](https://beast.community/) and [BEAST X](https://beast.community/).

No data is ever uploaded to a server. All processing runs locally on your machine.

<!-- Screenshot placeholder — replace with actual screenshot once available -->
<!--
<p align="center">
  <img src="docs/images/screenshot_main.png" alt="PearTree showing the EBOV example tree" width="800" />
  <br><em>PearTree showing the Ebola virus (EBOV) example tree with temporal axis and RTT plot.</em>
</p>
-->

---

## Key Features

### Tree Viewing
- Reads **NEXUS** and **Newick** files, including full support for BEAST/BEAST X metacomment annotations (HPD intervals, posterior values, node heights, etc.)
- Smooth pan and zoom with mouse or trackpad; animated fit-to-window and fit-labels modes
- **Hyperbolic lens** — magnify any part of a large tree without losing context
- **Subtree navigation** — drill into any clade and climb back up through a navigation history
- **Node bars** — display HPD intervals or range whiskers on internal nodes (BEAST output)

### Tree Organisation
- **Branch ordering** — sort clades ascending or descending by clade size
- **Rotation** — flip individual nodes or entire subtrees
- **Collapse / expand** — collapse clades to triangles with configurable height and labels
- **Hide / show** — hide entire subtrees while retaining tree topology

### Annotations & Colouring
- Import metadata from **CSV / TSV** files and join on tip names
- Colour tips, nodes, branches, and labels by any annotation — categorical or continuous
- Multiple configurable **legend** panels with palette and scale-mode overrides
- **Annotation Curator** — rename, reorder, delete, and edit annotation values in-app
- **Data Table panel** — spreadsheet-like view of tip annotations, aligned with the tree; supports inline editing
- Full support for BEAST continuous and discrete trait annotations

### Rooting & Temporal Analysis
- **Midpoint rooting** — find the root at the midpoint of the longest path
- **Temporal rooting** — global or branch-local root search maximising clock-signal R²
- **Root-to-tip (RTT) panel** — interactive regression plot; click points to select tips; export RTT data as CSV
- **Calibrated time axis** — map divergence to calendar dates using any date annotation

### Selection & Filtering
- Click tips or nodes; extend selections with Shift-click or drag; select-all
- **Tip filter box** — filter by any annotation with field / operator / value selectors
- **Saved filters** — store and restore named filter sets
- **Highlight** and **paint** (user-assigned colours) selected clades

### Themes & Export
- **Themes** — built-in Solarized dark/light palettes; save custom themes; set a default
- Light/dark mode toggle
- Export trees as **NEXUS** or **Newick**, optionally embedding PearTree display settings
- Export graphics as **SVG** or **PNG** at any resolution; export RTT plot as SVG/PNG
- **Embed display settings** in NEXUS files so collaborators see the same view on open

### BEAST / BEAST X Integration
- Natively parses all BEAST 1 and BEAST X NEXUS output formats
- Displays node bars (HPD intervals) aligned with internal nodes
- First-class support for `height`, `height_95%_HPD`, `height_median`, `posterior`, `rate`, and all standard BEAST annotations out of the box
- Temporal rooting and RTT analysis designed for clock-calibrated phylogenies

### Web & Desktop
- **Web application** at [peartree.live](https://peartree.live) — works in any modern browser with no installation
- **Desktop app** (via [Tauri 2](https://tauri.app/)) for macOS, Windows, and Linux — native file open/save dialogs, file-type associations, and auto-updates
- Open remote tree files by URL; share links that pre-load a specific tree (`?treeUrl=…`)

---

## Getting PearTree

| Platform | Link |
|---|---|
| **Web app** (no install) | [https://peartree.live](https://peartree.live) |
| **macOS** (Apple Silicon & Intel) | [GitHub Releases](https://github.com/artic-network/peartree/releases) |
| **Windows** | [GitHub Releases](https://github.com/artic-network/peartree/releases) |
| **Linux** | [GitHub Releases](https://github.com/artic-network/peartree/releases) |

---

## Screenshots

<!-- Replace the placeholders below with real screenshots -->

| Main view | Visual Options palette |
|---|---|
| *Screenshot coming soon* | *Screenshot coming soon* |

| Root-to-Tip panel | Data Table panel |
|---|---|
| *Screenshot coming soon* | *Screenshot coming soon* |

---

## Documentation

- **Manual:** [https://artic-network.github.io/peartree/manual/](https://artic-network.github.io/peartree/manual/)
- **Embedding API:** [embedded-api.md](embedded-api.md) — embed PearTree in your own web pages
- **URL/UI/Settings reference:** [url-settings-reference.md](url-settings-reference.md) — complete query params plus `ui` and `settings` keys
- **Tauri build notes:** [tauri-build.md](tauri-build.md)

---

## Credits

**Design & development:** [Andrew Rambaut](https://github.com/rambaut) (University of Edinburgh)  
**Coding:** Claude Sonnet 4.6 within GitHub Copilot & [Andrew Rambaut](https://github.com/rambaut)

---

## Funding

Development of PearTree has been supported by:

- **Wellcome Trust** — through the [ARTIC Network](https://artic.network/), a project developing rapid genomic surveillance and outbreak response tools for viral pathogens (Discretionary Award 313694/Z/24/Z and Collaborative Award 206298/Z/17/Z).

- **Gates Foundation** — supporting open-source genomic epidemiology tools for global health.

### The ARTIC Network

The [ARTIC Network](https://artic.network/) is a collaborative project focused on real-time genomic surveillance of viral outbreaks. It develops open laboratory protocols, bioinformatics pipelines, and analysis tools — including PearTree — to enable rapid phylogenetic analysis during public health emergencies. ARTIC tools have been deployed in responses to Ebola, SARS-CoV-2, and other viral outbreaks worldwide.

---

## Source Code & Licence

PearTree is open source and released under the [MIT License](LICENSE).

Source code: **[github.com/artic-network/peartree](https://github.com/artic-network/peartree)**

---

## Libraries & Dependencies

**Web / UI**

- [PearCore](https://github.com/rambaut/pearcore/) — Common ARTIC App Framework
- [Bootstrap 5](https://getbootstrap.com/) — UI framework
- [Bootswatch Solar](https://bootswatch.com/solar/) — dark theme
- [Bootstrap Icons](https://icons.getbootstrap.com/) — iconography
- [Marked](https://marked.js.org/) — Markdown rendering

**Desktop app**

- [Tauri 2](https://tauri.app/) — cross-platform desktop shell (Rust + WebView)
- [tauri-plugin-dialog](https://github.com/tauri-apps/plugins-workspace) — native file open/save dialogs
- [tauri-plugin-opener](https://github.com/tauri-apps/plugins-workspace) — open URLs and files in system default apps
- [tauri-plugin-deep-link](https://github.com/tauri-apps/plugins-workspace) — file-association and URL-scheme handling
- [tauri-plugin-updater](https://github.com/tauri-apps/plugins-workspace) — automatic update delivery
- [serde](https://serde.rs/) — Rust serialisation framework
- [base64](https://github.com/marshallpierce/rust-base64) — base64 encoding/decoding
