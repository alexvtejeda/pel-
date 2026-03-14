'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faMapMarkerAlt, faPhone } from '@fortawesome/free-solid-svg-icons'
import { RescueCenter } from '@/lib/api/rescue-centers'
import * as adminApi from '@/lib/api/admin'

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected'

const statusLabels: Record<StatusFilter, string> = {
  all: 'Todos',
  pending: 'Pendientes',
  active: 'Activos',
  rejected: 'Rechazados',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  active: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
}

const statusText: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  rejected: 'Rechazado',
}

export function RescueCentersTab() {
  const [centers, setCenters] = useState<RescueCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

  // Reject state
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    adminApi.listAllRescueCenters().then(({ data, error: err }) => {
      if (err || !data) { setError(err || 'Error'); setLoading(false); return }
      setCenters(data)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? centers : centers.filter(c => c.status === filter)

  const handleApprove = async (id: string) => {
    const { data, error: err } = await adminApi.approveRescueCenter(id)
    if (err || !data) return
    setCenters(prev => prev.map(c => c.id === id ? data : c))
  }

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return
    const { data, error: err } = await adminApi.rejectRescueCenter(id, rejectReason.trim())
    if (err || !data) return
    setCenters(prev => prev.map(c => c.id === id ? data : c))
    setRejectingId(null)
    setRejectReason('')
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await adminApi.deleteRescueCenter(id)
    if (err) return
    setCenters(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm py-8 text-center">{error}</p>
  }

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {(Object.keys(statusLabels) as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No hay centros de rescate{filter !== 'all' ? ` con estado "${statusLabels[filter].toLowerCase()}"` : ''}.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((center) => (
            <div key={center.id} className="rounded-2xl border bg-card p-5 space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{center.name}</h3>
                  <p className="text-sm text-muted-foreground">{center.rnc || ''}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${statusColors[center.status] || ''}`}>
                  {statusText[center.status] || center.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 h-3.5" />
                  <span>{center.address}, {center.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faPhone} className="w-3.5 h-3.5" />
                  <span>{center.phone}</span>
                </div>
                {center.website && <p className="text-xs truncate">{center.website}</p>}
                {center.instagram && <p className="text-xs">{center.instagram}</p>}
              </div>

              {/* Reject reason */}
              {center.status === 'rejected' && center.reject_reason && (
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
                  Razón: {center.reject_reason}
                </p>
              )}

              {/* Reject inline input */}
              {rejectingId === center.id && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Razón del rechazo..."
                    className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(center.id)}
                      disabled={!rejectReason.trim()}
                      className="flex-1 py-1.5 px-3 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason('') }}
                      className="flex-1 py-1.5 px-3 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {rejectingId !== center.id && (
                <div className="flex gap-2">
                  {center.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(center.id)}
                        className="flex-1 py-1.5 px-3 bg-green-500/20 border border-green-500/40 rounded-xl text-sm font-medium text-green-500 hover:bg-green-500/30 transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectingId(center.id)}
                        className="flex-1 py-1.5 px-3 bg-destructive/20 border border-destructive/40 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/30 transition-colors"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDeletingId(center.id)}
                    className="py-1.5 px-3 border border-input rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 border shadow-lg">
            <h3 className="font-semibold">¿Eliminar centro de rescate?</h3>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará el centro de rescate y todos sus datos.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 px-4 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 px-4 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
