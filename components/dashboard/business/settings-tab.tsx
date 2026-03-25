'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { getMyBusiness, updateBusiness, uploadBusinessPhoto, DayHours, OperatingHours } from '@/lib/api/businesses'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faTrash, faPlus, faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
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

const SERVICES = ['transport', 'grooming', 'walking', 'sitting', 'training', 'veterinary']

const SERVICE_LABELS: Record<string, string> = {
  transport: 'Transporte',
  grooming: 'Grooming',
  walking: 'Paseos',
  sitting: 'Cuidado',
  training: 'Adiestramiento',
  veterinary: 'Veterinaria',
}

const INPUT_CLASS =
  'w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring'

export function SettingsTab() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { t } = useTranslation('auth')

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

  const handleSave = async () => {
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
      setMfaDeleteError(result.error)
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
            {SERVICES.map((service) => {
              const active = selectedServices.includes(service)
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  {SERVICE_LABELS[service]}
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

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
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
