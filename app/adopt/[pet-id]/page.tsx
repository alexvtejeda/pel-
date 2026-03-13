import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'

export function generateStaticParams() {
  return []
}

export default async function Page({ params }: { params: Promise<{ 'pet-id': string }> }) {
  const { 'pet-id': petId } = await params
  return <AdoptPetPage petId={petId} />
}
