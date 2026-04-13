import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { LeanCanvasGrid } from '@/components/about/lean-canvas-grid'

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}

// @ts-expect-error jsdom stub
window.IntersectionObserver = MockIntersectionObserver

describe('LeanCanvasGrid — structure', () => {
  it('renders all 9 lean canvas cells as buttons', () => {
    render(<LeanCanvasGrid />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(9)
  })

  it('each button has its title as accessible name', () => {
    render(<LeanCanvasGrid />)
    for (const name of [
      'Socios Clave',
      'Actividades Clave',
      'Recursos Clave',
      'Propuesta de Valor',
      'Relación',
      'Canales',
      'Segmentos',
      'Costos',
      'Ingresos',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
  })

  it('renders both shortText and fullText in the DOM for every cell', () => {
    render(<LeanCanvasGrid />)
    expect(screen.getByText(/Centros de rescate \+ transporte/)).toBeInTheDocument()
    expect(screen.getByText(/Rabito Callejero, AdoptameRD/)).toBeInTheDocument()
  })

  it('applies weight styles on bottom-row columns', () => {
    const { container } = render(<LeanCanvasGrid />)
    const bottomCols = container.querySelectorAll('[data-lc-row="bottom"] [data-lc-col]')
    expect(bottomCols).toHaveLength(2)
    expect((bottomCols[0] as HTMLElement).style.flexGrow).toBe('2')
    expect((bottomCols[1] as HTMLElement).style.flexGrow).toBe('3')
  })
})

describe('LeanCanvasGrid — click-to-lock', () => {

  it('clicking a cell sets aria-pressed="true" on that cell only', () => {
    render(<LeanCanvasGrid />)
    const cell = screen.getByRole('button', { name: /Socios Clave/ })
    fireEvent.click(cell)
    expect(cell).toHaveAttribute('aria-pressed', 'true')
    const other = screen.getByRole('button', { name: /Ingresos/ })
    expect(other).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking the same locked cell again unlocks it', () => {
    render(<LeanCanvasGrid />)
    const cell = screen.getByRole('button', { name: /Socios Clave/ })
    fireEvent.click(cell)
    fireEvent.click(cell)
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a different cell transfers the lock', () => {
    render(<LeanCanvasGrid />)
    const a = screen.getByRole('button', { name: /Socios Clave/ })
    const b = screen.getByRole('button', { name: /Ingresos/ })
    fireEvent.click(a)
    fireEvent.click(b)
    expect(a).toHaveAttribute('aria-pressed', 'false')
    expect(b).toHaveAttribute('aria-pressed', 'true')
  })

  it('Escape clears the lock', () => {
    render(<LeanCanvasGrid />)
    const cell = screen.getByRole('button', { name: /Propuesta de Valor/ })
    fireEvent.click(cell)
    expect(cell).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking outside the grid clears the lock', () => {
    const { container } = render(
      <div>
        <div data-testid="outside" />
        <LeanCanvasGrid />
      </div>,
    )
    const cell = screen.getByRole('button', { name: /Canales/ })
    fireEvent.click(cell)
    expect(cell).toHaveAttribute('aria-pressed', 'true')
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })
})
