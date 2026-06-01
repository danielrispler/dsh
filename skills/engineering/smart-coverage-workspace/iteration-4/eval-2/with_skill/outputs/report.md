## Coverage Gap Report

2 files changed, 3 gaps found (1 critical, 1 high, 1 medium, 0 low)

---

### Phase 0

Detection output: `{"files":{"apps/server/user.controller.ts":"typescript","apps/frontend/user.component.ts":"typescript"},"frameworks":["angular"],"playwright":false}`
References loaded: `typescript.md` + `angular.md` (overlay) + `testing-principles.md`.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/user.controller.ts` | HTTP controller (Fastify) | All 5 |
| `apps/frontend/user.component.ts` | UI component (Angular standalone) | 1, 5 |

---

### 🔴 Critical

**`apps/server/user.controller.ts`**

- Missing: Exit Door 1 — HTTP response (no test file exists at all for this route handler)
- Suggested:

```typescript
import Fastify from 'fastify'

describe('getUser', () => {
  it('When a valid user id is requested, Then responds 200 with the user object', async () => {
    // Arrange
    const app = Fastify()
    app.get('/users/:id', getUser)
    await app.ready()

    // Act
    const response = await app.inject({
      method: 'GET',
      url: '/users/1',
    })

    // Assert
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ id: 1 })
  })
})
```

---

### 🟠 High

**`apps/server/user.controller.ts`**

Gap 1 — error path: user not found or invalid id param (Exit Door 5)

```typescript
describe('getUser error paths', () => {
  it('When a non-existent user id is requested, Then responds with 404', async () => {
    // Arrange
    const app = Fastify()
    app.get('/users/:id', getUser)
    await app.ready()

    // Act
    const response = await app.inject({ method: 'GET', url: '/users/99999' })

    // Assert
    expect(response.statusCode).toBe(404)
  })

  it('When a non-numeric user id is provided, Then responds with 400', async () => {
    // Arrange
    const app = Fastify()
    app.get('/users/:id', getUser)
    await app.ready()

    // Act
    const response = await app.inject({ method: 'GET', url: '/users/not-a-number' })

    // Assert
    expect(response.statusCode).toBe(400)
  })
})
```

---

### 🟡 Medium

**`apps/frontend/user.component.ts`**

Gap 1 — no render test for `@Input()` bindings (Exit Door 1)

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing'
import { UserComponent } from './user.component'

describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
    }).compileComponents()
    fixture = TestBed.createComponent(UserComponent)
  })

  it('When title input is provided, Then h1 displays the title text', () => {
    // Arrange
    fixture.componentRef.setInput('title', 'My Title')
    // Act
    fixture.detectChanges()
    // Assert
    const el = fixture.nativeElement.querySelector('h1')
    expect(el.textContent).toContain('My Title')
  })

  it('When name input is provided, Then paragraph displays the user name', () => {
    // Arrange
    fixture.componentRef.setInput('name', 'Alice')
    // Act
    fixture.detectChanges()
    // Assert
    const el = fixture.nativeElement.querySelector('p')
    expect(el.textContent).toContain('Alice')
  })
})
```

---

### 🟢 Low

_None._

---

### ✅ Already Covered

_None — no test files exist for either changed file._

---

### ⏭️ Skipped

- `apps/server/user.controller.ts` — Exit Door 2 (state): dropped — no persistence write in source; handler is read-only
- `apps/server/user.controller.ts` — Exit Door 3 (external call): dropped — `userService` is an internal collaborator; asserting it directly violates black-box rule; observable effect captured via HTTP response (Exit Door 1)
- `apps/server/user.controller.ts` — Exit Door 4 (queue events): dropped — no queue publish in source
- `apps/frontend/user.component.ts` — Exit Door 5 (observability): dropped — no error-handling logic in source

---

### Remediation Plan

1. **[Critical]** `apps/server/user.controller.ts` — Create `apps/server/user.controller.test.ts`. Register the real `getUser` handler on a Fastify instance. Use `app.inject()` to assert GET returns HTTP 200 with the correct user shape.
2. **[High]** `apps/server/user.controller.ts` — In the same test file, add error-path cases: 404 for non-existent user, 400 for non-numeric `id`. Use `app.inject()` and assert `response.statusCode`.
3. **[Medium]** `apps/frontend/user.component.ts` — Create `apps/frontend/user.component.spec.ts`. Use `TestBed` + `fixture.componentRef.setInput()` to assert `title` renders in `<h1>` and `name` renders in `<p>`.
