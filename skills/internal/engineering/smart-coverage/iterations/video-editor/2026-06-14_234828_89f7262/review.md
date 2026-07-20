# User Review

Free-form notes on this iteration. Edit any section. `/smart-coverage-harvest` will pick up edited sections (skipping any that still contain the `_(your notes here)_` placeholder) and feed them to the reducer as ground-truth signal — higher weight than the `rating` field in `metadata.json`.

Be specific: name files, exit doors, severity buckets, hallucinated symbols. The harvest agent uses your phrasing verbatim when proposing skill changes.

## Review of baseline

Broader and deeper. 22 findings, 3 Critical/8 High/8 Medium/3 Low. No hallucination.

Strengths:
- Correctly classified `/editor/segment` `kind`-validation matrix as **Critical (security)** — it is the SSRF/auth-bypass guard. `kind=channel-range` with no `token` is the only thing blocking media-id-style empty-token URLs from riding the channel-range HMAC path.
- Caught the precise bug surface in `payload-intake.ts:42-46`: `try/catch` wraps `fetchCore` only, so `response.json()` SyntaxError leaks past `CoreUnavailableError`. This is a real fix vs. a generic "malformed JSON" note.
- Pushed back as a **design comment** that `serverBaseUrl` is the wrong base for resolving Core-served MPD URLs in `HttpPreviewSourceAdapter` — not just a test gap. Senior-engineer move.
- Caught edge cases treatment dropped: `selfBaseUrl` URL-encoding on `/private/videos/:id/play`, `VITE_CORE_EXTENSION` trailing-slash semantics, `extractSavedItems` no-mediaId fallback, `useEasterEggs` `__roni-cut-flip` round-trip, iframe-demo whitespace mediaId.

Weaknesses:
- No structured `describe()/it()` test names — harder to drop straight into a test file.
- No exit-door classification.
- Remediation summary at the end is good but not ordered with file paths the way treatment's is.

## Review of treatment

Disciplined and actionable. 11 findings, 0 Critical/5 High/4 Medium/2 Low. No hallucination.

Strengths:
- Every gap named with `describe(...) → it('When X, Then Y')` and tagged to one of the 5 exit doors. Ship-ready test specs.
- Ordered remediation plan with concrete file paths (`preview.controller.e2e.test.ts`, `payload-intake.test.ts`, etc.) — engineer can close from the top.
- Explicit `✅ Already Covered` and `⏭️ Skipped` sections show scope reasoning. Skipping `use-easter-eggs.ts` as "pure visual effects, no behavioral contract" is defensible.
- Caught the top-3 highest-risk gaps baseline also caught: kind-validation matrix, unknown stored-media type, mediaCreatedAtMs ↔ MPD timeline drift.

Weaknesses:
- **Severity miscalibration**: classified the `kind`-validation matrix as High, not Critical. This is the SSRF/auth guard — should be Critical regardless of happy-path coverage. The skill's bucket criteria appear to weight "exists happy path" too heavily and underweight "is this the security boundary".
- Compressed `payload-intake.ts` "fetchCore vs response.json() throw boundary" into a less precise "malformed JSON" framing. Treatment's `it('...current behaviour: SyntaxError leaks')` is correct but skips the bug-vs-pin-behaviour distinction baseline drew.
- Dropped the `HttpPreviewSourceAdapter` design comment entirely — skill is scoped to "test coverage", not design review. Defensible cut but loses senior-engineer value.
- Missed ~7 edge cases that baseline caught and that are not pure visual fluff: `selfBaseUrl` URL-encoding, `VITE_CORE_EXTENSION` trailing-slash, `appendStoredVideoState` trim hard-coding (#13 baseline), `extractSavedItems` no-mediaId fallback, length-mismatch sig (treatment did catch this one), iframe-demo `addMediaFromForm` whitespace.

## Overall — what should change in the skill?

**Treatment wins on form, baseline wins on substance. Net: baseline.**

The skill should keep treatment's structure (exit-door tagging, `describe()/it('When X, Then Y')` names, ordered remediation plan with file paths) but fix three things:

1. **Severity rules need a security-boundary override.** When a finding sits on an HTTP/auth discriminator (e.g. SSRF guard, token forwarding, kind validation), it goes Critical even if a happy path is covered. Treatment's "0 Critical" on this diff is wrong — the `/editor/segment` `kind` matrix is Critical.

2. **Allow one "design comment" slot per review.** Strictly scoping to test gaps loses the `serverBaseUrl` style observation. Add a short `### Design Notes` section (cap at 1-2 entries) that the skill can use when a test gap is actually a symptom of a wrong abstraction.

3. **Don't over-compress bug surfaces.** "Malformed JSON from Core" lost the specific `try/catch` boundary detail. The skill should preserve the exact line/symbol where the throw escapes — `payload-intake.ts:42-46 wraps fetchCore only; response.json() SyntaxError leaks` is more useful than "non-JSON body".

4. **Loosen the "no behavioral contract" filter slightly.** `appendStoredVideoState` hard-coded trim, `selfBaseUrl` URL-encoding, and `VITE_CORE_EXTENSION` trailing-slash are not visual fluff — they are real regression surfaces. The filter is catching too much.

Verdict: **baseline.**
