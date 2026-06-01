# Test Coverage Gap Report (baseline — no skill)

## TypeScript — `apps/server/upload.controller.ts`

```typescript
export async function uploadFile(req: any, reply: any) {
  reply.send({ key: 'abc.jpg' })
}
```

### Coverage Gaps

#### Critical

**Gap 1 — Happy path: successful file upload returns a key**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { uploadFile } from './upload.controller'

describe('uploadFile', () => {
  it('sends a response with a key on successful upload', async () => {
    const req = {}
    const send = vi.fn()
    const reply = { send }

    await uploadFile(req, reply)

    expect(send).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith({ key: 'abc.jpg' })
  })
})
```

#### High

**Gap 2 — Response shape: key is a string**

```typescript
it('response key is a string', async () => {
  const req = {}
  const send = vi.fn()
  const reply = { send }

  await uploadFile(req, reply)

  const [payload] = send.mock.calls[0]
  expect(typeof payload.key).toBe('string')
})
```

#### Medium

**Gap 3 — reply.send is called exactly once**

```typescript
it('calls reply.send exactly once', async () => {
  const req = {}
  const send = vi.fn()
  const reply = { send }

  await uploadFile(req, reply)

  expect(send).toHaveBeenCalledTimes(1)
})
```

#### Low

**Gap 4 — Handler resolves without throwing**

```typescript
it('resolves without throwing', async () => {
  const req = {}
  const reply = { send: vi.fn() }

  await expect(uploadFile(req, reply)).resolves.toBeUndefined()
})
```

---

## Go — `services/resizer/resize.go`

```go
package resizer

func ResizeImage(path string, width, height int) error { return nil }
```

### Coverage Gaps

#### Critical

**Gap 1 — Happy path: valid inputs return nil error**

```go
package resizer

import "testing"

func TestResizeImage_ValidInputs_ReturnsNil(t *testing.T) {
    err := ResizeImage("testdata/sample.jpg", 800, 600)
    if err != nil {
        t.Fatalf("expected nil error, got %v", err)
    }
}
```

#### High

**Gap 2 — Zero dimensions are rejected**

```go
func TestResizeImage_ZeroWidth_ReturnsError(t *testing.T) {
    err := ResizeImage("testdata/sample.jpg", 0, 600)
    if err == nil {
        t.Fatal("expected an error for zero width, got nil")
    }
}
```

**Gap 3 — Negative dimensions are rejected**

```go
func TestResizeImage_NegativeDimensions_ReturnsError(t *testing.T) {
    err := ResizeImage("testdata/sample.jpg", -1, -1)
    if err == nil {
        t.Fatal("expected an error for negative dimensions, got nil")
    }
}
```

#### Medium

**Gap 4 — Non-existent file path returns an error**

```go
func TestResizeImage_NonExistentFile_ReturnsError(t *testing.T) {
    err := ResizeImage("testdata/does_not_exist.jpg", 800, 600)
    if err == nil {
        t.Fatal("expected an error for missing file, got nil")
    }
}
```

**Gap 5 — Empty path returns an error**

```go
func TestResizeImage_EmptyPath_ReturnsError(t *testing.T) {
    err := ResizeImage("", 800, 600)
    if err == nil {
        t.Fatal("expected an error for empty path, got nil")
    }
}
```

#### Low

**Gap 6 — Square resize**

```go
func TestResizeImage_SquareDimensions_ReturnsNil(t *testing.T) {
    err := ResizeImage("testdata/sample.jpg", 512, 512)
    if err != nil {
        t.Fatalf("expected nil error for square resize, got %v", err)
    }
}
```
