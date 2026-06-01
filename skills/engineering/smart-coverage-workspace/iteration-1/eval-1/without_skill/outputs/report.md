# Coverage Gap Report: payment.controller.ts (baseline — no skill)

## File Analyzed
`apps/server/payment.controller.ts`

## Controller Summary
A Fastify HTTP controller with a single exported function `createPayment` that:
- Reads `amount` from `req.body`
- Returns `400` if `amount` is falsy
- Returns `201` with `{ id: 'pay_123', amount }` on success

---

## Coverage Gaps

### Critical

| # | Test Case |
|---|-----------|
| 1 | Missing `amount` field — returns 400 with `{ error: 'amount required' }` |
| 2 | Valid `amount` — returns 201 with `{ id, amount }` |

### High

| # | Test Case |
|---|-----------|
| 3 | `amount: 0` — treated as falsy, returns 400 (likely a bug) |
| 4 | `amount: null` — returns 400 |
| 5 | `amount` is a negative number — returns 201 (no domain validation) |

### Medium

| # | Test Case |
|---|-----------|
| 6 | `amount` is a non-numeric string — returns 201 with wrong type |
| 7 | `amount` is `undefined` (body omitted) — returns 400 |
| 8 | Response `id` is always hardcoded `'pay_123'` |

### Low

| # | Test Case |
|---|-----------|
| 9 | Returned `amount` echoes input value unchanged |
| 10 | `Content-Type: application/json` header on 201 response |

---

## Suggested Test Structure (Vitest)

```ts
describe('createPayment', () => {
  it('returns 400 when amount is missing', async () => { ... })
  it('returns 201 with id and amount for valid input', async () => { ... })
  it('returns 400 when amount is 0', async () => { ... })
  it('returns 400 when amount is null', async () => { ... })
  it('returns 201 for negative amount (documents missing domain rule)', async () => { ... })
  it('returns 201 for non-numeric string amount (documents type gap)', async () => { ... })
  it('returns 400 when body is empty object', async () => { ... })
  it('always returns hardcoded id pay_123', async () => { ... })
})
```
