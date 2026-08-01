'use client'
import { OnboardingNav } from './onboarding-nav'
import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faPaw,
  faArrowUpFromBracket,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import Carousel from '@/components/Carousel'
import { useTranslation } from 'react-i18next'
import {
  createBusiness,
  uploadBusinessPhoto,
  BUSINESS_SERVICE_OPTIONS,
  OperatingHours,
} from '@/lib/api/businesses'
import { BackgroundBeams } from '@/components/ui/beams'
import { LogoLoader } from '@/components/logo-loader'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { getMethods } from '@/lib/api/mfa'

/*
  Service keys come from BUSINESS_SERVICE_OPTIONS, which mirrors the backend's
  canonical list. The private list that used to live here wrote `taxi`/`walking`/`vet` —
  keys the backend now rejects outright, and which the public directory rendered as
  raw strings. `pet_taxi` is excluded on purpose: the marketplace opt-in needs pricing
  to mean anything, and a pending business cannot be listed, so it lives in settings.
*/

// Labels come from `auth.business_wizard.days.<key>` at render time.
const DAYS: { key: keyof OperatingHours }[] = [
  { key: 'monday' },
  { key: 'tuesday' },
  { key: 'wednesday' },
  { key: 'thursday' },
  { key: 'friday' },
  { key: 'saturday' },
  { key: 'sunday' },
]

function CardCarousel({ urls }: { urls: string[] }) {
  // `feed.photo_position` lives in the `pets` namespace, not this file's
  // `business`; every namespace is bundled statically, so the extra hook is free.
  const { t } = useTranslation('pets')
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
          dotLabel={(n, total) => t('feed.photo_position', { n, total })}
          dotsGroupLabel={t('member.photos_label')}
          className="relative overflow-hidden w-full h-full"
        />
      )}
    </div>
  )
}

function makeDefaultHours(): OperatingHours {
  return {
    monday:    { open: true,  from: '09:00', to: '18:00' },
    tuesday:   { open: true,  from: '09:00', to: '18:00' },
    wednesday: { open: true,  from: '09:00', to: '18:00' },
    thursday:  { open: true,  from: '09:00', to: '18:00' },
    friday:    { open: true,  from: '09:00', to: '18:00' },
    saturday:  { open: false, from: '09:00', to: '14:00' },
    sunday:    { open: false, from: '09:00', to: '14:00' },
  }
}

export function BusinessWizard() {
  const router = useRouter()
  // Only the service labels are translated here; the rest of this wizard is still
  // hardcoded Spanish, so the hook is deliberately narrow.
  const { t } = useTranslation('auth')

  // Required fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [rnc, setRnc] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [otherService, setOtherService] = useState('')

  // Optional fields
  const [instagram, setInstagram] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState<OperatingHours>(makeDefaultHours)
  const [coverPhoto, setCoverPhoto] = useState<{ url: string; file: File } | null>(null)
  const [dragging, setDragging] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)

  const toggleService = (key: string) => {
    setServices((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    )
  }

  const toggleDay = (day: keyof OperatingHours) => {
    setHours((prev) => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day]!, open: !prev[day]!.open } : { open: true, from: '09:00', to: '18:00' },
    }))
  }

  const updateDayTime = (day: keyof OperatingHours, field: 'from' | 'to', value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day]!, [field]: value },
    }))
  }

  const addCoverPhoto = (files: FileList | File[]) => {
    const file = Array.from(files).find(
      (f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024,
    )
    if (!file) return
    if (coverPhoto) URL.revokeObjectURL(coverPhoto.url)
    setCoverPhoto({ url: URL.createObjectURL(file), file })
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !rnc.trim() || services.length === 0) return
    setSubmitting(true)
    setSubmitError(null)

    const { error } = await createBusiness({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      rnc: rnc.trim(),
      services,
      ...(services.includes('other') && otherService.trim() && { other_service: otherService.trim() }),
      ...(instagram.trim() && { instagram: instagram.trim() }),
      ...(description.trim() && { description: description.trim() }),
      operating_hours: hours,
    })

    if (error) {
      setSubmitError(error)
      setSubmitting(false)
      return
    }

    // Upload cover photo (non-fatal if it fails)
    if (coverPhoto) {
      await uploadBusinessPhoto(coverPhoto.file)
      URL.revokeObjectURL(coverPhoto.url)
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
    name.trim() !== '' &&
    phone.trim() !== '' &&
    address.trim() !== '' &&
    rnc.trim() !== '' &&
    services.length > 0 &&
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
          { label: t('business_wizard.nav_current') },
          { label: t('security', { ns: 'common' }), current: true },
        ]}
      />
    )
  }

  if (submitted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundBeams />
        <div className="relative z-10 w-full rounded-2xl max-w-md text-center space-y-6 bg-background backdrop-blur-md p-16">
          <FontAwesomeIcon icon={faPaw} className="text-6xl text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{t('business_wizard.success_title')}</h1>
          <p className="text-muted-foreground">
            {t('business_wizard.success_subtitle')}
          </p>
          <div className="p-4 bg-muted border border-border rounded-2xl text-sm text-muted-foreground">
            {t('business_wizard.status_label')} <span className="font-medium text-foreground">{t('business_wizard.status_pending')}</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            {t('business_wizard.go_home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />
      {submitting && <LogoLoader />}

      <OnboardingNav
        items={[
          { label: t('home', { ns: 'common' }), current: false, href: '/' },
          { label: t('register', { ns: 'common' }), current: false, href: '/auth/register' },
          { label: t('role', { ns: 'common' }), current: false, href: '/auth/role-selection', changeRole: true },
          { label: t('business_wizard.nav_current'), current: true },
        ]}
      />

      <main className="my-4 rounded-2xl relative z-10 max-w-230 mx-auto px-8 py-12 pb-20 bg-background shadow-post border-2 border-border">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{t('business_wizard.title')}</h1>
        <p className="text-sm text-muted-foreground mb-10">
          {t('business_wizard.subtitle')}
        </p>

        {/* Required fields */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('business_wizard.name_label')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t('business_wizard.name_placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('business_wizard.phone_label')} <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              placeholder={t('business_wizard.phone_placeholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('business_wizard.address_label')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t('business_wizard.address_placeholder')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('business_wizard.rnc_label')} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder={t('business_wizard.rnc_placeholder')}
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('instagram', { ns: 'common' })}{' '}
                <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                  {t('optional', { ns: 'common' })}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  @
                </span>
                <input
                  type="text"
                  placeholder={t('business_wizard.instagram_placeholder')}
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 pl-8 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Services checkboxes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('business_wizard.services_label')} <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BUSINESS_SERVICE_OPTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={services.includes(key)}
                  onClick={() => toggleService(key)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    services.includes(key)
                      ? 'bg-pop-550/10 border-pop-550 text-foreground'
                      : 'border-input text-muted-foreground hover:border-border'
                  }`}
                >
                  {t(`service_providers.services.${key}`, { ns: 'business' })}
                </button>
              ))}
            </div>
            {services.includes('other') && (
              <input
                type="text"
                placeholder={t('business_wizard.other_service_placeholder')}
                value={otherService}
                onChange={(e) => setOtherService(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring mt-2"
              />
            )}
          </div>
        </div>

        {/* "Opcional" divider */}
        <div className="grid grid-cols-2 gap-y-8">
          <div className="my-8 col-span-4 flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
              {t('business_wizard.optional_divider')}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Left column: description + operating hours */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('business_wizard.description_label')}{' '}
                <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                  ({description.length}/300)
                </span>
              </label>
              <textarea
                placeholder={t('business_wizard.description_placeholder')}
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 300) setDescription(e.target.value)
                }}
                rows={3}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Operating hours */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('business_wizard.hours_label')}
              </label>
              <div className="flex flex-col gap-2">
                {DAYS.map(({ key }) => (
                  <div key={key} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(key)}
                      className={`w-12 text-xs font-semibold rounded-xl border px-2 py-1.5 transition-colors ${
                        hours[key]?.open
                          ? 'bg-pop-550/10 border-pop-550 text-foreground'
                          : 'border-input text-muted-foreground hover:border-border'
                      }`}
                    >
                      {t(`business_wizard.days.${key}`)}
                    </button>
                    {hours[key]?.open ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={hours[key]!.from}
                          onChange={(e) => updateDayTime(key, 'from', e.target.value)}
                          className="rounded-xl border border-input bg-background/50 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground">—</span>
                        <input
                          type="time"
                          value={hours[key]!.to}
                          onChange={(e) => updateDayTime(key, 'to', e.target.value)}
                          className="rounded-xl border border-input bg-background/50 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">{t('business_wizard.closed')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: cover photo preview */}
          <div className="flex flex-col gap-2 ms-8">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('business_wizard.preview')}
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                addCoverPhoto(e.target.files ?? [])
                e.target.value = ''
              }}
            />
            {coverPhoto ? (
              <div className="rounded-xl border inset-shadow-[0px_0px_1px_2px_var(--color-input)] bg-card overflow-hidden">
                <div className="relative aspect-square bg-muted/30">
                  <CardCarousel urls={[coverPhoto.url]} />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(coverPhoto.url)
                      setCoverPhoto(null)
                    }}
                    className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-background/90 shadow-sm hover:bg-background transition-colors"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-primary" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{name || t('business_wizard.unnamed')}</p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl border inset-shadow-[1px_1px_1px_1px_var(--color-input)] bg-card overflow-hidden cursor-pointer"
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addCoverPhoto(e.dataTransfer.files) }}
              >
                <div className={`relative aspect-square border-b-2 border-dashed flex items-center justify-center transition-colors ${dragging ? 'border-pop-550/50 bg-pop-550/5' : 'border-input hover:border-pop-550/30'}`}>
                  <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-5xl text-muted-foreground/20" />
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{name || t('business_wizard.unnamed')}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {t('business_wizard.upload_hint')}
            </p>
          </div>

          {/* Footer */}
          <div className="col-span-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('pelu_changing_role', '1')
                router.push('/auth/role-selection')
              }}
              className="border-border border-2 px-8 py-3 rounded-xl bg-background flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
              {t('business_wizard.change_role')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-8 py-3 bg-pop-550 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? t('business_wizard.submitting') : t('business_wizard.submit')}
            </button>
          </div>
        </div>
        <div className="animate-wiggle col-span-full m-8">
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
