# Pelú - Pet Adoption Platform

A pet adoption and transport coordination platform built with Electron, Next.js, React, Firebase, and TailwindCSS.

## 🚀 Quick Start

### Prerequisites

- Bun (package manager)
- Node.js 18+
- Firebase project

### Installation

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your Firebase credentials from the [Firebase Console](https://console.firebase.google.com/).

3. **Set up Firebase**
   - Create a new Firebase project
   - Enable Authentication with Google and Apple providers
   - Create a Firestore database
   - Deploy the security rules from `firestore.rules` to your Firebase project

### Development

**Run Next.js development server:**
```bash
bun run dev
```

**Run Electron desktop app:**
```bash
bun run electron:dev
```

**Build for production:**
```bash
bun run build
bun run electron:build
```

## 🏗️ Project Structure

```
pelurd.com/
├── app/                 # Next.js app directory
│   ├── auth/           # Authentication pages
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout with AuthProvider
│   └── page.tsx        # Homepage
├── components/          # React components
│   ├── auth/           # Auth components (login, role selection, protected routes)
│   ├── ui/             # shadcn/ui components (to be added)
│   └── language-switcher.tsx
├── lib/                 # Utilities and configurations
│   ├── contexts/       # React contexts (auth-context)
│   ├── firebase/       # Firebase configuration and helpers
│   ├── i18n/           # Internationalization config
│   ├── types/          # TypeScript type definitions
│   └── utils.ts        # Utility functions
├── public/
│   └── locales/        # Translation files (es, en)
├── electron/           # Electron main process files
├── firestore.rules     # Firestore security rules
└── tasks/              # Implementation task tracking
```

## 🎨 Design System

Pelú uses a custom color palette with OKLCH color space:

- **Slate**: `oklch(12.9% 0.042 264.695)` - Primary dark color
- **Zinc**: `oklch(14.1% 0.005 285.823)` - Neutral dark color
- **Dark Red**: `oklch(25.8% 0.092 26.042)` - Accent color (use sparingly)

**Typography**: Inter, Source Sans 3, Manrope

**Geometry Rules**:
- Cards: `rounded-2xl`
- Buttons: `rounded-xl`
- Circles: Only for avatars and status indicators

## 🌍 Internationalization

The app supports Spanish (default) and English.

Translation files are located in `public/locales/{locale}/`:
- `common.json` - Common UI elements
- `landing.json` - Landing page content
- `auth.json` - Authentication flow
- `pets.json` - Pet discovery interface

## 🔐 Authentication

Uses Firebase Authentication with:
- Google OAuth
- Apple OAuth

User roles:
- **Adopter** - Looking to adopt a pet
- **Owner** - Giving a pet up for adoption
- **Rescue Center** - Animal rescue organization

## 📱 Features Implemented

### Phase 1: Project Foundation ✅
- Electron + Next.js setup
- TailwindCSS with OKLCH colors
- shadcn/ui component library
- Internationalization (Spanish/English)
- Design system foundation

### Phase 2: Firebase & Authentication ✅
- Firebase configuration
- OAuth authentication (Google, Apple)
- User role selection
- Protected routes
- Auth context and hooks

### Coming Next
- Phase 3: Landing Page
- Phase 4: Pet Discovery Interface
- Phase 5: Chat System
- Phase 6: Adoption Requirements Builder
- Phase 7: Transport Tracking
- Phase 8: Payment Integration

## 🔧 Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration for Electron
- `tailwind.config.ts` - TailwindCSS with Pelú theme
- `components.json` - shadcn/ui configuration
- `next-i18next.config.js` - i18n configuration
- `firestore.rules` - Firestore security rules

## 📝 License

Private project - All rights reserved
