'use client'

import Image from 'next/image'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouteTransition } from './route-transition-context'

function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {}
      }
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false
      }
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    },
    () => false,
  )
}

function useHeaderHeight() {
  const [height, setHeight] = useState(64)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const measure = () => {
      const el = document.querySelector<HTMLElement>('header')
      if (el) setHeight(el.getBoundingClientRect().height)
    }
    measure()
    const el = document.querySelector<HTMLElement>('header')
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (el && observer) observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return height
}

function Pill({ width }: { width: number }) {
  return (
    <div
      className="h-8 rounded-xl bg-background shadow-xl animate-pulse"
      style={{ width: `${width}px` }}
    />
  )
}

function FilterPillPlaceholder({ targetHref }: { targetHref: string | null }) {
  if (targetHref === '/aliados') {
    // 6 plain pills, no separators (matches provider-grid.tsx)
    return (
      <>
        <div className="hidden sm:flex items-center gap-2 px-2 py-3 shrink-0 overflow-x-auto">
          {[56, 88, 76, 88, 76, 88].map((w, i) => (
            <Pill key={i} width={w} />
          ))}
        </div>
        <div className="sm:hidden px-2 py-3 shrink-0">
          <Pill width={96} />
        </div>
      </>
    )
  }

  // Default: /pets layout (6 + sep + 2 + sep + 2)
  return (
    <>
      <div className="hidden sm:flex items-center gap-2 px-2 py-3 shrink-0 flex-wrap">
        {[72, 72, 72, 80, 84, 88].map((w, i) => (
          <Pill key={`f1-${i}`} width={w} />
        ))}
        <span className="text-muted-foreground/20 mx-1 select-none">|</span>
        {[96, 96].map((w, i) => (
          <Pill key={`f2-${i}`} width={w} />
        ))}
        <span className="text-muted-foreground/20 mx-1 select-none">|</span>
        {[92, 92].map((w, i) => (
          <Pill key={`f3-${i}`} width={w} />
        ))}
      </div>
      <div className="sm:hidden px-2 py-3 shrink-0">
        <Pill width={96} />
      </div>
    </>
  )
}

export function TransitionOverlay() {
  const { status, type, logoRect, targetHref } = useRouteTransition()
  const reduced = useReducedMotion()
  const headerHeight = useHeaderHeight()
  const active = status !== 'idle' && type !== null

  const isLandingTarget = targetHref === '/'

  return (
    <AnimatePresence>
      {active && type === 'skeleton' && isLandingTarget && (
        <LandingZigzagOverlay
          key="landing"
          headerHeight={headerHeight}
          reduced={reduced}
        />
      )}
      {active && type === 'skeleton' && !isLandingTarget && (
        <div
          key="skeleton"
          data-transition-overlay
          data-testid="transition-overlay-skeleton"
          className="fixed inset-x-0 bottom-0 overflow-hidden pointer-events-none z-100"
          style={{ top: `${headerHeight}px` }}
        >
          <motion.div
            className="absolute inset-0 bg-muted"
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              y: { duration: reduced ? 0.05 : 0.35, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: reduced ? 0.05 : 0.25, ease: 'easeOut' },
            }}
          />
          <motion.div
            className="absolute inset-0 flex flex-col"
            initial={{ y: '110%', opacity: 1 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              y: { duration: reduced ? 0.05 : 0.5, delay: reduced ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: reduced ? 0.05 : 0.25, ease: 'easeOut' },
            }}
          >
            <div className="container mx-auto flex-1 flex flex-col sm:px-4">
              <FilterPillPlaceholder targetHref={targetHref} />
              <div className="flex-1 p-4 rounded-t-2xl sm:inset-shadow-2xl sm:shadow-2xl bg-background">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl overflow-hidden bg-secondary animate-pulse"
                    >
                      <div className="aspect-square bg-muted" />
                      <div className="p-2 space-y-1.5">
                        <div className="h-3.5 bg-muted rounded w-2/3" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {active && (type === 'about-in' || type === 'about-out') && (
        <AboutWipe key="about" type={type} logoRect={logoRect} status={status} reduced={reduced} />
      )}
    </AnimatePresence>
  )
}

function AboutWipe({
  type,
  logoRect,
  status,
  reduced,
}: {
  type: 'about-in' | 'about-out'
  logoRect: { x: number; y: number; width: number; height: number } | null
  status: 'exiting' | 'entering'
  reduced: boolean
}) {
  const origin = logoRect
    ? { x: logoRect.x + logoRect.width / 2, y: logoRect.y + logoRect.height / 2 }
    : { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: 80 }

  const expandFrom = `circle(0px at ${origin.x}px ${origin.y}px)`
  const expandTo = `circle(150% at ${origin.x}px ${origin.y}px)`

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (type !== 'about-out') return
    const el = document.querySelector<HTMLElement>('[data-about-hero-logo]')
    if (el) setTargetRect(el.getBoundingClientRect())
  }, [type])

  const smallRect = logoRect ?? { x: 24, y: 32, width: 56, height: 56 }
  const bigRect = targetRect
    ? { x: targetRect.x, y: targetRect.y, width: targetRect.width, height: targetRect.height }
    : {
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 120 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 120 : 0,
        width: 240,
        height: 240,
      }

  const startRect = type === 'about-in' ? smallRect : bigRect
  const endRect = type === 'about-in' ? bigRect : smallRect

  const initialClip = type === 'about-in' ? expandFrom : expandTo
  const animateClip = type === 'about-in' ? expandTo : expandFrom

  return (
    <>
      <motion.div
        data-transition-overlay
        data-testid="transition-overlay-about"
        initial={{ clipPath: initialClip, opacity: 1 }}
        animate={{ clipPath: animateClip, opacity: status === 'entering' ? 0 : 1 }}
        transition={{
          clipPath: { duration: reduced ? 0.05 : 0.6, ease: [0.3, 1, 0.35, 1] },
          opacity: { duration: reduced ? 0.05 : 0.2, ease: 'easeOut' },
        }}
        className="fixed inset-0 z-100 bg-background pointer-events-none"
      />
      {!reduced && (
        <motion.div
          className="fixed z-101 pointer-events-none"
          initial={{
            top: startRect.y,
            left: startRect.x,
            width: startRect.width,
            height: startRect.height,
          }}
          animate={{
            top: endRect.y,
            left: endRect.x,
            width: endRect.width,
            height: endRect.height,
            opacity: status === 'entering' ? 0 : 1,
          }}
          transition={{
            duration: 0.6,
            ease: [0.3, 1, 0.35, 1],
            opacity: { duration: 0.2, delay: 0.4 },
          }}
        >
          <Image src="/assets/logo.svg" alt="Pelú" fill priority />
        </motion.div>
      )}
    </>
  )
}

function LandingZigzagOverlay({
  headerHeight,
  reduced,
}: {
  headerHeight: number
  reduced: boolean
}) {
  return (
    <div
      data-transition-overlay
      data-testid="transition-overlay-landing"
      className="fixed inset-x-0 bottom-0 overflow-hidden pointer-events-none z-100"
      style={{ top: `${headerHeight}px` }}
    >
      {/* Column split: bg-background on TOP with text skeletons, bg-muted on BOTTOM with card skeletons. */}
      {/* Top slides in from the right, bottom from the left — zigzag horizontal entry, vertical split. */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1/2 bg-background flex items-center justify-center"
        initial={{ x: '100%', opacity: 1 }}
        animate={{ x: '0%', opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          x: { duration: reduced ? 0.05 : 0.5, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: reduced ? 0.05 : 0.25, ease: 'easeOut' },
        }}
      >
        <div className="container mx-auto max-w-6xl px-4 md:px-8 flex flex-col md:flex-row items-center gap-12 md:gap-8">
          {/* Left (copy) — real hero layout flips to row at md */}
          <div className="flex-1 flex flex-col items-start gap-5 w-full">
            <div className="h-7 w-44 rounded-full bg-muted animate-pulse" />
            <div className="w-full space-y-3">
              <div className="h-10 md:h-12 w-11/12 rounded-xl bg-muted animate-pulse" />
              <div className="h-10 md:h-12 w-4/5 rounded-xl bg-muted animate-pulse" />
            </div>
            <div className="w-full max-w-md space-y-2">
              <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
              <div className="h-3.5 w-5/6 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex gap-3 mt-2">
              <div className="h-10 w-32 rounded-xl bg-muted animate-pulse" />
              <div className="h-10 w-36 rounded-xl bg-pop-550/30 animate-pulse" />
            </div>
          </div>
          {/* Right (testimonial card) — hidden until md because it moves to bottom panel below md */}
          <div className="hidden md:flex flex-1 w-full max-w-150">
            <div className="w-full bg-muted rounded-2xl p-8 flex flex-col gap-4">
              <div className="flex gap-6 justify-center opacity-60">
                {[60, 72, 56, 68, 60].map((w, i) => (
                  <div
                    key={i}
                    className="h-6 rounded bg-background animate-pulse"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <div className="h-56 w-full rounded-2xl bg-background border border-border shadow-xl animate-pulse" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/2 bg-muted flex items-center justify-center"
        initial={{ x: '-100%', opacity: 1 }}
        animate={{ x: '0%', opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          x: { duration: reduced ? 0.05 : 0.5, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: reduced ? 0.05 : 0.25, ease: 'easeOut' },
        }}
      >
        {/* Mobile: card skel lives here. Desktop: reserved for "How it works" cards row. */}
        <div className="container mx-auto max-w-6xl px-4 md:px-8">
          <div className="md:hidden">
            <div className="w-full bg-background rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex gap-4 justify-center opacity-60">
                {[48, 60, 44, 56].map((w, i) => (
                  <div
                    key={i}
                    className="h-5 rounded bg-muted animate-pulse"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <div className="h-44 w-full rounded-2xl bg-muted animate-pulse" />
            </div>
          </div>
          <div className="hidden md:block text-center space-y-6">
            <div className="h-7 w-64 rounded-xl bg-background mx-auto animate-pulse" />
            <div className="h-3.5 w-80 rounded bg-background mx-auto animate-pulse" />
            <div className="grid grid-cols-3 gap-6 mt-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-2xl p-7 flex flex-col items-center gap-3 animate-pulse"
                >
                  <div className="w-12 h-12 rounded-xl bg-pop-550/20" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted" />
                  <div className="h-3 w-28 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
