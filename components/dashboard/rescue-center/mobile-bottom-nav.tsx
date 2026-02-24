'use client'

import { PawPrint, Users, ClipboardList, Menu } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'

type Tab = 'pets' | 'interested' | 'forms' | 'agenda' | 'notifications' | 'settings'

interface MobileBottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; label: string; Icon: React.ElementType }[] = [
  { tab: 'pets',       label: 'Mascotas',    Icon: PawPrint },
  { tab: 'interested', label: 'Interesados', Icon: Users },
  { tab: 'forms',      label: 'Formulario',  Icon: ClipboardList },
]

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ tab, label, Icon }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex flex-col items-center gap-1 flex-1 h-full justify-center"
          >
            <Icon
              size={20}
              className={activeTab === tab ? 'text-primary' : 'text-muted-foreground'}
            />
            <span
              className={`text-[10px] ${activeTab === tab ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
          </button>
        ))}

        {/* Hamburger — opens the sidebar sheet */}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 flex-1 h-full justify-center"
        >
          <Menu size={20} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Más</span>
        </button>
      </div>
    </nav>
  )
}
