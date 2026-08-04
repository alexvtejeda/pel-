import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import ServiciosPage from '@/app/[lang]/servicios/page'

vi.mock('@/lib/api/service-providers', () => ({
  getMyServiceProvider: vi.fn(),
}))
vi.mock('@/components/pets/pets-header', () => ({
  PetsHeader: () => <div data-testid="pets-header" />,
}))
vi.mock('@/components/service-providers/service-provider-form', () => ({
  ServiceProviderForm: ({ mode }: { mode: string }) => <div data-testid="sp-form">{mode}</div>,
}))

import { getMyServiceProvider } from '@/lib/api/service-providers'
const mockGetMine = vi.mocked(getMyServiceProvider)

const BASE = {
  id: 'sp1', user_id: 'u1', description: 'd', experience: 'e', address: 'a',
  lat: 18, lng: -69, services: ['grooming'], pet_types: ['cat'],
  terms_accepted: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ServiciosPage', () => {
  it('shows a skeleton, not an error or a form, while the profile is loading', () => {
    mockGetMine.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ServiciosPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('sp-form')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the intro and register form when not registered (404)', async () => {
    mockGetMine.mockResolvedValue({ data: null, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('register')
    expect(screen.getByText(/Regístrate como proveedor/)).toBeInTheDocument()
    // A missing profile is the happy path for a first-time visitor, not a failure.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a retryable error state when the fetch fails', async () => {
    mockGetMine.mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderWithProviders(<ServiciosPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tu perfil de servicios')
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
    expect(screen.queryByTestId('sp-form')).not.toBeInTheDocument()
  })

  it('clears the error and renders the next state when the retry succeeds', async () => {
    mockGetMine.mockResolvedValueOnce({ data: null, error: 'Error de conexión' })
    renderWithProviders(<ServiciosPage />)

    await screen.findByRole('alert')

    // A retry resolving into the same branch would pass against a latched
    // error, so the second call returns a different state *and* is asserted on.
    mockGetMine.mockResolvedValueOnce({ data: { ...BASE, status: 'pending' }, error: null })
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))

    expect(await screen.findByText('Solicitud en revisión')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(mockGetMine).toHaveBeenCalledTimes(2))
  })

  it('shows a read-only status card with the next step when pending', async () => {
    mockGetMine.mockResolvedValue({ data: { ...BASE, status: 'pending' }, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByText('Solicitud en revisión')).toBeInTheDocument()
    expect(screen.getByText(/1–2 días hábiles/)).toBeInTheDocument()
    expect(screen.queryByTestId('sp-form')).not.toBeInTheDocument()
  })

  it('shows the form in edit mode when active', async () => {
    mockGetMine.mockResolvedValue({ data: { ...BASE, status: 'active' }, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('edit')
    expect(screen.getByText('Tu perfil de proveedor')).toBeInTheDocument()
    expect(screen.queryByText('Solicitud rechazada')).not.toBeInTheDocument()
  })

  it('shows the rejection reason and the reapply form when rejected', async () => {
    mockGetMine.mockResolvedValue({
      data: { ...BASE, status: 'rejected', rejection_reason: 'Documento ilegible' }, error: null,
    })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('reapply')
    expect(screen.getByText('Solicitud rechazada')).toBeInTheDocument()
    expect(screen.getByText('Documento ilegible')).toBeInTheDocument()
  })

  it('omits the reason box entirely when a rejection carries no reason', async () => {
    mockGetMine.mockResolvedValue({ data: { ...BASE, status: 'rejected' }, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByText('Solicitud rechazada')).toBeInTheDocument()
    // No empty "Motivo:" box when the admin rejected without typing one.
    expect(screen.queryByText(/Motivo:/)).not.toBeInTheDocument()
  })
})
