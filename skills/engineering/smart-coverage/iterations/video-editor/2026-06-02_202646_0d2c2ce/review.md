# User Review

Free-form notes on this iteration. Edit any section. `/smart-coverage-harvest` will pick up edited sections (skipping any that still contain the `_(your notes here)_` placeholder) and feed them to the reducer as ground-truth signal — higher weight than the `rating` field in `metadata.json`.

Be specific: name files, exit doors, severity buckets, hallucinated symbols. The harvest agent uses your phrasing verbatim when proposing skill changes.

## Review of baseline

Strengths:
- Correctly identifies the two highest-ROI targets up front: `FfmpegRunner` (`ffmpeg.utils.ts`) and `parseApiEnv`/`parseWorkerEnv` (`env.ts`). Enumerates all six semaphore-release paths and all three signal/timeout/abort wirings — that's the level of mechanical specificity the runner test actually needs.
- Goes beyond pure missing-test analysis. Flags the asymmetry that only `run()` accepts `timeoutMs` while `runToStream`/`runToFile` do not, and the inconsistent logging (`console.log("[ffmpeg]", …)` in two methods vs. structured `Logger.logInfo` in the third). These are real review findings worth raising even though they're not "missing tests."
- Race-guard call-out on `useCropStore.loadImage`/`loadVideo` `onerror` (the `getState().element === image` check) is the kind of subtle invariant a coverage report normally skips. Good catch.
- "What I would not block on" section disciplines the recommendation list: pure type renames (`EnvConfig` → `Api/Common/Worker`), already-tested `selectActiveItem`, inline `useHasSelection` arrow.

Weaknesses:
- Narrative-heavy. Three Critical / eight High / three Medium without clean severity headers makes the list hard to triage. A consumer has to read prose paragraphs to extract the actionable items.
- Over-prescribes integration tests for the selection-store migration ("selecting an item enables the Delete/Split/Clone buttons on Header"). The selector itself is already covered by `selectors.test.ts`; the integration paths (`use-state-manager-events`, `useTimelineEvents`, `SceneInteractions.subscribeToActiveIds`) write to the same Zustand store as before — type-checker + existing event tests already guard the migration. Marginal regression value, high test-cost.
- `container.ts` placed at Critical. If `FfmpegRunner` unit tests cover the per-instance semaphore, a wiring test ("single instance is shared, `FFMPEG_MAX_CONCURRENT` is plumbed through") is High at most. Worker-level integration would be the better lever, and `system.test.ts` already exercises bootstrap.
- No "Already Covered" / "Skipped" sections — reviewer has to infer what was deliberately omitted.

## Review of treatment

Strengths:
- Clean severity bucketing (1/5/4/2) and the explicit `✅ Already Covered` + `⏭️ Skipped (internal refactor — observable behavior unchanged if wiring correct)` sections. Cuts the read time roughly in half versus baseline.
- Exit-door tagging on every gap is the right discipline. It forces the recommendation to be grounded in a specific failure path rather than a vague "more tests would be nice."
- "When X, Then Y" Gherkin-style test names map 1:1 to `describe`/`it` blocks. Easier to translate into actual test files than baseline's prose bullets.
- Same Critical pick as baseline (`FfmpegRunner`), same High-1/High-2 picks (`env.ts`, `download-progress-modal`). On the decisive items the verdict matches.
- Correctly demotes `container.ts` to Medium with a one-line justification (regression-doubling parallelism). More proportionate than baseline's Critical placement.

Weaknesses:
- Misses everything baseline caught that isn't a missing test: no mention of the `runToStream`/`runToFile` timeout asymmetry, no mention of the inconsistent logging in the runner. The skill's mandate is missing tests, but a "Non-test review findings" sub-section would be high-value and low-cost.
- Drops the `useCropStore` race-guard rationale — baseline explained *why* the `getState().element === image` check matters (newer load already replaced element); treatment lists the test case but not the invariant. The harvest agent benefits from the *why*, not just the *what*.
- `Audio.destroy / Timeline.purge / dynamic destroy` lumped at Medium loses some signal. The dynamic-cleanup `useEffect` change in `timeline.tsx` is the actual regression risk (the other two are leaf-level setters); treatment doesn't separate them.
- `payload-intake` integration with `resetEditorForNewProject` is buried under Gap 2 of `reset-editor.ts`. Should be its own bullet — `clearProject` is the entry point users will refactor, not the helper.

## Overall — what should change in the skill?

Winner: **treatment**, narrowly. The structure (severity buckets + exit-door tags + Gherkin test names + explicit Skipped/Already-Covered sections) is more useful for an implementer. On all the decisive Critical/High items both reports converged, so the tie-breaker is format and triage speed.

But baseline's non-test review findings (timeout asymmetry, logging inconsistency) are genuinely missed by treatment, and they were the highest-information items in the whole iteration. Losing them is a real cost.

Concrete skill changes:

1. **Add a `Non-test review findings` section** to the treatment template, gated to one short list. Catch code-quality issues observable in the same diff read — inconsistent logging, asymmetric APIs across sibling methods, dead/misleading `if` branches with no else. Cap at 5 items. This recovers baseline's biggest edge.
2. **Keep the Exit-Door / `When-Then` format** — it's the load-bearing improvement. Drop baseline's prose-paragraph style.
3. **Add a `Why this matters` one-liner under each gap** (one sentence, ≤120 chars). Treatment lost the *invariant rationale* baseline captured (e.g. race-guard on `useCropStore.onerror`, double-parallelism risk on `container.ts`). One sentence per gap is enough; the harvest agent uses these as the pattern signal for future iterations.
4. **Severity rule for cross-cutting wiring**: if the unit-tested class is shared via a container and its singleton-ness drives correctness, the wiring test is High, not Critical. Baseline's Critical placement on `container.ts` over-fires.
5. **Severity rule for read-mirror store migrations**: when a Zustand store consolidation preserves observable shape (same field, same write path, same readers), treat the consolidation as type-checker territory. Recommend at most one integration smoke test on the top-level consumer (e.g. `Header` button-enable), not one per subscriber. Baseline over-fired here.
6. **Keep `⏭️ Skipped` + `✅ Already Covered`** sections — they let the reviewer trust the report instead of re-reading the whole diff to verify nothing was missed.
7. **For positional-arg / API-shape changes (timeouts, params), auto-flag asymmetry**. The runner's `timeoutMs` only on `run()` is the prototype: sibling methods on a class with diverging parameter shapes warrant a Medium "documented asymmetry" gap even if no specific test is required.
