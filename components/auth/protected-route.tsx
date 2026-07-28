'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/user'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireRole,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { user, loading, mfaSetupRequired } = useAuth()
  const router = useRouter()
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

  if (mfaSetupRequired && user?.role && ['rescue_center', 'business'].includes(user.role)) {
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
