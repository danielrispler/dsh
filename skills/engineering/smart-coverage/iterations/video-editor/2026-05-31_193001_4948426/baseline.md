# Code Review: Missing Test Coverage

Overall this is a substantial, well-scoped refactor — the iframe/events contract package split is well-tested at the schema level, and there's solid new integration coverage for the RabbitMQ publisher. The gaps cluster around the **publisher's state machine** (retry / reconnect / drain edges), **System lifecycle wiring**, and **process signal handling**. A few schema rules also slipped through without tests.

## Critical (would let a real bug through)

### 1. `publishOnce` confirm callback — broker-nack path
**File:** `apps/server/src/infrastructure/messaging/RabbitMQPublisher.ts` (~line 2538 in diff)

`ch.publish(..., (err) => { ... settle(err...) })` is the publisher-confirm callback. The only retry path you actually exercise via integration is the *unrouted-return* path (`UnroutedError`). There is no test where the broker **nacks** a confirm — i.e. the callback receives an `Error`. That branch:

```ts
ch.publish(EXCHANGE_NAME, ..., (err) => {
  if (!this.inflight.has(messageId)) return;
  this.inflight.delete(messageId);
  if (err) settle(err instanceof Error ? err : new Error(String(err)));
  else settle();
});
```

is the *primary* delivery-guarantee mechanism advertised in `apps/server/CLAUDE.md` ("Broker-nack ... = failure"). Untested. Add a test that simulates a nacked publish (e.g. publish to an exchange with a queue full + `x-overflow: reject-publish`, or unit-test the class directly with an injected channel) and assert: retry → eventual `logAborting`.

### 2. `publishOnce` race between `return` event and confirm callback
The `return` handler does `this.inflight.delete(id)` and the confirm callback does `if (!this.inflight.has(messageId)) return`. The intent is "return wins, confirm becomes a no-op." That ordering is **not** tested. Worth one test: assert that when `mandatory: true` returns the message (no binding), `settle` is called exactly once with `UnroutedError`, and the eventual confirm callback does not double-settle (the existing test asserts retry count = 2 retries + abort, but doesn't directly assert no spurious resolve). Easy way to assert: track resolve/reject calls explicitly.

### 3. Channel reset on transient error during retry
```ts
if (!(lastError instanceof UnroutedError)) {
  try { await this.channel?.close(); } catch {}
  this.channel = null;
}
```
This branch fires for any non-`UnroutedError` (channel closed, network error, JSON oversize, etc.). The "channel is recreated on next attempt" behavior is unverified. There is no test that:
- a transient channel failure on attempt 1 triggers `channel = null`,
- attempt 2 succeeds after re-establishing the channel,
- monitor sees `started → retry → success` (not `aborting`).

This is the **happy retry path** and it is completely uncovered. The current retry test only exercises `UnroutedError` (which deliberately does *not* reset the channel). One injected test or a `connection.close()` mid-publish test would close this gap.

### 4. `publishWithRetry` — `UnroutedError` does *not* reset the channel
Same code branch, the inverse assertion. Document that `UnroutedError` keeps reusing the same channel across all 3 attempts. Not covered. Matters because if `assertExchange` ever failed or the channel needed a refresh, this code path would loop on a stale channel.

### 5. `connect()` is called only once at startup — second call is a no-op?
`connect()` just calls `ensureChannel()`. If a caller invokes `connect()` after the publisher has been closed (`this.closed = true`), `ensureChannel` will still try to open a new connection and *succeed*, leaving the publisher in an inconsistent state (closed flag set, but channel open, reconnect loop disabled). Either guard or test. At minimum, an idempotency test for `connect()` and a test for "connect-after-close should reject or be a no-op."

### 6. Reconnect loop: backoff progression + cap
The reconnect test only asserts "started + success" once. The interesting behavior is **multiple retries with increasing backoff** capped at 30s. With a broker reachable, the loop never retries. With an unreachable broker, it retries forever. There's no test asserting:
- Backoff sequence: `1s, 2s, 5s, 10s, 30s, 30s, …`
- Multiple `logRetry` events with the correct error before eventual success.
- Loop terminates on `close()` mid-backoff (the current "close during reconnect" test waits 200ms then 300ms, then asserts no new events — that's checking *quiescence*, not that an in-flight `sleep(delay)` was actually interrupted; with `delay >= 1000ms` the test passes trivially without proving anything).

Use a fake `sleep` / fake timers, or briefly stop+restart the container and assert retry events.

### 7. Publish during a reconnect window
If the connection is lost, `channel = null`, reconnect loop is running. What happens if `publishExportCompleted` is invoked right now? `ensureChannel()` will race to open a fresh connection in parallel with `startReconnectLoop`. There's no test for this; no synchronization in the code. At a minimum, a test that asserts "publish-while-disconnected eventually succeeds without double-connecting" — and exposes if it doesn't.

### 8. `drain()` while a publish is in retry
The drain test injects a fake `inflight` entry — fine. But the real-world case is: caller awaits `system.stop()` → `drain(5000)` → meanwhile a publish is mid-retry between `sleep(500)` and the next attempt. The retry isn't in `inflight` at that moment (no `messageId` is registered between attempts). `drain()` will return immediately, then the retry attempt fires on a closed channel → error → could leak. Not tested. This is the actual shutdown-correctness gap the CLAUDE.md doc is alluding to.

## High (real risk, not covered)

### 9. `RabbitMQPublisher.close()` interaction with reconnect loop
`close()` sets `this.closed = true` synchronously, then awaits `ch?.close()` / `conn?.close()`. The reconnect loop reads `this.closed` only between `await sleep(...)` and the next iteration. Test that:
- `close()` called *during* `ensureChannel()` inside the reconnect loop does not race-spawn a new connection.
- After `close()`, no further monitor events fire ever (current test asserts within 500ms only).

### 10. `System.start()` ordering and failure cleanup
`apps/server/src/bootstrap/system.ts` now does Redis → RabbitMQ → server. There's no test that:
- If `exportEventPublisher.connect()` throws, **Redis is still cleaned up** (or at least logged). Right now `start()` just throws and Redis is left connected — leak across restart loops.
- If `server.start()` throws, the publisher and Redis aren't left dangling.

Currently `System.stop()` is only called via signal handlers, never automatically on a failed `start()`. This is a startup-leak bug-class waiting to happen. A vitest with a fake publisher that throws on `connect()` would expose it.

### 11. `System.stop()` — drain timeout swallowed
The `try/catch` in `System.stop()` swallows drain/close failures and continues to `redis.quit()`. Test that:
- A failing `drain()` (e.g. throws synchronously) doesn't prevent `redis.quit()` from being called.
- The error is logged with the expected key.

### 12. SIGTERM/SIGINT handler in `src/index.ts`
None of the new shutdown code in `apps/server/src/index.ts` is tested:
- `shutdownInFlight` idempotency — multiple signals collapse to one shutdown.
- 15s hard-exit fallback fires when `system.stop()` hangs.
- `process.exit(0)` on success, `process.exit(1)` on failure.

These are hard to unit test, but at least the `shutdown` function logic should be extracted and tested directly (currently it lives inline so it isn't even importable).

### 13. `RabbitMQPublisher` — concurrent first connect
Two callers race `ensureChannel()` while `this.channel === null`. Both will call `connect(this.url)` and `createConfirmChannel`. The second resolves and overwrites `this.channel`, leaving an orphaned channel/connection. Not tested; would surface as resource leak under burst-publish on cold start.

### 14. Render controller — `selectedUnitChannelIds` propagation
The controller now spreads `body.saveMetadata` into the event including the renamed `selectedUnitChannelIds` and new `mediaId`. The existing test (`render.controller.test.ts:91-101`) only asserts `mediaName` and `exportType`. Add an assertion that `mediaId` and `selectedUnitChannelIds` are forwarded verbatim — this is the contract surface that just got renamed and is exactly the field most likely to silently break.

### 15. Render controller — `saveMetadata.items` are forwarded as-is
The controller types `items: SavedMediaItem[]` but the body is `req.body as StartRenderBody` — there is **no runtime validation**. If a consumer sends an invalid item shape, it gets published into RabbitMQ, validated against `exportStartedDataSchema` only inside the publisher (which would throw on `JSON.stringify(envelope)`? No — schema isn't validated on publish either). Currently the only guard is the consumer-side schema. Either:
- add a `savedMediaItemSchema.array().safeParse(...)` check in the controller and test the 400 path, or
- explicitly document that items are unvalidated and add a test asserting "garbage items pass through to the publisher" so future maintainers see the trade-off.

This is a contract-boundary gap.

## Medium

### 16. Schema rules with no test
- `recordingRangePayloadSchema` rejects `sourceOffsetMs > durationMs`, but **does not** reject `sourceOffsetMs > durationMs` on `audioRangePayloadSchema`. Wait — it does (line 1598-1604). It's tested for recording-range but **not** for audio-range. Add the audio-range mirror.
- `audioRangePayloadSchema` rejects non-hls/non-audio src — tested. Good.
- `mediaPayloadSchema` does not have an `endTimeMs > startTimeMs` rule because media doesn't have those fields — fine.
- `editorSetAuthMessageSchema` requires a non-empty `token` — **no test at all** for `EDITOR_SET_AUTH`. Add accept + reject (empty token, missing token).
- `editorPreviewItemAddedMessageSchema` requires non-empty `itemId` and optional non-empty `requestId` — `requestId: ""` should be rejected (it's `.trim().min(1).optional()`). Untested.

### 17. `envelopeSchema` strict-object behavior
`envelopeSchema` is `z.strictObject(...)`. There's no test for "extra top-level field is rejected" — which is the whole point of `strictObject`. One test would be cheap insurance against a future loosening.

### 18. `envelopeSchema` — `occurredAt` is just `z.string().min(1)`
No ISO-8601 validation, no datetime format check. The CLAUDE.md and README say "ISO-8601 UTC timestamp" but the schema accepts `"x"`. Either tighten to `z.string().datetime()` and add tests, or document the deliberate loose-validation. Right now consumers in other teams will validate stricter than producers — guaranteed to bite.

### 19. `exportCompletedDataSchema.url` — `httpUrl` regex
`/^https?:\/\//i.test(v)` accepts `"http://"` (empty host). And accepts `"https://a"` (no TLD). The intent of `httpUrl` is presumably stronger. Either use `z.url()` (zod has it) or add tests for the lax behavior so the contract is explicit. Worth a one-liner.

### 20. `MonitorFactory` — `extraInfo` is passed but never asserted
`publishWithRetry` passes `{ eventVersion }` as `extraInfo` to the factory. The `RecordingMonitorFactory` only records `extra` on `started`, but no test asserts that `extra.eventVersion` matches the published version. Trivial assertion, prevents silent drift.

### 21. `logInvalidInput` is in the `PublishMonitor` interface but **never called** anywhere in `RabbitMQPublisher`
Either it's dead (remove from interface), or there's a missing call site (e.g. when the data fails schema validation before publish — which currently isn't done). If dead, knip should flag it; if not, add the validation call site and a test.

### 22. `NullExportEventPublisher` — only `publishExportStarted` is tested
The test file only exercises `publishExportStarted`. `publishExportCompleted` and `publishExportFailed` are trivial but you renamed types — at minimum, smoke-call all three. (Low cost, high signal for the type rename.)

### 23. `extract-saved-items.ts` consumes `SavedMediaItem` from the new package path
The diff only shows the import-path change. There are no tests at all for `extract-saved-items.ts` in this diff. If there are existing tests, fine; if not, this is the function actually building the `items[]` array that's now schema-validated on the consumer side via `exportStartedDataSchema`. Any drift between this function's output and `savedMediaItemSchema` becomes a runtime rejection in another team's queue. Worth at least a round-trip test: feed a representative `trackItemsMap` through `extractSavedItems` and validate the result against `savedMediaItemSchema.array()`.

### 24. `createMediaSavedMessage` is exported but untested
The factory function in `helpers.ts` (`createMediaSavedMessage`) has no test. Other factories (`createPreviewItemAddedMessage`, etc.) have a shape-test. Add the symmetric one — easy to miss a field given the function has 8 positional args (which itself is a bit of a smell — see Low #28).

### 25. `RabbitMQPublisher` — `messageId` collision
`randomUUID()` collisions are theoretical, but the `return` handler keys by `messageId`. If a previously-deleted entry's confirm callback fires after a new entry was added with the same id, double-delete could mis-route. Untested. Could be addressed by an assertion test that `inflight` is empty after a publish completes successfully.

## Low

### 26. `pnpm test` for the contract package builds first
The new `packages/contract/package.json` runs `pnpm build && node --test dist/**/*.test.js`. If `tsconfig` strips test files (it doesn't currently — `include: ["src/**/*.ts"]` brings them in), the test won't run. Worth a smoke test in CI that confirms tests actually execute against the new layout (you'd see "no tests found" otherwise).

### 27. `EXCHANGE_NAME` constant divergence
The integration test imports `EXCHANGE_NAME` from `@video-editor/contract/events` and the consumer-side setup in `setupConsumer` uses it. Good. But there's no test that asserts `EXCHANGE_NAME === "video-editor"` (the public contract value). One line — prevents a silent breaking change to external consumers.

### 28. `createMediaSavedMessage` argument order
Eight positional booleans/strings — easy to swap `downloadToComputer` and `saveToPersonalChannel`. Not a test gap per se, but worth either converting to a single object parameter or adding a test that exercises a non-default combination (e.g. `downloadToComputer: false, saveToPersonalChannel: true`) to catch obvious transposition bugs.

### 29. Diff includes pure whitespace / formatting changes
`apps/frontend/src/features/editor/editor.tsx`, `scene/interactions.tsx` — Biome reflowed JSX. No behavior change, no tests needed. Mentioning so the reviewer knows these aren't candidates for new tests.

---

## Suggested priority order

1. **#1, #3** — publisher confirm-nack and channel reset on transient error. These are the documented behaviors with zero coverage and the highest blast radius (silent message loss).
2. **#10, #15** — startup/shutdown leaks and unvalidated controller input. Production-incident shape.
3. **#6, #7, #8, #13** — reconnect/drain/concurrency race conditions. Hard to reproduce in production, easy to write tests for once.
4. **#14, #23** — verify the renamed-field and saved-items contract end-to-end (round-trip frontend extractor → publisher schema).
5. **#18, #21** — schema tightening and dead-code question. Lowest cost, prevents future churn.
