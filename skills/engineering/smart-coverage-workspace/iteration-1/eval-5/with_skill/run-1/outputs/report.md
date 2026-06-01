# Coverage Gap Report

1 file changed, 5 gaps found (1 critical, 3 high, 0 medium, 1 low)

**Phase 0 detection script output:**
```json
{"files":{"apps/server/checkout/checkout.use-case.ts":"typescript"},"frameworks":[],"playwright":true}
```
References loaded: `typescript.md`, `playwright.md`

---

## TypeScript

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/checkout/checkout.use-case.ts` | Use-case / application service | 1, 2, 3, 4 |

### 🔴 Critical

**`apps/server/checkout/checkout.use-case.ts`**
- Missing: No test file at all
- Suggested:

```typescript
describe('checkout', () => {
  it('When a valid cartId is provided, Then it returns an orderId', async () => {
    const result = await checkout('cart_abc')
    expect(result.orderId).toBeDefined()
  })
})
```

### 🟠 High

Gap 1 — Error path (Exit Door 5)
```typescript
it('When an empty cartId is provided, Then it throws an error', async () => {
  await expect(checkout('')).rejects.toThrow()
})
```

Gap 2 — State verification (Exit Door 2)
```typescript
it('When checkout succeeds, Then the cart state transitions to checked-out', async () => {
  await checkout('cart_abc')
  const cart = await getCart('cart_abc')
  expect(cart.status).toBe('checked-out')
})
```

Gap 3 — External call assertion (Exit Door 3)
```typescript
it('When checkout is called, Then it persists the order', async () => {
  const result = await checkout('cart_xyz')
  const order = await getOrder(result.orderId)
  expect(order.cartId).toBe('cart_xyz')
})
```

### 🟢 Low

Gap 1 — Message queue events (Exit Door 4)
```typescript
it('When checkout completes, Then an order-created event is published', async () => {
  const result = await checkout('cart_abc')
  const events = await consumeEvents('order-created')
  expect(events).toContainEqual(expect.objectContaining({ orderId: result.orderId }))
})
```

### ✅ Already Covered
_(none)_

### ⏭️ Skipped
- `playwright.config.ts` — config file (matches `*.config.ts` SKIP_PATTERN)

### Remediation Plan
1. Create `checkout.use-case.test.ts` — happy-path (Critical)
2. Add error-path for empty cartId (High — Exit Door 5)
3. Add state-verification test (High — Exit Door 2)
4. Add external-call assertion (High — Exit Door 3)
5. Add message-queue event assertion (Low — Exit Door 4)

---

### E2E Gaps

Playwright detected (`playwright.config.ts`). No E2E specs found.

#### 🔴 Critical E2E gaps
- Checkout flow happy path has no E2E test
```typescript
test('When user completes checkout, Then order confirmation displayed', async ({ page }) => {
  await page.goto('/cart')
  await page.getByRole('button', { name: /checkout/i }).click()
  await expect(page.getByText(/order confirmed/i)).toBeVisible()
})
```

#### 🟠 High E2E gaps
- Checkout error state not covered (cart empty → error message)
```typescript
test('When cart is empty, Then checkout shows error', async ({ page }) => {
  await page.route('**/checkout', route =>
    route.fulfill({ status: 400, body: JSON.stringify({ error: 'Cart is empty' }) })
  )
  await page.getByRole('button', { name: /checkout/i }).click()
  await expect(page.getByText(/cart is empty/i)).toBeVisible()
})
```

#### 🟡 Medium E2E gaps
- No accessibility assertion on checkout page

#### 🟢 Low E2E gaps
- Additional viewport sizes
