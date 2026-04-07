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
import { Search, Radio, Moon, Sun, Shield, Clock, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const viewTitles: Record<string, { title: string; description: string; icon: string }> = {
  dashboard: { title: 'Dashboard', description: 'System overview and real-time monitoring', icon: 'radar' },
  users: { title: 'RADIUS Users', description: 'Manage user accounts and authentication', icon: 'users' },
  nas: { title: 'NAS Devices', description: 'Network Access Server management', icon: 'server' },
  plans: { title: 'Billing Plans', description: 'Subscription packages and pricing', icon: 'credit' },
  policies: { title: 'Policy Engine', description: 'Authorization rules and access control', icon: 'shield' },
  sessions: { title: 'Active Sessions', description: 'Real-time session monitoring', icon: 'activity' },
  billing: { title: 'Invoices & Payments', description: 'Billing and revenue management', icon: 'invoice' },
  reports: { title: 'Reports & Analytics', description: 'Usage statistics and insights', icon: 'chart' },
  settings: { title: 'System Settings', description: 'Configuration and maintenance', icon: 'settings' },
  dictionary: { title: 'RADIUS Dictionary', description: 'Attribute reference and vendor dictionaries', icon: 'book' },
}

interface FooterStats {
  totalUsers: number
  totalNas: number
  onlineNas: number
  activeSessions: number
  revenueThisMonth: number
}

export default function Home() {
  const activeView = useAppStore((s) => s.activeView)
  const { theme, setTheme } = useTheme()
  const commandPaletteStore = useCommandPaletteStore()

  const currentView = viewTitles[activeView] || viewTitles.dashboard

  // Fetch footer stats from dashboard API
  const { data: footerStats, isLoading: footerLoading } = useQuery<FooterStats>({
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
        revenueThisMonth: data.revenueThisMonth ?? 0,
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-muted/20">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header Bar */}
          <header className="glass-card flex h-14 shrink-0 items-center gap-4 border-b px-4 md:px-6 z-10">
            {/* Breadcrumb / View Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                <Radio className="h-4 w-4 text-primary" />
              </div>
              <Separator orientation="vertical" className="h-5 hidden md:block" />
              <div className="min-w-0 hidden md:block">
                <h2 className="text-sm font-semibold truncate tracking-tight">{currentView.title}</h2>
                <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">{currentView.description}</p>
              </div>
            </div>

            {/* Search - opens command palette */}
            <div className="hidden md:flex flex-1 max-w-sm mx-auto">
              <button
                onClick={commandPaletteStore.open}
                className="focus-ring flex w-full items-center gap-2 rounded-lg border border-border/40 bg-muted/30 h-9 px-3 text-xs text-muted-foreground transition-all hover:bg-muted/60 hover:border-border/60 hover:shadow-sm cursor-pointer"
              >
                <Search className="h-3.5 w-3.5 opacity-60" />
                <span className="flex-1 text-left">Search commands...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md border border-border/50 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-sm">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {/* Mobile Search Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 md:hidden rounded-lg"
                onClick={commandPaletteStore.open}
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 md:h-8 md:w-8 rounded-lg"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>

              {/* FreeRADIUS Status Badge */}
              <Badge variant="outline" className="hidden md:flex items-center gap-1.5 text-[10px] font-medium px-2.5 h-6 rounded-full border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400 badge-glow-success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-pulse" />
                FreeRADIUS Online
              </Badge>

              <NotificationCenter />
              <Separator orientation="vertical" className="h-5 mx-0.5" />
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9 md:h-8 md:w-8 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] font-bold">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block">
                  <p className="text-xs font-semibold leading-none">Admin</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">System Administrator</p>
                </div>
              </div>
            </div>
          </header>

          {/* View Description Bar */}
          <div className="hidden md:flex items-center gap-3 px-6 py-2 border-b bg-muted/10">
            <Badge variant="secondary" className="text-[10px] font-normal px-2 h-5 rounded-md">
              {activeView === 'dashboard' && <Activity className="h-3 w-3 mr-1" />}
              {activeView === 'users' && <Shield className="h-3 w-3 mr-1" />}
              {activeView === 'sessions' && <Clock className="h-3 w-3 mr-1" />}
              {currentView.description}
            </Badge>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] page-transition">
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

          {/* Status Footer */}
          <footer className="glass-card flex h-9 shrink-0 items-center justify-between border-t px-4 text-[10px] text-muted-foreground z-10">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-foreground/80">FreeRADIUS AAA/BSS</span>
              <Badge variant="outline" className="text-[9px] font-mono px-1.5 h-4 rounded bg-primary/5 border-primary/10 text-primary">
                v2.4.0
              </Badge>
              <Separator orientation="vertical" className="h-3" />
              <span className="hidden sm:inline">{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2.5">
              {footerLoading ? (
                <Skeleton className="h-3 w-32 rounded" />
              ) : (
                <>
                  <div className="hidden sm:flex items-center gap-1.5 px-1.5">
                    <span className="text-muted-foreground/60">Users</span>
                    <span className="font-semibold text-foreground tabular-nums">{footerStats?.totalUsers ?? '—'}</span>
                  </div>
                  <Separator orientation="vertical" className="h-3 hidden sm:block" />
                  <div className="flex items-center gap-1.5 px-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-pulse" />
                    <span className="text-muted-foreground/60">Active</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{footerStats?.activeSessions ?? '—'}</span>
                  </div>
                  <Separator orientation="vertical" className="h-3 hidden sm:block" />
                  <div className="hidden md:flex items-center gap-1.5 px-1.5">
                    <span className="text-muted-foreground/60">NAS</span>
                    <span className="font-semibold text-foreground tabular-nums">{footerStats?.onlineNas ?? '—'}/{footerStats?.totalNas ?? '—'}</span>
                  </div>
                  <Separator orientation="vertical" className="h-3 hidden md:block" />
                  <div className="hidden lg:flex items-center gap-1.5 px-1.5">
                    <span className="text-muted-foreground/60">Revenue</span>
                    <span className="font-semibold text-foreground tabular-nums">${footerStats?.revenueThisMonth?.toLocaleString() ?? '—'}</span>
                  </div>
                  <Separator orientation="vertical" className="h-3 hidden lg:block" />
                  <span className="flex items-center gap-1.5 px-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-pulse" />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 hidden xl:inline">All Systems Operational</span>
                  </span>
                </>
              )}
            </div>
          </footer>
        </div>
      </div>
      <Toaster position="top-right" richColors closeButton />
      <CommandPalette />
    </>
  )
}
