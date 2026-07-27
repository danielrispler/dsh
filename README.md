# dsh

**daniel-skill-hub** — agent skills for real engineers. Install once, use everywhere.

This repo ships to two audiences:

- **Open network** — mirrored to public GitHub. Install with the public `skills` CLI.
- **Closed network** — mirrored to internal GitLab. Install with the same public `skills` CLI pointed at the mirror via `GH_HOST` (or `grab-skills` for anon-archive installs).

Jump to [Open network](#open-network) or [Closed network](#closed-network).

## Skills

### Engineering

_Skills for daily code work._

| Skill | Description |
|-------|-------------|
| [deep-session](skills/internal/engineering/deep-session/SKILL.md) | Full TDD development session: grill → plan → test-first implement → iterate with smart-coverage until Critical/High gaps close. |
| [pr-audit](skills/internal/engineering/pr-audit/SKILL.md) | 6-lens PR audit protocol orchestrating reviewer skills into a high-signal validation report. |
| [smart-coverage](skills/internal/engineering/smart-coverage/SKILL.md) | Analyze test coverage gaps after code changes — critical/high/medium/low gap report + remediation plan. Black-box only. |

### Productivity

_Skills for daily non-code workflow tools._

| Skill | Description |
|-------|-------------|
| [hebrew-pr](skills/internal/productivity/hebrew-pr/SKILL.md) | Open a GitHub PR from the current branch with a Hebrew-language description (English conventional-commit title, Hebrew body). |

### External Skills

Some skills live in the closed network and are referenced, not vendored here. See
[`skills/external/`](skills/external/README.md).

## Open network

### For users

Install skills with the public `skills` CLI — pick which skills and which agents:

```bash
npx skills@latest add danielrispler/dsh
```

Closed network? See [Closed network](#closed-network) — same command, redirected via `GH_HOST`.

### For developers

Work against the repo directly. Link skills into `~/.claude/skills`:

```bash
bash scripts/link-skills.sh   # symlink skills into ~/.claude/skills
bash scripts/list-skills.sh   # list all available skills
```

Each skill lives in `skills/internal/<bucket>/<name>/`:

```
skill-name/
├── SKILL.md           # required — frontmatter: name, description
├── REFERENCE.md       # optional — overflow content
└── scripts/           # optional — utility scripts
```

Buckets: `engineering`, `productivity`, `misc`. See [CLAUDE.md](CLAUDE.md) for the
registration rules (`README.md` + `plugin.json` + bucket `README.md`).

## Closed network

Inside a closed network there is no public GitHub or npm — the repo is mirrored to an
internal GitLab. Use the **same public `skills` CLI** as the open network, redirected to
the mirror with the `GH_HOST` env var (the CLI clones `https://%GH_HOST%/<owner>/<repo>.git`).
The closed network is **Windows-only**, so commands below use Windows syntax.

### For users

Closed-net twin of the [open-network](#open-network) command — same CLI, host swapped.
Replace `<host>` with the internal GitLab host and `<namespace>` with the project namespace.

**Set once per machine** (persists to new terminals — reopen after running):

```cmd
setx GH_HOST <host>
```

Then reopen the terminal and install:

```cmd
npx skills@latest add <namespace>/dsh
```

Or, without persisting, set it for the current PowerShell session only:

```powershell
$env:GH_HOST="<host>"; npx skills@latest add <namespace>/dsh
```

The mirror project must be anonymously HTTPS-clonable; otherwise the CLI falls back to
`gh`/SSH (set `GIT_SSH_COMMAND`/creds).

**Alternative — `grab-skills`** (anon-archive install, no git needed): downloads the repo
archive over public-read HTTP and shows a grouped picker of internal **and** vendored
external skills, copying chosen dirs into `~/.claude/skills`. Run from the internal npm
mirror:

```bash
npx @internal/grab-skills                 # picker → ~/.claude/skills
npx @internal/grab-skills --dest <dir>    # install elsewhere
npx @internal/grab-skills --ref <branch>  # pull a non-default branch
```

Space toggles a skill, enter confirms. Picking zero is fine. Deprecated and in-progress
skills are never offered. Requires Node ≥18 and `tar` on PATH.

### For developers

The CLI lives at the repo root: [`cli.js`](cli.js), [`package.json`](package.json),
[`test.js`](test.js).

Before publishing, set the two GitLab constants at the top of `cli.js` (marked `// FILL ME`),
or export them as env vars:

| Constant | Env | Meaning | Example |
|----------|-----|---------|---------|
| `GITLAB_BASE` | `GITLAB_BASE` | Internal GitLab origin | `https://gitlab.internal` |
| `PROJECT_PATH` | `SKILLS_PROJECT` | `namespace/project` | `platform/skills` |
| — | `SKILLS_REF` | Default ref (else `main`) | `main` |

Also confirm the internal package scope and mirror URL in `package.json`
(`name`, `publishConfig.registry`).

Archive URL used: `{GITLAB_BASE}/{PROJECT_PATH}/-/archive/{REF}/{repo}-{REF}.tar.gz`,
piped through `tar xz --strip-components=1` (strips GitLab's `project-ref-<sha>` top dir).

Verify:

```bash
node test.js                              # offline scan + frontmatter parse + exclusion/dedup
GITLAB_BASE=… SKILLS_PROJECT=… node cli.js --dest /tmp/skilltest   # inside the net: live picker
curl -sI "{GITLAB_BASE}/{PROJECT_PATH}/-/archive/main/skills-main.tar.gz"  # expect 200, no token
```

Then publish to the internal mirror (`npm publish`) and `npx @internal/grab-skills` from a
clean machine.

External skills are copied as-is — only the skill folder lands in `~/.claude/skills/<name>`;
their own `install.sh`/plugin wiring is not run.

## License

MIT
