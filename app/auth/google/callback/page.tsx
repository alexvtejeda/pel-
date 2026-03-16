'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { UserRole } from '@/lib/types/user'

const rolePaths: Record<UserRole, string> = {
  rescue_center: '/dashboard/rescue-center',
  member: '/',
  business: '/',
}

export default function GoogleCallbackPage() {
  const router = useRouter()
  const { updateSession } = useAuth()

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiClient('/api/v1/auth/me')
        if (!res.ok) {
          router.push('/auth/login')
          return
        }
        const user = await res.json()
        updateSession(user)

        if (user.role) {
          router.push(rolePaths[user.role as UserRole])
        } else {
          router.push('/auth/role-selection')
        }
      } catch {
        router.push('/auth/login')
      }
    }

    init()
  }, [router, updateSession])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Iniciando sesión…</p>
      </div>
    </div>
  )
}
