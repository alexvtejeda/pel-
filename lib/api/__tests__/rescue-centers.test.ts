import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMyRescueCenter, listRescueCenters, getRescueCenter, createRescueCenter, updateRescueCenter, uploadRcLogo } from '../rescue-centers'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('getMyRescueCenter', () => {
  it('returns RC on success', async () => {
    const rc = { id: 'rc1', name: 'Patitas' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rc) } as Response)

    const result = await getMyRescueCenter()
    expect(result).toEqual({ data: rc, error: null })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Not found' }),
    } as Response)

    const result = await getMyRescueCenter()
    expect(result).toEqual({ data: null, error: 'Not found' })
  })
})

describe('listRescueCenters', () => {
  it('returns RCs on success (public, raw fetch)', async () => {
    const rcs = [{ id: 'rc1', name: 'Patitas' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(rcs),
    }))

    const result = await listRescueCenters()
    expect(result).toEqual(rcs)
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/rescue-centers`)
  })

  it('returns empty array on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const result = await listRescueCenters()
    expect(result).toEqual([])
  })
})

describe('getRescueCenter', () => {
  it('returns RC on success', async () => {
    const rc = { id: 'rc1', name: 'Patitas' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(rc),
    }))

    const result = await getRescueCenter('rc1')
    expect(result).toEqual(rc)
  })

  it('returns null on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const result = await getRescueCenter('rc1')
    expect(result).toBeNull()
  })
})

describe('createRescueCenter', () => {
  it('creates and returns RC', async () => {
    const rc = { id: 'rc1', name: 'Patitas' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rc) } as Response)

    const result = await createRescueCenter({ name: 'Patitas', phone: '809-555-0001', address: 'Calle 1' })
    expect(result).toEqual({ data: rc, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/rescue-centers', expect.objectContaining({
      method: 'POST',
    }))
  })
})

describe('updateRescueCenter', () => {
  it('updates RC via PATCH', async () => {
    const rc = { id: 'rc1', name: 'Patitas Updated' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rc) } as Response)

    const result = await updateRescueCenter('rc1', { name: 'Patitas Updated' })
    expect(result).toEqual({ data: rc, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/rescue-centers/rc1', expect.objectContaining({
      method: 'PATCH',
    }))
  })
})

describe('uploadRcLogo', () => {
  it('uploads logo via raw fetch with FormData', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ logo_url: 'http://example.com/logo.png' }),
    }))

    const file = new File(['data'], 'logo.png', { type: 'image/png' })
    const result = await uploadRcLogo(file)

    expect(result).toEqual({ data: { logo_url: 'http://example.com/logo.png' }, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/rescue-centers/me/logo`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })

  it('returns error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'File too large' }),
    }))

    const file = new File(['data'], 'logo.png')
    const result = await uploadRcLogo(file)
    expect(result).toEqual({ data: null, error: 'File too large' })
  })

  it('returns connection error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))

    const file = new File(['data'], 'logo.png')
    const result = await uploadRcLogo(file)
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})
