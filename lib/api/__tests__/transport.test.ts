import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestTrip, listTrips, getTrip, cancelTrip, acceptTrip, updateTripStatus, completeStop } from '../transport'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

const mockTrip = {
  id: 't1', requester_id: 'u1', driver_id: null, pet_id: 'p1',
  status: 'pending', stops: [], created_at: '2026-03-18', updated_at: '2026-03-18',
}

describe('requestTrip', () => {
  it('returns trip on success', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockTrip) } as Response)

    const result = await requestTrip({
      pet_id: 'p1',
      stops: [{ address: 'Calle A', lat: 18.5, lng: -69.9 }],
    })
    expect(result).toEqual({ data: mockTrip, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/request', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('returns error on API failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'No drivers available' }),
    } as Response)

    const result = await requestTrip({ pet_id: 'p1', stops: [] })
    expect(result).toEqual({ data: null, error: 'No drivers available' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))

    const result = await requestTrip({ pet_id: 'p1', stops: [] })
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('listTrips', () => {
  it('returns trips on success', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([mockTrip]) } as Response)

    const result = await listTrips()
    expect(result).toEqual({ data: [mockTrip], error: null })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Unauthorized' }),
    } as Response)

    const result = await listTrips()
    expect(result).toEqual({ data: null, error: 'Unauthorized' })
  })
})

describe('getTrip', () => {
  it('returns trip on success', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockTrip) } as Response)

    const result = await getTrip('t1')
    expect(result).toEqual({ data: mockTrip, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/t1')
  })
})

describe('cancelTrip', () => {
  it('returns cancelled trip on success', async () => {
    const cancelled = { ...mockTrip, status: 'cancelled' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(cancelled) } as Response)

    const result = await cancelTrip('t1')
    expect(result).toEqual({ data: cancelled, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/t1/cancel', { method: 'PATCH' })
  })
})

describe('acceptTrip', () => {
  it('returns accepted trip on success', async () => {
    const accepted = { ...mockTrip, status: 'active', driver_id: 'd1' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(accepted) } as Response)

    const result = await acceptTrip('t1')
    expect(result).toEqual({ data: accepted, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/t1/accept', { method: 'PATCH' })
  })
})

describe('updateTripStatus', () => {
  it('updates trip status', async () => {
    const updated = { ...mockTrip, status: 'completed' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(updated) } as Response)

    const result = await updateTripStatus('t1', 'completed')
    expect(result).toEqual({ data: updated, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/t1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    })
  })
})

describe('completeStop', () => {
  it('returns null data on success', async () => {
    mockApiClient.mockResolvedValue({ ok: true } as Response)

    const result = await completeStop('t1', 's1')
    expect(result).toEqual({ data: null, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/t1/stops/s1/complete', { method: 'PATCH' })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Stop already completed' }),
    } as Response)

    const result = await completeStop('t1', 's1')
    expect(result).toEqual({ data: null, error: 'Stop already completed' })
  })
})
