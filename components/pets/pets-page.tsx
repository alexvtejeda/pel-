'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { PetFilters, listPublicPets } from '@/lib/api/pets-public'
import { PetsHeader } from './pets-header'
import { PetGrid, FilterKey } from './pet-grid'
import { PetDetail } from './pet-detail'

interface PetsPageProps {
  initialSelected?: Pet | null
}

export function PetsPage({ initialSelected = null }: PetsPageProps) {
  const { t } = useTranslation('pets')
  const [pets, setPets] = useState<Pet[]>([])
  const [selected, setSelected] = useState<Pet | null>(initialSelected)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const fetchPets = useCallback(async (filters?: PetFilters) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listPublicPets(filters)
    if (err) {
      setError(err)
      setPets([])
    } else {
      const list = data || []
      setPets(list)
      if (!initialSelected && list.length > 0) {
        setSelected(list[0])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPets()
  }, [fetchPets])

  const handleFilterChange = useCallback(
    (filter: FilterKey, params: PetFilters) => {
      setActiveFilter(filter)
      setSelected(null)
      fetchPets(params)
    },
    [fetchPets]
  )

  const handleSelect = useCallback((pet: Pet) => {
    setSelected(pet)
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <PetsHeader />

      <div className="container mx-auto flex flex-1 min-h-0 px-4">
        {/* Grid — takes remaining space */}
        <div className="flex-1 min-w-0">
          <PetGrid
            pets={pets}
            loading={loading}
            error={error}
            selectedId={selected?.id ?? null}
            activeFilter={activeFilter}
            onSelect={handleSelect}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Detail panel — fixed 360px on desktop, hidden on mobile */}
        <div className="hidden md:flex w-90 mx-auto shrink-0 border-l border-border flex-col">
          {selected ? (
            <PetDetail pet={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
              <FontAwesomeIcon icon={faPaw} className="text-lg opacity-20" />
              <p className="text-sm text-center">{t('detail.select_pet')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
