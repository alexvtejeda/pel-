'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LEAN_CANVAS } from '@/lib/about/lean-canvas-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene06LeanCanvas() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const canHover = isDesktop && !reduced

  return (
    <section
      data-scene="06-lean-canvas"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">El modelo</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">Lean Canvas</h2>

        {canHover ? (
          <motion.div layout className="grid grid-cols-5 gap-2 h-[500px]">
            {LEAN_CANVAS.map((block) => (
              <motion.div
                layout
                key={block.id}
                onMouseEnter={() => setHoveredId(block.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="rounded-2xl border border-border bg-background p-4 overflow-hidden"
                style={{
                  gridColumn: `${block.col}`,
                  gridRow: `${block.row}`,
                  flex: hoveredId === block.id ? 3 : 1,
                }}
              >
                <h4 className="text-sm font-bold mb-2">{block.title}</h4>
                <motion.p layout className="text-xs text-foreground/80 leading-snug">
                  {hoveredId === block.id ? block.fullText : block.shortText}
                </motion.p>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {LEAN_CANVAS.map((block) => (
              <div key={block.id} className="rounded-2xl border border-border p-4">
                <h4 className="text-sm font-bold mb-2">{block.title}</h4>
                <p className="text-xs text-foreground/80">{block.fullText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
