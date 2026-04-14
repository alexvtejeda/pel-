'use client'

import Image from 'next/image'
import { SegmentsStage } from '../segments-stage'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene04Segments() {
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const useStage = isDesktop && !reduced

  if (useStage) return <SegmentsStage />

  return (
    <section data-scene="04-segments" className="py-16 bg-background">
      <div className="mx-auto max-w-xl px-6 space-y-12">
        {EMPATHY_SEGMENTS.map((seg) => (
          <article
            key={seg.id}
            className="rounded-2xl border border-border p-6"
            style={{
              backgroundColor: `color-mix(in oklch, ${seg.colorVar} 10%, transparent)`,
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Image
                src={seg.character}
                alt={seg.personaName}
                width={80}
                height={80}
              />
              <div>
                <p
                  className="text-xs font-bold"
                  style={{ color: seg.colorVar }}
                >
                  {seg.id.toUpperCase()}
                </p>
                <h3 className="text-xl font-bold">
                  {seg.personaName}, {seg.age}
                </h3>
              </div>
            </div>
            <dl className="space-y-3">
              {QUADRANT_ORDER.map((key) => (
                <div key={key}>
                  <dt
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: seg.colorVar }}
                  >
                    {seg.quadrants[key].label}
                  </dt>
                  <dd className="text-sm text-foreground/80">
                    {seg.quadrants[key].body}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
