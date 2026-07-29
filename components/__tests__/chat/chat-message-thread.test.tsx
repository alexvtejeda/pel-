import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

/*
  Stable identities, not fresh objects per hook call: `subscribe` and
  `sendReadReceipt` sit in the live-events effect's dep array, so minting new
  functions on every render would tear down and re-open the subscription on each
  re-render — noise that has nothing to do with what these tests assert.
*/
const { ws, handlers, mockUser } = vi.hoisted(() => {
  // Real subscriptions, so a test can push a socket event through the component
  // the way the provider does. The unsubscribe returned here is the one the
  // effect cleanup calls, so a re-render cannot leave a stale handler behind.
  const handlers = new Map<string, ((data: any) => void)[]>()
  return {
    handlers,
    ws: {
      connected: true,
      subscribe: vi.fn((type: string, handler: (data: any) => void) => {
        handlers.set(type, [...(handlers.get(type) ?? []), handler])
        return () => {
          handlers.set(type, (handlers.get(type) ?? []).filter(h => h !== handler))
        }
      }),
      sendMessage: vi.fn(),
      sendTyping: vi.fn(),
      sendReadReceipt: vi.fn(),
    },
    mockUser: { id: 'me', email: 'me@pelu.do', role: 'member' },
  }
})

vi.mock('@/lib/api/chat', () => ({ listMessages: vi.fn() }))
vi.mock('@/lib/contexts/websocket-context', () => ({ useWebSocket: () => ws }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))

import ChatMessageThread from '@/components/chat/chat-message-thread'
import { listMessages } from '@/lib/api/chat'
import type { Conversation, Message } from '@/lib/api/chat'

const mockListMessages = vi.mocked(listMessages)

type ListResult = { data: Message[] | null; error: string | null }

const conversation = (id: string, name: string): Conversation => ({
  id,
  rescue_center_id: 'rc1',
  member_id: 'me',
  other_user_name: name,
  other_user_email: `${id}@pelu.do`,
  last_message_body: null,
  last_message_at: null,
  unread_count: 0,
  created_at: '2026-07-29T10:00:00Z',
})

const CONVERSATION_A = conversation('c1', 'Rescate RD')
const CONVERSATION_B = conversation('c2', 'Huellitas')

const message = (id: string, body: string): Message => ({
  id,
  conversation_id: 'c1',
  sender_id: 'rc-user',
  body,
  is_read: true,
  created_at: new Date().toISOString(),
})

// sender_id matches the mocked user, which is what makes the bubble render its
// read receipt — received messages carry no tick at all.
const sentMessage = (id: string, body: string, isRead: boolean): Message => ({
  ...message(id, body),
  sender_id: mockUser.id,
  is_read: isRead,
})

/*
  Built per call, and handed over through mockImplementation rather than
  mockResolvedValue: the component reverses the payload in place, so one shared
  array would come back reversed on a second load and read as a component
  ordering bug.
*/
const messages = (): Message[] => [message('m1', '¿Sigue disponible Luna?')]

const resolveWithMessages = () =>
  mockListMessages.mockImplementation(async () => ({ data: messages(), error: null }))

const thread = (convo: Conversation) => (
  <ChatMessageThread conversation={convo} onBack={() => {}} />
)

const renderThread = (convo: Conversation = CONVERSATION_A) =>
  renderWithProviders(thread(convo))

const OFFLINE_BANNER = 'Sin conexión. Los mensajes no se enviarán hasta que se restablezca.'

const emit = (type: string, data: unknown) =>
  act(() => { (handlers.get(type) ?? []).forEach(handler => handler(data)) })

beforeEach(() => {
  vi.clearAllMocks()
  // clearAllMocks only clears call records, so these plain values need resetting
  // by hand — a test that drops the socket would otherwise leak into the next.
  ws.connected = true
  handlers.clear()
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

  /*
    The signature allows a null payload with no error string, and painting that
    as an empty thread is the same silent failure. Verified: this pins the
    outcome, not the branch — delete the `|| !data` half and `data.reverse()`
    throws into the .catch, which renders the identical error UI and keeps this
    green. No test can separate those two paths; what matters is that neither
    one renders an empty thread.
  */
  it('treats a null payload with no error as a failure', async () => {
    mockListMessages.mockResolvedValue({ data: null, error: null })

    renderThread()

    expect(await screen.findByText('No pudimos cargar los mensajes')).toBeInTheDocument()
  })

  // listMessages is documented never to throw, so the .catch is belt to that
  // suspenders — but a spinner that never stops is the worst of the three states.
  it('stops spinning and surfaces the error when the request rejects', async () => {
    mockListMessages.mockRejectedValue(new Error('boom'))

    renderThread()

    expect(await screen.findByText('No pudimos cargar los mensajes')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('retries the fetch and renders the messages when retry succeeds', async () => {
    mockListMessages.mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderThread()
    await screen.findByRole('button', { name: 'Reintentar' })
    expect(mockListMessages).toHaveBeenCalledTimes(1)

    resolveWithMessages()
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

  describe('when the socket is down', () => {
    it('says so and blocks the composer', async () => {
      ws.connected = false
      resolveWithMessages()

      renderThread()
      await screen.findByText('¿Sigue disponible Luna?')

      expect(screen.getByText(OFFLINE_BANNER)).toBeInTheDocument()
      expect(screen.getByLabelText('Mensaje')).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    })

    /*
      The actual bug: the input cleared on Enter regardless of socket state, so
      the typed message vanished while the socket send was a no-op. Staged the
      way it happens — typed while connected, socket drops, then Enter — rather
      than by typing into an already-disabled input.

      The disabled attribute is the defence a real browser applies (it never
      dispatches keydown to a disabled input); jsdom is more permissive, which
      is what lets this reach handleSend and pin the guard inside it. Both
      matter: the attribute stops the keypress, the guard stops the clear.
    */
    it('neither sends nor clears the draft when Enter is pressed offline', async () => {
      resolveWithMessages()

      const { rerender } = renderThread()
      await screen.findByText('¿Sigue disponible Luna?')

      const input = screen.getByLabelText('Mensaje')
      fireEvent.change(input, { target: { value: '¿Puedo visitarla el sábado?' } })

      ws.connected = false
      rerender(thread(CONVERSATION_A))

      fireEvent.keyDown(input, { key: 'Enter' })

      expect(ws.sendMessage).not.toHaveBeenCalled()
      expect(input).toHaveValue('¿Puedo visitarla el sábado?')
    })
  })

  it('sends and clears the draft while connected', async () => {
    resolveWithMessages()

    renderThread()
    await screen.findByText('¿Sigue disponible Luna?')

    const input = screen.getByLabelText('Mensaje')
    fireEvent.change(input, { target: { value: '¿Puedo visitarla el sábado?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(ws.sendMessage).toHaveBeenCalledWith(CONVERSATION_A.id, '¿Puedo visitarla el sábado?')
    expect(input).toHaveValue('')
    expect(screen.queryByText(OFFLINE_BANNER)).not.toBeInTheDocument()
  })

  /*
    These two cover the request token. Both stage the same user action — leaving
    a conversation while one of its requests is still in flight — and both assert
    the abandoned conversation's messages never reach the thread now on screen.
    Remove either token check and the matching test goes red.
  */
  describe('when the user switches conversation mid-request', () => {
    it('drops a pending initial load from the conversation left behind', async () => {
      let releaseA!: (value: ListResult) => void
      mockListMessages.mockImplementation((id: string) => {
        if (id === CONVERSATION_A.id) {
          return new Promise<ListResult>(resolve => { releaseA = resolve })
        }
        return Promise.resolve({ data: [message('b1', 'Mensaje de Huellitas')], error: null })
      })

      const { rerender } = renderThread(CONVERSATION_A)
      // A is still in flight — nothing has resolved yet.
      expect(screen.getByRole('status')).toBeInTheDocument()

      rerender(thread(CONVERSATION_B))
      expect(await screen.findByText('Mensaje de Huellitas')).toBeInTheDocument()

      await act(async () => {
        releaseA({ data: [message('a1', 'Mensaje de Rescate RD')], error: null })
      })

      expect(screen.queryByText('Mensaje de Rescate RD')).not.toBeInTheDocument()
      expect(screen.getByText('Mensaje de Huellitas')).toBeInTheDocument()
    })

    it('drops a pending older-messages page from the conversation left behind', async () => {
      // 50 keeps hasMore true, which is what lets a scroll to the top paginate.
      const pageOfA = Array.from({ length: 50 }, (_, i) => message(`a${i}`, `Mensaje A ${i}`))
      let releaseOlderA!: (value: ListResult) => void

      mockListMessages.mockImplementation((id: string, cursor?: string) => {
        if (cursor) return new Promise<ListResult>(resolve => { releaseOlderA = resolve })
        if (id === CONVERSATION_A.id) return Promise.resolve({ data: pageOfA.slice(), error: null })
        return Promise.resolve({ data: [message('b1', 'Mensaje de Huellitas')], error: null })
      })

      const { container, rerender } = renderThread(CONVERSATION_A)
      expect(await screen.findByText('Mensaje A 0')).toBeInTheDocument()

      /*
        The scroller carries no role or label, so it is queried by its overflow
        class. jsdom reports scrollTop 0, which is exactly the top-of-thread
        condition handleScroll paginates on.
      */
      const scroller = container.querySelector('.overflow-y-auto')!
      await act(async () => { fireEvent.scroll(scroller) })
      expect(mockListMessages).toHaveBeenCalledWith(CONVERSATION_A.id, expect.any(String))

      rerender(thread(CONVERSATION_B))
      expect(await screen.findByText('Mensaje de Huellitas')).toBeInTheDocument()

      await act(async () => {
        releaseOlderA({ data: [message('a-old', 'Mensaje viejo de Rescate RD')], error: null })
      })

      expect(screen.queryByText('Mensaje viejo de Rescate RD')).not.toBeInTheDocument()
      expect(screen.getByText('Mensaje de Huellitas')).toBeInTheDocument()
      // The stale page must not leave the older-messages spinner running either.
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('screen-reader semantics', () => {
    it('announces the thread as a polite log', async () => {
      resolveWithMessages()

      renderThread()
      await screen.findByText('¿Sigue disponible Luna?')

      const log = screen.getByRole('log')
      expect(log).toHaveAttribute('aria-live', 'polite')
      expect(log).toHaveTextContent('¿Sigue disponible Luna?')
    })

    it('names who is typing and hides the animated dots', async () => {
      resolveWithMessages()

      const { container } = renderThread()
      await screen.findByText('¿Sigue disponible Luna?')

      await emit('typing', { conversation_id: CONVERSATION_A.id, sender_id: 'rc-user' })

      const alternative = screen.getByText('Rescate RD está escribiendo…')
      expect(alternative).toBeInTheDocument()
      // The dots carry the same meaning visually, so announcing them too would
      // read as duplicate noise.
      const dots = container.querySelector('.animate-bounce')
      expect(dots?.closest('[aria-hidden="true"]')).not.toBeNull()
    })

    it('reads each sent message as delivered or read', async () => {
      mockListMessages.mockImplementation(async () => ({
        data: [sentMessage('s1', 'Voy en camino', true), sentMessage('s2', '¿Nos vemos?', false)],
        error: null,
      }))

      renderThread()
      await screen.findByText('¿Nos vemos?')

      expect(screen.getByRole('img', { name: 'Leído' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Enviado' })).toBeInTheDocument()
      // The bare ✓/✓✓ glyphs read as literal check marks, or as nothing at all.
      expect(screen.queryByText(/✓/)).not.toBeInTheDocument()
    })
  })
})
