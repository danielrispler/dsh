## Coverage Gap Report
1 file changed, 7 gaps found (1 critical, 4 high, 1 medium, 1 low)

### 🐛 Likely Bug Surfaced
**`api/orders/handler.go:28-40`** — `chargeCard` never checks `resp.StatusCode`; a 4xx/5xx from the gateway with an empty/garbage body is treated as success and returns `ChargeID=""`, so `HandleOrder` responds `201 Created` with `charge_id:""`. Fix: `if resp.StatusCode < 200 || resp.StatusCode >= 300 { return "", fmt.Errorf("charge failed: %s", resp.Status) }` before reading the body.

**`api/orders/handler.go:24`** — `json.Marshal` error is discarded (`payload, _ := ...`). Any marshal failure produces a nil payload that is silently POSTed. Fix: `payload, err := json.Marshal(...); if err != nil { return "", err }`.

**`api/orders/handler.go:33`** — `io.ReadAll` error is discarded (`body, _ := ...`). A truncated response body becomes a successful empty parse. Fix: `body, err := io.ReadAll(resp.Body); if err != nil { return "", err }`.

**`api/orders/handler.go:28`** — Hardcoded `https://payments.example.com/charge` with package-level `http.Post` means there is no seam for tests, no timeout, and no way to point at a sandbox in non-prod. Fix: extract `var chargeCardFn = chargeCard` (1-line seam, unlocks Tier B) and longer-term move the URL + `*http.Client` behind a struct (Tier C).

### 🔴 Critical
**`api/orders/handler.go`** — HTTP route with zero tests. At minimum the method-guard and validation paths are writeable today against current source with no refactor.

**Tier A — writeable today (no source change)**

```go
package orders

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestHandleOrder_WhenMethodIsGet_ThenReturns405(t *testing.T) {
    // Arrange
    req := httptest.NewRequest(http.MethodGet, "/orders", nil)
    rr := httptest.NewRecorder()
    // Act
    HandleOrder(rr, req)
    // Assert
    if rr.Code != http.StatusMethodNotAllowed {
        t.Fatalf("got %d, want 405", rr.Code)
    }
}

func TestHandleOrder_WhenBodyIsMalformedJSON_ThenReturns400(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{not json`))
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)
    if rr.Code != http.StatusBadRequest {
        t.Fatalf("got %d, want 400", rr.Code)
    }
}

func TestHandleOrder_WhenValidationFails_ThenReturns400(t *testing.T) {
    tests := []struct {
        name string
        body string
    }{
        {"When user_id is empty, Then 400", `{"user_id":"","amount":10}`},
        {"When amount is zero, Then 400", `{"user_id":"u1","amount":0}`},
        {"When amount is negative, Then 400", `{"user_id":"u1","amount":-5}`},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(tt.body))
            rr := httptest.NewRecorder()
            HandleOrder(rr, req)
            if rr.Code != http.StatusBadRequest {
                t.Fatalf("got %d, want 400", rr.Code)
            }
        })
    }
}
```

### 🟠 High

**`api/orders/handler.go`** — Happy path (ED 1 response shape + status) `[REQUIRES REFACTOR]`

Blocked by the package-level `chargeCard` call; cannot be exercised without hitting `payments.example.com`. Unlocked by the 1-line seam in Phase 4a.

**Tier B — after adding `var chargeCardFn = chargeCard` and changing line 57 to `chargeCardFn(...)`**

```go
func TestHandleOrder_WhenChargeSucceeds_ThenReturns201WithOrderAndChargeID(t *testing.T) {
    // Arrange
    orig := chargeCardFn
    defer func() { chargeCardFn = orig }()
    chargeCardFn = func(userID string, amount float64) (string, error) {
        if userID != "u1" || amount != 42.5 {
            t.Fatalf("chargeCard got (%q,%v), want (u1,42.5)", userID, amount)
        }
        return "ch_123", nil
    }
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{"user_id":"u1","amount":42.5}`))
    rr := httptest.NewRecorder()
    // Act
    HandleOrder(rr, req)
    // Assert
    if rr.Code != http.StatusCreated {
        t.Fatalf("got %d, want 201", rr.Code)
    }
    if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
        t.Errorf("Content-Type = %q, want application/json", ct)
    }
    var out CreateOrderResponse
    if err := json.NewDecoder(rr.Body).Decode(&out); err != nil {
        t.Fatalf("decode: %v", err)
    }
    if out.OrderID != "order_u1" || out.ChargeID != "ch_123" {
        t.Errorf("got %+v", out)
    }
}
```

**`api/orders/handler.go`** — Upstream failure → 502 (ED 5 error path) `[REQUIRES REFACTOR]`

**Tier B**

```go
func TestHandleOrder_WhenChargeFails_ThenReturns502(t *testing.T) {
    orig := chargeCardFn
    defer func() { chargeCardFn = orig }()
    chargeCardFn = func(string, float64) (string, error) {
        return "", errors.New("gateway down")
    }
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{"user_id":"u1","amount":10}`))
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)
    if rr.Code != http.StatusBadGateway {
        t.Fatalf("got %d, want 502", rr.Code)
    }
}
```

**`api/orders/handler.go`** — Argument mapping into `chargeCard` (ED 3 external-call correctness) `[REQUIRES REFACTOR]`

Already asserted inline in the happy-path Tier B test above (the `userID/amount` check inside the fake). Listed separately so the gap is not lost if the happy-path test is later trimmed.

**`api/orders/handler.go:28-40`** — Non-2xx gateway response is silently treated as success (the bug surfaced above). Tier B test only becomes meaningful **after** the bug is fixed; until then this test would fail-by-design and document the bug.

**Tier C — after extracting `chargeCard` behind an interface or `*http.Client` with injectable URL**

```go
// fictitious — assumes refactor that lets us point chargeCard at httptest.NewServer
func TestHandleOrder_WhenGatewayReturns500_ThenReturns502(t *testing.T) {
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
        w.WriteHeader(http.StatusInternalServerError)
        w.Write([]byte(`{}`))
    }))
    defer srv.Close()
    // depends on refactor exposing a way to set gateway URL on a handler instance
    h := NewOrderHandler(srv.URL)               // fictitious — assumes refactor
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{"user_id":"u1","amount":10}`))
    rr := httptest.NewRecorder()
    h.ServeHTTP(rr, req)
    if rr.Code != http.StatusBadGateway {
        t.Fatalf("got %d, want 502 once bug is fixed", rr.Code)
    }
}
```

### 🟡 Medium

**`api/orders/handler.go`** — Boundary at `req.Amount <= 0`: the just-above-zero case (`0.01`) is the smallest positive value that should pass. Covered transitively by the happy path, but worth pinning as an explicit boundary test.

**Tier B**

```go
func TestHandleOrder_WhenAmountIsSmallestPositive_ThenReturns201(t *testing.T) {
    orig := chargeCardFn
    defer func() { chargeCardFn = orig }()
    chargeCardFn = func(string, float64) (string, error) { return "ch_ok", nil }
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{"user_id":"u1","amount":0.01}`))
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)
    if rr.Code != http.StatusCreated {
        t.Fatalf("got %d, want 201", rr.Code)
    }
}
```

### 🟢 Low

**`api/orders/handler.go`** — Empty request body (`Content-Length: 0`) is a distinct decode-failure variant from "malformed JSON". Cheap to add to the table-driven 400 test.

### ⏭️ Skipped
- `api/orders/handler.go` chargeCard happy/error paths against a real `httptest.NewServer` — `no injectable seam — would require fictitious API`. Unlock via Phase 4a Tier C (extract URL + `*http.Client` behind a struct).

### Remediation Plan
1. Add `api/orders/handler_test.go` with the three Tier A tests (method guard, malformed JSON, validation table). No source change required.
2. Fix the non-2xx-treated-as-success bug in `chargeCard` (Phase 4a § Likely Bug).
3. Fix the two discarded errors (`json.Marshal`, `io.ReadAll`) in `chargeCard`.
4. Add the 1-line seam `var chargeCardFn = chargeCard` and change line 57 to call `chargeCardFn`. Then add the Tier B tests: happy path (asserts 201 + body + arg mapping), gateway failure → 502, smallest-positive-amount boundary.
5. (Follow-up refactor) Extract `chargeCard` behind a struct that takes gateway URL + `*http.Client`, then add Tier C tests using `httptest.NewServer` for real HTTP behavior (non-2xx, timeouts, malformed body).
