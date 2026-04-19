// sealion-ui.js — Sealion app UI builder (classic script).
//
// Loaded as a plain <script> so all functions are globals.
// Depends on pearcore-ui.js being loaded first (for buildToolbarShellHTML,
// buildStatusBarHTML, buildHelpAboutHTML, buildStandardDialogsHTML).
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

// ── Nucleotide / amino-acid colour scheme items ──────────────────────────

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

// ── Toolbar section builders ─────────────────────────────────────────────

const SEP = '<div class="pt-toolbar-sep"></div>';

function _tbFileOps() {
  return `\
    <button id="open-file-btn" class="btn btn-sm btn-outline-primary" type="button" title="Open FASTA file (Cmd-O)"><i class="bi bi-folder2-open"></i></button>
    <button id="load-reference-btn" class="btn btn-sm btn-outline-success" type="button" title="Load reference genome"><i class="bi bi-file-earmark-code"></i></button>
    <button id="export-btn" class="btn btn-sm btn-outline-info" type="button" title="Export selection as FASTA file"><i class="bi bi-download"></i></button>`;
}

function _tbZoom() {
  return `\
    <div class="btn-group" role="group" aria-label="Font size controls">
      <button class="btn btn-sm btn-outline-secondary" id="font-decrease-btn" type="button" title="Decrease font size"><i class="bi bi-zoom-out"></i></button>
      <button class="btn btn-sm btn-outline-secondary" id="font-increase-btn" type="button" title="Increase font size"><i class="bi bi-zoom-in"></i></button>
    </div>`;
}

function _tbColour() {
  return `\
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
    </div>`;
}

function _tbShow() {
  return `\
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
    </div>`;
}

function _tbPlot() {
  return `\
    <div class="btn-group" role="group">
      <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-bar-chart"></i> Plot</button>
      <ul class="dropdown-menu">
        <li><button class="dropdown-item plot-type-btn" data-plot-type="entropy" type="button"><i class="bi bi-graph-up"></i> Conservation (entropy)</button></li>
        <li><button class="dropdown-item plot-type-btn" data-plot-type="differences" type="button"><i class="bi bi-bar-chart-fill"></i> Differences from reference</button></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" id="hide-plot-btn" type="button"><i class="bi bi-eye-slash"></i> <span>Hide plot</span></button></li>
      </ul>
    </div>`;
}

function _tbOverview() {
  return `\
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
    </div>`;
}

function _tbDiffNav() {
  return `\
    <div class="btn-group" role="group" aria-label="Navigate differences">
      <button class="btn btn-sm btn-outline-secondary" id="diff-prev-btn" type="button" title="Jump to previous difference from reference"><i class="bi bi-arrow-left-circle"></i></button>
      <button class="btn btn-sm btn-outline-secondary" id="diff-next-btn" type="button" title="Jump to next difference from reference"><i class="bi bi-arrow-right-circle"></i></button>
    </div>`;
}

function _tbTags() {
  return `\
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
    </div>`;
}

function _tbBookmarks() {
  return `\
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
    </div>`;
}

function _tbCollapse() {
  return `\
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
    </div>`;
}

function _tbSearch() {
  return `\
    <div class="btn-group" role="group" aria-label="Sequence search">
      <button class="btn btn-sm btn-outline-secondary" id="seq-search-btn" type="button" title="Search sequence (Cmd-F)"><i class="bi bi-search"></i></button>
      <button class="btn btn-sm btn-outline-secondary" id="find-prev-btn" type="button" title="Previous match (Shift-Cmd-G)"><i class="bi bi-chevron-left"></i></button>
      <button class="btn btn-sm btn-outline-secondary" id="find-next-btn" type="button" title="Next match (Cmd-G)"><i class="bi bi-chevron-right"></i></button>
    </div>`;
}

// ── Toolbar assembler ────────────────────────────────────────────────────

function _buildToolbar() {
  const left = _tbFileOps();
  const centre = [
    _tbZoom(), _tbColour(), _tbShow(), _tbPlot(), _tbOverview(),
    _tbDiffNav(), _tbTags(), _tbBookmarks(), _tbCollapse(),
  ].join(SEP);
  const right = _tbSearch();

  return buildToolbarShellHTML({
    leftHTML:   left,
    centerHTML: centre,
    rightHTML:  right,
  });
}

// ── Status bar ───────────────────────────────────────────────────────────

function _buildStatusBar() {
  return buildStatusBarHTML({
    brandHTML: `<a id="status-brand" href="https://github.com/artic-network/sealion" target="_blank" rel="noopener" title="Sealion on GitHub"><i class="bi bi-dna me-1"></i>Sealion</a>`,
    themeToggle: true,
    about: true,
    help: true,
  });
}

// ── Help / About panels ─────────────────────────────────────────────────

function _buildHelpAbout() {
  return buildHelpAboutHTML({
    help: true,
    about: true,
    helpTitle: 'Sealion Instructions',
    aboutTitle: 'About Sealion',
    aboutLogo: '<i class="bi bi-dna me-2"></i>',
  });
}

// ── Bootstrap modals (search, file upload, reference genome) ─────────────

function _buildSearchModal() {
  return buildSearchDialogHTML({
    prefix:      'seq',
    title:       'Search Sequence',
    icon:        'search',
    placeholder: 'Enter sequence or regex pattern\u2026',
    hint:        'Supports regex patterns (e.g. <code>ATG[CGT]+</code>). Case-insensitive. Searches in currently selected sequence first.',
    inputType:   'textarea',
    rows:        3,
    findLabel:   'Find',
    showNavButtons: true,
  });
}

function _buildFileUploadModal() {
  return buildOpenFileDialogHTML({
    prefix:  'fasta',
    title:   'Open FASTA File',
    icon:    'folder2-open',
    file:    {
      accept:   '.fasta,.fa,.fna,.ffn,.faa,.frn',
      dropText: 'Drag and drop your FASTA file here',
      hint:     'FASTA format (.fasta, .fa, .fna, .ffn, .faa, .frn)',
    },
    url:     {
      label:       'FASTA File URL',
      placeholder: 'https://example.com/alignment.fasta',
    },
    example: {
      icon:  'database',
      label: 'Example',
    },
  });
}

function _buildReferenceGenomeModal() {
  return buildOpenFileDialogHTML({
    prefix:  'refgenome',
    title:   'Load Reference Genome',
    icon:    'file-earmark-code',
    file:    {
      accept:   '.json,.gb,.gbk,.genbank',
      dropText: 'Drag and drop your reference genome file here',
      hint:     'JSON or GenBank format (.json, .gb, .gbk, .genbank)',
    },
    url:     {
      label:       'Reference Genome URL',
      placeholder: 'https://example.com/reference.json',
    },
  });
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
${_buildStatusBar()}
${_buildSearchModal()}
${_buildFileUploadModal()}
${_buildReferenceGenomeModal()}
${buildStandardDialogsHTML()}
${_buildHelpAbout()}
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
