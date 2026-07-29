import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { useMediaQuery } from '../use-media-query'

const QUERY = '(min-width: 640px)'

type Listener = (e: MediaQueryListEvent) => void

// jsdom ships no window.matchMedia, so a real unit test has to supply one.
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>()
  const mql = {
    matches: initial,
    media: '',
    addEventListener: vi.fn((_type: string, fn: Listener) => void listeners.add(fn)),
    removeEventListener: vi.fn((_type: string, fn: Listener) => void listeners.delete(fn)),
  }
  const matchMedia = vi.fn((query: string) => {
    mql.media = query
    return mql
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })
  return {
    mql,
    matchMedia,
    change(matches: boolean) {
      mql.matches = matches
      act(() => listeners.forEach((fn) => fn({ matches } as MediaQueryListEvent)))
    },
  }
}

/** Records the value the hook returned on every render, first one included. */
function renderProbe(query = QUERY) {
  const seen: boolean[] = []
  function Probe() {
    seen.push(useMediaQuery(query))
    return null
  }
  const utils = render(<Probe />)
  return { ...utils, seen }
}

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia
  vi.restoreAllMocks()
})

describe('useMediaQuery', () => {
  // The whole point of the lazy initialiser: no `false` frame before the effect
  // runs, which is what made the Drawer flash on desktop.
  it('reflects matchMedia on the very first render', () => {
    stubMatchMedia(true)

    const { seen } = renderProbe()

    expect(seen[0]).toBe(true)
    expect(seen).not.toContain(false)
  })

  it('reports false on the first render when the query does not match', () => {
    stubMatchMedia(false)

    const { seen } = renderProbe()

    expect(seen[0]).toBe(false)
    expect(seen).not.toContain(true)
  })

  it('passes the query straight through', () => {
    const { matchMedia } = stubMatchMedia(true)

    renderProbe('(min-width: 1024px)')

    expect(matchMedia).toHaveBeenCalledWith('(min-width: 1024px)')
  })

  it('updates when the media query changes', () => {
    const media = stubMatchMedia(false)
    const { seen } = renderProbe()

    media.change(true)
    expect(seen.at(-1)).toBe(true)

    media.change(false)
    expect(seen.at(-1)).toBe(false)
  })

  it('removes its change listener on unmount', () => {
    const { mql } = stubMatchMedia(true)
    const { unmount } = renderProbe()

    const handler = mql.addEventListener.mock.calls[0][1]
    expect(mql.addEventListener).toHaveBeenCalledWith('change', handler)

    unmount()

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', handler)
  })

  it('re-subscribes when the query changes', () => {
    const { mql } = stubMatchMedia(true)

    function Probe({ query }: { query: string }) {
      useMediaQuery(query)
      return null
    }
    const { rerender } = render(<Probe query={QUERY} />)
    rerender(<Probe query="(min-width: 1024px)" />)

    expect(mql.removeEventListener).toHaveBeenCalledTimes(1)
    expect(mql.addEventListener).toHaveBeenCalledTimes(2)
    expect(mql.media).toBe('(min-width: 1024px)')
  })

  // The hook is read during render now, so it must stay total where the
  // platform cannot answer — jsdom and the static-export server render both
  // lack matchMedia, and a throw there would take the whole tree down.
  it('falls back to false without throwing when matchMedia is unavailable', () => {
    expect(window.matchMedia).toBeUndefined()

    const { seen } = renderProbe()

    expect(seen).toEqual([false])
  })
})
