'use client'

import { useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

const COMPETITORS = [
  {
    name: 'PetBacker',
    description:
      'Plataforma global que conecta individuos con cuidadores independientes. Formularios largos, confianza construida a base de reseñas entre desconocidos.',
    integrated: false,
  },
  {
    name: 'PetTransportRD',
    description: 'Transporte especializado de mascotas en RD. Tarifas por ruta.',
    integrated: true,
  },
  {
    name: 'PetPickup',
    description: 'Transporte urbano e interurbano. Tarifa adicional si el dueño acompaña.',
    integrated: true,
  },
]

export function Scene03Competition() {
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
          end: '+=200%',
          pin: true,
          scrub: 1,
        },
      })
      tl.fromTo(
        '[data-scene="03-competition"] [data-card]',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, stagger: 0.15 }
      )
      tl.fromTo(
        '[data-scene="03-competition"] [data-badge]',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, stagger: 0.1 },
        0.6
      )
      tl.fromTo(
        '[data-scene="03-competition"] [data-payoff]',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0 },
        0.9
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
      data-scene="03-competition"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">La competencia</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">Qué ya existe, y qué cambia con Pelú</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {COMPETITORS.map((c) => (
            <div
              key={c.name}
              data-card
              className="rounded-2xl border border-border p-6 bg-background/50 relative"
            >
              <h3 className="text-xl font-bold mb-3">{c.name}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">{c.description}</p>
              {c.integrated && (
                <div
                  data-badge
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pop-700/15 text-pop-700 px-3 py-1.5 text-xs font-semibold"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  Integrado en Pelú
                </div>
              )}
            </div>
          ))}
        </div>
        <div
          data-payoff
          className="max-w-3xl text-lg md:text-xl leading-relaxed border-l-4 border-pop-700 pl-6"
        >
          PetBacker conecta individuos con formularios largos. <strong>Pelú empieza con negocios verificados</strong> — cero fricción, confianza respaldada por evidencia real.
        </div>
      </div>
    </section>
  )
}
