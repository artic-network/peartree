// ── Palette panel HTML builder ────────────────────────────────────────────
// buildPalettePanel(sections)
//
// Returns the HTML string for <div id="palette-panel">…</div>.
//
// sections  'all'           – include every section (default)
//           string[]        – array of section keys to include, e.g.:
//                             ['tree','tipLabels','axis','theme']
//
// Section keys:
//   'tree'            Tree
//   'tipLabels'       Tip Labels
//   'labelShapes'     Label Shapes
//   'tipShapes'       Tip Shapes
//   'nodeShapes'      Node Shapes
//   'nodeLabels'      Node Labels
//   'nodeBars'        Node Bars
//   'collapsedClades' Collapsed Clades
//   'legend'          Legend
//   'axis'            Axis
//   'selectionHover'  Selection & Hover
//   'rtt'             Root-to-tip
//   'theme'           Theme

const _TYPEFACES = `<option value="">Theme</option>
<option value="Monospace">Monospace</option>
<option value="Sans-serif">Sans-serif</option>
<option value="Serif">Serif</option>
<option value="Courier New">Courier New</option>
<option value="Helvetica">Helvetica</option>
<option value="Helvetica Neue">Helvetica Neue</option>
<option value="Georgia">Georgia</option>
<option value="Times New Roman">Times New Roman</option>
<option value="System UI">System UI</option>
<option value="Menlo">Menlo</option>`;

function _sectionTree() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-diagram-3"></i> Tree</h3>
      <div class="pt-palette-row" id="axis-date-row" style="display:none"><span class="pt-palette-label">Calibrate</span><select class="pt-palette-select" id="axis-date-annotation"><option value="">(none)</option></select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Background</span><input type="color" class="pt-palette-color" id="canvas-bg-color" value="#02292e" /></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Branches</span><input type="color" class="pt-palette-color" id="branch-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row"><i class="bi bi-distribute-horizontal form-label-sm" style="display:inline-block;transform:rotate(90deg)"></i><input type="range" class="form-range" id="branch-width-slider" min="0.5" max="8" step="0.5" value="1" /><span class="pt-val" id="branch-width-value">1</span></div>
      <div class="pt-palette-row" id="clamp-neg-branches-row"><span class="pt-palette-label">Neg. branches</span><select class="pt-palette-select" id="clamp-neg-branches"><option value="off">draw as-is</option><option value="on">clamp to zero</option></select></div>
      <div class="pt-palette-row"><i class="bi bi-sign-intersection-side form-label-sm" style="display:inline-block;transform:scaleX(-1)" title="Root stem length (% of tree age)"></i><input type="range" class="form-range" id="root-stem-pct-slider" min="0" max="20" step="1" value="1" /><span class="pt-val" id="root-stem-pct-value" style="width:30px">1%</span></div>
    </div>`;
}

function _sectionTipLabels() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-tag"></i> Tip Labels</h3>
      <div class="pt-palette-row"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="tip-label-show" disabled><option value="off">Off</option><option value="names">names</option></select></div>
      <div id="tip-label-controls" class="pt-sub-controls" style="display:none">
        <div class="pt-palette-row" id="tip-label-dp-row" style="display:none"><span class="pt-palette-label">Decimal places</span><select class="pt-palette-select" id="tip-label-decimal-places"><option value="">Auto</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Layout</span><select class="pt-palette-select" id="tip-label-align"><option value="off">Normal</option><option value="aligned">Aligned</option><option value="dots">Aligned + dots</option><option value="dashed">Aligned + dashed</option><option value="solid">Aligned + solid</option></select></div>
        <div class="pt-palette-row"><i class="bi bi-fonts form-label-sm"></i><input type="range" class="form-range" id="font-size-slider" min="1" max="48" value="11" /><span class="pt-val" id="font-size-value">11</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Typeface</span><select class="pt-palette-select" id="typeface-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Style</span><select class="pt-palette-select" id="typeface-style-select"><option value="">Theme</option></select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="label-color" value="#f7eeca" /></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Colour by</span><select class="pt-palette-select" id="label-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="label-palette-row" style="display:none"><span class="pt-palette-label">Palette</span><select class="pt-palette-select" id="label-palette-select"></select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Spacing</span><input type="range" class="form-range" id="tip-label-spacing-slider" min="0" max="20" step="1" value="3" /><span class="pt-val" id="tip-label-spacing-value">3</span></div>
      </div>
    </div>`;
}

function _sectionLabelShapes() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-square-fill"></i> Label Shapes</h3>
      <div class="pt-palette-row"><span class="pt-palette-label">Shape</span><select class="pt-palette-select" id="tip-label-shape"><option value="off">Off</option><option value="square">Square</option><option value="circle">Circle</option><option value="block">Block</option></select></div>
      <div id="tip-label-shape-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="tip-label-shape-color" value="#aaaaaa" /></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Colour by</span><select class="pt-palette-select" id="tip-label-shape-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="tip-label-shape-palette-row" style="display:none"><span class="pt-palette-label">Palette</span><select class="pt-palette-select" id="tip-label-shape-palette-select"></select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Size</span><input type="range" class="form-range" id="tip-label-shape-size-slider" min="1" max="100" step="1" value="50" /><span class="pt-val" id="tip-label-shape-size-value">50</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Margin left</span><input type="range" class="form-range" id="tip-label-shape-margin-left-slider" min="0" max="100" value="2" /><span class="pt-val" id="tip-label-shape-margin-left-value">2</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Margin right</span><input type="range" class="form-range" id="tip-label-shape-margin-right-slider" min="0" max="100" value="3" /><span class="pt-val" id="tip-label-shape-margin-right-value">3</span></div>
        <div class="pt-palette-row" id="tip-label-shape-spacing-row" style="display:none"><span class="pt-palette-label">Spacing</span><input type="range" class="form-range" id="tip-label-shape-spacing-slider" min="0" max="50" value="3" /><span class="pt-val" id="tip-label-shape-spacing-value">3</span></div>
      </div>
      ${[2,3,4,5,6,7,8,9,10].map(n => `
      <div id="tip-label-shape-${n}-section" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row"><span class="pt-palette-label">Label shape ${n}</span><select class="pt-palette-select" id="tip-label-shape-${n}"><option value="off">Off</option><option value="square">Square</option><option value="circle">Circle</option><option value="block">Block</option></select></div>
        <div id="tip-label-shape-${n}-detail" class="pt-detail">
          <div class="pt-palette-row"><span class="pt-palette-label">Colour by</span><select class="pt-palette-select" id="tip-label-shape-${n}-colour-by" disabled><option value="user_colour">user colour</option></select></div>
          <div class="pt-palette-row" id="tip-label-shape-${n}-palette-row" style="display:none"><span class="pt-palette-label">Palette</span><select class="pt-palette-select" id="tip-label-shape-${n}-palette-select"></select></div>
        </div>
      </div>`).join('')}
    </div>`;
}

function _sectionTipShapes() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-circle"></i> Tip Shapes</h3>
      <div class="pt-palette-row"><i class="bi bi-record-circle form-label-sm"></i><input type="range" class="form-range" id="tip-size-slider" min="0" max="24" value="3" /><span class="pt-val" id="tip-size-value">3</span></div>
      <div id="tip-shape-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="tip-shape-color" value="#888888" /></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Halo</span><input type="range" class="form-range" id="tip-halo-slider" min="0" max="8" value="2" /><span class="pt-val" id="tip-halo-value">2</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Halo Colour</span><input type="color" class="pt-palette-color" id="tip-shape-bg-color" value="#02292e" /></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Colour by</span><select class="pt-palette-select" id="tip-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="tip-palette-row" style="display:none"><span class="pt-palette-label">Palette</span><select class="pt-palette-select" id="tip-palette-select"></select></div>
      </div>
    </div>`;
}

function _sectionNodeShapes() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-record-circle"></i> Node Shapes</h3>
      <div class="pt-palette-row"><i class="bi bi-record-circle form-label-sm"></i><input type="range" class="form-range" id="node-size-slider" min="0" max="24" value="0" /><span class="pt-val" id="node-size-value">0</span></div>
      <div id="node-shape-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="node-shape-color" value="#888888" /></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Halo</span><input type="range" class="form-range" id="node-halo-slider" min="0" max="8" value="2" /><span class="pt-val" id="node-halo-value">2</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Halo Colour</span><input type="color" class="pt-palette-color" id="node-shape-bg-color" value="#02292e" /></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Colour by</span><select class="pt-palette-select" id="node-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="node-palette-row" style="display:none"><span class="pt-palette-label">Palette</span><select class="pt-palette-select" id="node-palette-select"></select></div>
      </div>
    </div>`;
}

function _sectionNodeLabels() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-tag-fill"></i> Node Labels</h3>
      <div class="pt-palette-row"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="node-label-show" disabled><option value="">Off</option></select></div>
      <div id="node-label-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row" id="node-label-dp-row" style="display:none"><span class="pt-palette-label">Decimal places</span><select class="pt-palette-select" id="node-label-decimal-places"><option value="">Auto</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Position</span><select class="pt-palette-select" id="node-label-position"><option value="right">Right</option><option value="above-left">Above left</option><option value="below-left">Below left</option></select></div>
        <div class="pt-palette-row"><i class="bi bi-fonts form-label-sm"></i><input type="range" class="form-range" id="node-label-font-size-slider" min="6" max="48" value="9" /><span class="pt-val" id="node-label-font-size-value">9</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Typeface</span><select class="pt-palette-select" id="node-label-typeface-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Style</span><select class="pt-palette-select" id="node-label-typeface-style-select"><option value="">Theme</option></select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="node-label-color" value="#aaaaaa" /></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Spacing</span><input type="range" class="form-range" id="node-label-spacing-slider" min="0" max="20" step="1" value="4" /><span class="pt-val" id="node-label-spacing-value">4</span></div>
      </div>
    </div>`;
}

function _sectionNodeBars() {
  return `
    <div class="pt-palette-section" id="node-bars-section">
      <h3><i class="bi bi-bar-chart-steps"></i> Node Bars</h3>
      <div id="node-bars-unavail" style="display:block;font-size:0.78rem;color:var(--pt-text-muted);font-style:italic;padding:2px 0 4px;">Requires BEAST tree with height HPD</div>
      <div id="node-bars-controls" style="display:none">
        <div class="pt-palette-row"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="node-bars-show"><option value="off">Off</option><option value="on">On</option></select></div>
        <div id="node-bars-detail" class="pt-detail pt-sub-controls">
          <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="node-bars-color" value="#2aa198" /></div>
          <div class="pt-palette-row" title="Bar height in screen pixels"><i class="bi bi-arrows-expand-vertical form-label-sm"></i><input type="range" class="form-range" id="node-bars-width-slider" min="2" max="30" step="1" value="6" /><span class="pt-val" id="node-bars-width-value">6</span></div>
          <div class="pt-palette-row"><span class="pt-palette-label">Line</span><select class="pt-palette-select" id="node-bars-median"><option value="none">(none)</option><option value="mean">Mean</option><option value="median">Median</option></select></div>
          <div class="pt-palette-row"><span class="pt-palette-label">Range whiskers</span><select class="pt-palette-select" id="node-bars-range"><option value="off">Hide</option><option value="on">Show</option></select></div>
        </div>
      </div>
    </div>`;
}

function _sectionCollapsedClades() {
  return `
    <div class="pt-palette-section" id="collapsed-clades-section">
      <h3><i class="bi bi-triangle"></i> Collapsed Clades</h3>
      <div class="pt-palette-row" title="Fill opacity of collapsed clade triangles"><span class="pt-palette-label">Fill opacity</span><input type="range" class="form-range" id="collapsed-opacity-slider" min="0" max="1" step="0.05" value="0.25" /><span class="pt-val" id="collapsed-opacity-value">0.25</span></div>
      <div class="pt-palette-row" title="Height of the clade triangle base in tip-row units"><span class="pt-palette-label">Height (rows)</span><input type="range" class="form-range" id="collapsed-height-n-slider" min="1" max="20" step="1" value="3" /><span class="pt-val" id="collapsed-height-n-value">3</span></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Label size</span><input type="range" class="form-range" id="collapsed-clade-font-size-slider" min="6" max="48" step="1" value="11" /><span class="pt-val" id="collapsed-clade-font-size-value">11</span></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Typeface</span><select class="pt-palette-select" id="collapsed-clade-typeface-select">${_TYPEFACES}</select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Style</span><select class="pt-palette-select" id="collapsed-clade-typeface-style-select"><option value="">Theme</option></select></div>
    </div>`;
}

function _sectionLegend() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-card-list"></i> Legend</h3>
      <div class="pt-palette-row"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="legend-annotation" disabled><option value="">Off</option></select></div>
      <div id="legend-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row"><span class="pt-palette-label">Position</span><select class="pt-palette-select" id="legend-show"><option value="right">Right</option><option value="left">Left</option></select></div>
        <div class="pt-palette-row"><i class="bi bi-arrows-expand form-label-sm" title="Height"></i><input type="range" class="form-range" id="legend-height-pct-slider" min="10" max="100" step="5" value="100" /><span class="pt-val" id="legend-height-pct-value">100%</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="legend-text-color" value="#f7eeca" /></div>
        <div class="pt-palette-row"><i class="bi bi-fonts form-label-sm"></i><input type="range" class="form-range" id="legend-font-size-slider" min="6" max="48" value="11" /><span class="pt-val" id="legend-font-size-value">11</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Typeface</span><select class="pt-palette-select" id="legend-font-family-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Style</span><select class="pt-palette-select" id="legend-typeface-style-select"><option value="">Theme</option></select></div>
        <p class="pt-palette-subhead">Legend 2</p>
        <div class="pt-palette-row"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="legend-annotation-2"><option value="">Off</option></select></div>
        <div id="legend2-detail" class="pt-detail pt-sub-controls">
          <div class="pt-palette-row"><span class="pt-palette-label">Position</span><select class="pt-palette-select" id="legend2-show"><option value="right">Right</option><option value="below">Below</option></select></div>
          <div class="pt-palette-row"><i class="bi bi-arrows-expand form-label-sm" title="Height"></i><input type="range" class="form-range" id="legend2-height-pct-slider" min="10" max="100" step="5" value="50" /><span class="pt-val" id="legend2-height-pct-value">50%</span></div>
        </div>
      </div>
    </div>`;
}

function _sectionAxis() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-rulers"></i> Axis</h3>
      <div class="pt-palette-row"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="axis-show"><option value="off">Off</option><option value="forward">Forward</option><option value="reverse">Reverse</option><option value="time">Time</option></select></div>
      <div id="axis-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="axis-color" value="#f2f1e6" /></div>
        <div class="pt-palette-row"><i class="bi bi-fonts form-label-sm"></i><input type="range" class="form-range" id="axis-font-size-slider" min="6" max="48" value="9" /><span class="pt-val" id="axis-font-size-value">9</span></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Typeface</span><select class="pt-palette-select" id="axis-font-family-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row"><span class="pt-palette-label">Style</span><select class="pt-palette-select" id="axis-typeface-style-select"><option value="">Theme</option></select></div>
        <div class="pt-palette-row"><i class="bi bi-distribute-horizontal form-label-sm"></i><input type="range" class="form-range" id="axis-line-width-slider" min="0.5" max="4" step="0.5" value="1" /><span class="pt-val" id="axis-line-width-value">1</span></div>
        <div class="pt-palette-row" id="axis-date-format-row" style="display:none"><span class="pt-palette-label">Format</span><select class="pt-palette-select" id="axis-date-format"><option value="yyyy-MM-dd">1977-05-04</option><option value="yyyy-MMM-dd">1977-May-04</option><option value="dd MMM yyyy">04 May 1977</option><option value="dd MMMM yyyy">04 May 1977 (long month)</option><option value="MMM dd, yyyy">May 04, 1977</option><option value="MMMM dd, yyyy">May 04, 1977 (long month)</option><option value="MMM-dd-yyyy">May-04-1977</option></select></div>
        <div class="pt-palette-row" id="axis-major-interval-row" style="display:none"><span class="pt-palette-label">Major ticks</span><select class="pt-palette-select" id="axis-major-interval"><option value="auto">Auto</option><option value="millennia">Millennia</option><option value="centuries">Centuries</option><option value="decades">Decades</option><option value="years">Years</option><option value="quarters">Quarters</option><option value="months">Months</option><option value="weeks">Weeks</option><option value="days">Days</option></select></div>
        <div class="pt-palette-row" id="axis-minor-interval-row" style="display:none"><span class="pt-palette-label">Minor ticks</span><select class="pt-palette-select" id="axis-minor-interval"><option value="off">Off</option></select></div>
        <div class="pt-palette-row" id="axis-major-label-row" style="display:none"><span class="pt-palette-label">Major labels</span><select class="pt-palette-select" id="axis-major-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
        <div class="pt-palette-row" id="axis-minor-label-row" style="display:none"><span class="pt-palette-label">Minor labels</span><select class="pt-palette-select" id="axis-minor-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
      </div>
    </div>`;
}

function _sectionSelectionHover() {
  return `
    <div class="pt-palette-section" id="selection-hover-section">
      <h3><i class="bi bi-cursor-fill"></i> Selection &amp; Hover</h3>
      <div class="pt-palette-subhead">Selected Tips</div>
      <div class="pt-palette-row"><span class="pt-palette-label">Label style</span><select class="pt-palette-select" id="selected-label-style"><option value="bold">Bold</option><option value="italic">Italic</option><option value="bold italic">Bold + Italic</option><option value="normal">Normal</option></select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Stroke</span><input type="color" class="pt-palette-color" id="selected-tip-stroke" value="#e06961" /></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Fill</span><input type="color" class="pt-palette-color" id="selected-tip-fill" value="#888888" /></div>
      <div class="pt-palette-row"><i class="bi bi-zoom-in form-label-sm"></i><input type="range" class="form-range" id="selected-tip-growth" min="1" max="5" step="0.1" value="2" /><span class="pt-val" id="selected-tip-growth-value">2</span></div>
      <div class="pt-palette-row"><i class="bi bi-circle form-label-sm"></i><input type="range" class="form-range" id="selected-tip-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="selected-tip-min-size-value">6</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet-fill form-label-sm"></i><input type="range" class="form-range" id="selected-tip-fill-opacity" min="0" max="1" step="0.05" value="0.5" /><span class="pt-val" id="selected-tip-fill-opacity-value">0.5</span></div>
      <div class="pt-palette-row"><i class="bi bi-record-circle form-label-sm"></i><input type="range" class="form-range" id="selected-tip-stroke-width" min="0.5" max="10" step="0.5" value="3" /><span class="pt-val" id="selected-tip-stroke-width-value">3</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet form-label-sm"></i><input type="range" class="form-range" id="selected-tip-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="selected-tip-stroke-opacity-value">1</span></div>
      <div class="pt-palette-subhead">MRCA Node</div>
      <div class="pt-palette-row"><span class="pt-palette-label">Stroke</span><input type="color" class="pt-palette-color" id="selected-node-stroke" value="#19a699" /></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Fill</span><input type="color" class="pt-palette-color" id="selected-node-fill" value="#19a699" /></div>
      <div class="pt-palette-row"><i class="bi bi-zoom-in form-label-sm"></i><input type="range" class="form-range" id="selected-node-growth" min="1" max="5" step="0.1" value="2" /><span class="pt-val" id="selected-node-growth-value">2</span></div>
      <div class="pt-palette-row"><i class="bi bi-circle form-label-sm"></i><input type="range" class="form-range" id="selected-node-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="selected-node-min-size-value">6</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet-fill form-label-sm"></i><input type="range" class="form-range" id="selected-node-fill-opacity" min="0" max="1" step="0.05" value="0.5" /><span class="pt-val" id="selected-node-fill-opacity-value">0.5</span></div>
      <div class="pt-palette-row"><i class="bi bi-record-circle form-label-sm"></i><input type="range" class="form-range" id="selected-node-stroke-width" min="0.5" max="10" step="0.5" value="3" /><span class="pt-val" id="selected-node-stroke-width-value">3</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet form-label-sm"></i><input type="range" class="form-range" id="selected-node-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="selected-node-stroke-opacity-value">1</span></div>
      <div class="pt-palette-subhead">Tip Hover</div>
      <div class="pt-palette-row"><span class="pt-palette-label">Fill</span><input type="color" class="pt-palette-color" id="tip-hover-fill" value="#bf4b43" /></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Stroke</span><input type="color" class="pt-palette-color" id="tip-hover-stroke" value="#7b2820" /></div>
      <div class="pt-palette-row"><i class="bi bi-zoom-in form-label-sm"></i><input type="range" class="form-range" id="tip-hover-growth" min="1" max="5" step="0.1" value="1.5" /><span class="pt-val" id="tip-hover-growth-value">1.5</span></div>
      <div class="pt-palette-row"><i class="bi bi-circle form-label-sm"></i><input type="range" class="form-range" id="tip-hover-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="tip-hover-min-size-value">6</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet-fill form-label-sm"></i><input type="range" class="form-range" id="tip-hover-fill-opacity" min="0" max="1" step="0.05" value="0.6" /><span class="pt-val" id="tip-hover-fill-opacity-value">0.6</span></div>
      <div class="pt-palette-row"><i class="bi bi-record-circle form-label-sm"></i><input type="range" class="form-range" id="tip-hover-stroke-width" min="0.5" max="10" step="0.5" value="2" /><span class="pt-val" id="tip-hover-stroke-width-value">2</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet form-label-sm"></i><input type="range" class="form-range" id="tip-hover-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="tip-hover-stroke-opacity-value">1</span></div>
      <div class="pt-palette-subhead">Node Hover</div>
      <div class="pt-palette-row"><span class="pt-palette-label">Fill</span><input type="color" class="pt-palette-color" id="node-hover-fill" value="#19a699" /></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Stroke</span><input type="color" class="pt-palette-color" id="node-hover-stroke" value="#0d6560" /></div>
      <div class="pt-palette-row"><i class="bi bi-zoom-in form-label-sm"></i><input type="range" class="form-range" id="node-hover-growth" min="1" max="5" step="0.1" value="1.5" /><span class="pt-val" id="node-hover-growth-value">1.5</span></div>
      <div class="pt-palette-row"><i class="bi bi-circle form-label-sm"></i><input type="range" class="form-range" id="node-hover-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="node-hover-min-size-value">6</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet-fill form-label-sm"></i><input type="range" class="form-range" id="node-hover-fill-opacity" min="0" max="1" step="0.05" value="0.6" /><span class="pt-val" id="node-hover-fill-opacity-value">0.6</span></div>
      <div class="pt-palette-row"><i class="bi bi-record-circle form-label-sm"></i><input type="range" class="form-range" id="node-hover-stroke-width" min="0.5" max="10" step="0.5" value="2" /><span class="pt-val" id="node-hover-stroke-width-value">2</span></div>
      <div class="pt-palette-row"><i class="bi bi-droplet form-label-sm"></i><input type="range" class="form-range" id="node-hover-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="node-hover-stroke-opacity-value">1</span></div>
    </div>`;
}

function _sectionRtt() {
  return `
    <div class="pt-palette-section" id="rtt-section">
      <h3><i class="bi bi-graph-up-arrow"></i> Root-to-tip</h3>
      <div class="pt-palette-row"><span class="pt-palette-label">X-axis origin</span><select class="pt-palette-select" id="rtt-x-origin"><option value="data">data range</option><option value="root">include root age</option></select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Grid lines</span><select class="pt-palette-select" id="rtt-grid-lines"><option value="both">both</option><option value="horizontal">horizontal</option><option value="vertical">vertical</option><option value="off">off</option></select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Aspect ratio</span><select class="pt-palette-select" id="rtt-aspect-ratio"><option value="fit">fit panel</option><option value="1:1">1 : 1 (square)</option><option value="4:3">4 : 3</option><option value="3:2">3 : 2</option><option value="16:9">16 : 9</option></select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Colour</span><input type="color" class="pt-palette-color" id="rtt-axis-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Reg. line</span><select class="pt-palette-select" id="rtt-regression-style"><option value="solid">Solid</option><option value="bigdash">Big dash</option><option value="dash">Dash</option><option value="dots">Dots</option></select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Reg. colour</span><input type="color" class="pt-palette-color" id="rtt-regression-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row"><i class="bi bi-distribute-horizontal form-label-sm" title="Regression line width"></i><input type="range" class="form-range" id="rtt-regression-width-slider" min="0.5" max="6" step="0.5" value="1.5" /><span class="pt-val" id="rtt-regression-width-value">1.5</span></div>
      <div class="pt-palette-row pt-rtt-adv-row"><span class="pt-palette-label">Box bg</span><input type="color" class="pt-palette-color" id="rtt-stats-bg-color" value="#081c22" /></div>
      <div class="pt-palette-row pt-rtt-adv-row"><span class="pt-palette-label">Box text</span><input type="color" class="pt-palette-color" id="rtt-stats-text-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row"><i class="bi bi-fonts form-label-sm"></i><input type="range" class="form-range" id="rtt-axis-font-size-slider" min="6" max="48" value="9" /><span class="pt-val" id="rtt-axis-font-size-value">9</span></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Typeface</span><select class="pt-palette-select" id="rtt-axis-font-family-select">${_TYPEFACES}</select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Style</span><select class="pt-palette-select" id="rtt-axis-typeface-style-select"><option value="">Theme</option></select></div>
      <div class="pt-palette-row"><i class="bi bi-distribute-horizontal form-label-sm"></i><input type="range" class="form-range" id="rtt-axis-line-width-slider" min="0.5" max="4" step="0.5" value="1" /><span class="pt-val" id="rtt-axis-line-width-value">1</span></div>
      <div class="pt-palette-row" id="rtt-date-format-row" style="display:none"><span class="pt-palette-label">Format</span><select class="pt-palette-select" id="rtt-date-format"><option value="yyyy-MM-dd">1977-05-04</option><option value="yyyy-MMM-dd">1977-May-04</option><option value="dd MMM yyyy">04 May 1977</option><option value="dd MMMM yyyy">04 May 1977 (long month)</option><option value="MMM dd, yyyy">May 04, 1977</option><option value="MMMM dd, yyyy">May 04, 1977 (long month)</option><option value="MMM-dd-yyyy">May-04-1977</option></select></div>
      <div class="pt-palette-row" id="rtt-major-interval-row" style="display:none"><span class="pt-palette-label">Major ticks</span><select class="pt-palette-select" id="rtt-major-interval"><option value="auto">Auto</option><option value="millennia">Millennia</option><option value="centuries">Centuries</option><option value="decades">Decades</option><option value="years">Years</option><option value="quarters">Quarters</option><option value="months">Months</option><option value="weeks">Weeks</option><option value="days">Days</option></select></div>
      <div class="pt-palette-row" id="rtt-minor-interval-row" style="display:none"><span class="pt-palette-label">Minor ticks</span><select class="pt-palette-select" id="rtt-minor-interval"><option value="off">Off</option></select></div>
      <div class="pt-palette-row" id="rtt-major-label-row" style="display:none"><span class="pt-palette-label">Major labels</span><select class="pt-palette-select" id="rtt-major-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
      <div class="pt-palette-row" id="rtt-minor-label-row" style="display:none"><span class="pt-palette-label">Minor labels</span><select class="pt-palette-select" id="rtt-minor-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
    </div>`;
}

function _sectionTheme() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-palette2"></i> Theme</h3>
      <div class="pt-palette-row"><select class="pt-palette-select" id="theme-select" style="flex:1"></select></div>
      <div class="pt-palette-row" style="gap:6px">
        <button id="btn-store-theme" class="pt-theme-btn" style="flex:1" title="Save current settings as a named theme" disabled>Store</button>
        <button id="btn-default-theme" class="pt-theme-btn" style="flex:1" title="Set selected theme as the default" disabled>Default</button>
        <button id="btn-remove-theme" class="pt-theme-btn" style="flex:1" title="Remove this user-saved theme" disabled>Remove</button>
      </div>
      <div class="pt-palette-row"><span class="pt-palette-label">Typeface</span><select class="pt-palette-select" id="font-family-select"><option value="Monospace">Monospace</option><option value="Sans-serif">Sans-serif</option><option value="Serif">Serif</option><option value="Courier New">Courier New</option><option value="Helvetica">Helvetica</option><option value="Helvetica Neue">Helvetica Neue</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="System UI">System UI</option><option value="Menlo">Menlo</option></select></div>
      <div class="pt-palette-row"><span class="pt-palette-label">Style</span><select class="pt-palette-select" id="font-typeface-style-select"><option value="Regular">Regular</option></select></div>
    </div>`;
}

const _SECTION_BUILDERS = {
  tree:            _sectionTree,
  tipLabels:       _sectionTipLabels,
  labelShapes:     _sectionLabelShapes,
  tipShapes:       _sectionTipShapes,
  nodeShapes:      _sectionNodeShapes,
  nodeLabels:      _sectionNodeLabels,
  nodeBars:        _sectionNodeBars,
  collapsedClades: _sectionCollapsedClades,
  legend:          _sectionLegend,
  axis:            _sectionAxis,
  selectionHover:  _sectionSelectionHover,
  rtt:             _sectionRtt,
  theme:           _sectionTheme,
};

const _ALL_SECTIONS = [
  'tree', 'tipLabels', 'labelShapes', 'tipShapes', 'nodeShapes', 'nodeLabels',
  'nodeBars', 'collapsedClades', 'legend', 'axis', 'selectionHover', 'rtt', 'theme',
];

function buildPalettePanel(sections) {
  const keys = (!sections || sections === 'all') ? _ALL_SECTIONS : sections;
  const body = keys
    .filter(k => _SECTION_BUILDERS[k])
    .map(k => _SECTION_BUILDERS[k]())
    .join('');
  return `<div id="palette-panel">
  <div id="palette-panel-header">
    <h2><i class="bi bi-sliders me-1"></i>Visual Options</h2>
    <div class="palette-pin-btns">
      <button id="btn-palette-pin" title="Pin panel open"><i class="bi bi-pin-angle"></i></button>
      <button id="btn-palette-close" title="Close">&times;</button>
    </div>
  </div>
  <div id="palette-panel-body">
    ${body}
  </div>
  <div id="palette-panel-footer">
    <button id="btn-reset-settings" title="Reset all visual settings to their defaults"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset to defaults</button>
  </div>
</div>`;
}

// Auto-inject the palette panel, replacing a <div id="palette-panel-host">
// placeholder. In peartree.html the placeholder is static HTML; in the embed
// context peartree-embed.js writes it into the wrapper via _buildHTML().
// peartreeConfig.paletteSections controls which sections to render (embed only).
(function () {
  const _host = document.getElementById('palette-panel-host');
  if (_host) {
    const _secs = window.peartreeConfig?.paletteSections || 'all';
    _host.outerHTML = buildPalettePanel(_secs);
    // When palette is disabled, hide the panel completely so it cannot be
    // seen or interacted with (the Tab guard below prevents keyboard access).
    // The panel must remain in the DOM because peartree.js uses its input
    // elements as state storage for visual settings.
    if (window.peartreeConfig?.ui?.palette === false) {
      const _panel = document.getElementById('palette-panel');
      if (_panel) {
        _panel.style.display = 'none';
        _panel.inert = true;
      }
    }
  }
})();

// ── Tool palette panel ────────────────────────────────────────────────────
const palettePanel     = document.getElementById('palette-panel');
const btnPalette       = document.getElementById('btn-palette');
const btnPaletteClose  = document.getElementById('btn-palette-close');
const btnPalettePin    = document.getElementById('btn-palette-pin');
const PALETTE_PIN_KEY  = 'peartree-palette-pinned';
let   palettePinned    = false;

function _afterPanelTransition() {
  // Pump resize events every frame for the duration of the CSS transition so the
  // tree canvas rescales continuously in sync with the margin animation.
  const DURATION = 250; // ms — slightly longer than the 0.22s CSS transition
  const start = performance.now();
  function pump(now) {
    window.dispatchEvent(new Event('resize'));
    if (now - start < DURATION) requestAnimationFrame(pump);
  }
  requestAnimationFrame(pump);
}

function openPalette(advanced = false) {
  palettePanel.classList.add('open');
  palettePanel.classList.toggle('advanced', advanced);
  if (palettePinned) {
    palettePanel.classList.add('pinned');
    document.body.classList.add('palette-pinned');
  }
  btnPalette.classList.add('active');
  _afterPanelTransition();
}
function closePalette() {
  // Remove open/pinned CSS classes and canvas margin, but preserve the
  // palettePinned flag so reopening the panel restores pinned behaviour.
  palettePanel.classList.remove('open', 'advanced', 'pinned');
  document.body.classList.remove('palette-pinned');
  btnPalette.classList.remove('active');
  _afterPanelTransition();
}
function pinPalette() {
  palettePinned = true;
  localStorage.setItem(PALETTE_PIN_KEY, '1');
  palettePanel.classList.add('open', 'pinned');
  document.body.classList.add('palette-pinned');
  btnPalettePin.classList.add('active');
  btnPalettePin.title = 'Unpin panel';
  btnPalettePin.innerHTML = '<i class="bi bi-pin-angle-fill"></i>';
  btnPalette.classList.add('active');
  _afterPanelTransition();
}
function unpinPalette() {
  palettePinned = false;
  localStorage.removeItem(PALETTE_PIN_KEY);
  palettePanel.classList.remove('pinned');
  document.body.classList.remove('palette-pinned');
  btnPalettePin.classList.remove('active');
  btnPalettePin.title = 'Pin panel open';
  btnPalettePin.innerHTML = '<i class="bi bi-pin-angle"></i>';
  _afterPanelTransition();
}

if (palettePanel && window.peartreeConfig?.ui?.palette !== false) {
  btnPalette.addEventListener('click', e => {
    e.stopPropagation();
    if (palettePanel.classList.contains('open')) {
      closePalette();
    } else {
      openPalette(e.altKey);
    }
  });
  btnPaletteClose.addEventListener('click', closePalette);
  btnPalettePin.addEventListener('click', () => {
    if (palettePinned) unpinPalette();
    else               pinPalette();
  });

  // Restore pinned state from previous session.
  if (localStorage.getItem(PALETTE_PIN_KEY) === '1') pinPalette();
}

// Slider live value readouts
const fontSliderEl = document.getElementById('font-size-slider');
const tipSliderEl  = document.getElementById('tip-size-slider');
const nodeSliderEl = document.getElementById('node-size-slider');
const fontValEl    = document.getElementById('font-size-value');
const tipValEl     = document.getElementById('tip-size-value');
const nodeValEl    = document.getElementById('node-size-value');
fontSliderEl?.addEventListener('input',  () => { fontValEl.textContent  = fontSliderEl.value; });
tipSliderEl?.addEventListener('input',   () => { tipValEl.textContent   = tipSliderEl.value; });
nodeSliderEl?.addEventListener('input',  () => { nodeValEl.textContent  = nodeSliderEl.value; });

// Help panel
const helpPanel   = document.getElementById('help-panel');
const helpContent = document.getElementById('help-content');
const btnHelp      = document.getElementById('btn-help');
const btnHelpClose = document.getElementById('btn-help-close');
let helpLoaded = false;

async function openHelp() {
  if (!helpLoaded) {
    try {
      const md = await window.peartree.fetchWithFallback('help.md');
      helpContent.innerHTML = marked.parse(md);
      helpLoaded = true;
    } catch (err) {
      helpContent.innerHTML = `<p style="color:var(--pt-red)">Could not load help.md: ${err.message}</p>`;
    }
  }
  closeAbout();
  helpPanel.classList.add('open');
  btnHelp.classList.add('active');
}

function closeHelp() {
  helpPanel.classList.remove('open');
  btnHelp.classList.remove('active');
}

btnHelp.addEventListener('click', e => {
  e.stopPropagation();
  helpPanel.classList.contains('open') ? closeHelp() : openHelp();
});
btnHelpClose.addEventListener('click', closeHelp);

// About modal
const aboutPanel    = document.getElementById('about-panel');
const aboutBackdrop = document.getElementById('about-backdrop');
const aboutContent  = document.getElementById('about-content');
const btnAbout      = document.getElementById('btn-about');
const btnAboutClose = document.getElementById('btn-about-close');
let aboutLoaded = false;

/* ── Light / dark mode toggle ── */
(function () {
  const STORAGE_KEY = 'pt-theme';
  const btnTheme = document.getElementById('btn-theme');
  const icon = btnTheme.querySelector('i');

  // When the calling page sets storageKey:null, all localStorage is disabled for the embed.
  const noStorage = Object.prototype.hasOwnProperty.call(window.peartreeConfig ?? {}, 'storageKey')
                    && window.peartreeConfig.storageKey === null;

  // In embed mode scope the theme attribute to the .pt-embed-wrap element so we don't
  // affect the surrounding report page.  In standalone mode use <html> as normal.
  const themeRoot = noStorage
    ? (btnTheme.closest('.pt-embed-wrap') ?? document.documentElement)
    : document.documentElement;

  function applyTheme(mode) {
    if (mode === 'light') {
      themeRoot.setAttribute('data-bs-theme', 'light');
      icon.className = 'bi bi-moon-stars';
      btnTheme.title = 'Switch to dark mode';
    } else {
      themeRoot.setAttribute('data-bs-theme', 'dark');
      icon.className = 'bi bi-sun';
      btnTheme.title = 'Switch to light mode';
    }
  }

  // Priority: ?mode=dark/light URL param > peartreeConfig.ui.theme > localStorage (if enabled) > system preference
  const urlMode = new URLSearchParams(window.location.search).get('mode');
  const cfgTheme = window.peartreeConfig?.ui?.theme;
  const saved = (urlMode === 'dark' || urlMode === 'light') ? urlMode
              : (cfgTheme === 'dark' || cfgTheme === 'light') ? cfgTheme
              : (!noStorage ? localStorage.getItem(STORAGE_KEY) : null);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ?? (prefersDark ? 'dark' : 'light'));

  btnTheme.addEventListener('click', () => {
    const next = themeRoot.getAttribute('data-bs-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    if (!noStorage) localStorage.setItem(STORAGE_KEY, next);
  });
})();

async function openAbout() {
  if (!aboutLoaded) {
    try {
      const md = await window.peartree.fetchWithFallback('about.md');
      aboutContent.innerHTML = marked.parse(md);
      aboutLoaded = true;
    } catch (err) {
      aboutContent.innerHTML = `<p style="color:var(--pt-red)">Could not load about.md: ${err.message}</p>`;
    }
  }
  closeHelp();
  aboutPanel.classList.add('open');
  aboutBackdrop.classList.add('open');
  btnAbout.classList.add('active');
}

function closeAbout() {
  aboutPanel.classList.remove('open');
  aboutBackdrop.classList.remove('open');
  btnAbout.classList.remove('active');
}

btnAbout.addEventListener('click', e => {
  e.stopPropagation();
  aboutPanel.classList.contains('open') ? closeAbout() : openAbout();
});
btnAboutClose.addEventListener('click', closeAbout);
aboutBackdrop.addEventListener('click', closeAbout);

// Clicking the tree canvas closes any open panel immediately (unless pinned).
document.getElementById('tree-canvas').addEventListener('pointerdown', () => {
  if (!palettePinned) closePalette();
  closeHelp();
  closeAbout();
});

// Tab / ⌥Tab toggles palette; Alt held opens in advanced mode
// Guard against palette being disabled (panel is still in DOM but hidden).
if (palettePanel && window.peartreeConfig?.ui?.palette !== false) document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey) {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    if (palettePinned) return;   // Tab does nothing when pinned
    palettePanel.classList.contains('open') ? closePalette() : openPalette(e.altKey);
  }
});

// Close help on Escape; also close palette if NOT pinned
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeHelp(); if (!palettePinned) closePalette(); closeAbout(); }
});

// ── Keep panels below toolbar ──────────────────────────────────────────
const _toolbar = document.querySelector('.pt-toolbar');
function _updateToolbarH() {
  document.documentElement.style.setProperty('--pt-toolbar-h', _toolbar.offsetHeight + 'px');
}
_updateToolbarH();
new ResizeObserver(_updateToolbarH).observe(_toolbar);
