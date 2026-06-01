# Coverage Gap Report

1 file changed, 4 gaps found (1 critical, 2 high, 1 medium, 0 low)

**Phase 0 detection script output:**
```json
{"files":{"scripts/deploy.sh":"fallback"},"frameworks":[],"playwright":false}
```
References loaded: `testing-principles.md` only (lang=fallback). Generic AAA pseudo-code. No language-specific syntax.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `scripts/deploy.sh` | Adapter / infrastructure | 3 (External Calls), 5 (Observability) |

### 🔴 Critical

**`scripts/deploy.sh`**
- Missing: No test file exists for this script at all
- Suggested:

```
test("When deploy.sh is invoked, Then kubectl apply is called with k8s/", () => {
  // Arrange: place a kubectl stub on PATH that records its arguments
  // Act: run scripts/deploy.sh
  // Assert: recorded args equal ["apply", "-f", "k8s/"]
})
```

### 🟠 High

Gap 1 — Error path (Exit Door 5)
```
test("When kubectl apply fails, Then deploy.sh exits non-zero", () => {
  // Arrange: kubectl stub exits with code 1
  // Act: run scripts/deploy.sh; capture exit code
  // Assert: exit code != 0
})
```

Gap 2 — External call assertion (Exit Door 3)
```
test("When deploy.sh runs, Then kubectl receives exactly apply -f k8s/", () => {
  // Arrange: kubectl stub captures full argv
  // Act: run scripts/deploy.sh
  // Assert: argv equals ["apply", "-f", "k8s/"] with no additional args
})
```

### 🟡 Medium

Gap 1 — Missing k8s/ directory (Exit Door 5)
```
test("When k8s/ directory is absent, Then deploy.sh exits non-zero", () => {
  // Arrange: ensure k8s/ does not exist in test working directory
  // Act: run scripts/deploy.sh; capture exit code
  // Assert: exit code != 0
})
```

### ✅ Already Covered
_(none)_

### ⏭️ Skipped
_(none)_

### Remediation Plan
1. Create a test harness using bats-core or shunit2 with a `kubectl` stub injected via PATH.
2. Add happy-path test: `kubectl apply` called with `k8s/` (Critical).
3. Add error-path test: `kubectl` exits 1 → script exits non-zero (High).
4. Add external-call assertion: verify exact kubectl args (High).
5. Add missing-directory test (Medium).
