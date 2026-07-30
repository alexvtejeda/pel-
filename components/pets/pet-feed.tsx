'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { trackPetEvent } from '@/lib/api/metrics'
import { ErrorState } from '@/components/ui/error-state'
import { PetFeedCard } from './pet-feed-card'

/** Past this many pets the dashes stop being individually legible. */
const MAX_RAIL_DASHES = 30

interface PetFeedProps {
  /** Already sorted and source-filtered by `pets-page.tsx`. */
  pets: Pet[]
  loading: boolean
  error: string | null
  hasActiveFilters: boolean
  onClearFilters: () => void
  onRetry: () => void
}

export function PetFeed({
  pets,
  loading,
  error,
  hasActiveFilters,
  onClearFilters,
  onRetry,
}: PetFeedProps) {
  const { t } = useTranslation('pets')
  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const viewed = useRef<Set<string>>(new Set())
  const [photoWidth, setPhotoWidth] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  // One measurement for the whole feed. The list element carries no padding of
  // its own, so its width *is* the card width — no arithmetic against gutters.
  useEffect(() => {
    const el = listRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setPhotoWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Drives the rail, and doubles as the view metric: a card that owns the middle
  // of the screen has genuinely been seen. Firing on mount instead would post a
  // view for every pet the moment the page loads.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]
    if (cards.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = cards.indexOf(entry.target as HTMLDivElement)
          if (index < 0) continue
          setActiveIndex(index)
          const id = pets[index]?.id
          if (id && !viewed.current.has(id)) {
            viewed.current.add(id)
            trackPetEvent(id, 'view')
          }
        }
      },
      // A band across the middle of the viewport: the rail should mark the card
      // that owns the centre of the screen, not whichever card has one pixel on it.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )

    cards.forEach((c) => observer.observe(c))
    return () => observer.disconnect()
  }, [pets])

  return (
    <div data-pet-feed className="flex-1 px-3 pb-20">
      {loading && (
        <div className="space-y-4">
          {/* One and a half: the clipped second card is what says "keep scrolling". */}
          <div data-feed-skeleton className="overflow-hidden rounded-2xl bg-card shadow-post">
            <div className="h-11 animate-pulse bg-muted/60" />
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-5 w-1/2 animate-pulse rounded-xl bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded-xl bg-muted" />
              <div className="h-11 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
          <div
            data-feed-skeleton
            className="h-44 overflow-hidden rounded-2xl bg-card shadow-post"
          >
            <div className="h-11 animate-pulse bg-muted/60" />
            <div className="aspect-square animate-pulse bg-muted" />
          </div>
        </div>
      )}

      {error && !loading && <ErrorState message={t('grid.error')} onRetry={onRetry} />}

      {!loading && !error && pets.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
          <FontAwesomeIcon icon={faPaw} className="text-4xl opacity-30" />
          <p className="text-sm">{t('grid.empty')}</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              {t('grid.clear_filters')}
            </button>
          )}
        </div>
      )}

      {!loading && !error && pets.length > 0 && (
        <div ref={listRef} className="space-y-4">
          {pets.map((pet, i) => (
            <div
              key={pet.id}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
            >
              <PetFeedCard pet={pet} photoWidth={photoWidth} priority={i === 0} />
            </div>
          ))}
        </div>
      )}

      {/* Position rail. `aria-hidden` on purpose: the live count line in
          pets-page.tsx already announces the total, and 17 dashes announced
          individually would be noise. */}
      {!loading && !error && pets.length > 1 && (
        <div
          data-feed-rail
          aria-hidden="true"
          className="pointer-events-none fixed right-1.5 top-1/2 z-30 -translate-y-1/2"
        >
          {pets.length <= MAX_RAIL_DASHES ? (
            <div className="flex flex-col items-center gap-1.5">
              {pets.map((pet, i) => (
                <span
                  key={pet.id}
                  data-feed-dash
                  className={`h-0.5 w-2 rounded-full transition-colors ${
                    i === activeIndex ? 'bg-pop-550' : 'bg-foreground/20'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="rounded-xl bg-foreground/10 px-1.5 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">
              {activeIndex + 1}/{pets.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
