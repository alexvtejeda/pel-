# Pelú — Pet Adoption & Transport Platform

Spanish-first (Dominican Republic) pet adoption and transport-coordination
platform. Ships as a web app and, from the same codebase, as an Electron desktop
app. Built with Next.js 16 (App Router), React 19, TailwindCSS v4 and Electron 34.

The backend is a separate Go REST API (`pelu-api` repo). There is no shared type
package — the API's OpenAPI spec is the contract, and TypeScript types are
hand-maintained under `lib/types` and alongside each `lib/api/*` module.

## Quick Start

### Prerequisites

- **Bun** — the package manager and task runner for this repo
- **Node.js 20.9+** — required by Next 16
- The **Pelú REST API** running locally (`pelu-api` repo, port **2701**)

### Installation

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Create `.env.local`**

   No `.env.example` is committed. The app needs exactly one variable:

   ```bash
   echo 'NEXT_PUBLIC_API_URL=http://localhost:2701' > .env.local
   ```

   Point it at `https://api.pelurd.com` to run against the deployed API instead.
   (`lib/api/client.ts` falls back to `http://localhost:8080` when the variable is
   missing — that fallback is stale and matches no real environment. Always set
   the variable.)

### Commands

| Command | What it does |
|---|---|
| `bun run dev` | Next.js dev server on port 3000 |
| `bun run build` | Static export to `out/` |
| `bun run start` | Serve the built `out/` on port 3000 (`serve`) |
| `bun run electron` | Run Electron against an existing build |
| `bun run electron:dev` | Next dev server + Electron with hot reload |
| `bun run electron:build` | Build, then package the desktop app with electron-builder |
| `npx vitest run` | Run the test suite (see below) |
| `npx tsc --noEmit` | Type-check — this is the real static check |

> **`bun run lint` does not work.** The script still calls `next lint`, which
> Next 16 removed, and no ESLint config exists in the repo. Use
> `npx tsc --noEmit` until the script is replaced.

## Testing

Vitest + React Testing Library in a jsdom environment. **There is no `test` npm
script** — invoke Vitest directly:

```bash
npx vitest run                                   # everything (~87 test files)
npx vitest run components/__tests__/pets         # one directory
npx vitest run path/to/file.test.tsx             # one file
```

Tests live in `components/__tests__/` and `lib/**/__tests__/`. Config is
`vitest.config.ts` (jsdom, globals, `@` path alias); `vitest.setup.ts` registers
`@testing-library/jest-dom`, so matchers like `toBeInTheDocument()` are global.

Use **`renderWithProviders()`** from `components/__tests__/test-utils.tsx`
instead of raw `render()` — it wraps the tree in the i18n provider and mocks
`next/navigation` and `next/image`.

## Architecture

- **Frontend**: Next.js 16 (App Router) + React 19 + TailwindCSS v4
- **Desktop**: Electron 34 wrapping the static export (`output: 'export'`)
- **Backend**: Go REST API at `NEXT_PUBLIC_API_URL`, plus a WebSocket at `/api/v1/ws`
- **Auth**: HTTP-only cookies (`credentials: 'include'`) — no tokens in `localStorage`
- **Package manager**: Bun

Firebase is still in `package.json` but is **unused** — a legacy dependency,
imported nowhere.

### Provider stack

`app/layout.tsx` nests: `I18nProvider` → `AuthProvider` → `WebSocketProvider` →
`RouteTransitionProvider` → children. Also mounted inside the stack:
`<TransitionOverlay />`, `<LanguagePreferenceSync />`, `<RCApprovalListener />`
and Sonner's `<Toaster />`.

### Authentication flow

1. User signs in or registers at `/auth/login` (email/password or Google OAuth)
2. Google OAuth: `GET /api/v1/auth/google` → backend redirects to `/auth/google/callback`
3. With no role yet, the user lands on `/auth/role-selection`, then the
   role-specific wizard at `/auth/onboarding/[role]`
4. `AuthProvider` (`lib/contexts/auth-context.tsx`) owns auth state; read it with
   the `useAuth()` hook (`user`, `loading`, `login`, `register`, `logout`,
   `setRole`, `updateSession`)
5. `apiClient()` sends `credentials: 'include'` on every request, retries once via
   `POST /api/v1/auth/refresh` on a 401, and fires a `pelu:session-cleared` event
   on hard auth failure

**MFA** (`lib/api/mfa.ts`, UI at `/auth/mfa/enrollment`) covers TOTP, WebAuthn
passkeys, email OTP and recovery codes. Passkey ceremonies go through
`@simplewebauthn/browser` — never call `navigator.credentials` directly.

### Route protection

All auth is **client-side** — there is no Next.js middleware. Routes are guarded
by wrapping a `layout.tsx` in `<ProtectedRoute requireRole={[...]}>`:

```tsx
<ProtectedRoute requireRole={['member', 'rescue_center']}>
  <YourComponent />
</ProtectedRoute>
```

Three dashboards add a second guard on top of the role check: `RescueCenterGuard`
and `BusinessGuard` (in `components/auth/`) and `AdminGuard` (in
`components/dashboard/admin/`).

### REST API client

Everything goes through `lib/api/`. Three deliberate fetch patterns:

1. **Authenticated** — `apiClient(path, options)` from `lib/api/client.ts`
   (cookie auth + auto-refresh)
2. **Multipart uploads** — raw `fetch` with `credentials: 'include'` and **no
   manual `Content-Type`**, so the browser can set the boundary
   (`pets.ts`, `submissions.ts`, `businesses.ts`)
3. **Public** — raw `fetch`, no auth (`pets-public.ts`, `providers.ts`, and the
   read paths in `events.ts`)

API functions return `{ data, error }` and never throw. **`lib/api/pets.ts` is
the one exception — it throws.**

### WebSocket

`lib/contexts/websocket-context.tsx` connects authenticated users of every role
to `/api/v1/ws` and exposes `useWebSocket()`: `connected`, `sendMessage`,
`sendTyping`, `sendReadReceipt`, `subscribe(type, handler)` and `unreadChatCount`.
The frontend sends `send_message`, `typing` and `read_receipt`, and subscribes to
`new_message`, `typing`, `read_receipt`, `new_submission`, `submission_reviewed`,
`rc_status_updated`, and the transport events `driver_location`,
`trip_status_changed` and `stop_completed`.

Note: incoming `new_message` events nest the payload under `data.message`, not at
the top level of `data`.

### Static export constraints

`next.config.js` sets `output: 'export'` and `distDir: 'out'`, which shapes two
things worth knowing before you add a route:

- **Dynamic segments only work if every value is known at build time.**
  `/auth/onboarding/[role]` qualifies — it enumerates the three roles in
  `generateStaticParams()`. Pet IDs and slugs do not, so those deep links are
  query params instead: `/p?slug=<short-slug>` and `/adopt?id=<pet-id>`.
- **`useSearchParams()` requires a `<Suspense>` boundary**, or the export refuses
  to prerender the route.
- Image optimisation is off (`images.unoptimized`).

## Routes

| Route | Access | What it is |
|---|---|---|
| `/` | public | Landing page (hero, testimonial carousel, logo marquee) |
| `/pets` | public | Pet discovery — grid + detail sheet ≥640px, post feed below |
| `/aliados` | public | Service-provider directory |
| `/eventos` | public | Events listing |
| `/about` | public | Scrollytelling about page |
| `/p?slug=` | public | Short-link pet detail (resolves, then opens `/pets`) |
| `/auth/*` | public | Login, register, role selection, Google callback, MFA enrollment, onboarding |
| `/adopt?id=` | member | Adoption form fill (redirects to login if signed out) |
| `/mis-mascotas` | member | The member's own published pets |
| `/chat` | member | Messaging |
| `/servicios` | member | Apply to become a service provider (pending / active / rejected) |
| `/transporte` | member, rescue_center | Transport request + live tracking map |
| `/transporte/negocios` | member, rescue_center | Nearby transport businesses (geolocated) |
| `/dashboard/rescue-center` | rescue_center | Pets, interested, forms, agenda, metrics, chat, settings |
| `/dashboard/business` | business | Requests, chat, agenda, settings |
| `/dashboard/admin` | `is_admin` users | RC approvals, service-provider review, form templates |

Public routes navigate through `TransitionLink` (not `next/link`) so the
`TransitionOverlay` animation fires.

Note: `pages/` exists but is empty — this project uses the App Router only.

## Project Structure

```
├── app/                       # Next.js App Router
│   ├── (public)/              # Landing, /pets, /aliados, /eventos (shared header)
│   ├── auth/                  # Login, register, role selection, MFA, onboarding
│   ├── dashboard/             # rescue-center, business, admin
│   ├── adopt/  p/  chat/      # Query-param deep links and messaging
│   ├── mis-mascotas/  servicios/
│   └── transporte/            # Tracking + /negocios directory
├── components/
│   ├── about/                 # Scrollytelling scenes, lean canvas
│   ├── adopt/                 # Adoption form fill page
│   ├── auth/                  # Login, register, guards, MFA, onboarding wizards
│   ├── chat/                  # Conversation list + message thread
│   ├── dashboard/
│   │   ├── rescue-center/     # Pets, interested, forms, agenda, metrics, settings
│   │   ├── business/          # Requests, chat, agenda, settings
│   │   └── admin/             # RC approvals, form templates, AdminGuard
│   ├── events/                # /eventos listing
│   ├── forms/                 # Adoption form builder and renderer
│   ├── landing/               # Hero, testimonial carousel, logo marquee
│   ├── pets/                  # Discovery grid, detail sheet, mobile feed, headers
│   ├── providers/             # Provider cards for /aliados
│   ├── service-providers/     # /servicios application form and status
│   ├── transitions/           # Route transition context, overlay, TransitionLink
│   ├── transport/             # Transport request flow and tracking map
│   ├── ui/                    # shadcn/ui primitives + shared bits
│   └── __tests__/             # Component tests
├── lib/
│   ├── api/                   # REST modules (auth, pets, forms, chat, admin, …)
│   ├── contexts/              # AuthProvider, WebSocketProvider
│   ├── hooks/                 # use-media-query (read its hydration contract)
│   ├── i18n/                  # i18next init with bundled resources
│   ├── about/  auth/  data/  utils/
│   └── types/                 # Hand-maintained API types
├── public/
│   ├── assets/                # Images and logo
│   └── locales/               # es/ and en/ translation JSON
├── electron/                  # Main process + preload
├── scripts/                   # swap-env.sh (toggle dev ↔ prod API URL)
├── docs/superpowers/          # Design specs and implementation plans
└── Dockerfile  nginx.conf     # Production image (see Deployment)
```

`hooks/` at the repo root is **not** a React hooks directory — it holds a Claude
Code protection script.

## Design System

### Brand colors (OKLCH, defined in `app/globals.css`)

- **Slate** `oklch(12.9% 0.042 264.695)` — primary dark
- **Zinc** `oklch(14.1% 0.005 285.823)` — neutral dark
- **Dark Red** `oklch(25.8% 0.092 26.042)` — accent, use sparingly
- **Pop** (`--color-pop-*`, shades 450–950) — the gradient accent for step
  indicators, beams and CTAs. `pop-800` (aliased `--color-pop-solid`) is the
  darkest shade that clears 4.5:1 on white; `pop-550` is decoration only.

**There is no `tailwind.config.ts`** — this is Tailwind v4 and all theme
configuration lives in the `@theme {}` block in `app/globals.css`.

### Geometry

Cards `rounded-2xl` · Buttons `rounded-xl` · Circles only for avatars and status
indicators. No other radius values.

### Typography

Inter, Source Sans 3, Manrope — in that order.

### Icons

**Font Awesome only** — no lucide-react, no inline SVGs in app or feature code.
Size with `text-*` classes, never `w-*`/`h-*`.

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'

<FontAwesomeIcon icon={faPaw} className="text-base" />
```

The one exception: shadcn/ui primitives under `components/ui/` import
`lucide-react` internally. Leave those as they ship.

### Components

shadcn/ui — "new-york" style, slate base, CSS variables (`components.json`).
Add with `npx shadcn@latest add [component]`.

## Internationalization

**Spanish is the default**; English is secondary. Six namespaces, each with an
`es` and an `en` file under `public/locales/`:

`common` · `landing` · `auth` · `pets` · `transport` · `business`

Translations are **bundled, not fetched** — `lib/i18n/index.ts` imports every
JSON file directly, so there is no loading state:

```tsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation('landing')
t('hero.title')   // dot notation; falls back to Spanish on a missing key
```

To add UI text: write the Spanish string first, add the English one, and — if you
created a new namespace file — import it in `lib/i18n/index.ts` and register it
under `resources`.

## User Roles

| Role | Description |
|---|---|
| `member` | Pet owner or adopter |
| `rescue_center` | Animal rescue organization |
| `business` | Pet-related business (transport, grooming, veterinary, …) |

Those three are the whole of `UserRole` (`lib/types/user.ts`). **Admin is not a
role** — it is an `is_admin` flag returned by `/api/v1/auth/me`, which is why
`AdminGuard` checks that endpoint instead of the user's role.

## Deployment

Production is the **static export served by nginx**, built by the two-stage
`Dockerfile` (bun build → `nginx:alpine`) and listening on port **3000**:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.pelurd.com -t pelu-frontend .
docker run -p 3000:3000 pelu-frontend
```

`NEXT_PUBLIC_API_URL` is a **build argument**, not a runtime one — `output: 'export'`
inlines `NEXT_PUBLIC_*` values into the generated HTML and JS. Changing the API
URL therefore requires a rebuild, not a container restart.

`nginx.conf` mirrors the clean-URL behaviour of `serve`
(`try_files $uri $uri.html $uri/index.html =404`), caches fingerprinted
`/_next/static/` assets for a year, and renders `404.html` with a real 404 status.

For local work, `scripts/swap-env.sh` toggles `NEXT_PUBLIC_API_URL` in
`.env.development.local` between `http://localhost:2701` and
`https://api.pelurd.com`.

## Electron

- **Main process**: `electron/main.js` — window management and app lifecycle
- **Preload**: `electron/preload.js` — context bridge for IPC
- **Packaging**: the `build` section of `package.json` (electron-builder;
  NSIS on Windows, DMG on macOS, AppImage on Linux)

Dev mode loads `http://localhost:3000`; production loads `out/index.html`.

## License

Private project — all rights reserved.
