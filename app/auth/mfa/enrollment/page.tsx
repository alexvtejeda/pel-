'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { useAuth } from '@/lib/contexts/auth-context'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

function MfaEnrollmentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, mfaSetupRequired } = useAuth()
  const { t } = useTranslation(['common', 'auth'])
  // ?mfa=1 is only set by postLoginRedirect. The account-sheet link carries no
  // param, so the session's own pending requirement has to count as forced too
  // — otherwise a forced user arriving from the sheet gets a skip button that
  // silently disappears the moment they use it.
  const forced = searchParams?.get('mfa') === '1' || mfaSetupRequired

  const breadcrumbItems = [
    { label: t('home', { ns: 'common' }), href: '/' },
    { label: t('mfa.settings.title', { ns: 'auth' }), current: true },
  ]

  const handleComplete = () => {
    if (user) {
      postLoginRedirect(user, router)
    } else {
      router.push('/pets')
    }
  }

  const handleSkip = () => {
    if (user) {
      postLoginRedirect(user, router)
    } else {
      router.push('/pets')
    }
  }

  return (
    <MfaEnrollment
      onComplete={handleComplete}
      onSkip={forced ? undefined : handleSkip}
      breadcrumbItems={breadcrumbItems}
    />
  )
}

export default function MfaEnrollmentPage() {
  return (
    <Suspense
      fallback={
        <div className="dark flex min-h-screen items-center justify-center bg-background">
          <PeluLoadingLogo />
        </div>
      }
    >
      <MfaEnrollmentInner />
    </Suspense>
  )
}
