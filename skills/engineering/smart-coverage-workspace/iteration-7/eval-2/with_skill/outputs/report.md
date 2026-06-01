## Coverage Gap Report
2 files changed, 2 gaps found (1 critical, 0 high, 1 medium, 0 low)

### 🔴 Critical
**`apps/server/user.controller.ts`**
- Missing: Response (ED 1) `[TDD]` (behavior not yet implemented — red-first; will fail until stub is replaced)
- Suggested:
```typescript
import Fastify from 'fastify'
import { getUser } from './user.controller'

describe('GET /user', () => {
  it('When GET /user is called, Then responds 200 with user payload', async () => {
    // Arrange
    const app = Fastify()
    app.get('/user', getUser)

    // Act
    const res = await app.inject({ method: 'GET', url: '/user' })

    // Assert
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ id: 1, name: 'Alice' })
  })
})
```

### 🟡 Medium
**`apps/frontend/user.component.ts`**
Gap 1 — Render with name input (Exit Door 1)
```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing'
import { UserComponent } from './user.component'

describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>

  beforeEach(async () => {
    // Arrange
    await TestBed.configureTestingModule({ imports: [UserComponent] }).compileComponents()
    fixture = TestBed.createComponent(UserComponent)
  })

  it('When name input is provided, Then h1 renders the name', () => {
    // Act
    fixture.componentRef.setInput('name', 'Alice')
    fixture.detectChanges()

    // Assert
    const h1 = fixture.nativeElement.querySelector('h1')
    expect(h1.textContent).toContain('Alice')
  })

  it('When name input is empty, Then h1 renders empty string', () => {
    // Act
    fixture.detectChanges()

    // Assert
    const h1 = fixture.nativeElement.querySelector('h1')
    expect(h1.textContent).toBe('')
  })
})
```

### Remediation Plan
1. Create `apps/server/user.controller.spec.ts` with the Fastify `app.inject()` test above — once the handler is replaced with real logic, replace the literal assertion with shape/contract checks.
2. Create `apps/frontend/user.component.spec.ts` with the TestBed render tests above.
