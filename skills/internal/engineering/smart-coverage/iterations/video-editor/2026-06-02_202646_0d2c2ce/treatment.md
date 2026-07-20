## Test Coverage Report

### Summary
- Files changed: 50 (after filtering)
- Public interfaces analyzed: 17 (behavior-changing); the other 33 are internal refactors (selection-store consolidation, type renames `EnvConfig` → `Api/Common/Worker`, threading `FfmpegRunner` through signatures)
- Gaps found: 12 (Critical: 1, High: 5, Medium: 4, Low: 2)

---

### 🔴 Critical

**`apps/server/src/infrastructure/ffmpeg/ffmpeg.utils.ts`**
- Missing: No test file for the new `FfmpegRunner` class (`run`, `runToStream`, `runToFile`). The process-global `ffmpegSemaphore` + free `runFfmpeg` were replaced by an injectable class — 6 distinct semaphore-release paths and 3 different signal/timeout/abort wirings now ship with zero coverage.
- Exit doors uncovered: 1 (return), 3 (FFmpeg spawn call shape), 5 (error paths: abort, timeout, non-zero exit, storage failure)
- Suggested tests (in a new `__tests__/ffmpeg-runner.test.ts`, stub `child_process.spawn` with an `EventEmitter`):
  - `describe('FfmpegRunner.run')` → `it('When third call arrives with maxConcurrent=2, Then it waits until one in-flight settles')`
  - `describe('FfmpegRunner.run')` → `it('When signal aborts before acquire, Then rejects "Render cancelled" and does not take a permit')`
  - `describe('FfmpegRunner.run')` → `it('When signal aborts after acquire but before spawn close, Then kills proc, rejects, releases permit')`
  - `describe('FfmpegRunner.run')` → `it('When timeoutMs elapses, Then SIGKILLs proc and rejects with "FFmpeg transcode timed out after Xs"')`
  - `describe('FfmpegRunner.run')` → `it('When ffmpeg exits non-zero, Then rejects with stderr tail in message')`
  - `describe('FfmpegRunner.run')` → `it('When ffmpeg exits non-zero with empty stderr, Then rejects with bare "exited with code N"')`
  - `describe('FfmpegRunner.runToStream')` → `it('When storage.uploadStream rejects, Then proc is killed and PassThrough destroyed')`
  - `describe('FfmpegRunner.runToStream')` → `it('When proc exits 0, Then PassThrough ends and uploadStream consumer resolves')`
  - `describe('FfmpegRunner.runToFile')` → `it('When signal aborts mid-run, Then SIGKILLs proc and rejects "Render cancelled"')`
  - `describe('FfmpegRunner concurrency')` → `it('When all 3 exit doors throw, Then permit is released (subsequent acquire succeeds immediately)')`

---

### 🟠 High

**`apps/server/src/config/env.ts`**

Gap 1 — Worker tolerates API-only env keys (Exit Door 1)
- `describe('parseWorkerEnv')` → `it('When CORE_BASE_URL is missing, Then it parses successfully (worker does not need it)')`
- `describe('parseWorkerEnv')` → `it('When PREVIEW_SIGNING_SECRET is "garbage", Then unknown key is stripped and parse succeeds')` — locks in `.strip()` default; guards against future `.strict()` regression that would break worker pod boot

Gap 2 — API enforces required + min-length (Exit Door 1, 5)
- `describe('parseApiEnv')` → `it('When PREVIEW_SIGNING_SECRET is < 32 chars, Then throws Error containing "PREVIEW_SIGNING_SECRET"')`
- `describe('parseApiEnv')` → `it('When CORE_BASE_URL is missing, Then throws "Invalid environment configuration (API)" prefix')`
- `describe('parseWorkerEnv')` → `it('When RABBITMQ_URL is missing, Then throws "Invalid environment configuration (Worker)" prefix')`

Gap 3 — Numeric coercion preserved
- `describe('parseApiEnv')` → `it('When FFMPEG_MAX_CONCURRENT="4", Then parsed as number 4')`

---

**`apps/frontend/src/features/editor/download-progress-modal.tsx`**

Gap 1 — Abort on unmount (Exit Door 5)
- `describe('<DownloadProgressModal>')` → `it('When unmounted while /users/me in-flight, Then setDisplayName is not called after')`
- `describe('<DownloadProgressModal>')` → `it('When unmounted while /media/clip/managed-virtual-channels in-flight, Then setChannels / setChannelsLoading are not called after')`

Gap 2 — Non-abort error fallback (Exit Door 5)
- `describe('<DownloadProgressModal>')` → `it('When channels fetch rejects with non-AbortError and component is mounted, Then channels=[] and loading=false')`

Gap 3 — Modal reopen aborts prior (Exit Door 3)
- `describe('<DownloadProgressModal>')` → `it('When displayProgressModal toggles false→true while fetch in-flight, Then prior controller is aborted and new fetch issued')`

---

**`apps/frontend/src/features/editor/store/use-upload-store.ts`**

Gap 1 — `resetUploadStore` clears timeouts (Exit Door 2, 5)
- `describe('useUploadStore.resetUploadStore')` → `it('When called with active uploads holding removeTimeoutId, Then clearTimeout fires for each and arrays empty')` — use `vi.useFakeTimers()` and assert zombie removal never executes
- `describe('useUploadStore.resetUploadStore')` → `it('When called, Then files / pendingUploads / activeUploads all reset to []')`

Gap 2 — Persistence cap (Exit Door 2)
- `describe('useUploadStore partialize')` → `it('When state.uploads.length=60, Then persisted snapshot contains last 50 entries (slice direction correct)')` — covers off-by-one / `slice(0,50)` vs `slice(-50)` regressions

---

**`apps/frontend/src/features/editor/store/use-crop-store.ts`**

Gap 1 — Image error path (Exit Door 5)
- `describe('useCropStore.loadImage onerror')` → `it('When image fails to load and is still the current element, Then element=undefined and fileLoading=false')`
- `describe('useCropStore.loadImage onerror')` → `it('When image fails to load but a newer load already replaced element, Then state is not wiped')` — race-guard test for the `getState().element === image` check

Gap 2 — Video error path (Exit Door 5)
- `describe('useCropStore.loadVideo onerror')` → `it('When video fails to load and is still the current element, Then element=undefined and fileLoading=false')`
- `describe('useCropStore.loadVideo onerror')` → `it('When video fails to load after replacement, Then current element survives')`

---

**`apps/frontend/src/features/editor/state/reset-editor.ts`** (new file)

Gap 1 — Composes three resets (Exit Door 2)
- `describe('resetEditorForNewProject')` → `it('When called, Then audioDataManager.reset cleared items/dataBars/audioDatas/frameCache')`
- `describe('resetEditorForNewProject')` → `it('When called with rotations cached, Then captionRotationCache is empty')`
- `describe('resetEditorForNewProject')` → `it('When called with active uploads, Then useUploadStore.resetUploadStore is invoked')`

Gap 2 — Hooked into `clearProject` (Exit Door 3)
- `describe('clearProject')` → `it('When invoked, Then resetEditorForNewProject runs after dispatch')` — extend the existing `payload-intake.test.ts`; current `handle-parent-message.test.ts` mocks `clearProject` so this is currently uncovered

---

### 🟡 Medium

**`apps/frontend/src/features/editor/timeline/items/video.ts`**
- `describe('Video thumbnail loading')` → `it('When img.onerror fires, Then promise resolves (does not hang Promise.all) and URL.revokeObjectURL called')`

**`apps/frontend/src/features/editor/timeline/items/audio.ts`** + **`timeline/items/timeline.ts`** + **`timeline/timeline.tsx`**
- `describe('Audio.destroy')` → `it('When called, Then offscreenCanvas/offscreenCtx are null and barData/bars empty')`
- `describe('Timeline.purge')` → `it('When called with Audio + Video children, Then destroy() runs on both')`
- `describe('<Timeline> dynamic cleanup')` → `it('When trackItemIds drops an Audio id, Then that Audio.destroy is called')`

**`apps/frontend/src/features/editor/player/player.tsx`** + **`scene/interactions.tsx`**
- `describe('<Player>')` → `it('When unmounted, Then useEditorRefs.playerRef is null')`
- `describe('<SceneInteractions>')` → `it('When unmounted, Then useEditorRefs.sceneMoveableRef is null')`

**`apps/server/src/bootstrap/container.ts`**
- `describe('buildWorkerContainer')` → `it('When called with FFMPEG_MAX_CONCURRENT=3, Then a single FfmpegRunner with that limit is wired into FfmpegVideoProcessingAdapter')` — guards against the regression where a second `FfmpegRunner` accidentally doubles parallelism

---

### 🟢 Low

**`apps/frontend/src/features/editor/player/items/caption-animations.ts`**
- `describe('clearCaptionRotationCache')` → `it('When called with entries present, Then captionRotationCache.size===0')`

**`apps/frontend/src/features/editor/player/lib/audio-data.ts`**
- `describe('AudioDataManager.reset')` → `it('When called, Then items=[], dataBars=[], audioDatas={}, frameCache empty')`

---

### ✅ Already Covered
- `apps/frontend/src/features/editor/store/selectors.ts` — new `selectors.test.ts` covers exit 1 ✓
- `apps/server/src/bootstrap/system.ts` — existing `system.test.ts` covers start/stop ✓
- `apps/server/src/features/preview/adapters/inbound/http/preview.controller.ts` — type-only rename; existing controller tests still apply ✓
- `apps/server/src/features/preview/application/use-cases/GeneratePreviewUseCase.ts` — type-only rename ✓
- `apps/server/src/infrastructure/ffmpeg/ffmpeg-command.builder.ts` — type-only rename; existing test ✓

### ⏭️ Skipped (internal refactor — observable behavior unchanged if wiring correct; covered transitively by component renders if any)
- `control-item/control-item.tsx`, `editor.tsx`, `timeline/header.tsx` — import-only / inline-hook switch
- `hooks/use-keyboard-shortcuts.ts`, `use-state-manager-events.ts`, `use-timeline-events.ts`, `use-update-ansestors.tsx` — selection store consolidation (read site swap)
- `store/use-composition-store.ts`, `store/use-editor-refs.ts` — added field / widened setter type; trivial
- `FfmpegVideoProcessor.ts`, `FfmpegVideoProcessingAdapter.ts`, `overlays/*.ts`, `source-processors/*.ts` — signature threading of `FfmpegRunner` only; behavior unchanged
- `bootstrap/server.ts`, `bootstrap/system.ts`, `bootstrap/worker.ts`, `index.ts`, `worker.ts` — bootstrap glue (type renames + `parseEnv` → `parseApiEnv`/`parseWorkerEnv`)
- `apps/server/CLAUDE.md`, `apps/server/README.md`, `deploy/worker/configmap.yaml` — docs / config

---

### Remediation Plan

Ordered by priority. Write these tests to close all gaps:

1. **[Critical]** `apps/server/src/infrastructure/ffmpeg/__tests__/ffmpeg-runner.test.ts` — create file; stub `child_process.spawn` and cover the 10 tests under FfmpegRunner above (concurrency, abort-before/after-acquire, timeout, stderr formatting, runToStream cleanup on storage failure).
2. **[High]** `apps/server/src/config/__tests__/env.test.ts` — create file; cover `parseApiEnv` / `parseWorkerEnv` required-keys, min-length, unknown-key-strip, numeric coercion, error prefix.
3. **[High]** `apps/frontend/src/features/editor/__tests__/download-progress-modal.test.tsx` — create file; use `@testing-library/react` + a `fetchCore` mock that returns a never-resolving promise to assert abort-on-unmount.
4. **[High]** `apps/frontend/src/features/editor/store/__tests__/use-upload-store.test.ts` — create file; cover `resetUploadStore` (timeout cleanup) and `partialize` slice (last-50 ordering) with `vi.useFakeTimers()`.
5. **[High]** `apps/frontend/src/features/editor/store/__tests__/use-crop-store.test.ts` — create file; cover `loadImage`/`loadVideo` `onerror` happy + race-guard cases.
6. **[High]** `apps/frontend/src/features/editor/state/__tests__/reset-editor.test.ts` — create file; verify the three downstream resets fire. Also extend `external-preview/__tests__/payload-intake.test.ts` to spy on `resetEditorForNewProject` inside `clearProject`.
7. **[Medium]** `apps/frontend/src/features/editor/timeline/items/__tests__/video.test.ts` and `audio.test.ts` — create files; cover `Video.thumbnail onerror`, `Audio.destroy`, `Timeline.purge` Audio branch.
8. **[Medium]** `apps/frontend/src/features/editor/player/__tests__/player.test.tsx` and `scene/__tests__/interactions.test.tsx` — assert ref nulling on unmount.
9. **[Medium]** `apps/server/src/bootstrap/__tests__/container.test.ts` — create file; assert single `FfmpegRunner` instance + `FFMPEG_MAX_CONCURRENT` plumbed through.
10. **[Low]** `apps/frontend/src/features/editor/player/items/__tests__/caption-animations.test.ts` and `player/lib/__tests__/audio-data.test.ts` — one-liner reset assertions.
