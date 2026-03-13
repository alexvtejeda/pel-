import { SlugRedirectPage } from '@/components/pets/slug-redirect-page'

export function generateStaticParams() {
  return []
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <SlugRedirectPage slug={slug} />
}
