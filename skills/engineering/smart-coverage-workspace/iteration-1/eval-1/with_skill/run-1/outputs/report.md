## Coverage Gap Report

1 file changed, 5 gaps found (1 critical, 3 high, 1 low)

---

### Phase 0: Language Detection

Script output:
```json
{"files":{"apps/server/payment.controller.ts":"typescript"},"frameworks":[],"playwright":false}
```

Reference loaded: `references/typescript.md` + `references/testing-principles.md`

---

### Phase 1: Changed Files

| File | Language |
|------|----------|
| `apps/server/payment.controller.ts` | TypeScript |

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/payment.controller.ts` | HTTP controller | All 5 (Response, New State, External Calls, Message Queue Events, Observability) |

---

### Phase 3: Existing Coverage

No test files found anywhere in the repository (no `*.test.ts`, `*.spec.ts`, or `__tests__/` directories). Zero exit doors covered.

---

### Phase 4: Gap Classification

- **Exit Door 1 (Response)** — HTTP route with no test file at all → Critical
- **Exit Door 5 (Observability)** — error path (missing `amount`) returns 400 → High
- **Exit Door 2 (New State)** — DB write asserted via public API → High
- **Exit Door 3 (External Calls)** — use-case called correctly → High
- **Exit Door 4 (Message Queue Events)** — no queue publishing evident in source, but untested → Low

---

## Coverage Gap Report

1 file changed, 5 gaps found (1 critical, 3 high, 1 low)

### Critical

**`apps/server/payment.controller.ts`**
- Missing: No test file exists at all for this HTTP controller
- Suggested: `When POST /payments is called with a valid amount, Then it responds 201 with a payment id and the submitted amount`

```typescript
describe('POST /payments', () => {
  it('When a valid amount is provided, Then responds 201 with payment id and amount', async () => {
    // Arrange
    const app = buildApp()

    // Act
    const res = await app.inject({ method: 'POST', url: '/payments', body: { amount: 100 } })

    // Assert
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ id: expect.any(String), amount: 100 })
  })
})
```

---

### High

**`apps/server/payment.controller.ts`**

Gap 1 — Missing amount validation / error response (Exit Door 5)
- `When POST /payments is called without an amount, Then it responds 400 with error "amount required"`

```typescript
it('When amount is missing, Then responds 400 with error message', async () => {
  // Arrange
  const app = buildApp()

  // Act
  const res = await app.inject({ method: 'POST', url: '/payments', body: {} })

  // Assert
  expect(res.statusCode).toBe(400)
  expect(res.json()).toEqual({ error: 'amount required' })
})
```

Gap 2 — New state persisted to DB (Exit Door 2)
- `When POST /payments succeeds, Then the payment record is retrievable via the public API`

```typescript
it('When payment is created, Then it is retrievable by its id', async () => {
  // Arrange
  const app = buildApp()

  // Act
  const createRes = await app.inject({ method: 'POST', url: '/payments', body: { amount: 50 } })
  const { id } = createRes.json()

  // Assert — verify state via public interface, not raw DB
  const fetchRes = await app.inject({ method: 'GET', url: `/payments/${id}` })
  expect(fetchRes.statusCode).toBe(200)
  expect(fetchRes.json()).toMatchObject({ id, amount: 50 })
})
```

Gap 3 — Use-case is invoked (Exit Door 3)
- `When POST /payments is called with a valid amount, Then the payment use-case is called with that amount`

```typescript
it('When a valid amount is provided, Then the payment use-case receives the correct amount', async () => {
  // Arrange
  const spy = vi.fn().mockResolvedValue({ id: 'pay_123', amount: 75 })
  const app = buildApp({ createPaymentUseCase: spy })

  // Act
  await app.inject({ method: 'POST', url: '/payments', body: { amount: 75 } })

  // Assert
  expect(spy).toHaveBeenCalledWith({ amount: 75 })
})
```

---

### Low

**`apps/server/payment.controller.ts`**

Gap 1 — Zero-value amount edge case (Exit Door 5 / Exit Door 1)
- `When POST /payments is called with amount = 0, Then it is treated as missing and responds 400`

```typescript
it('When amount is zero (falsy), Then responds 400 with error message', async () => {
  const app = buildApp()
  const res = await app.inject({ method: 'POST', url: '/payments', body: { amount: 0 } })
  expect(res.statusCode).toBe(400)
  expect(res.json()).toEqual({ error: 'amount required' })
})
```

---

### Already Covered

_(none — no test files exist in this repository)_

---

### Skipped

_(none — the only changed file is the HTTP controller above, which is in scope)_

---

### Remediation Plan

1. [Critical] Create `apps/server/payment.controller.test.ts` — add happy-path test for `POST /payments` with valid amount; assert HTTP 201 + response body shape (Exit Door 1).
2. [High] Add error-path test: `POST /payments` with missing `amount` — assert HTTP 400 + `{ error: 'amount required' }` (Exit Door 5).
3. [High] Add state-verification test: after successful creation, retrieve the payment via public API and confirm the record exists with correct data (Exit Door 2).
4. [High] Add external-call assertion: inject a spy/stub for the payment use-case and assert it is called with the correct `amount` argument (Exit Door 3).
5. [Low] Add edge-case test: `amount = 0` (falsy) should be treated as missing and return 400 — clarify the intended behavior (Exit Door 5 / boundary).
