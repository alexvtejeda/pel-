'use client'

import { useEffect, useRef } from 'react'
import { EmpathyMap } from '../empathy-map'
import { EMPATHY_SEGMENTS } from '@/lib/about/empathy-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene04Segments() {
  const sectionRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced || !sectionRef.current) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')
      if (cancelled) return

      const maps = sectionRef.current!.querySelectorAll('[data-empathy-map]')
      gsap.set(maps, { autoAlpha: 0 })
      gsap.set(maps[0], { autoAlpha: 1 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=300%',
          pin: true,
          scrub: 1,
        },
      })

      const animateMap = (mapEl: Element, offset: number) => {
        const frame = mapEl.querySelector('[data-empathy-frame]')
        const lines = mapEl.querySelectorAll('[data-empathy-line]')
        const labels = mapEl.querySelectorAll('[data-empathy-label]')
        const character = mapEl.querySelector('[data-empathy-character]')

        tl.fromTo(character, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15 }, offset)
        tl.fromTo(frame, { strokeDashoffset: 113 }, { strokeDashoffset: 0, duration: 0.1 }, offset + 0.15)
        lines.forEach((line, i) => {
          const start = offset + 0.25 + i * 0.08
          tl.fromTo(line, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.08 }, start)
          tl.fromTo(labels[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.08 }, start + 0.02)
        })
      }

      animateMap(maps[0], 0)
      tl.to(maps[0], { autoAlpha: 0, duration: 0.1 }, 0.95)
      tl.set(maps[1], { autoAlpha: 1 }, 1.0)
      animateMap(maps[1], 1.0)
      tl.to(maps[1], { autoAlpha: 0, duration: 0.1 }, 1.95)
      tl.set(maps[2], { autoAlpha: 1 }, 2.0)
      animateMap(maps[2], 2.0)

      cleanup = () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [isDesktop, reduced])

  return (
    <section
      ref={sectionRef}
      data-scene="04-segments"
      className={`relative min-h-screen bg-background py-24 ${
        isDesktop && !reduced ? 'overflow-hidden' : ''
      }`}
    >
      <div className="px-6 max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">A quién servimos</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-16">Tres segmentos, tres historias</h2>
        <div className={isDesktop && !reduced ? 'relative h-[70vh]' : 'space-y-32'}>
          {EMPATHY_SEGMENTS.map((segment) => (
            <div
              key={segment.id}
              className={
                isDesktop && !reduced
                  ? 'absolute inset-0 flex items-center justify-center'
                  : 'flex items-center justify-center'
              }
            >
              <EmpathyMap segment={segment} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
