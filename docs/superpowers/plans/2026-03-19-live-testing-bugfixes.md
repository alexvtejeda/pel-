# Live Testing Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bugs and UI issues discovered during live application testing — role selection vulnerability, UI inconsistencies, admin form wiring, and SVG upload permissions.

**Architecture:** All changes are frontend-only, touching existing components. No new files needed. Each task is independent and can be implemented in any order.

**Tech Stack:** Next.js, React, TypeScript, Font Awesome, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-19-live-testing-bugfixes-design.md`

---

## Chunk 1: Role Selection Protection + UI Fixes

### Task 1: Fix role selection vulnerability

Prevent fully onboarded users from changing their role via `/auth/role-selection`.

**Files:**
- Modify: `components/auth/role-selection.tsx`
- Modify: `components/auth/onboarding/onboarding-nav.tsx`

- [ ] **Step 1: Switch onboarding-nav from localStorage to sessionStorage**

In `components/auth/onboarding/onboarding-nav.tsx`, line 30, change:
```tsx
localStorage.setItem("pelu_changing_role", "1")
```
to:
```tsx
sessionStorage.setItem("pelu_changing_role", "1")
```

- [ ] **Step 2: Update role-selection.tsx to use sessionStorage and add onboarding check**

In `components/auth/role-selection.tsx`:

Add imports at the top:
```tsx
import { getMyRescueCenter } from '@/lib/api/rescue-centers'
import { getMyBusiness } from '@/lib/api/businesses'
```

Replace the existing `useEffect` (lines 62-67):
```tsx
useEffect(() => {
  const changingRole = localStorage.getItem('pelu_changing_role')
  if (user?.role && !submitted.current && !changingRole) {
    router.push(roleDashboardPaths[user.role])
  }
}, [user, router])
```

With:
```tsx
useEffect(() => {
  if (!user?.role || submitted.current) return

  const changingRole = sessionStorage.getItem('pelu_changing_role')

  async function checkOnboarding() {
    let onboardingComplete = false

    if (user!.role === 'rescue_center') {
      const { data } = await getMyRescueCenter()
      onboardingComplete = !!data
    } else if (user!.role === 'business') {
      const { data } = await getMyBusiness()
      onboardingComplete = !!data
    } else if (user!.role === 'member') {
      onboardingComplete = !!user!.display_name
    }

    if (onboardingComplete || !changingRole) {
      router.push(roleDashboardPaths[user!.role!])
    }
  }

  checkOnboarding()
}, [user, router])
```

- [ ] **Step 3: Clean up sessionStorage on submit**

In `components/auth/role-selection.tsx`, line 75, change:
```tsx
localStorage.removeItem('pelu_changing_role')
```
to:
```tsx
sessionStorage.removeItem('pelu_changing_role')
```

- [ ] **Step 4: Test manually**

1. Log in as a fully onboarded RC → navigate to `/auth/role-selection` → should redirect to dashboard
2. Register a new account → pick a role → go to onboarding → click "Rol" breadcrumb → should stay on role-selection
3. Close browser, reopen → navigate to `/auth/role-selection` → should redirect (sessionStorage cleared)

- [ ] **Step 5: Commit**

```bash
git add components/auth/role-selection.tsx components/auth/onboarding/onboarding-nav.tsx
git commit -m "fix: prevent role changes after onboarding completion"
```

---

### Task 2: Fix dropdown menu label

**Files:**
- Modify: `components/dashboard/rescue-center/pets-tab.tsx`

- [ ] **Step 1: Add faUsers import**

In `components/dashboard/rescue-center/pets-tab.tsx`, find the import from `@fortawesome/free-solid-svg-icons` and add `faUsers` to the import list. Remove `faUser` if it's not used elsewhere in the file.

- [ ] **Step 2: Change dropdown item**

At line ~928-929, change:
```tsx
<DropdownMenuItem onClick={() => setProfileOpen(true)}>
  <FontAwesomeIcon icon={faUser} className="text-base" /> Ver Perfil
</DropdownMenuItem>
```
to:
```tsx
<DropdownMenuItem onClick={() => setProfileOpen(true)}>
  <FontAwesomeIcon icon={faUsers} className="text-base" /> Ver interesados
</DropdownMenuItem>
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/rescue-center/pets-tab.tsx
git commit -m "fix: rename 'Ver Perfil' to 'Ver interesados' in pet dropdown"
```

---

### Task 3: Fix interested tab search bar padding

**Files:**
- Modify: `components/dashboard/rescue-center/interested-tab.tsx`

- [ ] **Step 1: Change padding**

At line ~93, change:
```tsx
<div className="flex items-center gap-2 rounded-xl border border-input px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring">
```
to:
```tsx
<div className="flex items-center gap-2 rounded-xl border border-input px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/rescue-center/interested-tab.tsx
git commit -m "fix: match interested tab search bar padding with pets tab"
```

---

### Task 4: Reduce adoption form logo header size

**Files:**
- Modify: `components/adopt/adopt-pet-page.tsx`

- [ ] **Step 1: Update banner container**

At line ~89, change:
```tsx
<div className="sticky top-0 z-10 w-full aspect-4/1 overflow-hidden">
```
to:
```tsx
<div className="sticky top-0 z-10 w-full max-h-40 overflow-hidden">
```

- [ ] **Step 2: Test manually**

Navigate to `/adopt/[pet-id]` — banner should now be capped at 160px height regardless of logo dimensions.

- [ ] **Step 3: Commit**

```bash
git add components/adopt/adopt-pet-page.tsx
git commit -m "fix: cap adoption form logo banner height to max-h-40"
```

---

### Task 5: Add size icon to pet preview cards

**Files:**
- Modify: `components/dashboard/rescue-center/add-pet-modal.tsx`
- Modify: `components/dashboard/rescue-center/pets-tab.tsx`

- [ ] **Step 1: Add faRulerVertical import to add-pet-modal.tsx**

In `components/dashboard/rescue-center/add-pet-modal.tsx`, add `faRulerVertical` to the Font Awesome import.

- [ ] **Step 2: Add size icon in add-pet-modal.tsx preview**

At lines ~116-120, change:
```tsx
<div className="flex items-center gap-2 mt-1">
  <FontAwesomeIcon icon={faSyringe} className={`text-xs ${vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <FontAwesomeIcon icon={faScissors} className={`text-xs ${castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <span className="text-xs text-muted-foreground">{size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}</span>
</div>
```
to:
```tsx
<div className="flex items-center gap-2 mt-1">
  <FontAwesomeIcon icon={faSyringe} className={`text-xs ${vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <FontAwesomeIcon icon={faScissors} className={`text-xs ${castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <FontAwesomeIcon icon={faRulerVertical} className="text-xs text-muted-foreground" />
  <span className="text-xs text-muted-foreground">{size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}</span>
</div>
```

- [ ] **Step 3: Add faRulerVertical import to pets-tab.tsx**

In `components/dashboard/rescue-center/pets-tab.tsx`, add `faRulerVertical` to the Font Awesome import.

- [ ] **Step 4: Add size icon in pets-tab.tsx card**

At lines ~913-916, change:
```tsx
<div className="flex items-center gap-1.5 mt-0.5">
  <FontAwesomeIcon icon={faSyringe} className={`text-xs ${pet.vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <FontAwesomeIcon icon={faScissors} className={`text-xs ${pet.castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
</div>
```
to:
```tsx
<div className="flex items-center gap-1.5 mt-0.5">
  <FontAwesomeIcon icon={faSyringe} className={`text-xs ${pet.vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <FontAwesomeIcon icon={faScissors} className={`text-xs ${pet.castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <FontAwesomeIcon icon={faRulerVertical} className="text-xs text-muted-foreground" />
  <span className="text-xs text-muted-foreground">{pet.size === 'small' ? 'Pequeño' : pet.size === 'medium' ? 'Mediano' : 'Grande'}</span>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/rescue-center/add-pet-modal.tsx components/dashboard/rescue-center/pets-tab.tsx
git commit -m "feat: add size icon to pet preview cards"
```

---

## Chunk 2: Admin Form Fixes + SVG Upload Permissions

### Task 6: Wire admin form template save with name + error state

**Files:**
- Modify: `components/dashboard/admin/admin-form-tab.tsx`

- [ ] **Step 1: Add formName state and loadError state**

Add `useCallback` to the React import at line 1 if not already present.

After existing state declarations (lines ~44-51), add:
```tsx
const [formName, setFormName] = useState('Plantilla de adopción')
const [loadError, setLoadError] = useState(false)
```

- [ ] **Step 2: Update the load effect to capture name and handle errors**

Replace lines ~57-61:
```tsx
useEffect(() => {
  adminApi.getFormTemplate().then(({ data }) => {
    if (data) setFields(data.fields)
    setLoading(false)
  })
}, [])
```
with:
```tsx
useEffect(() => {
  adminApi.getFormTemplate().then(({ data, error }) => {
    if (error || !data) {
      setLoadError(true)
    } else {
      setFields(data.fields)
      if (data.name) setFormName(data.name)
    }
    setLoading(false)
  })
}, [])
```

- [ ] **Step 3: Update handleSave to include name**

Change line ~67:
```tsx
const { error } = await adminApi.updateFormTemplate({ fields })
```
to:
```tsx
const { error } = await adminApi.updateFormTemplate({ name: formName, fields })
```

- [ ] **Step 4: Extract fetch into a reusable function and add error state UI**

After the state declarations, add a `loadTemplate` function and update the useEffect to use it:
```tsx
const loadTemplate = useCallback(() => {
  setLoadError(false)
  setLoading(true)
  adminApi.getFormTemplate().then(({ data, error }) => {
    if (error || !data) {
      setLoadError(true)
    } else {
      setFields(data.fields)
      if (data.name) setFormName(data.name)
    }
    setLoading(false)
  })
}, [])
```

Update the useEffect (Step 2) to simply call:
```tsx
useEffect(() => { loadTemplate() }, [loadTemplate])
```

After the loading check (after line ~143), add an error state render:
```tsx
if (loadError) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-sm text-muted-foreground">No se pudo cargar la plantilla. Verifica que el servidor esté disponible.</p>
      <Button size="sm" className="rounded-xl" onClick={loadTemplate}>
        Reintentar
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Add name input to the top bar**

In the top bar section (line ~148), add a name input between the Edit/Preview switcher and the Save button. After the closing `</div>` of the Edit/Preview switcher (the `<div className="flex gap-1">` block), add:
```tsx
{view === 'edit' && (
  <Input
    value={formName}
    onChange={e => { setFormName(e.target.value); setDirty(true) }}
    placeholder="Nombre de la plantilla"
    className="rounded-xl text-sm w-56"
  />
)}
```

This places the input visually between [Edit/Preview] and [Save] in the flex row.

Make sure `Input` is already imported (it is, at line ~12).

- [ ] **Step 6: Test manually**

1. Log in as admin → go to form template tab → should load the form with name field populated
2. Edit the name → save → should send `{ name, fields }` successfully
3. Stop backend → refresh admin form tab → should show error message with retry button

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/admin/admin-form-tab.tsx
git commit -m "fix: wire admin form save with name field and add error state"
```

---

### Task 7: Restrict SVG uploads for non-logo inputs

**Files:**
- Modify: `components/dashboard/rescue-center/add-pet-modal.tsx`
- Modify: `components/dashboard/rescue-center/pets-tab.tsx`
- Modify: `components/pets/member-add-pet-modal.tsx`
- Modify: `components/forms/form-renderer.tsx`
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx`
- Modify: `components/auth/onboarding/business-wizard.tsx`

- [ ] **Step 1: Update add-pet-modal.tsx**

Line 466, change:
```tsx
accept="image/*"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp"
```

- [ ] **Step 2: Update pets-tab.tsx (two inputs)**

Line 349, change:
```tsx
accept="image/*"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp"
```

Line 686, change:
```tsx
accept="image/*"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp"
```

- [ ] **Step 3: Update member-add-pet-modal.tsx**

Line 408, change:
```tsx
accept="image/*"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp"
```

- [ ] **Step 4: Update form-renderer.tsx**

Line 238, change:
```tsx
accept="image/*,.pdf"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp,.pdf"
```

- [ ] **Step 5: Update rescue-center-wizard.tsx**

Line 512, change:
```tsx
accept="image/*"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp"
```

- [ ] **Step 6: Update business-wizard.tsx**

Line 437, change:
```tsx
accept="image/*"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp"
```

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/rescue-center/add-pet-modal.tsx components/dashboard/rescue-center/pets-tab.tsx components/pets/member-add-pet-modal.tsx components/forms/form-renderer.tsx components/auth/onboarding/rescue-center-wizard.tsx components/auth/onboarding/business-wizard.tsx
git commit -m "fix: restrict SVG uploads for pet photos and submissions"
```

---

### Task 8: Allow SVG uploads for RC logo

**Files:**
- Modify: `components/dashboard/rescue-center/logo-upload.tsx`
- Modify: `components/dashboard/rescue-center/settings-tab.tsx`

- [ ] **Step 1: Update logo-upload.tsx**

Line 49, change:
```tsx
accept="image/png,image/jpeg,image/webp"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp,image/svg+xml"
```

- [ ] **Step 2: Update settings-tab.tsx**

Line 186, change:
```tsx
accept="image/*"
```
to:
```tsx
accept="image/png,image/jpeg,image/webp,image/svg+xml"
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/rescue-center/logo-upload.tsx components/dashboard/rescue-center/settings-tab.tsx
git commit -m "feat: allow SVG uploads for RC logo"
```
