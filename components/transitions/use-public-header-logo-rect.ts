'use client'

import { RefObject, useEffect } from 'react'
import { useRouteTransition } from './route-transition-context'

export function usePublicHeaderLogoRect(ref: RefObject<HTMLElement | null>) {
  const { setLogoRect } = useRouteTransition()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setLogoRect({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ref, setLogoRect])
}
