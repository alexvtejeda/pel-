import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

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
  // The demo-stub CTA was permanently disabled — it promised a chat hand-off
  // that does not exist yet. Queried broadly so a re-added disabled button
  // (disabled buttons stay in the a11y tree) still trips this.
  it('renders no Contactar CTA at all', () => {
    const { container } = renderWithProviders(<ProviderDetail provider={provider()} />)

    expect(screen.queryByRole('button', { name: /contact/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Contact(ar)?$/)).not.toBeInTheDocument()
    expect(container.querySelector('button[disabled]')).toBeNull()
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

  // The removed CTA's replacement comment claims these are the real contact
  // routes, so they have to stay rendered.
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
