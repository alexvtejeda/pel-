import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

/*
  Hoisted because vi.mock factories are lifted above the imports — a plain
  `const` here would be in its TDZ when the factory runs. The map lets a test
  reach in and fire the `new_message` the provider would have dispatched.
*/
const { wsHandlers } = vi.hoisted(() => ({
  wsHandlers: new Map<string, (data: unknown) => void>(),
}))

vi.mock('@/lib/api/chat', () => ({ listConversations: vi.fn() }))
vi.mock('@/lib/contexts/websocket-context', () => ({
  useWebSocket: () => ({
    subscribe: (type: string, handler: (data: unknown) => void) => {
      wsHandlers.set(type, handler)
      return () => wsHandlers.delete(type)
    },
  }),
}))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u-me' } }),
}))

import ChatConversationList from '@/components/chat/chat-conversation-list'
import { RouteTransitionProvider } from '@/components/transitions/route-transition-context'
import { listConversations } from '@/lib/api/chat'
import type { Conversation } from '@/lib/api/chat'

const mockList = vi.mocked(listConversations)

// Shaped from the backend's ConversationSummary (api: internal/chat/repository.go),
// which is what the Conversation interface now mirrors — every field the full
// (non-compact) row reads is present. There is deliberately no pet_name: the API
// has never sent one, and the badge that read it has been deleted.
const CONVERSATION: Conversation = {
  id: 'c1',
  type: 'adoption',
  pet_id: 'p1',
  other_user_id: 'u-rc',
  other_user_name: 'Rescate RD',
  other_user_email: 'hola@rescaterd.do',
  last_message_body: '¿Sigue disponible Luna?',
  last_message_at: '2026-01-04T10:00:00Z',
  unread_count: 0,
  created_at: '2026-01-04T09:00:00Z',
}

/*
  RouteTransitionProvider is here because the empty state's "Ver mascotas" is a
  TransitionLink, and useRouteTransition() throws outside the provider. The root
  layout wraps every route in it, so this mirrors production rather than papering
  over a missing provider. It reads useRouter/usePathname, both mocked by
  renderWithProviders.
*/
const renderList = (
  props: {
    compact?: boolean
    darkBg?: boolean
    activeConversationId?: string
    onSelectConversation?: (c: Conversation) => void
  } = {}
) => {
  const { onSelectConversation = () => {}, ...rest } = props
  return renderWithProviders(
    <RouteTransitionProvider>
      <ChatConversationList onSelectConversation={onSelectConversation} {...rest} />
    </RouteTransitionProvider>
  )
}

/*
  A fetch that never settles, so the loading branch stays on screen for the
  assertion instead of racing the microtask queue.
*/
const stayLoading = () => mockList.mockImplementation(() => new Promise<never>(() => {}))

const skeletonRows = (container: HTMLElement) => container.querySelectorAll('.animate-pulse')

beforeEach(() => {
  vi.clearAllMocks()
  wsHandlers.clear()
})

// The badge span is the only .bg-pop-solid in a row, so this reads the unread
// count without colliding with the timestamp, which is also a bare number.
const badge = (container: HTMLElement) => container.querySelector('.bg-pop-solid')

const emitMessage = (conversationId: string, senderId: string | null, body = 'Hola') =>
  act(() => {
    wsHandlers.get('new_message')?.({
      type: 'new_message',
      conversation_id: conversationId,
      // Mirrors the real frame: the payload is nested under `message`.
      message: {
        id: `m-${body}`,
        sender_id: senderId,
        body,
        created_at: '2026-01-04T11:00:00Z',
      },
    })
  })

describe('ChatConversationList', () => {
  it('shows an error with retry when the fetch fails', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderList()

    expect(await screen.findByText('No pudimos cargar tus conversaciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // The empty state must NOT be what a failure looks like.
    expect(screen.queryByText('No tienes conversaciones aún')).not.toBeInTheDocument()
  })

  /*
    The retry resolves with a REAL conversation, not an empty list. Asserting the
    empty state here would pass against a broken `onRetry` that only cleared the
    error flag without refetching — `conversations` is already [] at that point,
    so both a working and a broken retry would paint the same empty state. A row
    that can only exist if the fetch actually re-ran is the honest guard.
  */
  it('retries the fetch when retry is pressed', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderList()
    await screen.findByRole('button', { name: 'Reintentar' })

    mockList.mockResolvedValue({ data: [CONVERSATION], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Rescate RD')).toBeInTheDocument()
    expect(screen.getByText('¿Sigue disponible Luna?')).toBeInTheDocument()
    expect(mockList).toHaveBeenCalledTimes(2)
  })

  /*
    The rejected promise is what the .catch exists for. Without it `loading`
    never flips back and the sidebar spins forever — the second half of the
    reported bug. Asserting the spinner is GONE is the part that pins it.
  */
  it('shows the error state instead of spinning forever when the promise rejects', async () => {
    mockList.mockRejectedValue(new Error('boom'))

    renderList()

    expect(await screen.findByText('No pudimos cargar tus conversaciones')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('treats a null payload with no error as a failure, not an empty list', async () => {
    mockList.mockResolvedValue({ data: null, error: null })

    renderList()

    expect(await screen.findByText('No pudimos cargar tus conversaciones')).toBeInTheDocument()
    expect(screen.queryByText('No tienes conversaciones aún')).not.toBeInTheDocument()
  })

  /*
    A centred spinner in a 320px column reads as broken rather than loading, and
    the rows jumped in when data landed. Six placeholders that mirror the real
    row is the shape the list settles into.
  */
  describe('while loading', () => {
    it('renders skeleton rows instead of a spinner', () => {
      stayLoading()

      const { container } = renderList()

      expect(skeletonRows(container)).toHaveLength(6)
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      // The full row carries a snippet line under the name; so does its
      // placeholder. This is also what gives the compact test below its teeth.
      expect(container.querySelectorAll('.h-2\\.5')).toHaveLength(6)
    })

    /*
      The list is reused in the rescue-center and business dashboard sidebars.
      bg-muted is all but invisible against the dark sidebar, so the dark variant
      has to swap the bar colour or the sidebar just looks empty while loading.
    */
    it('uses sidebar-aware bars on a dark background', () => {
      stayLoading()

      const { container } = renderList({ darkBg: true })

      expect(skeletonRows(container)).toHaveLength(6)
      expect(container.querySelector('.bg-muted')).toBeNull()
    })

    // The compact row has no snippet line, so neither may the skeleton — a
    // taller placeholder would make the list resize the moment data lands.
    it('drops the snippet line in the compact variant', () => {
      stayLoading()

      const { container } = renderList({ compact: true })

      expect(skeletonRows(container)).toHaveLength(6)
      expect(container.querySelectorAll('.h-2\\.5')).toHaveLength(0)
    })

    it('replaces the skeleton with the real rows once the fetch lands', async () => {
      mockList.mockResolvedValue({ data: [CONVERSATION], error: null })

      const { container } = renderList()

      expect(await screen.findByText('Rescate RD')).toBeInTheDocument()
      expect(skeletonRows(container)).toHaveLength(0)
    })
  })

  it('explains how conversations start when there are genuinely none', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderList()

    expect(await screen.findByText('No tienes conversaciones aún')).toBeInTheDocument()
    expect(
      screen.getByText('Cuando un centro apruebe tu solicitud, podrás chatear aquí.')
    ).toBeInTheDocument()
  })

  /*
    Alex sent one message and his own row lit up with an unread badge. The list
    incremented on every new_message with no sender check — websocket-context
    has always had that guard, this component never did.
  */
  describe('unread badge', () => {
    beforeEach(() => mockList.mockResolvedValue({ data: [CONVERSATION], error: null }))

    it('does not badge a conversation for a message you sent yourself', async () => {
      const { container } = renderList()
      await screen.findByText('Rescate RD')

      emitMessage('c1', 'u-me', 'Klk mi helmanao')

      expect(badge(container)).toBeNull()
      // The preview must still move — this is a counting fix, not a mute.
      expect(screen.getByText('Klk mi helmanao')).toBeInTheDocument()
    })

    it('badges a conversation when the message comes from the other party', async () => {
      const { container } = renderList()
      await screen.findByText('Rescate RD')

      emitMessage('c1', 'u-rc', 'Sí, sigue disponible')

      expect(badge(container)).toHaveTextContent('1')
    })

    // sender_id is null on transport system messages. Those are not "yours",
    // so a null sender must not fall through the own-message guard.
    it('badges a system message with no sender', async () => {
      const { container } = renderList()
      await screen.findByText('Rescate RD')

      emitMessage('c1', null, 'El viaje comenzó')

      expect(badge(container)).toHaveTextContent('1')
    })

    it('does not badge the conversation that is already open', async () => {
      const { container } = renderList({ activeConversationId: 'c1' })
      await screen.findByText('Rescate RD')

      emitMessage('c1', 'u-rc', 'Sí, sigue disponible')

      expect(badge(container)).toBeNull()
    })

    /*
      Opening the thread is what marks it read — the message thread fires the
      receipt, and the DB row really does flip to is_read. Only the list's local
      copy of the count was left stale, so the badge survived until a reload.
    */
    it('clears the badge when the conversation is opened', async () => {
      mockList.mockResolvedValue({
        data: [{ ...CONVERSATION, unread_count: 3 }],
        error: null,
      })
      const onSelect = vi.fn()
      const { container } = renderList({ onSelectConversation: onSelect })
      await screen.findByText('Rescate RD')
      expect(badge(container)).toHaveTextContent('3')

      fireEvent.click(screen.getByText('Rescate RD'))

      expect(badge(container)).toBeNull()
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }))
    })
  })
})
