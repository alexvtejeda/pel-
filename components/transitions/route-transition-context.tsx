'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LogoRect,
  RouteTransitionState,
  resolveTransitionType,
} from './transition-types'

const EXIT_DURATION_MS = 200
const ENTER_DURATION_MS = 200
const MIN_SKELETON_MS = 150
const ABOUT_WIPE_DURATION_MS = 600
const SKIP_SCENE1_KEY = 'pelu:skip-scene-1-intro'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface RouteTransitionContextValue extends RouteTransitionState {
  navigate: (href: string) => Promise<void>
  setLogoRect: (rect: LogoRect | null) => void
}

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null)

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function routeKeyFor(pathname: string): string {
  if (pathname === '/') return 'home'
  if (pathname === '/pets') return 'pets'
  if (pathname === '/aliados') return 'aliados'
  if (pathname === '/eventos') return 'eventos'
  if (pathname === '/about') return 'about'
  return ''
}

function waitForElement(selector: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve()
    if (document.querySelector(selector)) return resolve()
    const start = Date.now()
    const poll = () => {
      if (document.querySelector(selector)) return resolve()
      if (Date.now() - start > timeoutMs) return resolve()
      setTimeout(poll, 16)
    }
    setTimeout(poll, 16)
  })
}

export function RouteTransitionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const [state, setState] = useState<RouteTransitionState>({
    status: 'idle',
    type: null,
    logoRect: null,
    targetHref: null,
  })
  const lockRef = useRef(false)
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

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
      setState((s) => ({ ...s, status: 'exiting', type, targetHref: href }))

      const reduced = prefersReducedMotion()
      const exitMs = reduced
        ? 0
        : type === 'skeleton'
          ? EXIT_DURATION_MS
          : ABOUT_WIPE_DURATION_MS
      await wait(exitMs)

      if (type === 'about-in') {
        try {
          sessionStorage.setItem(SKIP_SCENE1_KEY, '1')
        } catch {
          // ignore — storage unavailable
        }
      }

      router.push(href)
      pathnameRef.current = href
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0)
      }

      setState((s) => ({ ...s, status: 'entering' }))

      const targetSelector =
        type === 'about-in'
          ? '[data-about-hero-logo]'
          : `[data-route="${routeKeyFor(href)}"]`
      await waitForElement(targetSelector, 2000)

      const settleMs = reduced
        ? 50
        : type === 'skeleton'
          ? MIN_SKELETON_MS
          : ENTER_DURATION_MS
      await wait(settleMs)

      setState((s) => ({ status: 'idle', type: null, logoRect: s.logoRect, targetHref: null }))
      lockRef.current = false
    },
    [pathname, router],
  )

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
      setState((s) => ({ ...s, status: 'exiting', type, targetHref: to }))

      const reduced = prefersReducedMotion()
      const exitMs = reduced
        ? 0
        : type === 'skeleton'
          ? EXIT_DURATION_MS
          : ABOUT_WIPE_DURATION_MS
      await wait(exitMs)

      if (type === 'about-in') {
        try {
          sessionStorage.setItem(SKIP_SCENE1_KEY, '1')
        } catch {
          // ignore
        }
      }

      setState((s) => ({ ...s, status: 'entering' }))

      const targetSelector =
        type === 'about-in'
          ? '[data-about-hero-logo]'
          : `[data-route="${routeKeyFor(to)}"]`
      await waitForElement(targetSelector, 2000)

      const settleMs = reduced
        ? 50
        : type === 'skeleton'
          ? MIN_SKELETON_MS
          : ENTER_DURATION_MS
      await wait(settleMs)

      setState((s) => ({ status: 'idle', type: null, logoRect: s.logoRect, targetHref: null }))
      pathnameRef.current = to
      lockRef.current = false
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
