---
name: pr-audit
description: 6-lens PR audit protocol. Orchestrates the reviewer skills to produce a high-signal validation report. Use only when explicitly requested.
---

# /pr-audit

You are the Lead Auditor. Your goal is to provide a final, high-signal validation report of the current changes, summarizing the proactive 6-lens review conducted during development.

## Lens Skills

This skill delegates to six specialized reviewer skills. Each lens definition lives in `references/`:

- `references/correctness-review.md`
- `references/distributed-review.md`
- `references/concurrency-review.md`
- `references/architecture-review.md`
- `references/testing-review.md`
- `references/readability-review.md`

## Execution Contract

When a user runs `/pr-audit`, perform the following steps:

1. **Build the Audit Input Bundle**
   - Collect the current staged and unstaged git diff, or the user-requested branch diff.
   - Collect surrounding file context when the diff alone is insufficient to make a defensible claim.
   - Collect repo rule context from `AGENTS.md` and relevant skill resources when a lens needs repository standards.

2. **Run the 6 Review Lenses**
   - Execute these lenses against the audit input bundle using the skill definitions in `references/`:
     - `correctness-review`
     - `distributed-review`
     - `concurrency-review`
     - `architecture-review`
     - `testing-review`
     - `readability-review`
   - If the runtime supports isolated sub-agents, run each lens in its own isolated reviewer.
   - Otherwise, run six sequential isolated prompt passes in one agent.
   - If neither isolation mechanism is available, continue with the best available review and state the degradation clearly in the final report.

3. **Apply Zero Context Policy**
   - Each lens must receive only the audit input bundle.
   - Do not pass conclusions from one lens into another lens.
   - Deduplicate only after all six lenses finish.

4. **Enforce Evidence Rules**
   - Prefer no finding over a weak or speculative finding.
   - Each finding must include a file and line reference when the evidence supports one.
   - If a lens needs broader file context to justify a finding, inspect that context before reporting.
   - If evidence is insufficient even after context gathering, record no finding for that lens.

5. **Aggregate and Deduplicate**
   - Merge overlapping findings across lenses into one finding with the strongest applicable severity.
   - Preserve the lens name for every finding so reviewers can see which lens surfaced it.

## Output Schema

Group findings by **severity**, not by lens, and always use this structure:

# Mission-Critical PR Audit Report

## CRITICAL
- Findings that block deployment: data loss, deadlocks, corrupt writes, or unsafe distributed behavior.
- For each finding include:
  - `Lens:`
  - `Path:Line:`
  - `Issue:`
  - `Impact:`
  - `Suggested fix:`

## HIGH
- Findings that materially affect correctness, reliability, performance, architectural boundaries, or test safety.
- Use the same field structure as `CRITICAL`.

## MEDIUM/LOW
- Lower-severity maintainability, readability, and test-improvement findings.
- Use the same field structure as `CRITICAL`.

## No Findings By Lens
- List every lens with either:
  - `No findings`, or
  - `Covered by deduplicated finding(s)` if its observation merged into another section.

## Assumptions / Blind Spots
- State missing context, unavailable isolation features, or any other reason the audit may be less complete than ideal.

## Portability Notes
- Codex may satisfy this workflow using real isolated sub-agents when supported.
- Claude Code and Gemini should follow the same 6-lens protocol, typically as sequential isolated passes.
- The requirement is complete review coverage and the output schema above, not any single runtime implementation detail.
