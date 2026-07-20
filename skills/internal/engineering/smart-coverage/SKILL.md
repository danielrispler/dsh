---
name: smart-coverage
description: >
  Analyze test coverage gaps after code changes. Use when asked about missing tests,
  coverage check, "what should I test", or after implementing/fixing something.
  Git diff → language detection → affected public interfaces → critical/high/medium/low gap report + remediation plan.
  Black-box only.
---

# Smart Coverage Analysis

Black-box test coverage analyst. Detect behavioral gaps in test coverage for changed code. Do not run tests, read coverage reports, or suggest implementation details.

**Core rules** (active throughout):
- Black-box only — assert via public interface (return values, HTTP responses, emitted events, persisted state).
- Test names: `When [condition], Then [outcome]`.
- Focus on what changed — do not report gaps for unchanged files.
- Language syntax comes from the loaded reference — never mix.

Load `references/testing-principles.md` once.

---

## Phase 0: Detect

Run:
```bash
bash .claude/skills/smart-coverage/scripts/detect-langs.sh
```
(Add `--target <branch>` if user named a branch.)

Output JSON: `{files: {path: lang}, frameworks: [...], playwright: bool, existing_tests: {source_path: [test_path,...]}}`.

For each unique `lang`: load `references/<lang>.md`. Supported: `typescript`, `golang`. Framework overlays: `react`, `angular`, `playwright`. If `lang=fallback`: use only `testing-principles.md`; emit generic AAA pseudo-code.

For each entry in `frameworks[]`: load `references/<framework>.md` as additive overlay (overrides base only for sections it defines).
If `playwright=true`: load `references/playwright.md`.

**Polyglot:** if `files{}` spans more than one language, process each language group end-to-end separately and emit a `## [Language]` section per group in Phase 5.

---

## Phase 1: Working Set

Use `files{}` from Phase 0. Drop entries where exit doors = None per the loaded reference's FILE_CLASSIFICATION / SKIP_PATTERNS (lock files, config, env, markdown, build artifacts, type-only files, test files themselves).

---

## Phase 2: Classify

For each file in the working set, name its type (from FILE_CLASSIFICATION) and its applicable exit doors. One line per file is enough — no table required unless ≥3 files.

---

## Phase 2.5: Concurrency Triage

For each file classified adapter or use-case, single grep over the source for:

```
private\s+\w+\s*:\s*(\w+\s*\|\s*null|Map|Set|Promise|.*Channel.*|.*Connection.*)
setTimeout|setInterval|sleep\s*\(
\.on\(['"](?:error|close|return)['"]
async\s+(connect|close|drain|reconnect|retry|shutdown)
```

≥ 2 categories hit → mark **stateful-async** → Exit Door 6 mandatory → enumerate interleaving matrix:

- **M1 Concurrent invocation:** same method × N callers → final state consistent?
- **M2 Lifecycle interleaving:** every public method × every other → which pairs share mutable state? List unsafe pairs.
- **M3 Empty-tracker misread:** any observer (`drain`/`size`/`has`) reads a collection transiently empty mid-operation?
- **M4 Listener-after-close:** any `.on('close'|'error'|'return')` mutates state `close()` also touches? Order not guaranteed.

One test per unsafe pair / unsafe row under Exit Door 6.

---

## Phase 3: Existing Coverage

For each classified file:
1. Locate tests via `existing_tests{}` (authoritative). Supplement with TEST_PATTERN if missing.
2. Read those test files.
3. Mark each applicable exit door as covered or missing.
4. Record `{test_name → asserted_exit_door}` for every existing test — carried into Phase 3.5.

Do NOT scan parent/sibling directories speculatively. Only read what `existing_tests{}` returns + TEST_PATTERN fallback for unmapped sources.

---

## Phase 3.5: Redundancy

Using the test list from Phase 3, scan for these four patterns. **Scope: only evaluate tests that exercise code in the current diff** — do not flag redundancy among tests for unchanged code. Flag for **human review only — never auto-delete**.

| Tag | Trigger | Output reason |
|---|---|---|
| `[DUPLICATE]` | 2+ tests assert same exit door on same input class | `subsumed by <other test>` |
| `[SUBSET]` | Test A's assertions are a strict subset of Test B's | `strict subset of <test>` |
| `[DEAD]` | Test references a symbol the diff removed/renamed | `<symbol> removed` or `renamed to <new>` |
| `[LOW SIGNAL]` | Test only asserts framework invariants (e.g. `toHaveBeenCalledTimes(1)`, "did not throw") with no exit-door assertion | `asserts framework invariant, not exit door` |

**Not redundancy:** different exit doors of same function; different input classes (happy / boundary / error); unit + integration covering same path on purpose; tests asserting different response fields; negative+positive pairs. When in doubt: keep.

Output one bullet per redundant test under `### 🔁 Redundant Tests` in Phase 5. Always phrase as "Human review: consider removing/merging" — never `rm` or auto-delete.

---

## Phase 4: Gap Analysis

### 4a. Bug & Seam Surface (depth pass — do this first)

**Coverage-migration precondition** — before applying any "coverage matches pre-move state" skip, verify with a single check:

```bash
git grep -l "<symbol>" -- '*.test.ts' '*.spec.ts' '*_test.go'
```

against the PRE-move path. If zero test files reference the symbol at the old path, the file is **new surface**, not migrated coverage. Continue with full gap analysis.

**Schema-file bypass:** Zod schemas (`z.object`, `z.union`, `.refine`, `.preprocess`, `.default`) and Go validator schemas are never auto-skipped even on import-path-only diffs. Run a behavior-shape audit: defaults, refinements, preprocessors, union variants, bounds asymmetries.

**Fast-Pass condition:** SKIP this entire phase if **all** the following are true:
- Diff is under ~20 lines of source code (excluding imports/whitespace).
- Source contains **no** branching (`if`/`else`/`switch`/`match`/`?`), **no** loops, **no** external calls (HTTP, DB, queue, FS, exec), and **no** unchecked error returns.
- No hardcoded URLs, package-level mutable dependencies, or concrete collaborators that would need a seam.

A pure stub returning a literal, a trivial type wrapper, or a one-line getter qualifies for Fast-Pass. Skip to 4b.

Otherwise (any condition fails), do the depth pass below. Read the source diff as a senior reviewer for ~30 seconds before bucketing. Capture two things the mechanical pass below will otherwise miss:

1. **Likely bugs** — guards that look wrong (`if (!price)` accepts negatives but rejects 0; missing `defer Close()`; ignored error from `json.Marshal`; non-2xx HTTP response treated as success; truthiness check that swallows `NaN`/`""`). If you see one, emit a `### 🐛 Likely Bug Surfaced` section with the file:line, the problem, and a one-line fix. This is a coverage gap **and** a code-review finding; flag both.
2. **Testability seams** — if a function calls a hardcoded URL, package-level function, or concrete dependency with no DI, **name the smallest seam** as a one-line refactor (e.g. `var chargeCardFn = chargeCard`), and split coverage into **tiers**:
   - **Tier A** — tests writeable today against current source (validation, wrong-method, malformed input).
   - **Tier B** — tests unlocked by the 1-line seam (happy path, upstream failure, arg-mapping).
   - **Tier C** — tests unlocked by full DI / interface refactor (external HTTP, retries, timeouts).

Show concrete code at each tier (Tier A in `🟠 High`; Tier B/C inline with `[REQUIRES REFACTOR]` tag — see 4c). Do not just write "no injectable seam, skipping" — that is a regression from the baseline behavior of the model.

### 4b. Stub detection

A stub = body returns a hardcoded literal / has TODO/FIXME / throws "not implemented".

- File is a stub → every exit-door gap is `[TDD]` (append `(behavior not yet implemented — red-first; will fail until stub is replaced)`).
- Exit door implies behavior **not in source at all** → drop entirely:
  - ED 2 (state): drop unless source persists (DB call, cache, file write). Comments do NOT count.
  - ED 3 (external call): drop unless source actually calls out.
  - ED 4 (queue events): drop unless source publishes.
  - ED 6 (concurrency): drop unless source has private mutable state + async lifecycle methods (i.e. would have been flagged stateful-async by Phase 2.5).

### 4c. Speculative-API gate

Every identifier in a sketch must be one of:
- (a) **In the source diff** (function, method, type, param), OR
- (b) **Std lib / framework primitive** (`httptest.NewRecorder`, `describe`, `expect`, `t.Run`, `TestBed`), OR
- (c) **Test-local construct introduced in the same sketch** (`const req = ...`, `buildTestApp()` defined inline, table `tt`).

Identifier fails all three → choose:
1. **Skip** the gap under `### ⏭️ Skipped` with reason `no injectable seam — would require fictitious API`, **AND** point at Phase 4a Tier B/C as the route to unlock it. Don't just skip silently.
2. **Or** tag the gap `[REQUIRES REFACTOR]`, describe the refactor in one line, and put `// fictitious — assumes refactor` on the line of the first invented identifier in the sketch.

Banned silently-emitted symbols (illustrative): `mockGateway`, `stubChargeCard`, `paymentRepository.findById`, `req.simulateError`, `HandleOrderWithGateway`.

### 4d. Blind-spot scan

Re-read the source diff for each trigger below. **Scope: only the added/modified lines of this diff** — do not scan untouched parts of the file. **Only flag if the trigger is in source** — never invent.

| Category | TS/JS | Go | Severity |
|---|---|---|---|
| Falsy/zero/empty | `!x`, `x == null`, `x === 0`, `x === ''`, `x.length === 0` | `x == 0`, `x == nil`, `len(x) == 0`, `s == ""` | High |
| Boundary | `<`, `<=`, `>`, `>=` against constants; `x < 0 \|\| x > 100` | same | High |
| Error path | `throw new`, `return { error }`, `Promise.reject` | `return err`, `panic(`, `fmt.Errorf` | High (ED 5) |
| Concurrency | `Promise.all`, `await` in loop, shared module state | `go `, `chan`, `sync.Mutex`, `atomic.` | Medium |

Also notice non-obvious bugs that fall out of this scan: a falsy check that swallows `NaN`, a `<` that should be `<=`, a guard with mismatched bounds. Promote those into Phase 4a § Likely Bug.

**Cookie/header parser swap:** when the diff swaps an auth source in a controller (cookie ↔ header ↔ query), enumerate 8 cases under Error path: case-sensitivity, `string | string[]` shape, `decodeURIComponent` URIError, position-in-list, whitespace tolerance, missing value, empty value, malformed encoding.

### 4e. Severity buckets

**🔴 Critical** — HTTP route / use-case with no test file at all; auth / access-control path untested; stateful-async file where `close`/`drain`/`reconnect` share mutable state with `publish` AND zero Exit Door 6 tests.
**🟠 High** — Missing ED 5 (error), ED 2 (state), ED 3 (external call); new file w/ non-trivial logic + zero tests; missing edge-case where source explicitly handles a boundary (zero/empty/null/off-by-one); stateful-async file missing any M1–M4 test; positional-arg helper with ≥5 params OR mixed string/boolean types (auto-promote from default Medium); unit-tested class shared via container/singleton whose singleton-ness drives correctness — wiring test is High, not Critical.
**🟡 Medium** — UI component w/ no render test; state store w/o shape test; utility w/o coverage; partial tests missing one significant variant; race/concurrency path where source uses goroutines/async/shared mutable state; sibling methods on same class with diverging param shape (e.g. only one takes `timeoutMs`) — "documented asymmetry" gap.
**🟢 Low** — Extra edges for already-tested logic; logging/observability beyond error case; trivial type wrappers.

### 4f. Consistency rule

Every gap considered in Phase 4 must appear somewhere in Phase 5 — under its severity bucket OR under `### ⏭️ Skipped` with a one-line reason. Never silently discard.

---

## Phase 5: Report

Count actual gaps per tier from your Phase 4 buckets — exact numbers in the header. If `playwright=true`, count E2E gaps separately: `N files changed, X unit gaps (C critical, H high …) + Y E2E gaps`.

```
## Coverage Gap Report
[N files changed, X gaps found (C critical, H high, M medium, L low) + R redundant]

### 🐛 Likely Bug Surfaced  (omit if none)
**`path:line`** — [problem in one sentence]. Fix: [one-line fix].

### 🔴 Critical  (omit header if no critical gaps)
**`path/to/file`**
- Missing: [exit door name]
- Suggested:
```<lang>
[runnable sketch — // Arrange / // Act / // Assert filled in, real assertion]
```

### 🟠 High
**`path/to/file`**
Gap 1 — [short name] (Exit Door N)
Why: [≤120 char invariant — what breaks if this gap goes untested]
```<lang>
[runnable sketch]
```

### 🟡 Medium / 🟢 Low — same format (include the `Why:` line under each gap).

### ✅ Already Covered
- `path/to/file` — exit doors 1, 5 covered

### 🔁 Redundant Tests
- `path/to/test.ts::test name` — [DUPLICATE|SUBSET|DEAD|LOW SIGNAL] reason. Human review: consider removing/merging.

### ⏭️ Skipped
- `path/to/file` — [reason]

### 📋 Non-test review findings  (omit if none, max 5 items)
- **`path:line`** — [one-line code-quality issue] — [one-line fix]

### Remediation Plan
[Ordered, one action per line. Critical first, then High. For polyglot diffs: group entirely by language — TS items 1-N, then Go items 1-M. Never interleave.]
```

**Empty section:** OMIT the section header entirely (no `_None._`, no narration) for `🐛 Likely Bug Surfaced`, `🔴 Critical`, `🟠 High`, `🟡 Medium`, `🟢 Low`, `🔁 Redundant Tests`, and `📋 Non-test review findings`. **Always render** `## Coverage Gap Report` (with the summary line), `### ✅ Already Covered`, `### ⏭️ Skipped`, and `### Remediation Plan` — if empty, render the header followed by `_None._`. The reviewer relies on the always-rendered sections to trust the report instead of re-deriving from negative space.

**Test sketch requirement:** runnable body with real assertions.
- Go HTTP handlers: `net/http/httptest` (`httptest.NewRecorder()` + `httptest.NewRequest()`), not comments.
- TypeScript: `expect(...)` with a real matcher.
- Bash: BATS `@test` blocks with PATH-shadow stubs in `$BATS_TEST_TMPDIR`.

**Polyglot wrap:** `## TypeScript`, `## Go`, etc. per language.

**Playwright:** append `### E2E Gaps` using fixture rule from `references/playwright.md` (`{ request }` server-side, `{ page }` frontend).

**Tier output:** when Phase 4a Tier B/C apply, group sketches as `**Tier A — writeable today**`, `**Tier B — after [1-line seam]**`, `**Tier C — after full refactor**`.

**Concrete patches:** for DEAD tests (rename / delete), show the actual replacement test file content as a fenced block, not just prose instructions. The reader should be able to copy-paste.
