# Coverage Gap Report — `api/payments/handler.go` (baseline — no skill)

> Note: `go.sum` is a dependency lock file and must not be tested.

---

## Public Interface

| Symbol | Kind | Signature |
|--------|------|-----------|
| `HandlePayment` | HTTP handler | `func HandlePayment(w http.ResponseWriter, r *http.Request)` |

---

## Coverage Gaps

### Critical

| # | Gap | Why Critical |
|---|-----|--------------|
| C1 | No test exists for `HandlePayment` at all | Zero behavioral coverage |
| C2 | No assertion that `200 OK` is returned | The sole observable side-effect is unverified |

### High

| # | Gap | Why High |
|---|-----|----------|
| H1 | HTTP method not exercised | Handler comment says it "calls external gateway" — method semantics likely significant |
| H2 | Request body ignored — no test with non-empty body | Payment handlers almost always require a payload |
| H3 | No test for unsupported methods | HTTP correctness requires method gating |

### Medium

| # | Gap | Why Medium |
|---|-----|-----------|
| M1 | Response body not asserted | Future regression adding unexpected body would be invisible |
| M2 | Response `Content-Type` header not asserted | Standard for JSON payment APIs |
| M3 | No test with cancelled/closed request context | Gateway calls should respect context cancellation |

### Low

| # | Gap | Why Low |
|---|-----|---------|
| L1 | No benchmark for handler latency | Low priority until gateway integration lands |
| L2 | No test confirming handler registered on correct route | Integration/routing test scope |

---

## Remediation Plan

**Test file to create:** `api/payments/handler_test.go`

### Priority 1 — Critical (C1, C2)

```go
package payments

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHandlePayment_WhenCalled_ThenReturns200(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/payments", nil)
    w   := httptest.NewRecorder()

    HandlePayment(w, req)

    res := w.Result()
    if res.StatusCode != http.StatusOK {
        t.Errorf("expected 200 OK, got %d", res.StatusCode)
    }
}
```

### Priority 2 — High H1 (method coverage, table-driven)

```go
func TestHandlePayment_HTTPMethods_ThenReturns200ForAllCurrentBehavior(t *testing.T) {
    methods := []string{
        http.MethodGet, http.MethodPost, http.MethodPut,
        http.MethodPatch, http.MethodDelete,
    }
    for _, method := range methods {
        t.Run("method="+method, func(t *testing.T) {
            req := httptest.NewRequest(method, "/payments", nil)
            w   := httptest.NewRecorder()
            HandlePayment(w, req)
            if got := w.Code; got != http.StatusOK {
                t.Errorf("method %s: expected 200, got %d", method, got)
            }
        })
    }
}
```

### Priority 3 — High H2 (request body)

```go
func TestHandlePayment_WhenBodyProvided_ThenReturns200(t *testing.T) {
    body := strings.NewReader(`{"amount":100,"currency":"USD"}`)
    req  := httptest.NewRequest(http.MethodPost, "/payments", body)
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    HandlePayment(w, req)
    if w.Code != http.StatusOK {
        t.Errorf("expected 200, got %d", w.Code)
    }
}
```

### Priority 4 — Medium M3 (context cancellation)

```go
func TestHandlePayment_WhenContextCancelled_ThenDoesNotPanic(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())
    cancel()
    req := httptest.NewRequest(http.MethodPost, "/payments", nil).WithContext(ctx)
    w   := httptest.NewRecorder()
    HandlePayment(w, req)
}
```

---

Note: `go.sum` listed as skipped (no explicit mention, but only `handler.go` appears in subject analysis).
