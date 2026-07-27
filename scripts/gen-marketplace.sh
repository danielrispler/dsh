#!/usr/bin/env bash
set -euo pipefail

# Generate .claude-plugin/marketplace.json + refresh .claude/settings.json
# (extraKnownMarketplaces + enabledPlugins) from the vendored plugins/ tree.
# Offline — run after vendor-plugins.sh, or after hand-adding a plugin dir.
# Every plugins/<name>/ must carry .claude-plugin/plugin.json (vendor normalizes this).

REPO="$(cd "$(dirname "$0")/.." && pwd)"
# Git URL of the dsh mirror, used for auto-install (extraKnownMarketplaces). FILL ME.
DSH_GIT_URL="${DSH_GIT_URL:-https://gitlab.internal/platform/dsh.git}"

python3 - "$REPO" "$DSH_GIT_URL" <<'PY'
import json, os, sys
repo, url = sys.argv[1], sys.argv[2]
pdir = os.path.join(repo, 'plugins')
names = sorted(d for d in os.listdir(pdir) if os.path.isdir(os.path.join(pdir, d)))
plugins, enabled = [], {}
for n in names:
    mf = os.path.join(pdir, n, '.claude-plugin', 'plugin.json')
    if not os.path.isfile(mf):
        sys.exit(f'error: plugins/{n} missing .claude-plugin/plugin.json (run vendor-plugins.sh)')
    j = json.load(open(mf))
    plugins.append({"name": j["name"], "source": f"./plugins/{n}", "description": j.get("description", "")})
    enabled[f'{j["name"]}@dsh'] = True

mkt = {"name": "dsh", "owner": {"name": "Daniel Rispler"}, "plugins": plugins}
mp = os.path.join(repo, '.claude-plugin', 'marketplace.json')
os.makedirs(os.path.dirname(mp), exist_ok=True)
with open(mp, 'w') as f:
    json.dump(mkt, f, indent=2); f.write('\n')

# settings.json: refresh the two auto-install keys, preserve anything else already there.
sp = os.path.join(repo, '.claude', 'settings.json')
os.makedirs(os.path.dirname(sp), exist_ok=True)
cfg = json.load(open(sp)) if os.path.isfile(sp) else {}
cfg["extraKnownMarketplaces"] = {"dsh": {"source": {"source": "url", "url": url}}}
cfg["enabledPlugins"] = enabled
with open(sp, 'w') as f:
    json.dump(cfg, f, indent=2); f.write('\n')

print(f'wrote marketplace.json ({len(plugins)} plugins) + .claude/settings.json')
PY
