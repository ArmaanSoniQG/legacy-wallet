#!/usr/bin/env bash
set -euo pipefail
patchfile="${1:-/dev/stdin}"
git apply --index --whitespace=fix "$patchfile" || {
  echo "3-way merge attempt…" >&2
  git apply -3 "$patchfile"
}
echo "✅ Patch applied. Review with: git status && git diff --cached"