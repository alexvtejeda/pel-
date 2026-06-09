'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faKey, faMobileScreen, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { startAuthentication } from '@simplewebauthn/browser'
import { MfaCodeInput } from './mfa-code-input'
import * as mfaApi from '@/lib/api/mfa'
import { AuthUser, MfaChallengeResponse, MfaMethod } from '@/lib/types/user'
import { useAuth } from '@/lib/contexts/auth-context'

interface MfaVerifyProps {
  challenge: MfaChallengeResponse
  loginEmail: string
  onSuccess: (user: AuthUser) => void
  onExpired: () => void
  onCancel: () => void
}

export function MfaVerify({ challenge, loginEmail, onSuccess, onExpired, onCancel }: MfaVerifyProps) {
  const { t } = useTranslation('auth')
  const { updateSession } = useAuth()
  const [activeMethod, setActiveMethod] = useState<MfaMethod>(challenge.preferred_method)
  const [showMethodPicker, setShowMethodPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const maskedEmail = loginEmail
    ? loginEmail.slice(0, 2) + '***@' + loginEmail.split('@')[1]
    : '***'

  const handleVerify = async (codeOrAssertion: string | unknown, session?: string) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await mfaApi.mfaVerify(activeMethod, codeOrAssertion as never, session)
    setLoading(false)

    if (err) {
      if (err.includes('expired') || err.includes('expiró')) {
        onExpired()
        return
      }
      setError(err)
      return
    }

    if (data) {
      updateSession(data.user)
      onSuccess(data.user)
    }
  }

  const handleSwitchMethod = async (method: MfaMethod) => {
    setActiveMethod(method)
    setShowMethodPicker(false)
    setError(null)

    if (method === 'email') {
      const { error: sendErr } = await mfaApi.mfaEmailSend()
      if (sendErr) {
        setError(sendErr)
        return
      }
      setEmailSent(true)
    }
  }

  const handlePasskeyVerify = async () => {
    setLoading(true)
    setError(null)

    const { data: begin, error: beginErr } = await mfaApi.webauthnAssertBegin()
    if (beginErr || !begin) {
      setError(beginErr || 'Error')
      setLoading(false)
      return
    }

    try {
      // startAuthentication marshals base64url ↔ ArrayBuffer and returns JSON-safe assertion.
      const assertion = await startAuthentication({ optionsJSON: begin.options.publicKey })
      await handleVerify(assertion, begin.session)
    } catch {
      setError('Verificación cancelada')
      setLoading(false)
    }
  }

  const methodIcons: Record<MfaMethod, typeof faKey> = {
    webauthn: faKey,
    totp: faMobileScreen,
    email: faEnvelope,
    recovery: faShieldHalved,
  }

  const subtitleKeys: Record<MfaMethod, string> = {
    totp: 'mfa.verify.subtitle_totp',
    email: 'mfa.verify.subtitle_email',
    webauthn: 'mfa.verify.subtitle_passkey',
    recovery: 'mfa.verify.subtitle_recovery',
  }

  if (showMethodPicker) {
    return (
      <div className="space-y-4" data-testid="mfa-method-picker">
        <div className="text-center">
          <FontAwesomeIcon icon={faShieldHalved} className="text-2xl text-pop-550 mb-2" />
          <h2 className="font-semibold">{t('mfa.verify.other_method')}</h2>
        </div>

        <div className="space-y-2">
          {challenge.available_methods.filter(m => m !== 'recovery').map((method) => (
            <button
              key={method}
              onClick={() => handleSwitchMethod(method)}
              className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                activeMethod === method ? 'border-pop-450 bg-pop-450/10' : 'border-input hover:bg-muted'
              }`}
            >
              <FontAwesomeIcon icon={methodIcons[method]} className="text-base" />
              <span className="text-sm font-medium">{t(`mfa.enrollment.${method === 'webauthn' ? 'passkey' : method}`)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => handleSwitchMethod('recovery')}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('mfa.verify.use_recovery')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5" data-testid="mfa-verify-card">
      <div className="text-center space-y-1">
        <FontAwesomeIcon icon={faShieldHalved} className="text-2xl text-pop-550 mb-2" />
        <h2 className="font-semibold">{t('mfa.verify.title')}</h2>
        <p className="text-sm text-muted-foreground">{t(subtitleKeys[activeMethod])}</p>
        {activeMethod === 'email' && emailSent && (
          <p className="text-xs text-pop-450">{t('mfa.verify.email_sent', { email: maskedEmail })}</p>
        )}
      </div>

      {(activeMethod === 'totp' || activeMethod === 'email') && (
        <MfaCodeInput onComplete={handleVerify} disabled={loading} error={error} />
      )}

      {activeMethod === 'recovery' && (
        <form onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('recovery') as HTMLInputElement; if (input.value) handleVerify(input.value) }} className="space-y-3">
          <input
            name="recovery"
            type="text"
            placeholder="XXXXXXXXXX"
            className="w-full px-4 py-3 border border-input rounded-xl text-center font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
            disabled={loading}
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('mfa.verify.verify_button')}
          </button>
        </form>
      )}

      {activeMethod === 'webauthn' && (
        <div className="space-y-3">
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            onClick={handlePasskeyVerify}
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('mfa.verify.passkey_button')}
          </button>
        </div>
      )}

      <button
        onClick={() => setShowMethodPicker(true)}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('mfa.verify.other_method')} →
      </button>

      <button
        onClick={onCancel}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('mfa.verify.back_to_login')}
      </button>
    </div>
  )
}
