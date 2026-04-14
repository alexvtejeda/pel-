import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { LoginPage } from '@/components/auth/login-page'

vi.mock('next/navigation', () => {
  const mockPush = vi.fn()
  return {
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => mockSearchParams,
  }
})

let mockSearchParams = new URLSearchParams()
const setSearch = (s: string) => {
  mockSearchParams = new URLSearchParams(s)
}

vi.mock('@/lib/api/mfa', () => ({
  mfaChallenge: vi.fn(),
  mfaVerify: vi.fn(),
  mfaEmailSend: vi.fn(),
  webauthnAssertBegin: vi.fn(),
}))

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    login: vi.fn(),
    updateSession: vi.fn(),
  }),
}))

vi.mock('@/lib/auth/post-login-redirect', () => ({
  postLoginRedirect: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  googleRedirect: vi.fn(),
}))

import { mfaChallenge as mockMfaChallenge } from '@/lib/api/mfa'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSearch('')
  })

  it('renders the credentials form when URL has no ?mfa param', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument()
  })

  it('fetches the MFA challenge on mount when ?mfa=1 is present', async () => {
    setSearch('mfa=1')
    ;(mockMfaChallenge as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        mfa_required: true,
        preferred_method: 'totp',
        available_methods: ['totp', 'email'],
        email: 'a***@example.com',
        strong_methods_available: true,
      },
      error: null,
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(mockMfaChallenge).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByTestId('mfa-verify-card')).toBeInTheDocument()
    })
  })

  it('falls back to credentials form when mfaChallenge returns an error', async () => {
    setSearch('mfa=1')
    ;(mockMfaChallenge as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: 'Sesión MFA expirada',
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/correo electrónico/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/expiró/i)).toBeInTheDocument()
  })
})
