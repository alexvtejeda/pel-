'use client'

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faComments, faCalendarDays, faGear } from '@fortawesome/free-solid-svg-icons'
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
import { useTranslation } from 'react-i18next'

function nameFromEmail(email: string): string {
  const prefix = email.split('@')[0]
  return prefix
    .split(/[._+]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type Tab = 'requests' | 'chat' | 'agenda' | 'settings'

interface BusinessSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; labelKey: string; icon: IconDefinition }[] = [
  { tab: 'requests', labelKey: 'tabs.requests', icon: faClipboardList },
  { tab: 'chat',     labelKey: 'tabs.chat',     icon: faComments },
  { tab: 'agenda',   labelKey: 'tabs.agenda',   icon: faCalendarDays },
  { tab: 'settings', labelKey: 'tabs.settings', icon: faGear },
]

export function BusinessSidebar({ activeTab, onTabChange }: BusinessSidebarProps) {
  const { state } = useSidebar()
  const { user } = useAuth()
  const { t } = useTranslation('business')

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
          {navItems.map(({ tab, labelKey, icon }) => (
            <SidebarMenuItem key={tab}>
              <SidebarMenuButton
                isActive={activeTab === tab}
                onClick={() => onTabChange(tab)}
                tooltip={t(labelKey)}
                className={state === 'collapsed' ? 'p-3' : ''}
              >
                <FontAwesomeIcon icon={icon} className="text-md" />
                <span>{t(labelKey)}</span>
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background">
            {initial}
          </div>
          {state === 'expanded' && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-background">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
