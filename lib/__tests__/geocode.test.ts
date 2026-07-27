import { describe, it, expect, vi, beforeEach } from 'vitest'
import { geocodeAddress } from '../geocode'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('geocodeAddress', () => {
  it('returns the first result as lat/lng numbers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '18.4861', lon: '-69.9312' }]),
    }))

    const result = await geocodeAddress('Av. Winston Churchill, Santo Domingo')

    expect(result).toEqual({ lat: 18.4861, lng: -69.9312 })
    expect(fetch).toHaveBeenCalledWith(
      'https://nominatim.openstreetmap.org/search?q=Av.%20Winston%20Churchill%2C%20Santo%20Domingo&format=json&limit=1',
      { headers: { 'User-Agent': 'Pelu-App/1.0' } }
    )
  })

  it('returns null when the address has no match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }))
    expect(await geocodeAddress('nowhere at all')).toBeNull()
  })

  it('returns null on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))
    expect(await geocodeAddress('Calle 1')).toBeNull()
  })
})
