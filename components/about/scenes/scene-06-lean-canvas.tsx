'use client'

import { LeanCanvasGrid } from '../lean-canvas-grid'
import { LEAN_CANVAS } from '@/lib/about/lean-canvas-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene06LeanCanvas() {
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const useGrid = isDesktop && !reduced

  return (
    <section
      data-scene="06-lean-canvas"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">El modelo</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">Lean Canvas</h2>

        {useGrid ? (
          <LeanCanvasGrid />
        ) : (
          <div className="space-y-4">
            {[...LEAN_CANVAS.top.flatMap((c) => c.cells), ...LEAN_CANVAS.bottom.flatMap((c) => c.cells)].map(
              (block) => (
                <div key={block.id} className="rounded-2xl border border-border p-4">
                  <h4 className="text-sm font-bold mb-2">{block.title}</h4>
                  <p className="text-xs text-foreground/80">{block.fullText}</p>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}
