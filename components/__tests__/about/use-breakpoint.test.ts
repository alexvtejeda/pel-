import { renderHook, act } from '@testing-library/react'
import { useIsDesktop } from '@/lib/about/use-breakpoint'

describe('useIsDesktop', () => {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  let currentMatches = true

  beforeEach(() => {
    listeners.length = 0
    currentMatches = true
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() { return currentMatches },
      media: '(min-width: 768px)',
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      },
    }))
  })

  it('returns true above md breakpoint', () => {
    currentMatches = true
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it('returns false below md breakpoint', () => {
    currentMatches = false
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })

  it('updates on resize', () => {
    currentMatches = true
    const { result } = renderHook(() => useIsDesktop())
    act(() => {
      currentMatches = false
      listeners.forEach((cb) => cb({ matches: false }))
    })
    expect(result.current).toBe(false)
  })
})
