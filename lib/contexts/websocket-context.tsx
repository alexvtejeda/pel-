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
  /*
    Identifies which run of the connection effect a socket belongs to. Bumped on
    every setup AND every teardown, so any socket opened by an earlier run is
    permanently stale and its onclose can neither reconnect nor touch wsRef.

    This replaces a single shared `mountedRef` boolean, which could not tell a
    stale socket from a live one: teardown set it false and the next setup set it
    straight back to true, so a socket closed by teardown still saw `true`, nulled
    wsRef and scheduled its own reconnect — orphaning the socket the new run had
    just opened. Nothing ever closed the orphan, so it kept dispatching and every
    handler ran once per surviving socket. That is why one sent message showed up
    as three unread.
  */
  const connectionGenRef = useRef(0)
  // Track unread per conversation for read_receipt decrements
  const unreadPerConvoRef = useRef<Map<string, number>>(new Map())

  const shouldConnect = user?.role === 'member' || user?.role === 'rescue_center' || user?.role === 'business'

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
      // Backend wraps the message payload inside data.message
      const m = data.message || data
      // Only increment if the message is from someone else
      if (m.sender_id !== user?.id) {
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
    const generation = ++connectionGenRef.current
    const isCurrent = () => connectionGenRef.current === generation

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
      if (!isCurrent()) return

      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        if (!isCurrent()) return
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
        // A socket from a superseded run must stay dead: reconnecting here is
        // what used to leave two live sockets dispatching the same event.
        if (!isCurrent()) return
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
      // Retires this run's socket before it is closed, so the onclose below
      // cannot schedule a reconnect that races the next run's own connect().
      connectionGenRef.current++
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
      // Retire the live socket first, or closing it below reconnects straight
      // into a 401 loop until `user` clears and the effect above tears down.
      connectionGenRef.current++
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
