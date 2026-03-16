# Spec B: Member Pet Upload

## Overview

Give members the ability to publish pets for adoption from the user sidebar sheet. The UI mirrors the RC add-pet-modal (two-panel form + live preview). Member pets appear in the public `/pets` grid without a verified badge and are adoptable using the admin's master form template.

## Entry Point

**File:** `components/pets/pets-header.tsx`

The user sidebar sheet (opened by clicking the profile icon) gets a new "Publicar mascota" button:
- Positioned inside the existing `<nav>` element, before the logout `<button>` (same pattern as the dashboard link)
- Icon: `faPaw` in `text-pop-550`
- Subtle highlight: `bg-pop-550/5 border border-pop-550/20` (warm tint)
- Only visible when `user?.role === 'member'`
- On click: first closes the sidebar sheet (`setSheetOpen(false)`), then opens the `MemberAddPetModal` (the modal renders at `z-50` independently of the sheet)

## Add Pet Modal

**New file:** `components/pets/member-add-pet-modal.tsx`

A dialog/modal that reuses the same two-panel layout as `components/dashboard/rescue-center/add-pet-modal.tsx`:

### Left Panel — Form

Fields (all matching RC add-pet-modal):
- **Nombre** — text input (required)
- **Especie** — select: Perro / Gato (required)
- **Género** — select: Macho / Hembra (required)
- **Edad** — number input + months/years toggle (required)
- **Tamaño** — select: Pequeño / Mediano / Grande (default: Mediano)
- **Descripción** — textarea (optional)
- **Vacunado** — checkbox with `faSyringe` icon + "Vacunado" label
- **Castrado** — checkbox with `faScissors` icon + "Castrado" label
- **Fotos** — drag-and-drop upload zone, same as RC modal

**Not included** (RC-only features):
- Conditions section (special needs checkboxes)
- Condition notes textarea

### Right Panel — Live Preview

Same card preview as RC modal:
- Shows how the pet will look in the `/pets` grid
- Updates live as the user types name and uploads photos
- Uses `CardCarousel` when photos exist, paw silhouette when not
- No verified badge (member pet)

### Submit Flow

1. User fills form and clicks "Publicar mascota"
2. `POST /api/v1/user-pets` with a single-element array wrapping the pet data (the existing `createUserPets()` in `lib/api/user-pets.ts` sends an array). The response returns the created pet with its `id`.
3. If photos: `POST /api/v1/user-pets/:id/photos` using raw `fetch` with `FormData` and `credentials: 'include'` (same multipart pattern as RC photo upload in `lib/api/pets.ts` — no manual `Content-Type` header).
4. On success: close modal and sidebar sheet, pet appears in grid on next load
5. On error: show inline error message in the modal

### Auth Gate

- Button only appears for logged-in members
- If somehow accessed without auth, the API will reject with 401

## Adoption Flow for Member Pets

When an adopter clicks "Adoptar" on a member's pet:
- The backend resolves the form using the admin's master form template — the row in `forms` table where `rescue_center_id IS NULL` (already exists per admin dashboard spec, seeded as the default template that gets copied to new RCs on approval)
- The fill page (`/adopt/[pet-id]`) works identically — `getPetForm(petId)` resolves to this master template since the pet has no associated RC
- Submissions are linked to the pet (and thus the member who owns it) via the existing `form_submissions` table

**Note:** The submission review UI for members is out of scope for this spec. For MVP, the member can see submissions via the existing notifications system (a notification is created on submission). A dedicated review interface can be added later.

## Backend Dependencies

These must be implemented before the frontend can fully work:

1. **Extend `user_pets` table:** add columns `description TEXT`, `size VARCHAR(10) DEFAULT 'medium'`, `vaccinated BOOLEAN DEFAULT false`, `castrated BOOLEAN DEFAULT false`
2. **Add photo support for user pets:** new `user_pet_photos` table (or reuse `pet_photos` with a polymorphic reference), plus `POST /api/v1/user-pets/:id/photos` endpoint
3. **Extend `POST /api/v1/user-pets`:** accept the new fields (description, size, vaccinated, castrated) — currently only accepts name, age, species, gender
4. **Extend `GET /api/v1/user-pets`:** return new fields + photos
5. **Include user pets in `GET /api/v1/pets`:** public listing should include member pets alongside RC pets, with `rescue_center_id: null` to distinguish them
6. **Form resolution for member pets:** `GET /api/v1/pets/:id/form` should fall back to the master form template when the pet has no associated RC
7. **Submission routing:** `POST /api/v1/pets/:id/submissions` should work for member pets, routing the submission to the pet owner instead of an RC

## i18n Keys

Add to `pets` namespace. Reuse existing RC modal field labels where possible (e.g., `size.small`, `size.medium`, `size.large` already exist). New keys needed:

- `member.publish_pet` — "Publicar mascota" / "Publish pet"
- `member.publish_success` — "Mascota publicada exitosamente" / "Pet published successfully"
- `member.publish_button` — "Publicar mascota" / "Publish pet" (submit button)
- `member.publish_title` — "Publicar mascota" / "Publish pet" (modal title)
- `member.drag_photos` — "Arrastra fotos o haz clic para subir" / "Drag photos or click to upload"

Other field labels (`name`, `species`, `gender`, `age`, `size`, `description`, `vaccinated`, `castrated`) should reuse existing keys from the RC add-pet-modal translations.
