'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComments } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import ChatConversationList from '@/components/chat/chat-conversation-list'
import ChatMessageThread from '@/components/chat/chat-message-thread'
import { Conversation } from '@/lib/api/chat'

export function ChatPage() {
  const { t } = useTranslation('pets')
  const [active, setActive] = useState<Conversation | null>(null)

  return (
    <div className="min-h-screen bg-muted/30">
      <PetsHeader />
      <div className="h-[calc(100vh-72px)] flex max-w-6xl mx-auto">
        {/* Left sidebar — conversation list */}
        <div
          className={`w-80 shrink-0 bg-background border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.06)] z-10 flex flex-col overflow-hidden ${
            active ? 'hidden md:flex' : 'flex w-full md:w-80'
          }`}
        >
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-semibold">{t('chat.my_conversations')}</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatConversationList onSelectConversation={setActive} />
          </div>
        </div>

        {/* Right panel — message thread or empty state */}
        <div className={`flex-1 flex flex-col bg-background ${active ? 'flex' : 'hidden md:flex'}`}>
          {active ? (
            <ChatMessageThread
              conversation={active}
              onBack={() => setActive(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <FontAwesomeIcon icon={faComments} className="text-4xl text-muted-foreground/20" />
              <p className="text-sm">{t('chat.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
