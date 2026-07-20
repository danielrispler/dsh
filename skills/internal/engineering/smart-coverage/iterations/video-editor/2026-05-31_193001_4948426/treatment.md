## Test Coverage Report

### Summary
- Files changed: 49 raw → **15 analyzed** after filtering
- Public interfaces analyzed: 9 with non-trivial behavior (rest = barrels, type-only, formatting, or covered)
- Gaps found: **12** (Critical: 1, High: 5, Medium: 4, Low: 2)

---

### 🔴 Critical

**`apps/server/src/bootstrap/system.ts`**
- Missing: No test file exists. Wires Redis + RabbitMQ + HTTP server lifecycle — fail-fast on connect, drain on stop, error swallowing in stop.
- Exit doors uncovered: 1 (return / throws), 3 (calls to redis/publisher/server), 5 (error path)
- Suggested tests:
  - `describe('System.start')` → `it('When publisher.connect throws, Then start rejects and Redis is left in a known state')`
  - `describe('System.stop')` → `it('When drain rejects, Then stop continues to redis.quit and logs the error')`
  - `describe('System.stop')` → `it('When invoked happy path, Then order is server.stop → drain → publisher.close → redis.quit')`

---

### 🟠 High

**`apps/server/src/features/render/adapters/inbound/http/render.controller.ts`**

Gap 1 — `GET /render` has zero tests (Exit Door 1, 5)
- `describe('GET /render')` → `it('When id query param is missing, Then returns 400 with error message')`
- `describe('GET /render')` → `it('When job is unknown, Then returns 404 with "Job not found"')`
- `describe('GET /render')` → `it('When job exists, Then returns 200 with status/progress/url/presigned_url')`

Gap 2 — `DELETE /render` has zero tests (Exit Door 1, 5)
- `describe('DELETE /render')` → `it('When id query param is missing, Then returns 400')`
- `describe('DELETE /render')` → `it('When job has no AbortController and no state, Then returns 404')`
- `describe('DELETE /render')` → `it('When job is in-flight, Then aborts the controller and returns 204')`

Gap 3 — `POST /render` invalid-design 400 path (Exit Door 5)
- `describe('POST /render')` → `it('When design fails schema validation, Then returns 400 with path-prefixed message')`

Gap 4 — `publishExportStarted` payload shape (Exit Door 4)
- Existing test only asserts `mediaName` + `exportType`. `mediaId`, `selectedUnitChannelIds`, `items`, `downloadToComputer`, `saveToPersonalChannel` are forwarded but unverified — exactly the contract surface that just got renamed.
- `describe('POST /render with saveMetadata')` → `it('When called, Then publishExportStarted receives all SavedMediaPayload fields verbatim plus jobId+exportType')`

Gap 5 — Render COMPLETED persists state to RedisRenderJobStatePort (Exit Door 2)
- `describe('on COMPLETED')` → `it('Then renderJobStatePort.saveState is called with status COMPLETED, progress 100, and result.url')`

**`apps/server/src/infrastructure/messaging/RabbitMQPublisher.ts`**

Gap 1 — Confirm-callback failure path (Exit Door 5)
- The `ch.publish` confirm callback's `err` branch is the documented "broker-nack = failure" contract — only `UnroutedError` (return-event) is currently exercised.
- `describe('publishOnce — confirm nack')` → `it('When broker nacks the publish (queue overflow / reject-publish), Then publishWithRetry retries 3× and logAborting fires with PublishExhaustedError')`

Gap 2 — Channel reset on transient non-Unrouted error (Exit Door 3 + 5)
- The branch `if (!(lastError instanceof UnroutedError)) { channel.close(); channel = null; }` is uncovered. The "happy retry path" where attempt 1 fails on a closed channel, attempt 2 succeeds, is missing.
- `describe('publishWithRetry — channel reset')` → `it('When attempt 1 throws non-Unrouted, Then channel is recreated for attempt 2 and logSuccess fires')`

---

### 🟡 Medium

**`apps/server/src/index.ts`**
- Missing: signal-handler logic is inline — not importable, not unit-testable.
- Gap 1 — Idempotent shutdown + 15s hard-exit fallback (Exit Door 5)
  - Refactor `shutdown` into an exported function, then:
  - `describe('shutdown')` → `it('When called twice, Then system.stop runs once')`
  - `describe('shutdown')` → `it('When system.stop hangs, Then process.exit(1) fires after 15s')`

**`apps/server/src/infrastructure/messaging/RabbitMQPublisher.ts`**

Gap 1 — Reconnect backoff progression + cap (Exit Door 5)
- Existing test asserts only "started + success" once. Backoff sequence `1s/2s/5s/10s/30s` and `RECONNECT_BACKOFF_CAP_MS` are unverified. Multi-retry path uncovered.
- `describe('startReconnectLoop')` → `it('When broker unreachable for N attempts, Then logRetry fires N times with monotonically increasing delays capped at 30s')`

Gap 2 — Drain logs `amqp_publish_drained_unconfirmed` on timeout (Exit Door 5)
- Existing drain-timeout test asserts elapsed time, not that the messageId-warning is emitted.
- `describe('drain')` → `it('When unconfirmed entries remain at timeout, Then Logger.logWarning("amqp_publish_drained_unconfirmed", {messageId}) is emitted for each')`

**`packages/contract/src/iframe/schemas.ts`**

Gap 1 — `editorSetAuthMessageSchema` has zero tests (Exit Door 1)
- `describe('EDITOR_SET_AUTH')` → `it('When token is a non-empty string, Then schema accepts')`
- `describe('EDITOR_SET_AUTH')` → `it('When token is empty string, Then schema rejects')`
- `describe('EDITOR_SET_AUTH')` → `it('When token field is missing, Then schema rejects')`

---

### 🟢 Low

**`packages/contract/src/events/envelope.ts`**
- `envelopeSchema` uses `z.strictObject` — unknown-field-rejection is untested. `occurredAt` accepts any non-empty string (no ISO-8601 enforcement) — documented contract drifts from validation.
- `describe('envelopeSchema')` → `it('When body contains an extra top-level field, Then schema rejects')`
- `describe('envelopeSchema.occurredAt')` → `it('When occurredAt is "x" (non-ISO), Then schema accepts — documents current loose validation')`

**`packages/contract/src/iframe/helpers.ts`**
- `createMediaSavedMessage` (8 positional args) is exported but untested; sibling factories have shape-tests.
- `describe('createMediaSavedMessage')` → `it('When called with all args, Then returns EDITOR_MEDIA_SAVED with each field placed at its named key')`

---

### ✅ Already Covered

- `apps/server/src/infrastructure/messaging/RabbitMQPublisher.ts` — envelope shape, headers, retry-on-Unrouted, drain happy + timeout-elapsed, reconnect basic, connect fail-fast, swallow-on-exhaust ✓ (exits 1, 3, 4 substantially)
- `apps/server/src/infrastructure/messaging/NullExportEventPublisher.ts` — all 3 publish methods ✓
- `apps/server/src/features/render/adapters/inbound/http/render.controller.ts` — POST happy path, saveMetadata branch, COMPLETED publishExportCompleted, FAILED publishExportFailed, webp exportType ✓ (gaps listed above)
- `packages/contract/src/iframe/schemas.ts` — recording/media/audio-range schema rules, EDITOR_MEDIA_SAVED, helpers ✓ (except `EDITOR_SET_AUTH`)
- `packages/contract/src/events/export.ts` — envelope accept, missing/zero eventVersion reject, missing data.jobId reject, non-http url reject, empty error reject ✓
- `packages/contract/src/shared/saved-media.ts` — all 4 item variants + payload accept/reject ✓
- `apps/frontend/src/features/editor/external-preview/payload-intake.ts` — co-located test exists; diff is import-path-only ✓
- `apps/frontend/src/features/editor/utils/extract-saved-items.ts` — co-located test exists; diff is import-path-only ✓

### ⏭️ Skipped

- `CLAUDE.md`, `CONTEXT.md`, `apps/*/CLAUDE.md`, `packages/contract/CLAUDE.md`, `packages/contract/README.md`, `packages/contract/src/events/README.md` — markdown
- `*/package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `biome.json`, `knip.json` — config
- `*.test.ts`, `__tests__/createRecordingMonitorFactory.ts` — test files / helpers, not subjects
- `packages/editor-contract/*` — deleted (renamed to `packages/contract/`)
- `apps/frontend/src/features/editor/editor.tsx`, `scene/interactions.tsx` — Biome formatting reflow only, no behavioral change
- `apps/frontend/src/features/editor/external-preview/use-editor-post-message.ts`, `payload-intake.ts`, `utils/extract-saved-items.ts` — import-path-only changes (`@video-editor/iframe-contract` → `@video-editor/contract`)
- `packages/contract/src/iframe/{messages,payloads,mocks,helpers,schemas,index}.ts`, `src/index.ts`, `events/{mocks,index}.ts`, `iframe/index.ts` — renamed/barrel/type-only/fixture modules; semantics unchanged from previous package
- `apps/server/src/bootstrap/container.ts` — DI wiring; exercised through `system.ts` tests
- `apps/server/src/infrastructure/messaging/MonitorFactory.ts` — type-only interface
- `apps/server/src/infrastructure/messaging/createNoopMonitorFactory.ts` — trivial no-op factory (exits = none observable)

---

### Remediation Plan

Ordered by priority:

1. **[Critical]** Create `apps/server/src/bootstrap/__tests__/system.test.ts` — start-failure-cleanup, stop-drain-error-tolerance, shutdown-ordering (3 tests)
2. **[High]** Extend `apps/server/src/features/render/adapters/inbound/http/__tests__/render.controller.test.ts`:
   - Add `describe('GET /render')` block (3 tests: 400 / 404 / 200)
   - Add `describe('DELETE /render')` block (3 tests: 400 / 404 / 204+abort)
   - Add `it('POST /render rejects invalid design with 400')`
   - Add `it('POST /render forwards full SavedMediaPayload to publishExportStarted')`
   - Add `it('COMPLETED persists state via renderJobStatePort with status/progress/url')`
3. **[High]** Extend `apps/server/src/infrastructure/messaging/__tests__/RabbitMQPublisher.test.ts`:
   - Add nack-confirm-callback test (force broker-nack via overflow policy or testcontainer queue limit)
   - Add channel-reset-on-transient-error retry test
4. **[Medium]** Refactor `apps/server/src/index.ts` — extract `shutdown` to importable module; create `apps/server/src/__tests__/shutdown.test.ts` with idempotency + 15s-fallback tests (fake timers)
5. **[Medium]** Extend `RabbitMQPublisher.test.ts` with reconnect-backoff progression + drain-warning-emitted tests
6. **[Medium]** Extend `packages/contract/src/iframe/helpers.test.ts` with `EDITOR_SET_AUTH` accept/reject cases
7. **[Low]** Extend `packages/contract/src/events/export.test.ts` with envelope strictObject + occurredAt-loose-validation documentation tests
8. **[Low]** Extend `packages/contract/src/iframe/helpers.test.ts` with `createMediaSavedMessage` shape test
