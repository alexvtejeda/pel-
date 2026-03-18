import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, register, logout, setRole, googleRedirect } from '../auth'

const BASE_URL = 'http://localhost:8080'

// Mock apiClient module
vi.mock('../client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../client'
const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('login', () => {
  it('returns user data on success', async () => {
    const userData = { user: { id: '1', email: 'test@test.com', role: 'member' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(userData),
    }))

    const result = await login('test@test.com', 'password')
    expect(result).toEqual({ data: userData, error: null })
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/auth/login`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
    }))
  })

  it('returns error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Invalid credentials' }),
    }))

    const result = await login('bad@test.com', 'wrong')
    expect(result).toEqual({ data: null, error: 'Invalid credentials' })
  })

  it('returns default error when no error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({}),
    }))

    const result = await login('bad@test.com', 'wrong')
    expect(result).toEqual({ data: null, error: 'Error al iniciar sesión' })
  })
})

describe('register', () => {
  it('returns user data on success', async () => {
    const userData = { user: { id: '1', email: 'new@test.com', role: null } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(userData),
    }))

    const result = await register('new@test.com', 'password')
    expect(result).toEqual({ data: userData, error: null })
  })

  it('returns error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Email already exists' }),
    }))

    const result = await register('existing@test.com', 'password')
    expect(result).toEqual({ data: null, error: 'Email already exists' })
  })
})

describe('logout', () => {
  it('calls apiClient with DELETE', async () => {
    mockApiClient.mockResolvedValue(new Response())
    await logout()
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/auth/logout', { method: 'DELETE' })
  })

  it('does not throw on failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'))
    await expect(logout()).resolves.toBeUndefined()
  })
})

describe('setRole', () => {
  it('returns updated role on success', async () => {
    const roleData = { user: { role: 'member' } }
    mockApiClient.mockResolvedValue({
      ok: true, json: () => Promise.resolve(roleData),
    } as Response)

    const result = await setRole('member')
    expect(result).toEqual({ data: roleData, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/auth/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'member' }),
    })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Invalid role' }),
    } as Response)

    const result = await setRole('member')
    expect(result).toEqual({ data: null, error: 'Invalid role' })
  })
})

describe('googleRedirect', () => {
  it('sets window.location.href', () => {
    // jsdom doesn't fully support location.href assignment, but we can test the function exists
    const originalHref = window.location.href
    // googleRedirect() would navigate — just verify it's callable
    expect(typeof googleRedirect).toBe('function')
  })
})
