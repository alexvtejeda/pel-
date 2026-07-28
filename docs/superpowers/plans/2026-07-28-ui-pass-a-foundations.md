# UI Improvement Pass — Plan A: Cross-Cutting Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared primitives, tokens, and conventions that every route section of `docs/superpowers/specs/2026-07-28-ui-improvement-pass-design.md` §4–§11 depends on — so the route plans (B and C) only wire things up instead of inventing them.

**Architecture:** Everything here is additive-then-migrate. New primitives land in `components/ui/` (already exempt from the inline-SVG / inline-style lint rules in `design-system.test.ts`), new semantic colors land in `app/globals.css` `@theme` + `:root`/`.dark`, and a new `focus-ring` Tailwind v4 `@utility` gives one greppable class for the focus recipe. Migrations of existing components are deliberately **scoped to the in-scope routes only** — the dashboards, onboarding wizards, and auth login/register pages keep their current colors because the spec says do not touch them.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4.2 (no `tailwind.config.ts`; theme lives in `app/globals.css`) · react-i18next with bundled resources · Vitest + React Testing Library (`npx vitest run`, there is no `test` npm script) · Bun for install/dev.

**Spec:** `docs/superpowers/specs/2026-07-28-ui-improvement-pass-design.md` §3 (all subsections) + §12 execution notes.

---

## Before you start

- Assume `bun run dev` is **already running** on port 3000. Do not start it.
- The real local API port is **2701** (`.env.local` → `NEXT_PUBLIC_API_URL`). The `8080` fallback in code is stale.
- Run tests with `npx vitest run`. Run a specific file with `npx vitest run path/to/file.test.ts`.
- House rules enforced by `components/__tests__/design-system.test.ts`: cards `rounded-2xl`, buttons `rounded-xl`, Font Awesome only (no lucide/inline SVG) **outside** `components/ui/`, no `text-gray-*`/`bg-gray-*`, no hex colors in `className`, no inline `style={{}}` outside the allowlist.
- Commit after every task. Branch: `git checkout -b feat/ui-pass-foundations` before Task 1.

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `lib/utils/format-age.ts` | Pure months→`{count, unit}` normalizer. No React, no i18n. |
| `lib/utils/__tests__/format-age.test.ts` | Unit tests for the above. |
| `lib/i18n/language.ts` | Language resolution + `localStorage` persistence. No React. |
| `lib/i18n/__tests__/language.test.ts` | Unit tests for resolution order. |
| `components/ui/spinner.tsx` | The single inline/in-component spinner (tier 3 of §3.2). |
| `components/ui/pelu-loading-logo.tsx` | The assembling-paw full-page loader (tier 1 of §3.2). |
| `components/ui/pelu-loading-logo.module.css` | Scoped keyframes for the above — must not leak `[data-assemble]` globally. |
| `components/ui/error-state.tsx` | Shared "error ≠ empty" surface: icon + message + retry button. |
| `components/language-switcher.tsx` | ES/EN toggle for header + footer. |
| `components/language-preference-sync.tsx` | Applies the auth user's `preferred_lang` when no explicit choice is stored. |
| `components/__tests__/ui/pelu-loading-logo.test.tsx` | Render test: 7 paths, `role="img"`, accessible name. |
| `components/__tests__/ui/error-state.test.tsx` | Render test: message shown, retry fires callback. |
| `components/__tests__/language-switcher.test.tsx` | Render test: `aria-current`, changes language, persists. |

**Modified:**

| Path | Change |
| --- | --- |
| `components/ui/button.tsx:8` | `rounded-md` → `rounded-xl` |
| `components/ui/card.tsx:12` | `rounded-xl` → `rounded-2xl` |
| `components/ui/alert-dialog.tsx:39` | `sm:rounded-lg` → `sm:rounded-2xl` |
| `app/globals.css` | `focus-ring` utility, `--color-pop-solid`, success/warning tokens, reduced-motion marquee guard |
| `components/i18n-provider.tsx` | Drop the `navigator.language` sniff |
| `app/layout.tsx` | Mount `<LanguagePreferenceSync />` inside `AuthProvider` |
| `components/pets/pets-header.tsx` | Language switcher, `ROLE_LABELS` → i18n, `pop-solid` |
| `components/footer.tsx` | Language switcher, `Legal` → i18n, bottom-nav clearance |
| `components/auth/protected-route.tsx` | `PeluLoadingLogo`, i18n breadcrumbs |
| `components/pets/user-pet-card.tsx` | Age formatter, success token, photo `aria-label` scaffolding |
| `components/pets/pet-detail.tsx` | Age formatter, warning tokens, `Website`/`Instagram` i18n |
| `components/pets/pet-grid.tsx` | `pop-solid`, warning tokens, `aria-pressed`, `focus-ring` |
| `components/chat/*.tsx` | `pop-solid`, `focus-ring`, `aria-label` |
| `components/forms/form-renderer.tsx` | `pop-solid` |
| `components/landing/*.tsx` | `pop-solid`, reduced motion, alt-text i18n |
| `components/providers/provider-card.tsx`, `components/aliados/provider-detail.tsx` | success tokens, gradient syntax |
| `app/servicios/page.tsx` | success/warning tokens |
| `components/adopt/adopt-pet-page.tsx` | warning tokens |
| `lib/api/mfa.ts` | Spanish literal fallbacks → translation keys |
| `public/locales/{es,en}/{common,pets,landing,auth,business}.json` | New keys (ES first, then EN) |
| `components/__tests__/design-system.test.ts` | New guard tests for primitives + scoped color rules |
| `components/__tests__/design-structure.test.tsx` | Update pill assertions for `pop-solid` |
| `components/__tests__/pets/user-pet-card.test.tsx` | Update age assertion |

---

## Task 1: Shared age formatter (spec §3.8)

Fixes the "72 Months" bug at its root. `UserPet.age` is **always stored in months** (`components/pets/member-add-pet-modal.tsx:120` converts years→months before save), so the display layer is the only thing that needs to change.

**Files:**
- Create: `lib/utils/format-age.ts`
- Create: `lib/utils/__tests__/format-age.test.ts`
- Modify: `public/locales/es/pets.json`, `public/locales/en/pets.json`
- Modify: `components/pets/user-pet-card.tsx:61,82`
- Modify: `components/pets/pet-detail.tsx:129-132`
- Modify: `components/__tests__/pets/user-pet-card.test.tsx:9-13`

- [ ] **Step 1: Write the failing test**

Create `lib/utils/__tests__/format-age.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatAge } from '@/lib/utils/format-age'

describe('formatAge', () => {
  it('returns months below one year', () => {
    expect(formatAge(6)).toEqual({ count: 6, unit: 'months' })
    expect(formatAge(11)).toEqual({ count: 11, unit: 'months' })
  })

  it('returns whole years from twelve months up', () => {
    expect(formatAge(12)).toEqual({ count: 1, unit: 'years' })
    expect(formatAge(23)).toEqual({ count: 1, unit: 'years' })
    expect(formatAge(72)).toEqual({ count: 6, unit: 'years' })
  })

  it('floors fractional months', () => {
    expect(formatAge(6.9)).toEqual({ count: 6, unit: 'months' })
  })

  it('clamps invalid input to zero months', () => {
    expect(formatAge(-3)).toEqual({ count: 0, unit: 'months' })
    expect(formatAge(Number.NaN)).toEqual({ count: 0, unit: 'months' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/__tests__/format-age.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/utils/format-age"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/utils/format-age.ts`:

```ts
export type AgeUnit = 'months' | 'years'

export interface FormattedAge {
  count: number
  unit: AgeUnit
}

/**
 * Normalizes an age expressed in months into the unit a human would say it in.
 * 72 months reads as "6 años", not "72 Meses".
 */
export function formatAge(months: number): FormattedAge {
  if (!Number.isFinite(months) || months < 0) return { count: 0, unit: 'months' }
  if (months >= 12) return { count: Math.floor(months / 12), unit: 'years' }
  return { count: Math.floor(months), unit: 'months' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/__tests__/format-age.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Add the plural month keys (Spanish first)**

`public/locales/es/pets.json` — inside the existing `"detail"` object, right after `"years_other"`:

```json
    "months_one": "{{count}} mes",
    "months_other": "{{count}} meses",
```

`public/locales/en/pets.json` — inside its `"detail"` object, same position:

```json
    "months_one": "{{count}} month",
    "months_other": "{{count}} months",
```

No `lib/i18n/index.ts` change is needed — `pets.json` is already imported and registered.

- [ ] **Step 6: Update the UserPetCard test to the new expectation**

Replace lines 7–18 of `components/__tests__/pets/user-pet-card.test.tsx` (the first `it` block) with:

```tsx
  it('renders name, age and size', () => {
    renderWithProviders(
      <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={[]} size="small" />
    )
    expect(screen.getByText('Luna')).toBeInTheDocument()
    // 6 months stays in months
    expect(screen.getByText('6 meses')).toBeInTheDocument()
    // size "small" → localized "Pequeño"
    expect(screen.getByText('Pequeño')).toBeInTheDocument()
  })

  it('renders an age of 72 months as 6 years', () => {
    renderWithProviders(
      <UserPetCard name="Kira" age={72} gender="female" species="dog" photoUrls={[]} />
    )
    expect(screen.getByText('6 años')).toBeInTheDocument()
  })

  it('respects a user-chosen years unit without re-converting', () => {
    renderWithProviders(
      <UserPetCard name="Rex" age={6} ageUnit="years" gender="male" species="dog" photoUrls={[]} />
    )
    expect(screen.getByText('6 años')).toBeInTheDocument()
  })
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/pets/user-pet-card.test.tsx`
Expected: FAIL — the card still renders `6 Meses` / `72 Meses`.

- [ ] **Step 8: Wire the formatter into UserPetCard**

In `components/pets/user-pet-card.tsx`, add the import next to the existing ones:

```tsx
import { formatAge } from '@/lib/utils/format-age'
```

Replace line 61 (`const ageText = ...`) with:

```tsx
  // The live preview inside MemberAddPetModal passes the raw typed string plus the
  // unit the user picked, so parse defensively and only convert months→years.
  const parsed = age === '' || age === null || age === undefined ? Number.NaN : Number(age)
  const displayAge = !Number.isFinite(parsed)
    ? null
    : ageUnit === 'years'
      ? { count: Math.floor(parsed), unit: 'years' as const }
      : formatAge(parsed)
```

Replace lines 81–87 (the `<span className="text-xs text-muted-foreground ...">` block) with:

```tsx
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {displayAge && <span>{t(`detail.${displayAge.unit}`, { count: displayAge.count })}</span>}
          {displayAge && <span aria-hidden="true">·</span>}
          <FontAwesomeIcon icon={gender === 'male' ? faMars : faVenus} className="text-xs" />
          <span aria-hidden="true">·</span>
          <FontAwesomeIcon icon={species === 'dog' ? faDog : faCat} className="text-xs" />
        </span>
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/pets/user-pet-card.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 10: DRY the same logic into pet-detail**

In `components/pets/pet-detail.tsx`, add the import:

```tsx
import { formatAge } from '@/lib/utils/format-age'
```

Replace lines 129–132 (the inline ternary inside the age chip) with:

```tsx
            {(() => {
              const { count, unit } = formatAge(pet.age)
              return t(`detail.${unit}`, { count })
            })()}
```

- [ ] **Step 11: Run the full suite**

Run: `npx vitest run`
Expected: PASS — no new failures.

- [ ] **Step 12: Commit**

```bash
git add lib/utils/format-age.ts lib/utils/__tests__/format-age.test.ts \
  components/pets/user-pet-card.tsx components/pets/pet-detail.tsx \
  components/__tests__/pets/user-pet-card.test.tsx \
  public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(pets): render ages in years past 12 months

72 months now reads as '6 años' instead of '72 Meses'. Adds a shared
formatAge() helper and detail.months plural keys in both locales."
```

---

## Task 2: UI primitive radii (spec §3.1, Q4 approved)

Root cause of most radius violations across the app. Restyling the deferred dashboards through the shared primitives is explicitly accepted and desired (spec §2 Q4).

**Files:**
- Modify: `components/ui/button.tsx:8`
- Modify: `components/ui/card.tsx:12`
- Modify: `components/ui/alert-dialog.tsx:39`
- Modify: `components/__tests__/design-system.test.ts`

- [ ] **Step 1: Write the failing guard tests**

Append this block to the end of `components/__tests__/design-system.test.ts`:

```ts
// ─── UI Primitive Radii ──────────────────────────────────────
// components/ui/ is exempt from the generic radius rules above (shadcn ships
// rounded-md/lg defaults), so these three primitives are pinned explicitly —
// they are the root cause of most radius drift in feature code.

describe('UI Primitive Radii', () => {
  const readUi = (file: string) =>
    fs.readFileSync(path.join(COMPONENTS_DIR, 'ui', file), 'utf-8')

  it('16 — Button base variant uses rounded-xl, not rounded-md', () => {
    const content = readUi('button.tsx')
    expect(content).toContain('rounded-xl')
    expect(content).not.toMatch(/\brounded-md\b/)
  })

  it('17 — Card uses rounded-2xl', () => {
    const content = readUi('card.tsx')
    expect(content).toMatch(/"rounded-2xl border bg-card/)
  })

  it('18 — AlertDialogContent uses sm:rounded-2xl', () => {
    const content = readUi('alert-dialog.tsx')
    expect(content).toContain('sm:rounded-2xl')
    expect(content).not.toContain('sm:rounded-lg')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/__tests__/design-system.test.ts`
Expected: FAIL — tests 16, 17 and 18 all fail.

- [ ] **Step 3: Fix the three primitives**

`components/ui/button.tsx` line 8 — in the `cva` base string, change `rounded-md` to `rounded-xl`:

```tsx
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
```

`components/ui/card.tsx` line 12:

```tsx
      "rounded-2xl border bg-card text-card-foreground shadow",
```

`components/ui/alert-dialog.tsx` line 39 — change the trailing `sm:rounded-lg` to `sm:rounded-2xl` (leave the rest of the class string untouched):

```tsx
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl",
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/__tests__/design-system.test.ts`
Expected: PASS — all 18 tests.

- [ ] **Step 5: Remove the now-redundant call-site overrides**

Find them:

```bash
grep -rn 'rounded-xl' --include=*.tsx components/ app/ | grep -E '<Button|AlertDialogAction|AlertDialogCancel'
```

Delete `className="rounded-xl"` (and drop `rounded-xl` from longer class strings) on every `<Button>` hit. Confirmed sites to fix:

- `app/mis-mascotas/page.tsx:68` — `<Button onClick={openCreate} className="rounded-xl">` → `<Button onClick={openCreate}>`
- `app/mis-mascotas/page.tsx:83` — same change
- `components/pets/member-add-pet-modal.tsx` footer — `<Button variant="outline" onClick={handleClose} disabled={saving} className="rounded-xl">` → drop the `className`; `<Button onClick={handleSubmit} disabled={!canSave} className="rounded-xl">` → drop the `className`
- `components/chat/chat-message-thread.tsx:322` — `className="rounded-xl shrink-0 w-9 h-9"` → `className="shrink-0 w-9 h-9"`

Leave any hit that is **not** a `<Button>`/`AlertDialog*` (raw `<button>` elements still need their own `rounded-xl`).

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Visual check**

Open http://localhost:3000/mis-mascotas and http://localhost:3000/pets. Confirm buttons read as `rounded-xl` (12px) and any shadcn `Card`/`AlertDialog` reads as `rounded-2xl` (16px). Delete-pet confirm dialog on `/mis-mascotas` is the fastest AlertDialog to reach.

- [ ] **Step 8: Commit**

```bash
git add components/ui/button.tsx components/ui/card.tsx components/ui/alert-dialog.tsx \
  components/__tests__/design-system.test.ts app/mis-mascotas/page.tsx \
  components/pets/member-add-pet-modal.tsx components/chat/chat-message-thread.tsx
git commit -m "style(ui): pin primitive radii to house values

Button rounded-md->xl, Card xl->2xl, AlertDialog lg->2xl, plus guard
tests so they cannot drift. Removes redundant call-site overrides."
```

---

## Task 3: The `Spinner` primitive (spec §3.2 tier 3)

One Font-Awesome-based spinner for inline/in-component waits. Replaces the hand-rolled `border-b-2` ring divs.

**Files:**
- Create: `components/ui/spinner.tsx`

- [ ] **Step 1: Write the component**

Create `components/ui/spinner.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  /** Size the spinner with a text-* class, e.g. "text-2xl". Never w-*/h-*. */
  className?: string
  /** Screen-reader label. Defaults to common:loading. */
  label?: string
}

/**
 * The single inline spinner for the app. Full-page loads use
 * <PeluLoadingLogo /> instead; list/grid surfaces use skeletons.
 */
export function Spinner({ className, label }: SpinnerProps) {
  const { t } = useTranslation('common')

  return (
    <span role="status" className="inline-flex items-center">
      <FontAwesomeIcon
        icon={faSpinner}
        className={cn('animate-spin', className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label ?? t('loading')}</span>
    </span>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors referencing `components/ui/spinner.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/spinner.tsx
git commit -m "feat(ui): add shared Spinner primitive

Single Font Awesome spinner with an sr-only label, sized via text-*
classes. Replaces the three ad-hoc spinner idioms in the app."
```

---

## Task 4: `PeluLoadingLogo` — the paw assembles itself (spec §3.2.1)

Ported verbatim from the thesis deck (`/home/noob_master/pelu/decks/tesis/index.html` — SVG at `:361-377`, CSS at `:96-109`). Two hard-won details from the deck comments must be preserved:

1. The source `assets/logo.svg` has a flattened full-silhouette first path — **it is discarded**. Only the 7 pieces below are rendered (they cover it to within 0.29%). Including it would make the logo "assemble" as one solid blob.
2. The tiny 4×3px splinter path shares the right wing's exact delta and delay so it travels *with* the wing instead of reading as a stray speck.

`transform-box: fill-box` is load-bearing — without it the pieces rotate around the viewBox origin instead of their own centers.

**Files:**
- Create: `components/ui/pelu-loading-logo.module.css`
- Create: `components/ui/pelu-loading-logo.tsx`
- Create: `components/__tests__/ui/pelu-loading-logo.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/ui/pelu-loading-logo.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

describe('PeluLoadingLogo', () => {
  it('renders exactly the 7 assembling pieces', () => {
    const { container } = renderWithProviders(<PeluLoadingLogo />)
    expect(container.querySelectorAll('svg path')).toHaveLength(7)
  })

  it('exposes the logo as an image with an accessible name', () => {
    renderWithProviders(<PeluLoadingLogo label="Cargando mascotas" />)
    expect(screen.getByRole('img', { name: 'Cargando mascotas' })).toBeInTheDocument()
  })

  it('falls back to the common loading label', () => {
    renderWithProviders(<PeluLoadingLogo />)
    expect(screen.getByRole('img', { name: 'Cargando...' })).toBeInTheDocument()
  })

  it('shows the label as visible text too', () => {
    renderWithProviders(<PeluLoadingLogo label="Cargando mascotas" />)
    expect(screen.getByText('Cargando mascotas')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/ui/pelu-loading-logo.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/ui/pelu-loading-logo"`.

- [ ] **Step 3: Write the scoped CSS module**

Create `components/ui/pelu-loading-logo.module.css`:

```css
/*
  Ported from pelu/decks/tesis/index.html (:96-109). Scoped to this module on
  purpose — [data-assemble] is a deck convention and must not leak globally.
*/

@keyframes peluAssemble {
  from {
    opacity: var(--fromO, 0);
    transform: translate(var(--fromX, 0), var(--fromY, 0)) rotate(var(--fromRot, 0deg));
  }
  to {
    opacity: 1;
    transform: translate(0, 0) rotate(var(--toRot, 0deg));
  }
}

@keyframes peluBreathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.75;
  }
}

/* Load-bearing: without fill-box the pieces rotate around the viewBox origin,
   not their own centers, and the assembly reads as a scatter. */
.piece {
  transform-box: fill-box;
  transform-origin: center;
}

/* Under prefers-reduced-motion: reduce this block never applies, so the logo
   simply renders assembled and static. That is the correct fallback. */
@media (prefers-reduced-motion: no-preference) {
  .piece {
    animation: peluAssemble var(--dur, 0.7s) cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0s) both;
  }

  /* The assemble runs once (0.36s stagger + 0.7s duration = 1.06s), then the
     assembled logo idles with a breathing pulse so long loads read as alive.
     Do NOT loop the assembly — flying pieces every second is noise. */
  .svg {
    animation: peluBreathe 2s ease-in-out 1.06s infinite;
  }
}

/* The logo's slate fills sit too close to the forced-dark MFA background.
   Lift them there only. */
:global(.dark) .svg {
  filter: brightness(1.9);
}
```

- [ ] **Step 4: Write the component**

Create `components/ui/pelu-loading-logo.tsx`. The seven `d` strings are copied byte-for-byte from the deck — do not reformat or re-minify them:

```tsx
'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import styles from './pelu-loading-logo.module.css'

type PieceStyle = CSSProperties & Record<`--${string}`, string>

/**
 * The 7 pieces of the Pelú paw, in assembly order.
 *
 * The source assets/logo.svg also contains a flattened full-silhouette first
 * path — it is deliberately DISCARDED here. These 7 cover it to within 0.29%
 * (antialiased edges only); keeping it would assemble one solid blob.
 *
 * The 4x3px splinter shares the right wing's exact delta and delay so it
 * travels WITH the wing instead of reading as a stray speck.
 */
const PIECES: { name: string; fill: string; style: PieceStyle; d: string }[] = [
  {
    name: 'u',
    fill: 'oklch(44.6% 0.043 257.281)',
    style: { '--d': '0s', '--fromY': '70px' },
    d: 'M251.79,95.42c2.34,2.2,3.32,5.62,4.78,8.91l5.48,12.31,8.6,19.34,3.94,8.23,13.58,27.4c4.23,8.54,13.61,5.97,13.55,9.6-4.27.87-8.62.56-13.29-.62l-.14,39.26c-.1,26.7-13.87,55.13-35.86,70.74-9.01-2.89-17.96-5.77-27.55-5.48-21.34.64-41.13,11.59-49.87,31.4l-17.12.03c-9.35-20.15-27.64-30.15-49.11-31.39-9.7-.56-18.61,2.33-27.79,5.42-20.99-14.83-35.48-43.24-35.65-68.97l-.28-41.45c-4.69,1.4-9.48,2.18-13.99,1.06l.26-1.7c.21-1.36,9.21-.25,13.61-8.53l22.9-43.13,3.79-6.95c1.96-3.6,4.29-7.11,6-10.87,2.44-5.34,6.14-9.71,8.73-14.47l33.39.23.2,111.48c.01,6.84,3.49,14.97,6.78,20.15,11.07,17.42,27.99,19.27,46.29,18.54,15.73-.63,30.21-8.94,36.32-23.68,2.16-5.22,4.7-10.82,4.7-16.77l.07-109.81,37.68-.27Z',
  },
  {
    name: 'left-wing',
    fill: 'oklch(37.3% 0.034 259.733)',
    style: { '--d': '.12s', '--fromX': '-130px', '--fromY': '-30px', '--fromRot': '-16deg' },
    d: 'M86.35,95.56c-2.59,4.76-6.29,9.13-8.73,14.47-1.71,3.76-4.04,7.27-6,10.87l-3.79,6.95-22.9,43.13c-4.4,8.28-13.4,7.17-13.61,8.53l-.26,1.7c-20.75-5.15-36.15-21.03-29.49-44.53,1.62-5.7,3.29-11.26,5.85-16.51,11.23-23.04,28.45-41.82,50.27-54.84,8.95-5.34,37.72-18.09,44.73-7.2,1.15,1.8,1.25,5.53.24,7.39l-16.32,30.03Z',
  },
  {
    name: 'right-wing',
    fill: 'oklch(37.2% 0.044 257.287)',
    style: { '--d': '.12s', '--fromX': '130px', '--fromY': '-30px', '--fromRot': '16deg' },
    d: 'M268.79,61.69c.39.77,1.19,2.2,1.7,2.98.39.6,2.23-.1,2.59-.51,22.49,10.72,42.76,34.52,53.31,57.39,1.42,3.08,2.18,6.32,3.24,9.49,2.8,8.37,4.64,17.19,1.71,26.04-4.55,13.75-16.46,21.45-29.63,24.12.07-3.63-9.31-1.05-13.55-9.6l-13.58-27.4-3.94-8.23-8.6-19.34-5.48-12.31c-1.46-3.29-2.44-6.71-4.78-8.91-1.74-5.46-3.86-11.02-6.55-16.4s-8.26-15.18-4.74-19.61c5.12-6.44,22.03-.74,28.3,2.28Z',
  },
  {
    name: 'splinter',
    fill: '#314158',
    style: { '--d': '.12s', '--fromX': '130px', '--fromY': '-30px', '--fromRot': '16deg' },
    d: 'M273.08,64.16c-.36.41-2.2,1.1-2.59.51-.51-.78-1.31-2.21-1.7-2.98,1.49.72,3.05,1.58,4.29,2.47Z',
  },
  {
    name: 'tail',
    fill: 'oklch(37.2% 0.044 257.287)',
    style: { '--d': '.24s', '--fromX': '-60px', '--fromY': '80px' },
    d: 'M144.43,349.34c-4,1.83-7.2,2.84-11.59,2.84l-49.94-.04c-4.34.28-12.37-2.92-12.57-3.09-3.48-2.1-6.39-4.52-8.42-7.38,0,0-1.2-2.64-1.53-4.07-4.03-10.96,1.53-23.39,10.01-30.09,10-10.74,23.28-14.75,37.71-14.75h.64c22.34.18,41.87,14.4,45.57,36.88,1.38,8.41-2.77,16.45-9.88,19.7Z',
  },
  {
    name: 'left-pad',
    fill: 'oklch(37.2% 0.044 257.287)',
    style: { '--d': '.24s', '--fromX': '60px', '--fromY': '80px' },
    d: 'M270.21,342.94c-1.68,2.7-3.21,5.37-6.24,5.52-2.56,2.46-6.4,3.77-9.98,3.82l-25.6.34-19.6-.06c-5.14-.02-17.38-1.7-20.63-4.02-8.77-6.82-9.13-29.54.67-40.51,17.96-20.09,54.08-20.27,72.73-1.69,8.18,8.15,15.61,25.42,8.65,36.6Z',
  },
  {
    name: 'right-pad',
    fill: 'oklch(37.2% 0.044 257.287)',
    style: { '--d': '.36s', '--fromX': '26px', '--fromY': '-96px', '--fromRot': '-22deg' },
    d: 'M214.09,70.11c-9.86,8.33-32.6,3.23-36-6.82-2.04-6.04,1.06-11.56,4.02-16.77,9.6-16.88,23.01-31.1,39.29-41.7,4.59-2.99,9.87-6.75,15.35-3.66,8.78,4.96-5.78,54.69-22.67,68.96Z',
  },
]

interface PeluLoadingLogoProps {
  /** Rendered height in pixels. The deck uses 184; loading contexts want ~96–120. */
  size?: number
  /** Visible + accessible loading label. Defaults to common:loading. */
  label?: string
  className?: string
}

/**
 * Full-page loading state: the Pelú paw assembles itself from its pieces, then
 * idles with a breathing pulse. Ported from pelu/decks/tesis/index.html.
 */
export function PeluLoadingLogo({ size = 112, label, className }: PeluLoadingLogoProps) {
  const { t } = useTranslation('common')
  const text = label ?? t('loading')

  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <svg
        viewBox="0 0 332.83 352.62"
        role="img"
        aria-label={text}
        className={styles.svg}
        style={{ height: size, width: 'auto', overflow: 'visible' }}
      >
        {PIECES.map((piece) => (
          <path key={piece.name} className={styles.piece} style={piece.style} fill={piece.fill} d={piece.d} />
        ))}
      </svg>
      <p className="text-sm text-muted-foreground" aria-hidden="true">
        {text}
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/ui/pelu-loading-logo.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 6: Eyeball the animation**

Add a scratch page at `app/loading-preview/page.tsx`:

```tsx
'use client'

import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center gap-16">
      <PeluLoadingLogo />
      <div className="dark bg-background p-16 rounded-2xl">
        <PeluLoadingLogo />
      </div>
    </div>
  )
}
```

Open http://localhost:3000/loading-preview. Verify:
- pieces fly in from their own directions and settle in ~1.06s;
- the splinter travels with the right wing (no stray speck);
- after settling, the whole logo breathes (opacity 1 → .75 → 1, ~2s) and does **not** re-assemble;
- the right-hand (`.dark`) copy is clearly visible against the dark background;
- with OS "reduce motion" on, the logo appears assembled and static with the label still visible.

Then delete the scratch page:

```bash
rm -rf app/loading-preview
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/ui/pelu-loading-logo.tsx components/ui/pelu-loading-logo.module.css \
  components/__tests__/ui/pelu-loading-logo.test.tsx
git commit -m "feat(ui): add PeluLoadingLogo assembling-paw loader

Ports the thesis-deck animation: 7 pieces assemble once (1.06s), then the
assembled logo breathes. Keyframes are scoped to a CSS module so
[data-assemble] does not leak. Respects prefers-reduced-motion."
```

---

## Task 5: Wire the full-page loading tier (spec §3.2 tier 1)

Never render `<Suspense fallback={null}>` for a whole page again.

**Files:**
- Modify: `components/auth/protected-route.tsx:42-51`
- Modify: `app/adopt/page.tsx:15`
- Modify: `app/auth/mfa/enrollment/page.tsx:47`

- [ ] **Step 1: Replace the auth-gate spinner**

In `components/auth/protected-route.tsx`, add the import:

```tsx
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'
```

Replace lines 42–51 (the whole `if (loading)` block) with:

```tsx
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PeluLoadingLogo />
      </div>
    )
  }
```

This also removes the hardcoded `'Cargando...'` at line 47 — `PeluLoadingLogo` uses `common:loading`.

- [ ] **Step 2: Fill the blank Suspense fallbacks**

`app/adopt/page.tsx` — replace the whole file:

```tsx
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

function AdoptContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('id') ?? ''
  return <AdoptPetPage petId={petId} />
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <PeluLoadingLogo />
        </div>
      }
    >
      <AdoptContent />
    </Suspense>
  )
}
```

`app/auth/mfa/enrollment/page.tsx` — add the import and replace the `fallback={null}` at line 47:

```tsx
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'
```

```tsx
export default function MfaEnrollmentPage() {
  return (
    <Suspense
      fallback={
        <div className="dark flex min-h-screen items-center justify-center bg-background">
          <PeluLoadingLogo />
        </div>
      }
    >
      <MfaEnrollmentInner />
    </Suspense>
  )
}
```

- [ ] **Step 3: Verify in the browser**

Throttle the network in DevTools to "Slow 3G", then load http://localhost:3000/mis-mascotas while logged out and http://localhost:3000/adopt?id=00000000-0000-0000-0000-000000000000. Expected: the assembling paw appears instead of a blank screen or a bare ring spinner.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/auth/protected-route.tsx app/adopt/page.tsx app/auth/mfa/enrollment/page.tsx
git commit -m "feat(ui): use PeluLoadingLogo for full-page loading gates

Replaces the auth-gate ring spinner and two blank <Suspense fallback={null}>
page loaders. Also drops the hardcoded 'Cargando...' string."
```

---

## Task 6: The shared `ErrorState` surface (spec §3.3)

Error must never be indistinguishable from empty, and every error gets a retry. This task builds the component; Plans B and C wire it into each route.

**Files:**
- Create: `components/ui/error-state.tsx`
- Create: `components/__tests__/ui/error-state.test.tsx`
- Modify: `public/locales/es/common.json`, `public/locales/en/common.json`

- [ ] **Step 1: Add the translation keys (Spanish first)**

`public/locales/es/common.json` — add a top-level `"error_state"` object after the existing `"error"` key:

```json
  "error_state": {
    "title": "No pudimos cargar esto",
    "retry": "Reintentar"
  },
```

`public/locales/en/common.json` — same position:

```json
  "error_state": {
    "title": "We couldn't load this",
    "retry": "Try again"
  },
```

- [ ] **Step 2: Write the failing test**

Create `components/__tests__/ui/error-state.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { ErrorState } from '@/components/ui/error-state'

describe('ErrorState', () => {
  it('renders the default translated message', () => {
    renderWithProviders(<ErrorState onRetry={() => {}} />)
    expect(screen.getByText('No pudimos cargar esto')).toBeInTheDocument()
  })

  it('renders a caller-supplied message instead', () => {
    renderWithProviders(<ErrorState message="Error al cargar mascotas" onRetry={() => {}} />)
    expect(screen.getByText('Error al cargar mascotas')).toBeInTheDocument()
    expect(screen.queryByText('No pudimos cargar esto')).not.toBeInTheDocument()
  })

  it('fires onRetry when the retry button is pressed', () => {
    const onRetry = vi.fn()
    renderWithProviders(<ErrorState onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('announces itself to assistive tech', () => {
    renderWithProviders(<ErrorState onRetry={() => {}} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('omits the retry button when no handler is given', () => {
    renderWithProviders(<ErrorState />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/ui/error-state.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/ui/error-state"`.

- [ ] **Step 4: Write the component**

Create `components/ui/error-state.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** Translated message. Falls back to common:error_state.title. */
  message?: string
  /** Re-invokes the fetch. Omit only when there is genuinely nothing to retry. */
  onRetry?: () => void
  className?: string
}

/**
 * The one error surface for async data. Never reuse an empty state for a failed
 * fetch — "you have no pets" and "we could not reach the server" are different
 * facts and the user needs a way out of the second one.
 */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation('common')

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-4xl text-destructive/50" />
      <p className="text-sm text-muted-foreground max-w-xs">{message ?? t('error_state.title')}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
          {t('error_state.retry')}
        </button>
      )}
    </div>
  )
}
```

> `focus-ring` is defined in Task 7. Until then the class is inert — that is fine, it does not break rendering or tests.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/ui/error-state.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add components/ui/error-state.tsx components/__tests__/ui/error-state.test.tsx \
  public/locales/es/common.json public/locales/en/common.json
git commit -m "feat(ui): add shared ErrorState surface with retry

Gives every async surface a distinct error state (icon + message + retry)
so a failed fetch can never render as an empty state."
```

---

## Task 7: Focus recipe, semantic tokens, and the AA-safe pop fill (spec §3.4, §3.5, §3.10)

Three related additions to `app/globals.css`, all in one commit because they are all theme plumbing.

**Contrast note (measured, not guessed):** WCAG contrast of each `pop` shade against white —

| shade | hex | vs `#fff` |
| --- | --- | --- |
| `pop-750` | `#188594` | 4.36:1 ✗ |
| **`pop-800`** | **`#147380`** | **5.54:1 ✓** |
| `pop-850` | `#11616b` | 7.13:1 ✓ |
| `pop-550` | `#21bdd1` | 2.27:1 ✗ |

So `pop-800` is the darkest shade that clears AA for white text. It gets a semantic alias, `--color-pop-solid`, used for **text-bearing filled surfaces only**. `pop-550` stays for decorative accents, borders, and icons on light backgrounds.

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add the focus-ring utility**

In `app/globals.css`, after the closing `}` of the second `@layer base { ... }` block (the one containing `:root` and `.dark`), append:

```css
/*
  One focus recipe for the whole app. Tailwind v4 @utility, so it composes with
  variants and can be grepped for. pop-700 reads clearly on both the light page
  background and the muted grid surfaces.
*/
@utility focus-ring {
  &:focus-visible {
    outline: 2px solid var(--color-pop-700);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 2: Add the semantic color tokens**

Inside the `@theme {}` block in `app/globals.css`, immediately after the `--color-popover-foreground: var(--popover-foreground);` line, add:

```css
  /* Semantic status colors. `-bg` is the tint, bare is the mid tone (icons,
     borders), `-foreground` is the dark text that sits on the tint. */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-bg: var(--success-bg);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-bg: var(--warning-bg);

  /* pop-800 is the darkest pop shade that clears 4.5:1 with white (5.54:1).
     Use it for any filled surface that carries text; pop-550 (2.27:1) is for
     decorative accents, borders and icons only. */
  --color-pop-solid: var(--color-pop-800);
```

- [ ] **Step 3: Define the light and dark values**

In `app/globals.css`, inside `@layer base { :root { ... } }`, after the `--destructive-foreground` line, add:

```css
    --success: oklch(52% 0.13 155);
    --success-foreground: oklch(30% 0.08 155);
    --success-bg: oklch(96% 0.03 155);
    --warning: oklch(52% 0.12 75);
    --warning-foreground: oklch(30% 0.08 70);
    --warning-bg: oklch(96% 0.045 85);
```

And inside `.dark { ... }`, after its `--destructive-foreground` line:

```css
    --success: oklch(70% 0.14 155);
    --success-foreground: oklch(92% 0.04 155);
    --success-bg: oklch(25% 0.05 155);
    --warning: oklch(75% 0.13 80);
    --warning-foreground: oklch(93% 0.04 85);
    --warning-bg: oklch(27% 0.05 80);
```

- [ ] **Step 4: Verify the utilities compile**

Run: `bun run build`
Expected: build succeeds. (This is the fastest way to confirm Tailwind v4 accepted the `@utility` block — a malformed one fails the CSS build.)

- [ ] **Step 5: Smoke-test the classes**

Temporarily add to `app/mis-mascotas/page.tsx` inside `<main>`:

```tsx
<div className="bg-warning-bg text-warning-foreground border border-warning rounded-2xl p-4">warning</div>
<div className="bg-success-bg text-success-foreground border border-success rounded-2xl p-4">success</div>
<button className="focus-ring bg-pop-solid text-white rounded-xl px-4 py-2">pop-solid</button>
```

Load http://localhost:3000/mis-mascotas, confirm all three render with the intended colors and that tabbing to the button shows a 2px teal ring with a 2px gap. Then remove the temporary markup.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): add focus-ring utility, status tokens and pop-solid

focus-ring is the single focus recipe. success/warning tokens replace raw
amber/green palette colors and carry dark-mode values. pop-solid aliases
pop-800, the darkest pop shade clearing 4.5:1 with white (5.54:1)."
```

---

## Task 8: Migrate raw palette colors to the new tokens (spec §3.10)

**Scope discipline:** 26 files use raw `amber`/`green`/`yellow` classes, but 19 of them are dashboards, onboarding wizards, or transport screens that this spec says not to touch. Only the seven in-scope files below change.

**Files:**
- Modify: `components/pets/pet-grid.tsx:283,308`
- Modify: `components/pets/pet-detail.tsx:143-147`
- Modify: `components/adopt/adopt-pet-page.tsx:128`
- Modify: `components/providers/provider-card.tsx` (two `text-green-500`)
- Modify: `components/aliados/provider-detail.tsx` (two `text-green-500`, one `bg-gradient-to-br`)
- Modify: `components/pets/user-pet-card.tsx:89-90`
- Modify: `app/servicios/page.tsx:48,57`
- Modify: `components/__tests__/design-system.test.ts`

- [ ] **Step 1: Write the failing scoped guard test**

Append to `components/__tests__/design-system.test.ts`:

```ts
// ─── Semantic Status Colors (in-scope routes only) ───────────
// The dashboards still carry raw palette colors and are out of scope for the
// 2026-07-28 UI pass, so this rule is scoped to the audited files rather than
// applied globally.

describe('Semantic Status Colors', () => {
  const IN_SCOPE = [
    'pets/pet-grid.tsx',
    'pets/pet-detail.tsx',
    'pets/user-pet-card.tsx',
    'adopt/adopt-pet-page.tsx',
    'providers/provider-card.tsx',
    'aliados/provider-detail.tsx',
  ]

  it('19 — audited components use success/warning tokens, not raw palette colors', () => {
    const files = IN_SCOPE.map((f) => path.join(COMPONENTS_DIR, f))
    const v = findViolations(files, /\b(bg|text|border)-(amber|green|yellow)-\d/)
    expect(v, `raw palette colors found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('20 — audited components use Tailwind v4 gradient syntax', () => {
    const files = IN_SCOPE.map((f) => path.join(COMPONENTS_DIR, f))
    const v = findViolations(files, /\bbg-gradient-to-/)
    expect(v, `v3 gradient syntax found:\n${v.join('\n')}`).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/design-system.test.ts`
Expected: FAIL — tests 19 and 20 list violations in pet-grid, pet-detail, user-pet-card, adopt-pet-page, provider-card and provider-detail.

- [ ] **Step 3: Migrate `components/pets/pet-grid.tsx`**

Line 283 — the special-condition card background:

```tsx
                    ? 'bg-warning-bg border-2 border-warning/50'
```

Line 308 — the special-condition badge:

```tsx
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warning-bg text-warning-foreground">
```

- [ ] **Step 4: Migrate `components/pets/pet-detail.tsx`**

Lines 143–147 — the condition alert block:

```tsx
          <div className="bg-warning-bg border border-warning/40 rounded-xl p-3 space-y-1">
            <p className="text-sm font-medium text-warning-foreground">{t('detail.specialCondition')}</p>
            {pet.condition_notes && (
              <p className="text-sm text-warning-foreground/80">{pet.condition_notes}</p>
            )}
          </div>
```

- [ ] **Step 5: Migrate `components/adopt/adopt-pet-page.tsx`**

Line 128 — the advisory banner:

```tsx
          <div className="mb-6 p-4 bg-warning-bg border border-warning/40 rounded-2xl text-sm text-warning-foreground">
```

- [ ] **Step 6: Migrate `components/pets/user-pet-card.tsx`**

Lines 89–90 — the vaccinated/castrated icons:

```tsx
          <FontAwesomeIcon icon={faSyringe} className={`text-xs ${vaccinated ? 'text-success' : 'text-muted-foreground/30'}`} />
          <FontAwesomeIcon icon={faScissors} className={`text-xs ${castrated ? 'text-success' : 'text-muted-foreground/30'}`} />
```

- [ ] **Step 7: Migrate `components/providers/provider-card.tsx`**

The trust-badge block — replace both `text-green-500` occurrences:

```tsx
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-success" />
            <span className="text-xs text-success">
```

- [ ] **Step 8: Migrate `components/aliados/provider-detail.tsx`**

The trust-badge block:

```tsx
            <FontAwesomeIcon icon={faShieldHalved} className="text-sm text-success" />
            <span className="text-sm text-success">
```

And the no-cover-photo fallback — swap the v3 gradient class for v4:

```tsx
          <div className="w-full h-40 bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
```

- [ ] **Step 9: Migrate `app/servicios/page.tsx`**

Line 48 — pending icon:

```tsx
              <FontAwesomeIcon icon={faHourglassHalf} className="text-lg text-warning" />
```

Line 57 — active icon:

```tsx
              <FontAwesomeIcon icon={faCircleCheck} className="text-lg text-success" />
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx vitest run components/__tests__/design-system.test.ts`
Expected: PASS — all 20 tests.

- [ ] **Step 11: Visual check in both themes**

Open http://localhost:3000/pets and click a pet with a special condition. Then http://localhost:3000/aliados and http://localhost:3000/servicios. Confirm the amber advisory reads as a warm tint with legible dark text, and verified badges read as green. Toggle the OS to dark mode and re-check that nothing turns invisible.

- [ ] **Step 12: Commit**

```bash
git add components/pets/pet-grid.tsx components/pets/pet-detail.tsx \
  components/pets/user-pet-card.tsx components/adopt/adopt-pet-page.tsx \
  components/providers/provider-card.tsx components/aliados/provider-detail.tsx \
  app/servicios/page.tsx components/__tests__/design-system.test.ts
git commit -m "style(theme): move audited routes to success/warning tokens

Replaces raw amber/green/yellow palette classes (no dark-mode story, off
brand) with the new semantic tokens, and normalizes one v3 gradient class.
Guard test is scoped to the audited files; dashboards are out of scope."
```

---

## Task 9: Move text-bearing pop fills to `pop-solid` (spec §3.5)

White text on `bg-pop-550` measures 2.27:1 — well below AA. This is the single most visible change in Plan A: bright cyan CTAs become a darker teal. That is the intended outcome of the spec decision.

**Scope discipline:** 33 files use `bg-pop-550`. Only the ten in-scope files below change. Dashboards, onboarding wizards, `auth/login-page.tsx`, `auth/register-page.tsx`, `Stepper.tsx`, `transition-overlay.tsx`, `events/` and `testimonial-carousel.tsx` are **left alone**.

Only change occurrences where **text or a glyph sits on the fill**. Tinted uses (`bg-pop-550/10`, `bg-pop-550/20`, `bg-pop-550/5`) and decorative dots/borders stay `pop-550`.

**Files:**
- Modify: `components/forms/form-renderer.tsx:128,221`
- Modify: `components/pets/pet-grid.tsx:120,133,144,154,161,174,181`
- Modify: `components/pets/pets-header.tsx:189,240,341`
- Modify: `components/pets/pet-detail.tsx` (adopt button)
- Modify: `components/chat/chat-message-thread.tsx:280,350`
- Modify: `components/chat/chat-conversation-list.tsx:171`
- Modify: `components/landing/landing-page.tsx:64`
- Modify: `components/pets/member-add-pet-modal.tsx` (destructive/pop fills carrying glyphs)
- Modify: `components/__tests__/design-structure.test.tsx:81,111-117`

- [ ] **Step 1: Update the structure test first**

`components/__tests__/design-structure.test.tsx` — test 7 currently asserts `container.querySelector('.bg-pop-550')` for the active PetGrid pill. Change it to the new class:

```tsx
  it('7 — active filter pill has bg-pop-solid class', () => {
    const { container } = renderWithProviders(<PetGrid {...baseProps} activeFilter="dogs" />)
    const activePill = container.querySelector('.bg-pop-solid')
    expect(activePill).toBeTruthy()
  })
```

> Leave test 5 (`Stepper` → `bg-pop-550`) untouched. `Stepper.tsx` is out of scope.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/design-structure.test.tsx`
Expected: FAIL — test 7, `expect(activePill).toBeTruthy()` receives `null`.

- [ ] **Step 3: Migrate the filter pills in `components/pets/pet-grid.tsx`**

Every occurrence of `'bg-pop-550 text-white'` in the pill class strings (lines 120, 133, 144, 154, 161, 174) becomes `'bg-pop-solid text-white'`. Line 181's mobile filter-count badge inverts, so it becomes:

```tsx
            <span className="ml-1 w-4 h-4 rounded-full bg-white text-pop-solid text-[10px] font-bold flex items-center justify-center">
```

Leave the mobile popover chips (lines 196, 209, 215, 227, 233) alone — those are `bg-pop-550/10` tints with `text-foreground`, which are fine.

- [ ] **Step 4: Migrate `components/forms/form-renderer.tsx`**

Line 128 — the submit button:

```tsx
            className="w-full py-3 bg-pop-solid text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
```

Line 221 — the selected rating button:

```tsx
              className={`w-9 h-9 rounded-xl border text-sm font-medium transition-colors ${strVal === String(n) ? 'bg-pop-solid border-pop-solid text-white' : 'border-input hover:border-pop-550/50'}`}>
```

Line 76 — the success-screen CTA (still an `<a>` here; Plan C converts it to `TransitionLink`):

```tsx
        <a href="/pets" className="inline-block px-6 py-2.5 bg-pop-solid text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
```

- [ ] **Step 5: Migrate `components/pets/pets-header.tsx`**

Line 189 — the register CTA:

```tsx
                className="px-4 py-2 text-sm font-medium bg-pop-solid text-white rounded-xl hover:bg-pop-850 transition-colors"
```

Line 240 — the avatar camera button:

```tsx
                className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-pop-solid text-white flex items-center justify-center shadow-sm hover:bg-pop-850 transition-colors disabled:opacity-60"
```

Line 341 — the unread-count badge:

```tsx
                  <span className="ml-auto bg-pop-solid text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
```

- [ ] **Step 6: Migrate `components/pets/pet-detail.tsx`**

The adopt button:

```tsx
            className="w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-colors"
```

- [ ] **Step 7: Migrate the chat surfaces**

`components/chat/chat-message-thread.tsx` line 280 — the sent bubble:

```tsx
                            ? 'bg-pop-solid text-white rounded-[16px_16px_4px_16px]'
```

Line 285 — the timestamp inside a sent bubble (it was `text-background`, which reads as white; make it explicit and slightly muted):

```tsx
                        <p className={`text-[10px] mt-1 ${isSent ? 'text-white/80 text-right' : 'text-muted-foreground'}`}>
```

Line 350 — the send button:

```tsx
          className="bg-pop-solid text-white rounded-xl p-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
```

`components/chat/chat-conversation-list.tsx` line 171 — the unread badge:

```tsx
              <span className="bg-pop-solid text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
```

Leave `unreadBg: 'bg-pop-550/10 …'` and `text-pop-550` (the pet-name accent) alone — tints and accent text on a light background are fine.

- [ ] **Step 8: Migrate `components/landing/landing-page.tsx`**

Line 64 — the register CTA:

```tsx
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-pop-solid text-white rounded-xl text-sm font-medium hover:bg-pop-850 transition-colors"
```

- [ ] **Step 9: Check the add-pet modal**

```bash
grep -n 'bg-pop-550\|text-pop-300' components/pets/member-add-pet-modal.tsx
```

Change only fills that carry text or a glyph. The `bg-pop-550/10` unit-toggle tints and `text-pop-300` link text stay as they are.

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx vitest run`
Expected: PASS — including design-structure test 7.

- [ ] **Step 11: Visual check**

Open http://localhost:3000/, /pets, /chat. Confirm:
- CTAs and active filter pills are a deeper teal and the white label is clearly readable;
- chat sent-bubbles read cleanly, including the timestamp;
- decorative accents (the hero badge dot, pet-name accents, tinted chips) are still the bright `pop-550`.

- [ ] **Step 12: Commit**

```bash
git add components/forms/form-renderer.tsx components/pets/pet-grid.tsx \
  components/pets/pets-header.tsx components/pets/pet-detail.tsx \
  components/pets/member-add-pet-modal.tsx components/chat/chat-message-thread.tsx \
  components/chat/chat-conversation-list.tsx components/landing/landing-page.tsx \
  components/__tests__/design-structure.test.tsx
git commit -m "fix(a11y): use AA-safe pop-solid for text-bearing fills

White on pop-550 measured 2.27:1. Filled surfaces that carry text now use
pop-solid (pop-800, 5.54:1). Decorative pop-550 accents, borders and tints
are unchanged. Scoped to the audited routes; dashboards untouched."
```

---

## Task 10: Apply the focus ring across the audited routes (spec §3.4)

Grep confirms **zero** `focus-visible:` styles in feature components today. Every interactive element in the audited routes gets the `focus-ring` class, and primary buttons get `active:` feedback.

**Files:**
- Modify: `components/pets/pet-grid.tsx`, `components/pets/pets-header.tsx`, `components/pets/pet-detail.tsx`, `components/pets/user-pet-card.tsx`
- Modify: `components/aliados/provider-grid.tsx`, `components/providers/provider-card.tsx`, `components/aliados/provider-detail.tsx`
- Modify: `components/chat/chat-conversation-list.tsx`, `components/chat/chat-message-thread.tsx`
- Modify: `components/forms/form-renderer.tsx`, `components/adopt/adopt-pet-page.tsx`
- Modify: `components/service-providers/service-provider-form.tsx`
- Modify: `components/auth/mfa/mfa-enrollment.tsx`, `components/auth/mfa/mfa-totp-setup.tsx`, `components/auth/mfa/mfa-passkey-setup.tsx`, `components/auth/mfa/mfa-recovery-modal.tsx`
- Modify: `components/landing/landing-page.tsx`, `components/footer.tsx`, `components/pets/public-mobile-nav.tsx`

- [ ] **Step 1: Inventory the interactive elements**

```bash
grep -rn '<button\|role="button"\|<a href\|<Link\|<TransitionLink' \
  components/pets/pet-grid.tsx components/pets/pets-header.tsx \
  components/pets/pet-detail.tsx components/pets/user-pet-card.tsx \
  components/aliados/ components/providers/ components/chat/ \
  components/forms/form-renderer.tsx components/adopt/adopt-pet-page.tsx \
  components/service-providers/service-provider-form.tsx \
  components/auth/mfa/ components/landing/landing-page.tsx \
  components/footer.tsx components/pets/public-mobile-nav.tsx
```

- [ ] **Step 2: Add `focus-ring` to every hit**

Prepend `focus-ring ` to the `className` of each element found. For template-literal class strings, put it in the static leading segment, e.g.:

```tsx
            className={`focus-ring shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
```

Do **not** touch elements inside `components/ui/` — shadcn primitives already ship `focus-visible:ring-1 focus-visible:ring-ring`.

- [ ] **Step 3: Add active-press feedback to primary buttons**

Add `active:scale-[0.98]` (and `transition-transform` where no transition is present yet) to the following, all of which already have a 150–300ms transition:

- `components/forms/form-renderer.tsx:128` submit button
- `components/pets/pets-header.tsx:189` register CTA
- `components/pets/pet-detail.tsx` adopt button
- `components/chat/chat-message-thread.tsx:350` send button
- `components/landing/landing-page.tsx:57,64` both hero CTAs
- `components/service-providers/service-provider-form.tsx:225` submit button

Example:

```tsx
            className="focus-ring w-full py-3 bg-pop-solid text-white rounded-xl font-semibold transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
```

- [ ] **Step 4: Verify by keyboard**

Load http://localhost:3000/pets and press Tab repeatedly. Every filter pill, card, three-dot menu, header link and footer link must show a visible 2px teal ring with a 2px offset. Repeat on /aliados, /chat and /servicios.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/pets/ components/aliados/ components/providers/ components/chat/ \
  components/forms/form-renderer.tsx components/adopt/adopt-pet-page.tsx \
  components/service-providers/service-provider-form.tsx components/auth/mfa/ \
  components/landing/landing-page.tsx components/footer.tsx
git commit -m "feat(a11y): add visible focus rings across audited routes

Applies the shared focus-ring utility to every interactive element on the
public and member routes, plus active:scale feedback on primary buttons.
There were previously zero focus-visible styles in feature code."
```

---

## Task 11: Toggle and icon-button semantics (spec §3.4)

Grep confirms **zero** `aria-pressed` anywhere. Stateful pills lie to screen readers, and icon-only buttons are unnamed.

**Files:**
- Modify: `components/pets/pet-grid.tsx:114-165,207-236,329-331`
- Modify: `components/service-providers/service-provider-form.tsx:150-181`
- Modify: `components/chat/chat-message-thread.tsx:219,321,347`
- Modify: `components/pets/member-add-pet-modal.tsx:227,448,458`
- Modify: `components/auth/mfa/mfa-totp-setup.tsx:79-81`
- Modify: `public/locales/{es,en}/{pets,common}.json`

- [ ] **Step 1: Add the missing labels (Spanish first)**

`public/locales/es/pets.json` — inside `"card"`:

```json
    "more_actions": "Más acciones",
```

Inside `"chat"`:

```json
    "back_to_list": "Volver a conversaciones",
    "attach": "Adjuntar",
    "message_label": "Mensaje",
```

Inside `"member"`:

```json
    "close_modal": "Cerrar",
    "remove_photo": "Quitar foto",
    "add_photo": "Añadir foto",
```

`public/locales/en/pets.json` — same keys:

```json
    "more_actions": "More actions",
```
```json
    "back_to_list": "Back to conversations",
    "attach": "Attach",
    "message_label": "Message",
```
```json
    "close_modal": "Close",
    "remove_photo": "Remove photo",
    "add_photo": "Add photo",
```

`public/locales/es/common.json` — add a top-level key:

```json
  "copy": "Copiar",
```

`public/locales/en/common.json`:

```json
  "copy": "Copy",
```

- [ ] **Step 2: Add `aria-pressed` to the pets filter pills**

In `components/pets/pet-grid.tsx`, add to each of the six desktop `FILTERS` pills (line 115 block):

```tsx
            aria-pressed={activeFilter === f.key}
```

Vaccinated pill (line 129): `aria-pressed={vaccinatedFilter}`
Castrated pill (line 140): `aria-pressed={castratedFilter}`
Centers pill (line 152): `aria-pressed={sourceFilter === 'rc'}`
Members pill (line 159): `aria-pressed={sourceFilter === 'member'}`

Repeat the same four for the mobile popover chips at lines 194, 207, 213, 225, 231.

Also make the mobile filter toggle announce its state (line 170):

```tsx
          aria-expanded={showMobileFilters}
```

- [ ] **Step 3: Mark the decorative separators**

Lines 128 and 151 in `components/pets/pet-grid.tsx`:

```tsx
        <span aria-hidden="true" className="text-muted-foreground/30 mx-1 select-none">|</span>
```

- [ ] **Step 4: Add `aria-pressed` to the servicios chips**

In `components/service-providers/service-provider-form.tsx`, the services chip (line 150 block) and pet-types chip (line 169 block) each get:

```tsx
              aria-pressed={services.includes(s)}
```
```tsx
              aria-pressed={petTypes.includes(p)}
```

- [ ] **Step 5: Name the icon-only buttons**

`components/pets/pet-grid.tsx:329` — the three-dot trigger:

```tsx
                      <button aria-label={t('card.more_actions')} className="focus-ring w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:bg-pop-550 transition-colors">
```

`components/chat/chat-message-thread.tsx:220` — back button:

```tsx
          <button onClick={onBack} aria-label={t('chat.back_to_list')} className="focus-ring text-muted-foreground hover:text-foreground transition-colors">
```

Line 322 — the attach/plus trigger:

```tsx
                <Button variant="ghost" size="icon" aria-label={t('chat.attach')} className="shrink-0 w-9 h-9">
```

Line 339 — the message input:

```tsx
          aria-label={t('chat.message_label')}
```

Line 347 — the send button:

```tsx
          aria-label={t('chat.send')}
```

`components/pets/member-add-pet-modal.tsx` — the close button (`faXmark`, around line 227), the per-photo remove button, and the "add another photo" button each get `aria-label={t('member.close_modal')}`, `aria-label={t('member.remove_photo')}` and `aria-label={t('member.add_photo')}` respectively.

`components/auth/mfa/mfa-totp-setup.tsx:79` — the copy-secret button:

```tsx
              <button onClick={handleCopySecret} aria-label={t('copy', { ns: 'common' })} className="focus-ring p-2 hover:bg-muted rounded-xl transition-colors">
```

- [ ] **Step 6: Verify with a screen reader pass**

In Chrome DevTools → Elements → Accessibility pane, tab through the /pets filter row. Each pill must report a name, `role: button` and `pressed: true/false`. The three-dot trigger must report "Más acciones".

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/pets/pet-grid.tsx components/pets/member-add-pet-modal.tsx \
  components/service-providers/service-provider-form.tsx \
  components/chat/chat-message-thread.tsx components/auth/mfa/mfa-totp-setup.tsx \
  public/locales/es/pets.json public/locales/en/pets.json \
  public/locales/es/common.json public/locales/en/common.json
git commit -m "feat(a11y): add aria-pressed to toggles and labels to icon buttons

Stateful filter pills and service chips now report their pressed state, and
every icon-only button in the audited routes has an accessible name."
```

---

## Task 12: Respect reduced motion (spec §3.6)

**Files:**
- Modify: `app/globals.css` (marquee keyframes)
- Modify: `components/landing/logo-marquee.tsx`
- Modify: `components/landing/testimonial-carousel.tsx:99` (autoplay effect)

- [ ] **Step 1: Pause the marquee under reduced motion**

Append to the end of `app/globals.css`:

```css
/* The landing marquee is decorative; it must not scroll when the user has
   asked for reduced motion. Uses the CSS animation, not JS, so it stops on the
   compositor thread. */
@media (prefers-reduced-motion: reduce) {
  .animate-marquee {
    animation: none;
  }
}
```

- [ ] **Step 2: Give the marquee an i18n region label**

In `components/landing/logo-marquee.tsx`, replace the hardcoded `aria-label`. Add the import and a prop:

```tsx
'use client'

import { useTranslation } from 'react-i18next'

interface LogoMarqueeProps {
  logos: { src: string; alt: string }[]
  logoHeight?: number
  gap?: number
  className?: string
}

export function LogoMarquee({ logos, logoHeight = 24, gap = 48, className }: LogoMarqueeProps) {
  const { t } = useTranslation('landing')

  return (
    <div className="overflow-hidden" role="region" aria-label={t('partners.region_label')}>
```

Add the key to `public/locales/es/landing.json`:

```json
  "partners": {
    "region_label": "Logos de aliados"
  },
```

And `public/locales/en/landing.json`:

```json
  "partners": {
    "region_label": "Partner logos"
  },
```

- [ ] **Step 3: Stop carousel autoplay under reduced motion**

In `components/landing/testimonial-carousel.tsx`, add the import:

```tsx
import { useReducedMotion } from '@/lib/about/use-reduced-motion'
```

> The hook already exists at `lib/about/use-reduced-motion.ts` and is used by six `components/about/` scenes. Reuse it rather than writing a second one — the file path is historical, the hook is generic.

Inside `TestimonialCarousel`, next to the other hooks:

```tsx
  const reducedMotion = useReducedMotion()
```

Then change the autoplay effect (currently line 99) so it bails out:

```tsx
  useEffect(() => {
    if (reducedMotion) return
    if (!autoplay || itemsForRender.length <= 1) return
    if (pauseOnHover && isHovered) return

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1))
    }, autoplayDelay)

    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length, reducedMotion])
```

- [ ] **Step 4: Verify**

Enable "Emulate CSS prefers-reduced-motion: reduce" in DevTools → Rendering, then load http://localhost:3000/. Expected: the logo strip is frozen and the testimonial carousel does not advance on its own, but dragging and the dots still work.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/landing/logo-marquee.tsx \
  components/landing/testimonial-carousel.tsx \
  public/locales/es/landing.json public/locales/en/landing.json
git commit -m "feat(a11y): honor prefers-reduced-motion on the landing page

Freezes the logo marquee and stops testimonial autoplay. Manual carousel
interaction still works. Also i18n's the marquee's region label."
```

---

## Task 13: Spanish-by-default locale resolution (spec §3.7, Q1 decision)

Removes the `navigator.language` sniff that produced the mixed-language experience (English chrome around Spanish database content). Only an **explicit** choice may override `es`.

Resolution order: explicit stored choice → authenticated user's `preferred_lang` → `es`.

**Files:**
- Create: `lib/i18n/language.ts`
- Create: `lib/i18n/__tests__/language.test.ts`
- Create: `components/language-preference-sync.tsx`
- Modify: `components/i18n-provider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

Create `lib/i18n/__tests__/language.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  getStoredLanguage,
  setStoredLanguage,
  resolveLanguage,
} from '@/lib/i18n/language'

describe('language resolution', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to Spanish with no stored choice and no profile', () => {
    expect(resolveLanguage()).toBe('es')
    expect(resolveLanguage(null)).toBe('es')
  })

  it('never falls back to the browser language', () => {
    // jsdom reports en-US; the resolver must ignore it entirely.
    expect(navigator.language.startsWith('en')).toBe(true)
    expect(resolveLanguage()).toBe('es')
  })

  it('uses the profile preference when there is no explicit choice', () => {
    expect(resolveLanguage('en')).toBe('en')
  })

  it('lets an explicit stored choice win over the profile preference', () => {
    setStoredLanguage('es')
    expect(resolveLanguage('en')).toBe('es')
  })

  it('ignores unsupported stored values', () => {
    window.localStorage.setItem(STORAGE_KEY, 'fr')
    expect(getStoredLanguage()).toBeNull()
    expect(resolveLanguage()).toBe('es')
  })

  it('round-trips an explicit choice', () => {
    setStoredLanguage('en')
    expect(getStoredLanguage()).toBe('en')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/i18n/__tests__/language.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/i18n/language"`.

- [ ] **Step 3: Write the module**

Create `lib/i18n/language.ts`:

```ts
export const STORAGE_KEY = 'pelu_lang'

/** Legacy key written by the old navigator.language sniff. Removed on init. */
export const LEGACY_STORAGE_KEY = 'i18nextLng'

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === 'es' || value === 'en'
}

/** The user's explicit choice, or null. Never sniffs the browser. */
export function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  return isSupportedLanguage(value) ? value : null
}

export function setStoredLanguage(language: SupportedLanguage): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, language)
}

/**
 * Drops the pre-2026-07 key. It held a browser-sniffed value, so migrating it
 * forward would preserve exactly the mixed-language bug we are removing.
 */
export function clearLegacyLanguage(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

/**
 * Resolution order: explicit stored choice → profile preference → 'es'.
 * Pelú is Spanish-first; the browser's locale is deliberately not consulted.
 */
export function resolveLanguage(preferredLang?: string | null): SupportedLanguage {
  const stored = getStoredLanguage()
  if (stored) return stored
  if (isSupportedLanguage(preferredLang)) return preferredLang
  return 'es'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/i18n/__tests__/language.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Rewrite the provider**

Replace the whole of `components/i18n-provider.tsx`:

```tsx
'use client'

import { useEffect, ReactNode } from 'react'
import i18n from '@/lib/i18n/index'
import { clearLegacyLanguage, resolveLanguage } from '@/lib/i18n/language'

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Runs only on the client after hydration — safe to read localStorage.
    // No navigator.language sniff: Pelú is Spanish-first and only an explicit
    // choice (or the signed-in user's preferred_lang, applied by
    // LanguagePreferenceSync) may override it.
    clearLegacyLanguage()
    const resolved = resolveLanguage()
    if (resolved !== i18n.language) {
      i18n.changeLanguage(resolved)
    }
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 6: Write the profile-preference sync**

`AuthProvider` is nested *inside* `I18nProvider`, so the provider itself cannot read `useAuth()`. This tiny component runs inside the auth tree instead.

Create `components/language-preference-sync.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import i18n from '@/lib/i18n/index'
import { useAuth } from '@/lib/contexts/auth-context'
import { getStoredLanguage, isSupportedLanguage } from '@/lib/i18n/language'

/**
 * Applies the signed-in user's preferred_lang, but only when the user has not
 * made an explicit choice on this device. Renders nothing.
 */
export function LanguagePreferenceSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (getStoredLanguage()) return
    const preferred = user?.preferred_lang
    if (!isSupportedLanguage(preferred)) return
    if (preferred !== i18n.language) i18n.changeLanguage(preferred)
  }, [user?.preferred_lang])

  return null
}
```

- [ ] **Step 7: Mount it**

In `app/layout.tsx`, add the import and render `<LanguagePreferenceSync />` inside `<AuthProvider>`, next to the other always-mounted helpers (`<TransitionOverlay />`, `<RCApprovalListener />`, `<Toaster />`):

```tsx
import { LanguagePreferenceSync } from '@/components/language-preference-sync'
```

```tsx
        <LanguagePreferenceSync />
```

- [ ] **Step 8: Verify**

In DevTools → Application → Local Storage, delete both `pelu_lang` and `i18nextLng`. Set the browser's preferred language to English. Reload http://localhost:3000/pets.
Expected: the UI is **Spanish**, and `i18nextLng` does not reappear.

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/i18n/language.ts lib/i18n/__tests__/language.test.ts \
  components/i18n-provider.tsx components/language-preference-sync.tsx app/layout.tsx
git commit -m "fix(i18n): default everyone to Spanish, drop the browser sniff

navigator.language was producing English chrome around Spanish database
content. Resolution is now explicit choice -> profile preferred_lang -> es,
and the legacy i18nextLng key is cleared so it cannot resurrect the sniff."
```

---

## Task 14: The ES/EN language switcher (spec §3.7, Q1 decision)

Must be reachable from the public header **and work logged out**. It goes in `PetsHeader` (which covers /pets, /aliados, /mis-mascotas, /servicios, /chat) and in the `Footer` (which is what the landing page has — `LandingPage` renders no header).

**Files:**
- Create: `components/language-switcher.tsx`
- Create: `components/__tests__/language-switcher.test.tsx`
- Modify: `components/pets/pets-header.tsx`
- Modify: `components/footer.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/language-switcher.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './test-utils'
import { LanguageSwitcher } from '@/components/language-switcher'
import i18n from '@/lib/i18n/index'
import { STORAGE_KEY } from '@/lib/i18n/language'

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  it('marks the current language with aria-current', () => {
    renderWithProviders(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Inglés' })).not.toHaveAttribute('aria-current')
  })

  it('switches the language and persists the choice', () => {
    renderWithProviders(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: 'Inglés' }))
    expect(i18n.language).toBe('en')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en')
  })

  it('labels the group for assistive tech', () => {
    renderWithProviders(<LanguageSwitcher />)
    expect(screen.getByRole('group', { name: 'Cambiar idioma' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/language-switcher.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/language-switcher"`.

- [ ] **Step 3: Write the component**

The `common.language.spanish` / `common.language.english` / `common.language.switch` keys already exist in both locale files — no new keys needed.

Create `components/language-switcher.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { setStoredLanguage, SupportedLanguage } from '@/lib/i18n/language'

const LANGUAGES: { code: SupportedLanguage; labelKey: string; short: string }[] = [
  { code: 'es', labelKey: 'language.spanish', short: 'ES' },
  { code: 'en', labelKey: 'language.english', short: 'EN' },
]

/**
 * Quiet ES/EN text toggle. Works logged out; the choice is persisted to
 * localStorage and takes precedence over the profile's preferred_lang.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('common')
  const current: SupportedLanguage = i18n.language?.startsWith('en') ? 'en' : 'es'

  const choose = (code: SupportedLanguage) => {
    setStoredLanguage(code)
    if (code !== i18n.language) i18n.changeLanguage(code)
  }

  return (
    <div
      role="group"
      aria-label={t('language.switch')}
      className={cn('inline-flex items-center gap-0.5 rounded-xl border border-border p-0.5', className)}
    >
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => choose(language.code)}
          aria-label={t(language.labelKey)}
          aria-current={current === language.code ? 'true' : undefined}
          className={cn(
            'focus-ring rounded-xl px-2 py-1 text-xs font-medium transition-colors',
            current === language.code
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {language.short}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/language-switcher.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Mount it in the header**

In `components/pets/pets-header.tsx`, add the import:

```tsx
import { LanguageSwitcher } from '@/components/language-switcher'
```

Desktop — inside the right-hand `<div className="flex items-center gap-3">` at line 178, as the **first** child (before the logged-out links and the avatar button), so it renders in both auth states:

```tsx
          <LanguageSwitcher className="hidden sm:inline-flex" />
```

Mobile — inside the `<Sheet>`, at the end of the actions `<nav>` (after the logout button, around line 371), add a divider and the switcher:

```tsx
            <div className="mt-2 border-t border-border pt-3 px-4">
              <LanguageSwitcher />
            </div>
```

- [ ] **Step 6: Mount it in the footer**

The landing page renders no header, so the footer is where a logged-out visitor on `/` reaches the switcher.

In `components/footer.tsx`, add the import and place the switcher in the bottom bar:

```tsx
import { LanguageSwitcher } from '@/components/language-switcher'
```

Replace the closing bar (lines 33–35) with:

```tsx
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <span>{t('footer.rights')}</span>
          <LanguageSwitcher />
        </div>
```

- [ ] **Step 7: Verify logged out**

Open an incognito window at http://localhost:3000/. Scroll to the footer, click **EN**. Expected: the page switches to English immediately, `pelu_lang=en` appears in localStorage, and a reload keeps English. Click **ES** and confirm it switches back and persists.

Then check http://localhost:3000/pets — the switcher is in the header on desktop and inside the account sheet on mobile (resize to 375px).

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/language-switcher.tsx components/__tests__/language-switcher.test.tsx \
  components/pets/pets-header.tsx components/footer.tsx
git commit -m "feat(i18n): add an ES/EN language switcher

Quiet text toggle in the public header (desktop + account sheet) and in the
footer, so it is reachable logged out and from the landing page. Marks the
current language with aria-current and persists the choice."
```

---

## Task 15: Clear out the hardcoded strings (spec §3.7)

**Files:**
- Modify: `components/auth/protected-route.tsx:66-67`
- Modify: `app/auth/mfa/enrollment/page.tsx:16-17`
- Modify: `components/footer.tsx:26`
- Modify: `components/pets/pet-detail.tsx:177,183`
- Modify: `components/landing/landing-page.tsx:13-18`
- Modify: `components/pets/pets-header.tsx:29-34,97-98`
- Modify: `components/chat/chat-conversation-list.tsx:18-31,141`
- Modify: `components/chat/chat-message-thread.tsx:27,39`
- Modify: `components/pets/member-add-pet-modal.tsx:403,445`
- Modify: `components/auth/mfa/mfa-passkey-setup.tsx:44,71`
- Modify: `public/locales/{es,en}/{common,pets,landing,auth}.json`

- [ ] **Step 1: Add the new keys (Spanish first)**

`public/locales/es/common.json` — add top-level:

```json
  "home": "Inicio",
  "security": "Seguridad",
  "legal": "Legal",
  "website": "Sitio web",
  "instagram": "Instagram",
```

Inside the existing `"time"` object, add the two labels the chat helper needs:

```json
    "now": "Ahora",
    "yesterday": "Ayer"
```

`public/locales/en/common.json` — same shape:

```json
  "home": "Home",
  "security": "Security",
  "legal": "Legal",
  "website": "Website",
  "instagram": "Instagram",
```
```json
    "now": "Now",
    "yesterday": "Yesterday"
```

`public/locales/es/pets.json` — inside `"chat"`:

```json
    "no_messages": "Sin mensajes",
```

Inside `"member"`:

```json
    "photos_label": "Fotos",
    "photo_alt": "Foto de {{name}}",
```

Inside a new top-level `"roles"` object (replaces the hand-rolled `ROLE_LABELS` map):

```json
  "roles": {
    "adopter": "Adoptante",
    "member": "Miembro",
    "rescue_center": "Centro de rescate",
    "business": "Negocio"
  },
```

`public/locales/en/pets.json`:

```json
    "no_messages": "No messages",
```
```json
    "photos_label": "Photos",
    "photo_alt": "Photo of {{name}}",
```
```json
  "roles": {
    "adopter": "Adopter",
    "member": "Member",
    "rescue_center": "Rescue Center",
    "business": "Business"
  },
```

`public/locales/es/landing.json` — inside the `"partners"` object created in Task 12:

```json
    "logo_alt": "Aliado {{n}}"
```

`public/locales/en/landing.json`:

```json
    "logo_alt": "Partner {{n}}"
```

`public/locales/es/auth.json` — inside `"mfa"`, add a new `"errors"` object (used again in Task 16):

```json
    "errors": {
      "passkey_register": "No pudimos registrar tu passkey",
      "generic": "Algo salió mal. Inténtalo de nuevo."
    },
```

`public/locales/en/auth.json`:

```json
    "errors": {
      "passkey_register": "We couldn't register your passkey",
      "generic": "Something went wrong. Please try again."
    },
```

- [ ] **Step 2: Fix the two breadcrumb label sets**

`components/auth/protected-route.tsx` — add the hook and translate lines 66–67. Add near the top of the component:

```tsx
  const { t } = useTranslation('common')
```

with the import:

```tsx
import { useTranslation } from 'react-i18next'
```

Then:

```tsx
        breadcrumbItems={[
          { label: t('home'), href: '/' },
          { label: t('security'), current: true },
        ]}
```

`app/auth/mfa/enrollment/page.tsx` — same treatment for lines 16–17:

```tsx
import { useTranslation } from 'react-i18next'
```

```tsx
  const { t } = useTranslation(['common', 'auth'])

  const breadcrumbItems = [
    { label: t('home', { ns: 'common' }), href: '/' },
    { label: t('mfa.settings.title', { ns: 'auth' }), current: true },
  ]
```

- [ ] **Step 3: Fix the footer heading**

`components/footer.tsx` line 26:

```tsx
            <h4 className="text-primary-foreground font-semibold mb-3">{t('legal', { ns: 'common' })}</h4>
```

- [ ] **Step 4: Fix the pet-detail link labels**

`components/pets/pet-detail.tsx` lines 177 and 183 — replace the literal `Website` and `Instagram` with `{t('website', { ns: 'common' })}` and `{t('instagram', { ns: 'common' })}`.

- [ ] **Step 5: Fix the partner logo alts**

`components/landing/landing-page.tsx` lines 12–19 — build the array from translations inside the component instead of at module scope:

```tsx
  const partnerLogos = [1, 2, 3, 4, 5, 6].map((n) => ({
    src: `/assets/logos/partner-${n}.svg`,
    alt: t('partners.logo_alt', { n }),
  }))
```

Delete the module-level `PARTNER_LOGOS` constant and pass `partnerLogos` to `<LogoMarquee logos={partnerLogos} … />`.

- [ ] **Step 6: Replace the hand-rolled role map**

`components/pets/pets-header.tsx` — delete the `ROLE_LABELS` constant at lines 29–34, and replace lines 97–98 with:

```tsx
  const roleLabel = user?.role ? t(`roles.${user.role}`, { defaultValue: user.role }) : null
```

This also removes the `lang` variable and the language sniffing at line 97.

- [ ] **Step 7: Replace the chat `timeAgo` helper**

`components/chat/chat-conversation-list.tsx` — delete the module-level `timeAgo` function (lines 18–31) and derive it from translations inside the component. Add to the component body, after `const { t } = useTranslation('pets')`:

```tsx
  const { i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'

  const timeAgo = (dateStr: string): string => {
    const date = new Date(dateStr)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t('time.now', { ns: 'common' })
    if (diffMin < 60) return t('time.minutes_ago', { ns: 'common', count: diffMin })
    if (diffHrs < 24) return t('time.hours_ago', { ns: 'common', count: diffHrs })
    if (diffDays === 1) return t('time.yesterday', { ns: 'common' })
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }
```

Line 141 — the "no messages" placeholder:

```tsx
                  <p className={`text-xs italic truncate ${colors.secondary}`}>{t('chat.no_messages')}</p>
```

- [ ] **Step 8: Derive the thread's date locale from i18n**

`components/chat/chat-message-thread.tsx` — the two module-level helpers hardcode `'es-DO'`. Give them a `locale` parameter:

```tsx
function formatTime(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function getDateLabel(dateStr: string, locale: string, todayLabel: string, yesterdayLabel: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000)

  if (diffDays === 0) return todayLabel
  if (diffDays === 1) return yesterdayLabel
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}
```

In the component, change `const { t } = useTranslation('pets')` to:

```tsx
  const { t, i18n } = useTranslation('pets')
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'
```

And update the two call sites: `getDateLabel(msg.created_at, locale, todayLabel, yesterdayLabel)` and `formatTime(msg.created_at, locale)`.

- [ ] **Step 9: Fix the add-pet modal strings**

`components/pets/member-add-pet-modal.tsx` — the `Fotos` label (around line 403):

```tsx
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('member.photos_label')}</label>
```

The thumbnail alt (around line 445) — use the pet's name so the alt is meaningful:

```tsx
                          alt={t('member.photo_alt', { name: name.trim() || t('details.name') })}
```

- [ ] **Step 10: Fix the passkey setup strings**

`components/auth/mfa/mfa-passkey-setup.tsx` line 44 — the catch-block fallback:

```tsx
      setError(err instanceof Error ? err.message : t('mfa.errors.passkey_register'))
```

Line 71 — the `'...'` loading label. Use the shared spinner instead:

```tsx
import { Spinner } from '@/components/ui/spinner'
```

```tsx
        {loading ? <Spinner className="text-sm" /> : t('mfa.enrollment.passkey_prompt')}
```

Line 28 — the `'Error'` fallback:

```tsx
      setError(beginError || t('mfa.errors.generic'))
```

- [ ] **Step 11: Delete the dead key**

```bash
grep -rn "grid.loading" components/ app/
```

If there are no hits (there should not be), remove `"loading": "Cargando mascotas..."` from the `"grid"` object in both `public/locales/es/pets.json` and `public/locales/en/pets.json`.

- [ ] **Step 12: Verify both locales**

Load http://localhost:3000/chat and http://localhost:3000/mis-mascotas. Switch to EN with the new switcher and confirm the role chip, chat timestamps, "no messages" placeholder, footer "Legal" heading and pet-detail link labels all switch. Switch back to ES and confirm nothing reads as an untranslated key (e.g. `roles.member`).

- [ ] **Step 13: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 14: Commit**

```bash
git add components/auth/protected-route.tsx app/auth/mfa/enrollment/page.tsx \
  components/footer.tsx components/pets/pet-detail.tsx components/landing/landing-page.tsx \
  components/pets/pets-header.tsx components/chat/ components/pets/member-add-pet-modal.tsx \
  components/auth/mfa/mfa-passkey-setup.tsx public/locales/
git commit -m "fix(i18n): translate the remaining hardcoded UI strings

Breadcrumbs, footer Legal heading, pet-detail link labels, partner logo
alts, the hand-rolled role map, the chat timeAgo helper and the hardcoded
es-DO date locales all now go through i18n in both locales."
```

---

## Task 16: MFA API errors return keys, not Spanish literals (spec §3.7)

`lib/api/mfa.ts` has 14 hardcoded-Spanish fallbacks. The `{ data, error }` contract stays; the fallback becomes a translation **key** that components resolve at render time. A backend-supplied `json.error` is still passed through verbatim (the backend already localizes those).

**Files:**
- Modify: `lib/api/mfa.ts` (14 sites)
- Modify: `public/locales/{es,en}/auth.json`
- Modify: `components/auth/mfa/mfa-totp-setup.tsx`, `mfa-passkey-setup.tsx`, `mfa-verify.tsx`, `mfa-enrollment.tsx`

- [ ] **Step 1: Add the error keys (Spanish first)**

`public/locales/es/auth.json` — extend the `"mfa.errors"` object created in Task 15:

```json
    "errors": {
      "passkey_register": "No pudimos registrar tu passkey",
      "generic": "Algo salió mal. Inténtalo de nuevo.",
      "totp_setup": "Error al configurar TOTP",
      "invalid_code": "Código inválido",
      "passkey_begin": "Error al iniciar registro de passkey",
      "passkey_finish": "Error al registrar passkey",
      "email_enable": "Error al habilitar email OTP",
      "regenerate": "Error al regenerar códigos",
      "code_invalid_expired": "Código inválido o expirado",
      "send_code": "Error al enviar código",
      "verify_begin": "Error al iniciar verificación",
      "session_expired": "Sesión MFA expirada",
      "load_methods": "Error al cargar métodos MFA",
      "delete_totp": "Error al eliminar TOTP",
      "delete_passkey": "Error al eliminar passkey",
      "delete_email": "Error al eliminar email OTP"
    },
```

`public/locales/en/auth.json` — same keys:

```json
    "errors": {
      "passkey_register": "We couldn't register your passkey",
      "generic": "Something went wrong. Please try again.",
      "totp_setup": "Couldn't set up your authenticator app",
      "invalid_code": "Invalid code",
      "passkey_begin": "Couldn't start passkey registration",
      "passkey_finish": "Couldn't register your passkey",
      "email_enable": "Couldn't enable email OTP",
      "regenerate": "Couldn't regenerate your recovery codes",
      "code_invalid_expired": "Invalid or expired code",
      "send_code": "Couldn't send the code",
      "verify_begin": "Couldn't start verification",
      "session_expired": "Your MFA session expired",
      "load_methods": "Couldn't load your MFA methods",
      "delete_totp": "Couldn't remove your authenticator app",
      "delete_passkey": "Couldn't remove your passkey",
      "delete_email": "Couldn't remove email OTP"
    },
```

- [ ] **Step 2: Replace the literals with keys**

In `lib/api/mfa.ts`, change each fallback string to its key. Add this comment above the first one:

```ts
// Fallbacks are translation KEYS, not display text — components resolve them
// with t(). A backend-supplied json.error is already localized and passes
// through untouched.
```

Then, line by line:

| line | from | to |
| --- | --- | --- |
| 22 | `'Error al configurar TOTP'` | `'mfa.errors.totp_setup'` |
| 32 | `'Código inválido'` | `'mfa.errors.invalid_code'` |
| 39 | `'Error al iniciar registro de passkey'` | `'mfa.errors.passkey_begin'` |
| 51 | `'Error al registrar passkey'` | `'mfa.errors.passkey_finish'` |
| 58 | `'Error al habilitar email OTP'` | `'mfa.errors.email_enable'` |
| 65 | `'Error al regenerar códigos'` | `'mfa.errors.regenerate'` |
| 84 | `'Código inválido o expirado'` | `'mfa.errors.code_invalid_expired'` |
| 95 | `'Error al enviar código'` | `'mfa.errors.send_code'` |
| 106 | `'Error al iniciar verificación'` | `'mfa.errors.verify_begin'` |
| 116 | `'Sesión MFA expirada'` | `'mfa.errors.session_expired'` |
| 144 | `'Error al cargar métodos MFA'` | `'mfa.errors.load_methods'` |
| 155 | `'Error al eliminar TOTP'` | `'mfa.errors.delete_totp'` |
| 165 | `'Error al eliminar passkey'` | `'mfa.errors.delete_passkey'` |
| 175 | `'Error al eliminar email OTP'` | `'mfa.errors.delete_email'` |

- [ ] **Step 3: Resolve the keys at render time**

Add this helper to `components/auth/mfa/` — create `components/auth/mfa/use-mfa-error.ts`:

```ts
'use client'

import { useTranslation } from 'react-i18next'

/**
 * Resolves an error returned by lib/api/mfa.ts. Values that look like our
 * translation keys are translated; anything else is a backend message that is
 * already localized and is shown verbatim.
 */
export function useMfaError() {
  const { t } = useTranslation('auth')

  return (error: string | null | undefined): string | null => {
    if (!error) return null
    if (error.startsWith('mfa.errors.')) return t(error)
    return error
  }
}
```

Then in each MFA component that renders an API error, wrap it:

`components/auth/mfa/mfa-totp-setup.tsx` — add `const resolveError = useMfaError()` and change both `setError(err)` calls to `setError(resolveError(err))`.

`components/auth/mfa/mfa-passkey-setup.tsx` — same for `setError(beginError || …)` and `setError(finishError)`.

`components/auth/mfa/mfa-verify.tsx` — same for every `setError(...)` fed from an `mfaApi.*` call.

`components/auth/mfa/mfa-enrollment.tsx` — the `emailEnable()` branch currently swallows its error; Plan B wires it to a toast, which must also go through `resolveError`.

- [ ] **Step 4: Verify**

Stop the local API (`docker compose stop` inside `api/`), then load http://localhost:3000/auth/mfa/enrollment and pick "App de autenticación". Expected: a Spanish error message (not the raw string `mfa.errors.totp_setup`). Switch to EN and repeat — the message must be English. Restart the API afterwards.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/api/mfa.ts components/auth/mfa/ public/locales/es/auth.json public/locales/en/auth.json
git commit -m "fix(i18n): MFA API errors return keys instead of Spanish literals

lib/api/mfa.ts kept 14 hardcoded Spanish fallbacks, so English users saw
Spanish errors. Fallbacks are now translation keys resolved at render time;
backend-supplied messages still pass through verbatim."
```

---

## Task 17: Stop the mobile bottom nav from covering the footer (spec §3.9)

`components/pets/public-mobile-nav.tsx:21` is `fixed bottom-0 h-14 sm:hidden`, so it hides the last ~56px of the footer on every public route. Verified on the mobile captures.

**Files:**
- Modify: `components/footer.tsx:11`

- [ ] **Step 1: Add the clearance**

`components/footer.tsx` line 11 — add bottom padding that clears the 56px nav on mobile and drops back to normal at `sm`:

```tsx
    <footer className="pt-12 pb-24 sm:pb-12 px-4 bg-primary text-muted-foreground">
```

(`pb-24` = 96px, comfortably clearing the 56px bar plus the iOS home indicator.)

- [ ] **Step 2: Verify at 375px**

Resize the browser to 375×812 and load http://localhost:3000/, /pets and /aliados. Scroll to the very bottom. Expected: the copyright line and the language switcher are both fully visible above the bottom nav on every route.

- [ ] **Step 3: Commit**

```bash
git add components/footer.tsx
git commit -m "fix(layout): clear the mobile bottom nav in the footer

PublicMobileNav is fixed at 56px tall and was covering the last rows of the
footer on every public route at mobile widths."
```

---

## Task 18: Token-based shadow on the chat divider (spec §3.10)

The last raw color literal in the audited routes.

**Files:**
- Modify: `components/chat/chat-page.tsx:36`

- [ ] **Step 1: Replace the raw rgba shadow**

`components/chat/chat-page.tsx` line 36 — replace `shadow-[4px_0_12px_rgba(0,0,0,0.06)]` with a token-derived value:

```tsx
          className={`w-80 shrink-0 bg-background border-r border-border shadow-[4px_0_12px_var(--color-border)] z-10 flex flex-col overflow-hidden ${
```

- [ ] **Step 2: Verify in both themes**

Load http://localhost:3000/chat. The sidebar's right edge should still read as a soft separation, and in dark mode it must not become a hard black band.

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/chat/chat-page.tsx
git commit -m "style(chat): replace the raw rgba divider shadow with a token"
```

---

## Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, with the new tests present: `format-age`, `language`, `pelu-loading-logo`, `error-state`, `language-switcher`, and design-system tests 16–20.

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: no new errors.

- [ ] **Step 3: Production build**

Run: `bun run build`
Expected: succeeds. This is the real check that the Tailwind v4 `@utility` and `@theme` additions compile.

- [ ] **Step 4: Manual sweep**

With `bun run dev` running, walk the audited routes at 1440px and 375px:

| route | check |
| --- | --- |
| `/` | Spanish by default in a fresh incognito window; footer switcher works; marquee freezes under reduced motion |
| `/pets` | filter pills are `pop-solid` when active and report `aria-pressed`; Tab shows focus rings everywhere |
| `/aliados` | verified badges are `text-success`; cover fallback gradient renders |
| `/chat` | sent bubbles readable; timestamps and date separators follow the switcher |
| `/mis-mascotas` | an adult pet reads "N años", not "72 Meses"; buttons are `rounded-xl` |
| `/servicios` | pending/active icons use warning/success tokens |
| `/auth/mfa/enrollment` | the assembling paw shows during the Suspense load and is visible on the dark background |

- [ ] **Step 5: Update the task log**

Append a "Plan A review" section to `tasks/todo.md` summarizing what shipped and anything deferred.

- [ ] **Step 6: Merge**

Follow the `superpowers:finishing-a-development-branch` skill to open a PR from `feat/ui-pass-foundations` or merge to `main`.

---

## Notes for Plans B and C

These are now available and should be used instead of re-inventing them:

- `formatAge(months)` from `@/lib/utils/format-age`
- `<Spinner className="text-sm" />` from `@/components/ui/spinner`
- `<PeluLoadingLogo />` from `@/components/ui/pelu-loading-logo`
- `<ErrorState message={…} onRetry={…} />` from `@/components/ui/error-state`
- `<LanguageSwitcher />` from `@/components/language-switcher`
- `focus-ring` utility class
- `bg-pop-solid` for text-bearing fills; `pop-550` for accents
- `success` / `success-bg` / `success-foreground` and `warning` / `warning-bg` / `warning-foreground` tokens
- `useReducedMotion()` from `@/lib/about/use-reduced-motion`

Deliberately **left for Plan B/C** even though spec §3.3 lists them under Phase 0 — the shared `ErrorState` exists, but wiring it into each route belongs with that route's work:

- Plan B: `app/mis-mascotas/page.tsx:28`, `chat-conversation-list.tsx:41`, `chat-message-thread.tsx:76`, `adopt-pet-page.tsx:35-45`
- Plan C: `pet-grid.tsx:259-263`, `provider-grid.tsx:68-72`, `app/servicios/page.tsx:38-39`
