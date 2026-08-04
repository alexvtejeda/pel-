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
  faSyringe,
  faScissors,
  faRulerCombined,
} from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { toast } from 'sonner'
import { Pet } from '@/lib/api/pets'
import { createConversation } from '@/lib/api/chat'
import { instagramUrl, ensureUrl, ownerDisplayName } from '@/lib/utils'
import { formatAge } from '@/lib/utils/format-age'
import { useAuth } from '@/lib/contexts/auth-context'
import { trackPetEvent } from '@/lib/api/metrics'
import Link from '@/components/locale-link'
import Carousel from '@/components/Carousel'
import { VerifiedBadge } from './verified-badge'
import { PetOwnerCard } from './pet-owner-card'

function DetailCarousel({ urls }: { urls: string[] }) {
  const { t } = useTranslation('pets')
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
          dotLabel={(n, total) => t('feed.photo_position', { n, total })}
          dotsGroupLabel={t('member.photos_label')}
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
  const router = useLocaleRouter()
  const [copied, setCopied] = useState(false)
  const [startingChat, setStartingChat] = useState(false)

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

  // Member listings have no adoption form, so the conversation IS the funnel.
  // `createConversation` is idempotent, which is why there is no "already
  // contacted" state to keep — a second press reopens the same thread.
  const handleChat = async () => {
    if (startingChat || !pet.owner) return
    setStartingChat(true)
    const { data, error } = await createConversation({ pet_id: pet.id })
    if (error || !data) {
      toast.error(error || t('detail.chat_error'))
      setStartingChat(false)
      return
    }
    router.push(`/chat?conversation_id=${data.id}`)
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

      {/* Info. No `flex-1`: with sparse content the column used to stretch and
          push the Adoptar button to the panel floor, leaving a void above it.
          Its own `overflow-y-auto` still lets long content scroll. */}
      <div className="overflow-y-auto p-4 space-y-4">
        {/* Title and chips read as one unit, not as two equally-spaced siblings. */}
        <div className="space-y-2.5">
          <h2 className="text-xl font-bold">{pet.name}</h2>

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

        {/* Facts the payload already carries and the sheet used to drop — the
            grid even lets users filter by the first two. Labels are nouns so
            the values stay gender-neutral. */}
        <dl className="text-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <FontAwesomeIcon icon={faSyringe} className="text-sm" />
              {t('detail.facts.vaccines')}
            </dt>
            <dd className="font-medium">
              {pet.vaccinated ? t('detail.facts.up_to_date') : t('detail.facts.pending')}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <FontAwesomeIcon icon={faScissors} className="text-sm" />
              {t('detail.facts.neutering')}
            </dt>
            <dd className="font-medium">
              {pet.castrated ? t('detail.facts.yes') : t('detail.facts.no')}
            </dd>
          </div>
          {/* Guarded because member-published pets really can arrive without a
              size: `user_pets.size` is nullable (API migration 000039), while
              `pets.size` is NOT NULL DEFAULT 'medium' (000016). Unguarded, the
              row would render the raw `size.undefined` key. */}
          {pet.size && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <FontAwesomeIcon icon={faRulerCombined} className="text-sm" />
                {t('detail.facts.size')}
              </dt>
              <dd className="font-medium">{t(`size.${pet.size}`)}</dd>
            </div>
          )}
        </dl>

        {/* Rescue center. The card's own border separates it from the pet's
            facts — that is why the rule above it is gone. */}
        {pet.rescue_center && (
          <div className="rounded-2xl border border-border bg-muted p-3">
            <div className="flex items-start gap-3">
              {pet.rescue_center.avatar_url ? (
                <Image
                  src={pet.rescue_center.avatar_url}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-xl border border-border bg-background object-cover"
                />
              ) : pet.rescue_center.logo_url ? (
                /* `logo_url` is a 4:1 banner (LogoUpload enforces the ratio and
                   labels it as the adoption-form banner). Contained in the same
                   56px box — never cropped square, and never sized by the
                   width/height attributes alone, which Tailwind preflight's
                   `img { height: auto }` would collapse. */
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background p-1.5">
                  <Image
                    src={pet.rescue_center.logo_url}
                    alt=""
                    width={56}
                    height={14}
                    className="h-auto max-h-full w-full object-contain"
                  />
                </span>
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                  <FontAwesomeIcon icon={faPaw} className="text-base text-muted-foreground" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-semibold">{pet.rescue_center.name}</span>
                  <VerifiedBadge className="shrink-0 text-base" />
                </span>
                <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  {t('detail.verified_center')}
                </p>
              </div>
            </div>

            {/* Controls, not 14px anchors crowding the name: each gets its own
                hit area, and a lone link takes the full width. */}
            {(pet.rescue_center.website || pet.rescue_center.instagram) && (
              <div className="mt-3.5 flex gap-2">
                {pet.rescue_center.website && (
                  <a
                    href={ensureUrl(pet.rescue_center.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring flex h-[38px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                    {t('website', { ns: 'common' })}
                  </a>
                )}
                {pet.rescue_center.instagram && (
                  <a
                    href={instagramUrl(pet.rescue_center.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring flex h-[38px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                    {t('instagram', { ns: 'common' })}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* A listing has either a centre or an owner, never both. */}
        {pet.owner && <PetOwnerCard owner={pet.owner} />}
      </div>

      {/* Adopt button + share */}
      <div className="p-4 border-t border-border shrink-0 space-y-2">
        {/* Member listings have no adoption form — forms belong to rescue
            centres — so chat is the whole funnel here. Your own listing gets
            no button at all. */}
        {user && pet.owner && user.id !== pet.owner.id ? (
          <button
            onClick={handleChat}
            disabled={startingChat}
            className="focus-ring w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98] disabled:opacity-60"
          >
            {startingChat
              ? t('detail.chat_starting')
              : t('detail.chat_with', { name: ownerDisplayName(pet.owner) })}
          </button>
        ) : user && pet.owner ? null : user && user.role !== 'rescue_center' && user.role !== 'business' ? (
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
