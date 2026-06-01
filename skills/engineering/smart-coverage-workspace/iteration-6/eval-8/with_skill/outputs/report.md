## Coverage Gap Report
1 file changed, 3 gaps found (0 critical, 2 high, 1 medium, 0 low) + 4 redundant

### 🐛 Likely Bug Surfaced
_None._

### 🔴 Critical
_None._

### 🟠 High
**`billing/billing.go`**

Gap 1 — Negative subtotal rejected (Exit Door 5)
```go
func TestComputeTax_WhenSubtotalNegative_ThenReturnsError(t *testing.T) {
    // Arrange / Act
    got, err := ComputeTax(-1.0, 0.1)
    // Assert
    if err == nil {
        t.Fatal("expected error for negative subtotal")
    }
    if got != 0 {
        t.Errorf("got %v, want 0 on error", got)
    }
}
```

Gap 2 — Negative rate rejected (Exit Door 5; existing dead test only covered `rate > 1`)
```go
func TestComputeTax_WhenRateNegative_ThenReturnsError(t *testing.T) {
    // Arrange / Act
    got, err := ComputeTax(100.0, -0.1)
    // Assert
    if err == nil {
        t.Fatal("expected error for negative rate")
    }
    if got != 0 {
        t.Errorf("got %v, want 0 on error", got)
    }
}
```

### 🟡 Medium
**`billing/billing.go`**

Gap 3 — Boundary inputs (rate=0, rate=1, subtotal=0) all return `(0, nil)` / valid product (Exit Door 1)
```go
func TestComputeTax_Boundaries(t *testing.T) {
    tests := []struct {
        name     string
        subtotal float64
        rate     float64
        want     float64
    }{
        {"When rate is 0, Then tax is 0", 100.0, 0.0, 0.0},
        {"When rate is 1, Then tax equals subtotal", 100.0, 1.0, 100.0},
        {"When subtotal is 0, Then tax is 0", 0.0, 0.5, 0.0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ComputeTax(tt.subtotal, tt.rate)
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if got != tt.want {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

### 🟢 Low
_None._

### ✅ Already Covered
_None._ (every existing assertion targets a removed/renamed symbol — see Redundant Tests.)

### 🔁 Redundant Tests
- `billing/billing_test.go::TestCalculateTax_WhenValid_ThenReturnsTax` — [DEAD] `CalculateTax` renamed to `ComputeTax`. Human review: consider removing/merging.
- `billing/billing_test.go::TestCalculateTax_WhenRateOutOfRange_ThenReturnsError` — [DEAD] `CalculateTax` renamed to `ComputeTax`. Human review: consider removing/merging.
- `billing/billing_test.go::TestProcessRefund_WhenValid_ThenNoError` — [DEAD] `ProcessRefund` removed. Human review: consider removing/merging.
- `billing/billing_test.go::TestProcessRefund_WhenAmountZero_ThenReturnsError` — [DEAD] `ProcessRefund` removed. Human review: consider removing/merging.

### ⏭️ Skipped
_None._

### Concrete Patch — replacement `billing/billing_test.go`

Replace the entire file with the following. All 4 existing tests are DEAD (compile would fail). The replacement renames the two tax tests to `ComputeTax`, drops both `ProcessRefund` tests, and adds the High/Medium gaps above.

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

func TestComputeTax_WhenRateNegative_ThenReturnsError(t *testing.T) {
    got, err := ComputeTax(100.0, -0.1)
    if err == nil {
        t.Fatal("expected error for negative rate")
    }
    if got != 0 {
        t.Errorf("got %v, want 0 on error", got)
    }
}

func TestComputeTax_WhenSubtotalNegative_ThenReturnsError(t *testing.T) {
    got, err := ComputeTax(-1.0, 0.1)
    if err == nil {
        t.Fatal("expected error for negative subtotal")
    }
    if got != 0 {
        t.Errorf("got %v, want 0 on error", got)
    }
}

func TestComputeTax_Boundaries(t *testing.T) {
    tests := []struct {
        name     string
        subtotal float64
        rate     float64
        want     float64
    }{
        {"When rate is 0, Then tax is 0", 100.0, 0.0, 0.0},
        {"When rate is 1, Then tax equals subtotal", 100.0, 1.0, 100.0},
        {"When subtotal is 0, Then tax is 0", 0.0, 0.5, 0.0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ComputeTax(tt.subtotal, tt.rate)
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if got != tt.want {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Remediation Plan
1. Overwrite `billing/billing_test.go` with the concrete patch above (deletes 4 DEAD tests, renames 2 to `ComputeTax`, adds error/boundary coverage).
2. Run `go test ./billing/...` to confirm the package compiles and all assertions pass.
3. Grep the rest of the repo for stale references to `CalculateTax` or `ProcessRefund` outside this package before merging.
