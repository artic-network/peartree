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
 *   <link rel="stylesheet" href="pearcore/vendor/bootstrap.min-artic.css" />
 *   <link rel="stylesheet" href="pearcore/vendor/bootstrap-icons/bootstrap-icons.css" />
 *
 *   <div id="my-tree"></div>
 *
 *   <script src="pearcore/js/pearcore-embed.js"></script>
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

  // Capture the script element now (before any async code runs, which clears
  // document.currentScript).
  var scriptEl = document.currentScript;

  var pc = window.__pearcore_embed__;
  if (!pc) {
    console.error('peartree-embed.js: pearcore-embed.js must be loaded first');
    return;
  }

  window.PearTreeEmbed = {
    embed: pc.createEmbed({
      scriptEl:    scriptEl,
      modulePath:  'js/peartree.js',
      globalName:  'PearTree',
      stylesheets: [
        'css/peartree.css',
        'css/peartree-embed.css',
      ],
    }),
  };
})();
