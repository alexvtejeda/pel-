'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faCloudArrowUp,
  faPlus,
  faDog,
  faCat,
  faMars,
  faVenus,
  faSyringe,
  faScissors,
} from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { createUserPets, updateUserPet, uploadUserPetPhotos, UserPet } from '@/lib/api/user-pets'
import { UserPetCard } from '@/components/pets/user-pet-card'

interface PendingPhoto {
  url: string
  file: File
}

interface MemberAddPetModalProps {
  open: boolean
  onClose: () => void
  /** When provided, the modal switches to edit mode and saves via PATCH. */
  pet?: UserPet
  /** Called after a successful create or update (e.g. to refresh a list). */
  onSaved?: () => void
}

export function MemberAddPetModal({ open, onClose, pet, onSaved }: MemberAddPetModalProps) {
  const { t } = useTranslation('pets')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months')
  const [vaccinated, setVaccinated] = useState(false)
  const [castrated, setCastrated] = useState(false)
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [dragging, setDragging] = useState(false)
  const [mobilePreview, setMobilePreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!pet
  const existingPhotoUrls = pet?.photos?.map((p) => p.url) ?? []

  const MAX_PHOTOS = 5
  const parsedAge = parseInt(age, 10)
  const canSave = name.trim() !== '' && !isNaN(parsedAge) && parsedAge >= 0 && !saving

  // Prefill from `pet` when opening in edit mode. The stored age is already in
  // months, so we pin the unit toggle to "months" for a correct round-trip.
  useEffect(() => {
    if (!open || !pet) return
    setName(pet.name)
    setDescription(pet.description ?? '')
    setAge(String(pet.age))
    setAgeUnit('months')
    setGender(pet.gender)
    setSpecies(pet.species)
    setVaccinated(pet.vaccinated ?? false)
    setCastrated(pet.castrated ?? false)
    setSize(pet.size ?? 'medium')
  }, [open, pet])

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
    setVaccinated(false)
    setCastrated(false)
    setSize('medium')
    setMobilePreview(false)
    setSaving(false)
    setError(null)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)

    const ageInMonths = ageUnit === 'years' ? parsedAge * 12 : parsedAge

    // Edit mode → PATCH.
    if (pet) {
      const { data, error: updateError } = await updateUserPet(pet.id, {
        name: name.trim(),
        age: ageInMonths,
        species,
        gender,
        description: description.trim() || undefined,
        size,
        vaccinated,
        castrated,
      })

      if (updateError || !data) {
        setError(updateError || t('member.error_update'))
        setSaving(false)
        return
      }

      if (photos.length > 0) {
        const { error: uploadError } = await uploadUserPetPhotos(pet.id, photos.map(p => p.file))
        if (uploadError) {
          setError(uploadError)
          setSaving(false)
          return
        }
      }

      onSaved?.()
      reset()
      onClose()
      return
    }

    const { data, error: createError } = await createUserPets([{
      name: name.trim(),
      age: ageInMonths,
      species,
      gender,
      description: description.trim() || undefined,
      size,
      vaccinated,
      castrated,
    }])

    if (createError || !data || data.length === 0) {
      setError(createError || t('member.error_create'))
      setSaving(false)
      return
    }

    const createdPet = data[0]

    if (photos.length > 0) {
      const { error: uploadError } = await uploadUserPetPhotos(
        createdPet.id,
        photos.map(p => p.file)
      )
      if (uploadError) {
        setError(uploadError)
        setSaving(false)
        return
      }
    }

    onSaved?.()
    reset()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 z-60 flex items-center justify-center"
          onClick={handleClose}
        >
          <div className="fixed inset-0 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="relative z-60 bg-card border rounded-2xl w-[90%] md:max-w-3xl flex flex-col overflow-hidden max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-base font-semibold">{isEdit ? t('member.edit_title') : t('member.publish_title')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{isEdit ? t('member.edit_subtitle') : t('member.publish_subtitle')}</p>
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
              <button type="button" aria-label={t('member.close_modal')} className="group mt-0.5" onClick={handleClose}>
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
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.name')}</label>
                <input
                  autoFocus
                  type="text"
                  placeholder={t('member.placeholder_name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Species */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.species')}</label>
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
                    <FontAwesomeIcon icon={faDog} className="text-xs" /> {t('species.dog')}
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
                    <FontAwesomeIcon icon={faCat} className="text-xs" /> {t('species.cat')}
                  </button>
                </div>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.filter.gender')}</label>
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
                      <FontAwesomeIcon icon={faMars} className="text-xs" /> {t('gender.male')}
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
                      <FontAwesomeIcon icon={faVenus} className="text-xs" /> {t('gender.female')}
                    </button>
                  </div>
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.age')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder={t('member.placeholder_age')}
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

              {/* Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.size')}</label>
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
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.description')}</label>
                <textarea
                  placeholder={t('member.placeholder_description')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
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
                  <span className="text-sm text-foreground">{t('grid.vaccinated')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={castrated}
                    onChange={(e) => setCastrated(e.target.checked)}
                    className="w-4 h-4 rounded accent-pop-550"
                  />
                  <FontAwesomeIcon icon={faScissors} className="text-sm text-muted-foreground" />
                  <span className="text-sm text-foreground">{t('grid.castrated')}</span>
                </label>
              </div>

              {/* Existing photos (edit mode) — read-only; removal is out of scope */}
              {isEdit && existingPhotoUrls.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('member.existing_photos')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {existingPhotoUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    ))}
                  </div>
                </div>
              )}

              {/* Drag-and-drop photo zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('member.photos_label')}</label>
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
                    <span className="text-pop-300 font-medium">{t('member.upload_text')}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/50">{t('member.upload_hint', { max: MAX_PHOTOS })}</p>
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
                          alt={t('member.photo_alt', { name: name.trim() || t('details.name') })}
                          draggable="false"
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          aria-label={t('member.remove_photo')}
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
                        aria-label={t('member.add_photo')}
                        className="w-14 h-14 rounded-xl border-2 border-dashed border-input flex items-center justify-center text-muted-foreground hover:border-pop-550/40 hover:text-pop-300 transition-colors"
                        onClick={() => inputRef.current?.click()}
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-base" />
                      </button>
                    )}
                  </Reorder.Group>
                )}
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} disabled={saving}>
                  {t('member.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={!canSave}>
                  {saving ? t('member.publishing') : isEdit ? t('member.save_changes') : t('member.publish_button')}
                </Button>
              </div>
            </div>

            {/* Right panel: live preview (always visible on desktop, toggle on mobile) */}
            <div className={`w-64 shrink-0 ${mobilePreview ? 'block md:block' : 'hidden md:block'}`}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t('dashboard.preview')}</p>
              <UserPetCard
                name={name}
                age={age}
                ageUnit={ageUnit}
                gender={gender}
                species={species}
                photoUrls={[...existingPhotoUrls, ...photos.map(p => p.url)]}
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
