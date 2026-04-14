# Lean Canvas Expandable Scene 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scene 6 of the about page with a gapless, nested-flex lean canvas whose cells expand on hover, keyboard focus, or click-to-lock — matching the feel of worldquantfoundry.com inside a true 2D lean canvas layout.

**Architecture:** A new `LeanCanvasGrid` component renders a nested `row → column → cell` structure backed by a restructured `LEAN_CANVAS` constant. Expansion is driven entirely by CSS (`:hover`, `:focus-visible`, `:has()`, `[data-locked]`) with a minimal React state (`lockedId`) for click-to-lock presentation mode. Scene 6 becomes a thin wrapper that mounts the grid on desktop and falls back to a stacked card list on mobile.

**Tech Stack:** Next.js 16 (App Router) + React 19, plain CSS module (no Tailwind arbitrary variants for `:has`), Vitest + React Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-04-13-lean-canvas-expandable-design.md`

---

## File Structure

**New files:**
- `components/about/lean-canvas-grid.tsx` — interactive grid component. Renders nested rows/columns/cells, holds `lockedId` state, wires Escape + click-outside + IntersectionObserver listeners. ~150 lines.
- `components/about/lean-canvas-grid.module.css` — all `:hover`, `:focus-visible`, `:has()`, `[data-locked]`, reduced-motion rules plus tunable CSS custom properties.
- `components/__tests__/about/lean-canvas-grid.test.tsx` — unit tests for the grid (content rendering, button semantics, click-lock toggle, Escape, click-outside).

**Modified files:**
- `lib/about/lean-canvas-content.ts` — restructure from flat `LeanCanvasBlock[]` to nested `LeanCanvas { top, bottom }` shape. Content strings unchanged.
- `components/about/scenes/scene-06-lean-canvas.tsx` — becomes thin. Renders the scene heading + `<LeanCanvasGrid />` on desktop, falls back to a stacked list on mobile. Drops `useState`, `framer-motion`, and the old CSS grid logic.

**Untouched:** `components/__tests__/about/scenes.smoke.test.tsx` (keeps working because scene 6 still exports the same component name), all other scenes.

---

## Task 1: Restructure lean canvas content data

**Files:**
- Modify: `lib/about/lean-canvas-content.ts`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/about/lean-canvas-content.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/lean-canvas-content.test.ts`
Expected: FAIL — current `LEAN_CANVAS` is a flat array, does not have `.top` or `.bottom`.

- [ ] **Step 3: Replace `lib/about/lean-canvas-content.ts` with the nested structure**

Full replacement:

```ts
export type LeanCanvasBlock = {
  id: string
  title: string
  shortText: string
  fullText: string
}

export type LeanCanvasColumn = {
  id: string
  cells: LeanCanvasBlock[]
  weight?: number
}

export type LeanCanvas = {
  top: LeanCanvasColumn[]
  bottom: LeanCanvasColumn[]
}

const socios: LeanCanvasBlock = {
  id: 'socios',
  title: 'Socios Clave',
  shortText: 'Centros de rescate + transporte',
  fullText:
    'Rabito Callejero, AdoptameRD, PetTransportRD y PetPickup, junto a entrenadores y paseadores, conforman un ecosistema donde ya existen soluciones parciales para el cuidado de mascotas.',
}

const actividades: LeanCanvasBlock = {
  id: 'actividades',
  title: 'Actividades Clave',
  shortText: 'Desarrollo y contenido visual',
  fullText:
    'Desarrollo y mantenimiento de una aplicación multiplataforma que centraliza servicios, producción de contenido visual profesional, y apoyo a paseadores, entrenadores y transporte.',
}

const recursos: LeanCanvasBlock = {
  id: 'recursos',
  title: 'Recursos Clave',
  shortText: 'Mac Mini, cámaras, jaulas',
  fullText:
    'Mac Mini, vehículo, jaulas, kit de luces, cámaras y micrófonos para producción de contenido visual que alimenta el catálogo de mascotas.',
}

const propuesta: LeanCanvasBlock = {
  id: 'propuesta',
  title: 'Propuesta de Valor',
  shortText: 'Un solo lugar para todo',
  fullText:
    'Simplificar la burocracia y gestión de procesos relacionados con mascotas mediante la organización y estandarización de trámites, conectando dueños con empresas que satisfacen sus necesidades.',
}

const relacion: LeanCanvasBlock = {
  id: 'relacion',
  title: 'Relación',
  shortText: 'Conexión estructurada',
  fullText:
    'Conectar centros de rescate con adoptantes, y dueños con paseadores, entrenadores o taxistas de mascotas, dando estructura y organización a procesos informales.',
}

const canales: LeanCanvasBlock = {
  id: 'canales',
  title: 'Canales',
  shortText: 'Web + app + redes',
  fullText:
    'App móvil (App Store / Google Play), versión web, escritorio Electron, y redes sociales para captación y educación del mercado.',
}

const segmentos: LeanCanvasBlock = {
  id: 'segmentos',
  title: 'Segmentos',
  shortText: 'Adoptantes, centros, negocios',
  fullText:
    'Adoptantes de mascotas, centros de rescate, entrenadores, paseadores y empresas de transporte que buscan conectarse de forma eficiente dentro de un ecosistema organizado.',
}

const costos: LeanCanvasBlock = {
  id: 'costos',
  title: 'Costos',
  shortText: 'Dev, infra, licencias',
  fullText:
    'Membresía Claude Code Max, Apple Developer Program, Cloudflare R2, Google Maps Platform, servidores y servicios de email transaccional. ~USD$130/mes.',
}

const ingresos: LeanCanvasBlock = {
  id: 'ingresos',
  title: 'Ingresos',
  shortText: 'Membresías + comisiones',
  fullText:
    'Planes Básico / Intermedio / Premium / Flexible, comisiones sobre servicios de terceros (baños, paseos, transporte, vacunación), y tarifa dinámica de transporte.',
}

export const LEAN_CANVAS: LeanCanvas = {
  top: [
    { id: 'col-socios', cells: [socios] },
    { id: 'col-actividades-recursos', cells: [actividades, recursos] },
    { id: 'col-propuesta', cells: [propuesta] },
    { id: 'col-relacion-canales', cells: [relacion, canales] },
    { id: 'col-segmentos', cells: [segmentos] },
  ],
  bottom: [
    { id: 'col-costos', cells: [costos], weight: 2 },
    { id: 'col-ingresos', cells: [ingresos], weight: 3 },
  ],
}
```

- [ ] **Step 4: Run the content test to verify it passes**

Run: `npx vitest run components/__tests__/about/lean-canvas-content.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Type-check the rest of the codebase**

The old `LEAN_CANVAS` shape was `LeanCanvasBlock[]`. The current `scene-06-lean-canvas.tsx` iterates it flat. This task intentionally breaks that — Task 5 rewrites scene 6. In the meantime, verify the failure surface:

Run: `npx tsc --noEmit`
Expected: type errors in `components/about/scenes/scene-06-lean-canvas.tsx` only (e.g. "Property 'map' does not exist on type 'LeanCanvas'"). These are fixed in Task 5.

- [ ] **Step 6: Commit**

```bash
git add lib/about/lean-canvas-content.ts components/__tests__/about/lean-canvas-content.test.ts
git commit -m "refactor(about): restructure lean canvas content to nested shape"
```

---

## Task 2: CSS module for lean canvas grid

**Files:**
- Create: `components/about/lean-canvas-grid.module.css`

- [ ] **Step 1: Write the CSS module**

Full file content:

```css
.scene {
  --lc-expand-ratio: 3;
  --lc-expand-duration: 500ms;
  --lc-expand-easing: cubic-bezier(.2, .8, .2, 1);
  --lc-color-duration: 300ms;
  --lc-text-fade-in: 300ms;
  --lc-text-fade-out: 150ms;
  --lc-text-expand: 400ms;

  --lc-border: var(--border);
  --lc-accent: var(--color-pop-550);
  --lc-bg: var(--background);
  --lc-bg-hover: var(--background);
  --lc-ink: var(--foreground);
  --lc-ink-muted: color-mix(in oklch, var(--foreground) 70%, transparent);
  --lc-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.18);
}

.grid {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.row {
  display: flex;
  width: 100%;
}

.rowTop {
  height: min(60vh, 32rem);
}

.rowBottom {
  height: min(22vh, 12rem);
}

.col {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: flex-grow var(--lc-expand-duration) var(--lc-expand-easing);
}

.col:hover,
.col:has(.cell:hover),
.col:has(.cell:focus-visible),
.col:has(.cell[data-locked='true']) {
  flex-grow: var(--lc-expand-ratio);
}

.cell {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  margin: -0.5px;
  padding: 1rem 1.25rem;
  background: var(--lc-bg);
  border: 1px solid var(--lc-border);
  color: var(--lc-ink);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  font: inherit;
  position: relative;
  transition:
    flex-grow var(--lc-expand-duration) var(--lc-expand-easing),
    background-color var(--lc-color-duration),
    border-color var(--lc-color-duration),
    box-shadow var(--lc-color-duration);
}

.cell:hover,
.cell:focus-visible,
.cell[data-locked='true'] {
  flex-grow: var(--lc-expand-ratio);
  background: var(--lc-bg-hover);
  border-color: var(--lc-accent);
  box-shadow: var(--lc-shadow);
  z-index: 2;
}

.cell:focus-visible {
  outline: 2px solid var(--lc-accent);
  outline-offset: -4px;
}

.cellTitle {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--lc-accent);
  margin: 0;
}

.short {
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--lc-ink-muted);
  margin: 0;
  opacity: 1;
  max-height: 10rem;
  transition:
    opacity var(--lc-text-fade-out),
    max-height var(--lc-text-fade-out);
}

.full {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--lc-ink);
  margin: 0;
  opacity: 0;
  max-height: 0;
  transition:
    opacity var(--lc-text-fade-in),
    max-height var(--lc-text-expand);
}

.cell:hover .short,
.cell:focus-visible .short,
.cell[data-locked='true'] .short {
  opacity: 0;
  max-height: 0;
}

.cell:hover .full,
.cell:focus-visible .full,
.cell[data-locked='true'] .full {
  opacity: 1;
  max-height: 20rem;
}

@media (prefers-reduced-motion: reduce) {
  .col,
  .cell,
  .short,
  .full {
    transition: none !important;
  }
  .short {
    opacity: 0;
    max-height: 0;
  }
  .full {
    opacity: 1;
    max-height: 20rem;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/lean-canvas-grid.module.css
git commit -m "feat(about): add lean canvas grid css module"
```

---

## Task 3: LeanCanvasGrid component — structure + button semantics (no lock yet)

**Files:**
- Create: `components/about/lean-canvas-grid.tsx`
- Create: `components/__tests__/about/lean-canvas-grid.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/lean-canvas-grid.test.tsx`
Expected: FAIL — module `@/components/about/lean-canvas-grid` does not exist.

- [ ] **Step 3: Create `components/about/lean-canvas-grid.tsx` (minimal, no lock logic yet)**

```tsx
'use client'

import { LEAN_CANVAS, type LeanCanvasBlock, type LeanCanvasColumn } from '@/lib/about/lean-canvas-content'
import styles from './lean-canvas-grid.module.css'

type RowKey = 'top' | 'bottom'

export function LeanCanvasGrid() {
  return (
    <div className={styles.scene}>
      <div className={styles.grid}>
        <Row rowKey="top" columns={LEAN_CANVAS.top} className={styles.rowTop} />
        <Row rowKey="bottom" columns={LEAN_CANVAS.bottom} className={styles.rowBottom} />
      </div>
    </div>
  )
}

function Row({
  rowKey,
  columns,
  className,
}: {
  rowKey: RowKey
  columns: LeanCanvasColumn[]
  className: string
}) {
  return (
    <div className={`${styles.row} ${className}`} data-lc-row={rowKey}>
      {columns.map((col) => (
        <div
          key={col.id}
          data-lc-col={col.id}
          className={styles.col}
          style={col.weight ? { flexGrow: col.weight } : undefined}
        >
          {col.cells.map((cell) => (
            <Cell key={cell.id} cell={cell} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Cell({ cell }: { cell: LeanCanvasBlock }) {
  return (
    <button
      type="button"
      className={styles.cell}
      data-lc-cell={cell.id}
      aria-label={cell.title}
    >
      <span className={styles.cellTitle}>{cell.title}</span>
      <span className={styles.short}>{cell.shortText}</span>
      <span className={styles.full}>{cell.fullText}</span>
    </button>
  )
}
```

- [ ] **Step 4: Run the grid tests to verify they pass**

Run: `npx vitest run components/__tests__/about/lean-canvas-grid.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add components/about/lean-canvas-grid.tsx components/__tests__/about/lean-canvas-grid.test.tsx
git commit -m "feat(about): add lean canvas grid component with nested structure"
```

---

## Task 4: Click-to-lock state + Escape + click-outside + intersection-clear

**Files:**
- Modify: `components/about/lean-canvas-grid.tsx`
- Modify: `components/__tests__/about/lean-canvas-grid.test.tsx`

- [ ] **Step 1: Add failing tests for lock behavior**

Append to `components/__tests__/about/lean-canvas-grid.test.tsx`:

```tsx
import { fireEvent } from '@testing-library/react'

describe('LeanCanvasGrid — click-to-lock', () => {
  beforeEach(() => {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return [] }
    }
    // @ts-expect-error jsdom stub
    window.IntersectionObserver = MockIntersectionObserver
  })

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/__tests__/about/lean-canvas-grid.test.tsx`
Expected: FAIL — no `aria-pressed` on buttons yet, no click handler, no Escape/click-outside handling.

- [ ] **Step 3: Replace `components/about/lean-canvas-grid.tsx` with the full version**

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LEAN_CANVAS, type LeanCanvasBlock, type LeanCanvasColumn } from '@/lib/about/lean-canvas-content'
import styles from './lean-canvas-grid.module.css'

type RowKey = 'top' | 'bottom'

export function LeanCanvasGrid() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [lockedId, setLockedId] = useState<string | null>(null)

  const toggleLock = useCallback((id: string) => {
    setLockedId((current) => (current === id ? null : id))
  }, [])

  useEffect(() => {
    if (lockedId === null) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLockedId(null)
    }
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setLockedId(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocMouseDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocMouseDown)
    }
  }, [lockedId])

  useEffect(() => {
    if (!rootRef.current) return
    const el = rootRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) setLockedId(null)
        }
      },
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={styles.scene}>
      <div className={styles.grid}>
        <Row
          rowKey="top"
          columns={LEAN_CANVAS.top}
          className={styles.rowTop}
          lockedId={lockedId}
          onToggle={toggleLock}
        />
        <Row
          rowKey="bottom"
          columns={LEAN_CANVAS.bottom}
          className={styles.rowBottom}
          lockedId={lockedId}
          onToggle={toggleLock}
        />
      </div>
    </div>
  )
}

function Row({
  rowKey,
  columns,
  className,
  lockedId,
  onToggle,
}: {
  rowKey: RowKey
  columns: LeanCanvasColumn[]
  className: string
  lockedId: string | null
  onToggle: (id: string) => void
}) {
  return (
    <div className={`${styles.row} ${className}`} data-lc-row={rowKey}>
      {columns.map((col) => (
        <div
          key={col.id}
          data-lc-col={col.id}
          className={styles.col}
          style={col.weight ? { flexGrow: col.weight } : undefined}
        >
          {col.cells.map((cell) => (
            <Cell key={cell.id} cell={cell} locked={lockedId === cell.id} onToggle={onToggle} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Cell({
  cell,
  locked,
  onToggle,
}: {
  cell: LeanCanvasBlock
  locked: boolean
  onToggle: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={styles.cell}
      data-lc-cell={cell.id}
      data-locked={locked ? 'true' : 'false'}
      aria-label={cell.title}
      aria-pressed={locked}
      onClick={() => onToggle(cell.id)}
    >
      <span className={styles.cellTitle}>{cell.title}</span>
      <span className={styles.short}>{cell.shortText}</span>
      <span className={styles.full}>{cell.fullText}</span>
    </button>
  )
}
```

- [ ] **Step 4: Run the grid tests to verify they pass**

Run: `npx vitest run components/__tests__/about/lean-canvas-grid.test.tsx`
Expected: PASS, 9 tests total (4 structure + 5 lock).

- [ ] **Step 5: Commit**

```bash
git add components/about/lean-canvas-grid.tsx components/__tests__/about/lean-canvas-grid.test.tsx
git commit -m "feat(about): add click-to-lock and escape/outside handlers to lean canvas grid"
```

---

## Task 5: Rewrite scene 6 to use LeanCanvasGrid

**Files:**
- Modify: `components/about/scenes/scene-06-lean-canvas.tsx`

- [ ] **Step 1: Replace the scene file**

Full replacement of `components/about/scenes/scene-06-lean-canvas.tsx`:

```tsx
'use client'

import { LeanCanvasGrid } from '../lean-canvas-grid'
import { LEAN_CANVAS } from '@/lib/about/lean-canvas-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene06LeanCanvas() {
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const useGrid = isDesktop && !reduced

  return (
    <section
      data-scene="06-lean-canvas"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">El modelo</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">Lean Canvas</h2>

        {useGrid ? (
          <LeanCanvasGrid />
        ) : (
          <div className="space-y-4">
            {[...LEAN_CANVAS.top.flatMap((c) => c.cells), ...LEAN_CANVAS.bottom.flatMap((c) => c.cells)].map(
              (block) => (
                <div key={block.id} className="rounded-2xl border border-border p-4">
                  <h4 className="text-sm font-bold mb-2">{block.title}</h4>
                  <p className="text-xs text-foreground/80">{block.fullText}</p>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run type-check to verify no errors**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 3: Run the scenes smoke test**

Run: `npx vitest run components/__tests__/about/scenes.smoke.test.tsx`
Expected: PASS — scene 6 still mounts without errors under the provider wrapper.

- [ ] **Step 4: Run the full about test suite**

Run: `npx vitest run components/__tests__/about/`
Expected: PASS across all files (lean-canvas-content, lean-canvas-grid, scenes.smoke, empathy-map, header-bridge-context, use-breakpoint, use-reduced-motion).

- [ ] **Step 5: Commit**

```bash
git add components/about/scenes/scene-06-lean-canvas.tsx
git commit -m "feat(about): wire scene 6 to LeanCanvasGrid with mobile fallback"
```

---

## Task 6: Manual browser verification

**Files:** none

- [ ] **Step 1: Start the dev server (or assume it is running per CLAUDE.md)**

The user typically has `bun run dev` running. Confirm at `http://localhost:3000/about` by scrolling to scene 6 ("Lean Canvas").

- [ ] **Step 2: Verify desktop interactions (≥768px viewport)**

Manual checklist — test each in the browser:
  - [ ] All 9 lean canvas cells render with no visible gaps between borders.
  - [ ] Hovering a single-cell column (Socios, Propuesta, Segmentos) widens the whole column.
  - [ ] Hovering a stacked-column cell (Actividades, Recursos, Relación, Canales) widens the parent column AND grows that cell vertically within the column.
  - [ ] Hovering Costos / Ingresos in the bottom row widens them with 2:3 base ratio.
  - [ ] Tab key moves focus through all 9 cells in DOM order; focused cell shows the same expansion as hover.
  - [ ] Clicking a cell locks it (stays expanded when mouse moves away); clicking again unlocks.
  - [ ] Pressing Escape while locked clears the lock.
  - [ ] Clicking outside the grid (e.g. on the scene heading) clears the lock.
  - [ ] Scrolling the scene out of view clears any active lock; scrolling back shows unlocked state.
  - [ ] Short text fades out and full text fades in on expand; reverses on collapse.

- [ ] **Step 3: Verify mobile fallback (<768px viewport)**

In DevTools device emulation or narrow the window below 768px:
  - [ ] `LeanCanvasGrid` is not rendered; the stacked card list is shown instead.
  - [ ] Every card shows `fullText` by default with no hover requirement.

- [ ] **Step 4: Verify reduced-motion fallback**

Enable "prefers-reduced-motion: reduce" via DevTools rendering pane (Chrome: More tools → Rendering → Emulate CSS media feature prefers-reduced-motion → reduce):
  - [ ] Reload the about page.
  - [ ] Scene 6 mobile stacked list is shown (scene 6 branches on `reduced` and skips the grid, per Task 5 logic).
  - [ ] No jarring transitions anywhere else in scene 6.

- [ ] **Step 5: No commit for this task** — manual verification only.

---

## Task 7: Lint and cleanup

**Files:** none (verification)

- [ ] **Step 1: Run lint**

Run: `bun run lint`
Expected: PASS, no new warnings or errors introduced by the lean canvas files.

- [ ] **Step 2: Run full test suite once more**

Run: `npx vitest run`
Expected: PASS across all tests.

- [ ] **Step 3: Commit any formatting fixes if needed**

If lint made any autofixes:

```bash
git add -u
git commit -m "chore(about): lint fixes for lean canvas grid"
```

Otherwise skip this commit.

---

## Self-Review Notes

**Spec coverage check:**
- Layout (top 5-col with stacked middles + bottom 2-col 2:3) → Task 1 data + Task 2 CSS + Task 3 rendering ✓
- Data model restructure → Task 1 ✓
- Hover / focus / lock expansion rules → Task 2 CSS + Task 4 React state ✓
- Click-outside, Escape, IntersectionObserver cleanup → Task 4 ✓
- Tunable CSS custom properties → Task 2 ✓
- Focus behavior C (button semantics, aria-pressed, focus-visible) → Task 3 + Task 4 ✓
- Mobile fallback → Task 5 ✓
- Reduced motion → Task 2 CSS `@media` + Task 5 branch ✓
- Tests for rendering, button semantics, lock toggle, Escape, click-outside → Task 3 + Task 4 ✓
- Browser support note (`:has()`) → addressed in spec, no implementation impact

**Placeholder scan:** No TBDs, no "add error handling", no "similar to Task N" references — every step has complete code.

**Type consistency:** `LeanCanvas`, `LeanCanvasColumn`, `LeanCanvasBlock`, `LEAN_CANVAS.top`, `LEAN_CANVAS.bottom`, `col.weight`, `col.cells`, `cell.id/title/shortText/fullText` — all used consistently across tasks 1, 3, 4, 5.
