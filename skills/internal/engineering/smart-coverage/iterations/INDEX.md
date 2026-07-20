# Smart-Coverage A/B Iterations

Auto-appended by `/smart-coverage-ab`. One row per paired run.

| Iteration ID | Repo | SHA7 | Branch | Target | Diff | Rating | Note |
|---|---|---|---|---|---|---|---|
| 2026-05-31_193001_4948426 | video-editor | 4948426 | main | main | 56f/4230l | treatment | Treatment caught GET/DELETE /render zero coverage that baseline missed; baseline deeper on publisher races but hallucinated NullPublisher test coverage |
| 2026-06-01_094506_4e93427 | video-editor | 4e93427 | main | main | 88f/4608l | baseline | Treatment's "coverage migrates with new file" exit door fired without verifying pre-move tests existed; ~30 files falsely marked no-gap, real Zod-schema bugs missed |
| 2026-06-02_202646_0d2c2ce | video-editor | 0d2c2ce | main | main | 54f/2619l | treatment | Treatment wins on structure (severity buckets + exit-door tags + Skipped ledger); baseline retained edge via non-test review findings (timeout asymmetry, logging inconsistency) treatment missed |
| 2026-06-14_234828_89f7262 | video-editor | 89f7262 | main | main | 92f/4950l | baseline | Treatment more actionable form (exit doors, When/Then specs) but baseline broader: caught security-boundary severity, design pushback, 7 edge cases treatment dropped. |
