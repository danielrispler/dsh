## Coverage Gap Report
1 file changed, 4 gaps found (1 critical, 2 high, 0 medium, 1 low) + 0 redundant.

### 🔴 Critical
**`scripts/deploy.sh`**
- Missing: script has no test file at all (no `*.bats`, `test_*.sh`, or `*_test.sh` co-located or under `tests/`). Untested deployment script that shells out to `kubectl` is a deploy-time risk.
- Suggested:
```bash
#!/usr/bin/env bats

setup() {
  STUB_DIR="$BATS_TEST_TMPDIR/stubs"
  mkdir -p "$STUB_DIR"
  printf '#!/usr/bin/env bash\necho "$@" >> "$BATS_TEST_TMPDIR/kubectl-calls"\nexit 0\n' > "$STUB_DIR/kubectl"
  chmod +x "$STUB_DIR/kubectl"
  export PATH="$STUB_DIR:$PATH"
}

@test "When deploy.sh runs with kubectl available, Then it exits 0" {
  # Arrange — stub kubectl installed in setup()
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
}
```

### 🟠 High
**`scripts/deploy.sh`**

Gap 1 — kubectl invoked with correct arguments (Exit Door 3)
```bash
@test "When deploy.sh runs, Then kubectl is called with 'apply -f k8s/'" {
  # Arrange — stub kubectl from setup() records all args to kubectl-calls
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  grep -qx "apply -f k8s/" "$BATS_TEST_TMPDIR/kubectl-calls"
}
```

Gap 2 — error propagation when kubectl fails (Exit Door 5)
```bash
@test "When kubectl apply fails, Then deploy.sh exits non-zero" {
  # Arrange — override kubectl stub to fail
  STUB_DIR="$BATS_TEST_TMPDIR/stubs"
  printf '#!/usr/bin/env bash\nexit 1\n' > "$STUB_DIR/kubectl"
  chmod +x "$STUB_DIR/kubectl"
  # Act
  run scripts/deploy.sh
  # Assert — set -e must propagate kubectl's non-zero status
  [ "$status" -ne 0 ]
}
```

### 🟡 Medium
_None._

### 🟢 Low
**`scripts/deploy.sh`**

Gap 3 — stdout banner (Exit Door 1, low value)
```bash
@test "When deploy.sh runs, Then it prints 'Deploying...'" {
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  [[ "$output" == *"Deploying..."* ]]
}
```

### ✅ Already Covered
_None._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- Exit Door 2 (state) — dropped: no persistence logic in source (kubectl call is captured under Exit Door 3, not local state).
- Exit Door 4 (queue events) — dropped: source publishes no events.
- Blind-spot scan — no falsy/boundary/error-throw/concurrency triggers present in source (only a single linear command pipeline guarded by `set -euo pipefail`).
- `kubectl-not-found` case — dropped as speculative: source has no explicit `command -v kubectl` guard, so behavior is identical to Gap 2 (non-zero exit via `set -e`); covered there.

### Remediation Plan
1. Create `tests/deploy.bats` (or `scripts/deploy.bats`) with the `setup()` PATH-shadowing stub for `kubectl`.
2. Add the Critical happy-path test — proves the script can even be invoked end-to-end.
3. Add High Gap 1 — assert `kubectl` is called with exactly `apply -f k8s/` (locks the deploy contract).
4. Add High Gap 2 — assert non-zero exit when `kubectl` fails (verifies `set -e` actually propagates).
5. Optionally add Low Gap 3 — stdout banner check, only if log-line stability matters to downstream tooling.
