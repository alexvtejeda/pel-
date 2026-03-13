# Quick Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix age input UX, adopt page build error, Instagram link normalization, and replace emojis with FA icons.

**Architecture:** Four independent frontend-only changes. No backend changes. Each task is self-contained and can be committed independently.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TailwindCSS v4, Font Awesome 6, react-i18next

**Spec:** `docs/superpowers/specs/2026-03-13-quick-fixes-design.md`

---

## Chunk 1: Instagram fix + adopt page fix + emoji replacement + age toggle

### Task 1: Instagram URL normalization

**Files:**
- Modify: `lib/utils.ts`
- Modify: `components/pets/pet-detail.tsx:170-174`
- Modify: `components/pets/pet-grid.tsx:196-197`

- [ ] **Step 1: Add `instagramUrl` helper to `lib/utils.ts`**

```ts
export function instagramUrl(handle: string): string {
  let clean = handle.trim()
  if (clean.startsWith('http')) return clean
  clean = clean.replace(/^@/, '')
  return `https://instagram.com/${clean}`
}
```

- [ ] **Step 2: Use helper in `pet-detail.tsx`**

In `components/pets/pet-detail.tsx` line 171, change:
```tsx
// Before
<a href={pet.rescue_center.instagram} target="_blank" ...>
// After
<a href={instagramUrl(pet.rescue_center.instagram)} target="_blank" ...>
```

Add import: `import { instagramUrl } from '@/lib/utils'`

- [ ] **Step 3: Use helper in `pet-grid.tsx`**

In `components/pets/pet-grid.tsx` line 197, change:
```tsx
// Before
onClick={() => window.open(pet.rescue_center!.instagram!, '_blank')}
// After
onClick={() => window.open(instagramUrl(pet.rescue_center!.instagram!), '_blank')}
```

Add import: `import { instagramUrl } from '@/lib/utils'`

- [ ] **Step 4: Run `tsc --noEmit`**

Expected: clean compilation.

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts components/pets/pet-detail.tsx components/pets/pet-grid.tsx
git commit -m "fix: normalize Instagram handles to full URLs"
```

---

### Task 2: Adopt page + slug page `generateStaticParams` fix

**Files:**
- Create: `components/adopt/adopt-pet-page.tsx`
- Modify: `app/adopt/[pet-id]/page.tsx`
- Create: `components/pets/slug-redirect-page.tsx`
- Modify: `app/p/[slug]/page.tsx`

- [ ] **Step 1: Extract adopt page client component**

Create `components/adopt/adopt-pet-page.tsx` — move the entire body of the current `app/adopt/[pet-id]/page.tsx` into this file. Key changes:
- Replace `useParams()` with a `petId` prop
- Remove `useParams` import
- Export as named: `export function AdoptPetPage({ petId }: { petId: string })`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPaw } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { getPublicPet, getPetForm, PetFormResponse } from '@/lib/api/pets-public'
import { submitAdoptionForm, uploadSubmissionFile } from '@/lib/api/submissions'
import { FormRenderer } from '@/components/forms/form-renderer'

export function AdoptPetPage({ petId }: { petId: string }) {
  const router = useRouter()

  const [pet, setPet] = useState<Pet | null>(null)
  const [formData, setFormData] = useState<PetFormResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!petId) {
      router.replace('/pets')
      return
    }

    const token = localStorage.getItem('pelu_access_token')
    if (!token) { router.replace('/auth/login'); return }

    Promise.all([getPublicPet(petId), getPetForm(petId)]).then(
      ([petRes, formRes]) => {
        if (!petRes.data || !formRes.data) {
          router.replace('/pets')
          return
        }
        setPet(petRes.data)
        setFormData(formRes.data)
        setLoading(false)
      }
    )
  }, [petId, router])

  const handleSubmit = async (
    answers: Record<string, string | string[]>,
    files: Record<string, File>
  ) => {
    if (!formData) return

    const { data, error: submitErr } = await submitAdoptionForm(petId, {
      form_id: formData.form.id,
      answers,
    })

    if (submitErr || !data) {
      throw new Error(submitErr || 'Error al enviar solicitud')
    }

    for (const [fieldId, file] of Object.entries(files)) {
      const { error: fileErr } = await uploadSubmissionFile(
        data.submission_id,
        fieldId,
        file
      )
      if (fileErr) {
        setError(fileErr)
        break
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-pop-550 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!pet || !formData) return null

  const rc = formData.rc
  const firstPhoto = pet.photos?.[0]?.url

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 w-full aspect-[4/1] overflow-hidden">
        {rc.logo_url ? (
          <img src={rc.logo_url} alt={rc.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-pop-500 to-pop-550 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{rc.name}</span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Volver a {pet.name}
        </button>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-8">
          {firstPhoto ? (
            <Image src={firstPhoto} alt={pet.name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faPaw} className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{pet.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {rc.name}
              {rc.city && <span> &middot; {rc.city}</span>}
            </p>
          </div>
        </div>

        {formData.advisory && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
            Esta mascota tiene condiciones especiales. El centro revisará tu solicitud con atención adicional.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm animate-wiggle">
            {error}
          </div>
        )}

        <FormRenderer
          form={formData.form}
          rc={{ name: rc.name, logo_url: rc.logo_url }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `app/adopt/[pet-id]/page.tsx` as thin server component**

```tsx
import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'

export function generateStaticParams() {
  return []
}

export default async function Page({ params }: { params: Promise<{ 'pet-id': string }> }) {
  const { 'pet-id': petId } = await params
  return <AdoptPetPage petId={petId} />
}
```

- [ ] **Step 3: Extract slug page client component**

Create `components/pets/slug-redirect-page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pet } from '@/lib/api/pets'
import { getPetBySlug } from '@/lib/api/pets-public'
import { PetsPage } from '@/components/pets/pets-page'

export function SlugRedirectPage({ slug }: { slug: string }) {
  const router = useRouter()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      router.replace('/pets')
      return
    }
    getPetBySlug(slug).then(({ data }) => {
      if (!data) {
        router.replace('/pets')
        return
      }
      setPet(data)
      setLoading(false)
    })
  }, [slug, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-pop-550 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <PetsPage initialSelected={pet ?? undefined} />
}
```

- [ ] **Step 4: Rewrite `app/p/[slug]/page.tsx` as thin server component**

```tsx
import { SlugRedirectPage } from '@/components/pets/slug-redirect-page'

export function generateStaticParams() {
  return []
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <SlugRedirectPage slug={slug} />
}
```

- [ ] **Step 5: Run `tsc --noEmit`**

Expected: clean compilation.

- [ ] **Step 6: Commit**

```bash
git add components/adopt/adopt-pet-page.tsx app/adopt/\[pet-id\]/page.tsx components/pets/slug-redirect-page.tsx app/p/\[slug\]/page.tsx
git commit -m "fix: add generateStaticParams to dynamic routes for static export"
```

---

### Task 3: Replace emojis with Font Awesome icons

**Files:**
- Modify: `components/dashboard/rescue-center/add-pet-modal.tsx`
- Modify: `components/dashboard/rescue-center/pets-tab.tsx`

- [ ] **Step 1: Update `add-pet-modal.tsx`**

Add imports: `faDog, faCat, faMars, faVenus` to the FA import block.

Replace all emoji occurrences:
- Gender toggles: `♂ Macho` → `<FontAwesomeIcon icon={faMars} className="text-xs" /> Macho`, same for `♀ Hembra` → `faVenus`
- Species toggles: `🐕 Perro` → `<FontAwesomeIcon icon={faDog} className="text-xs" /> Perro`, same for `🐈 Gato` → `faCat`
- PreviewCard badges: `♂`/`♀` → `<FontAwesomeIcon icon={faMars/faVenus} className="text-xs" />`, `🐕`/`🐈` → `<FontAwesomeIcon icon={faDog/faCat} className="text-xs" />`

Note: In PreviewCard, the badges are in a string join. Refactor to use JSX elements with separator instead:
```tsx
<span className="text-xs text-muted-foreground flex items-center gap-1">
  {age && <span>{age} meses</span>}
  {age && <span>·</span>}
  <FontAwesomeIcon icon={gender === 'male' ? faMars : faVenus} className="text-xs" />
  <span>·</span>
  <FontAwesomeIcon icon={species === 'dog' ? faDog : faCat} className="text-xs" />
</span>
```

- [ ] **Step 2: Update `pets-tab.tsx`**

Add imports: `faDog, faCat, faMars, faVenus` to the FA import block.

Replace all emoji occurrences:
- **EditPetModal** gender toggles: `♂ Macho` → `<FontAwesomeIcon icon={faMars} className="text-xs" /> Macho`, etc.
- **EditPetModal** species toggles: `🐕 Perro` → `<FontAwesomeIcon icon={faDog} className="text-xs" /> Perro`, etc.
- **Grid card** badges (inside `.filter(Boolean).join(' · ')`): Refactor to JSX like PreviewCard above.
- **Filter dropdown** species pills: `'🐕 Perro' : '🐈 Gato'` → `<><FontAwesomeIcon icon={faDog} className="text-xs" /> Perro</>`, etc.
- **Filter dropdown** gender pills: `'♂ Macho' : '♀ Hembra'` → `<><FontAwesomeIcon icon={faMars} className="text-xs" /> Macho</>`, etc.

- [ ] **Step 3: Run `tsc --noEmit`**

Expected: clean compilation.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/rescue-center/add-pet-modal.tsx components/dashboard/rescue-center/pets-tab.tsx
git commit -m "refactor: replace emoji with Font Awesome icons in modals, grid, and filters"
```

---

### Task 4: Age input months/years toggle + i18n keys

**Files:**
- Modify: `public/locales/es/pets.json`
- Modify: `public/locales/en/pets.json`
- Modify: `components/dashboard/rescue-center/add-pet-modal.tsx`
- Modify: `components/dashboard/rescue-center/pets-tab.tsx`

- [ ] **Step 1: Add i18n keys**

In `public/locales/es/pets.json`, add inside the `dashboard` object:
```json
"ageUnit": {
  "months": "Meses",
  "years": "Años"
}
```

In `public/locales/en/pets.json`, add inside the `dashboard` object:
```json
"ageUnit": {
  "months": "Months",
  "years": "Years"
}
```

- [ ] **Step 2: Add age toggle to `add-pet-modal.tsx`**

Add state: `const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months')`

Reset `ageUnit` in `reset()`: `setAgeUnit('months')`

Replace the age input section with:
```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
    {t('details.age', 'Edad')}
  </label>
  <div className="flex gap-2">
    <input
      type="number"
      min={0}
      placeholder="ej. 6"
      value={age}
      onChange={(e) => setAge(e.target.value)}
      className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
    <button type="button" onClick={() => setAgeUnit('months')}
      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
        ageUnit === 'months' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'
      }`}>
      {t('dashboard.ageUnit.months')}
    </button>
    <button type="button" onClick={() => setAgeUnit('years')}
      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
        ageUnit === 'years' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'
      }`}>
      {t('dashboard.ageUnit.years')}
    </button>
  </div>
</div>
```

Update `handleConfirm` to convert: replace `age: parseInt(age, 10)` with:
```tsx
age: ageUnit === 'years' ? parseInt(age, 10) * 12 : parseInt(age, 10)
```

Update PreviewCard age display: replace `age && \`${age} meses\`` with:
```tsx
age && `${age} ${ageUnit === 'years' ? t('dashboard.ageUnit.years').toLowerCase() : t('dashboard.ageUnit.months').toLowerCase()}`
```

Note: PreviewCard needs `ageUnit` as a new prop.

- [ ] **Step 3: Add age toggle to EditPetModal in `pets-tab.tsx`**

Add state inside EditPetModal:
```tsx
const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months')
```

In the `useEffect` that populates from `pet`:
```tsx
if (pet.age >= 12 && pet.age % 12 === 0 && pet.age > 0) {
  setAge(pet.age / 12)
  setAgeUnit('years')
} else {
  setAge(pet.age)
  setAgeUnit('months')
}
```

Replace the age input with the same toggle UI as AddPetModal (adapted for EditPetModal's label style).

Update `onSave` call to convert: replace `age: age as number` with:
```tsx
age: ageUnit === 'years' ? (age as number) * 12 : (age as number)
```

- [ ] **Step 4: Update grid card age display in `pets-tab.tsx`**

In the grid card badges section, replace `pet.age != null && \`${pet.age} meses\`` with:
```tsx
pet.age != null && (pet.age >= 12 ? `${Math.floor(pet.age / 12)} año${Math.floor(pet.age / 12) !== 1 ? 's' : ''}` : `${pet.age} meses`)
```

- [ ] **Step 5: Run `tsc --noEmit`**

Expected: clean compilation.

- [ ] **Step 6: Commit**

```bash
git add public/locales/es/pets.json public/locales/en/pets.json components/dashboard/rescue-center/add-pet-modal.tsx components/dashboard/rescue-center/pets-tab.tsx
git commit -m "feat: add months/years toggle to age input and smart age display"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean compilation, no errors.

- [ ] **Step 2: Update `tasks/todo.md` with review section**
