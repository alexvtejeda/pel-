# Pelú - Pet Adoption Platform

A pet adoption and transport coordination platform built with Electron, Next.js, React, and TailwindCSS.

## Quick Start

### Prerequisites

- Bun (package manager)
- Node.js 18+
- Pelú REST API running (see `pelu-api` repo)

### Installation

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Set `NEXT_PUBLIC_API_URL` to your API base URL (e.g. `http://localhost:8080`).

### Development

```bash
# Next.js dev server (port 3000)
bun run dev

# Electron desktop app with hot reload
bun run electron:dev

# Build for production
bun run build
bun run electron:build

# Lint
bun run lint
```

## Architecture

- **Frontend**: Next.js 16 (App Router) + React 19 + TailwindCSS
- **Desktop**: Electron 34 wrapping Next.js (static export via `output: 'export'`)
- **Backend**: Custom REST API (`NEXT_PUBLIC_API_URL`, default `http://localhost:8080`)
- **Auth**: Secure HTTP-only cookies (no client-side token storage)

### Authentication Flow

1. User signs in or registers via `/auth/login` (Email/Password or Google OAuth)
2. On success, redirected to `/auth/role-selection` to pick a role (`member`, `rescue_center`, `business`)
3. Google OAuth: `GET /api/v1/auth/google` → backend redirects back to `/auth/google/callback`
4. Auth state managed by `AuthProvider` (`lib/contexts/auth-context.tsx`) via `useAuth()` hook
5. `apiClient()` sends `credentials: 'include'` on every request; auto-refreshes on 401

### Project Structure

```
├── app/                    # Next.js App Router pages
├── components/
│   ├── auth/               # Login, register, role selection, onboarding wizards
│   ├── chat/               # Real-time chat (conversation list + message thread)
│   ├── dashboard/
│   │   ├── rescue-center/  # RC dashboard (pets, interested, forms, settings, etc.)
│   │   ├── business/       # Business dashboard (requests, chat, agenda, settings)
│   │   └── admin/          # Admin dashboard (RC approvals, form templates)
│   ├── forms/              # Adoption form builder and renderer
│   ├── landing/            # Landing page, testimonial carousel, logo marquee
│   ├── pets/               # Pet discovery: split grid + detail panel
│   ├── aliados/            # Public providers listing (/aliados)
│   ├── transport/          # Transport tracking and request flow
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── api/                # REST API modules (auth, pets, forms, chat, admin, etc.)
│   ├── contexts/           # AuthProvider, WebSocketProvider
│   ├── i18n/               # i18next configuration
│   ├── types/              # TypeScript types
│   └── utils.ts            # cn() and other utilities
├── public/
│   ├── assets/             # Static images and logo
│   └── locales/            # Translation files (es, en)
└── electron/               # Electron main process and preload
```

## Design System

- **Colors** (OKLCH): Slate (primary dark), Zinc (neutral dark), Dark Red (accent)
- **Cards**: `rounded-2xl` · **Buttons**: `rounded-xl` · **Circles**: avatars and status indicators only
- **Fonts**: Inter, Source Sans 3, Manrope
- **Components**: shadcn/ui (new-york style, slate base)

## Internationalization

Spanish is the default language. Translation files live in `public/locales/{es,en}/`:
- `common.json`, `landing.json`, `auth.json`, `pets.json`, `transport.json`

## User Roles

| Role | Description |
|---|---|
| `member` | Pet owner or adopter |
| `rescue_center` | Animal rescue organization |
| `business` | Pet-related business |

## Features Implemented

- ✅ Phase 1: Project foundation (Electron + Next.js, design system, i18n)
- ✅ Phase 2: Authentication (HTTP-only cookies, Email/Password + Google OAuth, role selection, MFA)
- ✅ Phase 3: Landing page (hero, testimonial carousel, logo marquee, responsive mobile layout)
- ✅ Phase 4: Rescue center dashboard, pet discovery, short URL sharing, adoption forms
- ✅ Phase 5: Chat system (real-time messaging via WebSocket)
- ✅ Phase 6: Transport tracking (request flow, live map, provider picker)
- ✅ Phase 6b: Service provider discovery (/aliados public listing)
- ✅ Phase 7: Business dashboard (onboarding, guard, settings)
- Phase 8: Payment integration (PayPal/Apple Wallet redirect only)

## License

Private project — All rights reserved
