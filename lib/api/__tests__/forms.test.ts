import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listForms, getForm, createForm, updateForm, deleteForm } from '../forms'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('listForms', () => {
  it('returns forms on success', async () => {
    const forms = [{ id: 'f1', name: 'Standard' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(forms) } as Response)

    const result = await listForms()
    expect(result).toEqual({ data: forms, error: null })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Unauthorized' }) } as Response)

    const result = await listForms()
    expect(result).toEqual({ data: null, error: 'Unauthorized' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))

    const result = await listForms()
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('getForm', () => {
  it('returns form on success', async () => {
    const form = { id: 'f1', name: 'Standard' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(form) } as Response)

    const result = await getForm('f1')
    expect(result).toEqual({ data: form, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/forms/f1')
  })
})

describe('createForm', () => {
  it('creates form and returns it', async () => {
    const form = { id: 'f2', name: 'Special' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(form) } as Response)

    const result = await createForm({ name: 'Special', is_special_needs: true })
    expect(result).toEqual({ data: form, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/forms', {
      method: 'POST',
      body: JSON.stringify({ name: 'Special', is_special_needs: true }),
    })
  })
})

describe('updateForm', () => {
  it('updates form fields', async () => {
    const form = { id: 'f1', name: 'Updated' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(form) } as Response)

    const result = await updateForm('f1', { name: 'Updated' })
    expect(result).toEqual({ data: form, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/forms/f1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    })
  })
})

describe('deleteForm', () => {
  it('returns null data on success', async () => {
    mockApiClient.mockResolvedValue({ ok: true } as Response)

    const result = await deleteForm('f1')
    expect(result).toEqual({ data: null, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/forms/f1', { method: 'DELETE' })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) } as Response)

    const result = await deleteForm('f1')
    expect(result).toEqual({ data: null, error: 'Not found' })
  })
})
