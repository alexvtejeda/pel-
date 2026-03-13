'use client'

import { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
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
  faMagnifyingGlass,
  faFilter,
  faDog,
  faCat,
  faMars,
  faVenus,
} from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
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


function CardCarousel({ urls, showPauseButton }: { urls: string[]; showPauseButton?: boolean }) {
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
          showPauseButton={showPauseButton}
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
  const { t } = useTranslation('pets')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [photos, setPhotos] = useState<EditPhoto[]>([])
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pet) {
      setName(pet.name)
      setDescription(pet.description)
      if (pet.age >= 12 && pet.age % 12 === 0 && pet.age > 0) {
        setAge(pet.age / 12)
        setAgeUnit('years')
      } else {
        setAge(pet.age)
        setAgeUnit('months')
      }
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
                <label className="text-sm font-medium">Edad</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={age}
                    onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="Ej: 2"
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button type="button" onClick={() => setAgeUnit('months')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      ageUnit === 'months' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'
                    }`}>
                    {t('dashboard.ageUnit.months')}
                  </button>
                  <button type="button" onClick={() => setAgeUnit('years')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      ageUnit === 'years' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'
                    }`}>
                    {t('dashboard.ageUnit.years')}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/70">La edad aproximada está bien</p>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Género</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setGender('male')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${gender === 'male' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    <FontAwesomeIcon icon={faMars} className="text-xs" /> Macho
                  </button>
                  <button type="button" onClick={() => setGender('female')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${gender === 'female' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    <FontAwesomeIcon icon={faVenus} className="text-xs" /> Hembra
                  </button>
                </div>
              </div>

              {/* Species */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSpecies('dog')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${species === 'dog' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    <FontAwesomeIcon icon={faDog} className="text-xs" /> Perro
                  </button>
                  <button type="button" onClick={() => setSpecies('cat')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${species === 'cat' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'border-input text-muted-foreground hover:border-border'}`}>
                    <FontAwesomeIcon icon={faCat} className="text-xs" /> Gato
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
                onClick={() => { onSave(pet.id, { name, description, age: ageUnit === 'years' ? (age as number) * 12 : (age as number), gender, species, photos }); handleClose() }}
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

// --- Filter types ---
interface Filters {
  species: Set<'dog' | 'cat'>
  gender: Set<'male' | 'female'>
  conditions: Set<'with' | 'without'>
}

const emptyFilters = (): Filters => ({
  species: new Set(),
  gender: new Set(),
  conditions: new Set(),
})

const countActiveFilters = (f: Filters) => f.species.size + f.gender.size + f.conditions.size

export const PetsTab = forwardRef<PetsTabHandle>(function PetsTab(_, ref) {
  const { t } = useTranslation('pets')
  const [pets, setPets] = useState<Pet[]>([])
  const [addPetOpen, setAddPetOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const uploadMoreRef = useRef<HTMLInputElement>(null)
  const uploadPetIdRef = useRef<string | null>(null)

  // Search + filter state
  const [search, setSearch] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  const activeFilterCount = countActiveFilters(filters)
  const filtersActive = activeFilterCount > 0

  // Autocomplete matches
  const autocompleteMatches = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return pets.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5)
  }, [search, pets])

  // Filtered pets for grid
  const filteredPets = useMemo(() => {
    return pets.filter(p => {
      // Search filter
      if (search.trim()) {
        if (!p.name.toLowerCase().includes(search.toLowerCase())) return false
      }
      // Species filter
      if (filters.species.size > 0 && !filters.species.has(p.species)) return false
      // Gender filter
      if (filters.gender.size > 0 && !filters.gender.has(p.gender)) return false
      // Conditions filter
      if (filters.conditions.size > 0) {
        const hasCond = p.conditions?.length > 0
        if (filters.conditions.has('with') && !filters.conditions.has('without') && !hasCond) return false
        if (filters.conditions.has('without') && !filters.conditions.has('with') && hasCond) return false
      }
      return true
    })
  }, [pets, search, filters])

  const toggleFilter = useCallback(<K extends keyof Filters>(category: K, value: Filters[K] extends Set<infer V> ? V : never) => {
    setFilters(prev => {
      const next = { ...prev, [category]: new Set(prev[category]) }
      const set = next[category] as Set<typeof value>
      if (set.has(value)) set.delete(value)
      else set.add(value)
      return next
    })
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false)
        setShowFilterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

      {/* Tab header — search bar + add button */}
      <div className="flex items-center gap-3 mb-6">
        <div ref={searchRef} className="relative flex-1">
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
            showFilterDropdown || filtersActive ? 'border-pop-550' : 'border-input focus-within:ring-2 focus-within:ring-ring'
          }`}>
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setShowAutocomplete(e.target.value.trim().length > 0)
                setShowFilterDropdown(false)
                setHighlightIdx(-1)
              }}
              onFocus={() => { if (search.trim()) setShowAutocomplete(true); setShowFilterDropdown(false) }}
              onKeyDown={e => {
                if (!showAutocomplete || autocompleteMatches.length === 0) return
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, autocompleteMatches.length - 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)) }
                else if (e.key === 'Enter' && highlightIdx >= 0) { e.preventDefault(); setSearch(autocompleteMatches[highlightIdx].name); setShowAutocomplete(false) }
                else if (e.key === 'Escape') setShowAutocomplete(false)
              }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => { setShowFilterDropdown(prev => !prev); setShowAutocomplete(false) }}
              className={`relative shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                showFilterDropdown || filtersActive ? 'bg-pop-550 text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FontAwesomeIcon icon={faFilter} className="text-sm" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pop-550 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Autocomplete dropdown */}
          {showAutocomplete && autocompleteMatches.length > 0 && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border bg-card shadow-lg overflow-hidden">
              {autocompleteMatches.map((pet, i) => (
                <button
                  key={pet.id}
                  type="button"
                  onMouseDown={() => { setSearch(pet.name); setShowAutocomplete(false) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    i === highlightIdx ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  {pet.name}
                </button>
              ))}
            </div>
          )}

          {/* Filter dropdown */}
          {showFilterDropdown && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border bg-card shadow-lg p-4 space-y-3">
              {/* Species */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('dashboard.filter.species')}</p>
                <div className="flex gap-1.5">
                  {(['dog', 'cat'] as const).map(v => (
                    <button key={v} type="button" onClick={() => toggleFilter('species', v)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                        filters.species.has(v) ? 'bg-pop-550/10 border-pop-550 text-pop-300' : 'border-input text-muted-foreground hover:border-border'
                      }`}>
                      <FontAwesomeIcon icon={v === 'dog' ? faDog : faCat} className="text-xs" /> {v === 'dog' ? 'Perro' : 'Gato'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Gender */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('dashboard.filter.gender')}</p>
                <div className="flex gap-1.5">
                  {(['male', 'female'] as const).map(v => (
                    <button key={v} type="button" onClick={() => toggleFilter('gender', v)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                        filters.gender.has(v) ? 'bg-pop-550/10 border-pop-550 text-pop-300' : 'border-input text-muted-foreground hover:border-border'
                      }`}>
                      <FontAwesomeIcon icon={v === 'male' ? faMars : faVenus} className="text-xs" /> {v === 'male' ? 'Macho' : 'Hembra'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Conditions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('dashboard.filter.conditions')}</p>
                <div className="flex gap-1.5">
                  {(['with', 'without'] as const).map(v => (
                    <button key={v} type="button" onClick={() => toggleFilter('conditions', v)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                        filters.conditions.has(v) ? 'bg-pop-550/10 border-pop-550 text-pop-300' : 'border-input text-muted-foreground hover:border-border'
                      }`}>
                      {v === 'with' ? t('dashboard.filter.withCondition') : t('dashboard.filter.withoutCondition')}
                    </button>
                  ))}
                </div>
              </div>
              {/* Vaccinated — disabled */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('dashboard.filter.vaccinated')}</p>
                <div className="flex gap-1.5">
                  {[t('dashboard.filter.yes'), t('dashboard.filter.no')].map(label => (
                    <span key={label} title={t('dashboard.filter.comingSoon')}
                      className="px-3 py-1 rounded-xl text-xs font-medium border border-input text-muted-foreground/40 cursor-not-allowed">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Castrated — disabled */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('dashboard.filter.castrated')}</p>
                <div className="flex gap-1.5">
                  {[t('dashboard.filter.yes'), t('dashboard.filter.no')].map(label => (
                    <span key={label} title={t('dashboard.filter.comingSoon')}
                      className="px-3 py-1 rounded-xl text-xs font-medium border border-input text-muted-foreground/40 cursor-not-allowed">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <Button onClick={() => setAddPetOpen(true)} className="rounded-xl gap-2 shrink-0">
          <FontAwesomeIcon icon={faPlus} className="text-sm" />
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
          {filteredPets.map((pet) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl overflow-hidden shadow-xs ${
                pet.conditions?.length > 0
                  ? 'bg-amber-50 border-2 border-amber-400'
                  : 'border bg-card'
              }`}
            >
              <div className="relative aspect-square bg-muted/30">
                {pet.photos.length > 0 ? (
                  <>
                    <CardCarousel urls={pet.photos.map((p) => p.url)} showPauseButton />
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
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {pet.age != null && <span>{pet.age >= 12 ? `${Math.floor(pet.age / 12)} año${Math.floor(pet.age / 12) !== 1 ? 's' : ''}` : `${pet.age} meses`}</span>}
                    {pet.age != null && <span>·</span>}
                    <FontAwesomeIcon icon={pet.gender === 'male' ? faMars : faVenus} className="text-xs" />
                    <span>·</span>
                    <FontAwesomeIcon icon={pet.species === 'dog' ? faDog : faCat} className="text-xs" />
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
