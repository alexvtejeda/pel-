'use client'

import { useState, useEffect } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { RescueCenterSidebar } from './rescue-center-sidebar'
import { PetsTab } from './pets-tab'
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
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])

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
          <h1 className="text-lg font-semibold">{tabTitles[activeTab]}</h1>
        </header>
        <main className="p-4 pb-20 md:pb-4">
          {activeTab === 'pets' && <PetsTab />}
          {activeTab === 'interested' && <InterestedTab onAddToAgenda={addAgendaItem} />}
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
