'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Users,
  Activity,
  Server,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Database,
  RefreshCw,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// =============================================
// Types
// =============================================
interface DashboardData {
  totalUsers: number
  activeUsers: number
  totalNas: number
  onlineNas: number
  totalSessions: number
  activeSessions: number
  totalBandwidth: number
  revenueThisMonth: number
  pendingInvoices: number
  usersByStatus: { name: string; value: number; fill: string }[]
  sessionsByAuthType: { name: string; sessions: number }[]
  dailySessions: { date: string; sessions: number }[]
  topUsersByBandwidth: { username: string; bandwidth: number }[]
  topNasBySessions: { name: string; ipAddress: string; sessions: number }[]
  recentSessions: {
    id: string
    sessionId: string
    username: string
    fullName: string | null
    nasIpAddress: string
    nasName: string | null
    acctStartTime: string
    acctStopTime: string | null
    acctSessionTime: number | null
    acctInputOctets: number
    acctOutputOctets: number
    status: string
    authType: string | null
  }[]
  recentInvoices: {
    id: string
    invoiceNo: string
    username: string
    fullName: string | null
    amount: number
    tax: number
    total: number
    status: string
    dueDate: string
    paidDate: string | null
    createdAt: string
  }[]
  systemInfo: {
    uptime: string
    version: string
    cpu: string
    memory: string
    connections: number
  }
}

// =============================================
// Helper functions
// =============================================
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

// =============================================
// Custom Tooltip Component
// =============================================
function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-muted-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// =============================================
// Stat Card Component
// =============================================
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconText,
  trend,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  iconBg: string
  iconText: string
  trend?: { value: string; positive: boolean }
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight md:text-3xl">{value}</p>
            <div className="flex items-center gap-1.5">
              {trend && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    trend.positive ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {trend.positive ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
                  {trend.value}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>
            <Icon className={`h-5 w-5 md:h-6 md:w-6 ${iconText}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================
// Loading Skeleton
// =============================================
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// =============================================
// Main Dashboard View
// =============================================
export function DashboardView() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => { const res = await fetch('/api/dashboard'); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); },
    refetchInterval: 30000,
  })

  const seedMutation = useMutation({
    mutationFn: async () => { const res = await fetch('/api/seed', { method: 'POST' }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); },
    onSuccess: () => {
      toast.success('Demo data seeded successfully!')
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => {
      toast.error('Failed to seed demo data')
    },
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-red-100 p-4">
          <Database className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
        <p className="text-sm text-muted-foreground">{(error as Error)?.message || 'An unexpected error occurred'}</p>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Real-time system monitoring &middot; Last updated: {format(new Date(), 'HH:mm:ss')}
        </p>
        <Button
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          {seedMutation.isPending ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Database className="mr-1.5 h-3.5 w-3.5" />
          )}
          Seed Demo Data
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total RADIUS Users"
          value={data.totalUsers.toLocaleString()}
          subtitle={`${data.activeUsers} active`}
          icon={Users}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconText="text-emerald-700 dark:text-emerald-400"
          trend={{ value: `${data.activeUsers}`, positive: true }}
        />
        <StatCard
          title="Active Sessions"
          value={data.activeSessions.toLocaleString()}
          subtitle={`of ${data.totalSessions.toLocaleString()} total`}
          icon={Activity}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconText="text-blue-700 dark:text-blue-400"
          trend={data.activeSessions > 0 ? { value: 'Live', positive: true } : undefined}
        />
        <StatCard
          title="Online NAS Devices"
          value={`${data.onlineNas}`}
          subtitle={`of ${data.totalNas} total`}
          icon={Server}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconText="text-purple-700 dark:text-purple-400"
          trend={{ value: `${Math.round((data.onlineNas / Math.max(data.totalNas, 1)) * 100)}%`, positive: true }}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data.revenueThisMonth)}
          subtitle={`${data.pendingInvoices} pending invoices`}
          icon={DollarSign}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconText="text-amber-700 dark:text-amber-400"
          trend={data.revenueThisMonth > 0 ? { value: '+12.5%', positive: true } : undefined}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Session Activity Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Session Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Daily session counts for the last 7 days</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailySessions} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickFormatter={(val: string) => {
                      const d = new Date(val + 'T00:00:00')
                      return format(d, 'MMM d')
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#sessionGradient)"
                    name="Sessions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Users by Status Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Users by Status</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution of user account states</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.usersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.usersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Authentication Methods Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Authentication Methods</CardTitle>
            <p className="text-xs text-muted-foreground">Session counts by authentication protocol</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sessionsByAuthType} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  >
                    {data.sessionsByAuthType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top NAS by Sessions - Horizontal Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top NAS by Sessions</CardTitle>
            <p className="text-xs text-muted-foreground">Top 5 NAS devices by active session count</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topNasBySessions}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    width={120}
                    tickFormatter={(val: string) => val.length > 14 ? val.slice(0, 14) + '…' : val}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as { name: string; ipAddress: string; sessions: number }
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                          <p className="mb-1 font-medium">{d.name}</p>
                          <p className="text-muted-foreground">IP: {d.ipAddress}</p>
                          <p className="font-medium">Sessions: {d.sessions.toLocaleString()}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={24}
                  >
                    {data.topNasBySessions.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Tables */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Recent Sessions Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
            <p className="text-xs text-muted-foreground">Last 10 RADIUS accounting sessions</p>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">User</TableHead>
                    <TableHead className="hidden sm:table-cell">NAS IP</TableHead>
                    <TableHead className="hidden md:table-cell">Start Time</TableHead>
                    <TableHead className="hidden md:table-cell">Duration</TableHead>
                    <TableHead className="hidden lg:table-cell">Data Usage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No sessions found. Click &quot;Seed Demo Data&quot; to populate.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-xs">{session.username}</p>
                            {session.fullName && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {session.fullName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs font-mono">
                          {session.nasIpAddress}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs">
                          {format(new Date(session.acctStartTime), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs">
                          {formatDuration(session.acctSessionTime)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {formatBytes(session.acctInputOctets + session.acctOutputOctets)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={session.status === 'active' ? 'default' : 'secondary'}
                            className={
                              session.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                            }
                          >
                            {session.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
            <p className="text-xs text-muted-foreground">Last 5 billing invoices</p>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No invoices found. Click &quot;Seed Demo Data&quot; to populate.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs">{invoice.invoiceNo}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-xs">{invoice.username}</p>
                            {invoice.fullName && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {invoice.fullName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">
                          {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground">FreeRADIUS</span>
              <span>{data.systemInfo.version}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Uptime:</span>
              <span className="font-medium text-foreground">{data.systemInfo.uptime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>CPU:</span>
              <span className="font-medium text-foreground">{data.systemInfo.cpu}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Memory:</span>
              <span className="font-medium text-foreground">{data.systemInfo.memory}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Active Connections:</span>
              <span className="font-medium text-foreground">{data.systemInfo.connections}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================
// Invoice Status Badge
// =============================================
function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    overdue: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
    refunded: 'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  }

  return (
    <Badge variant="secondary" className={styles[status] || styles.pending}>
      {status}
    </Badge>
  )
}
