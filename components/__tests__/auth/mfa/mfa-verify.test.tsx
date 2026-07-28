import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { MfaVerify } from '@/components/auth/mfa/mfa-verify'
import type { MfaChallengeResponse } from '@/lib/types/user'

vi.mock('@/lib/api/mfa', () => ({
  mfaVerify: vi.fn(),
  mfaEmailSend: vi.fn(),
  webauthnAssertBegin: vi.fn(),
}))

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ updateSession: vi.fn() }),
}))

import { mfaVerify } from '@/lib/api/mfa'

const mockMfaVerify = vi.mocked(mfaVerify)

// Recovery is the simplest verify path to drive from a test: a single text input
// and submit button, instead of the 6-way digit grid (totp/email) or a mocked
// @simplewebauthn/browser ceremony. handleVerify() is shared across all methods,
// so exercising it via 'recovery' still covers the substring-collision guard.
const challenge: MfaChallengeResponse = {
  mfa_required: true,
  preferred_method: 'recovery',
  available_methods: ['recovery', 'totp'],
  email: 'a***@example.com',
  strong_methods_available: true,
}

function renderVerify(onExpired: () => void) {
  renderWithProviders(
    <MfaVerify
      challenge={challenge}
      loginEmail="user@example.com"
      onSuccess={vi.fn()}
      onExpired={onExpired}
      onCancel={vi.fn()}
    />
  )
}

function submitRecoveryCode(code: string) {
  fireEvent.change(screen.getByPlaceholderText('XXXXXXXXXX'), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Verificar' }))
}

describe('MfaVerify — expiry guard around mfa.errors.code_invalid_expired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the inline error and does NOT call onExpired for the code_invalid_expired fallback key', async () => {
    mockMfaVerify.mockResolvedValueOnce({ data: null, error: 'mfa.errors.code_invalid_expired' })
    const onExpired = vi.fn()
    renderVerify(onExpired)

    submitRecoveryCode('ABCD123456')

    // The key mfa.errors.code_invalid_expired literally contains "expired". Without
    // the isMfaErrorKey guard this would be mistaken for a genuine expiry message.
    await waitFor(() => {
      expect(screen.getByText('Código inválido o expirado')).toBeInTheDocument()
    })
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('DOES call onExpired for a genuine backend expiry message', async () => {
    mockMfaVerify.mockResolvedValueOnce({ data: null, error: 'Your session expired' })
    const onExpired = vi.fn()
    renderVerify(onExpired)

    submitRecoveryCode('ABCD123456')

    await waitFor(() => {
      expect(onExpired).toHaveBeenCalledTimes(1)
    })
  })
})
