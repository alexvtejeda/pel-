import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { MfaTotpSetup } from '@/components/auth/mfa/mfa-totp-setup'

vi.mock('@/lib/api/mfa', () => ({
  totpSetup: vi.fn(),
  totpConfirm: vi.fn(),
}))

import { totpSetup, totpConfirm } from '@/lib/api/mfa'

const mockTotpSetup = vi.mocked(totpSetup)
const mockTotpConfirm = vi.mocked(totpConfirm)

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

const SECRET = 'JBSWY3DPEHPK3PXP'

/** Drive the happy path as far as the confirm sub-step. */
async function reachConfirmStep(onBack = vi.fn()) {
  mockTotpSetup.mockResolvedValueOnce({ data: { secret: SECRET, qr_uri: 'otpauth://totp/Pelu' }, error: null })
  renderSetup(onBack)

  fireEvent.click(await screen.findByRole('button', { name: 'Configurar' }))
  await screen.findByText('Ingresa el código de 6 dígitos de tu app')
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

  it('draws the back arrow as a Font Awesome icon, never a literal glyph', async () => {
    mockTotpSetup.mockResolvedValueOnce({ data: { secret: SECRET, qr_uri: 'otpauth://totp/Pelu' }, error: null })
    const { container } = renderWithProviders(<MfaTotpSetup onSuccess={vi.fn()} onBack={vi.fn()} />)

    await screen.findByRole('button', { name: 'Atrás' })

    expect(container.querySelector('[data-icon="arrow-left"]')).toBeInTheDocument()
    expect(container.textContent).not.toContain('←')
  })
})

describe('MfaTotpSetup — the confirm sub-step gets back to the QR, not out of setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns to the scan step with the secret intact instead of discarding it', async () => {
    const onBack = await reachConfirmStep()

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))

    // Back on the QR, with the same secret: the enrolment was never thrown away.
    expect(await screen.findByText('Escanea el código QR con tu app de autenticación')).toBeInTheDocument()
    expect(screen.getByText(SECRET)).toBeInTheDocument()
    // The outer onBack unmounts the whole screen — the confirm step must not use it.
    expect(onBack).not.toHaveBeenCalled()
    // One call, on mount. A second would mean the setup was restarted from scratch.
    expect(mockTotpSetup).toHaveBeenCalledTimes(1)
  })

  it('shows exactly one back control on the confirm sub-step', async () => {
    await reachConfirmStep()

    // The outer back is hidden here on purpose: two controls with the same label
    // and different destinations is worse than one.
    expect(screen.getAllByRole('button', { name: 'Atrás' })).toHaveLength(1)
  })

  it('keeps the outer back on every step that is not confirm', async () => {
    // A hung request parks the user on the spinner, so loading needs an exit too.
    const pending = deferred<Awaited<ReturnType<typeof totpSetup>>>()
    mockTotpSetup.mockReturnValueOnce(pending.promise)
    const onBack = renderSetup()

    expect(screen.getByRole('status')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('clears a stale verification error when going back to the QR', async () => {
    mockTotpConfirm.mockResolvedValueOnce({ data: null, error: 'mfa.errors.code_invalid_expired' })
    await reachConfirmStep()

    const boxes = screen.getAllByRole('textbox')
    boxes.forEach((box, i) => fireEvent.change(box, { target: { value: String(i + 1) } }))

    const message = await screen.findByText('Código inválido o expirado')
    expect(message).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    fireEvent.click(screen.getByRole('button', { name: 'Configurar' }))

    // Returning to confirm must not re-show the error from the previous attempt.
    expect(screen.queryByText('Código inválido o expirado')).not.toBeInTheDocument()
  })
})
