# Frontend: Form API Fixes + Vaccinated/Castrated/Size Fields

## Goal

Fix API method mismatches that block the form builder and adoption flow, add vaccinated/castrated/size fields to all pet creation/edit surfaces, and enable filtering by these fields.

## Context

- `updateForm()` sends `PATCH` but the backend expects `PUT` → 405 error when saving form edits.
- Pet model has `vaccinated`, `castrated`, `size` fields in the backend but the frontend doesn't send or display them.
- Dashboard filter pills for vaccinated/castrated are greyed out with "Próximamente" tooltip.
- Rescue centers can click Adopt on their own pets, which makes no sense.

---

## Change 1: Fix `updateForm()` HTTP method

**File:** `lib/api/forms.ts` — line 77

Change `method: 'PATCH'` → `method: 'PUT'`

This is a one-line fix. The backend registers `PUT /api/v1/forms/{id}`, not `PATCH`.

---

## Change 2: Add vaccinated/castrated/size to Pet API types

**File:** `lib/api/pets.ts`

Add `vaccinated`, `castrated`, `size` fields to three places:

1. **`Pet` interface** (lines 19-33) — add:
   ```ts
   vaccinated: boolean
   castrated: boolean
   size: 'small' | 'medium' | 'large'
   ```

2. **`createPet()` input type** (line 41) — add `vaccinated: boolean`, `castrated: boolean`, `size: 'small' | 'medium' | 'large'`

3. **`updatePet()` input type** (line 47) — add `vaccinated?: boolean`, `castrated?: boolean`, `size?: 'small' | 'medium' | 'large'`

---

## Change 3: Add vaccinated/castrated to public pet filters

**File:** `lib/api/pets-public.ts`

Add to `PetFilters` interface:
```ts
vaccinated?: boolean
castrated?: boolean
```

In `listPublicPets()`, add to query params:
```ts
if (params?.vaccinated != null) query.set('vaccinated', String(params.vaccinated))
if (params?.castrated != null) query.set('castrated', String(params.castrated))
```

---

## Change 4: Hide Adopt button for rescue center and business roles

**File:** `components/pets/pet-detail.tsx`

The current adopt section (lines ~184-198) has two branches: Adopt button when logged in, "Log in" link when not. Replace with a three-branch conditional:

```tsx
{user && user.role !== 'rescue_center' && user.role !== 'business' ? (
  <button onClick={handleAdopt} ...>{t('detail.adopt')}</button>
) : !user ? (
  <Link href="/auth/login" ...>{t('detail.login_prompt')}</Link>
) : null}
```

RC and business users see neither the button nor the login prompt — just nothing.

---

## Change 5: Add toggles to AddPetModal

**File:** `components/dashboard/rescue-center/add-pet-modal.tsx`

### State variables
Add three new state variables:
```ts
const [vaccinated, setVaccinated] = useState(false)
const [castrated, setCastrated] = useState(false)
const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
```

### AddPetFormData interface
Add to the exported `AddPetFormData` interface (lines 20-29):
```ts
vaccinated: boolean
castrated: boolean
size: 'small' | 'medium' | 'large'
```

### reset() function
Add to the `reset()` function (lines 161-174):
```ts
setVaccinated(false)
setCastrated(false)
setSize('medium')
```

### handleConfirm
Include the new fields in the `onConfirm()` call so `pets-tab.tsx`'s `handleAddPetConfirm` receives them.

### UI additions (after the age/gender inputs)
- **Vaccinated toggle** — labeled checkbox, hardcoded Spanish "Vacunado" (matching existing pattern in the modal)
- **Castrated toggle** — labeled checkbox, "Castrado"
- **Size dropdown** — `<select>` with options using i18n keys `pets.size.small/medium/large` (keys already exist)

### PreviewCard
Update `PreviewCard` props to accept `vaccinated: boolean`, `castrated: boolean`, `size: string`. Add small badge icons below the existing info line:
- `faSyringe` (green if vaccinated, muted if not)
- `faScissors` (green if castrated, muted if not)
- Size label text

---

## Change 6: Add toggles to EditPetModal + enable dashboard filters

**File:** `components/dashboard/rescue-center/pets-tab.tsx`

### EditPetModal changes
- Add `vaccinated`, `castrated`, `size` state variables
- Pre-populate from `pet.vaccinated`, `pet.castrated`, `pet.size` when modal opens (in the `useEffect` that loads pet data)
- Add matching toggle/checkbox/dropdown UI (same pattern as AddPetModal)
- Update the `onSave` callback type to include `vaccinated?: boolean`, `castrated?: boolean`, `size?: 'small' | 'medium' | 'large'`
- Include in `updatePet()` call in `handleEditSave`

### handleAddPetConfirm update
Update `handleAddPetConfirm` to pass `vaccinated`, `castrated`, `size` from the `AddPetFormData` to `createPet()`.

### Dashboard filter changes
The existing `Filters` interface uses `Set<>` for species, gender, conditions. For vaccinated/castrated, use `Set<'yes' | 'no'>` to match the existing pattern:

```ts
interface Filters {
  species: Set<string>
  gender: Set<string>
  conditions: Set<string>
  vaccinated: Set<string>   // 'yes' | 'no'
  castrated: Set<string>    // 'yes' | 'no'
}
```

- Remove the "Próximamente" tooltip and greyed-out / `opacity-50 pointer-events-none` styling from the vaccinated/castrated filter pills
- Wire the pills to toggle entries in `filters.vaccinated` / `filters.castrated` Sets
- Apply in the `filteredPets` useMemo: if `filters.vaccinated.size > 0`, check `pet.vaccinated` matches

### Helper function updates
- `emptyFilters()` (~line 359): add `vaccinated: new Set()` and `castrated: new Set()` to the returned object
- `countActiveFilters()` (~line 365): add `+ f.vaccinated.size + f.castrated.size` to the count

### Grid card changes
Show vaccination/castration status on pet cards: small `faSyringe` / `faScissors` icons, green if true, muted if false.

---

## Change 7: Add fields to rescue center wizard

**File:** `components/auth/onboarding/rescue-center-wizard.tsx`

In the optional pet creation section (starts ~line 305, "Tienes una mascota lista para adopcion?"):

Add state variables:
```ts
const [petVaccinated, setPetVaccinated] = useState(false)
const [petCastrated, setPetCastrated] = useState(false)
const [petSize, setPetSize] = useState<'small' | 'medium' | 'large'>('medium')
```

**UI:** Add after the species toggle buttons:
- Vaccinated checkbox
- Castrated checkbox
- Size dropdown (small/medium/large)

Include in `createPet()` call (line 128):
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

---

## Change 8: Add vaccinated/castrated filters to public pet grid

**File:** `components/pets/pet-grid.tsx`

The public grid currently uses mutually exclusive filter "tabs" (all/dogs/cats/males/females/nearby) via a `FILTERS` array with `FilterKey` type. These are single-select — clicking "dogs" replaces the active filter.

Vaccinated/castrated are **additive toggles**, not tab replacements. Add them as **separate toggle pills below the tab row**, not inside the `FILTERS` array:

- Two small toggle pills: `faSyringe` "Vacunado" and `faScissors` "Castrado"
- Each pill is independently toggleable (on/off)
- When active, add `vaccinated: true` / `castrated: true` to the `PetFilters` params
- They work alongside whatever tab filter is active (e.g., "dogs" + "vaccinated")

### Props and state wiring

**`pets-page.tsx`** — Add state and merge with tab filters:
```ts
const [vaccinatedFilter, setVaccinatedFilter] = useState(false)
const [castratedFilter, setCastratedFilter] = useState(false)
```

In `fetchPets()` (or wherever `listPublicPets()` is called), merge the toggle state with the current tab filter params:
```ts
const mergedParams: PetFilters = {
  ...currentTabParams,                              // species/gender from tab
  ...(vaccinatedFilter ? { vaccinated: true } : {}), // additive
  ...(castratedFilter ? { castrated: true } : {}),   // additive
}
const { data } = await listPublicPets(mergedParams)
```

When a toggle changes, re-fetch with the merged params. When the tab changes, also include the current toggle state. Neither should overwrite the other.

**`PetGridProps`** — Add new props:
```ts
interface PetGridProps {
  // ...existing props
  vaccinatedFilter: boolean
  castratedFilter: boolean
  onVaccinatedChange: (v: boolean) => void
  onCastratedChange: (v: boolean) => void
}
```

Pass these from `pets-page.tsx` to `PetGrid`. The grid renders the toggle pills and calls `onVaccinatedChange(!vaccinatedFilter)` on click.

### New i18n keys needed

Add to `public/locales/es/pets.json` → `grid`:
```json
"vaccinated": "Vacunado",
"castrated": "Castrado"
```

Add to `public/locales/en/pets.json` → `grid`:
```json
"vaccinated": "Vaccinated",
"castrated": "Castrated"
```

---

## Files Summary

| File | Change |
|---|---|
| `lib/api/forms.ts` | PATCH → PUT |
| `lib/api/pets.ts` | Add vaccinated/castrated/size to Pet interface, createPet, updatePet |
| `lib/api/pets-public.ts` | Add vaccinated/castrated to PetFilters + query params |
| `components/pets/pet-detail.tsx` | Hide Adopt for RC and business roles |
| `components/dashboard/rescue-center/add-pet-modal.tsx` | Add toggles + size + update AddPetFormData + reset() + PreviewCard |
| `components/dashboard/rescue-center/pets-tab.tsx` | EditPetModal toggles + onSave type + handleAddPetConfirm + enable filter pills with Set pattern |
| `components/auth/onboarding/rescue-center-wizard.tsx` | Add toggles + size to optional pet creation |
| `components/pets/pet-grid.tsx` | Add additive vaccinated/castrated toggle pills (separate from tab filters) |
| `components/pets/pets-page.tsx` | Add vaccinatedFilter/castratedFilter state, pass to grid + API call |
| `public/locales/es/pets.json` | Add `grid.vaccinated`, `grid.castrated` keys |
| `public/locales/en/pets.json` | Add `grid.vaccinated`, `grid.castrated` keys |
