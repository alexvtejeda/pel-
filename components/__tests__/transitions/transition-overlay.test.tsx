import { render, screen } from '@testing-library/react'
import { TransitionOverlay } from '@/components/transitions/transition-overlay'
import * as ctx from '@/components/transitions/route-transition-context'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
