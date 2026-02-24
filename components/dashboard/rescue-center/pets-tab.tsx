'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { mockPets, MockPet } from '@/lib/data/mock-rescue-center'
import { Skeleton } from '@/components/ui/skeleton'

function StatusTag({ pet }: { pet: MockPet }) {
  if (pet.status === 'interested') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-xl bg-yellow-100 text-yellow-800">
        {pet.interestedCount} interesados
      </span>
    )
  }
  if (pet.status === 'adopted') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-xl bg-primary text-primary-foreground">
        Adoptado
      </span>
    )
  }
  return null
}

function PetSkeletons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-3 flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-20 rounded-xl" />
            <Skeleton className="h-5 w-16 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PetsTab() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <PetSkeletons />

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {mockPets.map((pet) => (
        <div key={pet.id} className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="relative aspect-square">
            <Image
              src={pet.imageUrl}
              alt={pet.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-3 flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">{pet.name}</span>
            <StatusTag pet={pet} />
          </div>
        </div>
      ))}
    </div>
  )
}
