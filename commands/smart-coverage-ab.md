---
allowed-tools: Bash, Read, Write, Edit, Agent, AskUserQuestion, Skill
description: Run smart-coverage WITH skill (treatment) and WITHOUT skill (baseline) on the current diff and save both reports as a paired iteration.
disable-model-invocation: true
---

# /smart-coverage-ab

Paired A/B run of the `smart-coverage` skill against a "naive Claude" baseline. Used to grow an eval corpus that later feeds `/smart-coverage-harvest`.

Optional argument: `--target <branch>` (default: `main`).

Execute the steps below precisely. Do NOT skip the gate. Do NOT load the smart-coverage skill before the baseline run.

---

## Step 1 — Gate

Run:
```bash
pwd
git rev-parse --show-toplevel 2>/dev/null
```

Resolve repo root.

Abort with a clear error if any of:
- Repo root does NOT start with `/Users/danielrispler/work/`.
- `git rev-parse` returned non-zero (not a git repo).
- Repo root equals `/Users/danielrispler/work/skills` (we do not evaluate the skill against its own repo).

On abort, print the reason and stop. Do not write any files.

## Step 2 — Snapshot diff (tracked + untracked)

Determine target branch. Default `main`. If user passed `--target X`, use `X`.

```bash
TARGET="${TARGET:-main}"
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")
SHA=$(git rev-parse HEAD)
SHA7=${SHA:0:7}
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TS=$(date +%Y-%m-%d_%H%M%S)
ITER_ID="${TS}_${SHA7}"
ITER_DIR="/Users/danielrispler/work/skills/skills/engineering/smart-coverage/iterations/${REPO_NAME}/${ITER_ID}"
mkdir -p "$ITER_DIR"

# Tracked diff
git diff "${TARGET}...HEAD" > "$ITER_DIR/diff.patch"
git diff "${TARGET}...HEAD" --stat > "$ITER_DIR/.diff.stat"

# Untracked files — synthesize an addition-only diff so agents see brand-new files
git ls-files --others --exclude-standard | while read -r f; do
  [ -z "$f" ] && continue
  git diff --no-index --no-color /dev/null "$f" 2>/dev/null >> "$ITER_DIR/diff.patch"
done

# Unstaged tracked modifications also matter
git diff >> "$ITER_DIR/diff.patch"

LINES=$(wc -l < "$ITER_DIR/diff.patch" | tr -d ' ')
FILES=$(grep -c '^diff --git' "$ITER_DIR/diff.patch" || echo 0)
```

If `LINES` is 0 → abort: "no diff vs $TARGET and no untracked files; nothing to evaluate."

## Step 3 — Baseline run (no skill)

Spawn an `Agent` with `subagent_type: general-purpose`. Pass the diff contents inline. Prompt:

> You are a senior engineer doing a code review. Below is a git diff. Tell me what tests are missing for the changed code. Use whatever output format you think is best — your honest professional take.
>
> Hard constraints:
> - Do NOT read or load any file under `/Users/danielrispler/work/skills/skills/engineering/smart-coverage/`. That directory is off-limits for this task.
> - Do NOT use any tool whose name contains "smart-coverage".
> - Black-box reasoning is preferred but not required — write what you'd actually say in a review.
>
> Diff:
> ```
> <paste full contents of $ITER_DIR/diff.patch here>
> ```
>
> Return your full review verbatim.

Capture the agent's returned report. Write it to `$ITER_DIR/baseline.md`.

Record start/end timestamps for duration.

## Step 4 — Treatment run (with skill)

In the main thread, invoke the `smart-coverage` skill via the `Skill` tool with `skill: smart-coverage` and `args: "--target <TARGET>"`. The skill will rerun its own diff detection — that is fine and gives an honest end-to-end measurement of the skill's behavior.

Capture the skill's full Phase 5 report output. Write it to `$ITER_DIR/treatment.md`.

Record start/end timestamps for duration.

## Step 5 — Mini-summary (token-safe artifact for harvest)

Write `$ITER_DIR/summary.md` yourself (main thread, no subagent). 5–10 lines, no fluff:

```
# Iteration <ITER_ID>
Repo: <repo>  Target: <target>  Diff: <files> files, <lines> lines

## Baseline severity buckets
- Critical: <N>  High: <N>  Medium: <N>  Low: <N>
  (or "n/a — baseline does not use severity buckets")

## Treatment severity buckets
- Critical: <N>  High: <N>  Medium: <N>  Low: <N>

## Unique to treatment (top 3)
- <file>: <one-line gap>
- ...

## Unique to baseline (top 3)
- <file>: <one-line gap>
- ...

## Format / quality call-outs
- <e.g. "treatment hallucinated `paymentRepository.findById` which is not in diff", or "baseline missed all error paths", or "both identical">
```

Be honest. The harvest step depends on this signal. If both reports say roughly the same thing, write that.

## Step 5.5 — Emit review.md template

Write `$ITER_DIR/review.md` with this exact body:

```markdown
# User Review

Free-form notes on this iteration. Edit any section. `/smart-coverage-harvest` will pick up edited sections (skipping any that still contain the `_(your notes here)_` placeholder) and feed them to the reducer as ground-truth signal — higher weight than the `rating` field in `metadata.json`.

Be specific: name files, exit doors, severity buckets, hallucinated symbols. The harvest agent uses your phrasing verbatim when proposing skill changes.

## Review of baseline

_(your notes here)_

## Review of treatment

_(your notes here)_

## Overall — what should change in the skill?

_(your notes here)_
```

This file is optional for the user to fill in. Do not prompt them to fill it now — the rating step in Step 7 is the synchronous capture. `review.md` is for considered, later notes.

## Step 6 — Persist metadata

Write `$ITER_DIR/metadata.json`:

```json
{
  "iteration_id": "<ITER_ID>",
  "repo": "<repo basename>",
  "repo_root": "<absolute repo root>",
  "branch": "<branch>",
  "sha": "<full sha>",
  "target": "<target branch>",
  "diff_files": <N>,
  "diff_lines": <N>,
  "untracked_files_included": <N>,
  "timestamps": {
    "started": "<iso>",
    "baseline_duration_s": <N>,
    "treatment_duration_s": <N>,
    "finished": "<iso>"
  },
  "rating": null,
  "rating_note": null
}
```

## Step 7 — Interactive rating

Print both reports inline to the user (paste `baseline.md` then `treatment.md`, clearly labelled).

Then call `AskUserQuestion` with ONE question:

- Question: `Which side won this iteration?`
- Header: `Rating`
- Options:
  1. `Treatment wins` — skill output was more useful than baseline.
  2. `Tie` — roughly equivalent.
  3. `Baseline wins` — skill regressed or hallucinated; baseline was better.
- multiSelect: false

After the user answers, ask a brief follow-up via a second `AskUserQuestion`:
- Question: `Any one-line note about why? (optional — pick Skip if none)`
- Options: `Skip`, `Add note`.
If they pick `Add note`, accept their free-text from the natural conversation that follows (do not block).

Map the answer to a rating string: `"treatment" | "tie" | "baseline" | null`. Update `metadata.json` `rating` and `rating_note` fields via `Edit`.

If the user dismisses or does not answer, leave `rating: null` and proceed.

## Step 8 — Append to INDEX.md

Append one line to `/Users/danielrispler/work/skills/skills/engineering/smart-coverage/iterations/INDEX.md`:

```
| <iter-id> | <repo> | <sha7> | <branch> | <target> | <files>f/<lines>l | <rating-or-?> | <one-line summary> |
```

The one-line summary is the strongest single observation from `summary.md` (typically the "Format / quality call-outs" line).

## Step 9 — Confirm

Print one line:

```
Iteration saved → skills/engineering/smart-coverage/iterations/<repo>/<iter-id>/
```

Done. Do not narrate further. Do not auto-commit.

---

## Errors / edge cases

- Baseline agent refuses or returns empty → write `baseline.md` with `# AGENT FAILED\n<reason>` and continue. Mini-summary should note this. Rating step still runs.
- Treatment skill errors → same: write `treatment.md` with the failure, continue.
- `iterations/` does not exist → `mkdir -p` already handles it.
- Repo has 1000+ file diff → still run, but in step 5 cap "Unique to" lists at the top 3 each. Do not enumerate everything.
