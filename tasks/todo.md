# Plan 7: Adoption Flow

## Tasks

- [x] Task 1: Create `lib/api/submissions.ts` — API module with Submission interface and CRUD functions
- [x] Task 2: Add `getPublicPet` and `getPetForm` to `lib/api/pets-public.ts`, then create `app/adopt/[pet-id]/page.tsx`
- [x] Task 3: Replace `interested-tab.tsx` with real API-backed submission review UI
- [x] Task 4: Wire adopt button in `pet-detail.tsx` to navigate to `/adopt/${pet.id}`
- [x] Task 5: Type-check and commit

## Review

### Changes made
- **`lib/api/submissions.ts`** — New API module with `Submission` interface and 5 functions: `submitAdoptionForm`, `uploadSubmissionFile` (raw fetch for multipart), `listSubmissions`, `getSubmission`, `reviewSubmission`. All follow `{ data, error }` pattern.
- **`lib/api/pets-public.ts`** — Added `getPublicPet(id)` and `getPetForm(petId)` with `PetFormResponse` interface (form + rc branding + advisory flag).
- **`app/adopt/[pet-id]/page.tsx`** — New client-side adopt page: fetches pet + form in parallel, sticky RC logo banner (4:1 aspect, gradient fallback), back link, pet context chip with photo, advisory banner for special-needs pets, renders `<FormRenderer>` with file upload support.
- **`components/dashboard/rescue-center/interested-tab.tsx`** — Replaced mock-data UI with real API-backed submission review: `ListView` with status filter dropdown + submission cards, `DetailView` with section-grouped answers + image lightbox + approve/reject actions. Approve shows "Chat iniciado" confirmation; reject expands inline textarea for optional rejection note.
- **`components/pets/pet-detail.tsx`** — Wired adopt button to navigate to `/adopt/${pet.id}` via `window.location.href`.
