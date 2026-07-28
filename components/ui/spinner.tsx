'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  /** Size the spinner with a text-* class, e.g. "text-2xl". Never w-* or h-*. */
  className?: string
  /** Screen-reader label. Defaults to common:loading. */
  label?: string
}

/**
 * The single inline spinner for the app. Full-page loads use
 * <PeluLoadingLogo /> instead; list/grid surfaces use skeletons.
 */
export function Spinner({ className, label }: SpinnerProps) {
  const { t } = useTranslation('common')

  return (
    <span role="status" className="inline-flex items-center">
      <FontAwesomeIcon
        icon={faSpinner}
        className={cn('animate-spin', className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label ?? t('loading')}</span>
    </span>
  )
}
