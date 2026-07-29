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

const mockList = vi.mocked(listConversations)

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

  it('retries the fetch when retry is pressed', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderList()
    await screen.findByRole('button', { name: 'Reintentar' })

    mockList.mockResolvedValue({ data: [], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('No tienes conversaciones aún')).toBeInTheDocument()
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
