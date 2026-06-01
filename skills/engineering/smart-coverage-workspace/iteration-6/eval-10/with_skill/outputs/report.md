## Coverage Gap Report
1 file changed, 6 gaps found (0 critical, 6 high, 0 medium, 0 low) + 0 redundant

### 🐛 Likely Bug Surfaced
**`src/discount.ts:2`** — `if (!price)` silently swallows `NaN` (returns `0` instead of propagating/throwing) and also returns `0` for `undefined`/`null`, while a negative `price` slips past the guard entirely (`applyDiscount(-100, 50) === -50`). Inconsistent with the `percent` guard that throws on out-of-range. Fix: replace with explicit validation, e.g. `if (!Number.isFinite(price) || price < 0) throw new Error('price must be a non-negative finite number');` (keep an explicit `if (price === 0) return 0;` if zero should short-circuit).

### 🔴 Critical
_None._

### 🟠 High
**`src/discount.ts`**

Gap 1 — Falsy `price` guard swallows `NaN` / `undefined` / `null` (Exit Door 1, also ED 5 — see Bug)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount — invalid price', () => {
  it('When price is NaN, Then it should not silently return 0', () => {
    // Arrange / Act / Assert
    // Current behavior returns 0; after fix this should throw.
    expect(() => applyDiscount(NaN, 50)).toThrow(/price/);
  });

  it('When price is undefined, Then it should reject the input', () => {
    expect(() => applyDiscount(undefined as unknown as number, 50)).toThrow(/price/);
  });
});
```

Gap 2 — Negative `price` produces negative result (Exit Door 1 / ED 5 — see Bug)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount — negative price', () => {
  it('When price is negative, Then it rejects rather than returning a negative discount', () => {
    // Arrange
    const price = -100;
    // Act + Assert — currently returns -50, which is the bug surfaced above
    expect(() => applyDiscount(price, 50)).toThrow(/price/);
  });
});
```

Gap 3 — `percent < 0` boundary (Exit Door 5)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount — percent below range', () => {
  it('When percent is -1, Then it throws a range error', () => {
    expect(() => applyDiscount(100, -1)).toThrow('percent must be between 0 and 100');
  });
});
```

Gap 4 — `percent > 100` boundary (Exit Door 5)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount — percent above range', () => {
  it('When percent is 101, Then it throws a range error', () => {
    expect(() => applyDiscount(100, 101)).toThrow('percent must be between 0 and 100');
  });
});
```

Gap 5 — `percent === 0` short-circuit branch (Exit Door 1)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount — zero percent', () => {
  it('When percent is 0, Then it returns the original price unchanged', () => {
    expect(applyDiscount(100, 0)).toBe(100);
  });
});
```

Gap 6 — `percent === 100` upper boundary (Exit Door 1)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount — full discount', () => {
  it('When percent is 100, Then the discounted price is 0', () => {
    expect(applyDiscount(100, 100)).toBe(0);
  });
});
```

### 🟡 Medium
_None._

### 🟢 Low
_None._

### ✅ Already Covered
- `src/discount.ts` — Exit Door 1 covered for the mid-range happy path (`applyDiscount(100, 50) === 50`).

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
_None._

### Remediation Plan
1. Fix `src/discount.ts:2` — replace `if (!price) return 0;` with explicit `Number.isFinite` + non-negative validation that mirrors the `percent` guard (throws on bad input). Keep an explicit `price === 0` short-circuit if that semantic is desired.
2. Add Gap 1 test for invalid `price` (`NaN`, `undefined`) — locks in the new throw behavior.
3. Add Gap 2 test for negative `price` — same fix, prevents regression to negative discounts.
4. Add Gap 3 test for `percent === -1` (lower-bound rejection).
5. Add Gap 4 test for `percent === 101` (upper-bound rejection).
6. Add Gap 5 test for `percent === 0` (short-circuit branch returns original price).
7. Add Gap 6 test for `percent === 100` (full discount → 0).
