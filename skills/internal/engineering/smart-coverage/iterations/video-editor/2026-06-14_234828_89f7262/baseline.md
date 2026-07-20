# Tests Missing — Code Review

The change is well-tested overall. The team added new tests for almost every new code path: contract schemas, helpers, signing, use-case branches, the adapter's `playMedia`/`fetchManifest`, the preview controller E2E for `media-id`, payload-intake's `addStoredMediaToEditor`, message dispatch in `handle-parent-message`, and a full set of core-mock fixture endpoints. Below are the gaps I'd push back on in review — ordered by how much actual risk they carry.

## Critical (security / correctness — I'd block on these)

### 1. `/editor/segment` handler validation paths are nearly uncovered
The controller picked up real new branches in `preview.controller.ts:61-86` that no test exercises:

- **Missing `kind` query** → 400 `"Missing url, sig, or kind"`. Was previously "Missing url, token, or sig". Anyone still sending the old query shape (which is the entire population of in-flight playlists from before this deploy — the ADR explicitly calls this out) will hit this. No test asserts the new error message or that omitting `kind` 400s.
- **Invalid `kind` value** (e.g. `kind=channel-bogus`) → 400 `"Invalid kind"` via `isSrcKind`. Untested.
- **`kind=channel-range` with no `token`** → 400 `"Missing token for channel-range"`. Untested. This is the only thing keeping a media-id-style URL (no token) from being submitted with the `channel-range` HMAC payload format. If this 400 ever regresses to allow it, the attacker can ride the empty-token path.
- **`kind=media-id` with a `token` query param present**. The controller silently uses `effectiveToken = token ?? ""` and signs with that. Is `token=anything` accepted on media-id URLs? Currently yes — the signature would mismatch (since the use case signed with `""`), so it'd 403, but no test pins this. A future refactor could leak the token to upstream as a `vod-token` header for media-id.
- **`kind=media-id` segment fetch with a non-empty `ztube-token` cookie** — does the proxy forward `Cookie: ztube-token=…` upstream and *not* attach `vod-token`? The E2E test for media-id only checks `vod-token` is absent; it never asserts the cookie is forwarded. The combination "media-id + cookie" is the actual production auth path; it deserves its own assertion (the controller code at `preview.controller.ts:125-127` is one bug-fix away from sending both headers or neither).

### 2. URL-signing — kind-binding edge cases
`url-signing.test.ts` covers the happy paths and three cross-rejections. Missing:

- **Empty-string `token` with `srcKind="channel-range"`** as a verify input. The use case never produces this combo, but the controller, after the diff, accepts `kind=channel-range` only when `effectiveToken` is non-empty. Worth a unit test that `signUrl(secret, url, "", "channel-range") !== signUrl(secret, url, "", "media-id")` — i.e. confirm that swapping the kind on an empty-token signature still fails. Right now the kind-mismatch test uses `tok-A` only.
- **Length-mismatch shortcut returns `false`.** That branch (`a.length !== b.length`) is unchanged but never tested. Worth a single regression line — a malformed `sig` that's the wrong length should not throw and should not pass.

### 3. `GeneratePreviewUseCase` media-id — silent assumption that `sourceOffsetMs=0` is always correct
The new media-id branch hard-codes `sourceOffsetMs: 0` and `segmentStartTimeMs: mediaCreatedAtMs`, then calls `generateHlsPlaylist` with `requestedStartMs = mediaCreatedAtMs, requestedEndMs = mediaCreatedAtMs + durationMs`. This means the playlist generator is being told "the whole media window is the requested window". If the MPD's actual first-segment timestamp doesn't line up with `mediaCreatedAtMs`, the playlist trims wrong or empties.

The unit test feeds a fixture MPD with `segmentStartTimeMs = SEG_START` (the same as `mediaCreatedAtMs`) so it happens to work. There's no test for the realistic case where `mediaCreatedAtMs` (a wall-clock anchor from Core) differs from the MPD's internal segment timeline base. If they ever drift even by one segment, this code returns an empty/broken playlist with no error. Add a test where `play.timeRanges[0][0]` and the MPD's first segment baseline differ; assert what the contract is (truncated playlist? exception? all segments?). Right now the behaviour is unspecified.

## High (uncovered behaviour with realistic failure modes)

### 4. Frontend `addStoredMediaToEditor` — the unknown-type branch
`payload-intake.ts:54-62` throws `CoreUnavailableError("…unknown type")` when Core returns `{ type: "Audio" }` or any future type the editor doesn't know about. There's no test. This is plausible: Core adds a new stored-media type, the editor rejects everything with a confusing "core unavailable" reason. At minimum, a test confirming an unknown `type` is rejected (and probably a TODO to map it to a clearer reason — `"unsupported media type"`?).

### 5. `fetchMediaWatch` — non-Response throws from `fetchCore`
The `try/catch` in `payload-intake.ts:42-46` is meant to map *network* errors to `CoreUnavailableError`. But it wraps `response = await fetchCore(...)` only. If `response.json()` (line 53) throws (malformed JSON from Core), it bubbles as a raw SyntaxError instead of `CoreUnavailableError`. No test pins behaviour for non-JSON or truncated bodies. Either fix the bug or add a regression test that locks in current behaviour.

### 6. `buildStorageImageUrl` — `VITE_CORE_EXTENSION` semantics
The `.env` files just changed: dev went from `:8002/private` to `/private`, preprod/prod went from `/api/media/` (trailing slash) to `/api/media` (no trailing slash). CLAUDE.md was updated to require "no trailing slash", but nothing enforces it. If someone restores the trailing slash, `buildStorageImageUrl("img-1")` becomes `/api/media//storage/img-1/image` — many proxies tolerate it, some don't. Worth one test: given the env value, the produced URL has exactly one `/` between prefix and `storage`. (Same applies to the watch fetch path.)

### 7. `handle-parent-message` — the legacy fast path for `EDITOR_ADD_MEDIA` requestId
Line 99 says: `if (message.type !== "EDITOR_ADD_MEDIA" && message.requestId)`. The intent is "don't replay-cache for EDITOR_ADD_MEDIA". But schemas already strip extra fields. What if a parent sends `{ type: "EDITOR_ADD_MEDIA", mediaId: "x", requestId: "stale" }`? The schema test confirms it 400s (good — strictObject). But there's no test that this guard actually prevents a stale `requestId` cache hit on EDITOR_ADD_MEDIA messages even if the schema were ever loosened. Belt-and-suspenders. Low priority but the guard exists so it deserves a test.

### 8. `addStoredMediaToEditor` — video without dimensions
The mock test pins `width=1280, height=1024`. The contract for media-id `PreviewSourceResponse` requires `width`/`height`. But `resolvePreviewSource` returns whatever the server sends. The server's MPD parser might fail to extract dimensions (audio-only stream, weird codec). What happens if `resolved.width === 0` or `undefined`? The current code blindly stuffs it into `details`. No assertion. Worth a test that a zero/missing dimension is either rejected or defaulted.

### 9. `HttpPreviewSourceAdapter.playMedia` — relative `url` resolution
The adapter does `new URL(play.url, this.serverBaseUrl).toString()`. The test at `HttpPreviewSourceAdapter.test.ts:185-201` passes `"/storage/clip-001/mpd"` (relative) but only checks the Cookie header — never asserts the returned `mpdUrl` was correctly resolved against `serverBaseUrl`. The absolute case is also untested for resolution behaviour. Add: relative URL → resolves against `serverBaseUrl`; absolute URL → passes through unchanged.

Also, **`serverBaseUrl` is the wrong base** for resolving a Core-served MPD URL. The real semantics is "this is a Core URL, resolve it against Core's base". The dev mock returns an absolute `selfBaseUrl` to dodge this, but in prod if Core ever returns a relative URL it'd resolve against the editor server origin, which would 404. Either pin "Core only returns absolute URLs" with a test that throws on relative, or fix the base. (This is one I'd actually push back on as a design comment, not just test coverage.)

### 10. `core-mock` — segment 404 for unknown init filename
`storage-mpd.test.ts` tests `segment_v0_999999.m4s` returns 404 but doesn't test `init_v99.mp4` (unknown init) — that's a separate branch in the handler (`preview-source-api.ts` equivalent, in `src/index.ts:842-870`). Also doesn't test a totally unknown filename pattern like `random.txt` falls through to the final 404. Both branches in the handler are unrun.

### 11. core-mock `/private/videos/:id/play` — `selfBaseUrl` URL-encoding
The handler does `encodeURIComponent(req.params.id)`. The watch registry only has safe ids today, but if someone adds an id like `clip/01` (slash), the resulting `url` should be `…/clip%2F01/mpd` not `…/clip/01/mpd`. No test for encoding. Trivial but the encoding is in the code for a reason.

## Medium (worth adding but not blocking)

### 12. `addStoredMediaToEditor` — non-zero `insertAtMs` (appending at end of timeline)
Every test uses an empty state (insertAtMs = 0). There's no test that adding a stored image after an existing 10-second video places it at `from: 10000, to: 15000`. The `getProjectDuration` math is the same code path as recording-range, but the new `appendStoredImageState` / `appendStoredVideoState` functions are duplicates of `appendItemState` and could drift independently. One test per appender that verifies the second add lands after the first.

### 13. `appendStoredVideoState` — `trim` is hard-coded to `{from: 0, to: durationMs}`
The current code always resets trim. If a future bug copies-from-currentItem-instead, no test catches it. Pin it.

### 14. `extractSavedItems` — mixed metadata edge cases
The updated tests cover `externalKind: "stored-media"` + `mediaId` → uses `mediaId`. But what about:
- `externalKind: "stored-media"` + **no `mediaId`** (degenerate). Code falls back to `item.id`. Test it.
- `externalKind: "recording-range"` on an image item (impossible by design, but the fall-through behaviour is in production code).

### 15. `iframe-demo` — `BridgeQueueItem` discriminator drift
`postBridgeItem` discriminates on `"kind" in item && item.kind === "stored-media"`. If `PreviewItemPayload` ever grows a `kind: "stored-media"` member (someone re-merges), the discriminator silently misroutes. No test exercises the bridge queue with both shapes. The Angular app has no test suite at all in this diff. A unit test on `postBridgeItem` with each shape is cheap.

### 16. `iframe-demo` `addMediaFromForm` — whitespace-only id
Tested in the component logic (`mediaError.set("יש להזין מזהה מדיה")`) but no test (Angular has no tests). At least worth a contract-level test that the editor would reject a whitespace-only mediaId — which the schema test does for `"   "` actually, good. But the form-side validation is untested.

### 17. `useEasterEggs` — flip → rename round trip
The new `triggerRoniCutFlip` + `__roni-cut-flip` window event + `Navbar` listener that resets `projectName` to `"RoniCut"`. Cute, totally untested. Reset-on-unmount cleanup (`removeEl("__flip_style")` and `clearTimeout(flipSwapTimer)`) added — no test. Low priority unless this product cares about it.

### 18. `preview.controller` E2E — happy-path channel-range still works
The diff added `expect(segmentLine).toContain("&kind=channel-range")` and `&token=` to the existing E2E test. Good. But there's no negative assertion that the segment-proxy endpoint of an old-format URL (no `kind`) now 400s — the deployment migration story. Add it.

### 19. `GeneratePreviewUseCase` media-id — `mediaCreatedAtMs` propagation to response
The test asserts `out.mediaCreatedAtMs === SEG_START`. Good. But the channel-range branch's response **doesn't include `mediaCreatedAtMs`** (it's optional in the interface). No test asserts `out.mediaCreatedAtMs === undefined` for channel-range — easy regression. Pin it.

## Low (nice to have)

### 20. core-mock `media-registry` is a hard-coded const — no test that `isVideoType` matches the registry
If someone adds `ClipVideo: "ClipVideo"` to one and forgets the other, requests will 404 in a confusing way. A simple test that every video-typed registry entry resolves via `isVideoType` would prevent drift.

### 21. core-mock fixtures loader — cache invalidation on failure
`fixtures/dash.ts` evicts the cache on rejection (`pending.catch(() => cache.delete(mediaId))`). No test exercises this — could regress to caching a rejected promise forever. Inject a failed first load, then succeed on retry.

### 22. Image fixture content-type
`storage-image.test.ts` only asserts `Content-Type` matches `/^image\//`. The loader hard-codes `image/jpeg`. If the loader ever auto-detects from extension, behaviour could shift. Pin the exact value or pin the magic bytes.

---

## Summary

Net: the high-value happy paths and the new contract surface are covered. The gaps cluster in **three places**:

1. **The segment-proxy auth/discriminator validation matrix** — new `kind` query param, new validation branches, none directly tested. (#1, #2)
2. **Frontend `addStoredMediaToEditor` failure surface** — unknown stored-media types, malformed Core responses, missing dimensions, env-prefix misconfiguration all go through under-tested paths. (#4, #5, #6, #8)
3. **The media-id timing/anchor contract between Core and the use case** — `mediaCreatedAtMs` vs MPD timeline alignment is asserted only in the happy case where they're equal. (#3)

If you only have time for three tests, I'd take:
- The 400s for missing `kind` / invalid `kind` / `kind=channel-range` without token on `/editor/segment`.
- `addStoredMediaToEditor` with `type: "Audio"` (or any unknown type) → rejects with a useful error.
- `GeneratePreviewUseCase` media-id with `mediaCreatedAtMs` deliberately offset from the MPD's segment baseline → either documented behaviour or a clear failure.

Relevant files for the gaps above:
- `/Users/danielrispler/work/video-editor/apps/server/src/features/preview/adapters/inbound/http/preview.controller.ts`
- `/Users/danielrispler/work/video-editor/apps/server/src/features/preview/application/services/url-signing.ts`
- `/Users/danielrispler/work/video-editor/apps/server/src/features/preview/application/use-cases/GeneratePreviewUseCase.ts`
- `/Users/danielrispler/work/video-editor/apps/server/src/features/preview/adapters/outbound/http/HttpPreviewSourceAdapter.ts`
- `/Users/danielrispler/work/video-editor/apps/frontend/src/features/editor/external-preview/payload-intake.ts`
- `/Users/danielrispler/work/video-editor/apps/frontend/src/features/editor/external-preview/handle-parent-message.ts`
- `/Users/danielrispler/work/video-editor/apps/core-mock/src/index.ts`
- `/Users/danielrispler/work/video-editor/apps/iframe-demo/src/app/services/editor-bridge.service.ts`
- `/Users/danielrispler/work/video-editor/apps/iframe-demo/src/app/pages/editor-page/editor-page.component.ts`
