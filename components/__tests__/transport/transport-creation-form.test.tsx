import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { TransportCreationForm } from '@/components/transport/transport-creation-form'

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'member' } }),
}))

vi.mock('@/lib/api/user-pets', () => ({
  listUserPets: vi.fn().mockResolvedValue({ data: [{ id: 'p1', name: 'Firulais' }], error: null }),
}))
vi.mock('@/lib/api/pets', () => ({ listPets: vi.fn() }))
vi.mock('@/lib/api/rescue-centers', () => ({ getMyRescueCenter: vi.fn() }))

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
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve([{ lat: '18.5', lon: '-69.9' }]),
  }) as unknown as typeof fetch
  mockList.mockResolvedValue({ data: { items: [
    { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2,
      quote: { distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: false } },
  ], next_cursor: '' }, error: null })
  mockQuote.mockResolvedValue({ data: { business_id: 'b1', distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: false, routing_source: 'ors', currency: 'DOP' }, error: null })
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
