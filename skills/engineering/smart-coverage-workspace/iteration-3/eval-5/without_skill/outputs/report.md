# Coverage Gap Report: `checkout.use-case.ts`

## File Under Analysis

`apps/server/checkout/checkout.use-case.ts`

```ts
export async function checkout(cartId: string) {
  return { orderId: 'ord_1' }
}
```

---

## Summary

The `checkout` function is a trivial stub that always returns a hardcoded `{ orderId: 'ord_1' }` regardless of input. There are zero existing tests. The public interface consists of a single exported async function with one string parameter.

---

## Unit / Integration Test Gaps

```ts
describe('checkout', () => {
  it('returns an orderId when given a valid cartId', async () => {
    const result = await checkout('cart_abc');
    expect(result).toHaveProperty('orderId');
    expect(typeof result.orderId).toBe('string');
  });

  it('returns a non-empty orderId', async () => {
    const result = await checkout('cart_abc');
    expect(result.orderId).not.toBe('');
  });

  it('returns an object with only the orderId key', async () => {
    const result = await checkout('cart_abc');
    expect(Object.keys(result)).toEqual(['orderId']);
  });

  it('resolves to a new orderId for each unique cartId', async () => {
    const result1 = await checkout('cart_1');
    const result2 = await checkout('cart_2');
    expect(result1).toHaveProperty('orderId');
    expect(result2).toHaveProperty('orderId');
  });

  it('is an async function (returns a Promise)', () => {
    const promise = checkout('cart_abc');
    expect(promise).toBeInstanceOf(Promise);
  });
});
```

### Priority

| Gap | Priority |
|-----|----------|
| Returns `orderId` for a valid `cartId` | Critical |
| Result shape matches expected contract | High |
| Async / Promise resolution | Medium |
| Idempotency / distinct orders per cart | Low (stub only) |

---

## E2E Gaps (Playwright — `request` fixture)

Since `checkout` is a server-side use-case, E2E tests target the HTTP API layer using the `request` fixture, not the browser.

```ts
import { test, expect } from '@playwright/test';

test.describe('POST /checkout', () => {
  test('returns 200 and an orderId for a valid cartId', async ({ request }) => {
    const response = await request.post('/checkout', {
      data: { cartId: 'cart_abc' },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('orderId');
    expect(typeof body.orderId).toBe('string');
    expect(body.orderId).not.toBe('');
  });

  test('returns a consistent orderId shape across multiple calls', async ({ request }) => {
    const r1 = await request.post('/checkout', { data: { cartId: 'cart_1' } });
    const r2 = await request.post('/checkout', { data: { cartId: 'cart_2' } });

    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(b1).toHaveProperty('orderId');
    expect(b2).toHaveProperty('orderId');
  });

  test('returns 400 when cartId is missing', async ({ request }) => {
    const response = await request.post('/checkout', { data: {} });
    expect(response.status()).toBe(400);
  });

  test('returns 400 when cartId is empty string', async ({ request }) => {
    const response = await request.post('/checkout', { data: { cartId: '' } });
    expect(response.status()).toBe(400);
  });

  test('returns 404 when cartId does not exist', async ({ request }) => {
    const response = await request.post('/checkout', {
      data: { cartId: 'nonexistent_cart_99999' },
    });
    // Once real persistence is added, unknown carts should yield 404
    expect([404, 200]).toContain(response.status());
  });
});
```

### E2E Priority

| Gap | Priority |
|-----|----------|
| Happy path: valid cartId → 200 + orderId | Critical |
| Missing cartId → 400 | High |
| Empty cartId → 400 | High |
| Unknown cartId → 404 (post-stub) | Medium |
| Response shape stability across calls | Low |

---

## Notes

- The current implementation is a stub (`return { orderId: 'ord_1' }`). Many gaps above will only become meaningful once real checkout logic (cart lookup, order creation, persistence) is added.
- The E2E tests assume a route `POST /checkout` exists in the server and that the `baseURL` is configured in `playwright.config.ts`.
- No `{ page }` fixture is used — all E2E tests operate at the HTTP/API layer via `{ request }`.
