## Coverage Gap Report
1 file changed, 1 unit gap (1 critical, 0 high, 0 medium, 0 low) + 0 redundant + 2 E2E gaps

### File Classification
| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/checkout/checkout.use-case.ts` | Use-case / application service | 1,2,3,4 (stub — only 1 has source to assert) |
| `playwright.config.ts` | Config | None — skip |
| `package.json` | Config | None — skip |

### 🔴 Critical
**`apps/server/checkout/checkout.use-case.ts`**
- Missing: Exit Door 1 (Response) — new use-case has no test file at all
- `[TDD]` (behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)
- Suggested (`apps/server/checkout/checkout.use-case.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { checkout } from './checkout.use-case'

describe('checkout use-case', () => {
  it('When called with a cartId, Then returns an order with an orderId', async () => {
    // Arrange
    const cartId = 'cart_123'

    // Act
    const result = await checkout(cartId)

    // Assert
    expect(result).toHaveProperty('orderId')
    expect(typeof result.orderId).toBe('string')
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
- `playwright.config.ts` — config file (SKIP_PATTERN `*.config.ts`)
- `package.json` — config / manifest, exit doors = None
- Exit Door 2 (state) on `checkout.use-case.ts` — dropped: source has no persistence logic
- Exit Door 3 (external call) on `checkout.use-case.ts` — dropped: source makes no external calls
- Exit Door 4 (queue event) on `checkout.use-case.ts` — dropped: source publishes no events
- Exit Door 5 (error path) on `checkout.use-case.ts` — dropped: source has no throw / error return
- Blind-spot scan (falsy / boundary / error / concurrency) on `cartId` — dropped: source contains no branches on the input

### E2E Gaps

Server-side change detected (use-case). Using `{ request }` fixture per `references/playwright.md`.

#### 🔴 Critical E2E gaps
**`e2e/checkout.spec.ts`** — Gap 1: primary checkout happy-path flow has no E2E test
```typescript
import { test, expect } from '@playwright/test'

test('When POST /checkout receives a cartId, Then it returns an orderId', async ({ request }) => {
  // Arrange
  const payload = { cartId: 'cart_123' }

  // Act
  const response = await request.post('/checkout', { data: payload })

  // Assert
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('orderId')
})
```

#### 🟠 High E2E gaps
**`e2e/checkout.spec.ts`** — Gap 2: no error-response assertion for invalid checkout input
```typescript
import { test, expect } from '@playwright/test'

test('When POST /checkout receives an invalid cartId, Then it returns an error response', async ({ request }) => {
  // Arrange
  const payload = { cartId: '' }

  // Act
  const response = await request.post('/checkout', { data: payload })

  // Assert
  expect(response.ok()).toBeFalsy()
  expect(response.status()).toBeGreaterThanOrEqual(400)
})
```

#### 🟡 Medium E2E gaps
_None._

#### 🟢 Low E2E gaps
_None._

### Remediation Plan
1. Create `apps/server/checkout/checkout.use-case.test.ts` with the red-first unit test for the `checkout()` response shape (Critical, `[TDD]`).
2. Create `e2e/checkout.spec.ts` with the `{ request }`-fixture happy-path E2E covering `POST /checkout` (Critical E2E).
3. Add the invalid-input error-response E2E case to `e2e/checkout.spec.ts` (High E2E).
