## Coverage Gap Report

1 file changed, 1 gap found (1 critical, 0 high, 0 medium, 0 low) + 1 critical E2E gap

**Phase 0 detection script output:**
```json
{"files":{"apps/server/checkout/checkout.use-case.ts":"typescript"},"frameworks":[],"playwright":true}
```
References loaded: `typescript.md` (base) + `playwright.md` (additive E2E overlay). No framework overlays.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/checkout/checkout.use-case.ts` | Use-case / application service | 1, 2, 3, 4 |

### Phase 3: Existing Coverage

No test files found anywhere in the repo. Zero exit doors covered.

### Phase 4: Stub Detection

The `checkout` function body returns a hardcoded literal `{ orderId: 'ord_1' }` with no real logic — **stub**. Every exit-door gap is a `[TDD]` opportunity.

- Exit Door 1 (Response): gap exists → **Critical** (use-case with no test file) `[TDD]`
- Exit Door 2 (New State): **dropped** — no persistence logic in stub body
- Exit Door 3 (External Calls): **dropped** — no external calls in stub body
- Exit Door 4 (Message Queue Events): **dropped** — no queue publish in stub body

---

### 🔴 Critical

**`apps/server/checkout/checkout.use-case.ts`**

- Missing: Exit Door 1 — Response (return value) `[TDD]` *(behavior not yet implemented — write this test red-first; it will fail until the stub is replaced)*

```typescript
import { checkout } from '../checkout.use-case'

describe('checkout use-case', () => {
  it('When a valid cartId is provided, Then returns an orderId', async () => {
    // Arrange
    const cartId = 'cart_abc'

    // Act
    const result = await checkout(cartId)

    // Assert
    expect(result).toHaveProperty('orderId')
    expect(typeof result.orderId).toBe('string')
  })
})
```

---

### 🟠 High
*No high-severity gaps.*

### 🟡 Medium
*No medium-severity gaps.*

### 🟢 Low
*No low-severity gaps.*

### ✅ Already Covered
*No exit doors covered — no test file exists.*

### ⏭️ Skipped

- `apps/server/checkout/checkout.use-case.ts` — Exit Door 2 (New State): dropped — no persistence logic in source (stub body)
- `apps/server/checkout/checkout.use-case.ts` — Exit Door 3 (External Calls): dropped — no external calls in source (stub body)
- `apps/server/checkout/checkout.use-case.ts` — Exit Door 4 (Message Queue Events): dropped — no queue publish in source (stub body)
- `playwright.config.ts` — config file, skip (`*.config.ts` matches SKIP_PATTERNS)

---

### E2E Gaps

> Changed file is a **server-side use-case** → using `{ request }` API fixture (NOT `{ page }` browser fixture).

#### 🔴 Critical E2E

Primary checkout flow has no E2E test `[TDD]` *(behavior not yet implemented — write this test red-first)*

```typescript
import { test, expect } from '@playwright/test'

test('When checkout is called with a valid cartId, Then returns an orderId', async ({ request }) => {
  // Arrange
  const cartId = 'cart_abc'

  // Act
  const response = await request.post('/checkout', {
    data: { cartId },
  })

  // Assert
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('orderId')
})
```

#### 🟠 High E2E
*Dropped — no error-handling logic in stub body; no error-response gap to report.*

---

### Remediation Plan

1. **[Critical — unit]** Create `apps/server/checkout/checkout.use-case.test.ts`. Write red test asserting `checkout(cartId)` returns `{ orderId: string }`. Run failing, then implement real logic to pass.
2. **[Critical — E2E]** Create `e2e/checkout.spec.ts` using `{ request }` fixture. POST to checkout endpoint with valid `cartId`, assert `response.ok()` and `body.orderId`. Run failing, then wire HTTP route to real use-case.
