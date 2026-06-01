## Coverage Gap Report

1 file changed, 3 gaps found (0 critical, 2 high, 0 medium, 0 low)

---

## Go

### 🔴 Critical

**`api/payments/handler.go`**

- Missing: Exit Door 1 — Happy-path HTTP response (no test file exists at all)
- Suggested:

```go
func TestHandlePayment_WhenValidRequest_ThenReturns200WithBody(t *testing.T) {
    // Arrange
    body := strings.NewReader(`{"amount":100,"currency":"USD"}`)
    req := httptest.NewRequest(http.MethodPost, "/payment", body)
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()

    // Act
    HandlePayment(rr, req)

    // Assert
    if rr.Code != http.StatusOK {
        t.Errorf("got status %d, want %d", rr.Code, http.StatusOK)
    }
    var resp PaymentResponse
    if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
        t.Fatalf("failed to decode response: %v", err)
    }
    if resp.ID == "" {
        t.Error("expected non-empty ID in response")
    }
    if resp.Amount != 100 {
        t.Errorf("got amount %d, want 100", resp.Amount)
    }
}
```

---

### 🟠 High

**`api/payments/handler.go`**

Gap 1 — Invalid JSON body returns 400 (Exit Door 5)

```go
func TestHandlePayment_WhenBodyIsInvalidJSON_ThenReturns400(t *testing.T) {
    // Arrange
    body := strings.NewReader(`not-json`)
    req := httptest.NewRequest(http.MethodPost, "/payment", body)
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()

    // Act
    HandlePayment(rr, req)

    // Assert
    if rr.Code != http.StatusBadRequest {
        t.Errorf("got status %d, want %d", rr.Code, http.StatusBadRequest)
    }
}
```

Gap 2 — Non-positive amount returns 400 (Exit Door 5)

```go
func TestHandlePayment_WhenAmountIsZeroOrNegative_ThenReturns400(t *testing.T) {
    tests := []struct {
        name   string
        amount int
    }{
        {"When amount is zero, Then returns 400", 0},
        {"When amount is negative, Then returns 400", -50},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            payload := fmt.Sprintf(`{"amount":%d,"currency":"USD"}`, tt.amount)
            body := strings.NewReader(payload)
            req := httptest.NewRequest(http.MethodPost, "/payment", body)
            req.Header.Set("Content-Type", "application/json")
            rr := httptest.NewRecorder()

            // Act
            HandlePayment(rr, req)

            // Assert
            if rr.Code != http.StatusBadRequest {
                t.Errorf("got status %d, want %d", rr.Code, http.StatusBadRequest)
            }
        })
    }
}
```

---

### 🟡 Medium

_None._

---

### 🟢 Low

_None._

---

### ✅ Already Covered

_None — no test file exists._

---

### ⏭️ Skipped

- `go.sum` — lock file; matches SKIP_PATTERNS in golang.md, no behavior to test.
- `api/payments/handler.go` — Exit Door 2 (state): dropped — source contains no persistence logic (no DB call, cache write, or file write).
- `api/payments/handler.go` — Exit Door 3 (external call): dropped — source contains no actual call to an external payment gateway. The comment `// NOTE: payment gateway not yet integrated — hardcoded response for now` is a TODO, not real code. No gateway call exists in the function body.
- `api/payments/handler.go` — Exit Door 4 (queue events): dropped — source publishes nothing to any queue.

---

### Remediation Plan

1. **[Critical]** Create `api/payments/handler_test.go` with a happy-path test covering Exit Door 1: POST a valid `{"amount":100,"currency":"USD"}` body, assert HTTP 200 and a non-empty `id` field in the JSON response.
2. **[High]** Add an error-path test for malformed JSON input: assert HTTP 400 is returned when the request body cannot be decoded.
3. **[High]** Add an error-path test for non-positive `amount` values (0 and negative): assert HTTP 400 is returned for both boundary values.
