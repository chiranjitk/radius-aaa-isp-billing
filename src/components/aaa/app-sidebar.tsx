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
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ElementType
  badge?: string
  badgeColor?: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'RADIUS Users', icon: Users, badge: 'AAA', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'nas', label: 'NAS Devices', icon: Server, badge: 'AAA', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'policies', label: 'Policies', icon: Shield, badge: 'AAA', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'sessions', label: 'Sessions', icon: Activity, badge: 'AAA', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'plans', label: 'Billing Plans', icon: CreditCard, badge: 'BSS', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'billing', label: 'Invoices & Payments', icon: FileText, badge: 'BSS', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: 'BSS', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'dictionary', label: 'RADIUS Dictionary', icon: BookOpen },
  { id: 'settings', label: 'System Settings', icon: Settings },
]

const groupedItems = {
  'Overview': ['dashboard'] as ViewId[],
  'AAA': ['users', 'nas', 'policies', 'sessions'] as ViewId[],
  'BSS': ['plans', 'billing', 'reports'] as ViewId[],
  'System': ['dictionary', 'settings'] as ViewId[],
}

export function AppSidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-300 ease-in-out shrink-0 relative z-30',
          sidebarOpen ? 'w-60' : 'w-[58px]'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 h-14 px-3 border-b shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shrink-0 shadow-sm">
            <Radio className="h-4.5 w-4.5" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-sm font-bold tracking-tight truncate">FreeRADIUS</span>
              <span className="text-[10px] text-muted-foreground truncate">AAA/BSS Platform</span>
            </div>
          )}
        </div>

        {/* Quick Status */}
        {sidebarOpen && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-1.5 dark:bg-emerald-950/30">
                <Zap className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">25</span>
                <span className="text-[8px] text-muted-foreground">Users</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-sky-50 px-2 py-1.5 dark:bg-sky-950/30">
                <Wifi className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-400">9</span>
                <span className="text-[8px] text-muted-foreground">NAS</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-purple-50 px-2 py-1.5 dark:bg-purple-950/30">
                <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400">5</span>
                <span className="text-[8px] text-muted-foreground">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-2">
          {Object.entries(groupedItems).map(([group, ids]) => (
            <div key={group} className="mb-3">
              {sidebarOpen && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group}
                </p>
              )}
              {!sidebarOpen && <Separator className="mb-2 opacity-50" />}
              {ids.map((id) => {
                const item = navItems.find((n) => n.id === id)!
                const Icon = item.icon
                const isActive = activeView === id

                const button = (
                  <button
                    key={id}
                    onClick={() => setActiveView(id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
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
                          'text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none',
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : item.badgeColor || 'bg-muted text-muted-foreground'
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
                      <TooltipContent side="right" className="flex items-center gap-2 text-xs">
                        {item.label}
                        {item.badge && (
                          <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded', item.badgeColor)}>
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

        {/* Footer / Collapse */}
        <div className="border-t px-2 py-2 shrink-0 space-y-1">
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">System Operational</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 justify-center text-muted-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                <span className="text-[11px]">Collapse</span>
              </>
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
