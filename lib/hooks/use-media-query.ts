'use client'

import { useState, useEffect } from 'react'

// `false` is the honest answer wherever the platform cannot tell us: the server
// (no `window`) and jsdom (no `matchMedia`). Returning it instead of throwing
// keeps the hook total, which matters now that it is read during render.
function readMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/**
 * Reads a media query, seeded synchronously so the correct variant renders on
 * the very first client paint instead of one frame later.
 *
 * HYDRATION CONTRACT — read this before adding a consumer.
 * The prerendered HTML (`output: 'export'`) is always built with `false`,
 * because there is no `window` on the server. The lazy initialiser below means
 * the first *client* render can be `true`, so the server HTML and the hydration
 * render disagree about this value. That is safe only while every consumer
 * emits identical markup for both values at hydration time.
 *
 * Both current consumers (`pets-page.tsx`, `aliados-page.tsx`) satisfy that:
 * they pick between a Radix `Sheet` and a Vaul `Drawer`, and both live behind a
 * portal that renders nothing at all while `open` is `false` — which it always
 * is on mount. Empty vs. empty is not a mismatch.
 *
 * If you add a consumer that renders *visible* markup for one value and not the
 * other, do not read this hook during the hydration render — gate the divergent
 * part behind a mounted flag, or express the breakpoint in CSS instead.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatch(query))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
