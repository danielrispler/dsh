## Coverage Gap Report

2 files changed, 6 gaps found (2 critical, 2 high, 2 medium, 0 low)

---

## TypeScript

### Phase 1 — Changed Files

| File | Language |
|------|----------|
| `apps/server/upload.controller.ts` | TypeScript |

### Phase 2 — File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/upload.controller.ts` | HTTP controller | 1 (Response), 2 (New State), 3 (External Calls), 4 (Message Queue Events), 5 (Observability) |

### Phase 3 — Existing Coverage

No test files found (`*.test.ts`, `*.spec.ts`, `__tests__/**/*.ts`). Zero coverage.

### Stub Detection

`upload.controller.ts` is a stub: `uploadFile` returns a hardcoded literal `{ key: 'abc.jpg' }` with no real logic. All exit-door gaps are tagged `[TDD]`.

Exit Door 2 (state): no persistence logic in source — **dropped**.
Exit Door 3 (external calls): no external system call in source — **dropped**.
Exit Door 4 (queue events): no publish logic in source — **dropped**.

---

### 🔴 Critical

**`apps/server/upload.controller.ts`** [TDD]
- Missing: HTTP route with no test file at all (Exit Door 1 — Response)
- Suggested:
```typescript
describe('uploadFile', () => {
  it('When valid request, Then returns 200 with file key', async () => {
    // Arrange
    const req = {} as any
    const reply = { send: vi.fn() } as any

    // Act
    await uploadFile(req, reply)

    // Assert
    expect(reply.send).toHaveBeenCalledWith({ key: expect.any(String) })
  })
})
```
*(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)*

---

### 🟠 High

**`apps/server/upload.controller.ts`** [TDD]

Gap 1 — Error path untested (Exit Door 5 — Observability)
```typescript
describe('uploadFile', () => {
  it('When upload fails, Then returns 500 with error response', async () => {
    // Arrange
    const req = { simulateError: true } as any
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() } as any

    // Act
    await uploadFile(req, reply)

    // Assert
    expect(reply.status).toHaveBeenCalledWith(500)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    )
  })
})
```
*(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)*

---

### 🟡 Medium

**`apps/server/upload.controller.ts`** [TDD]

Gap 1 — Missing variant: invalid/missing file in request (Exit Door 1 — Response)
```typescript
describe('uploadFile', () => {
  it('When request has no file, Then returns 400 with validation error', async () => {
    // Arrange
    const req = { body: {} } as any
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() } as any

    // Act
    await uploadFile(req, reply)

    // Assert
    expect(reply.status).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    )
  })
})
```
*(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)*

---

### ✅ Already Covered

*(none)*

### ⏭️ Skipped

- `apps/server/upload.controller.ts` — Exit Door 2 (state): dropped — no persistence logic in source
- `apps/server/upload.controller.ts` — Exit Door 3 (external calls): dropped — no external system call in source
- `apps/server/upload.controller.ts` — Exit Door 4 (queue events): dropped — no publish logic in source

---

## Go

### Phase 1 — Changed Files

| File | Language |
|------|----------|
| `services/resizer/resize.go` | Go |

### Phase 2 — File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `services/resizer/resize.go` | Pure utility / service | 1 (Response/return value), 5 (Observability) |

> `ResizeImage` returns an `error` (pure return value). No HTTP handler, no persistence, no external call, no queue publish detected in source.

### Phase 3 — Existing Coverage

No test files found (`*_test.go`). Zero coverage.

### Stub Detection

`resize.go` is a stub: `ResizeImage` returns `nil` unconditionally with no real logic. All exit-door gaps are tagged `[TDD]`.

Exit Door 2 (state): no persistence logic in source — **dropped**.
Exit Door 3 (external calls): no external system call in source — **dropped**.
Exit Door 4 (queue events): no publish logic in source — **dropped**.

---

### 🔴 Critical

**`services/resizer/resize.go`** [TDD]
- Missing: new file with public function and no test file at all (Exit Door 1 — Response)
- Suggested:
```go
func TestResizeImage_WhenValidArgs_ThenReturnsNilError(t *testing.T) {
    // Arrange
    path := "testdata/sample.jpg"
    width, height := 100, 100

    // Act
    err := ResizeImage(path, width, height)

    // Assert
    if err != nil {
        t.Errorf("expected nil error, got %v", err)
    }
}
```
*(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)*

---

### 🟠 High

**`services/resizer/resize.go`** [TDD]

Gap 1 — Error path untested (Exit Door 5 — Observability)
```go
func TestResizeImage_WhenInvalidPath_ThenReturnsError(t *testing.T) {
    // Arrange
    path := "nonexistent/image.jpg"
    width, height := 100, 100

    // Act
    err := ResizeImage(path, width, height)

    // Assert
    if err == nil {
        t.Error("expected an error for nonexistent file, got nil")
    }
}
```
*(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)*

---

### 🟡 Medium

**`services/resizer/resize.go`** [TDD]

Gap 1 — Missing variant: zero/negative dimensions (Exit Door 1 — Response)
```go
func TestResizeImage_WhenZeroDimensions_ThenReturnsError(t *testing.T) {
    tests := []struct {
        name          string
        width, height int
    }{
        {"When width is zero, Then returns error", 0, 100},
        {"When height is zero, Then returns error", 100, 0},
        {"When both dimensions are zero, Then returns error", 0, 0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            path := "testdata/sample.jpg"

            // Act
            err := ResizeImage(path, tt.width, tt.height)

            // Assert
            if err == nil {
                t.Errorf("expected error for dimensions (%d, %d), got nil", tt.width, tt.height)
            }
        })
    }
}
```
*(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)*

---

### ✅ Already Covered

*(none)*

### ⏭️ Skipped

- `services/resizer/resize.go` — Exit Door 2 (state): dropped — no persistence logic in source
- `services/resizer/resize.go` — Exit Door 3 (external calls): dropped — no external system call in source
- `services/resizer/resize.go` — Exit Door 4 (queue events): dropped — no publish logic in source

---

## Remediation Plan

### TypeScript

1. Create `apps/server/upload.controller.test.ts`. Write the Critical test first (red): `When valid request, Then returns 200 with file key` — assert `reply.send` receives an object with a `key` string. Run it red. Then implement real upload logic to make it green.
2. Add the High gap test (red): `When upload fails, Then returns 500 with error response` — assert `reply.status(500)` and an error body. Run it red. Then implement the error-handling branch.
3. Add the Medium gap test (red): `When request has no file, Then returns 400 with validation error` — assert `reply.status(400)` and an error body. Run it red. Then implement the validation branch.

### Go

1. Create `services/resizer/resize_test.go`. Write the Critical test first (red): `TestResizeImage_WhenValidArgs_ThenReturnsNilError` — assert `err == nil` for valid input. Run it red. Then implement real resize logic to make it green.
2. Add the High gap test (red): `TestResizeImage_WhenInvalidPath_ThenReturnsError` — assert `err != nil` for a nonexistent file path. Run it red. Then implement the file-not-found error path.
3. Add the Medium gap test (red): `TestResizeImage_WhenZeroDimensions_ThenReturnsError` — table-driven, assert `err != nil` for zero/negative width or height. Run it red. Then implement the dimension-validation branch.
