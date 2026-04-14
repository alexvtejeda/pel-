import type { Metadata } from 'next'
import { ScrollStory } from '@/components/about/scroll-story'

export const metadata: Metadata = {
  title: 'Pelú — Plataforma de adopción y cuidado de mascotas en RD',
  description:
    'Centralizamos el ecosistema de adopción y cuidado de mascotas en República Dominicana. Proyecto de tesis — PUCMM 2026.',
  openGraph: {
    title: 'Pelú',
    description: 'Centralizamos el ecosistema de adopción y cuidado de mascotas en RD.',
    images: ['/assets/logo.svg'],
  },
}

export default function AboutPage() {
  return <ScrollStory />
}
