#!/usr/bin/env bash
# Build the two release assets from source:
#   releases/family-court-strategist.plugin   (Claude Cowork plugin)
#   releases/family-court-vault-template.zip  (Obsidian vault template)
#
# Always build with this script (or the release workflow) — hand-zipping
# with brace globs has previously baked literal `{a,b,c}/` directories
# into the archives.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/releases"
PLUGIN_ASSET="$OUT/family-court-strategist.plugin"
VAULT_ASSET="$OUT/family-court-vault-template.zip"

mkdir -p "$OUT"
rm -f "$PLUGIN_ASSET" "$VAULT_ASSET"

echo "Building plugin asset..."
(cd "$ROOT/plugin" && zip -r -X -q "$PLUGIN_ASSET" . -x "*.DS_Store")

echo "Building vault template asset..."
(cd "$ROOT/obsidian-vault" && zip -r -X -q "$VAULT_ASSET" . -x "*.DS_Store")

echo
echo "Built:"
ls -lh "$PLUGIN_ASSET" "$VAULT_ASSET"

echo
echo "Sanity check (no stray brace-glob paths):"
if unzip -l "$PLUGIN_ASSET" "$VAULT_ASSET" 2>/dev/null | grep -F '{'; then
  echo "ERROR: literal brace paths found in archive" >&2
  exit 1
fi
echo "OK"
