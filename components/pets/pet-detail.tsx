'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaw,
  faDog,
  faCat,
  faMars,
  faVenus,
  faCakeCandles,
  faShareFromSquare,
  faCheck,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { Pet } from '@/lib/api/pets'
import { instagramUrl } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'
import Link from 'next/link'
import Carousel from '@/components/Carousel'

function DetailCarousel({ urls }: { urls: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    title: '',
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  useEffect(() => {
    if (containerRef.current) setWidth(containerRef.current.offsetWidth)
  }, [])

  return (
    <div ref={containerRef} className="w-full aspect-square">
      {width > 0 && (
        <Carousel
          items={items}
          baseWidth={width}
          autoplay={urls.length > 1}
          autoplayDelay={3000}
          pauseOnHover
          loop={urls.length > 1}
          containerPadding={0}
          dotsOverlay
          showPauseButton
          className="relative overflow-hidden w-full h-full"
        />
      )}
    </div>
  )
}

interface PetDetailProps {
  pet: Pet
}

export function PetDetail({ pet }: PetDetailProps) {
  const { t } = useTranslation('pets')
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const photos = pet.photos
  const hasPhotos = photos.length > 0

  const handleShare = async () => {
    if (!pet.short_slug) return
    const url = `${window.location.origin}/p/${pet.short_slug}`
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* cancelled */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* Clipboard API not available */ }
  }

  const handleAdopt = () => {
    window.location.href = `/adopt/${pet.id}`
  }

  const speciesIcon = pet.species === 'dog' ? faDog : faCat
  const genderIcon = pet.gender === 'male' ? faMars : faVenus

  return (
    <div className="flex flex-col h-full">
      {/* Carousel */}
      <div className="relative shrink-0 bg-secondary">
        {hasPhotos ? (
          <DetailCarousel urls={photos.map(p => p.url)} />
        ) : (
          <div className="aspect-square flex items-center justify-center">
            <FontAwesomeIcon icon={faPaw} className="text-4xl text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h2 className="text-xl font-bold">{pet.name}</h2>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
            <FontAwesomeIcon icon={speciesIcon} className="w-3 h-3" />
            {t(`species.${pet.species}`)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
            <FontAwesomeIcon icon={genderIcon} className="w-3 h-3" />
            {t(`gender.${pet.gender}`)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
            <FontAwesomeIcon icon={faCakeCandles} className="w-3 h-3" />
            {t('detail.years', { count: pet.age })}
          </span>
        </div>

        {/* Description */}
        {pet.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{pet.description}</p>
        )}

        {/* Condition alert */}
        {pet.conditions?.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-1">
            <p className="text-sm font-medium text-amber-800">{t('detail.specialCondition')}</p>
            {pet.condition_notes && (
              <p className="text-sm text-amber-700">{pet.condition_notes}</p>
            )}
          </div>
        )}

        <hr className="border-border" />

        {/* Rescue Center */}
        {pet.rescue_center && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('detail.rescueCenter')}</p>
            <div className="flex items-center gap-3">
              {pet.rescue_center.logo_url ? (
                <Image
                  src={pet.rescue_center.logo_url}
                  alt={pet.rescue_center.name}
                  width={40}
                  height={40}
                  className="rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <FontAwesomeIcon icon={faPaw} className="text-sm text-muted-foreground" />
                </div>
              )}
              <span className="font-medium text-sm">{pet.rescue_center.name}</span>
            </div>
            <div className="flex items-center gap-4">
              {pet.rescue_center.website && (
                <a href={pet.rescue_center.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                  Website
                </a>
              )}
              {pet.rescue_center.instagram && (
                <a href={instagramUrl(pet.rescue_center.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                  Instagram
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Adopt button + share */}
      <div className="p-4 border-t border-border shrink-0 space-y-2">
        {user ? (
          <button
            onClick={handleAdopt}
            className="w-full py-2.5 bg-pop-550 text-white font-semibold rounded-xl hover:bg-pop-500 transition-colors"
          >
            {t('detail.adopt')}
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="block w-full py-2.5 text-center bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
          >
            {t('detail.login_prompt')}
          </Link>
        )}
        {pet.short_slug && (
          <button
            onClick={handleShare}
            className="w-full py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faShareFromSquare} className="w-3.5 h-3.5" />
            {copied ? t('detail.link_copied', 'Enlace copiado') : t('detail.share', 'Compartir')}
          </button>
        )}
      </div>
    </div>
  )
}
