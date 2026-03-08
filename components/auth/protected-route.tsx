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
  const { user, loading } = useAuth()
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

  return <>{children}</>
}
