# Tests for `api/orders/handler.go`

## The blocker: `chargeCard` is untestable as written

Before listing tests, you need to recognize what's testable and what isn't. `chargeCard` is a **package-level free function** with a **hardcoded HTTPS URL** (`https://payments.example.com/charge`) called via the default `http.DefaultClient`. From `HandleOrder`, there is:

- no interface to stub,
- no function-variable seam (e.g. `var chargeCardFn = chargeCard`) to monkey-patch in tests,
- no injected `*http.Client` or base URL,
- no context, no timeout.

That means any test that calls `HandleOrder` end-to-end will **actually hit `payments.example.com`** (or fail with DNS/connection error, depending on the sandbox). You cannot meaningfully test the success path or the upstream-failure path without one of:

1. **Recommended refactor (smallest):** introduce a package-level function variable so tests can swap it.
   ```go
   var chargeCardFn = chargeCard
   // in HandleOrder: chargeID, err := chargeCardFn(req.UserID, req.Amount)
   ```
2. **Better refactor:** inject a `Charger` interface (or a `func(userID string, amount float64) (string, error)`) into a handler struct, and/or pass an `*http.Client` + base URL into `chargeCard`.

Pick (1) for a one-line change; pick (2) if you also want to test `chargeCard` itself against an `httptest.Server`.

## Tests worth writing

### A. Tests you can write **today, without any refactor** (pure-input validation paths)

These exercise the branches in `HandleOrder` that return **before** `chargeCard` is called, so they're safe and deterministic.

1. **Wrong method returns 405**
   - `GET /` (and maybe `PUT`, `DELETE`) -> `http.StatusMethodNotAllowed`, empty body.
2. **Malformed JSON returns 400**
   - `POST` with body `"{not json"` -> `http.StatusBadRequest`.
3. **Missing `user_id` returns 400**
   - `POST` with `{"amount": 10}` -> 400.
4. **Non-positive amount returns 400**
   - `{"user_id":"u1","amount":0}` -> 400.
   - `{"user_id":"u1","amount":-5}` -> 400.
5. **Empty body returns 400** (decoder fails on EOF).

Use `httptest.NewRecorder()` + `httptest.NewRequest(...)` and call `HandleOrder` directly — no server needed.

### B. Tests that require the seam (after the 1-line refactor in (1) above)

6. **Happy path: 201 + correct JSON body**
   - Swap `chargeCardFn` with `func(u string, a float64) (string, error) { return "ch_123", nil }`.
   - Assert status `201`, `Content-Type: application/json`, body decodes to `CreateOrderResponse{OrderID:"order_u1", ChargeID:"ch_123"}`.
   - Assert the stub received exactly `("u1", 42.0)` (so you catch arg-mapping regressions).
7. **Upstream charge failure returns 502**
   - Stub returns `errors.New("boom")` -> assert `http.StatusBadGateway`, no body written from the success branch.
8. **Charge returns empty ChargeID** (edge case worth pinning)
   - Stub returns `"", nil` -> currently produces `ChargeID:""` in the response. Decide if that's intended; either way, lock the behavior with a test.
9. **OrderID derivation**
   - Verify the `"order_" + req.UserID` concatenation with a couple of user IDs (including one with spaces / unicode, since there's no validation).

Use table-driven tests (`[]struct{ name, body string; want int }`) to compress (1)-(5) and (6)-(9).

### C. Tests for `chargeCard` itself (require refactor (2), or build-tag integration tests)

If you inject `*http.Client` + base URL into `chargeCard`, add:

10. **Sends correct JSON payload + content-type** — assert with `httptest.NewServer` that the request body parses to `{user_id, amount}` and `Content-Type: application/json`.
11. **Parses `charge_id` from 200 response.**
12. **Returns error on transport failure** (e.g. server `Close()` mid-request, or unreachable URL).
13. **Returns error on malformed JSON response** (server writes `"not json"`).
14. **Does not leak the response body** (covered implicitly by `defer resp.Body.Close()`; a `-race` run with many parallel calls is a reasonable smoke).
15. **Non-2xx upstream status** — currently the code **ignores** `resp.StatusCode` and tries to unmarshal whatever body came back. That is a latent bug; add a failing test now (`server returns 500 with body "internal"`) and decide whether `chargeCard` should return an error on non-2xx.

## Other issues the tests will surface (worth fixing while you're here)

- `payload, _ := json.Marshal(...)` and `body, _ := io.ReadAll(...)` silently swallow errors.
- No `context.Context` -> no cancellation, no deadline; `http.Post` uses `DefaultClient` with no timeout, so a hung gateway will hang the handler forever. Add a timeout / accept a `ctx` from `r.Context()`.
- `HandleOrder` does no auth, no idempotency key, and trusts the client-supplied `user_id`. Probably out of scope for unit tests, but worth a TODO.
- Status-code branch noted in test (15) above is a real bug.

## Suggested file layout

- `api/orders/handler_test.go` — tests A and B (table-driven).
- `api/orders/charge_test.go` — tests C, after the DI refactor.

## TL;DR

Write the 5 validation tests now (group A) — they need nothing. Then do the one-line `var chargeCardFn = chargeCard` seam and add the 4 handler-with-stub tests (group B). Only refactor `chargeCard`'s signature if you want to cover the HTTP-client behavior itself (group C); that's also where you'll catch the non-2xx-status bug.
