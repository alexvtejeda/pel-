import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetFilterBar, countActiveFilters } from '@/components/pets/pet-filters'

// Anchored, not exact: the trigger's accessible name picks up the active-filter
// badge count ("Filtros 1") as soon as anything is filtered.
const FILTERS = /^Filtros/
const SPECIES = 'Especie'

type Props = Partial<Parameters<typeof PetFilterBar>[0]>

/**
 * The bar's disclosure is controlled, so the harness owns the open state the
 * way `pets-page.tsx` will. `clearAll` stands in for the empty state's
 * "Limpiar filtros" button, which lives in a sibling component.
 */
function Harness({ overrides, onClear }: { overrides: Props; onClear?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <PetFilterBar
        activeFilter="all"
        onFilterChange={vi.fn()}
        vaccinatedFilter={false}
        onVaccinatedChange={vi.fn()}
        castratedFilter={false}
        onCastratedChange={vi.fn()}
        sourceFilter="all"
        onSourceChange={vi.fn()}
        mobileFiltersOpen={open}
        onMobileFiltersOpenChange={setOpen}
        {...overrides}
      />
      <button onClick={() => { setOpen(false); onClear?.() }}>Limpiar filtros</button>
    </>
  )
}

function renderBar(overrides: Props = {}, onClear?: () => void) {
  return renderWithProviders(<Harness overrides={overrides} onClear={onClear} />)
}

function trigger() {
  return screen.getByRole('button', { name: FILTERS })
}

/** The popover carries its own accessible name via `aria-label`. */
function popover() {
  return screen.getByRole('group', { name: 'Filtros' })
}

function openPopover() {
  fireEvent.click(trigger())
  expect(trigger()).toHaveAttribute('aria-expanded', 'true')
}

afterEach(() => vi.restoreAllMocks())

// The popover is hand-rolled rather than a Radix primitive, so none of the
// dismiss behaviour a user expects from a popover comes for free.
describe('PetFilterBar mobile popover', () => {
  it('opens from the trigger', () => {
    renderBar()

    expect(screen.queryByText(SPECIES)).toBeNull()
    openPopover()
    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  it('closes on a pointerdown outside it', () => {
    renderBar()
    openPopover()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByText(SPECIES)).toBeNull()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays open on a pointerdown inside it', () => {
    renderBar()
    openPopover()

    fireEvent.pointerDown(within(popover()).getByRole('button', { name: 'Perros' }))

    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  // The trigger sits inside the same ref'd wrapper as the popover, so its own
  // pointerdown must not close what its click is about to toggle — otherwise the
  // button would close and immediately reopen (or never close at all).
  it('still toggles closed from the trigger itself', () => {
    renderBar()
    openPopover()

    fireEvent.pointerDown(trigger())
    expect(screen.getByText(SPECIES)).toBeInTheDocument()

    fireEvent.click(trigger())
    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  it('closes on Escape', () => {
    renderBar()
    openPopover()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  it('ignores other keys', () => {
    renderBar()
    openPopover()

    fireEvent.keyDown(document, { key: 'Enter' })

    expect(screen.getByText(SPECIES)).toBeInTheDocument()
  })

  // The clear button now lives in a sibling (the grid's/feed's empty state), so
  // the close has to survive crossing a component boundary. That is the whole
  // reason the disclosure is controlled rather than local state.
  it('closes when a sibling clears every filter', () => {
    const onClear = vi.fn()
    renderBar({ activeFilter: 'dogs' }, onClear)
    openPopover()

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(onClear).toHaveBeenCalled()
    expect(screen.queryByText(SPECIES)).toBeNull()
  })

  // The space in "Filtros 3" is load-bearing, and it is why this asserts the
  // whole name rather than just the count. The badge is a bare <span> straight
  // after the label, so without an explicit text node between them the
  // accessible name runs together as "Filtros3" — `ml-1` is visual margin and
  // never reaches the accname algorithm. The grid read that way for months.
  it('counts every active dimension in the trigger badge', () => {
    renderBar({ activeFilter: 'dogs', vaccinatedFilter: true, sourceFilter: 'rc' })

    expect(trigger()).toHaveAccessibleName('Filtros 3')
  })

  // The mobile controls working is the entire point of the extraction — this
  // is the one behaviour every other test in this block only opens or closes
  // around without ever actually firing.
  it('fires a popover chip callback', () => {
    const onVaccinatedChange = vi.fn()
    renderBar({ onVaccinatedChange })
    openPopover()

    fireEvent.click(within(popover()).getByRole('button', { name: 'Vacunado' }))

    expect(onVaccinatedChange).toHaveBeenCalledWith(true)
  })
})

describe('PetFilterBar desktop pills', () => {
  // `Object.defineProperty` is not a spy, so `vi.restoreAllMocks()` cannot
  // undo it — without this it would leak the stub onto every later test.
  const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

  afterEach(() => {
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', originalGeolocation)
    } else {
      delete (navigator as { geolocation?: unknown }).geolocation
    }
  })

  it('fills the active pill and announces it as pressed', () => {
    renderBar({ activeFilter: 'dogs' })

    expect(screen.getByRole('button', { name: 'Perros', pressed: true })).toBeInTheDocument()
  })

  it('leaves inactive pills unfilled and unpressed', () => {
    renderBar({ activeFilter: 'dogs' })

    expect(screen.getByRole('button', { name: 'Gatos', pressed: false })).toBeInTheDocument()
  })

  it('toggles the source filter off when it is already active', () => {
    const onSourceChange = vi.fn()
    renderBar({ sourceFilter: 'rc', onSourceChange })

    fireEvent.click(screen.getByRole('button', { name: 'Centros' }))

    expect(onSourceChange).toHaveBeenCalledWith('all')
  })

  it('asks for coordinates before applying the nearby filter', () => {
    const onFilterChange = vi.fn()
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { latitude: 18.5, longitude: -69.9 } } as GeolocationPosition),
    )
    // Defined onto the real navigator rather than replacing it: jsdom keeps its
    // properties on the prototype, so `{...navigator}` would spread to `{}` and
    // take `userAgent` with it.
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })

    renderBar({ onFilterChange })
    fireEvent.click(screen.getByRole('button', { name: 'Cercanos' }))

    expect(onFilterChange).toHaveBeenCalledWith('nearby', {
      sort: 'proximity',
      lat: 18.5,
      lng: -69.9,
    })
  })

  // The error callback, not the success one, is what most users actually hit.
  it('falls back to a plain nearby filter when geolocation is denied', () => {
    const onFilterChange = vi.fn()
    const getCurrentPosition = vi.fn(
      (_ok: PositionCallback, err?: PositionErrorCallback) => err?.({} as GeolocationPositionError),
    )
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })

    renderBar({ onFilterChange })
    fireEvent.click(screen.getByRole('button', { name: 'Cercanos' }))

    expect(onFilterChange).toHaveBeenCalledWith('nearby', { sort: 'proximity' })
  })
})

describe('countActiveFilters', () => {
  // A direct test: deleting the castrated term from the implementation left
  // the rest of the suite green, since nothing exercised the function itself.
  it('counts every dimension, including castrated', () => {
    expect(
      countActiveFilters({
        activeFilter: 'dogs',
        vaccinatedFilter: true,
        castratedFilter: true,
        sourceFilter: 'rc',
      }),
    ).toBe(4)
  })
})

describe('PetFilterBar listeners', () => {
  function spyListeners() {
    const added: [string, EventListener][] = []
    const removed: [string, EventListener][] = []
    vi.spyOn(document, 'addEventListener').mockImplementation(((
      type: string,
      fn: EventListener,
      ...rest: unknown[]
    ) => {
      added.push([type, fn])
      return EventTarget.prototype.addEventListener.call(document, type, fn, ...(rest as []))
    }) as typeof document.addEventListener)
    vi.spyOn(document, 'removeEventListener').mockImplementation(((
      type: string,
      fn: EventListener,
      ...rest: unknown[]
    ) => {
      removed.push([type, fn])
      return EventTarget.prototype.removeEventListener.call(document, type, fn, ...(rest as []))
    }) as typeof document.removeEventListener)

    const only = (log: [string, EventListener][]) =>
      log.filter(([type]) => type === 'pointerdown' || type === 'keydown')

    return { ours: () => only(added), cleaned: () => only(removed) }
  }

  it('registers nothing while the popover is closed', () => {
    const log = spyListeners()

    renderBar()

    expect(log.ours()).toHaveLength(0)
  })

  it('removes both listeners when the popover closes', () => {
    const log = spyListeners()
    renderBar()

    openPopover()
    expect(log.ours().map(([type]) => type).sort()).toEqual(['keydown', 'pointerdown'])

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(log.cleaned()).toEqual(log.ours())
  })

  it('removes both listeners on unmount while still open', () => {
    const log = spyListeners()
    const { unmount } = renderBar()

    openPopover()
    unmount()

    expect(log.cleaned()).toEqual(log.ours())
  })

  // Belt and braces: a leaked handler would still be holding a stale setState.
  it('does not react to events fired after unmount', () => {
    const { unmount } = renderBar()
    openPopover()
    unmount()

    expect(() => {
      fireEvent.pointerDown(document.body)
      fireEvent.keyDown(document, { key: 'Escape' })
    }).not.toThrow()
  })
})
