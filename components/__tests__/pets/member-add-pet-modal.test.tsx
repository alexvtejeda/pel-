import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api/user-pets', () => ({
  createUserPets: vi.fn(),
  updateUserPet: vi.fn(),
  uploadUserPetPhotos: vi.fn(),
  deleteUserPetPhoto: vi.fn(),
  listUserPets: vi.fn(),
  deleteUserPet: vi.fn(),
}))

/*
  PetsHeader is site chrome that drags in auth, websocket and the route-transition
  context. Stubbing those keeps the double-mount assertions below on the real
  header markup — the header itself is NOT mocked, because whether it mounts an
  add-pet dialog is exactly what is under test.
*/
// Hoisted so the spy survives across renders — an inline vi.fn() in the factory
// is a fresh mock on every useAuth() call and can never be asserted on.
const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'm@pelu.do', role: 'member', display_name: 'Member' },
    logout: vi.fn(),
    updateSession,
  }),
}))
vi.mock('@/lib/contexts/websocket-context', () => ({
  useWebSocket: () => ({ unreadChatCount: 0 }),
}))
vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn().mockResolvedValue({ ok: false }),
}))
vi.mock('@/components/transitions/route-transition-context', () => ({
  useRouteTransition: () => ({
    status: 'idle', type: null, logoRect: null, targetHref: null,
    navigate: vi.fn(), setLogoRect: vi.fn(),
  }),
}))
vi.mock('@/components/transitions/use-public-header-logo-rect', () => ({
  usePublicHeaderLogoRect: () => {},
}))

import { MemberAddPetModal } from '@/components/pets/member-add-pet-modal'
import { PetsHeader } from '@/components/pets/pets-header'
import MisMascotasPage from '@/app/mis-mascotas/page'
import {
  createUserPets, updateUserPet, uploadUserPetPhotos, deleteUserPetPhoto,
  listUserPets, type UserPet,
} from '@/lib/api/user-pets'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateUserPet).mockResolvedValue({ data: pet, error: null })
  vi.mocked(createUserPets).mockResolvedValue({ data: [{ ...pet, id: 'new1' }], error: null })
  vi.mocked(uploadUserPetPhotos).mockResolvedValue({ data: [], error: null })
  vi.mocked(deleteUserPetPhoto).mockResolvedValue({ data: null, error: null })
  vi.mocked(listUserPets).mockResolvedValue({ data: [], error: null })
})

/*
  The real body of PATCH /api/v1/auth/profile. The handler ends in
  `api.WriteJSON(w, 200, toUserResponse(u))` — the updated user IS the response,
  it is not wrapped in a `user` key. Earlier mocks here invented the wrapper,
  which is exactly why the `json.user` read in the component went unnoticed.
*/
const PROFILE_RESPONSE = {
  id: 'u1',
  email: 'm@pelu.do',
  role: 'member',
  auth_provider: 'email',
  preferred_lang: 'es',
  display_name: 'Member',
  photo_url: null,
  avatar_url: null,
  phone: '809-555-0134',
}

/** Fill the two fields the publish CTA is gated on. */
function fillRequired() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Luna' } })
  fireEvent.change(screen.getByLabelText('Edad'), { target: { value: '6' } })
}

describe('MemberAddPetModal — dialog semantics', () => {
  /*
    The modal used to be a hand-rolled Framer overlay: a plain div with no role,
    no focus trap and no Escape handler. These two tests pin what the Radix
    rebuild bought — anything that quietly reverts to a bare div fails here.
  */
  it('exposes a dialog named by its title and takes focus into it', () => {
    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Publicar mascota')
    // Radix hides the rest of the tree rather than setting aria-modal, so the
    // trap itself is the assertion: focus must land inside the dialog.
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    renderWithProviders(<MemberAddPetModal open onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  /*
    Every one of these resolves only if htmlFor/id (or aria-labelledby, for the
    two-button toggle groups) is genuinely wired — a visually adjacent <label>
    with no association would fail every line.
  */
  it('gives every field an accessible name from its visible label', () => {
    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)

    expect(screen.getByLabelText('Nombre')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Edad')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Tamaño').tagName).toBe('SELECT')
    expect(screen.getByLabelText('Descripción').tagName).toBe('TEXTAREA')
    expect(screen.getByLabelText('Vacunado')).toHaveAttribute('type', 'checkbox')
    expect(screen.getByLabelText('Castrado')).toHaveAttribute('type', 'checkbox')
    expect(screen.getByLabelText('Fotos')).toHaveAttribute('type', 'file')
    // Species and gender are button pairs, so the group carries the label.
    expect(screen.getByLabelText('Especie')).toHaveAttribute('role', 'group')
    expect(screen.getByLabelText('Género')).toHaveAttribute('role', 'group')
  })

  it('announces a failed save through a live region', async () => {
    vi.mocked(createUserPets).mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)

    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Publicar mascota' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Error de conexión')
  })

  it('confirms a successful publish with a toast', async () => {
    const onSaved = vi.fn()
    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} onSaved={onSaved} />)

    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Publicar mascota' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Mascota publicada'))
    expect(onSaved).toHaveBeenCalled()
  })
})

describe('MemberAddPetModal — edit mode', () => {
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
    expect(toast.success).toHaveBeenCalledWith('Mascota actualizada')
  })

  /*
    Reported by Alex: a phone set once could never be changed. The field renders
    in edit mode too, but handleSubmit's edit branch returned before ever
    reaching the profile PATCH — which lived only in the publish path — so the
    new number was silently dropped on save.
  */
  it('writes a changed phone to the profile when editing', async () => {
    vi.mocked(apiClient).mockResolvedValue({
      ok: true,
      json: async () => ({ ...PROFILE_RESPONSE, phone: '809-555-0199' }),
    } as never)

    renderWithProviders(
      <MemberAddPetModal open pet={pet} onClose={vi.fn()} onSaved={vi.fn()} />
    )
    await screen.findByDisplayValue('Max')

    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '809-555-0199' } })
    fireEvent.click(screen.getByText('Guardar cambios'))

    await waitFor(() => {
      const call = vi.mocked(apiClient).mock.calls.find(([path]) => path === '/api/v1/auth/profile')
      expect(call).toBeDefined()
      expect(JSON.parse(call![1]!.body as string)).toEqual({ phone: '809-555-0199' })
    })
    // The pet still saves; the phone write is an addition, not a replacement.
    await waitFor(() => expect(updateUserPet).toHaveBeenCalled())
    expect(vi.mocked(updateUserPet).mock.calls[0][1]).not.toHaveProperty('phone')
  })

  /*
    The other half of "the phone never changes". Even once the PATCH fires, the
    component read the new user off `json.user` — a key the endpoint does not
    send — so updateSession never ran and the context kept the old number. The
    modal prefills from that context, so reopening it showed the stale value and
    the save looked like it had been discarded.
  */
  it('refreshes the session from the profile response, which is the user itself', async () => {
    vi.mocked(apiClient).mockResolvedValue({
      ok: true,
      json: async () => ({ ...PROFILE_RESPONSE, phone: '809-555-0199' }),
    } as never)

    renderWithProviders(
      <MemberAddPetModal open pet={pet} onClose={vi.fn()} onSaved={vi.fn()} />
    )
    await screen.findByDisplayValue('Max')

    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '809-555-0199' } })
    fireEvent.click(screen.getByText('Guardar cambios'))

    await waitFor(() =>
      expect(updateSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', phone: '809-555-0199' })
      )
    )
  })

  // Same rule as publishing: an untouched field is not an edit.
  it('skips the profile write when editing without touching the phone', async () => {
    renderWithProviders(
      <MemberAddPetModal open pet={pet} onClose={vi.fn()} onSaved={vi.fn()} />
    )
    await screen.findByDisplayValue('Max')

    fireEvent.click(screen.getByText('Guardar cambios'))

    await waitFor(() => expect(updateUserPet).toHaveBeenCalled())
    expect(
      vi.mocked(apiClient).mock.calls.find(([path]) => path === '/api/v1/auth/profile')
    ).toBeUndefined()
  })

  /*
    Existing photos used to render with alt="" and no explanation of what could
    be done with them. They are now a labelled group of removable thumbnails,
    and removal is staged until save so Cancelar stays non-destructive.
  */
  describe('existing photos', () => {
    const withPhotos: UserPet = {
      ...pet,
      photos: [
        { id: 'ph1', url: 'https://cdn.pelu.do/1.jpg', position: 0 },
        { id: 'ph2', url: 'https://cdn.pelu.do/2.jpg', position: 1 },
      ],
    }

    const photoGroup = () => screen.getByRole('group', { name: 'Fotos actuales' })

    it('describes them and gives each a real alt', async () => {
      renderWithProviders(
        <MemberAddPetModal open pet={withPhotos} onClose={vi.fn()} onSaved={vi.fn()} />
      )

      await screen.findByDisplayValue('Max')

      const images = within(photoGroup()).getAllByRole('img')
      expect(images).toHaveLength(2)
      images.forEach((img) => expect(img.getAttribute('alt')).toBeTruthy())

      expect(
        screen.getByText('Las fotos que quites se eliminarán al guardar.')
      ).toBeInTheDocument()
    })

    it('deletes the removed photos on save and leaves the rest alone', async () => {
      renderWithProviders(
        <MemberAddPetModal open pet={withPhotos} onClose={vi.fn()} onSaved={vi.fn()} />
      )

      await screen.findByDisplayValue('Max')

      fireEvent.click(within(photoGroup()).getAllByRole('button', { name: 'Quitar foto' })[0])
      expect(within(photoGroup()).getAllByRole('img')).toHaveLength(1)

      fireEvent.click(screen.getByText('Guardar cambios'))

      await waitFor(() => expect(deleteUserPetPhoto).toHaveBeenCalledWith('up1', 'ph1'))
      expect(deleteUserPetPhoto).toHaveBeenCalledTimes(1)
    })
  })
})

describe('MemberAddPetModal — publishing', () => {
  /** The one call the profile write-through is supposed to make. */
  const profileCall = () =>
    vi.mocked(apiClient).mock.calls.find(([path]) => path === '/api/v1/auth/profile')

  it('publishes the pet as available', async () => {
    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)

    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Publicar mascota' }))

    await waitFor(() => expect(createUserPets).toHaveBeenCalled())
    expect(vi.mocked(createUserPets).mock.calls[0][0][0]).toMatchObject({
      name: 'Luna',
      adoption_status: 'available',
    })
  })

  /*
    §2.3: there is no member profile settings page, so this modal is the only
    place a phone can be set. It therefore belongs on the profile, not on the
    listing — one number, every pet, editable from one place.
  */
  it('saves the phone to the profile, not to the pet', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      ok: true,
      json: async () => PROFILE_RESPONSE,
    } as never)

    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)

    fillRequired()
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '809-555-0134' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar mascota' }))

    await waitFor(() => expect(profileCall()).toBeDefined())
    const [, options] = profileCall()!
    expect(options!.method).toBe('PATCH')
    expect(JSON.parse(options!.body as string)).toEqual({ phone: '809-555-0134' })

    await waitFor(() => expect(createUserPets).toHaveBeenCalled())
    expect(vi.mocked(createUserPets).mock.calls[0][0][0]).not.toHaveProperty('phone')
  })

  // A listing without a contact number is a dead end, so the pet must not go
  // live when the profile write fails.
  it('does not create the pet when the phone write fails', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Teléfono inválido' }),
    } as never)

    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)

    fillRequired()
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar mascota' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Teléfono inválido')
    expect(createUserPets).not.toHaveBeenCalled()
  })

  // An untouched field is not an edit. Re-PATCHing the same number on every
  // publish is a write the user never asked for.
  it('skips the profile write when the phone was left alone', async () => {
    renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)

    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Publicar mascota' }))

    await waitFor(() => expect(createUserPets).toHaveBeenCalled())
    expect(profileCall()).toBeUndefined()
  })

  // The modal now has public consequences and has to say so before the press.
  it('warns that the listing is public before publishing, but not when editing', async () => {
    const notice = 'Tu mascota aparecerá públicamente en Pelú con tu nombre y datos de contacto.'

    const { unmount } = renderWithProviders(<MemberAddPetModal open onClose={vi.fn()} />)
    expect(screen.getByText(notice)).toBeInTheDocument()
    unmount()

    renderWithProviders(<MemberAddPetModal open pet={pet} onClose={vi.fn()} />)
    await screen.findByDisplayValue('Max')
    expect(screen.queryByText(notice)).not.toBeInTheDocument()
  })

  // Editing must not silently re-list a pet the member already marked adopted.
  it('does not change adoption_status when editing', async () => {
    renderWithProviders(
      <MemberAddPetModal open pet={{ ...pet, adoption_status: 'adopted' }} onClose={vi.fn()} />,
    )

    await screen.findByDisplayValue('Max')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(updateUserPet).toHaveBeenCalled())
    expect(vi.mocked(updateUserPet).mock.calls[0][1]).not.toHaveProperty('adoption_status')
  })
})

describe('add-pet modal mounts exactly once', () => {
  /*
    The header used to render its own <MemberAddPetModal>, so a member on
    /mis-mascotas had two mounted copies — two sets of form state and two hidden
    file inputs. The header's action is now a link into the page that owns the
    only mount.
  */
  it('renders a single dialog on /mis-mascotas, header included', async () => {
    renderWithProviders(<MisMascotasPage />)

    // Empty state (listUserPets → []) surfaces the page's own add-pet CTA.
    fireEvent.click(await screen.findByRole('button', { name: /Añadir mascota/ }))

    const dialogs = await screen.findAllByRole('dialog')
    expect(dialogs).toHaveLength(1)
    expect(dialogs[0]).toHaveAccessibleName('Publicar mascota')
  })

  it('makes the header action navigate instead of opening its own copy', () => {
    renderWithProviders(<PetsHeader />)

    fireEvent.click(screen.getByRole('button', { name: 'Mi cuenta' }))

    // The account sheet is the only dialog the header owns.
    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(1)
    expect(dialogs[0]).toHaveAccessibleName('Mi cuenta')

    const publish = screen.getByRole('link', { name: 'Publicar mascota' })
    expect(publish).toHaveAttribute('href', '/mis-mascotas?add=1')

    fireEvent.click(publish)

    // …and following it opens no local copy of the add-pet modal.
    expect(screen.queryByRole('dialog', { name: 'Publicar mascota' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })
})
