'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/user'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
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
          { label: 'Inicio', href: '/' },
          { label: 'Seguridad', current: true },
        ]}
      />
    )
  }

  return <>{children}</>
}
