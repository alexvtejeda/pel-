'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faPen, faTrash, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { MemberAddPetModal } from '@/components/pets/member-add-pet-modal'
import { UserPetCard } from '@/components/pets/user-pet-card'
import { listUserPets, deleteUserPet, UserPet } from '@/lib/api/user-pets'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function MisMascotasPage() {
  const { t } = useTranslation('pets')
  const [pets, setPets] = useState<UserPet[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<UserPet | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserPet | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await listUserPets()
    setPets(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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

  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">{t('member.my_pets')}</h1>
          {pets.length > 0 && (
            <Button onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} className="text-xs mr-1.5" />
              {t('member.add_pet')}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <FontAwesomeIcon icon={faSpinner} className="text-3xl text-muted-foreground/40 animate-spin" />
          </div>
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
                actions={
                  <>
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
