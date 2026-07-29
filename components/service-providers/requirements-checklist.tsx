'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCircle } from '@fortawesome/free-solid-svg-icons'

export interface Requirement {
  key: string
  labelKey: string
  met: boolean
}

/**
 * Makes the seven canSubmit conditions visible. A disabled button with no
 * explanation is a dead end; this turns it into a to-do list.
 */
export function RequirementsChecklist({ requirements }: { requirements: Requirement[] }) {
  const { t } = useTranslation('business')
  const outstanding = requirements.filter((r) => !r.met)

  if (outstanding.length === 0) return null

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning-bg p-4">
      <p className="mb-2 text-xs font-semibold text-warning-foreground">
        {t('service_providers.requirements_title')}
      </p>
      <ul className="space-y-1">
        {requirements.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-xs text-warning-foreground">
            <FontAwesomeIcon
              icon={r.met ? faCircleCheck : faCircle}
              className={`text-xs ${r.met ? 'text-success' : 'text-warning-foreground/40'}`}
              aria-hidden="true"
            />
            <span className={r.met ? 'line-through opacity-60' : ''}>{t(r.labelKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
