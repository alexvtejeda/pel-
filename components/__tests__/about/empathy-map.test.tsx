import { renderWithProviders } from '../test-utils'
import { EmpathyMap } from '@/components/about/empathy-map'
import { EMPATHY_SEGMENTS } from '@/lib/about/empathy-content'

describe('EmpathyMap', () => {
  it('renders all six quadrant labels for segment A', () => {
    const segment = EMPATHY_SEGMENTS[0]
    const { container } = renderWithProviders(<EmpathyMap segment={segment} />)
    expect(container.textContent).toContain(segment.quadrants.piensa.label)
    expect(container.textContent).toContain(segment.quadrants.ve.label)
    expect(container.textContent).toContain(segment.quadrants.oye.label)
    expect(container.textContent).toContain(segment.quadrants.dice.label)
    expect(container.textContent).toContain(segment.quadrants.duele.label)
    expect(container.textContent).toContain(segment.quadrants.aspira.label)
  })

  it('renders the character image with persona name in alt text', () => {
    const segment = EMPATHY_SEGMENTS[0]
    const { getAllByAltText } = renderWithProviders(<EmpathyMap segment={segment} />)
    expect(getAllByAltText(segment.personaName).length).toBeGreaterThan(0)
  })

  it('renders persona archetype and age', () => {
    const segment = EMPATHY_SEGMENTS[0]
    const { container } = renderWithProviders(<EmpathyMap segment={segment} />)
    expect(container.textContent).toContain(segment.archetype)
    expect(container.textContent).toContain(String(segment.age))
  })
})

describe('EmpathyMap data-attribute contract', () => {
  const QUADRANT_KEYS = ['piensa', 've', 'oye', 'dice', 'duele', 'aspira'] as const

  it.each(EMPATHY_SEGMENTS)('segment $id exposes all animation selectors', (segment) => {
    const { container } = renderWithProviders(<EmpathyMap segment={segment} />)
    expect(container.querySelector('[data-empathy-map]')).toBeInTheDocument()
    expect(container.querySelector('[data-empathy-character]')).toBeInTheDocument()
    expect(container.querySelector('[data-empathy-frame]')).toBeInTheDocument()
    QUADRANT_KEYS.forEach((key) => {
      expect(container.querySelector(`[data-empathy-line="${key}"]`)).toBeInTheDocument()
      expect(container.querySelector(`[data-empathy-label="${key}"]`)).toBeInTheDocument()
    })
  })
})
