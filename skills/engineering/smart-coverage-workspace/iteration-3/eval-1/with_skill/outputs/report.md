## Coverage Gap Report

1 file changed, 2 gaps found (1 critical, 1 high, 0 medium, 0 low)

### 🔴 Critical

**`apps/server/payment.controller.ts`**
- Missing: No test file exists for this HTTP controller (Exit Door 1 — Response)
- Suggested:
```typescript
describe('createPayment', () => {
  it('When amount is provided, Then responds 201 with id and amount', async () => {
    // Arrange
    const mockReply = { code: vi.fn().mockReturnThis(), send: vi.fn() }
    const mockReq = { body: { amount: 50 } }

    // Act
    await createPayment(mockReq as FastifyRequest, mockReply as unknown as FastifyReply)

    // Assert
    expect(mockReply.code).toHaveBeenCalledWith(201)
    expect(mockReply.send).toHaveBeenCalledWith({ id: 'pay_123', amount: 50 })
  })
})
```

### 🟠 High

**`apps/server/payment.controller.ts`**

Gap 1 — Missing error path: no amount provided (Exit Door 5)
```typescript
describe('createPayment', () => {
  it('When amount is missing, Then responds 400 with error message', async () => {
    // Arrange
    const mockReply = { code: vi.fn().mockReturnThis(), send: vi.fn() }
    const mockReq = { body: {} }

    // Act
    await createPayment(mockReq as FastifyRequest, mockReply as unknown as FastifyReply)

    // Assert
    expect(mockReply.code).toHaveBeenCalledWith(400)
    expect(mockReply.send).toHaveBeenCalledWith({ error: 'amount required' })
  })
})
```

### 🟡 Medium

_None_

### 🟢 Low

_None_

### ✅ Already Covered

_None — no test files exist in this repo._

### ⏭️ Skipped

- `apps/server/payment.controller.ts` — Exit Door 2 (state): dropped — no persistence code in source (DB call comment only, no actual repository or DB write)
- `apps/server/payment.controller.ts` — Exit Door 3 (external call): dropped — no external call code in source (`// calls use-case, writes to DB` is a comment, not real logic)
- `apps/server/payment.controller.ts` — Exit Door 4 (queue events): dropped — no queue publish code in source

### Remediation Plan

1. Create `apps/server/payment.controller.test.ts` and add the Critical gap test: happy-path 201 response with `{ id, amount }` shape (Exit Door 1).
2. Add the High gap test in the same file: missing-amount 400 response with `{ error: 'amount required' }` (Exit Door 5).
