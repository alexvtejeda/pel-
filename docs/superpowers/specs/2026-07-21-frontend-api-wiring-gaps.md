# Spec: Frontend API Wiring Gaps

**Date:** 2026-07-21
**Status:** ✅ Done (2026-07-30) — all five clusters wired. Only the optional per-method
coverage pass remains; see the closeout note below.
**Repos:** `frontend` (pel-) wires against `api` (pelu-api)
**Contract source of truth:** `api/docs/api/swagger.yaml` (or the live Scalar UI at `http://localhost:2701/docs`)

## Context

An endpoint-coverage diff of the backend OpenAPI spec (99 endpoints / 80 paths) against
the frontend's `/api/v1/...` references found **66/80 paths wired, 14 not referenced**.
Two of the 14 are correctly backend-only (`GET /auth/google/callback` — OAuth redirect
target; `POST /webhooks/github` — GitHub webhook), leaving **12 endpoints across 6
feature clusters that the frontend never calls.** This spec captures them so we can wire
them up.

> **Scope caveat:** the diff is **path-level**, not per-method — a path counted as "wired"
> could still be missing a specific method (e.g. a `DELETE` the UI never calls). This spec
> only covers paths with *zero* frontend references. A follow-up per-method pass is worth
> doing separately.
>
> **Freshness caveat:** the inventory came from the committed `swagger.yaml` (a generated
> artifact). Run `make swagger` in `api/` first to confirm it matches the live Go routes.

## Conventions to follow (from project CLAUDE.md)

- **API client**: new functions return `{ data, error }`, never throw (note: `lib/api/pets.ts`
  is the one existing exception — don't copy that pattern).
- **Auth**: cookie-based — use `apiClient()` / `credentials: 'include'`. No tokens.
- **Multipart uploads** (avatar/photo endpoints below): raw `fetch` with `credentials: 'include'`,
  **do not set `Content-Type`** (browser sets the boundary).
- **i18n**: Spanish-first; add any new UI strings to both `public/locales/es` and `.../en`.
- **Icons**: Font Awesome only. **Radius**: cards `rounded-2xl`, buttons `rounded-xl`.

---

## Cluster 1 — Service Providers (end-to-end) · **Priority: P1**

The public provider directory is wired (`GET /providers`, `GET /providers/{id}` via
`lib/api/providers.ts`), but **neither the onboarding side nor the admin-review side exists**.
These pair up: without onboarding there are no applications for admin to review.

### 1a. Onboarding / self-service — *new* `lib/api/service-providers.ts`
| Method | Path | Summary |
|---|---|---|
| POST | `/service-providers` | Register as service provider |
| GET | `/service-providers/me` | Get my service provider profile |
| PATCH | `/service-providers/me` | Update service provider profile |

- **UI**: a "become a service provider" onboarding form + a self-service profile page
  (mirror the `businesses/me` and `rescue-centers/me` dashboards, which already exist).
- Likely needs a `ServiceProviderGuard` (mirror `BusinessGuard` / `RescueCenterGuard`).

### 1b. Admin review — extend `lib/api/admin.ts`
| Method | Path | Summary |
|---|---|---|
| GET | `/admin/service-providers` | List service provider applications (admin) |
| GET | `/admin/service-providers/{id}/id-document` | Presign service provider ID document (admin) |
| PATCH | `/admin/service-providers/{id}/review` | Review service provider application (admin) |

- **UI**: admin dashboard section under `components/dashboard/admin/`, mirroring the existing
  **business** and **rescue-center** review flows (list → detail → approve/reject).
- The `id-document` endpoint returns a presigned URL — render as a "view submitted ID" link.
- Gated by `AdminGuard` (lives in `components/dashboard/admin/`).

---

## Cluster 2 — Transport gaps · **Priority: P2**

`lib/api/transport.ts` wires request/accept/cancel/status/stops, but three endpoints are unused.
| Method | Path | Summary |
|---|---|---|
| POST | `/transport/quote` | Preview a pet-taxi quote |
| GET | `/transport/businesses` | List pet-taxi businesses |
| PATCH | `/transport/{id}/decline` | Decline a targeted pet-taxi trip |

- **`/transport/quote`**: show an estimated price *before* the user submits a trip request
  (backend already has quote config: `QUOTE_DEFAULT_*` env vars). Wire into the request flow
  in `app/transporte`.
- **`/transport/businesses`**: a directory / picker of pet-taxi businesses.
- **`/transport/{id}/decline`**: transporter-side — the dashboard has accept/cancel but no
  **decline** for a *targeted* trip offer. Add the action button.

---

## Cluster 3 — User avatar / profile photo · **Priority: P3**

`PATCH /auth/profile` (edit profile) is wired, but photo upload is not. Extend `lib/api/auth.ts`.
| Method | Path | Summary |
|---|---|---|
| POST | `/auth/avatar` | Upload avatar |
| DELETE | `/auth/avatar` | Delete avatar |
| POST | `/auth/profile/photo` | Upload profile photo |

- **Open question:** there are **two** upload endpoints (`/auth/avatar` and `/auth/profile/photo`).
  Confirm with the backend which is canonical — one may be legacy. Wire the current one only.
- Use the **multipart upload** convention above.
- **UI**: an avatar upload/remove control on the profile/settings page.

---

## Cluster 4 — User-pets edit/delete · **Priority: P3**

`lib/api/user-pets.ts` wires list/create (`GET,POST /user-pets`) and photo upload
(`/user-pets/{id}/photos`), but not editing/removing the pet itself.
| Method | Path | Summary |
|---|---|---|
| PATCH | `/user-pets/{id}` | Update user pet |
| DELETE | `/user-pets/{id}` | Delete user pet |

- **UI**: edit + delete (with confirm) actions on the user's pet cards.

---

## Cluster 5 — Form-scoped submissions list · **Priority: P4 (verify first)**

| Method | Path | Summary |
|---|---|---|
| GET | `/forms/{id}/submissions` | List submissions for a form (rescue center) |

- The generic `GET /submissions` list **is** wired (`lib/api/submissions.ts`). This per-form
  scoped list may be redundant — confirm whether the rescue-center dashboard needs to filter
  submissions *by form* before building anything.

---

## Explicitly out of scope (backend-only — do NOT wire)

| Method | Path | Why |
|---|---|---|
| GET | `/auth/google/callback` | Google redirects the browser here; not a `fetch` target |
| POST | `/webhooks/github` | Server-to-server GitHub webhook |

---

## Tomorrow's checklist

- [x] Regenerate `make swagger` in `api/`; confirm the 14-gap list still holds.
- [x] **P1** Service providers — onboarding client + UI (`service-providers.ts`, guard, forms).
- [x] **P1** Service providers — admin review client + UI (extend `admin.ts` + admin dashboard).
- [x] **P2** Transport — quote preview, businesses directory, decline action.
- [x] **P3** Avatar upload (resolve the two-endpoint question first).
- [x] **P3** User-pets edit/delete actions.
- [x] **P4** Decide if `/forms/{id}/submissions` is needed.
- [ ] Optional: per-method coverage pass (paths wired but missing a method).

## Closeout (2026-07-30)

Each cluster was re-verified against the source before closing this out, not just checked off:

| Cluster | Where it landed |
|---|---|
| 1a Service providers — onboarding | `lib/api/service-providers.ts` + `components/service-providers/service-provider-form.tsx` |
| 1b Service providers — admin review | `lib/api/admin.ts`, covered by `lib/api/__tests__/admin-service-providers.test.ts` |
| 2 Transport quote / businesses / decline | `lib/api/transport.ts:172` and siblings, covered by `lib/api/__tests__/transport.test.ts` |
| 3 Avatar | `lib/api/auth.ts:55` |
| 4 User-pets edit/delete | `lib/api/user-pets.ts:52` (PATCH) and `:66` (DELETE) |
| 5 Form-scoped submissions | `lib/api/submissions.ts:38` — it *was* needed, so it was built rather than dropped |

**The Cluster 3 open question resolved to `/auth/avatar`.** `POST /auth/profile/photo` has no
frontend reference and none is wanted — wiring only the canonical endpoint was the right call.

**Cluster 2 was the demand half of the pet-taxi marketplace.** It was wired well before any
business could opt in: no UI could write the `pet_taxi` service key the backend filters on, so
`GET /transport/businesses` queried a set that could never return a row. The supply half —
the opt-in toggle and the pricing fields — shipped on `feature/business-pricing-wiring`.

The one remaining item is the per-method coverage pass flagged in the scope caveat at the top:
this spec only ever covered paths with *zero* frontend references, so a path counted as "wired"
could still be missing a specific method.

## How to re-run the coverage check

The diff scripts live in this session's scratchpad (`endpoint_diff2.py`, `extract_missing.py`).
Method: parse `swagger.yaml` for `(method, path)`, build a regex per endpoint, search the
frontend source under `lib/ app/ components/ hooks/` for `/api/v1<path>` (params → `{}`,
tolerating `${...}` query suffixes). Worth promoting to a small repo script/skill if we want
this as an ongoing guardrail.
