'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faPen, faTrash, faPlus, faHouseChimneyUser, faShareNodes } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { MemberAddPetModal } from '@/components/pets/member-add-pet-modal'
import { UserPetCard } from '@/components/pets/user-pet-card'
import { UserPetCardSkeleton } from '@/components/pets/user-pet-card-skeleton'
import { listUserPets, deleteUserPet, updateUserPet, UserPet } from '@/lib/api/user-pets'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

function MisMascotasContent() {
  const { t } = useTranslation('pets')
  const router = useRouter()
  const searchParams = useSearchParams()
  const addParam = searchParams?.get('add')
  const [pets, setPets] = useState<UserPet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<UserPet | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserPet | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const { data, error } = await listUserPets()
    if (error || !data) {
      // A failed fetch is not an empty account — never fall through to the
      // "add your first pet" state and tell the user their pets are gone.
      setLoadError(true)
      setPets([])
    } else {
      setPets(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // The account sheet's "Publicar mascota" links here with ?add=1 instead of
  // mounting its own modal. Consume the param as soon as it opens the modal —
  // left in the URL it would reopen on every refresh and back-navigation.
  useEffect(() => {
    if (addParam !== '1') return
    setEditingPet(null)
    setModalOpen(true)
    router.replace('/mis-mascotas', { scroll: false })
  }, [addParam, router])

  const openCreate = () => { setEditingPet(null); setModalOpen(true) }
  const openEdit = (pet: UserPet) => { setEditingPet(pet); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingPet(null) }

  const handleDelete = async () => {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    const idx = pets.findIndex((p) => p.id === target.id)
    // Optimistic removal
    setPets((prev) => prev.filter((p) => p.id !== target.id))
    const { error } = await deleteUserPet(target.id)
    if (error) {
      // Restore the card at its original position
      setPets((prev) => {
        const next = [...prev]
        next.splice(Math.max(0, idx), 0, target)
        return next
      })
      toast.error(t('member.delete_error'))
      return
    }
    toast.success(t('member.deleted'))
  }

  const handleStatusChange = async (pet: UserPet, next: 'available' | 'adopted') => {
    const previous = pet.adoption_status ?? null
    // Optimistic: the chip flips immediately and rolls back on failure, matching
    // the delete path's behaviour above. A chip that says "Adoptada" after a
    // failed PATCH would tell the member their pet is off the public grid when
    // it is still on it.
    setPets((prev) => prev.map((p) => (p.id === pet.id ? { ...p, adoption_status: next } : p)))
    const { error } = await updateUserPet(pet.id, { adoption_status: next })
    if (error) {
      setPets((prev) => prev.map((p) => (p.id === pet.id ? { ...p, adoption_status: previous } : p)))
      toast.error(t('member.status_error'))
      return
    }
    toast.success(next === 'adopted' ? t('member.marked_adopted') : t('member.published'))
  }

  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">{t('member.my_pets')}</h1>
          {/* `|| loadError`: the error branch has no add button of its own, and a
              failed GET does not imply a failed POST — don't strand the user on
              Reintentar when all they wanted was to add a pet. */}
          {(pets.length > 0 || loadError) && (
            <Button onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} className="text-xs mr-1.5" />
              {t('member.add_pet')}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <UserPetCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <ErrorState message={t('member.load_error')} onRetry={load} />
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
            <FontAwesomeIcon icon={faPaw} className="text-5xl text-muted-foreground/20" />
            <p className="text-muted-foreground max-w-sm">{t('member.my_pets_empty')}</p>
            <Button onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} className="text-xs mr-1.5" />
              {t('member.add_pet')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {pets.map((pet) => (
              <UserPetCard
                key={pet.id}
                name={pet.name}
                age={pet.age}
                ageUnit="months"
                gender={pet.gender}
                species={pet.species}
                photoUrls={(pet.photos ?? []).map((p) => p.url)}
                vaccinated={pet.vaccinated}
                castrated={pet.castrated}
                size={pet.size}
                badge={
                  pet.adoption_status === 'available' ? (
                    <span className="rounded-full bg-pop-solid px-2 py-0.5 text-[11px] font-medium text-white">
                      {t('member.status_listed')}
                    </span>
                  ) : pet.adoption_status === 'adopted' ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {t('member.status_adopted')}
                    </span>
                  ) : null
                }
                actions={
                  <>
                    {/* Labelled rather than text-labelled: these sit in a 32px
                        overlay circle, so the aria-label is what a screen
                        reader announces and what the tests query. */}
                    {pet.adoption_status === 'available' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(pet, 'adopted')}
                        aria-label={t('member.mark_adopted')}
                        title={t('member.mark_adopted')}
                        className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-foreground flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                      >
                        <FontAwesomeIcon icon={faHouseChimneyUser} className="text-xs" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(pet, 'available')}
                        aria-label={t('member.publish_listing')}
                        title={t('member.publish_listing')}
                        className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-pop-550 flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                      >
                        <FontAwesomeIcon icon={faShareNodes} className="text-xs" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(pet)}
                      aria-label={t('member.edit')}
                      className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-foreground flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                    >
                      <FontAwesomeIcon icon={faPen} className="text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(pet)}
                      aria-label={t('member.delete')}
                      className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-destructive flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </main>

      <MemberAddPetModal
        open={modalOpen}
        onClose={closeModal}
        pet={editingPet ?? undefined}
        onSaved={load}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('member.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('member.delete_body', { name: pendingDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('member.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {t('member.delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// `useSearchParams` opts the tree into client-side rendering; without a Suspense
// boundary the static export (`output: 'export'`) refuses to prerender the route.
export default function MisMascotasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <PeluLoadingLogo />
        </div>
      }
    >
      <MisMascotasContent />
    </Suspense>
  )
}
