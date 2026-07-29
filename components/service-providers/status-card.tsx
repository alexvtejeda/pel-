'use client'

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface StatusCardProps {
  icon: IconDefinition
  /** Tailwind text-* token class for the icon, e.g. "text-success". */
  tone: string
  title: string
  body: string
  children?: React.ReactNode
}

/** The three /servicios status blocks were copy-pasted; this is the one shape. */
export function StatusCard({ icon, tone, title, body, children }: StatusCardProps) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={icon} className={`text-lg ${tone}`} aria-hidden="true" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
