'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleUser, faComments, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { listConversations, Conversation } from '@/lib/api/chat'
import { useWebSocket } from '@/lib/contexts/websocket-context'

interface ChatConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
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

export default function ChatConversationList({ onSelectConversation }: ChatConversationListProps) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FontAwesomeIcon icon={faSpinner} className="text-2xl text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <FontAwesomeIcon icon={faComments} className="text-4xl text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t('chat.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {conversations.map(convo => {
        const isUnread = convo.unread_count > 0
        return (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo)}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-colors ${
              isUnread
                ? 'bg-pop-550/5 border border-pop-550/20'
                : 'border border-transparent hover:bg-muted/50'
            }`}
          >
            <FontAwesomeIcon icon={faCircleUser} className="text-2xl text-muted-foreground/40 shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">
                  {convo.other_user_name || convo.other_user_email}
                </span>
                {convo.last_message_at && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {timeAgo(convo.last_message_at)}
                  </span>
                )}
              </div>

              {convo.pet_name && (
                <span className="text-xs text-pop-550">{convo.pet_name}</span>
              )}

              {convo.last_message_body && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {convo.last_message_body}
                </p>
              )}
            </div>

            {isUnread && (
              <span className="bg-pop-550 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                {convo.unread_count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
