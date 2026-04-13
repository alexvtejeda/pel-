import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

describe('useReducedMotion', () => {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  let currentMatches = false

  beforeEach(() => {
    listeners.length = 0
    currentMatches = false
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() { return currentMatches },
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      },
    }))
  })

  it('returns false when reduced motion is not requested', () => {
    currentMatches = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when reduced motion is requested', () => {
    currentMatches = true
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates when the media query changes', () => {
    currentMatches = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => {
      currentMatches = true
      listeners.forEach((cb) => cb({ matches: true }))
    })
    expect(result.current).toBe(true)
  })
})
