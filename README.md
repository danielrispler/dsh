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

### Productivity

_Skills for daily non-code workflow tools._

| Skill | Description |
|-------|-------------|

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

Each skill lives in `skills/<bucket>/<name>/` with:

```
skill-name/
├── SKILL.md           # required — frontmatter: name, description
├── REFERENCE.md       # optional — overflow content
└── scripts/           # optional — utility scripts
```

## License

MIT
