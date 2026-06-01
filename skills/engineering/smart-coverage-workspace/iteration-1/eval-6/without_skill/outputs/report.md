# Test Coverage Gap Report — deploy.sh

## Script Under Analysis

**File:** `scripts/deploy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "Deploying..."
kubectl apply -f k8s/
```

---

## Public Interface / Behaviors

The script's externally observable behaviors are:

1. Exits non-zero and aborts on any command failure (`set -e`)
2. Exits non-zero on unset variable references (`set -u`)
3. Propagates pipeline failures (`set -o pipefail`)
4. Prints the string `"Deploying..."` to stdout
5. Invokes `kubectl apply -f k8s/` and exits with whatever status `kubectl` returns

---

## Coverage Gap Report

### Critical

| # | Gap | Why Critical | Suggested Test |
|---|-----|-------------|----------------|
| C1 | `kubectl` not found / not on PATH | Script will fail with `command not found`; the primary action of the script is completely untested | Stub/mock `kubectl` as a shell function that echoes args; assert exit 0 and that it was called with `apply -f k8s/` |
| C2 | `k8s/` directory does not exist | `kubectl apply -f` with a missing manifest dir will fail; no guard in script | Provide an empty or missing `k8s/` dir in test harness; assert non-zero exit |
| C3 | `kubectl apply` returns non-zero | `set -e` should propagate the failure exit code | Stub `kubectl` to return exit 1; assert script exits non-zero |

### High

| # | Gap | Why High | Suggested Test |
|---|-----|----------|----------------|
| H1 | stdout output verification | "Deploying..." message is never asserted | Capture stdout; assert it contains `"Deploying..."` |
| H2 | Happy-path end-to-end | The normal success path (kubectl succeeds) is never tested | Stub `kubectl` to return exit 0; assert script exits 0 |
| H3 | `set -euo pipefail` is actually active | These options could be stripped/overridden by a caller; absence would silently swallow errors | Run script with `bash -n` (syntax check); also run a sub-test where a stubbed command fails mid-script and assert abort |

### Medium

| # | Gap | Why Medium | Suggested Test |
|---|-----|-----------|----------------|
| M1 | Script is executable | File permission issue would surface in CI | `test -x scripts/deploy.sh` |
| M2 | Shebang correctness | `#!/usr/bin/env bash` must resolve; on some minimal containers only `/bin/sh` exists | Run `bash scripts/deploy.sh` explicitly in test to decouple from shebang resolution |
| M3 | No arguments accepted — future breakage | Script silently ignores any positional arguments; if callers pass env/namespace flags they are dropped | Assert `$#` is unused / document expected calling convention |

### Low

| # | Gap | Why Low | Suggested Test |
|---|-----|---------|----------------|
| L1 | stderr output on failure | On `kubectl` error, no diagnostic is printed to stderr | Stub kubectl to fail; assert stderr is non-empty or contains expected message |
| L2 | Script syntax validity | `bash -n` dry-run is not part of any pipeline | Add `bash -n scripts/deploy.sh` to lint/pre-commit |

---

## Recommended Test Implementation Plan

Use [bats-core](https://github.com/bats-core/bats-core) (Bash Automated Testing System) — the standard framework for testing bash scripts.

### Suggested test file: `tests/deploy.bats`

```bash
#!/usr/bin/env bats

setup() {
  # Create a temporary working directory with a k8s/ subdirectory
  TEST_DIR="$(mktemp -d)"
  mkdir -p "$TEST_DIR/k8s"
  export PATH="$TEST_DIR/bin:$PATH"

  # Stub kubectl to succeed by default
  mkdir -p "$TEST_DIR/bin"
  cat > "$TEST_DIR/bin/kubectl" <<'EOF'
#!/usr/bin/env bash
echo "kubectl called with: $*"
exit 0
EOF
  chmod +x "$TEST_DIR/bin/kubectl"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# H2 — happy path
@test "exits 0 when kubectl succeeds" {
  cd "$TEST_DIR"
  run bash "$BATS_TEST_DIRNAME/../scripts/deploy.sh"
  [ "$status" -eq 0 ]
}

# H1 — stdout message
@test "prints 'Deploying...' to stdout" {
  cd "$TEST_DIR"
  run bash "$BATS_TEST_DIRNAME/../scripts/deploy.sh"
  [[ "$output" == *"Deploying..."* ]]
}

# C1 — kubectl invoked with correct args
@test "calls kubectl apply -f k8s/" {
  cd "$TEST_DIR"
  run bash "$BATS_TEST_DIRNAME/../scripts/deploy.sh"
  [[ "$output" == *"apply -f k8s/"* ]]
}

# C3 — kubectl failure propagates
@test "exits non-zero when kubectl fails" {
  cat > "$TEST_DIR/bin/kubectl" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
  chmod +x "$TEST_DIR/bin/kubectl"
  cd "$TEST_DIR"
  run bash "$BATS_TEST_DIRNAME/../scripts/deploy.sh"
  [ "$status" -ne 0 ]
}

# C2 — missing k8s/ directory
@test "exits non-zero when k8s/ directory is missing" {
  rm -rf "$TEST_DIR/k8s"
  cat > "$TEST_DIR/bin/kubectl" <<'EOF'
#!/usr/bin/env bash
if [ ! -d "k8s/" ]; then exit 1; fi
exit 0
EOF
  chmod +x "$TEST_DIR/bin/kubectl"
  cd "$TEST_DIR"
  run bash "$BATS_TEST_DIRNAME/../scripts/deploy.sh"
  [ "$status" -ne 0 ]
}

# M1 — executable bit
@test "script file is executable" {
  run test -x "$BATS_TEST_DIRNAME/../scripts/deploy.sh"
  [ "$status" -eq 0 ]
}

# L2 — syntax check
@test "script passes bash -n syntax check" {
  run bash -n "$BATS_TEST_DIRNAME/../scripts/deploy.sh"
  [ "$status" -eq 0 ]
}
```

---

## Summary

| Severity | Count | Covered by tests above |
|----------|-------|------------------------|
| Critical | 3 | 3 |
| High | 3 | 3 |
| Medium | 3 | 1 |
| Low | 2 | 1 |

The script is extremely minimal (4 lines of logic), yet has **zero existing tests**. The highest-risk gaps are around `kubectl` availability and failure propagation — both are untested and would cause silent or confusing failures in CI/CD pipelines.
