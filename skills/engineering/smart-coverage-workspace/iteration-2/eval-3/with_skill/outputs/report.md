## Coverage Gap Report

2 files changed, 3 gaps found (1 critical, 2 high, 0 medium, 0 low)

**Phase 0 detection script output:**
```json
{"files":{"api/payments/handler.go":"golang","go.sum":"golang"},"frameworks":[],"playwright":false}
```
References loaded: `golang.md` + `testing-principles.md`. No framework overlays, no Playwright.

---

### Phase 1: Working Set

| File | Decision |
|------|----------|
| `api/payments/handler.go` | IN — HTTP handler with observable behavior |
| `go.sum` | SKIP — matches `go.sum` in SKIP_PATTERNS |

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `api/payments/handler.go` | HTTP handler | 1, 2, 3, 4, 5 |

### Phase 3: Existing Coverage

No `*_test.go` files found anywhere in the repo. All exit doors are uncovered.

Exit Door 2 (state): no persistence in source — gap not created.
Exit Door 4 (events): no queue publish in source — gap not created.

---

### 🔴 Critical

**`api/payments/handler.go`**

- Missing: No test file exists — HTTP handler completely untested (Exit Door 1 — response)
- Suggested:

```go
func TestHandlePayment_WhenValidRequest_ThenReturns200(t *testing.T) {
    // Arrange
    body := strings.NewReader(`{"amount": 100}`)
    req := httptest.NewRequest(http.MethodPost, "/payment", body)
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()
    // Act
    HandlePayment(rr, req)
    // Assert
    if rr.Code != http.StatusOK {
        t.Errorf("got %d, want %d", rr.Code, http.StatusOK)
    }
}
```

---

### 🟠 High

**`api/payments/handler.go`**

Gap 1 — External gateway call not asserted (Exit Door 3)

The source comment `// calls external gateway` confirms an outbound call is made. No test verifies the gateway is invoked with the correct payload.

```go
func TestHandlePayment_WhenValidRequest_ThenCallsGateway(t *testing.T) {
    // Arrange
    var capturedBody []byte
    gatewayServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        capturedBody, _ = io.ReadAll(r.Body)
        w.WriteHeader(http.StatusOK)
    }))
    defer gatewayServer.Close()

    body := strings.NewReader(`{"amount": 100}`)
    req := httptest.NewRequest(http.MethodPost, "/payment", body)
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()
    // Act
    HandlePayment(rr, req) // inject gatewayURL via config/constructor when handler supports it
    // Assert
    if len(capturedBody) == 0 {
        t.Error("expected gateway to be called with a non-empty payload")
    }
}
```

Gap 2 — Error path untested (Exit Door 5)

No test verifies the handler returns a non-200 when the gateway fails.

```go
func TestHandlePayment_WhenGatewayFails_ThenReturnsError(t *testing.T) {
    // Arrange
    gatewayServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusInternalServerError)
    }))
    defer gatewayServer.Close()

    body := strings.NewReader(`{"amount": 100}`)
    req := httptest.NewRequest(http.MethodPost, "/payment", body)
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()
    // Act
    HandlePayment(rr, req) // inject failing gatewayURL
    // Assert
    if rr.Code == http.StatusOK {
        t.Errorf("expected non-200 on gateway failure, got %d", rr.Code)
    }
}
```

---

### 🟡 Medium

None.

### 🟢 Low

None.

### ✅ Already Covered

None — no test files exist.

### ⏭️ Skipped

- `go.sum` — lock file; matches `go.sum` in Go reference SKIP_PATTERNS.

---

### Remediation Plan

1. Create `api/payments/handler_test.go`. Add `TestHandlePayment_WhenValidRequest_ThenReturns200` using `httptest.NewRecorder()` + `httptest.NewRequest()` — resolves Critical gap.
2. Refactor `HandlePayment` to accept gateway URL as parameter so tests can inject a stub `httptest.NewServer` — prerequisite for Exit Door 3 assertion (High, Gap 1).
3. Add `TestHandlePayment_WhenGatewayFails_ThenReturnsError` once gateway is injectable, asserting non-200 response on downstream failure (High, Gap 2).
