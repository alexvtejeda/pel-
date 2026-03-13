# Frontend Form Fixes + Vaccinated/Castrated/Size Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix API mismatches blocking the form builder and adoption flow, add vaccinated/castrated/size fields to all pet creation/edit surfaces, and enable filtering.

**Architecture:** API layer fixes first (forms PATCH→PUT, Pet types, PetFilters), then UI changes radiate outward — AddPetModal, EditPetModal, RC wizard, pet detail, public grid. No new files created; all changes modify existing files.

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS, Font Awesome 6, react-i18next

**Spec:** `docs/superpowers/specs/2026-03-13-frontend-form-fixes-design.md`

---

## Chunk 1: API Layer Fixes

### Task 1: Fix updateForm HTTP method

**Files:**
- Modify: `lib/api/forms.ts:77`

- [ ] **Step 1: Change PATCH to PUT**

In `lib/api/forms.ts`, line 77, change:
```ts
method: 'PATCH',
```
to:
```ts
method: 'PUT',
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean compilation (no new errors)

- [ ] **Step 3: Commit**

```bash
git add lib/api/forms.ts
git commit -m "fix: updateForm uses PUT to match backend"
```

---

### Task 2: Add vaccinated/castrated/size to Pet API types

**Files:**
- Modify: `lib/api/pets.ts:19-51`

- [ ] **Step 1: Add fields to Pet interface**

In `lib/api/pets.ts`, add three fields to the `Pet` interface (after `condition_notes` line 31):

```ts
vaccinated: boolean
castrated: boolean
size: 'small' | 'medium' | 'large'
```

- [ ] **Step 2: Update createPet input type**

In `lib/api/pets.ts`, line 41, update the `createPet` data parameter to include:

```ts
export async function createPet(data: {
  name: string; description: string; age: number;
  gender: 'male' | 'female'; species: 'dog' | 'cat';
  vaccinated: boolean; castrated: boolean;
  size: 'small' | 'medium' | 'large';
  conditions?: string[]; condition_notes?: string
}): Promise<Pet> {
```

- [ ] **Step 3: Update updatePet input type**

In `lib/api/pets.ts`, line 47, update the `updatePet` data parameter to include:

```ts
export async function updatePet(id: string, data: {
  name?: string; description?: string; age?: number;
  gender?: 'male' | 'female'; species?: 'dog' | 'cat';
  vaccinated?: boolean; castrated?: boolean;
  size?: 'small' | 'medium' | 'large';
  conditions?: string[]; condition_notes?: string
}): Promise<Pet> {
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in files that call `createPet()` without the new required fields — this is expected and will be fixed in later tasks.

- [ ] **Step 5: Commit**

```bash
git add lib/api/pets.ts
git commit -m "feat: add vaccinated/castrated/size to Pet types"
```

---

### Task 3: Add vaccinated/castrated to PetFilters

**Files:**
- Modify: `lib/api/pets-public.ts:6-23`

- [ ] **Step 1: Add to PetFilters interface**

In `lib/api/pets-public.ts`, add to the `PetFilters` interface (after `lng` line 11):

```ts
vaccinated?: boolean
castrated?: boolean
```

- [ ] **Step 2: Add query param serialization**

In `listPublicPets()`, after the `lng` query param line (line 23), add:

```ts
if (params?.vaccinated != null) query.set('vaccinated', String(params.vaccinated))
if (params?.castrated != null) query.set('castrated', String(params.castrated))
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Same errors as before (createPet callers), no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/pets-public.ts
git commit -m "feat: add vaccinated/castrated to PetFilters"
```

---

## Chunk 2: Pet Detail + AddPetModal

### Task 4: Hide Adopt button for RC and business roles

**Files:**
- Modify: `components/pets/pet-detail.tsx:184-198`

- [ ] **Step 1: Replace the adopt/login conditional**

In `components/pets/pet-detail.tsx`, find the current two-branch conditional for the adopt button (around lines 184-198). It currently shows the Adopt button when `user` exists, and the login link when not.

Replace with a three-branch conditional:

```tsx
{user && user.role !== 'rescue_center' && user.role !== 'business' ? (
  <button
    onClick={handleAdopt}
    className="w-full py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
  >
    {t('detail.adopt')}
  </button>
) : !user ? (
  <Link
    href="/auth/login"
    className="block w-full py-3 text-center bg-secondary text-foreground rounded-xl font-medium hover:bg-accent transition-colors"
  >
    {t('detail.login_prompt')}
  </Link>
) : null}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Same createPet errors, no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/pets/pet-detail.tsx
git commit -m "fix: hide Adopt button for rescue_center and business roles"
```

---

### Task 5: Add vaccinated/castrated/size to AddPetModal

**Files:**
- Modify: `components/dashboard/rescue-center/add-pet-modal.tsx`

- [ ] **Step 1: Add imports**

Add `faSyringe` and `faScissors` to the Font Awesome imports at the top of the file:

```ts
import { ..., faSyringe, faScissors } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 2: Update AddPetFormData interface**

Add to the exported `AddPetFormData` interface (around lines 20-29):

```ts
vaccinated: boolean
castrated: boolean
size: 'small' | 'medium' | 'large'
```

- [ ] **Step 3: Add state variables**

After the existing pet state variables (age, gender, species, etc.), add:

```ts
const [vaccinated, setVaccinated] = useState(false)
const [castrated, setCastrated] = useState(false)
const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
```

- [ ] **Step 4: Update reset() function**

Add to the `reset()` function (around lines 161-174):

```ts
setVaccinated(false)
setCastrated(false)
setSize('medium')
```

- [ ] **Step 5: Include in handleConfirm**

In `handleConfirm`, include the new fields in the `onConfirm()` call:

```ts
onConfirm({ ...existingFields, vaccinated, castrated, size })
```

- [ ] **Step 6: Add UI — vaccinated/castrated checkboxes + size dropdown**

After the age/gender input section, add:

```tsx
{/* Vaccinated / Castrated / Size */}
<div className="grid grid-cols-2 gap-3">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={vaccinated}
      onChange={(e) => setVaccinated(e.target.checked)}
      className="w-4 h-4 rounded accent-pop-550"
    />
    <FontAwesomeIcon icon={faSyringe} className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-sm">Vacunado</span>
  </label>
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={castrated}
      onChange={(e) => setCastrated(e.target.checked)}
      className="w-4 h-4 rounded accent-pop-550"
    />
    <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-sm">Castrado</span>
  </label>
</div>
<div>
  <label className="block text-sm font-medium mb-1">Tamaño</label>
  <select
    value={size}
    onChange={(e) => setSize(e.target.value as 'small' | 'medium' | 'large')}
    className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
  >
    <option value="small">{t('size.small')}</option>
    <option value="medium">{t('size.medium')}</option>
    <option value="large">{t('size.large')}</option>
  </select>
</div>
```

- [ ] **Step 7: Update PreviewCard props and display**

Add `vaccinated`, `castrated`, `size` to `PreviewCard` props. Show badges below the info line:

```tsx
<div className="flex items-center gap-2 mt-1">
  <FontAwesomeIcon icon={faSyringe} className={`w-3 h-3 ${vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <FontAwesomeIcon icon={faScissors} className={`w-3 h-3 ${castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
  <span className="text-xs text-muted-foreground">{t(`size.${size}`)}</span>
</div>
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Remaining errors in `pets-tab.tsx` (handleAddPetConfirm doesn't pass new fields yet) and `rescue-center-wizard.tsx`.

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/rescue-center/add-pet-modal.tsx
git commit -m "feat: add vaccinated/castrated/size to AddPetModal"
```

---

## Chunk 3: EditPetModal + Dashboard Filters

### Task 6: Add toggles to EditPetModal + enable dashboard filters + update handleAddPetConfirm

**Files:**
- Modify: `components/dashboard/rescue-center/pets-tab.tsx`

- [ ] **Step 1: Add imports**

Add `faSyringe` and `faScissors` to the Font Awesome imports:

```ts
import { ..., faSyringe, faScissors } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 2: Update handleAddPetConfirm**

In `handleAddPetConfirm`, pass the new fields from `AddPetFormData` to `createPet()`:

```ts
const pet = await createPet({
  ...existingFields,
  vaccinated: data.vaccinated,
  castrated: data.castrated,
  size: data.size,
})
```

- [ ] **Step 3: Add state to EditPetModal**

Add state variables inside the EditPetModal component:

```ts
const [vaccinated, setVaccinated] = useState(false)
const [castrated, setCastrated] = useState(false)
const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
```

Pre-populate from pet data in the existing useEffect that loads pet data:
```ts
setVaccinated(pet.vaccinated ?? false)
setCastrated(pet.castrated ?? false)
setSize(pet.size ?? 'medium')
```

- [ ] **Step 4: Update onSave callback type**

Update the EditPetModal's `onSave` prop type to include the new fields:

```ts
onSave: (updates: {
  name?: string; description?: string; age?: number;
  gender?: 'male' | 'female'; species?: 'dog' | 'cat';
  vaccinated?: boolean; castrated?: boolean;
  size?: 'small' | 'medium' | 'large';
  conditions?: string[]; condition_notes?: string;
}) => Promise<void>
```

Include in the save call:
```ts
await onSave({ ...existingUpdates, vaccinated, castrated, size })
```

- [ ] **Step 5: Update handleEditSave**

In `handleEditSave`, pass new fields through to `updatePet()`:

```ts
await updatePet(petId, { ...updates })
```

(The `updates` object already contains the new fields from the onSave call.)

- [ ] **Step 6: Add EditPetModal UI**

Add the same vaccinated/castrated checkboxes and size dropdown as in AddPetModal (same HTML, same styling).

- [ ] **Step 7: Update Filters interface and helpers**

Add to the `Filters` interface:
```ts
vaccinated: Set<string>
castrated: Set<string>
```

Update `emptyFilters()`:
```ts
return { species: new Set(), gender: new Set(), conditions: new Set(), vaccinated: new Set(), castrated: new Set() }
```

Update `countActiveFilters()` to include `+ f.vaccinated.size + f.castrated.size`.

- [ ] **Step 8: Enable vaccinated/castrated filter pills**

Remove the `opacity-50 pointer-events-none` or "Próximamente" tooltip styling from the vaccinated and castrated filter pill buttons. Wire them to toggle entries in `filters.vaccinated` and `filters.castrated` Sets using the existing `toggleFilter` pattern.

- [ ] **Step 9: Update filteredPets useMemo**

Add filtering logic for vaccinated/castrated:

```ts
if (filters.vaccinated.size > 0) {
  const wantVaccinated = filters.vaccinated.has('yes')
  filtered = filtered.filter(p => p.vaccinated === wantVaccinated)
}
if (filters.castrated.size > 0) {
  const wantCastrated = filters.castrated.has('yes')
  filtered = filtered.filter(p => p.castrated === wantCastrated)
}
```

- [ ] **Step 10: Add icons to grid cards**

On each pet card in the grid, add small `faSyringe` / `faScissors` icons:

```tsx
<FontAwesomeIcon icon={faSyringe} className={`w-3 h-3 ${pet.vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
<FontAwesomeIcon icon={faScissors} className={`w-3 h-3 ${pet.castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
```

- [ ] **Step 11: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Only remaining errors should be in `rescue-center-wizard.tsx` (createPet missing new fields).

- [ ] **Step 12: Commit**

```bash
git add components/dashboard/rescue-center/pets-tab.tsx
git commit -m "feat: vaccinated/castrated/size in EditPetModal + enable dashboard filters"
```

---

## Chunk 4: RC Wizard + Public Grid + i18n

### Task 7: Add fields to rescue center wizard

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx`

- [ ] **Step 1: Add imports**

Add `faSyringe` and `faScissors` to Font Awesome imports.

- [ ] **Step 2: Add state variables**

After the existing pet state variables (~line 79):

```ts
const [petVaccinated, setPetVaccinated] = useState(false)
const [petCastrated, setPetCastrated] = useState(false)
const [petSize, setPetSize] = useState<'small' | 'medium' | 'large'>('medium')
```

- [ ] **Step 3: Update createPet call**

In the `createPet()` call (~line 128), add the new fields:

```ts
const pet = await createPet({
  name: petName.trim(),
  description: petDescription.trim(),
  age: petAge !== '' ? parseInt(petAge, 10) : 0,
  gender: petGender,
  species: petSpecies,
  vaccinated: petVaccinated,
  castrated: petCastrated,
  size: petSize,
})
```

- [ ] **Step 4: Add UI after species toggle buttons**

After the species toggle buttons (~line 402), add:

```tsx
{/* Vaccinated / Castrated */}
<div className="flex gap-4 mt-3">
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={petVaccinated} onChange={e => setPetVaccinated(e.target.checked)} className="w-4 h-4 rounded accent-pop-550" />
    <FontAwesomeIcon icon={faSyringe} className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-sm text-white/70">Vacunado</span>
  </label>
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={petCastrated} onChange={e => setPetCastrated(e.target.checked)} className="w-4 h-4 rounded accent-pop-550" />
    <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="text-sm text-white/70">Castrado</span>
  </label>
</div>
{/* Size */}
<select
  value={petSize}
  onChange={e => setPetSize(e.target.value as 'small' | 'medium' | 'large')}
  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pop-550"
>
  <option value="small">Pequeño</option>
  <option value="medium">Mediano</option>
  <option value="large">Grande</option>
</select>
```

Note: The wizard uses dark background (`backdark` class), so labels use `text-white/70` and select uses `bg-white/10 text-white` to match.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean compilation — all createPet callers now pass the required fields.

- [ ] **Step 6: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "feat: add vaccinated/castrated/size to RC wizard pet creation"
```

---

### Task 8: Add i18n keys + vaccinated/castrated filters to public pet grid

**Files:**
- Modify: `public/locales/es/pets.json`
- Modify: `public/locales/en/pets.json`
- Modify: `components/pets/pets-page.tsx`
- Modify: `components/pets/pet-grid.tsx`

- [ ] **Step 1: Add i18n keys**

In `public/locales/es/pets.json`, add to the `grid` object:

```json
"vaccinated": "Vacunado",
"castrated": "Castrado"
```

In `public/locales/en/pets.json`, add to the `grid` object:

```json
"vaccinated": "Vaccinated",
"castrated": "Castrated"
```

- [ ] **Step 2: Add state to pets-page.tsx**

In `components/pets/pets-page.tsx`, add toggle state:

```ts
const [vaccinatedFilter, setVaccinatedFilter] = useState(false)
const [castratedFilter, setCastratedFilter] = useState(false)
```

- [ ] **Step 3: Merge toggle state with tab filters in fetchPets**

In the function that calls `listPublicPets()`, merge the toggle state with the current tab params:

```ts
const mergedParams: PetFilters = {
  ...currentTabParams,
  ...(vaccinatedFilter ? { vaccinated: true } : {}),
  ...(castratedFilter ? { castrated: true } : {}),
}
const { data } = await listPublicPets(mergedParams)
```

Make sure the toggles are included in the dependency array of any `useEffect` or `useCallback` that triggers a re-fetch.

- [ ] **Step 4: Add toggle change handlers that trigger re-fetch**

When a toggle changes, re-fetch with the merged params:

```ts
const handleVaccinatedToggle = (v: boolean) => {
  setVaccinatedFilter(v)
  // The useEffect that depends on vaccinatedFilter will re-fetch
}
const handleCastratedToggle = (v: boolean) => {
  setCastratedFilter(v)
}
```

- [ ] **Step 5: Pass new props to PetGrid**

Pass `vaccinatedFilter`, `castratedFilter`, `onVaccinatedChange`, `onCastratedChange` to the `PetGrid` component.

- [ ] **Step 6: Update PetGridProps and add toggle pills**

In `components/pets/pet-grid.tsx`, add to `PetGridProps`:

```ts
vaccinatedFilter: boolean
castratedFilter: boolean
onVaccinatedChange: (v: boolean) => void
onCastratedChange: (v: boolean) => void
```

Add `faSyringe` and `faScissors` to Font Awesome imports.

Below the existing filter tab row, add toggle pills:

```tsx
<div className="flex gap-2 mt-2">
  <button
    onClick={() => onVaccinatedChange(!vaccinatedFilter)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
      vaccinatedFilter
        ? 'bg-pop-550 text-white border-pop-550'
        : 'bg-background text-muted-foreground border-border hover:bg-accent'
    }`}
  >
    <FontAwesomeIcon icon={faSyringe} className="w-3 h-3" />
    {t('grid.vaccinated')}
  </button>
  <button
    onClick={() => onCastratedChange(!castratedFilter)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
      castratedFilter
        ? 'bg-pop-550 text-white border-pop-550'
        : 'bg-background text-muted-foreground border-border hover:bg-accent'
    }`}
  >
    <FontAwesomeIcon icon={faScissors} className="w-3 h-3" />
    {t('grid.castrated')}
  </button>
</div>
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean compilation.

- [ ] **Step 8: Commit**

```bash
git add public/locales/es/pets.json public/locales/en/pets.json components/pets/pets-page.tsx components/pets/pet-grid.tsx
git commit -m "feat: vaccinated/castrated toggle filters on public pet grid"
```

---

### Task 9: Final TypeScript check

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: Clean compilation with zero errors.

- [ ] **Step 2: Manual smoke test**

Verify in the browser (dev server should be running):
1. Dashboard → Add Pet → see vaccinated/castrated/size fields
2. Dashboard → Edit Pet → see pre-populated vaccinated/castrated/size fields
3. Dashboard → Filter pills → vaccinated/castrated are clickable (not greyed out)
4. Public /pets → toggle pills appear below the filter tabs
5. Pet detail → no Adopt button when logged in as RC
6. Forms tab → saving a form edit works (no 405 error)
