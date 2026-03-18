import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBusiness, getMyBusiness, uploadBusinessPhoto } from '../businesses'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('createBusiness', () => {
  it('returns business on success', async () => {
    const biz = { id: 'b1', name: 'PetShop' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(biz) } as Response)

    const result = await createBusiness({
      name: 'PetShop', phone: '809-555-0001', address: 'Calle 1',
      services: ['grooming'],
    })
    expect(result).toEqual({ data: biz, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/businesses', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Validation error' }),
    } as Response)

    const result = await createBusiness({
      name: '', phone: '', address: '', services: [],
    })
    expect(result).toEqual({ data: null, error: 'Validation error' })
  })
})

describe('getMyBusiness', () => {
  it('returns business on success', async () => {
    const biz = { id: 'b1', name: 'PetShop' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(biz) } as Response)

    const result = await getMyBusiness()
    expect(result).toEqual({ data: biz, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/businesses/me')
  })
})

describe('uploadBusinessPhoto', () => {
  it('uploads photo via raw fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ url: 'http://example.com/photo.jpg' }),
    }))

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await uploadBusinessPhoto(file)

    expect(result).toEqual({ data: { url: 'http://example.com/photo.jpg' }, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/businesses/me/photo`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })

  it('returns error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Invalid format' }),
    }))

    const file = new File(['data'], 'photo.jpg')
    const result = await uploadBusinessPhoto(file)
    expect(result).toEqual({ data: null, error: 'Invalid format' })
  })
})
