# RC Registration Flow Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the inline optional pet upload from the RC registration wizard and offer it as a clearly separate post-registration step on the success screen.

**Architecture:** Single-file refactor of `rescue-center-wizard.tsx`. The pet upload fields/logic move from the main form into a new conditional view on the success screen. No new files, no new routes, no backend changes.

**Tech Stack:** React 19, Next.js App Router, FontAwesome, Framer Motion (CardCarousel), i18next

---

### Task 1: Add i18n Keys

**Files:**
- Modify: `public/locales/es/auth.json`
- Modify: `public/locales/en/auth.json`
- Modify: `lib/i18n/index.ts` (only if auth namespace isn't already imported — verify first)

- [ ] **Step 1: Add Spanish keys to `public/locales/es/auth.json`**

Add these keys inside the existing JSON object:

```json
"rc_wizard": {
  "success_title": "¡Te has registrado exitosamente!",
  "success_subtitle": "Un administrador revisará tu solicitud. Te notificaremos cuando seas aprobado.",
  "add_pets_prompt": "Agregar mascotas mientras esperas",
  "go_home": "Ir al inicio",
  "pet_added": "¡Mascota agregada exitosamente!",
  "add_another": "Agregar otra mascota"
}
```

- [ ] **Step 2: Add English keys to `public/locales/en/auth.json`**

```json
"rc_wizard": {
  "success_title": "You've registered successfully!",
  "success_subtitle": "An administrator will review your application. We'll notify you when approved.",
  "add_pets_prompt": "Add pets while you wait",
  "go_home": "Go home",
  "pet_added": "Pet added successfully!",
  "add_another": "Add another pet"
}
```

- [ ] **Step 3: Verify auth namespace is imported in `lib/i18n/index.ts`**

Check that `auth.json` is already imported for both locales. If not, add the import. It almost certainly is already imported — just verify.

- [ ] **Step 4: Commit**

```bash
git add public/locales/es/auth.json public/locales/en/auth.json
git commit -m "feat(i18n): add RC wizard post-registration keys"
```

---

### Task 2: Remove Optional Pet Section from Main Form

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx`

This task strips the optional pet section from the main form. The pet upload will be re-added to the success screen in Task 3.

- [ ] **Step 1: Remove pet-related state variables**

Remove these state declarations (lines ~86-97):

```typescript
// Remove all of these:
const [petName, setPetName] = useState('')
const [petDescription, setPetDescription] = useState('')
const [petAge, setPetAge] = useState('')
const [petGender, setPetGender] = useState<'male' | 'female'>('male')
const [petSpecies, setPetSpecies] = useState<'dog' | 'cat'>('dog')
const [petAgeUnit, setPetAgeUnit] = useState<'months' | 'years'>('years')
const [petVaccinated, setPetVaccinated] = useState(false)
const [petCastrated, setPetCastrated] = useState(false)
const [petSize, setPetSize] = useState<'small' | 'medium' | 'large'>('medium')
const [petPhotos, setPetPhotos] = useState<PendingPhoto[]>([])
const [dragging, setDragging] = useState(false)
const photoInputRef = useRef<HTMLInputElement>(null)
const MAX_PHOTOS = 5
```

Also remove the `addFiles` function (lines ~106-115), the `hasPetData` const (line ~119), and the `PendingPhoto` interface (lines ~27-30).

- [ ] **Step 2: Simplify `handleSubmit` — remove pet creation logic**

Replace the current `handleSubmit` with a version that only creates the rescue center:

```typescript
const handleSubmit = async () => {
  if (!centerName.trim() || !phone.trim() || !address.trim()) return
  setSubmitting(true)
  setSubmitError(null)

  const { error } = await createRescueCenter({
    name: centerName.trim(),
    phone: phone.trim(),
    address: address.trim(),
    ...(rnc.trim() && { rnc: rnc.trim() }),
    ...(website.trim() && { website: website.trim() }),
    ...(instagram.trim() && { instagram: instagram.trim() }),
  })

  if (error) {
    setSubmitError(error)
    setSubmitting(false)
    return
  }

  setSubmitting(false)

  const { data: mfaData } = await getMethods()
  if (mfaData?.mfa_enabled) {
    setSubmitted(true)
  } else {
    setShowMfaEnrollment(true)
  }
}
```

- [ ] **Step 3: Remove optional pet UI from the JSX**

Remove everything from the `"Opcional" divider` comment (line ~338) down to the end of the photo grid section (line ~592). This is the entire `<div className="grid grid-cols-2 gap-y-8">` block.

Keep the footer buttons (`Cambiar rol` + `Enviar solicitud`) and the error display — move them up so they sit directly after the center info fields `</div>` closing tag (after the Instagram field).

The footer and error sections should be direct children of `<main>`, not nested in any grid:

```tsx
{/* Footer */}
<div className="flex items-center justify-between mt-10">
  <button
    type="button"
    onClick={() => {
      sessionStorage.setItem('pelu_changing_role', '1')
      router.push('/auth/role-selection')
    }}
    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
    Cambiar rol
  </button>
  <button
    type="button"
    onClick={handleSubmit}
    disabled={!canSubmit}
    className="px-8 py-3 bg-pop-550 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {submitting ? 'Enviando…' : 'Enviar solicitud →'}
  </button>
</div>

{submitError && (
  <div className="animate-wiggle mt-8 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
    {submitError}
  </div>
)}
```

- [ ] **Step 4: Clean up unused imports**

Remove imports that are no longer needed after removing the pet section:

```typescript
// Remove these from the icon imports:
faPaw, faArrowUpFromBracket, faPlus, faXmark, faMars, faVenus, faDog, faCat, faSyringe, faScissors

// Remove these module imports:
import Carousel from '@/components/Carousel'
import { createPet, uploadPhotos } from '@/lib/api/pets'
```

Also remove the `CardCarousel` local component (lines ~32-65) and the `PendingPhoto` interface.

Keep: `faArrowLeft` (used in footer), `faPaw` (will be needed in Task 3 success screen).

- [ ] **Step 5: Verify the form renders correctly**

Run the dev server and navigate to `/auth/role-selection` → select `rescue_center`. The form should show only center info fields (name, phone, address, RNC, website, Instagram) with the footer buttons. No pet section.

- [ ] **Step 6: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "refactor: remove inline optional pet section from RC wizard"
```

---

### Task 3: Redesign Success Screen with Pet Upload Offer

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx`

This task transforms the static success screen into an interactive decision point that offers optional pet upload.

- [ ] **Step 1: Add pet-related state and helpers back (scoped to success screen)**

Add these state variables inside the `RescueCenterWizard` component, after the existing state declarations. These only activate on the success screen:

```typescript
// Post-registration pet upload state
const [showPetForm, setShowPetForm] = useState(false)
const [petName, setPetName] = useState('')
const [petDescription, setPetDescription] = useState('')
const [petAge, setPetAge] = useState('')
const [petGender, setPetGender] = useState<'male' | 'female'>('male')
const [petSpecies, setPetSpecies] = useState<'dog' | 'cat'>('dog')
const [petAgeUnit, setPetAgeUnit] = useState<'months' | 'years'>('years')
const [petVaccinated, setPetVaccinated] = useState(false)
const [petCastrated, setPetCastrated] = useState(false)
const [petSize, setPetSize] = useState<'small' | 'medium' | 'large'>('medium')
const [petPhotos, setPetPhotos] = useState<PendingPhoto[]>([])
const [dragging, setDragging] = useState(false)
const [petSubmitting, setPetSubmitting] = useState(false)
const [petAdded, setPetAdded] = useState(false)
const photoInputRef = useRef<HTMLInputElement>(null)
const MAX_PHOTOS = 5
```

Re-add the `PendingPhoto` interface, `addFiles` helper, `CardCarousel` component, and the necessary imports (`Carousel`, `createPet`, `uploadPhotos`, and the pet-related FA icons).

- [ ] **Step 2: Add pet submit handler**

```typescript
const handlePetSubmit = async () => {
  if (!petName.trim()) return
  setPetSubmitting(true)

  try {
    const pet = await createPet({
      name: petName.trim(),
      description: petDescription.trim(),
      age: petAge !== '' ? (petAgeUnit === 'years' ? parseInt(petAge, 10) * 12 : parseInt(petAge, 10)) : 0,
      gender: petGender,
      species: petSpecies,
      vaccinated: petVaccinated,
      castrated: petCastrated,
      size: petSize,
    })
    if (petPhotos.length > 0) {
      await uploadPhotos(pet.id, petPhotos.map((p) => p.file))
    }
    petPhotos.forEach((p) => URL.revokeObjectURL(p.url))
    setPetAdded(true)
  } catch {
    // Pet creation failure — show error but don't break flow
  }
  setPetSubmitting(false)
}

const resetPetForm = () => {
  setPetName('')
  setPetDescription('')
  setPetAge('')
  setPetGender('male')
  setPetSpecies('dog')
  setPetAgeUnit('years')
  setPetVaccinated(false)
  setPetCastrated(false)
  setPetSize('medium')
  setPetPhotos([])
  setPetAdded(false)
}
```

- [ ] **Step 3: Replace the success screen JSX**

Replace the current `if (submitted)` block with a new version that has three states:

**State A — Decision point** (default when `submitted && !showPetForm && !petAdded`):

```tsx
if (submitted) {
  return (
    <div className="backdark relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <BackgroundBeams />
      <div className="relative z-10 w-full max-w-md text-center space-y-6 bg-background/90 backdrop-blur-xl p-16 rounded-2xl inset-shadow-[1px_1px_1px_var(--color-input)]">
        {petAdded ? (
          <>
            <FontAwesomeIcon icon={faPaw} className="text-6xl text-pop-550" />
            <h1 className="text-2xl font-bold text-foreground">{t('rc_wizard.pet_added')}</h1>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { resetPetForm(); setShowPetForm(true) }}
                className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                {t('rc_wizard.add_another')}
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors"
              >
                {t('rc_wizard.go_home')}
              </button>
            </div>
          </>
        ) : showPetForm ? null : (
          <>
            <FontAwesomeIcon icon={faPaw} className="text-6xl text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">{t('rc_wizard.success_title')}</h1>
            <p className="text-muted-foreground">{t('rc_wizard.success_subtitle')}</p>
            <div className="p-4 bg-muted border border-border rounded-2xl text-sm text-muted-foreground">
              Estado: <span className="font-medium text-foreground">Pendiente de aprobación</span>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowPetForm(true)}
                className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                {t('rc_wizard.add_pets_prompt')}
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors"
              >
                {t('rc_wizard.go_home')}
              </button>
            </div>
          </>
        )}
      </div>
      {showPetForm && !petAdded && (
        {/* Pet form renders here — see Step 4 */}
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add the pet upload form inside the success screen**

When `showPetForm && !petAdded`, render the pet form instead of the centered card. Use the same dark-themed layout as the main wizard form:

```tsx
{showPetForm && !petAdded && (
  <div className="relative z-10 w-full max-w-230 mx-auto bg-background/30 backdrop-blur-sm rounded-2xl px-8 py-12 pb-20 inset-shadow-[-1px_1px_1px_1px_var(--color-input)]">
    <h1 className="text-2xl font-bold tracking-tight mb-1">{t('rc_wizard.add_pets_prompt')}</h1>
    <p className="text-sm text-muted-foreground mb-10">{t('rc_wizard.success_subtitle')}</p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-8">
      {/* Left: Pet fields */}
      <div className="flex flex-col gap-5">
        {/* Pet name, description, age, gender, species, vaccinated, castrated, size */}
        {/* Reuse exact same field JSX from the old optional section */}
      </div>

      {/* Right: Photo upload + preview */}
      <div className="flex flex-col gap-2">
        {/* Reuse exact same photo upload JSX from the old optional section */}
      </div>

      {/* Footer */}
      <div className="col-span-full flex items-center justify-between">
        <button
          type="button"
          onClick={() => { setShowPetForm(false); resetPetForm() }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          Volver
        </button>
        <button
          type="button"
          onClick={handlePetSubmit}
          disabled={!petName.trim() || petSubmitting}
          className="px-8 py-3 bg-pop-550 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {petSubmitting ? 'Guardando…' : 'Guardar mascota →'}
        </button>
      </div>
    </div>
  </div>
)}
```

The pet fields and photo upload JSX are identical to what was removed in Task 2 — copy them directly. The only difference is the layout wrapper (now a `grid grid-cols-1 md:grid-cols-2` instead of the old `grid grid-cols-2 gap-y-8`).

- [ ] **Step 5: Add `useTranslation` hook**

At the top of the component, add:

```typescript
const { t } = useTranslation('auth')
```

And add the import:

```typescript
import { useTranslation } from 'react-i18next'
```

- [ ] **Step 6: Verify the complete flow**

1. Navigate to `/auth/role-selection` → select `rescue_center`
2. Fill in center info → submit
3. Complete MFA enrollment (or skip if already set up)
4. See the success screen with two buttons
5. Click "Agregar mascotas mientras esperas" → see pet form
6. Fill in pet info → submit → see "Mascota agregada" confirmation
7. Click "Agregar otra" → form resets
8. Click "Ir al inicio" → redirects to `/`

- [ ] **Step 7: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "feat: add post-registration pet upload offer to RC wizard success screen"
```
