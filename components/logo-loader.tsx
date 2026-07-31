'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'

interface LogoLoaderProps {
  /** Overrides the default "Guardando…" announcement for screen readers. */
  label?: string
}

/**
 * Full-screen loader for the registration flow's genuinely slow moments —
 * setRole, createRescueCenter/createBusiness, and the photo uploads. It loops
 * rather than running a fixed duration, because an upload has no known length.
 *
 * Deliberately not built on components/logo.tsx: that wraps the mark in a
 * `<Link href="/">`, and inside a blocking overlay a click on the logo would
 * navigate home in the middle of a submit.
 *
 * The pulse is a CSS keyframe (`--animate-logo-pulse` in globals.css), not a
 * Framer Motion loop — same reasoning as LogoMarquee over LogoLoop: rAF-driven
 * animation freezes on mobile Safari after a React re-render, and this one must
 * stay alive for as long as the request does.
 */
export function LogoLoader({ label }: LogoLoaderProps) {
  const { t } = useTranslation('common')
  const message = label ?? t('saving')

  return (
    <div
      // aria-live is on the wrapper so the label is announced when the loader
      // mounts; role="status" alone would not re-announce on a route that keeps
      // the node mounted across steps.
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <Image
        src="/assets/logo.svg"
        alt=""
        aria-hidden="true"
        width={72}
        height={72}
        priority
        className="animate-logo-pulse motion-reduce:animate-none"
        style={{ height: 'auto' }}
      />
      <span className="sr-only">{message}</span>
    </div>
  )
}
