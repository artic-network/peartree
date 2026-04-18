// sealion/js/utils.js — Alignment-specific utility functions (ES module).

/**
 * Normalize and return a mask string of length `maxSeqLen`.
 * @param {Array}  rows       - array of { sequence } objects
 * @param {number} maxSeqLen  - alignment width
 * @param {string} [mask]     - existing mask string to normalise
 * @returns {string} mask of '0' and '1' characters, length maxSeqLen
 */
export function refreshMaskStr(rows, maxSeqLen, mask) {
  const _rows = rows || [];
  const _max = (typeof maxSeqLen === 'number')
    ? Math.max(0, maxSeqLen)
    : Math.max(0, ..._rows.map(r => r?.sequence?.length || 0));
  if (mask) {
    let s = String(mask);
    if (s.length < _max) s += '1'.repeat(_max - s.length);
    else if (s.length > _max) s = s.slice(0, _max);
    return s;
  }
  return '1'.repeat(_max);
}

/**
 * Compute reference string and index.
 * @param {Array}  rows              - array of { sequence } objects
 * @param {string} reference         - reference sequence string
 * @param {number} maxSeqLen         - alignment width
 * @param {string} consensusSequence - consensus string (used to detect consensus-as-ref)
 * @returns {{ refStr: string|null, refIndex: number|null }}
 */
export function refreshRefStr(rows, reference, maxSeqLen, consensusSequence) {
  const _rows = rows || [];
  const _max = (typeof maxSeqLen === 'number')
    ? Math.max(0, maxSeqLen)
    : Math.max(0, ..._rows.map(r => r?.sequence?.length || 0));

  let refStr = null;
  if (reference) {
    const s = String(reference);
    refStr = s.length >= _max ? s : null;
  }

  let refIndex = null;
  if (refStr && Array.isArray(_rows)) {
    const idx = _rows.findIndex(r => r?.sequence && String(r.sequence) === refStr);
    refIndex = idx >= 0 ? idx : null;
  }
  if (refStr && consensusSequence && String(refStr) === String(consensusSequence)) {
    refIndex = null;
  }
  return { refStr, refIndex };
}

/**
 * Compute a mask marking constant sites (0) vs variable sites (1).
 */
export function computeConstantMask(rows, maxSeqLen) {
  const _rows = rows || [];
  const _max = (typeof maxSeqLen === 'number')
    ? Math.max(0, maxSeqLen)
    : Math.max(0, ..._rows.map(r => r?.sequence?.length || 0));
  const out = new Array(_max);
  for (let c = 0; c < _max; c++) {
    let first = null, constant = true;
    for (let r = 0; r < _rows.length; r++) {
      const ch = _rows[r]?.sequence?.charAt(c) || '';
      if (first === null) first = ch;
      else if (ch !== first) { constant = false; break; }
    }
    out[c] = constant ? '0' : '1';
  }
  return out.join('');
}

/**
 * Compute consensus sequence: most frequent base per column.
 */
export function computeConsensusSequence(rows, maxSeqLen) {
  const _rows = rows || [];
  const _max = (typeof maxSeqLen === 'number')
    ? Math.max(0, maxSeqLen)
    : Math.max(0, ..._rows.map(r => r?.sequence?.length || 0));
  const out = new Array(_max);
  const preferred = ['A', 'C', 'G', 'T'];
  for (let c = 0; c < _max; c++) {
    const counts = new Map();
    for (let r = 0; r < _rows.length; r++) {
      const ch = (_rows[r]?.sequence?.charAt(c) || '').toUpperCase();
      counts.set(ch, (counts.get(ch) || 0) + 1);
    }
    let best = '', bestCount = -1;
    for (const b of preferred) { const cnt = counts.get(b) || 0; if (cnt > bestCount) { best = b; bestCount = cnt; } }
    if (bestCount <= 0) {
      for (const [k, v] of counts.entries()) { if (!k) continue; if (v > bestCount) { best = k; bestCount = v; } }
    }
    out[c] = best || 'N';
  }
  return out.join('');
}

/**
 * Compute constant mask treating 'N' as ambiguous wildcard.
 */
export function computeConstantMaskAllowN(rows, maxSeqLen) {
  const _rows = rows || [];
  const _max = (typeof maxSeqLen === 'number')
    ? Math.max(0, maxSeqLen)
    : Math.max(0, ..._rows.map(r => r?.sequence?.length || 0));
  const out = new Array(_max);
  for (let c = 0; c < _max; c++) {
    let firstNonAmbig = null, constant = true;
    for (let r = 0; r < _rows.length; r++) {
      const ch = (_rows[r]?.sequence?.charAt(c) || '').toUpperCase();
      if (ch === 'N' || ch === '') continue;
      if (firstNonAmbig === null) firstNonAmbig = ch;
      else if (ch !== firstNonAmbig) { constant = false; break; }
    }
    out[c] = constant ? '0' : '1';
  }
  return out.join('');
}

/**
 * Compute constant mask treating 'N' and '-' (gap) as ambiguous.
 */
export function computeConstantMaskAllowNAndGaps(rows, maxSeqLen) {
  const _rows = rows || [];
  const _max = (typeof maxSeqLen === 'number')
    ? Math.max(0, maxSeqLen)
    : Math.max(0, ..._rows.map(r => r?.sequence?.length || 0));
  const out = new Array(_max);
  for (let c = 0; c < _max; c++) {
    let firstNonAmbig = null, constant = true;
    for (let r = 0; r < _rows.length; r++) {
      const ch = (_rows[r]?.sequence?.charAt(c) || '').toUpperCase();
      if (ch === 'N' || ch === '-' || ch === '') continue;
      if (firstNonAmbig === null) firstNonAmbig = ch;
      else if (ch !== firstNonAmbig) { constant = false; break; }
    }
    out[c] = constant ? '0' : '1';
  }
  return out.join('');
}

/**
 * AND two mask strings together.
 * In mask logic: '0' = collapsed, '1' = expanded.
 * Collapses (set to '0') if EITHER mask says to collapse.
 */
export function andMasks(mask1, mask2) {
  const len = Math.max(mask1.length, mask2.length);
  const m1 = mask1.padEnd(len, '1');
  const m2 = mask2.padEnd(len, '1');
  let result = '';
  for (let i = 0; i < len; i++) {
    result += (m1[i] === '1' && m2[i] === '1') ? '1' : '0';
  }
  return result;
}

/**
 * Parse a GenBank format file and convert it to reference genome JSON format.
 * @param {string} genbankText - The full text content of a GenBank file
 * @returns {Object|null} Reference genome object, or null if parsing fails
 */
export function parseGenBankFile(genbankText) {
  if (!genbankText || typeof genbankText !== 'string') return null;
  try {
    const result = {
      accession: null, version: null, definition: null,
      organism: null, isolate: null, length: 0, sequence: '', cds: []
    };
    const lines = genbankText.split('\n');
    let inFeatures = false, inOrigin = false;
    let currentCDS = null, continuedField = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (line.startsWith('LOCUS')) {
        const m = line.match(/LOCUS\s+\S+\s+(\d+)\s+bp/);
        if (m) result.length = parseInt(m[1], 10);
      } else if (line.startsWith('DEFINITION')) {
        const m = line.match(/^DEFINITION\s+(.+)/);
        result.definition = m ? m[1].trim() : '';
        continuedField = 'definition';
      } else if (line.startsWith('ACCESSION')) {
        const m = line.match(/^ACCESSION\s+(\S+)/);
        result.accession = m ? m[1] : null;
        continuedField = null;
      } else if (line.startsWith('VERSION')) {
        const m = line.match(/^VERSION\s+(\S+)/);
        result.version = m ? m[1] : null;
        continuedField = null;
      } else if (continuedField === 'definition' && /^\s{12,}/.test(line) && !/^[A-Z]/.test(line)) {
        result.definition += ' ' + trimmed;
      } else if (continuedField && /^[A-Z]/.test(line)) {
        continuedField = null;
      } else if (line.startsWith('SOURCE')) {
        const m = line.match(/SOURCE\s+(.+)/);
        if (m) result.organism = m[1].trim();
      } else if (/^\s+ORGANISM\s+/.test(line)) {
        const m = line.match(/ORGANISM\s+(.+)/);
        if (m) result.organism = m[1].trim();
      } else if (/^\s+\/isolate=/.test(line)) {
        const m = line.match(/\/isolate="([^"]+)"/);
        if (m) result.isolate = m[1];
      } else if (line.startsWith('FEATURES')) {
        inFeatures = true;
      } else if (line.startsWith('ORIGIN')) {
        inFeatures = false; inOrigin = true; continuedField = null;
        if (currentCDS) { result.cds.push(currentCDS); currentCDS = null; }
      } else if (inOrigin && /^\s*\d+/.test(line)) {
        result.sequence += line.replace(/^\s*\d+/, '').replace(/\s+/g, '');
      } else if (inFeatures && /^\s{5}CDS\s+/.test(line)) {
        if (currentCDS) result.cds.push(currentCDS);
        const m = line.match(/CDS\s+(.+)/);
        currentCDS = { gene: null, locus_tag: null, product: null, function: null, coordinates: m ? m[1].trim() : null };
      } else if (currentCDS) {
        let m;
        if ((m = line.match(/\/gene="([^"]+)"/))) currentCDS.gene = m[1];
        if ((m = line.match(/\/locus_tag="([^"]+)"/))) currentCDS.locus_tag = m[1];
        if ((m = line.match(/\/product="([^"]+)"/))) currentCDS.product = m[1];
        if ((m = line.match(/\/function="([^"]+)"/))) currentCDS.function = m[1];
        if (!currentCDS.function && (m = line.match(/\/note="([^"]+)"/))) currentCDS.function = m[1];
      } else if (line.startsWith('//')) {
        break;
      }
    }

    if (!result.accession) return null;
    if (!result.sequence) return null;
    result.sequence = result.sequence.toUpperCase();
    if (!result.length) result.length = result.sequence.length;
    return result;
  } catch (e) {
    console.error('Error parsing GenBank file:', e);
    return null;
  }
}

/**
 * Fetch a relative URL, falling back to the canonical GitHub Pages base
 * if the relative fetch fails (e.g. file:// origin or plain HTTP server).
 */
const FALLBACK_BASE = 'https://artic-network.github.io/sealion/sealion/';
export async function fetchWithFallback(relativeUrl) {
  try {
    const response = await fetch(relativeUrl);
    if (response.ok) return response;
  } catch (_) { /* network error – try fallback */ }
  return fetch(FALLBACK_BASE + relativeUrl);
}
