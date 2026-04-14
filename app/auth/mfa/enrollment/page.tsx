'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { useAuth } from '@/lib/contexts/auth-context'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'

export default function MfaEnrollmentPage() {
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
