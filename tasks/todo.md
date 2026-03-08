# Register Flow + Onboarding Wizards

## Tasks

- [x] 1. Update `landing-page.tsx` — unauthenticated CTA points to `/auth/register`
- [x] 2. Create `components/auth/register-page.tsx` — registration-only form (email/password + Google OAuth, "already have an account?" link to `/auth/login`)
- [x] 3. Create `app/auth/register/page.tsx` — route file
- [x] 4. Update `components/auth/role-selection.tsx` — after `setRole` succeeds, redirect to `/auth/onboarding/${role}` instead of dashboard
- [x] 5. Create `app/auth/onboarding/[role]/page.tsx` — dynamic route (protected: must be authenticated + have a role)
- [x] 6. Create `components/auth/onboarding/adopter-wizard.tsx` — steps: name → pet preference (cat/dog/both) → has pets? → thank you → `/`
- [x] 7. Create `components/auth/onboarding/owner-wizard.tsx` — steps: name → pet name → pet age → wants adoption? → thank you → `/`
- [x] 8. Create `components/auth/onboarding/rescue-center-wizard.tsx` — steps: center name → phone → address → RNC (optional) → website (optional) → instagram (required) → calls `createRescueCenter` → thank you (pending state) → `/`

## Review

### Changes made
- **Landing CTA** — unauthenticated users now go to `/auth/register` instead of `/auth/login`
- **`register-page.tsx`** — new registration-only form; mirrors login-page structure but signup-only, with "ya tienes cuenta?" link back to login
- **`app/auth/register/page.tsx`** — simple route wrapper
- **`role-selection.tsx`** — added `submitted` ref to prevent the auto-redirect `useEffect` from firing when the form submit already handles navigation; redirects to `/auth/onboarding/${role}` on success
- **`app/auth/onboarding/[role]/page.tsx`** — async server component with `generateStaticParams` (required by `output: export`); awaits `params` (Next.js 15+ Promise params); renders `OnboardingClient`
- **`onboarding-client.tsx`** — client-side auth guard + role routing; all redirects inside `useEffect` to avoid "setState during render" error
- **`adopter-wizard.tsx`** — 3-step wizard: name → pet preference (cat/dog/both) → has pets; data local only
- **`owner-wizard.tsx`** — 4-step wizard: name → pet name → pet age → wants adoption; data local only
- **`rescue-center-wizard.tsx`** — 6-step wizard: center name → phone → address → RNC (opt) → website (opt) → instagram (required); calls `createRescueCenter` on complete; shows pending thank-you screen on success

### Key bug fixes during implementation
- `useParams` returns `null` in Next.js 16 → split into async server page + client component
- `params` is a Promise in Next.js 15+ server components → added `async/await`
- `router.replace` called during render → moved all redirects into `useEffect`
- `useEffect` auto-redirect in role-selection fired after `setRole` updated user → added `submitted` ref to suppress it
