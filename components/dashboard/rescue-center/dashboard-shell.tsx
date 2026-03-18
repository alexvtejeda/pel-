'use client'

import { useState, useRef } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { RescueCenterSidebar } from './rescue-center-sidebar'
import { PetsTab, PetsTabHandle } from './pets-tab'
import { InterestedTab } from './interested-tab'
import { FormsTab } from './forms-tab'
import { SettingsTab } from './settings-tab'
import { AgendaTab, AgendaItem } from './agenda-tab'
import { MobileBottomNav } from './mobile-bottom-nav'
import { MetricsTab } from './metrics-tab'
import { ChatTab } from './chat-tab'
import { NotificationBell } from './notification-bell'

type Tab = 'pets' | 'interested' | 'forms' | 'agenda' | 'chat' | 'metrics' | 'settings'

const tabTitles: Record<Tab, string> = {
  pets:          'Mascotas',
  interested:    'Interesados',
  forms:         'Formulario',
  agenda:        'Agenda',
  chat:          'Chat',
  metrics:       'Métricas',
  settings:      'Ajustes',
}

export function DashboardShell() {
  const [activeTab, setActiveTab] = useState<Tab>('pets')
  const petsTabRef = useRef<PetsTabHandle>(null)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [targetSubmissionId, setTargetSubmissionId] = useState<string | null>(null)

  const handleNavigateToSubmission = (submissionId: string) => {
    setTargetSubmissionId(submissionId)
    setActiveTab('interested')
  }

  const addAgendaItem = (item: Omit<AgendaItem, 'id'>) => {
    setAgendaItems(prev => [...prev, { ...item, id: crypto.randomUUID() }])
  }

  return (
    <SidebarProvider>
      <RescueCenterSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset className="bg-sidebar h-screen overflow-hidden">
        <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 px-4 text-sidebar-foreground">
          <SidebarTrigger className="hidden md:flex" />
          <h1 className="text-lg font-semibold flex-1 text-sidebar-primary">{tabTitles[activeTab]}</h1>
          <NotificationBell />
        </header>
        <main className={`bg-background md:rounded-tl-2xl flex-1 min-h-0 ${activeTab === 'chat' ? 'overflow-hidden' : 'p-4 pb-20 md:pb-4 overflow-y-auto'}`}>
          {activeTab === 'pets' && <PetsTab ref={petsTabRef} onNavigateToSubmission={handleNavigateToSubmission} />}
          {activeTab === 'interested' && (
            <InterestedTab
              onAddToAgenda={addAgendaItem}
              targetSubmissionId={targetSubmissionId}
              onTargetHandled={() => setTargetSubmissionId(null)}
            />
          )}
          {activeTab === 'forms' && <FormsTab />}
          {activeTab === 'agenda' && <AgendaTab items={agendaItems} />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'metrics' && <MetricsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </SidebarInset>
    </SidebarProvider>
  )
}
