## Coverage Gap Report
1 file changed, 2 gaps found (0 critical, 2 high, 0 medium, 0 low) + 0 redundant.

## Go

### 🔴 Critical
_None._

### 🟠 High
**`api/payments/handler.go`**

Gap 1 — Happy-path response not asserted (Exit Door 1) `[TDD]` (behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)
```go
package payments

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestHandlePayment_WhenValidRequest_ThenReturns200(t *testing.T) {
    // Arrange
    req := httptest.NewRequest(http.MethodPost, "/payment", strings.NewReader(`{"amount":100,"currency":"USD"}`))
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()

    // Act
    HandlePayment(rr, req)

    // Assert
    if rr.Code != http.StatusOK {
        t.Fatalf("status: got %d, want %d", rr.Code, http.StatusOK)
    }
    if ct := rr.Header().Get("Content-Type"); ct == "" {
        t.Errorf("expected response Content-Type to be set, got empty")
    }
}
```

Gap 2 — Error path not asserted (Exit Door 5) `[TDD]` (behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)
```go
package payments

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestHandlePayment_WhenInvalidBody_ThenReturns4xx(t *testing.T) {
    // Arrange
    req := httptest.NewRequest(http.MethodPost, "/payment", strings.NewReader(`not-json`))
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()

    // Act
    HandlePayment(rr, req)

    // Assert
    if rr.Code < 400 || rr.Code >= 500 {
        t.Fatalf("expected 4xx for invalid payload, got %d", rr.Code)
    }
}
```

### 🟡 Medium
_None._

### 🟢 Low
_None._

### ✅ Already Covered
_None._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `api/payments/handler.go` — Exit Door 2 (state) dropped: handler source contains no persistence logic.
- `api/payments/handler.go` — Exit Door 3 (external call) dropped: no injectable seam — comment `// calls external gateway` is not a real call, and asserting on a gateway would require fictitious API (no interface, no DI parameter, no constructor). Re-evaluate once handler accepts an injectable gateway client.
- `api/payments/handler.go` — Exit Door 4 (queue events) dropped: handler source publishes no messages.
- `go.sum` — generated dependency manifest, no exit doors.

### Remediation Plan

Go:
1. Add `api/payments/handler_test.go` with `TestHandlePayment_WhenValidRequest_ThenReturns200` (red-first; passes once the handler validates and processes a real request).
2. Add `TestHandlePayment_WhenInvalidBody_ThenReturns4xx` in the same file (red-first; passes once the handler rejects malformed payloads).
3. Refactor `HandlePayment` to accept an injectable payment-gateway dependency (interface parameter or handler struct field). Once the seam exists, re-run smart-coverage to add an Exit Door 3 test that asserts the gateway is called with the correct amount/currency.
