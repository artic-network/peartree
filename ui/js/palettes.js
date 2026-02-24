// palettes.js — shared colour palette definitions for discrete and continuous
// annotation colouring across the tree renderer, legend renderer, and SVG export.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Colour used for nodes / tips whose annotation value is absent or unknown
 * (null, undefined, empty string, or the conventional '?' missing-data marker).
 */
export const MISSING_DATA_COLOUR = '#aaaaaa';

/**
 * Named categorical palettes for discrete (categorical / ordinal) annotations.
 * Each value is an ordered array of CSS hex colour strings.  Values cycle when
 * there are more annotation categories than palette entries.
 */
export const CATEGORICAL_PALETTES = {

  /** Solarized accent colours — the original default. */
  'Solarized': [
    '#2aa198', // cyan
    '#cb4b16', // orange
    '#268bd2', // blue
    '#d33682', // magenta
    '#6c71c4', // violet
    '#b58900', // yellow
    '#859900', // green
    '#dc322f', // red
  ],

  /** High-contrast Bold palette — large, well-separated hues. */
  'Bold': [
    '#e6194b', // red
    '#3cb44b', // green
    '#4363d8', // blue
    '#f58231', // orange
    '#911eb4', // purple
    '#42d4f4', // cyan
    '#f032e6', // magenta
    '#bfef45', // lime
    '#fabed4', // pink
    '#469990', // teal
  ],

  /** Pastel — softer tones, suitable for light backgrounds. */
  'Pastel': [
    '#a8d8a8', // sage green
    '#f4a8a8', // rose
    '#a8c8f4', // sky blue
    '#f4d4a8', // peach
    '#d4a8f4', // lavender
    '#f4f4a8', // lemon
    '#a8f4f4', // aqua
    '#f4a8d4', // pink
  ],

  /** Tableau-10 — the palette used by Tableau / Vega default charts. */
  'Tableau': [
    '#4e79a7', // steel blue
    '#f28e2b', // tangerine
    '#e15759', // brick red
    '#76b7b2', // sage teal
    '#59a14f', // grass green
    '#edc948', // golden yellow
    '#b07aa1', // rose purple
    '#ff9da7', // salmon
    '#9c755f', // brown
    '#bab0ac', // grey
  ],

  /** ARTIC — colours sampled from the ARTIC network / PearTree Artic theme. */
  'ARTIC': [
    '#19A699', // teal
    '#B58901', // gold
    '#E06961', // coral red
    '#f7eeca', // cream
    '#3b9ddd', // sky blue
    '#8eb35a', // olive green
    '#c97fb5', // mauve
    '#6bcac0', // mint
  ],

};

/**
 * Named sequential (continuous) palettes for numeric (real / integer) annotations.
 * Each value is a two-element array `[minColour, maxColour]` using CSS hex strings.
 * The renderer interpolates linearly between the two endpoints.
 */
export const SEQUENTIAL_PALETTES = {

  /** Teal → Red — the original default. */
  'Teal-Red': ['#2aa198', '#dc322f'],

  /** Blue → Orange — a colourblind-friendly diverging pair. */
  'Blue-Orange': ['#2166ac', '#d6604d'],

  /** Purple → Gold */
  'Purple-Gold': ['#762a83', '#e08214'],

  /** Green → Purple */
  'Green-Purple': ['#1b7837', '#762a83'],

  /** Cool: Teal → Indigo */
  'Teal-Indigo': ['#2aa198', '#4b0082'],

  /** Viridis-like: Purple → Yellow */
  'Viridis': ['#440154', '#fde725'],

  /** Inferno-like: Black → Yellow */
  'Inferno': ['#000004', '#fcffa4'],

  /** Monochrome: White → Black */
  'Greyscale': ['#f5f5f5', '#111111'],

};

/** Key of the categorical palette used when none is explicitly selected. */
export const DEFAULT_CATEGORICAL_PALETTE = 'Solarized';

/** Key of the sequential palette used when none is explicitly selected. */
export const DEFAULT_SEQUENTIAL_PALETTE = 'Teal-Red';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return the colour array for the named categorical palette,
 * falling back to the default if the name is not found.
 * @param {string} [name]
 * @returns {string[]}
 */
export function getCategoricalPalette(name) {
  return CATEGORICAL_PALETTES[name] ?? CATEGORICAL_PALETTES[DEFAULT_CATEGORICAL_PALETTE];
}

/**
 * Return the `[minColour, maxColour]` pair for the named sequential palette,
 * falling back to the default if the name is not found.
 * @param {string} [name]
 * @returns {[string, string]}
 */
export function getSequentialPalette(name) {
  return SEQUENTIAL_PALETTES[name] ?? SEQUENTIAL_PALETTES[DEFAULT_SEQUENTIAL_PALETTE];
}

/**
 * Parse a CSS hex colour string (`#rrggbb`) into `{r, g, b}`.
 * @param {string} hex
 * @returns {{r:number, g:number, b:number}}
 */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * Linearly interpolate between the two colours of a sequential palette and
 * return a CSS `rgb(…)` string.
 *
 * @param {number}          t     Normalised position in [0, 1]  (0 = min, 1 = max)
 * @param {[string,string]} pair  `[minColour, maxColour]` hex pair from getSequentialPalette()
 * @returns {string}  CSS colour string
 */
export function lerpSequential(t, pair) {
  const tc = Math.max(0, Math.min(1, t));
  const lo = hexToRgb(pair[0]);
  const hi = hexToRgb(pair[1]);
  const r  = Math.round(lo.r + tc * (hi.r - lo.r));
  const g  = Math.round(lo.g + tc * (hi.g - lo.g));
  const b  = Math.round(lo.b + tc * (hi.b - lo.b));
  return `rgb(${r},${g},${b})`;
}
