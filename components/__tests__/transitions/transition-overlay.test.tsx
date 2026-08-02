import { render, screen } from '@testing-library/react'
import { TransitionOverlay } from '@/components/transitions/transition-overlay'
import * as ctx from '@/components/transitions/route-transition-context'
import { describe, it, expect, vi, beforeEach } from 'vitest'

function mockState(state: Partial<ctx.RouteTransitionContextValue> = {}) {
  vi.spyOn(ctx, 'useRouteTransition').mockReturnValue({
    status: 'idle',
    type: null,
    logoRect: null,
    targetHref: null,
    navigate: vi.fn(),
    setLogoRect: vi.fn(),
    ...state,
  } as ctx.RouteTransitionContextValue)
}

describe('TransitionOverlay', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

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

  /*
    The overlay fades out onto the live page, so each target needs the shape that
    target actually renders — one shared shape guarantees a jump on at least two
    of the three routes. These pin the branch; the geometry itself is verified in
    the browser.
  */
  it.each([
    ['/pets', 'transition-skeleton-pets'],
    ['/aliados', 'transition-skeleton-aliados'],
    ['/eventos', 'transition-skeleton-eventos'],
  ])('draws the %s skeleton for that target', (targetHref, testId) => {
    mockState({ status: 'exiting', type: 'skeleton', targetHref })
    render(<TransitionOverlay />)
    expect(screen.getByTestId(testId)).toBeInTheDocument()
  })

  it('falls back to the pets skeleton when the target is unknown', () => {
    mockState({ status: 'exiting', type: 'skeleton', targetHref: null })
    render(<TransitionOverlay />)
    expect(screen.getByTestId('transition-skeleton-pets')).toBeInTheDocument()
  })

  // `html:has([data-pet-feed])` turns on scroll snapping. The overlay mounts
  // while the browser is still on the *outgoing* route, so carrying that
  // attribute would snap-scroll a page that has no feed.
  it('never carries the feed attribute that drives the scroll-snap rule', () => {
    mockState({ status: 'exiting', type: 'skeleton', targetHref: '/pets' })
    const { container } = render(<TransitionOverlay />)
    expect(container.querySelector('[data-pet-feed]')).toBeNull()
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
