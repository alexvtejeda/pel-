'use client'

import Image from 'next/image'
import { EmpathySegment } from '@/lib/about/empathy-content'

const QUADRANTS = ['piensa', 've', 'oye', 'dice', 'duele', 'aspira'] as const

// Angles in degrees clockwise from 12 o'clock: 12, 2, 4, 6, 8, 10
const ANGLES_DEG = [-90, -30, 30, 90, 150, 210]

// Circumference of the circle with r=18 in the SVG viewBox (used for stroke-dash reveal)
const FRAME_RADIUS = 18
const FRAME_CIRCUMFERENCE = 2 * Math.PI * FRAME_RADIUS // ≈ 113.1

type Props = { segment: EmpathySegment }

export function EmpathyMap({ segment }: Props) {
  const quadrantEntries = QUADRANTS.map((q, i) => ({
    key: q,
    angleDeg: ANGLES_DEG[i],
    data: segment.quadrants[q],
  }))

  return (
    <div
      data-empathy-map
      data-segment={segment.id}
      role="group"
      aria-labelledby={`empathy-${segment.id}-heading`}
      className="relative w-full max-w-5xl mx-auto"
      style={{ '--seg-color': segment.colorVar } as React.CSSProperties}
    >
      {/* Persona heading (shared across layouts) */}
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-foreground/60">
          Segmento {segment.id.toUpperCase()}
        </p>
        <h3
          id={`empathy-${segment.id}-heading`}
          className="text-2xl md:text-3xl font-bold"
        >
          {segment.personaName}, {segment.age}
        </h3>
        <p className="text-sm text-foreground/70">{segment.archetype}</p>
      </div>

      {/* Desktop radial layout */}
      <div className="hidden md:block relative aspect-square">
        {/* Character at center */}
        <div
          data-empathy-character
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in oklch, var(--seg-color) 15%, transparent)' }}
        >
          <Image
            src={segment.character}
            alt={segment.personaName}
            width={224}
            height={224}
            className="w-full h-full object-contain p-6"
          />
        </div>

        {/* Radiating lines + circular frame */}
        <svg
          data-empathy-svg
          viewBox="-50 -50 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <circle
            data-empathy-frame
            cx="0"
            cy="0"
            r={FRAME_RADIUS}
            fill="none"
            stroke="var(--seg-color)"
            strokeWidth="0.3"
            strokeDasharray={FRAME_CIRCUMFERENCE}
            strokeDashoffset="0"
            opacity="0.5"
          />
          {quadrantEntries.map(({ key, angleDeg }) => {
            const rad = (angleDeg * Math.PI) / 180
            const x = Math.cos(rad) * 42
            const y = Math.sin(rad) * 42
            return (
              <line
                key={key}
                data-empathy-line={key}
                x1="0"
                y1="0"
                x2={x}
                y2={y}
                stroke="var(--seg-color)"
                strokeWidth="0.25"
                strokeLinecap="round"
                opacity="0.6"
              />
            )
          })}
        </svg>

        {/* Quadrant text cards — absolutely positioned by angle */}
        {quadrantEntries.map(({ key, angleDeg, data }) => {
          const rad = (angleDeg * Math.PI) / 180
          const xPct = 50 + Math.cos(rad) * 46
          const yPct = 50 + Math.sin(rad) * 46
          return (
            <div
              key={key}
              data-empathy-label={key}
              className="absolute w-48 md:w-56 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: 'var(--seg-color)' }}
              >
                {data.label}
              </p>
              <p className="text-xs md:text-sm text-foreground/80 leading-snug">{data.body}</p>
            </div>
          )
        })}
      </div>

      {/* Mobile stacked layout */}
      <div className="md:hidden flex flex-col items-center gap-6">
        <div
          className="w-40 h-40 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in oklch, var(--seg-color) 15%, transparent)' }}
        >
          <Image
            src={segment.character}
            alt={segment.personaName}
            width={224}
            height={224}
            className="w-full h-full object-contain p-6"
          />
        </div>
        <ul className="w-full space-y-4">
          {quadrantEntries.map(({ key, data }) => (
            <li key={key} className="rounded-2xl border border-border p-4">
              <p
                className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: 'var(--seg-color)' }}
              >
                {data.label}
              </p>
              <p className="text-sm text-foreground/80 leading-snug">{data.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
