# /pets Mobile Post Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile `/pets` grid-plus-drawer with a terminal post feed — one pet per snap-aligned card that already shows everything, so nothing is hidden behind a tap.

**Architecture:** Four layers, in dependency order. (1) A forced refactor: the filter UI and `sourceFilter` live inside `PetGrid` today, so they must be extracted and lifted before mobile can stop rendering the grid. (2) Two additive `Carousel` changes — direction-locked drag and real dot buttons — which improve the desktop sheet the moment they land. (3) The two new feed components, built and tested in isolation. (4) The breakpoint fork in `pets-page.tsx`, which is what actually switches mobile over. Layers 1–3 ship with no visible change to either breakpoint; only layer 4 is user-visible.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`) · React 19 · TypeScript · Tailwind v4 (theme in `app/globals.css`, no `tailwind.config.ts`) · motion 12.35.1 · Font Awesome · react-i18next (bundled resources) · Vitest + React Testing Library.

**Source spec:** `docs/superpowers/specs/2026-07-30-pets-mobile-feed-design.md` (Approved — decisions locked).

**Companion spec, already shipped:** `2026-07-30-pets-desktop-sheet-identity-design.md`. Its deliverables that this plan consumes — `components/pets/verified-badge.tsx`, the `flushItems` prop on `Carousel`, and `avatar_url` on `PetRescueCenter` — are all **already on `main`** (frontend `fd70c0c`, API `a32eba5`). Nothing in this plan is blocked on them.

---

## Repos and Working Directories

**This plan touches one repo: `/home/noob_master/pelu/frontend`** (`git@github.com:alexvtejeda/pel-.git`). All paths below are relative to it. The spec's §11 is explicit that no API change belongs to this work.

Never `git add -A` — stage the specific files each task lists.

---

## Verification Baseline (measured on `main` at 2026-07-30, before any of this work)

Run these first so you can tell your regressions from the pre-existing ones.

```bash
npx vitest run
```
Expected: **`Test Files 1 failed | 81 passed (82)`, `Tests 1 failed | 724 passed (725)`, `Errors 14 errors`.**

- The one failure is `components/__tests__/design-system.test.ts` rule 10 ("no inline `style={{}}` except allowlisted files"), reporting **exactly 5 violations, all in `components/transitions/transition-overlay.tsx`**. That file is not on the allowlist and predates this work.
- The 14 "Errors" are `EnvironmentTeardownError` unhandled rejections from `gsap` in `components/__tests__/about/segments-stage.test.tsx`. They are teardown noise, not assertions, and are also pre-existing.

```bash
npx tsc --noEmit
```
Expected: **2 errors**, both `components/__tests__/transitions/transition-link.test.tsx` (TS2345, `targetHref` missing from a mocked `RouteTransitionContextValue`).

**There is no working lint.** `bun run lint` calls `next lint`, removed in Next 16, with no ESLint config. Do not try to fix it here.

**The gate for every task is "no failures other than those", not "zero".** Rule 10's violation count must stay at **5** — which is why no component in this plan uses an inline `style={{}}`. Everything that would want one (the measured carousel width, the snap type, the card shadow) is expressed as a prop, a Tailwind utility, or a theme token instead.

**Assume `bun run dev` is already running.** Do not start it.

---

## Findings that change what gets built

Four things were confirmed in the code after the spec was approved. Each one alters an instruction the spec gives, so read these before Task 1.

### F1. `PetFilters` is already a type name — the component must not reuse it

`lib/api/pets-public.ts` exports `PetFilters` as the **query-params type**, and `pets-page.tsx` already imports it under that name. The spec names the new *file* `pet-filters.tsx`, which is fine, but the exported component is named **`PetFilterBar`** throughout this plan to avoid a collision in the one file that needs both.

### F2. The page — not a nested element — is the scroll container on `/pets`

`pet-grid.tsx:296` carries `flex-1 overflow-y-auto`, but its ancestor is `min-h-screen` (`pets-page.tsx:102`), not `h-screen`. A flex child with an indefinite parent height grows to fit its content, so that `overflow-y-auto` never engages and **the document scrolls**.

Consequences, both handled in Task 7:
- `scroll-snap-type` must land on the scroll container itself — the root element — not on a `PetFeed` wrapper, where it would silently do nothing. That is one rule in `app/globals.css`, scoped with `:has()` so it only applies while the feed is mounted.
- The sticky header (`pets-header.tsx:130`, `sticky top-0 z-50`) really does overlap scrolled content, so cards need `scroll-margin-top`. Measured header height: `py-4` (32px) + a 56px-wide logo at the SVG's 332.83×352.62 ratio (≈59px tall) ≈ **91px**. `scroll-mt-24` (96px) clears it.

### F3. No webfont is loaded, so "Manrope" cannot be honoured

`app/layout.tsx` has no `next/font` import, `app/globals.css` has no `@font-face`, and there is no Google Fonts link anywhere. `--font-sans` (`globals.css:121`) names `Inter, Source Sans 3, Manrope, system-ui` but **none of those three are fetched** — every one is a hopeful local lookup that falls through to `system-ui` on most devices.

So the spec's "Pet name — Manrope 21px/800" is not implementable as written. Task 6 implements the **size, weight and tracking** (which is what carries the design) in the inherited stack, and does **not** invent a `font-manrope` utility that would resolve to nothing. Loading a real display face is a route-wide typography decision worth its own issue — flag it to the user, do not fold it in here.

### F4. Three existing test files assert through `PetGrid` and will break on the extraction

Budget for these in Task 2 — they are not optional cleanup:

| File | Tests | Why it breaks |
|---|---|---|
| `components/__tests__/pets/pet-grid-mobile-filters.test.tsx` | 11 | Renders `PetGrid` and drives the mobile popover, which moves out of it entirely. Becomes `pet-filters.test.tsx` in Task 1 and is deleted in Task 2. |
| `components/__tests__/design-structure.test.tsx` (7, 7b, 8) | 3 | Assert filter-pill classes and `aria-pressed` through `<PetGrid>`. Retarget to `<PetFilterBar>`. |
| `components/__tests__/pets/pet-grid-states.test.tsx` | 8 | Renders `PetGrid` with the filter props it will no longer accept, and asserts the empty state's clear button that `PetGrid` will no longer own the state for. Prop update. |
| `components/__tests__/pets/pet-grid-card.test.tsx` | 12 | Its `renderGrid` helper passes the six filter props too. At runtime they are harmlessly ignored, so `vitest` stays green and this looks safe — but `tsc --noEmit` raises TS2322 for excess props on `PetGridProps`, which fails the gate. Swap them for `hasActiveFilters` / `onClearFilters`; no assertion changes. |

`pet-grid-header.test.tsx` and `pets-page-retry.test.tsx` render `PetsPage` with `useMediaQuery` mocked to `true`, so they exercise the desktop branch and keep passing untouched — but see Task 8, which adds a mobile-mocked sibling.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `components/pets/pet-filters.tsx` | `PetFilterBar` — the desktop pill row and the mobile popover, both driven entirely by props. Owns `FilterKey`, `SourceFilter` and the `FILTERS` table. |
| `components/pets/pet-feed-card.tsx` | One post: publisher header, photo (or carousel), body, CTA. Knows nothing about scrolling. |
| `components/pets/pet-feed.tsx` | The feed: one width measurement, the position rail, loading/error/empty states, and the view metric. |
| `components/__tests__/pets/pet-filters.test.tsx` | The 11 popover behaviours retargeted off `PetGrid`, plus the pill-row assertions moved out of `design-structure.test.tsx`. |
| `components/__tests__/pets/pet-feed-card.test.tsx` | Photo branching, publisher branching, CTA by role, condition block. |
| `components/__tests__/pets/pet-feed.test.tsx` | States, rail thresholds, and that the card list is what the rail counts. |
| `components/__tests__/pets/pets-page-mobile.test.tsx` | The fork: mobile renders the feed and no drawer; desktop is unchanged. |

**Modified**

| File | Change |
|---|---|
| `components/pets/pets-page.tsx` | Owns all four filter dimensions + popover disclosure, derives the sorted/filtered list once, renders `PetFilterBar` above the fork, and forks grid vs feed behind a mounted flag. Drawer + its `PetDetail` removed. |
| `components/pets/pet-grid.tsx` | Loses the filter markup, `sourceFilter`, the sort, the dismiss effect and `clearFilters`. Becomes presentational. |
| `components/Carousel.tsx` | Two additive props (`dragDirectionLock`, `dotLabel`); dots become real buttons; the dot row sizes to its content. |
| `components/pets/pet-detail.tsx` | Passes `dotLabel` so the sheet's dots get the same accessible names. |
| `app/globals.css` | `--shadow-post` theme token; the `:has()`-scoped snap rule. |
| `public/locales/{es,en}/pets.json` | `feed.photo_position`, `feed.publisher_links`. |
| `components/__tests__/design-structure.test.tsx` | Tests 7, 7b, 8 retargeted to `PetFilterBar`. |
| `components/__tests__/pets/pet-grid-states.test.tsx` | Props updated for the presentational `PetGrid`. |

**Deleted**

| File | Why |
|---|---|
| `components/__tests__/pets/pet-grid-mobile-filters.test.tsx` | Its subject moves to `PetFilterBar`; the tests are recreated in `pet-filters.test.tsx` in Task 1, so this file is redundant by Task 2. |

---

## Task 1: Build `PetFilterBar` (nothing wired yet)

The mobile filter popover lives at `pet-grid.tsx:214-293` and `sourceFilter` is local state at `pet-grid.tsx:65`. Once mobile stops rendering `PetGrid` both are unreachable. Extract first, wire in Task 2 — that keeps the "does the extraction change behaviour?" question separate from the "does the lift change behaviour?" question.

**One deliberate API change.** `showMobileFilters` becomes a **controlled** prop pair. Today `clearFilters` closes the popover (`pet-grid.tsx:106`) from the same component that owns it; after the lift, the clear button lives in the grid/feed empty state while the popover lives here, on the other side of a component boundary. Controlled disclosure preserves that behaviour exactly. The tempting alternative — an effect that closes whenever the active-filter count hits zero — is wrong: it would also slam the popover shut when a user unchecks their last chip *inside* it, which is a regression today's code does not have.

**Files:**
- Create: `components/pets/pet-filters.tsx`
- Create: `components/__tests__/pets/pet-filters.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/pets/pet-filters.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetFilterBar } from '@/components/pets/pet-filters'

// Anchored, not exact: the trigger's accessible name picks up the active-filter
// badge count ("Filtros 1") as soon as anything is filtered.
const FILTERS = /^Filtros/
const SPECIES = 'Especie'

type Props = Partial<Parameters<typeof PetFilterBar>[0]>

/**
 * The bar's disclosure is controlled, so the harness owns the open state the
 * way `pets-page.tsx` will. `clearAll` stands in for the empty state's
 * "Limpiar filtros" button, which lives in a sibling component.
 */
function Harness({ overrides, onClear }: { overrides: Props; onClear?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <PetFilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        vaccinatedFilter={false}
        onVaccinatedChange={vi.fn()}
        castratedFilter={false}
        onCastratedChange={vi.fn()}
        sourceFilter="all"
        onSourceChange={vi.fn()}
        mobileFiltersOpen={open}
        onMobileFiltersOpenChange={setOpen}
        {...overrides}
      />
      <button onClick={() => { setOpen(false); onClear?.() }}>Limpiar filtros</button>
    </>
  )
}

function renderBar(overrides: Props = {}, onClear?: () => void) {
  return renderWithProviders(<Harness overrides={overrides} onClear={onClear} />)
}

function trigger() {
  return screen.getByRole('button', { name: FILTERS })
}

/** The popover is the only place "Especie" appears; walk up to its container. */
function popover() {
  return screen.getByText(SPECIES).closest('div.absolute') as HTMLElement
}

function openPopover() {
  fireEvent.click(trigger())
  expect(trigger()).toHaveAttribute('aria-expanded', 'true')
}

afterEach(() => vi.restoreAllMocks())

// The popover is hand-rolled rather than a Radix primitive, so none of the
// dismiss behaviour a user expects from a popover comes for free.
describe('PetFilterBar mobile popover', () => {
  it('opens from the trigger', () => {
    renderBar()

    expect(screen.queryByText(SPECIES)).toBeNull()
    openPopover()
    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  it('closes on a pointerdown outside it', () => {
    renderBar()
    openPopover()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByText(SPECIES)).toBeNull()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays open on a pointerdown inside it', () => {
    renderBar()
    openPopover()

    fireEvent.pointerDown(within(popover()).getByRole('button', { name: 'Perros' }))

    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  // The trigger sits inside the same ref'd wrapper as the popover, so its own
  // pointerdown must not close what its click is about to toggle — otherwise the
  // button would close and immediately reopen (or never close at all).
  it('still toggles closed from the trigger itself', () => {
    renderBar()
    openPopover()

    fireEvent.pointerDown(trigger())
    expect(screen.getByText(SPECIES)).toBeInTheDocument()

    fireEvent.click(trigger())
    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  it('closes on Escape', () => {
    renderBar()
    openPopover()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  it('ignores other keys', () => {
    renderBar()
    openPopover()

    fireEvent.keyDown(document, { key: 'Enter' })

    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  // The clear button now lives in a sibling (the grid's/feed's empty state), so
  // the close has to survive crossing a component boundary. That is the whole
  // reason the disclosure is controlled rather than local state.
  it('closes when a sibling clears every filter', () => {
    const onClear = vi.fn()
    renderBar({ activeFilter: 'dogs' }, onClear)
    openPopover()

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(onClear).toHaveBeenCalled()
    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  // The count badge is a bare <span> straight after the label with no text node
  // between them, so the accessible name runs the two together — "Filtros3".
  // `ml-1` is visual margin and does not enter the accname algorithm. Step 5
  // fixes that; this asserts the fixed behaviour, so it fails until then.
  it('counts every active dimension in the trigger badge', () => {
    renderBar({ activeFilter: 'dogs', vaccinatedFilter: true, sourceFilter: 'rc' })

    expect(trigger()).toHaveAccessibleName('Filtros 3')
  })
})

describe('PetFilterBar desktop pills', () => {
  it('fills the active pill and announces it as pressed', () => {
    const { container } = renderBar({ activeFilter: 'dogs' })

    const active = container.querySelector('.bg-pop-solid')
    expect(active).not.toBeNull()
    expect(active).toHaveAttribute('aria-pressed', 'true')
    expect(active!.textContent).toBeTruthy()
  })

  it('leaves inactive pills unfilled and unpressed', () => {
    const { container } = renderBar({ activeFilter: 'dogs' })

    const inactive = container.querySelectorAll('button.bg-background')
    expect(inactive.length).toBeGreaterThanOrEqual(5)
    expect(inactive[0]).toHaveAttribute('aria-pressed', 'false')
  })

  it('asks for coordinates before applying the nearby filter', () => {
    const onFilterChange = vi.fn()
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { latitude: 18.5, longitude: -69.9 } } as GeolocationPosition),
    )
    // Defined onto the real navigator rather than replacing it: jsdom keeps its
    // properties on the prototype, so `{...navigator}` would spread to `{}` and
    // take `userAgent` with it.
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })

    renderBar({ onFilterChange })
    fireEvent.click(screen.getByRole('button', { name: 'Cercanos' }))

    expect(onFilterChange).toHaveBeenCalledWith('nearby', {
      sort: 'proximity',
      lat: 18.5,
      lng: -69.9,
    })
  })
})

describe('PetFilterBar listeners', () => {
  function spyListeners() {
    const added: [string, EventListener][] = []
    const removed: [string, EventListener][] = []
    vi.spyOn(document, 'addEventListener').mockImplementation(((
      type: string,
      fn: EventListener,
      ...rest: unknown[]
    ) => {
      added.push([type, fn])
      return EventTarget.prototype.addEventListener.call(document, type, fn, ...(rest as []))
    }) as typeof document.addEventListener)
    vi.spyOn(document, 'removeEventListener').mockImplementation(((
      type: string,
      fn: EventListener,
      ...rest: unknown[]
    ) => {
      removed.push([type, fn])
      return EventTarget.prototype.removeEventListener.call(document, type, fn, ...(rest as []))
    }) as typeof document.removeEventListener)

    const only = (log: [string, EventListener][]) =>
      log.filter(([type]) => type === 'pointerdown' || type === 'keydown')

    return { ours: () => only(added), cleaned: () => only(removed) }
  }

  it('registers nothing while the popover is closed', () => {
    const log = spyListeners()

    renderBar()

    expect(log.ours()).toHaveLength(0)
  })

  it('removes both listeners when the popover closes', () => {
    const log = spyListeners()
    renderBar()

    openPopover()
    expect(log.ours().map(([type]) => type).sort()).toEqual(['keydown', 'pointerdown'])

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(log.cleaned()).toEqual(log.ours())
  })

  it('removes both listeners on unmount while still open', () => {
    const log = spyListeners()
    const { unmount } = renderBar()

    openPopover()
    unmount()

    expect(log.cleaned()).toEqual(log.ours())
  })

  // Belt and braces: a leaked handler would still be holding a stale setState.
  it('does not react to events fired after unmount', () => {
    const { unmount } = renderBar()
    openPopover()
    unmount()

    expect(() => {
      fireEvent.pointerDown(document.body)
      fireEvent.keyDown(document, { key: 'Escape' })
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-filters.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/pets/pet-filters"`.

- [ ] **Step 3: Create the component**

Create `components/pets/pet-filters.tsx`. The markup is lifted verbatim from `pet-grid.tsx` — desktop row from lines 154-212, mobile popover from lines 215-293 — so the only diff a reviewer should find is where the state comes from.

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaw,
  faDog,
  faCat,
  faMars,
  faVenus,
  faLocationDot,
  faSyringe,
  faScissors,
  faHouseChimney,
  faUser,
  faFilter,
} from '@fortawesome/free-solid-svg-icons'
// Aliased: `PetFilters` is the query-params type, and this file also exports a
// filter *component*. Naming them the same would make the import in
// `pets-page.tsx`, which needs both, unresolvable.
import { PetFilters as PetFilterParams } from '@/lib/api/pets-public'

export type FilterKey = 'all' | 'dogs' | 'cats' | 'males' | 'females' | 'nearby'
export type SourceFilter = 'all' | 'rc' | 'member'

const FILTERS: { key: FilterKey; icon: typeof faPaw; toParams: PetFilterParams }[] = [
  { key: 'all', icon: faPaw, toParams: {} },
  { key: 'dogs', icon: faDog, toParams: { species: 'dog' } },
  { key: 'cats', icon: faCat, toParams: { species: 'cat' } },
  { key: 'males', icon: faMars, toParams: { gender: 'male' } },
  { key: 'females', icon: faVenus, toParams: { gender: 'female' } },
  { key: 'nearby', icon: faLocationDot, toParams: { sort: 'proximity' } },
]

/**
 * Counts the dimensions the user has narrowed. Exported because the empty
 * state's "clear filters" escape hatch lives in the grid and the feed, which
 * need the same answer without duplicating the arithmetic.
 */
export function countActiveFilters(
  activeFilter: FilterKey,
  vaccinated: boolean,
  castrated: boolean,
  source: SourceFilter,
): number {
  return (
    (activeFilter !== 'all' ? 1 : 0) +
    (vaccinated ? 1 : 0) +
    (castrated ? 1 : 0) +
    (source !== 'all' ? 1 : 0)
  )
}

interface PetFilterBarProps {
  activeFilter: FilterKey
  onFilterChange: (filter: FilterKey, params: PetFilterParams) => void
  vaccinatedFilter: boolean
  onVaccinatedChange: (v: boolean) => void
  castratedFilter: boolean
  onCastratedChange: (v: boolean) => void
  sourceFilter: SourceFilter
  onSourceChange: (s: SourceFilter) => void
  /**
   * Controlled, not local: the empty state's "Limpiar filtros" button lives in
   * a sibling component and has to be able to close this popover.
   */
  mobileFiltersOpen: boolean
  onMobileFiltersOpenChange: (open: boolean) => void
}

export function PetFilterBar({
  activeFilter,
  onFilterChange,
  vaccinatedFilter,
  onVaccinatedChange,
  castratedFilter,
  onCastratedChange,
  sourceFilter,
  onSourceChange,
  mobileFiltersOpen,
  onMobileFiltersOpenChange,
}: PetFilterBarProps) {
  const { t } = useTranslation('pets')
  const mobileFiltersRef = useRef<HTMLDivElement>(null)

  // The mobile filter popover is hand-rolled (not Radix), so it needs its own
  // dismiss behaviour. The ref wraps the trigger *and* the popover, so a
  // pointerdown on the trigger is "inside" and the button's own click still
  // toggles normally.
  useEffect(() => {
    if (!mobileFiltersOpen) return

    const onPointerDown = (e: PointerEvent) => {
      if (!mobileFiltersRef.current?.contains(e.target as Node)) onMobileFiltersOpenChange(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileFiltersOpenChange(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileFiltersOpen, onMobileFiltersOpenChange])

  const mobileFilterCount = countActiveFilters(
    activeFilter,
    vaccinatedFilter,
    castratedFilter,
    sourceFilter,
  )

  const handleFilterClick = (f: (typeof FILTERS)[number]) => {
    if (f.key === 'nearby') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onFilterChange('nearby', {
            sort: 'proximity',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {
          // Fallback: request without coords
          onFilterChange('nearby', { sort: 'proximity' })
        }
      )
    } else {
      onFilterChange(f.key, f.toParams)
    }
  }

  return (
    <>
      {/* Filter pills — desktop: inline row */}
      <div className="hidden sm:flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterClick(f)}
            aria-pressed={activeFilter === f.key}
            className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${
              activeFilter === f.key
                ? 'bg-pop-solid border-pop-solid text-white'
                : 'bg-background border-input text-foreground hover:bg-secondary/80'
            }`}
          >
            <FontAwesomeIcon icon={f.icon} className="text-xs" />
            {t(`grid.${f.key}`)}
          </button>
        ))}
        <span aria-hidden="true" className="text-muted-foreground/30 mx-1 select-none">|</span>
        <button
          onClick={() => onVaccinatedChange(!vaccinatedFilter)}
          aria-pressed={vaccinatedFilter}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${
            vaccinatedFilter
              ? 'bg-pop-solid border-pop-solid text-white'
              : 'bg-background border-input text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faSyringe} className="text-xs" />
          {t('grid.vaccinated')}
        </button>
        <button
          onClick={() => onCastratedChange(!castratedFilter)}
          aria-pressed={castratedFilter}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${
            castratedFilter
              ? 'bg-pop-solid border-pop-solid text-white'
              : 'bg-background border-input text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faScissors} className="text-xs" />
          {t('grid.castrated')}
        </button>
        <span aria-hidden="true" className="text-muted-foreground/30 mx-1 select-none">|</span>
        <button
          onClick={() => onSourceChange(sourceFilter === 'rc' ? 'all' : 'rc')}
          aria-pressed={sourceFilter === 'rc'}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${sourceFilter === 'rc' ? 'bg-pop-solid border-pop-solid text-white' : 'bg-background border-input text-foreground hover:bg-secondary/80'}`}
        >
          <FontAwesomeIcon icon={faHouseChimney} className="text-xs" />
          {t('grid.centers')}
        </button>
        <button
          onClick={() => onSourceChange(sourceFilter === 'member' ? 'all' : 'member')}
          aria-pressed={sourceFilter === 'member'}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${sourceFilter === 'member' ? 'bg-pop-solid border-pop-solid text-white' : 'bg-background border-input text-foreground hover:bg-secondary/80'}`}
        >
          <FontAwesomeIcon icon={faUser} className="text-xs" />
          {t('grid.members')}
        </button>
      </div>

      {/* Filter button — mobile only */}
      <div ref={mobileFiltersRef} className="sm:hidden relative px-2 py-3 shrink-0">
        <button
          onClick={() => onMobileFiltersOpenChange(!mobileFiltersOpen)}
          aria-expanded={mobileFiltersOpen}
          className={`focus-ring relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${
            mobileFiltersOpen || mobileFilterCount > 0
              ? 'bg-pop-solid text-white'
              : 'bg-background text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faFilter} className="text-xs" />
          {t('grid.filters')}
          {mobileFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-white text-pop-solid text-[10px] font-bold flex items-center justify-center">
              {mobileFilterCount}
            </span>
          )}
        </button>

        {mobileFiltersOpen && (
          <div className="absolute z-20 top-full mt-1 left-2 right-2 rounded-2xl bg-card shadow-lg p-4 space-y-3">
            {/* Species */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.species')}</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.filter(f => f.key !== 'all' && f.key !== 'nearby').map(f => (
                  <button key={f.key} onClick={() => { handleFilterClick(f); }}
                    aria-pressed={activeFilter === f.key}
                    className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                      activeFilter === f.key ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                    }`}>
                    <FontAwesomeIcon icon={f.icon} className="text-xs" /> {t(`grid.${f.key}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Health */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.health')}</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => onVaccinatedChange(!vaccinatedFilter)}
                  aria-pressed={vaccinatedFilter}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    vaccinatedFilter ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faSyringe} className="text-xs" /> {t('grid.vaccinated')}
                </button>
                <button onClick={() => onCastratedChange(!castratedFilter)}
                  aria-pressed={castratedFilter}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    castratedFilter ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faScissors} className="text-xs" /> {t('grid.castrated')}
                </button>
              </div>
            </div>
            {/* Source */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.source')}</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => onSourceChange(sourceFilter === 'rc' ? 'all' : 'rc')}
                  aria-pressed={sourceFilter === 'rc'}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    sourceFilter === 'rc' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faHouseChimney} className="text-xs" /> {t('grid.centers')}
                </button>
                <button onClick={() => onSourceChange(sourceFilter === 'member' ? 'all' : 'member')}
                  aria-pressed={sourceFilter === 'member'}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    sourceFilter === 'member' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faUser} className="text-xs" /> {t('grid.members')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run the tests — 14 pass, 1 fails on purpose**

Run: `npx vitest run components/__tests__/pets/pet-filters.test.tsx`
Expected: **14 passed, 1 failed.** The failure is `counts every active dimension in the trigger badge`, reporting `Received: "Filtros3"`. That is not a transcription error — it is today's real behaviour, inherited byte-for-byte from `pet-grid.tsx:225-232`, and the next step is what fixes it.

- [ ] **Step 5: Give the count badge a space, in its own commit**

The extraction above is a pure move, and it stays that way — commit it first so a reviewer can diff it as one:

```bash
git add components/pets/pet-filters.tsx components/__tests__/pets/pet-filters.test.tsx
git commit -m "refactor(pets): extract the filter bar so the feed can reuse it"
```

Then fix the accessible name. In `components/pets/pet-filters.tsx`, in the mobile trigger, put a text node between the label and the badge:

```tsx
          <FontAwesomeIcon icon={faFilter} className="text-xs" />
          {t('grid.filters')}{' '}
          {mobileFilterCount > 0 && (
```

`ml-1` on the badge is visual margin; the accessible-name algorithm concatenates content and ignores CSS, so without an explicit text node a screen reader announces "Filtros3". The bug is pre-existing — the old `pet-grid-mobile-filters.test.tsx` only ever matched the anchored regex `/^Filtros/`, so nothing caught it.

Run: `npx vitest run components/__tests__/pets/pet-filters.test.tsx`
Expected: PASS — 15 tests.

- [ ] **Step 6: Confirm nothing else moved**

Run: `npx vitest run components/__tests__/pets components/__tests__/design-structure.test.tsx components/__tests__/design-system.test.ts`
Expected: only the pre-existing rule-10 failure (5 violations). `pet-grid.tsx` is untouched, so every grid test still passes.

- [ ] **Step 7: Commit the fix**

```bash
git add components/pets/pet-filters.tsx
git commit -m "fix(pets): put a space between the filter label and its count"
```

The same one-character bug still sits in `pet-grid.tsx:229`, where it is unreachable once Task 2 deletes that markup. Do not fix it there.

---

## Task 2: Lift the filter state to `pets-page.tsx` and make `PetGrid` presentational

`sourceFilter` is the blocker: it filters and sorts the list inside `PetGrid`, so the feed could never see the same list. Move the derivation up so both breakpoints share exactly one.

**Files:**
- Modify: `components/pets/pets-page.tsx`
- Modify: `components/pets/pet-grid.tsx`
- Modify: `components/__tests__/design-structure.test.tsx:96-132`
- Modify: `components/__tests__/pets/pet-grid-states.test.tsx`
- Delete: `components/__tests__/pets/pet-grid-mobile-filters.test.tsx`

- [ ] **Step 1: Update `pet-grid-states.test.tsx` for the new props**

`PetGrid` stops owning the filters, so its test harness stops passing them. Replace the `renderGrid` helper (currently at lines 24-46) with:

```tsx
function renderGrid(overrides: Props = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
  }
  const utils = renderWithProviders(
    <PetGrid
      pets={[]}
      loading={false}
      error={null}
      selectedId={null}
      hasActiveFilters={false}
      {...handlers}
      {...overrides}
    />
  )
  return { ...utils, ...handlers }
}
```

Then fix the call sites inside that file: any test that reached the clear-filters button by setting `activeFilter="dogs"` now sets `hasActiveFilters: true`, and any test asserting the clear click now asserts `onClearFilters` was called rather than that `onFilterChange` was called with `'all'`. Read each of the 8 tests and apply that mapping — the assertions themselves do not otherwise change.

- [ ] **Step 2: Retarget `design-structure.test.tsx` tests 7, 7b and 8**

Replace the `PetGrid` import (line 31) with `import { PetFilterBar } from '@/components/pets/pet-filters'` and replace the whole `describe('PetGrid', …)` block (lines 96-132) with:

```tsx
describe('PetFilterBar', () => {
  const defaultProps = {
    activeFilter: 'dogs' as const,
    onFilterChange: () => {},
    vaccinatedFilter: false,
    onVaccinatedChange: () => {},
    castratedFilter: false,
    onCastratedChange: () => {},
    sourceFilter: 'all' as const,
    onSourceChange: () => {},
    mobileFiltersOpen: false,
    onMobileFiltersOpenChange: () => {},
  }

  // These are design-system assertions, so they check classes on purpose — but
  // reach the element by role first. `container.querySelector('.bg-pop-solid')`
  // matches two nodes (the active pill *and* the mobile trigger, which also goes
  // solid once a filter is active) and picks the pill only because the desktop
  // row happens to render first.
  it('7 — active filter pill has bg-pop-solid class', () => {
    renderWithProviders(<PetFilterBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Perros' }).className).toContain('bg-pop-solid')
  })

  // The pressed state is announced from the same condition that picks the fill.
  // Asserting both together is what stops them silently drifting apart.
  it('7b — the active pill announces aria-pressed, inactive pills do not', () => {
    renderWithProviders(<PetFilterBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Perros' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Gatos' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('8 — inactive filter pills have bg-background class', () => {
    renderWithProviders(<PetFilterBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Gatos' }).className).toContain('bg-background')
  })
})
```

- [ ] **Step 3: Replace the one behaviour the deletion actually loses, then delete**

`pet-grid-mobile-filters.test.tsx`'s 11 behaviours were recreated against `PetFilterBar` in Task 1 — verify that first: `npx vitest run components/__tests__/pets/pet-filters.test.tsx` must be green.

But one of them does not survive the move intact. Its "closes when a filter chip clears every filter" test clicked the **real** clear-filters button and the **real** `clearFilters`; Task 1's version can only assert that the component honours a controlled prop, because the button now lives in a sibling. Task 2 is where the real path exists again, so add this to `components/__tests__/pets/pet-grid-header.test.tsx` (which already renders `PetsPage` with the desktop media query mocked) before deleting anything:

```tsx
  // The clear button lives in the grid's empty state and the popover lives in
  // the filter bar — two components either side of `pets-page`. This is the
  // only test that exercises the whole path rather than one half of it.
  it('clears every filter dimension from the empty state', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vacunado' }))
    expect(screen.getByRole('button', { name: 'Gatos' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(await screen.findByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByRole('button', { name: 'Gatos' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Vacunado' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
  })
```

That test needs `fireEvent` — add it to the `@testing-library/react` import at the top of the file. Then:

```bash
git rm components/__tests__/pets/pet-grid-mobile-filters.test.tsx
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run components/__tests__/pets/pet-grid-states.test.tsx components/__tests__/design-structure.test.tsx`
Expected: FAIL — `PetGrid` still renders the filter row it is about to lose, and still requires the props the harness stopped passing.

- [ ] **Step 5: Strip `pet-grid.tsx` down to the panel**

Replace everything from the imports through the closing brace with the presentational version. Removed: `useEffect`/`useRef`/`useState` (no local state left), the `FILTERS` table and `FilterKey` (now in `pet-filters.tsx`), the dismiss effect, `clearFilters`, `handleFilterClick`, the sort, the source filter, and both filter blocks.

```tsx
'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faEllipsis, faLink, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { Pet } from '@/lib/api/pets'
import { instagramUrl, ensureUrl } from '@/lib/utils'
import { formatAge } from '@/lib/utils/format-age'
import { ErrorState } from '@/components/ui/error-state'
import { VerifiedBadge } from './verified-badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface PetGridProps {
  /** Already sorted and source-filtered by `pets-page.tsx` — both breakpoints share one derivation. */
  pets: Pet[]
  loading: boolean
  error: string | null
  selectedId: string | null
  hasActiveFilters: boolean
  onSelect: (pet: Pet) => void
  onClearFilters: () => void
  onRetry: () => void
}

export function PetGrid({
  pets,
  loading,
  error,
  selectedId,
  hasActiveFilters,
  onSelect,
  onClearFilters,
  onRetry,
}: PetGridProps) {
  const { t } = useTranslation('pets')

  const handleShare = async (pet: Pet) => {
    if (!pet.short_slug) return
    const url = `${window.location.origin}/p?slug=${pet.short_slug}`
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url) } catch { /* fallback */ }
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4 sm:inset-shadow-2xl rounded-t-2xl sm:shadow-2xl bg-background">
        {/* KEEP the existing panel contents — today's lines 297-454 — in place.
            Do not retype them; edit them where they sit. See the three renames below. */}
      </div>
    </div>
  )
}
```

**Do not rewrite the panel body.** Lines 297-454 of the current file (the loading skeleton, the `ErrorState`, the empty state, and the whole card `map` with its badge, avatar and dropdown) stay byte-identical apart from these three renames, which exist only because the derivation moved upstream:

| Current | Becomes | Occurrences |
|---|---|---|
| `sourceFiltered.length` | `pets.length` | 2 (empty state, card list guard) |
| `sourceFiltered.map` | `pets.map` | 1 |
| `onClick={clearFilters}` | `onClick={onClearFilters}` | 1 (empty state button) |

If a fourth line changes, something has gone wrong — stop and re-read.

- [ ] **Step 6: Wire `pets-page.tsx`**

The page now owns every filter dimension, derives the list once, and renders `PetFilterBar` above the grid — where the filter row already rendered visually, since it was the first child of `PetGrid`'s flex column.

Replace the import at line 7 and add the new state and derivation:

```tsx
import { PetGrid } from './pet-grid'
import {
  PetFilterBar,
  countActiveFilters,
  type FilterKey,
  type SourceFilter,
} from './pet-filters'
```

Inside `PetsPage`, beside the existing `vaccinatedFilter`/`castratedFilter` state:

```tsx
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
```

Add the derivation and the clear handler after `handleSelect`:

```tsx
  // Centre-published pets first, then the source filter. Derived here rather
  // than in `PetGrid` so the feed sees exactly the same list at the other
  // breakpoint instead of a second, drifting copy of this logic.
  const sortedPets = [...pets].sort((a, b) => {
    const aIsRc = a.rescue_center ? 0 : 1
    const bIsRc = b.rescue_center ? 0 : 1
    return aIsRc - bIsRc
  })

  const visiblePets =
    sourceFilter === 'all'
      ? sortedPets
      : sourceFilter === 'rc'
        ? sortedPets.filter(p => p.rescue_center !== null && p.rescue_center !== undefined)
        : sortedPets.filter(p => !p.rescue_center)

  const hasActiveFilters =
    countActiveFilters({ activeFilter, vaccinatedFilter, castratedFilter, sourceFilter }) > 0

  // Step for step what `clearFilters` did inside the grid (pet-grid.tsx:101-107),
  // including going through `handleFilterChange` rather than `fetchPets` — that
  // is what also clears the selection.
  const handleClearFilters = useCallback(() => {
    setSourceFilter('all')
    setVaccinatedFilter(false)
    setCastratedFilter(false)
    handleFilterChange('all', {})
    setMobileFiltersOpen(false)
  }, [handleFilterChange])
```

Declare it **after** `handleFilterChange` (line 69) and `handleSelect` (line 94) — it closes over the first, and `const` bindings are not hoisted.

Then render the bar between the heading block (which ends at line 114) and `<PetGrid>`, and hand the grid its new props:

```tsx
        <PetFilterBar
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          vaccinatedFilter={vaccinatedFilter}
          onVaccinatedChange={handleVaccinatedToggle}
          castratedFilter={castratedFilter}
          onCastratedChange={handleCastratedToggle}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          mobileFiltersOpen={mobileFiltersOpen}
          onMobileFiltersOpenChange={setMobileFiltersOpen}
        />
        <PetGrid
          pets={visiblePets}
          loading={showSkeleton}
          error={error}
          selectedId={selected?.id ?? null}
          hasActiveFilters={hasActiveFilters}
          onSelect={handleSelect}
          onClearFilters={handleClearFilters}
          onRetry={handleRetry}
        />
```

Two details that are easy to get wrong here:

- **`onMobileFiltersOpenChange` gets the raw setter, never an inline lambda.** It is a dependency of the bar's dismiss effect, so a fresh identity on every render would tear down and re-add two document listeners on every fetch. `setMobileFiltersOpen` from `useState` is stable; anything else needs `useCallback`. Same goes for `onSourceChange`.
- **The count line at `pets-page.tsx:111-113` announces `pets.length`.** Change it to `visiblePets.length`. Today the announced count and the rendered count already disagree whenever the source filter is on, because the grid filtered after the page had counted. This lift is what makes fixing it free.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run components/__tests__/pets components/__tests__/design-structure.test.tsx`
Expected: PASS. `pet-grid-header.test.tsx` and `pets-page-retry.test.tsx` still pass untouched — they mock `useMediaQuery` to `true` and drive the desktop pills, which now come from `PetFilterBar` but render identically.

- [ ] **Step 8: Verify both breakpoints by eye**

At 1010px and at 375px, confirm: the filter row/button sits exactly where it did, the popover opens and dismisses, the source pills still filter, the empty state's clear button still resets everything **and** closes the popover, and the result count matches the number of cards with "Centros" active.

- [ ] **Step 9: Commit**

```bash
git add components/pets/pets-page.tsx components/pets/pet-grid.tsx \
  components/__tests__/design-structure.test.tsx \
  components/__tests__/pets/pet-grid-states.test.tsx \
  components/__tests__/pets/pet-grid-header.test.tsx \
  components/__tests__/pets/pet-grid-mobile-filters.test.tsx
git commit -m "refactor(pets): lift the filter state out of the grid"
```

---

## Task 3: Direction-lock the carousel drag

The spec calls this "the single biggest interaction risk in the design". `Carousel.tsx:293` is `drag={isAnimating ? false : 'x'}` with no lock, so inside a vertically-snapping feed a diagonal thumb drag gets captured horizontally and fights the page scroll. `dragDirectionLock` (confirmed in `node_modules/motion-dom/dist/index.d.ts`, default `false`) makes motion commit to the axis the gesture starts on and release the other one to the scroller.

Opt-in, because the other six call sites are not inside a vertical scroll container and their current feel must not change.

**Files:**
- Modify: `components/Carousel.tsx:21-39` (props), `:142-155` (signature), `:291-294` (track)

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/ui/carousel-drag-lock.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'

// The track is a `motion.div`; the prop we care about never reaches the DOM, so
// capture it at the motion boundary rather than querying rendered attributes.
const seen: Record<string, unknown>[] = []
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_t, tag: string) =>
        function Mock(props: Record<string, unknown>) {
          if ('drag' in props) seen.push(props)
          const { children, className } = props as { children?: React.ReactNode; className?: string }
          return <div className={className}>{children}</div>
        },
    }),
  }
})

import { renderWithProviders } from '../test-utils'
import Carousel from '@/components/Carousel'

const items = [
  { id: 1, title: '', description: '', icon: null as unknown as React.ReactNode, image: '/a.webp' },
  { id: 2, title: '', description: '', icon: null as unknown as React.ReactNode, image: '/b.webp' },
]

describe('Carousel drag direction lock', () => {
  it('is off by default, so the six existing call sites are unchanged', () => {
    seen.length = 0
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(seen[0].dragDirectionLock).toBe(false)
  })

  // Inside the feed's vertical scroll container an unlocked horizontal drag
  // captures diagonal gestures and fights the page scroll.
  it('is passed through to the track when the caller opts in', () => {
    seen.length = 0
    renderWithProviders(<Carousel items={items} baseWidth={300} dragDirectionLock />)

    expect(seen[0].dragDirectionLock).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/ui/carousel-drag-lock.test.tsx`
Expected: FAIL — TS/runtime error on the unknown `dragDirectionLock` prop, and `seen[0].dragDirectionLock` is `undefined`.

- [ ] **Step 3: Add the prop**

In `components/Carousel.tsx`, add to `CarouselProps` (after `flushItems` at line 38):

```tsx
  /**
   * Commits a drag to the axis it starts on. Opt-in: only matters inside a
   * vertical scroll container (the mobile feed), where an unlocked `drag="x"`
   * captures diagonal gestures that belong to the page scroll.
   */
  dragDirectionLock?: boolean;
```

Add to the destructured signature (after `flushItems = false,` at line 154):

```tsx
  dragDirectionLock = false,
```

And on the track (line 293, beside `drag`):

```tsx
        drag={isAnimating ? false : 'x'}
        dragDirectionLock={dragDirectionLock}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/ui/carousel-drag-lock.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Confirm the other call sites are untouched**

Run: `npx vitest run components/__tests__/ui components/__tests__/pets/pet-detail.test.tsx`
Expected: PASS, including the existing `carousel-flush-items.test.tsx`.

- [ ] **Step 6: Commit**

```bash
git add components/Carousel.tsx components/__tests__/ui/carousel-drag-lock.test.tsx
git commit -m "feat(carousel): let callers lock a drag to its starting axis"
```

---

## Task 4: Make the carousel dots real buttons

`Carousel.tsx:325-341` renders each dot as a `motion.div` with an `onClick` — no role, no keyboard access, and an 8×8px target. For a multi-photo pet that leaves swiping as the only usable path through the photos, failing both the touch-target minimum and keyboard access. The row is also fixed at `w-37.5`, which cramps at 5+ photos.

The accessible name has to come from the caller: `Carousel` is a generic component with no i18n today, and wiring `useTranslation` into it would give a UI primitive a hard dependency on the `pets` namespace.

**Files:**
- Modify: `components/Carousel.tsx:21-39` (props), `:142-155` (signature), `:322-344` (dots)
- Modify: `components/pets/pet-detail.tsx:50-62`
- Modify: `public/locales/es/pets.json`, `public/locales/en/pets.json`

- [ ] **Step 1: Add the locale keys**

In `public/locales/es/pets.json`, add a top-level `feed` block (alongside `detail`):

```json
  "feed": {
    "photo_position": "Foto {{n}} de {{total}}",
    "publisher_links": "Enlaces de {{name}}"
  },
```

In `public/locales/en/pets.json`:

```json
  "feed": {
    "photo_position": "Photo {{n}} of {{total}}",
    "publisher_links": "{{name}}'s links"
  },
```

Both keys are named by the spec (§10). `photo_position` is used by the sheet too — the name comes from where it was specified, not from the only place it is read.

- [ ] **Step 2: Write the failing test**

Create `components/__tests__/ui/carousel-dots.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Carousel from '@/components/Carousel'

const photo = (id: number) => ({
  id,
  title: '',
  description: '',
  icon: null as unknown as React.ReactNode,
  image: `/${id}.webp`,
})

const items = [photo(1), photo(2), photo(3)]

describe('Carousel dots', () => {
  it('exposes one button per item, not a click-only div', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    // 3 dots; the pause button is off by default.
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('falls back to a locale-free position when no label is given', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(screen.getByRole('button', { name: '2 / 3' })).toBeInTheDocument()
  })

  it('takes its accessible names from the caller', () => {
    renderWithProviders(
      <Carousel
        items={items}
        baseWidth={300}
        dotLabel={(n, total) => `Foto ${n} de ${total}`}
      />,
    )

    expect(screen.getByRole('button', { name: 'Foto 1 de 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto 3 de 3' })).toBeInTheDocument()
  })

  it('still moves the track when a dot is activated', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    const third = screen.getByRole('button', { name: '3 / 3' })
    fireEvent.click(third)

    expect(third).toHaveAttribute('aria-current', 'true')
  })

  // 8x8px is a quarter of the 44px minimum. The visual dot stays 8px; the
  // button's padding is what carries the target.
  it('gives each dot a 44px hit area', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(screen.getAllByRole('button')[0].className).toContain('h-11')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/ui/carousel-dots.test.tsx`
Expected: FAIL — `getAllByRole('button')` finds none; the dots are `div`s.

- [ ] **Step 4: Replace the dot row**

In `components/Carousel.tsx`, add to `CarouselProps`:

```tsx
  /**
   * Accessible name for dot `n` of `total` (1-based). Defaults to a locale-free
   * "n / total" — this is a UI primitive and must not depend on an i18n
   * namespace to be usable.
   */
  dotLabel?: (n: number, total: number) => string;
```

Add to the signature:

```tsx
  dotLabel,
```

Replace lines 322-344 with:

```tsx
      <div className={`flex w-full justify-center ${round || dotsOverlay ? 'absolute z-20 bottom-3 left-1/2 -translate-x-1/2' : ''}`}>
        {/* Sized to its content, not a fixed w-37.5, which cramped at 5+ photos. */}
        <div className={`flex items-center justify-center gap-1 ${dotsOverlay ? '' : 'mt-2'}`}>
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={dotLabel ? dotLabel(index + 1, items.length) : `${index + 1} / ${items.length}`}
              aria-current={activeIndex === index}
              onClick={() => setPosition(loop ? index + 1 : index)}
              // The visual dot stays 8px; the button's own box is the 44px target.
              className="focus-ring flex h-11 w-6 items-center justify-center"
            >
              <motion.span
                className={`block h-2 w-2 rounded-full transition-colors duration-150 ${
                  activeIndex === index
                    ? round || dotsOverlay
                      ? 'bg-background'
                      : 'bg-foreground'
                    : round || dotsOverlay
                      ? 'bg-background/50'
                      : 'bg-foreground/40'
                }`}
                animate={{ scale: activeIndex === index ? 1.2 : 1 }}
                transition={{ duration: 0.15 }}
              />
            </button>
          ))}
        </div>
      </div>
```

The row's vertical footprint grows from 8px to 44px. In the overlay configuration (`dotsOverlay`, which is what both the sheet and the feed use) the row is absolutely positioned, so it costs no layout height — but it now covers a 44px band at the bottom of the photo. That band was already inert overlay; nothing beneath it is interactive.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/ui/carousel-dots.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 6: Pass the label from the sheet**

In `components/pets/pet-detail.tsx`, `DetailCarousel` (lines 31-66) needs `t`. Add the hook and the prop:

```tsx
function DetailCarousel({ urls }: { urls: string[] }) {
  const { t } = useTranslation('pets')
  const containerRef = useRef<HTMLDivElement>(null)
```

and on the `<Carousel>` (after `flushItems`):

```tsx
          dotLabel={(n, total) => t('feed.photo_position', { n, total })}
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: baseline only — 1 failed file (design-system rule 10, 5 violations).

- [ ] **Step 8: Commit**

```bash
git add components/Carousel.tsx components/pets/pet-detail.tsx \
  public/locales/es/pets.json public/locales/en/pets.json \
  components/__tests__/ui/carousel-dots.test.tsx
git commit -m "fix(carousel): make the dots keyboard-reachable and 44px"
```

---

## Task 5: The post card

One pet, everything visible, no detail view behind it. The CTA logic mirrors `pet-detail.tsx:280-294` exactly and must not diverge — `Adoptar` for members, `Inicia sesión para adoptar` when logged out, **nothing** for `rescue_center` and `business` accounts.

Two things the spec's card anatomy needs that do not exist yet:

- **The shadow.** §4 asks for a three-layer soft shadow. Written inline it would be an unreadable arbitrary value; written as `style={{}}` it would break design-system rule 10. It goes in `@theme` as `--shadow-post`, which is how `--inset-shadow-decoration` (`globals.css:126`) already extends the theme.
- **The typeface.** See F3 — Manrope is not loaded, so the name uses the inherited stack at the specified size, weight and tracking.

**Files:**
- Create: `components/pets/pet-feed-card.tsx`
- Create: `components/__tests__/pets/pet-feed-card.test.tsx`
- Modify: `app/globals.css` (`@theme` block, after line 126)

- [ ] **Step 1: Add the shadow token**

In `app/globals.css`, inside the `@theme` block beside `--inset-shadow-decoration`:

```css
  /* Feed post card. Three layers so the card lifts off the muted page without a
     single hard edge — one contact shadow, one mid, one wide ambient. */
  --shadow-post: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.06), 0 12px 32px rgb(0 0 0 / 0.04);
```

That yields a `shadow-post` utility. `rgb(… / …)` is not a hex literal, so design-system rule 11 is unaffected — and the value lives in CSS, not in a `className`, either way.

- [ ] **Step 2: Write the failing test**

Create `components/__tests__/pets/pet-feed-card.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))

const mockUser = vi.fn(() => ({ user: null as null | { role: string }, loading: false }))
vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: () => mockUser() }))

import { renderWithProviders } from '../test-utils'
import { PetFeedCard } from '@/components/pets/pet-feed-card'

const photo = (id: string) => ({ id, url: `/${id}.webp`, position: 0 })

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
    photos: [photo('a')],
    conditions: [],
    condition_notes: null,
    vaccinated: true,
    castrated: false,
    size: 'medium',
    rescue_center: { id: 'rc1', name: 'Adoptame RD' },
    ...overrides,
  }) as never

describe('PetFeedCard photos', () => {
  // Every pet in the live catalogue has exactly one photo. Mounting a carousel
  // (and its drag/animation machinery) for a single image is pure cost.
  it('renders a plain image for a single photo', () => {
    const { container } = renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Foto 1 de/ })).toBeNull()
  })

  it('renders a carousel once there is more than one photo', () => {
    renderWithProviders(
      <PetFeedCard pet={pet({ photos: [photo('a'), photo('b')] })} photoWidth={351} />,
    )

    expect(screen.getByRole('button', { name: 'Foto 1 de 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto 2 de 2' })).toBeInTheDocument()
  })

  it('falls back to the paw placeholder with no photos', () => {
    const { container } = renderWithProviders(
      <PetFeedCard pet={pet({ photos: [] })} photoWidth={351} />,
    )

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  // The width is measured once by the feed. Rendering a carousel at width 0
  // would collapse the track, so the card waits rather than guessing.
  it('does not mount a carousel before the width is measured', () => {
    renderWithProviders(
      <PetFeedCard pet={pet({ photos: [photo('a'), photo('b')] })} photoWidth={0} />,
    )

    expect(screen.queryByRole('button', { name: /Foto/ })).toBeNull()
  })
})

describe('PetFeedCard publisher', () => {
  it('names the centre and marks it verified', () => {
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByText('Adoptame RD')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toBeInTheDocument()
  })

  it('makes the publisher row the tappable affordance when there are links', () => {
    renderWithProviders(
      <PetFeedCard
        pet={pet({ rescue_center: { id: 'rc1', name: 'Adoptame RD', website: 'adoptamerd.org' } })}
        photoWidth={351}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Enlaces de Adoptame RD' }),
    ).toBeInTheDocument()
  })

  // No links means nothing to open. A control that does nothing is worse than
  // plain text, and there is no `⋯` button on mobile to fall back to.
  it('renders plain text when the centre has no links', () => {
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.queryByRole('button', { name: /Enlaces de/ })).toBeNull()
  })

  // Member-published pets carry no author identity; a placeholder would invent one.
  it('omits the publisher row entirely when there is no centre', () => {
    renderWithProviders(<PetFeedCard pet={pet({ rescue_center: undefined })} photoWidth={351} />)

    expect(screen.queryByText('Adoptame RD')).toBeNull()
    expect(screen.queryByRole('img', { name: /verificado/ })).toBeNull()
  })
})

describe('PetFeedCard CTA', () => {
  it('invites a logged-out visitor to sign in', () => {
    mockUser.mockReturnValue({ user: null, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByRole('link', { name: 'Inicia sesión para adoptar' })).toHaveAttribute(
      'href',
      '/auth/login',
    )
  })

  it('offers Adoptar to a member', () => {
    mockUser.mockReturnValue({ user: { role: 'member' }, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByRole('button', { name: 'Adoptar' })).toBeInTheDocument()
  })

  it.each(['rescue_center', 'business'])('offers nothing to a %s account', (role) => {
    mockUser.mockReturnValue({ user: { role }, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.queryByRole('button', { name: 'Adoptar' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Inicia sesión/ })).toBeNull()
  })
})

describe('PetFeedCard facts', () => {
  it('states the facts as nouns so the copy never has to agree in gender', () => {
    mockUser.mockReturnValue({ user: null, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    // Whole-pill strings, not fragments: /No/ alone would also match
    // "No hay mascotas" and half the empty-state copy.
    expect(screen.getByText('Vacunas · Al día')).toBeInTheDocument()
    expect(screen.getByText('Castración · No')).toBeInTheDocument()
    expect(screen.getByText('Tamaño · Mediano')).toBeInTheDocument()
  })

  // `user_pets.size` is nullable (API migration 000039) while `pets.size` is NOT
  // NULL DEFAULT 'medium' (000016), so an absent size is reachable. Unguarded,
  // the pill would render the raw `size.undefined` key.
  it('drops the size pill when the pet has no size', () => {
    renderWithProviders(<PetFeedCard pet={pet({ size: undefined })} photoWidth={351} />)

    expect(screen.queryByText(/Tamaño/)).toBeNull()
  })

  it('surfaces the condition notes in their own block', () => {
    renderWithProviders(
      <PetFeedCard
        pet={pet({ conditions: ['sensory_blind'], condition_notes: 'Ciega del ojo izquierdo' })}
        photoWidth={351}
      />,
    )

    expect(screen.getByText('Condición especial')).toBeInTheDocument()
    expect(screen.getByText('Ciega del ojo izquierdo')).toBeInTheDocument()
  })
})

describe('PetFeedCard structure', () => {
  it('is an article labelled by the pet name', () => {
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByRole('article', { name: 'Abril' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-feed-card.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/pets/pet-feed-card"`.

- [ ] **Step 4: Create the card**

Create `components/pets/pet-feed-card.tsx`:

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faGlobe, faSyringe, faScissors, faRulerCombined } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { Pet } from '@/lib/api/pets'
import { instagramUrl, ensureUrl } from '@/lib/utils'
import { formatAge } from '@/lib/utils/format-age'
import { useAuth } from '@/lib/contexts/auth-context'
import { trackPetEvent } from '@/lib/api/metrics'
import Carousel from '@/components/Carousel'
import { VerifiedBadge } from './verified-badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface PetFeedCardProps {
  pet: Pet
  /**
   * Measured once by `PetFeed`, not per card. Zero means "not measured yet" —
   * a carousel rendered at width 0 collapses its track.
   */
  photoWidth: number
  /** Only the first card is eager; the rest lazy-load as the feed scrolls. */
  priority?: boolean
}

export function PetFeedCard({ pet, photoWidth, priority = false }: PetFeedCardProps) {
  const { t } = useTranslation('pets')
  const { user } = useAuth()

  const age = formatAge(pet.age)
  const rc = pet.rescue_center
  const hasLinks = Boolean(rc?.website || rc?.instagram)

  const handleAdopt = () => {
    trackPetEvent(pet.id, 'adopt_click')
    window.location.href = `/adopt?id=${pet.id}`
  }

  const publisher = rc && (
    <>
      {rc.avatar_url && (
        <Image
          src={rc.avatar_url}
          alt=""
          width={26}
          height={26}
          className="h-[26px] w-[26px] shrink-0 rounded-full object-cover"
        />
      )}
      <span className="truncate text-[13px] font-semibold">{rc.name}</span>
      <VerifiedBadge className="shrink-0 text-sm" />
    </>
  )

  const factPill = (icon: typeof faSyringe, label: string, value: string) => (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-pop-450/40 px-2.5 py-1 text-[11.5px] font-medium text-pop-800">
      <FontAwesomeIcon icon={icon} className="text-[10px]" />
      {label} · {value}
    </span>
  )

  return (
    <article
      aria-label={pet.name}
      className="snap-start scroll-mt-24 overflow-hidden rounded-2xl bg-card shadow-post"
    >
      {/* Publisher. The name is the affordance — there is no `⋯` button on
          mobile — so it is only a control when there is something to open. */}
      {rc &&
        (hasLinks ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('feed.publisher_links', { name: rc.name })}
                className="focus-ring flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                {publisher}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {rc.website && (
                <DropdownMenuItem onClick={() => window.open(ensureUrl(rc.website!), '_blank')}>
                  <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                  {t('card.visitWebsite', { name: rc.name })}
                </DropdownMenuItem>
              )}
              {rc.instagram && (
                <DropdownMenuItem onClick={() => window.open(instagramUrl(rc.instagram!), '_blank')}>
                  <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                  {t('card.visitInstagram', { name: rc.name })}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex min-h-11 items-center gap-2 px-3 py-2.5">{publisher}</div>
        ))}

      {/* Photo, flush to the card edges — the card's overflow-hidden clips it. */}
      <div className="relative aspect-square bg-secondary">
        {pet.photos.length > 1 && photoWidth > 0 ? (
          <Carousel
            items={pet.photos.map((p, i) => ({
              id: i,
              image: p.url,
              title: '',
              description: '',
              icon: null as unknown as React.ReactNode,
              alt: '',
            }))}
            baseWidth={photoWidth}
            containerPadding={0}
            loop
            dotsOverlay
            flushItems
            dragDirectionLock
            dotLabel={(n, total) => t('feed.photo_position', { n, total })}
            className="relative h-full w-full overflow-hidden"
          />
        ) : pet.photos.length === 1 ? (
          <Image
            src={pet.photos[0].url}
            alt=""
            fill
            sizes="100vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <FontAwesomeIcon icon={faPaw} className="text-4xl text-muted-foreground/30" />
          </span>
        )}
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-baseline justify-between gap-3">
          {/* 21px/800 with tight tracking. The spec names Manrope, but no
              webfont is loaded anywhere in the app (see the plan's F3), so the
              family would resolve to the same system stack as everything else —
              size, weight and tracking are what carry the design here. */}
          <h2 className="text-[21px] font-extrabold tracking-[-0.5px]">{pet.name}</h2>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t(`detail.${age.unit}`, { count: age.count })} · {t(`gender.${pet.gender}`)}
          </span>
        </div>

        {pet.description && (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">{pet.description}</p>
        )}

        {/* Nouns, not adjectives: the catalogue is mostly female and the existing
            adjective strings are masculine. Making the noun the subject sidesteps
            gender agreement instead of misgendering pets. */}
        <div className="flex flex-wrap gap-1.5">
          {factPill(
            faSyringe,
            t('detail.facts.vaccines'),
            pet.vaccinated ? t('detail.facts.up_to_date') : t('detail.facts.pending'),
          )}
          {factPill(
            faScissors,
            t('detail.facts.neutering'),
            pet.castrated ? t('detail.facts.yes') : t('detail.facts.no'),
          )}
          {pet.size && factPill(faRulerCombined, t('detail.facts.size'), t(`size.${pet.size}`))}
        </div>

        {pet.conditions?.length > 0 && (
          <div className="space-y-1 rounded-xl border border-warning/40 bg-warning-bg p-2.5">
            <p className="text-[13px] font-medium text-warning-foreground">
              {t('detail.specialCondition')}
            </p>
            {pet.condition_notes && (
              <p className="text-[13px] text-warning-foreground">{pet.condition_notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Mirrors pet-detail.tsx:280-294 exactly — rescue-centre and business
          accounts get no CTA at all, so the wrapper goes with it. */}
      {user && user.role !== 'rescue_center' && user.role !== 'business' ? (
        <div className="p-3 pt-0">
          <button
            onClick={handleAdopt}
            className="focus-ring min-h-11 w-full rounded-xl bg-pop-solid font-semibold text-white transition-[background-color,transform] hover:bg-pop-850 motion-safe:active:scale-[0.99]"
          >
            {t('detail.adopt')}
          </button>
        </div>
      ) : !user ? (
        <div className="p-3 pt-0">
          <Link
            href="/auth/login"
            className="focus-ring flex min-h-11 w-full items-center justify-center rounded-xl bg-secondary font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            {t('detail.login_prompt')}
          </Link>
        </div>
      ) : null}
    </article>
  )
}
```

`motion-safe:active:scale-[0.99]` is how §6's reduced-motion requirement is met — the press feedback simply is not emitted under `prefers-reduced-motion: reduce`, with no media query of our own.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pet-feed-card.test.tsx`
Expected: PASS — 17 tests (the `it.each` over the two CTA-less roles expands to two, and the unmeasured-width pair is two cases, not one).

- [ ] **Step 6: Check the design-system rules**

Run: `npx vitest run components/__tests__/design-system.test.ts`
Expected: still exactly the one rule-10 failure with 5 violations. The new file has no inline `style`, no `rounded-lg/md/sm`, no `w-`/`h-` on a `FontAwesomeIcon`, and no hex in a `className`.

- [ ] **Step 7: Commit**

```bash
git add components/pets/pet-feed-card.tsx components/__tests__/pets/pet-feed-card.test.tsx app/globals.css
git commit -m "feat(pets): add the mobile feed's post card"
```

---

## Task 6: The feed container, the rail, and the snap

Three things live here that deliberately do not live in the card: the single width measurement, the position rail, and the view metric.

**Why the width is measured here.** `DetailCarousel` (`pet-detail.tsx:43-45`) reads `offsetWidth` in a `useEffect([])` and never re-measures, so an orientation change leaves it stale — and 17 copies of that effect is waste. `PetFeed` measures its own list width once with a `ResizeObserver` and passes it down.

A passive `useEffect` is the right hook for it — do **not** reach for `useLayoutEffect`. The pre-measurement frame is not blank: `PetFeedCard` renders `photos[0]` as a plain `<Image>` whenever the width is still `0`, which is the same photo the carousel would open on, so the swap adds dots rather than replacing content. Blocking paint to avoid that would cost more than it buys.

**Why the snap type is in CSS.** See F2: the document is the scroll container on this route, so `scroll-snap-type` has to land on the root element. A `snap-y` class on a `PetFeed` wrapper would be silently inert.

**A decision the spec did not make: the view metric.** The sheet fires `trackPetEvent(pet.id, 'view')` on open (`pet-detail.tsx:77-79`). A feed has no "open", and firing on mount would post 17 views the instant the page loads — which would wreck the `metrics` tab's view counts and conversion rate for every centre. The rail's `IntersectionObserver` already knows which card owns the middle of the screen, so the view fires there instead, deduped per mount. That keeps "view" meaning roughly what it means on desktop. Flag it in review; it is the one behaviour in this plan the spec does not dictate.

**Files:**
- Create: `components/pets/pet-feed.tsx`
- Create: `components/__tests__/pets/pet-feed.test.tsx`
- Modify: `app/globals.css` (append a rule after the existing route-level blocks)

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/pets/pet-feed.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

import { renderWithProviders } from '../test-utils'
import { PetFeed } from '@/components/pets/pet-feed'

const pet = (id: string, name: string) =>
  ({
    id,
    rescue_center_id: 'rc1',
    name,
    description: '',
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
  }) as never

function renderFeed(overrides: Partial<Parameters<typeof PetFeed>[0]> = {}) {
  const handlers = { onClearFilters: vi.fn(), onRetry: vi.fn() }
  const utils = renderWithProviders(
    <PetFeed
      pets={[pet('1', 'Luna')]}
      loading={false}
      error={null}
      hasActiveFilters={false}
      {...handlers}
      {...overrides}
    />,
  )
  return { ...utils, ...handlers }
}

beforeEach(() => {
  // jsdom has neither; the feed must degrade to "no rail, unmeasured width"
  // rather than throw. Tests that need them stub them explicitly.
  vi.stubGlobal('ResizeObserver', undefined)
  vi.stubGlobal('IntersectionObserver', undefined)
})

describe('PetFeed states', () => {
  // The half card is what signals "there is more below", so it is not optional.
  it('shows one and a half skeleton cards while loading', () => {
    const { container } = renderFeed({ loading: true, pets: [] })

    expect(container.querySelectorAll('[data-feed-skeleton]')).toHaveLength(2)
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('shows the retryable error state', () => {
    const { onRetry } = renderFeed({ error: 'boom', pets: [] })

    expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar mascotas')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('offers the clear-filters escape hatch only when filters are active', () => {
    const { unmount } = renderFeed({ pets: [] })
    expect(screen.getByText('No hay mascotas disponibles')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
    unmount()

    const { onClearFilters } = renderFeed({ pets: [], hasActiveFilters: true })
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('renders one post per pet', () => {
    renderFeed({ pets: [pet('1', 'Luna'), pet('2', 'Rex')] })

    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('article', { name: 'Luna' })).toBeInTheDocument()
  })
})

describe('PetFeed position rail', () => {
  it('marks the feed for the root-level snap rule', () => {
    const { container } = renderFeed()

    expect(container.querySelector('[data-pet-feed]')).not.toBeNull()
  })

  it('draws one dash per pet and hides the rail from assistive tech', () => {
    const { container } = renderFeed({ pets: [pet('1', 'Luna'), pet('2', 'Rex')] })

    const rail = container.querySelector('[data-feed-rail]')!
    expect(rail).toHaveAttribute('aria-hidden', 'true')
    expect(rail.querySelectorAll('[data-feed-dash]')).toHaveLength(2)
  })

  // Past 30 the dashes stop being individually legible, so the rail degrades to
  // a counter rather than a smear.
  it('degrades to a counter above 30 pets', () => {
    const many = Array.from({ length: 31 }, (_, i) => pet(String(i), `Pet ${i}`))
    const { container } = renderFeed({ pets: many })

    expect(container.querySelectorAll('[data-feed-dash]')).toHaveLength(0)
    expect(screen.getByText('1/31')).toBeInTheDocument()
  })

  it('shows no rail for a single pet', () => {
    const { container } = renderFeed()

    expect(container.querySelector('[data-feed-rail]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pet-feed.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/pets/pet-feed"`.

- [ ] **Step 3: Create the feed**

Create `components/pets/pet-feed.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { trackPetEvent } from '@/lib/api/metrics'
import { ErrorState } from '@/components/ui/error-state'
import { PetFeedCard } from './pet-feed-card'

/** Past this many pets the dashes stop being individually legible. */
const MAX_RAIL_DASHES = 30

interface PetFeedProps {
  /** Already sorted and source-filtered by `pets-page.tsx`. */
  pets: Pet[]
  loading: boolean
  error: string | null
  hasActiveFilters: boolean
  onClearFilters: () => void
  onRetry: () => void
}

export function PetFeed({
  pets,
  loading,
  error,
  hasActiveFilters,
  onClearFilters,
  onRetry,
}: PetFeedProps) {
  const { t } = useTranslation('pets')
  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const viewed = useRef<Set<string>>(new Set())
  const [photoWidth, setPhotoWidth] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  // One measurement for the whole feed. The list element carries no padding of
  // its own, so its width *is* the card width — no arithmetic against gutters.
  useEffect(() => {
    const el = listRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setPhotoWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Drives the rail, and doubles as the view metric: a card that owns the middle
  // of the screen has genuinely been seen. Firing on mount instead would post a
  // view for every pet the moment the page loads.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]
    if (cards.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = cards.indexOf(entry.target as HTMLDivElement)
          if (index < 0) continue
          setActiveIndex(index)
          const id = pets[index]?.id
          if (id && !viewed.current.has(id)) {
            viewed.current.add(id)
            trackPetEvent(id, 'view')
          }
        }
      },
      // A band across the middle of the viewport: the rail should mark the card
      // that owns the centre of the screen, not whichever card has one pixel on it.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )

    cards.forEach((c) => observer.observe(c))
    return () => observer.disconnect()
  }, [pets])

  return (
    <div data-pet-feed className="flex-1 px-3 pb-20">
      {loading && (
        <div className="space-y-4">
          {/* One and a half: the clipped second card is what says "keep scrolling". */}
          <div data-feed-skeleton className="overflow-hidden rounded-2xl bg-card shadow-post">
            <div className="h-11 animate-pulse bg-muted/60" />
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-5 w-1/2 animate-pulse rounded-xl bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded-xl bg-muted" />
              <div className="h-11 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
          <div
            data-feed-skeleton
            className="h-44 overflow-hidden rounded-2xl bg-card shadow-post"
          >
            <div className="h-11 animate-pulse bg-muted/60" />
            <div className="aspect-square animate-pulse bg-muted" />
          </div>
        </div>
      )}

      {error && !loading && <ErrorState message={t('grid.error')} onRetry={onRetry} />}

      {!loading && !error && pets.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
          <FontAwesomeIcon icon={faPaw} className="text-4xl opacity-30" />
          <p className="text-sm">{t('grid.empty')}</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              {t('grid.clear_filters')}
            </button>
          )}
        </div>
      )}

      {!loading && !error && pets.length > 0 && (
        <div ref={listRef} className="space-y-4">
          {pets.map((pet, i) => (
            <div
              key={pet.id}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
            >
              <PetFeedCard pet={pet} photoWidth={photoWidth} priority={i === 0} />
            </div>
          ))}
        </div>
      )}

      {/* Position rail. `aria-hidden` on purpose: the live count line in
          pets-page.tsx already announces the total, and 17 dashes announced
          individually would be noise. */}
      {!loading && !error && pets.length > 1 && (
        <div
          data-feed-rail
          aria-hidden="true"
          className="pointer-events-none fixed right-1.5 top-1/2 z-30 -translate-y-1/2"
        >
          {pets.length <= MAX_RAIL_DASHES ? (
            <div className="flex flex-col items-center gap-1.5">
              {pets.map((pet, i) => (
                <span
                  key={pet.id}
                  data-feed-dash
                  className={`h-0.5 w-2 rounded-full transition-colors ${
                    i === activeIndex ? 'bg-pop-550' : 'bg-foreground/20'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="rounded-xl bg-foreground/10 px-1.5 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">
              {activeIndex + 1}/{pets.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add the snap rule**

Append to `app/globals.css` (below the existing utility blocks):

```css
/* /pets mobile feed. The document — not a nested element — is the scroll
   container on this route (`pet-grid`'s `overflow-y-auto` never engages under a
   `min-h-screen` ancestor), so the snap type has to live on the scroller
   itself. `:has()` scopes it to the frames where the feed is mounted, so no
   other route inherits snapping. `proximity`, not `mandatory`: mandatory fights
   the user on variable-height cards and can trap a slow scroll between two
   snap points. */
@media (max-width: 639px) {
  html:has([data-pet-feed]) {
    scroll-snap-type: y proximity;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pet-feed.test.tsx`
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add components/pets/pet-feed.tsx components/__tests__/pets/pet-feed.test.tsx app/globals.css
git commit -m "feat(pets): add the mobile feed container and position rail"
```

---

## Task 7: Fork the route

This is the only user-visible task. Below 640px `/pets` becomes the feed; the `Drawer` and its `PetDetail` instance leave the route entirely, because §5 makes the feed terminal.

**The hydration contract is the trap here.** `lib/hooks/use-media-query.ts` documents it explicitly: the prerendered HTML (`output: 'export'`) is always built with `false` because there is no `window` on the server, while the lazy initialiser lets the first *client* render be `true`. That is safe today only because both consumers pick between two portals that render nothing while closed. A grid-vs-feed fork emits **visible** markup for one value and not the other, which is exactly the case the contract says to gate behind a mounted flag.

The flag costs nothing visible here: `loading` starts `true` (`pets-page.tsx:23`) and the fetch is kicked off from an effect, so the first committed render is the skeleton either way. The swap happens under the skeleton, not under content.

**Files:**
- Modify: `components/pets/pets-page.tsx`
- Create: `components/__tests__/pets/pets-page-mobile.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/pets/pets-page-mobile.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))
vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))
vi.mock('@/lib/hooks/use-media-query', () => ({ useMediaQuery: () => false }))
vi.mock('@/components/transitions/route-transition-context', () => ({
  useRouteTransition: () => ({ status: 'idle', type: null }),
}))

import { renderWithProviders } from '../test-utils'
import { PetsPage } from '@/components/pets/pets-page'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

const pet = (id: string, name: string) =>
  ({
    id,
    name,
    age: 24,
    gender: 'female',
    species: 'dog',
    photos: [],
    conditions: [],
    vaccinated: true,
    castrated: true,
    size: 'medium',
    rescue_center: { id: 'rc1', name: 'Adoptame RD' },
  }) as never

beforeEach(() => vi.clearAllMocks())

describe('PetsPage below 640px', () => {
  it('renders the feed, one post per pet', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna'), pet('2', 'Rex')], error: null })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByRole('article', { name: 'Luna' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Rex' })).toBeInTheDocument()
  })

  // The feed is terminal — the card already shows everything, so there is no
  // detail surface left on this breakpoint.
  it('has no drawer to open', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('article', { name: 'Luna' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('still filters from the mobile popover', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('article', { name: 'Luna' })

    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }))

    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ species: 'cat' }))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/pets-page-mobile.test.tsx`
Expected: FAIL — no `article` roles; mobile still renders `PetGrid`.

- [ ] **Step 3: Fork the page**

In `components/pets/pets-page.tsx`:

Drop the `Drawer` import (line 12) and add the feed:

```tsx
import { PetFeed } from './pet-feed'
```

Replace the `useSheet` line (line 30) with:

```tsx
  const isDesktop = useMediaQuery('(min-width: 640px)')
  // The prerendered HTML is always built with the desktop branch — there is no
  // `window` on the server — so the feed must not appear until after hydration.
  // See the HYDRATION CONTRACT in `lib/hooks/use-media-query.ts`: this is the
  // first consumer that renders *visible* markup for one value and not the
  // other. The swap is invisible in practice because `loading` starts true and
  // the fetch runs from an effect, so the first paint is a skeleton either way.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const showFeed = mounted && !isDesktop
```

Replace the `<PetGrid …>` element with the fork:

```tsx
        {showFeed ? (
          <PetFeed
            pets={visiblePets}
            loading={showSkeleton}
            error={error}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onRetry={handleRetry}
          />
        ) : (
          <PetGrid
            pets={visiblePets}
            loading={showSkeleton}
            error={error}
            selectedId={selected?.id ?? null}
            hasActiveFilters={hasActiveFilters}
            onSelect={handleSelect}
            onClearFilters={handleClearFilters}
            onRetry={handleRetry}
          />
        )}
```

Replace the whole Sheet/Drawer ternary (lines 131-150) with the Sheet alone:

```tsx
      {/* Desktop: Sheet from right. The mobile Drawer is gone — the feed is
          terminal, so below 640px there is nothing left to open. `initialSelected`
          (the /p?slug= deep link) therefore only opens on desktop; that route
          resolves nothing today anyway, because `short_slug` does not exist in
          the API. */}
      {isDesktop && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="p-0 overflow-y-auto">
            <SheetTitle className="sr-only">{selected?.name ?? ''}</SheetTitle>
            <SheetDescription className="sr-only">{selected?.description ?? ''}</SheetDescription>
            {selected && <PetDetail pet={selected} />}
          </SheetContent>
        </Sheet>
      )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/pets-page-mobile.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Confirm desktop is untouched**

Run: `npx vitest run components/__tests__/pets`
Expected: PASS. `pet-grid-header.test.tsx` and `pets-page-retry.test.tsx` mock the media query to `true`, so they take the grid branch exactly as before.

- [ ] **Step 6: Commit**

```bash
git add components/pets/pets-page.tsx components/__tests__/pets/pets-page-mobile.test.tsx
git commit -m "feat(pets): serve the post feed below 640px"
```

---

## Task 8: Verification sweep and docs

- [ ] **Step 1: Full suite**

```bash
npx vitest run
npx tsc --noEmit
```
Expected: **only** the baseline failures — design-system rule 10 with exactly 5 violations, the 14 gsap teardown errors, and the 2 `transition-link.test.tsx` TS2345 errors. Anything else is yours.

- [ ] **Step 2: Ask the user to rebuild the container**

Port 3000 serves a Docker production build, and CORS blocks API data from any other port, so that container is the only local setup where the built change and real API data coexist. `pelurd.com` only ever shows deployed code. Ask the user to rebuild before driving the browser — do not skip to "looks right in tests".

- [ ] **Step 3: Drive `localhost:3000` at 375px**

Check, in order:
1. The feed renders one post per pet, publisher header first, photo flush to the card edges.
2. Scrolling snaps softly — cards settle, but a slow scroll is never trapped between two.
3. The rail tracks the centred card and the dash moves as you scroll.
4. Filters still open, apply and clear; the count line matches the number of posts.
5. The last card clears the fixed bottom nav (`public-mobile-nav.tsx`, `h-14`).
6. The publisher row opens the dropdown for a centre with links, and is inert text for one without.
7. At 640px and above, the grid and sheet are exactly as they were.

- [ ] **Step 4: Exercise the carousel at all**

Every pet in the live catalogue has exactly one photo, so **no carousel mounts by default**. Add 2-3 photos to an existing AdoptameRD pet from the RC dashboard (`POST /api/v1/pets/{id}/photos`) to see it. Publishing a pet as a *member* will not work — member pets are a separate domain with no public endpoint (spec §9.1).

Then verify the interaction that this design's biggest risk lives in: **a diagonal thumb drag on a multi-photo card must scroll the feed, not fight it.** Use touch emulation or a real device — a mouse drag does not reproduce it.

- [ ] **Step 5: Update the docs**

In `CLAUDE.md`, line 222 currently reads:

```
- `/pets` — public pet discovery grid — in `app/(public)/`
```

Replace with:

```
- `/pets` — public pet discovery — in `app/(public)/`. Two shapes behind one
  breakpoint fork in `pets-page.tsx`: a grid + detail Sheet at ≥640px, and a
  terminal post feed (`pet-feed.tsx`) below it, where the card shows everything
  and there is no detail view. Filter state lives in `pets-page.tsx` and the
  filter UI in `pet-filters.tsx`; both shapes render the same derived list.
```

Then mark the spec done — add to the header of `docs/superpowers/specs/2026-07-30-pets-mobile-feed-design.md`:

```markdown
**Status:** Implemented 2026-07-30 — see `docs/superpowers/plans/2026-07-30-pets-mobile-feed.md`
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-07-30-pets-mobile-feed-design.md
git commit -m "docs: record the /pets mobile feed"
```

---

## Out of Scope — deliberately not fixed here

Carried from spec §9, plus what this plan found. None of these are bugs introduced by this work.

1. **A member cannot publish an adoptable pet.** Member pets are a separate domain (`lib/api/user-pets.ts` → `/api/v1/user-pets` → `internal/userpets`) whose router applies `auth.RequireAuth` to every route, so there is no public endpoint. Consequences: the **"Miembros" filter never matches anything**, and the no-publisher branch in the card is unreachable in production. Making independent publishing real is a cross-repo product feature and needs its own spec.
2. **`short_slug` does not exist in the API** — no field, no column, no route. So there is no share affordance on mobile, and the grid's "Compartir enlace" item and `/p?slug=` are dead on desktop too. Worth its own issue; the user wants sharing to work.
3. **No webfont is loaded** (F3). Every family in `--font-sans` is a hopeful local lookup. Loading a real display face is a route-wide typography decision, not a mobile-feed decision.
4. **Windowing.** 17 cards is nowhere near needing it. Revisit past ~100 pets.
5. **`html.scroll-smooth`** (`app/layout.tsx:25`) is global and not `motion-safe`-gated. Pre-existing, and out of scope.

---

## Risks

- **Horizontal drag inside a vertical scroll is the main interaction risk.** `dragDirectionLock` (Task 3) is the mitigation and it needs real-device confirmation — Task 8 Step 4, not a mouse.
- **`Carousel` has 6 call sites** (`add-pet-modal`, `pets-tab`, `business-wizard`, `rescue-center-wizard`, `pet-detail`, `user-pet-card`); the feed is the seventh. Both new props default to today's behaviour, but the dot markup change in Task 4 is **not** opt-in — it lands on all seven. That is intentional (an 8px click-only `div` fails the touch-target and keyboard minimums everywhere), but it is the one change in this plan that alters an untouched screen. Re-check the onboarding wizards' carousels after Task 4.
- **The filter extraction touches desktop code in service of a mobile change.** Tasks 1 and 2 are the largest regression surface in the plan, and they change three existing test files. Verify both breakpoints at the end of Task 2, before any feed code exists to blame.
- **The feed's value depends on photo quality and quantity.** With one square photo per pet and a 69-character longest description, the format is carrying a catalogue thinner than it assumes. That is a content problem the code cannot fix.
