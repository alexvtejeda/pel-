import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { TransportDrawer } from '@/components/transport/transport-drawer'
import type { Trip, TripStatus, TripStop } from '@/lib/api/transport'

function stop(id: string, address: string, completed = false): TripStop {
  return {
    id,
    address,
    lat: 18.48,
    lng: -69.93,
    position: Number(id),
    completed_at: completed ? '2026-08-02T10:00:00Z' : null,
  }
}

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    requester_id: 'user-1',
    driver_id: null,
    status: 'in_transit',
    stops: [stop('1', 'Calle A 1'), stop('2', 'Calle B 2'), stop('3', 'Calle C 3')],
    created_at: '2026-08-02T09:00:00Z',
    updated_at: '2026-08-02T09:30:00Z',
    ...overrides,
  }
}

/** Vaul portals the sheet to document.body, outside the render container. */
function drawerEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-vaul-drawer]')
  if (!el) throw new Error('drawer content element not found')
  return el
}

describe('TransportDrawer — viewport-spanning layout (regression)', () => {
  // The bug this guards: the sheet rendered with data-state="open" and was fully
  // present in the DOM, yet sat ~680px below the fold on an unscrollable page —
  // no status, no ETA, no cancel button reachable. Any "is it in the document"
  // assertion passed the whole time it was broken.
  //
  // Vaul converts a fractional snap point into `innerHeight - innerHeight *
  // snapPoint` and applies it as translateY, which only lands correctly if the
  // sheet spans the viewport from top: 0. shadcn's DrawerContent primitive is
  // `bottom-0 mt-24 h-auto` (bottom-anchored), so the translate stacked on top
  // of that anchoring and pushed the sheet off-screen.
  //
  // HONESTY NOTE: jsdom performs no layout — getBoundingClientRect() is all
  // zeroes here, so this test cannot and does not prove real geometry. What it
  // proves is the *class contract* the geometry depends on: that the merged
  // className spans the viewport instead of hugging the bottom edge. Real
  // pixel verification belongs in a browser.
  it('spans the viewport instead of being bottom-anchored', () => {
    renderWithProviders(<TransportDrawer trip={trip()} driverLocation={null} onCancel={() => {}} />)

    const classes = drawerEl().className.split(/\s+/)

    // Must be present: the sheet stretches from the top of the viewport.
    expect(classes).toContain('top-0')
    expect(classes).toContain('h-full')
    expect(classes).toContain('mt-0')

    // Must be gone: tailwind-merge has to actually beat the primitive's
    // defaults. If either of these survives the merge, the sheet is short
    // and/or offset and every snap offset lands in the wrong place again.
    expect(classes).not.toContain('h-auto')
    expect(classes).not.toContain('mt-24')
  })

  it('still renders as an open, fixed sheet', () => {
    renderWithProviders(<TransportDrawer trip={trip()} driverLocation={null} onCancel={() => {}} />)

    const el = drawerEl()
    expect(el).toHaveAttribute('data-state', 'open')
    // Necessary but famously not sufficient — see the note above.
    expect(el.className.split(/\s+/)).toContain('fixed')
  })
})

describe('TransportDrawer — expanded content is height-bounded (regression)', () => {
  // The bug this guards: at 390x667 with 8 stops, the 0.65 snap showed 430px of
  // sheet but the content kept growing past it — "Cancelar viaje" measured at
  // y=741, and nothing in the subtree had `scrollHeight > clientHeight`, so
  // there was no way to reach it. The content div already carried
  // `overflow-y-auto`; what it lacked was any height bound to overflow.
  //
  // HONESTY NOTE: jsdom does no layout — every getBoundingClientRect() here is
  // zeroes and no element is ever really scrollable — so this test cannot prove
  // the button lands on screen. It proves the *class contract* that the
  // geometry depends on: a column bounded to the active snap, a scroll region
  // that is allowed to shrink inside it, and a header that is not. Pixels are a
  // browser's job.
  function column(): HTMLElement {
    return screen.getByTestId('transport-drawer-column')
  }
  function scrollRegion(): HTMLElement {
    return screen.getByTestId('transport-drawer-scroll')
  }

  it('bounds the drawer column to the active snap point', () => {
    renderWithProviders(<TransportDrawer trip={trip()} driverLocation={null} onCancel={() => {}} />)

    const classes = [...column().classList]
    const height = classes.find((c) => c.startsWith('h-['))

    // Unbounded is the bug: `h-full`/no height lets the content run off-screen.
    expect(height, `no arbitrary height on the drawer column: ${classes.join(' ')}`).toBeDefined()
    // Mounts at the 0.15 peek, so the bound must track that snap — not a
    // hardcoded constant that only happens to be right when expanded.
    expect(height).toContain('15%')
    // It is the flex context the scroll region shrinks inside.
    expect(classes).toContain('flex')
    expect(classes).toContain('flex-col')
  })

  it('makes the content region scrollable AND shrinkable, not just scrollable', () => {
    renderWithProviders(
      <TransportDrawer
        trip={trip({ stops: Array.from({ length: 8 }, (_, i) => stop(String(i + 1), `Calle ${i + 1}`)) })}
        driverLocation={null}
        onCancel={() => {}}
      />
    )

    const scroll = scrollRegion()
    expect(column().contains(scroll)).toBe(true)
    expect([...scroll.classList]).toContain('overflow-y-auto')

    // The half of the fix that is easy to drop: a flex child defaults to
    // `min-height: auto` and refuses to shrink below its content, so
    // `overflow-y-auto` never engages and the box grows past the fold again —
    // with every class still "present". This assertion is the whole point of
    // the test; drop `min-h-0` and it fails.
    expect([...scroll.classList]).toContain('min-h-0')
    expect([...scroll.classList]).toContain('shrink')
    expect([...scroll.classList]).not.toContain('shrink-0')

    // Same trap one level up: every flex-1 link in the chain between the scroll
    // region and the bounded column also has to be allowed to shrink.
    for (let el: HTMLElement | null = scroll; el && el !== column(); el = el.parentElement) {
      if (el.classList.contains('flex-1')) {
        expect([...el.classList], `flex-1 without min-h-0: ${el.className}`).toContain('min-h-0')
      }
    }
  })

  it('keeps the header out of the shrinking, and the cancel button out of the scroll', () => {
    renderWithProviders(<TransportDrawer trip={trip()} driverLocation={null} onCancel={() => {}} />)

    // Header is the first child of the bounded column and must not be squeezed
    // to make room for a long stop list.
    const header = column().firstElementChild as HTMLElement
    expect(header).toHaveTextContent('Tu mascota está en camino')
    expect([...header.classList]).toContain('shrink-0')

    // Pinned, not scrolled-to: the cancel action lives outside the scroll
    // region entirely, so no stop count can bury it. (getByText, not getByRole
    // — at the peek snap the region is display:none and therefore hidden from
    // the accessibility tree.)
    const cancel = screen.getByText('Cancelar viaje')
    expect(scrollRegion().contains(cancel)).toBe(false)
    expect(column().contains(cancel)).toBe(true)
  })

  it('still bounds the column with no stops and with the button absent', () => {
    // Terminal trips render no cancel button at all; the column must still be
    // bounded rather than falling back to unbounded growth.
    renderWithProviders(
      <TransportDrawer trip={trip({ status: 'completed', stops: [] })} driverLocation={null} onCancel={() => {}} />
    )

    expect([...column().classList].find((c) => c.startsWith('h-['))).toBeDefined()
    expect(screen.queryByText('Cancelar viaje')).toBeNull()
    expect([...scrollRegion().classList]).toEqual(expect.arrayContaining(['shrink', 'min-h-0', 'overflow-y-auto']))
  })
})

describe('TransportDrawer — status labels', () => {
  const EXPECTED: Record<TripStatus, string> = {
    requested: 'Solicitado',
    accepted: 'Aceptado',
    picking_up: 'En recogida',
    in_transit: 'En camino',
    completed: 'Completado',
    cancelled: 'Cancelado',
  }

  // Zero stops keeps the expanded stop list empty, so `steps.in_transit`
  // ("En camino") cannot collide with the in_transit status badge.
  for (const [status, label] of Object.entries(EXPECTED) as [TripStatus, string][]) {
    it(`renders "${label}" for ${status}, never the raw key`, () => {
      renderWithProviders(
        <TransportDrawer trip={trip({ status, stops: [] })} driverLocation={null} onCancel={() => {}} />
      )

      expect(screen.getByText(label)).toBeInTheDocument()
      // The actual symptom: `status.requested` printed verbatim in the badge
      // because the locale files only had pending/active/completed/cancelled.
      expect(screen.queryByText(/^status\./)).toBeNull()
    })
  }
})

describe('TransportDrawer — stop counter', () => {
  it('counts the real stop total, not 0', () => {
    renderWithProviders(
      <TransportDrawer
        trip={trip({ stops: [stop('1', 'Calle A 1', true), stop('2', 'Calle B 2'), stop('3', 'Calle C 3')] })}
        driverLocation={null}
        onCancel={() => {}}
      />
    )

    // One stop done -> currently working on stop 2 of 3.
    expect(screen.getByText('Parada 2 de 3')).toBeInTheDocument()
  })

  it('shows the ETA instead of the counter once the driver reports one', () => {
    renderWithProviders(
      <TransportDrawer
        trip={trip()}
        driverLocation={{ trip_id: 'trip-1', lat: 18.4, lng: -69.9, eta_minutes: 12 }}
        onCancel={() => {}}
      />
    )

    expect(screen.getByText('ETA: ~12 min')).toBeInTheDocument()
    expect(screen.queryByText(/^Parada /)).toBeNull()
  })

  it('degrades to "Parada 1 de 0" only when the trip genuinely has no stops', () => {
    renderWithProviders(
      <TransportDrawer trip={trip({ stops: [] })} driverLocation={null} onCancel={() => {}} />
    )

    expect(screen.getByText('Parada 1 de 0')).toBeInTheDocument()
  })
})
