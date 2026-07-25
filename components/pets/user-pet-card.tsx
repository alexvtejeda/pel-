'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faDog, faCat, faMars, faVenus, faSyringe, faScissors } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import Carousel from '@/components/Carousel'

function CardCarousel({ urls }: { urls: string[] }) {
  const [width, setWidth] = useState(0)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    title: '',
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  return (
    <div ref={(el) => { if (el && width === 0) setWidth(el.offsetWidth) }} className="w-full h-full">
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
          className="relative overflow-hidden w-full h-full"
        />
      )}
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
  const ageText = age === '' || age === null || age === undefined ? '' : String(age)

  return (
    <div className="rounded-2xl overflow-hidden shadow-xs border bg-card">
      <div className="relative aspect-square bg-muted/30">
        {photoUrls.length > 0 ? (
          <CardCarousel urls={photoUrls} />
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
          <span className="font-medium text-sm truncate">{name.trim() || t('details.name')}</span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {ageText && <span>{ageText} {ageUnit === 'years' ? t('dashboard.ageUnit.years') : t('dashboard.ageUnit.months')}</span>}
          {ageText && <span>·</span>}
          <FontAwesomeIcon icon={gender === 'male' ? faMars : faVenus} className="text-xs" />
          <span>·</span>
          <FontAwesomeIcon icon={species === 'dog' ? faDog : faCat} className="text-xs" />
        </span>
        <div className="flex items-center gap-2 mt-1">
          <FontAwesomeIcon icon={faSyringe} className={`text-xs ${vaccinated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
          <FontAwesomeIcon icon={faScissors} className={`text-xs ${castrated ? 'text-green-500' : 'text-muted-foreground/30'}`} />
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
