import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

/*
  Stable identities, not fresh objects per hook call: `subscribe` and
  `sendReadReceipt` sit in the live-events effect's dep array, so minting new
  functions on every render would tear down and re-open the subscription on each
  re-render — noise that has nothing to do with what these tests assert.
*/
const { ws, mockUser } = vi.hoisted(() => ({
  ws: {
    subscribe: vi.fn(() => () => {}),
    sendMessage: vi.fn(),
    sendTyping: vi.fn(),
    sendReadReceipt: vi.fn(),
  },
  mockUser: { id: 'me', email: 'me@pelu.do', role: 'member' },
}))

vi.mock('@/lib/api/chat', () => ({ listMessages: vi.fn() }))
vi.mock('@/lib/contexts/websocket-context', () => ({ useWebSocket: () => ws }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))

import ChatMessageThread from '@/components/chat/chat-message-thread'
import { listMessages } from '@/lib/api/chat'

const mockListMessages = vi.mocked(listMessages)

const CONVERSATION = {
  id: 'c1',
  rescue_center_id: 'rc1',
  member_id: 'me',
  other_user_name: 'Rescate RD',
  other_user_email: 'rc@pelu.do',
  last_message_body: null,
  last_message_at: null,
  unread_count: 0,
  created_at: '2026-07-29T10:00:00Z',
}

// A fresh array per call: the component reverses the payload in place.
const messages = () => [
  {
    id: 'm1',
    conversation_id: 'c1',
    sender_id: 'rc-user',
    body: '¿Sigue disponible Luna?',
    is_read: true,
    created_at: new Date().toISOString(),
  },
]

const renderThread = () =>
  renderWithProviders(
    <ChatMessageThread conversation={CONVERSATION} onBack={() => {}} />
  )

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom does not implement scrollIntoView; the thread auto-scrolls on load.
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ChatMessageThread', () => {
  it('shows an error with retry when the messages fail to load', async () => {
    mockListMessages.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderThread()

    expect(await screen.findByText('No pudimos cargar los mensajes')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('retries the fetch and renders the messages when retry succeeds', async () => {
    mockListMessages.mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderThread()
    await screen.findByRole('button', { name: 'Reintentar' })
    expect(mockListMessages).toHaveBeenCalledTimes(1)

    mockListMessages.mockResolvedValue({ data: messages(), error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('¿Sigue disponible Luna?')).toBeInTheDocument()
    expect(mockListMessages).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  /*
    The other half of the bug: a failed load used to be indistinguishable from a
    conversation with no messages yet. This pins that a real empty thread stays
    silent, so the alert above can only mean a failure.
  */
  it('renders a genuinely empty conversation without an error', async () => {
    mockListMessages.mockResolvedValue({ data: [], error: null })

    renderThread()

    // The spinner clearing is the proof the load finished — the composer below
    // it renders in every state, so its presence would prove nothing.
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('No pudimos cargar los mensajes')).not.toBeInTheDocument()
  })
})
