## Coverage Gap Report

2 files changed, 5 gaps found (2 critical, 2 high, 0 medium, 1 low)

---

## TypeScript

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/upload.controller.ts` | HTTP controller | 1, 2, 3, 4, 5 |

### Phase 3: Existing Coverage

- No test file found matching `*.test.ts`, `*.spec.ts`, or `__tests__/**/*.ts` co-located with `upload.controller.ts`.
- No parent/sibling integration tests identified covering this file.

### 🔴 Critical

**`apps/server/upload.controller.ts`**
- Missing: No test file exists for this HTTP controller (Exit Doors 1–5 entirely uncovered)
- Suggested (error path — testable immediately):

```typescript
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { describe, it, expect, beforeEach } from 'vitest'

describe('uploadFile', () => {
  it('When no file is provided, Then returns 400 with error message', async () => {
    // Arrange
    const app = Fastify()
    await app.register(multipart)
    app.post('/upload', uploadFile)
    await app.ready()

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/upload',
      // no multipart body — simulates missing file
    })

    // Assert
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: 'No file provided' })
  })
})
```

### 🟠 High

**`apps/server/upload.controller.ts`**

Gap 1 — Success response shape (Exit Door 1)
> `[REQUIRES REFACTOR]` `storageService` is a module-level import with no injection point — the success path (200 + `{ key }`) cannot be tested without making `storageService` injectable (e.g., pass it as a parameter or use a plugin option). Add an injection seam to `uploadFile` before writing this test.

Gap 2 — Error path: no file → 400 (Exit Door 5)

Already shown in the Critical sketch above. This gap is redundant with the Critical gap (same test). Listed here because ED5 is High severity when the controller has some tests; it is Critical here because zero tests exist.

### ⏭️ Skipped

- `apps/server/upload.controller.ts` — Exit Door 2 (state): `storageService.upload()` has no injectable interface in the source shown; dropped — no public API to verify persisted state without refactor.
- `apps/server/upload.controller.ts` — Exit Door 3 (external call): `storageService.upload()` not injectable from current source interface; dropped — `[REQUIRES REFACTOR]` to expose an injection seam before this gap can be tested.
- `apps/server/upload.controller.ts` — Exit Door 4 (queue events): no queue publish in source; dropped — behavior not in source.

### Remediation Plan (TypeScript)

1. Create `apps/server/upload.controller.test.ts`. Add the missing-file → 400 test immediately using `app.inject()` — no refactor needed.
2. Refactor `uploadFile` to accept `storageService` as an injected parameter (or Fastify plugin option) so the success path and external-call assertion (ED1, ED3) can be tested without reaching real storage.
3. Once injection seam exists, add the success test: POST with a valid multipart file → expect `200` and `{ key: expect.any(String) }`.

---

## Go

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `services/resizer/resize.go` | Pure utility | 1 only |

### Phase 3: Existing Coverage

- No test file found matching `*_test.go` co-located with `resize.go`.
- `Resize` is exported and is the only public symbol.
- File is a stub: body returns `nil, nil` with a `// TODO: implement actual resizing logic` comment.

### 🔴 Critical

**`services/resizer/resize.go`**
- Missing: No test file exists for this exported function (Exit Door 1 entirely uncovered)
- Suggested [TDD] (write red-first; will fail until stub is replaced):

```go
package resizer_test

import (
    "testing"

    "your/module/services/resizer"
)

func TestResize_WhenValidInputAndDimensions_ThenReturnsNonEmptyBytes(t *testing.T) {
    // Arrange
    // 1x1 white PNG (minimal valid PNG bytes)
    input := minimalValidPNG()
    dims := resizer.Dimensions{Width: 100, Height: 100}

    // Act
    got, err := resizer.Resize(input, dims)

    // Assert
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if len(got) == 0 {
        t.Error("expected non-empty output bytes, got empty slice")
    }
}
```

### 🟠 High

**`services/resizer/resize.go`**

Gap 1 — Valid input returns resized image bytes [TDD] (Exit Door 1)
> Stub returns `nil, nil`. This test must be written red-first; it will fail until real resizing logic replaces the stub. (behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)

```go
package resizer_test

import (
    "testing"

    "your/module/services/resizer"
)

func TestResize_WhenValidInput_ThenOutputIsNonNil(t *testing.T) {
    // Arrange
    input := minimalValidPNG() // helper returning a 1x1 PNG byte slice
    dims := resizer.Dimensions{Width: 50, Height: 50}

    // Act
    out, err := resizer.Resize(input, dims)

    // Assert
    if err != nil {
        t.Fatalf("Resize returned unexpected error: %v", err)
    }
    if out == nil {
        t.Error("expected non-nil output, got nil")
    }
}
```

### 🟢 Low

**`services/resizer/resize.go`**

Gap 1 — Edge case: zero dimensions [TDD] (Exit Door 1 variant)
> Once real logic is implemented, zero or negative dimensions are a plausible error boundary. Write after the stub is replaced.

```go
func TestResize_WhenZeroDimensions_ThenReturnsError(t *testing.T) {
    // Arrange
    input := minimalValidPNG()
    dims := resizer.Dimensions{Width: 0, Height: 0}

    // Act
    _, err := resizer.Resize(input, dims)

    // Assert
    if err == nil {
        t.Error("expected error for zero dimensions, got nil")
    }
}
```

### ✅ Already Covered

- None.

### ⏭️ Skipped

- `services/resizer/resize.go` — Exit Door 2 (state): pure utility, no persistence; dropped — behavior not in source.
- `services/resizer/resize.go` — Exit Door 3 (external call): no external system call in source; dropped — behavior not in source.
- `services/resizer/resize.go` — Exit Door 4 (queue events): no queue publish in source; dropped — behavior not in source.

### Remediation Plan (Go)

1. Create `services/resizer/resize_test.go`. Add `TestResize_WhenValidInput_ThenOutputIsNonNil` red-first — confirms the stub fails before any real logic is written.
2. Add a minimal valid PNG byte fixture (helper function `minimalValidPNG()`) in the same test file or a `testdata/` subfolder.
3. Implement actual resizing logic in `Resize` until the red test turns green.
4. Once passing, add the zero-dimensions edge case test.
