import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import type { Trip } from '@/lib/api/transport'

// The Leaflet map and the creation form are irrelevant to the hydration
// behaviour under test and drag in the whole leaflet/auth stack, so stub them.
vi.mock('@/components/transport/transport-map', () => ({
  default: () => <div data-testid="transport-map" />,
}))
vi.mock('@/components/transport/transport-creation-form', () => ({
  TransportCreationForm: () => <div data-testid="creation-form" />,
}))
vi.mock('@/lib/contexts/websocket-context', () => ({
  useWebSocket: () => ({ subscribe: () => () => {}, connected: true }),
}))

// test-utils registers its own vi.mock('next/navigation') and wins the hoist
// race, so anything else that needs overriding here goes through vi.spyOn.
import * as transportApi from '@/lib/api/transport'
import { TransportPage } from '@/components/transport/transport-page'

/**
 * What `GET /api/v1/transport` actually returns for a row: no `stops` key at
 * all. Typed as Trip via a cast because the TS interface declares `stops` as
 * always present — which is precisely the mismatch that produced the bug.
 */
const listRow = {
  id: 'trip-1',
  requester_id: 'user-1',
  driver_id: null,
  status: 'in_transit',
  created_at: '2026-08-02T09:00:00Z',
  updated_at: '2026-08-02T09:30:00Z',
} as unknown as Trip

/** What `GET /api/v1/transport/{id}` returns: the same trip, with stops. */
const fullTrip: Trip = {
  ...listRow,
  stops: [
    { id: '1', address: 'Calle A 1', lat: 18.48, lng: -69.93, position: 1, completed_at: '2026-08-02T10:00:00Z' },
    { id: '2', address: 'Calle B 2', lat: 18.47, lng: -69.92, position: 2, completed_at: null },
    { id: '3', address: 'Calle C 3', lat: 18.46, lng: -69.91, position: 3, completed_at: null },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('TransportPage — active trip hydration', () => {
  it('re-fetches the active trip by id so the drawer gets its stops', async () => {
    const list = vi.spyOn(transportApi, 'listTrips').mockResolvedValue({ data: [listRow], error: null })
    const get = vi.spyOn(transportApi, 'getTrip').mockResolvedValue({ data: fullTrip, error: null })

    renderWithProviders(<TransportPage />)

    await waitFor(() => expect(get).toHaveBeenCalledWith('trip-1'))
    expect(list).toHaveBeenCalledTimes(1)

    // The regression: without hydration this read "Parada 1 de 0" because the
    // list payload carries no stops at all.
    expect(await screen.findByText('Parada 2 de 3')).toBeInTheDocument()
  })

  it('falls back to the list row rather than blanking when hydration fails', async () => {
    vi.spyOn(transportApi, 'listTrips').mockResolvedValue({ data: [listRow], error: null })
    vi.spyOn(transportApi, 'getTrip').mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<TransportPage />)

    // Still shows the trip (status badge from the list row), just without stops.
    expect(await screen.findByText('En camino')).toBeInTheDocument()
    expect(screen.queryByTestId('creation-form')).toBeNull()
  })

  it('picks the most recently updated non-terminal trip to hydrate', async () => {
    const older = { ...listRow, id: 'trip-old', updated_at: '2026-08-01T09:00:00Z' }
    const done = { ...listRow, id: 'trip-done', status: 'completed', updated_at: '2026-08-03T09:00:00Z' }
    vi.spyOn(transportApi, 'listTrips').mockResolvedValue({
      data: [older, done, listRow] as unknown as Trip[],
      error: null,
    })
    const get = vi.spyOn(transportApi, 'getTrip').mockResolvedValue({ data: fullTrip, error: null })

    renderWithProviders(<TransportPage />)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    expect(get).toHaveBeenCalledWith('trip-1')
  })

  it('does not hydrate when there is no active trip', async () => {
    vi.spyOn(transportApi, 'listTrips').mockResolvedValue({ data: [], error: null })
    const get = vi.spyOn(transportApi, 'getTrip').mockResolvedValue({ data: fullTrip, error: null })

    renderWithProviders(<TransportPage />)

    expect(await screen.findByTestId('creation-form')).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })

  it('uses getTrip directly when a tripId is supplied, without listing', async () => {
    const list = vi.spyOn(transportApi, 'listTrips')
    const get = vi.spyOn(transportApi, 'getTrip').mockResolvedValue({ data: fullTrip, error: null })

    renderWithProviders(<TransportPage tripId="trip-1" />)

    await waitFor(() => expect(get).toHaveBeenCalledWith('trip-1'))
    expect(list).not.toHaveBeenCalled()
  })
})
