'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { TripStop, DriverLocation } from '@/lib/api/transport'

const DEFAULT_CENTER: [number, number] = [18.4861, -69.9312]
const DEFAULT_ZOOM = 13

function createStopIcon(color: string, completed: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #0d1117;opacity:${completed ? 0.5 : 1}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:var(--color-pop-500, #2dd4bf);border:3px solid white;box-shadow:0 0 12px rgba(45,212,191,0.5)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function FitBounds({ stops, driverLocation }: { stops: TripStop[]; driverLocation: DriverLocation | null }) {
  const map = useMap()
  const prevStopsKey = useRef('')

  useEffect(() => {
    const stopsKey = stops.map(s => `${s.id}:${s.completed_at || ''}`).join(',')
    if (stopsKey === prevStopsKey.current) return
    prevStopsKey.current = stopsKey

    const points: [number, number][] = stops.map(s => [s.lat, s.lng])
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng])
    if (points.length > 0) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 15 })
    }
  }, [map, stops, driverLocation])
  return null
}

interface TransportMapProps {
  stops: TripStop[]
  driverLocation: DriverLocation | null
  tripStatus: string | null
}

export default function TransportMap({ stops, driverLocation, tripStatus }: TransportMapProps) {
  const positions: [number, number][] = stops.map(s => [s.lat, s.lng])

  return (
    <MapContainer
      center={stops.length > 0 ? [stops[0].lat, stops[0].lng] : DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full z-0"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

      {stops.map((stop, i) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={createStopIcon(
            i === stops.length - 1 ? '#f97316' : 'var(--color-pop-500, #2dd4bf)',
            !!stop.completed_at
          )}
        />
      ))}

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon} />
      )}

      {positions.length >= 2 && (
        <Polyline positions={positions} pathOptions={{ color: '#2dd4bf', dashArray: '6,4', opacity: 0.6, weight: 2.5 }} />
      )}

      <FitBounds stops={stops} driverLocation={driverLocation} />
    </MapContainer>
  )
}
