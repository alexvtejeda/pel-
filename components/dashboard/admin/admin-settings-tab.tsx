'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { MfaMethodInfo } from '@/lib/types/user'
import { MfaPasswordConfirm } from '@/components/auth/mfa/mfa-password-confirm'
import { MfaRecoveryModal } from '@/components/auth/mfa/mfa-recovery-modal'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'

export function AdminSettingsTab() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { t } = useTranslation('auth')

  const [mfaMethods, setMfaMethods] = useState<MfaMethodInfo[]>([])
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [recoveryRemaining, setRecoveryRemaining] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<MfaMethodInfo | null>(null)
  const [mfaDeleteError, setMfaDeleteError] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [showAddMethod, setShowAddMethod] = useState(false)

  useEffect(() => {
    mfaApi.getMethods().then(({ data }) => {
      if (data) {
        setMfaMethods(data.methods)
        setMfaEnabled(data.mfa_enabled)
        setRecoveryRemaining(data.recovery_codes_remaining)
      }
    })
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/')
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

  return (
    <div className="max-w-lg space-y-8">
      {/* Account info */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Cuenta</h2>
        <div className="text-sm">
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
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

      {/* Session */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Sesión</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Cerrar sesión
        </button>
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
                  setMfaMethods(data.methods)
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
