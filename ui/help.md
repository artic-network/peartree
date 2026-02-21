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

Click the **folder icon** or press **⌘O** to open the *Open Tree File* dialog. Three tabs are available:

| Tab | Description |
|---|---|
| **File** | Drag-and-drop a file onto the drop zone, or click *Choose File* to browse |
| **URL** | Enter a direct URL to a NEXUS or Newick file and click *Load from URL* |
| **Example** | Load the built-in Ebola virus (EBOV) example tree |

Supported formats: **NEXUS** (`.nex`, `.nexus`, `.tre`, `.tree`) and **Newick** (`.nwk`, `.newick`).

Press **Escape** or click × to close the dialog without loading (once a tree is already open).

---

## Toolbar Buttons

### File

| Button | Shortcut | Description |
|---|---|---|
| **folder** | ⌘O | Open the *Open Tree File* dialog |
| **+ file** | ⌘⇧O | Import an annotation CSV/TSV file (enabled once a tree is loaded) |
| **↓ file** | ⌘S | Export the tree as NEXUS or Newick (enabled once a tree is loaded) |
| **image** | ⌘E | Download a graphic (SVG or PNG) of the tree (enabled once a tree is loaded) |

### Navigation (History)

| Button | Shortcut | Description |
|---|---|---|
| **‹** back | ⌘[ | Navigate back to the parent subtree view |
| **›** forward | ⌘] | Restore the next subtree view in the history |

### Zoom & Fit

| Button | Shortcut | Description |
|---|---|---|
| **⊕** zoom in | ⌘= | Zoom in vertically (1.5× step) |
| **⊖** zoom out | ⌘− | Zoom out vertically (1.5× step) |
| **⛶** fit all | ⌘0 | Fit the entire tree to the window |
| **T** fit labels | ⌘⇧0 | Zoom so that tip labels no longer overlap |

### Branch Order

| Button | Shortcut | Description |
|---|---|---|
| **↑** ascending | ⌘D | Order branches so larger clades are toward the bottom |
| **↓** descending | ⌘U | Order branches so larger clades are toward the top |

### Rotate

| Button | Description |
|---|---|
| **↻** Rotate node | Reverse the direct children of the selected internal node |
| **⇔** Rotate all | Reverse children at every level in the selected subtree |

### Selection Mode

| Button | Shortcut | Description |
|---|---|---|
| **○** Nodes | — | Select tips and internal nodes by clicking |
| **⌒** Branches | ⌘B | Toggle between Nodes and Branches mode |

### Root

| Button | Shortcut | Description |
|---|---|---|
| **Reroot** | — | Root at the selection or branch marker (enabled when a selection is active) |
| **Midpoint** | ⌘M | Automatically root at the midpoint of the longest path through the tree |

### Hide / Show

| Button | Description |
|---|---|
| **eye-slash** Hide | Collapse the selected subtree (hides its descendants) |
| **eye** Show | Expand a previously hidden/collapsed subtree |

### Node Info

| Button | Shortcut | Description |
|---|---|---|
| **ⓘ** Node Info | ⌘I | Open a dialog showing all annotations on the selected node |

### User Colour

| Button | Description |
|---|---|
| **colour swatch** | With tips selected, pick a colour to apply to those tips (stored as `user_colour` annotation) |
| **eraser** Clear | Remove all user-assigned colours from the tree |

The user colour is stored as a `user_colour` annotation in `#RRGGBB` format on individual nodes. It round-trips through NEXUS export/import. Once at least one node has been coloured, **user colour** appears as the second option (after "none") in all three **Colour by** selectors (tip shape, node shape, label). It is intentionally excluded from the Legend selector.

### Panels

| Button | Shortcut | Description |
|---|---|---|
| **sliders** | Tab | Open/close the Visual Options palette |
| **ⓘ** About | — | Open the About panel (credits and funding) |
| **?** Help | — | Open this help panel |

---

## Mouse & Trackpad

| Action | Effect |
|---|---|
| **Scroll** | Pan the tree vertically |
| **⌥ + Scroll** | Zoom vertically, anchored at the mouse position |
| **Ctrl + Scroll / Pinch** | Zoom in and out |
| **Click** (Nodes mode) | Select a tip or internal node |
| **⌘/Ctrl + Click** | Add to or remove from the current selection |
| **Double-click** (Nodes mode) | Navigate into the subtree rooted at that node |
| **Click** (Branches mode) | Place a branch-point marker at the exact clicked position |
| **Hover** | Highlight nodes or branches and update the status bar |

---

## Keyboard Shortcuts

### File & Panels

| Shortcut | Action |
|---|---|
| **⌘O** | Open tree file |
| **⌘⇧O** | Import annotation file |
| **⌘S** | Export tree file |
| **⌘E** | Export graphic |
| **Tab** | Toggle Visual Options palette |
| **Escape** | Close the innermost open dialog or panel |

### Tree Interaction

| Shortcut | Action |
|---|---|
| **⌘A** | Select all tips in the current view |
| **⌘B** | Toggle between Nodes and Branches mode |
| **⌘M** | Midpoint root |
| **⌘I** | Node info dialog |
| **⌘D** | Order branches ascending (larger clades down) |
| **⌘U** | Order branches descending (larger clades up) |
| **⌘[** | Navigate back |
| **⌘]** | Navigate forward |

### Zoom

| Shortcut | Action |
|---|---|
| **⌘=** / **⌘+** | Zoom in |
| **⌘−** | Zoom out |
| **⌘0** | Fit all |
| **⌘⇧0** | Fit labels |

### Dialogs

| Shortcut | Action |
|---|---|
| **Enter** | Confirm / Download in the active dialog |
| **Escape** | Cancel / close the active dialog |

> On Windows/Linux, replace **⌘** with **Ctrl**.

---

## Selection Modes

### Nodes mode

- **Click a tip** — selects that tip; the status bar shows its name and divergence
- **Click an internal node** — selects all descendant tips and highlights the MRCA with a teal ring
- **⌘-click** — adds or removes individual tips from the selection
- **Click empty space** — clears the selection
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

After rerooting, the navigation history is cleared and the full rerooted tree is displayed.

> **Note:** Explicitly rooted trees (where the root node carries annotations) have rerooting disabled.

---

## Midpoint Root (⌘M)

PearTree finds the two tips with the greatest path length and places the root at the exact midpoint:

- **No selection** — uses the global tree diameter
- **Single tip selected** — roots at the midpoint of the branch above that tip
- **Multiple tips selected** — roots at the midpoint of the branch above their MRCA
- **Branch marker placed** — roots at the exact clicked position on that branch

---

## Subtree Navigation

- **Double-click** an internal node in **Nodes** mode to zoom into that subtree
- Use **‹** (**⌘[**) to return to the parent view
- Use **›** (**⌘]**) to move forward through the history
- Navigation history is preserved across reorderings but cleared on reroot

---

## Hide / Show Subtrees

- Select an internal node, then click **Hide** (eye-slash) to collapse that subtree
- A collapsed node is shown as a filled triangle; hovering shows a tip count
- Select a collapsed node and click **Show** (eye) to restore it
- Rerooting and subtree navigation work correctly in the presence of hidden subtrees

---

## Node Info (⌘I)

With a node selected, click the **ⓘ Node Info** button (or press **⌘I**) to open a dialog listing all annotation keys and values for that node. For tips this includes the taxon name; for internal nodes it shows all posterior/support and annotation fields present in the tree file.

---

## Importing Annotations (⌘⇧O)

Click the **+ file** button (or press **⌘⇧O**) to add extra per-tip data from a CSV or TSV file.

**Phase 1 — Choose file:** Drag-and-drop or browse for a `.csv` or `.tsv` file.

**Phase 2 — Configure columns:**
- Select which column contains the **taxon name** (used to match rows to tree tips)
- Choose which other columns to **import as annotations**
- A preview table shows the first few rows

**Phase 3 — Results:** A summary shows how many tips were successfully matched and annotated.

After import, the new annotation keys appear in the **Colour by** dropdowns and the **Legend** selector.

---

## Exporting the Tree (⌘S)

Click the **↓ file** button (or press **⌘S**) to save the tree.

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

## Exporting a Graphic (⌘E)

Click the **image** button (or press **⌘E**) to download an image of the tree.

| Setting | Options |
|---|---|
| **Filename** | Base name for the downloaded file |
| **Format** | **SVG** (vector, scalable) or **PNG** (raster, 2× resolution) |
| **View** | **Current view** (what is visible on screen) or **Full tree** (entire height) |

SVG export includes all visible elements — branches, tip labels, node/tip shapes, colour legend, and time axis — as true vectors.

> Selection markers and hover highlights are intentionally excluded from SVG/PNG export.

---

## Visual Options Palette

Toggle with **Tab** or the sliders button. Close with **Tab**, **Escape**, the × button, or by clicking the canvas.

---

### Theme

A named preset that sets all 13 visual parameters at once.

| Control | Description |
|---|---|
| **Theme selector** | Choose a built-in theme (*Artic*, *Gytis*) or a saved user theme |
| **Store** button | Active when set to *Custom*. Enter a name to save the current appearance for reuse. Built-in themes cannot be overwritten. |

When you manually change any visual control, the selector switches to *Custom* and the **Store** button is enabled.

| Theme | Description |
|---|---|
| **Artic** | Dark teal background with warm cream labels and grey node shapes |
| **Gytis** | White background with black branches and blue/grey node shapes |

---

### Canvas

| Control | Description |
|---|---|
| **Background** | Canvas background colour |
| **Branches** | Branch line colour |
| **Branch width** | Stroke thickness in pixels (0.5–8) |

---

### Tip Labels

| Control | Description |
|---|---|
| **Size** | Font size in points (6–20) |
| **Colour** | Fixed colour for all tip labels |
| **Colour by** | Annotation to colour each label individually using a continuous or categorical scale |

---

### Tip Shapes

| Control | Description |
|---|---|
| **Size** | Radius of tip circles (0 = hidden) |
| **Colour** | Fill colour of tip circles |
| **Background** | Colour of the halo circle behind each tip shape |
| **Bg size** | Extra radius of the background halo (0–8) |
| **Colour by** | Annotation to colour each tip shape individually |

---

### Node Shapes

| Control | Description |
|---|---|
| **Size** | Radius of internal-node circles (0 = hidden) |
| **Colour** | Fill colour of node circles |
| **Background** | Colour of the halo behind each node shape |
| **Bg size** | Extra radius of the background halo (0–8) |
| **Colour by** | Annotation to colour each internal node individually |

> Tip shapes are drawn on top of node shapes. Background halos are drawn below both, so a tip halo will appear above an overlapping node halo.

---

### Legend

| Control | Description |
|---|---|
| **Show** | *Off*, *Left*, or *Right* — position of the colour legend strip |
| **Annotation** | Which annotation's colour scale to display in the legend |

---

### Axis

Available only for **time-scaled trees** where every node carries a `height` annotation.

| Control | Description |
|---|---|
| **Show** | *Off* or *On* |
| **Date annotation** | Annotation key whose values supply calendar dates |
| **Major ticks** | Tick interval: *Auto*, *Decades*, *Years*, *Quarters*, *Months*, *Weeks*, *Days* |
| **Minor ticks** | Sub-division ticks between major ticks, or *Off* |
| **Major labels** | Date format for major tick labels (e.g. `yyyy`, `yyyy-MM`, `dd MMM yyyy`) |
| **Minor labels** | Date format for minor tick labels, or *Off* |

---

### Reset to Defaults

The **Reset to defaults** button at the bottom of the palette resets all visual controls and applies the *Artic* theme. A confirmation prompt is shown first.

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

All visual settings are automatically saved in **browser localStorage** and restored the next time you open PearTree. This includes theme, all palette values, colour-by dropdowns, legend and axis configuration, branch order, and selection mode.

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

Annotation values are auto-typed as **real**, **integer**, **categorical**, or **list** (comma-separated values inside `{}`). Only non-list annotations are available in the *Colour by* dropdowns.
