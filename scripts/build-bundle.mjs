#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Produces dist/peartree.bundle.min.js — a single, self-contained file that
 * embeds all PearTree JS modules, all CSS (including the bootstrap-icons font
 * as a base64 data URI), and the compatibility PearTreeEmbed shim.
 *
 * Usage:
 *   node scripts/build-bundle.mjs [--outfile dist/peartree.bundle.min.js]
 *
 * Output can be used as a drop-in replacement for loading the whole
 * peartree/js/ + peartree/css/ tree:
 *
 *   <script src="dist/peartree.bundle.min.js"></script>
 *   <script>
 *     PearTreeEmbed.embed({ container: 'my-tree', treeUrl: 'data/my.tree' });
 *   </script>
 */

import esbuild from 'esbuild';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');

// ── Parse --outfile argument ──────────────────────────────────────────────
const outfileIdx = process.argv.indexOf('--outfile');
const outfile = outfileIdx !== -1
  ? resolve(process.cwd(), process.argv[outfileIdx + 1])
  : resolve(root, 'dist', 'peartree.bundle.min.js');

mkdirSync(dirname(outfile), { recursive: true });

// ── Step A: bundle all JS modules into a minified IIFE ───────────────────
console.log('Bundling JS…');
const jsResult = await esbuild.build({
  entryPoints: [resolve(root, 'peartree', 'js', 'peartree.js')],
  bundle:      true,
  minify:      true,
  format:      'iife',
  globalName:  'PearTree',
  platform:    'browser',
  target:      ['es2020'],
  // peartree-ui.js is loaded at runtime; see guards in peartree.js.
  // We exclude it so it's concatenated as-is (after CSS injection).
  external:    [],
  write:       false,
});
const jsCode = Buffer.from(jsResult.outputFiles[0].contents).toString('utf8');

// ── Step B: bundle CSS (all four files + bootstrap-icons font) ──────────
console.log('Bundling CSS…');
const cssResult = await esbuild.build({
  entryPoints: [resolve(__dirname, 'bundle-styles.css')],
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
// Injects a <style> tag and sets __PEARTREE_CSS_BUNDLED__ so
// _ensureStylesheet() in peartree.js becomes a no-op.
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
// the guards in peartree.js check typeof window.marked / window.buildStandardDialogsHTML / window.buildAppHTML.
console.log('Reading vendor files…');
const markedCode  = readFileSync(
  resolve(root, 'pearcore', 'vendor', 'marked.min.js'), 'utf8'
).trimEnd();
const coreUiCode = readFileSync(
  resolve(root, 'pearcore', 'js', 'pearcore-ui.js'), 'utf8'
).trimEnd();
const uiCode = readFileSync(
  resolve(root, 'peartree', 'js', 'peartree-ui.js'), 'utf8'
).trimEnd();

// ── Step E: PearTreeEmbed compatibility shim ─────────────────────────────
// Exposes window.PearTreeEmbed so existing <script src="…peartree-embed.js">
// usage works without changes.
const shimCode = [
  '(function(){',
  'if(window.PearTree){',
  'window.PearTreeEmbed={',
  'embed:function(o){return window.PearTree.embed(o);},',
  'embedFrame:function(o){return window.PearTree.embedFrame(o);}',
  '};',
  '}',
  '})();',
].join('');

// ── Step F: concatenate and write ────────────────────────────────────────
// Order matters:
//   1. cssInjector  — styles available before any UI is built
//   2. marked       — window.marked set before peartree.js IIFE runs
//   3. pearcore-ui  — generic dialog/panel/toolbar builders
//   4. peartree-ui  — window.buildAppHTML set before embed() is called
//   5. JS IIFE      — PearTree.embed / PearTree.app / etc.
//   6. PearTreeEmbed shim
const banner = `/* PearTree ${process.env.PEARTREE_VERSION_TAG || 'dev'} — single-file bundle */\n`;
const parts  = [banner, cssInjector, '\n', markedCode, '\n', coreUiCode, '\n', uiCode, '\n', jsCode, '\n', shimCode, '\n'];
const output = parts.join('');

writeFileSync(outfile, output, 'utf8');

const kb = (output.length / 1024).toFixed(1);
console.log(`\nBundle written to: ${outfile}`);
console.log(`Bundle size: ${kb} KB (uncompressed)`);
