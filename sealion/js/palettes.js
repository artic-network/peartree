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

  /**
   * Wes — a curated palette inspired by the muted, idiosyncratic
   * colour worlds of his films.  Hues are spread across the full wheel at
   * varied saturation and brightness so all 16 values remain legible and
   * clearly distinct from one another (and from the neutral missing-data grey).
   *
   * Film references (approximate):
   *   The Royal Tenenbaums · Moonrise Kingdom · The Life Aquatic
   *   Fantastic Mr. Fox · The Grand Budapest Hotel · The Darjeeling Limited
   *   Rushmore · Isle of Dogs
   */
  'Wes': [
    '#C1615A', // dusty red        — Tenenbaums burgundy warmth
    '#E07B39', // burnt orange      — Fantastic Mr. Fox
    '#C9A84C', // saffron gold      — Darjeeling Limited
    '#8D9040', // olive             — Moonrise Kingdom scouts
    '#4A7C3F', // forest green      — Tenenbaums tennis court
    '#2A6B5A', // deep teal-green   — Life Aquatic diving suit
    '#3D8C8C', // teal              — Life Aquatic vessel
    '#3D5A80', // muted navy        — Life Aquatic ocean
    '#5C4E8A', // dusty violet      — Budapest lobby carpet
    '#9B72AA', // soft lavender     — Budapest tower facade
    '#C06B82', // rose              — Budapest hotel uniform
    '#7D2E46', // deep burgundy     — Rushmore chapel
    '#6B4226', // rich brown        — Fox fur
    '#B8956A', // warm caramel      — Moonrise Kingdom canvas
    '#E8D0A3', // pale sand         — Isle of Dogs ash plain
    '#7A8594', // slate blue-grey   — Isle of Dogs industrial haze
  ],

};

/**
 * Named sequential (continuous) palettes for numeric (real / integer) annotations.
 * Each value is an array of 2 or more CSS hex colour strings ordered from the
 * minimum value colour to the maximum.  Extra stops are evenly distributed
 * across the value range and interpolated between at draw time.
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

  // ── Black-centre diverging (3 stops) ───────────────────────────────────
  // The midpoint black creates a dramatic separation between the two extremes.

  /** Blue → Black → Red */
  'Blue-Black-Red':     ['#1e70b5', '#111111', '#c82424'],

  /** Teal → Black → Orange */
  'Teal-Black-Orange':  ['#2aa198', '#111111', '#e07b39'],

  /** Purple → Black → Gold */
  'Purple-Black-Gold':  ['#6a2080', '#111111', '#d49800'],

  /** Cyan → Black → Magenta */
  'Cyan-Black-Magenta': ['#009bb5', '#111111', '#b52880'],

  // ── Spectrum palettes (multi-stop) ──────────────────────────────────────
  // Each sweeps a broad arc of the colour wheel with varied saturation and
  // brightness so every stop is clearly distinct.

  /** ARTIC — colours sampled from the ARTIC network / PearTree Artic theme. */
    'ARTIC': [
    '#7D2E46', // deep burgundy     — Rushmore chapel
    '#C1615A', // dusty red        — Tenenbaums burgundy warmth
    '#E07B39', // burnt orange      — Fantastic Mr. Fox
    '#C9A84C', // saffron gold      — Darjeeling Limited
    '#8D9040', // olive             — Moonrise Kingdom scouts
    '#4A7C3F', // forest green      — Tenenbaums tennis court
    '#2A6B5A', // deep teal-green   — Life Aquatic diving suit
    '#3D5A80', // muted navy        — Life Aquatic ocean
    '#5C4E8A', // dusty violet      — Budapest lobby carpet
      ],

  /**
   * Rainbow — a full hue sweep: red → orange → yellow → green → blue → violet.
   * Brightness is kept moderate so both ends remain legible on dark backgrounds.
   */
  'Rainbow': ['#d62728', '#f57c00', '#f9d600', '#2ca02c', '#1f77b4', '#9467bd'],

  /**
   * Sunset — deep indigo night sky through crimson and amber to pale dawn gold.
   */
  'Sunset': ['#1a0030', '#7b0d6b', '#c83520', '#e07800', '#f5c800', '#fdf5b0'],

  /**
   * Ocean — abyssal navy through cobalt and teal to bright cyan at the surface.
   */
  'Ocean': ['#040d28', '#18458f', '#1478b0', '#2aa198', '#5fd4cc'],

  /**
   * Fire — charcoal black through deep red, orange, and yellow to near-white.
   * Brightness increases monotonically toward the high end.
   */
  'Fire': ['#0d0000', '#6b0000', '#cc2200', '#ff7500', '#ffdc00', '#fffce0'],

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
 * Build a Map<value, colour> for a set of categorical annotation values.
 *
 * When the number of values is less than or equal to the palette length the
 * values are spread evenly across the full palette range so they stay
 * maximally distinct.  When there are more values than colours the palette
 * cycles as before.
 *
 * @param {string[]} values        – ordered list of distinct annotation values
 * @param {string}   [paletteName] – key into CATEGORICAL_PALETTES (falls back to default)
 * @returns {Map<string, string>}  – value → CSS colour
 */
export function buildCategoricalColourMap(values, paletteName) {
  const palette = getCategoricalPalette(paletteName);
  const n = values.length;
  const p = palette.length;
  const map = new Map();
  values.forEach((v, i) => {
    const idx = n <= p
      ? Math.round(i * (p - 1) / Math.max(n - 1, 1))
      : i % p;
    map.set(v, palette[idx]);
  });
  return map;
}

/**
 * Return the colour stops array for the named sequential palette,
 * falling back to the default if the name is not found.
 * @param {string} [name]
 * @returns {string[]}  Array of 2 or more hex colour strings, min → max.
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
 * Interpolate along a multi-stop sequential palette and return a CSS `rgb(…)`
 * string.  Stops are treated as evenly spaced across [0, 1].
 *
 * @param {number}   t      Normalised position in [0, 1]  (0 = min, 1 = max)
 * @param {string[]} stops  Two or more hex colour strings from getSequentialPalette()
 * @returns {string}  CSS colour string
 */
export function lerpSequential(t, stops) {
  const tc = Math.max(0, Math.min(1, t));
  const n  = stops.length;
  if (n === 0) return 'rgb(0,0,0)';
  if (n === 1) return stops[0];
  // Map t into segment index; clamp so t=1 selects the last segment exactly.
  const scaled = tc * (n - 1);
  const lo  = Math.min(Math.floor(scaled), n - 2);
  const lt  = scaled - lo;
  const loC = hexToRgb(stops[lo]);
  const hiC = hexToRgb(stops[lo + 1]);
  const r   = Math.round(loC.r + lt * (hiC.r - loC.r));
  const g   = Math.round(loC.g + lt * (hiC.g - loC.g));
  const b   = Math.round(loC.b + lt * (hiC.b - loC.b));
  return `rgb(${r},${g},${b})`;
}
