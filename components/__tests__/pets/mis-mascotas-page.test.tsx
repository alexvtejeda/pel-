import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/user-pets', () => ({
  listUserPets: vi.fn(),
  deleteUserPet: vi.fn(),
  updateUserPet: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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

import MisMascotasPage from '@/app/[lang]/mis-mascotas/page'
import { listUserPets, updateUserPet, type UserPet } from '@/lib/api/user-pets'
import { toast } from 'sonner'

const mockList = vi.mocked(listUserPets)
const mockUpdate = vi.mocked(updateUserPet)

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
  /*
    The loading branch used to be a single centred spinner, which told the user
    nothing about the shape of what was coming and made the grid pop in. These
    two tests pin the skeleton grid: that it is what renders while in flight, and
    that its geometry is the real grid's, so nothing jumps when the pets land.
  */
  describe('loading branch', () => {
    const pending = () => {
      let settle!: (v: { data: UserPet[] | null; error: string | null }) => void
      mockList.mockReturnValue(new Promise((resolve) => { settle = resolve }))
      return (value: { data: UserPet[] | null; error: string | null }) => settle(value)
    }

    it('renders skeleton cards instead of a spinner', () => {
      pending()

      const { container } = renderWithProviders(<MisMascotasPage />)

      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(8)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('lays the skeletons out on the same grid as the real cards', async () => {
      const settle = pending()
      const { container } = renderWithProviders(<MisMascotasPage />)

      const gridClasses = () => container.querySelector('main > div.grid')?.className
      const whileLoading = gridClasses()
      expect(whileLoading).toBeDefined()

      settle({ data: [PET], error: null })
      await screen.findByText('Luna')

      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0)
      expect(gridClasses()).toBe(whileLoading)
    })
  })

  it('shows an error with retry when the fetch fails', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<MisMascotasPage />)

    expect(await screen.findByText('No pudimos cargar tus mascotas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // A failed fetch must never be dressed up as "you have no pets".
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
  })

  /*
    The add-pet button is gated on pets.length > 0, so the error branch would
    otherwise leave the user with Reintentar and nothing else. A failed GET does
    not imply a failed POST — the two calls are independent. This button lives in
    the page body, not in the stubbed PetsHeader, so the assertion is real.
  */
  it('keeps the add-pet button reachable in the error state', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<MisMascotasPage />)
    await screen.findByText('No pudimos cargar tus mascotas')

    expect(screen.getByRole('button', { name: /Añadir mascota/ })).toBeInTheDocument()
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

/*
  `adoption_status` is what separates a pet the member merely keeps on file from
  one that is publicly listed for adoption. The onboarding wizard and the
  transport picker both write rows with no status at all, so "absent" has to
  read as private — never as a listing waiting to be retired.
*/
describe('MisMascotas listing management', () => {
  const listed: UserPet = { ...PET, id: 'p1', name: 'Luna', adoption_status: 'available' }
  const priv: UserPet = { ...PET, id: 'p2', name: 'Rex', gender: 'male' }

  it('marks published pets and offers to retire them', async () => {
    mockList.mockResolvedValue({ data: [listed], error: null })

    renderWithProviders(<MisMascotasPage />)

    expect(await screen.findByText('En adopción')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar como adoptada' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar en adopción' })).toBeNull()
  })

  it('offers to publish a private pet', async () => {
    mockList.mockResolvedValue({ data: [priv], error: null })

    renderWithProviders(<MisMascotasPage />)

    await screen.findByText('Rex')
    expect(screen.queryByText('En adopción')).toBeNull()
    expect(screen.getByRole('button', { name: 'Publicar en adopción' })).toBeInTheDocument()
  })

  it('labels an adopted pet and lets it be re-listed', async () => {
    mockList.mockResolvedValue({ data: [{ ...listed, adoption_status: 'adopted' }], error: null })

    renderWithProviders(<MisMascotasPage />)

    expect(await screen.findByText('Adoptada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar en adopción' })).toBeInTheDocument()
  })

  it('retires a listing via PATCH', async () => {
    mockList.mockResolvedValue({ data: [listed], error: null })
    mockUpdate.mockResolvedValue({ data: listed, error: null })

    renderWithProviders(<MisMascotasPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar como adoptada' }))

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('p1', { adoption_status: 'adopted' }))
    // Optimistic: the chip must flip without waiting for a refetch.
    expect(await screen.findByText('Adoptada')).toBeInTheDocument()
  })

  it('publishes a private pet via PATCH', async () => {
    mockList.mockResolvedValue({ data: [priv], error: null })
    mockUpdate.mockResolvedValue({ data: priv, error: null })

    renderWithProviders(<MisMascotasPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar en adopción' }))

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('p2', { adoption_status: 'available' }))
    expect(await screen.findByText('En adopción')).toBeInTheDocument()
  })

  /*
    The rollback matters more than the optimistic flip: a chip that says
    "Adoptada" after a failed PATCH tells the member their pet is off the public
    grid when it is still on it.
  */
  it('rolls the chip back when the PATCH fails', async () => {
    mockList.mockResolvedValue({ data: [listed], error: null })
    mockUpdate.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<MisMascotasPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar como adoptada' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No pudimos actualizar el estado'))
    expect(screen.getByText('En adopción')).toBeInTheDocument()
    expect(screen.queryByText('Adoptada')).toBeNull()
  })
})
