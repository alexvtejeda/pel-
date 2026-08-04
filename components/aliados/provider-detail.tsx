'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShieldHalved,
  faLocationDot,
  faBriefcase,
  faComments,
} from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import { createConversation } from '@/lib/api/chat'
import { useAuth } from '@/lib/contexts/auth-context'
import { instagramUrl } from '@/lib/utils'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

interface ProviderDetailProps {
  provider: UnifiedProvider
}

export function ProviderDetail({ provider }: ProviderDetailProps) {
  const { t, i18n } = useTranslation('business')
  const { user } = useAuth()
  const router = useLocaleRouter()
  const [contacting, setContacting] = useState(false)
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'

  /*
    Own listing → no button. The backend answers that case with a 400, so
    hiding it is what keeps the user off a dead end. Everyone else sees it,
    logged-out visitors included: /aliados is public and this is the conversion
    path, so hiding it from them would cost the signup it exists to earn.
  */
  const isOwnListing = user?.id === provider.user_id

  const handleContact = async () => {
    if (!user) {
      /*
        No return-URL convention exists — postLoginRedirect is role-based only —
        so a logged-out visitor lands on their normal post-login destination and
        navigates back. Worth revisiting when login grows a `next` param.
      */
      router.push('/auth/login')
      return
    }
    if (contacting) return
    setContacting(true)

    // The provider id, not the owner's user id: the backend resolves the owner
    // and only lets you reach someone whose listing is active right now.
    const { data, error } = await createConversation({ provider_id: provider.id })

    if (error || !data) {
      /*
        A 404 carries either "not found" (gone or deactivated) or "provider not
        found" (malformed id) — api: internal/chat/handler.go. Both mean the
        same thing to a reader, hence the substring rather than an equality
        check against one of the two.
      */
      const gone = error?.includes('not found')
      toast.error(t(gone ? 'provider.contact_unavailable' : 'provider.contact_error'))
      setContacting(false)
      return
    }

    // Left pending through the navigation: re-enabling here would flash the
    // idle label for a frame while the route is already tearing down.
    router.push(`/chat?conversation_id=${data.id}`)
  }

  const initials = provider.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Same formatting as ProviderCard: prices are DOP, and Intl renders "RD$1,500"
  // in es-DO instead of a hand-rolled prefix over a browser-locale toLocaleString().
  const price = provider.price != null
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'DOP',
        maximumFractionDigits: 0,
      }).format(provider.price)
    : t('provider.price_unavailable')

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
          <div className="w-full h-40 bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
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
            <FontAwesomeIcon icon={faShieldHalved} className="text-sm text-success" />
            <span className="text-sm text-success">
              {provider.provider_type === 'business'
                ? t('provider.business_verified')
                : t('provider.member_verified')}
            </span>
          </div>
        </div>

        {/* Service badges — rounded-full chips, matching ProviderCard */}
        {provider.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {provider.services.map(service => (
              <span
                key={service}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {t(`service_providers.services.${service}`, { defaultValue: service })}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faBriefcase} className="text-sm text-muted-foreground" />
          <span className="text-sm font-medium">{price}</span>
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
        {provider.operating_hours && provider.provider_type === 'business' && (
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
        {provider.instagram && provider.provider_type === 'business' && (
          <a
            href={instagramUrl(provider.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FontAwesomeIcon icon={faInstagram} className="text-sm" />
            {provider.instagram}
          </a>
        )}
      </div>

      {/*
        Outside the scrolling section above so it pins to the panel floor,
        matching pet-detail.tsx's adopt CTA.
      */}
      {!isOwnListing && (
        <div className="shrink-0 border-t border-border p-4">
          <button
            onClick={handleContact}
            disabled={contacting}
            className="focus-ring w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faComments} className="text-sm" />
            {contacting ? t('provider.contacting') : t('provider.contact')}
          </button>
        </div>
      )}
    </div>
  )
}
