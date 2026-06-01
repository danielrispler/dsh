---
allowed-tools: Bash, Read, Write, Edit, Agent
description: Aggregate smart-coverage A/B iterations into a digest of concrete SKILL.md / references improvements.
disable-model-invocation: true
---

# /smart-coverage-harvest

Reduce accumulated paired iterations into actionable change proposals for the `smart-coverage` skill.

Optional arguments:
- `--since YYYY-MM-DD` — only iterations on/after this date
- `--limit N` — cap at the N most recent iterations
- `--full` — load full `baseline.md` + `treatment.md` for every iteration (escape hatch for small corpora)

Default mode is **token-safe**: only `metadata.json` + `summary.md` + `review.md` (when user-edited) per iteration go to the agents. Full reports are pulled on demand when the reduce agent flags an id as `Needs full read`.

**Signal priority** (highest to lowest):
1. `review.md` content (user-written, ground truth)
2. `rating` field in `metadata.json` (treatment / tie / baseline / null)
3. `summary.md` (auto-generated)

---

## Step 1 — Collect iterations

```bash
ROOT=/Users/danielrispler/work/skills/skills/engineering/smart-coverage/iterations
find "$ROOT" -mindepth 2 -maxdepth 2 -type d | sort > /tmp/iter-list
```

Apply `--since` / `--limit` filters by reading each `metadata.json`'s `timestamps.started`. Persist the final filtered list to memory for this run.

If the list is empty → print `no iterations found` and stop.

## Step 2 — Build batches

Chunk the filtered list into batches of 20 iterations each. For each batch, build an in-memory bundle.

**`review.md` inclusion logic:** load `review.md` per iteration if it exists. Strip the three section bodies; if EVERY section body still contains the literal string `_(your notes here)_` (and nothing else of substance), the file is unedited — DROP it from the bundle. Otherwise, include it. This prevents template noise from polluting the corpus.

```
ITERATION <id>
  repo: <repo>  rating: <rating>  files/lines: <N>/<N>
  ---summary.md---
  <verbatim summary.md contents>
  ---review.md--- (only if user-edited)
  <verbatim review.md contents, with placeholder sections optionally elided>
  ---end---
```

## Step 3 — Map: spawn one batch agent per batch

For each batch, spawn `Agent(subagent_type: "general-purpose")` with this prompt:

> You are auditing a paired A/B eval corpus for a code-coverage skill called `smart-coverage`.
> Each iteration ran the skill (treatment) and a naive Claude prompt (baseline) on the same git diff.
> The user manually rated each pair as treatment-win / tie / baseline-win.
>
> **Signal priority (CRITICAL).** Some iterations include a user-written `review.md` block. Treat that text as ground truth — it outranks both the `rating` field and the auto-generated `summary.md`. When a `review.md` contradicts the summary, believe the review. Quote the user's exact phrasing in your output where it captures the issue concisely.
>
> Given the iteration summaries below, produce a partial digest in EXACTLY this format:
>
> ```
> ## Skill wins
> - <iter-id>: <one-line observation, why treatment was better>
>
> ## Skill regressions (baseline > treatment)
> - <iter-id>: <one-line observation, what skill missed or hallucinated>
>
> ## Both agreed
> - <iter-id>: <one-line note>
>
> ## Hallucinations / over-specification by skill
> - <iter-id>: <what was invented>
>
> ## Needs full read
> - <iter-id>: <reason summary is ambiguous>
> ```
>
> Iterations:
> <bundle>
>
> Output the digest only. No preamble.

Capture each batch agent's output.

## Step 4 — Reduce

Spawn one final `Agent(subagent_type: "general-purpose")` with all batch outputs concatenated plus the rating distribution:

> You are reducing partial digests from a smart-coverage skill eval. Produce the final harvest report.
>
> Inputs:
> - Partial digests from batch agents (below).
> - Rating distribution: <treatment-wins>/<ties>/<baseline-wins>/<unrated>.
> - Count of iterations with user-edited `review.md`: <N>.
>
> Weight proposals as follows: iterations cited with `review.md`-derived observations get HIGHEST weight (user explicitly took the time to write notes); next, iterations with non-null `rating`; lowest, iterations with neither.
>
> Produce this report:
>
> ```
> # Smart-Coverage Harvest <TIMESTAMP>
>
> Corpus: <N> iterations  |  ratings: T<n>/Tie<n>/B<n>/?<n>
>
> ## 🟢 Where the skill helps
> <synthesize patterns across `Skill wins` lines. Cite iter ids.>
>
> ## 🔴 Where the skill regresses (priority — fix first)
> <synthesize patterns across `Skill regressions` lines. Cite iter ids.>
>
> ## 🟡 Where both produced equivalent output
> <patterns — these are cases where the skill is doing no work>
>
> ## 🧪 Hallucinations / fictitious symbols
> <synthesize. Cite iter ids.>
>
> ## ✏️ Concrete change proposals
> For each proposal:
>   - Target file: `SKILL.md` § <phase> | `references/<lang>.md` § <section>
>   - Change: <one-paragraph specific edit>
>   - Evidence: <iter ids that motivate this>
>   - Confidence: low | medium | high
>
> ## 📂 Needs full read
> <iter-ids the reduce agent could not resolve from summary alone>
> ```
>
> Be specific. "Improve error handling" is useless; "In Phase 4d, add Python-specific `except Exception` swallow detection — currently missed in iter-X, iter-Y" is useful.

Capture the digest.

## Step 5 — Full-read pass (only if needed)

If the reduce digest's `📂 Needs full read` section lists any iter ids:

1. For each listed id, load that iteration's `baseline.md` and `treatment.md`.
2. Spawn one more `Agent(subagent_type: "general-purpose")` with just those full reports and the original reduce digest. Prompt it to extend the `Concrete change proposals` section with anything that was previously ambiguous.
3. Append the extension under a new `## 🔍 Extended proposals (from full read)` section in the digest.

If `--full` was passed at invocation, skip Step 3 batching and load every iteration's full reports directly in Step 4. Use this only for ≤10 iterations.

## Step 6 — Write digest

```bash
HARVEST_PATH=/Users/danielrispler/work/skills/skills/engineering/smart-coverage/iterations/HARVEST_$(date +%Y-%m-%d_%H%M%S).md
```

Write the digest to `$HARVEST_PATH`. Print:

```
Harvest digest → skills/engineering/smart-coverage/iterations/HARVEST_<ts>.md
```

Do not auto-apply proposals to `SKILL.md`. User reviews and hand-applies. Do not auto-commit.

---

## Errors / edge cases

- Fewer than 3 iterations → still run, but warn the user that the signal will be weak.
- A `summary.md` is missing → log the iter id in `📂 Needs full read` from the start.
- All ratings are `null` → reduce agent should weight everything equally and call out the missing signal in its output.
