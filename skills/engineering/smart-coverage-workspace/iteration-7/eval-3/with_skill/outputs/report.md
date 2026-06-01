## Coverage Gap Report
1 file changed, 1 gap found (0 critical, 1 high, 0 medium, 0 low)

### 🟠 High
**`api/payments/handler.go`**

Gap 1 — Happy path returns 200 (Exit Door 1)
```go
package payments

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandlePayment_WhenCalled_ThenReturns200(t *testing.T) {
	// Arrange
	req := httptest.NewRequest(http.MethodPost, "/payment", nil)
	rr := httptest.NewRecorder()

	// Act
	HandlePayment(rr, req)

	// Assert
	if rr.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", rr.Code, http.StatusOK)
	}
}
```

### ⏭️ Skipped
- `go.sum` — dependency lock file (SKIP_PATTERNS).
- ED 2 (state), ED 3 (external call), ED 4 (queue) — comment claims external gateway but source body does not persist, call out, or publish. Per Phase 4b: exit doors not in source are dropped (comments do not count). If/when the gateway call is actually wired up, re-run smart-coverage to surface arg-mapping, upstream-failure, and timeout gaps.
- ED 5 (error path) — no error branch in source today; nothing to assert against.

### Remediation Plan
1. Create `api/payments/handler_test.go` with `TestHandlePayment_WhenCalled_ThenReturns200` asserting `rr.Code == http.StatusOK`.
2. When the external gateway call is implemented, introduce a 1-line seam (e.g. `var chargeFn = defaultCharge`) so tests can cover happy path, upstream failure, and non-2xx response without hitting the network — then re-run smart-coverage.
