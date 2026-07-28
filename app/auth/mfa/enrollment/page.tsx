'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { useAuth } from '@/lib/contexts/auth-context'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

function MfaEnrollmentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const forced = searchParams?.get('mfa') === '1'

  const breadcrumbItems = [
    { label: 'Inicio', href: '/' },
    { label: 'MFA', current: true },
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
