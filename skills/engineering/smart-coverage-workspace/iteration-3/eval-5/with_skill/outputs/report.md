## Coverage Gap Report

1 file changed, 2 gaps found (1 critical unit gap, 1 critical E2E gap)

**Phase 0 detection script output:**
```json
{"files":{"apps/server/checkout/checkout.use-case.ts":"typescript"},"frameworks":[],"playwright":true}
```
References loaded: `typescript.md` + `playwright.md` (E2E overlay). playwright.config.ts skipped.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/checkout/checkout.use-case.ts` | Use-case / application service | 1, 2, 3, 4 |

### Phase 3: Existing Coverage

No test files found anywhere. Zero coverage.

### Phase 4: Stub Detection

Body returns hardcoded `{ orderId: 'ord_1' }` — **stub**.
- Exit Door 1 (response): present → Critical `[TDD]`
- Exit Door 2 (state): dropped — no persistence logic
- Exit Door 3 (external call): dropped — no external call
- Exit Door 4 (queue events): dropped — no publish

---

### 🔴 Critical

**`apps/server/checkout/checkout.use-case.ts`** `[TDD]`

- Missing: Exit Door 1 — return value (behavior not yet implemented — write red-first)

```typescript
import { describe, it, expect } from 'vitest'
import { checkout } from './checkout.use-case'

describe('checkout', () => {
  it('When a valid cartId is given, Then returns an orderId', async () => {
    // Arrange
    const cartId = 'cart_abc'

    // Act
    const result = await checkout(cartId)

    // Assert
    expect(result).toHaveProperty('orderId')
    expect(typeof result.orderId).toBe('string')
    expect(result.orderId.length).toBeGreaterThan(0)
  })
})
```

---

### ✅ Already Covered

None.

### ⏭️ Skipped

- `playwright.config.ts` — config file (`*.config.ts` matches SKIP_PATTERNS)
- Exit Door 2 (state): dropped — no persistence logic in source
- Exit Door 3 (external call): dropped — no external call in source
- Exit Door 4 (queue events): dropped — no publish in source

---

### E2E Gaps

> Changed file is **server-side use-case** → `{ request }` API fixture (not `{ page }`).

#### 🔴 Critical E2E `[TDD]`

```typescript
import { test, expect } from '@playwright/test'

test('When checkout is called with a valid cartId, Then returns a successful response with an orderId', async ({ request }) => {
  // Arrange
  const cartId = 'cart_abc'

  // Act
  const response = await request.post('/api/checkout', {
    data: { cartId },
  })

  // Assert
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('orderId')
})
```

#### 🟠 High E2E `[TDD]`

```typescript
test('When checkout is called with a missing cartId, Then returns an error response', async ({ request }) => {
  // Arrange — omit cartId
  // Act
  const response = await request.post('/api/checkout', { data: {} })
  // Assert
  expect(response.ok()).toBeFalsy()
  const body = await response.json()
  expect(body).toHaveProperty('error')
})
```

---

### Remediation Plan

1. **[Critical — unit]** Create `checkout.use-case.test.ts` — happy-path return value test. Run red; replace stub to make green.
2. **[Critical — E2E]** Create `e2e/checkout.spec.ts` with `{ request }` happy-path test.
3. **[High — E2E]** Add error-response test to same E2E file once route exists.
