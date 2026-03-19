'use client'
import { OnboardingNav } from './onboarding-nav'
import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faPaw,
  faArrowUpFromBracket,
  faPlus,
  faXmark,
  faMars,
  faVenus,
  faDog,
  faCat,
  faSyringe,
  faScissors,
} from '@fortawesome/free-solid-svg-icons'
import Carousel from '@/components/Carousel'
import { createRescueCenter, getMyRescueCenter } from '@/lib/api/rescue-centers'
import { createPet, uploadPhotos } from '@/lib/api/pets'
import { BackgroundBeams } from '@/components/ui/beams'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { getMethods } from '@/lib/api/mfa'


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

  // If RC already exists, redirect to dashboard (prevents re-showing form after approval)
  useEffect(() => {
    getMyRescueCenter().then(({ data }) => {
      if (data) router.replace('/dashboard/rescue-center')
    })
  }, [router])

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
  const [petAgeUnit, setPetAgeUnit] = useState<'months' | 'years'>('years')
  const [petVaccinated, setPetVaccinated] = useState(false)
  const [petCastrated, setPetCastrated] = useState(false)
  const [petSize, setPetSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [petPhotos, setPetPhotos] = useState<PendingPhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)

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
          age: petAge !== '' ? (petAgeUnit === 'years' ? parseInt(petAge, 10) * 12 : parseInt(petAge, 10)) : 0,
          gender: petGender,
          species: petSpecies,
          vaccinated: petVaccinated,
          castrated: petCastrated,
          size: petSize,
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

    // Skip MFA enrollment if already configured (e.g. during post-registration prompt)
    const { data: mfaData } = await getMethods()
    if (mfaData?.mfa_enabled) {
      setSubmitted(true)
    } else {
      setShowMfaEnrollment(true)
    }
  }

  const canSubmit =
    centerName.trim() !== '' &&
    phone.trim() !== '' &&
    address.trim() !== '' &&
    !submitting

  if (showMfaEnrollment) {
    return (
      <MfaEnrollment
        onComplete={() => {
          setShowMfaEnrollment(false)
          setSubmitted(true)
        }}
        breadcrumbItems={[
          { label: 'Inicio', href: '/' },
          { label: 'Registro', href: '/auth/register' },
          { label: 'Rol', href: '/auth/role-selection', changeRole: true },
          { label: 'Centro de Rescate' },
          { label: 'Seguridad', current: true },
        ]}
      />
    )
  }

  if (submitted) {
    return (
      <div className="backdark relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundBeams />
        <div className="relative z-10 w-full rounded-2xl max-w-md text-center space-y-6 bg-background/90 backdrop-blur-xl p-16 inset-shadow-[1px_1px_1px_var(--color-input)]">
          <FontAwesomeIcon icon={faPaw} className="text-6xl text-foreground" />
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

      <OnboardingNav 
        items={[
          {label: 'Inicio', current: false, href: "/"}, 
          {label: 'Registro', current: false, href: "/auth/register"},
          {label: 'Rol', current: false, href: "/auth/role-selection", changeRole: true},
          {label: 'Centro de Rescate', current: true}
        ]}
      />

      {/* Page content */}
      <main className="backdrop-blur-sm my-4 rounded-2xl relative z-10 max-w-230 mx-auto px-8 py-12 pb-20 bg-background/30  inset-shadow-[-1px_1px_1px_1px_var(--color-input)]">

        <h1 className="text-2xl font-bold tracking-tight mb-1">Registra tu centro de rescate</h1>
        <p className="text-sm text-muted-foreground mb-10">Completa tu perfil para que adoptantes puedan encontrarte</p>

        {/* Two-column: center fields + pet photo grid */}
        <div>

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
        </div>

        {/* "Opcional" divider */}
        <div className="grid grid-cols-2 gap-y-8">
          <div className="my-8 col-span-4 flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Opcional
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Optional pet section */}
          <p className="col-span-4 self-center text-base font-semibold mb-5">¿Tienes una mascota lista para adopción?</p>

          <div className="flex flex-col gap-8 mb-12">
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
                Edad
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="ej. 8"
                  value={petAge}
                  onChange={(e) => setPetAge(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setPetAgeUnit('months')}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    petAgeUnit === 'months' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  Meses
                </button>
                <button
                  type="button"
                  onClick={() => setPetAgeUnit('years')}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    petAgeUnit === 'years' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  Años
                </button>
              </div>
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
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      petGender === 'male'
                        ? 'bg-pop-550/10 border-pop-550 text-foreground'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    <FontAwesomeIcon icon={faMars} /> Macho
                  </button>
                  <button
                    type="button"
                    onClick={() => setPetGender('female')}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ease-in duration-300 ${
                      petGender === 'female'
                        ? 'bg-pop-550/10 border-pop-550 text-foreground'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    <FontAwesomeIcon icon={faVenus} /> Hembra
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
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      petSpecies === 'dog'
                        ? 'bg-pop-550/10 border-pop-550 text-foreground'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    <FontAwesomeIcon icon={faDog} /> Perro
                  </button>
                  <button
                    type="button"
                    onClick={() => setPetSpecies('cat')}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      petSpecies === 'cat'
                        ? 'bg-pop-550/10 border-pop-550 text-foreground'
                        : 'border-input text-muted-foreground hover:border-border'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCat} /> Gato
                  </button>
                </div>
              </div>
            </div>
            {/* Vaccinated / Castrated */}
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={petVaccinated} onChange={e => setPetVaccinated(e.target.checked)} className="w-4 h-4 rounded accent-pop-550" />
                <FontAwesomeIcon icon={faSyringe} className="text-sm text-muted-foreground" />
                <span className="text-sm text-foreground">Vacunado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={petCastrated} onChange={e => setPetCastrated(e.target.checked)} className="w-4 h-4 rounded accent-pop-550" />
                <FontAwesomeIcon icon={faScissors} className="text-sm text-muted-foreground" />
                <span className="text-sm text-foreground">Castrado</span>
              </label>
            </div>
            {/* Size */}
            <div className="flex flex-col gap-1.5 mt-3">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tamaño</label>
              <select
                value={petSize}
                onChange={e => setPetSize(e.target.value as 'small' | 'medium' | 'large')}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="small">Pequeño</option>
                <option value="medium">Mediano</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </div>

          {/* Right: Pet photo grid */}
          <div className="flex flex-col gap-2 ms-8">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Vista Previa {' '}
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files ?? [])
                e.target.value = ''
              }}
            />
            {petPhotos.length > 0 ? (
              /* Pet card preview — mirrors the dashboard card exactly */
              <div className="rounded-xl border inset-shadow-[0px_0px_1px_2px_var(--color-input)] bg-card overflow-hidden">
                <div className="relative aspect-square bg-muted/30">
                  <CardCarousel urls={petPhotos.map((p) => p.url)} />
                  {/* Clear all photos */}
                  <button
                    type="button"
                    onClick={() => { petPhotos.forEach((p) => URL.revokeObjectURL(p.url)); setPetPhotos([]) }}
                    className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-background/90 shadow-sm hover:bg-background transition-colors"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-primary" />
                  </button>
                  {/* Add more photos */}
                  {petPhotos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-background/90 shadow-sm hover:bg-background transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-primary" />
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{petName || 'Sin nombre'}</p>
                </div>
              </div>
            ) : (
              /* Card silhouette — same shape as the preview, dashed border photo area */
              <div
                className="rounded-xl border inset-shadow-[1px_1px_1px_1px_var(--color-input)] bg-card overflow-hidden cursor-pointer"
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
              >
                <div className={`relative aspect-square border-b-2 border-dashed flex items-center justify-center transition-colors ${dragging ? 'border-pop-550 bg-pop-550/5' : 'border-input hover:border-pop-550/30'}`}>
                  <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-5xl text-muted-foreground/20" />
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{petName || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      petAge && `${petAge} años`,
                      petGender === 'male' ? <FontAwesomeIcon icon={faMars} /> : <FontAwesomeIcon icon={faVenus} />,
                      petSpecies === 'dog' ? <FontAwesomeIcon icon={faDog} /> : <FontAwesomeIcon icon={faCat} />,
                    ].filter(Boolean).map((item, i, arr) => (
                      <React.Fragment key={i}>{item}{i < arr.length - 1 && ' · '}</React.Fragment>
                    ))}
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Arrastra y suelta · Click para subir imagen de mascota
            </p>
          </div>          

          {/* Footer */}
          <div className="col-span-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('pelu_changing_role', '1')
                router.push('/auth/role-selection')
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
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
        </div>
        <div className="animate-wiggle col-span-full m-8">
          {/* Error */}
          {submitError && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
              {submitError}
            </div>
          )}
        </div>      
      </main>
    </div>
  )
}
