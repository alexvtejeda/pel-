'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'

export function Scene08Cta() {
  return (
    <section
      data-scene="08-cta"
      className="relative min-h-screen flex items-center bg-gradient-to-b from-background to-slate-900 text-foreground"
    >
      <div className="max-w-4xl mx-auto px-6 text-center w-full">
        <h2 className="text-5xl md:text-7xl font-bold mb-6">Pelú está vivo</h2>
        <p className="text-xl md:text-2xl text-foreground/80 mb-12">
          Explora las mascotas disponibles para adopción hoy.
        </p>
        <Link
          href="/pets"
          className="inline-flex items-center gap-3 rounded-xl bg-pop-700 hover:bg-pop-650 text-white px-8 py-4 text-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pop-500"
        >
          Ver mascotas
          <FontAwesomeIcon icon={faArrowRight} />
        </Link>
        <p className="mt-16 text-xs uppercase tracking-widest text-foreground/50">
          Proyecto de tesis · PUCMM · 2026
        </p>
      </div>
    </section>
  )
}
