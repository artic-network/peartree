# Sealion Instructions

Sealion is an interactive alignment viewer for visualizing and analyzing nucleotide sequence alignments.

## Keyboard Shortcuts Reference

| Shortcut | macOS | Windows/Linux | Action |
|----------|-------|---------------|--------|
| **Navigation** ||||
| Arrow keys | ← → ↑ ↓ | ← → ↑ ↓ | Move one column/row at a time |
| Alt + Arrow keys | ⌥ + ← → ↑ ↓ | Alt + ← → ↑ ↓ | Page scroll (viewport width/height) |
| Shift + Left/Right | ⇧ + ← → | Shift + ← → | Jump to leftmost/rightmost extent |
| Shift + Up/Down | ⇧ + ↑ ↓ | Shift + ↑ ↓ | Jump to top/bottom extent |
| **Difference Navigation** ||||
| Next difference | ⌘ + > | Ctrl + > | Jump to next difference from reference |
| Previous difference | ⌘ + < | Ctrl + < | Jump to previous difference from reference |
| **View Controls** ||||
| Toggle color differences | ⌘ + D | Ctrl + D | Show only differences from reference |
| Toggle hide mode | ⌘ + H | Ctrl + H | Hide collapsed regions with markers |
| Reset font size | ⌘ + 0 | Ctrl + 0 | Reset to default font size |
| Increase font size | ⌥⌘ + = | Alt+Ctrl + = | Increase font size |
| Decrease font size | ⌥⌘ + - | Alt+Ctrl + - | Decrease font size |
| **Column Operations** ||||
| Collapse columns | ⌘ + - | Ctrl + - | Collapse selected columns |
| Expand columns | ⌘ + = | Ctrl + = | Expand selected columns |
| **Selection** ||||
| Select all columns | ⌘ + A | Ctrl + A | Select all alignment columns |
| Multi-select | ⌘ + click | Ctrl + click | Add/remove sequences or columns |
| Copy selection | ⌘ + C | Ctrl + C | Copy selected sequences/region as FASTA to clipboard |
| Copy labels only | ⇧⌘ + C | Shift+Ctrl + C | Copy selected sequence labels as plain text (one per line) |
| **Sequence Reordering** ||||
| Move sequences up | ⌘ + ↑ | Ctrl + ↑ | Move selected sequences up one position |
| Move sequences down | ⌘ + ↓ | Ctrl + ↓ | Move selected sequences down one position |
| Drag sequences | ⌥⌘ + drag label | Alt+Ctrl + drag label | Drag sequences to new position |
| **Search** ||||
| Next search match | ⌘ + G | Ctrl + G | Go to next search match |
| Execute search | Enter | Enter | Perform search or go to next match |
| Previous search match | ⇧ + Enter | Shift + Enter | Go to previous search match |
| **Other** ||||
| Pan view | Space + drag | Space + drag | Click and drag to pan the view |

## Overview

The interface consists of:
- **Toolbar** - Controls for font size, column collapse/expand, coloring, sorting, and search
- **Alignment view** - Main canvas showing sequences with labels on the left
- **Header** - Position numbers and consensus sequence
- **Overview panel** - Minimap showing the entire alignment

## Navigation

### Mouse Controls

- **Click and drag on canvas** - Rectangle selection of nucleotides
- **Double-click on canvas** - Select horizontal run of same character type (gaps, Ns, or nucleotides), then drag vertically to extend to other sequences
- **Space + drag** - Pan the alignment view
- **Scroll wheel** - Vertical scrolling through sequences
- **Shift + scroll wheel** - Horizontal scrolling through positions
- **Click on label** - Select a sequence
- **Cmd+click (Ctrl+click)** - Add/remove sequences from selection
- **Click on header** - Select a column
- **Option+Command+drag label** (Alt+Ctrl+drag) - Drag sequences to reorder
- **Drag label divider** - Resize the label column width

### Keyboard Shortcuts

#### Navigation
- **Arrow keys** - Move one column/row at a time through the alignment
- **Alt+Arrow keys** - Page scroll (move by viewport width/height)
- **Shift+Left/Right** - Jump to leftmost/rightmost extent of alignment
- **Shift+Up/Down** - Jump to top/bottom extent of alignment

#### View Controls
- **Cmd+0** (Ctrl+0) - Reset font size to default
- **Cmd+D** (Ctrl+D) - Toggle colour differences mode on/off
- **Cmd+H** (Ctrl+H) - Toggle hide mode (collapsed regions hidden with markers)

#### Difference Navigation
- **Cmd+<** (Ctrl+<) - Jump to previous difference from reference
- **Cmd+>** (Ctrl+>) - Jump to next difference from reference
  - Selects the column and centers it horizontally
  - When rows are selected, only checks those sequences for differences
  - When no rows selected, checks all sequences and scrolls to first difference
  - Ignores 'N' and '-' characters

#### Column Operations
- **Cmd+-** (Ctrl+-) - Collapse selected columns
- **Cmd+=** (Ctrl+=) - Expand selected columns

#### Search
- **Cmd+G** (Ctrl+G) - Go to next search match
- **Enter** - Perform search or go to next match
- **Shift+Enter** - Go to previous search match

## Toolbar Features

### Font Size Controls

- **Zoom In** <i class="bi bi-zoom-in"></i> - Increase font size for better readability
- **Zoom Out** <i class="bi bi-zoom-out"></i> - Decrease font size to see more at once
- **Cmd+0** - Reset to default font size

### Column Collapse/Expand

Compress or expand columns to focus on variable sites or save screen space.

- **Collapse** <i class="bi bi-arrows-collapse"></i> - Collapse selected columns to 1px width
- **Expand** <i class="bi bi-arrows-expand"></i> - Restore selected columns to full width
- **Hide Mode** <i class="bi bi-eye-slash"></i> - Toggle hide mode (Cmd+H)
  - When enabled, collapsed regions are reduced to near-zero width
  - A pale grey marker (4px wide) is shown at the center of each collapsed region
  - This provides maximum space for viewing variable sites while maintaining context

#### Collapse Presets

Use the dropdown menu to quickly collapse common patterns:

- **Constant sites** - Collapse all positions where all sequences have the same nucleotide (A, C, G, T, or U only)
- **Constant (allow N)** - Collapse constant sites, treating ambiguous 'N' as matching any nucleotide
- **Constant (allow N & -)** - Collapse constant sites, treating both 'N' and gap '-' as matching
- **Expand all** - Restore all columns to full width
- **Collapse all** - Collapse all columns to minimum width

**Note:** Collapse operations are cumulative. Each preset ANDs with the current mask, so sites already collapsed stay collapsed.

### Difference Navigation

Quickly jump between sites that differ from the reference sequence:

- **Previous difference** <i class="bi bi-arrow-left-circle"></i> - Jump to the previous column with a difference (Cmd+<)
- **Next difference** <i class="bi bi-arrow-right-circle"></i> - Jump to the next column with a difference (Cmd+>)

When navigating differences:
- The column with the difference is selected and centered horizontally
- If one or more rows are selected, only those sequences are checked for differences
- If no rows are selected, all sequences are checked and the view scrolls to the first differing row
- 'N' (ambiguous) and '-' (gap) characters are ignored when finding differences
- A reference sequence must be set first (use "Set consensus as reference" or "Set selected as reference")

### Colour Controls

Control how nucleotides are colored in the alignment.

- **Colour all sites** - Show nucleotide colors at all positions
- **Colour differences only** - Show colors only where sequences differ from the reference
  - If no reference is set, the consensus sequence is used automatically
  - Toggle this mode quickly with **Cmd+D** (Ctrl+D)
- **Set selected as reference** - Use the currently selected sequence as the reference for difference coloring
- **Set consensus as reference** - Use the consensus sequence (most common nucleotide at each position) as the reference

#### Color Scheme

- **A** - Green
- **C** - Blue  
- **G** - Yellow/Gold
- **T/U** - Red
- **N** - Gray (ambiguous)
- **-** - White/Light gray (gap)

### Sort Controls

Reorder sequences using various criteria:

- **Original order** - Restore the original input order
- **Sort by label (A→Z / Z→A)** - Alphabetical by sequence name
- **Sort by selected column (A→Z / Z→A)** - Alphabetical by nucleotide at the selected position
  - Select a column first by clicking on the header
- **Sort by start position (0→N / N→0)** - Order by where each sequence begins (useful for aligned reads)
- **Sort by sequence length (short→long / long→short)** - Order by total sequence length

### Search

Use the search box to find sequences by label name:

1. Type a query in the search box
2. Press **Enter** or click the search button to find matches
3. Press **Enter** again or **Cmd+G** to go to the next match
4. Press **Shift+Enter** to go to the previous match
5. The view will automatically scroll to show each match
6. Modifying the search query clears previous results

## Selection

### Row Selection (Sequences)

- **Click** a label to select that sequence
- **Cmd+click** (Ctrl+click) to add/remove from selection
- **Click and drag** on labels for range selection
- Selected sequences are highlighted and can be used for operations like "Set selected as reference"

### Column Selection (Positions)

- **Click** on the header to select a column
- **Cmd+click** to add/remove columns from selection
- Selected columns can be collapsed/expanded or used for sorting

### Rectangle Selection

- **Click and drag** on the alignment canvas to select a rectangular region
- **Shift+click** to extend the existing rectangle to include the clicked point
- **Double-click and drag** vertically to select same-type character runs across multiple sequences
  - Double-clicking on a character selects that character and extends horizontally to include all adjacent characters of the same type
  - Character types: gaps (`-`), ambiguous bases (`N`), nucleotides (`A`, `C`, `G`, `T`, `U`), or other characters
  - After double-clicking, dragging vertically extends the selection to other sequences while keeping the same column range
  - Useful for selecting conserved gap regions, runs of ambiguous bases, or nucleotide stretches across multiple sequences

### Copying Selections

- **Cmd+C** (Ctrl+C) - Copy the selected region to clipboard as FASTA format
  - If only rows (sequences) are selected, copies the entire sequences
  - If only columns are selected, copies those positions from all sequences
  - If both rows and columns are selected, copies only the selected positions from the selected sequences
  - Output is formatted as standard FASTA with sequence labels (each sequence on a single line)
  - Works in conjunction with row selection, column selection, or rectangle selection

- **Shift+Cmd+C** (Shift+Ctrl+C) - Copy only the sequence labels as plain text
  - Copies one label per line
  - Useful for exporting sequence names for further analysis or filtering
  - Works with row selection or filter box results

## Tips and Tricks

1. **Focus on variable sites**: Use "Constant sites" collapse preset to hide invariant positions and focus on differences

2. **Compare to reference**: Set a sequence as reference and use "Colour differences only" (Cmd+D) to quickly spot variations

3. **Navigate differences efficiently**: Select specific sequences of interest, then use Cmd+< and Cmd+> to jump between their differences while keeping them in view

4. **Find outliers**: Sort by selected column to group sequences with the same nucleotide at a position of interest

5. **Navigate large alignments**: Use Shift+Arrow keys to jump to alignment extremes, or Alt+Arrow for page scrolling

6. **Adjust view density**: Decrease font size to see more sequences on screen, or increase to examine details

7. **Cumulative filtering**: Apply multiple collapse presets sequentially to refine which columns are visible

8. **Quick search**: Use Cmd+G to rapidly cycle through search results without using the mouse

9. **Keyboard-driven workflow**: Most operations have keyboard shortcuts - see the shortcuts section for a complete list

## Technical Notes

- The viewer uses virtualized rendering to handle large alignments efficiently
- Column collapse is non-destructive - all data is preserved
- Selections and sort order are maintained when collapsing/expanding columns
- The consensus sequence is recalculated only when needed for performance

## Browser Compatibility

Sealion works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

Requires JavaScript enabled and HTML5 canvas support.
