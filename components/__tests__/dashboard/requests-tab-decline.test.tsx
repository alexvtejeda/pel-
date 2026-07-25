import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { RequestsTab } from '@/components/dashboard/business/requests-tab'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from 'sonner'
vi.mock('@/lib/api/transport', () => ({
  listTrips: vi.fn(),
  acceptTrip: vi.fn(),
  cancelTrip: vi.fn(),
  declineTrip: vi.fn(),
  updateTripStatus: vi.fn(),
}))
import { listTrips, cancelTrip, declineTrip } from '@/lib/api/transport'
const mockList = vi.mocked(listTrips)
const mockCancel = vi.mocked(cancelTrip)
const mockDecline = vi.mocked(declineTrip)

function tripFixture(overrides: Record<string, unknown>) {
  return {
    id: 't1', requester_id: 'u1', driver_id: null, pet_id: 'p1', status: 'requested',
    stops: [
      { id: 's1', address: 'Calle A', lat: 18.5, lng: -69.9, position: 0, completed_at: null },
      { id: 's2', address: 'Calle B', lat: 18.6, lng: -69.8, position: 1, completed_at: null },
    ],
    created_at: '2026-07-25T00:00:00Z', updated_at: '2026-07-25T00:00:00Z', ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('RequestsTab reject routing', () => {
  it('marketplace trip → declineTrip', async () => {
    mockList.mockResolvedValue({ data: [tripFixture({ business_id: 'b1' })] as never, error: null })
    mockDecline.mockResolvedValue({ data: tripFixture({ business_id: 'b1', status: 'cancelled' }) as never, error: null })

    renderWithProviders(<RequestsTab />)
    fireEvent.click(await screen.findByText('Calle A'))
    fireEvent.click(await screen.findByText('Rechazar'))

    await waitFor(() => expect(mockDecline).toHaveBeenCalledWith('t1'))
    expect(mockCancel).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Solicitud rechazada')
  })

  it('broadcast trip (no business_id) → cancelTrip', async () => {
    mockList.mockResolvedValue({ data: [tripFixture({})] as never, error: null })
    mockCancel.mockResolvedValue({ data: tripFixture({ status: 'cancelled' }) as never, error: null })

    renderWithProviders(<RequestsTab />)
    fireEvent.click(await screen.findByText('Calle A'))
    fireEvent.click(await screen.findByText('Rechazar'))

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('t1'))
    expect(mockDecline).not.toHaveBeenCalled()
  })
})
