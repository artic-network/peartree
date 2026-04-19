// pearcore-ui.js — Generic UI framework (classic script).
//
// Provides reusable HTML builders, a dialog system, side-panel controller,
// dark-mode toggle, help/about panels, and toolbar/status-bar shells.
//
// Loaded as a plain <script> (not a module) so all top-level functions are
// available as globals.  Must be loaded before any app-specific UI script.

// ══════════════════════════════════════════════════════════════════════════
// HTML Builders
// ══════════════════════════════════════════════════════════════════════════

/**
 * Build a generic modal overlay + dialog structure.
 *
 * @param {object}  opts
 * @param {string}  opts.overlayId   - id for the outer overlay div
 * @param {string}  opts.title       - modal title HTML (may contain icons)
 * @param {string}  [opts.icon]      - Bootstrap-icon name (e.g. 'folder2-open')
 * @param {string}  opts.closeId     - id for the close button
 * @param {string}  [opts.body]      - inner body HTML
 * @param {string}  [opts.bodyId]    - id for the body div
 * @param {string}  [opts.footer]    - inner footer HTML
 * @param {string}  [opts.footerId]  - id for the footer div
 * @param {string}  [opts.style]     - inline style for the .pt-modal div
 * @param {string}  [opts.bodyStyle] - inline style for the .pt-modal-body div
 * @param {string}  [opts.overlayStyle] - inline style for the overlay div
 * @returns {string} HTML string
 */
function buildModalHTML(opts = {}) {
  const {
    overlayId, title = '', icon, closeId, body = '', bodyId, footer = '', footerId,
    style = '', bodyStyle = '', overlayStyle = '',
  } = opts;
  const iconEl = icon ? `<i class="bi bi-${icon} me-2"></i>` : '';
  return `\
<div id="${overlayId}" class="pt-modal-overlay"${overlayStyle ? ` style="${overlayStyle}"` : ''}>
  <div class="pt-modal"${style ? ` style="${style}"` : ''}>
    <div class="pt-modal-header">
      <h5 class="modal-title">${iconEl}${title}</h5>
      <button class="pt-modal-close-btn" id="${closeId}" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body"${bodyId ? ` id="${bodyId}"` : ''}${bodyStyle ? ` style="${bodyStyle}"` : ''}>${body}</div>\
${footer ? `\n    <div${footerId ? ` id="${footerId}"` : ''} class="pt-modal-footer">${footer}</div>` : ''}
  </div>
</div>`;
}

/**
 * Build a generic "Open File" dialog with File / URL / Example tabs.
 *
 * All element IDs are prefixed with `opts.prefix` so multiple dialogs can
 * coexist on the same page.  Tabs are opt-in: set `file`, `url`, and/or
 * `example` to true (or an options object) to include them.
 *
 * @param {object}  opts
 * @param {string}  opts.prefix      - ID prefix, e.g. 'tree' → #tree-open-modal
 * @param {string}  opts.title       - modal title, e.g. 'Open Tree File'
 * @param {string}  [opts.icon]      - Bootstrap-icon name (default 'folder2-open')
 *
 * File tab (drag-and-drop + file picker):
 * @param {boolean|object} [opts.file]        - show File tab (default true)
 * @param {string}  [opts.file.accept]        - accept attribute for <input type="file">
 * @param {string}  [opts.file.hint]          - small hint text below the drop area
 * @param {string}  [opts.file.dropText]      - main text inside the drop zone
 *
 * URL tab:
 * @param {boolean|object} [opts.url]         - show URL tab
 * @param {string}  [opts.url.label]          - label above the URL input
 * @param {string}  [opts.url.placeholder]    - placeholder for the URL input
 *
 * Example tab:
 * @param {boolean|object} [opts.example]     - show Example tab
 * @param {string}  [opts.example.icon]       - Bootstrap-icon for tab button
 * @param {string}  [opts.example.label]      - tab button label
 *
 * @returns {string} HTML string
 */
function buildOpenFileDialogHTML(opts = {}) {
  const p     = opts.prefix || 'file';
  const title = opts.title  || 'Open File';
  const icon  = opts.icon   || 'folder2-open';

  const showFile    = opts.file    !== false;
  const showUrl     = opts.url     === true || (typeof opts.url === 'object');
  const showExample = opts.example === true || (typeof opts.example === 'object');

  const fileOpts = typeof opts.file === 'object' ? opts.file : {};
  const urlOpts  = typeof opts.url  === 'object' ? opts.url  : {};
  const exOpts   = typeof opts.example === 'object' ? opts.example : {};

  const accept         = fileOpts.accept      || '';
  const dropText       = fileOpts.dropText    || 'Drag and drop your file here';
  const hint           = fileOpts.hint        || '';
  const urlLabel       = urlOpts.label        || 'File URL';
  const urlPlaceholder = urlOpts.placeholder  || 'https://example.com/file';
  const exIcon         = exOpts.icon          || 'database';
  const exLabel        = exOpts.label         || 'Example';

  // Tab buttons
  const tabs = [];
  if (showFile)    tabs.push(`<button class="pt-tab-btn active" data-tab="file"><i class="bi bi-folder2-open me-1"></i>File</button>`);
  if (showUrl)     tabs.push(`<button class="pt-tab-btn${tabs.length === 0 ? ' active' : ''}" data-tab="url"><i class="bi bi-link-45deg me-1"></i>URL</button>`);
  if (showExample) tabs.push(`<button class="pt-tab-btn${tabs.length === 0 ? ' active' : ''}" data-tab="example"><i class="bi bi-${exIcon} me-1"></i>${exLabel}</button>`);

  const needTabs = tabs.length > 1;

  // File panel
  const filePanel = showFile ? `\
      <div class="pt-tab-panel active" id="${p}-tab-panel-file">
        <div id="${p}-drop-zone" class="pt-drop-zone">
          <div class="pt-drop-icon"><i class="bi bi-file-earmark-arrow-down"></i></div>
          <p>${dropText}</p>${hint ? `\n          <p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">${hint}</p>` : ''}
          <input type="file" id="${p}-file-input"${accept ? ` accept="${accept}"` : ''} style="position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none">
          <button class="btn btn-sm btn-outline-primary" id="${p}-btn-file-choose"><i class="bi bi-folder2-open me-1"></i>Choose File</button>
        </div>
      </div>` : '';

  // URL panel
  const urlPanel = showUrl ? `\
      <div class="pt-tab-panel${!showFile ? ' active' : ''}" id="${p}-tab-panel-url">
        <label class="form-label">${urlLabel}</label>
        <input type="url" class="pt-modal-url-input" id="${p}-url-input" placeholder="${urlPlaceholder}" />
        <div style="text-align:center">
          <button class="btn btn-sm btn-outline-primary" id="${p}-btn-load-url"><i class="bi bi-cloud-download me-1"></i>Load from URL</button>
        </div>
      </div>` : '';

  // Example panel
  const examplePanel = showExample ? `\
      <div class="pt-tab-panel${!showFile && !showUrl ? ' active' : ''}" id="${p}-tab-panel-example">
        <div id="${p}-example-list" class="pt-example-list"></div>
      </div>` : '';

  // Assemble body
  const body = `${needTabs ? `\n      <div class="pt-tabs">${tabs.join('')}</div>` : ''}
${filePanel}${urlPanel}${examplePanel}
      <div class="pt-modal-loading" id="${p}-modal-loading" style="display:none"><div class="pt-spinner"></div>Loading\u2026</div>
      <div class="pt-modal-error" id="${p}-modal-error" style="display:none"></div>`;

  return buildModalHTML({
    overlayId: `${p}-open-modal`,
    title,
    icon,
    closeId: `${p}-btn-modal-close`,
    body,
  });
}

/**
 * Wire up an open-file dialog built by buildOpenFileDialogHTML().
 *
 * @param {Element|Document} root - scope element
 * @param {object}  opts
 * @param {string}  opts.prefix         - same prefix used in buildOpenFileDialogHTML
 * @param {Function} opts.onFile        - async (file: File) => void — called when a file is chosen/dropped
 * @param {Function} [opts.onUrl]       - async (url: string) => void — called when URL is submitted
 * @returns {{ open: Function, close: Function, setError: Function, setLoading: Function, overlay: Element }}
 */
function initOpenFileDialog(root, opts = {}) {
  const _root = root === document ? document : root;
  const $ = id => _root.querySelector('#' + id);
  const p = opts.prefix || 'file';

  const overlay   = $(`${p}-open-modal`);
  const btnClose  = $(`${p}-btn-modal-close`);
  const dropZone  = $(`${p}-drop-zone`);
  const fileInput = $(`${p}-file-input`);
  const btnChoose = $(`${p}-btn-file-choose`);
  const urlInput  = $(`${p}-url-input`);
  const btnUrl    = $(`${p}-btn-load-url`);
  const loadingEl = $(`${p}-modal-loading`);
  const errorEl   = $(`${p}-modal-error`);

  function open()  { setError(null); setLoading(false); overlay?.classList.add('open'); }
  function close() { overlay?.classList.remove('open'); }

  function setError(msg) {
    if (!errorEl) return;
    if (msg) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    else     { errorEl.style.display = 'none'; }
  }

  function setLoading(on) {
    if (loadingEl) loadingEl.style.display = on ? 'block' : 'none';
    overlay?.querySelectorAll('.pt-modal-body button, .pt-tab-btn').forEach(b => {
      if (b !== btnClose) b.disabled = on;
    });
  }

  // Tab switching
  if (overlay) {
    overlay.querySelectorAll('.pt-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.pt-tab-btn').forEach(b => b.classList.remove('active'));
        overlay.querySelectorAll('.pt-tab-panel').forEach(pnl => pnl.classList.remove('active'));
        btn.classList.add('active');
        const panel = $(`${p}-tab-panel-${btn.dataset.tab}`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // Close button
  btnClose?.addEventListener('click', close);

  // File tab: drag-drop + choose
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && opts.onFile) opts.onFile(file);
    });
  }
  btnChoose?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file && opts.onFile) opts.onFile(file);
    fileInput.value = '';
  });

  // URL tab
  btnUrl?.addEventListener('click', () => {
    const url = urlInput?.value.trim();
    if (!url) { setError('Please enter a URL.'); return; }
    if (opts.onUrl) opts.onUrl(url);
  });

  return { open, close, setError, setLoading, overlay };
}

// ── Search Dialog ────────────────────────────────────────────────────────

/**
 * Build HTML for a generic search dialog overlay.
 *
 * Element IDs are prefixed with `opts.prefix` so multiple search dialogs can
 * coexist.  Example with prefix 'seq':
 *   #seq-search-modal, #seq-search-input, #seq-search-find-btn,
 *   #seq-search-status, #seq-search-close-btn
 *
 * @param {object}  opts
 * @param {string}  opts.prefix         - ID prefix, e.g. 'seq' → #seq-search-modal
 * @param {string}  [opts.title]        - dialog title (default 'Search')
 * @param {string}  [opts.icon]         - Bootstrap-icon name (default 'search')
 * @param {string}  [opts.placeholder]  - placeholder for the input/textarea
 * @param {string}  [opts.hint]         - help text below the input
 * @param {string}  [opts.inputType]    - 'textarea' (default) or 'input'
 * @param {number}  [opts.rows]         - rows for textarea (default 2)
 * @param {string}  [opts.findLabel]    - label on the Find button (default 'Find')
 * @param {string}  [opts.findNextLabel] - label for Find Next (default 'Next')
 * @param {string}  [opts.findPrevLabel] - label for Find Prev (default 'Previous')
 * @param {boolean} [opts.showNavButtons] - show Next/Previous buttons (default true)
 * @returns {string} HTML string
 */
function buildSearchDialogHTML(opts = {}) {
  const p     = opts.prefix || 'search';
  const title = opts.title || 'Search';
  const icon  = opts.icon || 'search';
  const placeholder = opts.placeholder || 'Enter search pattern\u2026';
  const hint  = opts.hint || '';
  const rows  = opts.rows || 2;
  const findLabel = opts.findLabel || 'Find';
  const findNextLabel = opts.findNextLabel || 'Next';
  const findPrevLabel = opts.findPrevLabel || 'Previous';
  const showNav = opts.showNavButtons !== false;
  const inputType = opts.inputType || 'textarea';

  const inputHTML = inputType === 'textarea'
    ? `<textarea class="form-control font-monospace" id="${p}-search-input" rows="${rows}" placeholder="${placeholder}" spellcheck="false" autocomplete="off"></textarea>`
    : `<input type="text" class="form-control font-monospace" id="${p}-search-input" placeholder="${placeholder}" spellcheck="false" autocomplete="off">`;

  const hintHTML = hint ? `<div class="pt-search-hint">${hint}</div>` : '';

  const navHTML = showNav ? `\
      <button class="btn btn-sm btn-outline-secondary" id="${p}-search-prev-btn" title="${findPrevLabel}" disabled><i class="bi bi-chevron-up"></i></button>
      <button class="btn btn-sm btn-outline-secondary" id="${p}-search-next-btn" title="${findNextLabel}" disabled><i class="bi bi-chevron-down"></i></button>` : '';

  return `\
<div id="${p}-search-modal" class="pt-modal-overlay">
  <div class="pt-modal pt-search-dialog">
    <div class="pt-modal-header">
      <h5 class="modal-title"><i class="bi bi-${icon} me-2"></i>${title}</h5>
      <button class="pt-modal-close-btn" id="${p}-search-close-btn" title="Close">&times;</button>
    </div>
    <div class="pt-modal-body">
      <div class="pt-search-input-group">
        ${inputHTML}
        ${hintHTML}
      </div>
      <div id="${p}-search-status" class="pt-search-status"></div>
    </div>
    <div class="pt-modal-footer">
${navHTML}
      <button class="btn btn-sm btn-primary" id="${p}-search-find-btn"><i class="bi bi-search me-1"></i>${findLabel}</button>
    </div>
  </div>
</div>`;
}

/**
 * Wire up a search dialog built with buildSearchDialogHTML.
 *
 * @param {Document|Element} root - document or container element
 * @param {object}  opts
 * @param {string}  opts.prefix    - same prefix used in buildSearchDialogHTML
 * @param {Function} opts.onFind   - (query: string) => { count: number, index?: number }
 *                                   Called when user clicks Find or presses Enter.
 *                                   Return count of matches and optional current index (0-based).
 * @param {Function} [opts.onNext] - () => { count: number, index: number }
 *                                   Called when user clicks Next. Returns updated count/index.
 * @param {Function} [opts.onPrev] - () => { count: number, index: number }
 *                                   Called when user clicks Previous. Returns updated count/index.
 * @param {boolean} [opts.closeOnFind] - close dialog on successful find (default true)
 * @returns {{ open: Function, close: Function, setStatus: Function }}
 */
function initSearchDialog(root, opts = {}) {
  const _root = root === document ? document : root;
  const $ = id => _root.querySelector('#' + id);
  const p = opts.prefix || 'search';
  const closeOnFind = opts.closeOnFind !== false;

  const overlay  = $(`${p}-search-modal`);
  const input    = $(`${p}-search-input`);
  const findBtn  = $(`${p}-search-find-btn`);
  const nextBtn  = $(`${p}-search-next-btn`);
  const prevBtn  = $(`${p}-search-prev-btn`);
  const closeBtn = $(`${p}-search-close-btn`);
  const statusEl = $(`${p}-search-status`);

  function open() {
    setStatus('');
    overlay?.classList.add('open');
    setTimeout(() => { if (input) input.focus(); }, 50);
  }

  function close() {
    overlay?.classList.remove('open');
  }

  /**
   * Set the status message.
   * @param {string} msg  - text to display
   * @param {'info'|'success'|'warning'|'error'} [type='info'] - visual style
   */
  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'pt-search-status';
    if (type) statusEl.classList.add(`pt-search-status-${type}`);
  }

  function updateNavButtons(count) {
    if (nextBtn) nextBtn.disabled = !count;
    if (prevBtn) prevBtn.disabled = !count;
  }

  function handleFind() {
    const query = input ? input.value.trim() : '';
    if (!query) { setStatus('Please enter a search pattern.', 'warning'); return; }
    if (!opts.onFind) return;
    const result = opts.onFind(query);
    const count = result?.count ?? 0;
    const index = result?.index ?? 0;
    if (count === 0) {
      setStatus('No matches found.', 'error');
      updateNavButtons(0);
    } else {
      setStatus(`Match ${index + 1} of ${count}.`, 'success');
      updateNavButtons(count);
      if (closeOnFind) close();
    }
  }

  function handleNext() {
    if (!opts.onNext) return;
    const result = opts.onNext();
    const count = result?.count ?? 0;
    const index = result?.index ?? 0;
    if (count > 0) setStatus(`Match ${index + 1} of ${count}.`, 'success');
    updateNavButtons(count);
  }

  function handlePrev() {
    if (!opts.onPrev) return;
    const result = opts.onPrev();
    const count = result?.count ?? 0;
    const index = result?.index ?? 0;
    if (count > 0) setStatus(`Match ${index + 1} of ${count}.`, 'success');
    updateNavButtons(count);
  }

  // Event wiring
  closeBtn?.addEventListener('click', close);
  findBtn?.addEventListener('click', handleFind);
  nextBtn?.addEventListener('click', handleNext);
  prevBtn?.addEventListener('click', handlePrev);

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFind(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  // Close on overlay background click
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return { open, close, setStatus };
}

/**
 * Build the standard error / confirm / prompt dialog HTML.
 * These overlays are required by showConfirmDialog(), showAlertDialog(),
 * and showPromptDialog().
 * @returns {string} HTML string
 */
function buildStandardDialogsHTML() {
  return `\
<div id="error-dialog-overlay">
  <div id="error-dialog">
    <h6><i class="bi bi-exclamation-triangle-fill"></i>Could not open file</h6>
    <p id="error-dialog-msg"></p>
    <button id="error-dialog-ok" class="btn btn-sm btn-primary">OK</button>
    <div style="clear:both"></div>
  </div>
</div>
<div id="confirm-dialog-overlay">
  <div id="confirm-dialog">
    <h6><i class="bi bi-exclamation-triangle"></i><span id="confirm-dialog-title">Warning</span></h6>
    <p id="confirm-dialog-msg"></p>
    <div id="confirm-dialog-footer">
      <button id="confirm-dialog-cancel" class="btn btn-sm btn-outline-secondary">Cancel</button>
      <button id="confirm-dialog-ok" class="btn btn-sm btn-primary">OK</button>
    </div>
  </div>
</div>
<div id="prompt-dialog-overlay">
  <div id="prompt-dialog">
    <h6 id="prompt-dialog-title"></h6>
    <p id="prompt-dialog-msg"></p>
    <input type="text" id="prompt-dialog-input" class="pt-modal-url-input" autocomplete="off" spellcheck="false" />
    <div id="prompt-dialog-footer">
      <button id="prompt-dialog-cancel" class="btn btn-sm btn-outline-secondary">Cancel</button>
      <button id="prompt-dialog-ok" class="btn btn-sm btn-primary">OK</button>
    </div>
  </div>
</div>`;
}

/**
 * Build a generic status bar.
 *
 * @param {object}  [opts]
 * @param {string}  [opts.brandHTML]   - HTML for the brand link (left side)
 * @param {boolean} [opts.themeToggle] - show light/dark mode button (default true)
 * @param {boolean} [opts.about]       - show about button (default true)
 * @param {boolean} [opts.help]        - show help button (default true)
 * @returns {string} HTML string
 */
function buildStatusBarHTML(opts = {}) {
  const showBrand = opts.brandHTML != null;
  const showTheme = opts.themeToggle !== false;
  const showAbout = opts.about       !== false;
  const showHelp  = opts.help        !== false;
  return `\
<div id="status-bar">
  ${showBrand ? opts.brandHTML : ''}
  <span id="status-stats"></span>
  <span id="status-select"></span>
  <span id="status-message"></span>
  ${showTheme ? '<button id="btn-theme" title="Toggle light/dark mode"><i class="bi bi-sun"></i></button>' : ''}
  ${showAbout ? '<button id="btn-about" title="About"><i class="bi bi-info-circle"></i></button>' : ''}
  ${showHelp  ? '<button id="btn-help" title="Help"><i class="bi bi-question-circle"></i></button>' : ''}
</div>`;
}

/**
 * Build help / about slide-out panels.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.help]       - include help panel (default true)
 * @param {boolean} [opts.about]      - include about panel (default true)
 * @param {string}  [opts.helpTitle]  - help panel title (default 'Help')
 * @param {string}  [opts.aboutTitle] - about panel title (default 'About')
 * @param {string}  [opts.aboutLogo]  - <img> tag for about panel header logo
 * @returns {string} HTML string
 */
function buildHelpAboutHTML(opts = {}) {
  const showHelp  = opts.help  !== false;
  const showAbout = opts.about !== false;
  if (!showHelp && !showAbout) return '';
  const helpTitle  = opts.helpTitle  || 'Help';
  const aboutTitle = opts.aboutTitle || 'About';
  const aboutLogo  = opts.aboutLogo  || '';
  return (showHelp ? `\
<div id="help-panel">
  <div id="help-panel-header">
    <h2>${helpTitle}</h2>
    <button id="btn-help-close" title="Close help">&times;</button>
  </div>
  <div id="help-panel-body">
    <div class="help-md" id="help-content"><p style="opacity:0.5">Loading…</p></div>
  </div>
</div>` : '') + (showAbout ? `\
<div id="about-backdrop"></div>
<div id="about-panel">
  <div id="about-panel-header">
    <h2>${aboutLogo}${aboutTitle}</h2>
    <button id="btn-about-close" title="Close">&times;</button>
  </div>
  <div id="about-panel-body">
    <div class="help-md" id="about-content"><p style="opacity:0.5">Loading…</p></div>
  </div>
</div>` : '');
}

/**
 * Build a toolbar shell with left / centre / right sections.
 *
 * @param {object}  opts
 * @param {string}  opts.leftHTML    - HTML content for the left section
 * @param {string}  opts.centerHTML  - HTML content for the centre section
 * @param {string}  opts.rightHTML   - HTML content for the right section
 * @returns {string} HTML string for a <nav class="pt-toolbar">
 */
function buildToolbarShellHTML(opts = {}) {
  return `<nav class="pt-toolbar">\
\n  <div class="pt-toolbar-left">${opts.leftHTML || ''}</div>\
\n  <div class="pt-toolbar-center">${opts.centerHTML || ''}</div>\
\n  <div class="pt-toolbar-right">${opts.rightHTML || ''}</div>\
\n</nav>`;
}

// ══════════════════════════════════════════════════════════════════════════
// Dialog Functions
// ══════════════════════════════════════════════════════════════════════════

/**
 * Show a confirm dialog with a custom title, message, and button labels.
 * Returns a Promise that resolves true (OK) or false (Cancel).
 * Pressing Escape is treated as Cancel.
 */
function showConfirmDialog(title, msg, { okLabel = 'OK', cancelLabel = 'Cancel' } = {}) {
  return new Promise(resolve => {
    const overlay   = document.getElementById('confirm-dialog-overlay');
    document.getElementById('confirm-dialog-title').textContent = title;
    document.getElementById('confirm-dialog-msg').textContent   = msg;
    document.getElementById('confirm-dialog-ok').textContent    = okLabel;
    const cancelBtn = document.getElementById('confirm-dialog-cancel');
    cancelBtn.textContent = cancelLabel;
    cancelBtn.style.display = cancelLabel ? '' : 'none';
    overlay.classList.add('open');
    const okBtn = document.getElementById('confirm-dialog-ok');
    function close(result) {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    }
    function onOk()     { close(true);  }
    function onCancel() { close(false); }
    function onKey(e)   { if (e.key === 'Escape') { e.stopPropagation(); close(false); } }
    okBtn.addEventListener('click',     onOk);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey, true);
  });
}

/**
 * Convenience wrapper: show a confirm dialog with only an OK button.
 * Returns a Promise<true> when the user dismisses it.
 */
function showAlertDialog(title, msg) {
  return showConfirmDialog(title, msg, { okLabel: 'OK', cancelLabel: '' });
}

/**
 * Show a prompt dialog with an optional default value.
 * Returns a Promise resolving to the entered string (trimmed) or null if cancelled.
 * Works in Tauri (WKWebView blocks window.prompt()).
 */
function showPromptDialog(title, msg, defaultValue = '') {
  return new Promise(resolve => {
    const overlay  = document.getElementById('prompt-dialog-overlay');
    const input    = document.getElementById('prompt-dialog-input');
    document.getElementById('prompt-dialog-title').textContent = title;
    document.getElementById('prompt-dialog-msg').textContent   = msg;
    input.value = defaultValue;
    overlay.classList.add('open');
    // Focus input on next tick so the overlay is visible first
    setTimeout(() => { input.focus(); input.select(); }, 30);
    const okBtn     = document.getElementById('prompt-dialog-ok');
    const cancelBtn = document.getElementById('prompt-dialog-cancel');
    function close(result) {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onInputKey);
      document.removeEventListener('keydown', onEsc, true);
      resolve(result);
    }
    function onOk()     { close(input.value.trim() || null); }
    function onCancel() { close(null); }
    function onInputKey(e) { if (e.key === 'Enter') { e.preventDefault(); onOk(); } }
    function onEsc(e)   { if (e.key === 'Escape') { e.stopPropagation(); close(null); } }
    okBtn.addEventListener('click',     onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown',   onInputKey);
    document.addEventListener('keydown', onEsc, true);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// UI Initialisation Helpers
// ══════════════════════════════════════════════════════════════════════════

/**
 * Create a side-panel controller (open / close / pin) for a slide-in panel.
 *
 * The panel DOM must have:
 *   - An element with id `panelId` (the panel)
 *   - A toggle button (id `toggleBtnId`)
 *   - A close button  (id `closeBtnId`)
 *   - A pin button    (id `pinBtnId`)
 *
 * @param {Element} root - scope element (document or embed wrapper)
 * @param {object}  opts
 * @param {string}  opts.panelId
 * @param {string}  opts.toggleBtnId
 * @param {string}  opts.closeBtnId
 * @param {string}  opts.pinBtnId
 * @param {string}  [opts.storageKey]        - localStorage key for pin state
 * @param {string}  [opts.pinnedBodyClass]   - class added to body when pinned (default 'palette-pinned')
 * @param {boolean} [opts.advancedToggle]    - Alt-click opens in 'advanced' mode
 * @param {boolean} [opts.initialPinned]     - restore as pinned
 * @param {boolean} [opts.initialOpen]       - restore as open (unpinned)
 * @param {boolean} [opts.enabled]           - panel enabled (default true)
 * @param {Function} [opts.onStateChange]    - called after every open/close/pin/unpin
 * @returns {{ open, close, pin, unpin, isOpen, isPinned, onChange }}
 */
function initSidePanel(root, opts = {}) {
  const $ = id => root.querySelector('#' + id);
  const _bodyOrWrap = () => root.closest?.('.pt-embed-wrap') ?? document.body;

  const panel     = $(opts.panelId);
  const btnToggle = $(opts.toggleBtnId);
  const btnClose  = $(opts.closeBtnId);
  const btnPin    = $(opts.pinBtnId);
  const STORAGE_KEY  = opts.storageKey || null;
  const PINNED_CLASS = opts.pinnedBodyClass || 'palette-pinned';
  let pinned = false;
  let _onChange = null;

  if (panel) panel.inert = true;

  function _notify() {
    _onChange?.(panel?.classList.contains('open'), pinned);
    opts.onStateChange?.();
  }

  function _afterTransition() {
    const DURATION = 250;
    const start = performance.now();
    function pump(now) {
      window.dispatchEvent(new Event('resize'));
      if (now - start < DURATION) requestAnimationFrame(pump);
    }
    requestAnimationFrame(pump);
  }

  function open(advanced) {
    if (!panel) return;
    panel.classList.add('open');
    panel.inert = false;
    if (opts.advancedToggle) panel.classList.toggle('advanced', !!advanced);
    if (pinned) {
      panel.classList.add('pinned');
      _bodyOrWrap().classList.add(PINNED_CLASS);
    }
    btnToggle?.classList.add('active');
    _afterTransition();
    _notify();
  }

  function close() {
    if (!panel) return;
    panel.classList.remove('open', 'advanced', 'pinned');
    panel.inert = true;
    _bodyOrWrap().classList.remove(PINNED_CLASS);
    btnToggle?.classList.remove('active');
    _afterTransition();
    _notify();
  }

  function pin() {
    if (!panel) return;
    pinned = true;
    if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, '1');
    panel.classList.add('open', 'pinned');
    panel.inert = false;
    _bodyOrWrap().classList.add(PINNED_CLASS);
    if (btnPin) {
      btnPin.classList.add('active');
      btnPin.title = 'Unpin panel';
      btnPin.innerHTML = '<i class="bi bi-pin-angle-fill"></i>';
    }
    btnToggle?.classList.add('active');
    _afterTransition();
    _notify();
  }

  function unpin() {
    if (!panel) return;
    pinned = false;
    if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY);
    panel.classList.remove('pinned');
    _bodyOrWrap().classList.remove(PINNED_CLASS);
    if (btnPin) {
      btnPin.classList.remove('active');
      btnPin.title = 'Pin panel open';
      btnPin.innerHTML = '<i class="bi bi-pin-angle"></i>';
    }
    _afterTransition();
    _notify();
  }

  // Wire up buttons
  if (panel && opts.enabled !== false) {
    btnToggle?.addEventListener('click', e => {
      e.stopPropagation();
      panel.classList.contains('open') ? close() : open(e.altKey);
    });
    btnClose?.addEventListener('click', close);
    btnPin?.addEventListener('click', () => pinned ? unpin() : pin());

    // Restore saved state
    const _wasPinned = opts.initialPinned ?? (STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) === '1' : false);
    const _wasOpen   = opts.initialOpen   ?? false;
    if (_wasPinned)       pin();
    else if (_wasOpen)    open();
  }

  return {
    open, close, pin, unpin,
    isOpen:   () => panel?.classList.contains('open') ?? false,
    isPinned: () => pinned,
    onChange:  (fn) => { _onChange = fn; },
  };
}

/**
 * Initialise the light / dark mode toggle button.
 *
 * @param {Element} root - scope element
 * @param {object}  [opts]
 * @param {string}  [opts.storageKey]  - localStorage key (default 'pt-theme')
 * @param {string}  [opts.theme]       - forced initial theme ('dark' or 'light')
 * @param {boolean} [opts.noStorage]   - disable localStorage persistence
 */
function initDarkModeToggle(root, opts = {}) {
  const $ = id => root.querySelector('#' + id);
  const STORAGE_KEY = opts.storageKey || 'pt-theme';
  const btnTheme = $('btn-theme');
  if (!btnTheme) return;
  const icon = btnTheme.querySelector('i');

  const noStorage = !!opts.noStorage;

  // In embed mode scope the theme attribute to the wrapper element.
  const themeRoot = noStorage
    ? (btnTheme.closest('.pt-embed-wrap') ?? document.documentElement)
    : document.documentElement;

  function applyTheme(mode) {
    if (mode === 'light') {
      themeRoot.setAttribute('data-bs-theme', 'light');
      icon.className = 'bi bi-moon-stars';
      btnTheme.title = 'Switch to dark mode';
    } else {
      themeRoot.setAttribute('data-bs-theme', 'dark');
      icon.className = 'bi bi-sun';
      btnTheme.title = 'Switch to light mode';
    }
  }

  const urlMode = new URLSearchParams(window.location.search).get('mode');
  const saved = (urlMode === 'dark' || urlMode === 'light') ? urlMode
              : opts.theme ?? (!noStorage ? localStorage.getItem(STORAGE_KEY) : null);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ?? (prefersDark ? 'dark' : 'light'));

  btnTheme.addEventListener('click', () => {
    const next = themeRoot.getAttribute('data-bs-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    if (!noStorage) localStorage.setItem(STORAGE_KEY, next);
  });
}

/**
 * Initialise help / about slide-out panels.
 *
 * @param {Element} root - scope element
 * @param {object}  [opts]
 * @param {Function} opts.fetchContent - async (filename) => markdown string
 * @param {string}  [opts.helpFile]    - filename to fetch for help (default 'help.md')
 * @param {string}  [opts.aboutFile]   - filename to fetch for about (default 'about.md')
 * @returns {{ openHelp, closeHelp, openAbout, closeAbout }}
 */
function initHelpAbout(root, opts = {}) {
  const $ = id => root.querySelector('#' + id);

  // ── Help panel ──────────────────────────────────────────────────────────
  const helpPanel    = $('help-panel');
  const helpContent  = $('help-content');
  const btnHelp      = $('btn-help');
  const btnHelpClose = $('btn-help-close');
  let helpLoaded = false;
  if (helpPanel) helpPanel.inert = true;

  // ── About panel ─────────────────────────────────────────────────────────
  const aboutPanel    = $('about-panel');
  const aboutBackdrop = $('about-backdrop');
  const aboutContent  = $('about-content');
  const btnAbout      = $('btn-about');
  const btnAboutClose = $('btn-about-close');
  let aboutLoaded = false;
  if (aboutPanel) aboutPanel.inert = true;

  async function openHelp() {
    if (!helpPanel) return;
    if (!helpLoaded && opts.fetchContent) {
      try {
        const md = await opts.fetchContent(opts.helpFile || 'help.md');
        helpContent.innerHTML = marked.parse(md);
        helpLoaded = true;
      } catch (err) {
        helpContent.innerHTML = `<p style="color:var(--pt-red)">Could not load help: ${err.message}</p>`;
      }
    }
    closeAbout();
    helpPanel.classList.add('open');
    helpPanel.inert = false;
    btnHelp?.classList.add('active');
  }

  function closeHelp() {
    if (!helpPanel) return;
    helpPanel.classList.remove('open');
    helpPanel.inert = true;
    btnHelp?.classList.remove('active');
  }

  async function openAbout() {
    if (!aboutPanel) return;
    if (!aboutLoaded && opts.fetchContent) {
      try {
        const md = await opts.fetchContent(opts.aboutFile || 'about.md');
        aboutContent.innerHTML = marked.parse(md);
        aboutLoaded = true;
      } catch (err) {
        aboutContent.innerHTML = `<p style="color:var(--pt-red)">Could not load about: ${err.message}</p>`;
      }
    }
    closeHelp();
    aboutPanel.classList.add('open');
    aboutPanel.inert = false;
    aboutBackdrop?.classList.add('open');
    btnAbout?.classList.add('active');
  }

  function closeAbout() {
    if (!aboutPanel) return;
    aboutPanel.classList.remove('open');
    aboutPanel.inert = true;
    aboutBackdrop?.classList.remove('open');
    btnAbout?.classList.remove('active');
  }

  // Wire up buttons
  if (btnHelp)      btnHelp.addEventListener('click', e => { e.stopPropagation(); helpPanel?.classList.contains('open') ? closeHelp() : openHelp(); });
  if (btnHelpClose) btnHelpClose.addEventListener('click', closeHelp);
  if (btnAbout)     btnAbout.addEventListener('click', e => { e.stopPropagation(); aboutPanel?.classList.contains('open') ? closeAbout() : openAbout(); });
  if (btnAboutClose) btnAboutClose.addEventListener('click', closeAbout);
  if (aboutBackdrop) aboutBackdrop.addEventListener('click', closeAbout);

  return { openHelp, closeHelp, openAbout, closeAbout };
}

/**
 * Track toolbar height as a CSS custom property --pt-toolbar-h.
 * @param {Element} root - scope element
 */
function initToolbarHeight(root) {
  const toolbar = root.querySelector('.pt-toolbar');
  if (!toolbar) return;
  const docRoot = root === document ? document.documentElement : root;
  function update() {
    docRoot.style.setProperty('--pt-toolbar-h', toolbar.offsetHeight + 'px');
  }
  update();
  new ResizeObserver(update).observe(toolbar);
}

/**
 * Combine all generic UI bindings into a single init call.
 *
 * Returns controllers for the palette/side-panel, help/about, and installs
 * keyboard shortcuts (Tab toggles side-panel, Escape closes panels).
 *
 * @param {Element} root - scope element (document or embed wrapper)
 * @param {object}  opts
 *
 * Side-panel options (forwarded to initSidePanel):
 * @param {boolean} [opts.palettePinned]
 * @param {boolean} [opts.paletteOpen]
 * @param {boolean} [opts.paletteEnabled]
 * @param {Function} [opts.onPaletteStateChange]
 *
 * Help/about options:
 * @param {Function} opts.fetchContent       - async (filename) => markdown
 * @param {boolean}  [opts.helpEnabled]
 * @param {boolean}  [opts.aboutEnabled]
 * @param {string}   [opts.helpFile]
 * @param {string}   [opts.aboutFile]
 *
 * Dark-mode options:
 * @param {string}  [opts.theme]
 * @param {boolean} [opts.noStorage]
 * @param {string}  [opts.themeStorageKey]
 *
 * Keyboard:
 * @param {boolean} [opts.keyboardEnabled]   - default true
 *
 * @returns {{ palette: SidePanelController, helpAbout: HelpAboutController }}
 */
function initCoreUIBindings(root, opts = {}) {
  // ── Side panel (palette) ───────────────────────────────────────────────
  const palette = initSidePanel(root, {
    panelId:       'palette-panel',
    toggleBtnId:   'btn-palette',
    closeBtnId:    'btn-palette-close',
    pinBtnId:      'btn-palette-pin',
    storageKey:    'peartree-palette-pinned',
    advancedToggle: true,
    initialPinned: opts.palettePinned,
    initialOpen:   opts.paletteOpen,
    enabled:       opts.paletteEnabled !== false,
    onStateChange: opts.onPaletteStateChange,
  });

  // ── Help / About ───────────────────────────────────────────────────────
  const helpAbout = initHelpAbout(root, {
    fetchContent: opts.fetchContent,
    helpFile:     opts.helpFile,
    aboutFile:    opts.aboutFile,
  });

  // ── Dark-mode toggle ───────────────────────────────────────────────────
  initDarkModeToggle(root, {
    theme:      opts.theme,
    noStorage:  opts.noStorage,
    storageKey: opts.themeStorageKey,
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  if (opts.keyboardEnabled !== false) {
    // Tab / ⌥Tab toggles palette
    if (opts.paletteEnabled !== false) {
      document.addEventListener('keydown', e => {
        if (!(root === document || root.contains(document.activeElement))) return;
        if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey) {
          const tag = document.activeElement?.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          e.preventDefault();
          if (palette.isPinned()) return;
          palette.isOpen() ? palette.close() : palette.open(e.altKey);
        }
      });
    }
    // Escape closes panels
    document.addEventListener('keydown', e => {
      if (!(root === document || root.contains(document.activeElement))) return;
      if (e.key === 'Escape') {
        helpAbout.closeHelp();
        helpAbout.closeAbout();
        if (!palette.isPinned()) palette.close();
      }
    });
  }

  // ── Toolbar height tracking ────────────────────────────────────────────
  initToolbarHeight(root);

  return { palette, helpAbout };
}
