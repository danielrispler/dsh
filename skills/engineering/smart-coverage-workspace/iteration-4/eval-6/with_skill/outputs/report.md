## Coverage Gap Report

1 file changed, 4 gaps found (1 critical, 2 high, 1 medium, 1 low)

---

### 🔴 Critical

**`scripts/deploy.sh`**

- Missing: No test file exists — script is never exercised by any test at all
- Suggested:

```bash
#!/usr/bin/env bats

setup() {
  STUB_DIR=$(mktemp -d)
  cat > "$STUB_DIR/kubectl" << 'EOF'
#!/usr/bin/env bash
echo "$@" >> $BATS_TEST_TMPDIR/kubectl-calls
EOF
  chmod +x "$STUB_DIR/kubectl"
  export PATH="$STUB_DIR:$PATH"
  rm -f $BATS_TEST_TMPDIR/kubectl-calls
}

teardown() {
  rm -rf "$STUB_DIR"
  rm -f $BATS_TEST_TMPDIR/kubectl-calls
}

@test "When deploy runs with defaults, Then it exits successfully" {
  # Arrange — no extra setup; defaults apply
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
@test "When deploy runs, Then kubectl apply is called with k8s/deployment.yaml" {
  # Arrange
  # (setup() stubs kubectl and clears the call log)
  # Act
  run scripts/deploy.sh staging v1.2.3
  # Assert
  [ "$status" -eq 0 ]
  grep -q "apply -f k8s/deployment.yaml" "$BATS_TEST_TMPDIR/kubectl-calls"
}

@test "When deploy runs, Then kubectl set image uses the provided tag and namespace" {
  # Arrange
  # Act
  run scripts/deploy.sh staging v1.2.3
  # Assert
  [ "$status" -eq 0 ]
  grep -q "set image deployment/app app=myrepo/app:v1.2.3 -n staging" "$BATS_TEST_TMPDIR/kubectl-calls"
}

@test "When deploy runs, Then kubectl rollout status is called for the correct namespace" {
  # Arrange
  # Act
  run scripts/deploy.sh staging v1.2.3
  # Assert
  [ "$status" -eq 0 ]
  grep -q "rollout status deployment/app -n staging" "$BATS_TEST_TMPDIR/kubectl-calls"
}
```

Gap 2 — error propagation when kubectl fails (Exit Door 5)

```bash
@test "When kubectl apply fails, Then deploy exits non-zero" {
  # Arrange — override stub to fail on apply
  cat > "$STUB_DIR/kubectl" << 'EOF'
#!/usr/bin/env bash
echo "$@" >> $BATS_TEST_TMPDIR/kubectl-calls
if echo "$@" | grep -q "apply"; then
  exit 1
fi
EOF
  chmod +x "$STUB_DIR/kubectl"
  # Act
  run scripts/deploy.sh default latest
  # Assert
  [ "$status" -ne 0 ]
}

@test "When kubectl rollout status fails, Then deploy exits non-zero" {
  # Arrange — override stub to fail on rollout
  cat > "$STUB_DIR/kubectl" << 'EOF'
#!/usr/bin/env bash
echo "$@" >> $BATS_TEST_TMPDIR/kubectl-calls
if echo "$@" | grep -q "rollout"; then
  exit 1
fi
EOF
  chmod +x "$STUB_DIR/kubectl"
  # Act
  run scripts/deploy.sh default latest
  # Assert
  [ "$status" -ne 0 ]
}
```

---

### 🟡 Medium

**`scripts/deploy.sh`**

Gap 1 — default argument values applied when no args supplied (Exit Door 3)

```bash
@test "When no arguments provided, Then namespace defaults to 'default' and tag to 'latest'" {
  # Arrange — no args passed
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  grep -q "set image deployment/app app=myrepo/app:latest -n default" "$BATS_TEST_TMPDIR/kubectl-calls"
}
```

---

### 🟢 Low

**`scripts/deploy.sh`**

Gap 1 — stdout output verification (Exit Door 1)

```bash
@test "When deploy runs, Then completion message is printed to stdout" {
  # Arrange
  # Act
  run scripts/deploy.sh default latest
  # Assert
  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Deployment complete"
}
```

---

### ✅ Already Covered

- `scripts/deploy.sh` — no exit doors covered (no test file exists)

---

### ⏭️ Skipped

- Exit Door 2 (state) — dropped; script contains no persistence logic (no DB call, cache write, or file write)
- Exit Door 4 (message queue events) — dropped; script does not publish to any queue

---

### Remediation Plan

1. **[Critical]** Create `scripts/deploy.bats` — add a baseline test that runs the script with the kubectl PATH-stub and asserts `$status -eq 0`; this unblocks all further tests.
2. **[High — Exit Door 3]** Add three argument-verification tests confirming that `kubectl apply`, `kubectl set image` (with correct tag and namespace), and `kubectl rollout status` receive the expected arguments, using `$BATS_TEST_TMPDIR/kubectl-calls` as the call log.
3. **[High — Exit Door 5]** Add two error-path tests: one where the stub fails on `apply` and one where it fails on `rollout status`; both must assert `$status -ne 0` to verify `set -euo pipefail` propagates failures correctly.
4. **[Medium]** Add one test that invokes the script with no arguments and verifies the default values (`default` namespace, `latest` tag) are forwarded to `kubectl set image`.
5. **[Low]** Add one stdout test asserting that "Deployment complete" appears in `$output` on a successful run.
