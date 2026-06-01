# Testing Principles

## Core Philosophy

Black-box, behavior-first testing. Test public interfaces only. Refactors that do not change observable behavior should break zero tests.

**5 exit doors apply regardless of language. What varies is how you observe each exit.**

## The 5 Exit Doors

Every public operation has up to 5 observable "exits". A test covers a gap only when it asserts on the exit — not merely exercises the code path.

1. **Response** — return value, HTTP status, body shape
2. **New State** — data persisted (verify via public API, not raw DB/memory inspection)
3. **External Calls** — calls to external systems (cache, storage, queues, FFmpeg, etc.) are correct
4. **Message Queue Events** — messages published with correct routing key and payload
5. **Observability** — error path tested; failure produces correct response/error

## Priority Rules

- Test features, not functions
- Component/integration tests are primary; E2E tests: 3–10 max; unit tests only for non-trivial algorithms
- Never mock internal collaborators
- Each test must assert on at least one exit door

## Test Structure

- **Naming**: `When [condition], Then [outcome]`
- **Pattern**: AAA — Arrange, Act, Assert
- **Size**: ~7 statements max
- **Data isolation**: each test creates its own records
- **Assert via public API only**

## What NOT to Test

Config, env, type-only files, internal functions, lock files, markdown, build artifacts.

## File Classification Table

Maps file type → applicable exit doors. Use loaded language reference for language-specific type names.

| Type | Exits | Notes |
|------|-------|-------|
| HTTP route / handler | All 5 | Highest priority |
| Use-case / service | 1,2,3,4 | Response = return value |
| UI component (stateful) | 1,5 | Render + error; see framework ref for syntax |
| State store | 1,2 | State shape & changes |
| Pure utility | 1 only | Input → output |
| Adapter / infrastructure | 3,4 | External system calls |
| Config / bootstrap / env | None | Skip |
| Type-only | None | Skip |

## Fallback (unknown language)

If the file extension or shebang reveals a known language (e.g. `.sh` / `#!/usr/bin/env bash`), use that reference instead. Otherwise emit language-neutral `TEST/ARRANGE/ACT/ASSERT` prose with no framework names, no function-call syntax, and no specific tool names in the Remediation Plan.
