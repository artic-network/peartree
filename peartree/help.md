> Quick reference for the PearTree interface, options, and hotkeys.

---

## Interface Overview

PearTree is organised into four main areas:

- **Toolbar** — buttons for files, navigation, zoom, branch ordering, selection, rerooting, hiding, and panels
- **Visual Options palette** — pop-out panel on the left with all display controls (toggle with **Tab** or the sliders button)
- **Canvas** — the tree drawing, which fills the remaining space
- **Status bar** — live readout of values under the mouse cursor

---

## Opening a Tree File

Click <i class="bi bi-folder2-open"></i> or press **⌘⇧O** to open the *Open Tree File* dialog.

Tabs:

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

### User Colour

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-brush"></i> Paint | ⌘K | With tips selected, open the colour picker to apply a colour to those tips (stored as `user_colour` annotation) |
| <i class="bi bi-eraser"></i> Clear colours | ⌘⇧K | Remove all user-assigned colours from the tree |
| <i class="bi bi-highlighter"></i> Highlight clade | ⌘⇧L | Apply a background highlight to the selected clade (persists even when selection changes) |
| <i class="bi bi-eraser"></i> Remove highlight | — | Remove the clade highlight |

## Highlighting Clades

Use **Highlight clade** {%- include 'btn.html', id: "btn-paint-highlight" %} or **⌘⇧L** to add a clade highlight.

Clade Highlights options:

- **Colour** — fixed colour or annotation-driven colour
- **Style** — shape, edge style, and outline behaviour
- **Padding** — space around the clade
- **Corner radius** — rounded-corner amount
- **Opacity** — transparency of the fill
- **Stroke width** — outline thickness

Use **Remove highlight** to clear the current highlight.

### Node Info

| Button | Shortcut | Description |
|---|---|---|
| <i class="bi bi-info-square"></i> Node Info | ⌘I | Open a dialog showing all annotations on the selected node |

### Tip Search / Filter

The **Filter tips…** search box matches the currently displayed tip labels, annotation values, or dates.

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
| **Scroll** | Pan vertically |
| **⌥ + Scroll** | Zoom vertically at the pointer |
| **⌘ + Scroll / Pinch** | Zoom in and out |
| **Click** (Nodes mode) | Select a tip or internal node |
| **⌘ + Click** | Add to or remove from the current selection |
| **Double-click** (Nodes mode) | Enter the clicked subtree |
| **Click** (Branches mode) | Place a branch-point marker at the exact clicked position |
| **Hover** | Highlight nodes or branches and update the status bar |

---

## Keyboard Shortcuts

### File & Panels

| Shortcut | Action |
|---|---|
| **⌘O** | Open the file picker |
| **⌘⇧O** | Open the tree dialog |
| **⌘N** | New window |
| **⌘V** | Paste a tree from the clipboard |
| **⌘⇧C** | Copy the current tree |
| **⌘C** | Copy displayed tip labels to the clipboard |
| **⌘⇧A** | Import annotation file |
| **⌘E** | Export tree |
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

Hold **\`** to activate the lens. Release the key to keep the current view; press **Escape** to cancel it.

---

## Selection Modes

### Nodes mode

- **Click a tip** — select it
- **Click an internal node** — select its descendant tips
- **⌘-click** — add or remove individual tips
- **⌘A** — select all tips in the current view
- **⌘⇧I** — invert the current selection
- With a selection active, **Reroot**, **Rotate**, **Hide**, and **Node Info** become available

### Branches mode (⌘B to toggle)

- **Click a branch** — place a marker
- **Reroot** becomes active when a marker is placed
- Press **⌘B** again (or click the Nodes button) to switch back to Nodes mode

---

## Rerooting the Tree

**Nodes mode:** select a tip or set of tips, then click **Reroot**.

**Branches mode:** switch to **Branches** (**⌘B**), click a branch to place a marker, then click **Reroot**.

### Midpoint Root (⌘M)
Use **Midpoint** to place the root at the midpoint of the longest path.

> **Note:** Explicitly rooted trees have rerooting disabled.

---

## Subtree Navigation

- **Double-click** an internal node in **Nodes** mode, or use **⌘⇧.**, to enter that subtree
- Use <i class="bi bi-chevron-left"></i> (**⌘[**) to go back, or **⌘⇧,** to climb one level
- Use **⌘\\** to return to the full-tree root view
- Use <i class="bi bi-chevron-right"></i> (**⌘]**) to go forward
- Navigation history is preserved across reorderings and cleared on reroot

---

## Hide / Show Subtrees

- Select an internal node, then click <i class="bi bi-eye-slash"></i> **Hide** to hide it and its descendants
- Hidden nodes are not drawn
- Click <i class="bi bi-eye"></i> **Show** to restore hidden nodes
- With no selection, **Show** restores all hidden nodes in the current view

---

## Collapse / Expand Clades

Collapse replaces a subtree with a filled triangle.

1. Select an internal node (or tips whose MRCA defines the clade)
2. Click the <i class="bi bi-arrows-collapse"></i> **Collapse** button
3. The triangle label shows the clade name and tip count
4. Click the <i class="bi bi-arrows-expand"></i> **Expand** button, or double-click the triangle, to restore it

- The triangle fill colour defaults to the current theme's tip shape colour.

## Node Info (⌘I)

With a node selected, click the <i class="bi bi-info-square"></i> **Node Info** button (or press **⌘I**) to open the annotations dialog.

---

## Importing Annotations (⌘⇧A)

Click the <i class="bi bi-table"></i> button (or press **⌘⇧A**) to add per-tip data from a CSV or TSV file.

**Phase 1 — Choose file:** Drag-and-drop or browse for a `.csv` or `.tsv` file.

**Phase 2 — Configure columns:**
- Select which column contains the **taxon name** (used to match rows to tree tips)
- Choose which other columns to **import as annotations**
- A preview table shows the first few rows

**Phase 3 — Results:** A summary shows how many tips were successfully matched and annotated.

After import, the new annotation keys appear in the **Colour by** dropdowns and the **Legend** selector.

---

## Annotation Manager

Click the <i class="bi bi-tags"></i> button to open the Annotation Curator:

- Rename annotation keys
- Change data types
- Mark a key as a **branch annotation**

The updated schema is used immediately.

---

## Exporting the Tree (⌘E)

Click the <i class="bi bi-file-earmark-arrow-down"></i> button (or press **⌘E**) to export the tree.

### Format

| Option | Extension | Notes |
|---|---|---|
| **NEXUS** | `.nexus` | Full NEXUS TREES block |
| **Newick** | `.nwk` | Plain Newick string |

### Scope

| Option | Description |
|---|---|
| **Entire tree** | Export the complete tree |
| **Current subtree view** | Export only the visible subtree |

### Tip Label

The **Tip Label** selector controls what leaf names are written into exported NEXUS/Newick trees:

| Option | Description |
|---|---|
| **As displayed** | Use the first rendered tip-label field |
| **name** | Use the original taxon names |
| **non-numerical tip annotation** | Use the selected tip annotation value |

If the selected tip label is not unique within the export scope, PearTree shows a warning because many downstream tools expect unique tip names.

### CSV ID Column

When exporting **CSV metadata**, the **ID column** selector controls the first column in the exported table:

| Option | Description |
|---|---|
| **As viewed** | Use the first rendered tip-label field |
| **name** | Use the original taxon names |
| **non-numerical tip annotation** | Use the selected tip annotation value |

If the selected ID values are not unique within the export scope, PearTree shows a warning because the CSV ID column is usually used for joins and should be unique.

### Annotations to include

When annotations are present, checkboxes let you choose which keys to embed in the output. **All** / **None** buttons select or deselect everything at once.

> If you include annotations in a Newick file, a warning is shown because Newick has no official annotation syntax.

### Embed current visual settings (NEXUS only)

When this checkbox is ticked (on by default) PearTree appends a `[peartree={…}]` comment inside the TREES block containing all current visual settings as JSON. When that file is reopened, the saved appearance is automatically restored and written back to localStorage.

### Copying Trees and Tip Labels

- **⌘⇧C / Copy** uses the same leaf-name rule as **Export Tree**. If later labels are joined onto the first displayed tip label, they are included in copied/exported tree tip names.
- **⌘C / Copy tip labels** copies the displayed label fields. Joined labels stay merged into the previous field; non-joined later labels are copied as additional tab-separated columns.
- **CSV metadata export** uses the same name source in its `name` column as the exported tree tip names.

---

## Exporting a Graphic (⌘⇧E)

Click the <i class="bi bi-image"></i> button (or press **⌘⇧E**) to export an image of the tree.

| Setting | Options |
|---|---|
| **Filename** | Base name for the downloaded file |
| **Format** | **SVG** (vector, scalable) or **PNG** (raster, 2× resolution) |
| **View** | **Current view** (what is visible on screen) or **Full tree** (entire height) |

SVG export includes all visible elements as vectors.

> Selection markers and hover highlights are intentionally excluded from SVG/PNG export.

---

## Visual Options Palette

The **Visual Options palette** (toggle with **Tab** or the <i class="bi bi-sliders"></i> button) contains the display settings:

- **Branches** — branch colour, width, and shape
- **Tip labels** — label tip names or annotations
- **Node labels** — show internal node values
- **Branch labels** — show branch-midpoint values
- **Node shapes** — control tip and node markers
- **Branch shapes** — add shapes to branches
- **Axis** — show a divergence or time scale
- **Node bars** — show HPD intervals
- **Legend** — position and style legends
- **Theme** — switch colour themes and palettes
- **Panel management** — arrange side panels and export options

---

## Branches

The **Branches** section controls branch appearance:

- **Colour** — fixed branch line colour
- **Colour by** — colour branch lines from an annotation key
- **Palette** — appears as **Configure** when *Colour by* is active
- **Width** — branch stroke thickness
- **Elbow Radius** — branch corner curvature

When **Colour by** is set to a node annotation, each branch uses the annotation value on its descendant node. If you choose a tip-only annotation, PearTree uses the descendant-tip average for each branch.

---

## Tip Labels (multi-label)

The **Tip Labels** section supports up to four annotation fields per tip.

### Label 1 (main)

The primary label is selected with the **Label 1** dropdown. Options:

| Value | Effect |
|---|---|
| `Off` | No label drawn |
| `name` | Display the taxon name |
| annotation key | Display the value of that annotation |

When Label 1 is on, additional controls appear:
- **Filter** — restrict labels to tips passing a filter
- **Alignment** — off, aligned, or connector styles
- **Spacing** — gap between labels
- **Size** — font size
- **Typeface** / **Style** / **Colour** / **Colour by**

### Labels 2, 3, and 4 (extras)

When Label 1 is on, **Label 2**, **Label 3**, and **Label 4** dropdowns appear, each offering the same annotation choices. Each extra label also has a **Layout** control.

All labels share Label 1's font, size, colour, and spacing settings.

**Layout modes for Labels 2–4:**
- **Append**: place the label to the right of the previous field
- **Align**: start a new aligned column
- **Join with space / | / / / _ / -**: append directly onto the previous field

**Alignment behaviour with multiple labels:**
- Label 1 still follows the main **Alignment** control
- Each **Align** column is aligned independently

### Example: Show name + collection date

1. Set **Label 1** = `name`
2. Set **Label 2** = `date` (or whichever annotation holds collection dates)
3. Set **Spacing** = 6
4. Tips now show: `SampleA ···  2024-01-15`

### Example: Show name + location + clade

1. Set **Label 1** = `name`, **Label 2** = `country`, **Label 3** = `clade`
2. Set **Alignment** = `Aligned + dashed` for clean column layout

---

## Branch Shapes

Use **Branch Shapes** to overlay rectangles or ellipses on branches.

### Main Controls

| Control | Purpose |
|---|---|
| **Shape** | Select off, rectangle, or ellipse |
| **Filter** | Restrict rendering to a subset of branches |
| **Height** | Shape height as a percentage of branch length |
| **Width** | Width relative to height |
| **Alignment** | Position shapes left, center, or right |
| **Spacing** | Gap between adjacent shapes |
| **Colour** | Default fill colour; override with *Colour by* |
| **Colour by** | Colour shapes by annotation |
| **Count by** | Number of shapes per branch |
| **Halo** | Outline size around shapes |
| **Halo colour** | Outline colour |

### Example Workflows

**Colour shapes by category:**
1. Set **Shape** = rectangle, **Height** = 30%
2. Set **Colour by** = category annotation (e.g. "region")
3. Shapes now reflect geographic or categorical data per branch

**Show count of tips with a trait:**
1. Set **Shape** = ellipse, **Height** = 40%
2. Set **Count by** = integer annotation (e.g. "num_tips_with_trait")
3. Each branch draws 0–N shapes representing the count value

**Highlight specific branches:**
1. Create a filter (Annotations Manager → Filters tab)
2. Set **Filter** = your filter name
3. Shapes appear only on branches passing the filter

### Extra Shapes (2–4)

After configuring the primary shape, you can enable up to three additional shape rows.

---

## Data Table Panel

Click the <i class="bi bi-layout-sidebar-reverse"></i> button to open the Data Table panel.

---

## Status Bar

The status bar updates live as you hover over the tree:

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

All visual settings are saved in **browser localStorage** and restored automatically.

When **Embed current visual settings** is ticked, the settings travel with the file.

---

## Data Formats

### NEXUS

PearTree parses the `TREES` block including:
- `TRANSLATE` blocks (numeric-to-name mappings)
- Square-bracket annotations in BEAST/FigTree style: `[&key=value,key2=value2]`
- The `[&R]` rooted-tree flag
- Embedded PearTree settings comments: `[peartree={…}]`

### Newick

Plain Newick strings with branch lengths and optional annotations are supported. The first tree is displayed.

### Annotations

Annotation values are auto-typed as **real**, **integer**, **categorical**, or **list**. Only non-list annotations are available in the *Colour by* dropdowns.
