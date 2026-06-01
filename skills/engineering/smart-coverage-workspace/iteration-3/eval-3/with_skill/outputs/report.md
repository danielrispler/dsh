## Coverage Gap Report

1 file changed, 3 gaps found (1 critical, 2 high, 0 medium, 0 low)

**Phase 0 detection script output:**
```json
{"files":{"api/payments/handler.go":"golang","go.sum":"golang"},"frameworks":[],"playwright":false}
```
Reference loaded: `golang.md`. No framework overlays. Playwright = false.

---

### Phase 1: Working Set

- `api/payments/handler.go` — included (HTTP handler)
- `go.sum` — excluded (matches SKIP_PATTERNS: `go.sum`)

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `api/payments/handler.go` | HTTP handler | 1, 2, 3, 4, 5 |

### Phase 3: Existing Coverage

No `*_test.go` files found. All exit doors uncovered.

### Phase 4: Gap Classification

- **Critical:** HTTP handler with no test file at all.
- **High (Exit Door 5):** Error path untested.
- **High (Exit Door 3):** `// calls external gateway` is a real external call indicator — gap valid.
- Exit Door 2 (state): dropped — no DB/cache/file write in source.
- Exit Door 4 (queue events): dropped — no queue publish in source.

---

### 🔴 Critical

**`api/payments/handler.go`**
- Missing: No test file exists — HTTP handler with zero coverage

```go
func TestHandlePayment_WhenValidRequest_ThenReturns200(t *testing.T) {
    // Arrange
    req := httptest.NewRequest(http.MethodPost, "/payment", nil)
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

Gap 1 — Error path: wrong HTTP method returns non-200 (Exit Door 5)
```go
func TestHandlePayment_WhenWrongMethod_ThenReturnsMethodNotAllowed(t *testing.T) {
    // Arrange
    req := httptest.NewRequest(http.MethodGet, "/payment", nil)
    rr := httptest.NewRecorder()

    // Act
    HandlePayment(rr, req)

    // Assert
    if rr.Code != http.StatusMethodNotAllowed {
        t.Errorf("got %d, want %d", rr.Code, http.StatusMethodNotAllowed)
    }
}
```

Gap 2 — External gateway call is invoked (Exit Door 3)
```go
func TestHandlePayment_WhenCalled_ThenGatewayIsCalled(t *testing.T) {
    // Arrange
    called := false
    testGateway := &stubGateway{onCharge: func() { called = true }}
    req := httptest.NewRequest(http.MethodPost, "/payment", nil)
    rr := httptest.NewRecorder()

    // Act
    HandlePaymentWithGateway(rr, req, testGateway)

    // Assert
    if !called {
        t.Error("expected external gateway to be called, but it was not")
    }
}
```

---

### 🟡 Medium

None.

### 🟢 Low

None.

### ✅ Already Covered

None — no test files found.

### ⏭️ Skipped

- `go.sum` — lock file; matches SKIP_PATTERNS in `golang.md`
- `api/payments/handler.go` — Exit Door 2 (state): dropped — no persistence logic in source
- `api/payments/handler.go` — Exit Door 4 (queue events): dropped — no queue publish in source

---

### Remediation Plan

1. **[Critical]** Create `api/payments/handler_test.go` — happy-path test (`When valid POST, Then returns 200`).
2. **[High]** Add error-path test — `When wrong HTTP method, Then returns 405` (Exit Door 5).
3. **[High]** Make gateway injectable and add `When called, Then gateway invoked` test (Exit Door 3).
