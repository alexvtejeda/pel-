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

- **Requests** — incoming service/transport requests (recycled Interested tab UI)
- **Chat** — reuse existing chat components
- **Agenda** — reuse existing agenda component
- **Settings** — business profile + MFA + account management

Same patterns as RC: `SidebarProvider`, unsaved changes guard, notification bell, mobile bottom nav.

---

## 2. Requests Tab

Recycled Interested tab UI with transport request data.

### List view

Each card shows:
- Requester name (member or RC)
- Pet name + photo thumbnail
- Pickup → dropoff addresses
- Date requested
- Status badge: `pendiente` / `aceptado` / `en curso` / `completado` / `cancelado`

Filter bar: by status (maps to transport trip statuses).

### Detail view

- Pet info card (name, photo, species, breed, conditions)
- Pickup and dropoff addresses with map preview
- Requester contact info
- Conversation link (if `conversation_id` exists on the trip)
- Action buttons: "Aceptar" / "Rechazar" (for pending requests)

### Data source

`GET /api/v1/transport?role=driver` — already supports filtering by driver role.

### Backend change needed

The `role=driver` filter currently checks `driver_id` (set on accept). It must also return trips where `target_driver_id` matches the business user and `driver_id` is still null — i.e., pending requests targeted at them.

---

## 3. Provider Picker Component

Shared component used in two entry points.

### Component: `ProviderPicker`

Location: `components/transport/provider-picker.tsx`

- Fetches from `GET /providers?service=transport`
- Optional `lat`/`lng` props for proximity sorting
- Each card shows:
  - Business/provider name
  - Cover photo or avatar
  - Services offered (badges)
  - Price (e.g., "RD$500") — from `price` field on business profile
  - Trust badge: "Empresa verificada" (business) vs "Proveedor verificado" (member)
  - Distance (if coordinates available)
- On selection: returns the selected provider's user ID (becomes `target_driver_id`)

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

### Backend changes needed

- Add `price` column (integer, nullable) to `businesses` table
- Include `price` in `UnifiedProvider` response from `GET /providers`
- Add `price` to business update endpoint (`PATCH /businesses/me`)
- Add `price` to business settings in `internal/config/` if needed

---

## 4. Admin — Businesses in RC Tab (Temporary)

Minimal change to the existing admin rescue centers tab.

### Frontend changes

- Add type badge to each row: "Centro de Rescate" (blue) or "Empresa" (amber)
- Fetch businesses alongside rescue centers, combine client-side
- Same approve/reject action UI
- Filter dropdown: "Todos" / "Centros de Rescate" / "Empresas"

### Backend change needed

- `PATCH /api/v1/admin/businesses/{id}/review` — approve/reject a business with optional reason (mirrors RC approval endpoint)

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
- Instagram, website
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
| `GET /transport?role=driver` returns `target_driver_id` matches (pending requests) | transport | required |
| Add `price` column to `businesses` table (integer, nullable) | business | required |
| Include `price` in `PATCH /businesses/me` | business | required |
| Include `price` in `GET /providers` unified response | serviceproviders | required |
| `PATCH /admin/businesses/{id}/review` — approve/reject | business | required |

---

## i18n

New keys needed in `common` or new `business` namespace:
- Tab labels: "Solicitudes", "Chat", "Agenda", "Configuración"
- Request statuses: "Pendiente", "Aceptado", "En curso", "Completado", "Cancelado"
- Provider picker: "Selecciona un proveedor de transporte", "Empresa verificada", "Proveedor verificado"
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
