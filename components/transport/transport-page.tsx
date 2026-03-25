'use client'

import 'leaflet/dist/leaflet.css'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Trip, DriverLocation, listTrips, getTrip, cancelTrip as cancelTripApi } from '@/lib/api/transport'
import { useWebSocket } from '@/lib/contexts/websocket-context'
import dynamic from 'next/dynamic'

const TransportMap = dynamic(() => import('./transport-map'), { ssr: false })
import { TransportStepper } from './transport-stepper'
import { TransportDrawer } from './transport-drawer'
import { TransportCreationForm } from './transport-creation-form'

type PageState = 'loading' | 'none' | 'requested' | 'accepted' | 'picking_up' | 'in_transit' | 'completed' | 'cancelled'

interface TransportPageProps {
  initialPetId?: string
  conversationId?: string
  tripId?: string
  providerId?: string
}

export function TransportPage({ initialPetId, conversationId, tripId, providerId }: TransportPageProps) {
  const { t } = useTranslation('transport')
  const { subscribe, connected } = useWebSocket()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  const tripIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (tripId) {
      getTrip(tripId).then(({ data }) => {
        if (data) {
          setTrip(data)
          setPageState(data.status as PageState)
        } else {
          setPageState('none')
        }
      })
      return
    }
    listTrips().then(({ data }) => {
      if (!data || data.length === 0) {
        setPageState('none')
        return
      }
      const active = data
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
      if (active) {
        setTrip(active)
        setPageState(active.status as PageState)
      } else {
        setPageState('none')
      }
    })
  }, [])

  useEffect(() => {
    tripIdRef.current = trip?.id ?? null
  }, [trip?.id])

  useEffect(() => {
    const unsub = subscribe('driver_location', (data: any) => {
      if (tripIdRef.current && data.trip_id === tripIdRef.current) {
        setDriverLocation({
          trip_id: data.trip_id,
          lat: data.lat,
          lng: data.lng,
          eta_minutes: data.eta_minutes,
        })
      }
    })
    return unsub
  }, [subscribe])

  useEffect(() => {
    const unsub = subscribe('trip_status_changed', (data: any) => {
      if (tripIdRef.current && data.trip_id === tripIdRef.current) {
        setTrip(prev => prev ? { ...prev, status: data.status } : null)
        setPageState(data.status as PageState)
      }
    })
    return unsub
  }, [subscribe])

  useEffect(() => {
    const unsub = subscribe('stop_completed', (data: any) => {
      if (tripIdRef.current && data.trip_id === tripIdRef.current) {
        setTrip(prev => {
          if (!prev) return null
          return {
            ...prev,
            stops: prev.stops.map(s =>
              s.id === data.stop_id ? { ...s, completed_at: data.completed_at } : s
            ),
          }
        })
      }
    })
    return unsub
  }, [subscribe])

  const handleCancelTrip = async () => {
    if (!trip) return
    const { error } = await cancelTripApi(trip.id)
    if (!error) {
      setTrip(prev => prev ? { ...prev, status: 'cancelled' } : null)
      setPageState('cancelled')
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {!connected && trip && (trip.status === 'requested' || trip.status === 'accepted' || trip.status === 'picking_up' || trip.status === 'in_transit') && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-yellow-500/90 text-background text-center text-xs font-medium py-1.5 rounded-xl">
          {t('connection.reconnecting')}
        </div>
      )}
      <TransportMap
        stops={trip?.stops ?? []}
        driverLocation={driverLocation}
        tripStatus={trip?.status ?? null}
      />
      {trip && pageState !== 'none' && (
        <TransportStepper stops={trip.stops} status={trip.status} />
      )}
      {trip && pageState !== 'none' && (
        <TransportDrawer
          trip={trip}
          driverLocation={driverLocation}
          onCancel={handleCancelTrip}
        />
      )}
      {pageState === 'none' && (
        <TransportCreationForm
          initialPetId={initialPetId}
          conversationId={conversationId}
          providerId={providerId}
          onTripCreated={(newTrip) => {
            setTrip(newTrip)
            setPageState('requested')
          }}
        />
      )}
      {pageState === 'cancelled' && (
        <button
          onClick={() => { setTrip(null); setDriverLocation(null); setPageState('none') }}
          className="absolute bottom-24 left-4 right-4 z-20 bg-pop-500 text-background py-3 rounded-xl font-semibold text-sm"
        >
          {t('actions.new_trip')}
        </button>
      )}
    </div>
  )
}
