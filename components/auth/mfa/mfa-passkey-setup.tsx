'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import { startRegistration } from '@simplewebauthn/browser'
import * as mfaApi from '@/lib/api/mfa'
import { Spinner } from '@/components/ui/spinner'
import { MfaBackButton } from './mfa-back-button'
import { useMfaError } from './use-mfa-error'

interface MfaPasskeySetupProps {
  onSuccess: (recoveryCodes?: string[]) => void
  onBack: () => void
}

export function MfaPasskeySetup({ onSuccess, onBack }: MfaPasskeySetupProps) {
  const { t } = useTranslation('auth')
  const resolveError = useMfaError()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setError(null)

    const { data: begin, error: beginError } = await mfaApi.webauthnRegisterBegin()
    if (beginError || !begin) {
      setError(resolveError(beginError) || t('mfa.errors.generic'))
      setLoading(false)
      return
    }

    try {
      // startRegistration marshals base64url ↔ ArrayBuffer and returns JSON-safe attestation.
      const attestation = await startRegistration({ optionsJSON: begin.options.publicKey })

      const { data, error: finishError } = await mfaApi.webauthnRegisterFinish(attestation, begin.session)
      if (finishError) {
        setError(resolveError(finishError))
        setLoading(false)
        return
      }

      onSuccess(data?.recovery_codes)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mfa.errors.passkey_register'))
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <MfaBackButton onClick={onBack} />

      <div className="text-center space-y-4">
        <FontAwesomeIcon icon={faKey} className="text-5xl text-pop-550" />
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
        className="focus-ring w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? <Spinner className="text-sm" /> : t('mfa.enrollment.passkey_prompt')}
      </button>
    </div>
  )
}
