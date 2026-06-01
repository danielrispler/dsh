## Coverage Gap Report

1 file changed, 3 gaps found (0 critical, 3 high, 0 medium, 0 low)

---

### Phase 0

Detection output: `{"files":{"apps/server/payment.controller.ts":"typescript","apps/server/payment.controller.test.ts":"typescript"},"frameworks":[],"playwright":false}`
References loaded: `typescript.md` + `testing-principles.md`. No overlays.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/payment.controller.ts` | HTTP controller (Fastify) | 1, 2, 3, 4, 5 |

---

### Phase 3: Existing Coverage

Co-located test file `apps/server/payment.controller.test.ts` contains only `describe('createPayment', () => {})` — zero actual tests.

---

### 🔴 Critical

_None._

---

### 🟠 High

**`apps/server/payment.controller.ts`**

Gap 1 — Happy-path response (Exit Door 1)

```typescript
describe('createPayment', () => {
  it('When valid amount and currency, Then responds 201 with id and amount', async () => {
    // Arrange
    const app = buildTestApp() // register POST /payments route
    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/payments',
      payload: { amount: 100, currency: 'USD' },
    })
    // Assert
    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ id: expect.any(String), amount: 100 })
  })
})
```

Gap 2 — Validation error path: amount = 0 or negative (Exit Door 5)

```typescript
describe('createPayment', () => {
  it('When amount is 0, Then responds 400 with error message', async () => {
    // Arrange
    const app = buildTestApp()
    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/payments',
      payload: { amount: 0, currency: 'USD' },
    })
    // Assert
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: 'Invalid amount' })
  })

  it('When amount is negative, Then responds 400 with error message', async () => {
    // Arrange
    const app = buildTestApp()
    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/payments',
      payload: { amount: -50, currency: 'USD' },
    })
    // Assert
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: 'Invalid amount' })
  })
})
```

Gap 3 — Use-case called with correct args (Exit Door 3) `[REQUIRES REFACTOR]`

`paymentUseCase` is a free variable in the current source — not passed via parameter, factory, or Fastify plugin option. There is no public seam to verify the call without modifying source.

**Required refactor:** Accept `paymentUseCase` as an explicit dependency — e.g. `buildCreatePaymentHandler(paymentUseCase)` or Fastify plugin options — so tests can inject a recording stub.

Once the seam exists:

```typescript
describe('createPayment', () => {
  it('When valid payload, Then calls use-case with amount and currency', async () => {
    // Arrange
    const executeSpy = vi.fn().mockResolvedValue({ id: 'pay-1', amount: 100 })
    const app = buildTestApp({ paymentUseCase: { execute: executeSpy } })
    // Act
    await app.inject({
      method: 'POST',
      url: '/payments',
      payload: { amount: 100, currency: 'USD' },
    })
    // Assert
    expect(executeSpy).toHaveBeenCalledWith({ amount: 100, currency: 'USD' })
  })
})
```

---

### 🟡 Medium

_None._

---

### 🟢 Low

_None._

---

### ✅ Already Covered

_None — no exit doors covered by the existing placeholder test file._

---

### ⏭️ Skipped

- `apps/server/payment.controller.ts` — Exit Door 2 (state): dropped — no persistence logic in source; handler delegates to use-case and returns its result.
- `apps/server/payment.controller.ts` — Exit Door 4 (queue events): dropped — no message-queue publish in source.
- `apps/server/payment.controller.test.ts` — test file; excluded from working set per TEST_PATTERN filter.

---

### Remediation Plan

1. **[High — Gap 2]** Add tests for the validation error path (amount = 0, amount < 0) using `app.inject()`. No source changes needed.
2. **[High — Gap 3 — REQUIRES REFACTOR]** Refactor `payment.controller.ts` to accept `paymentUseCase` as an explicit dependency (factory or Fastify plugin options). Then add test asserting `execute` called with `{ amount, currency }`.
3. **[High — Gap 1]** Add happy-path test asserting 201 + `{ id, amount }`. Unblocked once Gap 3 refactor provides the injectable seam.
