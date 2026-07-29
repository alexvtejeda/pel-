import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetGrid } from '@/components/pets/pet-grid'

const pet = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    name: 'Luna',
    age: 72,
    gender: 'female',
    species: 'dog',
    photos: [],
    conditions: [],
    short_slug: 'luna1',
    ...overrides,
  }) as never

function renderGrid(pets: unknown[], onSelect = vi.fn()) {
  const utils = renderWithProviders(
    <PetGrid
      pets={pets as never}
      loading={false}
      error={null}
      selectedId={null}
      activeFilter="all"
      onSelect={onSelect}
      onFilterChange={() => {}}
      vaccinatedFilter={false}
      castratedFilter={false}
      onVaccinatedChange={() => {}}
      onCastratedChange={() => {}}
    />
  )
  return { ...utils, onSelect }
}

describe('PetGrid card', () => {
  it('exposes the card as a real <button>, not a div[role=button]', () => {
    renderGrid([pet()])

    const card = screen.getByRole('button', { name: 'Ver detalles de Luna' })
    expect(card.tagName).toBe('BUTTON')
  })

  // The whole point of the restructure: a <button> may not contain another
  // interactive control. If this regresses, assistive tech loses the menu.
  it('does not nest interactive content inside the card button', () => {
    renderGrid([pet()])

    const card = screen.getByRole('button', { name: 'Ver detalles de Luna' })
    expect(card.querySelector('button')).toBeNull()
    expect(card.querySelector('a')).toBeNull()
    expect(card.querySelector('[role="button"]')).toBeNull()
  })

  it('calls onSelect with the clicked pet', () => {
    const { onSelect } = renderGrid([pet({ id: 'abc', name: 'Rex' })])

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles de Rex' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'abc', name: 'Rex' })
  })

  // Highest-value regression: the menu used to live INSIDE the card and relied
  // on stopPropagation. Now they are siblings, so this must hold structurally.
  it('does not fire onSelect when the three-dots menu is clicked', () => {
    const { onSelect } = renderGrid([pet()])

    const card = screen.getByRole('button', { name: 'Ver detalles de Luna' })
    const menu = screen.getByRole('button', { name: 'Más acciones' })

    expect(card.contains(menu)).toBe(false)

    fireEvent.pointerDown(menu, { button: 0, ctrlKey: false })
    fireEvent.click(menu)

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('opens the menu without selecting the pet', () => {
    const { onSelect } = renderGrid([pet()])

    expect(screen.queryByText('Compartir enlace')).toBeNull()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Más acciones' }), {
      button: 0,
      ctrlKey: false,
    })

    expect(screen.getByText('Compartir enlace')).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders name, formatted age and gender in the overlay', () => {
    // 72 months must read as "6 años", never "72 meses".
    renderGrid([pet({ age: 72, gender: 'female' })])

    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('6 años · Hembra')).toBeInTheDocument()
  })

  it('uses months below a year', () => {
    renderGrid([pet({ age: 5, gender: 'male' })])

    expect(screen.getByText('5 meses · Macho')).toBeInTheDocument()
  })

  it('gives the verified badge a text alternative', () => {
    renderGrid([pet({ rescue_center: { id: 'rc1', name: 'Refugio' } })])

    expect(
      screen.getByRole('img', { name: 'Publicado por un centro de rescate verificado' })
    ).toBeInTheDocument()
  })

  it('does not duplicate the pet name on the photo', () => {
    // The button carries the accessible name, so the <img> must stay alt="".
    const { container } = renderGrid([
      pet({ photos: [{ id: 'ph1', url: 'https://example.test/luna.jpg' }] }),
    ])

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('alt', '')
  })
})
