// sealionviewer.js
// ES module — imported renderer classes are private to this module.
// SealionViewer is exposed globally via window.SealionViewer for sealion.js.

import { CanvasRenderer } from './renderers/CanvasRenderer.js';
import { OverviewRenderer }  from './renderers/OverviewRenderer.js';
import { ConsensusRenderer } from './renderers/ConsensusRenderer.js';
import { HeaderRenderer }    from './renderers/HeaderRenderer.js';
import { LabelRenderer }     from './renderers/LabelRenderer.js';
import { AlignmentRenderer } from './renderers/AlignmentRenderer.js';
import { PlotRenderer, PLOT_TYPES } from './renderers/PlotRenderer.js';

  // Minimal, self-contained SealionViewer class.
  // Purpose: provide a clean place to migrate rendering, geometry and interaction
  // code in stages (Option B). This initial version implements a small
  // subset of utilities used throughout the app: DPR-aware canvas backing,
  // char-width measurement in CSS pixels, and colOffsets builder. It does NOT
  // change any behaviour in `script.js` yet. Later stages will move actual
  // draw/handler implementations into this class.

  class SealionViewer {
    constructor(containerOrSelector, alignment, options) {
      // Accept either a DOM element or a selector string (e.g. '#app' or 'app')
      if (typeof containerOrSelector === 'string') {
        const sel = containerOrSelector.startsWith('#') || containerOrSelector.startsWith('.')
          ? containerOrSelector
          : `#${containerOrSelector}`;
        this.container = document.querySelector(sel);
      } else {
        this.container = containerOrSelector;
      }

      if (!this.container) {
        throw new Error('SealionViewer: container not found');
      }
      // Ensure the viewer has its expected internal DOM structure. If the
      // consumer passed a container that already contains the elements (for
      // staged migration), reuse them. Otherwise, create the inner layout
      // (canvases, spacers and wrappers) inside the container so the viewer
      // owns its markup and callers may interact only via the class API.
      try {
        const q = (sel) => this.container.querySelector(sel);
        // Left label column with three label canvases and divider
        let labels = q('#labels');
        if (!labels) { labels = document.createElement('div'); labels.id = 'labels'; this.container.appendChild(labels); }

        // Label filter container and filter box (replaces outline canvas)
        let labelFilter = q('#label-filter');
        if (!labelFilter) {
          labelFilter = document.createElement('div');
          labelFilter.id = 'label-filter';
          labelFilter.className = 'label-filter';
          labels.appendChild(labelFilter);
        }
        let labelFilterBox = q('#label-filter-box');
        if (!labelFilterBox) {
          labelFilterBox = document.createElement('input');
          labelFilterBox.id = 'label-filter-box';
          labelFilterBox.className = 'label-filter-box';
          labelFilterBox.type = 'text';
          labelFilterBox.placeholder = 'Filter labels...';
          labelFilter.appendChild(labelFilterBox);
        }

        // Label div for header (UI elements added by script.js)
        let labelsHeaderDiv = q('#labels-header-div');
        if (!labelsHeaderDiv) {
          labelsHeaderDiv = document.createElement('div');
          labelsHeaderDiv.id = 'labels-header-div';
          labelsHeaderDiv.className = 'labels-header-div';
          labels.appendChild(labelsHeaderDiv);
        }

        // Label div for plot strip spacer (matches #plot-canvas height)
        let labelsPlotDiv = q('#labels-plot-div');
        if (!labelsPlotDiv) {
          labelsPlotDiv = document.createElement('div');
          labelsPlotDiv.id = 'labels-plot-div';
          labelsPlotDiv.className = 'labels-plot-div';
          labels.appendChild(labelsPlotDiv);
        }

        // Label div for consensus controls (UI elements added by script.js)
        let labelsConsensusDiv = q('#labels-consensus-div');
        if (!labelsConsensusDiv) {
          labelsConsensusDiv = document.createElement('div');
          labelsConsensusDiv.id = 'labels-consensus-div';
          labelsConsensusDiv.className = 'labels-consensus-div';
          labels.appendChild(labelsConsensusDiv);
        }

        // Inner container for main labels canvas
        let leftInner = q('#left-inner');
        if (!leftInner) { leftInner = document.createElement('div'); leftInner.id = 'left-inner'; labels.appendChild(leftInner); }
        let labelsCanvas = q('#labels-canvas');
        if (!labelsCanvas) { labelsCanvas = document.createElement('canvas'); labelsCanvas.id = 'labels-canvas'; labelsCanvas.className = 'labels-canvas'; leftInner.appendChild(labelsCanvas); }

        // Divider for resizing labels column (now extends full height)
        let labelDivider = q('#label-divider');
        if (!labelDivider) { labelDivider = document.createElement('div'); labelDivider.id = 'label-divider'; labelDivider.title = 'Drag to resize labels'; labels.appendChild(labelDivider); }

        // optional left spacer to mirror right spacer height for some layouts
        let leftSpacer = q('#left-spacer');
        if (!leftSpacer) { leftSpacer = document.createElement('div'); leftSpacer.id = 'left-spacer'; leftSpacer.style.display = 'none'; labels.appendChild(leftSpacer); }

        // Header area: overview, header ruler, consensus
        let header = q('#header');
        if (!header) { header = document.createElement('div'); header.id = 'header'; this.container.appendChild(header); }
        let overviewCanvas = q('#overview-canvas');
        if (!overviewCanvas) { overviewCanvas = document.createElement('canvas'); overviewCanvas.id = 'overview-canvas'; overviewCanvas.className = 'overview-canvas'; header.appendChild(overviewCanvas); }
        let headerCanvas = q('#header-canvas');
        if (!headerCanvas) { headerCanvas = document.createElement('canvas'); headerCanvas.id = 'header-canvas'; headerCanvas.className = 'header-canvas'; header.appendChild(headerCanvas); }
        let plotCanvas = q('#plot-canvas');
        if (!plotCanvas) { plotCanvas = document.createElement('canvas'); plotCanvas.id = 'plot-canvas'; plotCanvas.className = 'plot-canvas'; header.appendChild(plotCanvas); }
        let consensusCanvas = q('#consensus-canvas');
        if (!consensusCanvas) { consensusCanvas = document.createElement('canvas'); consensusCanvas.id = 'consensus-canvas'; consensusCanvas.className = 'consensus-canvas'; header.appendChild(consensusCanvas); }

        // Alignment viewport: seq canvas and scrollable spacer
        let alignmentDiv = q('#alignment');
        if (!alignmentDiv) { alignmentDiv = document.createElement('div'); alignmentDiv.id = 'alignment'; this.container.appendChild(alignmentDiv); }
        let seqCanvas = q('#seq-canvas');
        if (!seqCanvas) { seqCanvas = document.createElement('canvas'); seqCanvas.id = 'seq-canvas'; seqCanvas.className = 'seq-canvas'; alignmentDiv.appendChild(seqCanvas); }
        let scroller = q('#alignment-scroll');
        if (!scroller) { scroller = document.createElement('div'); scroller.id = 'alignment-scroll'; alignmentDiv.appendChild(scroller); }
        let seqInner = scroller.querySelector('#seq-inner');
        if (!seqInner) { seqInner = document.createElement('div'); seqInner.id = 'seq-inner'; scroller.appendChild(seqInner); }
        let seqSpacer = seqInner.querySelector('#seq-spacer');
        if (!seqSpacer) { seqSpacer = document.createElement('div'); seqSpacer.id = 'seq-spacer'; seqInner.appendChild(seqSpacer); }

        // persist references onto the instance for later helpers
        this.labelFilterBox = labelFilterBox;
        this.labelsHeaderDiv = labelsHeaderDiv;
        this.labelsPlotDiv = labelsPlotDiv;
        this.labelsConsensusDiv = labelsConsensusDiv;
        this.overviewCanvas = overviewCanvas;
        this.headerCanvas = headerCanvas;
        this.plotCanvas = plotCanvas;
        this.consensusCanvas = consensusCanvas;
        this.alignmentDiv = alignmentDiv;
        this.labelCanvas = labelsCanvas;
        this.labelDivider = labelDivider;
        this.leftSpacer = leftSpacer;
        this.seqCanvas = seqCanvas;
        this.scroller = scroller;
        this.seqInner = seqInner;
        this.seqSpacer = seqSpacer;
      } catch (e) { console.warn('SealionViewer: failed to ensure DOM structure', e); }
      // initialize devicePixelRatio and measurement context so drawing
      // helpers (ensureCanvasBacking, measureCharWidthFromReal) work
      // immediately after instantiation.
      this.pr = window.devicePixelRatio || 1;
      try {
        this._measureCanvas = document.createElement('canvas');
        this._measureCtx = this._measureCanvas.getContext('2d');
      } catch (_) { this._measureCtx = null; }
      this.charWidth = 8; // safe default until measured
      if (alignment) this.alignment = alignment;
      // default mask-enabled flag (matches legacy script.js initial state)
      this.maskEnabled = true;
      // hide mode: when enabled, collapsed regions are reduced to near-zero width with center markers
      this.hideMode = false;
      // Search state
      this.searchMatches = [];
      this.currentMatchIndex = -1;

      // Set up label filter box filtering
      if (this.labelFilterBox) {
        this.labelFilterBox.addEventListener('input', (e) => {
          const searchText = e.target.value.toLowerCase().trim();
          if (!searchText) {
            // Clear selection when filter box is empty
            if (this.selectedRows) this.selectedRows.clear();
            if (typeof this.scheduleRender === 'function') this.scheduleRender();
            return;
          }
          
          // Find and select all matching rows
          if (this.alignment && this.selectedRows) {
            this.selectedRows.clear();
            this.alignment.forEach((row, idx) => {
              const label = row.label || row.name || '';
              if (label.toLowerCase().includes(searchText)) {
                this.selectedRows.add(idx);
              }
            });
            
            // Scroll to first match if any
            if (this.selectedRows.size > 0 && this.scroller) {
              const firstMatch = Math.min(...Array.from(this.selectedRows));
              const rowHeight = this.ROW_HEIGHT || 20;
              const targetTop = firstMatch * rowHeight;
              this.scroller.scrollTop = targetTop;
            }
            
            if (typeof this.scheduleRender === 'function') this.scheduleRender();
          }
        });
      }

      // Initialize collections that should not be reset by setOptions
      this.labelTags = new Map(); // Map of label string -> tag color index
      this.siteBookmarks = new Map(); // Map of column index -> bookmark color index
      this._overviewRenderer   = new OverviewRenderer(this.overviewCanvas, this);
      this._overviewRenderer.attachEvents();
      this._consensusRenderer  = new ConsensusRenderer(this.consensusCanvas, this);
      this._plotRenderer       = new PlotRenderer(this.plotCanvas, this);
      this._headerRenderer     = new HeaderRenderer(this.headerCanvas, this);
      this._labelRenderer      = new LabelRenderer(this.labelCanvas, this);
      this._alignmentRenderer  = new AlignmentRenderer(this.seqCanvas, this);
      // attachEvents() for header, consensus, label, and alignment are called from attachInteractionHandlers().
      this._lightModeColors = {}; // store original light mode colors

      // Apply defaults first, then override with provided options
      this.setOptions(SealionViewer.DEFAULTS);
      if (options) this.setOptions(options);

      // Keep canvases sized when the container or scroller change size.
      try {
        const doResize = () => {
          try {
            this.setCanvasCSSSizes();
            this.resizeBackings();
            // Draw immediately after backing resize to avoid blank frames
            if (typeof this.drawAll === 'function') this.drawAll();
          } catch (e) { console.warn('doResize failed', e); }
        };
        if (typeof ResizeObserver !== 'undefined') {
          try {
            this._resizeObserver = new ResizeObserver(doResize);
            this._resizeObserver.observe(this.container);
            if (this.scroller) this._resizeObserver.observe(this.scroller);
          } catch (_) { window.addEventListener('resize', doResize); }
        } else {
          window.addEventListener('resize', doResize);
        }
        // run once to initialize sizes immediately
        try { doResize(); } catch (_) { }
      } catch (_) { }

    }

    // Set or update options for this viewer instance. This method allows
    // configuring visual constants, colors, fonts, and other settings.
    // Can be called after construction to change specific options.
    setOptions(options) {
      if (!options) return;
      
      try {
        // fonts & sizes
        if (typeof options.FONT !== 'undefined') this.FONT = options.FONT;
        if (typeof options.HEADER_FONT !== 'undefined') this.HEADER_FONT = options.HEADER_FONT;
        if (typeof options.FONT_SIZE !== 'undefined') {
          this.FONT_SIZE = options.FONT_SIZE;
          this.fontSize = options.FONT_SIZE; // Current sequence font size
          this.labelFontSize = options.FONT_SIZE; // Current label font size
          this.initialLabelFontSize = options.FONT_SIZE; // Track initial label font size for scaling logic
        }
        if (typeof options.FONT !== 'undefined') this.labelFont = options.FONT; // Label font string
        if (typeof options.LABEL_WIDTH !== 'undefined') this.LABEL_WIDTH = options.LABEL_WIDTH;
        if (typeof options.ROW_HEIGHT !== 'undefined') this.ROW_HEIGHT = options.ROW_HEIGHT;
        if (typeof options.ROW_PADDING !== 'undefined') this.ROW_PADDING = options.ROW_PADDING;
        if (typeof options.CONSENSUS_TOP_PAD !== 'undefined') this.CONSENSUS_TOP_PAD = options.CONSENSUS_TOP_PAD;
        if (typeof options.CONSENSUS_BOTTOM_PAD !== 'undefined') this.CONSENSUS_BOTTOM_PAD = options.CONSENSUS_BOTTOM_PAD;
        if (typeof options.OVERVIEW_TOP_PAD !== 'undefined') this.OVERVIEW_TOP_PAD = options.OVERVIEW_TOP_PAD;
        if (typeof options.OVERVIEW_BOTTOM_PAD !== 'undefined') this.OVERVIEW_BOTTOM_PAD = options.OVERVIEW_BOTTOM_PAD;
        
        // layout/padding
        if (typeof options.EXPANDED_RIGHT_PAD !== 'undefined') this.EXPANDED_RIGHT_PAD = options.EXPANDED_RIGHT_PAD;
        if (typeof options.REDUCED_COL_WIDTH !== 'undefined') this.REDUCED_COL_WIDTH = options.REDUCED_COL_WIDTH;
        if (typeof options.HIDDEN_MARKER_WIDTH !== 'undefined') this.HIDDEN_MARKER_WIDTH = options.HIDDEN_MARKER_WIDTH;
        if (typeof options.HIDDEN_MARKER_COLOR !== 'undefined') this.HIDDEN_MARKER_COLOR = options.HIDDEN_MARKER_COLOR;
        if (typeof options.COMPRESSED_CELL_VPAD !== 'undefined') this.COMPRESSED_CELL_VPAD = options.COMPRESSED_CELL_VPAD;
        
        // rendering/behaviour
        if (typeof options.BUFFER_ROWS !== 'undefined') this.BUFFER_ROWS = options.BUFFER_ROWS;
        if (typeof options.BUFFER_COLS !== 'undefined') this.BUFFER_COLS = options.BUFFER_COLS;
        if (typeof options.MASK_ANIM_MS !== 'undefined') this.MASK_ANIM_MS = options.MASK_ANIM_MS;
        
        // colours
        if (typeof options.BASE_COLORS !== 'undefined') this.BASE_COLORS = options.BASE_COLORS;
        if (typeof options.DEFAULT_BASE_COLOR !== 'undefined') this.DEFAULT_BASE_COLOR = options.DEFAULT_BASE_COLOR;
        if (typeof options.PALE_REF_COLOR !== 'undefined') this.PALE_REF_COLOR = options.PALE_REF_COLOR;
        if (typeof options.REF_ACCENT !== 'undefined') this.REF_ACCENT = options.REF_ACCENT;
        
        // canvas colors
        if (typeof options.OVERVIEW_BG !== 'undefined') this.OVERVIEW_BG = options.OVERVIEW_BG;
        if (typeof options.OVERVIEW_EXPANDED_COL !== 'undefined') this.OVERVIEW_EXPANDED_COL = options.OVERVIEW_EXPANDED_COL;
        if (typeof options.OVERVIEW_COLLAPSED_COL !== 'undefined') this.OVERVIEW_COLLAPSED_COL = options.OVERVIEW_COLLAPSED_COL;
        if (typeof options.OVERVIEW_VIEWPORT !== 'undefined') this.OVERVIEW_VIEWPORT = options.OVERVIEW_VIEWPORT;
        if (typeof options.OVERVIEW_DIFF_COL !== 'undefined') this.OVERVIEW_DIFF_COL = options.OVERVIEW_DIFF_COL;
        if (typeof options.HEADER_BG !== 'undefined') this.HEADER_BG = options.HEADER_BG;
        if (typeof options.HEADER_TEXT !== 'undefined') this.HEADER_TEXT = options.HEADER_TEXT;
        if (typeof options.HEADER_STROKE !== 'undefined') this.HEADER_STROKE = options.HEADER_STROKE;
        if (typeof options.HEADER_SELECTION !== 'undefined') this.HEADER_SELECTION = options.HEADER_SELECTION;
        if (typeof options.CONSENSUS_BG !== 'undefined') this.CONSENSUS_BG = options.CONSENSUS_BG;
        if (typeof options.CONSENSUS_SEPARATOR !== 'undefined') this.CONSENSUS_SEPARATOR = options.CONSENSUS_SEPARATOR;
        if (typeof options.PLOT_HEIGHT === 'number') this.PLOT_HEIGHT = options.PLOT_HEIGHT;
        if (typeof options.PLOT_BG !== 'undefined') this.PLOT_BG = options.PLOT_BG;
        if (typeof options.PLOT_SEPARATOR !== 'undefined') this.PLOT_SEPARATOR = options.PLOT_SEPARATOR;
        if (typeof options.PLOT_BAR_COLOR !== 'undefined') this.PLOT_BAR_COLOR = options.PLOT_BAR_COLOR;
        if (typeof options.PLOT_TOP_PAD === 'number') this.PLOT_TOP_PAD = options.PLOT_TOP_PAD;
        if (typeof options.PLOT_BOTTOM_PAD === 'number') this.PLOT_BOTTOM_PAD = options.PLOT_BOTTOM_PAD;
        if (typeof options.LABELS_BG !== 'undefined') this.LABELS_BG = options.LABELS_BG;
        if (typeof options.LABELS_TEXT !== 'undefined') this.LABELS_TEXT = options.LABELS_TEXT;
        if (typeof options.LABELS_HEADER_TEXT !== 'undefined') this.LABELS_HEADER_TEXT = options.LABELS_HEADER_TEXT;
        
        // index styling
        if (typeof options.INDEX_FONT_STYLE !== 'undefined') this.INDEX_FONT_STYLE = options.INDEX_FONT_STYLE;
        if (typeof options.INDEX_COLOR !== 'undefined') this.INDEX_COLOR = options.INDEX_COLOR;
        if (typeof options.INDEX_RIGHT_ALIGN_POS !== 'undefined') this.INDEX_RIGHT_ALIGN_POS = options.INDEX_RIGHT_ALIGN_POS;
        if (typeof options.LABEL_START_POS !== 'undefined') this.LABEL_START_POS = options.LABEL_START_POS;
        if (typeof options.SEQ_ROW_SELECTION !== 'undefined') this.SEQ_ROW_SELECTION = options.SEQ_ROW_SELECTION;
        if (typeof options.SEQ_EVEN_ROW !== 'undefined') this.SEQ_EVEN_ROW = options.SEQ_EVEN_ROW;
        if (typeof options.SEQ_ODD_ROW !== 'undefined') this.SEQ_ODD_ROW = options.SEQ_ODD_ROW;
        if (typeof options.SEQ_COL_SELECTION !== 'undefined') this.SEQ_COL_SELECTION = options.SEQ_COL_SELECTION;
        
        // mask preference
        if (typeof options.MASK_ENABLED === 'boolean') this.maskEnabled = options.MASK_ENABLED;
        
        // snap-to-character scrolling preference
        if (typeof options.SNAP_ENABLED === 'boolean') {
          this.snapEnabled = options.SNAP_ENABLED;
        } else if (typeof this.snapEnabled === 'undefined') {
          this.snapEnabled = true;
        }
        
        // Display mode settings (new system)
        // displayMode: 'native' | 'codon' | 'translate'
        // dataType: 'nucleotide' | 'aminoacid'
        if (typeof options.DISPLAY_MODE === 'string') this.displayMode = options.DISPLAY_MODE;
        if (typeof options.DATA_TYPE === 'string') this.dataType = options.DATA_TYPE;
        if (typeof options.READING_FRAME === 'number') this.readingFrame = options.READING_FRAME;
        
        // Backward compatibility with old mode flags
        if (typeof options.AMINO_ACID_MODE === 'boolean') this.aminoAcidMode = options.AMINO_ACID_MODE;
        if (typeof options.CODON_MODE === 'boolean') this.codonMode = options.CODON_MODE;
        
        // Sync old flags with new displayMode if new mode is set
        if (this.displayMode) {
          this.aminoAcidMode = (this.displayMode === 'translate');
          this.codonMode = (this.displayMode === 'codon');
        }
        // Sync displayMode from old flags if not explicitly set
        else if (typeof this.displayMode === 'undefined') {
          if (this.codonMode) {
            this.displayMode = 'codon';
          } else if (this.aminoAcidMode) {
            this.displayMode = this.isNativeAminoAcid ? 'native' : 'translate';
          } else {
            this.displayMode = 'native';
          }
        }
        
        // color schemes
        if (typeof options.NUCLEOTIDE_COLOR_SCHEME !== 'undefined') {
          this.nucleotideColorScheme = options.NUCLEOTIDE_COLOR_SCHEME;
          const nucScheme = SealionViewer.NUCLEOTIDE_COLOR_SCHEMES[this.nucleotideColorScheme];
          if (nucScheme) {
            this.BASE_COLORS = { ...nucScheme.lightColors };
            this.DEFAULT_BASE_COLOR = nucScheme.lightDefault;
          }
        }
        
        if (typeof options.AMINO_ACID_COLOR_SCHEME !== 'undefined') {
          this.aminoAcidColorScheme = options.AMINO_ACID_COLOR_SCHEME;
          const aaScheme = SealionViewer.AMINO_ACID_COLOR_SCHEMES[this.aminoAcidColorScheme];
          if (aaScheme) {
            this.AA_COLORS = { ...aaScheme.lightColors };
            this.DEFAULT_AA_COLOR = aaScheme.lightDefault;
          }
        }
        
        // label tagging system
        if (typeof options.TAG_COLORS !== 'undefined') this.TAG_COLORS = options.TAG_COLORS;
        if (typeof options.TAG_NAMES !== 'undefined') this.TAG_NAMES = options.TAG_NAMES;
        if (typeof options.TAG_BACKGROUND_ALPHA === 'number') this.TAG_BACKGROUND_ALPHA = options.TAG_BACKGROUND_ALPHA;
        if (typeof options.TAG_SEQ_BACKGROUND_ALPHA === 'number') this.TAG_SEQ_BACKGROUND_ALPHA = options.TAG_SEQ_BACKGROUND_ALPHA;
        if (typeof options.TAG_TEXT_COLOR === 'boolean') this.TAG_TEXT_COLOR = options.TAG_TEXT_COLOR;
        
        // site bookmark system
        if (typeof options.BOOKMARK_COLORS !== 'undefined') this.BOOKMARK_COLORS = options.BOOKMARK_COLORS;
        if (typeof options.BOOKMARK_NAMES !== 'undefined') this.BOOKMARK_NAMES = options.BOOKMARK_NAMES;
        if (typeof options.BOOKMARK_ALPHA === 'number') this.BOOKMARK_ALPHA = options.BOOKMARK_ALPHA;
        if (typeof options.BOOKMARK_COL_ALPHA === 'number') this.BOOKMARK_COL_ALPHA = options.BOOKMARK_COL_ALPHA;
        
        // dark mode
        if (typeof options.darkMode === 'boolean') this.darkMode = options.darkMode;
      } catch (e) {
        console.warn('SealionViewer.setOptions failed', e);
      }
    }

    // Get current viewer state. Returns an object containing all state information
    // that can be persisted (e.g., to localStorage) and restored later.
    // State includes viewing modes, color schemes, viewport position, and selections.
    getState() {
      const state = {
        // Viewing modes (new system)
        displayMode: this.displayMode || 'native',
        dataType: this.dataType || 'nucleotide',
        readingFrame: this.readingFrame || 1,
        // Backward compatibility
        aminoAcidMode: this.aminoAcidMode || false,
        codonMode: this.codonMode || false,
        maskEnabled: this.maskEnabled || false,
        hideMode: this.hideMode || false,
        refModeEnabled: this.refModeEnabled || false,
        snapEnabled: this.snapEnabled !== false, // default true
        darkMode: this.darkMode || false,
        
        // Color schemes
        nucleotideColorScheme: this.nucleotideColorScheme || 'default',
        aminoAcidColorScheme: this.aminoAcidColorScheme || 'default',
        
        // Font sizes (current, not initial)
        fontSize: this.fontSize || this.FONT_SIZE || 12,
        labelFontSize: this.labelFontSize || this.FONT_SIZE || 12,
        
        // Reference settings
        refIndex: (typeof this.refIndex === 'number') ? this.refIndex : null,
        
        // Column collapsing
        maskStr: this.maskStr || null,
        
        // Viewport position
        scrollLeft: this.scroller ? this.scroller.scrollLeft : 0,
        scrollTop: this.scroller ? this.scroller.scrollTop : 0,
        
        // Label width (user may have resized)
        labelWidth: this.LABEL_WIDTH || 260,
        
        // Selections (convert Sets to arrays for JSON serialization)
        selectedRows: this.selectedRows ? Array.from(this.selectedRows) : [],
        selectedCols: this.selectedCols ? Array.from(this.selectedCols) : [],
        
        // Tags and bookmarks (convert Maps to arrays of entries)
        labelTags: this.labelTags ? Array.from(this.labelTags.entries()) : [],
        siteBookmarks: this.siteBookmarks ? Array.from(this.siteBookmarks.entries()) : []
      };
      
      return state;
    }

    // Set viewer state from a previously saved state object (e.g., from localStorage).
    // Updates the viewer to match the provided state and triggers a re-render.
    // Only sets properties that are present in the state object.
    setState(state) {
      if (!state) return;
      
      try {
        let needsRebuild = false;
        let needsRerender = false;
        
        // Viewing modes (new system)
        if (typeof state.displayMode === 'string' && state.displayMode !== this.displayMode) {
          this.displayMode = state.displayMode;
          // Sync old flags for backward compatibility
          this.aminoAcidMode = (this.displayMode === 'translate');
          this.codonMode = (this.displayMode === 'codon');
          needsRebuild = true;
          needsRerender = true;
        }
        if (typeof state.dataType === 'string' && state.dataType !== this.dataType) {
          this.dataType = state.dataType;
          needsRerender = true;
        }
        
        // Backward compatibility with old mode flags
        if (typeof state.aminoAcidMode === 'boolean' && state.aminoAcidMode !== this.aminoAcidMode) {
          this.aminoAcidMode = state.aminoAcidMode;
          // Sync to new displayMode if not already set from state
          if (!state.displayMode) {
            this.displayMode = this.aminoAcidMode ? 'translate' : 'native';
          }
          needsRebuild = true;
          needsRerender = true;
        }
        if (typeof state.codonMode === 'boolean' && state.codonMode !== this.codonMode) {
          this.codonMode = state.codonMode;
          // Sync to new displayMode if not already set from state
          if (!state.displayMode) {
            this.displayMode = this.codonMode ? 'codon' : 'native';
          }
          needsRebuild = true;
          needsRerender = true;
        }
        if (typeof state.readingFrame === 'number' && state.readingFrame !== this.readingFrame) {
          this.readingFrame = state.readingFrame;
          needsRebuild = true;
          needsRerender = true;
        }
        if (typeof state.maskEnabled === 'boolean' && state.maskEnabled !== this.maskEnabled) {
          this.maskEnabled = state.maskEnabled;
          needsRebuild = true;
          needsRerender = true;
        }
        if (typeof state.hideMode === 'boolean' && state.hideMode !== this.hideMode) {
          this.hideMode = state.hideMode;
          needsRebuild = true;
          needsRerender = true;
        }
        if (typeof state.refModeEnabled === 'boolean') {
          this.refModeEnabled = state.refModeEnabled;
          needsRerender = true;
        }
        if (typeof state.snapEnabled === 'boolean') {
          this.snapEnabled = state.snapEnabled;
        }
        if (typeof state.darkMode === 'boolean' && state.darkMode !== this.darkMode) {
          this.darkMode = state.darkMode;
          // Toggle dark mode if needed
          if (typeof this.toggleDarkMode === 'function') {
            this.toggleDarkMode(state.darkMode);
          }
          needsRerender = true;
        }
        
        // Color schemes
        if (typeof state.nucleotideColorScheme === 'string' && state.nucleotideColorScheme !== this.nucleotideColorScheme) {
          this.nucleotideColorScheme = state.nucleotideColorScheme;
          const nucScheme = SealionViewer.NUCLEOTIDE_COLOR_SCHEMES[this.nucleotideColorScheme];
          if (nucScheme) {
            this.BASE_COLORS = this.darkMode ? { ...nucScheme.darkColors } : { ...nucScheme.lightColors };
            this.DEFAULT_BASE_COLOR = this.darkMode ? nucScheme.darkDefault : nucScheme.lightDefault;
          }
          needsRerender = true;
        }
        if (typeof state.aminoAcidColorScheme === 'string' && state.aminoAcidColorScheme !== this.aminoAcidColorScheme) {
          this.aminoAcidColorScheme = state.aminoAcidColorScheme;
          const aaScheme = SealionViewer.AMINO_ACID_COLOR_SCHEMES[this.aminoAcidColorScheme];
          if (aaScheme) {
            this.AA_COLORS = this.darkMode ? { ...aaScheme.darkColors } : { ...aaScheme.lightColors };
            this.DEFAULT_AA_COLOR = this.darkMode ? aaScheme.darkDefault : aaScheme.lightDefault;
          }
          needsRerender = true;
        }
        
        // Font sizes
        if (typeof state.fontSize === 'number' && state.fontSize !== this.fontSize) {
          this.fontSize = state.fontSize;
          // Update the actual font string
          this.FONT = this.fontSize + 'px monospace';
          needsRebuild = true;
          needsRerender = true;
        }
        if (typeof state.labelFontSize === 'number' && state.labelFontSize !== this.labelFontSize) {
          this.labelFontSize = state.labelFontSize;
          this.labelFont = this.labelFontSize + 'px monospace';
          needsRerender = true;
        }
        
        // Reference settings
        if (typeof state.refIndex === 'number' || state.refIndex === null) {
          this.refIndex = state.refIndex;
          needsRerender = true;
        }
        
        // Column collapsing
        if (typeof state.maskStr === 'string' || state.maskStr === null) {
          this.maskStr = state.maskStr;
          // Also update window.mask for compatibility
          if (typeof window !== 'undefined') {
            window.mask = state.maskStr;
            window.maskStr = state.maskStr;
          }
          needsRebuild = true;
          needsRerender = true;
        }
        
        // Label width
        if (typeof state.labelWidth === 'number' && state.labelWidth !== this.LABEL_WIDTH) {
          this.LABEL_WIDTH = state.labelWidth;
          // Update CSS variable
          if (typeof document !== 'undefined') {
            try {
              document.documentElement.style.setProperty('--label-width', state.labelWidth + 'px');
            } catch (_) {}
          }
          if (typeof this.setCanvasCSSSizes === 'function') {
            this.setCanvasCSSSizes();
          }
          needsRerender = true;
        }
        
        // Selections (convert arrays back to Sets)
        if (Array.isArray(state.selectedRows)) {
          this.selectedRows = this.selectedRows || new Set();
          this.selectedRows.clear();
          state.selectedRows.forEach(r => this.selectedRows.add(r));
          needsRerender = true;
        }
        if (Array.isArray(state.selectedCols)) {
          this.selectedCols = this.selectedCols || new Set();
          this.selectedCols.clear();
          state.selectedCols.forEach(c => this.selectedCols.add(c));
          needsRerender = true;
        }
        
        // Tags and bookmarks (convert arrays back to Maps)
        if (Array.isArray(state.labelTags)) {
          this.labelTags = this.labelTags || new Map();
          this.labelTags.clear();
          state.labelTags.forEach(([key, value]) => this.labelTags.set(key, value));
          needsRerender = true;
        }
        if (Array.isArray(state.siteBookmarks)) {
          this.siteBookmarks = this.siteBookmarks || new Map();
          this.siteBookmarks.clear();
          state.siteBookmarks.forEach(([key, value]) => this.siteBookmarks.set(key, value));
          this._overviewRenderer.invalidateCache(); // bookmarks affect overview
          needsRerender = true;
        }
        
        // Rebuild column offsets if needed (for mask, amino acid mode, font size changes)
        if (needsRebuild && typeof this.buildColOffsetsFor === 'function' && this.alignment) {
          // Calculate max sequence length efficiently without spread operator
          let maxSeqLen = 0;
          for (let i = 0; i < this.alignment.length; i++) {
            const row = this.alignment[i];
            if (row && row.sequence) {
              const len = row.sequence.length;
              if (len > maxSeqLen) maxSeqLen = len;
            }
          }
          
          this.colOffsets = this.buildColOffsetsFor(this.maskEnabled, {
            maxSeqLen: maxSeqLen,
            CHAR_WIDTH: this.charWidth,
            EXPANDED_RIGHT_PAD: this.EXPANDED_RIGHT_PAD || 2,
            REDUCED_COL_WIDTH: this.REDUCED_COL_WIDTH || 1,
            HIDDEN_MARKER_WIDTH: this.HIDDEN_MARKER_WIDTH || 4,
            hideMode: this.hideMode || false,
            maskStr: this.maskStr
          });
          
          // Resize backings for new font/layout
          if (typeof this.resizeBackings === 'function') {
            this.resizeBackings();
          }
        }
        
        // Viewport position (restore scroll after other updates)
        if (this.scroller) {
          if (typeof state.scrollLeft === 'number') {
            this.scroller.scrollLeft = state.scrollLeft;
          }
          if (typeof state.scrollTop === 'number') {
            this.scroller.scrollTop = state.scrollTop;
          }
        }
        
        // Trigger re-render if any state changed
        if (needsRerender && typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
        
        console.info('SealionViewer.setState: state restored');
      } catch (e) {
        console.warn('SealionViewer.setState failed', e);
      }
    }

    // Set or update the alignment data for this viewer instance. This method
    // allows changing the alignment after construction. It rebuilds column
    // offsets, updates sizing, and schedules a render.
    setData(alignment, opts) {
      try {
        console.time('setData');
        if (!alignment) {
          console.warn('SealionViewer.setData: no alignment provided');
          return;
        }
        
        console.time('setData:assignAlignment');
        this.alignment = alignment;
        console.timeEnd('setData:assignAlignment');
        
        // Rebuild column offsets for the new alignment
        if (typeof this.buildColOffsetsFor === 'function') {
          console.time('setData:calcMaxSeqLen');
          // Calculate max sequence length efficiently without spread operator
          let maxSeqLen = 0;
          for (let i = 0; i < alignment.length; i++) {
            const row = alignment[i];
            if (row && row.sequence) {
              const len = row.sequence.length;
              if (len > maxSeqLen) maxSeqLen = len;
            }
          }
          console.timeEnd('setData:calcMaxSeqLen');
          
          console.time('setData:buildColOffsets');
          this.colOffsets = this.buildColOffsetsFor(this.maskEnabled, {
            maxSeqLen: maxSeqLen,
            CHAR_WIDTH: this.charWidth,
            EXPANDED_RIGHT_PAD: this.EXPANDED_RIGHT_PAD || 2,
            REDUCED_COL_WIDTH: this.REDUCED_COL_WIDTH || 1,
            HIDDEN_MARKER_WIDTH: this.HIDDEN_MARKER_WIDTH || 4,
            hideMode: this.hideMode || false,
            maskStr: (opts && opts.maskStr) || (window && window.maskStr) || (window && window.mask) || null
          });
          console.timeEnd('setData:buildColOffsets');
        }
        
        // Update canvas sizes and backings
        console.time('setData:setCanvasCSSSizes');
        if (typeof this.setCanvasCSSSizes === 'function') {
          this.setCanvasCSSSizes(opts);
        }
        console.timeEnd('setData:setCanvasCSSSizes');
        
        console.time('setData:resizeBackings');
        if (typeof this.resizeBackings === 'function') {
          this.resizeBackings(opts);
        }
        console.timeEnd('setData:resizeBackings');
        
        // Schedule a render to display the new data
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
        
        console.info('SealionViewer.setData: alignment updated with', alignment.length, 'sequences');
        console.timeEnd('setData');
      } catch (e) {
        console.warn('SealionViewer.setData failed', e);
      }
    }

    // Schedule a backing resize on the next animation frame. This debounces
    // frequent calls (e.g. during drag or window resize) so we don't repeatedly
    // set canvas.width/height which clears the canvas and causes flicker.
    scheduleBackingResize() {
      if (this._backingResizeScheduled) return;
      this._backingResizeScheduled = true;
      const that = this;
      requestAnimationFrame(() => {
        try {
          that._backingResizeScheduled = false;
          that.resizeBackings();
          // Ensure a draw follows the backing resize so canvases show content
          try { if (typeof that.scheduleRender === 'function') that.scheduleRender(); } catch (_) { }
        } catch (_) { that._backingResizeScheduled = false; }
      });
    }

    // Attach default interaction handlers for canvases and scroller.
    // This method now keeps selection state inside the viewer instance so
    // the legacy `script.js` only manages controls/data. Call with the
    // canvas elements and scroller. Callbacks are optional; the viewer will
    // schedule its own renders via this.scheduleRender(), but will also call
    // user-provided callbacks when present.
    // Options expected:
    // { headerCanvas, seqCanvas, labelCanvas, consensusCanvas, overviewCanvas, scroller, callbacks }
    attachInteractionHandlers(opts) {
      if (!opts) opts = {};
      const headerCanvas = opts.headerCanvas || null;
      const seqCanvas = opts.seqCanvas || null;
      const labelCanvas = opts.labelCanvas || null;
      const consensusCanvas = opts.consensusCanvas || null;
      const overviewCanvas = opts.overviewCanvas || null;
      const scroller = opts.scroller || (document.getElementById ? document.getElementById('alignment-scroll') : null);
      const cb = opts.callbacks || {};

      // Persist scroller onto the instance so other methods can reference it
      // without relying on closure variables. This also makes debugging
      // and inspection from the console easier (window.viewer.scroller).
      try { this.scroller = scroller; } catch (_) { }
      // store canvases and spacers for sizing/resizing helpers
      try { this.headerCanvas = headerCanvas; } catch (_) { }
      try { this.seqCanvas = seqCanvas; } catch (_) { }
      try { this.labelCanvas = labelCanvas; } catch (_) { }
      try { this.consensusCanvas = consensusCanvas; } catch (_) { }
      try { this.overviewCanvas = overviewCanvas; } catch (_) { }
      try { this.labelsHeaderDiv = (opts && opts.labelsHeaderDiv) ? opts.labelsHeaderDiv : null; } catch (_) { }
      try { this.seqSpacer = (opts && opts.seqSpacer) ? opts.seqSpacer : null; } catch (_) { }
      try { this.leftSpacer = (opts && opts.leftSpacer) ? opts.leftSpacer : null; } catch (_) { }
      try { this.leftScroll = (opts && opts.leftScroll) ? opts.leftScroll : null; } catch (_) { }

      // Label divider drag-to-resize: allow the application to pass a labelDivider
      // element via opts.labelDivider; otherwise use any divider the viewer
      // created during construction (`this.labelDivider`). Resizing updates the
      // viewer's LABEL_WIDTH, the CSS var --label-width, and triggers a sizing
      // pass (CSS sizes + backing resize) followed by a scheduled render.
      try {
        const labelDividerEl = (opts && opts.labelDivider) ? opts.labelDivider : (this.labelDivider || (document.getElementById ? document.getElementById('label-divider') : null));
        if (labelDividerEl) {
          let isLabelDragging = false;
          let labelDragStartX = 0;
          let labelDragStartWidth = (typeof this.LABEL_WIDTH === 'number') ? this.LABEL_WIDTH : ((window && typeof window.LABEL_WIDTH === 'number') ? window.LABEL_WIDTH : 260);
          let labelDragRafHandle = null;
          const minLabelWidth = 80;
          const maxLabelWidth = 1200;
          labelDividerEl.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isLabelDragging = true;
            labelDragStartX = e.clientX;
            labelDragStartWidth = (typeof this.LABEL_WIDTH === 'number') ? this.LABEL_WIDTH : (document.documentElement ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--label-width') || '260', 10) : 260);
            try { document.body.style.userSelect = 'none'; } catch (_) { }
            e.preventDefault();
          });
          window.addEventListener('mousemove', (e) => {
            if (!isLabelDragging) return;
            const dx = e.clientX - labelDragStartX;
            let nw = Math.max(minLabelWidth, Math.min(maxLabelWidth, Math.round(labelDragStartWidth + dx)));
            if (nw === this.LABEL_WIDTH) return;
            try { this.LABEL_WIDTH = nw; } catch (_) { }
            try { document.documentElement.style.setProperty('--label-width', this.LABEL_WIDTH + 'px'); } catch (_) { }
            // During drag, only update canvas sizes without rendering
            // This prevents expensive redraws (especially when colour-by-differences is enabled)
            if (labelDragRafHandle === null) {
              labelDragRafHandle = requestAnimationFrame(() => {
                labelDragRafHandle = null;
                try { this.setCanvasCSSSizes(); } catch (_) { }
                try { this.resizeBackings(); } catch (_) { }
                // Skip scheduleRender() during drag for better performance
              });
            }
          });
          window.addEventListener('mouseup', (e) => {
            if (!isLabelDragging) return;
            isLabelDragging = false;
            // Cancel any pending animation frame
            if (labelDragRafHandle !== null) {
              cancelAnimationFrame(labelDragRafHandle);
              labelDragRafHandle = null;
            }
            try { document.body.style.userSelect = ''; } catch (_) { }
            try { document.documentElement.style.setProperty('--label-width', this.LABEL_WIDTH + 'px'); } catch (_) { }
            try { localStorage.setItem('sealion_label_width', String(this.LABEL_WIDTH)); } catch (_) { }
            // Final layout pass and render
            try { this.setCanvasCSSSizes(); } catch (_) { }
            try { this.resizeBackings(); } catch (_) { }
            try { if (typeof this.scheduleRender === 'function') this.scheduleRender(); } catch (_) { }
          });
          // restore persisted width if present
          try {
            const saved = localStorage.getItem('sealion_label_width');
            if (saved) { const v = parseInt(saved, 10); if (Number.isFinite(v) && v > 0) { this.LABEL_WIDTH = v; document.documentElement.style.setProperty('--label-width', this.LABEL_WIDTH + 'px'); } }
          } catch (_) { }
        }
      } catch (_) { }

      // If the application provided a scheduleRender callback, delegate
      // scheduling to it so app-level rendering (in script.js) runs.
      // Otherwise fall back to this.scheduleRender (which triggers drawAll()).
      try {
        const protoSchedule = this.scheduleRender ? this.scheduleRender.bind(this) : null;
        this.scheduleRender = () => {
          try {
            if (cb && typeof cb.scheduleRender === 'function') return cb.scheduleRender();
          } catch (_) { }
          try { if (protoSchedule) return protoSchedule(); } catch (_) { }
        };
      } catch (_) { }

      // Internal selection state now belongs to the viewer instance
      this.selectedRows = this.selectedRows || new Set();
      this.selectedCols = this.selectedCols || new Set();
      this.anchorRow = (typeof this.anchorRow !== 'undefined') ? this.anchorRow : null;
      this.anchorCol = (typeof this.anchorCol !== 'undefined') ? this.anchorCol : null;
      this.isSelecting = false;
      this.selectionStartRow = null;
      this.selectionMode = 'replace';
      this.isRectSelecting = false;
      this.rectStartRow = null; this.rectStartCol = null; this.rectEndRow = null; this.rectEndCol = null; this.rectOriginal = null;
      this.isColSelecting = false; this.selectionStartCol = null;

      // keyboard/space panning state
      this.isSpaceDown = false;
      this.isCmdDrag = false;
      this.dragStartX = 0; this.dragStartY = 0; this.dragStartScrollLeft = 0; this.dragStartScrollTop = 0;

      // snapping state
      this._snapTimeout = null;
      this._snapStartLeft = 0;

      // helper mutation methods exposed on the instance
      this.clearSelectionSets = () => { try { this.selectedRows.clear(); this.selectedCols.clear(); } catch (_) { } };
      
      // Helper: snap column to codon boundary in codon or amino acid mode
      // (but not for native amino acid alignments where each column is already one AA)
      this.snapToCodonStart = (col) => {
        // Only snap in codon or translate mode (not in native mode)
        if (this.displayMode !== 'codon' && this.displayMode !== 'translate') return col;
        // For native amino acids, each column is already one amino acid - no snapping needed
        if (this.dataType === 'aminoacid') return col;
        const frame = this.readingFrame || 1;
        const offset = (col - (frame - 1));
        if (offset < 0) return col;
        const codonStart = Math.floor(offset / 3) * 3 + (frame - 1);
        return codonStart;
      };
      
      this.snapToCodonEnd = (col) => {
        // Only snap in codon or translate mode (not in native mode)
        if (this.displayMode !== 'codon' && this.displayMode !== 'translate') return col;
        // For native amino acids, each column is already one amino acid - no snapping needed
        if (this.dataType === 'aminoacid') return col;
        const frame = this.readingFrame || 1;
        const offset = (col - (frame - 1));
        if (offset < 0) return col;
        const codonStart = Math.floor(offset / 3) * 3 + (frame - 1);
        return codonStart + 2;
      };
      
      this.setSelectionToRange = (a, b) => {
        const lo = Math.max(0, Math.min(a, b));
        const hi = Math.min((this.alignment && this.alignment.length) ? this.alignment.length - 1 : 0, Math.max(a, b));
        this.selectedRows.clear();
        for (let r = lo; r <= hi; r++) this.selectedRows.add(r);
      };
      this.addRangeToSelection = (a, b) => {
        const lo = Math.max(0, Math.min(a, b));
        const hi = Math.min((this.alignment && this.alignment.length) ? this.alignment.length - 1 : 0, Math.max(a, b));
        for (let r = lo; r <= hi; r++) this.selectedRows.add(r);
      };
      this.expandSelectionToInclude = (newPos) => {
        // Expand row selection to include newPos
        if (this.selectedRows.size === 0) {
          this.selectedRows.add(newPos);
          return;
        }
        const currentMin = Math.min(...Array.from(this.selectedRows));
        const currentMax = Math.max(...Array.from(this.selectedRows));
        const lo = Math.max(0, Math.min(currentMin, newPos));
        const hi = Math.min((this.alignment && this.alignment.length) ? this.alignment.length - 1 : 0, Math.max(currentMax, newPos));
        this.selectedRows.clear();
        for (let r = lo; r <= hi; r++) this.selectedRows.add(r);
      };
      this.setColSelectionToRange = (a, b) => {
        // Snap to codon boundaries if in codon or amino acid mode
        let lo = Math.max(0, Math.min(a, b));
        let hi = Math.min((this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets.length - 2 : Math.max(0, (a + b)), Math.max(a, b));
        
        if (this.displayMode === 'codon' || this.displayMode === 'translate') {
          lo = this.snapToCodonStart(lo);
          hi = this.snapToCodonEnd(hi);
        }
        
        this.selectedCols.clear();
        for (let c = lo; c <= hi; c++) this.selectedCols.add(c);
      };
      this.addRangeToColSelection = (a, b) => {
        // Snap to codon boundaries if in codon or amino acid mode
        let lo = Math.max(0, Math.min(a, b));
        let hi = Math.min((this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets.length - 2 : Math.max(0, (a + b)), Math.max(a, b));
        
        if (this.displayMode === 'codon' || this.displayMode === 'translate') {
          lo = this.snapToCodonStart(lo);
          hi = this.snapToCodonEnd(hi);
        }
        
        for (let c = lo; c <= hi; c++) this.selectedCols.add(c);
      };
      this.expandColSelectionToInclude = (newPos) => {
        // Expand column selection to include newPos
        if (this.selectedCols.size === 0) {
          if (this.displayMode === 'codon' || this.displayMode === 'translate') {
            const start = this.snapToCodonStart(newPos);
            const end = this.snapToCodonEnd(newPos);
            for (let c = start; c <= end; c++) this.selectedCols.add(c);
          } else {
            this.selectedCols.add(newPos);
          }
          return;
        }
        const currentMin = Math.min(...Array.from(this.selectedCols));
        const currentMax = Math.max(...Array.from(this.selectedCols));
        let lo = Math.max(0, Math.min(currentMin, newPos));
        let hi = Math.min((this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets.length - 2 : Math.max(0, currentMax), Math.max(currentMax, newPos));
        
        if (this.displayMode === 'codon' || this.displayMode === 'translate') {
          lo = this.snapToCodonStart(lo);
          hi = this.snapToCodonEnd(hi);
        }
        
        this.selectedCols.clear();
        for (let c = lo; c <= hi; c++) this.selectedCols.add(c);
      };
      this.clearRectSelection = () => { this.isRectSelecting = false; this.rectStartRow = this.rectStartCol = this.rectEndRow = this.rectEndCol = null; };
      this.updateRectSelection = (r0, r1, c0, c1, orig) => {
        try {
          let rlo = Math.max(0, Math.min(r0, r1));
          let rhi = Math.min((this.alignment && this.alignment.length) ? this.alignment.length - 1 : 0, Math.max(r0, r1));
          let clo = Math.max(0, Math.min(c0, c1));
          let chi = Math.min((this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets.length - 2 : Math.max(c0, c1), Math.max(c0, c1));
          
          // Snap to codon boundaries in codon or amino acid mode
          if (this.displayMode === 'codon' || this.displayMode === 'translate') {
            clo = this.snapToCodonStart(clo);
            chi = this.snapToCodonEnd(chi);
          }
          
          if (orig) { rlo = Math.min(rlo, orig.rlo); rhi = Math.max(rhi, orig.rhi); clo = Math.min(clo, orig.clo); chi = Math.max(chi, orig.chi); }
          this.selectedRows.clear(); this.selectedCols.clear();
          for (let r = rlo; r <= rhi; r++) this.selectedRows.add(r);
          for (let c = clo; c <= chi; c++) this.selectedCols.add(c);
        } catch (_) { }
      };
      this.finalizeRectSelection = (r0, r1, c0, c1, orig) => {
        try {
          let rlo = Math.max(0, Math.min(r0, r1));
          let rhi = Math.min((this.alignment && this.alignment.length) ? this.alignment.length - 1 : 0, Math.max(r0, r1));
          let clo = Math.max(0, Math.min(c0, c1));
          let chi = Math.min((this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets.length - 2 : Math.max(c0, c1), Math.max(c0, c1));
          
          // Snap to codon boundaries in codon or amino acid mode
          if (this.displayMode === 'codon' || this.displayMode === 'translate') {
            clo = this.snapToCodonStart(clo);
            chi = this.snapToCodonEnd(chi);
          }
          
          if (orig) { rlo = Math.min(rlo, orig.rlo); rhi = Math.max(rhi, orig.rhi); clo = Math.min(clo, orig.clo); chi = Math.max(chi, orig.chi); }
          this.selectedRows.clear(); this.selectedCols.clear();
          for (let r = rlo; r <= rhi; r++) this.selectedRows.add(r);
          for (let c = clo; c <= chi; c++) this.selectedCols.add(c);
          this.anchorRow = rhi; this.anchorCol = chi;
        } catch (_) { }
      };

      // small helper to compute row/col from client coords using provided canvases
      const _rowFromClientY = (clientY) => {
        try { return this.rowFromClientY(clientY, { labelCanvas: labelCanvas, scroller: scroller, ROW_HEIGHT: (window && window.ROW_HEIGHT) ? window.ROW_HEIGHT : 20, rowCount: (this.alignment && this.alignment.length) ? this.alignment.length : 0 }); } catch (_) { return 0; }
      };
      const _colFromClientXLocal = (clientX, canvas) => {
        try {
          const rect = (canvas && canvas.getBoundingClientRect) ? canvas.getBoundingClientRect() : (seqCanvas ? seqCanvas.getBoundingClientRect() : { left: 0 });
          const x = clientX - rect.left; const scrollLeft = scroller ? scroller.scrollLeft : 0; const absX = scrollLeft + x;
          return this.colIndexFromCssOffset(absX);
        } catch (_) { return 0; }
      };

      // Header ruler — delegated to HeaderRenderer
      if (this._headerRenderer) this._headerRenderer.attachEvents();

      // Plot column selection — delegated to PlotRenderer
      if (this._plotRenderer) this._plotRenderer.attachEvents();

      // Consensus column selection — delegated to ConsensusRenderer
      if (this._consensusRenderer) this._consensusRenderer.attachEvents();

      // Sequence canvas interactions — delegated to AlignmentRenderer
      if (this._alignmentRenderer) this._alignmentRenderer.attachEvents();

      // Label canvas interactions — delegated to LabelRenderer
      if (this._labelRenderer) this._labelRenderer.attachEvents();

      // Keyboard handlers and scroller snapping/paging
      const onKeyDown = (ke) => {
        try {
          // Command+Up/Down: Move selected sequences up or down
          if (ke.metaKey && !ke.altKey && (ke.key === 'ArrowUp' || ke.key === 'ArrowDown')) {
            try { ke.preventDefault(); ke.stopImmediatePropagation(); } catch (_) { }
            
            // Check if we can reorder (must be in original order)
            const canReorder = this.alignment && this.alignment.isInOriginalOrder && this.alignment.isInOriginalOrder();
            if (!canReorder || this.selectedRows.size === 0) return;
            
            const selectedIndices = Array.from(this.selectedRows).sort((a, b) => a - b);
            const minSelected = selectedIndices[0];
            const maxSelected = selectedIndices[selectedIndices.length - 1];
            const totalRows = this.alignment ? this.alignment.length : 0;
            
            if (ke.key === 'ArrowUp') {
              // Move up: insert before position minSelected - 1
              if (minSelected > 0) {
                const newPos = minSelected - 1;
                if (this.alignment.moveSequences(selectedIndices, newPos)) {
                  // Update selection to new positions
                  this.selectedRows.clear();
                  for (let i = 0; i < selectedIndices.length; i++) {
                    this.selectedRows.add(newPos + i);
                  }
                  this.scheduleRender();
                }
              }
            } else if (ke.key === 'ArrowDown') {
              // Move down: insert before position maxSelected + 2
              if (maxSelected < totalRows - 1) {
                const newPos = maxSelected + 2;
                if (this.alignment.moveSequences(selectedIndices, newPos)) {
                  // Update selection to new positions
                  this.selectedRows.clear();
                  const insertPos = newPos - selectedIndices.length;
                  for (let i = 0; i < selectedIndices.length; i++) {
                    this.selectedRows.add(insertPos + i);
                  }
                  this.scheduleRender();
                }
              }
            }
            return;
          }
          
          // Command-A: select all columns
          if (ke.metaKey && (ke.key === 'a' || ke.code === 'KeyA')) {
            try { ke.preventDefault(); ke.stopImmediatePropagation(); } catch (_) { }
            this.selectedRows.clear(); this.clearRectSelection(); this.selectedCols.clear();
            if (this.colOffsets && this.colOffsets.length > 0) { for (let c = 0; c < this.colOffsets.length - 1; c++) this.selectedCols.add(c); }
            this.anchorCol = Math.max(0, (this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets.length - 2 : 0);
            this.scheduleRender();
            return;
          }
          // Arrow keys navigation
          if (ke.key === 'ArrowLeft' || ke.key === 'ArrowRight' || ke.key === 'ArrowUp' || ke.key === 'ArrowDown') {
            try { ke.preventDefault(); ke.stopImmediatePropagation(); } catch (_) { }
            // focus check: skip when an input is focused
            const ae = document.activeElement;
            const focusOk = (ae === document.body || ae === seqCanvas || ae === labelCanvas || ae === headerCanvas || ae === consensusCanvas || ae === overviewCanvas);
            if (!focusOk) return;
            const view = { scrollLeft: scroller ? scroller.scrollLeft : 0, scrollTop: scroller ? scroller.scrollTop : 0, viewW: scroller ? scroller.clientWidth : window.innerWidth, viewH: scroller ? scroller.clientHeight : window.innerHeight };
            const isAlt = !!ke.altKey;
            if (!isAlt) {
              if (ke.key === 'ArrowLeft') {
                const newCol = Math.max(0, this.colIndexFromCssOffset(view.scrollLeft) - 1);
                const targetLeft = (this.colOffsets && typeof this.colOffsets[newCol] !== 'undefined') ? this.colOffsets[newCol] : view.scrollLeft;
                if (scroller) scroller.scrollLeft = targetLeft;
                return;
              }
              if (ke.key === 'ArrowRight') {
                const newCol = Math.min((this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets.length - 2 : 0, this.colIndexFromCssOffset(view.scrollLeft + view.viewW - 1) + 1);
                const rightBoundary = (this.colOffsets && typeof this.colOffsets[newCol + 1] !== 'undefined') ? this.colOffsets[newCol + 1] : (this.colOffsets && this.colOffsets.length > 0 ? this.colOffsets[this.colOffsets.length - 1] : 0);
                const totalWidth = (this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets[this.colOffsets.length - 1] : 0;
                let targetLeft = Math.round(rightBoundary - view.viewW);
                targetLeft = Math.max(0, Math.min(totalWidth - view.viewW, targetLeft));
                if (scroller) scroller.scrollLeft = targetLeft;
                return;
              }
              if (ke.key === 'ArrowUp') {
                try {
                  const curTop = scroller ? scroller.scrollTop : 0;
                  const rowH = (window && window.ROW_HEIGHT) ? window.ROW_HEIGHT : 20;
                  const targetTop = Math.max(0, curTop - rowH);
                  // animate one-row scroll for visual feedback
                  this.animateScrollTo(scroller ? scroller.scrollLeft : 0, targetTop, scroller, 160);
                } catch (_) { }
                return;
              }
              if (ke.key === 'ArrowDown') {
                try {
                  const curTop = scroller ? scroller.scrollTop : 0;
                  const rowH = (window && window.ROW_HEIGHT) ? window.ROW_HEIGHT : 20;
                  const viewH = scroller ? scroller.clientHeight : window.innerHeight;
                  const maxTop = Math.max(0, (this.alignment && this.alignment.length ? this.alignment.length : 0) * rowH - viewH);
                  // non-alt ArrowDown moves one row; Alt+ArrowDown handles page scroll
                  const targetTop = Math.min(maxTop, curTop + rowH);
                  // animate one-row scroll for visual feedback
                  this.animateScrollTo(scroller ? scroller.scrollLeft : 0, targetTop, scroller, 160);
                } catch (_) { }
                return;
              }
            }
            // Alt pressed: page scroll with animation handled by the viewer
            if (isAlt) {
              if (ke.key === 'ArrowLeft') {
                const target = Math.max(0, (scroller ? scroller.scrollLeft : 0) - (scroller ? scroller.clientWidth : window.innerWidth));
                const col = this.colIndexFromCssOffset(target);
                const targetLeft = (this.colOffsets && typeof this.colOffsets[col] !== 'undefined') ? this.colOffsets[col] : (this.colOffsets && this.colOffsets.length > 0 ? this.colOffsets[0] : 0);
                this.animateScrollTo(targetLeft, scroller ? scroller.scrollTop : 0, scroller, 320); return;
              }
              if (ke.key === 'ArrowRight') {
                const target = Math.min((this.colOffsets && this.colOffsets.length > 0 ? this.colOffsets[this.colOffsets.length - 1] : 0), (scroller ? scroller.scrollLeft : 0) + (scroller ? scroller.clientWidth : window.innerWidth));
                const col = this.colIndexFromCssOffset(target);
                const targetLeft = (this.colOffsets && typeof this.colOffsets[col] !== 'undefined') ? this.colOffsets[col] : 0;
                this.animateScrollTo(targetLeft, scroller ? scroller.scrollTop : 0, scroller, 320); return;
              }
              if (ke.key === 'ArrowUp') {
                const targetTop = Math.max(0, (scroller ? scroller.scrollTop : 0) - (scroller ? scroller.clientHeight : window.innerHeight));
                this.animateScrollTo(scroller ? scroller.scrollLeft : 0, targetTop, scroller, 320); return;
              }
              if (ke.key === 'ArrowDown') {
                const maxTop = Math.max(0, (this.alignment && this.alignment.length ? this.alignment.length : 0) * (window && window.ROW_HEIGHT ? window.ROW_HEIGHT : 20) - (scroller ? scroller.clientHeight : window.innerHeight));
                const targetTop = Math.min(maxTop, (scroller ? scroller.scrollTop : 0) + (scroller ? scroller.clientHeight : window.innerHeight));
                this.animateScrollTo(scroller ? scroller.scrollLeft : 0, targetTop, scroller, 320); return;
              }
            }
          }
          // Font size shortcuts using Alt-Cmd-Plus/Minus
          const mod = ke.metaKey;
          const alt = ke.altKey;
          const isPlus = (ke.key === '+') || (ke.key === '=') || (ke.code === 'Equal') || ke.code === 'NumpadAdd';
          const isMinus = (ke.key === '-') || ke.code === 'Minus' || ke.code === 'NumpadSubtract';

          // Alt-Cmd-Plus: Increase font size
          if (mod && alt && isPlus) {
            try {
              const increaseBtn = document.getElementById('font-increase-btn');
              if (increaseBtn) increaseBtn.click();
            } catch (_) { }
            try { ke.preventDefault(); ke.stopImmediatePropagation(); } catch (_) { }
            return;
          }
          // Alt-Cmd-Minus: Decrease font size
          if (mod && alt && isMinus) {
            try {
              const decreaseBtn = document.getElementById('font-decrease-btn');
              if (decreaseBtn) decreaseBtn.click();
            } catch (_) { }
            try { ke.preventDefault(); ke.stopImmediatePropagation(); } catch (_) { }
            return;
          }

          // mask edit shortcuts using Cmd+Plus/Minus: prefer the viewer's own
          // mask-editing API, falling back to any provided callback.
          if (mod && isPlus) {
            try {
              if (typeof this.setMaskBitsForCols === 'function') {
                this.setMaskBitsForCols(this.selectedCols, '1');
              } else if (cb && typeof cb.setMaskBitsForCols === 'function') {
                cb.setMaskBitsForCols(this.selectedCols, '1');
              }
            } catch (_) { }
            try { ke.preventDefault(); ke.stopImmediatePropagation(); } catch (_) { }
            return;
          }
          if (mod && isMinus) {
            try {
              if (typeof this.setMaskBitsForCols === 'function') {
                this.setMaskBitsForCols(this.selectedCols, '0');
              } else if (cb && typeof cb.setMaskBitsForCols === 'function') {
                cb.setMaskBitsForCols(this.selectedCols, '0');
              }
            } catch (_) { }
            try { ke.preventDefault(); ke.stopImmediatePropagation(); } catch (_) { }
            return;
          }
          if (ke.code === 'Space' || ke.key === ' ') {
            const ae = document.activeElement;
            if (ae === document.body || ae === seqCanvas || ae === labelCanvas || ae === headerCanvas) { try { ke.preventDefault(); } catch (_) { } }
            this.isSpaceDown = true; this.updateSpaceCursor = this.updateSpaceCursor || (() => { try { const cur = (this.isSpaceDown && !this.isCmdDrag) ? 'grab' : ''; if (seqCanvas) seqCanvas.style.cursor = cur; } catch (_) { } }); this.updateSpaceCursor();
          }
        } catch (_) { }
      };
      const onKeyUp = (ke) => { if (ke.code === 'Space' || ke.key === ' ') { this.isSpaceDown = false; try { if (seqCanvas) seqCanvas.style.cursor = ''; } catch (_) { } } };
      const onBlur = () => { this.isSpaceDown = false; try { if (seqCanvas) seqCanvas.style.cursor = ''; } catch (_) { } };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);

      // Scroller: mirror vertical scroll if requested and handle snap debounce
      if (scroller) {
        scroller.addEventListener('scroll', () => {
          // schedule render for header/seq
          this.scheduleRender();
          // debounce snapping
          if (!this.snapEnabled) return;
          if (this._snapTimeout === null) this._snapStartLeft = scroller.scrollLeft;
          if (this._snapTimeout) clearTimeout(this._snapTimeout);
          this._snapTimeout = setTimeout(() => { this.snapScrollToChar(this._snapStartLeft, scroller); this._snapTimeout = null; }, 60);
        });
      }

      // expose a small public API for external callers
      this.getSelectedRows = () => new Set(this.selectedRows);
      this.getSelectedCols = () => new Set(this.selectedCols);
      this.setSelectedRows = (rows) => { try { this.selectedRows.clear(); for (const r of rows) this.selectedRows.add(r); this.scheduleRender(); } catch (_) { } };
      this.setSelectedCols = (cols) => { try { this.selectedCols.clear(); for (const c of cols) this.selectedCols.add(c); this.scheduleRender(); } catch (_) { } };
    }

    // Measure char width in CSS pixels using an offscreen canvas. The returned
    // value is stored in `this.charWidth` and is safe to use when computing
    // layout in CSS pixels. We avoid using backing-size values directly.
    measureCharWidthFromReal(font) {
      const ctx = this._measureCtx;
      // Reset any transform so measureText returns CSS pixel widths
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Allow callers to provide a font string; otherwise derive a reasonable
      // monospace default. We don't query computed styles here to keep this
      // initial pass safe and dependency-free.
      ctx.font = font || '12px monospace';

      // Use the letter 'M' (commonly wide for monospace) as a stable probe
      const m = ctx.measureText('M').width || 7;
      const measured = Math.max(4, Math.round(m));
      this.charWidth = measured;
      return measured;
    }

    // Measure char width using a lightweight canvas context (may be faster
    // but less exact than measureCharWidthFromReal). Updates this.charWidth
    // and also writes window.CHAR_WIDTH for compatibility. If opts.apply is
    // true the method will also rebuild colOffsets and resize backings.
    measureCharWidth(font, opts) {
      try {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = font || (window && window.FONT) ? window.FONT : '12px monospace';
        const m = ctx.measureText('W');
        const w = m && m.width ? m.width : (this.charWidth || 8);
        const val = Math.max(1, Math.ceil(w));
        this.charWidth = val;
        try { if (window) window.CHAR_WIDTH = val; } catch (_) { }
        if (opts && opts.apply) {
          try { const colOffsets = this.buildColOffsetsFor((opts && typeof opts.MASK_ENABLED === 'boolean') ? opts.MASK_ENABLED : true, opts); this.colOffsets = colOffsets; } catch (_) { }
          try { this.setCanvasCSSSizes(opts); } catch (_) { }
          try { this.resizeBackings(opts); } catch (_) { }
          try { if (typeof this.scheduleRender === 'function') this.scheduleRender(); } catch (_) { }
        }
        return val;
      } catch (e) { return this.measureCharWidthFromReal(font); }
    }

    // Measure vertical text offsets (seq and label) to compute centering offsets
    // for glyph drawing. Updates this.seqTextVertOffset and this.labelTextVertOffset
    // and also writes window.seqTextVertOffset/labelTextVertOffset for compatibility.
    measureTextVerticalOffset(opts) {
      try {
        const seqCanvas = this.seqCanvas || (document.getElementById ? document.getElementById('seq-canvas') : null);
        const labelCanvas = this.labelCanvas || (document.getElementById ? document.getElementById('labels-canvas') : null);
        const font = (opts && opts.FONT) ? opts.FONT : ((window && window.FONT) ? window.FONT : '12px monospace');
        const labelFont = (opts && opts.LABEL_FONT) ? opts.LABEL_FONT : ((this.labelFont) ? this.labelFont : font);
        const rowHeight = (opts && typeof opts.ROW_HEIGHT === 'number') ? opts.ROW_HEIGHT : ((window && typeof window.ROW_HEIGHT === 'number') ? window.ROW_HEIGHT : 20);
        try {
          if (seqCanvas) { const ctx = seqCanvas.getContext('2d'); ctx.font = font; const metrics = ctx.measureText('Mg'); if (metrics && typeof metrics.actualBoundingBoxAscent === 'number') { const ascent = metrics.actualBoundingBoxAscent; const descent = metrics.actualBoundingBoxDescent || 0; this.seqTextVertOffset = Math.round((rowHeight - (ascent + descent)) / 2 + ascent) + 1; } else { this.seqTextVertOffset = Math.round(rowHeight / 2) + 1; } }
        } catch (e) { this.seqTextVertOffset = Math.round(rowHeight / 2) + 1; }
        try {
          if (labelCanvas) { const ctx2 = labelCanvas.getContext('2d'); ctx2.font = labelFont; const metrics2 = ctx2.measureText('Mg'); if (metrics2 && typeof metrics2.actualBoundingBoxAscent === 'number') { const ascent2 = metrics2.actualBoundingBoxAscent; const descent2 = metrics2.actualBoundingBoxDescent || 0; this.labelTextVertOffset = Math.round((rowHeight - (ascent2 + descent2)) / 2 + ascent2); } else { this.labelTextVertOffset = Math.round(rowHeight / 2); } }
        } catch (e) { this.labelTextVertOffset = Math.round(rowHeight / 2); }
        try { if (window) window.seqTextVertOffset = this.seqTextVertOffset; } catch (_) { }
        try { if (window) window.labelTextVertOffset = this.labelTextVertOffset; } catch (_) { }
        return { seqTextVertOffset: this.seqTextVertOffset, labelTextVertOffset: this.labelTextVertOffset };
      } catch (e) { return null; }
    }

    // Measure font pixel heights for label and sequence and set ROW_HEIGHT on
    // the viewer and window for compatibility. If opts.apply is true, also
    // update CSS var and call setCanvasCSSSizes/resizeBackings and scheduleRender.
    measureRowHeightFromFonts(opts) {
      try {
        opts = opts || {};
        const seqCanvas = this.seqCanvas || (document.getElementById ? document.getElementById('seq-canvas') : null);
        const labelCanvas = this.labelCanvas || (document.getElementById ? document.getElementById('labels-canvas') : null);
        const font = (opts && opts.FONT) ? opts.FONT : ((window && window.FONT) ? window.FONT : '12px monospace');
        const labelFont = (opts && opts.LABEL_FONT) ? opts.LABEL_FONT : ((this.labelFont) ? this.labelFont : font);
        let seqHeight = 0, labHeight = 0;
        if (seqCanvas) { const ctx = seqCanvas.getContext('2d'); ctx.font = font; const seqMetrics = ctx.measureText('Mg'); if (seqMetrics && typeof seqMetrics.actualBoundingBoxAscent === 'number') { seqHeight = Math.ceil((seqMetrics.actualBoundingBoxAscent || 0) + (seqMetrics.actualBoundingBoxDescent || 0)); } else { const m = font.match(/(\d+)px/); const px = m ? parseInt(m[1], 10) : 14; seqHeight = Math.round(px * 1.2); } }
        if (labelCanvas) { const ctx2 = labelCanvas.getContext('2d'); ctx2.font = labelFont; const labMetrics = ctx2.measureText('Mg'); if (labMetrics && typeof labMetrics.actualBoundingBoxAscent === 'number') { labHeight = Math.ceil((labMetrics.actualBoundingBoxAscent || 0) + (labMetrics.actualBoundingBoxDescent || 0)); } else { const m2 = labelFont.match(/(\d+)px/); const px2 = m2 ? parseInt(m2[1], 10) : 14; labHeight = Math.round(px2 * 1.2); } }
        const newRow = Math.max(8, Math.ceil(Math.max(seqHeight || 0, labHeight || 0) + ((opts && typeof opts.ROW_PADDING === 'number') ? opts.ROW_PADDING : (window && typeof window.ROW_PADDING === 'number' ? window.ROW_PADDING : 6))));
        this.ROW_HEIGHT = newRow;
        try { if (window) window.ROW_HEIGHT = newRow; } catch (_) { }
        try { document.documentElement.style.setProperty('--row-height', newRow + 'px'); } catch (_) { }
        // Calculate consensus height based on sequence font
        const consensusTopPad = (opts && typeof opts.CONSENSUS_TOP_PAD !== 'undefined') ? opts.CONSENSUS_TOP_PAD : (this.CONSENSUS_TOP_PAD || 4);
        const consensusBottomPad = (opts && typeof opts.CONSENSUS_BOTTOM_PAD !== 'undefined') ? opts.CONSENSUS_BOTTOM_PAD : (this.CONSENSUS_BOTTOM_PAD || 8);
        const newConsensusHeight = Math.max(16, Math.ceil(seqHeight + consensusTopPad + consensusBottomPad));
        this.CONSENSUS_HEIGHT = newConsensusHeight;
        try { if (window) window.CONSENSUS_HEIGHT = newConsensusHeight; } catch (_) { }
        // Update vertical text offsets for the new row height and fonts
        try { this.measureTextVerticalOffset({ FONT: font, LABEL_FONT: labelFont, ROW_HEIGHT: newRow }); } catch (_) { }
        if (opts && opts.apply) {
          try { this.setCanvasCSSSizes(opts); } catch (_) { }
          try { this.resizeBackings(opts); } catch (_) { }
          try { if (typeof this.scheduleRender === 'function') this.scheduleRender(); } catch (_) { }
        }
        return newRow;
      } catch (e) { return (window && typeof window.ROW_HEIGHT === 'number') ? window.ROW_HEIGHT : 20; }
    }

    // Update font sizes by a delta amount (positive to increase, negative to decrease)
    updateFontSize(delta) {
      try {
        // Get current font sizes
        const currentSeqSize = this.fontSize || 14;
        const currentLabelSize = this.labelFontSize || 14;

        // Set initial label font size on first call
        if (this.initialLabelFontSize === null || this.initialLabelFontSize === undefined) {
          this.initialLabelFontSize = currentLabelSize;
        }

        // Calculate new sizes with bounds
        const newSeqSize = Math.max(8, Math.min(32, currentSeqSize + delta));
        let newLabelSize;

        if (delta > 0) {
          // Increasing: grow label up to initial size, then keep it capped there
          newLabelSize = Math.min(this.initialLabelFontSize, currentLabelSize + delta);
        } else {
          // Decreasing: only reduce label size once sequence size has reached label size
          if (newSeqSize >= currentLabelSize) {
            // Sequence is still larger than or equal to label - keep label size unchanged
            newLabelSize = currentLabelSize;
          } else {
            // Sequence has dropped below label - now reduce both together
            newLabelSize = Math.max(8, currentLabelSize + delta);
          }
        }

        const newSeqFont = newSeqSize + 'px monospace';
        const newLabelFont = newLabelSize + 'px monospace';

        // Update viewer's FONT properties
        this.FONT = newSeqFont;
        this.fontSize = newSeqSize;
        this.labelFont = newLabelFont;
        this.labelFontSize = newLabelSize;

        // Re-measure character width with the new sequence font
        if (typeof this.measureCharWidthFromReal === 'function') {
          this.measureCharWidthFromReal(newSeqFont);
        }

        // Re-measure row height based on both fonts
        if (typeof this.measureRowHeightFromFonts === 'function') {
          this.measureRowHeightFromFonts({
            FONT: newSeqFont,
            LABEL_FONT: newLabelFont,
            apply: true  // This will call setCanvasCSSSizes, resizeBackings, and scheduleRender
          });
        } else {
          // Fallback if measureRowHeightFromFonts doesn't exist
          if (typeof this.setCanvasCSSSizes === 'function') {
            this.setCanvasCSSSizes();
          }
          if (typeof this.resizeBackings === 'function') {
            this.resizeBackings();
          }
          if (typeof this.scheduleRender === 'function') {
            this.scheduleRender();
          }
        }

        // Rebuild column offsets with new character width
        if (typeof this.buildColOffsetsFor === 'function' && this.colOffsets) {
          const maxSeqLen = this.colOffsets.length - 1;
          this.colOffsets = this.buildColOffsetsFor(this.maskEnabled, {
            maxSeqLen: maxSeqLen,
            CHAR_WIDTH: this.charWidth,
            EXPANDED_RIGHT_PAD: this.EXPANDED_RIGHT_PAD || 2,
            REDUCED_COL_WIDTH: this.REDUCED_COL_WIDTH || 1,
            HIDDEN_MARKER_WIDTH: this.HIDDEN_MARKER_WIDTH || 4,
            hideMode: this.hideMode || false,
            maskStr: (window && window.maskStr) || (window && window.mask) || null
          });
        }

        // Update window properties for compatibility
        try { window.FONT_SIZE = newSeqSize; } catch (_) { }
        try { window.FONT = newSeqFont; } catch (_) { }
        try { window.LABEL_FONT_SIZE = newLabelSize; } catch (_) { }
        try { window.LABEL_FONT = newLabelFont; } catch (_) { }

        console.info('Font sizes set to - sequence:', newSeqSize, 'label:', newLabelSize);
      } catch (e) { console.warn('updateFontSize failed', e); }
    }

    // Reset font sizes to default values
    resetFontSize() {
      try {
        const defaultSeqSize = 14;
        const defaultLabelSize = 14;

        const defaultSeqFont = defaultSeqSize + 'px monospace';
        const defaultLabelFont = defaultLabelSize + 'px monospace';

        // Reset initial label font size tracker
        this.initialLabelFontSize = defaultLabelSize;

        // Update viewer's FONT properties
        this.FONT = defaultSeqFont;
        this.fontSize = defaultSeqSize;
        this.labelFont = defaultLabelFont;
        this.labelFontSize = defaultLabelSize;

        // Re-measure character width with the default font
        if (typeof this.measureCharWidthFromReal === 'function') {
          this.measureCharWidthFromReal(defaultSeqFont);
        }

        // Re-measure row height based on both fonts
        if (typeof this.measureRowHeightFromFonts === 'function') {
          this.measureRowHeightFromFonts({
            FONT: defaultSeqFont,
            LABEL_FONT: defaultLabelFont,
            apply: true
          });
        } else {
          // Fallback if measureRowHeightFromFonts doesn't exist
          if (typeof this.setCanvasCSSSizes === 'function') {
            this.setCanvasCSSSizes();
          }
          if (typeof this.resizeBackings === 'function') {
            this.resizeBackings();
          }
          if (typeof this.scheduleRender === 'function') {
            this.scheduleRender();
          }
        }

        // Rebuild column offsets with default character width
        if (typeof this.buildColOffsetsFor === 'function' && this.colOffsets) {
          const maxSeqLen = this.colOffsets.length - 1;
          this.colOffsets = this.buildColOffsetsFor(this.maskEnabled, {
            maxSeqLen: maxSeqLen,
            CHAR_WIDTH: this.charWidth,
            EXPANDED_RIGHT_PAD: this.EXPANDED_RIGHT_PAD || 2,
            REDUCED_COL_WIDTH: this.REDUCED_COL_WIDTH || 1,
            HIDDEN_MARKER_WIDTH: this.HIDDEN_MARKER_WIDTH || 4,
            hideMode: this.hideMode || false,
            maskStr: (window && window.maskStr) || (window && window.mask) || null
          });
        }

        // Update window properties
        try { window.FONT_SIZE = defaultSeqSize; } catch (_) { }
        try { window.FONT = defaultSeqFont; } catch (_) { }
        try { window.LABEL_FONT_SIZE = defaultLabelSize; } catch (_) { }
        try { window.LABEL_FONT = defaultLabelFont; } catch (_) { }

        console.info('Font sizes reset to defaults - sequence:', defaultSeqSize, 'label:', defaultLabelSize);
      } catch (e) { console.warn('resetFontSize failed', e); }
    }

    // Set CSS sizes for the canvases and spacer elements. Accepts optional
    // overrides in opts: { LABEL_WIDTH, ROW_HEIGHT }
    setCanvasCSSSizes(opts) {
      try {
        opts = opts || {};
        const labelCanvas = this.labelCanvas || (opts && opts.labelCanvas) || (document.getElementById ? document.getElementById('labels-canvas') : null);
        const seqCanvas = this.seqCanvas || (opts && opts.seqCanvas) || (document.getElementById ? document.getElementById('seq-canvas') : null);
        const headerCanvas = this.headerCanvas || (opts && opts.headerCanvas) || (document.getElementById ? document.getElementById('header-canvas') : null);
        const overviewCanvas = this.overviewCanvas || (opts && opts.overviewCanvas) || (document.getElementById ? document.getElementById('overview-canvas') : null);
        const consensusCanvas = this.consensusCanvas || (opts && opts.consensusCanvas) || (document.getElementById ? document.getElementById('consensus-canvas') : null);
        const labelFilterBox = this.labelFilterBox || (opts && opts.labelFilterBox) || (document.getElementById ? document.getElementById('label-filter-box') : null);
        const labelsHeaderDiv = this.labelsHeaderDiv || (opts && opts.labelsHeaderDiv) || (document.getElementById ? document.getElementById('labels-header-div') : null);
        const labelsConsensusCanvas = this.labelsConsensusCanvas || (opts && opts.labelsConsensusCanvas) || (document.getElementById ? document.getElementById('labels-consensus-canvas') : null);
        const seqSpacer = this.seqSpacer || (opts && opts.seqSpacer) || (document.getElementById ? document.getElementById('seq-spacer') : null);
        const leftSpacer = this.leftSpacer || (opts && opts.leftSpacer) || (document.getElementById ? document.getElementById('left-spacer') : null);
        const scroller = this.scroller || (opts && opts.scroller) || (document.getElementById ? document.getElementById('alignment-scroll') : null);

        // Resolve label width in this priority order:
        // 1. opts.LABEL_WIDTH (explicit call override)
        // 2. this.LABEL_WIDTH (viewer instance, e.g. dragged value)
        // 3. window.LABEL_WIDTH (legacy global)
        // 4. CSS variable --label-width (document-level stylesheet)
        // 5. fallback default 260
        let labelWidth;
        if (typeof opts.LABEL_WIDTH === 'number') labelWidth = opts.LABEL_WIDTH;
        else if (typeof this.LABEL_WIDTH === 'number') labelWidth = this.LABEL_WIDTH;
        else if (window && typeof window.LABEL_WIDTH === 'number') labelWidth = window.LABEL_WIDTH;
        else {
          try {
            const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--label-width') || '';
            const parsed = parseInt(cssVal.replace('px', '').trim(), 10);
            labelWidth = Number.isFinite(parsed) && parsed > 0 ? parsed : 260;
          } catch (_) { labelWidth = 260; }
        }
        const rowHeight = (typeof opts.ROW_HEIGHT === 'number') ? opts.ROW_HEIGHT : ((window && typeof window.ROW_HEIGHT === 'number') ? window.ROW_HEIGHT : 20);

        if (labelCanvas) labelCanvas.style.width = labelWidth + 'px';
        try { if (labelCanvas) { labelCanvas.style.position = labelCanvas.style.position || 'absolute'; labelCanvas.style.left = '0px'; labelCanvas.style.top = '0px'; labelCanvas.style.zIndex = '1'; } } catch (_) { }

        const viewportHeight = Math.max(1, (scroller && scroller.clientHeight) ? scroller.clientHeight : window.innerHeight);
        const viewportWidth = Math.max(1, (scroller && scroller.clientWidth) ? scroller.clientWidth : window.innerWidth);
        const totalHeight = (this.alignment && this.alignment.length) ? this.alignment.length * rowHeight : (window && typeof window.rowCount === 'number' ? window.rowCount * rowHeight : 0);

        if (labelCanvas) labelCanvas.style.height = viewportHeight + 'px';
        // ensure spacer width is set from current colOffsets if available
        try { if (seqSpacer) { const totalWidth = (this.colOffsets && this.colOffsets.length) ? this.colOffsets[this.colOffsets.length - 1] : Math.max(1, (window && typeof window.maxSeqLen === 'number' ? window.maxSeqLen : 0) * ((this.charWidth || 8) + 2)); seqSpacer.style.width = totalWidth + 'px'; seqSpacer.style.display = 'block'; seqSpacer.style.height = totalHeight + 'px'; } } catch (_) { }
        if (leftSpacer) leftSpacer.style.height = totalHeight + 'px';

        if (seqCanvas) { seqCanvas.style.position = 'absolute'; seqCanvas.style.left = '0px'; seqCanvas.style.top = '0px'; seqCanvas.style.zIndex = '1'; seqCanvas.style.height = viewportHeight + 'px'; seqCanvas.style.width = viewportWidth + 'px'; }
        if (headerCanvas) { headerCanvas.style.width = viewportWidth + 'px'; headerCanvas.style.height = Math.round((window && window.HEADER_HEIGHT) ? window.HEADER_HEIGHT : 30) + 'px'; }
        if (overviewCanvas) { const parentW = (overviewCanvas.parentElement && overviewCanvas.parentElement.clientWidth) ? overviewCanvas.parentElement.clientWidth : viewportWidth; const scrollbarWidth = scroller ? Math.max(0, scroller.offsetWidth - scroller.clientWidth) : 0; const hdrW = Math.max(1, parentW - scrollbarWidth); overviewCanvas.style.width = hdrW + 'px'; overviewCanvas.style.height = Math.round((window && window.OVERVIEW_HEIGHT) ? window.OVERVIEW_HEIGHT : 48) + 'px'; }
        if (consensusCanvas) { const parentWc = (consensusCanvas.parentElement && consensusCanvas.parentElement.clientWidth) ? consensusCanvas.parentElement.clientWidth : viewportWidth; const scrollbarWidthc = scroller ? Math.max(0, scroller.offsetWidth - scroller.clientWidth) : 0; const cssWc = Math.max(1, parentWc - scrollbarWidthc); consensusCanvas.style.width = cssWc + 'px'; consensusCanvas.style.height = (window && window.CONSENSUS_HEIGHT) ? window.CONSENSUS_HEIGHT + 'px' : '20px'; }
        const plotCanvasEl = this.plotCanvas || (document.getElementById ? document.getElementById('plot-canvas') : null);
        if (plotCanvasEl) { const pWc = (plotCanvasEl.parentElement && plotCanvasEl.parentElement.clientWidth) ? plotCanvasEl.parentElement.clientWidth : viewportWidth; const pSbW = scroller ? Math.max(0, scroller.offsetWidth - scroller.clientWidth) : 0; const pCssW = Math.max(1, pWc - pSbW); const plotH = this.PLOT_HEIGHT != null ? this.PLOT_HEIGHT : 40; plotCanvasEl.style.width = pCssW + 'px'; plotCanvasEl.style.height = plotH + 'px'; }
        if (labelFilterBox) { labelFilterBox.style.width = labelWidth + 'px'; }
        if (labelsHeaderDiv) { labelsHeaderDiv.style.width = labelWidth + 'px'; labelsHeaderDiv.style.height = Math.round((window && window.HEADER_HEIGHT) ? window.HEADER_HEIGHT : 30) + 'px'; }
        const labelsPlotDiv = this.labelsPlotDiv || (document.getElementById ? document.getElementById('labels-plot-div') : null);
        if (labelsPlotDiv) { labelsPlotDiv.style.width = labelWidth + 'px'; labelsPlotDiv.style.height = (this.PLOT_HEIGHT != null ? this.PLOT_HEIGHT : 40) + 'px'; }
        const labelsConsensusDiv = this.labelsConsensusDiv || (opts && opts.labelsConsensusDiv) || (document.getElementById ? document.getElementById('labels-consensus-div') : null);
        if (labelsConsensusDiv) { labelsConsensusDiv.style.width = labelWidth + 'px'; labelsConsensusDiv.style.height = (window && window.CONSENSUS_HEIGHT) ? window.CONSENSUS_HEIGHT + 'px' : '20px'; }

        // Update CSS custom properties for dynamic heights
        const overviewHeight = (window && window.OVERVIEW_HEIGHT) ? window.OVERVIEW_HEIGHT : 48;
        const headerHeight = (window && window.HEADER_HEIGHT) ? window.HEADER_HEIGHT : 30;
        const consensusHeight = (window && window.CONSENSUS_HEIGHT) ? window.CONSENSUS_HEIGHT : 20;
        const plotHeight = this.PLOT_HEIGHT != null ? this.PLOT_HEIGHT : 40;
        try {
          const root = document.documentElement;
          if (root) {
            root.style.setProperty('--overview-height', overviewHeight + 'px');
            root.style.setProperty('--header-height', headerHeight + 'px');
            root.style.setProperty('--plot-height', plotHeight + 'px');
            root.style.setProperty('--consensus-height', consensusHeight + 'px');
          } 
        } catch (_) { }

        // Update alignment div position to account for dynamic header heights
        const alignmentDiv = this.alignmentDiv || (document.getElementById ? document.getElementById('alignment') : null);
        if (alignmentDiv) {
          const totalHeaderHeight = overviewHeight + headerHeight + plotHeight + consensusHeight;
          alignmentDiv.style.marginTop = totalHeaderHeight + 'px';
          alignmentDiv.style.height = 'calc(100% - ' + totalHeaderHeight + 'px)';
        }
      } catch (e) { console.warn('SealionViewer.setCanvasCSSSizes failed', e); }
    }

    // Resize backing store pixels for canvases and apply DPR transform
    resizeBackings(opts) {
      try {
        opts = opts || {};
        const pr = window.devicePixelRatio || 1; // keep viewer.pr maybe stale
        const scroller = this.scroller || (opts && opts.scroller) || (document.getElementById ? document.getElementById('alignment-scroll') : null);
        const seqCanvas = this.seqCanvas || (opts && opts.seqCanvas) || (document.getElementById ? document.getElementById('seq-canvas') : null);
        const labelCanvas = this.labelCanvas || (opts && opts.labelCanvas) || (document.getElementById ? document.getElementById('labels-canvas') : null);
        const headerCanvas = this.headerCanvas || (opts && opts.headerCanvas) || (document.getElementById ? document.getElementById('header-canvas') : null);
        const overviewCanvas = this.overviewCanvas || (opts && opts.overviewCanvas) || (document.getElementById ? document.getElementById('overview-canvas') : null);
        const consensusCanvas = this.consensusCanvas || (opts && opts.consensusCanvas) || (document.getElementById ? document.getElementById('consensus-canvas') : null);
        const labelsConsensusCanvas = this.labelsConsensusCanvas || (opts && opts.labelsConsensusCanvas) || (document.getElementById ? document.getElementById('labels-consensus-canvas') : null);

        const viewportHeight = Math.max(1, (scroller && scroller.clientHeight) ? scroller.clientHeight : window.innerHeight);
        const viewportWidth = Math.max(1, (scroller && scroller.clientWidth) ? scroller.clientWidth : window.innerWidth);

        // Resolve label width same as in setCanvasCSSSizes so backing follows CSS/instance value
        let backingLabelWidth;
        if (opts && typeof opts.LABEL_WIDTH === 'number') backingLabelWidth = opts.LABEL_WIDTH;
        else if (typeof this.LABEL_WIDTH === 'number') backingLabelWidth = this.LABEL_WIDTH;
        else if (window && typeof window.LABEL_WIDTH === 'number') backingLabelWidth = window.LABEL_WIDTH;
        else {
          try { const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--label-width') || ''; const parsed = parseInt(cssVal.replace('px', '').trim(), 10); backingLabelWidth = Number.isFinite(parsed) && parsed > 0 ? parsed : 260; } catch (_) { backingLabelWidth = 260; }
        }
        if (labelCanvas) { labelCanvas.width = Math.max(1, Math.round(backingLabelWidth * pr)); labelCanvas.height = Math.max(1, Math.round(viewportHeight * pr)); try { labelCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { } }
        if (seqCanvas) { seqCanvas.width = Math.max(1, Math.round(viewportWidth * pr)); seqCanvas.height = Math.max(1, Math.round(viewportHeight * pr)); try { seqCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { } }
        if (headerCanvas) { headerCanvas.width = Math.max(1, Math.round(viewportWidth * pr)); headerCanvas.height = Math.max(1, Math.round(((window && typeof window.HEADER_HEIGHT === 'number') ? window.HEADER_HEIGHT : 30) * pr)); try { headerCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { } }
        if (overviewCanvas) { const parentW = (overviewCanvas.parentElement && overviewCanvas.parentElement.clientWidth) ? overviewCanvas.parentElement.clientWidth : viewportWidth; const scrollbarWidth = scroller ? Math.max(0, scroller.offsetWidth - scroller.clientWidth) : 0; const hdrCssW = Math.max(1, parentW - scrollbarWidth); overviewCanvas.width = Math.max(1, Math.round(hdrCssW * pr)); overviewCanvas.height = Math.max(1, Math.round(((window && typeof window.OVERVIEW_HEIGHT === 'number') ? window.OVERVIEW_HEIGHT : 48) * pr)); try { overviewCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { } }
        if (consensusCanvas) { const parentWc = (consensusCanvas.parentElement && consensusCanvas.parentElement.clientWidth) ? consensusCanvas.parentElement.clientWidth : viewportWidth; const scrollbarWidthc = scroller ? Math.max(0, scroller.offsetWidth - scroller.clientWidth) : 0; const hdrCssWc = Math.max(1, parentWc - scrollbarWidthc); consensusCanvas.width = Math.max(1, Math.round(hdrCssWc * pr)); consensusCanvas.height = Math.max(1, Math.round(((window && typeof window.CONSENSUS_HEIGHT === 'number') ? window.CONSENSUS_HEIGHT : 20) * pr)); try { consensusCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { } }
        const plotCanvasB = this.plotCanvas || (document.getElementById ? document.getElementById('plot-canvas') : null);
        if (plotCanvasB) { const pWcB = (plotCanvasB.parentElement && plotCanvasB.parentElement.clientWidth) ? plotCanvasB.parentElement.clientWidth : viewportWidth; const pSbB = scroller ? Math.max(0, scroller.offsetWidth - scroller.clientWidth) : 0; const pCssWB = Math.max(1, pWcB - pSbB); const plotHB = this.PLOT_HEIGHT != null ? this.PLOT_HEIGHT : 40; plotCanvasB.width = Math.max(1, Math.round(pCssWB * pr)); plotCanvasB.height = Math.max(1, Math.round(plotHB * pr)); try { plotCanvasB.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { } }
        // labelsHeaderDiv is now a div, not a canvas, so no backing resize needed
        // labelsConsensusDiv is now a div, not a canvas, so no backing resize needed

        // Invalidate overview cache when canvas size changes
        this.invalidateOverviewCache();
        
        // ensure integer geometry
        this.enforceIntegerGeometry();
      } catch (e) { console.warn('SealionViewer.resizeBackings failed', e); }
    }

    // Enforce integer CSS/backing geometry and reapply DPR transforms
    enforceIntegerGeometry() {
      try {
        const pr = window.devicePixelRatio || 1;
        const scroller = this.scroller || document.getElementById('alignment-scroll');
        const viewportHeight = Math.max(1, (scroller && scroller.clientHeight) ? scroller.clientHeight : window.innerHeight);
        const viewportWidth = Math.max(1, (scroller && scroller.clientWidth) ? scroller.clientWidth : window.innerWidth);
        const labelCanvas = this.labelCanvas || document.getElementById('labels-canvas');
        const seqCanvas = this.seqCanvas || document.getElementById('seq-canvas');
        const headerCanvas = this.headerCanvas || document.getElementById('header-canvas');
        const labelsHeaderDiv = this.labelsHeaderDiv || document.getElementById('labels-header-div');
        const seqSpacer = this.seqSpacer || document.getElementById('seq-spacer');
        const leftSpacer = this.leftSpacer || document.getElementById('left-spacer');

        if (labelCanvas) { labelCanvas.style.position = labelCanvas.style.position || 'absolute'; labelCanvas.style.left = '0px'; labelCanvas.style.top = '0px'; }
        if (seqCanvas) { seqCanvas.style.position = seqCanvas.style.position || 'absolute'; seqCanvas.style.left = '0px'; seqCanvas.style.top = '0px'; }
        if (labelCanvas) labelCanvas.style.height = viewportHeight + 'px';
        if (seqCanvas) seqCanvas.style.height = viewportHeight + 'px';
        if (seqCanvas) seqCanvas.style.width = viewportWidth + 'px';
        if (headerCanvas) headerCanvas.style.width = viewportWidth + 'px';
        if (labelsHeaderDiv) labelsHeaderDiv.style.height = Math.round(((window && typeof window.HEADER_HEIGHT === 'number') ? window.HEADER_HEIGHT : 30)) + 'px';
        if (seqSpacer) seqSpacer.style.height = ((this.alignment && this.alignment.length) ? this.alignment.length * ((window && typeof window.ROW_HEIGHT === 'number') ? window.ROW_HEIGHT : 20) : 0) + 'px';
        if (leftSpacer) leftSpacer.style.height = ((this.alignment && this.alignment.length) ? this.alignment.length * ((window && typeof window.ROW_HEIGHT === 'number') ? window.ROW_HEIGHT : 20) : 0) + 'px';

        // backing pixels
        // Resolve label width for backing exactly the same way as setCanvasCSSSizes
        let finalLabelWidth;
        if (typeof this.LABEL_WIDTH === 'number') finalLabelWidth = this.LABEL_WIDTH;
        else if (window && typeof window.LABEL_WIDTH === 'number') finalLabelWidth = window.LABEL_WIDTH;
        else {
          try { const cssVal = getComputedStyle(document.documentElement).getPropertyValue('--label-width') || ''; const parsed = parseInt(cssVal.replace('px', '').trim(), 10); finalLabelWidth = Number.isFinite(parsed) && parsed > 0 ? parsed : 260; } catch (_) { finalLabelWidth = 260; }
        }
        if (labelCanvas) labelCanvas.width = Math.max(1, Math.round(finalLabelWidth * pr));
        if (labelCanvas) labelCanvas.height = Math.max(1, Math.round(viewportHeight * pr));
        if (seqCanvas) seqCanvas.width = Math.max(1, Math.round(viewportWidth * pr));
        if (seqCanvas) seqCanvas.height = Math.max(1, Math.round(viewportHeight * pr));
        if (headerCanvas) headerCanvas.width = Math.max(1, Math.round(viewportWidth * pr));
        if (headerCanvas) headerCanvas.height = Math.max(1, Math.round(((window && typeof window.HEADER_HEIGHT === 'number') ? window.HEADER_HEIGHT : 30) * pr));
        // labelsHeaderDiv is now a div, not a canvas, so no backing resize needed

        try { if (labelCanvas) labelCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { }
        try { if (seqCanvas) seqCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { }
        try { if (headerCanvas) headerCanvas.getContext('2d').setTransform(pr, 0, 0, pr, 0, 0); } catch (_) { }

        // ensure scrollTop/clamp is maintained by the app
        try { if (typeof window.clampScrollPositions === 'function') window.clampScrollPositions(); } catch (_) { }
      } catch (e) { console.warn('SealionViewer.enforceIntegerGeometry failed', e); }
    }

    // layout diagnostics removed

    // Ensure a canvas has a DPR-correct backing and that its 2D context is
    // transformed so future drawing code may operate in CSS pixels.
    // Returns the 2D context ready for drawing in CSS pixels.
    ensureCanvasBacking(canvas) {
      if (!canvas) throw new Error('ensureCanvasBacking: canvas is required');
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(0.5, rect.width || 0);
      const cssH = Math.max(0.5, rect.height || 0);

      const backingW = Math.max(1, Math.round(cssW * this.pr));
      const backingH = Math.max(1, Math.round(cssH * this.pr));

      if (canvas.width !== backingW || canvas.height !== backingH) {
        canvas.width = backingW;
        canvas.height = backingH;
        // Preserve CSS pixel sizing explicitly
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
      }

      const ctx = canvas.getContext('2d');
      // Map drawing to CSS pixels: apply devicePixelRatio transform once
      ctx.setTransform(this.pr, 0, 0, this.pr, 0, 0);
      return ctx;
    }

    // Helper: Parse GenBank-style CDS coordinates into array of {start, end, frame} objects
    // Handles simple coordinates like "470..2689" and complex join() coordinates
    // Frame is calculated as (start - 1) % 3 + 1, giving frames 1, 2, or 3
    parseCDSCoordinates(coordinateString) {
      if (!coordinateString || typeof coordinateString !== 'string') return [];
      
      const results = [];
      
      // Handle join(...) syntax
      if (coordinateString.startsWith('join(') && coordinateString.endsWith(')')) {
        const inner = coordinateString.slice(5, -1); // Remove 'join(' and ')'
        const parts = inner.split(',');
        for (const part of parts) {
          const match = part.trim().match(/^(\d+)\.\.(\d+)$/);
          if (match) {
            const start = parseInt(match[1], 10);
            const end = parseInt(match[2], 10);
            // GenBank coordinates are 1-based, so frame = (start - 1) % 3 + 1
            const frame = ((start - 1) % 3) + 1;
            results.push({ start, end, frame });
          }
        }
      } else {
        // Simple coordinate like "470..2689"
        const match = coordinateString.match(/^(\d+)\.\.(\d+)$/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = parseInt(match[2], 10);
          const frame = ((start - 1) % 3) + 1;
          results.push({ start, end, frame });
        }
      }
      
      return results;
    }
    // opts: { CHAR_WIDTH, EXPANDED_RIGHT_PAD, selectedCols }
    drawColumnSelectionOverlay(target, visible, opts) {
      try {
        let ctx;
        if (!target) return;
        if (typeof target.getContext === 'function') {
          ctx = this.ensureCanvasBacking(target);
        } else if (target && typeof target.save === 'function') {
          ctx = target; // assume it's already a 2D context transformed to CSS pixels
        } else {
          return;
        }
        const charWidth = (opts && typeof opts.CHAR_WIDTH === 'number') ? opts.CHAR_WIDTH : (this.charWidth || 8);
        const expandedRightPad = (opts && typeof opts.EXPANDED_RIGHT_PAD === 'number') ? opts.EXPANDED_RIGHT_PAD : 2;
        const selectedCols = (opts && opts.selectedCols) ? opts.selectedCols : (window && window.selectedCols) ? window.selectedCols : new Set();
        // Prefer column offsets passed in opts during migration; fall back to instance offsets
        const colOffsets = (opts && opts.colOffsets) ? opts.colOffsets : (this.colOffsets || []);
        const pr = this.pr || (window.devicePixelRatio || 1);
        const cssH = (ctx.canvas && ctx.canvas.getBoundingClientRect) ? ctx.canvas.getBoundingClientRect().height : (ctx.canvas ? ctx.canvas.height / pr : 0);
        ctx.save();
        ctx.fillStyle = this.SEQ_COL_SELECTION;
        
        // In codon or translate mode, group selections by codon and draw entire codon boxes
        // (but not in native amino acid mode where each position is independent)
        if ((this.displayMode === 'codon' || this.displayMode === 'translate') && this.dataType === 'nucleotide') {
          const frame = this.readingFrame || 1;
          const drawnCodons = new Set();
          
          for (const c of selectedCols) {
            if (c < (visible && typeof visible.rawFirstCol === 'number' ? visible.rawFirstCol : 0) - 1 || c > (visible && typeof visible.rawLastCol === 'number' ? visible.rawLastCol : 0) + 1) continue;
            
            // Find the codon this column belongs to
            const codonStart = this.snapToCodonStart(c);
            
            // Only draw each codon once
            if (drawnCodons.has(codonStart)) continue;
            drawnCodons.add(codonStart);
            
            // Draw the entire codon box
            const codonEnd = codonStart + 2;
            const leftOff = (typeof colOffsets[codonStart] !== 'undefined') ? colOffsets[codonStart] : (codonStart * (charWidth + expandedRightPad));
            const rightOff = (typeof colOffsets[codonEnd + 1] !== 'undefined') ? colOffsets[codonEnd + 1] : ((typeof colOffsets[codonEnd] !== 'undefined' ? colOffsets[codonEnd] : (codonEnd * (charWidth + expandedRightPad))) + charWidth + expandedRightPad);
            const x = leftOff - (visible && visible.scrollLeft ? visible.scrollLeft : 0);
            const w = Math.max(1, rightOff - leftOff);
            ctx.fillRect(x, 0, w, cssH);
          }
        } else {
          // Normal mode: draw each column individually
          for (const c of selectedCols) {
            if (c < (visible && typeof visible.rawFirstCol === 'number' ? visible.rawFirstCol : 0) - 1 || c > (visible && typeof visible.rawLastCol === 'number' ? visible.rawLastCol : 0) + 1) continue;
            const leftOff = (typeof colOffsets[c] !== 'undefined') ? colOffsets[c] : (c * (charWidth + expandedRightPad));
            const rightOff = (typeof colOffsets[c + 1] !== 'undefined') ? colOffsets[c + 1] : (leftOff + charWidth + expandedRightPad);
            const x = leftOff - (visible && visible.scrollLeft ? visible.scrollLeft : 0);
            const w = Math.max(1, rightOff - leftOff);
            ctx.fillRect(x, 0, w, cssH);
          }
        }
        
        ctx.restore();
      } catch (e) { /* tolerate overlay errors */ }
    }

    // Build a prefix-sum column offsets array for `numCols` columns where each
    // column has width `colWidth` (in CSS pixels). Resulting array has
    // length numCols+1 where colOffsets[i] is the CSS-left for column i.
    buildColOffsets(numCols, colWidth) {
      const w = Math.max(1, colWidth || this.charWidth || 8);
      const offsets = new Array((numCols || 0) + 1);
      let s = 0;
      for (let i = 0; i <= numCols; i++) {
        offsets[i] = s;
        s += (i < numCols) ? w : 0;
      }
      this.colOffsets = offsets;
      return offsets;
    }

    // Build column offsets taking mask/compression into account.
    // maskEnabled: boolean, opts may provide { maxSeqLen, CHAR_WIDTH, EXPANDED_RIGHT_PAD, REDUCED_COL_WIDTH, maskStr }
    // Returns an array of length maxSeqLen+1 with CSS pixel left offsets.
    buildColOffsetsFor(maskEnabled, opts) {
      try {
        opts = opts || {};
        const maxSeqLen = (typeof opts.maxSeqLen === 'number') ? opts.maxSeqLen : Math.max(0, (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : 0);
        const charWidth = (typeof opts.CHAR_WIDTH === 'number') ? opts.CHAR_WIDTH : (this.charWidth || 8);
        const expandedRightPad = (typeof opts.EXPANDED_RIGHT_PAD === 'number') ? opts.EXPANDED_RIGHT_PAD : 2;
        const reducedColWidth = (typeof opts.REDUCED_COL_WIDTH === 'number') ? opts.REDUCED_COL_WIDTH : ((window && typeof window.REDUCED_COL_WIDTH === 'number') ? window.REDUCED_COL_WIDTH : 1);
        const hiddenMarkerWidth = (typeof opts.HIDDEN_MARKER_WIDTH === 'number') ? opts.HIDDEN_MARKER_WIDTH : (this.HIDDEN_MARKER_WIDTH || 4);
        const maskStr = (typeof opts.maskStr === 'string') ? opts.maskStr : ((window && typeof window.maskStr === 'string') ? window.maskStr : null);
        const hideMode = (typeof opts.hideMode === 'boolean') ? opts.hideMode : (this.hideMode || false);

        const out = new Array(Math.max(1, maxSeqLen + 1)).fill(0);
        out[0] = 0;
        
        if (hideMode && maskEnabled && maskStr) {
          // Hide mode: collapsed regions get near-zero width except for central marker
          let inCollapsedRegion = false;
          let regionStart = -1;
          
          for (let i = 0; i < maxSeqLen; i++) {
            const isCollapsed = maskStr.charAt(i) === '0';
            
            if (isCollapsed && !inCollapsedRegion) {
              // Start of collapsed region
              inCollapsedRegion = true;
              regionStart = i;
            } else if (!isCollapsed && inCollapsedRegion) {
              // End of collapsed region - place marker at center
              const regionEnd = i - 1;
              const regionMid = Math.floor((regionStart + regionEnd) / 2);
              
              // Backfill collapsed region with minimal widths
              for (let j = regionStart; j <= regionEnd; j++) {
                const w = (j === regionMid) ? hiddenMarkerWidth : 0;
                out[j + 1] = out[j] + w;
              }
              
              inCollapsedRegion = false;
              regionStart = -1;
            }
            
            if (!isCollapsed) {
              // Expanded column
              const w = charWidth + expandedRightPad;
              out[i + 1] = out[i] + w;
            }
          }
          
          // Handle case where collapsed region extends to end
          if (inCollapsedRegion) {
            const regionEnd = maxSeqLen - 1;
            const regionMid = Math.floor((regionStart + regionEnd) / 2);
            
            for (let j = regionStart; j <= regionEnd; j++) {
              const w = (j === regionMid) ? hiddenMarkerWidth : 0;
              out[j + 1] = out[j] + w;
            }
          }
        } else {
          // Normal mode: collapsed columns have reducedColWidth
          for (let i = 0; i < maxSeqLen; i++) {
            const useReduced = !!maskEnabled && maskStr && maskStr.charAt(i) === '0';
            const w = useReduced ? reducedColWidth : (charWidth + expandedRightPad);
            out[i + 1] = out[i] + w;
          }
        }
        
        return out;
      } catch (e) {
        // fallback to uniform offsets
        const w = (this.charWidth || 8) + 2;
        const maxSeqLen = (opts && typeof opts.maxSeqLen === 'number') ? opts.maxSeqLen : 0;
        const offs = new Array(Math.max(1, maxSeqLen + 1)); let s = 0; for (let i = 0; i <= maxSeqLen; i++) { offs[i] = s; s += (i < maxSeqLen) ? w : 0; } return offs;
      }
    }

    // Compute visible region given a scroller and options.
    // opts may provide: { ROW_HEIGHT, BUFFER_ROWS, BUFFER_COLS, CHAR_WIDTH, maxSeqLen, rowCount, seqSpacer }
    // Returns an object similar to the legacy computeVisible() in script.js
    computeVisible(scroller, opts) {
      try {
        opts = opts || {};
        const rowHeight = (typeof opts.ROW_HEIGHT === 'number') ? opts.ROW_HEIGHT : ((window && typeof window.ROW_HEIGHT === 'number') ? window.ROW_HEIGHT : 20);
        const bufferRows = (typeof opts.BUFFER_ROWS === 'number') ? opts.BUFFER_ROWS : ((window && typeof window.BUFFER_ROWS === 'number') ? window.BUFFER_ROWS : 2);
        const bufferCols = (typeof opts.BUFFER_COLS === 'number') ? opts.BUFFER_COLS : ((window && typeof window.BUFFER_COLS === 'number') ? window.BUFFER_COLS : 5);
        const charWidth = (typeof opts.CHAR_WIDTH === 'number') ? opts.CHAR_WIDTH : (this.charWidth || 8);
        const maxSeqLen = (typeof opts.maxSeqLen === 'number') ? opts.maxSeqLen : Math.max(0, (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : 0);
        const rowCount = (typeof opts.rowCount === 'number') ? opts.rowCount : ((this.alignment && this.alignment.length) ? this.alignment.length : ((window && typeof window.rowCount === 'number') ? window.rowCount : 0));
        const viewH = scroller ? scroller.clientHeight : (window && window.innerHeight) ? window.innerHeight : 0;
        const viewW = scroller ? scroller.clientWidth : (window && window.innerWidth) ? window.innerWidth : 0;
        const scrollTop = scroller ? scroller.scrollTop : 0;
        const scrollLeft = scroller ? scroller.scrollLeft : 0;

        const firstRowNoBuffer = Math.max(0, Math.floor(scrollTop / rowHeight));
        const lastRowNoBuffer = Math.min(rowCount - 1, Math.floor((scrollTop + viewH) / rowHeight));
        let firstRow = Math.max(0, firstRowNoBuffer - bufferRows);
        let lastRow = Math.min(rowCount - 1, lastRowNoBuffer + bufferRows);

        // Ensure offsets exist before computing columns; persist computed offsets
        const colOffsets = this.colOffsets && this.colOffsets.length ? this.colOffsets : this.buildColOffsetsFor((opts && !!opts.MASK_ENABLED) ? opts.MASK_ENABLED : true, opts);
        try { if ((!this.colOffsets || this.colOffsets.length === 0) && colOffsets && colOffsets.length) this.colOffsets = colOffsets; } catch (_) { }

        // compute raw first/last columns via binary search helper
        const rawFirstCol = this.colIndexFromCssOffset(scrollLeft);
        const rawLastCol = this.colIndexFromCssOffset(scrollLeft + viewW - 1);

        const leftBuffer = (rawFirstCol >= bufferCols) ? bufferCols : 0;
        const rightBuffer = bufferCols;
        const firstCol = Math.max(0, rawFirstCol - leftBuffer);
        const lastCol = Math.min(maxSeqLen - 1, rawLastCol + rightBuffer);

        return { firstRow, lastRow, firstCol, lastCol, rawFirstCol, rawLastCol, viewW, viewH, scrollLeft, scrollTop, firstRowNoBuffer, lastRowNoBuffer };
      } catch (e) { return { firstRow: 0, lastRow: 0, firstCol: 0, lastCol: 0, rawFirstCol: 0, rawLastCol: 0, viewW: 0, viewH: 0, scrollLeft: 0, scrollTop: 0, firstRowNoBuffer: 0, lastRowNoBuffer: 0 }; }
    }

    // Compute constant mask: delegates to alignment instance
    computeConstantMask() {
      if (!this.alignment || typeof this.alignment.computeConstantMask !== 'function') {
        console.error('SealionViewer.computeConstantMask: alignment object with computeConstantMask method required');
        return '1'.repeat(Math.max(0, (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : 0));
      }
      return this.alignment.computeConstantMask();
    }

    // Compute consensus sequence: delegates to alignment instance
    computeConsensusSequence() {
      if (!this.alignment || typeof this.alignment.computeConsensusSequence !== 'function') {
        console.error('SealionViewer.computeConsensusSequence: alignment object with computeConsensusSequence method required');
        return 'N'.repeat(Math.max(0, (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : 0));
      }
      return this.alignment.computeConsensusSequence();
    }

    // Compute constant mask treating 'N' as ambiguous: delegates to alignment instance
    computeConstantMaskAllowN() {
      if (!this.alignment || typeof this.alignment.computeConstantMaskAllowN !== 'function') {
        console.error('SealionViewer.computeConstantMaskAllowN: alignment object with computeConstantMaskAllowN method required');
        return '1'.repeat(Math.max(0, (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : 0));
      }
      return this.alignment.computeConstantMaskAllowN();
    }

    // Compute constant mask treating 'N' and gaps '-' as ambiguous: delegates to alignment instance
    computeConstantMaskAllowNAndGaps() {
      if (!this.alignment || typeof this.alignment.computeConstantMaskAllowNAndGaps !== 'function') {
        console.error('SealionViewer.computeConstantMaskAllowNAndGaps: alignment object with computeConstantMaskAllowNAndGaps method required');
        return '1'.repeat(Math.max(0, (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : 0));
      }
      return this.alignment.computeConstantMaskAllowNAndGaps();
    }

    // Find sequence matches using regex or literal pattern.
    // Returns array of {row, startCol, endCol, matchText} sorted by row then startCol.
    findSequenceMatches(query) {
      try {
        if (!query || !this.alignment) return [];
        // Try to compile as regex; fall back to literal match
        let regex;
        try {
          regex = new RegExp(query, 'gi');
        } catch (e) {
          regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }
        const matches = [];
        const rows = this.alignment;
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const row = rows[rowIdx];
          if (!row) continue;
          const seqStr = row.sequence ? String(row.sequence) : '';
          if (!seqStr) continue;
          regex.lastIndex = 0;
          let m;
          while ((m = regex.exec(seqStr)) !== null) {
            matches.push({ row: rowIdx, startCol: m.index, endCol: m.index + m[0].length - 1, matchText: m[0] });
            if (m[0].length === 0) regex.lastIndex++; // avoid infinite loop on zero-length match
          }
        }
        return matches;
      } catch (e) { console.warn('SealionViewer.findSequenceMatches failed', e); return []; }
    }

    // Legacy: find matches by row (label or sequence contains query). Returns array of row indices.
    findMatches(q) {
      try {
        if (!q) return [];
        const ql = String(q).toLowerCase();
        const rows = this.alignment || (window && window.rows) || [];
        const matches = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if ((r && r.label && String(r.label).toLowerCase().includes(ql)) || (r && r.sequence && String(r.sequence).toLowerCase().includes(ql))) { matches.push(i); }
        }
        return matches;
      } catch (e) { console.warn('SealionViewer.findMatches failed', e); return []; }
    }

    // Perform a sequence search. Finds all matches, starts navigation from (startRow, startCol).
    // searchMatches entries are {row, startCol, endCol, matchText}.
    performSearch(query, startRow, startCol) {
      try {
        if (!query || !query.trim()) {
          this.searchMatches = [];
          this.currentMatchIndex = -1;
          this.scheduleRender && this.scheduleRender();
          return 0;
        }

        this.searchQuery = query;
        this.searchMatches = this.findSequenceMatches(query);
        const count = this.searchMatches.length;

        if (count === 0) {
          this.currentMatchIndex = -1;
          console.info(`No matches found for "${query}"`);
          this.scheduleRender && this.scheduleRender();
          return 0;
        }

        // Find first match at or after (startRow, startCol)
        let idx = 0;
        if (startRow !== undefined && startRow !== null) {
          const sr = startRow;
          const sc = startCol !== undefined && startCol !== null ? startCol : 0;
          let found = false;
          for (let i = 0; i < this.searchMatches.length; i++) {
            const m = this.searchMatches[i];
            if (m.row > sr || (m.row === sr && m.startCol >= sc)) {
              idx = i;
              found = true;
              break;
            }
          }
          if (!found) idx = 0; // wrap around
        }

        this.currentMatchIndex = idx;
        this._navigateToMatch(idx);
        console.info(`Found ${count} match${count !== 1 ? 'es' : ''} for "${query}" (at match ${idx + 1})`);
        return count;
      } catch (e) { console.warn('SealionViewer.performSearch failed', e); return 0; }
    }

    // Navigate to a specific match index
    _navigateToMatch(idx) {
      try {
        const match = this.searchMatches && this.searchMatches[idx];
        if (!match) return;
        if (typeof this.setSelectedRows === 'function') this.setSelectedRows([match.row]);
        if (typeof this.setSelectedCols === 'function') {
          const cols = [];
          for (let c = match.startCol; c <= match.endCol; c++) cols.push(c);
          this.setSelectedCols(cols);
        }
        this._scrollToRow(match.row);
        this._scrollToCol(match.startCol, match.endCol);
        if (typeof this.scheduleRender === 'function') this.scheduleRender();
      } catch (e) { console.warn('SealionViewer._navigateToMatch failed', e); }
    }

    // Navigate to the next search match (wraps around to beginning)
    nextMatch() {
      try {
        if (!this.searchMatches || this.searchMatches.length === 0) {
          console.warn('No search matches available. Perform a search first.');
          return;
        }

        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
        this._navigateToMatch(this.currentMatchIndex);
        console.info(`Match ${this.currentMatchIndex + 1} of ${this.searchMatches.length}`);
      } catch (e) { console.warn('SealionViewer.nextMatch failed', e); }
    }

    // Navigate to the previous search match (wraps around to end)
    previousMatch() {
      try {
        if (!this.searchMatches || this.searchMatches.length === 0) {
          console.warn('No search matches available. Perform a search first.');
          return;
        }

        this.currentMatchIndex = (this.currentMatchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
        this._navigateToMatch(this.currentMatchIndex);
        console.info(`Match ${this.currentMatchIndex + 1} of ${this.searchMatches.length}`);
      } catch (e) { console.warn('SealionViewer.previousMatch failed', e); }
    }

    // Helper: scroll to a specific row (centers it in viewport)
    _scrollToRow(rowIndex) {
      try {
        const rowHeight = this.ROW_HEIGHT || 20;
        const scroller = this.scroller;
        if (scroller) {
          const targetTop = rowIndex * rowHeight;
          const viewportHeight = scroller.clientHeight || 0;
          scroller.scrollTop = Math.max(0, targetTop - viewportHeight / 2);
        }
      } catch (e) { console.warn('SealionViewer._scrollToRow failed', e); }
    }

    // Helper: scroll horizontally so that the column range [startCol, endCol] is visible
    _scrollToCol(startCol, endCol) {
      try {
        const scroller = this.scroller;
        if (!scroller) return;
        let targetLeft = 0;
        if (this.colOffsets && this.colOffsets.length > startCol) {
          targetLeft = this.colOffsets[startCol];
        } else {
          // Estimate using charWidth
          const cw = this.charWidth || (this.opts && this.opts.charWidth) || 10;
          targetLeft = startCol * cw;
        }
        const viewportWidth = scroller.clientWidth || 0;
        const newScrollLeft = Math.max(0, targetLeft - viewportWidth / 3);
        // Only scroll if the column is out of view
        const currentLeft = scroller.scrollLeft;
        let matchEndLeft = targetLeft;
        if (this.colOffsets && endCol !== undefined && this.colOffsets.length > endCol + 1) {
          matchEndLeft = this.colOffsets[endCol + 1];
        }
        const isVisible = currentLeft <= targetLeft && matchEndLeft <= currentLeft + viewportWidth;
        if (!isVisible) scroller.scrollLeft = newScrollLeft;
      } catch (e) { console.warn('SealionViewer._scrollToCol failed', e); }
    }

    // Helper: show CDS tooltip
    _showCDSTooltip(clientX, clientY, cdsData) {
      try {
        // Create tooltip element if it doesn't exist
        if (!this._cdsTooltip) {
          this._cdsTooltip = document.createElement('div');
          this._cdsTooltip.id = 'cds-tooltip';
          this._cdsTooltip.style.position = 'fixed';
          this._cdsTooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          this._cdsTooltip.style.color = '#ffffff';
          this._cdsTooltip.style.padding = '8px 12px';
          this._cdsTooltip.style.borderRadius = '4px';
          this._cdsTooltip.style.fontSize = '12px';
          this._cdsTooltip.style.fontFamily = 'sans-serif';
          this._cdsTooltip.style.pointerEvents = 'none';
          this._cdsTooltip.style.zIndex = '10000';
          this._cdsTooltip.style.maxWidth = '300px';
          this._cdsTooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          this._cdsTooltip.style.lineHeight = '1.4';
          document.body.appendChild(this._cdsTooltip);
        }
        
        // Build tooltip content
        let html = '';
        if (cdsData.gene) {
          html += `<div style="font-weight: bold; margin-bottom: 4px;">${cdsData.gene}</div>`;
        }
        if (cdsData.product) {
          html += `<div style="margin-bottom: 4px;">${cdsData.product}</div>`;
        }
        if (cdsData.coordinates) {
          html += `<div style="font-size: 10px; color: #aaa;">${cdsData.coordinates}</div>`;
        }
        if (cdsData.function) {
          html += `<div style="font-size: 10px; color: #ccc; margin-top: 4px; font-style: italic;">${cdsData.function}</div>`;
        }
        
        this._cdsTooltip.innerHTML = html;
        
        // Position tooltip near cursor, but keep it on screen
        const offsetX = 15;
        const offsetY = 15;
        let left = clientX + offsetX;
        let top = clientY + offsetY;
        
        // Make sure tooltip is visible first to get dimensions
        this._cdsTooltip.style.display = 'block';
        
        // Adjust position if tooltip would go off screen
        const tooltipRect = this._cdsTooltip.getBoundingClientRect();
        if (left + tooltipRect.width > window.innerWidth) {
          left = clientX - tooltipRect.width - offsetX;
        }
        if (top + tooltipRect.height > window.innerHeight) {
          top = clientY - tooltipRect.height - offsetY;
        }
        
        this._cdsTooltip.style.left = left + 'px';
        this._cdsTooltip.style.top = top + 'px';
      } catch (e) {
        console.warn('SealionViewer._showCDSTooltip failed', e);
      }
    }

    // Helper: hide CDS tooltip
    _hideCDSTooltip() {
      try {
        if (this._cdsTooltip) {
          this._cdsTooltip.style.display = 'none';
        }
      } catch (e) {
        console.warn('SealionViewer._hideCDSTooltip failed', e);
      }
    }

    // Helper: select all columns in a CDS coordinate range
    _selectCDSRange(cdsData) {
      try {
        if (!cdsData || !cdsData.coordinates) return;
        
        // Parse the coordinates to get all segments
        const segments = this.parseCDSCoordinates(cdsData.coordinates);
        if (!segments || segments.length === 0) return;
        
        // Clear current selection and select all columns in all segments
        if (!this.selectedCols) {
          this.selectedCols = new Set();
        } else {
          this.selectedCols.clear();
        }
        
        // Add all columns from all segments to selection
        for (const segment of segments) {
          // Convert 1-based GenBank coordinates to 0-based column indices
          const startCol = segment.start - 1;
          const endCol = segment.end - 1;
          
          // Add all columns in this segment
          for (let col = startCol; col <= endCol; col++) {
            this.selectedCols.add(col);
          }
        }
        
        // Update window.selectedCols if it exists
        try {
          if (window) {
            window.selectedCols = this.selectedCols;
          }
        } catch (_) { }
        
        // Trigger redraw to show selection
        this.scheduleRender();
        
        // Log selection info
        const geneName = cdsData.gene || 'CDS';
        const totalSelected = this.selectedCols.size;
        console.info(`Selected ${totalSelected} columns in ${geneName} (${cdsData.coordinates})`);
        
      } catch (e) {
        console.warn('SealionViewer._selectCDSRange failed', e);
      }
    }

    // Map a CSS-pixel x offset (relative to the canvas left) to a column index.
    // Uses binary search on this.colOffsets. Returns an integer column index
    // clamped to [0, numCols-1].
    colIndexFromCssOffset(cssX) {
      const offsets = this.colOffsets;
      let lo = 0, hi = offsets.length - 1;
      if (hi <= 0) return 0;
      if (cssX <= offsets[0]) return 0;
      if (cssX >= offsets[hi]) return hi - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid] <= cssX && cssX < offsets[mid + 1]) return mid;
        if (cssX < offsets[mid]) hi = mid - 1;
        else lo = mid + 1;
      }
      return Math.max(0, Math.min(offsets.length - 2, lo));
    }

    // Map a clientY (page/client coordinate) to a row index.
    // opts may include: { labelCanvas, scroller, ROW_HEIGHT, rowCount }
    rowFromClientY(clientY, opts) {
      try {
        const labelCanvas = (opts && opts.labelCanvas) ? opts.labelCanvas : (document.getElementById ? document.getElementById('labels-canvas') : null);
        const scroller = (opts && opts.scroller) ? opts.scroller : (document.getElementById ? document.getElementById('alignment-scroll') : null);
        const rowHeight = (opts && typeof opts.ROW_HEIGHT === 'number') ? opts.ROW_HEIGHT : (window && typeof window.ROW_HEIGHT === 'number' ? window.ROW_HEIGHT : 20);
        const rowCount = (opts && typeof opts.rowCount === 'number') ? opts.rowCount : (window && typeof window.rowCount === 'number' ? window.rowCount : 0);
        if (!labelCanvas) return 0;
        const rect = labelCanvas.getBoundingClientRect();
        const y = clientY - rect.top; // css pixels within canvas
        const scrollTop = scroller ? scroller.scrollTop : (window && window.scrollTop ? window.scrollTop : 0);
        const absY = scrollTop + y;
        let row = Math.floor(absY / rowHeight);
        if (row < 0) row = 0;
        if (rowCount && row >= rowCount) row = Math.max(0, rowCount - 1);
        return row;
      } catch (e) { return 0; }
    }

    // Request a render on the next animation frame.
    scheduleRender() {
      if (this._needsRender) return;
      this._needsRender = true;
      this._rafHandle = requestAnimationFrame(() => {
        this._needsRender = false;
        this._rafHandle = null;
        this.drawAll();
      });
    }

    // Placeholder drawAll implementation. In staged migration we'll replace
    // this with the real drawing functions ported from `script.js`.
    drawAll() {
      console.time('drawAll');
      try {
        // Update label canvas cursor based on whether drag-drop is allowed
        if (this.labelCanvas) {
          const canDrag = this.alignment && this.alignment.isInOriginalOrder && this.alignment.isInOriginalOrder();
          if (canDrag) {
            this.labelCanvas.classList.add('draggable');
          } else {
            this.labelCanvas.classList.remove('draggable');
          }
        }

        // Calculate maxSeqLen once for this render (fallback if colOffsets not available)
        let maxSeqLen;
        if (this.colOffsets && this.colOffsets.length) {
          maxSeqLen = this.colOffsets.length - 1;
        } else if (this.alignment) {
          maxSeqLen = 0;
          for (let i = 0; i < this.alignment.length; i++) {
            const r = this.alignment[i];
            if (r && r.sequence) {
              const len = r.sequence.length;
              if (len > maxSeqLen) maxSeqLen = len;
            }
          }
        } else {
          maxSeqLen = 0;
        }

        // compute visible region using the viewer's scroller and instance settings
        const vis = this.computeVisible(this.scroller, { ROW_HEIGHT: this.ROW_HEIGHT, BUFFER_ROWS: this.BUFFER_ROWS, BUFFER_COLS: this.BUFFER_COLS, CHAR_WIDTH: this.charWidth, maxSeqLen: maxSeqLen, rowCount: (this.alignment ? this.alignment.length : 0), maskEnabled: !!this.maskEnabled });

        // refresh reference string/index if helper exists
        let refStr = null, refIndex = null;
        try { const _r = (window && window.refreshRefStr) ? window.refreshRefStr() : { refStr: null, refIndex: null }; refStr = _r.refStr; refIndex = _r.refIndex; } catch (_) { refStr = null; refIndex = null; }
        // Persist so renderers can read via this.refStr / this.refIndex
        this.refStr   = refStr;
        this.refIndex = typeof refIndex === 'number' ? refIndex : null;

        // mask string
        let maskStr = this.maskStr || (window && window.maskStr) || (window && window.mask) || null;

        // gather common opts
        const commonOpts = {
          colOffsets: this.colOffsets || [],
          maxSeqLen: maxSeqLen,
          CHAR_WIDTH: this.charWidth,
          EXPANDED_RIGHT_PAD: this.EXPANDED_RIGHT_PAD,
          maskStr: maskStr,
          maskEnabled: !!this.maskEnabled,
          hideMode: !!this.hideMode,
          HIDDEN_MARKER_COLOR: this.HIDDEN_MARKER_COLOR,
          BASE_COLORS: this.BASE_COLORS,
          DEFAULT_BASE_COLOR: this.DEFAULT_BASE_COLOR,
          aminoAcidMode: !!this.aminoAcidMode,
          codonMode: !!this.codonMode,
          readingFrame: this.readingFrame || 1,
          AA_COLORS: this.AA_COLORS,
          DEFAULT_AA_COLOR: this.DEFAULT_AA_COLOR
        };

        // draw headers/overview/consensus/labels/sequences in safe guards
        //try { this.drawLabelsOutline(this.labelsOutlineCanvas, vis, { LABEL_FONT: this.labelFont }); } catch (e) { console.error('SealionViewer.drawLabelsOutline failed', e); }
        //try { this.drawLabelsHeader(this.labelsHeaderCanvas, vis, { HEADER_FONT: this.HEADER_FONT, HEADER_HEIGHT: this.HEADER_HEIGHT, labelTextVertOffset: this.labelTextVertOffset, ROW_HEIGHT: this.ROW_HEIGHT, LABEL_FONT: this.labelFont, CONSENSUS_TOP_PAD: this.CONSENSUS_TOP_PAD, CONSENSUS_BOTTOM_PAD: this.CONSENSUS_BOTTOM_PAD, CONSENSUS_HEIGHT: this.CONSENSUS_HEIGHT }); } catch (e) { console.error('SealionViewer.drawLabelsHeader failed', e); }
        // labelsConsensusDiv is now a UI container, not a canvas to draw on
        
        // Get CDS array for genome structure display
        // Strategy: Keep displaying CDS from the last reference genome that was loaded,
        // unless the user explicitly selects a different reference genome
        let refGenomeCDS = null;
        try {
          const displayedType = window && window.displayedReferenceType;
          const displayedAccession = window && window.displayedReferenceAccession;
          
          // If a reference genome is currently displayed, use it
          if (displayedType === 'reference' && displayedAccession && this.alignment) {
            const refGenome = this.alignment.getReferenceGenome ? this.alignment.getReferenceGenome(displayedAccession) : null;
            if (refGenome && refGenome.cds && Array.isArray(refGenome.cds)) {
              refGenomeCDS = refGenome.cds;
              // Remember this for future draws
              this._lastRefGenomeCDS = refGenomeCDS;
              this._lastRefGenomeAccession = displayedAccession;
            }
          }
          // If no reference genome is displayed but we have a remembered one, keep using it
          // (i.e., user switched to consensus or selected sequence)
          else if (this._lastRefGenomeCDS && this._lastRefGenomeAccession) {
            // Verify the reference genome still exists
            if (this.alignment && this.alignment.getReferenceGenome) {
              const refGenome = this.alignment.getReferenceGenome(this._lastRefGenomeAccession);
              if (refGenome && refGenome.cds && Array.isArray(refGenome.cds)) {
                refGenomeCDS = this._lastRefGenomeCDS;
              } else {
                // Reference genome was removed, clear memory
                this._lastRefGenomeCDS = null;
                this._lastRefGenomeAccession = null;
              }
            }
          }
        } catch (_) { refGenomeCDS = null; }
        
        try { this._overviewRenderer.render(vis); } catch (e) { console.error('SealionViewer: OverviewRenderer.render failed', e); }
        try { this._headerRenderer.render(vis); } catch (e) { console.error('SealionViewer: HeaderRenderer.render failed', e); }
        try { this._plotRenderer.render(vis); } catch (e) { console.error('SealionViewer: PlotRenderer.render failed', e); }
        try { this._consensusRenderer.render(vis); } catch (e) { console.error('SealionViewer: ConsensusRenderer.render failed', e); }
        try { this._labelRenderer.render(vis); } catch (e) { console.error('SealionViewer: LabelRenderer.render failed', e); }
        try { this._alignmentRenderer.render(vis); } catch (e) { console.error('SealionViewer: AlignmentRenderer.render failed', e); }
      } catch (e) { console.error('SealionViewer.drawAll failed', e); }
      console.timeEnd('drawAll');
    }

    // Small helper to cancel any pending RAF
    cancelRender() {
      if (this._rafHandle) {
        cancelAnimationFrame(this._rafHandle);
        this._rafHandle = null;
      }
      this._needsRender = false;
    }

    // Animate scrolling of a given scroller element. Accepts pixel targets
    // (CSS pixels) and a scroller DOM element. If scroller is not provided,
    // tries to use the document alignment scroll element.
    animateScrollTo(targetLeft, targetTop, scroller, duration = 300) {
      const sc = scroller || (document.getElementById ? document.getElementById('alignment-scroll') : null);
      if (!sc) return;
      if (this._scrollAnimRequest) { cancelAnimationFrame(this._scrollAnimRequest); this._scrollAnimRequest = null; }
      const startLeft = sc.scrollLeft;
      const startTop = sc.scrollTop;
      const totalWidth = (this.colOffsets && this.colOffsets.length > 0) ? this.colOffsets[this.colOffsets.length - 1] : 0;
      const wantLeft = (typeof targetLeft === 'number') ? Math.max(0, Math.min(targetLeft, Math.max(0, totalWidth - (sc ? sc.clientWidth : 0)))) : startLeft;
      // Compute vertical bounds using this.alignment when available; fall back to window.rowCount
      const rowCount = (this.alignment && this.alignment.length) ? this.alignment.length : (window && typeof window.rowCount === 'number' ? window.rowCount : 0);
      const rowHeight = (window && typeof window.ROW_HEIGHT === 'number') ? window.ROW_HEIGHT : 20;
      const maxTop = Math.max(0, rowCount * rowHeight - (sc ? sc.clientHeight : window.innerHeight));
      const wantTop = (typeof targetTop === 'number') ? Math.max(0, Math.min(targetTop, maxTop)) : startTop;
      const deltaLeft = wantLeft - startLeft;
      const deltaTop = wantTop - startTop;
      const start = performance.now();
      const that = this;
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) * (1 - t);
        if (Math.abs(deltaLeft) > 0.5) sc.scrollLeft = Math.round(startLeft + deltaLeft * eased);
        if (Math.abs(deltaTop) > 0.5) sc.scrollTop = Math.round(startTop + deltaTop * eased);
        if (t < 1) { that._scrollAnimRequest = requestAnimationFrame(tick); } else { that._scrollAnimRequest = null; }
      }
      this._scrollAnimRequest = requestAnimationFrame(tick);
    }

    // Snap the scroller to a nearby column boundary. Mirrors the legacy
    // `snapScrollToChar` behaviour but uses the viewer's `colOffsets`.
    snapScrollToChar(startLeft, scroller) {
      const sc = scroller || (document.getElementById ? document.getElementById('alignment-scroll') : null);
      if (!sc) return;
      const cur = sc.scrollLeft || 0;
      const offsets = this.colOffsets || [];
      const maxSeqLen = Math.max(0, offsets.length - 1);
      const charWidth = this.charWidth || 8;
      // fallback to character-grid snap when offsets not available
      if (!offsets || offsets.length < 2) {
        let target;
        if (cur > startLeft) target = Math.ceil(cur / charWidth) * charWidth;
        else if (cur < startLeft) target = Math.floor(cur / charWidth) * charWidth;
        else target = Math.round(cur / charWidth) * charWidth;
        if (target !== cur) { if (sc) sc.scrollLeft = target; }
        return;
      }
      let target = cur;
      if (cur > startLeft) {
        const idx = this.colIndexFromCssOffset(cur);
        target = offsets[Math.min(maxSeqLen, idx + 1)];
      } else if (cur < startLeft) {
        const idx = this.colIndexFromCssOffset(cur);
        target = offsets[idx];
      } else {
        const idx = this.colIndexFromCssOffset(cur);
        const leftB = offsets[idx];
        const rightB = offsets[idx + 1] || (leftB + charWidth);
        target = (cur - leftB) < (rightB - cur) ? leftB : rightB;
      }
      if (target !== cur) { if (sc) sc.scrollLeft = target; }
    }

    // Update the global `mask` string for a set of columns and animate the
    // transition of `colOffsets` to reflect the edited mask. This method
    // centralizes mask edits inside the viewer so interaction handlers can
    // call it directly without needing a separate callback in script.js.
    // colsSet: Set<number> | Array<number>
    setMaskBitsForCols(colsSet, bitChar) {
      try {
        const colsArr = (colsSet && typeof colsSet.size === 'number') ? Array.from(colsSet) : (Array.isArray(colsSet) ? colsSet.slice() : []);
        if (!colsArr || colsArr.length === 0) { console.info('mask edit: no columns selected'); return; }
        // normalize existing mask
        let cur = (typeof window.mask !== 'undefined' && window.mask) ? String(window.mask) : null;
        if (!cur || cur.length < (this.colOffsets && this.colOffsets.length ? this.colOffsets.length - 1 : 0)) {
          const maxSeq = (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : Math.max(0, (window && typeof window.maxSeqLen === 'number' ? window.maxSeqLen : 0));
          cur = (cur || '') + '1'.repeat(Math.max(0, maxSeq - (cur ? cur.length : 0)));
        }
        // ensure exact length
        const maxLen = (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : (window && typeof window.maxSeqLen === 'number' ? window.maxSeqLen : 0);
        if (cur.length > maxLen) cur = cur.slice(0, maxLen);
        const arr = cur.split('');
        const cols = colsArr.filter(c => Number.isFinite(c) && c >= 0 && c < maxLen).sort((a, b) => a - b);
        if (cols.length === 0) { console.info('mask edit: no valid columns in selection'); return; }
        for (const c of cols) arr[c] = bitChar;
        const newMask = arr.join('');
        try { window.mask = newMask; window.maskStr = newMask; this.maskStr = newMask; } catch (_) { }
        // animate to the current maskEnabled preference
        try { this.startMaskTransition(!!this.maskEnabled); } catch (_) { }
      } catch (e) { console.warn('SealionViewer.setMaskBitsForCols failed', e); }
    }

    // Find the next column (to the right) that has a difference from the reference
    // sequence. If selectedRows is provided, only consider differences in those rows.
    // Ignores 'N' and '-' characters.
    // Returns the column index or -1 if no difference found.
    findNextDifference(fromCol, refStr, selectedRows) {
      try {
        if (!this.alignment || !refStr) return -1;
        
        const maxSeqLen = this.colOffsets ? this.colOffsets.length - 1 : 0;
        const startCol = Math.max(0, fromCol + 1);
        
        // Determine which rows to check
        const rowsToCheck = selectedRows && selectedRows.size > 0 
          ? Array.from(selectedRows) 
          : Array.from({ length: this.alignment.length }, (_, i) => i);
        
        // Search from startCol to the end
        for (let col = startCol; col < maxSeqLen; col++) {
          const refChar = refStr.charAt(col);
          if (refChar === 'N' || refChar === '-') continue;
          
          // Check if any of the rows to check have a difference at this column
          for (const rowIdx of rowsToCheck) {
            const row = this.alignment[rowIdx];
            if (!row || !row.sequence) continue;
            
            const seqChar = row.sequence.charAt(col);
            if (seqChar === 'N' || seqChar === '-') continue;
            
            if (seqChar !== refChar) {
              return col;
            }
          }
        }
        
        return -1; // No difference found
      } catch (e) {
        console.warn('findNextDifference failed', e);
        return -1;
      }
    }

    // Find the previous column (to the left) that has a difference from the reference
    // sequence. If selectedRows is provided, only consider differences in those rows.
    // Ignores 'N' and '-' characters.
    // Returns the column index or -1 if no difference found.
    findPreviousDifference(fromCol, refStr, selectedRows) {
      try {
        if (!this.alignment || !refStr) return -1;
        
        const startCol = Math.min(fromCol - 1, (this.colOffsets ? this.colOffsets.length - 2 : 0));
        
        // Determine which rows to check
        const rowsToCheck = selectedRows && selectedRows.size > 0 
          ? Array.from(selectedRows) 
          : Array.from({ length: this.alignment.length }, (_, i) => i);
        
        // Search from startCol backwards to the beginning
        for (let col = startCol; col >= 0; col--) {
          const refChar = refStr.charAt(col);
          if (refChar === 'N' || refChar === '-') continue;
          
          // Check if any of the rows to check have a difference at this column
          for (const rowIdx of rowsToCheck) {
            const row = this.alignment[rowIdx];
            if (!row || !row.sequence) continue;
            
            const seqChar = row.sequence.charAt(col);
            if (seqChar === 'N' || seqChar === '-') continue;
            
            if (seqChar !== refChar) {
              return col;
            }
          }
        }
        
        return -1; // No difference found
      } catch (e) {
        console.warn('findPreviousDifference failed', e);
        return -1;
      }
    }

    // Jump to the next difference site: select the column, center it horizontally,
    // and scroll to the first row with a difference at that column.
    jumpToNextDifference(refStr) {
      try {
        if (!this.alignment || !refStr) {
          console.warn('jumpToNextDifference: no alignment or reference');
          return;
        }
        
        // Get current column (use first selected column or 0)
        const selectedCols = this.getSelectedCols ? this.getSelectedCols() : (this.selectedCols || new Set());
        const currentCol = selectedCols.size > 0 ? Math.max(...Array.from(selectedCols)) : -1;
        
        // Get selected rows (if any)
        const selectedRows = this.getSelectedRows ? this.getSelectedRows() : (this.selectedRows || new Set());
        
        // Find next difference
        const nextCol = this.findNextDifference(currentCol, refStr, selectedRows);
        
        if (nextCol === -1) {
          console.info('No more differences found to the right');
          return;
        }
        
        // Select the column
        if (this.selectedCols) {
          this.selectedCols.clear();
          this.selectedCols.add(nextCol);
        }
        this.anchorCol = nextCol;
        
        // Find the first row with a difference at this column
        let firstDiffRow = -1;
        const refChar = refStr.charAt(nextCol);
        const rowsToCheck = selectedRows.size > 0 
          ? Array.from(selectedRows) 
          : Array.from({ length: this.alignment.length }, (_, i) => i);
        
        for (const rowIdx of rowsToCheck) {
          const row = this.alignment[rowIdx];
          if (!row || !row.sequence) continue;
          
          const seqChar = row.sequence.charAt(nextCol);
          if (seqChar === 'N' || seqChar === '-') continue;
          
          if (seqChar !== refChar) {
            firstDiffRow = rowIdx;
            break;
          }
        }
        
        // Scroll to center the column horizontally
        if (this.scroller && this.colOffsets) {
          const colLeft = this.colOffsets[nextCol] || 0;
          const colRight = this.colOffsets[nextCol + 1] || colLeft;
          const colCenter = (colLeft + colRight) / 2;
          const targetScrollLeft = Math.max(0, colCenter - this.scroller.clientWidth / 2);
          this.scroller.scrollLeft = targetScrollLeft;
        }
        
        // Only scroll vertically if no rows are selected (searching all sequences)
        // When rows are selected, keep the current vertical scroll position
        if (firstDiffRow !== -1 && this.scroller && selectedRows.size === 0) {
          const rowHeight = this.ROW_HEIGHT || (window && window.ROW_HEIGHT) || 20;
          const targetScrollTop = firstDiffRow * rowHeight;
          this.scroller.scrollTop = targetScrollTop;
        }
        
        // Render
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
        
        console.info('Jumped to next difference at column', nextCol, 'row', firstDiffRow);
      } catch (e) {
        console.warn('jumpToNextDifference failed', e);
      }
    }

    // Jump to the previous difference site: select the column, center it horizontally,
    // and scroll to the first row with a difference at that column.
    jumpToPreviousDifference(refStr) {
      try {
        if (!this.alignment || !refStr) {
          console.warn('jumpToPreviousDifference: no alignment or reference');
          return;
        }
        
        // Get current column (use first selected column or max)
        const selectedCols = this.getSelectedCols ? this.getSelectedCols() : (this.selectedCols || new Set());
        const maxSeqLen = this.colOffsets ? this.colOffsets.length - 1 : 0;
        const currentCol = selectedCols.size > 0 ? Math.min(...Array.from(selectedCols)) : maxSeqLen;
        
        // Get selected rows (if any)
        const selectedRows = this.getSelectedRows ? this.getSelectedRows() : (this.selectedRows || new Set());
        
        // Find previous difference
        const prevCol = this.findPreviousDifference(currentCol, refStr, selectedRows);
        
        if (prevCol === -1) {
          console.info('No more differences found to the left');
          return;
        }
        
        // Select the column
        if (this.selectedCols) {
          this.selectedCols.clear();
          this.selectedCols.add(prevCol);
        }
        this.anchorCol = prevCol;
        
        // Find the first row with a difference at this column
        let firstDiffRow = -1;
        const refChar = refStr.charAt(prevCol);
        const rowsToCheck = selectedRows.size > 0 
          ? Array.from(selectedRows) 
          : Array.from({ length: this.alignment.length }, (_, i) => i);
        
        for (const rowIdx of rowsToCheck) {
          const row = this.alignment[rowIdx];
          if (!row || !row.sequence) continue;
          
          const seqChar = row.sequence.charAt(prevCol);
          if (seqChar === 'N' || seqChar === '-') continue;
          
          if (seqChar !== refChar) {
            firstDiffRow = rowIdx;
            break;
          }
        }
        
        // Scroll to center the column horizontally
        if (this.scroller && this.colOffsets) {
          const colLeft = this.colOffsets[prevCol] || 0;
          const colRight = this.colOffsets[prevCol + 1] || colLeft;
          const colCenter = (colLeft + colRight) / 2;
          const targetScrollLeft = Math.max(0, colCenter - this.scroller.clientWidth / 2);
          this.scroller.scrollLeft = targetScrollLeft;
        }
        
        // Only scroll vertically if no rows are selected (searching all sequences)
        // When rows are selected, keep the current vertical scroll position
        if (firstDiffRow !== -1 && this.scroller && selectedRows.size === 0) {
          const rowHeight = this.ROW_HEIGHT || (window && window.ROW_HEIGHT) || 20;
          const targetScrollTop = firstDiffRow * rowHeight;
          this.scroller.scrollTop = targetScrollTop;
        }
        
        // Render
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
        
        console.info('Jumped to previous difference at column', prevCol, 'row', firstDiffRow);
      } catch (e) {
        console.warn('jumpToPreviousDifference failed', e);
      }
    }

    // Animate mask transition (interpolate colOffsets between current and
    // target offsets computed with mask enabled/disabled). This mirrors the
    // legacy startMaskTransition but keeps the animation logic inside the
    // viewer where column geometry is authoritative.
    startMaskTransition(toEnabled) {
      try {
        if (this._maskAnimRequest) { cancelAnimationFrame(this._maskAnimRequest); this._maskAnimRequest = null; }
        // ensure mask string is up to date on window (script.js keeps a separate
        // internal maskStr; callers who need that should call refreshMaskStr).
        console.info('SealionViewer: mask animation start', { toEnabled: !!toEnabled });
        const from = (this.colOffsets && this.colOffsets.slice) ? this.colOffsets.slice() : [];
        const maskStr = (window && typeof window.maskStr === 'string') ? window.maskStr : (window && typeof window.mask === 'string') ? window.mask : null;
        const reducedColWidth = (window && typeof window.REDUCED_COL_WIDTH === 'number') ? window.REDUCED_COL_WIDTH : 1;
        const expandedRightPad = (window && typeof window.EXPANDED_RIGHT_PAD === 'number') ? window.EXPANDED_RIGHT_PAD : 2;
        const to = this.buildColOffsetsFor(toEnabled, { maxSeqLen: (this.colOffsets && this.colOffsets.length) ? this.colOffsets.length - 1 : (window && typeof window.maxSeqLen === 'number' ? window.maxSeqLen : 0), CHAR_WIDTH: this.charWidth, REDUCED_COL_WIDTH: reducedColWidth, EXPANDED_RIGHT_PAD: expandedRightPad, maskStr: maskStr });
        const start = performance.now();
        const duration = (window && typeof window.MASK_ANIM_MS === 'number') ? window.MASK_ANIM_MS : 220;
        const that = this;
        function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
        function tick(now) {
          try {
            const dt = Math.min(1, (now - start) / duration);
            const eased = easeOutQuad(dt);
            const maxIdx = Math.max((from && from.length) ? from.length - 1 : 0, (to && to.length) ? to.length - 1 : 0);
            // interpolate into this.colOffsets as CSS pixels (float values allowed during animation)
            that.colOffsets = that.colOffsets || new Array(maxIdx + 1).fill(0);
            for (let i = 0; i <= maxIdx; i++) {
              const f = (from && typeof from[i] !== 'undefined') ? from[i] : 0;
              const t0 = (to && typeof to[i] !== 'undefined') ? to[i] : f;
              that.colOffsets[i] = f + (t0 - f) * eased;
            }
            // update spacer width to reflect interpolated total
            try { if (that.seqSpacer) that.seqSpacer.style.width = Math.max(1, Math.round(that.colOffsets[that.colOffsets.length - 1] || 0)) + 'px'; } catch (_) { }
            if (typeof that.scheduleRender === 'function') that.scheduleRender();
            if (dt < 1) { that._maskAnimRequest = requestAnimationFrame(tick); }
            else {
              that._maskAnimRequest = null;
              // finalize
              that.maskEnabled = !!toEnabled;
              try { window.maskEnabled = !!that.maskEnabled; } catch (_) { }
              // rebuild definitive integer offsets and resize backings
              try { const out = that.buildColOffsetsFor(!!that.maskEnabled, { maxSeqLen: (to && to.length) ? to.length - 1 : 0, CHAR_WIDTH: that.charWidth, REDUCED_COL_WIDTH: reducedColWidth, EXPANDED_RIGHT_PAD: expandedRightPad, maskStr: maskStr }); that.colOffsets = out; } catch (_) { }
              try { that.setCanvasCSSSizes(); } catch (_) { }
              try { that.resizeBackings(); } catch (_) { }
              that.invalidateOverviewCache();
              if (typeof that.scheduleRender === 'function') that.scheduleRender();
              console.info('SealionViewer: mask animation end', { toEnabled: !!toEnabled });
            }
          } catch (e) { console.warn('SealionViewer: mask tick error', e); }
        }
        this._maskAnimRequest = requestAnimationFrame(tick);
      } catch (e) { console.warn('SealionViewer.startMaskTransition failed', e); }
    }

    // Public helper to update devicePixelRatio (call after zoom / DPR change)
    refreshDPR() {
      this.pr = window.devicePixelRatio || 1;
      this.scheduleRender();
    }

    // Toggle hide mode (collapsed regions are hidden with center markers)
    toggleHideMode() {
      try {
        this.hideMode = !this.hideMode;
        console.info('Hide mode:', this.hideMode ? 'ON' : 'OFF');
        
        // Rebuild column offsets with new hide mode
        if (typeof this.buildColOffsetsFor === 'function' && this.colOffsets) {
          const maxSeqLen = this.colOffsets.length - 1;
          this.colOffsets = this.buildColOffsetsFor(this.maskEnabled, {
            maxSeqLen: maxSeqLen,
            CHAR_WIDTH: this.charWidth,
            EXPANDED_RIGHT_PAD: this.EXPANDED_RIGHT_PAD || 2,
            REDUCED_COL_WIDTH: this.REDUCED_COL_WIDTH || 1,
            HIDDEN_MARKER_WIDTH: this.HIDDEN_MARKER_WIDTH || 4,
            hideMode: this.hideMode,
            maskStr: (window && window.maskStr) || (window && window.mask) || null
          });
        }
        
        // Update canvas sizes and re-render
        if (typeof this.setCanvasCSSSizes === 'function') {
          this.setCanvasCSSSizes();
        }
        if (typeof this.resizeBackings === 'function') {
          this.resizeBackings();
        }
        this.invalidateOverviewCache();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('toggleHideMode failed', e);
      }
    }

    // Invalidate the overview cache (call when mask, bookmarks, or ref mode changes)
    invalidateOverviewCache() {
      this._overviewRenderer.invalidateCache();
    }

    // Invalidate the entropy plot cache (call when alignment data changes)
    invalidatePlotCache() {
      if (this._plotRenderer) this._plotRenderer.invalidateCache();
    }

    // Switch the active plot type by name ('entropy' | 'differences').
    setPlotType(type) {
      if (!this._plotRenderer) return;
      const factory = PLOT_TYPES[type];
      if (!factory) { console.warn('SealionViewer.setPlotType: unknown type', type); return; }
      this._plotRenderer.setPlot(factory());
      this.plotType = type;
      this.scheduleRender();
    }

    // Toggle dark mode
    toggleDarkMode() {
      try {
        this.darkMode = !this.darkMode;
        console.info('Dark mode:', this.darkMode ? 'ON' : 'OFF');
        
        if (this.darkMode) {
          // Store current (light mode) colors and switch ALL DARK_MODE_COLORS
          for (const prop in SealionViewer.DARK_MODE_COLORS) {
            this._lightModeColors[prop] = this[prop];
            this[prop] = SealionViewer.DARK_MODE_COLORS[prop];
          }
          // Update CSS for UI elements
          document.documentElement.classList.add('dark-mode');
        } else {
          // Restore light mode colors
          for (const prop in this._lightModeColors) {
            this[prop] = this._lightModeColors[prop];
          }
          this._lightModeColors = {};
          // Update CSS for UI elements
          document.documentElement.classList.remove('dark-mode');
        }
        
        // Update amino acid colors for current scheme
        if (this.aminoAcidColorScheme) {
          const scheme = SealionViewer.AMINO_ACID_COLOR_SCHEMES[this.aminoAcidColorScheme];
          if (scheme) {
            this.AA_COLORS = this.darkMode ? { ...scheme.darkColors } : { ...scheme.lightColors };
            this.DEFAULT_AA_COLOR = this.darkMode ? scheme.darkDefault : scheme.lightDefault;
          }
        }
        
        // Update nucleotide colors for current scheme
        if (this.nucleotideColorScheme) {
          const scheme = SealionViewer.NUCLEOTIDE_COLOR_SCHEMES[this.nucleotideColorScheme];
          if (scheme) {
            this.BASE_COLORS = this.darkMode ? { ...scheme.darkColors } : { ...scheme.lightColors };
            this.DEFAULT_BASE_COLOR = this.darkMode ? scheme.darkDefault : scheme.lightDefault;
          }
        }
        
        // Save dark mode preference to localStorage
        try {
          localStorage.setItem('sealion_dark_mode', this.darkMode ? 'true' : 'false');
        } catch (e) {
          console.warn('Failed to save dark mode preference:', e);
        }
        
        // Invalidate cache and re-render
        this.invalidateOverviewCache();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('toggleDarkMode failed', e);
      }
    }

    // Tag selected labels with a specific color
    tagSelectedLabels(tagIndex) {
      try {
        if (tagIndex < 0 || tagIndex >= this.TAG_COLORS.length) {
          console.warn('Invalid tag index:', tagIndex);
          return;
        }
        
        if (!this.selectedRows || this.selectedRows.size === 0) {
          console.info('No labels selected to tag');
          return;
        }
        
        // Tag all selected rows by their label
        for (const rowIdx of this.selectedRows) {
          const row = this.alignment[rowIdx];
          if (row && row.label) {
            this.labelTags.set(row.label, tagIndex);
          }
        }
        
        console.info(`Tagged ${this.selectedRows.size} labels with ${this.TAG_NAMES[tagIndex]}`);
        this.saveTags();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('tagSelectedLabels failed', e);
      }
    }

    // Clear tags from selected labels
    clearSelectedTags() {
      try {
        if (!this.selectedRows || this.selectedRows.size === 0) {
          console.info('No labels selected to clear tags');
          return;
        }
        
        let clearedCount = 0;
        for (const rowIdx of this.selectedRows) {
          const row = this.alignment[rowIdx];
          if (row && row.label && this.labelTags.has(row.label)) {
            this.labelTags.delete(row.label);
            clearedCount++;
          }
        }
        
        console.info(`Cleared tags from ${clearedCount} labels`);
        this.saveTags();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('clearSelectedTags failed', e);
      }
    }

    // Clear all tags
    clearAllTags() {
      try {
        const count = this.labelTags.size;
        this.labelTags.clear();
        console.info(`Cleared all ${count} tags`);
        this.saveTags();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('clearAllTags failed', e);
      }
    }

    // Get tag info for a row
    getRowTag(rowIdx) {
      const row = this.alignment[rowIdx];
      if (!row || !row.label) return null;
      return this.labelTags.has(row.label) ? this.labelTags.get(row.label) : null;
    }

    // Get tag color for a row (returns null if no tag)
    getRowTagColor(rowIdx) {
      const tagIdx = this.getRowTag(rowIdx);
      return (tagIdx !== null && tagIdx >= 0 && tagIdx < this.TAG_COLORS.length) 
        ? this.TAG_COLORS[tagIdx] 
        : null;
    }

    // Save tags to localStorage
    saveTags() {
      try {
        if (!this.alignment || this.alignment.length === 0) {
          return;
        }
        
        // labelTags is already a map of label -> tag index, so just convert to object
        const tagsByLabel = Object.fromEntries(this.labelTags);
        
        const key = 'sealion_label_tags';
        localStorage.setItem(key, JSON.stringify(tagsByLabel));
        console.info(`Saved ${Object.keys(tagsByLabel).length} tags to localStorage`);
      } catch (e) {
        console.warn('Failed to save tags:', e);
      }
    }

    // Load tags from localStorage
    loadTags() {
      try {
        if (!this.alignment || this.alignment.length === 0) {
          return;
        }
        
        const key = 'sealion_label_tags';
        const stored = localStorage.getItem(key);
        if (!stored) {
          return;
        }
        
        const tagsByLabel = JSON.parse(stored);
        
        // Clear existing tags and load from stored data
        this.labelTags.clear();
        for (const [label, tagIdx] of Object.entries(tagsByLabel)) {
          this.labelTags.set(label, tagIdx);
        }
        
        console.info(`Loaded ${this.labelTags.size} tags from localStorage`);
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('Failed to load tags:', e);
      }
    }

    // Bookmark selected columns with a specific color
    bookmarkSelectedColumns(bookmarkIndex) {
      try {
        if (bookmarkIndex < 0 || bookmarkIndex >= this.BOOKMARK_COLORS.length) {
          console.warn('Invalid bookmark index:', bookmarkIndex);
          return;
        }
        
        if (!this.selectedCols || this.selectedCols.size === 0) {
          console.info('No columns selected to bookmark');
          return;
        }
        
        // Bookmark all selected columns
        for (const colIdx of this.selectedCols) {
          this.siteBookmarks.set(colIdx, bookmarkIndex);
        }
        
        console.info(`Bookmarked ${this.selectedCols.size} columns with ${this.BOOKMARK_NAMES[bookmarkIndex]}`);
        this.saveBookmarks();
        this.invalidateOverviewCache();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('bookmarkSelectedColumns failed', e);
      }
    }

    // Clear bookmarks from selected columns
    clearSelectedBookmarks() {
      try {
        if (!this.selectedCols || this.selectedCols.size === 0) {
          console.info('No columns selected to clear bookmarks');
          return;
        }
        
        let clearedCount = 0;
        for (const colIdx of this.selectedCols) {
          if (this.siteBookmarks.has(colIdx)) {
            this.siteBookmarks.delete(colIdx);
            clearedCount++;
          }
        }
        
        console.info(`Cleared bookmarks from ${clearedCount} columns`);
        this.saveBookmarks();
        this.invalidateOverviewCache();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('clearSelectedBookmarks failed', e);
      }
    }

    // Clear all bookmarks
    clearAllBookmarks() {
      try {
        const count = this.siteBookmarks.size;
        this.siteBookmarks.clear();
        console.info(`Cleared all ${count} bookmarks`);
        this.saveBookmarks();
        this.invalidateOverviewCache();
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('clearAllBookmarks failed', e);
      }
    }

    // Get bookmark info for a column
    getColumnBookmark(colIdx) {
      return this.siteBookmarks.has(colIdx) ? this.siteBookmarks.get(colIdx) : null;
    }

    // Get bookmark color for a column (returns null if no bookmark)
    getColumnBookmarkColor(colIdx) {
      const bookmarkIdx = this.getColumnBookmark(colIdx);
      return (bookmarkIdx !== null && bookmarkIdx >= 0 && bookmarkIdx < this.BOOKMARK_COLORS.length) 
        ? this.BOOKMARK_COLORS[bookmarkIdx] 
        : null;
    }

    // Save bookmarks to localStorage
    saveBookmarks() {
      try {
        if (!this.siteBookmarks || this.siteBookmarks.size === 0) {
          localStorage.removeItem('sealion_site_bookmarks');
          return;
        }
        
        // Save bookmarks as column index -> bookmark index
        const bookmarksObj = {};
        for (const [colIdx, bookmarkIdx] of this.siteBookmarks.entries()) {
          bookmarksObj[colIdx] = bookmarkIdx;
        }
        
        const key = 'sealion_site_bookmarks';
        localStorage.setItem(key, JSON.stringify(bookmarksObj));
        console.info(`Saved ${this.siteBookmarks.size} bookmarks to localStorage`);
      } catch (e) {
        console.warn('Failed to save bookmarks:', e);
      }
    }

    // Load bookmarks from localStorage
    loadBookmarks() {
      try {
        const key = 'sealion_site_bookmarks';
        const stored = localStorage.getItem(key);
        if (!stored) {
          return;
        }
        
        const bookmarksObj = JSON.parse(stored);
        let loadedCount = 0;
        
        // Restore bookmarks
        for (const [colIdx, bookmarkIdx] of Object.entries(bookmarksObj)) {
          this.siteBookmarks.set(parseInt(colIdx, 10), bookmarkIdx);
          loadedCount++;
        }
        
        if (loadedCount > 0) {
          console.info(`Loaded ${loadedCount} bookmarks from localStorage`);
          this.invalidateOverviewCache();
          if (typeof this.scheduleRender === 'function') {
            this.scheduleRender();
          }
        }
      } catch (e) {
        console.warn('Failed to load bookmarks:', e);
      }
    }

    // Update tag name for a specific index
    updateTagName(tagIndex, newName) {
      if (tagIndex >= 0 && tagIndex < this.TAG_NAMES.length) {
        this.TAG_NAMES[tagIndex] = newName || this.TAG_NAMES[tagIndex];
        this.saveCustomNames();
        console.info(`Updated tag ${tagIndex} name to: ${newName}`);
      }
    }

    // Update bookmark name for a specific index
    updateBookmarkName(bookmarkIndex, newName) {
      if (bookmarkIndex >= 0 && bookmarkIndex < this.BOOKMARK_NAMES.length) {
        this.BOOKMARK_NAMES[bookmarkIndex] = newName || this.BOOKMARK_NAMES[bookmarkIndex];
        this.saveCustomNames();
        console.info(`Updated bookmark ${bookmarkIndex} name to: ${newName}`);
      }
    }

    // Save custom names to localStorage
    saveCustomNames() {
      try {
        const customNames = {
          tags: this.TAG_NAMES,
          bookmarks: this.BOOKMARK_NAMES
        };
        localStorage.setItem('sealion_custom_names', JSON.stringify(customNames));
        console.info('Saved custom names to localStorage');
      } catch (e) {
        console.warn('Failed to save custom names:', e);
      }
    }

    // Load custom names from localStorage
    loadCustomNames() {
      try {
        const stored = localStorage.getItem('sealion_custom_names');
        if (!stored) {
          return;
        }
        
        const customNames = JSON.parse(stored);
        if (customNames.tags && Array.isArray(customNames.tags)) {
          this.TAG_NAMES = customNames.tags;
          console.info('Loaded custom tag names');
        }
        if (customNames.bookmarks && Array.isArray(customNames.bookmarks)) {
          this.BOOKMARK_NAMES = customNames.bookmarks;
          console.info('Loaded custom bookmark names');
        }
      } catch (e) {
        console.warn('Failed to load custom names:', e);
      }
    }

    // Reset tag names to defaults
    resetTagNames() {
      try {
        this.TAG_NAMES = [...SealionViewer.DEFAULTS.TAG_NAMES];
        this.saveCustomNames();
        console.info('Reset tag names to defaults');
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('Failed to reset tag names:', e);
      }
    }

    // Reset bookmark names to defaults
    resetBookmarkNames() {
      try {
        this.BOOKMARK_NAMES = [...SealionViewer.DEFAULTS.BOOKMARK_NAMES];
        this.saveCustomNames();
        console.info('Reset bookmark names to defaults');
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('Failed to reset bookmark names:', e);
      }
    }

    // Set nucleotide color scheme
    setNucleotideColorScheme(schemeName) {
      try {
        const schemes = SealionViewer.NUCLEOTIDE_COLOR_SCHEMES;
        if (!schemes[schemeName]) {
          console.warn('Unknown nucleotide color scheme:', schemeName);
          return;
        }
        
        this.nucleotideColorScheme = schemeName;
        const scheme = schemes[schemeName];
        
        // Set colors based on current dark mode state
        this.BASE_COLORS = this.darkMode ? { ...scheme.darkColors } : { ...scheme.lightColors };
        this.DEFAULT_BASE_COLOR = this.darkMode ? scheme.darkDefault : scheme.lightDefault;
        
        // Save preference to localStorage
        try {
          localStorage.setItem('sealion_nucleotide_color_scheme', schemeName);
        } catch (e) {
          console.warn('Failed to save nucleotide color scheme preference:', e);
        }
        
        console.info('Nucleotide color scheme set to:', scheme.name);
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('setNucleotideColorScheme failed', e);
      }
    }

    // Load nucleotide color scheme from localStorage
    loadNucleotideColorScheme() {
      try {
        const stored = localStorage.getItem('sealion_nucleotide_color_scheme');
        if (stored && SealionViewer.NUCLEOTIDE_COLOR_SCHEMES[stored]) {
          this.setNucleotideColorScheme(stored);
        }
      } catch (e) {
        console.warn('Failed to load nucleotide color scheme:', e);
      }
    }

    // Set amino acid color scheme
    setAminoAcidColorScheme(schemeName) {
      try {
        const schemes = SealionViewer.AMINO_ACID_COLOR_SCHEMES;
        if (!schemes[schemeName]) {
          console.warn('Unknown amino acid color scheme:', schemeName);
          return;
        }
        
        this.aminoAcidColorScheme = schemeName;
        const scheme = schemes[schemeName];
        
        // Set colors based on current dark mode state
        this.AA_COLORS = this.darkMode ? { ...scheme.darkColors } : { ...scheme.lightColors };
        this.DEFAULT_AA_COLOR = this.darkMode ? scheme.darkDefault : scheme.lightDefault;
        
        // Save preference to localStorage
        try {
          localStorage.setItem('sealion_amino_acid_color_scheme', schemeName);
        } catch (e) {
          console.warn('Failed to save amino acid color scheme preference:', e);
        }
        
        console.info('Amino acid color scheme set to:', scheme.name);
        if (typeof this.scheduleRender === 'function') {
          this.scheduleRender();
        }
      } catch (e) {
        console.warn('setAminoAcidColorScheme failed', e);
      }
    }

    // Load amino acid color scheme from localStorage
    loadAminoAcidColorScheme() {
      try {
        const stored = localStorage.getItem('sealion_amino_acid_color_scheme');
        if (stored && SealionViewer.AMINO_ACID_COLOR_SCHEMES[stored]) {
          this.setAminoAcidColorScheme(stored);
        }
      } catch (e) {
        console.warn('Failed to load amino acid color scheme:', e);
      }
    }

    // Expose class on window for easy staged consumption from existing code.
  }

  // Default visual/behaviour settings the viewer uses when constructed.
  // Consumers may pass an overrides object as the third constructor argument
  // to change any of these defaults. Keeping the defaults close to the class
  // makes staged migration and later configurability easier.
  SealionViewer.DEFAULTS = {
    FONT_SIZE: 14,
    FONT: '14px monospace',
    HEADER_FONT: '12px sans-serif',
    LABEL_WIDTH: 260,
    ROW_HEIGHT: 20,
    ROW_PADDING: 6,
    CONSENSUS_TOP_PAD: 4,
    CONSENSUS_BOTTOM_PAD: 8,
    OVERVIEW_TOP_PAD: 8,
    OVERVIEW_BOTTOM_PAD: 8,
    EXPANDED_RIGHT_PAD: 2,
    REDUCED_COL_WIDTH: 1,
    HIDDEN_MARKER_WIDTH: 1,
    HIDDEN_MARKER_COLOR: '#e0e0e0',
    COMPRESSED_CELL_VPAD: 2,
    BUFFER_ROWS: 2,
    BUFFER_COLS: 5,
    MASK_ANIM_MS: 220,
    PALE_REF_COLOR: '#e6e6e6',
    REF_ACCENT: '#2b8cff',
    // Color scheme settings
    nucleotideColorScheme: 'default',
    aminoAcidColorScheme: 'zappo',
    // Display mode settings (new system)
    displayMode: 'native', // 'native' | 'codon' | 'translate'
    dataType: 'nucleotide', // 'nucleotide' | 'aminoacid' (set on data load)
    readingFrame: 1,
    // Backward compatibility
    aminoAcidMode: false,
    codonMode: false,
    AMINO_ACID_COLOR_SCHEME: 'zappo',
    // Canvas background colors - Light mode
    OVERVIEW_BG: '#f7f7f7',
    OVERVIEW_EXPANDED_COL: '#ddd',
    OVERVIEW_COLLAPSED_COL: '#999',
    OVERVIEW_COMPRESSED_COL: 'rgba(90,160,200,0.8)',
    OVERVIEW_VIEWPORT: 'rgba(0,120,200,0.9)',
    OVERVIEW_DIFF_COL: '#ff7f0e22',
    HEADER_BG: '#f3f3f3',
    HEADER_TEXT: '#333',
    HEADER_STROKE: '#666',
    HEADER_SELECTION: 'rgba(180, 215, 255, 0.3)',
    CONSENSUS_BG: '#f3f3f3',  
    CONSENSUS_SEPARATOR: '#aaa',
    LABELS_BG: '#f3f3f3',
    LABELS_TEXT: '#111',
    LABELS_HEADER_TEXT: '#333',
    LABEL_START_POS: 56,
    // Index styling
    INDEX_FONT_STYLE: 'italic',
    INDEX_COLOR: '#888888',
    INDEX_RIGHT_ALIGN_POS: 50,
    SEQ_EVEN_ROW: '#fff',
    SEQ_ODD_ROW: '#fff',
    SEQ_ROW_SELECTION: 'rgba(180, 215, 255, 0.3)',
    SEQ_COL_SELECTION: 'rgba(180, 215, 255, 0.3)',
    maskEnabled: true,
    snapEnabled: true,
    // Label tagging system
    TAG_COLORS: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'],
    TAG_NAMES: ['Slay', 'Mint', 'Vibey', 'Feral', 'Bussin', 'Solid', 'Mid', 'Sus'],
    TAG_BACKGROUND_ALPHA: 0.25,
    TAG_SEQ_BACKGROUND_ALPHA: 0.15,
    TAG_TEXT_COLOR: true,
    // Site bookmark system
    BOOKMARK_COLORS: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'],
    TAG_NAMES: ['Slay', 'Mint', 'Vibey', 'Feral', 'Bussin', 'Solid', 'Mid', 'Sus'],
    BOOKMARK_ALPHA: 0.3,
    BOOKMARK_COL_ALPHA: 0.15,
    // CDS reading frame colors (overview display)
    CDS_FRAME_COLORS: ['#0B775E', '#45b7d1', '#fd79a8'], // frames 1, 2, 3
    CDS_FILL_ALPHA: 1.0,
    CDS_BORDER_ALPHA: 0.3,
    // Entropy / plot strip
    PLOT_HEIGHT: 20,
    PLOT_BG: '#f3f3f3',
    PLOT_SEPARATOR: '#aaa',
    PLOT_BAR_COLOR: '#3182bd',
    PLOT_TOP_PAD: 4,
    PLOT_BOTTOM_PAD: 6
  };

  // Dark mode color scheme
  SealionViewer.DARK_MODE_COLORS = {
    DEFAULT_BASE_COLOR: '#aaa',
    PALE_REF_COLOR: '#404040',
    REF_ACCENT: '#5ba3ff',
    OVERVIEW_BG: '#1e1e1e',
    OVERVIEW_EXPANDED_COL: '#404040',
    OVERVIEW_COLLAPSED_COL: '#666',
    OVERVIEW_COMPRESSED_COL: 'rgba(80,150,200,0.75)',
    OVERVIEW_VIEWPORT: 'rgba(91,163,255,0.9)',
    OVERVIEW_DIFF_COL: '#ff7f0e11',
    HEADER_BG: '#252525',
    HEADER_TEXT: '#d4d4d4',
    HEADER_STROKE: '#888',
    HEADER_SELECTION: 'rgba(91, 163, 255, 0.2)',
    CONSENSUS_BG: '#1a1a1a',
    CONSENSUS_SEPARATOR: '#404040',
    PLOT_BG: '#1a1a1a',
    PLOT_SEPARATOR: '#404040',
    PLOT_BAR_COLOR: '#5ba3ff',
    LABELS_BG: '#252525',
    LABELS_TEXT: '#d4d4d4',
    LABELS_HEADER_TEXT: '#d4d4d4',
    INDEX_COLOR: '#888888',
    SEQ_ROW_SELECTION: 'rgba(91, 163, 255, 0.2)',
    SEQ_EVEN_ROW: '#1e1e1e',
    SEQ_ODD_ROW: '#1e1e1e',
    SEQ_COL_SELECTION: 'rgba(91, 163, 255, 0.2)',
    // CDS reading frame colors (overview display)
    CDS_FRAME_COLORS: ['#0B775E', '#45b7d1', '#fd79a8'], // frames 1, 2, 3
    CDS_FILL_ALPHA: 0.3,
    CDS_BORDER_ALPHA: 1.0
  };

  // Nucleotide color schemes
  SealionViewer.NUCLEOTIDE_COLOR_SCHEMES = {
    'default': {
      name: 'Default',
      lightColors: { 'A': '#2ca02c', 'C': '#1f77b4', 'G': '#d62728', 'T': '#ff7f0e' },
      darkColors: { 'A': '#4caf50', 'C': '#42a5f5', 'G': '#ef5350', 'T': '#ffa726' },
      lightDefault: '#666',
      darkDefault: '#aaa'
    },
    'wes': {
      name: 'Wes',
      lightColors: { 'A': '#0B775E', 'C': '#35274A', 'G': '#DD7373', 'T': '#F4B942' },
      darkColors: { 'A': '#1ABC9C', 'C': '#B19CD9', 'G': '#FF9999', 'T': '#FFD369' },
      lightDefault: '#666',
      darkDefault: '#aaa'
    },
    'verity': {
      name: 'Verity',
      lightColors: { 'A': '#FF1493', 'C': '#FF69B4', 'G': '#DB7093', 'T': '#C71585' },
      darkColors: { 'A': '#FF69B4', 'C': '#FFB6C1', 'G': '#FFC0CB', 'T': '#FF1493' },
      lightDefault: '#666',
      darkDefault: '#aaa'
    }
    ,
    'aine': {
      name: 'Áine',
      // Palette inspired by colours used in Áine O'Toole's figures and slides
      lightColors: { 'A': '#66c2a5', 'C': '#2b8cbe', 'G': '#fc8d62', 'T': '#8da0cb' },
      darkColors: { 'A': '#99d8c9', 'C': '#4eb3d3', 'G': '#ffb482', 'T': '#b3b3e6' },
      lightDefault: '#666',
      darkDefault: '#aaa'
    }
    ,
    'samuel': {
      name: 'Samuel',
      // A and T: blue/green hues; G and C: red/yellow hues
      lightColors: { 'A': '#2b8cbe', 'C': '#f4b942', 'G': '#d62728', 'T': '#66c2a5' },
      darkColors: { 'A': '#4eb3d3', 'C': '#ffd369', 'G': '#ff6f5f', 'T': '#99d8c9' },
      lightDefault: '#666',
      darkDefault: '#aaa'
    }
  };

  // Amino acid color schemes
  SealionViewer.AMINO_ACID_COLOR_SCHEMES = {
    'zappo': {
      name: 'Zappo',
      lightColors: {
        // Hydrophobic/aliphatic (pink)
        'A': '#e91e63', 'I': '#e91e63', 'L': '#e91e63', 'M': '#e91e63', 'V': '#e91e63',
        // Aromatic (orange)
        'F': '#ff6f00', 'W': '#ff6f00', 'Y': '#ff6f00',
        // Positive (blue)
        'K': '#2962ff', 'R': '#2962ff', 'H': '#2962ff',
        // Negative (red)
        'D': '#d50000', 'E': '#d50000',
        // Hydrophilic (green)
        'N': '#00c853', 'Q': '#00c853', 'S': '#00c853', 'T': '#00c853',
        // Special conformational (magenta)
        'G': '#aa00ff', 'P': '#aa00ff',
        // Cysteine (yellow/gold)
        'C': '#ffd600',
        // Stop codon (black)
        '*': '#000000',
        // Unknown (grey)
        'X': '#757575'
      },
      darkColors: {
        // Hydrophobic/aliphatic (bright pink)
        'A': '#ff80ab', 'I': '#ff80ab', 'L': '#ff80ab', 'M': '#ff80ab', 'V': '#ff80ab',
        // Aromatic (bright orange)
        'F': '#ffab40', 'W': '#ffab40', 'Y': '#ffab40',
        // Positive (bright blue)
        'K': '#448aff', 'R': '#448aff', 'H': '#448aff',
        // Negative (bright red)
        'D': '#ff5252', 'E': '#ff5252',
        // Hydrophilic (bright green)
        'N': '#69f0ae', 'Q': '#69f0ae', 'S': '#69f0ae', 'T': '#69f0ae',
        // Special conformational (bright magenta)
        'G': '#e040fb', 'P': '#e040fb',
        // Cysteine (bright yellow)
        'C': '#ffea00',
        // Stop codon (white)
        '*': '#ffffff',
        // Unknown (light grey)
        'X': '#bdbdbd'
      },
      lightDefault: '#757575',
      darkDefault: '#bdbdbd'
    },
    'wes': {
      name: 'Wes',
      lightColors: {
        // Hydrophobic/aliphatic (Moonrise Kingdom yellow)
        'A': '#F4B942', 'I': '#F4B942', 'L': '#F4B942', 'M': '#F4B942', 'V': '#F4B942',
        // Aromatic (Grand Budapest pink/coral)
        'F': '#DD7373', 'W': '#DD7373', 'Y': '#DD7373',
        // Positive (Bottle Rocket teal)
        'K': '#0B775E', 'R': '#0B775E', 'H': '#0B775E',
        // Negative (Royal Tenenbaums red)
        'D': '#C23B22', 'E': '#C23B22',
        // Hydrophilic (French Dispatch blue)
        'N': '#45b7d1', 'Q': '#45b7d1', 'S': '#45b7d1', 'T': '#45b7d1',
        // Special conformational (Darjeeling purple)
        'G': '#35274A', 'P': '#35274A',
        // Cysteine (Isle of Dogs mustard)
        'C': '#E3B448',
        // Stop codon (black)
        '*': '#2C1810',
        // Unknown (grey)
        'X': '#8B7E74'
      },
      darkColors: {
        // Hydrophobic/aliphatic (bright Moonrise yellow)
        'A': '#FFD369', 'I': '#FFD369', 'L': '#FFD369', 'M': '#FFD369', 'V': '#FFD369',
        // Aromatic (bright coral/pink)
        'F': '#FF9999', 'W': '#FF9999', 'Y': '#FF9999',
        // Positive (bright teal)
        'K': '#1ABC9C', 'R': '#1ABC9C', 'H': '#1ABC9C',
        // Negative (bright red)
        'D': '#E74C3C', 'E': '#E74C3C',
        // Hydrophilic (bright sky blue)
        'N': '#87CEEB', 'Q': '#87CEEB', 'S': '#87CEEB', 'T': '#87CEEB',
        // Special conformational (lavender)
        'G': '#B19CD9', 'P': '#B19CD9',
        // Cysteine (golden)
        'C': '#F4D03F',
        // Stop codon (light cream)
        '*': '#F5E6D3',
        // Unknown (light grey)
        'X': '#BDC3C7'
      },
      lightDefault: '#8B7E74',
      darkDefault: '#BDC3C7'
    }
  };

  // Now that AMINO_ACID_COLOR_SCHEMES is defined, backfill the fallback values into
  // DEFAULTS so the SealionViewer.DEFAULTS.AA_COLORS fallback in drawRow /
  // drawConsensus always resolves to a valid map regardless of instance state.
  {
    const _zappo = SealionViewer.AMINO_ACID_COLOR_SCHEMES['zappo'];
    SealionViewer.DEFAULTS.AA_COLORS      = { ..._zappo.lightColors };
    SealionViewer.DEFAULTS.DEFAULT_AA_COLOR = _zappo.lightDefault;
  }

window.SealionViewer = SealionViewer;
export { SealionViewer };
