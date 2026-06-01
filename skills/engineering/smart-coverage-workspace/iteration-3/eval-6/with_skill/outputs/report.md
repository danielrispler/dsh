## Coverage Gap Report
1 file changed, 3 gaps found (1 critical, 2 high, 0 medium, 0 low)

**Phase 0 detection script output:**
```json
{"files":{"scripts/deploy.sh":"bash"},"frameworks":[],"playwright":false}
```
`lang=bash` detected via `.sh` extension. Loaded `bash.md`. No framework overlays.

---

### Phase 2: File Classification

| File | Type | Applicable Exit Doors |
|------|------|-----------------------|
| `scripts/deploy.sh` | Script / executable | 3 (external CLI calls), 5 (error propagation / exit code) |

### Phase 3: Existing Coverage

No `*.bats`, `test_*.sh`, `*_test.sh` found. Zero coverage.

---

### 🔴 Critical

**`scripts/deploy.sh`**
- Missing: No test file — script never exercised

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

@test "When deploy runs, Then exits with status 0" {
  # Arrange — stub kubectl in place via setup()
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
}
```

---

### 🟠 High

**`scripts/deploy.sh`**

Gap 1 — kubectl called with correct arguments (Exit Door 3)
```bash
@test "When deploy runs, Then kubectl apply is called with k8s/" {
  # Arrange — stub records args to /tmp/kubectl-calls
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  grep -q "apply -f k8s/" /tmp/kubectl-calls
}
```

Gap 2 — error propagation when kubectl fails (Exit Door 5)
```bash
@test "When kubectl exits non-zero, Then deploy exits non-zero" {
  # Arrange — override stub to fail
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

### ✅ Already Covered
None.

### ⏭️ Skipped
None. `scripts/deploy.sh` contains real logic — all applicable exit doors evaluated.

---

### Remediation Plan

1. Create `scripts/deploy.bats` — Critical: establish baseline with exit-status-0 test.
2. Add Gap 1 (Exit Door 3): verify `kubectl apply -f k8s/` via stub call log.
3. Add Gap 2 (Exit Door 5): failing stub → assert non-zero exit propagation.
