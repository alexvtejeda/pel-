'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell } from '@fortawesome/free-solid-svg-icons'

export interface AppNotification {
  id: string
  title: string
  body: string
  receivedAt: Date
}

interface NotificationsTabProps {
  notifications: AppNotification[]
}

function useTimeAgo() {
  const { t } = useTranslation('common')
  return (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return t('time.just_now')
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return t('time.minutes_ago', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('time.hours_ago', { count: hours })
    return t('time.days_ago', { count: Math.floor(hours / 24) })
  }
}

export function NotificationsTab({ notifications }: NotificationsTabProps) {
  const { t } = useTranslation('pets')
  const timeAgo = useTimeAgo()

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <FontAwesomeIcon icon={faBell} className="text-2xl" />
        <p className="text-sm">{t('notifications.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-lg">
      {notifications.map((n) => (
        <div key={n.id} className="rounded-2xl border bg-card p-4 flex gap-3">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faBell} className="text-sm text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.body}</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
            {timeAgo(n.receivedAt)}
          </span>
        </div>
      ))}
    </div>
  )
}
