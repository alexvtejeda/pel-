'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import {
  getMyBusiness,
  updateBusiness,
  uploadBusinessPhoto,
  BUSINESS_SERVICE_OPTIONS,
  PET_TAXI_SERVICE,
  DayHours,
  OperatingHours,
  UpdateBusinessInput,
} from '@/lib/api/businesses'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faTrash, faPlus, faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { useMfaError } from '@/components/auth/mfa/use-mfa-error'
import { MfaMethodInfo } from '@/lib/types/user'
import { MfaPasswordConfirm } from '@/components/auth/mfa/mfa-password-confirm'
import { MfaRecoveryModal } from '@/components/auth/mfa/mfa-recovery-modal'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const INPUT_CLASS =
  'w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring'

/** Mirrors the 0–50000 DOP bound the backend enforces on every taxi_* field. */
const FEE_MAX = 50000

/**
 * Mirrors the backend's utf8.RuneCountInString cap. Spread rather than `.length`
 * so an emoji counts as one character here and one rune there.
 */
const TERMS_MAX = 5000
const charCount = (s: string) => [...s].length

/** Empty is valid — it means "leave it to the platform default". */
function feeOutOfRange(value: string): boolean {
  if (value.trim() === '') return false
  const n = Number(value)
  return !Number.isFinite(n) || n < 0 || n > FEE_MAX
}

export function SettingsTab() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { t } = useTranslation('auth')
  // The MFA copy below lives in `auth`; the business copy lives in `business`.
  const { t: tb } = useTranslation('business')
  const resolveError = useMfaError()

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.display_name ?? user?.email ?? '')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [instagram, setInstagram] = useState('')
  const [rnc, setRnc] = useState('')
  const [description, setDescription] = useState('')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)

  // Services fields
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [otherService, setOtherService] = useState('')
  const [price, setPrice] = useState<string>('')
  const [operatingHours, setOperatingHours] = useState<Record<string, DayHours>>({})

  // Pet-taxi marketplace opt-in + pricing. Kept as strings so an empty input stays
  // distinguishable from an explicit 0 — the backend reads NULL as "use the default".
  const [taxiBaseFee, setTaxiBaseFee] = useState<string>('')
  const [taxiPerKm, setTaxiPerKm] = useState<string>('')
  const [taxiPerMinute, setTaxiPerMinute] = useState<string>('')
  // Size-band pricing. Held as strings for the same reason as the fees above: an
  // empty input must stay distinguishable from an explicit 0, because the backend
  // reads NULL as "use the platform default" and 0 as "this band is free".
  const [sizePricingEnabled, setSizePricingEnabled] = useState(false)
  const [surchargeSmall, setSurchargeSmall] = useState<string>('')
  const [surchargeMedium, setSurchargeMedium] = useState<string>('')
  const [surchargeLarge, setSurchargeLarge] = useState<string>('')
  const [surchargeGiant, setSurchargeGiant] = useState<string>('')
  // A price floor, not another fee to add. Kept outside the size-pricing block
  // because it applies whether or not the business charges by size.
  const [minimumFare, setMinimumFare] = useState<string>('')
  const [terms, setTerms] = useState('')

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Danger zone
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // MFA
  const [mfaMethods, setMfaMethods] = useState<MfaMethodInfo[]>([])
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [recoveryRemaining, setRecoveryRemaining] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<MfaMethodInfo | null>(null)
  const [mfaDeleteError, setMfaDeleteError] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [showAddMethod, setShowAddMethod] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)

  // Load business data
  useEffect(() => {
    getMyBusiness().then(({ data }) => {
      if (data) {
        setBusinessName(data.name ?? '')
        setPhone(data.phone ?? '')
        setAddress(data.address ?? '')
        setInstagram(data.instagram ?? '')
        setRnc(data.rnc ?? '')
        setDescription(data.description ?? '')
        setCoverPhotoUrl(data.cover_photo_url ?? null)
        setSelectedServices(Array.isArray(data.services) ? data.services : [])
        setOtherService(data.other_service ?? '')
        setPrice(data.price != null ? String(data.price) : '')
        setTaxiBaseFee(data.taxi_base_fee != null ? String(data.taxi_base_fee) : '')
        setTaxiPerKm(data.taxi_per_km != null ? String(data.taxi_per_km) : '')
        setTaxiPerMinute(data.taxi_per_minute != null ? String(data.taxi_per_minute) : '')
        setSizePricingEnabled(data.taxi_size_pricing_enabled ?? false)
        setSurchargeSmall(data.taxi_surcharge_small != null ? String(data.taxi_surcharge_small) : '')
        setSurchargeMedium(data.taxi_surcharge_medium != null ? String(data.taxi_surcharge_medium) : '')
        setSurchargeLarge(data.taxi_surcharge_large != null ? String(data.taxi_surcharge_large) : '')
        setSurchargeGiant(data.taxi_surcharge_giant != null ? String(data.taxi_surcharge_giant) : '')
        setMinimumFare(data.taxi_minimum_fare != null ? String(data.taxi_minimum_fare) : '')
        setTerms(data.terms_and_conditions ?? '')
        if (data.operating_hours) {
          const hours: Record<string, DayHours> = {}
          for (const day of DAYS) {
            const d = (data.operating_hours as OperatingHours)[day]
            hours[day] = d ?? { open: false, from: '09:00', to: '18:00' }
          }
          setOperatingHours(hours)
        } else {
          const defaultHours: Record<string, DayHours> = {}
          for (const day of DAYS) {
            defaultHours[day] = { open: false, from: '09:00', to: '18:00' }
          }
          setOperatingHours(defaultHours)
        }
      }
    })
  }, [])

  // Load MFA methods
  useEffect(() => {
    mfaApi.getMethods().then(({ data }) => {
      if (data) {
        setMfaMethods(Array.isArray(data.methods) ? data.methods : [])
        setMfaEnabled(data.mfa_enabled)
        setRecoveryRemaining(data.recovery_codes_remaining)
      }
    })
  }, [])

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverPhotoPreview(URL.createObjectURL(file))
    const { data, error } = await uploadBusinessPhoto(file)
    if (data?.url) setCoverPhotoUrl(data.url)
    if (error) setSaveError(error)
  }

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    )
  }

  const updateDay = (day: string, field: keyof DayHours, value: boolean | string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? { open: false, from: '09:00', to: '18:00' }), [field]: value },
    }))
  }

  // The opt-in is just the presence of `pet_taxi` in `services` — the same pair the
  // backend's marketplace filter reads, so there is no second source of truth.
  const petTaxiEnabled = selectedServices.includes(PET_TAXI_SERVICE)

  const togglePetTaxi = () => toggleService(PET_TAXI_SERVICE)

  // Gated on the opt-in because the inputs are only rendered then. Validating a
  // hidden field would disable the save button with nothing on screen explaining why.
  const baseFeeInvalid = petTaxiEnabled && feeOutOfRange(taxiBaseFee)
  const perKmInvalid = petTaxiEnabled && feeOutOfRange(taxiPerKm)
  const perMinuteInvalid = petTaxiEnabled && feeOutOfRange(taxiPerMinute)
  // Opted in without a base fee is the one combination the backend accepts but never
  // lists, so it is blocked here rather than saved into an invisible state.
  const baseFeeMissing = petTaxiEnabled && taxiBaseFee.trim() === ''
  const termsTooLong = charCount(terms.trim()) > TERMS_MAX

  // Gated on both toggles, for the same reason as the fees: the band inputs only
  // exist on screen once size pricing is on.
  const surchargeSmallInvalid =
    petTaxiEnabled && sizePricingEnabled && feeOutOfRange(surchargeSmall)
  const surchargeMediumInvalid =
    petTaxiEnabled && sizePricingEnabled && feeOutOfRange(surchargeMedium)
  const surchargeLargeInvalid =
    petTaxiEnabled && sizePricingEnabled && feeOutOfRange(surchargeLarge)
  const surchargeGiantInvalid =
    petTaxiEnabled && sizePricingEnabled && feeOutOfRange(surchargeGiant)
  const surchargeInvalid =
    surchargeSmallInvalid || surchargeMediumInvalid || surchargeLargeInvalid || surchargeGiantInvalid
  // Validated whenever pet-taxi is on: the floor is independent of size pricing.
  const minimumFareInvalid = petTaxiEnabled && feeOutOfRange(minimumFare)

  const saveBlocked =
    baseFeeInvalid ||
    perKmInvalid ||
    perMinuteInvalid ||
    baseFeeMissing ||
    surchargeInvalid ||
    minimumFareInvalid ||
    termsTooLong

  const handleSave = async () => {
    if (saveBlocked) return

    setSaving(true)
    setSaveError(null)

    // Save display name
    await apiClient('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    })

    // Build operating hours payload (only include days that are defined)
    const hoursPayload: OperatingHours = {}
    for (const day of DAYS) {
      const d = operatingHours[day]
      if (d) (hoursPayload as Record<string, DayHours>)[day] = d
    }

    // Only send the taxi fields that carry a value. The backend applies them with
    // COALESCE, so an explicit null would be a silent no-op rather than a clear —
    // opting out is done by dropping `pet_taxi` from `services`, which de-lists the
    // business whatever the stored fees still say.
    const pricingPayload: UpdateBusinessInput = {}
    if (petTaxiEnabled) {
      if (taxiBaseFee.trim() !== '') pricingPayload.taxi_base_fee = Number(taxiBaseFee)
      if (taxiPerKm.trim() !== '') pricingPayload.taxi_per_km = Number(taxiPerKm)
      if (taxiPerMinute.trim() !== '') pricingPayload.taxi_per_minute = Number(taxiPerMinute)
      if (minimumFare.trim() !== '') pricingPayload.taxi_minimum_fare = Number(minimumFare)

      // The toggle is always sent, unlike the amounts. It is COALESCEd too, so
      // omitting it when the business opts back out would silently leave size
      // pricing switched on — `false` has to travel explicitly.
      pricingPayload.taxi_size_pricing_enabled = sizePricingEnabled
      if (sizePricingEnabled) {
        if (surchargeSmall.trim() !== '') pricingPayload.taxi_surcharge_small = Number(surchargeSmall)
        if (surchargeMedium.trim() !== '') pricingPayload.taxi_surcharge_medium = Number(surchargeMedium)
        if (surchargeLarge.trim() !== '') pricingPayload.taxi_surcharge_large = Number(surchargeLarge)
        if (surchargeGiant.trim() !== '') pricingPayload.taxi_surcharge_giant = Number(surchargeGiant)
      }
    }

    const { error } = await updateBusiness({
      name: businessName,
      phone,
      address,
      instagram: instagram || undefined,
      rnc: rnc || undefined,
      description: description || undefined,
      services: selectedServices,
      other_service: otherService || undefined,
      operating_hours: hoursPayload,
      price: price !== '' ? Number(price) : null,
      terms_and_conditions: terms.trim(),
      ...pricingPayload,
    })

    setSaving(false)

    if (error) {
      setSaveError(error)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDeleteMethod = async (password: string) => {
    if (!deleteTarget) return
    setMfaDeleteError(null)
    let result
    if (deleteTarget.type === 'totp') result = await mfaApi.deleteTotp(password)
    else if (deleteTarget.type === 'webauthn') result = await mfaApi.deleteWebauthn(deleteTarget.id!, password)
    else if (deleteTarget.type === 'email') result = await mfaApi.deleteEmail(password)
    else return

    if (result?.error) {
      setMfaDeleteError(resolveError(result.error))
      return
    }
    setMfaMethods((prev) => prev.filter((m) => m !== deleteTarget))
    setDeleteTarget(null)
  }

  const handleRegenRecovery = async () => {
    const { data } = await mfaApi.regenerateRecoveryCodes()
    if (data) {
      setRecoveryCodes(data.recovery_codes)
      setRecoveryRemaining(data.recovery_codes.length)
    }
  }

  const methodIcon = (type: string) => {
    if (type === 'webauthn') return faKey
    if (type === 'totp') return faMobileScreen
    return faEnvelope
  }

  const methodLabel = (m: MfaMethodInfo) => {
    if (m.type === 'webauthn') return m.name || 'Passkey'
    if (m.type === 'totp') return t('mfa.enrollment.totp')
    return t('mfa.enrollment.email')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    const res = await apiClient('/api/v1/auth/me', { method: 'DELETE' })
    if (!res.ok) {
      setDeleteError('No se pudo eliminar la cuenta. Intenta de nuevo.')
      setIsDeleting(false)
      return
    }
    await logout()
    router.push('/')
  }

  const displayPhoto = coverPhotoPreview ?? coverPhotoUrl

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile section */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Perfil</h2>

        {/* Cover photo */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Foto de portada</label>
          {displayPhoto ? (
            <div
              className="relative w-full h-40 rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => coverInputRef.current?.click()}
            >
              <Image src={displayPhoto} alt="Foto de portada" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-input flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-2xl" />
              <span className="text-sm">Subir foto de portada</span>
              <span className="text-xs">JPG, PNG · máx. 5 MB</span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleCoverChange}
          />
        </div>

        {/* Display name */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nombre de usuario</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className={INPUT_CLASS}
          />
        </div>

        {/* Business name */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nombre del negocio</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ej. Peluquería Canina Pelú"
            className={INPUT_CLASS}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="809-000-0000"
            className={INPUT_CLASS}
          />
        </div>

        {/* Address */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, ciudad"
            className={INPUT_CLASS}
          />
        </div>

        {/* Instagram */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Instagram</label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="mi_negocio"
            className={INPUT_CLASS}
          />
          <p className="text-xs text-muted-foreground mt-1">Solo el nombre de usuario, sin @</p>
        </div>

        {/* RNC */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">RNC</label>
          <input
            type="text"
            value={rnc}
            onChange={(e) => setRnc(e.target.value)}
            placeholder="000-00000-0"
            className={INPUT_CLASS}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuéntanos sobre tu negocio..."
            rows={3}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Services section */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Servicios</h2>

        {/* Service toggles */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Servicios que ofreces</label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_SERVICE_OPTIONS.map((service) => {
              const active = selectedServices.includes(service)
              return (
                <button
                  key={service}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleService(service)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  {tb(`service_providers.services.${service}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Other service */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Otro servicio</label>
          <input
            type="text"
            value={otherService}
            onChange={(e) => setOtherService(e.target.value)}
            placeholder="Ej. Baño medicado"
            className={INPUT_CLASS}
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">¿Cuánto cobras por servicio?</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            min={0}
            className={INPUT_CLASS}
          />
        </div>

        {/* Operating hours */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Horario de atención</label>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const dayData = operatingHours[day] ?? { open: false, from: '09:00', to: '18:00' }
              return (
                <div key={day} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`day-${day}`}
                    checked={dayData.open}
                    onChange={(e) => updateDay(day, 'open', e.target.checked)}
                    className="shrink-0"
                  />
                  <label
                    htmlFor={`day-${day}`}
                    className="text-sm w-24 shrink-0 cursor-pointer"
                  >
                    {DAY_LABELS[day]}
                  </label>
                  {dayData.open && (
                    <>
                      <input
                        type="time"
                        value={dayData.from}
                        onChange={(e) => updateDay(day, 'from', e.target.value)}
                        className="px-2 py-1 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={dayData.to}
                        onChange={(e) => updateDay(day, 'to', e.target.value)}
                        className="px-2 py-1 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pet-taxi section */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">{tb('settings.pet_taxi_title')}</h2>
        <p className="text-xs text-muted-foreground">{tb('settings.pet_taxi_intro')}</p>

        {/* Marketplace opt-in */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="pet-taxi-optin"
            checked={petTaxiEnabled}
            onChange={togglePetTaxi}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="pet-taxi-optin" className="cursor-pointer">
            <span className="text-sm font-medium block">{tb('settings.pet_taxi_optin_label')}</span>
            <span className="text-xs text-muted-foreground">{tb('settings.pet_taxi_optin_hint')}</span>
          </label>
        </div>

        {petTaxiEnabled && (
          <div className="space-y-4">
            {/* Base fee */}
            <div>
              <label htmlFor="taxi-base-fee" className="text-xs text-muted-foreground mb-1 block">
                {tb('settings.pet_taxi_base_fee_label')}
              </label>
              <input
                id="taxi-base-fee"
                type="number"
                value={taxiBaseFee}
                onChange={(e) => setTaxiBaseFee(e.target.value)}
                placeholder="0"
                min={0}
                max={FEE_MAX}
                aria-invalid={baseFeeInvalid || baseFeeMissing}
                className={INPUT_CLASS}
              />
              {baseFeeInvalid && (
                <p className="text-xs text-destructive mt-1">{tb('settings.pet_taxi_range_error')}</p>
              )}
              {baseFeeMissing && (
                <p className="text-xs text-destructive mt-1">
                  {tb('settings.pet_taxi_base_fee_required')}
                </p>
              )}
            </div>

            {/* Per km */}
            <div>
              <label htmlFor="taxi-per-km" className="text-xs text-muted-foreground mb-1 block">
                {tb('settings.pet_taxi_per_km_label')}
              </label>
              <input
                id="taxi-per-km"
                type="number"
                value={taxiPerKm}
                onChange={(e) => setTaxiPerKm(e.target.value)}
                placeholder="0"
                min={0}
                max={FEE_MAX}
                aria-invalid={perKmInvalid}
                className={INPUT_CLASS}
              />
              {perKmInvalid && (
                <p className="text-xs text-destructive mt-1">{tb('settings.pet_taxi_range_error')}</p>
              )}
            </div>

            {/* Per minute */}
            <div>
              <label htmlFor="taxi-per-minute" className="text-xs text-muted-foreground mb-1 block">
                {tb('settings.pet_taxi_per_minute_label')}
              </label>
              <input
                id="taxi-per-minute"
                type="number"
                value={taxiPerMinute}
                onChange={(e) => setTaxiPerMinute(e.target.value)}
                placeholder="0"
                min={0}
                max={FEE_MAX}
                aria-invalid={perMinuteInvalid}
                className={INPUT_CLASS}
              />
              {perMinuteInvalid && (
                <p className="text-xs text-destructive mt-1">{tb('settings.pet_taxi_range_error')}</p>
              )}
            </div>

            {/* Minimum fare. Sits with the rates rather than under the size-pricing
                toggle because it is a floor on the whole quote, independent of
                whether the business charges by size. */}
            <div>
              <label htmlFor="taxi-minimum-fare" className="text-xs text-muted-foreground mb-1 block">
                {tb('settings.pet_taxi_minimum_fare_label')}
              </label>
              <input
                id="taxi-minimum-fare"
                type="number"
                value={minimumFare}
                onChange={(e) => setMinimumFare(e.target.value)}
                placeholder="0"
                min={0}
                max={FEE_MAX}
                aria-invalid={minimumFareInvalid}
                className={INPUT_CLASS}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tb('settings.pet_taxi_minimum_fare_hint')}
              </p>
              {minimumFareInvalid && (
                <p className="text-xs text-destructive mt-1">{tb('settings.pet_taxi_range_error')}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">{tb('settings.pet_taxi_fallback_hint')}</p>

            {/* Size-band pricing opt-in. Separate from the pet-taxi toggle because
                "I do pet-taxi" and "I charge by size" are independent — some
                operators charge a flat distance rate for every pet. */}
            <div className="flex items-start gap-3 pt-4 border-t">
              <input
                type="checkbox"
                id="size-pricing-optin"
                checked={sizePricingEnabled}
                onChange={() => setSizePricingEnabled((v) => !v)}
                className="mt-0.5 shrink-0"
              />
              <label htmlFor="size-pricing-optin" className="cursor-pointer">
                <span className="text-sm font-medium block">{tb('settings.size_pricing_label')}</span>
                <span className="text-xs text-muted-foreground">{tb('settings.size_pricing_hint')}</span>
              </label>
            </div>

            {sizePricingEnabled && (
              <div className="space-y-4">
                {(
                  [
                    ['small', surchargeSmall, setSurchargeSmall, surchargeSmallInvalid, '0'],
                    ['medium', surchargeMedium, setSurchargeMedium, surchargeMediumInvalid, '250'],
                    ['large', surchargeLarge, setSurchargeLarge, surchargeLargeInvalid, '600'],
                    ['giant', surchargeGiant, setSurchargeGiant, surchargeGiantInvalid, '900'],
                  ] as const
                ).map(([band, value, setter, invalid, placeholder]) => (
                  <div key={band}>
                    <label
                      htmlFor={`surcharge-${band}`}
                      className="text-xs text-muted-foreground mb-1 block"
                    >
                      {tb(`settings.size_surcharge_${band}_label`)}
                    </label>
                    {/* The placeholder shows the platform default, so a blank field
                        reads as "use the default" rather than "free". */}
                    <input
                      id={`surcharge-${band}`}
                      type="number"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={placeholder}
                      min={0}
                      max={FEE_MAX}
                      aria-invalid={invalid}
                      className={INPUT_CLASS}
                    />
                    {invalid && (
                      <p className="text-xs text-destructive mt-1">
                        {tb('settings.pet_taxi_range_error')}
                      </p>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {tb('settings.size_pricing_default_hint')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terms and conditions */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">{tb('settings.terms_title')}</h2>
        <div>
          <label htmlFor="business-terms" className="text-xs text-muted-foreground mb-1 block">
            {tb('settings.terms_label')}
          </label>
          <textarea
            id="business-terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder={tb('settings.terms_placeholder')}
            rows={5}
            aria-invalid={termsTooLong}
            className={INPUT_CLASS}
          />
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs ${termsTooLong ? 'text-destructive' : 'text-muted-foreground'}`}>
              {tb('settings.terms_counter', { chars: charCount(terms) })}
            </p>
            {termsTooLong && (
              <p className="text-xs text-destructive">{tb('settings.terms_too_long')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || saveBlocked}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando…' : saved ? 'Cambios guardados' : 'Guardar cambios'}
        </button>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>

      {/* Security / MFA */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('mfa.settings.title')}</h2>
          <span
            className={`text-xs px-2 py-1 rounded-xl font-medium ${
              mfaEnabled ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
            }`}
          >
            {mfaEnabled ? t('mfa.settings.enabled') : t('mfa.settings.disabled')}
          </span>
        </div>

        {mfaMethods.length > 0 && (
          <div className="space-y-2">
            {mfaMethods.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <FontAwesomeIcon icon={methodIcon(m.type)} className="text-base text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{methodLabel(m)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => (mfaMethods.length > 1 ? setDeleteTarget(m) : undefined)}
                  disabled={mfaMethods.length <= 1}
                  title={mfaMethods.length <= 1 ? t('mfa.settings.last_method_warning') : undefined}
                  className={`p-2 rounded-xl transition-colors ${
                    mfaMethods.length > 1
                      ? 'hover:bg-destructive/10 text-destructive'
                      : 'text-muted-foreground/30 cursor-not-allowed'
                  }`}
                >
                  <FontAwesomeIcon icon={faTrash} className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}

        {mfaEnabled && (
          <button
            onClick={() => setShowAddMethod(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="text-sm" />
            {t('mfa.settings.add_method')}
          </button>
        )}

        {mfaEnabled && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div>
              <div className="text-sm font-medium">{t('mfa.settings.recovery_title')}</div>
              <div className="text-xs text-muted-foreground">
                {t('mfa.settings.recovery_remaining', { count: recoveryRemaining })}
              </div>
            </div>
            <button
              onClick={handleRegenRecovery}
              className="text-xs px-3 py-1 border border-input rounded-xl hover:bg-muted transition-colors"
            >
              {t('mfa.settings.recovery_regenerate')}
            </button>
          </div>
        )}

        {!mfaEnabled && mfaMethods.length === 0 && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Agrega un método de autenticación para proteger tu cuenta.
            </p>
            <button
              onClick={() => setShowAddMethod(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t('mfa.settings.setup')}
            </button>
          </div>
        )}
      </div>

      {/* Session */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Sesión</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/40 bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Zona de peligro</h2>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 border border-destructive text-destructive rounded-xl text-sm hover:bg-destructive/10 transition-colors"
          >
            Eliminar cuenta
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta acción es permanente y no se puede deshacer. ¿Confirmas?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </div>
        )}
      </div>

      {/* MFA modals */}
      {deleteTarget && (
        <MfaPasswordConfirm
          onConfirm={handleDeleteMethod}
          onCancel={() => {
            setDeleteTarget(null)
            setMfaDeleteError(null)
          }}
          error={mfaDeleteError}
        />
      )}
      {recoveryCodes && (
        <MfaRecoveryModal codes={recoveryCodes} onClose={() => setRecoveryCodes(null)} />
      )}
      {showAddMethod && (
        <div className="fixed inset-0 z-50">
          <MfaEnrollment
            onComplete={() => {
              setShowAddMethod(false)
              mfaApi.getMethods().then(({ data }) => {
                if (data) {
                  setMfaMethods(Array.isArray(data.methods) ? data.methods : [])
                  setMfaEnabled(data.mfa_enabled)
                  setRecoveryRemaining(data.recovery_codes_remaining)
                }
              })
            }}
            onSkip={() => setShowAddMethod(false)}
            breadcrumbItems={[
              { label: 'Dashboard' },
              { label: 'Seguridad', current: true },
            ]}
          />
        </div>
      )}
    </div>
  )
}
