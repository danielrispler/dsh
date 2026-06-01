# Coverage & Redundancy Report — `apps/server/order.controller.ts`

## Source under test
`createOrderRoute` registers `POST /orders`. Branches:
1. **Invalid input** — `!userId || items.length === 0` -> `400 {error: 'invalid order'}`
2. **Valid input** — computes `total` via `items.reduce(...)`, calls `repo.save`, returns `201 {id, total}`

## Coverage gaps (uncovered behavior)

| # | Gap | Why it matters |
|---|-----|---|
| G1 | **`400` when `userId` is missing/empty** | The entire invalid-input branch (lines 15–18) is never exercised. No test hits the `reply.code(400)` path. |
| G2 | **`400` when `items` is an empty array** | Same branch, second predicate. Not covered. |
| G3 | **`repo.save` rejects / throws** | No test asserts the error-propagation path when persistence fails. |
| G4 | **`total` computation across multiple items** is covered by test #2, but **single-item `total`** is never asserted (tests #1, #3, #4 ignore the body). Minor gap. |
| G5 | **Response `Content-Type` / body shape on `400`** — never asserted. |

Net: line coverage is roughly the happy path only; the `if (!userId || items.length === 0)` block is dead from a test perspective. Branch coverage on that `if` is 0/2.

## Redundant / low-signal tests

Test #2 is a **strict superset** of #1, #3, and #4:

| Test | Asserts | Subsumed by #2? |
|------|---------|------|
| #1 "When valid order, Then returns 201" | `statusCode === 201` | Yes — #2 asserts the same plus body + repo call. |
| #3 "When order posted, Then repo.save called once" | `repo.save` called 1x | Yes — #2's `toHaveBeenCalledWith(...)` implies called once with exact args. Also low-signal: asserts framework wiring, not business logic. |
| #4 "When user posts an order, Then status is 201" | `statusCode === 201` | Yes — identical assertion to #1, just different `userId`/`sku`. Pure duplicate of #1. |

**Recommendation: delete #1, #3, #4.** Keep #2 as the canonical happy-path test. None of the deleted tests covers a branch or value that #2 doesn't already cover.

### Quick-win replacement suite
Replace the three redundant tests with tests that close the real gaps:

```ts
it('When userId is empty, Then returns 400', async () => { /* G1 */ });
it('When items is empty, Then returns 400 and does not call repo.save', async () => { /* G2 */ });
it('When repo.save rejects, Then error propagates', async () => { /* G3 */ });
```

## Summary

- **Redundancy:** 3 of 4 tests are redundant (#1, #3, #4 all subsumed by #2).
- **Coverage:** the 400-branch is entirely untested; error path from `repo.save` is untested.
- **Net effect:** file looks well-tested by test count, but effective branch coverage is ~50% and there is significant duplicated assertion work.

Files reviewed:
- `apps/server/order.controller.ts`
- `apps/server/order.controller.test.ts`
