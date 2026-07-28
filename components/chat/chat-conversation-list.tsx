'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleUser, faComments, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { listConversations, Conversation } from '@/lib/api/chat'
import { useWebSocket } from '@/lib/contexts/websocket-context'

interface ChatConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
  activeConversationId?: string
  compact?: boolean
  /** When true, uses sidebar-aware colors for dark backgrounds */
  darkBg?: boolean
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin}m`
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  if (diffDays === 1) return 'Ayer'
  return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
}

export default function ChatConversationList({ onSelectConversation, activeConversationId, compact = false, darkBg = false }: ChatConversationListProps) {
  const { t } = useTranslation('pets')
  const { subscribe } = useWebSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listConversations().then(({ data }) => {
      if (cancelled) return
      if (data) setConversations(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // Subscribe to new_message to update last message + unread count live
  useEffect(() => {
    const unsub = subscribe('new_message', (data: any) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === data.conversation_id)
        if (idx === -1) return prev

        // Backend wraps the message object inside data.message
        const m = data.message || data
        const updated = [...prev]
        const convo = { ...updated[idx] }
        convo.last_message_body = m.body
        convo.last_message_at = m.created_at
        convo.unread_count = (convo.unread_count || 0) + 1
        updated.splice(idx, 1)
        updated.unshift(convo) // Move to top
        return updated
      })
    })
    return unsub
  }, [subscribe])

  // Color tokens based on background
  const colors = darkBg ? {
    icon: 'text-sidebar-foreground/40',
    name: 'font-medium text-sidebar-foreground',
    nameUnread: 'font-semibold text-sidebar-primary',
    secondary: 'text-sidebar-foreground/60',
    message: 'text-sidebar-foreground/60',
    messageUnread: 'font-medium text-sidebar-primary',
    active: 'bg-sidebar-accent',
    unreadBg: 'bg-pop-550/10 hover:bg-pop-550/15',
    hover: 'hover:bg-sidebar-accent/50',
  } : {
    icon: 'text-muted-foreground/40',
    name: 'font-medium',
    nameUnread: 'font-semibold',
    secondary: 'text-muted-foreground',
    message: 'text-muted-foreground',
    messageUnread: 'font-medium text-foreground',
    active: 'bg-muted',
    unreadBg: 'bg-pop-550/5 hover:bg-pop-550/10',
    hover: 'hover:bg-accent/50',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FontAwesomeIcon icon={faSpinner} className={`text-2xl animate-spin ${darkBg ? 'text-sidebar-foreground' : 'text-muted-foreground'}`} />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <FontAwesomeIcon icon={faComments} className={`text-4xl ${darkBg ? 'text-sidebar-foreground/30' : 'text-muted-foreground/30'}`} />
        <p className={`text-sm ${darkBg ? 'text-sidebar-foreground/60' : 'text-muted-foreground'}`}>{t('chat.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {conversations.map(convo => {
        const isUnread = convo.unread_count > 0
        const isActive = convo.id === activeConversationId

        return (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo)}
            className={`flex items-center gap-3 text-left transition-colors ${
              compact ? 'px-3 py-2.5 rounded-xl' : 'p-3 rounded-2xl'
            } ${
              isActive
                ? colors.active
                : isUnread
                  ? colors.unreadBg
                  : colors.hover
            }`}
          >
            <FontAwesomeIcon icon={faCircleUser} className={`shrink-0 ${compact ? 'text-xl' : 'text-2xl'} ${colors.icon}`} />

            {compact ? (
              /* Compact: avatar + last message snippet only */
              <div className="flex-1 min-w-0">
                {convo.last_message_body ? (
                  <p className={`text-xs truncate ${isUnread ? colors.messageUnread : colors.message}`}>
                    {convo.last_message_body}
                  </p>
                ) : (
                  <p className={`text-xs italic truncate ${colors.secondary}`}>Sin mensajes</p>
                )}
              </div>
            ) : (
              /* Full: avatar + name + pet + last message */
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${isUnread ? colors.nameUnread : colors.name}`}>
                    {convo.other_user_name || convo.other_user_email}
                  </span>
                  {convo.last_message_at && (
                    <span className={`text-[11px] shrink-0 ${colors.secondary}`}>
                      {timeAgo(convo.last_message_at)}
                    </span>
                  )}
                </div>

                {convo.pet_name && (
                  <span className="text-xs text-pop-550">{convo.pet_name}</span>
                )}

                {convo.last_message_body && (
                  <p className={`text-xs truncate mt-0.5 ${colors.message}`}>
                    {convo.last_message_body}
                  </p>
                )}
              </div>
            )}

            {isUnread && (
              <span className="bg-pop-solid text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                {convo.unread_count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
