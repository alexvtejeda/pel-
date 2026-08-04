import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'

const { auth, push, toastError, createConversation } = vi.hoisted(() => ({
  auth: { user: null as { id: string; role: string } | null, loading: false },
  push: vi.fn(),
  toastError: vi.fn(),
  createConversation: vi.fn(),
}))

vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: () => auth }))
vi.mock('@/lib/api/chat', () => ({ createConversation }))
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

import { renderWithProviders } from '../test-utils'
import * as nav from 'next/navigation'

import { ProviderDetail } from '@/components/aliados/provider-detail'
import { UnifiedProvider } from '@/lib/api/providers'

const provider = (overrides: Partial<UnifiedProvider> = {}): UnifiedProvider => ({
  id: '1',
  user_id: 'u1',
  name: 'Baños Luna',
  provider_type: 'business',
  services: ['pet_sitting'],
  price: 1500,
  ...overrides,
})

const HOURS = {
  monday: { open: true, from: '09:00', to: '17:00' },
  tuesday: { open: false, from: '', to: '' },
  wednesday: { open: false, from: '', to: '' },
  thursday: { open: false, from: '', to: '' },
  friday: { open: false, from: '', to: '' },
  saturday: { open: false, from: '', to: '' },
  sunday: { open: false, from: '', to: '' },
}

// Recomputed from Intl rather than hardcoded: the exact glyphs are ICU's call
// (es-DO gives an ASCII "RD$", en-US gives "DOP" + a non-breaking space).
const dop = (value: number) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(value)

describe('ProviderDetail', () => {
  /*
    The CTA used to be a permanently-disabled demo stub, then was removed
    outright because it promised a chat hand-off that did not exist. It is back
    and functional — so it must be enabled, not a re-added stub.
  */
  it('renders an enabled Contactar CTA', () => {
    const { container } = renderWithProviders(<ProviderDetail provider={provider()} />)

    expect(screen.getByRole('button', { name: /contactar/i })).toBeEnabled()
    expect(container.querySelector('.cursor-not-allowed')).toBeNull()
  })

  it('translates service badges instead of showing raw backend strings', () => {
    renderWithProviders(
      <ProviderDetail provider={provider({ services: ['pet_sitting', 'grooming'] })} />
    )

    expect(screen.getByText('Cuidado de mascotas')).toBeInTheDocument()
    expect(screen.getByText('Peluquería')).toBeInTheDocument()
    expect(screen.queryByText('pet_sitting')).not.toBeInTheDocument()
  })

  // These three are business-only keys — no service provider can carry them, so
  // they had no entry under service_providers.services.* and a business tagged
  // `veterinary` rendered the bare word "veterinary" to users.
  it('translates the business-only service keys', () => {
    renderWithProviders(
      <ProviderDetail
        provider={provider({ services: ['veterinary', 'other', 'pet_taxi'] })}
      />
    )

    expect(screen.getByText('Veterinaria')).toBeInTheDocument()
    expect(screen.getByText('Otro')).toBeInTheDocument()
    expect(screen.getByText('Pet-taxi')).toBeInTheDocument()
    for (const raw of ['veterinary', 'other', 'pet_taxi']) {
      expect(screen.queryByText(raw)).not.toBeInTheDocument()
    }
  })

  it('degrades an untranslated service value to the raw string, not a translation key', () => {
    renderWithProviders(<ProviderDetail provider={provider({ services: ['pet_taxidermy'] })} />)

    expect(screen.getByText('pet_taxidermy')).toBeInTheDocument()
    expect(screen.queryByText(/service_providers\.services/)).not.toBeInTheDocument()
  })

  it('formats the price as DOP currency through Intl', () => {
    renderWithProviders(<ProviderDetail provider={provider({ price: 1500 })} />)
    expect(screen.getByText(dop(1500))).toBeInTheDocument()
  })

  // Pins the Intl path specifically: maximumFractionDigits rounds 1500.5 up,
  // where the old `RD$${price.toLocaleString()}` rendered "RD$1,500.5".
  it('rounds fractional prices the way the shared formatter does', () => {
    renderWithProviders(<ProviderDetail provider={provider({ price: 1500.5 })} />)

    expect(screen.getByText(dop(1500.5))).toBeInTheDocument()
    expect(screen.queryByText(/1,500\.5/)).not.toBeInTheDocument()
  })

  it('shows the unavailable copy rather than RD$0 or NaN when there is no price', () => {
    renderWithProviders(<ProviderDetail provider={provider({ price: null })} />)

    expect(screen.getByText('Precio no disponible')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.queryByText(dop(0))).not.toBeInTheDocument()
  })

  it('shows the unavailable copy when price is absent entirely', () => {
    const { price: _price, ...rest } = provider()
    renderWithProviders(<ProviderDetail provider={rest as UnifiedProvider} />)

    expect(screen.getByText('Precio no disponible')).toBeInTheDocument()
  })

  // Secondary contact routes. Contactar is the primary one now, but these are
  // the only way to reach a provider outside the app, so they stay.
  it('keeps the address and Instagram contact affordances', () => {
    renderWithProviders(
      <ProviderDetail
        provider={provider({ address: 'Av. Winston Churchill 45, Santo Domingo', instagram: '@banosluna' })}
      />
    )

    expect(screen.getByText('Av. Winston Churchill 45, Santo Domingo')).toBeInTheDocument()

    const instagram = screen.getByRole('link', { name: /banosluna/ })
    expect(instagram).toHaveAttribute('href', 'https://instagram.com/banosluna')
    expect(instagram).toHaveAttribute('target', '_blank')
    expect(instagram).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})

/*
  The API sends `provider_type` (serviceproviders.UnifiedProvider in
  api/docs/api/swagger.yaml); the interface declared `type`, so `provider.type`
  read undefined and every `=== 'business'` branch was permanently false. The
  business badge, the operating-hours section and the Instagram link have never
  rendered on /aliados for a real payload.
*/
describe('ProviderDetail identity', () => {
  it('shows the business badge for a business provider', () => {
    renderWithProviders(<ProviderDetail provider={provider()} />)

    expect(screen.getByText('Empresa verificada')).toBeInTheDocument()
    expect(screen.queryByText('Proveedor verificado')).not.toBeInTheDocument()
  })

  it('shows the member badge for a member provider', () => {
    renderWithProviders(<ProviderDetail provider={provider({ provider_type: 'member' })} />)

    expect(screen.getByText('Proveedor verificado')).toBeInTheDocument()
    expect(screen.queryByText('Empresa verificada')).not.toBeInTheDocument()
  })

  it('renders the operating hours for a business', () => {
    renderWithProviders(<ProviderDetail provider={provider({ operating_hours: HOURS })} />)

    expect(screen.getByText('Horario de atención')).toBeInTheDocument()
    expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
  })

  // Members register through the wizard without a schedule, so the section is
  // business-only — the gate has to be on identity, not on the field existing.
  it('hides the operating hours for a member provider', () => {
    renderWithProviders(
      <ProviderDetail provider={provider({ provider_type: 'member', operating_hours: HOURS })} />
    )

    expect(screen.queryByText('Horario de atención')).not.toBeInTheDocument()
    expect(screen.queryByText('09:00 - 17:00')).not.toBeInTheDocument()
  })

  it('renders the Instagram link for a business', () => {
    renderWithProviders(<ProviderDetail provider={provider({ instagram: '@banosluna' })} />)

    expect(screen.getByRole('link', { name: /banosluna/ })).toBeInTheDocument()
  })

  it('hides the Instagram link for a member provider', () => {
    renderWithProviders(
      <ProviderDetail provider={provider({ provider_type: 'member', instagram: '@banosluna' })} />
    )

    expect(screen.queryByRole('link', { name: /banosluna/ })).not.toBeInTheDocument()
  })
})

describe('ProviderDetail Contactar', () => {
  const clickContact = () =>
    fireEvent.click(screen.getByRole('button', { name: /contactar/i }))

  beforeEach(() => {
    auth.user = null
    push.mockReset()
    toastError.mockReset()
    createConversation.mockReset()
    /*
      `renderWithProviders` registers its own `next/navigation` mock whose
      useRouter mints a fresh `push` per call, and because test-utils is
      imported AFTER this file's hoisted vi.mock calls, its factory is the one
      that wins — a `vi.mock('next/navigation', …)` written here is silently
      discarded. Spying on the resulting namespace is what actually reaches the
      component.
    */
    vi.spyOn(nav, 'useRouter').mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof nav.useRouter>)
  })

  /*
    /aliados is public and this button is the conversion path, so a logged-out
    visitor sees it rather than having it hidden. There is no return-URL
    convention (postLoginRedirect is role-based), so login is the destination
    and no conversation is opened on their behalf.
  */
  it('sends a logged-out visitor to login without opening a conversation', () => {
    renderWithProviders(<ProviderDetail provider={provider()} />)

    clickContact()

    expect(createConversation).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/es/auth/login')
  })

  it('opens a conversation and navigates to that thread', async () => {
    auth.user = { id: 'u2', role: 'member' }
    createConversation.mockResolvedValue({ data: { id: 'c1' }, error: null })

    renderWithProviders(<ProviderDetail provider={provider()} />)

    clickContact()

    // The resource id, never the owner's user id — the backend resolves the owner.
    await waitFor(() => expect(createConversation).toHaveBeenCalledWith({ provider_id: '1' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/es/chat?conversation_id=c1'))
    expect(toastError).not.toHaveBeenCalled()
  })

  // Every authenticated role can reach a provider — the backend admits member,
  // rescue_center and business alike — so the CTA is not gated on role.
  it('opens a conversation for a rescue center too', async () => {
    auth.user = { id: 'u2', role: 'rescue_center' }
    createConversation.mockResolvedValue({ data: { id: 'c9' }, error: null })

    renderWithProviders(<ProviderDetail provider={provider()} />)

    clickContact()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/es/chat?conversation_id=c9'))
  })

  // The backend answers this with a 400; hiding the button is what stops the
  // user from ever reaching that dead end.
  it('hides the button on your own listing', () => {
    auth.user = { id: 'u1', role: 'member' } // same id as provider.user_id

    renderWithProviders(<ProviderDetail provider={provider()} />)

    expect(screen.queryByRole('button', { name: /contactar/i })).toBeNull()
  })

  /*
    Two distinct 404 bodies exist — "not found" when the provider is missing or
    no longer active, and "provider not found" when the id is malformed
    (api: internal/chat/handler.go). Both mean the same thing to a user, so the
    match is a substring, not the equality the plan specified.
  */
  it.each(['not found', 'provider not found'])(
    'reports an unavailable provider for the %o 404 without navigating',
    async error => {
      auth.user = { id: 'u2', role: 'member' }
      createConversation.mockResolvedValue({ data: null, error })

      renderWithProviders(<ProviderDetail provider={provider()} />)

      clickContact()

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Este aliado ya no está disponible')
      )
      expect(push).not.toHaveBeenCalled()
    }
  )

  it('reports a generic failure without navigating', async () => {
    auth.user = { id: 'u2', role: 'member' }
    createConversation.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<ProviderDetail provider={provider()} />)

    clickContact()

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('No pudimos iniciar la conversación')
    )
    expect(push).not.toHaveBeenCalled()
  })

  // A failed attempt has to leave the button usable — the provider may just
  // have been mid-deploy.
  it('re-enables the button after a failure', async () => {
    auth.user = { id: 'u2', role: 'member' }
    createConversation.mockResolvedValue({ data: null, error: 'boom' })

    renderWithProviders(<ProviderDetail provider={provider()} />)

    clickContact()

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /contactar/i })).toBeEnabled()
  })

  /*
    The request is idempotent server-side, so a double tap cannot fork the
    thread — but it can fire a second navigation at a half-unmounted page. The
    pending state is what makes the button honest about the wait.
  */
  it('shows a pending state and ignores a second click while in flight', async () => {
    auth.user = { id: 'u2', role: 'member' }
    let resolve!: (value: unknown) => void
    createConversation.mockReturnValue(new Promise(r => (resolve = r)))

    renderWithProviders(<ProviderDetail provider={provider()} />)

    clickContact()

    const button = await screen.findByRole('button', { name: /abriendo chat/i })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(createConversation).toHaveBeenCalledTimes(1)

    resolve({ data: { id: 'c1' }, error: null })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/es/chat?conversation_id=c1'))
  })
})
