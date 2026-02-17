import Image from 'next/image'
import { mockPets, MockPet } from '@/lib/data/mock-rescue-center'

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
      <span className="text-xs font-medium px-2 py-0.5 rounded-xl bg-slate-800 text-white">
        Adoptado
      </span>
    )
  }
  return null
}

export function PetsTab() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {mockPets.map((pet) => (
        <div key={pet.id} className="rounded-2xl border bg-card overflow-hidden shadow-sm">
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
