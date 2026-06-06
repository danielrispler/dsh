---
name: correctness-review
description: Reviews Go changes for logical bugs, nil pointer risks, and error handling mistakes during manual audit. Use only for explicitly requested review workflows such as /pr-audit.
---

# Go Correctness Review

Use this skill only during manual review.

## Audit checks
- **Shadowing Audit**: Check for accidentally shadowed variables such as `err :=`.
- **Logic Walkthrough**: Trace behavior for empty inputs, max values, and edge-case errors.
- **State Audit**: Ensure invariants are maintained throughout complex transformations.

## Evidence rule
Prefer no finding over a weak or speculative finding.
