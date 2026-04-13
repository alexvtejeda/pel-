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
