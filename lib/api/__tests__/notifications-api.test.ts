import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listNotifications, markNotificationRead } from '../notifications-api'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listNotifications', () => {
  it('returns notifications on success', async () => {
    const notifs = [{ id: 'n1', title: 'Welcome', body: 'Hello', is_read: false }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(notifs) } as Response)

    const result = await listNotifications()
    expect(result).toEqual({ data: notifs, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/notifications')
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Unauthorized' }),
    } as Response)

    const result = await listNotifications()
    expect(result).toEqual({ data: null, error: 'Unauthorized' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await listNotifications()
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('markNotificationRead', () => {
  it('returns no error on success', async () => {
    mockApiClient.mockResolvedValue({ ok: true } as Response)

    const result = await markNotificationRead('n1')
    expect(result).toEqual({ error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/notifications/n1/read', { method: 'PATCH' })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Not found' }),
    } as Response)

    const result = await markNotificationRead('n1')
    expect(result).toEqual({ error: 'Not found' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await markNotificationRead('n1')
    expect(result).toEqual({ error: 'Error de conexión' })
  })
})
