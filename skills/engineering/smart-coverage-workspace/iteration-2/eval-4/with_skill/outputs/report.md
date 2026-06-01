## Coverage Gap Report
2 files changed, 3 gaps found (1 critical, 2 high [2 sub-gaps each], 0 medium, 0 low)

**Phase 0 detection script output:**
```json
{"files":{"apps/server/upload.controller.ts":"typescript","services/resizer/resize.go":"golang"},"frameworks":[],"playwright":false}
```
References loaded: `typescript.md` (for TS files), `golang.md` (for Go files), `testing-principles.md`. Polyglot: process TypeScript group first, then Go.

---

## TypeScript

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/upload.controller.ts` | HTTP controller | All 5 |

### Phase 3: Existing Coverage

No test file found matching `*.test.ts` / `*.spec.ts` / `__tests__/**/*.ts`.

### Phase 4: Stub Detection

`uploadFile` returns a hardcoded literal `{ key: 'abc.jpg' }` with no real logic. **Stub.** All exit-door gaps labelled `[TDD]`.

### 🔴 Critical

**`apps/server/upload.controller.ts`**
- Missing: No test file exists for this HTTP controller `[TDD]`

```typescript
describe('uploadFile', () => {
  it('When a valid file upload request is made, Then returns a file key', async () => {
    // Arrange
    const mockReq = {}
    const mockReply = { send: vi.fn() }

    // Act
    await uploadFile(mockReq as any, mockReply as any)

    // Assert
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.any(String) })
    )
  })
})
```

### 🟠 High

**`apps/server/upload.controller.ts`**

Gap 1 — error path not tested `[TDD]` (Exit Door 5)
```typescript
describe('uploadFile', () => {
  it('When the upload fails, Then returns an error response with 500', async () => {
    // Arrange
    const mockReq = {}
    const mockReply = { send: vi.fn(), status: vi.fn().mockReturnThis() }

    // Act
    await uploadFile(mockReq as any, mockReply as any)

    // Assert — [TDD] red until error handling is added to the stub
    expect(mockReply.status).toHaveBeenCalledWith(500)
  })
})
```

Gap 2 — external storage call not asserted `[TDD]` (Exit Door 3)
```typescript
describe('uploadFile', () => {
  it('When a valid file is uploaded, Then the file is written to storage', async () => {
    // Arrange
    const storageSpy = vi.fn().mockResolvedValue({ key: 'abc.jpg' })
    const mockReq = { file: { filename: 'test.jpg', mimetype: 'image/jpeg' } }
    const mockReply = { send: vi.fn() }

    // Act — [TDD] inject real storage adapter; fails until stub calls storage
    await uploadFile(mockReq as any, mockReply as any)

    // Assert
    expect(storageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'test.jpg' })
    )
  })
})
```

### ✅ Already Covered
_(none)_

### ⏭️ Skipped
_(none)_

---

## Go

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `services/resizer/resize.go` | Pure utility | 1 (return value) |

### Phase 3: Existing Coverage

No test file found matching `*_test.go`.

### Phase 4: Stub Detection

`ResizeImage` body is `return nil` — hardcoded literal, no real logic. **Stub.** Gaps labelled `[TDD]`.

### 🔴 Critical
_(none — pure utility, not HTTP handler)_

### 🟠 High

**`services/resizer/resize.go`**

Gap 1 — new public function, zero tests `[TDD]` (Exit Door 1 — happy path)

```go
func TestResizeImage_WhenValidPathAndDimensions_ThenReturnsNil(t *testing.T) {
    // Arrange
    path := "testdata/sample.jpg"
    width, height := 100, 100

    // Act
    err := ResizeImage(path, width, height)

    // Assert — [TDD] trivially passes against stub; locks in the contract
    if err != nil {
        t.Errorf("expected nil error, got %v", err)
    }
}
```

Gap 2 — invalid input (missing file) not tested `[TDD]` (Exit Door 1 — error return)

```go
func TestResizeImage_WhenPathDoesNotExist_ThenReturnsError(t *testing.T) {
    // Arrange
    path := "nonexistent/file.jpg"
    width, height := 100, 100

    // Act
    err := ResizeImage(path, width, height)

    // Assert — [TDD] will fail until stub validates the path
    if err == nil {
        t.Error("expected an error for missing file, got nil")
    }
}
```

### ✅ Already Covered
_(none)_

### ⏭️ Skipped
_(none)_

---

## Remediation Plan

### TypeScript

1. Create `apps/server/upload.controller.test.ts` — Critical: HTTP controller has no test file. Write red-first with happy-path test, implement real handler logic, go green.
2. Add error-path test (`When upload fails, Then returns 500`) once `uploadFile` implements error handling (High).
3. Add external-call assertion test (`When file uploaded, Then storage adapter invoked with correct args`) once `uploadFile` delegates to real storage adapter (High).

### Go

1. Create `services/resizer/resize_test.go` with happy-path test for `ResizeImage` (`When valid path and dimensions, Then returns nil`). Write red-first — trivially passes against stub but locks in the contract (High).
2. Add error-variant test (`When path does not exist, Then returns error`) to enforce input validation (High).
