# Business Dashboard & Provider Picker

**Date:** 2026-03-24
**Status:** approved
**Brief:** `docs/superpowers/transcriptions/2026-03-24-business-dashboard-features.md`

## Goal

Give businesses a dashboard to manage incoming service requests, communicate with clients, and configure their profile. Also create a shared provider picker so members/RCs can select a transport provider before requesting a trip.

## Scope

- MVP/demo: display-only pricing (no commission logic, no payment processing)
- Fee/commission model deferred until business validation confirms willingness to cooperate
- Admin approval uses existing RC tab temporarily (no dedicated businesses tab)

---

## 1. Dashboard Structure

Mirror the RC dashboard pattern exactly.

### Files to create

```
app/dashboard/business/
  layout.tsx          — <ProtectedRoute requireRole={['business']}>
  page.tsx            — renders <BusinessDashboardShell />

components/dashboard/business/
  dashboard-shell.tsx — sidebar + header + tab content + mobile nav
  business-sidebar.tsx
  mobile-bottom-nav.tsx
  requests-tab.tsx
  settings-tab.tsx
```

### Tabs

`'requests' | 'chat' | 'agenda' | 'settings'`

- **Requests** — incoming service/transport requests (new components, same visual pattern as Interested tab)
- **Chat** — reuse existing chat components
- **Agenda** — reuse existing agenda component
- **Settings** — business profile + MFA + account management

Same patterns as RC: `SidebarProvider`, unsaved changes guard, notification bell, mobile bottom nav.

---

## 2. Requests Tab

Same **visual pattern** as the Interested tab (list/detail layout with status pills and filter bar), but built as new components — the data shapes are fundamentally different (Trip objects vs Submission objects).

### List view

Each card shows:
- Requester name
- Pet name + photo thumbnail
- Pickup → dropoff addresses
- Date requested
- Status badge: `pendiente` / `aceptado` / `en curso` / `completado` / `cancelado`

Status mapping from backend values: `requested` → "Pendiente", `accepted` → "Aceptado", `picking_up`/`in_transit` → "En curso", `completed` → "Completado", `cancelled` → "Cancelado".

Filter bar: by status.

### Detail view

- Pet info card (name, photo, species, breed, conditions)
- Pickup and dropoff addresses with map preview
- Requester contact info
- Conversation link (if `conversation_id` exists on the trip)
- **Action buttons** (for pending requests):
  - "Aceptar" → calls `PATCH /api/v1/transport/{id}/accept`
  - "Rechazar" → calls `PATCH /api/v1/transport/{id}/cancel`

### Data source

`GET /api/v1/transport?role=driver` — the backend already returns trips where `driver_id` OR `target_driver_id` matches the authenticated user (including pending requests where `driver_id` is null).

### Backend change needed

Enrich the trip list response to include requester display name and pet details (name, photo URL, species, breed). Currently returns raw Trip objects with only IDs. The backend should JOIN against `users` and `pets` tables to return enriched data, avoiding N+1 requests from the frontend.

---

## 3. Provider Picker Component

Shared component used in two entry points.

### Component: `ProviderPicker`

Location: `components/transport/provider-picker.tsx`

- Fetches from `GET /providers?service=transport`
- Optional `lat`/`lng` props for proximity sorting
- Each card shows:
  - Business/provider name
  - Cover photo (businesses) or initials avatar placeholder (members without photos)
  - Services offered (badges)
  - Price (e.g., "RD$500") — from `price` field on business profile; members show "Precio no disponible" if null
  - Trust badge: "Empresa verificada" (business) vs "Proveedor verificado" (member)
  - Distance (if coordinates available)
- On selection: returns the selected provider's **user ID** (becomes `target_driver_id`)

### Entry point A: Chat

Current flow in `chat-message-thread.tsx`:
```
"Solicitar transporte" → router.push(/transporte?pet_id=...&conversation_id=...)
```

Changed to:
```
"Solicitar transporte" → open ProviderPicker modal → on selection → router.push(/transporte?pet_id=...&conversation_id=...&provider_id=...)
```

### Entry point B: Transport creation form

In `transport-creation-form.tsx`:
- If `provider_id` is in URL query params → skip picker (pre-selected from chat)
- If no `provider_id` → show ProviderPicker as the first step before address entry

---

## 4. Admin — Businesses in RC Tab (Temporary)

Minimal change to the existing admin rescue centers tab.

### Frontend changes

- Add type badge to each row: "Centro de Rescate" (blue) or "Empresa" (amber)
- Fetch businesses from new admin endpoint, combine client-side with RC list
- Same approve/reject action UI
- Filter dropdown: "Todos" / "Centros de Rescate" / "Empresas"

### Backend changes needed

- `GET /api/v1/admin/businesses` — list all businesses with status filter (mirrors `GET /admin/rescue-centers`)
- `PATCH /api/v1/admin/businesses/{id}/review` — approve/reject a business with optional reason
- Both endpoints use `RequireAuth + RequireAdmin` middleware, matching the existing admin RC routes
- Frontend `lib/api/admin.ts` needs new functions for these endpoints

### Explicitly temporary

Post-validation, businesses get their own admin tab. This is a demo shortcut.

---

## 5. Settings Tab

Same layout as RC settings tab with business-specific fields.

### Profile section

- Display name (user)
- Business name
- Cover photo (existing upload via `POST /businesses/me/photo`)
- Phone, address
- Instagram
- RNC (business tax ID)

### Services section

- Service checkboxes (transport, grooming, walking, etc. — same as wizard)
- Other service (freeform)
- **Price** (new — simple number input, label: "¿Cuánto cobras por servicio?")
- Operating hours (7-day toggle grid, same as wizard)

### Security section

- MFA setup (TOTP, WebAuthn, email OTP) — reuse RC MFA components
- Recovery codes

### Danger zone

- Logout
- Delete account

All fields match the business wizard — this is the wizard fields made editable.

---

## Backend Changes Summary

| Change | Domain | Priority |
|--------|--------|----------|
| Add `user_id` to `UnifiedProvider` struct and UNION queries | serviceproviders | **critical** |
| Add `price` column to `businesses` table (integer, nullable) | business | required |
| Add `price` (NULL for members) and `cover_photo_url` to `UnifiedProvider` UNION query | serviceproviders | required |
| Include `price` in `PATCH /businesses/me` | business | required |
| Enrich `GET /transport?role=driver` to JOIN requester name + pet details | transport | required |
| `GET /admin/businesses` — list all businesses for admin (with `RequireAdmin`) | business | required |
| `PATCH /admin/businesses/{id}/review` — approve/reject (with `RequireAdmin`) | business | required |

---

## i18n

New `business` namespace (`public/locales/{es,en}/business.json`), registered in `lib/i18n/index.ts`:

- Tab labels: "Solicitudes", "Chat", "Agenda", "Configuración"
- Request statuses: "Pendiente", "Aceptado", "En curso", "Completado", "Cancelado"
- Provider picker: "Selecciona un proveedor de transporte", "Empresa verificada", "Proveedor verificado", "Precio no disponible"
- Settings labels: "Precio por servicio", "¿Cuánto cobras por servicio?"
- Admin badges: "Centro de Rescate", "Empresa"

Add to both `es` and `en` locale files.

---

## What This Spec Does NOT Cover

- Fee/commission model (deferred until business validation)
- Payment processing
- Route calculation / ETA for transport
- Business metrics/analytics tab
- Dedicated admin businesses tab (temporary: shares RC tab)
- Service provider matching based on pet conditions
- `website` field on business profile (does not exist in backend — add later if needed)
