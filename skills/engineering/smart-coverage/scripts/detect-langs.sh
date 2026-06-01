#!/usr/bin/env bash
# Usage: detect-langs.sh [--target BRANCH]
# Outputs JSON: {"files": {path: lang}, "frameworks": [...], "playwright": bool}

set -euo pipefail

TARGET="HEAD"
while [[ $# -gt 0 ]]; do
  case $1 in
    --target) TARGET="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Collect changed files (deduped, directories excluded)
# --untracked-files=all expands untracked dirs to individual files
CHANGED=$(
  { git diff --name-only "$TARGET" 2>/dev/null; git status --short --untracked-files=all 2>/dev/null | awk '{print $2}'; } \
  | sort -u \
  | grep -v '^$' \
  | grep -v '/$' || true
)

if [[ -z "$CHANGED" ]]; then
  echo '{"files":{},"frameworks":[],"playwright":false}'
  exit 0
fi

# Find config files (single find, no per-file tree walk)
CONFIGS=$(find . -maxdepth 4 \
  \( -name 'package.json' -o -name 'go.mod' -o -name 'Cargo.toml' \
     -o -name 'requirements.txt' -o -name 'pyproject.toml' -o -name 'pubspec.yaml' \) \
  -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/target/*' \
  2>/dev/null)

# Map config filename -> language
config_to_lang() {
  case "$(basename "$1")" in
    package.json)                    echo "typescript" ;;
    go.mod)                          echo "golang" ;;
    Cargo.toml)                      echo "rust" ;;
    requirements.txt|pyproject.toml) echo "python" ;;
    pubspec.yaml)                    echo "flutter" ;;
    *)                               echo "fallback" ;;
  esac
}

# For a file path, find the config with longest matching directory prefix
find_lang_for_file() {
  local file="$1"
  local dir
  dir=$(dirname "$file")
  local best_lang="fallback"
  local best_len=-1
  while IFS= read -r cfg; do
    [[ -z "$cfg" ]] && continue
    local cfg_dir
    cfg_dir=$(dirname "${cfg#./}")
    # Check if file's directory starts with cfg_dir
    if [[ "$dir" == "$cfg_dir" || "$dir" == "$cfg_dir/"* || "$cfg_dir" == "." ]]; then
      local len=${#cfg_dir}
      if (( len > best_len )); then
        best_len=$len
        best_lang=$(config_to_lang "$cfg")
      fi
    fi
  done <<< "$CONFIGS"
  # Promote known extensions even when no config file was found
  if [[ "$best_lang" == "fallback" ]]; then
    case "$file" in
      *.sh) best_lang="bash" ;;
    esac
  fi
  echo "$best_lang"
}

# JSON-escape a string (handles backslash and double-quote)
json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# Build files JSON
FILES_JSON="{"
first=true
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  lang=$(find_lang_for_file "$f")
  escaped_f=$(json_escape "$f")
  $first || FILES_JSON+=","
  FILES_JSON+="\"${escaped_f}\":\"${lang}\""
  first=false
done <<< "$CHANGED"
FILES_JSON+="}"

# Detect frameworks from file paths
has_angular=false
has_react=false
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  [[ "$f" == *.component.ts || "$f" == *.module.ts || "$f" == *.service.ts ]] && has_angular=true
  [[ "$f" == *.tsx || "$f" == *.jsx ]] && has_react=true
done <<< "$CHANGED"

FW_ARR=()
$has_angular && FW_ARR+=("\"angular\"")
$has_react   && FW_ARR+=("\"react\"")
if (( ${#FW_ARR[@]} > 0 )); then
  FRAMEWORKS="[$(IFS=,; echo "${FW_ARR[*]}")]"
else
  FRAMEWORKS="[]"
fi

# Detect playwright
PLAYWRIGHT=false
PW=$(find . -maxdepth 3 -name 'playwright.config.*' \
  -not -path '*/node_modules/*' 2>/dev/null | head -1)
[[ -n "$PW" ]] && PLAYWRIGHT=true

# Find co-located tests per source file.
# Outputs candidate paths; caller filters to existing files.
candidate_tests() {
  local file="$1" lang="$2"
  local dir base stem
  dir=$(dirname "$file")
  base=$(basename "$file")
  stem="${base%.*}"
  case "$lang" in
    typescript)
      for ext in ts tsx js jsx; do
        echo "$dir/$stem.test.$ext"
        echo "$dir/$stem.spec.$ext"
        echo "$dir/__tests__/$stem.test.$ext"
        echo "$dir/__tests__/$stem.spec.$ext"
      done
      ;;
    golang)
      echo "$dir/${stem}_test.go"
      ;;
    python)
      echo "$dir/test_$stem.py"
      echo "$dir/${stem}_test.py"
      echo "$dir/tests/test_$stem.py"
      ;;
    rust)
      echo "$dir/tests/${stem}.rs"
      ;;
    flutter)
      echo "$dir/${stem}_test.dart"
      echo "test/${stem}_test.dart"
      ;;
    bash)
      echo "$dir/${stem}.bats"
      echo "$dir/test_${stem}.sh"
      echo "$dir/${stem}_test.sh"
      echo "tests/${stem}.bats"
      ;;
  esac
}

# Build existing_tests JSON
TESTS_JSON="{"
first=true
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  lang=$(find_lang_for_file "$f")
  [[ "$lang" == "fallback" ]] && continue
  # Skip if this file IS itself a test file
  case "$(basename "$f")" in
    *_test.go|*.test.ts|*.test.tsx|*.test.js|*.test.jsx|*.spec.ts|*.spec.tsx|*.spec.js|*.spec.jsx|test_*.py|*_test.py|*_test.dart|*.bats|test_*.sh|*_test.sh) continue ;;
  esac
  matches=()
  while IFS= read -r cand; do
    [[ -z "$cand" ]] && continue
    if [[ -f "$cand" ]]; then
      cand="${cand#./}"
      matches+=("\"$(json_escape "$cand")\"")
    fi
  done < <(candidate_tests "$f" "$lang")
  (( ${#matches[@]} == 0 )) && continue
  escaped_f=$(json_escape "$f")
  $first || TESTS_JSON+=","
  TESTS_JSON+="\"${escaped_f}\":[$(IFS=,; echo "${matches[*]}")]"
  first=false
done <<< "$CHANGED"
TESTS_JSON+="}"

echo "{\"files\":${FILES_JSON},\"frameworks\":${FRAMEWORKS},\"playwright\":${PLAYWRIGHT},\"existing_tests\":${TESTS_JSON}}"
