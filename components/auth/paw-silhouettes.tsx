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
          viewBox="0 -5 100 85"
          style={{
            top: 'top' in s ? s.top : undefined,
            bottom: 'bottom' in s ? s.bottom : undefined,
            left: 'left' in s ? s.left : undefined,
            right: 'right' in s ? s.right : undefined,
            opacity: s.opacity,
            transform: `rotate(${s.rotate}deg)`,
          }}
        >
          {/* Main pad — heart/shield shape */}
          <path d="M50,78 C30,78 18,65 18,52 C18,42 26,35 38,35 C44,35 48,38 50,42 C52,38 56,35 62,35 C74,35 82,42 82,52 C82,65 70,78 50,78Z" fill="currentColor" />
          {/* Toe pads — spread wider */}
          <ellipse cx="18" cy="22" rx="10" ry="12" fill="currentColor" />
          <ellipse cx="82" cy="22" rx="10" ry="12" fill="currentColor" />
          <ellipse cx="40" cy="10" rx="9" ry="11" fill="currentColor" />
          <ellipse cx="60" cy="10" rx="9" ry="11" fill="currentColor" />
          {/* Claws */}
          <path d="M16,9 C15,5 17,2 19,3 C21,4 20,8 19,10Z" fill="currentColor" />
          <path d="M84,9 C85,5 83,2 81,3 C79,4 80,8 81,10Z" fill="currentColor" />
          <path d="M38,-1 C37,-5 39,-7 41,-6 C43,-5 42,-1 41,1Z" fill="currentColor" />
          <path d="M62,-1 C63,-5 61,-7 59,-6 C57,-5 58,-1 59,1Z" fill="currentColor" />
        </svg>
      ))}
    </>
  )
}
