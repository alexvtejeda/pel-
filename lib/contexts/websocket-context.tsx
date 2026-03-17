'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { listConversations } from '@/lib/api/chat'

interface WebSocketContextType {
  connected: boolean
  sendMessage: (conversationId: string, body: string) => void
  sendTyping: (conversationId: string) => void
  sendReadReceipt: (conversationId: string, upTo: string) => void
  subscribe: (type: string, handler: (data: any) => void) => () => void
  unreadChatCount: number
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  sendMessage: () => {},
  sendTyping: () => {},
  sendReadReceipt: () => {},
  subscribe: () => () => {},
  unreadChatCount: 0,
})

export const useWebSocket = () => useContext(WebSocketContext)

function getWsUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const wsBase = base.replace(/^https/, 'wss').replace(/^http/, 'ws')
  return `${wsBase}/api/v1/ws`
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [unreadChatCount, setUnreadChatCount] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const retryDelayRef = useRef(1000)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  // Track unread per conversation for read_receipt decrements
  const unreadPerConvoRef = useRef<Map<string, number>>(new Map())

  const shouldConnect = user?.role === 'member' || user?.role === 'rescue_center'

  const dispatch = useCallback((type: string, data: any) => {
    const handlers = subscribersRef.current.get(type)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }, [])

  const subscribe = useCallback((type: string, handler: (data: any) => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set())
    }
    subscribersRef.current.get(type)!.add(handler)

    return () => {
      const handlers = subscribersRef.current.get(type)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) subscribersRef.current.delete(type)
      }
    }
  }, [])

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  const sendMessage = useCallback((conversationId: string, body: string) => {
    send({ type: 'send_message', conversation_id: conversationId, body })
  }, [send])

  const sendTyping = useCallback((conversationId: string) => {
    send({ type: 'typing', conversation_id: conversationId })
  }, [send])

  const sendReadReceipt = useCallback((conversationId: string, upTo: string) => {
    send({ type: 'read_receipt', conversation_id: conversationId, up_to: upTo })
    // Decrement unread count for this conversation
    const convoUnread = unreadPerConvoRef.current.get(conversationId) || 0
    if (convoUnread > 0) {
      setUnreadChatCount(prev => Math.max(0, prev - convoUnread))
      unreadPerConvoRef.current.set(conversationId, 0)
    }
  }, [send])

  // Fetch initial unread count
  useEffect(() => {
    if (!shouldConnect) {
      setUnreadChatCount(0)
      unreadPerConvoRef.current.clear()
      return
    }

    let cancelled = false
    listConversations().then(({ data }) => {
      if (cancelled || !data) return
      let total = 0
      for (const c of data) {
        total += c.unread_count
        if (c.unread_count > 0) {
          unreadPerConvoRef.current.set(c.id, c.unread_count)
        }
      }
      setUnreadChatCount(total)
    })

    return () => { cancelled = true }
  }, [shouldConnect])

  // Track new_message events to increment unread
  useEffect(() => {
    if (!shouldConnect) return

    const unsub = subscribe('new_message', (data: any) => {
      // Only increment if the message is from someone else
      if (data.sender_id !== user?.id) {
        const convoId = data.conversation_id
        const current = unreadPerConvoRef.current.get(convoId) || 0
        unreadPerConvoRef.current.set(convoId, current + 1)
        setUnreadChatCount(prev => prev + 1)
      }
    })

    return unsub
  }, [shouldConnect, subscribe, user?.id])

  // WebSocket connection lifecycle
  useEffect(() => {
    mountedRef.current = true

    if (!shouldConnect) {
      // Clean up any existing connection
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      setConnected(false)
      return
    }

    function connect() {
      if (!mountedRef.current) return

      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        retryDelayRef.current = 1000
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type) {
            dispatch(msg.type, msg)
          }
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        wsRef.current = null

        // Reconnect with exponential backoff
        const delay = retryDelayRef.current
        retryDelayRef.current = Math.min(delay * 2, 30000)
        retryTimerRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        // onclose will fire after onerror, handling reconnect
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [shouldConnect, dispatch])

  // Listen for session-cleared to disconnect
  useEffect(() => {
    const handleSessionCleared = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setConnected(false)
      setUnreadChatCount(0)
      unreadPerConvoRef.current.clear()
    }

    window.addEventListener('pelu:session-cleared', handleSessionCleared)
    return () => window.removeEventListener('pelu:session-cleared', handleSessionCleared)
  }, [])

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, sendTyping, sendReadReceipt, subscribe, unreadChatCount }}>
      {children}
    </WebSocketContext.Provider>
  )
}
