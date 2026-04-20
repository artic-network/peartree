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
# Remove markdown files from the staged output.
find "$DEST" -name '*.md' -delete

echo "Staged Tauri frontend → $DEST"
