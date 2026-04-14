# Public Route Transitions — Design

**Date:** 2026-04-14
**Status:** Approved for planning
**Scope:** Smooth animated transitions between public routes (landing, /pets, /aliados, /eventos, /about). Replace abrupt swaps and loading flashes with a persistent header + coordinated overlay animations.

## Goals

1. The `PetsHeader` renders **once** across landing, /pets, /aliados, /eventos — no remount flicker, no auth-state re-read on every navigation.
2. Lateral moves between grid routes (landing ↔ /pets ↔ /aliados ↔ /eventos) use a **skeleton-swap** transition: a `bg-card` sheet covers the hard route swap, and the target page renders skeletons for at least 150ms before the sheet clears.
3. Crossings into or out of `/about` use a **circle-from-logo wipe** with a **shared-element logo handoff**: the small `PetsHeader` logo scales up into the big scene-1 logo (and reverses on exit), while a `clip-path: circle()` mask expands from the logo's position.
4. Mid-transition navigation is **locked** — links are disabled until the current animation completes.
5. Respects `prefers-reduced-motion` — instant swap with no animation.

## Non-goals

- Transitions for `/p/[slug]`, `/adopt/[pet-id]`, `/chat`, authenticated dashboards, auth routes. Those use default Next navigation.
- Framer Motion layout animations on grid cards themselves (deferred polish).
- Transitions between public and authenticated routes (deferred until dashboard transition work).

## Architecture

### Route structure

```
app/
├── layout.tsx                     # Root — mounts RouteTransitionProvider + TransitionOverlay
├── (public)/                      # NEW route group — shared public shell
│   ├── layout.tsx                 # Mounts single persistent PetsHeader
│   ├── page.tsx                   # landing (moved from app/page.tsx)
│   ├── pets/page.tsx              # moved from app/pets/page.tsx
│   ├── aliados/page.tsx           # moved from app/aliados/page.tsx
│   └── eventos/page.tsx           # moved from app/eventos/page.tsx
├── about/page.tsx                 # stays OUTSIDE the group — owns the big scene-1 logo
├── auth/…                         # unchanged
└── dashboard/…                    # unchanged
```

- The four public page components (`landing-page.tsx`, `pets-page.tsx`, `aliados-page.tsx`, `events-page.tsx`) have their internal `<PetsHeader />` removed.
- `/about` lives outside the group because it has no header and its transition is visually distinct. The overlay (hoisted to the root layout) still covers both the group and /about, so the handoff works across the group boundary.

### Components

| Component | Location | Purpose |
|---|---|---|
| `RouteTransitionProvider` | `components/transitions/route-transition-context.tsx` | Client context. Holds state machine. Exposes `navigate(href)` and `useRouteTransition()` hook. |
| `TransitionOverlay` | `components/transitions/transition-overlay.tsx` | Fixed full-viewport portal. Renders circle-wipe + morphing logo OR `bg-card` sheet based on current transition type. |
| `TransitionLink` | `components/transitions/transition-link.tsx` | Drop-in replacement for `next/link`. On click, calls `navigate(href)` instead of default nav. Accepts all `next/link` props. |
| `usePublicHeaderLogoRect` | `components/transitions/use-public-header-logo-rect.ts` | Hook called by `PetsHeader` logo element. Registers its bounding rect in provider via `ResizeObserver`, so the overlay knows the circle origin and logo start position. |

### State machine

```
status: 'idle' | 'exiting' | 'entering'
type:   'skeleton' | 'about-in' | 'about-out' | null
logoRect: DOMRect | null
```

- `idle`: no transition active. `navigate()` is live. Links work.
- `exiting`: overlay is animating in. Links are **locked** (all `TransitionLink`s short-circuit). `router.push()` has not fired yet.
- `entering`: `router.push()` has fired. Overlay is animating out. Links remain **locked**.
- Back to `idle` once overlay clears.

### Transition type resolution

Resolved from `(from, to)` pathname pair when `navigate()` is called:

| From | To | Type |
|---|---|---|
| any public grid | `/about` | `about-in` |
| `/about` | any public grid | `about-out` |
| public grid A | public grid B (different) | `skeleton` |
| same pathname | same pathname | no-op, `navigate` returns immediately |

Public grids: `/`, `/pets`, `/aliados`, `/eventos`.

## Transition flows

### about-in: public → /about (~800ms)

1. `navigate('/about')` called
2. Provider reads `logoRect` from context (registered by persistent header)
3. `status = 'exiting'`, `type = 'about-in'`
4. `TransitionOverlay` mounts. Two animations run **in parallel** (600ms):
   - **Circle mask**: `clip-path: circle(0 at <logoX> <logoY>)` → `circle(150% at <logoX> <logoY>)`, filled with `bg-background`
   - **Logo FLIP**: cloned `<Image>` of the Pelú logo, starts at `logoRect`, animates via `transform: translate + scale` to the /about scene-1 logo's target rect
5. `sessionStorage['pelu:skip-scene-1-intro'] = '1'` set just before `router.push`
6. `router.push('/about')` + `window.scrollTo(0, 0)` while overlay fully covers the viewport
7. `status = 'entering'`. Scene 1 mounts in its **settled state** (reads and clears the sessionStorage flag on mount; if present, all intro `motion` initial states are set to their `animate` values)
8. Overlay fades out (200ms)
9. `status = 'idle'`, unlock

### about-out: /about → public (~800ms)

Symmetric reverse:

1. `navigate('/pets')` (or wherever) called from /about
2. Provider still holds `logoRect` (set by header when group was last mounted; but since header is currently unmounted, we need the target position instead — see "logoRect persistence" below)
3. `status = 'exiting'`, `type = 'about-out'`
4. Overlay: circle **collapses** toward target header logo position. Logo cloned from /about scene-1 position, animates back down to `logoRect` (header slot)
5. `router.push(target)` + scroll reset
6. `status = 'entering'`. `(public)` layout remounts, persistent header appears
7. Overlay fades out (200ms)
8. `idle`, unlock

**logoRect persistence**: `logoRect` is stored in the provider (which lives in root layout, never unmounts). When the `(public)` layout's header is mounted, `usePublicHeaderLogoRect` updates it. When the header unmounts (user is on /about), the last known rect is retained. On `/about → public`, the provider uses the retained rect as the target — this is safe because the header slot is stable (top-left, fixed dimensions).

### skeleton: grid → grid (~550ms floor)

1. `navigate('/aliados')` called
2. `status = 'exiting'`, `type = 'skeleton'`
3. Overlay sheet (`bg-card`, opacity 0 → 1) crossfades in (200ms)
4. `router.push('/aliados')` + `scrollTo(0, 0)`
5. `status = 'entering'`. Target page reads `useRouteTransition()`, sees `entering + skeleton`, forces loading state `true` for at least 150ms even if data is cached
6. Once `(minSkeletonTime elapsed) AND (data loaded)` → overlay fades out (200ms)
7. `idle`, unlock

Floor: 200 (exit) + 150 (min skeleton) + 200 (enter) = 550ms. Real loads extend the middle segment only.

## Navigation integration

- **`TransitionLink`** wraps `next/link`. All internal links between public routes use it. External links and links to non-public routes use plain `next/link`.
- **Browser back/forward**: `popstate` listener in `RouteTransitionProvider` intercepts. Runs the same flow, derives type from `(currentPathname, targetPathname)`. Scroll restoration is delegated to Next (provider does NOT call `scrollTo(0, 0)` during popstate).
- **Mid-transition clicks**: while `status !== 'idle'`, all `TransitionLink` clicks short-circuit (return early). `popstate` while non-idle is ignored.
- **Direct URL entry / external referrer**: no transition plays. Pages mount normally. `status` stays `idle`.

## Scene 1 settled state

Scene 1's current intro animations (BackgroundBeams, fade-in pitch text, header reveal scroll animation) must be **pre-played** when entering via wipe (Q6 = B).

Mechanism: `sessionStorage['pelu:skip-scene-1-intro']`. Scene 1's top-level component reads this on mount:

```tsx
const skipIntro = typeof window !== 'undefined'
  && sessionStorage.getItem('pelu:skip-scene-1-intro') === '1'
if (skipIntro) sessionStorage.removeItem('pelu:skip-scene-1-intro')
```

When `skipIntro`, all child `motion` components receive `initial={false}` or are pre-set to their `animate` state. Beams are rendered immediately. Scroll-driven header reveal starts in its "settled" position (progress=1).

## Accessibility

- `prefers-reduced-motion: reduce`:
  - Overlay renders as an instant opaque fill (`bg-background`), immediate `router.push`, immediate fade out (50ms linear).
  - No circle animation, no logo scaling.
  - Nav still locks for the ~50ms swap to prevent double-clicks.
  - Scene 1 intro animations also respect the preference (existing behavior, unchanged).
- Focus management: after a transition completes, focus moves to the new page's first `<h1>` (announced to screen readers). Existing behavior for direct navigation is unchanged.
- `aria-live="polite"` hidden element in the provider announces "Cargando..." during `exiting` status.

## Error handling

- If `router.push()` fails or takes longer than 3s to settle: overlay fades out forcibly, `status → idle`. User sees whatever state the target page landed in.
- SSR/static export safety: `RouteTransitionProvider` is a client component (`'use client'`). `TransitionOverlay` renders `null` on server. No hydration mismatch.
- `logoRect` may be `null` on first paint (before `ResizeObserver` fires). `navigate` falls back to a centered origin `{ x: vw/2, y: 80 }` if `logoRect` is null.

## Testing

**Vitest unit tests** (`components/__tests__/transitions/`):
- `route-transition-context.test.tsx`: state machine transitions (idle → exiting → entering → idle), type resolution for all (from, to) pairs, lock behavior during non-idle states
- `transition-link.test.tsx`: short-circuits on click when status is non-idle, calls `navigate` with correct href otherwise, passes through all `next/link` props
- `transition-overlay.test.tsx`: renders `null` when idle, renders correct variant per type, respects `prefers-reduced-motion`

**Manual smoke test checklist** (documented in the plan):
- All 4 grid routes → each other grid route (12 combinations): skeleton transition, no flash, no scroll jump
- landing/pets/aliados/eventos → /about: circle wipe, logo handoff, scene 1 settled on arrival
- /about → landing/pets/aliados/eventos: reverse wipe, logo handoff, header reappears cleanly
- Back/forward buttons mid-session (mixed public routes + /about)
- Click-spam a link during transition: second click ignored, no double-navigation
- `prefers-reduced-motion` forced: all transitions become instant with no animation
- Direct URL entry (e.g. paste `/about` into address bar): no transition, normal mount
- Reload during a transition: cleanly lands on current URL, no stuck overlay

## File changes summary

**New files:**
- `app/(public)/layout.tsx`
- `components/transitions/route-transition-context.tsx`
- `components/transitions/transition-overlay.tsx`
- `components/transitions/transition-link.tsx`
- `components/transitions/use-public-header-logo-rect.ts`
- `components/__tests__/transitions/route-transition-context.test.tsx`
- `components/__tests__/transitions/transition-link.test.tsx`
- `components/__tests__/transitions/transition-overlay.test.tsx`

**Moved files:**
- `app/page.tsx` → `app/(public)/page.tsx`
- `app/pets/page.tsx` → `app/(public)/pets/page.tsx`
- `app/aliados/page.tsx` → `app/(public)/aliados/page.tsx`
- `app/eventos/page.tsx` → `app/(public)/eventos/page.tsx`

**Modified files:**
- `app/layout.tsx` — wrap children in `RouteTransitionProvider`, mount `TransitionOverlay`
- `components/landing/landing-page.tsx` — remove `<PetsHeader />`
- `components/pets/pets-page.tsx` — remove `<PetsHeader />`, consume `useRouteTransition()` for skeleton hold
- `components/aliados/aliados-page.tsx` — remove `<PetsHeader />`, consume `useRouteTransition()`
- `components/events/events-page.tsx` — remove `<PetsHeader />`, consume `useRouteTransition()`
- `components/pets/pets-header.tsx` — logo element registers rect via `usePublicHeaderLogoRect`
- `components/about/about-header.tsx` (or scene-01-pitch) — reads `sessionStorage['pelu:skip-scene-1-intro']`, pre-plays when set
- Internal navigation call sites in landing/pets/aliados/eventos → use `TransitionLink` instead of `next/link` for cross-public-route nav

## Open questions

None — all resolved during brainstorming (Q1–Q8).

## Decisions log

- Q1: Type B wipe runs in both directions (symmetrical logo handoff)
- Q2: Lateral skeleton swap always fires, even on cached data (consistent rhythm)
- Q3: `/p/[slug]` and `/adopt/[pet-id]` out of scope
- Q4: Circle expand from logo position (not sheet slide, not curtain)
- Q5: Logo scales during circle expand (parallel, single gesture)
- Q6: Scene 1 intro animations skipped on wipe entry (pre-played settled state)
- Q7: Hybrid timing — fixed exit crossfade + data-driven skeleton with floor
- Q8: Navigation locked during in-flight transition
