'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useHeaderBridge } from '../header-bridge-context'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene01Pitch() {
  const sectionRef = useRef<HTMLElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const { progress } = useHeaderBridge()
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced) {
      progress.set(1) // header visible immediately in fallback
      return
    }
    if (!sectionRef.current) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')
      if (cancelled) return

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 1,
          onUpdate: (self) => progress.set(self.progress),
        },
      })

      tl.to(logoRef.current, {
        scale: 0.08,
        xPercent: -600,
        yPercent: -700,
        ease: 'power2.inOut',
      }, 0)
      tl.to('[data-scene="01-pitch"] [data-fade-out]', {
        opacity: 0,
        y: -20,
        ease: 'power1.out',
      }, 0)

      cleanup = () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [isDesktop, reduced, progress])

  return (
    <section
      ref={sectionRef}
      data-scene="01-pitch"
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="absolute inset-0 pointer-events-none opacity-40 [background:radial-gradient(ellipse_at_top,theme(colors.pop.700/30%),transparent_60%)]" />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center text-white">
        <h1 className="sr-only">Pelú — Centralizamos el ecosistema de adopción y cuidado de mascotas en RD</h1>
        <div ref={logoRef} aria-hidden="true" className="flex items-center gap-6 will-change-transform">
          <Image src="/assets/logo.svg" alt="" width={128} height={128} priority />
          <span className="text-7xl md:text-9xl font-bold tracking-tight">Pelú</span>
        </div>
        <p data-fade-out className="max-w-2xl text-xl md:text-2xl text-white/80">
          Centralizamos el ecosistema de adopción y cuidado de mascotas en República Dominicana.
        </p>
        <p data-fade-out className="max-w-xl text-base md:text-lg text-white/60">
          Hoy está fragmentado. Nosotros lo organizamos.
        </p>
        <p data-fade-out className="text-sm uppercase tracking-widest text-white/50">
          Alexander Tejeda · Maria Francisco · Nataly Corporan
        </p>
        <p data-fade-out className="absolute bottom-10 text-xs uppercase tracking-widest text-white/40">
          Desliza para conocer más ↓
        </p>
      </div>
    </section>
  )
}
