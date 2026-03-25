'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faComments, faCalendarDays, faGear, faBars } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useSidebar } from '@/components/ui/sidebar'

type Tab = 'requests' | 'chat' | 'agenda' | 'settings'

interface MobileBottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; labelKey: string; icon: IconDefinition }[] = [
  { tab: 'requests', labelKey: 'tabs.requests', icon: faClipboardList },
  { tab: 'chat',     labelKey: 'tabs.chat',     icon: faComments },
  { tab: 'agenda',   labelKey: 'tabs.agenda',   icon: faCalendarDays },
  { tab: 'settings', labelKey: 'tabs.settings', icon: faGear },
]

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const { toggleSidebar } = useSidebar()
  const { t } = useTranslation('business')

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
              className={`text-xl ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <span
              className={`text-[10px] ${activeTab === tab ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              {t(labelKey)}
            </span>
          </button>
        ))}

        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 flex-1 h-full justify-center"
        >
          <FontAwesomeIcon icon={faBars} className="text-xl text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{t('tabs.more', { ns: 'pets' })}</span>
        </button>
      </div>
    </nav>
  )
}
