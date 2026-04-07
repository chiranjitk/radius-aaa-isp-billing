'use client'

import { useState, useCallback, useMemo } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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

const ASSIGNMENT_STATUS: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'text-emerald-600 bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-400' },
  assigned: { label: 'Assigned', color: 'text-amber-600 bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400' },
  reserved: { label: 'Reserved', color: 'text-violet-600 bg-violet-100/80 dark:bg-violet-900/30 dark:text-violet-400' },
  quarantined: { label: 'Quarantined', color: 'text-red-600 bg-red-100/80 dark:bg-red-900/30 dark:text-red-400' },
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
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full', config.color)}>
      {status === 'assigned' && <CircleDot className="h-3 w-3" />}
      {status === 'available' && <Circle className="h-3 w-3" />}
      {status === 'reserved' && <Shield className="h-3 w-3" />}
      {status === 'quarantined' && <Ban className="h-3 w-3" />}
      {config.label}
    </span>
  )
}

function UtilizationBar({ percent, size = 'sm' }: { percent: number; size?: 'sm' | 'lg' }) {
  const barColor = percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  const gradient = percent >= 90
    ? 'from-red-500 to-red-400'
    : percent >= 70
    ? 'from-amber-500 to-amber-400'
    : 'from-emerald-500 to-emerald-400'

  return (
    <div className={cn('flex items-center gap-2', size === 'lg' && 'gap-3')}>
      <div className={cn('flex-1 rounded-full bg-muted overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', gradient)}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={cn('font-semibold tabular-nums text-muted-foreground shrink-0', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
        {percent}%
      </span>
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

  // Detail panel
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null)

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [addRangeDialogOpen, setAddRangeDialogOpen] = useState(false)
  const [formData, setFormData] = useState<PoolFormData>(emptyForm)
  const [editingPool, setEditingPool] = useState<IpPoolSummary | null>(null)
  const [deletingPool, setDeletingPool] = useState<IpPoolSummary | null>(null)
  const [assignFormData, setAssignFormData] = useState<AssignFormData>(emptyAssignForm)
  const [newRangeData, setNewRangeData] = useState<{ startIp: string; endIp: string }>({ startIp: '', endIp: '' })
  const [detailAssignTab, setDetailAssignTab] = useState<'ranges' | 'assignments'>('ranges')

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

  const { data: poolDetail } = useQuery<IpPoolDetail>({
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
      toast.success(`IP ${d.assignment.ipAddress} assigned successfully`)
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
      closeAssignDialog()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const releaseMutation = useMutation({
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

  const addRangeMutation = useMutation({
    mutationFn: async ({ poolId, startIp, endIp }: { poolId: string; startIp: string; endIp: string }) => {
      // We need to create the range and its assignments via a direct approach
      // First update the pool with the new range data appended
      const res = await fetch(`/api/ip-pools/${poolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to add range')
      return res.json()
    },
    onSuccess: () => {
      toast.success('IP range added successfully')
      queryClient.invalidateQueries({ queryKey: ['ip-pools'] })
      queryClient.invalidateQueries({ queryKey: ['ip-pool-detail'] })
      setAddRangeDialogOpen(false)
      setNewRangeData({ startIp: '', endIp: '' })
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

  const handleAddRange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPoolId || !newRangeData.startIp.trim() || !newRangeData.endIp.trim()) return
    // Add range via pool update - recreate pool with new range appended
    addRangeMutation.mutate({
      poolId: selectedPoolId,
      startIp: newRangeData.startIp.trim(),
      endIp: newRangeData.endIp.trim(),
    })
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
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create IP Pool
            </Button>
          </div>
        </div>

        {/* ========== STATS BAR ========== */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalPools}</p>
                    <p className="text-xs text-muted-foreground">Total Pools</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-sky-500/10">
                    <Network className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalIps.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total IPs</p>
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
                    <p className="text-2xl font-bold text-emerald-600">{stats.availableIps.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
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
                    <p className="text-2xl font-bold text-amber-600">{stats.assignedIps.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Assigned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm col-span-2 md:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-500/10">
                    <ArrowUpDown className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-violet-600">{stats.utilizationPercent}%</p>
                    <p className="text-xs text-muted-foreground">Utilization</p>
                  </div>
                  <UtilizationBar percent={stats.utilizationPercent} size="lg" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
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
                  <Card key={i} className="border shadow-sm">
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
                    onSelect={() => setSelectedPoolId(selectedPoolId === pool.id ? null : pool.id)}
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

          {/* Detail Panel */}
          {selectedPoolId && poolDetail && (
            <div className="lg:col-span-2">
              <PoolDetailPanel
                pool={poolDetail}
                onClose={() => setSelectedPoolId(null)}
                onEdit={() => openEditDialog(filteredPools.find((p) => p.id === selectedPoolId)!)}
                onAssign={() => {
                  setAssignFormData(emptyAssignForm)
                  setAssignDialogOpen(true)
                }}
                onAddRange={() => {
                  setNewRangeData({ startIp: '', endIp: '' })
                  setAddRangeDialogOpen(true)
                }}
                onRelease={(username) => {
                  releaseMutation.mutate({ poolId: selectedPoolId, username })
                }}
                onCopy={copyToClipboard}
                activeTab={detailAssignTab}
                onTabChange={setDetailAssignTab}
                isReleasing={releaseMutation.isPending}
              />
            </div>
          )}
        </div>

        {/* ========== CREATE POOL DIALOG ========== */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create IP Pool</DialogTitle>
              <DialogDescription>Define a new IP address pool with network settings and IP ranges</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pool-name">Pool Name <span className="text-red-500">*</span></Label>
                  <Input id="pool-name" placeholder="LAN-Office-10" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pool-network">Network CIDR <span className="text-red-500">*</span></Label>
                  <Input id="pool-network" placeholder="10.0.0.0/24" value={formData.network} onChange={(e) => setFormData({ ...formData, network: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pool-desc">Description</Label>
                <Textarea id="pool-desc" placeholder="Office LAN pool for DHCP" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pool-type">Allocation Type</Label>
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
                  <Label htmlFor="pool-lease">Lease Time</Label>
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
              <Separator className="my-2" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Network Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pool-gateway">Gateway</Label>
                  <Input id="pool-gateway" placeholder="10.0.0.1" value={formData.gateway} onChange={(e) => setFormData({ ...formData, gateway: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pool-mask">Subnet Mask</Label>
                  <Input id="pool-mask" placeholder="255.255.255.0" value={formData.subnetMask} onChange={(e) => setFormData({ ...formData, subnetMask: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pool-dns1">Primary DNS</Label>
                  <Input id="pool-dns1" placeholder="8.8.8.8" value={formData.dnsPrimary} onChange={(e) => setFormData({ ...formData, dnsPrimary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pool-dns2">Secondary DNS</Label>
                  <Input id="pool-dns2" placeholder="8.8.4.4" value={formData.dnsSecondary} onChange={(e) => setFormData({ ...formData, dnsSecondary: e.target.value })} />
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IP Ranges</p>
                <Button type="button" variant="outline" size="sm" onClick={addRangeRow} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Range
                </Button>
              </div>
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit IP Pool</DialogTitle>
              <DialogDescription>Update settings for {editingPool?.name}</DialogDescription>
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
                  <Label htmlFor="edit-type">Allocation Type</Label>
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
                  <Label htmlFor="edit-lease">Lease Time</Label>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-gateway">Gateway</Label>
                  <Input id="edit-gateway" value={formData.gateway} onChange={(e) => setFormData({ ...formData, gateway: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mask">Subnet Mask</Label>
                  <Input id="edit-mask" value={formData.subnetMask} onChange={(e) => setFormData({ ...formData, subnetMask: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dns1">Primary DNS</Label>
                  <Input id="edit-dns1" value={formData.dnsPrimary} onChange={(e) => setFormData({ ...formData, dnsPrimary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dns2">Secondary DNS</Label>
                  <Input id="edit-dns2" value={formData.dnsSecondary} onChange={(e) => setFormData({ ...formData, dnsSecondary: e.target.value })} />
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

        {/* ========== DELETE DIALOG ========== */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete IP Pool</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deletingPool?.name}</strong>? This will remove all IP ranges and assignments.
                {deletingPool && deletingPool.assignedIps > 0 && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    Warning: This pool has {deletingPool.assignedIps} active assignment(s).
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingPool && deleteMutation.mutate(deletingPool.id)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ========== ASSIGN IP DIALOG ========== */}
        <Dialog open={assignDialogOpen} onOpenChange={(open) => !open && closeAssignDialog()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign IP Address</DialogTitle>
              <DialogDescription>Assign the next available IP from this pool to a user</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assign-user">Username <span className="text-red-500">*</span></Label>
                <Select value={assignFormData.username} onValueChange={(v) => setAssignFormData({ ...assignFormData, username: v })}>
                  <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {users?.users.filter((u) => u.status === 'active').map((u) => (
                      <SelectItem key={u.username} value={u.username}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{u.username}</span>
                          {u.fullName && <span className="text-muted-foreground text-xs">({u.fullName})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-mac">MAC Address</Label>
                <Input id="assign-mac" placeholder="AA:BB:CC:DD:EE:FF" value={assignFormData.macAddress} onChange={(e) => setAssignFormData({ ...assignFormData, macAddress: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-hostname">Hostname</Label>
                <Input id="assign-hostname" placeholder="workstation-01" value={assignFormData.hostname} onChange={(e) => setAssignFormData({ ...assignFormData, hostname: e.target.value })} />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeAssignDialog}>Cancel</Button>
                <Button type="submit" disabled={assignMutation.isPending || !assignFormData.username}>
                  {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign IP
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========== ADD RANGE DIALOG ========== */}
        <Dialog open={addRangeDialogOpen} onOpenChange={setAddRangeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add IP Range</DialogTitle>
              <DialogDescription>Add a new IP range to this pool</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddRange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="range-start">Start IP <span className="text-red-500">*</span></Label>
                <Input id="range-start" placeholder="10.0.0.200" value={newRangeData.startIp} onChange={(e) => setNewRangeData({ ...newRangeData, startIp: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="range-end">End IP <span className="text-red-500">*</span></Label>
                <Input id="range-end" placeholder="10.0.0.250" value={newRangeData.endIp} onChange={(e) => setNewRangeData({ ...newRangeData, endIp: e.target.value })} required />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddRangeDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addRangeMutation.isPending}>
                  {addRangeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Range
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// ==========================================
// POOL CARD COMPONENT
// ==========================================

function PoolCard({
  pool,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
}: {
  pool: IpPoolSummary
  isSelected: boolean
  onSelect: () => void
  onEdit: (pool: IpPoolSummary) => void
  onDelete: (pool: IpPoolSummary) => void
  onCopy: (text: string) => void
}) {
  return (
    <Card
      className={cn(
        'card-hover border shadow-sm cursor-pointer transition-all',
        isSelected && 'ring-2 ring-primary/50 border-primary/30'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">{pool.name}</CardTitle>
            <div className="flex items-center gap-1.5 mt-1">
              <code className="text-xs text-muted-foreground font-mono">{pool.network}</code>
              {pool.gateway && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      onClick={(e) => { e.stopPropagation(); onCopy(pool.gateway!) }}
                    >
                      <span className="font-mono">{pool.gateway}</span>
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Copy gateway: {pool.gateway}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TypeBadge type={pool.type} />
            <StatusBadge status={pool.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {pool.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{pool.description}</p>
        )}

        <UtilizationBar percent={pool.utilizationPercent} />

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-foreground tabular-nums">{pool.totalIps}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-600 tabular-nums">{pool.availableIps}</p>
            <p className="text-[10px] text-muted-foreground">Free</p>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-600 tabular-nums">{pool.assignedIps}</p>
            <p className="text-[10px] text-muted-foreground">Used</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground tabular-nums">{pool.rangesCount}</p>
            <p className="text-[10px] text-muted-foreground">Ranges</p>
          </div>
        </div>

        {pool.dnsPrimary && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-medium">DNS:</span>
            <code className="font-mono">{pool.dnsPrimary}</code>
            {pool.dnsSecondary && <span className="text-muted-foreground/50">/</span>}
            {pool.dnsSecondary && <code className="font-mono">{pool.dnsSecondary}</code>}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5 gap-1">
              <MonitorSmartphone className="h-2.5 w-2.5" />
              {pool.usersCount} users
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5 gap-1">
              <Clock className="h-2.5 w-2.5" />
              {formatLeaseTime(pool.leaseTime)}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onSelect() }}>
                  {isSelected ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSelected ? 'Close details' : 'View details'}</TooltipContent>
            </Tooltip>
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
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(pool) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete pool</TooltipContent>
            </Tooltip>
          </div>
        </div>
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
        'card-hover border shadow-sm cursor-pointer transition-all',
        isSelected && 'ring-2 ring-primary/50 border-primary/30'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate">{pool.name}</span>
              <TypeBadge type={pool.type} />
              <StatusBadge status={pool.status} />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <code className="text-xs text-muted-foreground font-mono">{pool.network}</code>
              {pool.gateway && <span className="text-xs text-muted-foreground">GW: {pool.gateway}</span>}
              <span className="text-xs text-muted-foreground">{pool.rangesCount} ranges</span>
            </div>
          </div>
          <div className="hidden sm:block w-32 shrink-0">
            <UtilizationBar percent={pool.utilizationPercent} />
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs tabular-nums shrink-0">
            <span className="text-emerald-600 font-semibold">{pool.availableIps}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold">{pool.totalIps}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(pool) }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(pool) }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// POOL DETAIL PANEL COMPONENT
// ==========================================

function PoolDetailPanel({
  pool,
  onClose,
  onEdit,
  onAssign,
  onAddRange,
  onRelease,
  onCopy,
  activeTab,
  onTabChange,
  isReleasing,
}: {
  pool: IpPoolDetail
  onClose: () => void
  onEdit: () => void
  onAssign: () => void
  onAddRange: () => void
  onRelease: (username: string) => void
  onCopy: (text: string) => void
  activeTab: 'ranges' | 'assignments'
  onTabChange: (tab: 'ranges' | 'assignments') => void
  isReleasing: boolean
}) {
  return (
    <Card className="border shadow-sm sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-bold">{pool.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-muted-foreground font-mono">{pool.network}</code>
              <TypeBadge type={pool.type} />
              <StatusBadge status={pool.status} />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Info */}
        <div className="grid grid-cols-2 gap-3">
          {pool.gateway && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gateway</p>
              <p className="text-xs font-mono font-medium">{pool.gateway}</p>
            </div>
          )}
          {pool.subnetMask && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Subnet Mask</p>
              <p className="text-xs font-mono font-medium">{pool.subnetMask}</p>
            </div>
          )}
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Primary DNS</p>
            <p className="text-xs font-mono font-medium">{pool.dnsPrimary || '—'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lease Time</p>
            <p className="text-xs font-medium">{formatLeaseTime(pool.leaseTime)}</p>
          </div>
        </div>

        {/* IP Distribution */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">IP Distribution</span>
            <span className="text-xs text-muted-foreground">{pool.totalIps} total</span>
          </div>
          <UtilizationBar percent={pool.utilizationPercent} size="lg" />
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-sm font-bold text-emerald-600">{pool.availableIps}</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-600">{pool.assignedIps}</p>
              <p className="text-[10px] text-muted-foreground">Assigned</p>
            </div>
            <div>
              <p className="text-sm font-bold text-violet-600">{pool.reservedIps}</p>
              <p className="text-[10px] text-muted-foreground">Reserved</p>
            </div>
            <div>
              <p className="text-sm font-bold text-red-600">{pool.quarantinedIps}</p>
              <p className="text-[10px] text-muted-foreground">Quarantined</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onAssign}>
            <UserPlus className="h-3.5 w-3.5" />
            Assign IP
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onAddRange}>
            <Plus className="h-3.5 w-3.5" />
            Add Range
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        <Separator />

        {/* Tabs */}
        <div className="flex items-center gap-1">
          <Button
            variant={activeTab === 'ranges' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs flex-1"
            onClick={() => onTabChange('ranges')}
          >
            Ranges ({pool.ranges.length})
          </Button>
          <Button
            variant={activeTab === 'assignments' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs flex-1"
            onClick={() => onTabChange('assignments')}
          >
            Assignments ({pool.assignments.length})
          </Button>
        </div>

        {/* Ranges Tab */}
        {activeTab === 'ranges' && (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {pool.ranges.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No ranges defined</p>
            ) : (
              pool.ranges.map((range) => (
                <div key={range.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono font-medium">{range.startIp}</code>
                      <span className="text-muted-foreground text-xs">→</span>
                      <code className="text-xs font-mono font-medium">{range.endIp}</code>
                    </div>
                    {range.isAvailable ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 text-emerald-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 text-red-500">Exhausted</Badge>
                    )}
                  </div>
                  <UtilizationBar percent={range.utilizationPercent} />
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                    <div>
                      <span className="font-bold text-emerald-600">{range.availableIps}</span>
                      <span className="text-muted-foreground"> free</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-600">{range.assignedIps}</span>
                      <span className="text-muted-foreground"> used</span>
                    </div>
                    <div>
                      <span className="font-bold">{range.totalIps}</span>
                      <span className="text-muted-foreground"> total</span>
                    </div>
                  </div>
                  {range.currentIp && (
                    <p className="text-[10px] text-muted-foreground">
                      Next IP: <code className="font-mono">{range.currentIp}</code>
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {pool.assignments.filter((a) => a.status !== 'available').length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No active assignments</p>
            ) : (
              pool.assignments
                .filter((a) => a.status !== 'available')
                .map((assignment) => (
                  <div key={assignment.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono font-semibold">{assignment.ipAddress}</code>
                        <AssignmentStatusBadge status={assignment.status} />
                      </div>
                      {assignment.username && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="font-medium">{assignment.username}</span>
                          {assignment.hostname && <span>· {assignment.hostname}</span>}
                        </div>
                      )}
                      {assignment.macAddress && (
                        <p className="text-[10px] text-muted-foreground font-mono">{assignment.macAddress}</p>
                      )}
                      {assignment.assignedAt && (
                        <p className="text-[10px] text-muted-foreground">{formatDate(assignment.assignedAt)}</p>
                      )}
                    </div>
                    {assignment.status === 'assigned' && assignment.username && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-amber-600"
                            disabled={isReleasing}
                            onClick={() => onRelease(assignment.username!)}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Release IP</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
