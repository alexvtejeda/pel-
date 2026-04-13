import { describe, it, expect } from 'vitest'
import { LEAN_CANVAS } from '@/lib/about/lean-canvas-content'

describe('LEAN_CANVAS', () => {
  it('has a top row with 5 columns', () => {
    expect(LEAN_CANVAS.top).toHaveLength(5)
  })

  it('has a bottom row with 2 columns', () => {
    expect(LEAN_CANVAS.bottom).toHaveLength(2)
  })

  it('middle top columns (index 1 and 3) are stacked with 2 cells', () => {
    expect(LEAN_CANVAS.top[1].cells).toHaveLength(2)
    expect(LEAN_CANVAS.top[3].cells).toHaveLength(2)
  })

  it('outer top columns (0, 2, 4) have 1 cell each', () => {
    expect(LEAN_CANVAS.top[0].cells).toHaveLength(1)
    expect(LEAN_CANVAS.top[2].cells).toHaveLength(1)
    expect(LEAN_CANVAS.top[4].cells).toHaveLength(1)
  })

  it('bottom columns have weights 2 and 3', () => {
    expect(LEAN_CANVAS.bottom[0].weight).toBe(2)
    expect(LEAN_CANVAS.bottom[1].weight).toBe(3)
  })

  it('every cell has id, title, shortText, fullText', () => {
    const allCells = [
      ...LEAN_CANVAS.top.flatMap((c) => c.cells),
      ...LEAN_CANVAS.bottom.flatMap((c) => c.cells),
    ]
    expect(allCells).toHaveLength(9)
    for (const cell of allCells) {
      expect(cell.id).toBeTruthy()
      expect(cell.title).toBeTruthy()
      expect(cell.shortText).toBeTruthy()
      expect(cell.fullText).toBeTruthy()
    }
  })

  it('contains all 9 expected block ids', () => {
    const ids = [
      ...LEAN_CANVAS.top.flatMap((c) => c.cells.map((x) => x.id)),
      ...LEAN_CANVAS.bottom.flatMap((c) => c.cells.map((x) => x.id)),
    ].sort()
    expect(ids).toEqual(
      ['actividades', 'canales', 'costos', 'ingresos', 'propuesta', 'recursos', 'relacion', 'segmentos', 'socios'].sort()
    )
  })
})
