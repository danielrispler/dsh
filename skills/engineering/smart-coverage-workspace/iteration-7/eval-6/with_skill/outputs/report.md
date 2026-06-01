## Coverage Gap Report
1 file changed, 3 gaps found (0 critical, 2 high, 0 medium, 1 low)

`scripts/deploy.sh` — Script / executable. Exits: 3 (external CLI), 5 (error propagation). No tests exist.

### 🟠 High
**`scripts/deploy.sh`**

Gap 1 — kubectl invoked with correct args (Exit Door 3)
```bash
#!/usr/bin/env bats

setup() {
  STUB_DIR="$BATS_TEST_TMPDIR/stubs"
  mkdir -p "$STUB_DIR"
  printf '#!/usr/bin/env bash\necho "$@" >> "$BATS_TEST_TMPDIR/kubectl-calls"\nexit 0\n' > "$STUB_DIR/kubectl"
  chmod +x "$STUB_DIR/kubectl"
  export PATH="$STUB_DIR:$PATH"
}

@test "When deploy runs, Then kubectl apply is called with k8s/ manifest dir" {
  # Arrange — stub installed in setup()
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
  grep -qx "apply -f k8s/" "$BATS_TEST_TMPDIR/kubectl-calls"
}
```

Gap 2 — kubectl failure propagates non-zero exit (Exit Door 5)
```bash
@test "When kubectl apply fails, Then deploy.sh exits non-zero" {
  # Arrange — override stub to fail
  STUB_DIR="$BATS_TEST_TMPDIR/stubs"
  mkdir -p "$STUB_DIR"
  printf '#!/usr/bin/env bash\nexit 2\n' > "$STUB_DIR/kubectl"
  chmod +x "$STUB_DIR/kubectl"
  export PATH="$STUB_DIR:$PATH"
  # Act
  run scripts/deploy.sh
  # Assert — set -e must propagate
  [ "$status" -ne 0 ]
}
```

### 🟢 Low
**`scripts/deploy.sh`**

Gap 3 — startup banner emitted on stdout (Exit Door 1)
```bash
@test "When deploy runs, Then it announces 'Deploying...' on stdout" {
  run scripts/deploy.sh
  [ "$status" -eq 0 ]
  [[ "$output" == *"Deploying..."* ]]
}
```

### Remediation Plan
1. Create `tests/deploy.bats` with the `setup()` helper that PATH-shadows `kubectl` into `$BATS_TEST_TMPDIR/stubs`.
2. Add Gap 1 (High, ED 3) — assert `kubectl apply -f k8s/` is the exact invocation.
3. Add Gap 2 (High, ED 5) — override the stub to `exit 2` and assert the script's exit status is non-zero (proves `set -e` wiring).
4. Add Gap 3 (Low, ED 1) — assert the "Deploying..." banner on stdout.
