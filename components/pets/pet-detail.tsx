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
import { instagramUrl, ensureUrl } from '@/lib/utils'
import { formatAge } from '@/lib/utils/format-age'
import { useAuth } from '@/lib/contexts/auth-context'
import { trackPetEvent } from '@/lib/api/metrics'
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
          flushItems
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

  useEffect(() => {
    if (pet?.id) trackPetEvent(pet.id, 'view')
  }, [pet?.id])

  const photos = pet.photos
  const hasPhotos = photos.length > 0

  const handleShare = async () => {
    if (!pet.short_slug) return
    const url = `${window.location.origin}/p?slug=${pet.short_slug}`
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
    trackPetEvent(pet.id, 'adopt_click')
    window.location.href = `/adopt?id=${pet.id}`
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
            <FontAwesomeIcon icon={speciesIcon} className="text-xs" />
            {t(`species.${pet.species}`)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
            <FontAwesomeIcon icon={genderIcon} className="text-xs" />
            {t(`gender.${pet.gender}`)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl">
            <FontAwesomeIcon icon={faCakeCandles} className="text-xs" />
            {(() => {
              const { count, unit } = formatAge(pet.age)
              return t(`detail.${unit}`, { count })
            })()}
          </span>
        </div>

        {/* Description */}
        {pet.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{pet.description}</p>
        )}

        {/* Condition alert */}
        {pet.conditions?.length > 0 && (
          <div className="bg-warning-bg border border-warning/40 rounded-xl p-3 space-y-1">
            <p className="text-sm font-medium text-warning-foreground">{t('detail.specialCondition')}</p>
            {/* Full opacity, not /80: on the light warning-bg tint that measured
                3.78:1, under AA. The title above already reads as the heading via
                font-medium, so the notes lose nothing by staying legible. */}
            {pet.condition_notes && (
              <p className="text-sm text-warning-foreground">{pet.condition_notes}</p>
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
                <a href={ensureUrl(pet.rescue_center.website)} target="_blank" rel="noopener noreferrer" className="focus-ring flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                  {t('website', { ns: 'common' })}
                </a>
              )}
              {pet.rescue_center.instagram && (
                <a href={instagramUrl(pet.rescue_center.instagram)} target="_blank" rel="noopener noreferrer" className="focus-ring flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                  {t('instagram', { ns: 'common' })}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Adopt button + share */}
      <div className="p-4 border-t border-border shrink-0 space-y-2">
        {user && user.role !== 'rescue_center' && user.role !== 'business' ? (
          <button
            onClick={handleAdopt}
            className="focus-ring w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98]"
          >
            {t('detail.adopt')}
          </button>
        ) : !user ? (
          <Link
            href="/auth/login"
            className="focus-ring block w-full py-2.5 text-center bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
          >
            {t('detail.login_prompt')}
          </Link>
        ) : null}
        {pet.short_slug && (
          <button
            onClick={handleShare}
            className="focus-ring w-full py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faShareFromSquare} className="text-sm" />
            {copied ? t('detail.link_copied', 'Enlace copiado') : t('detail.share', 'Compartir')}
          </button>
        )}
      </div>
    </div>
  )
}
