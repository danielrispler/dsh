Review of baseline

  Claims verified against current code:
  - preview.controller.ts:99-102 cookie regex + decodeURIComponent without try/catch — confirmed. %ZZ would throw URIError → 500. Real
   bug.
  - useEditorPostMessage posts EDITOR_READY on mount, validates parentToEditorMessageSchema, gates by allowedOrigins.has(event.origin)
   — confirmed; no test file exists for hook.
  - preview-source-api.ts:25-30 — relative URL, only Content-Type header, no credentials, no auth — confirmed; no test file exists.
  - createMediaSavedMessage — 8 positional params, mixed string/boolean confirmed verbatim at
  packages/contract/src/iframe/to-parent/helpers.ts. Real swap risk.
  - editVideoRequestSchema — defaults (cuts/overlays/audioSources: [], audioMixMode:"mix", format:"mp4"), cropRegion.width/height: 
  min(2) — confirmed.
  - videoOverlaySchema.trackOrder: z.number() required while text/image/rectangle/circle/shape all .optional() — confirmed asymmetry.
  - shapeOverlaySchema.x/y: z.number() unbounded vs rectangle/circleOverlaySchema.x/y: z.number().min(0).max(100) — confirmed, likely
  bug.
  - audioSourceSchema.volume: z.number().min(0).max(1) no default vs videoDetailsSchema.volume: 
  z.coerce.number().min(0).max(100).default(100) — confirmed asymmetry.
  - design-payload.schema.ts:3 parsePx = (v) => typeof v === "string" ? Number.parseFloat(v) : v → "" → NaN → z.number() rejects —
  confirmed real bug latent.
  - RENDERABLE_TYPES = new Set(["text","video","image","audio","caption","shape"]) filter — confirmed at line 148.
  - apps/server/src/features/edit-video has zero test files. apps/server/src/features/upload has zero test files. Baseline's instinct
  that moved schemas have no inherited coverage is correct.

  Weaknesses:
  - Cites "line 69 of adapter test" without verifying — but apps/server/src/features/preview/adapters/inbound/http/__tests__/* has
  zero cookie/ztube-token mentions, so the asserted test does exist for the adapter side but baseline didn't pin it.
  - Long-form, no exit-door classification.
  - Over-recommends Zod-feature lock-in tests in the contract package. Gaps #7, #9, half of #11, half of #12, and all of #13 produce
  test files whose assertions only re-validate stock Zod operators (`.default`, `.min`, `.max`, `.optional`, `z.coerce`, `z.union`
  discrimination). When executed, these add ~5 test files of zero regression value. See "Post-implementation redundancy audit" below
  for the per-gap breakdown.

  Review of treatment

  Verified against real code — false claims:
  - ⏭️  Skipped: edit-video.controller.ts — only import-path change … coverage matches pre-move state. Wrong.
  apps/server/src/features/edit-video/ has zero .test.ts files. Pre-move coverage is zero. Schema waived under false premise.
  - ⏭️  Skipped: upload.controller.ts — import-path only. Same. apps/server/src/features/upload/ has zero .test.ts files.
  - ⏭️  Skipped: packages/contract/src/internal/** — coverage matches pre-move state. True only that pre-move was zero — but treatment
  treats this as "no gap" instead of "new surface needing coverage." Skill exit-door applied to the wrong side.
  - Missed parsePx NaN real bug at design-payload.schema.ts:3 — only flagged controllers, hook, and helpers.
  - Missed shapeOverlaySchema.x/y unbounded bug at internal/edit-video/schemas.ts:104-105.
  - Missed videoOverlaySchema.trackOrder required-vs-optional asymmetry.
  
  Verified strengths:
  - Cookie-parsing gap correctly localized to preview.controller.ts lines and existing test file path.
  - useEditorPostMessage no-test fact confirmed; gap-split (mount, origin allowlist, schema rejection, happy-path) is accurate.
  - preview-source-api.ts no credentials claim matches code.
  - payload-intake 3-arg pin matches removed authToken? arg.
  - Exit-door tags + remediation plan with concrete test paths — clean.
  - Side effect of the (incorrect) "coverage migrates" skip: treatment avoided recommending the ~5 redundant Zod-feature lock-in
  tests that baseline produced for internal/* schemas. The reason was wrong (pre-move coverage was zero, not migrated) but the
  absence of those recommendations would have saved test-file churn. Luck, not signal.

  Overall — what should change in the skill?

  Winner: baseline (qualified). Bug-catch delta is decisive: baseline flagged B2 (parsePx NaN), B3 (shapeOverlay unbounded), B4
  (videoOverlay trackOrder asymmetry), and B5 (audioSource volume default) — all real latent bugs treatment skipped under the
  false-premise "coverage migrates" exit door. Treatment's skip-list framework was applied to the wrong side and converted a
  zero-coverage state into a "no gap" verdict on ~30 files.

  Qualification: baseline's contract-package recommendations also over-fired on Zod-stock-operator tests (see redundancy audit
  below). The right move when executing baseline's list is to prune those before writing the tests — keep B-fix lock-ins,
  custom-preprocess coverage, and positional-swap guards; drop everything that only re-asserts Zod's stock operators.

  Concrete skill changes:

  1. Block the "coverage migrates with new file" exit door behind a find-grep check. Required precondition: locate at least one
  *.test.ts at the OLD path that imports the moved symbol. If none exists, the file is new surface, not migrated coverage. Add this as
   a hard precondition with a one-line bash verification step.
  2. For Zod schema files specifically — never auto-skip. Schemas encode runtime contract; moved schemas warrant a behavior-shape
  audit (defaults, refinements, preprocessors, union variants, bounds asymmetries) regardless of import-path-only diff. Add a
  schema-specific bypass to the skip rule.
  3. Severity rule: positional-arg helpers with ≥5 params or mixed string/boolean → auto-High. createMediaSavedMessage (8 positionals,
   3 strings, 2 booleans, 2 arrays, 1 union) is the prototype. Treatment's Medium ranking underweights swap risk.
  4. Cookie/header parser checklist when controller swaps auth source: case-sensitivity, string | string[] shape, decodeURIComponent
  URIError path, position-in-list, whitespace tolerance. Treatment hit 4/8 cases baseline enumerated.
  5. Keep treatment's exit-door tag + remediation-plan format — strictly better than baseline. Combine with stricter skip gating from
  change #1.`

  ---

  Post-implementation redundancy audit

  After executing the baseline gap list end-to-end, ~50% of the contract-package tests added were Zod-feature re-tests with no
  behavioral value. Per-gap classification (numbering refers to the baseline gap list at the top of this report):

  KEEP — real value
  - #1 preview.controller cookie parsing (4 cases) — covers B1 fix + real branching.
  - #2 useEditorPostMessage handler — real control flow (origin allowlist, schema rejection, cache replay, error path). Tested
  via extracted pure `handleParentMessage`.
  - #3 preview-source-api — real fetch-shape contract (URL, no credentials).
  - #4 payload-intake `resolvePreviewSource` 3-arg pin — guards re-added auth arg.
  - #8 createMediaSavedMessage positional-swap test — 8 args, mixed string/boolean. Real swap risk.
  - #11 (partial) design-payload RENDERABLE_TYPES filter — custom preprocess logic, not Zod stock.
  - #11 (partial) design-payload parsePx empty-string → 0 — locks in B2 fix.
  - #12 (partial) edit-video shapeOverlay x/y bounds — locks in B3 fix.
  - #12 (partial) edit-video videoOverlay trackOrder optional — locks in B4 fix.
  - #12 (partial) edit-video audioSource.volume default — locks in B5 fix.
  - #14 package.json wildcard exports smoke — catches broken dist/ after build refactor. Cheap, high coverage of reorg risk.

  REDUNDANT — re-tests Zod's stock behavior, no bug coupling
  - #7 isParentToEditorMessage / parseParentToEditorMessage helpers — 1-line wrappers around `schema.safeParse` / `schema.parse`.
  Schema tests already exist in `from-parent/__tests__/schemas.test.ts`. Asserting `parse(invalid)` throws `ZodError` re-tests Zod
  itself.
  - #9 createPreviewItemAddedMessage / createProjectClearedMessage helpers — pure literal-object factories with no branching.
  Asserting `deepEqual({...inputs})` is tautological.
  - #11 (partial) design-payload `id` `z.union([z.string(), z.number()])` accepts both — Zod feature.
  - #11 (partial) design-payload `volume: "100"` coerces — `z.coerce.number()` feature.
  - #12 (partial) edit-video `editVideoRequestSchema` defaults injection — `.default([])` / `.default("mp4")` are Zod features.
  - #12 (partial) edit-video `cropRegion.width/height >= 2` — `.min(2)` is Zod feature.
  - #13 entire upload schemas file — `getSignedUrlBodySchema` `min(1)` rejection + `cleanupBodySchema` `min(1)` rejection. Pure
  Zod operator re-tests.

  Pattern

  If a recommended test asserts only that a Zod schema does what its operators already promise — `.default(x)` returns `x`,
  `.min(n)` rejects below `n`, `.optional()` permits omission, `z.coerce` coerces, `z.union` accepts variants — it tests Zod, not
  the project. Such tests add file count but no regression coverage: nothing in the project can break them short of upgrading Zod.

  A recommendation here is value-add only when it (a) couples to a documented or just-fixed bug, (b) covers a `superRefine` /
  `preprocess` / custom transform, (c) covers a cross-field invariant, or (d) locks in an asymmetry the diff is correcting.
  Wrapper helpers around `schema.parse` / `schema.safeParse` with zero added logic fall under the same rule — the schema's own
  test file is already the public surface.