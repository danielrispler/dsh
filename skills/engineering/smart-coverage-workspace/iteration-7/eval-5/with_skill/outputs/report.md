## Coverage Gap Report
1 file changed, 2 unit gaps (0 critical, 2 high, 0 medium, 0 low) + 1 E2E gap

**Classification**
- `apps/server/checkout/checkout.use-case.ts` — Use-case / application service (exit doors 1, 2, 3, 4). Body is a stub returning a hardcoded literal — ED 2/3/4 dropped (no persistence, no external call, no event publish in source). Only ED 1 applies. All gaps tagged `[TDD]`.

### 🟠 High
**`apps/server/checkout/checkout.use-case.ts`**

Gap 1 — Happy path returns orderId for a valid cart (Exit Door 1) `[TDD]` (behavior not yet implemented — red-first; will fail until stub is replaced)
```typescript
import { describe, it, expect } from 'vitest'
import { checkout } from './checkout.use-case'

describe('checkout use-case', () => {
  it('When called with a valid cartId, Then returns an order with a non-empty orderId', async () => {
    // Arrange
    const cartId = 'cart_123'

    // Act
    const result = await checkout(cartId)

    // Assert
    expect(result).toHaveProperty('orderId')
    expect(typeof result.orderId).toBe('string')
    expect(result.orderId.length).toBeGreaterThan(0)
  })
})
```

Gap 2 — Distinct carts produce distinct orderIds (Exit Door 1) `[TDD]` (behavior not yet implemented — red-first; will fail until stub is replaced)
```typescript
import { describe, it, expect } from 'vitest'
import { checkout } from './checkout.use-case'

describe('checkout use-case — identity', () => {
  it('When called twice with different cartIds, Then orderIds differ', async () => {
    // Arrange
    const cartA = 'cart_A'
    const cartB = 'cart_B'

    // Act
    const a = await checkout(cartA)
    const b = await checkout(cartB)

    // Assert
    expect(a.orderId).not.toEqual(b.orderId)
  })
})
```

### E2E Gaps

Server-side change → `{ request }` fixture (no browser needed). Note: `playwright.config.ts` points `testDir: './e2e'`, which does not yet exist — create it alongside the test.

**`e2e/checkout.spec.ts`** — Checkout API happy path (Exit Door 1) `[TDD]` (assumes HTTP route exposing the use-case; will fail until route + implementation land)
```typescript
import { test, expect } from '@playwright/test'

test('When POST /api/checkout with a valid cartId, Then responds 200 with an orderId', async ({ request }) => {
  // Arrange
  const payload = { cartId: 'cart_e2e_1' }

  // Act
  const response = await request.post('/api/checkout', { data: payload })

  // Assert
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('orderId')
  expect(typeof body.orderId).toBe('string')
  expect(body.orderId.length).toBeGreaterThan(0)
})
```

### Remediation Plan
1. Add `apps/server/checkout/checkout.use-case.test.ts` with Gap 1 (happy path returns orderId) — red until stub is replaced with real logic.
2. Add Gap 2 (distinct cart → distinct order) to the same file to lock in identity behavior before implementation.
3. Create `e2e/` directory (referenced by `playwright.config.ts`) and add `e2e/checkout.spec.ts` with the `{ request }` API-level happy path once an HTTP route wires the use-case.
