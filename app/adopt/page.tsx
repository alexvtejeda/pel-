'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

function AdoptContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('id') ?? ''
  return <AdoptPetPage petId={petId} />
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <PeluLoadingLogo />
        </div>
      }
    >
      <AdoptContent />
    </Suspense>
  )
}
