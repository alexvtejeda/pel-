# /pets Desktop Sheet + Rescue-Center Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the desktop `/pets` detail sheet so a pet's rescue center is represented by a real profile photo instead of a collapsed 4:1 banner, surface the pet facts the payload already carries, and wire the avatar end-to-end (RC settings upload → API `rcSummary` → grid card + landing strip).

**Architecture:** Four independent layers, in dependency order. (1) Pure frontend refactors with no cross-repo dependency: extract the verified badge, add an opt-in `flushItems` prop to `Carousel`, rebuild the sheet's information hierarchy. (2) Fix the three dead save buttons in the rescue-center settings tab so a center can actually have a profile photo. (3) One additive backend change: `rcSummary` gains `avatar_url`, resolved by joining `users` through `rescue_centers.user_id` — no migration. (4) Render the avatar on the grid card and landing strip. Layers 1 and 2 ship without the API; layer 4 depends on layer 3 being deployed.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`) · React 19 · TypeScript · Tailwind v4 (theme in `app/globals.css`, no `tailwind.config.ts`) · Font Awesome · react-i18next (bundled resources) · Vitest + React Testing Library · Go 1.x + chi + pgx (API).

**Source spec:** `docs/superpowers/specs/2026-07-30-pets-desktop-sheet-identity-design.md` (Approved — all decisions locked).

---

## Repos and Working Directories

Two **independent** git repos are touched. Never stage across them, and never `git add -A`.

| Layer | Directory | Remote |
|---|---|---|
| Tasks 1–8, 10–12 | `/home/noob_master/pelu/frontend` | `git@github.com:alexvtejeda/pel-.git` |
| Task 9 | `/home/noob_master/pelu/api` | `git@github.com:alexvtejeda/pelu-api.git` |

All frontend paths in this plan are relative to `/home/noob_master/pelu/frontend`; all API paths to `/home/noob_master/pelu/api`.

---

## Verification Baseline (measured on `main` at 2026-07-30, before any of this work)

Run these before starting so you can tell your regressions from the pre-existing ones.

```bash
npx vitest run
```
Expected: **`Test Files 1 failed | 76 passed (77)`, `Tests 1 failed | 673 passed (674)`.**
The single failure is `components/__tests__/design-system.test.ts` rule 10 ("no inline `style={{}}` except allowlisted files"), reporting **exactly 5 violations, all in `components/transitions/transition-overlay.tsx`**. That file is not on the allowlist and predates this work.

```bash
npx tsc --noEmit
```
Expected: **2 errors**, both `components/__tests__/transitions/transition-link.test.tsx` (TS2345, `targetHref` missing from a mocked `RouteTransitionContextValue`).

**There is no working lint.** `bun run lint` calls `next lint`, removed in Next 16, with no ESLint config. Do not try to fix it here.

**The gate for every task in this plan is "no failures other than those", not "zero".** In particular, rule 10's violation count must stay at **5** — that is why no task in this plan introduces an inline `style={{}}` (see Task 1, Step 3).

**Assume `bun run dev` is already running.** Do not start it.

---

## File Structure

**Frontend — created**

| File | Responsibility |
|---|---|
| `components/pets/verified-badge.tsx` | The certificate+check composite marking a verified-center pet. One definition, three call sites (grid card, landing strip, detail sheet). |
| `components/__tests__/pets/verified-badge.test.tsx` | Guards the badge's accessible name, caller-driven sizing, and the photo drop shadow. |
| `components/__tests__/pets/pet-detail.test.tsx` | Guards the rebuilt sheet: facts list, centre card, avatar/logo fallback, no `<hr>`, no stretched column. |
| `components/__tests__/ui/carousel-flush-items.test.tsx` | Guards that `flushItems` is opt-in and the default path keeps `rounded-xl` for the other 5 call sites. |
| `components/__tests__/dashboard/rc-settings-tab.test.tsx` | Guards that the three previously-dead save buttons actually call their endpoints. |

**Frontend — modified**

| File | Change |
|---|---|
| `components/pets/pet-detail.tsx` | The bulk of the work: flush carousel, title+chips grouping, facts list, rescue-center card, `<hr>` and `flex-1` removal. |
| `components/pets/pet-grid.tsx` | Uses `<VerifiedBadge>`; adds the avatar to the bottom overlay. |
| `components/landing/featured-pets.tsx` | Gains the verified badge (it has none today) and the avatar. |
| `components/Carousel.tsx` | Additive `flushItems` prop. Default path must stay byte-identical. |
| `components/dashboard/rescue-center/settings-tab.tsx` | Three dead save handlers become real. |
| `lib/api/pets.ts` | `PetRescueCenter` gains `avatar_url?: string`. Type only. |
| `public/locales/es/pets.json`, `public/locales/en/pets.json` | New `detail.facts.*` and `detail.verified_center` keys. |
| `components/__tests__/pets/pet-grid-card.test.tsx` | Avatar present/absent cases. |
| `components/__tests__/landing/featured-pets.test.tsx` | Badge + avatar cases. |

**API — modified**

| File | Change |
|---|---|
| `internal/pets/handler.go` | `rcSummary` gains `AvatarURL`; `lookupRCSummary` resolves it with a dedicated join. |
| `internal/pets/handler_test.go` | Covers avatar present and absent. |
| `docs/api/swagger.yaml`, `docs/api/swagger.json` | Regenerated. |

---

## Task 1: Extract `VerifiedBadge` and adopt it in the grid

The certificate+check composite is inlined at `pet-grid.tsx:394-405`, the landing strip has no badge at all, and the sheet needs one. Extract first so Tasks 5 and 11 have something to call.

**Files:**
- Create: `components/pets/verified-badge.tsx`
- Create: `components/__tests__/pets/verified-badge.test.tsx`
- Modify: `components/pets/pet-grid.tsx:7` (imports), `components/pets/pet-grid.tsx:393-405` (badge markup)

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/pets/verified-badge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { VerifiedBadge } from '@/components/pets/verified-badge'

const LABEL = 'Publicado por un centro de rescate verificado'

describe('VerifiedBadge', () => {
  it('announces itself once, as a single image', () => {
    renderWithProviders(<VerifiedBadge />)

    const badge = screen.getByRole('img', { name: LABEL })
    // Two glyphs, one accessible node: the check is decoration on the seal.
    expect(badge.querySelectorAll('svg')).toHaveLength(2)
  })

  it('takes its size from the caller', () => {
    renderWithProviders(<VerifiedBadge className="text-xl" />)

    expect(screen.getByRole('img', { name: LABEL })).toHaveClass('text-xl')
  })

  // The badge sits on photos in the grid and the landing strip, and on a flat
  // muted card in the sheet. Only the first needs separation from the image.
  it('only carries the photo drop shadow when asked', () => {
    const { unmount } = renderWithProviders(<VerifiedBadge />)
    expect(screen.getByRole('img', { name: LABEL }).className).not.toContain('drop-shadow')
    unmount()

    renderWithProviders(<VerifiedBadge onPhoto />)
    expect(screen.getByRole('img', { name: LABEL }).className).toContain('drop-shadow-[')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/verified-badge.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/pets/verified-badge"`.

- [ ] **Step 3: Write the component**

Create `components/pets/verified-badge.tsx`:

```tsx
'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCertificate, faCheck } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  /** Caller sets the size — `text-xl` on a card, `text-base` inline in the sheet. */
  className?: string
  /**
   * Separation for badges sitting on a photo. A utility, not `style={{ filter }}`:
   * `design-system.test.ts` rule 10 bans inline styles outside its allowlist, and
   * `drop-shadow-[…]` compiles to the identical `filter: drop-shadow(…)`.
   */
  onPhoto?: boolean
}

/**
 * The mark that says "a verified rescue center published this pet". Shared by
 * the grid card, the landing strip and the detail sheet so the three never
 * drift apart.
 *
 * `relative` lives on the root because the check is absolutely centred on the
 * seal. Callers that need the badge positioned wrap it in their own element —
 * passing `absolute` through `className` would race the root's `relative`.
 */
export function VerifiedBadge({ className, onPhoto = false }: VerifiedBadgeProps) {
  const { t } = useTranslation('pets')
  const label = t('card.verified_center')

  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn(
        'relative inline-block',
        onPhoto && 'drop-shadow-[0_2px_4px_var(--foreground)]',
        className,
      )}
    >
      <FontAwesomeIcon icon={faCertificate} className="text-pop-550" />
      {/* 0.6em, not text-xs: the check has to scale with whatever size the
          caller sets. 0.6 × text-xl (20px) = 12px — exactly today's text-xs. */}
      <FontAwesomeIcon
        icon={faCheck}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.6em] text-background"
      />
    </span>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/verified-badge.test.tsx`
Expected: PASS — 3 passed.

- [ ] **Step 5: Use it in the grid card**

In `components/pets/pet-grid.tsx`, replace the inline badge (currently lines 393-405):

```tsx
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
```

with:

```tsx
                  {/* Verified badge — slides left on hover to avoid the menu */}
                  {pet.rescue_center && (
                    <span className="pointer-events-none absolute top-2 right-2 z-10 transition-transform duration-200 ease-in-out group-hover:-translate-x-8">
                      <VerifiedBadge className="text-xl" onPhoto />
                    </span>
                  )}
```

Add the import near the other component imports at the top of the file:

```tsx
import { VerifiedBadge } from './verified-badge'
```

And drop the two now-unused icons from the Font Awesome import on line 7 — `faCertificate` and `faCheck` only appeared in the block you just deleted (`faSyringe` and `faScissors` are still used by the filters, keep them). Line 7 becomes:

```tsx
import { faPaw, faDog, faCat, faMars, faVenus, faLocationDot, faEllipsis, faLink, faGlobe, faSyringe, faScissors, faHouseChimney, faUser, faFilter } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 6: Run the grid tests and the design guards**

Run: `npx vitest run components/__tests__/pets/pet-grid-card.test.tsx components/__tests__/design-system.test.ts components/__tests__/design-structure.test.tsx`
Expected: `pet-grid-card` 8 passed (including "gives the verified badge a text alternative"), `design-structure` passed, `design-system` still failing **only** rule 10 with **exactly the same 5 `transition-overlay.tsx` violations** as the baseline. If rule 10 now reports 6+, you introduced an inline style — go back to Step 3.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: the 2 baseline `transition-link.test.tsx` errors, nothing else.

- [ ] **Step 8: Commit**

```bash
git add components/pets/verified-badge.tsx components/__tests__/pets/verified-badge.test.tsx components/pets/pet-grid.tsx
git commit -m "refactor(pets): extract the verified-center badge into one component"
```

---

## Task 2: Opt-in `flushItems` prop on `Carousel`

`Carousel.tsx:92` puts `rounded-xl` on every image slide. In the sheet the carousel sits flush against a square-cornered panel, so the panel's white shows through all four corners. `Carousel` has **6 call sites** — this must be a prop, and the default path must not change.

**Files:**
- Modify: `components/Carousel.tsx:21-33` (props), `:73-104` (`CarouselItem`), `:135-147` + `:300-311` (threading)
- Modify: `components/pets/pet-detail.tsx:43-60` (`DetailCarousel`)
- Create: `components/__tests__/ui/carousel-flush-items.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/ui/carousel-flush-items.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'

// The real motion runtime puts MotionValue objects into `style`, which React
// then tries to write to the DOM. This mock keeps the component's class names
// — the only thing under test here — and drops the animation plumbing.
vi.mock('motion/react', () => {
  const React = require('react')
  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, tag: string) =>
        React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
          const {
            style, drag, dragConstraints, initial, animate, transition,
            onDragEnd, onAnimationStart, onAnimationComplete, ...rest
          } = props
          return React.createElement(tag, { ...rest, ref })
        }),
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
  }
})

import { renderWithProviders } from '../test-utils'
import Carousel, { CarouselItem } from '@/components/Carousel'

const items: CarouselItem[] = [
  { id: 1, title: '', description: '', icon: null, image: 'https://example.test/luna.jpg', alt: 'Luna' },
]

function slideOf(container: HTMLElement) {
  const img = container.querySelector('img')
  expect(img).not.toBeNull()
  return img!.parentElement!
}

describe('Carousel flushItems', () => {
  // Five other call sites depend on this default. It is the whole reason the
  // fix is a prop instead of an edit to the shared class string.
  it('rounds image slides by default', () => {
    const { container } = renderWithProviders(
      <Carousel items={items} baseWidth={300} containerPadding={0} />,
    )

    expect(slideOf(container).className).toContain('rounded-xl')
  })

  it('drops the radius when flushItems is set', () => {
    const { container } = renderWithProviders(
      <Carousel items={items} baseWidth={300} containerPadding={0} flushItems />,
    )

    expect(slideOf(container).className).not.toContain('rounded-xl')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/ui/carousel-flush-items.test.tsx`
Expected: FAIL — TypeScript/runtime rejects the unknown `flushItems` prop, and the second case still finds `rounded-xl`.

- [ ] **Step 3: Add the prop**

In `components/Carousel.tsx`, add to `CarouselProps` (after `showPauseButton?: boolean;` on line 32):

```tsx
  /**
   * Drops the per-slide `rounded-xl`. Opt-in: the detail sheet is the only
   * caller whose carousel sits flush against a square-cornered panel, where
   * the rounded slide lets the panel's background show through the corners.
   */
  flushItems?: boolean;
```

Add to `CarouselItemProps` (after `transition: any;` on line 80):

```tsx
  flushItems: boolean;
```

Change the `CarouselItem` signature (line 83) and the image-slide class (line 92):

```tsx
function CarouselItem({ item, index, itemWidth, round, trackItemOffset, x, transition, flushItems }: CarouselItemProps) {
```

```tsx
        className={`relative shrink-0 overflow-hidden ${flushItems ? '' : 'rounded-xl'} cursor-grab active:cursor-grabbing`}
```

Add the default to the `Carousel` signature (after `showPauseButton = false,` on line 146):

```tsx
  flushItems = false,
```

And thread it through the render (line 301-310):

```tsx
        {itemsForRender.map((item, index) => (
          <CarouselItem
            key={`${item?.id ?? index}-${index}`}
            item={item}
            index={index}
            itemWidth={itemWidth}
            round={round}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
            flushItems={flushItems}
          />
        ))}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/ui/carousel-flush-items.test.tsx`
Expected: PASS — 2 passed.

- [ ] **Step 5: Use it in the sheet's carousel**

In `components/pets/pet-detail.tsx`, `DetailCarousel` (line 46-57), add the prop:

```tsx
        <Carousel
          items={items}
          baseWidth={width}
          autoplay={urls.length > 1}
          autoplayDelay={3000}
          pauseOnHover
          loop={urls.length > 1}
          containerPadding={0}
          dotsOverlay
          showPauseButton
          flushItems
          className="relative overflow-hidden w-full h-full"
        />
```

- [ ] **Step 6: Run every other Carousel consumer's tests plus typecheck**

Run: `npx vitest run components/__tests__/landing components/__tests__/about components/__tests__/design-structure.test.tsx && npx tsc --noEmit`
Expected: all passing; `tsc` shows only the 2 baseline errors.

- [ ] **Step 7: Commit**

```bash
git add components/Carousel.tsx components/pets/pet-detail.tsx components/__tests__/ui/carousel-flush-items.test.tsx
git commit -m "fix(pets): let the detail sheet's carousel sit flush against the panel"
```

---

## Task 3: Sheet information hierarchy — group title+chips, drop the rule and the stretch

Three small structural edits from spec §4.2, §4.6, §4.7. Doing them before the new content lands keeps the diffs readable.

**Files:**
- Modify: `components/pets/pet-detail.tsx:115-135` (column + title/chips), `:155` (the `<hr>`)
- Create: `components/__tests__/pets/pet-detail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/pets/pet-detail.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

import { renderWithProviders } from '../test-utils'
import { PetDetail } from '@/components/pets/pet-detail'

const pet = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    rescue_center_id: 'rc1',
    name: 'Abril',
    description: 'Muy cariñosa',
    age: 24,
    gender: 'female',
    species: 'dog',
    status: 'available',
    short_slug: '',
    photos: [],
    conditions: [],
    condition_notes: null,
    vaccinated: true,
    castrated: true,
    size: 'medium',
    ...overrides,
  }) as never

describe('PetDetail layout', () => {
  // The rule used to separate the pet from its centre. The centre now lives in
  // a bordered card, which does that job without a second horizontal line.
  it('has no horizontal rule', () => {
    const { container } = renderWithProviders(
      <PetDetail pet={pet({ rescue_center: { id: 'rc1', name: 'Adoptame RD' } })} />,
    )

    expect(container.querySelector('hr')).toBeNull()
  })

  // With `flex-1` the info column stretched to fill the panel and left ~330px
  // of void above the Adoptar button at a 1010px viewport.
  it('does not stretch the info column to fill the panel', () => {
    renderWithProviders(<PetDetail pet={pet()} />)

    // h2 → the title+chips group → the scrolling info column.
    const column = screen.getByRole('heading', { name: 'Abril' }).parentElement!.parentElement!
    expect(column.className).toContain('overflow-y-auto')
    expect(column.className).not.toContain('flex-1')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-detail.test.tsx`
Expected: FAIL — both cases. `container.querySelector('hr')` finds the rule; the column still carries `flex-1` (and the second assertion's parent hops resolve differently until the title/chips are grouped).

- [ ] **Step 3: Make the three edits**

In `components/pets/pet-detail.tsx`, replace lines 115-135 — the column opener, the `<h2>` and the badge row — so that the column no longer grows and the chips belong to the title:

```tsx
      {/* Info. No `flex-1`: with sparse content the column used to stretch and
          push the Adoptar button to the panel floor, leaving a void above it.
          Its own `overflow-y-auto` still lets long content scroll. */}
      <div className="overflow-y-auto p-4 space-y-4">
        {/* Title and chips read as one unit, not as two equally-spaced siblings. */}
        <div className="space-y-2.5">
          <h2 className="text-xl font-bold">{pet.name}</h2>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
              <FontAwesomeIcon icon={speciesIcon} className="text-xs" />
              {t(`species.${pet.species}`)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
              <FontAwesomeIcon icon={genderIcon} className="text-xs" />
              {t(`gender.${pet.gender}`)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
              <FontAwesomeIcon icon={faCakeCandles} className="text-xs" />
              {(() => {
                const { count, unit } = formatAge(pet.age)
                return t(`detail.${unit}`, { count })
              })()}
            </span>
          </div>
        </div>
```

Then delete line 155 entirely:

```tsx
        <hr className="border-border" />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pet-detail.test.tsx`
Expected: PASS — 2 passed.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: only the 2 baseline errors.

```bash
git add components/pets/pet-detail.tsx components/__tests__/pets/pet-detail.test.tsx
git commit -m "layout(pets): group the sheet's title with its chips and stop stretching the column"
```

> **Note for the reviewer:** with `flex-1` gone the Adoptar footer follows the content instead of sitting on the panel floor when a pet has little to say. That is the locked decision in spec §4.7 and matches the reviewed mockup (`sheet-rebuild.html`). Long content still pins the footer, because the column is a scroll container whose flex `min-height` resolves to 0.

---

## Task 4: Facts list — vaccines, neutering, size

`vaccinated`, `castrated` and `size` are on `Pet` (`lib/api/pets.ts:32-34`) and rendered nowhere, even though the grid lets users *filter* by the first two.

**Files:**
- Modify: `public/locales/es/pets.json:374-375`, `public/locales/en/pets.json:374-375`
- Modify: `components/pets/pet-detail.tsx` (imports + a new block after the condition alert)
- Modify: `components/__tests__/pets/pet-detail.test.tsx`

- [ ] **Step 1: Add the Spanish keys**

In `public/locales/es/pets.json`, replace lines 374-375:

```json
    "rescueCenter": "Centro de rescate",
    "specialCondition": "Condición especial"
```

with:

```json
    "rescueCenter": "Centro de rescate",
    "specialCondition": "Condición especial",
    "verified_center": "Centro de rescate verificado",
    "facts": {
      "vaccines": "Vacunas",
      "neutering": "Castración",
      "size": "Tamaño",
      "up_to_date": "Al día",
      "pending": "Pendiente",
      "yes": "Sí",
      "no": "No"
    }
```

- [ ] **Step 2: Add the English keys**

In `public/locales/en/pets.json`, replace lines 374-375:

```json
    "rescueCenter": "Rescue center",
    "specialCondition": "Special condition"
```

with:

```json
    "rescueCenter": "Rescue center",
    "specialCondition": "Special condition",
    "verified_center": "Verified rescue center",
    "facts": {
      "vaccines": "Vaccines",
      "neutering": "Neutering",
      "size": "Size",
      "up_to_date": "Up to date",
      "pending": "Pending",
      "yes": "Yes",
      "no": "No"
    }
```

No `lib/i18n/index.ts` change is needed — the `pets` namespace is already imported and registered for both locales.

- [ ] **Step 3: Write the failing test**

Append to the bottom of `components/__tests__/pets/pet-detail.test.tsx`:

```tsx
describe('PetDetail facts', () => {
  it('lists the facts the payload already carries', () => {
    renderWithProviders(<PetDetail pet={pet({ vaccinated: true, castrated: true, size: 'medium' })} />)

    expect(screen.getByText('Vacunas')).toBeInTheDocument()
    expect(screen.getByText('Al día')).toBeInTheDocument()
    expect(screen.getByText('Castración')).toBeInTheDocument()
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.getByText('Tamaño')).toBeInTheDocument()
    expect(screen.getByText('Mediano')).toBeInTheDocument()
  })

  // Nouns as subjects on purpose: `Vacunado`/`Castrado` are masculine and much
  // of the catalogue is female (Abril, Alma, Cangura…). The label carries the
  // noun so the value never has to agree with the pet's gender.
  it('states the negative facts without gendering the pet', () => {
    renderWithProviders(<PetDetail pet={pet({ vaccinated: false, castrated: false, size: 'small' })} />)

    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Pequeño')).toBeInTheDocument()
    expect(screen.queryByText('Vacunado')).toBeNull()
    expect(screen.queryByText('Castrado')).toBeNull()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-detail.test.tsx`
Expected: FAIL — `Unable to find an element with the text: Vacunas`.

- [ ] **Step 5: Render the facts**

In `components/pets/pet-detail.tsx`, extend the Font Awesome import (lines 7-17) with the three fact icons:

```tsx
import {
  faPaw,
  faDog,
  faCat,
  faMars,
  faVenus,
  faCakeCandles,
  faShareFromSquare,
  faCheck,
  faGlobe,
  faSyringe,
  faScissors,
  faRulerCombined,
} from '@fortawesome/free-solid-svg-icons'
```

Then insert this block immediately after the condition-alert block (which ends with `)}` on what was line 153) and before the rescue-center block:

```tsx
        {/* Facts the payload already carries and the sheet used to drop — the
            grid even lets users filter by the first two. Labels are nouns so
            the values stay gender-neutral. */}
        <dl className="text-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <FontAwesomeIcon icon={faSyringe} className="text-sm" />
              {t('detail.facts.vaccines')}
            </dt>
            <dd className="font-medium">
              {pet.vaccinated ? t('detail.facts.up_to_date') : t('detail.facts.pending')}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <FontAwesomeIcon icon={faScissors} className="text-sm" />
              {t('detail.facts.neutering')}
            </dt>
            <dd className="font-medium">
              {pet.castrated ? t('detail.facts.yes') : t('detail.facts.no')}
            </dd>
          </div>
          {/* Guarded: an absent size would render the raw `size.undefined` key. */}
          {pet.size && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <FontAwesomeIcon icon={faRulerCombined} className="text-sm" />
                {t('detail.facts.size')}
              </dt>
              <dd className="font-medium">{t(`size.${pet.size}`)}</dd>
            </div>
          )}
        </dl>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pet-detail.test.tsx`
Expected: PASS — 4 passed.

- [ ] **Step 7: Verify the JSON is still valid and typecheck**

Run: `node -e "['es','en'].forEach(l=>{const d=require('./public/locales/'+l+'/pets.json');if(!d.detail.facts.vaccines||!d.detail.verified_center)throw new Error(l);});console.log('locales ok')" && npx tsc --noEmit`
Expected: `locales ok`, then only the 2 baseline `tsc` errors.

- [ ] **Step 8: Commit**

```bash
git add components/pets/pet-detail.tsx components/__tests__/pets/pet-detail.test.tsx public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat(pets): show vaccination, neutering and size in the detail sheet"
```

---

## Task 5: Rebuild the rescue-center block as a card

The current block renders `logo_url` — a 1600×400 transparent lockup uploaded through a 4:1 banner uploader — at `width={40} height={40}` with no CSS size classes. Tailwind preflight's `img { height: auto }` beats the `height` attribute, so it paints at roughly **40×10**. This task replaces the block with a card that prefers a real 56px profile photo, keeps the logo as a *contained lockup* fallback, and gives the two links real hit areas.

`avatar_url` is added to the type here, but the API does not send it until Task 9 — until then every pet takes the logo branch, which is already an improvement over the collapsed image.

**Files:**
- Modify: `lib/api/pets.ts:11-17`
- Modify: `components/pets/pet-detail.tsx:157-192` (the whole rescue-center block) + imports
- Modify: `components/__tests__/pets/pet-detail.test.tsx`

- [ ] **Step 1: Add the type**

In `lib/api/pets.ts`, replace lines 11-17:

```ts
export interface PetRescueCenter {
  id: string
  name: string
  logo_url?: string
  website?: string
  instagram?: string
}
```

with:

```ts
export interface PetRescueCenter {
  id: string
  name: string
  /** 4:1 banner lockup from `LogoUpload`. Belongs on the adoption-form banner. */
  logo_url?: string
  /** The owning user's square profile photo — `users.avatar_url` via `rescue_centers.user_id`. */
  avatar_url?: string
  website?: string
  instagram?: string
}
```

- [ ] **Step 2: Write the failing test**

Append to `components/__tests__/pets/pet-detail.test.tsx`:

```tsx
describe('PetDetail rescue-center card', () => {
  const withCenter = (rc: Record<string, unknown>) =>
    pet({ rescue_center: { id: 'rc1', name: 'Adoptame RD', ...rc } })

  it('shows the profile photo and marks the centre verified', () => {
    const { container } = renderWithProviders(
      <PetDetail pet={withCenter({ avatar_url: 'https://cdn.test/avatar.jpg' })} />,
    )

    const avatar = container.querySelector('img[src="https://cdn.test/avatar.jpg"]')
    expect(avatar).not.toBeNull()
    // The centre's name is right beside it, so the photo is decorative.
    expect(avatar).toHaveAttribute('alt', '')
    expect(screen.getByText('Adoptame RD')).toBeInTheDocument()
    expect(screen.getByText('Centro de rescate verificado')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toBeInTheDocument()
  })

  // The fallback is a 1600×400 lockup. Cropping it into a square is exactly the
  // bug this task exists to kill, so it must stay contained.
  it('falls back to the logo as a contained lockup, never cropped', () => {
    const { container } = renderWithProviders(
      <PetDetail pet={withCenter({ logo_url: 'https://cdn.test/logo.png' })} />,
    )

    const logo = container.querySelector('img[src="https://cdn.test/logo.png"]')
    expect(logo).not.toBeNull()
    expect(logo!.className).toContain('object-contain')
    expect(logo!.className).not.toContain('object-cover')
  })

  it('prefers the profile photo over the logo when both exist', () => {
    const { container } = renderWithProviders(
      <PetDetail
        pet={withCenter({
          avatar_url: 'https://cdn.test/avatar.jpg',
          logo_url: 'https://cdn.test/logo.png',
        })}
      />,
    )

    expect(container.querySelector('img[src="https://cdn.test/avatar.jpg"]')).not.toBeNull()
    expect(container.querySelector('img[src="https://cdn.test/logo.png"]')).toBeNull()
  })

  it('renders only the links the centre actually has', () => {
    renderWithProviders(<PetDetail pet={withCenter({ website: 'adoptame.do' })} />)

    expect(screen.getByRole('link', { name: 'Sitio web' })).toHaveAttribute(
      'href',
      'https://adoptame.do',
    )
    expect(screen.queryByRole('link', { name: 'Instagram' })).toBeNull()
  })

  it('links to Instagram by handle', () => {
    renderWithProviders(<PetDetail pet={withCenter({ instagram: 'adoptame_rd' })} />)

    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/adoptame_rd',
    )
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-detail.test.tsx`
Expected: FAIL — no element with text `Centro de rescate verificado`; the logo renders with `object-cover`.

- [ ] **Step 4: Replace the rescue-center block**

In `components/pets/pet-detail.tsx`, add the badge import beside the other component imports:

```tsx
import { VerifiedBadge } from './verified-badge'
```

Then replace the entire rescue-center block (what was lines 157-192, from `{/* Rescue Center */}` through its closing `)}`) with:

```tsx
        {/* Rescue center. The card's own border separates it from the pet's
            facts — that is why the <hr> above it is gone. */}
        {pet.rescue_center && (
          <div className="rounded-2xl border border-border bg-muted p-3">
            <div className="flex items-start gap-3">
              {pet.rescue_center.avatar_url ? (
                <Image
                  src={pet.rescue_center.avatar_url}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-xl border border-border bg-background object-cover"
                />
              ) : pet.rescue_center.logo_url ? (
                /* `logo_url` is a 4:1 banner (LogoUpload enforces the ratio and
                   labels it as the adoption-form banner). Contained in the same
                   56px box — never cropped square, never given explicit
                   width/height attributes alone, which Tailwind preflight's
                   `img { height: auto }` would collapse. */
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background p-1.5">
                  <Image
                    src={pet.rescue_center.logo_url}
                    alt=""
                    width={56}
                    height={14}
                    className="h-auto w-full object-contain"
                  />
                </span>
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                  <FontAwesomeIcon icon={faPaw} className="text-base text-muted-foreground" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-semibold">{pet.rescue_center.name}</span>
                  <VerifiedBadge className="shrink-0 text-base" />
                </span>
                <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  {t('detail.verified_center')}
                </p>
              </div>
            </div>

            {/* Controls, not 14px anchors crowding the name: each gets its own
                hit area, and a lone link takes the full width. */}
            {(pet.rescue_center.website || pet.rescue_center.instagram) && (
              <div className="mt-3.5 flex gap-2">
                {pet.rescue_center.website && (
                  <a
                    href={ensureUrl(pet.rescue_center.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring flex h-[38px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                    {t('website', { ns: 'common' })}
                  </a>
                )}
                {pet.rescue_center.instagram && (
                  <a
                    href={instagramUrl(pet.rescue_center.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring flex h-[38px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                    {t('instagram', { ns: 'common' })}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pet-detail.test.tsx`
Expected: PASS — 9 passed.

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: `Test Files 1 failed | 80 passed`-ish — the only failure is the baseline `design-system.test.ts` rule 10 with its **5** `transition-overlay.tsx` violations. `tsc`: only the 2 baseline errors.

- [ ] **Step 7: Commit**

```bash
git add components/pets/pet-detail.tsx components/__tests__/pets/pet-detail.test.tsx lib/api/pets.ts
git commit -m "feat(pets): rebuild the sheet's rescue-center block as an identity card"
```

---

## Task 6: Make the rescue-center profile photo upload real

`settings-tab.tsx:128` creates an object URL and never uploads it. The endpoint (`POST /api/v1/auth/avatar`) and the client (`uploadAvatar`, `lib/api/auth.ts:49`) both already exist.

**Files:**
- Modify: `components/dashboard/rescue-center/settings-tab.tsx` (imports, state, `handleAvatarChange`, the profile-picture card)
- Create: `components/__tests__/dashboard/rc-settings-tab.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/dashboard/rc-settings-tab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'

const mockUser = {
  id: 'u1',
  email: 'refugio@example.com',
  role: 'rescue_center' as const,
  auth_provider: 'email',
  preferred_lang: 'es',
  // Deliberately different from the centre's name below — the two fields are
  // separate saves, and the tests must not pass by accident.
  display_name: 'Refugio Central',
  avatar_url: null,
}
const updateSession = vi.fn()

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false, logout: vi.fn(), updateSession }),
}))
vi.mock('@/lib/api/auth', () => ({ uploadAvatar: vi.fn() }))
vi.mock('@/lib/api/rescue-centers', () => ({
  getMyRescueCenter: vi.fn(),
  updateRescueCenter: vi.fn(),
  uploadRcLogo: vi.fn(),
}))
vi.mock('@/lib/api/client', () => ({ apiClient: vi.fn() }))
// Spread the real module: the MFA components imported by this tab reach for
// more of it than the tab itself calls.
vi.mock('@/lib/api/mfa', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/mfa')>()),
  getMethods: vi.fn(),
}))

import { renderWithProviders } from '../test-utils'
import { SettingsTab } from '@/components/dashboard/rescue-center/settings-tab'
import { uploadAvatar } from '@/lib/api/auth'
import { getMyRescueCenter, updateRescueCenter } from '@/lib/api/rescue-centers'
import { apiClient } from '@/lib/api/client'
import { getMethods } from '@/lib/api/mfa'

const mockUpload = vi.mocked(uploadAvatar)
const mockGetRc = vi.mocked(getMyRescueCenter)
const mockUpdateRc = vi.mocked(updateRescueCenter)
const mockApi = vi.mocked(apiClient)
const mockMethods = vi.mocked(getMethods)

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom implements neither.
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
  mockGetRc.mockResolvedValue({
    data: {
      id: 'rc1',
      user_id: 'u1',
      name: 'Adóptame RD',
      phone: '809-555-0000',
      address: 'Calle 1',
      city: 'Santo Domingo',
      status: 'active',
      logo_url: null,
    },
    error: null,
  })
  mockMethods.mockResolvedValue({
    data: { mfa_enabled: false, methods: [], recovery_codes_remaining: 0 },
    error: null,
  })
  mockApi.mockResolvedValue({ ok: true, json: async () => ({}) } as never)
  mockUpdateRc.mockResolvedValue({ data: null, error: null })
  mockUpload.mockResolvedValue({ data: { avatar_url: 'https://cdn.test/a.jpg' }, error: null })
})

/** The avatar input is the first file input in the tab; the second is LogoUpload's. */
function avatarInput(container: HTMLElement) {
  return container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement
}

const file = () => new File(['x'], 'foto.png', { type: 'image/png' })

describe('RC settings — profile photo', () => {
  it('uploads the chosen file instead of only previewing it', async () => {
    const { container } = renderWithProviders(<SettingsTab />)

    fireEvent.change(avatarInput(container), { target: { files: [file()] } })

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1))
    expect(mockUpload.mock.calls[0][0]).toBeInstanceOf(File)
  })

  // The avatar is the centre's public face across the whole app — the session
  // has to learn about it without a reload, and without losing its other fields.
  it('folds the new URL into the session without clobbering it', async () => {
    const { container } = renderWithProviders(<SettingsTab />)

    fireEvent.change(avatarInput(container), { target: { files: [file()] } })

    await waitFor(() => expect(updateSession).toHaveBeenCalledTimes(1))
    expect(updateSession).toHaveBeenCalledWith({
      ...mockUser,
      avatar_url: 'https://cdn.test/a.jpg',
    })
  })

  it('surfaces an upload failure instead of pretending it worked', async () => {
    mockUpload.mockResolvedValue({ data: null, error: 'Archivo demasiado grande' })
    const { container } = renderWithProviders(<SettingsTab />)

    fireEvent.change(avatarInput(container), { target: { files: [file()] } })

    expect(await screen.findByText('Archivo demasiado grande')).toBeInTheDocument()
    expect(updateSession).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/dashboard/rc-settings-tab.test.tsx`
Expected: FAIL — `expected "uploadAvatar" to be called 1 times, but got 0 times`.

- [ ] **Step 3: Wire the upload**

In `components/dashboard/rescue-center/settings-tab.tsx`:

Add the import beside the other API imports (after line 8):

```tsx
import { uploadAvatar } from '@/lib/api/auth'
```

Pull `updateSession` out of the auth context (line 21):

```tsx
  const { user, logout, updateSession } = useAuth()
```

Add the two new state flags beside `avatarPreview` (line 28):

```tsx
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
```

Replace `handleAvatarChange` (lines 128-133):

```tsx
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset first: picking the same file twice must fire `change` again.
    e.target.value = ''
    if (!file) return

    // Optimistic preview, same shape as LogoUpload.
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
    setAvatarError(null)
    setAvatarUploading(true)

    const { data, error } = await uploadAvatar(file)

    setAvatarUploading(false)
    URL.revokeObjectURL(objectUrl)
    setAvatarPreview(null)

    if (error || !data) {
      setAvatarError(error ?? 'Error al subir la foto')
      return
    }
    // Spread, never a bare object: the session also carries role, email and the
    // MFA flag, and this component must not drop them.
    if (user) updateSession({ ...user, avatar_url: data.avatar_url })
  }
```

Replace the profile-picture card (lines 165-194) so it reads the session photo and shows progress and errors:

```tsx
      {/* Profile picture */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Foto de perfil</h2>
        <p className="text-xs text-muted-foreground">
          Es la cara de tu centro en las mascotas que publicas.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted shrink-0">
            {avatarPreview ?? user?.avatar_url ? (
              <Image
                src={(avatarPreview ?? user?.avatar_url) as string}
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {displayName ? displayName[0].toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-sm px-4 py-2 rounded-xl border border-input hover:bg-muted transition-colors disabled:opacity-50"
            >
              {avatarUploading ? 'Subiendo…' : 'Cambiar foto'}
            </button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG o GIF · máx. 5 MB</p>
            {avatarError && <p className="text-sm text-destructive mt-1">{avatarError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/dashboard/rc-settings-tab.test.tsx`
Expected: PASS — 3 passed.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: only the 2 baseline errors.

```bash
git add components/dashboard/rescue-center/settings-tab.tsx components/__tests__/dashboard/rc-settings-tab.test.tsx
git commit -m "fix(rc-settings): actually upload the profile photo instead of previewing it"
```

---

## Task 7: Make "Nombre de usuario" save

`settings-tab.tsx:135` flips a "Guardado" flag and nothing else. The field also initialises from `user.email`, so a centre that has a display name sees an email address in a box labelled "name". Working reference: `components/dashboard/business/settings-tab.tsx:159`.

**Files:**
- Modify: `components/dashboard/rescue-center/settings-tab.tsx:26` (init), `:135-138` (handler), `:206-223` (card)
- Modify: `components/__tests__/dashboard/rc-settings-tab.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `components/__tests__/dashboard/rc-settings-tab.test.tsx`:

```tsx
describe('RC settings — display name', () => {
  it('starts from the display name, not the email', () => {
    renderWithProviders(<SettingsTab />)

    expect(screen.getByPlaceholderText('Tu nombre')).toHaveValue('Refugio Central')
  })

  it('PATCHes the profile when saved', async () => {
    renderWithProviders(<SettingsTab />)

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), {
      target: { value: 'Refugio Luna' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0])

    await waitFor(() => expect(mockApi).toHaveBeenCalled())
    const [path, init] = mockApi.mock.calls[0]
    expect(path).toBe('/api/v1/auth/profile')
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(init!.body as string)).toEqual({ display_name: 'Refugio Luna' })
    await waitFor(() =>
      expect(updateSession).toHaveBeenCalledWith({ ...mockUser, display_name: 'Refugio Luna' }),
    )
  })

  it('reports a failed save instead of showing "Guardado"', async () => {
    mockApi.mockResolvedValue({ ok: false, json: async () => ({}) } as never)
    renderWithProviders(<SettingsTab />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0])

    expect(await screen.findByText('No se pudo guardar el nombre. Intenta de nuevo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardado' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/dashboard/rc-settings-tab.test.tsx -t "display name"`
Expected: FAIL — the input holds `refugio@example.com`, and `apiClient` is never called.

- [ ] **Step 3: Wire the save**

In `components/dashboard/rescue-center/settings-tab.tsx`:

Initialise from the display name (line 26). `ProtectedRoute` renders a loader until the session resolves, so `user` is already populated at mount:

```tsx
  const [displayName, setDisplayName] = useState(user?.display_name ?? user?.email ?? '')
```

Add state beside `savedName` (line 29):

```tsx
  const [savedName, setSavedName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
```

Replace `handleSaveName` (lines 135-138):

```tsx
  const handleSaveName = async () => {
    setSavingName(true)
    setNameError(null)

    const res = await apiClient('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    })

    setSavingName(false)
    if (!res.ok) {
      setNameError('No se pudo guardar el nombre. Intenta de nuevo.')
      return
    }

    if (user) updateSession({ ...user, display_name: displayName })
    setSavedName(true)
    setTimeout(() => setSavedName(false), 2000)
  }
```

Replace the display-name card (lines 205-223):

```tsx
      {/* Display name */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Nombre de usuario</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className="flex-1 px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={handleSaveName}
            disabled={savingName}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {savingName ? 'Guardando…' : savedName ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        {nameError && <p className="text-sm text-destructive">{nameError}</p>}
      </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/dashboard/rc-settings-tab.test.tsx`
Expected: PASS — 6 passed.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: only the 2 baseline errors.

```bash
git add components/dashboard/rescue-center/settings-tab.tsx components/__tests__/dashboard/rc-settings-tab.test.tsx
git commit -m "fix(rc-settings): persist the display name and seed it from the session"
```

---

## Task 8: Make "Nombre del centro" load and save

`rescueName` is never populated from `getMyRescueCenter()` — the effect at lines 52-61 reads only logo/website/instagram — and its save button (line 140) only flips a flag.

**Files:**
- Modify: `components/dashboard/rescue-center/settings-tab.tsx:52-61` (effect), `:140-143` (handler), `:226-243` (card)
- Modify: `components/__tests__/dashboard/rc-settings-tab.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `components/__tests__/dashboard/rc-settings-tab.test.tsx`:

```tsx
describe('RC settings — centre name', () => {
  it('loads the current centre name into the field', async () => {
    renderWithProviders(<SettingsTab />)

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Ej. Rescate Animal Santo Domingo')).toHaveValue('Adóptame RD'),
    )
  })

  it('PATCHes the rescue centre when saved', async () => {
    renderWithProviders(<SettingsTab />)

    const field = screen.getByPlaceholderText('Ej. Rescate Animal Santo Domingo')
    await waitFor(() => expect(field).toHaveValue('Adóptame RD'))

    fireEvent.change(field, { target: { value: 'Refugio Luna' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[1])

    await waitFor(() => expect(mockUpdateRc).toHaveBeenCalledWith('rc1', { name: 'Refugio Luna' }))
  })

  it('surfaces the API error instead of showing "Guardado"', async () => {
    mockUpdateRc.mockResolvedValue({ data: null, error: 'Nombre ya en uso' })
    renderWithProviders(<SettingsTab />)

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Ej. Rescate Animal Santo Domingo')).toHaveValue('Adóptame RD'),
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[1])

    expect(await screen.findByText('Nombre ya en uso')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/dashboard/rc-settings-tab.test.tsx -t "centre name"`
Expected: FAIL — the field is empty and `updateRescueCenter` is never called.

- [ ] **Step 3: Populate and save**

In `components/dashboard/rescue-center/settings-tab.tsx`:

Add the name to the existing effect (lines 52-61):

```tsx
  useEffect(() => {
    getMyRescueCenter().then(({ data }) => {
      if (data) {
        setRcId(data.id)
        setRescueName(data.name)
        setRcLogoUrl(data.logo_url ?? null)
        setRcWebsite(data.website ?? '')
        setRcInstagram(data.instagram ?? '')
      }
    })
  }, [])
```

Add state beside `savedRescue` (line 30):

```tsx
  const [savedRescue, setSavedRescue] = useState(false)
  const [savingRescue, setSavingRescue] = useState(false)
  const [rescueError, setRescueError] = useState<string | null>(null)
```

Replace `handleSaveRescue` (lines 140-143):

```tsx
  const handleSaveRescue = async () => {
    if (!rcId) return
    setSavingRescue(true)
    setRescueError(null)

    const { error } = await updateRescueCenter(rcId, { name: rescueName.trim() })

    setSavingRescue(false)
    if (error) {
      setRescueError(error)
      return
    }

    setSavedRescue(true)
    setTimeout(() => setSavedRescue(false), 2000)
  }
```

Replace the centre-name card (lines 225-243):

```tsx
      {/* Rescue center name */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Nombre del centro de rescate</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={rescueName}
            onChange={(e) => setRescueName(e.target.value)}
            placeholder="Ej. Rescate Animal Santo Domingo"
            className="flex-1 px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={handleSaveRescue}
            disabled={savingRescue || !rcId}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {savingRescue ? 'Guardando…' : savedRescue ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        {rescueError && <p className="text-sm text-destructive">{rescueError}</p>}
      </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/dashboard/rc-settings-tab.test.tsx`
Expected: PASS — 9 passed.

- [ ] **Step 5: Full suite, typecheck, commit**

Run: `npx vitest run && npx tsc --noEmit`
Expected: only the baseline failure (rule 10, 5 violations) and the 2 baseline `tsc` errors.

```bash
git add components/dashboard/rescue-center/settings-tab.tsx components/__tests__/dashboard/rc-settings-tab.test.tsx
git commit -m "fix(rc-settings): load and persist the rescue centre's name"
```

---

## Task 9: API — expose the owner's avatar on `rcSummary`

**Work in `/home/noob_master/pelu/api`, a different git repo.** Additive, no migration: `users.avatar_url` already exists (migration `000034_add_avatar_url_to_users`) and `rescue_centers.user_id` is the join.

Both consumers pick the field up for free — `GetByID` (`handler.go:278`) and `List`'s `rcCache` (`handler.go:345-358`) — because they both call `lookupRCSummary`.

**Files:**
- Modify: `internal/pets/handler.go:90-96` (`rcSummary`), `:135-146` (`lookupRCSummary`)
- Modify: `internal/pets/handler_test.go` (new test)
- Modify: `docs/api/swagger.yaml`, `docs/api/swagger.json` (regenerated)

- [ ] **Step 1: Set up the test database (once per machine)**

Run: `make test-db-setup`
Expected: the target completes without error. **API tests `TRUNCATE … CASCADE` every table** and refuse to run unless the database name contains `test` — never point `DATABASE_URL` at the dev `pelu` database.

- [ ] **Step 2: Write the failing test**

Append to `internal/pets/handler_test.go`:

```go
func TestGetByIDIncludesOwnerAvatar(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	defer testutil.CleanupTestDB(t, pool)

	h := newHandler(pool, newStorage(sharedStorage.NewLocalClient(t.TempDir(), "http://localhost:9999")))

	ctx := context.Background()
	testutil.CleanupAll(t, pool)

	withAvatarUser, withAvatarRC := createTestRescueCenterForHandler(t, ctx, pool, "avatar@example.com")
	if _, err := pool.Exec(ctx,
		`UPDATE users SET avatar_url = $1 WHERE id = $2`,
		"https://cdn.test/avatar.jpg", withAvatarUser,
	); err != nil {
		t.Fatalf("set avatar_url: %v", err)
	}

	_, noAvatarRC := createTestRescueCenterForHandler(t, ctx, pool, "noavatar@example.com")

	withAvatar, err := testInsertPet(ctx, pool, withAvatarRC, "Luna", "Desc", 12)
	if err != nil {
		t.Fatalf("insert pet: %v", err)
	}
	noAvatar, err := testInsertPet(ctx, pool, noAvatarRC, "Rex", "Desc", 12)
	if err != nil {
		t.Fatalf("insert pet: %v", err)
	}

	tests := []struct {
		name       string
		petID      string
		wantAvatar *string
	}{
		{name: "owner has an avatar", petID: withAvatar.ID, wantAvatar: ptr("https://cdn.test/avatar.jpg")},
		// Omitted, not empty: the frontend falls back to the 4:1 logo lockup.
		{name: "owner has no avatar", petID: noAvatar.ID, wantAvatar: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/pets/"+tt.petID, nil)
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.petID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			rec := httptest.NewRecorder()
			h.GetByID(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
			}

			var resp petResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if resp.RescueCenter == nil {
				t.Fatal("expected a rescue_center summary")
			}
			// The join must not cost us the fields that already worked.
			if resp.RescueCenter.Name != "Test Center" {
				t.Errorf("expected name %q, got %q", "Test Center", resp.RescueCenter.Name)
			}
			if resp.RescueCenter.Website == nil || *resp.RescueCenter.Website != "https://test.com" {
				t.Errorf("website lost by the join: %v", resp.RescueCenter.Website)
			}

			switch {
			case tt.wantAvatar == nil && resp.RescueCenter.AvatarURL != nil:
				t.Errorf("expected no avatar_url, got %q", *resp.RescueCenter.AvatarURL)
			case tt.wantAvatar != nil && resp.RescueCenter.AvatarURL == nil:
				t.Error("expected an avatar_url, got none")
			case tt.wantAvatar != nil && *resp.RescueCenter.AvatarURL != *tt.wantAvatar:
				t.Errorf("expected %q, got %q", *tt.wantAvatar, *resp.RescueCenter.AvatarURL)
			}
		})
	}
}

func ptr(s string) *string { return &s }
```

> If `ptr` already exists in the `pets` package, drop the helper from this file and use the existing one — check with `grep -rn "func ptr(" internal/pets/`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `go test ./internal/pets/ -run TestGetByIDIncludesOwnerAvatar -v`
Expected: FAIL to compile — `resp.RescueCenter.AvatarURL undefined (type *rcSummary has no field or method AvatarURL)`.

- [ ] **Step 4: Add the field**

In `internal/pets/handler.go`, replace the `rcSummary` struct (lines 90-96):

```go
type rcSummary struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	// LogoURL is the 4:1 banner lockup; AvatarURL is the owning user's square
	// profile photo. The public surfaces prefer the avatar and keep the lockup
	// as a contained fallback.
	LogoURL   *string `json:"logo_url,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
	Website   *string `json:"website,omitempty"`
	Instagram *string `json:"instagram,omitempty"`
}
```

- [ ] **Step 5: Resolve it with a dedicated query**

Replace `lookupRCSummary` (lines 135-146):

```go
// lookupRCSummary builds the public rescue-center summary attached to a pet.
//
// It queries directly instead of calling rescuecenter.FindByID because the
// summary needs the owning user's avatar, which lives on `users` — widening the
// shared RescueCenter struct for one public payload would be the worse trade.
func (h *handler) lookupRCSummary(ctx context.Context, rcID string) *rcSummary {
	s := &rcSummary{}
	err := h.pool.QueryRow(ctx, `
		SELECT rc.id, rc.name, rc.logo_url, rc.website, rc.instagram, u.avatar_url
		FROM rescue_centers rc
		JOIN users u ON u.id = rc.user_id
		WHERE rc.id = $1`, rcID,
	).Scan(&s.ID, &s.Name, &s.LogoURL, &s.Website, &s.Instagram, &s.AvatarURL)
	if err != nil {
		// Same contract as before: no row, a bad UUID or a dead query all mean
		// "no centre summary", and the pet still serialises without one.
		return nil
	}
	return s
}
```

- [ ] **Step 6: Run the new test to verify it passes**

Run: `go test ./internal/pets/ -run TestGetByIDIncludesOwnerAvatar -v`
Expected: PASS — both subtests.

- [ ] **Step 7: Run the whole pets package**

Run: `make test-pets`
Expected: `ok github.com/pelu/api/internal/pets`. `TestHandlerList` and `TestHandlerGetByID`-adjacent cases must still pass — they exercise the same `lookupRCSummary`.

- [ ] **Step 8: Regenerate the OpenAPI spec**

Run: `make swagger`
Expected: `docs/api/swagger.yaml` and `docs/api/swagger.json` regenerate with `avatar_url` on the `rcSummary` schema.
If the target fails with `swag: command not found`, install it first: `go install github.com/swaggo/swag/v2/cmd/swag@latest`, then re-run.

Verify: `grep -n "avatar_url" docs/api/swagger.yaml` — expect at least one hit under the `rcSummary` definition.

- [ ] **Step 9: Commit (in the API repo)**

```bash
git add internal/pets/handler.go internal/pets/handler_test.go docs/api/swagger.yaml docs/api/swagger.json
git commit -m "feat(pets): expose the rescue centre owner's avatar in the public summary"
```

> **Deployment gate:** Tasks 10 and 11 render `avatar_url` on public surfaces. They are safe to write and merge before this ships (the field is optional and simply absent), but the avatars only appear once this API change is deployed.

---

## Task 10: Avatar on the grid card

**Back in `/home/noob_master/pelu/frontend`.**

The avatar goes inside the existing bottom gradient overlay, left of the name. The top-right verified badge stays exactly as it behaves today, hover dodge included. Member-published pets get **no avatar and no placeholder** — the API returns no author identity for them, so the presence of the avatar is itself part of the signal.

**Files:**
- Modify: `components/pets/pet-grid.tsx:372-381` (the overlay)
- Modify: `components/__tests__/pets/pet-grid-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Append these cases inside the existing `describe('PetGrid card', …)` block in `components/__tests__/pets/pet-grid-card.test.tsx`:

```tsx
  it('shows the rescue centre avatar in the overlay', () => {
    const { container } = renderGrid([
      pet({
        rescue_center: { id: 'rc1', name: 'Refugio', avatar_url: 'https://cdn.test/a.jpg' },
      }),
    ])

    const avatar = container.querySelector('img[src="https://cdn.test/a.jpg"]')
    expect(avatar).not.toBeNull()
    // Decorative: the badge already announces the verified centre.
    expect(avatar).toHaveAttribute('alt', '')
    // Explicit CSS size, never width/height attributes alone — Tailwind
    // preflight's `img { height: auto }` beats the attribute and collapses it.
    expect(avatar!.className).toContain('h-[30px]')
    expect(avatar!.className).toContain('w-[30px]')
  })

  // Member-published pets carry no author identity, and a placeholder would
  // invent one. Absence is the signal.
  it('shows no avatar and no placeholder for member pets', () => {
    const { container } = renderGrid([pet()])

    expect(container.querySelector('img')).toBeNull()
  })

  it('shows no avatar for a centre that has not uploaded one', () => {
    const { container } = renderGrid([pet({ rescue_center: { id: 'rc1', name: 'Refugio' } })])

    expect(container.querySelector('img')).toBeNull()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-grid-card.test.tsx`
Expected: FAIL — `expected null not to be null` on the first new case.

- [ ] **Step 3: Add the avatar to the overlay**

In `components/pets/pet-grid.tsx`, replace the overlay (lines 372-381):

```tsx
                    {/* Name + meta overlay. Spans, not <p>: a button may only
                        contain phrasing content. The avatar only renders for
                        centre-published pets — member pets carry no author
                        identity, and a placeholder would invent one. */}
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-primary to-transparent p-2 pt-6 text-left">
                      {pet.rescue_center?.avatar_url && (
                        <Image
                          src={pet.rescue_center.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      )}
                      <span className="block min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-background">{pet.name}</span>
                        <span className="block truncate text-[11px] text-background/80">
                          {t(`detail.${age.unit}`, { count: age.count })}
                          {' · '}
                          {t(`gender.${pet.gender}`)}
                        </span>
                      </span>
                    </span>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pet-grid-card.test.tsx`
Expected: PASS — 11 passed. In particular "does not duplicate the pet name on the photo" and "does not nest interactive content inside the card button" must still pass: the avatar is an `<img>`, which is phrasing content and not interactive.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: only the 2 baseline errors.

```bash
git add components/pets/pet-grid.tsx components/__tests__/pets/pet-grid-card.test.tsx
git commit -m "feat(pets): show the publishing centre's avatar on grid cards"
```

---

## Task 11: Badge and avatar on the landing strip

The featured strip has **no** verified badge today — this is the consistency the user asked for. It has no `⋯` menu, so the badge renders without the grid's hover translate.

**Files:**
- Modify: `components/landing/featured-pets.tsx:107-131`
- Modify: `components/__tests__/landing/featured-pets.test.tsx`

- [ ] **Step 1: Write the failing test**

In `components/__tests__/landing/featured-pets.test.tsx`, replace the `pet` factory (lines 13-14) so cases can attach a centre:

```tsx
const pet = (id: string, name: string, overrides: Record<string, unknown> = {}) =>
  ({
    id,
    name,
    age: 24,
    gender: 'female',
    species: 'dog',
    photos: [],
    conditions: [],
    ...overrides,
  }) as never
```

Then append inside the existing `describe('FeaturedPets', …)` block:

```tsx
  // The strip had no verified badge at all, while the grid card did. Same
  // signal, same mark, everywhere a pet appears.
  it('marks centre-published pets as verified', async () => {
    mockList.mockResolvedValue({
      data: [
        pet('1', 'Luna', { rescue_center: { id: 'rc1', name: 'Refugio' } }),
        pet('2', 'Rex'),
      ],
      error: null,
    })

    renderStrip()

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    expect(
      screen.getAllByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toHaveLength(1)
  })

  it('shows the centre avatar when the API sends one', async () => {
    mockList.mockResolvedValue({
      data: [
        pet('1', 'Luna', {
          rescue_center: { id: 'rc1', name: 'Refugio', avatar_url: 'https://cdn.test/a.jpg' },
        }),
      ],
      error: null,
    })

    const { container } = renderStrip()

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    const avatar = container.querySelector('img[src="https://cdn.test/a.jpg"]')
    expect(avatar).not.toBeNull()
    expect(avatar).toHaveAttribute('alt', '')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/landing/featured-pets.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "img" and name "Publicado por un centro de rescate verificado"`.

- [ ] **Step 3: Render the badge and avatar**

In `components/landing/featured-pets.tsx`, add the import beside the other component imports:

```tsx
import { VerifiedBadge } from '@/components/pets/verified-badge'
```

Then replace the card body (lines 107-131):

```tsx
                  <TransitionLink
                    href="/pets"
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
                    {/* No hover dodge here: the strip has no ⋯ menu to make room for. */}
                    {pet.rescue_center && (
                      <span className="pointer-events-none absolute top-2 right-2 z-10">
                        <VerifiedBadge className="text-xl" onPhoto />
                      </span>
                    )}
                    {/* Spans, not <p>: an <a> may only contain phrasing content. */}
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-primary to-transparent p-2 pt-6">
                      {pet.rescue_center?.avatar_url && (
                        <Image
                          src={pet.rescue_center.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      )}
                      <span className="block min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-background">{pet.name}</span>
                        <span className="block truncate text-[11px] text-background/80">
                          {t(`detail.${age.unit}`, { ns: 'pets', count: age.count })}
                        </span>
                      </span>
                    </span>
                  </TransitionLink>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/landing/featured-pets.test.tsx`
Expected: PASS — 7 passed. The existing "renders up to eight pets" case must still pass; its pets have no `rescue_center`, so no badge and no avatar appear.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: only the 2 baseline errors.

```bash
git add components/landing/featured-pets.tsx components/__tests__/landing/featured-pets.test.tsx
git commit -m "feat(landing): give the featured strip the verified badge and centre avatar"
```

---

## Task 12: Full verification sweep

**Files:** none — this task only runs things and records what it found.

- [ ] **Step 1: Full frontend test suite**

Run: `npx vitest run`
Expected: exactly **one** failing test file — `components/__tests__/design-system.test.ts`, rule 10, reporting **5** violations, all in `components/transitions/transition-overlay.tsx`. Everything else passes. If rule 10 now lists a file this plan touched, an inline `style={{}}` slipped in — remove it and express the rule as a Tailwind utility.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exactly the 2 baseline `components/__tests__/transitions/transition-link.test.tsx` errors.

- [ ] **Step 3: Production build**

Run: `bun run build`
Expected: build completes and writes `/out`. This is the closest thing to a lint this repo has — it catches unused imports the tests do not, e.g. a stale `faCertificate` in `pet-grid.tsx`.

- [ ] **Step 4: API package tests (in `/home/noob_master/pelu/api`)**

Run: `make test-pets`
Expected: `ok github.com/pelu/api/internal/pets`.

- [ ] **Step 5: Browser verification — read this before starting it**

This is a purely visual change, so skipping live verification is the biggest risk in the plan; the 2026-07-28 pass already shipped with every live step waived.

The obstacle is known: **port 3000 currently serves a stale Docker production build, and the API's CORS allows only that origin**, so a dev server on any other port renders the routes with no data. Pick one deliberately:

- **Option A (preferred)** — stop the Docker container, run `bun run dev` on port 3000, and browse against the live API.
- **Option B** — rebuild the Docker image from this branch and browse the built output.

Then check, at a desktop viewport (~1010px tall, where the ~330px void was measured):

1. `/pets` — open a centre-published pet. The carousel meets the panel with **no white corners**; the title and chips read as one group; the facts list shows Vacunas / Castración / Tamaño; the centre card shows a **56px** photo (or a contained 4:1 lockup if the centre has not uploaded a profile photo yet), the name with the verified badge beside it, the uppercase kicker, and full-width-ish Sitio web / Instagram buttons; **no rule** above the card; **no void** above Adoptar.
2. `/pets` grid — the avatar sits in the bottom overlay of centre-published cards, the top-right badge still dodges left on hover, and member pets show neither.
3. `/` landing strip — badge and avatar match the grid.
4. `/dashboard/rescue-center` → Ajustes — upload a profile photo (it should persist across a reload), rename the user, rename the centre. Then reload `/pets` and confirm the photo reaches the public card and sheet. **This last check only works once Task 9 is deployed.**

Record what you actually verified and what you could not, with the reason.

- [ ] **Step 6: Report**

Summarise: which tasks landed, the final test/typecheck/build output versus the baseline, and every browser check that was performed or skipped. Do not describe the visual work as verified if only the tests ran.

---

## Out of Scope — Deliberately Not Fixed Here

Both are recorded in spec §2.8 and neither is a regression introduced by this plan:

- **`short_slug` does not exist in the API** — no field on `petResponse`, no column in any migration, no `/pets/s/{slug}` route. The frontend type declares it, so `pet.short_slug` is always `undefined` and the sheet's **Compartir** button, the grid's "Compartir enlace" menu item, `getPetBySlug()` and the whole `/p/[slug]` page are dead code that renders nothing. The user wants sharing to work; it needs its own issue and its own backend change.
- **`rescue_centers` has no `description` column**, so there is no centre bio to display in the new card.

Also note: `PetDetail` is shared by the desktop `Sheet` and the mobile `Drawer` (`components/pets/pets-page.tsx:137` and `:146`), so every change in Tasks 2-5 shows up on mobile too. That is fine and intentional — the mobile `/pets` redesign is planned separately from `docs/superpowers/specs/2026-07-30-pets-mobile-feed-design.md` and will supersede this layout on small viewports.

---

## Risks

| Risk | Mitigation |
|---|---|
| `Carousel` has 6 call sites; a shared-class edit would hit all of them. | `flushItems` is opt-in and defaults to `false`; Task 2 Step 1 asserts the default still renders `rounded-xl`, and Step 6 runs every other consumer's tests. |
| The avatar depends on two repos: the API must expose `avatar_url` **and** a centre must have uploaded one. | The sheet's logo/spacing/corner fixes (Tasks 2-5) have no such dependency and ship first. Tasks 10-11 render nothing until the field arrives, which is the intended "member pets get no avatar" behaviour anyway. |
| `updateSession` could clobber other session fields. | Every call spreads the current `user` (`{ ...user, avatar_url }`), and Task 6 Step 1 asserts the exact object passed. |
| Extracting the badge could add an inline `style={{}}` and worsen the already-failing design-system rule 10. | `VerifiedBadge` uses `drop-shadow-[0_2px_4px_var(--foreground)]`, which Tailwind v4 compiles to the identical `filter: drop-shadow(…)`. Task 1 Step 6 checks the violation count is still 5. |
| The new join in `lookupRCSummary` could drop centres whose `user_id` is dangling. | An `INNER JOIN` is correct here — `rescue_centers.user_id` is the owning account and a centre cannot exist without one. Task 9's test asserts `name` and `website` still arrive for a centre with no avatar. |
