'use client'

import { Bell } from 'lucide-react'

export interface AppNotification {
  id: string
  title: string
  body: string
  receivedAt: Date
}

interface NotificationsTabProps {
  notifications: AppNotification[]
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Justo ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  return `Hace ${Math.floor(hours / 24)} d`
}

export function NotificationsTab({ notifications }: NotificationsTabProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Bell size={32} strokeWidth={1.5} />
        <p className="text-sm">No hay notificaciones</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-lg">
      {notifications.map((n) => (
        <div key={n.id} className="rounded-2xl border bg-card p-4 flex gap-3">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell size={14} className="text-primary" />
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
