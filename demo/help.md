# Demo App Help

This is a minimal reference application built on the **pearcore** framework.

## Loading Data

- Click the **Open** button or press `Cmd+O` to open a CSV file
- You can also **drag and drop** a CSV file onto the chart area

### CSV Format

The file should have:
- A **header row** with column names
- First column: **category labels**
- Subsequent columns: **numeric values**

Example:
```
Category,Value
Apples,42
Bananas,28
Cherries,15
Dates,33
```

## Visual Settings

Press **Tab** to toggle the settings panel, which controls:

- **Chart**: background colour, bar colours, gap, corner radius
- **Labels**: show/hide labels and values, font size, colour
- **Axis**: show/hide axis, grid lines, axis colour

## Exporting

Click the **Export** button (or `Cmd+Shift+E`) to export the chart as a PNG image.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Toggle settings panel |
| `Cmd+O` | Open file |
| `Cmd+Shift+E` | Export image |
| `Escape` | Close panels |
