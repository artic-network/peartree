#!/bin/bash
# Stage web assets into dist-tauri/ for the Tauri build.
# Called automatically via tauri.conf.json → build.beforeBuildCommand.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/dist-tauri"

rm -rf "$DEST"
mkdir -p "$DEST"

# Mirror the two source trees (pearcore + peartree) keeping directory structure.
cp -r "$ROOT/pearcore/." "$DEST/pearcore/"
cp -r "$ROOT/peartree/." "$DEST/peartree/"
# Remove the manual source tree (Eleventy input – not needed in the app).
rm -rf "$DEST/peartree/manual"
# Remove any remaining .md files except help.md and about.md (needed at runtime).
find "$DEST" -name '*.md' ! -name 'help.md' ! -name 'about.md' -delete

# Build a legacy-compatible single-file bundle for the Tauri entry page.
# This avoids runtime reliance on import maps in older macOS WebKit builds.
node "$ROOT/scripts/build-bundle.mjs" \
  --app peartree-tauri \
  --outfile "$DEST/peartree/js/peartree-tauri.bundle.min.js"

echo "Staged Tauri frontend → $DEST"
