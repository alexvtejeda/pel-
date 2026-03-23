'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const items = [
  { href: '/pets', icon: faPaw, labelKey: 'header.pets' },
  { href: '/about', icon: faCircleInfo, labelKey: 'header.about' },
] as const

export function PublicMobileNav() {
  const pathname = usePathname()
  const { t } = useTranslation('pets')

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-14">
        {items.map(({ href, icon, labelKey }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                active ? 'text-pop-550 font-medium' : 'text-muted-foreground'
              }`}
            >
              <FontAwesomeIcon icon={icon} className="text-lg" />
              {t(labelKey)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
