import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SegmentsStage } from '@/components/about/segments-stage'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props
    return <img {...rest} />
  },
}))

beforeEach(() => {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
  // @ts-expect-error jsdom stub
  window.IntersectionObserver = MockIntersectionObserver
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('min-width: 768px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('SegmentsStage — structure', () => {
  it('renders three segment groups with data-segment attributes', () => {
    const { container } = render(<SegmentsStage />)
    const groups = container.querySelectorAll('[data-segment]')
    expect(groups).toHaveLength(3)
    expect(groups[0]).toHaveAttribute('data-segment', 'a')
    expect(groups[1]).toHaveAttribute('data-segment', 'b')
    expect(groups[2]).toHaveAttribute('data-segment', 'c')
  })

  it('renders the segment marker (A / B / C) for each segment', () => {
    render(<SegmentsStage />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders personaName, age for every segment', () => {
    render(<SegmentsStage />)
    for (const seg of EMPATHY_SEGMENTS) {
      expect(screen.getByText(`${seg.personaName}, ${seg.age}`)).toBeInTheDocument()
    }
  })

  it('renders a character image with personaName as alt for every segment', () => {
    render(<SegmentsStage />)
    for (const seg of EMPATHY_SEGMENTS) {
      const imgs = screen.getAllByAltText(seg.personaName)
      expect(imgs.length).toBeGreaterThan(0)
    }
  })

  it('renders all six quadrants inside each segment in QUADRANT_ORDER', () => {
    const { container } = render(<SegmentsStage />)
    for (const seg of EMPATHY_SEGMENTS) {
      const group = container.querySelector(`[data-segment="${seg.id}"]`)
      expect(group).not.toBeNull()
      const stack = group!.querySelector('[data-quadrant-stack]')
      expect(stack).not.toBeNull()
      const quadrants = stack!.querySelectorAll('[data-quadrant]')
      expect(quadrants).toHaveLength(6)
      QUADRANT_ORDER.forEach((key, i) => {
        expect(quadrants[i]).toHaveAttribute('data-quadrant', key)
        expect(quadrants[i].textContent).toContain(seg.quadrants[key].label)
        expect(quadrants[i].textContent).toContain(seg.quadrants[key].body)
      })
    }
  })

  it('renders three background layers with correct colorVar', () => {
    const { container } = render(<SegmentsStage />)
    const bgLayers = container.querySelectorAll('[data-bg]')
    expect(bgLayers).toHaveLength(3)
    EMPATHY_SEGMENTS.forEach((seg, i) => {
      expect(bgLayers[i]).toHaveAttribute('data-bg', seg.id)
      expect((bgLayers[i] as HTMLElement).style.backgroundColor).toBeTruthy()
    })
  })

  it('renders the scene overline and title in the header', () => {
    render(<SegmentsStage />)
    expect(screen.getByText(/A quién servimos/i)).toBeInTheDocument()
    expect(screen.getByText(/Tres segmentos, tres historias/i)).toBeInTheDocument()
  })
})
