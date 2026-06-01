## Coverage Gap Report
1 file changed, 4 gaps found (1 critical, 2 high, 1 medium, 0 low) + 0 redundant

### 🐛 Likely Bug Surfaced
_None._ Handler is a stub (comment claims external gateway call but body just writes 200) — flagged below under stub/TDD, not as a live bug.

### 🔴 Critical
**`api/payments/handler.go`**
- Missing: Response (ED 1) — new HTTP route with zero tests (behavior not yet implemented — red-first; will fail until stub is replaced) `[TDD]`
- Suggested:
```go
package payments

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlePayment_WhenValidPostRequest_ThenReturns200(t *testing.T) {
	// Arrange
	req := httptest.NewRequest(http.MethodPost, "/payment", strings.NewReader(`{"amount":100,"currency":"USD"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	// Act
	HandlePayment(rr, req)

	// Assert
	if rr.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rr.Code)
	}
}
```

### 🟠 High

**`api/payments/handler.go`**

**Tier A — writeable today (against current source)**

Gap 1 — Wrong HTTP method rejected (Exit Door 5) `[TDD]` (behavior not yet implemented — red-first; will fail until stub is replaced)
```go
func TestHandlePayment_WhenGetMethod_ThenReturns405(t *testing.T) {
	// Arrange
	req := httptest.NewRequest(http.MethodGet, "/payment", nil)
	rr := httptest.NewRecorder()

	// Act
	HandlePayment(rr, req)

	// Assert
	if rr.Code != http.StatusMethodNotAllowed {
		t.Fatalf("got %d, want 405", rr.Code)
	}
}
```

Gap 2 — Malformed JSON body returns 400 (Exit Door 5) `[TDD]`
```go
func TestHandlePayment_WhenMalformedJSON_ThenReturns400(t *testing.T) {
	// Arrange
	req := httptest.NewRequest(http.MethodPost, "/payment", strings.NewReader(`{not-json`))
	rr := httptest.NewRecorder()

	// Act
	HandlePayment(rr, req)

	// Assert
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400", rr.Code)
	}
}
```

**Tier B — after 1-line seam** `var chargeFn = chargeGateway` (package-level function variable so tests can swap it)

Gap 3 — Upstream gateway failure surfaces as 502 (Exit Door 5 + ED 3) `[REQUIRES REFACTOR]` `[TDD]`
```go
func TestHandlePayment_WhenGatewayFails_ThenReturns502(t *testing.T) {
	// Arrange
	original := chargeFn // fictitious — assumes refactor
	defer func() { chargeFn = original }()
	chargeFn = func(amount int, currency string) (string, error) {
		return "", errors.New("gateway timeout")
	}
	req := httptest.NewRequest(http.MethodPost, "/payment", strings.NewReader(`{"amount":100,"currency":"USD"}`))
	rr := httptest.NewRecorder()

	// Act
	HandlePayment(rr, req)

	// Assert
	if rr.Code != http.StatusBadGateway {
		t.Fatalf("got %d, want 502", rr.Code)
	}
}
```

### 🟡 Medium

**`api/payments/handler.go`**

**Tier C — after full DI refactor** (handler takes a `PaymentGateway` interface via constructor / context; enables real HTTP round-trip tests with `httptest.NewServer`)

Gap 4 — External gateway called with correctly mapped args (Exit Door 3) `[REQUIRES REFACTOR]` `[TDD]`
```go
func TestHandlePayment_WhenValidRequest_ThenCallsGatewayWithMappedArgs(t *testing.T) {
	// Arrange
	var gotAmount int
	var gotCurrency string
	fakeGateway := &fakePaymentGateway{ // fictitious — assumes refactor
		chargeFn: func(amount int, currency string) (string, error) {
			gotAmount = amount
			gotCurrency = currency
			return "txn_123", nil
		},
	}
	handler := NewPaymentHandler(fakeGateway) // fictitious — assumes refactor
	req := httptest.NewRequest(http.MethodPost, "/payment", strings.NewReader(`{"amount":4200,"currency":"EUR"}`))
	rr := httptest.NewRecorder()

	// Act
	handler.ServeHTTP(rr, req)

	// Assert
	if gotAmount != 4200 {
		t.Errorf("amount: got %d, want 4200", gotAmount)
	}
	if gotCurrency != "EUR" {
		t.Errorf("currency: got %q, want EUR", gotCurrency)
	}
}
```

### 🟢 Low
_None._

### ✅ Already Covered
_None._ No `handler_test.go` exists.

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `go.sum` — generated manifest (SKIP_PATTERNS).
- ED 2 (state persistence) on `handler.go` — source does not persist anything; comments do not count (Phase 4b rule).
- ED 4 (queue events) on `handler.go` — source does not publish anything (Phase 4b rule).
- Native external-HTTP gateway integration — no injectable seam; would require fictitious API. Route to unlock: Phase 4a Tier B (1-line `var chargeFn` seam) or Tier C (full interface DI).

### Remediation Plan
1. Create `api/payments/handler_test.go` with the 🔴 Critical happy-path test (Gap 1) — will fail red until handler decodes request and returns success/failure correctly. This is the TDD anchor.
2. Add Tier A error-path tests (Gaps 1 & 2: wrong-method 405, malformed-JSON 400). Writeable today; force handler to grow real input validation.
3. Apply the 1-line seam: introduce `var chargeFn = realChargeGateway` at package level so the handler delegates the external call through it. Then add Gap 3 (gateway-failure → 502) to cover ED 5 + ED 3 together.
4. Optional follow-up (Tier C): refactor to a `PaymentGateway` interface injected via `NewPaymentHandler(gw)`. Unlocks Gap 4 (arg-mapping assertion) plus future tests for retries, timeouts, and real `httptest.NewServer` round-trips.
