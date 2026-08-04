'use client'
import { OnboardingNav } from './onboarding-nav'
import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
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
import { useTranslation } from 'react-i18next'
import { createRescueCenter, getMyRescueCenter } from '@/lib/api/rescue-centers'
import { BackgroundBeams } from '@/components/ui/beams'
import { LogoLoader } from '@/components/logo-loader'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { getMethods } from '@/lib/api/mfa'
import Carousel from '@/components/Carousel'
import { createPet, uploadPhotos } from '@/lib/api/pets'


interface PendingPhoto {
  url: string
  file: File
}

function CardCarousel({ urls }: { urls: string[] }) {
  // `feed.photo_position` lives in the `pets` namespace, not this file's `auth`;
  // every namespace is bundled statically, so the extra hook is free.
  const { t } = useTranslation('pets')
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    title: '',
    description: '',
    icon: null as unknown as ReactNode,
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
          dotLabel={(n, total) => t('feed.photo_position', { n, total })}
          dotsGroupLabel={t('member.photos_label')}
          className="relative overflow-hidden w-full h-full"
        />
      )}
    </div>
  )
}


export function RescueCenterWizard() {
  const router = useLocaleRouter()
  const { t } = useTranslation('auth')

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

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)

  // Post-registration pet upload state
  const [showPetForm, setShowPetForm] = useState(false)
  const [petName, setPetName] = useState('')
  const [petDescription, setPetDescription] = useState('')
  const [petAge, setPetAge] = useState('')
  const [petGender, setPetGender] = useState<'male' | 'female'>('male')
  const [petSpecies, setPetSpecies] = useState<'dog' | 'cat'>('dog')
  const [petAgeUnit, setPetAgeUnit] = useState<'months' | 'years'>('years')
  const [petVaccinated, setPetVaccinated] = useState(false)
  const [petCastrated, setPetCastrated] = useState(false)
  const [petSize, setPetSize] = useState<'small' | 'medium' | 'large' | 'giant'>('medium')
  const [petPhotos, setPetPhotos] = useState<PendingPhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const [petSubmitting, setPetSubmitting] = useState(false)
  const [petAdded, setPetAdded] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
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

  const handlePetSubmit = async () => {
    if (!petName.trim()) return
    setPetSubmitting(true)
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
      petPhotos.forEach((p) => URL.revokeObjectURL(p.url))
      setPetAdded(true)
    } catch {
      // Pet creation failure is non-fatal
    }
    setPetSubmitting(false)
  }

  const resetPetForm = () => {
    setPetName('')
    setPetDescription('')
    setPetAge('')
    setPetGender('male')
    setPetSpecies('dog')
    setPetAgeUnit('years')
    setPetVaccinated(false)
    setPetCastrated(false)
    setPetSize('medium')
    setPetPhotos([])
    setPetAdded(false)
  }

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

    // Skip MFA enrollment if already configured (e.g. during post-registration prompt)
    // `submitting` stays set across this call: it is a second round trip, and
    // clearing it first blinked the loader off and put the form back on screen
    // while the app was still deciding which screen comes next.
    const { data: mfaData } = await getMethods()
    setSubmitting(false)
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
          { label: t('home', { ns: 'common' }), href: '/' },
          { label: t('register', { ns: 'common' }), href: '/auth/register' },
          { label: t('role', { ns: 'common' }), href: '/auth/role-selection', changeRole: true },
          { label: t('rc_wizard.nav_current') },
          { label: t('security', { ns: 'common' }), current: true },
        ]}
      />
    )
  }

  if (submitted) {
    // Pet upload form
    if (showPetForm && !petAdded) {
      return (
        <div className="dark relative min-h-screen overflow-hidden bg-background">
          <BackgroundBeams />
          <main className="my-4 rounded-2xl relative z-10 max-w-md mx-auto p-8 pb-20 bg-background shadow-post">
            <h1 className="text-2xl font-bold tracking-tight mb-1">{t('rc_wizard.add_pets_prompt')}</h1>
            <p className="text-sm text-muted-foreground mb-10">{t('rc_wizard.success_subtitle')}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-8">
              {/* Left: Pet fields */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('rc_wizard.pet_name_label')}</label>
                  <input type="text" placeholder={t('rc_wizard.pet_name_placeholder')} value={petName} onChange={(e) => setPetName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('rc_wizard.pet_description_label')}</label>
                  <input type="text" placeholder={t('rc_wizard.pet_description_placeholder')} value={petDescription} onChange={(e) => setPetDescription(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('rc_wizard.pet_age_label')}</label>
                  <div className="flex gap-2">
                    <input type="number" min={0} placeholder={t('rc_wizard.pet_age_placeholder')} value={petAge} onChange={(e) => setPetAge(e.target.value)}
                      className="flex-1 rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <button type="button" onClick={() => setPetAgeUnit('months')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${petAgeUnit === 'months' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'}`}>
                      {t('rc_wizard.unit_months')}
                    </button>
                    <button type="button" onClick={() => setPetAgeUnit('years')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${petAgeUnit === 'years' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'}`}>
                      {t('rc_wizard.unit_years')}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('rc_wizard.gender_label')}</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPetGender('male')}
                        className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${petGender === 'male' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'}`}>
                        <FontAwesomeIcon icon={faMars} /> {t('rc_wizard.male')}
                      </button>
                      <button type="button" onClick={() => setPetGender('female')}
                        className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${petGender === 'female' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'}`}>
                        <FontAwesomeIcon icon={faVenus} /> {t('rc_wizard.female')}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('rc_wizard.type_label')}</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPetSpecies('dog')}
                        className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${petSpecies === 'dog' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'}`}>
                        <FontAwesomeIcon icon={faDog} /> {t('rc_wizard.dog')}
                      </button>
                      <button type="button" onClick={() => setPetSpecies('cat')}
                        className={`flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${petSpecies === 'cat' ? 'bg-pop-550/10 border-pop-550 text-foreground' : 'border-input text-muted-foreground hover:border-border'}`}>
                        <FontAwesomeIcon icon={faCat} /> {t('rc_wizard.cat')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={petVaccinated} onChange={e => setPetVaccinated(e.target.checked)} className="w-4 h-4 rounded accent-pop-550" />
                    <FontAwesomeIcon icon={faSyringe} className="text-sm text-muted-foreground" />
                    <span className="text-sm text-foreground">{t('rc_wizard.vaccinated')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={petCastrated} onChange={e => setPetCastrated(e.target.checked)} className="w-4 h-4 rounded accent-pop-550" />
                    <FontAwesomeIcon icon={faScissors} className="text-sm text-muted-foreground" />
                    <span className="text-sm text-foreground">{t('rc_wizard.neutered')}</span>
                  </label>
                </div>
                <div className="flex flex-col gap-1.5 mt-3">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('rc_wizard.size_label')}</label>
                  <select value={petSize} onChange={e => setPetSize(e.target.value as 'small' | 'medium' | 'large' | 'giant')}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
                    <option value="small">{t('rc_wizard.size_small')}</option>
                    <option value="medium">{t('rc_wizard.size_medium')}</option>
                    <option value="large">{t('rc_wizard.size_large')}</option>
                    <option value="giant">{t('rc_wizard.size_giant')}</option>
                  </select>
                </div>
              </div>

              {/* Right: Photo upload + preview */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('rc_wizard.preview')}</label>
                <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
                  onChange={(e) => { addFiles(e.target.files ?? []); e.target.value = '' }} />
                {petPhotos.length > 0 ? (
                  <div className="rounded-xl border inset-shadow-[0px_0px_1px_2px_var(--color-input)] bg-card overflow-hidden">
                    <div className="relative aspect-square bg-muted/30">
                      <CardCarousel urls={petPhotos.map((p) => p.url)} />
                      <button type="button" onClick={() => { petPhotos.forEach((p) => URL.revokeObjectURL(p.url)); setPetPhotos([]) }}
                        className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-background/90 shadow-sm hover:bg-background transition-colors">
                        <FontAwesomeIcon icon={faXmark} className="text-primary" />
                      </button>
                      {petPhotos.length < MAX_PHOTOS && (
                        <button type="button" onClick={() => photoInputRef.current?.click()}
                          className="absolute bottom-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-background/90 shadow-sm hover:bg-background transition-colors">
                          <FontAwesomeIcon icon={faPlus} className="text-primary" />
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{petName || t('rc_wizard.unnamed')}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {petAge && <span>{petAge} {petAgeUnit === 'years' ? t('rc_wizard.age_years') : t('rc_wizard.age_months')}</span>}
                        {petAge && <span>·</span>}
                        <FontAwesomeIcon icon={petGender === 'male' ? faMars : faVenus} className="text-xs" />
                        <span>·</span>
                        <FontAwesomeIcon icon={petSpecies === 'dog' ? faDog : faCat} className="text-xs" />
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <FontAwesomeIcon icon={faSyringe} className={`text-xs ${petVaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                        <FontAwesomeIcon icon={faScissors} className={`text-xs ${petCastrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                        <span className="text-xs text-muted-foreground">{t(`rc_wizard.size_${petSize}`)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border inset-shadow-[1px_1px_1px_1px_var(--color-input)] bg-card overflow-hidden cursor-pointer"
                    onClick={() => photoInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}>
                    <div className={`relative aspect-square border-b-2 border-dashed flex items-center justify-center transition-colors ${dragging ? 'border-pop-550 bg-pop-550/5' : 'border-input hover:border-pop-550/30'}`}>
                      <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-5xl text-muted-foreground/20" />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{petName || t('rc_wizard.unnamed')}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {petAge && <span>{petAge} {petAgeUnit === 'years' ? t('rc_wizard.age_years') : t('rc_wizard.age_months')}</span>}
                        {petAge && <span>·</span>}
                        <FontAwesomeIcon icon={petGender === 'male' ? faMars : faVenus} className="text-xs" />
                        <span>·</span>
                        <FontAwesomeIcon icon={petSpecies === 'dog' ? faDog : faCat} className="text-xs" />
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <FontAwesomeIcon icon={faSyringe} className={`text-xs ${petVaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                        <FontAwesomeIcon icon={faScissors} className={`text-xs ${petCastrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                        <span className="text-xs text-muted-foreground">{t(`rc_wizard.size_${petSize}`)}</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center">{t('rc_wizard.upload_hint')}</p>
              </div>

              {/* Footer */}
              <div className="col-span-full flex items-center justify-between mt-4">
                <button type="button" onClick={() => { setShowPetForm(false); resetPetForm() }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  {t('back', { ns: 'common' })}
                </button>
                <button type="button" onClick={handlePetSubmit} disabled={!petName.trim() || petSubmitting}
                  className="px-8 py-3 bg-pop-550 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  {petSubmitting ? t('rc_wizard.pet_submitting') : t('rc_wizard.pet_submit')}
                </button>
              </div>
            </div>
          </main>
        </div>
      )
    }

    // Decision point / Pet added confirmation
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundBeams />
        <div className="relative z-10 w-full rounded-2xl max-w-md text-center space-y-6 bg-background p-16 inset-shadow-border-border shadow-post">
          {petAdded ? (
            <>
              <FontAwesomeIcon icon={faPaw} className="text-6xl text-pop-550" />
              <h1 className="text-2xl font-bold text-foreground">{t('rc_wizard.pet_added')}</h1>
              <div className="flex flex-col gap-3">
                <button onClick={() => { resetPetForm(); setShowPetForm(true) }}
                  className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                  {t('rc_wizard.add_another')}
                </button>
                <button onClick={() => router.push('/')}
                  className="px-6 py-3 border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors">
                  {t('rc_wizard.go_home')}
                </button>
              </div>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPaw} className="text-6xl text-foreground" />
              <h1 className="text-2xl font-bold text-foreground">{t('rc_wizard.success_title')}</h1>
              <p className="text-muted-foreground">{t('rc_wizard.success_subtitle')}</p>
              <div className="p-4 bg-muted border border-border rounded-2xl text-sm text-muted-foreground">
                {t('rc_wizard.status_label')} <span className="font-medium text-foreground">{t('rc_wizard.status_pending')}</span>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => setShowPetForm(true)}
                  className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                  {t('rc_wizard.add_pets_prompt')}
                </button>
                <button onClick={() => router.push('/')}
                  className="px-6 py-3 border border-border text-foreground rounded-xl font-medium hover:bg-muted transition-colors">
                  {t('rc_wizard.go_home')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="dark relative h-screen overflow-hidden bg-background">
      <BackgroundBeams />
      {/* petSubmitting too: createPet is followed by uploadPhotos, which is the
          slowest thing in this whole flow. */}
      {(submitting || petSubmitting) && <LogoLoader />}

      <OnboardingNav
        items={[
          {label: t('home', { ns: 'common' }), current: false, href: "/"},
          {label: t('register', { ns: 'common' }), current: false, href: "/auth/register"},
          {label: t('role', { ns: 'common' }), current: false, href: "/auth/role-selection", changeRole: true},
          {label: t('rc_wizard.nav_current'), current: true}
        ]}
      />

      {/* Page content */}
      <main className="my-4 rounded-2xl relative z-10 max-w-3xl mx-auto px-8 py-8 bg-background border-border shadow-post">

        <h1 className="text-2xl font-bold tracking-tight mb-1">{t('rc_wizard.title')}</h1>
        <p className="text-sm text-muted-foreground mb-10">{t('rc_wizard.subtitle')}</p>

        {/* Center fields */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('rc_wizard.name_label')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t('rc_wizard.name_placeholder')}
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('rc_wizard.phone_label')} <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              placeholder={t('rc_wizard.phone_placeholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('rc_wizard.address_label')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t('rc_wizard.address_placeholder')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('rc_wizard.rnc_label')}{' '}
                <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                  {t('optional', { ns: 'common' })}
                </span>
              </label>
              <input
                type="text"
                placeholder={t('rc_wizard.rnc_placeholder')}
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('website', { ns: 'common' })}{' '}
                <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                  {t('optional', { ns: 'common' })}
                </span>
              </label>
              <input
                type="url"
                placeholder={t('rc_wizard.website_placeholder')}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('instagram', { ns: 'common' })}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                @
              </span>
              <input
                type="text"
                placeholder={t('rc_wizard.instagram_placeholder')}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 pl-8 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('pelu_changing_role', '1')
              router.push('/auth/role-selection')
            }}
            className="flex border-border rounded-xl p-4 border-2 items-center gap-2 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            {t('rc_wizard.change_role')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-8 py-3 bg-pop-550 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? t('rc_wizard.submitting') : t('rc_wizard.submit')}
          </button>
        </div>

        {submitError && (
          <div className="animate-wiggle mt-8 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
            {submitError}
          </div>
        )}
      </main>
    </div>
  )
}
