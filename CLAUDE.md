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

## Architecture & Data Flow

### Authentication Flow
1. User signs in via Email/Password or Google OAuth (`components/auth/login-page.tsx`)
2. On success, user is redirected to `/auth/role-selection` if no role is set yet
3. User selects role: `adopter`, `owner`, or `rescue_center`; role is persisted via `PATCH /api/v1/auth/role`
4. `AuthProvider` (`lib/contexts/auth-context.tsx`) manages auth state globally:
   - `user`: `AuthUser` object (`id`, `email`, `role`, `auth_provider`, `preferred_lang`)
   - `loading`: Boolean for initial auth check
   - `login(email, password)` / `register(email, password)` / `logout()` / `setRole(role)` / `updateSession(user, token)`
5. JWT access + refresh tokens are stored in `localStorage` (`pelu_access_token`, `pelu_refresh_token`, `pelu_user`)
6. `apiClient()` (`lib/api/client.ts`) auto-retries with refreshed token on 401; fires `pelu:session-cleared` event on hard auth failure
7. Google OAuth: `googleRedirect()` redirects to `GET /api/v1/auth/google`; backend redirects back to `/auth/google/callback` with session in URL hash
8. Use `useAuth()` hook to access auth state in any component

### Landing Page
The landing page (`components/landing/landing-page.tsx`) is publicly accessible without authentication:
- **Hero section**: Headline, stats (2M+ animals, 100+ rescue centers, FREE adoption), CTAs
- **Problem section**: Explains Dominican Republic's stray animal crisis
- **Solution section**: Four key features (swipe interface, simplified process, transport tracking, support)
- **Value propositions**: Benefits for adopters and rescue centers
- **Transparency section**: Pricing (9.66 RD$/km transport), data usage, mission
- **Footer**: Links, language switcher, copyright

The header (`components/landing/header.tsx`) includes:
- Pelú logo (clickable, links to home)
- Language switcher (ES/EN)
- Login button

### REST API Client

All API calls go through `lib/api/`:
- `lib/api/client.ts` — `apiClient(path, options)` fetch wrapper with JWT auth + auto-refresh; session helpers (`storeSession`, `clearSession`, `getStoredUser`, etc.)
- `lib/api/auth.ts` — `login`, `register`, `logout`, `setRole`, `googleRedirect`
- `lib/api/rescue-centers.ts` — `listRescueCenters`, `getRescueCenter`, `createRescueCenter`, `updateRescueCenter`

API functions return `{ data, error }` for consistent error handling. Never throw errors.

### Protected Routes

Use `ProtectedRoute` wrapper (`components/auth/protected-route.tsx`):
```tsx
<ProtectedRoute requireRole={['owner', 'rescue_center']}>
  <YourComponent />
</ProtectedRoute>
```

Automatically redirects unauthenticated users to `/auth/login` and checks role requirements.

## Design System

### Pelú Brand Colors (OKLCH)
- **Slate**: `oklch(12.9% 0.042 264.695)` - Primary dark
- **Zinc**: `oklch(14.1% 0.005 285.823)` - Neutral dark
- **Dark Red**: `oklch(25.8% 0.092 26.042)` - Accent (use sparingly!)

Configured in `app/globals.css` via `@theme {}` block (Tailwind v4 — no `tailwind.config.ts`) with full shade ranges (50-900).

### Geometry Rules
- **Cards**: Always use `rounded-2xl`
- **Buttons**: Always use `rounded-xl`
- **Circles**: ONLY for avatars and status indicators
- No other border radius values allowed

### Typography
Fonts: Inter, Source Sans 3, Manrope (in that order)

## Internationalization (i18n)

**Default language**: Spanish (`es`)

Translation files: `public/locales/{locale}/{namespace}.json`

Namespaces: `common`, `landing`, `auth`, `pets`, `chat`, `transport`

> Currently implemented namespace JSON files: `common`, `landing`, `auth`, `pets`. The `chat` and `transport` namespaces are planned but their JSON files do not exist yet.

**How translations work** — react-i18next with bundled resources (no HTTP fetch):
```tsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation('landing')
// t('hero.title') — dot notation, falls back to Spanish if key missing
// No loading state needed — resources are bundled synchronously
```
i18next is initialized in `lib/i18n/index.ts` with all JSON files imported directly. The `I18nProvider` component (`components/i18n-provider.tsx`) triggers this initialization on the client.

**Language detection** — automatic via `i18next-browser-languagedetector`:
- Reads `i18nextLng` from `localStorage` first, then falls back to `navigator.language`
- Persists the detected/set language to `localStorage` key `i18nextLng`
- No manual language switcher; language matches browser preference

When adding new UI text:
1. Add Spanish translation first in `public/locales/es/{namespace}.json`
2. Add English translation in `public/locales/en/{namespace}.json`
3. Import the new JSON files in `lib/i18n/index.ts` and add to `resources`
4. Reference types in `lib/i18n/config.ts`

## App Router Routes

| Route | Component | Access |
|---|---|---|
| `/` | `app/page.tsx` → `components/landing/landing-page.tsx` | Public |
| `/auth/login` | `components/auth/login-page.tsx` | Public |
| `/auth/role-selection` | `components/auth/role-selection.tsx` | Authenticated (no role yet) |
| `/auth/google/callback` | `app/auth/google/callback/page.tsx` | Public (OAuth redirect target) |
| `/dashboard/rescue-center` | `components/dashboard/rescue-center/` | `rescue_center` role only |

Each dashboard route uses a `layout.tsx` that wraps children in `<ProtectedRoute>` with `requireRole`.

## File Structure Patterns

### Components Organization
- `components/auth/` - Authentication-related components
- `components/landing/` - Landing page components (header, landing-page)
- `components/logo.tsx` - Reusable logo component with Pelú dog illustration
- `components/ui/` - shadcn/ui components (base UI primitives)
- `components/dashboard/rescue-center/` - Rescue center dashboard: `dashboard-shell.tsx` (layout wrapper), `rescue-center-sidebar.tsx`, `mobile-bottom-nav.tsx`, and tabs: pets, interested, forms, notifications, agenda, settings
- `components/pets/` - Pet listing and discovery (future)
- `components/chat/` - Messaging system (future)
- `components/transport/` - Transport tracking (future)
- `components/forms/` - Form builder for adoption requirements (future)

### Library Organization
- `lib/api/` - REST API client (`client.ts`), auth (`auth.ts`), and resource modules (e.g. `rescue-centers.ts`)
- `lib/contexts/` - React context providers (`auth-context.tsx`)
- `lib/hooks/` - Custom React hooks
- `lib/types/` - TypeScript type definitions
- `lib/i18n/` - Internationalization configuration (types/config only)
- `lib/data/` - Mock/seed data used during development (e.g. `mock-rescue-center.ts`)
- `lib/utils.ts` - Utility functions (use `cn()` for className merging)

### Notable Dependencies
- `date-fns` - Date formatting and manipulation (used in notifications, agenda)
- `react-day-picker` - Calendar/date picker UI (used in agenda tab)

> Note: `hooks/` at the project root is a **Claude Code protection script** (prevents reading `.env` files), not React hooks.

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
- Style: "new-york"
- Base color: "slate"
- CSS variables enabled
- Path aliases: `@/components`, `@/lib`, `@/hooks`
- No `tailwindConfig` field (removed after Tailwind v4 migration)

Add components: `npx shadcn@latest add [component]`

Icon library: **Font Awesome** — always use Font Awesome for all icons. Never use lucide-react or inline SVGs.

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'

<FontAwesomeIcon icon={faPaw} className="w-4 h-4" />
```

Packages installed: `@fortawesome/fontawesome-svg-core`, `@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/free-regular-svg-icons`, `@fortawesome/free-brands-svg-icons`

No test framework is configured in this project.

## TypeScript Types

User-related types in `lib/types/user.ts`:
```typescript
type UserRole = 'adopter' | 'owner' | 'rescue_center'
type Language = 'es' | 'en'
interface AuthUser { id, email, role: UserRole | null, auth_provider, preferred_lang }
interface AuthResponse { access_token, refresh_token, user: AuthUser }
```

Follow this pattern for other domain types (pets, matches, conversations, etc.).

## Implementation Workflow

> **Single plan file**: `~/.claude/plans/wise-scribbling-shore.md` is the single source of truth for all implementation plans. Never create a new plan file — always append to or edit that file only.

1. Create plan in `tasks/todo.md` with checkboxes
2. Get user approval before starting
3. Implement incrementally, checking off items
4. Keep changes minimal and focused
5. Add review section to `tasks/todo.md` when complete

## API Data Patterns

All API functions return `{ data, error }`:
```typescript
const { data, error } = await createRescueCenter(input)
if (error) {
  // Handle error
  return
}
// Use data
```

Never throw errors — always return error in response object.

## Key Implementation Decisions

1. **Next.js static export** for Electron compatibility (no SSR at runtime)
2. **Custom REST API** backend replaces Firebase; JWT tokens stored in `localStorage`
3. **Spanish-first** design - all UI defaults to Spanish
4. **Role-based access** enforced by the backend API
5. **Email/Password + Google OAuth** - Apple OAuth not included (requires Apple Developer Program)
6. **Santo Domingo focus** for MVP (transport tracking scoped to this city initially)
7. **Logo asset organization** - Static assets stored in `public/assets/` for easy reuse

## Future Phases

The project follows a phased implementation plan (see `.claude/plans/wise-scribbling-shore.md`):
- ✅ Phase 1: Project Foundation
- ✅ Phase 2: Firebase & Authentication
- ✅ Phase 3: Landing Page
- ✅ Phase 4 (partial): Rescue Center Dashboard (sidebar, mobile nav, pets/interested/forms/notifications/agenda/settings tabs built; swipe/discovery pending)
- Phase 4: Pet Discovery (swipe interface)
- Phase 5: Chat System
- Phase 6: Adoption Requirements Builder
- Phase 7: Transport Tracking
- Phase 8: Payment Integration (PayPal/Apple Wallet redirect only)

Refer to the plan for detailed data structures and implementation specs.
