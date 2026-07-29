import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/chat', () => ({ listConversations: vi.fn() }))
vi.mock('@/lib/contexts/websocket-context', () => ({
  useWebSocket: () => ({ subscribe: () => () => {} }),
}))

import ChatConversationList from '@/components/chat/chat-conversation-list'
import { RouteTransitionProvider } from '@/components/transitions/route-transition-context'
import { listConversations } from '@/lib/api/chat'
import type { Conversation } from '@/lib/api/chat'

const mockList = vi.mocked(listConversations)

// Shaped from the Conversation interface in lib/api/chat.ts — every field the
// full (non-compact) row reads is present.
const CONVERSATION: Conversation = {
  id: 'c1',
  rescue_center_id: 'rc1',
  member_id: 'm1',
  other_user_name: 'Rescate RD',
  other_user_email: 'hola@rescaterd.do',
  last_message_body: '¿Sigue disponible Luna?',
  last_message_at: '2026-01-04T10:00:00Z',
  unread_count: 0,
  created_at: '2026-01-04T09:00:00Z',
  pet_name: 'Luna',
}

/*
  RouteTransitionProvider is here because the empty state's "Ver mascotas" is a
  TransitionLink, and useRouteTransition() throws outside the provider. The root
  layout wraps every route in it, so this mirrors production rather than papering
  over a missing provider. It reads useRouter/usePathname, both mocked by
  renderWithProviders.
*/
const renderList = () =>
  renderWithProviders(
    <RouteTransitionProvider>
      <ChatConversationList onSelectConversation={() => {}} />
    </RouteTransitionProvider>
  )

beforeEach(() => vi.clearAllMocks())

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

  it('explains how conversations start when there are genuinely none', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderList()

    expect(await screen.findByText('No tienes conversaciones aún')).toBeInTheDocument()
    expect(
      screen.getByText('Cuando un centro apruebe tu solicitud, podrás chatear aquí.')
    ).toBeInTheDocument()
  })
})
