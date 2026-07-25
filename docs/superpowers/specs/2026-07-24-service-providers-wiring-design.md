# Spec: Service Providers Wiring (Onboarding + Self-Service + Admin Review)

**Date:** 2026-07-24
**Status:** Approved — ready for implementation plan
**Repos:** **two** — `frontend` (pel-) for the UI + client, `api` (pelu-api) for one small backend change
**Contract source of truth:** `api/docs/api/swagger.yaml` (live Scalar UI at `http://localhost:2701/docs`)
**Parent inventory:** [`2026-07-21-frontend-api-wiring-gaps.md`](./2026-07-21-frontend-api-wiring-gaps.md) — Cluster 1 (P1)

## Context

The P1 "Service Providers" cluster: the largest gap, and the only **net-new subsystem**. The
public provider directory (`GET /providers`, `/aliados`) is already wired, but **neither the
member onboarding side nor the admin-review side exists** in the frontend. They pair up —
without onboarding there are no applications for admins to review — so both halves ship in
this one spec.

### Role model (verified — overturns a parent-spec assumption)

Service provider is **not a separate role**. The member router uses `RequireRole("member")`
(`internal/serviceproviders/router.go`), so **a `member` registers as a service provider and
keeps the `member` role**. Consequences:
- **No role-based `ServiceProviderGuard`.** The self-service page is `member`-protected and
  branches on `GET /service-providers/me` (record + status vs. 404).
- Registration is **multipart** (ID-document upload). `PATCH /me` is **dual-mode** (JSON when
  `active`, multipart re-application when `rejected`).

### This spec spans two repos

All UI + client work is in `frontend`. **One** small change is in `api`: the admin
application list returns only `user_id` today, with no applicant name/email to label rows.
See **Backend change** below and the **Execution / Orchestration** section — the two repos are
implemented by **two separate subagents that each report back to the orchestrator**, precisely
so a backend change and its frontend consumer don't drift apart (the very way these gaps
appeared).

### Freshness check (2026-07-24)

All six endpoints have **zero** frontend references. `lib/api/service-providers.ts` does not
exist; `admin.ts` has no `service` functions.

## Conventions to follow (project CLAUDE.md)

- **API client**: `{ data, error }`, never throw. `apiClient()` for auth'd JSON; **raw `fetch`
  with `credentials: 'include'` and no `Content-Type`** for multipart.
- **Icons**: Font Awesome, `text-*` sizing. **Radius**: cards `rounded-2xl`, buttons/inputs
  `rounded-xl`. **Toasts**: Sonner.
- **i18n**: Spanish-first; every string in both locales, registered in `lib/i18n/index.ts`.

---

## Backend contracts (all exist except the one change noted)

**Member (role `member`, MFA-compliant):**

| Method | Path | Contract |
|---|---|---|
| POST | `/service-providers` | **Multipart.** Fields: `description`, `experience`, `address`, `lat`, `lng`, `terms_accepted` (must be `"true"`), `services[]` (≥1), `pet_types[]` (≥1), `id_document` (file ≤5 MB, PNG/JPEG/WebP). → `201 ServiceProvider` (`status: pending`). Notifies admins. |
| GET | `/service-providers/me` | The caller's record (any status), or **404** if not registered. |
| PATCH | `/service-providers/me` | **active** → JSON partial update `{description, services[], pet_types[], experience, address, lat, lng}`. **rejected** → **multipart** re-application (must resend `id_document`; optional field overrides) → back to `pending`. **pending** → `400`. |

**Admin (`RequireAdminWithMFA`):**

| Method | Path | Contract |
|---|---|---|
| GET | `/admin/service-providers?status=` | Filter `pending`\|`active`\|`rejected`\|`all`. **Default `pending`** — pass `all` to get everything. → `ServiceProvider[]`. |
| GET | `/admin/service-providers/{id}/id-document` | → `{ url }` — time-limited presigned S3 URL for the applicant's ID document. |
| PATCH | `/admin/service-providers/{id}/review` | Body **`{ action: "approve" \| "reject", reason? }`** (`reason` required for reject). **Note: `action`, NOT `status`** (differs from the business review). **Deletes the ID document from S3 on either decision.** Fires a `service_provider_reviewed` WS event (or in-app notification if offline). |

**Enums (backend-validated — reuse verbatim):**
- `services` (≥1): `transport`, `grooming`, `pet_sitting`, `dog_walking`, `pet_boarding`, `training`.
- `pet_types` (≥1): `dog`, `cat`, `bird`, `rabbit`, `reptile`, `other`.

**`ServiceProvider` shape:** `id, user_id, description, services[], pet_types[], experience,
address, lat, lng, id_document_url?, id_verified_at?, rejection_reason?, status,
terms_accepted, created_at, updated_at`.

### Backend change required (api repo) — applicant identity on the admin list

`GET /admin/service-providers` currently returns raw `ServiceProvider[]` — only `user_id`, so
the admin UI has nothing human-readable to label a row. Add the applicant's name + email:

- In `listSPs` (`internal/serviceproviders/repository.go`), `LEFT JOIN users u ON u.id = sp.user_id`
  and select `u.display_name` and `u.email`.
- Surface them on the admin-list response as **`applicant_name`** (`users.display_name`, NULL →
  fall back to `email`) and **`applicant_email`** (`users.email`). Prefer a dedicated admin-list
  struct (e.g. `AdminServiceProviderListItem` = the SP fields + the two applicant fields) so the
  base `ServiceProvider` returned by `GetMine` is unchanged; `omitempty` fields on `ServiceProvider`
  are an acceptable alternative. **Only** `AdminList` populates them.
- Update the `@Success` annotation, run `make swagger`, and commit the `swagger.yaml` diff.
- Cover with a backend test asserting the two fields are populated for the admin list.

**Agreed JSON field names (the contract both subagents code to): `applicant_name`, `applicant_email`.**

---

## Piece A — Member API · new `lib/api/service-providers.ts`

- Types: `ServiceProviderStatus = 'pending' | 'active' | 'rejected'`; `ServiceProvider`
  (fields above) with optional `applicant_name?` / `applicant_email?` (present only on admin
  list rows). Exported `SERVICE_TYPES` and `PET_TYPES` const arrays (the six each) for the
  multi-selects + i18n label lookup.
- `registerServiceProvider(input)` — **multipart** raw `fetch` `POST /api/v1/service-providers`
  (`credentials:'include'`, no `Content-Type`); `FormData` with all fields, repeated `services`
  / `pet_types` appends, `terms_accepted='true'`, `id_document`. → `{ data: ServiceProvider, error }` (201).
- `getMyServiceProvider()` — `apiClient('/api/v1/service-providers/me')`; **404 →
  `{ data: null, error: null }`** (not-registered is a valid state, mirror `getProvider`).
- `updateServiceProviderProfile(fields)` — **JSON** `apiClient(..., { method:'PATCH', body })`
  (active-mode partial update).
- `reapplyServiceProvider(input)` — **multipart** `PATCH /me` (rejected-mode; `id_document`
  required) via raw `fetch`.

## Piece B — Member self-service · new `app/servicios/` (member-only)

- `layout.tsx` → `<ProtectedRoute requireRole={['member']}>` (mirror `app/chat/layout.tsx`).
- `page.tsx` renders the shared header + `getMyServiceProvider()` and **branches on status**:
  - **null (404)** → intro copy + the onboarding form in `register` mode.
  - **pending** → "Solicitud en revisión" status card (read-only).
  - **active** → editable profile via the form in `edit` mode (JSON update); note it's live on `/aliados`.
  - **rejected** → show `rejection_reason` + the form in `reapply` mode (multipart, id_document required).
- **Entry point**: a **"Ofrecer mis servicios"** item in the member section of the account
  Sheet (`components/pets/pets-header.tsx`) → `/servicios` (mirror the `/mis-mascotas` entry
  from the small-wins spec). Optional secondary CTA on `/aliados`.
- **Optional real-time**: a `service_provider_reviewed` WS listener (mirror `RCApprovalListener`)
  to live-refresh the `/servicios` status. Nice-to-have — not required for v1.

### Onboarding form · `components/service-providers/service-provider-form.tsx`

Single page, `mode: 'register' | 'edit' | 'reapply'`:
- Fields: `description` + `experience` (textareas); **services** multi-select (6) + **pet_types**
  multi-select (6) with i18n labels; `address` input → **geocode to `lat`/`lng`** on submit;
  `id_document` upload (image ≤5 MB, png/jpeg/webp); `terms_accepted` checkbox.
- `register` / `reapply` submit **multipart** (`id_document` + `terms` required); `edit`
  submits **JSON** (no `id_document` / `terms`).
- **Geocoding**: reuse the Nominatim `geocodeAddress` helper currently inlined in
  `components/transport/transport-creation-form.tsx` — **extract it to a shared util**
  (`lib/geocode.ts`) so transport and this form share one implementation.

## Piece C — Admin review · extend `lib/api/admin.ts` + `rescue-centers-tab.tsx`

- **API** (extend `admin.ts`): `listServiceProviders(status?: 'pending'|'active'|'rejected'|'all')`
  → `GET /api/v1/admin/service-providers?status=` (call with `'all'` from the tab);
  `getServiceProviderIdDocument(id)` → `{ url }`; `approveServiceProvider(id)` /
  `rejectServiceProvider(id, reason)` → `PATCH .../review` with the **`{ action, reason }`** body
  (the wrapper hides the `action`-vs-`status` difference from the business helpers).
- **UI** (extend the existing combined approvals tab `components/dashboard/admin/rescue-centers-tab.tsx`):
  - Add `'service_provider'` as a third `_type` alongside `rescue_center` / `business`: fetch
    `listServiceProviders('all')`, merge into the unified list, add it to the type filter, and
    reuse the existing status filter + reject-reason box + `_type`-branched approve/reject dispatch.
  - **Row label** uses `applicant_name` / `applicant_email` (from the backend change) with the
    services list as a subtitle.
  - **SP-only affordance**: a **"Ver documento de identidad"** button → `getServiceProviderIdDocument(id)`
    → open the presigned `url` in a new tab. Gated to `_type === 'service_provider'` (RCs/businesses
    have no ID document).

## Cross-cutting

- **i18n** (both locales, registered in `lib/i18n/index.ts`): the 12 service/pet-type labels,
  onboarding-form fields, member status states (pending/active/rejected), admin SP labels,
  "Ver documento de identidad", re-application copy, terms text. Namespace: reuse `business`
  (or add a `providers` namespace — pick one and be consistent).
- **Testing** (Vitest + RTL frontend; `go test` backend):
  - Frontend API units: multipart `registerServiceProvider`, `getMyServiceProvider` 404-handling,
    JSON `updateServiceProviderProfile` vs multipart `reapplyServiceProvider`, admin
    list/review/id-document.
  - Frontend components: form validation + multipart submit (register), `/servicios` status
    branching, admin tab SP type (row label from `applicant_*`, ID-doc button, approve/reject).
  - Backend: `listSPs` returns `applicant_name`/`applicant_email` for the admin list.

---

## Execution / Orchestration (required)

This work spans two repos, and these gaps exist **because a backend endpoint shipped without
its frontend wiring**. To avoid repeating that, the implementation plan MUST be executed by
**two dedicated subagents, each reporting back to the orchestrating session** — not one agent
straddling both repos:

- **Backend subagent** — works **only in `api/`**. Scope: the applicant name/email change
  (`listSPs` JOIN + admin-list response struct + swagger annotation), `make swagger`, backend
  test, commit on a branch inside `api/`. **Reports back**: the exact JSON shape shipped
  (`applicant_name`, `applicant_email`), the `swagger.yaml` diff, and `go test` result.
- **Frontend subagent** — works **only in `frontend/`**. Scope: Pieces A/B/C, consuming the
  agreed `applicant_name`/`applicant_email`. Commit on a branch inside `frontend/`. **Reports
  back**: endpoints wired, files changed, `npx vitest run` result.

**Rules the orchestrator enforces:**
1. **Contract handshake first** — both subagents code to the fixed field names
   `applicant_name` / `applicant_email` agreed here, so neither guesses.
2. **Verify the contract is real, not assumed** — after the backend subagent reports, the
   orchestrator confirms the committed `swagger.yaml` actually contains the new fields (run
   `make swagger` and diff) before accepting that the frontend can consume them. (Same
   freshness discipline the parent inventory flagged.)
3. **Verification gate before "done"** — the orchestrator independently checks each subagent's
   report: backend field present in the contract; frontend admin tab actually renders
   `applicant_name`/`applicant_email` and the SP flows call the real endpoints; **both repos'
   test suites pass**. A subagent's self-report is not sufficient on its own.
4. **Git etiquette** — each subagent commits **inside its own child repo** on its own branch;
   never stage anything under `pelu/` into the parent `/home/noob_master` repo.

## Out of scope

- Public `/aliados` discovery (`GET /providers`, `/providers/{id}`) — already wired.
- Changing the role model (SP stays a `member` capability).
- Any backend change beyond the applicant name/email on the admin list.
- The P2 (transport) and P3/P4 (small-wins) clusters — their own specs.

## Open questions

1. Geocoding fallback if the address doesn't resolve — inline error + retry (like transport),
   vs. a map picker. Lean inline-error for v1.
2. i18n namespace: reuse `business` vs. a new `providers` namespace.
3. Whether `edit`-mode (active) should allow editing everything the register form shows, or a
   reduced subset (the JSON `PATCH /me` accepts the full field set, so full-edit is fine).

## Implementation checklist (by subagent)

**Backend subagent (`api/`):**
- [ ] `listSPs` JOIN users; admin-list response carries `applicant_name` + `applicant_email`.
- [ ] Update swagger annotation + `make swagger`; commit the `swagger.yaml` diff.
- [ ] Backend test for the two new admin-list fields; `go test ./internal/serviceproviders/...` green.

**Frontend subagent (`frontend/`):**
- [ ] `lib/api/service-providers.ts` (register/getMine/update/reapply + types + enums).
- [ ] `lib/geocode.ts` extraction; transport switched to it.
- [ ] `app/servicios/{layout,page}.tsx` + status-branching; account-Sheet "Ofrecer mis servicios" entry.
- [ ] `components/service-providers/service-provider-form.tsx` (register/edit/reapply modes).
- [ ] `admin.ts`: `listServiceProviders` / `getServiceProviderIdDocument` / approve+reject.
- [ ] `rescue-centers-tab.tsx`: third `_type`, `applicant_*` labels, ID-doc button, approve/reject.
- [ ] i18n (es + en) for all new strings; `npx vitest run` green.

**Orchestrator:**
- [ ] Contract handshake; verify committed `swagger.yaml` has `applicant_name`/`applicant_email`.
- [ ] Verification gate: FE renders applicant fields + calls real endpoints; both test suites pass.
