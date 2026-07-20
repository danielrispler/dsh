# Iteration 2026-06-01_094506_4e93427
Repo: video-editor  Target: main  Diff: 88 files, 4608 lines (branch==target; all untracked + unstaged)

## Baseline severity buckets
- Critical: 5  High: 9  Medium: 7  Low: 5 (uses Critical/High/Medium/Low + nice-to-have)

## Treatment severity buckets
- Critical: 0  High: 4  Medium: 2  Low: 1

## Unique to treatment (top 3)
- explicit "internal refactor — existing tests sufficient" classification for ~30 import-path-only files (baseline doesn't bucket these)
- `useEditorPostMessage` happy-path + origin allowlist gaps named as separate test cases (baseline lists hook gaps but blends them)
- Explicit Skipped list enumerating every reorg file, making scope auditable

## Unique to baseline (top 3)
- Schema boundary tests for `internal/edit-video/schemas.ts` (defaults, cropRegion width≥2, shapeOverlay x/y unbounded vs rectangle/circle 0..100 asymmetry — flagged as likely bug)
- `design-payload.schema.ts` `RENDERABLE_TYPES` filter behavior + pixel preprocessor edge cases (`""` → NaN bug, `volume:"100"` coercion)
- `audioRangePayloadSchema` `superRefine` corner cases (only-startTimeMs, only-endTimeMs); `recordingRangePayloadSchema` startTimeMs=0 boundary; `likelyAudioSrc` regex `#frag` suffix

## Format / quality call-outs
- Both reports correctly identify the two real behavior changes (cookie parsing, EDITOR_SET_AUTH removal) and both flag the `decodeURIComponent` `%ZZ` 500 bug.
- Treatment is tighter and follows the skill's exit-door framework; gives a clean remediation plan with specific test file paths.
- Baseline is broader and deeper on schema-level gaps inside the moved `internal/*` files — treatment explicitly skipped those as "moved verbatim, coverage migrates" which is debatable since the moved files apparently had no dedicated server-side tests.
- Baseline catches the `createMediaSavedMessage` 8-positional-arg risk and the deleted `iframe/helpers.test.ts` regression; treatment catches the same two but ranks them Medium vs baseline's High.
- Neither hallucinated symbols. Baseline cites adapter test line numbers ("line 69") that were not verified against current source — minor risk.
- Treatment's skip of `internal/*` schemas under "coverage migrates with new file" is the strongest disagreement; baseline's stance (those schemas never had dedicated tests at the old path either) is more accurate.
