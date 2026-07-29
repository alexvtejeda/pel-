'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pet } from '@/lib/api/pets'
import { PetFilters, listPublicPets } from '@/lib/api/pets-public'
import { PetGrid, FilterKey } from './pet-grid'
import { PetDetail } from './pet-detail'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useRouteTransition } from '@/components/transitions/route-transition-context'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
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
  const useSheet = useMediaQuery('(min-width: 640px)')
  const [open, setOpen] = useState(false)
  const [vaccinatedFilter, setVaccinatedFilter] = useState(false)
  const [castratedFilter, setCastratedFilter] = useState(false)

  const fetchPets = useCallback(async (filters?: PetFilters) => {
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

  useEffect(() => {
    fetchPets({
      ...(vaccinatedFilter ? { vaccinated: true } : {}),
      ...(castratedFilter ? { castrated: true } : {}),
    })
  }, [fetchPets, vaccinatedFilter, castratedFilter])

  const handleFilterChange = useCallback(
    (filter: FilterKey, params: PetFilters) => {
      setActiveFilter(filter)
      setSelected(null)
      fetchPets({
        ...params,
        ...(vaccinatedFilter ? { vaccinated: true } : {}),
        ...(castratedFilter ? { castrated: true } : {}),
      })
    },
    [fetchPets, vaccinatedFilter, castratedFilter]
  )

  const handleVaccinatedToggle = useCallback((v: boolean) => {
    setVaccinatedFilter(v)
  }, [])

  const handleCastratedToggle = useCallback((v: boolean) => {
    setCastratedFilter(v)
  }, [])

  const handleSelect = useCallback((pet: Pet) => {
    setSelected(pet)
    setOpen(true)
  }, [])

  const showSkeleton = loading || holdSkeleton

  return (
    <div data-route="pets" className="flex flex-col min-h-screen bg-muted">
      <div className="container mx-auto flex-1 flex flex-col sm:px-4 sm:pb-0">
        {/* A <div>, not a <header>: the public layout's PetsHeader already owns the banner landmark. */}
        <div className="px-4 pt-6 pb-2 sm:px-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('grid.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('grid.subtitle')}</p>
          {/* Kept mounted (content varies) so screen readers announce the count when it changes. */}
          <p aria-live="polite" className="mt-2 min-h-4 text-xs font-medium text-muted-foreground">
            {!showSkeleton && !error ? t('grid.count', { count: pets.length }) : ''}
          </p>
        </div>
        <PetGrid
          pets={pets}
          loading={showSkeleton}
          error={error}
          selectedId={selected?.id ?? null}
          activeFilter={activeFilter}
          onSelect={handleSelect}
          onFilterChange={handleFilterChange}
          vaccinatedFilter={vaccinatedFilter}
          castratedFilter={castratedFilter}
          onVaccinatedChange={handleVaccinatedToggle}
          onCastratedChange={handleCastratedToggle}
        />
      </div>

      {/* Desktop: Sheet from right */}
      {useSheet ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="p-0 overflow-y-auto">
            <SheetTitle className="sr-only">{selected?.name ?? ''}</SheetTitle>
            <SheetDescription className="sr-only">{selected?.description ?? ''}</SheetDescription>
            {selected && <PetDetail pet={selected} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">{selected?.name ?? ''}</DrawerTitle>
            <DrawerDescription className="sr-only">{selected?.description ?? ''}</DrawerDescription>
            <div className="overflow-y-auto">
              {selected && <PetDetail pet={selected} />}
            </div>
          </DrawerContent>
        </Drawer>
      )}
      <Footer />
    </div>
  )
}
