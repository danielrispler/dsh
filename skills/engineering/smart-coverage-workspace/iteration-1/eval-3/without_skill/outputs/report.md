# Test Coverage Gap Report

## Subject

File: `api/payments/handler.go`
Package: `payments`
Language: Go 1.21
Module: `example.com/api`

## Handler Under Analysis

```go
func HandlePayment(w http.ResponseWriter, r *http.Request) {
    // calls external gateway
    w.WriteHeader(http.StatusOK)
}
```

`HandlePayment` is a standard `http.HandlerFunc`. In its current form it:
1. Accepts any HTTP request regardless of method or body.
2. Unconditionally writes `200 OK`.
3. Contains a comment indicating it is intended to call an external payment gateway — but that call is not yet implemented.

---

## Existing Tests

None. No `handler_test.go` or any other `*_test.go` file exists in the package.

---

## Coverage Gap Report

### Critical

| # | Gap | Why Critical |
|---|-----|-------------|
| C1 | No test verifies `HandlePayment` returns `200 OK` for a valid request | Zero coverage of the only observable behavior the function currently has |
| C2 | No test verifies the function satisfies the `http.HandlerFunc` signature | Signature breakage would be caught at compile time in a test but is invisible without one |

### High

| # | Gap | Why High |
|---|-----|---------|
| H1 | HTTP method is not validated — no test documents expected vs. rejected methods | A payment endpoint should almost certainly be `POST`-only; the current code accepts `GET`, `DELETE`, etc. silently |
| H2 | No test for an unsupported method returning `405 Method Not Allowed` | Closely related to H1; the missing guard needs both a positive and a negative test |
| H3 | Request body is never read — no test with a malformed or empty body | When the gateway call is implemented, body parsing will be the first thing added; no baseline test exists to catch regressions |

### Medium

| # | Gap | Why Medium |
|---|-----|-----------|
| M1 | No test for missing or malformed `Content-Type: application/json` header | Payment APIs typically require JSON; a test asserting `415 Unsupported Media Type` documents that contract |
| M2 | No test for response headers (e.g. `Content-Type` on the response) | Callers may depend on the response content type; currently nothing is set |
| M3 | Gateway call is stubbed with a comment — no test surface for gateway errors (timeout, non-2xx, network failure) | Once implemented, error paths will need tests; a TODO comment in tests now avoids the debt later |

### Low

| # | Gap | Why Low |
|---|-----|--------|
| L1 | No benchmark for handler throughput | Not urgent, but payments are latency-sensitive |
| L2 | No test for concurrent requests (race detector) | `go test -race` would catch shared state bugs if state is introduced later |

---

## Recommended Tests to Write (Priority Order)

### 1. Happy-path smoke test (closes C1, C2)

```go
func TestHandlePayment_Returns200(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/payments", nil)
    rr := httptest.NewRecorder()

    HandlePayment(rr, req)

    if rr.Code != http.StatusOK {
        t.Errorf("expected 200, got %d", rr.Code)
    }
}
```

### 2. Reject non-POST methods (closes H1, H2)

```go
func TestHandlePayment_RejectsNonPost(t *testing.T) {
    methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}
    for _, method := range methods {
        t.Run(method, func(t *testing.T) {
            req := httptest.NewRequest(method, "/payments", nil)
            rr := httptest.NewRecorder()
            HandlePayment(rr, req)
            if rr.Code != http.StatusMethodNotAllowed {
                t.Errorf("%s: expected 405, got %d", method, rr.Code)
            }
        })
    }
}
```

### 3. Empty body returns 400 Bad Request (closes H3)

```go
func TestHandlePayment_EmptyBodyReturnsBadRequest(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/payments", http.NoBody)
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()

    HandlePayment(rr, req)

    if rr.Code != http.StatusBadRequest {
        t.Errorf("expected 400, got %d", rr.Code)
    }
}
```

### 4. Wrong Content-Type returns 415 (closes M1)

```go
func TestHandlePayment_WrongContentType(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/payments",
        strings.NewReader(`{"amount":100}`))
    req.Header.Set("Content-Type", "text/plain")
    rr := httptest.NewRecorder()

    HandlePayment(rr, req)

    if rr.Code != http.StatusUnsupportedMediaType {
        t.Errorf("expected 415, got %d", rr.Code)
    }
}
```

---

## Notes

- All four test cases use only `net/http/httptest` from the standard library — no new dependencies required.
- Tests 2, 3, and 4 are **currently failing** by design (the handler does not implement those guards yet). They should be written as red tests first, then the handler updated to make them green — consistent with a TDD approach.
- Once the external gateway call is added, a gateway interface/port should be introduced so tests can inject a fake, keeping tests fast and deterministic without real network calls.
