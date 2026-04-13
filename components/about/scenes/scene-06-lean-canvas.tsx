'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LEAN_CANVAS } from '@/lib/about/lean-canvas-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'
import { cn } from '@/lib/utils'

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
          <div className="grid grid-cols-5 gap-2 auto-rows-fr h-[500px]">
            {LEAN_CANVAS.map((block) => {
              const isHovered = hoveredId === block.id
              return (
                <motion.div
                  key={block.id}
                  onMouseEnter={() => setHoveredId(block.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  animate={{
                    scale: isHovered ? 1.05 : 1,
                    boxShadow: isHovered
                      ? '0 10px 30px -10px rgba(0,0,0,0.2)'
                      : '0 0 0 0 rgba(0,0,0,0)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={cn(
                    'rounded-2xl border bg-background p-4 cursor-pointer',
                    'flex flex-col gap-2',
                    isHovered ? 'border-pop-700 z-10' : 'border-border z-0'
                  )}
                  style={{
                    gridColumn: block.col,
                    gridRow: block.row,
                  }}
                >
                  <h4 className="text-sm font-bold">{block.title}</h4>
                  <p className="text-xs text-foreground/80 leading-snug">
                    {isHovered ? block.fullText : block.shortText}
                  </p>
                </motion.div>
              )
            })}
          </div>
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
