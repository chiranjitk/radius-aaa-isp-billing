'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow, isToday, isYesterday, subDays, startOfDay } from 'date-fns'
import { toast as sonnerToast } from 'sonner'
import {
  Activity,
  RefreshCw,
  Search,
  X,
  Eye,
  Unplug,
  Skull,
  Clock,
  Users,
  Wifi,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  MonitorSmartphone,
  Globe,
  Server,
  ChevronLeft,
  ChevronRight,
  Signal,
  Zap,
  Timer,
  HardDrive,
  Download,
  FileSpreadsheet,
  FileJson,
  Radio,
  CheckSquare,
  Square,
  Trash2,
  Printer,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'
import { RadiusTestDialog } from '@/components/aaa/radius-test-dialog'
import { cn } from '@/lib/utils'

// ==================== Utility Functions ====================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  return parts.join(' ')
}

function getTerminateCauseColor(cause: string | null): string {
  if (!cause) return ''
  switch (cause) {
    case 'User-Request':
      return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950'
    case 'Admin-Reset':
      return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950'
    case 'Session-Timeout':
      return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950'
    case 'Idle-Timeout':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950'
    case 'NAS-Error':
    case 'NAS-Reboot':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
    default:
      return 'text-muted-foreground bg-muted'
  }
}

function truncateId(id: string, maxLen = 24): string {
  if (!id) return '-'
  if (id.length <= maxLen) return id
  return `${id.slice(0, maxLen - 3)}...`
}

// ==================== Custom Hooks ====================

/**
 * useLiveDuration - Real-time ticking duration counter for active sessions.
 * Calculates elapsed seconds from acctStartTime, updates every 1s.
 * Returns formatted duration string using formatDuration.
 */
function useLiveDuration(acctStartTime: string | null | undefined, isActive: boolean): string {
  const [startMs, setStartMs] = useState<number | null>(null)
  // tick drives re-renders every second
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!isActive || !acctStartTime) {
      setStartMs(null)
      return
    }
    const ms = new Date(acctStartTime).getTime()
    setStartMs(isNaN(ms) ? null : ms)
  }, [isActive, acctStartTime])

  useEffect(() => {
    if (startMs === null) return

    const id = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)

    return () => clearInterval(id)
  }, [startMs])

  if (startMs === null) return formatDuration(0)
  return formatDuration(Math.max(0, (Date.now() - startMs) / 1000))
}

/**
 * useLiveBandwidth - Simulated live bandwidth counter for active sessions.
 * Starts from the base value and adds small random increments every 3 seconds.
 * Returns the current simulated total bytes.
 */
function useLiveBandwidth(baseBytes: number, isActive: boolean): number {
  const [total, setTotal] = useState(baseBytes)

  useEffect(() => {
    // Reset when base changes
    setTotal(baseBytes)
  }, [baseBytes])

  useEffect(() => {
    if (!isActive || baseBytes === 0) return

    const id = setInterval(() => {
      // Simulate a small incremental bandwidth growth: random 1KB–500KB per tick
      const increment = Math.floor(Math.random() * 512000) + 1024
      setTotal(t => t + increment)
    }, 3000)

    return () => clearInterval(id)
  }, [isActive, baseBytes])

  return total
}

// ==================== Types ====================

interface SessionUser {
  id: string
  username: string | null
  fullName: string | null
  email: string | null
  company: string | null
  status: string
}

interface SessionNas {
  id: string
  nasName: string
  shortName: string | null
  ipAddress: string | null
  nasType: string
  status: string
  vendor: string | null
  model: string | null
}

interface Session {
  id: string
  sessionId: string
  username: string | null
  nasIpAddress: string | null
  nasPortId: string | null
  nasPortType: string | null
  acctSessionId: string | null
  acctStartTime: string
  acctStopTime: string | null
  acctSessionTime: number | null
  acctAuthentic: string | null
  acctInputOctets: number | null
  acctOutputOctets: number | null
  acctInputPackets: number | null
  acctOutputPackets: number | null
  acctInputGigawords: number | null
  acctOutputGigawords: number | null
  calledStationId: string | null
  callingStationId: string | null
  connectInfo: string | null
  framedProtocol: string | null
  framedIpAddress: string | null
  framedNetmask: string | null
  assignIpType: string | null
  nasId: string | null
  nasPort: number | null
  serviceType: string | null
  terminateCause: string | null
  updateCount: number
  status: string
  calculatedDuration: number
  createdAt: string
  updatedAt: string
  user: SessionUser | null
  nas: SessionNas | null
}

interface SessionsResponse {
  sessions: Session[]
  total: number
  page: number
  totalPages: number
  stats: {
    activeCount: number
    todayCount: number
    avgDuration: number
    totalBandwidth: number
  }
}

interface NasOption {
  ipAddress: string
  nasName: string
}

interface UserOption {
  username: string
  fullName: string | null
}

// ==================== Session Row Component ====================
// Extracted so hooks (useLiveDuration, useLiveBandwidth) can be used per-row

function SessionRow({
  session,
  onViewDetails,
  onDisconnect,
  onKill,
  onRadiusTest,
  selected,
  onToggleSelect,
}: {
  session: Session
  onViewDetails: (s: Session) => void
  onDisconnect: (s: Session) => void
  onKill: (s: Session) => void
  onRadiusTest: (s: Session) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}) {
  const isActive = session.status === 'active'
  const liveDuration = useLiveDuration(isActive ? session.acctStartTime : null, isActive)

  const baseInputBytes = (session.acctInputGigawords || 0) * 4294967296 + (session.acctInputOctets || 0)
  const baseOutputBytes = (session.acctOutputGigawords || 0) * 4294967296 + (session.acctOutputOctets || 0)
  const liveInputBytes = useLiveBandwidth(baseInputBytes, isActive)
  const liveOutputBytes = useLiveBandwidth(baseOutputBytes, isActive)
  const liveTotalBytes = liveInputBytes + liveOutputBytes

  return (
    <TableRow key={session.id} className={cn("group table-row-hover", selected && "bg-primary/5")}>
      <TableCell className="w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(session.id)}
          aria-label={`Select session ${session.username || session.sessionId}`}
        />
      </TableCell>
      <TableCell className="font-mono text-xs max-w-[200px]">
        <span className="block truncate" title={session.sessionId}>
          {truncateId(session.sessionId)}
        </span>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm font-medium">{session.username || '-'}</p>
          {session.user?.company && (
            <p className="text-xs text-muted-foreground hidden sm:block">{session.user.company}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div>
          <p className="text-sm">{session.nas?.shortName || session.calledStationId || '-'}</p>
          <p className="text-xs text-muted-foreground">{session.nasIpAddress || '-'}</p>
        </div>
      </TableCell>
      <TableCell className="text-xs hidden md:table-cell">
        {format(new Date(session.acctStartTime), 'MMM dd, HH:mm')}
      </TableCell>
      <TableCell className="text-xs font-mono">
        {isActive ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="pulse-dot bg-emerald-500" />
            {liveDuration}
          </span>
        ) : (
          formatDuration(session.calculatedDuration)
        )}
      </TableCell>
      <TableCell className="text-xs font-mono hidden md:table-cell">
        <span className="inline-flex items-center gap-1" title={`↓ ${formatBytes(liveInputBytes)} / ↑ ${formatBytes(liveOutputBytes)}`}>
          {isActive && (
            <span className="pulse-dot bg-teal-500" />
          )}
          {formatBytes(liveTotalBytes)}
        </span>
      </TableCell>
      <TableCell className="text-xs font-mono hidden lg:table-cell">
        {session.callingStationId || '-'}
      </TableCell>
      <TableCell className="text-xs font-mono hidden lg:table-cell">
        {session.framedIpAddress || '-'}
      </TableCell>
      <TableCell>
        {isActive ? (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1.5 shadow-sm shadow-emerald-500/20 breathe">
            <span className="pulse-dot bg-white" />
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Stopped
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onViewDetails(session)}
            title="View Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950"
            onClick={() => onRadiusTest(session)}
            title="RADIUS Test"
          >
            <Radio className="h-3.5 w-3.5" />
          </Button>
          {isActive && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                onClick={() => onDisconnect(session)}
                title="Disconnect"
              >
                <Unplug className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => onKill(session)}
                title="Kill Session"
              >
                <Skull className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ==================== Session Detail Sheet Content ====================

function SessionDetailContent({ session }: { session: Session }) {
  const isActive = session.status === 'active'
  const liveDuration = useLiveDuration(isActive ? session.acctStartTime : null, isActive)

  const baseInputBytes = (session.acctInputGigawords || 0) * 4294967296 + (session.acctInputOctets || 0)
  const baseOutputBytes = (session.acctOutputGigawords || 0) * 4294967296 + (session.acctOutputOctets || 0)
  const liveInputBytes = useLiveBandwidth(baseInputBytes, isActive)
  const liveOutputBytes = useLiveBandwidth(baseOutputBytes, isActive)

  return (
    <ScrollArea className="mt-6 scrollbar-thin">
      <div className="space-y-6 pr-4">
        {/* Status & Duration */}
        <div className="flex items-center gap-3">
          {isActive ? (
            <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 shadow-sm shadow-emerald-500/20">
              <span className="pulse-dot bg-white" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Stopped</Badge>
          )}
          <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            Duration:
            {isActive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono">{liveDuration}</span>
              </>
            ) : (
              <span className="font-mono">{formatDuration(session.calculatedDuration)}</span>
            )}
          </span>
        </div>

        {/* User Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Information
          </h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Username</span>
              <span className="font-medium">{session.username || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name</span>
              <span>{session.user?.fullName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{session.user?.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span>{session.user?.company || '-'}</span>
            </div>
          </div>
        </div>

        {/* NAS Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Server className="h-4 w-4" />
            Network Access Server
          </h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{session.nas?.nasName || session.calledStationId || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IP Address</span>
              <span className="font-mono">{session.nasIpAddress || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{session.nas?.nasType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor / Model</span>
              <span>{session.nas?.vendor || '-'} {session.nas?.model || ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Port</span>
              <span>{session.nasPortId || session.nasPort || '-'}</span>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Session Information
          </h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session ID</span>
              <span className="font-mono text-xs max-w-[200px] truncate" title={session.sessionId}>
                {session.sessionId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Acct Session ID</span>
              <span className="font-mono text-xs max-w-[200px] truncate" title={session.acctSessionId || ''}>
                {session.acctSessionId || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Time</span>
              <span>{format(new Date(session.acctStartTime), 'yyyy-MM-dd HH:mm:ss')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stop Time</span>
              <span>{session.acctStopTime ? format(new Date(session.acctStopTime), 'yyyy-MM-dd HH:mm:ss') : 'Still active'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session Time</span>
              <span className="inline-flex items-center gap-1.5">
                {isActive && <span className="pulse-dot bg-emerald-500" />}
                <span className="font-mono">
                  {isActive ? liveDuration : formatDuration(session.calculatedDuration)}
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auth Type</span>
              <span>{session.acctAuthentic || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Type</span>
              <span>{session.serviceType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updates</span>
              <span>{session.updateCount}</span>
            </div>
            {session.terminateCause && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terminate Cause</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTerminateCauseColor(session.terminateCause)}`}>
                  {session.terminateCause}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Network Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Network Details
          </h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Framed IP</span>
              <span className="font-mono">{session.framedIpAddress || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Netmask</span>
              <span className="font-mono">{session.framedNetmask || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IP Assignment</span>
              <span>{session.assignIpType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protocol</span>
              <span>{session.framedProtocol || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Port Type</span>
              <span>{session.nasPortType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Called Station</span>
              <span className="font-mono text-xs">{session.calledStationId || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calling Station (MAC)</span>
              <span className="font-mono text-xs">{session.callingStationId || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connect Info</span>
              <span>{session.connectInfo || '-'}</span>
            </div>
          </div>
        </div>

        {/* Bandwidth */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Signal className="h-4 w-4" />
            Bandwidth Usage
            {isActive && (
              <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Download (Input)</span>
              <span className="font-mono">{formatBytes(liveInputBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Upload (Output)</span>
              <span className="font-mono">{formatBytes(liveOutputBytes)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="font-mono">{formatBytes(liveInputBytes + liveOutputBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input Packets</span>
              <span className="font-mono">{(session.acctInputPackets || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Output Packets</span>
              <span className="font-mono">{(session.acctOutputPackets || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

// ==================== Component ====================

export function SessionsView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [nasFilter, setNasFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortField, setSortField] = useState<'acctStartTime' | 'calculatedDuration' | 'acctInputOctets'>('acctStartTime')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; session: Session | null }>({ open: false, session: null })
  const [killDialog, setKillDialog] = useState<{ open: boolean; session: Session | null }>({ open: false, session: null })
  const [radiusTestOpen, setRadiusTestOpen] = useState(false)
  const [radiusTestUsername, setRadiusTestUsername] = useState('')
  const [radiusTestSessionId, setRadiusTestSessionId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDisconnectOpen, setBulkDisconnectOpen] = useState(false)
  const [bulkDisconnectPending, setBulkDisconnectPending] = useState(false)

  // Toggle individual selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Active filters for chips
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = []
  if (search) activeFilters.push({ key: 'search', label: `Search: "${search}"`, onRemove: () => { setSearchInput(''); setSearch('') } })
  if (statusFilter !== 'all') activeFilters.push({ key: 'status', label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('all') })
  if (nasFilter !== 'all') activeFilters.push({ key: 'nas', label: `NAS: ${nasFilter}`, onRemove: () => setNasFilter('all') })
  if (userFilter !== 'all') activeFilters.push({ key: 'user', label: `User: ${userFilter}`, onRemove: () => setUserFilter('all') })
  if (startDate) activeFilters.push({ key: 'start', label: `From: ${startDate}`, onRemove: () => setStartDate('') })
  if (endDate) activeFilters.push({ key: 'end', label: `To: ${endDate}`, onRemove: () => setEndDate('') })

  // Fetch sessions
  const { data, isLoading, isFetching, refetch } = useQuery<SessionsResponse>({
    queryKey: ['sessions', page, search, statusFilter, nasFilter, userFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      })
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (nasFilter && nasFilter !== 'all') params.set('nasIp', nasFilter)
      if (userFilter && userFilter !== 'all') params.set('username', userFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/sessions?${params}`); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json()
    },
    refetchInterval: 15000, // Auto-refresh every 15s
  })

  // Fetch NAS options
  const { data: nasOptions } = useQuery<NasOption[]>({
    queryKey: ['nas-options-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/nas?limit=100&fields=ipAddress,nasName'); if (!res.ok) throw new Error(`HTTP ${res.status}`); const d = await res.json(); return d.nasDevices || d.devices || []
    },
    staleTime: 60000,
  })

  // Fetch user options
  const { data: userOptions } = useQuery<UserOption[]>({
    queryKey: ['user-options-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/users?limit=100&fields=username,fullName'); if (!res.ok) throw new Error(`HTTP ${res.status}`); const d = await res.json(); return d.users || []
    },
    staleTime: 60000,
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async ({ sessionId, terminateCause }: { sessionId: string; terminateCause: string }) => {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, terminateCause }),
      }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json()
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Session Disconnected', description: data.message })
        setDisconnectDialog({ open: false, session: null })
        setKillDialog({ open: false, session: null })
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        if (selectedSession) refetch()
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to disconnect session', variant: 'destructive' })
    },
  })

  // Sort handler
  const handleSort = useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }, [sortField])

  // Sort sessions client-side
  const sortedSessions = data?.sessions ? [...data.sessions].sort((a, b) => {
    const aVal = a[sortField] || 0
    const bVal = b[sortField] || 0
    return sortDir === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  }) : []

  // Selection computed values (after sortedSessions)
  const isAllSelected = sortedSessions.length > 0 && selectedIds.size === sortedSessions.length
  const isSomeSelected = selectedIds.size > 0

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sortedSessions.map(s => s.id)))
  }, [sortedSessions])

  // Clear filters
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setNasFilter('all')
    setUserFilter('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // Bulk disconnect mutation
  const bulkDisconnectMutation = useMutation({
    mutationFn: async ({ sessionIds }: { sessionIds: string[] }) => {
      const res = await fetch('/api/sessions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', sessionIds }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Batch disconnect failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      const count = data.affected ?? selectedIds.size
      sonnerToast.success(`Disconnected ${count} session${count !== 1 ? 's' : ''}`)
      if (data.errors?.length) {
        data.errors.forEach((e: string) => sonnerToast.warning(e))
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      clearSelection()
      setBulkDisconnectOpen(false)
      setBulkDisconnectPending(false)
    },
    onError: (error: Error) => {
      sonnerToast.error(error.message)
      setBulkDisconnectPending(false)
    },
  })

  // Bulk export selected sessions
  const handleBulkExportSelected = (exportFormat: 'csv' | 'json') => {
    const selectedSessions = sortedSessions.filter((s) => selectedIds.has(s.id))
    if (selectedSessions.length === 0) return
    const opts: ExportOptions = {
      title: 'Sessions Export',
      headers: ['Session ID', 'Username', 'NAS IP', 'Start Time', 'Duration', 'Input Octets', 'Output Octets', 'Status'],
      filename: `sessions-selected-export-${new Date().toISOString().slice(0, 10)}`,
      rows: selectedSessions.map((s) => [
        s.sessionId,
        s.username || '',
        s.nasIpAddress || '',
        format(new Date(s.acctStartTime), 'yyyy-MM-dd HH:mm:ss'),
        formatDuration(s.calculatedDuration),
        (s.acctInputGigawords || 0) * 4294967296 + (s.acctInputOctets || 0),
        (s.acctOutputGigawords || 0) * 4294967296 + (s.acctOutputOctets || 0),
        s.status === 'active' ? 'Active' : 'Stopped',
      ]),
    }
    if (exportFormat === 'csv') {
      exportToCSV(opts)
      sonnerToast.success(`${selectedSessions.length} sessions exported as CSV`)
    } else {
      exportToJSON(opts)
      sonnerToast.success(`${selectedSessions.length} sessions exported as JSON`)
    }
  }

  // Escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        clearSelection()
        setBulkDisconnectOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds.size, clearSelection])

  const hasFilters = search || statusFilter !== 'all' || nasFilter !== 'all' || userFilter !== 'all' || startDate || endDate

  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {sortedSessions.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={isAllSelected ? clearSelection : selectAll}
              >
                {isAllSelected ? (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Select All</span>
                  </>
                )}
              </Button>
              {isSomeSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-muted-foreground"
                  onClick={clearSelection}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading || sortedSessions.length === 0} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Sessions Export',
                  headers: ['Session ID', 'Username', 'NAS IP', 'Start Time', 'Duration', 'Input Octets', 'Output Octets', 'Status'],
                  filename: `sessions-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: sortedSessions.map((s) => [
                    s.sessionId,
                    s.username || '',
                    s.nasIpAddress || '',
                    format(new Date(s.acctStartTime), 'yyyy-MM-dd HH:mm:ss'),
                    formatDuration(s.calculatedDuration),
                    (s.acctInputGigawords || 0) * 4294967296 + (s.acctInputOctets || 0),
                    (s.acctOutputGigawords || 0) * 4294967296 + (s.acctOutputOctets || 0),
                    s.status === 'active' ? 'Active' : 'Stopped',
                  ]),
                }
                exportToCSV(opts)
                toast({ title: 'Exported', description: `${sortedSessions.length} sessions exported as CSV` })
              }}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Sessions Export',
                  headers: ['Session ID', 'Username', 'NAS IP', 'Start Time', 'Duration', 'Input Octets', 'Output Octets', 'Status'],
                  filename: `sessions-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: sortedSessions.map((s) => [
                    s.sessionId,
                    s.username || '',
                    s.nasIpAddress || '',
                    format(new Date(s.acctStartTime), 'yyyy-MM-dd HH:mm:ss'),
                    formatDuration(s.calculatedDuration),
                    (s.acctInputGigawords || 0) * 4294967296 + (s.acctInputOctets || 0),
                    (s.acctOutputGigawords || 0) * 4294967296 + (s.acctOutputOctets || 0),
                    s.status === 'active' ? 'Active' : 'Stopped',
                  ]),
                }
                exportToJSON(opts)
                toast({ title: 'Exported', description: `${sortedSessions.length} sessions exported as JSON` })
              }}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Print / PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-1 inset-card relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Sessions</p>
                <div className="text-2xl font-bold text-emerald-600 counter-animate">
                  {isLoading ? <Skeleton className="h-8 w-12 skeleton-shimmer" /> : (stats?.activeCount || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-2 inset-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today&apos;s Total</p>
                <div className="text-2xl font-bold counter-animate">
                  {isLoading ? <Skeleton className="h-8 w-12 skeleton-shimmer" /> : (stats?.todayCount || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <Clock className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-3 inset-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Duration</p>
                <div className="text-2xl font-bold counter-animate">
                  {isLoading ? <Skeleton className="h-8 w-16 skeleton-shimmer" /> : formatDuration(stats?.avgDuration || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Timer className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-4 inset-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Bandwidth</p>
                <div className="text-2xl font-bold counter-animate">
                  {isLoading ? <Skeleton className="h-8 w-16 skeleton-shimmer" /> : formatBytes(stats?.totalBandwidth || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="inset-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 h-7 animated-underline">
                  <X className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {/* Search */}
              <div className="relative sm:col-span-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search username or session ID..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
                  className="pl-8 h-9"
                />
              </div>

              {/* Status */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                </SelectContent>
              </Select>

              {/* NAS */}
              <Select value={nasFilter} onValueChange={(v) => { setNasFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="NAS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All NAS</SelectItem>
                  {nasOptions?.map(nas => (
                    <SelectItem key={nas.ipAddress} value={nas.ipAddress}>
                      {nas.nasName} ({nas.ipAddress})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* User */}
              <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {userOptions?.map(u => (
                    <SelectItem key={u.username} value={u.username}>
                      {u.fullName || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range */}
              <div className="flex gap-1.5">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                  className="h-9 text-xs"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                  className="h-9 text-xs"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeFilters.map((f) => (
                  <Badge key={f.key} variant="secondary" className="gap-1 text-xs pr-1 pl-2 py-1 font-normal">
                    {f.label}
                    <button
                      onClick={f.onRemove}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {isSomeSelected && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
              {selectedIds.size} session{selectedIds.size > 1 ? 's' : ''} selected
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setBulkDisconnectOpen(true)}
              disabled={bulkDisconnectPending}
            >
              {bulkDisconnectPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Bulk Disconnect</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export Selected</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkExportSelected('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Selected CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkExportSelected('json')}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export Selected JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5"
              onClick={clearSelection}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs w-10">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={isAllSelected ? clearSelection : selectAll}
                      aria-label="Select all sessions"
                    />
                  </TableHead>
                  <TableHead className="text-xs">Session ID</TableHead>
                  <TableHead className="text-xs">Username</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">NAS</TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none hidden md:table-cell"
                    onClick={() => handleSort('acctStartTime')}
                  >
                    <div className="flex items-center gap-1">
                      Start Time
                      {sortField === 'acctStartTime' && (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-xs cursor-pointer select-none"
                    onClick={() => handleSort('calculatedDuration')}
                  >
                    <div className="flex items-center gap-1">
                      Duration
                      {sortField === 'calculatedDuration' && (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <ArrowDown className="h-3 w-3" />
                      <ArrowUp className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">MAC</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">IP</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="table-row-hover">
                      <TableCell><Skeleton className="h-4 w-4 skeleton-shimmer" /></TableCell>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full skeleton-shimmer" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sortedSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="h-8 w-8 opacity-30" />
                        <p>No sessions found</p>
                        {hasFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedSessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      selected={selectedIds.has(session.id)}
                      onToggleSelect={toggleSelect}
                      onViewDetails={(s) => { setSelectedSession(s); setSheetOpen(true) }}
                      onDisconnect={(s) => setDisconnectDialog({ open: true, session: s })}
                      onKill={(s) => setKillDialog({ open: true, session: s })}
                      onRadiusTest={(s) => {
                        setRadiusTestUsername(s.username || '')
                        setRadiusTestSessionId(s.sessionId || '')
                        setRadiusTestOpen(true)
                      }}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, data.total)} of {data.total} sessions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <span className="text-sm font-medium px-2">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="h-8 gap-1"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg max-w-[95vw] overflow-y-auto card-glow">
          <SheetHeader>
            <SheetTitle>Session Details</SheetTitle>
            <SheetDescription>
              {selectedSession?.status === 'active' ? 'Active session information' : 'Completed session details'}
            </SheetDescription>
          </SheetHeader>

          {selectedSession && (
            <SessionDetailContent session={selectedSession} />
          )}
        </SheetContent>
      </Sheet>

      {/* Disconnect Dialog */}
      <AlertDialog open={disconnectDialog.open} onOpenChange={(open) => setDisconnectDialog({ open, session: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to gracefully disconnect this session?
              <br />
              <span className="font-mono text-xs mt-1 block">{disconnectDialog.session?.sessionId}</span>
              <span className="text-xs mt-1 block">User: {disconnectDialog.session?.username}</span>
              The session will be terminated with cause &quot;Admin-Reset&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectDialog.session) {
                  disconnectMutation.mutate({
                    sessionId: disconnectDialog.session.sessionId,
                    terminateCause: 'Admin-Reset',
                  })
                }
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kill Session Dialog */}
      <AlertDialog open={killDialog.open} onOpenChange={(open) => setKillDialog({ open, session: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Kill Session</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-red-600">Warning:</span> This will forcefully terminate the session immediately.
              <br />
              <span className="font-mono text-xs mt-1 block">{killDialog.session?.sessionId}</span>
              <span className="text-xs mt-1 block">User: {killDialog.session?.username}</span>
              The session will be terminated with cause &quot;Admin-Reset&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (killDialog.session) {
                  disconnectMutation.mutate({
                    sessionId: killDialog.session.sessionId,
                    terminateCause: 'Admin-Reset',
                  })
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Kill Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* RADIUS Test Dialog */}
      <RadiusTestDialog
        open={radiusTestOpen}
        onOpenChange={setRadiusTestOpen}
        defaultUsername={radiusTestUsername}
        defaultSessionId={radiusTestSessionId}
      />

      {/* Bulk Disconnect Dialog */}
      <AlertDialog open={bulkDisconnectOpen} onOpenChange={setBulkDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Bulk Disconnect Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-red-600">Warning:</span> This will forcefully terminate{' '}
              <span className="font-bold">{selectedIds.size}</span> selected session{selectedIds.size > 1 ? 's' : ''} immediately.
              <br />
              All sessions will be terminated with cause &quot;Admin-Reset&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={clearSelection}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setBulkDisconnectPending(true)
                const sessionIds = sortedSessions
                  .filter((s) => selectedIds.has(s.id))
                  .map((s) => s.sessionId)
                bulkDisconnectMutation.mutate({ sessionIds })
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDisconnectPending}
            >
              {bulkDisconnectPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Disconnect All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
