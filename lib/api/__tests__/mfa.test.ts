import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  totpSetup, totpConfirm, webauthnRegisterBegin, webauthnRegisterFinish,
  emailEnable, regenerateRecoveryCodes, mfaVerify, mfaEmailSend,
  webauthnAssertBegin, getMethods, deleteTotp, deleteWebauthn, deleteEmail,
} from '../mfa'

const BASE_URL = 'http://localhost:8080'

vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

// --- Enrollment (uses apiClient) ---

describe('totpSetup', () => {
  it('returns secret and QR URI on success', async () => {
    const data = { secret: 'ABCD1234', qr_uri: 'otpauth://totp/Pelu?secret=ABCD1234' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) } as Response)

    const result = await totpSetup()
    expect(result).toEqual({ data, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/auth/mfa/totp/setup', { method: 'POST' })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Already configured' }),
    } as Response)

    const result = await totpSetup()
    expect(result).toEqual({ data: null, error: 'Already configured' })
  })
})

describe('totpConfirm', () => {
  it('returns recovery codes on success', async () => {
    const data = { recovery_codes: ['code1', 'code2'] }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) } as Response)

    const result = await totpConfirm('123456')
    expect(result).toEqual({ data, error: null })
  })
})

describe('webauthnRegisterBegin', () => {
  it('returns challenge data on success', async () => {
    const data = { challenge: 'abc' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) } as Response)

    const result = await webauthnRegisterBegin()
    expect(result).toEqual({ data, error: null })
  })
})

describe('webauthnRegisterFinish', () => {
  it('sends attestation and name', async () => {
    const data = { recovery_codes: ['code1'] }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) } as Response)

    const result = await webauthnRegisterFinish({ attestation: 'data' }, 'My Key')
    expect(result).toEqual({ data, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/auth/mfa/webauthn/register/finish', {
      method: 'POST',
      body: JSON.stringify({ attestation: { attestation: 'data' }, name: 'My Key' }),
    })
  })
})

describe('emailEnable', () => {
  it('returns recovery codes on success', async () => {
    const data = { recovery_codes: ['code1'] }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) } as Response)

    const result = await emailEnable()
    expect(result).toEqual({ data, error: null })
  })
})

describe('regenerateRecoveryCodes', () => {
  it('returns new recovery codes', async () => {
    const data = { recovery_codes: ['new1', 'new2'] }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) } as Response)

    const result = await regenerateRecoveryCodes()
    expect(result).toEqual({ data, error: null })
  })
})

// --- Verification (uses raw fetch with mfa_token cookie) ---

describe('mfaVerify', () => {
  it('sends TOTP code via raw fetch', async () => {
    const data = { user: { id: '1', email: 'test@test.com' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(data),
    }))

    const result = await mfaVerify('totp', '123456')
    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/auth/mfa/verify`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ method: 'totp', code: '123456' }),
    }))
  })

  it('sends WebAuthn assertion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ user: {} }),
    }))

    await mfaVerify('webauthn', { assertion: 'data' })
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(body).toEqual({ method: 'webauthn', assertion: { assertion: 'data' } })
  })

  it('returns error on invalid code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Invalid code' }),
    }))

    const result = await mfaVerify('totp', 'wrong')
    expect(result).toEqual({ data: null, error: 'Invalid code' })
  })
})

describe('mfaEmailSend', () => {
  it('sends email OTP request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({}),
    }))

    const result = await mfaEmailSend()
    expect(result).toEqual({ data: {}, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/auth/mfa/email/send`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })
})

describe('webauthnAssertBegin', () => {
  it('returns challenge on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ challenge: 'abc' }),
    }))

    const result = await webauthnAssertBegin()
    expect(result).toEqual({ data: { challenge: 'abc' }, error: null })
  })
})

// --- Management (uses apiClient) ---

describe('getMethods', () => {
  it('returns MFA methods', async () => {
    const methods = { totp: true, webauthn: [], email: false }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(methods) } as Response)

    const result = await getMethods()
    expect(result).toEqual({ data: methods, error: null })
  })
})

describe('deleteTotp', () => {
  it('returns success on 204', async () => {
    mockApiClient.mockResolvedValue({ ok: true, status: 204 } as Response)

    const result = await deleteTotp('password123')
    expect(result).toEqual({ data: {}, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/auth/mfa/totp', {
      method: 'DELETE',
      body: JSON.stringify({ password: 'password123' }),
    })
  })

  it('returns error when not 204', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, status: 403, json: () => Promise.resolve({ error: 'Wrong password' }),
    } as Response)

    const result = await deleteTotp('wrong')
    expect(result).toEqual({ data: null, error: 'Wrong password' })
  })
})

describe('deleteWebauthn', () => {
  it('deletes passkey by ID', async () => {
    mockApiClient.mockResolvedValue({ ok: true, status: 204 } as Response)

    const result = await deleteWebauthn('key-1', 'password123')
    expect(result).toEqual({ data: {}, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/auth/mfa/webauthn/key-1', {
      method: 'DELETE',
      body: JSON.stringify({ password: 'password123' }),
    })
  })
})

describe('deleteEmail', () => {
  it('disables email OTP', async () => {
    mockApiClient.mockResolvedValue({ ok: true, status: 204 } as Response)

    const result = await deleteEmail('password123')
    expect(result).toEqual({ data: {}, error: null })
  })
})
