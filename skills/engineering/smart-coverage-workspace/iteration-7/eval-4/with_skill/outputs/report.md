## Coverage Gap Report
2 files changed, 2 gaps found (0 critical, 2 high, 0 medium, 0 low)

## TypeScript

### 🟠 High
**`apps/server/upload.controller.ts`**
Gap 1 — `uploadFile` response shape `[TDD]` (Exit Door 1) (behavior not yet implemented — red-first; will fail until stub is replaced)
```typescript
import Fastify from 'fastify'
import { uploadFile } from './upload.controller'

describe('uploadFile', () => {
  it('When POST /upload, Then returns 200 with key in body', async () => {
    // Arrange
    const app = Fastify()
    app.post('/upload', uploadFile)

    // Act
    const res = await app.inject({ method: 'POST', url: '/upload' })

    // Assert
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ key: expect.any(String) })
  })
})
```

### Remediation Plan
1. Add `apps/server/upload.controller.test.ts` with the Fastify `app.inject()` sketch above; expect red until upload behavior (multipart parse, storage write, key generation) is implemented.

## Go

### 🟠 High
**`services/resizer/resize.go`**
Gap 1 — `ResizeImage` returns nil on valid input `[TDD]` (Exit Door 1) (behavior not yet implemented — red-first; will fail until stub is replaced)
```go
package resizer

import "testing"

func TestResizeImage_WhenValidPathAndDimensions_ThenReturnsNoError(t *testing.T) {
    // Arrange
    path := "testdata/sample.jpg"
    width, height := 200, 200

    // Act
    err := ResizeImage(path, width, height)

    // Assert
    if err != nil {
        t.Fatalf("expected nil error, got %v", err)
    }
}
```

### Remediation Plan
1. Add `services/resizer/resize_test.go` with the `TestResizeImage_WhenValidPathAndDimensions_ThenReturnsNoError` sketch above; expect red once real resize logic replaces the stub and starts producing meaningful errors / output (file write, decoded dimensions) that warrant additional ED 1/2/3 tests.
