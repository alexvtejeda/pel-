'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComments } from '@fortawesome/free-solid-svg-icons'
import { toast } from 'sonner'
import { PetsHeader } from '@/components/pets/pets-header'
import ChatConversationList from '@/components/chat/chat-conversation-list'
import ChatMessageThread from '@/components/chat/chat-message-thread'
import { Conversation } from '@/lib/api/chat'

export function ChatPage() {
  const { t } = useTranslation(['pets', 'transport'])
  const searchParams = useSearchParams()
  const router = useRouter()
  const [active, setActive] = useState<Conversation | null>(null)
  const welcomeShown = useRef(false)

  // Show welcome toast when arriving from submission approval
  useEffect(() => {
    if (searchParams?.get('welcome') === '1' && !welcomeShown.current) {
      welcomeShown.current = true
      toast.success(t('chat.welcome_toast', { ns: 'transport' }), { duration: 10000 })
      // Clean URL without re-render
      router.replace('/chat', { scroll: false })
    }
  }, [searchParams, t, router])

  /*
    A flex column, not viewport arithmetic: the old h-[calc(100vh-72px)] hard-coded
    a header height the header does not have (~88px), so the panels sat 16px past
    the fold. min-h-dvh + flex-1 lets the header measure itself.
  */
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <PetsHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 overflow-hidden p-0 sm:p-4">
        {/* Left sidebar — conversation list */}
        <div
          className={`w-80 shrink-0 flex-col overflow-hidden rounded-none border-border bg-background sm:rounded-2xl sm:border ${
            active ? 'hidden md:flex' : 'flex w-full md:w-80'
          }`}
        >
          <div className="border-b border-border p-4">
            <h1 className="text-lg font-semibold">{t('chat.my_conversations')}</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatConversationList onSelectConversation={setActive} />
          </div>
        </div>

        {/* Right panel — message thread or empty state */}
        <div
          className={`flex-1 flex-col overflow-hidden rounded-none border-border bg-background sm:rounded-2xl sm:border ${
            active ? 'flex' : 'hidden md:flex'
          }`}
        >
          {active ? (
            <ChatMessageThread
              conversation={active}
              onBack={() => setActive(null)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <FontAwesomeIcon icon={faComments} className="text-4xl text-muted-foreground/20" />
              <p className="text-sm">{t('chat.select_conversation')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
