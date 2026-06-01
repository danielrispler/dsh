## Coverage Gap Report
1 file changed, 2 gaps found (1 critical, 1 high, 0 medium, 0 low) + 0 redundant.

### 🔴 Critical
**`apps/server/payment.controller.ts`**
- Missing: Exit Door 1 (Response) — happy-path 201 with body shape. HTTP controller has no test file at all.
- Suggested:
```typescript
import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { createPayment } from './payment.controller'

describe('POST /payments', () => {
  it('When amount is provided, Then responds 201 with payment id and amount', async () => {
    // Arrange
    const app = Fastify()
    app.post('/payments', createPayment)
    await app.ready()

    // Act
    const res = await app.inject({ method: 'POST', url: '/payments', payload: { amount: 100 } })

    // Assert
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ id: 'pay_123', amount: 100 })
  })
})
```

### 🟠 High
**`apps/server/payment.controller.ts`**

Gap 1 — Missing amount returns 400 (Exit Door 5 — error path / falsy guard)
```typescript
import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { createPayment } from './payment.controller'

describe('POST /payments — validation', () => {
  it('When amount is missing, Then responds 400 with error message', async () => {
    // Arrange
    const app = Fastify()
    app.post('/payments', createPayment)
    await app.ready()

    // Act
    const res = await app.inject({ method: 'POST', url: '/payments', payload: {} })

    // Assert
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'amount required' })
  })
})
```

### 🟡 Medium
_None._

### 🟢 Low
_None._

### ✅ Already Covered
_None._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `apps/server/payment.controller.ts` — Exit Door 2 (state) dropped: behavior not in source (only a `// writes to DB` comment, no persistence call).
- `apps/server/payment.controller.ts` — Exit Door 3 (external call) dropped: behavior not in source (no external system call present).
- `apps/server/payment.controller.ts` — Exit Door 4 (queue events) dropped: behavior not in source (no queue publish).

### Remediation Plan
1. Create `apps/server/payment.controller.test.ts` and add the happy-path 201 test using `Fastify().inject()` (Critical).
2. Add the missing-amount 400 validation test to the same file (High).
