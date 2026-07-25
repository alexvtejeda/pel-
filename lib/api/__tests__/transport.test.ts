import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestTrip, listTrips, getTrip, cancelTrip, acceptTrip, updateTripStatus, completeStop, quoteTrip, listTransportBusinesses, declineTrip } from '../transport'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.clearAllMocks()
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

describe('quoteTrip', () => {
  it('POSTs the quote body and returns data', async () => {
    const quote = { business_id: 'b1', distance_km: 12.4, duration_minutes: 22, estimated_price: 450, routing_degraded: false, routing_source: 'ors', currency: 'DOP' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(quote) } as Response)

    const result = await quoteTrip({ business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 } })
    expect(result).toEqual({ data: quote, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/quote', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 } }),
    }))
  })

  it('returns error on API failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'business does not offer pet taxi service' }) } as Response)
    const result = await quoteTrip({ business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 } })
    expect(result).toEqual({ data: null, error: 'business does not offer pet taxi service' })
  })
})

describe('listTransportBusinesses', () => {
  it('sends only lat/lng when no route params ("in your area" mode)', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], next_cursor: '' }) } as Response)
    await listTransportBusinesses({ lat: 18.5, lng: -69.9 })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/businesses?lat=18.5&lng=-69.9')
  })

  it('includes all four route params + cursor when from/to given', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], next_cursor: '' }) } as Response)
    await listTransportBusinesses({
      lat: 18.5, lng: -69.9,
      from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 }, cursor: 'c1',
    })
    const url = mockApiClient.mock.calls[0][0] as string
    expect(url).toContain('lat=18.5')
    expect(url).toContain('from_lat=18.5')
    expect(url).toContain('from_lng=-69.9')
    expect(url).toContain('to_lat=18.4')
    expect(url).toContain('to_lng=-69.8')
    expect(url).toContain('cursor=c1')
  })

  it('returns the {items,next_cursor} payload', async () => {
    const payload = { items: [{ business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2 }], next_cursor: 'n1' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) } as Response)
    const result = await listTransportBusinesses({ lat: 18.5, lng: -69.9 })
    expect(result).toEqual({ data: payload, error: null })
  })
})

describe('declineTrip', () => {
  it('PATCHes the decline path and returns the cancelled trip', async () => {
    const declined = { ...mockTrip, status: 'cancelled', business_id: 'b1' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(declined) } as Response)
    const result = await declineTrip('t1')
    expect(result).toEqual({ data: declined, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/t1/decline', { method: 'PATCH' })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'only the targeted business may decline this trip' }) } as Response)
    const result = await declineTrip('t1')
    expect(result).toEqual({ data: null, error: 'only the targeted business may decline this trip' })
  })
})
