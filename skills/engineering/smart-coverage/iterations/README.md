# Smart-Coverage A/B Eval Corpus

Paired runs of the `smart-coverage` skill (treatment) vs a naive Claude baseline. Each entry is real diff data from one of the user's local repos, captured by `/smart-coverage-ab`. The corpus feeds `/smart-coverage-harvest`, which emits concrete change proposals for `SKILL.md` and `references/*.md`.

## Layout

```
iterations/
  INDEX.md                     one row per iteration, summary table
  HARVEST_<ts>.md              digest output (multiple over time)
  <repo>/<iteration-id>/
    metadata.json              repo, sha, ratings, durations
    diff.patch                 tracked + untracked, exactly what both agents saw
    baseline.md                naive Claude review (skill explicitly NOT loaded)
    treatment.md               smart-coverage skill output
    summary.md                 5–10 line distilled comparison (harvest input)
    review.md                  user-editable free-form review (template by default)
```

`iteration-id` format: `YYYY-MM-DD_HHMMSS_<sha7>`.

## Rating field

After each `/smart-coverage-ab` run the user picks one of:

- `"treatment"` — skill output was more useful than baseline.
- `"tie"` — roughly equivalent.
- `"baseline"` — skill regressed or hallucinated; baseline was better.
- `null` — user dismissed the rating prompt.

Stored in `metadata.json` under `rating`. Optional free-text in `rating_note`. `/smart-coverage-harvest` weights wins by this field — `baseline` ratings drive the highest-priority change proposals.

## `review.md` — your written review

Optional but high-signal. Each iteration ships with a `review.md` template containing three H2 sections:

- `## Review of baseline`
- `## Review of treatment`
- `## Overall — what should change in the skill?`

Each section starts with `_(your notes here)_`. Edit any section you care about — leave the rest. `/smart-coverage-harvest` only loads sections whose placeholder has been replaced; fully untouched files are dropped from the bundle entirely. When you write a review, the harvest reducer treats it as ground truth and weights it above the binary `rating` and the auto-generated `summary.md`.

Use this when the rating prompt felt too coarse — e.g. "treatment was technically right but its Tier B sketch invented `paymentRepo.find` which isn't in the file."

## Why `summary.md` exists

Full `baseline.md` + `treatment.md` reports can be thousands of tokens each. To keep harvest runs scalable as the corpus grows into the hundreds, `/smart-coverage-ab` writes a 5–10 line `summary.md` per iteration. The harvest map-reduce flow consumes only `summary.md` + `metadata.json` by default; full reports load only when the reduce agent explicitly flags an iteration id as ambiguous.

## What NOT to do here

- Don't hand-edit `INDEX.md` — let the slash command append.
- Don't store iteration data outside this folder. The skills repo IS the eval corpus.
- Don't run `/smart-coverage-ab` against the skills repo itself — the gate blocks it on purpose.
