import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetGrid } from '@/components/pets/pet-grid'

// Anchored, not exact: the trigger's accessible name picks up the active-filter
// badge count ("Filtros 1") as soon as anything is filtered.
const FILTERS = /^Filtros/
const SPECIES = 'Especie'

type Props = Partial<Parameters<typeof PetGrid>[0]>

function renderGrid(overrides: Props = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onFilterChange: vi.fn(),
    onVaccinatedChange: vi.fn(),
    onCastratedChange: vi.fn(),
    onRetry: vi.fn(),
  }
  const utils = renderWithProviders(
    <PetGrid
      pets={[]}
      loading={false}
      error={null}
      selectedId={null}
      activeFilter="all"
      vaccinatedFilter={false}
      castratedFilter={false}
      {...handlers}
      {...overrides}
    />
  )
  return { ...utils, ...handlers }
}

function trigger() {
  return screen.getByRole('button', { name: FILTERS })
}

/** The popover is the only place "Especie" appears; walk up to its container. */
function popover() {
  return screen.getByText(SPECIES).closest('div.absolute') as HTMLElement
}

function openPopover() {
  fireEvent.click(trigger())
  expect(trigger()).toHaveAttribute('aria-expanded', 'true')
}

afterEach(() => vi.restoreAllMocks())

// The popover is hand-rolled rather than a Radix primitive, so none of the
// dismiss behaviour a user expects from a popover comes for free.
describe('PetGrid mobile filter popover', () => {
  it('opens from the trigger', () => {
    renderGrid()

    expect(screen.queryByText(SPECIES)).toBeNull()
    openPopover()
    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  it('closes on a pointerdown outside it', () => {
    renderGrid()
    openPopover()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByText(SPECIES)).toBeNull()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays open on a pointerdown inside it', () => {
    renderGrid()
    openPopover()

    fireEvent.pointerDown(within(popover()).getByRole('button', { name: 'Perros' }))

    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  // The trigger sits inside the same ref'd wrapper as the popover, so its own
  // pointerdown must not close what its click is about to toggle — otherwise the
  // button would close and immediately reopen (or never close at all).
  it('still toggles closed from the trigger itself', () => {
    renderGrid()
    openPopover()

    fireEvent.pointerDown(trigger())
    expect(screen.getByText(SPECIES)).toBeInTheDocument()

    fireEvent.click(trigger())
    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  it('closes on Escape', () => {
    renderGrid()
    openPopover()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  it('ignores other keys', () => {
    renderGrid()
    openPopover()

    fireEvent.keyDown(document, { key: 'Enter' })

    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  it('closes when a filter chip clears every filter', () => {
    renderGrid({ pets: [], activeFilter: 'dogs' })
    openPopover()

    // The empty state's escape hatch also lives behind clearFilters().
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.queryByText(SPECIES)).toBeNull()
  })
})

describe('PetGrid mobile filter popover listeners', () => {
  function spyListeners() {
    const added: [string, EventListener][] = []
    const removed: [string, EventListener][] = []
    vi.spyOn(document, 'addEventListener').mockImplementation(((
      type: string,
      fn: EventListener,
      ...rest: unknown[]
    ) => {
      added.push([type, fn])
      return EventTarget.prototype.addEventListener.call(
        document,
        type,
        fn,
        ...(rest as [])
      )
    }) as typeof document.addEventListener)
    vi.spyOn(document, 'removeEventListener').mockImplementation(((
      type: string,
      fn: EventListener,
      ...rest: unknown[]
    ) => {
      removed.push([type, fn])
      return EventTarget.prototype.removeEventListener.call(
        document,
        type,
        fn,
        ...(rest as [])
      )
    }) as typeof document.removeEventListener)

    const only = (log: [string, EventListener][]) =>
      log.filter(([type]) => type === 'pointerdown' || type === 'keydown')

    return { ours: () => only(added), cleaned: () => only(removed) }
  }

  it('registers nothing while the popover is closed', () => {
    const log = spyListeners()

    renderGrid()

    expect(log.ours()).toHaveLength(0)
  })

  it('removes both listeners when the popover closes', () => {
    const log = spyListeners()
    renderGrid()

    openPopover()
    expect(log.ours().map(([type]) => type).sort()).toEqual(['keydown', 'pointerdown'])

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(log.cleaned()).toEqual(log.ours())
  })

  it('removes both listeners on unmount while still open', () => {
    const log = spyListeners()
    const { unmount } = renderGrid()

    openPopover()
    unmount()

    expect(log.cleaned()).toEqual(log.ours())
  })

  // Belt and braces: a leaked handler would still be holding a stale setState.
  it('does not react to events fired after unmount', () => {
    const { unmount } = renderGrid()
    openPopover()
    unmount()

    expect(() => {
      fireEvent.pointerDown(document.body)
      fireEvent.keyDown(document, { key: 'Escape' })
    }).not.toThrow()
  })
})
