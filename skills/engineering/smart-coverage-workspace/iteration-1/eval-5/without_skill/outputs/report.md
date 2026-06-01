# Coverage Gap Report: checkout.use-case.ts (baseline — no skill)

## Source Under Analysis

```ts
export async function checkout(cartId: string) {
  return { orderId: 'ord_1' }
}
```

## Coverage Gaps

### Critical

| # | Gap | Why critical |
|---|-----|--------------|
| C1 | `checkout` never called by any test | Zero test coverage |
| C2 | Return value contract `{ orderId: string }` untested | Only observable output has no assertion |
| C3 | Input validation untested | Empty/invalid `cartId` — no test specifies expected behavior |

### High

| # | Gap |
|---|-----|
| H1 | Async error paths — no reject/throw tests |
| H2 | Idempotency: same `cartId` called twice |
| H3 | E2E flow through HTTP layer — no Playwright test for POST /checkout |

### Medium

| # | Gap |
|---|-----|
| M1 | `orderId` uniqueness across different carts |
| M2 | Concurrent calls safety |

### Low

| # | Gap |
|---|-----|
| L1 | Type-level contract test |

## Recommended Tests (Vitest)

```ts
describe('checkout', () => {
  it('returns an orderId for a valid cartId', async () => {
    const result = await checkout('cart_abc')
    expect(result).toHaveProperty('orderId')
  })
  it('rejects for an empty cartId', async () => {
    await expect(checkout('')).rejects.toThrow()
  })
  it('returns same orderId when called twice with same cartId', async () => {
    const first = await checkout('cart_idem')
    const second = await checkout('cart_idem')
    expect(first.orderId).toBe(second.orderId)
  })
})
```

## E2E (Playwright)

```ts
test('POST /checkout returns 200 with an orderId', async ({ request }) => {
  const response = await request.post('/checkout', { data: { cartId: 'cart_e2e_1' } })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body).toHaveProperty('orderId')
})
```
