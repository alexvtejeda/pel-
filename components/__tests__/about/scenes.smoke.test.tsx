import { renderWithProviders } from '../test-utils'
import { HeaderBridgeProvider } from '@/components/about/header-bridge-context'
import { RouteTransitionProvider } from '@/components/transitions/route-transition-context'
import { Scene01Pitch } from '@/components/about/scenes/scene-01-pitch'
import { Scene02LogoDraw } from '@/components/about/scenes/scene-02-logo-draw'
import { Scene03Competition } from '@/components/about/scenes/scene-03-competition'
import { Scene04Segments } from '@/components/about/scenes/scene-04-segments'
import { Scene05Plans } from '@/components/about/scenes/scene-05-plans'
import { Scene06LeanCanvas } from '@/components/about/scenes/scene-06-lean-canvas'
import { Scene07Numbers } from '@/components/about/scenes/scene-07-numbers'
import { Scene08Cta } from '@/components/about/scenes/scene-08-cta'

// jsdom lacks matchMedia and IntersectionObserver by default
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('min-width: 768px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
  // @ts-expect-error - stub for jsdom
  window.IntersectionObserver = MockIntersectionObserver
})

const wrap = (ui: React.ReactElement) => (
  <RouteTransitionProvider>
    <HeaderBridgeProvider>{ui}</HeaderBridgeProvider>
  </RouteTransitionProvider>
)

describe('About scenes smoke', () => {
  it('scene 1 renders the pitch headline', () => {
    const { container } = renderWithProviders(wrap(<Scene01Pitch />))
    expect(container.textContent).toContain('Pelú')
    expect(container.textContent).toContain('Alexander Tejeda')
  })
  it('scene 2 renders without crashing', () => {
    const { container } = renderWithProviders(wrap(<Scene02LogoDraw />))
    expect(container.querySelector('[data-scene="02-logo-draw"]')).toBeTruthy()
  })
  it('scene 3 renders all three competitors', () => {
    const { container } = renderWithProviders(wrap(<Scene03Competition />))
    expect(container.textContent).toContain('PetBacker')
    expect(container.textContent).toContain('PetTransportRD')
    expect(container.textContent).toContain('PetPickup')
  })
  it('scene 4 renders all three personas', () => {
    const { container } = renderWithProviders(wrap(<Scene04Segments />))
    expect(container.textContent).toContain('Laura')
    expect(container.textContent).toContain('Carlos')
    expect(container.textContent).toContain('María')
  })
  it('scene 5 renders all four plans', () => {
    const { container } = renderWithProviders(wrap(<Scene05Plans />))
    expect(container.textContent).toContain('Básico')
    expect(container.textContent).toContain('Intermedio')
    expect(container.textContent).toContain('Premium')
    expect(container.textContent).toContain('Flexible')
  })
  it('scene 6 renders all lean canvas titles', () => {
    const { container } = renderWithProviders(wrap(<Scene06LeanCanvas />))
    expect(container.textContent).toContain('Propuesta de Valor')
    expect(container.textContent).toContain('Ingresos')
  })
  it('scene 7 renders metric labels', () => {
    const { container } = renderWithProviders(wrap(<Scene07Numbers />))
    expect(container.textContent).toContain('Inversión inicial')
    expect(container.textContent).toContain('Segmentos identificados')
  })
  it('scene 8 renders the CTA link', () => {
    const { getByText } = renderWithProviders(wrap(<Scene08Cta />))
    expect(getByText('Ver mascotas').closest('a')).toHaveAttribute('href', '/es/pets')
  })
})
