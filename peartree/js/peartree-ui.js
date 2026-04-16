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
      <h3><i class="bi bi-tree"></i> Tree</h3>
      <div class="pt-palette-row" id="axis-date-row" style="display:none" title="Calibrate the axis to calendar dates using the selected annotation"><span class="pt-palette-label">Calibrate <i class="bi bi-calendar3 form-label-sm"></i></span><select class="pt-palette-select" id="axis-date-annotation"><option value="">(none)</option></select></div>
      <div class="pt-palette-row" title="Canvas background colour"><span class="pt-palette-label">Background <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="canvas-bg-color" value="#02292e" /></div>
      <div class="pt-palette-row" title="Length of the root stem as a percentage of tree width"><span class="pt-palette-label">Root len <i class="bi bi-arrows form-label-sm"></i></span><input type="range" class="form-range" id="root-stem-pct-slider" min="0" max="20" step="1" value="1" /><span class="pt-val" id="root-stem-pct-value" style="width:30px">1%</span></div>
    </div>`;
}

function _sectionBranches() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-diagram-2-fill" style="display:inline-block;transform:rotate(-90deg)"></i> Branches</h3>
      <div class="pt-palette-row" title="Branch line colour"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="branch-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row" title="Branch line thickness in screen pixels"><span class="pt-palette-label">Width <i class="bi bi-arrows-expand form-label-sm"></i></span><input type="range" class="form-range" id="branch-width-slider" min="0.5" max="8" step="0.5" value="1" /><span class="pt-val" id="branch-width-value">1</span></div>
      <div class="pt-palette-row" title="Rounded corner radius on branch elbows"><span class="pt-palette-label">Elbow Radius <i class="bi bi-radar form-label-sm"></i></span><input type="range" class="form-range" id="elbow-radius-slider" min="0" max="20" step="1" value="2" /><span class="pt-val" id="elbow-radius-value">2</span></div>
    </div>`;
}

function _sectionTipLabels() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-tag"></i> Tip Labels</h3>
      <div class="pt-palette-row" title="Show tip labels; choose which annotation to display"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="tip-label-show" disabled><option value="off">Off</option><option value="names" selected>names</option></select></div>
      <div id="tip-label-controls" class="pt-sub-controls" style="display:none">
        <div class="pt-palette-row" id="tip-label-dp-row" style="display:none" title="Decimal places for numeric tip labels"><span class="pt-palette-label">d.p.</span><select class="pt-palette-select" id="tip-label-decimal-places"><option value="">Auto</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></div>
        <div class="pt-palette-row" title="Align tips to a common margin with optional connecting lines"><span class="pt-palette-label">Alignment <i class="bi bi-text-left form-label-sm"></i></span><select class="pt-palette-select" id="tip-label-align"><option value="off">Off</option><option value="aligned">Aligned</option><option value="dots">Aligned + dots</option><option value="dashed">Aligned + dashed</option><option value="solid">Aligned + solid</option></select></div>
        <div class="pt-palette-row" title="Font size of tip labels"><span class="pt-palette-label">Size <i class="bi bi-fonts form-label-sm"></i></span><input type="range" class="form-range" id="font-size-slider" min="1" max="48" value="11" /><span class="pt-val" id="font-size-value">11</span></div>
        <div class="pt-palette-row" title="Typeface for tip labels"><span class="pt-palette-label">Typeface <i class="bi bi-type form-label-sm"></i></span><select class="pt-palette-select" id="typeface-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row" title="Font style for tip labels"><span class="pt-palette-label">Style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="typeface-style-select"><option value="">Theme</option></select></div>
        <div class="pt-palette-row" title="Tip label text colour"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="label-color" value="#f7eeca" /></div>
        <div class="pt-palette-row" title="Colour tip labels by an annotation attribute"><span class="pt-palette-label">Colour by <i class="bi bi-palette2 form-label-sm"></i></span><select class="pt-palette-select" id="label-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="label-palette-row" style="display:none" title="Colour palette for annotation-based tip label colouring"><span class="pt-palette-label">Palette <i class="bi bi-rainbow form-label-sm"></i></span><select class="pt-palette-select" id="label-palette-select"></select></div>
        <div class="pt-palette-row" id="label-scale-mode-row" style="display:none" title="How the numeric colour range is mapped"><span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span><select class="pt-palette-select" id="label-scale-mode-select"><option value="">Auto (min → max)</option><option value="symmetric-zero">Symmetric ±0</option><option value="zero-positive">From zero</option><option value="zero-one">0 → 1</option></select></div>
        <div class="pt-palette-row" title="Horizontal gap between the tip node and its label"><span class="pt-palette-label">Spacing <i class="bi bi-arrow-bar-right form-label-sm"></i></span><input type="range" class="form-range" id="tip-label-spacing-slider" min="0" max="100" step="1" value="3" /><span class="pt-val" id="tip-label-spacing-value">3</span></div>
      </div>
    </div>`;
}

function _sectionLabelShapes() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-square-fill"></i> Label Shapes</h3>
      <div class="pt-palette-row" title="Shape drawn alongside each tip label"><span class="pt-palette-label">Shape</span><select class="pt-palette-select" id="tip-label-shape"><option value="off">Off</option><option value="square">Square</option><option value="circle">Circle</option><option value="block">Block</option></select></div>
      <div id="tip-label-shape-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row" title="Fill colour of the tip label shape"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="tip-label-shape-color" value="#aaaaaa" /></div>
        <div class="pt-palette-row" title="Colour tip label shapes by an annotation attribute"><span class="pt-palette-label">Colour by <i class="bi bi-palette2 form-label-sm"></i></span><select class="pt-palette-select" id="tip-label-shape-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="tip-label-shape-palette-row" style="display:none" title="Colour palette for annotation-based label shape colouring"><span class="pt-palette-label">Palette <i class="bi bi-rainbow form-label-sm"></i></span><select class="pt-palette-select" id="tip-label-shape-palette-select"></select></div>
        <div class="pt-palette-row" id="tip-label-shape-scale-mode-row" style="display:none" title="How the numeric colour range is mapped"><span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span><select class="pt-palette-select" id="tip-label-shape-scale-mode-select"><option value="">Auto (min → max)</option><option value="symmetric-zero">Symmetric ±0</option><option value="zero-positive">From zero</option><option value="zero-one">0 → 1</option></select></div>
        <div class="pt-palette-row" title="Size of the label shape as a percentage of tip spacing"><span class="pt-palette-label">Size <i class="bi bi-box-arrow-up-right form-label-sm"></i></span><input type="range" class="form-range" id="tip-label-shape-size-slider" min="1" max="100" step="1" value="50" /><span class="pt-val" id="tip-label-shape-size-value">50</span></div>
        <div class="pt-palette-row" title="Left padding between the tip node and the shape"><span class="pt-palette-label">Pad left <i class="bi bi-arrow-bar-right form-label-sm"></i></span><input type="range" class="form-range" id="tip-label-shape-margin-left-slider" min="0" max="100" value="2" /><span class="pt-val" id="tip-label-shape-margin-left-value">2</span></div>
        <div class="pt-palette-row" id="tip-label-shape-spacing-row" style="display:none" title="Spacing between shapes in block layout mode"><span class="pt-palette-label">Spacing <i class="bi bi-arrows form-label-sm"></i></span><input type="range" class="form-range" id="tip-label-shape-spacing-slider" min="0" max="50" value="3" /><span class="pt-val" id="tip-label-shape-spacing-value">3</span></div>
      </div>
      ${[2,3,4,5,6,7,8,9,10].map(n => `
      <div id="tip-label-shape-${n}-section" class="pt-detail">
        <div class="pt-palette-row" title="Additional shape column ${n} for tip labels"><span class="pt-palette-label">Shape ${n}</span><select class="pt-palette-select" id="tip-label-shape-${n}"><option value="off">Off</option><option value="square">Square</option><option value="circle">Circle</option><option value="block">Block</option></select></div>
        <div id="tip-label-shape-${n}-detail" class="pt-detail pt-sub-controls">
          <div class="pt-palette-row" title="Colour shape ${n} by an annotation attribute"><span class="pt-palette-label">Colour by <i class="bi bi-palette2 form-label-sm"></i></span><select class="pt-palette-select" id="tip-label-shape-${n}-colour-by" disabled><option value="user_colour">user colour</option></select></div>
          <div class="pt-palette-row" id="tip-label-shape-${n}-palette-row" style="display:none" title="Colour palette for shape ${n}"><span class="pt-palette-label">Palette <i class="bi bi-rainbow form-label-sm"></i></span><select class="pt-palette-select" id="tip-label-shape-${n}-palette-select"></select></div>
          <div class="pt-palette-row" id="tip-label-shape-${n}-scale-mode-row" style="display:none" title="How the numeric colour range is mapped"><span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span><select class="pt-palette-select" id="tip-label-shape-${n}-scale-mode-select"><option value="">Auto (min → max)</option><option value="symmetric-zero">Symmetric ±0</option><option value="zero-positive">From zero</option><option value="zero-one">0 → 1</option></select></div>
        </div>
      </div>`).join('')}
    </div>`;
}

function _sectionTipShapes() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-circle-fill"></i> Tip Shapes</h3>
      <div class="pt-palette-row" title="Radius of the circle drawn at each tip node"><span class="pt-palette-label">Size <i class="bi bi-arrow-up-right-circle-fill form-label-sm"></i></span><input type="range" class="form-range" id="tip-size-slider" min="0" max="24" value="3" /><span class="pt-val" id="tip-size-value">3</span></div>
      <div id="tip-shape-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row" title="Fill colour of tip node circles"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="tip-shape-color" value="#888888" /></div>
        <div class="pt-palette-row" title="Background halo width around each tip circle"><span class="pt-palette-label">Halo <i class="bi bi-arrow-up-right-circle form-label-sm"></i></span><input type="range" class="form-range" id="tip-halo-slider" min="0" max="8" value="2" /><span class="pt-val" id="tip-halo-value">2</span></div>
        <div class="pt-palette-row" title="Halo colour behind each tip circle"><span class="pt-palette-label">Halo col. <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="tip-shape-bg-color" value="#02292e" /></div>
        <div class="pt-palette-row" title="Colour tip circles by an annotation attribute"><span class="pt-palette-label">Colour by <i class="bi bi-palette2 form-label-sm"></i></span><select class="pt-palette-select" id="tip-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="tip-palette-row" style="display:none" title="Colour palette for annotation-based tip circle colouring"><span class="pt-palette-label">Palette <i class="bi bi-rainbow form-label-sm"></i></span><select class="pt-palette-select" id="tip-palette-select"></select></div>
        <div class="pt-palette-row" id="tip-scale-mode-row" style="display:none" title="How the numeric colour range is mapped"><span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span><select class="pt-palette-select" id="tip-scale-mode-select"><option value="">Auto (min → max)</option><option value="symmetric-zero">Symmetric ±0</option><option value="zero-positive">From zero</option><option value="zero-one">0 → 1</option></select></div>
      </div>
    </div>`;
}

function _sectionNodeShapes() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-record-circle"></i> Node Shapes</h3>
      <div class="pt-palette-row" title="Radius of the circle drawn at each internal node"><span class="pt-palette-label">Size <i class="bi bi-arrow-up-right-circle-fill form-label-sm"></i></span><input type="range" class="form-range" id="node-size-slider" min="0" max="24" value="0" /><span class="pt-val" id="node-size-value">0</span></div>
      <div id="node-shape-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row" title="Fill colour of internal node circles"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="node-shape-color" value="#888888" /></div>
        <div class="pt-palette-row" title="Background halo width around each node circle"><span class="pt-palette-label">Halo <i class="bi bi-arrow-up-right-circle form-label-sm"></i></span><input type="range" class="form-range" id="node-halo-slider" min="0" max="8" value="2" /><span class="pt-val" id="node-halo-value">2</span></div>
        <div class="pt-palette-row" title="Halo colour behind each node circle"><span class="pt-palette-label">Halo col. <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="node-shape-bg-color" value="#02292e" /></div>
        <div class="pt-palette-row" title="Colour node circles by an annotation attribute"><span class="pt-palette-label">Colour by <i class="bi bi-palette2 form-label-sm"></i></span><select class="pt-palette-select" id="node-colour-by" disabled><option value="user_colour">user colour</option></select></div>
        <div class="pt-palette-row" id="node-palette-row" style="display:none" title="Colour palette for annotation-based node circle colouring"><span class="pt-palette-label">Palette <i class="bi bi-rainbow form-label-sm"></i></span><select class="pt-palette-select" id="node-palette-select"></select></div>
        <div class="pt-palette-row" id="node-scale-mode-row" style="display:none" title="How the numeric colour range is mapped"><span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span><select class="pt-palette-select" id="node-scale-mode-select"><option value="">Auto (min → max)</option><option value="symmetric-zero">Symmetric ±0</option><option value="zero-positive">From zero</option><option value="zero-one">0 → 1</option></select></div>
      </div>
    </div>`;
}

function _sectionNodeLabels() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-tag-fill"></i> Node Labels</h3>
      <div class="pt-palette-row" title="Show labels at internal nodes; choose which annotation to display"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="node-label-show" disabled><option value="">Off</option></select></div>
      <div id="node-label-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row" id="node-label-dp-row" style="display:none" title="Decimal places for numeric node labels"><span class="pt-palette-label">d.p. <i class="bi bi-three-dots form-label-sm"></i></span><select class="pt-palette-select" id="node-label-decimal-places"><option value="">Auto</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></div>
        <div class="pt-palette-row" title="Position of node labels relative to the node point"><span class="pt-palette-label">Position <i class="bi bi-diagram-2-fill form-label-sm" style="display:inline-block;transform:rotate(90deg)"></i></span><select class="pt-palette-select" id="node-label-position"><option value="right">Right</option><option value="above-left">Above left</option><option value="below-left">Below left</option></select></div>
        <div class="pt-palette-row" title="Font size of node labels"><span class="pt-palette-label">Size <i class="bi bi-fonts form-label-sm"></i></span><input type="range" class="form-range" id="node-label-font-size-slider" min="6" max="48" value="9" /><span class="pt-val" id="node-label-font-size-value">9</span></div>
        <div class="pt-palette-row" title="Typeface for node labels"><span class="pt-palette-label">Typeface <i class="bi bi-type form-label-sm"></i></span><select class="pt-palette-select" id="node-label-typeface-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row" title="Font style for node labels"><span class="pt-palette-label">Style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="node-label-typeface-style-select"><option value="">Theme</option></select></div>
        <div class="pt-palette-row" title="Node label text colour"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="node-label-color" value="#aaaaaa" /></div>
        <div class="pt-palette-row" title="Horizontal offset of node labels from the node point"><span class="pt-palette-label">Spacing <i class="bi bi-arrow-bar-right form-label-sm"></i></span><input type="range" class="form-range" id="node-label-spacing-slider" min="0" max="20" step="1" value="4" /><span class="pt-val" id="node-label-spacing-value">4</span></div>
      </div>
    </div>`;
}

function _sectionNodeBars() {
  return `
    <div class="pt-palette-section" id="node-bars-section">
      <h3><i class="bi bi-bar-chart-steps" style="display:inline-block;transform:rotate(180deg)"></i> Node Bars</h3>
      <div id="node-bars-unavail" style="display:block;font-size:0.78rem;color:var(--pt-text-muted);font-style:italic;padding:2px 0 4px;">Requires BEAST tree with height HPD</div>
      <div id="node-bars-controls" style="display:none">
        <div class="pt-palette-row" title="Show confidence interval bars (e.g. 95% HPD) on nodes"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="node-bars-show"><option value="off">Off</option><option value="on">On</option></select></div>
        <div id="node-bars-detail" class="pt-detail pt-sub-controls">
          <div class="pt-palette-row" title="Colour of the confidence bars"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="node-bars-color" value="#2aa198" /></div>
          <div class="pt-palette-row" title="Bar height in screen pixels"><span class="pt-palette-label">Size <i class="bi bi-arrows-expand form-label-sm"></i></span><input type="range" class="form-range" id="node-bars-width-slider" min="2" max="30" step="1" value="6" /><span class="pt-val" id="node-bars-width-value">6</span></div>
          <div class="pt-palette-row" title="Opacity of the confidence bar fill"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="node-bars-fill-opacity" min="0" max="1" step="0.05" value="0.22" /><span class="pt-val" id="node-bars-fill-opacity-value">0.22</span></div>
          <div class="pt-palette-row" title="Opacity of the confidence bar border"><span class="pt-palette-label">Stroke <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="node-bars-stroke-opacity" min="0" max="1" step="0.05" value="0.55" /><span class="pt-val" id="node-bars-stroke-opacity-value">0.55</span></div>
          <div class="pt-palette-row" title="Draw a vertical line at the mean or median of each bar"><span class="pt-palette-label">Line <i class="bi bi-vr form-label-sm"></i></span><select class="pt-palette-select" id="node-bars-median"><option value="off">(none)</option><option value="mean">Mean</option><option value="median">Median</option></select></div>
          <div class="pt-palette-row" title="Show or hide range values as text labels on each bar"><span class="pt-palette-label">Range <i class="bi bi-cursor-text form-label-sm" style="display:inline-block;transform:rotate(90deg)"></i></span><select class="pt-palette-select" id="node-bars-range"><option value="off">Hide</option><option value="on">Show</option></select></div>
        </div>
      </div>
    </div>`;
}

function _sectionCladeHighlights() {
  return `
    <div class="pt-palette-section" id="clade-highlights-section">

      <h3><i class="bi bi-highlighter"></i> Clade Highlights</h3>
      <div class="pt-palette-row" title="Colour clade highlights by an annotation attribute"><span class="pt-palette-label">Colour by <i class="bi bi-palette2 form-label-sm"></i></span><select class="pt-palette-select" id="clade-highlight-colour-by"><option value="user_colour">User colour</option></select></div>
      <div class="pt-palette-row" id="clade-highlight-palette-row" style="display:none" title="Colour palette for annotation-based highlight colouring"><span class="pt-palette-label">Palette <i class="bi bi-palette form-label-sm"></i></span><select class="pt-palette-select" id="clade-highlight-palette-select"></select></div>
      <div class="pt-palette-row" id="clade-highlight-scale-mode-row" style="display:none" title="How the numeric colour scale range is mapped"><span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span><select class="pt-palette-select" id="clade-highlight-scale-mode-select"><option value="">Auto (min→max)</option><option value="symmetric-zero">Symmetric ±0</option><option value="zero-positive">From zero</option><option value="zero-one">0 → 1</option></select></div>
      <div class="pt-palette-row" title="Shape of the left edge of clade highlight boxes"><span class="pt-palette-label">Left edge <i class="bi bi-arrow-left-square form-label-sm"></i></span><select class="pt-palette-select" id="clade-highlight-left-edge"><option value="atRoot">Rectangle</option><option value="outlineNodes">Outline subtree</option></select></div>
      <div class="pt-palette-row" title="Extent of the right edge of clade highlight boxes"><span class="pt-palette-label">Right edge <i class="bi bi-arrow-right-square form-label-sm"></i></span><select class="pt-palette-select" id="clade-highlight-right-edge"><option value="atTips">At tip</option><option value="atLabels">At label left</option><option value="atLabelsRight">At label right</option><option value="outlineTips">Outline tips</option></select></div>
      <div class="pt-palette-row" title="Padding around each highlighted clade in pixels"><span class="pt-palette-label">Padding <i class="bi bi-arrow-bar-right form-label-sm"></i></span><input type="range" class="form-range" id="clade-highlight-padding" min="0" max="40" step="1" value="4" /><span class="pt-val" id="clade-highlight-padding-value">4</span></div>
      <div class="pt-palette-row" title="Corner rounding radius of the highlight rectangle"><span class="pt-palette-label">Corners <i class="bi bi-radar form-label-sm"></i></span><input type="range" class="form-range" id="clade-highlight-radius" min="0" max="24" step="1" value="4" /><span class="pt-val" id="clade-highlight-radius-value">4</span></div>
      <div class="pt-palette-row" title="Opacity of the clade highlight fill"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="clade-highlight-fill-opacity" min="0" max="1" step="0.05" value="0.15" /><span class="pt-val" id="clade-highlight-fill-opacity-value">0.15</span></div>
      <div class="pt-palette-row" title="Opacity of the clade highlight border"><span class="pt-palette-label">Stroke <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="clade-highlight-stroke-opacity" min="0" max="1" step="0.05" value="0.7" /><span class="pt-val" id="clade-highlight-stroke-opacity-value">0.7</span></div>
      <div class="pt-palette-row" title="Border line width of clade highlights"><span class="pt-palette-label">Width <i class="bi bi-border-width form-label-sm"></i></span><input type="range" class="form-range" id="clade-highlight-stroke-width" min="0" max="6" step="0.5" value="1" /><span class="pt-val" id="clade-highlight-stroke-width-value">1</span></div>` +
      // <div class="pt-palette-subhead">Highlights</div>
      // <div id="clade-highlight-list" style="max-height:160px;overflow-y:auto;margin-bottom:4px"></div>
    `</div>`;
}

function _sectionCollapsedClades() {
  return `
    <div class="pt-palette-section" id="collapsed-clades-section">
      <h3><i class="bi bi-triangle" style="display:inline-block;transform:rotate(-90deg)"></i> Collapsed Clades</h3>
      <div class="pt-palette-row" title="Colour collapsed clade triangles by an annotation attribute"><span class="pt-palette-label">Colour by <i class="bi bi-palette2 form-label-sm"></i></span><select class="pt-palette-select" id="collapsed-clade-colour-by"><option value="user_colour">User colour</option></select></div>
      <div class="pt-palette-row" id="collapsed-clade-palette-row" style="display:none" title="Colour palette for annotation-based clade colouring"><span class="pt-palette-label">Palette <i class="bi bi-palette form-label-sm"></i></span><select class="pt-palette-select" id="collapsed-clade-palette-select"></select></div>
      <div class="pt-palette-row" id="collapsed-clade-scale-mode-row" style="display:none" title="How the numeric colour scale range is mapped"><span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span><select class="pt-palette-select" id="collapsed-clade-scale-mode-select"><option value="">Auto (min→max)</option><option value="symmetric-zero">Symmetric ±0</option><option value="zero-positive">From zero</option><option value="zero-one">0 → 1</option></select></div>
      <div class="pt-palette-row" title="Fill opacity of collapsed clade triangles"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="collapsed-opacity-slider" min="0" max="1" step="0.05" value="0.25" /><span class="pt-val" id="collapsed-opacity-value">0.25</span></div>
      <div class="pt-palette-row" title="Height of the clade triangle base in tip-row units"><span class="pt-palette-label">Span <i class="bi bi-arrows-vertical form-label-sm"></i></span><input type="range" class="form-range" id="collapsed-height-n-slider" min="1" max="20" step="1" value="3" /><span class="pt-val" id="collapsed-height-n-value">3</span></div>
      <div class="pt-palette-row" title="Font size of the collapsed clade label"><span class="pt-palette-label">Label size <i class="bi bi-fonts form-label-sm"></i></span><input type="range" class="form-range" id="collapsed-clade-font-size-slider" min="6" max="48" step="1" value="11" /><span class="pt-val" id="collapsed-clade-font-size-value">11</span></div>
      <div class="pt-palette-row" title="Typeface for collapsed clade labels"><span class="pt-palette-label">Typeface <i class="bi bi-type form-label-sm"></i></span><select class="pt-palette-select" id="collapsed-clade-typeface-select">${_TYPEFACES}</select></div>
      <div class="pt-palette-row" title="Font style for collapsed clade labels"><span class="pt-palette-label">Style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="collapsed-clade-typeface-style-select"><option value="">Theme</option></select></div>
    </div>`;
}

function _sectionLegend() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-card-list"></i> Legend</h3>
      <div class="pt-palette-row" title="Choose an annotation to display as a colour legend"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="legend-annotation" disabled><option value="">Off</option></select></div>
      <div id="legend-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row" title="Height of the primary legend as a percentage of canvas height"><span class="pt-palette-label">Span <i class="bi bi-arrows-expand form-label-sm"></i></span><input type="range" class="form-range" id="legend-height-pct-slider" min="10" max="100" step="5" value="100" /><span class="pt-val" id="legend-height-pct-value">100%</span></div>
        <div class="pt-palette-row" title="Primary legend text colour"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="legend-text-color" value="#f7eeca" /></div>
        <div class="pt-palette-row" title="Font size of legend text"><span class="pt-palette-label">Size <i class="bi bi-fonts form-label-sm"></i></span><input type="range" class="form-range" id="legend-font-size-slider" min="6" max="48" value="11" /><span class="pt-val" id="legend-font-size-value">11</span></div>
        <div class="pt-palette-row" title="Typeface for legend text"><span class="pt-palette-label">Typeface <i class="bi bi-type form-label-sm"></i></span><select class="pt-palette-select" id="legend-font-family-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row" title="Font style for legend text"><span class="pt-palette-label">Style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="legend-typeface-style-select"><option value="">Theme</option></select></div>
      </div>
      <div id="legend2-section" class="pt-detail">
        <div class="pt-palette-row" title="Choose a second annotation legend"><span class="pt-palette-label">Show 2</span><select class="pt-palette-select" id="legend-annotation-2"><option value="">Off</option></select></div>
        <div id="legend2-detail" class="pt-detail pt-sub-controls">
          <div class="pt-palette-row" title="Position of the second legend relative to the first"><span class="pt-palette-label">Position <i class="bi bi-box-arrow-down-right form-label-sm"></i></span><select class="pt-palette-select" id="legend2-show"><option value="right">Right</option><option value="below">Below</option></select></div>
          <div class="pt-palette-row" title="Height of the second legend as a percentage of canvas height"><span class="pt-palette-label">Span <i class="bi bi-arrows-expand form-label-sm"></i></span><input type="range" class="form-range" id="legend2-height-pct-slider" min="10" max="100" step="5" value="50" /><span class="pt-val" id="legend2-height-pct-value">50%</span></div>
        </div>
      </div>
      <div id="legend3-section" class="pt-detail">
        <div class="pt-palette-row" title="Choose a third annotation legend"><span class="pt-palette-label">Show 3</span><select class="pt-palette-select" id="legend-annotation-3"><option value="">Off</option></select></div>
        <div id="legend3-detail" class="pt-detail pt-sub-controls">
          <div class="pt-palette-row" title="Position of the third legend"><span class="pt-palette-label">Position <i class="bi bi-box-arrow-down-right form-label-sm"></i></span><select class="pt-palette-select" id="legend3-show"><option value="right">Right</option><option value="below">Below</option></select></div>
          <div class="pt-palette-row" title="Height of the third legend as a percentage of canvas height"><span class="pt-palette-label">Span <i class="bi bi-arrows-expand form-label-sm"></i></span><input type="range" class="form-range" id="legend3-height-pct-slider" min="10" max="100" step="5" value="50" /><span class="pt-val" id="legend3-height-pct-value">50%</span></div>
        </div>
      </div>
      <div id="legend4-section" class="pt-detail">
        <div class="pt-palette-row" title="Choose a fourth annotation legend"><span class="pt-palette-label">Show 4</span><select class="pt-palette-select" id="legend-annotation-4"><option value="">Off</option></select></div>
        <div id="legend4-detail" class="pt-detail pt-sub-controls">
          <div class="pt-palette-row" title="Position of the fourth legend"><span class="pt-palette-label">Position <i class="bi bi-box-arrow-down-right form-label-sm"></i></span><select class="pt-palette-select" id="legend4-show"><option value="right">Right</option><option value="below">Below</option></select></div>
          <div class="pt-palette-row" title="Height of the fourth legend as a percentage of canvas height"><span class="pt-palette-label">Span <i class="bi bi-arrows-expand form-label-sm"></i></span><input type="range" class="form-range" id="legend4-height-pct-slider" min="10" max="100" step="5" value="50" /><span class="pt-val" id="legend4-height-pct-value">50%</span></div>
        </div>

      </div>
    </div>`;
}

function _sectionAxis() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-rulers" style="display:inline-block;transform:rotate(-90deg)"></i> Axis</h3>
      <div class="pt-palette-row" title="Show a scale axis; choose direction or time-calibrated mode"><span class="pt-palette-label">Show</span><select class="pt-palette-select" id="axis-show"><option value="off">Off</option><option value="forward">Forward</option><option value="reverse">Reverse</option><option value="time">Time</option></select></div>
      <div id="axis-detail" class="pt-detail pt-sub-controls">
        <div class="pt-palette-row" title="Axis lines and tick label colour"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="axis-color" value="#f2f1e6" /></div>
        <div class="pt-palette-row" title="Font size of axis tick labels"><span class="pt-palette-label">Size <i class="bi bi-fonts form-label-sm"></i></span><input type="range" class="form-range" id="axis-font-size-slider" min="6" max="48" value="9" /><span class="pt-val" id="axis-font-size-value">9</span></div>
        <div class="pt-palette-row" title="Typeface for axis tick labels"><span class="pt-palette-label">Typeface <i class="bi bi-type form-label-sm"></i></span><select class="pt-palette-select" id="axis-font-family-select">${_TYPEFACES}</select></div>
        <div class="pt-palette-row" title="Font style for axis tick labels"><span class="pt-palette-label">Style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="axis-typeface-style-select"><option value="">Theme</option></select></div>
        <div class="pt-palette-row" title="Axis line width in screen pixels"><span class="pt-palette-label">Line <i class="bi bi-border-width form-label-sm"></i></span><input type="range" class="form-range" id="axis-line-width-slider" min="0.5" max="4" step="0.5" value="1" /><span class="pt-val" id="axis-line-width-value">1</span></div>
        <div class="pt-palette-row" id="axis-date-format-row" style="display:none" title="Date format for time-calibrated axis labels"><span class="pt-palette-label">Format <i class="bi bi-calendar-check form-label-sm"></i></span><select class="pt-palette-select" id="axis-date-format"><option value="yyyy-MM-dd">1977-05-04</option><option value="yyyy-MMM-dd">1977-May-04</option><option value="dd MMM yyyy">04 May 1977</option><option value="dd MMMM yyyy">04 May 1977 (long month)</option><option value="MMM dd, yyyy">May 04, 1977</option><option value="MMMM dd, yyyy">May 04, 1977 (long month)</option><option value="MMM-dd-yyyy">May-04-1977</option></select></div>
        <div class="pt-palette-row" id="axis-major-interval-row" style="display:none" title="Spacing between major labelled axis ticks"><span class="pt-palette-label">Major ticks <i class="bi bi-text-left form-label-sm" style="display:inline-block;transform:rotate(90deg) scaleY(-1)"></i></span><select class="pt-palette-select" id="axis-major-interval"><option value="auto">Auto</option><option value="millennia">Millennia</option><option value="centuries">Centuries</option><option value="decades">Decades</option><option value="years">Years</option><option value="quarters">Quarters</option><option value="months">Months</option><option value="weeks">Weeks</option><option value="days">Days</option></select></div>
        <div class="pt-palette-row" id="axis-minor-interval-row" style="display:none" title="Spacing between minor unlabelled axis ticks"><span class="pt-palette-label">Minor ticks <i class="bi bi-text-left form-label-sm" style="display:inline-block;transform:rotate(90deg)"></i></span><select class="pt-palette-select" id="axis-minor-interval"><option value="off">Off</option></select></div>
        <div class="pt-palette-row" id="axis-major-label-row" style="display:none" title="Label format for major axis ticks"><span class="pt-palette-label">Major labels <i class="bi bi-tags form-label-sm"></i></span><select class="pt-palette-select" id="axis-major-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
        <div class="pt-palette-row" id="axis-minor-label-row" style="display:none" title="Label format for minor axis ticks"><span class="pt-palette-label">Minor labels <i class="bi bi-tag form-label-sm"></i></span><select class="pt-palette-select" id="axis-minor-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
      </div>
    </div>`;
}

function _sectionRtt() {
  return `
    <div class="pt-palette-section" id="rtt-section">
      <h3><i class="bi bi-graph-up"></i> Root-to-tip</h3>
      <div class="pt-palette-row" title="Starting point of the root-to-tip X axis"><span class="pt-palette-label">X-axis origin <i class="bi bi-arrow-down-left form-label-sm"></i></span><select class="pt-palette-select" id="rtt-x-origin"><option value="data">data range</option><option value="root">root age</option></select></div>
      <div class="pt-palette-row" title="Aspect ratio of the root-to-tip chart panel"><span class="pt-palette-label">Aspect ratio <i class="bi bi-aspect-ratio form-label-sm"></i></span><select class="pt-palette-select" id="rtt-aspect-ratio"><option value="fit">fit panel</option><option value="1:1">1 : 1 (square)</option><option value="4:3">4 : 3</option><option value="3:2">3 : 2</option><option value="16:9">16 : 9</option></select></div>
      <div class="pt-palette-row" title="Grid lines to show on the root-to-tip chart"><span class="pt-palette-label">Grid lines <i class="bi bi-border-inner form-label-sm"></i></span><select class="pt-palette-select" id="rtt-grid-lines"><option value="both">both</option><option value="horizontal">horizontal</option><option value="vertical">vertical</option><option value="off">off</option></select></div>
      <div class="pt-palette-subhead">Regression line</div>
      <div class="pt-palette-row" title="Line style of the regression line"><span class="pt-palette-label">Reg. line <i class="bi bi-border-style form-label-sm"></i></span><select class="pt-palette-select" id="rtt-regression-style"><option value="solid">Solid</option><option value="bigdash">Big dash</option><option value="dash">Dash</option><option value="dots">Dots</option></select></div>
      <div class="pt-palette-row" title="Colour of the regression line"><span class="pt-palette-label">Reg. colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="rtt-regression-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row" title="Width of the regression line in pixels"><span class="pt-palette-label">Reg. width <i class="bi bi-border-width form-label-sm"></i></span><input type="range" class="form-range" id="rtt-regression-width-slider" min="0.5" max="6" step="0.5" value="1.5" /><span class="pt-val" id="rtt-regression-width-value">1.5</span></div>
      <div class="pt-palette-subhead">±2σ residual band</div>
      <div class="pt-palette-row" title="Show band around regression line: ±2σ residual lines or 95% confidence interval for the mean"><span class="pt-palette-label">Band <i class="bi bi-file-bar-graph form-label-sm"></i></span><select class="pt-palette-select" id="rtt-resid-band-show"><option value="off">Off</option><option value="residual">±2σ residual</option><option value="ci">95% CI</option></select></div>
      <div class="pt-palette-row" title="Style of the ±2σ band boundary lines"><span class="pt-palette-label">Style <i class="bi bi-border-style form-label-sm"></i></span><select class="pt-palette-select" id="rtt-resid-band-style"><option value="solid">Solid</option><option value="bigdash">Big dash</option><option value="dash">Dash</option><option value="dots">Dots</option></select></div>
      <div class="pt-palette-row" title="Colour of the ±2σ band boundary lines"><span class="pt-palette-label">Colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="rtt-resid-band-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row" title="Width of the ±2σ band boundary lines in pixels"><span class="pt-palette-label">Width <i class="bi bi-border-width form-label-sm"></i></span><input type="range" class="form-range" id="rtt-resid-band-width-slider" min="0" max="6" step="0.5" value="1" /><span class="pt-val" id="rtt-resid-band-width-value">1</span></div>
      <div class="pt-palette-row" title="Fill colour of the ±2σ band area"><span class="pt-palette-label">Fill <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="rtt-resid-band-fill-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row" title="Opacity of the ±2σ band fill"><span class="pt-palette-label">Fill opacity <i class="bi bi-circle-half form-label-sm"></i></span><input type="range" class="form-range" id="rtt-resid-band-fill-opacity-slider" min="0" max="1" step="0.05" value="0.1" /><span class="pt-val" id="rtt-resid-band-fill-opacity-value">0.1</span></div>
      <div class="pt-palette-subhead">Statistics box</div>
      <div class="pt-palette-row pt-rtt-adv-row" title="Background colour of the statistics summary box"><span class="pt-palette-label">Box bg <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="rtt-stats-bg-color" value="#081c22" /></div>
      <div class="pt-palette-row pt-rtt-adv-row" title="Text colour of the statistics summary box"><span class="pt-palette-label">Box text <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="rtt-stats-text-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row pt-rtt-adv-row" title="Font size of the statistics summary box"><span class="pt-palette-label">Box font <i class="bi bi-fonts form-label-sm"></i></span><input type="range" class="form-range" id="rtt-stats-font-size-slider" min="6" max="32" value="11" /><span class="pt-val" id="rtt-stats-font-size-value">11</span></div>
      <div class="pt-palette-subhead">Axes</div>
      <div class="pt-palette-row" title="Root-to-tip chart axis colour"><span class="pt-palette-label">Axis colour <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="rtt-axis-color" value="#f2f1e6" /></div>
      <div class="pt-palette-row" title="Font size of root-to-tip axis labels"><span class="pt-palette-label">Axis font <i class="bi bi-fonts form-label-sm"></i></span><input type="range" class="form-range" id="rtt-axis-font-size-slider" min="6" max="48" value="9" /><span class="pt-val" id="rtt-axis-font-size-value">9</span></div>
      <div class="pt-palette-row" title="Root-to-tip axis line width in pixels"><span class="pt-palette-label">Axis line <i class="bi bi-border-width form-label-sm"></i></span><input type="range" class="form-range" id="rtt-axis-line-width-slider" min="0.5" max="4" step="0.5" value="1" /><span class="pt-val" id="rtt-axis-line-width-value">1</span></div>
      <div class="pt-palette-row" title="Typeface for root-to-tip axis labels"><span class="pt-palette-label">Typeface <i class="bi bi-type form-label-sm"></i></span><select class="pt-palette-select" id="rtt-axis-font-family-select">${_TYPEFACES}</select></div>
      <div class="pt-palette-row" title="Font style for root-to-tip axis labels"><span class="pt-palette-label">Style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="rtt-axis-typeface-style-select"><option value="">Theme</option></select></div>
      <div class="pt-palette-row" id="rtt-date-format-row" style="display:none" title="Date format for time-calibrated root-to-tip axis"><span class="pt-palette-label">Format <i class="bi bi-calendar-check form-label-sm"></i></span><select class="pt-palette-select" id="rtt-date-format"><option value="yyyy-MM-dd">1977-05-04</option><option value="yyyy-MMM-dd">1977-May-04</option><option value="dd MMM yyyy">04 May 1977</option><option value="dd MMMM yyyy">04 May 1977 (long month)</option><option value="MMM dd, yyyy">May 04, 1977</option><option value="MMMM dd, yyyy">May 04, 1977 (long month)</option><option value="MMM-dd-yyyy">May-04-1977</option></select></div>
      <div class="pt-palette-row" id="rtt-major-interval-row" style="display:none" title="Spacing between major labelled root-to-tip axis ticks"><span class="pt-palette-label">Major ticks <i class="bi bi-text-left form-label-sm" style="display:inline-block;transform:rotate(90deg) scaleY(-1)"></i></span><select class="pt-palette-select" id="rtt-major-interval"><option value="auto">Auto</option><option value="millennia">Millennia</option><option value="centuries">Centuries</option><option value="decades">Decades</option><option value="years">Years</option><option value="quarters">Quarters</option><option value="months">Months</option><option value="weeks">Weeks</option><option value="days">Days</option></select></div>
      <div class="pt-palette-row" id="rtt-minor-interval-row" style="display:none" title="Spacing between minor root-to-tip axis ticks"><span class="pt-palette-label">Minor ticks <i class="bi bi-text-left form-label-sm" style="display:inline-block;transform:rotate(90deg)"></i></span><select class="pt-palette-select" id="rtt-minor-interval"><option value="off">Off</option></select></div>
      <div class="pt-palette-row" id="rtt-major-label-row" style="display:none" title="Label format for major root-to-tip ticks"><span class="pt-palette-label">Major labels <i class="bi bi-tags form-label-sm"></i></span><select class="pt-palette-select" id="rtt-major-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
      <div class="pt-palette-row" id="rtt-minor-label-row" style="display:none" title="Label format for minor root-to-tip ticks"><span class="pt-palette-label">Minor labels <i class="bi bi-tag form-label-sm"></i></span><select class="pt-palette-select" id="rtt-minor-label"><option value="component">Component</option><option value="partial">Partial</option><option value="full">Full</option><option value="off">Off</option></select></div>
    </div>`;
}

function _sectionTheme() {
  return `
    <div class="pt-palette-section">
      <h3><i class="bi bi-palette2"></i> Theme</h3>
      <div class="pt-palette-row--span"><select class="pt-palette-select" id="theme-select"></select></div>
      <div class="pt-palette-row--span" style="gap:6px">
        <button id="btn-store-theme" class="pt-theme-btn" style="flex:1" title="Save current settings as a named theme" disabled>Store</button>
        <button id="btn-default-theme" class="pt-theme-btn" style="flex:1" title="Set selected theme as the default" disabled>Default</button>
        <button id="btn-remove-theme" class="pt-theme-btn" style="flex:1" title="Remove this user-saved theme" disabled>Remove</button>
      </div>
      <div class="pt-palette-row--span" style="gap:6px">
        <button id="btn-export-theme" class="pt-theme-btn" style="flex:1" title="Export theme as a JSON file">Export</button>
        <button id="btn-import-theme" class="pt-theme-btn" style="flex:1" title="Import a theme from a JSON file">Import</button>
      </div>
      <div class="pt-palette-row" title="Default typeface used throughout the tree (overridable per section)"><span class="pt-palette-label">Typeface <i class="bi bi-type form-label-sm"></i></span><select class="pt-palette-select" id="font-family-select"><option value="Monospace">Monospace</option><option value="Sans-serif">Sans-serif</option><option value="Serif">Serif</option><option value="Courier New">Courier New</option><option value="Helvetica">Helvetica</option><option value="Helvetica Neue">Helvetica Neue</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="System UI">System UI</option><option value="Menlo">Menlo</option></select></div>
      <div class="pt-palette-row" title="Default font style used throughout the tree"><span class="pt-palette-label">Style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="font-typeface-style-select"><option value="Regular">Regular</option></select></div>
    </div>`;
}

function _sectionSelectionHover() {
  return `
    <div class="pt-palette-section" id="selection-hover-section">
      <h3><i class="bi bi-cursor-fill"></i> Selection &amp; Hover</h3>
      <div class="pt-palette-subhead">Selected Tips</div>
      <div class="pt-palette-row" title="Font style applied to labels of selected tips"><span class="pt-palette-label">Label style <i class="bi bi-type-italic form-label-sm"></i></span><select class="pt-palette-select" id="selected-label-style"><option value="bold">Bold</option><option value="italic">Italic</option><option value="bold italic">Bold + Italic</option><option value="normal">Normal</option></select></div>
      <div class="pt-palette-row" title="Growth factor applied to tip circle radius when selected"><span class="pt-palette-label">Size <i class="bi bi-arrow-up-right-circle form-label-sm"></i></span><input type="range" class="form-range" id="selected-tip-growth" min="1" max="5" step="0.1" value="2" /><span class="pt-val" id="selected-tip-growth-value">2</span></div>
      <div class="pt-palette-row" title="Fill colour of the selection circle on tips"><span class="pt-palette-label">Fill <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="selected-tip-fill" value="#888888" /></div>
      <div class="pt-palette-row" title="Minimum diameter of the selection circle on tips in pixels"><span class="pt-palette-label">Fill <i class="bi bi-arrow-up-right-circle form-label-sm"></i></span><input type="range" class="form-range" id="selected-tip-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="selected-tip-min-size-value">6</span></div>
      <div class="pt-palette-row" title="Opacity of the selected tip fill circle"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="selected-tip-fill-opacity" min="0" max="1" step="0.05" value="0.5" /><span class="pt-val" id="selected-tip-fill-opacity-value">0.5</span></div>
      <div class="pt-palette-row" title="Stroke colour of the selection circle on tips"><span class="pt-palette-label">Stroke <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="selected-tip-stroke" value="#e06961" /></div>
      <div class="pt-palette-row" title="Stroke width of the selection circle on tips"><span class="pt-palette-label">Stroke <i class="bi bi-record-circle form-label-sm"></i></span><input type="range" class="form-range" id="selected-tip-stroke-width" min="0.5" max="10" step="0.5" value="3" /><span class="pt-val" id="selected-tip-stroke-width-value">3</span></div>
      <div class="pt-palette-row" title="Opacity of the selected tip stroke"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="selected-tip-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="selected-tip-stroke-opacity-value">1</span></div>
      <div class="pt-palette-subhead">MRCA Node</div>
      <div class="pt-palette-row" title="Growth factor applied to the MRCA node circle radius when selected"><span class="pt-palette-label">Size <i class="bi bi-box-arrow-up-right form-label-sm"></i></span><input type="range" class="form-range" id="selected-node-growth" min="1" max="5" step="0.1" value="2" /><span class="pt-val" id="selected-node-growth-value">2</span></div>
      <div class="pt-palette-row" title="Fill colour of the MRCA node selection circle"><span class="pt-palette-label">Fill <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="selected-node-fill" value="#19a699" /></div>
      <div class="pt-palette-row" title="Minimum diameter of the MRCA node selection circle in pixels"><span class="pt-palette-label">Fill <i class="bi bi-arrow-up-right-circle form-label-sm"></i></span><input type="range" class="form-range" id="selected-node-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="selected-node-min-size-value">6</span></div>
      <div class="pt-palette-row" title="Opacity of the MRCA node fill circle"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="selected-node-fill-opacity" min="0" max="1" step="0.05" value="0.5" /><span class="pt-val" id="selected-node-fill-opacity-value">0.5</span></div>
      <div class="pt-palette-row" title="Stroke colour of the MRCA node selection circle"><span class="pt-palette-label">Stroke <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="selected-node-stroke" value="#19a699" /></div>
      <div class="pt-palette-row" title="Stroke width of the MRCA node selection circle"><span class="pt-palette-label">Stroke <i class="bi bi-record-circle form-label-sm"></i></span><input type="range" class="form-range" id="selected-node-stroke-width" min="0.5" max="10" step="0.5" value="3" /><span class="pt-val" id="selected-node-stroke-width-value">3</span></div>
      <div class="pt-palette-row" title="Opacity of the MRCA node stroke"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="selected-node-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="selected-node-stroke-opacity-value">1</span></div>
      <div class="pt-palette-subhead">Tip Hover</div>
      <div class="pt-palette-row" title="Growth factor applied to the tip circle radius on hover"><span class="pt-palette-label">Size <i class="bi bi-box-arrow-up-right form-label-sm"></i></span><input type="range" class="form-range" id="tip-hover-growth" min="1" max="5" step="0.1" value="1.5" /><span class="pt-val" id="tip-hover-growth-value">1.5</span></div>
      <div class="pt-palette-row" title="Fill colour of the tip hover circle"><span class="pt-palette-label">Fill <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="tip-hover-fill" value="#bf4b43" /></div>
      <div class="pt-palette-row" title="Minimum diameter of the tip hover circle in pixels"><span class="pt-palette-label">Fill <i class="bi bi-arrow-up-right-circle form-label-sm"></i></span><input type="range" class="form-range" id="tip-hover-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="tip-hover-min-size-value">6</span></div>
      <div class="pt-palette-row" title="Opacity of the tip hover fill circle"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="tip-hover-fill-opacity" min="0" max="1" step="0.05" value="0.6" /><span class="pt-val" id="tip-hover-fill-opacity-value">0.6</span></div>
      <div class="pt-palette-row" title="Stroke colour of the tip hover circle"><span class="pt-palette-label">Stroke <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="tip-hover-stroke" value="#7b2820" /></div>
      <div class="pt-palette-row" title="Stroke width of the tip hover circle"><span class="pt-palette-label">Stroke <i class="bi bi-record-circle form-label-sm"></i></span><input type="range" class="form-range" id="tip-hover-stroke-width" min="0.5" max="10" step="0.5" value="2" /><span class="pt-val" id="tip-hover-stroke-width-value">2</span></div>
      <div class="pt-palette-row" title="Opacity of the tip hover stroke"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half-label-sm"></i></span><input type="range" class="form-range" id="tip-hover-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="tip-hover-stroke-opacity-value">1</span></div>
      <div class="pt-palette-subhead">Node Hover</div>
      <div class="pt-palette-row" title="Growth factor applied to the node circle radius on hover"><span class="pt-palette-label">Size <i class="bi bi-box-arrow-up-right form-label-sm"></i></span><input type="range" class="form-range" id="node-hover-growth" min="1" max="5" step="0.1" value="1.5" /><span class="pt-val" id="node-hover-growth-value">1.5</span></div>
      <div class="pt-palette-row" title="Fill colour of the node hover circle"><span class="pt-palette-label">Fill <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="node-hover-fill" value="#19a699" /></div>
      <div class="pt-palette-row" title="Minimum diameter of the node hover circle in pixels"><span class="pt-palette-label">Fill <i class="bi bi-arrow-up-right-circle form-label-sm"></i></span><input type="range" class="form-range" id="node-hover-min-size" min="0" max="20" step="0.5" value="6" /><span class="pt-val" id="node-hover-min-size-value">6</span></div>
      <div class="pt-palette-row" title="Opacity of the node hover fill circle"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="node-hover-fill-opacity" min="0" max="1" step="0.05" value="0.6" /><span class="pt-val" id="node-hover-fill-opacity-value">0.6</span></div>
      <div class="pt-palette-row" title="Stroke colour of the node hover circle"><span class="pt-palette-label">Stroke <i class="bi bi-palette form-label-sm"></i></span><input type="color" class="pt-palette-color" id="node-hover-stroke" value="#0d6560" /></div>
      <div class="pt-palette-row" title="Stroke width of the node hover circle"><span class="pt-palette-label">Stroke <i class="bi bi-record-circle form-label-sm"></i></span><input type="range" class="form-range" id="node-hover-stroke-width" min="0.5" max="10" step="0.5" value="2" /><span class="pt-val" id="node-hover-stroke-width-value">2</span></div>
      <div class="pt-palette-row" title="Opacity of the node hover stroke"><span class="pt-palette-label">Opacity <i class="bi bi-droplet-half form-label-sm"></i></span><input type="range" class="form-range" id="node-hover-stroke-opacity" min="0" max="1" step="0.05" value="1" /><span class="pt-val" id="node-hover-stroke-opacity-value">1</span></div>
    </div>`;
}

const _SECTION_BUILDERS = {
  tree:            _sectionTree,
  branches:        _sectionBranches,
  tipLabels:       _sectionTipLabels,
  labelShapes:     _sectionLabelShapes,
  tipShapes:       _sectionTipShapes,
  nodeShapes:      _sectionNodeShapes,
  nodeLabels:      _sectionNodeLabels,
  nodeBars:        _sectionNodeBars,
  cladeHighlights: _sectionCladeHighlights,
  collapsedClades: _sectionCollapsedClades,
  legend:          _sectionLegend,
  axis:            _sectionAxis,
  rtt:             _sectionRtt,
  theme:           _sectionTheme,
  selectionHover:  _sectionSelectionHover,
};

const _ALL_SECTIONS = [
  'tree', 'branches', 'tipLabels', 'labelShapes', 'tipShapes', 'nodeShapes', 'nodeLabels',
  'nodeBars', 'cladeHighlights', 'collapsedClades', 'legend', 'axis', 'rtt', 'theme',
  'selectionHover', 
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

// ══════════════════════════════════════════════════════════════════════════
// App HTML builder
// ══════════════════════════════════════════════════════════════════════════
//
// buildAppHTML(sections)
//
// Returns the complete inner HTML string for the PearTree application shell.
// Used by both the standalone webapp (peartree.html injects via a host
// placeholder) and the embed path (peartree-embed.js calls it directly).
//
// sections  'all'     – include every section (default)
//           string[]  – array of section keys to include:
//   'toolbar'         – the full <nav> toolbar
//   'canvasContainer' – canvas area, data-table panel, RTT panel
//   'statusBar'       – status / brand bar
//   'modals'          – all dialog overlays
//   'helpAbout'       – help + about side panels
//   'palette'         – palette-panel-host placeholder (always injected by
//                       the palette IIFE; listed here so embed can omit it)
//
// Toolbar sub-sections (passed as toolbarSections on window.peartreeConfig):
//   'fileOps'         – open / import / export buttons
//   'navigation'      – back/forward/drill/climb/home
//   'zoom'            – zoom in/out + fit buttons
//   'order'           – ascending / descending order buttons
//   'rotate'          – rotate node/subtree buttons
//   'reroot'          – selection-mode + reroot/midpoint/temporal buttons
//   'hideShow'        – collapse/expand subtree + clade buttons
//   'colour'          – user-colour picker group
//   'filter'          – tip filter input
//   'panels'          – data-table and RTT panel toggle buttons

function _tbSectionFileOps() {
  return `
    <button id="btn-open-tree" class="btn btn-sm btn-outline-primary" title="Open tree file (⌘O)"><i class="bi bi-folder2-open"></i></button>
    <button id="btn-import-annot" class="btn btn-sm btn-outline-success" disabled title="Import annotations from CSV/TSV (⌘⇧O)"><i class="bi bi-table"></i></button>
    <button id="btn-export-tree" class="btn btn-sm btn-outline-info" disabled title="Export tree (Newick or NEXUS)"><i class="bi bi-file-earmark-arrow-down"></i></button>
    <button id="btn-export-graphic" class="btn btn-sm btn-outline-warning" disabled title="Download graphic (SVG or PNG)"><i class="bi bi-image"></i></button>`;
}

function _tbSectionNavigation() {
  return `
    <div class="btn-group" role="group" aria-label="Navigate history">
      <button id="btn-back" class="btn btn-sm btn-outline-secondary" disabled title="Navigate back (⌘[)"><i class="bi bi-chevron-left"></i></button>
      <button id="btn-forward" class="btn btn-sm btn-outline-secondary" disabled title="Navigate forward (⌘])"><i class="bi bi-chevron-right"></i></button>
    </div>
    <div class="btn-group ms-1" role="group" aria-label="Navigate subtree">
      <button id="btn-drill" class="btn btn-sm btn-outline-secondary" disabled title="Drill into subtree (⌘⇧>)"><i class="bi bi-box-arrow-in-right"></i></button>
      <button id="btn-climb" class="btn btn-sm btn-outline-secondary" disabled title="Climb out one level (⌘⇧<)"><i class="bi bi-box-arrow-left"></i></button>
      <button id="btn-home" class="btn btn-sm btn-outline-secondary" disabled title="Navigate to root (⌘\\)"><i class="bi bi-house"></i></button>
    </div>`;
}

function _tbSectionZoom() {
  return `
    <div class="btn-group" role="group" aria-label="Zoom">
      <button id="btn-zoom-in" class="btn btn-sm btn-outline-secondary" disabled title="Zoom in (⌘+)"><i class="bi bi-zoom-in"></i></button>
      <button id="btn-zoom-out" class="btn btn-sm btn-outline-secondary" disabled title="Zoom out (⌘−)"><i class="bi bi-zoom-out"></i></button>
    </div>
    <div class="btn-group" role="group" aria-label="Fit view">
      <button id="btn-fit" class="btn btn-sm btn-outline-secondary" disabled title="Fit all (⌘0)"><i class="bi bi-arrows-fullscreen"></i></button>
      <button id="btn-fit-labels" class="btn btn-sm btn-outline-secondary" disabled title="Fit labels (⌘⇧0)"><i class="bi bi-type"></i></button>
    </div>`;
}

function _tbSectionOrder() {
  return `
    <div class="btn-group" role="group" aria-label="Branch order">
      <button id="btn-order-asc" class="btn btn-sm btn-outline-secondary" disabled title="Order branches ascending by clade size (⌘U)"><i class="bi bi-sort-up"></i></button>
      <button id="btn-order-desc" class="btn btn-sm btn-outline-secondary" disabled title="Order branches descending by clade size (⌘D)"><i class="bi bi-sort-up"></i></button>
    </div>`;
}

function _tbSectionRotate() {
  return `
    <div class="btn-group" role="group" aria-label="Rotate node">
      <button id="btn-rotate" class="btn btn-sm btn-outline-secondary" disabled title="Rotate selected node"><i class="bi bi-repeat" style="display:inline-block;transform:rotate(90deg)"></i></button>
      <button id="btn-rotate-all" class="btn btn-sm btn-outline-secondary" disabled title="Rotate all nodes in subtree"><i class="bi bi-symmetry-horizontal" style="display:inline-block;transform:scaleX(-1)"></i></button>
    </div>`;
}

function _tbSectionReroot() {
  return `
    <button id="btn-invert-selection" class="btn btn-sm btn-outline-secondary" disabled title="Invert selection (⌘⇧I)"><i class="bi bi-arrow-left-right"></i></button>
    <div id="reroot-controls">
      <div class="btn-group" role="group" aria-label="Selection mode">
        <button id="btn-mode-nodes" class="btn btn-sm btn-outline-secondary active" disabled title="Select nodes mode"><i class="bi bi-circle" style="display:inline-block;transform:rotate(-90deg)"></i></button>
        <button id="btn-mode-branches" class="btn btn-sm btn-outline-secondary" disabled title="Toggle branches/nodes mode (⌘B)"><i class="bi bi-dash-lg"></i></button>
      </div>
      <div class="pt-toolbar-sep"></div>
      <div class="btn-group" role="group" aria-label="Rooting">
        <button id="btn-reroot" class="btn btn-sm btn-outline-secondary" disabled title="Reroot tree at selection"><i class="bi bi-arrow-return-left"></i></button>
        <button id="btn-midpoint-root" class="btn btn-sm btn-outline-secondary" disabled title="Midpoint root (⌘M)"><i class="bi bi-chevron-bar-contract" style="display:inline-block;transform:rotate(90deg)"></i></button>
        <button id="btn-temporal-root-global" class="btn btn-sm btn-outline-secondary" disabled title="Global temporal root (⌘R)"><i class="bi bi-clock"></i></button>
        <button id="btn-temporal-root" class="btn btn-sm btn-outline-secondary" disabled title="Optimise root on current branch (⇧⌘R)"><i class="bi bi-clock-history"></i></button>
      </div>
    </div>`;
}

function _tbSectionHideShow() {
  return `
    <div class="btn-group" role="group" aria-label="Hide/show subtree">
      <button id="btn-hide" class="btn btn-sm btn-outline-secondary" disabled title="Collapse selected subtree"><i class="bi bi-node-minus"></i></button>
      <button id="btn-show" class="btn btn-sm btn-outline-secondary" disabled title="Expand selected collapsed subtree"><i class="bi bi-node-plus"></i></button>
    </div>
    <div class="btn-group ms-1" role="group" aria-label="Collapse/expand clade">
      <button id="btn-collapse-clade" class="btn btn-sm btn-outline-secondary" disabled title="Collapse selected clade to triangle"><i class="bi bi-arrows-collapse"></i></button>
      <button id="btn-expand-clade" class="btn btn-sm btn-outline-secondary" disabled title="Expand collapsed clade triangle"><i class="bi bi-arrows-expand"></i></button>
    </div>`;
}

function _tbSectionColour() {
  return `
    <div class="pt-colour-pick-wrap" id="colour-pick-wrap">
      <button id="btn-colour-trigger" disabled title="Choose colour for selected nodes"><span id="btn-colour-trigger-swatch"></span></button>
      <input type="color" id="btn-node-colour" value="#ff8800" tabindex="-1">
      <div id="colour-picker-popup">
        <div class="pt-cp-native-row">
          <input type="color" id="btn-colour-native-open" value="#ff8800" title="Open colour picker…">
          <span style="font-size:0.75rem;color:var(--pt-text-status-sep);">Custom colour…</span>
        </div>
        <div id="colour-picker-recent-row" class="pt-cp-row">
          <span class="pt-cp-label">Recent</span>
          <div class="pt-cp-swatches" id="colour-picker-recent"></div>
        </div>
        <hr class="pt-cp-divider">
        <div id="colour-picker-palettes"></div>
      </div>
      <div class="btn-group" role="group" aria-label="Colour nodes">
        <button id="btn-apply-user-colour" class="btn btn-sm btn-outline-secondary" disabled title="Apply colour to selected nodes"><i class="bi bi-brush"></i></button>
        <button id="btn-clear-user-colour" class="btn btn-sm btn-outline-secondary" disabled title="Clear all user colours"><i class="bi bi-eraser"></i></button>
      </div>
      <div class="btn-group" role="group" aria-label="Highlight clade">
        <button id="btn-highlight-clade" class="btn btn-sm btn-outline-secondary" disabled title="Highlight selected clade"><i class="bi bi-highlighter"></i></button>
        <button id="btn-clear-highlights" class="btn btn-sm btn-outline-secondary" disabled title="Remove clade highlight"><i class="bi bi-eraser"></i></button>
      </div>
    </div>`;
}

function _tbSectionFilter() {
  return `
    <div class="pt-filter-wrap">
      <div class="pt-filter-group">
        <input type="search" id="tip-filter" class="pt-filter-input" placeholder="Filter tips…" disabled autocomplete="off" spellcheck="false">
        <button id="btn-filter-regex" class="pt-filter-col-btn" disabled title="Use regular expression"><i class="bi bi-regex"></i></button>
        <div class="pt-filter-col-wrap">
          <button id="btn-filter-col" class="pt-filter-col-btn" disabled title="Search in: Name"><i class="bi bi-funnel"></i></button>
          <div id="filter-col-popup"></div>
        </div>
      </div>
      <span id="tip-filter-count" class="pt-filter-count" hidden></span>
    </div>`;
}

function _tbSectionAnnotations() {
  return `
    <button id="btn-curate-annot" class="btn btn-sm btn-outline-secondary" disabled title="Curate annotations"><i class="bi bi-tags"></i></button>`;}

function _tbSectionNodeInfo() {
  return `
    <button id="btn-node-info" class="btn btn-sm btn-outline-secondary" disabled title="Node info (⌘I)"><i class="bi bi-info-circle"></i></button>`;}

function _tbSectionPanels() {
  return `
    <button id="btn-data-table" class="btn btn-sm btn-outline-secondary" disabled title="Data table panel"><i class="bi bi-caret-left"></i><i class="bi bi-layout-sidebar-reverse"></i></button>
    <button id="btn-rtt" class="btn btn-sm btn-outline-secondary" disabled title="Root-to-tip divergence plot"><i class="bi bi-caret-left"></i><i class="bi bi-graph-up-arrow"></i></button>`;
}

const _TB_SECTION_BUILDERS = {
  fileOps:     _tbSectionFileOps,
  annotations: _tbSectionAnnotations,
  nodeInfo:    _tbSectionNodeInfo,
  navigation:  _tbSectionNavigation,
  zoom:        _tbSectionZoom,
  order:       _tbSectionOrder,
  rotate:      _tbSectionRotate,
  reroot:      _tbSectionReroot,
  hideShow:    _tbSectionHideShow,
  colour:      _tbSectionColour,
  filter:      _tbSectionFilter,
  panels:      _tbSectionPanels,
};

const _ALL_TB_SECTIONS = [
  'fileOps', 'annotations', 'nodeInfo', 'navigation', 'zoom', 'order', 'rotate',
  'reroot', 'hideShow', 'colour', 'filter', 'panels',
];

function _buildToolbar(tbSections) {
  const keys = (!tbSections || tbSections === 'all') ? _ALL_TB_SECTIONS : tbSections;
  const SEP = '\n    <div class="pt-toolbar-sep"></div>';

  // Left: palette always present, fileOps optional — sep only when fileOps is included
  const leftParts = keys.includes('fileOps') ? [_tbSectionFileOps()] : [];
  const leftOptional = leftParts.length ? SEP + '\n    ' + leftParts.join('') : '';
  const left = `
  <div class="pt-toolbar-left">
    <button id="btn-palette" class="btn btn-sm btn-outline-secondary" title="Visual options panel (Tab · ⌥Tab for advanced)"><i class="bi bi-sliders"></i><i class="bi bi-caret-right"></i></button>
    ${leftOptional}
  </div>`;

  // Centre: annotations + nodeInfo + optional sections, all controllable via toolbarSections
  const CENTRE_SECTIONS = ['annotations', 'nodeInfo', 'navigation', 'zoom', 'order', 'rotate', 'reroot', 'hideShow', 'colour'];
  const centreParts = CENTRE_SECTIONS
    .filter(k => keys.includes(k))
    .map(k => _TB_SECTION_BUILDERS[k]());
  const centreContent = centreParts.join(SEP + '\n    ');
  const centre = `
  <div class="pt-toolbar-center">
    ${centreContent}
  </div>`;

  // Right: filter + panels optional — leading sep only when at least one is included
  const RIGHT_SECTIONS = ['filter', 'panels'];
  const rightParts = RIGHT_SECTIONS
    .filter(k => keys.includes(k))
    .map(k => _TB_SECTION_BUILDERS[k]());
  const rightOptional = rightParts.length
    ? SEP + '\n    ' + rightParts.join(SEP + '\n    ')
    : '';
  const right = `
  <div class="pt-toolbar-right">
    ${rightOptional}
  </div>`;

  return `<nav class="pt-toolbar">${left}${centre}${right}\n</nav>`;
}

function _buildCanvasContainer() {
  return `
<div id="canvas-container">
  <div id="canvas-and-axis-wrapper">
    <div id="canvas-wrapper">
      <div id="empty-state">
        <div style="text-align:center">
          <img src="img/peartree.svg" class="pt-empty-icon" alt="PearTree">
          <p class="pt-empty-title">No tree loaded</p>
          <p class="pt-empty-hint" id="empty-state-hint">Drag a NEXUS or Newick file here</p>
          <p id="empty-state-error" style="display:none;color:var(--pt-red);font-size:0.85rem;margin:0.5rem 1rem 0"></p>
          <button class="btn btn-sm btn-outline-primary" id="empty-state-open-btn"><i class="bi bi-folder2-open me-1"></i>Open…</button>
          <button class="btn btn-sm btn-outline-secondary ms-2" id="empty-state-example-btn"><i class="bi bi-tree me-1"></i>Example…</button>
        </div>
      </div>
      <div id="loading" class="hidden"><div class="pt-spinner"></div><p id="loading-msg">Fetching tree file…</p></div>
      <div id="error"></div>
      <canvas id="tree-canvas"></canvas>
      <div id="tooltip"></div>
    </div>
    <canvas id="axis-canvas"></canvas>
  </div>
  <canvas id="legend-right-canvas" class="pt-legend-canvas right"></canvas>
  <canvas id="legend2-right-canvas" class="pt-legend-canvas right"></canvas>
  <canvas id="legend3-right-canvas" class="pt-legend-canvas right"></canvas>
  <canvas id="legend4-right-canvas" class="pt-legend-canvas right"></canvas>
  <div id="data-table-panel">
    <div id="data-table-resize-handle"></div>
    <div id="dt-num-col">
      <div id="dt-num-header">
        <button id="dt-btn-pin" title="Pin table"><i class="bi bi-pin-angle"></i></button>
        <button id="dt-btn-close" title="Close table"><i class="bi bi-x-lg"></i></button>
      </div>
      <div id="dt-num-body"></div>
    </div>
    <div id="dt-scroll-area">
      <div class="dt-header" id="dt-header"></div>
      <div class="dt-body" id="dt-body"></div>
    </div>
  </div>
  <div id="rtt-panel">
    <div id="rtt-resize-handle"></div>
    <div id="rtt-header">
      <button id="rtt-btn-pin" title="Pin panel open"><i class="bi bi-pin-angle"></i></button>
      <button id="rtt-btn-close" title="Close"><i class="bi bi-x-lg"></i></button>
      <span class="rtt-title"></span>
      <button id="rtt-btn-download" class="btn btn-sm btn-outline-info" title="Download RTT data as CSV"><i class="bi bi-download"></i></button>
      <button id="rtt-btn-image" class="btn btn-sm btn-outline-warning" title="Export plot as image (SVG or PNG)"><i class="bi bi-image"></i></button>
      <button id="rtt-btn-stats" class="btn btn-sm btn-outline-secondary active" title="Show/hide statistics box"><i class="bi bi-info-circle"></i></button>
    </div>
    <canvas id="rtt-canvas"></canvas>
  </div>
</div>`;
}

function _buildStatusBar() {
  const _ui = window.peartreeConfig?.ui || {};
  const showBrand  = _ui.brand        !== false;
  const showTheme  = _ui.themeToggle  !== false;
  const showAbout  = _ui.about        !== false;
  const showHelp   = _ui.help         !== false;
  return `
<div id="status-bar">
  ${showBrand ? `<a id="status-brand" href="https://github.com/artic-network/peartree" target="_blank" rel="noopener" title="PearTree on GitHub"><img src="img/peartree.svg" class="pt-brand-logo" alt="">PearTree</a>` : ''}
  <span id="status-stats"></span>
  <span id="status-select"></span>
  <span id="status-message"></span>
  ${showTheme ? `<button id="btn-theme" title="Toggle light/dark mode"><i class="bi bi-sun"></i></button>` : ''}
  ${showAbout ? `<button id="btn-about" title="About PearTree"><i class="bi bi-info-circle"></i></button>` : ''}
  ${showHelp  ? `<button id="btn-help" title="Help (⌘?)"><i class="bi bi-question-circle"></i></button>` : ''}
</div>`;
}

function _buildModals() {
  return `
<div id="open-tree-modal" class="pt-modal-overlay">
  <div class="pt-modal">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-folder2-open me-2"></i>Open Tree File</h5>
      <button class="pt-modal-close-btn" id="btn-modal-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body">
      <div class="pt-tabs">
        <button class="pt-tab-btn active" data-tab="file"><i class="bi bi-folder2-open me-1"></i>File</button>
        <button class="pt-tab-btn" data-tab="url"><i class="bi bi-link-45deg me-1"></i>URL</button>
        <button class="pt-tab-btn" data-tab="example"><i class="bi bi-tree me-1"></i>Example</button>
      </div>
      <div class="pt-tab-panel active" id="tab-panel-file">
        <div id="tree-drop-zone" class="pt-drop-zone">
          <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
          <p>Drag and drop your tree file here</p>
          <p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">NEXUS (.nex, .nexus, .tre, .tree, .treefile) &nbsp;or&nbsp; Newick (.nwk, .newick)</p>
          <input type="file" id="tree-file-input" accept=".nex,.nexus,.tre,.tree,.treefile,.nwk,.newick,.txt" style="position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none">
          <button class="btn btn-sm btn-outline-primary" id="btn-file-choose"><i class="bi bi-folder2-open me-1"></i>Choose File</button>
        </div>
      </div>
      <div class="pt-tab-panel" id="tab-panel-url">
        <label class="form-label">Tree file URL</label>
        <input type="url" class="pt-modal-url-input" id="tree-url-input" placeholder="https://example.com/tree.nexus" />
        <div style="text-align:center">
          <button class="btn btn-sm btn-outline-primary" id="btn-load-url"><i class="bi bi-cloud-download me-1"></i>Load from URL</button>
        </div>
      </div>
      <div class="pt-tab-panel" id="tab-panel-example">
        <div id="example-dataset-list" class="pt-example-list"></div>
      </div>
      <div class="pt-modal-loading" id="modal-loading" style="display:none"><div class="pt-spinner"></div>Loading&hellip;</div>
      <div class="pt-modal-error" id="modal-error" style="display:none"></div>
    </div>
  </div>
</div>
<div id="error-dialog-overlay">
  <div id="error-dialog">
    <h6><i class="bi bi-exclamation-triangle-fill"></i>Could not open file</h6>
    <p id="error-dialog-msg"></p>
    <button id="error-dialog-ok" class="btn btn-sm btn-primary">OK</button>
    <div style="clear:both"></div>
  </div>
</div>
<div id="confirm-dialog-overlay">
  <div id="confirm-dialog">
    <h6><i class="bi bi-exclamation-triangle"></i><span id="confirm-dialog-title">Warning</span></h6>
    <p id="confirm-dialog-msg"></p>
    <div id="confirm-dialog-footer">
      <button id="confirm-dialog-cancel" class="btn btn-sm btn-outline-secondary">Cancel</button>
      <button id="confirm-dialog-ok" class="btn btn-sm btn-primary">OK</button>
    </div>
  </div>
</div>
<div id="prompt-dialog-overlay">
  <div id="prompt-dialog">
    <h6 id="prompt-dialog-title"></h6>
    <p id="prompt-dialog-msg"></p>
    <input type="text" id="prompt-dialog-input" class="pt-modal-url-input" autocomplete="off" spellcheck="false" />
    <div id="prompt-dialog-footer">
      <button id="prompt-dialog-cancel" class="btn btn-sm btn-outline-secondary">Cancel</button>
      <button id="prompt-dialog-ok" class="btn btn-sm btn-primary">OK</button>
    </div>
  </div>
</div>
<div id="curate-annot-overlay" class="pt-modal-overlay">
  <div class="pt-modal" style="width:800px;max-width:calc(100vw - 24px);min-width:min(760px,calc(100vw - 24px))">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-tags me-2"></i>Annotations</h5>
      <button class="pt-modal-close-btn" id="curate-annot-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body" style="padding:0;display:flex;flex-direction:column">
      <div class="ca-table-wrap">
        <table class="ca-table">
          <thead><tr>
            <th>Annotation</th><th>Type</th><th>On</th>
            <th>Observed range</th><th>Scale bounds</th>
            <th title="Show column in data table panel" style="width:36px;text-align:center"><i class="bi bi-layout-sidebar-reverse" style="font-size:0.8rem"></i></th>
            <th style="width:32px"></th>
          </tr></thead>
          <tbody id="curate-annot-tbody"></tbody>
        </table>
      </div>
      <div id="curate-annot-detail" class="ca-detail">
        <p class="ca-detail-empty">← Select an annotation row to edit its settings</p>
      </div>
    </div>
    <div class="pt-modal-footer">
      <button id="curate-annot-parse-tips" class="btn btn-sm btn-outline-secondary me-auto"><i class="bi bi-scissors me-1"></i>Parse Tips</button>
      <button id="curate-annot-cancel" class="btn btn-sm btn-secondary">Cancel</button>
      <button id="curate-annot-apply" class="btn btn-sm btn-primary">Apply</button>
    </div>
  </div>
</div>
<div id="parse-tips-overlay" class="pt-modal-overlay" style="z-index:1060">
  <div class="pt-modal" style="width:460px;max-width:calc(100vw - 40px)">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-scissors me-2"></i>Parse Tip Names</h5>
      <button class="pt-modal-close-btn" id="parse-tips-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body">
      <p style="font-size:0.82rem;color:var(--pt-text-subdued);margin-bottom:14px">Extract an annotation from tip names by splitting on a delimiter.</p>
      <div class="ca-row" style="margin-bottom:10px"><label class="ca-row-lbl" style="width:80px">Name</label><input type="text" id="parse-tips-name" class="ca-num-input" style="flex:1;width:auto" placeholder="annotation name"></div>
      <div class="ca-row" style="margin-bottom:10px"><label class="ca-row-lbl" style="width:80px">Delimiter</label><input type="text" id="parse-tips-delim" class="ca-num-input" style="width:70px;font-family:monospace" value="|" placeholder="|"><span class="ca-hint" style="margin-left:8px">character(s) used to split tip names</span></div>
      <div class="ca-row" style="margin-bottom:10px"><label class="ca-row-lbl" style="width:80px">Field</label><input type="number" id="parse-tips-field" class="ca-num-input" style="width:70px" value="1" step="1"><span class="ca-hint" style="margin-left:8px">1 = first · −1 = last</span></div>
      <div class="ca-row" style="margin-bottom:10px"><label class="ca-row-lbl" style="width:80px">Type</label><select id="parse-tips-type" class="ca-sel"><option value="auto">Auto-detect</option><option value="categorical">Categorical</option><option value="integer">Integer</option><option value="real">Real</option><option value="date">Date</option></select></div>
      <div class="ca-row" style="margin-bottom:10px"><label class="ca-row-lbl" style="width:80px">Missing</label><input type="text" id="parse-tips-missing" class="ca-num-input" style="width:70px" value="?" placeholder="none"><span class="ca-hint" style="margin-left:8px">field value treated as missing data</span></div>
      <p id="parse-tips-error" class="ca-warn" style="display:none;margin-top:8px"></p>
      <div id="parse-tips-examples" style="margin-top:14px;display:none">
        <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--pt-text-muted);margin-bottom:6px">Example tip labels</div>
        <div id="parse-tips-examples-list" style="font-family:monospace;font-size:0.78rem;color:var(--pt-text-bright);line-height:1.7"></div>
      </div>
    </div>
    <div class="pt-modal-footer">
      <button id="parse-tips-cancel" class="btn btn-sm btn-secondary">Cancel</button>
      <button id="parse-tips-ok" class="btn btn-sm btn-primary">Add Annotation</button>
    </div>
  </div>
</div>
<div id="import-annot-overlay" class="pt-modal-overlay">
  <div class="pt-modal">
    <div class="pt-modal-header">
      <h5 class="modal-title" id="import-annot-title"><i class="bi bi-file-earmark-plus me-2"></i>Import Annotations</h5>
      <button class="pt-modal-close-btn" id="import-annot-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body" id="import-annot-body"></div>
    <div id="import-annot-footer" class="pt-modal-footer"></div>
  </div>
</div>
<div id="export-tree-overlay" class="pt-modal-overlay">
  <div class="pt-modal">
    <div class="pt-modal-header">
      <h5 class="modal-title" id="export-tree-title"><i class="bi bi-file-earmark-arrow-down me-2"></i>Export Tree</h5>
      <button class="pt-modal-close-btn" id="export-tree-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body" id="export-tree-body"></div>
    <div id="export-tree-footer" class="pt-modal-footer"></div>
  </div>
</div>
<div id="export-graphic-overlay" class="pt-modal-overlay">
  <div class="pt-modal">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-image me-2"></i>Export Graphic</h5>
      <button class="pt-modal-close-btn" id="export-graphic-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body" id="export-graphic-body"></div>
    <div id="export-graphic-footer" class="pt-modal-footer"></div>
  </div>
</div>
<div id="rtt-image-overlay" class="pt-modal-overlay">
  <div class="pt-modal">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-image me-2"></i>Export Plot Image</h5>
      <button class="pt-modal-close-btn" id="rtt-image-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body" id="rtt-image-body"></div>
    <div id="rtt-image-footer" class="pt-modal-footer"></div>
  </div>
</div>
<div id="node-info-overlay" class="pt-modal-overlay">
  <div class="pt-modal">
    <div class="pt-modal-header">
      <h5 id="node-info-title" class="modal-title"></h5>
      <button id="node-info-close" class="pt-modal-close-btn" title="Close">&times;</button>
    </div>
    <div id="node-info-body" class="pt-modal-body"></div>
  </div>
</div>
<div id="pt-node-tooltip"></div>`;
}

function _buildHelpAbout() {
  const _ui = window.peartreeConfig?.ui || {};
  const showHelp  = _ui.help  !== false;
  const showAbout = _ui.about !== false;
  if (!showHelp && !showAbout) return '';
  return (showHelp ? `
<div id="help-panel">
  <div id="help-panel-header">
    <h2>PearTree Help</h2>
    <button id="btn-help-close" title="Close help">&times;</button>
  </div>
  <div id="help-panel-body">
    <div class="help-md" id="help-content"><p style="opacity:0.5">Loading…</p></div>
  </div>
</div>` : '') + (showAbout ? `
<div id="about-backdrop"></div>
<div id="about-panel">
  <div id="about-panel-header">
    <h2><img src="img/peartree.svg" class="pt-brand-logo me-2" alt="">About PearTree</h2>
    <button id="btn-about-close" title="Close">&times;</button>
  </div>
  <div id="about-panel-body">
    <div class="help-md" id="about-content"><p style="opacity:0.5">Loading…</p></div>
  </div>
</div>` : '');
}

const _APP_SECTION_BUILDERS = {
  toolbar:         null, // handled inline (needs tbSections)
  canvasContainer: _buildCanvasContainer,
  statusBar:       _buildStatusBar,
  modals:          _buildModals,
  helpAbout:       _buildHelpAbout,
  palette:         () => '\n<div id="palette-panel-host"></div>',
};

const _ALL_APP_SECTIONS = ['toolbar', 'canvasContainer', 'statusBar', 'modals', 'helpAbout', 'palette'];

/**
 * Build the complete PearTree application HTML shell.
 *
 * @param {string|string[]} [sections='all']       - App sections to include (see above).
 * @param {string|string[]} [toolbarSections='all'] - Toolbar sub-sections to include.
 * @returns {string} HTML string ready for injection into a container element.
 */
function buildAppHTML(sections, toolbarSections) {
  const keys = (!sections || sections === 'all') ? _ALL_APP_SECTIONS : sections;
  return keys.map(k => {
    if (k === 'toolbar') return keys.includes('toolbar') ? _buildToolbar(toolbarSections) : '';
    const fn = _APP_SECTION_BUILDERS[k];
    return fn ? fn() : '';
  }).join('\n');
}

// Auto-inject the full application shell, replacing a <div id="app-html-host">
// placeholder.  Used by peartree.html (standalone webapp).  The embed path
// calls buildAppHTML() directly inside _buildHTML() below, so no host
// placeholder is present in that context.
// peartreeConfig.toolbarSections / appSections control which sections render.
// When peartree.html is used as an embedFrame() iframe, these sections are
// passed as base64-encoded URL params instead (no peartreeConfig in that case).
(function () {
  const _appHost = document.getElementById('app-html-host');
  if (_appHost) {
    const _sec = (key) => {
      try { const v = new URLSearchParams(location.search).get(key); return v ? JSON.parse(atob(v)) : null; } catch { return null; }
    };
    const _appSec = window.peartreeConfig?.appSections     || _sec('appSections')     || 'all';
    const _tbSec  = window.peartreeConfig?.toolbarSections || _sec('toolbarSections') || 'all';
    _appHost.outerHTML = buildAppHTML(_appSec, _tbSec);
  }
})();

// Auto-inject the palette panel, replacing a <div id="palette-panel-host">
// placeholder. In peartree.html the placeholder is written by the app-host
// IIFE above; in the embed context peartree-embed.js calls buildAppHTML()
// which includes the palette-panel-host placeholder.
// peartreeConfig.paletteSections controls which sections to render (embed only).
(function () {
  const _host = document.getElementById('palette-panel-host');
  if (_host) {
    const _sec = (key) => {
      try { const v = new URLSearchParams(location.search).get(key); return v ? JSON.parse(atob(v)) : null; } catch { return null; }
    };
    const _secs = window.peartreeConfig?.paletteSections || _sec('paletteSections') || 'all';
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

// ── Per-instance UI bindings ──────────────────────────────────────────────
// Called once per embed/app instance from _initCore(root) after the DOM and
// window.peartree are fully set up.  Binds the palette panel, help/about
// panels, keyboard shortcuts, and toolbar height tracking to the elements
// within the given root container.
//
// Using root instead of document means:
//  • Each embed instance has independent panel open/close/pin state.
//  • Palette-pinned scopes to the embed wrapper, not document.body.
//
function initPearTreeUIBindings(root, opts = {}) {
  const $ = id => root.querySelector('#' + id);
  // For palette-pinned: scope to the embed wrapper if we're inside one,
  // otherwise fall back to document.body (standalone webapp).
  const _bodyOrWrap = () => root.closest?.('.pt-embed-wrap') ?? document.body;

  // ── Tool palette panel ──────────────────────────────────────────────────
  const palettePanel    = $('palette-panel');
  const btnPalette      = $('btn-palette');
  const btnPaletteClose = $('btn-palette-close');
  const btnPalettePin   = $('btn-palette-pin');
  const PALETTE_PIN_KEY = 'peartree-palette-pinned';
  let   palettePinned   = false;
  let   _paletteOnChange = null;
  palettePanel.inert = true;  // off-screen by default; inert removes from tab order

  function _notifyPaletteChange() {
    _paletteOnChange?.(palettePanel.classList.contains('open'), palettePinned);
  }

  function _afterPanelTransition() {
    const DURATION = 250;
    const start = performance.now();
    function pump(now) {
      window.dispatchEvent(new Event('resize'));
      if (now - start < DURATION) requestAnimationFrame(pump);
    }
    requestAnimationFrame(pump);
  }

  function openPalette(advanced = false) {
    palettePanel.classList.add('open');
    palettePanel.inert = false;
    palettePanel.classList.toggle('advanced', advanced);
    if (palettePinned) {
      palettePanel.classList.add('pinned');
      _bodyOrWrap().classList.add('palette-pinned');
    }
    btnPalette.classList.add('active');
    _afterPanelTransition();
    _notifyPaletteChange();
    opts.onPaletteStateChange?.();
  }
  function closePalette() {
    palettePanel.classList.remove('open', 'advanced', 'pinned');
    palettePanel.inert = true;
    _bodyOrWrap().classList.remove('palette-pinned');
    btnPalette.classList.remove('active');
    _afterPanelTransition();
    _notifyPaletteChange();
    opts.onPaletteStateChange?.();
  }
  function pinPalette() {
    palettePinned = true;
    localStorage.setItem(PALETTE_PIN_KEY, '1');
    palettePanel.classList.add('open', 'pinned');
    palettePanel.inert = false;
    _bodyOrWrap().classList.add('palette-pinned');
    btnPalettePin.classList.add('active');
    btnPalettePin.title = 'Unpin panel';
    btnPalettePin.innerHTML = '<i class="bi bi-pin-angle-fill"></i>';
    btnPalette.classList.add('active');
    _afterPanelTransition();
    _notifyPaletteChange();
    opts.onPaletteStateChange?.();
  }
  function unpinPalette() {
    palettePinned = false;
    localStorage.removeItem(PALETTE_PIN_KEY);
    palettePanel.classList.remove('pinned');
    _bodyOrWrap().classList.remove('palette-pinned');
    btnPalettePin.classList.remove('active');
    btnPalettePin.title = 'Pin panel open';
    btnPalettePin.innerHTML = '<i class="bi bi-pin-angle"></i>';
    _afterPanelTransition();
    _notifyPaletteChange();
    opts.onPaletteStateChange?.();
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

    // Restore state: prefer opts (from saved settings) then fall back to legacy localStorage key.
    const _wasPinned = opts.palettePinned ?? (localStorage.getItem(PALETTE_PIN_KEY) === '1');
    const _wasOpen   = opts.paletteOpen   ?? false;
    if (_wasPinned)       pinPalette();
    else if (_wasOpen)    openPalette();
  }

  // ── Slider live value readouts ──────────────────────────────────────────
  const fontSliderEl = $('font-size-slider');
  const tipSliderEl  = $('tip-size-slider');
  const nodeSliderEl = $('node-size-slider');
  const fontValEl    = $('font-size-value');
  const tipValEl     = $('tip-size-value');
  const nodeValEl    = $('node-size-value');
  fontSliderEl?.addEventListener('input',  () => { fontValEl.textContent  = fontSliderEl.value; });
  tipSliderEl?.addEventListener('input',   () => { tipValEl.textContent   = tipSliderEl.value; });
  nodeSliderEl?.addEventListener('input',  () => { nodeValEl.textContent  = nodeSliderEl.value; });

  // ── Help panel ──────────────────────────────────────────────────────────
  const helpPanel   = $('help-panel');
  const helpContent = $('help-content');
  const btnHelp     = $('btn-help');
  const btnHelpClose = $('btn-help-close');
  let helpLoaded = false;
  if (helpPanel) helpPanel.inert = true;  // off-screen by default; inert removes from tab order

  async function openHelp() {
    if (!helpPanel) return;
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
    helpPanel.inert = false;
    btnHelp?.classList.add('active');
  }

  function closeHelp() {
    if (!helpPanel) return;
    helpPanel.classList.remove('open');
    helpPanel.inert = true;
    btnHelp?.classList.remove('active');
  }

  if (btnHelp) {
    btnHelp.addEventListener('click', e => {
      e.stopPropagation();
      helpPanel?.classList.contains('open') ? closeHelp() : openHelp();
    });
  }
  if (btnHelpClose) btnHelpClose.addEventListener('click', closeHelp);

  // ── About modal ─────────────────────────────────────────────────────────
  const aboutPanel    = $('about-panel');
  const aboutBackdrop = $('about-backdrop');
  const aboutContent  = $('about-content');
  const btnAbout      = $('btn-about');
  const btnAboutClose = $('btn-about-close');
  let aboutLoaded = false;
  if (aboutPanel) aboutPanel.inert = true;  // off-screen by default; inert removes from tab order

  /* ── Light / dark mode toggle ── */
  (function () {
    const STORAGE_KEY = 'pt-theme';
    const btnTheme = $('btn-theme');
    if (!btnTheme) return;
    const icon = btnTheme.querySelector('i');

    const noStorage = Object.prototype.hasOwnProperty.call(window.peartreeConfig ?? {}, 'storageKey')
                      && window.peartreeConfig.storageKey === null;

    // In embed mode scope the theme attribute to the .pt-embed-wrap element.
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
    if (!aboutPanel) return;
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
    aboutPanel.inert = false;
    aboutBackdrop?.classList.add('open');
    btnAbout?.classList.add('active');
  }

  function closeAbout() {
    if (!aboutPanel) return;
    aboutPanel.classList.remove('open');
    aboutPanel.inert = true;
    aboutBackdrop?.classList.remove('open');
    btnAbout?.classList.remove('active');
  }

  if (btnAbout) {
    btnAbout.addEventListener('click', e => {
      e.stopPropagation();
      aboutPanel?.classList.contains('open') ? closeAbout() : openAbout();
    });
  }
  if (btnAboutClose) btnAboutClose.addEventListener('click', closeAbout);
  if (aboutBackdrop) aboutBackdrop.addEventListener('click', closeAbout);

  // Clicking the tree canvas closes any open panel immediately (unless pinned).
  $('tree-canvas').addEventListener('pointerdown', () => {
    if (!palettePinned) closePalette();
    closeHelp();
    closeAbout();
  });

  // Tab / ⌥Tab toggles palette; Alt held opens in advanced mode.
  // Guarded: only act when focus is within this instance's root.
  if (palettePanel && window.peartreeConfig?.ui?.palette !== false && window.peartreeConfig?.ui?.keyboard !== false) {
    document.addEventListener('keydown', e => {
      if (!(root === document || root.contains(document.activeElement))) return;
      if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        if (palettePinned) return;
        palettePanel.classList.contains('open') ? closePalette() : openPalette(e.altKey);
      }
    });
  }

  // Close help + palette on Escape when this instance has focus.
  if (window.peartreeConfig?.ui?.keyboard !== false) {
    document.addEventListener('keydown', e => {
      if (!(root === document || root.contains(document.activeElement))) return;
      if (e.key === 'Escape') { closeHelp(); if (!palettePinned) closePalette(); closeAbout(); }
    });
  }

  // ── Keep panels below toolbar ───────────────────────────────────────────
  const _toolbar = root.querySelector('.pt-toolbar');
  if (_toolbar) {
    const _docRoot = root === document ? document.documentElement : root;
    function _updateToolbarH() {
      _docRoot.style.setProperty('--pt-toolbar-h', _toolbar.offsetHeight + 'px');
    }
    _updateToolbarH();
    new ResizeObserver(_updateToolbarH).observe(_toolbar);
  }

  // Return a palette controller so peartree.js can drive and observe the panel.
  return {
    palette: {
      open:     openPalette,
      close:    closePalette,
      pin:      pinPalette,
      unpin:    unpinPalette,
      isOpen:   () => palettePanel.classList.contains('open'),
      isPinned: () => palettePinned,
      onChange: (fn) => { _paletteOnChange = fn; },
    },
  };
}

// Expose so _initCore() can call it once per instance.
window.initPearTreeUIBindings = initPearTreeUIBindings;

// ── Dialog utility functions ─────────────────────────────────────────────
// These are plain browser-compatible functions defined at global scope so
// they can be called from the peartree.js ES module (and by embedders).
// They use document.getElementById because the dialog IDs are globally unique.

/**
 * Show a confirm dialog with a custom title, message, and button labels.
 * Returns a Promise that resolves true (OK) or false (Cancel).
 * Pressing Escape is treated as Cancel.
 */
function showConfirmDialog(title, msg, { okLabel = 'OK', cancelLabel = 'Cancel' } = {}) {
  return new Promise(resolve => {
    const overlay   = document.getElementById('confirm-dialog-overlay');
    document.getElementById('confirm-dialog-title').textContent = title;
    document.getElementById('confirm-dialog-msg').textContent   = msg;
    document.getElementById('confirm-dialog-ok').textContent    = okLabel;
    const cancelBtn = document.getElementById('confirm-dialog-cancel');
    cancelBtn.textContent = cancelLabel;
    cancelBtn.style.display = cancelLabel ? '' : 'none';
    overlay.classList.add('open');
    const okBtn = document.getElementById('confirm-dialog-ok');
    function close(result) {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    }
    function onOk()     { close(true);  }
    function onCancel() { close(false); }
    function onKey(e)   { if (e.key === 'Escape') { e.stopPropagation(); close(false); } }
    okBtn.addEventListener('click',     onOk);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey, true);
  });
}

/**
 * Convenience wrapper: show a confirm dialog with only an OK button.
 * Returns a Promise<true> when the user dismisses it.
 */
function showAlertDialog(title, msg) {
  return showConfirmDialog(title, msg, { okLabel: 'OK', cancelLabel: '' });
}

/**
 * Show a prompt dialog with an optional default value.
 * Returns a Promise resolving to the entered string (trimmed) or null if cancelled.
 * Works in Tauri (WKWebView blocks window.prompt()).
 */
function showPromptDialog(title, msg, defaultValue = '') {
  return new Promise(resolve => {
    const overlay  = document.getElementById('prompt-dialog-overlay');
    const input    = document.getElementById('prompt-dialog-input');
    document.getElementById('prompt-dialog-title').textContent = title;
    document.getElementById('prompt-dialog-msg').textContent   = msg;
    input.value = defaultValue;
    overlay.classList.add('open');
    // Focus input on next tick so the overlay is visible first
    setTimeout(() => { input.focus(); input.select(); }, 30);
    const okBtn     = document.getElementById('prompt-dialog-ok');
    const cancelBtn = document.getElementById('prompt-dialog-cancel');
    function close(result) {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onInputKey);
      document.removeEventListener('keydown', onEsc, true);
      resolve(result);
    }
    function onOk()     { close(input.value.trim() || null); }
    function onCancel() { close(null); }
    function onInputKey(e) { if (e.key === 'Enter') { e.preventDefault(); onOk(); } }
    function onEsc(e)   { if (e.key === 'Escape') { e.stopPropagation(); close(null); } }
    okBtn.addEventListener('click',     onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown',   onInputKey);
    document.addEventListener('keydown', onEsc, true);
  });
}
