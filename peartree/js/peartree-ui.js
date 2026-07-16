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
//   'branches'        Branches
//   'tipLabels'       Tip Labels
//   'branchLabels'    Branch Labels
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
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-tree',
    title: 'Tree',
    rows: [
      {
        kind: 'color',
        id: 'canvas-bg-color',
        value: '#02292e',
        title: 'Canvas background colour',
        label: 'Background',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        kind: 'range',
        id: 'root-stem-pct-slider',
        min: 0,
        max: 20,
        step: 1,
        value: 1,
        valueId: 'root-stem-pct-value',
        valueText: '1%',
        valueStyle: 'width:30px',
        title: 'Length of the root stem as a percentage of tree width',
        label: 'Root len',
        labelIcon: 'bi bi-arrows form-label-sm',
      },
      {
        kind: 'select',
        rowId: 'axis-date-row',
        id: 'axis-date-annotation',
        options: [{ value: '', label: '(none)' }],
        title: 'Calibrate the axis to calendar dates using the selected annotation',
        label: 'Calibrate',
        labelIcon: 'bi bi-calendar3 form-label-sm',
      },
    ],
  });
}

function _sectionBranches() {
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-diagram-2-fill bi-rotate-270',
    title: 'Branches',
    rows: [
      {
        kind: 'color',
        id: 'branch-color',
        value: '#f2f1e6',
        title: 'Branch line colour',
        label: 'Colour',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        kind: 'range',
        id: 'branch-width-slider',
        min: 0.5,
        max: 8,
        step: 0.5,
        value: 1,
        valueId: 'branch-width-value',
        valueText: '1',
        title: 'Branch line thickness in screen pixels',
        label: 'Width',
        labelIcon: 'bi bi-arrows-expand form-label-sm',
      },
      {
        kind: 'range',
        id: 'elbow-radius-slider',
        min: 0,
        max: 20,
        step: 1,
        value: 2,
        valueId: 'elbow-radius-value',
        valueText: '2',
        title: 'Rounded corner radius on branch elbows',
        label: 'Elbow Radius',
        labelIcon: 'bi bi-radar form-label-sm',
      },
    ],
  });
}

function _sectionTipLabels() {
  const _tipLabelLayoutOptions = [
    { value: 'append', label: 'Append' },
    { value: 'align', label: 'Align' },
    { value: 'join-space', label: 'Join with space' },
    { value: 'join-pipe', label: 'Join with |' },
    { value: 'join-slash', label: 'Join with /' },
    { value: 'join-underscore', label: 'Join with _' },
    { value: 'join-dash', label: 'Join with -' },
  ];

  return window.buildPaletteSectionHTML({
    icon: 'bi bi-tag',
    title: 'Tip Labels',
    rows: [
      {
        kind: 'select',
        id: 'tip-label-show',
        disabled: true,
        options: [
          { value: 'off', label: 'Off' },
          { value: 'name', label: 'name', selected: true },
        ],
        title: 'Show tip labels; choose which annotation to display',
        label: 'Label 1',
      },
      {
        kind: 'select',
        id: 'tip-labels-filter',
        disabled: true,
        options: [{ value: '', label: '— always —' }],
        title: 'Only draw tip labels on tips that pass this filter',
        label: 'Filter',
        labelIcon: 'bi bi-funnel form-label-sm',
      },
    ],
    items: [
      {
        type: 'group',
        id: 'tip-label-controls',
        className: 'pt-sub-controls',
        style: 'display:none',
        items: [
          {
            type: 'row',
            kind: 'select',
            rowId: 'tip-label-dp-row',
            rowStyle: 'display:none',
            id: 'tip-label-decimal-places',
            options: [
              { value: '', label: 'Auto' },
              { value: '0', label: '0' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
              { value: '6', label: '6' },
            ],
            title: 'Decimal places for numeric tip labels',
            label: 'd.p.',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'tip-label-align',
            options: [
              { value: 'off', label: 'Off' },
              { value: 'aligned', label: 'Aligned' },
              { value: 'dots', label: 'Aligned + dots' },
              { value: 'dashed', label: 'Aligned + dashed' },
              { value: 'solid', label: 'Aligned + solid' },
            ],
            title: 'Align tips to a common margin with optional connecting lines',
            label: 'Alignment',
            labelIcon: 'bi bi-text-left form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'tip-label-spacing-slider',
            min: 0,
            max: 100,
            step: 1,
            value: 3,
            valueId: 'tip-label-spacing-value',
            valueText: '3',
            title: 'Horizontal gap between labels or between tip node and first label',
            label: 'Spacing',
            labelIcon: 'bi bi-arrow-bar-right form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'font-size-slider',
            min: 1,
            max: 48,
            value: 11,
            valueId: 'font-size-value',
            valueText: '11',
            title: 'Font size of tip labels',
            label: 'Size',
            labelIcon: 'bi bi-fonts form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'typeface-select',
            optionsHTML: _TYPEFACES,
            title: 'Typeface for tip labels',
            label: 'Typeface',
            labelIcon: 'bi bi-type form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'typeface-style-select',
            options: [{ value: '', label: 'Theme' }],
            title: 'Font style for tip labels',
            label: 'Style',
            labelIcon: 'bi bi-type-italic form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'label-color',
            value: '#f7eeca',
            title: 'Tip label text colour',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'label-colour-by',
            disabled: true,
            options: [{ value: 'user_colour', label: 'user colour' }],
            title: 'Colour tip labels by an annotation attribute',
            label: 'Colour by',
            labelIcon: 'bi bi-paint-bucket form-label-sm',
          },
          {
            type: 'row',
            rowId: 'label-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'label-configure-btn',
            buttonText: 'Configure',
            title: '',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
        ],
      },
      {
        type: 'group',
        id: 'tip-label2-section',
        className: 'pt-detail',
        items: [
          {
            type: 'row',
            kind: 'select',
            id: 'tip-label2-show',
            options: [
              { value: 'off', label: 'Off', selected: true },
              { value: 'name', label: 'name' },
            ],
            title: '',
            label: 'Label 2',
          },
          {
            type: 'group',
            id: 'tip-label2-detail',
            className: 'pt-detail pt-sub-controls',
            items: [
              {
                type: 'row',
                kind: 'select',
                id: 'tip-label2-layout',
                options: _tipLabelLayoutOptions,
                title: 'Layout of Label 2 relative to Label 1',
                label: 'Layout',
              },
            ],
          },
        ],
      },
      {
        type: 'group',
        id: 'tip-label3-section',
        className: 'pt-detail',
        items: [
          {
            type: 'row',
            kind: 'select',
            id: 'tip-label3-show',
            options: [
              { value: 'off', label: 'Off', selected: true },
              { value: 'name', label: 'name' },
            ],
            title: '',
            label: 'Label 3',
          },
          {
            type: 'group',
            id: 'tip-label3-detail',
            className: 'pt-detail pt-sub-controls',
            items: [
              {
                type: 'row',
                kind: 'select',
                id: 'tip-label3-layout',
                options: _tipLabelLayoutOptions,
                title: 'Layout of Label 3 relative to Label 2',
                label: 'Layout',
              },
            ],
          },
        ],
      },
      {
        type: 'group',
        id: 'tip-label4-section',
        className: 'pt-detail',
        items: [
          {
            type: 'row',
            kind: 'select',
            id: 'tip-label4-show',
            options: [
              { value: 'off', label: 'Off', selected: true },
              { value: 'name', label: 'name' },
            ],
            title: '',
            label: 'Label 4',
          },
          {
            type: 'group',
            id: 'tip-label4-detail',
            className: 'pt-detail pt-sub-controls',
            items: [
              {
                type: 'row',
                kind: 'select',
                id: 'tip-label4-layout',
                options: _tipLabelLayoutOptions,
                title: 'Layout of Label 4 relative to Label 3',
                label: 'Layout',
              },
            ],
          },
        ],
      },
    ],
  });
}

function _sectionBranchLabels() {
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-tag',
    title: 'Branch Labels',
    rows: [
      {
        kind: 'select',
        id: 'branch-label-show',
        disabled: true,
        options: [{ value: '', label: 'Off' }],
        title: 'Show labels at the midpoint of each branch; choose which annotation to display',
        label: 'Label',
      },
      {
        kind: 'select',
        id: 'branch-labels-filter',
        disabled: true,
        options: [{ value: '', label: '— always —' }],
        title: 'Only draw branch labels on nodes that pass this filter',
        label: 'Filter',
        labelIcon: 'bi bi-funnel form-label-sm',
      },
    ],
    items: [
      {
        type: 'group',
        id: 'branch-label-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            kind: 'select',
            rowId: 'branch-label-dp-row',
            rowStyle: 'display:none',
            id: 'branch-label-decimal-places',
            options: [
              { value: '', label: 'Auto' },
              { value: '0', label: '0' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
              { value: '6', label: '6' },
            ],
            title: 'Decimal places for numeric branch labels',
            label: 'd.p.',
            labelIcon: 'bi bi-three-dots form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'branch-label-position',
            options: [
              { value: 'above', label: 'Above' },
              { value: 'below', label: 'Below' },
            ],
            title: 'Position of branch labels relative to the branch midpoint',
            label: 'Position',
            labelIcon: 'bi bi-justify-left form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'branch-label-spacing-slider',
            min: 0,
            max: 20,
            step: 1,
            value: 4,
            valueId: 'branch-label-spacing-value',
            valueText: '4',
            title: 'Vertical offset of branch labels from the branch midpoint',
            label: 'Spacing',
            labelIcon: 'bi bi-arrow-bar-up form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'branch-label-font-size-slider',
            min: 6,
            max: 48,
            value: 9,
            valueId: 'branch-label-font-size-value',
            valueText: '9',
            title: 'Font size of branch labels',
            label: 'Size',
            labelIcon: 'bi bi-fonts form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'branch-label-typeface-select',
            optionsHTML: _TYPEFACES,
            title: 'Typeface for branch labels',
            label: 'Typeface',
            labelIcon: 'bi bi-type form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'branch-label-typeface-style-select',
            options: [{ value: '', label: 'Theme' }],
            title: 'Font style for branch labels',
            label: 'Style',
            labelIcon: 'bi bi-type-italic form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'branch-label-color',
            value: '#aaaaaa',
            title: 'Branch label text colour',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'branch-label-colour-by',
            disabled: true,
            options: [{ value: 'user_colour', label: 'user colour' }],
            title: 'Colour branch labels by an annotation attribute',
            label: 'Colour by',
            labelIcon: 'bi bi-paint-bucket form-label-sm',
          },
          {
            type: 'row',
            rowId: 'branch-label-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'branch-label-configure-btn',
            buttonText: 'Configure',
            title: '',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
        ],
      },
    ],
  });
}

function _sectionNodeLabels() {
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-tag-fill',
    title: 'Node Labels',
    rows: [
      {
        kind: 'select',
        id: 'node-label-show',
        disabled: true,
        options: [{ value: '', label: 'Off' }],
        title: 'Show labels at internal nodes; choose which annotation to display',
        label: 'Label',
      },
      {
        kind: 'select',
        id: 'node-labels-filter',
        disabled: true,
        options: [{ value: '', label: '— always —' }],
        title: 'Only draw node labels on nodes that pass this filter',
        label: 'Filter',
        labelIcon: 'bi bi-funnel form-label-sm',
      },
    ],
    items: [
      {
        type: 'group',
        id: 'node-label-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            kind: 'select',
            rowId: 'node-label-dp-row',
            rowStyle: 'display:none',
            id: 'node-label-decimal-places',
            options: [
              { value: '', label: 'Auto' },
              { value: '0', label: '0' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
              { value: '6', label: '6' },
            ],
            title: 'Decimal places for numeric node labels',
            label: 'd.p.',
            labelIcon: 'bi bi-three-dots form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'node-label-position',
            options: [
              { value: 'right', label: 'Right' },
              { value: 'above-left', label: 'Above left' },
              { value: 'below-left', label: 'Below left' },
            ],
            title: 'Position of node labels relative to the node point',
            label: 'Position',
            labelIcon: 'bi bi-diagram-2-fill form-label-sm bi-rotate-90',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'node-label-spacing-slider',
            min: 0,
            max: 20,
            step: 1,
            value: 4,
            valueId: 'node-label-spacing-value',
            valueText: '4',
            title: 'Horizontal offset of node labels from the node point',
            label: 'Spacing',
            labelIcon: 'bi bi-arrow-bar-right form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'node-label-font-size-slider',
            min: 6,
            max: 48,
            value: 9,
            valueId: 'node-label-font-size-value',
            valueText: '9',
            title: 'Font size of node labels',
            label: 'Size',
            labelIcon: 'bi bi-fonts form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'node-label-typeface-select',
            optionsHTML: _TYPEFACES,
            title: 'Typeface for node labels',
            label: 'Typeface',
            labelIcon: 'bi bi-type form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'node-label-typeface-style-select',
            options: [{ value: '', label: 'Theme' }],
            title: 'Font style for node labels',
            label: 'Style',
            labelIcon: 'bi bi-type-italic form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'node-label-color',
            value: '#aaaaaa',
            title: 'Node label text colour',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'node-label-colour-by',
            disabled: true,
            options: [{ value: 'user_colour', label: 'user colour' }],
            title: 'Colour node labels by an annotation attribute',
            label: 'Colour by',
            labelIcon: 'bi bi-paint-bucket form-label-sm',
          },
          {
            type: 'row',
            rowId: 'node-label-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'node-label-configure-btn',
            buttonText: 'Configure',
            title: '',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
        ],
      },
    ],
  });
}

function _sectionLabelShapes() {
  const shapeOptions = [
    { value: 'off', label: 'Off' },
    { value: 'square', label: 'Square' },
    { value: 'circle', label: 'Circle' },
    { value: 'block', label: 'Block' },
  ];

  return window.buildPaletteSectionHTML({
    icon: 'bi bi-square-fill',
    title: 'Label Shapes',
    rows: [
      {
        kind: 'select',
        id: 'tip-label-shape',
        title: 'Shape drawn alongside each tip label',
        label: 'Shape',
        options: shapeOptions,
      },
    ],
    items: [
      {
        type: 'group',
        id: 'tip-label-shape-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            kind: 'range',
            id: 'tip-label-shape-size-slider',
            min: 1,
            max: 100,
            step: 1,
            value: 50,
            valueId: 'tip-label-shape-size-value',
            valueText: '50',
            title: 'Size of the label shape as a percentage of tip spacing',
            label: 'Size',
            labelIcon: 'bi bi-box-arrow-up-right form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'tip-label-shape-margin-left-slider',
            min: 0,
            max: 100,
            value: 2,
            valueId: 'tip-label-shape-margin-left-value',
            valueText: '2',
            title: 'Left padding between the tip node and the shape',
            label: 'Pad left',
            labelIcon: 'bi bi-arrow-bar-right form-label-sm',
          },
          {
            type: 'row',
            rowId: 'tip-label-shape-spacing-row',
            rowStyle: 'display:none',
            kind: 'range',
            id: 'tip-label-shape-spacing-slider',
            min: 0,
            max: 50,
            value: 3,
            valueId: 'tip-label-shape-spacing-value',
            valueText: '3',
            title: 'Spacing between shapes in block layout mode',
            label: 'Spacing',
            labelIcon: 'bi bi-arrows form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'tip-label-shape-color',
            value: '#aaaaaa',
            title: 'Fill colour of the tip label shape',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'tip-label-shape-colour-by',
            disabled: true,
            title: 'Colour tip label shapes by an annotation attribute',
            label: 'Colour by',
            labelIcon: 'bi bi-paint-bucket form-label-sm',
            options: [{ value: 'user_colour', label: 'user colour' }],
          },
          {
            type: 'row',
            rowId: 'tip-label-shape-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'tip-label-shape-configure-btn',
            buttonText: 'Configure',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
        ],
      },
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
        type: 'group',
        id: `tip-label-shape-${n}-section`,
        className: 'pt-detail',
        items: [
          {
            type: 'row',
            kind: 'select',
            id: `tip-label-shape-${n}`,
            title: `Additional shape column ${n} for tip labels`,
            label: `Shape ${n}`,
            options: shapeOptions,
          },
          {
            type: 'group',
            id: `tip-label-shape-${n}-detail`,
            className: 'pt-detail pt-sub-controls',
            items: [
              {
                type: 'row',
                kind: 'select',
                id: `tip-label-shape-${n}-colour-by`,
                disabled: true,
                title: `Colour shape ${n} by an annotation attribute`,
                label: 'Colour by',
                labelIcon: 'bi bi-paint-bucket form-label-sm',
                options: [{ value: 'user_colour', label: 'user colour' }],
              },
              {
                type: 'row',
                rowId: `tip-label-shape-${n}-configure-row`,
                rowStyle: 'display:none',
                kind: 'button',
                id: `tip-label-shape-${n}-configure-btn`,
                buttonText: 'Configure',
                label: 'Palette',
                labelIcon: 'bi bi-palette2 form-label-sm',
              },
            ],
          },
        ],
      })),
    ],
  });
}

function _sectionTipShapes() {
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-circle-fill',
    title: 'Tip Shapes',
    rows: [
      {
        kind: 'range',
        id: 'tip-size-slider',
        min: 0,
        max: 24,
        value: 3,
        valueId: 'tip-size-value',
        valueText: '3',
        title: 'Radius of the circle drawn at each tip node',
        label: 'Size',
        labelIcon: 'bi bi-arrow-up-right-circle-fill form-label-sm',
      },
      {
        kind: 'select',
        id: 'tip-shapes-filter',
        disabled: true,
        title: 'Only draw tip shapes on tips that pass this filter',
        label: 'Filter',
        labelIcon: 'bi bi-funnel form-label-sm',
        options: [{ value: '', label: '— always —' }],
      },
    ],
    items: [
      {
        type: 'group',
        id: 'tip-shape-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            kind: 'color',
            id: 'tip-shape-color',
            value: '#888888',
            title: 'Fill colour of tip node circles',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'tip-colour-by',
            disabled: true,
            title: 'Colour tip circles by an annotation attribute',
            label: 'Colour by',
            labelIcon: 'bi bi-paint-bucket form-label-sm',
            options: [{ value: 'user_colour', label: 'user colour' }],
          },
          {
            type: 'row',
            rowId: 'tip-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'tip-configure-btn',
            buttonText: 'Configure',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'tip-halo-slider',
            min: 0,
            max: 8,
            value: 2,
            valueId: 'tip-halo-value',
            valueText: '2',
            title: 'Background halo width around each tip circle',
            label: 'Halo',
            labelIcon: 'bi bi-arrow-up-right-circle form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'tip-shape-bg-color',
            value: '#02292e',
            title: 'Halo colour behind each tip circle',
            label: 'Halo col.',
            labelIcon: 'bi bi-palette form-label-sm',
          },
        ],
      },
    ],
  });
}

function _sectionNodeShapes() {
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-record-circle',
    title: 'Node Shapes',
    rows: [
      {
        kind: 'range',
        id: 'node-size-slider',
        min: 0,
        max: 24,
        value: 0,
        valueId: 'node-size-value',
        valueText: '0',
        title: 'Radius of the circle drawn at each internal node',
        label: 'Size',
        labelIcon: 'bi bi-arrow-up-right-circle-fill form-label-sm',
      },
      {
        kind: 'select',
        id: 'node-shapes-filter',
        disabled: true,
        title: 'Only draw node shapes on nodes that pass this filter',
        label: 'Filter',
        labelIcon: 'bi bi-funnel form-label-sm',
        options: [{ value: '', label: '— always —' }],
      },
    ],
    items: [
      {
        type: 'group',
        id: 'node-shape-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            kind: 'color',
            id: 'node-shape-color',
            value: '#888888',
            title: 'Fill colour of internal node circles',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'node-colour-by',
            disabled: true,
            title: 'Colour node circles by an annotation attribute',
            label: 'Colour by',
            labelIcon: 'bi bi-paint-bucket form-label-sm',
            options: [{ value: 'user_colour', label: 'user colour' }],
          },
          {
            type: 'row',
            rowId: 'node-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'node-configure-btn',
            buttonText: 'Configure',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'node-halo-slider',
            min: 0,
            max: 8,
            value: 2,
            valueId: 'node-halo-value',
            valueText: '2',
            title: 'Background halo width around each node circle',
            label: 'Halo',
            labelIcon: 'bi bi-arrow-up-right-circle form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'node-shape-bg-color',
            value: '#02292e',
            title: 'Halo colour behind each node circle',
            label: 'Halo col.',
            labelIcon: 'bi bi-palette form-label-sm',
          },
        ],
      },
    ],
  });
}

function _sectionBranchShapes() {
  const shapeOptions = [
    { value: 'off', label: 'Off' },
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'ellipse', label: 'Ellipse' },
  ];

  return window.buildPaletteSectionHTML({
    icon: 'bi bi-diagram-2',
    title: 'Branch Shapes',
    rows: [
      {
        kind: 'select',
        id: 'branch-shape',
        title: 'Shape drawn along each branch',
        label: 'Shape',
        options: shapeOptions,
      },
      {
        kind: 'select',
        id: 'branch-shapes-filter',
        disabled: true,
        title: 'Only draw branch shapes on branches that pass this filter',
        label: 'Filter',
        labelIcon: 'bi bi-funnel form-label-sm',
        options: [{ value: '', label: '— always —' }],
      },
    ],
    items: [
      {
        type: 'group',
        id: 'branch-shape-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            kind: 'range',
            id: 'branch-shape-height-slider',
            min: 1,
            max: 100,
            step: 1,
            value: 50,
            valueId: 'branch-shape-height-value',
            valueText: '50',
            title: 'Shape height as a percentage of tip spacing',
            label: 'Height',
            labelIcon: 'bi bi-arrows-vertical form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'branch-shape-width-slider',
            min: 0,
            max: 100,
            step: 1,
            value: 50,
            valueId: 'branch-shape-width-value',
            valueText: '1',
            title: 'Shape width as a multiple of shape height (non-linear scale, 1.0 at midpoint)',
            label: 'Width',
            labelIcon: 'bi bi-arrows-expand form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'branch-shape-align',
            title: 'Horizontal alignment of shape groups along the branch',
            label: 'Align',
            labelIcon: 'bi bi-distribute-horizontal form-label-sm',
            options: [
              { value: 'center', label: 'Centre' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ],
          },
          {
            type: 'row',
            kind: 'range',
            id: 'branch-shape-spacing-slider',
            min: 0,
            max: 30,
            step: 1,
            value: 3,
            valueId: 'branch-shape-spacing-value',
            valueText: '3',
            title: 'Gap between shapes and branch-edge padding in pixels',
            label: 'Spacing',
            labelIcon: 'bi bi-arrows form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'branch-shape-color',
            value: '#aaaaaa',
            title: 'Fill colour of branch shapes',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'branch-shape-colour-by',
            disabled: true,
            title: 'Colour branch shapes by an annotation attribute',
            label: 'Colour by',
            labelIcon: 'bi bi-paint-bucket form-label-sm',
            options: [{ value: 'user_colour', label: 'user colour' }],
          },
          {
            type: 'row',
            rowId: 'branch-shape-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'branch-shape-configure-btn',
            buttonText: 'Configure',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'branch-shape-count-by',
            disabled: true,
            title: 'Integer annotation key controlling shapes per branch (0–99)',
            label: 'No.',
            labelIcon: 'bi bi-123 form-label-sm',
            options: [{ value: '', label: 'Fixed 1' }],
          },
          {
            type: 'row',
            kind: 'range',
            id: 'branch-shape-halo-slider',
            min: 0,
            max: 8,
            step: 1,
            value: 0,
            valueId: 'branch-shape-halo-value',
            valueText: '0',
            title: 'Halo width around branch shapes in pixels',
            label: 'Halo',
            labelIcon: 'bi bi-bounding-box form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'branch-shape-halo-color',
            value: '#02292e',
            title: 'Halo colour behind branch shapes',
            label: 'Halo col.',
            labelIcon: 'bi bi-palette form-label-sm',
          },
        ],
      },
      ...[2, 3, 4].map((n) => ({
        type: 'group',
        id: `branch-shape-${n}-section`,
        className: 'pt-detail',
        items: [
          {
            type: 'row',
            kind: 'select',
            id: `branch-shape-${n}`,
            title: `Additional branch shape group ${n}`,
            label: `Shape ${n}`,
            options: shapeOptions,
          },
          {
            type: 'group',
            id: `branch-shape-${n}-detail`,
            className: 'pt-detail pt-sub-controls',
            items: [
              {
                type: 'row',
                kind: 'color',
                id: `branch-shape-${n}-color`,
                value: '#aaaaaa',
                title: `Fill colour for branch shape group ${n}`,
                label: 'Colour',
                labelIcon: 'bi bi-palette form-label-sm',
              },
              {
                type: 'row',
                kind: 'select',
                id: `branch-shape-${n}-colour-by`,
                disabled: true,
                title: `Colour branch shape group ${n} by an annotation attribute`,
                label: 'Colour by',
                labelIcon: 'bi bi-paint-bucket form-label-sm',
                options: [{ value: 'user_colour', label: 'user colour' }],
              },
              {
                type: 'row',
                rowId: `branch-shape-${n}-configure-row`,
                rowStyle: 'display:none',
                kind: 'button',
                id: `branch-shape-${n}-configure-btn`,
                buttonText: 'Configure',
                label: 'Palette',
                labelIcon: 'bi bi-palette2 form-label-sm',
              },
              {
                type: 'row',
                kind: 'select',
                id: `branch-shape-${n}-count-by`,
                disabled: true,
                title: `Integer annotation key controlling number of shapes in group ${n} (0–99)`,
                label: 'No.',
                labelIcon: 'bi bi-123 form-label-sm',
                options: [{ value: '', label: 'Fixed 1' }],
              },
            ],
          },
        ],
      })),
    ],
  });
}

function _sectionNodeBars() {
  return window.buildPaletteSectionHTML({
    id: 'node-bars-section',
    icon: 'bi bi-bar-chart-steps bi-rotate-180',
    title: 'Node Bars',
    items: [
      {
        type: 'html',
        html: '<div id="node-bars-unavail" style="display:block;font-size:0.78rem;color:var(--pt-text-muted);font-style:italic;padding:2px 0 4px;">Requires BEAST tree with height HPD</div>',
      },
      {
        type: 'group',
        id: 'node-bars-controls',
        className: 'pt-palette-grid',
        style: 'display:none',
        items: [
          {
            type: 'row',
            kind: 'select',
            id: 'node-bars-show',
            title: 'Show confidence interval bars (e.g. 95% HPD) on nodes',
            label: 'Show',
            options: [
              { value: 'off', label: 'Off' },
              // HPD interval options are added dynamically after tree load
            ],
          },
          {
            type: 'row',
            kind: 'select',
            id: 'node-bars-filter',
            disabled: true,
            title: 'Only draw bars on nodes that pass this filter',
            label: 'Filter',
            labelIcon: 'bi bi-funnel form-label-sm',
            options: [{ value: '', label: '— always —' }],
          },
          {
            type: 'group',
            id: 'node-bars-detail',
            className: 'pt-detail pt-sub-controls',
            items: [
              {
                type: 'row',
                kind: 'select',
                id: 'node-bars-median',
                title: 'Draw a vertical line at the mean or median of each bar',
                label: 'Line',
                labelIcon: 'bi bi-vr form-label-sm',
                options: [
                  { value: 'off', label: '(none)' },
                  { value: 'mean', label: 'Mean' },
                  { value: 'median', label: 'Median' },
                ],
              },
              {
                type: 'row',
                kind: 'select',
                id: 'node-bars-range',
                title: 'Show or hide range values as text labels on each bar',
                label: 'Range',
                labelIcon: 'bi bi-cursor-text form-label-sm bi-rotate-90',
                options: [
                  { value: 'off', label: 'Hide' },
                  { value: 'on', label: 'Show' },
                ],
              },
              {
                type: 'row',
                kind: 'range',
                id: 'node-bars-width-slider',
                min: 2,
                max: 30,
                step: 1,
                value: 6,
                valueId: 'node-bars-width-value',
                valueText: '6',
                title: 'Bar height in screen pixels',
                label: 'Size',
                labelIcon: 'bi bi-arrows-expand form-label-sm',
              },
              {
                type: 'row',
                kind: 'color',
                id: 'node-bars-color',
                value: '#2aa198',
                title: 'Colour of the confidence bars',
                label: 'Colour',
                labelIcon: 'bi bi-palette form-label-sm',
              },
              {
                type: 'row',
                kind: 'range',
                id: 'node-bars-fill-opacity',
                min: 0,
                max: 1,
                step: 0.05,
                value: 0.22,
                valueId: 'node-bars-fill-opacity-value',
                valueText: '0.22',
                title: 'Opacity of the confidence bar fill',
                label: 'Opacity',
                labelIcon: 'bi bi-droplet-half form-label-sm',
              },
              {
                type: 'row',
                kind: 'range',
                id: 'node-bars-stroke-opacity',
                min: 0,
                max: 1,
                step: 0.05,
                value: 0.55,
                valueId: 'node-bars-stroke-opacity-value',
                valueText: '0.55',
                title: 'Opacity of the confidence bar border',
                label: 'Stroke',
                labelIcon: 'bi bi-droplet-half form-label-sm',
              },
            ],
          },
        ],
      },
    ],
  });
}

function _sectionCladeHighlights() {
  return window.buildPaletteSectionHTML({
    id: 'clade-highlights-section',
    icon: 'bi bi-highlighter',
    title: 'Clade Highlights',
    rows: [
      {
        kind: 'select',
        id: 'clade-highlight-left-edge',
        title: 'Shape of the left edge of clade highlight boxes',
        label: 'Left edge',
        labelIcon: 'bi bi-arrow-left-square form-label-sm',
        options: [
          { value: 'atRoot', label: 'Rectangle' },
          { value: 'outlineNodes', label: 'Outline subtree' },
        ],
      },
      {
        kind: 'select',
        id: 'clade-highlight-right-edge',
        title: 'Extent of the right edge of clade highlight boxes',
        label: 'Right edge',
        labelIcon: 'bi bi-arrow-right-square form-label-sm',
        options: [
          { value: 'atTips', label: 'At tip' },
          { value: 'atLabels', label: 'At label left' },
          { value: 'atLabelsRight', label: 'At label right' },
          { value: 'outlineTips', label: 'Outline tips' },
        ],
      },
      {
        kind: 'range',
        id: 'clade-highlight-padding',
        min: 0,
        max: 40,
        step: 1,
        value: 4,
        valueId: 'clade-highlight-padding-value',
        valueText: '4',
        title: 'Padding around each highlighted clade in pixels',
        label: 'Padding',
        labelIcon: 'bi bi-arrow-bar-right form-label-sm',
      },
      {
        kind: 'range',
        id: 'clade-highlight-radius',
        min: 0,
        max: 24,
        step: 1,
        value: 4,
        valueId: 'clade-highlight-radius-value',
        valueText: '4',
        title: 'Corner rounding radius of the highlight rectangle',
        label: 'Corners',
        labelIcon: 'bi bi-radar form-label-sm',
      },
      {
        kind: 'select',
        id: 'clade-highlight-colour-by',
        title: 'Colour clade highlights by an annotation attribute',
        label: 'Colour by',
        labelIcon: 'bi bi-paint-bucket form-label-sm',
        options: [{ value: 'user_colour', label: 'User colour' }],
      },
      {
        rowId: 'clade-highlight-configure-row',
        rowStyle: 'display:none',
        kind: 'button',
        id: 'clade-highlight-configure-btn',
        buttonText: 'Configure',
        label: 'Palette',
        labelIcon: 'bi bi-palette2 form-label-sm',
      },
      {
        kind: 'range',
        id: 'clade-highlight-fill-opacity',
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.15,
        valueId: 'clade-highlight-fill-opacity-value',
        valueText: '0.15',
        title: 'Opacity of the clade highlight fill',
        label: 'Opacity',
        labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      {
        kind: 'range',
        id: 'clade-highlight-stroke-width',
        min: 0,
        max: 6,
        step: 0.5,
        value: 1,
        valueId: 'clade-highlight-stroke-width-value',
        valueText: '1',
        title: 'Border line width of clade highlights',
        label: 'Stroke',
        labelIcon: 'bi bi-border-width form-label-sm',
      },
      {
        kind: 'range',
        id: 'clade-highlight-stroke-opacity',
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.7,
        valueId: 'clade-highlight-stroke-opacity-value',
        valueText: '0.7',
        title: 'Opacity of the clade highlight border',
        label: 'Opacity',
        labelIcon: 'bi bi-droplet-half form-label-sm',
      },
    ],
  });
}

function _sectionCollapsedClades() {
  return window.buildPaletteSectionHTML({
    id: 'collapsed-clades-section',
    icon: 'bi bi-triangle bi-rotate-270',
    title: 'Collapsed Clades',
    rows: [
      {
        kind: 'range',
        id: 'collapsed-height-n-slider',
        min: 1,
        max: 20,
        step: 1,
        value: 3,
        valueId: 'collapsed-height-n-value',
        valueText: '3',
        title: 'Height of the clade triangle base in tip-row units',
        label: 'Span',
        labelIcon: 'bi bi-arrows-vertical form-label-sm',
      },
      {
        kind: 'select',
        id: 'collapsed-clade-colour-by',
        title: 'Colour collapsed clade triangles by an annotation attribute',
        label: 'Colour by',
        labelIcon: 'bi bi-paint-bucket form-label-sm',
        options: [{ value: 'user_colour', label: 'User colour' }],
      },
      {
        rowId: 'collapsed-clade-configure-row',
        rowStyle: 'display:none',
        kind: 'button',
        id: 'collapsed-clade-configure-btn',
        buttonText: 'Configure',
        label: 'Palette',
        labelIcon: 'bi bi-palette2 form-label-sm',
      },
      {
        kind: 'range',
        id: 'collapsed-opacity-slider',
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.25,
        valueId: 'collapsed-opacity-value',
        valueText: '0.25',
        title: 'Fill opacity of collapsed clade triangles',
        label: 'Opacity',
        labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      {
        kind: 'range',
        id: 'collapsed-stroke-width-slider',
        min: 0,
        max: 6,
        step: 0.5,
        value: 1,
        valueId: 'collapsed-stroke-width-value',
        valueText: '1',
        title: 'Stroke width of collapsed clade triangle outline',
        label: 'Stroke',
        labelIcon: 'bi bi-border-width form-label-sm',
      },
      {
        kind: 'range',
        id: 'collapsed-stroke-opacity-slider',
        min: 0,
        max: 1,
        step: 0.05,
        value: 1,
        valueId: 'collapsed-stroke-opacity-value',
        valueText: '1',
        title: 'Stroke opacity of collapsed clade triangle outline',
        label: 'Opacity',
        labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      {
        kind: 'range',
        id: 'collapsed-clade-font-size-slider',
        min: 6,
        max: 48,
        step: 1,
        value: 11,
        valueId: 'collapsed-clade-font-size-value',
        valueText: '11',
        title: 'Font size of the collapsed clade label',
        label: 'Label size',
        labelIcon: 'bi bi-fonts form-label-sm',
      },
      {
        kind: 'select',
        id: 'collapsed-clade-typeface-select',
        optionsHTML: _TYPEFACES,
        title: 'Typeface for collapsed clade labels',
        label: 'Typeface',
        labelIcon: 'bi bi-type form-label-sm',
      },
      {
        kind: 'select',
        id: 'collapsed-clade-typeface-style-select',
        title: 'Font style for collapsed clade labels',
        label: 'Style',
        labelIcon: 'bi bi-type-italic form-label-sm',
        options: [{ value: '', label: 'Theme' }],
      },
    ],
  });
}

function _sectionLegend() {
  const decimalPlaceOptions = [
    { value: '', label: 'Auto' },
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
  ];

  return window.buildPaletteSectionHTML({
    icon: 'bi bi-card-list',
    title: 'Legend',
    rows: [
      {
        kind: 'select',
        id: 'legend-annotation',
        disabled: true,
        title: 'Choose an annotation to display as a colour legend',
        label: 'Show',
        options: [{ value: '', label: 'Off' }],
      },
    ],
    items: [
      {
        type: 'group',
        id: 'legend-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            rowId: 'legend-configure-row',
            rowStyle: 'display:none',
            kind: 'button',
            id: 'legend-configure-btn',
            buttonText: 'Configure',
            title: 'Configure palette for legend annotation',
            label: 'Palette',
            labelIcon: 'bi bi-palette2 form-label-sm',
          },
          {
            type: 'row',
            rowId: 'legend-dp-row',
            rowStyle: 'display:none',
            kind: 'select',
            id: 'legend-decimal-places',
            title: 'Decimal places for numeric legend labels',
            label: 'd.p.',
            labelIcon: 'bi bi-three-dots form-label-sm',
            options: decimalPlaceOptions,
          },
          {
            type: 'row',
            kind: 'range',
            id: 'legend-height-pct-slider',
            min: 10,
            max: 100,
            step: 5,
            value: 100,
            valueId: 'legend-height-pct-value',
            valueText: '100%',
            title: 'Height of the primary legend as a percentage of canvas height',
            label: 'Span',
            labelIcon: 'bi bi-arrows-expand form-label-sm',
          },
          {
            type: 'row',
            kind: 'color',
            id: 'legend-text-color',
            value: '#f7eeca',
            title: 'Primary legend text colour',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'legend-font-size-slider',
            min: 6,
            max: 48,
            value: 11,
            valueId: 'legend-font-size-value',
            valueText: '11',
            title: 'Font size of legend text',
            label: 'Size',
            labelIcon: 'bi bi-fonts form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'legend-spacing-slider',
            min: 0,
            max: 50,
            step: 1,
            value: 0,
            valueId: 'legend-spacing-value',
            valueText: '0',
            title: 'Spacing between stacked legend rows and between legend columns',
            label: 'Spacing',
            labelIcon: 'bi bi-arrows form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'legend-font-family-select',
            optionsHTML: _TYPEFACES,
            title: 'Typeface for legend text',
            label: 'Typeface',
            labelIcon: 'bi bi-type form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'legend-typeface-style-select',
            title: 'Font style for legend text',
            label: 'Style',
            labelIcon: 'bi bi-type-italic form-label-sm',
            options: [{ value: '', label: 'Theme' }],
          },
        ],
      },
      ...[2, 3, 4].map((n) => ({
        type: 'group',
        id: `legend${n}-section`,
        className: 'pt-detail',
        items: [
          {
            type: 'row',
            kind: 'select',
            id: `legend-annotation-${n}`,
            title: `Choose a ${n === 2 ? 'second' : n === 3 ? 'third' : 'fourth'} annotation legend`,
            label: `Show ${n}`,
            options: [{ value: '', label: 'Off' }],
          },
          {
            type: 'group',
            id: `legend${n}-detail`,
            className: 'pt-detail pt-sub-controls',
            items: [
              {
                type: 'row',
                rowId: `legend${n}-configure-row`,
                rowStyle: 'display:none',
                kind: 'button',
                id: `legend${n}-configure-btn`,
                buttonText: 'Configure',
                title: `Configure palette for legend annotation ${n}`,
                label: 'Palette',
                labelIcon: 'bi bi-palette2 form-label-sm',
              },
              {
                type: 'row',
                rowId: `legend${n}-dp-row`,
                rowStyle: 'display:none',
                kind: 'select',
                id: `legend${n}-decimal-places`,
                title: 'Decimal places for numeric legend labels',
                label: 'd.p.',
                labelIcon: 'bi bi-three-dots form-label-sm',
                options: decimalPlaceOptions,
              },
              {
                type: 'row',
                kind: 'select',
                id: `legend${n}-show`,
                title: `Position of the ${n === 2 ? 'second' : n === 3 ? 'third' : 'fourth'} legend${n === 2 ? ' relative to the first' : ''}`,
                label: 'Position',
                labelIcon: 'bi bi-box-arrow-down-right form-label-sm',
                options: [
                  { value: 'right', label: 'Right' },
                  { value: 'below', label: 'Below' },
                ],
              },
              {
                type: 'row',
                kind: 'range',
                id: `legend${n}-height-pct-slider`,
                min: 10,
                max: 100,
                step: 5,
                value: 50,
                valueId: `legend${n}-height-pct-value`,
                valueText: '50%',
                title: `Height of the ${n === 2 ? 'second' : n === 3 ? 'third' : 'fourth'} legend as a percentage of canvas height`,
                label: 'Span',
                labelIcon: 'bi bi-arrows-expand form-label-sm',
              },
            ],
          },
        ],
      })),
    ],
      });
}

function _sectionAxis() {
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-rulers bi-rotate-270',
    title: 'Axis',
    rows: [
      {
        kind: 'select',
        id: 'axis-show',
        title: 'Show a scale axis; choose direction or time-calibrated mode',
        label: 'Show',
        options: [
          { value: 'off', label: 'Off' },
          { value: 'forward', label: 'Forward' },
          { value: 'reverse', label: 'Reverse' },
          { value: 'time', label: 'Time' },
        ],
      },
    ],
    items: [
      {
        type: 'group',
        id: 'axis-detail',
        className: 'pt-detail pt-sub-controls',
        items: [
          {
            type: 'row',
            kind: 'color',
            id: 'axis-color',
            value: '#f2f1e6',
            title: 'Axis lines and tick label colour',
            label: 'Colour',
            labelIcon: 'bi bi-palette form-label-sm',
          },
          {
            type: 'row',
            kind: 'range',
            id: 'axis-font-size-slider',
            min: 6,
            max: 48,
            value: 9,
            valueId: 'axis-font-size-value',
            valueText: '9',
            title: 'Font size of axis tick labels',
            label: 'Size',
            labelIcon: 'bi bi-fonts form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'axis-font-family-select',
            optionsHTML: _TYPEFACES,
            title: 'Typeface for axis tick labels',
            label: 'Typeface',
            labelIcon: 'bi bi-type form-label-sm',
          },
          {
            type: 'row',
            kind: 'select',
            id: 'axis-typeface-style-select',
            title: 'Font style for axis tick labels',
            label: 'Style',
            labelIcon: 'bi bi-type-italic form-label-sm',
            options: [{ value: '', label: 'Theme' }],
          },
          {
            type: 'row',
            kind: 'range',
            id: 'axis-line-width-slider',
            min: 0.5,
            max: 4,
            step: 0.5,
            value: 1,
            valueId: 'axis-line-width-value',
            valueText: '1',
            title: 'Axis line width in screen pixels',
            label: 'Line',
            labelIcon: 'bi bi-border-width form-label-sm',
          },
          {
            type: 'row',
            rowId: 'axis-date-format-row',
            rowStyle: 'display:none',
            kind: 'select',
            id: 'axis-date-format',
            title: 'Date format for time-calibrated axis labels',
            label: 'Format',
            labelIcon: 'bi bi-calendar-check form-label-sm',
            options: [
              { value: 'yyyy-MM-dd', label: '1977-05-04' },
              { value: 'yyyy-MMM-dd', label: '1977-May-04' },
              { value: 'dd MMM yyyy', label: '04 May 1977' },
              { value: 'dd MMMM yyyy', label: '04 May 1977 (long month)' },
              { value: 'MMM dd, yyyy', label: 'May 04, 1977' },
              { value: 'MMMM dd, yyyy', label: 'May 04, 1977 (long month)' },
              { value: 'MMM-dd-yyyy', label: 'May-04-1977' },
            ],
          },
          {
            type: 'row',
            rowId: 'axis-major-interval-row',
            rowStyle: 'display:none',
            kind: 'select',
            id: 'axis-major-interval',
            title: 'Spacing between major labelled axis ticks',
            label: 'Major ticks',
            labelIcon: 'bi bi-text-left form-label-sm bi-rotate-90 bi-flip-vertical',
            options: [
              { value: 'auto', label: 'Auto' },
              { value: 'millennia', label: 'Millennia' },
              { value: 'centuries', label: 'Centuries' },
              { value: 'decades', label: 'Decades' },
              { value: 'years', label: 'Years' },
              { value: 'quarters', label: 'Quarters' },
              { value: 'months', label: 'Months' },
              { value: 'weeks', label: 'Weeks' },
              { value: 'days', label: 'Days' },
            ],
          },
          {
            type: 'row',
            rowId: 'axis-minor-interval-row',
            rowStyle: 'display:none',
            kind: 'select',
            id: 'axis-minor-interval',
            title: 'Spacing between minor unlabelled axis ticks',
            label: 'Minor ticks',
            labelIcon: 'bi bi-text-left form-label-sm bi-rotate-90',
            options: [{ value: 'off', label: 'Off' }],
          },
          {
            type: 'row',
            rowId: 'axis-major-label-row',
            rowStyle: 'display:none',
            kind: 'select',
            id: 'axis-major-label',
            title: 'Label format for major axis ticks',
            label: 'Major labels',
            labelIcon: 'bi bi-tags form-label-sm',
            options: [
              { value: 'component', label: 'Component' },
              { value: 'partial', label: 'Partial' },
              { value: 'full', label: 'Full' },
              { value: 'off', label: 'Off' },
            ],
          },
          {
            type: 'row',
            rowId: 'axis-minor-label-row',
            rowStyle: 'display:none',
            kind: 'select',
            id: 'axis-minor-label',
            title: 'Label format for minor axis ticks',
            label: 'Minor labels',
            labelIcon: 'bi bi-tag form-label-sm',
            options: [
              { value: 'component', label: 'Component' },
              { value: 'partial', label: 'Partial' },
              { value: 'full', label: 'Full' },
              { value: 'off', label: 'Off' },
            ],
          },
          {
            type: 'row',
            rowId: 'axis-range-row',
            title: "Set the range of the axis; leave blank or 'auto' for automatic ranging. For time axis enter dates (e.g. 2020-01-15) or decimal years. For forward/reverse enter numbers.",
            label: 'Range',
            labelIcon: 'bi bi-arrows-expand form-label-sm',
            controlHTML: '<div style="grid-column:2/-1;display:flex;gap:4px;align-items:center"><input type="text" id="axis-range-left" class="pt-palette-select" placeholder="auto" style="flex:1;min-width:0" /><input type="text" id="axis-range-right" class="pt-palette-select" placeholder="auto" style="flex:1;min-width:0" /></div>',
          },
        ],
      },
    ],
      });
}

function _sectionRtt() {
  return window.buildPaletteSectionHTML({
    id: 'rtt-section',
    icon: 'bi bi-graph-up',
    title: 'Root-to-tip',
    rows: [
      {
        kind: 'select',
        id: 'rtt-x-origin',
        title: 'Starting point of the root-to-tip X axis',
        label: 'X-axis origin',
        labelIcon: 'bi bi-arrow-down-left form-label-sm',
        options: [
          { value: 'data', label: 'data range' },
          { value: 'root', label: 'root age' },
          { value: 'interval', label: 'interval range' },
        ],
      },
      {
        kind: 'select',
        id: 'rtt-aspect-ratio',
        title: 'Aspect ratio of the root-to-tip chart panel',
        label: 'Aspect ratio',
        labelIcon: 'bi bi-aspect-ratio form-label-sm',
        options: [
          { value: 'fit', label: 'fit panel' },
          { value: '1:1', label: '1 : 1 (square)' },
          { value: '4:3', label: '4 : 3' },
          { value: '3:2', label: '3 : 2' },
          { value: '16:9', label: '16 : 9' },
        ],
      },
      {
        kind: 'select',
        id: 'rtt-grid-lines',
        title: 'Grid lines to show on the root-to-tip chart',
        label: 'Grid lines',
        labelIcon: 'bi bi-border-inner form-label-sm',
        options: [
          { value: 'both', label: 'both' },
          { value: 'horizontal', label: 'horizontal' },
          { value: 'vertical', label: 'vertical' },
          { value: 'off', label: 'off' },
        ],
      },
    ],
    items: [
      { type: 'subhead', text: 'Regression line' },
      {
        type: 'row',
        kind: 'select',
        id: 'rtt-regression-style',
        title: 'Line style of the regression line',
        label: 'Style',
        labelIcon: 'bi bi-border-style form-label-sm',
        options: [
          { value: 'solid', label: 'Solid' },
          { value: 'bigdash', label: 'Big dash' },
          { value: 'dash', label: 'Dash' },
          { value: 'dots', label: 'Dots' },
        ],
      },
      {
        type: 'row',
        kind: 'color',
        id: 'rtt-regression-color',
        value: '#f2f1e6',
        title: 'Colour of the regression line',
        label: 'Colour',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row',
        kind: 'range',
        id: 'rtt-regression-width-slider',
        min: 0.5,
        max: 6,
        step: 0.5,
        value: 1.5,
        valueId: 'rtt-regression-width-value',
        valueText: '1.5',
        title: 'Width of the regression line in pixels',
        label: 'Width',
        labelIcon: 'bi bi-border-width form-label-sm',
      },
      { type: 'subhead', text: 'Interval band' },
      {
        type: 'row',
        kind: 'select',
        id: 'rtt-resid-band-show',
        title: 'Show band around regression line: ±2σ residual lines or 95% confidence interval for the mean',
        label: 'Band',
        labelIcon: 'bi bi-file-bar-graph form-label-sm',
        options: [
          { value: 'off', label: 'Off' },
          { value: 'residual', label: '±2σ residual' },
          { value: 'ci', label: '95% CI' },
        ],
      },
      {
        type: 'row',
        kind: 'select',
        id: 'rtt-resid-band-style',
        title: 'Style of the interval band boundary lines',
        label: 'Style',
        labelIcon: 'bi bi-border-style form-label-sm',
        options: [
          { value: 'solid', label: 'Solid' },
          { value: 'bigdash', label: 'Big dash' },
          { value: 'dash', label: 'Dash' },
          { value: 'dots', label: 'Dots' },
        ],
      },
      {
        type: 'row',
        kind: 'color',
        id: 'rtt-resid-band-color',
        value: '#f2f1e6',
        title: 'Colour of the interval band boundary lines',
        label: 'Colour',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row',
        kind: 'range',
        id: 'rtt-resid-band-width-slider',
        min: 0,
        max: 6,
        step: 0.5,
        value: 1,
        valueId: 'rtt-resid-band-width-value',
        valueText: '1',
        title: 'Width of the interval band boundary lines in pixels',
        label: 'Width',
        labelIcon: 'bi bi-border-width form-label-sm',
      },
      {
        type: 'row',
        kind: 'color',
        id: 'rtt-resid-band-fill-color',
        value: '#f2f1e6',
        title: 'Fill colour of the interval band area',
        label: 'Fill',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row',
        kind: 'range',
        id: 'rtt-resid-band-fill-opacity-slider',
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.1,
        valueId: 'rtt-resid-band-fill-opacity-value',
        valueText: '0.1',
        title: 'Opacity of the interval band fill',
        label: 'Opacity',
        labelIcon: 'bi bi-circle-half form-label-sm',
      },
      { type: 'subhead', text: 'Statistics box' },
      {
        type: 'row',
        kind: 'color',
        id: 'rtt-stats-bg-color',
        value: '#081c22',
        title: 'Background colour of the statistics summary box',
        label: 'Background',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row',
        kind: 'color',
        id: 'rtt-stats-text-color',
        value: '#f2f1e6',
        title: 'Text colour of the statistics summary box',
        label: 'Text',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row',
        kind: 'range',
        id: 'rtt-stats-font-size-slider',
        min: 6,
        max: 32,
        value: 11,
        valueId: 'rtt-stats-font-size-value',
        valueText: '11',
        title: 'Font size of the statistics summary box',
        label: 'Size',
        labelIcon: 'bi bi-fonts form-label-sm',
      },
      { type: 'subhead', text: 'Axes' },
      {
        type: 'row',
        kind: 'color',
        id: 'rtt-axis-color',
        value: '#f2f1e6',
        title: 'Root-to-tip chart axis colour',
        label: 'Colour',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row',
        kind: 'range',
        id: 'rtt-axis-font-size-slider',
        min: 6,
        max: 48,
        value: 9,
        valueId: 'rtt-axis-font-size-value',
        valueText: '9',
        title: 'Font size of root-to-tip axis labels',
        label: 'Size',
        labelIcon: 'bi bi-fonts form-label-sm',
      },
      {
        type: 'row',
        kind: 'range',
        id: 'rtt-axis-line-width-slider',
        min: 0.5,
        max: 4,
        step: 0.5,
        value: 1,
        valueId: 'rtt-axis-line-width-value',
        valueText: '1',
        title: 'Root-to-tip axis line width in pixels',
        label: 'Width',
        labelIcon: 'bi bi-border-width form-label-sm',
      },
      {
        type: 'row',
        kind: 'select',
        id: 'rtt-axis-font-family-select',
        optionsHTML: _TYPEFACES,
        title: 'Typeface for root-to-tip axis labels',
        label: 'Typeface',
        labelIcon: 'bi bi-type form-label-sm',
      },
      {
        type: 'row',
        kind: 'select',
        id: 'rtt-axis-typeface-style-select',
        title: 'Font style for root-to-tip axis labels',
        label: 'Style',
        labelIcon: 'bi bi-type-italic form-label-sm',
        options: [{ value: '', label: 'Theme' }],
      },
      {
        type: 'row',
        rowId: 'rtt-date-format-row',
        rowStyle: 'display:none',
        kind: 'select',
        id: 'rtt-date-format',
        title: 'Date format for time-calibrated root-to-tip axis',
        label: 'Format',
        labelIcon: 'bi bi-calendar-check form-label-sm',
        options: [
          { value: 'yyyy-MM-dd', label: '1977-05-04' },
          { value: 'yyyy-MMM-dd', label: '1977-May-04' },
          { value: 'dd MMM yyyy', label: '04 May 1977' },
          { value: 'dd MMMM yyyy', label: '04 May 1977 (long month)' },
          { value: 'MMM dd, yyyy', label: 'May 04, 1977' },
          { value: 'MMMM dd, yyyy', label: 'May 04, 1977 (long month)' },
          { value: 'MMM-dd-yyyy', label: 'May-04-1977' },
        ],
      },
      {
        type: 'row',
        rowId: 'rtt-major-interval-row',
        rowStyle: 'display:none',
        kind: 'select',
        id: 'rtt-major-interval',
        title: 'Spacing between major labelled root-to-tip axis ticks',
        label: 'Major ticks',
        labelIcon: 'bi bi-text-left form-label-sm bi-rotate-90 bi-flip-vertical',
        options: [
          { value: 'auto', label: 'Auto' },
          { value: 'millennia', label: 'Millennia' },
          { value: 'centuries', label: 'Centuries' },
          { value: 'decades', label: 'Decades' },
          { value: 'years', label: 'Years' },
          { value: 'quarters', label: 'Quarters' },
          { value: 'months', label: 'Months' },
          { value: 'weeks', label: 'Weeks' },
          { value: 'days', label: 'Days' },
        ],
      },
      {
        type: 'row',
        rowId: 'rtt-minor-interval-row',
        rowStyle: 'display:none',
        kind: 'select',
        id: 'rtt-minor-interval',
        title: 'Spacing between minor root-to-tip axis ticks',
        label: 'Minor ticks',
        labelIcon: 'bi bi-text-left form-label-sm bi-rotate-90',
        options: [{ value: 'off', label: 'Off' }],
      },
      {
        type: 'row',
        rowId: 'rtt-major-label-row',
        rowStyle: 'display:none',
        kind: 'select',
        id: 'rtt-major-label',
        title: 'Label format for major root-to-tip ticks',
        label: 'Major labels',
        labelIcon: 'bi bi-tags form-label-sm',
        options: [
          { value: 'component', label: 'Component' },
          { value: 'partial', label: 'Partial' },
          { value: 'full', label: 'Full' },
          { value: 'off', label: 'Off' },
        ],
      },
      {
        type: 'row',
        rowId: 'rtt-minor-label-row',
        rowStyle: 'display:none',
        kind: 'select',
        id: 'rtt-minor-label',
        title: 'Label format for minor root-to-tip ticks',
        label: 'Minor labels',
        labelIcon: 'bi bi-tag form-label-sm',
        options: [
          { value: 'component', label: 'Component' },
          { value: 'partial', label: 'Partial' },
          { value: 'full', label: 'Full' },
          { value: 'off', label: 'Off' },
        ],
      },
    ],
      });
}

function _sectionTheme() {
  return window.buildPaletteSectionHTML({
    icon: 'bi bi-palette2',
    title: 'Theme',
    items: [
      {
        type: 'row',
        kind: 'select',
        id: 'theme-select',
        title: 'Tree visual theme',
        label: 'Tree Theme',
        labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row',
        rowClass: 'pt-palette-row--span',
        rowStyle: 'gap:6px',
        hideLabel: true,
        controlHTML: '<button id="btn-store-theme" class="pt-theme-btn" style="flex:1" title="Save current settings as a named theme" disabled>Store</button><button id="btn-default-theme" class="pt-theme-btn" style="flex:1" title="Set selected theme as the default" disabled>Default</button><button id="btn-remove-theme" class="pt-theme-btn" style="flex:1" title="Remove this user-saved theme" disabled>Remove</button>',
      },
      {
        type: 'row',
        rowClass: 'pt-palette-row--span',
        rowStyle: 'gap:6px',
        hideLabel: true,
        controlHTML: '<button id="btn-export-theme" class="pt-theme-btn" style="flex:1" title="Export theme as a JSON file">Export</button><button id="btn-import-theme" class="pt-theme-btn" style="flex:1" title="Import a theme from a JSON file">Import</button>',
      },
      {
        type: 'row',
        kind: 'select',
        id: 'font-family-select',
        title: 'Default typeface used throughout the tree (overridable per section)',
        label: 'Typeface',
        labelIcon: 'bi bi-type form-label-sm',
        options: [
          { value: 'Monospace', label: 'Monospace' },
          { value: 'Sans-serif', label: 'Sans-serif' },
          { value: 'Serif', label: 'Serif' },
          { value: 'Courier New', label: 'Courier New' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Helvetica Neue', label: 'Helvetica Neue' },
          { value: 'Georgia', label: 'Georgia' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'System UI', label: 'System UI' },
          { value: 'Menlo', label: 'Menlo' },
        ],
      },
      {
        type: 'row',
        kind: 'select',
        id: 'font-typeface-style-select',
        title: 'Default font style used throughout the tree',
        label: 'Style',
        labelIcon: 'bi bi-type-italic form-label-sm',
        options: [{ value: 'Regular', label: 'Regular' }],
      },
      {
        type: 'row',
        rowClass: 'pt-palette-row--span',
        hideLabel: true,
        controlHTML: '<hr class="pt-cp-divider" style="width:100%;margin:10px 0 6px" />',
      },
      {
        type: 'row',
        rowClass: 'pt-palette-row--span',
        hideLabel: true,
        controlHTML: '<button id="btn-ui-theme-family" type="button" title="Choose UI Theme"><i class="bi bi-circle-half me-1"></i>UI Theme</button>',
      },
    ],
      });
}

function _sectionSelectionHover() {
  return window.buildPaletteSectionHTML({
    id: 'selection-hover-section',
    icon: 'bi bi-cursor-fill',
    title: 'Selection & Hover',
    items: [
      { type: 'subhead', text: 'Selected Tips' },
      {
        type: 'row',
        kind: 'select',
        id: 'selected-label-style',
        title: 'Font style applied to labels of selected tips',
        label: 'Label style',
        labelIcon: 'bi bi-type-italic form-label-sm',
        options: [
          { value: 'bold', label: 'Bold' },
          { value: 'italic', label: 'Italic' },
          { value: 'bold italic', label: 'Bold + Italic' },
          { value: 'normal', label: 'Normal' },
        ],
      },
      {
        type: 'row', kind: 'range', id: 'selected-tip-growth', min: 0, max: 20, step: 0.5, value: 0,
        valueId: 'selected-tip-growth-value', valueText: '0', title: 'Additional size added to the tip circle radius after selected-tip growth-factor scaling',
        label: 'Size', labelIcon: 'bi bi-arrow-up-right-circle form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'selected-tip-fill', value: '#888888', title: 'Fill colour of the selection circle on tips',
        label: 'Fill', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-tip-min-size', min: 0, max: 20, step: 0.5, value: 6,
        valueId: 'selected-tip-min-size-value', valueText: '6', title: 'Minimum diameter of the selection circle on tips in pixels',
        label: 'Fill', labelIcon: 'bi bi-arrow-up-right-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-tip-fill-opacity', min: 0, max: 1, step: 0.05, value: 0.5,
        valueId: 'selected-tip-fill-opacity-value', valueText: '0.5', title: 'Opacity of the selected tip fill circle',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'selected-tip-stroke', value: '#e06961', title: 'Stroke colour of the selection circle on tips',
        label: 'Stroke', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-tip-stroke-width', min: 0.5, max: 10, step: 0.5, value: 3,
        valueId: 'selected-tip-stroke-width-value', valueText: '3', title: 'Stroke width of the selection circle on tips',
        label: 'Stroke', labelIcon: 'bi bi-record-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-tip-stroke-opacity', min: 0, max: 1, step: 0.05, value: 1,
        valueId: 'selected-tip-stroke-opacity-value', valueText: '1', title: 'Opacity of the selected tip stroke',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      { type: 'subhead', text: 'MRCA Node' },
      {
        type: 'row', kind: 'range', id: 'selected-node-growth', min: 0, max: 20, step: 0.5, value: 0,
        valueId: 'selected-node-growth-value', valueText: '0', title: 'Additional size added to the MRCA node circle radius after selected-node growth-factor scaling',
        label: 'Size', labelIcon: 'bi bi-box-arrow-up-right form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'selected-node-fill', value: '#19a699', title: 'Fill colour of the MRCA node selection circle',
        label: 'Fill', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-node-min-size', min: 0, max: 20, step: 0.5, value: 6,
        valueId: 'selected-node-min-size-value', valueText: '6', title: 'Minimum diameter of the MRCA node selection circle in pixels',
        label: 'Fill', labelIcon: 'bi bi-arrow-up-right-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-node-fill-opacity', min: 0, max: 1, step: 0.05, value: 0.5,
        valueId: 'selected-node-fill-opacity-value', valueText: '0.5', title: 'Opacity of the MRCA node fill circle',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'selected-node-stroke', value: '#19a699', title: 'Stroke colour of the MRCA node selection circle',
        label: 'Stroke', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-node-stroke-width', min: 0.5, max: 10, step: 0.5, value: 3,
        valueId: 'selected-node-stroke-width-value', valueText: '3', title: 'Stroke width of the MRCA node selection circle',
        label: 'Stroke', labelIcon: 'bi bi-record-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'selected-node-stroke-opacity', min: 0, max: 1, step: 0.05, value: 1,
        valueId: 'selected-node-stroke-opacity-value', valueText: '1', title: 'Opacity of the MRCA node stroke',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      { type: 'subhead', text: 'Tip Hover' },
      {
        type: 'row', kind: 'range', id: 'tip-hover-growth', min: 0, max: 20, step: 0.5, value: 0,
        valueId: 'tip-hover-growth-value', valueText: '0', title: 'Additional size added to the tip circle radius after hover growth-factor scaling',
        label: 'Size', labelIcon: 'bi bi-box-arrow-up-right form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'tip-hover-fill', value: '#bf4b43', title: 'Fill colour of the tip hover circle',
        label: 'Fill', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'tip-hover-min-size', min: 0, max: 20, step: 0.5, value: 6,
        valueId: 'tip-hover-min-size-value', valueText: '6', title: 'Minimum diameter of the tip hover circle in pixels',
        label: 'Fill', labelIcon: 'bi bi-arrow-up-right-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'tip-hover-fill-opacity', min: 0, max: 1, step: 0.05, value: 0.6,
        valueId: 'tip-hover-fill-opacity-value', valueText: '0.6', title: 'Opacity of the tip hover fill circle',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'tip-hover-stroke', value: '#7b2820', title: 'Stroke colour of the tip hover circle',
        label: 'Stroke', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'tip-hover-stroke-width', min: 0.5, max: 10, step: 0.5, value: 2,
        valueId: 'tip-hover-stroke-width-value', valueText: '2', title: 'Stroke width of the tip hover circle',
        label: 'Stroke', labelIcon: 'bi bi-record-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'tip-hover-stroke-opacity', min: 0, max: 1, step: 0.05, value: 1,
        valueId: 'tip-hover-stroke-opacity-value', valueText: '1', title: 'Opacity of the tip hover stroke',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half-label-sm',
      },
      { type: 'subhead', text: 'Node Hover' },
      {
        type: 'row', kind: 'range', id: 'node-hover-growth', min: 0, max: 20, step: 0.5, value: 0,
        valueId: 'node-hover-growth-value', valueText: '0', title: 'Additional size added to the node circle radius after hover growth-factor scaling',
        label: 'Size', labelIcon: 'bi bi-box-arrow-up-right form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'node-hover-fill', value: '#19a699', title: 'Fill colour of the node hover circle',
        label: 'Fill', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'node-hover-min-size', min: 0, max: 20, step: 0.5, value: 6,
        valueId: 'node-hover-min-size-value', valueText: '6', title: 'Minimum diameter of the node hover circle in pixels',
        label: 'Fill', labelIcon: 'bi bi-arrow-up-right-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'node-hover-fill-opacity', min: 0, max: 1, step: 0.05, value: 0.6,
        valueId: 'node-hover-fill-opacity-value', valueText: '0.6', title: 'Opacity of the node hover fill circle',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half form-label-sm',
      },
      {
        type: 'row', kind: 'color', id: 'node-hover-stroke', value: '#0d6560', title: 'Stroke colour of the node hover circle',
        label: 'Stroke', labelIcon: 'bi bi-palette form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'node-hover-stroke-width', min: 0.5, max: 10, step: 0.5, value: 2,
        valueId: 'node-hover-stroke-width-value', valueText: '2', title: 'Stroke width of the node hover circle',
        label: 'Stroke', labelIcon: 'bi bi-record-circle form-label-sm',
      },
      {
        type: 'row', kind: 'range', id: 'node-hover-stroke-opacity', min: 0, max: 1, step: 0.05, value: 1,
        valueId: 'node-hover-stroke-opacity-value', valueText: '1', title: 'Opacity of the node hover stroke',
        label: 'Opacity', labelIcon: 'bi bi-droplet-half form-label-sm',
      },
    ],
      });
}

const _SECTION_BUILDERS = {
  tree:            _sectionTree,
  branches:        _sectionBranches,
  tipLabels:       _sectionTipLabels,
  labelShapes:     _sectionLabelShapes,
  tipShapes:       _sectionTipShapes,
  nodeShapes:      _sectionNodeShapes,
  branchShapes:    _sectionBranchShapes,
  nodeLabels:      _sectionNodeLabels,
  branchLabels:    _sectionBranchLabels,
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
  'tree', 'branches', 'tipLabels', 'nodeLabels', 'branchLabels', 'labelShapes', 'tipShapes', 'nodeShapes', 'branchShapes',
  'nodeBars', 'cladeHighlights', 'collapsedClades', 'legend', 'axis', 'rtt', 'theme',
  'selectionHover', 
];

function buildPalettePanel(sections) {
  const keys = (!sections || sections === 'all') ? _ALL_SECTIONS : sections;
  const sectionHTML = keys
    .filter(k => _SECTION_BUILDERS[k])
    .map(k => _SECTION_BUILDERS[k]())
    .join('');
  return window.buildPalettePanelFromDefinition({
    sections: [sectionHTML],
  });
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
      <button id="btn-rotate" class="btn btn-sm btn-outline-secondary" disabled title="Rotate selected node"><i class="bi bi-repeat bi-rotate-90"></i></button>
      <button id="btn-rotate-all" class="btn btn-sm btn-outline-secondary" disabled title="Rotate all nodes in subtree"><i class="bi bi-symmetry-horizontal bi-flip-horizontal"></i></button>
    </div>`;
}

function _tbSectionReroot() {
  return `
    <button id="btn-invert-selection" class="btn btn-sm btn-outline-secondary" disabled title="Invert selection (⌘⇧I)"><i class="bi bi-arrow-left-right"></i></button>
    <div id="reroot-controls">
      <div class="btn-group" role="group" aria-label="Selection mode">
        <button id="btn-mode-nodes" class="btn btn-sm btn-outline-secondary active" disabled title="Select nodes mode"><i class="bi bi-circle bi-rotate-270"></i></button>
        <button id="btn-mode-branches" class="btn btn-sm btn-outline-secondary" disabled title="Toggle branches/nodes mode (⌘B)"><i class="bi bi-dash-lg"></i></button>
      </div>
      <div class="pt-toolbar-sep"></div>
      <div class="btn-group" role="group" aria-label="Rooting">
        <button id="btn-reroot" class="btn btn-sm btn-outline-secondary" disabled title="Reroot tree at selection"><i class="bi bi-arrow-return-left"></i></button>
        <button id="btn-midpoint-root" class="btn btn-sm btn-outline-secondary" disabled title="Midpoint root (⌘M)"><i class="bi bi-chevron-bar-contract bi-rotate-90"></i></button>
        <button id="btn-temporal-root-global" class="btn btn-sm btn-outline-secondary" disabled title="Global temporal root (⌘T)"><i class="bi bi-clock"></i></button>
        <button id="btn-temporal-root" class="btn btn-sm btn-outline-secondary" disabled title="Optimise root on current branch (⌘⇧T)"><i class="bi bi-clock-history"></i></button>
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
  return `<div id="tip-filter-mount"></div>`;
}

function _tbSectionAnnotations() {
  return `
    <button id="btn-curate-annot" class="btn btn-sm btn-outline-secondary" disabled title="Curate annotations"><i class="bi bi-tags"></i></button>
    <button id="btn-manage-filters" class="btn btn-sm btn-outline-secondary" disabled title="Manage filters"><i class="bi bi-funnel"></i></button>
    <button id="btn-manage-palettes" class="btn btn-sm btn-outline-secondary" disabled title="Manage palettes"><i class="bi bi-palette"></i></button>`;}

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
  <div id="canvas-inner-wrapper">
    <div id="tree-axis-wrapper">
      <div id="tree-wrapper">
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
      <div id="tree-scroll-y"><div id="tree-scroll-y-thumb"></div></div>
      <div id="axis-wrapper">
        <canvas id="axis-canvas"></canvas>
      </div>
    </div>
    <div id="legend-right-wrapper">
      <canvas id="legend-right-canvas" class="pt-legend-canvas right"></canvas>
      <canvas id="legend2-right-canvas" class="pt-legend-canvas right"></canvas>
      <canvas id="legend3-right-canvas" class="pt-legend-canvas right"></canvas>
      <canvas id="legend4-right-canvas" class="pt-legend-canvas right"></canvas>
    </div>
  </div>
  <div id="data-table-panel">
    <div id="data-table-resize-handle"></div>
    <div id="dt-num-col">
      ${window.buildSidePanelHeaderHTML({
        id: 'dt-num-header',
        headerClass: 'pt-side-panel-header',
        height: 24,
        side: 'right',
        buttonOrder: 'close-pin',
        pinButtonId: 'dt-btn-pin',
        closeButtonId: 'dt-btn-close',
        pinTitle: 'Pin table',
        closeTitle: 'Close table',
      })}
      <div id="dt-num-body"></div>
    </div>
    <div id="dt-scroll-area">
      <div class="dt-header" id="dt-header"></div>
      <div class="dt-body" id="dt-body"></div>
    </div>
  </div>
  <div id="rtt-panel">
    <div id="rtt-resize-handle"></div>
    ${window.buildSidePanelHeaderHTML({
      id: 'rtt-header',
      headerClass: 'pt-side-panel-header',
      height: 24,
      side: 'right',
      buttonOrder: 'close-pin',
      leftHTML: '<span class="rtt-title"></span>',
      actionsHTML: '<button id="rtt-btn-download" class="btn btn-sm btn-outline-info" title="Download RTT data as CSV"><i class="bi bi-download"></i></button>'
        + '<button id="rtt-btn-image" class="btn btn-sm btn-outline-warning" title="Export plot as image (SVG or PNG)"><i class="bi bi-image"></i></button>'
        + '<button id="rtt-btn-stats" class="btn btn-sm btn-outline-secondary active" title="Show/hide statistics box"><i class="bi bi-info-circle"></i></button>',
      pinButtonId: 'rtt-btn-pin',
      closeButtonId: 'rtt-btn-close',
      pinTitle: 'Pin panel open',
      closeTitle: 'Close',
    })}
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
  return buildStatusBarHTML({
    brandHTML: showBrand ? `<a id="status-brand" href="https://github.com/artic-network/peartree" target="_blank" rel="noopener" title="PearTree on GitHub"><img src="img/peartree.svg" class="pt-brand-logo" alt="">PearTree</a>` : undefined,
    themeToggle: showTheme,
    about: showAbout,
    help: showHelp,
  });
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
` + buildStandardDialogsHTML() + `
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
${window.buildParseLabelDialogHTML({ title: 'Parse Tip Names', subjectLabel: 'tip names' })}
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
    <div class="pt-modal-footer">
      <button id="node-info-copy" class="btn btn-sm btn-outline-secondary" title="Copy as TSV"><i class="bi bi-clipboard me-1"></i>Copy as TSV</button>
    </div>
  </div>
</div>
<div id="annot-config-overlay" class="pt-modal-overlay">
  <div class="pt-modal" style="width:320px;max-width:calc(100vw - 24px)">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-palette2 me-2"></i>Colour settings: <span id="annot-config-title" style="font-style:italic"></span></h5>
      <button class="pt-modal-close-btn" id="annot-config-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body">
      <div id="annot-config-info" style="margin-bottom:8px;font-size:0.82rem;color:var(--pt-text-muted);line-height:1.5"></div>
      <div class="pt-palette-row" id="annot-config-scale-row">
        <span class="pt-palette-label">Scale <i class="bi bi-rulers form-label-sm"></i></span>
        <select class="pt-palette-select" id="annot-config-scale-select">
          <option value="">Auto (min → max)</option>
          <option value="symmetric-zero">Symmetric ±0</option>
          <option value="zero-positive">From zero</option>
          <option value="zero-one">0 → 1</option>
        </select>
      </div>
      <div class="pt-palette-row">
        <span class="pt-palette-label">Palette <i class="bi bi-rainbow form-label-sm"></i></span>
        <select class="pt-palette-select" id="annot-config-palette-select"></select>
      </div>
      <div class="pt-palette-row">
        <span class="pt-palette-label">Reverse <i class="bi bi-arrow-left-right form-label-sm"></i></span>
        <label style="display:flex;align-items:center;gap:8px;margin:0;color:var(--pt-text-muted)">
          <input type="checkbox" id="annot-config-palette-reverse" />
          <span>Apply palette in reverse order</span>
        </label>
      </div>
      <div id="annot-config-palette-preview" style="margin-top:8px;min-height:14px"></div>
    </div>
    <div class="pt-modal-footer">
      <button id="annot-config-manage-palettes" class="btn btn-sm btn-outline-secondary me-auto" title="Open Palette Manager"><i class="bi bi-palette me-1"></i>Manage Palettes…</button>
      <button id="annot-config-done" class="btn btn-sm btn-primary">Done</button>
    </div>
  </div>
</div>
<div id="pt-node-tooltip"></div>
<div id="manage-filters-overlay" class="pt-modal-overlay">
  <div class="pt-modal fm-modal" style="width:820px;max-width:calc(100vw - 24px);min-width:min(700px,calc(100vw - 24px))">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-funnel me-2"></i>Filters</h5>
      <button class="pt-modal-close-btn" id="manage-filters-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body fm-modal-body" style="padding:0;display:flex;overflow:hidden">
      <div class="fm-list-pane">
        <div class="fm-list-header">
          <span class="fm-list-title">Filters</span>
          <button id="filter-new-btn" class="btn btn-xs btn-primary"><i class="bi bi-plus me-1"></i>New Filter</button>
        </div>
        <div id="filter-list" class="fm-list"></div>
      </div>
      <div id="filter-editor" class="fm-editor-pane"></div>
    </div>
    <div class="pt-modal-footer">
      <button id="filter-import-btn" class="btn btn-sm btn-outline-secondary me-1"><i class="bi bi-upload me-1"></i>Import</button>
      <button id="filter-export-btn" class="btn btn-sm btn-outline-secondary me-auto"><i class="bi bi-download me-1"></i>Export All</button>
      <button id="manage-filters-close-footer" class="btn btn-sm btn-secondary">Close</button>
    </div>
  </div>
</div>
<div id="palette-manager-overlay" class="pt-modal-overlay">
  <div class="pt-modal pm-modal" style="width:860px;max-width:calc(100vw - 24px);min-width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 48px)">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-palette me-2"></i>Palette Manager</h5>
      <button class="pt-modal-close-btn" id="palette-manager-close" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body pm-modal-body" style="padding:0;display:flex;flex-direction:column;overflow:hidden">
      <div class="pm-tabs">
        <div class="pm-tab active" id="pm-tab-categorical">Categorical</div>
        <div class="pm-tab" id="pm-tab-continuous">Continuous</div>
      </div>
      <div class="pm-split">
        <div class="pm-list-pane">
          <div class="pm-list-header">
            <span class="pm-list-title">Palettes</span>
            <button id="pm-new-btn" class="btn btn-xs btn-primary"><i class="bi bi-plus me-1"></i>New</button>
          </div>
          <div id="pm-list" class="pm-list"></div>
        </div>
        <div id="pm-editor" class="pm-editor-pane"></div>
      </div>
    </div>
    <div class="pt-modal-footer">
      <button id="palette-manager-close-footer" class="btn btn-sm btn-secondary">Close</button>
    </div>
  </div>
</div>`;
}

function _buildHelpAbout() {
  const _ui = window.peartreeConfig?.ui || {};
  const showHelp  = _ui.help  !== false;
  const showAbout = _ui.about !== false;
  return buildHelpAboutHTML({
    help: showHelp,
    about: showAbout,
    helpTitle: 'Help',
    aboutTitle: 'About PearTree',
    aboutLogo: '<img src="img/peartree.svg" class="pt-brand-logo me-2" alt="">',
  });
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

  // Delegate generic UI bindings (palette panel, help/about, dark mode,
  // keyboard shortcuts, toolbar height) to pearcore-ui.js.
  const _cfg = window.peartreeConfig ?? {};
  const _ui  = _cfg.ui ?? {};

  const noStorage = Object.prototype.hasOwnProperty.call(_cfg, 'storageKey')
                    && _cfg.storageKey === null;

  const { palette, helpAbout } = initCoreUIBindings(root, {
    appName:              'peartree',
    palettePinned:        opts.palettePinned,
    paletteOpen:          opts.paletteOpen,
    paletteEnabled:       _ui.palette !== false,
    onPaletteStateChange: opts.onPaletteStateChange,
    fetchContent:         (file) => window.peartree.fetchWithFallback(file),
    helpFile:             'help.md',
    aboutFile:            'about.md',
    theme:                _ui.theme,
    noStorage:            noStorage,
    keyboardEnabled:      _ui.keyboard !== false,
  });

  // ── Slider live value readouts (tree-specific) ──────────────────────────
  const fontSliderEl = $('font-size-slider');
  const tipSliderEl  = $('tip-size-slider');
  const nodeSliderEl = $('node-size-slider');
  const fontValEl    = $('font-size-value');
  const tipValEl     = $('tip-size-value');
  const nodeValEl    = $('node-size-value');
  fontSliderEl?.addEventListener('input',  () => { fontValEl.textContent  = fontSliderEl.value; });
  tipSliderEl?.addEventListener('input',   () => { tipValEl.textContent   = tipSliderEl.value; });
  nodeSliderEl?.addEventListener('input',  () => { nodeValEl.textContent  = nodeSliderEl.value; });

  // Clicking the tree canvas closes any open panel immediately (unless pinned).
  $('tree-canvas')?.addEventListener('pointerdown', () => {
    if (!palette.isPinned()) palette.close();
    helpAbout.closeHelp();
    helpAbout.closeAbout();
  });

  // Return a palette controller so peartree.js can drive and observe the panel.
  return {
    palette: {
      open:     palette.open,
      close:    palette.close,
      pin:      palette.pin,
      unpin:    palette.unpin,
      isOpen:   palette.isOpen,
      isPinned: palette.isPinned,
      onChange: palette.onChange,
    },
  };
}

// Expose so _initCore() can call it once per instance.
window.initPearTreeUIBindings = initPearTreeUIBindings;

// ── Dialog utility functions ─────────────────────────────────────────────
// showConfirmDialog, showAlertDialog, showPromptDialog are now provided by
// pearcore/js/pearcore-ui.js (loaded before this script).  They remain
// accessible as globals — no changes needed in consuming code.
