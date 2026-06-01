## Coverage Gap Report
1 file changed, 3 gaps found (0 critical, 2 high, 1 medium, 0 low) + 3 redundant.

### 🔴 Critical
_None._

### 🟠 High
**`apps/server/order.controller.ts`**

Gap 1 — Missing userId rejected with 400 (Exit Door 5, error path; falsy `!userId` trigger)
```typescript
it('When userId is empty, Then returns 400 with error', async () => {
  // Arrange
  const { app, repo } = buildApp();
  // Act
  const res = await app.inject({
    method: 'POST',
    url: '/orders',
    payload: { userId: '', items: [{ sku: 'a', qty: 1 }] },
  });
  // Assert
  expect(res.statusCode).toBe(400);
  expect(res.json()).toEqual({ error: 'invalid order' });
  expect(repo.save).not.toHaveBeenCalled();
});
```

Gap 2 — Empty items array rejected with 400 (Exit Door 5, error path; `items.length === 0` boundary/empty trigger)
```typescript
it('When items is empty, Then returns 400 with error', async () => {
  // Arrange
  const { app, repo } = buildApp();
  // Act
  const res = await app.inject({
    method: 'POST',
    url: '/orders',
    payload: { userId: 'u1', items: [] },
  });
  // Assert
  expect(res.statusCode).toBe(400);
  expect(res.json()).toEqual({ error: 'invalid order' });
  expect(repo.save).not.toHaveBeenCalled();
});
```

### 🟡 Medium
**`apps/server/order.controller.ts`**

Gap 3 — Total computation with single item / qty boundary (Exit Door 1; `reduce` summing qty currently only proven for multi-item case)
```typescript
it('When single item with qty 1, Then total equals 1', async () => {
  // Arrange
  const { app } = buildApp();
  // Act
  const res = await app.inject({
    method: 'POST',
    url: '/orders',
    payload: { userId: 'u1', items: [{ sku: 'a', qty: 1 }] },
  });
  // Assert
  expect(res.statusCode).toBe(201);
  expect(res.json().total).toBe(1);
});
```

### 🟢 Low
_None._

### ✅ Already Covered
- `apps/server/order.controller.ts` — Exit Door 1 (response: 201 + id + total) and Exit Door 3 (repo.save called with correct payload) covered by Test 2 for the multi-item happy path.

### 🔁 Redundant Tests
- `apps/server/order.controller.test.ts::When valid order, Then returns 201` — [SUBSET] strict subset of `When valid order with items, Then returns 201 with id and total` (only asserts statusCode, which the larger test also asserts). Human review: consider removing or merging.
- `apps/server/order.controller.test.ts::When user posts an order, Then status is 201` — [SUBSET] strict subset of `When valid order with items, Then returns 201 with id and total` (only asserts statusCode on another happy-path input class; adds no new exit-door coverage and duplicates Test 1). Human review: consider removing or merging.
- `apps/server/order.controller.test.ts::When order posted, Then repo.save called once` — [LOW SIGNAL] asserts framework invariant (`toHaveBeenCalledTimes(1)`) with no exit-door assertion on response, payload, or state. Human review: consider removing or strengthening to assert repo.save arguments and HTTP response.

### ⏭️ Skipped
- `apps/server/order.controller.test.ts` — test file (not a source under analysis).
- `apps/server/order.controller.ts` Exit Door 2 (state) — dropped: handler delegates persistence to injected `repo.save`; no separate persistence logic in source to verify.
- `apps/server/order.controller.ts` Exit Door 4 (queue events) — dropped: source publishes no queue messages.

### Remediation Plan
1. Add `When userId is empty, Then returns 400 with error` to cover the error path for missing userId (Exit Door 5).
2. Add `When items is empty, Then returns 400 with error` to cover the error path for empty items array (Exit Door 5) and confirm `repo.save` is not invoked.
3. Add `When single item with qty 1, Then total equals 1` to pin down the `reduce` total computation at the minimum boundary (Exit Door 1).
4. Human review of redundant tests: consider deleting Test 1 and Test 4 (subsumed by Test 2), and either deleting or rewriting Test 3 to assert a real exit door instead of `toHaveBeenCalledTimes`.
