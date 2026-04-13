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
