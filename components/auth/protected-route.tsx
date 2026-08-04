'use client'

import { useEffect } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/user'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: UserRole[]
  redirectTo?: string
  /**
   * Declares that this route IS the MFA enrollment surface, which skips the
   * forced-MFA interception below — the route renders enrollment itself.
   * Without it the guard replaces `/auth/mfa/enrollment` with its own
   * <MfaEnrollment>, which carries different props (no skip, and an onComplete
   * that logs the user out) than the page that owns the route.
   * Authentication is still enforced; only the MFA branch is skipped. Set this
   * on no other route — anywhere else it is simply false.
   */
  isMfaEnrollmentSurface?: boolean
}

export function ProtectedRoute({
  children,
  requireRole,
  redirectTo = '/auth/login',
  isMfaEnrollmentSurface = false,
}: ProtectedRouteProps) {
  const { user, loading, mfaSetupRequired } = useAuth()
  const router = useLocaleRouter()
  const { t } = useTranslation('common')

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(redirectTo)
      return
    }

    if (requireRole && !user.role) {
      router.push('/auth/role-selection')
      return
    }

    if (requireRole && user.role && !requireRole.includes(user.role)) {
      router.push('/')
      return
    }
  }, [user, loading, requireRole, redirectTo, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PeluLoadingLogo />
      </div>
    )
  }

  if (!user || (requireRole && !user.role) || (requireRole && user.role && !requireRole.includes(user.role))) {
    return null
  }

  if (!isMfaEnrollmentSurface && mfaSetupRequired && user?.role && ['rescue_center', 'business'].includes(user.role)) {
    return (
      <MfaEnrollment
        onComplete={async () => {
          const { logout } = await import('@/lib/api/auth')
          await logout()
          window.location.href = '/auth/login'
        }}
        breadcrumbItems={[
          { label: t('home'), href: '/' },
          { label: t('security'), current: true },
        ]}
      />
    )
  }

  return <>{children}</>
}
