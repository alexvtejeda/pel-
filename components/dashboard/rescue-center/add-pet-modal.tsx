'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faCloudArrowUp,
  faPlus,
  faPaw,
  faDog,
  faCat,
  faMars,
  faVenus,
  faSyringe,
  faScissors,
  faRulerVertical,
} from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import Carousel from '@/components/Carousel'

export interface AddPetFormData {
  name: string
  description: string
  age: number
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
  photos: File[]
  conditions: string[]
  condition_notes: string
  vaccinated: boolean
  castrated: boolean
  size: 'small' | 'medium' | 'large'
}

const CONDITION_GROUPS = [
  { label: 'Movilidad',    items: [{ label: 'Miembro(s) faltante(s)', key: 'mobility_missing_limb' }] },
  { label: 'Sensorial',    items: [{ label: 'Ciego/a', key: 'sensory_blind' }, { label: 'Sordo/a', key: 'sensory_deaf' }] },
  { label: 'Médico',       items: [{ label: 'Enfermedad crónica', key: 'medical_chronic' }, { label: 'FIV/FeLV positivo (gatos)', key: 'medical_fiv_felv' }] },
  { label: 'Conductual',   items: [{ label: 'Agresividad', key: 'behavioral_aggressive' }, { label: 'Trauma', key: 'behavioral_trauma' }, { label: 'Ansiedad / separación', key: 'behavioral_anxiety' }] },
  { label: 'Alimenticio',  items: [{ label: 'Manejo dietético / peso', key: 'dietary_weight' }] },
]

interface PendingPhoto {
  url: string
  file: File
}

function PreviewCarousel({ urls }: { urls: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    title: '',
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  return (
    <div ref={(el) => { if (el && width === 0) setWidth(el.offsetWidth) }} className="w-full h-full">
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

function PreviewCard({
  name, age, ageUnit, gender, species, photos, hasConditions, vaccinated, castrated, size,
}: {
  name: string; age: string; ageUnit: 'months' | 'years'; gender: 'male' | 'female'; species: 'dog' | 'cat'
  photos: PendingPhoto[]; hasConditions: boolean; vaccinated: boolean; castrated: boolean; size: string
}) {
  const urls = photos.map(p => p.url)
  return (
    <div className={`rounded-2xl overflow-hidden shadow-xs ${
      hasConditions ? 'bg-amber-50 border-2 border-amber-400' : 'border bg-card'
    }`}>
      <div className="relative aspect-square bg-muted/30">
        {urls.length > 0 ? (
          <PreviewCarousel urls={urls} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faPaw} className="text-5xl text-muted-foreground/20" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{name.trim() || 'Nombre'}</span>
          {hasConditions && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
              Condición especial
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {age && <span>{age} {ageUnit === 'years' ? 'años' : 'meses'}</span>}
          {age && <span>·</span>}
          <FontAwesomeIcon icon={gender === 'male' ? faMars : faVenus} className="text-xs" />
          <span>·</span>
          <FontAwesomeIcon icon={species === 'dog' ? faDog : faCat} className="text-xs" />
        </span>
        <div className="flex items-center gap-2 mt-1">
          <FontAwesomeIcon icon={faSyringe} className={`text-xs ${vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
          <FontAwesomeIcon icon={faScissors} className={`text-xs ${castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
          <FontAwesomeIcon icon={faRulerVertical} className="text-xs text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}</span>
        </div>
      </div>
    </div>
  )
}

interface AddPetModalProps {
  open: boolean
  onConfirm: (data: AddPetFormData) => void
  onClose: () => void
}

export function AddPetModal({ open, onConfirm, onClose }: AddPetModalProps) {
  const { t } = useTranslation('pets')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [hasConditions, setHasConditions] = useState(false)
  const [conditions, setConditions] = useState<string[]>([])
  const [conditionNotes, setConditionNotes] = useState('')
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months')
  const [vaccinated, setVaccinated] = useState(false)
  const [castrated, setCastrated] = useState(false)
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [dragging, setDragging] = useState(false)
  const [mobilePreview, setMobilePreview] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleCondition = (key: string) =>
    setConditions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const MAX_PHOTOS = 5
  const parsedAge = parseInt(age, 10)
  const canSave = name.trim() !== '' && !isNaN(parsedAge) && parsedAge >= 0

  const addFiles = (files: FileList | File[]) => {
    const candidates = Array.from(files)
      .filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
    if (candidates.length === 0) return
    setPhotos((prev) => {
      const remaining = MAX_PHOTOS - prev.length
      if (remaining <= 0) return prev
      return [...prev, ...candidates.slice(0, remaining).map((f) => ({ url: URL.createObjectURL(f), file: f }))]
    })
  }

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url)
    setPhotos((prev) => prev.filter((p) => p.url !== url))
  }

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    setName('')
    setDescription('')
    setAge('')
    setAgeUnit('months')
    setGender('male')
    setSpecies('dog')
    setPhotos([])
    setHasConditions(false)
    setConditions([])
    setConditionNotes('')
    setVaccinated(false)
    setCastrated(false)
    setSize('medium')
    setMobilePreview(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleConfirm = () => {
    if (!canSave) return
    onConfirm({
      name: name.trim(),
      description: description.trim(),
      age: ageUnit === 'years' ? parseInt(age, 10) * 12 : parseInt(age, 10),
      gender,
      species,
      photos: photos.map((p) => p.file),
      conditions: hasConditions ? conditions : [],
      condition_notes: hasConditions ? conditionNotes.trim() : '',
      vaccinated,
      castrated,
      size,
    })
    reset()
  }

  return (
    <AnimatePresence>
      {open && (
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
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-3xl flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-base font-semibold">Agregar mascota</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Completa los datos antes de subir fotos</p>
                </div>
                {/* Mobile toggle */}
                <button
                  type="button"
                  onClick={() => setMobilePreview(prev => !prev)}
                  className="md:hidden text-xs font-medium text-pop-300 hover:text-pop-550 transition-colors"
                >
                  {mobilePreview ? t('dashboard.edit') : t('dashboard.preview')}
                </button>
              </div>
              <button type="button" className="group mt-0.5" onClick={handleClose}>
                <FontAwesomeIcon
                  icon={faXmark}
                  className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
                />
              </button>
            </div>

            {/* Body — two-panel on desktop */}
            <div className="flex gap-6 p-6 overflow-y-auto">
            {/* Left panel: form (hidden on mobile when preview is active) */}
            <div className={`flex flex-col gap-4 flex-1 min-w-0 ${mobilePreview ? 'hidden md:flex' : 'flex'}`}>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nombre</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="ej. Luna"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Edad</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="ej. 6"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button type="button" onClick={() => setAgeUnit('months')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      ageUnit === 'months' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                    }`}>
                    {t('dashboard.ageUnit.months')}
                  </button>
                  <button type="button" onClick={() => setAgeUnit('years')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      ageUnit === 'years' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                    }`}>
                    {t('dashboard.ageUnit.years')}
                  </button>
                </div>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Género</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        gender === 'male'
                          ? 'bg-pop-550/10 border-pop-550 text-foreground'
                          : 'border-input text-muted-foreground hover:border-border'
                      }`}
                    >
                      <FontAwesomeIcon icon={faMars} className="text-xs" /> Macho
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        gender === 'female'
                          ? 'bg-pop-550/10 border-pop-550 text-foreground'
                          : 'border-input text-muted-foreground hover:border-border'
                      }`}
                    >
                      <FontAwesomeIcon icon={faVenus} className="text-xs" /> Hembra
                    </button>
                  </div>
              </div>

              {/* Species */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSpecies('dog')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      species === 'dog'
                        ? 'bg-pop-550/10 border-pop-550 text-foreground'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    <FontAwesomeIcon icon={faDog} className="text-xs" /> Perro
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecies('cat')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      species === 'cat'
                        ? 'bg-pop-550/10 border-pop-550 text-foreground'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCat} className="text-xs" /> Gato
                  </button>
                </div>
              </div>

              {/* Vaccinated / Castrated */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaccinated}
                    onChange={(e) => setVaccinated(e.target.checked)}
                    className="w-4 h-4 rounded accent-pop-550"
                  />
                  <FontAwesomeIcon icon={faSyringe} className="text-sm text-muted-foreground" />
                  <span className="text-sm text-foreground">Vacunado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={castrated}
                    onChange={(e) => setCastrated(e.target.checked)}
                    className="w-4 h-4 rounded accent-pop-550"
                  />
                  <FontAwesomeIcon icon={faScissors} className="text-sm text-muted-foreground" />
                  <span className="text-sm text-foreground">Castrado</span>
                </label>
              </div>

              {/* Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tamaño</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as 'small' | 'medium' | 'large')}
                  className="w-full rounded-xl border border-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
                >
                  <option value="small">{t('size.small')}</option>
                  <option value="medium">{t('size.medium')}</option>
                  <option value="large">{t('size.large')}</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Descripción</label>
                <textarea
                  placeholder="ej. Muy juguetona, buena con niños…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Conditions toggle */}
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={hasConditions}
                  onChange={e => {
                    setHasConditions(e.target.checked)
                    if (!e.target.checked) { setConditions([]); setConditionNotes('') }
                  }}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm">Este animal tiene condiciones especiales</span>
              </label>

              {/* Expanded conditions panel */}
              {hasConditions && (
                <div className="ml-7 space-y-4 mt-2">
                  {CONDITION_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group.label}</p>
                      <div className="space-y-1.5">
                        {group.items.map(item => (
                          <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={conditions.includes(item.key)}
                              onChange={() => toggleCondition(item.key)}
                              className="w-4 h-4 rounded accent-primary"
                            />
                            <span className="text-sm">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                      Notas adicionales (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={conditionNotes}
                      onChange={e => setConditionNotes(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Drag-and-drop photo zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fotos</label>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files ?? []); e.target.value = '' }}
                />
                <div
                  className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-8 ${
                    dragging ? 'border-pop-550/50 bg-pop-550/5' : 'border-input hover:border-pop-550/30'
                  }`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    addFiles(e.dataTransfer.files)
                  }}
                >
                  <FontAwesomeIcon icon={faCloudArrowUp} className="text-2xl text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    <span className="text-pop-300 font-medium">Haz clic para subir</span> o arrastra y suelta
                  </p>
                  <p className="text-xs text-muted-foreground/50">PNG, JPG, WEBP · Máx. {MAX_PHOTOS} fotos · Se comprimen automáticamente</p>
                </div>

                {/* Thumbnails */}
                {photos.length > 0 && (
                  <Reorder.Group
                    axis="x"
                    values={photos}
                    onReorder={setPhotos}
                    className="flex gap-2 flex-wrap mt-1"
                  >
                    {photos.map((photo) => (
                      <Reorder.Item key={photo.url} value={photo} className="relative cursor-grab active:cursor-grabbing">
                        <img
                          src={photo.url}
                          alt="Foto de mascota"
                          draggable="false"
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); removePhoto(photo.url) }}
                        >
                          <FontAwesomeIcon icon={faXmark} className="text-xs text-white" />
                        </button>
                      </Reorder.Item>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        className="w-14 h-14 rounded-xl border-2 border-dashed border-input flex items-center justify-center text-muted-foreground hover:border-pop-550/40 hover:text-pop-300 transition-colors"
                        onClick={() => inputRef.current?.click()}
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-base" />
                      </button>
                    )}
                  </Reorder.Group>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirm} disabled={!canSave}>
                  Guardar mascota
                </Button>
              </div>
            </div>

            {/* Right panel: live preview (always visible on desktop, toggle on mobile) */}
            <div className={`w-64 shrink-0 ${mobilePreview ? 'block md:block' : 'hidden md:block'}`}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t('dashboard.preview')}</p>
              <PreviewCard
                name={name}
                age={age}
                ageUnit={ageUnit}
                gender={gender}
                species={species}
                photos={photos}
                hasConditions={hasConditions && conditions.length > 0}
                vaccinated={vaccinated}
                castrated={castrated}
                size={size}
              />
            </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
