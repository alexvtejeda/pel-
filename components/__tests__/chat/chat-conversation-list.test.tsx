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
const renderList = (props: { compact?: boolean; darkBg?: boolean } = {}) =>
  renderWithProviders(
    <RouteTransitionProvider>
      <ChatConversationList onSelectConversation={() => {}} {...props} />
    </RouteTransitionProvider>
  )

/*
  A fetch that never settles, so the loading branch stays on screen for the
  assertion instead of racing the microtask queue.
*/
const stayLoading = () => mockList.mockImplementation(() => new Promise<never>(() => {}))

const skeletonRows = (container: HTMLElement) => container.querySelectorAll('.animate-pulse')

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
})
