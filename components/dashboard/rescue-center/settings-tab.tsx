'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { uploadAvatar } from '@/lib/api/auth'
import { getMyRescueCenter, updateRescueCenter } from '@/lib/api/rescue-centers'
import { LogoUpload } from './logo-upload'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { useMfaError } from '@/components/auth/mfa/use-mfa-error'
import { MfaMethodInfo } from '@/lib/types/user'
import { MfaPasswordConfirm } from '@/components/auth/mfa/mfa-password-confirm'
import { MfaRecoveryModal } from '@/components/auth/mfa/mfa-recovery-modal'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'

export function SettingsTab() {
  const { user, logout, updateSession } = useAuth()
  const router = useRouter()
  const { t } = useTranslation('auth')
  const resolveError = useMfaError()

  const [displayName, setDisplayName] = useState(user?.display_name ?? user?.email ?? '')
  const [rescueName, setRescueName] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [savedRescue, setSavedRescue] = useState(false)
  const [savingRescue, setSavingRescue] = useState(false)
  const [rescueError, setRescueError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [rcId, setRcId] = useState<string | null>(null)
  const [rcLogoUrl, setRcLogoUrl] = useState<string | null>(null)
  const [rcWebsite, setRcWebsite] = useState('')
  const [rcInstagram, setRcInstagram] = useState('')
  const [savedSocial, setSavedSocial] = useState(false)
  const [savingSocial, setSavingSocial] = useState(false)
  const [socialError, setSocialError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mfaMethods, setMfaMethods] = useState<MfaMethodInfo[]>([])
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [recoveryRemaining, setRecoveryRemaining] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<MfaMethodInfo | null>(null)
  const [mfaDeleteError, setMfaDeleteError] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [showAddMethod, setShowAddMethod] = useState(false)

  useEffect(() => {
    getMyRescueCenter().then(({ data }) => {
      if (data) {
        setRcId(data.id)
        setRescueName(data.name)
        setRcLogoUrl(data.logo_url ?? null)
        setRcWebsite(data.website ?? '')
        setRcInstagram(data.instagram ?? '')
      }
    })
  }, [])

  useEffect(() => {
    mfaApi.getMethods().then(({ data }) => {
      if (data) {
        setMfaMethods(Array.isArray(data.methods) ? data.methods : [])
        setMfaEnabled(data.mfa_enabled)
        setRecoveryRemaining(data.recovery_codes_remaining)
      }
    })
  }, [])

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset first: picking the same file twice must fire `change` again.
    e.target.value = ''
    if (!file) return

    // Mirrors LogoUpload's guard: the copy beside this button promises 5 MB,
    // so reject locally instead of making the user wait for the server to.
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setAvatarError('Imagen inválida. Máx 5 MB, PNG/JPG/WEBP.')
      return
    }

    // Optimistic preview, same shape as LogoUpload.
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
    setAvatarError(null)
    setAvatarUploading(true)

    const { data, error } = await uploadAvatar(file)

    setAvatarUploading(false)
    URL.revokeObjectURL(objectUrl)
    setAvatarPreview(null)

    if (error || !data) {
      setAvatarError(error ?? 'Error al subir la foto')
      return
    }
    // Spread, never a bare object: the session also carries role, email and the
    // MFA flag, and this component must not drop them.
    if (user) updateSession({ ...user, avatar_url: data.avatar_url })
  }

  const handleSaveName = async () => {
    setSavingName(true)
    setNameError(null)

    const res = await apiClient('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    })

    setSavingName(false)
    if (!res.ok) {
      setNameError('No se pudo guardar el nombre. Intenta de nuevo.')
      return
    }

    if (user) updateSession({ ...user, display_name: displayName })
    setSavedName(true)
    setTimeout(() => setSavedName(false), 2000)
  }

  const handleSaveRescue = async () => {
    if (!rcId) return
    setSavingRescue(true)
    setRescueError(null)

    const { error } = await updateRescueCenter(rcId, { name: rescueName.trim() })

    setSavingRescue(false)
    if (error) {
      setRescueError(error)
      return
    }

    setRescueName(rescueName.trim())

    setSavedRescue(true)
    setTimeout(() => setSavedRescue(false), 2000)
  }

  const handleSaveSocial = async () => {
    if (!rcId) return
    setSavingSocial(true)
    setSocialError(null)
    const { error } = await updateRescueCenter(rcId, {
      website: rcWebsite.trim() || undefined,
      instagram: rcInstagram.trim() || undefined,
    })
    setSavingSocial(false)
    if (error) {
      setSocialError(error)
      return
    }
    setSavedSocial(true)
    setTimeout(() => setSavedSocial(false), 2000)
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Profile picture */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Foto de perfil</h2>
        <p className="text-xs text-muted-foreground">
          Es la cara de tu centro en las mascotas que publicas.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted shrink-0">
            {avatarPreview ?? user?.avatar_url ? (
              <Image
                src={(avatarPreview ?? user?.avatar_url) as string}
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {displayName ? displayName[0].toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-sm px-4 py-2 rounded-xl border border-input hover:bg-muted transition-colors disabled:opacity-50"
            >
              {avatarUploading ? 'Subiendo…' : 'Cambiar foto'}
            </button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG o GIF · máx. 5 MB</p>
            {avatarError && <p className="text-sm text-destructive mt-1">{avatarError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </div>

      {/* Logo del centro */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Logo del centro</h2>
        <p className="text-xs text-muted-foreground">
          Aparece en el banner de tu formulario de adopción. Tamaño recomendado: 1600x400px.
        </p>
        <LogoUpload logoUrl={rcLogoUrl} onUpdate={url => setRcLogoUrl(url)} />
      </div>

      {/* Display name */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Nombre de usuario</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className="flex-1 px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={handleSaveName}
            disabled={savingName}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {savingName ? 'Guardando…' : savedName ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        {nameError && <p className="text-sm text-destructive">{nameError}</p>}
      </div>

      {/* Rescue center name */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Nombre del centro de rescate</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={rescueName}
            onChange={(e) => setRescueName(e.target.value)}
            placeholder="Ej. Rescate Animal Santo Domingo"
            className="flex-1 px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={handleSaveRescue}
            disabled={savingRescue || !rcId}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {savingRescue ? 'Guardando…' : savedRescue ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        {rescueError && <p className="text-sm text-destructive">{rescueError}</p>}
      </div>
      {/* Website & Instagram */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Redes y sitio web</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sitio web</label>
            <input
              type="text"
              value={rcWebsite}
              onChange={(e) => setRcWebsite(e.target.value)}
              placeholder="ejemplo.com"
              className="w-full px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Instagram</label>
            <input
              type="text"
              value={rcInstagram}
              onChange={(e) => setRcInstagram(e.target.value)}
              placeholder="mi_refugio"
              className="w-full px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">Solo el nombre de usuario, sin @</p>
          </div>
        </div>
        {socialError && <p className="text-sm text-destructive">{socialError}</p>}
        <button
          onClick={handleSaveSocial}
          disabled={savingSocial}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {savingSocial ? 'Guardando…' : savedSocial ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* Security / MFA */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('mfa.settings.title')}</h2>
          <span className={`text-xs px-2 py-1 rounded-xl font-medium ${
            mfaEnabled ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
          }`}>
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
                  onClick={() => mfaMethods.length > 1 ? setDeleteTarget(m) : undefined}
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

      {/* Logout */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Sesión</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Delete account */}
      <div className="rounded-2xl border border-destructive/40 bg-card p-6 space-y-4">
        <h2 className="font-semibold text-destructive">Zona de peligro</h2>
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
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                disabled={isDeleting}
                className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <MfaPasswordConfirm
          onConfirm={handleDeleteMethod}
          onCancel={() => { setDeleteTarget(null); setMfaDeleteError(null) }}
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
