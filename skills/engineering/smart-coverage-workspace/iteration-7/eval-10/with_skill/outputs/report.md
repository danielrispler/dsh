## Coverage Gap Report
1 file changed, 6 gaps found (0 critical, 4 high, 2 medium, 0 low)

### 🐛 Likely Bug Surfaced
**`src/discount.ts:2`** — `if (!price)` swallows `NaN` (returns `0` silently) and fails to reject negative prices (`!(-10) === false`, so `applyDiscount(-10, 50)` returns `-5`). The guard conflates "zero" with "invalid". Fix: replace with explicit validation, e.g. `if (!Number.isFinite(price) || price < 0) throw new Error('price must be a non-negative finite number');` and handle `price === 0` separately if a 0-return is desired.

**`src/discount.ts:5`** — `percent` boundary guard does not reject `NaN` (`NaN < 0` and `NaN > 100` are both `false`), so `applyDiscount(100, NaN)` falls through and returns `NaN`. Fix: add `if (!Number.isFinite(percent)) throw new Error(...)` before the range check.

### 🟠 High
**`src/discount.ts`**

Gap 1 — Negative price silently accepted (Exit Door 1 / 5)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount — negative price', () => {
  it('When price is negative, Then throws (or rejects invalid input)', () => {
    // Arrange
    const price = -10;
    const percent = 50;
    // Act + Assert
    expect(() => applyDiscount(price, percent)).toThrow();
  });
});
```

Gap 2 — NaN price swallowed by falsy guard (Exit Door 5)
```typescript
describe('applyDiscount — NaN price', () => {
  it('When price is NaN, Then throws instead of returning 0', () => {
    expect(() => applyDiscount(NaN, 50)).toThrow();
  });
});
```

Gap 3 — Out-of-range percent throws (Exit Door 5)
```typescript
describe('applyDiscount — percent out of range', () => {
  it('When percent is -1, Then throws "percent must be between 0 and 100"', () => {
    expect(() => applyDiscount(100, -1)).toThrow(/between 0 and 100/);
  });

  it('When percent is 101, Then throws "percent must be between 0 and 100"', () => {
    expect(() => applyDiscount(100, 101)).toThrow(/between 0 and 100/);
  });
});
```

Gap 4 — Boundary values 0 and 100 (Exit Door 1)
```typescript
describe('applyDiscount — percent boundaries', () => {
  it('When percent is 0, Then returns price unchanged', () => {
    expect(applyDiscount(100, 0)).toBe(100);
  });

  it('When percent is 100, Then returns 0', () => {
    expect(applyDiscount(100, 100)).toBe(0);
  });
});
```

### 🟡 Medium
**`src/discount.ts`**

Gap 5 — Price 0 short-circuit returns 0 (Exit Door 1)
```typescript
describe('applyDiscount — zero price', () => {
  it('When price is 0, Then returns 0 regardless of percent', () => {
    expect(applyDiscount(0, 50)).toBe(0);
  });
});
```

Gap 6 — NaN percent falls through range guard (Exit Door 5)
```typescript
describe('applyDiscount — NaN percent', () => {
  it('When percent is NaN, Then throws instead of returning NaN', () => {
    expect(() => applyDiscount(100, NaN)).toThrow();
  });
});
```

### ✅ Already Covered
- `src/discount.ts` — Exit Door 1 happy path (percent=50, price=100 → 50)

### Remediation Plan
1. Fix `if (!price)` guard at `src/discount.ts:2` — reject `NaN`/negative explicitly; keep `price === 0` short-circuit only if intentional.
2. Add `Number.isFinite(percent)` check at `src/discount.ts:5` to reject `NaN` percent.
3. Add tests Gap 1–4 (High) covering negative price, NaN price, out-of-range percent (-1, 101), and percent boundaries (0, 100).
4. Add tests Gap 5–6 (Medium) for zero price short-circuit and NaN percent.
