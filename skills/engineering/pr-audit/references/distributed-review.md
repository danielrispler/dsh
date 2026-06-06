---
name: distributed-review
description: Reviews distributed-system changes for idempotency, crash safety, and shutdown correctness during manual audit. Use only for explicitly requested review workflows such as /pr-audit.
---

# Distributed Systems Review

Use this skill only during manual review.

## Audit checks
- **Crash Recovery**: Analyze behavior for worker crashes at every critical step.
- **Race Audit**: Identify check-then-set patterns that are not atomic in a distributed context.
- **Shutdown Audit**: Verify that graceful shutdown and context propagation cover all I/O.

## Evidence rule
Prefer no finding over a weak or speculative finding.
