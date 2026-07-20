# Angular Reference (additive overlay — overrides UI component + service DI sections only)

## Scope

Overrides the **setup/syntax** for **UI component** and **service** rows for Angular projects.
All other TypeScript rules remain unchanged — including the **When/Then naming convention**, which
is cross-cutting and must NOT be overridden here.

## Component Testing

Use `TestBed` setup + `fixture.componentRef.setInput()` (modern Angular API):

```typescript
import { TestBed } from '@angular/core/testing'
import { ComponentFixture } from '@angular/core/testing'

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
    }).compileComponents()
    fixture = TestBed.createComponent(MyComponent)
  })

  it('When title input is provided, Then h1 contains the text', () => {
    fixture.componentRef.setInput('title', 'Hello')
    fixture.detectChanges()
    const el = fixture.nativeElement.querySelector('h1')
    expect(el.textContent).toContain('Hello')
  })
})
```

## Service Testing

Inject via `TestBed.inject()`:

```typescript
it('When valid input is given, Then service returns expected data', () => {
  const service = TestBed.inject(MyService)
  const result = service.compute(input)
  expect(result).toEqual(expected)
})
```

## TEST_SYNTAX
`it('When <condition>, Then <outcome>', () => { ... })`

The `When/Then` naming convention applies universally in Angular projects — do not use `should` phrasing.
Angular's contribution is TestBed setup and `setInput()` API, not a different naming style.
