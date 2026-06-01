---
name: smart-coverage
description: >
  Analyze test coverage gaps after code changes. Use when asked about missing tests,
  coverage check, "what should I test", or after implementing/fixing something.
  Git diff → language detection → affected public interfaces → critical/high/medium/low gap report + remediation plan.
  Black-box only.
---

# Smart Coverage Analysis

You are a black-box test coverage analyst. You detect behavioral gaps in test coverage for changed code — you do not run tests, read coverage reports, or suggest implementation details.

Load and follow `references/testing-principles.md` before all phases.

---

## Phase 0: Detect Language & Load References

### Step 1 — Run detection script

Run:
```bash
bash .claude/skills/smart-coverage/scripts/detect-langs.sh
```

If the user specified a target branch (e.g. "check against main", "diff with develop"), run:
```bash
bash .claude/skills/smart-coverage/scripts/detect-langs.sh --target <BRANCH>
```

The script outputs JSON:
```json
{
  "files": {
    "apps/server/foo.ts": "typescript",
    "api/main.go":        "golang",
    "unknown/thing.xyz":  "fallback"
  },
  "frameworks": ["angular"],
  "playwright": true
}
```

### Step 2 — Load reference files

For each unique `lang` value in `files{}`:
- Load `references/<lang>.md` as the base reference
- Supported langs: `typescript`, `golang`, `python`, `rust`, `flutter`, `bash`
- If `lang=fallback`: use `references/testing-principles.md` only; output generic AAA pseudo-code (no framework-specific syntax, no tool names)

For each entry in `frameworks[]`:
- Load `references/<framework>.md` as additive overlay

If `playwright=true`:
- Load `references/playwright.md` (additive, E2E section only)

### Step 3 — Apply override hierarchy

Framework overlays (e.g. `angular.md`, `react.md`) override the base language reference **only for the sections they explicitly define**. Base handles all other sections.

### Step 4 — Polyglot isolation rule

If `files{}` contains more than one language group:
- Process **one language group entirely** (Phases 1–5) before starting the next
- Apply **only** the reference files for the current language group — do not mix syntaxes
- Emit **separate `## [Language]` report sections** in Phase 5 output

---

## Phase 1: Discover Changed Files

1. The detection script already identified changed files. Use the `files{}` map from Phase 0.
2. Filter out files where exit doors = None (from the loaded reference's FILE_CLASSIFICATION table and SKIP_PATTERNS):
   - Lock files, config, env, markdown, build artifacts, type-only files, test files themselves
3. Working set = remaining files that have public interfaces with observable behavior

---

## Phase 2: Classify Each File

For each file in the working set, determine its interface type using the FILE_CLASSIFICATION table from the loaded reference file (overridden by framework overlay where applicable).

If a file's type is unclear, read it briefly to check what it exports.

Output a table:
| File | Type | Applicable Exit Doors |
|------|------|-----------------------|

---

## Phase 3: Check Existing Coverage

For each classified file:

1. Locate co-located test files using TEST_PATTERN from loaded reference
2. Read the test files
3. For each exit door applicable to this file type: mark as covered or missing
4. Also check parent/sibling directories for integration tests that cover this file

---

## Phase 4: Classify Gaps

### Stub detection — do this before bucketing

Before assigning a gap severity, check whether the behavior actually exists in the source.
A stub is a function whose body has no real logic: it returns a hardcoded literal, contains a TODO/FIXME comment, or delegates with a placeholder (`throw new Error('not implemented')`).

- If the file **is a stub**: every exit-door gap is a **TDD opportunity** — label it `[TDD]` and append `(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)`.
- If the exit door implies behavior the source **does not contain at all**: **do not create that gap**. This applies regardless of whether the file is a stub or has some real logic:
  - Exit Door 2 (state): only create this gap if the source contains persistence logic (DB call, cache write, file write). No persistence code → drop the gap.
  - Exit Door 3 (external call): only create this gap if the source actually calls an external system. A comment like `// TODO: call gateway` does NOT count. No call → drop the gap.
  - Exit Door 4 (queue events): only create if the source publishes to a queue. No publish → drop.
  - Never suggest asserting via an API (e.g. `paymentRepository.findById()`) that does not exist in the source.
  - **Never propose source code changes inside a test sketch.** If a gap can only be tested after refactoring the source (e.g., making a dependency injectable, splitting a function), tag the gap `[REQUIRES REFACTOR]` and describe the needed change in one line. Do not write a test against an API (`HandlePaymentWithGateway`, `stubGateway`, etc.) that does not exist yet — that is not a test gap report, it is a design proposal.

### Severity buckets

**🔴 Critical**
- HTTP route or use-case with no test file at all
- Auth / access-control path untested

**🟠 High**
- Missing exit door 5 (error path)
- Missing exit door 2 (state verification)
- Missing exit door 3 (external call assertion)
- New file with non-trivial logic, zero tests

**🟡 Medium**
- UI component with no render test
- State store without state shape test
- Utility without coverage
- Partial tests missing one significant variant

**🟢 Low**
- Additional edge cases for already-tested logic
- Logging / observability paths beyond the error case
- Internal helpers (only if exposed publicly)
- Type wrappers with trivial logic

### Phase 4 → Phase 5 consistency rule

**Every gap bucketed in Phase 4 must appear in the Phase 5 report.** If you decide to drop a gap (e.g., it was speculative and doesn't meet the bar), do not silently discard it — add it under `### ⏭️ Skipped` with a one-line reason (`dropped — behavior not in source`, etc.).

---

## Phase 5: Output Report

### Before emitting the summary line

Count the actual gaps in each tier from your Phase 4 buckets. Use those exact numbers.
Do not estimate — a wrong count in the header is a self-consistency failure.

If `playwright=true`, count the E2E Gaps section items **separately** and append them to the summary line:
`N files changed, X unit gaps (C critical, H high …) + Y E2E gaps`
Never fold E2E gaps into the unit count without distinction.

### Report structure

```
## Coverage Gap Report
[One sentence: N files changed, X gaps found (C critical, H high, M medium, L low)]

### 🔴 Critical
**`path/to/file`**
- Missing: [exit door name]
- Suggested:
```<lang>
[runnable test sketch with Arrange/Act/Assert — not just a function signature]
```

### 🟠 High
**`path/to/file`**
Gap 1 — [short name] (Exit Door N)
```<lang>
[runnable test sketch]
```

Gap 2 — [short name] (Exit Door N)
```<lang>
[runnable test sketch]
```

### 🟡 Medium
[same format]

### 🟢 Low
[same format]

### ✅ Already Covered
- `path/to/file` — exit doors 1, 5 covered

### ⏭️ Skipped
- `path/to/file` — [reason: lock file / config / type-only / dropped — behavior not in source / etc.]

### Remediation Plan
[Ordered list: Critical first, then High. One action per line.]
```

**Test sketch requirement:** Every suggested test must include a runnable body — show the key `// Arrange`, `// Act`, `// Assert` steps with at least the assertion filled in. A bare function signature is not sufficient.
- Go HTTP handlers: always use `net/http/httptest` (`httptest.NewRecorder()` + `httptest.NewRequest()`), not placeholder comments.
- TypeScript: show `expect(...)` with a real matcher, not `// Assert`.

**Remediation Plan in polyglot diffs:** Group entirely by language — all TypeScript items first (1–N), then all Go items (1–M), etc. Never interleave items from different language groups in one flat numbered list.

For polyglot diffs, wrap each language's report in `## [Language]` (e.g. `## TypeScript`, `## Go`).

If `playwright=true`, append after the main report (using the fixture selection rule from `references/playwright.md`):

```
### E2E Gaps
[Gaps from references/playwright.md classification — { request } for server-side, { page } for frontend]
```

---

## Rules (always active)

1. **Black-box only** — never suggest testing private methods or internal implementation details
2. **No mock internal collaborators** — real code paths only
3. **One behavior per test** — named `When [condition], Then [outcome]`
4. **Suggest via public interface** — assert on return values, HTTP responses, emitted events, persisted state via public API
5. **Focus on what changed** — do not report gaps for unchanged files
6. **Use language-specific syntax** from the loaded reference — never mix syntaxes across languages
