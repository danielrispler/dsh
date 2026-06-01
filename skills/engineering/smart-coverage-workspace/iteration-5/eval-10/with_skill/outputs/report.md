## Coverage Gap Report
1 file changed, 5 gaps found (0 critical, 5 high, 0 medium, 0 low) + 0 redundant.

### 🔴 Critical
_None._

### 🟠 High

**`src/discount.ts`**

Gap 1 — Falsy price short-circuits to 0 (Exit Door 1)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('When price is 0, Then returns 0 without applying percent', () => {
    // Arrange
    const price = 0;
    const percent = 50;
    // Act
    const result = applyDiscount(price, percent);
    // Assert
    expect(result).toBe(0);
  });

  it('When price is falsy (NaN), Then returns 0', () => {
    // Arrange / Act
    const result = applyDiscount(NaN, 50);
    // Assert
    expect(result).toBe(0);
  });
});
```

Gap 2 — Negative percent throws (Exit Door 5 — error path, boundary below lower bound)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('When percent is below 0, Then throws range error', () => {
    // Arrange
    const price = 100;
    const percent = -1;
    // Act / Assert
    expect(() => applyDiscount(price, percent)).toThrow('percent must be between 0 and 100');
  });
});
```

Gap 3 — Percent above 100 throws (Exit Door 5 — error path, boundary above upper bound)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('When percent is above 100, Then throws range error', () => {
    // Arrange
    const price = 100;
    const percent = 101;
    // Act / Assert
    expect(() => applyDiscount(price, percent)).toThrow('percent must be between 0 and 100');
  });
});
```

Gap 4 — Percent exactly 0 returns price unchanged (Exit Door 1 — explicit branch, boundary at lower bound)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('When percent is 0, Then returns the original price unchanged', () => {
    // Arrange
    const price = 100;
    const percent = 0;
    // Act
    const result = applyDiscount(price, percent);
    // Assert
    expect(result).toBe(100);
  });
});
```

Gap 5 — Percent exactly 100 is accepted (Exit Door 1 — boundary at upper inclusive bound)
```typescript
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('When percent is 100, Then returns 0 without throwing', () => {
    // Arrange
    const price = 100;
    const percent = 100;
    // Act
    const result = applyDiscount(price, percent);
    // Assert
    expect(result).toBe(0);
  });
});
```

### 🟡 Medium
_None._

### 🟢 Low
_None._

### ✅ Already Covered
- `src/discount.ts` — Exit Door 1 happy path (mid-range percent) covered by `When percent is 50 on price 100, Then returns 50`.

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `src/discount.test.ts` — test file itself (not a coverage target).

### Remediation Plan
1. Add test for falsy `price` (e.g. `price=0`) — asserts early-return `0` branch (`src/discount.ts` line 2).
2. Add test for `percent < 0` — asserts `throw` on negative percent (line 5).
3. Add test for `percent > 100` — asserts `throw` on out-of-range upper (line 5).
4. Add test for `percent === 0` — asserts price returned unchanged (line 8).
5. Add test for `percent === 100` — asserts upper inclusive boundary returns `0` without throwing (line 5 boundary).
