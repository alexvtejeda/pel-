import { describe, it, expect, vi } from 'vitest'

// The real motion runtime puts MotionValue objects into `style`, which React
// then tries to write to the DOM. This mock keeps the component's class names
// — the only thing under test here — and drops the animation plumbing.
vi.mock('motion/react', () => {
  const React = require('react')
  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, tag: string) =>
        React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
          const {
            style, drag, dragConstraints, initial, animate, transition,
            onDragEnd, onAnimationStart, onAnimationComplete, ...rest
          } = props
          return React.createElement(tag, { ...rest, ref })
        }),
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
  }
})

import { renderWithProviders } from '../test-utils'
import Carousel, { CarouselItem } from '@/components/Carousel'

const items: CarouselItem[] = [
  { id: 1, title: '', description: '', icon: null, image: 'https://example.test/luna.jpg', alt: 'Luna' },
]

function slideOf(container: HTMLElement) {
  const img = container.querySelector('img')
  expect(img).not.toBeNull()
  return img!.parentElement!
}

describe('Carousel flushItems', () => {
  // Five other call sites depend on this default. It is the whole reason the
  // fix is a prop instead of an edit to the shared class string.
  it('rounds image slides by default', () => {
    const { container } = renderWithProviders(
      <Carousel items={items} baseWidth={300} containerPadding={0} />,
    )

    expect(slideOf(container).className).toContain('rounded-xl')
  })

  it('drops the radius when flushItems is set', () => {
    const { container } = renderWithProviders(
      <Carousel items={items} baseWidth={300} containerPadding={0} flushItems />,
    )

    expect(slideOf(container).className).not.toContain('rounded-xl')
  })
})
