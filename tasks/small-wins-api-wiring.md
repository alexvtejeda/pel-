# Small-Wins API Wiring — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-07-24-small-wins-api-wiring-design.md`
(on branch `docs/small-wins-api-wiring-spec`)
**Repo:** `frontend` only. All backend endpoints already exist — no `api/` work.
**Execution:** two parallel frontend-specialist agents in isolated git worktrees, then merge.

## Approach — why two lanes

The spec has 3 independent pieces, but Pieces 1 & 2 both edit `components/pets/pets-header.tsx`
(avatar control + "Mis mascotas" nav link) and all three register i18n in `lib/i18n/index.ts`.
So the split is by **file ownership**, not by piece:

- **Lane A** owns the member/pets account surface (Avatar + User-pets).
- **Lane B** owns the RC dashboard forms surface (per-form submissions) — no overlap with A.
- Only shared file across lanes: `lib/i18n/index.ts` (each adds different namespace registrations
  → trivial 1-line merge). Different locale namespaces, so JSON files don't collide.

Branches (both off `frontend` `main` @ 7ae36db):
- Lane A → `feature/small-wins-avatar-userpets`
- Lane B → `feature/small-wins-forms-submissions`
Merge Lane B into Lane A, resolve the `lib/i18n/index.ts` line, then PR into `main`.

---

## Lane A — Avatar + User-pets (one agent)

### A1. Avatar upload / remove (Piece 1, P3)
- [ ] `lib/api/auth.ts`: add `uploadAvatar(file)` — raw `fetch` multipart `POST /api/v1/auth/avatar`,
      `credentials:'include'`, `FormData.append('avatar', file)`, **no `Content-Type`**. Returns `{ data:{avatar_url}, error }`.
- [ ] `lib/api/auth.ts`: add `deleteAvatar()` — `apiClient('/api/v1/auth/avatar',{method:'DELETE'})`; treat 204 as success. Returns `{ data:null, error }`.
- [ ] `components/pets/pets-header.tsx`: camera overlay on the `h-16` Sheet avatar → hidden
      `<input type=file accept=png,jpeg,webp>`; client guard reject `>5MB` (mirror add-modal check) w/ toast.
- [ ] On success → `updateSession({...user, avatar_url})`; success/error toasts (Sonner).
- [ ] Show **"Quitar foto"** button only when `user.avatar_url` set → `deleteAvatar()` → `updateSession({...user, avatar_url:null})` + toast.
- [ ] No type change (`avatar_url` already on `AuthUser`), no new page.

### A2. User-pets edit/delete API (Piece 2, P3)
- [ ] `lib/api/user-pets.ts`: `updateUserPet(id, fields)` → `PATCH /api/v1/user-pets/{id}`, JSON body → `{ data:UserPet, error }`.
- [ ] `lib/api/user-pets.ts`: `deleteUserPet(id)` → `DELETE /api/v1/user-pets/{id}`; 204 → `{ data:null, error }`.
- [ ] **Resolve open question:** confirm `PATCH /user-pets/{id}` accepts/returns `vaccinated`/`castrated`
      (swagger omits them — check `api/docs/api/swagger.yaml` / live `:2701/docs`). If NOT supported →
      make those toggles create-only (grey out in edit mode). Do not block on it.

### A3. `/mis-mascotas` page + reusable card (Piece 2, P3)
- [ ] Extract inlined `PreviewCard` from `member-add-pet-modal.tsx` → new `components/pets/user-pet-card.tsx`
      (`rounded-2xl`, aspect-square `Carousel` or `faPaw` silhouette, name·age·gender·species, vacc/castr/size row).
      Point the modal's live preview at the same component (one source of truth).
- [ ] `app/mis-mascotas/layout.tsx`: `<ProtectedRoute requireRole={['member']}>` — mirror `app/chat/layout.tsx`.
- [ ] `app/mis-mascotas/page.tsx`: shared `pets-header.tsx` on top; `listUserPets()` → grid of `UserPetCard`;
      "Añadir mascota" CTA opens `MemberAddPetModal` (create) → refresh on add; empty state w/ same CTA.
- [ ] Each card: **Edit** (`faPen`) → modal edit mode; **Delete** (`faTrash`) → confirm dialog.

### A4. Edit + delete flows (Piece 2, P3)
- [ ] `MemberAddPetModal`: optional `pet?:UserPet` prop. Present → title/CTA "Editar"/"Guardar cambios",
      prefill all fields, show existing photos. Save → `updateUserPet(pet.id, fields)` (PATCH) instead of create.
- [ ] Photos in edit: new photos → `uploadUserPetPhotos(pet.id, files)`. Removing/reordering **existing** photos out of scope.
- [ ] Prefill age: set input to stored value with unit toggle on **"months"** so the save-time years→months conversion round-trips.
- [ ] Delete: `faTrash` → shadcn `AlertDialog` (same primitive `forms-tab.tsx` uses) → `deleteUserPet(id)` →
      optimistic removal + toast; restore card + error toast on failure.

### A5. Entry point (Piece 2, P3)
- [ ] `pets-header.tsx` account Sheet: add member-only **"Mis mascotas"** nav item (`faPaw`) → `/mis-mascotas`.
- [ ] Keep existing "Publicar mascota" quick-action. **No** public-nav / bottom-nav link.

### A6. i18n (Lane A)
- [ ] `pets` namespace (es + en): `member.my_pets`, edit/delete labels, delete-confirm title/body, add-CTA, empty state.
- [ ] `common`/`auth` (es + en): avatar upload / "Quitar foto" / size-error strings, "Mis mascotas" nav label.
- [ ] Register any new namespace file in `lib/i18n/index.ts` (existing `pets`/`common`/`auth` need no re-register).

### A7. Tests (Lane A) — `npx vitest run`
- [ ] API units (mock fetch/apiClient): `uploadAvatar` (multipart, no Content-Type), `deleteAvatar` (204),
      `updateUserPet` (PATCH path/body), `deleteUserPet` (DELETE/204) — assert `{data,error}` on success + failure.
- [ ] Components: `UserPetCard` renders fields + fires edit/delete callbacks; `MemberAddPetModal` edit mode
      prefills from `pet` and calls `updateUserPet` on save.

---

## Lane B — Per-form submissions (one agent, parallel)

### B1. API (Piece 3, P4)
- [ ] `lib/api/submissions.ts`: export `SubmissionListItem` = `{ id, pet_name, member_email, status, submitted_at }`.
- [ ] `listFormSubmissions(formId, status?)` → `GET /api/v1/forms/{id}/submissions` (+ optional `?status=`) → `{ data:SubmissionListItem[], error }`.

### B2. UI (Piece 3, P4)
- [ ] `components/dashboard/rescue-center/forms-tab.tsx`: add third **"Solicitudes"** entry to the `edit|preview`
      view switcher (same button styling).
- [ ] When `view==='submissions'` + active form: fetch `listFormSubmissions(activeFormId, statusFilter)`;
      compact rows (pet name · member email · status pill · submitted date); all/pending/approved/rejected filter; loading/empty states consistent with tab spinner.
- [ ] Read-only — no per-row detail. Add **"Revisar en Interesados"** hand-off link to the Interested tab.

### B3. i18n (Lane B)
- [ ] `business` (forms) namespace (es + en): "Solicitudes" label, per-form column labels, "Revisar en Interesados".
- [ ] Register in `lib/i18n/index.ts` if a new file (shared file with Lane A — merge point).

### B4. Tests (Lane B) — `npx vitest run`
- [ ] API unit: `listFormSubmissions` (path + `?status=`) — `{data,error}` success + failure.
- [ ] Component: Forms "Solicitudes" view renders rows, empty state, and status filter.

---

## Integration (orchestrator, after both lanes)
- [ ] Verify each lane: `npx tsc --noEmit` clean + `npx vitest run` green in its worktree.
- [ ] Merge Lane B → Lane A; resolve `lib/i18n/index.ts` (both may add registration lines).
- [ ] Full `npx tsc --noEmit` + `npx vitest run` on the merged branch.
- [ ] Confirm avatar refresh live (no reload), `/mis-mascotas` reachable only via account Sheet,
      forms "Solicitudes" filter works + hand-off routes to Interesados.
- [ ] Open PR into `frontend` `main`.

## Out of scope (from spec)
- `POST /auth/profile/photo` (legacy). Removing/reordering existing user-pet photos. Deep-linking a
  submission row into Interesados detail. Transport (P2) + Service Providers (P1) — separate specs.

## Review

### Status (2026-07-25)

**Frontend — DONE, integrated, PR held.** Two lanes ran in parallel worktrees, merged into
`feature/small-wins-api-wiring` (off `main`):
- Lane A (avatar + user-pets + `/mis-mascotas`): branch `feature/small-wins-avatar-userpets` @ `da119a4`.
- Lane B (per-form submissions): branch `feature/small-wins-forms-submissions` @ `50dcb4d`.
- Merge auto-resolved (only `public/locales/{es,en}/pets.json` overlapped — different keys; JSON validated, both key sets present). `lib/i18n/index.ts` untouched by both (reused existing `pets`/`common` namespaces).
- Integrated branch: `tsc --noEmit` 0 new errors; vitest 291 pass / 1 fail. The 1 failure (`design-system.test.ts` inline-style guard → `transitions/transition-overlay.tsx`) and the 2 `tsc` errors (`transition-link.test.tsx`) are **pre-existing `main` debt** — offending files byte-identical to `main`, failure reproduces on plain `main`.

**Deviations worth remembering:**
- Lane B put its new strings in the `pets` namespace (`forms.subs_*`), not `business` — because `forms-tab.tsx` uses `useTranslation('pets')`. Correct call.
- Lane B added a 1-line callback prop in `dashboard-shell.tsx` (parent owns the tab switch) to wire the "Revisar en Interesados" hand-off.

**`vaccinated`/`castrated` → greyed out (as instructed).** Root cause is deeper than the spec's caveat:
`user_pets` has **no `vaccinated`/`castrated` columns at all** (unlike `pets`), and `internal/userpets/`
references them nowhere. So the toggles are disabled+greyed in edit mode; `listUserPets()` never returns
them either (cards/prefill read "unset").

**Backend follow-up — DONE.** `api/` worktree, branch `feature/user-pets-vaccinated-castrated` @ `b636ff3`
(off `api` `main` @ `30cdb40`): migration `000045` adds the two columns; wires
create(`bool`)/update(`*bool` partial, `COALESCE`)/list/get/`userPetResponse`; `make swagger` ran; 4
DB-backed tests green against `pelu_test`. Contract: `POST /user-pets` booleans (default false),
`PATCH /user-pets/{id}` partial `*bool`, `userPetResponse` always returns both. (Flagged: no list
**filter** on member pets — not requested.)

**Frontend un-grey — DONE.** `feature/small-wins-api-wiring` @ `ca474f3`: toggles enabled in edit mode,
`vaccinated`/`castrated` sent in the PATCH payload (prefill already read them), obsolete create-only note +
i18n key removed. tsc clean (only pre-existing errors), modal test asserts editability + payload; 16/16 green.

### Decisions
- **One combined frontend PR** ships all four pieces from `feature/small-wins-api-wiring`.
- Deploy ordering: apply migration `000045` to the target env **before/with** the frontend, else the
  un-greyed toggles send `vaccinated`/`castrated` to an API that silently ignores them (no error, just no persist).

### Branch state (all local, unpushed)
- Frontend integrated: `feature/small-wins-api-wiring` @ `ca474f3` (in worktree `frontend-wt-avatar-userpets`).
- Backend: `feature/user-pets-vaccinated-castrated` @ `b636ff3` (in worktree `api-wt-userpets-vaxcastr`).

### Shipped (2026-07-25) — merged to LOCAL main, unpushed
- Backend `feature/user-pets-vaccinated-castrated` → `api` local `main` (ff).
- Frontend `feature/small-wins-api-wiring` → `frontend` local `main` (ff). Checkout restored to `docs/service-providers-wiring-spec`.
- Worktrees removed.

### Post-merge dev fixes (2026-07-25)
1. **Dev DB migrate:** migration `000045` had only hit `pelu_test`; applied it to dev `pelu`
   (backup `api/pelu-dev-backup-2026-07-25_153535-pre-000045.sql`). See [[project_dev_manual_migrations]].
2. **Pre-existing photo-upload bug** (surfaced, not introduced by us): `userpets.UploadPhoto`
   read a single `photo` field while the frontend sends `photos` (plural, multi) → "photo field
   is required" whenever a member pet was published with photos. Fixed on `fix/user-pets-photo-upload`
   → `api` local `main` @ `47c9f2e`: handler now reads `r.MultipartForm.File["photos"]` and loops
   (mirrors `pets.UploadPhotos`), returns the array, + handler test. Rebuilt the API image (`docker compose up --build -d`).
