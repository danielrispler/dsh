# Redundancy Reference

Detect tests that add no behavioral signal. Flag for human review only — **never auto-delete**.

## Four patterns

### DUPLICATE
Two or more tests assert the same exit door on the same input class with no meaningful difference.

Example: three happy-path tests for `POST /payment` that all send `{amount:100}` and assert `status === 200`. One is sufficient.

Output tag: `[DUPLICATE]` with reason `subsumed by <other test name>`.

### SUBSET
Test A's assertions are a strict subset of test B's. A adds no coverage B doesn't already give.

Example: A asserts `status === 200`. B asserts `status === 200` AND `body.id` present AND `repo.save` called. A is subset of B.

Output tag: `[SUBSET]` with reason `strict subset of <test name>`.

### DEAD
Test references a symbol that no longer exists in the source after the diff (deleted function, renamed function, removed export).

Example: source diff removes `ProcessRefund()` — existing `TestProcessRefund` is dead.

Output tag: `[DEAD]` with reason `<symbol> removed` or `renamed to <new symbol>`. Recommend delete or rename, not auto-apply.

### LOW SIGNAL
Test only asserts framework-invariant behavior (that the framework did what frameworks do): "send was called once", "render did not throw", "constructor returned an object". No exit-door assertion on user-visible behavior.

Output tag: `[LOW SIGNAL]` with reason `asserts framework invariant, not exit door`.

## What is NOT redundancy

Do NOT flag as redundant:
- Tests covering different exit doors of the same function (response vs. state vs. external call)
- Tests covering different input classes (happy path vs. boundary vs. error)
- Tests at different scopes (unit + integration covering the same code path on purpose)
- Tests that look similar but assert different fields of the response
- Negative tests paired with positive tests

When in doubt: keep the test, do not flag.

## Output format

One bullet per redundant test under `### 🔁 Redundant Tests`:

```
- `path/to/test.ts::test name` — [TAG] one-line reason
```

Never recommend `rm` or auto-deletion. Always: "Human review: consider removing/merging."
