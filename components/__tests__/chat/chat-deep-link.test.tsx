import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'

/*
  A real subscribe registry, so a test can push a socket event through the list
  the way the provider does. That is what mints a NEW `conversations` array
  without the URL changing — the exact condition the auto-select ref guards.
*/
const { ws, handlers, mockUser } = vi.hoisted(() => {
  const handlers = new Map<string, ((data: unknown) => void)[]>()
  return {
    handlers,
    ws: {
      connected: true,
      unreadChatCount: 0,
      subscribe: vi.fn((type: string, handler: (data: unknown) => void) => {
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

vi.mock('@/lib/api/chat', () => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
}))
vi.mock('@/lib/contexts/websocket-context', () => ({ useWebSocket: () => ws }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))
/*
  The header is stubbed rather than rendered: it reaches for the auth context,
  the route-transition context and `GET /auth/me`, none of which this test is
  about, and all of which would have to be faked just to get the page on screen.
*/
vi.mock('@/components/pets/pets-header', () => ({ PetsHeader: () => null }))

import { renderWithProviders } from '../test-utils'
import * as nav from 'next/navigation'
import { ChatPage } from '@/components/chat/chat-page'
import { listConversations, listMessages } from '@/lib/api/chat'
import type { Conversation } from '@/lib/api/chat'

const mockList = vi.mocked(listConversations)
const mockListMessages = vi.mocked(listMessages)

/*
  `renderWithProviders` registers its own `next/navigation` mock, and because
  test-utils is imported AFTER this file's hoisted vi.mock calls, its factory is
  the one that wins — a `vi.mock('next/navigation', …)` written here is silently
  discarded. Spying on the resulting namespace is what actually reaches the
  component.
*/
const setSearch = (qs: string) =>
  vi.spyOn(nav, 'useSearchParams').mockReturnValue(
    new URLSearchParams(qs) as ReturnType<typeof nav.useSearchParams>
  )

const conv = (id: string, name: string): Conversation => ({
  id,
  type: 'service',
  pet_id: null,
  other_user_id: `u-${id}`,
  other_user_name: name,
  other_user_email: `${name}@example.com`,
  last_message_body: null,
  last_message_at: null,
  unread_count: 0,
  created_at: '2026-01-01T00:00:00Z',
})

// Selected → the name renders in the list row AND the thread header; unselected
// → the row only. Counting occurrences is what separates the two states.
const occurrences = (name: string) => screen.queryAllByText(name).length

beforeEach(() => {
  vi.restoreAllMocks()
  handlers.clear()
  mockListMessages.mockResolvedValue({ data: [], error: null })
  Element.prototype.scrollIntoView = vi.fn()
})

describe('chat deep link', () => {
  it('opens the conversation named in the URL', async () => {
    setSearch('conversation_id=c2')
    mockList.mockResolvedValue({ data: [conv('c1', 'Ana'), conv('c2', 'María')], error: null })

    renderWithProviders(<ChatPage />)

    await waitFor(() => expect(occurrences('María')).toBeGreaterThan(1))
    expect(occurrences('Ana')).toBe(1)
  })

  /*
    A missing id is not an error — the conversation may have been reaped by the
    30-day empty-conversation GC. The page must settle on its normal empty
    state rather than toast or throw.
  */
  it('ignores an id that is not in the list', async () => {
    setSearch('conversation_id=nope')
    mockList.mockResolvedValue({ data: [conv('c1', 'Ana')], error: null })

    renderWithProviders(<ChatPage />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    expect(occurrences('Ana')).toBe(1)
    expect(screen.getByText(/Selecciona una conversación/)).toBeInTheDocument()
  })

  it('selects nothing when the URL carries no id', async () => {
    setSearch('')
    mockList.mockResolvedValue({ data: [conv('c1', 'Ana'), conv('c2', 'María')], error: null })

    renderWithProviders(<ChatPage />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    expect(occurrences('María')).toBe(1)
  })

  /*
    The ref, not the URL, is what makes this one-shot. A socket message rebuilds
    the conversations array, so an effect keyed only on `[autoSelectId,
    conversations]` would re-run and yank the user back to the deep-linked
    thread every time a message arrived anywhere.
  */
  it('does not steal the selection back after the user moves on', async () => {
    setSearch('conversation_id=c2')
    mockList.mockResolvedValue({ data: [conv('c1', 'Ana'), conv('c2', 'María')], error: null })

    renderWithProviders(<ChatPage />)
    await waitFor(() => expect(occurrences('María')).toBeGreaterThan(1))

    fireEvent.click(screen.getByText('Ana'))
    await waitFor(() => expect(occurrences('Ana')).toBeGreaterThan(1))

    act(() => {
      ;(handlers.get('new_message') ?? []).forEach(h =>
        h({ conversation_id: 'c1', message: { id: 'm1', body: 'Hola', created_at: '2026-01-02T00:00:00Z' } })
      )
    })

    expect(occurrences('Ana')).toBeGreaterThan(1)
    expect(occurrences('María')).toBe(1)
  })
})
