import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUserPets, listUserPets, uploadUserPetPhotos } from '../user-pets'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('createUserPets', () => {
  it('returns created pets on success', async () => {
    const pets = [{ id: 'up1', name: 'Max' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(pets) } as Response)

    const result = await createUserPets([{
      name: 'Max', age: 3, species: 'dog', gender: 'male',
    }])
    expect(result).toEqual({ data: pets, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/user-pets', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Validation error' }),
    } as Response)

    const result = await createUserPets([])
    expect(result).toEqual({ data: null, error: 'Validation error' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await createUserPets([])
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('listUserPets', () => {
  it('returns user pets on success', async () => {
    const pets = [{ id: 'up1', name: 'Max' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(pets) } as Response)

    const result = await listUserPets()
    expect(result).toEqual({ data: pets, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/user-pets')
  })
})

describe('uploadUserPetPhotos', () => {
  it('uploads photos via raw fetch with FormData', async () => {
    const photos = [{ id: 'ph1', url: 'http://example.com/photo.jpg', position: 0 }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(photos),
    }))

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await uploadUserPetPhotos('up1', [file])

    expect(result).toEqual({ data: photos, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/user-pets/up1/photos`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })

  it('returns error on upload failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Too many photos' }),
    }))

    const file = new File(['data'], 'photo.jpg')
    const result = await uploadUserPetPhotos('up1', [file])
    expect(result).toEqual({ data: null, error: 'Too many photos' })
  })

  it('returns connection error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))

    const file = new File(['data'], 'photo.jpg')
    const result = await uploadUserPetPhotos('up1', [file])
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})
