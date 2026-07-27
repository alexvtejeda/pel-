import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { ServiceProviderForm } from '@/components/service-providers/service-provider-form'

vi.mock('@/lib/api/service-providers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/service-providers')>('@/lib/api/service-providers')
  return {
    ...actual,
    registerServiceProvider: vi.fn(),
    updateServiceProviderProfile: vi.fn(),
    reapplyServiceProvider: vi.fn(),
  }
})
vi.mock('@/lib/geocode', () => ({ geocodeAddress: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import {
  registerServiceProvider, updateServiceProviderProfile, ServiceProvider,
} from '@/lib/api/service-providers'
import { geocodeAddress } from '@/lib/geocode'

const mockRegister = vi.mocked(registerServiceProvider)
const mockUpdate = vi.mocked(updateServiceProviderProfile)
const mockGeocode = vi.mocked(geocodeAddress)

const ACTIVE_SP = {
  id: 'sp1', user_id: 'u1', description: 'Paseo perros', experience: '3 años',
  address: 'Calle 1', lat: 18.47, lng: -69.93, services: ['dog_walking'],
  pet_types: ['dog'], terms_accepted: true, status: 'active' as const,
  created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
} satisfies ServiceProvider

beforeEach(() => {
  vi.clearAllMocks()
  mockGeocode.mockResolvedValue({ lat: 18.47, lng: -69.93 })
})

function fillRegisterForm() {
  fireEvent.change(screen.getByLabelText('Describe tus servicios'), { target: { value: 'Paseo perros' } })
  fireEvent.change(screen.getByLabelText('Tu experiencia'), { target: { value: '3 años' } })
  fireEvent.change(screen.getByLabelText('Dirección donde ofreces el servicio'), { target: { value: 'Calle 1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Paseo de perros' }))
  fireEvent.click(screen.getByRole('button', { name: 'Perro' }))
  const file = new File(['data'], 'cedula.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByLabelText('Documento de identidad'), { target: { files: [file] } })
  fireEvent.click(screen.getByLabelText('Acepto los términos y condiciones de proveedores de Pelú'))
  return file
}

describe('ServiceProviderForm — register mode', () => {
  it('geocodes the address and submits multipart with the ID document', async () => {
    mockRegister.mockResolvedValue({ data: { ...ACTIVE_SP, status: 'pending' }, error: null })
    const onSaved = vi.fn()
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={onSaved} />)

    const file = fillRegisterForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    await waitFor(() => expect(mockRegister).toHaveBeenCalled())
    expect(mockGeocode).toHaveBeenCalledWith('Calle 1')
    expect(mockRegister).toHaveBeenCalledWith({
      description: 'Paseo perros',
      experience: '3 años',
      address: 'Calle 1',
      lat: 18.47,
      lng: -69.93,
      services: ['dog_walking'],
      pet_types: ['dog'],
      id_document: file,
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('shows an inline address error and does not submit when geocoding fails', async () => {
    mockGeocode.mockResolvedValue(null)
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    fillRegisterForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText('No encontramos esa dirección. Revísala e inténtalo de nuevo.')).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('keeps submit disabled until the ID document and terms are provided', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    const submit = screen.getByRole('button', { name: 'Enviar solicitud' })
    expect(submit).toBeDisabled()

    fillRegisterForm()
    expect(submit).not.toBeDisabled()
  })
})

describe('ServiceProviderForm — edit mode', () => {
  it('prefills from the provider and submits JSON without an ID document', async () => {
    mockUpdate.mockResolvedValue({ data: ACTIVE_SP, error: null })
    renderWithProviders(<ServiceProviderForm mode="edit" provider={ACTIVE_SP} onSaved={vi.fn()} />)

    expect(screen.getByLabelText('Describe tus servicios')).toHaveValue('Paseo perros')
    expect(screen.queryByLabelText('Documento de identidad')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({
      description: 'Paseo perros',
      experience: '3 años',
      address: 'Calle 1',
      lat: 18.47,
      lng: -69.93,
      services: ['dog_walking'],
      pet_types: ['dog'],
    }))
  })
})
