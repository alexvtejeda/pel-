# /pets desktop — rescue-center identity + detail sheet rebuild

**Date:** 2026-07-30
**Status:** Approved — all decisions locked with the user
**Scope:** Desktop `/pets` (grid card + detail Sheet), the landing featured strip, the
cross-repo plumbing that puts a rescue-center profile photo in the public payload, and
the three dead save stubs in the RC settings tab that block it.
**Not in scope:** the mobile `/pets` redesign (next session, planned separately).

---

## 1. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Identity on a pet card | Avatar in the bottom gradient overlay **and** today's top-right verified check stays |
| 2 | Detail sheet content | Rebuilt block **plus** the pet facts already in the payload |
| 3 | Sheet width | Unchanged — `sm:max-w-sm` (384px). Width was never the problem |
| 4 | Where the profile photo comes from | Wire the avatar that already exists: frontend upload fix + `rcSummary` joins `users.avatar_url`. No migration |
| 5 | What represents the center in the sheet | The 56px profile photo. The 1600×400 lockup stays on the adoption-form banner where its own label puts it |
| 6 | RC settings dead stubs | Fix all three |

Mockups reviewed in the browser: `.superpowers/brainstorm/3587820-1785413631/content/`
(`card-identity.html`, `sheet-rebuild.html`).

---

## 2. Root causes

Everything below was confirmed in code or over the wire, not inferred.

### 2.1 The logo is not small — it is the wrong asset, rendered wrong

Two independent faults stack:

- **Wrong asset.** `pet-detail.tsx:162` renders `pet.rescue_center.logo_url`. That field is
  fed by `LogoUpload`, which is explicitly a 4:1 banner uploader (`aspectRatio: '4/1'`,
  hint `1600x400px`, `object-contain`) and is labelled *"Aparece en el banner de tu
  formulario de adopción"* (`settings-tab.tsx:200`). Downloaded from prod: a **1600×400
  transparent horizontal lockup** (dog mark + "ADOPTAME RD" wordmark). It is a logo, not
  an avatar.
- **Collapsed box.** `pet-detail.tsx:163-167` passes `width={40} height={40}` with no CSS
  size classes. Tailwind preflight sets `img { height: auto }`, which beats the `height`
  attribute, so a 4:1 asset renders about **40×10**.

The circular emblem the user was looking at in their dashboard is a *different* image —
see 2.6.

### 2.2 White corners around the sheet photo

`Carousel.tsx:92` puts `rounded-xl` on every slide. In the sheet the carousel sits flush
against a square-cornered panel, so the panel's white shows through all four corners.
`Carousel` has **6 call sites**, so this must become a prop, not a global edit.

### 2.3 "Sitio web" / "Instagram" crowd the center name

`pet-detail.tsx:159` wraps the block in `space-y-2` (8px), so the links sit 8px under the
name row. They are also 14px anchors, not controls — no hit area of their own.

### 2.4 The gap above Adoptar

`pet-detail.tsx:115` is `flex-1 overflow-y-auto` inside `flex flex-col h-full`, with the
footer pinned by `shrink-0`. With sparse content the info column stretches and leaves
roughly **330px** of void at a 1010px viewport.

### 2.5 The sheet drops facts it already receives

`vaccinated`, `castrated` and `size` are on `Pet` (`lib/api/pets.ts:32-34`) and rendered
nowhere in the detail — even though the grid lets users *filter* by vaccinated/castrated.
`size.small|medium|large` already exist in `public/locales/es/pets.json`.

### 2.6 No profile photo reaches the public payload

- `rcSummary` (`api/internal/pets/handler.go:90-96`) exposes only
  `id / name / logo_url / website / instagram`.
- The avatar half of the backend is already built: `POST /api/v1/auth/avatar` →
  `users.avatar_url` (migration `000034_add_avatar_url_to_users`), returned on `/auth/me`;
  `lib/api/auth.ts:49` has an unused `uploadAvatar()`.
- `rescue_centers.user_id` is the join to that photo.

### 2.7 The RC settings tab has three save buttons that do nothing

| UI | Handler | What it does | Endpoint that already exists |
|---|---|---|---|
| Foto de perfil | `settings-tab.tsx:128` | `URL.createObjectURL` preview only — **never uploads** | `POST /api/v1/auth/avatar` |
| Nombre de usuario | `settings-tab.tsx:135` | flips a "Guardado" flag | `PATCH /api/v1/auth/profile` |
| Nombre del centro | `settings-tab.tsx:140` | flips a "Guardado" flag; `rescueName` is never even populated from `getMyRescueCenter()` | `PATCH /api/v1/rescue-centers/{id}` |

Working reference for the display-name save: `components/dashboard/business/settings-tab.tsx:159`.

### 2.8 Found, deliberately not fixed here

`short_slug` **does not exist in the API**: no field on `petResponse`, no column in any
migration, no `/pets/s/{slug}` route. The frontend type declares it, so
`pet.short_slug` is always undefined. Consequences, all currently invisible to users:
the sheet's **Compartir** button (`pet-detail.tsx:212`), the grid's "Compartir enlace"
menu item, `getPetBySlug()` and the whole `/p/[slug]` page. Worth its own issue — the
user wants the share feature working.

Also confirmed absent: `rescue_centers` has **no** `description` column
(`migrations/000003`, `repository.go:31`), so there is no center bio to display anywhere.

---

## 3. Grid card (and landing strip)

Applies to `components/pets/pet-grid.tsx` and `components/landing/featured-pets.tsx`.

- **Keep** the top-right verified badge exactly as it behaves today, including the
  `group-hover:-translate-x-8` dodge in the grid. The landing strip has no `⋯` menu, so
  it renders the badge without the translate.
- **Add** the avatar inside the existing bottom gradient overlay, left of the name:
  `h-[30px] w-[30px] rounded-full object-cover border-[1.5px] border-white/90 shrink-0`.
  Explicit size classes — see 2.1; never rely on `width`/`height` attributes alone.
- The overlay becomes a flex row. It must stay **phrasing content** (`<span>`, not
  `<div>`): the parent is a `<button>` in the grid and an `<a>` in the strip. The
  name/meta column needs `min-w-0` so `truncate` keeps working.
- Render only when `pet.rescue_center?.avatar_url` is present. Member-published pets get
  **no avatar and no placeholder** — the API returns no author identity for them, so
  presence of the avatar is itself part of the signal.
- `alt=""`: decorative. The badge's `aria-label` already announces the verified center.
- Extract the certificate+check composite (currently inline at `pet-grid.tsx:394-405`) to
  `components/pets/verified-badge.tsx` and use it in all three places (grid, strip,
  sheet). This is the consistency the user asked for on the landing page.

---

## 4. Detail sheet

`components/pets/pet-detail.tsx`. Width unchanged. Order and treatment:

1. **Carousel, flush.** New opt-in prop on `Carousel` (e.g. `flushItems`) that drops
   `rounded-xl` from the slide wrapper. Default preserves current behaviour for the other
   5 call sites.
2. **Title + chips as one group.** `<h2>` unchanged; chips (species / gender / age) 10px
   under it, so they read as one unit instead of two equally-spaced siblings.
3. **Description** unchanged.
4. **New facts list.** Label→value rows with `border-b` separators, icons `faSyringe`,
   `faScissors`, `faRulerCombined`:
   - `Vacunas` → `Al día` / `Pendiente`
   - `Castración` → `Sí` / `No`
   - `Tamaño` → `t('size.' + pet.size)`

   Phrased as nouns **on purpose**: the existing strings are masculine (`Vacunado`,
   `Castrado`) and much of the catalogue is female (Abril, Alma, Cangura…). Making the
   noun the subject sidesteps gender agreement entirely instead of misgendering pets or
   forcing two string variants per fact.
5. **Rescue-center card.** `rounded-2xl border bg-muted p-3`:
   - Photo `h-14 w-14 rounded-xl object-cover` (56px), on a white surface with a border.
   - Name `text-[15px] font-semibold truncate` + `<VerifiedBadge />` inline beside it.
   - Kicker under the name: `Centro de rescate verificado`, uppercase, ~11.5px, muted.
   - Link row `mt-3.5`: `Sitio web` / `Instagram` as two `flex-1` buttons
     (`rounded-xl border bg-background`, ~38px tall). Render only the links that exist; a
     lone link takes the full width.
   - **Fallback when `avatar_url` is null:** keep `logo_url` but render it *as a lockup* —
     `object-contain` in a 4:1 box — never cropped into a square.
6. **Remove the `<hr>`** at `pet-detail.tsx:155`; the card's own border does that work.
7. **Drop `flex-1`** from the info column so leftover space becomes bottom margin instead
   of a stretched void. The footer stays pinned by its existing `shrink-0`.

---

## 5. Backend change (`pelu-api`)

Single, additive change — no migration.

- `rcSummary` gains `AvatarURL *string \`json:"avatar_url,omitempty"\``.
- `lookupRCSummary` (`internal/pets/handler.go:135`) resolves it with a dedicated query
  rather than widening the shared `RescueCenter` struct:

  ```sql
  SELECT rc.id, rc.name, rc.logo_url, rc.website, rc.instagram, u.avatar_url
  FROM rescue_centers rc
  JOIN users u ON u.id = rc.user_id
  WHERE rc.id = $1
  ```

- Both consumers pick it up for free: `GetByID` (`handler.go:278`) and `List`'s `rcCache`
  (`handler.go:345-358`).
- Regenerate Swagger for the changed response shape.
- Frontend: `PetRescueCenter` (`lib/api/pets.ts:11`) gains `avatar_url?: string`.

**Accepted trade-off:** this is the *owning user's* photo, so if a center changes hands
its public face changes with the account. Acceptable under the current one-account-per-
center model, where `display_name` is already the account's public name.

---

## 6. Settings stub fixes

`components/dashboard/rescue-center/settings-tab.tsx`:

1. **Foto de perfil** — call `uploadAvatar(file)` (`lib/api/auth.ts:49`), then
   `updateSession({ ...user, avatar_url })` so the whole app sees it immediately.
   Initialise the preview from `user.avatar_url`. Add uploading + error states; keep the
   optimistic object-URL preview and revoke it as it does today.
2. **Nombre de usuario** — initialise from `user?.display_name ?? user?.email` (today it
   is email-only, so the field shows an email as a name) and `PATCH /api/v1/auth/profile`
   with `{ display_name }`, mirroring `business/settings-tab.tsx:159`.
3. **Nombre del centro** — populate `rescueName` from `getMyRescueCenter()` in the
   existing effect (`settings-tab.tsx:52-61`, which currently sets only logo/website/
   instagram) and save with `updateRescueCenter(rcId, { name })`.

All three need real feedback: disable while in flight, surface errors, and only then show
"Guardado".

---

## 7. i18n

New keys in **both** `public/locales/es/pets.json` and `.../en/pets.json`:

- `detail.facts.vaccines`, `detail.facts.neutering`, `detail.facts.size`
- `detail.facts.up_to_date`, `detail.facts.pending`, `detail.facts.yes`, `detail.facts.no`
- `detail.verified_center` — "Centro de rescate verificado"

Reuse `size.*`. `card.verified_center` already exists for the badge's label.

---

## 8. Files touched

**frontend**
- `components/pets/verified-badge.tsx` *(new)*
- `components/pets/pet-detail.tsx`
- `components/pets/pet-grid.tsx`
- `components/landing/featured-pets.tsx`
- `components/Carousel.tsx` (additive prop)
- `components/dashboard/rescue-center/settings-tab.tsx`
- `lib/api/pets.ts` (type only)
- `public/locales/{es,en}/pets.json`

**api**
- `internal/pets/handler.go` (`rcSummary`, `lookupRCSummary`)
- `docs/api/swagger.yaml` (regenerated)

---

## 9. Verification

- `npx vitest run` — extend `components/__tests__/pets/pet-grid-card.test.tsx` for avatar
  present/absent, and the featured-strip test (commit `b678b2d`) for badge + avatar.
- `npx tsc --noEmit`. **There is no working lint** — `bun run lint` calls `next lint`,
  removed in Next 16, with no ESLint config.
- Baseline to gate against: 1 known long-standing vitest failure + 2 pre-existing `tsc`
  errors on `main`. Requirement is "no others", not "zero".
- API: `make test-db-setup` once, then the pets package tests. Never point
  `DATABASE_URL` at the dev `pelu` DB.

**Known verification gap:** port 3000 serves a stale Docker prod build and CORS blocks API
data from any other port, so browser-verifying this sheet needs a deliberate plan (rebuild
the Docker image, or run dev on 3000 with the container stopped). The 2026-07-28 pass
shipped with every live-verification step waived; for a purely visual change that is the
biggest risk here.

---

## 10. Risks

- `Carousel` prop touches a component with 6 call sites — the default path must be
  byte-identical for the other 5.
- The avatar is a hard dependency across two repos: the card avatar cannot ship until the
  API exposes `avatar_url` **and** the settings upload actually persists. The sheet's
  logo/spacing/sliver fixes have no such dependency and can land first.
- `updateSession` after avatar upload must not clobber other session fields.

---

## 11. Suggested sequencing

1. Frontend-only, no dependencies: carousel flush fix, sheet hierarchy rebuild, facts
   list, `VerifiedBadge` extraction, `<hr>`/`flex-1` removal.
2. Settings stubs (unblocks having a photo at all).
3. API `avatar_url` on `rcSummary` + type update.
4. Avatars on the grid card, the landing strip and the sheet; fallback path removed only
   once step 3 is deployed.
