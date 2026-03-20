# Auth Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain login/register pages with immersive split-layout pages using amber (login) and pop/teal (register) accent colors.

**Architecture:** Shared `AuthLayout` component renders a dark split layout — hero with beams + paw silhouettes on the left, glassy form card on the right. Login and register pages wrap their existing form logic in this layout, each passing a different accent color. Mobile hides the hero and centers the form card.

**Tech Stack:** React 19, TailwindCSS v4, motion/react (framer-motion), existing `BackgroundBeams` component

**Spec:** `docs/superpowers/specs/2026-03-19-auth-pages-redesign.md`

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| Modify | `components/ui/beams.tsx` | Add `variant` prop for amber/pop color switching |
| Create | `components/auth/paw-silhouettes.tsx` | SVG paw prints at scattered positions with accent color |
| Create | `components/auth/auth-layout.tsx` | Shared split layout: hero left, glassy form card right |
| Modify | `components/auth/login-page.tsx` | Wrap form in `AuthLayout` with amber accent |
| Modify | `components/auth/register-page.tsx` | Wrap form in `AuthLayout` with pop accent |

---

## Chunk 1: Foundation Components

### Task 1: Add `variant` prop to BackgroundBeams

**Files:**
- Modify: `components/ui/beams.tsx`

- [ ] **Step 1: Add variant prop to BackgroundBeams**

Update `BackgroundBeamsProps` to accept an optional `variant` prop and use it to switch gradient colors:

```tsx
export interface BackgroundBeamsProps {
  className?: string
  variant?: 'pop' | 'amber'
}
```

In the `<defs>` section, switch gradient stop colors based on `variant`:

```tsx
export const BackgroundBeams = React.memo(({ className, variant = 'pop' }: BackgroundBeamsProps) => {
  const colors = variant === 'amber'
    ? { start: '#f59e0b', mid: '#d97706', end: '#b45309' }
    : { start: 'var(--color-pop-500)', mid: 'var(--color-pop-550)', end: 'var(--color-pop-450)' }

  // ... existing SVG structure unchanged ...

  // In <defs>, replace hardcoded pop colors:
  <stop offset="0%" stopColor={colors.start} stopOpacity="0" />
  <stop offset="20%" stopColor={colors.start} stopOpacity="1" />
  <stop offset="50%" stopColor={colors.mid} stopOpacity="1" />
  <stop offset="80%" stopColor={colors.end} stopOpacity="1" />
  <stop offset="100%" stopColor={colors.end} stopOpacity="0" />
```

- [ ] **Step 2: Verify existing usages still work**

Search for all `<BackgroundBeams` usages — they pass no `variant`, so they default to `'pop'` (no change in behavior).

Run: `npx vitest run` — all tests should pass (if any exist for beams).

- [ ] **Step 3: Commit**

```bash
git add components/ui/beams.tsx
git commit -m "feat: add variant prop to BackgroundBeams for amber/pop color switching"
```

---

### Task 2: Create PawSilhouettes component

**Files:**
- Create: `components/auth/paw-silhouettes.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { cn } from '@/lib/utils'

interface PawSilhouettesProps {
  className?: string
}

const PAW_PATH = 'M28,9 C28,14.5 23,18 23,18 C23,18 18,14.5 18,9 A5,5 0 1,1 28,9 Z M72,9 C72,14.5 67,18 67,18 C67,18 62,14.5 62,9 A5,5 0 1,1 72,9 Z M50,33 C50,44 38,52 38,52 C38,52 26,44 26,33 A12,12 0 1,1 50,33 Z M22,64 C22,69 18,72 18,72 C18,72 14,69 14,64 A4,4 0 1,1 22,64 Z M86,64 C86,69 82,72 82,72 C82,72 78,69 78,64 A4,4 0 1,1 86,64 Z'

const silhouettes = [
  { size: 90, bottom: '40px', left: '30px', opacity: 0.08, rotate: 0 },
  { size: 70, top: '50px', right: '40px', opacity: 0.05, rotate: 15 },
  { size: 50, top: '55%', left: '60%', opacity: 0.04, rotate: -20 },
]

export function PawSilhouettes({ className }: PawSilhouettesProps) {
  return (
    <>
      {silhouettes.map((s, i) => (
        <svg
          key={i}
          className={cn('absolute', className)}
          width={s.size}
          height={s.size}
          viewBox="0 0 100 80"
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            opacity: s.opacity,
            transform: `rotate(${s.rotate}deg)`,
          }}
        >
          <path d={PAW_PATH} fill="currentColor" />
        </svg>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/paw-silhouettes.tsx
git commit -m "feat: create PawSilhouettes component for auth pages"
```

---

### Task 3: Create AuthLayout component

**Files:**
- Create: `components/auth/auth-layout.tsx`

- [ ] **Step 1: Create the shared layout**

```tsx
'use client'

import { BackgroundBeams } from '@/components/ui/beams'
import { PawSilhouettes } from './paw-silhouettes'

interface AuthLayoutProps {
  accent: 'amber' | 'pop'
  heroTagline: string
  children: React.ReactNode
}

const gradients = {
  amber: 'bg-gradient-to-br from-[#0a0a0f] via-[#1a150d] to-[#0a0a0f]',
  pop: 'bg-gradient-to-br from-[#0a0a0f] via-[#0d1a28] to-[#0a0a0f]',
}

const pawColors = {
  amber: 'text-amber-500',
  pop: 'text-pop-550',
}

const accentText = {
  amber: 'text-amber-500',
  pop: 'text-pop-550',
}

export function AuthLayout({ accent, heroTagline, children }: AuthLayoutProps) {
  return (
    <div className="dark relative flex min-h-screen bg-[#0a0a0f]">
      {/* Hero — desktop only */}
      <div className={`hidden md:flex flex-[1.1] relative items-center justify-center overflow-hidden ${gradients[accent]}`}>
        <BackgroundBeams variant={accent} />
        <PawSilhouettes className={pawColors[accent]} />

        {/* Logo + tagline */}
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Pelú</h1>
          <p className={`text-sm mt-2 font-medium opacity-85 ${accentText[accent]}`}>
            {heroTagline}
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 md:flex-[0.9] flex items-center justify-center p-4 relative">
        {/* Subtle beams on mobile only */}
        <div className="md:hidden absolute inset-0 opacity-[0.06] overflow-hidden">
          <BackgroundBeams variant={accent} />
        </div>

        {/* Glassy card */}
        <div className="relative z-10 w-full max-w-md bg-background/30 backdrop-blur-xl inset-shadow-[-1px_1px_1px_1px_var(--color-input)] rounded-2xl border border-input p-8">
          {/* Mobile logo — hidden on desktop */}
          <div className="md:hidden text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Pelú</h1>
            <p className={`text-xs mt-1 ${accentText[accent]} opacity-80`}>
              {heroTagline}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/auth-layout.tsx
git commit -m "feat: create AuthLayout shared component for login/register pages"
```

---

## Chunk 2: Rewire Login & Register Pages

### Task 4: Rewire LoginPage to use AuthLayout

**Files:**
- Modify: `components/auth/login-page.tsx`

- [ ] **Step 1: Rewrite LoginPage**

Replace the entire render return. Keep all state, handlers, and the MFA overlay exactly as-is. Only the JSX structure changes:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/auth-context'
import { googleRedirect } from '@/lib/api/auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { MfaVerify } from '@/components/auth/mfa/mfa-verify'
import { MfaChallengeResponse } from '@/lib/types/user'
import { AuthLayout } from './auth-layout'

export function LoginPage() {
  // ... all existing state and handlers unchanged ...

  return (
    <>
      <AuthLayout accent="amber" heroTagline="Bienvenido de vuelta">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Inicia sesión</h2>
            <p className="text-xs text-muted-foreground mt-1">Ingresa tus credenciales</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-amber-500 text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="text-center text-sm">
            <Link href="/auth/register" className="text-pop-550 hover:opacity-80 transition-opacity">
              ¿No tienes cuenta? Regístrate
            </Link>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-muted-foreground">O continúa con</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-background/50 border border-input rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faGoogle} className="text-xl" />
            <span className="font-medium">Google</span>
          </button>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
      </AuthLayout>

      {mfaChallenge && (
        <MfaVerify
          challenge={mfaChallenge}
          loginEmail={email}
          onSuccess={() => router.push('/auth/role-selection')}
          onExpired={() => {
            setMfaChallenge(null)
            setError('Tu sesión expiró, inicia sesión de nuevo')
          }}
        />
      )}
    </>
  )
}
```

Key changes from current:
- Wrapped in `<AuthLayout accent="amber">`
- CTA button: `bg-amber-500 text-background`
- "Regístrate" link: `text-pop-550`
- Input fields: added `bg-background/50` for glassy look
- Divider span: `bg-transparent` (no longer `bg-card`)
- Google button: `bg-background/50` + `hover:bg-muted/50`
- Title/subtitle added above form
- MfaVerify stays outside AuthLayout (renders as overlay)

- [ ] **Step 2: Visual test**

Open `http://localhost:3000/auth/login` in the browser. Verify:
- Desktop: hero left with amber beams, form right in glassy card
- Amber CTA button, pop-colored "Regístrate" link
- Form fields functional, Google button clickable
- No layout overflow or z-index issues

- [ ] **Step 3: Commit**

```bash
git add components/auth/login-page.tsx
git commit -m "feat: redesign login page with amber split layout"
```

---

### Task 5: Rewire RegisterPage to use AuthLayout

**Files:**
- Modify: `components/auth/register-page.tsx`

- [ ] **Step 1: Rewrite RegisterPage**

Same pattern as login. Keep all state, handlers, MFA enrollment logic. Only the JSX return changes:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/auth-context'
import { googleRedirect } from '@/lib/api/auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { AuthLayout } from './auth-layout'

export function RegisterPage() {
  // ... all existing state and handlers unchanged ...

  if (showMfaEnrollment) {
    return (
      <MfaEnrollment
        onComplete={() => router.push('/auth/role-selection')}
        onSkip={() => router.push('/auth/role-selection')}
        breadcrumbItems={[
          { label: 'Inicio', href: '/' },
          { label: 'Registro', href: '/auth/register' },
          { label: 'Seguridad', current: true },
        ]}
      />
    )
  }

  return (
    <AuthLayout accent="pop" heroTagline="Encuentra a tu compañero ideal">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Crea tu cuenta</h2>
          <p className="text-xs text-muted-foreground mt-1">Únete a la comunidad</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-pop-550 text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/auth/login" className="text-amber-500 hover:opacity-80 transition-opacity">
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-transparent text-muted-foreground">O continúa con</span>
          </div>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-background/50 border border-input rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FontAwesomeIcon icon={faGoogle} className="text-xl" />
          <span className="font-medium">Google</span>
        </button>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
            {error}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
```

Key changes from current:
- Wrapped in `<AuthLayout accent="pop">`
- CTA button: `bg-pop-550 text-background`
- "Inicia sesión" link: `text-amber-500`
- Same glassy input/button styling as login
- MFA enrollment still replaces entire page (early return before AuthLayout)

- [ ] **Step 2: Visual test**

Open `http://localhost:3000/auth/register` in the browser. Verify:
- Desktop: hero left with pop/teal beams, form right in glassy card
- Pop CTA button, amber-colored "Inicia sesión" link
- Form fields functional, Google button clickable
- MFA enrollment still works (register → triggers enrollment screen)

- [ ] **Step 3: Commit**

```bash
git add components/auth/register-page.tsx
git commit -m "feat: redesign register page with pop/teal split layout"
```

---

## Chunk 3: Polish & Mobile Verification

### Task 6: Mobile and cross-browser verification

- [ ] **Step 1: Test mobile viewport**

Resize browser to 375px width or use dev tools mobile view. Verify for BOTH login and register:
- Hero side is completely hidden
- Glassy card is centered with subtle beams behind
- Logo + tagline appear inside the card header
- Form is usable, buttons are tappable
- No horizontal scroll

- [ ] **Step 2: Test navigation flow**

Verify the full auth flow works:
1. Navigate to `/auth/login` — see amber layout
2. Click "Regístrate" link — navigate to `/auth/register` — see pop layout
3. Click "Inicia sesión" link — navigate back to `/auth/login` — see amber layout
4. Login with credentials — MFA overlay appears correctly on top
5. Register — MFA enrollment screen replaces page correctly

- [ ] **Step 3: Fix any issues found**

Address any visual or functional issues discovered during testing.

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix: polish auth pages layout and mobile responsiveness"
```
