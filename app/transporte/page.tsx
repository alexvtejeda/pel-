'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TransportPage } from '@/components/transport/transport-page'

function TransportContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('pet_id') ?? undefined
  return <TransportPage initialPetId={petId} />
}

export default function Page() {
  return (
    <Suspense>
      <TransportContent />
    </Suspense>
  )
}
