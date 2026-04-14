'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene02LogoDraw() {
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

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 1,
        },
      })
      tl.fromTo(
        '[data-scene="02-logo-draw"] [data-draw-logo]',
        { scale: 0.4, opacity: 0 },
        { scale: 1, opacity: 1, ease: 'power2.out' }
      )
      tl.fromTo(
        '[data-scene="02-logo-draw"] [data-draw-word]',
        { opacity: 0, letterSpacing: '1em' },
        { opacity: 1, letterSpacing: '0em', ease: 'power2.out' },
        '<0.1'
      )

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
      data-scene="02-logo-draw"
      className="relative min-h-screen flex items-center justify-center bg-background"
    >
      <div aria-hidden="true" className="flex items-center gap-6">
        <div data-draw-logo>
          <Image src="/assets/logo.svg" alt="" width={96} height={96} />
        </div>
        <span data-draw-word className="text-6xl md:text-8xl font-bold">Pelú</span>
      </div>
    </section>
  )
}
