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

    const unsubApproved = subscribe('rc_approved', () => {
      toast.success(t('rc_notification.approved'), {
        action: {
          label: t('rc_notification.approved_action'),
          onClick: () => router.push('/dashboard/rescue-center'),
        },
        duration: 10000,
      })
    })

    const unsubRejected = subscribe('rc_rejected', (data: any) => {
      toast.error(t('rc_notification.rejected'), {
        description: data?.reason || undefined,
        duration: 10000,
      })
    })

    return () => {
      unsubApproved()
      unsubRejected()
    }
  }, [user?.role, subscribe, t, router])

  return null
}
