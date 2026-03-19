# Bug Fixes — Live Testing Feedback (2026-03-19)

## Priority 1: Critical Bugs

- [ ] **Fix role selection vulnerability** — Switch `pelu_changing_role` from localStorage to sessionStorage. Add onboarding completion check: if user has an RC/business record or display_name set, redirect to dashboard even if flag is present. Only allow role changes during onboarding.
- [ ] **Fix admin form template** — Add error state when API returns error. Add `formName` state and name input. Wire save to send `{ name, fields }` instead of just `{ fields }`.

## Priority 2: Quick UI Fixes

- [ ] **Fix dropdown menu label** — Change "Ver Perfil" to "Ver interesados" in `pets-tab.tsx` three-dots dropdown menu
- [ ] **Fix interested tab search bar padding** — Change `py-1.5` to `py-2` in `interested-tab.tsx` search bar to match pets tab
- [ ] **Reduce adoption form logo header size** — The `aspect-[4/1]` full-width banner is too large. Constrain max-height or use a smaller aspect ratio.
- [ ] **Add size icon to pet preview card** — Add a FontAwesome icon for size in the pet preview card in `add-pet-modal.tsx`

## Priority 3: SVG Upload Permissions

- [ ] **Restrict SVG uploads for members** — In `form-renderer.tsx` file upload, change `accept` to exclude SVGs (`image/png,image/jpeg,image/webp,.pdf`)
- [ ] **Restrict SVG uploads for pet photos** — In `add-pet-modal.tsx`, `pets-tab.tsx`, and `member-add-pet-modal.tsx`, change `accept="image/*"` to `image/png,image/jpeg,image/webp`
- [ ] **Allow SVG uploads for RC logo** — Add `image/svg+xml` to the accept list in `logo-upload.tsx` and `settings-tab.tsx`

## Deferred (future phase)

- Business admin approval UI — No admin UI for business approvals exists. Delay and gradually expand.
- Form UI redesign — Adoption form page feels too big overall. Defer to refactor phase.
- Form conditional questions — Code is correct but default template needs proper follow-up configuration by user/admin.

## Review

_(To be filled after implementation)_
