'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlugRedirectPage } from '@/components/pets/slug-redirect-page'

function SlugContent() {
  const searchParams = useSearchParams()
  const slug = searchParams?.get('slug') ?? ''
  return <SlugRedirectPage slug={slug} />
}

export default function Page() {
  return (
    <Suspense>
      <SlugContent />
    </Suspense>
  )
}
