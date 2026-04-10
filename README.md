# PearTree

**A browser-based phylogenetic tree viewer for exploring and annotating evolutionary trees.**

PearTree is the successor to [FigTree](https://github.com/rambaut/figtree), rewritten as a modern, zero-install web application. It runs entirely in the browser with no server required, and can also be installed as a native desktop app on macOS, Windows, and Linux.

---

## Live Web App

**[peartree.live](https://peartree.live)** — open any NEXUS or Newick tree file directly from your browser. Nothing to install.

---

## Deployment Options

### 1. Web app — use it online

Visit **[peartree.live](https://peartree.live)**. No installation needed. Drag and drop a tree file or load the built-in example.

### 2. Desktop app — download a binary release

Pre-built installers for macOS (universal), Windows, and Linux are attached to each [GitHub release](https://github.com/artic-network/peartree/releases). Download the installer for your platform and run it — no dependencies required.

### 3. Self-host the web app

The `index.html` at the repo root is a thin iframe wrapper around `peartree/peartree.html`. You can serve the entire `peartree/` directory from any static web server:

```
peartree/
  peartree.html   ← entry point
  js/             ← source modules
  css/
  vendor/
  data/           ← example trees
  img/
```

### 4. Embed in a report or dashboard — single file

Each release includes `peartree.bundle.min.js` — a single self-contained JavaScript file (~480 KB gzipped) that bundles all JS, CSS, and fonts. Drop it into any HTML page and call `PearTreeEmbed.embed()`:

```html
<script src="peartree.bundle.min.js"></script>
<script>
  PearTreeEmbed.embed({
    container: 'my-tree',
    treeUrl:   'data/my.tree',
    height:    '600px',
  });
</script>
```

The bundle is also served directly from GitHub Pages and can be loaded by URL:

```html
<script src="https://peartree.live/peartree.bundle.min.js"></script>
```

See **[embedded-api.md](embedded-api.md)** for the full embedding API reference.

### 5. Build the desktop app from source

See **[tauri-build.md](tauri-build.md)** for instructions on building the Tauri desktop app on macOS, Windows, and Linux.

---

## Documentation

| Document | Description |
|----------|-------------|
| [tutorial.md](tutorial.md) | Step-by-step walkthrough of PearTree's main features using the built-in EBOV example |
| [embedded-api.md](embedded-api.md) | Full API reference for embedding PearTree in reports and dashboards |
| [tauri-build.md](tauri-build.md) | Instructions for building the native desktop app from source |

---

## Repository Structure

```
peartree/              Web app source
  peartree.html        Standalone app entry point
  js/                  ES module source files
  css/                 Stylesheets
  vendor/              Vendored dependencies (Bootstrap Icons, marked.js)
  data/                Example tree files
  img/                 Icons and images
  about.md             About text (shown in the app)
  help.md              Help text (shown in the app)
src-tauri/             Tauri desktop wrapper (Rust)
scripts/               Build scripts
  build-bundle.mjs     Generates peartree.bundle.min.js
  set-version.js       Injects version tag into source before a release
.github/workflows/
  release.yml          CI: builds desktop apps + bundle; deploys to GitHub Pages on version tags
index.html             Iframe wrapper (local dev / repo browsing)
```

---

## Releases & CI

Tagging a release (`git tag v0.x.y && git push origin v0.x.y`) triggers the GitHub Actions workflow which:

1. Creates a draft GitHub release
2. Builds native desktop installers (macOS universal, Windows, Linux)
3. Builds `peartree.bundle.min.js` and attaches it to the release
4. Deploys the live site to `docs/` which GitHub Pages serves at [peartree.live](https://peartree.live)

---

## Credits

**Design & development:** [Andrew Rambaut](https://github.com/rambaut) (University of Edinburgh)

Supported by the **Wellcome Trust** through the [ARTIC Network](https://artic.network/) and the **Bill & Melinda Gates Foundation**.

---

## License

[MIT](LICENSE)
