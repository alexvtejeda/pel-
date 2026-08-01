import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listConversations, listMessages, createConversation } from '../chat'

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

describe('createConversation', () => {
  /*
    The body carries a RESOURCE id, never a user id. Both branches go to the same
    endpoint and the backend resolves the owner, which is what stops the caller
    from having to know — or being able to spoof — who is on the other side.
  */
  it('posts a provider id', async () => {
    mockApiClient.mockResolvedValue({
      ok: true, json: () => Promise.resolve({ id: 'c1' }),
    } as Response)

    const result = await createConversation({ provider_id: 'pr1' })

    expect(result).toEqual({ data: { id: 'c1' }, error: null })
    const [path, options] = mockApiClient.mock.lastCall!
    expect(path).toBe('/api/v1/conversations')
    expect(options!.method).toBe('POST')
    expect(JSON.parse(options!.body as string)).toEqual({ provider_id: 'pr1' })
  })

  it('posts a pet id', async () => {
    mockApiClient.mockResolvedValue({
      ok: true, json: () => Promise.resolve({ id: 'c2' }),
    } as Response)

    await createConversation({ pet_id: 'p1' })

    const [, options] = mockApiClient.mock.lastCall!
    // Exactly one key — the backend 400s on both or neither.
    expect(JSON.parse(options!.body as string)).toEqual({ pet_id: 'p1' })
  })

  it('returns the API error message instead of throwing', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'not found' }),
    } as Response)

    const result = await createConversation({ provider_id: 'gone' })

    expect(result).toEqual({ data: null, error: 'not found' })
  })

  it('returns a connection error when the request throws', async () => {
    mockApiClient.mockRejectedValue(new Error('network down'))

    const result = await createConversation({ provider_id: 'pr1' })

    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})
