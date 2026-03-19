# Live Testing Bug Fixes — Design Spec (2026-03-19)

Addresses bugs found during live application testing. Organized by priority.

---

## 1. Role Selection Protection (Critical)

### Problem

`role-selection.tsx` uses a `pelu_changing_role` localStorage flag to let users navigate back from onboarding to change their role. This flag persists across sessions and can be set by anyone, meaning fully onboarded users (approved RCs, active members) can change their role, breaking their account.

### Design

1. **Replace `localStorage` with `sessionStorage`** for `pelu_changing_role` so it doesn't persist across browser sessions. Update both `role-selection.tsx` and `onboarding-nav.tsx`.

2. **Add onboarding completion check** in `role-selection.tsx`. In the existing `useEffect`, before allowing the user to stay on the page, check if onboarding is complete:
   - **rescue_center**: Call `getMyRescueCenter()` from `lib/api/rescue-centers.ts` — if it returns data, onboarding is complete
   - **business**: Call `getMyBusiness()` from `lib/api/businesses.ts` — if it returns data, onboarding is complete
   - **member**: Check if `user.display_name` is set (member wizard sets this)

3. **If onboarding is complete**: redirect to dashboard regardless of `sessionStorage` flag. The flag only allows role changes for users still in the onboarding flow.

### Files changed

- `components/auth/role-selection.tsx` — `sessionStorage` + async onboarding check in `useEffect`
- `components/auth/onboarding/onboarding-nav.tsx` — `sessionStorage` instead of `localStorage`

---

## 2. UI Fixes

### 2A. Dropdown menu label

**File**: `components/dashboard/rescue-center/pets-tab.tsx` (line ~929)

Change the three-dots dropdown item from:
- `faUser` + `"Ver Perfil"`

To:
- `faUsers` + `"Ver interesados"`

### 2B. Interested tab search bar padding

**File**: `components/dashboard/rescue-center/interested-tab.tsx` (line ~93)

Change `py-1.5` to `py-2` in the search bar container to match the pets tab search bar.

### 2C. Adoption form logo header size

**File**: `components/adopt/adopt-pet-page.tsx` (line ~89)

- Remove `aspect-[4/1]` from the banner container
- Add `max-h-40` to constrain height
- Keep `w-full`, `object-cover`, `sticky top-0`, `overflow-hidden`

### 2D. Pet preview size icon

**Files**: `components/dashboard/rescue-center/add-pet-modal.tsx` (line ~116), `components/dashboard/rescue-center/pets-tab.tsx` (line ~913)

Add a `faRulerVertical` icon next to the size text in the pet card preview, styled consistently with the vaccine/castrated icons (green when value is set, muted otherwise).

---

## 3. Admin Form Template Fixes

### 3A. Error state

**File**: `components/dashboard/admin/admin-form-tab.tsx`

If `getFormTemplate()` returns an error (e.g., 404), display a user-friendly message: "No se pudo cargar la plantilla. Verifica que el servidor esté disponible." with a retry button. Currently shows a blank editor with no feedback.

### 3B. Wire save with form name

**File**: `components/dashboard/admin/admin-form-tab.tsx`

The backend now expects `{ name, fields }` in the PUT body. Currently only `{ fields }` is sent.

- Add `formName` state, populated from the API response on load
- Add an editable name input in the top bar (next to Edit/Preview toggle)
- Update `handleSave` to send `{ name: formName, fields }`

### Files changed

- `components/dashboard/admin/admin-form-tab.tsx` — error state, `formName` state, name input, updated save payload

---

## 4. SVG Upload Permissions

### Problem

All file upload components use `accept="image/*"` which includes SVGs. SVGs should only be allowed for RC logo uploads (trusted users). Members and unapproved users should not be able to upload SVGs.

### Design

**Restrict SVGs** (change `accept="image/*"` to `accept="image/png,image/jpeg,image/webp"`):
- `components/dashboard/rescue-center/add-pet-modal.tsx` — pet photo upload (line ~466)
- `components/dashboard/rescue-center/pets-tab.tsx` — pet photo upload (lines ~349 and ~686, two inputs)
- `components/pets/member-add-pet-modal.tsx` — member pet photo upload (line ~408)
- `components/forms/form-renderer.tsx` — submission file upload (use `image/png,image/jpeg,image/webp,.pdf`)
- `components/auth/onboarding/rescue-center-wizard.tsx` — RC wizard photo (line ~512)
- `components/auth/onboarding/business-wizard.tsx` — business wizard photo (line ~437)

**Allow SVGs** (append `image/svg+xml` to existing accept list):
- `components/dashboard/rescue-center/logo-upload.tsx` — already uses `image/png,image/jpeg,image/webp`, append `,image/svg+xml`
- `components/dashboard/rescue-center/settings-tab.tsx` — single file input (line ~186) is for RC logo/avatar, change `image/*` to `image/png,image/jpeg,image/webp,image/svg+xml`

This is frontend-only validation. Backend MIME type enforcement is a separate concern.

---

## Deferred (not in this spec)

- **Business admin approval UI** — no admin UI for business approvals. User wants to delay and gradually expand.
- **Adoption form UI redesign** — form page feels too large overall. Defer to refactor phase.
- **Form conditional questions** — code is correct but default template needs follow-up configuration by admin.
