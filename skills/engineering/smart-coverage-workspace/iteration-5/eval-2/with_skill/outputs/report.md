## Coverage Gap Report
2 files changed, 2 gaps found (1 critical, 0 high, 1 medium, 0 low) + 0 redundant

### 🔴 Critical
**`apps/server/user.controller.ts`** [REQUIRES REFACTOR]
- Missing: Exit Door 1 (Response) — HTTP route handler has no test file at all
- Refactor needed: expose the Fastify `app` (or a `buildApp()` factory that registers this route) so the test can drive the handler through `app.inject()` instead of fabricating a `reply` mock. Without that seam, the only alternative is the mock-reply anti-pattern that `typescript.md` explicitly bans.
- Suggested:
```typescript
import { describe, it, expect } from 'vitest'
import { buildApp } from './app' // fictitious — assumes refactor exposing the Fastify app

describe('GET /user', () => {
  it('When the route is called, Then it responds 200 with the user payload', async () => {
    // Arrange
    const app = await buildApp()

    // Act
    const res = await app.inject({ method: 'GET', url: '/user' })

    // Assert
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ id: 1, name: 'Alice' })
  })
})
```

### 🟠 High
_None._

### 🟡 Medium
**`apps/frontend/user.component.ts`**

Gap 1 — render binds `name` input into `<h1>` (Exit Door 1)
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

  it('When name input is provided, Then h1 contains the text', () => {
    // Act
    fixture.componentRef.setInput('name', 'Alice')
    fixture.detectChanges()

    // Assert
    const el = fixture.nativeElement.querySelector('h1')
    expect(el.textContent).toContain('Alice')
  })

  it('When name input is omitted, Then h1 renders empty', () => {
    // Act
    fixture.detectChanges()

    // Assert
    const el = fixture.nativeElement.querySelector('h1')
    expect(el.textContent).toBe('')
  })
})
```

### 🟢 Low
_None._

### ✅ Already Covered
_None._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `apps/server/user.controller.ts` Exit Door 2 (state) — dropped, source has no persistence logic
- `apps/server/user.controller.ts` Exit Door 3 (external call) — dropped, source makes no external system call
- `apps/server/user.controller.ts` Exit Door 4 (queue) — dropped, source publishes no events
- `apps/server/user.controller.ts` Exit Door 5 (error path) — dropped, source has no throw / error branch
- `apps/frontend/user.component.ts` Exit Door 5 (error path) — dropped, component has no error branch

### Remediation Plan
1. Expose a `buildApp()` / Fastify `app` factory in `apps/server/` and register the `getUser` handler on a route, so the controller can be exercised via `app.inject()` (unlocks the Critical gap).
2. Add `apps/server/user.controller.test.ts` driving the route through `app.inject()` and asserting `statusCode` + JSON body match `{ id: 1, name: 'Alice' }`.
3. Add `apps/frontend/user.component.spec.ts` with the two TestBed cases above (name provided, name omitted).
