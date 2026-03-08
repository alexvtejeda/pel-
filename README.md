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
- **Auth**: JWT (access + refresh tokens stored in `localStorage`)

### Authentication Flow

1. User signs in or registers via `/auth/login`
2. On success, redirected to `/auth/role-selection` to pick a role (`adopter`, `owner`, `rescue_center`)
3. Google OAuth: backend redirects to `/auth/google/callback` with session encoded in URL hash
4. JWT tokens are managed by `lib/api/client.ts` — auto-refreshes on 401

### Project Structure

```
├── app/                    # Next.js App Router pages
│   └── auth/google/callback/  # Google OAuth redirect handler
├── components/
│   ├── auth/               # Login, role selection, protected route
│   ├── dashboard/rescue-center/  # Rescue center dashboard tabs
│   ├── landing/            # Landing page and header
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── api/                # REST API client (client.ts, auth.ts, rescue-centers.ts)
│   ├── contexts/           # AuthProvider / useAuth hook
│   ├── i18n/               # i18next configuration
│   ├── types/              # TypeScript types (user.ts, etc.)
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
- `common.json`, `landing.json`, `auth.json`, `pets.json`

## User Roles

| Role | Description |
|---|---|
| `adopter` | Looking to adopt a pet |
| `owner` | Giving a pet up for adoption |
| `rescue_center` | Animal rescue organization |

## Features Implemented

- ✅ Phase 1: Project foundation (Electron + Next.js, design system, i18n)
- ✅ Phase 2: Authentication (JWT, Email/Password + Google OAuth, role selection)
- ✅ Phase 3: Landing page
- ✅ Phase 4 (partial): Rescue center dashboard (pets, interested, forms, notifications, agenda, settings tabs)
- Phase 4: Pet discovery / swipe interface
- Phase 5: Chat system
- Phase 6: Adoption requirements builder
- Phase 7: Transport tracking
- Phase 8: Payment integration

## License

Private project — All rights reserved
