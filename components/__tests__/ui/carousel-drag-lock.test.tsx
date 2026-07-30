import { describe, it, expect, beforeEach, vi } from 'vitest'

// The track is a `motion.div`; the prop we care about never reaches the DOM, so
// capture it at the motion boundary rather than querying rendered attributes.
// Every motion element is recorded — the test picks the track out by a marker
// below, so adding or reshaping motion elements cannot silently repoint it.
const rendered: Record<string, unknown>[] = []
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react')
  return {
    ...actual,
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_t, tag: string) =>
        function Mock(props: Record<string, unknown>) {
          rendered.push({ tag, ...props })
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

// `drag` is the marker: the track is the only motion element that takes it.
// Asserting there is exactly one also catches a second draggable appearing.
function track(): Record<string, unknown> {
  const draggable = rendered.filter(props => 'drag' in props)
  expect(draggable).toHaveLength(1)
  return draggable[0]
}

describe('Carousel drag direction lock', () => {
  beforeEach(() => {
    rendered.length = 0
  })

  it('is off by default, so the six existing call sites are unchanged', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(track().dragDirectionLock).toBeFalsy()
  })

  // Inside the feed's vertical scroll container an unlocked horizontal drag
  // captures diagonal gestures and fights the page scroll.
  it('is passed through to the track when the caller opts in', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} dragDirectionLock />)

    expect(track().dragDirectionLock).toBe(true)
  })
})
