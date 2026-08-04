import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { getI18n } from '@/lib/i18n'
import { LoginPage } from '@/components/auth/login-page'

vi.mock('next/navigation', () => {
  const mockPush = vi.fn()
  return {
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => mockSearchParams,
    useParams: () => ({ lang: 'es' }),
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

// Not `renderWithProviders`: that helper registers its own next/navigation mock,
// which would shadow this file's and break the ?mfa=1 cases. The page's copy is
// translated, so it still needs the i18n instance bound.
const renderLogin = () =>
  render(<LoginPage />, {
    wrapper: ({ children }) => <I18nextProvider i18n={getI18n('es')}>{children}</I18nextProvider>,
  })

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSearch('')
  })

  it('renders the credentials form when URL has no ?mfa param', () => {
    renderLogin()
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

    renderLogin()

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

    renderLogin()

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/correo electrónico/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/expiró/i)).toBeInTheDocument()
  })
})
