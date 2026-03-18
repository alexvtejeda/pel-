import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPets, createPet, updatePet, deletePet, uploadPhotos, deletePhoto, reorderPhotos } from '../pets'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listPets', () => {
  it('returns pets array on success', async () => {
    const pets = [{ id: '1', name: 'Luna' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(pets) } as Response)

    const result = await listPets('rc-1')
    expect(result).toEqual(pets)
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/pets?rescue_center_id=rc-1')
  })

  it('returns empty array on failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false } as Response)
    const result = await listPets('rc-1')
    expect(result).toEqual([])
  })
})

describe('createPet', () => {
  it('returns created pet on success', async () => {
    const pet = { id: '1', name: 'Luna' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(pet) } as Response)

    const result = await createPet({
      name: 'Luna', description: 'Sweet dog', age: 2,
      gender: 'female', species: 'dog', vaccinated: true,
      castrated: false, size: 'medium',
    })
    expect(result).toEqual(pet)
  })

  it('throws on failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false } as Response)
    await expect(createPet({
      name: 'Luna', description: 'Sweet dog', age: 2,
      gender: 'female', species: 'dog', vaccinated: true,
      castrated: false, size: 'medium',
    })).rejects.toThrow('Failed to create pet')
  })
})

describe('updatePet', () => {
  it('returns updated pet on success', async () => {
    const pet = { id: '1', name: 'Luna Updated' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(pet) } as Response)

    const result = await updatePet('1', { name: 'Luna Updated' })
    expect(result).toEqual(pet)
  })

  it('throws on failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false } as Response)
    await expect(updatePet('1', { name: 'x' })).rejects.toThrow('Failed to update pet')
  })
})

describe('deletePet', () => {
  it('calls DELETE endpoint', async () => {
    mockApiClient.mockResolvedValue({ ok: true } as Response)
    await deletePet('1')
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/pets/1', { method: 'DELETE' })
  })
})

describe('uploadPhotos', () => {
  it('sends FormData with photos via raw fetch', async () => {
    const photos = [{ id: 'p1', url: 'http://example.com/photo.jpg', position: 0 }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(photos),
    }))

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await uploadPhotos('pet-1', [file])

    expect(result).toEqual(photos)
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/pets/pet-1/photos`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    // Verify FormData was sent (body should be FormData instance)
    const callBody = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    expect(callBody).toBeInstanceOf(FormData)
  })

  it('throws on upload failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(uploadPhotos('pet-1', [file])).rejects.toThrow('Failed to upload photos')
  })
})

describe('deletePhoto', () => {
  it('calls DELETE on photo endpoint', async () => {
    mockApiClient.mockResolvedValue({ ok: true } as Response)
    await deletePhoto('pet-1', 'photo-1')
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/pets/pet-1/photos/photo-1', { method: 'DELETE' })
  })
})

describe('reorderPhotos', () => {
  it('sends order array via PATCH', async () => {
    mockApiClient.mockResolvedValue({ ok: true } as Response)
    await reorderPhotos('pet-1', ['p2', 'p1', 'p3'])
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/pets/pet-1/photos/order', {
      method: 'PATCH',
      body: JSON.stringify({ order: ['p2', 'p1', 'p3'] }),
    })
  })
})
