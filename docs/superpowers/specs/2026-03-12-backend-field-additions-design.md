# Spec D: Backend Field Additions

**Date**: 2026-03-12
**Status**: Approved
**Scope**: Backend (Go API) + frontend form/display changes for new fields

## Overview

Add new pet fields (vaccinated, castrated, size), rework age storage to integer months, add SVG support for RC logos, add business role + table, and return nested RC data in public pet listings.

## 1. New Pet Fields

### `vaccinated` — boolean
- Column: `vaccinated BOOLEAN NOT NULL DEFAULT false`
- Exposed in create/update pet API endpoints
- Frontend: checkbox in Add Pet Modal and Edit Pet Modal

### `castrated` — boolean
- Column: `castrated BOOLEAN NOT NULL DEFAULT false`
- Exposed in create/update pet API endpoints
- Frontend: checkbox in Add Pet Modal and Edit Pet Modal

### `size` — enum
- Column: `size TEXT NOT NULL DEFAULT 'medium'`
- Accepted values: `small`, `medium`, `large`
- Validate on backend — reject any other value
- Frontend: dropdown/select in Add Pet Modal and Edit Pet Modal
- Display labels: use existing i18n keys `size.small`, `size.medium`, `size.large` (already in `pets.json`)

### Migration
- Add all three columns to `pets` table in a single migration
- Existing pets default to `vaccinated=false`, `castrated=false`, `size='medium'`

### Frontend files affected
- `components/dashboard/rescue-center/add-pet-modal.tsx` — add form fields, update `AddPetFormData` interface
- `components/dashboard/rescue-center/pets-tab.tsx` — update `EditPetModal` form, update display
- `lib/api/pets.ts` — update `Pet` interface, update `createPet()` and `updatePet()` parameter types

## 2. Age Rework — Integer Months

### Current state — inconsistency in the codebase
- `pet-detail.tsx` (public page) treats `age` as **years**: uses `t('detail.years', { count: pet.age })`
- `pets-tab.tsx` (dashboard) treats `age` as **months**: displays `${pet.age} meses`
- The actual stored values and their intended unit are ambiguous

### New — store as integer months
- Column type: `INTEGER`
- **All values represent months**
- Backend validation:
  - Minimum: `1` (reject 0 and negative values)
  - Maximum: `300` (25 years × 12 months)
  - Must be a positive integer

### Data migration
- **Investigate existing data**: check what unit current `age` values represent
- If values are years (e.g., `2` meaning 2 years), multiply by 12 in migration
- If values are months, no conversion needed
- Add a note in migration to verify with a manual check of existing data before running

### Frontend — Input UX
- **Left**: number input for the value (e.g., `4`)
- **Right**: `DropdownMenu` (shadcn) with two options: "meses" / "años"
- Arrow icon on the dropdown rotates 360° on click (CSS/motion animation)
- Conversion before sending to backend:
  - If "meses" selected: send value as-is
  - If "años" selected: send `value × 12`

### Frontend — Display Logic (replaces BOTH current display approaches)
- `age < 12` → "{age} meses" (e.g., "4 meses")
- `age >= 12` and `age % 12 === 0` → "{age/12} años" (e.g., "2 años")
- `age >= 12` and `age % 12 !== 0` → "{floor(age/12)} años, {age%12} meses" (e.g., "2 años, 2 meses")

### i18n key changes
- Replace existing `detail.years_one` / `detail.years_other` with new age display keys (see Section 7)
- Remove `card.age` / `card.age_plural` if unused after this change

### Frontend files affected
- `components/dashboard/rescue-center/add-pet-modal.tsx` — age input + dropdown
- `components/dashboard/rescue-center/pets-tab.tsx` — age display logic in grid + EditPetModal
- `components/pets/pet-detail.tsx` — replace `t('detail.years', ...)` with new age display logic
- `components/pets/pet-grid.tsx` — age display in card if shown
- `lib/api/pets.ts` — `Pet` interface: `age` remains `number` (semantics change to months)

## 3. SVG Support — RC Logos Only

### Current
- Image uploads accept raster formats (PNG, JPG, WebP)
- Same validation for pet photos and RC logos

### New
- **RC logo uploads only**: accept `image/svg+xml` in addition to existing formats
- **Pet photo uploads**: remain raster only (PNG, JPG, WebP) — no SVG
- Backend: update the MIME type / file extension validation for the logo upload endpoint specifically
- Security: sanitize SVGs on upload — strip `<script>` tags, event handlers (`onload`, `onclick`, etc.), and external references (`xlink:href` to remote URLs). Alternatively, serve SVGs with strict `Content-Security-Policy` headers.

### Endpoints affected
- Logo upload endpoint (RC settings) — add SVG to accepted types
- Pet photo upload endpoint — no changes

## 4. Business Role + Table

### Add `business` to accepted roles
- Update the role validation to accept: `member`, `rescue_center`, `business`
- **Do NOT remove `adopter` from backend yet** — Spec B handles frontend removal first. Backend removal should be coordinated: once Spec B is deployed and no users have `adopter` role, a follow-up migration removes it. Premature backend removal while frontend still references `adopter` will break the app.

### Verify adopter status
- Check if any `adopter`-specific table exists and note its state
- Check if any existing users have `role = 'adopter'` in the database
- Plan for eventual cleanup once Spec B frontend changes are live

### Create `businesses` table
Match the existing frontend `Business` interface at `lib/api/businesses.ts`:

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  rnc TEXT,
  instagram TEXT,
  description TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  other_service TEXT,
  operating_hours JSONB,
  cover_photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

### API endpoints for businesses
The frontend at `lib/api/businesses.ts` already expects these endpoints:
- `POST /api/v1/businesses` — create business profile (body: `CreateBusinessInput`)
- `GET /api/v1/businesses/me` — get current user's business profile
- `POST /api/v1/businesses/me/photo` — upload cover photo (multipart form, field: `photo`)
- All endpoints require `business` role

**Note**: `PATCH /api/v1/businesses/me` (update) is not yet in the frontend but should be created for completeness.

## 5. RC Data on Public Pet Listings

### Current
- Public pet listing API returns `Pet` objects with `rescue_center_id` (string only)
- `getPetForm` endpoint returns `rc: { id, name, logo_url, city }` — partial precedent

### New
- Public pet listing and pet detail endpoints return a nested `rescue_center` object:

```json
{
  "id": "...",
  "name": "Mango",
  "rescue_center_id": "...",
  "rescue_center": {
    "id": "...",
    "name": "Patitas RD",
    "logo_url": "https://...",
    "website": "https://patitasrd.com",
    "instagram": "https://instagram.com/patitasrd"
  }
}
```

- `website` and `instagram` columns already exist on `rescue_centers` table
- Implementation: JOIN `rescue_centers` in the pet listing/detail queries, map to nested object in response

### Note on `PetFormResponse.rc`
The `getPetForm` endpoint's `rc` object has `{ id, name, logo_url, city }` — no `website` or `instagram`. Consider unifying this into a shared `RescueCenterSummary` type. For now, the pet listing response uses a superset. The `getPetForm` response can optionally be updated to include `website` and `instagram` too.

### Endpoints affected
- `GET /api/v1/pets/public` (public listing)
- `GET /api/v1/pets/public/:id` (public detail)

### Frontend type update
- `lib/api/pets.ts` — extend `Pet` interface:

```typescript
interface PetRescueCenter {
  id: string
  name: string
  logo_url?: string
  website?: string
  instagram?: string
}

interface Pet {
  // ...existing fields...
  rescue_center?: PetRescueCenter
}
```

## 6. Frontend Integration for New Fields

### Add Pet Modal / Edit Pet Modal
New fields to add to the form:
- **Vaccinated**: checkbox — "¿Está vacunado?" (Sí/No)
- **Castrated**: checkbox — "¿Está castrado?" (Sí/No)
- **Size**: dropdown — Pequeño / Mediano / Grande (use existing `size.*` i18n keys)

### `AddPetFormData` interface update
Add to `components/dashboard/rescue-center/add-pet-modal.tsx`:
```typescript
interface AddPetFormData {
  // ...existing fields...
  vaccinated: boolean
  castrated: boolean
  size: 'small' | 'medium' | 'large'
}
```

### `createPet()` and `updatePet()` parameter updates
Update `lib/api/pets.ts` to include `vaccinated`, `castrated`, and `size` in the request body types.

### Pet Display (dashboard + /pets page)
- Size shown as a badge alongside species/gender/age
- Vaccinated/castrated shown as small icons or badges in the pet detail sheet

## 7. i18n Keys

Use existing keys where available. New keys in `public/locales/{es,en}/pets.json`:

| Key | Spanish | English | Note |
|-----|---------|---------|------|
| `size.small` | Pequeño | Small | **Already exists** |
| `size.medium` | Mediano | Medium | **Already exists** |
| `size.large` | Grande | Large | **Already exists** |
| `vaccinated` | Vacunado | Vaccinated | New |
| `notVaccinated` | No vacunado | Not vaccinated | New |
| `castrated` | Castrado | Castrated | New |
| `notCastrated` | No castrado | Not castrated | New |
| `age.months_one` | {{count}} mes | {{count}} month | New (replaces detail.years pattern) |
| `age.months_other` | {{count}} meses | {{count}} months | New |
| `age.years_one` | {{count}} año | {{count}} year | New (consolidates detail.years_one) |
| `age.years_other` | {{count}} años | {{count}} years | New (consolidates detail.years_other) |
| `age.yearsAndMonths` | {{years}} años, {{months}} meses | {{years}} years, {{months}} months | New |

## Dependencies

- **Spec A** (frontend): needs Section 5 (RC data on pet listings) completed before the pet detail sheet can show RC info
- **Spec B** (frontend): must be deployed before `adopter` role can be removed from backend
- **Spec C** (frontend): vaccinated/castrated filter options become functional once Section 1 fields exist

## Implementation Order (suggested)

1. **Section 4** — Business role + table (unblocks business onboarding)
2. **Section 1** — New pet fields (vaccinated, castrated, size)
3. **Section 2** — Age rework (includes data migration investigation)
4. **Section 5** — RC data on pet listings (unblocks Spec A)
5. **Section 3** — SVG support for logos
6. **Section 6** — Frontend integration for new fields

## Out of Scope
- Business onboarding wizard frontend — separate spec
- Admin dashboard — future phase
- Form builder persistence — needs separate investigation
- Chat system — Phase 5
- `adopter` role removal from backend — coordinated after Spec B deployment
