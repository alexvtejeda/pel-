'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** Translated message. Falls back to common:error_state.title. */
  message?: string
  /** Re-invokes the fetch. Omit only when there is genuinely nothing to retry. */
  onRetry?: () => void
  className?: string
}

/**
 * The one error surface for async data. Never reuse an empty state for a failed
 * fetch — "you have no pets" and "we could not reach the server" are different
 * facts and the user needs a way out of the second one.
 */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation('common')

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-4xl text-destructive/50" />
      <p className="text-sm text-muted-foreground max-w-xs">{message ?? t('error_state.title')}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
          {t('error_state.retry')}
        </button>
      )}
    </div>
  )
}
