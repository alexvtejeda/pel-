'use client'

import { useEffect, useState } from 'react'

const MD_QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(MD_QUERY)
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent | { matches: boolean }) => {
      setIsDesktop(e.matches)
    }
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void)
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void)
  }, [])

  return isDesktop
}
