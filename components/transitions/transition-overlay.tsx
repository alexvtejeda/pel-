'use client'

import Image from 'next/image'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouteTransition } from './route-transition-context'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

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

/*
  The skeletons below mirror their route class-for-class — same container, same
  paddings, same breakpoint forks — because the overlay fades out directly onto
  the live page. Whatever differs reads to the user as the page jumping. When a
  route's layout moves, its skeleton here has to move with it.

  Note what is deliberately *absent*: `data-pet-feed`. That attribute drives a
  `html:has(...)` scroll-snap rule in globals.css, and the overlay mounts while
  the browser is still on the outgoing route — copying it would snap-scroll a
  page that has no feed on it.
*/

/** Text placeholders sit on `bg-muted`, where a `bg-muted` bar is invisible. */
const BAR = 'rounded-xl bg-foreground/10 animate-pulse'

/**
 * A filter pill. A bordered one measures 34px (`py-1.5` + a 20px line box + the
 * border); the mobile disclosure button carries no border and so measures 32.
 *
 * `active` fills it the way the real pressed pill is filled. Both routes mount
 * fresh on a transition with their first filter ("Todos") selected, so the
 * leading pill is genuinely coloured on the page the overlay is about to reveal.
 */
function Pill({
  width,
  bordered = true,
  active = false,
}: {
  width: number
  bordered?: boolean
  active?: boolean
}) {
  return (
    <div
      className={`shrink-0 rounded-xl animate-pulse ${
        active ? 'bg-pop-solid' : 'bg-background'
      } ${bordered ? `h-[34px] border ${active ? 'border-pop-solid' : 'border-input'}` : 'h-8'}`}
      style={{ width: `${width}px` }}
    />
  )
}

/**
 * The title block both grid routes render above their filters. Each line box is
 * reserved at its full height with a shorter bar drawn inside, so the filter row
 * below lands on exactly the y the real page puts it on.
 *
 * The mobile line counts are per route and measured, not guessed: at 390px the
 * /pets title wraps to two lines and its subtitle to two, while /aliados keeps a
 * one-line title over a three-line subtitle. Getting these wrong is what makes
 * the pills jump when the overlay lifts.
 */
function SkeletonHeader({
  title,
  titleMobile,
  subtitleMobile,
}: {
  /** Bar width for the single-line title at sm and up. */
  title: string
  /** One bar width per line of the wrapped mobile title. */
  titleMobile: string[]
  /** One bar width per line of the wrapped mobile subtitle. */
  subtitleMobile: string[]
}) {
  return (
    <div className="px-4 pt-6 pb-2 sm:px-2">
      <div className="sm:hidden">
        {titleMobile.map((w, i) => (
          <div key={i} className="flex h-8 items-center">
            <div className={`h-6 ${w} ${BAR}`} />
          </div>
        ))}
      </div>
      <div className="hidden sm:flex h-9 items-center">
        <div className={`h-7 ${title} ${BAR}`} />
      </div>

      <div className="mt-1 max-w-xl">
        <div className="sm:hidden">
          {subtitleMobile.map((w, i) => (
            <div key={i} className="flex h-5 items-center">
              <div className={`h-3 ${w} ${BAR}`} />
            </div>
          ))}
        </div>
        <div className="hidden sm:flex h-5 items-center">
          <div className={`h-3 w-full max-w-md ${BAR}`} />
        </div>
      </div>

      {/* Empty on purpose — the real count line renders blank while loading and
          holds its space with `min-h-4`. */}
      <div className="mt-2 h-4" />
    </div>
  )
}

/*
  Pill widths are measured off the rendered Spanish labels in Chrome, not
  estimated — the row wraps at the top breakpoint, so a few px of drift moves a
  whole line. Re-measure if the labels change.
*/
const PETS_SPECIES_PILLS = [86, 90, 88, 100, 110, 112]
const PETS_HEALTH_PILLS = [116, 110]
const PETS_SOURCE_PILLS = [101, 115]

function PetsSkeleton() {
  return (
    <div
      data-testid="transition-skeleton-pets"
      className="container mx-auto max-w-6xl flex-1 flex flex-col sm:px-4 sm:pb-0"
    >
      <SkeletonHeader
        title="w-78"
        titleMobile={['w-1/2', 'w-2/5']}
        subtitleMobile={['w-full', 'w-3/4']}
      />

      {/* Filters — desktop row, with the two separators pet-filters.tsx draws. */}
      <div className="hidden sm:flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0 flex-wrap">
        {PETS_SPECIES_PILLS.map((w, i) => (
          <Pill key={`species-${i}`} width={w} active={i === 0} />
        ))}
        <span className="text-muted-foreground/30 mx-1 select-none">|</span>
        {PETS_HEALTH_PILLS.map((w, i) => (
          <Pill key={`health-${i}`} width={w} />
        ))}
        <span className="text-muted-foreground/30 mx-1 select-none">|</span>
        {PETS_SOURCE_PILLS.map((w, i) => (
          <Pill key={`source-${i}`} width={w} />
        ))}
      </div>
      {/* Filters — the mobile disclosure button, which carries no border. */}
      <div className="sm:hidden px-2 py-3 shrink-0">
        <Pill width={87} bordered={false} />
      </div>

      {/* ≥640px: the grid panel (pet-grid.tsx). */}
      <div className="hidden sm:block flex-1 p-4 rounded-t-2xl sm:inset-shadow-2xl sm:shadow-2xl bg-background">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-secondary animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-2 space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* <640px: the post feed (pet-feed.tsx). No panel — the cards sit straight
          on the muted page, and the second one is clipped to say "keep going". */}
      <div className="sm:hidden flex-1 px-3 pb-20">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-card shadow-post">
            <div className="h-11 animate-pulse bg-muted/60" />
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-5 w-1/2 animate-pulse rounded-xl bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded-xl bg-muted" />
              <div className="h-11 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
          <div className="h-44 overflow-hidden rounded-2xl bg-card shadow-post">
            <div className="h-11 animate-pulse bg-muted/60" />
            <div className="aspect-square animate-pulse bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** `all` + the six SERVICE_TYPES labels, measured. No icons here, unlike /pets. */
const ALIADOS_PILLS = [65, 100, 100, 177, 138, 100, 130]

function AliadosSkeleton() {
  return (
    <div
      data-testid="transition-skeleton-aliados"
      className="container mx-auto max-w-6xl flex-1 flex flex-col sm:px-4 sm:pb-0"
    >
      <SkeletonHeader
        title="w-28"
        titleMobile={['w-24']}
        subtitleMobile={['w-full', 'w-full', 'w-1/2']}
      />

      {/* One row at every breakpoint — provider-grid.tsx has no mobile fork.
          `overflow-x-auto` verbatim, scrollbar and all: below sm this row
          overflows, and on a classic-scrollbar browser that gutter is 15px of
          real height. Swapping in `overflow-hidden` would sit the cards 15px
          high and drop them on handoff. */}
      <div className="flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0">
        {ALIADOS_PILLS.map((w, i) => (
          <Pill key={i} width={w} active={i === 0} />
        ))}
      </div>

      {/* Provider cards: avatar left, two text lines, service chips, price. */}
      <div className="flex-1 p-4 pb-20 sm:pb-4 rounded-t-2xl sm:inset-shadow-2xl sm:shadow-2xl bg-background">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-muted" />
              <div className="flex gap-1.5">
                <div className="h-5 w-16 rounded-full bg-muted" />
                <div className="h-5 w-20 rounded-full bg-muted" />
              </div>
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * /eventos is the odd one out: a full-bleed centred hero band, then the loading
 * state — no container, no filters, no grid. The paw is the same component the
 * route itself renders while it fetches, so the handoff continues one animation
 * instead of swapping indicators.
 */
function EventosSkeleton() {
  return (
    <div data-testid="transition-skeleton-eventos" className="flex-1">
      <section className="px-4 pt-12 pb-16 text-center bg-background border-input border border-t-0 border-b-2 mb-16">
        <div className="mb-3 flex h-9 items-center justify-center md:h-10">
          <div className={`h-7 w-28 md:h-8 md:w-36 ${BAR}`} />
        </div>
        <div className="mx-auto max-w-md">
          <div className="flex h-6 items-center justify-center">
            <div className={`h-3.5 w-full max-w-sm ${BAR}`} />
          </div>
          <div className="flex h-6 items-center justify-center sm:hidden">
            <div className={`h-3.5 w-2/3 ${BAR}`} />
          </div>
        </div>
      </section>
      <section className="px-4 pb-16">
        <div className="container mx-auto max-w-5xl">
          {/* aria-hidden: this is the decorative copy. The real route mounts its
              own role="status" underneath, and two live regions announcing
              "Cargando…" would double up. */}
          <div className="flex justify-center py-20" aria-hidden="true">
            <PeluLoadingLogo />
          </div>
        </div>
      </section>
    </div>
  )
}

function RouteSkeleton({ targetHref }: { targetHref: string | null }) {
  if (targetHref === '/aliados') return <AliadosSkeleton />
  if (targetHref === '/eventos') return <EventosSkeleton />
  return <PetsSkeleton />
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
            <RouteSkeleton targetHref={targetHref} />
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
