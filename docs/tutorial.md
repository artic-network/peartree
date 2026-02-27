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

> <img src="images/fig9c.png" style="width:400px;"/>
>
> <img src="images/fig9d.png" style="width:400px;"/>
>
> A section of the tree with a node and its descendents selected and after this node has been hidden.

### Showing Hidden Nodes

To restore hidden nodes:

- **With a node selected** — select the parent node (the branch stub where the hidden subtree was attached) and click <img src="images/unhide_button.png" style="width:32px;"/> (**Show** ). The hidden descendants of that node are restored.
- **With nothing selected** — click click <img src="images/unhide_button.png" style="width:32px;"/> (**Show** ) with no selection to reveal *all* hidden nodes in the current view at once.

> **Note:** Hiding changes the visible tip count, so any active branch ordering (ascending/descending) is automatically cleared when you hide or show nodes.

---

## 10. Node Info (⌘I)

Select any node or tip, then press **⌘I** or click the <img src="images/get_info_button.png" style="width:32px;"/> button. A dialog lists every annotation on that node — name, divergence, branch length, any posterior support values, or any custom annotations you have imported.

> <img src="images/fig10.png" style="width:400px;"/>
>
> Node Info dialog showing the selected tip's name, divergence, and annotation fields.

---

## 11. Importing Annotations

The EBOV example has some annotations embedded in the tree file. These were put there by BEAST during the construction of the tree. To add extra per-tip metadata from your own CSV or TSV:

- Click the <img src="images/load_annotations_button.png" style="width:32px;"/> button (or press **⌘⇧A**).

- **Step 1** — Drag a CSV/TSV onto the drop zone or click *Choose File*.

> <img src="images/fig11a.png" style="width:300px;"/>
>
> Import Annotations dialog, Step 1 (file-pick drop zone).

> **Note** this dialog box will only appear if running PearTree on a web server - for the desktop app, a native file chooser will appear for you to select the file.

- **Step 2** — Select which column in the metadata file is going to be used to match the tip labels in the tree. By default PearTree will try to match the entire tip label but if the labels are made up of 'fields' separated by the `|` (pipe) character then you can choose which is the field to match. For the example data it is the `lab-id` in the second field.

> <img src="images/fig11b.png" style="width:300px;"/>
>
> Import configuration dialog showing column checkboxes and preview rows.

- Click **Import**. A summary reports how many tips matched.

> <img src="images/fig11c.png" style="width:300px;"/>
>
> Import summary dialog box. This confirms that all 1610 tips of the tree were matched with a row in the metadata file annotated with the required columns.

After import the new annotation keys appear in all *Colour by* dropdowns and the *Legend* selector. They will also appear in the *Get Info* dialog box for selected tips.

---

## 12. Colouring the Tree by Annotation

Open the **Visual Options palette** (press **Tab** or click the sliders button).

### Colouring Tip Shapes by Annotation

Under **Tip Shapes**, change **Colour by** from *user colour* to an annotation key (e.g. `country` if present in the EBOV tree).

> <img src="images/fig12a.png" style="width:250px;"/>
>
> The controls for setting the tip shape styles with **Colour by** set to `country`.

The result will be that the dots on the tips of the will be given a distinct colour depending on the unique country designation.

> <img src="images/fig12b.png" style="width:400px;"/>
>
> Tip shapes coloured by the `location` annotation; each unique value has a distinct colour.

Try changing the `Palette` to give alternative colour schemes.

### Colouring Tip Labels by Annotation

You can also have the tip labels coloured by an annotation (the same as the tip shapes or something different)

Under **Tip Labels**, change **Colour by** to the `country`. The tip labels now match the colours of their shapes.

### Colouring Internal Nodes

Internal node's can also have circles which can be coloured by annotation values. By default these may not be visible so under the **Node Shapes** section of the Tool Drawer, increase the size to change **Colour by** to `posterior`. Internal nodes will only have annotations if they were encoded in the tree -- in this tree Bayesian posterior support values have been supplied using the label `posterior`.

> <img src="images/fig12c.png" style="width:250px;"/>
>
> The controls for setting the node shape styles with **Colour by** set to `posterior` and **Palette** set to `Blue-Black-Red`. The size has also been increased to `3` to make the shapes visible. 

The `posterior` annotation is a real number between 0 and 1 so will be given a gradient of colours across its possible values. There is a selection of colour palettes to chose from but with these types of support values -- support values such as posterior or bootstrap values -- a three colour palette such as `Blue-Black-Red` will work best because it means that red colours are >0.5 and blue colours are <0.5. 

> <img src="images/fig12d.png" style="width:400px;"/>
>
> Node shapes coloured by the `posterior` annotation. Tip shapes have been hidden for clarity. The more red the colour, the closer the value is to 1.0 (high support) and the more blue, the closer the value is to 0.0 (low support).

---

## 13. Adding a Legend

For a selected annotation used to colour some feature of the tree, you can also display a legend to provide a scale or key for what the colours mean.

In the **Visual Options palette**, scroll to the **Legend** section:

1. Set **Show** to *Left* or *Right* -- which side of the screen you want it.
2. Set **Annotation** to the key whose colour scale you want to display.

The legend that is display will depend on whether the annotation is a real number or categorical.

> <img src="images/fig13.png" style="width:400px;"/>
>
> EBOV tree with tips coloured by `country` and a legend on the right providing a key linking the colours to the countries.

---

## 14. Applying a User Colour

You can also manually colour tips with individual colours. First pick a colour using the colour picker in the main tool bar:

> <img src="images/colour_picker.png" style="width:250px;"/>

Then select one or more tips. You can do this by clicking on them or using the filter box to select tips with a particular string in their tip labels.

3. Click the **Apply** button <img src="images/paint_button.png" style="width:32px;"/> —- the selected tips are then marked with that colour.

> <img src="images/fig14.png" style="width:400px;"/>
>
> Tips dated from July to September 2015 highlighted in bright orange.

User colours are stored as a `user_colour` annotation and can be used in the *Colour by* dropdowns like any other annotation. They can also be stored in exported trees when saved in NEXUS format.

To remove all user colours, click the **Clear** <img src="images/eraser_button.png" style="width:32px;"/> button next to the swatch. This will remove all user colours from the selected tips or if none are selected from the displayed tree.

---

## 15. The Time Axis

If the tree file contains node-height annotations (e.g. a BEAST MCC tree with `height` values) and tip dates, an **Axis** section appears in the Visual Options palette.

1. Set **Show** to *On*.
2. Set **Date annotation** to the annotation key holding calendar dates (e.g. `date`).
3. Adjust **Major ticks**, **Minor ticks**, and label formats as needed.

> <img src="images/fig15.png" style="width:250px;"/>
>
> EBOV tree with a time axis along the bottom calibrated to calendar year; major tick labels in `yyyy` format.

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

## Appendix: The control drawer

> <img src="images/controls_tip_shapes.png" style="width:250px;"/>
>
> The controls in the tool drawer that set options for the tips of the tree.

> <img src="images/controls_tip_labels.png" style="width:250px;"/>
>
> The controls in the tool drawer that set options for the tips of the tree.

