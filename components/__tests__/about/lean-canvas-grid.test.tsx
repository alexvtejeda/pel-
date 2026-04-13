import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeanCanvasGrid } from '@/components/about/lean-canvas-grid'

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
