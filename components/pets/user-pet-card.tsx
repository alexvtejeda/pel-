'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faDog, faCat, faMars, faVenus, faSyringe, faScissors } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import Carousel from '@/components/Carousel'
import { formatAge } from '@/lib/utils/format-age'

function CardCarousel({ urls, name }: { urls: string[]; name: string }) {
  const { t } = useTranslation('pets')
  // Start at a plausible card width so the first paint shows a photo instead of
  // an empty box; the ref callback corrects it before the user notices. The
  // measured > 0 check skips an element that has not been laid out yet, which
  // would otherwise collapse the carousel to nothing.
  const [width, setWidth] = useState(240)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    // `title` also renders as a visible caption bar over the photo, so the pet's
    // name goes in `alt` instead. It used to be neither, which left every grid
    // photo with alt="" and invisible to screen readers.
    title: '',
    alt: name,
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  return (
    <div
      ref={(el) => {
        const measured = el?.offsetWidth ?? 0
        if (measured > 0 && measured !== width) setWidth(measured)
      }}
      className="w-full h-full"
    >
      <Carousel
        items={items}
        baseWidth={width}
        autoplay={urls.length > 1}
        autoplayDelay={3000}
        pauseOnHover
        loop={urls.length > 1}
        containerPadding={0}
        dotsOverlay
        dotLabel={(n, total) => t('feed.photo_position', { n, total })}
        dotsGroupLabel={t('member.photos_label')}
        className="relative overflow-hidden w-full h-full"
      />
    </div>
  )
}

export interface UserPetCardProps {
  name: string
  age: string | number
  ageUnit?: 'months' | 'years'
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
  photoUrls: string[]
  vaccinated?: boolean
  castrated?: boolean
  size?: string
  /** Optional top-right overlay (e.g. edit / delete actions on /mis-mascotas). */
  actions?: React.ReactNode
}

/**
 * Shared card for a member-owned pet. Used both as the live preview inside
 * MemberAddPetModal and as the grid item on /mis-mascotas.
 */
export function UserPetCard({
  name, age, ageUnit = 'months', gender, species, photoUrls, vaccinated, castrated, size, actions,
}: UserPetCardProps) {
  const { t } = useTranslation('pets')
  // The live preview inside MemberAddPetModal passes the raw typed string plus the
  // unit the user picked, so parse defensively and only convert months→years.
  const parsed = age === '' || age === null || age === undefined ? Number.NaN : Number(age)
  const displayAge = !Number.isFinite(parsed)
    ? null
    : ageUnit === 'years'
      ? { count: Math.floor(parsed), unit: 'years' as const }
      : formatAge(parsed)
  // Shared by the heading and the photo alt text so a nameless pet (the live
  // preview in MemberAddPetModal starts empty) never falls back to alt="".
  const displayName = name.trim() || t('details.name')

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border bg-card">
      <div className="relative aspect-square bg-muted/30">
        {photoUrls.length > 0 ? (
          <CardCarousel urls={photoUrls} name={displayName} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faPaw} className="text-5xl text-muted-foreground/20" />
          </div>
        )}
        {actions && (
          <div className="absolute top-2 right-2 z-10 flex gap-1.5">{actions}</div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{displayName}</span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {displayAge && <span>{t(`detail.${displayAge.unit}`, { count: displayAge.count })}</span>}
          {displayAge && <span aria-hidden="true">·</span>}
          <FontAwesomeIcon icon={gender === 'male' ? faMars : faVenus} className="text-xs" />
          <span aria-hidden="true">·</span>
          <FontAwesomeIcon icon={species === 'dog' ? faDog : faCat} className="text-xs" />
        </span>
        {/* Green-vs-grey icons alone carried the whole vaccinated/neutered
            distinction (WCAG 1.4.1). The sr-only text is what actually states
            it; the title is a tooltip bonus for mouse users. */}
        <div className="flex items-center gap-2 mt-1">
          <span
            title={vaccinated ? t('grid.vaccinated') : t('grid.not_vaccinated')}
            className={`inline-flex items-center gap-1 text-xs ${vaccinated ? 'text-success' : 'text-muted-foreground/40'}`}
          >
            <FontAwesomeIcon icon={faSyringe} className="text-xs" aria-hidden="true" />
            <span className="sr-only">{vaccinated ? t('grid.vaccinated') : t('grid.not_vaccinated')}</span>
          </span>
          <span
            title={castrated ? t('grid.castrated') : t('grid.not_castrated')}
            className={`inline-flex items-center gap-1 text-xs ${castrated ? 'text-success' : 'text-muted-foreground/40'}`}
          >
            <FontAwesomeIcon icon={faScissors} className="text-xs" aria-hidden="true" />
            <span className="sr-only">{castrated ? t('grid.castrated') : t('grid.not_castrated')}</span>
          </span>
          {size && (
            <span className="text-xs text-muted-foreground">
              {size === 'small' ? t('size.small') : size === 'medium' ? t('size.medium') : t('size.large')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
