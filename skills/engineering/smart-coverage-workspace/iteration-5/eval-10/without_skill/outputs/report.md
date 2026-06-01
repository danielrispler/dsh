# Missing Coverage for `applyDiscount`

The existing test only covers one branch (`percent=50, price=100 -> 50`). Looking at `src/discount.ts`, there are several uncovered branches and edge cases.

## Source under test

```ts
export function applyDiscount(price: number, percent: number): number {
  if (!price) {
    return 0;
  }
  if (percent < 0 || percent > 100) {
    throw new Error('percent must be between 0 and 100');
  }
  if (percent === 0) {
    return price;
  }
  return price * (1 - percent / 100);
}
```

## Uncovered branches / behaviors

1. **`!price` branch (line 2-4)** — never exercised. Several inputs hit it, and the truthiness check has a subtle bug worth pinning down:
   - `applyDiscount(0, 50)` -> `0` (price === 0)
   - `applyDiscount(NaN, 50)` -> `0` (NaN is falsy)
   - Note: this branch is also hit by `undefined`/`null` if called untyped. Worth a test to lock current behavior.

2. **Negative percent throws (line 5-7, first half of OR)** — uncovered.
   - `expect(() => applyDiscount(100, -1)).toThrow('percent must be between 0 and 100')`

3. **Percent > 100 throws (line 5-7, second half of OR)** — uncovered.
   - `expect(() => applyDiscount(100, 101)).toThrow('percent must be between 0 and 100')`

4. **`percent === 0` short-circuit branch (line 8-10)** — uncovered.
   - `applyDiscount(100, 0)` -> `100`
   - This is distinct from the general formula path because of the explicit early return.

5. **Boundary `percent === 100`** — falls through to the formula and should return `0`. Uncovered.
   - `applyDiscount(100, 100)` -> `0`

6. **Non-50% discounts on the formula path** — only the 50% case is tested. Add at least one other to catch off-by-one math errors (e.g., division/subtraction swapped).
   - `applyDiscount(200, 25)` -> `150`
   - `applyDiscount(100, 10)` -> `90`

## Likely real bug surfaced by coverage

The `if (!price)` guard is suspicious:
- `applyDiscount(-100, 50)` returns `-50` (negative prices are silently accepted), while `applyDiscount(0, 50)` returns `0` — inconsistent input validation.
- `applyDiscount(NaN, 50)` returns `0` instead of `NaN`, which may mask upstream bugs.

Worth either tightening the guard (`if (price <= 0 || !Number.isFinite(price))`) or adding tests that pin the current behavior as intentional.

## Suggested additional tests

```ts
it('When price is 0, Then returns 0', () => {
  expect(applyDiscount(0, 50)).toBe(0);
});

it('When percent is 0, Then returns original price', () => {
  expect(applyDiscount(100, 0)).toBe(100);
});

it('When percent is 100, Then returns 0', () => {
  expect(applyDiscount(100, 100)).toBe(0);
});

it('When percent is negative, Then throws', () => {
  expect(() => applyDiscount(100, -1)).toThrow('percent must be between 0 and 100');
});

it('When percent is over 100, Then throws', () => {
  expect(() => applyDiscount(100, 101)).toThrow('percent must be between 0 and 100');
});

it('When percent is 25 on price 200, Then returns 150', () => {
  expect(applyDiscount(200, 25)).toBe(150);
});
```

## Files referenced
- `src/discount.ts`
- `src/discount.test.ts`
