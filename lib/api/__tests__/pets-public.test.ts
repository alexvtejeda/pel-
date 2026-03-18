import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPublicPets, getPublicPet, getPetForm, getPetBySlug } from '../pets-public'

const BASE_URL = 'http://localhost:8080'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listPublicPets', () => {
  it('returns pets on success', async () => {
    const pets = [{ id: '1', name: 'Luna' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(pets),
    }))

    const result = await listPublicPets()
    expect(result).toEqual({ data: pets, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/pets`)
  })

  it('builds query params from filters', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve([]),
    }))

    await listPublicPets({ species: 'dog', gender: 'female', vaccinated: true })

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('species=dog')
    expect(url).toContain('gender=female')
    expect(url).toContain('vaccinated=true')
  })

  it('builds proximity sort params', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve([]),
    }))

    await listPublicPets({ sort: 'proximity', lat: 18.5, lng: -69.9 })

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('sort=proximity')
    expect(url).toContain('lat=18.5')
    expect(url).toContain('lng=-69.9')
  })

  it('returns error on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Server error' }),
    }))

    const result = await listPublicPets()
    expect(result).toEqual({ data: null, error: 'Server error' })
  })

  it('returns connection error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const result = await listPublicPets()
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('getPublicPet', () => {
  it('returns pet on success', async () => {
    const pet = { id: '1', name: 'Luna' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(pet),
    }))

    const result = await getPublicPet('1')
    expect(result).toEqual({ data: pet, error: null })
  })

  it('returns null data on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const result = await getPublicPet('nonexistent')
    expect(result).toEqual({ data: null, error: null })
  })

  it('returns error on non-404 failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }),
    }))

    const result = await getPublicPet('1')
    expect(result).toEqual({ data: null, error: 'Server error' })
  })

  it('encodes pet ID in URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({}),
    }))

    await getPublicPet('id with spaces')
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/pets/id%20with%20spaces`)
  })
})

describe('getPetForm', () => {
  it('returns form data on success', async () => {
    const formData = { form: { id: 'f1' }, rc: { id: 'rc1' }, advisory: false }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(formData),
    }))

    const result = await getPetForm('pet-1')
    expect(result).toEqual({ data: formData, error: null })
  })

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const result = await getPetForm('nonexistent')
    expect(result).toEqual({ data: null, error: null })
  })
})

describe('getPetBySlug', () => {
  it('returns pet on success', async () => {
    const pet = { id: '1', name: 'Luna' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(pet),
    }))

    const result = await getPetBySlug('abc123')
    expect(result).toEqual({ data: pet, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/pets/s/abc123`)
  })

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const result = await getPetBySlug('nonexistent')
    expect(result).toEqual({ data: null, error: null })
  })
})
