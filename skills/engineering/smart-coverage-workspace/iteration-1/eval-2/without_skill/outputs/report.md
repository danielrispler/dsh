# Test Coverage Gap Report

## Files Analyzed

- `apps/server/user.controller.ts` — Fastify-style async controller function
- `apps/frontend/user.component.ts` — Angular standalone component with an `@Input`

---

## 1. `user.controller.ts` — `getUser`

### What the code does

Sends a hardcoded JSON object `{ id: 1, name: 'Alice' }` via `reply.send`.

### Coverage Gaps

| Priority | Gap | Rationale |
|----------|-----|-----------|
| Critical | `reply.send` is called with the exact payload `{ id: 1, name: 'Alice' }` | Core behavior — the only observable effect of this function is the payload it sends. Not verifying this means the function could return anything without detection. |
| Critical | `reply.send` is called exactly once | Must assert no double-send or silent no-op path. |
| High | Function resolves (does not throw / reject) | Async function — callers depend on the returned promise settling without error. |
| Medium | `req` is not used (negative assertion) | Ensure future changes that accidentally read from `req` are caught by a test that passes an empty/null request without breaking. |

### Suggested test sketch (Vitest / Node)

```ts
describe('getUser', () => {
  it('sends { id: 1, name: "Alice" }', async () => {
    const reply = { send: vi.fn() }
    await getUser({}, reply)
    expect(reply.send).toHaveBeenCalledExactlyOnceWith({ id: 1, name: 'Alice' })
  })

  it('resolves without throwing', async () => {
    const reply = { send: vi.fn() }
    await expect(getUser({}, reply)).resolves.toBeUndefined()
  })
})
```

---

## 2. `user.component.ts` — `UserComponent`

### What the code does

Renders an `<h1>` that displays the `name` input. Default value is an empty string.

### Coverage Gaps

| Priority | Gap | Rationale |
|----------|-----|-----------|
| Critical | `<h1>` contains the value passed via `@Input() name` | This is the single rendered behavior. Without this test, a broken binding or template typo goes undetected. |
| Critical | Default render (no `name` input) shows an empty `<h1>` | Verifies the default value `''` and that the template does not crash when no input is supplied. |
| High | Changing `name` after initial render updates the DOM | Angular change-detection path — must confirm the binding is live, not one-shot. |
| High | `name` accepts special characters (e.g. `<script>`, `"`, `&`) without XSS | Angular auto-escapes, but the test documents that guarantee and catches any future unsafe-HTML change. |
| Medium | Component mounts without errors in a minimal `TestBed` | Smoke test; catches missing module declarations or provider issues during CI. |
| Low | `selector` is `app-user` | Rarely breaks, but worth a single declaration check if the component is used by exact selector elsewhere. |

### Suggested test sketch (Angular TestBed / Jest or Vitest)

```ts
describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserComponent],
    }).compileComponents()
    fixture = TestBed.createComponent(UserComponent)
  })

  it('renders the name inside <h1>', () => {
    fixture.componentInstance.name = 'Alice'
    fixture.detectChanges()
    const h1 = fixture.nativeElement.querySelector('h1')
    expect(h1.textContent).toBe('Alice')
  })

  it('renders an empty <h1> when no name is provided', () => {
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('')
  })

  it('updates the DOM when name changes', () => {
    fixture.componentInstance.name = 'Bob'
    fixture.detectChanges()
    fixture.componentInstance.name = 'Carol'
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Carol')
  })
})
```

---

## Summary

| File | Critical gaps | High gaps | Medium gaps | Low gaps |
|------|--------------|-----------|-------------|----------|
| `user.controller.ts` | 2 | 1 | 1 | 0 |
| `user.component.ts` | 2 | 2 | 1 | 1 |
| **Total** | **4** | **3** | **2** | **1** |

Both files have zero existing tests. The critical gaps must be closed before shipping; the high gaps should be addressed in the same pass. Medium and low gaps are recommended but can follow in a subsequent iteration.
