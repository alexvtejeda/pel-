'use client'

import { CounterUp } from '../counter-up'

const METRICS = [
  { target: 45112, prefix: 'RD$', label: 'Inversión inicial' },
  { target: 130, prefix: '~USD$', suffix: '/mes', label: 'Gastos operativos' },
  { target: 41, label: 'Encuestados en el estudio de mercado' },
  { target: 3, label: 'Segmentos identificados' },
]

export function Scene07Numbers() {
  return (
    <section
      data-scene="07-numbers"
      className="relative min-h-screen flex items-center bg-background py-24"
    >
      <div className="max-w-6xl mx-auto px-6 w-full">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">Los números</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-16">La base financiera</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {METRICS.map((m) => (
            <div key={m.label}>
              <div className="text-4xl md:text-5xl font-bold text-pop-700 mb-2">
                <CounterUp target={m.target} prefix={m.prefix} suffix={m.suffix} />
              </div>
              <p className="text-sm text-foreground/70">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
