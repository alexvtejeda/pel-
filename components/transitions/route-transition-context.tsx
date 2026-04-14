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

      setState((s) => ({ status: 'idle', type: null, logoRect: s.logoRect }))
      lockRef.current = false
    },
    [pathname, router],
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
