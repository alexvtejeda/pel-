'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faBriefcase } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import Image from 'next/image'

interface ProviderCardProps {
  provider: UnifiedProvider
  selected?: boolean
  onClick: () => void
}

export function ProviderCard({ provider, selected = false, onClick }: ProviderCardProps) {
  const { t, i18n } = useTranslation('business')
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'

  const initials = provider.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Prices are DOP. Intl gives "RD$1,500" in es-DO instead of a hand-rolled
  // "RD$" prefix over a browser-locale toLocaleString().
  const price = provider.price != null
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'DOP',
        maximumFractionDigits: 0,
      }).format(provider.price)
    : t('provider.price_unavailable')

  /*
    Selection ring is pop-solid (pop-800), not pop-550: a state indicator has to
    clear WCAG 1.4.11's 3:1, and pop-550 measures 2.27:1 on the light card.
    pop-800 is 5.54:1 light / 3.70:1 dark, and staying off pop-700 keeps
    "selected" visually distinct from the focus-ring's pop-700 outline.
  */
  const ring = selected ? 'outline-2 outline-offset-2 outline-pop-solid' : ''

  return (
    <button
      onClick={onClick}
      className={`focus-ring w-full text-left rounded-2xl border bg-card p-4 space-y-3 transition-colors hover:bg-muted/50 ${ring}`}
    >
      {/* Header: photo/initials + name + trust badge */}
      <div className="flex items-center gap-3">
        {provider.cover_photo_url ? (
          <Image
            src={provider.cover_photo_url}
            alt=""
            width={48}
            height={48}
            className="rounded-full object-cover w-12 h-12 shrink-0"
          />
        ) : (
          <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-success" />
            <span className="text-xs text-success truncate">
              {provider.provider_type === 'business'
                ? t('provider.business_verified')
                : t('provider.member_verified')}
            </span>
          </div>
        </div>
      </div>

      {/* Description snippet */}
      {provider.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {provider.description}
        </p>
      )}

      {/* Service badges — rounded-full chips, matching /pets */}
      {provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {provider.services.map(service => (
            <span
              key={service}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {t(`service_providers.services.${service}`, { defaultValue: service })}
            </span>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="flex items-center gap-1.5">
        <FontAwesomeIcon icon={faBriefcase} className="text-xs text-muted-foreground" />
        <span className="text-sm font-medium">{price}</span>
      </div>
    </button>
  )
}
