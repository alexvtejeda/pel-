# Spec D: Quick Fixes

## Tasks

- [x] Task 1: Instagram URL normalization — `instagramUrl()` helper in `lib/utils.ts`, used in `pet-detail.tsx` and `pet-grid.tsx`
- [x] Task 2: Adopt page + slug page `generateStaticParams` fix — split into server pages + client components
- [x] Task 3: Replace emojis with Font Awesome icons — `faDog`/`faCat`/`faMars`/`faVenus` in both modals, grid cards, filter pills, preview card
- [x] Task 4: Age input months/years toggle — both AddPetModal and EditPetModal, smart grid card display, i18n keys
- [x] Task 5: TypeScript check — clean compilation

## Review

### Changes made
- **`lib/utils.ts`** — Added `instagramUrl()` helper that normalizes handles/URLs to full Instagram URLs
- **`components/pets/pet-detail.tsx`** — Uses `instagramUrl()` for Instagram link href
- **`components/pets/pet-grid.tsx`** — Uses `instagramUrl()` for Instagram `window.open()` call
- **`components/adopt/adopt-pet-page.tsx`** — New client component extracted from adopt page, receives `petId` via props
- **`app/adopt/[pet-id]/page.tsx`** — Thin server component with `generateStaticParams` returning `[]`
- **`components/pets/slug-redirect-page.tsx`** — New client component extracted from slug page, receives `slug` via props
- **`app/p/[slug]/page.tsx`** — Thin server component with `generateStaticParams` returning `[]`
- **`components/dashboard/rescue-center/add-pet-modal.tsx`** — Emoji→FA icons, age months/years toggle with conversion on submit, PreviewCard updated with ageUnit prop
- **`components/dashboard/rescue-center/pets-tab.tsx`** — Emoji→FA icons in EditPetModal/grid/filters, age toggle in EditPetModal with smart pre-population, grid cards show "X año(s)" for ages ≥12 months
- **`public/locales/{es,en}/pets.json`** — Added `dashboard.ageUnit.months` and `dashboard.ageUnit.years` keys
