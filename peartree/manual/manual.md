---
layout: page
title: PearTree Manual
permalink: /manual/
---

<p align="center">
  <img src="/logo/peartree.svg" alt="PearTree logo" style="width:220px;" />
</p>

# PearTree Manual

PearTree is a phylogenetic tree viewer that runs entirely in the browser or as a desktop application. No data is ever uploaded to any server — all processing is local to your machine.

This manual covers the full feature set of PearTree, organised by topic. Each chapter can be read independently. The [Quick-Reference](#appendix-a-keyboard-shortcuts) appendix at the end lists all keyboard shortcuts.

> **Where to get PearTree**
>
> - **Web application:** [https://peartree.live](https://peartree.live) (Chrome, Firefox, Safari, Edge)
> - **Desktop app:** [https://github.com/artic-network/peartree/releases](https://github.com/artic-network/peartree/releases) (macOS, Windows, Linux)
>
> All features described in this manual work in both versions unless noted.


## Contents

1. [The Interface at a Glance](#chapter-1-the-interface-at-a-glance)
2. [Loading Trees](#chapter-2-loading-trees)
3. [Importing Annotations](#chapter-3-importing-annotations)
4. [Navigating the Tree](#chapter-4-navigating-the-tree)
5. [The Hyperbolic Lens](#chapter-5-the-hyperbolic-lens)
6. [Selecting and Filtering](#chapter-6-selecting-and-filtering)
7. [Organising the Tree](#chapter-7-organising-the-tree)
8. [Decorating the Tree](#chapter-8-decorating-the-tree)
9. [Filtering](#chapter-9-filtering)
10. [The Time Axis](#chapter-10-the-time-axis)
11. [Rooting](#chapter-11-rooting)
12. [The Root-to-Tip Panel](#chapter-12-the-root-to-tip-panel)
13. [The Data Table Panel](#chapter-13-the-data-table-panel)
14. [Exporting](#chapter-14-exporting)
15. [Settings and Persistence](#chapter-15-settings-and-persistence)
15. [Appendix A: Keyboard Shortcuts](#appendix-a-keyboard-shortcuts)
16. [Appendix B: Visual Options Reference](#appendix-b-visual-options-reference)
17. [Appendix C: Bootstrap Values and Branch Annotations](#appendix-c-bootstrap-values-branch-annotations-and-rerooting)
18. [Appendix D: URL Parameters and Sharing](#appendix-d-url-parameters-and-sharing)


## Chapter 1: The Interface at a Glance

When a tree is loaded the interface has four main areas:

{% include 'figure.html', src: "images/app_window.png", alt: "EBOV example tree loaded", maxwidth: "550px", border: "none", padding: "0", legend: "EBOV example tree loaded. The toolbar runs along the top, the canvas fills the centre, and the status bar sits at the bottom. The Visual Options palette is shown toggled open on the right. Other panels such as the metadata table and temporal signal (root-to-tip) plot open on the right." %}

### Toolbar

Runs along the top of the window. Contains buttons grouped by function:

| Group | What it contains |
|---|---|
| **Visual Options** | Toggle the Visual Options palette (also **Tab**) |
| **File** | Open tree, import annotations, export tree, export graphic |
| **Annotations** | Annotation curator |
| **Info** | Node info (**⌘I**) |
| **Navigation** | Back, forward, drill into subtree, climb up one level, home |
| **Zoom** | Zoom in, zoom out, fit all, fit labels |
| **Order** | Sort clades ascending / descending |
| **Rotate** | Rotate selected node, rotate entire subtree |
| **Rooting** | Node / branch mode toggle, invert selection; reroot, midpoint root, global temporal root, local temporal root |
| **Hide / Show** | Hide selected subtree, unhide |
| **Collapse** | Collapse clade to triangle, expand triangle |
| **Colour** | Colour picker swatch, apply colour, clear user colours, highlight clade, clear highlights |
| **Filter** | Tip filter box with field selector, match-operator selector, saved-filter selector, save-filter button, and buttons for **Manage Filters** / **Manage Palettes** |
| **Panels** | Data table panel toggle, root-to-tip panel toggle |

### Visual Options Palette

Slides in from the right. Toggle with the sliders button in the status bar or press **Tab**. Contains all display controls organised into collapsible sections. Sections are locked until a tree is loaded, then unlock automatically.

### Status Bar

Runs along the bottom. Shows live annotation values for the tip or node under the cursor. Also displays mode messages such as *Lens mode active – press Esc to cancel*.

### Canvas

The tree drawing fills all available space between the toolbar and status bar. Zoom and scroll with the mouse or trackpad. The tip labels are not shown unless zoomed to a level that they don't overlap.


## Chapter 2: Loading Trees

### Supported Formats

PearTree reads **NEXUS** (`.nex`, `.nexus`, `.tre`, `.tree`, `.treefile`) and **Newick** (`.nwk`, `.newick`) files. Tree data stored in NEXUS metacomments (e.g. BEAST output) is fully supported.

### Opening a File

Click the **open** button {%- include 'btn.html', id: "btn-open-tree" %} in the toolbar, or press **⌘O**, to open the *Open Tree File* dialog.

Three tabs are available:

**File tab** — drag a file onto the drop zone or click *Choose file* to browse.

{% include 'dialog-open-tree.html', tab: "file", maxwidth: "460px", legend: "<em>Open Tree File</em> dialog, File tab. The file stays on your computer — nothing is uploaded." %}


**URL tab** — paste a public URL to a remote tree file and click *Load from URL*. The remote server must allow cross-origin requests (CORS). GitHub raw URLs (`raw.githubusercontent.com/…`) work out of the box.

{% include 'dialog-open-tree.html', tab: "url", maxwidth: "460px", legend: "<em>Open Tree File</em> dialog, URL tab." %}


**Example tab** — choose from a set of built-in example datasets:

| Dataset | Description |
|---|---|
| **Ebola virus (EBOV)** | Phylogenetic tree from the 2014–2016 West Africa epidemic — used throughout the examples in this manual |
| **SARS-CoV-2 (15K)** | Large SARS-CoV-2 tree with ~15,000 sequences — useful for testing performance with big trees |
| **Variola virus (VARV)** | Smallpox virus (variola) phylogeny |

Click a dataset card to load it immediately.

{% include 'dialog-open-tree.html', tab: "example", maxwidth: "460px", legend: "<em>Open Tree File</em> dialog, Example tab." %}

### The Startup Screen

When no tree is loaded, the canvas shows the startup screen with direct **Open…** and **Example…** buttons.

{% include 'figure.html', src: "images/startup.png", alt: "Startup screen", maxwidth: "220px", bg: "#02292E", legend: "Startup screen." %}

{% tip %}
You can share a link that opens a remote tree automatically. Append `?treeUrl=<URL>` to the PearTree web address — anyone who follows the link has the tree loaded immediately with no upload required. See [Appendix D](#appendix-d-url-parameters-and-sharing) for details.
{% endtip %}

### Opening a NEXUS File with Embedded Settings

If a NEXUS file was exported from PearTree with **Embed settings** ticked (see [Chapter 14](#chapter-14-exporting)), opening it restores the full visual appearance automatically — theme, palette choices, colouring, legends, and axis configuration.


## Chapter 3: Importing Annotations

Tree files embed per-tip metadata written by the inference tool (e.g. BEAST posterior values, HPD intervals). You can also add your own metadata from an external table at any time.

### Importing a CSV or TSV File

Click the annotation-import button {%- include 'btn.html', id: "btn-import-annot" %} in the toolbar or press **⌘⇧A**.

{% include 'dialog-import-annot.html', phase: "pick", maxwidth: "480px", legend: "Import Annotations dialog." %}

Drag a CSV or TSV file onto the drop zone, or click *Choose file* to browse. In the web app you can also switch to the *URL* tab and paste a public URL directly — for example the EBOV annotation file used in this manual:

```
https://artic-network.github.io/peartree/docs/data/ebov.csv
```

{% note %}
For the desktop app, a system file chooser appears instead of the URL tab. The EBOV annotation file can be downloaded from the URL above and then selected in the file chooser.
{% endnote %}

#### Match Configuration

After selecting the file a configuration step appears. Choose which column in the metadata file identifies each tip:

{% include 'dialog-import-annot.html', phase: "config", maxwidth: "480px", legend: "Import configuration: choose the column that matches tip labels, and toggle which columns to import." %}

PearTree can match the entire tip label string, or just one pipe-delimited (`|`) field within it. For the EBOV example, select field 2 (`lab-id`) to match the second segment of each label.

#### Import Summary

After clicking **Import**, a summary reports how many tips were matched.

{% include 'figure.html', src: "images/import_summary.png", alt: "Import summary", maxwidth: "460px", bg: "#083642", legend: "Import summary confirming all 1610 tips matched." %}

After import the new annotation keys appear in all *Colour by* dropdowns, the legend selector, and the Node Info dialog.

### The Annotation Manager

Open the Annotation Manager {%- include 'btn.html', id: "btn-curate-annot" %} from the toolbar to review every annotation key currently loaded.

{% include 'dialog-annotation-manager.html', maxwidth: "800px" %}

For each annotation you can:

| Action | Description |
|---|---|
| **Rename** | Give an annotation a more readable display label |
| **Change type** | Switch between *categorical* and *real* (continuous numeric) |
| **Palette** | Open colour settings for the annotation (palette choice and numeric scale mode) |
| **Branch annotation** | Mark an annotation as belonging to branches rather than nodes — affects how values move when rerooting (see [Appendix C](#appendix-c-bootstrap-values-branch-annotations-and-rerooting)) |

{% tip %}
If your tree uses a non-standard name for bootstrap values (e.g. `UFBoot` from IQ-TREE), open the Annotation Manager and tick **Branch annotation** for that key so PearTree handles it correctly when rerooting.
{% endtip %}

### Parse Tip Names

The **Parse Tips** button at the bottom of the Annotation Curator opens the Parse Tip Names dialog. This extracts a new annotation from tip names by splitting each label on a delimiter.

{% include 'dialog-parse-tips.html', maxwidth: "460px" %}

| Field | Description |
|---|---|
| **Name** | The annotation key that will be created |
| **Delimiter** | The character(s) used to split each tip label (e.g. `\|`, `_`, `-`) |
| **Field** | Which segment to extract: `1` = first, `2` = second, `-1` = last, etc. |
| **Type** | Data type for the new annotation — *Auto-detect* examines all values and picks the most specific type |
| **Missing** | A field value that should be treated as missing data (shown as an empty cell) |

A preview of how three example tip labels will be parsed is shown at the bottom of the dialog.

{% tip %}
Many BEAST and epidemiological tree files encode metadata directly in the tip name using `|` as a separator — for example `EBOV|G3732|SLE|2014-08-13`. Use Parse Tip Names to pull out the country field (`field 3`) or sampling date (`field 4`) as a proper typed annotation without needing a separate CSV file.
{% endtip %}


## Chapter 4: Navigating the Tree

*The examples in this chapter use the EBOV example tree (1610 tips). For navigation in very large trees, try loading `data/SARS-CoV-2_15K.tree` (15,000 tips).*

There are a range of option for zooming into the tree, scrolling and navigating into subtrees or clades. The mouse/trackpad can be used to scroll and zoom with the scroll wheel or with standard gestures on the trackpad. Various hotkeys can be used to get more precise control.

### Scrolling and Zooming

| Gesture / key | Effect |
|---|---|
| **Scroll wheel** / two-finger drag | Pan vertically |
| **⇧ + scroll** | Zoom in/out, anchored at the cursor position |
| **Pinch** (trackpad) | Zoom in/out |
| **↑ / ↓** | Scroll one row |
| **⌘↑ / ⌘↓** | Scroll one page |
| **⌘⇧↑ / ⌘⇧↓** | Jump to the top or bottom of the tree |

The toolbar also has buttons for zooming in and out and fitting the tree to the window or expanding to see the labels. These buttons also have keyboard shortcuts.

*Toolbar zoom buttons*: {% include 'btn-group.html', ids: "btn-zoom-in btn-zoom-out btn-fit btn-fit-labels", label: "Toolbar zoom buttons" %}

| Button | Shortcut | Action |
|---|---|---|
| {%- include 'btn.html', id: "btn-zoom-in" %} | **⌘+** | Zoom in ×1.5 |
| {%- include 'btn.html', id: "btn-zoom-out" %} | **⌘−** | Zoom out ×1.5 |
| {%- include 'btn.html', id: "btn-fit" %} | **⌘0** | Fit entire tree to window |
| {%- include 'btn.html', id: "btn-fit-labels" %} | **⌘⇧0** | Fit Labels — zoom so no tip labels overlap |

The **Fit Labels** button {%- include 'btn.html', id: "btn-fit-labels" %} or **⌘⇧0** keyboard shortcut zooms the tree vertically sufficiently that the labels can be shown without any overlap. This will depend on the label font size (set in the [Tip Labels](#tip-labels) section of the control panel). If one or more tips are selected then the zoom will keep the these visible in the window.

{% include 'figure.html', src: "images/zoomed_tree.png", alt: "EBOV tree zoomed in", maxwidth: "80%", bg: "#EAE8E1", legend: "EBOV tree zoomed in to show individual tip labels. Only the top portion of the tree is being shown." %}

Press {%- include 'btn.html', id: "btn-fit" %} button or **⌘0** keyboard shortcut to return to the full view of the tree (this may hide the tip labels again if there is not enough space to show them).

{% note %}
**Automatic horizontal scaling:** PearTree only supports vertical zoom. This is a design decision because horizonal zooming can hide the branching order and hinder navigation. The tree is scaled horizontally to fill the available space. The ratio of the vertical scale and fixed horizonal scale determines the aspect ratio of the tree when [exported as a graphic](#exporting-a-graphic).
{% endnote %}

### Subtree Navigation

**Double-click** any internal node to zoom into its subtree. The canvas re-renders showing only the descendants of that node, scaled to fill the full window. Alternatively, select an internal node or a set of tips (this will select the most recent common ancestor of the tips) and click the drill-down button {%- include 'btn.html', id: "btn-drill" %} or press **⌘⇧>**.

{% include 'figure.html', src: "images/select_clade.png", alt: "Subclade before drilling down", maxwidth: "80%", bg: "#EAE8E1", legend: "A subclade is selected."   %}

{% include 'figure.html', src: "images/drilldown_clade.png", alt: "Subclade after drilling down", maxwidth: "80%", bg: "#EAE8E1", legend: "The subclade as viewed after drilling down using the drill-down button or keyboard shortcut." %}

PearTree maintains a full navigation history that works like a web browser. Drill down into several different clades in sequence, then press **⌘[** to step back through each view. **⌘]** goes forward again. This makes it easy to compare distant parts of a large tree without re-navigating each time.

The **Climb Up** button {%- include 'btn.html', id: "btn-climb" %} or **⌘⇧<** keyboard shortcut moves the view out to include the direct parent node (i.e., one node closer to the root). The **Home** button {%- include 'btn.html', id: "btn-home" %} or **⌘\\** keyboard shortcut restores the view to show the entire tree. Both these steps will be included in the navigation history so the back button will take you back to the former view.

Navigation tools: {% include 'btn-group.html', ids: "btn-back btn-forward", label: "Navigation" %} {% include 'btn-group.html', ids: "btn-drill btn-climb btn-home", label: "Navigation" %}
| Button | Shortcut | Effect |
|---|---|---|
| {%- include 'btn.html', id: "btn-back" %} | **⌘[** | Go back to the previous view in the navigation history |
| {%- include 'btn.html', id: "btn-forward" %} | **⌘]** | Go forward in the navigation history - restoring a view after using the back function |
| {%- include 'btn.html', id: "btn-drill" %} | **⌘⇧** | Drill into selected subtree opening a new view showing only that subtree |
| {%- include 'btn.html', id: "btn-climb" %} | **⌘⇧<** | Step up one level toward the root revealing including node above the current subtree |
| {%- include 'btn.html', id: "btn-home" %} | **⌘\\** | Return to the full-tree root view |

## Chapter 5: The Hyperbolic Lens

The hyperbolic lens expands a region of the tree to label-readable spacing without losing the surrounding context — the rest of the tree compresses but remains fully visible.

### Activating the Lens

Hold **~** (tilde/backtick) and move the cursor over the canvas. The tree distorts around the cursor's vertical position.

{% include 'figure.html', src: "images/lens_view.png", alt: "Hyperbolic lens active", maxwidth: "80%", bg: "#EAE8E1", legend: "Lens active: tips near the cursor are spread apart and readable; tips further away are compressed but still visible." %}

The lens **persists** after you release **~** — the focus locks in place so you can click, select, or inspect the expanded region normally. Re-hold **~** and move to reposition the focus. Press **Escape** to dismiss.

Clicking the **Fit Labels** button {%- include 'btn.html', id: "btn-fit-labels" %} or **⌘⇧0** keyboard shortcut will turn off the lens mode with the visible labels centred on the screen.

While the lens is active a reminder appears in the status bar: *Lens mode active – press Esc to cancel*.

<!-- ### Adjusting the Lens Width

The **Lens** ⊕/⊖ buttons in the toolbar (or **⌘⇧=** / **⌘⇧−**) control how many tip rows wide the uniformly-expanded flat centre zone is:

- **⊕** — add one row of spacing to the flat zone
- **⊖** — remove one row
- At zero (default) the lens is a pure hyperbolic falloff from the focus point

Peak magnification caps at the *Fit Labels* spacing level, so labels in the expanded zone never overlap. -->

{% tip %}
The hyperbolic lens is ideal for large trees where fully zooming in would hide the context. Hold **~**, move to the region of interest, release to lock the focus, then interact with the expanded section. Press **Escape** when done.
{% endtip %}


## Chapter 6: Selecting and Filtering

### Selection Modes

PearTree has two selection modes – node selection and branch selection. Which mode is currently in operation is shown by the toolbar buttons {%- include 'btn-group.html', ids: "btn-mode-nodes btn-mode-branches" %}. The default is the node selection mode.

{% note %}
If the tree is determined to be rooted when it is loaded (for example if it is a BEAST or other time-calibrated tree) then the selection mode buttons (and the rooting buttons) are not shown. 
{% endnote %}

**Node selection operations**

- **Click a tip** — selects that tip; the status bar shows its name and divergence
- **Click an internal node** — selects all descendant tips; a teal MRCA ring marks the node
- **⌘-click** — add to or remove from the current selection
- **Click and drag** — drag-select all tips within a rectangular area
- **⌘A** — select all visible tips
- **⌘⇧I** — invert the selection (also available as the {%- include 'btn.html', id: "btn-invert-selection" %} toolbar button)
- **Click empty canvas** — clear the selection

{% include 'figure.html', src: "images/select_clade.png", alt: "Tips selected with MRCA ring", maxwidth: "80%", bg: "#EAE8E1", legend: "A group of tips selected (highlighted in blue) with MRCA ring visible on their most recent common ancestral node (highlighted in red)." %}

**Branches mode (⌘B)**

Press **⌘B** or click the branch-mode button {%- include 'btn.html', id: "btn-mode-branches" %} to switch. Click anywhere along a horizontal branch to place a precise positional marker. This mode enables exact-position rerooting (see [Chapter 11](#chapter-11-rooting)).

{% tip %}
Branches mode is mainly used for precise manual rerooting. The example EBOV tree is an explicitly-rooted BEAST tree, so rerooting is disabled for it. Use `data/varv_rooted.nwk` or `data/large_tree.tree` to practise rerooting and see [Chapter 11](#chapter-11-rooting).
{% endtip %}

Press **⌘B** again to return to Nodes mode.

### Selecting with the Filter Box

Typing into the filter box in the toolbar is the quickest way to select tips by name or annotation value. Choose a field and operator from the buttons to the left of the input, then type a value — matching tips are selected immediately.

For example, choose *Name contains* and type `SLE` to select all Sierra Leone EBOV tips. Press **Escape** or clear the box to remove the filter (the selection remains in place).

{% include 'filter-box.html', contents: "SLE" -%}<br />
<br />

For the full set of filter operators, saved named filters, and the Filter Manager, see [Chapter 9](#chapter-9-filtering).

### Node Info

Select any node or tip, then press **⌘I** or click the {%- include 'btn.html', id: "btn-node-info" %} button. The Node Info dialog lists every annotation on that node — name, divergence, branch length, posterior support, date, and any imported custom fields. The node can be named by typing into the text field and this will be used as a name for the clade (or can be displayed as a node label).

{% include 'figure.html', src: "images/node_info.png", alt: "Node Info dialog", maxwidth: "400px", bg: "#063642", legend: "Node Info dialog for a selected EBOV internal node." %}

The tip info box similarly shows information and annotations for the selected tip such as those loaded from a CSV file. 

{% include 'figure.html', src: "images/tip_info.png", alt: "Tip Info dialog", maxwidth: "400px", bg: "#063642", legend: "Tip Info dialog for a selected EBOV tip." %}

In both boxes the **Copy as TSV** button will copy the contents of the box to the clipboard in TSV format for pasting into another application such as a spreadsheet. 

## Chapter 7: Organising the Tree

### Branch Ordering

The **Order** buttons sort all clades by descendant count, giving a ladder-like layout. This can be useful to provide a clearer layout of the tree.

The node ordering buttons: {% include 'btn-group.html', ids: "btn-order-asc btn-order-desc", label: "Order" %}

| Button | Shortcut | Effect |
|---|---|---|
| {%- include 'btn.html', id: "btn-order-asc" %} | **⌘U** | Larger clades toward the top |
| {%- include 'btn.html', id: "btn-order-desc" %} | **⌘D** | Larger clades toward the bottom |

{% include 'figure.html', src: "images/sort_up.png", alt: "EBOV tree with ascending order", maxwidth: "50%", bg: "#EAE8E1", legend: "EBOV tree with ascending (larger clades upward) order applied." %}

{% include 'figure.html', src: "images/sort_down.png", alt: "EBOV tree with ascending order", maxwidth: "50%", bg: "#EAE8E1", legend: "EBOV tree with ascending (larger clades upward) order applied." %}

{% note %}
Once ordered, the original clade order is lost. You can switch between ascending and descending ordering, or rotate individual nodes manually (see below). Hiding a node (see below) also clears the branch ordering since the tip counts have changed.
{% endnote %}

### Rotating Nodes

'Rotating' swaps the order of a node's direct children (or recursively all children in a clade). This is a purely cosmetic change — the topology and branch lengths are unchanged.

Select an internal node, then use the Rotate buttons:

The node rotation buttons: {% include 'btn-group.html', ids: "btn-rotate btn-rotate-all", label: "Rotate" %}

| Button | Effect |
|---|---|
| {%- include 'btn.html', id: "btn-rotate" %} | Reverse the direct children of the selected node only |
| {%- include 'btn.html', id: "btn-rotate-all" %} | Recursively reverse children at every level within the selected subtree |

1. Select an internal node in the tree.

{% include 'figure.html', src: "images/clade_selected.png", alt: "Tree before rotation", maxwidth: "80%", bg: "#EAE8E1", legend: "A clade is selected by clicking the node at its root." %}

2. Click the **rotate node** button {%- include 'btn.html', id: "btn-rotate" %} in the toolbar.

{% include 'figure.html', src: "images/node_rotated.png", alt: "Tree after rotating a single node", maxwidth: "80%", bg: "#EAE8E1", legend: "The root node is rotated without affecting the rest of the clade."   %}

3. Click the **rotate clade** button {%- include 'btn.html', id: "btn-rotate-all" %} in the toolbar.

{% include 'figure.html', src: "images/clade_rotated.png", alt: "Tree after rotating the entire clade", maxwidth: "80%", bg: "#EAE8E1", legend: "The entire clade is rotated reversing its order." %}

### Hiding Nodes and Subtrees

Hiding removes a tip or entire subtree from the display without deleting it from the underlying tree. The remaining tree reflows to fill the space.

1. Select a tip or internal node.

{% include 'figure.html', src: "images/tip_selected.png", alt: "Tip before hiding", maxwidth: "80%", bg: "#EAE8E1" %}

2. Click the **Hide** button {%- include 'btn.html', id: "btn-hide" %} in the toolbar.

{% include 'figure.html', src: "images/tip_hidden.png", alt: "Tip after hiding", maxwidth: "80%", bg: "#EAE8E1", legend: "The selected tip is now hidden." %}

3. Select a clade in the tree.

{% include 'figure.html', src: "images/clade_selected.png", alt: "Subtree selected", maxwidth: "80%", bg: "#EAE8E1" %}

4. Click the **Hide** button {%- include 'btn.html', id: "btn-hide" %} in the toolbar.

{% include 'figure.html', src: "images/clade_hidden.png", alt: "Subtree after hiding", maxwidth: "80%", bg: "#EAE8E1", legend: "The entire selected clade is hidden." %}

**Showing hidden nodes:** when any hidden nodes exist in the current view, the **Unhide** button {%- include 'btn.html', id: "btn-show" %} becomes active.

- **With a node selected** — click Unhide to restore the hidden descendants of that node.
- **With nothing selected** — click Unhide to restore all hidden nodes at once.

{% tip %}
To isolate a subset of tips: type a keyword into the filter box to select all matching tips, press **⌘⇧I** to invert the selection, then click Hide. Everything except your subset disappears. Click Unhide (with nothing selected) when done.
{% endtip %}

### Collapsing Clades

Collapsing replaces a subtree with a filled triangle shape. Unlike hiding, collapsed clades remain visible as a compact summary with a tip-count label.

1. Select an internal node.

2. Click the **Collapse** button {%- include 'btn.html', id: "btn-collapse-clade" %} in the toolbar.

The subtree becomes a filled triangle labelled with the clade name and enclosed tip count.

{% include 'figure.html', src: "images/clade_collapsed.png", alt: "Clade after collapsing", maxwidth: "80%", bg: "#EAE8E1", legend: "The selected clade is represented by a triangle shape." %}

The **Span** control in the **COLLAPSED CLADES** section of the control panel can adjust the vertical size of the triangle shapes. If set to the maximum then the triangles become the size of the number of tips that they contain and the individual labels will be shown if sufficiently zoomed in.

**Changing a triangle's colour:** with a triangle selected, use the colour picker and **Paint** button {%- include 'btn.html', id: "btn-apply-user-colour" %} in the toolbar to assign a custom fill colour. The eraser button {%- include 'btn.html', id: "btn-clear-user-colour" %} resets to the theme default.

{% include 'figure.html', src: "images/clade_collapsed_full.png", alt: "Collapsed clade fully expanded", maxwidth: "80%", bg: "#EAE8E1", legend: "The collapsed clade scaled to show all the tip labels. It has also been coloured using the <b>Paint</b> button." %}

To expand the clade: click the triangle to select it and click **Expand** {%- include 'btn.html', id: "btn-expand-clade" %}. Selecting a clade and then clicking **Expand** {%- include 'btn.html', id: "btn-expand-clade" %} will expand all collapsed subclades and with no selection, all collapse clades visible on the screen.

See the [**Collapsed Clades**](#collapsed-clades) section of the **Visual Options palette** for more controls of the collapsed clades.

{% tip %}
You can double click on a collapsed clade to drill-down into the clade and make its subtree visible. On using the back {% include 'btn.html', id: "btn-back", label: "Navigation" %} or home buttons {% include 'btn.html', id: "btn-home", label: "Navigation" %}, the clade will still be shown as collaped.
{% endtip %}


## Chapter 8: Decorating the Tree

{% note %}
*This chapter uses the EBOV example tree with the `ebov.csv` annotations imported (see [Chapter 3](#chapter-3-importing-annotations)).*
{% endnote %}

### Applying User Colours

The simplest way of adding colours to the tree is to select a node or tip and use the paint brush button.

1. Pick a colour using the colour swatch button {%- include 'btn.html', id: "btn-colour-trigger" %} in the toolbar. You can either select a new colour using the 'Custom colour...' control, or pick one from one of the pre-defined swatches.

{% include 'toolbar-colour-picker.html', legend: "The toolbar colour picker — choose a colour from the recent row or a palette." %}

2. Select one or more tips.
3. Click the **Paint** button {%- include 'btn.html', id: "btn-apply-user-colour" %}.

{% include 'figure.html', src: "images/tips_painted.png", alt: "Tips highlighted in orange", maxwidth: "80%", bg: "#EAE8E1", legend: "Tips selected and then painted orange using the <b>Paint</b> button." %}

To remove: click the **Clear** button {%- include 'btn.html', id: "btn-clear-user-colour" %}. With tips selected, clears only those tips; with nothing selected, clears all user colours in the current view.

When a tree is exported as a NEXUS file these colour annotions will be stored and then used when the tree is reloaded.

{% note %}
User colours are stored as a special annotation and are available in all *Colour by* dropdowns as 'user colour'. 
{% endnote %}

### Visual Options Control-panel

All visual controls live in the **Visual Options** control-panel on the left hand side. Open it with the control-panel button {%- include 'btn.html', id: "btn-palette" %} in the toolbar or press **Tab**. 
The control-panel can be closed again by clicking the close button {%- include 'btn.html', id: "btn-palette-close" %} or the toolbar button or by clicking on the tree. The control-panel can be fixed to stay open by clicking the pin button {%- include 'btn.html', id: "btn-palette-pin" %}. When pinned the pin button will be gold and the tree will scale horizontally to make space (unpinned, the control-panel will overlay the tree). 

{% include 'figure.html', src: "images/visual_options_panel.png", alt: "The visual options panel with all the sections closed.", maxwidth: "260px", bg: "#083642", legend: "The visual options panel with all the sections closed." %}

Controls are organised into collapsible sections. Click on a panel heading to open it and reveal its control. When another panel section is opened the currently open one will close. Use the pin button {%- include 'btn.html', id: "btn-palette-pin" %} to keep the panel section open.

### Tree Appearance

The **Tree** and **Branches** sections controls the basic visual look of the tree - the background colour and branch colour and width.

{% include 'palette-tree.html', legend: "Tree appearance controls." %}

| Control | Effect |
|---|---|
| Calibrate | Specify a date annoation that can be used to calibrate the timescale of the tree. If a date annoation exists when the tree is loaded it will be selected by default. This control will be hidden if there are no date annotations. |
| Background | The colour of the background canvas of the tree. |
| Root Len | This determines the length of the root branch 'stem' as a percentage of the whole tree from 0% (hidden) to 20% |

{% include 'palette-branches.html', legend: "Branch appearance controls." %}

| Control | Effect |
|---|---|
| Colour | The colour of the branches of the tree |
| Width | Branch line stroke thickness (0.5–8 px) |
| Elbow radius | How curvy the corners of the branches are |

### Tip Labels

These controls determine how the tip labels are presented. The tip labels will only be visible when the tree is sufficiently zoomed in that there is space for them (determined by the font size). 

{% include 'palette-tip-labels.html', legend: "Tip Labels section of the Visual Options palette." %}

| Control | Effect |
|---|---|
| Show | *Off* — hide all labels; *Names* — show tip name; or select an annotation key to display its values instead |
| Filter | Apply a saved named filter so only matching tips get labels (see [Chapter 9: Filtering](#chapter-9-filtering) for more information) |
| Layout | *Off* (labels are adjacent to each tip) or aligned options (*Aligned*, *Dashed*, *Dots*, *Solid*) — labels align with the rightmost tip with optional connector lines |
| Spacing | Gap between the tip marker and the label text (in pixels) |
| Size | Font size (1–48 pt) |
| Typeface | Font family for tip labels — *Theme* uses the typeface set in the Theme section; otherwise choose from Monospace, Sans-serif, Serif, or specific named fonts |
| Style | Font weight and style — *Theme* inherits from the Theme section; or choose *Regular*, *Bold*, *Italic*, or *Bold Italic* |
| Colour | The default label colour used if no user colour has been specified using the Paint option or if the `Colour by` option is being used but there is no annotation for that tip |
| Colour by | Use an annotation key for per-tip label colour. See the Colour by section, below. |
| Palette | A **Configure** buttoon appears when *Colour by* is active. This button will open a dialog box where a colour palette for this annoation can be selected. |

### Branch Labels

Branch labels display annotation values at the **midpoint of each branch** rather than at a node. This is particularly suited to branch-level annotations such as branch lengths when they should appear visually *on* the branch itself rather than at the node end. Unlike tip or node labels they are anchored to the branch midpoint and positioned above or below it.

{% include 'figure.html', src: "images/branch_labels.png", alt: "Branch labels showing branch lengths", maxwidth: "80%", bg: "#EAE8E1", legend: "Branch labels showing branch lengths above the branches they refer too." %}

{% include 'palette-branch-labels.html', legend: "Branch Labels section of the Visual Options palette." %}

| Control | Effect |
|---|---|
| Show | *Off* — hide all branch labels; or select an annotation key to display |
| Filter | Apply a saved named filter so only matching branches get labels |
| d.p. | Decimal places for numeric annotations — *Auto* picks a sensible precision |
| Position | *Above* or *Below* the branch midpoint |
| Spacing | Vertical gap between the branch line and the label text (in pixels) |
| Size | Font size (6–48 pt) |
| Typeface | Font family — *Theme* inherits from the Theme section |
| Style | Font weight and style — *Theme*, *Regular*, *Bold*, *Italic*, or *Bold Italic* |
| Colour | Default label text colour |
| Colour by | Use an annotation key for per-branch label colour |
| Palette | **Configure** button appears when *Colour by* is active |

{% note %}
Bootstrap support values are **branch annotations** (see [Appendix C](#appendix-c-bootstrap-values-branch-annotations-and-rerooting)): they describe the branch leading from a node toward its parent, not the node itself. Using Branch Labels to display them places the values visually on the branch they belong to.
{% endnote %}

### Node Labels

Annotation values are displayed as text labels at each internal node — most commonly used for bootstrap support values, posterior probabilities, clade names, or any node-level annotation. Unlike tip labels, node labels have no layout alignment option; they are always anchored to the node point.

{% include 'figure.html', src: "images/node_labels.png", alt: "Node labels showing posterior support values", maxwidth: "80%", bg: "#EAE8E1", legend: "Node labels showing posterior support values to the right of the nodes they refer too." %}

{% include 'palette-node-labels.html', legend: "Node Labels section of the Visual Options palette." %}

| Control | Effect |
|---|---|
| Show | *Off* — hide all node labels; or select an annotation key to display its values |
| Filter | Apply a saved named filter so only matching nodes get labels |
| d.p. | Decimal places for numeric annotations — *Auto* picks a sensible precision |
| Position | Where the label sits relative to the node point: *Right*, *Above left*, or *Below left* |
| Spacing | Horizontal gap between the node point and the label text (px) |
| Size | Font size (6–48 pt) |
| Typeface | Font family — *Theme* inherits from the Theme section |
| Style | Font weight and style — *Theme*, *Regular*, *Bold*, *Italic*, or *Bold Italic* |
| Colour | Default label text colour |
| Colour by | Use an annotation key for per-node label colour |
| Palette | **Configure** button appears when *Colour by* is active |

### Label Shapes

**Label shapes** are coloured shapes that are drawn to the left of each tip label text, providing additional ways of decorating tips with colours based on annotations. The shapes can be squares, circles or blocks - rectangles that fill the full height between tips to produce a continuous 'stripe'. Circles and squares are useful when the tip labels are not aligned, and blocks work best when the tips labels are aligned (whether visible or not).

{% include 'figure.html', src: "images/label_shapes_1.png", alt: "Label shapes", maxwidth: "80%", bg: "#EAE8E1", legend: "Two label shapes shown next to tips – circles coloured with a categorical annotation, squares with a continuous annotation." %}

{% include 'figure.html', src: "images/label_shapes_2.png", alt: "Label shapes", maxwidth: "80%", bg: "#EAE8E1", legend: "Aligned label shapes as blocks showing a continuous annotation next to tip labels." %}

Label shapes are controlled by the **LABEL SHAPES** control panel and this can be cascaded to add additional label shapes and more controls.

{% include 'palette-label-shapes.html', legend: "Label shape controls." %}

| Control | Effect |
|---|---|
| Shape | *Off* / *Square* / *Circle* / *Block* |
| Size | Shape height as % of row height |
| Pad left | Specifies the gap on the left side of the shape (in pixels) |
| Colour | Default fill colour |
| Colour by | Use an annotation key for shape colour |
| Shape 2 | Selecting a shape 2 will open up another label shape in a second column. If turned on then another option, Shape 3 will become available. |

Multiple independent shape slots (up to 10) can be added to show several annotation dimensions simultaneously.


### Tip Shapes

Tips shapes are filled circles drawn at the end of each tip branch. They can be sized and coloured in the control panel or a 'Colour by' annotation provided to control the colour. A background 'halo' effect can be specifed to outline all the tips shapes as a single layer. The tip shapes are always drawn even when the tree is fully zoomed out.

{% include 'palette-tip-shapes.html', legend: "Tip shapes controls." %}

| Control | Effect |
|---|---|
| Size | Tip circle radius (0 = hidden) |
| Filter | Apply a saved named filter so only matching tips get shapes |
| Colour | Stroke/fill colour |
| Colour by | Use an annotation key for tip colours |
| Palette | Colour scheme when *Colour by* is active (**Configure** opens annotation colour settings) |
| Halo | Halo ring radius (0 = hidden) |
| Halo col. | Halo fill colour |

Set **Colour by** to `country` to colour each tip by sampling country:

{% include 'figure.html', src: "images/tip_shapes.png", alt: "Tip Shapes set to Colour by country", maxwidth: "80%", bg: "#EAE8E1", legend: "EBOV tip shapes set with <b>Colour by</b> set to <code>country</code>." %}

### Node Shapes

Node shapes are similar to tip shapes but are drawn on the internal nodes of the tree. The same options control them.

{% include 'palette-node-shapes.html', legend: "Node shapes controls." %}

| Control | Effect |
|---|---|
| Size | Node circle radius (0 = hidden) |
| Filter | Apply a saved named filter so only matching nodes get shapes |
| Colour | Stroke/fill colour |
| Colour by | Use an annotation key for tip colours |
| Palette | Colour scheme when *Colour by* is active (**Configure** opens annotation colour settings) |
| Halo | Halo ring radius (0 = hidden) |
| Halo col. | Halo fill colour |

{% include 'figure.html', src: "images/node_shapes.png", alt: "Node Shapes set to Colour by posterior", maxwidth: "80%", bg: "#EAE8E1", legend: "EBOV node shapes set with <b>Colour by</b> set to <code>posterior</code>. The colour palette is Blue->Black->Red so nodes are coloured blue if < 0.5, red > 0.5 and black if close to 0.5." %}

{% tip %}
For continuous support values, a diverging palette such as *Blue-Black-Red* works well: red = high support, blue = low and black denotes intermediate support. **Configure** opens annotation colour settings dialog which allows the palette to be chosen and the range of the annotation. For a support value such as 'posterior' this should be set to [0, 1]. See [Colouring by Annotations](#colouring-by-annotations) for more information.
{% endtip %}

### Node Bars

*Available for trees with node-height HPD annotations — illustrated using `data/measles_genome_tree.nexus`.*

When a BEAST tree carries HPD height annotations (e.g. `height_95%_HPD`), the **Node Bars** section appears in the palette:

| Control | Effect |
|---|---|
| Show | Toggle bars on/off |
| Filter | Apply a saved named filter so bars draw only on matching nodes |
| Colour | Bar colour |
| Bar height | Vertical thickness of each bar (px) |
| Line | Show a line at the node *Mean*, *Median*, or neither |
| Range whiskers | Show or hide the outer extent whiskers |

> **Screenshot placeholder** — Measles genome tree (`data/measles_genome_tree.nexus`) with node bars showing 95% HPD height intervals.

### Clade Highlights

Clade highlights draw a translucent coloured shape behind a selected subtree — useful for drawing attention to named clades in publication figures or for annotating groups visually.

**Adding a highlight:**
1. Select any internal node (its entire descendant clade is highlighted).
2. Click the **Highlight** button {%- include 'btn.html', id: "btn-highlight-clade" %} in the toolbar.

A translucent shape appears behind all descendants of that node. Multiple independent highlights can be active simultaneously — each is stored separately and can have its own colour.

**Removing a highlight:** select the highlighted node again and click the Highlight button a second time to toggle it off.

**Highlight colour:** by default each highlight uses the *Colour by* mapping set in the Clade Highlights section of the palette. Set **Colour by** to *User colour* to use the toolbar colour picker, or to any annotation key to automatically colour each highlight by the value of that annotation at the clade root.

In the **Clade Highlights** section of the palette:

| Control | Effect |
|---|---|
| **Colour by** | *User colour* (toolbar swatch) or any annotation key |
| **Palette** | Colour scheme when *Colour by* is an annotation key |
| **Left edge** | *Rectangle* — straight vertical left edge at the clade-root node; *Outline subtree* — the shape hugs the left profile of every branch in the clade |
| **Right edge** | *At tip* — ends just past the clade's rightmost tip circle; *At label left* — aligns with the global label column; *At label right* — extends to the right canvas edge; *Outline tips* — the right edge steps individually around each tip, creating a staircase silhouette |
| **Padding** | Gap between the clade extent and the highlight border (px) |
| **Corners** | Corner-rounding radius (px) |
| **Opacity** | Translucency of the fill (0 = transparent, 1 = solid) |
| **Stroke** | Opacity of the border line |
| **Width** | Border line thickness (px) |

{% tip %}
The *Outline subtree* left edge combined with *Outline tips* right edge creates a tight polygon that traces the exact profile of the clade — useful for complex, non-rectangular subtrees. Collapsed clades inside the highlight are treated correctly: the shape extends to the full tip of the triangle.
{% endtip %}

### Colouring by Annotations

Many sections of the Visual Options palette — **Tip Labels**, **Label Shapes**, **Tip Shapes**, **Node Shapes**, **Node Labels**, **Clade Highlights**, and **Legends** — share a common **Colour by** control. This dropdown lets you drive the colour of that element from any loaded annotation key rather than a single fixed colour.

| Control | Effect |
|---|---|
| **Colour by** | *Off* — use the fixed colour set in that section; or select any annotation key to colour each element by the value of that key |
| **Configure** (or **Palette**) | Opens the annotation colour settings for the selected key (see below) |

When **Colour by** is set to an annotation key, a **Configure** button appears in that section. Click it to open the colour settings for that key:

- **Palette** — choose a categorical swatch set (for string/boolean fields) or a continuous gradient (for numeric fields). Palettes are shared across all sections that colour by the same key.
- **Scale mode** (numeric annotations only) — controls how the numeric range maps onto the gradient:

| Scale mode | Description |
|---|---|
| **Auto** | Min and max of the data determine the scale endpoints |
| **Symmetric ±0** | Scale is centred on zero; min and max are set to ±*max(|value|)* |
| **From zero** | Scale runs from 0 to the maximum value |
| **0 → 1** | Values are assumed to already lie in the 0–1 range |

#### Managing Palettes

Click **Manage Palettes** {%- include 'btn.html', id: "btn-manage-palettes" %} in the toolbar (also accessible from the annotation colour settings dialog) to open the Palette Manager.

{% include 'dialog-palette-manager.html', tab: "categorical", maxwidth: "860px" %}

The manager has two tabs:

- **Categorical** — edit discrete swatch sets: add, remove, or reorder individual colour swatches, duplicate an existing palette as a starting point
- **Continuous** — edit gradient palettes either as colour stops or an HSB sweep, with full stop editing and duplication

Built-in palettes are read-only. User palettes are editable, persisted immediately to local storage, and available at once in all *Colour by* controls and legends.

### Legends

Legends provide a colour key for any annotation used to colour tips, nodes, or labels. PearTree supports up to four independent legend strips simultaneously, all docked to the right side of the canvas.

In the **Legend** section of the palette:

1. Set **Annotation** to an annotation key (e.g. `country`).
2. Adjust **Height %**, **Colour**, and **Font size** as desired.

For categorical annotations a swatch-and-label key is drawn. For continuous numeric annotations a colour ramp with min/max labels is shown.

{% include 'figure.html', src: "images/fig13.png", alt: "EBOV tree with country legend", maxwidth: "440px", legend: "EBOV tree with `country` legend docked to the right." %}

**Legend 2–4:** additional legends can be configured below Legend 1. Set each legend's **Position** to *Right* (shown in the same panel as Legend 1) or *Below* (stacked vertically).

Use **Height %** to control what fraction of the panel height each legend occupies.

{% tip %}
Use Legend 1 for a categorical annotation (e.g. country) and Legend 2 with **Position: Below** for a continuous annotation (e.g. posterior support) to display both keys simultaneously in a single neatly stacked column.
{% endtip %}

### Themes

The **Theme** section at the top of the palette provides pre-built visual presets.

{% include 'figure.html', src: "images/fig16.png", alt: "Theme section with MCM theme applied", maxwidth: "280px", legend: "The Theme section with the *MCM* theme applied." %}

| Control | Effect |
|---|---|
| Theme selector | Switch to a built-in or user-saved theme |
| **Store** | Save the current settings as a named personal theme |
| **Default** | Make this theme the starting point for new windows |
| **Remove** | Delete a user-saved theme |

Changing any individual setting switches the selector to *Custom*. Click **Reset to defaults** at the bottom of the palette to revert to the Artic theme.

## Chapter 9: Filtering

### Quick Filter

The filter controls in the toolbar instantly select visible tips using ad-hoc or saved rules.

The ad-hoc filter has four parts:

- **Search field button** — choose which field to query (*Name* or an annotation key)
- **Operator button** — choose the match rule (*contains*, *starts with*, numeric comparisons, date comparisons, regex, etc.)
- **Input box** — type the value/pattern
- **+ button** — save the current ad-hoc query as a named filter


For example, choose *Name contains* and type `SLE` to select all Sierra Leone EBOV tips:

{% include 'filter-box.html', contents: "SLE" -%}<br />
<br />

Press **Escape** or clear the box to remove the filter (the tip selection remains).

### Named Filters and the Filter Manager

Click the funnel button {%- include 'btn.html', id: "btn-named-filter" %} beside the filter box to apply a saved named filter. Named filters can be combined with the ad-hoc filter: a tip must pass both to remain selected.

Use **Manage Filters** {%- include 'btn.html', id: "btn-manage-filters" %} to open the Filter Manager dialog. There you can:

- Create filters with nested **AND/OR** groups
- Add conditions for string, numeric, categorical, and date fields
- Edit or delete existing filters
- Import/export filter sets as JSON

{% include 'dialog-filter-manager.html', maxwidth: "820px" %}

Saved filters are available throughout the Visual Options palette in **Filter** dropdowns for tip labels, branch labels, node labels, tip shapes, node shapes, and node bars. Each feature's filter is applied only when that feature is enabled.


## Chapter 10: The Time Axis

The axis adds a scale bar along the bottom of the canvas. Load the EBOV example tree to follow along — it carries a `date` annotation on each tip.

In the **Axis** section of the palette, set **Show** to one of four modes:

| Mode | Axis type |
|---|---|
| **Off** | No axis |
| **Forward** | Divergence from root (0 at root, increases toward tips) |
| **Reverse** | Distance from the most-divergent tip toward the root |
| **Time** | Calendar-date axis (requires a date calibration — see below) |

### Divergence Axes

Select **Forward** or **Reverse** to draw a plain numeric scale immediately — no calibration needed. Use these when branch lengths represent substitutions-per-site or similar units.

### Time-Calibrated Axis

#### Step 1 — Calibrate

In the **Tree** section of the palette (above the Axis section), a **Calibrate** dropdown appears when the loaded tree has at least one annotation that PearTree recognises as a date type. Select that annotation key (e.g. `date` or `collection_date`).

Once selected, a **Format** row appears:

| Format code | Example output |
|---|---|
| `yyyy-MM-dd` | `2014-09-12` |
| `yyyy-MMM-dd` | `2014-Sep-12` |
| `dd MMM yyyy` | `12 Sep 2014` |
| `dd MMMM yyyy` | `12 September 2014` |
| `MMM dd, yyyy` | `Sep 12, 2014` |
| `MMMM dd, yyyy` | `September 12, 2014` |

#### Step 2 — Set the axis to Time

In **Axis → Show**, select `Time`. The axis now displays calendar dates derived from the calibration.

#### Step 3 — Configure tick intervals

| Control | Options | Notes |
|---|---|---|
| **Major ticks** | Auto / Decades / Years / Quarters / Months / Weeks / Days | *Auto* gives ~5–8 ticks across the current view |
| **Minor ticks** | Off / (finer intervals) | Off by default |
| **Major labels** | Partial / Full / Component / Off | See below |
| **Minor labels** | Off / Component / Partial / Full | Off by default |

#### Label modes

| Mode | Year tick | Month tick | Day tick |
|---|---|---|---|
| **Partial** | `2014` | `2014-09` | `2014-09-12` |
| **Full** | (full chosen format) | (full chosen format) | (full chosen format) |
| **Component** | `2014` | `Sep` | `12` |
| **Off** | — | — | — |

For Weeks ticks: *Component* shows `W01`–`W53`; *Full* and *Partial* both show `2014-W37`.

{% include 'figure.html', src: "images/fig15.png", alt: "EBOV tree with time axis", maxwidth: "280px", legend: "EBOV tree with time axis. Major ticks = Years, labels = Partial." %}


## Chapter 11: Rooting

Rerooting is available for trees that are not explicitly rooted (e.g. raw IQ-TREE or RAxML output). For explicitly-rooted trees such as BEAST timed trees, rerooting is disabled.

*Use `data/varv_rooted.nwk` or `data/large_tree.tree` for the examples in this chapter.*

### Midpoint Root (⌘M)

Press **⌘M** or click the **Midpoint Root** button {%- include 'btn.html', id: "btn-midpoint-root" %} in the toolbar. The tree is rooted at the midpoint of the longest tip-to-tip path — a common exploratory starting point when no outgroup is available.

> **Screenshot placeholder** — `data/large_tree.tree` before and after midpoint rerooting, with root repositioned.

### Rerooting at a Selected Node

1. Select one or more tips (their MRCA defines the branch to root on).
2. Click the **Reroot** button {%- include 'btn.html', id: "btn-reroot" %} in the toolbar.

The root is placed at the midpoint of the branch above the MRCA node.

### Rerooting at an Exact Branch Position

1. Press **⌘B** to enter **Branches** mode.
2. Click exactly where you want the new root along any branch.
3. Click **Reroot** {%- include 'btn.html', id: "btn-reroot" %}.

> **Screenshot placeholder** — Branch position marker on `data/varv_rooted.nwk`, and the resulting tree after rerooting.

### Temporal Root

If your tree has tip dates, PearTree can find the root position that best linearises the root-to-tip regression (least-squares RTT regression).

Click **Temporal Root** {%- include 'btn-group.html', ids: "btn-temporal-root btn-temporal-root-global", label: "Temporal root" -%} in the toolbar. Two modes are available (**⌘⇧R** = Local, **⌘R** = Global):

| Mode | Description |
|---|---|
| **Local** (default) | Optimises root position only along the current root branch |
| **Global** | Searches every branch for the best regression fit |

{% tip %}
Use **Global** temporal root on a fresh unrooted tree to find the best root de novo. Use **Local** to fine-tune the position on a branch you have already identified as correct.
{% endtip %}

> **Screenshot placeholder** — RTT plot for `data/ebov.tree` before and after temporal rooting, showing improvement in the linear relationship.

### Bootstrap Values and Rerooting

When you reroot a tree, bootstrap support values (and other branch annotations) are correctly relocated to follow their branches. See [Appendix C](#appendix-c-bootstrap-values-branch-annotations-and-rerooting) for a full explanation of how this works.


## Chapter 12: The Root-to-Tip Panel

The Root-to-Tip (RTT) panel plots each tip's root-to-tip divergence against a tip-date annotation, with a linear regression overlay. It is the standard visual tool for assessing clock-like signal in a timed phylogeny and identifying outlier sequences.

*Load `data/ebov.tree` and import `data/ebov.csv` to follow along.*

Click the **RTT** button {%- include 'btn.html', id: "btn-rtt" %} in the toolbar to open the panel.

> **Screenshot placeholder** — EBOV RTT panel showing a strong linear clock signal. Points are colour-coded by country.

### Panel Layout Modes

| Mode | Description |
|---|---|
| **Floating** | Panel overlays the right side of the canvas; close with × |
| **Fixed** | Panel is pinned open alongside the canvas at a configurable width; drag the resize handle to adjust |

Click the pin button in the panel header to toggle. In fixed mode the canvas and RTT panel share the full window width.

### Heterochronous Mode (scatter plot)

When tips carry sampling dates, the RTT panel shows a scatter plot:

- Each point is a visible tip; x = sampling date, y = root-to-tip divergence.
- The **regression line** shows the best-fit linear relationship.
- The **slope** (substitution rate) and **R²** (and additional statistics) are displayed in a moveable stats box in the plot corner.
- **Outliers** — tips that fall far from the regression line — may indicate sequencing errors, mislabelled dates, or recombination.

#### Residual band

Enable the **Band** control in the RTT section of the palette to overlay a shaded band around the regression line:

| Mode | Description |
|---|---|
| **±2σ residual** | Shaded band spanning ±2 standard deviations of the residuals — shows how spread the data is around the line |
| **95% CI** | 95% confidence interval for the mean — a much narrower band showing uncertainty in the regression line position itself |

The band colour, border style, and fill opacity are all independently configurable in the palette.

#### Drag-select

Click and drag on the plot to select all tips within the drawn rectangle. **Alt/Option-drag** draws a parallelogram aligned with the regression slope, making it easy to select tips at a particular residual range.

### Homochronous Mode (divergence histogram)

When tips have **no sampling dates** (a homochronous dataset), the RTT panel automatically switches to a divergence histogram.

> **Screenshot placeholder** — RTT histogram for a homochronous tree: bars show the distribution of tip root-to-tip divergences, individual tip dots are shown as a jitter strip above the bars.

- The x-axis is root-to-tip divergence; the y-axis is count.
- Each bar spans an equal-width divergence interval; the bar height is the number of tips in that bin.
- **Individual tip points** are drawn as a jitter strip in the headroom above the histogram bars. Each point represents one tip, positioned at its exact divergence value on the x-axis, with a small vertical jitter for readability.
- **Hovering or clicking** a tip point in the strip highlights the corresponding tip in the tree — the same selection and hover linkage as in the scatter plot.
- **Drag-select** a region in the strip to select all those tips in the tree.

#### Mean line and band

The same **Regression line** and **Band** controls in the palette apply to the histogram view:

- The **regression line** style settings draw a **vertical mean line** at the mean divergence.
- The **Band** control draws a vertical shaded rectangle:
  - **±2σ residual** — centred on the mean, spanning ±2 standard deviations of all divergence values.
  - **95% CI** — the 95% confidence interval for the mean divergence (much narrower than ±2σ).

### Interacting with the Plot

- **Click a point** — selects the corresponding tip in the tree and highlights its row in the data table.
- **Select a tip in the tree** — its point is highlighted in the RTT plot.
- **⌘-click** — add to or remove from the current selection.

### RTT Visual Options

In the **RTT** section of the Visual Options palette:

| Control | Effect |
|---|---|
| X-axis origin | *Data range* (axis starts at the earliest tip) or *Root age* (axis starts at the root age) |
| Aspect ratio | Fixed aspect ratio for the plot area, or *fit panel* to fill the available space |
| Grid lines | Show horizontal, vertical, both, or no grid lines |
| **Reg. line** | Style: *Solid*, *Big dash*, *Dash*, or *Dots* |
| **Reg. colour** | Regression / mean line colour |
| **Reg. width** | Regression / mean line thickness (px) |
| **Band** | *Off* / *±2σ residual* / *95% CI* — applies to both scatter and histogram modes |
| Band style | Border style: *Solid*, *Big dash*, *Dash*, or *Dots* |
| Band colour | Border line colour |
| Band width | Border line thickness (px) |
| Band fill | Fill colour |
| Band fill opacity | Fill translucency (0 = invisible, 1 = solid) |
| Box bg / text | Statistics box background and text colours |
| Axis colour | Plot axis, tick, and label colour |
| Axis font | Tick-label font size |
| Axis line | Axis stroke thickness |
| Typeface / Style | Font family and style for axis labels |
| Format | Date format for time-calibrated x-axis |
| Major / minor ticks | Interval and label configuration (same options as the main time axis; shown only in heterochronous mode) |

{% tip %}
Select outlier tips in the RTT scatter plot (click their points or drag-select a region), then click **Hide** in the main toolbar to remove them from the tree. This is the fastest way to clean a dataset for clock analysis.
{% endtip %}


## Chapter 13: The Data Table Panel

The Data Table panel lists all visible tips in tree order, with one column per annotation. Open it with the **Data Table** button {%- include 'btn.html', id: "btn-data-table" %} in the toolbar.

> **Screenshot placeholder** — Data Table panel pinned alongside the EBOV tree, showing tip names and imported annotation columns.

### Panel Layout Modes

Like the RTT panel, the Data Table can be floating or pinned fixed. Click the pin button in the panel header to toggle. Drag the resize handle (the border between tree and table) to adjust the width.

### Synchronisation with the Canvas

The Data Table is fully synchronised with the tree in both directions:

- Selecting a tip or node in the tree highlights the corresponding row(s).
- Clicking any row selects that tip in the tree and scrolls the canvas to its position.
- Collapsing, hiding, or filtering tree nodes updates the table instantly.

### Collapsed Clades in the Table

Collapsed clades appear as either one row per enclosed tip or a single placeholder row, allowing you to browse and select tips within a collapsed clade without expanding it.

### Restricting Columns

By default all annotation columns are shown. Rename keys in the Annotation Curator for cleaner column headers. When using the [embed API](embedded-api.md), pass `dataTableColumns` to show only specific columns in a fixed order.

{% tip %}
The Data Table is the fastest way to find a specific tip by name in a large tree. Open the panel, scan the sorted list or use your browser's in-page find (Ctrl/Cmd+F), click the row — the canvas scrolls and selects the tip automatically.
{% endtip %}


## Chapter 14: Exporting

### Exporting the Tree File

Click the **export tree** button {%- include 'btn.html', id: "btn-export-tree" %} (or press **⌘S**) to save the tree.

{% include 'dialog-export-tree.html', maxwidth: "420px" %}

{% include 'figure.html', src: "images/fig17.png", alt: "Export Tree dialog", maxwidth: "360px", legend: "Export Tree dialog." %}

| Option | Values | Notes |
|---|---|---|
| **Format** | NEXUS / Newick | NEXUS supports annotations and embedded settings; Newick is the most portable format |
| **Scope** | Entire tree / Current subtree view | Exports only the nodes currently on screen when *Current subtree view* is chosen |
| **Annotations** | Checkboxes per annotation key | Deselect any keys you do not want to include |
| **Embed settings** | Checkbox (NEXUS only) | Writes all current visual settings into the file |

{% tip %}
Always tick **Embed settings** when exporting NEXUS files for sharing or archival. The recipient's PearTree will automatically restore the full appearance — colours, legends, axis, theme — when they open the file.
{% endtip %}

### Exporting a Graphic

Click the **export graphic** button {%- include 'btn.html', id: "btn-export-graphic" %} (or press **⌘⇧E**) to download an image.

{% include 'dialog-export-graphic.html', maxwidth: "400px" %}

{% include 'figure.html', src: "images/fig18.png", alt: "Export Graphic dialog", maxwidth: "360px", legend: "Export Graphic dialog." %}

| Option | Values | Notes |
|---|---|---|
| **Format** | SVG / PNG | SVG is vector and infinitely scalable; PNG is raster at 2× screen resolution |
| **View** | Current view / Full tree | *Full tree* exports the complete vertical extent of the tree, not just the visible viewport |
| **Transparent background** | Checkbox | Omits the background fill (useful for compositing over a coloured page) |

SVG exports include branches, labels, shapes, legend strips, and the axis as true vector elements — ideal for publication figures.


## Chapter 15: Settings and Persistence

### Automatic Saving

PearTree automatically saves all visual settings to browser **localStorage** (web app) or a local settings file (desktop app). Settings are restored on the next visit or launch, including theme, palette values, colour-by choices, legend and axis configuration, and branch order.

### Resetting to Defaults

Click **Reset to defaults** at the bottom of the Visual Options palette to restore the Artic theme and all factory default values.

### Embedding Settings in a NEXUS File

Export a NEXUS file with **Embed settings** ticked (see [Chapter 14](#chapter-14-exporting)) to bundle all current visual settings with the tree data. Opening that file in PearTree on any machine restores the full appearance, making this the recommended way to share a tree with its visual configuration.

### Opening a File from the Command Line (Desktop App)

On macOS you can open a tree file directly in PearTree from Terminal:

```bash
open -a PearTree /path/to/my.nwk
```

If PearTree is already running, the file opens in a new window. On Windows, drag the file onto the PearTree icon in the taskbar, or use **Open With** from the Explorer context menu.


## Appendix A: Keyboard Shortcuts

> On Windows and Linux replace **⌘** with **Ctrl**.

| Shortcut | Action |
|---|---|
| **⌘O** | Open system file picker (desktop) or Open Tree dialog (web) |
| **⌘⇧O** | Open Tree dialog |
| **⌘⇧A** | Import annotations |
| **⌘S** | Export tree |
| **⌘⇧E** | Export graphic |
| **Tab** | Toggle Visual Options palette |
| **⌘=** / **⌘+** | Zoom in |
| **⌘−** | Zoom out |
| **⌘0** | Fit all |
| **⌘⇧0** | Fit labels |
| **⌘A** | Select all visible tips |
| **⌘⇧I** | Invert selection |
| **⌘B** | Toggle Nodes / Branches mode |
| **⌘D** | Order: larger clades toward bottom |
| **⌘U** | Order: larger clades toward top |
| **⌘M** | Midpoint root |
| **⌘R** | Global temporal root |
| **⌘⇧R** | Local temporal root (optimise on current root branch) |
| **⌘I** | Node info |
| **⌘[** | Navigate back |
| **⌘]** | Navigate forward |
| **⌘\\** | Home (return to full tree view) |
| **⌘⇧,** | Climb up one level |
| **⌘⇧.** | Drill down into selected subtree |
| **⌘↑ / ⌘↓** | Scroll one page up / down |
| **⌘⇧↑ / ⌘⇧↓** | Jump to top / bottom of tree |
| **~** (hold) | Activate hyperbolic lens at cursor |
| **⌘⇧=** | Expand lens flat zone |
| **⌘⇧−** | Contract lens flat zone |
| **Escape** | Dismiss lens / close dialog / clear selection |


## Appendix B: Visual Options Reference

### Theme

| Control | Effect |
|---|---|
| Theme selector | Choose a built-in or personal preset |
| **Store** | Save the current settings as a named theme |
| **Default** | Set selected theme as the default for new windows |
| **Remove** | Delete a user-saved theme |

{% include 'figure.html', src: "images/controls_themes.png", alt: "Themes controls", maxwidth: "250px" %}

### Palette Manager

| Control | Effect |
|---|---|
| Categorical tab | Edit discrete swatch palettes (add/remove/reorder colours) |
| Continuous tab | Edit sequential gradients (colour stops or HSB sweep) |
| Duplicate | Clone an existing palette as a starting point |
| Delete | Remove a user palette |

### Filters

| Control | Effect |
|---|---|
| Search field | Choose Name or an annotation key to query |
| Match operator | String/numeric/date/regex matching mode |
| Value box | Query value or pattern |
| + | Save current query as a named filter |
| Named filter selector | Apply a saved filter in the toolbar |
| Manage Filters | Open filter editor with nested AND/OR conditions and import/export |

### Tree

| Control | Effect |
|---|---|
| Calibrate | Annotation key holding tip dates for time axis calibration |
| Format | Display format for calibrated axis labels |
| Background | Canvas background colour |
| Branches | Branch line colour |
| Branch width | Stroke thickness (0.5–8 px) |
| Typeface | Font family for all labels |
| Typeface style | Regular / Bold / Italic / Bold Italic |
| Neg. branches | *Draw* (as-is) or *Clamp to zero* |
| Elbow radius | Branch corner rounding (px) |
| Root stub | Length of the root stem line (px) |
| Root stem % | Root stem as % of total tree age (0–20) |
| Padding | Canvas margins: top, bottom, left, right (px) |

{% include 'figure.html', src: "images/controls_tree.png", alt: "Tree appearance controls", maxwidth: "250px" %}

### Tip Labels

| Control | Effect |
|---|---|
| Show | *Off* / *Names* / annotation key |
| Filter | Apply a saved named filter so only matching tips get labels |
| Layout | *Normal* / *Aligned* / *Dashed* / *Dots* / *Solid* |
| Size | Font size (1–20 pt) |
| Colour | Default label colour |
| Colour by | Annotation key for per-tip label colour |
| Palette | Colour scheme (**Configure** opens annotation colour settings) |
| Spacing | Gap after tip marker (px) |
| Selected style | *Normal* / *Bold* / *Italic* / *Bold Italic* for selected tips |

{% include 'figure.html', src: "images/controls_tip_labels.png", alt: "Tip labels controls", maxwidth: "250px" %}

### Label Shapes

| Control | Effect |
|---|---|
| Shape | *Off* / *Square* / *Circle* / *Block* |
| Size | % of row height |
| Colour | Default fill |
| Colour by | Annotation key |
| Margin left/right | Gap on each side (px) |
| Spacing | Gap between multiple shape slots (px) |

### Tip Shapes

| Control | Effect |
|---|---|
| Size | Radius (0 = hidden) |
| Filter | Apply a saved named filter so only matching tips get shapes |
| Colour | Stroke/fill colour |
| Background | Halo fill colour |
| Halo | Halo ring radius |
| Colour by | Annotation key |
| Palette | Colour scheme (**Configure** opens annotation colour settings) |

{% include 'figure.html', src: "images/controls_tip_shapes.png", alt: "Tip shapes controls", maxwidth: "250px" %}

### Node Shapes

| Control | Effect |
|---|---|
| Size | Radius (0 = hidden) |
| Colour | Default shape colour |
| Background | Halo fill |
| Filter | Apply a saved named filter so only matching nodes get shapes |
| Colour by | Annotation key |
| Palette | Colour scheme (**Configure** opens annotation colour settings) |

{% include 'figure.html', src: "images/controls_node_shapes.png", alt: "Node shapes controls", maxwidth: "250px" %}

### Node Labels

| Control | Effect |
|---|---|
| Annotation | Key to display as text on internal nodes |
| Filter | Apply a saved named filter so only matching nodes get labels |
| Position | *Right* / *Above left* / *Below left* |
| Font size | Text size (pt) |
| Colour | Text colour |
| Spacing | Gap between node and label (px) |

### Node Bars *(BEAST trees only)*

| Control | Effect |
|---|---|
| Show | On / Off |
| Filter | Apply a saved named filter so bars draw only on matching nodes |
| Colour | Bar colour |
| Bar height | Vertical thickness (px) |
| Line | *Mean* / *Median* / *Off* |
| Range whiskers | Show outer extent whiskers |

### Collapsed Clades

| Control | Effect |
|---|---|
| Fill opacity | 0 (transparent) – 1 (solid) |
| Height (rows) | Triangle base height in tip-row units |

### Clade Highlights

| Control | Effect |
|---|---|
| Colour by | *User colour* or any annotation key |
| Palette | Colour scheme when *Colour by* is an annotation |
| Scale | How the numeric colour scale range is mapped (auto / symmetric ±0 / from zero / 0→1) |
| Left edge | *Rectangle* — straight left edge at clade root; *Outline subtree* — hugs the branch profile |
| Right edge | *At tip* / *At label left* / *At label right* / *Outline tips* (staircase per tip) |
| Padding | Gap between clade extent and border (px) |
| Corners | Corner-rounding radius (px) |
| Opacity | Fill translucency |
| Stroke | Border opacity |
| Width | Border line thickness (px) |

### Legend

| Control | Effect |
|---|---|
| Annotation | Annotation key to show as a colour key |
| Colour | Legend text and label colour |
| Font size | Legend font size (pt) |
| Height % | Fraction of canvas height this legend occupies |

{% include 'figure.html', src: "images/controls_legend.png", alt: "Legend controls", maxwidth: "250px" %}

### Axis

| Control | Effect |
|---|---|
| Show | *Off* / *Forward* / *Reverse* / *Time* |
| Colour | Axis line and label colour |
| Font size | Tick-label font size |
| Line width | Axis stroke thickness |
| Major ticks | Auto / Decades / Years / Quarters / Months / Weeks / Days |
| Minor ticks | Off / (finer intervals) |
| Major labels | *Partial* / *Full* / *Component* / *Off* |
| Minor labels | *Off* / *Component* / *Partial* / *Full* |

{% include 'figure.html', src: "images/controls_axis.png", alt: "Axis controls", maxwidth: "250px" %}

### RTT

| Control | Effect |
|---|---|
| X-axis origin | *Data range* or *Root age* |
| Aspect ratio | Fixed ratio or *fit panel* |
| Grid lines | *Both* / *Horizontal* / *Vertical* / *Off* |
| Reg. line | Regression / mean-line style: *Solid* / *Big dash* / *Dash* / *Dots* |
| Reg. colour | Regression / mean line colour |
| Reg. width | Line thickness (px) |
| Band | *Off* / *±2σ residual* / *95% CI* — shown in both scatter and histogram modes |
| Band style | Border style of band lines |
| Band colour | Band border colour |
| Band width | Band border thickness (px) |
| Band fill | Band fill colour |
| Band fill opacity | Band fill translucency |
| Box bg / text | Stats box background and text colours |
| Box font | Stats box font size |
| Axis colour | Axis line and label colour |
| Axis font | Tick-label font size |
| Axis line | Axis stroke thickness |
| Typeface / Style | Font family and style for axis labels |
| Format | Date format (heterochronous mode only) |
| Major / minor ticks | Tick intervals (heterochronous mode only) |
| Major / minor labels | Label format (heterochronous mode only) |


## Appendix C: Bootstrap Values, Branch Annotations, and Rerooting

### Node Annotations vs. Branch Annotations

Every internal node can carry two conceptually distinct kinds of data:

- **Node annotations** — properties of the *node itself* (e.g. Bayesian posterior probability, inferred node height in time). These belong to the node regardless of where the root sits.
- **Branch annotations** — properties of the *branch leading from the node to its parent* (e.g. bootstrap support). These belong to the branch, not the node, and must travel with it when the tree is rerooted.

### Bootstrap Values in Tree Files

Bootstrap support values are conventionally written as internal node labels in Newick format:

```
((A:0.1,B:0.1)95:0.01,(C:0.1,(D:0.1,E:0.1)72:0.2)80:0.3);
```

Here `95`, `72`, and `80` are bootstrap values. They are stored *at* the node in the file format, but they describe the *branch leading from that node to its parent*. PearTree automatically marks these well-known keys as branch annotations: `bootstrap`, `support`, `label`, `posterior`, `posterior_probability`, `prob`, `probability`.

For non-standard key names (e.g. `UFBoot` from IQ-TREE), open the **Annotation Curator** and tick **Branch annotation** manually.

### How Rerooting Moves Branch Annotations

When you reroot on a new branch, PearTree updates all branch annotation values along the path between old and new root:

- Each node on the path *receives* the value that was on the branch above it (toward the old root), because after rerooting that is the branch entering that node from its new parent.
- The node adjacent to the old root, whose branch is split to create the two new root branches, loses its value — there is no meaningful bootstrap for a newly created root edge.
- All nodes *not* on the path are unaffected.

Multiple sequential reroots are handled correctly. BEAST trees carry posterior as a **node** annotation (not a branch annotation), and rerooting is disabled for them in any case.


## Appendix D: URL Parameters and Sharing

When using the PearTree web application, you can construct a URL that pre-loads a tree and applies settings automatically.

### Basic Tree Link

```
https://peartree.live/?treeUrl=https://example.com/my.tree
```

The remote server must send `Access-Control-Allow-Origin: *`. GitHub raw file URLs work without any configuration:

```
https://peartree.live/?treeUrl=https://raw.githubusercontent.com/artic-network/peartree/main/data/ebov.tree
```

Anyone who follows the link sees the tree immediately — no download or upload required.

### Available Parameters

| Parameter | Description |
|---|---|
| `treeUrl` | URL of a remote Newick or NEXUS file to load on startup |
| `tree` | URL-encoded inline Newick or NEXUS string |
| `filename` | Filename hint for format detection (e.g. `my.nwk`) |

Settings embedded in a NEXUS file opened via `treeUrl` are applied automatically. A single URL can therefore deliver both the tree data and its complete visual configuration to any recipient with no setup required.
