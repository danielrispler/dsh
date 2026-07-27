#!/usr/bin/env bash
set -euo pipefail

# Vendor offline-friendly Anthropic plugins into plugins/.
# OPEN-NET ONLY — clones GitHub. Commit the result and push to the closed-net mirror.
# Mirrors the skills/external/ vendoring convention (.git stripped + REFERENCE.md each).

REPO="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="${UPSTREAM:-https://github.com/anthropics/claude-plugins-official.git}"
REF="${UPSTREAM_REF:-main}"

# Offline-friendly set: no runtime network, no LSP-binary fetch, no SaaS MCP.
# Excluded (won't run closed-net): *-lsp, mcp-tunnels, external_plugins/*, demos.
PLUGINS=(
  code-review pr-review-toolkit feature-dev commit-commands code-modernization
  code-simplifier claude-md-management hookify skill-creator plugin-dev
  mcp-server-dev agent-sdk-dev security-guidance claude-security session-report
  receipts project-artifact math-olympiad explanatory-output-style
  learning-output-style frontend-design claude-code-setup ralph-loop
)

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "cloning $UPSTREAM@$REF ..."
git clone --depth 1 --branch "$REF" "$UPSTREAM" "$TMP/src" >/dev/null 2>&1 \
  || git clone --depth 1 "$UPSTREAM" "$TMP/src" >/dev/null
SHA="$(git -C "$TMP/src" rev-parse HEAD)"
DATE="$(date +%Y-%m-%d)"
SRC="$TMP/src/plugins"
MKT="$TMP/src/.claude-plugin/marketplace.json"
DEST="$REPO/plugins"; mkdir -p "$DEST"

for p in "${PLUGINS[@]}"; do
  [ -d "$SRC/$p" ] || { echo "error: upstream plugin missing: $p" >&2; exit 1; }
  rm -rf "$DEST/$p"
  cp -R "$SRC/$p" "$DEST/$p"
  rm -rf "$DEST/$p/.git"

  # Normalize: some upstream plugins ship skills-only with no plugin.json. Write a
  # minimal one from the upstream marketplace entry so every vendored plugin is
  # self-describing (gen-marketplace.sh reads plugin.json uniformly).
  mf="$DEST/$p/.claude-plugin/plugin.json"
  if [ ! -f "$mf" ]; then
    mkdir -p "$DEST/$p/.claude-plugin"
    python3 - "$MKT" "$p" "$mf" <<'PY'
import json, sys
mkt, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
m = json.load(open(mkt))
desc = next((x.get("description", "") for x in m["plugins"] if x.get("name") == name), "")
with open(out, 'w') as f:
    json.dump({"name": name, "description": desc,
               "author": {"name": "Anthropic", "email": "support@anthropic.com"}}, f, indent=2)
    f.write('\n')
PY
  fi

  cat > "$DEST/$p/REFERENCE.md" <<EOF
# $p (vendored plugin)

**Source:** https://github.com/anthropics/claude-plugins-official/tree/main/plugins/$p
**Upstream commit:** $SHA
**Vendored:** $DATE, \`.git\` stripped.

Offline-friendly Anthropic plugin. To update, re-run \`scripts/vendor-plugins.sh\`.
EOF
  echo "vendored $p"
done

echo "generating manifests ..."
bash "$REPO/scripts/gen-marketplace.sh"
echo "done: ${#PLUGINS[@]} plugins vendored into plugins/"
