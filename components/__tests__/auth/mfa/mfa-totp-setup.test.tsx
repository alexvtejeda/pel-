import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { MfaTotpSetup } from '@/components/auth/mfa/mfa-totp-setup'

vi.mock('@/lib/api/mfa', () => ({
  totpSetup: vi.fn(),
  totpConfirm: vi.fn(),
}))

import { totpSetup } from '@/lib/api/mfa'

const mockTotpSetup = vi.mocked(totpSetup)

// mockResolvedValue would flush straight past the loading step. A hand-held
// deferred keeps /totp/setup open so the test observes the in-flight render —
// which is the whole point of the hung-request case.
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function renderSetup(onBack = vi.fn()) {
  renderWithProviders(<MfaTotpSetup onSuccess={vi.fn()} onBack={onBack} />)
  return onBack
}

describe('MfaTotpSetup — a failed /totp/setup must not trap the user on the spinner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the error and a retry instead of an endless spinner', async () => {
    mockTotpSetup.mockResolvedValueOnce({ data: null, error: 'mfa.errors.totp_setup' })
    renderSetup()

    await waitFor(() => {
      expect(screen.getByText('Error al configurar TOTP')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // The bug was that `step` stayed on 'loading', so the error was set but the
    // render only ever returned the spinner. <Spinner /> is role="status".
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('still renders a useful message when the failure carries no error string', async () => {
    mockTotpSetup.mockResolvedValueOnce({ data: null, error: null })
    renderSetup()

    // ErrorState falls back to common:error_state.title rather than a blank card.
    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar esto')).toBeInTheDocument()
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('escapes the spinner when totpSetup rejects outright (API unreachable)', async () => {
    mockTotpSetup.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderSetup()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('offers a back control while the request is still in flight', async () => {
    // A hung /totp/setup — the API accepts the connection but never answers — never
    // reaches the .catch, so the spinner is all the user gets. It still needs an exit.
    const pending = deferred<Awaited<ReturnType<typeof totpSetup>>>()
    mockTotpSetup.mockReturnValueOnce(pending.promise)
    const onBack = renderSetup()

    // Assert we are genuinely on the loading step, not racing past it.
    expect(screen.getByRole('status')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('offers a back control that calls onBack', async () => {
    mockTotpSetup.mockResolvedValueOnce({ data: null, error: 'mfa.errors.totp_setup' })
    const onBack = renderSetup()

    const back = await screen.findByRole('button', { name: 'Atrás' })
    fireEvent.click(back)

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('re-runs the setup request on retry and reaches the scan step', async () => {
    mockTotpSetup
      .mockResolvedValueOnce({ data: null, error: 'mfa.errors.totp_setup' })
      .mockResolvedValueOnce({ data: { secret: 'JBSWY3DPEHPK3PXP', qr_uri: 'otpauth://totp/Pelu' }, error: null })
    renderSetup()

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    // Assert on rendered scan-step content, not just the call count: a retry that
    // only flipped `step` without refetching would leave the secret empty.
    await waitFor(() => {
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    })
    expect(screen.getByText('Escanea el código QR con tu app de autenticación')).toBeInTheDocument()
    // Exactly two: one on mount, one on retry. More would mean the mount effect
    // is refiring on every render (an unstable startSetup identity).
    expect(mockTotpSetup).toHaveBeenCalledTimes(2)
  })
})
