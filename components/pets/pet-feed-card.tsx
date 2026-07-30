'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faGlobe, faSyringe, faScissors, faRulerCombined } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { Pet } from '@/lib/api/pets'
import { instagramUrl, ensureUrl } from '@/lib/utils'
import { formatAge } from '@/lib/utils/format-age'
import { useAuth } from '@/lib/contexts/auth-context'
import { trackPetEvent } from '@/lib/api/metrics'
import Carousel from '@/components/Carousel'
import { VerifiedBadge } from './verified-badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface PetFeedCardProps {
  pet: Pet
  /**
   * Measured once by `PetFeed`, not per card. Zero means "not measured yet" —
   * a carousel rendered at width 0 collapses its track.
   */
  photoWidth: number
  /** Only the first card is eager; the rest lazy-load as the feed scrolls. */
  priority?: boolean
}

export function PetFeedCard({ pet, photoWidth, priority = false }: PetFeedCardProps) {
  const { t } = useTranslation('pets')
  const { user } = useAuth()

  const age = formatAge(pet.age)
  const rc = pet.rescue_center
  const hasLinks = Boolean(rc?.website || rc?.instagram)

  const handleAdopt = () => {
    trackPetEvent(pet.id, 'adopt_click')
    window.location.href = `/adopt?id=${pet.id}`
  }

  const publisher = rc && (
    <>
      {rc.avatar_url && (
        <Image
          src={rc.avatar_url}
          alt=""
          width={26}
          height={26}
          className="h-[26px] w-[26px] shrink-0 rounded-full object-cover"
        />
      )}
      <span className="truncate text-[13px] font-semibold">{rc.name}</span>
      <VerifiedBadge className="shrink-0 text-sm" />
    </>
  )

  const factPill = (icon: typeof faSyringe, label: string, value: string) => (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-pop-450/40 px-2.5 py-1 text-[11.5px] font-medium text-pop-800">
      <FontAwesomeIcon icon={icon} className="text-[10px]" />
      {label} · {value}
    </span>
  )

  return (
    <article
      aria-label={pet.name}
      className="snap-start scroll-mt-24 overflow-hidden rounded-2xl bg-card shadow-post"
    >
      {/* Publisher. The name is the affordance — there is no `⋯` button on
          mobile — so it is only a control when there is something to open. */}
      {rc &&
        (hasLinks ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('feed.publisher_links', { name: rc.name })}
                className="focus-ring flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                {publisher}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {rc.website && (
                <DropdownMenuItem onClick={() => window.open(ensureUrl(rc.website!), '_blank')}>
                  <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                  {t('card.visitWebsite', { name: rc.name })}
                </DropdownMenuItem>
              )}
              {rc.instagram && (
                <DropdownMenuItem onClick={() => window.open(instagramUrl(rc.instagram!), '_blank')}>
                  <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                  {t('card.visitInstagram', { name: rc.name })}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex min-h-11 items-center gap-2 px-3 py-2.5">{publisher}</div>
        ))}

      {/* Photo, flush to the card edges — the card's overflow-hidden clips it. */}
      <div className="relative aspect-square bg-secondary">
        {pet.photos.length > 1 && photoWidth > 0 ? (
          <Carousel
            items={pet.photos.map((p, i) => ({
              id: i,
              image: p.url,
              title: '',
              description: '',
              icon: null as unknown as React.ReactNode,
              alt: '',
            }))}
            baseWidth={photoWidth}
            containerPadding={0}
            loop
            dotsOverlay
            flushItems
            dragDirectionLock
            dotLabel={(n, total) => t('feed.photo_position', { n, total })}
            className="relative h-full w-full overflow-hidden"
          />
        ) : pet.photos.length === 1 ? (
          <Image
            src={pet.photos[0].url}
            alt=""
            fill
            sizes="100vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <FontAwesomeIcon icon={faPaw} className="text-4xl text-muted-foreground/30" />
          </span>
        )}
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-baseline justify-between gap-3">
          {/* 21px/800 with tight tracking. The spec names Manrope, but no
              webfont is loaded anywhere in the app (see the plan's F3), so the
              family would resolve to the same system stack as everything else —
              size, weight and tracking are what carry the design here. */}
          <h2 className="text-[21px] font-extrabold tracking-[-0.5px]">{pet.name}</h2>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t(`detail.${age.unit}`, { count: age.count })} · {t(`gender.${pet.gender}`)}
          </span>
        </div>

        {pet.description && (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">{pet.description}</p>
        )}

        {/* Nouns, not adjectives: the catalogue is mostly female and the existing
            adjective strings are masculine. Making the noun the subject sidesteps
            gender agreement instead of misgendering pets. */}
        <div className="flex flex-wrap gap-1.5">
          {factPill(
            faSyringe,
            t('detail.facts.vaccines'),
            pet.vaccinated ? t('detail.facts.up_to_date') : t('detail.facts.pending'),
          )}
          {factPill(
            faScissors,
            t('detail.facts.neutering'),
            pet.castrated ? t('detail.facts.yes') : t('detail.facts.no'),
          )}
          {pet.size && factPill(faRulerCombined, t('detail.facts.size'), t(`size.${pet.size}`))}
        </div>

        {pet.conditions?.length > 0 && (
          <div className="space-y-1 rounded-xl border border-warning/40 bg-warning-bg p-2.5">
            <p className="text-[13px] font-medium text-warning-foreground">
              {t('detail.specialCondition')}
            </p>
            {pet.condition_notes && (
              <p className="text-[13px] text-warning-foreground">{pet.condition_notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Mirrors pet-detail.tsx:280-294 exactly — rescue-centre and business
          accounts get no CTA at all, so the wrapper goes with it. */}
      {user && user.role !== 'rescue_center' && user.role !== 'business' ? (
        <div className="p-3 pt-0">
          <button
            onClick={handleAdopt}
            className="focus-ring min-h-11 w-full rounded-xl bg-pop-solid font-semibold text-white transition-[background-color,transform] hover:bg-pop-850 motion-safe:active:scale-[0.99]"
          >
            {t('detail.adopt')}
          </button>
        </div>
      ) : !user ? (
        <div className="p-3 pt-0">
          <Link
            href="/auth/login"
            className="focus-ring flex min-h-11 w-full items-center justify-center rounded-xl bg-secondary font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            {t('detail.login_prompt')}
          </Link>
        </div>
      ) : null}
    </article>
  )
}
