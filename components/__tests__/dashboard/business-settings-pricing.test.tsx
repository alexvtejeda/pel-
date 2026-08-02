import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'negocio@tmp.example', display_name: 'Negocio' },
    logout: vi.fn(),
  }),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
}))

vi.mock('@/lib/api/mfa', () => ({
  getMethods: vi.fn().mockResolvedValue({
    data: { methods: [], mfa_enabled: false, recovery_codes_remaining: 0 },
    error: null,
  }),
  deleteTotp: vi.fn(),
  deleteWebauthn: vi.fn(),
  deleteEmail: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}))

// Keep the real constants — the point of several of these tests is that the
// component reads the canonical vocabulary rather than a private list.
vi.mock('@/lib/api/businesses', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/businesses')>()),
  getMyBusiness: vi.fn(),
  updateBusiness: vi.fn(),
  uploadBusinessPhoto: vi.fn(),
}))

import { SettingsTab } from '@/components/dashboard/business/settings-tab'
import {
  getMyBusiness,
  updateBusiness,
  BUSINESS_SERVICE_OPTIONS,
  BUSINESS_SERVICE_TYPES,
} from '@/lib/api/businesses'

const mockGet = vi.mocked(getMyBusiness)
const mockUpdate = vi.mocked(updateBusiness)

function businessFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    user_id: 'u1',
    name: 'PetTransportRD',
    phone: '809-000-0000',
    address: 'Santo Domingo',
    services: ['transport'],
    other_service: null,
    status: 'active',
    ...overrides,
  } as never
}

/** Waits for the getMyBusiness prefill to land before interacting. */
async function renderPrefilled(business = businessFixture()) {
  mockGet.mockResolvedValue({ data: business, error: null })
  const view = renderWithProviders(<SettingsTab />)
  await screen.findByDisplayValue('PetTransportRD')
  return view
}

const saveButton = () => screen.getByRole('button', { name: 'Guardar cambios' })
const petTaxiToggle = () => screen.getByRole('checkbox', { name: /Ofrecer pet-taxi/ })
const sizeToggle = () => screen.getByRole('checkbox', { name: /Cobrar seg[úu]n el tama[ñn]o/ })

/** A business already opted into pet-taxi, so the size section is reachable. */
const petTaxiFixture = (overrides: Record<string, unknown> = {}) =>
  businessFixture({ services: ['transport', 'pet_taxi'], taxi_base_fee: 250, ...overrides })

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdate.mockResolvedValue({ data: businessFixture(), error: null })
})

describe('SettingsTab — pet-taxi opt-in', () => {
  it('opting in adds pet_taxi to services', async () => {
    await renderPrefilled()

    fireEvent.click(petTaxiToggle())
    fireEvent.change(screen.getByLabelText('Tarifa base (DOP)'), { target: { value: '250' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    const payload = mockUpdate.mock.calls[0][0]
    expect(payload.services).toContain('pet_taxi')
    expect(payload.taxi_base_fee).toBe(250)
  })

  it('opting out drops pet_taxi from services', async () => {
    await renderPrefilled(
      businessFixture({ services: ['transport', 'pet_taxi'], taxi_base_fee: 250 }),
    )

    // Prefilled as opted in.
    expect(petTaxiToggle()).toBeChecked()

    fireEvent.click(petTaxiToggle())
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    const payload = mockUpdate.mock.calls[0][0]
    expect(payload.services).not.toContain('pet_taxi')
    expect(payload.services).toContain('transport')
  })

  it('opted in with no base fee blocks the save and explains why', async () => {
    await renderPrefilled()

    fireEvent.click(petTaxiToggle())

    expect(
      screen.getByText('Agrega una tarifa base para aparecer en el listado de transporte.'),
    ).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    fireEvent.click(saveButton())
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('a fee above the backend 50000 ceiling blocks the save', async () => {
    await renderPrefilled()

    fireEvent.click(petTaxiToggle())
    fireEvent.change(screen.getByLabelText('Tarifa base (DOP)'), { target: { value: '250' } })
    fireEvent.change(screen.getByLabelText('Precio por kilómetro (DOP)'), {
      target: { value: '50001' },
    })

    expect(screen.getByText('Debe ser un monto entre 0 y 50,000 DOP.')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    fireEvent.click(saveButton())
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('a negative fee blocks the save', async () => {
    await renderPrefilled()

    fireEvent.click(petTaxiToggle())
    fireEvent.change(screen.getByLabelText('Tarifa base (DOP)'), { target: { value: '-1' } })

    expect(saveButton()).toBeDisabled()
  })

  it('prefills all three fees from the API response', async () => {
    await renderPrefilled(
      businessFixture({
        services: ['transport', 'pet_taxi'],
        taxi_base_fee: 250,
        taxi_per_km: 35.5,
        taxi_per_minute: 4,
      }),
    )

    expect(screen.getByLabelText('Tarifa base (DOP)')).toHaveValue(250)
    expect(screen.getByLabelText('Precio por kilómetro (DOP)')).toHaveValue(35.5)
    expect(screen.getByLabelText('Precio por minuto (DOP)')).toHaveValue(4)
  })

  it('omits fees left empty so the platform default keeps applying', async () => {
    await renderPrefilled()

    fireEvent.click(petTaxiToggle())
    fireEvent.change(screen.getByLabelText('Tarifa base (DOP)'), { target: { value: '250' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    const payload = mockUpdate.mock.calls[0][0]
    // Sending null would be a silent no-op against the backend's COALESCE, so the
    // untouched fields must be absent rather than explicitly nulled.
    expect('taxi_per_km' in payload).toBe(false)
    expect('taxi_per_minute' in payload).toBe(false)
  })
})

describe('SettingsTab — size-band pricing', () => {
  it('hides the size section entirely until pet-taxi is on', async () => {
    await renderPrefilled()
    expect(screen.queryByRole('checkbox', { name: /Cobrar seg[úu]n el tama[ñn]o/ })).toBeNull()
  })

  it('reveals the three band inputs only when size pricing is on', async () => {
    await renderPrefilled(petTaxiFixture())

    expect(sizeToggle()).not.toBeChecked()
    expect(screen.queryByLabelText(/^Recargo.*mediano/i)).not.toBeInTheDocument()

    fireEvent.click(sizeToggle())

    expect(screen.getByLabelText(/^Recargo.*peque/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Recargo.*mediano/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Recargo.*grande/i)).toBeInTheDocument()
  })

  it('sends only the bands that carry a value', async () => {
    await renderPrefilled(petTaxiFixture())

    fireEvent.click(sizeToggle())
    fireEvent.change(screen.getByLabelText(/^Recargo.*mediano/i), { target: { value: '300' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    const payload = mockUpdate.mock.calls[0][0]
    expect(payload.taxi_size_pricing_enabled).toBe(true)
    expect(payload.taxi_surcharge_medium).toBe(300)
    // A blank band must be absent, not 0 — the backend reads absent as "use the
    // platform default" and 0 as "this band is free".
    expect('taxi_surcharge_small' in payload).toBe(false)
    expect('taxi_surcharge_large' in payload).toBe(false)
  })

  it('sends the toggle as false when the business opts back out', async () => {
    await renderPrefilled(petTaxiFixture({ taxi_size_pricing_enabled: true, taxi_surcharge_large: 600 }))

    expect(sizeToggle()).toBeChecked()
    fireEvent.click(sizeToggle())
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    const payload = mockUpdate.mock.calls[0][0]
    // Explicitly false, never omitted: the backend COALESCEs an absent field, so
    // omitting it would silently leave size pricing switched on.
    expect(payload.taxi_size_pricing_enabled).toBe(false)
  })

  it('prefills the toggle and the bands from the API response', async () => {
    await renderPrefilled(
      petTaxiFixture({
        taxi_size_pricing_enabled: true,
        taxi_surcharge_small: 0,
        taxi_surcharge_large: 600,
      }),
    )

    expect(sizeToggle()).toBeChecked()
    // 0 is a real value ("this band is free") and must survive the round-trip
    // rather than rendering as an empty "use the default" field.
    expect(screen.getByLabelText(/^Recargo.*peque/i)).toHaveValue(0)
    expect(screen.getByLabelText(/^Recargo.*mediano/i)).toHaveValue(null)
    expect(screen.getByLabelText(/^Recargo.*grande/i)).toHaveValue(600)
  })

  it('a surcharge above the backend 50000 ceiling blocks the save', async () => {
    await renderPrefilled(petTaxiFixture())

    fireEvent.click(sizeToggle())
    fireEvent.change(screen.getByLabelText(/^Recargo.*grande/i), { target: { value: '50001' } })

    expect(saveButton()).toBeDisabled()
    fireEvent.click(saveButton())
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('does not send any band while size pricing is off', async () => {
    await renderPrefilled(petTaxiFixture())

    fireEvent.click(sizeToggle())
    fireEvent.change(screen.getByLabelText(/^Recargo.*mediano/i), { target: { value: '300' } })
    // Turning it back off must not smuggle the typed amount through.
    fireEvent.click(sizeToggle())
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    const payload = mockUpdate.mock.calls[0][0]
    expect(payload.taxi_size_pricing_enabled).toBe(false)
    expect('taxi_surcharge_medium' in payload).toBe(false)
  })
})

describe('SettingsTab — terms and conditions', () => {
  it('round-trips the terms field and trims on save', async () => {
    await renderPrefilled(businessFixture({ terms_and_conditions: 'Transportín propio.' }))

    const box = screen.getByLabelText('Tus términos y condiciones')
    expect(box).toHaveValue('Transportín propio.')

    fireEvent.change(box, { target: { value: '  Cancelaciones con 24 horas.  ' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate.mock.calls[0][0].terms_and_conditions).toBe('Cancelaciones con 24 horas.')
  })

  it('counts characters, not bytes, and blocks past 5000', async () => {
    await renderPrefilled()

    const box = screen.getByLabelText('Tus términos y condiciones')

    // 5000 multibyte characters is exactly at the limit the backend counts in runes.
    fireEvent.change(box, { target: { value: 'ñ'.repeat(5000) } })
    expect(screen.getByText('5000 / 5000 caracteres')).toBeInTheDocument()
    expect(saveButton()).not.toBeDisabled()

    fireEvent.change(box, { target: { value: 'ñ'.repeat(5001) } })
    expect(screen.getByText('Máximo 5000 caracteres.')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })
})

describe('business service vocabulary', () => {
  const LEGACY_KEYS = ['taxi', 'walking', 'sitting', 'vet']

  it('offers no legacy keys', () => {
    for (const legacy of LEGACY_KEYS) {
      expect(BUSINESS_SERVICE_TYPES).not.toContain(legacy)
    }
  })

  it('keeps pet_taxi out of the ordinary service checkboxes', () => {
    expect(BUSINESS_SERVICE_TYPES).toContain('pet_taxi')
    expect(BUSINESS_SERVICE_OPTIONS).not.toContain('pet_taxi')
  })

  it('renders every service option with a translated label, not a raw key', async () => {
    await renderPrefilled()

    // The old private list showed "Paseos"/"Cuidado" for keys the backend rejects.
    expect(screen.getByRole('button', { name: 'Paseo de perros' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cuidado de mascotas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Veterinaria' })).toBeInTheDocument()

    for (const key of BUSINESS_SERVICE_OPTIONS) {
      expect(screen.queryByRole('button', { name: key })).not.toBeInTheDocument()
    }
  })

  // The raw-key bug on /aliados was exactly a missing entry here, so every key a
  // business can carry must resolve in both locales — including the business-only
  // ones no service provider will ever have.
  it.each(['es', 'en'])('labels every business service key in %s', async (locale) => {
    const messages = (
      await import(`@/public/locales/${locale}/business.json`)
    ).default.service_providers.services as Record<string, string>

    for (const key of BUSINESS_SERVICE_TYPES) {
      expect(messages[key], `missing ${locale} label for "${key}"`).toBeTruthy()
    }
  })

  it('submits the canonical keys the backend accepts', async () => {
    await renderPrefilled()

    fireEvent.click(screen.getByRole('button', { name: 'Paseo de perros' }))
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate.mock.calls[0][0].services).toEqual(['transport', 'dog_walking'])
  })
})
