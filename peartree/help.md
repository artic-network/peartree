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

Click <i class="bi bi-folder2-open"></i> or press **⌘O** to open the *Open Tree File* dialog. Three tabs are available:

| Tab | Description |
|---|---|
| **File** | Drag-and-drop a file onto the drop zone, or click *Choose File* to browse |
| **URL** | Enter a direct URL to a NEXUS or Newick file and click *Load from URL* |
| **Example** | Load the built-in Ebola virus (EBOV) example tree |

Supported formats: **NEXUS** (`.nex`, `.nexus`, `.tre`, `.tree`, `.treefile`) and **Newick** (`.nwk`, `.newick`).

Press **Escape** or click × to close the dialog without loading (once a tree is already open).

---

## Toolbar Buttons

### File

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-folder2-open"></i> | ⌘O | Open the *Open Tree File* dialog |
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
| <i class="bi bi-reply-fill"></i> Reroot | — | Root at the selection or branch marker (enabled when a selection is active) |
| <i class="bi bi-vr" style="display:inline-block;transform:rotate(90deg)"></i> Midpoint | ⌘M | Automatically root at the midpoint of the longest path through the tree |

### Hide / Show

| Button | Description |
|---|---|
| <i class="bi bi-eye-slash"></i> Hide | Hide the selected subtree (its branches and tips become invisible) |
| <i class="bi bi-eye"></i> Show | Reveal previously hidden tips or subtrees |

### Collapse / Expand

| Button | Description |
|---|---|
| <i class="bi bi-arrows-collapse"></i> Collapse | Collapse the selected clade to a filled triangle symbol |
| <i class="bi bi-arrows-expand"></i> Expand | Expand a collapsed triangle back to its full subtree |

### Node Info

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-info-square"></i> Node Info | ⌘I | Open a dialog showing all annotations on the selected node |

### User Colour

| Button | Description |
|---|---|
| <i class="bi bi-brush"></i> | With tips selected, open the colour picker to apply a colour to those tips (stored as `user_colour` annotation) |
| <i class="bi bi-eraser"></i> Clear | Remove all user-assigned colours from the tree |

Clicking the <i class="bi bi-brush"></i> button opens a popup panel with:
- A row of **recently used colours** (persisted across sessions)
- Rows of **categorical palette swatches** — click any swatch to apply that colour immediately
- An **Open colour picker** button that invokes the system native colour dialog for precise hex/RGB entry

The user colour is stored as a `user_colour` annotation in `#RRGGBB` format on individual nodes. It round-trips through NEXUS export/import. Once at least one node has been coloured, **user colour** appears as the second option (after "none") in all three **Colour by** selectors (tip shape, node shape, label). It is intentionally excluded from the Legend selector.

### Tip Search / Filter

The **Filter tips…** search box in the toolbar searches tip labels as currently displayed — by name, annotation value, date string, or whatever the *Tip Labels → Show* dropdown is set to. Matches are selected (highlighted), non-matches are dimmed, and the count of matching tips is shown. The filter applies with a short debounce as you type and reacts to changes in the displayed label type without needing to re-enter the query.

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
| **⌘O** | Open tree file |
| **⌘N** | New window |
| **⌘⇧A** | Import annotation file |
| **⌘E** | Export tree file |
| **⌘⇧E** | Export graphic |
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
| **⌘M** | Midpoint root |
| **⌘I** | Node info dialog |
| **⌘D** | Order branches descending (larger clades down) |
| **⌘U** | Order branches ascending (larger clades up) |

### Navigation

| Shortcut | Action |
|---|---|
| **⌘[** | Navigate back |
| **⌘]** | Navigate forward |
| **⌘⇧,** | Climb one level up |
| **⌘⇧.** | Drill into selected subtree |
| **⌘\\** | Return to root view |

### Zoom

| Shortcut | Action |
|---|---|
| **⌘=** / **⌘+** | Zoom in |
| **⌘−** | Zoom out |
| **⌘0** | Fit all |
| **⌘⇧0** | Fit labels |

### Hyperbolic Lens

| Shortcut | Action |
|---|---|
| **\`** (hold) | Activate hyperbolic lens at cursor position |
| **⌘⇧=** | Widen hyperbolic lens magnification |
| **⌘⇧−** | Narrow hyperbolic lens magnification |

### Dialogs

| Shortcut | Action |
|---|---|
| **Enter** | Confirm / Download in the active dialog |
| **Escape** | Cancel / close the active dialog |

---

## Hyperbolic Lens

Hold the **\`** (backtick/tilde) key to activate a fisheye lens that expands the tree around the current cursor position without zooming the whole view. The area near the cursor is stretched to readable spacing while the rest compresses but stays visible.

- Use **⌘⇧=** / **⌘⇧−** to increase or decrease the magnification strength.
- Release **\`** to fade the lens out.
- The lens is especially useful for browsing large trees without losing context.

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

### Triangle appearance

- The triangle **fill colour** defaults to the current theme's tip shape colour. It can be changed by selecting the triangle and using the <i class="bi bi-brush"></i> brush tool.
- The <i class="bi bi-eraser"></i> button resets a triangle's colour back to the theme default.
- The triangle draws a **halo** ring matching the tip shape halo settings.
- **Fill opacity** and **Height (rows)** are controlled in the *Collapsed Clades* section of the Visual Options palette (see below).

### Zoom behaviour

- If **Fit labels** (⌘⇧0) was the active zoom mode, collapsing or expanding re-applies fit labels for the new tip count.
- Otherwise the current zoom level is preserved, scaled proportionally to the change in layout height.

---

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

## Data Table Panel

Click the <i class="bi bi-layout-sidebar-reverse"></i> button in the toolbar to open a scrollable panel listing all visible tips in tree order.

- The panel is **synchronised** with the canvas: selecting a tip in the tree highlights its row, and clicking a row selects that tip.
- For **collapsed clades**, the table shows one row per enclosed tip (if the clade is full-height) or a single placeholder row otherwise, allowing you to browse and select tips within a collapsed clade.
- The panel can be **pinned** open alongside the canvas (it shows a resize handle when pinned) or used as a floating overlay.
- Columns reflect the loaded annotations; the table is re-rendered whenever the layout changes.

---

## Visual Options Palette

Toggle with **Tab** or the <i class="bi bi-sliders"></i> button. Close with **Tab**, **Escape**, the × button, or by clicking the canvas.

---

### Theme

A named preset that sets all visual parameters at once.

| Control | Description |
|---|---|
| **Theme selector** | Choose a built-in theme (*Artic*, *Gytis*) or a saved user theme |
| **Store** button | Save the current appearance under a new name. Built-in themes cannot be overwritten. |
| **Default** button | Set the selected theme as the default for newly opened windows |
| **Remove** button | Delete a user-saved theme (built-in themes cannot be removed) |
| **Typeface** | Font family used for all tip labels, node labels, and axis labels |

When you manually change any visual control, the selector switches to *Custom* and the **Store** button is enabled.

| Theme | Description |
|---|---|
| **Artic** | Dark teal background with warm cream labels and grey node shapes |
| **Gytis** | White background with black branches and blue/grey node shapes |

---

### Tree

| Control | Description |
|---|---|
| **Calibrate** | Annotation key whose values supply calendar dates for time-axis calibration. Only shown when the tree has date-typed or decimal-year annotations. |
| **Format** | Display format for calibrated calendar dates (e.g. `1977-05-04`, `04 May 1977`). Only shown once a calibration is active. |
| **Background** | Canvas background colour |
| **Branches** | Branch line colour |
| **Branch width** | Stroke thickness in pixels (0.5–8) |
| **Neg. branches** | How to handle negative branch lengths: *draw as-is* or *clamp to zero* |

---

### Tip Labels

| Control | Description |
|---|---|
| **Show** | Which value to display next to each tip: *names* (taxon name), any annotation key, or (when calibrated) *Calendar date* / *Calendar date + HPDs* |
| **Decimal places** | Number of decimal places for numeric annotations (*Auto* uses sensible defaults). Only shown for numeric annotation types. |
| **Layout** | *Normal* (label floats at each tip's x position) or *Aligned* (all labels right-aligned to a common column). Aligned has optional leader line styles: *dashed*, *dots*, or *solid*. |
| **Size** | Font size in points (1–20) |
| **Colour** | Fixed colour for all tip labels |
| **Colour by** | Annotation to colour each label individually |
| **Palette** | Colour palette used when *Colour by* is active |
| **Selected style** | Font style applied to selected tips: *Bold*, *Italic*, *Bold + Italic*, or *Normal* |

> The **Filter tips…** search box in the toolbar searches whatever *Show* is set to, so switching from *names* to a date annotation and then searching will match against the displayed date strings.

---

### Tip Shapes

| Control | Description |
|---|---|
| **Size** | Radius of tip circles (0 = hidden) |
| **Colour** | Fill colour of tip circles |
| **Halo** | Extra radius of the background halo ring (0–8) |
| **Halo Colour** | Colour of the halo circle drawn behind each tip shape |
| **Colour by** | Annotation to colour each tip shape individually |
| **Palette** | Colour palette used when *Colour by* is active |

---

### Node Shapes

| Control | Description |
|---|---|
| **Size** | Radius of internal-node circles (0 = hidden) |
| **Colour** | Fill colour of node circles |
| **Halo** | Extra radius of the background halo ring (0–8) |
| **Halo Colour** | Colour of the halo circle drawn behind each node shape |
| **Colour by** | Annotation to colour each internal node individually |
| **Palette** | Colour palette used when *Colour by* is active |

> Tip shapes are drawn on top of node shapes. Background halos are drawn below both, so a tip halo will appear above an overlapping node halo.

---

### Node Labels

| Control | Description |
|---|---|
| **Show** | Which annotation value to display beside each internal node. *Off* hides all node labels. |
| **Decimal places** | Number of decimal places for numeric annotations. Only shown for numeric types. |
| **Position** | Where the label is drawn: *Right* (after the node), *Above left*, or *Below left* |
| **Size** | Font size in points (6–20) |
| **Colour** | Label text colour |
| **Spacing** | Extra horizontal gap between the node shape and its label (0–20 px) |

---

### Node Bars

Node bars display 95% HPD (highest probability density) intervals from **BEAST** MCC trees as translucent rectangles behind internal nodes. They are only available when the loaded tree has a `height` annotation with associated HPD values.

| Control | Description |
|---|---|
| **Show** | *Off* or *On* |
| **Colour** | Fill colour of the HPD rectangle |
| **Height** | Bar height in screen pixels (2–30) |
| **Line** | Optional vertical line inside the bar: *(none)*, *Mean*, or *Median* |
| **Range whiskers** | Whether to draw thin lines extending to the full range beyond the HPD rectangle |

---

### Collapsed Clades

This section appears in the palette once at least one clade has been collapsed to a triangle.

| Control | Description |
|---|---|
| **Fill opacity** | Translucency of the triangle fill (0 = fully transparent, 1 = opaque) |
| **Height (rows)** | Height of the triangle base expressed in tip-row units (1–20). Clades with more tips than this value are drawn at their natural tip-count height; the slider maximum is automatically raised to match the largest collapsed clade. |

---

### Legend

| Control | Description |
|---|---|
| **Show** | Select an annotation to display a colour legend for, or *Off* to hide the legend |
| **Location** | *Right* or *Left* — which edge of the canvas the legend strip is docked to |
| **Colour** | Text colour for legend labels |
| **Size** | Font size for legend labels (6–16) |

---

### Axis

| Control | Description |
|---|---|
| **Show** | *Off*, *Forward* (divergence from root), *Reverse* (divergence toward tips), or *Time* (calendar dates, requires calibration) |
| **Colour** | Axis line and label colour |
| **Font size** | Axis label size (6–16) |
| **Line width** | Axis stroke thickness (0.5–4) |

**Time mode only** (requires *Calibrate* to be set in the *Tree* section):

| Control | Description |
|---|---|
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
