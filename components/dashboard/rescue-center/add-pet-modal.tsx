'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faCloudArrowUp,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'

export interface AddPetFormData {
  name: string
  description: string
  age: number
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
  photos: File[]
}

interface PendingPhoto {
  url: string
  file: File
}

interface AddPetModalProps {
  open: boolean
  onConfirm: (data: AddPetFormData) => void
  onClose: () => void
}

export function AddPetModal({ open, onConfirm, onClose }: AddPetModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setGender('male')
    setSpecies('dog')
    setPhotos([])
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
      age: parseInt(age, 10),
      gender,
      species,
      photos: photos.map((p) => p.file),
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
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-130 flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-0">
              <div>
                <h2 className="text-base font-semibold">Agregar mascota</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Completa los datos antes de subir fotos</p>
              </div>
              <button type="button" className="group mt-0.5" onClick={handleClose}>
                <FontAwesomeIcon
                  icon={faXmark}
                  className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:scale-125 group-hover:rotate-3 transition duration-200"
                />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-4 p-6 overflow-y-auto">

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

              {/* Age + Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Edad (meses)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="ej. 6"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Género</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        gender === 'male'
                          ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                          : 'border-input text-muted-foreground hover:border-border'
                      }`}
                    >
                      ♂ Macho
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        gender === 'female'
                          ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                          : 'border-input text-muted-foreground hover:border-border'
                      }`}
                    >
                      ♀ Hembra
                    </button>
                  </div>
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
                        ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    🐕 Perro
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecies('cat')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      species === 'cat'
                        ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    🐈 Gato
                  </button>
                </div>
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

              {/* Drag-and-drop photo zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fotos</label>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
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
                  <FontAwesomeIcon icon={faCloudArrowUp} className="w-8 h-8 text-muted-foreground/40" />
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
                          alt=""
                          draggable="false"
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); removePhoto(photo.url) }}
                        >
                          <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5 text-white" />
                        </button>
                      </Reorder.Item>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        className="w-14 h-14 rounded-xl border-2 border-dashed border-input flex items-center justify-center text-muted-foreground hover:border-pop-550/40 hover:text-pop-300 transition-colors"
                        onClick={() => inputRef.current?.click()}
                      >
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      </button>
                    )}
                  </Reorder.Group>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} className="rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={handleConfirm} disabled={!canSave} className="rounded-xl">
                  Guardar mascota
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
