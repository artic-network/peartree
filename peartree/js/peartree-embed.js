/**
 * peartree-embed.js  — thin backward-compatible shim
 *
 * Exposes `window.PearTreeEmbed.embed(options)` for pages that load this
 * script via a plain <script src="…"> tag.  The implementation now lives in
 * peartree.js; this shim loads it as an ES module and forwards the call.
 *
 * New code should use the module API instead:
 *
 *   import { embed } from './js/peartree.js';
 *   embed({ container: 'my-tree', treeUrl: 'data/my.tree', … });
 *
 * ── Usage (legacy / non-module pages) ──────────────────────────────────────
 *
 *   <link rel="stylesheet" href="peartree/css/bootstrap.min-artic.css" />
 *   <link rel="stylesheet" href="peartree/vendor/bootstrap-icons/bootstrap-icons.css" />
 *
 *   <div id="my-tree"></div>
 *
 *   <script src="peartree/js/peartree-embed.js"></script>
 *   <script>
 *     PearTreeEmbed.embed({
 *       container: 'my-tree',
 *       treeUrl:   'data/my.tree',
 *       height:    '600px',
 *       theme:     'dark',
 *     });
 *   </script>
 */
(function () {
  'use strict';

  // ── Auto-detect the peartree asset root from this script's src ──────────
  // Convention: this file lives at <root>/js/peartree-embed.js so the root
  // is one directory up.
  const _scriptSrc = (document.currentScript || {}).src || '';
  const _scriptDir = _scriptSrc ? _scriptSrc.substring(0, _scriptSrc.lastIndexOf('/') + 1) : '';
  const _autoBase  = _scriptDir ? _scriptDir + '../' : '';

  function _loadScript(src, isModule) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      const el = document.createElement('script');
      if (isModule) el.type = 'module';
      el.src = src;
      el.onload  = resolve;
      el.onerror = () => reject(new Error('peartree-embed: failed to load ' + src));
      document.head.appendChild(el);
    });
  }

  function _ensureStylesheet(href) {
    const a = document.createElement('a');
    a.href = href;
    const abs = a.href;
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let i = 0; i < links.length; i++) {
      if (links[i].href === abs) return;
    }
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = abs;
    document.head.appendChild(link);
  }

  function embed(options) {
    if (!options) throw new Error('PearTreeEmbed.embed: options object is required');

    const base = typeof options.base === 'string' ? options.base : _autoBase;

    // Inject styles immediately so the host page doesn't flash unstyled while
    // the module loads.
    _ensureStylesheet(base + 'css/peartree.css');
    _ensureStylesheet(base + 'css/peartree-embed.css');

    // Load peartree.js as a module (idempotent: already-loaded modules are
    // served from the module registry without re-executing).  Once loaded,
    // PearTree.embed() is available on window.
    _loadScript(base + 'js/peartree.js', true).then(function () {
      // Forward to the real implementation with the resolved base path so
      // peartree.js can locate marked.min.js and peartree-ui.js.
      return window.PearTree.embed(Object.assign({ base: base }, options));
    }).catch(function (err) {
      console.error(err);
    });
  }

  window.PearTreeEmbed = { embed };
})();
