'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Globe,
  Plus,
  Search,
  Pencil,
  Trash2,
  Server,
  Network,
  ArrowUpDown,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CircleDot,
  Clock,
  Shield,
  Wifi,
  Lock,
  MonitorSmartphone,
  Copy,
  RefreshCw,
  X,
  Info,
  Check,
  Circle,
  Ban,
  LayoutGrid,
  List,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Bookmark,
  Unplug,
  ArrowRight,
  Zap,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ==========================================
// TYPES
// ==========================================

interface IpPoolSummary {
  id: string
  name: string
  description: string | null
  network: string
  gateway: string | null
  subnetMask: string | null
  dnsPrimary: string | null
  dnsSecondary: string | null
  leaseTime: number
  type: string
  status: string
  createdAt: string
  updatedAt: string
  rangesCount: number
  usersCount: number
  assignmentsCount: number
  totalIps: number
  availableIps: number
  assignedIps: number
  reservedIps: number
  quarantinedIps: number
  utilizationPercent: number
}

interface IpPoolRange {
  id: string
  poolId: string
  startIp: string
  endIp: string
  currentIp: string | null
  isAvailable: boolean
  totalIps: number
  availableIps: number
  assignedIps: number
  reservedIps: number
  quarantinedIps: number
  utilizationPercent: number
}

interface IpAssignment {
  id: string
  poolId: string
  rangeId: string
  ipAddress: string
  username: string | null
  macAddress: string | null
  hostname: string | null
  assignedAt: string | null
  releasedAt: string | null
  status: string
}

interface IpPoolDetail {
  id: string
  name: string
  description: string | null
  network: string
  gateway: string | null
  subnetMask: string | null
  dnsPrimary: string | null
  dnsSecondary: string | null
  leaseTime: number
  type: string
  status: string
  createdAt: string
  updatedAt: string
  ranges: IpPoolRange[]
  assignments: IpAssignment[]
  users: { id: string; username: string; fullName: string | null; status: string }[]
  totalIps: number
  availableIps: number
  assignedIps: number
  reservedIps: number
  quarantinedIps: number
  utilizationPercent: number
}

interface UserOption {
  id: string
  username: string
  fullName: string | null
  status: string
}

interface PoolFormData {
  name: string
  description: string
  network: string
  gateway: string
  subnetMask: string
  dnsPrimary: string
  dnsSecondary: string
  leaseTime: string
  type: string
  ranges: { startIp: string; endIp: string }[]
}

interface AssignFormData {
  username: string
  macAddress: string
  hostname: string
}

const emptyForm: PoolFormData = {
  name: '',
  description: '',
  network: '',
  gateway: '',
  subnetMask: '',
  dnsPrimary: '',
  dnsSecondary: '',
  leaseTime: '86400',
  type: 'dhcp',
  ranges: [{ startIp: '', endIp: '' }],
}

const emptyAssignForm: AssignFormData = {
  username: '',
  macAddress: '',
  hostname: '',
}

// ==========================================
// CONSTANTS
// ==========================================

const POOL_TYPES = [
  { value: 'dhcp', label: 'DHCP', icon: Wifi, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  { value: 'static', label: 'Static', icon: Lock, color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
  { value: 'pppoe', label: 'PPPoE', icon: Network, color: 'text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25', dotColor: 'bg-emerald-500' },
  disabled: { label: 'Disabled', color: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/25', dotColor: 'bg-zinc-400' },
  full: { label: 'Full', color: 'bg-red-500/15 text-red-600 border-red-500/25', dotColor: 'bg-red-500' },
}

const ASSIGNMENT_STATUS: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  available: { label: 'Available', color: 'text-emerald-600 bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Circle },
  assigned: { label: 'Assigned', color: 'text-amber-600 bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400', icon: CircleDot },
  reserved: { label: 'Reserved', color: 'text-violet-600 bg-violet-100/80 dark:bg-violet-900/30 dark:text-violet-400', icon: Shield },
  quarantined: { label: 'Quarantined', color: 'text-red-600 bg-red-100/80 dark:bg-red-900/30 dark:text-red-400', icon: Ban },
}

const LEASE_OPTIONS = [
  { value: '3600', label: '1 Hour' },
  { value: '86400', label: '1 Day' },
  { value: '604800', label: '1 Week' },
  { value: '2592000', label: '30 Days' },
  { value: '0', label: 'Unlimited' },
]

// ==========================================
// HELPER COMPONENTS
// ==========================================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disabled
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 gap-1.5', config.color)}>
      <span className={cn('relative flex h-2 w-2')}>
        {status === 'active' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dotColor)} />
      </span>
      {config.label}
    </Badge>
  )
}

function TypeBadge({ type }: { type: string }) {
  const config = POOL_TYPES.find((t) => t.value === type) || POOL_TYPES[0]
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 gap-1', config.color)}>
      <config.icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function AssignmentStatusBadge({ status }: { status: string }) {
  const config = ASSIGNMENT_STATUS[status] || ASSIGNMENT_STATUS.available
  const IconComp = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full', config.color)}>
      <IconComp className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function UtilizationBar({ percent, size = 'sm', className }: { percent: number; size?: 'sm' | 'lg' | 'xl'; className?: string }) {
  const gradient = percent >= 90
    ? 'from-red-500 to-red-400'
    : percent >= 70
    ? 'from-amber-500 to-amber-400'
    : 'from-emerald-500 to-emerald-400'

  const heightClass = size === 'xl' ? 'h-3' : size === 'lg' ? 'h-2.5' : 'h-1.5'
  const textClass = size === 'xl' ? 'text-xs' : size === 'lg' ? 'text-[11px]' : 'text-[10px]'

  return (
    <div className={cn('flex items-center gap-2', size === 'xl' && 'gap-3', className)}>
      <div className={cn('flex-1 rounded-full bg-muted overflow-hidden', heightClass)}>
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', gradient)}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={cn('font-semibold tabular-nums text-muted-foreground shrink-0', textClass)}>
        {percent}%
      </span>
    </div>
  )
}

function MiniBarChart({ available, assigned, reserved, total }: { available: number; assigned: number; reserved: number; total: number }) {
  if (total === 0) return null
  const availPct = (available / total) * 100
  const assignPct = (assigned / total) * 100
  const resPct = (reserved / total) * 100
  return (
    <div className="space-y-1">
      <div className="flex rounded-full overflow-hidden h-3 bg-muted gap-px">
        <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${availPct}%` }} title={`Available: ${available}`} />
        <div className="bg-amber-500 transition-all duration-500" style={{ width: `${assignPct}%` }} title={`Assigned: ${assigned}`} />
        <div className="bg-violet-500 transition-all duration-500" style={{ width: `${resPct}%` }} title={`Reserved: ${reserved}`} />
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Available {available}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Assigned {assigned}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />Reserved {reserved}</span>
      </div>
    </div>
  )
}

function formatLeaseTime(seconds: number): string {
  if (seconds === 0) return 'Unlimited'
  if (seconds < 3600) return `${seconds}s`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function isValidIp(ip: string): boolean {
  const regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ip.match(regex)
  if (!match) return false
  return match.slice(1).every((o) => { const n = parseInt(o, 10); return n >= 0 && n <= 255 })
}

function calculateRangeIps(startIp: string, endIp: string): number {
  if (!isValidIp(startIp) || !isValidIp(endIp)) return 0
  const parts1 = startIp.split('.').map(Number)
  const parts2 = endIp.split('.').map(Number)
  const long1 = ((parts1[0] << 24) | (parts1[1] << 16) | (parts1[2] << 8) | parts1[3]) >>> 0
  const long2 = ((parts2[0] << 24) | (parts2[1] << 16) | (parts2[2] << 8) | parts2[3]) >>> 0
  return Math.max(0, long2 - long1 + 1)
}

function RangePreview({ ranges }: { ranges: { startIp: string; endIp: string }[] }) {
  const validRanges = ranges.filter((r) => isValidIp(r.startIp) && isValidIp(r.endIp))
  const totalIps = validRanges.reduce((sum, r) => sum + calculateRangeIps(r.startIp, r.endIp), 0)

  if (validRanges.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
        <Network className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Enter valid IP ranges to see preview</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Range Preview</span>
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          {totalIps.toLocaleString()} total IPs
        </Badge>
      </div>
      <div className="space-y-2">
        {validRanges.map((r, i) => {
          const count = calculateRangeIps(r.startIp, r.endIp)
          const pctOfTotal = totalIps > 0 ? (count / totalIps) * 100 : 0
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <code className="font-mono text-foreground">{r.startIp}</code>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <code className="font-mono text-foreground">{r.endIp}</code>
                <Badge variant="outline" className="text-[10px] ml-2 tabular-nums">{count} IPs</Badge>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${pctOfTotal}%`, minWidth: count > 0 ? '2px' : '0' }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {validRanges.length > 1 && (
        <div className="flex items-center gap-2 pt-1 border-t">
          <Activity className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[11px] text-emerald-600 font-medium">{validRanges.length} ranges combined</span>
        </div>
      )}
    </div>
  )
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function IpPoolsView() {
  const queryClient = useQueryClient()

  // UI state
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null)
  const [ipSearchFilter, setIpSearchFilter] = useState('')

  // Detail panel
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null)

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false)
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false)
  const [releasingIp, setReleasingIp] = useState<{ ipAddress: string; username: string | null } | null>(null)
  const [formData, setFormData] = useState<PoolFormData>(emptyForm)
  const [editingPool, setEditingPool] = useState<IpPoolSummary | null>(null)
  const [deletingPool, setDeletingPool] = useState<IpPoolSummary | null>(null)
  const [assignFormData, setAssignFormData] = useState<AssignFormData>(emptyAssignForm)
  const [reserveIpAddress, setReserveIpAddress] = useState('')
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const commandInputRef = useRef<HTMLInputElement>(null)

  // ==========================================
  // QUERIES
  // ==========================================

  const { data, isLoading, isError } = useQuery<{
    pools: IpPoolSummary[]
    stats: {
      totalPools: number
      totalIps: number
      availableIps: number
      assignedIps: number
      reservedIps: number
      utilizationPercent: number
    }
  }>({
    queryKey: ['ip-pools', typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/ip-pools?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch IP pools')
      return res.json()
    },
    staleTime: 30000,
  })

  const { data: users } = useQuery<{ users: UserOption[] }>({
    queryKey: ['users-list-for-assign'],
    queryFn: async () => {
      const res = await fetch('/api/users?limit=500')
      if (!res.ok) return { users: [] }
      const d = await res.json()
      return {
        users: (d.users || []).map((u: { id: string; username: string; fullName: string | null; status: string }) => ({
          id: u.id, username: u.username, fullName: u.fullName, status: u.status,
        })),
      }
    },
    staleTime: 60000,
  })

  const { data: poolDetail, isLoading: detailLoading } = useQuery<IpPoolDetail>({
    queryKey: ['ip-pool-detail', selectedPoolId],
    queryFn: async () => {
      const res = await fetch(`/api/ip-pools/${selectedPoolId}`)
      if (!res.ok) throw new Error('Failed to fetch pool details')
      const d = await res.json()
      return d.pool
    },
    enabled: !!selectedPoolId,
    staleTime: 10000,
  })

  const stats = data?.stats

  // Filter pools by search
  const filteredPools = useMemo(() => {
    if (!data?.pools) return []
    if (!search) return data.pools
    const q = search.toLowerCase()
    return data.pools.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.network.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.gateway?.includes(q) ||
        p.type.toLowerCase().includes(q)
    )
  }, [data, search])

  // Filter assignments by IP search
  const filteredAssignments = useMemo(() => {
    if (!poolDetail?.assignments) return []
    if (!ipSearchFilter) return poolDetail.assignments
    const q = ipSearchFilter.toLowerCase()
    return poolDetail.assignments.filter(
      (a) =>
        a.ipAddress.includes(q) ||
        a.username?.toLowerCase().includes(q) ||
        a.macAddress?.toLowerCase().includes(q) ||
        a.hostname?.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
    )
  }, [poolDetail, ipSearchFilter])

  // Recent assignments
  const recentAssignments = useMemo(() => {
    if (!poolDetail?.assignments) return []
    return poolDetail.assignments
      .filter((a) => a.status === 'assigned' && a.assignedAt)
      .sort((a, b) => new Date(b.assignedAt!).getTime() - new Date(a.assignedAt!).getTime())
      .slice(0, 5)
  }, [poolDetail])

  // ==========================================
  // MUTATIONS
  // ==========================================

  const createMutation = useMutation({
    mutationFn: async (form: PoolFormData) => {
      const res = await fetch('/api/ip-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create IP pool')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('IP pool created successfully')
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      closeCreateDialog()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PoolFormData> }) => {
      const res = await fetch(`/api/ip-pools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update IP pool')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('IP pool updated successfully')
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
      closeEditDialog()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ip-pools/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete IP pool')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('IP pool deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      setDeleteDialogOpen(false)
      setDeletingPool(null)
      if (selectedPoolId === deletingPool?.id) setSelectedPoolId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const assignMutation = useMutation({
    mutationFn: async ({ poolId, username, macAddress, hostname }: { poolId: string; username: string; macAddress?: string; hostname?: string }) => {
      const res = await fetch(`/api/ip-pools/${poolId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, macAddress, hostname }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to assign IP')
      }
      return res.json()
    },
    onSuccess: (d) => {
      toast.success(`IP ${d.assignment.ipAddress} assigned to ${d.assignment.username}`)
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
      closeAssignDialog()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const reserveMutation = useMutation({
    mutationFn: async ({ poolId, ipAddress }: { poolId: string; ipAddress: string }) => {
      const res = await fetch(`/api/ip-pools/${poolId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reserve IP')
      }
      return res.json()
    },
    onSuccess: (d) => {
      toast.success(d.message)
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
      setReserveDialogOpen(false)
      setReserveIpAddress('')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const releaseIpMutation = useMutation({
    mutationFn: async ({ poolId, ipAddress }: { poolId: string; ipAddress: string }) => {
      const res = await fetch(`/api/ip-pools/${poolId}/release-ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to release IP')
      }
      return res.json()
    },
    onSuccess: (d) => {
      toast.success(d.message)
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
      setReleaseConfirmOpen(false)
      setReleasingIp(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const releaseByUserMutation = useMutation({
    mutationFn: async ({ poolId, username }: { poolId: string; username: string }) => {
      const res = await fetch(`/api/ip-pools/${poolId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to release IP')
      }
      return res.json()
    },
    onSuccess: (d) => {
      toast.success(d.message)
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // ==========================================
  // HANDLERS
  // ==========================================

  const openCreateDialog = () => {
    setFormData(emptyForm)
    setCreateDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setCreateDialogOpen(false)
    setFormData(emptyForm)
  }

  const openEditDialog = (pool: IpPoolSummary) => {
    setEditingPool(pool)
    setFormData({
      name: pool.name,
      description: pool.description || '',
      network: pool.network,
      gateway: pool.gateway || '',
      subnetMask: pool.subnetMask || '',
      dnsPrimary: pool.dnsPrimary || '',
      dnsSecondary: pool.dnsSecondary || '',
      leaseTime: pool.leaseTime.toString(),
      type: pool.type,
      ranges: [],
    })
    setEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setEditDialogOpen(false)
    setEditingPool(null)
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validRanges = formData.ranges.filter((r) => r.startIp.trim() && r.endIp.trim())
    createMutation.mutate({ ...formData, ranges: validRanges })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPool) return
    updateMutation.mutate({ id: editingPool.id, data: formData })
  }

  const handleDelete = (pool: IpPoolSummary) => {
    setDeletingPool(pool)
    setDeleteDialogOpen(true)
  }

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPoolId) return
    assignMutation.mutate({
      poolId: selectedPoolId,
      username: assignFormData.username,
      macAddress: assignFormData.macAddress || undefined,
      hostname: assignFormData.hostname || undefined,
    })
  }

  const closeAssignDialog = () => {
    setAssignDialogOpen(false)
    setAssignFormData(emptyAssignForm)
  }

  const handleReserveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPoolId || !reserveIpAddress.trim()) return
    reserveMutation.mutate({ poolId: selectedPoolId, ipAddress: reserveIpAddress.trim() })
  }

  const handleReleaseIp = (ipAddress: string, username: string | null) => {
    setReleasingIp({ ipAddress, username })
    setReleaseConfirmOpen(true)
  }

  const confirmReleaseIp = () => {
    if (!selectedPoolId || !releasingIp) return
    releaseIpMutation.mutate({ poolId: selectedPoolId, ipAddress: releasingIp.ipAddress })
  }

  const handleUserSelect = (user: UserOption) => {
    setAssignFormData((prev) => ({ ...prev, username: user.username }))
    setUserSearchOpen(false)
    // Auto-populate if user has existing data
    const existingAssignment = poolDetail?.assignments.find((a) => a.username === user.username)
    if (existingAssignment) {
      setAssignFormData((prev) => ({
        ...prev,
        macAddress: existingAssignment.macAddress || prev.macAddress,
        hostname: existingAssignment.hostname || prev.hostname,
      }))
    }
  }

  const addRangeRow = () => {
    setFormData((prev) => ({
      ...prev,
      ranges: [...prev.ranges, { startIp: '', endIp: '' }],
    }))
  }

  const removeRangeRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ranges: prev.ranges.filter((_, i) => i !== index),
    }))
  }

  const updateRangeRow = (index: number, field: 'startIp' | 'endIp', value: string) => {
    setFormData((prev) => ({
      ...prev,
      ranges: prev.ranges.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ========== ACTION BAR ========== */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={cn('h-8 w-8', viewMode === 'grid' && 'bg-accent')}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={cn('h-8 w-8', viewMode === 'list' && 'bg-accent')}
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
                queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
              }}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create IP Pool
            </Button>
          </div>
        </div>

        {/* ========== POOL OVERVIEW DASHBOARD ========== */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{stats.totalPools}</p>
                    <p className="text-[11px] text-muted-foreground">Total Pools</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-500/10">
                    <Server className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{stats.totalIps.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">Total IPs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
                    <Circle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">{stats.availableIps.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/10">
                    <CircleDot className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600 tabular-nums">{stats.assignedIps.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">Assigned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-500/10">
                    <Shield className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-600 tabular-nums">{stats.reservedIps.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">Reserved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm col-span-2 md:col-span-1">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-rose-500/10">
                      <Zap className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-rose-600 tabular-nums">{stats.utilizationPercent}%</p>
                      <p className="text-[11px] text-muted-foreground">Utilization</p>
                    </div>
                  </div>
                  <UtilizationBar percent={stats.utilizationPercent} size="lg" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <StatsSkeleton />
        )}

        {/* ========== FILTER BAR ========== */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pools by name, network, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 w-full sm:w-[130px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {POOL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 w-full sm:w-[130px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== MAIN CONTENT ========== */}
        <div className={cn('grid gap-6', selectedPoolId && 'lg:grid-cols-5')}>
          {/* Pool List / Grid */}
          <div className={cn(selectedPoolId ? 'lg:col-span-3' : '')}>
            {isLoading ? (
              <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
                {[1, 2, 3, 4].map((i) => (
                  <PoolCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <Card className="border shadow-sm">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">Failed to load IP pools</h3>
                  <p className="text-sm text-muted-foreground">There was an error fetching IP pools.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['ip-pools'] })}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : filteredPools.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="p-12 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">No IP pools found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {search || typeFilter || statusFilter
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Create your first IP pool to manage IP address allocation.'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {(search || typeFilter || statusFilter) && (
                      <Button variant="outline" size="sm" onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter('') }}>
                        Clear Filters
                      </Button>
                    )}
                    <Button size="sm" onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create IP Pool
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPools.map((pool) => (
                  <PoolCard
                    key={pool.id}
                    pool={pool}
                    isSelected={selectedPoolId === pool.id}
                    isExpanded={expandedPoolId === pool.id}
                    onSelect={() => setSelectedPoolId(selectedPoolId === pool.id ? null : pool.id)}
                    onToggleExpand={() => setExpandedPoolId(expandedPoolId === pool.id ? null : pool.id)}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPools.map((pool) => (
                  <PoolListItem
                    key={pool.id}
                    pool={pool}
                    isSelected={selectedPoolId === pool.id}
                    onSelect={() => setSelectedPoolId(selectedPoolId === pool.id ? null : pool.id)}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ========== DETAIL PANEL ========== */}
          <div className="lg:col-span-2">
            {selectedPoolId && detailLoading ? (
              <DetailSkeleton />
            ) : selectedPoolId && poolDetail ? (
              <PoolDetailPanel
                pool={poolDetail}
                onClose={() => setSelectedPoolId(null)}
                onEdit={() => openEditDialog(filteredPools.find((p) => p.id === selectedPoolId)!)}
                onAssign={() => {
                  setAssignFormData(emptyAssignForm)
                  setAssignDialogOpen(true)
                }}
                onReserve={() => {
                  setReserveIpAddress('')
                  setReserveDialogOpen(true)
                }}
                onRelease={handleReleaseIp}
                onCopy={copyToClipboard}
                ipSearchFilter={ipSearchFilter}
                onIpSearchChange={setIpSearchFilter}
                filteredAssignments={filteredAssignments}
                recentAssignments={recentAssignments}
                isReleasing={releaseIpMutation.isPending}
              />
            ) : null}
          </div>
        </div>

        {/* ========== CREATE POOL DIALOG ========== */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create IP Pool
              </DialogTitle>
              <DialogDescription>Define a new IP address pool with network settings and IP ranges</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Pool Name <span className="text-red-500">*</span></Label>
                  <Input id="create-name" placeholder="LAN-Office-10" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-network">Network CIDR <span className="text-red-500">*</span></Label>
                  <Input id="create-network" placeholder="10.0.0.0/24" value={formData.network} onChange={(e) => setFormData({ ...formData, network: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-desc">Description</Label>
                <Textarea id="create-desc" placeholder="Office LAN pool for DHCP" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-type">Allocation Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POOL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-lease">Lease Time</Label>
                  <Select value={formData.leaseTime} onValueChange={(v) => setFormData({ ...formData, leaseTime: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEASE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Network Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-gateway">Gateway</Label>
                  <Input id="create-gateway" placeholder="10.0.0.1" value={formData.gateway} onChange={(e) => setFormData({ ...formData, gateway: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-mask">Subnet Mask</Label>
                  <Input id="create-mask" placeholder="255.255.255.0" value={formData.subnetMask} onChange={(e) => setFormData({ ...formData, subnetMask: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-dns1">Primary DNS</Label>
                  <Input id="create-dns1" placeholder="8.8.8.8" value={formData.dnsPrimary} onChange={(e) => setFormData({ ...formData, dnsPrimary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-dns2">Secondary DNS</Label>
                  <Input id="create-dns2" placeholder="8.8.4.4" value={formData.dnsSecondary} onChange={(e) => setFormData({ ...formData, dnsSecondary: e.target.value })} />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IP Ranges</p>
                <Button type="button" variant="outline" size="sm" onClick={addRangeRow} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Range
                </Button>
              </div>
              <div className="space-y-2">
                {formData.ranges.map((range, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Start IP</Label>
                      <Input
                        placeholder="10.0.0.100"
                        value={range.startIp}
                        onChange={(e) => updateRangeRow(i, 'startIp', e.target.value)}
                        className={cn(range.startIp && !isValidIp(range.startIp) && 'border-red-500')}
                      />
                    </div>
                    <span className="pb-2 text-muted-foreground text-xs">→</span>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">End IP</Label>
                      <Input
                        placeholder="10.0.0.200"
                        value={range.endIp}
                        onChange={(e) => updateRangeRow(i, 'endIp', e.target.value)}
                        className={cn(range.endIp && !isValidIp(range.endIp) && 'border-red-500')}
                      />
                    </div>
                    {formData.ranges.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeRangeRow(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {/* Visual Range Preview */}
              <RangePreview ranges={formData.ranges} />
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeCreateDialog}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Pool
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========== EDIT POOL DIALOG ========== */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit IP Pool
              </DialogTitle>
              <DialogDescription>Update pool settings and configuration</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Pool Name <span className="text-red-500">*</span></Label>
                  <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-network">Network CIDR</Label>
                  <Input id="edit-network" value={formData.network} onChange={(e) => setFormData({ ...formData, network: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea id="edit-desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POOL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lease Time</Label>
                  <Select value={formData.leaseTime} onValueChange={(v) => setFormData({ ...formData, leaseTime: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEASE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Network Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gateway</Label>
                  <Input placeholder="10.0.0.1" value={formData.gateway} onChange={(e) => setFormData({ ...formData, gateway: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Subnet Mask</Label>
                  <Input placeholder="255.255.255.0" value={formData.subnetMask} onChange={(e) => setFormData({ ...formData, subnetMask: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Primary DNS</Label>
                  <Input placeholder="8.8.8.8" value={formData.dnsPrimary} onChange={(e) => setFormData({ ...formData, dnsPrimary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary DNS</Label>
                  <Input placeholder="8.8.4.4" value={formData.dnsSecondary} onChange={(e) => setFormData({ ...formData, dnsSecondary: e.target.value })} />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeEditDialog}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========== ASSIGN IP DIALOG ========== */}
        <Dialog open={assignDialogOpen} onOpenChange={(open) => !open && closeAssignDialog()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Assign IP Address
              </DialogTitle>
              <DialogDescription>Assign the next available IP from this pool to a user</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>User <span className="text-red-500">*</span></Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={userSearchOpen}
                      className="w-full justify-between font-normal h-9"
                    >
                      {assignFormData.username
                        ? <span className="flex items-center gap-2"><MonitorSmartphone className="h-4 w-4 text-muted-foreground" />{assignFormData.username}</span>
                        : <span className="text-muted-foreground">Search and select user...</span>
                      }
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput ref={commandInputRef} placeholder="Search users by name or username..." />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {(users?.users || []).map((user) => (
                            <CommandItem
                              key={user.id}
                              value={`${user.username} ${user.fullName || ''}`}
                              onSelect={() => handleUserSelect(user)}
                              className="flex items-center gap-2"
                            >
                              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="text-sm">{user.username}</p>
                                {user.fullName && <p className="text-[11px] text-muted-foreground">{user.fullName}</p>}
                              </div>
                              {assignFormData.username === user.username && <Check className="h-4 w-4" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assign-mac">MAC Address</Label>
                  <Input id="assign-mac" placeholder="AA:BB:CC:DD:EE:FF" value={assignFormData.macAddress} onChange={(e) => setAssignFormData({ ...assignFormData, macAddress: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-host">Hostname</Label>
                  <Input id="assign-host" placeholder="device-001" value={assignFormData.hostname} onChange={(e) => setAssignFormData({ ...assignFormData, hostname: e.target.value })} />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeAssignDialog}>Cancel</Button>
                <Button type="submit" disabled={assignMutation.isPending || !assignFormData.username}>
                  {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Assign IP
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========== RESERVE IP DIALOG ========== */}
        <Dialog open={reserveDialogOpen} onOpenChange={(open) => { if (!open) setReserveDialogOpen(false) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Reserve IP Address
              </DialogTitle>
              <DialogDescription>Reserve a specific IP address so it won&apos;t be auto-assigned</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleReserveSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reserve-ip">IP Address <span className="text-red-500">*</span></Label>
                <Input
                  id="reserve-ip"
                  placeholder="10.0.0.150"
                  value={reserveIpAddress}
                  onChange={(e) => setReserveIpAddress(e.target.value)}
                  required
                  className={cn(reserveIpAddress && !isValidIp(reserveIpAddress) && 'border-red-500')}
                />
                <p className="text-[11px] text-muted-foreground">Must be an available IP within this pool&apos;s ranges</p>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setReserveDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={reserveMutation.isPending || !reserveIpAddress.trim()}>
                  {reserveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Reserve IP
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========== DELETE CONFIRMATION ========== */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete IP Pool
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete pool <span className="font-semibold text-foreground">&quot;{deletingPool?.name}&quot;</span>?
                This action cannot be undone. All IP ranges and unassigned IPs will be permanently removed.
                {deletingPool && deletingPool.assignedIps > 0 && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    ⚠ This pool has {deletingPool.assignedIps} assigned IP(s). Release them first.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingPool && deleteMutation.mutate(deletingPool.id)}
                disabled={deleteMutation.isPending || (deletingPool?.assignedIps ?? 0) > 0}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Pool
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ========== RELEASE IP CONFIRMATION ========== */}
        <AlertDialog open={releaseConfirmOpen} onOpenChange={setReleaseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Unplug className="h-5 w-5 text-amber-600" />
                Release IP Address
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to release IP <span className="font-semibold font-mono text-foreground">{releasingIp?.ipAddress}</span>
                {releasingIp?.username && <> assigned to <span className="font-semibold text-foreground">{releasingIp.username}</span></>}?
                The IP will become available for reassignment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmReleaseIp}
                disabled={releaseIpMutation.isPending}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {releaseIpMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Release IP
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

// ==========================================
// SKELETON COMPONENTS
// ==========================================

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PoolCardSkeleton() {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex gap-3">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Separator />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ==========================================
// POOL CARD COMPONENT
// ==========================================

function PoolCard({
  pool,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onCopy,
}: {
  pool: IpPoolSummary
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onEdit: (pool: IpPoolSummary) => void
  onDelete: (pool: IpPoolSummary) => void
  onCopy: (text: string) => void
}) {
  return (
    <Card
      className={cn(
        'border shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer group',
        isSelected && 'ring-2 ring-primary/50 border-primary/30',
        isExpanded && 'ring-1 ring-primary/20'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{pool.name}</h3>
              <StatusBadge status={pool.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={pool.type} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={(e) => { e.stopPropagation(); onCopy(pool.network) }} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                    {pool.network}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to copy</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(pool) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit pool</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(pool) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete pool</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Utilization */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{pool.assignedIps}/{pool.totalIps} assigned</span>
            <span>{pool.availableIps} available</span>
          </div>
          <UtilizationBar percent={pool.utilizationPercent} />
        </div>

        {/* Network Info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {pool.gateway && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Server className="h-3 w-3" />
              <span>GW: {pool.gateway}</span>
            </div>
          )}
          {pool.subnetMask && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Network className="h-3 w-3" />
              <span>{pool.subnetMask}</span>
            </div>
          )}
          {pool.dnsPrimary && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>DNS: {pool.dnsPrimary}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Lease: {formatLeaseTime(pool.leaseTime)}</span>
          </div>
        </div>

        {/* Expand Toggle */}
        {pool.rangesCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs gap-1 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {pool.rangesCount} Range{pool.rangesCount > 1 ? 's' : ''} • {pool.usersCount} User{pool.usersCount !== 1 ? 's' : ''}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ==========================================
// POOL LIST ITEM COMPONENT
// ==========================================

function PoolListItem({
  pool,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  pool: IpPoolSummary
  isSelected: boolean
  onSelect: () => void
  onEdit: (pool: IpPoolSummary) => void
  onDelete: (pool: IpPoolSummary) => void
}) {
  return (
    <Card
      className={cn(
        'border shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer',
        isSelected && 'ring-2 ring-primary/50 border-primary/30'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{pool.name}</h3>
              <StatusBadge status={pool.status} />
              <TypeBadge type={pool.type} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
              <span className="font-mono">{pool.network}</span>
              {pool.gateway && <span>GW: {pool.gateway}</span>}
              <span>{pool.totalIps} IPs</span>
              <span>{pool.assignedIps}/{pool.totalIps} used</span>
            </div>
          </div>
          <div className="w-32 hidden sm:block">
            <UtilizationBar percent={pool.utilizationPercent} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(pool) }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(pool) }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// POOL DETAIL PANEL
// ==========================================

function PoolDetailPanel({
  pool,
  onClose,
  onEdit,
  onAssign,
  onReserve,
  onRelease,
  onCopy,
  ipSearchFilter,
  onIpSearchChange,
  filteredAssignments,
  recentAssignments,
  isReleasing,
}: {
  pool: IpPoolDetail
  onClose: () => void
  onEdit: () => void
  onAssign: () => void
  onReserve: () => void
  onRelease: (ipAddress: string, username: string | null) => void
  onCopy: (text: string) => void
  ipSearchFilter: string
  onIpSearchChange: (v: string) => void
  filteredAssignments: IpAssignment[]
  recentAssignments: IpAssignment[]
  isReleasing: boolean
}) {
  const [tab, setTab] = useState('overview')

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {pool.name}
              <StatusBadge status={pool.status} />
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{pool.network}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="overview" className="text-[11px] gap-1 h-7">
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-[11px] gap-1 h-7">
              <MonitorSmartphone className="h-3 w-3" />
              <span className="hidden sm:inline">IPs</span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 tabular-nums">{pool.assignments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ranges" className="text-[11px] gap-1 h-7">
              <Server className="h-3 w-3" />
              <span className="hidden sm:inline">Ranges</span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 tabular-nums">{pool.ranges.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Network Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="Type" value={<TypeBadge type={pool.type} />} />
              <InfoItem label="Lease Time" value={formatLeaseTime(pool.leaseTime)} />
              {pool.gateway && <InfoItem label="Gateway" value={pool.gateway} copyable onCopy={onCopy} />}
              {pool.subnetMask && <InfoItem label="Subnet Mask" value={pool.subnetMask} />}
              {pool.dnsPrimary && <InfoItem label="Primary DNS" value={pool.dnsPrimary} copyable onCopy={onCopy} />}
              {pool.dnsSecondary && <InfoItem label="Secondary DNS" value={pool.dnsSecondary} />}
            </div>

            {pool.description && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">{pool.description}</div>
            )}

            {/* Utilization Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Pool Utilization</span>
                <span className="text-lg font-bold text-foreground tabular-nums">{pool.utilizationPercent}%</span>
              </div>
              <MiniBarChart
                available={pool.availableIps}
                assigned={pool.assignedIps}
                reserved={pool.reservedIps}
                total={pool.totalIps}
              />
              <UtilizationBar percent={pool.utilizationPercent} size="xl" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="Total" value={pool.totalIps} color="text-foreground" />
              <StatCard label="Available" value={pool.availableIps} color="text-emerald-600" />
              <StatCard label="Assigned" value={pool.assignedIps} color="text-amber-600" />
              <StatCard label="Reserved" value={pool.reservedIps} color="text-violet-600" />
            </div>

            {/* Recent Assignments */}
            {recentAssignments.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium">Recent Assignments</span>
                <div className="space-y-1.5">
                  {recentAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="font-mono text-foreground">{a.ipAddress}</code>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate">{a.username}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-[10px]">{formatDate(a.assignedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 gap-1" onClick={onAssign}>
                <UserPlus className="h-3.5 w-3.5" />
                Assign IP
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onReserve}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Reserve IP
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TabsContent>

          {/* ===== ASSIGNMENTS TAB ===== */}
          <TabsContent value="assignments" className="space-y-3 mt-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter IPs..."
                  value={ipSearchFilter}
                  onChange={(e) => onIpSearchChange(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
              <Button size="sm" className="h-8 gap-1 text-xs" onClick={onAssign}>
                <UserPlus className="h-3.5 w-3.5" />
                Assign
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={onReserve}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Reserve
              </Button>
            </div>

            {/* Status Filter Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {pool.availableIps > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1"><Circle className="h-2 w-2 text-emerald-500" />{pool.availableIps} Available</Badge>
              )}
              {pool.assignedIps > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1"><CircleDot className="h-2 w-2 text-amber-500" />{pool.assignedIps} Assigned</Badge>
              )}
              {pool.reservedIps > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1"><Shield className="h-2 w-2 text-violet-500" />{pool.reservedIps} Reserved</Badge>
              )}
              {pool.quarantinedIps > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1"><Ban className="h-2 w-2 text-red-500" />{pool.quarantinedIps} Quarantined</Badge>
              )}
            </div>

            {/* IP Table */}
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] h-8 w-[140px]">IP Address</TableHead>
                    <TableHead className="text-[10px] h-8 hidden sm:table-cell">Username</TableHead>
                    <TableHead className="text-[10px] h-8 hidden md:table-cell">MAC</TableHead>
                    <TableHead className="text-[10px] h-8 hidden lg:table-cell">Hostname</TableHead>
                    <TableHead className="text-[10px] h-8 w-[90px]">Status</TableHead>
                    <TableHead className="text-[10px] h-8 w-[70px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                        {ipSearchFilter ? 'No IPs match your filter.' : 'No IP assignments in this pool.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id} className="group">
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono">{assignment.ipAddress}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => onCopy(assignment.ipAddress)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden sm:table-cell">
                          {assignment.username ? (
                            <span className="text-xs font-medium">{assignment.username}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell">
                          {assignment.macAddress ? (
                            <span className="text-xs font-mono text-muted-foreground">{assignment.macAddress}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 hidden lg:table-cell">
                          {assignment.hostname ? (
                            <span className="text-xs">{assignment.hostname}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <AssignmentStatusBadge status={assignment.status} />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {assignment.status === 'available' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => onReserve()}
                                  >
                                    <ShieldCheck className="h-3 w-3 text-violet-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reserve IP</TooltipContent>
                              </Tooltip>
                            )}
                            {(assignment.status === 'assigned' || assignment.status === 'reserved' || assignment.status === 'quarantined') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => onRelease(assignment.ipAddress, assignment.username)}
                                    disabled={isReleasing}
                                  >
                                    <Unplug className="h-3 w-3 text-amber-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Release IP</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            <p className="text-[10px] text-muted-foreground text-center">
              Showing {filteredAssignments.length} of {pool.assignments.length} IPs
            </p>
          </TabsContent>

          {/* ===== RANGES TAB ===== */}
          <TabsContent value="ranges" className="space-y-3 mt-4">
            {pool.ranges.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No IP ranges configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pool.ranges.map((range) => (
                  <Card key={range.id} className="border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <code className="font-mono font-semibold">{range.startIp}</code>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <code className="font-mono font-semibold">{range.endIp}</code>
                        </div>
                        <Badge variant="secondary" className="text-[10px] tabular-nums">
                          {range.totalIps} IPs
                        </Badge>
                      </div>
                      <UtilizationBar percent={range.utilizationPercent} />
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{range.availableIps} avail</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{range.assignedIps} used</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />{range.reservedIps} reserved</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{range.quarantinedIps} quar.</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ==========================================
// SMALL HELPER COMPONENTS
// ==========================================

function InfoItem({ label, value, copyable, onCopy }: { label: string; value: React.ReactNode; copyable?: boolean; onCopy?: (text: string) => void }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      {copyable && typeof value === 'string' && onCopy ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onCopy(value)} className="text-xs font-mono hover:text-primary transition-colors">
              {value}
            </button>
          </TooltipTrigger>
          <TooltipContent>Click to copy</TooltipContent>
        </Tooltip>
      ) : (
        <p className="text-xs">{value}</p>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/40">
      <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
