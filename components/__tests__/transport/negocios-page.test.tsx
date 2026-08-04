import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import NegociosPage from '@/app/[lang]/transporte/negocios/page'

vi.mock('@/lib/api/transport', () => ({ listTransportBusinesses: vi.fn() }))
import { listTransportBusinesses } from '@/lib/api/transport'
const mockList = vi.mocked(listTransportBusinesses)

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
})

describe('NegociosPage geolocation', () => {
  it('shows the retry prompt when geolocation is denied', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => err({} as GeolocationPositionError) },
    })

    renderWithProviders(<NegociosPage />)

    expect(await screen.findByText('Reintentar')).toBeInTheDocument()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('lists businesses in "your area" mode when geolocation is granted', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 18.5, longitude: -69.9 } } as GeolocationPosition) },
    })
    mockList.mockResolvedValue({ data: { items: [
      { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2 },
    ], next_cursor: '' }, error: null })

    renderWithProviders(<NegociosPage />)

    expect(await screen.findByText('PetGo')).toBeInTheDocument()
    expect(mockList).toHaveBeenCalledWith({ lat: 18.5, lng: -69.9, cursor: undefined })
  })

  it('shows an error (not the empty state) when the API fails', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 18.5, longitude: -69.9 } } as GeolocationPosition) },
    })
    mockList.mockResolvedValue({ data: null, error: 'Error al cargar transportistas' })

    renderWithProviders(<NegociosPage />)

    expect(await screen.findByText('Error al cargar transportistas')).toBeInTheDocument()
    expect(screen.queryByText('No hay transportistas en tu zona por ahora')).toBeNull()
  })
})
