'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faLocationDot, faBriefcase } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import { instagramUrl } from '@/lib/utils'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

interface ProviderDetailProps {
  provider: UnifiedProvider
}

export function ProviderDetail({ provider }: ProviderDetailProps) {
  const { t } = useTranslation('business')

  const initials = provider.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col h-full">
      {/* Cover photo or gradient fallback */}
      <div className="shrink-0">
        {provider.cover_photo_url ? (
          <div className="relative w-full h-40">
            <Image
              src={provider.cover_photo_url}
              alt={provider.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-background">
              {initials}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name + trust badge */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{provider.name}</h2>
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faShieldHalved} className="text-sm text-green-500" />
            <span className="text-sm text-green-500">
              {provider.type === 'business'
                ? t('provider.business_verified')
                : t('provider.member_verified')}
            </span>
          </div>
        </div>

        {/* Service badges */}
        {provider.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {provider.services.map(service => (
              <span
                key={service}
                className="text-xs px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-medium"
              >
                {service}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faBriefcase} className="text-sm text-muted-foreground" />
          <span className="text-sm font-medium">
            {provider.price != null
              ? `RD$${provider.price.toLocaleString()}`
              : t('provider.price_unavailable')}
          </span>
        </div>

        {/* Description */}
        {provider.description && (
          <section className="space-y-1">
            <h3 className="font-semibold text-sm">{t('aliados.description')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{provider.description}</p>
          </section>
        )}

        <hr className="border-border" />

        {/* Operating hours — businesses only */}
        {provider.operating_hours && provider.type === 'business' && (
          <section className="space-y-2">
            <h3 className="font-semibold text-sm">{t('aliados.schedule')}</h3>
            <div className="space-y-1">
              {DAYS.map(day => {
                const hours = provider.operating_hours?.[day]
                return (
                  <div key={day} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground w-10">{t(`aliados.days.${day}`)}</span>
                    <span>
                      {hours?.open ? `${hours.from} - ${hours.to}` : t('aliados.closed')}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Address */}
        {provider.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FontAwesomeIcon icon={faLocationDot} className="text-sm mt-0.5 shrink-0" />
            <span>{provider.address}</span>
          </div>
        )}

        {/* Instagram — businesses only */}
        {provider.instagram && provider.type === 'business' && (
          <a
            href={instagramUrl(provider.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FontAwesomeIcon icon={faInstagram} className="text-sm" />
            {provider.instagram}
          </a>
        )}
      </div>

      {/* Contact button (disabled for demo) */}
      <div className="p-4 border-t border-border shrink-0">
        <button
          disabled
          className="w-full py-2.5 bg-pop-550 text-white font-semibold rounded-xl opacity-50 cursor-not-allowed"
        >
          {t('aliados.contact')}
        </button>
      </div>
    </div>
  )
}
