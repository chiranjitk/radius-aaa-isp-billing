'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppSidebar } from '@/components/aaa/app-sidebar'
import { useAppStore } from '@/lib/store'
import { DashboardView } from '@/components/aaa/dashboard-view'
import UsersView from '@/components/aaa/users-view'
import { NasView } from '@/components/aaa/nas-view'
import { PlansView } from '@/components/aaa/plans-view'
import { PoliciesView } from '@/components/aaa/policies-view'
import { SessionsView } from '@/components/aaa/sessions-view'
import { BillingView } from '@/components/aaa/billing-view'
import { ReportsView } from '@/components/aaa/reports-view'
import { SettingsView } from '@/components/aaa/settings-view'
import { Toaster } from '@/components/ui/sonner'

export default function Home() {
  const activeView = useAppStore((s) => s.activeView)
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'users' && <UsersView />}
            {activeView === 'nas' && <NasView />}
            {activeView === 'plans' && <PlansView />}
            {activeView === 'policies' && <PoliciesView />}
            {activeView === 'sessions' && <SessionsView />}
            {activeView === 'billing' && <BillingView />}
            {activeView === 'reports' && <ReportsView />}
            {activeView === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}
