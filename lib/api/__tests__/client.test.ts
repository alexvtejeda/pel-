import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, signalSessionCleared } from '../client'

const BASE_URL = 'http://localhost:8080'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('signalSessionCleared', () => {
  it('dispatches pelu:session-cleared event', () => {
    const listener = vi.fn()
    window.addEventListener('pelu:session-cleared', listener)
    signalSessionCleared()
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener('pelu:session-cleared', listener)
  })
})

describe('apiClient', () => {
  it('sends request with JSON content-type and credentials', async () => {
    const mockRes = { ok: true, status: 200, json: () => Promise.resolve({}) }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes))

    await apiClient('/api/v1/test')

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/test`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
  })

  it('merges custom headers', async () => {
    const mockRes = { ok: true, status: 200, json: () => Promise.resolve({}) }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes))

    await apiClient('/api/v1/test', {
      headers: { 'X-Custom': 'value' },
    })

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/test`, expect.objectContaining({
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
    }))
  })

  it('returns response directly on success', async () => {
    const mockRes = { ok: true, status: 200, json: () => Promise.resolve({ data: 'ok' }) }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes))

    const res = await apiClient('/api/v1/test')
    expect(res).toBe(mockRes)
  })

  it('retries on 401 after successful refresh', async () => {
    const firstRes = { ok: false, status: 401, json: () => Promise.resolve({}) }
    const refreshRes = { ok: true, status: 200 }
    const retryRes = { ok: true, status: 200, json: () => Promise.resolve({ retried: true }) }

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(firstRes)   // original request → 401
      .mockResolvedValueOnce(refreshRes) // refresh → success
      .mockResolvedValueOnce(retryRes)   // retry → success
    )

    const res = await apiClient('/api/v1/test')
    expect(res).toBe(retryRes)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('signals session cleared when refresh fails', async () => {
    const firstRes = { ok: false, status: 401, json: () => Promise.resolve({}) }
    const refreshRes = { ok: false, status: 401 }

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(firstRes)
      .mockResolvedValueOnce(refreshRes)
    )

    const listener = vi.fn()
    window.addEventListener('pelu:session-cleared', listener)

    const res = await apiClient('/api/v1/test')
    // returns original 401 response when refresh fails
    expect(res).toBe(firstRes)
    expect(listener).toHaveBeenCalledOnce()

    window.removeEventListener('pelu:session-cleared', listener)
  })

  it('passes method and body through', async () => {
    const mockRes = { ok: true, status: 200, json: () => Promise.resolve({}) }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes))

    await apiClient('/api/v1/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    })

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/test`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
      credentials: 'include',
    }))
  })
})
