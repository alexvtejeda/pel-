'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faUsers, faClipboardList, faComments, faChartLine, faBars } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useSidebar } from '@/components/ui/sidebar'

type Tab = 'pets' | 'interested' | 'forms' | 'agenda' | 'chat' | 'metrics' | 'settings'

interface MobileBottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; labelKey: string; icon: IconDefinition }[] = [
  { tab: 'pets',       labelKey: 'tabs.pets',       icon: faPaw },
  { tab: 'interested', labelKey: 'tabs.interested', icon: faUsers },
  { tab: 'forms',      labelKey: 'tabs.forms',      icon: faClipboardList },
  { tab: 'chat',       labelKey: 'tabs.chat',       icon: faComments },
  { tab: 'metrics',    labelKey: 'tabs.metrics',    icon: faChartLine },
]

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const { toggleSidebar } = useSidebar()
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

        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 flex-1 h-full justify-center"
        >
          <FontAwesomeIcon icon={faBars} className="text-xl text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{t('tabs.more')}</span>
        </button>
      </div>
    </nav>
  )
}
