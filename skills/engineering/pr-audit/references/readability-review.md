---
name: readability-review
description: Reviews Go changes for maintainability, complexity, and testability issues during manual audit. Use only for explicitly requested review workflows such as /pr-audit.
---

# Go Readability Review

Use this skill only during manual review.

## Rule Reference
- **Go Standards**: See `../../readability/resources/go-standards.md`

## Audit checks
- **Cognitive Load Audit**: Identify overly complex or long functions.
- **Duplication Audit**: Find local logic that can be unified without violating domain boundaries.
- **Testability Audit**: Identify code that is hard to test due to hidden dependencies.

## Evidence rule
Prefer no finding over a weak or subjective finding.
