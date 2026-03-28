'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/lib/contexts/auth-context'
import { useWebSocket } from '@/lib/contexts/websocket-context'

export function RCApprovalListener() {
  const { user } = useAuth()
  const { subscribe } = useWebSocket()
  const { t } = useTranslation('common')
  const router = useRouter()

  useEffect(() => {
    if (user?.role !== 'rescue_center') return

    const unsub = subscribe('rc_status_updated', (data: any) => {
      if (data?.status === 'active') {
        toast.success(t('rc_notification.approved'), {
          action: {
            label: t('rc_notification.approved_action'),
            onClick: () => router.push('/dashboard/rescue-center'),
          },
          duration: 10000,
        })
      } else if (data?.status === 'rejected') {
        toast.error(t('rc_notification.rejected'), {
          description: data?.reason || undefined,
          duration: 10000,
        })
      }
    })

    return () => {
      unsub()
    }
  }, [user?.role, subscribe, t, router])

  return null
}
