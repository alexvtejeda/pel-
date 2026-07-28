# UI Improvement Pass — Plan C: Route Structure & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the audited routes from "functional" into "designed" — page headers, real filters, grouped forms, honest states, keyboard-operable everything — implementing spec §4, §5, §6, §10 in full plus the P1/P2 remainder of §7, §8, §9, §11.

**Architecture:** Eight independent milestones, one per route, each a self-contained commit series. Every milestone builds on the primitives Plan A shipped (`ErrorState`, `Spinner`, `PeluLoadingLogo`, `focus-ring`, `pop-solid`, status tokens, `formatAge`) and assumes Plan B's P0 fixes are in. Milestones can be executed in any order, but the listed order follows spec §12's user-impact ranking.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4.2 · react-i18next · Framer Motion / `motion` · Vitest + React Testing Library (`npx vitest run`) · Bun.

**Spec:** `docs/superpowers/specs/2026-07-28-ui-improvement-pass-design.md` §4, §5, §6, §10 (whole) and §7, §8, §9, §11 (P1/P2 only).

**Depends on:** Plan A and Plan B merged.

---

## Before you start

- Assume `bun run dev` is **already running** on port 3000. Do not start it.
- Local API is on port **2701**.
- Run tests with `npx vitest run`.
- Branch: `git checkout -b feat/ui-pass-route-polish` before Milestone 1.
- **Do not touch** `app/dashboard/**`, `components/dashboard/**`, `/about`, or the backend.
- **Do not clean up the PRUEBA adoption submission in production.** It is fixture data.
- The site-wide button `cursor: pointer` regression was already fixed in `app/globals.css` — do not re-add it.

## One spec correction found while grounding this plan

**§6 says to translate `/aliados` service badges "through the existing `aliados.filters.*` keys". Those keys do not match the real service values.** `aliados.filters` is `all | transport | walking | grooming | sitting | training`, but `SERVICE_TYPES` in `lib/api/service-providers.ts:8` — which is what providers actually store in `services[]` — is `transport | grooming | pet_sitting | dog_walking | pet_boarding | training`. Three of the six do not line up and `pet_boarding` has no filter at all. So Milestone 3 rebuilds the filter list from `SERVICE_TYPES` and labels both pills and badges from `service_providers.services.*`, which is an exact match. `aliados.filters.all` is kept for the "Todos" pill.

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `components/landing/featured-pets.tsx` | Landing strip of 4–8 real adoptable pets. |
| `components/ui/file-dropzone.tsx` | Shared styled, keyboard-accessible upload zone. |
| `components/service-providers/status-card.tsx` | The three duplicated `/servicios` status blocks, extracted. |
| `components/service-providers/requirements-checklist.tsx` | Explains why the submit button is disabled. |
| `components/pets/user-pet-card-skeleton.tsx` | Grid skeleton matching `UserPetCard`. |
| `components/__tests__/landing/featured-pets.test.tsx` | Loading / error / empty / content branches. |
| `components/__tests__/aliados/provider-grid.test.tsx` | Filtering, translated badges, error state. |
| `components/__tests__/pets/pet-grid-header.test.tsx` | Heading + live result count. |

**Modified (by milestone):** `components/forms/form-renderer.tsx`, `components/adopt/adopt-pet-page.tsx`, `components/pets/{pets-page,pet-grid,user-pet-card,member-add-pet-modal}.tsx`, `components/aliados/{aliados-page,provider-grid,provider-detail}.tsx`, `components/providers/provider-card.tsx`, `components/chat/{chat-page,chat-message-thread,chat-conversation-list}.tsx`, `app/mis-mascotas/page.tsx`, `app/servicios/page.tsx`, `components/service-providers/service-provider-form.tsx`, `components/auth/mfa/*.tsx`, `components/landing/{landing-page,testimonial-carousel}.tsx`, `components/footer.tsx`, `lib/hooks/use-media-query.ts`, `public/locales/{es,en}/*.json`.

---

# Milestone 1 — `/adopt` form UX (spec §7 P1/P2)

The form is ~25 questions long and reads as one undifferentiated column with faint uppercase dividers.

## Task 1.1: Group the form into section cards with a progress indicator

**Files:**
- Modify: `components/forms/form-renderer.tsx:83-135`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Add the translation keys (Spanish first)**

`public/locales/es/pets.json` — inside `"forms"`:

```json
    "progress": "{{answered}} de {{total}} preguntas obligatorias",
    "section_untitled": "Tu solicitud",
```

`public/locales/en/pets.json`:

```json
    "progress": "{{answered}} of {{total}} required questions",
    "section_untitled": "Your application",
```

- [ ] **Step 2: Group the fields by section**

In `components/forms/form-renderer.tsx`, add `useMemo` to the React import:

```tsx
import { useMemo, useState } from 'react'
```

Then, just above the `if (submitted)` block, replace the `let lastSection = ''` line and add the grouping + progress derivation:

```tsx
  // Group consecutive fields by their section so each becomes one card. The
  // builder emits section as a plain string on each field, not as a container.
  const sections = useMemo(() => {
    const groups: { name: string; fields: typeof form.fields }[] = []
    for (const field of form.fields) {
      const name = field.section || ''
      const last = groups[groups.length - 1]
      if (last && last.name === name) last.fields.push(field)
      else groups.push({ name, fields: [field] })
    }
    return groups
  }, [form.fields])

  const requiredFields = useMemo(() => form.fields.filter((f) => f.required), [form.fields])
  const answeredRequired = requiredFields.filter((f) => {
    const answer = answers[f.id]
    return Array.isArray(answer) ? answer.length > 0 : typeof answer === 'string' && answer.trim() !== ''
  }).length
  const progressPct = requiredFields.length === 0
    ? 100
    : Math.round((answeredRequired / requiredFields.length) * 100)
```

- [ ] **Step 3: Render sections as cards behind a sticky progress bar**

Replace the whole return block from line 85 (`return (`) through line 135, up to but not including the `!preview` submit block, with:

```tsx
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{form.name}</h1>

      {!preview && requiredFields.length > 0 && (
        <div className="sticky top-40 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur">
          <div
            role="progressbar"
            aria-valuenow={answeredRequired}
            aria-valuemin={0}
            aria-valuemax={requiredFields.length}
            aria-label={t('forms.progress', { answered: answeredRequired, total: requiredFields.length })}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-pop-solid transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('forms.progress', { answered: answeredRequired, total: requiredFields.length })}
          </p>
        </div>
      )}

      {sections.map((section, sectionIndex) => (
        <section
          key={`${section.name}-${sectionIndex}`}
          className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold">
            {section.name || t('forms.section_untitled')}
          </h2>
          {section.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={answers[field.id]}
              fileValue={files[field.id]}
              error={errors[field.id]}
              preview={preview}
              onChange={(val) => setAnswer(field.id, val)}
              onFile={(file) => setFiles((prev) => ({ ...prev, [field.id]: file }))}
              allAnswers={answers}
              onAnswerChange={setAnswer}
            />
          ))}
        </section>
      ))}
```

> The `sticky top-40` matches the 160px banner the `/adopt` page pins above the form (Plan B Task 1), so the progress bar parks directly under it.

The `!preview` submit block that follows is unchanged; only the closing `</div>` of the outer wrapper stays.

- [ ] **Step 4: Delete the double container**

`FormRenderer`'s wrapper was `max-w-2xl mx-auto px-4 py-8 space-y-6` while `adopt-pet-page.tsx:101` already applies `max-w-2xl mx-auto px-4 py-8`. The replacement above drops the duplicate to just `space-y-6`. Confirm the page still reads as a single centered column:

Open http://localhost:3000/adopt?id=<real pet id> and check the form is not double-inset.

Also verify the RC dashboard's form **preview** (`/dashboard/rescue-center` → Formularios → Vista previa) still looks right — `FormRenderer` is shared. It renders with `preview` so it has no progress bar, but the section cards apply there too, which is the intended improvement.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/forms/form-renderer.tsx public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat(adopt): group the form into section cards with progress

A 25-question form was one flat column with faint uppercase dividers.
Sections are now rounded-2xl cards with real headings, behind a sticky
progress bar counting answered required questions."
```

---

## Task 1.2: Label association, touch targets, and error semantics

Every `<label>` in `FieldInput` is unassociated and every input lacks an `id`. Radio/checkbox rows are ~20px tall.

**Files:**
- Modify: `components/forms/form-renderer.tsx:150-268`

- [ ] **Step 1: Wire ids, describedby and invalid state**

Replace the top of `FieldInput` (lines 150–169) with:

```tsx
function FieldInput({ field, value, fileValue, error, preview, onChange, onFile, allAnswers, onAnswerChange }: FieldInputProps) {
  const { t } = useTranslation('pets')
  const strVal    = typeof value === 'string' ? value : ''
  const arrVal    = Array.isArray(value) ? value : []
  const inputId   = `input-${field.id}`
  const errorId   = `error-${field.id}`
  const descId    = `desc-${field.id}`
  const describedBy = [field.description ? descId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined
  const inputCls  = `focus-ring w-full rounded-xl border px-4 py-3 text-sm outline-none bg-background ${error ? 'border-destructive' : 'border-input'}`

  // Which follow-up to show (for multiple_choice / dropdown)?
  const activeFollowUp = (field.type === 'multiple_choice' || field.type === 'dropdown')
    ? field.follow_ups?.find(fu => fu.when_answer === strVal)
    : null

  // Radio and checkbox groups get a group label instead of a for/id pair,
  // because there is no single control to point at.
  const isGroup = field.type === 'multiple_choice' || field.type === 'checkbox'

  return (
    <div id={`field-${field.id}`} className="space-y-2" role={isGroup ? 'group' : undefined} aria-labelledby={isGroup ? `label-${field.id}` : undefined}>
      <label
        id={`label-${field.id}`}
        htmlFor={isGroup ? undefined : inputId}
        className="block text-sm font-medium"
      >
        {field.label}
        {field.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descId} className="text-xs text-muted-foreground">{field.description}</p>
      )}
```

- [ ] **Step 2: Add the shared input attributes**

Give each single-control input the id and ARIA attributes. Replace lines 171–179:

```tsx
      {field.type === 'short_text' && (
        <input id={inputId} type="text" value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview} />
      )}
      {field.type === 'long_text' && (
        <textarea id={inputId} rows={4} value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview} />
      )}
      {field.type === 'date' && (
        <input id={inputId} type="date" value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview} />
      )}
```

And the dropdown (lines 208–214):

```tsx
      {field.type === 'dropdown' && (
        <select id={inputId} value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview}>
          <option value="">{t('forms.select_placeholder')}</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
```

- [ ] **Step 3: Make radio and checkbox rows ≥44px and full-row clickable**

Replace the multiple-choice block (lines 180–191):

```tsx
      {field.type === 'multiple_choice' && (
        <div className="space-y-1">
          {field.options.map(opt => (
            <label
              key={opt}
              className="focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pop-700 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors hover:bg-muted/60"
            >
              <input type="radio" name={field.id} value={opt}
                checked={strVal === opt} onChange={() => onChange(opt)}
                aria-describedby={describedBy}
                className="accent-primary" disabled={preview} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
```

And the checkbox block (lines 192–207):

```tsx
      {field.type === 'checkbox' && (
        <div className="space-y-1">
          {field.options.map(opt => (
            <label
              key={opt}
              className="focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pop-700 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors hover:bg-muted/60"
            >
              <input type="checkbox" value={opt}
                checked={arrVal.includes(opt)}
                onChange={e => {
                  if (e.target.checked) onChange([...arrVal, opt])
                  else onChange(arrVal.filter(v => v !== opt))
                }}
                aria-describedby={describedBy}
                className="accent-primary" disabled={preview} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
```

(`min-h-11` = 44px, the minimum touch target.)

- [ ] **Step 4: Announce errors**

Replace line 248:

```tsx
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
```

- [ ] **Step 5: Give the rating buttons a group label**

Replace lines 215–227:

```tsx
      {field.type === 'rating' && (
        <div className="flex items-center gap-2" role="group" aria-labelledby={`label-${field.id}`}>
          <span className="text-xs text-muted-foreground">{field.ratingMin}</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button"
              onClick={() => !preview && onChange(String(n))}
              aria-pressed={strVal === String(n)}
              className={`focus-ring w-11 h-11 rounded-xl border text-sm font-medium transition-colors ${strVal === String(n) ? 'bg-pop-solid border-pop-solid text-white' : 'border-input hover:border-pop-550/50'}`}>
              {n}
            </button>
          ))}
          <span className="text-xs text-muted-foreground">{field.ratingMax}</span>
        </div>
      )}
```

- [ ] **Step 6: Verify by keyboard only**

Open http://localhost:3000/adopt?id=<real pet id>. Complete the entire form using only Tab / Shift-Tab / Space / Enter / arrow keys. Every control must be reachable, every focused control must show a visible ring, and radio rows must be tall enough to hit comfortably at 375px.

In DevTools → Accessibility pane, confirm each text field reports its label as its accessible name and each radio group reports the question as its group name.

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/forms/form-renderer.tsx
git commit -m "feat(a11y): associate every adoption-form label with its control

Labels had no htmlFor and inputs no id, so screen readers announced fields
unnamed. Adds id/htmlFor, aria-describedby for descriptions and errors,
aria-invalid, role=group for radio/checkbox sets, role=alert on errors, and
44px minimum touch targets on option rows."
```

---

## Task 1.3: A shared, keyboard-accessible file dropzone

`form-renderer.tsx:228-245` is a `<div onClick>` with a hidden input — invisible to keyboards. `member-add-pet-modal.tsx:413` already has a nicer drag-and-drop zone with a different radius and border. Extract one component and use it in both.

**Files:**
- Create: `components/ui/file-dropzone.tsx`
- Modify: `components/forms/form-renderer.tsx:228-245`
- Modify: `public/locales/{es,en}/common.json`

- [ ] **Step 1: Add the translation keys (Spanish first)**

`public/locales/es/common.json`:

```json
  "dropzone": {
    "activate": "Seleccionar archivo",
    "remove": "Quitar archivo"
  },
```

`public/locales/en/common.json`:

```json
  "dropzone": {
    "activate": "Choose file",
    "remove": "Remove file"
  },
```

- [ ] **Step 2: Write the component**

Create `components/ui/file-dropzone.tsx`:

```tsx
'use client'

import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudArrowUp, faXmark } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  /** MIME types / extensions for the underlying input. */
  accept: string
  /** Primary call to action, e.g. "Adjuntar archivo". */
  label: string
  /** Secondary hint, e.g. "PNG, JPG, WEBP o PDF · max 10MB". */
  hint?: string
  multiple?: boolean
  disabled?: boolean
  /** Name of the currently selected file, shown in place of the label. */
  selectedName?: string | null
  onFiles: (files: FileList) => void
  onClear?: () => void
  className?: string
  /** Associates the zone with an external <label>. */
  'aria-labelledby'?: string
}

/**
 * Styled upload zone that is a real button: focusable, Enter/Space activated,
 * and drag-and-drop capable. Replaces the <div onClick> + hidden input pattern.
 */
export function FileDropzone({
  accept,
  label,
  hint,
  multiple = false,
  disabled = false,
  selectedName,
  onFiles,
  onClear,
  className,
  'aria-labelledby': ariaLabelledBy,
}: FileDropzoneProps) {
  const { t } = useTranslation('common')
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  const open = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : t('dropzone.activate')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled && e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
        }}
        className={cn(
          'focus-ring flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          dragging ? 'border-pop-550/50 bg-pop-550/5' : 'border-input hover:border-pop-550/40'
        )}
      >
        <FontAwesomeIcon icon={faCloudArrowUp} className="text-2xl text-muted-foreground/40" />
        <span className="text-sm text-muted-foreground">{selectedName ?? label}</span>
        {hint && <span className="text-xs text-muted-foreground/60">{hint}</span>}
      </button>
      {selectedName && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="focus-ring self-start rounded-xl px-1 text-xs font-medium text-destructive hover:underline"
        >
          <FontAwesomeIcon icon={faXmark} className="mr-1 text-xs" />
          {t('dropzone.remove')}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Use it in the adoption form**

In `components/forms/form-renderer.tsx`, add the import:

```tsx
import { FileDropzone } from '@/components/ui/file-dropzone'
```

Replace the `file_upload` branch (lines 228–246) with:

```tsx
      {field.type === 'file_upload' && !preview && (
        <FileDropzone
          accept="image/png,image/jpeg,image/webp,.pdf"
          label={t('forms.attach_file')}
          hint={t('forms.attach_hint')}
          selectedName={fileValue?.name ?? null}
          onFiles={(list) => { if (list[0]) onFile(list[0]) }}
          aria-labelledby={`label-${field.id}`}
        />
      )}
```

`faArrowUpFromBracket` is no longer used in this file — remove it from the icon import if nothing else references it.

- [ ] **Step 4: Verify**

Open an adoption form with a file question at http://localhost:3000/adopt?id=<pet with a file field>. Tab to the dropzone: it must show a focus ring and open the picker on both Enter and Space. Drag a file onto it — it must highlight and accept. After selecting, the filename replaces the label and a "Quitar archivo" link appears.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/ui/file-dropzone.tsx components/forms/form-renderer.tsx \
  public/locales/es/common.json public/locales/en/common.json
git commit -m "feat(a11y): make the file dropzone a real, focusable button

The adoption form's upload zone was a <div onClick> with a hidden input, so
keyboard users could not reach it. Extracts a shared FileDropzone with
Enter/Space activation, drag-and-drop, and a consistent rounded-2xl
dashed-border treatment."
```

---

## Task 1.4: Keep the pet identity visible while scrolling

**Files:**
- Modify: `components/adopt/adopt-pet-page.tsx:110-125`

- [ ] **Step 1: Make the pet chip sticky under the banner**

In `components/adopt/adopt-pet-page.tsx`, wrap the pet chip so it pins directly below the 160px banner. Replace the chip's opening `<div>` (line 110):

```tsx
        <div className="sticky top-40 z-10 mb-8 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
```

The chip's contents are unchanged.

> Both this and the form's progress bar (Task 1.1) use `top-40`. Verify they do not overlap: the chip sits above the form in the DOM, so it pins first and the progress bar pins beneath it. If they collide at 375px, move the progress bar to `top-[calc(10rem+4.5rem)]`.

- [ ] **Step 2: Verify**

Load http://localhost:3000/adopt?id=<real pet id> and scroll to the bottom of the form at 1440px and 375px. The banner, pet chip and progress bar must remain visible and must not overlap each other or clip form content.

- [ ] **Step 3: Commit**

```bash
git add components/adopt/adopt-pet-page.tsx
git commit -m "feat(adopt): keep the pet chip visible while scrolling the form

A 25-question form scrolls the pet's identity out of view. The chip now
pins under the rescue-center banner."
```

---

# Milestone 2 — `/pets` (spec §5)

## Task 2.1: Page header with a live result count

The page currently has **no heading at all** — the first heading in the DOM is the detail sheet's `h2`.

**Files:**
- Modify: `components/pets/pets-page.tsx:89-92`
- Create: `components/__tests__/pets/pet-grid-header.test.tsx`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Add the translation keys (Spanish first)**

`public/locales/es/pets.json` — inside `"grid"`:

```json
    "title": "Mascotas en adopción",
    "subtitle": "Conoce a los que están buscando un hogar en República Dominicana.",
    "count_one": "{{count}} mascota buscando hogar",
    "count_other": "{{count}} mascotas buscando hogar",
    "clear_filters": "Limpiar filtros",
```

`public/locales/en/pets.json`:

```json
    "title": "Pets up for adoption",
    "subtitle": "Meet the ones looking for a home in the Dominican Republic.",
    "count_one": "{{count}} pet looking for a home",
    "count_other": "{{count}} pets looking for a home",
    "clear_filters": "Clear filters",
```

- [ ] **Step 2: Write the failing test**

Create `components/__tests__/pets/pet-grid-header.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))
vi.mock('@/lib/hooks/use-media-query', () => ({ useMediaQuery: () => true }))
vi.mock('@/components/transitions/route-transition-context', () => ({
  useRouteTransition: () => ({ status: 'idle', type: null }),
}))
vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: () => ({ user: null }) }))

import { PetsPage } from '@/components/pets/pets-page'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

const pet = (id: string, name: string) =>
  ({ id, name, age: 24, gender: 'female', species: 'dog', photos: [], conditions: [] }) as never

beforeEach(() => vi.clearAllMocks())

describe('PetsPage header', () => {
  it('renders an h1 and a live result count', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna'), pet('2', 'Rex')], error: null })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Mascotas en adopción' })).toBeInTheDocument()
    expect(await screen.findByText('2 mascotas buscando hogar')).toBeInTheDocument()
  })

  it('uses the singular form for one result', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByText('1 mascota buscando hogar')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-grid-header.test.tsx`
Expected: FAIL — there is no `h1` on the page.

- [ ] **Step 4: Add the header**

In `components/pets/pets-page.tsx`, insert the header above `<PetGrid>` (inside the `container` div at line 90):

```tsx
      <div className="container mx-auto flex-1 flex flex-col sm:px-4 sm:pb-0">
        <header className="px-4 pt-6 pb-2 sm:px-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('grid.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('grid.subtitle')}</p>
          {!loading && !error && (
            <p aria-live="polite" className="mt-2 text-xs font-medium text-muted-foreground">
              {t('grid.count', { count: pets.length })}
            </p>
          )}
        </header>
        <PetGrid
```

> The count reflects what the API returned. `PetGrid` also applies a client-side source filter (centres/members), so the header count and the visible cards can differ when that filter is on. That is acceptable — the header describes the search, not the current sub-filter. If you want them to match exactly, lift `sourceFilter` into `PetsPage`; do **not** do that as a drive-by, it is a bigger refactor than this task warrants.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pet-grid-header.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add components/pets/pets-page.tsx components/__tests__/pets/pet-grid-header.test.tsx \
  public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat(pets): add a page header with a live result count

The page had no heading at all — the first DOM heading was the detail
sheet's h2."
```

---

## Task 2.2: Fix the nested interactive card and enrich it

**Root cause:** the card is a `div role="button" tabIndex={0}` (`pet-grid.tsx:275-280`) that **contains** the three-dot `<button>`. Nested interactive content is invalid and confuses assistive tech; Space also scrolls the page because the synthetic key handler never calls `preventDefault`.

**Fix:** make the card a real `<button>` and move the badges and menu out to be its **siblings** inside a positioned wrapper. A real `<button>` handles Space natively without scrolling.

**Files:**
- Modify: `components/pets/pet-grid.tsx:272-362`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Add the translation keys (Spanish first)**

`public/locales/es/pets.json` — inside `"card"`:

```json
    "view_details": "Ver detalles de {{name}}",
    "verified_center": "Publicado por un centro de rescate verificado",
```

`public/locales/en/pets.json`:

```json
    "view_details": "View details for {{name}}",
    "verified_center": "Posted by a verified rescue centre",
```

- [ ] **Step 2: Import the age formatter**

At the top of `components/pets/pet-grid.tsx`:

```tsx
import { formatAge } from '@/lib/utils/format-age'
```

- [ ] **Step 3: Restructure the card**

Replace the whole card block (lines 274–361 — the `sourceFiltered.map(...)` body) with:

```tsx
            {sourceFiltered.map((pet) => {
              const age = formatAge(pet.age)
              return (
                <div
                  key={pet.id}
                  className={`relative group rounded-2xl overflow-hidden aspect-square transition-all ${
                    pet.conditions?.length > 0
                      ? 'bg-warning-bg border-2 border-warning/50'
                      : 'bg-secondary'
                  } ${
                    selectedId === pet.id
                      ? 'outline-2 outline-offset-2 outline-pop-550'
                      : 'hover:outline-2 hover:outline-border'
                  }`}
                >
                  {/*
                    A real <button> rather than div[role=button]: it handles Space
                    natively without scrolling the page, and the menu below is a
                    SIBLING so we never nest interactive content.
                  */}
                  <button
                    type="button"
                    onClick={() => onSelect(pet)}
                    aria-label={t('card.view_details', { name: pet.name })}
                    className="focus-ring absolute inset-0 h-full w-full cursor-pointer rounded-2xl"
                  >
                    {pet.photos.length > 0 ? (
                      <Image
                        src={pet.photos[0].url}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <FontAwesomeIcon icon={faPaw} className="text-2xl text-muted-foreground/30" />
                      </span>
                    )}

                    {/* Name + meta overlay. Spans, not <p>: a button may only
                        contain phrasing content. */}
                    <span className="absolute inset-x-0 bottom-0 block bg-linear-to-t from-primary to-transparent p-2 pt-6 text-left">
                      <span className="block truncate text-sm font-semibold text-background">{pet.name}</span>
                      <span className="block truncate text-[11px] text-background/80">
                        {t(`detail.${age.unit}`, { count: age.count })}
                        {' · '}
                        {t(`gender.${pet.gender}`)}
                      </span>
                    </span>
                  </button>

                  {/* Condition badge */}
                  {pet.conditions?.length > 0 && (
                    <div className="pointer-events-none absolute top-2 left-2 z-10 max-w-[calc(100%-4rem)]">
                      <span className="inline-block rounded-full bg-warning-bg px-2 py-0.5 text-[11px] leading-tight text-warning-foreground">
                        {t('detail.specialCondition')}
                      </span>
                    </div>
                  )}

                  {/* Verified badge — slides left on hover to avoid the menu */}
                  {pet.rescue_center && (
                    <span
                      title={t('card.verified_center')}
                      aria-label={t('card.verified_center')}
                      role="img"
                      className="pointer-events-none absolute top-2 right-2 z-10 text-xl transition-transform duration-200 ease-in-out group-hover:-translate-x-8"
                      style={{ filter: 'drop-shadow(0 2px 4px var(--foreground))' }}
                    >
                      <FontAwesomeIcon icon={faCertificate} className="text-pop-550" />
                      <FontAwesomeIcon icon={faCheck} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-background" />
                    </span>
                  )}

                  {/* Three-dots menu — sibling of the card button */}
                  <div className="absolute top-2 right-2 z-20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={t('card.more_actions')}
                          className="focus-ring flex h-7 w-7 items-center justify-center rounded-full bg-primary transition-colors hover:bg-pop-550"
                        >
                          <FontAwesomeIcon icon={faEllipsis} className="text-sm text-background" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {pet.short_slug && (
                          <DropdownMenuItem onClick={() => handleShare(pet)}>
                            <FontAwesomeIcon icon={faLink} className="text-sm" />
                            {t('card.share')}
                          </DropdownMenuItem>
                        )}
                        {pet.rescue_center?.website && (
                          <DropdownMenuItem onClick={() => window.open(ensureUrl(pet.rescue_center!.website!), '_blank')}>
                            <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                            {t('card.visitWebsite', { name: pet.rescue_center.name })}
                          </DropdownMenuItem>
                        )}
                        {pet.rescue_center?.instagram && (
                          <DropdownMenuItem onClick={() => window.open(instagramUrl(pet.rescue_center!.instagram!), '_blank')}>
                            <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                            {t('card.visitInstagram', { name: pet.rescue_center.name })}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
```

Notes on what changed and why:
- `alt=""` on the photo is now correct — the card button carries the accessible name, so a duplicate alt would announce the pet twice.
- the condition badge is `pointer-events-none` and width-capped so it wraps instead of colliding with the menu;
- the verified badge gets `title` + `aria-label` (spec §5 P2: it needed a text alternative);
- the menu wrapper no longer needs `onClick={e => e.stopPropagation()}` because it is a sibling, not a child;
- `group-focus-within:opacity-100` means keyboard users can actually reach the menu.

- [ ] **Step 4: Bump the skeleton radius to match**

Line 248 — the loading skeleton card:

```tsx
              <div key={i} className="rounded-2xl overflow-hidden bg-secondary animate-pulse">
```

And in `components/transitions/transition-overlay.tsx:57`, change the matching skeleton's `rounded-xl` to `rounded-2xl` so the route transition does not visibly re-round the cards.

- [ ] **Step 5: Verify by keyboard and screen reader**

Open http://localhost:3000/pets:
- Tab through the grid. Each card is one stop with a visible ring; **Space activates it without scrolling the page**; Tab again reaches that card's menu.
- In DevTools → Accessibility, each card reports "Ver detalles de <name>", role button, and no nested button.
- Each card shows name + age + gender in the overlay.
- Cards are `rounded-2xl` and the selected card has a 2px teal outline with a 2px gap.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS — including `design-structure.test.tsx` tests 7 and 8, which query the filter pills, not the cards.

- [ ] **Step 7: Commit**

```bash
git add components/pets/pet-grid.tsx components/transitions/transition-overlay.tsx \
  public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(pets): un-nest the card button and add an info line

The card was div[role=button] wrapping the three-dot <button>, which is
invalid nesting, and Space scrolled the page instead of opening the pet.
The card is now a real button with the menu as a sibling, and shows
age + gender under the name. Radius moves to rounded-2xl."
```

---

## Task 2.3: Empty state offers a way out; error state offers retry

**Files:**
- Modify: `components/pets/pet-grid.tsx:259-270`

- [ ] **Step 1: Accept a retry handler**

`PetsPage` already has `fetchPets` as a `useCallback`. Thread it through. In `components/pets/pets-page.tsx`, add the prop to `<PetGrid>`:

```tsx
          onRetry={() => fetchPets()}
```

In `components/pets/pet-grid.tsx`, extend `PetGridProps`:

```tsx
  onRetry: () => void
```

and destructure `onRetry` in the component signature.

- [ ] **Step 2: Replace the error and empty branches**

Add the import:

```tsx
import { ErrorState } from '@/components/ui/error-state'
```

Replace lines 259–270:

```tsx
        {error && !loading && (
          <ErrorState message={t('grid.error')} onRetry={onRetry} />
        )}

        {!loading && !error && sourceFiltered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <FontAwesomeIcon icon={faPaw} className="text-4xl opacity-30" />
            <p className="text-sm">{t('grid.empty')}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('grid.clear_filters')}
              </button>
            )}
          </div>
        )}
```

- [ ] **Step 3: Add the filter helpers**

In `components/pets/pet-grid.tsx`, just after `mobileFilterCount` (line 66):

```tsx
  const hasActiveFilters = mobileFilterCount > 0

  const clearFilters = () => {
    setSourceFilter('all')
    onVaccinatedChange(false)
    onCastratedChange(false)
    onFilterChange('all', {})
    setShowMobileFilters(false)
  }
```

- [ ] **Step 4: Verify**

Open http://localhost:3000/pets, apply filters that return nothing (e.g. Gatos + Vacunado + Miembros). Expected: the empty state offers "Limpiar filtros" and pressing it restores the full grid. With no filters active the button is absent.

Then go Offline and reload: the grid shows an error with Reintentar.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS. If `design-structure.test.tsx` renders `<PetGrid>` directly it will need the new required `onRetry` prop — add `onRetry={() => {}}` to its `baseProps`.

- [ ] **Step 6: Commit**

```bash
git add components/pets/pet-grid.tsx components/pets/pets-page.tsx components/__tests__/design-structure.test.tsx
git commit -m "feat(pets): give the empty state a way out and the error a retry

An over-filtered grid was a dead end; a failed fetch had no retry."
```

---

## Task 2.4: Layout and filter-popover cleanups (spec §5 P2)

**Files:**
- Modify: `components/pets/pet-grid.tsx:118-241,244`
- Modify: `lib/hooks/use-media-query.ts:4`

- [ ] **Step 1: Kill the phantom viewport**

`pet-grid.tsx:244` has `min-h-screen` **inside** `pets-page.tsx:90`'s `min-h-screen`, so a short result set pushes the footer a full screen down. Remove it:

```tsx
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4 sm:inset-shadow-2xl rounded-t-2xl sm:shadow-2xl bg-background">
```

- [ ] **Step 2: Unify the pill styling**

Drop `shadow-xl` from the 28px-tall desktop pills — it is far too heavy for their size. In every desktop pill class string (lines 118, 131, 142, 154, 161), delete the leading `shadow-xl ` so they read:

```tsx
            className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${
              activeFilter === f.key
                ? 'bg-pop-solid border-pop-solid text-white'
                : 'bg-background border-input text-foreground hover:bg-secondary/80'
            }`}
```

This also brings them in line with the popover chips, which already use borders.

- [ ] **Step 3: Close the mobile popover on outside click and Escape**

Add the import:

```tsx
import { useEffect, useRef, useState } from 'react'
```

Inside the component, after the existing state:

```tsx
  const mobileFiltersRef = useRef<HTMLDivElement>(null)

  // The mobile filter popover is hand-rolled (not Radix), so it needs its own
  // dismiss behaviour.
  useEffect(() => {
    if (!showMobileFilters) return

    const onPointerDown = (e: PointerEvent) => {
      if (!mobileFiltersRef.current?.contains(e.target as Node)) setShowMobileFilters(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMobileFilters(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showMobileFilters])
```

Attach the ref to the mobile filter wrapper (line 169) so both the trigger and the popover are inside it:

```tsx
      <div ref={mobileFiltersRef} className="sm:hidden relative px-2 py-3 shrink-0">
```

And give the popover a radius that matches the house rule (line 188):

```tsx
          <div className="absolute z-20 top-full mt-1 left-2 right-2 rounded-2xl bg-card shadow-lg p-4 space-y-3">
```

- [ ] **Step 4: Fix the media-query hydration flash**

`lib/hooks/use-media-query.ts:4` initializes to `false`, so on desktop the `Drawer` renders for one frame before the `Sheet` takes over. Initialize from `window.matchMedia` when it is available:

```ts
'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  // Lazy initializer runs before paint on the client, so the correct variant
  // renders first. On the server it falls back to false, which matches the
  // static-export HTML.
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}
```

> Read the existing file first and preserve anything else it exports.

- [ ] **Step 5: Verify**

- At 1440px with only 2–3 pets showing, the footer sits just below the grid, not a screen down.
- Desktop pills read as light bordered chips, with the active one in `pop-solid`.
- At 375px, open the filter popover, then tap outside it — it closes. Reopen and press Escape — it closes.
- On desktop, hard-reload `/pets` and `/aliados` and watch for a drawer flashing at the bottom before the side sheet appears. It should be gone.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/pets/pet-grid.tsx lib/hooks/use-media-query.ts
git commit -m "fix(pets): layout and filter-popover cleanups

Removes the nested min-h-screen that pushed the footer a screen down,
drops shadow-xl from 28px pills so desktop and mobile filters match, adds
outside-click/Escape dismissal to the hand-rolled mobile popover, and
initialises useMediaQuery from matchMedia to stop the drawer flash."
```

---

# Milestone 3 — `/aliados` (spec §6)

The weakest page in the audit: two thin cards floating in a blank viewport, decorative disabled filters, a demo-stub CTA, and raw API errors.

## Task 3.1: Page header, real filters, translated badges

**Files:**
- Modify: `components/aliados/provider-grid.tsx`
- Modify: `components/aliados/aliados-page.tsx`
- Create: `components/__tests__/aliados/provider-grid.test.tsx`
- Modify: `public/locales/{es,en}/business.json`

- [ ] **Step 1: Add the translation keys (Spanish first)**

`public/locales/es/business.json` — inside `"aliados"`:

```json
    "subtitle": "Transportistas, peluquerías y cuidadores verificados para tu mascota.",
    "count_one": "{{count}} aliado disponible",
    "count_other": "{{count}} aliados disponibles",
    "load_error": "No pudimos cargar los aliados",
    "empty_cta": "¿Ofreces un servicio? Regístrate",
    "clear_filters": "Limpiar filtros",
```

`public/locales/en/business.json`:

```json
    "subtitle": "Verified transporters, groomers and sitters for your pet.",
    "count_one": "{{count}} partner available",
    "count_other": "{{count}} partners available",
    "load_error": "We couldn't load the partners",
    "empty_cta": "Offer a service? Sign up",
    "clear_filters": "Clear filters",
```

`aliados.filters.all` already exists in both files and is kept. The stale `walking`, `sitting` keys inside `aliados.filters` become unused — leave them in place; a follow-up cleanup can remove them once nothing references them.

- [ ] **Step 2: Write the failing test**

Create `components/__tests__/aliados/provider-grid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { ProviderGrid } from '@/components/aliados/provider-grid'
import { UnifiedProvider } from '@/lib/api/providers'

const provider = (id: string, name: string, services: string[]): UnifiedProvider => ({
  id, user_id: `u${id}`, name, type: 'member', services, price: 1500,
})

const PROVIDERS = [
  provider('1', 'Transporte RD', ['transport']),
  provider('2', 'Baños Luna', ['grooming', 'pet_sitting']),
]

const baseProps = {
  providers: PROVIDERS,
  loading: false,
  error: null,
  selectedId: null,
  onSelect: () => {},
  onRetry: () => {},
}

describe('ProviderGrid', () => {
  it('translates service badges instead of showing raw backend strings', () => {
    renderWithProviders(<ProviderGrid {...baseProps} />)
    expect(screen.getByText('Transporte')).toBeInTheDocument()
    expect(screen.getByText('Cuidado de mascotas')).toBeInTheDocument()
    expect(screen.queryByText('pet_sitting')).not.toBeInTheDocument()
  })

  it('filters the grid when a service pill is pressed', () => {
    renderWithProviders(<ProviderGrid {...baseProps} />)
    expect(screen.getByText('Transporte RD')).toBeInTheDocument()
    expect(screen.getByText('Baños Luna')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Peluquería' }))

    expect(screen.queryByText('Transporte RD')).not.toBeInTheDocument()
    expect(screen.getByText('Baños Luna')).toBeInTheDocument()
  })

  it('marks the active pill with aria-pressed', () => {
    renderWithProviders(<ProviderGrid {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Peluquería' }))
    expect(screen.getByRole('button', { name: 'Peluquería' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows an error state with retry instead of the raw API string', () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <ProviderGrid {...baseProps} providers={[]} error="dial tcp 127.0.0.1:2701: connect: refused" onRetry={onRetry} />
    )
    expect(screen.getByText('No pudimos cargar los aliados')).toBeInTheDocument()
    expect(screen.queryByText(/dial tcp/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/aliados/provider-grid.test.tsx`
Expected: FAIL — pills are disabled, badges render raw strings, errors print the raw string.

- [ ] **Step 4: Rewrite `provider-grid.tsx`**

Replace the whole file:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHandshake } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import { SERVICE_TYPES } from '@/lib/api/service-providers'
import { ProviderCard } from '@/components/providers/provider-card'
import { ErrorState } from '@/components/ui/error-state'
import { TransitionLink } from '@/components/transitions/transition-link'

/*
  Filter keys come from SERVICE_TYPES — the values providers actually store in
  services[]. The older aliados.filters.* list (walking/sitting) never matched
  those values, so the pills could not have filtered anything even if they had
  been enabled. Labels come from service_providers.services.*, which is an
  exact match for SERVICE_TYPES.
*/
type FilterKey = 'all' | (typeof SERVICE_TYPES)[number]

const FILTERS: FilterKey[] = ['all', ...SERVICE_TYPES]

interface ProviderGridProps {
  providers: UnifiedProvider[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (provider: UnifiedProvider) => void
  onRetry: () => void
}

export function ProviderGrid({
  providers,
  loading,
  error,
  selectedId,
  onSelect,
  onRetry,
}: ProviderGridProps) {
  const { t } = useTranslation('business')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const filtered = useMemo(
    () => (activeFilter === 'all' ? providers : providers.filter((p) => p.services.includes(activeFilter))),
    [providers, activeFilter]
  )

  const filterLabel = (key: FilterKey) =>
    key === 'all' ? t('aliados.filters.all') : t(`service_providers.services.${key}`)

  return (
    <div className="flex flex-col flex-1">
      <header className="px-4 pt-6 pb-2 sm:px-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('aliados.title')}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('aliados.subtitle')}</p>
        {!loading && !error && (
          <p aria-live="polite" className="mt-2 text-xs font-medium text-muted-foreground">
            {t('aliados.count', { count: filtered.length })}
          </p>
        )}
      </header>

      {/* Filter pills */}
      <div className="flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            aria-pressed={activeFilter === key}
            className={`focus-ring flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === key
                ? 'bg-pop-solid border-pop-solid text-white'
                : 'bg-background border-input text-foreground hover:bg-secondary/80'
            }`}
          >
            {filterLabel(key)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4 sm:inset-shadow-2xl rounded-t-2xl sm:shadow-2xl bg-background">
        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              // Mirrors ProviderCard: avatar left, two text lines, chips, price.
              <div key={i} className="rounded-2xl border bg-card p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/3 rounded bg-muted" />
                  </div>
                </div>
                <div className="h-3 w-full rounded bg-muted" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-5 w-20 rounded-full bg-muted" />
                </div>
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <ErrorState message={t('aliados.load_error')} onRetry={onRetry} />
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <FontAwesomeIcon icon={faHandshake} className="text-4xl opacity-30" />
            <p className="text-sm">{t('aliados.empty')}</p>
            {activeFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('aliados.clear_filters')}
              </button>
            ) : (
              <TransitionLink
                href="/servicios"
                className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('aliados.empty_cta')}
              </TransitionLink>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                selected={selectedId === provider.id}
                onClick={() => onSelect(provider)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

Key changes beyond the spec's list: the grid drops from 4 columns to 3 (and to 1 at mobile) so a small provider set fills the row rather than looking abandoned, the selection ring moves onto the card itself, and the skeleton now mirrors the real card shape instead of an image-top layout.

- [ ] **Step 5: Pass the retry handler through**

In `components/aliados/aliados-page.tsx`, add the prop to `<ProviderGrid>`:

```tsx
          onRetry={fetchProviders}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/aliados/provider-grid.test.tsx`
Expected: PASS — 4 tests. (The `selected` prop on `ProviderCard` lands in Task 3.2; until then TypeScript will complain — apply Task 3.2 before running `tsc`.)

- [ ] **Step 7: Commit**

```bash
git add components/aliados/provider-grid.tsx components/aliados/aliados-page.tsx \
  components/__tests__/aliados/provider-grid.test.tsx \
  public/locales/es/business.json public/locales/en/business.json
git commit -m "feat(aliados): real filters, page header and honest error state

The filter pills were permanently disabled and keyed off a service list
that never matched what providers actually store. They now derive from
SERVICE_TYPES and filter client-side. Adds an h1 + description + count,
replaces the raw API error string with a retryable error state, and makes
the skeleton match the real card shape."
```

---

## Task 3.2: A card worth the grid

**Files:**
- Modify: `components/providers/provider-card.tsx`

- [ ] **Step 1: Rewrite the card**

Replace the whole of `components/providers/provider-card.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faBriefcase } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import Image from 'next/image'

interface ProviderCardProps {
  provider: UnifiedProvider
  selected?: boolean
  onClick: () => void
}

export function ProviderCard({ provider, selected = false, onClick }: ProviderCardProps) {
  const { t, i18n } = useTranslation('business')
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'

  const initials = provider.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Prices are DOP. Intl gives "RD$1,500" in es-DO instead of a hand-rolled
  // "RD$" prefix over a browser-locale toLocaleString().
  const price = provider.price != null
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'DOP',
        maximumFractionDigits: 0,
      }).format(provider.price)
    : t('provider.price_unavailable')

  return (
    <button
      onClick={onClick}
      className={`focus-ring w-full text-left rounded-2xl border bg-card p-4 space-y-3 transition-colors hover:bg-muted/50 ${
        selected ? 'outline-2 outline-offset-2 outline-pop-550' : ''
      }`}
    >
      {/* Header: photo/initials + name + trust badge */}
      <div className="flex items-center gap-3">
        {provider.cover_photo_url ? (
          <Image
            src={provider.cover_photo_url}
            alt=""
            width={48}
            height={48}
            className="rounded-full object-cover w-12 h-12 shrink-0"
          />
        ) : (
          <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-success" />
            <span className="text-xs text-success truncate">
              {provider.type === 'business'
                ? t('provider.business_verified')
                : t('provider.member_verified')}
            </span>
          </div>
        </div>
      </div>

      {/* Description snippet */}
      {provider.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {provider.description}
        </p>
      )}

      {/* Service badges — rounded-full chips, matching /pets */}
      {provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {provider.services.map(service => (
            <span
              key={service}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {t(`service_providers.services.${service}`, { defaultValue: service })}
            </span>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="flex items-center gap-1.5">
        <FontAwesomeIcon icon={faBriefcase} className="text-xs text-muted-foreground" />
        <span className="text-sm font-medium">{price}</span>
      </div>
    </button>
  )
}
```

`defaultValue: service` means an unrecognised backend value degrades to the raw string rather than rendering a translation key — better than either the old raw-string behaviour or a blank badge.

- [ ] **Step 2: Verify**

Open http://localhost:3000/aliados. Expected:
- header with title, description and count;
- pills that actually filter, with the active one filled `pop-solid` and reporting `aria-pressed`;
- badges reading "Transporte", "Cuidado de mascotas" — never `pet_sitting`;
- prices as `RD$1,500`;
- cards `rounded-2xl`, each a single Tab stop with a focus ring;
- a two-provider dataset now fills the row purposefully instead of leaving a blank viewport.

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add components/providers/provider-card.tsx
git commit -m "feat(aliados): richer provider card

Adds a description snippet, translated rounded-full service chips, and a
DOP price via Intl.NumberFormat instead of a hand-rolled RD$ prefix over a
browser-locale toLocaleString. Radius moves to rounded-2xl and the
selection ring lives on the card."
```

---

## Task 3.3: Retire the demo-stub "Contactar" button (spec §6, Q3 decision)

Wiring this to chat is a separate cross-repo spec (`pelu/docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md`). Until that ships, a permanently-disabled button is worse than no button — it promises something that never happens.

**Files:**
- Modify: `components/aliados/provider-detail.tsx`

- [ ] **Step 1: Remove the disabled CTA**

Delete the entire footer block at the end of `components/aliados/provider-detail.tsx` (the `<div className="p-4 border-t border-border shrink-0">` wrapper and the disabled button inside it), and leave this comment in its place:

```tsx
      {/*
        The "Contactar" CTA is intentionally absent until the aliados→chat
        wiring ships. See
        pelu/docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md.
        A permanently-disabled button promises something that never happens;
        Instagram and the address above are the working contact affordances.
      */}
```

The `aliados.contact` translation key stays in both locale files — the follow-up spec will use it.

- [ ] **Step 2: Verify**

Open http://localhost:3000/aliados and select a provider. The detail panel should end with the address / Instagram links and no dead button. Instagram and the address remain the visible contact routes.

- [ ] **Step 3: Commit**

```bash
git add components/aliados/provider-detail.tsx
git commit -m "chore(aliados): remove the permanently-disabled Contactar button

Chat wiring is a separate cross-repo spec. Until it ships, the address and
Instagram links are the real contact affordances; a dead button is worse
than none."
```

---

# Milestone 4 — `/chat` P1/P2 (spec §8)

## Task 4.1: Send feedback and connection status

**Root cause:** `chat-message-thread.tsx:188-193` clears the input the instant you press Enter and fires the socket message. If the socket is down, the message vanishes with no trace.

**Files:**
- Modify: `components/chat/chat-message-thread.tsx`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Check what the WebSocket context exposes**

```bash
grep -n 'connected\|isConnected\|readyState\|status' lib/contexts/websocket-context.tsx | head -20
```

If it already exposes a connection flag, use it. If it does not, add one: a `connected` boolean in the context value, set from the socket's `onopen` / `onclose` handlers. Keep the change to that one field — do not restructure the context.

- [ ] **Step 2: Add the translation keys (Spanish first)**

`public/locales/es/pets.json` — inside `"chat"`:

```json
    "offline_banner": "Sin conexión. Los mensajes no se enviarán hasta que se restablezca.",
    "sending": "Enviando…",
```

`public/locales/en/pets.json`:

```json
    "offline_banner": "You're offline. Messages won't send until the connection is back.",
    "sending": "Sending…",
```

- [ ] **Step 3: Block sending while disconnected and say so**

In `components/chat/chat-message-thread.tsx`, pull the flag from the context:

```tsx
  const { subscribe, sendMessage, sendTyping, sendReadReceipt, connected } = useWebSocket()
```

Guard `handleSend` (line 188):

```tsx
  const handleSend = () => {
    const body = input.trim()
    if (!body || !connected) return
    sendMessage(conversation.id, body)
    setInput('')
  }
```

Add a banner above the input bar (just before the `<div className="flex items-center gap-2 p-4 border-t ...">` at line 317):

```tsx
      {!connected && (
        <div role="status" className="border-t border-warning/40 bg-warning-bg px-4 py-2 text-xs text-warning-foreground">
          {t('chat.offline_banner')}
        </div>
      )}
```

And disable the input and send button while offline:

```tsx
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={!connected}
          aria-label={t('chat.message_label')}
          placeholder={t('chat.placeholder')}
          className="focus-ring flex-1 rounded-xl border border-input bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !connected}
          aria-label={t('chat.send')}
          className="focus-ring bg-pop-solid text-white rounded-xl p-2.5 transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
        </button>
```

> This is the "disable send + show a reconnect banner" option from spec §8 P1. It is the smaller, more reliable of the two options offered (the alternative is optimistic bubbles with per-message retry) and it makes the failure impossible rather than recoverable.

- [ ] **Step 4: Verify**

Open a conversation at http://localhost:3000/chat, then stop the API (`docker compose stop` in `pelu/api/`).
Expected: within a few seconds the amber banner appears, the input and send button grey out, and typing/Enter does nothing silently-destructive. Restart the API — the banner clears and sending works again.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Any test mocking `useWebSocket` must add `connected: true` to its mock — update `components/__tests__/chat/chat-conversation-list.test.tsx` and any other hits from `grep -rln useWebSocket components/__tests__/`.

- [ ] **Step 6: Commit**

```bash
git add components/chat/chat-message-thread.tsx lib/contexts/websocket-context.tsx \
  components/__tests__/ public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(chat): stop silently dropping messages when the socket is down

The input cleared on Enter regardless of socket state, so a message sent
while disconnected vanished with no trace. Sending is now blocked with a
visible reconnect banner."
```

---

## Task 4.2: Chat accessibility

**Files:**
- Modify: `components/chat/chat-message-thread.tsx:236-240,285-290,299-309`

- [ ] **Step 1: Announce incoming messages**

Give the message region live-region semantics (line 236):

```tsx
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t('chat.my_conversations')}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
```

- [ ] **Step 2: Give the typing indicator a text alternative**

Add the keys — `public/locales/es/pets.json` inside `"chat"`:

```json
    "typing": "{{name}} está escribiendo…",
    "read": "Leído",
    "delivered": "Enviado",
```

`public/locales/en/pets.json`:

```json
    "typing": "{{name}} is typing…",
    "read": "Read",
    "delivered": "Sent",
```

Then wrap the indicator (line 299):

```tsx
            {showTyping && (
              <div className="flex justify-start mb-2">
                <div className="bg-card border border-border rounded-[16px_16px_16px_4px] px-4 py-3">
                  <span className="sr-only">
                    {t('chat.typing', { name: conversation.other_user_name || conversation.other_user_email })}
                  </span>
                  <div aria-hidden="true" className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
```

- [ ] **Step 3: Replace the tick glyphs with Font Awesome**

Add to the icon import:

```tsx
import { faCheck, faCheckDouble } from '@fortawesome/free-solid-svg-icons'
```

Replace the read-receipt span (line 287–289):

```tsx
                          {isSent && (
                            <FontAwesomeIcon
                              icon={msg.is_read ? faCheckDouble : faCheck}
                              aria-label={msg.is_read ? t('chat.read') : t('chat.delivered')}
                              className="ml-1 text-[10px]"
                            />
                          )}
```

- [ ] **Step 4: Add focus rings to the conversation rows**

`components/chat/chat-conversation-list.tsx` line 121 — prepend `focus-ring ` to the row button's class template:

```tsx
            className={`focus-ring flex items-center gap-3 text-left transition-colors ${
```

- [ ] **Step 5: Verify with a screen reader**

Turn on the OS screen reader (or use Chrome DevTools → Accessibility). Have someone send you a message — it should be announced without stealing focus. The typing indicator should read as "X está escribiendo…". Each sent message's tick should report "Leído" or "Enviado".

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/chat/ public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat(a11y): make the chat thread screen-reader usable

Adds role=log/aria-live to the message region, a text alternative for the
typing indicator, and Font Awesome read receipts with labels instead of
bare check glyphs."
```

---

## Task 4.3: Panel treatment and the header-height magic number (spec §8 P2)

**Files:**
- Modify: `components/chat/chat-page.tsx:31-62`
- Modify: `components/chat/chat-message-thread.tsx` (bubble radii)

- [ ] **Step 1: Replace the hardcoded viewport math**

`chat-page.tsx:33` uses `h-[calc(100vh-72px)]` while the real header is ~88px tall, so the layout is 16px off. Use a flex column instead of arithmetic:

```tsx
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <PetsHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 overflow-hidden p-0 sm:p-4">
        {/* Left sidebar — conversation list */}
        <div
          className={`w-80 shrink-0 flex-col overflow-hidden rounded-none border-border bg-background sm:rounded-2xl sm:border ${
            active ? 'hidden md:flex' : 'flex w-full md:w-80'
          }`}
        >
          <div className="border-b border-border p-4">
            <h1 className="text-lg font-semibold">{t('chat.my_conversations')}</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatConversationList onSelectConversation={setActive} />
          </div>
        </div>

        {/* Right panel — message thread or empty state */}
        <div
          className={`flex-1 flex-col overflow-hidden rounded-none border-border bg-background sm:rounded-2xl sm:border ${
            active ? 'flex' : 'hidden md:flex'
          }`}
        >
          {active ? (
            <ChatMessageThread conversation={active} onBack={() => setActive(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <FontAwesomeIcon icon={faComments} className="text-4xl text-muted-foreground/20" />
              <p className="text-sm">{t('chat.select_conversation')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
```

This also removes the raw shadow left over from Plan A Task 18 — the panels are now card surfaces with real borders, consistent with the rest of the app.

- [ ] **Step 2: Move the bubble radii onto scale values**

In `components/chat/chat-message-thread.tsx`, replace the two arbitrary radius strings. Sent bubble (line 280):

```tsx
                            ? 'bg-pop-solid text-white rounded-2xl rounded-br-sm'
```

Received bubble (line 281) and the typing indicator (line 301):

```tsx
                            : 'bg-card border border-border rounded-2xl rounded-bl-sm'
```

> `rounded-br-sm` / `rounded-bl-sm` give the same "tail" effect as `rounded-[16px_16px_4px_16px]` using scale values. The `rounded-sm` ban in `design-system.test.ts` matches `\brounded-sm\b`, which does **not** match `rounded-br-sm` — verify with `npx vitest run components/__tests__/design-system.test.ts` and, if it does trip, use `rounded-br-[4px]` instead.

- [ ] **Step 3: Verify**

Open http://localhost:3000/chat at 1440px and 375px. Expected:
- no vertical scrollbar caused by the old 72px assumption, and no gap under the input bar;
- desktop shows two rounded card panels with a gap between them;
- mobile is still full-bleed with the sidebar/thread swap intact;
- bubbles keep their tail shape.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/chat/chat-page.tsx components/chat/chat-message-thread.tsx
git commit -m "style(chat): card panels and a flex layout instead of viewport math

h-[calc(100vh-72px)] assumed a 72px header that is actually ~88px. Replaces
it with a min-h-dvh flex column, gives both columns rounded-2xl card
surfaces, and moves bubble radii onto scale values."
```

---

## Task 4.4: Skeleton for the conversation list (spec §3.2 tier 2)

Spec §3.2 puts the chat conversation list in the skeleton tier alongside the `/mis-mascotas` grid, but Plan B left it on the shared `Spinner`. A centred spinner in a 320px sidebar reads as "broken" rather than "loading", and the rows jump in when data lands.

**Files:**
- Modify: `components/chat/chat-conversation-list.tsx`

- [ ] **Step 1: Add a row skeleton that matches the real row**

In `components/chat/chat-conversation-list.tsx`, add above the default export:

```tsx
/** Mirrors a full conversation row: avatar, name line, snippet line. */
function ConversationRowSkeleton({ darkBg, compact }: { darkBg: boolean; compact: boolean }) {
  const bar = darkBg ? 'bg-sidebar-foreground/10' : 'bg-muted'
  return (
    <div className={`flex items-center gap-3 animate-pulse ${compact ? 'px-3 py-2.5' : 'p-3'}`}>
      <div className={`shrink-0 rounded-full ${bar} ${compact ? 'h-5 w-5' : 'h-7 w-7'}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-3 w-2/3 rounded ${bar}`} />
        {!compact && <div className={`h-2.5 w-1/2 rounded ${bar}`} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Use it instead of the spinner**

Replace the `if (loading)` branch (added in Plan B Task 4):

```tsx
  if (loading) {
    return (
      <div className="flex flex-col gap-1" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <ConversationRowSkeleton key={i} darkBg={darkBg} compact={compact} />
        ))}
      </div>
    )
  }
```

The `Spinner` import can go if nothing else in the file uses it.

- [ ] **Step 3: Verify**

Throttle to Slow 3G and load http://localhost:3000/chat. Expected: six placeholder rows in the sidebar that the real conversations replace without the list jumping. Check the `darkBg` variant too — `ChatConversationList` is reused inside the rescue-center and business dashboard sidebars with `darkBg`/`compact`, so confirm the skeleton is visible against the dark sidebar there and does not break their layout.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/chat/chat-conversation-list.tsx
git commit -m "feat(chat): skeleton rows instead of a spinner in the sidebar

A centred spinner in a 320px column reads as broken rather than loading,
and the rows jumped in when data landed."
```

---

# Milestone 5 — `/mis-mascotas` P1/P2 (spec §9)

## Task 5.1: Pet photos have no alt text; the grid has no skeleton

**Files:**
- Modify: `components/pets/user-pet-card.tsx:9-37`
- Create: `components/pets/user-pet-card-skeleton.tsx`
- Modify: `app/mis-mascotas/page.tsx`

- [ ] **Step 1: Pass the pet's name to the carousel**

`user-pet-card.tsx:15` passes `title: ''` to every carousel item, which `Carousel.tsx:90` turns into `alt=""`. Give it the pet's name.

Replace `CardCarousel` (lines 9–37):

```tsx
function CardCarousel({ urls, name }: { urls: string[]; name: string }) {
  const [width, setWidth] = useState(0)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    // Carousel forwards title into the img alt. Empty strings made every pet
    // photo on the grid invisible to screen readers.
    title: name,
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  return (
    <div ref={(el) => { if (el && width === 0) setWidth(el.offsetWidth) }} className="w-full h-full">
      {width > 0 && (
        <Carousel
          items={items}
          baseWidth={width}
          autoplay={urls.length > 1}
          autoplayDelay={3000}
          pauseOnHover
          loop={urls.length > 1}
          containerPadding={0}
          dotsOverlay
          className="relative overflow-hidden w-full h-full"
        />
      )}
    </div>
  )
}
```

And update the call site (line 67):

```tsx
          <CardCarousel urls={photoUrls} name={name.trim() || t('details.name')} />
```

> Check `components/Carousel.tsx:90` first — if it renders `alt={item.title}` this works as-is. If it renders the title as visible text too, add a dedicated `alt` field to the item type instead of reusing `title`.

- [ ] **Step 2: Add a skeleton that matches the card**

Create `components/pets/user-pet-card-skeleton.tsx`:

```tsx
/** Mirrors UserPetCard's shape so the grid does not jump when data lands. */
export function UserPetCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border bg-card shadow-xs animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Use it instead of the lone spinner**

In `app/mis-mascotas/page.tsx`, add the import:

```tsx
import { UserPetCardSkeleton } from '@/components/pets/user-pet-card-skeleton'
```

Replace the `loading` branch (the `<Spinner>` block from Plan B Task 7):

```tsx
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <UserPetCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
```

The `Spinner` import can go if nothing else in the file uses it.

- [ ] **Step 4: Verify**

Throttle to Slow 3G and load http://localhost:3000/mis-mascotas. Expected: a skeleton grid in the real card shape, no layout jump when the pets arrive.

In DevTools → Elements, confirm each grid photo's `alt` is the pet's name, not empty.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/pets/user-pet-card.tsx components/pets/user-pet-card-skeleton.tsx app/mis-mascotas/page.tsx
git commit -m "feat(mis-mascotas): name every pet photo and add a grid skeleton

UserPetCard passed title:'' to Carousel, so every grid photo rendered
alt='' and was invisible to screen readers. The lone centred spinner is
replaced by a skeleton grid matching the card shape."
```

---

## Task 5.2: Give the add-pet modal real dialog semantics

**Root cause:** `member-add-pet-modal.tsx:192-210` is a hand-rolled Framer Motion overlay with no focus trap, no Escape handler and no `role="dialog"` — while the delete flow on the same page uses Radix correctly. It is also **mounted twice**: once by the page (`app/mis-mascotas/page.tsx:128`) and once by the header (`pets-header.tsx:376`).

**Files:**
- Modify: `components/pets/member-add-pet-modal.tsx`
- Modify: `app/mis-mascotas/page.tsx`

- [ ] **Step 1: Fix the double mount first**

`PetsHeader` already renders `<MemberAddPetModal open={addPetOpen} …/>` for its "Publicar mascota" action, and `/mis-mascotas` renders a second instance. Two mounted modals means two sets of state and two hidden file inputs.

Keep the page's instance (it is the one wired to `editingPet` and `onSaved={load}`) and make the header's action **navigate** instead of opening its own copy. In `components/pets/pets-header.tsx`:

- delete the `<MemberAddPetModal open={addPetOpen} onClose={() => setAddPetOpen(false)} />` at line 376;
- delete the `addPetOpen` state at line 43;
- delete the `MemberAddPetModal` import;
- change the "Publicar mascota" button (line 324) to a link to `/mis-mascotas`:

```tsx
            {user?.role === 'member' && (
              <Link
                href="/mis-mascotas?add=1"
                onClick={() => setSheetOpen(false)}
                className="focus-ring flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <FontAwesomeIcon icon={faPaw} className="text-lg text-pop-550" />
                {t('member.publish_pet')}
              </Link>
            )}
```

Then in `app/mis-mascotas/page.tsx`, open the modal when that query param is present:

```tsx
import { useSearchParams } from 'next/navigation'
```

```tsx
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams?.get('add') === '1') setModalOpen(true)
  }, [searchParams])
```

> `/mis-mascotas` is already a client route under a `ProtectedRoute` layout; `useSearchParams` there needs a `<Suspense>` boundary in the layout if the build complains — mirror what `app/adopt/page.tsx` does.

- [ ] **Step 2: Rebuild the modal on the Radix Dialog primitive**

`components/ui/dialog.tsx` already exports `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`. Replace the outer `<AnimatePresence>` / `motion.div` shell in `member-add-pet-modal.tsx` (lines 192–210 and the matching closers) with:

```tsx
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      <DialogContent className="max-h-[90vh] w-[90%] overflow-hidden p-0 shadow-lg md:max-w-3xl">
        <DialogHeader className="p-6 pb-0 text-left">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t('member.edit_title') : t('member.publish_title')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit ? t('member.edit_subtitle') : t('member.publish_subtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Mobile preview toggle */}
        <button
          type="button"
          onClick={() => setMobilePreview(prev => !prev)}
          className="focus-ring mx-6 self-start rounded-xl text-xs font-medium text-pop-300 transition-colors hover:text-pop-550 md:hidden"
        >
          {mobilePreview ? t('dashboard.edit') : t('dashboard.preview')}
        </button>

        {/* Body — two-panel on desktop */}
        <div className="flex gap-6 overflow-y-auto p-6 pt-4">
          {/* … existing left panel and right preview panel, unchanged … */}
        </div>
      </DialogContent>
    </Dialog>
```

Radix supplies the focus trap, Escape handling, `role="dialog"`, `aria-modal`, the overlay and its own close button — so the hand-rolled `faXmark` button, the `bg-black/50` backdrop div and the `onClick={handleClose}` backdrop handler all come out.

Update the imports: drop `AnimatePresence` and `motion` if `Reorder` is the only remaining `motion` usage (it is — keep `Reorder`), and add:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
```

- [ ] **Step 3: Associate the remaining labels**

Every labelled field in the modal (name, age, gender, species, size, description, vaccinated, castrated) needs `htmlFor`/`id`. Find them:

```bash
grep -n '<label' components/pets/member-add-pet-modal.tsx
```

For each, add `htmlFor="pet-<field>"` to the label and the matching `id="pet-<field>"` to the control. For the photos section the label points at the `FileDropzone` via `aria-labelledby` (Task 1.3's prop).

- [ ] **Step 4: Announce errors and confirm saves**

The error paragraph gets `role="alert"`:

```tsx
              {error && (
                <p role="alert" className="text-sm text-destructive">{error}</p>
              )}
```

And add a success toast on save, so it matches the delete flow which already has one. In `handleSubmit`, just before `onSaved?.()`:

```tsx
    toast.success(isEdit ? t('member.saved') : t('member.published'))
```

with `import { toast } from 'sonner'` and the keys — `public/locales/es/pets.json` inside `"member"`:

```json
    "saved": "Mascota actualizada",
    "published": "Mascota publicada",
```

`public/locales/en/pets.json`:

```json
    "saved": "Pet updated",
    "published": "Pet published",
```

- [ ] **Step 4b: Say that existing photos can't be edited yet (spec §9 P2)**

`member-add-pet-modal.tsx` renders existing photos read-only in edit mode with no explanation, so the user assumes the UI is broken. Confirm first whether the API supports deletion:

```bash
grep -n 'photo' lib/api/user-pets.ts
grep -rn 'photos' /home/noob_master/pelu/api/docs/api/swagger.yaml | grep -i 'user-pets\|delete'
```

**If a delete endpoint exists**, wire a remove button onto each existing photo, mirroring the new-photo remove button.

**If it does not** (the likely case — the spec assumed so), add a hint under the existing-photos label:

```tsx
              {isEdit && existingPhotoUrls.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('member.existing_photos')}</label>
                  <p className="text-xs text-muted-foreground/70">{t('member.photos_readonly')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {existingPhotoUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt={t('member.photo_alt', { name: name.trim() || t('details.name') })} className="w-14 h-14 rounded-xl object-cover" />
                    ))}
                  </div>
                </div>
              )}
```

with the keys — `public/locales/es/pets.json` inside `"member"`:

```json
    "photos_readonly": "Por ahora las fotos ya publicadas no se pueden eliminar. Puedes añadir nuevas.",
```

`public/locales/en/pets.json`:

```json
    "photos_readonly": "Published photos can't be removed yet. You can still add new ones.",
```

Note this also fixes the `alt=""` on existing photos, which had the same problem as the grid photos in Task 5.1.

- [ ] **Step 5: Verify**

Open http://localhost:3000/mis-mascotas and press "Añadir mascota":
- Tab cycles **inside** the modal and never escapes to the page behind it;
- Escape closes it;
- DevTools → Accessibility reports `role: dialog`, `modal: true`, and the title as its accessible name;
- every field reports its label as its accessible name;
- saving shows a toast;
- opening the account sheet → "Publicar mascota" navigates to `/mis-mascotas` with the modal already open, and there is exactly **one** modal in the DOM.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS. `components/__tests__/pets/member-add-pet-modal.test.tsx` exists and will need updating if it asserts on the old hand-rolled markup — read it and adjust the selectors, keeping the behavioural assertions.

- [ ] **Step 7: Commit**

```bash
git add components/pets/member-add-pet-modal.tsx components/pets/pets-header.tsx \
  app/mis-mascotas/page.tsx components/__tests__/pets/member-add-pet-modal.test.tsx \
  public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(a11y): rebuild the add-pet modal on the Radix Dialog primitive

The hand-rolled Framer overlay had no focus trap, Escape handler or dialog
role, while the delete flow on the same page used Radix correctly. Also
de-duplicates the modal, which was mounted by both the page and the header."
```

---

## Task 5.3: Card legibility polish (spec §9 P2)

**Files:**
- Modify: `components/pets/user-pet-card.tsx:88-96,21-22`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Add the status labels (Spanish first)**

`public/locales/es/pets.json` — inside `"grid"` (next to the existing `vaccinated`/`castrated`):

```json
    "not_vaccinated": "Sin vacunar",
    "not_castrated": "Sin castrar",
```

`public/locales/en/pets.json`:

```json
    "not_vaccinated": "Not vaccinated",
    "not_castrated": "Not neutered",
```

- [ ] **Step 2: Stop relying on colour alone**

Green vs grey icons carry the whole meaning today. Replace the meta row (lines 88–96):

```tsx
        <div className="mt-1 flex items-center gap-2">
          <span
            title={vaccinated ? t('grid.vaccinated') : t('grid.not_vaccinated')}
            className={`inline-flex items-center gap-1 text-xs ${vaccinated ? 'text-success' : 'text-muted-foreground/40'}`}
          >
            <FontAwesomeIcon icon={faSyringe} className="text-xs" aria-hidden="true" />
            <span className="sr-only">{vaccinated ? t('grid.vaccinated') : t('grid.not_vaccinated')}</span>
          </span>
          <span
            title={castrated ? t('grid.castrated') : t('grid.not_castrated')}
            className={`inline-flex items-center gap-1 text-xs ${castrated ? 'text-success' : 'text-muted-foreground/40'}`}
          >
            <FontAwesomeIcon icon={faScissors} className="text-xs" aria-hidden="true" />
            <span className="sr-only">{castrated ? t('grid.castrated') : t('grid.not_castrated')}</span>
          </span>
          {size && (
            <span className="text-xs text-muted-foreground">
              {size === 'small' ? t('size.small') : size === 'medium' ? t('size.medium') : t('size.large')}
            </span>
          )}
        </div>
```

- [ ] **Step 3: Stop the carousel first-paint flash**

`CardCarousel` renders nothing until it has measured its width, so every card blinks on first paint. Give it a sane default (line 10 and 22):

```tsx
function CardCarousel({ urls, name }: { urls: string[]; name: string }) {
  // Start at a plausible card width so the first paint shows a photo instead
  // of an empty box; the ref callback corrects it before the user notices.
  const [width, setWidth] = useState(240)
```

and change the guard from `{width > 0 && (` to always render (delete the conditional wrapper, keeping the `<Carousel …>`).

- [ ] **Step 4: Unify the shadow scale**

The card uses `shadow-xs`, the action buttons `shadow-sm`, the modal none. Pick `shadow-sm` throughout: change the card's wrapper (line 64) to `shadow-sm`, and the `DialogContent` in Task 5.2 already carries `shadow-lg` for the floating modal.

- [ ] **Step 5: Verify**

Open http://localhost:3000/mis-mascotas. Hover the syringe/scissors icons — a tooltip states the status. In DevTools → Accessibility each reports its status text. Reload and watch the cards: photos should appear immediately, not after a blank frame.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/pets/user-pet-card.tsx public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat(a11y): don't convey pet health status by colour alone

Vaccinated/neutered were green-vs-grey icons with no text. Adds tooltips
and sr-only labels, fixes the carousel's blank first paint, and unifies
the card shadow scale."
```

---

# Milestone 6 — `/servicios` (spec §10)

## Task 6.1: Page framing and status cards

**Files:**
- Create: `components/service-providers/status-card.tsx`
- Modify: `app/servicios/page.tsx`
- Modify: `public/locales/{es,en}/business.json`

- [ ] **Step 1: Add the keys (Spanish first)**

`public/locales/es/business.json` — inside `"service_providers"`:

```json
    "subtitle": "Regístrate como aliado de Pelú y aparece en el directorio que ven todos los adoptantes.",
    "pending_next": "Suele tardar 1–2 días hábiles. Te avisaremos por notificación.",
```

`public/locales/en/business.json`:

```json
    "subtitle": "Register as a Pelú partner and appear in the directory every adopter sees.",
    "pending_next": "This usually takes 1–2 business days. We'll notify you.",
```

- [ ] **Step 2: Extract the duplicated status block**

Create `components/service-providers/status-card.tsx`:

```tsx
'use client'

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface StatusCardProps {
  icon: IconDefinition
  /** Tailwind text-* token class for the icon, e.g. "text-success". */
  tone: string
  title: string
  body: string
  children?: React.ReactNode
}

/** The three /servicios status blocks were copy-pasted; this is the one shape. */
export function StatusCard({ icon, tone, title, body, children }: StatusCardProps) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={icon} className={`text-lg ${tone}`} />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite the page**

Replace the whole of `app/servicios/page.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassHalf, faCircleCheck, faCircleXmark, faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { ServiceProviderForm } from '@/components/service-providers/service-provider-form'
import { StatusCard } from '@/components/service-providers/status-card'
import { ErrorState } from '@/components/ui/error-state'
import { getMyServiceProvider, ServiceProvider } from '@/lib/api/service-providers'

export default function ServiciosPage() {
  const { t } = useTranslation('business')
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await getMyServiceProvider()
    setProvider(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-muted/30">
      <PetsHeader />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pop-550/10">
            <FontAwesomeIcon icon={faHandHoldingHeart} className="text-xl text-pop-550" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t('service_providers.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('service_providers.subtitle')}</p>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-card" />
            <div className="h-64 animate-pulse rounded-2xl bg-card" />
          </div>
        ) : error ? (
          <ErrorState message={t('service_providers.load_error')} onRetry={load} />
        ) : !provider ? (
          <div className="space-y-6 rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t('service_providers.intro')}</p>
            <ServiceProviderForm mode="register" onSaved={setProvider} />
          </div>
        ) : provider.status === 'pending' ? (
          <StatusCard
            icon={faHourglassHalf}
            tone="text-warning"
            title={t('service_providers.pending_title')}
            body={t('service_providers.pending_body')}
          >
            <p className="text-sm text-muted-foreground">{t('service_providers.pending_next')}</p>
          </StatusCard>
        ) : provider.status === 'active' ? (
          <div className="space-y-6">
            <StatusCard
              icon={faCircleCheck}
              tone="text-success"
              title={t('service_providers.active_title')}
              body={t('service_providers.active_body')}
            />
            <div className="rounded-2xl border bg-card p-6">
              <ServiceProviderForm mode="edit" provider={provider} onSaved={setProvider} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <StatusCard
              icon={faCircleXmark}
              tone="text-destructive"
              title={t('service_providers.rejected_title')}
              body={t('service_providers.rejected_body')}
            >
              {provider.rejection_reason && (
                <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  <span className="font-medium">{t('service_providers.rejected_reason')} </span>
                  <span>{provider.rejection_reason}</span>
                </p>
              )}
            </StatusCard>
            <div className="rounded-2xl border bg-card p-6">
              <ServiceProviderForm mode="reapply" provider={provider} onSaved={setProvider} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Verify all five branches**

Open http://localhost:3000/servicios as a member with no provider profile, then with each of `pending`, `active`, `rejected` (change the row in the DB, or use the admin dashboard to approve/reject). Each must render a distinct card with the right tone. Go Offline and reload for the error branch.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/servicios/page.tsx components/service-providers/status-card.tsx \
  public/locales/es/business.json public/locales/en/business.json
git commit -m "feat(servicios): frame the page and extract the status card

The page was a bare full-bleed form with three copy-pasted status blocks.
Adds a hero-lite header, puts the form on a card surface, extracts
StatusCard, replaces the spinner with a skeleton and adds a retry."
```

---

## Task 6.2: Explain why submit is disabled, and style the file input

**Root cause:** `service-provider-form.tsx:46-54` gates `canSubmit` on **seven** conditions with no feedback — the user just sees a dead button.

**Files:**
- Create: `components/service-providers/requirements-checklist.tsx`
- Modify: `components/service-providers/service-provider-form.tsx`
- Modify: `public/locales/{es,en}/business.json`

- [ ] **Step 1: Add the keys (Spanish first)**

`public/locales/es/business.json` — inside `"service_providers"`:

```json
    "requirements_title": "Para enviar tu solicitud necesitas:",
    "req_description": "Describir tus servicios",
    "req_experience": "Contar tu experiencia",
    "req_address": "Indicar tu dirección",
    "req_services": "Elegir al menos un servicio",
    "req_pet_types": "Elegir al menos un tipo de mascota",
    "req_document": "Adjuntar tu documento de identidad",
    "req_terms": "Aceptar los términos y condiciones",
    "section_about": "Sobre ti",
    "section_services": "Servicios",
    "section_verification": "Verificación",
```

`public/locales/en/business.json`:

```json
    "requirements_title": "To submit your application you need to:",
    "req_description": "Describe your services",
    "req_experience": "Share your experience",
    "req_address": "Provide your address",
    "req_services": "Pick at least one service",
    "req_pet_types": "Pick at least one pet type",
    "req_document": "Attach your ID document",
    "req_terms": "Accept the terms and conditions",
    "section_about": "About you",
    "section_services": "Services",
    "section_verification": "Verification",
```

- [ ] **Step 2: Write the checklist component**

Create `components/service-providers/requirements-checklist.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCircle } from '@fortawesome/free-solid-svg-icons'

export interface Requirement {
  key: string
  labelKey: string
  met: boolean
}

/**
 * Makes the seven canSubmit conditions visible. A disabled button with no
 * explanation is a dead end; this turns it into a to-do list.
 */
export function RequirementsChecklist({ requirements }: { requirements: Requirement[] }) {
  const { t } = useTranslation('business')
  const outstanding = requirements.filter((r) => !r.met)

  if (outstanding.length === 0) return null

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning-bg p-4">
      <p className="mb-2 text-xs font-semibold text-warning-foreground">
        {t('service_providers.requirements_title')}
      </p>
      <ul className="space-y-1">
        {requirements.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-xs text-warning-foreground">
            <FontAwesomeIcon
              icon={r.met ? faCircleCheck : faCircle}
              className={`text-xs ${r.met ? 'text-success' : 'text-warning-foreground/40'}`}
              aria-hidden="true"
            />
            <span className={r.met ? 'line-through opacity-60' : ''}>{t(r.labelKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Wire it into the form**

In `components/service-providers/service-provider-form.tsx`, add the imports:

```tsx
import { FileDropzone } from '@/components/ui/file-dropzone'
import { RequirementsChecklist, Requirement } from './requirements-checklist'
```

Replace the `canSubmit` derivation (lines 46–54) with a requirement list that `canSubmit` is computed **from**, so the two can never disagree:

```tsx
  const requirements: Requirement[] = [
    { key: 'description', labelKey: 'service_providers.req_description', met: !!description.trim() },
    { key: 'experience', labelKey: 'service_providers.req_experience', met: !!experience.trim() },
    { key: 'address', labelKey: 'service_providers.req_address', met: !!address.trim() },
    { key: 'services', labelKey: 'service_providers.req_services', met: services.length > 0 },
    { key: 'pet_types', labelKey: 'service_providers.req_pet_types', met: petTypes.length > 0 },
    ...(needsDocument ? [{ key: 'document', labelKey: 'service_providers.req_document', met: !!idDocument }] : []),
    ...(needsTerms ? [{ key: 'terms', labelKey: 'service_providers.req_terms', met: termsAccepted }] : []),
  ]

  const canSubmit = requirements.every((r) => r.met) && !submitting
```

Render the checklist immediately above the submit button:

```tsx
      <RequirementsChecklist requirements={requirements} />

      <button
        type="submit"
        disabled={!canSubmit}
        className="focus-ring w-full rounded-xl bg-pop-solid px-4 py-2.5 text-sm font-medium text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
```

- [ ] **Step 4: Replace the native file input**

Replace the `needsDocument` block (lines 186–205):

```tsx
      {needsDocument && (
        <div className="space-y-2">
          <p id="sp-id-document-label" className="text-sm font-medium">
            {t('service_providers.id_document_label')}
          </p>
          <FileDropzone
            accept="image/png,image/jpeg,image/webp"
            label={t('service_providers.id_document_label')}
            hint={t('service_providers.id_document_hint')}
            selectedName={idDocument?.name ?? null}
            onFiles={(list) => setIdDocument(list[0] ?? null)}
            onClear={() => setIdDocument(null)}
            aria-labelledby="sp-id-document-label"
          />
        </div>
      )}
```

- [ ] **Step 5: Group the fields into fieldsets and add autocomplete**

Wrap the three logical groups. Around the description + experience fields:

```tsx
      <fieldset className="space-y-6">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('service_providers.section_about')}
        </legend>
        {/* description, experience, address */}
      </fieldset>
```

Same shape with `section_services` around the services + pet-types chip groups, and `section_verification` around the document + terms.

On the address input add:

```tsx
          autoComplete="street-address"
```

- [ ] **Step 6: Make the chips accessible and touch-sized**

Both chip groups (services at line 150, pet types at line 169) — `aria-pressed` was added in Plan A Task 11; now add the check icon so selection is not colour-only, plus a 44px minimum:

```tsx
            <button
              key={s}
              type="button"
              onClick={() => setServices((prev) => toggleValue(prev, s))}
              aria-pressed={services.includes(s)}
              className={`focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
                services.includes(s)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {services.includes(s) && <FontAwesomeIcon icon={faCheck} className="text-xs" aria-hidden="true" />}
              {t(`service_providers.services.${s}`)}
            </button>
```

Add `faCheck` to the icon import. Apply the same shape to the pet-types chips.

- [ ] **Step 7: Verify**

Open http://localhost:3000/servicios with no provider profile. Expected:
- an amber checklist above the submit button listing everything still missing;
- items strike through as you complete them, and the checklist disappears entirely when the button becomes enabled;
- the ID document is a styled dropzone reachable by keyboard, with a filename and a remove link after selection;
- chips show a check when selected and are ≥44px tall;
- the form reads as three labelled sections.

Complete and submit a real registration end-to-end against the local API.

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS — `components/__tests__/service-providers/*.test.tsx` exercises this form; update any selector that depended on the native file input (it uses `screen.getByLabelText` for the text fields, which still works, but the file input assertion will need to target the dropzone).

- [ ] **Step 9: Commit**

```bash
git add components/service-providers/ public/locales/es/business.json public/locales/en/business.json \
  components/__tests__/service-providers/
git commit -m "feat(servicios): explain the disabled submit and style the upload

canSubmit gated on seven invisible conditions. It is now derived from a
visible checklist that strikes items through as they are met. The native
file input becomes the shared FileDropzone, chips get a check icon and
44px targets, and the form is grouped into three fieldsets."
```

---

# Milestone 7 — `/auth/mfa/enrollment` P1/P2 (spec §11)

## Task 7.1: Progress, back navigation, and the panel-shell dedupe

**Files:**
- Modify: `components/auth/mfa/mfa-enrollment.tsx`
- Modify: `components/auth/mfa/mfa-totp-setup.tsx`
- Modify: `components/auth/mfa/mfa-passkey-setup.tsx`
- Modify: `public/locales/{es,en}/auth.json`

- [ ] **Step 1: Add the keys (Spanish first)**

`public/locales/es/auth.json` — inside `"mfa.enrollment"`:

```json
      "step_of": "Paso {{current}} de {{total}}",
      "step_choose": "Elige un método",
      "step_configure": "Configúralo",
      "step_recovery": "Guarda tus códigos",
```

`public/locales/en/auth.json`:

```json
      "step_of": "Step {{current}} of {{total}}",
      "step_choose": "Choose a method",
      "step_configure": "Set it up",
      "step_recovery": "Save your codes",
```

- [ ] **Step 2: Deduplicate the panel shell**

`mfa-enrollment.tsx:54-66` and `:68-80` are the same wrapper copy-pasted, and both use three inline arbitrary shadows where `--inset-shadow-decoration` already exists. Add a local shell component at the bottom of `mfa-enrollment.tsx`:

```tsx
interface MfaPanelProps {
  breadcrumbItems: MfaEnrollmentProps['breadcrumbItems']
  step: 1 | 2 | 3
  children: React.ReactNode
}

/** The dark beams shell every enrollment screen sits in. */
function MfaPanel({ breadcrumbItems, step, children }: MfaPanelProps) {
  const { t } = useTranslation('auth')
  const labels = [
    t('mfa.enrollment.step_choose'),
    t('mfa.enrollment.step_configure'),
    t('mfa.enrollment.step_recovery'),
  ]

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />
      <OnboardingNav items={breadcrumbItems} />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t('mfa.enrollment.step_of', { current: step, total: 3 })} · {labels[step - 1]}
            </p>
            <div
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-label={t('mfa.enrollment.step_of', { current: step, total: 3 })}
              className="mt-2 flex gap-1.5"
            >
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? 'bg-pop-550' : 'bg-input'}`}
                />
              ))}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
```

> A three-segment bar rather than `components/Stepper.tsx`: Stepper owns its own next/back buttons and slide transitions, which would fight the enrollment flow's own navigation. Spec §11 P1 allows either.

- [ ] **Step 3: Use the shell for all three screens**

Replace the `selectedMethod === 'totp'` branch (lines 54–66):

```tsx
  if (selectedMethod === 'totp') {
    return (
      <MfaPanel breadcrumbItems={breadcrumbItems} step={2}>
        <div className="rounded-2xl bg-background/90 p-8 backdrop-blur-xl inset-shadow-(--inset-shadow-decoration)">
          <MfaTotpSetup onSuccess={handleSuccess} onBack={() => setSelectedMethod(null)} />
        </div>
      </MfaPanel>
    )
  }
```

The `webauthn` branch is identical with `<MfaPasskeySetup …/>` inside. The method-picker return uses `<MfaPanel breadcrumbItems={breadcrumbItems} step={1}>` around the existing heading + method cards + skip link.

> Verify `inset-shadow-(--inset-shadow-decoration)` compiles under Tailwind v4.2 (`bun run build`). If it does not, use `style={{ boxShadow: 'var(--inset-shadow-decoration)' }}` — `components/ui/` is exempt from the inline-style rule, but `mfa-enrollment.tsx` is not, so in that case add it to `STYLE_ALLOWLIST` in `design-system.test.ts`.

- [ ] **Step 4: Give the skip link an affordance**

The skip button (line 117) is bare text with no link cue:

```tsx
          {onSkip && (
            <button
              onClick={onSkip}
              className="focus-ring w-full rounded-xl text-center text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {t('mfa.enrollment.skip')}
            </button>
          )}
```

- [ ] **Step 5: Add a back-to-QR sub-step in TOTP**

`mfa-totp-setup.tsx`'s only exit from the `confirm` sub-step is `onBack`, which discards the whole setup. Give the confirm branch its own back:

```tsx
      {step === 'confirm' && (
        <>
          <button
            onClick={() => { setError(null); setStep('scan') }}
            className="focus-ring flex items-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-foreground"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            {t('mfa.enrollment.back')}
          </button>
          <p className="text-sm text-muted-foreground">{t('mfa.enrollment.totp_confirm')}</p>
          <MfaCodeInput onComplete={handleConfirm} disabled={verifying} error={error} />
        </>
      )}
```

Hide the outer `onBack` button on the confirm sub-step so there are not two back controls — wrap it in `{step === 'scan' && (…)}`.

- [ ] **Step 6: Fix the passkey back button too**

`mfa-passkey-setup.tsx:51-53` has the same `← {t('mfa.settings.cancel')}` misuse. Apply the same treatment as `mfa-totp-setup.tsx` (Plan B Task 8 Step 4): `faArrowLeft` + `mfa.enrollment.back`.

- [ ] **Step 7: Verify**

Walk the whole flow at http://localhost:3000/auth/mfa/enrollment: the three-segment bar advances 1 → 2 → 3, the label matches, and from the TOTP confirm sub-step "Atrás" returns to the QR **without** discarding the setup.

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run && bun run build`
Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add components/auth/mfa/ public/locales/es/auth.json public/locales/en/auth.json
git commit -m "feat(mfa): add step progress and real back navigation

Deduplicates the copy-pasted beams panel into one shell carrying a
three-step indicator, replaces the ← glyph + 'Cancelar' label with
faArrowLeft + a proper back key, and gives the TOTP confirm sub-step a
back-to-QR path that no longer discards the whole setup."
```

---

## Task 7.2: OTP input accessibility

**Files:**
- Modify: `components/auth/mfa/mfa-code-input.tsx`
- Modify: `public/locales/{es,en}/auth.json`

- [ ] **Step 1: Add the keys (Spanish first)**

`public/locales/es/auth.json` — inside `"mfa"`:

```json
    "code_input": {
      "group_label": "Código de verificación de 6 dígitos",
      "digit_label": "Dígito {{n}} de 6"
    },
```

`public/locales/en/auth.json`:

```json
    "code_input": {
      "group_label": "6-digit verification code",
      "digit_label": "Digit {{n}} of 6"
    },
```

- [ ] **Step 2: Rewrite the input**

Replace `components/auth/mfa/mfa-code-input.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface MfaCodeInputProps {
  onComplete: (code: string) => void
  disabled?: boolean
  error?: string | null
}

export function MfaCodeInput({ onComplete, disabled, error }: MfaCodeInputProps) {
  const { t } = useTranslation('auth')
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (error) {
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    }
  }, [error])

  const commit = (next: string[]) => {
    setDigits(next)
    const code = next.join('')
    if (code.length === 6 && next.every(Boolean)) onComplete(code)
  }

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
    commit(next)
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Arrow navigation between boxes — the boxes are one logical control.
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Paste is handled on EVERY box, not just the first: users routinely paste
  // into whichever box happens to have focus.
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return
    const next = Array(6).fill('')
    pasted.split('').forEach((d, i) => { next[i] = d })
    if (pasted.length < 6) inputRefs.current[pasted.length]?.focus()
    commit(next)
  }

  return (
    <div role="group" aria-labelledby="mfa-code-group-label">
      <span id="mfa-code-group-label" className="sr-only">
        {t('mfa.code_input.group_label')}
      </span>
      <div className="flex justify-center gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            // Enables the OS one-time-code autofill on iOS and Android.
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            aria-label={t('mfa.code_input.digit_label', { n: i + 1 })}
            aria-invalid={!!error}
            aria-describedby={error ? 'mfa-code-error' : undefined}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`focus-ring h-12 w-11 rounded-xl border bg-background text-center text-xl font-semibold disabled:opacity-50 ${
              error ? 'border-destructive' : 'border-input'
            }`}
          />
        ))}
      </div>
      {error && (
        <p id="mfa-code-error" role="alert" aria-live="assertive" className="mt-3 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
```

Changes: `autoComplete="one-time-code"`, per-box `aria-label`, a group label, paste on every box, arrow navigation, `aria-live` on the error, and `h-13` (not a Tailwind scale value) becomes `h-12`.

- [ ] **Step 3: Verify on a phone**

On a real iOS or Android device, trigger an email OTP against the dev server (or a deployed build). The keyboard should offer the code as an autofill suggestion above it. On desktop, paste a 6-digit code into the **fourth** box — it must fill all six and submit.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/auth/mfa/mfa-code-input.tsx public/locales/es/auth.json public/locales/en/auth.json
git commit -m "feat(a11y): make the MFA code input usable and autofillable

Adds autoComplete=one-time-code for mobile OTP autofill, per-box and group
labels, arrow-key navigation, paste handling on every box (was box 0 only),
and an aria-live error. h-13 becomes a real scale value."
```

---

## Task 7.3: Gate the recovery codes behind an explicit acknowledgement

**Root cause:** `mfa-recovery-modal.tsx:44-49` is a plain "Entendido" button on a hand-rolled overlay with no focus trap, no Escape handling and no dialog role. Recovery codes are shown exactly once — dismissing them accidentally locks the user out.

**Files:**
- Modify: `components/auth/mfa/mfa-recovery-modal.tsx`
- Modify: `public/locales/{es,en}/auth.json`

- [ ] **Step 1: Add the keys (Spanish first)**

`public/locales/es/auth.json` — inside `"mfa.recovery"`:

```json
      "download": "Descargar",
      "acknowledge": "Ya guardé mis códigos en un lugar seguro",
      "filename": "pelu-codigos-de-recuperacion.txt",
```

`public/locales/en/auth.json`:

```json
      "download": "Download",
      "acknowledge": "I've saved my codes somewhere safe",
      "filename": "pelu-recovery-codes.txt",
```

- [ ] **Step 2: Rebuild on the Dialog primitive with a confirmation gate**

Replace `components/auth/mfa/mfa-recovery-modal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faDownload } from '@fortawesome/free-solid-svg-icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface MfaRecoveryModalProps {
  codes: string[]
  onClose: () => void
}

export function MfaRecoveryModal({ codes, onClose }: MfaRecoveryModalProps) {
  const { t } = useTranslation('auth')
  const [copied, setCopied] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const handleCopy = async () => {
    // navigator.clipboard is undefined on insecure origins and in some
    // in-app browsers — never let it throw and leave the button dead.
    try {
      await navigator.clipboard?.writeText(codes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* the codes are on screen and downloadable; copy is a convenience */
    }
  }

  const handleDownload = () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = t('mfa.recovery.filename')
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    // Not dismissible: these codes are shown exactly once. onOpenChange is
    // deliberately not wired to onClose, so Escape and outside clicks cannot
    // discard them — the acknowledge checkbox is the only way out.
    <Dialog open>
      <DialogContent className="max-w-md space-y-4" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-left">
          <DialogTitle>{t('mfa.recovery.title')}</DialogTitle>
          <DialogDescription>{t('mfa.recovery.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 font-mono text-sm">
          {codes.map((code, i) => (
            <div key={i} className="px-2 py-1">{code}</div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl border border-input px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-base" />
            {copied ? t('mfa.recovery.copied') : t('mfa.recovery.copy_all')}
          </button>
          <button
            onClick={handleDownload}
            className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl border border-input px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            <FontAwesomeIcon icon={faDownload} className="text-base" />
            {t('mfa.recovery.download')}
          </button>
        </div>

        <label className="focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pop-700 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="accent-primary"
          />
          {t('mfa.recovery.acknowledge')}
        </label>

        <button
          onClick={onClose}
          disabled={!acknowledged}
          className="focus-ring w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {t('mfa.recovery.close')}
        </button>
      </DialogContent>
    </Dialog>
  )
}
```

> Radix's `DialogContent` renders its own close button. Confirm whether `components/ui/dialog.tsx` includes one — if it does, hide it here (`[&>button]:hidden`) so there is no bypass around the acknowledgement gate.

- [ ] **Step 3: Verify**

Complete an MFA enrollment so the recovery codes appear. Expected:
- Escape and clicking outside do **not** close it;
- "Entendido" is disabled until the checkbox is ticked;
- "Descargar" saves a `.txt` with one code per line;
- "Copiar todos" works, and does not break on an insecure origin;
- focus is trapped inside the dialog.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/auth/mfa/mfa-recovery-modal.tsx public/locales/es/auth.json public/locales/en/auth.json
git commit -m "fix(mfa): stop recovery codes being dismissed by accident

The codes are shown exactly once, on a hand-rolled overlay with no focus
trap and a one-click dismiss. Rebuilt on the Dialog primitive, made
non-dismissible, and gated behind an explicit acknowledgement plus copy
and download actions."
```

---

## Task 7.4: The success moment and the QR title (spec §11 P1/P2)

**Files:**
- Modify: `components/auth/mfa/mfa-enrollment.tsx`
- Modify: `components/auth/mfa/mfa-totp-setup.tsx`

- [ ] **Step 1: Use the orphaned success key**

`mfa.enrollment.success` ("¡Método configurado!") exists in both locales and is never rendered. Show it as a toast when a method is confirmed, in `mfa-enrollment.tsx`'s `handleSuccess`:

```tsx
  const handleSuccess = (codes?: string[]) => {
    toast.success(t('mfa.enrollment.success'))
    if (codes && codes.length > 0) {
      setRecoveryCodes(codes)
    } else {
      onComplete()
    }
  }
```

(`toast` is already imported from Plan B Task 9.)

- [ ] **Step 2: Give the QR code an accessible name**

In `components/auth/mfa/mfa-totp-setup.tsx`, `QRCodeSVG` renders an unlabelled SVG:

```tsx
            <QRCodeSVG value={qrUri} size={200} title={t('mfa.enrollment.totp_scan')} />
```

- [ ] **Step 3: Guard the clipboard call**

`handleCopySecret` calls `navigator.clipboard.writeText` unguarded, which throws on insecure origins:

```tsx
  const handleCopySecret = async () => {
    try {
      await navigator.clipboard?.writeText(secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      /* the secret is visible on screen and can be typed manually */
    }
  }
```

- [ ] **Step 4: Verify**

Complete a TOTP enrollment. A success toast appears before the recovery codes. In DevTools → Accessibility the QR reports "Escanea el código QR con tu app de autenticación". Load the page over plain `http://` on a LAN IP and confirm the copy button no longer throws.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/auth/mfa/mfa-enrollment.tsx components/auth/mfa/mfa-totp-setup.tsx
git commit -m "feat(mfa): confirm success and label the QR code

Renders the orphaned mfa.enrollment.success key as a toast, gives the QR
an accessible title, and guards navigator.clipboard so the copy button
does not throw on insecure origins."
```

---

# Milestone 8 — `/` Landing (spec §4)

## Task 8.1: A featured-pets strip (the highest-value landing change)

Real adoptable pets are Pelú's actual social proof — far stronger than placeholder partner logos.

**Files:**
- Create: `components/landing/featured-pets.tsx`
- Create: `components/__tests__/landing/featured-pets.test.tsx`
- Modify: `components/landing/landing-page.tsx`
- Modify: `public/locales/{es,en}/landing.json`

- [ ] **Step 1: Add the keys (Spanish first)**

`public/locales/es/landing.json` — add a top-level `"featured"` object:

```json
  "featured": {
    "title": "Están esperando un hogar",
    "subtitle": "Algunas de las mascotas disponibles ahora mismo.",
    "see_all": "Ver todas",
    "error": "No pudimos cargar las mascotas"
  },
```

`public/locales/en/landing.json`:

```json
  "featured": {
    "title": "Waiting for a home",
    "subtitle": "A few of the pets available right now.",
    "see_all": "See all",
    "error": "We couldn't load the pets"
  },
```

- [ ] **Step 2: Write the failing test**

Create `components/__tests__/landing/featured-pets.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))

import { FeaturedPets } from '@/components/landing/featured-pets'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

const pet = (id: string, name: string) =>
  ({ id, name, age: 24, gender: 'female', species: 'dog', photos: [], conditions: [] }) as never

beforeEach(() => vi.clearAllMocks())

describe('FeaturedPets', () => {
  it('renders up to eight pets with a link to the full grid', async () => {
    mockList.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, i) => pet(String(i), `Pet ${i}`)),
      error: null,
    })

    renderWithProviders(<FeaturedPets />)

    expect(await screen.findByText('Pet 0')).toBeInTheDocument()
    expect(screen.getByText('Pet 7')).toBeInTheDocument()
    expect(screen.queryByText('Pet 8')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/pets')
  })

  it('renders nothing when the request fails', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })

    const { container } = renderWithProviders(<FeaturedPets />)

    await vi.waitFor(() => expect(container.querySelector('section')).toBeNull())
  })

  it('renders nothing when there are no pets', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    const { container } = renderWithProviders(<FeaturedPets />)

    await vi.waitFor(() => expect(container.querySelector('section')).toBeNull())
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/landing/featured-pets.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/landing/featured-pets"`.

- [ ] **Step 4: Write the component**

Create `components/landing/featured-pets.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faPaw } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { listPublicPets } from '@/lib/api/pets-public'
import { TransitionLink } from '@/components/transitions/transition-link'
import { formatAge } from '@/lib/utils/format-age'

const MAX = 8

/**
 * Real adoptable pets on the landing page — Pelú's actual social proof.
 * Fails quietly: the landing page must never show an error or a skeleton
 * graveyard for a decorative strip, so a failed or empty fetch renders
 * nothing at all.
 */
export function FeaturedPets() {
  const { t } = useTranslation(['landing', 'pets'])
  const [pets, setPets] = useState<Pet[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listPublicPets()
      .then(({ data, error }) => {
        if (cancelled) return
        setPets(error || !data ? [] : data.slice(0, MAX))
      })
      .catch(() => { if (!cancelled) setPets([]) })
    return () => { cancelled = true }
  }, [])

  // null = still loading, [] = failed or genuinely empty. Neither renders.
  if (!pets || pets.length === 0) return null

  return (
    <section className="px-4 py-16">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{t('featured.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('featured.subtitle')}</p>
          </div>
          <TransitionLink
            href="/pets"
            className="focus-ring group inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-muted-foreground"
          >
            {t('featured.see_all')}
            <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform duration-200 group-hover:translate-x-0.5" />
          </TransitionLink>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pets.map((pet) => {
            const age = formatAge(pet.age)
            return (
              <li key={pet.id}>
                <TransitionLink
                  href={`/pets?id=${pet.id}`}
                  className="focus-ring group relative block aspect-square overflow-hidden rounded-2xl bg-secondary"
                >
                  {pet.photos.length > 0 ? (
                    <Image
                      src={pet.photos[0].url}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <FontAwesomeIcon icon={faPaw} className="text-2xl text-muted-foreground/30" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 block bg-linear-to-t from-primary to-transparent p-2 pt-6">
                    <span className="block truncate text-sm font-semibold text-background">{pet.name}</span>
                    <span className="block truncate text-[11px] text-background/80">
                      {t(`detail.${age.unit}`, { ns: 'pets', count: age.count })}
                    </span>
                  </span>
                </TransitionLink>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
```

> Check that `/pets?id=<uuid>` actually opens the detail sheet — read `components/pets/pets-page.tsx`'s `initialSelected` handling and `app/(public)/pets/page.tsx`. If it does not support a query param, link to `/pets` for every card instead and note it; do **not** add query-param routing as a drive-by.

- [ ] **Step 5: Mount it between the hero and How-it-works**

In `components/landing/landing-page.tsx`, add the import and place it after the `<hr>` divider:

```tsx
import { FeaturedPets } from '@/components/landing/featured-pets'
```

```tsx
      <FeaturedPets />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/landing/featured-pets.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 7: Verify**

Open http://localhost:3000/ with the API running: a strip of up to 8 real pets appears between the hero and How-it-works, each linking through. Stop the API and reload: the strip is absent and the rest of the page is unaffected.

- [ ] **Step 8: Commit**

```bash
git add components/landing/featured-pets.tsx components/__tests__/landing/featured-pets.test.tsx \
  components/landing/landing-page.tsx public/locales/es/landing.json public/locales/en/landing.json
git commit -m "feat(landing): show real adoptable pets

Adds a featured-pets strip between the hero and How-it-works. Real pets are
Pelú's actual social proof. Fails quietly — a failed or empty fetch renders
nothing rather than an error on the landing page."
```

---

## Task 8.2: Retire the placeholder content (spec §4, Q2 decision)

**Files:**
- Modify: `components/landing/landing-page.tsx`
- Modify: `components/footer.tsx`

- [ ] **Step 1: Hide the marquee behind a flag**

`LogoMarquee` stays in the codebase for when real partner logos exist. In `components/landing/landing-page.tsx`, replace the marquee block (lines 74–81) with:

```tsx
            {/*
              Hidden until real partner logos exist (spec §4, Q2). Flip this to
              true and restore the real filenames in partnerLogos when they do.
              The component and the assets are intentionally kept.
            */}
            {SHOW_PARTNER_LOGOS && (
              <div className="opacity-48 mb-4 md:-mx-8 md:w-[calc(100%+4rem)]">
                <LogoMarquee
                  logos={partnerLogos}
                  logoHeight={24}
                  gap={48}
                  className="grayscale brightness-75 dark:brightness-200 dark:invert"
                />
              </div>
            )}
```

with the flag at module scope:

```tsx
/** Flip to true once real partner logos replace the placeholders. */
const SHOW_PARTNER_LOGOS = false
```

- [ ] **Step 2: Trim to three testimonials**

Replace the testimonials derivation (lines 30–35):

```tsx
  // Three, not five: the other two were filler. TestimonialCarousel clones two
  // items on each side for its coverflow effect, so three is the practical
  // minimum for a smooth loop.
  const testimonials: Testimonial[] = [1, 2, 3].map(i => ({
    id: i,
    quote: t(`testimonials.placeholder_${i}.quote`),
    name: t(`testimonials.placeholder_${i}.name`),
    role: t(`testimonials.placeholder_${i}.role`),
  }))
```

The `placeholder_4` and `placeholder_5` keys stay in the locale files — harmless, and available if a real fourth testimonial arrives.

- [ ] **Step 3: Rebalance the hero panel**

With the marquee gone the right-hand panel is top-heavy. Replace the panel wrapper (line 73):

```tsx
          <div className="flex w-full flex-1 flex-col items-center gap-4 md:max-w-150 md:justify-center md:rounded-2xl md:bg-muted md:p-6 md:inset-shadow-[0_0_5px_1px_var(--color-input)]">
```

- [ ] **Step 4: Fix the divider**

Line 90 uses `text-input` on an `<hr>`, which does nothing — `<hr>` takes its colour from `border-color`:

```tsx
      <hr className="border-input" />
```

- [ ] **Step 5: Deal with the dead footer links**

`components/footer.tsx:22,28,29` are `href="#"`. There is a real `/about` page but no contact, privacy or terms page. Render them as plain text rather than links that go nowhere:

```tsx
          <div>
            <h4 className="text-primary-foreground font-semibold mb-3">{t('footer.about')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <TransitionLink href="/about" className="focus-ring rounded-xl transition-colors hover:text-primary-foreground">
                  {t('footer.about')}
                </TransitionLink>
              </li>
              <li>
                <a href="mailto:hola@pelurd.com" className="focus-ring rounded-xl transition-colors hover:text-primary-foreground">
                  {t('footer.contact')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary-foreground font-semibold mb-3">{t('legal', { ns: 'common' })}</h4>
            {/*
              No privacy or terms page exists yet. These render as plain text
              rather than href="#" links that go nowhere; turn them back into
              TransitionLinks when the pages ship.
            */}
            <ul className="space-y-2 text-sm text-muted-foreground/70">
              <li>{t('footer.privacy')}</li>
              <li>{t('footer.terms')}</li>
            </ul>
          </div>
```

> Confirm `hola@pelurd.com` is a real inbox before shipping. If it is not, drop the contact row entirely rather than shipping a mailto that bounces.

The `Link` import may now be unused in `footer.tsx` — remove it if so.

- [ ] **Step 6: Optimise or drop the partner SVGs**

The partner logos are 206KB and 98KB, rendered twice each and loaded eagerly in the hero. With `SHOW_PARTNER_LOGOS = false` they no longer load at all — confirm in DevTools → Network that no `partner-*.svg` request fires on `/`. Leave the files in `public/assets/logos/`; optimise them when real logos replace them.

- [ ] **Step 7: Verify**

Open http://localhost:3000/. Expected: no logo strip, three testimonials, a visually balanced hero panel, a real horizontal rule, and no `href="#"` links anywhere (check with `document.querySelectorAll('a[href="#"]').length === 0` in the console).

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/landing/landing-page.tsx components/footer.tsx
git commit -m "feat(landing): retire the placeholder logos and dead links

Hides the partner marquee behind a flag until real logos exist (the
component and assets are kept), trims five filler testimonials to three,
rebalances the hero panel, fixes the hr colour, and turns href='#' footer
links into plain text or a real mailto."
```

---

## Task 8.3: Carousel accessibility and mobile height (spec §4 P2)

**Files:**
- Modify: `components/landing/testimonial-carousel.tsx:28-29,220,244-262`

- [ ] **Step 1: Make the dots real buttons**

The dot indicators are `motion.div`s with `onClick` — invisible to keyboards. Replace the dot block (lines 244–262):

```tsx
      {/* Dot indicators */}
      <div className="mt-4 mr-4 flex gap-1.5">
        {items.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setPosition(index + CLONES)}
            aria-label={t('testimonials.go_to', { n: index + 1 })}
            aria-current={activeIndex === index ? 'true' : undefined}
            className={`focus-ring h-2 w-2 rounded-full transition-[background-color,transform] duration-300 ${
              activeIndex === index ? 'scale-125 bg-pop-550' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
```

Add the hook and keys. At the top of `TestimonialCarousel`:

```tsx
  const { t } = useTranslation('landing')
```

with `import { useTranslation } from 'react-i18next'`.

`public/locales/es/landing.json` — inside `"testimonials"`:

```json
    "region_label": "Testimonios",
    "go_to": "Ir al testimonio {{n}}"
```

`public/locales/en/landing.json`:

```json
    "region_label": "Testimonials",
    "go_to": "Go to testimonial {{n}}"
```

- [ ] **Step 2: Announce the carousel as a carousel**

Wrap the whole thing (line 213):

```tsx
    <div
      className="flex w-full flex-col items-end"
      role="region"
      aria-roledescription="carousel"
      aria-label={t('testimonials.region_label')}
    >
```

- [ ] **Step 3: Stop clipping long quotes on small screens**

`CENTER_HEIGHT = 260` is fixed, so a long quote is cut off at 375px. Make the two heights responsive to the measured width. Replace the constants (lines 28–29) with a derivation inside the component, next to `effectiveWidth`:

```tsx
  // Narrow viewports get taller cards: the card is ~83% of the container width
  // there (divisor 1.2), so the same quote wraps to far more lines.
  const centerHeight = effectiveWidth < 500 ? 320 : 260
  const sideHeight = Math.round(centerHeight * 0.81)
```

Thread them into `TestimonialCard` as props:

```tsx
interface CardProps {
  item: Testimonial
  index: number
  itemWidth: number
  trackItemOffset: number
  centerOffset: number
  centerHeight: number
  sideHeight: number
  x: any
  transition: any
}
```

```tsx
  const height = useTransform(x, range, [sideHeight, centerHeight, sideHeight], { clamp: true })
```

Pass them at the call site and update the container height (line 220):

```tsx
        style={{ width: '100%', height: centerHeight + 32, perspective: 1000, perspectiveOrigin: '50% 50%' }}
```

- [ ] **Step 4: Verify**

Open http://localhost:3000/ at 375px: the longest testimonial fits without clipping. Tab to the dots — each is focusable with a visible ring, Enter/Space jumps to that testimonial, and the active dot reports `aria-current`. In DevTools → Accessibility the carousel reports as a region with role description "carousel".

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/landing/testimonial-carousel.tsx \
  public/locales/es/landing.json public/locales/en/landing.json
git commit -m "feat(a11y): make the testimonial carousel keyboard operable

Dots were non-focusable motion.divs. They are now real buttons with labels
and aria-current, the carousel announces itself as a region, and the fixed
260px card height becomes width-responsive so long quotes stop clipping at
375px."
```

---

## Task 8.4: Unify the container width across public routes (spec §4 P2)

**Files:**
- Modify: `components/landing/landing-page.tsx`
- Modify: `components/pets/pets-page.tsx`
- Modify: `components/aliados/aliados-page.tsx`

- [ ] **Step 1: Pick one and apply it**

The landing page uses `container mx-auto max-w-6xl` (1152px) while `/pets` and `/aliados` use bare `container` (1400px at the top breakpoint). Standardise on `max-w-6xl` — it is the narrower, more composed measure and the landing page already reads well at it.

In `components/pets/pets-page.tsx` line 90:

```tsx
      <div className="container mx-auto max-w-6xl flex-1 flex flex-col sm:px-4 sm:pb-0">
```

In `components/aliados/aliados-page.tsx` (the equivalent line):

```tsx
      <div className="container mx-auto max-w-6xl flex-1 flex flex-col sm:px-4 sm:pb-0">
```

Leave the landing page as it is — it is already the reference.

- [ ] **Step 2: Verify at 1920px**

Open `/`, `/pets` and `/aliados` at 1920px wide and confirm the content column is the same width on all three and the grid does not become uncomfortably sparse. Then check 1440px and 1024px.

If the 4-column pet grid feels cramped at `max-w-6xl`, that is expected — `/pets` keeps 4 columns and the cards simply get slightly smaller. Do not change the column counts.

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/pets/pets-page.tsx components/aliados/aliados-page.tsx
git commit -m "style(public): unify the container width across public routes

Landing used max-w-6xl while /pets and /aliados ran to the 1400px
container breakpoint, so the content column jumped between routes."
```

---

# Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, including the new `featured-pets`, `provider-grid` and `pet-grid-header` tests plus all Plan A and Plan B tests.

- [ ] **Step 2: Types, lint, build**

Run: `npx tsc --noEmit && bun run lint && bun run build`
Expected: all three succeed.

- [ ] **Step 3: Acceptance criteria, route by route**

Check each against the spec's own acceptance bullets:

| route | acceptance (spec) |
| --- | --- |
| `/` §4 | real pets shown; no dead links; carousel keyboard operable; reduced-motion honored; mobile footer fully visible |
| `/pets` §5 | h1 + count; cards show name/age/gender at `rounded-2xl`; empty state offers clear-filters; Tab reaches every card and menu with a visible ring; Space activates without scrolling |
| `/aliados` §6 | header + description; filters filter; badges translated; a 2-provider dataset no longer looks broken |
| `/adopt` §7 | banner un-cropped at 1440 **and** 375; failed load shows error+retry; submit outcomes unambiguous; grouped sections with progress; all fields label-associated; keyboard-only completion possible |
| `/chat` §8 | killing the network gives a visible error + retry, not an eternal spinner; sending while offline is impossible; empty state explains how conversations start; screen reader announces incoming messages |
| `/mis-mascotas` §9 | adult pets show years; API failure shows error+retry; modal is keyboard-trappable and Escape-closable; every photo and card action is identifiable to a screen reader |
| `/servicios` §10 | reads as a designed flow (header, card, sections); the user always knows why submit is disabled; upload is styled + keyboard accessible; status states are visually distinct cards |
| `/auth/mfa/enrollment` §11 | every failure path shows a message and a way out; flow shows progress and supports going back one step; OTP autofill works on mobile; recovery codes cannot be dismissed accidentally |

- [ ] **Step 4: Re-shoot the audit baselines**

Deploy, then use the `drive-pelurd` skill to log in to pelurd.com and re-capture every in-scope route at 1440px and 375px. Compare against `.playwright-mcp/audit-*.jpeg`. Save the new captures alongside with a `post-*` prefix so the before/after pair survives.

- [ ] **Step 5: Update the task log**

Append a "Plan C review" section to `tasks/todo.md` summarizing what shipped, what was deferred, and any spec deviations (there are two documented: the `/aliados` filter-key correction in this plan, and the `/adopt` load-failure correction in Plan B).

- [ ] **Step 6: Merge**

Follow the `superpowers:finishing-a-development-branch` skill to open a PR from `feat/ui-pass-route-polish` or merge to `main`.

---

# Explicitly out of scope

Carried over from spec §13, plus what this plan chose not to do:

- Rebrand (palette / typography swap) — rejected in the spec.
- `/about` scrollytelling; all three dashboards; any backend change.
- Wiring `/aliados` "Contactar" to chat — its own cross-repo spec at `pelu/docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md`.
- Building a **photo-deletion API** for member pets. Task 5.2 Step 4b checks whether one already exists and wires it up if so; otherwise it ships the explanatory hint the spec asks for. Adding the endpoint is backend work and out of scope either way.
- Auditing every screen in dark mode. The tokens added in Plan A define dark values, but a full dark-mode pass is a separate project.
- Lifting `sourceFilter` out of `PetGrid` so the `/pets` header count matches the client-filtered card count exactly (noted in Task 2.1).
- Optimising the partner SVGs — they no longer load at all now that the marquee is flagged off (Task 8.2).
