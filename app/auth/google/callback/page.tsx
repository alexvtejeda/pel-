'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { storeSession } from '@/lib/api/client'
import { AuthResponse, UserRole } from '@/lib/types/user'

const rolePaths: Record<UserRole, string> = {
  rescue_center: '/dashboard/rescue-center',
  adopter: '/',
  owner: '/',
}

export default function GoogleCallbackPage() {
  const router = useRouter()
  const { updateSession } = useAuth()

  useEffect(() => {
    const hash = window.location.hash.slice(1) // strip leading #
    const params = new URLSearchParams(hash)
    const sessionB64 = params.get('session')

    if (!sessionB64) {
      router.push('/auth/login')
      return
    }

    try {
      const session: AuthResponse = JSON.parse(atob(sessionB64))
      storeSession(session.access_token, session.refresh_token, session.user)
      updateSession(session.user, session.access_token)

      // Redirect based on role
      if (session.user.role) {
        router.push(rolePaths[session.user.role])
      } else {
        router.push('/auth/role-selection')
      }
    } catch {
      router.push('/auth/login')
    }
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
