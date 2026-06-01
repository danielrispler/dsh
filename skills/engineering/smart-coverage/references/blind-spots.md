# Blind-Spots Reference

Prompt to **LOOK** at the source diff for these triggers — do NOT invent a blind spot if the trigger is not present in the source.

## Categories & triggers

### Falsy / zero / empty
Scan diff for explicit falsy checks. Each one is a separate test case.

| Lang | Triggers |
|------|----------|
| TS/JS | `!x`, `x == null`, `x === 0`, `x === ''`, `x.length === 0`, `Array.isArray(x) && !x.length` |
| Go | `if x == 0`, `if x == nil`, `if len(x) == 0`, `if s == ""` |
| Python | `if not x`, `if x is None`, `if len(x) == 0` |
| Rust | `if x.is_none()`, `if x.is_empty()`, `match Some(0)` |

If trigger present → gap: missing test for that falsy input. **Severity: High** (source explicitly handles boundary).

### Boundary / off-by-one
Scan for inclusive vs. exclusive comparisons and explicit bounds.

| Lang | Triggers |
|------|----------|
| TS/JS/Go/Rust | `<`, `<=`, `>`, `>=` against constants; `Math.max`, `Math.min`; range checks like `x < 0 \|\| x > 100` |
| Python | same as above; `range(a, b)`; slice bounds |

For each bound found → tests at: below bound, exactly at bound, above bound, exactly at upper bound. **Severity: High**.

### Error paths
Scan for explicit throws/returns/panics.

| Lang | Triggers |
|------|----------|
| TS/JS | `throw new`, `return { error: ... }`, `Promise.reject` |
| Go | `return err`, `return nil, fmt.Errorf`, `panic(` |
| Python | `raise`, `return Err(...)` |
| Rust | `Err(...)`, `panic!`, `bail!`, `?` operator on fallible call |

If unguarded by test → gap. **Severity: High (Exit Door 5)**.

### Concurrency / async / shared state
Scan for primitives that imply a race window.

| Lang | Triggers |
|------|----------|
| Go | `go ` keyword, `sync.Mutex`, `chan`, `sync.WaitGroup`, `atomic.` |
| TS/JS | `Promise.all`, `await` in a loop, shared module-level state mutated by handler |
| Python | `asyncio.gather`, `threading.`, `multiprocessing.` |
| Rust | `tokio::spawn`, `Arc<Mutex<...>>`, `mpsc::channel` |

If present and no isolation test → gap. **Severity: Medium** (race tests harder to write deterministically).

## Anti-pattern

**Do NOT invent a blind spot if the source does not handle that case.**

If source has `function add(a, b) { return a + b }` with no zero/nil/error handling, do NOT flag "missing zero test" — there is no behavioral branch for zero. The function returns `a + b` for all inputs equally.

A blind spot exists only when source has explicit handling that tests do not exercise.
