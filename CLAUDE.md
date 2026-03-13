# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pelú is a pet adoption and transport coordination platform built as an Electron desktop application. The tech stack is:
- **Frontend**: Next.js 16 (App Router) + React 19 + TailwindCSS
- **Desktop**: Electron 34 (wraps Next.js with static export)
- **Backend**: Custom REST API at `NEXT_PUBLIC_API_URL` (default: `http://localhost:8080`) — **Firebase has been removed**
- **Package Manager**: Bun
- **Languages**: Spanish (primary/default), English (secondary)

## Development Commands

```bash
# Install dependencies
bun install

# Run Next.js dev server (port 3000)
bun run dev

# Run Electron desktop app with hot reload
bun run electron:dev

# Build for production
bun run build              # Builds Next.js to /out
bun run electron:build     # Builds Next.js then packages Electron app for current platform

# Lint
bun run lint
```

**Important**: Assume the dev server (`bun run dev`) is already running. Do not start it yourself.

No test framework is configured in this project.

## Architecture & Data Flow

### Authentication Flow
1. User signs in via Email/Password or Google OAuth (`components/auth/login-page.tsx`)
2. On success, user is redirected to `/auth/role-selection` if no role is set yet
3. User selects role: `adopter`, `member`, `rescue_center`, or `business`; role is persisted via `PATCH /api/v1/auth/role`
4. `AuthProvider` (`lib/contexts/auth-context.tsx`) manages auth state globally:
   - `user`: `AuthUser` object (`id`, `email`, `role`, `display_name`, `auth_provider`, `preferred_lang`)
   - `loading`: Boolean for initial auth check
   - `login(email, password)` / `register(email, password)` / `logout()` / `setRole(role)` / `updateSession(user, token)`
5. JWT access + refresh tokens are stored in `localStorage` (`pelu_access_token`, `pelu_refresh_token`, `pelu_user`)
6. `apiClient()` (`lib/api/client.ts`) auto-retries with refreshed token on 401; fires `pelu:session-cleared` event on hard auth failure
7. Google OAuth: `googleRedirect()` redirects to `GET /api/v1/auth/google`; backend redirects back to `/auth/google/callback` with session in URL hash
8. Use `useAuth()` hook to access auth state in any component

### REST API Client

All API calls go through `lib/api/`. Three distinct fetch patterns exist:

1. **Authenticated endpoints** — use `apiClient(path, options)` from `lib/api/client.ts` (JWT auth + auto-refresh)
2. **Multipart uploads** — use raw `fetch` with `getStoredAccessToken()` because `multipart/form-data` must not have `Content-Type` set manually. Used in: `pets.ts` (`uploadPhotos`), `submissions.ts` (`uploadSubmissionFile`), `businesses.ts` (`uploadBusinessPhoto`)
3. **Public endpoints** — use raw `fetch` with no auth headers. Used in: `pets-public.ts` (public pet listing/detail, pet form, slug lookup)

API modules:
- `client.ts` — fetch wrapper, session helpers (`storeSession`, `clearSession`, `getStoredUser`, etc.)
- `auth.ts` — `login`, `register`, `logout`, `setRole`, `googleRedirect`
- `rescue-centers.ts` — CRUD for rescue centers
- `pets.ts` — RC-scoped pet CRUD + photo management (throws errors — known exception to `{ data, error }` pattern)
- `pets-public.ts` — public pet listing, detail, slug lookup, pet form retrieval (no auth)
- `forms.ts` — adoption form CRUD (form builder)
- `submissions.ts` — adoption form submissions + file upload + review (approve/reject)
- `businesses.ts` — business CRUD + cover photo upload
- `user-pets.ts` — member's personal pets

API functions return `{ data, error }` for consistent error handling. Never throw errors. (`lib/api/pets.ts` is the known exception — it throws.)

### Protected Routes

Use `ProtectedRoute` wrapper (`components/auth/protected-route.tsx`):
```tsx
<ProtectedRoute requireRole={['member', 'rescue_center']}>
  <YourComponent />
</ProtectedRoute>
```

Automatically redirects unauthenticated users to `/auth/login` and checks role requirements.

## App Router Routes

| Route | Component | Access |
|---|---|---|
| `/` | Redirects to `/pets` | Public |
| `/pets` | `components/pets/pets-page.tsx` | Public |
| `/about` | `components/landing/landing-page.tsx` | Public |
| `/p/[slug]` | Short URL → pet detail | Public |
| `/adopt/[pet-id]` | Adoption form fill page | Authenticated (`member`) |
| `/auth/login` | `components/auth/login-page.tsx` | Public |
| `/auth/register` | `components/auth/register-page.tsx` | Public |
| `/auth/role-selection` | `components/auth/role-selection.tsx` | Authenticated (no role yet) |
| `/auth/google/callback` | OAuth redirect target | Public |
| `/auth/onboarding/[role]` | `components/auth/onboarding/onboarding-client.tsx` | Authenticated; routes to role-specific wizard |
| `/dashboard/rescue-center` | `components/dashboard/rescue-center/` | `rescue_center` role only |

Each dashboard route uses a `layout.tsx` that wraps children in `<ProtectedRoute>` with `requireRole`.

## Design System

### Pelú Brand Colors (OKLCH)
- **Slate**: `oklch(12.9% 0.042 264.695)` - Primary dark
- **Zinc**: `oklch(14.1% 0.005 285.823)` - Neutral dark
- **Dark Red**: `oklch(25.8% 0.092 26.042)` - Accent (use sparingly!)
- **Pop** (`--color-pop-*`): Gradient accent color used for step indicators, beams, and CTAs (shades: 450, 500, 550)

Configured in `app/globals.css` via `@theme {}` block (Tailwind v4 — no `tailwind.config.ts`) with full shade ranges (50-900).

### Geometry Rules
- **Cards**: Always use `rounded-2xl`
- **Buttons**: Always use `rounded-xl`
- **Circles**: ONLY for avatars and status indicators
- No other border radius values allowed

### Typography
Fonts: Inter, Source Sans 3, Manrope (in that order)

### Icons
**Font Awesome only** — never use lucide-react or inline SVGs.

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'

<FontAwesomeIcon icon={faPaw} className="w-4 h-4" />
```

Packages installed: `@fortawesome/fontawesome-svg-core`, `@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/free-regular-svg-icons`, `@fortawesome/free-brands-svg-icons`

## Internationalization (i18n)

**Default language**: Spanish (`es`)

Translation files: `public/locales/{locale}/{namespace}.json`

Namespaces: `common`, `landing`, `auth`, `pets` (implemented) — `chat` and `transport` are planned but don't exist yet.

**How translations work** — react-i18next with bundled resources (no HTTP fetch):
```tsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation('landing')
// t('hero.title') — dot notation, falls back to Spanish if key missing
// No loading state needed — resources are bundled synchronously
```
i18next is initialized in `lib/i18n/index.ts` with all JSON files imported directly. The `I18nProvider` component (`components/i18n-provider.tsx`) triggers this initialization on the client.

When adding new UI text:
1. Add Spanish translation first in `public/locales/es/{namespace}.json`
2. Add English translation in `public/locales/en/{namespace}.json`
3. Import the new JSON files in `lib/i18n/index.ts` and add to `resources`
4. Reference types in `lib/i18n/config.ts`

## Key Components

- `components/Stepper.tsx` — Multi-step wizard UI with animated slide transitions (uses `motion/react`). Exports `Stepper` (default) and `Step`. Key props: `onFinalStepCompleted`, `title`, `subtitle`, `headerLeft`, `renderStepIndicator`, `backButtonText`/`nextButtonText`, `disableStepIndicators`.
- `components/Carousel.tsx` — Image carousel used in pet card previews.
- `components/auth/onboarding/onboarding-nav.tsx` — `OnboardingNav` breadcrumb bar. Items with `changeRole: true` set a `pelu_changing_role` flag in localStorage before navigating.
- `components/auth/onboarding/onboarding-client.tsx` — Routes to role-specific wizard based on URL param: `adopter-wizard`, `member-wizard`, `rescue-center-wizard`, `business-wizard`
- `components/forms/form-renderer.tsx` — Shared renderer for adoption forms (used in `/adopt/[pet-id]` and form preview)
- `components/pets/` — Pet discovery: split grid + detail panel layout (`pets-page.tsx`, `pet-grid.tsx`, `pet-detail.tsx`, `pets-header.tsx`)
- `components/dashboard/rescue-center/` — Dashboard shell, sidebar, mobile nav, and tabs: pets, interested, forms, notifications, agenda, settings. `add-pet-modal.tsx` handles pet creation + photo upload. `logo-upload.tsx` for RC logo.

> Note: `hooks/` at the project root is a **Claude Code protection script** (prevents reading `.env` files), not React hooks.

## TypeScript Types

User-related types in `lib/types/user.ts`:
```typescript
type UserRole = 'adopter' | 'member' | 'rescue_center' | 'business'
type Language = 'es' | 'en'
interface AuthUser { id, email, role: UserRole | null, display_name: string | null, auth_provider, preferred_lang }
```

Pet-related types are co-located in `lib/api/pets.ts`:
```typescript
interface Photo { id, url, position: number }
interface Pet { id, rescue_center_id, name, description, age: number, gender: 'male'|'female', species: 'dog'|'cat', status, short_slug, photos: Photo[], conditions: string[], condition_notes: string | null }
```

Form/submission types in `lib/api/forms.ts` and `lib/api/submissions.ts`.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_API_URL   # REST API base URL, e.g. http://localhost:8080
```

## Electron Configuration

- **Main process**: `electron/main.js` - Window management, app lifecycle
- **Preload script**: `electron/preload.js` - Context bridge for secure IPC
- **Build config**: `package.json` → `build` section (electron-builder)
- **Static export**: Next.js configured with `output: 'export'` in `next.config.js`

Dev mode loads from `http://localhost:3000`, production loads from `out/index.html`.

## shadcn/ui Integration

Configuration: `components.json`
- Style: "new-york", base color: "slate", CSS variables enabled
- Path aliases: `@/components`, `@/lib`, `@/hooks`
- No `tailwindConfig` field (removed after Tailwind v4 migration)

Add components: `npx shadcn@latest add [component]`

## Implementation Workflow

> **Single plan file**: `~/.claude/plans/wise-scribbling-shore.md` is the single source of truth for all implementation plans. Never create a new plan file — always append to or edit that file only.

1. Create plan in `tasks/todo.md` with checkboxes
2. Get user approval before starting
3. Implement incrementally, checking off items
4. Keep changes minimal and focused
5. Add review section to `tasks/todo.md` when complete

## Key Implementation Decisions

1. **Next.js static export** for Electron compatibility (no SSR at runtime)
2. **Custom REST API** backend replaces Firebase; JWT tokens stored in `localStorage`
3. **Spanish-first** design — all UI defaults to Spanish
4. **Role-based access** enforced by the backend API
5. **Email/Password + Google OAuth** — Apple OAuth not included (requires Apple Developer Program)
6. **Santo Domingo focus** for MVP (transport tracking scoped to this city initially)
7. **`/pets` is the homepage** — landing page moved to `/about`
8. **Logo asset organization** — Static assets stored in `public/assets/` for easy reuse

## Future Phases

The project follows a phased implementation plan (see `.claude/plans/wise-scribbling-shore.md`):
- ✅ Phase 1: Project Foundation
- ✅ Phase 2: Authentication
- ✅ Phase 3: Landing Page
- ✅ Phase 4: Rescue Center Dashboard + Pet Discovery + Sharing + Adoption Forms
- Phase 5: Chat System
- Phase 6: Transport Tracking
- Phase 7: Payment Integration (PayPal/Apple Wallet redirect only)
