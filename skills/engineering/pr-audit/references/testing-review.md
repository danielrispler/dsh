---
name: testing-review
description: Reviews test changes for coverage gaps, flakiness, and fixture safety during manual audit. Use only for explicitly requested review workflows such as /pr-audit.
---

# Go Testing Review

Use this skill only during manual review.

## Rule Reference
- **Testing Standards**: See `../../testing/resources/testing-rules.md`

## Audit checks
- **Edge Case Audit**: Verify that all error paths and boundary conditions are covered.
- **Flakiness Audit**: Check for tests that rely on timing or uncleaned global state.
- **Fixture Audit**: Ensure `t.Cleanup` usage is correct and robust.

## Evidence rule
Prefer no finding over a weak or speculative finding.
