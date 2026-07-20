#!/usr/bin/env bash
set -euo pipefail

# Lists all public skills in the repository with their names and descriptions.

REPO="$(cd "$(dirname "$0")/.." && pwd)"

echo "Public skills:"
echo ""

find "$REPO/skills/internal" -name SKILL.md \
  -not -path '*/node_modules/*' \
  -not -path '*/deprecated/*' \
  -not -path '*/in-progress/*' \
  | sort |
while IFS= read -r skill_md; do
  bucket="$(basename "$(dirname "$(dirname "$skill_md")")")"
  name="$(basename "$(dirname "$skill_md")")"
  description="$(awk '/^description:/{found=1; sub(/^description: /, ""); print; exit} found && /^---/{exit}' "$skill_md")"
  printf "  %-12s %-24s %s\n" "[$bucket]" "$name" "$description"
done
