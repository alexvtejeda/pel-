'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faDog, faCat, faMars, faVenus, faLocationDot, faEllipsis, faLink, faGlobe, faSyringe, faScissors, faCertificate, faCheck, faHouseChimney, faUser, faFilter } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { Pet } from '@/lib/api/pets'
import { instagramUrl, ensureUrl } from '@/lib/utils'
import { PetFilters } from '@/lib/api/pets-public'
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
}: PetGridProps) {
  const { t } = useTranslation('pets')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'rc' | 'member'>('all')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const mobileFilterCount = (activeFilter !== 'all' ? 1 : 0)
    + (vaccinatedFilter ? 1 : 0)
    + (castratedFilter ? 1 : 0)
    + (sourceFilter !== 'all' ? 1 : 0)

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
            className={`shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
              activeFilter === f.key
                ? 'bg-pop-550 text-white'
                : 'bg-background text-foreground hover:bg-secondary/80'
            }`}
          >
            <FontAwesomeIcon icon={f.icon} className="text-xs" />
            {t(`grid.${f.key}`)}
          </button>
        ))}
        <span className="text-muted-foreground/30 mx-1 select-none">|</span>
        <button
          onClick={() => onVaccinatedChange(!vaccinatedFilter)}
          className={`shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
            vaccinatedFilter
              ? 'bg-pop-550 text-white'
              : 'bg-background text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faSyringe} className="text-xs" />
          {t('grid.vaccinated')}
        </button>
        <button
          onClick={() => onCastratedChange(!castratedFilter)}
          className={`shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
            castratedFilter
              ? 'bg-pop-550 text-white'
              : 'bg-background text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faScissors} className="text-xs" />
          {t('grid.castrated')}
        </button>
        <span className="text-muted-foreground/30 mx-1 select-none">|</span>
        <button
          onClick={() => setSourceFilter(sourceFilter === 'rc' ? 'all' : 'rc')}
          className={`shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${sourceFilter === 'rc' ? 'bg-pop-550 text-white' : 'bg-background text-foreground hover:bg-secondary/80'}`}
        >
          <FontAwesomeIcon icon={faHouseChimney} className="text-xs" />
          {t('grid.centers')}
        </button>
        <button
          onClick={() => setSourceFilter(sourceFilter === 'member' ? 'all' : 'member')}
          className={`shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${sourceFilter === 'member' ? 'bg-pop-550 text-white' : 'bg-background text-foreground hover:bg-secondary/80'}`}
        >
          <FontAwesomeIcon icon={faUser} className="text-xs" />
          {t('grid.members')}
        </button>
      </div>

      {/* Filter button — mobile only */}
      <div className="sm:hidden relative px-2 py-3 shrink-0">
        <button
          onClick={() => setShowMobileFilters(prev => !prev)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${
            showMobileFilters || mobileFilterCount > 0
              ? 'bg-pop-550 text-white'
              : 'bg-background text-foreground hover:bg-secondary/80'
          }`}
        >
          <FontAwesomeIcon icon={faFilter} className="text-xs" />
          {t('grid.filters')}
          {mobileFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-white text-pop-550 text-[10px] font-bold flex items-center justify-center">
              {mobileFilterCount}
            </span>
          )}
        </button>

        {showMobileFilters && (
          <div className="absolute z-20 top-full mt-1 left-2 right-2 rounded-xl border bg-card shadow-lg p-4 space-y-3">
            {/* Species */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('grid.species')}</p>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.filter(f => f.key !== 'all' && f.key !== 'nearby').map(f => (
                  <button key={f.key} onClick={() => { handleFilterClick(f); }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
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
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    vaccinatedFilter ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faSyringe} className="text-xs" /> {t('grid.vaccinated')}
                </button>
                <button onClick={() => onCastratedChange(!castratedFilter)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
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
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    sourceFilter === 'rc' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  <FontAwesomeIcon icon={faHouseChimney} className="text-xs" /> {t('grid.centers')}
                </button>
                <button onClick={() => setSourceFilter(sourceFilter === 'member' ? 'all' : 'member')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
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
      <div className="flex-1 overflow-y-auto p-4 inset-shadow-2xl rounded-t-2xl shadow-2xl bg-background min-h-screen">
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-secondary animate-pulse">
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
          <div className="flex items-center justify-center h-48 text-destructive">
            {t('grid.error')}
          </div>
        )}

        {!loading && !error && sourceFiltered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <FontAwesomeIcon icon={faPaw} className="text-4xl opacity-30" />
            <p className="text-sm">{t('grid.empty')}</p>
          </div>
        )}

        {!loading && !error && sourceFiltered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sourceFiltered.map((pet) => (
              <div
                key={pet.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(pet)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(pet) }}
                className={`relative group rounded-xl overflow-hidden aspect-square cursor-pointer transition-all ${
                  pet.conditions?.length > 0
                    ? 'bg-amber-50 border-2 border-amber-400'
                    : 'bg-secondary'
                } ${
                  selectedId === pet.id
                    ? 'outline outline-pop-550'
                    : 'hover:outline-2 hover:outline-border'
                }`}
              >
                {pet.photos.length > 0 ? (
                  <Image
                    src={pet.photos[0].url}
                    alt={pet.name}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FontAwesomeIcon icon={faPaw} className="text-xs text-muted-foreground/30" />
                  </div>
                )}

                {/* Condition badge */}
                {pet.conditions?.length > 0 && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {t('detail.specialCondition')}
                    </span>
                  </div>
                )}

                {/* Verified badge — slides left on hover to avoid three-dots overlap */}
                {pet.rescue_center && (
                  <span className="absolute top-2 right-2 z-10 text-xl transition-transform duration-200 ease-in-out group-hover:-translate-x-8" style={{ filter: 'drop-shadow(0 2px 4px var(--foreground))' }}>
                    <FontAwesomeIcon icon={faCertificate} className="text-pop-550" />
                    <FontAwesomeIcon icon={faCheck} className="text-background text-xs absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </span>
                )}

                {/* Three-dots dropdown */}
                <div
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:bg-pop-550 transition-colors">
                        <FontAwesomeIcon icon={faEllipsis} className="text-background text-sm" />
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

                {/* Name overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-primary to-transparent p-2 pt-6">
                  <p className="text-background text-sm font-semibold truncate">{pet.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
