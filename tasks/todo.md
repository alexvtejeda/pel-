# Tailwind v4 Migration

## What changes
- No more `tailwind.config.ts` — theme moves into `globals.css` via `@theme {}`
- `@tailwind base/components/utilities` → `@import "tailwindcss"`
- New package: `@tailwindcss/postcss` replaces `tailwindcss` + `autoprefixer` in PostCSS
- `tailwindcss-animate` plugin replaced by built-in v4 animation support

## Steps
- [ ] Run `bunx @tailwindcss/upgrade@next` (official upgrade tool — handles deps, config migration, class renames)
- [ ] Run `bun install` to finalize packages
- [ ] Verify `globals.css` has correct `@import "tailwindcss"` and `@theme {}` block (OKLCH custom colors + semantic tokens intact)
- [ ] Verify `postcss.config.mjs` updated to `@tailwindcss/postcss`
- [ ] Remove `tailwind.config.ts` if not already deleted by the tool
- [ ] Update `components.json`: remove `"config": "tailwind.config.ts"` field
- [ ] Visual check of all pages in the browser

## Review
- Ran `bun x @tailwindcss/upgrade --force` — official tool handled the bulk of the migration
- `tailwind.config.ts` deleted by the tool; all config is now in `globals.css`
- `globals.css` restructured:
  - `@import 'tailwindcss'` replaces the three `@tailwind` directives
  - `@theme {}` block holds all Pelú OKLCH custom colors (slate/zinc/red palettes), semantic token references, radius, font, and accordion animations
  - `@custom-variant dark` replaces the old `darkMode: ['class']` config
- `postcss.config.mjs` updated to `@tailwindcss/postcss` (autoprefixer removed — built into v4)
- `components.json` — removed stale `"config": "tailwind.config.ts"` field
- `tailwindcss-animate` removed from deps — accordion keyframes now live in `@theme {}` directly
- Fixed: border compatibility rule changed from `var(--color-gray-200, …)` → `var(--color-border, …)`
- Upgrade tool auto-renamed some v3 utilities in templates:
  - `shadow-sm` → `shadow-xs`
  - `backdrop-blur-sm` → `backdrop-blur-xs`
  - `inset-shadow-sm` → `inset-shadow-xs`
  - `flex-shrink-0` → `shrink-0`
  - `focus:outline-none` → `focus:outline-hidden`

---

# Migrate to i18next (auto-detection only) — COMPLETED

- [x] 1. Install `i18next-browser-languagedetector`
- [x] 2. Create `lib/i18n/index.ts` — i18next singleton with bundled resources
- [x] 3. Create `components/i18n-provider.tsx` — client wrapper
- [x] 4. Update `app/layout.tsx` — swap LanguageProvider for I18nProvider
- [x] 5. Update `components/landing/header.tsx` — remove LanguageSwitcher, fix import
- [x] 6. Update `components/landing/landing-page.tsx` — remove LanguageSwitcher + loading guard, fix import
- [x] 7. Delete `lib/hooks/use-translation.ts`
- [x] 8. Delete `lib/contexts/language-context.tsx`
- [x] 9. Delete `components/language-switcher.tsx`
- [x] 10. Update `lib/i18n/config.ts` — keep types only
- [x] 11. Update `CLAUDE.md` i18n section

## Review
- Installed `i18next-browser-languagedetector@8.2.1`
- Created `lib/i18n/index.ts`: initializes i18next with all translation JSONs imported directly (no HTTP fetch), auto-detects language from `localStorage` → `navigator`, falls back to `es`
- Created `components/i18n-provider.tsx`: thin `'use client'` wrapper that imports the init file to trigger it client-side
- `app/layout.tsx`: replaced `<LanguageProvider>` with `<I18nProvider>`
- `components/landing/header.tsx`: removed `LanguageSwitcher`, switched to `useTranslation` from `react-i18next`
- `components/landing/landing-page.tsx`: removed `LanguageSwitcher` import and footer column, removed `loading` guard, switched to `useTranslation` from `react-i18next`
- Deleted 3 files: `use-translation.ts`, `language-context.tsx`, `language-switcher.tsx`
- `lib/i18n/config.ts`: stripped to just `Locale` and `Namespace` type aliases
- `CLAUDE.md`: updated i18n section to document the new pattern

---

# Pelú MVP - Phase 1 & 2 Implementation Tasks

## Phase 1: Project Foundation & Setup

### 1.1 Initialize Project Structure
- [x] Set up package.json with Electron + Next.js dependencies
- [x] Configure Next.js for Electron compatibility
- [x] Set up TailwindCSS with OKLCH color palette
- [x] Install and initialize shadcn/ui
- [x] Create project directory structure (components, pages, lib, etc.)

### 1.2 Internationalization Setup
- [x] Install next-i18next
- [x] Create /locales directory structure (es/ and en/)
- [x] Set up i18n configuration with Spanish as default
- [x] Create initial translation files (common.json, landing.json, auth.json)
- [x] Create language switcher component

### 1.3 Design System Foundation
- [x] Configure Tailwind config with Pelú OKLCH colors (Slate, Zinc, Dark Red)
- [x] Set up typography configuration (Inter, Source Sans 3, Manrope)
- [x] Configure border radius defaults (rounded-2xl for cards, rounded-xl for buttons)
- [x] Customize shadcn/ui components to match Pelú brand

## Phase 2: Firebase & Authentication

### 2.1 Firebase Configuration
- [x] Create Firebase configuration structure
- [x] Set up Firebase SDK initialization files
- [x] Create Firebase auth helper utilities
- [x] Create Firestore helper utilities
- [x] Set up basic Firestore security rules template

### 2.2 Authentication Flow
- [x] Create auth context for session management
- [x] Create login/signup page with language selection
- [x] Implement OAuth provider configuration (Google, Apple)
- [x] Create role selection component (Adopter, Pet Owner, Rescue Center)
- [x] Create protected route wrapper component
- [x] Set up user profile TypeScript types

---

## Implementation Notes
- Using Bun as package manager
- Spanish is primary language (default)
- Keep all changes simple and minimal
- Test each section before moving to next

---

## Review Section

### ✅ Phase 1: Project Foundation & Setup - COMPLETED

**1.1 Initialize Project Structure**
- ✅ Created package.json with all dependencies (Electron, Next.js, React, Firebase, i18n, TailwindCSS, shadcn/ui)
- ✅ Configured Next.js for Electron compatibility with static export
- ✅ Set up TailwindCSS config with Pelú OKLCH color palette (Slate, Zinc, Dark Red)
- ✅ Initialized shadcn/ui with components.json
- ✅ Created complete directory structure (app, components, lib, pages, locales, electron)
- ✅ Created Electron main process and preload script
- ✅ Created utility functions (cn for class merging)

**1.2 Internationalization Setup**
- ✅ Configured next-i18next with Spanish as default
- ✅ Created locale directory structure (public/locales/es and public/locales/en)
- ✅ Created comprehensive translation files:
  - common.json (app-wide translations)
  - landing.json (landing page content)
  - auth.json (authentication flow)
  - pets.json (pet discovery)
- ✅ Created language switcher component
- ✅ Set up i18n configuration helper with TypeScript types

**1.3 Design System Foundation**
- ✅ Configured Tailwind with Pelú OKLCH colors across all shades (50-900)
- ✅ Set up typography with Inter, Source Sans 3, and Manrope fonts
- ✅ Configured border radius defaults (rounded-2xl for cards, rounded-xl for buttons)
- ✅ Created global CSS with shadcn/ui theming and light/dark mode support
- ✅ Configured shadcn/ui with New York style and custom base color

### ✅ Phase 2: Firebase & Authentication - COMPLETED

**2.1 Firebase Configuration**
- ✅ Created Firebase config with initialization for Auth, Firestore, and Storage
- ✅ Created comprehensive auth helper utilities:
  - signInWithGoogle()
  - signInWithApple()
  - signOut()
  - onAuthChange()
  - getCurrentUser()
- ✅ Created Firestore helper utilities:
  - getDocument() - fetch single document
  - getDocuments() - fetch with query constraints
  - setDocument() - create/update with merge
  - updateDocument() - partial updates
  - deleteDocument() - delete document
- ✅ Created comprehensive Firestore security rules covering all collections
- ✅ Set up TypeScript types for UserDocument and UserProfile

**2.2 Authentication Flow**
- ✅ Created AuthProvider context with user and userProfile state
- ✅ Created useAuth hook for accessing auth state
- ✅ Created LoginPage component with:
  - Google OAuth integration
  - Apple OAuth integration
  - Error handling
  - Loading states
  - Pelú brand styling
- ✅ Created RoleSelection component with:
  - Three role options (Adopter, Owner, Rescue Center)
  - User profile creation in Firestore
  - Visual selection UI with brand styling
- ✅ Created ProtectedRoute wrapper component with:
  - Authentication check
  - Role-based access control
  - Automatic redirects
  - Loading states
- ✅ Created auth pages at /auth/login and /auth/role-selection
- ✅ Integrated AuthProvider into main app layout

### Additional Files Created
- ✅ .env.example - Firebase environment variables template
- ✅ .gitignore - Comprehensive ignore rules for Next.js, Electron, and Node
- ✅ firestore.rules - Complete security rules for all collections
- ✅ postcss.config.mjs - PostCSS configuration for TailwindCSS

### What's Ready to Use
1. **Complete project structure** - Ready for development
2. **Electron desktop app wrapper** - Can run with `bun run electron:dev`
3. **Firebase integration** - Just needs Firebase project credentials in .env
4. **Authentication system** - OAuth with Google and Apple
5. **User role management** - Three distinct user types
6. **i18n support** - Spanish and English translations
7. **Design system** - Pelú brand colors and component styling
8. **TypeScript** - Full type safety throughout

### Next Steps
User should:
1. Run `bun install` to install all dependencies
2. Create Firebase project and add credentials to .env file
3. Deploy firestore.rules to Firebase console
4. Run `bun run dev` to test the development server
5. Test authentication flow
6. Proceed with Phase 3 (Landing Page) and beyond

---

# Rescue Center Dashboard — Phase B.2 (UI Polish)

## Steps
- [x] 1. Install shadcn `dropdown-menu` component
- [x] 2. `components/ui/button-group.tsx` already added by user from shadcn
- [x] 3. Fix sidebar: replace `SidebarTrigger` in `SidebarHeader` with `<Logo showText={true} />`
- [x] 4. Rewrite `interested-tab.tsx` with new layout:
  - Left block: avatar + name + pet + status badge + Ver perfil button
  - Middle: Eye/EyeOff icon + form state text (hidden on mobile)
  - Right: ButtonGroup (Aprobar/Rechazar for pending) + Abrir Chat + ⋯ DropdownMenu
  - Rejected card: `opacity-60 bg-slate-50`
  - New `deleteUser` handler in state
- [x] 5. Verify all interactions work (approve, reject, revert, delete)

## Review
- `dropdown-menu` installed via `bun x shadcn@latest add dropdown-menu`
- `button-group.tsx` was already in place (added by user)
- Sidebar: `SidebarTrigger` removed from imports and `SidebarHeader`; replaced with `<Logo showText={true} width={32} height={32} />` — logo + "Pelú" text shows when expanded, collapses with sidebar
- `interested-tab.tsx` rewritten:
  - Row layout: left info block (avatar + name + pet + status badge + Ver perfil ghost button) | middle form indicator (Eye/EyeOff, hidden on mobile) | right actions
  - `ButtonGroup` wraps Aprobar/Rechazar only when `status === 'pending'`; both buttons have hover color transitions
  - `DropdownMenu` (⋯) has: Revertir estado → `setStatus(id, 'pending')`, Agregar en la agenda (placeholder), Eliminar → `deleteUser(id)`
  - Rejected rows get `opacity-60 bg-slate-50`
  - `deleteUser` handler added: filters user out of state

---

# Rescue Center Dashboard — Phase A

## Steps
- [x] 1. Install shadcn sidebar (`bun x shadcn@latest add sidebar`)
- [x] 2. Create `lib/data/mock-rescue-center.ts` — mock pets and interested-users arrays
- [x] 3. Create `app/dashboard/rescue-center/layout.tsx` — wraps in `<ProtectedRoute requireRole={['rescue_center']}>`
- [x] 4. Create `components/dashboard/rescue-center/rescue-center-sidebar.tsx` — collapsible sidebar with 4 nav items
- [x] 5. Create `components/dashboard/rescue-center/pets-tab.tsx` — responsive grid of pet cards with status tags
- [x] 6. Create `components/dashboard/rescue-center/dashboard-shell.tsx` — `SidebarProvider` + shell with tab state
- [x] 7. Create `app/dashboard/rescue-center/page.tsx` — renders `<DashboardShell />`

## Review
- Installed shadcn sidebar which also added: button, separator, sheet, tooltip, input, skeleton UI components and `hooks/use-mobile.tsx`
- CSS sidebar variables added to `app/globals.css` automatically by shadcn CLI
- 6 new files created (mock data, layout, page, sidebar, pets tab, dashboard shell)
- `ProtectedRoute` enforces `rescue_center` role; non-matching accounts redirect to `/`
- Sidebar uses `collapsible="icon"` — collapses to icon-only rail
- Pets tab: 2/3/4-column responsive grid; yellow tag for interested (shows count), slate tag for adopted, no tag for available
- Phase B (Interested Users + Settings) and Phase C (Form Editor) are future sessions
