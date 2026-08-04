'use client'

import { useEffect, useState } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { apiClient } from '@/lib/api/client'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useLocaleRouter()
  const [status, setStatus] = useState<'loading' | 'admin' | 'denied'>('loading')

  useEffect(() => {
    apiClient('/api/v1/auth/me').then(async (res) => {
      if (!res.ok) { setStatus('denied'); return }
      const json = await res.json()
      setStatus(json.is_admin === true ? 'admin' : 'denied')
    }).catch(() => setStatus('denied'))
  }, [])

  useEffect(() => {
    if (status === 'denied') router.replace('/')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (status === 'denied') return null

  return <>{children}</>
}
