# Backend Changes Needed by Frontend Specs

**Date:** 2026-03-24
**Context:** Three frontend specs were written today. This document lists all backend changes they require, organized by priority. Feed this to the backend session.

---

## From Spec #5: Hosting (Cloudflare Tunnel)

### 1. New env var: `STORE_PHOTOS_LOCALLY` (critical — demo blocker)

Decouple photo storage from `TESTING_MODE`:

- Add `STORE_PHOTOS_LOCALLY` to `internal/config/`
- `true` → photos stored on local disk (`./uploads/`), served via `/uploads/*` route
- `false` → photos stored in MinIO/S3 (current production path)
- Extract the local storage logic currently gated behind `cfg.TestingMode` and rewire to `cfg.StorePhotosLocally`
- Move the `/uploads/*` file server route gate from `cfg.TestingMode` to `cfg.StorePhotosLocally`
- **Parameterize the local storage base URL**: add `STORAGE_LOCAL_BASE_URL` env var. `NewLocalClient("./uploads", cfg.StorageLocalBaseURL)` so photo URLs resolve to `https://api.pelurd.com/uploads/...` in demo mode instead of hardcoded `http://localhost:{port}/uploads/...`
- `TESTING_MODE` retains ONLY OTP/TOTP bypass (`"000000"` acceptance) and seed data behavior

After this change, update the backend README.md with the local-vs-demo env var reference table from the hosting spec.

---

## From Spec #2: Business Dashboard

### 2. Add `user_id` to `UnifiedProvider` (critical — ProviderPicker won't work without it)

The frontend needs the business/provider's `user_id` to set `target_driver_id` on transport requests. Currently `UnifiedProvider` only returns the entity `id`.

- Add `UserID string` to the `UnifiedProvider` struct
- Select `sp.user_id` and `b.user_id` in both `listUnifiedProviders` and `findUnifiedProviderByID` UNION queries

### 3. Add `price` to businesses table

- New migration: add `price` column (integer, nullable) to `businesses`
- Include `price` in `PATCH /businesses/me` update handler
- Include `price` in `UnifiedProvider` UNION query — businesses select `b.price`, members select `NULL::integer AS price`
- Add `Price *int` field to `UnifiedProvider` struct

### 4. Add `cover_photo_url` to `UnifiedProvider`

- Include `cover_photo_url` in the UNION query — businesses select `b.cover_photo_url`, members select `NULL` (or empty string)
- Add `CoverPhotoURL *string` to `UnifiedProvider` struct

### 5. Admin business endpoints

- `GET /api/v1/admin/businesses` — list all businesses with optional `?status=` filter (pending/active/rejected/all). Uses `RequireAuth + RequireAdmin` middleware. Mirrors `GET /admin/rescue-centers`.
- `PATCH /api/v1/admin/businesses/{id}/review` — approve or reject a business. Body: `{ "status": "active"|"rejected", "reason": "optional" }`. Uses `RequireAuth + RequireAdmin`.
- Mount both under the admin router in `cmd/server/main.go`

### 6. Enrich transport trip list for business dashboard

`GET /api/v1/transport?role=driver` currently returns raw Trip objects with only IDs. The business Requests tab needs:

- Requester display name (JOIN `users` on `requester_id`)
- Pet name, photo URL, species, breed (JOIN `pets` on trip's pet reference — note: trips currently have `pet_description` as free text, not a `pet_id` foreign key)

**Decision needed:** Either add a `pet_id` column to `transport_trips` and JOIN against `pets`, or keep `pet_description` and have the frontend display that instead of structured pet data. Adding `pet_id` is cleaner but requires a migration.

---

## From Spec #3: Adoption → Transport Flow

### 7. Include `conversation_id` in `submission_reviewed` WebSocket event

When a submission is approved, the `submission_reviewed` event broadcast to the member must include the `conversation_id` of the newly created conversation. Also include `rejection_note` when status is `rejected`.

### 8. Welcome system message on conversation creation

When `EnsureConversation()` creates a new conversation (on submission approval), insert a system message:

> "¡Solicitud aprobada! Coordinen la entrega aquí. Si necesitan transporte, pueden solicitarlo desde el menú."

This is a `sender_id = NULL` message (system message pattern already used for transport messages).

### 9. System messages for transport lifecycle

Currently only trip creation inserts a system message in chat. Extend to the full lifecycle. Only insert when `conversation_id` is set on the trip.

| Event | Handler location | System message text |
|-------|-----------------|-------------------|
| Trip requested | Already exists | "Transporte solicitado para {pet_name}" |
| Trip accepted | `Accept` handler | "Transporte aceptado por {business_name}" |
| Trip cancelled (by business) | `Cancel` handler | "Transporte cancelado por el proveedor" |
| Trip cancelled (by requester) | `Cancel` handler | "Solicitud de transporte cancelada" |
| Status → picking_up | `UpdateStatus` handler | "El conductor está en camino a recoger a {pet_name}" |
| Status → in_transit | `UpdateStatus` handler | "{pet_name} está en camino" |
| Status → completed | `UpdateStatus` handler | "Transporte completado — {pet_name} ha sido entregado/a" |

Each system message should be broadcast via WebSocket to conversation participants as a `new_message` event, same pattern as the existing trip request message.

To populate `{business_name}` and `{pet_name}` in these messages, the handler will need to query the business/user name and pet description. Use what's available on the trip record or do a quick lookup.

---

## Summary Table

| # | Change | Domain | Priority |
|---|--------|--------|----------|
| 1 | `STORE_PHOTOS_LOCALLY` + `STORAGE_LOCAL_BASE_URL` env vars | config, main.go | **critical** (demo blocker) |
| 2 | `user_id` in `UnifiedProvider` | serviceproviders | **critical** |
| 3 | `price` column on businesses + in UnifiedProvider | business, serviceproviders | required |
| 4 | `cover_photo_url` in UnifiedProvider | serviceproviders | required |
| 5 | Admin business list + review endpoints | business | required |
| 6 | Enrich trip list with requester/pet details | transport | required |
| 7 | `conversation_id` + `rejection_note` in `submission_reviewed` event | submissions | required |
| 8 | Welcome system message on conversation creation | submissions/chat | required |
| 9 | System messages for transport lifecycle events | transport | required |
