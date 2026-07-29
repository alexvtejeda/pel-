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

/*
  The dropzone's real <input type=file> is `hidden` and named by the same
  <label> that also names the zone <button>, so there is no unambiguous
  accessible query for it. Its id is the handle, the same convention
  components/__tests__/forms/form-renderer.test.tsx uses.
*/
function attachIdDocument(name = 'cedula.jpg') {
  const input = document.getElementById('sp-id-document') as HTMLInputElement | null
  if (!input) throw new Error('no ID-document file input rendered')
  const file = new File(['data'], name, { type: 'image/jpeg' })
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

const submitButton = (name: string | RegExp) => screen.getByRole('button', { name })

/** True when the checklist has struck this requirement through as done. */
function requirementMet(label: string) {
  return screen.getByText(label).className.includes('line-through')
}

const CHECKLIST_TITLE = 'Para enviar tu solicitud necesitas:'

function fillTextFields() {
  fireEvent.change(screen.getByLabelText('Describe tus servicios'), { target: { value: 'Paseo perros' } })
  fireEvent.change(screen.getByLabelText('Tu experiencia'), { target: { value: '3 años' } })
  fireEvent.change(screen.getByLabelText('Dirección donde ofreces el servicio'), { target: { value: 'Calle 1' } })
}

function fillRegisterForm() {
  fillTextFields()
  fireEvent.click(screen.getByRole('button', { name: 'Paseo de perros' }))
  fireEvent.click(screen.getByRole('button', { name: 'Perro' }))
  // Selecting a chip must also flip what it announces, not just how it looks.
  expect(screen.getByRole('button', { name: 'Paseo de perros' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Perro' })).toHaveAttribute('aria-pressed', 'true')
  const file = attachIdDocument()
  fireEvent.click(screen.getByLabelText('Acepto los términos y condiciones de proveedores de Pelú'))
  return file
}

describe('ServiceProviderForm — register mode', () => {
  it('geocodes the address and submits multipart with the ID document', async () => {
    mockRegister.mockResolvedValue({ data: { ...ACTIVE_SP, status: 'pending' }, error: null })
    const onSaved = vi.fn()
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={onSaved} />)

    const file = fillRegisterForm()
    fireEvent.click(submitButton('Enviar solicitud'))

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
    fireEvent.click(submitButton('Enviar solicitud'))

    expect(await screen.findByText('No encontramos esa dirección. Revísala e inténtalo de nuevo.')).toBeInTheDocument()
    expect(screen.getByLabelText('Dirección donde ofreces el servicio')).toHaveAttribute('aria-invalid', 'true')
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('keeps submit disabled until the ID document and terms are provided', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    const submit = submitButton('Enviar solicitud')
    expect(submit).toBeDisabled()

    fillRegisterForm()
    expect(submit).not.toBeDisabled()
  })
})

describe('ServiceProviderForm — requirements checklist', () => {
  it('lists every unmet requirement on an untouched register form', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    expect(screen.getByText(CHECKLIST_TITLE)).toBeInTheDocument()
    for (const label of [
      'Describir tus servicios',
      'Contar tu experiencia',
      'Indicar tu dirección',
      'Elegir al menos un servicio',
      'Elegir al menos un tipo de mascota',
      'Adjuntar tu documento de identidad',
      'Aceptar los términos y condiciones',
    ]) {
      expect(requirementMet(label)).toBe(false)
    }
  })

  it('strikes requirements through as they are satisfied, leaving the rest', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    fillTextFields()

    // Second distinct unmet state: the three text fields are done, the rest are not.
    expect(requirementMet('Describir tus servicios')).toBe(true)
    expect(requirementMet('Contar tu experiencia')).toBe(true)
    expect(requirementMet('Indicar tu dirección')).toBe(true)
    expect(requirementMet('Elegir al menos un servicio')).toBe(false)
    expect(requirementMet('Adjuntar tu documento de identidad')).toBe(false)
    expect(submitButton('Enviar solicitud')).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Paseo de perros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Perro' }))

    // Third state: the chips are done too, only verification is outstanding.
    expect(requirementMet('Elegir al menos un servicio')).toBe(true)
    expect(requirementMet('Elegir al menos un tipo de mascota')).toBe(true)
    expect(requirementMet('Adjuntar tu documento de identidad')).toBe(false)
    expect(requirementMet('Aceptar los términos y condiciones')).toBe(false)
    expect(screen.getByText(CHECKLIST_TITLE)).toBeInTheDocument()
  })

  it('disappears exactly when submit becomes enabled', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)
    const submit = submitButton('Enviar solicitud')

    expect(screen.getByText(CHECKLIST_TITLE)).toBeInTheDocument()
    expect(submit).toBeDisabled()

    fillRegisterForm()

    // A checklist that says "all done" while the button stays dead — or the
    // reverse — is worse than no checklist, so pin both halves together.
    expect(screen.queryByText(CHECKLIST_TITLE)).not.toBeInTheDocument()
    expect(submit).not.toBeDisabled()
  })

  it('re-lists the document requirement and re-disables submit when the file is removed', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    fillRegisterForm()
    expect(submitButton('Enviar solicitud')).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo' }))

    expect(screen.getByText(CHECKLIST_TITLE)).toBeInTheDocument()
    expect(requirementMet('Adjuntar tu documento de identidad')).toBe(false)
    expect(submitButton('Enviar solicitud')).toBeDisabled()
  })

  it('drops the terms requirement in reapply mode but keeps the document one', () => {
    renderWithProviders(
      <ServiceProviderForm mode="reapply" provider={{ ...ACTIVE_SP, status: 'rejected' }} onSaved={vi.fn()} />
    )

    expect(screen.getByText('Adjuntar tu documento de identidad')).toBeInTheDocument()
    expect(screen.queryByText('Aceptar los términos y condiciones')).not.toBeInTheDocument()
    expect(submitButton('Reenviar solicitud')).toBeDisabled()

    attachIdDocument()

    expect(screen.queryByText(CHECKLIST_TITLE)).not.toBeInTheDocument()
    expect(submitButton('Reenviar solicitud')).not.toBeDisabled()
  })
})

describe('ServiceProviderForm — ID document dropzone', () => {
  it('is a focusable button that keeps its label on the real file input', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    const named = screen.getAllByLabelText('Documento de identidad')
    const input = named.find((el) => el.tagName === 'INPUT') as HTMLInputElement | undefined
    const zone = named.find((el) => el.tagName === 'BUTTON')

    expect(input?.type).toBe('file')
    expect(zone).toBeInTheDocument()
  })

  it('shows the selected filename and lets it be cleared', () => {
    renderWithProviders(<ServiceProviderForm mode="register" onSaved={vi.fn()} />)

    expect(screen.queryByText('cedula.jpg')).not.toBeInTheDocument()
    attachIdDocument('cedula.jpg')
    expect(screen.getByText('cedula.jpg')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo' }))
    expect(screen.queryByText('cedula.jpg')).not.toBeInTheDocument()
  })
})

describe('ServiceProviderForm — edit mode', () => {
  it('prefills from the provider and submits JSON without an ID document', async () => {
    mockUpdate.mockResolvedValue({ data: ACTIVE_SP, error: null })
    renderWithProviders(<ServiceProviderForm mode="edit" provider={ACTIVE_SP} onSaved={vi.fn()} />)

    expect(screen.getByLabelText('Describe tus servicios')).toHaveValue('Paseo perros')
    expect(screen.queryByLabelText('Documento de identidad')).not.toBeInTheDocument()
    // Every requirement is prefilled, so there is nothing to nag about.
    expect(screen.queryByText(CHECKLIST_TITLE)).not.toBeInTheDocument()
    expect(submitButton('Guardar cambios')).not.toBeDisabled()

    fireEvent.click(submitButton('Guardar cambios'))

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

  it('re-opens the checklist when a prefilled field is emptied', () => {
    renderWithProviders(<ServiceProviderForm mode="edit" provider={ACTIVE_SP} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Describe tus servicios'), { target: { value: '' } })

    expect(screen.getByText(CHECKLIST_TITLE)).toBeInTheDocument()
    expect(requirementMet('Describir tus servicios')).toBe(false)
    expect(requirementMet('Contar tu experiencia')).toBe(true)
    expect(submitButton('Guardar cambios')).toBeDisabled()
  })
})
