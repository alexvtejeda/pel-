'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { BackgroundBeams } from '@/components/ui/beams'
import { Spinner } from '@/components/ui/spinner'
import { OnboardingNav } from '@/components/auth/onboarding/onboarding-nav'
import { MfaTotpSetup } from './mfa-totp-setup'
import { MfaPasskeySetup } from './mfa-passkey-setup'
import { MfaRecoveryCodes } from './mfa-recovery-modal'
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
    // The method is live the moment this runs, whichever branch follows. Without
    // this the only acknowledgement was the screen changing — and on the
    // no-codes branch it changed straight to a different page.
    toast.success(t('mfa.enrollment.success'))
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
    let codes: string[] | undefined
    try {
      const { data, error } = await mfaApi.emailEnable()
      if (error) {
        toast.error(resolveError(error) ?? t('mfa.errors.generic'))
        return
      }
      codes = data?.recovery_codes
    } catch {
      // lib/api/mfa.ts awaits res.json() unguarded, so an unreachable API
      // rejects rather than resolving { data, error }.
      toast.error(t('mfa.errors.generic'))
      return
    } finally {
      // Always clears, so a failure can never leave every card disabled.
      setPendingMethod(null)
    }

    // Deliberately outside the try: handleSuccess calls the caller's
    // onComplete(), and a throw from there is not a failed enable.
    handleSuccess(codes)
  }

  // Saving the codes is the last step of the flow, not an interruption of it, so
  // it renders in the same shell as the other two rather than as a modal on top
  // of nothing. That keeps the forced-dark theming and finally lights up the
  // third segment of the step bar, which had no screen to describe until now.
  if (recoveryCodes) {
    return (
      <MfaPanel breadcrumbItems={breadcrumbItems} step={3}>
        <div className="overflow-hidden w-full bg-background backdrop-blur-xl rounded-2xl p-8 space-y-4 shadow-post">
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">{t('mfa.recovery.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('mfa.recovery.subtitle')}</p>
          </div>
          <MfaRecoveryCodes codes={recoveryCodes} onConfirm={onComplete} />
        </div>
      </MfaPanel>
    )
  }

  // Both configure screens sit in the same card inside the same shell, so they
  // share one branch rather than two copies of the wrapper.
  if (selectedMethod === 'totp' || selectedMethod === 'webauthn') {
    return (
      <MfaPanel breadcrumbItems={breadcrumbItems} step={2}>
        <div className="w-full bg-background/90 backdrop-blur-xl rounded-2xl p-8">
          {selectedMethod === 'totp' ? (
            <MfaTotpSetup onSuccess={handleSuccess} onBack={() => setSelectedMethod(null)} />
          ) : (
            <MfaPasskeySetup onSuccess={handleSuccess} onBack={() => setSelectedMethod(null)} />
          )}
        </div>
      </MfaPanel>
    )
  }

  return (
    <MfaPanel breadcrumbItems={breadcrumbItems} step={1}>
      <div className="space-y-3">
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
                className="focus-ring w-full p-4 bg-background backdrop-blur-xl rounded-2xl border border-border hover:border-pop-450/50 transition-all text-left flex items-center gap-4 shadow-post disabled:opacity-60"
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
                  <span className="text-xs px-2 py-1 bg-pop-550/20 text-pop-550 rounded-full font-medium">
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
            disabled={pendingMethod !== null}
            className="focus-ring w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors disabled:opacity-60"
          >
            {t('mfa.enrollment.skip')}
          </button>
        )}
      </div>
    </MfaPanel>
  )
}

interface MfaPanelProps {
  breadcrumbItems: MfaEnrollmentProps['breadcrumbItems']
  step: 1 | 2 | 3
  children: React.ReactNode
}

/**
 * The dark beams shell every enrollment screen sits in, plus the step
 * indicator. A three-segment bar rather than components/Stepper.tsx: Stepper
 * owns its own next/back buttons and slide transitions, which would fight the
 * enrollment flow's own navigation.
 */
function MfaPanel({ breadcrumbItems, step, children }: MfaPanelProps) {
  const { t } = useTranslation('auth')
  const labels = [
    t('mfa.enrollment.step_choose'),
    t('mfa.enrollment.step_configure'),
    t('mfa.enrollment.step_recovery'),
  ]
  const progressLabel = t('mfa.enrollment.step_of', { current: step, total: 3 })

  // On step 3 the trail collapses to its last crumb, as plain text. The codes
  // are issued exactly once and a stray click on "Inicio" would navigate away
  // and discard them — the modal this step replaced covered the nav with its
  // overlay, so leaving the links live would be a way around the gate. Steps 1
  // and 2 keep the full trail: an abandoned setup can simply be restarted.
  const trail =
    step === 3
      ? breadcrumbItems.slice(-1).map((item) => ({ label: item.label, current: true }))
      : breadcrumbItems

  // Here we connect all of the pieces together, the product of DNS/auth/register
  //
  // h-dvh, not min-h-dvh: `max-h-full` on the panel resolves against a
  // percentage, and a percentage needs a *definite* parent height. Under
  // min-height the cap silently computes to `none` and the panel grows the page
  // instead. A definite height is also the invariant itself — the page can no
  // longer be taller than the viewport.
  return (
    <div className="dark relative flex h-dvh flex-col overflow-x-clip bg-background">
      <BackgroundBeams />
      <OnboardingNav items={trail} />

      {/* min-h-0 is what makes the cap below bite: without it `flex-1` grows to
          its content and `max-h-full` resolves to that grown height, so the
          panel could still push the page taller than the viewport. */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center p-4">
        <div className="flex max-h-full w-full max-w-2xl flex-col p-6 sm:p-10 lg:p-8 bg-background border-border shadow-2xl rounded-2xl">
          <div className="shrink-0 mb-10">
            <p className="text-xs font-medium text-muted-foreground">
              {progressLabel} · {labels[step - 1]}
            </p>
            <div
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-label={progressLabel}
              className="mt-2 flex gap-1.5"
            >
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? 'bg-pop-550' : 'bg-input'}`}
                />
              ))}
            </div>
          </div>
          <AnimatedHeight>{children}</AnimatedHeight>
        </div>
      </div>
    </div>
  )
}

/**
 * Animates the card's height between enrollment steps, which otherwise snap
 * from one content height to the next. Same idiom as components/Stepper.tsx —
 * measure the content, animate an explicit height on the wrapper — rather than
 * a CSS transition, because `height: auto` is not interpolable.
 *
 * The measured child stays in normal flow (Stepper absolutely positions its
 * step, but that flow owns the slide animation this panel deliberately does
 * not have), so the only job here is keeping the wrapper's height in sync.
 */
function AnimatedHeight({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  const [animating, setAnimating] = useState(false)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const el = innerRef.current
    // Same guard as components/pets/pet-feed.tsx: jsdom ships no ResizeObserver.
    // Bailing before the first measure leaves `height` undefined, which makes
    // the wrapper a plain flow container — the content must never collapse to
    // the 0 that offsetHeight reports in a layout-less environment.
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    // Catches height changes the step swap does not cause: a QR code finishing
    // its decode, a validation message appearing, the viewport reflowing.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      // No entry animation: on first paint `height` is still undefined, and
      // animating in from 0 would make every mount look like a step change.
      initial={false}
      animate={{ height }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0 }}
      onAnimationStart={() => setAnimating(true)}
      onAnimationComplete={() => setAnimating(false)}
      // The panel is capped at the viewport, so when a step's content cannot
      // fit, this is what scrolls — never the page. min-h-0 lets it shrink
      // below its measured height; the -mx-2/px-2 pair keeps 8px of bleed
      // inside the scroll box so focus-ring's outline (2px at 2px offset) is
      // not clipped, which a bare scroll container would do.
      className="-mx-2 min-h-0 px-2"
      // While the height is in motion, clip instead of scrolling: a scrollbar
      // flickering in and out for 400ms reads as a glitch.
      style={{ overflowY: animating ? 'hidden' : 'auto' }}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  )
}
