# Make the route-transition skeleton match /pets and /aliados (2026-07-31)

Goal: the `skeleton` overlay that covers a `/` ↔ `/pets` ↔ `/aliados` navigation
lands on the same geometry the incoming page actually renders, so nothing jumps
when the overlay fades out.

## The bug

`components/transitions/transition-overlay.tsx` still draws the layout both
routes had *before* the recent changes. One shape is painted for every target:
a filter-pill row, then a `bg-background` panel holding an 8-card square grid.
Since then:

- both pages gained a **title block** above the pills (`h1` + subtitle + a live
  count line, `px-4 pt-6 pb-2 sm:px-2`)
- both containers gained **`max-w-6xl`** — the overlay's bare `container` runs to
  1400px, so the content column is wider under the overlay than under the page
- **/pets below 640px** is now the post feed (`pet-feed.tsx`): full-width cards
  on `bg-muted`, `px-3`, no panel — not a 2-col grid inside `bg-background`
- **/aliados** cards are provider cards (`grid-cols-1 sm:grid-cols-2
  lg:grid-cols-3`, `gap-3`, avatar + chips + price), not square pet tiles
- **/aliados** filter pills are one scrolling row at *every* breakpoint and there
  are **7** of them (`all` + 6 `SERVICE_TYPES`); the overlay draws 6 desktop-only
  pills plus a mobile "Filtros" button that route does not have

Net effect: the pills sit ~90px too high, the column is too wide, and on mobile
`/pets` the overlay shows a grid the page never renders.

## The fix

Split the single skeleton into per-route shapes that mirror the real markup
class-for-class, and keep today's generic shape as the fallback.

- [x] 1. Add `max-w-6xl` + `sm:pb-0` to the overlay's container so the column
      matches `pets-page.tsx` / `aliados-page.tsx`
- [x] 2. Add a shared `SkeletonHeader` (title + subtitle + reserved count line)
      using the real `px-4 pt-6 pb-2 sm:px-2` box; the count line stays **empty**
      because the real one renders empty while loading
- [x] 3. `PetsSkeleton` — real pill widths from the Spanish labels, `flex-wrap`
      desktop row + `sm:hidden` "Filtros" button
- [x] 4. `PetsSkeleton` — desktop grid panel gated `hidden sm:block`, mobile feed
      (`px-3 pb-20`, 1½ post cards) gated `sm:hidden`, mirroring `pet-feed.tsx`
- [x] 5. `AliadosSkeleton` — 7-pill single scrolling row + the provider-card
      skeleton copied from `provider-grid.tsx`'s own loading state
- [x] 6. Route the branch on `targetHref`; keep the pets shape as the fallback
- [x] 7. Add tests pinning each branch to its target — transitions suite 25/25
- [x] 8. Verify in the browser at 1440px and 390px against the real pages
- [x] 9. `EventosSkeleton` — hero band + the real loading state (added on request)
- [x] 10. Swap /eventos' bespoke loading circle for `<PeluLoadingLogo />`, in the
      route **and** the skeleton, so the paw animation carries across the handoff

## Review

`transition-overlay.tsx` is now three route-shaped skeletons behind a
`targetHref` switch (`RouteSkeleton`), replacing the single generic shape.
Nothing outside that file changed.

**Verified by measurement, not by eye.** Every number below is the overlay's own
geometry compared against the live page in Chrome, at both breakpoints. Offsets
are from the top of the route container, since the overlay is mid-slide when
sampled:

| route / viewport | header block | filters | content | pills |
|---|---|---|---|---|
| /pets 1440 | +0, h116 | +116, h100 (wraps to 2 rows) | +216 | all 10 exact |
| /pets 390 | +0, h164 | +176, 87×32 | feed +220, x32 w311 | — |
| /aliados 1440 | +0, h116 | +116, h58 | +174, 3 cols | all 7 exact |
| /aliados 390 | +0, h152 | +152, h73 | +225, 1 col | all 7 exact |
| /eventos 1440 | hero h190, mb64, full-bleed 1425 | — | paw at +334, 106×112 | — |

Every one matches the real page exactly.

### The /eventos loading state (follow-up)

The bespoke `w-8 h-8 border-2 … animate-spin` circle became `<PeluLoadingLogo />`
— **in `events-page.tsx` as well as the skeleton**, deliberately. Changing only
the overlay would have shown the paw and then swapped it for a circle at handoff,
which is the exact class of jump this task set out to remove. Swapping both keeps
them matched and follows the rule `components/ui/spinner.tsx` already documents:
"Full-page loads use `<PeluLoadingLogo />` instead; list/grid surfaces use
skeletons." The route was the outlier — its circle was not even the shared
`Spinner`.

Verified: overlay and route both put the paw at offset **+334**, box 106×112, at
the same absolute x/y. The assembly animation now continues across the handoff
rather than restarting as a different indicator.

The skeleton's copy is wrapped in `aria-hidden` — `PeluLoadingLogo` carries
`role="status"`, and the route mounts its own underneath, so two live regions
would announce "Cargando…" twice.

**Four things the measurements caught that eyeballing would not have:**

1. `container` is customised in `globals.css` with `padding-inline: 2rem`, so
   below sm the content is inset 32px, not 0. Reusing the page's own container
   classes inherits this for free — hand-rolling the wrapper would not have.
2. The /pets `h1` wraps to **two** lines at 390px (64px, not 32) while /aliados
   stays at one over a **three**-line subtitle. The mobile line counts are
   therefore per route; a shared guess put the pills 32px off.
3. The mobile "Filtros" trigger has no border, so it is 87×32 — not the 34px a
   bordered pill measures.
4. The /aliados pill row keeps `overflow-x-auto` verbatim. Below sm that row
   overflows, and on a classic-scrollbar browser the gutter is 15px of real
   height; `overflow-hidden` would have sat the cards 15px high.

Pill widths are measured off the rendered Spanish labels and noted as such in the
file — they need re-measuring if the labels change.

## Found while verifying — separate from this work, not fixed

Below 640px, `/pets` **cannot rest at scroll 0**. `pet-feed-card.tsx` carries
`snap-start scroll-mt-24` and `globals.css` puts `scroll-snap-type: y proximity`
on `html`, so once the cards mount the document snaps to scrollY **215** and the
page's own title and filter bar scroll out of view unscrolled-to. `window.scrollTo(0, 0)`
is immediately undone by the snap.

This is **not** a transition bug and the overlay handoff is unaffected — the
feed's *loading* skeleton has no snap targets, so the page sits at 0 for exactly
as long as the overlay is up. The snap happens later, when the pets arrive. But
it does mean a mobile visitor never sees the /pets heading or filters without
scrolling up. Worth deciding on separately.

## Pre-existing failures, untouched

- `design-system.test.ts` "no inline `style={{}}`" — fails identically on a
  stashed tree (7 violations across `logo-loader`, `mfa-enrollment` and this
  file). The skeleton's pill widths are pixel data, so they stay inline; the
  count is unchanged from before.
- `service-provider-form.test.tsx` times out in a full run, passes alone (12/12)
  — the known full-run flake.
- `tsc --noEmit` reports 2 errors in `transition-link.test.tsx` (a mock missing
  `targetHref`). Pre-existing; I fixed the same gap in the overlay's own test but
  left that file alone as out of scope. One-line fix if you want it.

---

# Update the README (2026-08-01)

Goal: `README.md` describes the repo as it is today. Only `README.md` changes —
no code, no new files.

## What I found wrong or missing (verified against the tree)

**Wrong — would waste someone's time:**

1. `cp .env.example .env.local` — **there is no `.env.example`** in this repo.
2. API URL given as `http://localhost:8080` (twice). Every real profile uses
   **`http://localhost:2701`**; 8080 is only the stale code fallback.
3. `bun run lint` is listed as the lint command. **It is broken** — `next lint`
   was removed in Next 16 (confirmed: `next --help` has no `lint`), and there is
   no eslint config in the repo. The real check is `npx tsc --noEmit`.
4. "Node.js 18+" — Next 16 needs Node 20.9+.
5. i18n lists 5 namespaces; there are **6** (`business.json` was added), and the
   files are bundled by `lib/i18n/index.ts`, not fetched.

**Missing entirely:**

6. **Testing.** 87 test files, no `test` script, `npx vitest run`, and the
   `renderWithProviders()` requirement. The README never mentions tests.
7. **Deployment.** `Dockerfile` (bun build → nginx:alpine) + `nginx.conf` serving
   the static export on port 3000, and that `NEXT_PUBLIC_API_URL` is a
   **build arg** inlined at build time — changing it needs a rebuild.
8. **Routes.** No route list at all. Also the static-export consequence:
   `/p?slug=` and `/adopt?id=` are query params, not `[slug]`/`[id]` segments.
9. **WebSocket.** `lib/contexts/websocket-context.tsx` is unmentioned.
10. Provider stack, `ProtectedRoute`/guards, and "no Next middleware — auth is
    client-side".

**Stale structure / feature list:**

11. Project tree misses `about/`, `adopt/`, `events/`, `forms/`, `providers/`,
    `service-providers/`, `transitions/`, `dashboard/admin/`, `lib/hooks/`,
    `lib/data/`, `lib/utils/`, `scripts/`.
12. Feature phases stop at "Phase 7 Business dashboard". Since then: admin
    dashboard, service-provider applications (`/servicios`), events (`/eventos`),
    member pets (`/mis-mascotas`), transport directory (`/transporte/negocios`),
    the about scrollytelling page, public route transitions, and the /pets
    mobile feed.
13. Design system omits the **Pop** accent and Tailwind v4 (**no
    `tailwind.config.ts`** — theme lives in `app/globals.css` `@theme {}`) and
    the Font-Awesome-only icon rule.

## Todo

- [x] 1. Fix the four factual errors (env file, 2701, lint, Node version)
- [x] 2. Add a Testing section (`npx vitest run`, `renderWithProviders`)
- [x] 3. Add a Routes table, incl. the query-param deep links
- [x] 4. Refresh the project-structure tree against the real directories
- [x] 5. Expand Architecture: providers, guards, WebSocket, static-export limits
- [x] 6. Add a Deployment section (Docker + nginx, build-time API URL)
- [x] 7. Update i18n (6 namespaces, bundled), design system (Pop, Tailwind v4,
      Font Awesome), and the feature list
- [x] 8. Re-read the finished README against the tree and add a Review section

## Open question for you — answered

Approved **(a)**: the single variable is documented inline. No `.env.example` was
committed, so this stayed a docs-only change.

## Review

`README.md` is the only file that changed (plus this plan). No code was touched.

### What the rewrite fixed

Every error from the list above, plus six new sections: Testing, Routes,
Deployment, Electron, and — inside Architecture — the provider stack, route
protection, the three fetch patterns, WebSocket, and the static-export
constraints.

The **"Features Implemented" phase list was removed rather than extended.** It
had drifted into a changelog that nobody updates, and the Routes table now says
the same thing in a form a reader can act on.

### Three things I got wrong on the first pass and corrected against the source

Worth recording, because each one is a claim the old README (or `CLAUDE.md`)
implies and the code contradicts:

1. **`admin` is not a role.** `UserRole` in `lib/types/user.ts` is exactly
   `member | rescue_center | business`. Admin is an `is_admin` flag on
   `/api/v1/auth/me` — which is why `AdminGuard` calls that endpoint and why
   `app/dashboard/admin/layout.tsx` wraps a `<ProtectedRoute>` with **no**
   `requireRole`. The README now says so explicitly.
2. **Static export does not forbid dynamic segments.** I wrote that it did;
   `app/auth/onboarding/[role]` disproves it by enumerating the three roles in
   `generateStaticParams()`. The real rule is that every value must be known at
   build time — which is why *pet* deep links use `?slug=` / `?id=` and the
   onboarding route does not have to.
3. **`location_update` does not exist in this repo.** `CLAUDE.md` lists it as a
   client→server transport event, but `grep` across the tree returns nothing.
   The frontend sends only `send_message`, `typing` and `read_receipt`. The
   README lists the nine event types actually subscribed to, verified by grep.

### Verified, not assumed

- `next lint` is gone: `bunx next lint --help` prints the Next 16 command list
  with no `lint` entry, and there is no eslint config file in the repo.
- Node floor: `node_modules/next/package.json` → `engines.node` is `>=20.9.0`.
- `.env.example` genuinely absent (`ls -a` shows only `.env` and `.env.local`).
- Both documented commands actually run: `npx vitest run
  components/__tests__/ui/error-state.test.tsx` → 5/5 passed;
  `npx tsc --noEmit` runs and reports **only** the 2 pre-existing
  `transition-link.test.tsx` errors already noted in the entry above. Left
  untouched — out of scope for a docs change.
- Test file count (87), namespace count (6, `business.json` included), route
  roles, and the WS event list all come from the tree, not from `CLAUDE.md`.

### Follow-ups you may want, deliberately not done here

- **`CLAUDE.md` has the same `location_update` error** and still says "~32 test
  files" (it is 87) and 5 i18n namespaces. Same class of drift, different file.
- The broken `lint` script is still in `package.json`. The README documents the
  workaround; replacing the script with `tsc --noEmit` (or wiring up ESLint 9's
  flat config) would be a one-line code change if you want it.
