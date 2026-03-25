'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faBriefcase } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import Image from 'next/image'

interface ProviderCardProps {
  provider: UnifiedProvider
  onClick: () => void
}

export function ProviderCard({ provider, onClick }: ProviderCardProps) {
  const { t } = useTranslation('business')

  const initials = provider.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-4 space-y-3 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      {/* Header: photo/initials + name + trust badge */}
      <div className="flex items-center gap-3">
        {provider.cover_photo_url ? (
          <Image
            src={provider.cover_photo_url}
            alt={provider.name}
            width={48}
            height={48}
            className="rounded-full object-cover w-12 h-12"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-green-500" />
            <span className="text-xs text-green-500">
              {provider.type === 'business'
                ? t('provider.business_verified')
                : t('provider.member_verified')}
            </span>
          </div>
        </div>
      </div>

      {/* Service badges */}
      {provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {provider.services.map(service => (
            <span
              key={service}
              className="text-xs px-2 py-0.5 rounded-xl bg-primary/10 text-primary font-medium"
            >
              {service}
            </span>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="flex items-center gap-1.5">
        <FontAwesomeIcon icon={faBriefcase} className="text-xs text-muted-foreground" />
        <span className="text-sm font-medium">
          {provider.price != null
            ? `RD$${provider.price.toLocaleString()}`
            : t('provider.price_unavailable')}
        </span>
      </div>
    </button>
  )
}
