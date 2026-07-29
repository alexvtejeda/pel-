'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleUser, faComments } from '@fortawesome/free-solid-svg-icons'
import { listConversations, Conversation } from '@/lib/api/chat'
import { useWebSocket } from '@/lib/contexts/websocket-context'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
import { TransitionLink } from '@/components/transitions/transition-link'

interface ChatConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
  activeConversationId?: string
  compact?: boolean
  /** When true, uses sidebar-aware colors for dark backgrounds */
  darkBg?: boolean
}

export default function ChatConversationList({ onSelectConversation, activeConversationId, compact = false, darkBg = false }: ChatConversationListProps) {
  const { t, i18n } = useTranslation('pets')
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'
  const { subscribe } = useWebSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  /*
    No `cancelled` flag: `load` has no dependencies, so the effect runs once per
    mount and the old cleanup only guarded a StrictMode double-invoke that now
    re-runs the same idempotent fetch.
  */
  const load = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    listConversations()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError(true)
        } else {
          setConversations(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

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

  const timeAgo = (dateStr: string): string => {
    const date = new Date(dateStr)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t('time.now', { ns: 'common' })
    if (diffMin < 60) return t('time.minutes_ago', { ns: 'common', count: diffMin })
    if (diffHrs < 24) return t('time.hours_ago', { ns: 'common', count: diffHrs })
    if (diffDays === 1) return t('time.yesterday', { ns: 'common' })
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

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
        <Spinner className={`text-2xl ${darkBg ? 'text-sidebar-foreground' : 'text-muted-foreground'}`} />
      </div>
    )
  }

  if (loadError) {
    return <ErrorState message={t('chat.load_error')} onRetry={load} />
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
        <FontAwesomeIcon icon={faComments} className={`text-4xl ${darkBg ? 'text-sidebar-foreground/30' : 'text-muted-foreground/30'}`} />
        <p className={`text-sm ${darkBg ? 'text-sidebar-foreground/60' : 'text-muted-foreground'}`}>{t('chat.empty')}</p>
        <p className={`text-xs ${darkBg ? 'text-sidebar-foreground/50' : 'text-muted-foreground/70'} max-w-[15rem]`}>
          {t('chat.empty_hint')}
        </p>
        <TransitionLink
          href="/pets"
          className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t('chat.empty_cta')}
        </TransitionLink>
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
            className={`focus-ring flex items-center gap-3 text-left transition-colors ${
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
                  <p className={`text-xs italic truncate ${colors.secondary}`}>{t('chat.no_messages')}</p>
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
