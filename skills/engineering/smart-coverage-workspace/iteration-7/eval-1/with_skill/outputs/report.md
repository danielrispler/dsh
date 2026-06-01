## Coverage Gap Report
1 file changed, 4 gaps found (1 critical, 2 high, 0 medium, 1 low)

### 🐛 Likely Bug Surfaced
**`apps/server/payment.controller.ts:4`** — `if (!amount)` rejects `0` but lets negative numbers (`-50`) and non-numbers through to the 201 response. Fix: `if (typeof amount !== 'number' || amount <= 0) { reply.code(400)... }`.

### 🔴 Critical
**`apps/server/payment.controller.ts`**
- Missing: HTTP controller has no test file at all (POST /payments — money path).
- Suggested (Tier A — writeable today, validates current source via Fastify `inject`):
```typescript
import Fastify from 'fastify'
import { createPayment } from './payment.controller'

function buildTestApp() {
  const app = Fastify()
  app.post('/payments', createPayment)
  return app
}

describe('POST /payments', () => {
  it('When body has valid amount, Then responds 201 with payment id and echoed amount', async () => {
    // Arrange
    const app = buildTestApp()
    // Act
    const res = await app.inject({ method: 'POST', url: '/payments', payload: { amount: 100 } })
    // Assert
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ id: 'pay_123', amount: 100 })
    // [TDD] currently passes against stub literal; will need updating once real use-case wired in
  })
})
```

### 🟠 High
**`apps/server/payment.controller.ts`**

Gap 1 — Missing amount rejected (Exit Door 5, error path)
```typescript
it('When body omits amount, Then responds 400 with { error: "amount required" }', async () => {
  // Arrange
  const app = buildTestApp()
  // Act
  const res = await app.inject({ method: 'POST', url: '/payments', payload: {} })
  // Assert
  expect(res.statusCode).toBe(400)
  expect(res.json()).toEqual({ error: 'amount required' })
})
```

Gap 2 — Falsy-guard blind spot for 0 / negative / non-numeric amount (Exit Door 5; surfaces the bug above)
```typescript
it.each([
  { name: 'zero',     payload: { amount: 0 },     expectStatus: 400 },
  { name: 'negative', payload: { amount: -50 },   expectStatus: 400 }, // currently 201 — RED, exposes bug
  { name: 'string',   payload: { amount: 'abc' }, expectStatus: 400 }, // currently 201 — RED
])('When amount is $name, Then responds 400', async ({ payload, expectStatus }) => {
  // Arrange
  const app = buildTestApp()
  // Act
  const res = await app.inject({ method: 'POST', url: '/payments', payload })
  // Assert
  expect(res.statusCode).toBe(expectStatus)
})
```

### 🟢 Low
**`apps/server/payment.controller.ts`**

Gap 3 — Wrong HTTP method on /payments
```typescript
it('When GET /payments, Then responds 404 (route only registered for POST)', async () => {
  // Arrange
  const app = buildTestApp()
  // Act
  const res = await app.inject({ method: 'GET', url: '/payments' })
  // Assert
  expect(res.statusCode).toBe(404)
})
```

### ⏭️ Skipped
- `apps/server/payment.controller.ts` ED 2 (state) — source does not persist anything yet (comment-only). Unlocks under Phase 4a Tier B once a use-case/repository seam is injected (`var createPaymentUseCase = realUseCase`); then assert persisted payment via repo's public read API.
- `apps/server/payment.controller.ts` ED 3 (external call) — no external call in source yet. Unlocks under Tier B/C with DI of the use-case / DB client; then assert the use-case was invoked with `{ amount }` mapped correctly.
- `apps/server/payment.controller.ts` ED 4 (queue event) — no publish in source. Unlocks under Tier C with a message-bus dependency; then assert routing key + payload.

### Remediation Plan
1. Create `apps/server/payment.controller.test.ts` with the Tier A Fastify `inject` harness above (replaces the empty placeholder describe).
2. Add the 201 happy-path test (Critical gap) — locks down current response contract.
3. Add the missing-amount 400 test (High Gap 1) — covers the only real branch in source today.
4. Add the parametrized invalid-amount table (High Gap 2) — three of these will fail RED and surface the `!amount` bug; fix the guard to `typeof amount !== 'number' || amount <= 0` once tests are in.
5. Add the wrong-method 404 test (Low Gap 3).
6. After landing the use-case/DB wiring, introduce a 1-line seam (`var createPaymentUseCase = realUseCase`) and add Tier B tests for ED 2 (persisted state via repo read) and ED 3 (use-case invoked with mapped args).
