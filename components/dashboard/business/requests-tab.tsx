'use client'

import { useState, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faSpinner,
  faCircle,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trip, listTrips, acceptTrip, cancelTrip, declineTrip, updateTripStatus } from '@/lib/api/transport'
import { toast } from 'sonner'

// Extended statuses the backend may return for driver role
type ExtendedStatus = 'requested' | 'accepted' | 'picking_up' | 'in_transit' | 'completed' | 'cancelled'
type FilterStatus = 'all' | ExtendedStatus

const STATUS_LABELS: Record<ExtendedStatus, string> = {
  requested: 'Pendiente',
  accepted: 'Aceptado',
  picking_up: 'En curso',
  in_transit: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const STATUS_CLASSES: Record<ExtendedStatus, string> = {
  requested: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  picking_up: 'bg-purple-100 text-purple-700',
  in_transit: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-destructive/10 text-destructive',
}

function getTripStatus(trip: Trip): ExtendedStatus {
  return (trip.status as unknown as ExtendedStatus)
}

function getPickupAddress(trip: Trip): string {
  const first = trip.stops?.[0]
  return first?.address || '—'
}

function getDropoffAddress(trip: Trip): string {
  const last = trip.stops?.[trip.stops.length - 1]
  return last?.address || '—'
}

function buildWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
}

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

// ─── Filter Pill Bar ───────────────────────────────────────────

const FILTER_OPTIONS: FilterStatus[] = ['all', 'requested', 'accepted', 'picking_up', 'in_transit', 'completed', 'cancelled']

interface FilterBarProps {
  current: FilterStatus
  onChange: (f: FilterStatus) => void
}

function FilterBar({ current, onChange }: FilterBarProps) {
  const { t } = useTranslation('business')

  const label = (f: FilterStatus): string => {
    if (f === 'all') return t('requests.filter_all')
    return STATUS_LABELS[f]
  }

  return (
    <div className="flex items-center gap-2 bg-muted rounded-2xl px-3 py-2 overflow-x-auto scrollbar-none">
      {FILTER_OPTIONS.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`shrink-0 px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
            current === f
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label(f)}
        </button>
      ))}
    </div>
  )
}

// ─── Trip Card ─────────────────────────────────────────────────

interface TripCardProps {
  trip: Trip
  onClick: () => void
}

function TripCard({ trip, onClick }: TripCardProps) {
  const status = getTripStatus(trip)
  const pickup = getPickupAddress(trip)
  const dropoff = getDropoffAddress(trip)

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border bg-card p-4 space-y-2 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Pickup */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCircle} className="text-xs text-green-500 shrink-0" />
            <span className="text-sm truncate">{pickup}</span>
          </div>
          {/* Dropoff */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLocationDot} className="text-xs text-red-500 shrink-0" />
            <span className="text-sm truncate">{dropoff}</span>
          </div>
        </div>
        {/* Status badge */}
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-xl ${STATUS_CLASSES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      {/* Time ago */}
      <p className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(trip.created_at), { addSuffix: true, locale: es })}
      </p>
    </button>
  )
}

// ─── Detail View ───────────────────────────────────────────────

interface DetailViewProps {
  trip: Trip
  onBack: () => void
  onTripUpdated: (trip: Trip) => void
}

function DetailView({ trip, onBack, onTripUpdated }: DetailViewProps) {
  const { t } = useTranslation('business')
  const [acting, setActing] = useState(false)

  const status = getTripStatus(trip)
  const pickup = getPickupAddress(trip)
  const dropoff = getDropoffAddress(trip)
  const pickupStop = trip.stops?.[0]
  const dropoffStop = trip.stops?.[trip.stops.length - 1]

  const showMapLinks = status === 'accepted' || status === 'picking_up' || status === 'in_transit'

  const handleAccept = async () => {
    setActing(true)
    const { data } = await acceptTrip(trip.id)
    if (data) onTripUpdated(data)
    setActing(false)
  }

  const handleReject = async () => {
    setActing(true)
    const { data } = trip.business_id ? await declineTrip(trip.id) : await cancelTrip(trip.id)
    if (data) {
      onTripUpdated(data)
      toast.success(t('requests.reject_success'))
    }
    setActing(false)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    setActing(true)
    const { data } = await updateTripStatus(trip.id, newStatus)
    if (data) onTripUpdated(data)
    setActing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-accent rounded-xl transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-base" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-muted-foreground truncate">
            {formatDistanceToNow(new Date(trip.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-xl ${STATUS_CLASSES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Addresses */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <FontAwesomeIcon icon={faCircle} className="text-sm text-green-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t('requests.pickup')}</p>
            <p className="text-sm font-medium">{pickup}</p>
          </div>
        </div>
        <div className="border-t border-border" />
        <div className="flex items-start gap-3">
          <FontAwesomeIcon icon={faLocationDot} className="text-sm text-red-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t('requests.dropoff')}</p>
            <p className="text-sm font-medium">{dropoff}</p>
          </div>
        </div>
      </div>

      {/* Map deep links */}
      {showMapLinks && dropoffStop && (
        <div className="flex gap-3">
          <a
            href={buildWazeUrl(dropoffStop.lat, dropoffStop.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-4 py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            {t('requests.open_in_waze')}
          </a>
          <a
            href={buildMapsUrl(dropoffStop.lat, dropoffStop.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-4 py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            {t('requests.open_in_maps')}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-border pt-4 space-y-3">
        {status === 'requested' && (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleReject}
              disabled={acting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-40"
            >
              {t('requests.reject')}
            </button>
            <button
              onClick={handleAccept}
              disabled={acting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              {acting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : t('requests.accept')}
            </button>
          </div>
        )}

        {status === 'accepted' && (
          <button
            onClick={() => handleStatusUpdate('picking_up')}
            disabled={acting}
            className="w-full px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40"
          >
            {acting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : t('requests.status_update.picking_up')}
          </button>
        )}

        {status === 'picking_up' && (
          <button
            onClick={() => handleStatusUpdate('in_transit')}
            disabled={acting}
            className="w-full px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40"
          >
            {acting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : t('requests.status_update.in_transit')}
          </button>
        )}

        {status === 'in_transit' && (
          <button
            onClick={() => handleStatusUpdate('completed')}
            disabled={acting}
            className="w-full px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
          >
            {acting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : t('requests.status_update.completed')}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Tab ──────────────────────────────────────────────────

export function RequestsTab() {
  const { t } = useTranslation('business')
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    const { data } = await listTrips('driver')
    setTrips(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true
    return getTripStatus(trip) === filter
  })

  const handleTripUpdated = (updated: Trip) => {
    setTrips(prev => prev.map(t => (t.id === updated.id ? updated : t)))
    setSelectedTrip(updated)
  }

  if (selectedTrip) {
    return (
      <DetailView
        trip={selectedTrip}
        onBack={() => setSelectedTrip(null)}
        onTripUpdated={handleTripUpdated}
      />
    )
  }

  return (
    <div className="space-y-4">
      <FilterBar current={filter} onChange={setFilter} />

      {loading && (
        <div className="flex justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="text-2xl text-muted-foreground animate-spin" />
        </div>
      )}

      {!loading && filteredTrips.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filter === 'all'
            ? t('requests.empty')
            : t('requests.empty_filtered', { status: STATUS_LABELS[filter as ExtendedStatus] })}
        </div>
      )}

      {!loading && filteredTrips.map(trip => (
        <TripCard
          key={trip.id}
          trip={trip}
          onClick={() => setSelectedTrip(trip)}
        />
      ))}
    </div>
  )
}
