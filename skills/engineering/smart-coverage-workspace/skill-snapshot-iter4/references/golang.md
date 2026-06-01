# Go Reference

## TEST_PATTERN
- `*_test.go` (co-located with source)

## TEST_SYNTAX

Standard:
```go
func TestWhenCondition_ThenOutcome(t *testing.T) {
    // Arrange
    // Act
    // Assert
}
```

Table-driven (preferred for multiple variants):
```go
func TestFunctionName(t *testing.T) {
    tests := []struct {
        name  string
        input InputType
        want  OutputType
    }{
        {"When valid input, Then returns expected", validInput, expectedOutput},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := FunctionUnderTest(tt.input)
            if got != tt.want {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

HTTP handler (always use `net/http/httptest`):
```go
func TestHandlePayment_WhenValidRequest_ThenReturns200(t *testing.T) {
    // Arrange
    body := strings.NewReader(`{"amount":100}`)
    req := httptest.NewRequest(http.MethodPost, "/payment", body)
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()
    // Act
    HandlePayment(rr, req)
    // Assert
    if rr.Code != http.StatusOK {
        t.Errorf("got %d, want %d", rr.Code, http.StatusOK)
    }
    var resp PaymentResponse
    if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
        t.Fatalf("decode: %v", err)
    }
    if resp.ID == "" {
        t.Error("expected non-empty ID")
    }
}
```

## SKIP_PATTERNS
- `go.sum`
- `vendor/`

## FILE_CLASSIFICATION
| Type | Exits | Notes |
|------|-------|-------|
| HTTP handler | All 5 | Use `net/http/httptest` |
| Service / use-case | 1,2,3,4 | |
| Repository | 3,4 | External system calls |
| Pure utility | 1 only | |
| Interface / type-only | None | Skip |
| `go.sum`, `vendor/` | None | Skip |
