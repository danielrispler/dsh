## Test Coverage Report

### Summary
- Files changed: 60 (after filtering MD/lock/config/test-files/deleted)
- Public interfaces analyzed: 5 with real behavior change; ~30 pure import-path reorg (skipped per "internal refactor — existing tests sufficient")
- Gaps found: 7 (Critical: 0, High: 4, Medium: 2, Low: 1)

---

### 🔴 Critical
*None.* The only HTTP route with behavior change (`preview.controller.ts`) already has a co-located test file; the new behavior is uncovered but it's not a zero-coverage route.

---

### 🟠 High

**`apps/server/src/features/preview/adapters/inbound/http/preview.controller.ts`**

The `POST /editor/preview-source` handler dropped the `x-ztube-token` request-header path and now parses `ztube-token` from `request.headers.cookie` (lines 99–102). Existing test file has zero mentions of `cookie` / `ztube-token`.

Gap 1 — Cookie-token forwarding happy path (Exit Door 3 — external call assertion)
- `describe('POST /editor/preview-source', () => { describe('auth cookie forwarding', ...) })` → `it('When Cookie: ztube-token=abc is sent, Then HttpPreviewSourceAdapter is constructed with ztube-token "abc"')`

Gap 2 — Cookie-token absent → empty token forwarded (Exit Door 1 — response shape doesn't change; Exit Door 3 — adapter sees `""`)
- → `it('When no Cookie header is present, Then adapter is constructed with empty ztube-token (no Cookie header sent upstream)')`

Gap 3 — URL-encoded token decoded (Exit Door 3)
- → `it('When Cookie: ztube-token=ab%3Dcd is sent, Then adapter receives decoded value "ab=cd"')`

Gap 4 — Error path: malformed percent-escape (Exit Door 5)
- → `it('When Cookie: ztube-token=%ZZ is sent, Then handler returns 4xx (does not 500)')` *(also a probable bug — `decodeURIComponent` throws today)*

**`apps/frontend/src/features/editor/external-preview/use-editor-post-message.ts`**

Hook removed `EDITOR_SET_AUTH` handling and `authTokenRef`. No test file exists for this hook. New behavior is the load-bearing iframe seam.

Gap 1 — Unknown message type rejected (Exit Door 5)
- `describe('useEditorPostMessage', () => { describe('schema validation', ...) })` → `it('When parent posts {type:"EDITOR_SET_AUTH",token:"x"}, Then EDITOR_PREVIEW_ITEM_REJECTED is posted back with schema-error reason')`

Gap 2 — EDITOR_READY posted on mount (Exit Door 1)
- → `it('When mounted inside an iframe, Then window.parent receives EDITOR_READY')`

Gap 3 — EDITOR_ADD_PREVIEW_ITEM happy path (Exit Door 1, 2)
- → `it('When parent posts valid EDITOR_ADD_PREVIEW_ITEM, Then EDITOR_PREVIEW_ITEM_ADDED with itemId is posted back')`

Gap 4 — Origin allowlist (Exit Door 5)
- → `it('When message arrives from disallowed origin, Then no response is posted')`

**`apps/frontend/src/features/editor/external-preview/preview-source-api.ts`**

`resolvePreviewSource` dropped its `authToken?` parameter and the `x-ztube-token` header. No test file exists.

Gap 1 — Request shape pinned (Exit Door 3)
- `describe('resolvePreviewSource', ...)` → `it('When called, Then POSTs to relative URL "/editor/preview-source" with Content-Type: application/json and no auth header')`

Gap 2 — No `credentials: "include"` (ADR 0003: same-origin only) (Exit Door 3)
- → `it('When called, Then fetch is invoked without credentials:"include" (default same-origin behavior)')`

**`apps/frontend/src/features/editor/external-preview/payload-intake.ts`**

`addPreviewItemToEditor` lost its third `authToken?: string` parameter. Existing test only covers pure helpers (`buildExternalMetadata`, `buildFallbackTrackItem`, `getDurationFromItem`) — never touches the exported `addPreviewItemToEditor`.

Gap 1 — `resolvePreviewSource` invoked with 3 args, not 4 (Exit Door 3)
- `describe('addPreviewItemToEditor — recording-range', ...)` → `it('When invoked with recording-range payload lacking playback.src, Then resolvePreviewSource is called with (channelId, startTimeMs, endTimeMs) and exactly three arguments')`

---

### 🟡 Medium

**`packages/contract/src/iframe/from-parent/helpers.ts`** & **`to-parent/helpers.ts`**

Both files are new. The previous `iframe/helpers.test.ts` covered `isParentToEditorMessage` / `parseParentToEditorMessage` and was deleted in the reorg. Schemas are tested in the new `__tests__/schemas.test.ts`, but the helper functions are not.

Gap 1 — `from-parent/helpers.ts` round-trip (Exit Door 1)
- `describe('from-parent helpers', ...)` → `it('When valid mock passed to isParentToEditorMessage, Then returns true')`
- → `it('When invalid object passed to parseParentToEditorMessage, Then throws ZodError')`

Gap 2 — `to-parent/helpers.ts` positional-arg correctness for `createMediaSavedMessage` (8 positional params, easy to swap) (Exit Door 1)
- `describe('createMediaSavedMessage', ...)` → `it('When called with all positional args, Then each arg lands at its named key (mediaName, mediaId, items, selectedUnitChannelIds in particular)')`

**`apps/iframe-demo/src/app/pages/editor-page/editor-page.component.ts`**

Demo harness lost `getZtubeToken` and stopped posting `EDITOR_SET_AUTH` on `EDITOR_READY`. Demo app — primary integration harness per `apps/iframe-demo/CLAUDE.md`. No Angular test exists.

Gap 1 — Regression guard against re-introduction of `EDITOR_SET_AUTH` post (Exit Door 3)
- `describe('EditorPageComponent — EDITOR_READY', ...)` → `it('When EDITOR_READY received, Then no EDITOR_SET_AUTH is posted to the iframe')`

---

### 🟢 Low

**`packages/contract/package.json`** — exports wildcards (`./iframe/*`, `./internal/*`).

Gap 1 — Subpath resolution smoke (Exit Door 1)
- `describe('package exports', ...)` → `it('When importing each declared subpath, Then it resolves')` covering `iframe/from-parent`, `iframe/to-parent`, `events`, `internal/{edit-video,render,upload,editor-export,shared}`.

---

### ✅ Already Covered
- `packages/contract/src/iframe/from-parent/schemas.ts` — `from-parent/__tests__/schemas.test.ts`
- `packages/contract/src/iframe/to-parent/schemas.ts` — `to-parent/__tests__/schemas.test.ts`
- `packages/contract/src/events/export.ts` — `events/__tests__/export.test.ts`
- `packages/contract/src/shared/saved-media.ts` — `shared/__tests__/saved-media.test.ts`
- `apps/frontend/src/features/editor/utils/extract-saved-items.ts` — import-only change, existing test still valid
- `apps/server/src/features/render/domain/DesignToRenderJobTranslator.ts` — existing test updated (in diff)

### ⏭️ Skipped (internal refactor — existing tests sufficient)
- `apps/server/src/features/edit-video/adapters/inbound/http/edit-video.controller.ts` — only import-path change to `@video-editor/contract/internal/edit-video`
- `apps/server/src/features/render/adapters/inbound/http/render.controller.ts` — import-path only
- `apps/server/src/features/editor-export/adapters/inbound/http/editor-export.controller.ts` — inlined types moved to `@video-editor/contract/internal/editor-export`; no behavior change
- `apps/server/src/features/upload/adapters/inbound/http/upload.controller.ts` — import-path only
- `apps/server/src/features/render/application/use-cases/VideoRenderUseCase.ts` — import-path only
- `apps/server/src/features/render/adapters/inbound/design/DesignRenderInputAdapter.ts` — import-path only
- `apps/server/src/features/edit-video/domain/video-segment.policy.ts` — import-path only
- `apps/server/src/features/edit-video/application/ports/outbound/EditVideoJobStatePort.ts` — import-path only (port type)
- `apps/server/src/shared/application/ports/outbound/VideoRenderPort.ts` — import-path only
- `apps/server/src/infrastructure/ffmpeg/**` (FfmpegVideoProcessor, ffmpeg-command.builder, ffmpeg.utils, overlays/*, source-processors/*) — all pure import-path moves
- `apps/iframe-demo/src/app/message-types.ts` — type-only mirror, lost `EDITOR_SET_AUTH` constant
- `packages/contract/src/internal/**` (new files) — moved verbatim from server, no behavior change; coverage matches pre-move state
- `packages/contract/src/events/index.ts`, `packages/contract/src/shared/saved-media.ts` — barrel/re-export changes
- `apps/server/CLAUDE.md`, `apps/frontend/CLAUDE.md`, `apps/iframe-demo/CLAUDE.md`, `packages/contract/CLAUDE.md`, `CONTEXT.md`, `README.md`, `docs/adr/*.md` — docs
- `biome.json`, `packages/contract/package.json` (covered separately under Low #1)
- `apps/server/src/features/edit-video/adapters/inbound/http/edit-video.schema.ts`, `edit-video.types.ts`, `apps/server/src/features/render/adapters/inbound/http/design-payload.schema.ts`, `apps/server/src/features/upload/adapters/inbound/http/upload.schema.ts`, `apps/server/src/shared/domain/{OverlayType,TimeRange,VideoMetadata,render-types}.ts`, `packages/contract/src/iframe/{helpers,schemas,messages,payloads,mocks,index}.ts`, `packages/contract/src/index.ts`, `packages/contract/src/events/export.test.ts`, `packages/contract/src/iframe/helpers.test.ts`, `packages/contract/src/shared/saved-media.test.ts` — deleted (moved); coverage migrates with new file

---

### Remediation Plan

Ordered by priority. Write these tests to close all gaps:

1. **[High]** `apps/server/src/features/preview/adapters/inbound/http/__tests__/preview.controller.test.ts` — extend with 4 cookie-parsing cases (happy path, missing, URL-decoded, malformed `%ZZ`); inject the adapter factory or use the E2E suite with a real `Cookie` header.
2. **[High]** `apps/frontend/src/features/editor/external-preview/__tests__/use-editor-post-message.test.tsx` — create. Cover schema rejection of `EDITOR_SET_AUTH`, `EDITOR_READY` on mount, allowed-origin gating, happy-path EDITOR_ADD_PREVIEW_ITEM response.
3. **[High]** `apps/frontend/src/features/editor/external-preview/__tests__/preview-source-api.test.ts` — create. Mock `fetch`; assert URL is `/editor/preview-source`, only `Content-Type` header, no `credentials`.
4. **[High]** `apps/frontend/src/features/editor/external-preview/__tests__/payload-intake.test.ts` — add `addPreviewItemToEditor` test pinning `resolvePreviewSource` argument count = 3.
5. **[Medium]** `packages/contract/src/iframe/from-parent/__tests__/helpers.test.ts` — create; resurrect `isParentToEditorMessage` / `parseParentToEditorMessage` cases from the deleted suite.
6. **[Medium]** `packages/contract/src/iframe/to-parent/__tests__/helpers.test.ts` — create; assert each positional arg of `createMediaSavedMessage` lands at the right key, plus shape tests for the other three factories.
7. **[Medium]** `apps/iframe-demo/src/app/pages/editor-page/editor-page.component.spec.ts` — create; assert no `EDITOR_SET_AUTH` is posted on `EDITOR_READY`.
8. **[Low]** `packages/contract/src/__tests__/exports.test.ts` — create; one-line `await import("@video-editor/contract/<subpath>")` per declared subpath.
