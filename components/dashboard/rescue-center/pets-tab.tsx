'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEllipsis,
  faPhotoFilm,
  faUser,
  faCircleXmark,
  faArrowLeft,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { mockPets, mockInterestedUsers, MockPet, MockInterestedUser } from '@/lib/data/mock-rescue-center'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import Carousel from '@/components/Carousel'

function StatusTag({ pet }: { pet: MockPet }) {
  if (pet.status === 'interested') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-xl bg-pop-650 text-secondary">
        {pet.interestedCount} interesados
      </span>
    )
  }
  if (pet.status === 'adopted') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-xl bg-primary text-primary-foreground">
        Adoptado
      </span>
    )
  }
  return null
}

function UserInitials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)
  return (
    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
      {letters.toUpperCase()}
    </div>
  )
}

interface PetProfileModalProps {
  petId: string | null
  onClose: () => void
}

function PetProfileModal({ petId, onClose }: PetProfileModalProps) {
  const users = petId ? mockInterestedUsers.filter((u) => u.petId === petId) : []
  const [selectedUser, setSelectedUser] = useState<MockInterestedUser | null>(null)

  useEffect(() => {
    const u = petId ? mockInterestedUsers.filter((u) => u.petId === petId) : []
    setSelectedUser(u.length === 1 ? u[0] : null)
  }, [petId])

  return (
    <AnimatePresence>
      {petId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 z-50 flex items-center justify-center [perspective:800px] [transform-style:preserve-3d]"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="relative z-50 bg-card border rounded-2xl max-h-[90%] w-[90%] md:max-w-[40%] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 z-10 group"
              onClick={onClose}
            >
              <FontAwesomeIcon
                icon={faXmark}
                className="w-4 h-4 text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
              />
            </button>

            <div className="flex flex-col flex-1 p-8 md:p-10 overflow-y-auto">
              {selectedUser ? (
                <>
                  {users.length > 1 && (
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors w-fit"
                      onClick={() => setSelectedUser(null)}
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" />
                      Volver
                    </button>
                  )}
                  <div className="flex items-center gap-3 mb-5">
                    <UserInitials name={selectedUser.name} />
                    <span className="font-semibold text-lg">{selectedUser.name}</span>
                  </div>
                  <div className="space-y-0 text-sm">
                    <div className="flex justify-between border-b py-2.5">
                      <span className="text-muted-foreground">Formulario</span>
                      <span className="font-medium">{selectedUser.formFilled ? 'Enviado' : 'Pendiente'}</span>
                    </div>
                    <div className="flex justify-between border-b py-2.5">
                      <span className="text-muted-foreground">Transporte</span>
                      <span>{selectedUser.waitingTransport ? 'Solicitado' : 'No solicitado'}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Estado</span>
                      <span className="capitalize">{selectedUser.status}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold mb-4">Personas Interesadas</h2>
                  {users.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay personas interesadas aún.</p>
                  ) : (
                    <div className="space-y-1">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors text-left"
                          onClick={() => setSelectedUser(u)}
                        >
                          <UserInitials name={u.name} />
                          <span className="font-medium text-sm">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CardCarousel({ urls }: { urls: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth)
    }
  }, [])

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    title: '',
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  return (
    <div ref={containerRef} className="w-full h-full">
      {width > 0 && (
        <Carousel
          items={items}
          baseWidth={width}
          autoplay={urls.length > 1}
          autoplayDelay={3000}
          pauseOnHover
          loop={urls.length > 1}
          containerPadding={0}
          className="relative overflow-hidden w-full h-full"
        />
      )}
    </div>
  )
}

function PetSkeletons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-3 flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-20 rounded-xl" />
            <Skeleton className="h-5 w-16 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PetsTab() {
  const [loading, setLoading] = useState(true)
  const [pets, setPets] = useState<MockPet[]>(mockPets)
  const [profilePetId, setProfilePetId] = useState<string | null>(null)
  const [petPhotos, setPetPhotos] = useState<Record<string, string[]>>({})
  const uploadRef = useRef<HTMLInputElement>(null)
  const uploadPetIdRef = useRef<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(t)
  }, [])

  const handleUploadClick = (petId: string) => {
    uploadPetIdRef.current = petId
    uploadRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024)
    if (oversized.length > 0) {
      alert(`${oversized.length} archivo(s) superan el límite de 5 MB y no serán subidos.`)
    }
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024)
    if (valid.length > 0 && uploadPetIdRef.current) {
      const petId = uploadPetIdRef.current
      const newUrls = valid.map((f) => URL.createObjectURL(f))
      setPetPhotos((prev) => ({
        ...prev,
        [petId]: [...(prev[petId] ?? []), ...newUrls],
      }))
    }
    e.target.value = ''
  }

  if (loading) return <PetSkeletons />

  return (
    <>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pets.map((pet) => (
          <div key={pet.id} className="group rounded-2xl border bg-card overflow-hidden shadow-xs">
            <div className="relative aspect-square">
              {petPhotos[pet.id]?.length > 0 ? (
                <CardCarousel urls={petPhotos[pet.id]} />
              ) : (
                <Image
                  src={pet.imageUrl}
                  alt={pet.name}
                  fill
                  className="object-cover"
                />
              )}
              {pet.status === 'adopted' && (
                <div
                  className="absolute inset-0 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => setPets((prev) => prev.filter((p) => p.id !== pet.id))}
                >
                  <FontAwesomeIcon
                    icon={faCircleXmark}
                    className="w-10 h-10"
                    style={{ color: 'var(--color-pop-450)' }}
                  />
                </div>
              )}
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{pet.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusTag pet={pet} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl w-7 h-7">
                      <FontAwesomeIcon icon={faEllipsis} className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUploadClick(pet.id)}>
                      <FontAwesomeIcon icon={faPhotoFilm} className="w-4 h-4" /> Subir Fotos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setProfilePetId(pet.id)}>
                      <FontAwesomeIcon icon={faUser} className="w-4 h-4" /> Ver Perfil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PetProfileModal petId={profilePetId} onClose={() => setProfilePetId(null)} />
    </>
  )
}