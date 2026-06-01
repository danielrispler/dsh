# Coverage Gap Report

2 files changed (1 TypeScript, 1 Go), gaps found (1 critical, 5 high, 4 medium, 1 low)

---

## TypeScript

### 🔴 Critical

**`apps/server/upload.controller.ts`**
- Missing: No test file exists for this HTTP controller
- Suggested: `When a valid upload request is received, Then the controller returns HTTP 200 with the upload result`

### 🟠 High

**`apps/server/upload.controller.ts`**

Gap 1 — Error path: invalid input (Exit Door 5)
- `When the request payload is missing required fields, Then the controller returns HTTP 400 with a descriptive error body`

Gap 2 — State verification after upload (Exit Door 2)
- `When a file is successfully uploaded, Then the stored record is retrievable via the public upload API`

Gap 3 — External storage call assertion (Exit Door 3)
- `When upload is triggered, Then the file is persisted to the configured storage backend with the expected key/path`

### 🟡 Medium

Gap 4 — Oversized file rejection (Exit Door 5 variant)
- `When the uploaded file exceeds the size limit, Then the controller returns HTTP 413`

Gap 5 — Concurrent upload isolation (Exit Door 2 variant)
- `When two uploads are submitted simultaneously, Then each returns its own distinct upload identifier`

### 🟢 Low

Gap 6 — Observability on storage failure
- `When upload fails due to a storage error, Then the error is logged with sufficient context for debugging`

### ✅ Already Covered
_(none — file is new with no test suite)_

### ⏭️ Skipped
_(none in TypeScript group)_

---

## Go

### 🔴 Critical
_(none — pure utility, not HTTP handler)_

### 🟠 High

**`services/resizer/resize.go`**

Gap 1 — Happy path: valid input (Exit Door 1)
- `func TestResizeImage_WhenValidInputProvided_ThenReturnsResizedImage(t *testing.T)`

Gap 2 — Error return: invalid input (Exit Door 1 error variant)
- `func TestResizeImage_WhenNilBytesProvided_ThenReturnsError(t *testing.T)`

### 🟡 Medium

Gap 3 — Aspect ratio preservation
- `func TestResizeImage_WhenOnlyWidthSpecified_ThenAspectRatioPreserved(t *testing.T)`

Gap 4 — Unsupported image format
- `func TestResizeImage_WhenUnrecognizedFormat_ThenReturnsDescriptiveError(t *testing.T)`

### 🟢 Low

Gap 5 — Very large image boundary
- `func TestResizeImage_WhenExtremelyLargeImage_ThenCompletesWithoutPanic(t *testing.T)`

### ✅ Already Covered
_(none — file is new with no test suite)_

### ⏭️ Skipped
_(none in Go group)_

---

### Remediation Plan

1. **[Critical — TypeScript]** Create `apps/server/upload.controller.test.ts`. Happy-path: `When valid upload request, Then HTTP 200 with upload result`.
2. **[High — TypeScript]** Add error-path test: `When missing required fields, Then HTTP 400`.
3. **[High — TypeScript]** Add state-verification test: `When file uploaded, Then record retrievable via public API`.
4. **[High — TypeScript]** Add external-call assertion: `When upload triggered, Then storage backend receives file at expected key`.
5. **[High — Go]** Create `services/resizer/resize_test.go`. Table-driven happy-path: valid bytes + dimensions → output matches dimensions.
6. **[High — Go]** Add error-return test: nil/empty bytes → non-nil error.
7. **[Medium — TypeScript]** Oversized-file test (HTTP 413).
8. **[Medium — Go]** Aspect-ratio + unsupported-format test cases.
