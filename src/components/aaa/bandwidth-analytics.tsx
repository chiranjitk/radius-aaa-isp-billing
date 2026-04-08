'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  CalendarDays,
  Users,
  Download,
  FileJson,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Wifi,
  Gauge,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'

// ============================
// Types
// ============================

interface TotalStats {
  totalUpload: number
  totalDownload: number
  total: number
  peakDay: string
  peakDayTotal: number
  activeUsers: number
  totalUniqueUsers: number
  days: number
}

interface DailyTrendItem {
  date: string
  download: number
  upload: number
  total: number
}

interface TopUser {
  username: string
  download: number
  upload: number
  total: number
  sessions: number
  percentOfTotal: number
  planName: string | null
  dataLimitMB: number | null
}

interface DataCapUtilization {
  username: string
  planName: string | null
  dataLimitMB: number
  usedMB: number
  percentUsed: number
}

interface BandwidthData {
  totalStats: TotalStats
  dailyTrend: DailyTrendItem[]
  topUsers: TopUser[]
  dataCapUtilization: DataCapUtilization[]
}

// ============================
// Helpers
// ============================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i > 0 ? 2 : 0)} ${units[i]}`
}

function formatBytesCompact(bytes: number): string {
  if (bytes === 0) return '0'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(1)}${units[i]}`
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ============================
// Time Range Options
// ============================

const TIME_RANGES = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
] as const

// ============================
// Component
// ============================

export function BandwidthAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(7)

  const { data, isLoading, isError, error } = useQuery<BandwidthData>({
    queryKey: ['bandwidth-analytics', days],
    queryFn: async () => {
      const res = await fetch(`/api/bandwidth?days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch bandwidth data')
      return res.json()
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // Export handlers
  function handleExportCSV() {
    if (!data) return
    const opts: ExportOptions = {
      filename: `bandwidth-analytics-${days}d`,
      title: `Bandwidth Analytics — Last ${days} Days`,
      headers: ['Username', 'Download', 'Upload', 'Total', 'Sessions', '% of Total', 'Plan'],
      rows: data.topUsers.map((u) => [
        u.username,
        formatBytes(u.download),
        formatBytes(u.upload),
        formatBytes(u.total),
        u.sessions,
        `${u.percentOfTotal.toFixed(1)}%`,
        u.planName ?? 'N/A',
      ]),
    }
    exportToCSV(opts)
    toast.success('CSV exported successfully')
  }

  function handleExportJSON() {
    if (!data) return
    const opts: ExportOptions = {
      filename: `bandwidth-analytics-${days}d`,
      title: `Bandwidth Analytics — Last ${days} Days`,
      headers: ['Username', 'Download', 'Upload', 'Total', 'Sessions', '% of Total', 'Plan'],
      rows: data.topUsers.map((u) => [
        u.username,
        formatBytes(u.download),
        formatBytes(u.upload),
        formatBytes(u.total),
        u.sessions,
        `${u.percentOfTotal.toFixed(1)}%`,
        u.planName ?? 'N/A',
      ]),
    }
    exportToJSON(opts)
    toast.success('JSON exported successfully')
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header with time range + export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient">Bandwidth Analytics</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Per-user data consumption with trends, top users, and data cap monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDays(range.value as 7 | 30 | 90)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                  days === range.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Export Buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                disabled={isLoading || !data}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="gap-2 text-xs">
                <FileJson className="h-3.5 w-3.5" />
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load bandwidth data</p>
              <p className="text-xs text-muted-foreground">{error?.message || 'Unknown error'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && <LoadingSkeleton />}

      {/* Data Views */}
      {data && !isLoading && (
        <>
          {/* Stats Cards */}
          <StatsCards stats={data.totalStats} days={days} />

          {/* Tabbed Content */}
          <Tabs defaultValue="trend" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trend" className="gap-1.5 text-xs sm:text-sm">
                <TrendingUp className="h-4 w-4 hidden sm:block" />
                Trend
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
                <Users className="h-4 w-4 hidden sm:block" />
                Top Users
              </TabsTrigger>
              <TabsTrigger value="caps" className="gap-1.5 text-xs sm:text-sm">
                <Gauge className="h-4 w-4 hidden sm:block" />
                Data Caps
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trend" className="space-y-4 mt-4">
              <DailyTrendChart trend={data.dailyTrend} />
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-4">
              <TopUsersTable users={data.topUsers} />
            </TabsContent>

            <TabsContent value="caps" className="space-y-4 mt-4">
              <DataCapPanel caps={data.dataCapUtilization} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

// ============================
// Stats Cards
// ============================

function StatsCards({ stats, days }: { stats: TotalStats; days: number }) {
  const cards = [
    {
      label: 'Total Upload',
      value: formatBytes(stats.totalUpload),
      icon: ArrowUpFromLine,
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-l-emerald-500',
    },
    {
      label: 'Total Download',
      value: formatBytes(stats.totalDownload),
      icon: ArrowDownToLine,
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      borderColor: 'border-l-amber-500',
    },
    {
      label: 'Peak Day',
      value: stats.peakDay !== 'N/A' ? formatDateLabel(stats.peakDay) : 'N/A',
      subValue: stats.peakDayTotal > 0 ? formatBytes(stats.peakDayTotal) : '',
      icon: CalendarDays,
      color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
      borderColor: 'border-l-rose-500',
    },
    {
      label: 'Active Users',
      value: String(stats.activeUsers),
      subValue: `${stats.totalUniqueUsers} total`,
      icon: Users,
      color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
      borderColor: 'border-l-violet-500',
    },
  ]

  const staggerClasses = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4']

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <Card
            key={card.label}
            className={cn(
              'stat-card hover-lift card-shine animate-fade-in-up border-l-2',
              card.borderColor,
              staggerClasses[i] || ''
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', card.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="stat-number text-lg font-bold truncate">{card.value}</p>
                    {card.subValue && (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        ({card.subValue})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============================
// Daily Trend Chart
// ============================

function DailyTrendChart({ trend }: { trend: DailyTrendItem[] }) {
  const chartData = trend.map((d) => ({
    ...d,
    downloadGB: +(d.download / (1024 * 1024 * 1024)).toFixed(3),
    uploadGB: +(d.upload / (1024 * 1024 * 1024)).toFixed(3),
    totalGB: +(d.total / (1024 * 1024 * 1024)).toFixed(3),
  }))

  if (chartData.length === 0) {
    return (
      <Card className="hover-lift card-shine">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daily Bandwidth Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No bandwidth data available for the selected period.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover-lift card-shine">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Daily Bandwidth Trend</CardTitle>
          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
            {chartData.length} days
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-2">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradientDownload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradientUpload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatDateLabel(v)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v} GB`}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  const label = name === 'downloadGB' ? 'Download' : name === 'uploadGB' ? 'Upload' : 'Total'
                  return [`${value} GB`, label]
                }}
                labelFormatter={(label) => formatDateLabel(String(label))}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'downloadGB') return 'Download'
                  if (value === 'uploadGB') return 'Upload'
                  if (value === 'totalGB') return 'Total'
                  return value
                }}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="totalGB"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="url(#gradientTotal)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="downloadGB"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#gradientDownload)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="uploadGB"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradientUpload)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================
// Top Users Table
// ============================

function TopUsersTable({ users }: { users: TopUser[] }) {
  if (users.length === 0) {
    return (
      <Card className="hover-lift card-shine">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top Bandwidth Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No user bandwidth data available.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover-lift card-shine">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Top Bandwidth Users</CardTitle>
          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
            {users.length} users
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="max-h-[480px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="table-row-hover">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Username</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Download</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Upload</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, idx) => (
              <TableRow
                key={user.username}
                className={cn(
                  'table-row-hover transition-colors',
                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                )}
              >
                <TableCell className="text-muted-foreground text-xs font-mono tabular-nums">
                  {idx + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Wifi className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate max-w-[140px]">{user.username}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums hidden sm:table-cell">
                  <span className="text-amber-600 dark:text-amber-400">{formatBytes(user.download)}</span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums hidden sm:table-cell">
                  <span className="text-emerald-600 dark:text-emerald-400">{formatBytes(user.upload)}</span>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {formatBytes(user.total)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Mini percent bar */}
                    <div className="data-bar w-12 h-1.5 hidden md:block">
                      <div
                        className="data-bar-fill bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${Math.min(100, user.percentOfTotal)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {user.percentOfTotal.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================
// Data Cap Utilization Panel
// ============================

function DataCapPanel({ caps }: { caps: DataCapUtilization[] }) {
  if (caps.length === 0) {
    return (
      <Card className="hover-lift card-shine">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Data Cap Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Gauge className="h-8 w-8 opacity-30" />
            <p className="text-sm">No users with data-limited plans found.</p>
            <p className="text-xs opacity-60">
              Users on flat-rate or unlimited plans will not appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover-lift card-shine">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Data Cap Utilization</CardTitle>
          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
            {caps.length} users
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="max-h-[480px] overflow-y-auto space-y-3">
        {caps.map((cap) => (
          <div
            key={cap.username}
            className="flex flex-col gap-2 rounded-lg border border-border/40 p-3 bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Wifi className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate">{cap.username}</span>
                {cap.planName && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                    {cap.planName}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatBytes(cap.usedMB * 1024 * 1024)} / {formatBytes(cap.dataLimitMB * 1024 * 1024)}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0 h-5 tabular-nums',
                    cap.percentUsed >= 90
                      ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'
                      : cap.percentUsed >= 70
                        ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                  )}
                >
                  {cap.percentUsed >= 90 && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {cap.percentUsed}%
                </Badge>
              </div>
            </div>

            {/* Progress bar */}
            <div className="data-bar h-2 w-full">
              <div
                className={cn(
                  'data-bar-fill rounded-full transition-all duration-500',
                  cap.percentUsed >= 90
                    ? 'bg-gradient-to-r from-amber-500 to-red-500'
                    : cap.percentUsed >= 70
                      ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                      : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                )}
                style={{ width: `${Math.min(100, cap.percentUsed)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================
// Loading Skeleton
// ============================

function LoadingSkeleton() {
  return (
    <div className="space-y-6 py-2">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-l-2 border-l-muted">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
