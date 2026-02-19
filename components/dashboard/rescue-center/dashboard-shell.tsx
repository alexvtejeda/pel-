'use client'

import { useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { RescueCenterSidebar } from './rescue-center-sidebar'
import { PetsTab } from './pets-tab'
import { InterestedTab } from './interested-tab'
import { SettingsTab } from './settings-tab'

type Tab = 'pets' | 'interested' | 'forms' | 'settings'

const tabTitles: Record<Tab, string> = {
  pets: 'Mascotas',
  interested: 'Interesados',
  forms: 'Formulario',
  settings: 'Ajustes',
}

export function DashboardShell() {
  const [activeTab, setActiveTab] = useState<Tab>('pets')

  return (
    <SidebarProvider>
      <RescueCenterSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset>
        <header className="bg-sidebar flex h-14 items-center gap-2 px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">{tabTitles[activeTab]}</h1>
        </header>
        <main className="p-4">
          {activeTab === 'pets' && <PetsTab />}
          {activeTab === 'interested' && <InterestedTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'forms' && (
            <p className="text-muted-foreground text-sm">Editor de formularios — próximamente.</p>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
