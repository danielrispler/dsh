# Rust Reference

## TEST_PATTERN
- Inline `#[test]` in same file (unit tests)
- Integration tests: `tests/**/*.rs`

## TEST_SYNTAX

Unit (inline):
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn when_condition_then_outcome() {
        // Arrange
        // Act
        // Assert
        assert_eq!(result, expected);
    }
}
```

Integration (`tests/`):
```rust
#[test]
fn when_condition_then_outcome() {
    // Uses public API only
}
```

## SKIP_PATTERNS
- `Cargo.lock`
- `target/`

## FILE_CLASSIFICATION
| Type | Exits | Notes |
|------|-------|-------|
| HTTP handler (actix/axum) | All 5 | Use test client or `actix_web::test` |
| Service / use-case | 1,2,3,4 | |
| Trait impl | 1,3 | Test via trait interface |
| Pure utility / function | 1 only | |
| `mod.rs` (re-exports only) | None | Skip |
| `Cargo.lock` | None | Skip |
