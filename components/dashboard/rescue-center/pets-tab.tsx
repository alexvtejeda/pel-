'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaw,
  faEllipsis,
  faPhotoFilm,
  faUser,
  faXmark,
  faPenToSquare,
  faTrash,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import Carousel from '@/components/Carousel'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'
import {
  listPets,
  createPet,
  updatePet,
  deletePet,
  uploadPhotos,
  deletePhoto,
  reorderPhotos,
  type Pet,
  type Photo,
} from '@/lib/api/pets'
import { AddPetModal, type AddPetFormData } from './add-pet-modal'

export interface PetsTabHandle {
  openUpload: () => void
}

// A photo in the edit modal — either an existing API photo (has id) or a new local file
type EditPhoto = { id?: string; url: string; file?: File }


function CardCarousel({ urls }: { urls: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    title: '',
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  useEffect(() => {
    if (containerRef.current) setWidth(containerRef.current.offsetWidth)
  }, [])

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
          dotsOverlay
          className="relative overflow-hidden w-full h-full"
        />
      )}
    </div>
  )
}


function PetProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-[40%] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-4 right-4 z-10 group" onClick={onClose}>
              <FontAwesomeIcon
                icon={faXmark}
                className="w-4 h-4 text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
              />
            </button>
            <div className="p-8 md:p-10">
              <h2 className="text-lg font-semibold mb-4">Personas Interesadas</h2>
              <p className="text-muted-foreground text-sm">No hay personas interesadas aún.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


function EditPetModal({
  pet,
  initialPhotos,
  onSave,
  onClose,
}: {
  pet: Pet | null
  initialPhotos: EditPhoto[]
  onSave: (id: string, updates: {
    name: string
    description: string
    age: number
    gender: 'male' | 'female'
    species: 'dog' | 'cat'
    photos: EditPhoto[]
  }) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [photos, setPhotos] = useState<EditPhoto[]>([])
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pet) {
      setName(pet.name)
      setDescription(pet.description)
      setAge(pet.age)
      setGender(pet.gender ?? 'male')
      setSpecies(pet.species ?? 'dog')
      setPhotos(initialPhotos)
    }
  }, [pet, initialPhotos])

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(
      (f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    )
    if (files.length > 0) {
      setPhotos((prev) => [...prev, ...files.map((f) => ({ url: URL.createObjectURL(f), file: f }))])
    }
    e.target.value = ''
  }

  const handleRemovePhoto = (url: string, hasFile: boolean) => {
    if (hasFile) URL.revokeObjectURL(url)
    setPhotos((prev) => prev.filter((p) => p.url !== url))
  }

  const handleClose = () => {
    photos.forEach((p) => { if (p.file) URL.revokeObjectURL(p.url) })
    onClose()
  }

  return (
    <AnimatePresence>
      {pet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleClose}
        >
          <div className="fixed inset-0 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-md flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-4 right-4 z-10 group" onClick={handleClose}>
              <FontAwesomeIcon
                icon={faXmark}
                className="w-4 h-4 text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
              />
            </button>

            <div className="p-8 flex flex-col gap-5 overflow-y-auto">
              <h2 className="text-lg font-semibold">Editar mascota</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Edad (meses)</label>
                <input
                  type="number"
                  min={0}
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="Ej: 2"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground/70">La edad aproximada está bien</p>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Género</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setGender('male')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${gender === 'male' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    ♂ Macho
                  </button>
                  <button type="button" onClick={() => setGender('female')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${gender === 'female' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    ♀ Hembra
                  </button>
                </div>
              </div>

              {/* Species */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSpecies('dog')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${species === 'dog' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    🐕 Perro
                  </button>
                  <button type="button" onClick={() => setSpecies('cat')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${species === 'cat' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    🐈 Gato
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe la personalidad, raza..."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Fotos</label>
                <input ref={addRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddFiles} />
                <Reorder.Group
                  axis="x"
                  values={photos}
                  onReorder={setPhotos}
                  className="flex gap-2 flex-wrap"
                >
                  {photos.map((photo) => (
                    <Reorder.Item key={photo.url} value={photo} className="relative cursor-grab active:cursor-grabbing">
                      <img
                        src={photo.url}
                        alt=""
                        draggable="false"
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                        onClick={() => handleRemovePhoto(photo.url, !!photo.file)}
                      >
                        <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5 text-white" />
                      </button>
                    </Reorder.Item>
                  ))}
                  <button
                    type="button"
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-input flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    onClick={() => addRef.current?.click()}
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                  </button>
                </Reorder.Group>
                <p className="text-xs text-muted-foreground/70">Arrastra para reordenar · máx. 5 MB por imagen</p>
              </div>

              <Button
                onClick={() => { onSave(pet.id, { name, description, age: age as number, gender, species, photos }); handleClose() }}
                disabled={!name.trim() || age === ''}
                className="rounded-xl"
              >
                Guardar cambios
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const PetsTab = forwardRef<PetsTabHandle>(function PetsTab(_, ref) {
  const [pets, setPets] = useState<Pet[]>([])
  const [addPetOpen, setAddPetOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const uploadMoreRef = useRef<HTMLInputElement>(null)
  const uploadPetIdRef = useRef<string | null>(null)

  useImperativeHandle(ref, () => ({
    openUpload: () => setAddPetOpen(true),
  }))

  useEffect(() => {
    async function load() {
      const { data: rc } = await getMyRescueCenter()
      if (!rc) return
      const data = await listPets(rc.id)
      setPets(data)
    }
    load()
  }, [])

  const handleAddPetConfirm = async (data: AddPetFormData) => {
    try {
      const pet = await createPet({
        name: data.name,
        description: data.description,
        age: data.age,
        gender: data.gender,
        species: data.species,
        conditions: data.conditions.length > 0 ? data.conditions : undefined,
        condition_notes: data.condition_notes?.trim() || undefined,
      })
      if (data.photos.length > 0) {
        try {
          const photos = await uploadPhotos(pet.id, data.photos)
          pet.photos = photos
        } catch {
          // Photo upload failed — pet was created; show it without photos
        }
      }
      setPets((prev) => [...prev, pet])
      setAddPetOpen(false)
    } catch (err) {
      console.error('Error creating pet:', err)
    }
  }

  const handleUploadMore = (petId: string) => {
    uploadPetIdRef.current = petId
    uploadMoreRef.current?.click()
  }

  const handleUploadMoreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024)
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024)
    if (oversized.length > 0) {
      alert(`${oversized.length} archivo(s) superan el límite de 5 MB y no serán subidos.`)
    }
    if (valid.length > 0 && uploadPetIdRef.current) {
      const petId = uploadPetIdRef.current
      try {
        const photos = await uploadPhotos(petId, valid)
        setPets((prev) =>
          prev.map((p) => (p.id === petId ? { ...p, photos: [...p.photos, ...photos] } : p))
        )
      } catch (err) {
        console.error('Error uploading photos:', err)
      }
    }
    uploadPetIdRef.current = null
    e.target.value = ''
  }

  const handleEditSave = async (
    id: string,
    updates: { name: string; description: string; age: number; gender: 'male' | 'female'; species: 'dog' | 'cat'; photos: EditPhoto[] }
  ) => {
    try {
      // 1. Update metadata
      const updated = await updatePet(id, { name: updates.name, description: updates.description, age: updates.age, gender: updates.gender, species: updates.species })

      // 2. Delete removed existing photos
      const original = pets.find((p) => p.id === id)?.photos ?? []
      const keptIds = new Set(updates.photos.filter((p) => p.id).map((p) => p.id!))
      const toDelete = original.filter((p) => !keptIds.has(p.id))
      await Promise.all(toDelete.map((p) => deletePhoto(id, p.id)))

      // 3. Upload new photos
      const newFiles = updates.photos.filter((p) => p.file).map((p) => p.file!)
      let newPhotos: Photo[] = []
      if (newFiles.length > 0) {
        newPhotos = await uploadPhotos(id, newFiles)
      }

      // 4. Build final photo list in display order
      let newIdx = 0
      const finalPhotos: Photo[] = updates.photos.map((ep) => {
        if (ep.id) return original.find((p) => p.id === ep.id)!
        return newPhotos[newIdx++]
      })

      // 5. Persist order if it changed
      if (finalPhotos.length > 1) {
        await reorderPhotos(id, finalPhotos.map((p) => p.id))
      }

      setPets((prev) => prev.map((p) => (p.id === id ? { ...updated, photos: finalPhotos } : p)))
    } catch (err) {
      console.error('Error saving pet:', err)
    }
  }

  const handleDeletePet = async (petId: string) => {
    await deletePet(petId)
    setPets((prev) => prev.filter((p) => p.id !== petId))
  }

  return (
    <>
      <input
        ref={uploadMoreRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUploadMoreChange}
      />

      {/* Tab header — always visible */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold">Mascotas</h2>
        <Button onClick={() => setAddPetOpen(true)} className="rounded-xl gap-2">
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
          Agregar mascota
        </Button>
      </div>

      {/* Empty state — only when no pets */}
      {pets.length === 0 && (
        <div className="flex items-center justify-center min-h-[320px]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <FontAwesomeIcon icon={faPaw} className="w-10 h-10 opacity-20" />
            <p className="text-sm">Aún no hay mascotas. ¡Agrega la primera!</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence>
          {pets.map((pet) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border bg-card overflow-hidden shadow-xs"
            >
              <div className="relative aspect-square bg-muted/30">
                {pet.photos.length > 0 ? (
                  <>
                    <CardCarousel urls={pet.photos.map((p) => p.url)} />
                    <button
                      type="button"
                      onClick={() => setEditingPet(pet)}
                      className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingPet(pet)}
                    className="absolute inset-0 flex items-center justify-center hover:bg-muted/20 transition-colors group"
                  >
                    <FontAwesomeIcon icon={faPaw} className="w-12 h-12 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                  </button>
                )}
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">{pet.name}</span>
                    {pet.conditions?.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                        Condición especial
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {[
                      pet.age != null && `${pet.age} meses`,
                      pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : null,
                      pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl w-7 h-7">
                      <FontAwesomeIcon icon={faEllipsis} className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUploadMore(pet.id)}>
                      <FontAwesomeIcon icon={faPhotoFilm} className="w-4 h-4" /> Subir Fotos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                      <FontAwesomeIcon icon={faUser} className="w-4 h-4" /> Ver Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeletePet(pet.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-4 h-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AddPetModal
        open={addPetOpen}
        onConfirm={handleAddPetConfirm}
        onClose={() => setAddPetOpen(false)}
      />

      <EditPetModal
        pet={editingPet}
        initialPhotos={editingPet?.photos.filter((p) => p.url).map((p) => ({ id: p.id, url: p.url })) ?? []}
        onSave={handleEditSave}
        onClose={() => setEditingPet(null)}
      />

      <PetProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
})
