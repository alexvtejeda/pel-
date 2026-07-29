'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { BackgroundBeams } from '@/components/ui/beams'
import { Spinner } from '@/components/ui/spinner'
import { OnboardingNav } from '@/components/auth/onboarding/onboarding-nav'
import { MfaTotpSetup } from './mfa-totp-setup'
import { MfaPasskeySetup } from './mfa-passkey-setup'
import { MfaRecoveryModal } from './mfa-recovery-modal'
import { useMfaError } from './use-mfa-error'
import * as mfaApi from '@/lib/api/mfa'
import { MfaMethod } from '@/lib/types/user'

interface MfaEnrollmentProps {
  onComplete: () => void
  onSkip?: () => void
  breadcrumbItems: { label: string; href?: string; current?: boolean; changeRole?: boolean }[]
}

export function MfaEnrollment({ onComplete, onSkip, breadcrumbItems }: MfaEnrollmentProps) {
  const { t } = useTranslation('auth')
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [pendingMethod, setPendingMethod] = useState<MfaMethod | null>(null)
  const resolveError = useMfaError()

  const methods = [
    { key: 'webauthn' as MfaMethod, icon: faKey, label: t('mfa.enrollment.passkey'), desc: t('mfa.enrollment.passkey_desc'), recommended: true },
    { key: 'totp' as MfaMethod, icon: faMobileScreen, label: t('mfa.enrollment.totp'), desc: t('mfa.enrollment.totp_desc'), recommended: false },
    { key: 'email' as MfaMethod, icon: faEnvelope, label: t('mfa.enrollment.email'), desc: t('mfa.enrollment.email_desc'), recommended: false },
  ]

  const handleSuccess = (codes?: string[]) => {
    if (codes && codes.length > 0) {
      setRecoveryCodes(codes)
    } else {
      onComplete()
    }
  }

  const handleSelectMethod = async (method: MfaMethod) => {
    if (method !== 'email') {
      setSelectedMethod(method)
      return
    }

    // Email OTP has no configure screen — it enables in place, so the card
    // itself has to carry the pending and failure feedback.
    setPendingMethod('email')
    try {
      const { data, error } = await mfaApi.emailEnable()
      if (error) {
        toast.error(resolveError(error) ?? t('mfa.errors.generic'))
        return
      }
      handleSuccess(data?.recovery_codes)
    } catch {
      // lib/api/mfa.ts awaits res.json() unguarded, so an unreachable API
      // rejects rather than resolving { data, error }.
      toast.error(t('mfa.errors.generic'))
    } finally {
      // Always clears, so a failure can never leave every card disabled.
      setPendingMethod(null)
    }
  }

  if (recoveryCodes) {
    return <MfaRecoveryModal codes={recoveryCodes} onClose={onComplete} />
  }

  if (selectedMethod === 'totp') {
    return (
      <div className="dark relative min-h-screen overflow-hidden bg-background">
        <BackgroundBeams />
        <OnboardingNav items={breadcrumbItems} />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
          <div className="w-full max-w-md bg-background/90 backdrop-blur-xl rounded-2xl p-8 inset-shadow-[1px_1px_1px_var(--color-input)]">
            <MfaTotpSetup onSuccess={handleSuccess} onBack={() => setSelectedMethod(null)} />
          </div>
        </div>
      </div>
    )
  }

  if (selectedMethod === 'webauthn') {
    return (
      <div className="dark relative min-h-screen overflow-hidden bg-background">
        <BackgroundBeams />
        <OnboardingNav items={breadcrumbItems} />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
          <div className="w-full max-w-md bg-background/90 backdrop-blur-xl rounded-2xl p-8 inset-shadow-[1px_1px_1px_var(--color-input)]">
            <MfaPasskeySetup onSuccess={handleSuccess} onBack={() => setSelectedMethod(null)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />
      <OnboardingNav items={breadcrumbItems} />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <FontAwesomeIcon icon={faShieldHalved} className="text-5xl text-pop-550" />
            <h1 className="text-2xl font-bold text-foreground">{t('mfa.enrollment.title')}</h1>
            <p className="text-muted-foreground">{t('mfa.enrollment.subtitle')}</p>
          </div>

          <div className="space-y-3">
            {methods.map((m) => {
              const pending = pendingMethod === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => handleSelectMethod(m.key)}
                  disabled={pendingMethod !== null}
                  aria-busy={pending}
                  className="focus-ring w-full p-4 bg-background/90 backdrop-blur-xl rounded-2xl border border-input hover:border-pop-450/50 transition-all text-left flex items-center gap-4 inset-shadow-[1px_1px_1px_var(--color-input)] disabled:opacity-60"
                >
                  {pending ? (
                    <Spinner className="text-xl text-pop-550" />
                  ) : (
                    <FontAwesomeIcon icon={m.icon} className="text-xl text-pop-550" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{m.label}</div>
                    <div className="text-sm text-muted-foreground">{m.desc}</div>
                  </div>
                  {m.recommended && (
                    <span className="text-xs px-2 py-1 bg-pop-550/20 text-pop-450 rounded-full font-medium">
                      {t('mfa.enrollment.recommended')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {onSkip && (
            <button
              onClick={onSkip}
              className="focus-ring w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('mfa.enrollment.skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
