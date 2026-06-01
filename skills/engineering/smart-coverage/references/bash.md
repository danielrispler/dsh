# Bash Reference

## TEST_PATTERN
- `*.bats` — bats-core test files
- `test_*.sh`, `*_test.sh` — shunit2 or hand-rolled

## TEST_SYNTAX

bats-core (preferred):
```bash
#!/usr/bin/env bats

@test "When <condition>, Then <outcome>" {
  # Arrange
  # Act
  run scripts/deploy.sh
  # Assert
  [ "$status" -eq 0 ]
}
```

For asserting output content:
```bash
@test "When deploy runs, Then kubectl apply is called with k8s/" {
  run scripts/deploy.sh
  [ "$status" -eq 0 ]
  grep -q "apply -f k8s/" $BATS_TEST_TMPDIR/kubectl-calls
}
```

## SKIP_PATTERNS
- `*.env`
- `.envrc`
- `*.cfg`

## FILE_CLASSIFICATION
| Type | Exits | Notes |
|------|-------|-------|
| Script / executable | 3, 5 | External CLI calls (Exit Door 3), error propagation / exit code (Exit Door 5) |

## Stub injection pattern

Inject stubs by PATH-shadowing the real command. Record calls into `$BATS_TEST_TMPDIR` (per-test, auto-cleaned — never share `/tmp/*-calls` between tests).

```bash
setup() {
  STUB_DIR="$BATS_TEST_TMPDIR/stubs"
  mkdir -p "$STUB_DIR"
  printf '#!/usr/bin/env bash\necho "$@" >> "$BATS_TEST_TMPDIR/kubectl-calls"\n' > "$STUB_DIR/kubectl"
  chmod +x "$STUB_DIR/kubectl"
  export PATH="$STUB_DIR:$PATH"
}
```

## Gap classification for bash scripts

- **Critical**: script is never exercised by any test at all
- **High (Exit Door 3)**: external command invoked but its arguments not verified; script fails to exit non-zero when external command fails
- **High (Exit Door 5)**: error paths not tested (missing-file, permission-denied, command-not-found)
- **Medium**: argument variations (extra flags, alternate paths)
- **Low**: output/stdout assertions, set -e / pipefail behavior
