'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'

function AdoptContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('id') ?? ''
  return <AdoptPetPage petId={petId} />
}

export default function Page() {
  return (
    <Suspense>
      <AdoptContent />
    </Suspense>
  )
}
