Skills split into two trees under `skills/`:

- `skills/internal/` — skills that live in this repo, grouped into bucket folders.
- `skills/external/` — vendored copies of third-party skill repos (cloned in, `.git` stripped). Each holds a `REFERENCE.md` recording its upstream source. `SKILL.md` files live under `external/`, but the link/list scripts and `plugin.json`/top-level `README.md` cover `skills/internal/` only — externals stay unregistered and are not linked locally.

Bucket folders under `skills/internal/`:

- `engineering/` — daily code work
- `productivity/` — daily non-code workflow tools
- `misc/` — kept around but rarely used
- `in-progress/` — drafts not yet ready to ship
- `deprecated/` — no longer used

Every skill in `skills/internal/{engineering,productivity,misc}/` must have a reference in the top-level `README.md` and an entry in `.claude-plugin/plugin.json` (path form `skills/internal/<bucket>/<name>`). Skills in `in-progress/` and `deprecated/`, and everything under `external/`, must not appear in either.

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

Each bucket folder has a `README.md` that lists every skill in the bucket with a one-line description, with the skill name linked to its `SKILL.md`.

## Plugins (marketplace)

`plugins/` is a separate top-level tree of full Claude Code **plugins** (commands + agents +
hooks + skills), vendored from `anthropics/claude-plugins-official` with `.git` stripped and a
`REFERENCE.md` each — same convention as `skills/external/`. `dsh` is itself the marketplace:
`.claude-plugin/marketplace.json` lists every plugin, and `.claude/settings.json`
(`extraKnownMarketplaces` + `enabledPlugins`) auto-installs the set closed-net.

This is a distinct lane from skills — `grab-skills`, `link-skills`, `plugin.json`, and the
skill tables in `README.md` do **not** cover `plugins/`.

Do not hand-edit `.claude-plugin/marketplace.json` or the `extraKnownMarketplaces`/
`enabledPlugins` keys of `.claude/settings.json` — they are generated. After adding or
removing a `plugins/<name>/` dir, run `scripts/gen-marketplace.sh` to regenerate both.
`scripts/vendor-plugins.sh` (open-net only) re-vendors the offline-friendly set from upstream
and calls `gen-marketplace.sh`. Every `plugins/<name>/` must have a
`.claude-plugin/plugin.json` whose `name` equals `<name>`; `test.js` enforces
`plugins/` ↔ `marketplace.json` ↔ `enabledPlugins` sync.
