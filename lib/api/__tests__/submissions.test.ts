import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitAdoptionForm, uploadSubmissionFile, listSubmissions, getSubmission, reviewSubmission } from '../submissions'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('submitAdoptionForm', () => {
  it('returns submission ID on success', async () => {
    mockApiClient.mockResolvedValue({
      ok: true, json: () => Promise.resolve({ submission_id: 's1' }),
    } as Response)

    const result = await submitAdoptionForm('pet-1', {
      form_id: 'f1',
      answers: { q1: 'answer1' },
    })
    expect(result).toEqual({ data: { submission_id: 's1' }, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/pets/pet-1/submissions', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Already submitted' }),
    } as Response)

    const result = await submitAdoptionForm('pet-1', { form_id: 'f1', answers: {} })
    expect(result).toEqual({ data: null, error: 'Already submitted' })
  })

  it('returns connection error on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))

    const result = await submitAdoptionForm('pet-1', { form_id: 'f1', answers: {} })
    expect(result).toEqual({ data: null, error: 'Error de conexión' })
  })
})

describe('uploadSubmissionFile', () => {
  it('uploads file via raw fetch with FormData', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ url: 'http://example.com/file.pdf' }),
    }))

    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    const result = await uploadSubmissionFile('s1', 'field-1', file)

    expect(result).toEqual({ data: { url: 'http://example.com/file.pdf' }, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/submissions/s1/files`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    const callBody = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    expect(callBody).toBeInstanceOf(FormData)
  })

  it('returns error on upload failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'File too large' }),
    }))

    const file = new File(['data'], 'doc.pdf')
    const result = await uploadSubmissionFile('s1', 'field-1', file)
    expect(result).toEqual({ data: null, error: 'File too large' })
  })
})

describe('listSubmissions', () => {
  it('returns submissions on success', async () => {
    const submissions = [{ id: 's1', status: 'pending' }]
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(submissions) } as Response)

    const result = await listSubmissions()
    expect(result).toEqual({ data: submissions, error: null })
  })

  it('builds query params from filters', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response)

    await listSubmissions({ status: 'pending', pet_id: 'pet-1' })

    const call = mockApiClient.mock.lastCall!
    expect(call[0]).toContain('status=pending')
    expect(call[0]).toContain('pet_id=pet-1')
  })

  it('omits query string when no params', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response)

    await listSubmissions()
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/submissions')
  })
})

describe('getSubmission', () => {
  it('returns submission on success', async () => {
    const submission = { id: 's1', status: 'pending' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(submission) } as Response)

    const result = await getSubmission('s1')
    expect(result).toEqual({ data: submission, error: null })
  })
})

describe('reviewSubmission', () => {
  it('approves submission', async () => {
    const submission = { id: 's1', status: 'approved' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(submission) } as Response)

    const result = await reviewSubmission('s1', { status: 'approved' })
    expect(result).toEqual({ data: submission, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/submissions/s1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    })
  })

  it('rejects submission with note', async () => {
    const submission = { id: 's1', status: 'rejected' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(submission) } as Response)

    const result = await reviewSubmission('s1', { status: 'rejected', rejection_note: 'Incomplete' })
    expect(result).toEqual({ data: submission, error: null })
  })
})
