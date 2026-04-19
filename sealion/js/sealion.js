// sealion.js — Sealion alignment viewer app (ES module).
// Entry point loaded as <script type="module">.

import { SealionViewer } from './sealionviewer.js';
import { COMMAND_DEFS } from './sealion-commands.js';
import { EXAMPLE_DATASETS } from './config.js';
import { createCommands } from '@artic-network/pearcore/commands.js';
import {
  andMasks, parseGenBankFile, fetchWithFallback,
} from './sealion-utils.js';

// Alignment is loaded as a classic script and available on window.
const Alignment = window.Alignment;

;(async function () {

  const __statusEl = document.getElementById('init-status');
  // Feature flag: show a centered translucent status box during initialization
  const USE_CENTER_STATUS = true;
  let __centerStatusEl = null;
  let __centerStatusText = null;
  function ensureCenterStatus() {
    if (!USE_CENTER_STATUS) return null;
    if (__centerStatusEl) return __centerStatusEl;
    try {
      __centerStatusEl = document.getElementById('center-status');
      if (!__centerStatusEl) {
        __centerStatusEl = document.createElement('div');
        __centerStatusEl.id = 'center-status';
        __centerStatusEl.setAttribute('role', 'status');
        __centerStatusEl.setAttribute('aria-live', 'polite');

        const spinner = document.createElement('div');
        spinner.className = 'center-spinner';
        const txt = document.createElement('div');
        txt.className = 'center-status-text';
        txt.textContent = '';
        __centerStatusText = txt;

        __centerStatusEl.appendChild(spinner);
        __centerStatusEl.appendChild(txt);
        document.body.appendChild(__centerStatusEl);
      } else {
        __centerStatusText = __centerStatusEl.querySelector('.center-status-text') || __centerStatusText;
      }
    } catch (e) { __centerStatusEl = null; }
    return __centerStatusEl;
  }
  function setStatus(msg) {
    try {
      // clear any existing auto-clear timer whenever status changes
      try { if (typeof statusAutoClearTimer !== 'undefined' && statusAutoClearTimer) { clearTimeout(statusAutoClearTimer); statusAutoClearTimer = null; } } catch (_) { }
      if (USE_CENTER_STATUS) {
        const el = ensureCenterStatus();
        if (el) {
          if (msg) {
            if (__centerStatusText) __centerStatusText.textContent = msg;
            el.classList.add('visible');
            // Auto-clear the initial 'checking alignment data...' message after a short timeout
            try {
              if (msg === 'checking alignment data...') {
                statusAutoClearTimer = setTimeout(() => {
                  try { setStatus(null); console.warn('Initialization status auto-cleared after timeout — check console for errors.'); } catch (_) { }
                }, 5000);
              }
            } catch (_) { }
          } else {
            el.classList.remove('visible');
          }
          return;
        }
      }
      // fallback to inline status element if present
      if (__statusEl) __statusEl.textContent = msg || '';
    } catch (e) { }
  }

  // ── Forward declarations (used by window.sealion interface below) ──────────
  let viewer = null;
  let alignment = null;

  // ── Sealion app interface (for sealion-tauri.js and the command registry) ────
  // window.sealion is set up here with stub implementations; concrete methods
  // that rely on closures defined later in this file are filled in below.
  // The Tauri adapter (sealion-tauri.js) may override pickFile and setSaveHandler.
  {
    const _prev = window.sealion || {};
    const commands = createCommands(document, COMMAND_DEFS);
    window.sealion = {
      commands,

      // Override in sealion-tauri.js for a native file-open dialog.
      pickFile: () => { document.getElementById('open-file-btn')?.click(); },

      // Filled in once the relevant setup blocks below have run.
      loadFastaFromText:     null,
      loadReferenceFromText: null,

      // Lazily read IIFE-scoped variables — safe because these are only ever
      // called after sealion-ready fires (i.e. after the IIFE has completed).
      get hasAlignment() { return !!(window.alignment); },
      openSearch: () => { try { openSearchModal(); } catch (_) {} },
      findNext:   () => { try { if (viewer && viewer.nextMatch)       viewer.nextMatch();        } catch (_) {} },
      findPrev:   () => { try { if (viewer && viewer.previousMatch)   viewer.previousMatch();    } catch (_) {} },

      showErrorDialog(msg) { alert(msg); },
      closeModal() {
        // Will be overwritten once dialogs are initialized
      },
      setSaveHandler(fn) { window.sealion._saveHandler = fn; },
      _saveHandler: null,
    };
  }

  // Button to jump to next difference from reference
  const diffNextBtn = document.getElementById('diff-next-btn');
  if (diffNextBtn) {
    diffNextBtn.addEventListener('click', () => {
      try {
        if (!viewer || !viewer.alignment) { console.warn('Viewer not available'); return; }
        
        // Get reference string
        const refStr = (window && window.reference) ? String(window.reference) : null;
        if (!refStr) {
          console.warn('No reference set. Please set a reference first.');
          alert('No reference set. Please set a reference sequence first using "Set consensus as reference" or "Set selected as reference".');
          return;
        }
        
        // Call the viewer method
        if (typeof viewer.jumpToNextDifference === 'function') {
          viewer.jumpToNextDifference(refStr);
        } else {
          console.warn('jumpToNextDifference method not available on viewer');
        }
      } catch (e) { console.warn('diff-next failed', e); }
    });
  }

  // Button to jump to previous difference from reference
  const diffPrevBtn = document.getElementById('diff-prev-btn');
  if (diffPrevBtn) {
    diffPrevBtn.addEventListener('click', () => {
      try {
        if (!viewer || !viewer.alignment) { console.warn('Viewer not available'); return; }
        
        // Get reference string
        const refStr = (window && window.reference) ? String(window.reference) : null;
        if (!refStr) {
          console.warn('No reference set. Please set a reference first.');
          alert('No reference set. Please set a reference sequence first using "Set consensus as reference" or "Set selected as reference".');
          return;
        }
        
        // Call the viewer method
        if (typeof viewer.jumpToPreviousDifference === 'function') {
          viewer.jumpToPreviousDifference(refStr);
        } else {
          console.warn('jumpToPreviousDifference method not available on viewer');
        }
      } catch (e) { console.warn('diff-prev failed', e); }
    });
  }

  // ── Sequence Search ──────────────────────────────────────────────────────
  const seqSearchBtn = document.getElementById('seq-search-btn');
  const findNextBtn = document.getElementById('find-next-btn');
  const findPrevBtn = document.getElementById('find-prev-btn');

  const searchDialog = initSearchDialog(document, {
    prefix: 'seq',
    closeOnFind: true,
    onFind: (query) => {
      if (!viewer) return { count: 0 };
      // Determine start position: begin just after current selection
      let startRow = null, startCol = null;
      try {
        const selRows = viewer.getSelectedRows ? Array.from(viewer.getSelectedRows()) : [];
        const selCols = viewer.getSelectedCols ? Array.from(viewer.getSelectedCols()) : [];
        if (selRows.length > 0) startRow = Math.min(...selRows);
        if (selCols.length > 0) startCol = Math.max(...selCols) + 1;
      } catch (_) {}
      const count = viewer.performSearch(query, startRow, startCol);
      const index = (viewer.currentMatchIndex !== undefined && viewer.currentMatchIndex >= 0)
        ? viewer.currentMatchIndex : 0;
      return { count, index };
    },
    onNext: () => {
      if (!viewer || !viewer.searchMatches || viewer.searchMatches.length === 0) return { count: 0, index: 0 };
      viewer.nextMatch();
      return { count: viewer.searchMatches.length, index: viewer.currentMatchIndex ?? 0 };
    },
    onPrev: () => {
      if (!viewer || !viewer.searchMatches || viewer.searchMatches.length === 0) return { count: 0, index: 0 };
      viewer.previousMatch();
      return { count: viewer.searchMatches.length, index: viewer.currentMatchIndex ?? 0 };
    },
  });

  /** Open the search dialog */
  function openSearchModal() {
    searchDialog.open();
  }

  if (seqSearchBtn) seqSearchBtn.addEventListener('click', openSearchModal);

  if (findNextBtn) {
    findNextBtn.addEventListener('click', () => {
      if (!viewer) return;
      if (viewer.searchMatches && viewer.searchMatches.length > 0) {
        viewer.nextMatch();
      } else {
        openSearchModal();
      }
    });
  }

  if (findPrevBtn) {
    findPrevBtn.addEventListener('click', () => {
      if (!viewer) return;
      if (viewer.searchMatches && viewer.searchMatches.length > 0) {
        viewer.previousMatch();
      } else {
        openSearchModal();
      }
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Helper to prefer viewer-owned properties but fall back to local value.
  function getViewerProp(name, localVal, viewerKey) {
    try {
      const key = viewerKey || name;
      // Prefer explicit instance property (viewer[key]) if available
      if (viewer && typeof viewer[key] !== 'undefined') return viewer[key];
      // Then prefer the viewer's default constants if provided (single source of truth)
      if (viewer && viewer.DEFAULTS && typeof viewer.DEFAULTS[name] !== 'undefined') return viewer.DEFAULTS[name];
      // Then any global window override
      if (window && typeof window[name] !== 'undefined') return window[name];
      return localVal;
    } catch (_) { return localVal; }
  }

  // prefer the single scroll root when present — we'll override these below if needed
  let leftScroll = document.getElementById('left-scroll');
  let rightScroll = document.getElementById('right-scroll');
  const seqSpacer = document.getElementById('seq-spacer');
  const leftSpacer = document.getElementById('left-spacer');
  // the alignment scroll element is the authoritative scroller for both axes
  const alignScroll = document.getElementById('alignment-scroll');
  if (alignScroll) { leftScroll = alignScroll; rightScroll = alignScroll; }
  // canonical scroller used everywhere from now on
  const scroller = alignScroll || rightScroll || leftScroll || null;

  // Modern initialization flow:
  // 1. Wait for SealionViewer class to load
  // 2. Create viewer (empty, no data)
  // 3. Wait for alignment data to load
  // 4. Set data on viewer
  // 5. Complete initialization

  async function initializeViewer() {
    try {
      // Create empty viewer instance (no data yet - will be loaded by user choice)
      setStatus('Creating viewer...');
      viewer = new SealionViewer('#sealion', null, SealionViewer.DEFAULTS);
      try { window.viewer = viewer; } catch (_) { }
      console.info('SealionViewer created (no data - waiting for user to load)');

      // Step 3: Check for fastaUrl parameter in URL, or show file upload modal
      setStatus(null); // Clear status
      
      // Check for fastaUrl parameter in URL (check parent window if in iframe)
      let searchParams = '';
      try {
        // Try to get parent window's URL if we're in an iframe
        if (window.parent && window.parent !== window) {
          searchParams = window.parent.location.search;
        } else {
          searchParams = window.location.search;
        }
      } catch (e) {
        // If cross-origin, fall back to current window
        searchParams = window.location.search;
      }
      
      const urlParams = new URLSearchParams(searchParams);
      const fastaUrl = urlParams.get('fastaUrl');
      
      if (fastaUrl) {
        // Auto-load from URL parameter — do NOT show modal; load silently
        console.info('Loading FASTA from URL parameter:', fastaUrl);
        setStatus('Loading FASTA from URL...');
        
        // Wait for the page to finish loading and dialog to be set up, then trigger auto-load
        setTimeout(() => {
          console.info('Attempting to auto-load FASTA from URL');
          if (typeof window.loadFastaFromUrl === 'function') {
            console.info('Triggering auto-load');
            window.loadFastaFromUrl(fastaUrl);
          } else {
            console.error('Auto-load failed: loadFastaFromUrl not available');
          }
        }, 100); // Small delay to ensure dialog setup completes
      } else {
        // No URL param — show the open file dialog for user to pick data
        setTimeout(() => {
          const fastaOverlay = document.getElementById('fasta-open-modal');
          if (fastaOverlay) fastaOverlay.classList.add('active');
        }, 0);
        console.info('Showing file open dialog - waiting for user data choice');
      }

      // NOTE: The rest of initialization (dark mode, custom names, etc.)
      // is deferred until after data is loaded via loadDataIntoViewer()

    } catch (e) {
      console.error('Failed to initialize viewer:', e);
      setStatus('Failed to load viewer: ' + e.message);
    }
  }

  // Function to detect if alignment contains amino acid or nucleotide sequences
  // Returns true if sequences appear to be amino acids, false for nucleotides
  function detectAminoAcidSequences(alignmentInstance) {
    if (!alignmentInstance || typeof alignmentInstance.getSequenceCount !== 'function') {
      return false;
    }
    
    const seqCount = alignmentInstance.getSequenceCount();
    if (seqCount === 0) return false;
    
    // Check a sample of sequences (up to first 10)
    const samplesToCheck = Math.min(10, seqCount);
    const nucleotideChars = new Set(['A', 'C', 'G', 'T', 'U', 'N', '-']);
    const aminoAcidChars = new Set([
      'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 
      'S', 'T', 'V', 'W', 'Y', 'X', '*', '-'
    ]);
    
    let totalNonAmbiguous = 0;
    let aminoAcidSpecific = 0;
    
    for (let i = 0; i < samplesToCheck; i++) {
      const seq = alignmentInstance.getSequence(i);
      if (!seq || !seq.sequence) continue;
      
      // Sample characters from the sequence (check up to 200 positions)
      const seqStr = seq.sequence.toUpperCase();
      const checkLength = Math.min(200, seqStr.length);
      
      for (let j = 0; j < checkLength; j++) {
        const char = seqStr.charAt(j);
        
        // Skip gaps and ambiguity codes
        if (char === '-' || char === 'N' || char === 'X' || char === '') continue;
        
        totalNonAmbiguous++;
        
        // Check if character is amino acid specific (not in nucleotide set)
        if (aminoAcidChars.has(char) && !nucleotideChars.has(char)) {
          aminoAcidSpecific++;
        }
      }
    }
    
    // If we found no non-ambiguous characters, assume nucleotide
    if (totalNonAmbiguous === 0) return false;
    
    // If more than 5% of characters are amino acid specific, it's likely amino acid
    const aminoAcidRatio = aminoAcidSpecific / totalNonAmbiguous;
    return aminoAcidRatio > 0.05;
  }

  // Function to disable translation controls (for amino acid alignments)
  function disableTranslationControls() {
    // Disable nucleotide mode button
    const nucleotideModeBtn = document.getElementById('nucleotide-mode-btn');
    if (nucleotideModeBtn) {
      nucleotideModeBtn.classList.add('disabled');
      nucleotideModeBtn.setAttribute('disabled', 'disabled');
      nucleotideModeBtn.title = 'Not available for amino acid sequences';
      nucleotideModeBtn.style.display = 'none'; // Hide it completely
    }
    
    // Disable codon mode button
    const codonModeBtn = document.getElementById('codon-mode-btn');
    if (codonModeBtn) {
      codonModeBtn.classList.add('disabled');
      codonModeBtn.setAttribute('disabled', 'disabled');
      codonModeBtn.title = 'Not available for amino acid sequences';
      codonModeBtn.style.display = 'none'; // Hide it completely
    }
    
    // Disable reading frame selectors and the divider before them
    const readingFrameSelectors = document.querySelectorAll('.reading-frame-selector');
    readingFrameSelectors.forEach(btn => {
      btn.classList.add('disabled');
      btn.setAttribute('disabled', 'disabled');
      btn.title = 'Not available for amino acid sequences';
      const parent = btn.closest('li');
      if (parent) parent.style.display = 'none'; // Hide the list item
    });
    
    // Hide the divider before reading frames
    const dividers = document.querySelectorAll('#amino-acid-mode-btn').length > 0 
      ? document.querySelectorAll('#amino-acid-mode-btn')[0].closest('li').nextElementSibling
      : null;
    if (dividers && dividers.classList.contains('dropdown-divider')) {
      dividers.style.display = 'none';
    }
    
    // Hide nucleotide color schemes section
    const nucleotideColorBtns = document.querySelectorAll('.nucleotide-color-scheme-btn');
    nucleotideColorBtns.forEach(btn => {
      const parent = btn.closest('li');
      if (parent) parent.style.display = 'none';
    });
    
    // Hide nucleotide color header and dividers
    const allDropdownItems = document.querySelectorAll('.dropdown-menu li');
    allDropdownItems.forEach(li => {
      if (li.classList.contains('dropdown-header') && li.textContent.includes('Nucleotide')) {
        li.style.display = 'none';
        // Hide the divider after nucleotide header (before first nucleotide color scheme)
        const nextSibling = li.nextElementSibling;
        if (nextSibling && nextSibling.querySelector('.nucleotide-color-scheme-btn')) {
          // Already hidden by the button loop above
        }
      }
    });
    
    // Hide the divider between nucleotide and amino acid sections
    const nucleotideSection = document.querySelector('.nucleotide-color-scheme-btn');
    if (nucleotideSection) {
      let currentEl = nucleotideSection.closest('li');
      while (currentEl) {
        currentEl = currentEl.nextElementSibling;
        if (currentEl && currentEl.querySelector('hr.dropdown-divider')) {
          const nextLi = currentEl.nextElementSibling;
          if (nextLi && nextLi.classList.contains('dropdown-header') && nextLi.textContent.includes('Amino acid')) {
            currentEl.style.display = 'none';
            break;
          }
        }
        if (!currentEl || currentEl.querySelector('.amino-acid-color-scheme-btn')) break;
      }
    }
  }

  // Function to enable translation controls (for nucleotide alignments)
  function enableTranslationControls() {
    // Enable nucleotide mode button
    const nucleotideModeBtn = document.getElementById('nucleotide-mode-btn');
    if (nucleotideModeBtn) {
      nucleotideModeBtn.classList.remove('disabled');
      nucleotideModeBtn.removeAttribute('disabled');
      nucleotideModeBtn.title = '';
      nucleotideModeBtn.style.display = ''; // Show it
    }
    
    // Enable codon mode button
    const codonModeBtn = document.getElementById('codon-mode-btn');
    if (codonModeBtn) {
      codonModeBtn.classList.remove('disabled');
      codonModeBtn.removeAttribute('disabled');
      codonModeBtn.title = '';
      codonModeBtn.style.display = ''; // Show it
    }
    
    // Enable reading frame selectors
    const readingFrameSelectors = document.querySelectorAll('.reading-frame-selector');
    readingFrameSelectors.forEach(btn => {
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
      btn.title = '';
      const parent = btn.closest('li');
      if (parent) parent.style.display = ''; // Show the list item
    });
    
    // Show the divider before reading frames
    const dividers = document.querySelectorAll('#amino-acid-mode-btn').length > 0 
      ? document.querySelectorAll('#amino-acid-mode-btn')[0].closest('li').nextElementSibling
      : null;
    if (dividers && dividers.classList.contains('dropdown-divider')) {
      dividers.style.display = '';
    }
    
    // Show nucleotide color schemes section
    const nucleotideColorBtns = document.querySelectorAll('.nucleotide-color-scheme-btn');
    nucleotideColorBtns.forEach(btn => {
      const parent = btn.closest('li');
      if (parent) parent.style.display = '';
    });
    
    // Show nucleotide color header
    const allDropdownItems = document.querySelectorAll('.dropdown-menu li');
    allDropdownItems.forEach(li => {
      if (li.classList.contains('dropdown-header') && li.textContent.includes('Nucleotide')) {
        li.style.display = '';
      }
    });
    
    // Show the divider between nucleotide and amino acid sections
    const nucleotideSection = document.querySelector('.nucleotide-color-scheme-btn');
    if (nucleotideSection) {
      let currentEl = nucleotideSection.closest('li');
      while (currentEl) {
        currentEl = currentEl.nextElementSibling;
        if (currentEl && currentEl.querySelector('hr.dropdown-divider')) {
          const nextLi = currentEl.nextElementSibling;
          if (nextLi && nextLi.classList.contains('dropdown-header') && nextLi.textContent.includes('Amino acid')) {
            currentEl.style.display = '';
            break;
          }
        }
        if (!currentEl || currentEl.querySelector('.amino-acid-color-scheme-btn')) break;
      }
    }
  }

  // Function to update collapse preset button labels based on mode
  function updateCollapseButtonLabels(isAminoAcid) {
    const ambiguousChar = isAminoAcid ? 'X' : 'N';
    
    // Update "Constant (allow N)" button
    const applyConstantAmbiguousBtn = document.getElementById('apply-constant-ambiguous-btn');
    if (applyConstantAmbiguousBtn) {
      const icon = applyConstantAmbiguousBtn.querySelector('.bi');
      applyConstantAmbiguousBtn.innerHTML = '';
      if (icon) applyConstantAmbiguousBtn.appendChild(icon.cloneNode(true));
      applyConstantAmbiguousBtn.appendChild(document.createTextNode(` Constant (allow ${ambiguousChar})`));
    }
    
    // Update "Constant (allow N & -)" button
    const applyConstantGappedBtn = document.getElementById('apply-constant-gapped-btn');
    if (applyConstantGappedBtn) {
      const icon = applyConstantGappedBtn.querySelector('.bi');
      applyConstantGappedBtn.innerHTML = '';
      if (icon) applyConstantGappedBtn.appendChild(icon.cloneNode(true));
      applyConstantGappedBtn.appendChild(document.createTextNode(` Constant (allow ${ambiguousChar} & -)`));
    }
  }

  // Helper function to complete viewer setup after data is loaded
  function loadDataIntoViewer(alignmentInstance) {
    try {
      console.time('loadDataIntoViewer');
      
      // Set data on viewer
      setStatus('Initializing alignment view...');
      console.time('loadDataIntoViewer:setData');
      viewer.setData(alignmentInstance);
      console.timeEnd('loadDataIntoViewer:setData');
      console.info('Viewer data set');

      // Update global alignment reference
      alignment = alignmentInstance;
      try { window.alignment = alignmentInstance; } catch (_) { }

      // Detect if sequences are amino acid or nucleotide
      console.time('loadDataIntoViewer:detectAminoAcid');
      const isAminoAcid = detectAminoAcidSequences(alignmentInstance);
      console.timeEnd('loadDataIntoViewer:detectAminoAcid');
      if (isAminoAcid) {
        console.info('Detected amino acid sequences - setting native amino acid mode');
        // Set new mode system
        viewer.dataType = 'aminoacid';
        viewer.displayMode = 'native';
        // Backward compatibility flags
        viewer.aminoAcidMode = true;
        viewer.codonMode = false;
        viewer.isNativeAminoAcid = true;
        window.isAminoAcidAlignment = true;
        
        // Disable nucleotide/codon mode buttons and reading frame selectors
        disableTranslationControls();
        
        // Update collapse button labels for amino acid mode
        updateCollapseButtonLabels(true);
      } else {
        console.info('Detected nucleotide sequences - starting in native mode');
        // Set new mode system
        viewer.dataType = 'nucleotide';
        viewer.displayMode = 'native';
        // Backward compatibility flags
        viewer.aminoAcidMode = false;
        viewer.codonMode = false;
        viewer.isNativeAminoAcid = false;
        window.isAminoAcidAlignment = false;
        
        // Ensure translation controls are enabled
        enableTranslationControls();
        
        // Update collapse button labels for nucleotide mode
        updateCollapseButtonLabels(false);
      }

      // Notify command registry that export / diff navigation are now available.
      try {
        if (window.sealion && window.sealion.commands) {
          window.sealion.commands.setEnabled('export-alignment', true);
          window.sealion.commands.setEnabled('next-diff', true);
          window.sealion.commands.setEnabled('prev-diff', true);
        }
      } catch (_) {}

      // Get data dimensions
      const maxSeqLen = alignmentInstance.getMaxSeqLen();
      const rowCount = alignmentInstance.getSequenceCount();
      window.maxSeqLen = maxSeqLen;
      window.rowCount = rowCount;

      // Reset mask string
      window.maskStr = '1'.repeat(maxSeqLen);

      // Load saved dark mode preference from localStorage
      console.time('loadDataIntoViewer:loadDarkMode');
      try {
        const darkModePref = localStorage.getItem('sealion_dark_mode');
        if (darkModePref === 'true' && !viewer.darkMode) {
          viewer.toggleDarkMode();
          const _themeBtn = document.getElementById('btn-theme');
          if (_themeBtn) {
            const icon = _themeBtn.querySelector('i');
            if (icon) icon.className = 'bi bi-sun';
          }
          console.info('Dark mode loaded from localStorage');
        }
      } catch (e) {
        console.warn('Failed to load dark mode preference:', e);
      }
      console.timeEnd('loadDataIntoViewer:loadDarkMode');

      // Load saved custom names from localStorage
      console.time('loadDataIntoViewer:loadCustomNames');
      if (typeof viewer.loadCustomNames === 'function') {
        viewer.loadCustomNames();
      }
      console.timeEnd('loadDataIntoViewer:loadCustomNames');

      // Load saved nucleotide color scheme preference from localStorage
      console.time('loadDataIntoViewer:loadNucleotideColorScheme');
      try {
        if (typeof viewer.loadNucleotideColorScheme === 'function') {
          viewer.loadNucleotideColorScheme();
        }
      } catch (e) {
        console.warn('Failed to load nucleotide color scheme preference:', e);
      }
      console.timeEnd('loadDataIntoViewer:loadNucleotideColorScheme');

      // Load saved amino acid color scheme preference from localStorage
      console.time('loadDataIntoViewer:loadAminoAcidColorScheme');
      try {
        if (typeof viewer.loadAminoAcidColorScheme === 'function') {
          viewer.loadAminoAcidColorScheme();
        }
      } catch (e) {
        console.warn('Failed to load amino acid color scheme preference:', e);
      }
      console.timeEnd('loadDataIntoViewer:loadAminoAcidColorScheme');

      // Load saved tags from localStorage
      console.time('loadDataIntoViewer:loadTags');
      if (typeof viewer.loadTags === 'function') {
        viewer.loadTags();
      }
      console.timeEnd('loadDataIntoViewer:loadTags');

      // Load saved bookmarks from localStorage
      console.time('loadDataIntoViewer:loadBookmarks');
      if (typeof viewer.loadBookmarks === 'function') {
        viewer.loadBookmarks();
      }
      console.timeEnd('loadDataIntoViewer:loadBookmarks');

      // Update UI with custom names
      console.time('loadDataIntoViewer:updateNames');
      updateTagAndBookmarkNames();
      console.timeEnd('loadDataIntoViewer:updateNames');

      // Populate labels-consensus-div with UI controls
      console.time('loadDataIntoViewer:populateUI');
      try {
        const labelsConsensusDiv = document.getElementById('labels-consensus-div') || (viewer && viewer.labelsConsensusDiv);
        if (labelsConsensusDiv && labelsConsensusDiv.children.length === 0) {
          // Create Sort dropdown (aligned left)
          const sortBtnGroup = document.createElement('div');
          sortBtnGroup.className = 'btn-group';
          sortBtnGroup.role = 'group';
          
          const sortDropdownBtn = document.createElement('button');
          sortDropdownBtn.className = 'btn btn-sm btn-outline-secondary dropdown-toggle';
          sortDropdownBtn.type = 'button';
          sortDropdownBtn.setAttribute('data-bs-toggle', 'dropdown');
          sortDropdownBtn.setAttribute('aria-expanded', 'false');
          sortDropdownBtn.style.padding = '0.125rem 0.5rem';
          sortDropdownBtn.style.fontSize = '0.75rem';
          sortDropdownBtn.style.lineHeight = '1.2';
          sortDropdownBtn.innerHTML = '<i class="bi bi-sort-alpha-down"></i> Sort';
          
          const sortDropdownMenu = document.createElement('ul');
          sortDropdownMenu.className = 'dropdown-menu';
          
          // Add all sort options
          const sortOptions = [
            { id: 'sort-original-btn', icon: 'bi-arrow-counterclockwise', text: 'Original order', divider: true },
            { id: 'sort-label-btn', icon: 'bi-sort-alpha-down', text: 'Sort by label (A→Z)' },
            { id: 'sort-label-reverse-btn', icon: 'bi-sort-alpha-up', text: 'Sort by label (Z→A)', divider: true },
            { id: 'sort-column-btn', icon: 'bi-sort-down', text: 'Sort by selected column (A→Z)' },
            { id: 'sort-column-reverse-btn', icon: 'bi-sort-up', text: 'Sort by selected column (Z→A)', divider: true },
            { id: 'sort-start-pos-btn', icon: 'bi-arrow-right', text: 'Sort by start position (0→N)' },
            { id: 'sort-start-pos-reverse-btn', icon: 'bi-arrow-left', text: 'Sort by start position (N→0)', divider: true },
            { id: 'sort-seq-length-btn', icon: 'bi-arrow-bar-right', text: 'Sort by sequence length (short→long)' },
            { id: 'sort-seq-length-reverse-btn', icon: 'bi-arrow-bar-left', text: 'Sort by sequence length (long→short)', divider: true },
            { id: 'sort-tag-btn', icon: 'bi-tag', text: 'Sort by tags (tagged first)', divider: true },
            { id: 'fix-order-btn', icon: 'bi-lock', text: 'Fix current order' }
          ];
          
          sortOptions.forEach(option => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.className = 'dropdown-item';
            btn.id = option.id;
            btn.type = 'button';
            btn.innerHTML = `<i class="bi ${option.icon}"></i> ${option.text}`;
            li.appendChild(btn);
            sortDropdownMenu.appendChild(li);
            
            if (option.divider) {
              const dividerLi = document.createElement('li');
              dividerLi.innerHTML = '<hr class="dropdown-divider">';
              sortDropdownMenu.appendChild(dividerLi);
            }
          });
          
          sortBtnGroup.appendChild(sortDropdownBtn);
          sortBtnGroup.appendChild(sortDropdownMenu);
          labelsConsensusDiv.appendChild(sortBtnGroup);
          
          // Attach event handlers to sort buttons
          document.getElementById('sort-original-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderByOriginalIndex();
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-label-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderByLabel();
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-label-reverse-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderByLabel(true);
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-column-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            const selectedCols = viewer.getSelectedCols ? viewer.getSelectedCols() : (viewer.selectedCols || new Set());
            if (selectedCols.size === 0) {
              alert('Please select a column first');
              return;
            }
            const col = Array.from(selectedCols)[0];
            viewer.alignment.orderBySite(col, false, {
              aminoAcidMode: viewer.aminoAcidMode || false,
              readingFrame: viewer.readingFrame || 1
            });
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-column-reverse-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            const selectedCols = viewer.getSelectedCols ? viewer.getSelectedCols() : (viewer.selectedCols || new Set());
            if (selectedCols.size === 0) {
              alert('Please select a column first');
              return;
            }
            const col = Array.from(selectedCols)[0];
            viewer.alignment.orderBySite(col, true, {
              aminoAcidMode: viewer.aminoAcidMode || false,
              readingFrame: viewer.readingFrame || 1
            });
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-start-pos-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderByStartPos();
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-start-pos-reverse-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderByStartPos(true);
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-seq-length-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderBySeqLength();
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-seq-length-reverse-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderBySeqLength(true);
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('sort-tag-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.orderByTag(viewer.labelTags);
            viewer.cancelRender();
            viewer.scheduleRender();
          });
          
          document.getElementById('fix-order-btn').addEventListener('click', () => {
            if (!viewer || !viewer.alignment) return;
            viewer.alignment.fixCurrentOrder();
            console.log('Current order fixed');
          });
          
          // Add dropdown button group for reference selection (aligned right)
          const btnGroup = document.createElement('div');
          btnGroup.className = 'btn-group';
          btnGroup.role = 'group';
          btnGroup.id = 'reference-dropdown-group';
          
          const dropdownBtn = document.createElement('button');
          dropdownBtn.className = 'btn btn-sm btn-outline-secondary dropdown-toggle';
          dropdownBtn.type = 'button';
          dropdownBtn.id = 'reference-dropdown-btn';
          dropdownBtn.setAttribute('data-bs-toggle', 'dropdown');
          dropdownBtn.setAttribute('aria-expanded', 'false');
          dropdownBtn.style.padding = '0.125rem 0.5rem';
          dropdownBtn.style.fontSize = '0.75rem';
          dropdownBtn.style.lineHeight = '1.2';
          dropdownBtn.textContent = 'Consensus';
          
          const dropdownMenu = document.createElement('ul');
          dropdownMenu.className = 'dropdown-menu';
          dropdownMenu.id = 'reference-dropdown-menu';
          
          // Add Consensus option
          const consensusItem = document.createElement('li');
          const consensusButton = document.createElement('button');
          consensusButton.className = 'dropdown-item';
          consensusButton.type = 'button';
          consensusButton.textContent = 'Consensus';
          consensusButton.setAttribute('data-ref-type', 'consensus');
          consensusButton.classList.add('active');
          consensusButton.addEventListener('click', () => {
            selectDisplayedReference('consensus', null);
          });
          consensusItem.appendChild(consensusButton);
          dropdownMenu.appendChild(consensusItem);
          
          // Add "Use selected sequence as reference" option
          const selectedSeqItem = document.createElement('li');
          const selectedSeqButton = document.createElement('button');
          selectedSeqButton.className = 'dropdown-item';
          selectedSeqButton.type = 'button';
          selectedSeqButton.textContent = 'Use selected sequence as reference';
          selectedSeqButton.setAttribute('data-ref-type', 'selected');
          selectedSeqButton.addEventListener('click', () => {
            selectDisplayedReference('selected', null);
          });
          selectedSeqItem.appendChild(selectedSeqButton);
          dropdownMenu.appendChild(selectedSeqItem);
          
          btnGroup.appendChild(dropdownBtn);
          btnGroup.appendChild(dropdownMenu);
          labelsConsensusDiv.appendChild(btnGroup);
        }
      } catch (e) {
        console.warn('Failed to populate labels-consensus-div:', e);
      }
      console.timeEnd('loadDataIntoViewer:populateUI');

      // Attach interaction handlers
      console.time('loadDataIntoViewer:attachHandlers');
      try {
        // Query DOM for canvases created by viewer
        const realHeaderCanvas = document.getElementById('header-canvas') || (viewer && viewer.headerCanvas) || null;
        const realSeqCanvas = document.getElementById('seq-canvas') || (viewer && viewer.seqCanvas) || null;
        const realLabelCanvas = document.getElementById('labels-canvas') || (viewer && viewer.labelCanvas) || null;
        const realConsensusCanvas = document.getElementById('consensus-canvas') || (viewer && viewer.consensusCanvas) || null;
        const realOverviewCanvas = document.getElementById('overview-canvas') || (viewer && viewer.overviewCanvas) || null;
        const realLabelsHeaderCanvas = document.getElementById('labels-header-canvas') || (viewer && viewer.labelsHeaderCanvas) || null;
        const realSeqSpacer = document.getElementById('seq-spacer') || (viewer && viewer.seqSpacer) || seqSpacer || null;
        const realLeftSpacer = document.getElementById('left-spacer') || (viewer && viewer.leftSpacer) || leftSpacer || null;
        const realLeftScroll = document.getElementById('left-scroll') || (viewer && viewer.leftScroll) || leftScroll || null;
        const realLabelDivider = document.getElementById('label-divider') || (viewer && viewer.labelDivider) || null;

        viewer.attachInteractionHandlers({
          headerCanvas: realHeaderCanvas,
          seqCanvas: realSeqCanvas,
          labelCanvas: realLabelCanvas,
          consensusCanvas: realConsensusCanvas,
          overviewCanvas: realOverviewCanvas,
          labelsHeaderCanvas: realLabelsHeaderCanvas,
          labelDivider: realLabelDivider,
          scroller: scroller,
          seqSpacer: realSeqSpacer,
          leftSpacer: realLeftSpacer,
          leftScroll: realLeftScroll,
          callbacks: {
            setColSelectionToRange: function (a, b) { const lo = Math.max(0, Math.min(a, b)); const hi = Math.min(maxSeqLen - 1, Math.max(a, b)); const cols = []; for (let c = lo; c <= hi; c++) cols.push(c); viewer.setSelectedCols(cols); },
            addRangeToColSelection: function (a, b) { const lo = Math.max(0, Math.min(a, b)); const hi = Math.min(maxSeqLen - 1, Math.max(a, b)); const cur = new Set(viewer.getSelectedCols()); for (let c = lo; c <= hi; c++) cur.add(c); viewer.setSelectedCols(Array.from(cur)); },
            setSelectionToRange: function (a, b) { const lo = Math.max(0, Math.min(a, b)); const hi = Math.min(rowCount - 1, Math.max(a, b)); const rows = []; for (let r = lo; r <= hi; r++) rows.push(r); viewer.setSelectedRows(rows); viewer.scheduleRender(); },
            addRangeToSelection: function (a, b) { const lo = Math.max(0, Math.min(a, b)); const hi = Math.min(rowCount - 1, Math.max(a, b)); const cur = new Set(viewer.getSelectedRows()); for (let r = lo; r <= hi; r++) cur.add(r); viewer.setSelectedRows(Array.from(cur)); viewer.scheduleRender(); },
            clearRectSelection: function () { viewer.clearRectSelection(); },
            clearSelectionSets: function () { viewer.clearSelectionSets(); },
            updateRectSelection: function (r0, r1, c0, c1, orig) { viewer.updateRectSelection(r0, r1, c0, c1, orig); },
            finalizeRectSelection: function (r0, r1, c0, c1, orig) { viewer.finalizeRectSelection(r0, r1, c0, c1, orig); }
          }
        });
      } catch (e) {
        console.error('Failed to attach interaction handlers to SealionViewer', e);
      }
      console.timeEnd('loadDataIntoViewer:attachHandlers');

      // Set up initial reference (consensus)
      console.time('loadDataIntoViewer:computeConsensus');
      setStatus('Computing consensus...');
      try {
        if (viewer && viewer.alignment) {
          const cons = viewer.alignment.computeConsensusSequence();
          window.consensusSequence = cons;
          if (cons) {
            try { window.reference = String(cons); } catch (_) { }
            
            console.info('Initialized with consensus as reference sequence');
          }
        }
      } catch (e) { console.warn('Failed to compute consensus', e); }
      console.timeEnd('loadDataIntoViewer:computeConsensus');

      // Complete initialization
      console.time('loadDataIntoViewer:scheduleRender');
      setStatus('Rendering...');
      
      // Schedule render and wait for it to complete before clearing status
      viewer.scheduleRender();
      
      // Use requestAnimationFrame chained after the viewer's RAF to ensure render completes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStatus(null);
          console.info('Data loaded and viewer initialized');
          console.timeEnd('loadDataIntoViewer');
        });
      });
      console.timeEnd('loadDataIntoViewer:scheduleRender');

    } catch (e) {
      console.error('Failed to load data into viewer:', e);
      console.timeEnd('loadDataIntoViewer');
      setStatus('ERROR: Failed to load data - see console');
    }
  }

  // divider element for resizing the labels column
  const labelDivider = document.getElementById('label-divider');
  const maskToggle = document.getElementById('mask-toggle');
  const colourAllBtn = document.getElementById('colour-all-btn');
  const colourDiffBtn = document.getElementById('colour-diff-btn');

  // mask string (should be provided by alignment.js). If absent we initialize to all '1's
  // Mask string: compression always enabled, start with all '1's (no compression)
  let maskStr = null;
  try { maskStr = '1'.repeat(maxSeqLen || 0); } catch (_) { maskStr = ''; }
  let refStr = null;
  let refIndex = null;
  let maskEnabled = true;
  let refModeEnabled = false;

  // State for currently displayed reference genome in consensus canvas
  let displayedReferenceType = 'consensus'; // 'consensus' or 'reference'
  let displayedReferenceAccession = null; // accession number when displayedReferenceType === 'reference'
  
  // Expose globally for access from viewer
  try { 
    window.displayedReferenceType = displayedReferenceType; 
    window.displayedReferenceAccession = displayedReferenceAccession;
  } catch (_) { }

  // Function to update the dropdown menu with available reference genomes
  function updateReferenceDropdown() {
    try {
      const dropdownMenu = document.getElementById('reference-dropdown-menu');
      const dropdownBtn = document.getElementById('reference-dropdown-btn');
      if (!dropdownMenu || !dropdownBtn) return;

      // Clear existing items
      dropdownMenu.innerHTML = '';

      // Add Consensus option
      const consensusItem = document.createElement('li');
      const consensusButton = document.createElement('button');
      consensusButton.className = 'dropdown-item';
      consensusButton.type = 'button';
      consensusButton.textContent = 'Consensus';
      consensusButton.setAttribute('data-ref-type', 'consensus');
      if (displayedReferenceType === 'consensus') {
        consensusButton.classList.add('active');
      }
      consensusButton.addEventListener('click', () => {
        selectDisplayedReference('consensus', null);
      });
      consensusItem.appendChild(consensusButton);
      dropdownMenu.appendChild(consensusItem);

      // Add "Use selected sequence as reference" option
      const selectedSeqItem = document.createElement('li');
      const selectedSeqButton = document.createElement('button');
      selectedSeqButton.className = 'dropdown-item';
      selectedSeqButton.type = 'button';
      selectedSeqButton.textContent = 'Use selected sequence as reference';
      selectedSeqButton.setAttribute('data-ref-type', 'selected');
      if (displayedReferenceType === 'selected') {
        selectedSeqButton.classList.add('active');
      }
      selectedSeqButton.addEventListener('click', () => {
        selectDisplayedReference('selected', null);
      });
      selectedSeqItem.appendChild(selectedSeqButton);
      dropdownMenu.appendChild(selectedSeqItem);

      // Add reference genome options
      if (alignment && alignment.getReferenceGenomeAccessions) {
        const accessions = alignment.getReferenceGenomeAccessions();
        if (accessions && accessions.length > 0) {
          // Add separator
          const separator = document.createElement('li');
          separator.innerHTML = '<hr class="dropdown-divider">';
          dropdownMenu.appendChild(separator);

          // Add each reference genome
          accessions.forEach(accession => {
            const refGenome = alignment.getReferenceGenome(accession);
            if (!refGenome) return;

            const item = document.createElement('li');
            const button = document.createElement('button');
            button.className = 'dropdown-item';
            button.type = 'button';
            
            // Use name if available, otherwise use accession
            const displayName = refGenome.name || refGenome.accession || accession;
            button.textContent = displayName.length > 50 ? displayName.substring(0, 47) + '...' : displayName;
            
            // Build tooltip with accession and definition
            const tooltipParts = [];
            if (refGenome.accession) {
              tooltipParts.push(`Accession: ${refGenome.accession}`);
            }
            if (refGenome.definition) {
              tooltipParts.push(`Definition: ${refGenome.definition}`);
            }
            if (tooltipParts.length > 0) {
              button.title = tooltipParts.join('\n');
            }
            
            button.setAttribute('data-ref-type', 'reference');
            button.setAttribute('data-accession', accession);
            
            if (displayedReferenceType === 'reference' && displayedReferenceAccession === accession) {
              button.classList.add('active');
            }
            
            button.addEventListener('click', () => {
              selectDisplayedReference('reference', accession);
            });
            
            item.appendChild(button);
            dropdownMenu.appendChild(item);
          });
        }
      }
    } catch (e) {
      console.warn('Failed to update reference dropdown:', e);
    }
  }

  // Function to select which reference to display in consensus canvas
  function selectDisplayedReference(type, accession) {
    try {
      displayedReferenceType = type;
      displayedReferenceAccession = accession;
      
      // Update window globals for viewer access
      try { 
        window.displayedReferenceType = type; 
        window.displayedReferenceAccession = accession;
      } catch (_) { }

      // Update dropdown button text
      const dropdownBtn = document.getElementById('reference-dropdown-btn');
      if (dropdownBtn) {
        if (type === 'consensus') {
          dropdownBtn.textContent = 'Consensus';
        } else if (type === 'selected') {
          dropdownBtn.textContent = 'Selected sequence';
        } else if (type === 'reference' && accession) {
          const refGenome = alignment.getReferenceGenome(accession);
          if (refGenome) {
            const displayName = refGenome.name || refGenome.accession || accession;
            dropdownBtn.textContent = displayName.length > 30 ? displayName.substring(0, 27) + '...' : displayName;
            
            // Build tooltip with accession and definition
            const tooltipParts = [];
            if (refGenome.accession) {
              tooltipParts.push(`Accession: ${refGenome.accession}`);
            }
            if (refGenome.definition) {
              tooltipParts.push(`Definition: ${refGenome.definition}`);
            }
            dropdownBtn.title = tooltipParts.length > 0 ? tooltipParts.join('\n') : displayName;
          }
        }
      }

      // Update active state in dropdown
      const dropdownMenu = document.getElementById('reference-dropdown-menu');
      if (dropdownMenu) {
        const items = dropdownMenu.querySelectorAll('.dropdown-item');
        items.forEach(item => {
          item.classList.remove('active');
          const itemType = item.getAttribute('data-ref-type');
          const itemAccession = item.getAttribute('data-accession');
          if (itemType === type && (type === 'consensus' || type === 'selected' || itemAccession === accession)) {
            item.classList.add('active');
          }
        });
      }

      // Store the displayed sequence for rendering
      if (type === 'consensus') {
        window.displayedSequence = window.consensusSequence || (viewer && viewer.alignment ? viewer.alignment.computeConsensusSequence() : null);
      } else if (type === 'selected') {
        // Get the selected sequence
        if (!viewer || !viewer.alignment) {
          console.warn('No viewer or alignment available');
          return;
        }
        
        // Get selected row (prefer anchorRow, then first selected row, else row 0)
        let idx = null;
        if (viewer.anchorRow !== undefined && viewer.anchorRow !== null) {
          idx = viewer.anchorRow;
        } else {
          const selectedRows = viewer.getSelectedRows ? viewer.getSelectedRows() : new Set();
          if (selectedRows && selectedRows.size > 0) {
            idx = Array.from(selectedRows)[0];
          } else {
            idx = 0;
          }
        }
        
        const rowCount = viewer.alignment.getSequenceCount ? viewer.alignment.getSequenceCount() : viewer.alignment.length;
        idx = Math.max(0, Math.min(rowCount - 1, idx));
        
        const seq = viewer.alignment[idx];
        if (!seq || !seq.sequence) {
          console.warn('No sequence available at selected row');
          window.displayedSequence = window.consensusSequence;
          return;
        }
        
        window.displayedSequence = seq.sequence;
        // Also set this as the reference for coloring differences
        try { 
          window.reference = seq.sequence;
          // Store the reference index
          try { window.__refIndex = idx; window.refIndex = idx; } catch (_) { }
          
        } catch (_) { }
        
        // Enable reference coloring mode
        refModeEnabled = true;
        try { window.refModeEnabled = true; } catch (_) { }
        if (viewer) { try { viewer.refModeEnabled = true; } catch (_) { } }
        
        console.info(`Set selected sequence (row ${idx}) as reference`);
      } else if (type === 'reference' && accession && alignment) {
        const refGenome = alignment.getReferenceGenome(accession);
        if (refGenome && refGenome.sequence) {
          window.displayedSequence = refGenome.sequence;
          // Also set this as the reference for coloring differences
          try { 
            window.reference = refGenome.sequence; 
            
          } catch (_) { }
        } else {
          console.warn(`Reference genome ${accession} has no sequence`);
          window.displayedSequence = window.consensusSequence;
        }
      }

      // Trigger re-render
      if (viewer && typeof viewer.scheduleRender === 'function') {
        viewer.scheduleRender();
      }

      console.info(`Displaying ${type === 'consensus' ? 'consensus' : type === 'selected' ? 'selected sequence' : 'reference genome ' + accession}`);
    } catch (e) {
      console.warn('Failed to select displayed reference:', e);
    }
  }

  // Expose functions globally for use by other parts of the application
  try {
    window.updateReferenceDropdown = updateReferenceDropdown;
    window.selectDisplayedReference = selectDisplayedReference;
  } catch (_) { }

  // Apply constant mask button
  const applyConstantMaskBtn = document.getElementById('apply-constant-mask-btn');
  if (applyConstantMaskBtn) {
    applyConstantMaskBtn.addEventListener('click', () => {
      try {
        if (!viewer || !viewer.alignment) {
          console.error('Viewer not available');
          return;
        }

        const cm = viewer.alignment.computeConstantMask();
        if (!cm) {
          console.warn('computeConstantMask returned no mask');
          return;
        }

        // Get current mask from viewer
        let currentMask = viewer.maskStr || (typeof window.mask !== 'undefined' ? String(window.mask) : null);
        if (!currentMask || currentMask.length < cm.length) {
          currentMask = '1'.repeat(cm.length);
        }

        // AND the new mask with the current mask (collapse if either says to collapse)
        const newMask = andMasks(currentMask, String(cm));

        // Update the mask in viewer and window
        try {
          window.mask = newMask;
          window.maskStr = newMask;
          viewer.maskStr = newMask;
        } catch (_) { }

        console.info('apply-constant-mask: applied with AND (length=' + newMask.length + ')');

        // Trigger the mask transition with current maskEnabled state
        if (typeof viewer.startMaskTransition === 'function') {
          viewer.startMaskTransition(!!viewer.maskEnabled);
        }
      } catch (e) { console.warn('apply-constant-mask failed', e); }
    });
  }

  // Colour all sites button
  if (colourAllBtn) {
    colourAllBtn.addEventListener('click', () => {
      refModeEnabled = false;
      try { window.refModeEnabled = false; } catch (_) { }
      if (viewer) { try { viewer.refModeEnabled = false; } catch (_) { } }
      console.info('Colour mode: all sites');
      viewer.scheduleRender();
    });
  }

  // Colour differences only button
  if (colourDiffBtn) {
    colourDiffBtn.addEventListener('click', () => {
      // Check if a reference is set, if not, set consensus as reference
      const hasReference = !!(window && window.reference);
      if (!hasReference) {
        console.info('No reference set, using consensus');
        const cons = (window && window.consensusSequence) ? window.consensusSequence : (viewer && viewer.alignment ? viewer.alignment.computeConsensusSequence() : null);
        if (cons) {
          try { window.reference = String(cons); } catch (_) { reference = String(cons); }
        } else {
          console.warn('No consensus available to set as reference');
        }
      }

      refModeEnabled = true;
      try { window.refModeEnabled = true; } catch (_) { }
      if (viewer) { try { viewer.refModeEnabled = true; } catch (_) { } }
      console.info('Colour mode: differences only');
      viewer.scheduleRender();
    });
  }

  // Nucleotide color scheme buttons
  const nucleotideColorSchemeBtns = document.querySelectorAll('.nucleotide-color-scheme-btn');
  nucleotideColorSchemeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const scheme = btn.getAttribute('data-scheme');
      if (viewer && typeof viewer.setNucleotideColorScheme === 'function') {
        viewer.setNucleotideColorScheme(scheme);
        console.info(`Nucleotide color scheme changed to: ${scheme}`);
      }
    });
  });

  // Amino acid color scheme buttons
  const aminoAcidColorSchemeBtns = document.querySelectorAll('.amino-acid-color-scheme-btn');
  aminoAcidColorSchemeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const scheme = btn.getAttribute('data-scheme');
      if (viewer && typeof viewer.setAminoAcidColorScheme === 'function') {
        viewer.setAminoAcidColorScheme(scheme);
        console.info(`Amino acid color scheme changed to: ${scheme}`);
      }
    });
  });

  // Plot strip type controls
  document.querySelectorAll('.plot-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!viewer) return;
      const type = btn.getAttribute('data-plot-type');
      if (type && typeof viewer.setPlotType === 'function') {
        viewer.setPlotType(type);
        // Update active-state check marks
        document.querySelectorAll('.plot-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  const hidePlotBtn = document.getElementById('hide-plot-btn');
  if (hidePlotBtn) {
    hidePlotBtn.addEventListener('click', () => {
      if (!viewer || !viewer.plotCanvas) return;
      const canvas = viewer.plotCanvas;
      const labelsPlotDiv = document.getElementById('labels-plot-div');
      const hidden = canvas.style.display === 'none';
      canvas.style.display = hidden ? '' : 'none';
      if (labelsPlotDiv) labelsPlotDiv.style.display = hidden ? '' : 'none';
      hidePlotBtn.classList.toggle('active', !hidden);
      const icon = hidePlotBtn.querySelector('i');
      if (icon) {
        icon.className = hidden ? 'bi bi-eye-slash' : 'bi bi-eye';
      }
      const label = hidePlotBtn.querySelector('span');
      if (label) label.textContent = hidden ? 'Hide plot' : 'Show plot';
      viewer.setCanvasCSSSizes();
      viewer.resizeBackings();
      viewer.scheduleRender();
    });
  }

  // Overview layer controls
  document.querySelectorAll('.overview-layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!viewer || !viewer._overviewRenderer) return;
      const layer = btn.getAttribute('data-layer');
      if (!layer) return;
      const nowEnabled = !viewer._overviewRenderer.isLayerEnabled(layer);
      viewer._overviewRenderer.setLayerEnabled(layer, nowEnabled);
      btn.classList.toggle('active', nowEnabled);
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-check2-square', nowEnabled);
        icon.classList.toggle('bi-square',        !nowEnabled);
      }
    });
  });

  const hideOverviewBtn = document.getElementById('hide-overview-btn');
  if (hideOverviewBtn) {
    hideOverviewBtn.addEventListener('click', () => {
      if (!viewer || !viewer.overviewCanvas) return;
      const canvas = viewer.overviewCanvas;
      const hidden = canvas.style.display === 'none';
      canvas.style.display = hidden ? '' : 'none';
      hideOverviewBtn.classList.toggle('active', !hidden);
      const icon = hideOverviewBtn.querySelector('i');
      if (icon) {
        icon.className = hidden ? 'bi bi-eye-slash' : 'bi bi-eye';
      }
      const label = hideOverviewBtn.querySelector('span');
      if (label) label.textContent = hidden ? 'Hide overview' : 'Show overview';
      viewer.setCanvasCSSSizes();
      viewer.resizeBackings();
      viewer.scheduleRender();
    });
  }

  // Show mode controls
  const nucleotideModeBtn = document.getElementById('nucleotide-mode-btn');
  if (nucleotideModeBtn) {
    nucleotideModeBtn.addEventListener('click', () => {
      if (!viewer) return;
      // Don't allow switching to nucleotide mode for amino acid alignments
      if (viewer.dataType === 'aminoacid') {
        console.info('Cannot switch to nucleotide mode for amino acid alignments');
        return;
      }
      viewer.displayMode = 'native';
      viewer.cancelRender();
      viewer.scheduleRender();
      console.info('Switched to native nucleotide mode');
    });
  }

  const aminoAcidModeBtn = document.getElementById('amino-acid-mode-btn');
  if (aminoAcidModeBtn) {
    aminoAcidModeBtn.addEventListener('click', () => {
      if (!viewer) return;
      
      // For native amino acid alignments, already in native mode - no action needed
      if (viewer.dataType === 'aminoacid') {
        console.info('Already displaying native amino acids - no action needed');
        return;
      }
      
      // For nucleotide alignments, switch to translate mode
      viewer.displayMode = 'translate';
      viewer.cancelRender();
      viewer.scheduleRender();
      console.info(`Switched to translate mode, reading frame ${viewer.readingFrame}`);
    });
  }

  const codonModeBtn = document.getElementById('codon-mode-btn');
  if (codonModeBtn) {
    codonModeBtn.addEventListener('click', () => {
      if (!viewer) return;
      // Don't allow switching to codon mode for amino acid alignments
      if (viewer.dataType === 'aminoacid') {
        console.info('Cannot switch to codon mode for amino acid alignments');
        return;
      }
      viewer.displayMode = 'codon';
      viewer.cancelRender();
      viewer.scheduleRender();
      console.info(`Switched to codon mode, reading frame ${viewer.readingFrame}`);
    });
  }

  // Function to update reading frame UI
  function updateReadingFrameUI() {
    if (!viewer) return;
    const readingFrameSelectors = document.querySelectorAll('.reading-frame-selector');
    readingFrameSelectors.forEach(btn => {
      const frame = parseInt(btn.getAttribute('data-frame'), 10);
      const icon = btn.querySelector('i');
      if (frame === viewer.readingFrame) {
        icon.className = 'bi bi-check-circle-fill';
      } else {
        icon.className = `bi bi-${frame}-circle`;
      }
    });
  }

  // Reading frame selector
  const readingFrameSelectors = document.querySelectorAll('.reading-frame-selector');
  readingFrameSelectors.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!viewer) return;
      // Don't allow reading frame changes for amino acid alignments
      if (viewer && viewer.dataType === 'aminoacid') {
        console.info('Cannot change reading frame for amino acid alignments');
        return;
      }
      const frame = parseInt(btn.getAttribute('data-frame'), 10);
      if (frame >= 1 && frame <= 3) {
        viewer.readingFrame = frame;
        updateReadingFrameUI();
        viewer.cancelRender();
        viewer.scheduleRender();
        const mode = viewer.displayMode || 'native';
        console.info(`Set reading frame ${frame} (${mode} mode)`);
      }
    });
  });
  
  // Initialize reading frame UI
  updateReadingFrameUI();

  // Keyboard shortcuts for mode switching
  document.addEventListener('keydown', (e) => {
    if (!viewer) return;
    
    // Check for Command key (Mac) or Ctrl key (Windows/Linux)
    if (!e.metaKey && !e.ctrlKey) return;
    
    // Command/Ctrl + \ to cycle through native → codon → translate modes
    if (e.key === '\\') {
      e.preventDefault();
      
      // Don't allow mode switching for amino acid alignments
      if (viewer && viewer.dataType === 'aminoacid') {
        console.info('Mode switching disabled for amino acid alignments');
        return;
      }
      
      const currentMode = viewer.displayMode || 'native';
      
      if (currentMode === 'native') {
        // Switch to codon mode
        viewer.displayMode = 'codon';
        console.info(`Switched to codon mode, reading frame ${viewer.readingFrame}`);
      } else if (currentMode === 'codon') {
        // Switch to translate mode
        viewer.displayMode = 'translate';
        console.info(`Switched to translate mode, reading frame ${viewer.readingFrame}`);
      } else {
        // Switch back to native mode
        viewer.displayMode = 'native';
        console.info('Switched to native mode');
      }
      
      viewer.cancelRender();
      viewer.scheduleRender();
      return;
    }
    
    // Command/Ctrl + ] to shift up a reading frame (1→2→3→1)
    if (e.key === ']') {
      e.preventDefault();
      
      // Don't allow reading frame changes for amino acid alignments
      if (viewer && viewer.dataType === 'aminoacid') {
        console.info('Reading frame changes disabled for amino acid alignments');
        return;
      }
      
      viewer.readingFrame = (viewer.readingFrame % 3) + 1;
      updateReadingFrameUI();
      viewer.cancelRender();
      viewer.scheduleRender();
      const mode = viewer.displayMode || 'native';
      console.info(`Shifted to reading frame ${viewer.readingFrame} (${mode} mode)`);
      return;
    }
    
    // Command/Ctrl + [ to shift down a reading frame (3→2→1→3)
    if (e.key === '[') {
      e.preventDefault();
      
      // Don't allow reading frame changes for amino acid alignments
      if (viewer && viewer.dataType === 'aminoacid') {
        console.info('Reading frame changes disabled for amino acid alignments');
        return;
      }
      
      viewer.readingFrame = viewer.readingFrame === 1 ? 3 : viewer.readingFrame - 1;
      updateReadingFrameUI();
      viewer.cancelRender();
      viewer.scheduleRender();
      const mode = viewer.displayMode || 'native';
      console.info(`Shifted to reading frame ${viewer.readingFrame} (${mode} mode)`);
      return;
    }
  });

  // Sort by original order button
  const sortOriginalBtn = document.getElementById('sort-original-btn');
  if (sortOriginalBtn) {
    sortOriginalBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      viewer.alignment.orderByOriginalIndex();
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by label button
  const sortLabelBtn = document.getElementById('sort-label-btn');
  if (sortLabelBtn) {
    sortLabelBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      viewer.alignment.orderByLabel();
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by selected column button
  const sortColumnBtn = document.getElementById('sort-column-btn');
  if (sortColumnBtn) {
    sortColumnBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      // Get selected columns
      let selectedCols = viewer.getSelectedCols();

      // Convert Set to Array
      selectedCols = Array.from(selectedCols);

      if (selectedCols.length === 0) {
        alert('No column selected. Please select a column first by clicking on a column in the alignment.');
        return;
      }

      // Use the first selected column for sorting
      const siteIndex = selectedCols[0];

      viewer.alignment.orderBySite(siteIndex, false, {
        aminoAcidMode: viewer.aminoAcidMode || false,
        readingFrame: viewer.readingFrame || 1
      });
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by label (reverse) button
  const sortLabelReverseBtn = document.getElementById('sort-label-reverse-btn');
  if (sortLabelReverseBtn) {
    sortLabelReverseBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      viewer.alignment.orderByLabel(true);
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by selected column (reverse) button
  const sortColumnReverseBtn = document.getElementById('sort-column-reverse-btn');
  if (sortColumnReverseBtn) {
    sortColumnBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      // Get selected columns
      let selectedCols = viewer.getSelectedCols();

      // Convert Set to Array
      selectedCols = Array.from(selectedCols);

      if (selectedCols.length === 0) {
        alert('No column selected. Please select a column first by clicking on a column in the alignment.');
        return;
      }

      // Use the first selected column for sorting
      const siteIndex = selectedCols[0];

      alignment.orderBySite(siteIndex, true, {
        aminoAcidMode: viewer.aminoAcidMode || false,
        readingFrame: viewer.readingFrame || 1
      });
      viewer.alignment = alignment;
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by start position button
  const sortStartPosBtn = document.getElementById('sort-start-pos-btn');
  if (sortStartPosBtn) {
    sortStartPosBtn.addEventListener('click', () => {
      alignment.orderByStartPos();
      viewer.alignment = alignment;
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by start position (reverse) button
  const sortStartPosReverseBtn = document.getElementById('sort-start-pos-reverse-btn');
  if (sortStartPosReverseBtn) {
    sortStartPosReverseBtn.addEventListener('click', () => {
      alignment.orderByStartPos(true);
      viewer.alignment = alignment;
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by sequence length button
  const sortSeqLengthBtn = document.getElementById('sort-seq-length-btn');
  if (sortSeqLengthBtn) {
    sortSeqLengthBtn.addEventListener('click', () => {
      alignment.orderBySeqLength();
      viewer.alignment = alignment;
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by sequence length (reverse) button
  const sortSeqLengthReverseBtn = document.getElementById('sort-seq-length-reverse-btn');
  if (sortSeqLengthReverseBtn) {
    sortSeqLengthReverseBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      viewer.alignment.orderBySeqLength(true);
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Sort by tags button
  const sortTagBtn = document.getElementById('sort-tag-btn');
  if (sortTagBtn) {
    sortTagBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      if (!viewer.labelTags || viewer.labelTags.size === 0) {
        console.info('No tags to sort by');
        return;
      }
      viewer.alignment.orderByTag(viewer.labelTags);
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }

  // Fix current order button
  const fixOrderBtn = document.getElementById('fix-order-btn');
  if (fixOrderBtn) {
    fixOrderBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      viewer.alignment.fixCurrentOrder();
      viewer.cancelRender();
      viewer.scheduleRender();
    });
  }



  // Wire up the new apply buttons
  const applyConstantAmbiguousBtn = document.getElementById('apply-constant-ambiguous-btn');
  if (applyConstantAmbiguousBtn) {
    applyConstantAmbiguousBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      const isAA = viewer.isNativeAminoAcid || false;
      const cm = viewer.alignment.computeConstantMaskAllowN(isAA);
      if (!cm) {
        console.warn('computeConstantMaskAllowN returned no mask');
        return;
      }

      // Get current mask from viewer
      let currentMask = viewer.maskStr || (typeof window.mask !== 'undefined' ? String(window.mask) : null);
      if (!currentMask || currentMask.length < cm.length) {
        currentMask = '1'.repeat(cm.length);
      }

      // AND the new mask with the current mask (collapse if either says to collapse)
      const newMask = andMasks(currentMask, String(cm));

      // Update the mask in viewer and window
      try {
        window.mask = newMask;
        window.maskStr = newMask;
        viewer.maskStr = newMask;
      } catch (_) { }

      console.info('apply-constant-ambiguous: applied with AND (length=' + newMask.length + ')');

      // Trigger the mask transition with current maskEnabled state
      viewer.startMaskTransition(!!viewer.maskEnabled);
    });
  }

  const applyConstantGappedBtn = document.getElementById('apply-constant-gapped-btn');
  if (applyConstantGappedBtn) {
    applyConstantGappedBtn.addEventListener('click', () => {
      if (!viewer || !viewer.alignment) return;
      const isAA = viewer.isNativeAminoAcid || false;
      const cm = viewer.alignment.computeConstantMaskAllowNAndGaps(isAA);
      if (!cm) {
        console.warn('computeConstantMaskAllowNAndGaps returned no mask');
        return;
      }

      // Get current mask from viewer
      let currentMask = viewer.maskStr || (typeof window.mask !== 'undefined' ? String(window.mask) : null);
      if (!currentMask || currentMask.length < cm.length) {
        currentMask = '1'.repeat(cm.length);
      }

      // AND the new mask with the current mask (collapse if either says to collapse)
      const newMask = andMasks(currentMask, String(cm));

      // Update the mask in viewer and window
      try {
        window.mask = newMask;
        window.maskStr = newMask;
        viewer.maskStr = newMask;
      } catch (_) { }

      console.info('apply-constant-gapped: applied with AND (length=' + newMask.length + ')');

      // Trigger the mask transition with current maskEnabled state
      viewer.startMaskTransition(!!viewer.maskEnabled);
    });
  }

  // Wire up expand all button
  const expandAllBtn = document.getElementById('expand-all-btn');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      console.info('Expand all button clicked');

      // Create a set of all column indices
      const seqLen = viewer.maxSeqLen || (rows && rows[0] && rows[0].sequence ? rows[0].sequence.length : 0);
      const allCols = new Set();
      for (let i = 0; i < seqLen; i++) {
        allCols.add(i);
      }

      // Use setMaskBitsForCols to expand all columns
      viewer.setMaskBitsForCols(allCols, '1');
      console.info('expand-all: expanded all ' + seqLen + ' sites');
    });
  }

  // Wire up collapse all button
  const collapseAllBtn = document.getElementById('collapse-all-btn');
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      console.info('Collapse all button clicked');

      // Create a set of all column indices
      const seqLen = viewer.maxSeqLen || (rows && rows[0] && rows[0].sequence ? rows[0].sequence.length : 0);
      const allCols = new Set();
      for (let i = 0; i < seqLen; i++) {
        allCols.add(i);
      }

      // Use setMaskBitsForCols to collapse all columns
      viewer.setMaskBitsForCols(allCols, '0');
      console.info('collapse-all: collapsed all ' + seqLen + ' sites');
    });
  }

  // Font size controls: increase/decrease text (labels and nucleotides)
  const fontIncreaseBtn = document.getElementById('font-increase-btn');
  const fontDecreaseBtn = document.getElementById('font-decrease-btn');
  console.info('Font buttons found:', { increase: !!fontIncreaseBtn, decrease: !!fontDecreaseBtn });

  if (fontIncreaseBtn) {
    fontIncreaseBtn.addEventListener('click', () => {
      console.info('Increase button clicked');
      viewer.updateFontSize(1);
    });
  }
  if (fontDecreaseBtn) {
    fontDecreaseBtn.addEventListener('click', () => {
      console.info('Decrease button clicked');
      viewer.updateFontSize(-1);
    });
  }

  // Dark mode toggle (status bar #btn-theme from pearcore)
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const v = window.viewer || viewer;
      if (v && typeof v.toggleDarkMode === 'function') {
        v.toggleDarkMode();
        const icon = btnTheme.querySelector('i');
        if (icon) icon.className = v.darkMode ? 'bi bi-sun' : 'bi bi-moon-stars';
        try { localStorage.setItem('sealion_dark_mode', v.darkMode); } catch (_) {}
      }
    });
  }

  // Tag controls: tag selected labels with colors
  const tagColorBtns = document.querySelectorAll('.tag-color-btn');
  const clearSelectedTagsBtn = document.getElementById('clear-selected-tags-btn');
  const clearAllTagsBtn = document.getElementById('clear-all-tags-btn');
  console.info('Tag buttons found:', { 
    colorButtons: tagColorBtns.length, 
    clearSelected: !!clearSelectedTagsBtn, 
    clearAll: !!clearAllTagsBtn 
  });

  if (tagColorBtns.length > 0) {
    tagColorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tagIndex = parseInt(btn.getAttribute('data-tag-index'), 10);
        console.info(`Tag color ${tagIndex} clicked`);
        if (viewer && typeof viewer.tagSelectedLabels === 'function') {
          viewer.tagSelectedLabels(tagIndex);
        }
      });
    });
  }

  if (clearSelectedTagsBtn) {
    clearSelectedTagsBtn.addEventListener('click', () => {
      console.info('Clear selected tags clicked');
      if (viewer && typeof viewer.clearSelectedTags === 'function') {
        viewer.clearSelectedTags();
      }
    });
  }

  if (clearAllTagsBtn) {
    clearAllTagsBtn.addEventListener('click', () => {
      console.info('Clear all tags clicked');
      if (viewer && typeof viewer.clearAllTags === 'function') {
        viewer.clearAllTags();
      }
    });
  }

  // Bookmark controls: bookmark selected columns with colors
  const bookmarkColorBtns = document.querySelectorAll('.bookmark-color-btn');
  const clearSelectedBookmarksBtn = document.getElementById('clear-selected-bookmarks-btn');
  const clearAllBookmarksBtn = document.getElementById('clear-all-bookmarks-btn');
  console.info('Bookmark buttons found:', { 
    colorButtons: bookmarkColorBtns.length, 
    clearSelected: !!clearSelectedBookmarksBtn, 
    clearAll: !!clearAllBookmarksBtn 
  });

  if (bookmarkColorBtns.length > 0) {
    bookmarkColorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bookmarkIndex = parseInt(btn.getAttribute('data-bookmark-index'), 10);
        console.info(`Bookmark color ${bookmarkIndex} clicked`);
        if (viewer && typeof viewer.bookmarkSelectedColumns === 'function') {
          viewer.bookmarkSelectedColumns(bookmarkIndex);
        }
      });
    });
  }

  if (clearSelectedBookmarksBtn) {
    clearSelectedBookmarksBtn.addEventListener('click', () => {
      console.info('Clear selected bookmarks clicked');
      if (viewer && typeof viewer.clearSelectedBookmarks === 'function') {
        viewer.clearSelectedBookmarks();
      }
    });
  }

  if (clearAllBookmarksBtn) {
    clearAllBookmarksBtn.addEventListener('click', () => {
      console.info('Clear all bookmarks clicked');
      if (viewer && typeof viewer.clearAllBookmarks === 'function') {
        viewer.clearAllBookmarks();
      }
    });
  }

  // Reset tag names button
  const resetTagNamesBtn = document.getElementById('reset-tag-names-btn');
  if (resetTagNamesBtn) {
    resetTagNamesBtn.addEventListener('click', () => {
      console.info('Reset tag names clicked');
      const v = window.viewer || viewer;
      if (v && typeof v.resetTagNames === 'function') {
        v.resetTagNames();
        // Update UI with default names
        updateTagAndBookmarkNames();
      }
    });
  }

  // Reset bookmark names button
  const resetBookmarkNamesBtn = document.getElementById('reset-bookmark-names-btn');
  if (resetBookmarkNamesBtn) {
    resetBookmarkNamesBtn.addEventListener('click', () => {
      console.info('Reset bookmark names clicked');
      const v = window.viewer || viewer;
      if (v && typeof v.resetBookmarkNames === 'function') {
        v.resetBookmarkNames();
        // Update UI with default names
        updateTagAndBookmarkNames();
      }
    });
  }

  // Function to update tag and bookmark names in UI
  function updateTagAndBookmarkNames() {
    if (!viewer) return;
    
    // Update tag names
    const tagNameSpans = document.querySelectorAll('.tag-name-edit');
    tagNameSpans.forEach((span, index) => {
      if (viewer.TAG_NAMES && viewer.TAG_NAMES[index]) {
        span.textContent = viewer.TAG_NAMES[index];
      }
    });
    
    // Update bookmark names
    const bookmarkNameSpans = document.querySelectorAll('.bookmark-name-edit');
    bookmarkNameSpans.forEach((span, index) => {
      if (viewer.BOOKMARK_NAMES && viewer.BOOKMARK_NAMES[index]) {
        span.textContent = viewer.BOOKMARK_NAMES[index];
      }
    });
  }

  // Handle editing of tag names
  const tagNameSpans = document.querySelectorAll('.tag-name-edit');
  tagNameSpans.forEach((span, index) => {
    // Prevent button click when editing
    span.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Save on blur
    span.addEventListener('blur', () => {
      const newName = span.textContent.trim();
      if (newName && viewer && typeof viewer.updateTagName === 'function') {
        viewer.updateTagName(index, newName);
      }
    });
    
    // Save on Enter key
    span.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        span.blur();
      }
    });
  });

  // Handle editing of bookmark names
  const bookmarkNameSpans = document.querySelectorAll('.bookmark-name-edit');
  bookmarkNameSpans.forEach((span, index) => {
    // Prevent button click when editing
    span.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Save on blur
    span.addEventListener('blur', () => {
      const newName = span.textContent.trim();
      if (newName && viewer && typeof viewer.updateBookmarkName === 'function') {
        viewer.updateBookmarkName(index, newName);
      }
    });
    
    // Save on Enter key
    span.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        span.blur();
      }
    });
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    // Cmd+0 (or Ctrl+0) to reset font size
    if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      console.info('Reset font size shortcut triggered (Cmd+0)');
      viewer.resetFontSize();
    }
    // Cmd+F (or Ctrl+F) to open the sequence search modal
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      openSearchModal();
      return;
    }
    // Cmd+G (or Ctrl+G) to find next match; open search modal if no active search
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'g') {
      e.preventDefault();
      if (viewer && viewer.searchMatches && viewer.searchMatches.length > 0) {
        viewer.nextMatch();
      } else {
        openSearchModal();
      }
      return;
    }
    // Shift+Cmd+G (or Shift+Ctrl+G) to find previous match
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'g') {
      e.preventDefault();
      if (viewer && viewer.searchMatches && viewer.searchMatches.length > 0) {
        viewer.previousMatch();
      } else {
        openSearchModal();
      }
      return;
    }
    // Cmd+D (or Ctrl+D) to toggle colour differences mode
    if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      try {
        // Toggle refModeEnabled
        refModeEnabled = !refModeEnabled;
        try { window.refModeEnabled = refModeEnabled; } catch (_) { }
        if (viewer) { 
          try { viewer.refModeEnabled = refModeEnabled; } catch (_) { }
          try { viewer.invalidateOverviewCache(); } catch (_) { }
        }
        
        // If enabling and no reference is set, set consensus as reference
        if (refModeEnabled) {
          const hasReference = !!(window && window.reference);
          if (!hasReference) {
            console.info('No reference set, using consensus');
            const cons = (window && window.consensusSequence) ? window.consensusSequence : (viewer && viewer.alignment ? viewer.alignment.computeConsensusSequence() : null);
            if (cons) {
              try { window.reference = String(cons); } catch (_) { }
              
            }
          }
          console.info('Colour differences mode: ON');
        } else {
          console.info('Colour differences mode: OFF (colour all sites)');
        }
        
        if (viewer && typeof viewer.scheduleRender === 'function') {
          viewer.scheduleRender();
        }
      } catch (err) { console.warn('Cmd+D failed', err); }
    }
    // Cmd+H (or Ctrl+H) to toggle hide mode
    if ((e.metaKey || e.ctrlKey) && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      try {
        if (!viewer) return;
        if (typeof viewer.toggleHideMode === 'function') {
          viewer.toggleHideMode();
        }
      } catch (err) { console.warn('Cmd+H failed', err); }
    }
    // Shift+Cmd+C (or Shift+Ctrl+C) to copy just the labels
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      const activeElement = document.activeElement;
      const isFilterBox = activeElement && activeElement.id === 'label-filter-box';
      const isTextInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.isContentEditable
      );
      
      // Check if text is selected in the filter box
      let filterBoxTextSelected = false;
      if (isFilterBox && activeElement.selectionStart !== undefined && activeElement.selectionEnd !== undefined) {
        filterBoxTextSelected = activeElement.selectionStart !== activeElement.selectionEnd;
      }
      
      if ((!isTextInput || (isFilterBox && !filterBoxTextSelected)) && viewer && viewer.alignment) {
        e.preventDefault();
        
        try {
          const selectedRows = viewer.getSelectedRows ? viewer.getSelectedRows() : new Set();
          
          // If no rows selected, use all sequences
          const rowIndices = selectedRows.size > 0 
            ? Array.from(selectedRows).sort((a, b) => a - b)
            : Array.from({ length: viewer.alignment.length }, (_, i) => i);
          
          if (rowIndices.length === 0) {
            console.info('No sequences available');
            return;
          }
          
          // Build label text (one per line)
          const labelText = rowIndices.map(rowIdx => {
            const seq = viewer.alignment[rowIdx];
            return seq ? (seq.label || seq.name || `sequence_${rowIdx}`) : '';
          }).join('\n');
          
          // Copy to clipboard
          navigator.clipboard.writeText(labelText).then(() => {
            console.info(`Copied ${rowIndices.length} label(s) to clipboard`);
          }).catch(err => {
            console.error('Failed to copy labels to clipboard:', err);
            // Fallback: try using execCommand
            const textArea = document.createElement('textarea');
            textArea.value = labelText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand('copy');
              console.info(`Copied ${rowIndices.length} label(s) to clipboard (fallback method)`);
            } catch (fallbackErr) {
              console.error('Fallback copy also failed:', fallbackErr);
            }
            document.body.removeChild(textArea);
          });
        } catch (err) {
          console.error('Shift+Cmd+C copy labels failed:', err);
        }
      }
    }
    // Cmd+C (or Ctrl+C) to copy selection as FASTA
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      // Only handle if we're not in a text input field, UNLESS it's the filter box
      // and the filter box text itself is not selected
      const activeElement = document.activeElement;
      const isFilterBox = activeElement && activeElement.id === 'label-filter-box';
      const isTextInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.isContentEditable
      );
      
      // Check if text is selected in the filter box
      let filterBoxTextSelected = false;
      if (isFilterBox && activeElement.selectionStart !== undefined && activeElement.selectionEnd !== undefined) {
        filterBoxTextSelected = activeElement.selectionStart !== activeElement.selectionEnd;
      }
      
      // Allow copy when:
      // - Not in a text input, OR
      // - In filter box but no text is selected (so copy sequences instead)
      if ((!isTextInput || (isFilterBox && !filterBoxTextSelected)) && viewer && viewer.alignment) {
        e.preventDefault();
        
        try {
          const selectedRows = viewer.getSelectedRows ? viewer.getSelectedRows() : new Set();
          const selectedCols = viewer.getSelectedCols ? viewer.getSelectedCols() : new Set();
          
          // If only columns are selected (no rows), use all sequences
          const rowIndices = selectedRows.size > 0 
            ? Array.from(selectedRows).sort((a, b) => a - b)
            : Array.from({ length: viewer.alignment.length }, (_, i) => i);
          
          if (rowIndices.length === 0) {
            console.info('No sequences available');
            return;
          }
          
          // Get sorted column indices if any are selected
          const colIndices = selectedCols.size > 0 
            ? Array.from(selectedCols).sort((a, b) => a - b)
            : null;
          
          // Build FASTA text
          let fastaText = '';
          for (const rowIdx of rowIndices) {
            const seq = viewer.alignment[rowIdx];
            if (!seq) continue;
            
            // Get label
            const label = seq.label || seq.name || `sequence_${rowIdx}`;
            fastaText += `>${label}\n`;
            
            // Get sequence - either selected columns or full sequence
            let sequence;
            if (colIndices && colIndices.length > 0) {
              // Extract only selected columns
              sequence = colIndices.map(colIdx => {
                return (seq.sequence && seq.sequence[colIdx]) ? seq.sequence[colIdx] : '';
              }).join('');
            } else {
              // Use full sequence
              sequence = seq.sequence || '';
            }
            
            // Add sequence as single line (no wrapping)
            fastaText += sequence + '\n';
          }
          
          // Copy to clipboard
          navigator.clipboard.writeText(fastaText).then(() => {
            const rowCount = rowIndices.length;
            const colCount = colIndices ? colIndices.length : (viewer.alignment[0]?.sequence?.length || 0);
            console.info(`Copied ${rowCount} sequence(s) with ${colCount} position(s) to clipboard as FASTA`);
          }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            // Fallback: try using execCommand
            const textArea = document.createElement('textarea');
            textArea.value = fastaText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand('copy');
              console.info(`Copied ${rowIndices.length} sequence(s) to clipboard as FASTA (fallback method)`);
            } catch (fallbackErr) {
              console.error('Fallback copy also failed:', fallbackErr);
            }
            document.body.removeChild(textArea);
          });
        } catch (err) {
          console.error('Cmd+C copy failed:', err);
        }
      }
    }
    // Cmd+> (or Ctrl+>) to jump to next difference
    if ((e.metaKey || e.ctrlKey) && (e.key === '>' || e.key === '.')) {
      e.preventDefault();
      try {
        if (!viewer || !viewer.alignment) return;
        const refStr = (window && window.reference) ? String(window.reference) : null;
        if (!refStr) {
          console.warn('No reference set for jump to next difference');
          return;
        }
        if (typeof viewer.jumpToNextDifference === 'function') {
          viewer.jumpToNextDifference(refStr);
        }
      } catch (err) { console.warn('Cmd+> failed', err); }
    }
    // Cmd+< (or Ctrl+<) to jump to previous difference
    if ((e.metaKey || e.ctrlKey) && (e.key === '<' || e.key === ',')) {
      e.preventDefault();
      try {
        if (!viewer || !viewer.alignment) return;
        const refStr = (window && window.reference) ? String(window.reference) : null;
        if (!refStr) {
          console.warn('No reference set for jump to previous difference');
          return;
        }
        if (typeof viewer.jumpToPreviousDifference === 'function') {
          viewer.jumpToPreviousDifference(refStr);
        }
      } catch (err) { console.warn('Cmd+< failed', err); }
    }
    // Shift+Left to scroll to leftmost extent
    if (e.shiftKey && e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      try {
        if (viewer && viewer.scroller) {
          viewer.scroller.scrollLeft = 0;
          console.info('Scrolled to left extent');
        }
      } catch (err) { console.warn('Shift+Left failed', err); }
    }
    // Shift+Right to scroll to rightmost extent
    if (e.shiftKey && e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      try {
        if (viewer && viewer.scroller && viewer.colOffsets) {
          const totalWidth = viewer.colOffsets[viewer.colOffsets.length - 1] || 0;
          const maxScrollLeft = Math.max(0, totalWidth - viewer.scroller.clientWidth);
          viewer.scroller.scrollLeft = maxScrollLeft;
          console.info('Scrolled to right extent');
        }
      } catch (err) { console.warn('Shift+Right failed', err); }
    }
    // Shift+Up to scroll to top extent
    if (e.shiftKey && e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      try {
        if (viewer && viewer.scroller) {
          viewer.scroller.scrollTop = 0;
          console.info('Scrolled to top extent');
        }
      } catch (err) { console.warn('Shift+Up failed', err); }
    }
    // Shift+Down to scroll to bottom extent
    if (e.shiftKey && e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      try {
        if (viewer && viewer.scroller && viewer.alignment) {
          const ROW_HEIGHT = viewer.ROW_HEIGHT || (window && window.ROW_HEIGHT) || 20;
          const totalHeight = viewer.alignment.length * ROW_HEIGHT;
          const maxScrollTop = Math.max(0, totalHeight - viewer.scroller.clientHeight);
          viewer.scroller.scrollTop = maxScrollTop;
          console.info('Scrolled to bottom extent');
        }
      } catch (err) { console.warn('Shift+Down failed', err); }
    }
  });

  // Column collapse/expand controls
  const collapseColumnsBtn = document.getElementById('collapse-columns-btn');
  const expandColumnsBtn = document.getElementById('expand-columns-btn');
  const toggleHideModeBtn = document.getElementById('toggle-hide-mode-btn');
  console.info('Column buttons found:', { collapse: !!collapseColumnsBtn, expand: !!expandColumnsBtn, toggleHide: !!toggleHideModeBtn });

  if (collapseColumnsBtn) {
    collapseColumnsBtn.addEventListener('click', () => {
      console.info('Collapse columns button clicked');
      viewer.setMaskBitsForCols(viewer.selectedCols || new Set(), '0');
    });
  }

  if (expandColumnsBtn) {
    expandColumnsBtn.addEventListener('click', () => {
      console.info('Expand columns button clicked');
      viewer.setMaskBitsForCols(viewer.selectedCols || new Set(), '1');
    });
  }

  if (toggleHideModeBtn) {
    toggleHideModeBtn.addEventListener('click', () => {
      console.info('Toggle hide mode button clicked');
      if (viewer && typeof viewer.toggleHideMode === 'function') {
        viewer.toggleHideMode();
      }
    });
  }

  // Help / About panels (pearcore slide-out panels)
  initHelpAbout(document, {
    fetchContent: async (filename) => {
      const resp = await fetchWithFallback(filename);
      return resp.text();
    },
    helpFile: 'instructions.md',
    aboutFile: 'about.md',
  });

  // Export button functionality
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        if (!viewer || !viewer.alignment) {
          console.warn('No alignment data to export');
          return;
        }

        const selectedRows = viewer.getSelectedRows ? viewer.getSelectedRows() : new Set();
        const selectedCols = viewer.getSelectedCols ? viewer.getSelectedCols() : new Set();
        
        // If only columns are selected (no rows), use all sequences
        const rowIndices = selectedRows.size > 0 
          ? Array.from(selectedRows).sort((a, b) => a - b)
          : Array.from({ length: viewer.alignment.length }, (_, i) => i);
        
        if (rowIndices.length === 0) {
          console.warn('No sequences to export');
          return;
        }
        
        // Get sorted column indices if any are selected
        const colIndices = selectedCols.size > 0 
          ? Array.from(selectedCols).sort((a, b) => a - b)
          : null;
        
        // Build FASTA text
        let fastaText = '';
        for (const rowIdx of rowIndices) {
          const seq = viewer.alignment[rowIdx];
          if (!seq) continue;
          
          // Get label
          const label = seq.label || seq.name || `sequence_${rowIdx}`;
          fastaText += `>${label}\n`;
          
          // Get sequence - either selected columns or full sequence
          let sequence;
          if (colIndices && colIndices.length > 0) {
            // Extract only selected columns
            sequence = colIndices.map(colIdx => {
              return (seq.sequence && seq.sequence[colIdx]) ? seq.sequence[colIdx] : '';
            }).join('');
          } else {
            // Use full sequence
            sequence = seq.sequence || '';
          }
          
          // Add sequence as single line (no wrapping)
          fastaText += sequence + '\n';
        }
        
        // Use native save handler if provided (e.g. Tauri adapter)
        if (window.sealion && window.sealion._saveHandler) {
          const _ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const _rc  = rowIndices.length;
          const _cc  = colIndices ? colIndices.length : 'all';
          window.sealion._saveHandler({
            content:    fastaText,
            filename:   `alignment_${_rc}seqs_${_cc}sites_${_ts}.fasta`,
            filterName: 'FASTA files',
            extensions: ['fasta', 'fa'],
          });
          return;
        }

        // Create a blob and download it
        const blob = new Blob([fastaText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const rowCount = rowIndices.length;
        const colCount = colIndices ? colIndices.length : 'all';
        a.download = `alignment_${rowCount}seqs_${colCount}sites_${timestamp}.fasta`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const exportColCount = colIndices ? colIndices.length : (viewer.alignment[0]?.sequence?.length || 0);
        console.info(`Exported ${rowCount} sequence(s) with ${exportColCount} position(s) as FASTA file`);
        
      } catch (error) {
        console.error('Export failed:', error);
      }
    });
  }

  // ── FASTA Open File Dialog (pearcore generic dialog) ─────────────────────

  // Function to parse FASTA file
  function parseFasta(text) {
    const sequences = [];
    const lines = text.split('\n');
    let currentLabel = null;
    let currentSequence = '';

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('>')) {
        if (currentLabel !== null) {
          sequences.push({ label: currentLabel, sequence: currentSequence.toUpperCase() });
        }
        currentLabel = line.substring(1).trim();
        currentSequence = '';
      } else if (line.length > 0) {
        currentSequence += line;
      }
    }
    if (currentLabel !== null) {
      sequences.push({ label: currentLabel, sequence: currentSequence.toUpperCase() });
    }
    return sequences;
  }

  // Shared: load parsed FASTA sequences into viewer
  async function loadFastaSequences(sequences, name) {
    if (!sequences || sequences.length === 0) throw new Error('No sequences found in file');
    console.log(`Loaded ${sequences.length} sequences from ${name}`);

    const alignmentInstance = new Alignment(sequences);
    window.alignment = alignmentInstance;

    if (!viewer || typeof viewer.setData !== 'function') throw new Error('Viewer not available');

    // Reset viewer state
    if (viewer.selectedRows?.clear) viewer.selectedRows.clear();
    if (viewer.selectedCols?.clear) viewer.selectedCols.clear();
    if (viewer.labelTags?.clear) viewer.labelTags.clear();
    if (viewer.siteBookmarks?.clear) viewer.siteBookmarks.clear();
    window.refRow = null;

    // Rebuild column offsets
    let newMaxSeqLen = 0;
    for (const s of sequences) {
      if (s?.sequence && s.sequence.length > newMaxSeqLen) newMaxSeqLen = s.sequence.length;
    }
    window.maskStr = '1'.repeat(newMaxSeqLen);

    if (typeof viewer.buildColOffsetsFor === 'function') {
      viewer.colOffsets = viewer.buildColOffsetsFor(viewer.maskEnabled, {
        maxSeqLen: newMaxSeqLen,
        CHAR_WIDTH: viewer.charWidth,
        EXPANDED_RIGHT_PAD: viewer.EXPANDED_RIGHT_PAD || 2,
        REDUCED_COL_WIDTH: viewer.REDUCED_COL_WIDTH || 1,
        HIDDEN_MARKER_WIDTH: viewer.HIDDEN_MARKER_WIDTH || 4,
        hideMode: viewer.hideMode || false,
        maskStr: window.maskStr,
      });
    }
    if (typeof viewer.setCanvasCSSSizes === 'function') viewer.setCanvasCSSSizes();
    if (typeof viewer.resizeBackings === 'function') viewer.resizeBackings();
    if (typeof viewer.invalidateOverviewCache === 'function') viewer.invalidateOverviewCache();

    // Reset scroll
    if (viewer.scroller) { viewer.scroller.scrollTop = 0; viewer.scroller.scrollLeft = 0; }

    console.info('File loaded successfully:', name);
    loadDataIntoViewer(alignmentInstance);
  }

  // Init the FASTA open-file dialog via pearcore
  const fastaDialog = initOpenFileDialog(document, {
    prefix: 'fasta',
    onFile: async (file) => {
      const validExts = ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn'];
      const lc = file.name.toLowerCase();
      if (!validExts.some(ext => lc.endsWith(ext))) {
        fastaDialog.setError('Invalid file type. Please select a FASTA file (.fasta, .fa, .fna, etc.)');
        return;
      }
      fastaDialog.setLoading(true);
      fastaDialog.setError(null);
      try {
        const text = await file.text();
        const seqs = parseFasta(text);
        await loadFastaSequences(seqs, file.name);
        fastaDialog.close();
      } catch (err) {
        fastaDialog.setError(err.message || 'Failed to load file.');
        fastaDialog.setLoading(false);
      }
    },
    onUrl: async (url) => {
      fastaDialog.setLoading(true);
      fastaDialog.setError(null);
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${url}`);
        const text = await resp.text();
        const seqs = parseFasta(text);
        await loadFastaSequences(seqs, url.split('/').pop() || 'alignment');
        fastaDialog.close();
      } catch (err) {
        fastaDialog.setError(err.message || 'Failed to load FASTA from URL');
        fastaDialog.setLoading(false);
      }
    },
  });

  // Build example dataset list in the example tab
  {
    const listEl = document.getElementById('fasta-example-list');
    if (listEl) {
      for (const ds of EXAMPLE_DATASETS) {
        const item = document.createElement('div');
        item.className = 'pt-example-item';
        const desc = document.createElement('div');
        desc.className = 'pt-example-desc';
        desc.innerHTML = `<strong>${ds.title}</strong>${ds.description}`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-success flex-shrink-0';
        btn.innerHTML = '<i class="bi bi-database me-1"></i>Load';
        btn.addEventListener('click', async () => {
          fastaDialog.setLoading(true);
          fastaDialog.setError(null);
          try {
            const resp = await fetchWithFallback(ds.path);
            if (!resp.ok) throw new Error(`Failed to load ${ds.path}`);
            const text = await resp.text();
            const seqs = parseFasta(text);
            await loadFastaSequences(seqs, ds.title);
            fastaDialog.close();

            // Auto-load associated reference genome if specified
            if (ds.reference) {
              try {
                const refResp = await fetchWithFallback(ds.reference);
                if (refResp.ok) {
                  const refText = await refResp.text();
                  const refData = parseGenBankFile(refText);
                  if (refData) {
                    if (!refData.name) refData.name = ds.reference.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
                    addReferenceGenome(refData);
                    console.info('Reference genome loaded:', refData.accession);
                  }
                }
              } catch (refErr) {
                console.warn('Failed to load reference genome:', refErr);
              }
            }
          } catch (err) {
            fastaDialog.setError(err.message || 'Failed to load example data.');
            fastaDialog.setLoading(false);
          }
        });
        item.appendChild(desc);
        item.appendChild(btn);
        listEl.appendChild(item);
      }
    }
  }

  // Open File button → open the pearcore dialog
  const openFileBtn = document.getElementById('open-file-btn');
  if (openFileBtn) {
    openFileBtn.addEventListener('click', () => fastaDialog.open());
  }

  // Cmd-O keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault();
      fastaDialog.open();
    }
  });

  // Expose for Tauri adapter
  window.sealion.loadFastaFromText = async (content, name) => {
    const seqs = parseFasta(content);
    await loadFastaSequences(seqs, name);
  };
  window.sealion.closeModal = () => {
    fastaDialog.close();
    refGenomeDialog.close();
  };
  // Make loadFastaFromUrl accessible outside this block for auto-load
  window.loadFastaFromUrl = async (url) => {
    fastaDialog.open();
    fastaDialog.setLoading(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${url}`);
      const text = await resp.text();
      const seqs = parseFasta(text);
      await loadFastaSequences(seqs, url.split('/').pop() || 'alignment');
      fastaDialog.close();
    } catch (err) {
      fastaDialog.setError(err.message);
      fastaDialog.setLoading(false);
    }
  };

  // ── Reference Genome Dialog (pearcore generic dialog) ──────────────────

  // Shared: validate and add reference genome to alignment
  function addReferenceGenome(referenceGenomeData) {
    if (!referenceGenomeData || typeof referenceGenomeData !== 'object') {
      throw new Error('Invalid reference genome format');
    }
    if (!referenceGenomeData.accession) {
      throw new Error('Reference genome must have an accession field');
    }
    if (referenceGenomeData.sequence && typeof referenceGenomeData.sequence === 'string') {
      referenceGenomeData.sequence = referenceGenomeData.sequence.toUpperCase();
    }
    if (!window.alignment) {
      throw new Error('No alignment loaded. Please load an alignment first.');
    }
    window.alignment.addReferenceGenome(referenceGenomeData);
    console.log(`Reference genome ${referenceGenomeData.accession} added successfully`);

    if (window.updateReferenceDropdown) window.updateReferenceDropdown();
    if (window.selectDisplayedReference) {
      window.selectDisplayedReference('reference', referenceGenomeData.accession);
    }
    if (viewer && viewer.scheduleRender) viewer.scheduleRender();
  }

  // Shared: parse reference genome text (JSON or GenBank)
  function parseReferenceText(text, filename) {
    let data;
    if (filename.endsWith('.json')) {
      data = JSON.parse(text);
    } else if (filename.endsWith('.gb') || filename.endsWith('.gbk') || filename.endsWith('.genbank') || text.trim().startsWith('LOCUS')) {
      data = parseGenBankFile(text);
      if (!data) throw new Error('Failed to parse GenBank file.');
    } else {
      try { data = JSON.parse(text); }
      catch (_) { throw new Error('Unrecognized format. Must be JSON or GenBank.'); }
    }
    const nameWithoutExt = filename.replace(/\.(json|gb|gbk|genbank)$/i, '');
    if (!data.name) data.name = nameWithoutExt;
    return data;
  }

  const refGenomeDialog = initOpenFileDialog(document, {
    prefix: 'refgenome',
    onFile: async (file) => {
      refGenomeDialog.setLoading(true);
      refGenomeDialog.setError(null);
      try {
        const text = await file.text();
        const data = parseReferenceText(text, file.name);
        addReferenceGenome(data);
        refGenomeDialog.close();
      } catch (err) {
        refGenomeDialog.setError(err.message || 'Failed to load reference genome');
        refGenomeDialog.setLoading(false);
      }
    },
    onUrl: async (url) => {
      refGenomeDialog.setLoading(true);
      refGenomeDialog.setError(null);
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${url}`);
        const text = await resp.text();
        const filename = url.split('/').pop() || 'reference';
        const data = parseReferenceText(text, filename);
        addReferenceGenome(data);
        refGenomeDialog.close();
      } catch (err) {
        refGenomeDialog.setError(err.message || 'Failed to load reference genome from URL');
        refGenomeDialog.setLoading(false);
      }
    },
  });

  // Reference button → open the pearcore dialog
  const loadReferenceBtn = document.getElementById('load-reference-btn');
  if (loadReferenceBtn) {
    loadReferenceBtn.addEventListener('click', () => refGenomeDialog.open());
  }

  // Expose for Tauri adapter
  window.sealion.loadReferenceFromText = async (content, name) => {
    const data = parseReferenceText(content, name);
    addReferenceGenome(data);
  };

  // Populate local maskStr
  try { maskStr = '1'.repeat(maxSeqLen || 0); } catch (_) { maskStr = ''; }

  // initial sizing + measure (only if viewer is ready)
  if (viewer) {
    viewer.measureCharWidth(getViewerProp('FONT', ''), { apply: true, maskEnabled: !!maskEnabled });
    viewer.measureRowHeightFromFonts({ apply: true });
    viewer.setCanvasCSSSizes();
  }
  // give the spacer a moment to size (if DOM still settling) then measure real width and backings
  requestAnimationFrame(() => {
    try {
      if (!viewer) return;
      viewer.measureCharWidthFromReal();
      viewer.measureRowHeightFromFonts({ apply: true });
      viewer.setCanvasCSSSizes();
      viewer.measureTextVerticalOffset();
      viewer.scheduleBackingResize();
    } catch (e) {
      console.error('Initialization rAF handler failed', e);
    } finally {
      // initialization complete (successful or not): hide the status overlay if present
      try { setStatus(null); } catch (_) { }
    }
  });

  // reflow handler: when the spacer's width might change (e.g., charset measurement), recompute
  let resizeDebounce;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      if (!viewer) return;
      viewer.measureCharWidthFromReal();
      viewer.setCanvasCSSSizes();
      viewer.measureTextVerticalOffset();
      viewer.scheduleBackingResize();
    }, 50);
  });
  if (scroller) observer.observe(scroller);

  // Snapping and scroll handling are delegated to the SealionViewer instance.

  // on window resize recompute backings
  window.addEventListener('resize', () => {
    if (!viewer) return;
    viewer.setCanvasCSSSizes();
    viewer.scheduleBackingResize();
  });

  // Compute and expose masks (these will be used by buttons after initialization)
  // This runs after viewer and alignment are set up
  setTimeout(() => {
    try {
      if (viewer && viewer.alignment) {
        const cm = viewer.alignment.computeConstantMask();
        window.constantMask = cm;
      }
    } catch (_) { }
    try {
      if (viewer && viewer.alignment) {
        const cam = viewer.alignment.computeConstantMaskAllowN();
        window.constantAmbiguousMask = cam;
      }
    } catch (_) { }
    try {
      if (viewer && viewer.alignment) {
        const cgm = viewer.alignment.computeConstantMaskAllowNAndGaps();
        window.constantGappedMask = cgm;
      }
    } catch (_) { }
  }, 500);

  // All DOM wiring complete — now create the viewer and show the file modal
  initializeViewer();

  // Notify sealion-tauri.js (and any other integrations) that the app
  // interface is fully initialised and ready for use.
  window.dispatchEvent(new CustomEvent('sealion-ready'));

})();