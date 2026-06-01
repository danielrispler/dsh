## Coverage Gap Report
1 file changed, 7 gaps found (1 critical, 4 high, 2 medium, 0 low) + 0 redundant

### 🐛 Likely Bug Surfaced
- **`api/orders/handler.go:28-40`** — `chargeCard` treats any non-error HTTP response as success. A 500/4xx from `https://payments.example.com/charge` with an empty or non-JSON body produces `chargeID=""` and `err=nil`, so `HandleOrder` returns `201 Created` with `"charge_id":""`. Fix: after `http.Post`, check `resp.StatusCode >= 400` (or `!= 2xx`) and return an error.
- **`api/orders/handler.go:33`** — `body, _ := io.ReadAll(resp.Body)` swallows transport read errors; downstream unmarshal of a truncated body silently yields empty `ChargeID`. Fix: `if err != nil { return "", err }`.
- **`api/orders/handler.go:24`** — ignored `json.Marshal` error. Low risk for this payload shape, but the pattern is a latent bug if the struct evolves. Fix: handle the error explicitly.

### 🔴 Critical
**`api/orders/handler.go`**
- Missing: ED 1/5 — HTTP route with zero test file. `HandleOrder` is a public handler with branching status codes (405/400/502/201) and no tests at all.
- Suggested (Tier A — writeable today):
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
```

### 🟠 High

**`api/orders/handler.go`**

**Tier A — writeable today**

Gap 1 — Empty UserID rejected (Exit Door 1, boundary on `req.UserID == ""`)
```go
func TestHandleOrder_WhenUserIDIsEmpty_ThenReturns400(t *testing.T) {
    body := strings.NewReader(`{"user_id":"","amount":10}`)
    req := httptest.NewRequest(http.MethodPost, "/orders", body)
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)
    if rr.Code != http.StatusBadRequest {
        t.Fatalf("got %d, want 400", rr.Code)
    }
}
```

Gap 2 — Amount boundary at zero (Exit Door 1, boundary on `req.Amount <= 0`)
```go
func TestHandleOrder_WhenAmountIsZero_ThenReturns400(t *testing.T) {
    body := strings.NewReader(`{"user_id":"u1","amount":0}`)
    req := httptest.NewRequest(http.MethodPost, "/orders", body)
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)
    if rr.Code != http.StatusBadRequest {
        t.Fatalf("got %d, want 400", rr.Code)
    }
}

func TestHandleOrder_WhenAmountIsNegative_ThenReturns400(t *testing.T) {
    body := strings.NewReader(`{"user_id":"u1","amount":-0.01}`)
    req := httptest.NewRequest(http.MethodPost, "/orders", body)
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)
    if rr.Code != http.StatusBadRequest {
        t.Fatalf("got %d, want 400", rr.Code)
    }
}
```

Gap 3 — Empty body (no `user_id`/`amount` keys) (Exit Door 1)
```go
func TestHandleOrder_WhenBodyIsEmptyObject_ThenReturns400(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{}`))
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)
    if rr.Code != http.StatusBadRequest {
        t.Fatalf("got %d, want 400 (amount<=0 guard)", rr.Code)
    }
}
```

**Tier B — after 1-line seam `var chargeCardFn = func(userID string, amount float64) (string, error) { return chargeCard(userID, amount) }` and replacing the call site with `chargeCardFn(...)` `[REQUIRES REFACTOR]`**

Gap 4 — Happy path returns 201 with mapped order/charge IDs (Exit Doors 1 + 3 arg-mapping)
```go
func TestHandleOrder_WhenChargeSucceeds_ThenReturns201WithBody(t *testing.T) {
    // Arrange
    var gotUser string
    var gotAmount float64
    orig := chargeCardFn // fictitious — assumes refactor
    chargeCardFn = func(userID string, amount float64) (string, error) { // fictitious — assumes refactor
        gotUser, gotAmount = userID, amount
        return "ch_123", nil
    }
    t.Cleanup(func() { chargeCardFn = orig })

    body := strings.NewReader(`{"user_id":"u42","amount":19.99}`)
    req := httptest.NewRequest(http.MethodPost, "/orders", body)
    rr := httptest.NewRecorder()

    // Act
    HandleOrder(rr, req)

    // Assert — response + arg mapping into external call
    if rr.Code != http.StatusCreated { t.Fatalf("got %d, want 201", rr.Code) }
    if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
        t.Errorf("content-type %q", ct)
    }
    var resp CreateOrderResponse
    if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil { t.Fatal(err) }
    if resp.OrderID != "order_u42" { t.Errorf("OrderID=%q", resp.OrderID) }
    if resp.ChargeID != "ch_123"   { t.Errorf("ChargeID=%q", resp.ChargeID) }
    if gotUser != "u42" || gotAmount != 19.99 {
        t.Errorf("charge args=(%q,%v)", gotUser, gotAmount)
    }
}
```

Gap 5 — Upstream charge failure surfaces as 502 (Exit Door 5)
```go
func TestHandleOrder_WhenChargeReturnsError_ThenReturns502(t *testing.T) {
    orig := chargeCardFn // fictitious — assumes refactor
    chargeCardFn = func(string, float64) (string, error) { // fictitious — assumes refactor
        return "", errors.New("gateway down")
    }
    t.Cleanup(func() { chargeCardFn = orig })

    body := strings.NewReader(`{"user_id":"u1","amount":10}`)
    req := httptest.NewRequest(http.MethodPost, "/orders", body)
    rr := httptest.NewRecorder()
    HandleOrder(rr, req)

    if rr.Code != http.StatusBadGateway {
        t.Fatalf("got %d, want 502", rr.Code)
    }
}
```

### 🟡 Medium

**`api/orders/handler.go`**

**Tier C — after full DI / interface refactor `[REQUIRES REFACTOR]`** (introduce a `PaymentGateway` interface, inject into a handler constructor, and point it at `httptest.NewServer` in tests)

Gap 6 — Real HTTP path: gateway returns non-2xx → handler must NOT return 201 with empty ChargeID (covers the Likely Bug above)
```go
func TestHandleOrder_WhenGatewayReturns500_ThenReturns502(t *testing.T) {
    // Arrange — fake upstream payments service
    upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
        w.WriteHeader(http.StatusInternalServerError)
    }))
    t.Cleanup(upstream.Close)
    gw := NewHTTPGateway(upstream.URL)              // fictitious — assumes refactor
    h := NewOrderHandler(gw)                        // fictitious — assumes refactor

    req := httptest.NewRequest(http.MethodPost, "/orders",
        strings.NewReader(`{"user_id":"u1","amount":10}`))
    rr := httptest.NewRecorder()

    // Act
    h.HandleOrder(rr, req)                          // fictitious — assumes refactor

    // Assert — must NOT be 201 with empty charge_id
    if rr.Code == http.StatusCreated {
        t.Fatalf("handler reported success on upstream 500")
    }
    if rr.Code != http.StatusBadGateway {
        t.Errorf("got %d, want 502", rr.Code)
    }
}
```

Gap 7 — Gateway latency / timeout path (Exit Door 5, observability)
```go
func TestHandleOrder_WhenGatewayHangsPastTimeout_ThenReturns502(t *testing.T) {
    upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
        time.Sleep(2 * time.Second)
        w.WriteHeader(http.StatusOK)
    }))
    t.Cleanup(upstream.Close)
    gw := NewHTTPGateway(upstream.URL, WithTimeout(50*time.Millisecond)) // fictitious — assumes refactor
    h := NewOrderHandler(gw)                                              // fictitious — assumes refactor

    req := httptest.NewRequest(http.MethodPost, "/orders",
        strings.NewReader(`{"user_id":"u1","amount":10}`))
    rr := httptest.NewRecorder()
    h.HandleOrder(rr, req)                                                // fictitious — assumes refactor

    if rr.Code != http.StatusBadGateway {
        t.Fatalf("got %d, want 502 on timeout", rr.Code)
    }
}
```

### 🟢 Low
_None._

### ✅ Already Covered
_None — no existing test file for `api/orders/handler.go`._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- ED 2 (persisted state) — source does not write to any store; `"order_" + req.UserID` is a string concat, not persistence.
- ED 4 (queue events) — source does not publish messages.
- Asserting the real upstream URL `https://payments.example.com/charge` — not reachable without the Tier C refactor; covered indirectly by Gap 6 once `PaymentGateway` is injected.

### Remediation Plan
1. **Land Tier A first** — create `api/orders/handler_test.go` with Gaps from Critical + Gaps 1–3 (405, malformed JSON, empty user_id, zero/negative amount, empty object). Zero source changes required.
2. **1-line seam refactor** — in `handler.go`, add `var chargeCardFn = chargeCard` and change `HandleOrder` to call `chargeCardFn(...)`. Then add Tier B Gaps 4–5 (happy path + 502 on charge error) using a `t.Cleanup`-restored override.
3. **Fix Likely Bug** — in `chargeCard`, check `resp.StatusCode` and return an error on non-2xx; handle `io.ReadAll` and `json.Marshal` errors instead of discarding them.
4. **Full DI refactor (optional, Tier C)** — extract a `PaymentGateway` interface with a `Charge(userID, amount)` method; inject via `NewOrderHandler(gw)`; add Gaps 6–7 driving an `httptest.NewServer` upstream to lock in the non-2xx and timeout behaviors.
