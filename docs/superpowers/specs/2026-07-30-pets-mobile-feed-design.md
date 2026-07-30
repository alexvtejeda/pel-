# /pets mobile — post feed redesign

**Date:** 2026-07-30
**Status:** Implemented 2026-07-30 on `feat/pets-mobile-feed` — see
`docs/superpowers/plans/2026-07-30-pets-mobile-feed.md`. Browser verification at
375px is still outstanding.

**Correction to §5.** That section calls all three `Carousel.tsx` changes
"additive and all defaulting to current behaviour so the six existing call sites
are unaffected". That is true of `dragDirectionLock` and `flushItems` but **not**
of the dot buttons, which land everywhere on purpose — an 8×8px click-only
`div` fails the touch-target and keyboard minimums on every screen, not just in
the feed. The six existing carousels therefore did change: new tab stops, a
different horizontal dot spread, and a pointer-blocking band that had to be
neutralised with `pointer-events-none` so it did not swallow swipes.
**Scope:** The `/pets` route **below 640px** only. Companion to
`2026-07-30-pets-desktop-sheet-identity-design.md`, which owns the desktop grid, the
detail Sheet, and the rescue-center avatar plumbing. Neither spec is buildable in
isolation: this one consumes `VerifiedBadge` and `rescue_center.avatar_url` from that one.

---

## 1. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Route shape | A **post feed** — one pet per post, nothing hidden behind a tap |
| 2 | Visual treatment | 2 **snap deck** — inset cards, soft shadow, CSS scroll-snap, position rail |
| 3 | Publisher identity | C — avatar + name + check in **every card header**; no sticky bar |
| 4 | Photos | **Carousel when `photos.length > 1`**, plain image when exactly 1 |
| 5 | Detail view | **None.** The feed is terminal — the card already shows everything |
| 6 | `⋯` menu | Dropped on mobile. The **publisher name is the tappable affordance** |
| 7 | Desktop | Untouched — grid + Sheet, per the companion spec |

Mockups reviewed: `.superpowers/brainstorm/3587820-1785413631/content/`
(`mobile-shape.html`, `mobile-spice.html`, `snap-identity.html`).

---

## 2. What the catalogue actually looks like

The design is drawn around measured facts, not assumptions. From the live API on
2026-07-30 (17 pets, all from AdoptameRD):

- **Every pet has exactly one photo.** No pet has a second image today.
- **The longest description is 69 characters.** Every caption is a single line — no
  clamping, no "ver más".
- All pets resolve a rescue center; **no pet in the payload lacks one** (see §9).

Consequences: a "post" is one photo plus one short line, so the drawer was hiding almost
nothing — which is what makes a terminal feed viable. The carousel exists for the
catalogue's *future*, not its present.

Scroll cost, measured against the mockups: ≈583px per post, ≈18 screens for 17 pets. The
position rail (§6) is the deliberate answer to that number.

---

## 3. Structure

`pets-page.tsx` already branches on `useMediaQuery('(min-width: 640px)')`. That branch
becomes the fork:

- **≥640px** — `PetGrid` + `Sheet` (unchanged)
- **<640px** — `PetFeed`. The `Drawer` and its `PetDetail` instance leave this route

New files:

- `components/pets/pet-feed.tsx` — snap container, position rail, states, one width measurement
- `components/pets/pet-feed-card.tsx` — a single post

**Forced refactor:** the mobile filter popover currently lives *inside* `pet-grid.tsx`
(lines 214-292) and `sourceFilter` is local state there (line 64). Once mobile stops
rendering `PetGrid`, both are unreachable. Extract to
`components/pets/pet-filters.tsx`, and lift `sourceFilter` into `pets-page.tsx` beside
the `vaccinated`/`castrated` state that already lives there. Desktop keeps rendering the
same extracted component in its pill-row form.

Reused as-is: `VerifiedBadge` (companion spec), `formatAge`, `ErrorState`, `Carousel`.

---

## 4. Card anatomy

Card: `rounded-2xl`, `bg-card`, 12px gutters (≈351px wide at 375px), three-layer shadow.

1. **Header** — 26px avatar (`rounded-full`), publisher name 13px/600, `VerifiedBadge`.
   The avatar + name form a single tappable target (≥44px tall) that opens the existing
   `DropdownMenu` — the same component and the same two items the grid's `⋯` uses today
   (`Visitar sitio web de {name}`, `Visitar Instagram de {name}`), anchored to the row
   instead of a corner button. When the publisher has **neither** link, the row renders as
   plain text with no interactive affordance. No `⋯` button anywhere on mobile.
2. **Photo** — `aspect-square`, flush to the card edges (§5).
3. **Body** (`p-3`, ~10px rhythm):
   - Pet name — Manrope 21px/800, `-0.5px` tracking — with `age · gender` right-aligned, 12px muted
   - Caption — 13.5px, `leading-relaxed`
   - Three fact pills: vacunas / castración / tamaño, `pop-450` tint on `pop-800` text
   - Condition block when `conditions.length > 0` — warning tint, `condition_notes` beneath
4. **CTA** — `Adoptar`, `rounded-xl`, `bg-pop-solid`, min height 44px.

CTA logic mirrors `pet-detail.tsx:197-211` exactly and must not diverge: `Adoptar` for
members, `Inicia sesión para adoptar` when logged out, **nothing** for `rescue_center`
and `business` accounts.

**Fact wording** follows the companion spec: nouns, not adjectives (`Vacunas · Al día`,
not `Vacunada`), so the copy never has to agree in gender with the pet. 14 of the 17
current pets are female while the existing locale strings are masculine.

**Publisher branch.** When `pet.rescue_center` is present: avatar + name + check. When it
is absent, the card renders the pet with no publisher row at all — **not** a placeholder
identity. That branch is currently unreachable (§9).

---

## 5. Carousel integration

```
photos.length > 1  →  <Carousel />   (same component, same animation as the sheet)
photos.length == 1 →  <Image />      (no dots, no drag, no timers)
photos.length == 0 →  paw placeholder on bg-secondary
```

Configuration differences from the sheet, each with a reason:

| Setting | Feed | Why |
|---|---|---|
| `autoplay` | **off** | 17 mounted carousels each running a `setInterval` and animating offscreen tracks is the wrong default. Swipe-driven, like Instagram |
| `showPauseButton` | **off** | Nothing to pause once autoplay is off |
| `containerPadding` | `0` | Photo sits flush; the card's `overflow-hidden` does the clipping |
| `flushItems` | **on** | The new prop from the companion spec — drops `rounded-xl` from slides |
| `baseWidth` | measured **once** in `PetFeed` | See below |

Three changes to `components/Carousel.tsx`, all additive and all defaulting to current
behaviour so the six existing call sites are unaffected (the feed becomes the seventh):

1. **`dragDirectionLock`** on the motion track. Today `Carousel.tsx:285` is `drag='x'`
   with no lock; inside a vertically-snapping feed a diagonal thumb drag gets captured
   horizontally and fights the scroll. This is the single biggest interaction risk in the
   design.
2. **Dots become real buttons.** `Carousel.tsx:316` renders `<motion.div onClick>` — no
   role, no keyboard access, 8×8px. For a multi-photo pet that leaves swiping as the only
   usable path through the photos, failing both the touch-target minimum and keyboard
   access. Replace with `<button>` carrying `aria-label="Foto {{n}} de {{total}}"` and a
   ≥44px hit area (visual dot unchanged; padding provides the target). The dot row should
   also size to its content instead of the fixed `w-37.5`, which cramps at 5+ photos.
3. **`flushItems`** — shared with the companion spec; whichever ships first adds it.

**Width measurement.** `DetailCarousel` (`pet-detail.tsx:39-41`) measures `offsetWidth`
in a `useEffect([])` and never re-measures, so orientation change would break it, and 17
copies of that effect is waste. `PetFeed` measures its own content width once with a
`ResizeObserver` — the pattern the testimonial carousel already uses — and passes
`baseWidth` to every card.

---

## 6. Snap behaviour and the position rail

- Container: `scroll-snap-type: y proximity`. **Not `mandatory`** — mandatory fights the
  user on variable-height cards and can trap a slow scroll between two snap points.
- Cards: `scroll-snap-align: start` with `scroll-margin-top` clearing the sticky header.
- **Position rail** on the right edge: one dash per pet, active dash in `pop-550`, driven
  by an `IntersectionObserver` on the cards (no library). `aria-hidden="true"` — the
  existing `aria-live` count line in `pets-page.tsx:111` already announces totals.
- Above **30 pets** the dashes stop being legible; past that threshold render only the
  `n / N` counter.
- `prefers-reduced-motion` disables the `active:scale-[0.99]` press feedback.

---

## 7. States

| State | Treatment |
|---|---|
| Loading | 1.5 card skeletons — the half card is what signals "scroll", so it is not optional |
| Error | Existing `ErrorState` + retry, which replays the last filters via `handleRetry` |
| Empty | Paw glyph, message, and the existing clear-filters button when filters are active |
| Special condition | A warning-tinted block inside the card body carrying `condition_notes`, as the Sheet does (`pet-detail.tsx:143-153`) — **not** the grid's whole-card wash, which would fight the photo at this size |

---

## 8. Accessibility and performance

- Each card is an `<article>` labelled by the pet name.
- All targets ≥44px: CTA, publisher row, carousel dots.
- `next/image` with `sizes="100vw"`; `priority` on the first card only, lazy for the rest.
- Carousels mount **only** for multi-photo pets, so today's catalogue mounts none.
- Windowing is deliberately **not** in scope: 17 cards is nowhere near needing it.
  Revisit past ~100 pets.

---

## 9. Gaps this design is drawn around — not fixed here

1. **A member cannot publish an adoptable pet.** Member pets are a separate domain
   (`lib/api/user-pets.ts` → `/api/v1/user-pets` → `internal/userpets`), whose router
   applies `auth.RequireAuth` to every route — there is no public endpoint. `internal/pets`
   never unions them, and `UserPet` has no adoption semantics (no `status`, `conditions`,
   or publisher). Consequences: the grid's **"Miembros" filter never matches anything**,
   and the non-RC publisher branch in §4 is unreachable. Making independent publishing
   real is a cross-repo product feature, not a fix — it needs its own spec.
2. **`short_slug` does not exist in the API**, so there is no share affordance on mobile
   either. Detail in the companion spec §2.8.
3. **The card avatar depends on the companion spec §5** (`rcSummary` joining
   `users.avatar_url`) and on the settings upload actually persisting. Until that ships,
   the header shows the publisher name and check without an avatar.

---

## 10. i18n

Reuses `detail.facts.*` and `detail.verified_center` from the companion spec, plus, in
both `es` and `en`:

- `feed.photo_position` — "Foto {{n}} de {{total}}" (carousel dot labels)
- `feed.publisher_links` — accessible name for the tappable publisher row

---

## 11. Files touched

**frontend**
- `components/pets/pet-feed.tsx` *(new)*
- `components/pets/pet-feed-card.tsx` *(new)*
- `components/pets/pet-filters.tsx` *(new — extracted from `pet-grid.tsx`)*
- `components/pets/pets-page.tsx` (fork, lifted `sourceFilter`, `Drawer` removed)
- `components/pets/pet-grid.tsx` (filters extracted out)
- `components/Carousel.tsx` (`dragDirectionLock`, dot buttons, `flushItems`)
- `public/locales/{es,en}/pets.json`

No API changes belong to this spec.

---

## 12. Verification

- `npx vitest run` — new tests for `PetFeedCard`: single-photo renders no carousel,
  multi-photo renders one, publisher row absent when `rescue_center` is missing, CTA
  varies by role. Extend the existing filter tests after the extraction.
- `npx tsc --noEmit`. **There is no working lint** (`next lint` was removed in Next 16).
- Baseline: 1 known vitest failure + 2 pre-existing `tsc` errors on `main`. Gate on
  "no others".
- **Browser:** ask the user to rebuild the Docker container, then drive `localhost:3000`
  at 375px — that is the only local setup where the built change and real API data
  coexist. `pelurd.com` only ever shows deployed code.
- **To exercise the carousel at all**, add 2-3 photos to an existing AdoptameRD pet from
  the RC dashboard (`POST /api/v1/pets/{id}/photos`). Uploading a pet as a *member* will
  not work — see §9.
- Touch behaviour (horizontal drag inside vertical snap) must be checked on a real touch
  device or touch emulation, not a mouse.

---

## 13. Risks

- **Horizontal drag inside a vertical snap container** is the main interaction risk.
  `dragDirectionLock` is the mitigation; it needs real-device confirmation.
- `Carousel.tsx` has **6 call sites**; every change here must default to today's behaviour.
- The filter extraction touches desktop code in service of a mobile change — regression
  surface for `/pets` at both breakpoints.
- The feed's value depends on photo quality and quantity. With one square photo per pet,
  the design is carrying a catalogue thinner than the format assumes.

---

## 14. Sequencing

1. Extract `pet-filters.tsx`, lift `sourceFilter` — no visual change; verify both breakpoints.
2. `Carousel.tsx` additive changes (`flushItems`, `dragDirectionLock`, dot buttons) — improves the sheet immediately.
3. `PetFeedCard` + `PetFeed`, wired behind the existing media-query fork.
4. Avatars appear in the header once the companion spec's API change lands.
