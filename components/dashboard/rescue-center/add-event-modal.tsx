'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faCloudArrowUp,
  faCalendarDays,
  faClock,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createEvent, uploadEventPhoto, type EventItem } from '@/lib/api/events'

interface AddEventModalProps {
  open: boolean
  onConfirm: (event: EventItem) => void
  onClose: () => void
}

function PreviewCard({
  title,
  description,
  date,
  time,
  location,
  photoUrl,
}: {
  title: string
  description: string
  date: string
  time: string
  location: string
  photoUrl: string | null
}) {
  const formatDate = (d: string) => {
    if (!d) return ''
    const [year, month, day] = d.split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div className="rounded-2xl overflow-hidden border bg-card shadow-xs">
      <div className="relative aspect-video bg-muted/30">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Vista previa del evento"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faCalendarDays} className="text-5xl text-muted-foreground/20" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <p className="font-medium text-sm truncate">{title.trim() || 'Título del evento'}</p>
        {description.trim() && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description.trim()}</p>
        )}
        <div className="space-y-1 pt-0.5">
          {date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCalendarDays} className="text-xs shrink-0" />
              {formatDate(date)}
              {time && <><span>·</span><FontAwesomeIcon icon={faClock} className="text-xs shrink-0" />{time}</>}
            </span>
          )}
          {location.trim() && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FontAwesomeIcon icon={faLocationDot} className="text-xs shrink-0" />
              <span className="truncate">{location.trim()}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function AddEventModal({ open, onConfirm, onClose }: AddEventModalProps) {
  const { t } = useTranslation('common')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [photo, setPhoto] = useState<{ url: string; file: File } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [mobilePreview, setMobilePreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const canSave =
    title.trim() !== '' &&
    description.trim() !== '' &&
    date !== '' &&
    time !== '' &&
    location.trim() !== ''

  const addFile = (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto({ url: URL.createObjectURL(file), file })
  }

  const removePhoto = () => {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto(null)
  }

  const reset = () => {
    if (photo) URL.revokeObjectURL(photo.url)
    setTitle('')
    setDescription('')
    setDate('')
    setTime('')
    setLocation('')
    setPhoto(null)
    setDragging(false)
    setMobilePreview(false)
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!canSave || submitting) return
    setSubmitting(true)

    const { data: event, error } = await createEvent({ title: title.trim(), description: description.trim(), date, time, location: location.trim() })
    if (error || !event) {
      toast.error(error ?? 'Error al crear evento')
      setSubmitting(false)
      return
    }

    if (photo) {
      const { error: photoError } = await uploadEventPhoto(event.id, photo.file)
      if (photoError) {
        toast.error(photoError)
        setSubmitting(false)
        return
      }
    }

    toast.success(t('events.created'))
    reset()
    onConfirm(event)
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
                  <h2 className="text-base font-semibold">{t('events.create')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Completa los datos del evento</p>
                </div>
                {/* Mobile toggle */}
                <button
                  type="button"
                  onClick={() => setMobilePreview(prev => !prev)}
                  className="md:hidden text-xs font-medium text-pop-300 hover:text-pop-550 transition-colors"
                >
                  {mobilePreview ? 'Editar' : 'Vista previa'}
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

              {/* Left panel: form */}
              <div className={`flex flex-col gap-4 flex-1 min-w-0 ${mobilePreview ? 'hidden md:flex' : 'flex'}`}>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('events.form.title')}
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="ej. Feria de adopción"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('events.form.description')}
                  </label>
                  <textarea
                    placeholder="ej. Ven a conocer a nuestros animales en busca de hogar…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t('events.form.date')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t('events.form.time')}
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('events.form.location')}
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Parque Mirador Norte, Santo Domingo"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Photo upload */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('events.form.photo')}
                  </label>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) addFile(file)
                      e.target.value = ''
                    }}
                  />
                  {!photo ? (
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
                        const file = e.dataTransfer.files?.[0]
                        if (file) addFile(file)
                      }}
                    >
                      <FontAwesomeIcon icon={faCloudArrowUp} className="text-2xl text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        <span className="text-pop-300 font-medium">Haz clic para subir</span> o arrastra y suelta
                      </p>
                      <p className="text-xs text-muted-foreground/50">PNG, JPG, WEBP · Máx. 5 MB</p>
                    </div>
                  ) : (
                    <div className="relative w-full">
                      <img
                        src={photo.url}
                        alt="Vista previa"
                        className="w-full h-40 rounded-2xl object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive flex items-center justify-center"
                        onClick={removePhoto}
                      >
                        <FontAwesomeIcon icon={faXmark} className="text-xs text-white" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={handleClose} className="rounded-xl">
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={!canSave || submitting} className="rounded-xl">
                    {submitting ? 'Guardando…' : t('events.form.submit')}
                  </Button>
                </div>
              </div>

              {/* Right panel: live preview */}
              <div className={`w-64 shrink-0 ${mobilePreview ? 'block md:block' : 'hidden md:block'}`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Vista previa</p>
                <PreviewCard
                  title={title}
                  description={description}
                  date={date}
                  time={time}
                  location={location}
                  photoUrl={photo?.url ?? null}
                />
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
