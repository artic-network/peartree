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

echo "Staged Tauri frontend → $DEST"
