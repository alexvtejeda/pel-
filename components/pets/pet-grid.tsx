'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faEllipsis, faLink, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { Pet } from '@/lib/api/pets'
import { instagramUrl, ensureUrl, ownerDisplayName } from '@/lib/utils'
import { formatAge } from '@/lib/utils/format-age'
import { ErrorState } from '@/components/ui/error-state'
import { VerifiedBadge } from './verified-badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface PetGridProps {
  /** Already sorted and source-filtered by `pets-page.tsx` — both breakpoints share one derivation. */
  pets: Pet[]
  loading: boolean
  error: string | null
  selectedId: string | null
  hasActiveFilters: boolean
  onSelect: (pet: Pet) => void
  onClearFilters: () => void
  onRetry: () => void
}

export function PetGrid({
  pets,
  loading,
  error,
  selectedId,
  hasActiveFilters,
  onSelect,
  onClearFilters,
  onRetry,
}: PetGridProps) {
  const { t } = useTranslation('pets')

  const handleShare = async (pet: Pet) => {
    if (!pet.short_slug) return
    const url = `${window.location.origin}/p?slug=${pet.short_slug}`
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url) } catch { /* fallback */ }
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4 sm:inset-shadow-2xl rounded-t-2xl sm:shadow-2xl bg-background">
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-secondary animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <ErrorState message={t('grid.error')} onRetry={onRetry} />
        )}

        {!loading && !error && pets.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <FontAwesomeIcon icon={faPaw} className="text-4xl opacity-30" />
            <p className="text-sm">{t('grid.empty')}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('grid.clear_filters')}
              </button>
            )}
          </div>
        )}

        {!loading && !error && pets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {pets.map((pet) => {
              const age = formatAge(pet.age)
              return (
                <div
                  key={pet.id}
                  className={`relative group rounded-2xl overflow-hidden aspect-square transition-all ${
                    pet.conditions?.length > 0
                      ? 'bg-warning-bg border-2 border-warning/50'
                      : 'bg-secondary'
                  } ${
                    selectedId === pet.id
                      ? 'outline-2 outline-offset-2 outline-pop-550'
                      : 'hover:outline-2 hover:outline-border'
                  }`}
                >
                  {/*
                    A real <button> rather than div[role=button]: it handles Space
                    natively without scrolling the page, and the menu below is a
                    SIBLING so we never nest interactive content.
                  */}
                  <button
                    type="button"
                    onClick={() => onSelect(pet)}
                    aria-label={t('card.view_details', { name: pet.name })}
                    className="focus-ring absolute inset-0 h-full w-full cursor-pointer rounded-2xl"
                  >
                    {pet.photos.length > 0 ? (
                      <Image
                        src={pet.photos[0].url}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <FontAwesomeIcon icon={faPaw} className="text-2xl text-muted-foreground/30" />
                      </span>
                    )}

                    {/* Name + meta overlay. Spans, not <p>: a button may only
                        contain phrasing content. A listing has either a centre
                        or an owner, never both — so the avatar slot is shared
                        and only a pet with neither goes without one. */}
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-primary to-transparent p-2 pt-6 text-left">
                      {pet.rescue_center?.avatar_url ? (
                        <Image
                          src={pet.rescue_center.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      ) : pet.owner?.avatar_url ? (
                        <Image
                          src={pet.owner.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      ) : null}
                      <span className="block min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-background">{pet.name}</span>
                        <span className="block truncate text-[11px] text-background/80">
                          {t(`detail.${age.unit}`, { count: age.count })}
                          {' · '}
                          {t(`gender.${pet.gender}`)}
                        </span>
                        {/* Attribution for member listings. Centre pets carry
                            the verified badge top-right instead. */}
                        {pet.owner && (
                          <span className="block truncate text-[11px] text-background/80">
                            {ownerDisplayName(pet.owner)}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  {/* Condition badge */}
                  {pet.conditions?.length > 0 && (
                    <div className="pointer-events-none absolute top-2 left-2 z-10 max-w-[calc(100%-4rem)]">
                      <span className="inline-block rounded-full bg-warning-bg px-2 py-0.5 text-[11px] leading-tight text-warning-foreground">
                        {t('detail.specialCondition')}
                      </span>
                    </div>
                  )}

                  {/* Verified badge — slides left on hover to avoid the menu */}
                  {pet.rescue_center && (
                    <span className="pointer-events-none absolute top-2 right-2 z-10 transition-transform duration-200 ease-in-out group-hover:-translate-x-8">
                      <VerifiedBadge className="text-xl" onPhoto />
                    </span>
                  )}

                  {/* Three-dots menu — sibling of the card button */}
                  <div className="absolute top-2 right-2 z-20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        {/* hover:bg-pop-solid, not pop-550: this circle carries a white
                            glyph, and pop-550 measures 2.27:1 against it — under the 3:1
                            WCAG 1.4.11 minimum for a functional control. */}
                        <button
                          aria-label={t('card.more_actions')}
                          className="focus-ring flex h-7 w-7 items-center justify-center rounded-full bg-primary transition-colors hover:bg-pop-solid"
                        >
                          <FontAwesomeIcon icon={faEllipsis} className="text-sm text-background" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {pet.short_slug && (
                          <DropdownMenuItem onClick={() => handleShare(pet)}>
                            <FontAwesomeIcon icon={faLink} className="text-sm" />
                            {t('card.share')}
                          </DropdownMenuItem>
                        )}
                        {pet.rescue_center?.website && (
                          <DropdownMenuItem onClick={() => window.open(ensureUrl(pet.rescue_center!.website!), '_blank')}>
                            <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                            {t('card.visitWebsite', { name: pet.rescue_center.name })}
                          </DropdownMenuItem>
                        )}
                        {pet.rescue_center?.instagram && (
                          <DropdownMenuItem onClick={() => window.open(instagramUrl(pet.rescue_center!.instagram!), '_blank')}>
                            <FontAwesomeIcon icon={faInstagram} className="text-sm" />
                            {t('card.visitInstagram', { name: pet.rescue_center.name })}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
