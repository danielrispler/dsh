# Code review: missing tests for diff at `4e93427`

## Summary of what changed

1. **Big package reshuffle** for `@video-editor/contract`: replaced root barrel + `iframe/*` flat layout with bucketed subpaths (`iframe/from-parent`, `iframe/to-parent`, `events`, `internal/<feature>`). Server HTTP schemas moved out of `apps/server`.
2. **Auth rewrite (ADR 0003).** Dropped `EDITOR_SET_AUTH` postMessage, the `authTokenRef` in the React hook, the `authToken` arg on `resolvePreviewSource` / `addPreviewItemToEditor`, the `x-ztube-token` request header and the Angular `getZtubeToken` reader. Server now parses `ztube-token` from `request.headers.cookie` instead of an `x-ztube-token` header.
3. Schemas + types are now produced via `z.infer` instead of being hand-written next to schemas. `editVideoRequestSchema` / `designPayloadSchema` / upload schemas / `OverlayType` / `TimeRange` / `VideoMetadata` moved to `@video-editor/contract/internal/*`.

The tests that ship in this diff cover only the schema files inside `packages/contract`. Everything else — server controller, frontend hook, the iframe demo, the new package boundary — is untested.

---

## Critical gaps

### 1. `preview.controller.ts` — cookie parsing (new behavior, zero tests)
File: `apps/server/src/features/preview/adapters/inbound/http/preview.controller.ts:99-102`
Tests: `apps/server/src/features/preview/adapters/inbound/http/__tests__/preview.controller.test.ts` has zero mentions of `cookie` or `ztube-token` post-change.

This is the load-bearing line for the entire auth model under ADR 0003 and it currently rolls its own regex. Missing behaviors:

- **Token extracted when `Cookie` header is the only one present.** Asserts `HttpPreviewSourceAdapter` receives that exact value (currently the test constructs the adapter via `new` so you'd want to either dependency-inject the adapter factory or use the E2E suite with a `Cookie` header).
- **Token extracted when `ztube-token` is *not the first* cookie** (e.g. `Cookie: foo=1; ztube-token=abc; bar=2`). The regex uses `(?:^|;\s*)` which is correct only if the inter-cookie separator is `;` + space; an inter-cookie separator of bare `;` will still match because of `;\s*` matching zero whitespace, but you should pin that.
- **Missing `Cookie` header → empty token forwarded** (current behavior, intentional; lock it in so a future refactor doesn't accidentally throw).
- **`Cookie` header present but no `ztube-token` cookie → empty token.**
- **URL-encoded token value is decoded.** The regex captures `[^;]+`, then `decodeURIComponent`. A token containing `%3D` should be decoded; a malformed percent escape (`%ZZ`) currently throws `URIError` and will surface as a 500 — that's a real bug to test for and probably fix.
- **Whitespace around `=` or in the value.** Some intermediaries reformat cookies; today `ztube-token =abc` would not match. Decide and document, then test.
- **Case-sensitivity of cookie name.** RFC 6265 says cookie names are case-sensitive, so `Ztube-Token=…` should *not* match — assert that.
- **Multiple `Cookie` headers / array form.** Fastify can deliver `request.headers.cookie` as a string or, depending on raw HTTP, an array. The code does `?? ""` then `.match` — if it's ever an array, `.match` is not a function. Either narrow the type or test that we degrade to empty.

These also need at least one **happy-path E2E test** (in `preview.controller.e2e.test.ts`) that POSTs `/editor/preview-source` with a `Cookie: ztube-token=…` header and asserts the upstream Core mock saw `Cookie: ztube-token=…`. Today's E2E suite never validates the auth header is forwarded.

### 2. `useEditorPostMessage` — `EDITOR_SET_AUTH` removal
File: `apps/frontend/src/features/editor/external-preview/use-editor-post-message.ts`
Tests: none in repo (`grep -r use-editor-post-message __tests__` returns nothing).

The hook silently dropped a message type and the `authTokenRef`. There is no test asserting:

- An inbound `{ type: "EDITOR_SET_AUTH", token: "…" }` is **ignored** (now fails schema validation) and produces no side effect / no response.
- `addPreviewItemToEditor` is called with exactly two args (no third token arg). A regression that re-adds an auth param wouldn't break compilation in JS-only callers.
- The hook still posts `EDITOR_READY` on mount, still validates inbound origins, still caches responses by `requestId`, etc. This is true today; locking it in is overdue.

This is the single user-facing piece of the auth change and it's untested.

### 3. `preview-source-api.ts` — header semantics
File: `apps/frontend/src/features/editor/external-preview/preview-source-api.ts`
Tests: none.

After the change the function unconditionally sends `Content-Type: application/json` and **no** auth header. Worth pinning:

- It calls `/editor/preview-source` as a **relative** URL (so same-origin / proxied path → browser attaches the HttpOnly cookie). A future refactor that switches to an absolute URL silently breaks prod auth.
- It does **not** set `credentials: 'include'`. ADR 0003's "Consequences" section explicitly says default `same-origin` is sufficient — assert that the fetch options don't include `credentials` (or include `'same-origin'`).
- No `x-ztube-token` header is set under any circumstance — a regression test that grepping for that string in built bundles would fail is overkill, but a unit test that inspects the `fetch` mock's headers is appropriate.

### 4. `payload-intake.ts` — removed `authToken` arg
File: `apps/frontend/src/features/editor/external-preview/payload-intake.ts`
Existing tests: `apps/frontend/src/features/editor/external-preview/__tests__/payload-intake.test.ts`

The diff removed the third `authToken?: string` parameter. The existing test file should be updated to:

- Assert `resolvePreviewSource` is invoked with exactly `(channelId, startTimeMs, endTimeMs)` — no fourth arg. Otherwise a re-added parameter would silently re-introduce dead state.
- Confirm `addPreviewItemToEditor`'s signature (TS compiler enforces this for callers in the repo, but the hexagonal seam to `resolvePreviewSource` is checked behaviorally, not structurally).

I can't tell from the diff alone whether the existing test file was updated for this; it doesn't appear in the diff, which is a red flag.

### 5. `iframe-demo` editor-page — token reader removal
File: `apps/iframe-demo/src/app/pages/editor-page/editor-page.component.ts`

Per ADR 0003 this code is intentionally a thin demo, and Angular component tests for it are sparse, but at minimum:

- Receiving `EDITOR_READY` should **not** post anything cookie-shaped back. A regression that re-adds `EDITOR_SET_AUTH` would silently re-leak the (still HttpOnly-in-prod) attempt.
- The pending bridge queue is still drained on `EDITOR_READY`.

This is medium-importance because the iframe-demo isn't shipped to customers, but it *is* the documented integration harness in `apps/iframe-demo/CLAUDE.md`.

---

## High-importance gaps

### 6. `EDITOR_SET_AUTH` is now an unknown type — assert it's rejected
File added: `packages/contract/src/iframe/from-parent/__tests__/schemas.test.ts`

The schema tests check many things but never assert that `{ type: "EDITOR_SET_AUTH", token: "abc" }` is **rejected** by `parentToEditorMessageSchema`. The previous test file had three explicit tests for `EDITOR_SET_AUTH`; those went away with the schema, but a *negative* test that the literal type string is now refused would prevent a sneaky re-add. One assertion:

```
parentToEditorMessageSchema.safeParse({ type: "EDITOR_SET_AUTH", token: "x" }).success === false
```

### 7. `parseParentToEditorMessage` / `isParentToEditorMessage` helpers — no tests
File: `packages/contract/src/iframe/from-parent/helpers.ts` (new).

The previous suite tested both helpers (`describe("iframe contract helpers")`). The new `from-parent/__tests__/schemas.test.ts` only tests the schema. Helpers should have:

- `isParentToEditorMessage(validMock) === true`
- `isParentToEditorMessage({ type: "UNKNOWN" }) === false`
- `parseParentToEditorMessage(validMock)` returns the typed value
- `parseParentToEditorMessage(invalid)` throws `ZodError`

These are one-liners and they covered the public API of the helpers file. Deleting the old test file removed them.

### 8. `to-parent` helpers — `createMediaSavedMessage` argument order
File: `packages/contract/src/iframe/to-parent/helpers.ts`

The function has **eight positional parameters** of mixed `string`/`boolean`, which is genuinely error-prone (`(mediaName, downloadToComputer, saveToPersonalChannel, url, exportType, items, mediaId, selectedUnitChannelIds)`). The old test had an explicit "returns expected shape with each arg at its named key" test. The new `to-parent/__tests__/schemas.test.ts` covers the *schema* shape, but not the helper.

Add a test that asserts the helper assigns each positional arg to the right key — especially that `mediaId` (arg 7) doesn't get swapped with `mediaName` (arg 1) and that `selectedUnitChannelIds` (arg 8) doesn't get swapped with `items` (arg 6).

Even better: refactor the helper to take an options object. But absent that, the test is a load-bearing guardrail.

### 9. `createPreviewItemAddedMessage` / `createProjectClearedMessage` — no helper tests in new layout
Same file. Old test asserted shape via `assert.deepEqual`. The new `to-parent` test suite never instantiates these helpers. One-line `deepEqual` assertions, please.

### 10. `editorToParentMessageSchema` — `EDITOR_READY` not exercised
File: `packages/contract/src/iframe/to-parent/schemas.ts`

`editorReadyMessageSchema` is included in the union but the test file has no positive/negative case for `{ type: "EDITOR_READY" }`. The hook posts this on mount; a schema change that breaks it (e.g. someone adds a required `version` field) would not be caught.

### 11. `internal/render/design-payload.schema.ts` — `RENDERABLE_TYPES` filter
File: moved verbatim from server to contract package.

There is a clever `preprocess` that filters `trackItemsMap` entries whose `type` isn't in `RENDERABLE_TYPES`. The existing `DesignToRenderJobTranslator.test.ts` re-imports `designPayloadSchema` but I see no test that explicitly feeds a payload with an unknown `type` (e.g. `"comment"`, `"sticker"`) and asserts:

- The unknown entry is **dropped** rather than rejected.
- The renderable entries pass through untouched.
- The `id` field accepts both `string` and `number` (the union case in `designPayloadSchema.id`).
- Pixel preprocessing: `"123.5px"` → number; `"NaN"` / `""` → behaves predictably (current code does `Number.parseFloat`, which yields `NaN` for empty string — and `NaN` then fails `z.number()`. That's actually a bug latently; without a test it'll bite someone.).
- `volume: "100"` (string from CSS-like input) → 100 via `z.coerce.number().min(0).max(100)`.

### 12. `internal/edit-video/schemas.ts` — `editVideoRequestSchema` boundary tests
File: moved verbatim.

The old server-side location apparently had no dedicated schema test either (judging from the diff — nothing's deleted on this path other than the schema/types files). This is a request body schema for `POST /edit-video`; gaps:

- `cuts`, `overlays`, `audioSources` default to `[]` (the `.default([])` calls). Lock it in.
- `format` default `"mp4"`, `audioMixMode` default `"mix"` — default behavior.
- `cropRegion.width`/`height` minimum is 2, not 1, unlike other dimensions (probably a deliberate floor for ffmpeg crop). Worth pinning.
- `videoOverlaySchema.trackOrder` is required (no `.optional()`) where the other overlay variants make it optional. Easy to regress.
- `audioSourceSchema.volume` has no `.default(…)` so it's required. The `audioDetailsSchema` in design-payload has `.default(100)`. That asymmetry should be explicit in a test or a comment.
- `shapeOverlaySchema.x` and `.y` are unbounded numbers (no `.min(0).max(100)`) while `rectangleOverlaySchema` / `circleOverlaySchema` cap them at `0..100`. This is probably a bug; test or fix.

### 13. `internal/upload/schemas.ts` — moved without dedicated tests
The schemas got slightly tweaked (extracted to package), but I see no test that covers:

- `getSignedUrlBodySchema` rejects empty `filename` or `mimetype`.
- `cleanupBodySchema` requires at least one s3Key (the `.min(1)` after `.array()`).
- Response schemas successfully parse the controller's response shape.

The upload controller likely has its own integration tests; whether they exercise the response shape at runtime via Fastify is unclear from the diff alone. If not, this is the only place these constraints are enforced.

### 14. Package boundary — exports map
File: `packages/contract/package.json`

The export was rewritten from explicit entries to **wildcards** (`./iframe/*`, `./internal/*`). Nothing in the repo verifies the wildcard resolution actually works for every subpath. A minimal smoke test (in `packages/contract`'s own test suite) that does:

```ts
import "@video-editor/contract/iframe/from-parent";
import "@video-editor/contract/iframe/to-parent";
import "@video-editor/contract/events";
import "@video-editor/contract/internal/edit-video";
import "@video-editor/contract/internal/render";
import "@video-editor/contract/internal/upload";
import "@video-editor/contract/internal/editor-export";
import "@video-editor/contract/internal/shared";
```

would catch broken `dist/` layouts after the next build refactor. Wildcards are easy to misconfigure (especially Node's interaction between `types`, `import`, and the wildcard pattern).

Bonus: a *negative* assertion via `require.resolve` that `@video-editor/contract` (root) and `@video-editor/contract/iframe/mocks` no longer resolve, since those were intentionally removed. Stale imports elsewhere in the monorepo would otherwise be invisible until runtime.

---

## Medium-importance gaps

### 15. `recordingRangePayloadSchema.startTimeMs` and `.endTimeMs` allow value `0`
Both are `positiveNumber` (`z.number().finite().min(0)`). The `superRefine` only catches `endTimeMs <= startTimeMs`. A test for the legal lower bound (`startTimeMs: 0, endTimeMs: 1, durationMs: 1`) would be useful; today the schema accepts this and the editor must too.

### 16. `audioRangePayloadSchema` — `startTimeMs` and `endTimeMs` are independently optional
The `superRefine` correctly only fires when **both** are defined. Two cases missing:

- Only `startTimeMs` provided, no `endTimeMs` → accepted (intentional). Lock in.
- Only `endTimeMs` provided, no `startTimeMs` → accepted (probably unintentional, but it is today). Decide.

### 17. `audioRangePayloadSchema.playback.kind === "audio"` with **query-string-only** suffix
The `likelyAudioSrc` regex is `/\.(m3u8|mp3|wav|m4a|aac|ogg)(\?|$)/i`. A src ending in `.m4a` should pass; a src `https://x/track.m4a?token=…` should pass (covered by `(\?|$)`); a src `https://x/track.m4a#frag` would *fail* because `#` isn't in the alternation. Realistic? Possibly. Worth a test that pins which suffixes count.

### 18. `editorMediaSavedMessageSchema` — `selectedUnitChannelIds` content
The schema requires the array but doesn't constrain element shape beyond `savedMediaPayloadSchema`'s definition. Confirm element type (probably `nonEmptyString`) and add a negative test for empty-string ids.

### 19. `internal/editor-export/types.ts` — pure type file with no schemas
The file is `interface` declarations only. The editor-export controller validates request bodies somewhere — confirm it does, because the diff shows the controller now imports `EditorExportBody` *type only*. If the controller does no runtime validation of the request, that's a real bug since the contract package now claims `/internal/editor-export` is the home for this surface but provides no Zod schema. At minimum, add a TODO + a test asserting current behavior, or write the Zod schema.

### 20. Cross-app smoke: `apps/iframe-demo/src/app/message-types.ts` drift
The file is a **local type mirror** of the contract package. The mirror lost `EDITOR_SET_AUTH` in this diff. There's no test that asserts the mirror stays in sync. A type-level test in the demo app (`const _check: ParentToEditorMessage = …`) imported from the contract would catch future drift.

### 21. `HttpPreviewSourceAdapter` test was not touched in this diff
Existing tests use `Cookie: ztube-token=abc` which is the *outbound* request to Core — still correct. But there's no test asserting the adapter's *constructor* tolerates an empty string (which is now the common case under ADR 0003 when no cookie is sent) and produces *no* `Cookie` header at all on the outbound. The existing "omits Cookie header when authCookie empty" test (line 69 of the adapter test) covers this — verify it's still there post-merge.

---

## Low-importance / nice-to-have

### 22. Snapshot the `package.json#exports` shape
A snapshot test of the JSON would catch accidental removals.

### 23. Routing key constants tests already exist
The `events/__tests__/export.test.ts` covers them. Good.

### 24. Mock fixtures keep schema-valid
Both `from-parent` and `to-parent` test suites iterate over their mocks and assert schema validity. Good.

### 25. README example correctness
`packages/contract/README.md` shows `window.parent.postMessage(createPreviewItemAddedMessage(itemId), targetOrigin)`. The function takes `(itemId, requestId?)` — the example silently drops `requestId`. Not a test gap exactly, but worth a doc-test or a runnable example.

### 26. `biome.json` glob change
`"packages/*/src/index.ts", "packages/*/src/*/index.ts"` → `"packages/*/src/index.ts", "packages/*/src/**/index.ts"`. The first entry is now dead (there's no `src/index.ts` after the diff). Can be removed. No test, just cleanup.

---

## Priorities if I had to pick five

1. **Preview controller cookie parsing** — controller test + E2E with `Cookie` header (gap #1). This is the production auth path. Today nothing protects it.
2. **`useEditorPostMessage` behavior under the new schema** — at minimum a test that `EDITOR_SET_AUTH` is silently rejected and `addPreviewItemToEditor` is called without the third arg (gap #2). The hook has no test at all.
3. **`from-parent` helpers test reinstated** (gap #7). The old file tested both `isParentToEditorMessage` and `parseParentToEditorMessage`; the new layout deleted them.
4. **`createMediaSavedMessage` positional-arg test** (gap #8). Eight positional args is an accident waiting to happen.
5. **`URIError` from malformed percent-encoding** in the controller cookie regex (gap #1, sub-bullet). Likely a 500 today. Either guard with try/catch or test the failure mode explicitly.

---

A general note: the diff is mostly a reorganization of existing code. The risky parts are **the small functional changes hiding inside the reshuffle**: the cookie-header parsing and the deletion of `EDITOR_SET_AUTH`. Those two changes shipped with no behavioral tests for either the server controller or the frontend hook. The schema-level coverage is genuinely thorough — what's missing is the seam between the schemas and the runtime callers.
