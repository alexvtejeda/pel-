'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faUsers, faClipboardList, faCalendarDays, faBell, faGear } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Logo } from '@/components/logo'
import { useAuth } from '@/lib/contexts/auth-context'

function nameFromEmail(email: string): string {
  const prefix = email.split('@')[0]
  return prefix
    .split(/[._+]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type Tab = 'pets' | 'interested' | 'forms' | 'agenda' | 'notifications' | 'settings'

interface RescueCenterSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; label: string; icon: IconDefinition }[] = [
  { tab: 'pets',          label: 'Mascotas',       icon: faPaw },
  { tab: 'interested',    label: 'Interesados',    icon: faUsers },
  { tab: 'forms',         label: 'Formulario',     icon: faClipboardList },
  { tab: 'agenda',        label: 'Agenda',         icon: faCalendarDays },
  { tab: 'notifications', label: 'Notificaciones', icon: faBell },
  { tab: 'settings',      label: 'Ajustes',        icon: faGear },
]

export function RescueCenterSidebar({ activeTab, onTabChange }: RescueCenterSidebarProps) {
  const { state } = useSidebar()
  const { user } = useAuth()

  const email = user?.email ?? ''
  const displayName = email ? nameFromEmail(email) : ''
  const initial = email.charAt(0).toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className='p-3'>
        <Logo showText={state === 'expanded'} width={32} height={32} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className={`my-5 gap-8 ${state === 'collapsed' ? 'items-center gap-8' : ''}`}>
          {navItems.map(({ tab, label, icon }) => (
            <SidebarMenuItem key={tab}>
              <SidebarMenuButton
                isActive={activeTab === tab}
                onClick={() => onTabChange(tab)}
                tooltip={label}
                className={state === 'collapsed' ? 'p-3' : ''}
              >
                <FontAwesomeIcon icon={icon} className="w-4 h-4" />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div
          className={`flex items-center gap-3 cursor-pointer ${state === 'collapsed' ? 'justify-center' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
            {initial}
          </div>
          {state === 'expanded' && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
