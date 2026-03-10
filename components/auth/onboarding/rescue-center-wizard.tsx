'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faPaw,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import Carousel from '@/components/Carousel'
import { createRescueCenter } from '@/lib/api/rescue-centers'
import { createPet, uploadPhotos } from '@/lib/api/pets'
import { BackgroundBeams } from '@/components/ui/beams'
import { Logo } from '@/components/logo'

interface PendingPhoto {
  url: string
  file: File
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
    setPetPhotos((prev) => [
      ...prev,
      ...valid.map((f) => ({ url: URL.createObjectURL(f), file: f })),
    ])
  }

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url)
    setPetPhotos((prev) => prev.filter((p) => p.url !== url))
  }

  // Pet section is considered filled if name is provided
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
      ...(instagram.trim() && { instagram: instagram.trim() }),
    })

    if (error) {
      setSubmitError(error)
      setSubmitting(false)
      return
    }

    // Optional pet creation — createPet throws on error, so we use try/catch
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

  const canSubmit =
    centerName.trim() !== '' &&
    phone.trim() !== '' &&
    address.trim() !== '' &&
    !submitting

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
      <nav className="relative bg-card z-10 flex items-center px-8 py-5 inset-shadow-[0px_0px_1px_2px_var(--color-input)]">
        <Logo width={32} height={32} />
      </nav>

      {/* Page content */}
      <main className="mt-4 rounded-lg relative z-10 max-w-230 mx-auto px-8 py-12 pb-20 bg-background/90 shadow-[-1px_1px_1px_1px_var(--color-input)]">

        <h1 className="text-2xl font-bold tracking-tight mb-1">Registra tu centro de rescate</h1>
        <p className="text-sm text-muted-foreground mb-10">Completa tu perfil para que adoptantes puedan encontrarte</p>

        {/* Two-column: center fields + pet photo grid */}
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
                  RNC{' '}
                  <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                    (opcional)
                  </span>
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
                  Sitio web{' '}
                  <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                    (opcional)
                  </span>
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
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Instagram
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  @
                </span>
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
              Fotos de la mascota{' '}
              <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                (opcional)
              </span>
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files ?? [])
                e.target.value = ''
              }}
            />
            {petPhotos.length > 0 ? (
              /* Pet card preview — mirrors the dashboard card exactly */
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="relative aspect-square bg-muted/30">
                  <CardCarousel urls={petPhotos.map((p) => p.url)} />
                  {/* Clear all photos */}
                  <button
                    type="button"
                    onClick={() => { petPhotos.forEach((p) => URL.revokeObjectURL(p.url)); setPetPhotos([]) }}
                    className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  {/* Add more photos */}
                  {petPhotos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{petName || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      petAge && `${petAge} meses`,
                      petGender === 'male' ? '♂' : '♀',
                      petSpecies === 'dog' ? '🐕' : '🐈',
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            ) : (
              /* Dashed placeholder grid */
              <div
                className="grid grid-cols-2 gap-2 cursor-pointer"
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
              >
                <div className={`col-span-2 rounded-xl border-2 border-dashed h-[116px] flex flex-col items-center justify-center gap-1 transition-colors ${dragging ? 'border-pop-550/50 bg-pop-550/5' : 'border-input hover:border-pop-550/30'}`}>
                  <FontAwesomeIcon icon={faPlus} className="w-5 h-5 text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground/30">Foto principal</span>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`rounded-xl border-2 border-dashed h-[80px] flex items-center justify-center transition-colors ${dragging ? 'border-pop-550/50' : 'border-input hover:border-pop-550/30'}`}>
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-muted-foreground/20" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground/40 text-center">
              Arrastra y suelta · Se comprimen automáticamente
            </p>
          </div>
        </div>

        {/* "Opcional" divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
            Opcional
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Optional pet section */}
        <p className="text-base font-semibold mb-5">¿Tienes una mascota lista para adopción?</p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-5 mb-12">
          {/* Name + description */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Nombre
              </label>
              <input
                type="text"
                placeholder="ej. Coco"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Descripción
              </label>
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
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Edad (meses)
            </label>
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
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Género
              </label>
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
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Tipo
              </label>
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
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
            {submitError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('pelu_changing_role', '1')
              router.push('/auth/role-selection')
            }}
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
