'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  target: number
  prefix?: string
  suffix?: string
  durationMs?: number
  format?: (n: number) => string
}

export function CounterUp({ target, prefix = '', suffix = '', durationMs = 1200, format }: Props) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const start = performance.now()
            const step = (t: number) => {
              const p = Math.min((t - start) / durationMs, 1)
              setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
              if (p < 1) requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, durationMs])

  const display = format ? format(value) : value.toLocaleString('es-DO')
  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
