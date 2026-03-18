import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMetrics } from '../metrics'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('trackPetEvent', () => {
  it('sends event via raw fetch', async () => {
    // Re-import to get fresh module state (recentlyTracked Set)
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { trackPetEvent } = await import('../metrics')
    trackPetEvent('pet-1', 'view')

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/pets/pet-1/events`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ event_type: 'view' }),
    }))
  })

  it('deduplicates events within 30 seconds', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { trackPetEvent } = await import('../metrics')
    trackPetEvent('pet-1', 'view')
    trackPetEvent('pet-1', 'view') // duplicate

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('allows same event after 30 seconds', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { trackPetEvent } = await import('../metrics')
    trackPetEvent('pet-1', 'view')
    vi.advanceTimersByTime(31000)
    trackPetEvent('pet-1', 'view')

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('tracks different events independently', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { trackPetEvent } = await import('../metrics')
    trackPetEvent('pet-1', 'view')
    trackPetEvent('pet-1', 'adopt_click')

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not throw on fetch failure', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))

    const { trackPetEvent } = await import('../metrics')
    expect(() => trackPetEvent('pet-1', 'view')).not.toThrow()
  })
})

describe('getMetrics', () => {
  it('returns metrics on success', async () => {
    const metrics = { summary: { total_views: 100 }, daily: [], pets: [] }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(metrics) } as Response)

    const result = await getMetrics('7d')
    expect(result).toEqual({ data: metrics, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/pets/metrics?period=7d')
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Unauthorized' }),
    } as Response)

    const result = await getMetrics('30d')
    expect(result).toEqual({ data: null, error: 'Unauthorized' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await getMetrics('all')
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})
