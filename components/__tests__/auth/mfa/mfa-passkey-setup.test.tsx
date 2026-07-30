import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { MfaPasskeySetup } from '@/components/auth/mfa/mfa-passkey-setup'

vi.mock('@/lib/api/mfa', () => ({
  webauthnRegisterBegin: vi.fn(),
  webauthnRegisterFinish: vi.fn(),
}))

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
}))

function renderSetup(onBack = vi.fn()) {
  const view = renderWithProviders(<MfaPasskeySetup onSuccess={vi.fn()} onBack={onBack} />)
  return { ...view, onBack }
}

describe('MfaPasskeySetup — the back control matches the other setup screens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('labels back with the translated back key, not the cancel key', () => {
    renderSetup()

    // Was `← {t('mfa.settings.cancel')}` — "Cancelar", which promised something
    // different from the "Atrás" on the TOTP screen one step away.
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('draws the arrow as a Font Awesome icon instead of a literal glyph', () => {
    const { container } = renderSetup()

    expect(container.querySelector('[data-icon="arrow-left"]')).toBeInTheDocument()
    // The bare "←" text node is what made this screen diverge visually from
    // the TOTP one; it must be gone from the output entirely.
    expect(container.textContent).not.toContain('←')
  })

  it('calls onBack when the back control is used', () => {
    const { onBack } = renderSetup()

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
