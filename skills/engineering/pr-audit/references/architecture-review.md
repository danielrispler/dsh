---
name: architecture-review
description: Reviews service-agnostic Go architecture and design changes for boundary violations, unnecessary coupling, misplaced responsibilities, and poor package structure during manual audit. Use only for explicitly requested review workflows such as /pr-audit.
---

# Go Architecture Review

Use this skill only during manual review.

## Rule Reference
- See `../../architecture/resources/architecture-rules.md` for repository-wide constraints.
- See the nearest `AGENTS.md` files for service-specific structure rules.

## Audit checks
- **Boundary Leakage**: Identify transport, storage, framework, or infrastructure concerns leaking into core business logic.
- **Dependency Direction**: Verify high-level policy code does not depend on low-level implementation details.
- **Package Integrity**: Flag cyclic dependencies, reach-through access, or package APIs that break ownership.
- **Interface Quality**: Flag speculative, oversized, or adapter-owned interfaces with weak justification.
- **Responsibility Placement**: Check whether logic lives with the package that owns the behavior and change cadence.
- **Shared Code Discipline**: Flag `util` or `shared` abstractions that centralize unrelated logic or serve only one caller.
- **Composition Clarity**: Check whether dependencies are explicit and wired predictably rather than hidden behind globals or side effects.

## Evidence rule
Prefer no finding over a weak or speculative finding.

## Review stance
- Prioritize concrete architectural risks over style preferences.
- Explain why a structure increases coupling, obscures ownership, or makes change harder.
- Prefer findings that can be tied to specific files, imports, constructors, or package APIs.
