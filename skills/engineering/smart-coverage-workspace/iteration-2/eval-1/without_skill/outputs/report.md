# Test Coverage Gap Report: `payment.controller.ts`

## Summary

The `createPayment` controller has **zero existing tests**. The function is a Fastify route handler that validates an `amount` field from the request body, then returns a created payment response. All branches and behaviors are untested.

---

## Public Interface Under Test

```ts
export async function createPayment(req: FastifyRequest, reply: FastifyReply): Promise<void>
```

---

## Coverage Gaps

### Priority: Critical

| # | Gap | Reason |
|---|-----|--------|
| 1 | Missing `amount` in request body returns 400 | Core validation branch — no test exists |
| 2 | Valid `amount` returns 201 with payment object | Happy path — completely untested |
| 3 | `amount` is `0` (falsy) returns 400 | Edge case: `!amount` is `true` for `0`, a common monetary footgun |

### Priority: High

| # | Gap | Reason |
|---|-----|--------|
| 4 | `amount` is `null` returns 400 | Falsy value, explicit null from JSON body |
| 5 | Response body shape is correct (`id`, `amount`) | Contract assertion — no structural test |
| 6 | Response `amount` echoes back exactly the value sent | Data integrity — the returned `amount` comes directly from the body |

### Priority: Medium

| # | Gap | Reason |
|---|-----|--------|
| 7 | `amount` is a negative number | Domain validity — negative payments may be semantically invalid |
| 8 | `amount` is a non-numeric string | Type coercion risk with `as { amount: number }` cast |
| 9 | `amount` is `undefined` explicitly | Explicit undefined vs absent key — both hit `!amount` but worth confirming |

---

## Suggested Test Cases (Vitest / TypeScript)

```ts
import { describe, it, expect } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { createPayment } from './payment.controller'

function makeReply() {
  const reply = {
    _code: 0,
    _body: undefined as unknown,
    code(c: number) { this._code = c; return this },
    send(b: unknown) { this._body = b; return this },
  }
  return reply
}

function makeRequest(body: unknown): FastifyRequest {
  return { body } as FastifyRequest
}

describe('createPayment', () => {
  describe('When amount is missing from the request body', () => {
    it('Then it responds with 400 and an error message', async () => {
      const req = makeRequest({})
      const reply = makeReply()

      await createPayment(req, reply as unknown as FastifyReply)

      expect(reply._code).toBe(400)
      expect(reply._body).toEqual({ error: 'amount required' })
    })
  })

  describe('When amount is 0 (falsy numeric value)', () => {
    it('Then it responds with 400 because 0 fails the !amount guard', async () => {
      const req = makeRequest({ amount: 0 })
      const reply = makeReply()

      await createPayment(req, reply as unknown as FastifyReply)

      expect(reply._code).toBe(400)
      expect(reply._body).toEqual({ error: 'amount required' })
    })
  })

  describe('When amount is null', () => {
    it('Then it responds with 400', async () => {
      const req = makeRequest({ amount: null })
      const reply = makeReply()

      await createPayment(req, reply as unknown as FastifyReply)

      expect(reply._code).toBe(400)
      expect(reply._body).toEqual({ error: 'amount required' })
    })
  })

  describe('When a valid positive amount is provided', () => {
    it('Then it responds with 201 and a payment object containing id and amount', async () => {
      const req = makeRequest({ amount: 5000 })
      const reply = makeReply()

      await createPayment(req, reply as unknown as FastifyReply)

      expect(reply._code).toBe(201)
      expect(reply._body).toEqual({ id: 'pay_123', amount: 5000 })
    })

    it('Then the response echoes back the exact amount from the request', async () => {
      const req = makeRequest({ amount: 9999 })
      const reply = makeReply()

      await createPayment(req, reply as unknown as FastifyReply)

      expect((reply._body as { amount: number }).amount).toBe(9999)
    })
  })

  describe('When amount is a negative number', () => {
    it('Then it currently responds with 201 (documents missing domain validation)', async () => {
      // NOTE: negative values pass through because -100 is truthy.
      // This test documents current behavior; a future story should add domain validation.
      const req = makeRequest({ amount: -100 })
      const reply = makeReply()

      await createPayment(req, reply as unknown as FastifyReply)

      expect(reply._code).toBe(201)
    })
  })

  describe('When amount is a non-numeric string', () => {
    it('Then it currently responds with 201 because the string is truthy (type cast risk)', async () => {
      // NOTE: documents a type-safety gap. The cast `as { amount: number }` does
      // not validate at runtime, so strings pass the !amount guard.
      const req = makeRequest({ amount: 'abc' })
      const reply = makeReply()

      await createPayment(req, reply as unknown as FastifyReply)

      expect(reply._code).toBe(201)
    })
  })
})
```

---

## Notes

1. **`!amount` footgun** — The guard `!amount` is falsy for `0`, `null`, `undefined`, `''`, and `false`. A payment of zero cents/pence will incorrectly return 400. The test for `amount: 0` above documents this as a **bug**, not desired behavior.

2. **Type-cast risk** — `req.body as { amount: number }` is a compile-time assertion with no runtime validation. Any non-number truthy value will reach the use-case call. Consider adding a Zod or JSON Schema body validation to the Fastify route declaration.

3. **Use-case is stubbed** — The comment `// calls use-case, writes to DB` indicates business logic is not yet implemented. Once wired, additional tests should cover use-case error paths (e.g., database failure → 500).
