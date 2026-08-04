# Route-based locales (`/es/…`, `/en/…`)

**Status:** Draft — awaiting approval
**Date:** 2026-08-04
**Scope:** Frontend only. No API change, no contract change.

---

## 1. Why

`/auth/login` throws a React hydration mismatch: the HTML says
`Bienvenido de vuelta`, the client renders `Welcome back`.

The cause is structural, not a typo:

1. `lib/i18n/index.ts:20` pins `lng: 'es'`, so `output: 'export'` bakes **one**
   language — Spanish — into every HTML file.
2. `components/i18n-provider.tsx:8` mutates the **global** i18n instance from a
   `useEffect`, commented *"Runs only on the client after hydration — safe"*.
3. Six routes wrap their page in `<Suspense>` (required for `useSearchParams`).

Claim 2 is false for content inside a Suspense boundary: React hydrates those on
its own schedule, **after** root effects have run. So `i18n.language` is already
`en` by the time the boundary hydrates, and every translated string inside it
disagrees with the HTML.

Affected routes — any of these, for any user with `pelu_lang=en`:
`/auth/login`, `/auth/mfa/enrollment`, `/transporte`, `/adopt`, `/p`,
`/mis-mascotas`.

**The fix is to stop having a "current language" that can drift from the HTML.**
When the locale is part of the URL, server and client derive it from the same
source and the mismatch is impossible by construction — not merely unlikely.

## 2. Constraints

| Constraint | Consequence |
|---|---|
| `output: 'export'` (`next.config.js:4`) | Everything must be prerenderable. `generateStaticParams` required on every dynamic segment. |
| **Middleware is unsupported under `output: 'export'`** | The locale redirect in Next's own i18n guide **cannot be used**. Locale selection for a bare URL must happen client-side or in nginx. |
| Electron loads `out/index.html` (`electron/main.js:22`) | The file the root emits must work over `file://`, where a redirect to `/es` does not resolve. |
| nginx serves the export: `try_files $uri $uri.html $uri/index.html =404` | Works for either URL shape; no change needed. |
| Pet share links are a shipped feature | `pet-detail.tsx:95` and `pet-grid.tsx:46` build `${origin}/p?slug=…`. **Those URLs are already in the wild.** Breaking them breaks sharing retroactively. |
| ~100 navigation call sites | 63 `router.push/replace`, 36 literal `href="/…"`, across 11 `next/link` + 16 `TransitionLink` files. |

## 3. Decision — URL shape

Three shapes were considered.

**(a) Both locales prefixed, single `[lang]` tree.** `/es/pets`, `/en/pets`.
Canonical Next pattern, one copy of every route. But *every* existing URL moves,
including `/p?slug=…`.

**(b) Spanish stays unprefixed, `app/en/` mirrors it.** `/pets` + `/en/pets`.
Preserves every existing URL exactly. But the route tree is duplicated forever —
every new route must be added twice, and three pages are not thin wrappers
(`mis-mascotas` 253 lines, `transporte/negocios` 154, `servicios` 102), so the
mirror is real code, not re-exports.

**(c) — CHOSEN. Both locales prefixed, plus a redirect stub for every legacy
static route.**

Single canonical `[lang]` tree, and every path that worked before still works:

| Legacy path | Behaviour |
|---|---|
| `/` | Locale-picking stub → `/es` or `/en` |
| `/p` | Stub, **preserves the query string** → `/{lang}/p?slug=…` |
| all 18 other static routes | Stub → `/{lang}/…` |

**Revised during implementation — originally this was six "public" stubs.**
That line was wrong, and dangerously so: the Go API 307-redirects to
**`{FRONTEND_URL}/auth/google/callback`** (`api/internal/auth/handler.go:411`),
an unprefixed URL baked into server config. Without a stub there, Google sign-in
breaks outright. Once "nobody shares this one" turns out to be false for an auth
route, the public/private split is not a safe criterion — so every static legacy
route gets a stub, and the question stops needing a judgement call. 20 stubs,
each 8 lines from one template.

Dynamic segments (`auth/onboarding/[role]`) are **not** stubbed: they are only
ever reached from in-app navigation, which is locale-aware.

(b) was rejected because permanent tree duplication is a worse long-term tax
than six stub files, and because it makes the three fat pages genuinely
duplicated logic. (a) was rejected because it silently breaks shared pet links.

## 4. Architecture

### 4.1 The tree

Everything under `app/` moves to `app/[lang]/`, preserving the existing
`(public)` route group and all layouts:

```
app/
  layout.tsx                  ← stays: <html>, fonts, global CSS only
  page.tsx                    ← NEW: root locale-picking stub
  p/page.tsx                  ← NEW: legacy stub, preserves ?slug=
  pets|about|aliados|eventos/page.tsx   ← NEW: legacy stubs
  [lang]/
    layout.tsx                ← NEW: generateStaticParams + provider stack
    (public)/{page,pets,aliados,eventos}
    about|adopt|chat|servicios|transporte|mis-mascotas|p/…
    auth/…  dashboard/…
```

`generateStaticParams` on `app/[lang]/layout.tsx` returns
`[{ lang: 'es' }, { lang: 'en' }]`. The existing `[role]` segment composes with
it — `generateStaticParams` in `auth/onboarding/[role]` keeps returning only
`role`, and Next produces the 2 × 3 cross product.

Output roughly doubles: ~21 routes × 2 locales. Acceptable for a static export
of this size.

### 4.2 i18n instances

`lib/i18n/index.ts` stops being a singleton pinned to `es`. It exports a factory:

```ts
export function getI18n(lang: SupportedLanguage) // memoised per lang
```

built on `i18n.cloneInstance({ lng })` so both locales can be rendered in the
same build without global mutation. `I18nProvider` becomes a thin wrapper that
takes `lang` from the route segment and renders `<I18nextProvider i18n={getI18n(lang)}>`.

**`changeLanguage` disappears from the render path entirely.** That is the actual
fix — with no global mutation there is nothing to race hydration.

`components/language-preference-sync.tsx` stops calling `changeLanguage`; see 4.4.

### 4.3 Navigation

Adding a prefix by hand at ~100 call sites is where this migration would rot. Two
helpers instead:

- `useLocalePath()` → `(path: string) => \`/${lang}${path}\``, `lang` from `useParams()`.
- `useLocaleRouter()` → wraps `useRouter`, prefixing `push`/`replace`.

`TransitionLink` and a thin `Link` wrapper apply `useLocalePath` internally, so
the 36 literal `href="/pets"` values **stay as they are** — only the import
changes. `router.push` call sites switch to `useLocaleRouter`. Paths stay written
locale-free everywhere, which is what keeps this maintainable.

`lib/auth/post-login-redirect.ts` takes a `RouterLike` already, so it needs no
change beyond being handed the locale-aware router.

### 4.4 Choosing and persisting a locale

`pelu_lang` in localStorage stays the record of an explicit choice, but it no
longer drives rendering — it drives **redirection**:

- The `/` stub reads `resolveLanguage()` and replaces to `/{lang}`. This is a
  client-only route with no translated text, so it cannot mismatch.
- `LanguageSwitcher` becomes navigation: write `pelu_lang`, then
  `router.replace(switchLocalePath(pathname, target))`, preserving path + query.
- `LanguagePreferenceSync` (profile `preferred_lang`) navigates instead of
  mutating i18n, and still defers to an explicit local choice.

`resolveLanguage()` in `lib/i18n/language.ts` keeps its current order — explicit
choice → profile preference → `es` — and still never sniffs the browser. Pelú
stays Spanish-first.

### 4.5 Electron

`electron/main.js:22` must load the Spanish entry directly. The `/` stub is a JS
redirect and would leave a `file://` Electron window on a blank page. Dev mode
(`loadURL('http://localhost:3000')`) is unaffected — the stub works over HTTP.

The file is **`out/es.html`**, not `out/es/index.html`: `trailingSlash` is off,
so the export writes a sibling `.html` per route. (Verified against a real build,
correcting an earlier assumption in this spec.)

Electron is single-locale (Spanish) after this change unless a menu item is
added. Called out as a **known limitation**, not silently accepted.

### 4.6 `<html lang>`

`app/layout.tsx` currently hardcodes the `lang` attribute. It moves to
`app/[lang]/layout.tsx` so the served HTML declares its real language — an
accessibility win this app does not currently get right.

## 5. Tasks

Ordered so the app is runnable at each step.

1. `lib/i18n/index.ts` → per-locale factory; `I18nProvider` takes `lang`.
2. Add `app/[lang]/layout.tsx` with `generateStaticParams`; move `<html lang>`.
3. Move the route tree under `[lang]` (`git mv`, preserving history).
4. Add `useLocalePath` / `useLocaleRouter`; wrap `TransitionLink` + `Link`.
5. Convert the 63 `router.push/replace` call sites.
6. `LanguageSwitcher` → navigation; `LanguagePreferenceSync` → navigation.
7. Root `/` stub + the five legacy stubs (`/p` must keep its query string).
8. Electron → `out/es/index.html`.
9. Update tests: `renderWithProviders` supplies a `lang`; route assertions gain
   the prefix.
10. Verify: `tsc --noEmit`, `vitest run`, `next build`, and a browser pass on all
    six formerly-broken routes in both locales.

## 6. Verification

- **The bug itself:** load each of the six Suspense routes with `pelu_lang=en`
  and confirm a clean console. This is the acceptance test.
- `next build` emits `out/{es,en}/…` for all 21 routes plus the 6 stubs.
- A legacy `/p?slug=…` link lands on the pet, query string intact.
- `vitest run` — current baseline is 936/937 (`design-system.test.ts` is a known
  pre-existing failure and must not get worse).
- Electron opens Spanish from a packaged build.

## 7. Non-goals

- No new languages. `es` + `en` only.
- No `Accept-Language` sniffing — deliberate, per `language.ts`.
- No API or contract change; `preferred_lang` semantics are unchanged.
- No SEO work (hreflang, sitemap) — worth a follow-up once URLs settle.

## 8. Risks

- **Blast radius is the whole route tree.** Mitigated by helpers (4.3) so paths
  stay locale-free at call sites, and by moving files with `git mv`.
- **Every public URL changes.** Mitigated by the stubs, but anything already
  shared now takes one extra client-side hop.
- **Doubled build output** and doubled prerender time.
- **Electron regresses to single-locale** until a menu toggle is added.
