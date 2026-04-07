'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Download,
  Calendar,
  Activity,
  DollarSign,
  Users,
  Server,
  Wifi,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6']

interface ReportData {
  type: string
  summary: Record<string, number | string>
  charts: Record<string, unknown[]>
}

const TABS = [
  { id: 'usage', label: 'Usage', icon: Activity },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'sessions', label: 'Sessions', icon: Wifi },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'nas', label: 'NAS', icon: Server },
]

export function ReportsView() {
  const [activeTab, setActiveTab] = useState('usage')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<Record<string, ReportData>>({})

  const fetchReport = useCallback(async (type: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) throw new Error('Failed to fetch report')
      const data = await res.json()
      setReportData((prev) => ({ ...prev, [type]: data }))
    } catch {
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchReport(activeTab)
  }, [activeTab, fetchReport])

  const handleExport = () => {
    toast.info('Report exported (mock)')
  }

  const data = reportData[activeTab]

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Report Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="h-4 w-4 hidden sm:block" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* ===== USAGE TAB ===== */}
        <TabsContent value="usage" className="space-y-4 mt-4">
          {renderUsageTab(data, loading)}
        </TabsContent>

        {/* ===== REVENUE TAB ===== */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          {renderRevenueTab(data, loading)}
        </TabsContent>

        {/* ===== SESSIONS TAB ===== */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          {renderSessionsTab(data, loading)}
        </TabsContent>

        {/* ===== USERS TAB ===== */}
        <TabsContent value="users" className="space-y-4 mt-4">
          {renderUsersTab(data, loading)}
        </TabsContent>

        {/* ===== NAS TAB ===== */}
        <TabsContent value="nas" className="space-y-4 mt-4">
          {renderNasTab(data, loading)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============ USAGE TAB ============
function renderUsageTab(data: ReportData | undefined, loading: boolean) {
  if (loading) return <LoadingState />
  if (!data) return <EmptyState />

  const charts = data.charts
  const dailySessions = (charts.dailySessions as { date: string; sessions: number }[]) || []
  const topUsers = (charts.topUsersBandwidth as { username: string; totalGB: string }[]) || []
  const dataByGroup = (charts.dataUsageByGroup as { group: string; usage: number }[]) || []

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Sessions" value={String(data.summary.totalSessions)} icon={Activity} color="emerald" />
        <SummaryCard title="Total Bandwidth" value={`${data.summary.totalBandwidthGB} GB`} icon={BarChart3} color="cyan" />
        <SummaryCard title="Top Users Analyzed" value={String(topUsers.length)} icon={Users} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailySessions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Users by Bandwidth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topUsers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} unit=" GB" />
                <YAxis dataKey="username" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [`${v} GB`, 'Total']} />
                <Bar dataKey="totalGB" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Usage by Group</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dataByGroup} dataKey="usage" nameKey="group" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {dataByGroup.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} GB`, 'Usage']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth Details</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[260px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                  <TableHead className="text-right">Upload</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(charts.topUsersBandwidth as { username: string; downloadGB: string; uploadGB: string; sessions: number }[] || []).map((u) => (
                  <TableRow key={u.username}>
                    <TableCell className="font-medium text-sm">{u.username}</TableCell>
                    <TableCell className="text-right text-sm">{u.downloadGB} GB</TableCell>
                    <TableCell className="text-right text-sm">{u.uploadGB} GB</TableCell>
                    <TableCell className="text-right text-sm">{u.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// ============ REVENUE TAB ============
function renderRevenueTab(data: ReportData | undefined, loading: boolean) {
  if (loading) return <LoadingState />
  if (!data) return <EmptyState />

  const charts = data.charts
  const monthlyRevenue = (charts.monthlyRevenue as { month: string; revenue: number }[]) || []
  const planRevenue = (charts.planRevenue as { plan: string; revenue: number }[]) || []
  const paymentMethods = (charts.paymentMethods as { method: string; amount: number }[]) || []

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Revenue" value={`$${Number(data.summary.totalRevenue).toLocaleString()}`} icon={DollarSign} color="emerald" />
        <SummaryCard title="Paid Invoices" value={String(data.summary.paidInvoices)} icon={BarChart3} color="cyan" />
        <SummaryCard title="Avg Invoice Value" value={`$${Number(data.summary.avgInvoiceValue).toFixed(2)}`} icon={Activity} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={planRevenue} dataKey="revenue" nameKey="plan" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {planRevenue.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Revenue Trend & Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={paymentMethods} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {paymentMethods.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Amount']} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}

// ============ SESSIONS TAB ============
function renderSessionsTab(data: ReportData | undefined, loading: boolean) {
  if (loading) return <LoadingState />
  if (!data) return <EmptyState />

  const charts = data.charts
  const sessionsByNas = (charts.sessionsByNas as { nas: string; sessions: number }[]) || []
  const authTypes = (charts.authTypes as { type: string; count: number }[]) || []
  const avgDuration = (charts.avgDurationByDay as { date: string; avgMinutes: number }[]) || []

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Sessions" value={String(data.summary.totalSessions)} icon={Wifi} color="emerald" />
        <SummaryCard title="Active NAS" value={String(sessionsByNas.length)} icon={Server} color="cyan" />
        <SummaryCard title="Auth Types" value={String(authTypes.length)} icon={Activity} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessions by NAS</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sessionsByNas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="nas" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={avgDuration}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} unit=" min" />
                <Tooltip />
                <Line type="monotone" dataKey="avgMinutes" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Authentication Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={authTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                {authTypes.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}

// ============ USERS TAB ============
function renderUsersTab(data: ReportData | undefined, loading: boolean) {
  if (loading) return <LoadingState />
  if (!data) return <EmptyState />

  const charts = data.charts
  const registrationTrend = (charts.registrationTrend as { month: string; users: number }[]) || []
  const userStatus = (charts.userStatus as { status: string; count: number }[]) || []
  const usersByGroup = (charts.usersByGroup as { group: string; count: number }[]) || []

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard title="Total Users" value={String(data.summary.totalUsers)} icon={Users} color="emerald" />
        <SummaryCard title="Active Users" value={String(data.summary.activeUsers)} icon={Activity} color="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Registration Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={registrationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={userStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                  {userStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Users by Group</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={usersByGroup} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="group" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}

// ============ NAS TAB ============
function renderNasTab(data: ReportData | undefined, loading: boolean) {
  if (loading) return <LoadingState />
  if (!data) return <EmptyState />

  const charts = data.charts
  const nasUtilization = (charts.nasUtilization as { nas: string; utilization: number; totalSessions: number; status: string }[]) || []
  const nasTypes = (charts.nasTypes as { type: string; count: number }[]) || []

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total NAS Devices" value={String(data.summary.totalNas)} icon={Server} color="emerald" />
        <SummaryCard title="Online" value={String(data.summary.onlineNas)} icon={Wifi} color="cyan" />
        <SummaryCard title="Offline" value={String(data.summary.offlineNas)} icon={Activity} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NAS Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={nasUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nas" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Bar dataKey="utilization" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NAS by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={nasTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                  {nasTypes.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* NAS Performance Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">NAS Performance Details</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[320px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAS Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Sessions</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nasUtilization.map((nas) => (
                <TableRow key={nas.nas}>
                  <TableCell className="font-medium text-sm">{nas.nas}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      nas.status === 'up'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                    }`}>
                      {nas.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">{nas.totalSessions.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm">{nas.utilization}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}

// ============ Shared Components ============
function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading report data...</p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-muted-foreground">No data available. Click refresh to load.</p>
    </div>
  )
}
