# PearTree Help

PearTree is a phylogenetic tree viewer that runs entirely in the browser. Load a NEXUS or Newick tree file, explore its structure, reorder branches, navigate into subtrees, and reroot the tree — all without leaving the page.

---

## Interface Overview

The interface has three main areas:

- **Menu bar** — application menus for tree-level operations
- **Toolbar** — buttons and controls for navigation, display, and interaction mode
- **Canvas** — the tree drawing, which fills the remaining space
- **Status bar** — live readout of values under the mouse cursor

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **⌘N** | Switch to **Nodes** selection mode |
| **⌘B** | Switch to **Branches** selection mode |
| **⌘D** | Reorder branches — tips-down (descending clade size) |
| **⌘U** | Reorder branches — tips-up (ascending clade size) |
| **⌘[** | Navigate **back** (zoom out to parent subtree) |
| **⌘]** | Navigate **forward** (return to previous subtree) |

---

## Mouse & Trackpad

| Action | Effect |
|---|---|
| **Scroll** | Pan the tree vertically |
| **⌥ + Scroll** | Zoom vertically, anchored at the mouse position |
| **Ctrl + Scroll / Pinch** | Zoom in and out (standard pinch-to-zoom) |
| **Click** (Nodes mode) | Select a tip or internal node |
| **Double-click** (Nodes mode) | Navigate into the subtree rooted at a node |
| **Click** (Branches mode) | Place a branch selection marker on a branch |
| **Hover** | Highlight nodes or branches and update the status bar |

---

## Selection Modes

Switch modes with the **Select: Nodes / Branches** button group in the toolbar, or with **⌘N** / **⌘B**.

### Nodes mode (⌘N)

- **Click a tip** — selects that tip; the status bar shows its name and divergence
- **Click an internal node** — selects all tips descended from that node and highlights the MRCA node with a teal ring; the status bar shows the tip count
- **Click empty space** — clears the current selection

### Branches mode (⌘B)

- **Click anywhere on a horizontal branch** — places a branch-point marker at exactly that position along the branch
- The marker is displayed as a teal ring (matching the MRCA node style)
- The **Reroot** button becomes active when a branch is selected
- Switching back to Nodes mode clears the branch selection

---

## Toolbar Buttons

| Button | Shortcut | Description |
|---|---|---|
| **‹** | ⌘[ | Navigate back to the parent subtree |
| **›** | ⌘] | Navigate forward to the previously visited subtree |
| **Fit all** | | Fit the entire tree to the window |
| **Fit labels** | | Fit so that tip labels are fully visible |
| **Reroot** | | Reroot the tree at the selected branch point (enabled only when a branch is selected) |
| **Nodes** | ⌘N | Switch to Nodes selection mode |
| **Branches** | ⌘B | Switch to Branches selection mode |

### Sliders

| Slider | Effect |
|---|---|
| **Label** | Adjusts the font size of tip labels |
| **Node** | Adjusts the radius of tip circles |

---

## Node Order Menu

The **Node order** menu in the menu bar reorders branches post-order by clade size:

| Item | Shortcut | Effect |
|---|---|---|
| **Up** | ⌘D | Larger clades rendered toward the bottom (tips-down) |
| **Down** | ⌘U | Larger clades rendered toward the top (tips-up) |

Reordering animates smoothly. Order is preserved after rerooting.

---

## Rerooting the Tree

1. Switch to **Branches** mode (**⌘B**)
2. Click on any branch to place a marker at the desired root position
3. Click **Reroot** in the toolbar

The tree is rerooted at that exact point along the branch (the new root lies on that branch at the clicked position). The display resets to show the full rerooted tree, and branch ordering (if active) is reapplied automatically.

---

## Subtree Navigation

- **Double-click** an internal node in **Nodes** mode to zoom into that subtree
- Use **‹** (**⌘[**) to return to the parent view
- Use **›** (**⌘]**) to move forward again through the navigation history
- **Fit all** resets the view to the full tree extent at any time

---

## Status Bar

The status bar at the bottom of the window shows information about the node or branch position currently under the mouse cursor:

| Field | Description |
|---|---|
| **Div** | Cumulative divergence from the root to this node |
| **Tips** | Number of tip descendants (or selected tips when a selection is active) |
| **Dist** | Branch length of the hovered node (distance from its parent) |
| **Height** | Node height (used for time-trees with dated tips) |
| **Length** | Length of the branch at the current mouse position along the horizontal axis |

---

## Data Format

PearTree reads **NEXUS** files containing one or more tree blocks. Newick strings embedded within NEXUS are supported. Branch lengths, taxon names, and node annotations (square-bracket format) are parsed automatically.

The file currently loaded is shown in the top-right of the menu bar.
