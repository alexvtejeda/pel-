import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

import { renderWithProviders } from '../test-utils'
import { PetDetail } from '@/components/pets/pet-detail'

const pet = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    rescue_center_id: 'rc1',
    name: 'Abril',
    description: 'Muy cariñosa',
    age: 24,
    gender: 'female',
    species: 'dog',
    status: 'available',
    short_slug: '',
    photos: [],
    conditions: [],
    condition_notes: null,
    vaccinated: true,
    castrated: true,
    size: 'medium',
    ...overrides,
  }) as never

describe('PetDetail layout', () => {
  // The rule used to separate the pet from its centre. The centre now lives in
  // a bordered card, which does that job without a second horizontal line.
  it('has no horizontal rule', () => {
    const { container } = renderWithProviders(
      <PetDetail pet={pet({ rescue_center: { id: 'rc1', name: 'Adoptame RD' } })} />,
    )

    expect(container.querySelector('hr')).toBeNull()
  })

  // With `flex-1` the info column stretched to fill the panel and left ~330px
  // of void above the Adoptar button at a 1010px viewport.
  it('does not stretch the info column to fill the panel', () => {
    renderWithProviders(<PetDetail pet={pet()} />)

    // h2 → the title+chips group → the scrolling info column.
    const column = screen.getByRole('heading', { name: 'Abril' }).parentElement!.parentElement!
    expect(column.className).toContain('overflow-y-auto')
    expect(column.className).not.toContain('flex-1')
  })
})

describe('PetDetail facts', () => {
  // The two booleans deliberately disagree here and invert in the next case:
  // if the rows were ever cross-wired, matching values would hide it.
  it('lists the facts the payload already carries', () => {
    renderWithProviders(<PetDetail pet={pet({ vaccinated: true, castrated: false, size: 'medium' })} />)

    expect(screen.getByText('Vacunas')).toBeInTheDocument()
    expect(screen.getByText('Al día')).toBeInTheDocument()
    expect(screen.getByText('Castración')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Tamaño')).toBeInTheDocument()
    expect(screen.getByText('Mediano')).toBeInTheDocument()
  })

  // Nouns as subjects on purpose: `Vacunado`/`Castrado` are masculine and much
  // of the catalogue is female (Abril, Alma, Cangura…). The label carries the
  // noun so the value never has to agree with the pet's gender.
  it('reads each fact off its own field, ungendered', () => {
    renderWithProviders(<PetDetail pet={pet({ vaccinated: false, castrated: true, size: 'small' })} />)

    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.getByText('Pequeño')).toBeInTheDocument()
    expect(screen.queryByText('Vacunado')).toBeNull()
    expect(screen.queryByText('Castrado')).toBeNull()
  })

  // Member-published pets come from `user_pets`, whose `size` column is
  // nullable — the row must disappear rather than print `size.undefined`.
  it('drops the size row when the pet has no size', () => {
    renderWithProviders(<PetDetail pet={pet({ size: undefined })} />)

    expect(screen.queryByText('Tamaño')).toBeNull()
    expect(screen.queryByText('size.undefined')).toBeNull()
    // The other two facts still render — only the size row is conditional.
    expect(screen.getByText('Vacunas')).toBeInTheDocument()
    expect(screen.getByText('Castración')).toBeInTheDocument()
  })
})

describe('PetDetail rescue-center card', () => {
  const withCenter = (rc: Record<string, unknown>) =>
    pet({ rescue_center: { id: 'rc1', name: 'Adoptame RD', ...rc } })

  it('shows the profile photo and marks the centre verified', () => {
    const { container } = renderWithProviders(
      <PetDetail pet={withCenter({ avatar_url: 'https://cdn.test/avatar.jpg' })} />,
    )

    const avatar = container.querySelector('img[src="https://cdn.test/avatar.jpg"]')
    expect(avatar).not.toBeNull()
    // The centre's name is right beside it, so the photo is decorative.
    expect(avatar).toHaveAttribute('alt', '')
    // The bug this card replaces: `width`/`height` attributes alone get beaten
    // by Tailwind preflight's `img { height: auto }`, which collapsed a 4:1
    // asset to roughly 40×10. The box must come from CSS.
    expect(avatar!.className).toContain('h-14')
    expect(avatar!.className).toContain('w-14')
    expect(avatar!.className).toContain('object-cover')
    expect(screen.getByText('Adoptame RD')).toBeInTheDocument()
    expect(screen.getByText('Centro de rescate verificado')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toBeInTheDocument()
  })

  // The fallback is a 1600×400 lockup. Cropping it into a square is exactly the
  // bug this task exists to kill, so it must stay contained.
  it('falls back to the logo as a contained lockup, never cropped', () => {
    const { container } = renderWithProviders(
      <PetDetail pet={withCenter({ logo_url: 'https://cdn.test/logo.png' })} />,
    )

    const logo = container.querySelector('img[src="https://cdn.test/logo.png"]')
    expect(logo).not.toBeNull()
    expect(logo!.className).toContain('object-contain')
    expect(logo!.className).not.toContain('object-cover')
    // The wrapper establishes the 56px box, not the image: the lockup scales
    // inside it instead of being cropped to a square.
    expect(logo!.parentElement!.className).toContain('h-14')
    expect(logo!.parentElement!.className).toContain('w-14')
    // Without a max-height the box only constrains width, so a portrait logo
    // (nothing server-side enforces 4:1) would grow past the 56px box.
    expect(logo!.className).toContain('max-h-full')
  })

  it('prefers the profile photo over the logo when both exist', () => {
    const { container } = renderWithProviders(
      <PetDetail
        pet={withCenter({
          avatar_url: 'https://cdn.test/avatar.jpg',
          logo_url: 'https://cdn.test/logo.png',
        })}
      />,
    )

    expect(container.querySelector('img[src="https://cdn.test/avatar.jpg"]')).not.toBeNull()
    expect(container.querySelector('img[src="https://cdn.test/logo.png"]')).toBeNull()
  })

  it('renders only the links the centre actually has', () => {
    renderWithProviders(<PetDetail pet={withCenter({ website: 'adoptame.do' })} />)

    expect(screen.getByRole('link', { name: 'Sitio web' })).toHaveAttribute(
      'href',
      'https://adoptame.do',
    )
    expect(screen.queryByRole('link', { name: 'Instagram' })).toBeNull()
  })

  it('links to Instagram by handle', () => {
    renderWithProviders(<PetDetail pet={withCenter({ instagram: 'adoptame_rd' })} />)

    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/adoptame_rd',
    )
  })

  // The commonest state until the API ships `avatar_url`: a centre with no
  // imagery at all still gets the same 56px box, just with a paw in it.
  //
  // A pet photo is supplied here (unlike the other cases in this block) so
  // the carousel's own "no photos" empty state — which renders its own paw
  // icon above the fold — can't be mistaken for the centre's placeholder.
  it('shows the paw placeholder when the centre has no photo at all', () => {
    const { container } = renderWithProviders(
      <PetDetail
        pet={pet({
          photos: [{ id: 'ph1', url: 'https://cdn.test/photo.jpg', position: 0 }],
          rescue_center: { id: 'rc1', name: 'Adoptame RD' },
        })}
      />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-icon="paw"]')).not.toBeNull()
    expect(screen.getByText('Adoptame RD')).toBeInTheDocument()
  })
})
