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
import { Bell, Search, Radio, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

const viewTitles: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard', description: 'System overview and real-time monitoring' },
  users: { title: 'RADIUS Users', description: 'Manage user accounts and authentication' },
  nas: { title: 'NAS Devices', description: 'Network Access Server management' },
  plans: { title: 'Billing Plans', description: 'Subscription packages and pricing' },
  policies: { title: 'Policy Engine', description: 'Authorization rules and access control' },
  sessions: { title: 'Active Sessions', description: 'Real-time session monitoring' },
  billing: { title: 'Invoices & Payments', description: 'Billing and revenue management' },
  reports: { title: 'Reports & Analytics', description: 'Usage statistics and insights' },
  settings: { title: 'System Settings', description: 'Configuration and maintenance' },
}

export default function Home() {
  const activeView = useAppStore((s) => s.activeView)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  const currentView = viewTitles[activeView] || viewTitles.dashboard

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-muted/30">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header Bar */}
          <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
            {/* Breadcrumb / View Title */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                <Radio className="h-3.5 w-3.5 text-primary" />
              </div>
              <Separator orientation="vertical" className="h-5" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">{currentView.title}</h2>
              </div>
            </div>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-sm mx-auto">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users, NAS, sessions..."
                  className="h-8 pl-8 text-xs bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-[10px] font-normal px-2 h-6 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                FreeRADIUS Online
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block">
                  <p className="text-xs font-medium leading-none">Admin</p>
                  <p className="text-[10px] text-muted-foreground">System Administrator</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6 lg:p-8 max-w-[1600px]">
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

          {/* Status Footer */}
          <footer className="flex h-8 shrink-0 items-center justify-between border-t bg-background px-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>FreeRADIUS AAA/BSS v1.0.0</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Users: 25</span>
              <Separator orientation="vertical" className="h-3" />
              <span>NAS: 9/9</span>
              <Separator orientation="vertical" className="h-3" />
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All Systems Operational
              </span>
            </div>
          </footer>
        </div>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
