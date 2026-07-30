'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCertificate, faCheck } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  /** Caller sets the size — `text-xl` on a card, `text-base` inline in the sheet. */
  className?: string
  /**
   * Separation for badges sitting on a photo. A Tailwind utility, not an inline
   * `style` attribute: `design-system.test.ts` rule 10 bans those outside its
   * allowlist, and `drop-shadow-[…]` compiles to the identical `filter: drop-shadow(…)`.
   */
  onPhoto?: boolean
}

/**
 * The mark that says "a verified rescue center published this pet". Shared by
 * the grid card, the landing strip and the detail sheet so the three never
 * drift apart.
 *
 * `relative` lives on the root because the check is absolutely centred on the
 * seal. Callers that need the badge positioned wrap it in their own element —
 * passing `absolute` through `className` would race the root's `relative`.
 */
export function VerifiedBadge({ className, onPhoto = false }: VerifiedBadgeProps) {
  const { t } = useTranslation('pets')
  const label = t('card.verified_center')

  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn(
        'relative inline-block',
        onPhoto && 'drop-shadow-[0_2px_4px_var(--foreground)]',
        className,
      )}
    >
      <FontAwesomeIcon icon={faCertificate} className="text-pop-550" />
      {/* 0.6em, not text-xs: the check has to scale with whatever size the
          caller sets. 0.6 × text-xl (20px) = 12px — exactly today's text-xs. */}
      <FontAwesomeIcon
        icon={faCheck}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.6em] text-background"
      />
    </span>
  )
}
