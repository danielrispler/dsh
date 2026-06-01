## Coverage Gap Report

1 file changed, 5 gaps found (0 critical, 4 high, 1 medium, 0 low) + 4 redundant.

### Phase 2 — File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `billing/billing.go` | Pure utility | 1 (response); 5 (error path) via returned `error` |

### 🔴 Critical
_None._

### 🟠 High

**`billing/billing.go`**

Gap 1 — `ComputeTax` happy path under new name (Exit Door 1). After the rename, no live test exercises `ComputeTax`; the package will not even compile.
```go
func TestComputeTax_WhenValidInputs_ThenReturnsSubtotalTimesRate(t *testing.T) {
    // Arrange
    subtotal, rate := 100.0, 0.1
    // Act
    got, err := ComputeTax(subtotal, rate)
    // Assert
    if err != nil { t.Fatalf("unexpected error: %v", err) }
    if got != 10.0 { t.Errorf("got %v, want 10.0", got) }
}
```

Gap 2 — Rejects negative subtotal (Exit Door 5). Source: `if subtotal < 0 { return 0, errors.New(...) }`.
```go
func TestComputeTax_WhenSubtotalNegative_ThenReturnsError(t *testing.T) {
    got, err := ComputeTax(-1.0, 0.1)
    if err == nil { t.Fatal("expected error for negative subtotal") }
    if got != 0 { t.Errorf("got %v, want 0 on error", got) }
}
```

Gap 3 — Rejects rate below 0 (Exit Door 5). Old tests only covered `rate > 1`; the `rate < 0` branch is uncovered.
```go
func TestComputeTax_WhenRateNegative_ThenReturnsError(t *testing.T) {
    got, err := ComputeTax(100.0, -0.01)
    if err == nil { t.Fatal("expected error for negative rate") }
    if got != 0 { t.Errorf("got %v, want 0 on error", got) }
}
```

Gap 4 — Rejects rate above 1 (Exit Door 5). The old assertion is DEAD and must be re-established under the new symbol.
```go
func TestComputeTax_WhenRateAboveOne_ThenReturnsError(t *testing.T) {
    got, err := ComputeTax(100.0, 1.5)
    if err == nil { t.Fatal("expected error for rate > 1") }
    if got != 0 { t.Errorf("got %v, want 0 on error", got) }
}
```

### 🟡 Medium

**`billing/billing.go`**

Gap 5 — Inclusive boundary at `rate == 0`, `rate == 1`, `subtotal == 0` (Exit Door 1). Source uses inclusive bounds (`rate < 0 || rate > 1`); lock in inclusive behavior.
```go
func TestComputeTax_BoundaryInputs(t *testing.T) {
    tests := []struct{
        name     string
        subtotal float64
        rate     float64
        want     float64
    }{
        {"When rate is exactly 0, Then returns 0 with no error", 100.0, 0.0, 0.0},
        {"When rate is exactly 1, Then returns subtotal with no error", 100.0, 1.0, 100.0},
        {"When subtotal is exactly 0, Then returns 0 with no error", 0.0, 0.5, 0.0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ComputeTax(tt.subtotal, tt.rate)
            if err != nil { t.Fatalf("unexpected error: %v", err) }
            if got != tt.want { t.Errorf("got %v, want %v", got, tt.want) }
        })
    }
}
```

### 🟢 Low
_None._

### ✅ Already Covered
_None._ All prior tests reference symbols that no longer exist — effective live coverage of `billing/billing.go` is zero.

### 🔁 Redundant Tests

- `billing/billing_test.go::TestCalculateTax_WhenValid_ThenReturnsTax` — [DEAD] `CalculateTax` renamed to `ComputeTax`. Human review: **rename** to `TestComputeTax_WhenValid_ThenReturnsTax` and update the call site — the assertion is still valuable (it becomes Gap 1).
- `billing/billing_test.go::TestCalculateTax_WhenRateOutOfRange_ThenReturnsError` — [DEAD] `CalculateTax` renamed to `ComputeTax`. Human review: **rename** to `TestComputeTax_WhenRateAboveOne_ThenReturnsError` and update the call site — the assertion becomes Gap 4.
- `billing/billing_test.go::TestProcessRefund_WhenValid_ThenNoError` — [DEAD] `ProcessRefund` removed from source. Human review: **delete** — no replacement symbol to retarget.
- `billing/billing_test.go::TestProcessRefund_WhenAmountZero_ThenReturnsError` — [DEAD] `ProcessRefund` removed from source. Human review: **delete** — no replacement symbol to retarget.

The package will not compile while these four tests remain, so the entire `billing` test binary is currently broken; fixing the DEAD tests is a prerequisite for the other gap fixes to execute.

### ⏭️ Skipped
- `go.mod` — module manifest, not in diff and has no exit doors.

### Remediation Plan

1. Resolve the four DEAD tests in `billing/billing_test.go` so the package compiles:
   a. Rename `TestCalculateTax_WhenValid_ThenReturnsTax` → `TestComputeTax_WhenValid_ThenReturnsTax`, switch the call to `ComputeTax(...)` (covers Gap 1).
   b. Rename `TestCalculateTax_WhenRateOutOfRange_ThenReturnsError` → `TestComputeTax_WhenRateAboveOne_ThenReturnsError`, switch the call to `ComputeTax(...)` (covers Gap 4).
   c. Delete `TestProcessRefund_WhenValid_ThenNoError`.
   d. Delete `TestProcessRefund_WhenAmountZero_ThenReturnsError`.
2. Add `TestComputeTax_WhenSubtotalNegative_ThenReturnsError` (Gap 2 — Exit Door 5).
3. Add `TestComputeTax_WhenRateNegative_ThenReturnsError` (Gap 3 — Exit Door 5).
4. Add `TestComputeTax_BoundaryInputs` table-driven test for inclusive bounds (Gap 5 — Exit Door 1).
