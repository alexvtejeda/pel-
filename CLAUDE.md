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

**Testing**: Vitest + React Testing Library. Run `npx vitest run` for all tests, or `npx vitest run path/to/file.test.ts` for a specific file.

## Architecture & Data Flow

### Authentication Flow
1. User signs in via Email/Password or Google OAuth (`components/auth/login-page.tsx`)
2. On success, user is redirected to `/auth/role-selection` if no role is set yet
3. User selects role: `member`, `rescue_center`, or `business`; role is persisted via `PATCH /api/v1/auth/role`
4. `AuthProvider` (`lib/contexts/auth-context.tsx`) manages auth state globally:
   - `user`: `AuthUser` object (`id`, `email`, `role`, `display_name`, `auth_provider`, `preferred_lang`)
   - `loading`: Boolean for initial auth check
   - `login(email, password)` / `register(email, password)` / `logout()` / `setRole(role)` / `updateSession(user)`
5. Auth uses **secure HTTP-only cookies** set by the backend — no tokens in `localStorage`. Old `pelu_access_token`/`pelu_refresh_token`/`pelu_user` keys are cleaned up on init.
6. `apiClient()` (`lib/api/client.ts`) sends `credentials: 'include'` on every request; auto-retries via `POST /api/v1/auth/refresh` on 401; fires `pelu:session-cleared` event on hard auth failure
7. Google OAuth: `googleRedirect()` redirects to `GET /api/v1/auth/google`; backend redirects back to `/auth/google/callback`
8. Use `useAuth()` hook to access auth state in any component

### REST API Client

All API calls go through `lib/api/`. Three distinct fetch patterns exist:

1. **Authenticated endpoints** — use `apiClient(path, options)` from `lib/api/client.ts` (cookie auth + auto-refresh)
2. **Multipart uploads** — use raw `fetch` with `credentials: 'include'` because `multipart/form-data` must not have `Content-Type` set manually. Used in: `pets.ts` (`uploadPhotos`), `submissions.ts` (`uploadSubmissionFile`), `businesses.ts` (`uploadBusinessPhoto`)
3. **Public endpoints** — use raw `fetch` with no auth headers. Used in: `pets-public.ts` (public pet listing/detail, pet form, slug lookup)

API functions return `{ data, error }` for consistent error handling. Never throw errors. See Gotchas for the one exception.

### WebSocket

`lib/contexts/websocket-context.tsx` provides real-time messaging via `useWebSocket()`. Connects for all authenticated roles (member, rescue_center, business). Key patterns:
- Use `subscribe(eventType, callback)` to listen for events
- Supports read receipts and typing indicators
- Transport events: `location_update`, `trip_status_update`, `stop_completed` (client→server); `driver_location`, `trip_status_changed`, `stop_completed`, `trip_requested` (server→client)
- Hub uses `RegisterHandler` pattern — domains register their own WebSocket message types without modifying the chat hub

### Protected Routes

Use `ProtectedRoute` wrapper (`components/auth/protected-route.tsx`):
```tsx
<ProtectedRoute requireRole={['member', 'rescue_center']}>
  <YourComponent />
</ProtectedRoute>
```

Automatically redirects unauthenticated users to `/auth/login` and checks role requirements. Each dashboard route uses a `layout.tsx` that wraps children in `<ProtectedRoute>` with `requireRole`.

## Gotchas

- **`lib/api/pets.ts` throws errors** — unlike every other API module which returns `{ data, error }`. This is a known exception.
- **WebSocket `new_message` event structure** — incoming `new_message` events nest the message payload inside `data.message`, not at the top level of `data`.
- **Multipart uploads must NOT set `Content-Type`** — the browser sets the boundary automatically. Setting it manually breaks the request.
- **`hooks/` at the project root** is a Claude Code protection script (prevents reading `.env` files), **not** a React hooks directory.
- **No `tailwind.config.ts`** — this project uses Tailwind v4. All theme configuration lives in `app/globals.css` via the `@theme {}` block.
- **Forms API uses PATCH** — not PUT. Verify both route and CORS when working with form endpoints.

## Design System

### Pelú Brand Colors (OKLCH)
- **Slate**: `oklch(12.9% 0.042 264.695)` - Primary dark
- **Zinc**: `oklch(14.1% 0.005 285.823)` - Neutral dark
- **Dark Red**: `oklch(25.8% 0.092 26.042)` - Accent (use sparingly!)
- **Pop** (`--color-pop-*`): Gradient accent color used for step indicators, beams, and CTAs (shades: 450, 500, 550)

Configured in `app/globals.css` via `@theme {}` block with full shade ranges (50-900).

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

<FontAwesomeIcon icon={faPaw} className="text-base" />
```

Use `text-*` classes (`text-sm`, `text-base`, `text-lg`, etc.) for sizing — not `w-*`/`h-*`.

## Internationalization (i18n)

**Default language**: Spanish (`es`)

Translation files: `public/locales/{locale}/{namespace}.json`

Namespaces: `common`, `landing`, `auth`, `pets`, `transport` (implemented) — `chat` is planned but doesn't exist yet.

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
2. **Custom REST API** backend replaces Firebase; auth via secure HTTP-only cookies (no client-side token storage)
3. **Spanish-first** design — all UI defaults to Spanish
4. **Role-based access** enforced by the backend API
5. **Email/Password + Google OAuth** — Apple OAuth not included (requires Apple Developer Program)
6. **Santo Domingo focus** for MVP (transport tracking scoped to this city initially)
7. **`/pets` is the homepage** — landing page moved to `/about`
8. **Logo asset organization** — Static assets stored in `public/assets/` for easy reuse
