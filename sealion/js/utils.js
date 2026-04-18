// ui/js/utils.js
// Utility functions shared across the Sealion application.
window.SealionUtils = window.SealionUtils || {};
(function(exports){
  // Normalize and return a mask string of length `maxSeqLen`.
  // Uses window.alignment and window.mask when called without arguments for
  // backwards compatibility; callers may pass explicit args.
  function refreshMaskStr(rows, maxSeqLen, mask){
    try{
      const _rows = rows || (window && window.alignment) || [];
      const _max = (typeof maxSeqLen === 'number') ? Math.max(0, maxSeqLen) : Math.max(0, ...(_rows.map(r=> (r && r.sequence) ? r.sequence.length : 0)));
      let s = (typeof mask !== 'undefined') ? mask : (window ? window.mask : null);
      if(s){
        s = String(s || '');
        if(s.length < _max){ s = s + '1'.repeat(Math.max(0, _max - s.length)); }
        else if(s.length > _max){ s = s.slice(0, _max); }
      } else {
        s = '1'.repeat(_max);
      }
      try{ if(window) window.mask = s; }catch(_){ }
      try{ if(window) window.__maskStr = s; }catch(_){ }
      return s;
    }catch(e){
      const fallback = '1'.repeat(Math.max(0, (maxSeqLen || 0)));
      try{ if(window) window.mask = fallback; }catch(_){ }
      try{ if(window) window.__maskStr = fallback; }catch(_){ }
      return fallback;
    }
  }

  // Compute reference string and index. Returns { refStr, refIndex }.
  // Uses window.alignment, window.reference and window.consensusSequence when
  // called without explicit args for backwards compatibility.
  function refreshRefStr(rows, reference, maxSeqLen, consensusSequence){
    try{
      const _rows = rows || (window && window.alignment) || [];
      const _max = (typeof maxSeqLen === 'number') ? Math.max(0, maxSeqLen) : Math.max(0, ...(_rows.map(r=> (r && r.sequence) ? r.sequence.length : 0)));
      const _ref = (typeof reference !== 'undefined') ? reference : (window ? window.reference : null);
      let refStr = null;
      if(typeof _ref !== 'undefined' && _ref){
        const s = String(_ref);
        if(s.length >= _max) refStr = s; else refStr = null;
      } else {
        refStr = null;
      }
      let refIndex = null;
      try{
        if(refStr && Array.isArray(_rows)){
          const idx = _rows.findIndex(r => (r && r.sequence) ? String(r.sequence) === refStr : false);
          refIndex = (idx >= 0) ? idx : null;
        } else {
          refIndex = null;
        }
      }catch(_){ refIndex = null; }
      try{ const cons = (typeof consensusSequence !== 'undefined') ? consensusSequence : (window ? window.consensusSequence : null); if(refStr && cons && String(refStr) === String(cons)) refIndex = null; }catch(_){ }
      try{ if(window) window.__refStr = refStr; }catch(_){ }
      try{ if(window) window.__refIndex = refIndex; }catch(_){ }
      return { refStr: refStr, refIndex: refIndex };
    }catch(e){
      try{ if(window) window.__refStr = null; }catch(_){ }
      try{ if(window) window.__refIndex = null; }catch(_){ }
      return { refStr: null, refIndex: null };
    }
  }

  // Expose both as properties on window.SealionUtils and also as globals for
  // simple backwards compatibility (script.js historically called these by name).
  exports = exports || window.SealionUtils || {};
  exports.refreshMaskStr = refreshMaskStr;
  exports.refreshRefStr = refreshRefStr;
  // Compute a mask that marks constant sites (0) vs variable sites (1).
  // rows: array of objects with `.sequence` string property. maxSeqLen: integer.
  function computeConstantMask(rows, maxSeqLen){
    try{
      const _rows = rows || (window && window.alignment) || [];
      const _max = (typeof maxSeqLen === 'number') ? Math.max(0, maxSeqLen) : Math.max(0, ...(_rows.map(r=> (r && r.sequence) ? r.sequence.length : 0)));
      const out = new Array(Math.max(0, _max));
      for(let c=0;c<_max;c++){
        let first = null;
        let constant = true;
        for(let r=0;r<_rows.length;r++){
          const seq = (_rows[r] && _rows[r].sequence) ? _rows[r].sequence : '';
          const ch = seq.charAt(c) || '';
          if(first === null) first = ch;
          else if(ch !== first){ constant = false; break; }
        }
        out[c] = constant ? '0' : '1';
      }
      const mask = out.join('');
      try{ if(window) window.constantMask = String(mask); }catch(_){ }
      return mask;
    }catch(e){ try{ if(window) window.constantMask = '1'.repeat(Math.max(0, (maxSeqLen||0))); }catch(_){ } return '1'.repeat(Math.max(0, (maxSeqLen||0))); }
  }

  // Compute consensus sequence: most frequent base per column. Ties/empty -> 'N'.
  function computeConsensusSequence(rows, maxSeqLen){
    try{
      const _rows = rows || (window && window.alignment) || [];
      const _max = (typeof maxSeqLen === 'number') ? Math.max(0, maxSeqLen) : Math.max(0, ...(_rows.map(r=> (r && r.sequence) ? r.sequence.length : 0)));
      const out = new Array(Math.max(0, _max));
      for(let c=0;c<_max;c++){
        const counts = new Map();
        for(let r=0;r<_rows.length;r++){
          const seq = (_rows[r] && _rows[r].sequence) ? _rows[r].sequence : '';
          const ch = (seq.charAt(c) || '').toUpperCase();
          const prev = counts.get(ch) || 0;
          counts.set(ch, prev + 1);
        }
        let best = ''; let bestCount = -1;
        const preferred = ['A','C','G','T'];
        for(const b of preferred){ const cnt = counts.get(b) || 0; if(cnt > bestCount){ best = b; bestCount = cnt; } }
        if(bestCount <= 0){
          for(const [k,v] of counts.entries()){ if(!k) continue; if(v > bestCount){ best = k; bestCount = v; } }
        }
        if(!best || best === '') best = 'N';
        out[c] = best;
      }
      const cons = out.join('');
      try{ if(window) window.consensusSequence = cons; }catch(_){ }
      return cons;
    }catch(e){ try{ if(window) window.consensusSequence = 'N'.repeat(Math.max(0, (maxSeqLen||0))); }catch(_){ } return 'N'.repeat(Math.max(0, (maxSeqLen||0))); }
  }

  // Compute constant mask treating 'N' as ambiguous wildcard
  function computeConstantMaskAllowN(rows, maxSeqLen){
    try{
      const _rows = rows || (window && window.alignment) || [];
      const _max = (typeof maxSeqLen === 'number') ? Math.max(0, maxSeqLen) : Math.max(0, ...(_rows.map(r=> (r && r.sequence) ? r.sequence.length : 0)));
      const out = new Array(Math.max(0, _max));
      for(let c=0;c<_max;c++){
        let firstNonAmbig = null;
        let constant = true;
        for(let r=0;r<_rows.length;r++){
          const seq = (_rows[r] && _rows[r].sequence) ? _rows[r].sequence : '';
          const ch = (seq.charAt(c) || '').toUpperCase();
          if(ch === 'N' || ch === '') continue;
          if(firstNonAmbig === null) firstNonAmbig = ch;
          else if(ch !== firstNonAmbig){ constant = false; break; }
        }
        out[c] = constant ? '0' : '1';
      }
      const mask = out.join('');
      try{ if(window) window.constantAmbiguousMask = String(mask); }catch(_){ }
      return mask;
    }catch(e){ try{ if(window) window.constantAmbiguousMask = '1'.repeat(Math.max(0, (maxSeqLen||0))); }catch(_){ } return '1'.repeat(Math.max(0, (maxSeqLen||0))); }
  }

  // Compute constant mask treating 'N' and '-' (gap) as ambiguous
  function computeConstantMaskAllowNAndGaps(rows, maxSeqLen){
    try{
      const _rows = rows || (window && window.alignment) || [];
      const _max = (typeof maxSeqLen === 'number') ? Math.max(0, maxSeqLen) : Math.max(0, ...(_rows.map(r=> (r && r.sequence) ? r.sequence.length : 0)));
      const out = new Array(Math.max(0, _max));
      for(let c=0;c<_max;c++){
        let firstNonAmbig = null;
        let constant = true;
        for(let r=0;r<_rows.length;r++){
          const seq = (_rows[r] && _rows[r].sequence) ? _rows[r].sequence : '';
          const ch = (seq.charAt(c) || '').toUpperCase();
          if(ch === 'N' || ch === '-' || ch === '') continue;
          if(firstNonAmbig === null) firstNonAmbig = ch;
          else if(ch !== firstNonAmbig){ constant = false; break; }
        }
        out[c] = constant ? '0' : '1';
      }
      const mask = out.join('');
      try{ if(window) window.constantGappedMask = String(mask); }catch(_){ }
      return mask;
    }catch(e){ try{ if(window) window.constantGappedMask = '1'.repeat(Math.max(0, (maxSeqLen||0))); }catch(_){ } return '1'.repeat(Math.max(0, (maxSeqLen||0))); }
  }

  // Helper function to AND two mask strings together
  // In mask logic: '0' = collapsed, '1' = expanded
  // We want to collapse (set to '0') if EITHER mask says to collapse
  function andMasks(mask1, mask2) {
    const len = Math.max(mask1.length, mask2.length);
    const m1 = mask1.padEnd(len, '1');
    const m2 = mask2.padEnd(len, '1');
    let result = '';
    for(let i = 0; i < len; i++) {
      // '0' AND '0' = '0', '0' AND '1' = '0', '1' AND '0' = '0', '1' AND '1' = '1'
      // Collapse if either says to collapse
      result += (m1[i] === '1' && m2[i] === '1') ? '1' : '0';
    }
    return result;
  }

  /**
   * Parse a GenBank format file and convert it to reference genome JSON format
   * @param {string} genbankText - The full text content of a GenBank file
   * @returns {Object|null} Reference genome object in JSON format, or null if parsing fails
   * 
   * Example return format:
   * {
   *   accession: "NC_002549",
   *   version: "NC_002549.1",
   *   definition: "Zaire ebolavirus isolate...",
   *   organism: "Zaire ebolavirus",
   *   isolate: "Ebola virus/H.sapiens-tc/COD/1976/Yambuku-Mayinga",
   *   length: 18959,
   *   sequence: "cggacacacaaa...",
   *   cds: [
   *     {
   *       gene: "NP",
   *       product: "nucleoprotein",
   *       function: "encapsidation of genomic RNA",
   *       coordinates: "470..2689"
   *     },
   *     ...
   *   ]
   * }
   */
  function parseGenBankFile(genbankText) {
    try {
      if (!genbankText || typeof genbankText !== 'string') {
        throw new Error('Invalid input: expected GenBank text string');
      }

      const result = {
        accession: null,
        version: null,
        definition: null,
        organism: null,
        isolate: null,
        length: 0,
        sequence: '',
        cds: []
      };

      // Split into lines for processing
      const lines = genbankText.split('\n');
      let inFeatures = false;
      let inOrigin = false;
      let currentCDS = null;
      let currentLocation = null;
      let continuedField = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Parse LOCUS line for length
        if (line.startsWith('LOCUS')) {
          const match = line.match(/LOCUS\s+\S+\s+(\d+)\s+bp/);
          if (match) {
            result.length = parseInt(match[1], 10);
          }
        }
        // Parse DEFINITION (may span multiple lines)
        else if (line.startsWith('DEFINITION')) {
          const match = line.match(/^DEFINITION\s+(.+)/);
          result.definition = match ? match[1].trim() : '';
          continuedField = 'definition';
        }
        // Parse ACCESSION
        else if (line.startsWith('ACCESSION')) {
          const match = line.match(/^ACCESSION\s+(\S+)/);
          result.accession = match ? match[1] : null;
          continuedField = null;
        }
        // Parse VERSION
        else if (line.startsWith('VERSION')) {
          const match = line.match(/^VERSION\s+(\S+)/);
          result.version = match ? match[1] : null;
          continuedField = null;
        }
        
        // Handle continuation of multi-line fields
        else if (continuedField === 'definition' && line.match(/^\s{12,}/) && !line.match(/^[A-Z]/)) {
          result.definition += ' ' + trimmed;
        }
        // Clear continuation flag if we hit a new field
        else if (continuedField && line.match(/^[A-Z]/)) {
          continuedField = null;
        }

        // Parse SOURCE section for organism and isolate
        else if (line.startsWith('SOURCE')) {
          // Organism name might be on the same line or next
          const sourceMatch = line.match(/SOURCE\s+(.+)/);
          if (sourceMatch) {
            result.organism = sourceMatch[1].trim();
          }
        }
        else if (line.match(/^\s+ORGANISM\s+/)) {
          const orgMatch = line.match(/ORGANISM\s+(.+)/);
          if (orgMatch) {
            result.organism = orgMatch[1].trim();
          }
        }
        else if (line.match(/^\s+\/isolate=/)) {
          const isolateMatch = line.match(/\/isolate="([^"]+)"/);
          if (isolateMatch) {
            result.isolate = isolateMatch[1];
          }
        }

        // Detect FEATURES section
        else if (line.startsWith('FEATURES')) {
          inFeatures = true;
        }
        
        // Detect ORIGIN section (start of sequence) - check before CDS parsing
        else if (line.startsWith('ORIGIN')) {
          inFeatures = false;
          inOrigin = true;
          continuedField = null;

          // Save last CDS if exists
          if (currentCDS) {
            result.cds.push(currentCDS);
          }
          currentCDS = null;
          currentLocation = null;
        }
        
        // Parse sequence from ORIGIN section
        else if (inOrigin && line.match(/^\s*\d+/)) {
          // Remove line numbers and spaces
          const seqPart = line.replace(/^\s*\d+/, '').replace(/\s+/g, '');
          result.sequence += seqPart;
        }

        // Parse CDS features
        else if (inFeatures && line.match(/^\s{5}CDS\s+/)) {
          // Save previous CDS if exists
          if (currentCDS) {
            result.cds.push(currentCDS);
          }

          // Start new CDS and extract coordinates ONLY from the CDS line itself
          const locationMatch = line.match(/CDS\s+(.+)/);
          const coordinates = locationMatch ? locationMatch[1].trim() : null;
          
          currentCDS = {
            gene: null,
            locus_tag: null,
            product: null,
            function: null,
            coordinates: coordinates
          };
          
          currentLocation = null; // Don't track for continuation
        }

        // Parse CDS qualifiers
        else if (currentCDS) {
          // Gene name
          const geneMatch = line.match(/\/gene="([^"]+)"/);
          if (geneMatch) {
            currentCDS.gene = geneMatch[1];
          }

          // Locus tag
          const locusTagMatch = line.match(/\/locus_tag="([^"]+)"/);
          if (locusTagMatch) {
            currentCDS.locus_tag = locusTagMatch[1];
          }

          // Product
          const productMatch = line.match(/\/product="([^"]+)"/);
          if (productMatch) {
            currentCDS.product = productMatch[1];
          }

          // Function
          const functionMatch = line.match(/\/function="([^"]+)"/);
          if (functionMatch) {
            currentCDS.function = functionMatch[1];
          }
          // Note field (might contain function info)
          const noteMatch = line.match(/\/note="([^"]+)"/);
          if (noteMatch && !currentCDS.function) {
            currentCDS.function = noteMatch[1];
          }
        }

        // End of file
        else if (line.startsWith('//')) {
          break;
        }
      }

      // Validate required fields
      if (!result.accession) {
        throw new Error('No accession found in GenBank file');
      }
      if (!result.sequence) {
        throw new Error('No sequence found in GenBank file');
      }
      
      // Convert sequence to uppercase
      result.sequence = result.sequence.toUpperCase();

      // Set length from actual sequence if not found in LOCUS
      if (!result.length && result.sequence) {
        result.length = result.sequence.length;
      }

      return result;

    } catch (e) {
      console.error('Error parsing GenBank file:', e);
      return null;
    }
  }

  // expose new utilities
  exports.computeConstantMask = computeConstantMask;
  exports.computeConsensusSequence = computeConsensusSequence;
  exports.computeConstantMaskAllowN = computeConstantMaskAllowN;
  exports.computeConstantMaskAllowNAndGaps = computeConstantMaskAllowNAndGaps;
  exports.andMasks = andMasks;
  exports.parseGenBankFile = parseGenBankFile;

  // Fetch a relative URL, falling back to the same path under the canonical
  // GitHub Pages base (sealion/ subdirectory) if the relative fetch fails,
  // e.g. when running locally from a file:// origin or a plain HTTP server.
  const FALLBACK_BASE = 'https://artic-network.github.io/sealion/sealion/';
  async function fetchWithFallback(relativeUrl) {
    try {
      const response = await fetch(relativeUrl);
      if (response.ok) return response;
    } catch (_) { /* network error – try fallback */ }
    return fetch(FALLBACK_BASE + relativeUrl);
  }
  exports.fetchWithFallback = fetchWithFallback;

  try{ if(window) { window.SealionUtils = window.SealionUtils || {}; window.SealionUtils.fetchWithFallback = fetchWithFallback; } }catch(_){ }

  try{ if(window) { window.SealionUtils = window.SealionUtils || {}; window.SealionUtils.computeConstantMask = computeConstantMask; window.SealionUtils.computeConsensusSequence = computeConsensusSequence; window.SealionUtils.computeConstantMaskAllowN = computeConstantMaskAllowN; window.SealionUtils.computeConstantMaskAllowNAndGaps = computeConstantMaskAllowNAndGaps; window.SealionUtils.andMasks = andMasks; window.SealionUtils.parseGenBankFile = parseGenBankFile; } }catch(_){ }
  // attach globals for backward compatibility
  try{ if(window){ window.computeConstantMask = computeConstantMask; window.computeConsensusSequence = computeConsensusSequence; window.computeConstantMaskAllowN = computeConstantMaskAllowN; window.computeConstantMaskAllowNAndGaps = computeConstantMaskAllowNAndGaps; window.andMasks = andMasks; } }catch(_){ }
  // attach to window.SealionUtils
  try{ if(window) window.SealionUtils = window.SealionUtils || {}; window.SealionUtils.refreshMaskStr = refreshMaskStr; window.SealionUtils.refreshRefStr = refreshRefStr; }catch(_){ }
  // attach globals (so unqualified calls like `refreshMaskStr()` in script.js will find them)
  try{ if(window) { window.refreshMaskStr = refreshMaskStr; window.refreshRefStr = function(){ const r = refreshRefStr(); return r; }; } }catch(_){ }

})(window.SealionUtils = window.SealionUtils || {});
