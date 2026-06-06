# Missing-Tests Review

The diff has two distinct themes: (1) a server-side refactor that replaces a process-global `ffmpegSemaphore` + free-function `runFfmpeg` with an injectable `FfmpegRunner` and splits `EnvConfig` into `Common/Api/Worker`, and (2) a pile of frontend correctness fixes (selection-store merge, ref-store nulling, listener cleanup, project reset, image/video `onerror`, upload-store cap + reset, audio canvas destroy). The new tests added (`selectors.test.ts`, a tweak to existing tests for renamed types) cover only the smallest, lowest-risk slice. Most of the actual behavior change is untested.

Here's what I'd block on / flag in review, ranked.

---

## Critical — behavior shipped with no coverage

### 1. `FfmpegRunner` — concurrency, cancellation, timeout, error semantics
`apps/server/src/infrastructure/ffmpeg/ffmpeg.utils.ts`

This is now a class with three methods (`run`, `runToStream`, `runToFile`), each ~50 lines of `spawn` + signal/timeout/abort wiring. Previously these were free functions with a process-global semaphore. The only test for this file is `ffmpeg-command.builder.test.ts`, which doesn't touch the runner at all.

Things that absolutely need tests (using a fake spawn or `child_process` mock — there is no existing pattern for it in the repo, which is itself a smell):

- **Semaphore actually limits concurrency.** With `maxConcurrent: 2`, a third `run()` must wait until one of the first two settles. The semaphore is now per-instance — the regression risk is a future caller `new FfmpegRunner({ maxConcurrent: 1 })` in two places and silently doubling parallelism. A test that resolves the third call only after the first finishes would lock this in.
- **Semaphore is released on every exit path.** Success, non-zero exit, `proc.on('error')`, abort-before-spawn, abort-after-spawn-before-close, timeout. The diff has six early-`release()` sites; one regression here leaks a permit forever and eventually deadlocks the worker.
- **Pre-acquire abort.** `if (signal?.aborted) throw` before `acquire()` — needs a test that aborts before calling, confirms no permit is taken.
- **Post-acquire pre-spawn abort.** Aborting between `await acquire()` and `spawn` releases and throws "Render cancelled". Easy to break in a refactor.
- **Timeout fires SIGKILL and rejects with the formatted message.** Only `run()` has the timeout branch; `runToStream` and `runToFile` do not — that asymmetry should be documented in a test (or fixed).
- **`runToStream` cleans up on storage failure.** The `try { proc.kill() } catch {}` + `pass.destroy()` path on upload error is exactly the kind of thing that silently breaks. Need a test where `storage.uploadStream` rejects and we verify the process is killed and the semaphore released.
- **`runToStream` does not double-end the PassThrough.** On the success path the diff calls `pass.end()` inside the promise *and* `storage.uploadStream(pass, …)` consumes it. Worth a green-path test.
- **Stderr tail truncation at 32768 bytes** is duplicated in three methods. One test on `run()` is fine; the helper `makeStderrHandler` is the natural unit.

### 2. `parseApiEnv` / `parseWorkerEnv` split
`apps/server/src/config/env.ts`

There is currently no test file for `env.ts` at all. The split is the load-bearing change in this diff — it lets the worker pod boot with a shared Secret that contains API-only vars (`CORE_BASE_URL`, `PREVIEW_SIGNING_SECRET`, etc.) without exploding. That's the entire premise stated in the updated `CLAUDE.md` ("Unknown env keys are silently stripped"). Untested.

Needed:
- `parseWorkerEnv` succeeds when only worker+common vars are set, even if API-only vars are *missing*. (The old `parseEnv` would have thrown.)
- `parseWorkerEnv` succeeds when API-only vars are *present but garbage* (e.g. `CORE_BASE_URL=not-a-url`) — Zod's default `.strip()` should drop them. If `.strict()` ever gets added by mistake, this catches it.
- `parseApiEnv` still requires `CORE_BASE_URL`, `PREVIEW_SIGNING_SECRET` (min 32), `SERVER_BASE_URL`, `S3_BUCKET`, `RABBITMQ_URL`, etc.
- `parseApiEnv` rejects `PREVIEW_SIGNING_SECRET` shorter than 32 chars with a clear error containing the field name (the `formatIssues` helper).
- Numeric coercion still works for the common fields (`FFMPEG_MAX_CONCURRENT`, `COMMAND_PUBLISH_CONFIRM_TIMEOUT_MS`).
- Both parsers throw an `Error` whose message starts with `Invalid environment configuration (API)` / `(Worker)` — the prefix is user-visible in k8s logs.

Also: the worker `configmap.yaml` had `UPLOAD_MAX_SIZE_BYTES`, `CORE_BASE_URL`, etc. removed. There is no integration test that boots the worker with the new configmap shape. At minimum, `parseWorkerEnv()` should be exercised against a fixture env that mirrors `deploy/worker/configmap.yaml`.

### 3. Container wiring — `FfmpegRunner` is constructed once per worker
`apps/server/src/bootstrap/container.ts`

`buildWorkerContainer` now news up `FfmpegRunner({ maxConcurrent: config.FFMPEG_MAX_CONCURRENT })` and threads it through `FfmpegVideoProcessingAdapter`. There is no test that:
- Verifies a single `FfmpegRunner` instance is shared across all downstream calls inside one render (the whole point — semaphore is per-instance now, so two runners would double the parallelism).
- Verifies `buildApiContainer` does *not* construct an `FfmpegRunner` (API has no video processing). Currently it doesn't, but nothing prevents a future change from doing so.
- Verifies `config.FFMPEG_MAX_CONCURRENT` is actually wired through (not the old `process.env.FFMPEG_MAX_CONCURRENT` read that used to live in `ffmpeg.utils.ts`).

`apps/server/src/bootstrap/__tests__/system.test.ts` only changed the type import; there is no analogous `buildWorkerContainer` test.

---

## High — frontend correctness changes with subtle failure modes

### 4. `download-progress-modal.tsx` — AbortController on unmount
The new `useEffect` creates a controller, passes `signal` to both `fetchCore` calls, and aborts on cleanup. The catch blocks now branch on `err?.name !== "AbortError"`. Untested.

What can regress:
- Unmount during the in-flight `/users/me` does not call `setDisplayName` (would cause a React warning / leak).
- Unmount during in-flight `/media/clip/managed-virtual-channels` does not call `setChannels([])` or `setChannelsLoading(false)`.
- Non-abort errors on the channels call still result in `setChannels([])` and `setChannelsLoading(false)` (the original behavior).
- Re-opening the modal (`displayProgressModal` flips true → false → true) aborts the prior in-flight request and starts a new one with a fresh controller.

There's also a dead branch I'd flag in the review: the `/users/me` catch comments "swallow non-abort errors as before" but does nothing — that's fine, but the explicit `if` is misleading. Leave it as `.catch(() => {})` or write the test that proves the intended behavior.

### 5. Selection store consolidation — observable equivalence
The whole `useSelectionStore` → `useCompositionStore.activeIds` migration touches 7 files. The new `selectors.test.ts` covers the pure selector but not the integration:

- `routeStateUpdate` in `use-state-manager-events.ts` now routes `activeIds` into `useCompositionStore`. Test: feed a patch with `{ activeIds, tracks, scale }` and assert all three stores get the right keys (and `activeIds` does *not* land in timeline-view).
- `useTimelineEvents` writes `activeIds` to `useCompositionStore` on `LAYER_SELECTION`. Same for `SceneInteractions.subscribeToActiveIds`. Both untested — easy to write as a unit by dispatching a fake event and reading the store.
- Subscribers that previously listened to `useSelectionStore` (header, interactions, keyboard shortcuts, useUpdateAnsestors) should re-render when `activeIds` changes via the composition store. A "selecting an item enables the Delete/Split/Clone buttons" test on `Header` would catch a missed migration.

### 6. `resetEditorForNewProject` — composition of three resets
New file, no test. It's a three-liner but it's the only place that orchestrates audio + caption-rotation + upload-store resets. A regression here means a stale waveform or persisted rotation on the next project load.

- Call it and verify `audioDataManager.reset()` clears `items/dataBars/audioDatas/frameCache`.
- Call it and verify `captionRotationCache.clear()` ran.
- Call it and verify `useUploadStore` state goes back to `{ files: [], pendingUploads: [], activeUploads: [] }` and that any active `removeTimeoutId` is cleared.
- Test that `clearProject(stateManager)` in `payload-intake.ts` invokes the reset (existing payload-intake tests don't cover the new `resetEditorForNewProject()` call appended at the end of `clearProject`).

### 7. `useUploadStore.resetUploadStore` — timeout cleanup + persistence cap
- `resetUploadStore` must clear every `removeTimeoutId` in `activeUploads` (otherwise zombie timeouts fire on a reset store and call `removeUpload` for ids that no longer exist). Test with `vi.useFakeTimers()`.
- `partialize` now slices to `MAX_PERSISTED_UPLOADS = 50`. Test: seed 60 uploads, snapshot `partialize(state)`, assert length 50 and that it's the *last* 50 (not the first). Off-by-one and slice-direction bugs here are silent data loss.

### 8. `use-crop-store` — image/video `onerror` paths
Both `loadImage` and `loadVideo` now have `onerror` handlers that dispose the element and conditionally reset `element`/`fileLoading`. The "only reset if the element is still the current one" check is the interesting bit — a race where a new load started before the old one errored must not wipe the new element.

- `onerror` after a normal load (current element matches) → `element: undefined, fileLoading: false`.
- `onerror` after the user loaded a *different* file in the meantime (current element differs) → state untouched.
- `disposeMediaElement` is called in both branches (resource leak guard).

### 9. `Audio.destroy()` + `Timeline.purge()` + dynamic destroy on trackItemIds change
Three coordinated changes:
- `Audio.destroy()` nulls offscreen canvas + ctx, clears barData/bars.
- `Timeline.purge()` now also calls `destroy()` on `Audio` instances.
- `timeline.tsx` dynamic-cleanup `useEffect` now destroys `Audio` (not just `Video`) objects whose ids aren't in `trackItemIds`.

Tests should at minimum confirm the dynamic cleanup: render a timeline with an Audio object whose id is removed from `trackItemIds`, assert `destroy` was called, assert the offscreen canvas reference is nulled.

### 10. `Video.onerror` in thumbnail loading
`apps/frontend/src/features/editor/timeline/items/video.ts` adds `img.onerror` that revokes the object URL and resolves. Without this, a corrupt thumbnail blob would leak the URL and the surrounding `Promise.all` would hang forever. Worth a single test that simulates a thumbnail load failure and verifies (a) the promise resolves rather than rejects, (b) `URL.revokeObjectURL` was called.

### 11. Editor refs — nulling on unmount
`use-editor-refs` widened both setters to accept `null`. `Player` and `SceneInteractions` now return cleanup functions that set the ref to `null`. Before, a stale `playerRef` survived unmount and could be dereferenced by `useKeyboardShortcuts` / `useUpdateAnsestors` after the player was gone.

Worth a test that mounts/unmounts `Player` and asserts `useEditorRefs.getState().playerRef === null` after unmount.

---

## Medium — worth a line in review, lower bug-density

### 12. `caption-animations.clearCaptionRotationCache`
Trivial wrapper. One test (populate, clear, assert size 0) is enough — mostly to lock in that the cache is the *exported* `captionRotationCache` and not a shadowed local.

### 13. `audioDataManager.reset()`
Same — trivial, but the failure mode (forgot one field) is exactly what tests are for. Reset and assert each of the four fields is empty.

### 14. `Timeline.purge` Audio branch
Could share a test with #9.

---

## What I would *not* block on

- Pure type renames (`EnvConfig` → `ApiEnvConfig` / `CommonEnvConfig`) in test fixtures and adapter constructors. Compile-time covers it.
- `useActiveItem` / `useHasSelection` exports — `useActiveItem` is just `useCompositionStore(selectActiveItem)` and the selector is already tested. `useHasSelection` is an inline arrow; not worth a dedicated test, though a `Header` integration test (#5) would exercise it transitively.

---

## Two things I'd push back on beyond missing tests

1. **`runToStream` / `runToFile` have no timeout parameter.** Only `run()` supports `timeoutMs`. The old `runCommandToFile` also had no timeout, so behavior is preserved — but worth a comment in the code or a deliberate decision, because the long-form encode paths are exactly where you'd want one.
2. **`console.log("[ffmpeg]", ffmpegPath, fullArgs.join(" "))` in `runToStream` and `runToFile`.** `run()` uses `Logger.logInfo` with a `firstArg` field; the other two methods log full arg arrays as plain `console.log`. Inconsistent with the rest of the codebase and bypasses structured logging. Easy fix while you're in here.

---

## Suggested test files to add (paths)

- `apps/server/src/infrastructure/ffmpeg/__tests__/ffmpeg-runner.test.ts` — covers #1
- `apps/server/src/config/__tests__/env.test.ts` — covers #2
- `apps/server/src/bootstrap/__tests__/container.test.ts` — covers #3
- `apps/frontend/src/features/editor/__tests__/download-progress-modal.test.tsx` — covers #4
- `apps/frontend/src/features/editor/hooks/__tests__/use-state-manager-events.test.ts` — covers #5
- `apps/frontend/src/features/editor/state/__tests__/reset-editor.test.ts` — covers #6
- `apps/frontend/src/features/editor/store/__tests__/use-upload-store.test.ts` — covers #7
- `apps/frontend/src/features/editor/store/__tests__/use-crop-store.test.ts` — covers #8
- `apps/frontend/src/features/editor/timeline/items/__tests__/audio.test.ts` and `video.test.ts` — covers #9, #10
- `apps/frontend/src/features/editor/player/__tests__/player.test.tsx` — covers #11

The two highest-ROI ones are the `FfmpegRunner` tests (#1) and the `env.ts` tests (#2). Those are the changes most likely to cause a production incident if they regress, and both are uncovered today.
