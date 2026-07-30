import { describe, it, expect, vi } from 'vitest'
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

  it('still moves the track when a dot is activated', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    const third = screen.getByRole('button', { name: '3 / 3' })
    fireEvent.click(third)

    expect(third).toHaveAttribute('aria-current', 'true')
  })

  // 8x8px is a quarter of the 44px minimum. The visual dot stays 8px; the
  // button's padding is what carries the target.
  it('gives each dot a 44px hit area', () => {
    renderWithProviders(<Carousel items={items} baseWidth={300} />)

    expect(screen.getAllByRole('button')[0].className).toContain('h-11')
  })
})
