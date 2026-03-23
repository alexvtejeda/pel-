'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
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

const tabTitleKeys: Record<Tab, string> = {
  pets:          'tabs.pets',
  interested:    'tabs.interested',
  forms:         'tabs.forms',
  agenda:        'tabs.agenda',
  chat:          'tabs.chat',
  metrics:       'tabs.metrics',
  settings:      'tabs.settings',
}

export function DashboardShell() {
  const { t } = useTranslation('pets')
  const [activeTab, setActiveTab] = useState<Tab>('pets')
  const petsTabRef = useRef<PetsTabHandle>(null)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [targetSubmissionId, setTargetSubmissionId] = useState<string | null>(null)
  const [formsDirty, setFormsDirty] = useState(false)
  const formsSaveRef = useRef<(() => Promise<void>) | null>(null)
  const [pendingTab, setPendingTab] = useState<Tab | null>(null)

  const handleNavigateToSubmission = (submissionId: string) => {
    setTargetSubmissionId(submissionId)
    setActiveTab('interested')
  }

  // Guarded tab change — if forms tab is dirty, show AlertDialog before leaving
  const handleTabChange = useCallback((tab: Tab) => {
    if (activeTab === 'forms' && formsDirty && tab !== 'forms') {
      setPendingTab(tab)
      return
    }
    setActiveTab(tab)
  }, [activeTab, formsDirty])

  const addAgendaItem = (item: Omit<AgendaItem, 'id'>) => {
    setAgendaItems(prev => [...prev, { ...item, id: crypto.randomUUID() }])
  }

  return (
    <SidebarProvider>
      <RescueCenterSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <SidebarInset className="bg-sidebar h-screen overflow-hidden">
        <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 px-4 text-sidebar-foreground">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-semibold flex-1 text-sidebar-primary">{t(tabTitleKeys[activeTab])}</h1>
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
          {activeTab === 'forms' && (
            <FormsTab
              onDirtyChange={setFormsDirty}
              onSaveRef={formsSaveRef}
            />
          )}
          {activeTab === 'agenda' && <AgendaTab items={agendaItems} />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'metrics' && <MetricsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
        <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </SidebarInset>

      {/* Unsaved changes dialog for sidebar tab switching */}
      <AlertDialog open={!!pendingTab} onOpenChange={open => { if (!open) setPendingTab(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('forms.unsaved_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('forms.unsaved_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTab(null)}>{t('cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-transparent border border-input text-foreground hover:bg-muted"
              onClick={() => { setActiveTab(pendingTab!); setPendingTab(null) }}
            >
              {t('forms.unsaved_discard')}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => {
                await formsSaveRef.current?.()
                setActiveTab(pendingTab!)
                setPendingTab(null)
              }}
            >
              {t('forms.unsaved_save')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
