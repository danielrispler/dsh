# Coverage Gap Report

1 file changed, 5 gaps found (1 critical, 2 high, 1 medium, 1 low)

## Go

### 🔴 Critical

**`api/payments/handler.go`**
- Missing: No test file exists at all for this HTTP handler
- Suggested: `When a valid payment request is received, Then HTTP 200 is returned`

### 🟠 High

**`api/payments/handler.go`**

Gap 1 — Error path / failure response (Exit Door 5)
- `func TestHandlePayment_WhenGatewayCallFails_ThenReturns5xx(t *testing.T)`

Gap 2 — External call assertion (Exit Door 3)
- `func TestHandlePayment_WhenCalled_ThenGatewayInvokedWithCorrectParams(t *testing.T)`

### 🟡 Medium

**`api/payments/handler.go`**

Gap 1 — State verification (Exit Door 2)
- `func TestHandlePayment_WhenPaymentProcessed_ThenRecordObservableViaPublicAPI(t *testing.T)`

### 🟢 Low

Gap 1 — Additional response shape variants (Exit Door 1)
- `func TestHandlePayment_WhenMalformedRequest_ThenReturns400(t *testing.T)`

### ✅ Already Covered
_(none)_

### ⏭️ Skipped
- `go.sum` — lock file (matches SKIP_PATTERNS in golang.md)

### Remediation Plan

1. Create `api/payments/handler_test.go` — happy-path using `net/http/httptest`: `When valid payment request, Then HTTP 200`.
2. Add error-path test: `When external gateway fails, Then returns 5xx`.
3. Add external-call assertion via test-double gateway injected through public interface.
4. Add state-verification test: `When payment processed, Then record readable via public API`.
5. Add edge-case: `When malformed request body, Then HTTP 400`.
