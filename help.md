# PearTree Help

PearTree is a phylogenetic tree viewer that runs entirely in the browser. 
---

## Interface Overview

The interface has four main areas:

- **Toolbar** — buttons for navigation, interaction, and tree modification
- **Visual Options palette** — pop-out panel on the left with display controls (toggle with **Tab** or the sliders button)
- **Canvas** — the tree drawing, which fills the remaining space
- **Status bar** — live readout of values under the mouse cursor

---

## Opening a Tree File

Click the **folder icon** (or press **⌘O**) to open the *Open Tree File* dialog. Three tabs are available:

| Tab | Description |
|---|---|
| **File** | Drag-and-drop a file onto the drop zone, or click *Choose File* to browse |
| **URL** | Enter a direct URL to a NEXUS or Newick file |
| **Example** | Load the built-in Ebola virus (EBOV) example tree |

Supported formats: **NEXUS** (`.nex`, `.nexus`, `.tre`, `.tree`) and **Newick** (`.nwk`, `.newick`).

---

## Toolbar Buttons

### Navigation

| Button | Shortcut | Description |
|---|---|---|
| **folder** | ⌘O | Open the *Open Tree File* dialog |
| **‹** back | ⌘[ | Navigate back to the parent subtree |
| **›** forward | ⌘] | Navigate forward in the subtree history |

### Zoom & Fit

| Button | Shortcut | Description |
|---|---|---|
| **⊕** zoom in | ⌘= | Zoom in vertically (1.5× step) |
| **⊖** zoom out | ⌘− | Zoom out vertically (1.5× step) |
| **⛶** fit all | ⌘0 | Fit the entire tree to the window |
| **T** fit labels | ⌘⌥0 | Zoom so that tip labels no longer overlap |

### Branch Order

Reorders branches post-order by clade size:

| Button | Shortcut | Description |
|---|---|---|
| **↑** ascending | ⌘D | Larger clades toward the bottom |
| **↓** descending | ⌘U | Larger clades toward the top |

### Selection Mode

| Button | Shortcut | Description |
|---|---|---|
| **○** Nodes | ⌘N | Select tips and internal nodes by clicking |
| **⌒** Branches | ⌘B | Click a branch to place a root marker |

### Reroot

The **Reroot** button becomes active whenever a selection can define a new root:

### Midpoint Root

The **Midpoint Root** button (⌘M) is always available once a tree is loaded. It automatically finds the two tips with the greatest path length between them (the tree diameter) and places the new root at the exact midpoint of that path.

- **Nodes mode — single tip selected**: roots at the midpoint of the branch above that tip
- **Nodes mode — two or more tips selected**: roots at the midpoint of the branch above the MRCA of the selected tips
- **Branches mode — branch marker placed**: roots at the exact clicked position on that branch

### Visual Options

The **sliders icon** (or **Tab**) opens the *Visual Options* palette on the left side of the screen.

### Help

The **?** button opens this help panel.

---

## Mouse & Trackpad

| Action | Effect |
|---|---|
| **Scroll** | Pan the tree vertically |
| **⌥ + Scroll** | Zoom vertically, anchored at the mouse position |
| **Ctrl + Scroll / Pinch** | Zoom in and out (pinch-to-zoom on trackpad) |
| **Click** (Nodes mode) | Select a tip or internal node |
| **⌘/Ctrl + Click** | Add or remove a tip from the selection |
| **Double-click** (Nodes mode) | Navigate into the subtree rooted at that node |
| **Click** (Branches mode) | Place a branch-point marker on a branch |
| **Hover** | Highlight nodes or branches and update the status bar |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **⌘O** | Open tree file dialog |
| **⌘N** | Switch to Nodes selection mode |
| **⌘B** | Switch to Branches selection mode |
| **⌘M** | Midpoint root the tree |
| **⌘=** / **⌘+** | Zoom in |
| **⌘−** | Zoom out |
| **⌘0** | Fit all |
| **⌘⌥0** | Fit labels |
| **⌘D** | Reorder branches ascending |
| **⌘U** | Reorder branches descending |
| **⌘[** | Navigate back |
| **⌘]** | Navigate forward |
| **Tab** | Toggle the Visual Options palette |
| **Escape** | Close the Visual Options palette or Help panel |

---

## Selection Modes

### Nodes mode (⌘N)

- **Click a tip** — selects that tip; the status bar shows its name and divergence
- **Click an internal node** — selects all descendent tips and highlights the MRCA with a teal ring
- **⌘-click** — adds or removes tips from the current selection
- **Click empty space** — clears the selection
- With one or more tips selected, the **Reroot** button becomes active

### Branches mode (⌘B)

- **Click anywhere on a horizontal branch** — places a marker at exactly that position
- The **Reroot** button becomes active when a marker is placed
- Switching back to Nodes mode clears the branch marker

---

## Rerooting the Tree

**Using Nodes mode:**
1. Select a single tip or a set of tips (their MRCA defines the branch)
2. Click **Reroot** — the new root is placed at the midpoint of the branch above the selected node or MRCA

**Using Branches mode:**
1. Switch to **Branches** mode (**⌘B**)
2. Click on any branch to place a marker at the desired position
3. Click **Reroot** — the root is placed at exactly the clicked position

After rerooting, the navigation history is cleared and the full rerooted tree is displayed.

---

## Subtree Navigation

- **Double-click** an internal node in **Nodes** mode to zoom into that subtree
- Use **‹** (**⌘[**) to return to the parent view
- Use **›** (**⌘]**) to move forward through the navigation history
- Navigation history is preserved across reorderings but cleared on reroot

---

## Visual Options Palette

Toggle with **Tab** or the sliders button in the toolbar. Close with **Tab**, **Escape**, or the × button.

| Control | Description |
|---|---|
| **Label Size** | Adjusts the font size of tip labels |
| **Node Size** | Adjusts the radius of tip circles |

---

## Status Bar

The status bar at the bottom shows live information about the node or branch position under the mouse cursor:

| Field | Description |
|---|---|
| **Div** | Cumulative divergence from the root to this node |
| **Tips** | Number of tip descendants (or count of selected tips when a selection is active) |
| **Dist** | Branch length of the hovered node (distance from its parent) |
| **Height** | Node height (for time-trees with dated tips) |
| **Length** | Position along the branch at the current mouse position |

---

## Data Format

PearTree reads **NEXUS** files containing one or more tree blocks, and bare **Newick** strings. Branch lengths, taxon names, and square-bracket node annotations are all parsed automatically. The first tree in the file is displayed.
