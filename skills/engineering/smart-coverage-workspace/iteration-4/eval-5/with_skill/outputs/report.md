## Coverage Gap Report

1 file changed, 1 unit gap (1 critical, 0 high, 0 medium, 0 low) + 2 E2E gaps (1 critical, 1 high)

---

### 🔴 Critical

**`apps/server/checkout/checkout.use-case.ts`**

- Missing: No test file exists for this use-case (Exit Door 1 — Response) [TDD]
- Note: behavior not yet implemented — write this test red-first; it will fail until the stub is replaced

```typescript
import { describe, it, expect } from 'vitest'
import { checkout } from './checkout.use-case'

describe('checkout', () => {
  it('When valid cartId and userId are provided, Then returns an orderId', async () => {
    // Arrange
    const input = { cartId: 'cart-123', userId: 'user-456' }

    // Act
    const result = await checkout(input)

    // Assert
    expect(result).toHaveProperty('orderId')
    expect(typeof result.orderId).toBe('string')
  })
})
```

---

### 🟠 High / 🟡 Medium / 🟢 Low

_(none)_

---

### ✅ Already Covered

_(none — no existing test files found)_

---

### ⏭️ Skipped

- `apps/server/checkout/checkout.use-case.ts` — Exit Door 2 (state): dropped — no persistence logic in source body
- `apps/server/checkout/checkout.use-case.ts` — Exit Door 3 (external calls): dropped — no external system call in body (TODO comment does not count)
- `apps/server/checkout/checkout.use-case.ts` — Exit Door 4 (queue events): dropped — no queue publish in body

---

### E2E Gaps

> File is server-side (use-case). Using `{ request }` fixture per playwright.md fixture selection rule.

#### 🔴 Critical E2E

**`apps/server/checkout/checkout.use-case.ts`** — Primary checkout flow has no E2E test [TDD]

Note: requires `/checkout` route to exist before this test can pass.

```typescript
import { test, expect } from '@playwright/test'

test('When checkout is called with valid cart and user, Then returns an orderId', async ({ request }) => {
  // Arrange
  const payload = { cartId: 'cart-123', userId: 'user-456' }

  // Act
  const response = await request.post('/checkout', { data: payload })

  // Assert
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('orderId')
})
```

#### 🟠 High E2E

**`apps/server/checkout/checkout.use-case.ts`** — Error/failure state not covered [TDD]

Note: requires `/checkout` route to exist before this test can pass.

```typescript
import { test, expect } from '@playwright/test'

test('When checkout is called with missing required fields, Then returns an error response', async ({ request }) => {
  // Arrange
  const payload = { cartId: '', userId: '' }

  // Act
  const response = await request.post('/checkout', { data: payload })

  // Assert
  expect(response.ok()).toBeFalsy()
  const body = await response.json()
  expect(body).toHaveProperty('error')
})
```

---

### Remediation Plan

1. **[Critical — Unit]** Create `apps/server/checkout/checkout.use-case.test.ts`. Write the happy-path test red-first (it will fail on the stub's empty `orderId`). Implement real checkout logic to make it green.
2. **[Critical — E2E]** Once a `/checkout` HTTP route exists, create an E2E test using `{ request }` fixture asserting the happy-path API response includes a non-empty `orderId`.
3. **[High — E2E]** Add a second E2E test using `{ request }` asserting invalid/missing input returns a non-2xx status with an error body.
