import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listServiceProviders,
  getServiceProviderIdDocument,
  approveServiceProvider,
  rejectServiceProvider,
} from '../admin'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

const ROW = {
  id: 'sp1',
  user_id: 'u1',
  status: 'pending',
  services: ['grooming'],
  applicant_name: 'Ana Pérez',
  applicant_email: 'ana@mail.com',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listServiceProviders', () => {
  it('defaults to the "all" status filter', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([ROW]) } as Response)
    const result = await listServiceProviders()
    expect(result).toEqual({ data: [ROW], error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers?status=all')
  })

  it('passes an explicit status through', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response)
    await listServiceProviders('pending')
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers?status=pending')
  })

  it('returns the API error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'forbidden' }),
    } as Response)
    const result = await listServiceProviders()
    expect(result).toEqual({ data: null, error: 'forbidden' })
  })
})

describe('getServiceProviderIdDocument', () => {
  it('returns the presigned url', async () => {
    mockApiClient.mockResolvedValue({
      ok: true, json: () => Promise.resolve({ url: 'https://s3/presigned' }),
    } as Response)
    const result = await getServiceProviderIdDocument('sp1')
    expect(result).toEqual({ data: { url: 'https://s3/presigned' }, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers/sp1/id-document')
  })

  it('returns a connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await getServiceProviderIdDocument('sp1')
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('approveServiceProvider', () => {
  it('sends action=approve, not status', async () => {
    const approved = { ...ROW, status: 'active' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(approved) } as Response)

    const result = await approveServiceProvider('sp1')

    expect(result).toEqual({ data: approved, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers/sp1/review', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    })
  })
})

describe('rejectServiceProvider', () => {
  it('sends action=reject with the reason', async () => {
    const rejected = { ...ROW, status: 'rejected' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rejected) } as Response)

    const result = await rejectServiceProvider('sp1', 'Documento ilegible')

    expect(result).toEqual({ data: rejected, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/service-providers/sp1/review', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject', reason: 'Documento ilegible' }),
    })
  })

  it('returns the API error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'reason required' }),
    } as Response)
    const result = await rejectServiceProvider('sp1', '')
    expect(result).toEqual({ data: null, error: 'reason required' })
  })
})
