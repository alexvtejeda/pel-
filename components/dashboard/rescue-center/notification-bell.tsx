'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell } from '@fortawesome/free-solid-svg-icons'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { listNotifications, markNotificationRead, AppNotification } from '@/lib/api/notifications-api'
import { useWebSocket } from '@/lib/contexts/websocket-context'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Justo ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  return `Hace ${Math.floor(hours / 24)} d`
}

export function NotificationBell() {
  const { t } = useTranslation('pets')
  const { subscribe } = useWebSocket()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Fetch notifications on mount
  useEffect(() => {
    let cancelled = false
    listNotifications().then(({ data }) => {
      if (cancelled) return
      if (data) setNotifications(data)
    })
    return () => { cancelled = true }
  }, [])

  // Subscribe to live events to add new notifications
  useEffect(() => {
    const unsubSubmission = subscribe('new_submission', (data: any) => {
      const n: AppNotification = {
        id: data.id || crypto.randomUUID(),
        title: data.title || 'Nuevo formulario recibido',
        body: data.body || '',
        is_read: false,
        created_at: data.created_at || new Date().toISOString(),
      }
      setNotifications(prev => [n, ...prev])
    })

    const unsubReviewed = subscribe('submission_reviewed', (data: any) => {
      const n: AppNotification = {
        id: data.id || crypto.randomUUID(),
        title: data.title || 'Solicitud revisada',
        body: data.body || '',
        is_read: false,
        created_at: data.created_at || new Date().toISOString(),
      }
      setNotifications(prev => [n, ...prev])
    })

    return () => {
      unsubSubmission()
      unsubReviewed()
    }
  }, [subscribe])

  const handleClickNotification = async (id: string) => {
    const { error } = await markNotificationRead(id)
    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    }
  }

  return (
    <>
      <button
        type="button"
        className="relative text-sidebar-foreground hover:text-sidebar-primary transition-colors"
        onClick={() => setOpen(true)}
      >
        <FontAwesomeIcon icon={faBell} className="text-lg" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1.5 bg-destructive text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t('notifications.title')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('notifications.title')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FontAwesomeIcon icon={faBell} className="text-3xl text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotification(n.id)}
                  className={`text-left rounded-xl p-3 transition-colors ${
                    n.is_read
                      ? 'text-muted-foreground'
                      : 'border-l-0.5 border-pop-550 bg-pop-550/5 pl-3'
                  }`}
                >
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
