Review of baseline

  Depth wins. Catches three real production bugs treatment missed — all confirmed against actual source at
  apps/server/src/infrastructure/messaging/RabbitMQPublisher.ts:

  - #7 publish-during-reconnect. ensureChannel() line 106 only checks if (this.channel). reconnecting flag read nowhere
  outside startReconnectLoop. Caller hits publishExportCompleted mid-reconnect-sleep → second parallel connect(url) +
  createConfirmChannel. Reconnect loop's later success overwrites this.connection/this.channel. First handle orphaned. Real
  leak.
  - #8 drain-during-retry. Between retry attempts (line 254 sleep), inflight map empty — failed confirm deleted entry
  line 204. drain(5_000) returns immediately on inflight.size === 0. close() runs, sets closed=true, nulls channel. Sleep
  ends, publishOnce calls ensureChannel() — never checks this.closed — opens new connection during shutdown. Correctness +
  leak.
  - #13 concurrent first-connect. ensureChannel() not idempotent. Two callers both see null, both await connect(url), both
  createConfirmChannel. Last write wins. First handle unreachable but open. Leak.

  Also genuine catches: #19 (httpUrl regex accepts http:// empty host), #23 (extract-saved-items round-trip vs schema),
  #24/#28 (createMediaSavedMessage 8 positional args = transposition risk).

  Weaknesses: 29 items, redundant pairs (#3/#4 inverse of same branch), one self-correction shipped (#22 "claim turned out
  incorrect"), noise items (#29 formatting), no "Already Covered" section so reviewer has to derive baseline from negative
  space.

  Rating: 6/10. Right brain, wrong filter.

  Review of treatment

  Discipline wins. 49 → 15 filter, explicit "Already Covered" + "Skipped" sections, remediation plan with test counts per
  file. Catches one bigger gap baseline missed: GET /render + DELETE /render = zero tests. Baseline buried this inside #14
  fixated on field rename; treatment flags the endpoints whole.

  Per-invocation gap analysis is sharp: nack confirm path (Exit Door 5), channel reset on non-Unrouted retry (Exit Door 3+5),
  POST/GET/DELETE 400/404 paths. All correctly mapped.

  Blind spot is systemic, not random:

  - Skill description: "Black-box only."
  - 5 Exit Doors enumerate per-invocation output channels — response, new state, external call, MQ event, observability. None
  model interleavings.
  - File classification table maps "Infrastructure adapter → exits 3, 4." Nothing flags long-lived private channel, private 
  inflight: Map, private reconnecting, setTimeout-driven loops, or event listeners that mutate state.

  Result: treatment correctly executed instructions; instructions were incomplete for stateful async adapters. Missed bugs
  #7/#8/#13 are exactly the bugs whose existence requires modeling concurrent invocation + cross-method interleaving — outside
   the framework.

  Rating: 8/10 with current scope. Upgradable.

  Overall — what should change in the skill?

  Three additive changes. Preserve filter, exit-door framework, "Already Covered"/"Skipped" sections, remediation plan.

  A. Add Exit Door 6 in references/testing-principles.md

  6. Temporal/Concurrency Edges — for objects holding mutable state across async
     boundaries: concurrent invocation produces consistent final state; no orphaned
     resources; lifecycle methods (connect/close/drain/reconnect/retry) compose
     safely under interleaving; observers do not misread transient empty state
     mid-operation.

     Black-box pattern: drive N concurrent calls against the public method, assert
     observable final state (no leaked handles, single resource per logical entity,
     in-flight tracker empty after drain()). Real fakes only (in-process AMQP
     double, vi.useFakeTimers()).

  Refine classification table:

  | Stateful async adapter (publisher, subscriber,    | 3, 4, 6 | Lifecycle → E6 mandatory |
  |   connection pool, retry/reconnect state machine) |         |                          |
  | Stateless infra adapter (S3 wrapper, FFmpeg       | 3, 4    | No long-lived state      |
  |   spawn helper)                                   |         |                          |

  B. Insert Phase 2.5 in SKILL.md between Classify and Check Coverage

  ## Phase 2.5: Concurrency Triage

  For each file classified adapter or use-case, single grep:

    private\s+\w+\s*:\s*(\w+\s*\|\s*null|Map|Set|Promise|.*Channel.*|.*Connection.*)
    setTimeout|setInterval|sleep\s*\(
    \.on\(['"](?:error|close|return)['"]
    async\s+(connect|close|drain|reconnect|retry|shutdown)

  ≥ 2 categories hit → mark stateful-async → Exit Door 6 mandatory →
  enumerate interleaving matrix:

    M1 Concurrent invocation: same method × N callers → final state consistent?
    M2 Lifecycle interleaving: every public method × every other → which pairs
       share mutable state? List unsafe pairs.
    M3 Empty-tracker misread: any observer (drain/size/has) reads a collection
       transiently empty mid-operation?
    M4 Listener-after-close: any .on('close'|'error'|'return') mutates state
       close() also touches? Order not guaranteed.

  One test per unsafe pair / unsafe row under Exit Door 6.

  C. Phase 4 priority bumps

  🟠 High: Stateful-async file missing any M1–M4 test
  🔴 Critical: Stateful-async file where close/drain/reconnect share mutable state with publish AND zero E6 tests

  What hardened skill produces for RabbitMQPublisher.ts

  All four trigger categories fire (private channel | null, private inflight: Map, setTimeout in sleep,
  .on('error'|'close'|'return'), methods connect/close/drain/startReconnectLoop). Marked stateful-async. Matrix output:

  - M1 concurrent connect() → bug #13. Test: Promise.all([pub.connect(), pub.connect()]), assert one underlying connect(url).
  - M2 publish × reconnect → bug #7. Test: force 'close' on connection, immediately publishExportCompleted, assert single live
   connection.
  - M2 drain × retry-sleep → bug #8. Test: stub broker to nack attempt 1, call drain during 100ms sleep, assert drain awaits
  retry OR close rejects further ensureChannel.
  - M4 'close' listener after close() → verify existing this.closed guard holds.

  Exactly the three baseline misses, now surfaced deterministically.