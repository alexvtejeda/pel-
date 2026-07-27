# Service Providers Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the six unused service-provider endpoints end-to-end — a member can apply to offer services, track/edit their application at `/servicios`, and an admin can review it (with the applicant's ID document) from the existing approvals tab.

**Architecture:** Service provider is a **`member` capability, not a role** (the backend router uses `RequireRole("member")`), so there is no new guard — `/servicios` is a `member`-protected page that branches on `GET /service-providers/me` returning a record vs. 404. Registration and re-application are **multipart** (ID document upload); the active-status profile update is **JSON**. Admin review extends the existing combined approvals tab (`rescue-centers-tab.tsx`) with a third `_type` rather than adding a new tab. One backend change is required: the admin list must return the applicant's name/email so rows are human-readable.

**Tech Stack:** Frontend — Next.js 16 App Router, React 19, TypeScript, Tailwind v4, react-i18next, Sonner, Font Awesome, Vitest + React Testing Library, Bun. Backend — Go, go-chi, pgx/PostgreSQL, swaggo.

**Spec:** [`docs/superpowers/specs/2026-07-24-service-providers-wiring-design.md`](../specs/2026-07-24-service-providers-wiring-design.md)

---

## Locked contract (agreed before any code — do not deviate)

The admin list endpoint `GET /api/v1/admin/service-providers` returns `ServiceProvider[]` where each row additionally carries:

| Field | Type | Notes |
|---|---|---|
| `applicant_name` | `string` | The user's `display_name`, or `""` when unset. Present **only** on admin-list rows. |
| `applicant_email` | `string` | The user's `email`. Present **only** on admin-list rows. |

Both are omitted from `GET /service-providers/me`, `POST /service-providers`, `PATCH /service-providers/me`, and `PATCH /admin/service-providers/{id}/review` responses. The frontend labels a row as `applicant_name || applicant_email`.

**Review body is `{ action: "approve" | "reject", reason? }`** — `action`, *not* `status`. This differs from the business review endpoint; the `admin.ts` wrappers hide the difference from callers.

## Open questions — decided

1. **Geocoding fallback:** inline field error + retry (same as `transport-creation-form.tsx`). No map picker in v1.
2. **i18n namespace:** reuse the existing **`business`** namespace. The public `/aliados` directory already lives there (keys under `aliados.*`), and the admin tab already reads `admin.*` from it. Member-facing SP strings go under a new `service_providers.*` block in `business.json`; new admin strings join the existing `admin.*` block.
3. **Edit mode scope:** the full field set (the JSON `PATCH /me` accepts all profile fields).

## Deliberately not in this plan

Both were marked optional in the spec and are excluded from v1 — not oversights:

- **`service_provider_reviewed` WebSocket listener** on `/servicios` (a `RCApprovalListener` equivalent) to live-refresh the status card. The page already re-reads status on mount, so a member sees the decision on their next visit.
- **Secondary "become a provider" CTA on `/aliados`.** The account-sheet entry (Task F7) is the single entry point for v1.

Also out of scope per the spec: the public `/aliados` directory (already wired), any change to the role model, and any backend change beyond the applicant name/email.

## Execution model (required by the spec)

Two subagents, each confined to one repo, both coding to the locked contract above:

- **Backend subagent** — `api/` only. Tasks B1–B2 on branch `feature/sp-admin-applicant-fields`.
- **Frontend subagent** — `frontend/` only. Tasks F1–F8 on branch `feature/service-providers-wiring`.

The frontend track only *depends* on the backend for `applicant_name`/`applicant_email`, and those names are locked here — so both tracks can run in parallel from the start. The orchestrator runs the verification gate at the end (see the final section).

**Git etiquette:** commit inside the child repo, using `git -C /home/noob_master/pelu/<repo>`. Never stage anything under `pelu/` into the parent `/home/noob_master` repo.

## File structure

**Backend (`api/`)**

| File | Responsibility |
|---|---|
| `internal/serviceproviders/repository.go` (modify) | `ServiceProvider` gains two admin-only pointer fields; `listSPs` JOINs `users` to populate them |
| `internal/serviceproviders/handler.go` (modify) | Swagger `@Description` on `AdminList` documents the two fields |
| `internal/serviceproviders/handler_test.go` (modify) | Two new tests: fields present on the admin list, absent from `GET /me` |
| `docs/api/swagger.yaml` (generated) | Regenerated contract |

**Frontend (`frontend/`)**

| File | Responsibility |
|---|---|
| `lib/geocode.ts` (create) | Shared Nominatim address→`{lat,lng}` helper, extracted from the transport form |
| `lib/api/service-providers.ts` (create) | Member-side client: register (multipart), get mine (404-aware), update (JSON), reapply (multipart) + types + enums |
| `lib/api/admin.ts` (modify) | Admin-side client: list, ID-document presign, approve, reject |
| `components/service-providers/service-provider-form.tsx` (create) | One form, three modes (`register` / `edit` / `reapply`) |
| `app/servicios/layout.tsx` (create) | `member`-only route guard |
| `app/servicios/page.tsx` (create) | Status branching: not-registered / pending / active / rejected |
| `components/pets/pets-header.tsx` (modify) | "Ofrecer mis servicios" entry in the member account sheet |
| `components/dashboard/admin/rescue-centers-tab.tsx` (modify) | Third `_type`, applicant labels, ID-document button, approve/reject dispatch |
| `public/locales/{es,en}/business.json` (modify) | All new strings |

---

# Track B — Backend (`api/` repo)

**Before starting:** the API test suite is destructive (it truncates every table) and refuses to run against a database whose name lacks `test`. One-time setup, with Docker Postgres running: `cd /home/noob_master/pelu/api && make test-db-setup`. Every `go test` command below sets `DATABASE_URL` explicitly at the `pelu_test` database.

Create the branch first:

```bash
git -C /home/noob_master/pelu/api checkout -b feature/sp-admin-applicant-fields
```

---

### Task B1: Applicant name + email on the admin list

**Files:**
- Modify: `api/internal/serviceproviders/repository.go:26-42` (struct), `:133-155` (`listSPs`)
- Test: `api/internal/serviceproviders/handler_test.go` (append at end of file)

- [ ] **Step 1: Write the failing tests**

Append to `internal/serviceproviders/handler_test.go`:

```go
func TestAdminListIncludesApplicantFields(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	defer testutil.CleanupTestDB(t, pool)
	testutil.CleanupAll(t, pool)

	cfg := testutil.TestConfig()
	h := newHandler(pool, cfg, &mockStorage{}, &mockHub{})

	ctx := context.Background()
	userID := insertTestUser(t, ctx, pool, "sp-list@example.com", "member")
	if _, err := pool.Exec(ctx, `UPDATE users SET display_name = $1 WHERE id = $2`, "Ana Pérez", userID); err != nil {
		t.Fatalf("set display_name: %v", err)
	}
	if _, err := insertServiceProvider(ctx, pool, userID, "desc", []string{"grooming"}, []string{"cat"}, "1yr", "Calle 9", 18.1, -69.9, "keydoc"); err != nil {
		t.Fatalf("insertServiceProvider: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/service-providers?status=pending", nil)
	rec := httptest.NewRecorder()
	h.AdminList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var list []ServiceProvider
	if err := json.NewDecoder(rec.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 application, got %d", len(list))
	}
	if list[0].ApplicantName == nil || *list[0].ApplicantName != "Ana Pérez" {
		t.Errorf("expected applicant_name %q, got %v", "Ana Pérez", list[0].ApplicantName)
	}
	if list[0].ApplicantEmail == nil || *list[0].ApplicantEmail != "sp-list@example.com" {
		t.Errorf("expected applicant_email %q, got %v", "sp-list@example.com", list[0].ApplicantEmail)
	}
}

func TestAdminListEmptyDisplayNameFallsBackToEmptyString(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	defer testutil.CleanupTestDB(t, pool)
	testutil.CleanupAll(t, pool)

	cfg := testutil.TestConfig()
	h := newHandler(pool, cfg, &mockStorage{}, &mockHub{})

	ctx := context.Background()
	// No display_name set — the column is NULL.
	userID := insertTestUser(t, ctx, pool, "sp-noname@example.com", "member")
	if _, err := insertServiceProvider(ctx, pool, userID, "desc", []string{"training"}, []string{"dog"}, "2yr", "Calle 10", 18.2, -69.8, "keydoc2"); err != nil {
		t.Fatalf("insertServiceProvider: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/service-providers?status=all", nil)
	rec := httptest.NewRecorder()
	h.AdminList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var list []ServiceProvider
	if err := json.NewDecoder(rec.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 application, got %d", len(list))
	}
	if list[0].ApplicantName == nil || *list[0].ApplicantName != "" {
		t.Errorf("expected empty applicant_name, got %v", list[0].ApplicantName)
	}
	if list[0].ApplicantEmail == nil || *list[0].ApplicantEmail != "sp-noname@example.com" {
		t.Errorf("expected applicant_email %q, got %v", "sp-noname@example.com", list[0].ApplicantEmail)
	}
}

func TestGetMineOmitsApplicantFields(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	defer testutil.CleanupTestDB(t, pool)
	testutil.CleanupAll(t, pool)

	cfg := testutil.TestConfig()
	h := newHandler(pool, cfg, &mockStorage{}, &mockHub{})

	ctx := context.Background()
	userID := insertTestUser(t, ctx, pool, "sp-mine@example.com", "member")
	if _, err := insertServiceProvider(ctx, pool, userID, "desc", []string{"grooming"}, []string{"cat"}, "1yr", "Calle 11", 18.3, -69.7, "keydoc3"); err != nil {
		t.Fatalf("insertServiceProvider: %v", err)
	}

	req := httptest.NewRequest("GET", "/service-providers/me", nil)
	req = req.WithContext(auth.ContextWithClaims(req.Context(), claimsForUser(userID)))
	rec := httptest.NewRecorder()
	h.GetMine(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if _, ok := payload["applicant_name"]; ok {
		t.Error("applicant_name must not appear on GET /service-providers/me")
	}
	if _, ok := payload["applicant_email"]; ok {
		t.Error("applicant_email must not appear on GET /service-providers/me")
	}
}
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/noob_master/pelu/api && \
  DATABASE_URL="postgres://pelu:password@localhost:5432/pelu_test?sslmode=disable" \
  go test ./internal/serviceproviders/ -run 'TestAdminList|TestGetMineOmits' -v
```

Expected: FAIL to compile — `list[0].ApplicantName undefined (type ServiceProvider has no field or method ApplicantName)`.

- [ ] **Step 3: Add the two fields to the struct**

In `internal/serviceproviders/repository.go`, extend the `ServiceProvider` struct — add these two fields immediately after `UpdatedAt`:

```go
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Admin-list only: populated by listSPs via a JOIN on users. Nil (and
	// therefore omitted) on every single-record response.
	ApplicantName  *string `json:"applicant_name,omitempty"`
	ApplicantEmail *string `json:"applicant_email,omitempty"`
}
```

- [ ] **Step 4: Rewrite `listSPs` to JOIN users**

The existing `spCols` string is unqualified and would be ambiguous against `users` (both tables have `id`, `created_at`, `updated_at`). Add a qualified column list next to `spCols`:

```go
var spCols = `id, user_id, description, services, pet_types, experience, address, lat, lng, id_document_url, id_verified_at, terms_accepted, status, rejection_reason, created_at, updated_at`

// spColsQualified is spCols with an `sp.` prefix, for queries that JOIN another table.
var spColsQualified = `sp.id, sp.user_id, sp.description, sp.services, sp.pet_types, sp.experience, sp.address, sp.lat, sp.lng, sp.id_document_url, sp.id_verified_at, sp.terms_accepted, sp.status, sp.rejection_reason, sp.created_at, sp.updated_at`
```

Then replace the whole `listSPs` function with:

```go
func listSPs(ctx context.Context, pool *pgxpool.Pool, statusFilter string) ([]ServiceProvider, error) {
	query := `SELECT ` + spColsQualified + `, COALESCE(u.display_name, '') AS applicant_name, u.email AS applicant_email
		FROM service_providers sp
		JOIN users u ON u.id = sp.user_id`
	var args []any
	if statusFilter != "" {
		query += ` WHERE sp.status = $1`
		args = append(args, statusFilter)
	}
	query += ` ORDER BY sp.created_at`
	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []ServiceProvider
	for rows.Next() {
		sp := ServiceProvider{}
		var applicantName, applicantEmail string
		if err := rows.Scan(&sp.ID, &sp.UserID, &sp.Description, &sp.Services, &sp.PetTypes, &sp.Experience, &sp.Address, &sp.Lat, &sp.Lng, &sp.IDDocumentURL, &sp.IDVerifiedAt, &sp.TermsAccepted, &sp.Status, &sp.RejectionReason, &sp.CreatedAt, &sp.UpdatedAt, &applicantName, &applicantEmail); err != nil {
			return nil, err
		}
		sp.ApplicantName = &applicantName
		sp.ApplicantEmail = &applicantEmail
		result = append(result, sp)
	}
	return result, nil
}
```

Note the `applicantName`/`applicantEmail` locals are declared **inside** the loop so each row takes the address of its own copy.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd /home/noob_master/pelu/api && \
  DATABASE_URL="postgres://pelu:password@localhost:5432/pelu_test?sslmode=disable" \
  go test ./internal/serviceproviders/ -run 'TestAdminList|TestGetMineOmits' -v
```

Expected: PASS — `ok github.com/pelu/api/internal/serviceproviders`.

- [ ] **Step 6: Run the whole package to check for regressions**

```bash
cd /home/noob_master/pelu/api && \
  DATABASE_URL="postgres://pelu:password@localhost:5432/pelu_test?sslmode=disable" \
  go test ./internal/serviceproviders/ -v
```

Expected: PASS, including the pre-existing `TestRegisterSuccess`, `TestGetMine`, `TestAdminReview`, `TestListProviders`.

- [ ] **Step 7: Commit**

```bash
git -C /home/noob_master/pelu/api add internal/serviceproviders/repository.go internal/serviceproviders/handler_test.go
git -C /home/noob_master/pelu/api commit -m "feat(serviceproviders): return applicant name/email on the admin list"
```

---

### Task B2: Document the fields and regenerate the contract

**Files:**
- Modify: `api/internal/serviceproviders/handler.go:461` (the `AdminList` `@Description` line)
- Regenerate: `api/docs/api/swagger.yaml`

- [ ] **Step 1: Update the swagger description**

In `internal/serviceproviders/handler.go`, replace the `AdminList` `@Description` line:

```go
// @Description  Returns service-provider records filtered by status. Default is `pending`. Use `all` to skip the filter. Rows carry `applicant_name` (the user's display name, empty string when unset) and `applicant_email` so the admin UI can label them; those two fields appear only on this endpoint. Admin only.
```

- [ ] **Step 2: Regenerate the OpenAPI spec**

```bash
cd /home/noob_master/pelu/api && make swagger
```

- [ ] **Step 3: Verify the generated contract actually carries the fields**

```bash
grep -n "applicant_name\|applicant_email" /home/noob_master/pelu/api/docs/api/swagger.yaml
```

Expected: at least two hits inside the `serviceproviders.ServiceProvider` definition. If there are zero hits, `make swagger` did not pick up the struct change — do not proceed; re-check Task B1 Step 3.

- [ ] **Step 4: Commit**

```bash
git -C /home/noob_master/pelu/api add internal/serviceproviders/handler.go docs/api/
git -C /home/noob_master/pelu/api commit -m "docs(swagger): document applicant fields on the admin SP list"
```

- [ ] **Step 5: Report back to the orchestrator**

Report exactly: the JSON field names shipped, the `swagger.yaml` diff (`git -C /home/noob_master/pelu/api show --stat HEAD`), and the `go test ./internal/serviceproviders/` result.

---

# Track F — Frontend (`frontend/` repo)

Create the branch first:

```bash
git -C /home/noob_master/pelu/frontend checkout -b feature/service-providers-wiring
```

Run tests with `npx vitest run <path>` — there is no `test` npm script.

---

### Task F1: Extract the shared geocoding helper

**Files:**
- Create: `frontend/lib/geocode.ts`
- Create: `frontend/lib/__tests__/geocode.test.ts`
- Modify: `frontend/components/transport/transport-creation-form.tsx:26-38` (delete the local copy), `:9` (imports)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/geocode.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { geocodeAddress } from '../geocode'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('geocodeAddress', () => {
  it('returns the first result as lat/lng numbers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '18.4861', lon: '-69.9312' }]),
    }))

    const result = await geocodeAddress('Av. Winston Churchill, Santo Domingo')

    expect(result).toEqual({ lat: 18.4861, lng: -69.9312 })
    expect(fetch).toHaveBeenCalledWith(
      'https://nominatim.openstreetmap.org/search?q=Av.%20Winston%20Churchill%2C%20Santo%20Domingo&format=json&limit=1',
      { headers: { 'User-Agent': 'Pelu-App/1.0' } }
    )
  })

  it('returns null when the address has no match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }))
    expect(await geocodeAddress('nowhere at all')).toBeNull()
  })

  it('returns null on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))
    expect(await geocodeAddress('Calle 1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/__tests__/geocode.test.ts
```

Expected: FAIL — `Failed to resolve import "../geocode"`.

- [ ] **Step 3: Create the shared helper**

Create `lib/geocode.ts` — the body is moved verbatim from `transport-creation-form.tsx`:

```ts
export interface GeoPoint {
  lat: number
  lng: number
}

/**
 * Resolves a free-text address to coordinates via Nominatim (OpenStreetMap).
 * Returns null when the address has no match or the request fails — callers
 * surface an inline field error and let the user retry.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Pelu-App/1.0' } }
    )
    const data = await res.json()
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/__tests__/geocode.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Switch the transport form to the shared helper**

In `components/transport/transport-creation-form.tsx`, delete the local function (the whole `async function geocodeAddress(...) { ... }` block at lines 26–38) and add the import below the existing `@/lib/api/transport` import:

```ts
import { requestTrip, quoteTrip, Trip, Point, TripQuote, MarketplaceBusiness } from '@/lib/api/transport'
import { geocodeAddress } from '@/lib/geocode'
```

`GeoPoint` is structurally identical to `Point` (`{ lat: number; lng: number }`), so the existing `setPickupCoords(pickup)` / `setDropoffCoords(dropoff)` calls type-check unchanged.

- [ ] **Step 6: Verify the transport form still compiles and its tests pass**

```bash
cd /home/noob_master/pelu/frontend && npx tsc --noEmit 2>&1 | grep -v "transitions" | head
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/transport
```

Expected: no `tsc` output for transport files (two pre-existing errors in the transitions tests are known and filtered out above); transport tests PASS.

- [ ] **Step 7: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/geocode.ts lib/__tests__/geocode.test.ts components/transport/transport-creation-form.tsx
git -C /home/noob_master/pelu/frontend commit -m "refactor(geocode): extract shared geocodeAddress helper"
```

---

### Task F2: Member-side API client

**Files:**
- Create: `frontend/lib/api/service-providers.ts`
- Create: `frontend/lib/api/__tests__/service-providers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/api/__tests__/service-providers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerServiceProvider,
  getMyServiceProvider,
  updateServiceProviderProfile,
  reapplyServiceProvider,
} from '../service-providers'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

const PROFILE = {
  description: 'Paseo perros',
  experience: '3 años',
  address: 'Calle 1, Santo Domingo',
  lat: 18.47,
  lng: -69.93,
  services: ['dog_walking', 'pet_sitting'],
  pet_types: ['dog'],
}

const SP = { id: 'sp1', user_id: 'u1', status: 'pending' }

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('registerServiceProvider', () => {
  it('posts multipart FormData with credentials and no Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SP) })
    vi.stubGlobal('fetch', fetchMock)

    const idDocument = new File(['data'], 'cedula.jpg', { type: 'image/jpeg' })
    const result = await registerServiceProvider({ ...PROFILE, id_document: idDocument })

    expect(result).toEqual({ data: SP, error: null })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/api/v1/service-providers`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toBeUndefined()

    const form = init.body as FormData
    expect(form.get('description')).toBe('Paseo perros')
    expect(form.get('lat')).toBe('18.47')
    expect(form.getAll('services')).toEqual(['dog_walking', 'pet_sitting'])
    expect(form.getAll('pet_types')).toEqual(['dog'])
    expect(form.get('terms_accepted')).toBe('true')
    expect(form.get('id_document')).toBe(idDocument)
  })

  it('returns the API error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'ID document required' }),
    }))
    const result = await registerServiceProvider({
      ...PROFILE, id_document: new File(['d'], 'c.jpg'),
    })
    expect(result).toEqual({ data: null, error: 'ID document required' })
  })

  it('returns a connection error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))
    const result = await registerServiceProvider({
      ...PROFILE, id_document: new File(['d'], 'c.jpg'),
    })
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('getMyServiceProvider', () => {
  it('returns the record on 200', async () => {
    mockApiClient.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(SP) } as Response)
    const result = await getMyServiceProvider()
    expect(result).toEqual({ data: SP, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/service-providers/me')
  })

  it('treats 404 as "not registered", not an error', async () => {
    mockApiClient.mockResolvedValue({ ok: false, status: 404 } as Response)
    const result = await getMyServiceProvider()
    expect(result).toEqual({ data: null, error: null })
  })

  it('returns the API error on other failures', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, status: 500, json: () => Promise.resolve({ error: 'database error' }),
    } as Response)
    const result = await getMyServiceProvider()
    expect(result).toEqual({ data: null, error: 'database error' })
  })
})

describe('updateServiceProviderProfile', () => {
  it('sends a JSON PATCH with the given fields', async () => {
    const updated = { ...SP, status: 'active' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(updated) } as Response)

    const result = await updateServiceProviderProfile(PROFILE)

    expect(result).toEqual({ data: updated, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/service-providers/me', {
      method: 'PATCH',
      body: JSON.stringify(PROFILE),
    })
  })

  it('returns a connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await updateServiceProviderProfile({ description: 'x' })
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('reapplyServiceProvider', () => {
  it('sends a multipart PATCH including the ID document', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SP) })
    vi.stubGlobal('fetch', fetchMock)

    const idDocument = new File(['data'], 'cedula2.jpg', { type: 'image/jpeg' })
    const result = await reapplyServiceProvider({ ...PROFILE, id_document: idDocument })

    expect(result).toEqual({ data: SP, error: null })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/api/v1/service-providers/me`)
    expect(init.method).toBe('PATCH')
    expect(init.credentials).toBe('include')
    expect(init.headers).toBeUndefined()

    const form = init.body as FormData
    expect(form.get('id_document')).toBe(idDocument)
    // Re-application does not re-send the terms checkbox — it was accepted at registration.
    expect(form.get('terms_accepted')).toBeNull()
  })

  it('returns the API error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'not rejected' }),
    }))
    const result = await reapplyServiceProvider({
      ...PROFILE, id_document: new File(['d'], 'c.jpg'),
    })
    expect(result).toEqual({ data: null, error: 'not rejected' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/api/__tests__/service-providers.test.ts
```

Expected: FAIL — `Failed to resolve import "../service-providers"`.

- [ ] **Step 3: Create the client module**

Create `lib/api/service-providers.ts`:

```ts
import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export type ServiceProviderStatus = 'pending' | 'active' | 'rejected'

/** Backend-validated enums — keep in sync with internal/serviceproviders/repository.go */
export const SERVICE_TYPES = ['transport', 'grooming', 'pet_sitting', 'dog_walking', 'pet_boarding', 'training'] as const
export const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'other'] as const

export interface ServiceProvider {
  id: string
  user_id: string
  description: string
  services: string[]
  pet_types: string[]
  experience: string
  address: string
  lat: number
  lng: number
  id_document_url?: string
  id_verified_at?: string
  terms_accepted: boolean
  status: ServiceProviderStatus
  rejection_reason?: string
  created_at: string
  updated_at: string
  /** Admin-list rows only — never present on /service-providers/me */
  applicant_name?: string
  applicant_email?: string
}

export interface ServiceProviderProfileFields {
  description: string
  experience: string
  address: string
  lat: number
  lng: number
  services: string[]
  pet_types: string[]
}

function profileFormData(fields: ServiceProviderProfileFields, idDocument: File): FormData {
  const form = new FormData()
  form.append('description', fields.description)
  form.append('experience', fields.experience)
  form.append('address', fields.address)
  form.append('lat', String(fields.lat))
  form.append('lng', String(fields.lng))
  fields.services.forEach((s) => form.append('services', s))
  fields.pet_types.forEach((p) => form.append('pet_types', p))
  form.append('id_document', idDocument)
  return form
}

// Uses raw fetch because multipart/form-data must not have Content-Type set manually
export async function registerServiceProvider(
  input: ServiceProviderProfileFields & { id_document: File }
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const form = profileFormData(input, input.id_document)
    form.append('terms_accepted', 'true')
    const res = await fetch(`${BASE_URL}/api/v1/service-providers`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al enviar la solicitud' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getMyServiceProvider(): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/service-providers/me')
    // Not registered yet is a valid state, not an error.
    if (res.status === 404) return { data: null, error: null }
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar tu perfil de servicios' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

/** Active-status partial update — JSON body, no ID document. */
export async function updateServiceProviderProfile(
  fields: Partial<ServiceProviderProfileFields>
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/service-providers/me', {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar tu perfil' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// Rejected-status re-application — multipart, ID document required. Uses raw fetch (see above).
export async function reapplyServiceProvider(
  input: ServiceProviderProfileFields & { id_document: File }
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/service-providers/me`, {
      method: 'PATCH',
      credentials: 'include',
      body: profileFormData(input, input.id_document),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al reenviar la solicitud' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/api/__tests__/service-providers.test.ts
```

Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/service-providers.ts lib/api/__tests__/service-providers.test.ts
git -C /home/noob_master/pelu/frontend commit -m "feat(api): service providers member client"
```

---

### Task F3: Admin-side API client

**Files:**
- Modify: `frontend/lib/api/admin.ts` (add one import at top, append a new section at end of file)
- Create: `frontend/lib/api/__tests__/admin-service-providers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/api/__tests__/admin-service-providers.test.ts` (a separate file — leaves any existing `admin.test.ts` untouched):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listServiceProviders,
  getServiceProviderIdDocument,
  approveServiceProvider,
  rejectServiceProvider,
} from '../admin'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

const ROW = {
  id: 'sp1',
  user_id: 'u1',
  status: 'pending',
  services: ['grooming'],
  applicant_name: 'Ana Pérez',
  applicant_email: 'ana@mail.com',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listServiceProviders', () => {
  it('defaults to the "all" status filter', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([ROW]) } as Response)
    const result = await listServiceProviders()
    expect(result).toEqual({ data: [ROW], error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers?status=all')
  })

  it('passes an explicit status through', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response)
    await listServiceProviders('pending')
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers?status=pending')
  })

  it('returns the API error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'forbidden' }),
    } as Response)
    const result = await listServiceProviders()
    expect(result).toEqual({ data: null, error: 'forbidden' })
  })
})

describe('getServiceProviderIdDocument', () => {
  it('returns the presigned url', async () => {
    mockApiClient.mockResolvedValue({
      ok: true, json: () => Promise.resolve({ url: 'https://s3/presigned' }),
    } as Response)
    const result = await getServiceProviderIdDocument('sp1')
    expect(result).toEqual({ data: { url: 'https://s3/presigned' }, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers/sp1/id-document')
  })

  it('returns a connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await getServiceProviderIdDocument('sp1')
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('approveServiceProvider', () => {
  it('sends action=approve, not status', async () => {
    const approved = { ...ROW, status: 'active' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(approved) } as Response)

    const result = await approveServiceProvider('sp1')

    expect(result).toEqual({ data: approved, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers/sp1/review', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    })
  })
})

describe('rejectServiceProvider', () => {
  it('sends action=reject with the reason', async () => {
    const rejected = { ...ROW, status: 'rejected' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rejected) } as Response)

    const result = await rejectServiceProvider('sp1', 'Documento ilegible')

    expect(result).toEqual({ data: rejected, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers/sp1/review', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject', reason: 'Documento ilegible' }),
    })
  })

  it('returns the API error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'reason required' }),
    } as Response)
    const result = await rejectServiceProvider('sp1', '')
    expect(result).toEqual({ data: null, error: 'reason required' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/api/__tests__/admin-service-providers.test.ts
```

Expected: FAIL — `does not provide an export named 'listServiceProviders'`.

- [ ] **Step 3: Extend `admin.ts`**

Add the import alongside the existing ones at the top of `lib/api/admin.ts`:

```ts
import { ServiceProvider, ServiceProviderStatus } from './service-providers'
```

Append this section at the end of the file:

```ts
// --- Service Providers ---
// Note: the review endpoint takes { action, reason } — NOT { status } like businesses.
// These wrappers hide that difference from callers.

export async function listServiceProviders(
  status: ServiceProviderStatus | 'all' = 'all'
): Promise<{ data: ServiceProvider[] | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/service-providers?status=${status}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar solicitudes de servicios' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getServiceProviderIdDocument(
  id: string
): Promise<{ data: { url: string } | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/service-providers/${id}/id-document`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al obtener el documento' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function approveServiceProvider(
  id: string
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/service-providers/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al aprobar proveedor' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function rejectServiceProvider(
  id: string,
  reason: string
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/service-providers/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject', reason }),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al rechazar proveedor' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/api/__tests__/admin-service-providers.test.ts
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/admin.ts lib/api/__tests__/admin-service-providers.test.ts
git -C /home/noob_master/pelu/frontend commit -m "feat(api): admin service-provider review client"
```

---

### Task F4: Translations (Spanish + English)

**Files:**
- Modify: `frontend/public/locales/es/business.json`
- Modify: `frontend/public/locales/en/business.json`

No new namespace and no `lib/i18n/index.ts` change — `business` is already registered.

- [ ] **Step 1: Add the Spanish strings**

In `public/locales/es/business.json`, add three keys to the **existing** `admin` object (keep the existing `filter_all`, `filter_businesses`, `filter_rescue_centers`, `type_business`, `type_rescue_center`):

```json
    "filter_service_providers": "Proveedores de Servicios",
    "type_service_provider": "Proveedor de Servicios",
    "view_id_document": "Ver documento de identidad"
```

The Title Case matches the existing neighbours in that object (`"Centro de Rescate"`, `"Centros de Rescate"`, `"Empresas"`).

Then add this new top-level `service_providers` block (sibling of `aliados`):

```json
  "service_providers": {
    "title": "Ofrecer mis servicios",
    "nav_entry": "Ofrecer mis servicios",
    "intro": "Regístrate como proveedor y aparece en el directorio de aliados de Pelú. Un administrador revisará tu solicitud.",
    "description_label": "Describe tus servicios",
    "description_placeholder": "Cuido y paseo perros en la zona de Naco...",
    "experience_label": "Tu experiencia",
    "experience_placeholder": "3 años cuidando mascotas de familiares y vecinos",
    "address_label": "Dirección donde ofreces el servicio",
    "address_placeholder": "Calle Erik Leonard Ekman, Santo Domingo",
    "address_not_found": "No encontramos esa dirección. Revísala e inténtalo de nuevo.",
    "services_label": "Servicios que ofreces",
    "pet_types_label": "Tipos de mascotas que atiendes",
    "id_document_label": "Documento de identidad",
    "id_document_hint": "Imagen de tu cédula (PNG, JPEG o WebP, máximo 5 MB). Solo la ve el administrador que revisa tu solicitud.",
    "id_document_selected": "Archivo seleccionado: {{name}}",
    "terms_label": "Acepto los términos y condiciones de proveedores de Pelú",
    "submit_register": "Enviar solicitud",
    "submit_edit": "Guardar cambios",
    "submit_reapply": "Reenviar solicitud",
    "submitting": "Enviando...",
    "submitted": "Solicitud enviada. Te avisaremos cuando sea revisada.",
    "saved": "Perfil actualizado",
    "save_error": "No pudimos guardar tu solicitud",
    "load_error": "No pudimos cargar tu perfil de servicios",
    "pending_title": "Solicitud en revisión",
    "pending_body": "Un administrador está revisando tu solicitud. Te notificaremos cuando haya una decisión.",
    "active_title": "Tu perfil de proveedor",
    "active_body": "Tu perfil está activo y visible en el directorio de aliados.",
    "rejected_title": "Solicitud rechazada",
    "rejected_reason": "Motivo:",
    "rejected_body": "Corrige lo indicado y vuelve a enviar tu solicitud con tu documento de identidad.",
    "services": {
      "transport": "Transporte",
      "grooming": "Peluquería",
      "pet_sitting": "Cuidado de mascotas",
      "dog_walking": "Paseo de perros",
      "pet_boarding": "Hospedaje",
      "training": "Entrenamiento"
    },
    "pet_types": {
      "dog": "Perro",
      "cat": "Gato",
      "bird": "Ave",
      "rabbit": "Conejo",
      "reptile": "Reptil",
      "other": "Otro"
    }
  }
```

- [ ] **Step 2: Add the English strings**

In `public/locales/en/business.json`, add to the existing `admin` object:

```json
    "filter_service_providers": "Service Providers",
    "type_service_provider": "Service Provider",
    "view_id_document": "View ID document"
```

And the matching top-level block:

```json
  "service_providers": {
    "title": "Offer my services",
    "nav_entry": "Offer my services",
    "intro": "Register as a provider and appear in Pelú's partner directory. An administrator will review your application.",
    "description_label": "Describe your services",
    "description_placeholder": "I care for and walk dogs in the Naco area...",
    "experience_label": "Your experience",
    "experience_placeholder": "3 years caring for family and neighbors' pets",
    "address_label": "Address where you offer the service",
    "address_placeholder": "Calle Erik Leonard Ekman, Santo Domingo",
    "address_not_found": "We couldn't find that address. Check it and try again.",
    "services_label": "Services you offer",
    "pet_types_label": "Pet types you care for",
    "id_document_label": "ID document",
    "id_document_hint": "A photo of your ID (PNG, JPEG or WebP, max 5 MB). Only the reviewing administrator sees it.",
    "id_document_selected": "Selected file: {{name}}",
    "terms_label": "I accept Pelú's provider terms and conditions",
    "submit_register": "Submit application",
    "submit_edit": "Save changes",
    "submit_reapply": "Resubmit application",
    "submitting": "Submitting...",
    "submitted": "Application sent. We'll let you know once it's reviewed.",
    "saved": "Profile updated",
    "save_error": "We couldn't save your application",
    "load_error": "We couldn't load your provider profile",
    "pending_title": "Application under review",
    "pending_body": "An administrator is reviewing your application. We'll notify you when there's a decision.",
    "active_title": "Your provider profile",
    "active_body": "Your profile is active and visible in the partner directory.",
    "rejected_title": "Application rejected",
    "rejected_reason": "Reason:",
    "rejected_body": "Fix the issues noted and resubmit your application with your ID document.",
    "services": {
      "transport": "Transport",
      "grooming": "Grooming",
      "pet_sitting": "Pet sitting",
      "dog_walking": "Dog walking",
      "pet_boarding": "Boarding",
      "training": "Training"
    },
    "pet_types": {
      "dog": "Dog",
      "cat": "Cat",
      "bird": "Bird",
      "rabbit": "Rabbit",
      "reptile": "Reptile",
      "other": "Other"
    }
  }
```

- [ ] **Step 3: Verify both files are valid JSON with matching key sets**

```bash
cd /home/noob_master/pelu/frontend && python3 -c "
import json
es = json.load(open('public/locales/es/business.json'))
en = json.load(open('public/locales/en/business.json'))
def keys(d, p=''):
    out = set()
    for k, v in d.items():
        out.add(p + k)
        if isinstance(v, dict): out |= keys(v, p + k + '.')
    return out
missing_en = keys(es) - keys(en)
missing_es = keys(en) - keys(es)
print('missing in en:', sorted(missing_en))
print('missing in es:', sorted(missing_es))
"
```

Expected: both lists empty — `missing in en: []` / `missing in es: []`.

- [ ] **Step 4: Commit**

```bash
git -C /home/noob_master/pelu/frontend add public/locales/es/business.json public/locales/en/business.json
git -C /home/noob_master/pelu/frontend commit -m "i18n(business): service provider onboarding and admin strings"
```

---

### Task F5: The service provider form (register / edit / reapply)

**Files:**
- Create: `frontend/components/service-providers/service-provider-form.tsx`
- Create: `frontend/components/__tests__/service-providers/service-provider-form.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/service-providers/service-provider-form.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { ServiceProviderForm } from '@/components/service-providers/service-provider-form'

vi.mock('@/lib/api/service-providers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/service-providers')>('@/lib/api/service-providers')
  return {
    ...actual,
    registerServiceProvider: vi.fn(),
    updateServiceProviderProfile: vi.fn(),
    reapplyServiceProvider: vi.fn(),
  }
})
vi.mock('@/lib/geocode', () => ({ geocodeAddress: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import {
  registerServiceProvider, updateServiceProviderProfile, ServiceProvider,
} from '@/lib/api/service-providers'
import { geocodeAddress } from '@/lib/geocode'

const mockRegister = vi.mocked(registerServiceProvider)
const mockUpdate = vi.mocked(updateServiceProviderProfile)
const mockGeocode = vi.mocked(geocodeAddress)

const ACTIVE_SP = {
  id: 'sp1', user_id: 'u1', description: 'Paseo perros', experience: '3 años',
  address: 'Calle 1', lat: 18.47, lng: -69.93, services: ['dog_walking'],
  pet_types: ['dog'], terms_accepted: true, status: 'active' as const,
  created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
} satisfies ServiceProvider

beforeEach(() => {
  vi.clearAllMocks()
  mockGeocode.mockResolvedValue({ lat: 18.47, lng: -69.93 })
})

function fillRegisterForm() {
  fireEvent.change(screen.getByLabelText('Describe tus servicios'), { target: { value: 'Paseo perros' } })
  fireEvent.change(screen.getByLabelText('Tu experiencia'), { target: { value: '3 años' } })
  fireEvent.change(screen.getByLabelText('Dirección donde ofreces el servicio'), { target: { value: 'Calle 1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Paseo de perros' }))
  fireEvent.click(screen.getByRole('button', { name: 'Perro' }))
  const file = new File(['data'], 'cedula.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByLabelText('Documento de identidad'), { target: { files: [file] } })
  fireEvent.click(screen.getByLabelText('Acepto los términos y condiciones de proveedores de Pelú'))
  return file
}

describe('ServiceProviderForm — register mode', () => {
  it('geocodes the address and submits multipart with the ID document', async () => {
    mockRegister.mockResolvedValue({ data: { ...ACTIVE_SP, status: 'pending' }, error: null })
    const onSaved = vi.fn()
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={onSaved} />)

    const file = fillRegisterForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    await waitFor(() => expect(mockRegister).toHaveBeenCalled())
    expect(mockGeocode).toHaveBeenCalledWith('Calle 1')
    expect(mockRegister).toHaveBeenCalledWith({
      description: 'Paseo perros',
      experience: '3 años',
      address: 'Calle 1',
      lat: 18.47,
      lng: -69.93,
      services: ['dog_walking'],
      pet_types: ['dog'],
      id_document: file,
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('shows an inline address error and does not submit when geocoding fails', async () => {
    mockGeocode.mockResolvedValue(null)
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    fillRegisterForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText('No encontramos esa dirección. Revísala e inténtalo de nuevo.')).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('keeps submit disabled until the ID document and terms are provided', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    const submit = screen.getByRole('button', { name: 'Enviar solicitud' })
    expect(submit).toBeDisabled()

    fillRegisterForm()
    expect(submit).not.toBeDisabled()
  })
})

describe('ServiceProviderForm — edit mode', () => {
  it('prefills from the provider and submits JSON without an ID document', async () => {
    mockUpdate.mockResolvedValue({ data: ACTIVE_SP, error: null })
    renderWithProviders(<ServiceProviderForm mode="edit" provider={ACTIVE_SP} onSaved={vi.fn()} />)

    expect(screen.getByLabelText('Describe tus servicios')).toHaveValue('Paseo perros')
    expect(screen.queryByLabelText('Documento de identidad')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({
      description: 'Paseo perros',
      experience: '3 años',
      address: 'Calle 1',
      lat: 18.47,
      lng: -69.93,
      services: ['dog_walking'],
      pet_types: ['dog'],
    }))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/service-providers/service-provider-form.test.tsx
```

Expected: FAIL — `Failed to resolve import "@/components/service-providers/service-provider-form"`.

- [ ] **Step 3: Create the form component**

Create `components/service-providers/service-provider-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { geocodeAddress } from '@/lib/geocode'
import {
  ServiceProvider,
  SERVICE_TYPES,
  PET_TYPES,
  registerServiceProvider,
  updateServiceProviderProfile,
  reapplyServiceProvider,
} from '@/lib/api/service-providers'

export type ServiceProviderFormMode = 'register' | 'edit' | 'reapply'

interface ServiceProviderFormProps {
  mode: ServiceProviderFormMode
  provider?: ServiceProvider
  onSaved: (provider: ServiceProvider) => void
}

export function ServiceProviderForm({ mode, provider, onSaved }: ServiceProviderFormProps) {
  const { t } = useTranslation('business')
  const [description, setDescription] = useState(provider?.description ?? '')
  const [experience, setExperience] = useState(provider?.experience ?? '')
  const [address, setAddress] = useState(provider?.address ?? '')
  const [services, setServices] = useState<string[]>(provider?.services ?? [])
  const [petTypes, setPetTypes] = useState<string[]>(provider?.pet_types ?? [])
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Only register/reapply carry the ID document; the JSON edit mode never does.
  const needsDocument = mode !== 'edit'
  // Terms are accepted once, at registration.
  const needsTerms = mode === 'register'

  const toggleValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const canSubmit =
    !!description.trim() &&
    !!experience.trim() &&
    !!address.trim() &&
    services.length > 0 &&
    petTypes.length > 0 &&
    (!needsDocument || !!idDocument) &&
    (!needsTerms || termsAccepted) &&
    !submitting

  const submitLabel =
    mode === 'register' ? t('service_providers.submit_register')
      : mode === 'edit' ? t('service_providers.submit_edit')
        : t('service_providers.submit_reapply')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setAddressError('')
    setSubmitting(true)

    const coords = await geocodeAddress(address)
    if (!coords) {
      setAddressError(t('service_providers.address_not_found'))
      setSubmitting(false)
      return
    }

    const fields = {
      description: description.trim(),
      experience: experience.trim(),
      address: address.trim(),
      lat: coords.lat,
      lng: coords.lng,
      services,
      pet_types: petTypes,
    }

    const result =
      mode === 'edit'
        ? await updateServiceProviderProfile(fields)
        : mode === 'register'
          ? await registerServiceProvider({ ...fields, id_document: idDocument! })
          : await reapplyServiceProvider({ ...fields, id_document: idDocument! })

    setSubmitting(false)

    if (result.error || !result.data) {
      toast.error(result.error || t('service_providers.save_error'))
      return
    }
    toast.success(mode === 'edit' ? t('service_providers.saved') : t('service_providers.submitted'))
    onSaved(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="sp-description" className="text-sm font-medium">
          {t('service_providers.description_label')}
        </label>
        <textarea
          id="sp-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('service_providers.description_placeholder')}
          rows={3}
          className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="sp-experience" className="text-sm font-medium">
          {t('service_providers.experience_label')}
        </label>
        <textarea
          id="sp-experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder={t('service_providers.experience_placeholder')}
          rows={2}
          className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="sp-address" className="text-sm font-medium">
          {t('service_providers.address_label')}
        </label>
        <input
          id="sp-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('service_providers.address_placeholder')}
          className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {addressError && <p className="text-xs text-destructive">{addressError}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t('service_providers.services_label')}</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_TYPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setServices((prev) => toggleValue(prev, s))}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                services.includes(s)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(`service_providers.services.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t('service_providers.pet_types_label')}</p>
        <div className="flex flex-wrap gap-2">
          {PET_TYPES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPetTypes((prev) => toggleValue(prev, p))}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                petTypes.includes(p)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(`service_providers.pet_types.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {needsDocument && (
        <div className="space-y-2">
          <label htmlFor="sp-id-document" className="text-sm font-medium">
            {t('service_providers.id_document_label')}
          </label>
          <input
            id="sp-id-document"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
            className="w-full px-3 py-2 border border-input rounded-xl text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
          />
          <p className="text-xs text-muted-foreground">{t('service_providers.id_document_hint')}</p>
          {idDocument && (
            <p className="text-xs text-muted-foreground">
              {t('service_providers.id_document_selected', { name: idDocument.name })}
            </p>
          )}
        </div>
      )}

      {needsTerms && (
        <div className="flex items-start gap-2">
          <input
            id="sp-terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="sp-terms" className="text-sm text-muted-foreground">
            {t('service_providers.terms_label')}
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {submitting ? (
          <>
            <FontAwesomeIcon icon={faSpinner} className="text-sm mr-2 animate-spin" />
            {t('service_providers.submitting')}
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/service-providers/service-provider-form.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/service-providers/ components/__tests__/service-providers/
git -C /home/noob_master/pelu/frontend commit -m "feat(service-providers): register/edit/reapply form"
```

---

### Task F6: The `/servicios` member page

**Files:**
- Create: `frontend/app/servicios/layout.tsx`
- Create: `frontend/app/servicios/page.tsx`
- Create: `frontend/components/__tests__/service-providers/servicios-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/service-providers/servicios-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import ServiciosPage from '@/app/servicios/page'

vi.mock('@/lib/api/service-providers', () => ({
  getMyServiceProvider: vi.fn(),
}))
vi.mock('@/components/pets/pets-header', () => ({
  PetsHeader: () => <div data-testid="pets-header" />,
}))
vi.mock('@/components/service-providers/service-provider-form', () => ({
  ServiceProviderForm: ({ mode }: { mode: string }) => <div data-testid="sp-form">{mode}</div>,
}))

import { getMyServiceProvider } from '@/lib/api/service-providers'
const mockGetMine = vi.mocked(getMyServiceProvider)

const BASE = {
  id: 'sp1', user_id: 'u1', description: 'd', experience: 'e', address: 'a',
  lat: 18, lng: -69, services: ['grooming'], pet_types: ['cat'],
  terms_accepted: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ServiciosPage', () => {
  it('shows the intro and register form when not registered (404)', async () => {
    mockGetMine.mockResolvedValue({ data: null, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('register')
    expect(screen.getByText(/Regístrate como proveedor/)).toBeInTheDocument()
  })

  it('shows a read-only status card when pending', async () => {
    mockGetMine.mockResolvedValue({ data: { ...BASE, status: 'pending' }, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByText('Solicitud en revisión')).toBeInTheDocument()
    expect(screen.queryByTestId('sp-form')).not.toBeInTheDocument()
  })

  it('shows the form in edit mode when active', async () => {
    mockGetMine.mockResolvedValue({ data: { ...BASE, status: 'active' }, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('edit')
    expect(screen.getByText('Tu perfil de proveedor')).toBeInTheDocument()
  })

  it('shows the rejection reason and the reapply form when rejected', async () => {
    mockGetMine.mockResolvedValue({
      data: { ...BASE, status: 'rejected', rejection_reason: 'Documento ilegible' }, error: null,
    })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('reapply')
    expect(screen.getByText('Documento ilegible')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/service-providers/servicios-page.test.tsx
```

Expected: FAIL — `Failed to resolve import "@/app/servicios/page"`.

- [ ] **Step 3: Create the route guard**

Create `app/servicios/layout.tsx`:

```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function ServiciosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['member']}>
      {children}
    </ProtectedRoute>
  )
}
```

- [ ] **Step 4: Create the page**

Create `app/servicios/page.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faHourglassHalf, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { ServiceProviderForm } from '@/components/service-providers/service-provider-form'
import { getMyServiceProvider, ServiceProvider } from '@/lib/api/service-providers'

export default function ServiciosPage() {
  const { t } = useTranslation('business')
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await getMyServiceProvider()
    setProvider(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t('service_providers.title')}</h1>

        {loading ? (
          <div className="flex justify-center py-24">
            <FontAwesomeIcon icon={faSpinner} className="text-3xl text-muted-foreground/40 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm py-8 text-center">{t('service_providers.load_error')}</p>
        ) : !provider ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">{t('service_providers.intro')}</p>
            <ServiceProviderForm mode="register" onSaved={setProvider} />
          </div>
        ) : provider.status === 'pending' ? (
          <div className="rounded-2xl border bg-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faHourglassHalf} className="text-lg text-yellow-500" />
              <h2 className="font-semibold">{t('service_providers.pending_title')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('service_providers.pending_body')}</p>
          </div>
        ) : provider.status === 'active' ? (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faCircleCheck} className="text-lg text-green-500" />
                <h2 className="font-semibold">{t('service_providers.active_title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t('service_providers.active_body')}</p>
            </div>
            <ServiceProviderForm mode="edit" provider={provider} onSaved={setProvider} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faCircleXmark} className="text-lg text-destructive" />
                <h2 className="font-semibold">{t('service_providers.rejected_title')}</h2>
              </div>
              {provider.rejection_reason && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
                  <span className="font-medium">{t('service_providers.rejected_reason')} </span>
                  <span>{provider.rejection_reason}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">{t('service_providers.rejected_body')}</p>
            </div>
            <ServiceProviderForm mode="reapply" provider={provider} onSaved={setProvider} />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/service-providers/servicios-page.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git -C /home/noob_master/pelu/frontend add app/servicios/ components/__tests__/service-providers/servicios-page.test.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(servicios): member service-provider self-service page"
```

---

### Task F7: Account sheet entry

**Files:**
- Modify: `frontend/components/pets/pets-header.tsx:13` (icon import), `:303-312` (insert after the `/mis-mascotas` link)

- [ ] **Step 1: Add the icon import**

In `components/pets/pets-header.tsx`, extend the Font Awesome import on line 13 with `faHandHoldingHeart`:

```tsx
import { faTableColumns, faArrowRightFromBracket, faPaw, faComments, faTruckFast, faKey, faCamera, faSpinner, faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 2: Add the sheet entry**

Insert this block immediately after the closing `)}` of the existing `/mis-mascotas` member link (right before the `member.publish_pet` button block):

```tsx
            {user?.role === 'member' && (
              <Link
                href="/servicios"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faHandHoldingHeart} className="text-lg text-muted-foreground" />
                {t('service_providers.nav_entry', { ns: 'business' })}
              </Link>
            )}
```

The `{ ns: 'business' }` override is required — this component's default namespace is `pets`.

- [ ] **Step 3: Verify the header still renders and type-checks**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets
cd /home/noob_master/pelu/frontend && npx tsc --noEmit 2>&1 | grep "pets-header" | head
```

Expected: pets tests PASS; no `tsc` output mentioning `pets-header`.

- [ ] **Step 4: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/pets/pets-header.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(header): add 'Ofrecer mis servicios' entry for members"
```

---

### Task F8: Admin review in the approvals tab

**Files:**
- Modify: `frontend/components/dashboard/admin/rescue-centers-tab.tsx` (imports, types, state, effect, unified list, handlers, filter pills, card body)
- Create: `frontend/components/__tests__/dashboard/rescue-centers-tab-service-providers.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/dashboard/rescue-centers-tab-service-providers.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { RescueCentersTab } from '@/components/dashboard/admin/rescue-centers-tab'

vi.mock('@/lib/api/admin', () => ({
  listAllRescueCenters: vi.fn(),
  listAllBusinesses: vi.fn(),
  listServiceProviders: vi.fn(),
  getServiceProviderIdDocument: vi.fn(),
  approveServiceProvider: vi.fn(),
  rejectServiceProvider: vi.fn(),
  approveRescueCenter: vi.fn(),
  rejectRescueCenter: vi.fn(),
  approveBusiness: vi.fn(),
  rejectBusiness: vi.fn(),
  deleteRescueCenter: vi.fn(),
}))

import * as adminApi from '@/lib/api/admin'

const SP = {
  id: 'sp1', user_id: 'u1', description: 'Paseo perros', experience: '3 años',
  address: 'Calle 1', lat: 18.47, lng: -69.93, services: ['dog_walking'],
  pet_types: ['dog'], terms_accepted: true, status: 'pending' as const,
  created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
  applicant_name: 'Ana Pérez', applicant_email: 'ana@mail.com',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminApi.listAllRescueCenters).mockResolvedValue({ data: [], error: null })
  vi.mocked(adminApi.listAllBusinesses).mockResolvedValue({ data: [], error: null })
  vi.mocked(adminApi.listServiceProviders).mockResolvedValue({ data: [SP], error: null })
})

describe('RescueCentersTab — service providers', () => {
  it('requests every status and labels the row with the applicant name', async () => {
    renderWithProviders(<RescueCentersTab />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(adminApi.listServiceProviders).toHaveBeenCalledWith('all')
    expect(screen.getByText('Proveedor de Servicios')).toBeInTheDocument()
    // Services render as the row subtitle
    expect(screen.getByText('Paseo de perros')).toBeInTheDocument()
  })

  it('falls back to the applicant email when no display name is set', async () => {
    vi.mocked(adminApi.listServiceProviders).mockResolvedValue({
      data: [{ ...SP, applicant_name: '' }], error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    // The email appears twice (row heading fallback + the email line), so query the heading.
    expect(await screen.findByRole('heading', { name: 'ana@mail.com' })).toBeInTheDocument()
  })

  it('opens the presigned ID document in a new tab', async () => {
    vi.mocked(adminApi.getServiceProviderIdDocument).mockResolvedValue({
      data: { url: 'https://s3/presigned' }, error: null,
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)

    renderWithProviders(<RescueCentersTab />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ver documento de identidad' }))

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://s3/presigned', '_blank'))
    expect(adminApi.getServiceProviderIdDocument).toHaveBeenCalledWith('sp1')
  })

  it('hides the ID-document button once the application is reviewed', async () => {
    // approveSP/rejectSP NULL out id_document_url, so the endpoint 404s for these.
    vi.mocked(adminApi.listServiceProviders).mockResolvedValue({
      data: [{ ...SP, status: 'active' }], error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver documento de identidad' })).not.toBeInTheDocument()
  })

  it('approves via the service-provider endpoint', async () => {
    vi.mocked(adminApi.approveServiceProvider).mockResolvedValue({
      data: { ...SP, status: 'active' }, error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(adminApi.approveServiceProvider).toHaveBeenCalledWith('sp1'))
    expect(adminApi.approveBusiness).not.toHaveBeenCalled()
  })

  it('rejects with a reason via the service-provider endpoint', async () => {
    vi.mocked(adminApi.rejectServiceProvider).mockResolvedValue({
      data: { ...SP, status: 'rejected' }, error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    fireEvent.change(screen.getByPlaceholderText('Razón del rechazo...'), {
      target: { value: 'Documento ilegible' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(adminApi.rejectServiceProvider).toHaveBeenCalledWith('sp1', 'Documento ilegible')
    )
  })
})
```

The literals above are the verified `es` values: `pets.admin.approve` = `"Aprobar"`, `pets.admin.reject` = `"Rechazar"`, `pets.admin.reject_placeholder` = `"Razón del rechazo..."`, `common.confirm` = `"Confirmar"`.

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/dashboard/rescue-centers-tab-service-providers.test.tsx
```

Expected: FAIL — no element with text `Ana Pérez` (the tab does not fetch service providers yet).

- [ ] **Step 3: Extend the imports and types**

In `components/dashboard/admin/rescue-centers-tab.tsx`, add to the imports (after the `Business` import on line 8):

```tsx
import { ServiceProvider } from '@/lib/api/service-providers'
```

Add `faIdCard` to the Font Awesome import on line 6:

```tsx
import { faTrash, faMapMarkerAlt, faPhone, faIdCard } from '@fortawesome/free-solid-svg-icons'
```

Replace the `TypeFilter` and `UnifiedItem` type declarations (lines 13–17):

```tsx
type StatusFilter = 'all' | 'pending' | 'active' | 'rejected'
type TypeFilter = 'all' | 'rescue_center' | 'business' | 'service_provider'

// The service-provider variant declares the display fields the card reads
// (name/rnc/phone/instagram) so the union stays uniformly accessible.
type UnifiedItem =
  | (RescueCenter & { _type: 'rescue_center' })
  | (Business & { _type: 'business' })
  | (ServiceProvider & {
      _type: 'service_provider'
      name: string
      rnc?: string
      phone?: string
      instagram?: string
    })
```

- [ ] **Step 4: Fetch service providers alongside the other two lists**

Add the state declaration after the `businesses` state (line 41):

```tsx
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([])
```

Replace the `useEffect` block (lines 55–65):

```tsx
  useEffect(() => {
    Promise.all([
      adminApi.listAllRescueCenters(),
      adminApi.listAllBusinesses(),
      adminApi.listServiceProviders('all'),
    ]).then(([rcResult, bizResult, spResult]) => {
      if (rcResult.error || !rcResult.data) { setError(rcResult.error || 'Error'); setLoading(false); return }
      setCenters(rcResult.data)
      if (bizResult.data) setBusinesses(bizResult.data)
      if (spResult.data) setServiceProviders(spResult.data)
      setLoading(false)
    })
  }, [])
```

Replace the `unified` list (lines 67–70):

```tsx
  const unified: UnifiedItem[] = [
    ...centers.map(c => ({ ...c, _type: 'rescue_center' as const })),
    ...businesses.map(b => ({ ...b, _type: 'business' as const })),
    ...serviceProviders.map(sp => ({
      ...sp,
      _type: 'service_provider' as const,
      name: sp.applicant_name || sp.applicant_email || sp.user_id,
    })),
  ]
```

- [ ] **Step 5: Dispatch approve/reject by type**

Replace `handleApprove` (lines 78–88):

```tsx
  const handleApprove = async (item: UnifiedItem) => {
    if (item._type === 'service_provider') {
      const { data, error: err } = await adminApi.approveServiceProvider(item.id)
      if (err || !data) return
      // Merge, don't replace: the /review response omits applicant_name/applicant_email.
      setServiceProviders(prev => prev.map(sp => sp.id === item.id ? { ...sp, ...data } : sp))
    } else if (item._type === 'business') {
      const { data, error: err } = await adminApi.approveBusiness(item.id)
      if (err || !data) return
      setBusinesses(prev => prev.map(b => b.id === item.id ? data : b))
    } else {
      const { data, error: err } = await adminApi.approveRescueCenter(item.id)
      if (err || !data) return
      setCenters(prev => prev.map(c => c.id === item.id ? data : c))
    }
  }
```

Replace `handleReject` (lines 90–103):

```tsx
  const handleReject = async (item: UnifiedItem) => {
    if (!rejectReason.trim()) return
    if (item._type === 'service_provider') {
      const { data, error: err } = await adminApi.rejectServiceProvider(item.id, rejectReason.trim())
      if (err || !data) return
      // Merge, don't replace — see handleApprove.
      setServiceProviders(prev => prev.map(sp => sp.id === item.id ? { ...sp, ...data } : sp))
    } else if (item._type === 'business') {
      const { data, error: err } = await adminApi.rejectBusiness(item.id, rejectReason.trim())
      if (err || !data) return
      setBusinesses(prev => prev.map(b => b.id === item.id ? data : b))
    } else {
      const { data, error: err } = await adminApi.rejectRescueCenter(item.id, rejectReason.trim())
      if (err || !data) return
      setCenters(prev => prev.map(c => c.id === item.id ? data : c))
    }
    setRejectingId(null)
    setRejectReason('')
  }
```

**Why the service-provider branches merge instead of replace** (verified against the backend, not assumed): `AdminReview` returns whatever `approveSP`/`rejectSP` produce, and both go through `scanSP`, which never populates `ApplicantName`/`ApplicantEmail`. Those are `*string` with `omitempty`, so the keys are *entirely absent* from the review response. Replacing the row wholesale therefore wipes them, and the heading (`applicant_name || applicant_email || user_id`) degrades to a raw UUID the instant an admin approves someone. Spreading `data` last is safe both ways: returned fields win, absent keys cannot overwrite. The rescue-center and business branches keep replacing — their responses are full rows with no list-only fields.

Add the ID-document handler immediately after `handleReject`:

```tsx
  // The endpoint returns a short-lived presigned S3 URL — open it, never store it.
  const handleViewIdDocument = async (id: string) => {
    const { data } = await adminApi.getServiceProviderIdDocument(id)
    if (data?.url) window.open(data.url, '_blank')
  }
```

- [ ] **Step 6: Add the type filter pill**

Replace the type-filter pill block (lines 129–142) so the third type is included and labeled:

```tsx
        {(['all', 'rescue_center', 'business', 'service_provider'] as TypeFilter[]).map((type) => {
          const labelKey =
            type === 'all' ? 'admin.filter_all'
              : type === 'rescue_center' ? 'admin.filter_rescue_centers'
                : type === 'business' ? 'admin.filter_businesses'
                  : 'admin.filter_service_providers'
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                typeFilter === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(labelKey, { ns: 'business' })}
            </button>
          )
        })}
```

- [ ] **Step 7: Render the service-provider card variant**

Inside the `filtered.map((item) => {` callback, replace the three `const` lines (168–170) with:

```tsx
            const city = item._type === 'rescue_center' ? (item as RescueCenter).city : undefined
            const website = item._type === 'rescue_center' ? (item as RescueCenter).website : undefined
            const rejectReason_ = item._type === 'rescue_center'
              ? (item as RescueCenter).reject_reason
              : item._type === 'service_provider'
                ? (item as ServiceProvider).rejection_reason
                : undefined
            // Service providers have no RNC — show the services they offer instead.
            const subtitle = item._type === 'service_provider'
              ? (item as ServiceProvider).services.map(s => t(`service_providers.services.${s}`, { ns: 'business' })).join(', ')
              : (item.rnc || '')
            const typeLabelKey = item._type === 'rescue_center'
              ? 'admin.type_rescue_center'
              : item._type === 'business'
                ? 'admin.type_business'
                : 'admin.type_service_provider'
            const typeBadgeClass = item._type === 'rescue_center'
              ? 'bg-blue-500/20 text-blue-500'
              : item._type === 'business'
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-purple-500/20 text-purple-500'
```

Replace the subtitle line (177) and the type badge (178–184) with:

```tsx
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded-xl font-medium ${typeBadgeClass}`}>
                      {t(typeLabelKey, { ns: 'business' })}
                    </span>
```

In the details block, guard the phone row so service providers (which have no phone) don't render an empty line — replace lines 197–200:

```tsx
                  {item.phone && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faPhone} className="text-sm" />
                      <span>{item.phone}</span>
                    </div>
                  )}
                  {item._type === 'service_provider' && (
                    <p className="text-xs">{(item as ServiceProvider).applicant_email}</p>
                  )}
```

Finally, add the ID-document button inside the actions row — insert it immediately before the existing rescue-center delete button (line 259):

```tsx
                    {item._type === 'service_provider' && item.status === 'pending' && (
                      <button
                        onClick={() => handleViewIdDocument(item.id)}
                        className="flex-1 py-1.5 px-3 border border-input rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <FontAwesomeIcon icon={faIdCard} className="text-sm mr-1.5" />
                        {t('admin.view_id_document', { ns: 'business' })}
                      </button>
                    )}
```

**Why the `status === 'pending'` gate** (verified against the backend, not assumed): `approveSP` and `rejectSP` in `api/internal/serviceproviders/repository.go` both set `id_document_url = NULL` — the ID document is deleted from S3 on either decision. `AdminGetIDDocument` then returns **404 `"no ID document on file"`**. Without the gate, an admin clicking the button on an already-reviewed provider gets silence, because `handleViewIdDocument` only acts `if (data?.url)`. Only pending applications have a retrievable document, so only they get the button.

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/dashboard/rescue-centers-tab-service-providers.test.tsx
```

Expected: PASS — 5 tests.

- [ ] **Step 9: Run the full suite and type-check**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run
cd /home/noob_master/pelu/frontend && npx tsc --noEmit
```

Expected: all tests PASS except the two known pre-existing failures — `design-system.test.ts` (inline styles in the untouched `transition-overlay.tsx`) and the flaky `about-scenes` smoke test, which passes when run alone. `tsc` reports only the two pre-existing transitions-test errors. If anything else fails, fix it before committing.

- [ ] **Step 10: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/dashboard/admin/rescue-centers-tab.tsx components/__tests__/dashboard/rescue-centers-tab-service-providers.test.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(admin): review service-provider applications in the approvals tab"
```

- [ ] **Step 11: Report back to the orchestrator**

Report: endpoints wired (all six), files changed (`git -C /home/noob_master/pelu/frontend diff --stat main..feature/service-providers-wiring`), and the `npx vitest run` summary line.

---

# Orchestrator verification gate

Do not call this done on subagent self-reports. Run these checks independently.

- [ ] **1. The backend contract is real, not assumed**

```bash
cd /home/noob_master/pelu/api && make swagger && git -C /home/noob_master/pelu/api status --short docs/
grep -c "applicant_name" /home/noob_master/pelu/api/docs/api/swagger.yaml
```

Expected: `make swagger` produces **no** new diff (the committed spec is already current), and the grep count is ≥ 1. A dirty `docs/` after regeneration means the committed contract was stale.

- [ ] **2. Both test suites pass**

```bash
cd /home/noob_master/pelu/api && DATABASE_URL="postgres://pelu:password@localhost:5432/pelu_test?sslmode=disable" go test ./internal/serviceproviders/
cd /home/noob_master/pelu/frontend && npx vitest run
```

Expected: backend `ok`; frontend green apart from the two known pre-existing failures named in Task F8 Step 9.

- [ ] **3. The frontend consumes the real endpoints**

```bash
grep -rn "api/v1/service-providers\|api/v1/admin/service-providers" /home/noob_master/pelu/frontend/lib/api/
```

Expected: all six endpoints present — `POST /service-providers`, `GET|PATCH /service-providers/me`, `GET /admin/service-providers`, `GET /admin/service-providers/{id}/id-document`, `PATCH /admin/service-providers/{id}/review`.

- [ ] **4. The admin UI actually renders the applicant fields**

```bash
grep -n "applicant_name\|applicant_email" /home/noob_master/pelu/frontend/components/dashboard/admin/rescue-centers-tab.tsx
```

Expected: at least two hits (row label fallback chain + the email line).

- [ ] **5. Manual smoke test against the running stack** (API on :2701, frontend on :3000)

- As a `member`, open `/servicios` → the register form appears; submit with an ID image → the page flips to "Solicitud en revisión".
- As an `admin`, open the dashboard approvals tab → the application appears labeled with the member's name/email under the "Proveedores" filter; "Ver documento de identidad" opens the image in a new tab; approve → status flips to active.
- Back as the member, reload `/servicios` → the edit form appears; change the description and save → toast "Perfil actualizado".

- [ ] **6. Nothing was staged into the parent repo**

```bash
git -C /home/noob_master status --short | grep pelu/ || echo "clean"
```

Expected: `clean`.
