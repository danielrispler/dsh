# Skills Repo Context

A collection of agent skills (slash commands and behaviors) loaded by Claude Code and other coding agents.

## Language

**Skill**:
A folder containing a `SKILL.md` file (and optional supporting files) that teaches an agent a specific capability or workflow.
_Avoid_: command, plugin, prompt

**Bucket**:
A category folder under `skills/internal/` that groups related skills (e.g. `engineering/`, `productivity/`).
_Avoid_: category folder, group

**Internal / External**:
`skills/internal/` holds skills that live in this repo (grouped into buckets). `skills/external/` holds **reference stubs** (a `REFERENCE.md` each) for skills that live in the closed network — referenced, never vendored. No `SKILL.md` under `external/`.
_Avoid_: local/remote, vendored

**Trigger**:
A phrase, keyword, or context pattern described in a skill's `description` frontmatter field that causes an agent to load and apply that skill.
_Avoid_: activation phrase, keyword

**SKILL.md**:
The required entry-point file for every skill. Contains YAML frontmatter (`name`, `description`) and the skill instructions.
_Avoid_: skill file, prompt file

**plugin.json**:
The `.claude-plugin/plugin.json` file that lists all public skill paths. Used by skill installers to discover skills.
_Avoid_: manifest, config file

**link-skills**:
The `scripts/link-skills.sh` script that symlinks each skill directory into `~/.claude/skills/` for local use.
_Avoid_: install script, setup script

## Relationships

- A **bucket** (under `skills/internal/`) holds many **skills**
- A **skill** always has exactly one **SKILL.md**
- **plugin.json** references only public internal skills (engineering, productivity, misc buckets); never `external/`
- **link-skills** / **list-skills** scan `skills/internal/` only, so `external/` stubs are excluded automatically
