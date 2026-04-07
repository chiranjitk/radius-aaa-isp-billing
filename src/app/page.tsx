'use client'

import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
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
import { DictionaryView } from '@/components/aaa/dictionary-view'
import { NotificationCenter } from '@/components/aaa/notification-center'
import { CommandPalette, useCommandPaletteStore } from '@/components/aaa/command-palette'
import { Toaster } from '@/components/ui/sonner'
import { Search, Radio, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  dictionary: { title: 'RADIUS Dictionary', description: 'Attribute reference and vendor dictionaries' },
}

interface FooterStats {
  totalUsers: number
  totalNas: number
  onlineNas: number
  activeSessions: number
}

export default function Home() {
  const activeView = useAppStore((s) => s.activeView)
  const { theme, setTheme } = useTheme()
  const commandPaletteStore = useCommandPaletteStore()

  const currentView = viewTitles[activeView] || viewTitles.dashboard

  // Fetch footer stats from dashboard API
  const { data: footerStats } = useQuery<FooterStats>({
    queryKey: ['footer-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      return {
        totalUsers: data.totalUsers ?? 0,
        totalNas: data.totalNas ?? 0,
        onlineNas: data.onlineNas ?? 0,
        activeSessions: data.activeSessions ?? 0,
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  return (
    <>
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

            {/* Search - opens command palette */}
            <div className="hidden md:flex flex-1 max-w-sm mx-auto">
              <button
                onClick={commandPaletteStore.open}
                className="flex w-full items-center gap-2 rounded-md border border-border/50 bg-muted/50 h-8 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>

              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-[10px] font-normal px-2 h-6 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                FreeRADIUS Online
              </Badge>
              <NotificationCenter />
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
              {activeView === 'dictionary' && <DictionaryView />}
            </div>
          </main>

          {/* Status Footer - Dynamic */}
          <footer className="flex h-8 shrink-0 items-center justify-between border-t bg-background px-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="font-medium">FreeRADIUS AAA/BSS v2.0.0</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>
                Users: <span className="font-medium text-foreground">{footerStats?.totalUsers ?? '—'}</span>
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span>
                Active: <span className="font-medium text-emerald-600 dark:text-emerald-400">{footerStats?.activeSessions ?? '—'}</span>
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span>
                NAS: <span className="font-medium text-foreground">{footerStats?.onlineNas ?? '—'}/{footerStats?.totalNas ?? '—'}</span>
              </span>
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
      <CommandPalette />
    </>
  )
}
