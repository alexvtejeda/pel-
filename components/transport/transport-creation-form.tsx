'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faTruckFast, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/lib/contexts/auth-context'
import { requestTrip, quoteTrip, Trip, Point, TripQuote, MarketplaceBusiness } from '@/lib/api/transport'
import { geocodeAddress } from '@/lib/geocode'
import { listUserPets } from '@/lib/api/user-pets'
import { listPets } from '@/lib/api/pets'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'
import { TransportBusinessPicker } from '@/components/transport/transport-business-picker'

/**
 * Carries the pricing inputs alongside the label. Mapping a pet down to
 * {id, name} here is what would make the picker quote a bandless price while the
 * confirmation quotes a banded one.
 */
interface PetOption {
  id: string
  name: string
  size?: string | null
  weight_lb?: number | null
}

interface TransportCreationFormProps {
  initialPetId?: string
  conversationId?: string
  onTripCreated: (trip: Trip) => void
}

export function TransportCreationForm({ initialPetId, conversationId, onTripCreated }: TransportCreationFormProps) {
  const { t } = useTranslation('transport')
  const { user } = useAuth()
  const [pets, setPets] = useState<PetOption[]>([])
  const [selectedPetId, setSelectedPetId] = useState(initialPetId ?? '')
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [pickupCoords, setPickupCoords] = useState<Point | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<Point | null>(null)
  const [pickupError, setPickupError] = useState('')
  const [dropoffError, setDropoffError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [business, setBusiness] = useState<MarketplaceBusiness | null>(null)
  const [finalQuote, setFinalQuote] = useState<TripQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Members own pets in `user_pets`, rescue centers in `pets` — this decides
  // both which list to load and which id key the request is sent under.
  const isMember = user?.role === 'member'

  // Load pets based on role
  useEffect(() => {
    async function loadPets() {
      if (user?.role === 'member') {
        const { data } = await listUserPets()
        if (data) setPets(data.map(p => ({ id: p.id, name: p.name, size: p.size, weight_lb: p.weight_lb })))
      } else if (user?.role === 'rescue_center') {
        const { data: rc } = await getMyRescueCenter()
        if (rc) {
          try {
            const rcPets = await listPets(rc.id)
            setPets(rcPets.map(p => ({ id: p.id, name: p.name, size: p.size, weight_lb: p.weight_lb })))
          } catch {
            // listPets throws on failure (known exception to {data, error} pattern)
          }
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

  const clearSelection = () => {
    setBusiness(null)
    setFinalQuote(null)
  }

  const addressesReady = !!pickupAddress && !!dropoffAddress && !!selectedPetId

  /*
    One lookup feeding the picker fan-out, the quote and the request, so all three
    price the same pet. `null` collapses to `undefined` because the backend reads
    an absent field as "fall back to the other input", while a null would be sent
    as a value.
  */
  const selectedPet = pets.find(p => p.id === selectedPetId)
  const petSize = selectedPet?.size ?? undefined
  const petWeightLb = selectedPet?.weight_lb ?? undefined

  // Step 1: geocode both addresses, then open the businesses picker.
  const handleChooseTransporter = async () => {
    setPickupError('')
    setDropoffError('')
    setSubmitError('')
    setGeocoding(true)
    const [pickup, dropoff] = await Promise.all([geocodeAddress(pickupAddress), geocodeAddress(dropoffAddress)])
    setGeocoding(false)
    if (!pickup) { setPickupError(t('form.address_not_found')); return }
    if (!dropoff) { setDropoffError(t('form.address_not_found')); return }
    setPickupCoords(pickup)
    setDropoffCoords(dropoff)
    setPickerOpen(true)
  }

  // Step 2: business chosen — fetch an authoritative quote for the submit button.
  const handleBusinessSelected = async (b: MarketplaceBusiness) => {
    setBusiness(b)
    setPickerOpen(false)
    setFinalQuote(null)
    if (!pickupCoords || !dropoffCoords) return
    setQuoting(true)
    const { data } = await quoteTrip({
      business_id: b.business_id,
      from: pickupCoords,
      to: dropoffCoords,
      size: petSize,
      weight_lb: petWeightLb,
    })
    setQuoting(false)
    if (data) setFinalQuote(data)
  }

  // Step 3: submit with business_id (backend derives the driver + persists the quote).
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business || !pickupCoords || !dropoffCoords) return
    setSubmitError('')
    setSubmitting(true)
    const { data, error } = await requestTrip({
      // Same role fork as the pet list above: a member's id belongs to
      // `user_pets`, a rescue center's to `pets`. Sending it under the wrong key
      // fails the backend's foreign key.
      ...(isMember ? { user_pet_id: selectedPetId } : { pet_id: selectedPetId }),
      pet_description: selectedPet?.name ?? '',
      // The same inputs the quote above was priced with, so the persisted price
      // matches the one the user agreed to.
      size: petSize,
      weight_lb: petWeightLb,
      business_id: business.business_id,
      pickup_address: pickupAddress,
      pickup_lat: pickupCoords.lat,
      pickup_lng: pickupCoords.lng,
      stops: [
        { address: pickupAddress, lat: pickupCoords.lat, lng: pickupCoords.lng },
        { address: dropoffAddress, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
      ],
      ...(conversationId ? { conversation_id: conversationId } : {}),
    })
    if (error || !data) {
      setSubmitError(error || t('form.error_creating'))
      setSubmitting(false)
      return
    }
    onTripCreated(data)
  }

  const submitLabel = quoting
    ? t('form.quoting')
    : finalQuote
      ? t('form.request_with_price', { price: Math.round(finalQuote.estimated_price) }) +
        (finalQuote.routing_degraded ? ` (${t('marketplace.approx')})` : '')
      : t('form.request_transport')

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 mx-auto max-w-lg sm:max-w-xl md:max-w-2xl">
      {pickupCoords && dropoffCoords && (
        <TransportBusinessPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          lat={pickupCoords.lat}
          lng={pickupCoords.lng}
          from={pickupCoords}
          to={dropoffCoords}
          onSelect={handleBusinessSelected}
        />
      )}
      <form onSubmit={handleSubmit} className="bg-primary/95 backdrop-blur-xl rounded-2xl border border-pop-750 p-4 space-y-3">
        {/* Pickup */}
        <div>
          <input
            type="text"
            placeholder={t('form.pickup_address')}
            value={pickupAddress}
            onChange={e => { setPickupAddress(e.target.value); clearSelection() }}
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
            onChange={e => { setDropoffAddress(e.target.value); clearSelection() }}
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

        {/* Choose transporter / chosen business */}
        {business ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          >
            <span className="truncate">{business.name}</span>
            <span className="text-muted-foreground shrink-0 ml-2">{t('form.change_transporter')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleChooseTransporter}
            disabled={!addressesReady || geocoding}
            className="w-full bg-background border border-border text-foreground py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={geocoding ? faSpinner : faTruckFast} className={`text-sm ${geocoding ? 'animate-spin' : ''}`} />
            {t('form.choose_transporter')}
          </button>
        )}

        {/* Submit error */}
        {submitError && <p className="text-red-500 text-xs">{submitError}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={!business || submitting || quoting}
          className="w-full bg-pop-500 text-background py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={submitting || quoting ? faSpinner : faPaperPlane} className={`text-sm ${submitting || quoting ? 'animate-spin' : ''}`} />
          {submitLabel}
        </button>

        {/* Directory link */}
        <Link href="/transporte/negocios" className="block text-center text-xs text-background/70 hover:text-background">
          {t('directory.view_link')}
        </Link>
      </form>
    </div>
  )
}
