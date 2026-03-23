'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldCat, faFileLines, faComments, faGear } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

type Tab = 'rescue-centers' | 'form-template' | 'chat' | 'settings'

interface AdminMobileNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; labelKey: string; icon: IconDefinition }[] = [
  { tab: 'rescue-centers', labelKey: 'admin.tabs.rescue_centers_short', icon: faShieldCat },
  { tab: 'form-template',  labelKey: 'admin.tabs.form_template',       icon: faFileLines },
  { tab: 'chat',           labelKey: 'admin.tabs.chat',                icon: faComments },
  { tab: 'settings',       labelKey: 'admin.tabs.settings',            icon: faGear },
]

export function AdminMobileNav({ activeTab, onTabChange }: AdminMobileNavProps) {
  const { t } = useTranslation('pets')
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ tab, labelKey, icon }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex flex-col items-center gap-1 flex-1 h-full justify-center"
          >
            <FontAwesomeIcon
              icon={icon}
              className={`w-5 h-5 ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <span
              className={`text-[10px] ${activeTab === tab ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              {t(labelKey)}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
