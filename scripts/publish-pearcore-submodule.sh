#!/usr/bin/env bash
set -euo pipefail

SUBMODULE_PATH="pearcore"

usage() {
  cat <<'EOF'
Usage:
  scripts/publish-pearcore-submodule.sh "<pearcore_commit_message>" ["<peartree_commit_message>"]

Examples:
  scripts/publish-pearcore-submodule.sh "Refactor tree graph helpers"
  scripts/publish-pearcore-submodule.sh "Refactor tree graph helpers" "Bump pearcore submodule"

Behavior:
  1. Validates repo and working tree safety.
  2. Commits + pushes changes in pearcore (current branch, not detached HEAD).
  3. Stages only the pearcore submodule pointer in parent repo.
  4. Commits + pushes parent repo.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 2
fi

SUBMODULE_COMMIT_MSG="$1"
PARENT_COMMIT_MSG="${2:-Bump pearcore submodule}"

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT_DIR" ]]; then
  echo "Error: not inside a git repository." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ ! -d "$SUBMODULE_PATH/.git" && ! -f "$SUBMODULE_PATH/.git" ]]; then
  echo "Error: submodule path '$SUBMODULE_PATH' is not initialized." >&2
  echo "Run: git submodule update --init --recursive" >&2
  exit 1
fi

# Allow only a dirty submodule pointer in the parent repo before running.
PARENT_STATUS="$(git status --porcelain)"
if [[ -n "$PARENT_STATUS" ]]; then
  DISALLOWED="$(printf '%s\n' "$PARENT_STATUS" | grep -Ev "^[ MARCUD?!]{2} ${SUBMODULE_PATH}$" || true)"
  if [[ -n "$DISALLOWED" ]]; then
    echo "Error: parent repo has changes outside '$SUBMODULE_PATH'." >&2
    echo "$DISALLOWED" >&2
    echo "Commit/stash unrelated changes, then rerun." >&2
    exit 1
  fi
fi

pushd "$SUBMODULE_PATH" >/dev/null

SUBMODULE_BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
if [[ -z "$SUBMODULE_BRANCH" ]]; then
  echo "Error: submodule is in detached HEAD. Switch to a branch first." >&2
  popd >/dev/null
  exit 1
fi

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Error: no changes in submodule to commit." >&2
  popd >/dev/null
  exit 1
fi

git add -A
git commit -m "$SUBMODULE_COMMIT_MSG"

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
else
  git push -u origin "$SUBMODULE_BRANCH"
fi

SUBMODULE_HEAD="$(git rev-parse --short=12 HEAD)"
popd >/dev/null

# Stage only submodule pointer update in parent.
git add "$SUBMODULE_PATH"

if git diff --cached --quiet -- "$SUBMODULE_PATH"; then
  echo "Error: no submodule pointer update staged in parent repo." >&2
  exit 1
fi

git commit -m "$PARENT_COMMIT_MSG"

PARENT_BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
if [[ -z "$PARENT_BRANCH" ]]; then
  echo "Error: parent repo is in detached HEAD; cannot push branch safely." >&2
  exit 1
fi

if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
else
  git push -u origin "$PARENT_BRANCH"
fi

PARENT_HEAD="$(git rev-parse --short=12 HEAD)"

echo
echo "Done."
echo "  Submodule branch: $SUBMODULE_BRANCH"
echo "  Submodule commit: $SUBMODULE_HEAD"
echo "  Parent branch:    $PARENT_BRANCH"
echo "  Parent commit:    $PARENT_HEAD"
