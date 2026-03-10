# Pets Tab Modal + Rescue Center Wizard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented photo-first pet creation flow with a single "Add Pet" modal, and convert the rescue center onboarding wizard from a 6-step stepper to a Tinder-inspired single-page form.

**Architecture:** `AddPetModal` is extracted into its own file to keep `pets-tab.tsx` manageable. The rescue center wizard replaces the `Stepper` entirely with a scrollable `<form>` on one page. The `gender` and `species` fields are added to the pet API types — no backend schema migration is in scope here (coordinate with backend team separately before shipping).

**Tech Stack:** Next.js 16 (App Router), React 19, TailwindCSS v4, FontAwesome, framer-motion, `lib/api/pets.ts`, `lib/api/rescue-centers.ts`

**Note:** No test framework is configured. Verification steps use `bun run lint` + manual browser checks.

---

## Chunk 1: Pet API types + AddPetModal + pets-tab wiring

### Task 1: Add `gender` and `species` to pet API types

**Files:**
- Modify: `lib/api/pets.ts`

- [ ] **Step 1: Add `gender` and `species` to the `Pet` interface and input types**

Open `lib/api/pets.ts`. Make these exact changes:

```typescript
// Update Pet interface — add after `age: number`
export interface Pet {
  id: string
  rescue_center_id: string
  name: string
  description: string
  age: number
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
  status: string
  photos: Photo[]
}

// Update createPet input — add gender and species as required
export async function createPet(data: {
  name: string
  description: string
  age: number
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
}): Promise<Pet> {
  const res = await apiClient('/api/v1/pets', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create pet')
  return res.json()
}

// Update updatePet input — add optional gender and species
export async function updatePet(
  id: string,
  data: {
    name?: string
    description?: string
    age?: number
    gender?: 'male' | 'female'
    species?: 'dog' | 'cat'
  }
): Promise<Pet> {
  const res = await apiClient(`/api/v1/pets/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update pet')
  return res.json()
}
```

- [ ] **Step 2: Lint**

```bash
bun run lint
```

Expected: no errors related to `pets.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/api/pets.ts
git commit -m "feat(api): add gender and species fields to Pet type and API functions"
```

---

### Task 2: Create `AddPetModal` component

**Files:**
- Create: `components/dashboard/rescue-center/add-pet-modal.tsx`

This is the unified "Add Pet" modal that replaces the old three-step modal chain (UploadModal → NameModal → DescriptionModal).

- [ ] **Step 1: Create the file**

Create `components/dashboard/rescue-center/add-pet-modal.tsx` with this content:

```typescript
'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faCloudArrowUp,
  faPaw,
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
  const canSave = name.trim() !== '' && age !== '' && !isNaN(parseInt(age, 10))

  const addFiles = (files: FileList | File[]) => {
    const valid = Array.from(files)
      .filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
      .slice(0, MAX_PHOTOS - photos.length)
    if (valid.length === 0) return
    setPhotos((prev) => [...prev, ...valid.map((f) => ({ url: URL.createObjectURL(f), file: f }))])
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
            className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-[520px] flex flex-col overflow-hidden max-h-[90vh]"
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
```

- [ ] **Step 2: Lint**

```bash
bun run lint
```

Expected: no errors in `add-pet-modal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/rescue-center/add-pet-modal.tsx
git commit -m "feat(pets): add unified AddPetModal with name, age, gender, species, drag-and-drop photos"
```

---

### Task 3: Wire AddPetModal into pets-tab and update pet card

**Files:**
- Modify: `components/dashboard/rescue-center/pets-tab.tsx`

The goals for this file:
1. Add an "Agregar mascota" button visible at all times (not just when empty)
2. Remove `NameModal`, `DescriptionModal`, and `UploadModal` components and all their state
3. Wire `AddPetModal` for the create flow
4. Update `EditPetModal` to include `gender` and `species` fields
5. Update the pet card: show `faPaw` placeholder when no photos; show only filled fields

- [ ] **Step 1: Update imports at the top of `pets-tab.tsx`**

Replace the existing import block with:

```typescript
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
```

- [ ] **Step 2: Remove `UploadModal`, `NameModal`, and `DescriptionModal` component definitions**

Delete the three function components `UploadModal` (lines ~82–157), `NameModal` (lines ~196–258), and `DescriptionModal` (lines ~260–342) entirely from the file.

- [ ] **Step 3: Update `EditPetModal` to include gender and species**

In the `EditPetModal` component, add `gender` and `species` to state and the `onSave` signature:

```typescript
// Add to state inside EditPetModal
const [gender, setGender] = useState<'male' | 'female'>('male')
const [species, setSpecies] = useState<'dog' | 'cat'>('dog')

// Populate on pet change — add inside the useEffect after setPhotos(initialPhotos)
setGender(pet.gender ?? 'male')
setSpecies(pet.species ?? 'dog')
```

Update the `onSave` prop type:
```typescript
onSave: (id: string, updates: {
  name: string
  description: string
  age: number
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
  photos: EditPhoto[]
}) => void
```

Add gender and species toggle UI inside the `EditPetModal` form, after the age field and before description. Use the same toggle pattern as `AddPetModal`:

```tsx
{/* Gender */}
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium">Género</label>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setGender('male')}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
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
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        gender === 'female'
          ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
          : 'border-input text-muted-foreground hover:border-border'
      }`}
    >
      ♀ Hembra
    </button>
  </div>
</div>

{/* Species */}
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium">Tipo</label>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setSpecies('dog')}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
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
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        species === 'cat'
          ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
          : 'border-input text-muted-foreground hover:border-border'
      }`}
    >
      🐈 Gato
    </button>
  </div>
</div>
```

Update the Save button's `onClick` to include gender and species:
```tsx
onClick={() => {
  onSave(pet.id, { name, description, age: age as number, gender, species, photos })
  onClose()
}}
```

- [ ] **Step 4: Update `PetsTab` state — remove old modal state, add `addPetOpen`**

In the `PetsTab` component body, remove:
- `uploadModalOpen` / `setUploadModalOpen`
- `pendingPhotos` / `setPendingPhotos`
- `pendingName` / `setPendingName`
- `dropzoneRef`

Add:
```typescript
const [addPetOpen, setAddPetOpen] = useState(false)
```

The `PetsTabHandle` interface key **must stay `openUpload`** — `dashboard-shell.tsx` calls `petsTabRef.current?.openUpload()` and must not be touched. Only the implementation body changes:
```typescript
useImperativeHandle(ref, () => ({
  openUpload: () => setAddPetOpen(true),
}))
```

- [ ] **Step 5: Replace `handleNameConfirm`, `handleDescriptionConfirm`, `handleDescriptionCancel`, `handleNameCancel` with a single `handleAddPetConfirm`**

Remove all four old handlers. Add:

```typescript
const handleAddPetConfirm = async (data: AddPetFormData) => {
  const pet = await createPet({
    name: data.name,
    description: data.description,
    age: data.age,
    gender: data.gender,
    species: data.species,
  })
  if (data.photos.length > 0) {
    const photos = await uploadPhotos(pet.id, data.photos)
    pet.photos = photos
  }
  setPets((prev) => [...prev, pet])
  setAddPetOpen(false)
}
```

Update `handleEditSave` to pass `gender` and `species` to `updatePet`:
```typescript
const updated = await updatePet(id, {
  name: updates.name,
  description: updates.description,
  age: updates.age,
  gender: updates.gender,
  species: updates.species,
})
```

- [ ] **Step 6: Update the empty state and add the "Agregar mascota" button**

Replace the current empty-state block (the `pets.length === 0` block that shows the full-screen drop zone) with a tab-level header that always shows the "Agregar mascota" button, plus a smaller empty state:

```tsx
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
```

- [ ] **Step 7: Update the pet card — `faPaw` placeholder when no photos, show only filled fields**

Replace the pet card's `<div className="relative aspect-square">` contents:

```tsx
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
```

Replace the card footer to show only filled fields:

```tsx
<div className="p-3 flex items-center justify-between gap-2">
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="font-medium text-sm truncate">{pet.name}</span>
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
```

- [ ] **Step 8: Replace the old modal JSX at the bottom of the return**

Remove the `<UploadModal>`, `<NameModal>`, `<DescriptionModal>` JSX from the return. Replace with `<AddPetModal>`:

```tsx
<AddPetModal
  open={addPetOpen}
  onConfirm={handleAddPetConfirm}
  onClose={() => setAddPetOpen(false)}
/>
```

Also remove the `dropzoneRef` `<input>` and the `uploadMoreRef`/`handleUploadMore` hidden input (keep `uploadMoreRef` only if "Subir Fotos" in the dropdown still uses it — it does, so keep that input).

- [ ] **Step 9: Lint**

```bash
bun run lint
```

Expected: no errors.

- [ ] **Step 10: Manual browser check**

With `bun run dev` running, navigate to `/dashboard/rescue-center` (pets tab):
- "Agregar mascota" button visible in header ✓
- Clicking it opens the AddPetModal ✓
- Filling name + age + selecting gender/species + optionally adding photos → "Guardar mascota" creates a pet card ✓
- Pet card with no photos shows large `faPaw` icon ✓
- Pet card footer shows only name + filled fields ✓
- Edit pencil opens `EditPetModal` with gender/species toggles pre-filled ✓

- [ ] **Step 11: Commit**

```bash
git add components/dashboard/rescue-center/pets-tab.tsx
git commit -m "feat(pets-tab): replace multi-modal flow with AddPetModal, add paw placeholder, gender/species to cards"
```

---

## Chunk 2: Rescue Center Wizard — single-page redesign

### Task 4: Replace rescue-center-wizard.tsx with single-page Tinder-style form

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx`

This is a full replacement of the file. The `Stepper` component is removed entirely. The page becomes a single scrollable form with a two-column layout.

- [ ] **Step 1: Replace the entire file content**

```typescript
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faPaw,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { createRescueCenter } from '@/lib/api/rescue-centers'
import { createPet, uploadPhotos } from '@/lib/api/pets'
import { BackgroundBeams } from '@/components/ui/beams'
import { Logo } from '@/components/logo'

interface PendingPhoto {
  url: string
  file: File
}

export function RescueCenterWizard() {
  const router = useRouter()

  // Center fields
  const [centerName, setCenterName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [rnc, setRnc] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')

  // Optional pet fields
  const [petName, setPetName] = useState('')
  const [petDescription, setPetDescription] = useState('')
  const [petAge, setPetAge] = useState('')
  const [petGender, setPetGender] = useState<'male' | 'female'>('male')
  const [petSpecies, setPetSpecies] = useState<'dog' | 'cat'>('dog')
  const [petPhotos, setPetPhotos] = useState<PendingPhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const MAX_PHOTOS = 5

  const addFiles = (files: FileList | File[]) => {
    const valid = Array.from(files)
      .filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
      .slice(0, MAX_PHOTOS - petPhotos.length)
    if (valid.length === 0) return
    setPetPhotos((prev) => [...prev, ...valid.map((f) => ({ url: URL.createObjectURL(f), file: f }))])
  }

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url)
    setPetPhotos((prev) => prev.filter((p) => p.url !== url))
  }

  // A pet section is considered filled if name is provided
  const hasPetData = petName.trim() !== ''

  const handleSubmit = async () => {
    if (!centerName.trim() || !phone.trim() || !address.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    const { error } = await createRescueCenter({
      name: centerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      ...(rnc.trim() && { rnc: rnc.trim() }),
      ...(website.trim() && { website: website.trim() }),
      instagram: instagram.trim(),
    })

    if (error) {
      setSubmitError(error)
      setSubmitting(false)
      return
    }

    // Optional pet creation
    if (hasPetData) {
      try {
        const pet = await createPet({
          name: petName.trim(),
          description: petDescription.trim(),
          age: petAge !== '' ? parseInt(petAge, 10) : 0,
          gender: petGender,
          species: petSpecies,
        })
        if (petPhotos.length > 0) {
          await uploadPhotos(pet.id, petPhotos.map((p) => p.file))
        }
      } catch {
        // Pet creation failure is non-fatal — center was already registered
      }
    }

    petPhotos.forEach((p) => URL.revokeObjectURL(p.url))
    setSubmitting(false)
    setSubmitted(true)
  }

  const canSubmit = centerName.trim() !== '' && phone.trim() !== '' && address.trim() !== '' && !submitting

  if (submitted) {
    return (
      <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundBeams />
        <div className="relative z-10 w-full max-w-md text-center space-y-6">
          <FontAwesomeIcon icon={faPaw} className="w-16 h-16 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">¡Solicitud enviada!</h1>
          <p className="text-muted-foreground">
            Tu centro de rescate está en revisión. Nuestro equipo verificará la información y te notificará cuando sea aprobado.
          </p>
          <div className="p-4 bg-muted border border-border rounded-2xl text-sm text-muted-foreground">
            Estado: <span className="font-medium text-foreground">Pendiente de aprobación</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />

      {/* Topbar */}
      <nav className="relative z-10 flex items-center px-8 py-5 border-b border-border">
        <Logo width={32} height={32} />
      </nav>

      {/* Page content */}
      <main className="relative z-10 max-w-[920px] mx-auto px-8 py-12 pb-20">

        <h1 className="text-2xl font-bold tracking-tight mb-1">Registra tu centro de rescate</h1>
        <p className="text-sm text-muted-foreground mb-10">Completa tu perfil para que adoptantes puedan encontrarte</p>

        {/* Two-column: fields + pet photos */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-8 mb-12">

          {/* Left: Center fields */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Nombre del centro <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="ej. Centro de Rescate Esperanza"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Teléfono <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                placeholder="809-000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Dirección <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Calle, número, sector, ciudad"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  RNC <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="1-23-45678-9"
                  value={rnc}
                  onChange={(e) => setRnc(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Sitio web <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://tucentro.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Instagram</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">@</span>
                <input
                  type="text"
                  placeholder="tucentro"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 pl-8 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Right: Pet photo grid */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Fotos de la mascota <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">(opcional)</span>
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files ?? []); e.target.value = '' }}
            />
            <div
              className={`grid grid-cols-2 gap-2 cursor-pointer`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            >
              {/* Main slot — col-span-2 */}
              {petPhotos[0] ? (
                <div className="col-span-2 relative rounded-xl overflow-hidden h-[116px]">
                  <img src={petPhotos[0].url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                    onClick={() => removePhoto(petPhotos[0].url)}
                  >
                    <FontAwesomeIcon icon={faXmark} className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  className={`col-span-2 rounded-xl border-2 border-dashed h-[116px] flex flex-col items-center justify-center gap-1 transition-colors ${dragging ? 'border-pop-550/50 bg-pop-550/5' : 'border-input hover:border-pop-550/30'}`}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <FontAwesomeIcon icon={faPlus} className="w-5 h-5 text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground/30">Foto principal</span>
                </div>
              )}

              {/* 4 small slots */}
              {[1, 2, 3, 4].map((i) =>
                petPhotos[i] ? (
                  <div key={i} className="relative rounded-xl overflow-hidden h-[80px]">
                    <img src={petPhotos[i].url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                      onClick={() => removePhoto(petPhotos[i].url)}
                    >
                      <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`rounded-xl border-2 border-dashed h-[80px] flex items-center justify-center transition-colors ${dragging ? 'border-pop-550/50' : 'border-input hover:border-pop-550/30'}`}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-muted-foreground/20" />
                  </div>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground/40 text-center">Arrastra y suelta · Se comprimen automáticamente</p>
          </div>
        </div>

        {/* Tinder-style "Opcional" divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Opcional</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Optional pet section */}
        <p className="text-base font-semibold mb-5">¿Tienes una mascota lista para adopción?</p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-5 mb-12">
          {/* Name + description */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nombre</label>
              <input
                type="text"
                placeholder="ej. Coco"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Descripción</label>
              <input
                type="text"
                placeholder="ej. Muy cariñoso, bueno con niños…"
                value={petDescription}
                onChange={(e) => setPetDescription(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Age */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Edad (meses)</label>
            <input
              type="number"
              min={0}
              placeholder="ej. 8"
              value={petAge}
              onChange={(e) => setPetAge(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Gender + Species toggles */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Género</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPetGender('male')}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    petGender === 'male'
                      ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                      : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  ♂ Macho
                </button>
                <button
                  type="button"
                  onClick={() => setPetGender('female')}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    petGender === 'female'
                      ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                      : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  ♀ Hembra
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tipo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPetSpecies('dog')}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    petSpecies === 'dog'
                      ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                      : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  🐕 Perro
                </button>
                <button
                  type="button"
                  onClick={() => setPetSpecies('cat')}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    petSpecies === 'cat'
                      ? 'bg-pop-550/10 border-pop-550/50 text-pop-300'
                      : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  🐈 Gato
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
            {submitError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => { localStorage.setItem('pelu_changing_role', '1'); router.push('/auth/role-selection') }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" />
            Cambiar rol
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-8 py-3 bg-pop-550 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enviando…' : 'Enviar solicitud →'}
          </button>
        </div>

      </main>
    </div>
  )
}
```

- [ ] **Step 2: Lint**

```bash
bun run lint
```

Expected: no errors.

- [ ] **Step 3: Manual browser check**

Navigate to `/auth/onboarding/rescue-center`:
- Single scrollable page renders (no stepper) ✓
- All 6 center fields present ✓
- RNC + website are side-by-side ✓
- Instagram field has `@` prefix ✓
- Right column shows 5 dashed photo slots (1 large + 4 small) ✓
- Photos added to right column via click or drag-and-drop ✓
- "Opcional" divider is centered between two lines ✓
- Optional pet section: name, description, age, gender toggle, species toggle ✓
- Submit with only center fields (no pet data) → success screen ✓
- Submit with center + pet data → success screen ✓
- "Cambiar rol" link works ✓

- [ ] **Step 4: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "feat(wizard): replace rescue center stepper with single-page Tinder-style form with optional pet upload"
```
