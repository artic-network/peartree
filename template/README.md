# Pearcore App Template

A minimal, copyable boilerplate for creating a new application on the
**pearcore** framework. It provides a working app with: toolbar, settings
panel, canvas rendering, file open (drag-drop + file picker), image export,
help/about panels, dark/light theme, and settings persistence.

## Creating a New App

Replace `myapp` below with your application name (lowercase, no spaces).

### 1. Copy the template

```bash
cp -r template/ myapp/
```

### 2. Rename files

```bash
cd myapp
mv __APPNAME__.html myapp.html
mv css/__APPNAME__.css css/myapp.css
mv js/__APPNAME__.js js/myapp.js
mv js/__APPNAME__-ui.js js/myapp-ui.js
```

### 3. Find-replace the placeholder

Replace every occurrence of `__APPNAME__` with `myapp` in all files:

```bash
# macOS
find . -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.md' \) \
  -exec sed -i '' 's/__APPNAME__/myapp/g' {} +

# Linux
find . -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.md' \) \
  -exec sed -i 's/__APPNAME__/myapp/g' {} +
```

### 4. Move the CSS bundle entry

```bash
mv bundle-styles.css ../scripts/bundle-styles-myapp.css
```

### 5. Register in root package.json

Add `"myapp"` to the `workspaces` array:

```json
"workspaces": [
  "pearcore",
  "peartree",
  "demo",
  "myapp"
]
```

### 6. Register in the build script

Add an entry to `APP_CONFIGS` in `scripts/build-bundle.mjs`:

```js
myapp: {
  entryModule:  resolve(root, 'myapp', 'js', 'myapp.js'),
  cssEntry:     resolve(__dirname, 'bundle-styles-myapp.css'),
  globalName:   'MyApp',
  uiScripts:    [
    resolve(root, 'myapp', 'js', 'myapp-ui.js'),
  ],
  shim: null,
},
```

### 7. Add a bundle npm script (optional)

In the root `package.json`, add:

```json
"bundle:myapp": "node scripts/build-bundle.mjs --app myapp"
```

### 8. Install and test

```bash
npm install              # creates workspace symlinks
```

Open `myapp/myapp.html` in a browser to verify the app loads — you should
see a toolbar, empty-state canvas, and a working settings panel.

Build the single-file bundle:

```bash
npm run bundle:myapp     # → dist/myapp.bundle.min.js
```

## Template Structure

```
template/
  __APPNAME__.html        HTML entry point
  package.json            npm workspace member
  help.md                 Help panel content (Markdown)
  about.md                About panel content (Markdown)
  bundle-styles.css       CSS bundle entry (move to scripts/ after copy)
  css/
    __APPNAME__.css       App-specific styles
  js/
    __APPNAME__.js        ES module entry — exports app(opts)
    __APPNAME__-ui.js     Classic script — builds UI HTML
  data/
    .gitkeep              Sample data directory
```

## What to Customise

| File | What to change |
|---|---|
| `__APPNAME__.js` | Data parsing (`loadContent`), rendering (`render`), settings, export |
| `__APPNAME__-ui.js` | Palette panel controls, toolbar buttons, empty-state text, modals |
| `__APPNAME__.css` | Visual styling for your content |
| `__APPNAME__.html` | Title, favicon, accepted file types |
| `help.md` / `about.md` | Documentation |
