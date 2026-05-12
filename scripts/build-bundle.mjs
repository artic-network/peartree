#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Produces a single, self-contained JS bundle for a pearcore-based app.
 * Embeds all JS modules, all CSS (including the bootstrap-icons font as a
 * base64 data URI), and optional compatibility shims.
 *
 * Usage:
 *   node scripts/build-bundle.mjs [--app peartree|demo] [--outfile path]
 *
 * --app      Which application to bundle (default: peartree)
 * --outfile  Output path (default: dist/<app>.bundle.min.js)
 *
 * App configurations are defined in APP_CONFIGS below.  Each pearcore-based
 * app specifies its entry module, CSS entry, UI scripts (classic globals),
 * IIFE global name, and optional post-bundle shim.
 */

import esbuild from 'esbuild';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');

// ── App configurations ────────────────────────────────────────────────────
const APP_CONFIGS = {
  peartree: {
    entryModule:  resolve(root, 'peartree', 'js', 'peartree.js'),
    cssEntry:     resolve(__dirname, 'bundle-styles-peartree.css'),
    globalName:   'PearTree',
    uiScripts:    [
      resolve(root, 'peartree', 'js', 'peartree-ui.js'),
    ],
    shim: [
      '(function(){',
      'if(window.PearTree){',
      'window.PearTreeEmbed={',
      'embed:function(o){return window.PearTree.embed(o);},',
      'embedFrame:function(o){return window.PearTree.embedFrame(o);}',
      '};',
      '}',
      '})();',
    ].join(''),
  },
  demo: {
    entryModule:  resolve(root, 'demo', 'js', 'demo.js'),
    cssEntry:     resolve(__dirname, 'bundle-styles-demo.css'),
    globalName:   'DemoApp',
    uiScripts:    [
      resolve(root, 'demo', 'js', 'demo-ui.js'),
    ],
    shim: null,
  },
};

// ── Parse arguments ───────────────────────────────────────────────────────
const appIdx     = process.argv.indexOf('--app');
const appName    = appIdx !== -1 ? process.argv[appIdx + 1] : 'peartree';
const appConfig  = APP_CONFIGS[appName];
if (!appConfig) {
  console.error(`Unknown app: ${appName}. Available: ${Object.keys(APP_CONFIGS).join(', ')}`);
  process.exit(1);
}

const outfileIdx = process.argv.indexOf('--outfile');
const outfile = outfileIdx !== -1
  ? resolve(process.cwd(), process.argv[outfileIdx + 1])
  : resolve(root, 'dist', `${appName}.bundle.min.js`);

mkdirSync(dirname(outfile), { recursive: true });
console.log(`Building bundle for: ${appName}`);

// ── Step A: bundle all JS modules into a minified IIFE ───────────────────
console.log('Bundling JS…');
const jsResult = await esbuild.build({
  entryPoints: [appConfig.entryModule],
  bundle:      true,
  minify:      true,
  format:      'iife',
  globalName:  appConfig.globalName,
  platform:    'browser',
  target:      ['es2020'],
  external:    [],
  write:       false,
});
const jsCode = Buffer.from(jsResult.outputFiles[0].contents).toString('utf8');

// ── Step B: bundle CSS (all files + bootstrap-icons font) ────────────────
console.log('Bundling CSS…');
const cssResult = await esbuild.build({
  entryPoints: [appConfig.cssEntry],
  bundle:      true,
  minify:      true,
  loader: {
    '.woff2': 'dataurl',
    '.woff':  'dataurl',
    '.ttf':   'dataurl',
    '.eot':   'dataurl',
    '.svg':   'dataurl',
  },
  write: false,
});
const cssText = Buffer.from(cssResult.outputFiles[0].contents).toString('utf8');

// ── Step C: build CSS injector snippet ───────────────────────────────────
// Injects a <style> tag and sets a global flag so ensureStylesheet() in
// pearcore-app.js becomes a no-op.
const escapedCss = JSON.stringify(cssText);
const cssInjector = [
  '(function(){',
  'var s=document.createElement("style");',
  `s.textContent=${escapedCss};`,
  'document.head.appendChild(s);',
  'window.__PEARTREE_CSS_BUNDLED__=true;',
  '})();',
].join('');

// ── Step D: read vendor files that are loaded dynamically at runtime ─────
// They're concatenated ahead of the IIFE so they're already evaluated when
// the app module checks typeof window.marked / window globals from UI scripts.
console.log('Reading vendor files…');
const markedCode  = readFileSync(
  resolve(root, 'pearcore', 'vendor', 'marked.min.js'), 'utf8'
).trimEnd();
const coreUiCode = readFileSync(
  resolve(root, 'pearcore', 'js', 'pearcore-ui.js'), 'utf8'
).trimEnd();

// Read app-specific UI scripts (classic globals)
const appUiParts = appConfig.uiScripts.map(path => readFileSync(path, 'utf8').trimEnd());

// ── Step E: concatenate and write ────────────────────────────────────────
// Order matters:
//   1. cssInjector     — styles available before any UI is built
//   2. marked          — window.marked set before app IIFE runs
//   3. pearcore-ui     — generic dialog/panel/toolbar builders
//   4. app-specific UI — window globals (e.g. buildAppHTML) before embed() is called
//   5. JS IIFE         — bundled app modules
//   6. optional shim   — compatibility (e.g. PearTreeEmbed)
const versionTag = process.env.PEARTREE_VERSION_TAG || 'dev';
const banner = `/* ${appName} ${versionTag} — single-file bundle */\n`;
const parts  = [banner, cssInjector, '\n', markedCode, '\n', coreUiCode, '\n'];
for (const ui of appUiParts) parts.push(ui, '\n');
parts.push(jsCode, '\n');
if (appConfig.shim) parts.push(appConfig.shim, '\n');
const output = parts.join('');

writeFileSync(outfile, output, 'utf8');

const kb = (output.length / 1024).toFixed(1);
console.log(`\nBundle written to: ${outfile}`);
console.log(`Bundle size: ${kb} KB (uncompressed)`);
