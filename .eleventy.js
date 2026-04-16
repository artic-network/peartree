const markdownIt = require('markdown-it');
const markdownItAnchorPkg = require('markdown-it-anchor');
const markdownItAnchor = markdownItAnchorPkg.default ?? markdownItAnchorPkg;

// ─── Shortcode helpers ────────────────────────────────────────────────────────

/** Single toolbar button. Usage: {% ptBtn "bi-folder2-open", "Open (⌘O)" %}
 *  Optional third arg:  "disabled"
 *  Optional fourth arg: CSS transform value, e.g. "rotate(90deg)", "scaleX(-1)"
 *  Optional fifth arg:  Bootstrap colour variant, e.g. "primary", "success", "warning"
 *                       Defaults to "secondary". Prefix with "solid-" for filled: "solid-primary" */
function scPtBtn(icon, title, state, transform, colour) {
  const dis = state === 'disabled' ? ' disabled' : '';
  const ariaDis = state === 'disabled' ? ' aria-disabled="true"' : '';
  const style = transform ? ` style="display:inline-block;transform:${transform}"` : '';
  const solid = colour && colour.startsWith('solid-');
  const variant = solid ? colour.slice(6) : (colour || 'secondary');
  const btnClass = solid ? `btn-${variant}` : `btn-outline-${variant}`;
  return `<button class="btn btn-sm ${btnClass}"${dis}${ariaDis} title="${title}"><i class="bi ${icon}"${style}></i></button>`;
}

/** Button group wrapper. Usage: {% ptBtnGroup "label" %}...{% endptBtnGroup %} */
function scPtBtnGroupOpen(label) {
  return `<div class="btn-group ms-1" role="group" aria-label="${label}">`;
}
function scPtBtnGroupClose() { return `</div>`; }

/** Toolbar strip. Usage: {% ptToolbar %}...{% endptToolbar %} */
function scPtToolbarOpen() {
  return `<div class="pt-ui-demo"><nav class="pt-toolbar pt-toolbar-demo d-flex align-items-center gap-1 flex-wrap">`;
}
function scPtToolbarClose() { return `</nav></div>`; }

/** Visual Options panel section (always shown open).
 *  Usage: {% ptSection "Tree", "bi-tree" %}...{% endptSection %} */
function scPtSectionOpen(title, icon) {
  const ico = icon ? `<i class="bi ${icon}"></i> ` : '';
  return `<div class="pt-ui-demo"><div class="pt-palette-section pt-palette-section--open pt-palette-section--demo">` +
    `<h3>${ico}${title}<div class="pt-sec-actions"><i class="pt-sec-chevron bi bi-chevron-down"></i></div></h3>` +
    `<div class="pt-section-body"><div class="pt-section-body-inner">`;
}
function scPtSectionClose() { return `</div></div></div></div>`; }

/** Control row. Usage: {% ptControl "Branch width" %}CONTENT{% endptControl %}
 *  Wraps a label + one or more controls in a .pt-palette-row */
function scPtControlOpen(label) {
  return `<div class="pt-palette-row"><span class="pt-palette-label">${label}</span>`;
}
function scPtControlClose() { return `</div>`; }

/** Subheading inside a section. Usage: {% ptSubhead "Shapes" %} */
function scPtSubhead(label) {
  return `<div class="pt-palette-subhead">${label}</div>`;
}

/** Select control — renders a static <select> with given options.
 *  options is a comma-separated string: "Off,Square,Circle,Block"
 *  Usage: {% ptSelect "Off,Square,Circle,Block", "Square" %} */
function scPtSelect(options, selected) {
  const opts = options.split(',').map(o => o.trim()).map(o =>
    `<option${o === selected ? ' selected' : ''}>${o}</option>`
  ).join('');
  return `<select class="pt-palette-select" tabindex="-1">${opts}</select>`;
}

/** Range slider with value label.
 *  Usage: {% ptSlider "0", "100", "50", "50%" %} */
function scPtSlider(min, max, val, display) {
  return `<input type="range" class="form-range" min="${min}" max="${max}" value="${val}" tabindex="-1" />` +
    (display ? `<span class="pt-val">${display}</span>` : '');
}

/** Colour swatch. Usage: {% ptColour "#b58900" %} */
function scPtColour(hex) {
  return `<span class="pt-palette-color-demo" style="background:${hex};width:22px;height:22px;display:inline-block;border-radius:3px;border:1px solid rgba(255,255,255,0.25);vertical-align:middle;"></span>`;
}

/** Figure with caption.
 *  Usage: {% ptFigure "/manual/images/screenshot.png", "#002b36", "Figure 1. Caption.", "600px" %}
 *  bg defaults to the panel background if omitted.
 *  size is an optional CSS width value (px or %) applied to the whole figure. */
function scPtFigure(src, bg, caption, size) {
  const bgStyle   = bg   ? `background:${bg};`   : 'background:var(--pt-bg-panel,#002b36);';
  const sizeStyle = size ? `max-width:${size};`   : '';
  return `<figure class="pt-figure" style="${sizeStyle}">
  <div class="pt-figure-panel" style="${bgStyle}">
    <img src="${src}" alt="${caption || ''}" loading="lazy">
  </div>${caption ? `
  <figcaption>${caption}</figcaption>` : ''}
</figure>`;
}

/** Import Annotations — CSV configuration dialog mockup (phase 2).
 *  Shows match-column, match-mode, columns-to-import, and replace checkbox,
 *  populated with example column names from the EBOV dataset.
 *  Usage: {% ptImportConfig %} */
function scPtImportConfig() {
  const filename = 'ebov.csv';
  const columns  = ['taxon', 'date', 'country', 'location', 'host'];
  const rows     = 65;

  const matchOpts = columns.map((h, i) =>
    `<option value="${i}"${i === 0 ? ' selected' : ''}>${h}</option>`
  ).join('');

  // taxon (index 0) is the match col — disabled in the import grid
  const colChecks = columns.map((h, i) => {
    const isMatch = i === 0;
    return `<label style="${isMatch ? 'opacity:0.4' : ''}"><input type="checkbox" class="imp-col-chk"${isMatch ? ' disabled' : ' checked'}> ${h}</label>`;
  }).join('');

  return `<div class="pt-ui-demo pt-ui-demo--dialog">
  <div class="pt-modal pt-modal--demo">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-file-earmark-text me-2"></i>${filename}</h5>
      <button class="pt-modal-close-btn" tabindex="-1">&times;</button>
    </div>
    <div class="pt-modal-body">
      <p style="margin:0 0 0.8rem;color:var(--bs-secondary-color)">${rows}&nbsp;rows, ${columns.length}&nbsp;columns</p>

      <div class="imp-section">
        <label class="imp-section-label">Match column</label>
        <div class="imp-row">
          <select class="imp-select" tabindex="-1">${matchOpts}</select>
        </div>
      </div>

      <div class="imp-section">
        <label class="imp-section-label">Match mode</label>
        <div style="display:flex;flex-direction:column;gap:0.3rem;">
          <label class="imp-row" style="cursor:default">
            <input type="radio" name="imp-mode-demo" checked tabindex="-1">
            Full taxon label
          </label>
          <label class="imp-row" style="cursor:default">
            <input type="radio" name="imp-mode-demo" tabindex="-1">
            Pipe-delimited field:&nbsp;
            <input type="number" class="ca-num-input" value="1"
              style="width:52px;padding:0.1rem 0.3rem;font-size:0.82rem;" tabindex="-1">
          </label>
        </div>
      </div>

      <div class="imp-section">
        <label class="imp-section-label">Columns to import</label>
        <div class="imp-col-grid">${colChecks}</div>
        <button class="btn btn-sm btn-outline-secondary"
          style="margin-top:0.4rem;font-size:0.75rem;padding:0.1rem 0.5rem" tabindex="-1">Deselect all</button>
      </div>

      <div class="imp-section">
        <label class="imp-row" style="cursor:default;gap:0.4rem;align-items:flex-start">
          <input type="checkbox" style="margin-top:0.1rem;flex-shrink:0" tabindex="-1">
          <span>Replace existing annotations with the same name
            <span style="display:block;color:var(--bs-secondary-color);font-size:0.75rem">
              Clears matching annotation keys from all nodes before applying new values.
            </span>
          </span>
        </label>
      </div>
    </div>
    <div class="pt-modal-footer">
      <button class="btn btn-sm btn-outline-secondary" tabindex="-1">Cancel</button>
      <button class="btn btn-sm btn-primary" tabindex="-1">Import &#x2192;</button>
    </div>
  </div>
</div>`;
}

/** Import Annotations dialog mockup — File tab only.
 *  Usage: {% ptImportAnnotations %} */
function scPtImportAnnotations() {
  return `<div class="pt-ui-demo pt-ui-demo--dialog">
  <div class="pt-modal pt-modal--demo">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-file-earmark-plus me-2"></i>Import Annotations</h5>
      <button class="pt-modal-close-btn" tabindex="-1">&times;</button>
    </div>
    <div class="pt-modal-body">
      <div class="pt-tabs">
        <button class="pt-tab-btn active" tabindex="-1"><i class="bi bi-folder2-open me-1"></i>File</button>
        <button class="pt-tab-btn" tabindex="-1"><i class="bi bi-link-45deg me-1"></i>URL</button>
      </div>
      <div class="pt-tab-panel active">
        <div class="pt-drop-zone">
          <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
          <p>Drag and drop your annotation file here</p>
          <p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">CSV (.csv) &nbsp;or&nbsp; Tab-separated (.tsv)</p>
          <button class="btn btn-sm btn-outline-primary" tabindex="-1"><i class="bi bi-folder2-open me-1"></i>Choose File</button>
        </div>
      </div>
    </div>
    <div class="pt-modal-footer">
      <button class="btn btn-sm btn-secondary" tabindex="-1">Cancel</button>
    </div>
  </div>
</div>`;
}

/** Open Tree File dialog mockup. Renders the full modal with the given tab active.
 *  Usage: {% ptOpenTree "file" %}  /  {% ptOpenTree "url" %}  /  {% ptOpenTree "example" %} */
function scPtOpenTree(tab) {
  const active = tab || 'file';

  function tabBtn(id, icon, label) {
    const cls = id === active ? 'pt-tab-btn active' : 'pt-tab-btn';
    return `<button class="${cls}" tabindex="-1"><i class="bi ${icon} me-1"></i>${label}</button>`;
  }

  function panel(id, content) {
    return `<div class="pt-tab-panel${id === active ? ' active' : ''}">${id === active ? content : ''}</div>`;
  }

  const fileContent = `
      <div class="pt-drop-zone">
        <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
        <p>Drag and drop your tree file here</p>
        <p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">NEXUS (.nex, .nexus, .tre, .tree, .treefile) &nbsp;or&nbsp; Newick (.nwk, .newick)</p>
        <button class="btn btn-sm btn-outline-primary" tabindex="-1"><i class="bi bi-folder2-open me-1"></i>Choose File</button>
      </div>`;

  const urlContent = `
      <label class="form-label">Tree file URL</label>
      <input type="url" class="pt-modal-url-input" placeholder="https://example.com/tree.nexus" tabindex="-1" />
      <div style="text-align:center">
        <button class="btn btn-sm btn-outline-primary" tabindex="-1"><i class="bi bi-cloud-download me-1"></i>Load from URL</button>
      </div>`;

  const exampleContent = `
      <div class="pt-example-list">
        <div class="pt-example-item">
          <div class="pt-example-desc"><strong>Ebola virus (EBOV)</strong>Phylogenetic tree from the 2014–2016 West Africa epidemic.</div>
          <button class="btn btn-sm btn-outline-success flex-shrink-0" tabindex="-1"><i class="bi bi-tree me-1"></i>Load</button>
        </div>
        <div class="pt-example-item">
          <div class="pt-example-desc"><strong>SARS-CoV-2 (15K)</strong>Large SARS-CoV-2 tree with ~15,000 sequences.</div>
          <button class="btn btn-sm btn-outline-success flex-shrink-0" tabindex="-1"><i class="bi bi-tree me-1"></i>Load</button>
        </div>
        <div class="pt-example-item">
          <div class="pt-example-desc"><strong>Variola virus (VARV)</strong>Smallpox virus (variola) phylogeny.</div>
          <button class="btn btn-sm btn-outline-success flex-shrink-0" tabindex="-1"><i class="bi bi-tree me-1"></i>Load</button>
        </div>
      </div>`;

  return `<div class="pt-ui-demo pt-ui-demo--dialog">
  <div class="pt-modal pt-modal--demo">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-folder2-open me-2"></i>Open Tree File</h5>
      <button class="pt-modal-close-btn" tabindex="-1">&times;</button>
    </div>
    <div class="pt-modal-body">
      <div class="pt-tabs">
        ${tabBtn('file',    'bi-folder2-open', 'File')}
        ${tabBtn('url',     'bi-link-45deg',   'URL')}
        ${tabBtn('example', 'bi-tree',         'Example')}
      </div>
      ${panel('file',    fileContent)}
      ${panel('url',     urlContent)}
      ${panel('example', exampleContent)}
    </div>
  </div>
</div>`;
}

/** Modal dialog mockup.
 *  Usage: {% ptDialog "Export Tree" %}BODY CONTENT{% endptDialog %} */
function scPtDialogOpen(title) {
  return `<div class="pt-ui-demo pt-ui-demo--dialog"><div class="pt-modal pt-modal--demo">` +
    `<div class="pt-modal-header"><span>${title}</span><button class="pt-modal-close btn btn-sm" tabindex="-1"><i class="bi bi-x-lg"></i></button></div>` +
    `<div class="pt-modal-body">`;
}
function scPtDialogClose() { return `</div></div></div>`; }

// ─────────────────────────────────────────────────────────────────────────────

module.exports = function(eleventyConfig) {
  // Copy static assets unchanged into _site/.
  eleventyConfig.addPassthroughCopy({ 'peartree/css': 'css' });
  eleventyConfig.addPassthroughCopy({ 'peartree/manual/images': 'manual/images' });
  eleventyConfig.addPassthroughCopy({ 'peartree/manual/ui-preview.css': 'manual/ui-preview.css' });
  eleventyConfig.addPassthroughCopy({ 'peartree/img': 'img' });
  eleventyConfig.addPassthroughCopy({ 'logo': 'logo' });

  // ── Shortcodes ──────────────────────────────────────────────────────────────
  eleventyConfig.addShortcode('ptFigure',            scPtFigure);
  eleventyConfig.addShortcode('ptBtn',               scPtBtn);
  eleventyConfig.addShortcode('ptSubhead',           scPtSubhead);
  eleventyConfig.addShortcode('ptSelect',            scPtSelect);
  eleventyConfig.addShortcode('ptSlider',            scPtSlider);
  eleventyConfig.addShortcode('ptColour',            scPtColour);
  eleventyConfig.addShortcode('ptOpenTree',          scPtOpenTree);
  eleventyConfig.addShortcode('ptImportAnnotations', scPtImportAnnotations);
  eleventyConfig.addShortcode('ptImportConfig',      scPtImportConfig);

  eleventyConfig.addPairedShortcode('ptToolbar',   scPtToolbarOpen,   scPtToolbarClose);
  eleventyConfig.addPairedShortcode('ptBtnGroup',  scPtBtnGroupOpen,  scPtBtnGroupClose);
  eleventyConfig.addPairedShortcode('ptSection',   scPtSectionOpen,   scPtSectionClose);
  eleventyConfig.addPairedShortcode('ptControl',   scPtControlOpen,   scPtControlClose);
  eleventyConfig.addPairedShortcode('ptDialog',    scPtDialogOpen,    scPtDialogClose);

  // Slugify to match fragment IDs already used in the manual ToC links.
  const slugify = s =>
    s.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  const md = markdownIt({ html: true, linkify: false })
    .use(markdownItAnchor, { slugify });
  eleventyConfig.setLibrary('md', md);

  return {
    dir: {
      input: 'peartree/manual',
      output: '_site',
      includes: '_includes',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
};

