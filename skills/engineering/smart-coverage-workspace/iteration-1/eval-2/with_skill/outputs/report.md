# Coverage Gap Report

2 files changed, 7 gaps found (1 critical, 3 high, 1 medium, 2 low)

**Phase 0 detection script output:**
```json
{"files":{"apps/frontend/user.component.ts":"typescript","apps/server/user.controller.ts":"typescript"},"frameworks":["angular"],"playwright":false}
```
References loaded: `typescript.md` (base), `angular.md` (overlay for user.component.ts only)

---

## TypeScript

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/user.controller.ts` | HTTP controller | 1, 2, 3, 4, 5 |
| `apps/frontend/user.component.ts` | UI component (Angular) | 1, 5 |

### 🔴 Critical

**`apps/server/user.controller.ts`**
- Missing: HTTP route with no test file at all
- Suggested: `When GET /user is called, Then it returns HTTP 200 with id and name`

### 🟠 High

**`apps/server/user.controller.ts`**

Gap 1 — Error path (Exit Door 5)
- `When the handler throws an unexpected error, Then the response is HTTP 500`

Gap 2 — State verification (Exit Door 2)
- `When getUser is called, Then the returned body matches shape { id: number, name: string }`

Gap 3 — External call assertion (Exit Door 3)
- `When getUser delegates to a data source, Then the correct query is issued with expected args`

### 🟡 Medium

**`apps/frontend/user.component.ts`** — Angular TestBed pattern (from angular.md overlay)

```typescript
it('should render name when input provided', () => {
  fixture.componentRef.setInput('name', 'Alice')
  fixture.detectChanges()
  const h1 = fixture.nativeElement.querySelector('h1')
  expect(h1.textContent).toContain('Alice')
})
```

### 🟢 Low

**`apps/frontend/user.component.ts`**

Gap 1 — Empty/default input: `When name input is empty string, Then h1 renders with no visible text`
Gap 2 — Error path: `When invalid input type supplied, Then component handles gracefully`

### ✅ Already Covered
_(none)_

### ⏭️ Skipped
_(none)_

### Remediation Plan

1. Create `apps/server/user.controller.test.ts` — integration test, HTTP 200 + body shape. (**Critical**)
2. Add error-path test: handler throws → HTTP 500. (**High**)
3. Add state-shape assertion: body contains `{ id: number, name: string }`. (**High**)
4. If delegates to data layer: assert data-source call with correct args. (**High**)
5. Create `apps/frontend/user.component.spec.ts` — TestBed, `setInput('name', 'Alice')`, `detectChanges()`, assert `h1.textContent`. (**Medium**)
6. Add empty-name edge case. (**Low**)
