'use client'

import { PawPrint, Users, ClipboardList, Settings } from 'lucide-react'
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

type Tab = 'pets' | 'interested' | 'forms' | 'settings'

interface RescueCenterSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; label: string; icon: React.ElementType }[] = [
  { tab: 'pets', label: 'Mascotas', icon: PawPrint },
  { tab: 'interested', label: 'Interesados', icon: Users },
  { tab: 'forms', label: 'Formulario', icon: ClipboardList },
  { tab: 'settings', label: 'Ajustes', icon: Settings },
]

export function RescueCenterSidebar({ activeTab, onTabChange }: RescueCenterSidebarProps) {
  const { state } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className='p-3'>
        <Logo showText={state === 'expanded'} width={32} height={32} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className={`my-5 gap-8 ${state === 'collapsed' ? 'items-center gap-8' : ''}`}>
          {navItems.map(({ tab, label, icon: Icon }) => (
            <SidebarMenuItem key={tab}>
              <SidebarMenuButton
                isActive={activeTab === tab}
                onClick={() => onTabChange(tab)}
                tooltip={label}
                className={state === 'collapsed' ? 'p-3' : ''}
              >
                <Icon />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Logo showText={false} width={32} height={32} />
      </SidebarFooter>
    </Sidebar>
  )
}
