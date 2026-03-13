# Spec B: Onboarding Cleanup

**Date**: 2026-03-12
**Status**: Approved
**Scope**: Frontend only — `components/auth/`, `lib/types/user.ts`, `app/auth/`

## Overview

Remove the Adopter role entirely, rebuild the Member wizard using the `<Stepper>` component (from the adopter wizard's UI pattern), and clean up all adopter references. Business role backend support is out of scope (Spec D/E).

## 1. Remove Adopter Role

### Role Selection Page (`components/auth/role-selection.tsx`)
- Remove the "Adoptante" card — only 3 roles remain: **Miembro**, **Centro de rescate**, **Negocio**
- Remove `adopter` entry from `roleDashboardPaths` record
- Layout adjusts naturally (3 cards instead of 4)

### UserRole Type (`lib/types/user.ts`)
- Remove `'adopter'` from `UserRole` union type
- New type: `type UserRole = 'member' | 'rescue_center' | 'business'`

### Onboarding Client (`components/auth/onboarding/onboarding-client.tsx`)
- Remove the `role === 'adopter'` branch and `AdopterWizard` import
- Remove `'adopter'` from `validRoles` array
- Remove `adopter` entry from `roleDashboardPaths` record
- Only routes: `member` → `MemberWizard`, `rescue_center` → `RescueCenterWizard`, `business` → `BusinessWizard`

### Static Params (`app/auth/onboarding/[role]/page.tsx`)
- Remove `{ role: 'adopter' }` from `generateStaticParams()` — otherwise a dead `/auth/onboarding/adopter` route gets generated during static export

### Delete Adopter Wizard
- Delete `components/auth/onboarding/adopter-wizard.tsx` entirely
- The `<Stepper>` + `<Step>` UI pattern it used lives in `components/Stepper.tsx` — that stays

### Files affected
- `components/auth/role-selection.tsx` — remove adopter card + `roleDashboardPaths` entry
- `lib/types/user.ts` — remove `'adopter'` from union
- `components/auth/onboarding/onboarding-client.tsx` — remove adopter branch, import, `validRoles` entry, `roleDashboardPaths` entry
- `app/auth/onboarding/[role]/page.tsx` — remove adopter from `generateStaticParams()`
- `components/auth/onboarding/adopter-wizard.tsx` — delete file

## 2. Rebuild Member Wizard with Stepper

### Current
- `member-wizard.tsx` uses custom animated slides (`motion/react` `AnimatePresence`) with a manual progress bar
- Has conditional flow: Yes/No on "do you have pets?" changes subsequent steps
- Bugs: pet count input broken (can only add 0, can't type/delete/change), overflow when selecting "No"

### New
- Rebuild using `<Stepper>` + `<Step>` components from `components/Stepper.tsx`
- Same animated slide transitions and step indicators as the (former) adopter wizard
- Back/Next buttons provided by Stepper

### Questions / Flow (unchanged)
- **Step 1**: "¿Cómo te llamamos?" — display name text input
- **Step 2**: "¿Tienes mascotas?" — Yes/No toggle
- **Step 3** (if Yes): "¿Cuántas?" — pet count number input (1-10)
- **Step 4** (if Yes, repeated per pet): Pet details — name, age (months), species (dog/cat), gender (male/female)
- **Step 3** (if No): "¿Qué te trae a Pelú?" — three options: adopt, rehome, explore

With conditional `<Step>` rendering, the Stepper always sees sequential steps (1, 2, 3, maybe 4) — the branching is invisible to it.

### Conditional Step Rendering
- Conditionally render `<Step>` components in JSX
- If `hasPets === false`, omit the pet count and pet detail steps entirely
- If `hasPets === true`, omit the motivation step
- The `<Stepper>` naturally adapts to however many `<Step>` children it receives (uses `Children.toArray`)

### Stepper Component Adjustments
The `<Stepper>` needs minor extensions to support the member wizard's requirements:

1. **Spanish "Complete" button text**: The Stepper hardcodes `'Complete'` for the final step's Next button. Use the existing `nextButtonText` prop or add a `completeButtonText` prop to allow `'Completar'` on the last step.

2. **Per-step validation**: The Stepper has no built-in way to disable the Next button. Add a `disableNext` prop (boolean) that the parent controls per step. When `true`, the Next button renders as disabled and `handleNext` is a no-op.

3. **Async submission**: `onFinalStepCompleted` is called synchronously. Wrap the member wizard's async submit logic (API calls) inside `onFinalStepCompleted` — show a loading spinner on the button and prevent double-clicks by tracking a `submitting` state in the wizard component itself (not in Stepper).

### Stepper Border Radius
The Stepper container uses `rounded-4xl`. Per CLAUDE.md, cards should use `rounded-2xl`. Change the Stepper container to `rounded-2xl` for consistency.

### Pet Count Input — Pitfall to Avoid
- Must be a proper **controlled number input** (`<input type="number">`)
- User must be able to freely type, delete, and change the value
- No hard-coded defaults that can't be cleared
- Validate range 1-10, show error if out of range

### Backend Integration (preserved from current wizard)
- Save `display_name` via `PATCH /api/v1/auth/profile`
- Create user pets via the user-pets API if any were entered
- `onFinalStepCompleted` callback handles submission

### Breadcrumb
- `OnboardingNav` breadcrumb stays the same: Inicio → Registro → Rol → Miembro
- No changes needed — already shows "Miembro" for member role

### Files affected
- `components/auth/onboarding/member-wizard.tsx` — full rewrite using `<Stepper>` + `<Step>`
- `components/Stepper.tsx` — add `disableNext` prop, `completeButtonText` prop, change `rounded-4xl` → `rounded-2xl`

## 3. Business Role — No Changes

- Business card remains visible in role selection as-is
- Backend does not accept `business` as a valid role yet — this will be fixed in Spec D or a new Spec E
- No frontend changes for business flow in this spec

## i18n

No new translation keys needed — all existing member wizard text stays the same. Adopter-specific keys can be left in translation files (dead keys don't cause issues) or cleaned up opportunistically.

## Out of Scope
- Business role backend support — Spec D/E
- Business wizard implementation — separate spec
- Pet age logic (months vs years) — Spec D
- Any dashboard changes — Spec C
