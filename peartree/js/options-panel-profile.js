/**
 * Declarative options-panel profile for PearTree.
 *
 * Client apps can import this and:
 *  - use as-is for PearTree-like panel behaviour
 *  - clone/modify the returned rules/cascades before applying
 */
export function createPeartreeOptionsPanelProfile({
  root,
  extraShapeCount,
  tipShapesFilterEl,
  nodeShapesFilterEl,
  tipLabelsFilterEl,
  nodeLabelsFilterEl,
  branchLabelsFilterEl,
  nodeBarsFilterEl,
  branchShapesFilterEl,
  tipShapeDetailEl,
  nodeShapeDetailEl,
  tipLabelShapeDetailEl,
  tipLabelShapeExtraSectionEls,
  tipLabelShapeExtraDetailEls,
  branchShapeDetailEl,
  branchShapeExtraSectionEls,
  branchShapeExtraDetailEls,
  nodeLabelDetailEl,
  branchLabelDetailEl,
  nodeBarsDetailEl,
  nodeBars2SectionEl,
  nodeBars2DetailEl,
  nodeBars3SectionEl,
  nodeBars3DetailEl,
  nodeBars4SectionEl,
  nodeBars4DetailEl,
  legendDetailEl,
  legend2SectionEl,
  legend2DetailEl,
  legend3SectionEl,
  legend3DetailEl,
  legend4SectionEl,
  legend4DetailEl,
  axisDetailEl,
  tipLabel2SectionEl,
  tipLabel3SectionEl,
  tipLabel4SectionEl,
  tipLabel2DetailEl,
  tipLabel3DetailEl,
  tipLabel4DetailEl,
} = {}) {
  const filterRow = (el) => el?.closest('.pt-palette-row') || null;
  const spacingRowEl = root?.querySelector('#tip-label-shape-spacing-row') || null;

  const cascades = [
    {
      id: 'tip-label-shape-cascade',
      controls: ['tip-label-shape', ...Array.from({ length: extraShapeCount }, (_, i) => `tip-label-shape-${i + 2}`)],
      offValue: 'off',
      restore: true,
    },
    {
      id: 'legend-annotation-cascade',
      controls: ['legend-annotation', 'legend-annotation-2', 'legend-annotation-3', 'legend-annotation-4'],
      offValue: '',
      restore: true,
    },
    {
      id: 'node-bars-cascade',
      controls: ['node-bars-show', 'node-bars-show-2', 'node-bars-show-3', 'node-bars-show-4'],
      offValue: 'off',
      restore: true,
    },
  ];

  const rules = [
    { control: 'tip-size-slider', when: (v) => parseInt(v, 10) > 0, target: filterRow(tipShapesFilterEl), mode: 'row' },
    { control: 'node-size-slider', when: (v) => parseInt(v, 10) > 0, target: filterRow(nodeShapesFilterEl), mode: 'row' },
    { control: 'tip-label-show', notEquals: 'off', target: filterRow(tipLabelsFilterEl), mode: 'row' },
    { control: 'node-label-show', notEquals: '', target: filterRow(nodeLabelsFilterEl), mode: 'row' },
    { control: 'branch-label-show', notEquals: '', target: filterRow(branchLabelsFilterEl), mode: 'row' },
    { control: 'node-bars-show', notEquals: 'off', target: filterRow(nodeBarsFilterEl), mode: 'row' },
    { control: 'branch-shape', notEquals: 'off', target: filterRow(branchShapesFilterEl), mode: 'row' },

    { control: 'tip-size-slider', when: (v) => parseInt(v, 10) > 0, target: tipShapeDetailEl, mode: 'detail' },
    { control: 'node-size-slider', when: (v) => parseInt(v, 10) > 0, target: nodeShapeDetailEl, mode: 'detail' },
    { control: 'tip-label-shape', notEquals: 'off', target: tipLabelShapeDetailEl, mode: 'detail' },
    {
      control: 'tip-label-shape',
      when: (v, p) => v !== 'off' && p.getValue('tip-label-shape-2') !== 'off',
      target: spacingRowEl,
      mode: 'row',
    },

    ...tipLabelShapeExtraSectionEls.map((sectionEl, i) => ({
      control: i === 0 ? 'tip-label-shape' : `tip-label-shape-${i + 1}`,
      notEquals: 'off',
      target: sectionEl,
      mode: 'detail',
    })),
    ...tipLabelShapeExtraDetailEls.map((detailEl, i) => ({
      control: `tip-label-shape-${i + 2}`,
      notEquals: 'off',
      target: detailEl,
      mode: 'detail',
    })),

    { control: 'branch-shape', notEquals: 'off', target: branchShapeDetailEl, mode: 'detail' },
    ...branchShapeExtraSectionEls.map((sectionEl, i) => ({
      control: i === 0 ? 'branch-shape' : `branch-shape-${i + 1}`,
      notEquals: 'off',
      target: sectionEl,
      mode: 'detail',
    })),
    ...branchShapeExtraDetailEls.map((detailEl, i) => ({
      control: `branch-shape-${i + 2}`,
      notEquals: 'off',
      target: detailEl,
      mode: 'detail',
    })),

    { control: 'node-label-show', notEquals: '', target: nodeLabelDetailEl, mode: 'detail' },
    { control: 'branch-label-show', notEquals: '', target: branchLabelDetailEl, mode: 'detail' },
    { control: 'node-bars-show', notEquals: 'off', target: nodeBarsDetailEl, mode: 'detail' },
    { control: 'node-bars-show',   notEquals: 'off', target: nodeBars2SectionEl, mode: 'detail' },
    { control: 'node-bars-show-2', notEquals: 'off', target: nodeBars2DetailEl, mode: 'detail' },
    { control: 'node-bars-show-2', notEquals: 'off', target: nodeBars3SectionEl, mode: 'detail' },
    { control: 'node-bars-show-3', notEquals: 'off', target: nodeBars3DetailEl, mode: 'detail' },
    { control: 'node-bars-show-3', notEquals: 'off', target: nodeBars4SectionEl, mode: 'detail' },
    { control: 'node-bars-show-4', notEquals: 'off', target: nodeBars4DetailEl, mode: 'detail' },

    { control: 'legend-annotation', notEquals: '', target: legendDetailEl, mode: 'detail' },
    { control: 'legend-annotation', notEquals: '', target: legend2SectionEl, mode: 'detail' },
    { control: 'legend-annotation-2', notEquals: '', target: legend2DetailEl, mode: 'detail' },
    { control: 'legend-annotation-2', notEquals: '', target: legend3SectionEl, mode: 'detail' },
    { control: 'legend-annotation-3', notEquals: '', target: legend3DetailEl, mode: 'detail' },
    { control: 'legend-annotation-3', notEquals: '', target: legend4SectionEl, mode: 'detail' },
    { control: 'legend-annotation-4', notEquals: '', target: legend4DetailEl, mode: 'detail' },

    { control: 'axis-show', notEquals: 'off', target: axisDetailEl, mode: 'detail' },
    { control: 'tip-label-show', notEquals: 'off', target: tipLabel2SectionEl, mode: 'detail' },
    {
      control: 'tip-label2-show',
      when: (v, p) => p.getValue('tip-label-show') !== 'off' && v !== 'off',
      target: tipLabel3SectionEl,
      mode: 'detail',
    },
    {
      control: 'tip-label3-show',
      when: (v, p) => p.getValue('tip-label-show') !== 'off' && v !== 'off',
      target: tipLabel4SectionEl,
      mode: 'detail',
    },
    {
      control: 'tip-label2-show',
      when: (v, p) => p.getValue('tip-label-show') !== 'off' && v !== 'off',
      target: tipLabel2DetailEl,
      mode: 'detail',
    },
    {
      control: 'tip-label3-show',
      when: (v, p) => p.getValue('tip-label-show') !== 'off' && v !== 'off',
      target: tipLabel3DetailEl,
      mode: 'detail',
    },
    {
      control: 'tip-label4-show',
      when: (v, p) => p.getValue('tip-label-show') !== 'off' && v !== 'off',
      target: tipLabel4DetailEl,
      mode: 'detail',
    },
  ];

  return { cascades, rules };
}
