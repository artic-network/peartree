/**
 * pearcore-embed.js — Generic embed shim utilities for pearcore-based apps.
 *
 * Provides helpers for non-module embed shims that need to:
 *   1. Auto-detect the app's asset base from the script's src attribute
 *   2. Dynamically inject stylesheets (idempotent)
 *   3. Dynamically load scripts (idempotent)
 *   4. Load the app module and forward the embed() call
 *
 * This file is intended to be loaded by the app-specific embed shim
 * (e.g. peartree-embed.js) which is a classic (non-module) script.
 * Since classic scripts can't use ES module imports, these utilities
 * are exposed on window.__pearcore_embed__.
 *
 * @example
 *   // In peartree-embed.js (classic script):
 *   const { detectBase, ensureStylesheet, loadScript } = window.__pearcore_embed__;
 *   const base = detectBase();
 *   ensureStylesheet(base + 'css/peartree.css');
 *   await loadScript(base + 'js/peartree.js', true);
 *   window.PearTree.embed(options);
 */
(function () {
  'use strict';

  /**
   * Auto-detect the asset base from the calling script's `src` attribute.
   * Convention: the embed shim lives at `<root>/js/<file>.js`, so the root
   * is one directory up from the script's directory.
   *
   * @param {HTMLScriptElement} [scriptEl] - The script element (defaults to document.currentScript)
   * @returns {string} The base path (e.g. 'https://example.com/peartree/')
   */
  function detectBase(scriptEl) {
    const src = ((scriptEl || document.currentScript || {}).src || '');
    const dir = src ? src.substring(0, src.lastIndexOf('/') + 1) : '';
    return dir ? dir + '../' : '';
  }

  /**
   * Idempotent stylesheet injection. Skips if a matching href is already loaded.
   * @param {string} href - URL of the stylesheet to inject
   */
  function ensureStylesheet(href) {
    const a = document.createElement('a');
    a.href = href;
    const abs = a.href;
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let i = 0; i < links.length; i++) {
      if (links[i].href === abs) return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = abs;
    document.head.appendChild(link);
  }

  /**
   * Dynamically load a script, returning a Promise. Idempotent: skips if
   * a <script> with the same src already exists.
   * @param {string} src - URL of the script to load
   * @param {boolean} [isModule] - Whether to load as type="module"
   * @returns {Promise<void>}
   */
  function loadScript(src, isModule) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var el = document.createElement('script');
      if (isModule) el.type = 'module';
      el.src = src;
      el.onload = resolve;
      el.onerror = function () { reject(new Error('pearcore-embed: failed to load ' + src)); };
      document.head.appendChild(el);
    });
  }

  /**
   * Create a standard embed function for a pearcore-based app.
   *
   * @param {object} config
   * @param {string}   config.modulePath      - Relative path from base to the app module (e.g. 'js/peartree.js')
   * @param {string}   config.globalName       - Window property the module registers (e.g. 'PearTree')
   * @param {string[]} config.stylesheets      - Relative paths from base to CSS files to inject
   * @param {HTMLScriptElement} [config.scriptEl] - The embed shim's script element
   * @returns {function(object): void} The embed function to expose on window
   */
  function createEmbed(config) {
    var scriptEl = config.scriptEl || document.currentScript;
    var autoBase = detectBase(scriptEl);

    return function embed(options) {
      if (!options) throw new Error('embed: options object is required');

      var base = typeof options.base === 'string' ? options.base : autoBase;

      // Inject styles immediately so the host page doesn't flash unstyled.
      for (var i = 0; i < config.stylesheets.length; i++) {
        ensureStylesheet(base + config.stylesheets[i]);
      }

      // Load the app module and forward the embed call.
      loadScript(base + config.modulePath, true).then(function () {
        var appGlobal = window[config.globalName];
        if (!appGlobal || typeof appGlobal.embed !== 'function') {
          throw new Error('embed: ' + config.globalName + '.embed() not found after loading module');
        }
        return appGlobal.embed(Object.assign({ base: base }, options));
      }).catch(function (err) {
        console.error(err);
      });
    };
  }

  // Expose utilities for app-specific embed shims.
  window.__pearcore_embed__ = {
    detectBase: detectBase,
    ensureStylesheet: ensureStylesheet,
    loadScript: loadScript,
    createEmbed: createEmbed,
  };
})();
