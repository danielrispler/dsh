---
name: concurrency-review
description: Reviews Go concurrency changes for leaks, races, and synchronization mistakes during manual audit. Use only for explicitly requested review workflows such as /pr-audit.
---

# Go Concurrency Review

Use this skill only during manual review.

## Audit checks
- **Leak Detection**: Verify that all goroutines can exit under all conditions, including errors.
- **Race Audit**: Check for non-synchronized access to shared variables.
- **Sync Primitive Audit**: Ensure `WaitGroup.Add` precedes `go`, and `Done` is deferred.

## Evidence rule
Prefer no finding over a weak or speculative finding.
