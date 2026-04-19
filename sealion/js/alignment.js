// alignment.js
// Alignment class for storing and managing sequence alignment data

class Alignment {
  constructor(alignmentData) {
    if (!alignmentData || !Array.isArray(alignmentData)) {
      throw new Error('Alignment: alignmentData must be an array');
    }

    // Store the raw data
    this._rawData = alignmentData;
    
    // Add original index and compute start/end positions for each sequence
    this._sequences = alignmentData.map((seq, idx) => {
      const startPos = this._findFirstNonGap(seq.sequence);
      const endPos = this._findLastNonGap(seq.sequence);
      const seqLength = (startPos !== -1 && endPos !== -1) ? (endPos - startPos + 1) : 0;
      
      return {
        originalIndex: idx,
        label: seq.label,
        sequence: seq.sequence,
        startPos: startPos,
        endPos: endPos,
        seqLength: seqLength
      };
    });

    // Current ordering (starts as original order)
    this._currentOrder = this._sequences.slice();
    
    // Storage for reference genomes keyed by accession number
    this._referenceGenomes = new Map();
    
    // Cache for computed values
    this._cache = {
      maxSeqLen: null,
      consensus: null,
      constantMask: null
    };

    // Compute max sequence length
    this._computeMaxSeqLen();
    
    // Return a Proxy to enable array-like bracket notation (alignment[0])
    return new Proxy(this, {
      get(target, prop) {
        // Check if it's a numeric index
        const index = Number(prop);
        if (Number.isInteger(index) && index >= 0) {
          return target._currentOrder[index];
        }
        // Otherwise return the property from the target
        return target[prop];
      },
      has(target, prop) {
        const index = Number(prop);
        if (Number.isInteger(index) && index >= 0) {
          return index < target._currentOrder.length;
        }
        return prop in target;
      }
    });
  }

  // Helper method to find the first non-gap position in a sequence
  _findFirstNonGap(sequence) {
    for (let i = 0; i < sequence.length; i++) {
      if (sequence[i] !== '-') {
        return i;
      }
    }
    return -1; // All gaps
  }

  // Helper method to find the last non-gap position in a sequence
  _findLastNonGap(sequence) {
    for (let i = sequence.length - 1; i >= 0; i--) {
      if (sequence[i] !== '-') {
        return i;
      }
    }
    return -1; // All gaps
  }

  // Compute the maximum sequence length
  _computeMaxSeqLen() {
    let max = 0;
    for (const s of this._sequences) {
      if (s.sequence.length > max) max = s.sequence.length;
    }
    this._cache.maxSeqLen = max;
  }

  // Get the maximum sequence length
  getMaxSeqLen() {
    if (this._cache.maxSeqLen === null) {
      this._computeMaxSeqLen();
    }
    return this._cache.maxSeqLen;
  }

  // Get the number of sequences
  getSequenceCount() {
    return this._sequences.length;
  }

  // Get a sequence by current order index
  getSequence(index) {
    if (index < 0 || index >= this._currentOrder.length) {
      return null;
    }
    return this._currentOrder[index];
  }

  // Get all sequences in current order (array-like access)
  getSequences() {
    return this._currentOrder;
  }

  // Array-like access using bracket notation
  get length() {
    return this._currentOrder.length;
  }

  // Allow iteration with for...of
  [Symbol.iterator]() {
    return this._currentOrder[Symbol.iterator]();
  }

  // Array-like methods for compatibility
  map(callback, thisArg) {
    return this._currentOrder.map(callback, thisArg);
  }

  forEach(callback, thisArg) {
    return this._currentOrder.forEach(callback, thisArg);
  }

  filter(callback, thisArg) {
    return this._currentOrder.filter(callback, thisArg);
  }

  find(callback, thisArg) {
    return this._currentOrder.find(callback, thisArg);
  }

  // Allow indexing with []
  get(index) {
    return this.getSequence(index);
  }

  // Add a reference genome object
  addReferenceGenome(referenceGenome) {
    if (!referenceGenome || typeof referenceGenome !== 'object') {
      throw new Error('Alignment.addReferenceGenome: referenceGenome must be an object');
    }
    if (!referenceGenome.accession) {
      throw new Error('Alignment.addReferenceGenome: referenceGenome must have an accession property');
    }
    
    this._referenceGenomes.set(referenceGenome.accession, referenceGenome);
    return this;
  }

  // Get a reference genome by accession number
  getReferenceGenome(accession) {
    return this._referenceGenomes.get(accession);
  }

  // Check if a reference genome exists by accession number
  hasReferenceGenome(accession) {
    return this._referenceGenomes.has(accession);
  }

  // Get all reference genome accession numbers
  getReferenceGenomeAccessions() {
    return Array.from(this._referenceGenomes.keys());
  }

  // Get all reference genomes as an array
  getAllReferenceGenomes() {
    return Array.from(this._referenceGenomes.values());
  }

  // Remove a reference genome by accession number
  removeReferenceGenome(accession) {
    return this._referenceGenomes.delete(accession);
  }

  // Clear all reference genomes
  clearReferenceGenomes() {
    this._referenceGenomes.clear();
  }

  // Get the number of stored reference genomes
  getReferenceGenomeCount() {
    return this._referenceGenomes.size;
  }

  // Order sequences by original index
  orderByOriginalIndex() {
    this._currentOrder = this._sequences.slice().sort((a, b) => a.originalIndex - b.originalIndex);
    this._invalidateCache();
  }

  // Order sequences alphabetically by label
  orderByLabel(reverse = false) {
    this._currentOrder = this._sequences.slice().sort((a, b) => {
      const labelA = a.label.toLowerCase();
      const labelB = b.label.toLowerCase();
      const result = labelA.localeCompare(labelB);
      return reverse ? -result : result;
    });
    this._invalidateCache();
  }

  // Order sequences by character at a specific site (position)
  // Characters are ordered alphabetically, with gaps (-) sorted last
  // If aminoAcidMode is true, translates to amino acids before sorting
  orderBySite(siteIndex, reverse = false, options = {}) {
    if (siteIndex < 0 || siteIndex >= this.getMaxSeqLen()) {
      console.warn(`Alignment.orderBySite: siteIndex ${siteIndex} out of range [0, ${this.getMaxSeqLen()-1}]`);
      return;
    }

    const aminoAcidMode = options.aminoAcidMode || false;
    const readingFrame = options.readingFrame || 1;

    // Nucleotide sort order: A, C, G, T, N, -
    const nucleotideOrder = { 'A': 0, 'C': 1, 'G': 2, 'T': 3, 'N': 4, '-': 5 };
    
    // Amino acid sort order (alphabetical with common ones first, then gaps)
    const aminoAcidOrder = {
      'A': 0, 'C': 1, 'D': 2, 'E': 3, 'F': 4, 'G': 5, 'H': 6, 'I': 7, 
      'K': 8, 'L': 9, 'M': 10, 'N': 11, 'P': 12, 'Q': 13, 'R': 14, 'S': 15,
      'T': 16, 'V': 17, 'W': 18, 'Y': 19, '*': 20, 'X': 21, '-': 22
    };
    
    const getOrder = (char, isAminoAcid) => {
      const upper = char.toUpperCase();
      if (isAminoAcid) {
        return aminoAcidOrder.hasOwnProperty(upper) ? aminoAcidOrder[upper] : 23;
      } else {
        return nucleotideOrder.hasOwnProperty(upper) ? nucleotideOrder[upper] : 6;
      }
    };

    this._currentOrder = this._sequences.slice().sort((a, b) => {
      let charA, charB;
      
      if (aminoAcidMode) {
        // Translate sequences to amino acids and get the character at the site
        // In amino acid mode, the siteIndex refers to the nucleotide position
        // We need to determine which codon this nucleotide belongs to
        const codonStart = Math.floor(siteIndex / 3) * 3;
        const aaPosition = Math.floor(siteIndex / 3);
        
        // Translate each sequence
        const translatedA = Alignment.translateSequence(a.sequence, readingFrame);
        const translatedB = Alignment.translateSequence(b.sequence, readingFrame);
        
        // Get the amino acid at this position
        charA = (aaPosition < translatedA.length) ? translatedA[aaPosition] : '-';
        charB = (aaPosition < translatedB.length) ? translatedB[aaPosition] : '-';
      } else {
        // Use nucleotide characters directly
        charA = (siteIndex < a.sequence.length) ? a.sequence[siteIndex] : '-';
        charB = (siteIndex < b.sequence.length) ? b.sequence[siteIndex] : '-';
      }
      
      const orderA = getOrder(charA, aminoAcidMode);
      const orderB = getOrder(charB, aminoAcidMode);
      
      const result = orderA - orderB;
      return reverse ? -result : result;
    });
    this._invalidateCache();
  }

  // Order sequences by start position (position of first non-gap character)
  orderByStartPos(reverse = false) {
    this._currentOrder = this._sequences.slice().sort((a, b) => {
      // Sequences with no non-gap characters (startPos === -1) go to the end
      if (a.startPos === -1 && b.startPos !== -1) return 1;
      if (a.startPos !== -1 && b.startPos === -1) return -1;
      if (a.startPos === -1 && b.startPos === -1) return 0;
      
      const result = a.startPos - b.startPos;
      return reverse ? -result : result;
    });
    this._invalidateCache();
  }

  // Order sequences by sequence length (excluding gaps)
  orderBySeqLength(reverse = false) {
    this._currentOrder = this._sequences.slice().sort((a, b) => {
      const result = a.seqLength - b.seqLength;
      return reverse ? -result : result;
    });
    this._invalidateCache();
  }

  // Order sequences by tags (tagged sequences first, then by tag color order, then untagged)
  orderByTag(labelTags) {
    if (!labelTags || !(labelTags instanceof Map)) {
      console.warn('orderByTag requires a Map of label tags');
      return;
    }
    
    this._currentOrder = this._sequences.slice().sort((a, b) => {
      const aTag = labelTags.get(a.label);
      const bTag = labelTags.get(b.label);
      
      // Both tagged: sort by tag index
      if (aTag !== undefined && bTag !== undefined) {
        return aTag - bTag;
      }
      
      // Only a is tagged: a comes first
      if (aTag !== undefined) return -1;
      
      // Only b is tagged: b comes first
      if (bTag !== undefined) return 1;
      
      // Neither tagged: maintain original order
      return a.originalIndex - b.originalIndex;
    });
    this._invalidateCache();
  }

  // Invalidate cached computed values (called when order changes)
  _invalidateCache() {
    // Note: maxSeqLen doesn't change with reordering, but consensus and masks do
    this._cache.consensus = null;
    this._cache.constantMask = null;
  }

  // Compute consensus sequence (most common character at each position)
  computeConsensusSequence() {
    if (this._cache.consensus !== null) {
      return this._cache.consensus;
    }

    const maxLen = this.getMaxSeqLen();
    const count = this.getSequenceCount();
    
    // Detect if this is amino acid or nucleotide alignment
    // Check first few sequences for amino-acid-specific characters
    let isAminoAcid = false;
    const aaSpecific = 'DEFHIKLPQVWY';
    checkLoop: for (let i = 0; i < Math.min(10, count); i++) {
      const seq = this._currentOrder[i].sequence.toUpperCase();
      for (let j = 0; j < Math.min(200, seq.length); j++) {
        if (aaSpecific.includes(seq[j])) {
          isAminoAcid = true;
          break checkLoop;
        }
      }
    }
    
    // Define canonical states for this sequence type
    // Nucleotides: ACGT (excludes N, which is ambiguous)
    // Amino acids: 20 standard amino acids (excludes X, which is ambiguous)
    const states = isAminoAcid 
      ? ['A','C','D','E','F','G','H','I','K','L','M','N','P','Q','R','S','T','V','W','Y']
      : ['A','C','G','T'];
    
    // Create K x N array (K = number of states, N = number of positions)
    const K = states.length;
    const N = maxLen;
    const counts = new Array(K);
    for (let k = 0; k < K; k++) {
      counts[k] = new Array(N).fill(0);
    }
    
    // Single pass over all sequences, increment appropriate counters
    // Any character not in the states array is automatically skipped (N for nucleotides, X/gaps/etc)
    for (let i = 0; i < count; i++) {
      const seq = this._currentOrder[i].sequence;
      const seqLen = seq.length;
      for (let pos = 0; pos < seqLen; pos++) {
        const char = seq[pos].toUpperCase();
        const stateIdx = states.indexOf(char);
        if (stateIdx >= 0) {
          counts[stateIdx][pos]++;
        }
      }
    }
    
    // Find consensus: state with max count at each position
    const consensusArray = new Array(N);
    const defaultChar = isAminoAcid ? 'X' : 'N';
    for (let pos = 0; pos < N; pos++) {
      let maxCount = 0;
      let maxIdx = -1;
      for (let k = 0; k < K; k++) {
        if (counts[k][pos] > maxCount) {
          maxCount = counts[k][pos];
          maxIdx = k;
        }
      }
      consensusArray[pos] = (maxIdx >= 0) ? states[maxIdx] : defaultChar;
    }
    
    const consensus = consensusArray.join('');
    this._cache.consensus = consensus;
    return consensus;
  }

  // Compute constant mask (0 = constant site, 1 = variable site)
  computeConstantMask() {
    if (this._cache.constantMask !== null) {
      return this._cache.constantMask;
    }

    const maxLen = this.getMaxSeqLen();
    const count = this.getSequenceCount();
    let mask = '';

    for (let pos = 0; pos < maxLen; pos++) {
      const charSet = new Set();

      // Collect unique characters at this position
      for (let i = 0; i < count; i++) {
        const seq = this._currentOrder[i].sequence;
        const char = (pos < seq.length) ? seq[pos].toUpperCase() : '-';
        
        // Ignore ambiguous characters for variability
        if (char !== 'N' && char !== '?') {
          charSet.add(char);
        }
      }

      // Variable site if more than one distinct character (ignoring N, ?)
      // Mark as '1' (expanded) if variable, '0' (collapsed) if constant
      mask += (charSet.size > 1) ? '1' : '0';
    }

    this._cache.constantMask = mask;
    return mask;
  }

  // Find a sequence by label (returns first match)
  findSequenceByLabel(label) {
    return this._sequences.find(s => s.label === label);
  }

  // Find all sequences matching a pattern in their labels
  findSequencesByLabelPattern(pattern) {
    const regex = new RegExp(pattern, 'i');
    return this._sequences.filter(s => regex.test(s.label));
  }

  // Get current order type (for debugging/display)
  getCurrentOrderType() {
    // Check if current order matches original
    if (this._currentOrder.every((s, i) => s.originalIndex === i)) {
      return 'original';
    }
    
    // Check if alphabetically sorted by label
    const labelSorted = this._sequences.slice().sort((a, b) => 
      a.label.toLowerCase().localeCompare(b.label.toLowerCase())
    );
    if (this._currentOrder.every((s, i) => s === labelSorted[i])) {
      return 'label';
    }

    return 'custom';
  }

  // Check if sequences are currently in original order
  isInOriginalOrder() {
    return this._currentOrder.every((s, i) => s.originalIndex === i);
  }

  // Move sequences from sourceIndices to insertBeforeIndex
  // This updates the originalIndex values to reflect the new order
  moveSequences(sourceIndices, insertBeforeIndex) {
    if (!this.isInOriginalOrder()) {
      console.warn('Cannot drag-drop sequences unless in original order');
      return false;
    }

    // Sort source indices to maintain relative order
    const sortedSources = [...sourceIndices].sort((a, b) => a - b);
    
    // Extract the sequences to move
    const toMove = sortedSources.map(i => this._currentOrder[i]);
    
    // Remove moved sequences from current order
    const remaining = this._currentOrder.filter((_, i) => !sourceIndices.includes(i));
    
    // Adjust insert position if needed (accounts for removed items before insert point)
    let adjustedInsertPos = insertBeforeIndex;
    for (const srcIdx of sortedSources) {
      if (srcIdx < insertBeforeIndex) {
        adjustedInsertPos--;
      }
    }
    
    // Insert at the target position
    remaining.splice(adjustedInsertPos, 0, ...toMove);
    
    // Update originalIndex for all sequences to reflect new order
    remaining.forEach((seq, newIdx) => {
      seq.originalIndex = newIdx;
    });
    
    // Update _sequences array to match
    this._sequences = remaining.slice();
    this._currentOrder = remaining.slice();
    
    this._invalidateCache();
    return true;
  }

  // Fix current order: update originalIndex values to match current order
  // This makes the current ordering become the "original" order
  fixCurrentOrder() {
    // Update originalIndex for all sequences to reflect current order
    this._currentOrder.forEach((seq, newIdx) => {
      seq.originalIndex = newIdx;
    });
    
    // Update _sequences array to match
    this._sequences = this._currentOrder.slice();
    
    this._invalidateCache();
  }

  // Export current order as plain array (for compatibility)
  toArray() {
    return this._currentOrder.map(s => ({
      label: s.label,
      sequence: s.sequence
    }));
  }

  // Create a reference string from a sequence index
  getReferenceFromSequence(index) {
    const seq = this.getSequence(index);
    return seq ? seq.sequence : null;
  }

  // Find sequence index that exactly matches a reference string
  findSequenceMatchingReference(refStr) {
    if (!refStr) return null;
    
    for (let i = 0; i < this._currentOrder.length; i++) {
      if (this._currentOrder[i].sequence === refStr) {
        return i;
      }
    }
    return null;
  }

  // Compute consensus sequence for the alignment
  // For each position, finds the most common non-gap character
  computeConsensusSequence() {
    try {
      const maxLen = this.getMaxSeqLen();
      const consensus = new Array(maxLen);
      
      for (let col = 0; col < maxLen; col++) {
        const counts = {};
        let maxCount = 0;
        let maxChar = 'N';
        
        // Count characters at this position across all sequences
        for (let row = 0; row < this._currentOrder.length; row++) {
          const seq = this._currentOrder[row].sequence;
          const ch = (col < seq.length) ? seq[col].toUpperCase() : '-';
          
          // Skip gaps in consensus calculation
          if (ch === '-') continue;
          
          counts[ch] = (counts[ch] || 0) + 1;
          if (counts[ch] > maxCount) {
            maxCount = counts[ch];
            maxChar = ch;
          }
        }
        
        consensus[col] = maxChar;
      }
      
      const result = consensus.join('');
      this._cache.consensus = result;
      return result;
    } catch (e) {
      console.warn('Alignment.computeConsensusSequence failed', e);
      return 'N'.repeat(this.getMaxSeqLen());
    }
  }

  // Compute a mask that marks constant sites (0) vs variable sites (1)
  // A site is constant if all non-gap characters are identical
  computeConstantMask() {
    try {
      const maxLen = this.getMaxSeqLen();
      const seqs = this._currentOrder;
      const numSeqs = seqs.length;

      // Track first non-gap char at each column and whether it varies.
      // Using Uint8Arrays for cache-friendly access.
      const firstChar = new Uint8Array(maxLen); // charCode of first non-gap char (0 = unseen)
      const variable  = new Uint8Array(maxLen); // 1 = variable site

      // Row-major iteration for better CPU cache behavior (strings are contiguous)
      for (let row = 0; row < numSeqs; row++) {
        const seq = seqs[row].sequence;
        const sLen = seq.length;
        for (let col = 0; col < sLen; col++) {
          if (variable[col]) continue; // already known variable — skip
          let code = seq.charCodeAt(col);
          // Uppercase without function call: a-z → A-Z
          if (code >= 97 && code <= 122) code -= 32;
          if (code === 45) continue; // '-' gap
          if (firstChar[col] === 0) {
            firstChar[col] = code;
          } else if (code !== firstChar[col]) {
            variable[col] = 1;
          }
        }
        // Columns beyond this sequence's length are treated as gaps — no action needed
      }

      // Build result string: variable='1', constant='0'
      const mask = new Array(maxLen);
      for (let col = 0; col < maxLen; col++) {
        mask[col] = variable[col] ? '1' : '0';
      }
      const result = mask.join('');
      this._cache.constantMask = result;
      return result;
    } catch (e) {
      console.warn('Alignment.computeConstantMask failed', e);
      return '1'.repeat(this.getMaxSeqLen());
    }
  }

  // Compute constant mask treating 'N' (or 'X' for amino acids) as an ambiguous wildcard
  computeConstantMaskAllowN(isAminoAcid = false) {
    try {
      const maxLen = this.getMaxSeqLen();
      const seqs = this._currentOrder;
      const numSeqs = seqs.length;
      // charCodes: N=78, n=110, X=88, x=120, -=45
      const ambigUpper = isAminoAcid ? 88 : 78;
      const ambigLower = isAminoAcid ? 120 : 110;

      const firstChar = new Uint8Array(maxLen);
      const variable  = new Uint8Array(maxLen);

      for (let row = 0; row < numSeqs; row++) {
        const seq = seqs[row].sequence;
        const sLen = seq.length;
        for (let col = 0; col < sLen; col++) {
          if (variable[col]) continue;
          let code = seq.charCodeAt(col);
          if (code >= 97 && code <= 122) code -= 32;
          if (code === 45 || code === ambigUpper) continue; // gap or ambiguous
          if (firstChar[col] === 0) {
            firstChar[col] = code;
          } else if (code !== firstChar[col]) {
            variable[col] = 1;
          }
        }
      }

      const mask = new Array(maxLen);
      for (let col = 0; col < maxLen; col++) mask[col] = variable[col] ? '1' : '0';
      return mask.join('');
    } catch (e) {
      console.warn('Alignment.computeConstantMaskAllowN failed', e);
      return '1'.repeat(this.getMaxSeqLen());
    }
  }

  // Compute constant mask treating both ambiguous chars and gap '-' as wildcards
  computeConstantMaskAllowNAndGaps(isAminoAcid = false) {
    try {
      const maxLen = this.getMaxSeqLen();
      const seqs = this._currentOrder;
      const numSeqs = seqs.length;
      const ambigUpper = isAminoAcid ? 88 : 78; // X=88, N=78

      const firstChar = new Uint8Array(maxLen);
      const variable  = new Uint8Array(maxLen);

      for (let row = 0; row < numSeqs; row++) {
        const seq = seqs[row].sequence;
        const sLen = seq.length;
        for (let col = 0; col < sLen; col++) {
          if (variable[col]) continue;
          let code = seq.charCodeAt(col);
          if (code >= 97 && code <= 122) code -= 32;
          // Skip gaps (45), ambiguous, and empty
          if (code === 45 || code === ambigUpper) continue;
          if (firstChar[col] === 0) {
            firstChar[col] = code;
          } else if (code !== firstChar[col]) {
            variable[col] = 1;
          }
        }
      }

      const mask = new Array(maxLen);
      for (let col = 0; col < maxLen; col++) mask[col] = variable[col] ? '1' : '0';
      return mask.join('');
    } catch (e) {
      console.warn('Alignment.computeConstantMaskAllowNAndGaps failed', e);
      return '1'.repeat(this.getMaxSeqLen());
    }
  }
}

// Universal genetic code translation table
Alignment.GENETIC_CODE = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
};

// Translate a nucleotide sequence to amino acids
// seq: nucleotide sequence string
// frame: reading frame (1, 2, or 3)
// Returns: amino acid sequence string
Alignment.translateSequence = function(seq, frame) {
  if (!seq || typeof seq !== 'string') return '';
  frame = frame || 1;
  const startPos = frame - 1; // Convert to 0-indexed
  let protein = '';
  
  for (let i = startPos; i + 2 < seq.length; i += 3) {
    const codon = seq.substring(i, i + 3).toUpperCase().replace(/U/g, 'T');
    if (codon.length === 3 && !/[^ACGT]/.test(codon)) {
      const aa = Alignment.GENETIC_CODE[codon] || 'X';
      protein += aa;
    } else {
      protein += 'X'; // Unknown/ambiguous
    }
  }
  
  return protein;
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Alignment;
}
if (typeof window !== 'undefined') {
  window.Alignment = Alignment;
}

// NOTE: Auto-instantiation disabled - data is loaded on demand via user choice
// Instantiate the global alignment object from the ebov_alignment data
// This assumes ebov.js has been loaded first (which provides ebov_alignment)
// if (typeof window !== 'undefined' && typeof window.ebov_alignment !== 'undefined') {
//   window.alignment = new Alignment(window.ebov_alignment);
// } else {
//   console.warn('Alignment: ebov_alignment data not found. Make sure ebov.js is loaded before alignment.js');
// }
