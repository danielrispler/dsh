# Coverage Gap Report (baseline — no skill)

## TypeScript — `upload.controller.ts`

### Gaps

| Priority | Gap |
|----------|-----|
| Critical | Happy-path response shape untested |
| Critical | Async promise resolves unchecked |
| High | `req` typed `any`, no validation exercised |
| High | HTTP status code never asserted |
| Medium | `reply.send` error path untested |
| Medium | Hardcoded key 'abc.jpg' — future derivation logic untested |
| Low | Concurrency: two parallel calls must resolve independently |

### Test skeleton (Vitest)

```typescript
describe('uploadFile', () => {
  it('responds with a key', async () => {
    const reply = makeReply()
    await uploadFile({}, reply)
    expect(reply.send).toHaveBeenCalledWith({ key: 'abc.jpg' })
  })
  it('resolves without throwing', async () => {
    await expect(uploadFile({}, makeReply())).resolves.not.toThrow()
  })
})
```

---

## Go — `resize.go`

### Gaps

| Priority | Gap |
|----------|-----|
| Critical | Happy path never exercised |
| Critical | Zero width/height — should error |
| Critical | Negative dimensions — should error |
| High | Non-existent file path |
| High | Empty path string |
| High | Unsupported format |
| High | Permission-denied path |
| Medium | Integer overflow dimensions |
| Low | Aspect-ratio contract |

### Test skeleton (Go)

```go
func TestResizeImage_HappyPath(t *testing.T) { ... }
func TestResizeImage_ZeroWidth(t *testing.T) { ... }
func TestResizeImage_ZeroHeight(t *testing.T) { ... }
func TestResizeImage_NegativeDimensions(t *testing.T) { ... }
func TestResizeImage_NonExistentFile(t *testing.T) { ... }
```
