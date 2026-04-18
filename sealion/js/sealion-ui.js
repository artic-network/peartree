// sealion-ui.js — Sealion app UI builder (classic script).
//
// Loaded as a plain <script> so all functions are globals.
// Depends on pearcore-ui.js being loaded first (for buildModalHTML, etc.).
//
// The auto-injection IIFE at the bottom replaces <div id="app-html-host">
// with the full app shell.

// ── Tag / Bookmark colour items ──────────────────────────────────────────

const _TAG_COLORS = [
  { color: '#ff6b6b', name: 'Red'      },
  { color: '#4ecdc4', name: 'Teal'     },
  { color: '#45b7d1', name: 'Blue'     },
  { color: '#f9ca24', name: 'Yellow'   },
  { color: '#6c5ce7', name: 'Purple'   },
  { color: '#a29bfe', name: 'Lavender' },
  { color: '#fd79a8', name: 'Pink'     },
  { color: '#fdcb6e', name: 'Orange'   },
];

function _colorItems(prefix, cssClass, nameClass) {
  return _TAG_COLORS.map((t, i) =>
    `<li><button class="dropdown-item ${cssClass}" data-${prefix}-index="${i}" type="button">` +
    `<i class="bi bi-circle-fill" style="color: ${t.color};"></i> ` +
    `<span class="${nameClass}" contenteditable="true" spellcheck="false">${t.name}</span></button></li>`
  ).join('\n');
}

// ── Nucleotide colour scheme items ───────────────────────────────────────

const _NUC_SCHEMES = [
  { id: 'default', colors: ['#2ca02c','#1f77b4','#d62728','#ff7f0e'], label: 'Default' },
  { id: 'wes',     colors: ['#F4B942','#DD7373','#0B775E','#35274A'], label: 'Wes' },
  { id: 'verity',  colors: ['#FF1493','#FF69B4','#DB7093','#C71585'], label: 'Verity' },
  { id: 'aine',    colors: ['#2b8cbe','#66c2a5','#fc8d62','#8da0cb'], label: 'Áine' },
  { id: 'samuel',  colors: ['#2b8cbe','#f4b942','#d62728','#66c2a5'], label: 'Samuel' },
];

const _AA_SCHEMES = [
  { id: 'zappo', colors: ['#e91e63','#ff6f00','#2962ff','#00c853'], label: 'Zappo', icon: 'square-fill' },
  { id: 'wes',   colors: ['#F4B942','#DD7373','#0B775E','#45b7d1'], label: 'Wes',   icon: 'square-fill' },
];

function _schemeItems(schemes, cssClass, iconBase) {
  return schemes.map(s => {
    const dots = s.colors.map(c =>
      `<i class="bi bi-${iconBase || 'circle-fill'}" style="color: ${c};"></i>`
    ).join('\n');
    return `<li><button class="dropdown-item ${cssClass}" data-scheme="${s.id}" type="button">${dots} ${s.label}</button></li>`;
  }).join('\n');
}

// ── Toolbar builder ──────────────────────────────────────────────────────

function _buildToolbar() {
  // Left group: file actions
  const left = `
    <div class="d-flex flex-nowrap align-items-center flex-shrink-0">
      <div class="nav-item">
        <button class="btn btn-sm btn-outline-primary" id="open-file-btn" type="button" title="Open FASTA file (Cmd-O)">
          <i class="bi bi-folder2-open"></i></button>
      </div>
      <div class="nav-item ms-2">
        <button class="btn btn-sm btn-outline-success" id="load-reference-btn" type="button" title="Load reference genome">
          <i class="bi bi-file-earmark-code"></i></button>
      </div>
      <div class="nav-item ms-2">
        <button class="btn btn-sm btn-outline-info" id="export-btn" type="button" title="Export selection as FASTA file">
          <i class="bi bi-download"></i></button>
      </div>
    </div>`;

  // Centre group: all the alignment controls
  const centre = `
    <div class="d-flex flex-wrap align-items-center flex-grow-1 mx-2" style="row-gap: 4px;">
      <!-- Zoom -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group" aria-label="Font size controls">
          <button class="btn btn-sm btn-outline-secondary" id="font-decrease-btn" type="button" title="Decrease font size"><i class="bi bi-zoom-out"></i></button>
          <button class="btn btn-sm btn-outline-secondary" id="font-increase-btn" type="button" title="Increase font size"><i class="bi bi-zoom-in"></i></button>
        </div>
      </div>

      <!-- Colour -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-palette"></i> Colour</button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item" id="colour-all-btn" type="button"><i class="bi bi-palette-fill"></i> Colour all sites</button></li>
            <li><button class="dropdown-item" id="colour-diff-btn" type="button"><i class="bi bi-palette"></i> Colour differences only</button></li>
            <li><hr class="dropdown-divider"></li>
            <li class="dropdown-header">Nucleotide colours</li>
            ${_schemeItems(_NUC_SCHEMES, 'nucleotide-color-scheme-btn', 'circle-fill')}
            <li><hr class="dropdown-divider"></li>
            <li class="dropdown-header">Amino acid colours</li>
            ${_schemeItems(_AA_SCHEMES, 'amino-acid-color-scheme-btn', 'square-fill')}
          </ul>
        </div>
      </div>

      <!-- Show -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-eye"></i> Show</button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item" id="nucleotide-mode-btn" type="button"><i class="bi bi-grip-horizontal"></i> Nucleotides</button></li>
            <li><button class="dropdown-item" id="codon-mode-btn" type="button"><i class="bi bi-circle"></i> Codons</button></li>
            <li><button class="dropdown-item" id="amino-acid-mode-btn" type="button"><i class="bi bi-circle-fill"></i> Amino Acids</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item reading-frame-selector" data-frame="1" type="button"><i class="bi bi-1-circle"></i> Reading frame 1</button></li>
            <li><button class="dropdown-item reading-frame-selector" data-frame="2" type="button"><i class="bi bi-2-circle"></i> Reading frame 2</button></li>
            <li><button class="dropdown-item reading-frame-selector" data-frame="3" type="button"><i class="bi bi-3-circle"></i> Reading frame 3</button></li>
          </ul>
        </div>
      </div>

      <!-- Plot -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-bar-chart"></i> Plot</button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item plot-type-btn" data-plot-type="entropy" type="button"><i class="bi bi-graph-up"></i> Conservation (entropy)</button></li>
            <li><button class="dropdown-item plot-type-btn" data-plot-type="differences" type="button"><i class="bi bi-bar-chart-fill"></i> Differences from reference</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" id="hide-plot-btn" type="button"><i class="bi bi-eye-slash"></i> <span>Hide plot</span></button></li>
          </ul>
        </div>
      </div>

      <!-- Overview -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-map"></i> Overview</button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item overview-layer-btn active" data-layer="genomeStructure" type="button"><i class="bi bi-check2-square"></i> Genome structure</button></li>
            <li><button class="dropdown-item overview-layer-btn active" data-layer="compressedSites" type="button"><i class="bi bi-check2-square"></i> Compressed sites</button></li>
            <li><button class="dropdown-item overview-layer-btn active" data-layer="variableSites" type="button"><i class="bi bi-check2-square"></i> Variable sites</button></li>
            <li><button class="dropdown-item overview-layer-btn active" data-layer="slidingWindow" type="button"><i class="bi bi-check2-square"></i> Plot line</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" id="hide-overview-btn" type="button"><i class="bi bi-eye-slash"></i> <span>Hide overview</span></button></li>
          </ul>
        </div>
      </div>

      <!-- Navigate differences -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group" aria-label="Navigate differences">
          <button class="btn btn-sm btn-outline-secondary" id="diff-prev-btn" type="button" title="Jump to previous difference from reference"><i class="bi bi-arrow-left-circle"></i></button>
          <button class="btn btn-sm btn-outline-secondary" id="diff-next-btn" type="button" title="Jump to next difference from reference"><i class="bi bi-arrow-right-circle"></i></button>
        </div>
      </div>

      <!-- Tags -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-tag"></i> Tag</button>
          <ul class="dropdown-menu">
            ${_colorItems('tag', 'tag-color-btn', 'tag-name-edit')}
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" id="clear-selected-tags-btn" type="button"><i class="bi bi-eraser"></i> Clear selected tags</button></li>
            <li><button class="dropdown-item" id="clear-all-tags-btn" type="button"><i class="bi bi-x-circle"></i> Clear all tags</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" id="reset-tag-names-btn" type="button"><i class="bi bi-arrow-counterclockwise"></i> Reset tag names to defaults</button></li>
          </ul>
        </div>
      </div>

      <!-- Bookmarks -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-bookmark"></i> Bookmark</button>
          <ul class="dropdown-menu">
            ${_colorItems('bookmark', 'bookmark-color-btn', 'bookmark-name-edit')}
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" id="clear-selected-bookmarks-btn" type="button"><i class="bi bi-eraser"></i> Clear selected bookmarks</button></li>
            <li><button class="dropdown-item" id="clear-all-bookmarks-btn" type="button"><i class="bi bi-x-circle"></i> Clear all bookmarks</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item" id="reset-bookmark-names-btn" type="button"><i class="bi bi-arrow-counterclockwise"></i> Reset bookmark names to defaults</button></li>
          </ul>
        </div>
      </div>

      <!-- Column collapse/expand -->
      <div class="nav-item ms-2">
        <div class="btn-group" role="group" aria-label="Column collapse controls">
          <button class="btn btn-sm btn-outline-secondary" id="collapse-columns-btn" type="button" title="Collapse selected columns (Cmd -)">
            <i class="bi bi-arrows-collapse" style="display: inline-block; transform: rotate(90deg);"></i></button>
          <button class="btn btn-sm btn-outline-secondary" id="expand-columns-btn" type="button" title="Expand selected columns (Cmd =)">
            <i class="bi bi-arrows-expand" style="display: inline-block; transform: rotate(90deg);"></i></button>
          <button class="btn btn-sm btn-outline-secondary" id="toggle-hide-mode-btn" type="button" title="Toggle hide mode (Cmd H) - hides collapsed regions with center markers">
            <i class="bi bi-eye-slash"></i></button>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Collapse presets">
              <i class="bi bi-funnel"></i></button>
            <ul class="dropdown-menu">
              <li><button class="dropdown-item" id="apply-constant-mask-btn" type="button"><i class="bi bi-filter"></i> Constant sites</button></li>
              <li><button class="dropdown-item" id="apply-constant-ambiguous-btn" type="button"><i class="bi bi-filter"></i> Constant (allow N)</button></li>
              <li><button class="dropdown-item" id="apply-constant-gapped-btn" type="button"><i class="bi bi-filter"></i> Constant (allow N &amp; -)</button></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item" id="expand-all-btn" type="button"><i class="bi bi-arrows-expand"></i> Expand all</button></li>
              <li><button class="dropdown-item" id="collapse-all-btn" type="button"><i class="bi bi-arrows-collapse"></i> Collapse all</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>`;

  // Right group: search + utilities
  const right = `
    <div class="d-flex flex-nowrap align-items-center flex-shrink-0 ms-auto">
      <div class="nav-item ms-2">
        <div class="btn-group" role="group" aria-label="Sequence search">
          <button class="btn btn-sm btn-outline-secondary" id="seq-search-btn" type="button" title="Search sequence (Cmd-F)"><i class="bi bi-search"></i></button>
          <button class="btn btn-sm btn-outline-secondary" id="find-prev-btn" type="button" title="Previous match (Shift-Cmd-G)"><i class="bi bi-chevron-left"></i></button>
          <button class="btn btn-sm btn-outline-secondary" id="find-next-btn" type="button" title="Next match (Cmd-G)"><i class="bi bi-chevron-right"></i></button>
        </div>
      </div>
      <div class="nav-item ms-2">
        <button class="btn btn-sm btn-outline-secondary" id="toggle-dark-mode-btn" type="button" title="Toggle dark mode"><i class="bi bi-moon-fill"></i></button>
      </div>
      <button class="btn btn-sm btn-outline-secondary ms-2" id="help-btn" type="button" title="Show help"><i class="bi bi-question-circle"></i></button>
      <button class="btn btn-sm btn-outline-secondary ms-2" id="about-btn" type="button" title="About Sealion"><i class="bi bi-info-circle"></i></button>
    </div>`;

  return `
<nav class="navbar navbar-expand navbar-light bg-dark border-bottom">
  <div class="container-fluid">
    <span class="navbar-brand mb-0 h1 align-self-start"><a href="https://github.com/artic-network/sealion"><i class="bi bi-dna me-2"></i>Sealion</a></span>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarControls" aria-controls="navbarControls" aria-expanded="false" aria-label="Toggle controls">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarControls">
      ${left}
      ${centre}
      ${right}
    </div>
  </div>
</nav>`;
}

// ── Modal builders ───────────────────────────────────────────────────────

function _buildSearchModal() {
  return `
<div class="modal fade" id="searchModal" tabindex="-1" aria-labelledby="searchModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="searchModalLabel"><i class="bi bi-search me-2"></i>Search Sequence</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label for="seq-search-input" class="form-label">Search pattern (nucleotide or amino acid)</label>
          <textarea class="form-control font-monospace" id="seq-search-input" rows="3" placeholder="Enter sequence or regex pattern\u2026" spellcheck="false" autocomplete="off"></textarea>
          <div class="form-text">Supports regex patterns (e.g. <code>ATG[CGT]+</code>). Case-insensitive. Searches in currently selected sequence first.</div>
        </div>
        <div id="seq-search-status" class="small"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" id="seq-search-find-btn"><i class="bi bi-search me-1"></i>Find</button>
      </div>
    </div>
  </div>
</div>`;
}

function _buildHelpModal() {
  return `
<div class="modal fade" id="helpModal" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="helpModalLabel"><i class="bi bi-question-circle me-2"></i>Sealion Instructions</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body" id="help-content">
        <div class="text-center py-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading\u2026</span></div></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>`;
}

function _buildAboutModal() {
  return `
<div class="modal fade" id="aboutModal" tabindex="-1" aria-labelledby="aboutModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="aboutModalLabel"><i class="bi bi-info-circle me-2"></i>About Sealion</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body" id="about-content">
        <div class="text-center py-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading\u2026</span></div></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>`;
}

function _buildFileUploadModal() {
  return `
<div class="modal fade" id="fileUploadModal" tabindex="-1" aria-labelledby="fileUploadModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="fileUploadModalLabel"><i class="bi bi-folder2-open me-2"></i>Open FASTA File</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <ul class="nav nav-tabs mb-3" id="fastaFileTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="fasta-file-tab" data-bs-toggle="tab" data-bs-target="#fasta-file-panel" type="button" role="tab" aria-controls="fasta-file-panel" aria-selected="true"><i class="bi bi-file-earmark-arrow-up"></i> File</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="fasta-url-tab" data-bs-toggle="tab" data-bs-target="#fasta-url-panel" type="button" role="tab" aria-controls="fasta-url-panel" aria-selected="false"><i class="bi bi-link-45deg"></i> URL</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="fasta-example-tab" data-bs-toggle="tab" data-bs-target="#fasta-example-panel" type="button" role="tab" aria-controls="fasta-example-panel" aria-selected="false"><i class="bi bi-database"></i> Example</button>
          </li>
        </ul>
        <div class="tab-content" id="fastaFileTabContent">
          <div class="tab-pane fade show active" id="fasta-file-panel" role="tabpanel" aria-labelledby="fasta-file-tab">
            <div id="file-drop-zone" class="file-drop-zone text-center p-4 border border-2 border-dashed rounded">
              <i class="bi bi-cloud-arrow-up" style="font-size: 2.5rem; color: #6c757d;"></i>
              <p class="mt-3 mb-2">Drag and drop your FASTA file here</p>
              <p class="text-muted small">or</p>
              <input type="file" id="file-upload-input" accept=".fasta,.fa,.fna,.ffn,.faa,.frn" style="display: none;">
              <button class="btn btn-primary" id="file-select-btn" type="button"><i class="bi bi-file-earmark-text"></i> Choose File</button>
            </div>
          </div>
          <div class="tab-pane fade" id="fasta-url-panel" role="tabpanel" aria-labelledby="fasta-url-tab">
            <div class="mb-3">
              <label for="fasta-url" class="form-label">FASTA File URL</label>
              <input type="url" class="form-control" id="fasta-url" placeholder="https://example.com/alignment.fasta">
              <div class="form-text">Enter the URL of a FASTA alignment file</div>
            </div>
            <div class="text-center p-4">
              <button class="btn btn-primary" id="load-fasta-url-btn" type="button"><i class="bi bi-cloud-download"></i> Load from URL</button>
            </div>
          </div>
          <div class="tab-pane fade" id="fasta-example-panel" role="tabpanel" aria-labelledby="fasta-example-tab">
            <div class="text-center p-4">
              <i class="bi bi-database" style="font-size: 2.5rem; color: #6c757d;"></i>
              <p class="mt-3 mb-3">Load the example alignment dataset</p>
              <button class="btn btn-primary" id="load-example-btn" type="button"><i class="bi bi-database"></i> Load Example Data</button>
            </div>
          </div>
        </div>
        <div id="file-loading" class="text-center py-4" style="display: none;">
          <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading\u2026</span></div>
          <p class="mt-2 text-muted">Loading file\u2026</p>
        </div>
        <div id="file-error" class="alert alert-danger mt-3" role="alert" style="display: none;">
          <i class="bi bi-exclamation-triangle-fill me-2"></i><span id="file-error-text"></span>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function _buildReferenceGenomeModal() {
  return `
<div class="modal fade" id="referenceGenomeModal" tabindex="-1" aria-labelledby="referenceGenomeModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="referenceGenomeModalLabel"><i class="bi bi-file-earmark-code me-2"></i>Load Reference Genome</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <ul class="nav nav-tabs mb-3" id="refGenomeTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="file-tab" data-bs-toggle="tab" data-bs-target="#file-panel" type="button" role="tab" aria-controls="file-panel" aria-selected="true"><i class="bi bi-file-earmark-arrow-up"></i> File</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="url-tab" data-bs-toggle="tab" data-bs-target="#url-panel" type="button" role="tab" aria-controls="url-panel" aria-selected="false"><i class="bi bi-link-45deg"></i> URL</button>
          </li>
        </ul>
        <div class="tab-content" id="refGenomeTabContent">
          <div class="tab-pane fade show active" id="file-panel" role="tabpanel" aria-labelledby="file-tab">
            <div id="ref-genome-drop-zone" class="file-drop-zone text-center p-4 border border-2 border-dashed rounded">
              <i class="bi bi-cloud-arrow-up" style="font-size: 2.5rem; color: #6c757d;"></i>
              <p class="mt-3 mb-2">Drag and drop your reference genome file here</p>
              <p class="text-muted small">or</p>
              <input type="file" id="ref-genome-file-input" accept=".json,.gb,.gbk,.genbank" style="display: none;">
              <button class="btn btn-primary" id="ref-genome-select-btn" type="button"><i class="bi bi-file-earmark-text"></i> Choose File</button>
            </div>
          </div>
          <div class="tab-pane fade" id="url-panel" role="tabpanel" aria-labelledby="url-tab">
            <div class="mb-3">
              <label for="ref-genome-url" class="form-label">Reference Genome URL</label>
              <input type="url" class="form-control" id="ref-genome-url" placeholder="https://example.com/reference.json">
              <div class="form-text">Enter the URL of a JSON or GenBank reference genome file</div>
            </div>
            <div class="text-center p-4">
              <button class="btn btn-primary" id="load-ref-url-btn" type="button"><i class="bi bi-cloud-download"></i> Load from URL</button>
            </div>
          </div>
        </div>
        <div id="ref-genome-loading" class="text-center py-4" style="display: none;">
          <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading\u2026</span></div>
          <p class="mt-2 text-muted">Loading reference genome\u2026</p>
        </div>
        <div id="ref-genome-error" class="alert alert-danger mt-3" role="alert" style="display: none;">
          <i class="bi bi-exclamation-triangle-fill me-2"></i><span id="ref-genome-error-text"></span>
        </div>
        <div id="ref-genome-success" class="alert alert-success mt-3" role="alert" style="display: none;">
          <i class="bi bi-check-circle-fill me-2"></i><span id="ref-genome-success-text"></span>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

// ── Main app HTML assembler ──────────────────────────────────────────────

/**
 * Build the full Sealion app HTML shell.
 * Replaces the <div id="app-html-host"> placeholder.
 */
function buildSealionAppHTML() {
  return `<div id="app">
${_buildToolbar()}
<div id="sealion"></div>
${_buildSearchModal()}
${_buildHelpModal()}
${_buildAboutModal()}
${_buildFileUploadModal()}
${_buildReferenceGenomeModal()}
</div>`;
}

// ── Auto-injection IIFE ──────────────────────────────────────────────────
// Replaces <div id="app-html-host"> with the assembled app HTML.
;(function () {
  const host = document.getElementById('app-html-host');
  if (host) {
    host.outerHTML = buildSealionAppHTML();
  }
})();
