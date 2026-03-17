'use client'

import { useState, useEffect, useRef } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons'
import { RescueCenterSidebar } from './rescue-center-sidebar'
import { PetsTab, PetsTabHandle } from './pets-tab'
import { InterestedTab } from './interested-tab'
import { FormsTab } from './forms-tab'
import { SettingsTab } from './settings-tab'
import { NotificationsTab, AppNotification } from './notifications-tab'
import { AgendaTab, AgendaItem } from './agenda-tab'
import { MobileBottomNav } from './mobile-bottom-nav'

type Tab = 'pets' | 'interested' | 'forms' | 'agenda' | 'notifications' | 'settings'

const tabTitles: Record<Tab, string> = {
  pets:          'Mascotas',
  interested:    'Interesados',
  forms:         'Formulario',
  agenda:        'Agenda',
  notifications: 'Notificaciones',
  settings:      'Ajustes',
}

export function DashboardShell() {
  const [activeTab, setActiveTab] = useState<Tab>('pets')
  const petsTabRef = useRef<PetsTabHandle>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [targetSubmissionId, setTargetSubmissionId] = useState<string | null>(null)

  const handleNavigateToSubmission = (submissionId: string) => {
    setTargetSubmissionId(submissionId)
    setActiveTab('interested')
  }

  const addAgendaItem = (item: Omit<AgendaItem, 'id'>) => {
    setAgendaItems(prev => [...prev, { ...item, id: crypto.randomUUID() }])
  }

  const addNotification = (title: string, body: string) => {
    const n: AppNotification = { id: crypto.randomUUID(), title, body, receivedAt: new Date() }
    setNotifications(prev => [n, ...prev])
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }

  useEffect(() => {
    // Request browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission()
    }

    // Simulate an adopter submitting a form after 3s
    const t = setTimeout(() => {
      addNotification(
        'Nuevo formulario recibido',
        'María García ha enviado su formulario de adopción para Luna.'
      )
    }, 3000)

    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SidebarProvider>
      <RescueCenterSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset>
        <header className="bg-sidebar flex h-14 items-center gap-2 px-4">
          <SidebarTrigger className="hidden md:flex" />
          <h1 className="text-lg font-semibold flex-1">{tabTitles[activeTab]}</h1>
          {activeTab === 'pets' && (
            <button
              type="button"
              onClick={() => petsTabRef.current?.openUpload()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <FontAwesomeIcon icon={faCirclePlus} className="w-5 h-5" />
            </button>
          )}
        </header>
        <main className="p-4 pb-20 md:pb-4">
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
          {activeTab === 'notifications' && <NotificationsTab notifications={notifications} />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </SidebarInset>
    </SidebarProvider>
  )
}
