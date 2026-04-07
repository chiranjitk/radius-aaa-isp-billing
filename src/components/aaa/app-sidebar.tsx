'use client'

import { useAppStore, type ViewId } from '@/lib/store'
import {
  LayoutDashboard,
  Users,
  Server,
  CreditCard,
  Shield,
  Activity,
  FileText,
  BarChart3,
  Settings,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ElementType
  badge?: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'RADIUS Users', icon: Users, badge: 'AAA' },
  { id: 'nas', label: 'NAS Devices', icon: Server, badge: 'AAA' },
  { id: 'plans', label: 'Billing Plans', icon: CreditCard, badge: 'BSS' },
  { id: 'policies', label: 'Policies', icon: Shield, badge: 'AAA' },
  { id: 'sessions', label: 'Sessions', icon: Activity, badge: 'AAA' },
  { id: 'billing', label: 'Invoices & Payments', icon: FileText, badge: 'BSS' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: 'BSS' },
  { id: 'settings', label: 'System Settings', icon: Settings },
]

const groupedItems = {
  'Overview': ['dashboard'] as ViewId[],
  'AAA - Authentication, Authorization & Accounting': ['users', 'nas', 'policies', 'sessions'] as ViewId[],
  'BSS - Business Support System': ['plans', 'billing', 'reports'] as ViewId[],
  'System': ['settings'] as ViewId[],
}

export function AppSidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-screen sticky top-0',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
            <Radio className="h-4 w-4" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold tracking-tight truncate">FreeRADIUS</span>
              <span className="text-[10px] text-muted-foreground truncate">AAA/BSS Management</span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="flex justify-end px-2 py-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-2">
          {Object.entries(groupedItems).map(([group, ids]) => (
            <div key={group} className="mb-4">
              {sidebarOpen && (
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
              )}
              {!sidebarOpen && <Separator className="mb-2" />}
              {ids.map((id) => {
                const item = navItems.find((n) => n.id === id)!
                const Icon = item.icon
                const isActive = activeView === id

                const button = (
                  <button
                    key={id}
                    onClick={() => setActiveView(id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                    {sidebarOpen && item.badge && (
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )

                if (!sidebarOpen) {
                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-muted">
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return button
              })}
            </div>
          ))}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-3 py-2 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">System Online</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
