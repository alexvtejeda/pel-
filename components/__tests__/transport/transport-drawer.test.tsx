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
