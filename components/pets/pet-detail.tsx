'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaw,
  faDog,
  faCat,
  faMars,
  faVenus,
  faChevronLeft,
  faChevronRight,
  faCakeCandles,
  faShareFromSquare,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { useAuth } from '@/lib/contexts/auth-context'
import Link from 'next/link'

interface PetDetailProps {
  pet: Pet
}

export function PetDetail({ pet }: PetDetailProps) {
  const { t } = useTranslation('pets')
  const { user } = useAuth()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setPhotoIndex(0)
  }, [pet?.id])

  const photos = pet.photos
  const hasPhotos = photos.length > 0

  const prev = () => setPhotoIndex((i) => (i > 0 ? i - 1 : photos.length - 1))
  const next = () => setPhotoIndex((i) => (i < photos.length - 1 ? i + 1 : 0))

  const handleShare = async () => {
    if (!pet.short_slug) return
    const url = `${window.location.origin}/p/${pet.short_slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const handleAdopt = () => {
    window.location.href = `/adopt/${pet.id}`
  }

  const speciesIcon = pet.species === 'dog' ? faDog : faCat
  const genderIcon = pet.gender === 'male' ? faMars : faVenus

  return (
    <div className="flex flex-col h-full">
      {/* Hero photo */}
      <div className="relative aspect-square bg-secondary shrink-0">
        {hasPhotos ? (
          <>
            <Image
              src={photos[photoIndex].url}
              alt={pet.name}
              fill
              className="object-cover"
              sizes="360px"
            />

            {photos.length > 1 && (
              <>
                {/* Clickable prev/next areas */}
                <button
                  onClick={prev}
                  className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="bg-black/40 rounded-xl p-1.5">
                    <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4 text-white" />
                  </span>
                </button>
                <button
                  onClick={next}
                  className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="bg-black/40 rounded-xl p-1.5">
                    <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-white" />
                  </span>
                </button>

                {/* Dots */}
                <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === photoIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <FontAwesomeIcon icon={faPaw} className="w-12 h-12 text-muted-foreground/30" />
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
