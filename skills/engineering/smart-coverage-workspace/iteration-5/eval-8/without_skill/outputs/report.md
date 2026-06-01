# Smart Coverage Review — `billing/` after refactor

## Summary of the diff (as described)
- `ProcessRefund` was **deleted** from `billing/billing.go`.
- `CalculateTax` was **renamed to `ComputeTax`** (signature unchanged: `(subtotal, rate float64) (float64, error)`).

`billing/billing.go` now only exports a single function: `ComputeTax`. No other files in the module reference the removed/renamed symbols — only `billing_test.go` does. So all decisions are local to that test file.

## Dead vs. salvageable tests in `billing/billing_test.go`

| Test | Status | Reason | Action |
|---|---|---|---|
| `TestCalculateTax_WhenValid_ThenReturnsTax` (L5–13) | **Salvage — rename** | Same function, just renamed. Test logic is still valid against `ComputeTax`. | Rename test + update call site. |
| `TestCalculateTax_WhenRateOutOfRange_ThenReturnsError` (L15–19) | **Salvage — rename** | Same as above; still meaningful behavior. | Rename test + update call site. |
| `TestProcessRefund_WhenValid_ThenNoError` (L21–25) | **Dead — delete** | `ProcessRefund` no longer exists. The behavior it covered is gone from the package. | Delete the test. |
| `TestProcessRefund_WhenAmountZero_ThenReturnsError` (L27–31) | **Dead — delete** | Same — covers a removed function. | Delete the test. |

Without these changes, `go test ./billing/...` will fail to compile (`undefined: CalculateTax`, `undefined: ProcessRefund`).

## Concrete patch

Replace `billing/billing_test.go` with:

```go
package billing

import "testing"

func TestComputeTax_WhenValid_ThenReturnsTax(t *testing.T) {
    got, err := ComputeTax(100.0, 0.1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if got != 10.0 {
        t.Errorf("got %v, want 10.0", got)
    }
}

func TestComputeTax_WhenRateOutOfRange_ThenReturnsError(t *testing.T) {
    if _, err := ComputeTax(100.0, 1.5); err == nil {
        t.Error("expected error for rate > 1")
    }
}
```

(Both `ProcessRefund` tests removed; both `CalculateTax` tests renamed and re-pointed at `ComputeTax`.)

## Coverage gaps in `ComputeTax`

Even after the rename, the existing tests under-cover the function. `ComputeTax` has three branches:

1. `subtotal < 0` → error  *(not covered)*
2. `rate < 0 || rate > 1` → error  *(only `rate > 1` is covered; `rate < 0` is not)*
3. happy path → `subtotal * rate`  *(covered)*

Suggested additional tests to close the gaps:

```go
func TestComputeTax_WhenSubtotalNegative_ThenReturnsError(t *testing.T) {
    if _, err := ComputeTax(-1.0, 0.1); err == nil {
        t.Error("expected error for negative subtotal")
    }
}

func TestComputeTax_WhenRateNegative_ThenReturnsError(t *testing.T) {
    if _, err := ComputeTax(100.0, -0.1); err == nil {
        t.Error("expected error for negative rate")
    }
}
```

Optional edge cases worth considering (low priority): `rate == 0`, `rate == 1`, `subtotal == 0` — these are valid inputs per the guards and would lock in boundary behavior.

## Repo-wide check
Grepped the whole module for `ProcessRefund`, `CalculateTax`, and `ComputeTax`. The only non-test reference outside `billing.go` is none — nothing else in this repo imports or calls these symbols, so no downstream callers need updating.

## Recommended actions, in order
1. Delete the two `TestProcessRefund_*` tests (dead).
2. Rename the two `TestCalculateTax_*` tests to `TestComputeTax_*` and update the call sites (`CalculateTax` → `ComputeTax`).
3. Add `TestComputeTax_WhenSubtotalNegative_ThenReturnsError` and `TestComputeTax_WhenRateNegative_ThenReturnsError` to cover the two missed error branches.
4. Run `go test ./...` to confirm green.

## Relevant file paths
- `billing/billing.go`
- `billing/billing_test.go`
