# Plan 4: Pet Discovery Page

## Tasks

- [x] Task 1: Move landing page to `/about`, redirect `/` to `/pets`
- [x] Task 2: Create `lib/api/pets-public.ts`
- [x] Task 3: Create `components/pets/pets-header.tsx`
- [x] Task 4: Create `components/pets/pet-grid.tsx`
- [x] Task 5: Create `components/pets/pet-detail.tsx`
- [x] Task 6: Create `components/pets/pets-page.tsx`
- [x] Task 7: Create route `app/pets/page.tsx`
- [x] Task 8: Add i18n keys for discovery page
- [x] Task 9: Type-check and commit

## Review

### Changes made
- **`app/page.tsx`** — replaced LandingPage render with client-side redirect to `/pets`
- **`app/about/page.tsx`** — new route that renders the original LandingPage component
- **`app/pets/page.tsx`** — new route rendering PetsPage
- **`lib/api/pets-public.ts`** — unauthenticated `listPublicPets()` using plain fetch, returns `{ data, error }` pattern, supports species/gender/sort/proximity filters
- **`components/pets/pets-header.tsx`** — public header with Logo, nav links (Mascotas, Acerca de), conditional CTA (login/register for guests, dashboard link for authenticated users)
- **`components/pets/pet-grid.tsx`** — 2-col (mobile) / 3-col (desktop) grid with filter pills (Todos, Perros, Gatos, Machos, Hembras, Cercanos), selected card outline, photo overlay with pet name, loading/empty/error states
- **`components/pets/pet-detail.tsx`** — 360px right panel with hero photo carousel (prev/next click areas, dots), pet name, species/gender/age badges, description, adopt button (or login prompt for guests)
- **`components/pets/pets-page.tsx`** — main orchestrator owning all state, renders header + split layout (flex-1 grid + 360px detail panel hidden on mobile)
- **`public/locales/es/pets.json`** and **`en/pets.json`** — added `gender`, `grid`, `header`, and `detail` i18n keys

### Bug fix during implementation
- Used `member`/`business` roles (not `owner`) to match the renamed UserRole type
