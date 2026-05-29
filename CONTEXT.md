# Skills Repo Context

A collection of agent skills (slash commands and behaviors) loaded by Claude Code and other coding agents.

## Language

**Skill**:
A folder containing a `SKILL.md` file (and optional supporting files) that teaches an agent a specific capability or workflow.
_Avoid_: command, plugin, prompt

**Bucket**:
A top-level category folder under `skills/` that groups related skills (e.g. `engineering/`, `productivity/`).
_Avoid_: category folder, group

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

- A **bucket** holds many **skills**
- A **skill** always has exactly one **SKILL.md**
- **plugin.json** references only public skills (engineering, productivity, misc buckets)
