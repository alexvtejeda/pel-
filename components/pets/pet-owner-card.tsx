'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { PetOwner } from '@/lib/api/pets'
import { ownerDisplayName } from '@/lib/utils'

interface PetOwnerCardProps {
  owner: PetOwner
}

/**
 * Publisher block for a member-published listing — the counterpart of the
 * rescue-centre card in `pet-detail.tsx`, sharing its geometry so the two read
 * as one system.
 *
 * Deliberately has **no** VerifiedBadge: that mark means "verified rescue
 * centre", and nobody has verified a private person.
 *
 * Phone and email are controls with their own hit areas, not 14px anchors
 * crowding the name — the same reasoning as the centre card's link row.
 */
export function PetOwnerCard({ owner }: PetOwnerCardProps) {
  const { t } = useTranslation('pets')
  const name = ownerDisplayName(owner)

  return (
    <div className="rounded-2xl border border-border bg-muted p-3">
      <div className="flex items-start gap-3">
        {owner.avatar_url ? (
          <Image
            src={owner.avatar_url}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-xl border border-border bg-background object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
            <FontAwesomeIcon icon={faUser} className="text-base text-muted-foreground" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{name}</span>
          <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-muted-foreground">
            {t('detail.published_by_member')}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {owner.phone && (
          <a
            href={`tel:${owner.phone}`}
            className="focus-ring flex h-[38px] items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
          >
            <FontAwesomeIcon icon={faPhone} className="text-sm" />
            {owner.phone}
          </a>
        )}
        <a
          href={`mailto:${owner.email}`}
          className="focus-ring flex h-[38px] items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
        >
          <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
          <span className="truncate">{owner.email}</span>
        </a>
      </div>
    </div>
  )
}
