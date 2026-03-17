'use client'
import { useState } from 'react'
import { PetsHeader } from '@/components/pets/pets-header'
import ChatConversationList from '@/components/chat/chat-conversation-list'
import ChatMessageThread from '@/components/chat/chat-message-thread'
import { Conversation } from '@/lib/api/chat'

export function ChatPage() {
  const [active, setActive] = useState<Conversation | null>(null)
  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />
      <div className="max-w-2xl mx-auto px-4 py-6">
        {active
          ? <ChatMessageThread conversation={active} onBack={() => setActive(null)} />
          : <ChatConversationList onSelectConversation={setActive} />
        }
      </div>
    </div>
  )
}
