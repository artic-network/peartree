// annotation-utils.js — Generic annotation type inference, schema building & formatting.
// Extracted from phylograph.js so apps that are not tree-specific can share
// annotation infrastructure (curator, importer, legends, etc.).
// ─────────────────────────────────────────────────────────────────────────────

// ── Well-known annotation bounds ──────────────────────────────────────────

/**
 * Well-known annotation names whose colour/legend scales should span a fixed
 * range (e.g. 0–1 for posterior probability) regardless of the data range.
 *
 * Keys are matched case-insensitively.  A `null` bound means "use observed".
 * @type {Map<string, {min:number, max:number}>}
 */
export const KNOWN_ANNOTATION_BOUNDS = new Map([
  // Bayesian posterior probability / support
  ['posterior',             { min: 0, max: 1 }],
  ['posterior_probability', { min: 0, max: 1 }],
  ['prob',                  { min: 0, max: 1 }],
  ['probability',           { min: 0, max: 1 }],
  // Bootstrap / general node support expressed as a proportion (0–1)
  // or percentage (0–100) – detected at schema-build time from observed values.
  ['support',               { min: 0, max: 1 }],
  ['bootstrap',             { min: 0, max: 1 }],
  // Explicitly percent-named annotations
  ['percent',               { min: 0, max: 100 }],
  ['percentage',            { min: 0, max: 100 }],
  ['pct',                   { min: 0, max: 100 }],
  ['perc',                  { min: 0, max: 100 }],
  // Common date/time decimal-year annotations do NOT have fixed bounds — omitted.
]);

/**
 * Annotation names that are inherently *branch* annotations: stored on the
 * descendant node in a rooted tree but semantically describe the branch
 * leading to the parent, not a property of the node itself.  These are
 * transferred to the new descendant when a tree is rerooted.
 *
 * Matched case-insensitively.
 * @type {Set<string>}
 */
export const KNOWN_BRANCH_ANNOTATIONS = new Set([
  'bootstrap', 'support',
  'posterior', 'posterior_probability', 'prob', 'probability',
  'label',    // raw non-numeric Newick internal-node labels
]);

// ── Type helpers ──────────────────────────────────────────────────────────

/**
 * True for any numeric annotation type: real, integer, proportion, or percentage.
 * Use instead of multiple `=== 'real' || === 'integer'` comparisons.
 * @param {string} dt
 */
export function isNumericType(dt) {
  return dt === 'real' || dt === 'integer' || dt === 'proportion' || dt === 'percentage';
}

// ── Date utilities ────────────────────────────────────────────────────────

export const DATE_FULL_RE  = /^\d{4}-\d{2}-\d{2}$/;
export const DATE_MONTH_RE = /^\d{4}-\d{2}$/;
export const DATE_YEAR_RE  = /^\d{1,4}$/;

export function isDateString(v) {
  return typeof v === 'string' &&
    (DATE_FULL_RE.test(v) || DATE_MONTH_RE.test(v) || DATE_YEAR_RE.test(v));
}

/**
 * Chronological comparator for ISO date strings (yyyy-mm-dd, yyyy-mm, or yyyy).
 * Compares first by numeric year (so variable-length years like "700" and "1990"
 * sort correctly rather than alphabetically), then by the full string for
 * same-year month/day disambiguation.
 */
export function compareDateStrings(a, b) {
  const aYear = parseInt(a, 10);
  const bYear = parseInt(b, 10);
  if (aYear !== bYear) return aYear - bYear;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ── Annotation formatter ──────────────────────────────────────────────────

/**
 * Build a number-to-string formatter calibrated to an annotation's observed range.
 * Uses the actual data range (observedMin/observedMax) to set resolution, so that
 * consecutive tick labels are always distinguishable, then picks fixed-point or
 * scientific notation based on magnitude.
 *
 * @param  {object} def   AnnotationDef with { dataType, observedMin, observedMax }
 * @param  {string} [mode='ticks']  'ticks' – precision for axis/legend tick labels (~5 divisions);
 *                                  'value' – higher precision for individual data values (+2 dp)
 * @returns {(v:number) => string}
 */
export function makeAnnotationFormatter(def, mode = 'ticks') {
  if (!def || !isNumericType(def.dataType)) {
    return v => String(v);
  }
  // proportion and percentage share the 'real' continuous formatting path;
  // integer (and percentage-from-integers) uses fast integer rounding.
  if (def.dataType === 'integer') return v => String(Math.round(v));
  // If the user has pinned a fixed number of decimal places in the curator, honour it.
  if (def.decimalPlaces != null) return v => v.toFixed(def.decimalPlaces);

  const obsMin   = def.observedMin ?? def.min ?? 0;
  const obsMax   = def.observedMax ?? def.max ?? 1;
  const obsRange = Math.abs(obsMax - obsMin);
  const maxAbs   = Math.max(Math.abs(obsMin), Math.abs(obsMax));

  // Step size assuming ~5 ticks; dpTicks = decimal places to distinguish consecutive ticks.
  const step    = obsRange > 0 ? obsRange / 5 : (maxAbs > 0 ? maxAbs / 5 : 1);
  const dpTicks = step > 0 ? Math.max(0, Math.ceil(-Math.log10(step))) : 2;
  // Value mode adds 2 extra decimal places so individual data points are distinguishable.
  const dp      = mode === 'value' ? dpTicks + 2 : dpTicks;

  // Scientific notation when fixed would need >4 tick-level dp, or magnitude is extreme.
  const useExp = dpTicks > 4 || maxAbs >= 1e6 || (maxAbs > 0 && maxAbs < 1e-3);

  if (useExp) return v => v === 0 ? '0' : v.toExponential(mode === 'value' ? 4 : 2);
  return v => v.toFixed(dp);
}

// ── Type inference ────────────────────────────────────────────────────────

/**
 * Infer an AnnotationDef (without `name`) from a flat array of observed values.
 * Called recursively for list element types.
 *
 * @param  {any[]} values  – all observed non-null values for one annotation key
 * @returns {Omit<AnnotationDef, 'name'>}
 */
export function inferAnnotationType(values) {
  // ── List type: at least one value is an array ────────────────────────────
  if (values.some(v => Array.isArray(v))) {
    const elements = values.flatMap(v => Array.isArray(v) ? v : [v]);
    return { dataType: 'list', elementType: inferAnnotationType(elements) };
  }

  // ── Numeric types ────────────────────────────────────────────────────────
  const numericValues = values.filter(v => typeof v === 'number' && !Number.isNaN(v));
  if (numericValues.length === values.length) {
    // Avoid Math.min/max spread — large annotation arrays overflow the argument stack.
    let min = Infinity, max = -Infinity;
    for (const v of numericValues) { if (v < min) min = v; if (v > max) max = v; }
    const allInteger = numericValues.every(v => Number.isInteger(v));
    // observedMin/Max preserve the actual data range; min/max may be overridden later
    // by KNOWN_ANNOTATION_BOUNDS (e.g. posterior always 0–1).
    return { dataType: allInteger ? 'integer' : 'real', min, max, observedMin: min, observedMax: max };
  }

  // ── Date type (yyyy-mm-dd, yyyy-mm, or yyyy) ─────────────────────────────
  // Require at least one value in yyyy-mm or yyyy-mm-dd form to confirm it is
  // a date annotation, not just bare integer years (which are detected above).
  const stringValues = values.map(v => String(v));
  if (stringValues.every(isDateString) &&
      stringValues.some(v => DATE_FULL_RE.test(v) || DATE_MONTH_RE.test(v))) {
    const distinct = [...new Set(stringValues)].sort(compareDateStrings);
    return { dataType: 'date', values: distinct, min: distinct[0], max: distinct[distinct.length - 1] };
  }

  // ── Categorical (default for string / mixed) ─────────────────────────────
  const distinct = [...new Set(stringValues)].sort();
  return { dataType: 'categorical', values: distinct };
}

// ── Schema builder ────────────────────────────────────────────────────────

/**
 * BEAST suffix grouping constants — used by buildAnnotationSchema to detect
 * keys like `height_median`, `height_95%_HPD` and link them to a base key.
 */
const BEAST_SUFFIXES = [
  ['_95%_HPD', 'hpd'],
  ['_median',  'median'],
  ['_range',   'range'],
  ['_mean',    'mean'],
  ['_lower',   'lower'],
  ['_upper',   'upper'],
];

/**
 * Build an AnnotationSchema by scanning all items (nodes/tips/data rows).
 * The schema is a Map<name, AnnotationDef> keyed by annotation name.
 *
 * Data types are inferred automatically:
 *   real        – all values are non-integer numbers
 *   integer     – all values are integers
 *   date        – all values are ISO date strings (yyyy-mm[-dd]); sorted chronologically
 *   categorical – values are strings (or a mix); distinct values listed
 *   ordinal     – not auto-detected; upgrade manually when order is known
 *   list        – values are arrays; elementType is inferred recursively
 *
 * @param  {object[]}  items            – array of items with `.annotations` objects
 * @param  {object}    [opts]
 * @param  {Function}  [opts.isTip]     – (item) => boolean; classifies items as
 *                                         tips vs internal items.  When omitted,
 *                                         all items are treated as tips.
 * @param  {Set}       [opts.branchAnnotations]  – names to auto-flag as branch
 *                                                  annotations; defaults to KNOWN_BRANCH_ANNOTATIONS
 * @returns {Map<string, AnnotationDef>}
 */
export function buildAnnotationSchema(items, opts = {}) {
  const isTip = opts.isTip ?? (() => true);
  const branchAnnotations = opts.branchAnnotations ?? KNOWN_BRANCH_ANNOTATIONS;

  // Collect all annotation keys across all items, tracking tip vs internal presence.
  const allKeys = new Set();
  for (const item of items) {
    for (const k of Object.keys(item.annotations)) allKeys.add(k);
  }

  const schema = new Map();
  for (const name of allKeys) {
    const values = [];
    let onTips  = false;
    let onNodes = false;
    for (const item of items) {
      if (Object.prototype.hasOwnProperty.call(item.annotations, name)) {
        const v = item.annotations[name];
        if (v !== null && v !== undefined && v !== '?') {
          values.push(v);
          if (isTip(item)) onTips  = true;
          else             onNodes = true;
        }
      }
    }
    if (values.length > 0) {
      const def = { name, onTips, onNodes, ...inferAnnotationType(values) };
      // Override min/max with well-known fixed bounds when they exist, so the
      // colour scale always spans the full canonical range (e.g. 0–1 for posterior).
      const knownKey = [...KNOWN_ANNOTATION_BOUNDS.keys()]
        .find(k => k.toLowerCase() === name.toLowerCase());
      if (knownKey && (def.dataType === 'real' || def.dataType === 'integer')) {
        const bounds = KNOWN_ANNOTATION_BOUNDS.get(knownKey);
        // If the canonical range is 0–1 but observed values exceed 1, treat the
        // annotation as a percentage (0–100 scale) instead.
        const effectiveBounds =
          (bounds.max === 1 && def.observedMax != null && def.observedMax > 1)
            ? { min: 0, max: 100 }
            : bounds;
        def.min = effectiveBounds.min;
        def.max = effectiveBounds.max;
        def.fixedBounds = true;
        // Assign semantic type based on fixed bounds range.
        if (effectiveBounds.min === 0 && effectiveBounds.max === 1) {
          def.dataType = 'proportion';
        } else if (effectiveBounds.min === 0 && effectiveBounds.max === 100) {
          def.dataType = 'percentage';
        }
        // observedMin/observedMax are preserved from inferAnnotationType.
      }
      // Attach formatters and observed range for convenient use by renderers.
      if (isNumericType(def.dataType)) {
        def.observedRange = (def.observedMax ?? def.max ?? 0) - (def.observedMin ?? def.min ?? 0);
        def.fmt      = makeAnnotationFormatter(def, 'ticks');
        def.fmtValue = makeAnnotationFormatter(def, 'value');
      }
      // Auto-flag well-known branch annotations (user can override in curator).
      const lowerName = name.toLowerCase();
      if ([...branchAnnotations].some(k => k.toLowerCase() === lowerName)) {
        def.isBranchAnnotation = true;
      }

      // The annotation key 'date' should always be promoted to dataType 'date'
      // when all values are recognisable date strings or plausible integer years.
      if (name === 'date' && def.dataType !== 'date') {
        const strVals = values.map(v => String(v));
        if (strVals.every(isDateString)) {
          const distinct = [...new Set(strVals)].sort(compareDateStrings);
          def.dataType = 'date';
          def.values   = distinct;
          def.min      = distinct[0];
          def.max      = distinct[distinct.length - 1];
          delete def.observedMin;
          delete def.observedMax;
          delete def.observedRange;
          delete def.fmt;
          delete def.fmtValue;
          delete def.fixedBounds;
        }
      }

      schema.set(name, def);
    }
  }

  // ── BEAST annotation grouping ───────────────────────────────────────────
  for (const [name, def] of schema) {
    for (const [suffix, label] of BEAST_SUFFIXES) {
      if (name.endsWith(suffix)) {
        const base = name.slice(0, -suffix.length);
        if (schema.has(base)) {
          def.groupMember = base;
          const baseDef = schema.get(base);
          baseDef.group = baseDef.group || {};
          baseDef.group[label] = name;
        }
        break;
      }
    }
  }

  // ── Synthesize missing base keys from _mean ────────────────────────────
  {
    const orphanedBases = new Map();
    for (const name of schema.keys()) {
      for (const [suffix, label] of BEAST_SUFFIXES) {
        if (name.endsWith(suffix)) {
          const base = name.slice(0, -suffix.length);
          if (!schema.has(base)) {
            if (!orphanedBases.has(base)) orphanedBases.set(base, new Map());
            orphanedBases.get(base).set(label, name);
          }
          break;
        }
      }
    }

    for (const [base, members] of orphanedBases) {
      if (!members.has('mean')) continue;
      const meanKey = base + '_mean';
      const meanDef = schema.get(meanKey);
      if (!meanDef) continue;

      const synth = { ...meanDef, name: base, group: {}, dataKey: meanKey };

      for (const [label, key] of members) {
        synth.group[label] = key;
        schema.get(key).groupMember = base;
      }

      const firstMemberKey = members.values().next().value;
      const entries = [...schema];
      schema.clear();
      for (const [k, v] of entries) {
        if (k === firstMemberKey) schema.set(base, synth);
        schema.set(k, v);
      }
    }
  }

  return schema;
}

// ── Delimited text parser ─────────────────────────────────────────────────

/**
 * Parse CSV or TSV text into { headers, rows }.
 * Auto-detects delimiter by comparing tab vs comma count in the first line.
 */
export function parseDelimited(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine  = lines[0];
  const tabCount   = (firstLine.match(/\t/g)  || []).length;
  const commaCount = (firstLine.match(/,/g)   || []).length;
  const delimiter  = tabCount >= commaCount ? '\t' : ',';

  function parseLine(line) {
    if (delimiter === '\t') return line.split('\t').map(v => v.trim());
    const result = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        result.push(cur.trim()); cur = '';
      } else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.every(v => !v)) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = vals[j] ?? ''; });
    rows.push(obj);
  }
  return { headers, rows };
}
