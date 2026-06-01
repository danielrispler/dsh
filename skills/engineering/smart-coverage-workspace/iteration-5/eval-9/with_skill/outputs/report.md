## Coverage Gap Report
1 file changed, 6 gaps found (1 critical, 5 high, 0 medium, 0 low) + 0 redundant

### 🔴 Critical
**`api/orders/handler.go`**
- Missing: HTTP route has no test file at all (`api/orders/handler_test.go` absent). `HandleOrder` is a new public HTTP handler with branching logic and zero coverage.
- Suggested: bootstrap `api/orders/handler_test.go` with the table-driven sketches below (start with the happy-path 201 sketch under High → Gap 1).

### 🟠 High
**`api/orders/handler.go`**

Gap 1 — Happy path returns 201 with Content-Type json (Exit Door 1)
```go
func TestHandleOrder_WhenValidPost_ThenReturns201(t *testing.T) {
    // Arrange
    body := strings.NewReader(`{"user_id":"u1","amount":12.5}`)
    req := httptest.NewRequest(http.MethodPost, "/orders", body)
    rr := httptest.NewRecorder()

    // Act
    HandleOrder(rr, req)

    // Assert
    // NOTE: with the current source, this assertion depends on the live
    // https://payments.example.com/charge endpoint. Until chargeCard is
    // made substitutable (see Gap 5), this test will be flaky or fail in
    // CI. Asserting status + Content-Type is the most that can be done
    // without a refactor; body shape requires the refactor in Gap 5.
    if rr.Code != http.StatusCreated {
        t.Fatalf("status: got %d, want 201", rr.Code)
    }
    if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
        t.Errorf("content-type: got %q, want application/json", ct)
    }
}
```

Gap 2 — Non-POST method returns 405 (Exit Door 5)
```go
func TestHandleOrder_WhenMethodNotPost_ThenReturns405(t *testing.T) {
    tests := []struct {
        name   string
        method string
    }{
        {"When GET, Then 405", http.MethodGet},
        {"When PUT, Then 405", http.MethodPut},
        {"When DELETE, Then 405", http.MethodDelete},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            req := httptest.NewRequest(tt.method, "/orders", nil)
            rr := httptest.NewRecorder()

            // Act
            HandleOrder(rr, req)

            // Assert
            if rr.Code != http.StatusMethodNotAllowed {
                t.Errorf("got %d, want 405", rr.Code)
            }
        })
    }
}
```

Gap 3 — Malformed JSON body returns 400 (Exit Door 5)
```go
func TestHandleOrder_WhenBodyNotJSON_ThenReturns400(t *testing.T) {
    // Arrange
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{not json`))
    rr := httptest.NewRecorder()

    // Act
    HandleOrder(rr, req)

    // Assert
    if rr.Code != http.StatusBadRequest {
        t.Fatalf("got %d, want 400", rr.Code)
    }
}
```

Gap 4 — Empty user_id or non-positive amount returns 400 (Exit Door 1, falsy/boundary blind spot)
```go
func TestHandleOrder_WhenValidationFails_ThenReturns400(t *testing.T) {
    tests := []struct {
        name string
        body string
    }{
        {"When user_id empty, Then 400", `{"user_id":"","amount":10}`},
        {"When amount zero, Then 400", `{"user_id":"u1","amount":0}`},
        {"When amount negative, Then 400", `{"user_id":"u1","amount":-1}`},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(tt.body))
            rr := httptest.NewRecorder()

            // Act
            HandleOrder(rr, req)

            // Assert
            if rr.Code != http.StatusBadRequest {
                t.Errorf("got %d, want 400 (body=%s)", rr.Code, tt.body)
            }
        })
    }
}
```

Gap 5 — Payment gateway failure returns 502 (Exit Door 3 + Exit Door 5) [REQUIRES REFACTOR]
Refactor needed: extract a `Charger` interface (or `func(userID string, amount float64) (string, error)` field) on a new `OrderHandler` struct so tests can substitute the payment call instead of hitting `https://payments.example.com/charge`. Without this, the external-call exit door has no injectable seam.
```go
func TestHandleOrder_WhenChargeFails_ThenReturns502(t *testing.T) {
    // Arrange
    handler := &OrderHandler{ // fictitious — assumes refactor
        Charge: func(userID string, amount float64) (string, error) {
            return "", errors.New("gateway down")
        },
    }
    req := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{"user_id":"u1","amount":10}`))
    rr := httptest.NewRecorder()

    // Act
    handler.ServeHTTP(rr, req)

    // Assert
    if rr.Code != http.StatusBadGateway {
        t.Errorf("got %d, want 502", rr.Code)
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
- `api/orders/handler.go` Exit Door 2 (state) — dropped: source has no persistence (no DB/cache/file write).
- `api/orders/handler.go` Exit Door 4 (queue events) — dropped: source publishes nothing.
- `api/orders/handler.go` Exit Door 3 happy-path assertion on the outbound `https://payments.example.com/charge` call (correct URL, method, payload shape) — no injectable seam in current source; asserting it would require fictitious API. Folded into Gap 5 above as a refactor-tagged item rather than emitted twice.

### Remediation Plan
1. Create `api/orders/handler_test.go` with the Gap 2 (405), Gap 3 (malformed JSON), and Gap 4 (validation 400) tests — these run today against real `httptest.NewRecorder()` + `httptest.NewRequest()` with zero changes to `handler.go`.
2. Add Gap 1 (happy-path 201 + Content-Type) with a note that body-shape assertion is deferred until the refactor lands; status/header assertions still provide signal.
3. Refactor `HandleOrder` to accept a substitutable charger (interface or func field on a handler struct), then add Gap 5 (502 on gateway failure) and tighten Gap 1 to assert `order_id` / `charge_id` in the response body.
