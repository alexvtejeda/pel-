# Backend Changes Needed by Frontend Specs

**Date:** 2026-03-24
**Context:** Four frontend specs were written today. This document lists all backend changes they require, organized by priority. Feed this to the backend session.

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
- Frontend `lib/api/admin.ts` will need corresponding functions — no backend work needed for that, just noting it.

### 6. Add `pet_id` to transport trips + enrich trip list

**Decision (resolved):** Add `pet_id` as a nullable UUID foreign key to `transport_trips`. Keep `pet_description` as a fallback for trips without a linked pet.

- New migration: add `pet_id UUID REFERENCES pets(id)` (nullable) to `transport_trips`
- Persist `pet_id` during `insertTrip` when provided in the request body
- `GET /api/v1/transport` and `GET /api/v1/transport/{id}`: JOIN against `users` (for requester display name) and `pets` (for pet name, first photo URL, species, breed) when `pet_id` is set
- Return enriched fields in the Trip response: `requester_name`, `pet_name`, `pet_photo_url`, `pet_species`, `pet_breed`

---

## From Spec #3: Adoption → Transport Flow

### 7. Add `conversation_id` to transport trips table (critical — system messages won't work without it)

Currently `conversation_id` is passed in the request body during trip creation and used inline, but **never persisted** to `transport_trips`. The Accept, UpdateStatus, and Cancel handlers have no way to know which conversation to insert system messages into.

- New migration: add `conversation_id UUID` (nullable) to `transport_trips`
- Persist it during `insertTrip` when provided
- Include it in all SELECT queries that populate the Trip struct
- Add `ConversationID *string` to the Trip struct

### 8. Include `conversation_id` in `submission_reviewed` WebSocket event

When a submission is approved, the `submission_reviewed` event broadcast to the member must include the `conversation_id` of the newly created conversation.

- In the submissions handler, **capture the return value of `EnsureConversation()`** (currently discarded on line ~208)
- Add `conversation_id` to the event payload when status is `approved`
- Also include `rejection_note` in the event when status is `rejected`

### 9. Add `metadata` column to notifications table

The notification bell needs to support navigation on click (e.g., approved → open chat, rejected → go to /pets).

- New migration: add `metadata JSONB` (nullable) to `notifications` table
- Update `insertNotification` to accept optional metadata parameter
- On approval: `metadata: {"link": "/chat", "conversation_id": "..."}`
- On rejection: `metadata: {"link": "/pets"}`
- Include `metadata` in notification SELECT queries and response structs

### 10. Welcome system message on conversation creation

When `EnsureConversation()` creates a new conversation (on submission approval), insert a system message:

> "¡Solicitud aprobada! Coordinen la entrega aquí. Si necesitan transporte, pueden solicitarlo desde el menú."

This is a `sender_id = NULL` message (system message pattern already used for transport messages). Use the captured conversation return from item #8.

### 11. System messages for transport lifecycle

Currently only trip creation inserts a system message in chat. Extend to the full lifecycle. Only insert when `conversation_id` is set on the trip (now persisted per item #7).

| Event | Handler location | System message text |
|-------|-----------------|-------------------|
| Trip requested | Already exists | "Transporte solicitado para {pet_name}" |
| Trip accepted | `Accept` handler | "Transporte aceptado por {business_name}" |
| Trip cancelled (by business) | `Cancel` handler (check `claims.Subject` against `trip.TargetDriverID`/`trip.DriverID`) | "Transporte cancelado por el proveedor" |
| Trip cancelled (by requester) | `Cancel` handler (check `claims.Subject` against `trip.RequesterID`) | "Solicitud de transporte cancelada" |
| Status → picking_up | `UpdateStatus` handler | "El conductor está en camino a recoger a {pet_name}" |
| Status → in_transit | `UpdateStatus` handler | "{pet_name} está en camino" |
| Status → completed | `UpdateStatus` handler | "Transporte completado — {pet_name} ha sido entregado/a" |

Each system message should be broadcast via WebSocket to conversation participants as a `new_message` event, same pattern as the existing trip request message.

To populate `{business_name}`: query `users.display_name` for the driver's user ID.
To populate `{pet_name}`: use `trip.PetDescription`, or if `pet_id` is set (item #6), query `pets.name`.

---

---

## From Spec #1: Services Route (/aliados)

### 12. Add `operating_hours` to `UnifiedProvider`

- Include `operating_hours` (JSONB) in the UNION query — businesses select `b.operating_hours`, members select `NULL`
- Add `OperatingHours` field to `UnifiedProvider` struct
- Bundle with the other UNION query changes (items #2, #3, #4)

### 13. Add `instagram` to `UnifiedProvider` (nice-to-have)

- Include `instagram` in the UNION query — businesses select `b.instagram`, members select `NULL`
- Add `Instagram *string` to `UnifiedProvider` struct

**Note:** `description` already exists in `UnifiedProvider` — no change needed.

---

## Summary Table

| # | Change | Domain | Priority |
|---|--------|--------|----------|
| 1 | `STORE_PHOTOS_LOCALLY` + `STORAGE_LOCAL_BASE_URL` env vars | config, main.go | **critical** (demo blocker) |
| 2 | `user_id` in `UnifiedProvider` | serviceproviders | **critical** |
| 7 | `conversation_id` column on `transport_trips` | transport | **critical** |
| 3 | `price` column on businesses + in UnifiedProvider | business, serviceproviders | required |
| 4 | `cover_photo_url` in UnifiedProvider | serviceproviders | required |
| 5 | Admin business list + review endpoints | business | required |
| 6 | `pet_id` column on `transport_trips` + enrich trip list | transport | required |
| 8 | `conversation_id` + `rejection_note` in `submission_reviewed` event | submissions | required |
| 9 | `metadata JSONB` on notifications table | notifications | required |
| 10 | Welcome system message on conversation creation | submissions/chat | required |
| 11 | System messages for transport lifecycle events | transport | required |
| 12 | `operating_hours` in UnifiedProvider | serviceproviders | required |
| 13 | `instagram` in UnifiedProvider | serviceproviders | nice-to-have |
