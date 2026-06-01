## Coverage Gap Report

2 files changed, 2 gaps found (1 critical, 0 high, 1 medium, 0 low)

**Phase 0 detection script output:**
```json
{"files":{"apps/frontend/user.component.ts":"typescript","apps/server/user.controller.ts":"typescript"},"frameworks":["angular"],"playwright":false}
```
References loaded: `typescript.md` + `angular.md` (additive overlay).

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/frontend/user.component.ts` | Angular UI component | 1, 5 |
| `apps/server/user.controller.ts` | HTTP controller | All 5 |

### Phase 3: Existing Coverage

No test files found anywhere. Zero coverage.

### Phase 4: Gap Classification

**user.controller.ts:**
- Critical: HTTP route with no test file at all; stub (hardcoded literal) → `[TDD]`
- Exit Door 2 (state): dropped — no persistence logic in source
- Exit Door 3 (external call): dropped — no external calls in source
- Exit Door 4 (queue events): dropped — no publish in source
- Exit Door 5 (error path): dropped — no error-handling logic in source

**user.component.ts:**
- Medium: UI component with no render test (Exit Door 1)
- Exit Door 5: dropped — no error-handling logic in source

---

### 🔴 Critical

**`apps/server/user.controller.ts`** `[TDD]`

- Missing: HTTP route has no test file at all (behavior not yet implemented — write red-first)

```typescript
import { getUser } from '../apps/server/user.controller'

describe('getUser', () => {
  it('When a valid request is made, Then responds with user id and name', async () => {
    // Arrange
    const reply = { send: vi.fn() }
    const req = {}

    // Act
    await getUser(req as any, reply as any)

    // Assert
    expect(reply.send).toHaveBeenCalledWith({ id: 1, name: 'Alice' })
  })
})
```

---

### 🟡 Medium

**`apps/frontend/user.component.ts`**

Gap 1 — UI component missing render test (Exit Door 1)

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

  it('When name input is provided, Then h1 contains the name', () => {
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

### ✅ Already Covered

None — no test files exist.

### ⏭️ Skipped

- `apps/server/user.controller.ts` — Exit Door 2 (state): dropped — no persistence logic in source
- `apps/server/user.controller.ts` — Exit Door 3 (external call): dropped — no external calls in source
- `apps/server/user.controller.ts` — Exit Door 4 (queue events): dropped — no publish in source
- `apps/server/user.controller.ts` — Exit Door 5 (error path): dropped — no error-handling logic in source
- `apps/frontend/user.component.ts` — Exit Door 5 (error path): dropped — no error-handling logic in source

---

### Remediation Plan

1. **[Critical]** Create `apps/server/user.controller.test.ts`. Write red test asserting `reply.send` called with user object. Replace stub with real lookup logic to make green.
2. **[Medium]** Create `apps/frontend/user.component.spec.ts`. Use TestBed + `fixture.componentRef.setInput('name', ...)` + `detectChanges()`, assert `h1` text content.
