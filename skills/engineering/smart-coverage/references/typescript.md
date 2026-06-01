# TypeScript Reference

## TEST_PATTERN
- `*.test.ts`
- `*.spec.ts`
- `__tests__/**/*.ts`

## TEST_SYNTAX
```typescript
describe('ClassName or feature', () => {
  it('When <condition>, Then <outcome>', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

## SKIP_PATTERNS
- `*.config.ts`
- `vite.config.*`
- `vitest.config.*`
- `pnpm-lock.yaml`
- `package-lock.json`
- `yarn.lock`
- `*.d.ts`

## HTTP controller testing

For HTTP controllers, always prefer framework-native request injection over manually constructed mock objects:
- **Fastify**: `await app.inject({ method: 'POST', url: '/path', payload: { ... } })` — exercises the real route registration, plugin lifecycle, and serialization pipeline
- **Express/other**: `supertest(app).post('/path').send({ ... })`

Avoid patterns like `const mockReply = { code: vi.fn().mockReturnThis(), send: vi.fn() }` — these only test that your handler calls the framework's methods in the right order, not that the HTTP response is correct.

## FILE_CLASSIFICATION
| Type | Exits | Notes |
|------|-------|-------|
| HTTP controller | All 5 | Use `app.inject()` (Fastify) or supertest — not mock reply objects |
| Use-case / application service | 1,2,3,4 | |
| Infrastructure adapter | 3,4 | External system calls |
| Pure utility | 1 only | |
| UI component | 1,5 | See react.md or angular.md overlay |
| State store | 1,2 | |
| Config / bootstrap | None | Skip |
| Type-only / .d.ts | None | Skip |
