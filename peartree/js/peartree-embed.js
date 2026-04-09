/**
 * peartree-embed.js
 *
 * Simplified API for embedding PearTree directly in a page.
 * Exposes a single global `PearTreeEmbed.embed(options)` function that
 * injects the complete PearTree viewer into a target container element.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────
 *
 *   <!-- 1. Load required stylesheets -->
 *   <link rel="stylesheet" href="css/bootstrap.min-artic.css" />
 *   <link rel="stylesheet" href="vendor/bootstrap-icons/bootstrap-icons.css" />
 *   <script src="vendor/marked.min.js"></script>
 *
 *   <!-- 2. Container element with explicit height -->
 *   <div id="my-tree" style="height:600px"></div>
 *
 *   <!-- 3. Load the embed API -->
 *   <script src="js/peartree-embed.js"></script>
 *
 *   <!-- 4. Initialise -->
 *   <script>
 *     PearTreeEmbed.embed({
 *       container: 'my-tree',        // element ID or HTMLElement
 *
 *       // ── Tree input: one of these two ──
 *       tree:    '((A:1,B:1):1);',   // inline Newick/NEXUS string
 *       // OR:
 *       treeUrl: 'data/my.tree',      // URL – fetched at runtime
 *
 *       filename: 'my.nwk',          // optional – used for format detection
 *
 *       // ── Appearance ──
 *       theme:  'dark',              // 'dark' | 'light'           (default: 'dark')
 *       height: '600px',             // CSS height string          (default: '600px')
 *                                    //   (ignored if container already has a height)
 *
 *       // ── Initial visual settings (mirrors the Palette panel) ──
 *       settings: {
 *         tipLabelShow: 'names',
 *         axisShow:     'time',
 *         // any key accepted by peartree.js initSettings
 *       },
 *
 *       // ── UI feature flags (all default to true) ──
 *       ui: {
 *         palette:   true,   // Visual Options panel + toggle button
 *         openTree:  false,  // Open / Import controls
 *         import:    false,  // same as openTree (alias)
 *         export:    true,   // Export tree / graphic buttons
 *         rtt:       false,  // Root-to-tip panel
 *         dataTable: false,  // Data table panel
 *         statusBar: true,   // Status bar
 *       },
 *
 *       // ── Palette sections (default: all) ──
 *       // Controls which sections appear in the Visual Options panel.
 *       // Pass 'all' or an array of section keys:
 *       //   'tree' | 'tipLabels' | 'labelShapes' | 'tipShapes' |
 *       //   'nodeShapes' | 'nodeLabels' | 'nodeBars' | 'collapsedClades' |
 *       //   'legend' | 'axis' | 'selectionHover' | 'rtt' | 'theme'
 *       paletteSections: ['tree', 'tipLabels', 'axis', 'theme'],
 *     });
 *   </script>
 *
 * ── Notes ─────────────────────────────────────────────────────────────────
 *   • Only ONE PearTree instance per page (DOM element IDs must be unique).
 *   • Settings are NEVER persisted to localStorage (storageKey is always null).
 *   • CSS is injected automatically; pass base: 'https://…/peartree/' to
 *     override the auto-detected asset root.
 */
(function () {
  'use strict';

  // ── Auto-detect the peartree asset root from this script's src ──────────
  // Convention: this file lives at <root>/js/peartree-embed.js, so the root
  // is one directory up.  Works for both relative and absolute src paths.
  const _scriptSrc = (document.currentScript || {}).src || '';
  const _scriptDir = _scriptSrc ? _scriptSrc.substring(0, _scriptSrc.lastIndexOf('/') + 1) : '';
  const _autoBase  = _scriptDir ? _scriptDir + '../' : '';

  // ── CSS stylesheet injection helper ────────────────────────────────────
  // Resolves href to an absolute URL so it matches both relative and
  // absolute hrefs already present in the document.
  function _ensureStylesheet(href) {
    const a = document.createElement('a');
    a.href = href;
    const abs = a.href;
    const existing = document.querySelectorAll('link[rel="stylesheet"]');
    for (let i = 0; i < existing.length; i++) {
      if (existing[i].href === abs) return;
    }
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = abs;
    document.head.appendChild(link);
  }

  // ── Script loader (returns a promise) ──────────────────────────────────
  function _loadScript(src, isModule) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      if (isModule) el.type = 'module';
      el.src = src;
      el.onload  = resolve;
      el.onerror = () => reject(new Error('peartree-embed: failed to load ' + src));
      document.head.appendChild(el);
    });
  }

  // ── Full canonical HTML template ────────────────────────────────────────
  // Delegates to buildAppHTML() in peartree-ui.js (loaded before this script
  // in the embed page's <head>).  Section selection is driven by
  // window.peartreeConfig.appSections / toolbarSections set below in embed().
  function _buildHTML() {
    const appSec = window.peartreeConfig?.appSections    || 'all';
    const tbSec  = window.peartreeConfig?.toolbarSections || 'all';
    return buildAppHTML(appSec, tbSec);
  }

  // ── Main embed function ─────────────────────────────────────────────────
  function embed(options) {
    if (!options) throw new Error('peartree-embed: options object is required');

    // Resolve container element
    const container = typeof options.container === 'string'
      ? document.getElementById(options.container)
      : options.container;
    if (!container) throw new Error('peartree-embed: container element not found: ' + options.container);

    // Base path for assets (default: auto-detected from this script's location)
    const base = typeof options.base === 'string' ? options.base : _autoBase;

    // Merge ui flags (all default true)
    const ui = Object.assign({
      palette:   true,
      openTree:  true,
      import:    true,
      export:    true,
      rtt:       true,
      dataTable: true,
      statusBar: true,
    }, options.ui || {});
    // `openTree` and `import` are aliases for the same flag.
    if (ui.openTree === false) ui.import = false;
    if (ui.import   === false) ui.openTree = false;

    // Set window.peartreeConfig BEFORE injecting HTML (peartree.js reads it
    // synchronously at module-parse time using the d-none class trick).
    window.peartreeConfig = {
      ui: {
        palette:   ui.palette,
        openTree:  ui.openTree,
        rtt:       ui.rtt,
        dataTable: ui.dataTable,
        import:    ui.import,
        export:    ui.export,
        statusBar: ui.statusBar,
        theme:     options.theme || 'dark',
      },
      // null = never persist settings to localStorage for embedded viewers
      storageKey: null,
      // `settings` is the key peartree.js reads (maps to internal initSettings)
      settings: options.settings || {},
      // paletteSections controls which sections peartree-ui.js builds into the panel
      paletteSections:  options.paletteSections  || 'all',
      // appSections / toolbarSections control which HTML sections buildAppHTML() generates
      appSections:      options.appSections      || 'all',
      toolbarSections:  options.toolbarSections  || 'all',
    };

    // Inject peartree CSS (no-op if already present)
    _ensureStylesheet(base + 'css/peartree.css');
    _ensureStylesheet(base + 'css/peartree-embed.css');

    // Build the wrapper and inject HTML
    const height = options.height || '600px';
    const theme  = options.theme  || 'dark';
    const wrap = document.createElement('div');
    wrap.className = 'pt-embed-wrap';
    wrap.setAttribute('data-bs-theme', theme);
    wrap.style.height = height;
    wrap.innerHTML = _buildHTML();
    container.appendChild(wrap);

    // Load scripts in dependency order:
    //   marked.min.js  → peartree-ui.js (builds palette panel) → peartree.js
    _loadScript(base + 'vendor/marked.min.js', false).then(() => {
      return _loadScript(base + 'js/peartree-ui.js', false);
    }).then(() => {
      // Load peartree.js (module) after UI helpers are ready
      return _loadScript(base + 'js/peartree.js', true);
    }).then(() => {
      // Dispatch the tree once peartree engine has fired peartree-ready
      function _dispatchTree() {
        if (typeof options.tree === 'string') {
          window.dispatchEvent(new MessageEvent('message', {
            data:   {
              type:     'pt:loadTree',
              text:     options.tree,
              filename: options.filename || 'tree.nwk',
            },
            origin: window.location.origin,
          }));
        } else if (typeof options.treeUrl === 'string') {
          window.dispatchEvent(new MessageEvent('message', {
            data:   {
              type:     'pt:loadTree',
              url:      options.treeUrl,
              filename: options.filename || options.treeUrl.split('/').pop() || 'tree',
            },
            origin: window.location.origin,
          }));
        }
      }

      // peartree-ready may already have fired during script load (unlikely but safe)
      if (window.peartree) {
        _dispatchTree();
      } else {
        window.addEventListener('peartree-ready', _dispatchTree, { once: true });
      }
    }).catch(err => {
      console.error(err);
    });
  }

  // ── Expose public API ───────────────────────────────────────────────────
  window.PearTreeEmbed = { embed };
})();
