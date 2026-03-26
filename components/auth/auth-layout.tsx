'use client'

import { BackgroundBeams } from '@/components/ui/beams'
import { PawSilhouettes } from './paw-silhouettes'

interface AuthLayoutProps {
  accent: 'amber' | 'pop'
  heroTagline: string
  children: React.ReactNode
}

const heroGradients = {
  amber: 'bg-linear-to-br from-[#0a0a0f] via-[#1a150d] to-[#0a0a0f]',
  pop: 'bg-linear-to-br from-[#0a0a0f] via-[#0d1a28] to-[#0a0a0f]',
}

const pawColors = {
  amber: 'text-amber-500',
  pop: 'text-pop-550',
}

const accentText = {
  amber: 'text-amber-500',
  pop: 'text-pop-550',
}

export function AuthLayout({ accent, heroTagline, children }: AuthLayoutProps) {
  return (
    <div className="dark relative flex min-h-screen bg-primary">
      {/* Hero — desktop only */}
      <div className={`hidden md:flex flex-[1.1] relative items-center justify-center overflow-hidden ${heroGradients[accent]}`}>
        <BackgroundBeams variant={accent} />
        <PawSilhouettes className={pawColors[accent]} />

        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-background tracking-tight">Pelú</h1>
          <p className={`text-sm mt-2 font-medium opacity-85 ${accentText[accent]}`}>
            {heroTagline}
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="bg-muted flex-1 md:flex-[0.9] flex items-center justify-center p-4 relative">
        {/* Subtle beams on mobile only */}
        <div className="md:hidden absolute inset-0 opacity-[0.06] overflow-hidden">
          <BackgroundBeams variant={accent} />
        </div>

        {/* Glassy card */}
        <div className="relative z-10 w-full max-w-md bg-background/80 backdrop-blur-xl inset-shadow-[-1px_1px_1px_1px_var(--color-input)] rounded-2xl border border-input p-8">
          {/* Mobile logo — hidden on desktop */}
          <div className="md:hidden text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Pelú</h1>
            <p className={`text-xs mt-1 ${accentText[accent]} opacity-80`}>
              {heroTagline}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
