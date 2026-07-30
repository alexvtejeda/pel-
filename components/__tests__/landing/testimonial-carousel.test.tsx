import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

// jsdom has neither of these; the carousel measures with one and reads the
// other through its reduced-motion guard.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
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

import { TestimonialCarousel, Testimonial } from '@/components/landing/testimonial-carousel'

const items: Testimonial[] = [1, 2, 3].map((i) => ({
  id: i,
  quote: `Quote ${i}`,
  name: `Name ${i}`,
  role: `Role ${i}`,
}))

function renderCarousel(baseWidth?: number) {
  return renderWithProviders(
    <TestimonialCarousel items={items} autoplay={false} baseWidth={baseWidth} />,
  )
}

describe('TestimonialCarousel accessibility', () => {
  it('announces itself as a carousel region', () => {
    renderCarousel()

    const region = screen.getByRole('region', { name: 'Testimonios' })
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
  })

  // The dots used to be motion.divs with an onClick — invisible to a keyboard
  // and to getByRole('button').
  it('exposes one focusable button per testimonial', () => {
    renderCarousel()

    const region = screen.getByRole('region', { name: 'Testimonios' })
    const dots = within(region).getAllByRole('button')

    expect(dots).toHaveLength(items.length)
    dots.forEach((dot, i) => {
      expect(dot.tagName).toBe('BUTTON')
      expect(dot).toHaveAccessibleName(`Ir al testimonio ${i + 1}`)
      dot.focus()
      expect(document.activeElement).toBe(dot)
    })
  })

  it('moves the carousel when a dot is activated', () => {
    renderCarousel()

    const first = screen.getByRole('button', { name: 'Ir al testimonio 1' })
    const third = screen.getByRole('button', { name: 'Ir al testimonio 3' })

    expect(first).toHaveAttribute('aria-current', 'true')
    expect(third).not.toHaveAttribute('aria-current')

    fireEvent.click(third)

    expect(third).toHaveAttribute('aria-current', 'true')
    expect(first).not.toHaveAttribute('aria-current')
  })

  // The old fixed CENTER_HEIGHT of 260 clipped long quotes at 375px, where the
  // card is ~83% of the container width instead of ~50%.
  it('gives narrow carousels taller cards', () => {
    const { container, unmount } = renderCarousel(375)
    const narrow = container.querySelector('[style*="perspective"]') as HTMLElement
    expect(narrow.style.height).toBe('352px')
    unmount()

    const wide = renderCarousel(600).container.querySelector('[style*="perspective"]') as HTMLElement
    expect(wide.style.height).toBe('292px')
  })
})
