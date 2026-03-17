'use client'

import { useState } from 'react'
import ChatConversationList from '@/components/chat/chat-conversation-list'
import ChatMessageThread from '@/components/chat/chat-message-thread'
import { Conversation } from '@/lib/api/chat'

export function ChatTab() {
  const [active, setActive] = useState<Conversation | null>(null)
  return active
    ? <ChatMessageThread conversation={active} onBack={() => setActive(null)} />
    : <ChatConversationList onSelectConversation={setActive} />
}
