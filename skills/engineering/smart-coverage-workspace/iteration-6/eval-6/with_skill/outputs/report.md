## Coverage Gap Report
1 file changed, 4 gaps found (1 critical, 2 high, 1 medium, 0 low) + 0 redundant

### 🐛 Likely Bug Surfaced
_None._

### 🔴 Critical
**`scripts/deploy.sh`**
- Missing: no test file exists for this script at all (Exit Doors 3 + 5 unobserved)
- Suggested:
```bash
#!/usr/bin/env bats

setup() {
  STUB_DIR="$BATS_TEST_TMPDIR/stubs"
  mkdir -p "$STUB_DIR"
  # PATH-shadow kubectl: record args, succeed by default
  cat > "$STUB_DIR/kubectl" <<'EOF'
#!/usr/bin/env bash
echo "$@" >> "$BATS_TEST_TMPDIR/kubectl-calls"
exit 0
EOF
  chmod +x "$STUB_DIR/kubectl"
  export PATH="$STUB_DIR:$PATH"
}

@test "When deploy.sh runs with kubectl available, Then it exits 0" {
  # Arrange — stub kubectl in setup
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  [ -f "$BATS_TEST_TMPDIR/kubectl-calls" ]
}
```

### 🟠 High
**`scripts/deploy.sh`**

Gap 1 — kubectl invoked with correct args (Exit Door 3)
```bash
@test "When deploy.sh runs, Then kubectl is called with 'apply -f k8s/'" {
  # Arrange — stub from setup() records every invocation
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  run cat "$BATS_TEST_TMPDIR/kubectl-calls"
  [ "$output" = "apply -f k8s/" ]
}
```

Gap 2 — error propagation when kubectl fails (Exit Door 5)
```bash
@test "When kubectl exits non-zero, Then deploy.sh propagates failure" {
  # Arrange — override kubectl to fail
  cat > "$STUB_DIR/kubectl" <<'EOF'
#!/usr/bin/env bash
echo "apply failed: connection refused" >&2
exit 1
EOF
  chmod +x "$STUB_DIR/kubectl"
  # Act
  run scripts/deploy.sh
  # Assert — set -e must surface the failure
  [ "$status" -ne 0 ]
  [[ "$output" == *"connection refused"* ]]
}
```

### 🟡 Medium
**`scripts/deploy.sh`**

Gap 3 — kubectl missing on PATH (Exit Door 5, command-not-found)
```bash
@test "When kubectl is not on PATH, Then deploy.sh fails fast" {
  # Arrange — empty stub dir so kubectl resolves to nothing
  rm -f "$STUB_DIR/kubectl"
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -ne 0 ]
}
```

### 🟢 Low
_None._

### ✅ Already Covered
_None._

### 🔁 Redundant Tests
_None._

### ⏭️ Skipped
- `scripts/deploy.sh` Exit Door 2 (state) — script does not persist anything observable from a test; kubectl call itself is Exit Door 3.
- `scripts/deploy.sh` Exit Door 4 (queue) — script does not publish messages.

### Remediation Plan
1. Create `tests/deploy.bats` with the `setup()` PATH-shadow stub block above.
2. Add the Critical smoke test (`exits 0 when kubectl available`) — unblocks all further assertions.
3. Add Gap 1: assert exact kubectl args (`apply -f k8s/`) via the recorded `kubectl-calls` file.
4. Add Gap 2: override the kubectl stub to exit 1 and assert `set -e` propagation.
5. Add Gap 3: remove the stub to cover the kubectl-missing path.
6. Wire `bats tests/` into CI so the script is exercised on every change.
