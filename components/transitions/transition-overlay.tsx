'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useRouteTransition } from './route-transition-context'

export function TransitionOverlay() {
  const { status, type, logoRect } = useRouteTransition()
  const active = status !== 'idle' && type !== null

  return (
    <AnimatePresence>
      {active && type === 'skeleton' && (
        <motion.div
          key="skeleton"
          data-transition-overlay
          data-testid="transition-overlay-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-card pointer-events-none"
        />
      )}
      {active && (type === 'about-in' || type === 'about-out') && (
        <AboutWipe key="about" type={type} logoRect={logoRect} status={status} />
      )}
    </AnimatePresence>
  )
}

function AboutWipe({
  type,
  logoRect,
  status,
}: {
  type: 'about-in' | 'about-out'
  logoRect: { x: number; y: number; width: number; height: number } | null
  status: 'exiting' | 'entering'
}) {
  const origin = logoRect
    ? { x: logoRect.x + logoRect.width / 2, y: logoRect.y + logoRect.height / 2 }
    : { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: 80 }

  const expandFrom = `circle(0px at ${origin.x}px ${origin.y}px)`
  const expandTo = `circle(150% at ${origin.x}px ${origin.y}px)`

  const initialClip = type === 'about-in' ? expandFrom : expandTo
  const animateClip =
    status === 'exiting'
      ? type === 'about-in'
        ? expandTo
        : expandFrom
      : type === 'about-in'
        ? expandTo
        : expandFrom

  return (
    <motion.div
      data-transition-overlay
      data-testid="transition-overlay-about"
      initial={{ clipPath: initialClip, opacity: 1 }}
      animate={{ clipPath: animateClip, opacity: status === 'entering' ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{
        clipPath: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.2, ease: 'easeOut' },
      }}
      className="fixed inset-0 z-[100] bg-background pointer-events-none"
    />
  )
}
