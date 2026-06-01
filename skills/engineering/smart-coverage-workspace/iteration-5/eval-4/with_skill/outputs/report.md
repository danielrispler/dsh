## Coverage Gap Report
2 files changed, 4 gaps found (2 critical, 2 high, 0 medium, 0 low) + 0 redundant.

Both files are stubs — every gap is a TDD opportunity (red-first; will fail until the stub is replaced).

---

## TypeScript

### 🔴 Critical
**`apps/server/upload.controller.ts`**
- Missing: Exit Door 1 (response) [TDD] (behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)
- Suggested:
```typescript
import { describe, it, expect } from 'vitest'
import { uploadFile } from './upload.controller'

describe('uploadFile', () => {
  it('When called, Then replies with an object containing a key string', async () => {
    // Arrange
    const sent: any[] = []
    const req = {} as any
    const reply = { send: (payload: any) => { sent.push(payload) } } as any

    // Act
    await uploadFile(req, reply)

    // Assert
    expect(sent).toHaveLength(1)
    expect(sent[0]).toHaveProperty('key')
    expect(typeof sent[0].key).toBe('string')
    expect(sent[0].key.length).toBeGreaterThan(0)
  })
})
```

### 🟠 High
**`apps/server/upload.controller.ts`**

Gap 1 — Error path on upload failure (Exit Door 5) [TDD] [REQUIRES REFACTOR]
Refactor needed: inject a storage/upload collaborator so failures can be simulated; current stub has no failure branch and no injectable seam.
```typescript
import { describe, it, expect } from 'vitest'
import { uploadFile } from './upload.controller'

describe('uploadFile error path', () => {
  it('When upload fails, Then reply emits an error response', async () => {
    // Arrange
    const sent: any[] = []
    const statuses: number[] = []
    const req = { /* fictitious — assumes refactor: req carries a failing stream */ } as any
    const reply = {
      code: (s: number) => { statuses.push(s); return reply },
      send: (payload: any) => { sent.push(payload) },
    } as any

    // Act
    await uploadFile(req, reply) // fictitious — assumes refactor

    // Assert
    expect(statuses[0]).toBeGreaterThanOrEqual(400)
    expect(sent[0]).toHaveProperty('error')
  })
})
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
- `apps/server/upload.controller.ts` Exit Door 2 (state) — dropped: stub has no persistence logic
- `apps/server/upload.controller.ts` Exit Door 3 (external call) — dropped: stub does not call any external system
- `apps/server/upload.controller.ts` Exit Door 4 (queue) — dropped: stub does not publish any event
- Blind-spots (falsy, boundary, concurrency) — dropped: no such triggers in source

---

## Go

### 🔴 Critical
**`services/resizer/resize.go`**
- Missing: Exit Door 1 (return value) [TDD] (behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)
- Suggested:
```go
package resizer

import "testing"

func TestResizeImage_WhenValidInputs_ThenReturnsNoError(t *testing.T) {
    // Arrange
    path := "testdata/sample.jpg"
    width, height := 100, 100

    // Act
    err := ResizeImage(path, width, height)

    // Assert
    if err != nil {
        t.Fatalf("expected nil error for valid input, got %v", err)
    }
}
```

### 🟠 High
**`services/resizer/resize.go`**

Gap 1 — Error path on invalid inputs (Exit Door 5) [TDD]
```go
package resizer

import "testing"

func TestResizeImage_InvalidInputs(t *testing.T) {
    tests := []struct {
        name           string
        path           string
        width, height  int
    }{
        {"When path is empty, Then returns error", "", 100, 100},
        {"When width is zero, Then returns error", "testdata/sample.jpg", 0, 100},
        {"When height is zero, Then returns error", "testdata/sample.jpg", 100, 0},
        {"When width is negative, Then returns error", "testdata/sample.jpg", -1, 100},
        {"When height is negative, Then returns error", "testdata/sample.jpg", 100, -1},
        {"When path does not exist, Then returns error", "testdata/missing.jpg", 100, 100},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ResizeImage(tt.path, tt.width, tt.height)
            if err == nil {
                t.Errorf("expected error, got nil")
            }
        })
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
- `services/resizer/resize.go` Exit Door 2 (state) — dropped: stub does not persist anything; result file write is not yet implemented in source
- `services/resizer/resize.go` Exit Door 3 (external call) — dropped: stub does not invoke any external system (no FS read, no image library)
- `services/resizer/resize.go` Exit Door 4 (queue) — dropped: stub does not publish any event
- Blind-spots concurrency — dropped: no goroutines / channels / mutexes in source
- Blind-spots boundary (`<`, `<=`) — dropped: source has no comparisons

---

### Remediation Plan

TypeScript
1. Write critical response-shape test for `uploadFile` — verify `reply.send` is invoked with an object containing a non-empty `key` string. Expect red until the stub is replaced with real upload logic.
2. Once the controller is refactored to take an injectable storage collaborator (and to set a status code on failure), add the high-severity error-path test asserting a 4xx/5xx status and an `error` field.

Go
1. Write critical happy-path test for `ResizeImage` asserting `err == nil` for a valid path/width/height. Expect red until the stub returns a real result.
2. Add the high-severity table-driven invalid-input test covering empty path, zero dimensions, negative dimensions, and missing file — each expects a non-nil error.
