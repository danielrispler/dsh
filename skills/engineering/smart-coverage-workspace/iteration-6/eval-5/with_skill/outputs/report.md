## Coverage Gap Report
1 file changed, 1 unit gap (1 critical, 0 high, 0 medium, 0 low) + 1 E2E gap + 0 redundant

### 🐛 Likely Bug Surfaced
_None._

### 🔴 Critical
**`apps/server/checkout/checkout.use-case.ts`**
- Missing: Exit Door 1 (Response shape) — use-case has zero tests `[TDD]` (behavior not yet implemented — red-first; will fail until stub is replaced)
- Note: `cartId` parameter is accepted but ignored; hardcoded `orderId: 'ord_1'` returned for every call. Test should pin the contract so the real implementation must derive `orderId` from `cartId`.
- Suggested:
```typescript
import { describe, it, expect } from 'vitest'
import { checkout } from './checkout.use-case'

describe('checkout use-case', () => {
  it('When called with a valid cartId, Then returns an order with a non-empty orderId [TDD]', async () => {
    // Arrange
    const cartId = 'cart_abc'

    // Act
    const result = await checkout(cartId)

    // Assert
    expect(result).toEqual(expect.objectContaining({ orderId: expect.any(String) }))
    expect(result.orderId.length).toBeGreaterThan(0)
  })

  it('When called with two different carts, Then returns distinct orderIds [TDD]', async () => {
    // Arrange / Act
    const a = await checkout('cart_a')
    const b = await checkout('cart_b')

    // Assert — current stub returns 'ord_1' for both; this pins the real behavior
    expect(a.orderId).not.toBe(b.orderId)
  })
})
```

### 🟠 High
_None._

### 🟡 Medium
_None._

### 🟢 Low
_None._

### ✅ Already Covered
_None._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `apps/server/checkout/checkout.use-case.ts` ED 2 (state) — stub does not persist; comments do not count. Per Phase 4b, dropped.
- `apps/server/checkout/checkout.use-case.ts` ED 3 (external call) — stub makes no outbound call. Dropped.
- `apps/server/checkout/checkout.use-case.ts` ED 4 (queue event) — stub publishes nothing. Dropped.
- `package.json` — SKIP_PATTERNS (manifest).
- `playwright.config.ts` — SKIP_PATTERNS (`*.config.ts`).

### E2E Gaps
Server-side change (use-case) → `{ request }` fixture, no browser needed. No HTTP route currently exposes `checkout()`; sketch assumes a `POST /api/checkout` endpoint will wrap the use-case. Tag `[REQUIRES REFACTOR]` until the route exists.

**🔴 Critical E2E gap — happy-path checkout flow [REQUIRES REFACTOR + TDD]**
One-line refactor: register a route, e.g. `app.post('/api/checkout', async (req) => checkout(req.body.cartId))`.

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test('When POST /api/checkout is called with a cartId, Then it returns 200 with an orderId [TDD]', async ({ request }) => {
  // Arrange
  const cartId = 'cart_e2e_1'

  // Act
  const response = await request.post('/api/checkout', { // fictitious — assumes route refactor
    data: { cartId },
  })

  // Assert
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('orderId')
  expect(typeof body.orderId).toBe('string')
  expect(body.orderId.length).toBeGreaterThan(0)
})
```

**🟠 High E2E gap — error response when cartId missing/invalid [REQUIRES REFACTOR + TDD]**
```typescript
import { test, expect } from '@playwright/test'

test('When POST /api/checkout is called without a cartId, Then it returns a 4xx error response [TDD]', async ({ request }) => {
  // Act
  const response = await request.post('/api/checkout', { // fictitious — assumes route refactor
    data: {},
  })

  // Assert
  expect(response.status()).toBeGreaterThanOrEqual(400)
  expect(response.status()).toBeLessThan(500)
})
```

### Remediation Plan
1. Write the critical unit test in `apps/server/checkout/checkout.use-case.test.ts` (will fail against the stub — drives implementation).
2. Replace the hardcoded `{ orderId: 'ord_1' }` with real order-creation logic so the contract test passes.
3. Add a route handler (e.g. Fastify `app.post('/api/checkout', ...)`) wrapping `checkout(cartId)` to unlock E2E.
4. Write the critical E2E happy-path test in `e2e/checkout.spec.ts` using `{ request }`.
5. Add the high-priority E2E error-response test (missing cartId → 4xx).
6. Once `checkout()` actually persists / calls external systems / publishes events, re-run smart-coverage to surface ED 2/3/4 gaps that were correctly dropped at stub stage.
