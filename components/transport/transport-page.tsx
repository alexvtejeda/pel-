'use client'

import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Trip, listTrips, cancelTrip as cancelTripApi } from '@/lib/api/transport'
import { useWebSocket } from '@/lib/contexts/websocket-context'
import dynamic from 'next/dynamic'

const TransportMap = dynamic(() => import('./transport-map'), { ssr: false })
import { TransportStepper } from './transport-stepper'
import { TransportDrawer } from './transport-drawer'

type PageState = 'loading' | 'none' | 'pending' | 'active' | 'completed' | 'cancelled'

interface TransportPageProps {
  initialPetId?: string
}

export function TransportPage({ initialPetId }: TransportPageProps) {
  const { t } = useTranslation('transport')
  const { subscribe } = useWebSocket()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [trip, setTrip] = useState<Trip | null>(null)

  useEffect(() => {
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
      <TransportMap
        stops={trip?.stops ?? []}
        driverLocation={null}
        tripStatus={trip?.status ?? null}
      />
      {trip && pageState !== 'none' && (
        <TransportStepper stops={trip.stops} status={trip.status} />
      )}
      {trip && pageState !== 'none' && (
        <TransportDrawer
          trip={trip}
          driverLocation={null}
          onCancel={handleCancelTrip}
        />
      )}
    </div>
  )
}
