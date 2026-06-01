## Coverage Gap Report
2 files changed, 6 gaps found (2 critical, 4 high, 0 medium, 0 low) + 0 redundant

### 🐛 Likely Bug Surfaced
_None._ (Both files are stubs — no logic to critique yet. Boundary/validation concerns are captured as [TDD] gaps below so the red tests pin down required behavior before implementation.)

---

## TypeScript

### 🔴 Critical
**`apps/server/upload.controller.ts`**
- Missing: ED 1 (HTTP response) — handler is a stub returning a hardcoded `{ key: 'abc.jpg' }`; no test file exists for this route.
- Suggested:
```typescript
// upload.controller.test.ts
import Fastify from 'fastify'
import { describe, it, expect } from 'vitest'
import { uploadFile } from './upload.controller'

describe('uploadFile', () => {
  it('When valid multipart upload arrives, Then responds 200 with storage key [TDD] (behavior not yet implemented — red-first; will fail until stub is replaced)', async () => {
    // Arrange
    const app = Fastify()
    app.post('/upload', uploadFile)
    // Act
    const res = await app.inject({
      method: 'POST',
      url: '/upload',
      payload: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG magic bytes
      headers: { 'content-type': 'image/jpeg' },
    })
    // Assert
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('key')
    expect(typeof body.key).toBe('string')
    expect(body.key.length).toBeGreaterThan(0)
  })
})
```

### 🟠 High
**`apps/server/upload.controller.ts`**

Gap 1 — Missing content-type rejection (ED 5, error path) [TDD] (behavior not yet implemented — red-first; will fail until stub is replaced)
```typescript
import Fastify from 'fastify'
import { describe, it, expect } from 'vitest'
import { uploadFile } from './upload.controller'

describe('uploadFile — unsupported media type', () => {
  it('When body is not an image, Then responds 415', async () => {
    // Arrange
    const app = Fastify()
    app.post('/upload', uploadFile)
    // Act
    const res = await app.inject({
      method: 'POST',
      url: '/upload',
      payload: 'plain text',
      headers: { 'content-type': 'text/plain' },
    })
    // Assert
    expect(res.statusCode).toBe(415)
  })
})
```

Gap 2 — Missing empty-body rejection (ED 5, error path) [TDD] (behavior not yet implemented — red-first; will fail until stub is replaced)
```typescript
import Fastify from 'fastify'
import { describe, it, expect } from 'vitest'
import { uploadFile } from './upload.controller'

describe('uploadFile — empty body', () => {
  it('When request has no body, Then responds 400', async () => {
    // Arrange
    const app = Fastify()
    app.post('/upload', uploadFile)
    // Act
    const res = await app.inject({
      method: 'POST',
      url: '/upload',
      payload: '',
      headers: { 'content-type': 'image/jpeg' },
    })
    // Assert
    expect(res.statusCode).toBe(400)
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
- `apps/server/upload.controller.ts` — ED 2 (new state) skipped: source does not persist anything (stub rule: do not invent state-write expectations not in the diff).
- `apps/server/upload.controller.ts` — ED 3 (external call) skipped: source does not call any storage/object-store client (stub rule).
- `apps/server/upload.controller.ts` — ED 4 (message queue) skipped: source publishes no events (stub rule).

---

## Go

### 🔴 Critical
**`services/resizer/resize.go`**
- Missing: ED 1 (return value) — `ResizeImage` is a stub returning `nil`; no `*_test.go` file exists.
- Suggested:
```go
// resize_test.go
package resizer

import "testing"

func TestResizeImage_WhenValidPathAndDims_ThenReturnsNoError(t *testing.T) {
    // Arrange
    path := "testdata/sample.jpg" // committed fixture
    // Act
    err := ResizeImage(path, 200, 200)
    // Assert
    // [TDD] (behavior not yet implemented — red-first; will fail until stub is replaced)
    if err != nil {
        t.Fatalf("expected nil error for valid input, got %v", err)
    }
}
```

### 🟠 High
**`services/resizer/resize.go`**

Gap 1 — Boundary: non-positive dimensions must error (ED 5) [TDD] (behavior not yet implemented — red-first; will fail until stub is replaced)
```go
package resizer

import "testing"

func TestResizeImage_BoundaryDims(t *testing.T) {
    tests := []struct {
        name   string
        width  int
        height int
    }{
        {"When width is 0, Then returns error", 0, 100},
        {"When height is 0, Then returns error", 100, 0},
        {"When width is negative, Then returns error", -1, 100},
        {"When height is negative, Then returns error", 100, -1},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            path := "testdata/sample.jpg"
            // Act
            err := ResizeImage(path, tt.width, tt.height)
            // Assert
            if err == nil {
                t.Errorf("expected error for w=%d h=%d, got nil", tt.width, tt.height)
            }
        })
    }
}
```

Gap 2 — Error path: missing/empty path must error (ED 5) [TDD] (behavior not yet implemented — red-first; will fail until stub is replaced)
```go
package resizer

import "testing"

func TestResizeImage_InvalidPath(t *testing.T) {
    tests := []struct {
        name string
        path string
    }{
        {"When path is empty, Then returns error", ""},
        {"When file does not exist, Then returns error", "/no/such/file.jpg"},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Act
            err := ResizeImage(tt.path, 100, 100)
            // Assert
            if err == nil {
                t.Errorf("expected error for path=%q, got nil", tt.path)
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
- `services/resizer/resize.go` — ED 2 (state/file write) skipped: source does not write output anywhere (stub rule — no `os.Create`, no `io.Writer` argument).
- `services/resizer/resize.go` — ED 3 (external call) skipped: signature exposes no FFmpeg / object-store / HTTP collaborator (stub rule).
- `services/resizer/resize.go` — ED 4 (queue events) skipped: source publishes no events.

---

### Remediation Plan

**TypeScript (`apps/server/upload.controller.ts`)**
1. Create `apps/server/upload.controller.test.ts` with the Critical Fastify `app.inject()` happy-path test (ED 1, [TDD]).
2. Add the 415 unsupported-media-type test (ED 5, [TDD]).
3. Add the 400 empty-body test (ED 5, [TDD]).
4. Implement `uploadFile` so the three red tests turn green (parse multipart/body, validate content-type, return generated key).

**Go (`services/resizer/resize.go`)**
5. Create `services/resizer/resize_test.go` with the Critical happy-path test (ED 1, [TDD]); commit a small `testdata/sample.jpg` fixture.
6. Add the table-driven boundary test for `width`/`height` ≤ 0 (ED 5, [TDD]).
7. Add the invalid-path table-driven test (empty + missing file) (ED 5, [TDD]).
8. Implement `ResizeImage` so the three red tests turn green (validate args, open file, resize, return descriptive errors).
