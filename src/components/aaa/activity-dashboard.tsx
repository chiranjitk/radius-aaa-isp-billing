'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Download,
  FileSpreadsheet,
  FileJson,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Monitor,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  id: string
  userId: string | null
  username: string | null
  action: string
  module: string
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

interface ActivityStats {
  totalEvents24h: number
  authSuccessRate: number
  activeAlerts: number
  apiRequests: number
}

interface ActivityApiResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  stats: ActivityStats
}

// ---------------------------------------------------------------------------
// Action badge config
// ---------------------------------------------------------------------------

const actionConfig: Record<string, { label: string; colorClass: string; bgClass: string }> = {
  create: { label: 'Create', colorClass: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200/60 dark:border-emerald-800/40' },
  update: { label: 'Update', colorClass: 'text-amber-700 dark:text-amber-400', bgClass: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200/60 dark:border-amber-800/40' },
  delete: { label: 'Delete', colorClass: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/30 border-red-200/60 dark:border-red-800/40' },
  login: { label: 'Login', colorClass: 'text-violet-700 dark:text-violet-400', bgClass: 'bg-violet-100 dark:bg-violet-900/30 border-violet-200/60 dark:border-violet-800/40' },
  logout: { label: 'Logout', colorClass: 'text-slate-600 dark:text-slate-400', bgClass: 'bg-slate-100 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/40' },
  export: { label: 'Export', colorClass: 'text-teal-700 dark:text-teal-400', bgClass: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200/60 dark:border-teal-800/40' },
  auth_success: { label: 'Auth OK', colorClass: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200/60 dark:border-emerald-800/40' },
  auth_failed: { label: 'Auth Fail', colorClass: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/30 border-red-200/60 dark:border-red-800/40' },
  login_failed: { label: 'Login Fail', colorClass: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/30 border-red-200/60 dark:border-red-800/40' },
  disconnect: { label: 'Disconnect', colorClass: 'text-orange-700 dark:text-orange-400', bgClass: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200/60 dark:border-orange-800/40' },
}

const defaultActionConfig = { label: 'Other', colorClass: 'text-muted-foreground', bgClass: 'bg-muted border-border' }

// Module list for filter
const moduleOptions = [
  { value: '', label: 'All Modules' },
  { value: 'users', label: 'Users' },
  { value: 'nas', label: 'NAS' },
  { value: 'plans', label: 'Plans' },
  { value: 'policies', label: 'Policies' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'billing', label: 'Billing' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
  { value: 'dictionary', label: 'Dictionary' },
  { value: 'ip-pools', label: 'IP Pools' },
  { value: 'system', label: 'System' },
]

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'export', label: 'Export' },
  { value: 'auth_success', label: 'Auth Success' },
  { value: 'auth_failed', label: 'Auth Failed' },
  { value: 'disconnect', label: 'Disconnect' },
]

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityDashboard() {
  // Filter state
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  // Clear filters
  const clearFilters = useCallback(() => {
    setModuleFilter('')
    setActionFilter('')
    setUserSearch('')
    setPage(1)
  }, [])

  const hasActiveFilters = moduleFilter !== '' || actionFilter !== '' || userSearch !== ''

  // Fetch data with auto-refresh every 15 seconds
  const { data, isLoading, error, refetch, isFetching } = useQuery<ActivityApiResponse>({
    queryKey: ['activity-logs', moduleFilter, actionFilter, userSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (moduleFilter) params.set('module', moduleFilter)
      if (actionFilter) params.set('action', actionFilter)
      if (userSearch) params.set('username', userSearch)

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch activity logs')
      return res.json()
    },
    refetchInterval: 15000,
    staleTime: 10000,
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const stats = data?.stats

  // Export handlers
  const handleExportCSV = useCallback(() => {
    if (logs.length === 0) {
      toast.info('No data to export')
      return
    }
    const opts: ExportOptions = {
      headers: ['Timestamp', 'Username', 'Action', 'Module', 'Details', 'IP Address', 'User Agent'],
      rows: logs.map((log) => [
        formatFullTime(log.timestamp),
        log.username ?? '',
        log.action,
        log.module,
        log.details ?? '',
        log.ipAddress ?? '',
        log.userAgent ?? '',
      ]),
      filename: `activity-log-${new Date().toISOString().split('T')[0]}`,
      title: 'Activity Log Export',
    }
    exportToCSV(opts)
    toast.success('CSV exported successfully')
  }, [logs])

  const handleExportJSON = useCallback(() => {
    if (logs.length === 0) {
      toast.info('No data to export')
      return
    }
    const opts: ExportOptions = {
      headers: ['Timestamp', 'Username', 'Action', 'Module', 'Details', 'IP Address', 'User Agent'],
      rows: logs.map((log) => [
        formatFullTime(log.timestamp),
        log.username ?? '',
        log.action,
        log.module,
        log.details ?? '',
        log.ipAddress ?? '',
        log.userAgent ?? '',
      ]),
      filename: `activity-log-${new Date().toISOString().split('T')[0]}`,
    }
    exportToJSON(opts)
    toast.success('JSON exported successfully')
  }, [logs])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Activity Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive system activity monitoring and audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono px-2 h-5 rounded bg-primary/5 border-primary/10 text-primary">
            Auto-refresh: 15s
          </Badge>
          {isFetching && (
            <Badge variant="secondary" className="text-[10px] px-2 h-5 rounded">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Updating
            </Badge>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Events</span>
                <span className="text-2xl font-bold tabular-nums stat-number">
                  {stats ? stats.totalEvents24h.toLocaleString() : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground">Last 24 hours</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth Success Rate */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Auth Success</span>
                <span className="text-2xl font-bold tabular-nums stat-number">
                  {stats ? `${stats.authSuccessRate}%` : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground">Success rate (24h)</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-600/5 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Alerts</span>
                <span className="text-2xl font-bold tabular-nums stat-number">
                  {stats ? stats.activeAlerts : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground">Requires attention</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Requests */}
        <Card className="stat-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">API Requests</span>
                <span className="text-2xl font-bold tabular-nums stat-number">
                  {stats ? stats.apiRequests.toLocaleString() : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground">Last 24 hours</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500/15 to-teal-600/5 flex items-center justify-center">
                <Globe className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="inset-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Activity Timeline
              {total > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-mono">
                  {total.toLocaleString()} events
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isFetching && 'animate-spin')} />
                Refresh
              </Button>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={logs.length === 0}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON}>
                    <FileJson className="h-4 w-4 mr-2 text-teal-600" />
                    Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

            {/* Module Filter */}
            <Select value={moduleFilter || '_all'} onValueChange={(v) => { setModuleFilter(v === '_all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map((opt) => (
                  <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Action Filter */}
            <Select value={actionFilter || '_all'} onValueChange={(v) => { setActionFilter(v === '_all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((opt) => (
                  <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Search */}
            <div className="relative flex-1 min-w-[150px] max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setPage(1) }}
                className="h-8 text-xs pl-8 pr-3"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Activity List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
              <p className="text-sm font-medium text-foreground">Failed to load activity data</p>
              <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No activity found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Activity will appear as events are logged'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-1">
                  {logs.map((log, index) => {
                    const ac = actionConfig[log.action] ?? defaultActionConfig
                    const relativeTime = formatRelativeTime(log.timestamp)
                    const fullTime = formatFullTime(log.timestamp)
                    const initials = log.username
                      ? log.username.slice(0, 2).toUpperCase()
                      : 'SY'

                    return (
                      <div
                        key={log.id}
                        className={cn(
                          'group flex items-start gap-3 p-3 rounded-lg transition-all duration-150 hover:bg-muted/40',
                          index < logs.length - 1 && 'border-b border-border/30'
                        )}
                        style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}
                      >
                        {/* User Avatar */}
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{initials}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Top row: username + action + module */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {log.username ?? 'System'}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn('text-[9px] font-bold px-1.5 py-0 h-4 rounded border', ac.bgClass, ac.colorClass)}
                            >
                              {ac.label}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 h-4 rounded border-border/40 bg-muted/30 text-muted-foreground">
                              {log.module}
                            </Badge>
                          </div>

                          {/* Details */}
                          {log.details && (
                            <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{log.details}</p>
                          )}

                          {/* Bottom row: time + IP */}
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/70">
                            <span className="flex items-center gap-1" title={fullTime}>
                              <Clock className="h-3 w-3" />
                              {relativeTime}
                            </span>
                            {log.ipAddress && (
                              <span className="flex items-center gap-1" title={log.ipAddress}>
                                <Globe className="h-3 w-3" />
                                {log.ipAddress}
                              </span>
                            )}
                            {log.userAgent && (
                              <span className="flex items-center gap-1 max-w-[200px] truncate" title={log.userAgent}>
                                <Monitor className="h-3 w-3" />
                                {log.userAgent}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} events
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex items-center gap-0.5 mx-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (page <= 3) {
                          pageNum = i + 1
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = page - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0 text-[10px]"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
