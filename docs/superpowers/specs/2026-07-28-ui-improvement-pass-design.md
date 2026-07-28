# UI Improvement Pass — Public & Member Routes

- **Date:** 2026-07-28
- **Status:** Approved — all §2 questions decided by Alex on 2026-07-28
- **Author:** Claude (Fable 5), from a live-site audit + line-level code audit
- **Executor:** Opus 5 (via writing-plans → execution)
- **Backend changes:** none required. This spec is 100% frontend.

## 1. Context

Alex is running a design-improvement pass over pelurd.com. The audit combined:

1. **Live production captures** (real Windows Chrome over CDP, desktop 1440px +
   mobile 375px) of every in-scope route — screenshots in
   `.playwright-mcp/audit-*.jpeg`.
2. **Line-level code audit** of every in-scope route (three parallel readers).
3. **ui-ux-pro-max design intelligence** (style/product/landing/UX guideline
   databases).

**In scope:** `/`, `/pets`, `/aliados`, `/adopt?id=<uuid>`, `/chat`,
`/mis-mascotas`, `/servicios`, `/auth/mfa/enrollment`.
**Deferred (do not touch):** `/dashboard/admin`, `/dashboard/business`,
`/about` (scrollytelling is its own project — see
`2026-04-13-about-scrollytelling-design.md`).

### Design direction (from ui-ux-pro-max, adapted)

The recommendation engine suggested a rebrand (new palette, rounded fonts).
**Rejected** — Pelú keeps its existing OKLCH brand (`slate`/`zinc`/`dark red`/
`pop` teal) and Inter/Source Sans 3/Manrope. What we adopt instead:

- **"Accessible & Ethical" style discipline:** visible focus rings, WCAG AA
  contrast, reduced-motion support, ≥44px touch targets, semantic tokens only.
- **Community-landing conversion pattern:** social proof before CTA,
  testimonials with photo+name+role, warm/welcoming copy.
- **State discipline:** every async surface has distinct loading (skeleton
  >300ms), empty (message + action), and error (message + retry) states.
  Error must never be indistinguishable from empty.
- **Motion discipline:** 150–300ms micro-interactions, `ease-out` enter /
  `ease-in` exit, `prefers-reduced-motion` respected, transform/opacity only.

### House rules that this spec enforces (from `frontend/CLAUDE.md`)

Cards `rounded-2xl`; buttons `rounded-xl`; circles only for avatars/status;
Font Awesome only; Spanish-first i18n (add both locales, ES first); tokens from
`app/globals.css` `@theme` — no raw Tailwind palette colors (amber/green/etc.),
no raw hex/rgba/OKLCH literals in components.

---

## 2. Product decisions (made by Alex, 2026-07-28)

- **Q1 — Locale detection: (a) DECIDED.** Default everyone to Spanish and add
  a visible language switcher. Remove the `navigator.language` sniff in
  `components/i18n-provider.tsx:12` (it was creating the mixed-language
  experience: English chrome around Spanish DB content). Persist an explicit
  user choice (e.g. `localStorage` + the existing `preferred_lang` field on
  the auth user) and only that choice may override the `es` default. The
  switcher must be reachable from the public header and work logged-out.
- **Q2 — Landing placeholder content: (a) DECIDED.** Hide the logo marquee
  until real partner logos exist; keep 2–3 credible testimonials (drop the
  filler down from 5 placeholders). Leave `LogoMarquee` in the codebase
  behind a trivial flag/comment so it can return when real logos land.
- **Q3 — `/aliados` "Contactar": (c) DECIDED — wire it to chat.** This spans
  backend + frontend, so it is **its own spec** at the `pelu/` root (outside
  both repos):
  `pelu/docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md`.
  Within *this* spec, `/aliados` §6 only prepares the ground: the CTA stays
  hidden until that spec ships (do not leave a permanently-disabled button).
- **Q4 — Primitive radius: yes, DECIDED.** Fix `components/ui/button.tsx:8`,
  `components/ui/card.tsx:12`, `components/ui/alert-dialog.tsx:39` to house
  values. Restyling the deferred dashboards via the shared primitives is
  accepted and desired.
- **Q5 — MFA forced dark: keep, DECIDED.** The dark auth aesthetic stays;
  everything else in §11 still applies.

---

## 3. Phase 0 — Cross-cutting foundations

Do these first; every route section below depends on them.

### 3.1 Primitive radius fixes (root cause of most radius violations)

- `components/ui/button.tsx:8` — default `rounded-md` → `rounded-xl`.
  Remove the now-redundant `className="rounded-xl"` overrides at call sites
  (`app/mis-mascotas/page.tsx:68,83`, others found by grep).
- `components/ui/card.tsx:12` — `rounded-xl` → `rounded-2xl`.
- `components/ui/alert-dialog.tsx:39` — `sm:rounded-lg` → `sm:rounded-2xl`;
  its action/cancel buttons inherit the Button fix.
- Consider extending `components/__tests__/design-system.test.ts` to cover
  these specific primitives so they can't regress (ui/ is currently exempt).

### 3.2 One loading idiom + skeletons + the assembling-logo loader

Today there are **three spinner idioms** (FontAwesome `faSpinner`, hand-rolled
`border-b-2` ring div, and nothing/blank). Standardize into a three-tier
system:

1. **Full-page loads → `<PeluLoadingLogo />`** — the branded assembling-paw
   animation described in §3.2.1. Use it wherever a whole route is gated:
   `components/auth/protected-route.tsx:46` (auth gate), page-level
   `<Suspense>` fallbacks (`app/adopt/page.tsx:15`,
   `app/auth/mfa/enrollment/page.tsx:47` — both currently blank),
   `/adopt`'s initial load (`adopt-pet-page.tsx:76-82`), `/servicios` initial
   load if a skeleton doesn't fit.
2. **List/grid surfaces → skeletons** matching the real card shape (see
   `/aliados` mismatch in §6): `/mis-mascotas` grid, `/chat` conversation
   list. `/pets` already has a good one; reuse its pattern.
3. **Inline/in-component waits → `components/ui/spinner.tsx`** (single
   FontAwesome-based spinner, sized via `text-*`): button-level pending
   states, older-messages loader, `mfa-totp-setup.tsx:58`.

Never render `<Suspense fallback={null}>` for a whole page.

#### 3.2.1 `PeluLoadingLogo` — the paw assembles itself

Alex's request: the bland full-page loading states become a small animation of
the Pelú paw logo forming from its pieces. **A working reference already
exists in the thesis deck** — `pelu/decks/tesis/index.html:361-377` (SVG) and
`:96-109` (CSS). Port it faithfully:

- **Component:** `components/ui/pelu-loading-logo.tsx` — client component
  rendering the inline 7-piece SVG (viewBox `0 0 332.83 352.62`) with
  per-piece CSS vars. Optional `size` prop (default ~96–120px for loading
  contexts; the deck uses 184px), optional `label` (default
  `t('common.loading')` — rendered as visible text under the logo and as the
  SVG's `aria-label`).
- **SVG source:** copy the 7 `<path data-assemble>` pieces exactly as they
  appear in the deck (U, left wing, right wing, 4×3px splinter, tail, left
  pad, right pad). The deck's comments document two hard-won details that
  MUST be preserved:
  - the source `assets/logo.svg` contains a flattened full-silhouette first
    path — **discard it**, or the logo "assembles" as one solid piece and the
    effect dies (the 7 remaining pieces cover it to within 0.29%);
  - the tiny splinter path must share the right wing's exact delta and delay
    (`--d:.12s;--fromX:130px;--fromY:-30px;--fromRot:16deg`) so it travels
    *with* the wing instead of reading as a stray speck.
- **Animation (port verbatim from the deck):**
  ```css
  @keyframes pelu-assemble {
    from { opacity: var(--fromO, 0);
           transform: translate(var(--fromX, 0), var(--fromY, 0))
                      rotate(var(--fromRot, 0deg)); }
    to   { opacity: 1;
           transform: translate(0, 0) rotate(var(--toRot, 0deg)); }
  }
  svg [data-assemble] { transform-box: fill-box; transform-origin: center; }
  @media (prefers-reduced-motion: no-preference) {
    [data-assemble] { animation: pelu-assemble var(--dur, .7s)
                      cubic-bezier(.16, 1, .3, 1) var(--d, 0s) both; }
  }
  ```
  `transform-box: fill-box` is load-bearing — without it pieces rotate around
  the viewBox origin, not their own centers. Keep the stagger (`--d` 0 →
  .12s → .24s → .36s, `--dur: .7s` ≈ 1.06s total). Scope the keyframes/rules
  inside the component (CSS module or a `@layer components` block in
  `globals.css`) — do not leak `[data-assemble]` globally, the attribute is
  also a deck convention.
- **Loop behavior:** the assemble plays **once**, then the assembled logo
  idles with a subtle breathing pulse (e.g. `opacity 1 → .75 → 1` over ~2s,
  infinite, transform/opacity only) so a longer load still reads as alive.
  Do not re-trigger the full assembly on a loop — pieces flying every second
  is noise, not delight.
- **Reduced motion:** with `prefers-reduced-motion: reduce` the media query
  never applies the animation, so the logo simply renders assembled and
  static — that's the correct fallback; keep the visible loading label.
- **Colors:** the deck hardcodes the logo's multitone slate fills
  (`oklch(44.6% …)`, `oklch(37.3% …)`, `#314158`). Keep them as literal fills
  (they ARE the logo's brand colors, same as the header logo) — but verify
  against the MFA forced-dark background and add a `dark:` treatment only if
  the slate pieces lack contrast there.
- **Tests:** render test (7 paths present, `role="img"` + accessible name);
  design-system test exemption not needed (inline SVG ban — add this
  component to the allowed list the same way `components/ui/` is exempted, or
  place it in `components/ui/` which is already exempt).

### 3.3 Error ≠ empty, and every error gets a retry

Confirmed live: a transient API failure on `/chat` leaves an **infinite
sidebar spinner**; on `/mis-mascotas` and `/chat` a failure renders the
*empty* state ("you have no pets/conversations") because `error` is
destructured away. Fix pattern: keep `{ data, error }`, branch three ways,
error state = icon + translated message + retry button re-invoking the
existing fetch callback.

- `app/mis-mascotas/page.tsx:28`
- `components/chat/chat-conversation-list.tsx:41`
- `components/chat/chat-message-thread.tsx:76`
- `components/adopt/adopt-pet-page.tsx:35-45` (add `.catch`; currently an
  infinite spinner on network failure)
- `components/pets/pet-grid.tsx:259-263` (has error text; add retry)
- `components/aliados/provider-grid.tsx:68-72` (renders **raw API error
  string**; translate + retry)
- `app/servicios/page.tsx:38-39` (bare `<p>`; add retry — `load` is already a
  `useCallback`)

### 3.4 Focus, active, and toggle semantics (site-wide gap)

Grep confirms **zero `focus-visible:` styles and zero `aria-pressed`** across
all audited feature components.

- Define one ring recipe (e.g. `focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-pop-550`) and apply to
  every interactive element in the audited routes: filter pills, cards,
  chips, icon buttons, links, send button, method cards.
- Add `active:` feedback to primary buttons (e.g. `active:scale-[0.98]` or a
  darker shade) — 150–300ms `transition`.
- Stateful toggle pills/chips get `aria-pressed` (pets filters
  `pet-grid.tsx:114-165`, servicios chips
  `service-provider-form.tsx:150-181`).
- Icon-only buttons get `aria-label` (inventory: `pet-grid.tsx:329-331`
  three-dot menu; `chat-message-thread.tsx:219,321,347` back/attach/send;
  `member-add-pet-modal.tsx:227,448,458` close/remove/add;
  `mfa-totp-setup.tsx:79-81` copy).

### 3.5 Contrast: text on `pop-550`

White text on `bg-pop-550` (light cyan, OKLCH L≈0.73) is well below AA for
normal text; it's used on chat sent-bubbles + timestamps
(`chat-message-thread.tsx:280-285`), submit buttons
(`form-renderer.tsx:128`), CTAs. Choose the darkest `pop` shade that clears
4.5:1 with white (verify with a contrast checker — likely `pop-700`/`pop-750`
territory) and use it for **text-bearing filled surfaces**; keep `pop-550`
for decorative accents, borders, icons on light bg. Apply consistently rather
than per-component. Small text (timestamps) inside bubbles may instead switch
to a dark-on-light bubble treatment — executor's choice, but measure it.

### 3.6 Reduced motion

- `app/globals.css` marquee keyframes + `components/landing/logo-marquee.tsx`:
  pause/disable under `prefers-reduced-motion`.
- Testimonial carousel autoplay (`testimonial-carousel.tsx:99`): stop
  autoplay under reduced motion (`useReducedMotion` already imported in the
  codebase — `components/transitions/transition-overlay.tsx:8`).

### 3.7 i18n cleanup (Spanish first, English second, both locales)

**Locale default + switcher (Q1 decision):**

- `components/i18n-provider.tsx:12` — remove the `navigator.language` sniff;
  initialize to `es` unless an explicit stored choice exists.
- Resolution order: explicit user choice (`localStorage` key, e.g.
  `pelu_lang`) → authenticated user's `preferred_lang` → `es`. Persist
  switcher changes to `localStorage` always and to the profile
  (`preferred_lang`) when logged in, if an endpoint exists — if not, local
  persistence only (no new backend work in this spec).
- **Language switcher UI:** small ES/EN control in `PetsHeader` (desktop +
  mobile), works logged-out, `aria-label`, current language marked with
  `aria-current`. Keep it quiet — text toggle or tiny dropdown, not a flag
  icon row.

**Hardcoded strings the audit inventoried:**

- `components/auth/protected-route.tsx:47` `'Cargando...'`; `:66-67`
  `'Inicio'`/`'Seguridad'`; `app/auth/mfa/enrollment/page.tsx:16-17`
  `'Inicio'`/`'MFA'` (same component, two different hardcoded label sets).
- `components/footer.tsx:26` `Legal`.
- `components/pets/pet-detail.tsx:177,183` `Website`/`Instagram`.
- `components/landing/landing-page.tsx:13-18` `Partner N` alts;
  `logo-marquee.tsx:12` `aria-label="Partner logos"`.
- `components/pets/pets-header.tsx:29-34` `ROLE_LABELS` hand-rolled es/en map
  → real i18n keys; drop the language sniffing at `:97`.
- Chat: `chat-conversation-list.tsx:18-31` `timeAgo` helper (`'Ahora'`,
  `'Hace Xm'`, `'Ayer'`…) → the existing `useTimeAgo`/`common` time keys;
  `:141` `'Sin mensajes'`; hardcoded `'es-DO'` in `toLocale*` calls
  (`chat-conversation-list.tsx:30`, `chat-message-thread.tsx:27,39`) → derive
  from `i18n.language`.
- `member-add-pet-modal.tsx:403` `Fotos` label; `:445` alt text.
- `mfa-passkey-setup.tsx:44` error, `:71` `'...'` loading label;
  `mfa-totp-setup.tsx:29` `'Error'`.
- `lib/api/mfa.ts` hardcoded-Spanish error fallbacks (14 sites) — map to
  translation keys resolved at render time (keep the `{ data, error }`
  contract; return error *codes/keys*, translate in components).
- Delete dead key `grid.loading` (pets ns) or use it.

### 3.8 Shared age formatter (fixes "72 Months")

Add `lib/utils/format-age.ts` (or extend existing utils): takes months,
returns `{count, unit}` — years when ≥12 (floor), months otherwise. Use the
plural keys that already exist (`detail.years_one/_other` in both locales;
reference implementation `components/pets/pet-detail.tsx:129-132`). Apply in
`components/pets/user-pet-card.tsx:61,82` (call site
`app/mis-mascotas/page.tsx:94-95` hardcodes `ageUnit="months"`). **Caveat:**
`UserPetCard` doubles as the live preview in `member-add-pet-modal.tsx:489-499`
where `age` is the raw typed string + user-chosen unit — normalization must
not break that path. Update the test asserting current behavior
(`components/__tests__/pets/user-pet-card.test.tsx:9-13`).

### 3.9 Mobile bottom-nav clearance

`components/pets/public-mobile-nav.tsx:21` (`fixed bottom-0 h-14 sm:hidden`)
covers the last ~56px of `components/footer.tsx:11` on every public route.
Give the footer `pb-20 sm:pb-12` (or a shared spacer). Verified visually on
mobile captures.

### 3.10 Non-token colors → tokens

Raw Tailwind palette colors have no dark-mode story and sit outside the
brand. Either map to existing tokens or add **two semantic tokens** to
`@theme` (`--color-success`, `--color-warning`, with fg/bg pairs, dark
variants defined in `.dark`):

- amber (special-condition): `pet-grid.tsx:283,308`, `pet-detail.tsx:143-147`,
  `adopt-pet-page.tsx:128` → warning tokens.
- `green-500` / `text-green-500` (verified/status): `provider-card.tsx:47-48`,
  `provider-detail.tsx:55-56`, `user-pet-card.tsx:89-90`,
  `app/servicios/page.tsx:57` (+ `text-yellow-500` at `:48`) → success/warning
  tokens.
- Raw OKLCH literals in `testimonial-carousel.tsx:66-75` — keep (Framer
  `useTransform` can't read CSS vars) but add a comment linking them to the
  token values they mirror, or read the computed style once at mount.
- `chat-page.tsx:36` raw rgba shadow → token-based shadow.
- Mixed gradient syntax: `provider-detail.tsx:41` `bg-gradient-to-br` (v3) vs
  v4 `bg-linear-to-*` elsewhere — normalize to v4.

---

## 4. `/` Landing

Current: clean but thin — 3 sections (hero + how-it-works + footer), fully
static, placeholder logos/testimonials, no pets preview.

**P1 — structural (conversion pattern):**
- Add a **featured-pets strip** between hero and How-it-works: 4–8 real pets
  from the public API (reuse pet card), title + "Ver todas" link to `/pets`.
  This is the single highest-value landing change: real adoptable pets are
  Pelú's actual social proof.
- **Q2 decision:** hide the `LogoMarquee` (keep the component behind a flag
  for when real partner logos exist) and trim testimonials to 2–3 credible
  ones. Rebalance the hero right panel after the marquee is gone (the
  carousel alone should still feel composed — adjust panel padding/height).
- Footer: real links (`/about`, contact) or drop dead `href="#"` items
  (`footer.tsx:22,28,29`).

**P2 — polish:**
- Unify container width with the other public routes (landing uses
  `max-w-6xl`, pets/aliados use `container` @1400px —
  `landing-page.tsx:41` vs `pets-page.tsx:91`). Pick one (suggest `max-w-6xl`
  wrapper inside `container` padding behavior) and apply to all three.
- Carousel a11y: dots are non-focusable `motion.div`s
  (`testimonial-carousel.tsx:253-261`) → `<button aria-label>` +
  `aria-current`; add `role="region" aria-roledescription="carousel"`.
- Carousel mobile: fixed `CENTER_HEIGHT = 260` clips long quotes on small
  screens (`:28-29,220`) — make height content-driven or clamp quote length.
- Optimize partner SVGs if kept (206KB + 98KB, each rendered twice, eager in
  hero — `public/assets/logos/`).
- `<hr className="text-input">` (`landing-page.tsx:90`) → `border-input`.

**Acceptance:** landing shows real pets; no dead links; carousel keyboard
operable; reduced-motion honored; mobile footer fully visible.

## 5. `/pets`

Current: strong photo grid + working filters/skeleton, but info-poor cards,
no page header, weak empty/error states, a11y gaps.

**P1:**
- **Page header:** add `h1` + subtitle + live result count ("N mascotas
  buscando hogar"). The page currently has no heading at all; first DOM
  heading is the sheet's `h2`.
- **Card info line:** under the name in the gradient overlay, add a small
  meta line — age (via §3.8 formatter) · gender. Data is already fetched.
- **Empty state action:** when filters are active, add "Limpiar filtros"
  button (`pet-grid.tsx:265-270`).
- **Fix nested interactive:** card is `div role="button"` containing the
  three-dot `<button>` (`:275-280,328`) — restructure (real `<button>` card +
  sibling absolutely-positioned menu). Space key currently scrolls the page
  (missing `preventDefault`).
- Card radius `rounded-xl` → `rounded-2xl` (`:248,281`; also
  `transition-overlay.tsx:57` skeleton).

**P2:**
- Selected-state outline (`:287`, 1px hairline, thinner than hover) → 2px
  `outline-pop-550` with `outline-offset-2`.
- Kill the phantom viewport: nested `min-h-screen` (`:244` inside
  `pets-page.tsx:90`) pushes the footer a screen down on short results.
- Mobile filter popover: outside-click + Escape close (`:169-241`); unify pill
  styling between desktop chips (`shadow-xl`) and popover chips (borders) —
  drop `shadow-xl` from 28px pills.
- Verified badge (`:315-319`) gets a text alternative (tooltip +
  `aria-label`); "Special condition" badge: token colors (§3.10), don't
  truncate on mobile (wrap or icon+short label).
- `|` separators `aria-hidden` (`:128,151`).
- `use-media-query.ts:4` hydration flash (Drawer renders first on desktop) —
  init from `window.matchMedia` when available.

**Acceptance:** page has h1 + count; cards show name/age/gender at
`rounded-2xl`; empty state offers clear-filters; keyboard: tab reaches every
card and menu with visible ring, Space activates without scrolling.

## 6. `/aliados`

Current: weakest page — two thin cards in a blank viewport, decorative
disabled filters, demo-stub CTA, raw API errors, skeleton/card shape
mismatch.

**P1:**
- **Page header:** `h1` "Aliados" + one-line description of what providers
  are + count. (Heading currently starts at `h3`.)
- **Make filter pills real:** they're permanently `disabled`
  (`provider-grid.tsx:40-50`). Providers already carry `services[]` —
  client-side filtering is enough. Active pill = `aria-pressed` + visual
  state per §3.4.
- **Translate service badges:** cards render raw backend strings
  (`transport`, `taxi`) while pills say "Transporte" — map through the
  existing `aliados.filters.*` keys (`provider-card.tsx:63`,
  `provider-detail.tsx:70`).
- **Richer card:** the current card wastes the grid (avatar + name + 2 chips
  + price in a 4-col layout). Add description snippet (data exists in
  detail), align badge shape with `/pets` (`rounded-full` chips), price via
  `Intl.NumberFormat` with the app locale + DOP (`provider-card.tsx:77`
  hardcodes `RD$` + browser-locale `toLocaleString`).
- **Q3 decision:** remove the permanently-disabled "Contactar" button for
  now. The detail panel keeps Instagram/website as the visible contact
  affordances. The real chat wiring is specced separately at
  `pelu/docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md`
  and will reintroduce the CTA.
- Error state: never print raw `{error}` (`provider-grid.tsx:68-72`) — §3.3.

**P2:**
- Skeleton must match the real card (currently image-top skeleton vs
  avatar-left card → layout jump).
- Empty state CTA → link to `/servicios` ("¿Ofreces un servicio? Regístrate").
- Card radius → `rounded-2xl` (`provider-card.tsx:27`), focus ring on card,
  selection ring offset (`provider-grid.tsx:86`).
- Same `min-h-screen` nesting + mobile-filters divergence cleanups as `/pets`.

**Acceptance:** page has header/description; filters filter; badges are
translated; a 2-provider dataset no longer looks broken (header + description
+ tighter grid fill the viewport purposefully).

## 7. `/adopt?id=<uuid>`

Current: functional but long and flat; banner bug is glaring; several state
bugs.

**P0 — bugs:**
- **Banner crop** (`components/adopt/adopt-pet-page.tsx:91-99`): parent has
  `max-h-40` but no definite height, so `h-full` on the `<img>` resolves to
  `auto` → image lays out at intrinsic ratio and `overflow-hidden` clips it.
  Fix: parent `h-40` (definite), img `w-full h-full object-contain` over a
  muted/brand backdrop (`bg-muted` or soft pop gradient) so a 4:1 banner
  letterboxes gracefully at any viewport. Apply same fix to the no-logo
  gradient branch.
- **No `.catch`** on the load `Promise.all` (`:35-45`) → infinite spinner on
  network failure (§3.3).
- **Success + error rendered together** (`:63-73` vs `:133-137`): if the form
  POST succeeds but file upload fails, the success screen shows *and* the
  page error banner shows. Make them mutually exclusive: file-upload failure
  after successful submit should show success + a distinct warning ("tu
  solicitud se envió, pero el archivo no se pudo subir — reintentar").

**P1 — form UX (long form, ~25 questions):**
- **Section grouping:** wrap each form section (`DATOS PERSONALES`,
  `INFORMACIÓN COMPLEMENTARIA`, `COMPROMISOS`) in a `rounded-2xl` card with a
  real heading instead of the current faint uppercase dividers
  (`form-renderer.tsx:95-102`).
- **Progress:** sticky/slim progress indicator — "Sección X de N" or answered
  count. (`components/Stepper.tsx` exists if a stepper fits.)
- **Radio/checkbox touch targets:** rows at ≥44px height, label clickable
  full-row (`FieldInput` radio/checkbox branches).
- **Label association:** `<label>` without `htmlFor`, inputs without `id`
  (`form-renderer.tsx:163-166,172-209`); wire `aria-describedby` for errors
  and `aria-invalid`/`required` semantics.
- **Dropzone keyboard access:** it's a `<div onClick>` with a hidden input
  (`:228-245`) — make it a focusable button-role element with Enter/Space
  handling; unify its radius/border with the add-pet modal dropzone
  (`rounded-2xl border-2 border-dashed`).
- Emoji hero `🐾` on success screen (`:68`) → `faPaw` (house rule).
- Success CTA raw `<a href="/pets">` (`:78`) → `TransitionLink`.

**P2:**
- Deduplicate double container (`adopt-pet-page.tsx:101` +
  `form-renderer.tsx:86` both `max-w-2xl mx-auto px-4 py-8`).
- Amber advisory banner → warning tokens (§3.10).
- Sticky pet chip: keep the pet identity visible while scrolling the long
  form (it already sits under a sticky banner container — extend the sticky
  region or make the chip sticky).

**Acceptance:** banner renders un-cropped at 1440px and 375px; failed load
shows error+retry; submit outcomes are unambiguous; form reads as grouped
sections with progress; all fields label-associated; keyboard-only completion
possible.

## 8. `/chat`

Current: solid real-time core (WS, receipts, typing) with missing states and
a11y.

**P0:**
- **Error states with retry** for conversation list and thread (§3.3) — a
  failed fetch currently shows the *empty* state or an infinite spinner
  (observed live).
- **"Select a conversation" ≠ "no conversations":** `chat-page.tsx:58` reuses
  `t('chat.empty')` for the no-selection panel — wrong once conversations
  exist. New key `chat.select_conversation` (both locales).

**P1:**
- **Send feedback:** input clears immediately with no pending/failed state
  (`chat-message-thread.tsx:188-193`). Minimum viable: optimistic bubble in a
  pending style, mark failed with retry on socket error; or disable send +
  show a reconnect banner when the socket is down. Add a subtle connection
  status indicator.
- **Empty state with guidance:** conversations are created when a rescue
  center approves a submission — say that ("Cuando un centro apruebe tu
  solicitud, podrás chatear aquí") + CTA to `/pets`
  (`chat-conversation-list.tsx:102-109`).
- **a11y:** `role="log"`/`aria-live="polite"` on the message region
  (`:236-240`); `aria-label` on back/attach/send (`:219,321,347`); label the
  message input; text alternative for typing indicator; focus rings on rows.
- `timeAgo`/locale i18n fixes (§3.7).

**P2:**
- Panel treatment: give the two columns card surfaces (`rounded-2xl`,
  consistent with the app) instead of flat full-bleed columns; replace raw
  rgba divider shadow (`chat-page.tsx:36`).
- Bubble radii `rounded-[16px_…]` → token-derived; sent-bubble contrast per
  §3.5; read receipts `✓✓` text glyphs → Font Awesome with `aria-label`.
- Header-height magic number `h-[calc(100vh-72px)]` vs ~88px real header →
  flex column layout (`min-h-dvh` shell) instead of hardcoded math.

**Acceptance:** killing the network mid-session produces a visible error +
retry (not an eternal spinner); sending while offline is impossible or
clearly recoverable; empty state explains how conversations start; screen
reader announces incoming messages.

## 9. `/mis-mascotas`

Current: best-covered empty state in the app; age bug; error-as-empty bug;
modal a11y.

**P0:**
- **Age formatting** via §3.8 — "72 Months" → "6 años" (respecting the modal
  live-preview caveat; update the existing test).
- **Error ≠ empty** (`page.tsx:28`) — a failed `listUserPets()` currently
  tells the user they have no pets.

**P1:**
- **Pet photo alt text:** every grid photo renders `alt=""`
  (`user-pet-card.tsx:15` passes `title: ''` → `Carousel.tsx:90`) — pass the
  pet's name.
- **Add-pet modal semantics:** hand-rolled framer-motion modal
  (`member-add-pet-modal.tsx:192-210`) has no focus trap / Escape / dialog
  role, while the delete flow on the same page uses Radix correctly. Either
  rebuild on `components/ui/dialog.tsx` or add the missing semantics.
  Also: field `htmlFor`/`id` association (8 labeled fields), `aria-label` on
  the three icon buttons, error text `role="alert"`, success toast on save
  (delete already has one — inconsistent).
- **Skeleton grid** while loading (currently a lone spinner → layout jump).
- Dedupe: `MemberAddPetModal` is mounted twice (page `:128` + header
  `pets-header.tsx:376`) — mount once.

**P2:**
- Meta row legibility: green vaccinated/castrated icons are color+icon only
  (`user-pet-card.tsx:88-96`) → add short text labels or tooltips +
  `aria-label`; semantic tokens per §3.10; `·` separators `aria-hidden`.
- Shadow scale: card `shadow-xs`, action buttons `shadow-sm`, modal none —
  pick one scale; give the floating modal a shadow.
- Carousel first-paint flash (`user-pet-card.tsx:21-22` width-measured
  render) — give `Carousel` a sane default width instead of rendering
  nothing.
- Photo management: existing photos are read-only in edit mode
  (`member-add-pet-modal.tsx:389-399`) — if photo deletion has API support,
  enable removal; otherwise show a hint that photos can't be edited yet.

**Acceptance:** adult cats show years; API failure shows error+retry;
modal is keyboard-trappable and Escape-closable; screen reader can identify
every pet photo and card action.

## 10. `/servicios`

Current: correct flow logic (5 status branches), but visually flat — no
cards/shadows, native file input, silent validation.

**P1:**
- **Page framing:** hero-lite header (icon + title + subtitle), form inside a
  `rounded-2xl` card surface; group form into labeled `<fieldset>` sections
  (Sobre ti / Servicios / Verificación). Replaces the current bare
  full-bleed form.
- **File input:** replace the native `Choose File` control with the styled
  dropzone pattern from `member-add-pet-modal.tsx:413` (shared component if
  cheap), with filename/preview + remove.
- **Explain the disabled submit:** `canSubmit` silently gates on 7 conditions
  (`service-provider-form.tsx:46-54`) — show inline per-requirement hints
  (checklist or per-field messages on blur), not a mystery-disabled button.
- **Chips:** `aria-pressed`, focus rings, ≥44px height (§3.4); selected state
  not by color alone (add check icon).
- **Status cards:** extract the 3 duplicated status blocks
  (`page.tsx:46-78`) into a `StatusCard`; yellow/green icons → semantic
  tokens (§3.10); pending state gets a short "what happens next" line.
- Skeleton instead of `faSpinner` for initial load; error branch gets retry
  (§3.3).

**P2:**
- shadcn `Input`/`Textarea`/`Checkbox` primitives instead of raw elements
  (or at least the focus/disabled styling parity); `focus:` → `focus-visible:`.
- `autoComplete` hints (address → `street-address`).
- Suppress the expected `service-providers/me` 404 console noise (fetch
  wrapper already returns `{data,error}`; don't let the expected-404 path
  log as an error if avoidable client-side).

**Acceptance:** the page reads as a designed application flow (header, card,
sections); a user always knows why submit is disabled; file upload is
styled + keyboard accessible; status states are visually distinct cards.

## 11. `/auth/mfa/enrollment`

Current: best-looking route (beams, method cards) but has the worst
trap-states.

**P0 — bugs:**
- **TOTP infinite spinner:** on `/totp/setup` failure, `setError` fires but
  `step` stays `'loading'`, which renders only a spinner
  (`mfa-totp-setup.tsx:26-34,55-61`) — user is trapped. Show error + retry +
  back.
- **Email OTP silent failure:** `mfa-enrollment.tsx:41-47` returns on error
  with zero feedback; no pending state on the card while the request runs.
  Add loading state on the card + error toast/inline message.
- **Unguarded route:** no `ProtectedRoute`/layout guard — anonymous visitors
  render the full UI and fire 401s. Wrap or redirect.

**P1:**
- **Progress indication:** 3-step flow (choose → configure → recovery) with
  no indicator — use the existing `components/Stepper.tsx` (already used by
  member onboarding) or a minimal "Paso X de 3".
- **Back vs cancel:** `←` text glyph + `mfa.settings.cancel` label used as
  *back* (`mfa-totp-setup.tsx:65-67`, `mfa-passkey-setup.tsx:51-53`) → new
  `mfa.enrollment.back` key + `faArrowLeft`; give TOTP's confirm sub-step a
  back-to-QR path (currently the only exit discards the whole setup).
- **Recovery codes gate:** add download/copy-all + an explicit "Ya guardé mis
  códigos" confirmation before closing (`mfa-recovery-modal.tsx:44-49`);
  build the modal on `components/ui/dialog.tsx` (it currently has no focus
  trap / Escape / dialog role).
- **OTP input a11y:** `autoComplete="one-time-code"` (enables mobile OTP
  autofill), per-box `aria-label` + group label, paste handling on any box
  (currently box 0 only), ArrowLeft/Right nav, `aria-live` on the error line
  (`mfa-code-input.tsx:36-88`); `h-13` → scale value.
- **Success moment:** the `mfa.enrollment.success` key exists but is unused —
  show a brief success confirmation (screen or toast) before recovery codes.
- "Recomendado" badge: `rounded-full` pill + AA contrast (currently light
  teal on light teal, `mfa-enrollment.tsx:108`).

**P2:**
- Dedupe the copy-pasted panel shells (`mfa-enrollment.tsx:54-66,68-80`) and
  reuse `--inset-shadow-decoration` instead of 3 inline arbitrary shadows.
- Skip link (`:117-122`) gets link affordance (underline) + focus ring.
- `QRCodeSVG`: `title` for AT; guard `navigator.clipboard` calls with a
  fallback + feedback.
- Spinner visibility: `border-primary` ring on forced-dark bg is nearly
  invisible (`mfa-totp-setup.tsx:58`) — §3.2 shared spinner fixes this.

**Acceptance:** every failure path shows a message and a way out (no trap
states); flow shows progress and supports going back one step; OTP autofill
works on mobile; recovery codes can't be dismissed accidentally.

---

## 12. Execution notes for the planner (Opus 5)

- **Order:** Phase 0 (§3) first — primitives, loading system (incl.
  `PeluLoadingLogo`), error/retry pattern, focus/aria recipe, tokens, locale
  default + switcher, i18n keys, age formatter. Then routes in order of user
  impact: `/adopt` (P0 bugs) → `/pets` → `/aliados` → `/chat` →
  `/mis-mascotas` → `/servicios` → `/auth/mfa/enrollment` → landing.
- **Keep changes small and contained** (Alex's standing rule). Each route
  section can be its own branch/commit series; Phase 0 items are individually
  committable.
- **i18n:** every new string lands in `public/locales/es/*` first, then
  `en/*`; register any new JSON in `lib/i18n/index.ts`.
- **Testing:** `npx vitest run` (no npm `test` script). Update
  `components/__tests__/pets/user-pet-card.test.tsx` (age). Extend
  `design-system.test.ts` for ui-primitive radii if Q4 approved. Add tests
  for: age formatter, error-state rendering (list surfaces), chat
  select-vs-empty keys.
- **Verify:** `bun run build`; then drive pelurd.com (drive-pelurd skill)
  after deploy — re-shoot the same routes at 1440/375 and compare against
  `.playwright-mcp/audit-*.jpeg` baselines. Assume `bun run dev` is already
  running for local checks; real API port is 2701.
- **Do not touch:** dashboards, `/about`, backend. The PRUEBA adoption
  submission in prod is fixture data — never clean it up.
- **Known-fixed:** the site-wide button `cursor: pointer` regression was
  fixed and deployed 2026-07-28 — do not re-add.

## 13. Out of scope

- Rebrand (palette/typography swap) — explicitly rejected.
- `/about` scrollytelling, dashboards.
- Backend/API changes. Wiring aliados "Contactar" to chat is its own
  cross-repo spec
  (`pelu/docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md`).
- Photo-deletion API for member pets (UI hint only, unless API already
  supports it).
- Dark-mode completion for the whole app (tokens added here must define dark
  values, but auditing every screen in dark mode is a separate pass).
