## Test Coverage Report

### Summary
- Files changed: 28 (after filtering out lock files, .env, *.md, ADR, fixture binaries, *.test.ts, configs, Angular SCSS/HTML)
- Public interfaces analyzed: 13 source files with logic worth reviewing
- Gaps found: 11 (Critical: 0, High: 5, Medium: 4, Low: 2)

---

### 🔴 Critical

None — every HTTP route and use-case modified in this diff has at least one co-located test exercising the happy path.

---

### 🟠 High

**`apps/server/src/features/preview/adapters/inbound/http/preview.controller.ts`**

Gap 1 — `kind` query discriminator validation matrix (Exit Door 5)
- `describe('GET /editor/segment')` → `it('When kind query is missing, Then returns 400 "Missing url, sig, or kind"')`
- `describe('GET /editor/segment')` → `it('When kind="bogus", Then returns 400 "Invalid kind"')`
- `describe('GET /editor/segment')` → `it('When kind="channel-range" and token is absent, Then returns 400 "Missing token for channel-range"')`

Gap 2 — `media-id` token leakage guard (Exit Door 3)
- `describe('GET /editor/segment')` → `it('When kind="media-id" with a token query param, Then upstream fetch does NOT receive vod-token header')`

Gap 3 — `media-id` cookie forwarding (Exit Door 3)
- `describe('GET /editor/segment')` → `it('When kind="media-id" with a ztube-token cookie set, Then upstream fetch carries Cookie: ztube-token=... and no vod-token')`

---

**`apps/server/src/features/preview/application/use-cases/GeneratePreviewUseCase.ts`**

Gap 1 — media-id `mediaCreatedAtMs` ↔ MPD timeline drift (Exit Door 1)
- `describe('GeneratePreviewUseCase media-id')` → `it('When mediaCreatedAtMs differs from the MPD first-segment baseline, Then returns a documented output (truncated playlist or throws RangeError)')`
  - Reason: current test pins `segmentStartTimeMs = mediaCreatedAtMs`, so a drift bug returns an empty playlist silently. Pick a contract and pin it.

Gap 2 — channel-range response omits `mediaCreatedAtMs` (Exit Door 1)
- `describe('GeneratePreviewUseCase channel-range')` → `it('When source is channel-range, Then output.mediaCreatedAtMs is undefined')`

---

**`apps/frontend/src/features/editor/external-preview/payload-intake.ts`**

Gap 1 — unknown `StoredMediaType` from Core (Exit Door 5)
- `describe('addStoredMediaToEditor')` → `it('When Core returns type="Audio" (unknown), Then throws CoreUnavailableError matching /unknown type/')`

Gap 2 — malformed JSON from Core (Exit Door 5)
- `describe('addStoredMediaToEditor')` → `it('When Core returns 200 with non-JSON body, Then throws (current behaviour: SyntaxError leaks)')` — pins behaviour so a fix to wrap in `CoreUnavailableError` is intentional.

Gap 3 — append to non-empty timeline (Exit Door 2)
- `describe('addStoredMediaToEditor')` → `it('When state already contains a 10s video, Then the stored image is appended at from=10000, to=15000')`
  - Reason: `appendStoredImageState` / `appendStoredVideoState` are duplicates of `appendItemState`; only insertAtMs=0 is currently exercised, so a duplicate-drift bug is invisible.

---

**`apps/server/src/features/preview/adapters/outbound/http/HttpPreviewSourceAdapter.ts`**

Gap 1 — `playMedia` URL resolution (Exit Door 1)
- `describe('HttpPreviewSourceAdapter.playMedia')` → `it('When play.url is relative, Then mpdUrl is resolved against serverBaseUrl')`
- `describe('HttpPreviewSourceAdapter.playMedia')` → `it('When play.url is absolute, Then mpdUrl passes through unchanged')`
  - Reason: `playMedia` test at line 185-201 only asserts the Cookie header, never the resolved `mpdUrl`. `play` does cover this for channel-range — the same shape is missing here.

---

**`apps/frontend/src/features/editor/external-preview/handle-parent-message.ts`**

Gap 1 — `EDITOR_ADD_MEDIA` cache-skip guard (Exit Door 1)
- `describe('handleParentMessage EDITOR_ADD_MEDIA')` → `it('When responseCache has a stale entry under a key colliding with mediaId, Then addStoredMedia is still invoked (cache lookup is skipped for this type)')`
  - Reason: the `message.type !== "EDITOR_ADD_MEDIA"` guard at line 108 has no test asserting it.

---

### 🟡 Medium

**`apps/server/src/features/preview/application/services/url-signing.ts`**

Gap 1 — length-mismatch shortcut (Exit Door 1)
- `describe('verifyUrlSignature')` → `it('When sig length does not match expected, Then returns false without throwing')`

Gap 2 — empty-token kind swap (Exit Door 1)
- `describe('verifyUrlSignature')` → `it('When token is empty, Then signature for "channel-range" does not verify against "media-id"')`

---

**`apps/core-mock/src/index.ts`**

Gap 1 — unknown init segment 404 branch (Exit Door 1)
- `describe('core-mock storage segment routes')` → `it('When /private/storage/demo-clip-001/init_v99.mp4 is requested, Then returns 404 "Unknown init segment"')`

Gap 2 — fall-through 404 for non-segment filenames (Exit Door 1)
- `describe('core-mock storage segment routes')` → `it('When filename matches neither init nor segment pattern (e.g. random.txt), Then returns 404 "Unknown storage path"')`

---

**`apps/iframe-demo/src/app/services/editor-bridge.service.ts`** + **`apps/iframe-demo/src/app/pages/editor-page/editor-page.component.ts`**

Gap — Angular subapp has no test infra; `postBridgeItem` discriminator (`"kind" in item && item.kind === "stored-media"`) and the `addMediaFromForm` whitespace branch are untested.

Suggested (after adding Vitest/Jest config for the Angular package):
- `describe('postBridgeItem')` → `it('When item.kind === "stored-media", Then sends EDITOR_ADD_MEDIA with mediaId')`
- `describe('postBridgeItem')` → `it('When item is a PreviewItemPayload, Then sends EDITOR_ADD_PREVIEW_ITEM with payload')`

Note: blocked by absence of Angular test setup; tracker-only.

---

### 🟢 Low

**`apps/core-mock/src/fixtures/dash.ts`**

Gap — fixture cache eviction on load failure (Exit Door 1)
- `describe('getDashFixture')` → `it('When first load throws, Then a subsequent call attempts load again (cache cleared)')`

---

**`apps/core-mock/src/fixtures/media-registry.ts`**

Gap — `isVideoType` ↔ `videoPlayRegistry` drift (Exit Door 1)
- `describe('media-registry')` → `it('When every watchRegistry entry with isVideoType(type)===true is looked up in videoPlayRegistry, Then no entry is missing')`

---

### ✅ Already Covered
- `apps/server/.../preview.controller.ts` — channel-range happy path, media-id happy path, media-id 404, range out of fixture window
- `apps/server/.../GeneratePreviewUseCase.ts` — channel-range orchestration, media-id orchestration
- `apps/server/.../url-signing.ts` — kind/url/token cross-rejection, empty sig
- `apps/server/.../HttpPreviewSourceAdapter.ts` — play happy/error paths, playMedia happy/error paths, fetchManifest cookie+token combinations
- `apps/frontend/.../payload-intake.ts` — recording-range, audio-range, stored-media Image/ScreenShotFromLive/ClipVideo/UploadedVideo, Core 404 / 500 / network failure
- `apps/frontend/.../handle-parent-message.ts` — origin gating, schema rejection, ADD_PREVIEW_ITEM happy/cached/error, CLEAR_PROJECT, ADD_MEDIA happy/rejected/no-dedup, cache eviction
- `apps/frontend/.../extract-saved-items.ts` — all type buckets, fallbacks, schema validation round-trip
- `apps/frontend/.../preview-source-api.ts` — co-located test exists (verified)
- `apps/core-mock/__tests__/{storage-clip,storage-image,storage-mpd,videos-play,watch,play}.test.ts` — core-mock routes
- `packages/contract/.../iframe/from-parent/{schemas,helpers}.test.ts` — EDITOR_ADD_MEDIA + EDITOR_ADD_PREVIEW_ITEM rules
- `packages/contract/.../iframe/to-parent/{schemas,helpers}.test.ts` — message factories, mediaId echo

### ⏭️ Skipped
- `*.md`, `docs/adr/0007-*.md` — documentation
- `apps/frontend/.env*` — config
- `apps/frontend/vite.config.ts` — build config
- `apps/iframe-demo/{angular,biome}.json*` — config
- `packages/contract/package.json`, `pnpm-lock.yaml`, `knip.json` — manifest/lock
- `apps/core-mock/fixtures/**` — binary fixtures (mp4/m4s/mpd/jpg)
- `apps/frontend/.../hooks/use-easter-eggs.ts`, `.../use-timeline-edge-scroll.ts` — pure visual effects, no behavioral contract
- `apps/frontend/.../editor.tsx`, `.../navbar.tsx` — Remotion/React composition shells, change is non-behavioral wiring
- `apps/iframe-demo/src/app/message-types.ts` — type re-export aliases
- `apps/iframe-demo/.../editor-page.component.{html,scss}` — markup/styles
- All `*.test.ts` files (test inputs, not subjects)

---

### Remediation Plan

Ordered by priority — close from top:

1. **[High]** `apps/server/.../preview.controller.e2e.test.ts` — add 3 tests: missing `kind`, invalid `kind`, `channel-range` without token (all 400).
2. **[High]** `apps/server/.../preview.controller.e2e.test.ts` — add 1 test: `kind=media-id` with rogue `token` param does NOT forward `vod-token` upstream.
3. **[High]** `apps/server/.../preview.controller.e2e.test.ts` — add 1 test: `kind=media-id` with `ztube-token` cookie → upstream sees `Cookie: ztube-token=...` only.
4. **[High]** `apps/server/.../GeneratePreviewUseCase.test.ts` — add 1 test for `mediaCreatedAtMs` drift (pin behaviour); add 1 test that channel-range output has `mediaCreatedAtMs === undefined`.
5. **[High]** `apps/frontend/.../payload-intake.test.ts` — add 3 tests: unknown stored type, malformed JSON, append onto 10s timeline lands at correct insertAtMs.
6. **[High]** `apps/server/.../HttpPreviewSourceAdapter.test.ts` — add 2 tests for `playMedia` mpdUrl resolution (relative + absolute).
7. **[High]** `apps/frontend/.../handle-parent-message.test.ts` — 1 test: ADD_MEDIA does not consult responseCache.
8. **[Medium]** `apps/server/.../url-signing.test.ts` — add 2 tests: length-mismatch shortcut, empty-token kind swap.
9. **[Medium]** `apps/core-mock/.../storage-mpd.test.ts` — add 2 tests: unknown init 404, non-segment filename 404.
10. **[Low]** `apps/core-mock/.../` — add a new tiny suite for `getDashFixture` cache-eviction and `isVideoType`↔`videoPlayRegistry` parity.
11. **[Medium, tracker-only]** Angular subapp `editor-bridge.service.ts` discriminator — needs test infra bootstrapped first.
