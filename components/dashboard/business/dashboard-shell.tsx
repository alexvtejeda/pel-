'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { BusinessSidebar } from './business-sidebar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { RequestsTab } from './requests-tab'
import { SettingsTab } from './settings-tab'
import { ChatTab } from '@/components/dashboard/rescue-center/chat-tab'
import { AgendaTab, AgendaItem } from '@/components/dashboard/rescue-center/agenda-tab'
import { NotificationBell } from '@/components/dashboard/rescue-center/notification-bell'

type Tab = 'requests' | 'chat' | 'agenda' | 'settings'

const tabTitleKeys: Record<Tab, string> = {
  requests: 'tabs.requests',
  chat:     'tabs.chat',
  agenda:   'tabs.agenda',
  settings: 'tabs.settings',
}

export function BusinessDashboardShell() {
  const { t } = useTranslation('business')
  const [activeTab, setActiveTab] = useState<Tab>('requests')
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])

  const addAgendaItem = (item: Omit<AgendaItem, 'id'>) => {
    setAgendaItems(prev => [...prev, { ...item, id: crypto.randomUUID() }])
  }

  return (
    <SidebarProvider>
      <BusinessSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset className="bg-sidebar h-screen overflow-hidden">
        <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 px-4 text-sidebar-foreground">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-semibold flex-1 text-sidebar-primary">{t(tabTitleKeys[activeTab])}</h1>
          <NotificationBell />
        </header>
        <main className={`bg-background md:rounded-tl-2xl flex-1 min-h-0 ${activeTab === 'chat' ? 'overflow-hidden pb-16 md:pb-0' : 'p-4 pb-20 md:pb-4 overflow-y-auto'}`}>
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'agenda' && <AgendaTab items={agendaItems} />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </SidebarInset>
    </SidebarProvider>
  )
}
