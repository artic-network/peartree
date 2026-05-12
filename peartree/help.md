# PearTree Help

PearTree is a phylogenetic tree viewer that runs entirely in the browser. No data is ever uploaded to any server — all processing is local.

---

## Interface Overview

The interface has four main areas:

- **Toolbar** — buttons for files, navigation, zoom, branch ordering, selection, rerooting, hiding, and panels
- **Visual Options palette** — pop-out panel on the left with all display controls (toggle with **Tab** or the sliders button)
- **Canvas** — the tree drawing, which fills the remaining space
- **Status bar** — live readout of values under the mouse cursor

---

## Opening a Tree File

Click <i class="bi bi-folder2-open"></i> or press **⌘⇧O** to open the *Open Tree File* dialog. Three tabs are available:

| Tab | Description |
|---|---|
| **File** | Drag-and-drop a file onto the drop zone, or click *Choose File* to browse |
| **URL** | Enter a direct URL to a NEXUS or Newick file and click *Load from URL* |
| **Example** | Load the built-in Ebola virus (EBOV) example tree |

Supported formats: **NEXUS** (`.nex`, `.nexus`, `.tre`, `.tree`, `.treefile`) and **Newick** (`.nwk`, `.newick`).

---

## Toolbar Buttons

### File

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-folder2-open"></i> | ⌘⇧O | Open the *Open Tree File* dialog (File / URL / Example tabs) |
| <i class="bi bi-table"></i> | ⌘⇧A | Import an annotation CSV/TSV file (enabled once a tree is loaded) |
| <i class="bi bi-tags"></i> | — | Open the Annotation Curator (enabled once a tree is loaded) |
| <i class="bi bi-file-earmark-arrow-down"></i> | ⌘E | Export the tree as NEXUS or Newick (enabled once a tree is loaded) |
| <i class="bi bi-image"></i> | ⌘⇧E | Download a graphic (SVG or PNG) of the tree (enabled once a tree is loaded) |

### Navigation

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-chevron-left"></i> back | ⌘[ | Navigate back to the parent subtree view |
| <i class="bi bi-chevron-right"></i> forward | ⌘] | Restore the next subtree view in the history |
| <i class="bi bi-box-arrow-left"></i> climb | ⌘⇧, | Step up one level from the current subtree |
| <i class="bi bi-box-arrow-in-right"></i> drill | ⌘⇧. | Zoom into the subtree rooted at the selected node |
| <i class="bi bi-house"></i> home | ⌘\ | Return to the full-tree root view |

### Zoom & Fit

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-zoom-in"></i> | ⌘= | Zoom in vertically (1.5× step) |
| <i class="bi bi-zoom-out"></i> | ⌘− | Zoom out vertically (1.5× step) |
| <i class="bi bi-arrows-fullscreen"></i> | ⌘0 | Fit the entire tree to the window |
| <i class="bi bi-type"></i> | ⌘⇧0 | Zoom so that tip labels no longer overlap |

### Branch Order

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-sort-up"></i> ascending | ⌘U | Order branches so larger clades are toward the top |
| <i class="bi bi-sort-up" style="display:inline-block;transform:scaleY(-1)"></i> descending | ⌘D | Order branches so larger clades are toward the bottom |

### Rotate

| Button | Description |
|---|---|
| <i class="bi bi-repeat" style="display:inline-block;transform:rotate(90deg)"></i> Rotate node | Reverse the direct children of the selected internal node |
| <i class="bi bi-symmetry-horizontal" style="display:inline-block;transform:scaleX(-1)"></i> Rotate all | Reverse children at every level in the selected subtree |

### Selection Mode

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-circle"></i> Nodes | — | Select tips and internal nodes by clicking |
| <i class="bi bi-dash-lg"></i> Branches | ⌘B | Toggle between Nodes and Branches mode |

### Root

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-arrow-return-left"></i> Reroot | ⌘R | Root at the selection or branch marker (enabled when a selection is active) |
| <i class="bi bi-chevron-bar-contract" style="display:inline-block;transform:rotate(90deg)"></i> Midpoint | ⌘M | Automatically root at the midpoint of the longest path through the tree |
| <i class="bi bi-clock"></i> Temporal Root | ⌘T | Find the global root position that maximises clock-like signal (R²) across all branches |
| <i class="bi bi-clock-history"></i> Optimise on Branch | ⌘⇧T | Find the best root position on the currently selected branch |

### Hide / Show

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-node-minus"></i> Hide | ⌘⌫ | Hide the selected subtree (its branches and tips become invisible) |
| <i class="bi bi-node-plus"></i> Show | ⌘⇧⌫ | Reveal previously hidden tips or subtrees |

### Collapse / Expand

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-arrows-collapse"></i> Collapse | ⌘1 | Collapse the selected clade to a filled triangle symbol |
| <i class="bi bi-arrows-expand"></i> Expand | ⌘⇧1 | Expand a collapsed triangle back to its full subtree |

### Node Info

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-info-square"></i> Node Info | ⌘I | Open a dialog showing all annotations on the selected node |

### User Colour

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-brush"></i> Paint | ⌘K | With tips selected, open the colour picker to apply a colour to those tips (stored as `user_colour` annotation) |
| <i class="bi bi-eraser"></i> Clear colours | ⌘⇧K | Remove all user-assigned colours from the tree |
| <i class="bi bi-highlighter"></i> Highlight clade | ⌘⇧L | Apply a background highlight to the selected clade (persists even when selection changes) |
| <i class="bi bi-eraser"></i> Remove highlight | — | Remove the clade highlight |

### Tip Search / Filter

The **Filter tips…** search box in the toolbar searches tip labels as currently displayed — by name, annotation value, date string, or whatever the *Tip Labels → Show* dropdown is set to. 

### Panels

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-sliders"></i> | Tab | Open/close the Visual Options palette |
| <i class="bi bi-layout-sidebar-reverse"></i> | — | Open/close the Data Table panel (a scrollable tip list synced to the tree) |
| <i class="bi bi-info-circle"></i> About | — | Open the About panel (credits and funding) |
| <i class="bi bi-question-circle"></i> Help | ⌘? | Open this help panel |

---

## Mouse & Trackpad

| Action | Effect |
|---|---|
| **Scroll** | Pan the tree vertically |
| **⌥ + Scroll** | Zoom vertically, anchored at the mouse position |
| **⌘ + Scroll / Pinch** | Zoom in and out |
| **Click** (Nodes mode) | Select a tip or internal node |
| **⌘ + Click** | Add to or remove from the current selection |
| **Double-click** (Nodes mode) | Navigate into the subtree rooted at that node |
| **Click** (Branches mode) | Place a branch-point marker at the exact clicked position |
| **Hover** | Highlight nodes or branches and update the status bar |

---

## Keyboard Shortcuts

### File & Panels

| Shortcut | Action |
|---|---|
| **⌘O** | Open system file picker directly |
| **⌘⇧O** | Open *Open Tree* dialog (File / URL / Example tabs) |
| **⌘N** | New window |
| **⌘V** | Paste a tree from the clipboard |
| **⌘C** | Copy the current tree to the clipboard |
| **⌘⇧C** | Copy tip names to the clipboard |
| **⌘⇧A** | Import annotation file |
| **⌘E** | Export tree file |
| **⌘⇧E** | Export graphic |
| **⌘P** | Print |
| **Tab** | Toggle Visual Options palette |
| **⌘?** | Open Help |
| **Escape** | Close the innermost open dialog or panel |

### Edit / Selection

| Shortcut | Action |
|---|---|
| **⌘A** | Select all tips in the current view |
| **⌘⇧I** | Invert the current selection |

### Tree Interaction

| Shortcut | Action |
|---|---|
| **⌘B** | Toggle between Nodes and Branches mode |
| **⌘R** | Reroot at selection or branch marker |
| **⌘M** | Midpoint root |
| **⌘T** | Global Temporal Root |
| **⌘⇧T** | Optimise Root on current branch |
| **⌘I** | Node info dialog |
| **⌘D** | Order branches descending (larger clades down) |
| **⌘U** | Order branches ascending (larger clades up) |
| **⌘1** | Collapse selected clade to triangle |
| **⌘⇧1** | Expand collapsed clade triangle |
| **⌘K** | Paint selected tips with chosen colour |
| **⌘⇧K** | Clear all user-assigned colours |
| **⌘⇧L** | Highlight selected clade |
| **⌘⌫** | Hide selected subtree |
| **⌘⇧⌫** | Show all hidden nodes |

### Navigation

| Shortcut | Action |
|---|---|
| **⌘[** | Navigate back |
| **⌘]** | Navigate forward |
| **⌘⇧,** | Climb one level up |
| **⌘⇧.** | Drill into selected subtree |
| **⌘\\** | Return to root view |

### Vertical Scroll

| Shortcut | Action |
|---|---|
| **↑** / **↓** | Scroll one line (one tip row) |
| **⌘↑** / **⌘↓** | Scroll one page |
| **⌘⇧↑** / **⌘⇧↓** | Jump to top / bottom of tree |

### Zoom

| Shortcut | Action |
|---|---|
| **⌘=** / **⌘+** | Zoom in |
| **⌘−** | Zoom out |
| **⌘0** | Fit all |
| **⌘⇧0** | Fit labels |
| **⌘⇧=** | Widen Hyperbolic Lens |
| **⌘⇧−** | Narrow Hyperbolic Lens |

## Hyperbolic Lens

Hold the **\`** (backtick/tilde) key to activate a fisheye lens that expands the tree around the current cursor position without zooming the whole view. Releasing the key keeps the current expanded view and pressing **Escape** will cancel the fisheye mode.

---

## Selection Modes

### Nodes mode

- **Click a tip** — selects that tip; the status bar shows its name and divergence
- **Click an internal node** — selects all descendant tips and highlights the MRCA with a teal ring
- **⌘-click** — adds or removes individual tips from the selection
- **⌘A** — select all tips in the current view
- **⌘⇧I** — invert the current selection (all unselected tips become selected and vice versa)
- With a selection active, **Reroot**, **Rotate**, **Hide**, and **Node Info** become available

### Branches mode (⌘B to toggle)

- **Click anywhere on a horizontal branch** — places a marker at that exact position
- **Reroot** becomes active when a marker is placed
- Press **⌘B** again (or click the Nodes button) to switch back to Nodes mode

---

## Rerooting the Tree

**Using Nodes mode:**
1. Select a single tip or a set of tips (their MRCA defines the branch)
2. Click **Reroot** — the new root is placed at the midpoint of the branch above the selection

**Using Branches mode:**
1. Switch to **Branches** mode (**⌘B**)
2. Click on any branch to place a marker at the desired position
3. Click **Reroot** — the root is placed at exactly the clicked position

## Midpoint Root (⌘M)
PearTree finds the two tips with the greatest path length and places the root at the exact midpoint:

> **Note:** Explicitly rooted trees (where the root node carries annotations) have rerooting disabled.

---

## Subtree Navigation

- **Double-click** an internal node in **Nodes** mode to zoom into that subtree (or use **⌘⇧.**)
- Use <i class="bi bi-chevron-left"></i> (**⌘[**) to return to the parent view, or **⌘⇧,** to climb one level
- Use **⌘\\** to jump directly back to the full-tree root view
- Use <i class="bi bi-chevron-right"></i> (**⌘]**) to move forward through the history
- Navigation history is preserved across reorderings but cleared on reroot

---

## Hide / Show Subtrees

- Select an internal node, then click <i class="bi bi-eye-slash"></i> **Hide** to hide that subtree's branches and tips
- Hidden nodes are completely invisible — the tree is drawn as if they were pruned
- Select a visible node that covers hidden descendants and click <i class="bi bi-eye"></i> **Show** to restore them
- With no selection, <i class="bi bi-eye"></i> **Show** restores *all* hidden nodes in the current view
- Rerooting and subtree navigation work correctly in the presence of hidden nodes
- After hiding or showing, the zoom level is preserved (or fit-labels is re-applied) rather than resetting to fit-to-window

---

## Collapse / Expand Clades

Collapsing replaces a subtree with a filled **triangle symbol**, keeping it visible as a compact summary rather than hiding it entirely.

1. Select an internal node (or a set of tips — their MRCA is used)
2. Click the <i class="bi bi-arrows-collapse"></i> **Collapse** button to replace the subtree with a triangle
3. The triangle's label shows the clade name and tip count
4. Click the <i class="bi bi-arrows-expand"></i> **Expand** button, or **double-click the triangle**, to restore the full subtree

- The triangle **fill colour** defaults to the current theme's tip shape colour. It can be changed by selecting the triangle and using the <i class="bi bi-brush"></i> brush tool.

## Node Info (⌘I)

With a node selected, click the <i class="bi bi-info-square"></i> **Node Info** button (or press **⌘I**) to open a dialog listing all annotation keys and values for that node. For tips this includes the taxon name; for internal nodes it shows all posterior/support and annotation fields present in the tree file.

---

## Importing Annotations (⌘⇧A)

Click the <i class="bi bi-table"></i> button (or press **⌘⇧A**) to add extra per-tip data from a CSV or TSV file.

**Phase 1 — Choose file:** Drag-and-drop or browse for a `.csv` or `.tsv` file.

**Phase 2 — Configure columns:**
- Select which column contains the **taxon name** (used to match rows to tree tips)
- Choose which other columns to **import as annotations**
- A preview table shows the first few rows

**Phase 3 — Results:** A summary shows how many tips were successfully matched and annotated.

After import, the new annotation keys appear in the **Colour by** dropdowns and the **Legend** selector.

---

## Annotation Curator

Click the <i class="bi bi-tags"></i> button to open the Annotation Curator, which lets you review and fine-tune every annotation key in the loaded tree:

- Rename annotation keys
- Change data types (e.g. promote a numeric key from *real* to *categorical*)
- Mark a key as a **branch annotation** — telling PearTree the values belong to branches rather than to nodes, which changes how they are shown in Node Info and used in colour-by

After editing, the updated schema is used immediately for all display and export.

---

## Exporting the Tree (⌘E)

Click the <i class="bi bi-file-earmark-arrow-down"></i> button (or press **⌘E**) to save the tree.

### Format

| Option | Extension | Notes |
|---|---|---|
| **NEXUS** | `.nexus` | Full NEXUS TREES block; supports annotations and embedded settings |
| **Newick** | `.nwk` | Plain Newick string; annotations are optional but flagged as non-standard |

### Scope

| Option | Description |
|---|---|
| **Entire tree** | Exports the complete tree regardless of the current subtree view |
| **Current subtree view** | Exports only the visible subtree (enabled when zoomed in) |

### Annotations to include

When annotations are present, checkboxes let you choose which keys to embed in the output. **All** / **None** buttons select or deselect everything at once.

> If you include annotations in a Newick file, a warning is shown because Newick has no official annotation syntax.

### Embed current visual settings (NEXUS only)

When this checkbox is ticked (on by default) PearTree appends a `[peartree={…}]` comment inside the TREES block containing all current visual settings as JSON. When that file is reopened, the saved appearance is automatically restored and written back to localStorage.

---

## Exporting a Graphic (⌘⇧E)

Click the <i class="bi bi-image"></i> button (or press **⌘⇧E**) to download an image of the tree.

| Setting | Options |
|---|---|
| **Filename** | Base name for the downloaded file |
| **Format** | **SVG** (vector, scalable) or **PNG** (raster, 2× resolution) |
| **View** | **Current view** (what is visible on screen) or **Full tree** (entire height) |

SVG export includes all visible elements — branches, tip labels, node/tip shapes, colour legend, and time axis — as true vectors.

> Selection markers and hover highlights are intentionally excluded from SVG/PNG export.

---

## Visual Options Palette

The **Visual Options palette** (toggle with **Tab** or the <i class="bi bi-sliders"></i> button) contains organized control sections for all display settings:

- **Tip labels** — show/position/style tip names or annotation values
- **Node labels** — show internal node values (e.g. bootstrap support)
- **Branch labels** — show values at branch midpoints
- **Node shapes** — customize tip and internal node marker appearance
- **Branch shapes** — overlay configurable shapes on branches to represent metadata
- **Axis** — show a divergence or time scale
- **Node bars** — show BEAST HPD credible intervals
- **Legend** — position and style colour-by legends
- **Theme** — switch color themes and customize palettes
- **Panel management** — arrange side panels and export options

---

## Branch Shapes

Use **Branch Shapes** to overlay geometric markers (rectangles or ellipses) on the tree to visualize metadata values or counts per branch.

### Main Controls

| Control | Purpose |
|---|---|
| **Shape** | Select off, rectangle, or ellipse |
| **Filter** | Restrict rendering to a subset of branches (optional) |
| **Height** | Height of shapes as a percentage of branch length (0–100) |
| **Width** | Width relative to height (0.05–5.0; 1.0 = square) |
| **Alignment** | Position shapes left, center, or right along the branch |
| **Spacing** | Gap between adjacent shapes (pixels) |
| **Colour** | Default fill colour; override with *Colour by* |
| **Colour by** | Optional annotation key to colour shapes by category |
| **Count by** | Optional integer annotation to determine the number of shapes per branch |
| **Halo** | Outline size around shapes (pixels); 0 for no outline |
| **Halo colour** | Outline colour |

### Example Workflows

**Colour shapes by divergence category:**
1. Set **Shape** = rectangle, **Height** = 30%
2. Set **Colour by** = category annotation (e.g. "region")
3. Shapes now reflect geographic or categorical data per branch

**Show count of tips with a trait below:**
1. Set **Shape** = ellipse, **Height** = 40%
2. Set **Count by** = integer annotation (e.g. "num_tips_with_trait")
3. Each branch draws 0–N shapes representing the count value

**Highlight specific branches:**
1. Create a filter (Annotations Manager → Filters tab)
2. Set **Filter** = your filter name
3. Shapes appear only on branches passing the filter

### Extra Shapes (2–4)

After configuring the primary shape, you can enable up to three additional shape rows using the expandable detail sections for **Shape 2**, **Shape 3**, and **Shape 4**. Each row supports the same controls and stacks left-to-right. This allows you to simultaneously visualize multiple metadata dimensions per branch.

---

## Data Table Panel

Click the <i class="bi bi-layout-sidebar-reverse"></i> button in the toolbar to open a scrollable panel listing all visible tips in tree order. The data columns shown can be selected in the Annotations Manager window. Values can be edited by double-clicking the cell.

---

## Status Bar

The status bar at the bottom updates live as you hover over the tree:

| Field | Description |
|---|---|
| **Name** | Taxon name of the hovered tip or internal node identifier |
| **Div** | Cumulative divergence from the root to this node |
| **Tips** | Number of descendant tips (or count of selected tips when a selection is active) |
| **Dist** | Branch length from this node to its parent |
| **Height** | Node height (for time-trees with dated tips) |
| **Length** | Position along the branch at the current mouse x-position (Branches mode) |

---

## Settings Persistence

All visual settings are automatically saved in **browser localStorage** and restored the next time you open PearTree. This includes theme, typeface, all palette values, colour-by dropdowns, legend and axis configuration, branch order, and selection mode.

When a tree is exported with **Embed current visual settings** ticked, those settings travel with the file. Opening that `.nexus` file in PearTree restores the full appearance automatically and saves it to localStorage for future sessions.

---

## Data Formats

### NEXUS

PearTree parses the `TREES` block including:
- `TRANSLATE` blocks (numeric-to-name mappings)
- Square-bracket annotations in BEAST/FigTree style: `[&key=value,key2=value2]`
- The `[&R]` rooted-tree flag
- Embedded PearTree settings comments: `[peartree={…}]`

### Newick

Plain Newick strings with branch lengths (`name:length`) and optional square-bracket annotations are fully supported. The first tree in the file is displayed.

### Annotations

Annotation values are auto-typed as **real**, **integer**, **categorical**, or **list** (comma-separated values inside `{}`). Only non-list annotations are available in the *Colour by* dropdowns. The Annotation Curator lets you override these types if the auto-detection is incorrect.
