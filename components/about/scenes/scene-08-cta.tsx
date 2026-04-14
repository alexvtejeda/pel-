'use client'

import { TransitionLink } from '@/components/transitions/transition-link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { BackgroundBeams } from '@/components/ui/beams'

export function Scene08Cta() {
  return (
    <section
      data-scene="08-cta"
      className="relative min-h-screen flex items-center overflow-hidden bg-slate-900 text-primary-foreground"
    >
      <BackgroundBeams />
      <div className="relative z-10 max-w-4xl mx-auto px-6 w-full">
        <div className="mx-auto max-w-3xl rounded-2xl bg-slate-900 px-8 py-14 md:px-16 md:py-20 text-center">
          <h2 className="text-5xl md:text-7xl font-bold mb-6">Pelú</h2>
          <p className="text-xl md:text-2xl text-primary-foreground/80 mb-12">
            Explora las mascotas disponibles para adopción hoy.
          </p>
          <TransitionLink
            href="/pets"
            className="inline-flex items-center gap-3 rounded-xl bg-pop-700 hover:bg-pop-650 text-primary-foreground px-8 py-4 text-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pop-500"
          >
            Ver mascotas
            <FontAwesomeIcon icon={faArrowRight} />
          </TransitionLink>
          <p className="mt-16 text-xs uppercase tracking-widest text-primary-foreground/60">
            Proyecto de tesis · PUCMM · 2026
          </p>
        </div>
      </div>
    </section>
  )
}
