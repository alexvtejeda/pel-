import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Carousel from '@/components/Carousel'

const photo = (id: number) => ({
  id,
  title: '',
  description: '',
  icon: null as unknown as React.ReactNode,
  image: `/${id}.webp`,
})

const items = [photo(1), photo(2), photo(3)]

describe('Carousel dots', () => {
  it('exposes one button per item, not a click-only div', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    // 3 dots; the pause button is off by default.
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('falls back to a locale-free position when no label is given', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(screen.getByRole('button', { name: '2 / 3' })).toBeInTheDocument()
  })

  it('takes its accessible names from the caller', () => {
    renderWithProviders(
      <Carousel
        items={items}
        baseWidth={300}
        dotLabel={(n, total) => `Foto ${n} de ${total}`}
      />,
    )

    expect(screen.getByRole('button', { name: 'Foto 1 de 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto 3 de 3' })).toBeInTheDocument()
  })

  it('marks the activated dot as the current one', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    const third = screen.getByRole('button', { name: '3 / 3' })
    fireEvent.click(third)

    expect(third).toHaveAttribute('aria-current', 'true')
  })

  // `aria-current={false}` serializes to aria-current="false", which is a
  // present-but-negative state rather than an absent one.
  it('omits aria-current on the dots that are not current', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(screen.getByRole('button', { name: '2 / 3' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: '3 / 3' })).not.toHaveAttribute('aria-current')
  })

  // A one-photo carousel used to render a focusable "1 / 1" that moved nothing —
  // one dead tab stop per pet across a whole grid page.
  it('renders no dots at all for a single photo', () => {
    renderWithProviders(<Carousel items={[photo(1)]} baseWidth={300} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  // The group is what lets a screen-reader user step over a pet's dots instead
  // of tabbing all of them to reach the next card.
  it('wraps the dots in a named group so they can be skipped', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} dotsGroupLabel="Fotos" />)

    const group = screen.getByRole('group', { name: 'Fotos' })
    expect(group).toBeInTheDocument()
    expect(group.querySelectorAll('button')).toHaveLength(3)
  })

  // jsdom has no layout and Tailwind is not loaded here, so this asserts that
  // the literals appear — it cannot prove a rendered 44px box. Its job is to
  // make a change to the hit area deliberate rather than incidental.
  it('pins the dot button classes that carry the hit area', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    const dot = screen.getAllByRole('button')[0]
    // 44 wide with a 24px floor: a narrow card compresses rather than clipping.
    expect(dot.className).toContain('h-11')
    expect(dot.className).toContain('w-11')
    expect(dot.className).toContain('min-w-6')
  })

  // Same jsdom caveat: this pins the classes, not the hit testing. The row is a
  // full-width sibling of the drag track, so without these the 44px band
  // swallowed every pointerdown near the bottom of the photo and the swipe died.
  it('pins the pointer-events classes that keep the row from eating swipes', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} dotsGroupLabel="Fotos" />)

    const row = screen.getByRole('group', { name: 'Fotos' })
    expect(row.className).toContain('pointer-events-none')
    expect(row.parentElement?.className).toContain('pointer-events-none')

    for (const dot of screen.getAllByRole('button')) {
      expect(dot.className).toContain('pointer-events-auto')
    }
  })
})
