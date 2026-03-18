'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComments } from '@fortawesome/free-solid-svg-icons'
import ChatConversationList from '@/components/chat/chat-conversation-list'
import ChatMessageThread from '@/components/chat/chat-message-thread'
import { Conversation } from '@/lib/api/chat'
import { useSidebar } from '@/components/ui/sidebar'

export function ChatTab() {
  const [active, setActive] = useState<Conversation | null>(null)
  const { state } = useSidebar()
  const sidebarExpanded = state === 'expanded'

  return (
    <div className="flex h-full bg-muted">
      {/* Conversation list — middle layer (sits on bg-sidebar, same as header) */}
      <div
        className={`rounded-tl-2xl shrink-0 overflow-y-auto transition-[width] duration-200 bg-background z-10 ${
          sidebarExpanded ? 'w-50' : 'w-70'
        }`}
      >
        <div className="px-4 py-3">
          <h2 className={`font-semibold text-foreground ${sidebarExpanded ? 'text-xs' : 'text-sm'}`}>
            Conversaciones
          </h2>
        </div>
        <div className="px-2 pb-2">
          <ChatConversationList
            onSelectConversation={setActive}
            activeConversationId={active?.id}
            compact={sidebarExpanded}
          />
        </div>
      </div>

      {/* Chat content — top layer (elevated, brightest) */}
      <div className="flex-1 min-w-0 bg-background shadow-[inset_2px_2px_8px_var(--color-input)]">
        {active ? (
          <ChatMessageThread
            conversation={active}
            onBack={() => setActive(null)}
            showBack={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <FontAwesomeIcon icon={faComments} className="text-2xl text-muted-foreground/40" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Selecciona una conversación</p>
              <p className="text-xs text-muted-foreground/60">Elige un chat para comenzar a conversar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
