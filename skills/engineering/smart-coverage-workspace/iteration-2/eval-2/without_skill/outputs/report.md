# Test Coverage Gap Report (baseline — no skill)

## Files Analyzed

- `apps/frontend/user.component.ts` — Angular component
- `apps/server/user.controller.ts` — HTTP controller

---

## Angular Component: `UserComponent`

### Coverage Gaps

#### High

**Gap 1 — Default `name` value never verified**

```ts
describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>
  let component: UserComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserComponent],
    }).compileComponents()
    fixture = TestBed.createComponent(UserComponent)
    component = fixture.componentInstance
  })

  it('When no name input is provided, Then name defaults to empty string', () => {
    fixture.detectChanges()
    expect(component.name).toBe('')
  })
})
```

**Gap 2 — Rendered output for default empty name not verified**

```ts
it('When no name input is provided, Then the heading renders an empty string', () => {
  fixture.detectChanges()
  const h1: HTMLElement = fixture.nativeElement.querySelector('h1')
  expect(h1.textContent).toBe('')
})
```

#### Medium

**Gap 3 — Input binding propagates to template**

```ts
it('When the name input is set to "Alice", Then the heading displays "Alice"', () => {
  component.name = 'Alice'
  fixture.detectChanges()
  const h1: HTMLElement = fixture.nativeElement.querySelector('h1')
  expect(h1.textContent).toBe('Alice')
})
```

**Gap 4 — Input change reflected after update**

```ts
it('When the name input changes from "Alice" to "Bob", Then the heading updates to "Bob"', () => {
  component.name = 'Alice'
  fixture.detectChanges()
  component.name = 'Bob'
  fixture.detectChanges()
  const h1: HTMLElement = fixture.nativeElement.querySelector('h1')
  expect(h1.textContent).toBe('Bob')
})
```

#### Low

**Gap 5 — Component selector is correct** (`app-user`)

---

## HTTP Controller: `getUser`

### Coverage Gaps

#### Critical

**Gap 1 — Response payload shape never verified**

```ts
describe('getUser', () => {
  it('When getUser is called, Then it sends { id: 1, name: "Alice" }', async () => {
    const mockReply = { send: jest.fn() }
    await getUser({} as any, mockReply as any)
    expect(mockReply.send).toHaveBeenCalledWith({ id: 1, name: 'Alice' })
  })
})
```

#### High

**Gap 2 — `reply.send` called exactly once**

```ts
it('When getUser is called, Then reply.send is called exactly once', async () => {
  const mockReply = { send: jest.fn() }
  await getUser({} as any, mockReply as any)
  expect(mockReply.send).toHaveBeenCalledTimes(1)
})
```

**Gap 3 — Function resolves without throwing**

```ts
it('When getUser is called, Then the returned promise resolves without error', async () => {
  const mockReply = { send: jest.fn() }
  await expect(getUser({} as any, mockReply as any)).resolves.toBeUndefined()
})
```

#### Medium

**Gap 4 — Empty request does not throw**

```ts
it('When getUser is called with an empty request, Then it still sends the response successfully', async () => {
  const mockReply = { send: jest.fn() }
  await expect(getUser({} as any, mockReply as any)).resolves.not.toThrow()
  expect(mockReply.send).toHaveBeenCalled()
})
```

#### Low

**Gap 5 — Response `id` field is a number**

```ts
it('When getUser responds, Then the id field is a number', async () => {
  let captured: any
  const mockReply = { send: jest.fn((payload) => { captured = payload }) }
  await getUser({} as any, mockReply as any)
  expect(typeof captured.id).toBe('number')
})
```
