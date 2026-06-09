'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AdminSidebar } from './admin-sidebar'
import { RescueCentersTab } from './rescue-centers-tab'
import { AdminFormTab } from './admin-form-tab'
import { AdminSettingsTab } from './admin-settings-tab'
import { AdminMobileNav } from './admin-mobile-nav'
import { ChatTab } from '../rescue-center/chat-tab'
import { ReportIssueButton } from './report-issue-button'

type Tab = 'rescue-centers' | 'form-template' | 'chat' | 'settings'

const tabTitleKeys: Record<Tab, string> = {
  'rescue-centers': 'admin.tabs.rescue_centers',
  'form-template':  'admin.tabs.adoption_template',
  'chat':           'admin.tabs.chat',
  'settings':       'admin.tabs.settings',
}

export function AdminDashboardShell() {
  const { t } = useTranslation('pets')
  const [activeTab, setActiveTab] = useState<Tab>('rescue-centers')

  return (
    <SidebarProvider>
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset className="bg-sidebar h-screen overflow-hidden">
        <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 px-4 text-sidebar-foreground">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-semibold flex-1 text-sidebar-primary">{t(tabTitleKeys[activeTab])}</h1>
        </header>
        <main className={`bg-background md:rounded-tl-2xl flex-1 min-h-0 ${activeTab === 'chat' ? 'overflow-hidden' : 'p-4 pb-20 md:pb-4 overflow-y-auto'}`}>
          {activeTab === 'rescue-centers' && <RescueCentersTab />}
          {activeTab === 'form-template' && <AdminFormTab />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'settings' && <AdminSettingsTab />}
        </main>
        <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />
        <ReportIssueButton />
      </SidebarInset>
    </SidebarProvider>
  )
}
