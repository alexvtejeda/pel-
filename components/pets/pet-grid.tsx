'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faDog, faCat, faMars, faVenus, faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { PetFilters } from '@/lib/api/pets-public'

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
}: PetGridProps) {
  const { t } = useTranslation('pets')

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

  return (
    <div className="flex flex-col h-full">
      {/* Filter pills */}
      <div className="flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterClick(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
              activeFilter === f.key
                ? 'bg-pop-550 text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <FontAwesomeIcon icon={f.icon} className="w-3.5 h-3.5" />
            {t(`grid.${f.key}`)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <FontAwesomeIcon icon={faPaw} className="w-5 h-5 mr-2 animate-pulse" />
            {t('grid.loading')}
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-48 text-destructive">
            {t('grid.error')}
          </div>
        )}

        {!loading && !error && pets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <FontAwesomeIcon icon={faPaw} className="w-10 h-10 opacity-30" />
            <p className="text-sm">{t('grid.empty')}</p>
          </div>
        )}

        {!loading && !error && pets.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => onSelect(pet)}
                className={`relative group rounded-2xl overflow-hidden aspect-square bg-secondary transition-all ${
                  selectedId === pet.id
                    ? 'outline outline-[2.5px] outline-pop-550'
                    : 'hover:outline hover:outline-2 hover:outline-border'
                }`}
              >
                {pet.photos.length > 0 ? (
                  <Image
                    src={pet.photos[0].url}
                    alt={pet.name}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FontAwesomeIcon icon={faPaw} className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}

                {/* Name overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                  <p className="text-white text-sm font-semibold truncate">{pet.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
