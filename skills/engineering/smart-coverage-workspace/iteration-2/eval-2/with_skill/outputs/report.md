## Coverage Gap Report

2 files changed, 4 gaps found (1 critical, 1 high, 1 medium, 1 low)

**Phase 0 detection script output:**
```json
{"files":{"apps/frontend/user.component.ts":"typescript","apps/server/user.controller.ts":"typescript"},"frameworks":["angular"],"playwright":false}
```
References loaded: `typescript.md` + `angular.md` (additive overlay) + `testing-principles.md`. No Playwright.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/frontend/user.component.ts` | Angular UI component | 1, 5 |
| `apps/server/user.controller.ts` | HTTP controller | All 5 |

### Phase 3: Existing Coverage

No `.spec.ts`, `.test.ts`, or `__tests__/` files found. Zero coverage on both files.

---

### 🔴 Critical

**`apps/server/user.controller.ts`**
- Missing: No test file at all for an HTTP controller (Exit Door 1 — Response)
- Suggested:
```typescript
import { getUser } from '../apps/server/user.controller'

describe('getUser', () => {
  it('When called with a valid request, Then replies with user id and name', async () => {
    // Arrange
    const req = {}
    const sent: unknown[] = []
    const reply = { send: (body: unknown) => sent.push(body) }

    // Act
    await getUser(req as any, reply as any)

    // Assert
    expect(sent).toHaveLength(1)
    expect(sent[0]).toEqual({ id: 1, name: 'Alice' })
  })
})
```

---

### 🟠 High

**`apps/server/user.controller.ts`**

Gap 1 — Error path untested (Exit Door 5)
```typescript
describe('getUser', () => {
  it('When reply.send throws, Then the error propagates to the caller', async () => {
    // Arrange
    const req = {}
    const reply = {
      send: () => { throw new Error('transport failure') },
    }

    // Act & Assert
    await expect(getUser(req as any, reply as any)).rejects.toThrow('transport failure')
  })
})
```

---

### 🟡 Medium

**`apps/frontend/user.component.ts`**
- Missing: No render test for Angular component (Exit Door 1 — rendered output)
- Suggested (TestBed + `setInput()` per `angular.md` overlay; `When/Then` naming cross-cutting):
```typescript
import { TestBed } from '@angular/core/testing'
import { ComponentFixture } from '@angular/core/testing'
import { UserComponent } from './user.component'

describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
    }).compileComponents()
    fixture = TestBed.createComponent(UserComponent)
  })

  it('When name input is provided, Then h1 displays the name', () => {
    // Arrange
    fixture.componentRef.setInput('name', 'Alice')

    // Act
    fixture.detectChanges()

    // Assert
    const el = fixture.nativeElement.querySelector('h1')
    expect(el.textContent).toContain('Alice')
  })
})
```

---

### 🟢 Low

**`apps/frontend/user.component.ts`**

Gap 1 — Empty/default name edge case (Exit Door 1 edge variant)
```typescript
it('When no name input is provided, Then h1 is empty', () => {
  // Arrange — no input set, default value is ''

  // Act
  fixture.detectChanges()

  // Assert
  const el = fixture.nativeElement.querySelector('h1')
  expect(el.textContent).toBe('')
})
```

---

### ✅ Already Covered

None — no test files found in the repository.

---

### ⏭️ Skipped

- `apps/server/user.controller.ts` — Exit Door 2 (state): dropped — no persistence in source
- `apps/server/user.controller.ts` — Exit Door 3 (external call): dropped — no external call in source
- `apps/server/user.controller.ts` — Exit Door 4 (queue events): dropped — no queue publishing in source
- `apps/frontend/user.component.ts` — Exit Door 5 (component error path): dropped — no error-handling logic in source

---

### Remediation Plan

1. Create `apps/server/user.controller.test.ts` — add the Critical `describe/it` response test verifying `getUser` returns `{ id: 1, name: 'Alice' }` (Critical, Exit Door 1)
2. Extend `apps/server/user.controller.test.ts` — add the error-path `it` block verifying `reply.send` failure propagates (High, Exit Door 5)
3. Create `apps/frontend/user.component.spec.ts` using TestBed — add the render test with `setInput('name', 'Alice')` asserting `h1` content (Medium, Exit Door 1)
4. Extend the component spec with an empty-name variant asserting `h1` is empty (Low, Exit Door 1 edge case)
