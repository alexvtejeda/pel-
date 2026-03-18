import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listAllRescueCenters, approveRescueCenter, rejectRescueCenter, deleteRescueCenter, getFormTemplate, updateFormTemplate } from '../admin'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listAllRescueCenters', () => {
  it('returns all RCs on success', async () => {
    const rcs = [{ id: 'rc1', name: 'Patitas' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rcs) } as Response)

    const result = await listAllRescueCenters()
    expect(result).toEqual({ data: rcs, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/rescue-centers')
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Forbidden' }),
    } as Response)

    const result = await listAllRescueCenters()
    expect(result).toEqual({ data: null, error: 'Forbidden' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))
    const result = await listAllRescueCenters()
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('approveRescueCenter', () => {
  it('approves RC on success', async () => {
    const rc = { id: 'rc1', status: 'approved' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rc) } as Response)

    const result = await approveRescueCenter('rc1')
    expect(result).toEqual({ data: rc, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/rescue-centers/rc1/approve', { method: 'PATCH' })
  })
})

describe('rejectRescueCenter', () => {
  it('rejects RC with reason', async () => {
    const rc = { id: 'rc1', status: 'rejected' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(rc) } as Response)

    const result = await rejectRescueCenter('rc1', 'Incomplete docs')
    expect(result).toEqual({ data: rc, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/rescue-centers/rc1/reject', {
      method: 'PATCH',
      body: JSON.stringify({ reason: 'Incomplete docs' }),
    })
  })
})

describe('deleteRescueCenter', () => {
  it('returns success on 204', async () => {
    mockApiClient.mockResolvedValue({ ok: true, status: 204 } as Response)

    const result = await deleteRescueCenter('rc1', '123456')
    expect(result).toEqual({ data: true, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/rescue-centers/rc1', {
      method: 'DELETE',
      body: JSON.stringify({ mfa_method: 'totp', mfa_code: '123456' }),
    })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, status: 403, json: () => Promise.resolve({ error: 'Invalid MFA code' }),
    } as Response)

    const result = await deleteRescueCenter('rc1', 'wrong')
    expect(result).toEqual({ data: null, error: 'Invalid MFA code' })
  })
})

describe('getFormTemplate', () => {
  it('returns template on success', async () => {
    const template = { id: 'ft1', name: 'Default' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(template) } as Response)

    const result = await getFormTemplate()
    expect(result).toEqual({ data: template, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/forms/default')
  })
})

describe('updateFormTemplate', () => {
  it('updates template via PUT', async () => {
    const template = { id: 'ft1', name: 'Updated' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(template) } as Response)

    const result = await updateFormTemplate({ name: 'Updated' })
    expect(result).toEqual({ data: template, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/forms/default', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    })
  })
})
