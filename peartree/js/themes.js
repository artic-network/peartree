// themes.js — built-in theme presets and application defaults
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Typeface registry: short display name → typeface descriptor.
 *
 * Each entry has:
 *   family        – CSS font-family stack string.
 *   styles        – map of style-name → { weight, fontStyle }.
 *   defaultStyle  – the style key used when no explicit style is specified.
 *
 * Used by buildFont() to produce a complete CSS font string for canvas
 * rendering (weight + font-style + size + family), fixing the historical
 * bug where TYPEFACE_WEIGHTS were defined but never applied.
 *
 * Legacy keys like 'Helvetica Neue Light' and 'Helvetica Neue Thin' are kept
 * in LEGACY_TYPEFACE_MAP so that old saved settings can be migrated on load.
 */
export const TYPEFACES = {
  'Monospace': {
    family:       'monospace',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Sans-serif': {
    family:       'sans-serif',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Serif': {
    family:       'serif',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Courier New': {
    family:       "'Courier New', Courier, monospace",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Helvetica': {
    family:       "'Helvetica Neue', Helvetica, Arial, sans-serif",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Helvetica Neue': {
    family:       "'Helvetica Neue', Helvetica, Arial, sans-serif",
    styles: {
      'Thin':        { weight: 100, fontStyle: 'normal'  },
      'Thin Italic': { weight: 100, fontStyle: 'italic'  },
      'Light':       { weight: 300, fontStyle: 'normal'  },
      'Light Italic':{ weight: 300, fontStyle: 'italic'  },
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Georgia': {
    family:       'Georgia, serif',
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Times New Roman': {
    family:       "'Times New Roman', Times, serif",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'System UI': {
    family:       "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
  'Menlo': {
    family:       "Menlo, 'DejaVu Sans Mono', 'Lucida Console', monospace",
    styles: {
      'Regular':     { weight: 400, fontStyle: 'normal'  },
      'Bold':        { weight: 700, fontStyle: 'normal'  },
      'Italic':      { weight: 400, fontStyle: 'italic'  },
      'Bold Italic': { weight: 700, fontStyle: 'italic'  },
    },
    defaultStyle: 'Regular',
  },
};

/**
 * Maps legacy typeface keys (used in old saved settings and themes) to
 * the new { typefaceKey, typefaceStyle } form.
 */
export const LEGACY_TYPEFACE_MAP = {
  'Helvetica Neue Light': { typefaceKey: 'Helvetica Neue', typefaceStyle: 'Light'   },
  'Helvetica Neue Thin':  { typefaceKey: 'Helvetica Neue', typefaceStyle: 'Thin'    },
  // These are unchanged — include for completeness so code can always use this map.
  'Helvetica':            { typefaceKey: 'Helvetica',      typefaceStyle: 'Regular' },
  'Helvetica Neue':       { typefaceKey: 'Helvetica Neue', typefaceStyle: 'Regular' },
};

/**
 * Build a CSS font string suitable for ctx.font from a typeface key, style
 * name, and size in pixels.
 *
 * @param {string} typefaceKey   – Key into TYPEFACES (e.g. 'Helvetica Neue').
 * @param {string} styleName     – Style key (e.g. 'Thin', 'Regular', 'Bold').
 *                                 Falls back to defaultStyle if not found.
 * @param {number} sizePx        – Font size in CSS pixels.
 * @returns {string}             – e.g. "italic 100 11px 'Helvetica Neue', Helvetica, sans-serif"
 */
export function buildFont(typefaceKey, styleName, sizePx) {
  const face = TYPEFACES[typefaceKey];
  if (!face) {
    // Unknown key — best-effort: treat key as a raw CSS family string.
    return `${sizePx}px ${typefaceKey}`;
  }
  const style = face.styles[styleName] ?? face.styles[face.defaultStyle];
  const parts = [];
  if (style.fontStyle && style.fontStyle !== 'normal') parts.push(style.fontStyle);
  if (style.weight    && style.weight    !== 400)      parts.push(style.weight);
  parts.push(`${sizePx}px`);
  parts.push(face.family);
  return parts.join(' ');
}

/**
 * Resolve a legacy fontFamily string to { typefaceKey, typefaceStyle }.
 * Returns the original key unchanged if it is already a valid TYPEFACES key.
 */
export function resolveLegacyTypeface(key) {
  if (TYPEFACES[key]) return { typefaceKey: key, typefaceStyle: TYPEFACES[key].defaultStyle };
  if (LEGACY_TYPEFACE_MAP[key]) return LEGACY_TYPEFACE_MAP[key];
  // Unknown — treat as raw family; use Monospace as fallback display key.
  return { typefaceKey: 'Monospace', typefaceStyle: 'Regular' };
}

export const SETTINGS_KEY      = 'peartree-settings';
export const USER_THEMES_KEY   = 'peartree-user-themes';
export const DEFAULT_THEME_KEY = 'peartree-default-theme';

export const THEMES = {
      "Minimal": {
          canvasBgColor:    '#fffffc',
          branchColor:      '#302f29',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Monospace',
          labelColor:       '#000000',
          tipSize:          '2',
          tipHaloSize:      '1',
          tipShapeColor:    '#fffffc',
          tipShapeBgColor:  '#302f29',
          nodeSize:         '0',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#302f29',
          nodeShapeBgColor: '#fffffc',
          axisColor:        '#444302f2944',
          legendTextColor:  '#302f29',
          nodeBarsColor:    '#f5a700',
          selectedTipStrokeColor:       '#E06961',
          selectedTipFillColor:         '#E06961',
          selectedNodeStrokeColor:      '#19A699',
          selectedNodeFillColor:        '#19A699',
          tipHoverStrokeColor:          '#f5a700',
          tipHoverFillColor:            '#f5a700',
          nodeHoverStrokeColor:         '#f5a700',
          nodeHoverFillColor:           '#f5a700',
          rttAxisColor:       '#302f29',
          rttStatsBgColor:    '#e8e8e4',
          rttStatsTextColor:  '#302f29',
          rttRegressionColor: '#302f29',
      },
      "Artic": {
          canvasBgColor:    '#02292e',
          branchColor:      '#19A699',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Helvetica Neue',
          typefaceStyle:    'Thin',
          labelColor:       '#f7eeca',
          tipSize:          '3',
          tipHaloSize:      '1',
          tipShapeColor:    '#B58901',
          tipShapeBgColor:  '#02292e',
          nodeSize:         '0',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#E06961',
          nodeShapeBgColor: '#02292e',
          nodeBarsColor:      '#2aa198',
          axisColor:        '#f7eeca',
          legendTextColor:  '#f7eeca',
          nodeBarsColor:    '#E06961',
          rttAxisColor:       '#f7eeca',
          rttStatsBgColor:    '#011a1f',
          rttStatsTextColor:  '#f7eeca',
          rttRegressionColor: '#19A699',
      },
      "BEAST": {
          canvasBgColor:    '#02292e',
          branchColor:      '#68a3bb',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Monospace',
          labelColor:       '#B1CBB8',
          tipSize:          '3',
          tipHaloSize:      '1',
          tipShapeColor:    '#CBB944',
          tipShapeBgColor:  '#02292e',
          nodeSize:         '0',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#3B6F84',
          nodeShapeBgColor: '#02292e',
          axisColor:        '#B1CBB8',
          legendTextColor:  '#B1CBB8',
          nodeBarsColor:    '#CBB944',
          selectedTipFillColor:    '#FFF4A9',
          selectedTipStrokeColor:   '#FFF4A9',
          selectedNodeFillColor:   '#B1CBB8',
          selectedNodeStrokeColor:       '#B1CBB8',
          rttAxisColor:       '#B1CBB8',
          rttStatsBgColor:    '#011a1e',
          rttStatsTextColor:  '#B1CBB8',
          rttRegressionColor: '#68a3bb',
      },
      "O'Toole": {
          canvasBgColor:    '#f4f3f3',
          branchColor:      '#7984BC',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Helvetica Neue',
          typefaceStyle:    'Light',
          labelColor:       '#7984BC',
          tipSize:          '3',
          tipHaloSize:      '1',
          tipShapeColor:    '#AF808B',
          tipShapeBgColor:  '#D8D4D3',
          nodeSize:         '2',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#88B2BA',
          nodeShapeBgColor: '#D8D4D3',
          axisColor:        '#7984BC',
          legendTextColor:  '#7984BC',
          nodeBarsColor:    '#88B2BA',
          selectedTipFillColor:    '#7f3e4d',
          selectedTipStrokeColor:   '#7f3e4d',
          selectedNodeFillColor:   '#263b3f',
          selectedNodeStrokeColor:       '#263b3f',
          tipHoverFillColor:       '#7f3e4d',
          tipHoverStrokeColor:     '#7f3e4d',
          nodeHoverFillColor:  '#263b3f',
          nodeHoverStrokeColor:    '#263b3f',
          rttAxisColor:       '#7984BC',
          rttStatsBgColor:    '#dddcdb',
          rttStatsTextColor:  '#7984BC',
          rttRegressionColor: '#88B2BA',
      },
      // // Warm pastels: Grand Budapest Hotel / Moonrise Kingdom palette
      // "Wes": {
      //     canvasBgColor:    '#f5edd6',
      //     branchColor:      '#7b3b5e',
      //     branchWidth:      '1',
      //     fontSize:         '11',
      //     labelColor:       '#4a2040',
      //     tipSize:          '4',
      //     tipHaloSize:      '2',
      //     tipShapeColor:    '#d4614b',
      //     tipShapeBgColor:  '#f5edd6',
      //     nodeSize:         '0',
      //     nodeHaloSize:     '2',
      //     nodeShapeColor:   '#b8962e',
      //     nodeShapeBgColor: '#f5edd6',
      //     axisColor:        '#4a2040',
      // },
      // Deep jewel tones: The Life Aquatic / Isle of Dogs palette
      "MCM": {
          canvasBgColor:    '#1e2d3a',
          branchColor:      '#edd59c',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Monospace',
          labelColor:       '#f4c9a8',
          tipSize:          '4',
          tipHaloSize:      '1',
          tipShapeColor:    '#e07b65',
          tipShapeBgColor:  '#1e2d3a',
          nodeSize:         '3',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#7dbfcc',
          nodeShapeBgColor: '#1e2d3a',
          axisColor:        '#edd59c',
          legendTextColor:  '#edd59c',
          nodeBarsColor:    '#7dbfcc',
          rttAxisColor:       '#edd59c',
          rttStatsBgColor:    '#121c24',
          rttStatsTextColor:  '#edd59c',
          rttRegressionColor: '#7dbfcc',
      },
      // Royal Tenenbaums: aged plaster, forest green, burgundy, tennis-ball gold
      "Tenenbaums": {
          canvasBgColor:    '#f0e8d8',
          branchColor:      '#2b4a2a',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Monospace',
          labelColor:       '#1c3220',
          tipSize:          '3',
          tipHaloSize:      '1',
          tipShapeColor:    '#a01830',
          tipShapeBgColor:  '#f0e8d8',
          nodeSize:         '2',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#c8a020',
          nodeShapeBgColor: '#f0e8d8',
          axisColor:        '#2b4a2a',
          legendTextColor:  '#2b4a2a',
          nodeBarsColor:    '#a01830',
          rttAxisColor:       '#2b4a2a',
          rttStatsBgColor:    '#d8cfbf',
          rttStatsTextColor:  '#1c3220',
          rttRegressionColor: '#2b4a2a',
      },
      // Fantastic Mr Fox: night earth, fox orange, rust, harvest green
      "Mr Fox": {
          canvasBgColor:    '#1a0d00',
          branchColor:      '#e87830',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Monospace',
          labelColor:       '#f0c060',
          tipSize:          '3',
          tipHaloSize:      '1',
          tipShapeColor:    '#c84a18',
          tipShapeBgColor:  '#1a0d00',
          nodeSize:         '3',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#508a28',
          nodeShapeBgColor: '#1a0d00',
          axisColor:        '#f0c060',
          legendTextColor:  '#f0c060',
          nodeBarsColor:    '#508a28',
          rttAxisColor:       '#f0c060',
          rttStatsBgColor:    '#0e0800',
          rttStatsTextColor:  '#f0c060',
          rttRegressionColor: '#e87830',
      },
      // The Darjeeling Limited: warm cream, saffron, cerulean, rust
      "Darjeeling": {
          canvasBgColor:    '#faf0d8',
          branchColor:      '#c87010',
          branchWidth:      '1',
          fontSize:         '11',
          fontFamily:       'Monospace',
          labelColor:       '#3a2010',
          tipSize:          '4',
          tipHaloSize:      '1',
          tipShapeColor:    '#1a5878',
          tipShapeBgColor:  '#faf0d8',
          nodeSize:         '0',
          nodeHaloSize:     '1',
          nodeShapeColor:   '#c04428',
          nodeShapeBgColor: '#faf0d8',
          axisColor:        '#3a2010',
          legendTextColor:  '#3a2010',
          nodeBarsColor:    '#1a5878',
          rttAxisColor:       '#3a2010',
          rttStatsBgColor:    '#e8d8c0',
          rttStatsTextColor:  '#3a2010',
          rttRegressionColor: '#c87010',
      },
      // // Mid Century Modern – Birch: warm white, teak, avocado, harvest gold
      // "MCM Birch": {
      //     canvasBgColor:    '#f2ede0',
      //     branchColor:      '#5c3a1e',
      //     branchWidth:      '1',
      //     fontSize:         '11',
      //     labelColor:       '#2a1c10',
      //     tipSize:          '4',
      //     tipHaloSize:      '2',
      //     tipShapeColor:    '#5a7a2a',
      //     tipShapeBgColor:  '#f2ede0',
      //     nodeSize:         '0',
      //     nodeHaloSize:     '2',
      //     nodeShapeColor:   '#c88c24',
      //     nodeShapeBgColor: '#f2ede0',
      //     axisColor:        '#2a1c10',
      // },
      // // Mid Century Modern – Walnut: warm sand, burnt sienna, mustard, teal
      // "MCM Walnut": {
      //     canvasBgColor:    '#e8dcc8',
      //     branchColor:      '#8c4822',
      //     branchWidth:      '1',
      //     fontSize:         '11',
      //     labelColor:       '#3a1c0a',
      //     tipSize:          '4',
      //     tipHaloSize:      '2',
      //     tipShapeColor:    '#c89520',
      //     tipShapeBgColor:  '#e8dcc8',
      //     nodeSize:         '0',
      //     nodeHaloSize:     '2',
      //     nodeShapeColor:   '#2a6870',
      //     nodeShapeBgColor: '#e8dcc8',
      //     axisColor:        '#3a1c0a',
      // },
      // // Mid Century Modern – Eames: dark walnut, warm amber, turquoise, coral
      // "MCM Eames": {
      //     canvasBgColor:    '#1a1208',
      //     branchColor:      '#d08830',
      //     branchWidth:      '1',
      //     fontSize:         '11',
      //     labelColor:       '#f0d890',
      //     tipSize:          '4',
      //     tipHaloSize:      '2',
      //     tipShapeColor:    '#2a8878',
      //     tipShapeBgColor:  '#1a1208',
      //     nodeSize:         '0',
      //     nodeHaloSize:     '2',
      //     nodeShapeColor:   '#c44030',
      //     nodeShapeBgColor: '#1a1208',
      //     axisColor:        '#f0d890',
      // },

};

// DEFAULT_SETTINGS moved to config.js

// Re-export for backward compatibility if needed by other modules.
export { DEFAULT_SETTINGS } from './config.js';
