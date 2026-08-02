import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { TransportCreationForm } from '@/components/transport/transport-creation-form'

// Mutable so a single suite can exercise both sides of the role fork.
const authMock = vi.hoisted(() => ({ role: 'member' }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', role: authMock.role } }),
}))

// Size and weight ride along on the pet option — they are the pricing inputs, so
// a load branch that maps the pet down to {id, name} silently un-prices the trip.
vi.mock('@/lib/api/user-pets', () => ({
  listUserPets: vi.fn().mockResolvedValue({
    data: [{ id: 'p1', name: 'Firulais', size: 'large', weight_lb: 80 }],
    error: null,
  }),
}))
vi.mock('@/lib/api/pets', () => ({
  listPets: vi.fn().mockResolvedValue([{ id: 'rc-p1', name: 'Luna', size: 'small' }]),
}))
vi.mock('@/lib/api/rescue-centers', () => ({
  getMyRescueCenter: vi.fn().mockResolvedValue({ data: { id: 'rc1' }, error: null }),
}))

vi.mock('@/lib/api/transport', () => ({
  requestTrip: vi.fn(),
  quoteTrip: vi.fn(),
  listTransportBusinesses: vi.fn(),
}))
import { requestTrip, quoteTrip, listTransportBusinesses } from '@/lib/api/transport'
const mockRequest = vi.mocked(requestTrip)
const mockQuote = vi.mocked(quoteTrip)
const mockList = vi.mocked(listTransportBusinesses)

beforeEach(() => {
  vi.clearAllMocks()
  authMock.role = 'member'
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve([{ lat: '18.5', lon: '-69.9' }]),
  }) as unknown as typeof fetch
  mockList.mockResolvedValue({ data: { items: [
    { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2,
      quote: { distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: false, priced_from: 'size' as const } },
  ], next_cursor: '' }, error: null })
  mockQuote.mockResolvedValue({ data: { business_id: 'b1', distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: false, routing_source: 'ors', currency: 'DOP', priced_from: 'size' }, error: null })
  mockRequest.mockResolvedValue({ data: { id: 't1', status: 'requested' } as never, error: null })
})

describe('TransportCreationForm reflow', () => {
  it('submits business_id (not target_driver_id)', async () => {
    const onTripCreated = vi.fn()
    renderWithProviders(<TransportCreationForm onTripCreated={onTripCreated} />)

    await screen.findByRole('option', { name: 'Firulais' })
    fireEvent.change(screen.getByPlaceholderText('Dirección de recogida'), { target: { value: 'Calle A' } })
    fireEvent.change(screen.getByPlaceholderText('Dirección de entrega'), { target: { value: 'Calle B' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } })

    fireEvent.click(screen.getByText('Elegir transportista'))
    fireEvent.click(await screen.findByText('PetGo'))

    await waitFor(() => expect(mockQuote).toHaveBeenCalledWith({
      business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.5, lng: -69.9 },
      size: 'large', weight_lb: 80,
    }))
    fireEvent.click(await screen.findByText('Solicitar · RD$ 450'))

    await waitFor(() => expect(mockRequest).toHaveBeenCalled())
    const payload = mockRequest.mock.calls[0][0]
    expect(payload.business_id).toBe('b1')
    expect(payload).not.toHaveProperty('target_driver_id')
    expect(payload.stops).toHaveLength(2)
    expect(onTripCreated).toHaveBeenCalled()
  })
})

/*
  The pricing inputs have to survive the whole trip: picker fan-out → quote →
  request. If any leg drops them the user sees one price in the picker and a
  different one on the confirmation.
*/
describe('TransportCreationForm size and weight threading', () => {
  async function pickBusiness() {
    renderWithProviders(<TransportCreationForm onTripCreated={vi.fn()} />)
    await screen.findByRole('option', { name: 'Firulais' })
    fireEvent.change(screen.getByPlaceholderText('Dirección de recogida'), { target: { value: 'Calle A' } })
    fireEvent.change(screen.getByPlaceholderText('Dirección de entrega'), { target: { value: 'Calle B' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } })
    fireEvent.click(screen.getByText('Elegir transportista'))
    fireEvent.click(await screen.findByText('PetGo'))
  }

  // The picker here is the real component, so this pins the whole wiring: form
  // state → picker props → fan-out query. It is the leg the plan flags as the
  // most likely to be skipped.
  it('prices the business picker with the selected pet', async () => {
    await pickBusiness()

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'large', weight_lb: 80 }),
    )
  })

  it('sends the selected pet size and weight with the quote', async () => {
    await pickBusiness()

    await waitFor(() =>
      expect(mockQuote).toHaveBeenCalledWith(
        expect.objectContaining({ size: 'large', weight_lb: 80 }),
      ),
    )
  })

  it('sends the selected pet size and weight with the request', async () => {
    await pickBusiness()
    fireEvent.click(await screen.findByText('Solicitar · RD$ 450'))

    await waitFor(() => expect(mockRequest).toHaveBeenCalled())
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'large', weight_lb: 80 }),
    )
  })

  it('sends size alone for a pet with no recorded weight', async () => {
    authMock.role = 'rescue_center'
    renderWithProviders(<TransportCreationForm onTripCreated={vi.fn()} />)
    await screen.findByRole('option', { name: 'Luna' })
    fireEvent.change(screen.getByPlaceholderText('Dirección de recogida'), { target: { value: 'Calle A' } })
    fireEvent.change(screen.getByPlaceholderText('Dirección de entrega'), { target: { value: 'Calle B' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rc-p1' } })
    fireEvent.click(screen.getByText('Elegir transportista'))
    fireEvent.click(await screen.findByText('PetGo'))

    await waitFor(() => expect(mockQuote).toHaveBeenCalled())
    const arg = mockQuote.mock.calls[0][0]
    expect(arg.size).toBe('small')
    // Undefined rather than 0: the backend 400s a weight outside 0-500 and reads
    // an absent one as "price from the size band".
    expect(arg.weight_lb).toBeUndefined()
  })
})

// A member's pet id comes from `user_pets`; a rescue center's from `pets`. The
// backend keys them separately because a user_pets id can never satisfy
// transport_trips.pet_id's foreign key.
describe('TransportCreationForm pet id key', () => {
  async function submit(petOptionName: string, petValue: string) {
    renderWithProviders(<TransportCreationForm onTripCreated={vi.fn()} />)

    await screen.findByRole('option', { name: petOptionName })
    fireEvent.change(screen.getByPlaceholderText('Dirección de recogida'), { target: { value: 'Calle A' } })
    fireEvent.change(screen.getByPlaceholderText('Dirección de entrega'), { target: { value: 'Calle B' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: petValue } })

    fireEvent.click(screen.getByText('Elegir transportista'))
    fireEvent.click(await screen.findByText('PetGo'))
    fireEvent.click(await screen.findByText('Solicitar · RD$ 450'))

    await waitFor(() => expect(mockRequest).toHaveBeenCalled())
    return mockRequest.mock.calls[0][0]
  }

  it('sends user_pet_id for a member', async () => {
    const payload = await submit('Firulais', 'p1')
    expect(payload.user_pet_id).toBe('p1')
    expect(payload).not.toHaveProperty('pet_id')
  })

  it('sends pet_id for a rescue center', async () => {
    authMock.role = 'rescue_center'
    const payload = await submit('Luna', 'rc-p1')
    expect(payload.pet_id).toBe('rc-p1')
    expect(payload).not.toHaveProperty('user_pet_id')
  })
})
