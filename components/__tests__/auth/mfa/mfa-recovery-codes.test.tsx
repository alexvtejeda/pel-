import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { renderWithProviders } from '../../test-utils'
import { MfaRecoveryCodes, MfaRecoveryModal } from '@/components/auth/mfa/mfa-recovery-modal'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const CODES = ['AAAA-1111', 'BBBB-2222', 'CCCC-3333']

const ACK = 'Ya guardé mis códigos en un lugar seguro'
const CLOSE = 'Entendido'

function confirmButton() {
  return screen.getByRole('button', { name: CLOSE })
}

/** Tick the acknowledgement the way a user would. */
function acknowledge() {
  fireEvent.click(screen.getByRole('checkbox', { name: ACK }))
}

// jsdom implements neither of these, and the download handler would blow up on
// the first one. Captures the Blob so the file's contents can be asserted.
function stubObjectUrl() {
  const created: Blob[] = []
  const url = URL as unknown as {
    createObjectURL?: (b: Blob) => string
    revokeObjectURL?: (u: string) => void
  }
  const before = { create: url.createObjectURL, revoke: url.revokeObjectURL }
  url.createObjectURL = (blob: Blob) => {
    created.push(blob)
    return 'blob:mock'
  }
  url.revokeObjectURL = () => {}
  return {
    created,
    restore: () => {
      url.createObjectURL = before.create
      url.revokeObjectURL = before.revoke
    },
  }
}

describe('MfaRecoveryCodes — the codes cannot be left without acknowledging them', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders every code', () => {
    renderWithProviders(<MfaRecoveryCodes codes={CODES} onConfirm={vi.fn()} />)

    for (const code of CODES) {
      expect(screen.getByText(code)).toBeInTheDocument()
    }
  })

  it('keeps the way out closed until the acknowledgement is ticked', () => {
    const onConfirm = vi.fn()
    renderWithProviders(<MfaRecoveryCodes codes={CODES} onConfirm={onConfirm} />)

    expect(screen.getByRole('checkbox', { name: ACK })).not.toBeChecked()
    expect(confirmButton()).toBeDisabled()

    // disabled:pointer-events-none means a real user could not land this click
    // at all; firing it anyway proves the handler is not reachable either.
    fireEvent.click(confirmButton())
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('hands over once acknowledged, and locks again if the tick is undone', () => {
    const onConfirm = vi.fn()
    renderWithProviders(<MfaRecoveryCodes codes={CODES} onConfirm={onConfirm} />)

    acknowledge()
    expect(confirmButton()).toBeEnabled()
    fireEvent.click(confirmButton())
    expect(onConfirm).toHaveBeenCalledTimes(1)

    acknowledge()
    expect(confirmButton()).toBeDisabled()
  })

  it('downloads one code per line under the translated filename', () => {
    const objectUrl = stubObjectUrl()
    const clicked: { href: string; download: string }[] = []
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.getAttribute('href') ?? '', download: this.download })
      })

    try {
      renderWithProviders(<MfaRecoveryCodes codes={CODES} onConfirm={vi.fn()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Descargar' }))

      expect(clicked).toHaveLength(1)
      expect(clicked[0].download).toBe('pelu-codigos-de-recuperacion.txt')
      expect(objectUrl.created).toHaveLength(1)
      return objectUrl.created[0].text().then((text) => {
        expect(text).toBe(CODES.join('\n'))
      })
    } finally {
      click.mockRestore()
      objectUrl.restore()
    }
  })

  it('leaves the anchor out of the document once the download has fired', () => {
    const objectUrl = stubObjectUrl()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    try {
      renderWithProviders(<MfaRecoveryCodes codes={CODES} onConfirm={vi.fn()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Descargar' }))

      expect(document.querySelector('a[download]')).toBeNull()
    } finally {
      click.mockRestore()
      objectUrl.restore()
    }
  })

  it('copies the codes and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    try {
      renderWithProviders(<MfaRecoveryCodes codes={CODES} onConfirm={vi.fn()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Copiar todos' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '¡Copiados!' })).toBeInTheDocument()
      })
      expect(writeText).toHaveBeenCalledWith(CODES.join('\n'))
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it('does not claim a copy happened when the clipboard API is missing', async () => {
    // navigator.clipboard is undefined on insecure origins and in some in-app
    // browsers. The button must stay quiet rather than throw — and must not
    // flip to "¡Copiados!", which would send the user away empty-handed.
    expect(navigator.clipboard).toBeUndefined()
    renderWithProviders(<MfaRecoveryCodes codes={CODES} onConfirm={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copiar todos' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copiar todos' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: '¡Copiados!' })).not.toBeInTheDocument()
  })
})

describe('MfaRecoveryModal — non-dismissible over the settings tabs', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // Escape and outside clicks are the two gestures Radix wires up by default, so
  // the control below proves this environment really does dispatch them — without
  // it, the two assertions that follow would pass against a broken dialog too.
  it('control: an ordinary dialog in this environment does close on Escape', async () => {
    function Ordinary() {
      const [open, setOpen] = useState(true)
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Cerrable</DialogTitle>
          </DialogContent>
        </Dialog>
      )
    }
    renderWithProviders(<Ordinary />)
    expect(screen.getByText('Cerrable')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText('Cerrable')).not.toBeInTheDocument()
    })
  })

  it('survives Escape with the codes still on screen', async () => {
    const onClose = vi.fn()
    renderWithProviders(<MfaRecoveryModal codes={CODES} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.getByText('AAAA-1111')).toBeInTheDocument()
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('survives a click on the backdrop', async () => {
    const onClose = vi.fn()
    renderWithProviders(<MfaRecoveryModal codes={CODES} onClose={onClose} />)

    // Radix dismisses on pointerdown outside the content, so the gesture has to
    // start with one — a bare click never reaches its handler.
    fireEvent.pointerDown(document.body)
    fireEvent.click(document.body)

    await waitFor(() => {
      expect(screen.getByText('AAAA-1111')).toBeInTheDocument()
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ships no close button of its own to bypass the acknowledgement', () => {
    renderWithProviders(<MfaRecoveryModal codes={CODES} onClose={vi.fn()} />)

    // Only the three the screen defines: copy, download, and the gated confirm.
    const names = screen.getAllByRole('button').map((b) => b.textContent?.trim())
    expect(names).toEqual(['Copiar todos', 'Descargar', CLOSE])
  })

  it('puts the page underneath out of reach while the codes are up', () => {
    // Radix hides siblings with aria-hidden rather than aria-modal. That is what
    // stops a settings tab's own controls being tabbed or clicked into while the
    // one-time codes are showing.
    const { container } = renderWithProviders(<MfaRecoveryModal codes={CODES} onClose={vi.fn()} />)

    expect(container).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes only after the acknowledgement, and is labelled for screen readers', () => {
    const onClose = vi.fn()
    renderWithProviders(<MfaRecoveryModal codes={CODES} onClose={onClose} />)

    expect(screen.getByRole('dialog', { name: 'Códigos de recuperación' })).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()

    acknowledge()
    fireEvent.click(confirmButton())

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
