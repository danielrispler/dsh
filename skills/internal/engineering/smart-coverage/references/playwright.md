# Playwright Reference (additive overlay — E2E scope only)

## Scope

Appends a `### E2E Gaps` section to the Phase 5 report.
Does NOT modify unit or integration gap classification.

## TEST_PATTERN
`*.spec.ts` inside:
- `e2e/`
- `tests/`
- Any directory adjacent to `playwright.config.*`

## Fixture Selection — REQUIRED

Before writing any E2E test sketch, check what files changed (from Phase 2 classification):

**Server-side changes** (use-case, HTTP handler/controller, repository, service, adapter):
→ Use the `{ request }` fixture — API-level E2E, no browser needed:
```typescript
import { test, expect } from '@playwright/test'

test('When <operation> is called, Then <API outcome>', async ({ request }) => {
  const response = await request.post('/api/endpoint', {
    data: { key: 'value' },
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('expectedField')
})
```

**Frontend changes** (UI component, page, route, view):
→ Use the `{ page }` fixture — browser UI E2E:
```typescript
import { test, expect } from '@playwright/test'

test('When <user action>, Then <observable UI outcome>', async ({ page }) => {
  await page.goto('/path')
  await page.getByRole('button', { name: /submit/i }).click()
  await expect(page.getByText(/success/i)).toBeVisible()
})
```

**Mixed changeset** (both server + frontend files): emit two sub-sections — one using `{ request }` for server gaps, one using `{ page }` for frontend gaps.

## E2E Gap Classification

### 🔴 Critical E2E gaps
- Primary user flow (happy path) has no E2E test
- Auth / login flow untested

### 🟠 High E2E gaps
- Error / failure states not covered
- No `page.route()` intercept (frontend) or no error-response assertion (server)

### 🟡 Medium E2E gaps
- No accessibility assertion (`expect(page).toHaveAccessibilityTree()` or axe — frontend only)
- Missing variant (logged-out vs logged-in view)

### 🟢 Low E2E gaps
- Edge-case flows
- Additional viewport sizes (frontend only)
