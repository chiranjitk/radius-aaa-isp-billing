'use client'

import { useAppStore, type ViewId, type UserRole } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
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
  TrendingUp,
  TrendingDown,
  Globe,
  UserPlus,
  UserCog,
  Network,
  ScrollText,
  Crown,
  Wrench,
  BookOpenCheck,
  Headphones,
  MapPin,
  Ticket,
  Building2,
  Bell,
  Webhook,
  KeyRound,
  Percent,
  Wallet,
  Tag,
  Calculator,
  ShieldCheck,
  HardDrive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  category?: string
  categoryColor?: string
}

const allNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: ScrollText, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'users', label: 'RADIUS Users', icon: Users, category: 'AAA', categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'nas', label: 'NAS Devices', icon: Server, category: 'AAA', categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'policies', label: 'Policies', icon: Shield, category: 'AAA', categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'sessions', label: 'Sessions', icon: Activity, category: 'AAA', categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 'plans', label: 'Billing Plans', icon: CreditCard, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'billing', label: 'Invoices & Payments', icon: FileText, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'dictionary', label: 'RADIUS Dictionary', icon: BookOpen, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'ip-pools', label: 'IP Pools', icon: Globe, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'settings', label: 'System Settings', icon: Settings, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'registrations', label: 'Registrations', icon: UserPlus, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'selfcare', label: 'Selfcare Portal', icon: UserCog, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'topology', label: 'Network Topology', icon: Network, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'bandwidth', label: 'Bandwidth Analytics', icon: TrendingUp, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'tickets', label: 'Tickets', icon: Headphones, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'hotspot', label: 'Hotspot Locations', icon: MapPin, category: 'HSP', categoryColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' },
  { id: 'vouchers', label: 'Voucher Manager', icon: Ticket, category: 'HSP', categoryColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' },
  { id: 'resellers', label: 'Resellers', icon: Building2, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'notifications', label: 'Notifications', icon: Bell, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'tax', label: 'Tax & Zones', icon: Percent, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'wallet', label: 'Wallet / Prepaid', icon: Wallet, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'coupons', label: 'Coupons', icon: Tag, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'billing-engine', label: 'Billing Engine', icon: Calculator, category: 'BSS', categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
  { id: 'system-ops', label: 'System Ops', icon: HardDrive, category: 'SYS', categoryColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
]

const groupedItems = {
  'Overview': ['dashboard', 'activity'] as ViewId[],
  'AAA': ['users', 'nas', 'policies', 'sessions'] as ViewId[],
  'BSS': ['plans', 'billing', 'reports', 'bandwidth', 'tickets', 'resellers', 'tax', 'wallet', 'coupons', 'billing-engine'] as ViewId[],
  'Hotspot': ['hotspot', 'vouchers'] as ViewId[],
  'System': ['dictionary', 'ip-pools', 'settings', 'registrations', 'selfcare', 'topology', 'notifications', 'webhooks', 'api-keys', 'admin', 'system-ops'] as ViewId[],
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; colorClass: string; badgeClass: string }> = {
  admin: {
    label: 'ADMIN',
    icon: Crown,
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40',
  },
  operator: {
    label: 'OPERATOR',
    icon: Wrench,
    colorClass: 'text-amber-700 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40',
  },
  viewer: {
    label: 'VIEWER',
    icon: BookOpenCheck,
    colorClass: 'text-slate-600 dark:text-slate-400',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/40',
  },
}

export function AppSidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, hasPermission, activeRole } = useAppStore()

  const { data: quickStats } = useQuery({
    queryKey: ['sidebar-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      return {
        totalUsers: data.totalUsers ?? 0,
        totalNas: data.totalNas ?? 0,
        activeSessions: data.activeSessions ?? 0,
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  // Filter nav items based on permissions
  const filteredGroupedItems = Object.fromEntries(
    Object.entries(groupedItems).map(([group, ids]) => [
      group,
      ids.filter((id) => hasPermission(id, 'view')),
    ])
  ) as Record<string, ViewId[]>

  const role = roleConfig[activeRole]
  const RoleIcon = role.icon

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'glass-card flex flex-col transition-all duration-300 ease-in-out shrink-0 relative z-30',
          sidebarOpen ? 'w-64' : 'w-[58px]'
        )}
      >
        {/* Logo / Brand */}
        <div className="relative flex items-center gap-3 h-14 px-3 border-b shrink-0 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent overflow-hidden">
          {/* dot-pattern overlay */}
          <div className="dot-pattern absolute inset-0 opacity-50 pointer-events-none" />
          <div className="gradient-border flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shrink-0 shadow-md shadow-primary/20">
            <Radio className="h-4.5 w-4.5" />
          </div>
          {sidebarOpen && (
            <div className="relative flex flex-col overflow-hidden min-w-0 z-10">
              <span className="text-sm font-bold tracking-tight truncate leading-tight">FreeRADIUS</span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight flex items-center gap-1">
                AAA/BSS Platform
                <span className="relative flex h-1.5 w-1.5">
                  <span className="status-pulse pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Quick Status — Expanded */}
        {sidebarOpen && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="grid grid-cols-3 gap-2">
              {/* Users Stat */}
              <div className="card-hover shine-hover flex flex-col items-center gap-0.5 rounded-lg border border-emerald-200/60 bg-emerald-50/80 px-2 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-0.5">
                  <Zap className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                </div>
                <span className={cn("text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400 leading-tight", !quickStats && "animate-pulse")}>{quickStats?.totalUsers ?? '—'}</span>
                <span className="text-[8px] text-muted-foreground leading-tight">Users</span>
              </div>
              {/* NAS Stat */}
              <div className="card-hover shine-hover flex flex-col items-center gap-0.5 rounded-lg border border-sky-200/60 bg-sky-50/80 px-2 py-2 dark:border-sky-800/40 dark:bg-sky-950/20">
                <div className="flex items-center gap-0.5">
                  <Wifi className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                  <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                </div>
                <span className={cn("text-[11px] font-bold tabular-nums text-sky-700 dark:text-sky-400 leading-tight", !quickStats && "animate-pulse")}>{quickStats?.totalNas ?? '—'}</span>
                <span className="text-[8px] text-muted-foreground leading-tight">NAS</span>
              </div>
              {/* Active Sessions Stat */}
              <div className="card-hover shine-hover flex flex-col items-center gap-0.5 rounded-lg border border-violet-200/60 bg-violet-50/80 px-2 py-2 dark:border-violet-800/40 dark:bg-violet-950/20">
                <div className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                  {quickStats && quickStats.activeSessions > 0 ? (
                    <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 text-red-400" />
                  )}
                </div>
                <span className={cn("text-[11px] font-bold tabular-nums text-violet-700 dark:text-violet-400 leading-tight", !quickStats && "animate-pulse")}>{quickStats?.activeSessions ?? '—'}</span>
                <span className="text-[8px] text-muted-foreground leading-tight">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Status — Collapsed: show only numbers in vertical stack */}
        {!sidebarOpen && quickStats && (
          <div className="px-1.5 pt-2 pb-1 shrink-0 flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 cursor-default">
                  {quickStats.totalUsers}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Users: {quickStats.totalUsers}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-bold tabular-nums text-sky-600 dark:text-sky-400 cursor-default">
                  {quickStats.totalNas}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">NAS: {quickStats.totalNas}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-bold tabular-nums text-violet-600 dark:text-violet-400 cursor-default">
                  {quickStats.activeSessions}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Active: {quickStats.activeSessions}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-2">
          {Object.entries(filteredGroupedItems).map(([group, ids]) => {
            // Skip groups with no visible items
            if (ids.length === 0) return null
            return (
              <div key={group} className="mb-3">
                {sidebarOpen && (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {group}
                  </p>
                )}
                {!sidebarOpen && <Separator className="mb-2 opacity-50" />}
                {ids.map((id) => {
                  const item = allNavItems.find((n) => n.id === id)!
                  const Icon = item.icon
                  const isActive = activeView === id

                  const button = (
                    <button
                      key={id}
                      onClick={() => setActiveView(id)}
                      className={cn(
                        'group relative w-full flex items-center gap-2.5 rounded-lg text-[13px] transition-all duration-200 hover:scale-[1.02] hover-lift',
                        sidebarOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center',
                        isActive
                          ? 'bg-gradient-to-r from-primary/8 to-transparent text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
                      )}
                    >
                      {/* Active indicator — expanded: left border with glow */}
                      {sidebarOpen && (
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary transition-all duration-300',
                            isActive
                              ? 'opacity-100 scale-y-100 shadow-[0_0_6px_var(--primary)]'
                              : 'opacity-0 scale-y-0 group-hover:opacity-60 group-hover:scale-y-75'
                          )}
                        />
                      )}
                      {/* Active indicator — collapsed: colored dot */}
                      {!sidebarOpen && (
                        <span
                          className={cn(
                            'absolute -left-0.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary transition-all duration-300',
                            isActive
                              ? 'opacity-100 scale-100'
                              : 'opacity-0 scale-0 group-hover:opacity-50 group-hover:scale-75'
                          )}
                        />
                      )}
                      <Icon className={cn(
                        'h-4 w-4 shrink-0 transition-colors duration-200',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'
                      )} />
                      {sidebarOpen && (
                        <span className={cn(
                          'flex-1 text-left truncate',
                          isActive && 'gradient-text'
                        )}>
                          {item.label}
                        </span>
                      )}
                      {sidebarOpen && item.category && (
                        <span
                          className={cn(
                            'text-[8px] font-bold px-1.5 py-0.5 rounded leading-none tracking-wide',
                            isActive
                              ? 'bg-primary/15 text-primary'
                              : item.categoryColor || 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.category}
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
                          {item.category && (
                            <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded', item.categoryColor)}>
                              {item.category}
                            </span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return button
                })}
              </div>
            )
          })}
        </ScrollArea>

        {/* Footer / Collapse */}
        <div className="border-t px-2 py-2 shrink-0 space-y-1">
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-emerald-500 pulse-ring" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 status-pulse opacity-75" />
              </div>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">System Operational</span>
            </div>
          )}

          {/* Role Badge */}
          {sidebarOpen && (
            <div className="flex items-center justify-center px-2 py-1">
              <Badge variant="outline" className={cn('flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-0.5 rounded-full border', role.badgeClass)}>
                <RoleIcon className="h-3 w-3" />
                {role.label}
              </Badge>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'glass-card h-7 w-9 rounded-full p-0 flex items-center justify-center',
                'text-muted-foreground transition-all duration-200',
                'hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_8px_var(--primary)/20]'
              )}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <Separator className="opacity-40" />
          {sidebarOpen && (
            <div className="px-3 pt-0.5 pb-1 flex flex-col gap-0">
              <span className="text-[10px] font-semibold text-muted-foreground/60 tabular-nums">
                v<span className="gradient-text">2.1.0</span>
              </span>
              <span className="text-[10px] text-muted-foreground/50">&copy; 2025 FreeRADIUS BSS</span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[8px] font-semibold text-muted-foreground/40 tabular-nums cursor-default">
                    <span className="gradient-text">2.5</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">v2.5.0 — &copy; 2025 FreeRADIUS BSS</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
