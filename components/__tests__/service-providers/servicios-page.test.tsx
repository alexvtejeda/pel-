import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import ServiciosPage from '@/app/servicios/page'

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
  it('shows the intro and register form when not registered (404)', async () => {
    mockGetMine.mockResolvedValue({ data: null, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('register')
    expect(screen.getByText(/Regístrate como proveedor/)).toBeInTheDocument()
  })

  it('shows a read-only status card when pending', async () => {
    mockGetMine.mockResolvedValue({ data: { ...BASE, status: 'pending' }, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByText('Solicitud en revisión')).toBeInTheDocument()
    expect(screen.queryByTestId('sp-form')).not.toBeInTheDocument()
  })

  it('shows the form in edit mode when active', async () => {
    mockGetMine.mockResolvedValue({ data: { ...BASE, status: 'active' }, error: null })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('edit')
    expect(screen.getByText('Tu perfil de proveedor')).toBeInTheDocument()
  })

  it('shows the rejection reason and the reapply form when rejected', async () => {
    mockGetMine.mockResolvedValue({
      data: { ...BASE, status: 'rejected', rejection_reason: 'Documento ilegible' }, error: null,
    })
    renderWithProviders(<ServiciosPage />)

    expect(await screen.findByTestId('sp-form')).toHaveTextContent('reapply')
    expect(screen.getByText('Documento ilegible')).toBeInTheDocument()
  })
})
