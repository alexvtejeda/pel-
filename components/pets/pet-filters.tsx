'use client'

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaw,
  faDog,
  faCat,
  faMars,
  faVenus,
  faLocationDot,
  faSyringe,
  faScissors,
  faHouseChimney,
  faUser,
  faFilter,
} from '@fortawesome/free-solid-svg-icons'
// Aliased: `PetFilters` is the query-params type, and this file also exports a
// filter *component*. Naming them the same would make the import in
// `pets-page.tsx`, which needs both, unresolvable.
import { PetFilters as PetFilterParams } from '@/lib/api/pets-public'

export type FilterKey = 'all' | 'dogs' | 'cats' | 'males' | 'females' | 'nearby'
export type SourceFilter = 'all' | 'rc' | 'member'

const FILTERS: { key: FilterKey; icon: typeof faPaw; toParams: PetFilterParams }[] = [
  { key: 'all', icon: faPaw, toParams: {} },
  { key: 'dogs', icon: faDog, toParams: { species: 'dog' } },
  { key: 'cats', icon: faCat, toParams: { species: 'cat' } },
  { key: 'males', icon: faMars, toParams: { gender: 'male' } },
  { key: 'females', icon: faVenus, toParams: { gender: 'female' } },
  { key: 'nearby', icon: faLocationDot, toParams: { sort: 'proximity' } },
]

export interface PetFilterState {
  activeFilter: FilterKey
  vaccinatedFilter: boolean
  castratedFilter: boolean
  sourceFilter: SourceFilter
}

/**
 * Counts the dimensions the user has narrowed. Exported because the empty
 * state's "clear filters" escape hatch lives in the grid and the feed, which
 * need the same answer without duplicating the arithmetic.
 */
export function countActiveFilters(f: PetFilterState): number {
  return (
    (f.activeFilter !== 'all' ? 1 : 0) +
    (f.vaccinatedFilter ? 1 : 0) +
    (f.castratedFilter ? 1 : 0) +
    (f.sourceFilter !== 'all' ? 1 : 0)
  )
}

interface PetFilterBarProps {
  activeFilter: FilterKey
  onFilterChange: (filter: FilterKey, params: PetFilterParams) => void
  vaccinatedFilter: boolean
  onVaccinatedChange: (v: boolean) => void
  castratedFilter: boolean
  onCastratedChange: (v: boolean) => void
  sourceFilter: SourceFilter
  onSourceChange: (s: SourceFilter) => void
  /**
   * Controlled, not local: the empty state's "Limpiar filtros" button lives in
   * a sibling component and has to be able to close this popover.
   */
  mobileFiltersOpen: boolean
  onMobileFiltersOpenChange: (open: boolean) => void
}

export function PetFilterBar({
  activeFilter,
  onFilterChange,
  vaccinatedFilter,
  onVaccinatedChange,
  castratedFilter,
  onCastratedChange,
  sourceFilter,
  onSourceChange,
  mobileFiltersOpen,
  onMobileFiltersOpenChange,
}: PetFilterBarProps) {
  const { t } = useTranslation('pets')
  const mobileFiltersRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // The mobile filter popover is hand-rolled (not Radix), so it needs its own
  // dismiss behaviour. The ref wraps the trigger *and* the popover, so a
  // pointerdown on the trigger is "inside" and the button's own click still
  // toggles normally.
  useEffect(() => {
    if (!mobileFiltersOpen) return

    const onPointerDown = (e: PointerEvent) => {
      if (!mobileFiltersRef.current?.contains(e.target as Node)) onMobileFiltersOpenChange(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onMobileFiltersOpenChange(false)
        // Escape only — an outside pointerdown means the user just clicked
        // something else, and stealing focus back to the trigger would yank
        // it away from whatever they meant to interact with.
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileFiltersOpen, onMobileFiltersOpenChange])

  const mobileFilterCount = countActiveFilters({
    activeFilter,
    vaccinatedFilter,
    castratedFilter,
    sourceFilter,
  })

  const handleFilterClick = (f: (typeof FILTERS)[number]) => {
    if (f.key === 'nearby') {
      if (!navigator.geolocation) {
        onFilterChange('nearby', f.toParams)
        return
      }
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

  return (
    <>
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
          onClick={() => onSourceChange(sourceFilter === 'rc' ? 'all' : 'rc')}
          aria-pressed={sourceFilter === 'rc'}
          className={`focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors border ${sourceFilter === 'rc' ? 'bg-pop-solid border-pop-solid text-white' : 'bg-background border-input text-foreground hover:bg-secondary/80'}`}
        >
          <FontAwesomeIcon icon={faHouseChimney} className="text-xs" />
          {t('grid.centers')}
        </button>
        <button
          onClick={() => onSourceChange(sourceFilter === 'member' ? 'all' : 'member')}
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
          ref={triggerRef}
          onClick={() => onMobileFiltersOpenChange(!mobileFiltersOpen)}
          aria-expanded={mobileFiltersOpen}
          aria-haspopup="dialog"
          aria-controls="pet-filters-popover"
          className={`focus-ring relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${
            mobileFiltersOpen || mobileFilterCount > 0
              ? 'bg-pop-solid text-white'
              : 'bg-background text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faFilter} className="text-xs" />
          {t('grid.filters')}{' '}
          {mobileFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-white text-pop-solid text-[10px] font-bold flex items-center justify-center">
              {mobileFilterCount}
            </span>
          )}
        </button>

        {mobileFiltersOpen && (
          <div
            id="pet-filters-popover"
            role="group"
            aria-label={t('grid.filters')}
            className="absolute z-20 top-full mt-1 left-2 right-2 rounded-2xl bg-card shadow-lg p-4 space-y-3"
          >
            {/* Species */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.species')}</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.filter(f => f.key !== 'all' && f.key !== 'nearby').map(f => (
                  <button key={f.key} onClick={() => handleFilterClick(f)}
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
                <button onClick={() => onSourceChange(sourceFilter === 'rc' ? 'all' : 'rc')}
                  aria-pressed={sourceFilter === 'rc'}
                  className={`focus-ring px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    sourceFilter === 'rc' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faHouseChimney} className="text-xs" /> {t('grid.centers')}
                </button>
                <button onClick={() => onSourceChange(sourceFilter === 'member' ? 'all' : 'member')}
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
    </>
  )
}
