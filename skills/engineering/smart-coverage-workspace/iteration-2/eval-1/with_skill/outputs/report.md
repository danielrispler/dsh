## Coverage Gap Report
1 file changed, 5 gaps found (1 critical, 2 high, 1 medium, 1 low)

**Phase 0 detection script output:**
```json
{"files":{"apps/server/payment.controller.ts":"typescript"},"frameworks":[],"playwright":false}
```
References loaded: `typescript.md` + `testing-principles.md`. No framework overlays, no Playwright.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `apps/server/payment.controller.ts` | HTTP controller | 1, 2, 3, 4, 5 |

### 🔴 Critical
**`apps/server/payment.controller.ts`**
- Missing: HTTP controller with no test file at all

```typescript
describe('createPayment', () => {
  it('When amount is provided, Then responds 201 with payment id and amount', async () => {
    // Arrange
    const { req, reply } = buildFastifyMocks({ body: { amount: 50 } })

    // Act
    await createPayment(req, reply)

    // Assert
    expect(reply.code).toHaveBeenCalledWith(201)
    expect(reply.send).toHaveBeenCalledWith({ id: 'pay_123', amount: 50 })
  })
})
```

---

### 🟠 High
**`apps/server/payment.controller.ts`**

Gap 1 — Missing 400 error path when amount is absent (Exit Door 5)
```typescript
describe('createPayment', () => {
  it('When amount is missing, Then responds 400 with error message', async () => {
    // Arrange
    const { req, reply } = buildFastifyMocks({ body: {} })

    // Act
    await createPayment(req, reply)

    // Assert
    expect(reply.code).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith({ error: 'amount required' })
  })
})
```

Gap 2 — Missing state verification: payment written to DB (Exit Door 2)
```typescript
describe('createPayment', () => {
  it('When valid amount is provided, Then payment record is persisted', async () => {
    // Arrange
    const { req, reply } = buildFastifyMocks({ body: { amount: 100 } })

    // Act
    await createPayment(req, reply)

    // Assert — verify via public query API, not raw DB inspection
    const stored = await paymentRepository.findById('pay_123')
    expect(stored).toMatchObject({ amount: 100 })
  })
})
```

---

### 🟡 Medium
**`apps/server/payment.controller.ts`**

Gap 1 — Missing external call assertion: use-case invoked with correct args (Exit Door 3)
```typescript
describe('createPayment', () => {
  it('When amount is provided, Then use-case is invoked with correct amount', async () => {
    // Arrange
    const { req, reply } = buildFastifyMocks({ body: { amount: 75 } })
    const spy = vi.spyOn(paymentUseCase, 'execute')

    // Act
    await createPayment(req, reply)

    // Assert
    expect(spy).toHaveBeenCalledWith({ amount: 75 })
  })
})
```

---

### 🟢 Low
**`apps/server/payment.controller.ts`**

Gap 1 — Edge case: amount = 0 is falsy, triggering the same 400 branch as missing amount (Exit Door 5)
```typescript
describe('createPayment', () => {
  it('When amount is 0, Then responds 400 with error message', async () => {
    // Arrange
    const { req, reply } = buildFastifyMocks({ body: { amount: 0 } })

    // Act
    await createPayment(req, reply)

    // Assert
    expect(reply.code).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith({ error: 'amount required' })
  })
})
```

---

### ✅ Already Covered
_(none — no test file exists)_

### ⏭️ Skipped
- Exit Door 4 (Message Queue Events) — dropped: no message queue publish in source

---

### Remediation Plan
1. Create `apps/server/payment.controller.test.ts` — HTTP controller has no test file at all (Critical)
2. Add the 400 error-path test (missing amount) to verify the guard clause (High)
3. Add the state-verification test to assert payment is persisted after a successful call (High)
4. Add the use-case invocation assertion to verify the external collaborator is called with correct payload (Medium)
5. Add the `amount = 0` edge-case test to document the falsy-guard behavior (Low)
