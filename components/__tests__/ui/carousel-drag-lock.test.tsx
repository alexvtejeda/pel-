import { describe, it, expect, vi } from 'vitest'

// The track is a `motion.div`; the prop we care about never reaches the DOM, so
// capture it at the motion boundary rather than querying rendered attributes.
const seen: Record<string, unknown>[] = []
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_t, tag: string) =>
        function Mock(props: Record<string, unknown>) {
          if ('drag' in props) seen.push(props)
          const { children, className } = props as { children?: React.ReactNode; className?: string }
          return <div className={className}>{children}</div>
        },
    }),
  }
})

import { renderWithProviders } from '../test-utils'
import Carousel from '@/components/Carousel'

const items = [
  { id: 1, title: '', description: '', icon: null as unknown as React.ReactNode, image: '/a.webp' },
  { id: 2, title: '', description: '', icon: null as unknown as React.ReactNode, image: '/b.webp' },
]

describe('Carousel drag direction lock', () => {
  it('is off by default, so the six existing call sites are unchanged', () => {
    seen.length = 0
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(seen[0].dragDirectionLock).toBe(false)
  })

  // Inside the feed's vertical scroll container an unlocked horizontal drag
  // captures diagonal gestures and fights the page scroll.
  it('is passed through to the track when the caller opts in', () => {
    seen.length = 0
    renderWithProviders(<Carousel items={items} baseWidth={300} dragDirectionLock />)

    expect(seen[0].dragDirectionLock).toBe(true)
  })
})
