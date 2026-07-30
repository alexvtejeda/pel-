import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'

vi.mock('@/lib/api/mfa', () => ({
  emailEnable: vi.fn(),
  totpSetup: vi.fn(),
  totpConfirm: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { emailEnable, totpSetup } from '@/lib/api/mfa'
import { toast } from 'sonner'

const mockEmailEnable = vi.mocked(emailEnable)
const mockTotpSetup = vi.mocked(totpSetup)

const BREADCRUMBS = [{ label: 'Seguridad', current: true }]

function renderEnrollment(onComplete = vi.fn(), onSkip?: () => void) {
  renderWithProviders(
    <MfaEnrollment onComplete={onComplete} onSkip={onSkip} breadcrumbItems={BREADCRUMBS} />
  )
  return onComplete
}

function renderPanel(onComplete = vi.fn()) {
  return renderWithProviders(
    <MfaEnrollment onComplete={onComplete} breadcrumbItems={BREADCRUMBS} />
  )
}

// The pending state lives only between the two awaits inside handleSelectMethod,
// so mockResolvedValue would flush straight past it. A hand-held deferred lets the
// test hold the request open and observe the in-flight render.
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

// Each method card's accessible name is its label + description (+ badge), so a
// partial match on the label is enough to pick one out.
function methodCard(label: string) {
  return screen.getByRole('button', { name: new RegExp(label) })
}

const EMAIL = 'Código por email'
const TOTP = 'App de autenticación'
const PASSKEY = 'Passkey'

describe('MfaEnrollment — email OTP must not fail silently', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a spinner on the email card and disables every method while the request is in flight', async () => {
    const pending = deferred<Awaited<ReturnType<typeof emailEnable>>>()
    mockEmailEnable.mockReturnValueOnce(pending.promise)
    renderEnrollment()

    fireEvent.click(methodCard(EMAIL))

    // <Spinner /> is role="status", and it must be on the card that was clicked.
    await waitFor(() => {
      expect(within(methodCard(EMAIL)).getByRole('status')).toBeInTheDocument()
    })
    expect(methodCard(EMAIL)).toHaveAttribute('aria-busy', 'true')

    // Every card locks while one request is open, so a second tap can't fire a
    // duplicate enable or strand the user on a different method.
    expect(methodCard(EMAIL)).toBeDisabled()
    expect(methodCard(TOTP)).toBeDisabled()
    expect(methodCard(PASSKEY)).toBeDisabled()
    // Only the clicked card is busy — the others are merely blocked.
    expect(methodCard(TOTP)).toHaveAttribute('aria-busy', 'false')

    pending.resolve({ data: {}, error: null })
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  it('surfaces a translated error toast and re-enables the cards when emailEnable fails', async () => {
    mockEmailEnable.mockResolvedValueOnce({ data: null, error: 'mfa.errors.email_enable' })
    const onComplete = renderEnrollment()

    fireEvent.click(methodCard(EMAIL))

    // The translated string, not the raw key — proves the toast goes through
    // useMfaError rather than dumping "mfa.errors.email_enable" at the user.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al habilitar email OTP')
    })
    // The bug was `if (error) return`: nothing happened at all. Now the user is
    // told, and is left able to try again or pick another method.
    expect(methodCard(EMAIL)).toBeEnabled()
    expect(methodCard(TOTP)).toBeEnabled()
    expect(methodCard(PASSKEY)).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // A failed enable must never fall through to the success path.
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('shows a backend-authored error message verbatim', async () => {
    mockEmailEnable.mockResolvedValueOnce({ data: null, error: 'Ya tienes email OTP activo' })
    renderEnrollment()

    fireEvent.click(methodCard(EMAIL))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Ya tienes email OTP activo')
    })
  })

  it('does not strand the cards when emailEnable rejects outright (API unreachable)', async () => {
    // lib/api/mfa.ts awaits res.json() unguarded, so an unreachable API rejects
    // instead of resolving { data, error }. Without a catch the card would stay
    // pending forever — the same silent failure this fix exists to remove.
    mockEmailEnable.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const onComplete = renderEnrollment()

    fireEvent.click(methodCard(EMAIL))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Algo salió mal. Inténtalo de nuevo.')
    })
    expect(methodCard(EMAIL)).toBeEnabled()
    expect(methodCard(TOTP)).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // handleSuccess() sits after the try/catch, so the catch has to return —
    // otherwise a rejected enable would fall through and complete enrollment.
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('advances to the recovery codes on success instead of toasting', async () => {
    mockEmailEnable.mockResolvedValueOnce({ data: { recovery_codes: ['AAAA-1111', 'BBBB-2222'] }, error: null })
    const onComplete = renderEnrollment()

    fireEvent.click(methodCard(EMAIL))

    await waitFor(() => {
      expect(screen.getByText('AAAA-1111')).toBeInTheDocument()
    })
    expect(screen.getByText('BBBB-2222')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
    // The modal owns the hand-off — enrollment isn't finished until it's closed.
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('completes enrollment when a successful response carries no recovery codes', async () => {
    mockEmailEnable.mockResolvedValueOnce({ data: {}, error: null })
    const onComplete = renderEnrollment()

    fireEvent.click(methodCard(EMAIL))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('locks the skip button while an enable is in flight so the recovery codes still render', async () => {
    const pending = deferred<Awaited<ReturnType<typeof emailEnable>>>()
    mockEmailEnable.mockReturnValueOnce(pending.promise)
    const onSkip = vi.fn()
    renderEnrollment(vi.fn(), onSkip)

    const skip = screen.getByRole('button', { name: 'Omitir por ahora' })
    fireEvent.click(methodCard(EMAIL))

    await waitFor(() => {
      expect(skip).toBeDisabled()
    })
    // In the settings tabs onSkip closes the panel, unmounting MfaEnrollment. A
    // mid-flight skip would drop the one-time recovery codes on the floor.
    fireEvent.click(skip)
    expect(onSkip).not.toHaveBeenCalled()

    pending.resolve({ data: { recovery_codes: ['AAAA-1111'] }, error: null })
    await waitFor(() => {
      expect(screen.getByText('AAAA-1111')).toBeInTheDocument()
    })
  })

  it('re-enables the skip button once a failed enable settles', async () => {
    mockEmailEnable.mockResolvedValueOnce({ data: null, error: 'mfa.errors.email_enable' })
    const onSkip = vi.fn()
    renderEnrollment(vi.fn(), onSkip)

    fireEvent.click(methodCard(EMAIL))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    // The lock is for the pending window only — it must not strand the escape hatch.
    const skip = screen.getByRole('button', { name: 'Omitir por ahora' })
    expect(skip).toBeEnabled()
    fireEvent.click(skip)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('opens the configure screen for a non-email method without calling emailEnable', async () => {
    mockTotpSetup.mockResolvedValueOnce({
      data: { secret: 'JBSWY3DPEHPK3PXP', qr_uri: 'otpauth://totp/Pelu' },
      error: null,
    })
    renderEnrollment()

    fireEvent.click(methodCard(TOTP))

    // Assert on the TOTP configure screen's own content, not just the call count.
    await waitFor(() => {
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    })
    expect(mockEmailEnable).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: new RegExp(EMAIL) })).not.toBeInTheDocument()
  })
})

describe('MfaEnrollment — one panel shell, one step indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports the method picker as step 1 of 3', () => {
    renderEnrollment()

    const bar = screen.getByRole('progressbar', { name: 'Paso 1 de 3' })
    expect(bar).toHaveAttribute('aria-valuenow', '1')
    expect(bar).toHaveAttribute('aria-valuemin', '1')
    expect(bar).toHaveAttribute('aria-valuemax', '3')
    expect(screen.getByText('Paso 1 de 3 · Elige un método')).toBeInTheDocument()
  })

  it('advances the indicator to step 2 on the TOTP configure screen', async () => {
    mockTotpSetup.mockResolvedValueOnce({
      data: { secret: 'JBSWY3DPEHPK3PXP', qr_uri: 'otpauth://totp/Pelu' },
      error: null,
    })
    renderEnrollment()

    fireEvent.click(methodCard(TOTP))

    const bar = await screen.findByRole('progressbar', { name: 'Paso 2 de 3' })
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByText('Paso 2 de 3 · Configúralo')).toBeInTheDocument()
  })

  it('advances the indicator to step 2 on the passkey configure screen', async () => {
    renderEnrollment()

    fireEvent.click(methodCard(PASSKEY))

    // Both configure screens share one branch now — the passkey one has to
    // report the same step as TOTP, not fall back to the picker's step 1.
    const bar = await screen.findByRole('progressbar', { name: 'Paso 2 de 3' })
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    // Proves we really are on the passkey screen and not still on the picker.
    expect(screen.getByRole('button', { name: 'Registrar passkey' })).toBeInTheDocument()
  })

  it('keeps the forced-dark beams shell on the picker and both configure screens', async () => {
    // The MFA palette is only legible against the forced-dark wrapper: text-pop-450
    // on bg-pop-550/20 measures ~10:1 there and 1.29:1 on a light background. The
    // dedupe must not drop `dark` from any branch.
    mockTotpSetup.mockResolvedValueOnce({
      data: { secret: 'JBSWY3DPEHPK3PXP', qr_uri: 'otpauth://totp/Pelu' },
      error: null,
    })
    const { container } = renderPanel()

    expect(container.firstElementChild).toHaveClass('dark')

    fireEvent.click(methodCard(TOTP))
    await screen.findByRole('progressbar', { name: 'Paso 2 de 3' })
    expect(container.firstElementChild).toHaveClass('dark')
  })

  it('hands the recovery codes to the modal, which sits outside the shell', async () => {
    mockEmailEnable.mockResolvedValueOnce({ data: { recovery_codes: ['AAAA-1111'] }, error: null })
    renderEnrollment()

    fireEvent.click(methodCard(EMAIL))

    await waitFor(() => {
      expect(screen.getByText('AAAA-1111')).toBeInTheDocument()
    })
    // MfaRecoveryModal returns before the panel branches and renders its own
    // chrome, so the step bar is deliberately absent there.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
