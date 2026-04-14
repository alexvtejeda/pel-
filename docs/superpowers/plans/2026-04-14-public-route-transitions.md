# Public Route Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship animated route transitions between public pages — persistent header, skeleton swap between grid routes, and a circle-from-logo wipe with shared-element logo handoff for /about crossings.

**Architecture:** A single `RouteTransitionProvider` lives in the root layout and drives a `TransitionOverlay` portal. A `(public)` route group hoists `PetsHeader` into one persistent instance so it never remounts on lateral navigation. A `TransitionLink` drop-in replaces `next/link` for public-route internal navigation; it funnels clicks through `navigate()`, which runs exit → router.push → enter animations and locks further navigation until done.

**Tech Stack:** Next.js 16 App Router (static export), React 19, Framer Motion (already in deps), Tailwind v4, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-04-14-public-route-transitions-design.md`

---

## File Structure

**New:**
- `app/(public)/layout.tsx` — shared public shell; mounts persistent `PetsHeader`
- `components/transitions/route-transition-context.tsx` — provider + hook + state machine
- `components/transitions/transition-overlay.tsx` — portal renderer (skeleton + circle-wipe variants)
- `components/transitions/transition-link.tsx` — `next/link` drop-in that routes through `navigate()`
- `components/transitions/use-public-header-logo-rect.ts` — registers header logo rect with provider
- `components/transitions/transition-types.ts` — shared TS types (`TransitionStatus`, `TransitionType`, etc.)
- `components/__tests__/transitions/route-transition-context.test.tsx`
- `components/__tests__/transitions/transition-link.test.tsx`
- `components/__tests__/transitions/transition-overlay.test.tsx`

**Moved:**
- `app/page.tsx` → `app/(public)/page.tsx`
- `app/pets/page.tsx` → `app/(public)/pets/page.tsx`
- `app/aliados/page.tsx` → `app/(public)/aliados/page.tsx`
- `app/eventos/page.tsx` → `app/(public)/eventos/page.tsx`

**Modified:**
- `app/layout.tsx` — mount `RouteTransitionProvider` + `TransitionOverlay`
- `components/pets/pets-header.tsx` — register logo rect via hook
- `components/landing/landing-page.tsx`, `pets/pets-page.tsx`, `aliados/aliados-page.tsx`, `events/events-page.tsx` — remove internal `<PetsHeader />`
- `components/about/scenes/scene-01-pitch.tsx` — read sessionStorage flag, pre-play when set
- Selected internal cross-public-route `<Link>` call sites — swap for `<TransitionLink>`

---

## Task 1: Move public pages into `(public)` route group and hoist header

**Files:**
- Create: `app/(public)/layout.tsx`
- Move: `app/page.tsx` → `app/(public)/page.tsx`
- Move: `app/pets/page.tsx` → `app/(public)/pets/page.tsx`
- Move: `app/aliados/page.tsx` → `app/(public)/aliados/page.tsx`
- Move: `app/eventos/page.tsx` → `app/(public)/eventos/page.tsx`
- Modify: `components/landing/landing-page.tsx` — remove `<PetsHeader />`
- Modify: `components/pets/pets-page.tsx` — remove `<PetsHeader />`
- Modify: `components/aliados/aliados-page.tsx` — remove `<PetsHeader />`
- Modify: `components/events/events-page.tsx` — remove `<PetsHeader />`

- [ ] **Step 1: Create the `(public)` layout**

Create `app/(public)/layout.tsx`:

```tsx
import { PetsHeader } from '@/components/pets/pets-header'

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <PetsHeader />
      {children}
    </>
  )
}
```

- [ ] **Step 2: Move the four page files**

Use `git mv` to preserve history:

```bash
mkdir -p app/\(public\)/pets app/\(public\)/aliados app/\(public\)/eventos
git mv app/page.tsx app/\(public\)/page.tsx
git mv app/pets/page.tsx app/\(public\)/pets/page.tsx
git mv app/aliados/page.tsx app/\(public\)/aliados/page.tsx
git mv app/eventos/page.tsx app/\(public\)/eventos/page.tsx
rmdir app/pets app/aliados app/eventos
```

- [ ] **Step 3: Remove `<PetsHeader />` from the four page components**

In each of `components/landing/landing-page.tsx`, `components/pets/pets-page.tsx`, `components/aliados/aliados-page.tsx`, `components/events/events-page.tsx`:

- Delete the `import { PetsHeader } from ...` line
- Delete the `<PetsHeader />` JSX element from the component's render output
- Preserve all other markup and spacing

Read each file first and make the edit using Edit tool. Do not introduce any other changes.

- [ ] **Step 4: Verify the app still boots**

Run: `bun run build`
Expected: build completes without errors. The four routes exist at the same URLs. Header renders once per public route (no duplicate headers).

- [ ] **Step 5: Commit**

```bash
git add app/\(public\) components/landing components/pets components/aliados components/events
git commit -m "refactor(public): hoist PetsHeader into (public) route group

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create shared types module

**Files:**
- Create: `components/transitions/transition-types.ts`

- [ ] **Step 1: Create the types file**

```tsx
// components/transitions/transition-types.ts

export type TransitionStatus = 'idle' | 'exiting' | 'entering'

export type TransitionType = 'skeleton' | 'about-in' | 'about-out'

export interface LogoRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RouteTransitionState {
  status: TransitionStatus
  type: TransitionType | null
  logoRect: LogoRect | null
}

export const PUBLIC_GRID_ROUTES = ['/', '/pets', '/aliados', '/eventos'] as const

export type PublicGridRoute = (typeof PUBLIC_GRID_ROUTES)[number]

export function isPublicGridRoute(pathname: string): pathname is PublicGridRoute {
  return (PUBLIC_GRID_ROUTES as readonly string[]).includes(pathname)
}

export function resolveTransitionType(
  from: string,
  to: string,
): TransitionType | null {
  if (from === to) return null
  if (to === '/about' && isPublicGridRoute(from)) return 'about-in'
  if (from === '/about' && isPublicGridRoute(to)) return 'about-out'
  if (isPublicGridRoute(from) && isPublicGridRoute(to)) return 'skeleton'
  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add components/transitions/transition-types.ts
git commit -m "feat(transitions): add shared types and type resolver

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Unit-test `resolveTransitionType`

**Files:**
- Test: `components/__tests__/transitions/transition-types.test.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
// components/__tests__/transitions/transition-types.test.ts

import { resolveTransitionType, isPublicGridRoute } from '@/components/transitions/transition-types'

describe('resolveTransitionType', () => {
  it('returns null when from and to are equal', () => {
    expect(resolveTransitionType('/pets', '/pets')).toBe(null)
  })

  it('returns "about-in" when crossing from a grid route to /about', () => {
    expect(resolveTransitionType('/', '/about')).toBe('about-in')
    expect(resolveTransitionType('/pets', '/about')).toBe('about-in')
    expect(resolveTransitionType('/aliados', '/about')).toBe('about-in')
    expect(resolveTransitionType('/eventos', '/about')).toBe('about-in')
  })

  it('returns "about-out" when leaving /about to a grid route', () => {
    expect(resolveTransitionType('/about', '/')).toBe('about-out')
    expect(resolveTransitionType('/about', '/pets')).toBe('about-out')
    expect(resolveTransitionType('/about', '/aliados')).toBe('about-out')
    expect(resolveTransitionType('/about', '/eventos')).toBe('about-out')
  })

  it('returns "skeleton" between distinct grid routes', () => {
    expect(resolveTransitionType('/pets', '/aliados')).toBe('skeleton')
    expect(resolveTransitionType('/aliados', '/eventos')).toBe('skeleton')
    expect(resolveTransitionType('/', '/pets')).toBe('skeleton')
  })

  it('returns null for non-public routes', () => {
    expect(resolveTransitionType('/pets', '/dashboard/rescue-center')).toBe(null)
    expect(resolveTransitionType('/auth/login', '/pets')).toBe(null)
  })
})

describe('isPublicGridRoute', () => {
  it('recognises all four grid routes', () => {
    expect(isPublicGridRoute('/')).toBe(true)
    expect(isPublicGridRoute('/pets')).toBe(true)
    expect(isPublicGridRoute('/aliados')).toBe(true)
    expect(isPublicGridRoute('/eventos')).toBe(true)
  })

  it('rejects other paths', () => {
    expect(isPublicGridRoute('/about')).toBe(false)
    expect(isPublicGridRoute('/p/abc123')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run components/__tests__/transitions/transition-types.test.ts`
Expected: all tests PASS (the implementation is already in place from Task 2).

- [ ] **Step 3: Commit**

```bash
git add components/__tests__/transitions/transition-types.test.ts
git commit -m "test(transitions): cover resolveTransitionType matrix

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Create `RouteTransitionProvider` with state machine

**Files:**
- Create: `components/transitions/route-transition-context.tsx`
- Test: `components/__tests__/transitions/route-transition-context.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/transitions/route-transition-context.test.tsx

import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import {
  RouteTransitionProvider,
  useRouteTransition,
} from '@/components/transitions/route-transition-context'

const mockPush = vi.fn()
const mockPathname = vi.fn(() => '/pets')

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <RouteTransitionProvider>{children}</RouteTransitionProvider>
)

beforeEach(() => {
  mockPush.mockClear()
  mockPathname.mockReturnValue('/pets')
  sessionStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RouteTransitionProvider', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    expect(result.current.status).toBe('idle')
    expect(result.current.type).toBe(null)
  })

  it('short-circuits navigation to the same route', async () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    await act(async () => {
      await result.current.navigate('/pets')
    })
    expect(mockPush).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('runs skeleton transition: idle → exiting → entering → idle', async () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    let promise: Promise<void>
    act(() => {
      promise = result.current.navigate('/aliados')
    })
    expect(result.current.status).toBe('exiting')
    expect(result.current.type).toBe('skeleton')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(mockPush).toHaveBeenCalledWith('/aliados')
    expect(result.current.status).toBe('entering')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
      await promise!
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.type).toBe(null)
  })

  it('locks further navigation while a transition is in flight', async () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    act(() => {
      void result.current.navigate('/aliados')
    })
    expect(result.current.status).toBe('exiting')
    act(() => {
      void result.current.navigate('/eventos')
    })
    expect(mockPush).not.toHaveBeenCalledWith('/eventos')
  })

  it('sets sessionStorage flag on about-in transition', async () => {
    mockPathname.mockReturnValue('/pets')
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    act(() => {
      void result.current.navigate('/about')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(sessionStorage.getItem('pelu:skip-scene-1-intro')).toBe('1')
  })

  it('setLogoRect updates logoRect in state', () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    act(() => {
      result.current.setLogoRect({ x: 24, y: 32, width: 56, height: 56 })
    })
    expect(result.current.logoRect).toEqual({ x: 24, y: 32, width: 56, height: 56 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/transitions/route-transition-context.test.tsx`
Expected: FAIL — module `@/components/transitions/route-transition-context` does not exist.

- [ ] **Step 3: Write the provider**

```tsx
// components/transitions/route-transition-context.tsx
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LogoRect,
  RouteTransitionState,
  TransitionType,
  resolveTransitionType,
} from './transition-types'

const EXIT_DURATION_MS = 200
const ENTER_DURATION_MS = 200
const MIN_SKELETON_MS = 150
const ABOUT_WIPE_DURATION_MS = 600
const SKIP_SCENE1_KEY = 'pelu:skip-scene-1-intro'

export interface RouteTransitionContextValue extends RouteTransitionState {
  navigate: (href: string) => Promise<void>
  setLogoRect: (rect: LogoRect | null) => void
}

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null)

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function RouteTransitionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<RouteTransitionState>({
    status: 'idle',
    type: null,
    logoRect: null,
  })
  const lockRef = useRef(false)

  const setLogoRect = useCallback((rect: LogoRect | null) => {
    setState((s) => ({ ...s, logoRect: rect }))
  }, [])

  const navigate = useCallback(
    async (href: string) => {
      if (lockRef.current) return
      if (href === pathname) return

      const type = resolveTransitionType(pathname, href)
      if (!type) {
        router.push(href)
        return
      }

      lockRef.current = true
      setState((s) => ({ ...s, status: 'exiting', type }))

      const exitMs = type === 'skeleton' ? EXIT_DURATION_MS : ABOUT_WIPE_DURATION_MS
      await wait(exitMs)

      if (type === 'about-in') {
        try {
          sessionStorage.setItem(SKIP_SCENE1_KEY, '1')
        } catch {
          // ignore — storage unavailable
        }
      }

      router.push(href)
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0)
      }

      setState((s) => ({ ...s, status: 'entering' }))

      const enterMs =
        type === 'skeleton'
          ? MIN_SKELETON_MS + ENTER_DURATION_MS
          : ENTER_DURATION_MS
      await wait(enterMs)

      setState({ status: 'idle', type: null, logoRect: state.logoRect })
      lockRef.current = false
    },
    [pathname, router, state.logoRect],
  )

  const value = useMemo<RouteTransitionContextValue>(
    () => ({ ...state, navigate, setLogoRect }),
    [state, navigate, setLogoRect],
  )

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  )
}

export function useRouteTransition() {
  const ctx = useContext(RouteTransitionContext)
  if (!ctx) {
    throw new Error('useRouteTransition must be used inside RouteTransitionProvider')
  }
  return ctx
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/__tests__/transitions/route-transition-context.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/transitions/route-transition-context.tsx components/__tests__/transitions/route-transition-context.test.tsx
git commit -m "feat(transitions): RouteTransitionProvider with state machine

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Create `TransitionLink` drop-in

**Files:**
- Create: `components/transitions/transition-link.tsx`
- Test: `components/__tests__/transitions/transition-link.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/transitions/transition-link.test.tsx

import { fireEvent, render, screen } from '@testing-library/react'
import { TransitionLink } from '@/components/transitions/transition-link'
import * as ctx from '@/components/transitions/route-transition-context'

const navigate = vi.fn()

beforeEach(() => {
  navigate.mockClear()
  vi.spyOn(ctx, 'useRouteTransition').mockReturnValue({
    status: 'idle',
    type: null,
    logoRect: null,
    navigate,
    setLogoRect: vi.fn(),
  })
})

describe('TransitionLink', () => {
  it('renders an anchor with the correct href', () => {
    render(<TransitionLink href="/pets">Mascotas</TransitionLink>)
    const link = screen.getByRole('link', { name: 'Mascotas' })
    expect(link).toHaveAttribute('href', '/pets')
  })

  it('calls navigate and prevents default on click when idle', () => {
    render(<TransitionLink href="/aliados">Aliados</TransitionLink>)
    const link = screen.getByRole('link', { name: 'Aliados' })
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(clickEvent)
    expect(navigate).toHaveBeenCalledWith('/aliados')
    expect(clickEvent.defaultPrevented).toBe(true)
  })

  it('short-circuits when a transition is in flight', () => {
    vi.spyOn(ctx, 'useRouteTransition').mockReturnValue({
      status: 'exiting',
      type: 'skeleton',
      logoRect: null,
      navigate,
      setLogoRect: vi.fn(),
    })
    render(<TransitionLink href="/aliados">Aliados</TransitionLink>)
    fireEvent.click(screen.getByRole('link', { name: 'Aliados' }))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not intercept ctrl+click (new tab)', () => {
    render(<TransitionLink href="/pets">Mascotas</TransitionLink>)
    fireEvent.click(screen.getByRole('link', { name: 'Mascotas' }), { ctrlKey: true })
    expect(navigate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/transitions/transition-link.test.tsx`
Expected: FAIL — module `@/components/transitions/transition-link` does not exist.

- [ ] **Step 3: Write `TransitionLink`**

```tsx
// components/transitions/transition-link.tsx
'use client'

import Link, { LinkProps } from 'next/link'
import { MouseEvent, forwardRef, ReactNode } from 'react'
import { useRouteTransition } from './route-transition-context'

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>

export interface TransitionLinkProps extends LinkProps, AnchorProps {
  children: ReactNode
}

export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ href, onClick, children, ...rest }, ref) {
    const { navigate, status } = useRouteTransition()

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (event.button !== 0) return
      if (typeof href !== 'string') return

      event.preventDefault()
      if (status !== 'idle') return
      void navigate(href)
    }

    return (
      <Link href={href} ref={ref} onClick={handleClick} {...rest}>
        {children}
      </Link>
    )
  },
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/__tests__/transitions/transition-link.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/transitions/transition-link.tsx components/__tests__/transitions/transition-link.test.tsx
git commit -m "feat(transitions): TransitionLink drop-in for next/link

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Create `TransitionOverlay` (skeleton variant first)

**Files:**
- Create: `components/transitions/transition-overlay.tsx`
- Test: `components/__tests__/transitions/transition-overlay.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/transitions/transition-overlay.test.tsx

import { render, screen } from '@testing-library/react'
import { TransitionOverlay } from '@/components/transitions/transition-overlay'
import * as ctx from '@/components/transitions/route-transition-context'

function mockState(state: Partial<ctx.RouteTransitionContextValue> = {}) {
  vi.spyOn(ctx, 'useRouteTransition').mockReturnValue({
    status: 'idle',
    type: null,
    logoRect: null,
    navigate: vi.fn(),
    setLogoRect: vi.fn(),
    ...state,
  } as ctx.RouteTransitionContextValue)
}

describe('TransitionOverlay', () => {
  it('renders nothing when status is idle', () => {
    mockState({ status: 'idle' })
    const { container } = render(<TransitionOverlay />)
    expect(container.querySelector('[data-transition-overlay]')).toBeNull()
  })

  it('renders a skeleton sheet during skeleton transition', () => {
    mockState({ status: 'exiting', type: 'skeleton' })
    render(<TransitionOverlay />)
    const overlay = screen.getByTestId('transition-overlay-skeleton')
    expect(overlay).toBeInTheDocument()
  })

  it('renders the about wipe during about-in', () => {
    mockState({
      status: 'exiting',
      type: 'about-in',
      logoRect: { x: 24, y: 32, width: 56, height: 56 },
    })
    render(<TransitionOverlay />)
    expect(screen.getByTestId('transition-overlay-about')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/transitions/transition-overlay.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the overlay (skeleton variant renders; about variant stubbed)**

```tsx
// components/transitions/transition-overlay.tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useRouteTransition } from './route-transition-context'

export function TransitionOverlay() {
  const { status, type, logoRect } = useRouteTransition()
  const active = status !== 'idle' && type !== null

  return (
    <AnimatePresence>
      {active && type === 'skeleton' && (
        <motion.div
          key="skeleton"
          data-transition-overlay
          data-testid="transition-overlay-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-card pointer-events-none"
        />
      )}
      {active && (type === 'about-in' || type === 'about-out') && (
        <AboutWipe key="about" type={type} logoRect={logoRect} status={status} />
      )}
    </AnimatePresence>
  )
}

function AboutWipe({
  type,
  logoRect,
  status,
}: {
  type: 'about-in' | 'about-out'
  logoRect: { x: number; y: number; width: number; height: number } | null
  status: 'exiting' | 'entering'
}) {
  const origin = logoRect
    ? { x: logoRect.x + logoRect.width / 2, y: logoRect.y + logoRect.height / 2 }
    : { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: 80 }

  const expandFrom = `circle(0px at ${origin.x}px ${origin.y}px)`
  const expandTo = `circle(150% at ${origin.x}px ${origin.y}px)`

  const initialClip = type === 'about-in' ? expandFrom : expandTo
  const animateClip =
    status === 'exiting'
      ? type === 'about-in'
        ? expandTo
        : expandFrom
      : type === 'about-in'
        ? expandTo
        : expandFrom

  return (
    <motion.div
      data-transition-overlay
      data-testid="transition-overlay-about"
      initial={{ clipPath: initialClip, opacity: 1 }}
      animate={{ clipPath: animateClip, opacity: status === 'entering' ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{
        clipPath: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.2, ease: 'easeOut' },
      }}
      className="fixed inset-0 z-[100] bg-background pointer-events-none"
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/__tests__/transitions/transition-overlay.test.tsx`
Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/transitions/transition-overlay.tsx components/__tests__/transitions/transition-overlay.test.tsx
git commit -m "feat(transitions): TransitionOverlay with skeleton + about-wipe variants

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Mount provider + overlay in root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Wire the provider and overlay**

Read `app/layout.tsx` and edit it to wrap children with `RouteTransitionProvider` and mount `TransitionOverlay` after children inside `WebSocketProvider`:

```tsx
// app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { WebSocketProvider } from "@/lib/contexts/websocket-context"
import { I18nProvider } from "@/components/i18n-provider"
import { Toaster } from "sonner"
import { RCApprovalListener } from "@/components/auth/rc-approval-listener"
import { RouteTransitionProvider } from "@/components/transitions/route-transition-context"
import { TransitionOverlay } from "@/components/transitions/transition-overlay"

export const metadata: Metadata = {
  title: "Pelú - Adopción de Mascotas",
  description: "Plataforma de adopción y coordinación de transporte de mascotas",
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="antialiased">
        <I18nProvider>
          <AuthProvider>
            <WebSocketProvider>
              <RouteTransitionProvider>
                {children}
                <TransitionOverlay />
              </RouteTransitionProvider>
              <RCApprovalListener />
              <Toaster position="top-right" richColors />
            </WebSocketProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify build still passes**

Run: `bun run build`
Expected: build completes, no TS errors, routes still reachable.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(transitions): mount provider and overlay in root layout

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Register header logo rect

**Files:**
- Create: `components/transitions/use-public-header-logo-rect.ts`
- Modify: `components/pets/pets-header.tsx`

- [ ] **Step 1: Create the hook**

```tsx
// components/transitions/use-public-header-logo-rect.ts
'use client'

import { RefObject, useEffect } from 'react'
import { useRouteTransition } from './route-transition-context'

export function usePublicHeaderLogoRect(ref: RefObject<HTMLElement | null>) {
  const { setLogoRect } = useRouteTransition()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setLogoRect({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ref, setLogoRect])
}
```

- [ ] **Step 2: Wire the hook into `PetsHeader`**

Read `components/pets/pets-header.tsx` and make these edits:

1. Add imports near the top:

```tsx
import { useRef } from 'react'
import { usePublicHeaderLogoRect } from '@/components/transitions/use-public-header-logo-rect'
```

(the `useRef` may need to be merged into the existing `react` import line)

2. Inside the `PetsHeader` component body, near the other state, add:

```tsx
const logoRef = useRef<HTMLAnchorElement>(null)
usePublicHeaderLogoRect(logoRef)
```

3. Attach the ref to the existing logo `<Link>`:

```tsx
<Link href="/" ref={logoRef} className="flex items-center gap-2">
```

- [ ] **Step 3: Verify build + unit tests still pass**

Run: `bun run build`
Then: `npx vitest run components/__tests__/transitions`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add components/transitions/use-public-header-logo-rect.ts components/pets/pets-header.tsx
git commit -m "feat(transitions): register PetsHeader logo rect with provider

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Scene 1 settled-state signal

**Files:**
- Modify: `components/about/scenes/scene-01-pitch.tsx`

- [ ] **Step 1: Read the current scene 1 file**

Use Read to inspect `components/about/scenes/scene-01-pitch.tsx`. Identify the top-level `motion` components driving the intro (beams container, pitch text, headline).

- [ ] **Step 2: Add the skip-intro signal**

At the top of the component function body, add:

```tsx
const [skipIntro] = useState(() => {
  if (typeof window === 'undefined') return false
  const flag = sessionStorage.getItem('pelu:skip-scene-1-intro')
  if (flag === '1') {
    sessionStorage.removeItem('pelu:skip-scene-1-intro')
    return true
  }
  return false
})
```

(Import `useState` from `react` if not already imported.)

- [ ] **Step 3: Apply `skipIntro` to motion elements**

For every `motion.*` element inside scene 1 that has an `initial` prop controlling the intro animation, replace `initial={{ ... }}` with:

```tsx
initial={skipIntro ? false : { /* original initial values */ }}
```

When `initial={false}` Framer Motion starts at the `animate` values, giving the "settled" state instantly.

- [ ] **Step 4: Manual check**

Run: `bun run dev` (assume user has it running — do not start it yourself per CLAUDE.md)

User smoke test: navigate to `/about` directly → intro plays normally. Then from browser console run `sessionStorage.setItem('pelu:skip-scene-1-intro', '1'); location.reload()` → intro is settled on first paint.

- [ ] **Step 5: Commit**

```bash
git add components/about/scenes/scene-01-pitch.tsx
git commit -m "feat(about): honor skip-scene-1-intro sessionStorage flag

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Swap internal navigation links to `TransitionLink`

**Files:**
- Modify: `components/pets/pets-header.tsx`
- Modify: `components/landing/landing-page.tsx`
- Modify: `components/pets/pets-page.tsx`
- Modify: `components/aliados/aliados-page.tsx`
- Modify: `components/events/events-page.tsx`
- Modify: any other file with internal links between public routes (search below)

- [ ] **Step 1: Find all public-route internal links**

Run: `Grep` (via Grep tool) for `href="/"`, `href="/pets"`, `href="/aliados"`, `href="/eventos"`, `href="/about"` across `components/`. Build a list of files that contain them.

Skip any matches where the surrounding code is inside `dashboard/`, `auth/`, or uses the href for something other than navigation (e.g. form action).

- [ ] **Step 2: Replace `<Link>` imports and usages with `<TransitionLink>`**

In each file from Step 1, for each identified link:
- Change `import Link from 'next/link'` to also import `TransitionLink`:
  ```tsx
  import { TransitionLink } from '@/components/transitions/transition-link'
  ```
- Replace the specific `<Link>` element with `<TransitionLink>`. Keep all other props identical.
- If a file uses `<Link>` for non-public routes as well, keep the `Link` import and only swap the public-route usages.

Critical files and links:
- `components/pets/pets-header.tsx` — the four nav links (`/pets`, `/aliados`, `/eventos`, `/about`) and the brand logo `<Link href="/">`. Note: the logo link must stay as `next/link` + `logoRef` — swapping it for `TransitionLink` would break the `ref` attachment. Instead, wrap its `onClick` handler to call `navigate('/')` and `preventDefault` (see below).

For the header logo specifically, in `pets-header.tsx`:

```tsx
const { navigate, status } = useRouteTransition()

const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (event.button !== 0) return
  event.preventDefault()
  if (status !== 'idle') return
  void navigate('/')
}

// ...
<Link href="/" ref={logoRef} onClick={handleLogoClick} className="flex items-center gap-2">
```

Add the corresponding import:
```tsx
import { useRouteTransition } from '@/components/transitions/route-transition-context'
```

- [ ] **Step 3: Verify build + tests**

Run: `bun run build`
Run: `npx vitest run`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add components/
git commit -m "feat(transitions): route internal public navigation through TransitionLink

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Skeleton hold in grid pages during `entering` state

**Files:**
- Modify: `components/pets/pets-page.tsx`
- Modify: `components/aliados/aliados-page.tsx`
- Modify: `components/events/events-page.tsx`
- Modify: `components/landing/landing-page.tsx` (only if it has a grid below the fold — otherwise skip)

- [ ] **Step 1: Inspect each grid page's current loading state**

Read each of the four files. For each, identify:
- The `isLoading` / equivalent state variable that gates skeleton rendering
- Where data fetching completes

- [ ] **Step 2: Add a minimum hold time during transition entry**

In each grid page component, add near the top:

```tsx
import { useEffect, useState } from 'react'
import { useRouteTransition } from '@/components/transitions/route-transition-context'

// inside the component:
const { status, type } = useRouteTransition()
const [holdSkeleton, setHoldSkeleton] = useState(
  () => status === 'entering' && type === 'skeleton',
)

useEffect(() => {
  if (status === 'entering' && type === 'skeleton') {
    setHoldSkeleton(true)
    const t = setTimeout(() => setHoldSkeleton(false), 150)
    return () => clearTimeout(t)
  }
}, [status, type])
```

Then change the skeleton render condition from:
```tsx
{isLoading ? <Skeletons /> : <Grid data={data} />}
```
to:
```tsx
{isLoading || holdSkeleton ? <Skeletons /> : <Grid data={data} />}
```

If a page does not currently have a skeleton component, render its existing loading UI in place of `<Skeletons />`.

- [ ] **Step 3: Manual smoke test**

With `bun run dev` already running, navigate between `/pets`, `/aliados`, `/eventos`. Verify:
- Overlay sheet fades in over the current page (200ms)
- Target page appears with skeletons for at least 150ms even if the data was already cached
- Overlay fades out

- [ ] **Step 4: Commit**

```bash
git add components/pets/pets-page.tsx components/aliados/aliados-page.tsx components/events/events-page.tsx components/landing/landing-page.tsx
git commit -m "feat(transitions): honor skeleton hold during entering state

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Logo FLIP animation during about-wipe

**Files:**
- Modify: `components/transitions/transition-overlay.tsx`
- Modify: `components/about/scenes/scene-01-pitch.tsx` (or wherever the big logo lives) — add a `data-about-hero-logo` attribute so the overlay can compute its target rect

- [ ] **Step 1: Tag the /about big logo**

In scene 1 (`components/about/scenes/scene-01-pitch.tsx`), find the big logo `<Image>` element in the hero block. Add the attribute:

```tsx
<Image
  // ...existing props...
  data-about-hero-logo
/>
```

- [ ] **Step 2: Add logo clone to the overlay**

Update `components/transitions/transition-overlay.tsx`. Inside the `AboutWipe` component, add a cloned `<Image>` element that animates between `logoRect` and the /about target rect. Read the target rect via `document.querySelector('[data-about-hero-logo]')?.getBoundingClientRect()`.

Replace `AboutWipe` with:

```tsx
import Image from 'next/image'
import { useEffect, useState } from 'react'

function AboutWipe({
  type,
  logoRect,
  status,
}: {
  type: 'about-in' | 'about-out'
  logoRect: { x: number; y: number; width: number; height: number } | null
  status: 'exiting' | 'entering'
}) {
  const origin = logoRect
    ? { x: logoRect.x + logoRect.width / 2, y: logoRect.y + logoRect.height / 2 }
    : { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: 80 }

  const expandFrom = `circle(0px at ${origin.x}px ${origin.y}px)`
  const expandTo = `circle(150% at ${origin.x}px ${origin.y}px)`

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (type !== 'about-out') return
    const el = document.querySelector<HTMLElement>('[data-about-hero-logo]')
    if (el) setTargetRect(el.getBoundingClientRect())
  }, [type])

  const smallRect = logoRect ?? { x: 24, y: 32, width: 56, height: 56 }
  const bigRect = targetRect ?? {
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 120 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 120 : 0,
    width: 240,
    height: 240,
  }

  const startRect = type === 'about-in' ? smallRect : bigRect
  const endRect = type === 'about-in' ? bigRect : smallRect

  const initialClip = type === 'about-in' ? expandFrom : expandTo
  const animateClip = type === 'about-in' ? expandTo : expandFrom

  return (
    <>
      <motion.div
        data-transition-overlay
        data-testid="transition-overlay-about"
        initial={{ clipPath: initialClip, opacity: 1 }}
        animate={{ clipPath: animateClip, opacity: status === 'entering' ? 0 : 1 }}
        transition={{
          clipPath: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.2, ease: 'easeOut' },
        }}
        className="fixed inset-0 z-[100] bg-background pointer-events-none"
      />
      <motion.div
        className="fixed z-[101] pointer-events-none"
        initial={{
          top: startRect.y,
          left: startRect.x,
          width: startRect.width,
          height: startRect.height,
        }}
        animate={{
          top: endRect.y,
          left: endRect.x,
          width: endRect.width,
          height: endRect.height,
          opacity: status === 'entering' ? 0 : 1,
        }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
          opacity: { duration: 0.2, delay: 0.4 },
        }}
      >
        <Image
          src="/assets/logo.svg"
          alt="Pelú"
          fill
          priority
        />
      </motion.div>
    </>
  )
}
```

- [ ] **Step 3: Re-run overlay test**

Run: `npx vitest run components/__tests__/transitions/transition-overlay.test.tsx`
Expected: existing tests still PASS (the visual change does not break the test contract — `data-testid="transition-overlay-about"` still present).

- [ ] **Step 4: Manual smoke test**

With `bun run dev` running, click the /about nav link from /pets. Verify:
- The header logo appears to scale up and travel toward the scene-1 logo position
- A circle wipes from the logo origin, filling the viewport
- Scene 1 arrives in its settled state (no intro replay)
- Clicking any nav link back plays the reverse

- [ ] **Step 5: Commit**

```bash
git add components/transitions/transition-overlay.tsx components/about/scenes/scene-01-pitch.tsx
git commit -m "feat(transitions): shared-element logo handoff for about-wipe

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Browser back/forward via popstate

**Files:**
- Modify: `components/transitions/route-transition-context.tsx`

- [ ] **Step 1: Add popstate listener inside the provider**

In the provider body, add an effect that listens for `popstate` and runs the same transition flow without calling `router.push` (since the browser already navigated):

```tsx
import { useEffect } from 'react'

// inside RouteTransitionProvider, after useState:
useEffect(() => {
  const onPopState = async () => {
    if (lockRef.current) return
    const from = pathnameRef.current
    const to = window.location.pathname
    const type = resolveTransitionType(from, to)
    if (!type) {
      pathnameRef.current = to
      return
    }
    lockRef.current = true
    setState((s) => ({ ...s, status: 'exiting', type }))
    const exitMs = type === 'skeleton' ? EXIT_DURATION_MS : ABOUT_WIPE_DURATION_MS
    await wait(exitMs)
    if (type === 'about-in') {
      try { sessionStorage.setItem(SKIP_SCENE1_KEY, '1') } catch {}
    }
    setState((s) => ({ ...s, status: 'entering' }))
    const enterMs = type === 'skeleton' ? MIN_SKELETON_MS + ENTER_DURATION_MS : ENTER_DURATION_MS
    await wait(enterMs)
    setState({ status: 'idle', type: null, logoRect: state.logoRect })
    pathnameRef.current = to
    lockRef.current = false
  }
  window.addEventListener('popstate', onPopState)
  return () => window.removeEventListener('popstate', onPopState)
}, [state.logoRect])
```

Also add `pathnameRef` tracking above the effect:

```tsx
const pathnameRef = useRef(pathname)
useEffect(() => { pathnameRef.current = pathname }, [pathname])
```

And update `navigate` to keep `pathnameRef` in sync after `router.push`.

- [ ] **Step 2: Manual smoke test**

- Go /pets → /aliados → /about → back → back → back. Each transition plays. No stuck overlay.
- Click-spam back during animation: only the first fires.

- [ ] **Step 3: Commit**

```bash
git add components/transitions/route-transition-context.tsx
git commit -m "feat(transitions): handle browser back/forward with popstate

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Reduced-motion fallback

**Files:**
- Modify: `components/transitions/route-transition-context.tsx`
- Modify: `components/transitions/transition-overlay.tsx`

- [ ] **Step 1: Detect reduced-motion in provider**

In `route-transition-context.tsx`, add a helper that returns true if the user prefers reduced motion:

```tsx
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

In `navigate`, short-circuit long durations when reduced motion is on:

```tsx
const reduced = prefersReducedMotion()
const exitMs = reduced ? 0 : type === 'skeleton' ? EXIT_DURATION_MS : ABOUT_WIPE_DURATION_MS
// ...
const enterMs = reduced
  ? 50
  : type === 'skeleton' ? MIN_SKELETON_MS + ENTER_DURATION_MS : ENTER_DURATION_MS
```

Apply the same substitution inside the `popstate` handler from Task 13.

- [ ] **Step 2: Reduced-motion overlay styles**

Inside `transition-overlay.tsx`, in both variants, replace Framer Motion's `transition` prop with shortened values when `prefersReducedMotion` is true. Add a shared hook:

```tsx
import { useSyncExternalStore } from 'react'

function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined') return () => {}
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}
```

Inside the skeleton variant, use `duration: reduced ? 0.05 : 0.2`. Inside `AboutWipe`, use `duration: reduced ? 0.05 : 0.6` for `clipPath` and skip the logo morph entirely (render `null` for the cloned logo when `reduced`).

- [ ] **Step 3: Manual smoke test**

Enable "Reduce motion" in OS settings (macOS: Accessibility → Display → Reduce motion; Linux: `gsettings set org.gnome.desktop.interface enable-animations false`). Reload the dev server, navigate between public routes. Transitions should feel nearly instant with no circle or logo animation.

- [ ] **Step 4: Commit**

```bash
git add components/transitions/route-transition-context.tsx components/transitions/transition-overlay.tsx
git commit -m "feat(transitions): respect prefers-reduced-motion

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Full smoke test + merge

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS, including the three new transition test files.

- [ ] **Step 2: Run a production build**

Run: `bun run build`
Expected: clean build, no TS errors, no lint warnings beyond pre-existing ones.

- [ ] **Step 3: Manual smoke checklist**

With `bun run dev` running, tick each:

- [ ] `/` → `/pets` — skeleton transition, no flash
- [ ] `/pets` → `/aliados` — skeleton
- [ ] `/aliados` → `/eventos` — skeleton
- [ ] `/eventos` → `/` — skeleton
- [ ] `/` → `/about` — circle wipe + logo scale up, scene 1 settled
- [ ] `/pets` → `/about` — same
- [ ] `/aliados` → `/about` — same
- [ ] `/eventos` → `/about` — same
- [ ] `/about` → `/` — reverse wipe + logo scale down
- [ ] `/about` → `/pets` — reverse
- [ ] `/about` → `/aliados` — reverse
- [ ] `/about` → `/eventos` — reverse
- [ ] Back button mid-session (mixed nav)
- [ ] Forward button mid-session
- [ ] Click-spam a link during transition — second click ignored
- [ ] Reload during a transition — lands cleanly, no stuck overlay
- [ ] Direct URL entry `/about` — no transition, normal load
- [ ] `prefers-reduced-motion` enabled — instant-feel swaps, no circle
- [ ] Header logo still animates its "Pelú" text correctly on scroll
- [ ] Auth state does not flicker on public nav (one of the side benefits)

- [ ] **Step 4: Final commit if anything changed during smoke test**

If the smoke test surfaced any fix, commit it with:
```bash
git add <files>
git commit -m "fix(transitions): <specific fix>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

If nothing needed fixing, proceed.

- [ ] **Step 5: Done**

No push. Leave the branch for user review.

---

## Open items for future work (out of scope for this plan)

- `/p/[slug]` and `/adopt/[pet-id]` transitions — deferred per spec Q3
- Transitions from public → authenticated dashboards — deferred
- Per-card layout animations on grid (Framer Motion `layoutId`) — deferred polish
- Prefetching target route data before the exit animation completes (latency hide) — nice future optimization
