'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/user'

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
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Redirect if not authenticated
    if (!user) {
      router.push(redirectTo)
      return
    }

    // Redirect if role is required but user doesn't have profile
    if (requireRole && !userProfile) {
      router.push('/auth/role-selection')
      return
    }

    // Redirect if user role doesn't match required roles
    if (requireRole && userProfile && !requireRole.includes(userProfile.role)) {
      router.push('/')
      return
    }
  }, [user, userProfile, loading, requireRole, redirectTo, router])

  // Show loading state
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

  // Don't render children if not authenticated or wrong role
  if (!user || (requireRole && !userProfile) || (requireRole && userProfile && !requireRole.includes(userProfile.role))) {
    return null
  }

  return <>{children}</>
}
