import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { RescueCentersTab } from '@/components/dashboard/admin/rescue-centers-tab'

vi.mock('@/lib/api/admin', () => ({
  listAllRescueCenters: vi.fn(),
  listAllBusinesses: vi.fn(),
  listServiceProviders: vi.fn(),
  getServiceProviderIdDocument: vi.fn(),
  approveServiceProvider: vi.fn(),
  rejectServiceProvider: vi.fn(),
  approveRescueCenter: vi.fn(),
  rejectRescueCenter: vi.fn(),
  approveBusiness: vi.fn(),
  rejectBusiness: vi.fn(),
  deleteRescueCenter: vi.fn(),
}))

import * as adminApi from '@/lib/api/admin'

const SP = {
  id: 'sp1', user_id: 'u1', description: 'Paseo perros', experience: '3 años',
  address: 'Calle 1', lat: 18.47, lng: -69.93, services: ['dog_walking'],
  pet_types: ['dog'], terms_accepted: true, status: 'pending' as const,
  created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
  applicant_name: 'Ana Pérez', applicant_email: 'ana@mail.com',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminApi.listAllRescueCenters).mockResolvedValue({ data: [], error: null })
  vi.mocked(adminApi.listAllBusinesses).mockResolvedValue({ data: [], error: null })
  vi.mocked(adminApi.listServiceProviders).mockResolvedValue({ data: [SP], error: null })
})

describe('RescueCentersTab — service providers', () => {
  it('requests every status and labels the row with the applicant name', async () => {
    renderWithProviders(<RescueCentersTab />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(adminApi.listServiceProviders).toHaveBeenCalledWith('all')
    expect(screen.getByText('Proveedor de Servicios')).toBeInTheDocument()
    // Services render as the row subtitle
    expect(screen.getByText('Paseo de perros')).toBeInTheDocument()
  })

  it('falls back to the applicant email when no display name is set', async () => {
    vi.mocked(adminApi.listServiceProviders).mockResolvedValue({
      data: [{ ...SP, applicant_name: '' }], error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    // The email appears twice (row heading fallback + the email line), so query the heading.
    expect(await screen.findByRole('heading', { name: 'ana@mail.com' })).toBeInTheDocument()
  })

  it('opens the presigned ID document in a new tab', async () => {
    vi.mocked(adminApi.getServiceProviderIdDocument).mockResolvedValue({
      data: { url: 'https://s3/presigned' }, error: null,
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)

    renderWithProviders(<RescueCentersTab />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ver documento de identidad' }))

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://s3/presigned', '_blank'))
    expect(adminApi.getServiceProviderIdDocument).toHaveBeenCalledWith('sp1')
  })

  it('hides the ID-document button once the application is reviewed', async () => {
    // approveSP/rejectSP NULL out id_document_url, so the endpoint 404s for these.
    vi.mocked(adminApi.listServiceProviders).mockResolvedValue({
      data: [{ ...SP, status: 'active' }], error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver documento de identidad' })).not.toBeInTheDocument()
  })

  it('approves via the service-provider endpoint', async () => {
    vi.mocked(adminApi.approveServiceProvider).mockResolvedValue({
      data: { ...SP, status: 'active' }, error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(adminApi.approveServiceProvider).toHaveBeenCalledWith('sp1'))
    expect(adminApi.approveBusiness).not.toHaveBeenCalled()
  })

  it('rejects with a reason via the service-provider endpoint', async () => {
    vi.mocked(adminApi.rejectServiceProvider).mockResolvedValue({
      data: { ...SP, status: 'rejected' }, error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    fireEvent.change(screen.getByPlaceholderText('Razón del rechazo...'), {
      target: { value: 'Documento ilegible' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(adminApi.rejectServiceProvider).toHaveBeenCalledWith('sp1', 'Documento ilegible')
    )
  })

  it('keeps the applicant heading after approval, though the review response omits it', async () => {
    // The real /review response omits applicant_name/applicant_email (omitempty on a nil *string).
    const { applicant_name: _n, applicant_email: _e, ...reviewResponse } = SP
    vi.mocked(adminApi.approveServiceProvider).mockResolvedValue({
      data: { ...reviewResponse, status: 'active' }, error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(adminApi.approveServiceProvider).toHaveBeenCalledWith('sp1'))
    // Must still show the name, not the bare user_id.
    expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'u1' })).not.toBeInTheDocument()
  })

  it('keeps the applicant heading after rejection', async () => {
    const { applicant_name: _n, applicant_email: _e, ...reviewResponse } = SP
    vi.mocked(adminApi.rejectServiceProvider).mockResolvedValue({
      data: { ...reviewResponse, status: 'rejected', rejection_reason: 'Documento ilegible' }, error: null,
    })
    renderWithProviders(<RescueCentersTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    fireEvent.change(screen.getByPlaceholderText('Razón del rechazo...'), {
      target: { value: 'Documento ilegible' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(adminApi.rejectServiceProvider).toHaveBeenCalledWith('sp1', 'Documento ilegible')
    )
    expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument()
  })
})
