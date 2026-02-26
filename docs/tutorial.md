# PearTree Tutorial

This tutorial walks through the main features of PearTree using the built-in Ebola virus (EBOV) example dataset. No files need to be downloaded — everything runs locally in your browser or the desktop app.

---

## 1. Opening the Example Dataset

When you first launch PearTree you will see the startup screen.

> <img src="images/fig1a.png" style="width:200px;"/> 
> 
> Startup screen showing the "No tree loaded" and the **Open…** and **Example…** buttons.

Click **Example…** to load the built-in EBOV dataset immediately. 

Alternatively, click the open button <img src="images/open_button.png" style="width:32px;"/> (or press **⌘O**) to open the *Open Tree File* dialog, switch to the **Example** tab, and click **Load Example Data**.

> <img src="images/fig1b.png" style="width:300px;"/>
>
> *Open Tree File* dialog with the `Example` tab selected.

After a moment the tree will appear on the canvas.

There are two other ways of loading trees from this dialog box. From a file on your hard drive:

> <img src="images/fig1c.png" style="width:300px;"/>
>
> *Open Tree File* dialog with the `File` tab selected.

Note that the tree just gets imported into the web browser, not uploaded to a server - it remains on your computer.

Finally, you can point it towards a tree file on the internet by entering the URL:

> <img src="images/fig1d.png" style="width:300px;"/>
>
> *Open Tree File* dialog with the `URL` tab selected.

For this tutorial, just open the Example tree.

---

## 2. The Interface at a Glance

The interface has four main areas:

- **Toolbar** (top) — buttons for files, navigation, zoom, ordering, selection, rerooting, and panels
- **Canvas** (centre) — the tree drawing; fills the central space on the page
- **Visual Options palette** (left, hidden by default) — all display controls
- **Status bar** (bottom) — live readout of values under the cursor

> <img src="images/fig2a.png" style="width:500px;"/>
> 
> EBOV tree loaded and filling the canvas. Tip labels will not currently be visible because of the size of the tree. The colours used will be determined by the **theme** currently being used - the current default is the `ARTIC` theme but this can be changed. From this point on we will use `Minimal` --- a simple monochrome theme –-- for clarity.

---

## 3. Ordering Branches

Reordering the branches so that nodes with more tips are shown towards the bottm of the page (or top) can help better understand the relationships of the nodes. 

The **Order** buttons sort the clades by size:

| Button | Shortcut | Effect |
|---|---|---|
| <img src="images/order_up_button.png" style="width:32px;"/> | ⌘U | Larger clades toward the top |
| <img src="images/order_down_button.png" style="width:32px;"/> | ⌘D | Larger clades toward the bottom |

> [!NOTE]
> Once the tree has been ordered, the original order has been lost and you only have the choice of up or down orders or you can [rotate the nodes manually](#9-rotating-nodes-rotating-nodes).

>  <img src="images/fig3.png" style="width:500px;"/> 
>
> EBOV tree with ascending order applied

---

## 4. Navigating the Tree

There are many ways of quickly navigating the tree which will be useful if the tree is very large.

### Scrolling and Zooming

Firstly you can zoom in and then scroll up and down. You can do this with the mouse/trackpad either using the mouse scroll wheel or a two-fingered drag on the trackpad. Holding the Shift key whilst using the scroll gesture will perform a zoom instead.

| Action | Effect |
|---|---|
| **Scroll** | Pan the tree vertically |
| **⇧ + Scroll** | Zoom in/out, anchored at the mouse position |
| **Pinch** (trackpad) | Zoom in/out |

Arrow keys allow a fine control over the scrolling amount:

- **↑ / ↓** — scroll one row at a time
- **⌘↑ / ⌘↓** — scroll one page at a time

You can also use the toolbar zoom buttons or keyboard shortcuts:

| Button | Shortcut | Action |
|---|---|---|
|<img src="images/zoom_in_button.png" style="width:32px;"/>| **⌘=** | Zoom in (×1.5) |
|<img src="images/zoom_out_button.png" style="width:32px;"/>| **⌘−** | Zoom out (×1.5) |
|<img src="images/show_labels_button.png" style="width:32px;"/>| **⌘⇧0** | Fit Labels — zoom so no tip labels overlap |
|<img src="images/show_all_button.png" style="width:32px;"/>| **⌘0** | Fit the whole tree to the window |

Zoom in until individual tip names are readable or press the Fit Labels button or `⌘⇧0` to do this automatically. 

> <img src="images/fig4.png" style="width:400px;"/>
>
> Tree zoomed in to show a small cluster of tips with readable labels.

Press the Fit all button or **⌘0** to return to the full view.

---

## 5. The Hyperbolic Lens

The hyperbolic lens lets you expand a region of the tree without zooming — the area near the cursor is stretched to label-readable spacing while the rest compresses but remains visible.

### Activating the Lens

Hold **~** (the backtick/tilde key) and move the cursor over the canvas. The tree distorts around the cursor's vertical position.

> <img src="images/fig5.png" style="width:400px;"/>
>
> Lens active: tips near the cursor are spread apart and readable; tips further away are compressed.

The lens **persists** after you release ~ — the focus stays fixed so you can interact with the expanded region normally. Move with ~ held to reposition it.

Press **Escape** to dismiss the lens effect.

### Adjusting the Lens Width

The **Lens:** button pair in the toolbar (or **⌘⇧+** / **⌘⇧−**) controls the size of the uniformly-expanded centre zone:

- Each press of **⊕** adds one extra row of tip-spacing to the flat centre zone.
- Each press of **⊖** removes one row.
- At zero (default) the lens is a pure hyperbolic falloff from the focus point.

The peak magnification is always capped at the *Fit Labels* spacing level, so labels in the expanded zone never overlap.

---

## 6. Selecting Nodes and Tips

PearTree has two selection modes; **Nodes** mode is active by default.

### Nodes Mode

- **Click a tip** — selects that tip; the status bar shows its name and divergence.
- **Click an internal node** — selects all descendant tips; a teal ring marks the MRCA node.
- **⌘-click** — add to or remove from the current selection.
- **⌘A** — select all visible tips.
- **Click empty space** — clears the selection.

You can also click and drag to select all the tips within an area.

In the current view try clicking an internal node near the root of the visible tree.

> <img src="images/fig6.png" style="width:400px;"/>
>
> Several tips selected (highlighted) and MRCA ring visible on an internal node.

### Branches Mode (⌘B)

Press **⌘B** (or click the branch-mode button) to switch to **Branches** mode. Click anywhere along a horizontal branch to place a precise positional marker.

Press **⌘B** again to return to **Nodes** mode.

> [!TIP]
> Branch selection mode is generally used to allow  re-rooting of a tree. However, as the example tree is a rooted, time-calibrated tree, re-rooting is disabled. See [Appendix](#appendix-rerooting-the-tree-rerooting) for information about re-rooting an unrooted tree.

---

## 7. Subtree Navigation

PearTree has some useful functions for 'drilling-down' into parts of the tree to view subtrees and clades and then easily return back to the previous view. 

**Double-click** any internal node to zoom into its subtree. Or select a node and press the `drill-down` button <img src="images/drill_down_button.png" style="width:32px;"/>. The canvas re-renders showing only the descendants of that node.

> <img src="images/fig7a.png" style="width:400px;"/>
>
> <img src="images/fig7b.png" style="width:400px;"/>
>
> A sub-clade of the EBOV tree filling the full canvas after double-clicking.

PearTree stores a history of the parts of the tree you visit. **Double-click** on the root node of the subtree (or use the `back` button <img src="images/back_button.png" style="width:32px;"/>) to go back to your previous view.

Use the **History** buttons in the toolbar (or **⌘[** / **⌘]**) to navigate back and forward through your drill-down history.

| Button | Shortcut | Effect |
|---|---|---|
|<img src="images/drill_down_button.png" style="width:32px;"/>| `⌘⇧>` | Drill-down into the selected subtree |
|<img src="images/back_button.png" style="width:32px;"/>| `⌘[` | Go back through the drill-down history |
|<img src="images/forward_button.png" style="width:32px;"/>| `⌘]` | Go forward through the drill-down history |
|<img src="images/climb_up_button.png" style="width:32px;"/>| `⌘⇧<` | Climb up one node towords the root |

---

## 8. Rotating Nodes

By 'rotating' a node we mean putting the bottom branch at the top and the top branch at the bottom. This changes the visual layout of the tree but doesn't change the actual phylogeny or what it means. You can also rotate or flip an entire clade. Rotating a node will undo the 'Branch Ordering' [described above](#branch-ordering) and these buttons will become unselected. 

To rotate an internal node, select a node and then use the **Rotate** buttons:

| Button | Effect |
|---|---|
| <img src="images/rotate_branch_button.png" style="width:32px;"/> | Reverses the direct children of the selected node |
| <img src="images/rotate_clade_button.png" style="width:32px;"/> | Recursively reverses children at every level in the selected subtree |

> <img src="images/fig8a.png" style="width:400px;"/>
>
> <img src="images/fig8b.png" style="width:400px;"/>
>
> <img src="images/fig8c.png" style="width:400px;"/>
>
> Before and after rotating a branch: one branch (`EBOV|EM_COY_2015_017865||GIN|Dubreka|2015-06-18`) swaps position. In the bottom image, the entire clade has been 'rotated'.

---

## 9. Hiding and Showing Subtrees

Hiding removes a node and all of its descendants from the tree layout entirely — they simply disappear from the canvas and the remaining tree reflows to fill the space. This is useful for focusing on a subset of the tree without changing the underlying data.

### Hiding a Single Tip Branch

1. Select a tip node.
2. Click the **Hide** button (eye-slash icon) in the toolbar.

The selected tip is removed from the view and the visible tree rescales. The tip count shown elsewhere (e.g. in Node Info) reflects only the still-visible tips.

> <img src="images/fig9a.png" style="width:400px;"/>
>
> <img src="images/fig9b.png" style="width:400px;"/>
>
> A section of the tree before and after hiding a selected tip (`EBOV|CON12930||GIN|Conakry|2015-10-13`).

### Hiding a Subtree

1. Select an internal node (its descendant tips will be highlighted).
2. Click the **Hide** button (eye-slash icon) in the toolbar.

The selected node and all its descendants are hidden in the tree and removed from the view. 

> <img src="images/fig9b.png" style="width:400px;"/>
>
> <img src="images/fig9c.png" style="width:400px;"/>
>
> A section of the tree with a node and its descendents selected and after this node has been hidden.

### Showing Hidden Nodes

To restore hidden nodes:

- **With a node selected** — select the parent node (the branch stub where the hidden subtree was attached) and click **Show** (eye icon). The hidden descendants of that node are restored.
- **With nothing selected** — click **Show** with no selection to reveal *all* hidden nodes in the current view at once.

> **Note:** Hiding changes the visible tip count, so any active branch ordering (ascending/descending) is automatically cleared when you hide or show nodes.

---

## 10. Node Info (⌘I)

Select any node or tip, then press **⌘I** or click the <img src="images/get_info_button.png" style="width:32px;"/> button. A dialog lists every annotation on that node — name, divergence, branch length, any BEAST posterior values, or any custom annotations you have imported.

> <img src="images/fig10.png" style="width:400px;"/>
>
> Node Info dialog showing the selected tip's name, divergence, and annotation fields.

---

## 11. Importing Annotations

The EBOV example has some annotations embedded in the tree file. To add extra per-tip metadata from your own CSV or TSV:

- Click the <img src="images/load_annotations_button.png" style="width:32px;"/> button (or press **⌘⇧A**).

- **Step 1** — Drag a CSV/TSV onto the drop zone or click *Choose File*.

> <img src="images/fig11a.png" style="width:300px;"/>
>
> Import Annotations dialog, Step 1 (file-pick drop zone).

- **Step 2** — Select which column contains the taxon name, tick the columns to import.

> <img src="images/fig11b.png" style="width:300px;"/>
>
> Import configuration dialog showing column checkboxes and preview rows.

- Click **Import**. A summary reports how many tips matched.

> <img src="images/fig11c.png" style="width:300px;"/>
>
> Import summary dialog box.

After import the new annotation keys appear in all *Colour by* dropdowns and the *Legend* selector.

---

## 12. Colouring the Tree by Annotation

Open the **Visual Options palette** (press **Tab** or click the sliders button).

### Colouring Tip Shapes by Annotation

Under **Tip Shapes**, change **Colour by** from *user colour* to an annotation key (e.g. `location` if present in the EBOV tree).

> **📸 SCREENSHOT PLACEHOLDER** — Tip shapes coloured by the `location` annotation; each unique value has a distinct colour.

### Colouring Tip Labels by Annotation

Under **Tip Labels**, change **Colour by** to the same annotation. Labels now match the colours of their shapes.

> **📸 SCREENSHOT PLACEHOLDER** — Tip labels coloured to match tip shapes.

### Colouring Internal Nodes

Under **Node Shapes**, change **Colour by** to an annotation. Internal node circles inherit the colour of the annotation value inferred or stored at that node.

---

## 13. Adding a Legend

In the **Visual Options palette**, scroll to the **Legend** section:

1. Set **Show** to *Left* or *Right*.
2. Set **Annotation** to the key whose colour scale you want to display.

A colour key strip appears at the chosen edge of the canvas.

> **📸 SCREENSHOT PLACEHOLDER** — EBOV tree with a colour legend strip on the right, labelling the `location` annotation colour scale.

---

## 14. Applying a User Colour

1. Select one or more tips.
2. Click the colour swatch in the toolbar to pick a colour.
3. Click the **Apply** button (paint bucket icon) — those tips are marked with that colour.

> **📸 SCREENSHOT PLACEHOLDER** — A handful of tips highlighted in bright orange with the user colour.

User colours are stored as a `user_colour` annotation and can be used in the *Colour by* dropdowns like any other annotation. They round-trip through NEXUS export and re-import.

To remove all user colours, click the **Clear** (eraser) button next to the swatch.

---

## 15. The Time Axis

If the tree file contains node-height annotations (e.g. a BEAST MCC tree with `height` values) and tip dates, an **Axis** section appears in the Visual Options palette.

1. Set **Show** to *On*.
2. Set **Date annotation** to the annotation key holding calendar dates (e.g. `date`).
3. Adjust **Major ticks**, **Minor ticks**, and label formats as needed.

> **📸 SCREENSHOT PLACEHOLDER** — EBOV tree with a time axis along the bottom calibrated to calendar year; major tick labels in `yyyy` format.

---

## 16. Themes and Visual Customisation

The **Theme** section at the top of the Visual Options palette provides quick preset starting points:

| Theme | Description |
|---|---|
| **Artic** | Dark teal background, warm cream labels |
| **Gytis** | White background, black branches |

Changing any individual control (background, branch colour, font size, etc.) switches the selector to *Custom*. Click **Store** to save a named personal theme.

> **📸 SCREENSHOT PLACEHOLDER** — Visual Options palette open on the Theme section with the *Gytis* theme applied; tree rendered on a white background.

### Key Palette Controls

| Section | Control | What it does |
|---|---|---|
| **Canvas** | Background | Canvas background colour |
| **Canvas** | Branches | Branch line colour |
| **Canvas** | Branch width | Stroke thickness (0.5–8 px) |
| **Tip Labels** | Size | Font size (6–20 pt) |
| **Tip Shapes** | Size | Tip circle radius (0 = hidden) |
| **Tip Shapes** | Bg size | Halo radius behind each tip |
| **Node Shapes** | Size | Internal node circle radius |

Click **Reset to defaults** at the bottom of the palette to restore the *Artic* theme.

---

## 17. Exporting the Tree

Click the **↓ file** button (or press **⌘S**) to save the tree.

- **Format** — *NEXUS* (supports annotations and embedded settings) or *Newick* (plain, portable)
- **Scope** — *Entire tree* or *Current subtree view*
- **Annotations** — checkboxes to include or exclude each annotation key
- **Embed settings** (NEXUS only) — ticking this embeds all current visual settings in the file so the appearance is restored automatically when the file is reopened

> **📸 SCREENSHOT PLACEHOLDER** — Export Tree dialog showing NEXUS format selected, two annotation keys checked, and *Embed settings* ticked.

---

## 18. Exporting a Graphic

Click the **image** button (or press **⌘E**) to download an image.

| Setting | Options |
|---|---|
| **Format** | **SVG** (vector, infinitely scalable) or **PNG** (raster at 2× resolution) |
| **View** | **Current view** (the visible portion) or **Full tree** (the complete height) |

SVG exports include branches, labels, shapes, legend strips, and the time axis as true vectors — ideal for publication figures.

> **📸 SCREENSHOT PLACEHOLDER** — Export Graphic dialog; SVG and Full tree selected.

---

## 19. Settings Persistence

PearTree automatically saves all visual settings to browser **localStorage** and restores them on your next visit. This includes theme, palette values, colour-by choices, legend, axis configuration, branch order, and selection mode.

When you export a NEXUS file with **Embed settings** ticked, those settings travel with the file. Opening that file in PearTree restores the full appearance automatically.

---

## Quick-Reference: Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **⌘O** | Open file picker |
| **⌘⇧O** | Open Tree dialog |
| **⌘⇧A** | Import annotations |
| **⌘S** | Export tree |
| **⌘E** | Export graphic |
| **Tab** | Toggle Visual Options palette |
| **⌘=** / **⌘+** | Zoom in |
| **⌘−** | Zoom out |
| **⌘0** | Fit all |
| **⌘⇧0** | Fit labels |
| **⌘A** | Select all tips |
| **⌘B** | Toggle Nodes / Branches mode |
| **⌘D** | Order ascending |
| **⌘U** | Order descending |
| **⌘M** | Midpoint root |
| **⌘I** | Node info |
| **⌘[** | Navigate back |
| **⌘]** | Navigate forward |
| **~** (hold) | Activate hyperbolic lens at cursor |
| **⌘⇧+** | Expand lens area |
| **⌘⇧−** | Contract lens area |
| **Escape** | Dismiss lens / close dialog / clear selection |

> On Windows and Linux replace **⌘** with **Ctrl**.


## Appendix: Rerooting the Tree

Re-rooting of trees is not possible for trees that are explicitly rooted (generally determined by whether they have annotations for the root node). This will be the case for time calibrated trees from BEAST, for example. If the tree is not explicitly rooted then some options for changing the root position will be available.

### Midpoint Root (⌘M)

Press **⌘M** (or click **Midpoint** in the toolbar) to automatically root the tree at the midpoint of its longest path. This is a common starting point for exploratory analysis.

> **📸 SCREENSHOT PLACEHOLDER** — EBOV tree after midpoint rerooting; root is repositioned.

### Rerooting at a Selection

1. Select a tip or a group of tips (their MRCA defines the branch).
2. Click the **Reroot** button — the root is placed at the midpoint of the branch above the MRCA.

### Rerooting at an Exact Branch Position

1. Press **⌘B** to enter **Branches** mode.
2. Click precisely where you want the new root on any branch.
3. Click **Reroot**.

> **📸 SCREENSHOT PLACEHOLDER** — Branch mode with marker placed near the base of a clade; tree after rerooting at that position.

---

