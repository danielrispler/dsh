## Coverage Gap Report
1 file changed, 1 gap found (0 critical, 1 high, 0 medium, 0 low) + 4 redundant

### 🟠 High
**`billing/billing.go`**

Gap 1 — `ComputeTax` negative-subtotal boundary uncovered (Exit Door 5)
The renamed `ComputeTax` now guards `subtotal < 0`, but no test asserts that path. Once the DEAD tests below are replaced, the rate-out-of-range path is restored, but the negative-subtotal branch is still untested.

The full replacement `billing_test.go` (see § Concrete Patches) includes the missing case.

### 🔁 Redundant Tests
- `billing/billing_test.go::TestCalculateTax_WhenValid_ThenReturnsTax` — [DEAD] `CalculateTax` renamed to `ComputeTax`. Human review: replace with `ComputeTax` call (see patch).
- `billing/billing_test.go::TestCalculateTax_WhenRateOutOfRange_ThenReturnsError` — [DEAD] `CalculateTax` renamed to `ComputeTax`. Human review: replace with `ComputeTax` call (see patch).
- `billing/billing_test.go::TestProcessRefund_WhenValid_ThenNoError` — [DEAD] `ProcessRefund` removed. Human review: delete.
- `billing/billing_test.go::TestProcessRefund_WhenAmountZero_ThenReturnsError` — [DEAD] `ProcessRefund` removed. Human review: delete.

### Concrete Patches

Full replacement for `billing/billing_test.go`:

```go
package billing

import "testing"

func TestComputeTax_WhenValid_ThenReturnsTax(t *testing.T) {
	// Arrange
	subtotal, rate := 100.0, 0.1
	// Act
	got, err := ComputeTax(subtotal, rate)
	// Assert
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != 10.0 {
		t.Errorf("got %v, want 10.0", got)
	}
}

func TestComputeTax_WhenRateAboveOne_ThenReturnsError(t *testing.T) {
	if _, err := ComputeTax(100.0, 1.5); err == nil {
		t.Error("expected error for rate > 1")
	}
}

func TestComputeTax_WhenRateNegative_ThenReturnsError(t *testing.T) {
	if _, err := ComputeTax(100.0, -0.1); err == nil {
		t.Error("expected error for rate < 0")
	}
}

func TestComputeTax_WhenSubtotalNegative_ThenReturnsError(t *testing.T) {
	if _, err := ComputeTax(-1.0, 0.1); err == nil {
		t.Error("expected error for subtotal < 0")
	}
}
```

### Remediation Plan
1. Replace `billing/billing_test.go` with the block above — removes 4 DEAD tests, restores happy + rate>1 coverage, and adds the missing `rate < 0` and `subtotal < 0` branches.
