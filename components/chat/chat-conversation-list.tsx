'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleUser, faComments } from '@fortawesome/free-solid-svg-icons'
import { listConversations, Conversation } from '@/lib/api/chat'
import { useWebSocket } from '@/lib/contexts/websocket-context'
import { ErrorState } from '@/components/ui/error-state'
import { TransitionLink } from '@/components/transitions/transition-link'

/*
  Mirrors a full conversation row: avatar, name line, snippet line. Both
  variants matter — the list is reused in the rescue-center and business
  dashboard sidebars with compact/darkBg, where bg-muted is invisible against
  the dark sidebar and the taller row would shift the layout.
*/
function ConversationRowSkeleton({ darkBg, compact }: { darkBg: boolean; compact: boolean }) {
  const bar = darkBg ? 'bg-sidebar-foreground/10' : 'bg-muted'
  return (
    <div className={`flex items-center gap-3 animate-pulse ${compact ? 'px-3 py-2.5' : 'p-3'}`}>
      <div className={`shrink-0 rounded-full ${bar} ${compact ? 'h-5 w-5' : 'h-7 w-7'}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-3 w-2/3 rounded-xl ${bar}`} />
        {!compact && <div className={`h-2.5 w-1/2 rounded-xl ${bar}`} />}
      </div>
    </div>
  )
}

interface ChatConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
  activeConversationId?: string
  compact?: boolean
  /** When true, uses sidebar-aware colors for dark backgrounds */
  darkBg?: boolean
  /**
   * Conversation to open once the list has loaded — backs the
   * `/chat?conversation_id=` deep link. Fires at most once per mount so the
   * user stays free to navigate away afterwards.
   */
  autoSelectId?: string
}

export default function ChatConversationList({ onSelectConversation, activeConversationId, compact = false, darkBg = false, autoSelectId }: ChatConversationListProps) {
  const { t, i18n } = useTranslation('pets')
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'
  const { subscribe } = useWebSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadRequestRef = useRef(0)

  /*
    The request token replaces the old effect-scoped `cancelled` flag, matching
    chat-message-thread. The fetch is idempotent in request but not in outcome:
    with two loads in flight (a retry, or StrictMode's double-invoke in dev) a
    slow failure landing after a fast success would flip a correctly loaded list
    into the error state. Only the newest request may write.
  */
  const load = useCallback(() => {
    const requestId = ++loadRequestRef.current
    setLoading(true)
    setLoadError(false)
    listConversations()
      .then(({ data, error }) => {
        if (requestId !== loadRequestRef.current) return
        if (error || !data) {
          setLoadError(true)
        } else {
          setConversations(data)
        }
        setLoading(false)
      })
      .catch(() => {
        if (requestId !== loadRequestRef.current) return
        setLoadError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  const autoSelectedRef = useRef(false)

  useEffect(() => {
    if (!autoSelectId || autoSelectedRef.current || conversations.length === 0) return
    autoSelectedRef.current = true
    const match = conversations.find((c) => c.id === autoSelectId)
    // A missing id is not an error — the conversation may have been reaped by
    // the 30-day empty-conversation GC. Drop it silently rather than toasting.
    if (match) onSelectConversation(match)
  }, [autoSelectId, conversations, onSelectConversation])

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
      <div className="flex flex-col gap-1" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <ConversationRowSkeleton key={i} darkBg={darkBg} compact={compact} />
        ))}
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
        <p className={`text-xs ${darkBg ? 'text-sidebar-foreground/50' : 'text-muted-foreground/70'} max-w-60`}>
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
              /* Full: avatar + name + last message. No pet badge — the backend
                 has never sent a pet name on a conversation summary. */
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
