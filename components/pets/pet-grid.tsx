'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faDog, faCat, faMars, faVenus, faLocationDot, faEllipsis, faLink, faGlobe, faSyringe, faScissors, faHouseChimney, faUser, faFilter } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { Pet } from '@/lib/api/pets'
import { instagramUrl, ensureUrl } from '@/lib/utils'
import { formatAge } from '@/lib/utils/format-age'
import { PetFilters } from '@/lib/api/pets-public'
import { ErrorState } from '@/components/ui/error-state'
import { VerifiedBadge } from './verified-badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

type FilterKey = 'all' | 'dogs' | 'cats' | 'males' | 'females' | 'nearby'

const FILTERS: { key: FilterKey; icon: typeof faPaw; toParams: PetFilters }[] = [
  { key: 'all', icon: faPaw, toParams: {} },
  { key: 'dogs', icon: faDog, toParams: { species: 'dog' } },
  { key: 'cats', icon: faCat, toParams: { species: 'cat' } },
  { key: 'males', icon: faMars, toParams: { gender: 'male' } },
  { key: 'females', icon: faVenus, toParams: { gender: 'female' } },
  { key: 'nearby', icon: faLocationDot, toParams: { sort: 'proximity' } },
]

interface PetGridProps {
  pets: Pet[]
  loading: boolean
  error: string | null
  selectedId: string | null
  activeFilter: FilterKey
  onSelect: (pet: Pet) => void
  onFilterChange: (filter: FilterKey, params: PetFilters) => void
  vaccinatedFilter: boolean
  castratedFilter: boolean
  onVaccinatedChange: (v: boolean) => void
  onCastratedChange: (v: boolean) => void
  onRetry: () => void
}

export type { FilterKey }

export function PetGrid({
  pets,
  loading,
  error,
  selectedId,
  activeFilter,
  onSelect,
  onFilterChange,
  vaccinatedFilter,
  castratedFilter,
  onVaccinatedChange,
  onCastratedChange,
  onRetry,
}: PetGridProps) {
  const { t } = useTranslation('pets')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'rc' | 'member'>('all')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const mobileFiltersRef = useRef<HTMLDivElement>(null)

  // The mobile filter popover is hand-rolled (not Radix), so it needs its own
  // dismiss behaviour. The ref wraps the trigger *and* the popover, so a
  // pointerdown on the trigger is "inside" and the button's own click still
  // toggles normally.
  useEffect(() => {
    if (!showMobileFilters) return

    const onPointerDown = (e: PointerEvent) => {
      if (!mobileFiltersRef.current?.contains(e.target as Node)) setShowMobileFilters(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMobileFilters(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showMobileFilters])

  const mobileFilterCount = (activeFilter !== 'all' ? 1 : 0)
    + (vaccinatedFilter ? 1 : 0)
    + (castratedFilter ? 1 : 0)
    + (sourceFilter !== 'all' ? 1 : 0)

  // Every filter dimension the UI offers lives in the count above — the desktop
  // pill row and the mobile popover drive the same four pieces of state — so this
  // is a truthful "the user narrowed something", not just a mobile concern.
  const hasActiveFilters = mobileFilterCount > 0

  const clearFilters = () => {
    setSourceFilter('all')
    onVaccinatedChange(false)
    onCastratedChange(false)
    onFilterChange('all', {})
    setShowMobileFilters(false)
  }

  const handleFilterClick = (f: (typeof FILTERS)[number]) => {
    if (f.key === 'nearby') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onFilterChange('nearby', {
            sort: 'proximity',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {
          // Fallback: request without coords
          onFilterChange('nearby', { sort: 'proximity' })
        }
      )
    } else {
      onFilterChange(f.key, f.toParams)
    }
  }

  const handleShare = async (pet: Pet) => {
    if (!pet.short_slug) return
    const url = `${window.location.origin}/p?slug=${pet.short_slug}`
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url) } catch { /* fallback */ }
    }
  }

  const sortedPets = [...pets].sort((a, b) => {
    const aIsRc = a.rescue_center ? 0 : 1
    const bIsRc = b.rescue_center ? 0 : 1
    return aIsRc - bIsRc
  })

  const sourceFiltered = sourceFilter === 'all'
    ? sortedPets
    : sourceFilter === 'rc'
      ? sortedPets.filter(p => p.rescue_center !== null && p.rescue_center !== undefined)
      : sortedPets.filter(p => !p.rescue_center)

  return (
    <div className="flex flex-col flex-1">
      {/* Filter pills — desktop: inline row */}
      <div className="hidden sm:flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterClick(f)}
            aria-pressed={activeFilter === f.key}
            className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${
              activeFilter === f.key
                ? 'bg-pop-solid border-pop-solid text-white'
                : 'bg-background border-input text-foreground hover:bg-secondary/80'
            }`}
          >
            <FontAwesomeIcon icon={f.icon} className="text-xs" />
            {t(`grid.${f.key}`)}
          </button>
        ))}
        <span aria-hidden="true" className="text-muted-foreground/30 mx-1 select-none">|</span>
        <button
          onClick={() => onVaccinatedChange(!vaccinatedFilter)}
          aria-pressed={vaccinatedFilter}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${
            vaccinatedFilter
              ? 'bg-pop-solid border-pop-solid text-white'
              : 'bg-background border-input text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faSyringe} className="text-xs" />
          {t('grid.vaccinated')}
        </button>
        <button
          onClick={() => onCastratedChange(!castratedFilter)}
          aria-pressed={castratedFilter}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${
            castratedFilter
              ? 'bg-pop-solid border-pop-solid text-white'
              : 'bg-background border-input text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faScissors} className="text-xs" />
          {t('grid.castrated')}
        </button>
        <span aria-hidden="true" className="text-muted-foreground/30 mx-1 select-none">|</span>
        <button
          onClick={() => setSourceFilter(sourceFilter === 'rc' ? 'all' : 'rc')}
          aria-pressed={sourceFilter === 'rc'}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${sourceFilter === 'rc' ? 'bg-pop-solid border-pop-solid text-white' : 'bg-background border-input text-foreground hover:bg-secondary/80'}`}
        >
          <FontAwesomeIcon icon={faHouseChimney} className="text-xs" />
          {t('grid.centers')}
        </button>
        <button
          onClick={() => setSourceFilter(sourceFilter === 'member' ? 'all' : 'member')}
          aria-pressed={sourceFilter === 'member'}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${sourceFilter === 'member' ? 'bg-pop-solid border-pop-solid text-white' : 'bg-background border-input text-foreground hover:bg-secondary/80'}`}
        >
          <FontAwesomeIcon icon={faUser} className="text-xs" />
          {t('grid.members')}
        </button>
      </div>

      {/* Filter button — mobile only */}
      <div ref={mobileFiltersRef} className="sm:hidden relative px-2 py-3 shrink-0">
        <button
          onClick={() => setShowMobileFilters(prev => !prev)}
          aria-expanded={showMobileFilters}
          className={`focus-ring relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${
            showMobileFilters || mobileFilterCount > 0
              ? 'bg-pop-solid text-white'
              : 'bg-background text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faFilter} className="text-xs" />
          {t('grid.filters')}
          {mobileFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-white text-pop-solid text-[10px] font-bold flex items-center justify-center">
              {mobileFilterCount}
            </span>
          )}
        </button>

        {showMobileFilters && (
          <div className="absolute z-20 top-full mt-1 left-2 right-2 rounded-2xl bg-card shadow-lg p-4 space-y-3">
            {/* Species */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.species')}</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.filter(f => f.key !== 'all' && f.key !== 'nearby').map(f => (
                  <button key={f.key} onClick={() => { handleFilterClick(f); }}
                    aria-pressed={activeFilter === f.key}
                    className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                      activeFilter === f.key ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                    }`}>
                    <FontAwesomeIcon icon={f.icon} className="text-xs" /> {t(`grid.${f.key}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Health */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.health')}</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => onVaccinatedChange(!vaccinatedFilter)}
                  aria-pressed={vaccinatedFilter}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    vaccinatedFilter ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faSyringe} className="text-xs" /> {t('grid.vaccinated')}
                </button>
                <button onClick={() => onCastratedChange(!castratedFilter)}
                  aria-pressed={castratedFilter}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    castratedFilter ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faScissors} className="text-xs" /> {t('grid.castrated')}
                </button>
              </div>
            </div>
            {/* Source */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.source')}</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setSourceFilter(sourceFilter === 'rc' ? 'all' : 'rc')}
                  aria-pressed={sourceFilter === 'rc'}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    sourceFilter === 'rc' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faHouseChimney} className="text-xs" /> {t('grid.centers')}
                </button>
                <button onClick={() => setSourceFilter(sourceFilter === 'member' ? 'all' : 'member')}
                  aria-pressed={sourceFilter === 'member'}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    sourceFilter === 'member' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faUser} className="text-xs" /> {t('grid.members')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4 sm:inset-shadow-2xl rounded-t-2xl sm:shadow-2xl bg-background">
        {loading && (
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
        )}

        {error && !loading && (
          <ErrorState message={t('grid.error')} onRetry={onRetry} />
        )}

        {!loading && !error && sourceFiltered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <FontAwesomeIcon icon={faPaw} className="text-4xl opacity-30" />
            <p className="text-sm">{t('grid.empty')}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('grid.clear_filters')}
              </button>
            )}
          </div>
        )}

        {!loading && !error && sourceFiltered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sourceFiltered.map((pet) => {
              const age = formatAge(pet.age)
              return (
                <div
                  key={pet.id}
                  className={`relative group rounded-2xl overflow-hidden aspect-square transition-all ${
                    pet.conditions?.length > 0
                      ? 'bg-warning-bg border-2 border-warning/50'
                      : 'bg-secondary'
                  } ${
                    selectedId === pet.id
                      ? 'outline-2 outline-offset-2 outline-pop-550'
                      : 'hover:outline-2 hover:outline-border'
                  }`}
                >
                  {/*
                    A real <button> rather than div[role=button]: it handles Space
                    natively without scrolling the page, and the menu below is a
                    SIBLING so we never nest interactive content.
                  */}
                  <button
                    type="button"
                    onClick={() => onSelect(pet)}
                    aria-label={t('card.view_details', { name: pet.name })}
                    className="focus-ring absolute inset-0 h-full w-full cursor-pointer rounded-2xl"
                  >
                    {pet.photos.length > 0 ? (
                      <Image
                        src={pet.photos[0].url}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <FontAwesomeIcon icon={faPaw} className="text-2xl text-muted-foreground/30" />
                      </span>
                    )}

                    {/* Name + meta overlay. Spans, not <p>: a button may only
                        contain phrasing content. */}
                    <span className="absolute inset-x-0 bottom-0 block bg-linear-to-t from-primary to-transparent p-2 pt-6 text-left">
                      <span className="block truncate text-sm font-semibold text-background">{pet.name}</span>
                      <span className="block truncate text-[11px] text-background/80">
                        {t(`detail.${age.unit}`, { count: age.count })}
                        {' · '}
                        {t(`gender.${pet.gender}`)}
                      </span>
                    </span>
                  </button>

                  {/* Condition badge */}
                  {pet.conditions?.length > 0 && (
                    <div className="pointer-events-none absolute top-2 left-2 z-10 max-w-[calc(100%-4rem)]">
                      <span className="inline-block rounded-full bg-warning-bg px-2 py-0.5 text-[11px] leading-tight text-warning-foreground">
                        {t('detail.specialCondition')}
                      </span>
                    </div>
                  )}

                  {/* Verified badge — slides left on hover to avoid the menu */}
                  {pet.rescue_center && (
                    <span className="pointer-events-none absolute top-2 right-2 z-10 transition-transform duration-200 ease-in-out group-hover:-translate-x-8">
                      <VerifiedBadge className="text-xl" onPhoto />
                    </span>
                  )}

                  {/* Three-dots menu — sibling of the card button */}
                  <div className="absolute top-2 right-2 z-20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        {/* hover:bg-pop-solid, not pop-550: this circle carries a white
                            glyph, and pop-550 measures 2.27:1 against it — under the 3:1
                            WCAG 1.4.11 minimum for a functional control. */}
                        <button
                          aria-label={t('card.more_actions')}
                          className="focus-ring flex h-7 w-7 items-center justify-center rounded-full bg-primary transition-colors hover:bg-pop-solid"
                        >
                          <FontAwesomeIcon icon={faEllipsis} className="text-sm text-background" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {pet.short_slug && (
                          <DropdownMenuItem onClick={() => handleShare(pet)}>
                            <FontAwesomeIcon icon={faLink} className="text-sm" />
                            {t('card.share')}
                          </DropdownMenuItem>
                        )}
                        {pet.rescue_center?.website && (
                          <DropdownMenuItem onClick={() => window.open(ensureUrl(pet.rescue_center!.website!), '_blank')}>
                            <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                            {t('card.visitWebsite', { name: pet.rescue_center.name })}
                          </DropdownMenuItem>
                        )}
                        {pet.rescue_center?.instagram && (
                          <DropdownMenuItem onClick={() => window.open(instagramUrl(pet.rescue_center!.instagram!), '_blank')}>
                            <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                            {t('card.visitInstagram', { name: pet.rescue_center.name })}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
