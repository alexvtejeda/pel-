'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldCat, faFileLines, faGear } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

type Tab = 'rescue-centers' | 'form-template' | 'settings'

interface AdminMobileNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; label: string; icon: IconDefinition }[] = [
  { tab: 'rescue-centers', label: 'Centros',       icon: faShieldCat },
  { tab: 'form-template',  label: 'Formulario',    icon: faFileLines },
  { tab: 'settings',       label: 'Configuración', icon: faGear },
]

export function AdminMobileNav({ activeTab, onTabChange }: AdminMobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ tab, label, icon }) => (
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
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
