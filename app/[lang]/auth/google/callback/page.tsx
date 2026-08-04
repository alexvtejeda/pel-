'use client'

import { useEffect } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'

export default function GoogleCallbackPage() {
  const router = useLocaleRouter()
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
        await postLoginRedirect(user, router)
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
