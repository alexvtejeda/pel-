'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pet } from '@/lib/api/pets'
import { getPetBySlug } from '@/lib/api/pets-public'
import { PetsPage } from '@/components/pets/pets-page'

export function SlugRedirectPage({ slug }: { slug: string }) {
  const router = useRouter()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      router.replace('/pets')
      return
    }
    getPetBySlug(slug).then(({ data }) => {
      if (!data) {
        router.replace('/pets')
        return
      }
      setPet(data)
      setLoading(false)
    })
  }, [slug, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-pop-550 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <PetsPage initialSelected={pet ?? undefined} />
}
