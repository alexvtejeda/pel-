# Spec A: Quick UI Fixes + Pet Grid Enhancements

## Overview

Fix three UI issues in the rescue center wizard and enhance the public pet grid with RC verification badges, pet hierarchy (RC pets first), and new source filters.

## 1. RC Wizard — Vaccinated/Castrated Labels

**File:** `components/auth/onboarding/rescue-center-wizard.tsx`

**Problem:** The vaccinated and castrated checkboxes only show icons (`faSyringe`, `faScissors`) with no text. Users don't know what the icons mean.

**Fix:** Add text labels next to each Font Awesome icon:
- `faSyringe` icon + "Vacunado" text
- `faScissors` icon + "Castrado" text

Same inline layout, just append a `<span>` with the label text after each icon.

## 2. RC Wizard — Size Dropdown Invisible Text

**File:** `components/auth/onboarding/rescue-center-wizard.tsx`

**Problem:** The `<select>` for pet size has `bg-white/10` background with text that blends into the dark wizard background. Text is nearly invisible.

**Fix:** The `<select>` already has `text-white` but browser-native `<option>` elements don't inherit dark backgrounds reliably. Since this app runs in Electron (Chromium), set `text-white` on the `<select>` and add `bg-zinc-800 text-white` to each `<option>` element to ensure readability in the native dropdown. This is sufficient for the Chromium rendering engine.

## 3. RC Wizard — Age Months/Years Toggle

**File:** `components/auth/onboarding/rescue-center-wizard.tsx`

**Problem:** Age input only accepts years. The add-pet-modal (`add-pet-modal.tsx:276-301`) already has a months/years toggle. The wizard should match.

**Fix:** Add `ageUnit` state (`'months' | 'years'`, default `'years'`). Add toggle buttons next to the age number input, matching the add-pet-modal pattern:
- Two buttons side by side: "Meses" / "Años"
- Match the existing add-pet-modal styling: active button gets `bg-pop-550/10 border-pop-550/50 text-pop-300`, inactive gets `bg-white/10 text-white/50`
- On submit: convert to months (`ageUnit === 'years' ? age * 12 : age`)

## 4. Pet Grid — RC Verified Badge

**File:** `components/pets/pet-grid.tsx`

**Problem:** No visual distinction between RC pets and member pets in the public grid.

**Fix:** Add a verified badge to the top-right corner of pet cards that belong to a rescue center with a logo. The badge uses two layered Font Awesome icons:
- `faCertificate` as background in `text-pop-550` (the starburst shape)
- `faCheck` on top in `text-white` (white checkmark)

Implementation uses a relative-positioned wrapper with two absolutely-positioned icons:
```tsx
<span className="absolute top-2 right-2 w-5 h-5 drop-shadow-md">
  <FontAwesomeIcon icon={faCertificate} className="absolute inset-0 w-full h-full text-pop-550" />
  <FontAwesomeIcon icon={faCheck} className="absolute inset-0 w-full h-full text-white p-1" />
</span>
```

**Condition:** Only show when `pet.rescue_center` is not null (pet belongs to an RC). Member pets (`rescue_center` is null) never show the badge.

## 5. Pet Grid — Pet Hierarchy (RC First)

**File:** `components/pets/pet-grid.tsx`

**Problem:** No ordering hierarchy. RC pets should appear above member pets.

**Fix:** Sort the pets array after fetching: pets where `pet.rescue_center` is not null come first, then member pets where `pet.rescue_center` is null. Within each group, preserve the existing order (by creation date from API).

The `Pet` type already has `rescue_center?: { id, name, logo_url }` as an optional nested object. Use `pet.rescue_center !== null` as the check (not `rescue_center_id` which may not be a direct field).

**Backend dependency:** `GET /api/v1/pets` must include user pets in results (currently only returns RC pets). Member pets should have `rescue_center: null` in the response.

## 6. Pet Grid — Source Filters

**File:** `components/pets/pet-grid.tsx`

**Problem:** No way to filter by pet source (RC vs member).

**Fix:** Add two new filter pills to the existing inline filter bar, separated by a visual divider (`|`):

Current filters: `Todos | Perros | Gatos | Machos | Hembras | Cercanos`

New layout with dividers:
```
[Todos] [Perros] [Gatos] [Machos] [Hembras] [Cercanos] | [Vacunado] [Castrado] | [Centros] [Miembros]
```

- Three groups separated by `|` dividers
- Group 1: Species/gender/location (mutually exclusive category filter — existing `activeFilter` state, unchanged)
- Group 2: Health toggles (additive boolean state — `vaccinatedFilter` and `castratedFilter` already exist as props on `PetGridProps`)
- Group 3: Source filters (new additive boolean state: `sourceFilter: 'all' | 'rc' | 'member'`, default `'all'`). Client-side filter — checks `pet.rescue_center !== null` for RC pets, `pet.rescue_center === null` for member pets
- "Centros" icon: `faHouseChimney`; "Miembros" icon: `faUser`

**Note:** The vaccinated/castrated filters already exist in the component — the visual change here is adding the `|` divider between filter groups and displaying them inline with the new source filters. No new filter logic needed for health toggles.

## Type Changes

The `Pet` interface in `lib/api/pets.ts` needs `rescue_center_id` to become `string | null` (currently non-optional `string`). Member pets will have `rescue_center_id: null`.

## Backend Dependencies

- `GET /api/v1/pets` needs to include user (member) pets in results
- Each pet must include the nested `rescue_center: { id, name, logo_url }` object (or `null` for member pets) — the public listing endpoint may not currently return this
- No server-side `source` query param needed — filtering is done client-side
