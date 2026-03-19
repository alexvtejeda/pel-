'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TransportPage } from '@/components/transport/transport-page'

function TransportContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('pet_id') ?? undefined
  const conversationId = searchParams?.get('conversation_id') ?? undefined
  return <TransportPage initialPetId={petId} conversationId={conversationId} />
}

export default function Page() {
  return (
    <Suspense>
      <TransportContent />
    </Suspense>
  )
}
