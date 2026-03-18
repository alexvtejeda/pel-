'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/lib/contexts/auth-context'
import { requestTrip, Trip } from '@/lib/api/transport'
import { listUserPets } from '@/lib/api/user-pets'
import { listPets } from '@/lib/api/pets'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'

interface PetOption {
  id: string
  name: string
}

interface TransportCreationFormProps {
  initialPetId?: string
  onTripCreated: (trip: Trip) => void
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Pelu-App/1.0' } }
    )
    const data = await res.json()
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function TransportCreationForm({ initialPetId, onTripCreated }: TransportCreationFormProps) {
  const { t } = useTranslation('transport')
  const { user } = useAuth()
  const [pets, setPets] = useState<PetOption[]>([])
  const [selectedPetId, setSelectedPetId] = useState(initialPetId ?? '')
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [pickupError, setPickupError] = useState('')
  const [dropoffError, setDropoffError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load pets based on role
  useEffect(() => {
    async function loadPets() {
      if (user?.role === 'member') {
        const { data } = await listUserPets()
        if (data) setPets(data.map(p => ({ id: p.id, name: p.name })))
      } else if (user?.role === 'rescue_center') {
        const { data: rc } = await getMyRescueCenter()
        if (rc) {
          const rcPets = await listPets(rc.id)
          setPets(rcPets.map(p => ({ id: p.id, name: p.name })))
        }
      }
    }
    loadPets()
  }, [user?.role])

  // Pre-select pet if initialPetId matches
  useEffect(() => {
    if (initialPetId && pets.length > 0) {
      const match = pets.find(p => p.id === initialPetId)
      if (match) setSelectedPetId(match.id)
    }
  }, [initialPetId, pets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPickupError('')
    setDropoffError('')
    setSubmitError('')
    setSubmitting(true)

    // Geocode both addresses
    const [pickupCoords, dropoffCoords] = await Promise.all([
      geocodeAddress(pickupAddress),
      geocodeAddress(dropoffAddress),
    ])

    if (!pickupCoords) {
      setPickupError(t('form.address_not_found'))
      setSubmitting(false)
      return
    }
    if (!dropoffCoords) {
      setDropoffError(t('form.address_not_found'))
      setSubmitting(false)
      return
    }

    const { data, error } = await requestTrip({
      pet_id: selectedPetId,
      stops: [
        { address: pickupAddress, lat: pickupCoords.lat, lng: pickupCoords.lng },
        { address: dropoffAddress, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
      ],
    })

    if (error || !data) {
      setSubmitError(error || t('form.error_creating'))
      setSubmitting(false)
      return
    }

    onTripCreated(data)
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20">
      <form onSubmit={handleSubmit} className="bg-sidebar/95 backdrop-blur-xl rounded-2xl border border-border p-4 space-y-3">
        {/* Pickup */}
        <div>
          <input
            type="text"
            placeholder={t('form.pickup_address')}
            value={pickupAddress}
            onChange={e => setPickupAddress(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-pop-500"
            required
          />
          {pickupError && <p className="text-red-500 text-xs mt-1">{pickupError}</p>}
        </div>

        {/* Dropoff */}
        <div>
          <input
            type="text"
            placeholder={t('form.dropoff_address')}
            value={dropoffAddress}
            onChange={e => setDropoffAddress(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-pop-500"
            required
          />
          {dropoffError && <p className="text-red-500 text-xs mt-1">{dropoffError}</p>}
        </div>

        {/* Pet selector */}
        <select
          value={selectedPetId}
          onChange={e => setSelectedPetId(e.target.value)}
          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-pop-500"
          required
        >
          <option value="">{t('form.select_pet')}</option>
          {pets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Submit error */}
        {submitError && <p className="text-red-500 text-xs">{submitError}</p>}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !selectedPetId || !pickupAddress || !dropoffAddress}
          className="w-full bg-pop-500 text-background py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
          {t('form.request_transport')}
        </button>
      </form>
    </div>
  )
}
