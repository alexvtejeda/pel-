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

export function TransitionOverlay() {
  const { status, type, logoRect } = useRouteTransition()
  const reduced = useReducedMotion()
  const headerHeight = useHeaderHeight()
  const active = status !== 'idle' && type !== null

  return (
    <AnimatePresence>
      {active && type === 'skeleton' && (
        <div
          key="skeleton"
          data-transition-overlay
          data-testid="transition-overlay-skeleton"
          className="fixed inset-x-0 bottom-0 overflow-hidden pointer-events-none z-100"
          style={{ top: `${headerHeight}px` }}
        >
          <motion.div
            className="absolute inset-0 bg-muted"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{
              duration: reduced ? 0.05 : 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
          <motion.div
            className="absolute inset-0 flex flex-col"
            initial={{ y: '110%' }}
            animate={{ y: '0%' }}
            exit={{ y: '110%' }}
            transition={{
              duration: reduced ? 0.05 : 0.5,
              delay: reduced ? 0 : 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="container mx-auto flex-1 flex flex-col sm:px-4">
              {/* Filter pill placeholders — desktop */}
              <div className="hidden sm:flex items-center gap-2 px-2 py-3 shrink-0 flex-wrap">
                {[72, 72, 72, 80, 84, 88].map((w, i) => (
                  <div
                    key={`f1-${i}`}
                    className="h-8 rounded-xl bg-background shadow-xl animate-pulse"
                    style={{ width: `${w}px` }}
                  />
                ))}
                <span className="text-muted-foreground/20 mx-1 select-none">|</span>
                {[96, 96].map((w, i) => (
                  <div
                    key={`f2-${i}`}
                    className="h-8 rounded-xl bg-background shadow-xl animate-pulse"
                    style={{ width: `${w}px` }}
                  />
                ))}
                <span className="text-muted-foreground/20 mx-1 select-none">|</span>
                {[92, 92].map((w, i) => (
                  <div
                    key={`f3-${i}`}
                    className="h-8 rounded-xl bg-background shadow-xl animate-pulse"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              {/* Filter pill placeholder — mobile */}
              <div className="sm:hidden px-2 py-3 shrink-0">
                <div className="h-8 w-24 rounded-xl bg-background shadow-xl animate-pulse" />
              </div>
              <div className="flex-1 p-4 rounded-t-2xl sm:inset-shadow-2xl sm:shadow-2xl bg-background">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden bg-secondary animate-pulse"
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
          clipPath: { duration: reduced ? 0.05 : 0.6, ease: [0.22, 1, 0.36, 1] },
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
            ease: [0.22, 1, 0.36, 1],
            opacity: { duration: 0.2, delay: 0.4 },
          }}
        >
          <Image src="/assets/logo.svg" alt="Pelú" fill priority />
        </motion.div>
      )}
    </>
  )
}
