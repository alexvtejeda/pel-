# Spec: Small-Wins API Wiring (Avatar · User-Pets Edit/Delete · Per-Form Submissions)

**Date:** 2026-07-24
**Status:** Approved — ready for implementation plan
**Repo:** `frontend` (pel-) wires against `api` (pelu-api)
**Contract source of truth:** `api/docs/api/swagger.yaml` (live Scalar UI at `http://localhost:2701/docs`)
**Parent inventory:** [`2026-07-21-frontend-api-wiring-gaps.md`](./2026-07-21-frontend-api-wiring-gaps.md)

## Context

The parent inventory catalogued 12 unused backend endpoints across 6 clusters. This spec
covers the **"small wins" bundle** — the three lower-risk P3/P4 clusters — as one
coherent piece of work. The P1 (Service Providers) and P2 (Transport) clusters are **not**
in scope here and get their own spec → plan → implementation cycles later.

The three pieces are independent and can land in any order:

1. **Avatar upload / remove** (`POST` + `DELETE /auth/avatar`)
2. **User-pets edit / delete** (`PATCH` + `DELETE /user-pets/{id}`) + a new member-facing
   `/mis-mascotas` management page (there is no surface today that lists a member's own pets)
3. **Per-form submissions view** (`GET /forms/{id}/submissions`) surfaced in the RC Forms tab

### Freshness check (done 2026-07-24)

`grep` over `lib/ app/ components/ hooks/` confirmed all target endpoints have **zero**
frontend references. `avatar_url` is already on `AuthUser` and already rendered.

## Conventions to follow (from project CLAUDE.md)

- **API client**: new functions return `{ data, error }`, never throw. (`lib/api/pets.ts`
  is the one existing exception — do not copy it.)
- **Auth**: cookie-based — `apiClient()` / `credentials: 'include'`. No tokens.
- **Multipart uploads** (avatar, pet photos): raw `fetch` with `credentials: 'include'`,
  **do not set `Content-Type`** (the browser sets the boundary).
- **i18n**: Spanish-first; add every new string to both `public/locales/es` and `.../en`,
  then import/register in `lib/i18n/index.ts`.
- **Icons**: Font Awesome only, sized with `text-*`. **Radius**: cards `rounded-2xl`,
  buttons/inputs `rounded-xl`. **Toasts**: Sonner (`import { toast } from 'sonner'`).

---

## Piece 1 — Avatar upload / remove · Priority P3 (lowest risk)

The canonical-endpoint question from the parent spec is **resolved**: swagger marks
`POST /auth/profile/photo` as *legacy* ("Prefer the avatar endpoint"). We wire only
`/auth/avatar` and ignore the legacy path entirely.

### Backend contract (already exists)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/avatar` | Multipart, field name **`avatar`**, ≤5 MB, PNG/JPEG/WebP. Returns `{ avatar_url }`. Stored at `avatars/{user_id}`. |
| DELETE | `/auth/avatar` | Clears `avatar_url` + deletes the blob. Returns **204** even if there was no avatar. |

### API — extend `lib/api/auth.ts`

- `uploadAvatar(file: File): Promise<{ data: { avatar_url: string } | null; error: string | null }>`
  — raw `fetch` multipart `POST ${BASE_URL}/api/v1/auth/avatar`, `credentials: 'include'`,
  `FormData` with `append('avatar', file)`, **no `Content-Type`**.
- `deleteAvatar(): Promise<{ data: null; error: string | null }>`
  — `apiClient('/api/v1/auth/avatar', { method: 'DELETE' })`; treat 204 as success
  (no body to parse).

### UI — the account Sheet in `components/pets/pets-header.tsx`

The account Sheet already displays the avatar at two sizes (`h-16` in the sheet header,
`h-8` in the trigger) and already falls back to `avatarInitial`. Make the **`h-16` sheet
avatar** the control:

- Overlay a small camera affordance on the avatar; click opens a hidden `<input type="file">`
  (`accept="image/png,image/jpeg,image/webp"`). Client-side guard: reject `> 5 MB`
  (mirror the add-modal's existing check) with a toast.
- On success → `updateSession({ ...user, avatar_url })` (from `useAuth()`); both avatar
  spots refresh live. Success/error toasts.
- When `user.avatar_url` is set, show a **"Quitar foto"** text button → `deleteAvatar()` →
  `updateSession({ ...user, avatar_url: null })` + toast.

**No new page, no type change** — `avatar_url` is already on `AuthUser` (`lib/types/user.ts`).

### Acceptance

- Uploading a valid image updates the avatar everywhere without a page reload.
- Files > 5 MB or wrong type are rejected client-side with a Spanish toast.
- "Quitar foto" only appears when an avatar exists; removing it reverts to the initial.

---

## Piece 2 — User-pets edit / delete + `/mis-mascotas` page · Priority P3

`lib/api/user-pets.ts` wires list/create/photo-upload but not edit or delete, and **no
member-facing surface lists a member's own pets** (`listUserPets` is only consumed by the
transport pet-picker and the onboarding wizard). So this piece adds both the API functions
and a management page.

### Backend contract (already exists)

| Method | Path | Notes |
|---|---|---|
| PATCH | `/user-pets/{id}` | Partial update; only fields present in the body change. Must belong to the caller. Validates species/gender/size enums + non-negative age/weight_kg. Body fields: `name, age, breed, conditions[], description, gender, size, species, weight_kg`. Returns `userPetResponse`. |
| DELETE | `/user-pets/{id}` | Must belong to the caller. **204** on success, 404 if not found. |

> ⚠️ **Contract caveat to verify during implementation:** the swagger PATCH body **and**
> the `userPetResponse` schema **omit `vaccinated` and `castrated`** (and `created_at`),
> even though the create flow sends `vaccinated`/`castrated` and the frontend `UserPet`
> type includes them. Confirm whether `PATCH /user-pets/{id}` accepts and returns those
> two fields. **If it does not**, the vaccinated/castrated toggles are **create-only** in
> edit mode (grey them out / omit them) — or file a small backend follow-up. Do not block
> the rest of this piece on it.

### API — extend `lib/api/user-pets.ts`

- `updateUserPet(id: string, fields: Partial<Omit<UserPet, 'id' | 'user_id' | 'created_at' | 'photos'>>)`
  → `apiClient('/api/v1/user-pets/${id}', { method: 'PATCH', body: JSON.stringify(fields) })`
  → `{ data: UserPet, error }`.
- `deleteUserPet(id: string)`
  → `apiClient('/api/v1/user-pets/${id}', { method: 'DELETE' })`; 204 → `{ data: null, error }`.

### New route — `app/mis-mascotas/`

- `layout.tsx`: wrap children in `<ProtectedRoute requireRole={['member']}>` — mirror
  `app/chat/layout.tsx` exactly.
- `page.tsx`:
  - Renders the shared header (`pets-header.tsx`) so the page looks like the rest of the
    public/member surface. **Header stays visible.**
  - Loads the member's pets via `listUserPets()`; renders a responsive grid of `UserPetCard`s.
  - **"Añadir mascota" CTA** on the page → opens `MemberAddPetModal` (create mode). After a
    successful add, refresh the list.
  - Empty state: friendly message + the same "Añadir mascota" CTA.

### Reusable card — `components/pets/user-pet-card.tsx`

Extract the visual card currently inlined as `PreviewCard` inside `member-add-pet-modal.tsx`
into a shared `UserPetCard`: `rounded-2xl`, aspect-square photo carousel (`Carousel`) or
`faPaw` silhouette when no photos, `name · age · gender · species`, vaccinated/castrated/size
row. `member-add-pet-modal.tsx` should reuse this same component for its live preview so
there is one source of truth.

On `/mis-mascotas`, each card carries two actions (top-right overlay or footer):
- **Edit** (`faPen`) → opens `MemberAddPetModal` in edit mode for that pet.
- **Delete** (`faTrash`) → confirm dialog (below).

### Edit flow — extend `MemberAddPetModal`

Add an optional `pet?: UserPet` prop:
- When present: title/CTA become "Editar" / "Guardar cambios"; all fields **prefill** from
  `pet`; existing photos display.
- **Save calls `updateUserPet(pet.id, fields)` (PATCH)** instead of `createUserPets`.
- **Photos in edit mode:** adding new photos reuses `uploadUserPetPhotos(pet.id, files)`.
  Removing or reordering **existing** photos is **out of scope** (no per-photo delete
  endpoint in this cluster) — the modal's reorder/remove affordances apply only to
  newly-added, not-yet-uploaded photos.
- Age unit handling: the modal already converts years→months on save. On **prefill**, set
  the age input to the stored value with the unit toggle on **"months"** (the persisted
  `age` is already in months), so the existing save-time conversion round-trips correctly.

### Delete flow

Trash → shadcn `AlertDialog` confirm (the same primitive `forms-tab.tsx` already uses) →
`deleteUserPet(id)` → optimistic removal from the grid + success toast; on error, restore
the card and show an error toast.

### Entry point

- Add a **"Mis mascotas"** item (member-only) to the account-Sheet nav in `pets-header.tsx`
  (`faPaw` or similar) → links to `/mis-mascotas`. This is the **only** entry point.
- Keep the existing **"Publicar mascota"** quick-action in the sheet (opens the add modal
  directly) — add lives both in the sheet and on the page.
- **No** public-nav or `MobileBottomNav`/`public-mobile-nav` link to `/mis-mascotas`.

### Acceptance

- A member can reach `/mis-mascotas` only via the account Sheet; the header renders there.
- The page lists the member's pets; empty state shows a CTA.
- Editing a pet prefills the modal and persists via PATCH; the card reflects changes.
- Deleting asks for confirmation and removes the pet.
- Adding a pet works from both the page CTA and the sheet quick-action.

---

## Piece 3 — Per-form submissions view · Priority P4

The generic `GET /submissions` (wired) supports `status` + `pet_id` filters but **not**
`form_id`. The RC Interested tab already filters by status + pet (client-side) and shows
`form_name` per row, so this endpoint is additive, not a replacement. We surface it as a
lightweight per-form list inside the Forms tab.

### Backend contract (already exists)

| Method | Path | Notes |
|---|---|---|
| GET | `/forms/{id}/submissions` | Submissions for one form; the form's RC must match the caller. Optional `?status=pending\|approved\|rejected`. Returns `SubmissionListItem[]` (lighter than the generic list). |

`SubmissionListItem` = `{ id, pet_name, member_email, status, submitted_at }` — **no**
answers, form_name, pet photo, or member name. Full detail still requires `getSubmission(id)`.

### API — extend `lib/api/submissions.ts`

- Export a `SubmissionListItem` interface matching the schema above.
- `listFormSubmissions(formId: string, status?: 'pending' | 'approved' | 'rejected')`
  → `apiClient('/api/v1/forms/${formId}/submissions' + optional ?status=)`
  → `{ data: SubmissionListItem[], error }`.

### UI — `components/dashboard/rescue-center/forms-tab.tsx`

- Add a third entry — **"Solicitudes"** — to the existing `edit | preview` view switcher
  (`view` state). Follow the same button styling already in that switcher.
- When `view === 'submissions'` and a form is active: fetch `listFormSubmissions(activeFormId, statusFilter)`
  and render a compact list: each row shows pet name, member email, a status pill, and the
  submitted date. Include an all/pending/approved/rejected status filter and empty/loading
  states consistent with the tab's existing spinner.
- **Read-only summary** (confirmed scope): rows do not open a detail view here. Include a
  **"Revisar en Interesados"** link/button that hands off to the existing full-review UI in
  the Interested tab. Deep-linking a row straight into the Interesados detail is a possible
  later enhancement and is **out of scope**.

### Acceptance

- Selecting a form + "Solicitudes" lists that form's submissions with a working status filter.
- The list is read-only; a clear link routes the RC to the Interested tab for full review.

---

## Cross-cutting

### i18n

Add every new string to both `es` and `en` and register in `lib/i18n/index.ts`:
- `pets`: `member.my_pets`, edit/delete labels, delete-confirm title/body, add-CTA, empty state.
- `common`/`auth`: avatar upload/"Quitar foto"/size-error strings, "Mis mascotas" nav label.
- `business` (forms namespace): "Solicitudes" tab label, per-form list column labels,
  "Revisar en Interesados".

### Testing (Vitest + RTL, `renderWithProviders`)

- **API units** (mock `fetch`/`apiClient`): `uploadAvatar` (multipart, no Content-Type),
  `deleteAvatar` (204), `updateUserPet` (PATCH path/body), `deleteUserPet` (DELETE/204),
  `listFormSubmissions` (path + `?status=`). Each asserts the `{ data, error }` shape on
  success and failure.
- **Components**: `UserPetCard` renders fields + fires edit/delete callbacks;
  `MemberAddPetModal` edit mode prefills from `pet` and calls `updateUserPet` on save;
  Forms "Solicitudes" view renders rows, empty state, and status filter.
- Frontend has no `test` script — run `npx vitest run` (or a single file path).

## Out of scope

- `POST /auth/profile/photo` (legacy) — never wired.
- Removing/reordering **existing** user-pet photos (no per-photo delete endpoint).
- Deep-linking a per-form submission row into the Interesados detail view.
- The P1 (Service Providers) and P2 (Transport) clusters — separate specs.

## Open questions to resolve during implementation

1. **PATCH vaccinated/castrated** — confirm `PATCH /user-pets/{id}` accepts/returns them
   (swagger omits them). If not, make those toggles create-only in edit mode.
2. Confirm the account-Sheet nav ordering once "Mis mascotas" is added (place near
   "Publicar mascota").

## Implementation checklist

- [ ] **P3 Avatar** — `uploadAvatar`/`deleteAvatar` in `auth.ts`; avatar control + "Quitar foto" in the account Sheet; `updateSession` refresh.
- [ ] **P3 User-pets** — `updateUserPet`/`deleteUserPet` in `user-pets.ts`.
- [ ] **P3 User-pets** — extract `UserPetCard`; new `app/mis-mascotas/{layout,page}.tsx`; account-Sheet "Mis mascotas" link.
- [ ] **P3 User-pets** — `MemberAddPetModal` edit mode (prefill + PATCH + add-photos); delete confirm dialog.
- [ ] **P3 User-pets** — resolve the vaccinated/castrated PATCH question.
- [ ] **P4 Forms** — `SubmissionListItem` + `listFormSubmissions` in `submissions.ts`; "Solicitudes" view in `forms-tab.tsx` + hand-off link.
- [ ] i18n strings (es + en) for all of the above.
- [ ] Vitest coverage for the 5 new API functions + the three UI touchpoints.
