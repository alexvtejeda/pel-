import { fireEvent, render, screen } from '@testing-library/react'
import { TransitionLink } from '@/components/transitions/transition-link'
import * as ctx from '@/components/transitions/route-transition-context'

// The locale is driven through hoisted state rather than `vi.spyOn(nav, …)`:
// a mocked module namespace is not re-definable, so spying on it throws
// "Cannot redefine property".
const { route } = vi.hoisted(() => ({ route: { lang: 'es' } }))

vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: route.lang }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => `/${route.lang}`,
  useSearchParams: () => new URLSearchParams(),
}))

const navigate = vi.fn()

beforeEach(() => {
  navigate.mockClear()
  route.lang = 'es'
  vi.spyOn(ctx, 'useRouteTransition').mockReturnValue({
    status: 'idle',
    type: null,
    logoRect: null,
    targetHref: null,
    navigate,
    setLogoRect: vi.fn(),
  })
})

describe('TransitionLink', () => {
  it('renders an anchor with the correct href', () => {
    render(<TransitionLink href="/pets">Mascotas</TransitionLink>)
    const link = screen.getByRole('link', { name: 'Mascotas' })
    expect(link).toHaveAttribute('href', '/es/pets')
  })

  // Call sites write locale-free paths; the prefix is applied here. Pinning a
  // non-default locale matters — a bug that always emitted `/es` would pass
  // every other assertion in this file.
  it('prefixes the active locale, not always the default', () => {
    route.lang = 'en'
    render(<TransitionLink href="/pets">Pets</TransitionLink>)
    expect(screen.getByRole('link', { name: 'Pets' })).toHaveAttribute('href', '/en/pets')
  })

  it('calls navigate and prevents default on click when idle', () => {
    render(<TransitionLink href="/aliados">Aliados</TransitionLink>)
    const link = screen.getByRole('link', { name: 'Aliados' })
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(clickEvent)
    expect(navigate).toHaveBeenCalledWith('/es/aliados')
    expect(clickEvent.defaultPrevented).toBe(true)
  })

  it('short-circuits when a transition is in flight', () => {
    vi.spyOn(ctx, 'useRouteTransition').mockReturnValue({
      status: 'exiting',
      type: 'skeleton',
      logoRect: null,
      targetHref: '/aliados',
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
