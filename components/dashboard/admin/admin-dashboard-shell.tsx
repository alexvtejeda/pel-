'use client'

import { useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AdminSidebar } from './admin-sidebar'
import { RescueCentersTab } from './rescue-centers-tab'
import { AdminFormTab } from './admin-form-tab'
import { AdminSettingsTab } from './admin-settings-tab'
import { AdminMobileNav } from './admin-mobile-nav'

type Tab = 'rescue-centers' | 'form-template' | 'settings'

const tabTitles: Record<Tab, string> = {
  'rescue-centers': 'Centros de rescate',
  'form-template':  'Plantilla de adopción',
  'settings':       'Configuración',
}

export function AdminDashboardShell() {
  const [activeTab, setActiveTab] = useState<Tab>('rescue-centers')

  return (
    <SidebarProvider>
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset>
        <header className="bg-sidebar flex h-14 items-center gap-2 px-4">
          <SidebarTrigger className="hidden md:flex" />
          <h1 className="text-lg font-semibold flex-1">{tabTitles[activeTab]}</h1>
        </header>
        <main className="p-4 pb-20 md:pb-4">
          {activeTab === 'rescue-centers' && <RescueCentersTab />}
          {activeTab === 'form-template' && <AdminFormTab />}
          {activeTab === 'settings' && <AdminSettingsTab />}
        </main>
        <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      </SidebarInset>
    </SidebarProvider>
  )
}
