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
  targetHref: string | null
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
