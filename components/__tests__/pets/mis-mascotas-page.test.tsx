import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/user-pets', () => ({
  listUserPets: vi.fn(),
  deleteUserPet: vi.fn(),
}))

/*
  PetsHeader is site chrome, not the surface under test, and it pulls in the auth
  and websocket contexts. Stubbing it keeps this test on the page's three-way
  load/error/empty branch. The grid itself renders the REAL UserPetCard, so the
  success assertions below exercise production markup.
*/
vi.mock('@/components/pets/pets-header', () => ({
  PetsHeader: () => null,
}))
vi.mock('@/components/pets/member-add-pet-modal', () => ({
  MemberAddPetModal: () => null,
}))

import MisMascotasPage from '@/app/mis-mascotas/page'
import { listUserPets, type UserPet } from '@/lib/api/user-pets'

const mockList = vi.mocked(listUserPets)

const PET: UserPet = {
  id: 'p1',
  user_id: 'u1',
  name: 'Luna',
  age: 6,
  species: 'cat',
  gender: 'female',
  created_at: '2026-01-04T09:00:00Z',
}

const EMPTY_STATE = 'Aún no has añadido ninguna mascota. Añade la primera para empezar.'

beforeEach(() => vi.clearAllMocks())

describe('MisMascotasPage', () => {
  it('shows an error with retry when the fetch fails', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<MisMascotasPage />)

    expect(await screen.findByText('No pudimos cargar tus mascotas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // A failed fetch must never be dressed up as "you have no pets".
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
  })

  /*
    The retry resolves with a REAL pet, not an empty list. Asserting the empty
    state here would pass against a broken `onRetry` that only cleared the error
    flag without refetching — `pets` is already [] at that point, so a working
    and a broken retry would paint the same screen. A card that can only exist if
    the fetch re-ran, plus the call count, is the honest guard.
  */
  it('refetches and renders the pets when retry is pressed', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderWithProviders(<MisMascotasPage />)
    await screen.findByRole('button', { name: 'Reintentar' })

    mockList.mockResolvedValue({ data: [PET], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('6 meses')).toBeInTheDocument()
    expect(screen.queryByText('No pudimos cargar tus mascotas')).not.toBeInTheDocument()
    expect(mockList).toHaveBeenCalledTimes(2)
  })

  it('treats a null payload with no error as a failure, not an empty list', async () => {
    mockList.mockResolvedValue({ data: null, error: null })

    renderWithProviders(<MisMascotasPage />)

    expect(await screen.findByText('No pudimos cargar tus mascotas')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
  })

  it('invites the user to add a first pet when there are genuinely none', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<MisMascotasPage />)

    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Añadir mascota/ })).toBeInTheDocument()
    expect(screen.queryByText('No pudimos cargar tus mascotas')).not.toBeInTheDocument()
  })
})
