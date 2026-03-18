'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faCircleUser, faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { Conversation, Message, listMessages } from '@/lib/api/chat'
import { useWebSocket } from '@/lib/contexts/websocket-context'
import { useAuth } from '@/lib/contexts/auth-context'

interface ChatMessageThreadProps {
  conversation: Conversation
  onBack: () => void
  showBack?: boolean
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
}

function getDateLabel(dateStr: string, todayLabel: string, yesterdayLabel: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000)

  if (diffDays === 0) return todayLabel
  if (diffDays === 1) return yesterdayLabel
  return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

export default function ChatMessageThread({ conversation, onBack, showBack = true }: ChatMessageThreadProps) {
  const { t } = useTranslation('pets')
  const { user } = useAuth()
  const { subscribe, sendMessage, sendTyping, sendReadReceipt } = useWebSocket()

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [input, setInput] = useState('')
  const [showTyping, setShowTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSentRef = useRef(0)

  // Fetch initial messages
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    setHasMore(true)

    listMessages(conversation.id).then(({ data }) => {
      if (cancelled) return
      if (data) {
        // API returns newest first; reverse for display (oldest at top)
        setMessages(data.reverse())
        if (data.length < 50) setHasMore(false)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [conversation.id])

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView()
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const threshold = 60
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold

    // Load older messages on scroll to top
    if (el.scrollTop === 0 && hasMore && !loadingOlder && messages.length > 0) {
      setLoadingOlder(true)
      const oldestCreatedAt = messages[0].created_at
      const prevScrollHeight = el.scrollHeight

      listMessages(conversation.id, oldestCreatedAt).then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(prev => [...data.reverse(), ...prev])
          if (data.length < 50) setHasMore(false)
          // Maintain scroll position
          requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - prevScrollHeight
          })
        } else {
          setHasMore(false)
        }
        setLoadingOlder(false)
      })
    }
  }, [hasMore, loadingOlder, messages, conversation.id])

  // Subscribe to live events
  useEffect(() => {
    const unsubMsg = subscribe('new_message', (data: any) => {
      if (data.conversation_id !== conversation.id) return
      // Backend wraps the message object inside data.message
      const m = data.message || data
      const msg: Message = {
        id: m.id || crypto.randomUUID(),
        conversation_id: data.conversation_id,
        sender_id: m.sender_id,
        body: m.body,
        is_read: false,
        created_at: m.created_at || new Date().toISOString(),
      }
      setMessages(prev => [...prev, msg])

      // Auto-scroll if at bottom
      if (isAtBottomRef.current) {
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
      }

      // Send read receipt for received messages
      if (m.sender_id !== user?.id) {
        sendReadReceipt(conversation.id, msg.created_at)
      }
    })

    const unsubTyping = subscribe('typing', (data: any) => {
      if (data.conversation_id !== conversation.id) return
      if (data.sender_id === user?.id) return
      setShowTyping(true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setShowTyping(false), 3000)
    })

    const unsubRead = subscribe('read_receipt', (data: any) => {
      if (data.conversation_id !== conversation.id) return
      setMessages(prev => prev.map(m =>
        m.sender_id === user?.id ? { ...m, is_read: true } : m
      ))
    })

    return () => {
      unsubMsg()
      unsubTyping()
      unsubRead()
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [subscribe, conversation.id, user?.id, sendReadReceipt])

  // Send read receipt on mount for last received message
  useEffect(() => {
    if (loading || messages.length === 0) return
    const lastReceived = [...messages].reverse().find(m => m.sender_id !== user?.id)
    if (lastReceived) {
      sendReadReceipt(conversation.id, lastReceived.created_at)
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    const body = input.trim()
    if (!body) return
    sendMessage(conversation.id, body)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    // Throttle typing indicator to max 1 per 2 seconds
    const now = Date.now()
    if (now - lastTypingSentRef.current > 2000) {
      sendTyping(conversation.id)
      lastTypingSentRef.current = now
    }
  }

  const todayLabel = t('chat.today')
  const yesterdayLabel = t('chat.yesterday')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        {showBack && (
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
          </button>
        )}
        <FontAwesomeIcon icon={faCircleUser} className="text-2xl text-muted-foreground/40" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {conversation.other_user_name || conversation.other_user_email}
          </p>
          {conversation.pet_name && (
            <p className="text-xs text-pop-550">{conversation.pet_name}</p>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FontAwesomeIcon icon={faSpinner} className="text-2xl text-muted-foreground animate-spin" />
          </div>
        ) : (
          <>
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <FontAwesomeIcon icon={faSpinner} className="text-sm text-muted-foreground animate-spin" />
              </div>
            )}

            {messages.map((msg, i) => {
              const isSent = msg.sender_id === user?.id
              const showDate = i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at)

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        {getDateLabel(msg.created_at, todayLabel, yesterdayLabel)}
                      </span>
                    </div>
                  )}

                  <div className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 ${
                        isSent
                          ? 'bg-pop-550 text-background rounded-[16px_16px_4px_16px]'
                          : 'bg-card border border-border rounded-[16px_16px_16px_4px]'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap wrap-break-words">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${isSent ? 'text-background text-right' : 'text-muted-foreground'}`}>
                        {formatTime(msg.created_at)}
                        {isSent && (
                          <span className="ml-1">{msg.is_read ? '\u2713\u2713' : '\u2713'}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {showTyping && (
              <div className="flex justify-start mb-2">
                <div className="bg-card border border-border rounded-[16px_16px_16px_4px] px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 p-4 border-t border-border bg-background shrink-0">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          className="flex-1 rounded-xl border border-input bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-pop-550"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-pop-550 text-white rounded-xl p-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
        </button>
      </div>
    </div>
  )
}
