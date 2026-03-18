import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listConversations, listMessages } from '../chat'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listConversations', () => {
  it('returns conversations on success', async () => {
    const convos = [{ id: 'c1', other_user_name: 'Juan' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(convos) } as Response)

    const result = await listConversations()
    expect(result).toEqual({ data: convos, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/conversations')
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Unauthorized' }),
    } as Response)

    const result = await listConversations()
    expect(result).toEqual({ data: null, error: 'Unauthorized' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))

    const result = await listConversations()
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('listMessages', () => {
  it('returns messages on success', async () => {
    const messages = [{ id: 'm1', body: 'Hello' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(messages) } as Response)

    const result = await listMessages('c1')
    expect(result).toEqual({ data: messages, error: null })
  })

  it('includes cursor and limit params', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response)

    await listMessages('c1', 'cursor-abc')

    const url = mockApiClient.mock.lastCall![0]
    expect(url).toContain('cursor=cursor-abc')
    expect(url).toContain('limit=50')
  })

  it('always includes limit even without cursor', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response)

    await listMessages('c1')

    const url = mockApiClient.mock.lastCall![0]
    expect(url).toContain('limit=50')
    expect(url).not.toContain('cursor=')
  })
})
