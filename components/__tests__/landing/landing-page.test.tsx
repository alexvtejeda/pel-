import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))

// jsdom ships no ResizeObserver, and TestimonialCarousel measures its container
// with one to derive the card width.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

// Nor matchMedia, which the carousel's reduced-motion guard reads.
vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
)

import { LandingPage } from '@/components/landing/landing-page'
import { LogoMarquee } from '@/components/landing/logo-marquee'
import { RouteTransitionProvider } from '@/components/transitions/route-transition-context'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

function renderLanding() {
  return renderWithProviders(
    <RouteTransitionProvider>
      <LandingPage />
    </RouteTransitionProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue({ data: [], error: null })
})

describe('LandingPage placeholder content', () => {
  it('does not render the placeholder partner logos', () => {
    renderLanding()

    expect(screen.queryByAltText('Aliado 1')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Logos de aliados' })).toBeNull()
  })

  // The flag is the only thing standing between the marquee and the page: the
  // component must still work so flipping SHOW_PARTNER_LOGOS is all it takes.
  it('keeps LogoMarquee working for when real logos exist', () => {
    renderWithProviders(<LogoMarquee logos={[{ src: '/assets/logos/partner-1.svg', alt: 'Aliado 1' }]} />)

    expect(screen.getByAltText('Aliado 1')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Logos de aliados' })).toBeInTheDocument()
  })

  it('renders three testimonials, not the five filler ones', () => {
    renderLanding()

    expect(screen.getAllByText(/Adoptar a Luna fue la mejor decisión/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Como negocio aliado/)).toBeNull()
    expect(screen.queryByText(/La adopción debería ser siempre así de fácil/)).toBeNull()
  })

  it('has no links that go nowhere', () => {
    const { container } = renderLanding()

    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0)
  })
})
