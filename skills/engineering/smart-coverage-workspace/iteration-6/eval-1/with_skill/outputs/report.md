## Coverage Gap Report
1 file changed, 4 gaps found (1 critical, 2 high, 0 medium, 1 low) + 0 redundant

### 🐛 Likely Bug Surfaced
**`apps/server/payment.controller.ts:4`** — `if (!amount)` rejects `0` and `NaN` but accepts negative numbers, so `{ amount: -100 }` returns `201 Created`. Fix: replace with `if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) { reply.code(400).send({ error: 'amount required' }); return }`.

### 🔴 Critical
**`apps/server/payment.controller.ts`**
- Missing: Exit Door 1 (Response) — happy path returns 201 with `{ id, amount }`. No test file exists for a new HTTP route.
- Suggested:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { createPayment } from './payment.controller'

describe('POST /payments', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = Fastify()
    app.post('/payments', createPayment)
    await app.ready()
  })
  afterAll(async () => { await app.close() })

  it('When body has a positive amount, Then responds 201 with payment payload', async () => {
    // Arrange
    const payload = { amount: 500 }
    // Act
    const res = await app.inject({ method: 'POST', url: '/payments', payload })
    // Assert
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ id: 'pay_123', amount: 500 })
  })
})
```

### 🟠 High
**`apps/server/payment.controller.ts`**

Gap 1 — Missing amount triggers 400 (Exit Door 5: error path on falsy guard)
```typescript
it('When body omits amount, Then responds 400 with error message', async () => {
  // Arrange
  const payload = {}
  // Act
  const res = await app.inject({ method: 'POST', url: '/payments', payload })
  // Assert
  expect(res.statusCode).toBe(400)
  expect(res.json()).toEqual({ error: 'amount required' })
})
```

Gap 2 — Negative / non-finite amount handling (Exit Door 5: blind-spot for `!amount` guard; pins current behavior, will fail once bug above is fixed)
```typescript
it.each([
  { label: 'zero',     amount: 0,    expectedStatus: 400 },
  { label: 'NaN',      amount: NaN,  expectedStatus: 400 },
  { label: 'negative', amount: -100, expectedStatus: 400 }, // FAILS today — surfaces bug at line 4
])('When amount is $label, Then responds 400', async ({ amount, expectedStatus }) => {
  // Arrange
  const payload = { amount }
  // Act
  const res = await app.inject({ method: 'POST', url: '/payments', payload })
  // Assert
  expect(res.statusCode).toBe(expectedStatus)
})
```

### 🟡 Medium
_None._

### 🟢 Low
**`apps/server/payment.controller.ts`**

Gap 3 — Wrong HTTP method rejected by Fastify router (Tier A, low signal but cheap)
```typescript
it('When method is GET on /payments, Then responds 404', async () => {
  // Act
  const res = await app.inject({ method: 'GET', url: '/payments' })
  // Assert
  expect(res.statusCode).toBe(404)
})
```

### ✅ Already Covered
_None._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `apps/server/payment.controller.ts` — Exit Door 2 (state persisted) skipped: source comment claims "writes to DB" but no DB call exists in code. Comments do not count (Phase 4b).
- `apps/server/payment.controller.ts` — Exit Door 3 (external call) skipped: source comment claims "calls use-case" but no call exists. Unlock route: implement the use-case call, then add a Tier B test injecting a seam like `var createPaymentUseCase = realCreatePaymentUseCase` and asserting it was invoked with `{ amount }`.
- `apps/server/payment.controller.ts` — Exit Door 4 (queue events) skipped: source publishes nothing.

### Remediation Plan
1. Create `apps/server/payment.controller.test.ts` with the Fastify `app.inject()` harness from the Critical sketch (happy path, 201 + body shape).
2. Add the missing-amount 400 test (High Gap 1).
3. Add the parameterized invalid-amount test (High Gap 2) — the `-100` row will fail and surface the bug at `payment.controller.ts:4`.
4. Fix the guard at line 4: `if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) { ... }` — re-run; Gap 2 now green.
5. Add the wrong-method 404 test (Low Gap 3) if you want router coverage.
6. When the real use-case + DB write land, add Tier B tests for Exit Doors 2 and 3 (currently skipped).
