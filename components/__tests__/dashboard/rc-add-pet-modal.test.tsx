import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'

vi.mock('@/lib/api/pets', () => ({
  listPets: vi.fn(),
  createPet: vi.fn(),
  updatePet: vi.fn(),
  deletePet: vi.fn(),
  uploadPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  reorderPhotos: vi.fn(),
}))
vi.mock('@/lib/api/submissions', () => ({
  listSubmissions: vi.fn(),
}))
vi.mock('@/lib/api/rescue-centers', () => ({
  getMyRescueCenter: vi.fn(),
}))

import { AddPetModal } from '@/components/dashboard/rescue-center/add-pet-modal'
import { PetsTab } from '@/components/dashboard/rescue-center/pets-tab'
import { createPet, listPets } from '@/lib/api/pets'
import { listSubmissions } from '@/lib/api/submissions'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'

const weightInput = () => screen.getByLabelText('Peso (lb)')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMyRescueCenter).mockResolvedValue({ data: { id: 'rc1' }, error: null } as never)
  vi.mocked(listPets).mockResolvedValue([])
  vi.mocked(listSubmissions).mockResolvedValue({ data: [], error: null } as never)
  vi.mocked(createPet).mockResolvedValue({ id: 'p1', photos: [] } as never)
})

/** Fill the two fields the confirm CTA is gated on (name + a valid age). */
function fillRequired() {
  fireEvent.change(screen.getByPlaceholderText('ej. Luna'), { target: { value: 'Luna' } })
  fireEvent.change(screen.getByPlaceholderText('ej. 6'), { target: { value: '6' } })
}

const saveButton = () => screen.getByRole('button', { name: 'Guardar mascota' })

describe('AddPetModal (rescue centre) — optional weight', () => {
  it('submits an optional weight in pounds', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<AddPetModal open onConfirm={onConfirm} onClose={vi.fn()} />)

    fillRequired()
    fireEvent.change(weightInput(), { target: { value: '40' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ weight_lb: 40 }))
  })

  it('omits weight entirely when left blank', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<AddPetModal open onConfirm={onConfirm} onClose={vi.fn()} />)

    fillRequired()
    fireEvent.click(saveButton())

    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    // Absent, not 0 — an RC that does not know the weight prices from size.
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('weight_lb')
  })

  it('keeps the input inside the 0-500 range the backend enforces', () => {
    renderWithProviders(<AddPetModal open onConfirm={vi.fn()} onClose={vi.fn()} />)

    expect(weightInput()).toHaveAttribute('min', '0')
    expect(weightInput()).toHaveAttribute('max', '500')
  })
})

/*
  The modal only hands its payload to a callback — `pets-tab` is what actually
  calls createPet. Collecting the weight and then dropping it on the way to the
  API would satisfy the modal tests above and still ship a pet with no weight,
  so the hand-off gets its own test.
*/
describe('PetsTab — forwards the weight to createPet', () => {
  it('passes weight_lb through to the API', async () => {
    renderWithProviders(<PetsTab />)

    fireEvent.click(await screen.findByRole('button', { name: /Agregar mascota/ }))

    fillRequired()
    fireEvent.change(weightInput(), { target: { value: '80' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(createPet).toHaveBeenCalled())
    expect(createPet).toHaveBeenCalledWith(expect.objectContaining({ weight_lb: 80 }))
  })

  it('omits weight_lb from the API call when the field was left blank', async () => {
    renderWithProviders(<PetsTab />)

    fireEvent.click(await screen.findByRole('button', { name: /Agregar mascota/ }))

    fillRequired()
    fireEvent.click(saveButton())

    await waitFor(() => expect(createPet).toHaveBeenCalled())
    expect(vi.mocked(createPet).mock.calls[0][0]).not.toHaveProperty('weight_lb')
  })
})
