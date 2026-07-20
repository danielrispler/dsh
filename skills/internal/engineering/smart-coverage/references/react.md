# React Reference (additive overlay — overrides UI component section only)

## Scope

Overrides the **UI component** row of the TypeScript base classification.
All other TypeScript rules remain unchanged.

## UI Component Testing

Test via `render()` + `@testing-library/user-event`. Assert on DOM output only.

### TEST_SYNTAX for components
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('When <prop/state condition>, Then <DOM outcome>', async () => {
  render(<MyComponent prop={value} />)
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))
  expect(screen.getByText(/expected output/i)).toBeInTheDocument()
})
```

## Coverage Focus
- Render output for each significant prop combination
- User interactions (click, type, submit)
- Error boundaries / error states
- Conditional rendering paths
