# Spec D: Quick Fixes

**Date**: 2026-03-13
**Status**: Approved
**Scope**: Frontend only

## Overview

Four targeted fixes from testing: age input UX, adopt page crash, Instagram link normalization, and emoji-to-icon consistency.

## 1. Age Input — Months/Years Toggle

### Problem
Users must mentally convert years to months when entering pet age. Violates "don't make me think."

### Solution
Add a toggle next to the age number input: **Meses** | **Años** (default: Meses). On save, if unit is "años", multiply by 12. Backend stays unchanged (stores months).

### Age display in grid cards
Grid cards in `pets-tab.tsx` currently show `{pet.age} meses`. Update to show human-friendly display: if `age >= 12`, show `X año(s)`; otherwise `X meses`. Same logic for the PreviewCard.

Note: `pet-detail.tsx` uses `t('detail.years', { count: pet.age })` — this is a pre-existing i18n key issue (label says "years" but receives months). Out of scope for this spec but worth fixing later.

### Edge case
If `pet.age === 0` (newborn), default to months.

### Files affected
- `components/dashboard/rescue-center/add-pet-modal.tsx` — add `ageUnit` state (`'months' | 'years'`), toggle buttons, convert on submit
- `components/dashboard/rescue-center/pets-tab.tsx` (EditPetModal) — same change. Pre-populate: if `pet.age >= 12 && pet.age % 12 === 0`, default to years; otherwise months. Also update grid card age display.
- `components/dashboard/rescue-center/add-pet-modal.tsx` (PreviewCard) — display age with correct unit label

### UI
- Number input on the left, two toggle buttons on the right (same row)
- Toggle buttons use same style as gender/species toggles: `bg-pop-550/10 border-pop-550/50 text-pop-300` when active
- `rounded-xl` on all elements

## 2. Adopt Page — `generateStaticParams` Fix

### Problem
`/adopt/[pet-id]` is a `'use client'` component but Next.js `output: 'export'` requires `generateStaticParams` on dynamic routes. Same issue on `/p/[slug]`. This causes a build-time error: "Page /adopt/[pet-id] is missing export function generateStaticParams which is required with output: 'export'".

### Solution
Split both pages into a thin server component (exports `generateStaticParams` returning `[]`) that renders a client component. Matches the pattern in `app/auth/onboarding/[role]/page.tsx`.

**Important**: The extracted client components must receive params via props and remove their `useParams()` calls.

### Files affected
- `app/adopt/[pet-id]/page.tsx` — convert to server component, move client logic to `components/adopt/adopt-pet-page.tsx`
- `app/p/[slug]/page.tsx` — convert to server component, move client logic to `components/pets/slug-redirect-page.tsx`

### Pattern
```tsx
// app/adopt/[pet-id]/page.tsx
import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'

export function generateStaticParams() {
  return []
}

export default async function Page({ params }: { params: Promise<{ 'pet-id': string }> }) {
  const { 'pet-id': petId } = await params
  return <AdoptPetPage petId={petId} />
}
```

```tsx
// components/adopt/adopt-pet-page.tsx
// Move existing client logic here, replacing useParams() with props:
interface AdoptPetPageProps { petId: string }
export function AdoptPetPage({ petId }: AdoptPetPageProps) { ... }
```

## 3. Instagram Links — URL Normalization

### Problem
`pet.rescue_center.instagram` may contain a handle (`nevertt`), `@handle`, or a full URL. In `pet-detail.tsx`, the `<a href={...}>` resolves a bare handle as a relative path. In `pet-grid.tsx`, `window.open(pet.rescue_center.instagram, '_blank')` does the same — opening e.g. `http://localhost:3000/nevertt`.

### Decision
Store handles only. Normalize in the frontend.

### Solution
Add a helper `instagramUrl(handle: string): string` to the existing `lib/utils.ts`:
- If starts with `http`, return as-is (graceful passthrough)
- Strip leading `@`
- Return `https://instagram.com/${clean}`

### Files affected
- `lib/utils.ts` — add `instagramUrl` helper to existing file
- `components/pets/pet-detail.tsx` — wrap `pet.rescue_center.instagram` with `instagramUrl()` in the `<a href>`
- `components/pets/pet-grid.tsx` — wrap `pet.rescue_center.instagram` with `instagramUrl()` in the `window.open()` call

## 4. Replace Emojis with Font Awesome Icons

### Problem
Species (🐕/🐈) and gender (♂/♀) use emojis in AddPetModal, EditPetModal, pet grid cards, PreviewCard, and filter dropdown pills. The rescue-center-wizard already uses `faDog`/`faCat`/`faMars`/`faVenus`.

### Solution
Replace all emoji occurrences with the matching FA icons for consistency.

| Emoji | FA Icon | Usage |
|-------|---------|-------|
| 🐕 Perro | `<FontAwesomeIcon icon={faDog} />` Perro | Species toggle, cards, filters, preview |
| 🐈 Gato | `<FontAwesomeIcon icon={faCat} />` Gato | Species toggle, cards, filters, preview |
| ♂ Macho | `<FontAwesomeIcon icon={faMars} />` Macho | Gender toggle, cards, filters |
| ♀ Hembra | `<FontAwesomeIcon icon={faVenus} />` Hembra | Gender toggle, cards, filters |

### Files affected
- `components/dashboard/rescue-center/add-pet-modal.tsx` — gender/species toggles + PreviewCard badges
- `components/dashboard/rescue-center/pets-tab.tsx` — EditPetModal gender/species toggles, pet grid card badges, **filter dropdown pills** (species and gender rows)
- `pet-detail.tsx` already uses FA icons — only touched for Instagram fix (Section 3)

### Specific locations in `pets-tab.tsx`
- EditPetModal: gender buttons (lines ~236-242), species buttons (lines ~250-258)
- Grid card badges: species/gender display (lines ~523-524)
- Filter dropdown: species pills (`'🐕 Perro' : '🐈 Gato'`), gender pills (`'♂ Macho' : '♀ Hembra'`)

## i18n

New keys for age toggle labels:

| Key | Spanish | English |
|-----|---------|---------|
| `dashboard.ageUnit.months` | Meses | Months |
| `dashboard.ageUnit.years` | Años | Years |

Added to `public/locales/{es,en}/pets.json` under the existing `dashboard` namespace.

## Dependencies

None. All changes are frontend-only and independent of each other.
