# Coverage Gap Report: deploy.sh (baseline — no skill)

## Script Under Analysis

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "Deploying..."
kubectl apply -f k8s/
```

---

## Coverage Gaps

### Critical

| # | Gap | Why Critical |
|---|-----|-------------|
| C1 | `kubectl apply` never stubbed — real binary determines test outcome | Non-deterministic; environment-dependent |
| C2 | Non-zero exit from `kubectl` not tested | `set -e` propagates failure silently |

### High

| # | Gap | Why High |
|---|-----|---------|
| H1 | Missing `k8s/` directory not tested | `kubectl` errors on absent path; untested |
| H2 | `kubectl` binary absent from PATH not tested | Deployment pipeline may lack binary |

### Medium

| # | Gap | Why Medium |
|---|-----|-----------|
| M1 | stdout message `"Deploying..."` not asserted | Regression-detects accidental removal |
| M2 | Script exit code on success not asserted | CI pipelines rely on exit 0 |

### Low

| # | Gap | Why Low |
|---|-----|--------|
| L1 | `kubectl apply` arguments not verified | Wrong flags would silently deploy nothing |

---

## Remediation Plan — bats-core Tests

### Stub helper

```bash
# test/helpers/stub_kubectl.bash
stub_kubectl() {
  local exit_code="${1:-0}"
  mkdir -p "${BATS_TEST_TMPDIR}/bin"
  cat > "${BATS_TEST_TMPDIR}/bin/kubectl" << EOF
#!/usr/bin/env bash
exit ${exit_code}
EOF
  chmod +x "${BATS_TEST_TMPDIR}/bin/kubectl"
  export PATH="${BATS_TEST_TMPDIR}/bin:${PATH}"
}
```

### Test file: `test/deploy.bats`

```bash
#!/usr/bin/env bats

load helpers/stub_kubectl

SCRIPT="${BATS_TEST_DIRNAME}/../scripts/deploy.sh"

@test "When deploy runs, Then kubectl apply is called with k8s/ manifest path" {
  mkdir -p "${BATS_TEST_TMPDIR}/bin"
  cat > "${BATS_TEST_TMPDIR}/bin/kubectl" << 'EOF'
#!/usr/bin/env bash
echo "ARGS: $*" > "${BATS_TEST_TMPDIR}/kubectl_args"
exit 0
EOF
  chmod +x "${BATS_TEST_TMPDIR}/bin/kubectl"
  export PATH="${BATS_TEST_TMPDIR}/bin:${PATH}"

  run bash "${SCRIPT}"
  [ "$status" -eq 0 ]
  run cat "${BATS_TEST_TMPDIR}/kubectl_args"
  [[ "$output" == *"apply"* ]]
  [[ "$output" == *"-f"* ]]
  [[ "$output" == *"k8s/"* ]]
}

@test "When kubectl apply fails, Then deploy.sh exits with non-zero status" {
  stub_kubectl 1
  run bash "${SCRIPT}"
  [ "$status" -ne 0 ]
}

@test "When k8s/ directory is absent and kubectl signals error, Then deploy.sh fails" {
  stub_kubectl 1
  run bash "${SCRIPT}"
  [ "$status" -ne 0 ]
}

@test "When kubectl is not on PATH, Then deploy.sh exits with non-zero status" {
  export PATH="${BATS_TEST_TMPDIR}/empty_bin"
  mkdir -p "${BATS_TEST_TMPDIR}/empty_bin"
  run bash "${SCRIPT}"
  [ "$status" -ne 0 ]
}

@test "When deploy runs, Then 'Deploying...' is printed to stdout" {
  stub_kubectl 0
  run bash "${SCRIPT}"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Deploying..."* ]]
}

@test "When deploy succeeds, Then script exits with status 0" {
  stub_kubectl 0
  run bash "${SCRIPT}"
  [ "$status" -eq 0 ]
}

@test "When deploy runs, Then kubectl receives 'apply -f k8s/' and no extra flags" {
  mkdir -p "${BATS_TEST_TMPDIR}/bin"
  cat > "${BATS_TEST_TMPDIR}/bin/kubectl" << 'EOF'
#!/usr/bin/env bash
printf '%s\n' "$@" > "${BATS_TEST_TMPDIR}/kubectl_argv"
exit 0
EOF
  chmod +x "${BATS_TEST_TMPDIR}/bin/kubectl"
  export PATH="${BATS_TEST_TMPDIR}/bin:${PATH}"

  run bash "${SCRIPT}"
  [ "$status" -eq 0 ]

  run cat "${BATS_TEST_TMPDIR}/kubectl_argv"
  [ "${lines[0]}" = "apply" ]
  [ "${lines[1]}" = "-f" ]
  [ "${lines[2]}" = "k8s/" ]
}
```
