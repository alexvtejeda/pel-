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
