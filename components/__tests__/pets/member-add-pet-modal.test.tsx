import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/user-pets', () => ({
  createUserPets: vi.fn(),
  updateUserPet: vi.fn().mockResolvedValue({ data: { id: 'up1' }, error: null }),
  uploadUserPetPhotos: vi.fn(),
}))

import { MemberAddPetModal } from '@/components/pets/member-add-pet-modal'
import { updateUserPet, type UserPet } from '@/lib/api/user-pets'

const pet: UserPet = {
  id: 'up1',
  user_id: 'u1',
  name: 'Max',
  age: 24,
  species: 'dog',
  gender: 'male',
  size: 'medium',
  vaccinated: true,
  castrated: false,
  photos: [],
  created_at: '2026-01-01',
}

describe('MemberAddPetModal — edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefills fields from pet and saves via updateUserPet (PATCH)', async () => {
    renderWithProviders(
      <MemberAddPetModal open pet={pet} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    // Name and age (already in months) prefilled
    await waitFor(() => {
      expect(screen.getByDisplayValue('Max')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('24')).toBeInTheDocument()

    // Vaccinated/castrated are editable in edit mode (no longer greyed out)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    checkboxes.forEach((cb) => expect(cb).not.toBeDisabled())

    // Save through the edit-mode CTA
    fireEvent.click(screen.getByText('Guardar cambios'))

    await waitFor(() => {
      expect(updateUserPet).toHaveBeenCalledWith(
        'up1',
        expect.objectContaining({
          name: 'Max',
          age: 24,
          species: 'dog',
          gender: 'male',
          size: 'medium',
          vaccinated: true,
          castrated: false,
        })
      )
    })
  })
})
