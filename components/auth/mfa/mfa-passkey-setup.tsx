'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'

interface MfaPasskeySetupProps {
  onSuccess: (recoveryCodes?: string[]) => void
  onBack: () => void
}

export function MfaPasskeySetup({ onSuccess, onBack }: MfaPasskeySetupProps) {
  const { t } = useTranslation('auth')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setError(null)

    const { data: options, error: beginError } = await mfaApi.webauthnRegisterBegin()
    if (beginError || !options) {
      setError(beginError || 'Error')
      setLoading(false)
      return
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: options as PublicKeyCredentialCreationOptions,
      })
      if (!credential) {
        setError('No se pudo crear la credencial')
        setLoading(false)
        return
      }

      const { data, error: finishError } = await mfaApi.webauthnRegisterFinish(credential)
      if (finishError) {
        setError(finishError)
        setLoading(false)
        return
      }

      onSuccess(data?.recovery_codes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar passkey')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        ← {t('mfa.settings.cancel')}
      </button>

      <div className="text-center space-y-4">
        <FontAwesomeIcon icon={faKey} className="w-12 h-12 text-pop-550" />
        <p className="text-sm text-muted-foreground">
          {loading ? t('mfa.enrollment.passkey_waiting') : t('mfa.enrollment.passkey_desc')}
        </p>
      </div>

      {error && (
        <p className="text-destructive text-sm text-center">{error}</p>
      )}

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : t('mfa.enrollment.passkey_prompt')}
      </button>
    </div>
  )
}
