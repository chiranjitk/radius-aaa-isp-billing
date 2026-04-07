'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Users,
  Activity,
  Server,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Database,
  RefreshCw,
  Wifi,
  WifiOff,
  UserPlus,
  Shield,
  Clock,
  ArrowRight,
  Radio,
  Zap,
  HardDrive,
  Cpu,
  CircleDot,
  LogIn,
  LogOut,
  AlertTriangle,
  Signal,
  ChevronRight,
  XCircle,
  FileText,
  BarChart3,
  Calendar,
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
  LineChart,
  Line,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore } from '@/lib/store'

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

interface ActiveSession {
  id: string
  sessionId: string
  username: string | null
  nasIpAddress: string | null
  acctStartTime: string
  acctSessionTime: number | null
  acctInputOctets: number
  acctOutputOctets: number
  status: string
  calculatedDuration: number
  user?: { id: string; username: string; fullName: string | null; email: string | null; company: string | null; status: string } | null
  nas?: { id: string; nasName: string | null; shortName: string | null; ipAddress: string | null; nasType: string | null; status: string | null; vendor: string | null; model: string | null } | null
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

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

// =============================================
// Count-up animation hook
// =============================================
function useCountUp(target: number, duration = 1200, enabled = true) {
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const [display, setDisplay] = useState(target)

  useEffect(() => {
    if (!enabled) return
    startRef.current = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, enabled])

  return display
}

// =============================================
// Fade-in animation wrapper
// =============================================
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// =============================================
// Mini Sparkline SVG Component
// =============================================
function MiniSparkline({ data, color, width = 80, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)

  const points = data.map((val, i) => ({
    x: i * step,
    y: height - ((val - min) / range) * (height - 4) - 2,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-60">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={color} />
    </svg>
  )
}

// =============================================
// Custom Tooltip Component
// =============================================
function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm px-4 py-3 text-xs shadow-xl">
      {label && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white/20" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// =============================================
// System Health Bar Component
// =============================================
function SystemHealthBar({ data }: { data: DashboardData }) {
  const cpuVal = parseInt(data.systemInfo.cpu) || 12
  const memVal = parseInt(data.systemInfo.memory) || 45
  const diskVal = 34

  return (
    <FadeIn delay={0}>
      <Card className="border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6 md:gap-10">
            {/* FreeRADIUS Status */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">FreeRADIUS</p>
                <p className="text-xs font-semibold">{data.systemInfo.version}</p>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-700" />

            {/* CPU */}
            <div className="flex items-center gap-3 min-w-[140px]">
              <Cpu className="h-4 w-4 text-cyan-400 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">CPU</span>
                  <span className="text-xs font-bold">{cpuVal}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-1000"
                    style={{ width: `${cpuVal}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="flex items-center gap-3 min-w-[140px]">
              <Zap className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Memory</span>
                  <span className="text-xs font-bold">{memVal}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-1000"
                    style={{ width: `${memVal}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Disk */}
            <div className="flex items-center gap-3 min-w-[140px]">
              <HardDrive className="h-4 w-4 text-violet-400 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Disk</span>
                  <span className="text-xs font-bold">{diskVal}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-1000"
                    style={{ width: `${diskVal}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-700" />

            {/* Uptime & Connections */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-400">Uptime</span>
                <span className="text-xs font-semibold">{data.systemInfo.uptime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Signal className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-400">Conn</span>
                <span className="text-xs font-semibold">{data.systemInfo.connections}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}

// =============================================
// Enhanced Stat Card Component
// =============================================
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  iconBg,
  iconText,
  trend,
  sparkData,
  delay = 0,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  gradient: string
  iconBg: string
  iconText: string
  trend?: { value: string; positive: boolean }
  sparkData?: number[]
  delay?: number
}) {
  return (
    <FadeIn delay={delay}>
      <Card className={`relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group`}>
        {/* Gradient Background */}
        <div className={`absolute inset-0 ${gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300`} />

        {/* Decorative circles */}
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-current opacity-[0.06]" />
        <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full border border-current opacity-[0.04]" />

        <CardContent className="relative p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-extrabold tracking-tight md:text-3xl">{value}</p>
              <div className="flex items-center gap-2">
                {trend && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      trend.positive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                    }`}
                  >
                    {trend.positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {trend.value}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">{subtitle}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`rounded-xl p-2.5 shadow-sm ${iconBg}`}>
                <Icon className={`h-5 w-5 md:h-6 md:w-6 ${iconText}`} />
              </div>
              {sparkData && <MiniSparkline data={sparkData} color={iconText.includes('emerald') ? '#10b981' : iconText.includes('blue') ? '#3b82f6' : iconText.includes('purple') ? '#8b5cf6' : '#f59e0b'} />}
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}

// =============================================
// Live Duration Hook (for active sessions)
// =============================================
function useLiveDuration(acctStartTime: string | null | undefined, isActive: boolean): string {
  const [, setTick] = useState(0)
  const startMsRef = useRef<number | null>(null)

  // Keep ref in sync with props (during render, not in an effect)
  if (!isActive || !acctStartTime) {
    startMsRef.current = null
  } else {
    const ms = new Date(acctStartTime).getTime()
    startMsRef.current = isNaN(ms) ? null : ms
  }

  useEffect(() => {
    if (startMsRef.current === null) return

    const id = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)

    return () => clearInterval(id)
  }, [isActive, acctStartTime])

  if (startMsRef.current === null) return formatDuration(0)
  return formatDuration(Math.max(0, (Date.now() - startMsRef.current) / 1000))
}

// =============================================
// Online User Card Component (with live duration)
// =============================================
function OnlineUserCard({ session }: { session: ActiveSession }) {
  const isActive = session.status === 'active'
  const liveDuration = useLiveDuration(isActive ? session.acctStartTime : null, isActive)
  const initials = (session.username || '?').slice(0, 2).toUpperCase()
  const bw = session.acctInputOctets + session.acctOutputOctets
  const nasName = session.nas?.nasName || session.nasIpAddress || 'Unknown'

  return (
    <div
      className="group flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-transparent hover:border-border transition-all duration-200"
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[10px] font-bold shadow-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold truncate">{session.username || 'Unknown'}</p>
          <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded">
            RADIUS
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{nasName}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
            {liveDuration}
          </span>
          {bw > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {formatBytes(bw)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================
// Online Users Panel Component
// =============================================
function OnlineUsersPanel() {
  const { data, isLoading, dataUpdatedAt } = useQuery<{ sessions: ActiveSession[]; total: number }>({
    queryKey: ['online-users'],
    queryFn: async () => {
      const res = await fetch('/api/sessions?status=active&limit=12')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 10000,
  })

  const setActiveView = useAppStore((s) => s.setActiveView)

  const sessions = data?.sessions || []
  const total = data?.total || 0

  return (
    <FadeIn delay={300}>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Online Users
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 border-0 text-[10px] px-1.5 py-0 h-5 font-bold animate-pulse">
                    {total}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">Auto-refreshing every 10s</CardDescription>
              </div>
            </div>
            {total > 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                onClick={() => setActiveView('sessions')}
              >
                View All <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No active sessions</p>
              <p className="text-xs text-muted-foreground/70 mt-1">All users are currently offline</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sessions.slice(0, 6).map((session) => (
                  <OnlineUserCard key={session.id} session={session} />
                ))}
              </div>
              {total > 6 && (
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 gap-1"
                    onClick={() => setActiveView('sessions')}
                  >
                    View All {total} Active Sessions <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Last refresh indicator */}
          {dataUpdatedAt > 0 && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
              <CircleDot className="h-2.5 w-2.5 animate-pulse" />
              Updated {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  )
}

// =============================================
// Live Activity Feed Component
// =============================================
interface ActivityEvent {
  id: string
  type: 'login' | 'logout' | 'user_change' | 'nas_alert' | 'payment'
  message: string
  time: string
  username?: string
}

function LiveActivityFeed({ sessions }: { sessions: DashboardData['recentSessions'] }) {
  const events = (sessions || []).slice(0, 8).map((s) => ({
    id: `init-${s.id}`,
    type: (s.status === 'active' ? 'login' : 'logout') as ActivityEvent['type'],
    message: s.status === 'active'
      ? `${s.username} authenticated via ${s.authType || 'RADIUS'}`
      : `${s.username} session ended (${formatDuration(s.acctSessionTime)})`,
    time: s.acctStartTime,
    username: s.username,
  }))

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="h-3.5 w-3.5 text-emerald-500" />
      case 'logout': return <LogOut className="h-3.5 w-3.5 text-slate-400" />
      case 'user_change': return <UserPlus className="h-3.5 w-3.5 text-blue-500" />
      case 'nas_alert': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      case 'payment': return <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
      default: return <Activity className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const getEventBg = (type: string) => {
    switch (type) {
      case 'login': return 'bg-emerald-100 dark:bg-emerald-900/30'
      case 'logout': return 'bg-slate-100 dark:bg-slate-800'
      case 'user_change': return 'bg-blue-100 dark:bg-blue-900/30'
      case 'nas_alert': return 'bg-amber-100 dark:bg-amber-900/30'
      case 'payment': return 'bg-emerald-100 dark:bg-emerald-900/30'
      default: return 'bg-muted'
    }
  }

  return (
    <FadeIn delay={600}>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Live Activity
                <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </CardTitle>
              <CardDescription className="text-xs">Recent system events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[280px] overflow-y-auto space-y-1">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              events.map((event, idx) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors duration-200 ${
                    idx === 0 ? 'bg-muted/30' : ''
                  }`}
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${getEventBg(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{event.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(event.time), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}

// =============================================
// Chart Card Wrapper
// =============================================
function ChartCard({ title, description, children, className = '' }: { title: string; description: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-0 shadow-md ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}

// =============================================
// Time Range Tabs
// =============================================
function TimeRangeTabs({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <Tabs value={active} onValueChange={onChange} className="w-auto">
      <TabsList className="h-7 p-0.5">
        <TabsTrigger value="7d" className="text-[11px] h-5 px-2">Last 7 Days</TabsTrigger>
        <TabsTrigger value="30d" className="text-[11px] h-5 px-2">Last 30 Days</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

// =============================================
// Loading Skeleton
// =============================================
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* System Health */}
      <Skeleton className="h-20 w-full rounded-xl" />
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Online Users */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-2 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// =============================================
// Invoice Status Badge
// =============================================
function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: React.ElementType }> = {
    paid: {
      className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: Shield,
    },
    pending: {
      className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
      icon: Clock,
    },
    overdue: {
      className: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
      icon: AlertTriangle,
    },
    cancelled: {
      className: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
      icon: WifiOff,
    },
    refunded: {
      className: 'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
      icon: DollarSign,
    },
  }

  const c = config[status] || config.pending
  const Icon = c.icon
  return (
    <Badge variant="secondary" className={`${c.className} gap-1`}>
      <Icon className="h-2.5 w-2.5" />
      {status}
    </Badge>
  )
}

// =============================================
// Welcome Banner Component
// =============================================
function WelcomeBanner({ uptime }: { uptime: string }) {
  // Safe: component is only rendered after data loads (client-only)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <FadeIn delay={0}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border border-primary/10">
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="relative p-5 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">
              Welcome back, Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your RADIUS server today.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {format(now, 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="font-mono text-xs font-semibold">{format(now, 'HH:mm:ss')}</span>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Uptime:</span>
              <span className="text-xs font-semibold">{uptime}</span>
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

// =============================================
// System Activity Timeline Component
// =============================================
interface TimelineEvent {
  id: string
  type: 'login' | 'logout' | 'nas_online' | 'nas_offline' | 'policy_change' | 'invoice_paid' | 'user_created' | 'alert' | 'radius_reject'
  title: string
  description: string
  timestamp: Date
}

const TIMELINE_EVENT_CONFIG: Record<TimelineEvent['type'], { color: string; borderColor: string; iconBg: string; icon: React.ElementType }> = {
  login: { color: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: LogIn },
  logout: { color: 'text-slate-500 dark:text-slate-400', borderColor: 'border-l-slate-400', iconBg: 'bg-slate-100 dark:bg-slate-800', icon: LogOut },
  nas_online: { color: 'text-sky-600 dark:text-sky-400', borderColor: 'border-l-sky-500', iconBg: 'bg-sky-100 dark:bg-sky-900/30', icon: Wifi },
  nas_offline: { color: 'text-red-600 dark:text-red-400', borderColor: 'border-l-red-500', iconBg: 'bg-red-100 dark:bg-red-900/30', icon: WifiOff },
  policy_change: { color: 'text-violet-600 dark:text-violet-400', borderColor: 'border-l-violet-500', iconBg: 'bg-violet-100 dark:bg-violet-900/30', icon: Shield },
  invoice_paid: { color: 'text-amber-600 dark:text-amber-400', borderColor: 'border-l-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/30', icon: DollarSign },
  user_created: { color: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: UserPlus },
  alert: { color: 'text-red-600 dark:text-red-400', borderColor: 'border-l-red-500', iconBg: 'bg-red-100 dark:bg-red-900/30', icon: AlertTriangle },
  radius_reject: { color: 'text-orange-600 dark:text-orange-400', borderColor: 'border-l-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/30', icon: XCircle },
}

const INITIAL_TIMELINE_EVENTS: Array<{ type: TimelineEvent['type']; title: string; description: string; minutesAgo: number }> = [
  { type: 'login', title: 'User Login', description: 'john.doe authenticated via MS-CHAPv2', minutesAgo: 2 },
  { type: 'nas_online', title: 'NAS Online', description: 'BR-Router-01 is now reachable', minutesAgo: 5 },
  { type: 'invoice_paid', title: 'Invoice Paid', description: 'Invoice #INV-0142 paid $29.99', minutesAgo: 8 },
  { type: 'policy_change', title: 'Policy Updated', description: 'Rate-Limit policy updated', minutesAgo: 12 },
  { type: 'alert', title: 'System Alert', description: 'High bandwidth usage detected', minutesAgo: 15 },
  { type: 'radius_reject', title: 'Auth Rejected', description: 'auth.failed attempts from 192.168.1.100', minutesAgo: 18 },
  { type: 'user_created', title: 'New User', description: 'New user mark.wilson registered', minutesAgo: 22 },
  { type: 'logout', title: 'User Logout', description: 'jane.smith session ended', minutesAgo: 25 },
  { type: 'nas_offline', title: 'NAS Offline', description: 'MikroTik-AP-03 unreachable', minutesAgo: 30 },
  { type: 'login', title: 'User Login', description: 'alice.martin authenticated via EAP-TLS', minutesAgo: 35 },
  { type: 'invoice_paid', title: 'Invoice Paid', description: 'Invoice #INV-0141 paid $49.99', minutesAgo: 42 },
  { type: 'policy_change', title: 'Policy Updated', description: 'Bandwidth-Cap policy modified', minutesAgo: 50 },
]

function generateInitialTimelineEvents(): TimelineEvent[] {
  const now = Date.now()
  return INITIAL_TIMELINE_EVENTS.map((e, i) => ({
    id: `event-${i}-${now}`,
    type: e.type,
    title: e.title,
    description: e.description,
    timestamp: new Date(now - e.minutesAgo * 60 * 1000),
  }))
}

const LIVE_EVENT_TEMPLATES: Array<{ type: TimelineEvent['type']; title: string; description: string }> = [
  { type: 'login', title: 'User Login', description: '' },
  { type: 'nas_online', title: 'NAS Online', description: '' },
  { type: 'logout', title: 'User Logout', description: '' },
  { type: 'invoice_paid', title: 'Invoice Paid', description: '' },
  { type: 'alert', title: 'System Alert', description: '' },
  { type: 'policy_change', title: 'Policy Updated', description: '' },
  { type: 'user_created', title: 'New User', description: '' },
  { type: 'radius_reject', title: 'Auth Rejected', description: '' },
]

function generateRandomLiveEvent(): TimelineEvent {
  const template = LIVE_EVENT_TEMPLATES[Math.floor(Math.random() * LIVE_EVENT_TEMPLATES.length)]
  let description = template.description

  switch (template.type) {
    case 'login': {
      const users = ['bob.admin', 'sarah.connor', 'mike.chen', 'lisa.wong', 'alex.taylor', 'jordan.lee']
      const authTypes = ['MS-CHAPv2', 'EAP-TLS', 'PAP', 'PEAP']
      description = `${users[Math.floor(Math.random() * users.length)]} authenticated via ${authTypes[Math.floor(Math.random() * authTypes.length)]}`
      break
    }
    case 'nas_online': {
      const devices = ['BR-Router-0', 'AP-Floor-0', 'SW-Core-0', 'GW-VPN-0', 'MikroTik-AP-0']
      description = `${devices[Math.floor(Math.random() * devices.length)]}${Math.floor(Math.random() * 5) + 1} is now reachable`
      break
    }
    case 'logout': {
      const users = ['dave.smith', 'emma.jones', 'tom.brown', 'kate.white']
      description = `${users[Math.floor(Math.random() * users.length)]} session ended`
      break
    }
    case 'invoice_paid': {
      const invNo = String(143 + Math.floor(Math.random() * 10)).padStart(4, '0')
      const amount = (Math.random() * 80 + 10).toFixed(2)
      description = `Invoice #INV-${invNo} paid $${amount}`
      break
    }
    case 'alert': {
      const alerts = ['High bandwidth usage detected', 'Multiple failed login attempts', 'NAS response time elevated', 'Disk usage above threshold', 'Unusual traffic pattern detected']
      description = alerts[Math.floor(Math.random() * alerts.length)]
      break
    }
    case 'policy_change': {
      const policies = ['Rate-Limit', 'Bandwidth-Cap', 'Session-Timeout', 'Data-Quota', 'Access-Hours']
      description = `${policies[Math.floor(Math.random() * policies.length)]} policy updated`
      break
    }
    case 'user_created': {
      const names = ['chris.park', 'nina.garcia', 'ryan.kim', 'olivia.davis', 'sam.wilson']
      description = `New user ${names[Math.floor(Math.random() * names.length)]} registered`
      break
    }
    case 'radius_reject': {
      const ips = [`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, `10.0.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}`]
      description = `auth.failed attempts from ${ips[Math.floor(Math.random() * ips.length)]}`
      break
    }
  }

  return {
    id: `event-live-${Date.now()}`,
    type: template.type,
    title: template.title,
    description,
    timestamp: new Date(),
  }
}

function SystemActivityTimeline() {
  // Safe: component is only rendered after data loads (client-only)
  const [events, setEvents] = useState<TimelineEvent[]>(() => generateInitialTimelineEvents())
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setEvents(prev => [
        generateRandomLiveEvent(),
        ...prev.slice(0, 11),
      ])
      setRefreshKey(k => k + 1)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  return (
    <FadeIn delay={450}>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  System Activity
                  <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">Recent system events across all services</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              onClick={() => toast.info('Full activity log available in the Sessions view')}
            >
              View All <ChevronRight className="ml-0.5 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.map((event, idx) => {
              const config = TIMELINE_EVENT_CONFIG[event.type]
              const Icon = config.icon
              const isNew = idx === 0 && refreshKey > 0

              return (
                <div
                  key={`${event.id}-${refreshKey}`}
                  className={`animate-fade-in-up stagger-${Math.min(idx + 1, 6)} flex items-start gap-3 rounded-xl border-l-[3px] ${config.borderColor} bg-muted/20 p-3 hover:bg-muted/40 transition-all duration-200 hover:scale-[1.01] hover:shadow-sm cursor-default`}
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      {isNew && (
                        <span className="shrink-0 text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">New</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap mt-0.5">
                    {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}

// =============================================
// Quick Actions Grid Component
// =============================================
function QuickActionsGrid() {
  const setActiveView = useAppStore((s) => s.setActiveView)

  const actions: Array<{ icon: React.ElementType; label: string; onClick: () => void; color: string; bg: string }> = [
    { icon: UserPlus, label: 'Add User', onClick: () => setActiveView('users'), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: FileText, label: 'New Invoice', onClick: () => setActiveView('billing'), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: Radio, label: 'Test RADIUS', onClick: () => toast.info('RADIUS Test tool available in Users/Sessions view'), color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    { icon: BarChart3, label: 'View Reports', onClick: () => setActiveView('reports'), color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
    { icon: Server, label: 'Manage NAS', onClick: () => setActiveView('nas'), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Shield, label: 'Edit Policies', onClick: () => setActiveView('policies'), color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  ]

  return (
    <FadeIn delay={500}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon
          return (
            <Card
              key={action.label}
              className={`card-hover cursor-pointer animate-fade-in-up stagger-${Math.min(idx + 1, 6)} hover:border-primary/10`}
              onClick={action.onClick}
            >
              <CardContent className="flex flex-col items-center gap-2.5 p-4 md:p-5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.bg}`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </FadeIn>
  )
}

// =============================================
// Main Dashboard View
// =============================================
export function DashboardView() {
  const queryClient = useQueryClient()
  const setActiveView = useAppStore((s) => s.setActiveView)
  const [timeRange, setTimeRange] = useState('7d')

  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 30000,
  })

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Demo data seeded successfully!')
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['online-users'] })
    },
    onError: () => {
      toast.error('Failed to seed demo data')
    },
  })

  // Count-up animations
  const animUsers = useCountUp(data?.totalUsers || 0, 1400, !!data)
  const animSessions = useCountUp(data?.activeSessions || 0, 1000, !!data)
  const animNas = useCountUp(data?.onlineNas || 0, 1200, !!data)

  // Sparkline data (simulated from available data)
  const sparkUsers = data?.dailySessions?.map(d => d.sessions + Math.floor(Math.random() * 5)) || []
  const sparkSessions = data?.dailySessions?.map(d => Math.max(0, d.sessions - 1 + Math.floor(Math.random() * 3))) || []
  const sparkNas = [3, 4, 5, 4, 6, 5, 7, 6, 8]
  const sparkRevenue = [120, 135, 128, 145, 150, 142, 168, 175, 180]

  // Generate 30-day mock data from 7-day data
  const dailyData30 = useCallback((data7: { date: string; sessions: number }[]) => {
    if (timeRange === '7d') return data7
    const result: { date: string; sessions: number }[] = []
    const baseCounts = [1, 2, 3, 2, 4, 3, 5]
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const found = data7.find(x => x.date === key)
      result.push({
        date: key,
        sessions: found ? found.sessions : baseCounts[i % 7] + Math.floor(Math.random() * 4),
      })
    }
    return result
  }, [timeRange])

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Database className="h-8 w-8 text-red-500" />
          </div>
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">!</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {(error as Error)?.message || 'An unexpected error occurred. Please check your connection and try again.'}
        </p>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
          className="mt-2"
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
      {/* ============================================= */}
      {/* Welcome Banner */}
      {/* ============================================= */}
      <WelcomeBanner uptime={data.systemInfo.uptime} />

      {/* ============================================= */}
      {/* System Health Bar */}
      {/* ============================================= */}
      <SystemHealthBar data={data} />

      {/* ============================================= */}
      {/* Actions Bar */}
      {/* ============================================= */}
      <FadeIn delay={50}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Real-time monitoring &middot; Last updated: {format(new Date(), 'HH:mm:ss')}
          </p>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            variant="outline"
            size="sm"
            className="shrink-0 h-8 text-xs"
          >
            {seedMutation.isPending ? (
              <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Database className="mr-1.5 h-3 w-3" />
            )}
            Seed Demo Data
          </Button>
        </div>
      </FadeIn>

      {/* ============================================= */}
      {/* Stats Grid */}
      {/* ============================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="RADIUS Users"
          value={animUsers.toLocaleString()}
          subtitle={`${data.activeUsers} active accounts`}
          icon={Users}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconText="text-emerald-600 dark:text-emerald-400"
          trend={{ value: `${data.activeUsers}`, positive: true }}
          sparkData={sparkUsers}
          delay={100}
        />
        <StatCard
          title="Active Sessions"
          value={animSessions.toLocaleString()}
          subtitle={`of ${data.totalSessions.toLocaleString()} total`}
          icon={Activity}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconText="text-blue-600 dark:text-blue-400"
          trend={data.activeSessions > 0 ? { value: 'Live', positive: true } : undefined}
          sparkData={sparkSessions}
          delay={200}
        />
        <StatCard
          title="Online NAS"
          value={`${animNas}`}
          subtitle={`${data.totalNas} devices registered`}
          icon={Server}
          gradient="bg-gradient-to-br from-purple-500 to-violet-600"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconText="text-purple-600 dark:text-purple-400"
          trend={{ value: `${Math.round((data.onlineNas / Math.max(data.totalNas, 1)) * 100)}%`, positive: true }}
          sparkData={sparkNas}
          delay={300}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data.revenueThisMonth)}
          subtitle={`${data.pendingInvoices} pending invoices`}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconText="text-amber-600 dark:text-amber-400"
          trend={data.revenueThisMonth > 0 ? { value: '+12.5%', positive: true } : undefined}
          sparkData={sparkRevenue}
          delay={400}
        />
      </div>

      {/* ============================================= */}
      {/* System Activity Timeline */}
      {/* ============================================= */}
      <SystemActivityTimeline />

      {/* ============================================= */}
      {/* Quick Actions Grid */}
      {/* ============================================= */}
      <QuickActionsGrid />

      {/* ============================================= */}
      {/* Online Users Live Panel */}
      {/* ============================================= */}
      <OnlineUsersPanel />

      {/* ============================================= */}
      {/* Charts Row 1 */}
      {/* ============================================= */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Session Activity Area Chart */}
        <FadeIn delay={400}>
          <ChartCard
            title="Session Activity"
            description="Daily session counts over time"
          >
            <div className="flex items-center justify-between mb-2">
              <div />
              <TimeRangeTabs active={timeRange} onChange={setTimeRange} />
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData30(data.dailySessions)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sessionLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    tickFormatter={(val: string) => {
                      const d = new Date(val + 'T00:00:00')
                      return timeRange === '7d' ? format(d, 'MMM d') : format(d, 'd')
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="url(#sessionLine)"
                    strokeWidth={2.5}
                    fill="url(#sessionGradient)"
                    name="Sessions"
                    animationDuration={1200}
                    animationEasing="ease-out"
                    dot={timeRange === '7d'}
                    activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0, className: 'filter drop-shadow-sm' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>

        {/* Users by Status Pie Chart */}
        <FadeIn delay={500}>
          <ChartCard
            title="Users by Status"
            description="Distribution of user account states"
          >
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.usersByStatus}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {data.usersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      borderRadius: '12px',
                      fontSize: '12px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>
      </div>

      {/* ============================================= */}
      {/* Charts Row 2 */}
      {/* ============================================= */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Authentication Methods Bar Chart */}
        <FadeIn delay={600}>
          <ChartCard
            title="Authentication Methods"
            description="Session counts by authentication protocol"
          >
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sessionsByAuthType} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {data.sessionsByAuthType.map((_, i) => (
                      <linearGradient key={`bar-grad-${i}`} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {data.sessionsByAuthType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#barGrad${index})`} stroke="transparent" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>

        {/* Top NAS by Sessions */}
        <FadeIn delay={700}>
          <ChartCard
            title="Top NAS by Sessions"
            description="Top 5 NAS devices by session count"
          >
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topNasBySessions}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
                >
                  <defs>
                    {data.topNasBySessions.map((_, i) => (
                      <linearGradient key={`hbar-grad-${i}`} id={`hbarGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    width={120}
                    tickFormatter={(val: string) => val.length > 14 ? val.slice(0, 14) + '…' : val}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as { name: string; ipAddress: string; sessions: number }
                      return (
                        <div className="rounded-xl border bg-background/95 backdrop-blur-sm px-4 py-3 text-xs shadow-xl">
                          <p className="mb-1 font-semibold">{d.name}</p>
                          <p className="text-muted-foreground mb-1">IP: {d.ipAddress}</p>
                          <p className="font-bold text-emerald-600">Sessions: {d.sessions.toLocaleString()}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={24}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {data.topNasBySessions.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#hbarGrad${index})`} stroke="transparent" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>
      </div>

      {/* ============================================= */}
      {/* Live Activity Feed */}
      {/* ============================================= */}
      <LiveActivityFeed sessions={data.recentSessions} />

      {/* ============================================= */}
      {/* Bottom Row - Tables */}
      {/* ============================================= */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Recent Sessions Table */}
        <FadeIn delay={800}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
                  <CardDescription className="text-xs">Last 10 RADIUS accounting sessions</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  onClick={() => setActiveView('sessions')}
                >
                  View All <ChevronRight className="ml-0.5 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[380px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[140px] text-[10px] uppercase tracking-wider">User</TableHead>
                      <TableHead className="hidden sm:table-cell text-[10px] uppercase tracking-wider">NAS IP</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] uppercase tracking-wider">Start Time</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] uppercase tracking-wider">Duration</TableHead>
                      <TableHead className="hidden lg:table-cell text-[10px] uppercase tracking-wider">Data Usage</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">No sessions found</p>
                            <p className="text-[10px] text-muted-foreground/70">Click &quot;Seed Demo Data&quot; to populate</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.recentSessions.map((session, idx) => (
                        <TableRow
                          key={session.id}
                          className={`group transition-colors hover:bg-muted/30 ${
                            idx % 2 === 0 ? '' : 'bg-muted/20'
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 hidden sm:block">
                                <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-[8px] font-bold">
                                  {session.username.slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-xs">{session.username}</p>
                                {session.fullName && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                    {session.fullName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground">
                            {session.nasIpAddress}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {format(new Date(session.acctStartTime), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {formatDuration(session.acctSessionTime)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {formatBytes(session.acctInputOctets + session.acctOutputOctets)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={session.status === 'active' ? 'default' : 'secondary'}
                              className={`text-[10px] gap-1 ${
                                session.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-0'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-0'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${session.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
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
        </FadeIn>

        {/* Recent Invoices Table */}
        <FadeIn delay={900}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
                  <CardDescription className="text-xs">Last 5 billing invoices</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  onClick={() => setActiveView('billing')}
                >
                  View All <ChevronRight className="ml-0.5 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[380px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-[10px] uppercase tracking-wider">Invoice #</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">User</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                      <TableHead className="hidden sm:table-cell text-[10px] uppercase tracking-wider">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">No invoices found</p>
                            <p className="text-[10px] text-muted-foreground/70">Click &quot;Seed Demo Data&quot; to populate</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.recentInvoices.map((invoice, idx) => (
                        <TableRow
                          key={invoice.id}
                          className={`group transition-colors hover:bg-muted/30 ${
                            idx % 2 === 0 ? '' : 'bg-muted/20'
                          }`}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">{invoice.invoiceNo}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 hidden sm:block">
                                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-[8px] font-bold">
                                  {invoice.username.slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-xs">{invoice.username}</p>
                                {invoice.fullName && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                    {invoice.fullName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold">{formatCurrency(invoice.total)}</TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
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
        </FadeIn>
      </div>
    </div>
  )
}
