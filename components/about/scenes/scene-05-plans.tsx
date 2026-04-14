'use client'

import { useEffect, useRef, useState } from 'react'
import { PLANS } from '@/lib/about/plans-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'
import { cn } from '@/lib/utils'

const RADIUS = 260

export function Scene05Plans() {
  const sectionRef = useRef<HTMLElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
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
          end: '+=150%',
          pin: true,
          scrub: 1,
        },
      })
      tl.fromTo(
        '[data-scene="05-plans"] [data-plan-card]',
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, stagger: 0.12 }
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

  const canRadial = isDesktop && !reduced

  return (
    <section
      ref={sectionRef}
      data-scene="05-plans"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">Los planes</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-16">Elige cómo usar Pelú</h2>

        {canRadial ? (
          <div className="relative w-full h-[600px] flex items-center justify-center">
            <div className="absolute flex items-center justify-center w-32 h-32 rounded-full bg-pop-700/15 text-pop-700 font-bold text-2xl">
              Pelú
            </div>
            {PLANS.map((plan, i) => {
              const angle = (i / PLANS.length) * Math.PI * 2 - Math.PI / 2
              const x = Math.cos(angle) * RADIUS
              const y = Math.sin(angle) * RADIUS
              return (
                <div
                  key={plan.id}
                  data-plan-card
                  onMouseEnter={() => setHoveredId(plan.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'absolute w-56 rounded-2xl border bg-background p-5 shadow-sm cursor-pointer',
                    'transition-[opacity,box-shadow,border-color] duration-200',
                    hoveredId === plan.id ? 'shadow-lg border-pop-700' : 'border-border'
                  )}
                  style={{
                    transform: `translate(${x}px, ${y}px) scale(${hoveredId === plan.id ? 1.08 : 1})`,
                    opacity: hoveredId && hoveredId !== plan.id ? 0.4 : 1,
                    transition: 'transform 0.2s ease, opacity 0.2s ease',
                  }}
                >
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-pop-700 font-semibold">{plan.priceIntro}</p>
                  <p className="text-xs text-foreground/60 mb-3">{plan.priceRegular}</p>
                  <p className="text-xs text-foreground/80">{plan.transports}</p>
                  <p className="text-xs text-foreground/80">{plan.support}</p>
                  <p className="text-xs text-foreground/60 italic mt-2">{plan.highlight}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border p-5 text-left">
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-pop-700 font-semibold">{plan.priceIntro}</p>
                <p className="text-xs text-foreground/60 mb-3">{plan.priceRegular}</p>
                <p className="text-xs text-foreground/80">{plan.transports}</p>
                <p className="text-xs text-foreground/80">{plan.support}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
