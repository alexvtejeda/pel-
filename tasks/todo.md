# Center the registration-flow cards at any viewport (2026-07-31)

Goal: the card on `/auth/role-selection` and `/auth/mfa/enrollment` sits centred
in the space below the nav at every screen size, and content taller than that
space scrolls instead of being clipped.

## The bug

Both shells center with `items-center` / `justify-center` on a wrapper that has
**auto height**. There is no free space to distribute, so the class is a no-op
and the card lands directly under the nav. Measured in Chrome against the
running build:

| viewport  | nav  | card h | gap above | gap below | result                          |
|-----------|------|--------|-----------|-----------|---------------------------------|
| 1920×1080 | 73.9 | 684    | 16        | 306.1     | 145px too high                  |
| 1440×900  | 73.9 | 684    | 16        | 126.1     | 55px too high                   |
| 1024×758  | 73.9 | 684    | 16        | −15.9     | 32px clipped, cannot scroll     |
| 844×390   | 73.9 | 684    | 16        | −383.9    | 400px clipped, Continuar unreachable |
| 390×844   | 73.9 | 1100   | 16        | —         | 362px clipped, cannot scroll    |

The gap above is exactly 16px (the `p-4`) at every size — proof the centering
classes do nothing. `overflow-hidden` on the root turns the overflow into
*unreachable* content rather than a scrollbar.

## The fix

Root becomes a flex column; the content row takes `flex-1`, which resolves to
`100dvh − navHeight` at runtime. No hardcoded nav height: the nav measures
**73.9px**, not the 72px its classes suggest (the breadcrumb line box is 33.9px,
not the Logo's 32px), so any magic number would already be ~2px wrong.

Flex items default to `min-height: auto`, so the row floors at content height —
it centers when there is room and grows-and-scrolls when there is not.

## Todo

- [x] `role-selection.tsx:111` — root to `flex min-h-dvh flex-col overflow-x-clip`
- [x] `role-selection.tsx:120` — wrapper to `flex flex-1 items-center justify-center p-4`
- [x] `role-selection.tsx:121` — `p-16` → `p-6 sm:p-10 lg:p-16` (at 390px the
      description column collapses to ~90px, wrapping to 6–7 lines)
- [x] `onboarding-nav.tsx:40` — add `shrink-0`
- [x] `mfa-enrollment.tsx:201` — root to `flex min-h-dvh flex-col overflow-x-clip`
- [x] `mfa-enrollment.tsx:205` — wrapper to `flex flex-1 items-center justify-center p-4`;
      drop `overflow-y-clip` and the no-op `border-border`
- [x] `mfa-enrollment.tsx:206` — responsive padding, drop duplicate `border-border`
- [x] Verify all three enrollment step heights (shell rebuilt in-browser; the
      route itself redirects to /auth/login without local credentials)
- [x] Re-measure viewports: `gapAbove == gapBelow`
- [x] `npx tsc --noEmit` — only the 2 known pre-existing errors
- [x] `npx vitest run` — 776/777, the one failure pre-existing (transition-overlay.tsx)

## Out of scope

- The three onboarding wizards — scrolling multi-step layouts, centering is not
  the goal there.
- Equal-height role cards (`grid-rows-3`) — aesthetic call, not raised.

## Review

### What changed

Three files, class strings only — no logic touched.

- `role-selection.tsx` — root is now a flex column (`flex min-h-dvh flex-col
  overflow-x-clip`); the content wrapper is `flex flex-1 items-center
  justify-center p-4`; card padding is responsive.
- `onboarding-nav.tsx` — `shrink-0` on the `<nav>`.
- `mfa-enrollment.tsx` (`MfaPanel`, the shell all three steps render through) —
  same pattern; dropped `overflow-y-clip` and two no-op `border-border`.

`flex-1` resolves to `100dvh − navHeight` at runtime, so nothing hardcodes the
nav. That matters: the nav measures **73.9px**, not the 72px its classes imply.

### Measured after (live code, reloaded)

| viewport  | gap above | gap below | centered |
|-----------|-----------|-----------|----------|
| 1920×1080 | 161       | 161.1     | yes      |
| 1440×900  | 71        | 71.1      | yes      |

MfaPanel shell, 390×844: short card 251/251.1 centered, medium 101/101.1
centered, oversized correctly stops centering and scrolls 510px.

Mobile 390px on role-selection: content width 215→295px, description column
~90→143px, wraps 6/4/7→4/3/4 lines, card height 1100→812, overflow 362→74px.

### Correction to the original diagnosis

The first pass reported "the page cannot scroll, Continuar is unreachable at
1024×758 and below". **That was wrong** — a measurement artifact. The app sets
`scroll-behavior: smooth`, so `window.scrollTo(0, N)` followed by a synchronous
`scrollTop` read always returns 0. Re-measured with `behavior: 'instant'`, the
original scrolled fine (`maxScroll: 400`, button reachable).

Consequence: `overflow-hidden` → `overflow-x-clip` fixes **no live bug**. A root
with only a `min-height` grows to fit its content, so it never clipped. The
change is kept as defensive hygiene (it cannot trap vertical overflow if a fixed
height is ever introduced), not as a fix. The real bug was always just the
centering, which is what was asked about.

## Follow-up: animate the card height between enrollment steps

- [x] `AnimatedHeight` in `mfa-enrollment.tsx` — wraps `MfaPanel`'s children
- [x] Guard for jsdom's missing ResizeObserver
- [x] Verified on the real route (registered a local throwaway account)

`height: auto` is not interpolable, so a CSS transition cannot do this. Used the
same idiom `components/Stepper.tsx` already uses — measure the content, animate
an explicit height with a `motion.div` spring. Stepper itself is not reusable
here for the reason already noted in the `MfaPanel` docstring (it owns its own
next/back buttons).

Three details worth keeping:

- **`initial={false}`** — on first paint `height` is still undefined; animating
  in from 0 would make every mount look like a step change.
- **`overflow: hidden` only while animating.** Left on permanently it clips what
  deliberately paints outside the content box: the method buttons' `shadow-post`
  (32px blur) and `focus-ring`'s `outline` (2px at 2px offset) — the latter is a
  keyboard-accessibility regression, not just cosmetic.
- **ResizeObserver, not a step-keyed effect.** It also catches height changes the
  step swap does not cause. Measured proof below: the TOTP step first renders
  short, then grows when the QR code resolves, and the wrapper re-targets.

Measured on `/auth/mfa/enrollment` at 1440×900:

| transition | height | frames | duration | overflow |
|---|---|---|---|---|
| step 1 → 2 (TOTP) | 451 → 378 → 544 | 19 | 463ms | hidden during, visible at rest |
| step 1 → 3 (email → recovery codes) | 451 → 500 | 12 | ~440ms | hidden during, visible at rest |

Card stays centred throughout — 85 / 85.1 on the recovery step.

### Regression caught and fixed

The first version threw `ReferenceError: ResizeObserver is not defined` in
jsdom, taking the suite from 1 failure to **25**. Fixed with the guard
`components/pets/pet-feed.tsx:44` already uses. Leaving `height` undefined is
the correct degradation: `offsetHeight` is 0 in a layout-less environment, and
committing that would collapse the card. Back to 776/777.

## Follow-up 2: MfaPanel must never overflow the page

- [x] Reproduced: step 3 overflowed the page by **106px at 1280×720**
- [x] Root becomes `h-dvh` (was `min-h-dvh`), panel `max-h-full`, content area scrolls
- [x] Verified across 4 viewports + step 1

The panel is now capped at the viewport and the content area scrolls inside it,
so the page itself can never scroll.

**The non-obvious part.** The first attempt (`max-h-full` + `min-h-0`) did
nothing — still 106px of page overflow. A percentage `max-height` resolves
against a *definite* parent height, and `min-h-dvh` is not definite, so the cap
silently computed to `none`. Changing the root to `h-dvh` is what makes it bite,
and a definite root height is the invariant itself.

`min-h-0` on the centring wrapper is also load-bearing: without it `flex-1`
grows to its content and `max-h-full` would resolve against that grown height.

| viewport  | page overflow | panel fits | internal scroll |
|-----------|---------------|------------|-----------------|
| 1920×1080 | 0             | yes        | 0 — centred 143/143.1 |
| 1280×720  | **0** (was 106) | yes      | 106             |
| 390×844   | 0             | yes        | 6               |
| 844×390   | 0             | yes        | 388, confirm button reachable |

Centring is unchanged when the content fits; the cap only engages when it does
not. The scroll area carries `-mx-2 px-2` so `focus-ring`'s outline keeps 8px of
bleed inside the scroll box (it needs 4) — a bare scroll container would clip it.

### Open: the nested padding is why it scrolls this early

Step 3 pays **256px of vertical padding before any content**: the panel's
`lg:p-16` (64px top + bottom) plus the recovery card's own `p-16` nested inside
it. That is the whole reason a 720px-tall laptop needs to scroll at all —
reclaiming ~106px would remove it. Not changed, because the inner `p-16` looks
like a deliberate choice. Options: inner `p-16`→`p-8` (64px) plus panel
`lg:p-16`→`lg:p-10` (48px) = 112px, enough to clear it.

## Follow-up 3: logo loader during the registration flow's async work

Decided with the user: **only** while the real awaits run (not route changes,
not intra-wizard steps, not `/adopt`), and a **new centered logo loader**
(dimmed backdrop, pulsing mark, loops until the await resolves).

### Todo

- [x] `components/logo-loader.tsx` — fixed dimmed overlay, centered pulsing mark
- [x] `app/globals.css` — `--animate-logo-pulse` + `@keyframes`, next to `--animate-marquee`
- [x] `common.json` es/en — new `saving` key
- [x] Wire `role-selection.tsx` (`loading`) — covers `setRole`
- [x] Wire `member-wizard.tsx` (`submitting`) — profile PATCH + `createUserPets`
- [x] Wire `rescue-center-wizard.tsx` (`submitting`, `petSubmitting`) — `createRescueCenter`,
      `createPet` + `uploadPhotos`, `getMethods`
- [x] Wire `business-wizard.tsx` (`submitting`) — `createBusiness`, `uploadBusinessPhoto`, `getMethods`
- [x] Verified in the browser against a throttled API
- [x] `npx tsc --noEmit` (2 pre-existing) + `npx vitest run` (776/777) at baseline

### Measured

Throttling `/auth/role` by 1800ms on a real submit: the loader appeared on
click, stayed **2068ms**, ran `logo-pulse` at `1.6s`, announced "Guardando…",
sat at `z-index: 50`, and cleared only once `/auth/onboarding/member` painted.

### Three fixes the wiring turned up

- `role-selection.tsx` called `setLoading(false)` *after* `router.push`. Since
  push resolves before the next route paints, that flashed the role picker back
  for a frame. Removed — the component unmounts on navigation anyway. Same
  pattern removed from `member-wizard.tsx`'s no-pets branch.
- Both `rescue-center-wizard.tsx` and `business-wizard.tsx` cleared `submitting`
  *before* `await getMethods()`, so the loader blinked off while a second round
  trip was still deciding which screen came next. Moved the clear after it.
- Pulse opacity floor raised 0.55 → 0.7. `logo.svg` is a fixed dark slate
  (`#3b424c`) with no `currentColor`, so a deep trough read as washed out
  rather than as a pulse; scale carries the motion instead.

### Known limitation

`logo.svg` hardcodes its colours, so if these screens ever render on a genuinely
dark surface the mark will sink into it. Today the `dark` class on the auth
shells still resolves to a light background, so it reads fine — the same
assumption `components/logo.tsx` already makes in the nav.

### Two constraints that decide the implementation

**CSS keyframes, not Framer Motion.** `CLAUDE.md` records that `LogoLoop` was
replaced by a CSS `@keyframes` marquee because `requestAnimationFrame` freezes
on mobile Safari after React re-renders. A loader that loops for the length of a
photo upload is exactly that hazard, so the pulse runs on the compositor via CSS
and `motion-reduce:animate-none` handles reduced motion — no JS timer at all.

**Do not reuse `components/logo.tsx`.** It wraps the mark in `<Link href="/">`,
so dropping it into a blocking overlay would make clicking the loader navigate
home mid-submit. The loader renders the `<Image>` directly.

### Not done

- Equal-height role cards (`grid-rows-3`) — never confirmed as wanted.
- `/auth/mfa/enrollment` not driven end-to-end: it redirects to `/auth/login`
  and there are no local test credentials. Shell geometry was verified by
  rebuilding the exact `MfaPanel` DOM against the loaded stylesheet; the real
  route's three steps have not been seen rendered.
- The three onboarding wizards — out of scope by design.
