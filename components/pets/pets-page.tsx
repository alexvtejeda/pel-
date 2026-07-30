'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pet } from '@/lib/api/pets'
import { PetFilters, listPublicPets } from '@/lib/api/pets-public'
import { PetGrid } from './pet-grid'
import {
  PetFilterBar,
  countActiveFilters,
  type FilterKey,
  type SourceFilter,
} from './pet-filters'
import { PetDetail } from './pet-detail'
import { PetFeed } from './pet-feed'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useRouteTransition } from '@/components/transitions/route-transition-context'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Footer } from '@/components/footer'

interface PetsPageProps {
  initialSelected?: Pet | null
}

export function PetsPage({ initialSelected = null }: PetsPageProps) {
  const { t } = useTranslation('pets')
  const [pets, setPets] = useState<Pet[]>([])
  const [selected, setSelected] = useState<Pet | null>(initialSelected)
  const [loading, setLoading] = useState(true)
  const { status: transitionStatus, type: transitionType } = useRouteTransition()
  const [holdSkeleton, setHoldSkeleton] = useState(
    () => transitionStatus === 'entering' && transitionType === 'skeleton',
  )
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const isDesktop = useMediaQuery('(min-width: 640px)')
  // The prerendered HTML is always built with the desktop branch — there is no
  // `window` on the server — so the feed must not appear until after hydration.
  // See the HYDRATION CONTRACT in `lib/hooks/use-media-query.ts`: this is the
  // first consumer that renders *visible* markup for one value and not the
  // other. The swap is invisible in practice because `loading` starts true and
  // the fetch runs from an effect, so the first paint is a skeleton either way.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const showFeed = mounted && !isDesktop
  const [open, setOpen] = useState(false)

  // Narrowing past 640px unmounts the Sheet without closing it, so `open` would
  // still be true when the viewport widens again and the Sheet would reappear
  // on its own with no user action. The Drawer used to catch that hand-off;
  // the feed is terminal and has nowhere to put a selection, so drop it.
  useEffect(() => {
    if (!isDesktop) setOpen(false)
  }, [isDesktop])
  const [vaccinatedFilter, setVaccinatedFilter] = useState(false)
  const [castratedFilter, setCastratedFilter] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  // The species/gender/proximity half of the query. Held as state rather than
  // passed straight to a fetch so the request effect below can see it alongside
  // the health toggles — see the comment there.
  const [filterParams, setFilterParams] = useState<PetFilters>({})

  // What the last request actually asked for. Retry has to replay the request
  // that failed — calling fetchPets() bare would quietly drop the user's filters
  // and repopulate the grid with pets the active pills say are filtered out.
  const lastFilters = useRef<PetFilters | undefined>(undefined)

  const fetchPets = useCallback(async (filters?: PetFilters) => {
    lastFilters.current = filters
    setLoading(true)
    setError(null)
    const { data, error: err } = await listPublicPets(filters)
    if (err) {
      setError(err)
      setPets([])
    } else {
      setPets(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (transitionStatus === 'entering' && transitionType === 'skeleton') {
      setHoldSkeleton(true)
      const t = setTimeout(() => setHoldSkeleton(false), 150)
      return () => clearTimeout(t)
    }
  }, [transitionStatus, transitionType])

  // This effect is the *only* thing that fetches. When the species/gender/nearby
  // params and the health toggles each issued their own request, two bugs fell
  // out: a health toggle refetched without the active species, so "Gatos" could
  // sit pressed over a grid of dogs; and clearing filters fired twice — once
  // from a closure still holding the old health values, once from here — with
  // no sequencing to stop the stale response landing last. Driving every
  // dimension from one effect means React batches the state changes and exactly
  // one request goes out, always carrying all of them.
  useEffect(() => {
    fetchPets({
      ...filterParams,
      ...(vaccinatedFilter ? { vaccinated: true } : {}),
      ...(castratedFilter ? { castrated: true } : {}),
    })
  }, [fetchPets, filterParams, vaccinatedFilter, castratedFilter])

  const handleFilterChange = useCallback((filter: FilterKey, params: PetFilters) => {
    setActiveFilter(filter)
    setSelected(null)
    // Copied, never stored by reference: `FILTERS[n].toParams` is a module-level
    // constant, so re-clicking the active pill would hand setState the identical
    // object, React would bail out, and the refetch users expect from clicking a
    // filter again would silently not happen.
    setFilterParams({ ...params })
  }, [])

  const handleRetry = useCallback(() => {
    fetchPets(lastFilters.current)
  }, [fetchPets])

  const handleSelect = useCallback((pet: Pet) => {
    setSelected(pet)
    setOpen(true)
  }, [])

  // Centre-published pets first, then the source filter. Derived here rather
  // than in `PetGrid` so the feed sees exactly the same list at the other
  // breakpoint instead of a second, drifting copy of this logic.
  //
  // Memoised for identity, not for speed: sorting 17 pets is free, but this
  // array is a prop, and the renders that would churn it are the ones that have
  // nothing to do with pets — selecting a pet, opening the sheet, a resize. The
  // feed hands it to one card per pet, each holding a drag-driven carousel.
  const sortedPets = useMemo(
    () =>
      [...pets].sort((a, b) => {
        const aIsRc = a.rescue_center ? 0 : 1
        const bIsRc = b.rescue_center ? 0 : 1
        return aIsRc - bIsRc
      }),
    [pets],
  )

  const visiblePets = useMemo(() => {
    if (sourceFilter === 'all') return sortedPets
    // One spelling of "has a publisher", and `member` is the explicit branch —
    // as the fallback, a fourth SourceFilter would silently render as member-only.
    const wantsCentre = sourceFilter === 'rc'
    return sortedPets.filter(p => Boolean(p.rescue_center) === wantsCentre)
  }, [sortedPets, sourceFilter])

  const hasActiveFilters =
    countActiveFilters({ activeFilter, vaccinatedFilter, castratedFilter, sourceFilter }) > 0

  // Step for step what `clearFilters` did inside the grid, including going
  // through `handleFilterChange` rather than `fetchPets` — that is what also
  // clears the selection.
  const handleClearFilters = useCallback(() => {
    setSourceFilter('all')
    setVaccinatedFilter(false)
    setCastratedFilter(false)
    handleFilterChange('all', {})
    setMobileFiltersOpen(false)
  }, [handleFilterChange])

  const showSkeleton = loading || holdSkeleton

  return (
    <div data-route="pets" className="flex flex-col min-h-screen bg-muted">
      {/* max-w-6xl, matching / and /aliados: bare `container` runs to 1400px at
          the top breakpoint, so the content column jumped between routes. */}
      <div className="container mx-auto max-w-6xl flex-1 flex flex-col sm:px-4 sm:pb-0">
        {/* A <div>, not a <header>: the public layout's PetsHeader already owns the banner landmark. */}
        <div className="px-4 pt-6 pb-2 sm:px-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('grid.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('grid.subtitle')}</p>
          {/* Kept mounted (content varies) so screen readers announce the count when it changes. */}
          <p aria-live="polite" className="mt-2 min-h-4 text-xs font-medium text-muted-foreground">
            {!showSkeleton && !error ? t('grid.count', { count: visiblePets.length }) : ''}
          </p>
        </div>
        <PetFilterBar
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          vaccinatedFilter={vaccinatedFilter}
          onVaccinatedChange={setVaccinatedFilter}
          castratedFilter={castratedFilter}
          onCastratedChange={setCastratedFilter}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          mobileFiltersOpen={mobileFiltersOpen}
          onMobileFiltersOpenChange={setMobileFiltersOpen}
        />
        {showFeed ? (
          <PetFeed
            pets={visiblePets}
            loading={showSkeleton}
            error={error}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onRetry={handleRetry}
          />
        ) : (
          <PetGrid
            pets={visiblePets}
            loading={showSkeleton}
            error={error}
            selectedId={selected?.id ?? null}
            hasActiveFilters={hasActiveFilters}
            onSelect={handleSelect}
            onClearFilters={handleClearFilters}
            onRetry={handleRetry}
          />
        )}
      </div>

      {/* Desktop: Sheet from right. The mobile Drawer is gone — the feed is
          terminal, so below 640px there is nothing left to open. `initialSelected`
          (the /p?slug= deep link) therefore only opens on desktop; that route
          resolves nothing today anyway, because `short_slug` does not exist in
          the API. */}
      {isDesktop && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="p-0 overflow-y-auto">
            <SheetTitle className="sr-only">{selected?.name ?? ''}</SheetTitle>
            <SheetDescription className="sr-only">{selected?.description ?? ''}</SheetDescription>
            {selected && <PetDetail pet={selected} />}
          </SheetContent>
        </Sheet>
      )}
      <Footer />
    </div>
  )
}
