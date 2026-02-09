# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pelú is a pet adoption and transport coordination platform built as an Electron desktop application. The tech stack is:
- **Frontend**: Next.js 16 (App Router) + React 19 + TailwindCSS
- **Desktop**: Electron 34 (wraps Next.js with static export)
- **Backend**: Firebase (Auth + Firestore + Storage)
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
bun run electron:build     # Builds desktop apps for all platforms

# Lint
bun run lint
```

**Important**: Assume the dev server (`bun run dev`) is already running. Do not start it yourself.

## Architecture & Data Flow

### Authentication Flow
1. User signs in via Email/Password or Google OAuth (`components/auth/login-page.tsx`)
2. On successful auth, user is redirected to role selection if no profile exists (`/auth/role-selection`)
3. User selects role: `adopter`, `owner`, or `rescue_center`
4. User profile is created in Firestore `users` collection
5. `AuthProvider` (`lib/contexts/auth-context.tsx`) manages auth state globally:
   - `user`: Firebase Auth User object
   - `userProfile`: Firestore UserDocument with role and preferences
   - `loading`: Boolean for initial auth check
6. Use `useAuth()` hook to access auth state in any component

### Firebase Structure

**Collections**:
- `users/{uid}` - User profiles with role and preferences
- `pets/{petId}` - Pet listings (created by owners/rescue centers)
- `matches/{matchId}` - Swipe interest tracking (adopter ↔ owner)
- `conversations/{conversationId}` - Chat conversations
  - `messages/{messageId}` - Subcollection of messages
- `transport/{transportId}` - Transport coordination data
- `forms/{formId}` - Adoption requirement forms
- `formResponses/{responseId}` - Submitted form responses

**Helper functions** in `lib/firebase/firestore.ts`:
- `getDocument(collection, id)` - Fetch single doc
- `getDocuments(collection, constraints[])` - Query with Firestore constraints
- `setDocument(collection, id, data)` - Create/update with merge
- `updateDocument(collection, id, data)` - Partial update
- `deleteDocument(collection, id)` - Delete doc

All return `{ data, error }` pattern for consistent error handling.

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

Configured in `tailwind.config.ts` with full shade ranges (50-900).

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

Namespaces:
- `common.json` - App-wide UI elements
- `landing.json` - Landing page content
- `auth.json` - Authentication flow
- `pets.json` - Pet discovery
- `chat.json` - Chat system (future)
- `transport.json` - Transport tracking (future)

When adding new UI text:
1. Add Spanish translation first (primary language)
2. Add English translation
3. Reference i18n config in `lib/i18n/config.ts` for TypeScript types

## File Structure Patterns

### Components Organization
- `components/auth/` - Authentication-related components
- `components/ui/` - shadcn/ui components (base UI primitives)
- `components/pets/` - Pet listing and discovery (future)
- `components/chat/` - Messaging system (future)
- `components/transport/` - Transport tracking (future)
- `components/forms/` - Form builder for adoption requirements (future)

### Library Organization
- `lib/firebase/` - All Firebase integrations (auth, firestore, storage)
- `lib/contexts/` - React context providers
- `lib/types/` - TypeScript type definitions
- `lib/i18n/` - Internationalization configuration
- `lib/utils.ts` - Utility functions (use `cn()` for className merging)

## Electron Configuration

- **Main process**: `electron/main.js` - Window management, app lifecycle
- **Preload script**: `electron/preload.js` - Context bridge for secure IPC
- **Build config**: `package.json` → `build` section (electron-builder)
- **Static export**: Next.js configured with `output: 'export'` in `next.config.js`

Dev mode loads from `http://localhost:3000`, production loads from `out/index.html`.

## Firebase Security Rules

`firestore.rules` defines role-based access control:
- Users can only read/write their own profile
- Only `owner` and `rescue_center` roles can create pets
- Pet owners can update/delete their own pets only
- Adopters can create matches (swipes)
- Conversations and messages restricted to participants
- Transport and forms have specific role checks

Deploy rules to Firebase Console after changes.

## shadcn/ui Integration

Configuration: `components.json`
- Style: "new-york"
- Base color: "slate"
- CSS variables enabled
- Path aliases: `@/components`, `@/lib`, `@/hooks`

Add components: `npx shadcn@latest add [component]`

## TypeScript Types

User-related types in `lib/types/user.ts`:
```typescript
type UserRole = 'adopter' | 'owner' | 'rescue_center'
type Language = 'es' | 'en'
interface UserDocument { uid, email, role, preferredLanguage, profile, createdAt }
```

Follow this pattern for other domain types (pets, matches, conversations, etc.).

## Implementation Workflow

1. Create plan in `tasks/todo.md` with checkboxes
2. Get user approval before starting
3. Implement incrementally, checking off items
4. Keep changes minimal and focused
5. Add review section to `tasks/todo.md` when complete

## Firestore Data Patterns

All Firestore helpers return `{ data, error }`:
```typescript
const { data, error } = await getDocument('users', userId)
if (error) {
  // Handle error
  return
}
// Use data
```

Never throw errors - always return error in response object.

## Key Implementation Decisions

1. **Next.js static export** for Electron compatibility (no SSR at runtime)
2. **Firebase** for MVP speed (may migrate backend later)
3. **Spanish-first** design - all UI defaults to Spanish
4. **Role-based access** enforced at Firestore level
5. **Email/Password + Google OAuth** (Apple OAuth removed - requires Apple Developer Program)
6. **Santo Domingo focus** for MVP (transport tracking scoped to this city initially)

## Future Phases

The project follows a phased implementation plan (see `.claude/plans/wise-scribbling-shore.md`):
- ✅ Phase 1: Project Foundation
- ✅ Phase 2: Firebase & Authentication
- Phase 3: Landing Page
- Phase 4: Pet Discovery (swipe interface)
- Phase 5: Chat System
- Phase 6: Adoption Requirements Builder
- Phase 7: Transport Tracking
- Phase 8: Payment Integration (PayPal/Apple Wallet redirect only)

Refer to the plan for detailed data structures and implementation specs.
