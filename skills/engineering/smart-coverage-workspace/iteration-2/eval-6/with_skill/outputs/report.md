## Coverage Gap Report
1 file changed, 3 gaps found (1 critical, 2 high, 0 medium, 0 low)

**Phase 0 detection script output:**
```json
{"files":{"scripts/deploy.sh":"bash"},"frameworks":[],"playwright":false}
```
References loaded: `bash.md` + `testing-principles.md`. Language detected via `.sh` extension (no config file present).

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `scripts/deploy.sh` | Script / executable | 3 (External CLI calls), 5 (error propagation / exit code) |

### Phase 3: Existing Coverage

No `.bats`, `test_*.sh`, or `*_test.sh` files found anywhere in the repo. Zero coverage.

### Phase 4: Stub Detection

Script content: `kubectl apply -f k8s/` — real logic, not a stub.

---

### 🔴 Critical

**`scripts/deploy.sh`**
- Missing: No test file exists — script is completely untested

```bash
#!/usr/bin/env bats

setup() {
  STUB_DIR=$(mktemp -d)
  cat > "$STUB_DIR/kubectl" << 'EOF'
#!/usr/bin/env bash
echo "$@" >> /tmp/kubectl-calls
EOF
  chmod +x "$STUB_DIR/kubectl"
  export PATH="$STUB_DIR:$PATH"
  rm -f /tmp/kubectl-calls
}

teardown() {
  rm -rf "$STUB_DIR"
  rm -f /tmp/kubectl-calls
}

@test "When deploy runs, Then it exits 0" {
  # Arrange — kubectl stub is on PATH via setup()
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
}
```

---

### 🟠 High

**`scripts/deploy.sh`**

Gap 1 — kubectl arguments not verified (Exit Door 3)
```bash
@test "When deploy runs, Then kubectl apply is called with k8s/" {
  # Arrange — kubectl stub records its args to /tmp/kubectl-calls
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  grep -q "apply -f k8s/" /tmp/kubectl-calls
}
```

Gap 2 — kubectl failure not propagated (Exit Door 5)
```bash
@test "When kubectl exits non-zero, Then deploy exits non-zero" {
  # Arrange — override kubectl stub to fail
  cat > "$STUB_DIR/kubectl" << 'EOF'
#!/usr/bin/env bash
exit 1
EOF
  chmod +x "$STUB_DIR/kubectl"
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -ne 0 ]
}
```

---

### 🟡 Medium
_(none)_

### 🟢 Low
_(none)_

### ✅ Already Covered
_(none)_

### ⏭️ Skipped
_(none)_

---

### Remediation Plan

1. Create `tests/deploy.bats` with the bats-core scaffold above (Critical — establishes the test file).
2. Add kubectl argument-verification test to `tests/deploy.bats` (High — Exit Door 3).
3. Add kubectl failure-propagation test to `tests/deploy.bats` (High — Exit Door 5).
