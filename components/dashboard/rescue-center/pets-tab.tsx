'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEllipsis,
  faPhotoFilm,
  faUser,
  faArrowUpFromBracket,
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

export interface PetsTabHandle {
  openUpload: () => void
}

interface PetEntry {
  id: string
  name: string
  description: string
  age: number
  photos: string[]
}

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

function UploadModal({
  open,
  onFiles,
  onClose,
}: {
  open: boolean
  onFiles: (files: File[]) => void
  onClose: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handle = (files: FileList | null) => {
    if (!files) return
    onFiles(Array.from(files))
    onClose()
  }

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
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-4 right-4 z-10 group" onClick={onClose}>
              <FontAwesomeIcon
                icon={faXmark}
                className="w-4 h-4 text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
              />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handle(e.target.files)}
            />
            <div
              className={`m-6 rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 py-12 ${
                dragging ? 'border-primary bg-primary/5' : 'border-input'
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                handle(e.dataTransfer.files)
              }}
            >
              <FontAwesomeIcon icon={faArrowUpFromBracket} className="w-7 h-7 text-muted-foreground" />
              <div className="text-center px-4">
                <p className="text-sm font-medium text-muted-foreground">Subir más fotos</p>
                <p className="text-xs text-muted-foreground/70 mt-1">400×400 px · máx. 5 MB</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

function NameModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')

  const handleConfirm = () => {
    if (!name.trim()) return
    onConfirm(name.trim())
    setName('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onCancel}
        >
          <div className="fixed inset-0 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-sm flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-4 right-4 z-10 group" onClick={onCancel}>
              <FontAwesomeIcon
                icon={faXmark}
                className="w-4 h-4 text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
              />
            </button>
            <div className="p-8 flex flex-col gap-4">
              <h2 className="text-lg font-semibold">¿Cómo se llama la mascota?</h2>
              <input
                autoFocus
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleConfirm} disabled={!name.trim()} className="rounded-xl">
                Guardar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DescriptionModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: (description: string, age: number) => void
  onCancel: () => void
}) {
  const [description, setDescription] = useState('')
  const [age, setAge] = useState('')

  const handleConfirm = () => {
    const parsed = parseInt(age, 10)
    if (isNaN(parsed) || parsed < 0) return
    onConfirm(description.trim(), parsed)
    setDescription('')
    setAge('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onCancel}
        >
          <div className="fixed inset-0 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-sm flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-4 right-4 z-10 group" onClick={onCancel}>
              <FontAwesomeIcon
                icon={faXmark}
                className="w-4 h-4 text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
              />
            </button>
            <div className="p-8 flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Descripción de la mascota</h2>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Edad <span className="text-destructive">*</span>
                </label>
                <input
                  autoFocus
                  type="number"
                  min={0}
                  placeholder="Ej: 2"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground/70">Años · la edad aproximada está bien</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Descripción</label>
                <textarea
                  placeholder="Describe la personalidad, raza..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <Button onClick={handleConfirm} disabled={!age.trim()} className="rounded-xl">
                Guardar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EditPetModal({
  pet,
  onSave,
  onClose,
}: {
  pet: PetEntry | null
  onSave: (id: string, updates: { name: string; description: string; age: number; photos: string[] }) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [photos, setPhotos] = useState<string[]>([])
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pet) {
      setName(pet.name)
      setDescription(pet.description)
      setAge(pet.age)
      setPhotos([...pet.photos])
    }
  }, [pet])

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(
      (f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    )
    if (files.length > 0) {
      setPhotos((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    }
    e.target.value = ''
  }

  return (
    <AnimatePresence>
      {pet && (
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
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-md flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-4 right-4 z-10 group" onClick={onClose}>
              <FontAwesomeIcon
                icon={faXmark}
                className="w-4 h-4 text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
              />
            </button>

            <div className="p-8 flex flex-col gap-5 overflow-y-auto">
              <h2 className="text-lg font-semibold">Editar mascota</h2>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Edad (años)</label>
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

              {/* Description */}
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

              {/* Photos */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Fotos</label>
                <input ref={addRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddFiles} />
                <Reorder.Group
                  axis="x"
                  values={photos}
                  onReorder={setPhotos}
                  className="flex gap-2 flex-wrap"
                >
                  {photos.map((url) => (
                    <Reorder.Item key={url} value={url} className="relative cursor-grab active:cursor-grabbing">
                      <img
                        src={url}
                        alt=""
                        draggable="false"
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                        onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
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
                onClick={() => { onSave(pet.id, { name, description, age: age as number, photos }); onClose() }}
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
  const [pets, setPets] = useState<PetEntry[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<PetEntry | null>(null)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])
  const [pendingName, setPendingName] = useState<string | null>(null)
  const uploadMoreRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLInputElement>(null)
  const uploadPetIdRef = useRef<string | null>(null)

  useImperativeHandle(ref, () => ({
    openUpload: () => setUploadModalOpen(true),
  }))

  const processNewFiles = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024)
    if (oversized.length > 0) {
      alert(`${oversized.length} archivo(s) superan el límite de 5 MB y no serán subidos.`)
    }
    if (valid.length === 0) return
    setPendingPhotos(valid.map((f) => URL.createObjectURL(f)))
  }

  const handleUploadMore = (petId: string) => {
    uploadPetIdRef.current = petId
    uploadMoreRef.current?.click()
  }

  const handleUploadMoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024)
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024)
    if (oversized.length > 0) {
      alert(`${oversized.length} archivo(s) superan el límite de 5 MB y no serán subidos.`)
    }
    if (valid.length > 0 && uploadPetIdRef.current) {
      const petId = uploadPetIdRef.current
      const newUrls = valid.map((f) => URL.createObjectURL(f))
      setPets((prev) =>
        prev.map((p) => (p.id === petId ? { ...p, photos: [...p.photos, ...newUrls] } : p))
      )
    }
    uploadPetIdRef.current = null
    e.target.value = ''
  }

  const handleNameConfirm = (name: string) => {
    setPendingName(name)
  }

  const handleNameCancel = () => {
    pendingPhotos.forEach((url) => URL.revokeObjectURL(url))
    setPendingPhotos([])
  }

  const handleDescriptionConfirm = (description: string, age: number) => {
    const newPet: PetEntry = { id: crypto.randomUUID(), name: pendingName!, description, age, photos: pendingPhotos }
    setPets((prev) => [...prev, newPet])
    setPendingPhotos([])
    setPendingName(null)
  }

  const handleEditSave = (id: string, updates: { name: string; description: string; age: number; photos: string[] }) => {
    setPets((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const handleDeletePet = (petId: string) => {
    setPets((prev) => prev.filter((p) => p.id !== petId))
  }

  const handleDescriptionCancel = () => {
    pendingPhotos.forEach((url) => URL.revokeObjectURL(url))
    setPendingPhotos([])
    setPendingName(null)
  }

  return (
    <>
      {/* Hidden input for "Subir Fotos" on existing pets */}
      <input
        ref={uploadMoreRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUploadMoreChange}
      />
      {/* Hidden input for dropzone click (new pet, skips upload modal) */}
      <input
        ref={dropzoneRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          processNewFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />

      {pets.length === 0 && (
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] -m-4">
          <div
            className="rounded-2xl border-2 border-dashed border-input transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 p-24"
            onClick={() => dropzoneRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              processNewFiles(Array.from(e.dataTransfer.files))
            }}
          >
            <FontAwesomeIcon icon={faArrowUpFromBracket} className="w-10 h-10 text-muted-foreground" />
            <div className="text-center px-4">
              <p className="text-base font-medium text-muted-foreground">Subir fotos</p>
              <p className="text-sm text-muted-foreground/70 mt-1">400×400 px · máx. 5 MB</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        {/* Pet cards */}
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
              <div className="relative aspect-square">
                <CardCarousel urls={pet.photos} />
                <button
                  type="button"
                  onClick={() => setEditingPet(pet)}
                  className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
                >
                  <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 text-gray-700" />
                </button>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{pet.name}, {pet.age} años</span>
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

      <UploadModal
        open={uploadModalOpen}
        onFiles={(files) => { processNewFiles(files) }}
        onClose={() => setUploadModalOpen(false)}
      />

      <NameModal
        open={pendingPhotos.length > 0 && pendingName === null}
        onConfirm={handleNameConfirm}
        onCancel={handleNameCancel}
      />

      <DescriptionModal
        open={pendingName !== null}
        onConfirm={handleDescriptionConfirm}
        onCancel={handleDescriptionCancel}
      />

      <EditPetModal
        pet={editingPet}
        onSave={handleEditSave}
        onClose={() => setEditingPet(null)}
      />

      <PetProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
})
