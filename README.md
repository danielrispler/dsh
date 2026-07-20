# Skills

Agent skills for real engineers. Install once, use everywhere.

## Quickstart

```bash
npx skills@latest add danielrispler/skills
```

Pick the skills you want and which coding agents to install them on.

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

_No skills yet._

### External Skills

Some skills live in the closed network and are referenced, not vendored here. See
[`skills/external/`](skills/external/README.md).

## Local Setup

Link skills directly to `~/.claude/skills`:

```bash
bash scripts/link-skills.sh
```

List all available skills:

```bash
bash scripts/list-skills.sh
```

## Skill Format

Each skill lives in `skills/internal/<bucket>/<name>/` with:

```
skill-name/
├── SKILL.md           # required — frontmatter: name, description
├── REFERENCE.md       # optional — overflow content
└── scripts/           # optional — utility scripts
```

## License

MIT
