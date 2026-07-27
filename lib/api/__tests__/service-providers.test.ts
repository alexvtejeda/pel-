import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerServiceProvider,
  getMyServiceProvider,
  updateServiceProviderProfile,
  reapplyServiceProvider,
} from '../service-providers'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

const PROFILE = {
  description: 'Paseo perros',
  experience: '3 años',
  address: 'Calle 1, Santo Domingo',
  lat: 18.47,
  lng: -69.93,
  services: ['dog_walking', 'pet_sitting'],
  pet_types: ['dog'],
}

const SP = { id: 'sp1', user_id: 'u1', status: 'pending' }

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('registerServiceProvider', () => {
  it('posts multipart FormData with credentials and no Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SP) })
    vi.stubGlobal('fetch', fetchMock)

    const idDocument = new File(['data'], 'cedula.jpg', { type: 'image/jpeg' })
    const result = await registerServiceProvider({ ...PROFILE, id_document: idDocument })

    expect(result).toEqual({ data: SP, error: null })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/api/v1/service-providers`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toBeUndefined()

    const form = init.body as FormData
    expect(form.get('description')).toBe('Paseo perros')
    expect(form.get('lat')).toBe('18.47')
    expect(form.getAll('services')).toEqual(['dog_walking', 'pet_sitting'])
    expect(form.getAll('pet_types')).toEqual(['dog'])
    expect(form.get('terms_accepted')).toBe('true')
    expect(form.get('id_document')).toBe(idDocument)
  })

  it('returns the API error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'ID document required' }),
    }))
    const result = await registerServiceProvider({
      ...PROFILE, id_document: new File(['d'], 'c.jpg'),
    })
    expect(result).toEqual({ data: null, error: 'ID document required' })
  })

  it('returns a connection error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))
    const result = await registerServiceProvider({
      ...PROFILE, id_document: new File(['d'], 'c.jpg'),
    })
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('getMyServiceProvider', () => {
  it('returns the record on 200', async () => {
    mockApiClient.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(SP) } as Response)
    const result = await getMyServiceProvider()
    expect(result).toEqual({ data: SP, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/service-providers/me')
  })

  it('treats 404 as "not registered", not an error', async () => {
    mockApiClient.mockResolvedValue({ ok: false, status: 404 } as Response)
    const result = await getMyServiceProvider()
    expect(result).toEqual({ data: null, error: null })
  })

  it('returns the API error on other failures', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, status: 500, json: () => Promise.resolve({ error: 'database error' }),
    } as Response)
    const result = await getMyServiceProvider()
    expect(result).toEqual({ data: null, error: 'database error' })
  })
})

describe('updateServiceProviderProfile', () => {
  it('sends a JSON PATCH with the given fields', async () => {
    const updated = { ...SP, status: 'active' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(updated) } as Response)

    const result = await updateServiceProviderProfile(PROFILE)

    expect(result).toEqual({ data: updated, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/service-providers/me', {
      method: 'PATCH',
      body: JSON.stringify(PROFILE),
    })
  })

  it('returns a connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await updateServiceProviderProfile({ description: 'x' })
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('reapplyServiceProvider', () => {
  it('sends a multipart PATCH including the ID document', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SP) })
    vi.stubGlobal('fetch', fetchMock)

    const idDocument = new File(['data'], 'cedula2.jpg', { type: 'image/jpeg' })
    const result = await reapplyServiceProvider({ ...PROFILE, id_document: idDocument })

    expect(result).toEqual({ data: SP, error: null })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/api/v1/service-providers/me`)
    expect(init.method).toBe('PATCH')
    expect(init.credentials).toBe('include')
    expect(init.headers).toBeUndefined()

    const form = init.body as FormData
    expect(form.get('id_document')).toBe(idDocument)
    // Re-application does not re-send the terms checkbox — it was accepted at registration.
    expect(form.get('terms_accepted')).toBeNull()
  })

  it('returns the API error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'not rejected' }),
    }))
    const result = await reapplyServiceProvider({
      ...PROFILE, id_document: new File(['d'], 'c.jpg'),
    })
    expect(result).toEqual({ data: null, error: 'not rejected' })
  })

  it('returns a connection error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))
    const result = await reapplyServiceProvider({
      ...PROFILE, id_document: new File(['d'], 'c.jpg'),
    })
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})
