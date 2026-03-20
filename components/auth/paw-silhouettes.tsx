'use client'

import { cn } from '@/lib/utils'

interface PawSilhouettesProps {
  className?: string
}

const silhouettes = [
  { size: 90, bottom: '40px', left: '30px', opacity: 0.08, rotate: 0 },
  { size: 70, top: '50px', right: '40px', opacity: 0.05, rotate: 15 },
  { size: 50, top: '55%', left: '60%', opacity: 0.04, rotate: -20 },
] as const

export function PawSilhouettes({ className }: PawSilhouettesProps) {
  return (
    <>
      {silhouettes.map((s, i) => (
        <svg
          key={i}
          className={cn('absolute', className)}
          width={s.size}
          height={s.size}
          viewBox="0 0 100 80"
          style={{
            top: 'top' in s ? s.top : undefined,
            bottom: 'bottom' in s ? s.bottom : undefined,
            left: 'left' in s ? s.left : undefined,
            right: 'right' in s ? s.right : undefined,
            opacity: s.opacity,
            transform: `rotate(${s.rotate}deg)`,
          }}
        >
          {/* Paw pad */}
          <ellipse cx="50" cy="45" rx="20" ry="22" fill="currentColor" />
          {/* Toes */}
          <ellipse cx="28" cy="18" rx="11" ry="13" fill="currentColor" />
          <ellipse cx="72" cy="18" rx="11" ry="13" fill="currentColor" />
          <ellipse cx="22" cy="65" rx="9" ry="11" fill="currentColor" />
          <ellipse cx="78" cy="65" rx="9" ry="11" fill="currentColor" />
        </svg>
      ))}
    </>
  )
}
