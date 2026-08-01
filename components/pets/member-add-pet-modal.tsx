'use client'

import { useState, useRef, useEffect } from 'react'
import { Reorder } from 'framer-motion'
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
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createUserPets,
  updateUserPet,
  uploadUserPetPhotos,
  deleteUserPetPhoto,
  UserPet,
} from '@/lib/api/user-pets'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/contexts/auth-context'
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
  const { user, updateSession } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
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
  // Removal of an already-uploaded photo is staged until save, so "Cancelar"
  // stays non-destructive like every other field in this form.
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!pet
  const existingPhotos = (pet?.photos ?? []).filter((p) => !removedPhotoIds.includes(p.id))
  const existingPhotoUrls = existingPhotos.map((p) => p.url)
  const photoAlt = t('member.photo_alt', { name: name.trim() || t('details.name') })

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

  // The publish flow is the only place a member can set a phone (there is no
  // profile settings page), so seed it from the session and write it back on
  // save rather than storing it per-listing. `phone` is `omitempty` on the auth
  // payload, so an unset number is absent, not null.
  useEffect(() => {
    if (!open) return
    setPhone(user?.phone ?? '')
  }, [open, user?.phone])

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
    setPhone('')
    setDescription('')
    setAge('')
    setAgeUnit('months')
    setGender('male')
    setSpecies('dog')
    setPhotos([])
    setRemovedPhotoIds([])
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

    /*
      Write the phone to the profile first, for BOTH modes: if this fails a new
      listing should not go live without a contact number on it.

      This has to run before the edit branch below, not inside the publish path
      alone. The field renders in edit mode too, so when it only guarded the
      create path a member could change their number, save, and watch the change
      silently vanish — there is no other screen that can set it.
    */
    const trimmedPhone = phone.trim()
    if (trimmedPhone && trimmedPhone !== (user?.phone ?? '')) {
      const res = await apiClient('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ phone: trimmedPhone }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || t('member.error_phone'))
        setSaving(false)
        return
      }
      /*
        The endpoint answers with the updated user itself, not `{ user }` — see
        api.WriteJSON(w, 200, toUserResponse(u)) in internal/auth/handler.go. The
        old `json.user` read never matched, so the session kept the previous
        number and this modal, which prefills from it, showed the stale value
        back to the user as if the save had been dropped.
      */
      if (json?.id) updateSession(json)
    }

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

      for (const photoId of removedPhotoIds) {
        const { error: deleteError } = await deleteUserPetPhoto(pet.id, photoId)
        if (deleteError) {
          setError(deleteError)
          setSaving(false)
          return
        }
      }

      if (photos.length > 0) {
        const { error: uploadError } = await uploadUserPetPhotos(pet.id, photos.map(p => p.file))
        if (uploadError) {
          setError(uploadError)
          setSaving(false)
          return
        }
      }

      toast.success(t('member.saved'))
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
      // Publishing IS the point of this modal. The edit branch above omits the
      // field on purpose, so saving an edit never re-lists an adopted pet.
      adoption_status: 'available',
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

    toast.success(t('member.published'))
    onSaved?.()
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      {/* max-w-none/rounded-2xl restate what the shared DialogContent only does
          from `sm:` up — this modal keeps its width and radius on phones too. */}
      <DialogContent className="flex max-h-[calc(90vh-4rem)] w-[90%] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[90vh] md:max-w-3xl">
        <DialogHeader className="p-6 pb-0 text-left">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t('member.edit_title') : t('member.publish_title')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit ? t('member.edit_subtitle') : t('member.publish_subtitle')}
          </DialogDescription>
        </DialogHeader>

        <DialogClose
          aria-label={t('member.close_modal')}
          disabled={saving}
          className="focus-ring absolute right-5 top-5 rounded-xl p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </DialogClose>

        {/* Mobile preview toggle */}
        <button
          type="button"
          onClick={() => setMobilePreview(prev => !prev)}
          className="focus-ring mx-6 mt-2 self-start rounded-xl text-xs font-medium text-pop-300 transition-colors hover:text-pop-550 md:hidden"
        >
          {mobilePreview ? t('dashboard.edit') : t('dashboard.preview')}
        </button>

        {/* Body — two-panel on desktop */}
        <div className="flex min-h-0 flex-1 gap-6 overflow-y-auto overscroll-contain p-6 pt-4">
          {/* Left panel: form (hidden on mobile when preview is active) */}
          <div className={`flex flex-col gap-4 flex-1 min-w-0 ${mobilePreview ? 'hidden md:flex' : 'flex'}`}>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pet-name" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.name')}</label>
              <input
                id="pet-name"
                autoFocus
                type="text"
                placeholder={t('member.placeholder_name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Species — a pair of toggle buttons, so the group carries the label */}
            <div className="flex flex-col gap-1.5">
              <span id="pet-species-label" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.species')}</span>
              <div role="group" aria-labelledby="pet-species-label" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={species === 'dog'}
                  onClick={() => setSpecies('dog')}
                  className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    species === 'dog'
                      ? 'bg-pop-550/10 border-pop-550 text-foreground'
                      : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  <FontAwesomeIcon icon={faDog} className="text-xs" /> {t('species.dog')}
                </button>
                <button
                  type="button"
                  aria-pressed={species === 'cat'}
                  onClick={() => setSpecies('cat')}
                  className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
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
              <span id="pet-gender-label" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.filter.gender')}</span>
              <div role="group" aria-labelledby="pet-gender-label" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={gender === 'male'}
                  onClick={() => setGender('male')}
                  className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    gender === 'male'
                      ? 'bg-pop-550/10 border-pop-550 text-foreground'
                      : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  <FontAwesomeIcon icon={faMars} className="text-xs" /> {t('gender.male')}
                </button>
                <button
                  type="button"
                  aria-pressed={gender === 'female'}
                  onClick={() => setGender('female')}
                  className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
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
              <label htmlFor="pet-age" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.age')}</label>
              <div className="flex gap-2">
                <input
                  id="pet-age"
                  type="number"
                  min={0}
                  placeholder={t('member.placeholder_age')}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="button" aria-pressed={ageUnit === 'months'} onClick={() => setAgeUnit('months')}
                  className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    ageUnit === 'months' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  {t('dashboard.ageUnit.months')}
                </button>
                <button type="button" aria-pressed={ageUnit === 'years'} onClick={() => setAgeUnit('years')}
                  className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    ageUnit === 'years' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}>
                  {t('dashboard.ageUnit.years')}
                </button>
              </div>
            </div>

            {/* Size */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pet-size" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.size')}</label>
              <select
                id="pet-size"
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
              <label htmlFor="pet-description" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('details.description')}</label>
              <textarea
                id="pet-description"
                placeholder={t('member.placeholder_description')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Contact phone. Lives on the profile, not on the pet — this modal
                is the only place a member can set one (there is no profile
                settings page), so it is seeded from the session and written
                back on save. */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pet-phone" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('member.phone_label')}</label>
              <input
                id="pet-phone"
                type="tel"
                placeholder={t('member.phone_placeholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground/70">{t('member.phone_hint')}</p>
            </div>

            {/* Vaccinated / Castrated */}
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="pet-vaccinated" className="flex items-center gap-2 cursor-pointer">
                <input
                  id="pet-vaccinated"
                  type="checkbox"
                  checked={vaccinated}
                  onChange={(e) => setVaccinated(e.target.checked)}
                  className="w-4 h-4 rounded accent-pop-550"
                />
                <FontAwesomeIcon icon={faSyringe} className="text-sm text-muted-foreground" />
                <span className="text-sm text-foreground">{t('grid.vaccinated')}</span>
              </label>
              <label htmlFor="pet-castrated" className="flex items-center gap-2 cursor-pointer">
                <input
                  id="pet-castrated"
                  type="checkbox"
                  checked={castrated}
                  onChange={(e) => setCastrated(e.target.checked)}
                  className="w-4 h-4 rounded accent-pop-550"
                />
                <FontAwesomeIcon icon={faScissors} className="text-sm text-muted-foreground" />
                <span className="text-sm text-foreground">{t('grid.castrated')}</span>
              </label>
            </div>

            {/* Existing photos (edit mode) — removal is staged until save */}
            {isEdit && existingPhotos.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span id="pet-existing-photos-label" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('member.existing_photos')}</span>
                <div role="group" aria-labelledby="pet-existing-photos-label" className="flex gap-2 flex-wrap">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photoAlt} className="w-14 h-14 rounded-xl object-cover" />
                      <button
                        type="button"
                        aria-label={t('member.remove_photo')}
                        className="focus-ring absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                        onClick={() => setRemovedPhotoIds((prev) => [...prev, photo.id])}
                      >
                        <FontAwesomeIcon icon={faXmark} className="text-xs text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground/70">{t('member.photos_removed_on_save')}</p>
              </div>
            )}

            {/* Drag-and-drop photo zone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pet-photos" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('member.photos_label')}</label>
              {/* sr-only + `peer`, not `hidden`: the input is the labelled control
                  and has to stay in the tab order so the picker is reachable by
                  keyboard; the zone below paints its focus ring for it. */}
              <input
                id="pet-photos"
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="peer sr-only"
                onChange={(e) => { addFiles(e.target.files ?? []); e.target.value = '' }}
              />
              <div
                className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-8 peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${
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
                        alt={photoAlt}
                        draggable="false"
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        aria-label={t('member.remove_photo')}
                        className="focus-ring absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
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
                      className="focus-ring w-14 h-14 rounded-xl border-2 border-dashed border-input flex items-center justify-center text-muted-foreground hover:border-pop-550/40 hover:text-pop-300 transition-colors"
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
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}

            {/* The modal now has public consequences, so it says so before the
                button is pressed rather than after. */}
            {!isEdit && (
              <p className="text-xs text-muted-foreground">{t('member.publish_notice')}</p>
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
      </DialogContent>
    </Dialog>
  )
}
