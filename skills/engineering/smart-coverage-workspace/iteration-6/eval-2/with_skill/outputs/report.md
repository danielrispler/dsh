## Coverage Gap Report
2 files changed, 2 gaps found (1 critical, 0 high, 1 medium, 0 low) + 0 redundant

### 🐛 Likely Bug Surfaced
_None._

### 🔴 Critical
**`apps/server/user.controller.ts`**
- Missing: Exit Door 1 (Response — HTTP status + body shape). No test file exists. Handler is a hardcoded-literal stub: returns `{ id: 1, name: 'Alice' }` regardless of input.
- Source has no route registration, no `buildApp()` factory, and signs `req: any, reply: any` — there is **no injectable seam today** for `app.inject()`. Per reference, mock-reply patterns (`{ code: vi.fn().mockReturnThis(), send: vi.fn() }`) are explicitly discouraged because they only assert call order, not the HTTP response.
- ED 2 (state), ED 3 (external call), ED 4 (queue) are **dropped** — source does not persist, call out, or publish.
- ED 5 (error path) is **dropped** — source has no error branch.

**Tier A — writeable today**
_None meaningful._ Calling `getUser` with hand-rolled `reply` mocks would only assert that `.send()` was invoked with the literal — equivalent to asserting the source text. Reference forbids this pattern.

**Tier B — after 1-line seam: extract `buildApp()` factory in a new `apps/server/app.ts`**
```typescript
// 1-line seam (new file apps/server/app.ts):
//   export const buildApp = () => { const app = Fastify(); app.get('/users/:id', getUser); return app }

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from './app' // fictitious — assumes seam refactor

describe('GET /users/:id', () => {
  let app: ReturnType<typeof buildApp>
  beforeEach(() => { app = buildApp() })
  afterEach(async () => { await app.close() })

  it('When GET /users/:id is called, Then responds 200 with user payload', async () => {
    // Arrange
    // Act
    const res = await app.inject({ method: 'GET', url: '/users/1' })
    // Assert
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ id: 1, name: 'Alice' }) // [TDD] (behavior not yet implemented — red-first; will fail until stub is replaced with real lookup)
  })
})
```
Tag: `[REQUIRES REFACTOR]` — extract Fastify app factory so the handler can be exercised end-to-end.

### 🟠 High
_None._

### 🟡 Medium
**`apps/frontend/user.component.ts`**

Gap 1 — UI component has no render test (Exit Door 1)
```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing'
import { UserComponent } from './user.component'

describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>

  beforeEach(async () => {
    // Arrange
    await TestBed.configureTestingModule({
      imports: [UserComponent],
    }).compileComponents()
    fixture = TestBed.createComponent(UserComponent)
  })

  it('When name input is provided, Then h1 contains the name', () => {
    // Act
    fixture.componentRef.setInput('name', 'Alice')
    fixture.detectChanges()
    // Assert
    const h1 = fixture.nativeElement.querySelector('h1')
    expect(h1.textContent).toContain('Alice')
  })

  it('When name input is empty string default, Then h1 renders empty', () => {
    // Act
    fixture.detectChanges()
    // Assert
    const h1 = fixture.nativeElement.querySelector('h1')
    expect(h1.textContent.trim()).toBe('')
  })
})
```
Note: Component is declared without `standalone: true`. In modern Angular (v14+) standalone defaults to true, but if this targets an older version the test must instead `declarations: [UserComponent]` inside an `NgModule`-style TestBed. Verify the Angular version in `package.json` (currently `{"name":"test","version":"1.0.0"}` — no Angular dep declared, so version is unknown).

### 🟢 Low
_None._

### ✅ Already Covered
_None._ (No existing tests in repo.)

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `apps/server/user.controller.ts` ED 2 / ED 3 / ED 4 — source does not persist state, call external systems, or publish events. Dropped per stub-detection rule (behavior not in source).
- `apps/server/user.controller.ts` ED 5 — source has no error branch; nothing to assert.
- `apps/server/user.controller.ts` Tier A direct-invocation test — would require fictitious mock-reply pattern that the TypeScript reference explicitly discourages. Route to unlock: Tier B `buildApp()` seam above.

### Remediation Plan
1. **[REFACTOR]** Add `apps/server/app.ts` exporting `buildApp()` that registers `getUser` against a route (e.g. `GET /users/:id`). This is the 1-line seam unblocking real HTTP testing.
2. **[CRITICAL]** Add `apps/server/user.controller.test.ts` with the Fastify `app.inject()` test in Tier B above. Mark `[TDD]` until the handler reads `req.params.id` and looks up real users.
3. **[MEDIUM]** Add `apps/frontend/user.component.spec.ts` with the two TestBed render tests above. Confirm Angular version in `package.json` to choose standalone vs. NgModule TestBed setup.
